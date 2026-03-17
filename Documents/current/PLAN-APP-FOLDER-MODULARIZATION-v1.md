# PLAN: App Folder Modularization (Core + Optional)

**Status:** `Complete ✅`
**Version target:** `post-0.6.0 stabilization`
**Date created:** `2026-03-16`
**Last updated:** `2026-03-16`

---

## 1. Background / Why This Plan Exists

Phase 3 modularization is complete, but app file placement is still concentrated in `project/client/js`, which creates a new structural monolith that slows contributor onboarding and raises coupling risk. A pre-Phase-4 pilot (`P4-G0`) proved the pattern by moving `dream-gallery.js` into `project/client/js/apps/optional`. We now need a full, phased migration plan that applies this pattern to all app surfaces, preserving shell boot continuity and graceful degradation when optional modules are absent. Without this, modularization remains incomplete at the filesystem ownership level.

---

## 2. Objective

Complete a full app placement migration from the flat `project/client/js` app surface into explicit ownership folders `project/client/js/apps/core` and `project/client/js/apps/optional`, with guard-first slices, no shell regressions, and verifiable absent-module resilience for optional apps. Done means every app tab has a documented class (Core or Optional), script wiring is updated to target foldered paths, shell-core behavior remains stable, and tests prove that removing optional modules does not crash boot or primary navigation. Closure requires green unit/integration suites, updated WORKLOG/ledger records, and a final stop/resume snapshot pointing to Phase 4 gate review.

---

## 3. Audit Findings / Pre-Work Analysis

| Item | Current Location | Lines | Problem / Note | Target |
|------|------------------|-------|----------------|--------|
| App registry map (`WINDOW_APPS`) | `project/client/js/app.js` | ~40-120 | App identity is centralized, but file ownership is not reflected in path taxonomy | Keep registry in shell, map each tab to new module path ownership |
| Core system app scripts | `project/client/js/*.js` | mixed | Core app code mixed with optional app code in one directory | `project/client/js/apps/core/**` |
| Optional app scripts | `project/client/js/*.js` | mixed | Optional/removable modules share top-level path with shell-critical scripts | `project/client/js/apps/optional/**` |
| Script load order | `project/client/index.html` | ~2250-2290 | Flat script list hides ownership intent and increases accidental hard dependencies | Preserve order, migrate paths by slice |
| Optional pilot already moved | `project/client/js/apps/optional/dream-gallery.js` | existing | Confirms migration mechanics are valid | Use as baseline pattern for all remaining optional apps |

Initial app classification baseline (from P4-G0):
- Core: `chat`, `entity`, `creator`, `users`, `settings`, `advanced`, `activity`, `observability`, `debugcore`, `nekocore`
- Optional: `dreamgallery`, `lifediary`, `dreamdiary`, `themes`, `browser`, `documents`, `workspace`, `skills`, `visualizer`, `physical`

**Estimated total impact:** ~18-26 script-path changes, 8-14 files moved into `apps/core`, 9-14 files moved into `apps/optional`, 3-6 new/updated guard suites, plus full-suite validation after each phase.

---

## 4. Architecture Boundary Check

- [x] No frontend (`client/**`) receives backend orchestration, filesystem logic, or policy logic
- [x] No backend (`server/**`) receives DOM/UI rendering concerns
- [x] New routes added to `server/routes/**`, not inlined into `server/server.js`
- [x] New data schemas and validators go into `server/contracts/**`
- [x] No new business logic added to `server/server.js` (composition only)
- [x] All new modules target <= 300 lines where practical
- [x] Any file above 1200 lines that needs changes: extraction is required in the same slice

Markers used on slices: `[BOUNDARY_OK]`, `[JS_OFFLOAD]`, `[CONTRACT_ENFORCED]`

---

## 5. Phases

### Phase A1: Baseline Contracts And Guard Foundations

**Goal:** Lock migration safety with explicit classification contract and guard-first tests.
**Status:** `Complete ✅`
**Depends on:** `P4-G0 complete`

#### Slice Checklist

- [x] A1-0: Optional-app absent-path guard baseline — extended to diary.js, document-digest.js, browser-app.js (8 new tests)
- [x] A1-1: App inventory manifest file — `project/client/js/apps/app-manifest.json` (20 apps, 9 consistency guards)
- [x] A1-2: Script-order baseline assertions — `script-load-order-guards.test.js` (9 ordering guards)

