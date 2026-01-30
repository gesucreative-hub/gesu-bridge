//! Settings-related Tauri commands

use crate::domain::errors::AppError;
use crate::domain::models::Settings;
use crate::services::settings_service;
use tauri::AppHandle;

/// Get current settings with ADB detection
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, AppError> {
    settings_service::get_settings_with_detection(&app)
}

/// Set a custom ADB path
#[tauri::command]
pub fn set_adb_path(app: AppHandle, path: Option<String>) -> Result<Settings, AppError> {
    let mut settings = settings_service::load_settings(&app)?;
    settings.adb_path = path;
    settings_service::save_settings(&app, &settings)?;

    // Return updated settings with detection
    settings_service::get_settings_with_detection(&app)
}

/// Trigger auto-detection of ADB path
#[tauri::command]
pub fn detect_adb(app: AppHandle) -> Option<String> {
    settings_service::detect_adb_path(&app)
}

/// Set a custom scrcpy path
#[tauri::command]
pub fn set_scrcpy_path(app: AppHandle, path: Option<String>) -> Result<Settings, AppError> {
    let mut settings = settings_service::load_settings(&app)?;
    settings.scrcpy_path = path;
    settings_service::save_settings(&app, &settings)?;

    // Return updated settings with detection
    settings_service::get_settings_with_detection(&app)
}

/// Trigger auto-detection of scrcpy path
#[tauri::command]
pub fn detect_scrcpy(app: AppHandle) -> Option<String> {
    settings_service::detect_scrcpy_path(&app)
}

/// Set a custom FFmpeg path
#[tauri::command]
pub fn set_ffmpeg_path(app: AppHandle, path: Option<String>) -> Result<Settings, AppError> {
    let mut settings = settings_service::load_settings(&app)?;
    settings.ffmpeg_path = path;
    settings_service::save_settings(&app, &settings)?;

    // Return updated settings with detection
    settings_service::get_settings_with_detection(&app)
}

/// Trigger auto-detection of FFmpeg path
#[tauri::command]
pub fn detect_ffmpeg(app: AppHandle) -> Option<String> {
    settings_service::detect_ffmpeg_path(&app)
}
