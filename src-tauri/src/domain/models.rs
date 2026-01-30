//! Domain models for GesuBridge

use serde::{Deserialize, Serialize};

/// Device connection state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceState {
    Ready,
    Unauthorized,
    Offline,
    Unknown,
}

impl From<&str> for DeviceState {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "device" => DeviceState::Ready,
            "unauthorized" => DeviceState::Unauthorized,
            "offline" => DeviceState::Offline,
            _ => DeviceState::Unknown,
        }
    }
}

/// Represents a connected Android device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub serial: String,
    pub state: DeviceState,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub android_version: Option<String>,
}

impl Device {
    pub fn new(serial: String, state: DeviceState) -> Self {
        Self {
            serial,
            state,
            model: None,
            manufacturer: None,
            android_version: None,
        }
    }
}

/// Active mirror session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorSession {
    pub device_serial: String,
    pub process_id: u32,
    pub started_at: String,
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    /// User-configured ADB path (None = use auto-detect)
    pub adb_path: Option<String>,
    /// Resolved ADB path (after auto-detection)
    pub adb_resolved_path: Option<String>,
    /// Whether ADB was successfully detected/validated
    pub adb_available: bool,
    /// User-configured scrcpy path
    #[serde(default)]
    pub scrcpy_path: Option<String>,
    /// Resolved scrcpy path (after auto-detection)
    #[serde(default)]
    pub scrcpy_resolved_path: Option<String>,
    /// Whether scrcpy was successfully detected/validated
    #[serde(default)]
    pub scrcpy_available: bool,
    /// Default target directory on device for transfers
    pub default_device_dir: String,
    /// User-configured FFmpeg path
    #[serde(default)]
    pub ffmpeg_path: Option<String>,
    /// Resolved FFmpeg path (after auto-detection)
    #[serde(default)]
    pub ffmpeg_resolved_path: Option<String>,
    /// Whether FFmpeg was successfully detected/validated
    #[serde(default)]
    pub ffmpeg_available: bool,
}

impl Settings {
    pub fn new() -> Self {
        Self {
            adb_path: None,
            adb_resolved_path: None,
            adb_available: false,
            scrcpy_path: None,
            scrcpy_resolved_path: None,
            scrcpy_available: false,
            default_device_dir: "Download/GesuBridge".to_string(),
            ffmpeg_path: None,
            ffmpeg_resolved_path: None,
            ffmpeg_available: false,
        }
    }
}

/// Transfer status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TransferStatus {
    Queued,
    Transferring,
    Complete,
    Failed,
    Cancelled,
}

/// Represents a file transfer operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferItem {
    pub id: String,
    pub file_name: String,
    pub source_path: String,
    pub dest_path: String,
    pub size_bytes: u64,
    pub transferred_bytes: u64,
    pub status: TransferStatus,
    pub error: Option<String>,
    pub started_at: String,
}

// ============================================
// Media Previewer Models
// ============================================

/// Folder information from device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderInfo {
    pub name: String,
    pub path: String,
    pub item_count: Option<u32>,
    pub is_media_folder: bool,
}

/// Media file types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Image,
    Video,
}

/// Media item from device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaItem {
    pub path: String,
    pub name: String,
    pub media_type: MediaType,
    pub size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_ms: Option<u64>,
    pub date_taken: Option<String>,
    pub thumbnail_url: Option<String>,
}

/// Media filter for listing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum MediaFilter {
    #[default]
    All,
    Images,
    Videos,
}

/// Transfer result for media operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaTransferResult {
    pub source_path: String,
    pub dest_path: Option<String>,
    pub success: bool,
    pub error: Option<String>,
    pub size_bytes: u64,
}
