// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod commands;
mod domain;
mod services;

use commands::adb::list_devices;
use commands::bluetooth::{open_bluetooth_receive, open_bluetooth_send, open_bluetooth_settings};
use commands::media::{
    get_default_media_root, get_media_thumbnail, list_device_folders, list_device_media,
    open_media_folder, preview_media, pull_media_files,
};
use commands::mirror::{
    get_camera_sessions, get_mirror_sessions, start_camera, start_mirror, stop_camera, stop_mirror,
};
use commands::settings::{
    detect_adb, detect_ffmpeg, detect_scrcpy, get_settings, set_adb_path, set_ffmpeg_path,
    set_scrcpy_path,
};
use commands::transfer::{cancel_transfer, get_transfers, push_files};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Ping command to verify the invoke bridge is working
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            ping,
            get_settings,
            set_adb_path,
            detect_adb,
            set_scrcpy_path,
            detect_scrcpy,
            set_ffmpeg_path,
            detect_ffmpeg,
            list_devices,
            start_mirror,
            stop_mirror,
            get_mirror_sessions,
            start_camera,
            stop_camera,
            get_camera_sessions,
            push_files,
            get_transfers,
            cancel_transfer,
            open_bluetooth_settings,
            open_bluetooth_send,
            open_bluetooth_receive,
            // Media Previewer commands
            get_default_media_root,
            list_device_folders,
            list_device_media,
            get_media_thumbnail,
            pull_media_files,
            preview_media,
            open_media_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
