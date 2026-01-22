//! Settings service for loading/saving app configuration

use crate::domain::errors::AppError;
use crate::domain::models::Settings;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const SETTINGS_FILE: &str = "settings.json";

/// Get the settings file path
fn get_settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| AppError::SettingsError(format!("Failed to get config dir: {}", e)))?;

    // Ensure directory exists
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
    }

    Ok(config_dir.join(SETTINGS_FILE))
}

/// Load settings from disk
pub fn load_settings(app: &AppHandle) -> Result<Settings, AppError> {
    let path = get_settings_path(app)?;

    if !path.exists() {
        // Return default settings if file doesn't exist
        return Ok(Settings::new());
    }

    let content = fs::read_to_string(&path)?;
    let settings: Settings = serde_json::from_str(&content)
        .map_err(|e| AppError::SettingsError(format!("Failed to parse settings: {}", e)))?;

    Ok(settings)
}

/// Save settings to disk
pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), AppError> {
    let path = get_settings_path(app)?;

    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| AppError::SettingsError(format!("Failed to serialize settings: {}", e)))?;

    fs::write(&path, content)?;
    Ok(())
}

/// Auto-detect ADB path
pub fn detect_adb_path() -> Option<String> {
    // First check PATH using which
    if let Ok(path) = which::which("adb") {
        return Some(path.to_string_lossy().to_string());
    }

    // Check common locations on Windows
    let common_paths = [
        // User's custom location
        Some(PathBuf::from("C:/platform-tools/adb.exe")),
        // Android SDK in user directory
        dirs::home_dir().map(|h| h.join("AppData/Local/Android/Sdk/platform-tools/adb.exe")),
        // Program Files
        Some(PathBuf::from(
            "C:/Program Files/Android/Android Studio/platform-tools/adb.exe",
        )),
        Some(PathBuf::from(
            "C:/Program Files (x86)/Android/android-sdk/platform-tools/adb.exe",
        )),
    ];

    // Check common paths
    for path_opt in common_paths.iter() {
        if let Some(path) = path_opt {
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
        }
    }

    None
}

/// Validate that an ADB path is valid and executable
pub fn validate_adb_path(path: &str) -> bool {
    let path = PathBuf::from(path);
    if !path.exists() {
        return false;
    }

    // Try to run adb version to verify it works
    let mut cmd = std::process::Command::new(&path);
    cmd.arg("version");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output();

    matches!(output, Ok(o) if o.status.success())
}

/// Auto-detect scrcpy path
pub fn detect_scrcpy_path() -> Option<String> {
    // First check PATH using which
    if let Ok(path) = which::which("scrcpy") {
        return Some(path.to_string_lossy().to_string());
    }

    // Check common locations on Windows
    let common_paths = [
        // User's custom location
        Some(PathBuf::from("C:/scrcpy/scrcpy.exe")),
        // scrcpy in user directory
        dirs::home_dir().map(|h| h.join("scrcpy/scrcpy.exe")),
        // Program Files
        Some(PathBuf::from("C:/Program Files/scrcpy/scrcpy.exe")),
    ];

    // Check common paths
    for path_opt in common_paths.iter() {
        if let Some(path) = path_opt {
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
        }
    }

    None
}

/// Validate that a scrcpy path is valid and executable
pub fn validate_scrcpy_path(path: &str) -> bool {
    let path = PathBuf::from(path);
    if !path.exists() {
        return false;
    }

    // Try to run scrcpy --version to verify it works
    let mut cmd = std::process::Command::new(&path);
    cmd.arg("--version");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output();

    matches!(output, Ok(o) if o.status.success())
}

/// Get settings with resolved ADB and scrcpy paths
pub fn get_settings_with_detection(app: &AppHandle) -> Result<Settings, AppError> {
    let mut settings = load_settings(app)?;

    // Resolve ADB path
    let adb_resolved = if let Some(ref user_path) = settings.adb_path {
        // User specified a path, validate it
        if validate_adb_path(user_path) {
            Some(user_path.clone())
        } else {
            None
        }
    } else {
        // Try auto-detection
        detect_adb_path()
    };

    settings.adb_resolved_path = adb_resolved.clone();
    settings.adb_available = adb_resolved.is_some();

    // Resolve scrcpy path
    let scrcpy_resolved = if let Some(ref user_path) = settings.scrcpy_path {
        // User specified a path, validate it
        if validate_scrcpy_path(user_path) {
            Some(user_path.clone())
        } else {
            None
        }
    } else {
        // Try auto-detection
        detect_scrcpy_path()
    };

    settings.scrcpy_resolved_path = scrcpy_resolved.clone();
    settings.scrcpy_available = scrcpy_resolved.is_some();

    Ok(settings)
}
