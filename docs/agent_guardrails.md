# GUARDRAILS (Agent Operating Rules) — GesuBridge

Guardrails to reduce prompt size, prevent scope creep, and keep iterations efficient.

---

## 0) Golden Rule

Keep the app runnable at all times:

- `pnpm dev`
- `pnpm tauri dev`

If something breaks, fix run/build first before adding features.

---

## 1) Scope Guardrails

### In-Scope (MVP)

- ADB device discovery (USB).
- Onboarding for USB debugging + RSA authorization.
- Mirroring via scrcpy (spawned process; external window).
- USB file transfer via ADB push/pull, with queue + history.
- Bluetooth file transfer via Windows built-in UI handoff.
- Local-only settings + logs.

### Out-of-Scope (Hard No)

- Bypassing Android security/authorization.
- Private data extraction (SMS/notifications/contacts/app data).
- Root/exploit/bootloader workflows.
- Always-on background daemon / auto-start on boot.
- Cloud sync, accounts, analytics.
- iOS integration for MVP.

---

## 2) Security Guardrails (Tauri)

### Frontend restrictions

- Frontend must not execute shell commands.
- Privileged operations only through typed Tauri commands (whitelist).

### Command spawning whitelist

Only allow:

- `adb` (trusted path)
- `scrcpy` (trusted path)
- explicitly-approved Windows system handoff executables

Never:

- execute user-supplied raw shell strings
- interpolate args into a single shell string
- accept arbitrary executable paths without validation

### Path validation

- Validate local paths before transfers.
- No filesystem operations outside explicit user-selected paths without confirmation.

---

## 3) ADB Safety & UX

- Device state must be explicit: `no devices / unauthorized / offline / ready`.
- Transfers default to a safe device directory (`Download/GesuBridge`).
- Pull operations require explicit device path input + confirmation.
- Errors must be actionable; no raw stack traces in UI.

---

## 4) Process Management (scrcpy/adb)

- Do not spawn duplicate mirror sessions per device.
- Track process handles; support stop/cancel.
- Unexpected process exits must surface a clear recovery action.

---

## 5) Transfer Guardrails

- All transfers go through a queue.
- Each job records:
  - id, direction, device serial, src, dst
  - timestamps, bytes (best-effort), result message
- Overwrite protection:
  - local: never overwrite without confirmation
  - device: best-effort existence check; confirm before overwrite

---

## 6) Dependencies

- Keep dependencies minimal.
- New dependencies require:
  - justification
  - size impact assessment
  - security consideration

---

## 7) Persistence

- Store settings in app config dir (per-user).
- Never commit user settings to repo.
- Avoid storing sensitive device data beyond what's needed.

---

## 8) Logging

- `ops.log`: operations (connect, mirror start/stop, transfers)
- `app.log`: exceptions/diagnostics
  Log entries include timestamp, op type, device serial, success/failure message.

---

## 9) Testing

- Keep UI testable without a device (mock ADB outputs).
- Provide fixtures for transfer tests.
- Add manual test checklist per phase.

---

## 10) UI & Responsiveness

- Tailwind allowed; keep tokens centralized.
- UI must stay responsive: long ops async in Rust.
- Dangerous actions require confirmation and distinct styling.

---

## 11) Iteration Output Contract

After each phase:

1. Phase & Goal
2. Summary of Changes
3. Files Changed/Added
4. How to Run
5. Manual Test Steps
6. Known Risks / Edge Cases
7. Next Step Recommendation
8. Git hygiene steps

Keep output compact but complete.

---

## 12) Global Definition of Done

A change is "done" only if:

- app runs (`pnpm dev` + `pnpm tauri dev`)
- manual tests are provided and credible
- errors are handled safely (no crashes)
- guardrails are not violated

---

End of guardrails.
