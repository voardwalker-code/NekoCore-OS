# App Folder Ownership — Contributor Guide

**Scope:** `project/client/js/`
**Audience:** Contributors building or customizing app modules
**Origin:** Phase D1-2 app-folder modularization contributor guide
**Last updated:** 2026-03-18

---

## 1. Folder Structure

```
project/client/js/
├── app.js               ← shell-core registry + tab/window engine
├── boot.js              ← DOMContentLoaded bootstrap
├── desktop.js           ← start menu, taskbar, pinned-app shell
├── window-manager.js    ← window open/close/resize/snap engine
├── vfs.js               ← workspace VFS (shell-critical flat exception)
├── context-menu.js      ← right-click context menus
├── auth.js              ← auth + login guards
├── pipeline.js          ← client-side pipeline relay
├── memory-ui.js         ← mini-memory visualizer
├── sleep.js             ← sleep/REM cycle UI
├── shared/              ← SSE bus, shared API client, entity-select
├── neural-viz/          ← standalone neural visualizer engine
│
├── apps/
│   ├── app-manifest.json     ← machine-readable ownership manifest
│   ├── core/                 ← core app modules (shell-critical tabs)
│   │   ├── chat.js
│   │   ├── entity-ui.js
│   │   ├── users-ui.js
│   │   ├── setup-ui.js
│   │   ├── config-profiles.js
│   │   ├── simple-provider.js
│   │   ├── system-health.js
│   │   ├── telemetry-ui.js
│   │   └── debug-core-app.js
│   │
│   └── optional/             ← optional app modules (removable)
│       ├── diary.js
│       ├── theme-manager.js
│       ├── physical-ui.js
│       ├── visualizer-ui.js
│       ├── browser-app.js
│       ├── document-digest.js
│       ├── skills-ui.js
│       └── dream-gallery.js
```

---

## 2. Classification: Core vs Optional

### Core (`apps/core/`)

A module is **Core** when:
- Its tab or functionality is required for the shell to boot or for at least one primary user workflow to work
- Removing it would break login, entity management, settings, chat, or system stability
- Its functions are directly called during the boot sequence or by other core modules

Current core tabs: `chat`, `entity`, `creator`, `users`, `settings`, `advanced`, `activity`, `observability`, `debugcore`, `nekocore`

> `creator` and `nekocore` are iframe-hosted (`.html` source) so they have no `<script src>` in `index.html`. They are still classified Core because their absence would break the creator flow and NekoCore OS controls.

### Optional (`apps/optional/`)

A module is **Optional** when:
- Its tab can be absent from the load order without crashing boot or primary navigation
- Shell-core files may call its entrypoints, but only through `typeof` guards
- A user could remove the file from the script list and the OS would still start

Current optional tabs: `dreamgallery`, `lifediary`, `dreamdiary`, `themes`, `browser`, `documents`, `workspace`, `skills`, `visualizer`, `physical`

> `workspace` is the documented **vfs.js flat-path exception**. The VFS module is classified optional in the manifest, but its script lives at `js/vfs.js` (not `js/apps/optional/`) because `vfs.js` bootstraps the desktop VFS on `DOMContentLoaded` — it is loaded before the apps folder and depended on by the shell. Do not move it into `apps/optional/`.

---

## 3. How to Add a New App

### Step 1 — Classify your app

Ask: "If this file is missing, does the shell still boot and can a user still chat?"
- If **yes** → `apps/optional/`
- If **no** → `apps/core/`

### Step 2 — Create the module file

Place the file in the correct folder:
```
project/client/js/apps/optional/my-feature.js
# or
project/client/js/apps/core/my-feature.js
```

### Step 3 — Register in `app-manifest.json`

Add an entry to `project/client/js/apps/app-manifest.json`:
```json
{
  "tabId": "myfeature",
  "class": "optional",
  "sourcePath": "js/apps/optional/my-feature.js",
  "bootstrapCritical": false,
  "dependencies": ["js/app.js"]
}
```

### Step 4 — Register in `WINDOW_APPS` (app.js)

Add an entry to the `WINDOW_APPS` array and `APP_CATEGORY_BY_TAB` map in `project/client/js/app.js`.

### Step 5 — Add `<script src>` to `index.html`

Find an appropriate position in the script load block (~line 2250+). Optional modules load after core modules, before `js/boot.js`. Preserve existing order — do not move other scripts.

### Step 6 — Guard all shell-core call sites

If any shell-core file (`app.js`, `boot.js`, `desktop.js`, `window-manager.js`) needs to call a function from your new module, always use a `typeof` guard:

```js
// ✅ Correct — safe for absent module
if (typeof myModuleInit === 'function') myModuleInit();

// ❌ Wrong — will throw if module is absent
myModuleInit();
```

### Step 7 — Write guard tests

Add assertions to the relevant test files before doing any implementation work:
- `project/tests/unit/optional-app-migration-guards.test.js` — new optional module guards
- `project/tests/unit/registry-path-audit-guards.test.js` — automatically covers new entries if manifest is correct
- `project/tests/unit/optional-failure-simulation.test.js` — add typeof-guard simulation entries for any shell-core callers

### Step 8 — Run the full suite

```powershell
cd project
npm test
```
All tests must pass before merging.

---

## 4. How to Migrate an Existing App

If an app module currently lives outside `apps/core/` or `apps/optional/`:

1. Identify the target folder (Core or Optional).
2. Write guard tests first (guard-first slice pattern).
3. Move the file.
4. Update `<script src>` in `index.html` (path only — do not change load order).
5. Update `app-manifest.json` sourcePath.
6. Update any constants referencing the old path in existing guard test files.
7. Run the full suite.

---

## 5. Documented Exceptions

| Tab | File | Reason for exception |
|-----|------|----------------------|
| `workspace` | `js/vfs.js` | Shell-critical: bootstraps desktop VFS on `DOMContentLoaded`. Load order dependency means it cannot live under `apps/optional/`. |
| `creator` | `create.html` | Iframe-hosted; no `<script src>` in `index.html`. Classified core. |
| `nekocore` | `nekocore.html` | Iframe-hosted; no `<script src>` in `index.html`. Classified core. |

---

## 6. Ownership Verification

The following test files enforce ownership rules automatically:

| Test file | What it verifies |
|-----------|-----------------|
| `tests/unit/registry-path-audit-guards.test.js` | Core modules in `apps/core/`, optional in `apps/optional/`, no flat-path regressions, manifest-to-html completeness |
| `tests/unit/app-manifest-guards.test.js` | Manifest covers all 20 WINDOW_APPS tabs, valid classes and sourcePaths |
| `tests/unit/optional-app-migration-guards.test.js` | All optional modules at correct paths with entrypoints declared, vfs.js stays flat |
| `tests/unit/optional-failure-simulation.test.js` | All shell-core callers of optional entrypoints use typeof guards |
| `tests/unit/optional-app-degradation-guards.test.js` | Degradation baseline for optional module absent-path scenarios |
