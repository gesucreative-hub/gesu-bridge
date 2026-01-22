//! Bluetooth-related Tauri commands

use std::process::Command;

/// Open Windows Bluetooth settings
#[tauri::command]
pub fn open_bluetooth_settings() {
    // Opens Windows Settings > Bluetooth & devices
    let _ = Command::new("cmd")
        .args(["/c", "start", "ms-settings:bluetooth"])
        .spawn();
}

/// Open Bluetooth file send dialog (fsquirt.exe)
#[tauri::command]
pub fn open_bluetooth_send() {
    // fsquirt.exe is the Windows Bluetooth File Transfer Wizard
    let _ = Command::new("fsquirt.exe").spawn();
}

/// Open Bluetooth file receive dialog
#[tauri::command]
pub fn open_bluetooth_receive() {
    // -Receive flag opens receive mode
    let _ = Command::new("fsquirt.exe").arg("-Receive").spawn();
}
