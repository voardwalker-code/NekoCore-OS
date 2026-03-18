# NekoCore OS - How To Create An App

Last updated: 2026-03-18

This guide is the complete pre-cleanup baseline for creating installer-managed non-core apps.

Use this when you want:
1. A new app tab payload.
2. A repeat-safe install path.
3. A reversible uninstall path.
4. A contract-first package that survives cleanup/refactor transitions.

---

## 1. What An App Package Must Contain

Required artifacts:
1. App HTML payload file:
	- `project/client/apps/non-core/core/tab-<appId>.html`
2. Installer contract file:
	- `project/server/contracts/installer-<appId>.contract.example.json`
3. Install actions in contract:
	- non-core loader registration
	- window app registry registration
	- app category map registration
4. Uninstall actions in contract:
	- one remove action per installed entry, matched by the same `entryId`

---

## 2. Naming And ID Rules

Required naming rules:
1. `appId` is the single source id across all surfaces.
2. `appId` must match exactly in:
	- contract `appId`
	- non-core loader `tabId`
	- window app registry `tab`
	- category map key
3. Use lower-case id format only (examples: `helloworld`, `note-pad`).
4. Each action must have a stable `entryId` string.

Recommended `entryId` format:
1. `<appId>-loader-001`
2. `<appId>-window-001`
3. `<appId>-category-001`

---

## 3. Required Wrapper Format In Target Files

Installer-safe insertion regions use exact marker boundaries.

Empty safe slot shape:

```js
//Open Next json entry id

//Close "
```

Installed entry shape:

```js
//Open Next json entry id
//JsonEntryId: "<entryId>"
<payload line(s)>
//Close "
//Open Next json entry id

//Close "
```

Notes:
1. The installer matches only exact open + blank + close regions.
2. The installer writes `JsonEntryId` metadata for uninstall targeting.
3. The installer preserves a new empty slot after every insert.

---

## 4. App HTML Payload Requirements

Minimum payload requirements:
1. File lives under `project/client/apps/non-core/core/`.
2. Top-level tab container id must be `tab-<appId>`.
3. Avoid global side effects on repeated tab loads.
4. Keep script logic self-contained for optional app loading.

Scope note (important):
1. Installer baseline manages registration wiring and uninstall of installer-managed entries.
2. Installer can now manage payload file lifecycle through contract actions:
	- `create-file` (install)
	- `delete-file` (uninstall)
3. Installer still does not patch arbitrary HTML internals using marker boundaries; it manages payload files as whole-file create/delete units.
4. Package authors can provide payload content directly (`payload`) or via template source (`templatePath`) in the install contract.

Example skeleton:

```html
<div class="tab-content" id="tab-myapp">
  <section class="card">
	 <div class="card-hd"><h3>My App</h3></div>
	 <div>App content</div>
  </section>
</div>
<script>
(function () {
  if (window.__myAppInit) return;
  window.__myAppInit = true;
  // app code
})();
</script>
```

---

## 5. Contract Structure (Install + Uninstall)

Contract file path:
1. `project/server/contracts/installer-<appId>.contract.example.json`

Required top-level fields:
1. `contractVersion`
2. `appId`
3. `installActions`
4. `uninstallActions`
5. `anchors`
6. `markerBoundary`
7. `fingerprint`
8. `mismatchPolicy`
9. `transactionPolicy`
10. `loggingPolicy`

Supported action types:
1. `insert` and `remove` for marker-managed registration wiring.
2. `create-file` and `delete-file` for payload file lifecycle.

Policy requirements:
1. `markerBoundary.openMarker` is `//Open Next json entry id`
2. `markerBoundary.closeMarker` is `//Close "`
3. `markerBoundary.requireBlankLineBetween` is `true`
4. `transactionPolicy.onMissingMarkerBoundary` is `auto-rollback-error`
5. `transactionPolicy.mode` is `all-or-nothing`
6. `loggingPolicy.logEntryId` is `true`
7. `loggingPolicy.logWrittenBlock` is `true`
8. `loggingPolicy.logCloseMarker` is `true`
9. `loggingPolicy.logJsonEntryId` is `true`

Reference schema:
1. `project/server/contracts/installer-uninstaller-contract.schema.json`

Reference example:
1. `project/server/contracts/installer-hello-world.contract.example.json`

---

## 6. Icon, Nav, And Category Conventions

Required conventions:
1. Non-core loader registration includes:
	- `tabId`, `enabled`, `path`, `label`, `icon`, `navTarget`
