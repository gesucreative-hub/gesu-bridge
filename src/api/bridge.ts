/**
 * GesuBridge API Bridge
 * Typed wrappers for Tauri invoke calls
 */

import { invoke } from "@tauri-apps/api/core";

// ============================================
// Types
// ============================================

export type DeviceState = "ready" | "unauthorized" | "offline" | "unknown";

export interface Device {
  serial: string;
  state: DeviceState;
  model: string | null;
  manufacturer: string | null;
  android_version: string | null;
}

export interface Settings {
  adb_path: string | null;
  adb_resolved_path: string | null;
  adb_available: boolean;
  scrcpy_path: string | null;
  scrcpy_resolved_path: string | null;
  scrcpy_available: boolean;
  default_device_dir: string;
  ffmpeg_path: string | null;
  ffmpeg_resolved_path: string | null;
  ffmpeg_available: boolean;
}

export interface MirrorSession {
  device_serial: string;
  process_id: number;
  started_at: string;
}

export type TransferStatus = 'queued' | 'transferring' | 'complete' | 'failed' | 'cancelled';

export interface TransferItem {
  id: string;
  file_name: string;
  source_path: string;
  dest_path: string;
  size_bytes: number;
  transferred_bytes: number;
  status: TransferStatus;
  error: string | null;
  started_at: string;
}

export interface AppError {
  type: string;
  message: string;
}

/**
 * Parse error from Tauri invoke call
 * Handles both AppError objects and regular Error/string types
 */
export function parseError(err: unknown): string {
  if (err === null || err === undefined) {
    return "Unknown error";
  }
  
  // Handle AppError object from Tauri
  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, unknown>;
    
    // Tauri AppError format: { type: "SomeError", message: "..." }
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    
    // Try to stringify if it has a type
    if (typeof errorObj.type === "string") {
      return `${errorObj.type}: ${JSON.stringify(err)}`;
    }
  }
  
  // Handle standard Error
  if (err instanceof Error) {
    return err.message;
  }
  
  // Fallback to string conversion
  return String(err);
}

// ============================================
// Bridge Commands
// ============================================

/**
 * Ping the Rust backend to verify the invoke bridge is working
 * @returns "pong" if successful
 */
export async function ping(): Promise<string> {
  return invoke<string>("ping");
}

/**
 * Get current settings with ADB and scrcpy detection
 */
export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

/**
 * Set a custom ADB path (or null to use auto-detect)
 */
export async function setAdbPath(path: string | null): Promise<Settings> {
  return invoke<Settings>("set_adb_path", { path });
}

/**
 * Trigger auto-detection of ADB path
 * @returns Detected path or null if not found
 */
export async function detectAdb(): Promise<string | null> {
  return invoke<string | null>("detect_adb");
}

/**
 * Set a custom scrcpy path (or null to use auto-detect)
 */
export async function setScrcpyPath(path: string | null): Promise<Settings> {
  return invoke<Settings>("set_scrcpy_path", { path });
}

/**
 * Trigger auto-detection of scrcpy path
 * @returns Detected path or null if not found
 */
export async function detectScrcpy(): Promise<string | null> {
  return invoke<string | null>("detect_scrcpy");
}

/**
 * Set a custom FFmpeg path (or null to use auto-detect)
 */
export async function setFfmpegPath(path: string | null): Promise<Settings> {
  return invoke<Settings>("set_ffmpeg_path", { path });
}

/**
 * Trigger auto-detection of FFmpeg path
 * @returns Detected path or null if not found
 */
export async function detectFfmpeg(): Promise<string | null> {
  return invoke<string | null>("detect_ffmpeg");
}

/**
 * List all connected Android devices
 */
export async function listDevices(): Promise<Device[]> {
  return invoke<Device[]>("list_devices");
}

// ============================================
// Mirror Commands
// ============================================

/**
 * Start a mirror session for a device
 * @param screenOff - Turn off device screen while mirroring
 */
export async function startMirror(serial: string, screenOff: boolean = false): Promise<MirrorSession> {
  return invoke<MirrorSession>("start_mirror", { serial, screenOff });
}

/**
 * Stop a mirror session for a device
 */
export async function stopMirror(serial: string): Promise<void> {
  return invoke<void>("stop_mirror", { serial });
}

/**
 * Get all active mirror sessions
 */
export async function getMirrorSessions(): Promise<MirrorSession[]> {
  return invoke<MirrorSession[]>("get_mirror_sessions");
}

// ============================================
// Camera Commands
// ============================================

export type CameraFacing = 'front' | 'back';
export type CameraResolution = '640x480' | '1280x720' | '1920x1080';

/**
 * Start a camera mirror session
 * @param noAudio - Disable audio forwarding (mute)
 * @param orientation - Camera orientation: 'portrait' or 'landscape'
 */
