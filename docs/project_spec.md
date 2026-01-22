# GesuBridge — Project Spec (Source of Truth)

This document is the **source of truth** for Agents implementing **GesuBridge**: scope, architecture, repo structure, safety rules, and phased delivery criteria.

> **Project summary:** A lightweight Windows desktop app that integrates with Android devices via **ADB** for:
>
> - **Screen mirroring** (scrcpy-based)
> - **File sharing** (USB via ADB push/pull; Bluetooth via Windows handoff)

---

## 0) Product Goal

GesuBridge enables a fast, reliable Windows ↔ Android workflow:

1. **Discover & connect devices** (USB-first via ADB; optional Wi-Fi ADB post-MVP).
2. **Mirror screen** with stable start/stop behavior and clear device state.
3. **Transfer files**:
   - USB: ADB push/pull with progress (best-effort)
   - Bluetooth: invoke Windows built-in Bluetooth file transfer UI as handoff/fallback
4. Maintain a **safe-by-default** posture:
   - no privileged operations, no stealth features
   - explicit consent and clear onboarding (USB debugging + RSA prompt)
   - actionable errors, never crashes

Primary qualities:

- Small footprint
- Fast startup
- Predictable UX
- Minimal dependencies
- Clear onboarding and troubleshooting

---

## 1) Non-Goals (Scope Control)

Hard no for MVP:

- Reading phone private data (SMS/notifications/contacts/calls/app data).
- Rooting, bootloader operations, exploit tooling, "bypass security".
- Always-on background services / auto-start on boot.
- Cloud sync, accounts, telemetry, analytics.
- iOS support.

Allowed later (post-MVP, optional):

- Wi-Fi ADB pairing flow
- Multi-device concurrency
- Embedded mirroring view inside app window (instead of external scrcpy window)

---

## 2) Target Platforms

MVP: **Windows 10/11**.

Post-MVP:

- macOS/Linux (optional)
- iOS: explicitly out-of-scope for MVP

---

## 3) Approved MVP Stack

**APPROVED**

- Tauri (Rust core)
- React + TypeScript (frontend)
- Tailwind CSS (styling)
- Vite (build)

Principles:

- Rust handles privileged work (process spawning, filesystem, OS calls).
- React stays UI-only and calls Rust via Tauri `invoke`.
- Keep the app runnable at all times.

---

## 4) External Tooling (ADB / scrcpy)

### 4.1 ADB

- Used for device discovery + file transfers.
- Requires Android-side enablement: Developer Options → USB debugging → RSA authorization prompt.

### 4.2 scrcpy

- Used for mirroring.
- MVP: spawn scrcpy as a child process (scrcpy opens its own window).
- Post-MVP: optional in-app render pipeline (higher complexity).

### 4.3 Binary sourcing policy (important)

Do not silently redistribute 3rd party binaries unless licensing is verified.
Safe MVP default:

- Settings allow:
  - Auto-detect ADB/scrcpy paths (best-effort)
  - User-supplied paths to `adb` and `scrcpy`
    Optional enhancement:
- Download-on-demand from official sources with explicit user consent + checksum verification.

---

## 5) Repository Structure (recommended)

```
gesubridge/
├── README.md
├── project_spec.md
├── agent-handshake.md
├── agent_guardrails.md
├── CHANGELOG.md
├── LICENSE
├── docs/
│   ├── architecture.md
│   ├── onboarding.md
│   ├── test-plan.md
│   ├── troubleshooting.md
│   └── decisions.md
├── fixtures/
│   ├── adb-mocks/
│   └── samples/
├── scripts/
│   ├── smoke-test.ps1
│   └── dev-reset.ps1
├── src-tauri/
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── adb.rs
│       │   ├── mirroring.rs
│       │   ├── transfer.rs
│       │   ├── settings.rs
│       │   └── bluetooth.rs
│       ├── domain/
│       │   ├── models.rs
│       │   └── errors.rs
│       ├── services/
│       │   ├── process.rs
│       │   ├── adb_service.rs
│       │   ├── scrcpy_service.rs
│       │   ├── transfer_service.rs
│       │   ├── settings_service.rs
│       │   └── log_service.rs
│       └── utils/
│           └── paths.rs
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/index.css
    ├── api/bridge.ts
    ├── pages/
    │   ├── DevicesPage.tsx
    │   ├── MirrorPage.tsx
    │   ├── TransferPage.tsx
    │   └── SettingsPage.tsx
    ├── ui/
    │   ├── layout/
    │   └── components/
    └── state/store.ts
```

