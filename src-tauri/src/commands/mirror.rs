//! Mirror-related Tauri commands

use crate::domain::errors::AppError;
use crate::domain::models::MirrorSession;
use crate::services::{scrcpy_service, settings_service};
use tauri::AppHandle;

/// Start a screen mirror session for a device
#[tauri::command]
pub fn start_mirror(
    app: AppHandle,
    serial: String,
    screen_off: bool,
) -> Result<MirrorSession, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let scrcpy_path = settings.scrcpy_resolved_path.ok_or_else(|| {
        AppError::ScrcpyNotFound(
            "scrcpy not found. Install scrcpy or set the path in Settings.".to_string(),
        )
    })?;

    scrcpy_service::start_mirror(&scrcpy_path, &serial, screen_off)
}

/// Stop a screen mirror session for a device
#[tauri::command]
pub fn stop_mirror(serial: String) -> Result<(), AppError> {
    scrcpy_service::stop_mirror(&serial)
}

/// Get all active screen mirror sessions
#[tauri::command]
pub fn get_mirror_sessions() -> Vec<MirrorSession> {
    scrcpy_service::get_active_sessions()
}

// ============================================
// Camera Mirror Commands
// ============================================

/// Start a camera mirror session for a device
#[tauri::command]
pub fn start_camera(
    app: AppHandle,
    serial: String,
    facing: String,     // "front" or "back"
    resolution: String, // e.g., "1920x1080"
    no_audio: bool,     // disable audio forwarding
) -> Result<MirrorSession, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let scrcpy_path = settings.scrcpy_resolved_path.ok_or_else(|| {
        AppError::ScrcpyNotFound(
            "scrcpy not found. Install scrcpy or set the path in Settings.".to_string(),
        )
    })?;

    scrcpy_service::start_camera_mirror(&scrcpy_path, &serial, &facing, &resolution, no_audio)
}

/// Stop a camera mirror session for a device
#[tauri::command]
pub fn stop_camera(serial: String) -> Result<(), AppError> {
    scrcpy_service::stop_camera_mirror(&serial)
}

/// Get all active camera sessions
#[tauri::command]
pub fn get_camera_sessions() -> Vec<MirrorSession> {
    scrcpy_service::get_camera_sessions()
}