2. Use `navTarget: '#navOptionalAppsHost'` for optional/non-core apps.
3. Window app registration includes:
	- `tab`, `label`, `icon`, `accent`, `w`, `h`
4. Category map key must be one of:
	- `core`, `browse`, `tools`, `mind`, `journal`, `appearance`, `system`

Icon conventions:
1. Non-core loader icon uses lightweight glyph (emoji or short symbol).
2. Window app icon uses inline SVG string for shell/taskbar consistency.

---

## 7. Install, Uninstall, Reinstall Commands

Run from `project/`.

Install app from contract:

```bash
node server/tools/installer-cli.js install --contract server/contracts/installer-<appId>.contract.example.json --root . --log server/contracts/installer-<appId>.install.log.json
```

Install supports payload-file creation actions:
1. `create-file` with `payload` (inline file content)
2. `create-file` with `templatePath` (copy from stable template source)

Uninstall app from contract:

```bash
node server/tools/installer-cli.js uninstall --contract server/contracts/installer-<appId>.contract.example.json --root . --log server/contracts/installer-<appId>.uninstall.log.json
```

Uninstall supports payload-file deletion actions:
1. `delete-file` for app payload removal during uninstall.

Dry-run mode:

```bash
node server/tools/installer-cli.js install --contract server/contracts/installer-<appId>.contract.example.json --root . --dry
node server/tools/installer-cli.js uninstall --contract server/contracts/installer-<appId>.contract.example.json --root . --dry
```

---

## 8. Required Validation Checklist

A package is not ready unless all checks pass.

Contract and marker checks:
1. Install dry-run returns `ok: true` and `rollback: false`.
2. Uninstall dry-run returns `ok: true` and `rollback: false`.
3. Installed blocks include `//JsonEntryId: "<entryId>"`.
4. Next empty slot remains after each inserted block.

Focused test checks:
1. `node --test tests/unit/installer-marker-engine.test.js`
2. `node --test tests/unit/installer-cli.test.js`
3. `node --test tests/unit/installer-vfs-phase-ab.test.js`

Full regression check:
1. `npm.cmd test`

Manual UI smoke checks:
1. App appears in launcher/nav as expected.
2. App window opens and closes correctly.
3. App content loads correctly from non-core HTML file.

---

## 9. Recommended Author Workflow

1. Create app HTML payload file.
2. Add or confirm safe marker slots in target registration files.
3. Create installer contract with install and uninstall actions.
4. Run install dry-run.
5. Run install apply.
6. Run uninstall dry-run.
7. Run uninstall apply.
8. Reinstall apply.
9. Run focused tests.
10. Run full test suite.
11. Perform manual UI smoke checks.

This workflow verifies forward and reverse paths before cleanup/refactor touches the same files.

---

## 10. Current Reference Implementation

Use Hello World as the working reference package:
1. Payload: `project/client/apps/non-core/core/tab-hello-world.html`
2. Contract: `project/server/contracts/installer-hello-world.contract.example.json`
3. Install log example: `project/server/contracts/installer-hello-world.reinstall.log.json`
4. Uninstall log example: `project/server/contracts/installer-hello-world.uninstall.log.json`

---

## 11. App Creator Engine Plan (Parallel Workstream)

This is the practical next step to reduce manual package authoring and support vibe-coded app creation.

Goal:
1. Generate a complete installer-ready app package from a short user prompt.

Phase outline:
1. Intake schema
	- collect `appId`, label, category, icon intent, window size defaults, and feature summary.
2. Payload scaffold generation
	- generate `tab-<appId>.html` with safe init pattern and minimal UI shell.
3. Contract generation
	- generate `installer-<appId>.contract.example.json` with install/uninstall actions and stable `entryId`s.
4. Dry-run validation
	- run install/uninstall dry-runs and surface exact errors.
5. One-click apply
	- run installer apply and optional immediate UI smoke checklist.

Required safeguards:
1. Reject invalid `appId` values early.
2. Enforce allowed category keys.
3. Enforce installer policy blocks (`markerBoundary`, `transactionPolicy`, `loggingPolicy`).
4. Preserve rollback-first behavior for all generated packages.

Suggested MVP outputs:
1. `project/client/apps/non-core/core/tab-<appId>.html`
2. `project/server/contracts/installer-<appId>.contract.example.json`
3. `project/server/contracts/installer-<appId>.install.log.json` (optional after apply)
4. `project/server/contracts/installer-<appId>.uninstall.log.json` (optional after apply)

