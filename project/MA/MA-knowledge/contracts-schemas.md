# REM System — Contracts and Schemas

Reference doc for MA when building or extending contracts and data validation.

---

## Why Contracts

REM is a multi-LLM pipeline with many modules writing to disk. Without explicit contracts:
- Refactors in one module silently break another's expectations
- LLM outputs with unexpected shapes propagate pipeline failures
- Memory records in one format can't be read after schema changes

Contracts enforce shapes at boundaries. Internal refactors are safe as long as boundary shapes are preserved.

---

## Memory Schema (v1)

Canonical module: `server/contracts/memory-schema.js`

Required fields:
- `memorySchemaVersion` — always 1
- `memory_id` — unique identifier
- `type` — episodic | semantic | ltm | core
- `created` — ISO timestamp
- `last_accessed` — ISO timestamp
- `access_count` — integer
- `access_events` — array of access timestamps
- `decay` — float 0.0–1.0 (1.0 = fully fresh)
- `importance` — float 0.0–1.0
- `topics` — string array
- `emotionalTag` — string

Route payloads may carry extra fields, but persisted metadata normalizes to this schema.

---

## Contributor Output Contracts

Each pipeline phase (1A, 1D, 1C, Final) has an expected output shape. The orchestrator validates before passing results downstream.

---

## Worker Output Contract

Workers bound to contributor aspects must return the same shape as the phase they override. No additional fields allowed at the boundary.

---

## Installer App Package Contract

Required package shape for non-core app installability:

1. App payload HTML: `client/apps/non-core/core/tab-<appId>.html`
2. Installer contract JSON: `server/contracts/installer-<appId>.contract.example.json`
3. Install actions for all registration points (non-core loader, window app registry, category map)
4. Uninstall actions mirroring each install action by `entryId` with `expectedFingerprint`

### Install Action Fields
- `type`: insert | create-file
- `filePath`, `entryId` (stable string for uninstall targeting)
- For insert: `anchorId` + `payload`
- For create-file: `payload` or `templatePath`

### Uninstall Action Fields
- `type`: remove | delete-file
- `filePath`, `entryId`
- For remove: `expectedFingerprint` required

### Transactional Guarantees
- Marker matching exact before insertion
- Missing boundary anywhere → `auto-rollback-error`
- All-or-nothing (no partial writes)

### ID Conventions
- `appId` matches all surfaces: tab id, contract appId, install action payload
- Lowercase kebab or lowercase alnum only
- Icons: short display token for nav, inline SVG for shell/taskbar
- Labels: human-readable title case, stable across reruns

---

## CSS Class Contract

Single namespace: `sys-inline-XXXX`. Numbers frozen, gaps intentional.
- Search existing classes before creating new
- New classes append at END only
- Never renumber, compact, or create alternate namespaces
- Never extract `display:none` or JS-controlled styles to classes

---

## HTML Structure Contract

Tab content lives in files, never in index.html. Shell chrome only in index.html.
- Core tabs: `apps/core/tab-*.html`
- Non-core tabs: `apps/non-core/core/tab-*.html`
- No `<link>` or `<style>` tags inside tab HTML files

---

## Best Practices

1. Define contracts at module boundaries — not inside modules
2. Validate early, fail fast — don't let bad shapes propagate
3. Memory schema is versioned — always check `memorySchemaVersion`
4. Transaction semantics for multi-file writes — all-or-nothing
5. Installer markers are parsed by code — never reformat them
6. Document contract changes explicitly — silent migration breaks trust