### Phase B1: Core App Path Migration

**Goal:** Move shell-critical app modules into `apps/core` with no boot regression.
**Status:** `Complete ✅`
**Depends on:** `Phase A1 complete`

#### Slice Checklist

- [x] B1-0: Core migration guard expansion — `core-app-migration-guards.test.js` (34 tests) targeting new `js/apps/core/` paths; flat-path regression guards assert old paths absent from index.html
- [x] B1-1: Migrate Core Batch 1 (`chat`, `entity-ui`, `users-ui`)
- [x] B1-2: Migrate Core Batch 2 (`setup-ui`, `config-profiles`, `simple-provider`, `system-health`)
- [x] B1-3: Migrate Core Batch 3 (`telemetry-ui`, `debug-core-app`); `app-manifest.json` + 12 extraction guard test files updated for cascading path changes

### Phase C1: Optional App Path Migration

**Goal:** Move all optional modules into `apps/optional` while preserving graceful degradation.
**Status:** `Complete ✅`
**Depends on:** `Phase B1 complete`

#### Slice Checklist

- [x] C1-0: Optional migration guard expansion — `optional-app-migration-guards.test.js` (42 tests); vfs.js stay-flat asserted; pre-migration 37 expected failures confirmed as baseline
- [x] C1-1: Migrate Optional Batch 1 (`lifediary`, `dreamdiary`, confirm existing `dreamgallery`) — diary.js moved; degradation guard + manifest updated
- [x] C1-2: Migrate Optional Batch 2 (`themes`, `physical`, `visualizer`) — 4 typeof guards added to shell-core callers before moves; 3 files moved; 7 extraction guard files updated
- [x] C1-3: Migrate Optional Batch 3 (`browser`, `documents`, `skills`) — 3 files moved; `app-manifest.json` and 3 extraction guard files updated

Slice ledger entry (2026-03-16):
- Phase C1 completed — 7 optional modules migrated to `js/apps/optional/`; vfs.js stays flat (shell-critical); 4 typeof guards added; 42-test guard file added; 10 test files cascade-updated. Full suite: **842 pass, 0 fail**. `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

### Phase D1: Registry, Loader, And Documentation Stabilization

**Goal:** Ensure registry and loading behavior remain intentional and contributor-safe after moves.
**Status:** `Complete ✅`
**Depends on:** `Phase C1 complete`

#### Slice Checklist

- [x] D1-0: Registry-path consistency audit — `registry-path-audit-guards.test.js` (~20 tests): folder ownership, flat-path regression guards, manifest-to-html completeness, disk existence, no duplicate srcs, workspace vfs.js exception asserted
- [x] D1-1: Optional failure simulation runbook — `optional-failure-simulation.test.js` (14 tests): per-module typeof-guard evidence for all 8 optional modules and all shell-core callers, multi-line guard detection
- [x] D1-2: Contributor docs update — `Documents/current/APP-FOLDER-OWNERSHIP.md` created: folder map, Core/Optional criteria, new-app/migration guides, exception table, test file index

Slice ledger entry (2026-03-16):
- Phase D1 completed — 2 new guard test files added (34 total new tests), contributor ownership doc created. Full suite: **866 pass, 0 fail**. `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

### Phase E1: Exit Audit And Closure

**Goal:** Formally close full app-folder modularization plan.
**Status:** `Complete ✅`
**Depends on:** `Phase D1 complete`

#### Slice Checklist

- [x] E1-0: Full suite + targeted absent-module audits — **866 pass, 0 fail**; all 5 guard suites green: `registry-path-audit-guards`, `optional-failure-simulation`, `optional-app-migration-guards`, `core-app-migration-guards`, `app-manifest-guards`
- [x] E1-1: WORKLOG ledger and stop/resume update — Phase E1 block added; snapshot updated to Plan Complete / Phase 4 gate review
- [x] E1-2: Changelog update and Phase 4 handoff snapshot — `Documents/current/CHANGELOG.md` updated; plan status marked Complete