export async function startCamera(
  serial: string, 
  facing: CameraFacing = 'back', 
  resolution: CameraResolution = '1280x720',
  noAudio: boolean = true,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<MirrorSession> {
  return invoke<MirrorSession>("start_camera", { serial, facing, resolution, noAudio, orientation });
}

/**
 * Stop a camera mirror session
 */
export async function stopCamera(serial: string): Promise<void> {
  return invoke<void>("stop_camera", { serial });
}

/**
 * Get all active camera sessions
 */
export async function getCameraSessions(): Promise<MirrorSession[]> {
  return invoke<MirrorSession[]>("get_camera_sessions");
}

// ============================================
// Transfer Commands
// ============================================

/**
 * Push files to a device
 */
export async function pushFiles(
  serial: string,
  paths: string[],
  dest?: string
): Promise<TransferItem[]> {
  return invoke<TransferItem[]>("push_files", { serial, paths, dest });
}

/**
 * Get active transfers and history
 * @returns [activeTransfers, transferHistory]
 */
export async function getTransfers(): Promise<[TransferItem[], TransferItem[]]> {
  return invoke<[TransferItem[], TransferItem[]]>("get_transfers");
}

/**
 * Cancel a transfer
 */
export async function cancelTransfer(id: string): Promise<void> {
  return invoke<void>("cancel_transfer", { id });
}

// ============================================
// Bluetooth Commands
// ============================================

/**
 * Open Windows Bluetooth settings
 */
export async function openBluetoothSettings(): Promise<void> {
  return invoke<void>("open_bluetooth_settings");
}

/**
 * Open Bluetooth file send dialog
 */
export async function openBluetoothSend(): Promise<void> {
  return invoke<void>("open_bluetooth_send");
}

/**
 * Open Bluetooth file receive dialog
 */
export async function openBluetoothReceive(): Promise<void> {
  return invoke<void>("open_bluetooth_receive");
}

// ============================================
// Media Previewer Types
// ============================================

export interface FolderInfo {
  name: string;
  path: string;
  item_count: number | null;
  is_media_folder: boolean;
}

export type MediaType = 'image' | 'video';

export interface MediaItem {
  path: string;
  name: string;
  media_type: MediaType;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  date_taken: string | null;
  thumbnail_url: string | null;
}

export type MediaFilter = 'all' | 'images' | 'videos';

export interface MediaTransferResult {
  source_path: string;
  dest_path: string | null;
  success: boolean;
  error: string | null;
  size_bytes: number;
}

// ============================================
// Media Previewer Commands
// ============================================

/**
 * Get the best default root folder for media browsing
 * Detects SD card if available, otherwise uses internal storage
 * @param serial Device serial number
 */
export async function getDefaultMediaRoot(serial: string): Promise<string> {
  return invoke<string>("get_default_media_root", { serial });
}

/**
 * List folders on the device at specified path
 * @param serial Device serial number
 * @param path Path to list (defaults to /sdcard if not specified)
 */
export async function listDeviceFolders(
  serial: string,
  path?: string
): Promise<FolderInfo[]> {
  return invoke<FolderInfo[]>("list_device_folders", { serial, path });
}

/**
 * List media files in a folder on the device
 * @param serial Device serial number
 * @param path Path to list media from
 * @param filter Optional filter: 'all', 'images', or 'videos'
 */
export async function listDeviceMedia(
  serial: string,
  path: string,
  filter?: MediaFilter
): Promise<MediaItem[]> {
  return invoke<MediaItem[]>("list_device_media", { serial, path, filter });
}

/**
 * Get thumbnail for a media file
 * @returns Base64 data URL or throws if thumbnail not available
 */
export async function getMediaThumbnail(
  serial: string,
  path: string
): Promise<string> {
  return invoke<string>("get_media_thumbnail", { serial, path });
}

/**
 * Pull media files from device to PC
 * @param serial Device serial number
 * @param paths Array of remote file paths to pull
 * @param dest Optional destination folder (defaults to Downloads)
 */
export async function pullMediaFiles(
  serial: string,
  paths: string[],
  dest?: string
): Promise<MediaTransferResult[]> {
  return invoke<MediaTransferResult[]>("pull_media_files", { serial, paths, dest });
}

/**
 * Preview a media file by pulling to temp and returning local path
 * @returns Local file path for preview
 */
export async function previewMedia(
  serial: string,
  path: string
): Promise<string> {
  return invoke<string>("preview_media", { serial, path });
}

/**
 * Open folder in system file manager
 */
export async function openMediaFolder(path: string): Promise<void> {
  return invoke<void>("open_media_folder", { path });
}

// ============================================
// Legacy Commands (kept for reference)
// ============================================

/**
 * Greet command (from Tauri template, kept for reference)
 */
export async function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name });
}

