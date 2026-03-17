# PLAN: Phase 3 Modularization Completion

**Status:** `In Progress`
**Version target:** `post-0.6.0 stabilization`
**Date created:** `2026-03-16`
**Last updated:** `2026-03-16`

---

## 1. Background / Why This Plan Exists

Phase 3 is the active mandate in WORKLOG.md, and slices P3-S1 through P3-S7 are already complete. However, there is no dedicated phase plan document that defines the remaining slices and the exact closure gate for Phase 3. Without this, extraction work can drift and the team lacks a clear stopping point. This plan formalizes the remaining sequence so Phase 3 can be completed and signed off with evidence.

Requested by: `NekoCore OS`

## 2. Objective

Complete the remaining modular extraction work from `project/client/js/app.js` into app-local modules while preserving current behavior and script load order. Done means: remaining ownership clusters are extracted, each slice is covered by extraction guards, full unit and integration suites pass after each slice, and a final Phase 3 exit audit confirms graceful degradation (shell boot continues when non-core modules are missing). After closure, WORKLOG.md must show Phase 3 complete and ready for Phase 4 gate review.

## 3. Audit Findings / Pre-Work Analysis

| Item | Current Location | Lines | Problem / Note | Target |
|------|------------------|-------|----------------|--------|
| Config/profile + model recommendation ownership | `project/client/js/app.js` | ~220-260 | Profile/config flow still monolithic and mixed with unrelated UI logic | `project/client/js/config-profiles.js` |
| Simplified provider setup UI | `project/client/js/app.js` | ~180-220 | Distinct UX flow still embedded in app.js | `project/client/js/simple-provider.js` |
| Theme persistence and gallery | `project/client/js/app.js` | ~120-150 | Theme ownership still in shell monolith | `project/client/js/theme-manager.js` |
| Runtime telemetry and task-manager metrics | `project/client/js/app.js` | ~220-280 | Telemetry rendering and global hooks mixed into app.js | `project/client/js/telemetry-ui.js` |
| Chat ownership residue | `project/client/js/app.js`, `project/client/js/chat.js` | ~600-800 (estimate) | Ownership split risk between app.js and chat.js | `project/client/js/chat.js` (+ optional helper module) |
| Entity browser/checkout/release UI | `project/client/js/app.js` | ~320-380 | High-coupling flow still owned by app.js | `project/client/js/entity-ui.js` |
| System health and maintenance handlers | `project/client/js/app.js` | ~180-220 | Admin-only utilities still in app.js | `project/client/js/system-health.js` |

**Estimated total impact:** ~1,900-2,300 lines moved out of app.js; ~7 new extraction guard files; script-order updates in index.html; full-suite validation per slice.

## 4. Architecture Boundary Check

- [x] No frontend (`client/**`) receives backend orchestration, filesystem logic, or policy logic
- [x] No backend (`server/**`) receives DOM/UI rendering concerns
- [x] New routes added to `server/routes/**`, not inlined into `server/server.js`
- [x] New data schemas and validators go into `server/contracts/**`
- [x] No new business logic added to `server/server.js` (composition only)
- [x] All new modules target <= 300 lines where practical
- [x] Any file above 1200 lines that needs changes: extraction is required in the same slice

Markers used on slices: `[BOUNDARY_OK]`, `[JS_OFFLOAD]`, `[CONTRACT_ENFORCED]`

## 5. Phases

### Phase A: Remaining Low/Medium-Risk Extractions

**Goal:** Remove remaining config, provider, theme, and telemetry ownership from app.js with low behavior risk.
**Status:** `In Progress`
**Depends on:** `P3-S7 complete`

#### Slice Checklist

- [x] P3-S8: config profiles extraction - move profile/config/recommendation ownership to `config-profiles.js`
- [x] P3-S9: simple provider extraction - isolate simplified provider flow to `simple-provider.js`
- [x] P3-S10: theme manager extraction - move theme ownership to `theme-manager.js`
- [x] P3-S11: telemetry extraction - move task manager telemetry to `telemetry-ui.js`

### Phase B: High-Coupling Core UX Extractions

**Goal:** Complete chat and entity modularization safely.
**Status:** `Planned`
**Depends on:** `Phase A complete`

#### Slice Checklist

