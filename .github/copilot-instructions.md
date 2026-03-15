# REM System — Copilot Instructions

These instructions apply to every conversation in this workspace. Follow them without being asked.

## Response Contract (Mandatory)

1. Every response must end with exactly: `Reference: WORKLOG.md`
2. If a request conflicts with `WORKLOG.md`, state the conflict first, then propose the compliant path.

## Priority Order

1. Direct user request
2. `WORKLOG.md` policy and active mandate
3. Repository instruction files (`.github/copilot-instructions.md`, `AGENTS.md`)
4. Implementation details and preferences

## Pre-Edit Checklist (One-Line Confirmation)

Before edits, confirm all three checks are done:
- Active phase/slice checked in `WORKLOG.md`
- Cleanup/new-feature gate checked in `WORKLOG.md`
- Stop/Resume snapshot checked in `WORKLOG.md`

---

## 1. Always Read WORKLOG.md First

Before writing any code or making any plan, read `WORKLOG.md` (root of workspace).

Check:
- What is the current phase and slice status?
- Is the cleanup gate open? If so, no new feature expansion may begin.
- What is the Stop/Resume Snapshot? Resume from exactly that point.
- Are there any `Blocked` items that need resolving before proceeding?

If the user's request conflicts with the current WORKLOG state (e.g. they ask for a new feature while the cleanup gate is open), flag the conflict before proceeding.

---

## 2. Follow the Architecture Boundary Policy

These rules are non-negotiable and defined in full in `WORKLOG.md`:

- `client/**` — no backend orchestration, filesystem logic, or server policy logic
- `server/**` — no DOM or UI rendering concerns
- New routes go in `server/routes/**`, not `server/server.js`
- New schemas and validators go in `server/contracts/**`
- `server/server.js` is composition/bootstrap only — no business logic
- New modules target <= 300 lines where practical
- Any file above 1200 lines that needs changes requires an extraction plan in the same slice

Mark boundary compliance with: `[BOUNDARY_OK]`, `[JS_OFFLOAD]`, `[CONTRACT_ENFORCED]`

---

## 3. Use the Phase Plan Template

Any multi-step work must follow the structure in `Documents/current/PHASE-PLAN-TEMPLATE.md`.

- Write guard tests before extracting or changing existing code (slice -0)
- Complete slices in order — do not skip ahead while a prior slice is incomplete
- Update the ledger and stop/resume snapshot after every slice

---

## 4. Source of Truth Hierarchy

| What you need | Where to look |
|---------------|--------------|
| What to do next (active work) | `WORKLOG.md` (tracked in repo) |
| How the system works | `Documents/current/` (local workspace only — gitignored) |
| What each server file owns | `Documents/current/SERVER-MODULE-MAP.md` |
| Memory/entity/pipeline architecture | `Documents/current/ARCHITECTURE-OVERVIEW.md` |
| Data shapes and contracts | `Documents/current/CONTRACTS-AND-SCHEMAS.md` |
| Implementation/behaviour truth | `server/**` and `tests/**` |

If a doc disagrees with the code, the code wins — and the doc needs updating.

## 5. What Is Gitignored (Never Commit These)

- `Documents/` — local architecture and planning docs; gitignored; do NOT add to git
- `Config/ma-config.json` — API keys and runtime config
- `server/data/accounts.json` — user account registry
- `server/data/sessions.json` — active session tokens
- `entities/` — runtime entity data (memories, state, beliefs)
- `memories/` — runtime system memory
- `server/entity/` — server-side entity runtime state
- `skills/*/workspace/` — skill workspace directories

If any of these appear in `git status` as untracked or modified, do NOT stage or commit them.

---

## 6. After Every Slice

1. Update the checkbox in `WORKLOG.md`
2. Add a ledger entry (date, slice ID, outcome, brief note)
3. Update the Stop/Resume Snapshot
4. Update `Documents/current/CHANGELOG.md` under `[Unreleased]`

---

## 7. Do Not

- Add features, refactors, or "improvements" not requested
- Add comments or docstrings to code that was not changed
- Create new markdown files unless explicitly asked
- Skip the WORKLOG check because the request seems small
- Proceed with new feature work if the cleanup gate is open