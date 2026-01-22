# Agent Handshake: Working Agreement (GesuBridge)

This document defines how the **User** and the **Agent** collaborate during iterative, phased development of **GesuBridge**.

---

## 1) Roles

### User (Product Owner)

- Sets priorities and requirements.
- Runs the app locally and executes manual test steps.
- Approves or requests changes before the next phase.

### Agent (Engineer)

- Implements features in small, safe increments.
- Keeps the app runnable at all times.
- Produces reproducible manual test steps.
- Reports risks, tradeoffs, and assumptions explicitly.

---

## 2) Core Collaboration Rules

### 2.1 Phased Development

- Follow phases in `project_spec.md`.
- Each phase must produce a runnable app:
  - `pnpm dev`
  - `pnpm tauri dev`
- Do not move to next phase unless DoD is met.

### 2.2 No Surprise Changes

Before changes that affect:

- ADB/scrcpy sourcing policy,
- security posture (command execution),
- API contracts between UI and Rust,
- dependency additions,
  the Agent must:

1. explain why,
2. show alternatives,
3. choose safest default.

### 2.3 Minimal Dependencies

- Keep Rust crates minimal and justified.
- Avoid heavy UI libraries unless materially beneficial.

### 2.4 Consent & Safety First

- ADB requires user-consent actions on the device (USB debugging + RSA prompt).
- The app must guide the user clearly and never attempt to bypass Android security.
- All operations must identify the target device (serial + label) and be stoppable.

---

## 3) Model Selection & Token Discipline (Antigravity)

When generating Antigravity prompts/artifacts, the Agent must:

- State which model is used (Gemini 3 Pro / Claude Sonnet 4.5 / Claude Opus 4.5).
- Be token-efficient, but never omit:
  - file paths,
  - commands,
  - acceptance criteria,
  - test steps,
  - list of changed files.

Suggested usage:

- Sonnet: implementation + refactors
- Opus: architecture review, high-risk edge cases
- Gemini: UI scaffolding/styling passes

---

## 4) Mandatory Output Template

After completing a phase or meaningful milestone:

1. Phase & Goal
2. Summary of Work
3. Files Changed/Added
4. How to Run
5. Manual Test Steps
6. Known Issues / Risks
7. Next Steps

---

## 5) Approval Gating

User approves continuation with one keyword:

- **APPROVED**
- **PROCEED**

Agent behavior:

- If approval keyword is present: proceed to next phase.
- If absent: do not assume acceptance; address requested fixes/clarifications.

---

## 6) Issue Handling Protocol

### 6.1 Build/Run Failures

- Restore runnable state first.
- Minimal fix before refactors.

### 6.2 ADB / Device Failures

Must provide actionable guidance for:

- adb not found / invalid path
- unauthorized (RSA prompt not accepted)
- offline device
- driver/cable issues
- scrcpy spawn failures

### 6.3 Assumptions

List assumptions explicitly and pick safe defaults.

---

## 7) Testing Discipline

- Maintain fixtures for transfers (small and large files).
- Provide "no-device" dev mode:
  - optional mock ADB outputs (`fixtures/adb-mocks/`)
  - UI should remain testable without a connected phone
- Manual tests per phase must include:
  - first-time device authorization flow
  - mirror start/stop stability
  - transfer success + cancel behavior

---

## 8) Documentation Updates

When adding features/workflows:

- update docs under `docs/`
- keep docs consistent with implemented behavior

---

## 9) Git Hygiene (If Git is used)

At phase completion:

1. Update planning artifacts (if repo includes them):
   - `MIGRATION_PLAN.md`
   - Task board / Task panel notes
2. Git:
   - `git status`
   - `git add ...` (only relevant files)
   - `git commit -m "<phase-based message>"`
   - `git push`

---

End of handshake.