- [x] P3-S12: chat ownership audit guard slice - lock behavior and define exact move list
- [x] P3-S13: chat extraction completion - move residual chat ownership from app.js
- [x] P3-S14: entity UI extraction - move entity browser/checkout/release ownership to `entity-ui.js`

### Phase C: Stabilization and Phase Closure

**Goal:** Finish remaining utility extraction and formally close Phase 3.
**Status:** `Planned`
**Depends on:** `Phase B complete`

#### Slice Checklist

- [x] P3-S15: system health extraction - move maintenance handlers to `system-health.js`
- [x] P3-S16: shell-core minimization and exit audit - validate graceful degradation and close Phase 3

## 6. Slice Definitions

### P3-S8 - Config Profiles Extraction

**Start criteria:** P3-S7 complete and green; setup-ui wiring stable.

**Work:**
1. Move profile persistence, profile chips, recommended model stacks/copy, and inheritance helpers from app.js to `config-profiles.js`.
2. Update script order in `project/client/index.html` so `config-profiles.js` loads before dependent modules.
3. Add extraction guards and run targeted then full test suites.

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** config/profile ownership removed from app.js with no behavior regression.
- Tests affected: `project/tests/unit/config-profiles-extraction-guards.test.js`
- Files changed: `project/client/js/app.js`, `project/client/js/config-profiles.js`, `project/client/index.html`

### P3-S9 - Simple Provider Extraction

**Start criteria:** P3-S8 complete and constants/helpers available.

**Work:**
1. Move simplified provider panel functions to `simple-provider.js`.
2. Keep status messaging and save behavior unchanged.
3. Add guard tests and script-order checks.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** simple provider ownership removed from app.js.
- Tests affected: `project/tests/unit/simple-provider-extraction-guards.test.js`
- Files changed: `project/client/js/app.js`, `project/client/js/simple-provider.js`, `project/client/index.html`

### P3-S10 - Theme Manager Extraction

**Start criteria:** P3-S8 complete.

**Work:**
1. Move theme constants and theme helpers to `theme-manager.js`.
2. Preserve localStorage persistence and system-theme listener behavior.
3. Add guards and verify theme switching works in shell.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** theme ownership isolated and app.js no longer owns theme flow.
- Tests affected: `project/tests/unit/theme-manager-extraction-guards.test.js`
- Files changed: `project/client/js/app.js`, `project/client/js/theme-manager.js`, `project/client/index.html`

### P3-S11 - Telemetry Extraction

**Start criteria:** P3-S10 complete.

**Work:**
1. Move runtime telemetry and task-manager metrics rendering to `telemetry-ui.js`.
2. Preserve `window.reportPipelinePhase` and `window.reportOrchestrationMetrics` exports.
3. Add extraction guards and verify task manager metrics still render.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** telemetry ownership removed from app.js and global report hooks preserved.
- Tests affected: `project/tests/unit/telemetry-extraction-guards.test.js`
- Files changed: `project/client/js/app.js`, `project/client/js/telemetry-ui.js`, `project/client/index.html`

### P3-S12 - Chat Ownership Audit Guard Slice

**Start criteria:** Phase A complete and green.

**Work:**
1. Audit ownership split between app.js and chat.js and write explicit move inventory.
2. Add guard tests to lock current behavior before extraction.
3. Confirm final P3-S13 move list and script-order requirements.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** chat extraction scope is explicit and guard-protected.
- Tests affected: `project/tests/unit/chat-extraction-guards.test.js`
- Files changed: `project/tests/unit/chat-extraction-guards.test.js`, `project/client/js/app.js`, `project/client/js/chat.js`

### P3-S13 - Chat Extraction Completion

**Start criteria:** P3-S12 guard baseline green.

**Work:**
1. Move residual chat send/render/archive/streaming ownership from app.js into chat module boundary.
2. Preserve existing chat state and stream behavior.
3. Update guards and run full test suite.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** app.js no longer owns chat core behavior.
- Tests affected: `project/tests/unit/chat-extraction-guards.test.js` and existing chat regressions
- Files changed: `project/client/js/app.js`, `project/client/js/chat.js`, `project/client/index.html`

### P3-S14 - Entity UI Extraction

**Start criteria:** P3-S13 complete and stable chat helper ownership.

