# REM System — Copilot Instructions

These instructions apply to every conversation in this workspace. Follow them without being asked.

## Response Contract (Mandatory)

1. Every response must end with exactly: `Reference: WORKLOG.md | .github/copilot-instructions.md`
2. If a request conflicts with `WORKLOG.md`, state the conflict first, then propose the compliant path.

## Priority Order

1. Direct user request
2. `WORKLOG.md` active mandate, current status, and stop/resume state
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

Use `WORKLOG.md` for:
- active mandate and current status
- stop/resume state
- implementation ledger and dated history

Do not treat `WORKLOG.md` as the primary home for reusable planning rules or architecture documentation.

Check:
- What is the current phase and slice status?
- Is the cleanup gate open? If so, no new feature expansion may begin.
- What is the Stop/Resume Snapshot? Resume from exactly that point.
- Are there any `Blocked` items that need resolving before proceeding?

If the user's request conflicts with the current WORKLOG state (e.g. they ask for a new feature while the cleanup gate is open), flag the conflict before proceeding.

---

## 2. Follow the Architecture Boundary Policy

These rules are non-negotiable for this repo. `WORKLOG.md` tracks active mandate/gates; this file and the source-of-truth docs define where the rules live.

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
| How planning is structured | `Documents/current/PHASE-PLANNING-SOURCE-OF-TRUTH.md` |
| Blueprint for new multi-slice plans | `Documents/current/PHASE-PLAN-TEMPLATE.md` |
| Completed internal plan archive | `Documents/current/completed-phase-plans/INDEX.md` |
| Internal support-doc archive | `Documents/current/support-docs/INDEX.md` |
| Public architecture and system docs | `docs/ARCHITECTURE-OVERVIEW.md`, `docs/PIPELINE-AND-ORCHESTRATION.md`, `docs/MEMORY-SYSTEM.md`, `docs/ENTITY-AND-IDENTITY.md` |
| Data shapes and contracts | `docs/CONTRACTS-AND-SCHEMAS.md` |
| CSS/HTML agent rules and checklist | `.github/copilot-instructions.md` Section 8 |
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
4. Update `CHANGELOG.md` under `[Unreleased]`

---

## 7. Do Not

- Add features, refactors, or "improvements" not requested
- Add comments or docstrings to code that was not changed
- Create new markdown files unless explicitly asked
- Skip the WORKLOG check because the request seems small
- Proceed with new feature work if the cleanup gate is open

---

## 8. Code Standards

### CSS Class System

**The Golden Rule**: `css/system-shared.css` is the SINGLE source of truth for all shared styles. Numbers are FROZEN. Gaps are INTENTIONAL. Never renumber, never compact.

**Before adding any style:**
1. Search the `/* BEGIN GENERATED INLINE STYLE CLASSES */` block first
2. If a matching rule exists — use that class number, do not create a new one
3. Only mint a new class if NO match exists
4. New classes append at the END only, continuing the sequence
5. Never create a new namespace — there is ONE namespace: `sys-inline-XXXX`
   (No `nk-s-`, no `app-s-`, no `tab-s-`)

**Never extract these inline styles to classes:**
- `display:none` — JavaScript toggles this directly at runtime
- `display:none;...` — any compound style containing display:none
- `width:0%` — JS animation start state
- `opacity:0` — JS fade start state
- Any value set inside a `setTimeout`, event handler, or `.style.` assignment

### HTML Structure

**Tab content lives in files, never in index.html.** index.html contains ONLY shell chrome — slots, not content.

Shell chrome that stays in index.html: header (`hdr`), nav sidebar (`nav-sidebar`), taskbar (`os-taskbar`), start menu (`os-start-menu`), snap dock (`wm-snap-dock`), context menu (`ctx-menu`), desktop home section (`os-home`), overlay slots.

```html
<!-- CORRECT -->
<div id="core-tab-slot-mytab" data-core-tab="mytab"></div>

<!-- WRONG — never put tab content directly in index.html -->
<div class="tab-content" id="tab-mytab">...</div>
```

**Adding a new core tab:**
1. Create `apps/core/tab-mytab.html` with the full tab content
2. Add a slot div in index.html in the correct position
3. Register it in `js/apps/core-html-loader.js`
4. Do not add `<link>` or `<style>` tags inside the tab HTML file

**Adding a new non-core tab:**
1. Create `apps/non-core/core/tab-mytab.html`
2. Add an entry to `apps/non-core/non-core-apps.manifest.json`
3. The loader handles everything else — do not touch index.html

### JavaScript Loaders

`non-core-html-loader.js` and `core-html-loader.js` use `Promise.all()` for parallel async fetching — **never revert to sync XHR**.

The installer comment markers in `non-core-html-loader.js` are parsed by the installer — **never remove or reformat them:**
```javascript
  //Open Next json entry id
  //JsonEntryId: "my-app-001"
      manifest.nonCoreApps.push({...});
  //Close "
```

### Where Files Live

| Location | Purpose |
|---|---|
| `css/system-shared.css` | All shared utility classes — single source of truth |
| `css/ui-v2.css` | Core UI component styles |
| `themes/core/` | Theme overrides |
| `apps/core/tab-*.html` | Core tab content |
| `apps/non-core/core/tab-*.html` | Non-core/optional tab content |
| `apps/core/overlays/` | Boot, login, setup wizard, sleep overlays |

### Agent Checklist (CSS/HTML)

Before making any CSS or HTML changes, confirm:

- [ ] Searched existing `sys-inline-XXXX` classes before creating new ones
- [ ] Not renumbering or compacting the class sequence
- [ ] Not extracting `display:none` or other JS-controlled styles
- [ ] Not putting tab content directly into index.html
- [ ] Not adding `<link>` or `<style>` tags to tab HTML files
- [ ] Not reverting async loaders to sync XHR
- [ ] Not touching the installer comment markers in non-core-html-loader.js
- [ ] New CSS entries append at the END of the generated block only

### Safety Scripts

Run after any agent CSS or HTML session:

```
node scripts/dedup-styles.js      # finds/removes duplicate sys-inline classes
node scripts/orphan-audit.js      # finds unreferenced JS, HTML, CSS files
```

Both scripts are idempotent — safe to run multiple times. If clean, they report and exit without modifying files.