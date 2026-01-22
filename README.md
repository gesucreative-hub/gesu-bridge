# GesuBridge

A modern Windows desktop app for seamless Android device management — screen mirroring, camera streaming, file transfers, and Bluetooth handoff.

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

## Features

- 📱 **Device Management** - View connected Android devices with status
- 🖥️ **Screen Mirroring** - Mirror your phone screen via scrcpy
- 📷 **Camera Mode** - Use your phone as a webcam (DroidCam-like)
- 📁 **File Transfer** - Drag-and-drop file push to device via USB
- 📶 **Bluetooth Handoff** - Quick access to Windows Bluetooth dialogs

## Prerequisites

Before running GesuBridge, ensure you have:

### Required

- **ADB (Android Debug Bridge)** - Part of [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)
- **scrcpy** - [Download from GitHub](https://github.com/Genymobile/scrcpy/releases)

### Device Setup

1. Enable **Developer Options** on your Android device
2. Enable **USB Debugging** in Developer Options
3. Connect via USB and accept the RSA fingerprint prompt

## Installation

### Development

```bash
# Clone the repository
git clone <repo-url>
cd GesuBridge

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### First Run

1. Launch GesuBridge
2. Go to **Settings** page
3. Click **Auto-detect** for ADB and scrcpy paths
4. If not found, manually set the paths

## Usage

### Screen Mirroring

1. Connect your Android device via USB
2. Go to **Mirror** page
3. Select "Screen" mode
4. Click **Start Mirror** on your device

### Camera Mode (Webcam)

1. Go to **Mirror** page
2. Select "Camera" mode
3. Choose front/back camera and resolution
4. Click **Start Camera**
5. Use OBS Virtual Camera to expose to other apps

### File Transfer

1. Go to **Transfer** page
2. Select target device
3. Drag files or click **Browse Files**
4. Files go to `/sdcard/Download/GesuBridge`

### Bluetooth

1. Go to **Bluetooth** page
2. Use **Send/Receive** buttons to open Windows dialogs
3. Pair devices in **Settings** if needed

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri 2.x
- **Tools**: ADB, scrcpy

## License

MIT
