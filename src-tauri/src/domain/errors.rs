//! Application error types

use serde::{Deserialize, Serialize};
use std::fmt;

/// Application-level errors with user-friendly messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    /// ADB executable not found
    AdbNotFound(String),
    /// ADB command execution failed
    AdbExecutionFailed(String),
    /// Invalid file/directory path
    InvalidPath(String),
    /// IO operation failed
    IoError(String),
    /// Settings operation failed
    SettingsError(String),
    /// Device not found
    DeviceNotFound(String),
    /// scrcpy executable not found
    ScrcpyNotFound(String),
    /// Mirror operation failed
    MirrorError(String),
    /// Transfer operation failed
    TransferError(String),
    /// Thumbnail generation/retrieval failed
    ThumbnailNotAvailable(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::AdbNotFound(msg) => write!(f, "ADB not found: {}", msg),
            AppError::AdbExecutionFailed(msg) => write!(f, "ADB execution failed: {}", msg),
            AppError::InvalidPath(msg) => write!(f, "Invalid path: {}", msg),
            AppError::IoError(msg) => write!(f, "IO error: {}", msg),
            AppError::SettingsError(msg) => write!(f, "Settings error: {}", msg),
            AppError::DeviceNotFound(msg) => write!(f, "Device not found: {}", msg),
            AppError::ScrcpyNotFound(msg) => write!(f, "scrcpy not found: {}", msg),
            AppError::MirrorError(msg) => write!(f, "Mirror error: {}", msg),
            AppError::TransferError(msg) => write!(f, "Transfer error: {}", msg),
            AppError::ThumbnailNotAvailable(msg) => write!(f, "Thumbnail not available: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

/// Helper to convert AppError to a serializable result for Tauri
impl AppError {
    #[allow(dead_code)]
    pub fn user_guidance(&self) -> &'static str {
        match self {
            AppError::AdbNotFound(_) => {
                "Install Android SDK Platform Tools or set the ADB path manually in Settings."
            }
            AppError::AdbExecutionFailed(_) => {
                "Check if ADB is configured correctly and the device is connected."
            }
            AppError::InvalidPath(_) => "The specified path does not exist or is not accessible.",
            AppError::IoError(_) => "A file system operation failed. Check permissions.",
            AppError::SettingsError(_) => "Failed to save or load settings. Try restarting the app.",
            AppError::DeviceNotFound(_) => {
                "No device found with this serial. Ensure cable is connected and USB debugging is enabled."
            }
            AppError::ScrcpyNotFound(_) => {
                "Install scrcpy or set the scrcpy path manually in Settings."
            }
            AppError::MirrorError(_) => {
                "Mirror operation failed. Ensure device is connected and authorized."
            }
            AppError::TransferError(_) => {
                "File transfer failed. Check device connection and storage permissions."
            }
            AppError::ThumbnailNotAvailable(_) => {
                "Thumbnail preview not available for this media file."
            }
        }
    }
}
