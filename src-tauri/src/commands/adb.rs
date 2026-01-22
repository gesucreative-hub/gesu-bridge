//! ADB-related Tauri commands

use crate::domain::errors::AppError;
use crate::domain::models::Device;
use crate::services::{adb_service, settings_service};
use tauri::AppHandle;

/// List all connected devices
#[tauri::command]
pub fn list_devices(app: AppHandle) -> Result<Vec<Device>, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound(
            "ADB not found. Install Android SDK Platform Tools or set the path in Settings."
                .to_string(),
        )
    })?;

    adb_service::list_devices(&adb_path)
}
