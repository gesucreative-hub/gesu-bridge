//! Media-related Tauri commands for browsing and transferring media from devices

use crate::domain::errors::AppError;
use crate::domain::models::{FolderInfo, MediaFilter, MediaItem, MediaTransferResult};
use crate::services::{media_service, settings_service};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// List folders on the device at the specified path
#[tauri::command]
pub fn list_device_folders(
    app: AppHandle,
    serial: String,
    path: Option<String>,
) -> Result<Vec<FolderInfo>, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound("ADB not found. Configure it in Settings.".to_string())
    })?;

    media_service::list_folders(&adb_path, &serial, path.as_deref())
}

/// List media files in a folder on the device
#[tauri::command]
pub fn list_device_media(
    app: AppHandle,
    serial: String,
    path: String,
    filter: Option<MediaFilter>,
) -> Result<Vec<MediaItem>, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound("ADB not found. Configure it in Settings.".to_string())
    })?;

    media_service::list_media_files(&adb_path, &serial, &path, filter.unwrap_or_default())
}

/// Get thumbnail for a media file
/// Returns base64 data URL or error if thumbnail not available
#[tauri::command]
pub fn get_media_thumbnail(
    app: AppHandle,
    serial: String,
    path: String,
) -> Result<String, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound("ADB not found. Configure it in Settings.".to_string())
    })?;

    // Use app cache directory for thumbnails
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::IoError(format!("Failed to get cache dir: {}", e)))?;

    let thumb_dir = cache_dir.join("thumbnails");
    std::fs::create_dir_all(&thumb_dir)?;

    media_service::get_thumbnail(
        &adb_path,
        settings.ffmpeg_resolved_path.as_ref(),
        &serial,
        &path,
        &thumb_dir,
    )
}

/// Pull media files from device to a local destination
#[tauri::command]
pub fn pull_media_files(
    app: AppHandle,
    serial: String,
    paths: Vec<String>,
    dest: Option<String>,
) -> Result<Vec<MediaTransferResult>, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound("ADB not found. Configure it in Settings.".to_string())
    })?;

    // Determine destination directory
    let dest_path = match dest {
        Some(d) => PathBuf::from(d),
        None => {
            // Default to user's Downloads folder
            dirs::download_dir().ok_or_else(|| {
                AppError::IoError("Could not determine Downloads folder".to_string())
            })?
        }
    };

    // Ensure destination exists
    std::fs::create_dir_all(&dest_path)?;

    let results = media_service::pull_media_files_batch(&adb_path, &serial, &paths, &dest_path);
    Ok(results)
}

/// Preview a media file by pulling it to temp and returning the local path
#[tauri::command]
pub fn preview_media(app: AppHandle, serial: String, path: String) -> Result<String, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound("ADB not found. Configure it in Settings.".to_string())
    })?;

    // Use app cache directory for previews
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::IoError(format!("Failed to get cache dir: {}", e)))?;

    let preview_dir = cache_dir.join("previews");
    std::fs::create_dir_all(&preview_dir)?;

    let local_path = media_service::pull_media_file(&adb_path, &serial, &path, &preview_dir)?;

    // Check if it's an image
    let path_buf = std::path::PathBuf::from(&local_path);
    let extension = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let is_image = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].contains(&extension.as_str());

    if is_image {
        // Return base64 data URL
        media_service::read_file_as_base64(&path_buf)
    } else {
        // Return local path (for videos, relies on asset protocol)
        Ok(local_path)
    }
}

/// Open the folder containing pulled files in the system file manager
#[tauri::command]
pub fn open_media_folder(path: String) -> Result<(), AppError> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        std::process::Command::new("explorer")
            .arg(&path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| AppError::IoError(format!("Failed to open folder: {}", e)))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| AppError::IoError(format!("Failed to open folder: {}", e)))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| AppError::IoError(format!("Failed to open folder: {}", e)))?;
    }

    Ok(())
}
