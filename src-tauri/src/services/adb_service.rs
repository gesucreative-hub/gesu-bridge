//! ADB service for device discovery and command execution

use crate::domain::errors::AppError;
use crate::domain::models::{Device, DeviceState};
use std::process::Command;

/// Parse the output of `adb devices -l`
///
/// Example output:
/// ```
/// List of devices attached
/// emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
/// RFCT80XXXXX            unauthorized
/// 192.168.1.100:5555     device product:redfin model:Pixel_5 device:redfin transport_id:2
/// ```
pub fn parse_devices_output(output: &str) -> Vec<Device> {
    let mut devices = Vec::new();

    for line in output.lines().skip(1) {
        // Skip empty lines and header
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of devices") {
            continue;
        }

        // Split into parts
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].to_string();
        let state = DeviceState::from(parts[1]);

        let mut device = Device::new(serial, state);

        // Parse key:value pairs for additional info
        for part in parts.iter().skip(2) {
            if let Some((key, value)) = part.split_once(':') {
                match key {
                    "model" => device.model = Some(value.replace('_', " ")),
                    "manufacturer" => device.manufacturer = Some(value.to_string()),
                    _ => {}
                }
            }
        }

        devices.push(device);
    }

    devices
}

/// Run ADB command and return output
pub fn run_adb_command(adb_path: &str, args: &[&str]) -> Result<String, AppError> {
    let output = Command::new(adb_path)
        .args(args)
        .output()
        .map_err(|e| AppError::AdbExecutionFailed(format!("Failed to execute adb: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::AdbExecutionFailed(format!(
            "ADB command failed: {}",
            stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

/// List connected devices
pub fn list_devices(adb_path: &str) -> Result<Vec<Device>, AppError> {
    let output = run_adb_command(adb_path, &["devices", "-l"])?;
    let mut devices = parse_devices_output(&output);

    // Try to get additional device info for ready devices
    for device in devices.iter_mut() {
        if device.state == DeviceState::Ready {
            // Get Android version
            if let Ok(version) = run_adb_command(
                adb_path,
                &[
                    "-s",
                    &device.serial,
                    "shell",
                    "getprop",
                    "ro.build.version.release",
                ],
            ) {
                device.android_version = Some(version.trim().to_string());
            }

            // Get manufacturer if not already set
            if device.manufacturer.is_none() {
                if let Ok(mfr) = run_adb_command(
                    adb_path,
                    &[
                        "-s",
                        &device.serial,
                        "shell",
                        "getprop",
                        "ro.product.manufacturer",
                    ],
                ) {
                    device.manufacturer = Some(mfr.trim().to_string());
                }
            }

            // Get model if not already set
            if device.model.is_none() {
                if let Ok(model) = run_adb_command(
                    adb_path,
                    &["-s", &device.serial, "shell", "getprop", "ro.product.model"],
                ) {
                    device.model = Some(model.trim().to_string());
                }
            }
        }
    }

    Ok(devices)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_devices_output() {
        let output = r#"List of devices attached
emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
RFCT80XXXXX            unauthorized
192.168.1.100:5555     offline
"#;

        let devices = parse_devices_output(output);
        assert_eq!(devices.len(), 3);

        assert_eq!(devices[0].serial, "emulator-5554");
        assert_eq!(devices[0].state, DeviceState::Ready);
        assert_eq!(devices[0].model, Some("sdk gphone64 x86 64".to_string()));

        assert_eq!(devices[1].serial, "RFCT80XXXXX");
        assert_eq!(devices[1].state, DeviceState::Unauthorized);

        assert_eq!(devices[2].serial, "192.168.1.100:5555");
        assert_eq!(devices[2].state, DeviceState::Offline);
    }
}