---

## 6) Data, Settings, Logging

Settings stored per-user in app config:

- `adbPath` (optional if auto-detected)
- `scrcpyPath` (optional if auto-detected)
- `defaultDeviceTargetDir` (e.g., `Download/GesuBridge`)
- `recentDevices` (serial + friendly label)
- UI prefs

Logs stored locally:

- `ops.log` (device connect, mirror start/stop, transfer start/end)
- `app.log` (exceptions, diagnostics)

---

## 7) UX Guidelines (compact)

Pages:

- Devices
- Mirror
- Transfer
- Settings

Onboarding:

- Step-by-step instructions (enable USB debugging, connect cable, accept RSA prompt).
- Clearly show device state: `No devices / Unauthorized / Offline / Ready`.

Safety:

- Confirmations for destructive actions (cancel all, reset settings).
- Never show raw stack traces; map errors to actionable guidance.

Theme:

- Tailwind allowed; keep tokens centralized (no scattered color magic).

---

## 8) Phased Delivery

Rule: each phase yields a runnable app (`pnpm dev` + `pnpm tauri dev`) + test steps.

### Phase 0 — Bootstrap & Skeleton

Deliverables:

- Tauri + React + TS + Tailwind running
- Sidebar layout + placeholder pages
- Typed invoke bridge with `ping()`

DoD:

- `pnpm i`
- `pnpm dev` works
- `pnpm tauri dev` opens window without runtime errors

### Phase 1 — ADB Path + Device Discovery

Deliverables:

- Settings to detect/set ADB
- Device list (`adb devices -l`) + status chips
- Best-effort device props (model/manufacturer/android version)

DoD:

- Handles unauthorized/offline clearly
- Errors are actionable, no crash

### Phase 2 — Mirroring MVP (scrcpy external window)

Deliverables:

- Start/stop mirroring by device serial
- Session tracking (pid/handle, state)
- Mirror page device picker + basic toggles (optional)

DoD:

- No duplicate sessions
- Clean stop behavior
- Clear missing-binary errors

### Phase 3 — USB File Transfer (ADB push/pull)

Deliverables:

- Queue: add files/folders, push to default target dir
- Pull (advanced): user-provided device path
- Progress best-effort parsing (prefer `adb push -p` when available)
- Transfer history list

DoD:

- Small file + large file + folder transfer succeed
- Cancel is safe and consistent

### Phase 4 — Bluetooth Handoff (Windows built-in)

Deliverables:

- Buttons to launch system Bluetooth send/receive UI
- Clear documentation of limitations

DoD:

- Launches correct system UI on Windows
- No admin requirement

### Phase 5 — Polish, Packaging, Docs

Deliverables:

- Robust error mapping (adb missing, unauthorized, device offline, invalid paths)
- Onboarding + troubleshooting docs
- Release build packaging
- Smoke test checklist

DoD:

- Release runs on clean machine (no dev tools)
- `docs/test-plan.md` complete and credible

---

## 9) Engineering Conventions

- TypeScript `strict: true`
- Rust: clippy-clean for changed files
- Central error mapping: domain errors → user-friendly UI messages
- Long ops run async in Rust; UI stays responsive
- Never execute user-supplied raw shell strings

---

## 10) Mandatory Iteration Output (Agent)

After each phase:

1. Phase & Goal
2. Summary of Changes (3–8 bullets)
3. Files Changed/Added
4. How to Run
5. Manual Test Steps
6. Known Risks / Edge Cases
7. Next Step Recommendation
8. Git steps (if applicable)

---

End of spec.
