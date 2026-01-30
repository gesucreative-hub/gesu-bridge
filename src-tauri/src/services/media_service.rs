//! Media service for browsing and transferring media from Android devices via ADB

use crate::domain::errors::AppError;
use crate::domain::models::{FolderInfo, MediaFilter, MediaItem, MediaTransferResult, MediaType};
use crate::services::adb_service::run_adb_command;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};

/// Common media folder paths on Android devices
const MEDIA_FOLDERS: &[&str] = &[
    "DCIM",
    "Pictures",
    "Download",
    "Movies",
    "WhatsApp/Media",
    "Telegram",
    "Screenshots",
];

/// Image file extensions (case-insensitive matching)
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"];

/// Video file extensions (case-insensitive matching)
const VIDEO_EXTENSIONS: &[&str] = &["mp4", "mkv", "avi", "mov", "webm", "3gp", "m4v"];

/// Helper to quote paths for use in adb shell
fn quote_remote_path(path: &str) -> String {
    // Single quote the path and escape any single quotes inside
    // '/sdcard/It's Me' -> '/sdcard/It'\''s Me'
    format!("'{}'", path.replace('\'', "'\\''"))
}

/// List folders at a given path on the device
pub fn list_folders(
    adb_path: &str,
    serial: &str,
    path: Option<&str>,
) -> Result<Vec<FolderInfo>, AppError> {
    let base_path = path.unwrap_or("/sdcard");
    let quoted_path = quote_remote_path(base_path);

    // Use ls -la to get directory listing
    let output = run_adb_command(
        adb_path,
        &["-s", serial, "shell", "ls", "-la", &quoted_path],
    )?;

    let mut folders = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // "total" line often appears at top
        if line.starts_with("total") {
            continue;
        }
        // Error messages usually start with the path or "ls:"
        if line.contains(": No such file or directory") || line.contains(": Permission denied") {
            continue;
        }

        // Parse ls -la output: drwxrwxrwx ... name
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 8 {
            continue;
        }

        // First character 'd' indicates directory
        let permissions = parts[0];
        if !permissions.starts_with('d') {
            continue;
        }

        // Last part is the name (may contain spaces, so rejoin)
        let name = parts[7..].join(" ");

        // Skip . and .. and hidden folders
        if name == "." || name == ".." || name.starts_with('.') {
            continue;
        }

        let folder_path = if base_path.ends_with('/') {
            format!("{}{}", base_path, name)
        } else {
            format!("{}/{}", base_path, name)
        };

        // Check if it's a known media folder
        let is_media_folder = MEDIA_FOLDERS
            .iter()
            .any(|mf| name.eq_ignore_ascii_case(mf) || folder_path.contains(mf));

        folders.push(FolderInfo {
            name,
            path: folder_path,
            item_count: None, // Could be populated with a count query if needed
            is_media_folder,
        });
    }

    // Sort: media folders first, then alphabetically
    folders.sort_by(|a, b| match (a.is_media_folder, b.is_media_folder) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(folders)
}

/// List media files in a folder
pub fn list_media_files(
    adb_path: &str,
    serial: &str,
    path: &str,
    filter: MediaFilter,
) -> Result<Vec<MediaItem>, AppError> {
    let quoted_path = quote_remote_path(path);
    // Use ls -la to get file listing (more reliable than find on Android shell)
    let output = run_adb_command(
        adb_path,
        &["-s", serial, "shell", "ls", "-la", &quoted_path],
    )?;

    let mut items = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("total") {
            continue;
        }

        // Parse ls -la output: -rw-rw---- 1 u0_a123 u0_a123 12345 2024-01-30 10:30 filename.jpg
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 7 {
            continue;
        }

        // First character '-' indicates regular file, 'd' is directory
        let permissions = parts[0];
        if !permissions.starts_with('-') {
            continue;
        }

        // Parse size (position 4)
        let size_bytes: u64 = parts[4].parse().unwrap_or(0);

        // Date is at position 5, time at 6
        let date_part = parts.get(5).unwrap_or(&"");
        let time_part = parts.get(6).unwrap_or(&"");
        let date_taken = if !date_part.is_empty() && !time_part.is_empty() {
            Some(format!("{} {}", date_part, time_part))
        } else {
            None
        };

        // Filename is everything after the time (may contain spaces)
        let name = if parts.len() > 7 {
            parts[7..].join(" ")
        } else {
            continue;
        };

        // Build full file path
        let file_path = if path.ends_with('/') {
            format!("{}{}", path, name)
        } else {
            format!("{}/{}", path, name)
        };

        // Get file extension
        let extension = Path::new(&name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        // Determine media type
        let media_type = if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
            Some(MediaType::Image)
        } else if VIDEO_EXTENSIONS.contains(&extension.as_str()) {
            Some(MediaType::Video)
        } else {
            None
        };

        // Skip non-media files
        let media_type = match media_type {
            Some(t) => t,
            None => continue,
        };

        // Apply filter
        match filter {
            MediaFilter::Images if media_type != MediaType::Image => continue,
            MediaFilter::Videos if media_type != MediaType::Video => continue,
            _ => {}
        }

        items.push(MediaItem {
            path: file_path,
            name,
            media_type,
            size_bytes,
            width: None,
            height: None,
            duration_ms: None,
            date_taken,
            thumbnail_url: None,
        });
    }

    // Sort by date descending (newest first)
    items.sort_by(|a, b| b.date_taken.cmp(&a.date_taken));

    Ok(items)
}

