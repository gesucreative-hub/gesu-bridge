use crate::domain::errors::AppError;
use std::process::Command;

/// Opens the Windows Bluetooth settings panel.
#[tauri::command]
pub async fn open_bluetooth_settings() -> Result<(), AppError> {
    Command::new("explorer.exe")
        .arg("ms-settings:bluetooth")
        .spawn()
        .map_err(|e| AppError::IoError(format!("Failed to open Bluetooth settings: {}", e)))?;
    Ok(())
}

/// Opens the Windows Bluetooth file send dialog (fsquirt).
#[tauri::command]
pub async fn open_bluetooth_send() -> Result<(), AppError> {
    Command::new("fsquirt.exe")
        .spawn()
        .map_err(|e| AppError::IoError(format!("Failed to open Bluetooth send dialog: {}", e)))?;
    Ok(())
}

/// Opens the Windows Bluetooth file receive dialog (fsquirt -r).
#[tauri::command]
pub async fn open_bluetooth_receive() -> Result<(), AppError> {
    Command::new("fsquirt.exe").arg("-r").spawn().map_err(|e| {
        AppError::IoError(format!("Failed to open Bluetooth receive dialog: {}", e))
    })?;
    Ok(())
}