**Work:**
1. Move entity browser/preview/checkout/release/delete UI flows to `entity-ui.js`.
2. Preserve entity state sync and chat reset handoff behavior.
3. Add extraction guards and run full suite.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** entity UI ownership removed from app.js with no regression.
- Tests affected: `project/tests/unit/entity-ui-extraction-guards.test.js` and existing entity regression tests
- Files changed: `project/client/js/app.js`, `project/client/js/entity-ui.js`, `project/client/index.html`

### P3-S15 - System Health Extraction

**Start criteria:** P3-S14 complete.

**Work:**
1. Move maintenance handlers (repair/stats/trace/backup/restore) to `system-health.js`.
2. Preserve current prompts and status feedback surfaces.
3. Add extraction guards and run full suite.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** maintenance handlers removed from app.js and behavior unchanged.
- Tests affected: `project/tests/unit/system-health-extraction-guards.test.js`
- Files changed: `project/client/js/app.js`, `project/client/js/system-health.js`, `project/client/index.html`

### P3-S16 - Shell-Core Minimization and Exit Audit

**Start criteria:** P3-S15 complete and all extraction guard suites green.

**Work:**
1. Reduce app.js to shell-core globals and minimal glue only.
2. Perform graceful degradation audit by disabling one non-core module at a time and validating shell boot continuity.
3. Update WORKLOG ledger and Stop/Resume snapshot to mark Phase 3 complete.

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Phase 3 principles validated and closure documented.
- Tests affected: extraction guard aggregate plus full unit/integration suite
- Files changed: `project/client/js/app.js`, `WORKLOG.md`, `Documents/current/CHANGELOG.md`

## 7. Test Plan

| Test File | Slice | What It Verifies |
|-----------|-------|------------------|
| `project/tests/unit/config-profiles-extraction-guards.test.js` | `P3-S8` | Config/profile ownership removed from app.js and script order is valid |
| `project/tests/unit/simple-provider-extraction-guards.test.js` | `P3-S9` | Simplified provider ownership moved and wiring is valid |
| `project/tests/unit/theme-manager-extraction-guards.test.js` | `P3-S10` | Theme ownership moved and theme module loads correctly |
| `project/tests/unit/telemetry-extraction-guards.test.js` | `P3-S11` | Telemetry ownership moved and global report hooks preserved |
| `project/tests/unit/chat-extraction-guards.test.js` | `P3-S12/P3-S13` | Chat ownership map is locked and moved safely |
| `project/tests/unit/entity-ui-extraction-guards.test.js` | `P3-S14` | Entity UI ownership moved and entry points preserved |
| `project/tests/unit/system-health-extraction-guards.test.js` | `P3-S15` | Maintenance handlers moved from app.js |

**Test-first rule:** each slice begins with guard test creation/update before extraction edits.

## 8. Risk Notes

1. **Chat ownership drift** - mixed app.js/chat.js ownership can lose behavior. Mitigation: P3-S12 guard-first inventory.
2. **Script load-order regressions** - wrong index.html order can cause runtime undefined errors. Mitigation: script-order assertions in every extraction guard.
3. **Entity/chat coupling regressions** - entity switch flows call chat helpers and may break continuity. Mitigation: perform entity extraction only after chat extraction completion.
4. **Telemetry hook breakage** - global report hooks may disappear during extraction. Mitigation: explicit guard assertions for `window.reportPipelinePhase` and `window.reportOrchestrationMetrics`.
5. **False phase closure** - extraction complete but no degradation proof. Mitigation: dedicated P3-S16 exit audit with documented evidence.

## 9. Completion Ledger

| Date | Slice | Outcome | Notes |
|------|-------|---------|-------|
| 2026-03-16 | P3-PLAN | Done | Created dedicated Phase 3 plan document from template with explicit closure gate |
| 2026-03-16 | P3-S8 | Done | config-profiles.js: 23 functions + 4 consts extracted from app.js (lines 830–1413); 43 guard tests + 597 suite pass `[BOUNDARY_OK]` |
| 2026-03-16 | P3-P15 | Done | system-health.js: 6 functions (repairMemoryLogs, showMemoryStats, rebuildTraceGraph, runSystemBackup, runSystemRestore, formatBytes) extracted; 14 guard tests; 709 suite pass `[BOUNDARY_OK]` `[JS_OFFLOAD]` |
| 2026-03-16 | P3-S16 | Done | Shell-core minimization: app.js at 896 lines / 48 functions (all shell-core). Graceful degradation confirmed — all cross-module calls typeof-guarded. Exit audit guard test added (17 tests). Suite: 726 pass, 0 fail. **PHASE 3 COMPLETE.** `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]` |