Slice ledger entry (2026-03-16):
- Phase E1 completed — Full suite green at 866 pass, 0 fail; all modularization guard suites passing; WORKLOG and changelog updated; plan formally closed. Next: Phase 4 feature gate review. `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

---

## 6. Slice Definitions

### A1-0 — Optional-App Absent-Path Guard Baseline

**Start criteria:** P4-G0 complete and green (`optional-app-degradation-guards.test.js` exists).

**Work:**
1. Extend absent-path guard assertions to cover at least 2 additional optional modules beyond dream gallery.
2. Assert shell-core does not hard-call optional entrypoints without `typeof` protection.
3. Add script-path assertions that reject legacy flat-path regressions for migrated optional modules.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Guard suite fails on intentional regression and passes on baseline.
- Tests affected: `project/tests/unit/optional-app-degradation-guards.test.js`
- Files changed: `project/tests/unit/optional-app-degradation-guards.test.js`

### A1-1 — App Inventory Manifest File

**Start criteria:** A1-0 complete.

**Work:**
1. Create machine-readable app manifest with fields: tab id, class, source path, dependencies, bootstrap criticality.
2. Add shell note linking registry tabs to manifest ownership classes.
3. Validate manifest entries against `WINDOW_APPS` and current scripts.

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Manifest exists and covers 100% of app tabs.
- Tests affected: New manifest-consistency guard test
- Files changed: `project/client/js/apps/app-manifest.json` (or equivalent), `project/tests/unit/*manifest*`

### A1-2 — Script-Order Baseline Assertions

**Start criteria:** A1-1 complete.

**Work:**
1. Add test coverage asserting required load order relationships for core modules.
2. Add path assertions for modules already migrated into `apps/**` directories.
3. Ensure index load list remains deterministic.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Script-order guard detects out-of-order regressions.
- Tests affected: Existing extraction guards + new script-order assertions
- Files changed: `project/tests/unit/*-guards.test.js`

### B1-0 — Core Migration Guard Expansion

**Start criteria:** Phase A1 complete.

**Work:**
1. Add/extend tests that pin ownership for each Core batch before move.
2. Verify no Core app is treated as optional in guard logic.
3. Confirm boot-critical tab activation still resolves all required functions.

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Core pre-move guard baseline is green.
- Tests affected: Core ownership guard suites
- Files changed: `project/tests/unit/*core*guards*.test.js`

### B1-1 — Migrate Core Batch 1

**Start criteria:** B1-0 complete.

**Work:**
1. Move batch modules into `project/client/js/apps/core`.
2. Update `project/client/index.html` script paths only (preserve order).
3. Run targeted + full tests.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Batch 1 runs without boot or tab activation regressions.
- Tests affected: Core guard suites, phase audit suites
- Files changed: `project/client/index.html`, moved files under `project/client/js/apps/core/**`

### B1-2 — Migrate Core Batch 2

**Start criteria:** B1-1 complete and green.

**Work:**
1. Move second core batch into `apps/core`.
2. Update paths and preserve startup ordering.
3. Re-run targeted + full tests.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Batch 2 migration stable with no missing symbol runtime errors.
- Tests affected: Core guards + startup tests
- Files changed: `project/client/index.html`, `project/client/js/apps/core/**`

### B1-3 — Migrate Core Batch 3

**Start criteria:** B1-2 complete and green.

**Work:**
1. Move final core batch (`observability`, `debugcore`, `nekocore`) into `apps/core`.
2. Validate control-panel routes and panel hooks still initialize.
3. Run full suite.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** All Core apps live under `apps/core` and remain fully functional.
- Tests affected: Core guards + nekocore route/panel tests
- Files changed: `project/client/index.html`, `project/client/js/apps/core/**`

### C1-0 — Optional Migration Guard Expansion

**Start criteria:** Phase B1 complete.

**Work:**
1. Add app-specific optional absence checks for each optional batch.
2. Ensure optional tab absence paths do not break shell-core tabs.
3. Add assertions for no direct hard-calls from core shell to optional entrypoints.

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Optional migration can proceed with guard-backed safety.
- Tests affected: `project/tests/unit/optional-app-degradation-guards.test.js` and related suites
- Files changed: guard test files only

### C1-1 — Migrate Optional Batch 1

**Start criteria:** C1-0 complete.

**Work:**
1. Move `lifediary` and `dreamdiary` module files into `apps/optional`.
2. Confirm previously migrated `dreamgallery` path remains valid.
3. Update script paths and run tests.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Journal optional apps fully foldered and stable.
- Tests affected: Optional guards + diary/dream regressions
- Files changed: `project/client/index.html`, `project/client/js/apps/optional/**`

### C1-2 — Migrate Optional Batch 2

**Start criteria:** C1-1 complete.

**Work:**
1. Move `themes`, `physical`, and `visualizer` optional app surfaces to `apps/optional` where classified optional by manifest.
2. Preserve required dependencies and order across shared helpers.
3. Run targeted and full tests.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Optional batch 2 migrated with no boot regressions.
- Tests affected: Optional guards + visualizer/physical/theme suites
- Files changed: `project/client/index.html`, `project/client/js/apps/optional/**`

### C1-3 — Migrate Optional Batch 3

**Start criteria:** C1-2 complete.

**Work:**
1. Move `browser`, `documents`, `workspace`, `skills` optional modules to `apps/optional` as classified.
2. Verify fallback/absence behavior for each moved module.
3. Run full suite.

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** All Optional apps foldered under `apps/optional`.
- Tests affected: Optional guards + feature-specific suites
- Files changed: `project/client/index.html`, `project/client/js/apps/optional/**`

### D1-0 — Registry-Path Consistency Audit

**Start criteria:** Phase C1 complete.

**Work:**
1. Audit `WINDOW_APPS` against manifest and migrated paths.
2. Confirm each tab resolves to a module in `apps/core` or `apps/optional`.
3. Capture inconsistencies and fix path drift.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Registry and filesystem ownership map are aligned.
- Tests affected: registry/manifest consistency guards
- Files changed: `project/client/js/app.js`, manifest, related tests

### D1-1 — Optional Failure Simulation Runbook

**Start criteria:** D1-0 complete.

**Work:**
1. Execute controlled optional-module removal simulations.
2. Verify shell boot, chat tab, entity tab, and settings remain operational.
3. Document pass/fail per optional module class.

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Graceful degradation validated with evidence.
- Tests affected: optional degradation guards + phase exit audits
- Files changed: test/docs only

### D1-2 — Contributor Docs Update

**Start criteria:** D1-1 complete.

**Work:**
1. Document app placement rules: Core vs Optional criteria and migration checklist.
2. Add contributor guidance for adding new apps into correct folders.
3. Link docs from plan/worklog notes.

**Boundary markers:** `[CONTRACT_ENFORCED]`

**End criteria:** New contributors can place/migrate apps without guessing.
- Tests affected: n/a
- Files changed: docs under `Documents/current/` and/or root docs as approved

### E1-0 — Full Suite + Absent-Module Exit Audit

**Start criteria:** Phase D1 complete.

**Work:**
1. Run full unit/integration suite.
2. Re-run optional absence validation checklist.
3. Confirm no core boot failures.

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Green test evidence for closure.
- Tests affected: all suites
- Files changed: none required

### E1-1 — WORKLOG Closure Update

**Start criteria:** E1-0 complete and green.

**Work:**
1. Update WORKLOG checklist and ledger for this plan.
2. Update stop/resume snapshot to completed state.
3. Confirm next action points to Phase 4 gate review.

**Boundary markers:** `[CONTRACT_ENFORCED]`

**End criteria:** Governance ledger reflects full completion.
- Tests affected: n/a
- Files changed: `WORKLOG.md`

### E1-2 — Changelog + Handoff Snapshot

**Start criteria:** E1-1 complete.

**Work:**
1. Add summary of all app-folder migrations and validation results.
2. Mark plan done in completion ledger and snapshot.
3. Prepare handoff notes for first Phase 4 feature plan.

**Boundary markers:** `[CONTRACT_ENFORCED]`

**End criteria:** Plan is formally closed and handoff-ready.
- Tests affected: n/a
- Files changed: `Documents/current/CHANGELOG.md`, this plan file

---

## 7. Test Plan

| Test File | Slice | What It Verifies |
|-----------|-------|------------------|
| `project/tests/unit/optional-app-degradation-guards.test.js` | `A1-0`, `C1-0..C1-3` | Optional app path wiring and absent-module resilience |
| `project/tests/unit/phase3-exit-audit.test.js` | `B1-*`, `E1-0` | Shell-core load order and cross-module safety assumptions remain valid |
| `project/tests/unit/*-extraction-guards.test.js` | `A1-2`, `B1-*`, `C1-*` | Script order and ownership boundaries survive path migration |
| `project/tests/unit/app-manifest-consistency-guards.test.js` (new) | `A1-1`, `D1-0` | Manifest-to-registry classification consistency |
| `project/tests/integration/*` (existing full suite) | `E1-0` | End-to-end no-regression confidence |

**Test-first rule:** each migration batch begins with guard additions/updates before file moves.

---

## 8. Risk Notes

1. **Script-order breakage risk** — path migrations can produce runtime undefined errors. Mitigation: A1-2 script-order guards and per-batch targeted runs.
2. **Incorrect Core/Optional classification** — wrong class can hide critical dependencies. Mitigation: A1-1 manifest + D1-0 consistency audit.
3. **Silent optional hard dependency** — shell may indirectly rely on optional symbols. Mitigation: C1-0 guard expansion and D1-1 absence simulations.
4. **Large-batch migration blast radius** — moving too many files at once increases rollback complexity. Mitigation: phased batch slices with full-suite checkpoints.
5. **Doc drift during rollout** — ownership conventions may diverge from implementation. Mitigation: D1-2 docs update tied to closure gate.

---

## 9. Completion Ledger

| Date | Slice | Outcome | Notes |
|------|-------|---------|-------|
| 2026-03-16 | PLAN-AFM | Planned | Full template-based app folder modularization plan created for Core + Optional migration rollout |
| 2026-03-16 | A1-0 | Complete ✅ | 8 new optional-module guards: diary.js (lifediary+dreamdiary), document-digest.js, browser-app.js |
| 2026-03-16 | A1-1 | Complete ✅ | app-manifest.json created (20 apps, 10 core, 10 optional) + 9-test consistency guard suite |
| 2026-03-16 | A1-2 | Complete ✅ | script-load-order-guards.test.js (9 tests) locking critical boot ordering. Suite: 756 pass, 0 fail |
| 2026-03-16 | B1-0 | Complete ✅ | core-app-migration-guards.test.js (34 tests) — paths, entrypoints, flat-path regression guards |
| 2026-03-16 | B1-1 | Complete ✅ | chat, entity-ui, users-ui moved to js/apps/core/; index.html updated |
| 2026-03-16 | B1-2 | Complete ✅ | setup-ui, config-profiles, simple-provider, system-health moved to js/apps/core/; index.html updated |
| 2026-03-16 | B1-3 | Complete ✅ | telemetry-ui, debug-core-app moved; app-manifest.json + 12 guard test files updated. Suite: 800 pass, 0 fail |
| 2026-03-16 | C1-0 | Complete ✅ | optional-app-migration-guards.test.js (42 tests); vfs.js stay-flat guard; 37 expected failures baseline |
| 2026-03-16 | C1-1 | Complete ✅ | diary.js moved to apps/optional/; degradation guards + manifest updated |
| 2026-03-16 | C1-2 | Complete ✅ | 4 typeof guards patched in shell-core; theme-manager, physical-ui, visualizer-ui moved; 7 test files updated |
| 2026-03-16 | C1-3 | Complete ✅ | browser-app, document-digest, skills-ui moved; app-manifest.json + 3 test files updated. Suite: 842 pass, 0 fail |
| 2026-03-16 | D1-0 | Complete ✅ | registry-path-audit-guards.test.js (~20 tests): folder ownership, flat-path regression, manifest-to-html coverage |
| 2026-03-16 | D1-1 | Complete ✅ | optional-failure-simulation.test.js (14 tests): per-module typeof-guard evidence for all 8 optional modules |
| 2026-03-16 | D1-2 | Complete ✅ | APP-FOLDER-OWNERSHIP.md contributor guide created. Suite: 866 pass, 0 fail |
| 2026-03-16 | E1-0 | Complete ✅ | Full suite exit audit: 866 pass, 0 fail. All 5 guard suites green. |
| 2026-03-16 | E1-1 | Complete ✅ | WORKLOG Phase E1 ledger + stop/resume snapshot updated to Plan Complete |
| 2026-03-16 | E1-2 | Complete ✅ | CHANGELOG.md updated; plan status set to Complete. Handoff to Phase 4 gate review. |

---

## 10. Stop / Resume Snapshot

- **Current phase:** `PLAN COMPLETE`
- **Current slice:** `—`
- **Last completed slice:** `E1-2 — Changelog + handoff snapshot`
- **In-progress item:** `none`
- **Blocking issue (if blocked):** `none`
- **Next action on resume:** `Phase 4 gate review — confirm all Phases 1–3 and modularization prerequisites are signed off, then open first Phase 4 feature plan`