/// Pull a single file from device to local temp directory and return local path
pub fn pull_media_file(
    adb_path: &str,
    serial: &str,
    remote_path: &str,
    local_dest: &Path,
) -> Result<String, AppError> {
    let file_name = Path::new(remote_path)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::InvalidPath("Invalid remote path".to_string()))?;

    let local_path = local_dest.join(file_name);
    let local_path_str = local_path.to_string_lossy().to_string();

    run_adb_command(
        adb_path,
        &["-s", serial, "pull", remote_path, &local_path_str],
    )?;

    Ok(local_path_str)
}

/// Pull multiple files from device
pub fn pull_media_files_batch(
    adb_path: &str,
    serial: &str,
    remote_paths: &[String],
    local_dest: &Path,
) -> Vec<MediaTransferResult> {
    let mut results = Vec::new();

    for remote_path in remote_paths {
        // file_name kept for potential future logging
        let _file_name = Path::new(remote_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        // Get file size first
        let size_bytes = get_file_size(adb_path, serial, remote_path).unwrap_or(0);

        match pull_media_file(adb_path, serial, remote_path, local_dest) {
            Ok(dest_path) => {
                results.push(MediaTransferResult {
                    source_path: remote_path.clone(),
                    dest_path: Some(dest_path),
                    success: true,
                    error: None,
                    size_bytes,
                });
            }
            Err(e) => {
                results.push(MediaTransferResult {
                    source_path: remote_path.clone(),
                    dest_path: None,
                    success: false,
                    error: Some(e.to_string()),
                    size_bytes,
                });
            }
        }
    }

    results
}

/// Get file size on device
fn get_file_size(adb_path: &str, serial: &str, path: &str) -> Result<u64, AppError> {
    let output = run_adb_command(adb_path, &["-s", serial, "shell", "stat", "-c", "%s", path])?;

    output.trim().parse().map_err(|_| {
        AppError::AdbExecutionFailed(format!("Failed to parse file size for {}", path))
    })
}

/// Generate thumbnail for a media file
/// Returns base64-encoded thumbnail data
/// Generate thumbnail for a media file
/// Returns base64-encoded thumbnail data
pub fn get_thumbnail(
    adb_path: &str,
    ffmpeg_path: Option<&String>,
    serial: &str,
    remote_path: &str,
    temp_dir: &Path,
) -> Result<String, AppError> {
    let file_name = Path::new(remote_path)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::InvalidPath("Invalid remote path".to_string()))?;

    // Create unique thumbnail filename to check cache
    let thumb_name = format!("thumb_{}.jpg", sanitize_filename(file_name));
    let thumb_path = temp_dir.join(&thumb_name);

    if thumb_path.exists() {
        // Return cached thumbnail (check size > 0)
        let metadata = std::fs::metadata(&thumb_path).ok();
        if let Some(m) = metadata {
            if m.len() > 0 {
                return read_file_as_base64(&thumb_path);
            }
        }
    }

    let extension = Path::new(remote_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let is_video = VIDEO_EXTENSIONS.contains(&extension.as_str());
    let is_image = IMAGE_EXTENSIONS.contains(&extension.as_str());

    if !is_video && !is_image {
        return Err(AppError::ThumbnailNotAvailable(format!(
            "Unsupported file type for {}",
            file_name
        )));
    }

    // Try multiple path variants (sdcard vs storage)
    // /sdcard/Pictures/... vs /storage/emulated/0/Pictures/...
    let paths_to_try = if remote_path.starts_with("/sdcard/") {
        vec![
            remote_path.to_string(),
            remote_path.replace("/sdcard/", "/storage/emulated/0/"),
        ]
    } else {
        vec![remote_path.to_string()]
    };

    let mut media_id = None;
    for path in &paths_to_try {
        if let Some(id) = get_media_store_id(adb_path, serial, path, is_video) {
            media_id = Some(id);
            break;
        }
    }

    // If we found an ID, try to get the thumbnail
    if let Some(id) = media_id {
        // Strategy A: Check if a generated thumbnail path exists in DB
        if let Some(thumb_remote_path) = get_thumbnail_path(adb_path, serial, &id, is_video) {
            let _ = pull_media_file(adb_path, serial, &thumb_remote_path, temp_dir);
        }

        // Verify Strategy A
        if let Ok(m) = std::fs::metadata(&thumb_path) {
            if m.len() > 0 {
                return read_file_as_base64(&thumb_path);
            }
        }

        // Strategy B: Content Read
        let thumb_uri = if is_video {
            format!("content://media/external/video/media/{}/thumbnail", id)
        } else {
            format!("content://media/external/images/thumbnails/{}", id)
        };

        // Use a temp file on the DEVICE to capture the output
        let device_temp = format!("/data/local/tmp/gesu_thumb_{}.jpg", id);

        // Run content read > device_temp
        let cmd = format!("content read --uri {} > {}", thumb_uri, device_temp);
        let _ = run_adb_command(adb_path, &["-s", serial, "shell", &cmd]);

        // Now pull this temp file to our specific cache path
        let local_path_str = thumb_path.to_string_lossy().to_string();
        let pull_result = run_adb_command(
            adb_path,
            &["-s", serial, "pull", &device_temp, &local_path_str],
        );

        // Cleanup device temp
        let _ = run_adb_command(adb_path, &["-s", serial, "shell", "rm", &device_temp]);

        if pull_result.is_ok() {
            if let Ok(m) = std::fs::metadata(&thumb_path) {
                if m.len() > 0 {
                    return read_file_as_base64(&thumb_path);
                }
            }
        }
    }

    // Fallback: If original is an image, pull it and resize locally
    // This is expensive but guaranteed to work if file exists
    // Fallback: If original is an image, pull it and resize locally
    if is_image {
        // ... (existing image logic) ...
        match pull_media_file(adb_path, serial, remote_path, temp_dir) {
            Ok(pulled_path) => {
                let pulled_path = Path::new(&pulled_path);
                if let Ok(img) = image::open(pulled_path) {
                    let thumb = img.thumbnail(256, 256);
                    if let Ok(_) = thumb.save(&thumb_path) {
                        let _ = std::fs::remove_file(pulled_path);
                        return read_file_as_base64(&thumb_path);
                    }
                }
                let _ = std::fs::remove_file(pulled_path);
            }
            Err(_) => {}
        }
    } else if is_video {
        // Fallback: If original is a video, pull and use ffmpeg
        // Check if ffmpeg is available
        let ffmpeg_bin = ffmpeg_path.map(|s| s.as_str()).unwrap_or("ffmpeg");

        match std::process::Command::new(ffmpeg_bin)
            .arg("-version")
            .output()
        {
            Ok(_) => {
                // Pull video to temp
                match pull_media_file(adb_path, serial, remote_path, temp_dir) {
                    Ok(pulled_video) => {
                        // Generate thumbnail using ffmpeg
                        // ffmpeg -i <video> -ss 00:00:01.000 -vframes 1 -vf scale=320:-1 <thumb>
                        // Generate thumbnail using ffmpeg
                        let mut cmd = std::process::Command::new(ffmpeg_bin);
                        cmd.args(&[
                            "-i",
                            &pulled_video,
                            "-ss",
                            "00:00:01.000",
                            "-vframes",
                            "1",
                            "-vf",
                            "scale=320:-1",
                            "-y", // Overwrite output
                            thumb_path.to_str().unwrap(),
                        ]);

                        // Apply Windows-specific creation flags to hide console window
                        #[cfg(target_os = "windows")]
                        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

                        let status = cmd.status();

                        // Cleanup video
                        let _ = std::fs::remove_file(pulled_video);

                        if let Ok(s) = status {
                            if s.success() {
                                return read_file_as_base64(&thumb_path);
                            }
                        }
                    }
                    Err(_) => {}
                }
            }
            Err(_) => {
                // ffmpeg not found, ignore
            }
        }
    }

    // Return error
    Err(AppError::ThumbnailNotAvailable(format!(
        "Thumbnail not found for {}",
        file_name
    )))
}

/// Quote string for SQL queries
fn quote_sql_value(value: &str) -> String {
    value.replace("'", "''")
}

/// Get MediaStore ID for a file
fn get_media_store_id(
    adb_path: &str,
    serial: &str,
    remote_path: &str,
    is_video: bool,
) -> Option<String> {
    let uri = if is_video {
        "content://media/external/video/media"
    } else {
        "content://media/external/images/media"
    };

    let file_name = Path::new(remote_path)
        .file_name()
        .and_then(|n| n.to_str())?;

    let sql_name = quote_sql_value(file_name);

    // Query by display name instead of exact path
    // This avoids issues with /sdcard vs /storage/emulated/0
    let output = run_adb_command(
        adb_path,
        &[
            "-s",
            serial,
            "shell",
            "content",
            "query",
            "--uri",
            uri,
            "--projection",
            "_id:_data",
            "--where",
            &format!("_display_name='{}'", sql_name),
        ],
    )
    .ok()?;

    find_id_matching_path(&output, remote_path)
}

/// Helper to parse output and find ID for the correct path
fn find_id_matching_path(output: &str, target_path: &str) -> Option<String> {
    // Normalize target path for comparison: remove standard prefixes
    let norm_target = normalize_path(target_path);

    for line in output.lines() {
        // Line format example: "Row: 0 _id=123, _data=/storage/emulated/0/DCIM/Camera/IMG.jpg"
        let id = extract_value(line, "_id=");
        let data = extract_value(line, "_data=");

        if let (Some(id_val), Some(data_val)) = (id, data) {
            let norm_data = normalize_path(&data_val);
            // Check if they match. valid match if one ends with the other or identical
            // We focus on the part *after* /sdcard/ or /storage/emulated/0/
            if norm_data == norm_target
                || norm_data.ends_with(&norm_target)
                || norm_target.ends_with(&norm_data)
            {
                return Some(id_val);
            }
        }
    }
    None
}

fn extract_value(line: &str, key: &str) -> Option<String> {
    if let Some(pos) = line.find(key) {
        let rest = &line[pos + key.len()..];
        // Value ends at comma or end of line
        let end = rest.find(',').unwrap_or(rest.len());
        return Some(rest[..end].trim().to_string());
    }
    None
}

fn normalize_path(path: &str) -> String {
    // Remove common prefixes to get canonical relative path
    // /sdcard/DCIM/A.jpg -> DCIM/A.jpg
    // /storage/emulated/0/DCIM/A.jpg -> DCIM/A.jpg
    path.replace("/storage/emulated/0/", "/")
        .replace("/sdcard/", "/")
        .trim_start_matches('/')
        .to_string()
}

/// Get thumbnail path from MediaStore ID
fn get_thumbnail_path(
    adb_path: &str,
    serial: &str,
    media_id: &str,
    is_video: bool,
) -> Option<String> {
    let (uri, id_col) = if is_video {
        ("content://media/external/video/thumbnails", "video_id")
    } else {
        ("content://media/external/images/thumbnails", "image_id")
    };

    let output = run_adb_command(
        adb_path,
        &[
            "-s",
            serial,
            "shell",
            "content",
            "query",
            "--uri",
            uri,
            "--projection",
            "_data",
            "--where",
            &format!("{}={}", id_col, media_id),
        ],
    )
    .ok()?;

    parse_data_path(&output)
}

/// Parse _data path from content query output
fn parse_data_path(output: &str) -> Option<String> {
    for line in output.lines() {
        if let Some(pos) = line.find("_data=") {
            let rest = &line[pos + 6..];
            // Path might be comma separated if more cols?
            // usually _data=/path/to/thing
            // Trim any trailing comma if present
            let path = rest.trim_end_matches(',');
            if !path.is_empty() {
                return Some(path.to_string());
            }
        }
    }
    None
}

/// Read file and encode as base64 data URL
pub fn read_file_as_base64(path: &Path) -> Result<String, AppError> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let data = std::fs::read(path)
        .map_err(|e| AppError::IoError(format!("Failed to read file: {}", e)))?;

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/jpeg",
    };

    let base64_data = STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// Sanitize filename for use in temp directory
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("test.jpg"), "test.jpg");
        assert_eq!(sanitize_filename("my file (1).jpg"), "my_file__1_.jpg");
        assert_eq!(sanitize_filename("photo-2024.png"), "photo-2024.png");
    }

    #[test]
    fn test_normalize_path() {
        assert_eq!(normalize_path("/sdcard/DCIM/test.jpg"), "DCIM/test.jpg");
        assert_eq!(
            normalize_path("/storage/emulated/0/DCIM/test.jpg"),
            "DCIM/test.jpg"
        );
        assert_eq!(normalize_path("/simple/path.jpg"), "simple/path.jpg");
    }

    #[test]
    fn test_find_id_matching_path() {
        let output = "Row: 0 _id=123, _data=/storage/emulated/0/DCIM/Camera/IMG.jpg";
        assert_eq!(
            find_id_matching_path(output, "/sdcard/DCIM/Camera/IMG.jpg"),
            Some("123".to_string())
        );

        // Mismatch
        assert_eq!(find_id_matching_path(output, "/sdcard/Other/IMG.jpg"), None);
    }
}