## 10. Stop / Resume Snapshot

**As of 2026-03-16 — Phase 3 COMPLETE**
- Last completed slice: `P3-S16 — shell-core minimization and exit audit`
- Next action: `Phase 4 gate review`
- Suite: 726 pass, 0 fail

- **Current phase:** `Phase 3 - COMPLETE ✅`
- **Current slice:** `P3-S16 - complete`
- **Last completed slice:** `P3-S16`
- **In-progress item:** `none`
- **Blocking issue (if blocked):** `none`
- **Next action on resume:** `Phase 4 gate review`

## Phase 3 Stopping Point

Phase 3 is complete only when:
1. `P3-S8` through `P3-S16` are complete.
2. All related extraction guards and full unit/integration suites are green.
3. Graceful degradation is verified for non-core modules (shell boots with module absence/failure).
4. WORKLOG.md Stop/Resume snapshot and slice ledger explicitly mark `Phase 3 complete`.

## 11. Follow-on Cleanup Track (Pre-Phase 4): App Folder Modularity

**Status:** `In Progress`
**Depends on:** `Phase 3 complete`

### Objective

Establish a maintainable app folder taxonomy so modular apps can be classified as shell-critical Core or removable Optional, then validate the pattern by migrating one low-risk Optional pilot app.

### Decisions Locked

1. Scope placement: Pre-Phase-4 cleanup gate (do not reopen Phase 3 slices).
2. Core set policy: only shell-critical apps are Core.
3. Folder names: `project/client/js/apps/core` and `project/client/js/apps/optional`.
4. Migration depth: scaffold plus one pilot Optional app.

### Gate Checklist

- [x] P4-G0.1 Define Core vs Optional classification contract
- [x] P4-G0.2 Add scaffold folders for Core and Optional apps
- [x] P4-G0.3 Produce app inventory/classification manifest
- [x] P4-G0.4 Migrate one pilot Optional app (`dream-gallery.js`)
- [x] P4-G0.5 Add optional-app-absent degradation guards
- [x] P4-G0.6 Full suite green and Stop/Resume refresh (suite: 730 pass, 0 fail)

### Initial App Inventory / Classification Manifest

| App Tab | Initial Class | Notes |
|---------|---------------|-------|
| `chat` | Core | Primary shell conversation surface |
| `entity` | Core | Required for checkout/release ownership flow |
| `creator` | Core | Required for entity creation lifecycle |
| `users` | Core | Required account/user context management |
| `settings` | Core | Core configuration and provider setup |
| `advanced` | Core | System-level controls and maintenance launch points |
| `activity` | Core | Shell diagnostics surface |
| `observability` | Core | Runtime diagnostics/trace surface |
| `debugcore` | Core | Internal debug and timeline controls |
| `nekocore` | Core | System-entity control panel |
| `dreamgallery` | Optional (pilot) | Moved to `project/client/js/apps/optional/dream-gallery.js` |
| `lifediary` | Optional | Journal feature; no shell boot dependency |
| `dreamdiary` | Optional | Journal feature; no shell boot dependency |
| `themes` | Optional | Appearance-only app surface |
| `browser` | Optional | Tooling app not required for shell boot |
| `documents` | Optional | Tooling app not required for shell boot |
| `workspace` | Optional | Tooling app not required for shell boot |
| `skills` | Optional | Can be degraded independently from shell boot |
| `visualizer` | Optional | Analysis surface; independent of shell startup |
| `physical` | Optional | Supplementary mind/body view |

### Verification Targets

1. Shell boot continuity with optional app path changes.
2. No hard crash from missing optional app symbols in shell-core.
3. Full unit/integration suite green after pilot migration.

### Follow-on Completion Ledger

| Date | Slice | Outcome | Notes |
|------|-------|---------|-------|
| 2026-03-16 | P4-G0 | Done | Core/Optional app folder scaffold added, `dream-gallery.js` moved to Optional path, degradation guards added, full suite green (730 pass, 0 fail) `[BOUNDARY_OK]` `[JS_OFFLOAD]` |

### Follow-on Stop / Resume Snapshot

- Current track: `P4-G0 App Structure Cleanup` ✅ complete
- In-progress item: `none`
- Next action: `Phase 4 gate review`
