# Troubleshooting Guide

## ADB Issues

### "ADB not found"

**Symptoms**: Settings shows ADB as "Not Found"

**Solutions**:

1. Install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)
2. Add to system PATH or use a common location like `C:/platform-tools/`
3. Click **Auto-detect** in Settings, or set path manually

### "Device unauthorized"

**Symptoms**: Device shows as "Unauthorized" in Devices page

**Solutions**:

1. Check your phone's screen for an RSA fingerprint prompt
2. Tap **Allow** (optionally check "Always allow")
3. If no prompt appears:
   - Disconnect USB
   - Revoke USB debugging authorizations in Developer Options
   - Reconnect and accept the new prompt

### "Device offline"

**Symptoms**: Device shows as "Offline" in Devices page

**Solutions**:

1. Try a different USB cable (use a data cable, not charge-only)
2. Try a different USB port (prefer USB 3.0 ports)
3. Toggle USB debugging off and on
4. Restart ADB: run `adb kill-server` then `adb start-server`

---

## scrcpy Issues

### "scrcpy not found"

**Symptoms**: Mirror page shows "scrcpy Not Configured"

**Solutions**:

1. Download [scrcpy](https://github.com/Genymobile/scrcpy/releases)
2. Extract to a common location like `C:/scrcpy/`
3. Click **Auto-detect** in Settings, or set path manually

### Mirror fails to start

**Symptoms**: Clicking "Start Mirror" shows error

**Solutions**:

1. Ensure device is authorized (see above)
2. Check if another scrcpy instance is already running
3. Try stopping any active sessions first

### Camera mode not working

**Symptoms**: Camera mirror shows black screen or fails

**Requirements**:

- scrcpy 2.1+ required
- Android 12+ required for camera mirroring

**Solutions**:

1. Update scrcpy to latest version
2. Ensure no other app is using the camera
3. Grant camera permission if prompted on device

---

## File Transfer Issues

### Files not appearing on device

**Symptoms**: Transfer shows complete but files not visible

**Solutions**:

1. Check the exact path: `/sdcard/Download/GesuBridge/`
2. Use a file manager app to navigate to the folder
3. Some devices require MTP mode instead of charging mode

### Transfer fails immediately

**Symptoms**: Error message about path or permission

**Solutions**:

1. Ensure USB debugging is enabled
2. Check device storage space
3. Some devices block certain file types

---

## Bluetooth Issues

### Send/Receive dialog doesn't open

**Symptoms**: Clicking Bluetooth buttons does nothing

**Solutions**:

1. Ensure Bluetooth is enabled on your PC
2. Check if `fsquirt.exe` exists (run from cmd to test)
3. Restart Bluetooth service in Windows

### Device not appearing in Bluetooth dialog

**Solutions**:

1. Pair your device first via **Open Settings** button
2. Ensure device Bluetooth is on and discoverable
3. Check pairing on both PC and phone

---

## General Issues

### App won't launch

**Solutions**:

1. Install [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. Check Windows Event Viewer for crash details
3. Delete `%APPDATA%/com.surya.gesubridge/` and restart

### UI is blank or broken

**Solutions**:

1. Delete web cache: `%APPDATA%/com.surya.gesubridge/LocalStorage/`
2. Restart the application
3. Check for JavaScript errors in DevTools (F12)
