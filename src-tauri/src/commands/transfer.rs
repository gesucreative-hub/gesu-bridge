//! Transfer-related Tauri commands

use crate::domain::errors::AppError;
use crate::domain::models::TransferItem;
use crate::services::{settings_service, transfer_service};
use tauri::AppHandle;

/// Push files to a device
#[tauri::command]
pub fn push_files(
    app: AppHandle,
    serial: String,
    paths: Vec<String>,
    dest: Option<String>,
) -> Result<Vec<TransferItem>, AppError> {
    let settings = settings_service::get_settings_with_detection(&app)?;

    let adb_path = settings.adb_resolved_path.ok_or_else(|| {
        AppError::AdbNotFound("ADB not found. Configure it in Settings.".to_string())
    })?;

    let dest_dir = dest.unwrap_or(settings.default_device_dir);

    let mut results = Vec::new();
    for path in paths {
        match transfer_service::push_file(&adb_path, &serial, &path, &dest_dir) {
            Ok(item) => results.push(item),
            Err(e) => {
                // Continue with other files but report this error
                results.push(TransferItem {
                    id: format!("error_{}", chrono::Utc::now().timestamp_millis()),
                    file_name: std::path::Path::new(&path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    source_path: path.clone(),
                    dest_path: format!("/sdcard/{}/", dest_dir),
                    size_bytes: 0,
                    transferred_bytes: 0,
                    status: crate::domain::models::TransferStatus::Failed,
                    error: Some(e.to_string()),
                    started_at: chrono::Utc::now().to_rfc3339(),
                });
            }
        }
    }

    Ok(results)
}

/// Get active transfers and history
#[tauri::command]
pub fn get_transfers() -> (Vec<TransferItem>, Vec<TransferItem>) {
    (
        transfer_service::get_active_transfers(),
        transfer_service::get_transfer_history(),
    )
}

/// Cancel a transfer
#[tauri::command]
pub fn cancel_transfer(id: String) -> Result<(), AppError> {
    transfer_service::cancel_transfer(&id)
}
