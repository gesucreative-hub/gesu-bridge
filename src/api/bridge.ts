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
 */
export async function startCamera(
  serial: string, 
  facing: CameraFacing = 'back', 
  resolution: CameraResolution = '1280x720',
  noAudio: boolean = true
): Promise<MirrorSession> {
  return invoke<MirrorSession>("start_camera", { serial, facing, resolution, noAudio });
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
// Legacy Commands (kept for reference)
// ============================================

/**
 * Greet command (from Tauri template, kept for reference)
 */
export async function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name });
}

