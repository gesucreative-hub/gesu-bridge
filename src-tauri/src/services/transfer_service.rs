//! Transfer service for file operations

use crate::domain::errors::AppError;
use crate::domain::models::{TransferItem, TransferStatus};
use std::collections::HashMap;

use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

/// Global state for active transfers and history
static TRANSFERS: Mutex<Option<TransferState>> = Mutex::new(None);

struct TransferState {
    active: HashMap<String, TransferHandle>,
    history: Vec<TransferItem>,
}

struct TransferHandle {
    item: TransferItem,
    process: Option<Child>,
}

/// Initialize the transfer state if needed
fn ensure_transfer_state() {
    let mut state = TRANSFERS.lock().unwrap();
    if state.is_none() {
        *state = Some(TransferState {
            active: HashMap::new(),
            history: Vec::new(),
        });
    }
}

/// Generate a unique transfer ID
fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    format!("transfer_{}", timestamp)
}

/// Get file size in bytes
fn get_file_size(path: &str) -> u64 {
    std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

/// Push a single file to device
pub fn push_file(
    adb_path: &str,
    serial: &str,
    source_path: &str,
    dest_dir: &str,
) -> Result<TransferItem, AppError> {
    ensure_transfer_state();

    let file_name = Path::new(source_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let dest_path = format!("/sdcard/{}/{}", dest_dir, file_name);
    let size_bytes = get_file_size(source_path);

    let id = generate_id();
    let started_at = chrono::Utc::now().to_rfc3339();

    let mut item = TransferItem {
        id: id.clone(),
        file_name: file_name.clone(),
        source_path: source_path.to_string(),
        dest_path: dest_path.clone(),
        size_bytes,
        transferred_bytes: 0,
        status: TransferStatus::Transferring,
        error: None,
        started_at,
    };

    // Store in active transfers
    {
        let mut state = TRANSFERS.lock().unwrap();
        let state = state.as_mut().unwrap();
        state.active.insert(
            id.clone(),
            TransferHandle {
                item: item.clone(),
                process: None,
            },
        );
    }

    // Run adb push synchronously (for simplicity in MVP)
    let output = Command::new(adb_path)
        .args(["-s", serial, "push", source_path, &dest_path])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    let mut state = TRANSFERS.lock().unwrap();
    let state = state.as_mut().unwrap();

    match output {
        Ok(result) => {
            if result.status.success() {
                item.status = TransferStatus::Complete;
                item.transferred_bytes = size_bytes;
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                item.status = TransferStatus::Failed;
                item.error = Some(stderr.to_string());
            }
        }
        Err(e) => {
            item.status = TransferStatus::Failed;
            item.error = Some(format!("Failed to execute adb: {}", e));
        }
    }

    // Move to history
    state.active.remove(&id);
    state.history.insert(0, item.clone());

    // Keep only last 50 in history
    if state.history.len() > 50 {
        state.history.truncate(50);
    }

    Ok(item)
}

/// Get all active transfers
pub fn get_active_transfers() -> Vec<TransferItem> {
    ensure_transfer_state();

    let state = TRANSFERS.lock().unwrap();
    if let Some(s) = state.as_ref() {
        s.active.values().map(|h| h.item.clone()).collect()
    } else {
        Vec::new()
    }
}

/// Get transfer history
pub fn get_transfer_history() -> Vec<TransferItem> {
    ensure_transfer_state();

    let state = TRANSFERS.lock().unwrap();
    if let Some(s) = state.as_ref() {
        s.history.clone()
    } else {
        Vec::new()
    }
}

/// Cancel a transfer (mark as cancelled)
pub fn cancel_transfer(id: &str) -> Result<(), AppError> {
    ensure_transfer_state();

    let mut state = TRANSFERS.lock().unwrap();
    let state = state.as_mut().unwrap();

    if let Some(mut handle) = state.active.remove(id) {
        // Kill process if running
        if let Some(ref mut process) = handle.process {
            let _ = process.kill();
        }
        handle.item.status = TransferStatus::Cancelled;
        state.history.insert(0, handle.item);
        Ok(())
    } else {
        Err(AppError::TransferError(format!(
            "Transfer {} not found",
            id
        )))
    }
}
