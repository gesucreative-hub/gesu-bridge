# Test Plan - GesuBridge

Smoke test checklist for manual verification.

## Prerequisites

- [ ] Windows 10/11 PC
- [ ] Android device with USB debugging enabled
- [ ] USB data cable (not charge-only)
- [ ] ADB installed and in PATH
- [ ] scrcpy installed

---

## 1. Settings Page

| Test               | Steps                           | Expected                   |
| ------------------ | ------------------------------- | -------------------------- |
| ADB auto-detect    | Click "Auto-detect" for ADB     | Shows path and "Available" |
| scrcpy auto-detect | Click "Auto-detect" for scrcpy  | Shows path and "Available" |
| Manual path        | Enter custom path, click "Save" | Path saved and validated   |
| Persist settings   | Restart app                     | Settings retained          |

---

## 2. Devices Page

| Test             | Steps                            | Expected                   |
| ---------------- | -------------------------------- | -------------------------- |
| Device detection | Connect device via USB           | Device appears in list     |
| Device info      | View device card                 | Shows model, manufacturer  |
| Unauthorized     | Connect without accepting prompt | Shows "Unauthorized" badge |
| Ready            | Accept RSA prompt                | Shows "Ready" badge        |
| Refresh          | Disconnect and reconnect         | List updates               |

---

## 3. Mirror Page (Screen)

| Test              | Steps                          | Expected                       |
| ----------------- | ------------------------------ | ------------------------------ |
| Start mirror      | Click "Start Mirror"           | scrcpy window opens            |
| Stop mirror       | Click "Stop" on active session | Window closes, session removed |
| Screen off toggle | Enable "Turn off phone screen" | Phone screen goes dark         |
| Multiple sessions | Start on multiple devices      | Each has own scrcpy window     |

---

## 4. Mirror Page (Camera)

| Test         | Steps                                    | Expected                     |
| ------------ | ---------------------------------------- | ---------------------------- |
| Start camera | Select Camera mode, click "Start Camera" | Camera feed in scrcpy window |
| Front camera | Select "Front", start                    | Front camera shown           |
| Back camera  | Select "Back", start                     | Back camera shown            |
| Resolution   | Select 1080p, start                      | Higher resolution stream     |
| Mute audio   | Enable mute toggle                       | No audio from PC             |
| Stop camera  | Click "Stop"                             | Window closes                |

---

## 5. Transfer Page

| Test               | Steps                       | Expected                       |
| ------------------ | --------------------------- | ------------------------------ |
| Select device      | Open Transfer page          | Device dropdown populates      |
| Browse files       | Click "Browse Files"        | Windows file picker opens      |
| Drag-drop          | Drag files onto zone        | Files transfer                 |
| Transfer complete  | Transfer finishes           | Appears in History as complete |
| Custom destination | Change destination folder   | Files go to new location       |
| Check on device    | Navigate to folder on phone | Files present                  |

---

## 6. Bluetooth Page

| Test           | Steps                       | Expected                             |
| -------------- | --------------------------- | ------------------------------------ |
| Open Settings  | Click "Open Settings"       | Windows Bluetooth settings opens     |
| Send dialog    | Click "Open Send Dialog"    | Bluetooth File Transfer wizard opens |
| Receive dialog | Click "Open Receive Dialog" | Receive mode dialog opens            |

---

## 7. Error Handling

| Test                  | Steps                         | Expected                          |
| --------------------- | ----------------------------- | --------------------------------- |
| ADB not configured    | Remove ADB path               | Clear error message with guidance |
| scrcpy not configured | Remove scrcpy path            | Clear error message with guidance |
| Device offline        | Use bad cable                 | Shows "Offline" status            |
| Transfer fail         | Transfer to non-existent path | Error shown, not crash            |

---

## Sign-off

- [ ] All tests pass
- [ ] No console errors (check DevTools)
- [ ] App responsive throughout

Tested by: ********\_******** Date: ******\_******
