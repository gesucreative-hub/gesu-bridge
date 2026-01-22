//! scrcpy service for screen mirroring and camera mirroring

use crate::domain::errors::AppError;
use crate::domain::models::MirrorSession;
use std::collections::HashMap;
use std::process::{Child, Command};
use std::sync::Mutex;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Global state for active screen mirror sessions
static ACTIVE_SESSIONS: Mutex<Option<HashMap<String, Child>>> = Mutex::new(None);

/// Global state for active camera mirror sessions
static CAMERA_SESSIONS: Mutex<Option<HashMap<String, Child>>> = Mutex::new(None);

fn ensure_sessions_map() {
    let mut sessions = ACTIVE_SESSIONS.lock().unwrap();
    if sessions.is_none() {
        *sessions = Some(HashMap::new());
    }
}

fn ensure_camera_sessions_map() {
    let mut sessions = CAMERA_SESSIONS.lock().unwrap();
    if sessions.is_none() {
        *sessions = Some(HashMap::new());
    }
}

/// Start a screen mirror session for a device
pub fn start_mirror(
    scrcpy_path: &str,
    device_serial: &str,
    screen_off: bool,
) -> Result<MirrorSession, AppError> {
    ensure_sessions_map();

    let mut sessions = ACTIVE_SESSIONS.lock().unwrap();
    let sessions_map = sessions.as_mut().unwrap();

    if sessions_map.contains_key(device_serial) {
        return Err(AppError::MirrorError(format!(
            "Mirror session already active for device {}",
            device_serial
        )));
    }

    let mut cmd = Command::new(scrcpy_path);
    cmd.args(["-s", device_serial]);

    if screen_off {
        cmd.arg("--turn-screen-off");
    }

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let child = cmd
        .spawn()
        .map_err(|e| AppError::MirrorError(format!("Failed to start scrcpy: {}", e)))?;

    let process_id = child.id();
    let started_at = chrono::Utc::now().to_rfc3339();

    sessions_map.insert(device_serial.to_string(), child);

    Ok(MirrorSession {
        device_serial: device_serial.to_string(),
        process_id,
        started_at,
    })
}

/// Stop a screen mirror session
pub fn stop_mirror(device_serial: &str) -> Result<(), AppError> {
    ensure_sessions_map();

    let mut sessions = ACTIVE_SESSIONS.lock().unwrap();
    let sessions_map = sessions.as_mut().unwrap();

    if let Some(mut child) = sessions_map.remove(device_serial) {
        child
            .kill()
            .map_err(|e| AppError::MirrorError(format!("Failed to stop scrcpy: {}", e)))?;
        Ok(())
    } else {
        Err(AppError::MirrorError(format!(
            "No active mirror session for device {}",
            device_serial
        )))
    }
}

/// Get all active screen mirror sessions
pub fn get_active_sessions() -> Vec<MirrorSession> {
    ensure_sessions_map();

    let mut sessions = ACTIVE_SESSIONS.lock().unwrap();
    let sessions_map = sessions.as_mut().unwrap();

    // Clean up exited processes
    let to_remove: Vec<_> = sessions_map
        .iter_mut()
        .filter_map(|(serial, child)| match child.try_wait() {
            Ok(Some(_)) | Err(_) => Some(serial.clone()),
            _ => None,
        })
        .collect();

    for serial in to_remove {
        sessions_map.remove(&serial);
    }

    sessions_map
        .iter()
        .map(|(serial, child)| MirrorSession {
            device_serial: serial.clone(),
            process_id: child.id(),
            started_at: String::new(),
        })
        .collect()
}

// ============================================
// Camera Mirror Functions
// ============================================

/// Start a camera mirror session for a device
pub fn start_camera_mirror(
    scrcpy_path: &str,
    device_serial: &str,
    camera_facing: &str, // "front" or "back"
    camera_size: &str,   // e.g., "1920x1080"
    no_audio: bool,      // disable audio forwarding
    orientation: &str,   // "portrait" or "landscape"
) -> Result<MirrorSession, AppError> {
    ensure_camera_sessions_map();

    let mut sessions = CAMERA_SESSIONS.lock().unwrap();
    let sessions_map = sessions.as_mut().unwrap();

    if sessions_map.contains_key(device_serial) {
        return Err(AppError::MirrorError(format!(
            "Camera session already active for device {}",
            device_serial
        )));
    }

    let mut cmd = Command::new(scrcpy_path);
    cmd.args(["-s", device_serial]);
    cmd.arg("--video-source=camera");
    cmd.arg(format!("--camera-facing={}", camera_facing));

    if !camera_size.is_empty() {
        cmd.arg(format!("--camera-size={}", camera_size));
    }

    if no_audio {
        cmd.arg("--no-audio");
    }

    // Camera sensors naturally output landscape, orientation depends on:
    // - Portrait + Back camera: 90° rotation
    // - Portrait + Front camera: 270° rotation (front sensor is flipped)
    // - Landscape: no rotation (natural camera orientation)
    if orientation == "portrait" {
        if camera_facing == "front" {
            cmd.arg("--orientation=270");
        } else {
            cmd.arg("--orientation=90");
        }
    }

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let child = cmd
        .spawn()
        .map_err(|e| AppError::MirrorError(format!("Failed to start camera: {}", e)))?;

    let process_id = child.id();
    let started_at = chrono::Utc::now().to_rfc3339();

    sessions_map.insert(device_serial.to_string(), child);

    Ok(MirrorSession {
        device_serial: device_serial.to_string(),
        process_id,
        started_at,
    })
}

/// Stop a camera mirror session
pub fn stop_camera_mirror(device_serial: &str) -> Result<(), AppError> {
    ensure_camera_sessions_map();

    let mut sessions = CAMERA_SESSIONS.lock().unwrap();
    let sessions_map = sessions.as_mut().unwrap();

    if let Some(mut child) = sessions_map.remove(device_serial) {
        child
            .kill()
            .map_err(|e| AppError::MirrorError(format!("Failed to stop camera: {}", e)))?;
        Ok(())
    } else {
        Err(AppError::MirrorError(format!(
            "No active camera session for device {}",
            device_serial
        )))
    }
}

/// Get all active camera sessions
pub fn get_camera_sessions() -> Vec<MirrorSession> {
    ensure_camera_sessions_map();

    let mut sessions = CAMERA_SESSIONS.lock().unwrap();
    let sessions_map = sessions.as_mut().unwrap();

    // Clean up exited processes
    let to_remove: Vec<_> = sessions_map
        .iter_mut()
        .filter_map(|(serial, child)| match child.try_wait() {
            Ok(Some(_)) | Err(_) => Some(serial.clone()),
            _ => None,
        })
        .collect();

    for serial in to_remove {
        sessions_map.remove(&serial);
    }

    sessions_map
        .iter()
        .map(|(serial, child)| MirrorSession {
            device_serial: serial.clone(),
            process_id: child.id(),
            started_at: String::new(),
        })
        .collect()
}
