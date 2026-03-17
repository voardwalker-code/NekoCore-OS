# WORKLOG

Status: active architecture refactor tracking.
Last updated: 2026-03-16

Repository packaging note:
1. The runnable source tree now lives under `project/`.
2. Root remains documentation/governance-first (`README.md`, `WORKLOG.md`, `BUGS.md`, `CHANGELOG.md`, `.github/`).
3. Historical file paths below may use the pre-wrapper root-relative layout.

---

## ✅ PHASE 4 GATE — OPEN (2026-03-16)

Phases 1 (Bug Fixes), 2 (Refactor/Cleanup), and 3 (Modularization) are all confirmed complete.
App Folder Modularization plan is complete (866 pass, 0 fail).
Feature work is now authorized. Active mandate below is satisfied.

**Active Phase 4.5 plan:** `Documents/current/PLAN-IME-v1.md` — Intelligent Memory Expansion
**Active Phase 5 plan:** `Documents/current/PLAN-PREDICTIVE-MEMORY-v1.md` — Predictive Memory Topology (blocked on Phase 4.5 exit)

---

## ⚠️ PRIOR MANDATE — Bug Fix → Cleanup → Modularization (Precedence Order) ✅ SATISFIED

**Effective: 2026-03-15. Satisfied: 2026-03-16.**

No new features were to be started until the following three phases were complete.
The only exception was a newly discovered bug of critical severity (data loss, security, or total system failure).

Emergency exception log:
1. 2026-03-15: Reserved system-identity namespace protection added for entity creation (blocked names: NekoCore, Neko, Echo, AgentEcho). Classified as security/QoL hardening tied to active entity-state bugfix stream. Formal plan: `Documents/current/PLAN-NEKOCORE-SYSTEM-ENTITY-v1.md`
2. 2026-03-15: NekoCore memory-healing follow-up approved under the critical bug exception because stale memory-index entries were causing retrieval misses and direct NekoCore chat was not consolidating multi-layer memory records.

### Phase Priority Order

```
1. BUG FIXES        — all bugs in BUGS.md resolved
2. REFACTOR/CLEANUP — code structure cleaned up post-bug-fix
3. MODULARIZATION   — all apps/features decoupled into independent modules
4. NEW FEATURES     — only after all three above are done
```

---

## Stop/Resume Snapshot — 2026-03-16 (Phase 4.5 IME — Ready to Start)

- **Current phase:** `Phase 4.5 — Intelligent Memory Expansion`
- **Current slice:** `I1-0 — not started`
- **Last completed work:** `App Folder Modularization PLAN COMPLETE (866 pass, 0 fail); Phase 4 gate opened`
- **In-progress item:** `none`
- **Blocking issue:** `none`
- **Next action on resume:** `Begin PLAN-IME-v1.md I1-0: create server/brain/utils/rake.js, replace extractSubconsciousTopics() tokenizer in memory-retrieval.js, add guard tests`
- **Phase 5 plan:** `PLAN-PREDICTIVE-MEMORY-v1.md — blocked on Phase 4.5 exit audit`

---

## Session Ledger — 2026-03-16 (Phase 4 Gate Review)

Status: `Complete`

- Phase 4 gate opened — all of Phases 1, 2, 3 confirmed complete
- `PLAN-IME-v1.md` created — Intelligent Memory Expansion (Phase 4.5): BM25 + RAKE + TextRank + three-tier archive + `search_archive` tool. 4 phases (I1–I4), 11 slices, ~970 lines pure JS, zero new dependencies
- `PLAN-PREDICTIVE-MEMORY-v1.md` created — Predictive Memory Topology (Phase 5): brain loop node prediction, dual-path signal, reconsolidation pass, emotional delta. 4 phases (P1–P4), 10 slices. Blocked on Phase 4.5 exit.

---

## Session Ledger — 2026-03-15 (Phase Plan: Bug Fixes, Refactor, and Modularization)

Status: `Planned`

Purpose:
1. Fix all known bugs logged in BUGS.md before any new feature work begins.
2. Refactor and clean up the codebase — it has grown cluttered across several sprint sessions.
3. Modularize all independent app features so they can be removed, replaced, or contributed to by other developers without breaking the core system.
4. Establish a clean, contributor-friendly architecture baseline for NekoCore OS going forward.
5. Scoped exception track: NekoCore system entity bootstrap and dedicated control app shell. See `Documents/current/PLAN-NEKOCORE-SYSTEM-ENTITY-v1.md` for full phase plan.

---

### Phase 1 — Bug Fixes (BUGS.md)

Work through BUGS.md in this order. Bug IDs marked with `[pair]` must be fixed together.

| Priority | ID | Description | Notes |
|----------|----|-------------|-------|
| 1 | ~~BUG-07 + BUG-08 `[pair]`~~ ✅ | Entity created as checked-out; release breaks entity | **Fixed** — removed checkout from creation endpoints; `syncParentAfterCreate` now calls `checkoutEntity` |
| 2 | ~~BUG-06~~ ✅ | Chat opens after entity creation with no entity loaded | **Fixed** — post-create handoff now opens Entity details/preview (manual checkout), not Chat |
| 3 | ~~BUG-11~~ ✅ | Sleep button flashes then returns to chat — REM cycle not running | **Fixed** — sleep now requires an active entity and falls back to pre-sleep compressed session when archive files are empty |
| 4 | ~~BUG-12~~ ✅ | Compress and Save — button mislabeled and neither action works | **Fixed** — button label corrected; fallback save path now uses a defined filename and robust null-safe session meta handling |
| 5 | ~~BUG-10~~ ✅ | Onboarding not presented as onboarding — user thinks it's normal chat | **Fixed** — removed chat-side onboarding flow; onboarding now belongs to Creator/setup and chat no longer captures onboarding answers |
| 6 | BUG-14 | Entity backstory too shallow — need slider, more memories, token estimate | High quality impact |
| 7 | ~~BUG-15 + BUG-17 `[pair]`~~ ✅ | Skills not invoked naturally; all skills default-enabled | **Fixed** — natural skill context enabled, per-entity approval gate added, and new entities now default to skills disabled |
| 8 | ~~BUG-16~~ ✅ | No entity workspace folder created on VFS desktop | **Fixed** — all entity creation routes now ensure `workspace/desktop/<Entity Name>/` exists on creation |
| 9 | ~~BUG-05~~ ✅ | Personality traits — no dropdown/autocomplete in entity creator | **Fixed** — trait fields now support suggestion dropdown/autocomplete and one-click auto-fill in Empty/Guided modes |
| 10 | ~~BUG-13~~ ✅ | Chat scroll flickers during message receipt | **Fixed** — chat auto-scroll now batches to animation frames and respects explicit user scroll intent to avoid stream-time flicker |
| 11 | ~~BUG-04~~ ✅ | OpenRouter default model wrong; Mercury 2 missing from list | **Fixed** — OpenRouter model fields no longer auto-prefill and model lists include updated options including Claude Sonnet 4.6 |
| 12 | ~~BUG-09~~ ✅ | Model routing recommendation — same model causes character drift | **Fixed** — surfaced explicit Main/Orchestrator split recommendation in setup/settings and updated fast preset to Mercury 2 + Claude Sonnet 4 |
| 13 | ~~BUG-02~~ ✅ | Account setup input text near-invisible | **Fixed** — setup wizard input contrast hardened with explicit text/background contrast styles |
| 14 | ~~BUG-01~~ ✅ | "REM System" branding remnants in account setup flow | **Fixed** — setup wizard naming updated to NekoCore OS |
| 15 | ~~BUG-03~~ ✅ | No OpenRouter sign-up link; BYOK not communicated | **Fixed** — added OpenRouter sign-up links and BYOK endpoint guidance in setup/settings panels |

---

### Scoped Exception — NekoCore System Entity

Full plan: `Documents/current/PLAN-NEKOCORE-SYSTEM-ENTITY-v1.md`

**Push gate:** No git push until all validation checklist items in plan section 10 pass.

Completion state:
- [x] A-0 — Reserved-name protection (blocked: NekoCore, Neko, Echo, AgentEcho)
- [x] A-1 — System entity bootstrap (`server/brain/nekocore/bootstrap.js`)
- [x] A-2 — Protection guards (delete/rename/visibility reject for system entity)
- [x] A-3 — Bootstrap + guard unit tests (13 + 11 tests; suite: 359 pass, 0 fail)
- [x] B-1 — Dream pipeline skip: `dreamDisabled` flag guard in `phase-dreams.js` + sleep route in `brain-routes.js`
- [x] B-2 — Memory policy flags: `operationalMemory: true` in entity.json; `decayMemories()` returns early for operational entities
- [x] B-3 — Orchestrator context wiring: `getEntitySummaries` option added to `Orchestrator`; entity summaries injected into `mergePrompt` when `isSystemEntity === true`; wired in `server.js`
- [x] B-4 — B-series guard tests (+5 tests; suite: 364 pass, 0 fail)
- [x] C-1 — Role knowledge seed (`role-knowledge.json` in NekoCore's memories dir; 4 roles with purpose/requirements/priorities)
- [x] C-2 — Model registry (`model-registry.json`; 10 known OpenRouter models with cost/speed/capability data)
- [x] C-3 — Performance recording hook (`server.js` records per-entity/role/model stats after every chat cycle)
- [x] C-4 — `selectModel()` algorithm (`model-intelligence.js`; capability floor for quality roles; perf multiplier 0.25–2.0)
- [x] C-5 — Bootstrap integration (seeds role-knowledge + registry on first provision; system-prompt.txt updated with real identity)
- [x] C-6 — Phase C tests (+11 tests; suite: 375 pass, 0 fail)
- [x] D-1 — NekoCore OS aspect slot: `nekocore` added to config-service.js aspects array + config-runtime.js mapAspectKey/resolveProfileAspectConfigs; auth.js all maps extended; "NekoCore OS" settings panel in client/index.html
- [x] D-2 — `POST /api/nekocore/model-recommend` in `server/routes/nekocore-routes.js`
- [x] D-3 — `POST /api/nekocore/model-apply` — approve + reject + 404 unknown-ID paths
- [x] D-4 — Audit log: `server/brain/nekocore/audit.js` (`appendAuditRecord` + `readAuditRecords`); `nekocore-audit.ndjson` gitignored
- [x] D-5 — Governance guard tests: `tests/integration/nekocore-governance.test.js` — 9 tests; suite: 384 pass, 0 fail
- [x] E-1 — `server/routes/nekocore-routes.js` + wired into `server/server.js` (merged into D-2/D-3)
- [x] E-2 — All four `/api/nekocore/*` endpoints live: status, pending, model-recommend, model-apply
- [x] E-3 — `client/nekocore.html` + `client/js/nekocore-app.js` — standalone iframe panel; status strip, pending recommendations list, Approve/Deny controls; event-delegation buttons (no inline onclick)
- [x] E-4 — `nekocore` added to `WINDOW_APPS` + `APP_CATEGORY_BY_TAB` in `app.js`; `#tab-nekocore` iframe added to `index.html`; lazy-load iframe `src` in `openWindow` hook
- [x] E-5 — NekoCore Panel CSS section (~55 lines) appended to `client/css/ui-v2.css`
- [x] E-6 — `tests/integration/nekocore-routes.test.js` — 9 smoke tests; suite: 393 pass, 0 fail
- [x] E-7 — NekoCore first-run/reset hardening: system entity reprovisioned by `reset-all.js`; runtime reset now preserves architecture doc memories (`nkdoc_*`) while clearing non-system memory; voice/personality controls added to NekoCore panel with preset buttons + editable custom guidance and dedicated reset endpoint. `[BOUNDARY_OK] [CONTRACT_ENFORCED]`
- [x] E-8 — NekoCore panel chat-first refinement: onboarding/voice/info controls moved behind a toggle for a minimal chat view; initial setup now opens NekoCore OS voice settings instead of Creator. `[BOUNDARY_OK]`
- [x] BUG-14 follow-up — Creator regression fix: backstory depth slider now appears in Random mode too, random hatch depth affects generated story/memory richness, and reopening Creator resets the embedded app back to creation mode instead of leaving it stuck on the previous success state. `[BOUNDARY_OK]`
- [x] BUG-15 + BUG-17 pair — skill invocation now works from natural requests with a user approval gate; all skills are forced disabled by default on newly created entities and per-entity approval mode is configurable from Skills settings. `[BOUNDARY_OK] [CONTRACT_ENFORCED]`
- [x] BUG-18 — NekoCore persistent memory: `storeConsciousObservation` and `getConsciousContext` now wired in `processNekoCoreChatMessage`; each chat turn written as a `decay:0` episodic memory to `entities/entity_nekocore/memories/episodic/`; `buildNekoKnowledgeContext` extended to scan NekoCore's own episodic memories and all other entities' episodic memories in the subconscious retrieval pass (read-only, no approval gate). `[BOUNDARY_OK]`

---

### Phase 2 — Refactor and Cleanup

Goal: Strip technical debt built up through sprint development. No new behavior — existing behavior only, expressed more cleanly.

Scope areas identified:
1. `client/js/app.js` — massive monolithic file; extract into logical modules (desktop, auth, boot, window manager, context menus, etc.).
2. `server/server.js` and routes — continue the A-Re series cleanup; ensure no business logic lives in route handlers.
3. CSS — `ui-v2.css`, `ui.css`, `ui-enhance.css` overlap significantly; consolidate and document layers.
4. Skills system — currently tangled with entity prompt construction; needs clean invocation interface.
5. VFS routes — review for edge cases exposed during testing.
6. Browser app — `browser-app.js` is standalone but still wired into app.js in places; sever remaining coupling.
7. Dead code sweep — remove any unreachable paths, commented-out blocks, and feature scaffolding that was never completed.

---

### Phase 3 — Modularization

Goal: Every app/feature that does not need to be in the core project must be independently loadable. If a module file is absent, the rest of the OS must boot and run without it.

Principles:
1. **No hard dependencies between apps.** Chat, Browser, Entity Creator, Sleep, Skills, Neural Visualizer, Dream Gallery, Diary — each must be able to fail or be absent without breaking boot or other apps.
2. **Feature registry pattern.** Apps register themselves into the shell; the shell does not hardcode which apps exist.
3. **Shared service boundary.** Only the following are allowed as shared/core: auth, VFS API, SSE bus, entity state, config.
4. **Contributor safety.** A new contributor should be able to add or modify a single app module without needing to understand the whole codebase.
5. **Graceful degradation.** If a module fails to load, the shell logs a warning and continues — it does not crash.

Modularization targets (order TBD during Phase 2 cleanup):
- Desktop shell (app.js) → split into `desktop.js`, `window-manager.js`, `boot.js`, `context-menu.js`
- Browser app → already mostly standalone; complete the decoupling
- Neural visualizer → already in `neural-viz.js`; verify zero hard deps on app.js
- Chat app → extract from app.js into `chat.js` module (already exists, verify completeness)
- Skills UI → `skills-ui.js` already separate; audit coupling
- Entity Creator → `create.js` already separate; audit coupling
- Sleep UI → extract sleep controls from app.js into `sleep.js`
- Dream Gallery, Diary → audit and confirm standalone

---

### Phase 4 — Feature Work

Feature work resumes only after Phases 1–3 are signed off.

Candidate features (not yet scheduled, not yet started):
- Enhanced onboarding experience (beyond BUG-10 fix)
- Entity relationship / social graph UI
- Multi-entity conversation mode
- Plugin/extension API for external contributors
- Mobile-responsive shell layout
- **Vector embedding retrieval (Phase 5+ candidate)** — Replace `topicIndex.json` keyword lookup with embedding-based nearest-neighbor search (Ollama `nomic-embed-text` + `sqlite-vec`). Eliminates the 2,000-memory quality wall. See `Documents/current/VISION-AND-ROADMAP.md` “Proposed Architecture Change” section for full design.

---

Next action:
1. Repo governance prerequisite — move to private-source/public-mirror git topology before further staging iteration, so `staging` and in-progress branches stop being publicly exposed.
2. After remote split is in place, begin Phase 2 — Refactor and Cleanup.

### P2-S5 — CSS Consolidation (2026-03-15)

Completed:
- Inlined `icons.css` (132 lines) and `ui-enhance.css` (1,063 lines) as labeled sections inside `ui-v2.css`; removed their `@import` lines from the top of `ui-v2.css`. `ui-v2.css` is now a single self-contained main stylesheet (7,687 lines).
- Inlined `visualizer-enhance.css` (39 lines) as a labeled section inside `visualizer.css`; removed its `@import` line. `visualizer.css` is now a single self-contained visualizer stylesheet (1,014 lines).
- Deleted dead/inlined files: `ui.css` (446 lines, zero references), `icons.css`, `ui-enhance.css`, `visualizer-enhance.css`.
- Updated branding header in `ui-v2.css`, `theme.css`, `visualizer.css` from "REM System v0.6.0" → "NekoCore OS".
- `theme.css` retained as a standalone file (required by visualizer.html which loads it directly via `<link>`).
- 447 tests pass, 0 fail.

- Critical bug fix completed (2026-03-16, post-reset) — `reset-all.js` double-log fixed: `ensureSystemEntity()` was being called directly in `reset-all.js` AND internally by `resetNekoCoreRuntime`, causing immediate "already present" log after "provisioning". Removed the redundant direct call and its stale `require('./server/brain/nekocore/bootstrap')` import. `[BOUNDARY_OK]`
- Critical bug fix completed (2026-03-16, post-reset) — Login card updated to NekoCore OS branding. Card background hardened to `#ffffff`, labels to `#111`, inputs to light-theme styles in HTML; `#loginOverlay .inp`, `#loginOverlay .inp:focus`, and `#loginOverlay .inp::placeholder` scoped CSS rules added with `!important` to override the `.inp` dark-theme `!important` defaults. Window title, header logo/title, and sidebar brand all updated from "REM System" to "NekoCore OS". `[BOUNDARY_OK]`
- Critical bug fix completed (2026-03-16, post-reset) — NekoCore architecture doc ingestion restored. `NK_DOCS_DIR` in `server.js` was resolving to `project/Documents/current` (one level too shallow — does not exist); fixed to `path.join(__dirname, '..', '..', 'Documents', 'current')`. Same off-by-one in `reset-runtime.js` default `docsDir` (3 `..` → 4 `..`). Ingestion on startup now correctly reads from `NekoCore-OS-main/Documents/current`. `[BOUNDARY_OK]`
- Feature-completeness fix completed (2026-03-16, post-reset) — `POST /api/nekocore/docs-ingest` added to `nekocore-routes.js` (accepts optional `docsDir` body param; validates absolute path; calls `ingestArchitectureDocs`; appends audit record). NekoCore OS panel now includes a "Knowledge Docs" section with a path input and "Ingest Docs" button wired to `App.docsIngest()` in `nekocore-app.js`, so users can trigger ingestion on demand without restarting the server. `[BOUNDARY_OK] [CONTRACT_ENFORCED]`
- BUG-21 logged (2026-03-16) — Visualizer memory panel gaps and NekoCore knowledge doc ingestion path bug tracked as a single compound entry covering all root causes and applied fixes. See BUGS.md BUG-21 for full detail.
- Phase 3 slice P3-S8 completed (2026-03-16) — `config-profiles.js`: 23 functions + 4 consts (loadSavedConfig, getMainConfigFromProfile, hydrateMainProviderInputs, persistConfig, gatherProfile, autoSaveConfig, refreshSavedConfig, saveCurrentProfile, loadProfile, deleteProfile, renderProfileChips, OPENROUTER_ROLE_MODELS, getOpenRouterRolePreset, RECOMMENDED_MODEL_STACKS, OLLAMA_RECOMMENDED_STACKS, RECOMMENDED_PANEL_COPY, refreshRecommendedPanelCopy, showRecommendedPresetProvider, showRecommendedSetupTab, applyRecommendedPresetInputs, applyRecommendedSetupTab, applySettingsOpenRouterSuggestions, initSettingsModelSuggestions) extracted from app.js lines 830–1413. `index.html` updated: `config-profiles.js` loads after `setup-ui.js`. 43 guard tests added; suite: 597 pass, 0 fail. `[BOUNDARY_OK] [CONTRACT_ENFORCED]`

- Phase 3 slice P3-S9 completed (2026-03-16) — `simple-provider.js`: 7 functions/vars (simpleActiveProvider, initSimpleProviderUI, simplePickProvider, simpleApplyPreset, simpleFetchOllamaModels, simpleSaveConfig, simpleShowStatus) extracted from app.js. `index.html` updated: `simple-provider.js` loads after `config-profiles.js`. `[BOUNDARY_OK]`

- Phase 3 slice P3-S10 completed (2026-03-16) — `theme-manager.js`: 2 consts + 1 var + 5 functions (THEME_STORAGE_KEY, SHELL_THEMES, systemThemeMediaQuery, getStoredThemeId, updateShellThemeSummary, syncThemeSelectorUI, renderThemeGallery, applyTheme) extracted from app.js. `index.html` updated: `theme-manager.js` loads after `simple-provider.js`. `[BOUNDARY_OK]`

- Phase 3 slice P3-S11 completed (2026-03-16) — `telemetry-ui.js`: `runtimeTelemetry` const + 14 functions (formatTelemetryModel, pushTelemetryEvent, normalizePercent, getFocusedWindowTab, getOrCreateAppStats, pushSeriesPoint, estimateHeapPercent, updateAppStatsSeries, sparklinePath, renderAppMetrics, reportPipelinePhase, reportOrchestrationMetrics, updateTaskManagerView) extracted from app.js. `window.reportPipelinePhase` and `window.reportOrchestrationMetrics` global hooks preserved in new module. `index.html` updated: `telemetry-ui.js` loads after `theme-manager.js`. 27 guard tests added; suite: 624 pass, 0 fail. `[BOUNDARY_OK]` `[JS_OFFLOAD]`
- Phase 3 slice P3-S13 completed (2026-03-16) — chat extraction completion: `loadSystemPrompt`, `flushPendingSystemPrompt`, `runStartupResumeRecap` moved from app.js into chat.js. `resetChatForEntitySwitch`, `saveMemoryToServer`, `saveSessionMetaToServer` confirmed to stay in app.js (bridge + shared utilities). chat-extraction-guards.test.js updated: 3 stale P3-S12 negative assertions removed, 3 P3-S13 dual-side owned/not-owned assertions added. Suite: 665 pass, 0 fail. `[BOUNDARY_OK]` `[JS_OFFLOAD]`

- Phase 3 slice P3-S14 completed (2026-07-15) — entity UI extraction: `deriveEntityAvatar`, `setEntityDisplay`, `buildEntityChip`, `renderEntityBrowser`, `ensureEntityWindowContent`, `refreshSidebarEntities`, `sidebarSelectEntity`, `checkoutEntity`, `toggleEntityInfoPanel`, `_eipRelMap`, `renderEntityInfoPanel`, `_toggleRelDetail`, `releaseActiveEntity`, `sidebarDeleteEntity`, `loadEntityList`, `selectEntity`, `updateEntityDisplay` (17 items) moved from app.js into new `client/js/entity-ui.js`. `index.html` updated: `entity-ui.js` loads after `setup-ui.js`. `syncNavSidebarEntities`, `syncNavSidebarProfiles`, `resetChatForEntitySwitch`, `switchMainTab` confirmed to stay in app.js. `entity-ui-extraction-guards.test.js` added (34 tests). Existing `entity-release-visibility-regression.test.js` and `context-chat-entity-guard.test.js` and `chat-extraction-guards.test.js` updated to point refreshSidebarEntities / syncContextChatGuard guards at entity-ui.js. Suite: 695 pass, 0 fail. `[BOUNDARY_OK]` `[JS_OFFLOAD]`

- Phase 3 slice P3-S15 completed (2026-03-16) — system health extraction: `repairMemoryLogs`, `showMemoryStats`, `rebuildTraceGraph`, `runSystemBackup`, `runSystemRestore`, `formatBytes` (6 items) moved from app.js into new `client/js/system-health.js`. `index.html` updated: `system-health.js` loads after `entity-ui.js`. `system-health-extraction-guards.test.js` added (14 tests). Suite: 709 pass, 0 fail. `[BOUNDARY_OK]` `[JS_OFFLOAD]`

- Phase 3 slice P3-S16 completed (2026-03-16) — shell-core minimization and Phase 3 exit audit: app.js reduced to 896 lines (48 functions — all shell-core: boot, logging, clock, provider UI, tab switching, nav sidebar, mini viz, LLM config save, brain poll, entity/chat bridge). All cross-module calls verified to use `typeof` guards (`flushPendingSystemPrompt`, `clearChat`, `updateDeepSleepBadge`). `login.js` confirmed to guard `refreshSidebarEntities`. All 6 extracted modules confirmed in `index.html` script load order. Exit audit guard test added: `phase3-exit-audit.test.js` (17 tests). Suite: 726 pass, 0 fail. **PHASE 3 COMPLETE.** `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

### ✅ PHASE 3 COMPLETE (2026-03-16)

All slices P3-S1 through P3-S16 complete. Full extraction guard suite green. Graceful degradation confirmed. app.js is shell-core only.

### Stop/Resume Snapshot (2026-03-16 — PLAN-APP-FOLDER-MODULARIZATION-v1.md COMPLETE)

- Current phase: `App Folder Modularization — PLAN COMPLETE ✅`
- Last completed slice: `E1-2 — Changelog + handoff snapshot`
- In-progress item: `none`
- Next action on resume: `Phase 4 gate review — confirm Phases 1–3 + modularization prerequisites signed off, then open first Phase 4 feature plan`

### App Folder Modularization — Phase A1 (2026-03-16)

Plan: `Documents/current/PLAN-APP-FOLDER-MODULARIZATION-v1.md`

**Phase A1: Baseline Contracts And Guard Foundations — COMPLETE ✅**

Phase A1 checklist:
- [x] A1-0: Optional-app absent-path guard baseline — extended to cover `diary.js` (lifediary + dreamdiary entrypoints), `document-digest.js` (documents tab), and `browser-app.js` (browser tab). 8 new guard tests in `optional-app-degradation-guards.test.js`.
- [x] A1-1: App inventory manifest file — `project/client/js/apps/app-manifest.json` created covering all 20 WINDOW_APPS tabs with class, sourcePath, bootstrapCritical, and dependencies fields. Manifest consistency guard test suite created (`app-manifest-guards.test.js`, 9 tests).
- [x] A1-2: Script-order baseline assertions — `script-load-order-guards.test.js` created (9 tests) locking critical load ordering: `shared/sse.js` → `shared/api.js` → `js/app.js` → `js/chat.js`, `js/neural-viz/index.js` → `js/visualizer-ui.js` → `js/apps/optional/dream-gallery.js` → `js/boot.js` (last local script).

Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

Slice ledger entry (2026-03-16):
- App Folder Modularization Phase A1 completed — optional-app guard baseline extended to cover 3 optional modules (diary, document-digest, browser-app); app-manifest.json created and consistency-guarded (20 tabs, 10 core, 10 optional); script-load-order guard test suite added locking 9 critical ordering relationships. Full suite: **756 pass, 0 fail**. `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

---

### App Folder Modularization — Phase E1 (2026-03-16)

Plan: `Documents/current/PLAN-APP-FOLDER-MODULARIZATION-v1.md`

**Phase E1: Exit Audit And Closure — COMPLETE ✅**

Phase E1 checklist:
- [x] E1-0: Full suite exit audit — **866 pass, 0 fail**. All five guard suites pass: `registry-path-audit-guards`, `optional-failure-simulation`, `optional-app-migration-guards`, `core-app-migration-guards`, `app-manifest-guards`. All optional module typeof-guard simulations pass.
- [x] E1-1: WORKLOG closure update — Phase E1 block added; stop/resume snapshot updated to Plan Complete; next action points to Phase 4 gate review.
- [x] E1-2: Changelog + handoff snapshot — `Documents/current/CHANGELOG.md` updated; `PLAN-APP-FOLDER-MODULARIZATION-v1.md` status set to `Complete ✅`; stop/resume updated; completion ledger finalized.

Markers: `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

Slice ledger entry (2026-03-16):
- App Folder Modularization **PLAN COMPLETE** — Full exit audit green (866 pass, 0 fail); all 5 guard suites passing; 17 modules migrated to `apps/core/` and `apps/optional/`; contributor doc published; WORKLOG and changelog updated. Handoff: **Phase 4 gate review**. `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

---

### App Folder Modularization — Phase D1 (2026-03-16)

Plan: `Documents/current/PLAN-APP-FOLDER-MODULARIZATION-v1.md`

**Phase D1: Registry, Loader, And Documentation Stabilization — COMPLETE ✅**

Phase D1 checklist:
- [x] D1-0: Registry-path consistency audit — `registry-path-audit-guards.test.js` created (~20 tests): folder ownership assertions (core modules → `js/apps/core/`, optional → `js/apps/optional/`), flat-path regression guards for all 17 migrated module filenames, manifest-to-html completeness check, on-disk existence, no duplicate script srcs, workspace/vfs.js flat exception asserted.
- [x] D1-1: Optional failure simulation runbook — `optional-failure-simulation.test.js` created (14 tests): per-optional-module typeof-guard evidence for all 8 optional modules and all shell-core callers (`window-manager.js`, `boot.js`, `desktop.js`, `app.js`). Multi-line guard detection handles both inline (`typeof fn === 'function') fn()`) and block (`{ fn() }` inside typeof-guarded if) patterns.
- [x] D1-2: Contributor docs update — `Documents/current/APP-FOLDER-OWNERSHIP.md` created: folder structure map, Core vs Optional classification criteria, step-by-step new-app and migration guides, documented exceptions table (workspace/vfs.js, creator/nekocore iframes), ownership verification test file index.

Markers: `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

Slice ledger entry (2026-03-16):
- App Folder Modularization Phase D1 completed — `registry-path-audit-guards.test.js` (~20 tests) + `optional-failure-simulation.test.js` (14 tests) added; `Documents/current/APP-FOLDER-OWNERSHIP.md` contributor guide created; multi-line typeof-guard detection pattern confirmed working. Full suite: **866 pass, 0 fail**. `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

---

### App Folder Modularization — Phase C1 (2026-03-16)

Plan: `Documents/current/PLAN-APP-FOLDER-MODULARIZATION-v1.md`

**Phase C1: Optional App Path Migration — COMPLETE ✅**

Phase C1 checklist:
- [x] C1-0: Optional migration guard expansion — `optional-app-migration-guards.test.js` (42 tests) created; targets all 7 optional-module new paths, vfs.js stay-flat assertion, dream-gallery confirmation. Pre-migration baseline: 37 expected failures.
- [x] C1-1: Batch 1 migration (diary) — `diary.js` moved to `js/apps/optional/`; `index.html`, `app-manifest.json` (lifediary + dreamdiary sourcePaths), and `optional-app-degradation-guards.test.js` updated.
- [x] C1-2: typeof guard patches + Batch 2 migration (themes, physical, visualizer) — 4 shell-core typeof guards added (`initPhysicalTab` in `window-manager.js`, `initChatPhysical` in `boot.js`, `applyTheme`/`getStoredThemeId` in `desktop.js`, `showMiniMemoryDetail` in `app.js`); `theme-manager.js`, `physical-ui.js`, `visualizer-ui.js` moved to `js/apps/optional/`; `index.html` and `app-manifest.json` updated; 7 cascading extraction guard test files updated.
- [x] C1-3: Batch 3 migration (browser, documents, skills) — `browser-app.js`, `document-digest.js`, `skills-ui.js` moved to `js/apps/optional/`; `index.html` and `app-manifest.json` updated; 3 cascading extraction guard test files updated.

Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

Slice ledger entry (2026-03-16):
- App Folder Modularization Phase C1 completed — 7 optional app scripts migrated from flat `js/` to `js/apps/optional/` (diary, theme-manager, physical-ui, visualizer-ui, browser-app, document-digest, skills-ui); vfs.js explicitly kept flat (shell-critical: DOMContentLoaded → vfs.renderDesktop()); 4 typeof guards added to shell-core callers; C1-0 guard file added (42 tests); `app-manifest.json` (9 sourcePath updates) and 10 cascading extraction guard test files updated for path constant and inline ordering assertion string changes. Full suite: **842 pass, 0 fail**. `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

---

### App Folder Modularization — Phase B1 (2026-03-16)

Plan: `Documents/current/PLAN-APP-FOLDER-MODULARIZATION-v1.md`

**Phase B1: Core App Path Migration — COMPLETE ✅**

Phase B1 checklist:
- [x] B1-0: Core migration guard expansion — `core-app-migration-guards.test.js` (34 tests) created, targeting new `js/apps/core/` paths and asserting old flat paths are absent from index.html.
- [x] B1-1: Batch 1 migration (chat, entity-ui, users-ui) — files moved to `js/apps/core/`; `index.html` script src paths updated.
- [x] B1-2: Batch 2 migration (setup-ui, config-profiles, simple-provider, system-health) — files moved to `js/apps/core/`; `index.html` updated.
- [x] B1-3: Batch 3 migration (telemetry-ui, debug-core-app) — files moved to `js/apps/core/`; `index.html` updated. `app-manifest.json` sourcePaths and dependency refs updated for all 8 migrated core modules. All cascading extraction guard path constants and inline ordering assertion strings updated across 12 test files.

Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

Slice ledger entry (2026-03-16):
- App Folder Modularization Phase B1 completed — 9 core app scripts migrated from flat `js/` to `js/apps/core/` (chat, entity-ui, users-ui, setup-ui, config-profiles, simple-provider, system-health, telemetry-ui, debug-core-app); `index.html` and `app-manifest.json` updated; B1-0 guard file (34 tests) added; 12 extraction guard test files updated for cascading path constant and inline ordering assertion string changes. Full suite: **800 pass, 0 fail**. `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

---

### Pre-Phase-4 Cleanup Gate — P4-G0 App Structure Cleanup (2026-03-16)

Purpose:
1. Introduce explicit app folder taxonomy for modular ownership.
2. Separate shell-critical Core apps from removable Optional apps.
3. Validate removable architecture with one low-risk pilot migration before Phase 4 features.

Gate checklist:
- [x] P4-G0.1 Define app classification contract (Core vs Optional)
- [x] P4-G0.2 Add scaffold folders under `project/client/js/apps/core` and `project/client/js/apps/optional`
- [x] P4-G0.3 Produce app inventory/classification manifest
- [x] P4-G0.4 Migrate one pilot optional app with no behavior regression (`dream-gallery.js`)
- [x] P4-G0.5 Add/extend boot degradation guards (optional app absent path)
- [x] P4-G0.6 Full suite green and Stop/Resume updated (suite: 730 pass, 0 fail)

Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]`

Exit condition:
- Shell boot and primary navigation remain functional when the pilot optional app module is absent from load order.

Initial app inventory/classification manifest:
- Core (shell-critical): `chat`, `entity`, `creator`, `users`, `settings`, `advanced`, `activity`, `observability`, `debugcore`, `nekocore`
- Optional (removable candidate): `dreamgallery` (pilot moved), `lifediary`, `dreamdiary`, `themes`, `browser`, `documents`, `workspace`, `skills`, `visualizer`, `physical`

Slice ledger update (2026-03-16):
- Pre-Phase-4 cleanup gate `P4-G0` completed — app folder taxonomy introduced (`project/client/js/apps/core`, `project/client/js/apps/optional`), pilot optional module migration completed (`dream-gallery.js`), optional-app degradation guard test added (`project/tests/unit/optional-app-degradation-guards.test.js`), and full suite validated (`730 pass, 0 fail`). `[BOUNDARY_OK]` `[JS_OFFLOAD]`

Planning note:
- `Documents/current/PLAN-PHASE3-MODULARIZATION-COMPLETION-v1.md` is the active Phase 3 execution plan and closure gate for remaining slices (`P3-S9` through `P3-S16`).
- `Documents/current/PLAN-MODULAR-FEATURES-v1.md` captures candidate platform services requested for future modularization work. It is reference material for Phase 3/4 planning and does not open feature implementation by itself.
- Pre-Phase-4 cleanup gate work is tracked as `P4-G0` and must complete before new Phase 4 feature implementation.

Implementation note (ad-hoc bugfix):
- Visualizer now has an entity picker that can switch active entity context (including `nekocore`) so graph/memory search/chat-history views load from the selected entity's memory set. `[BOUNDARY_OK]`
- Taskbar shell regression fix — taskbar row layout repaired so the quick bar stays in-line, default sizing reduced, right-clicking the taskbar exposes `Edit Taskbar`, and edit mode now supports drag-to-move (left/center/right) plus true width/height drag resizing with persistent layout storage. `[BOUNDARY_OK]`
- Entity release visibility regression fix — release now clears active entity state using canonical-id comparison, and sidebar entity filtering now normalizes IDs so released entities remain visible and can be checked out again immediately. Added guard tests in `project/tests/unit/entity-release-visibility-regression.test.js`. `[BOUNDARY_OK]`
- Entity release follow-up fix — `clearActiveEntity()` now also clears EntityManager current state so `/api/entities/current` no longer reports stale `loaded:true` after release, and sidebar rendering now falls back to full visible entities when stale active-id filtering yields no matches. Regression guards extended for both behaviors. `[BOUNDARY_OK]`
- Entity checkout contention fix — Visualizer no longer auto-loads/checks out the first listed entity when no active entity exists, preventing background `/api/entities/load` calls from re-checking out entities after release. Added guard test in `project/tests/unit/visualizer-entity-autoload-guard.test.js`. `[BOUNDARY_OK]`
- Entity list visibility fix — `/api/entities` now always includes system entities (NekoCore) even when owner/public filters would normally hide them, so NekoCore appears in the entity browser list for checkout/release flows. Guard test added in `project/tests/unit/nekocore-protection.test.js`. `[BOUNDARY_OK]`
- Context chat guard fix — context chat input/send is now disabled whenever no entity is checked out, `sendChatMessage()` hard-blocks no-entity sends, and sidebar refresh syncs the guard state after checkout/release changes. Guard tests added in `project/tests/unit/context-chat-entity-guard.test.js`. `[BOUNDARY_OK]`
- NekoCore OS settings config fix — NekoCore model settings now hydrate saved endpoint/model on load and allow model-only saves to reuse the stored API key when the key input is left blank, preventing false `API key is required` errors during model updates. `[BOUNDARY_OK]`
- Critical bug fix completed — NekoCore Visualizer memory rendering restored by correcting direct-chat memory writes back to entity-scoped storage (`episodic`/`semantic`) and adding route-level compatibility for legacy entity `Memory2` records in memory search/detail/full-mind graph endpoints. Regression tests added in `project/tests/unit/nekocore-visualizer-memory-regression.test.js`. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Debug observability hardening completed — client-side DBG/error streams are now forwarded into the server timeline pipeline via `POST /api/timeline/client-debug` and stored alongside server timeline events under `client.debug`, providing a single searchable/streamable source for cross-layer bug triage (`/api/timeline`, `/api/timeline/stream`). `[BOUNDARY_OK] [JS_OFFLOAD]`
- Debug controls modularization completed — the floating DBG/Reset overlay was removed from shell bootstrap and rehomed into a dedicated `debugcore` core app module with tab registry wiring, timeline/client-buffer rendering, and resilient bridge-based actions (`dumpState`, queue flush, window reset) so shell boot continues even when debug UI fails to load. `[BOUNDARY_OK] [JS_OFFLOAD]`

Slice ledger update (2026-03-16):
- Ad-hoc modular debugcore app integration completed — `debugcore` was added to app registry/category maps, window activation now calls `initCoreDebugApp()`, a dedicated `tab-debugcore` panel was added, and new module `project/client/js/debug-core-app.js` now owns debug rendering/actions. The old floating DBG/RESET bootstrap controls were removed; client debug forwarding remains active through `window.__coreDebugBridge`. Validation: full suite `npm.cmd test` (527 pass, 0 fail). `[BOUNDARY_OK] [JS_OFFLOAD]`

Slice ledger update (2026-03-15):
- Repo workflow safeguard queued — before additional staging work, move to a private primary repository with the current public repository retained as a release mirror so in-progress staging branches are no longer public. `[BOUNDARY_OK]`
- Critical bug fix completed — entity release now normalizes `ctx.currentEntityId` before active-state clear, preventing stale active entity state after release; sidebar list filtering now compares normalized IDs so release no longer hides entities from the browser list or blocks immediate re-checkout UX. Regression guards added for both server release handler and sidebar filtering logic. `[BOUNDARY_OK]`
- Critical bug fix completed — release flow now clears both global and EntityManager active state, preventing stale `/api/entities/current` responses that forced sidebar active-only filtering into blank state. Sidebar entity list now self-heals stale active-id filters by clearing local active state and rendering all visible entities when no active match exists. `[BOUNDARY_OK]`
- Critical bug fix completed — Visualizer entity picker bootstrap no longer auto-checkouts the first entity when there is no active entity, eliminating hidden load/check-in contention between auxiliary views and primary chat release flow. `[BOUNDARY_OK]`
- Critical bug fix completed — system entity visibility filter now whitelists NekoCore in `/api/entities`, fixing missing NekoCore entries in the entity list when account ownership/public filters excluded `ownerId: __system__`. `[BOUNDARY_OK]`
- Critical bug fix completed — context chat text input is now explicitly guarded when no entity is checked out; no-entity send attempts are blocked with guidance and chat controls auto-resync after sidebar entity-state refresh. `[BOUNDARY_OK]`
- Critical bug fix completed — NekoCore OS settings now load saved NekoCore endpoint/model values on panel open and permit model-only saves by reusing the stored NekoCore API key when the key input is blank. `[BOUNDARY_OK]`
- Critical bug fix completed — `ws_move` skill definitions were normalized in both shared and system-entity skill roots with schema-compliant frontmatter and synced tool guidance/examples, eliminating copy drift and invalid manifest warnings. `[BOUNDARY_OK]`
- Critical bug fix completed — `tutorial-notes` skill manifests were simplified into deterministic tool-usage rules and cleaned to schema-supported frontmatter in both shared and system-entity roots, reducing ambiguous skill behavior during note tasks. `[BOUNDARY_OK]`
- Critical bug fix completed — skill runtime reliability hardened: tool-call parsing now accepts flexible `[TOOL:]` syntax variants (spacing/casing/quotes), pending approval drafts now strip embedded `[TASK_PLAN]` blocks before user display, and one-step task plans now execute instead of being ignored. Regression tests added in `project/tests/unit/workspace-tools-parser.test.js`. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Critical bug fix completed — dedicated NekoCore chat (`/api/nekocore/chat`) now runs the same tool/task execution safety pipeline as main chat: inline tool execution + follow-up synthesis, one-step-or-more task-plan execution, and final stripping of residual `[TOOL:]` / `[TASK_PLAN]` directives before UI response. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Planning slice completed — added `Documents/current/PLAN-MODULAR-FEATURES-v1.md` to capture candidate modular platform features requested for Phase 3+: plug-in registration hub, feature flags, lazy-load loading, shared state store, theming engine, automated testing scaffold, and documentation generator. This is planning only, not implementation authorization. `[BOUNDARY_OK]`
- Critical bug fix completed — skill-manager compatibility aligned to OpenClaw/AgentSkills expectations: frontmatter parser now accepts OpenClaw-style metadata blocks, model-invocation gating honors `disable-model-invocation`, and skill enabled/disabled state is persisted in `.skill-state.json` instead of writing unsupported `enabled` keys into `SKILL.md`. Added guards in `project/tests/unit/skill-manager-openclaw-compat.test.js`. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Phase 2 slice P2-S2 completed — EntityRuntime service wired into `server.js`: `setActiveEntity` (~80 lines of inline brain-module construction) now delegates to `entityRuntime.activate(entityId)`; `clearActiveEntity` delegates to `entityRuntime.deactivate()`. `entity-runtime.js` extended with `ConsciousMemory` construction and `somaticAwareness.emitSomaticState()` to match removed inline behavior exactly. Module-level vars still synced for ctx compatibility. Guard tests added (6 new, 24 total guards). Suite: 429 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 2 slice P2-S4 completed — `context-menu.js` (ctxMenu IIFE + `contextmenu` event handler, ~190 lines) and `vfs.js` (VFS IIFE + `DOMContentLoaded` desktop init, ~440 lines) extracted from `app.js`. `app.js` reduced from 6,660 → 6,030 lines (−630). `index.html` updated to load `vfs.js` then `context-menu.js` after `app.js`. Guard tests added (6 new, 36 total guards). Suite: 447 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 2 slice P2-S3 completed — Startup preflight service extracted to `server/services/startup-preflight.js`: `backupCorruptFile`, `ensureDirectory`, `ensureJsonFile`, `ensureTextFile`, `buildDefaultEntityPersona`, `buildDefaultEntityPrompt`, `ensureEntityRuntimeState`, and `runStartupPreflight` (~130 lines) removed from `server.js`. Service exposes `createRunStartupPreflight` factory; `server.js` wires it with `SERVER_DATA_DIR`, `MEM_DIR`, `loadConfig`, `ensureMemoryDir` (all hoisted). Guard tests added (6 new, 30 total guards). Suite: 435 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 2 slice P2-S1 completed — duplicate config management code removed from `server.js`: `makeDefaultGlobalConfig`, `normalizeGlobalConfigShape`, `ensureGlobalConfigFile`, `ensureGlobalConfigDir`, `migrateLegacyGlobalConfigIfNeeded`, and the large inline `TOKEN_LIMIT_DEFAULTS` object all replaced with delegation to the `configService` singleton from `services/config-service.js`. `loadConfig`/`saveConfig`/`getTokenLimit`/`refreshMaxTokensCache`/`refreshTokenLimitsCache` kept as thin wrappers for route compatibility. Fixed `orchestratorFinal` token limit value drift (1200→1600). Guard tests added in `boundary-cleanup-guards.test.js` (18 pass). Suite: 423 pass, 0 fail. `[BOUNDARY_OK]`
- Critical bug fix completed — NekoCore subconscious retrieval now includes a bounded recent-conversation recall block from her latest episodic chat memories, so continuity survives wording shifts between turns and prior-conversation context is available even on weak topic overlap. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Critical bug fix completed — NekoCore direct chat now keeps its raw conversation snapshot but also runs the shared post-response memory encoder so each turn can produce `core_memory` and `semantic_knowledge` layers. Shared `MemoryStorage` now prunes stale index entries when backing folders are missing, stopping repeated `Memory not found` loops after index/file drift. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Ad-hoc bug fix completed — NekoCore OS panel now exposes system-entity tool settings, including per-skill enable/disable toggles, skill approval-mode control, and editable workspace-root path. System bootstrap now preserves an explicit NekoCore workspace path instead of overwriting it on every start. `[BOUNDARY_OK]`
- Ad-hoc repo packaging wrapper completed — tracked runnable source, browser host, tests, assets, and runtime folders moved under `project/`; root kept documentation/governance-first for GitHub visitors. Root README and ignore rules updated to match the new source location. `[BOUNDARY_OK]`
- `BUG-16` completed — entity creation now auto-creates a VFS desktop folder under `workspace/desktop/<Entity Name>/` across all four create flows (`create`, `create-hatch`, `create-guided`, `create-character`). Guard tests added for regression prevention. `[BOUNDARY_OK]`
- NekoCore workspace policy correction — system entity no longer expects a dedicated desktop subfolder; `nekocore` is now mapped to the workspace root (`workspacePath` + `workspaceScope: workspace-root`) and this mapping is enforced during bootstrap, including migration for pre-existing installs. `[BOUNDARY_OK]`
- `BUG-05` completed — Creator personality trait fields now provide dropdown/autocomplete suggestions and an Auto-fill Traits action in Empty and Guided modes. `[BOUNDARY_OK]`
- `BUG-13` completed — chat auto-scroll now batches to animation frames, tracks true user scroll intent via scroll events, and avoids repeated forced scroll snaps during typing streams. `[BOUNDARY_OK]`
- `BUG-09` completed — setup/settings now include explicit model-routing guidance to avoid using the same model for Main Mind and Orchestrator; fast OpenRouter recommendation now pairs Mercury 2 (Main) with Claude Sonnet 4 (Orchestrator). `[BOUNDARY_OK]`
- `BUG-02` completed — setup-wizard input fields now enforce high-contrast foreground/background styles to keep typed text readable in all themes. `[BOUNDARY_OK]`
- `BUG-01` completed — account/setup wizard branding updated from REM System to NekoCore OS. `[BOUNDARY_OK]`
- `BUG-03` completed — OpenRouter setup now includes sign-up links and visible BYOK disclosure (any OpenAI-compatible endpoint/key/model is supported). `[BOUNDARY_OK]`
- Ad-hoc regression fix completed — taskbar now defaults to a more compact footprint, persists its size/alignment in localStorage, and exposes a taskbar context-menu edit mode with move/resize controls so the shell dock remains usable after the taskbar redesign. `[BOUNDARY_OK]`
- Phase 2 slice P2-S6 completed — `processChatMessage` (~550 lines), `processNekoCoreChatMessage` (~200 lines), `processPendingSkillApproval`, and startup IIFE extracted from `server.js` into `server/services/chat-pipeline.js`, `server/services/nekocore-pipeline.js`, and `server/services/boot.js`. `server.js` reduced from 2103 → 882 lines (−1221 lines). All entity-scoped shadow vars removed; ctx/lifecycle getters delegate to `entityRuntime`. All 43 guard tests pass. Suite: 454 pass, 0 fail. Phase 2 complete. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Phase 3 slice P3-S1 completed — `window-manager.js` (29 functions, ~780 lines) extracted from `app.js`. Covers: getStageRect, scheduleLayoutResizeSignal, clampWindowRect, setWindowRect, captureWindowRect, rememberWindowRestoreRect, clearWindowDockState, restoreWindowForDrag, focusWindow, applyWindowActivationEffects, openNekoCoreWithMessage, openWindow, closeWindow, toggleMaximizeWindow, snapWindow, showSnapDock, hideSnapDock, updateSnapDockPointer, resolveEdgeSnap, startDrag, startResize, popOutWindow, createWindowShell, buildLauncherMenu, serializeWindow, saveWindowLayout, restoreWindowLayout, resetWindowLayout, initWindowManager. `app.js` reduced from 6,036 → 5,260 lines (−776). `index.html` updated to load `window-manager.js` between `app.js` and `vfs.js`. Guard tests added in `window-manager-extraction-guards.test.js` (10 guards). Suite: 466 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 3 slice P3-S2 completed — `desktop.js` extracted from `app.js`. Covers: start menu open/close flow, start power menu, start category switching, taskbar layout persistence/edit mode, pinned-app loading/reordering/rendering, taskbar overflow controls, `initDesktopShell`, web UI presence heartbeat, and `getWindowApp`. `app.js` reduced further by moving the desktop-shell block behind a redirect comment, and `index.html` now loads `desktop.js` after `app.js` and before `window-manager.js`. Guard tests added in `desktop-extraction-guards.test.js` (10 guards). Suite: 476 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 3 slice P3-S3 completed — `boot.js` extracted the main app `DOMContentLoaded` boot path from `app.js`. Covers: desktop shell boot, settings model suggestions bootstrapping, thoughts toggle sync, saved-config hydration, `_startApp()`, `startBrainPoll()`, and `initChatPhysical()`. `index.html` now loads `boot.js` after `browser-app.js`, keeping boot registration late while still before DOM ready. Guard tests added in `boot-extraction-guards.test.js`. Suite: 484 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 3 slice P3-S4 completed — `visualizer-ui.js` extracted the visualizer detail/search/bootstrap helpers from `app.js`. Covers: `showMemoryDetail`, `showMiniMemoryDetail`, activity feed helpers, HTML-escaping helpers, search/select helpers, context search wiring, and the visualizer-specific `DOMContentLoaded` handler that wires `window.onNeuralNodeSelected`. `index.html` now loads `visualizer-ui.js` after `js/neural-viz/index.js`. Guard tests added in `visualizer-ui-extraction-guards.test.js`. Suite: 492 pass, 0 fail. `[BOUNDARY_OK]`
- Phase 3 slice P3-S5 completed — `physical-ui.js` extracted Physical Body + deep-sleep UI ownership from `app.js`. Covers: `initPhysicalTab`, physical/neuro fetch/update helpers, chat physical widget mirror (`initChatPhysical`), somatic toggle mutation, SSE wiring, and deep-sleep interval slider helpers. `index.html` now loads `physical-ui.js` after `sleep.js`. Guard tests added in `physical-ui-extraction-guards.test.js`; related extraction guards (boot/window manager) all pass. Suite: 26 extraction-guard tests pass, 0 fail. `[BOUNDARY_OK]`
- Phase 3 slice P3-S6 completed — `users-ui.js` extracted User Switcher + Users app ownership from `app.js`. Covers: user panel open/close/render/switch flows, user add/clear flows, users-app list/create/set-active/delete handlers, and user-switcher bootstrap/reset wiring. `index.html` now loads `users-ui.js` after `physical-ui.js`. Guard tests added in `users-ui-extraction-guards.test.js`; extraction guard set passes and full suite is green (510 pass, 0 fail). `[BOUNDARY_OK]`
- Phase 3 slice P3-S7 completed — `setup-ui.js` extracted setup enforcement (`isApiConfigured`, setup-required modal helpers, guardEntityOperation), setup wizard ownership (`SETUP_STEPS`, `LLM_ROLES`, setup state helpers, wizard connect/test/finish flow), and user-name modal helpers from `app.js`. `index.html` now loads `setup-ui.js` after `users-ui.js` and before `skills-ui.js`. Guard tests added in `setup-ui-extraction-guards.test.js`; targeted extraction guards pass and full suite is green (527 pass, 0 fail). `[BOUNDARY_OK]`
- Critical bug fix completed — NekoCore system entity pipeline parity restored: NekoCore now uses persistent `nekoSystemRuntime` (EntityRuntime instance) instead of creating local throwaway brain modules per-call, giving her full architectural parity with user entities. NekoCore can now dream (DreamEngine), evolve emotionally (Neurochemistry), track goals (GoalsManager), express curiosity (CuriosityEngine), and consolidate memories through the same episodic/semantic pipeline as all other entities. This was blocking Phase 3 modularization because Visualizer memory types showed NekoCore as missing entity-level subsystems. Added guard tests in `project/tests/unit/nekocore-parity-guards.test.js` covering 12 core subsystems. `server.js` (lines 327-348) initializes `nekoSystemRuntime` on startup; `nekocore-pipeline.js` now requires and delegates to this runtime; `ctx` exposes NekoCore subsystems via getters. Suite: 527 pass, 0 fail. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Critical bug fix completed — Visualizer entity context now stays aligned with actual active/selected entity state after NekoCore parity work. `project/server/services/entity-runtime.js` now guards shared mutable-global updates behind `shareMutableGlobals`; `project/server/server.js` creates `nekoSystemRuntime` with `shareMutableGlobals: false`; `project/server/routes/entity-routes.js` now reads current entity from `entityManager` instead of `hatchEntity` shared state; `project/server/routes/memory-routes.js` resolves selected entity context explicitly for memory search/detail/reconstruct and visualizer chat-history routes; `project/client/js/visualizer.js` preserves a real blank placeholder, merges the current entity into the picker when `/api/entities` omits it, and passes selected entity id through graph/memory/diagnostic/chat-history requests; `project/client/js/neural-viz/renderer.js` appends optional entity context to graph/trace/belief requests. Added/updated guards in `project/tests/unit/visualizer-entity-context-regression.test.js`, `project/tests/unit/nekocore-visualizer-memory-regression.test.js`, and `project/tests/unit/nekocore-parity-guards.test.js`. Validation: full suite `npm.cmd test` green at 554 pass, 0 fail. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Critical bug fix completed — Three Visualizer + NekoCore regressions fixed: (1) NekoCore dreaming re-enabled: removed `dreamDisabled: true` from `entity_nekocore/entity.json` and `bootstrap.js` so `phase-dreams.js` no longer skips the dream pipeline; bootstrap guard test updated to assert `dreamDisabled` is absent. (2) Memory graph endpoints now entity-aware: `getMemoryGraphNodes` uses active entity's in-memory graph when `entityId` param matches active entity, otherwise scans disk using `getEntityMemoryScanDirs` with topic co-occurrence edges; `getFullMindGraph` reads `entityId` URL param and uses it as target; `getTraces` and `getBeliefGraphNodes` return empty data for non-active entities (in-memory only subsystems). (3) Visualizer entity picker now refreshes on `visibilitychange` via new `refreshEntityPickerList()` so newly created/loaded entities (including Rebecca) appear without a full page reload; `clearFilter()` now passes `selectedEntityId` to `NeuralViz.loadGraphData()`. Suite: 554 pass, 0 fail. `[BOUNDARY_OK] [JS_OFFLOAD]`
- Critical bug fix completed (2026-03-16, post-reset) — Three root-cause memory pipeline bugs fixed after factory reset confirmed they were code issues, not data corruption: (1) `getMemoriesSearch` in `memory-routes.js` now skips directories that have no `log.json` (structural subdirs like `traces/`, `dreams/core/` were previously returned as fake memory records); (2) `getEntityMemoryScanDirs` in `entity-memory-compat.js` now recurses into `dreams/episodic`, `dreams/semantic`, and `dreams/core` instead of scanning the flat `dreams/` root (fixes visualizer dream memory count + memory graph builder false-positive "4 dream memories" log); (3) `encodeNekoConversationMemory` call in `nekocore-pipeline.js` now passes `memoryAspectConfigs: { subconscious: ... }` (plural) and `effectiveUserMessage:` instead of `aspectConfig:` (singular) + `userMessage:` — the wrong key names were causing a silent early exit in `runPostResponseMemoryEncoding` so LLM-enhanced topic extraction and richer memory encoding never ran. Suite: 554 pass, 0 fail. `[BOUNDARY_OK]`
- Critical bug fix completed (2026-03-16, post-reset) — Setup wizard no longer requires manual discovery after first run. `_onAuthSuccess` in `login.js` now checks if any saved profile has a valid main LLM config via `getMainConfigFromProfile`; if none exists, `showSetupWizard()` auto-launches 350ms after the login overlay closes. Covers both fresh registration and re-login on an unconfigured machine. The auto-launch path was lost during P3-S7 extraction (setup-ui.js) — the trigger was never moved to the new module. Suite: 554 pass, 0 fail. `[BOUNDARY_OK]`

---

## Session Ledger - 2026-03-15 (NekoCore Browser NB-6 LLM Mode Foundation)

Status: `Completed`

Purpose:
1. Add LLM Mode to the NekoCore Browser alongside Human Mode.
2. Enable page summarization, ask-this-page chat, and structured extraction.
3. Add research session model separate from entity chat.
4. Enforce user confirmation for all memory writes.

Completed outputs:
1. Created `browser-host/research-session.js` — research session state management.
2. Added 13 new LLM API endpoints to `server/routes/browser-routes.js`.
3. Added LLM mode client code to `client/js/browser-app.js`.
4. Added LLM panel HTML to `client/index.html`.
5. Added full CSS for LLM mode to `client/css/ui-v2.css`.
6. All 334 existing tests pass. JS syntax verified. Server loads cleanly.

## Session Ledger - 2026-03-14 (NekoCore Browser Phase 0 Kickoff)

Status: `In Progress`

Purpose:
1. Move from browser roadmap discussion to executable phase work.
2. Start NekoCore Browser in a policy-first, compliance-safe path.
3. Keep implementation aligned with Documentation Checkout Policy before host code begins.

Kickoff outputs:
1. Added `Documents/current/PLAN-NEKOCORE-BROWSER-PHASE0-v1.md` as the executable phase plan.
2. Set Phase NB-0 (Governance and Compliance Baseline) to `In Progress`.
3. Marked NB-0-0 complete (phase plan initialization).
4. Set next active slice to NB-0-1 (scope lock and non-goals).

Next action:
1. Finalize scope lock and non-goals text in browser roadmap and source-of-truth docs.
2. Complete dependency/notices policy and data-boundary policy before any browser-host implementation.

Progress update:
1. Completed NB-0-1 (scope lock and non-goals).
2. Browser implementation direction is now explicitly locked to app-on-engine.
3. Completed NB-0-2 (dependency approval and third-party notices policy).
4. Completed NB-0-3 (browser data boundary and persistence defaults policy).
5. Completed NB-0-4 (contributor provenance policy, DCO selected).
6. Completed NB-0-5 (Phase 0 exit review).
7. Phase NB-1 is now active.
8. Completed NB-1-0 (technical spike acceptance checks baseline).
9. Completed NB-1-1 (repo module boundaries for host/shared/contracts/routes).
10. Completed NB-1-2 (initial bridge/API contract list for browser session and tab state).
11. Completed NB-2-0 (NB-1 exit review and NB-2 gate open).
12. NB-1 technical spike-prep gate is Done.
13. NB-2 Technical Spike Implementation phase is now active.
14. Completed NB-2-1 (browser-host/ module scaffold created; entry point verified).
15. Completed NB-2-2 through NB-2-6 (event-bus, tab-model, navigation, lifecycle, download-manager, browser-routes wired, 23/23 acceptance tests pass).
16. NB-2 Technical Spike is Done.
17. NB-3 Browser Core MVP phase started and completed in a single pass:
    - Server: history-store, bookmark-store, session-store (JSON file persistence)
    - Routes: browser-routes.js rewritten with 22+ endpoints (history, bookmarks, session, update-tab)
    - Client: browser-app.js — full multi-tab browser (tab strip, per-tab iframes, address bar navigation, bookmark toggle, downloads panel, session restore, web search)
    - HTML: browser tab replaced with multi-tab structure (tab strip, frames container, downloads panel, bookmarks/history cards)
    - CSS: tab strip, tab buttons, downloads panel, history rows, empty states, frames container
    - Old inline browser code (~280 lines) extracted from app.js to standalone browser-app.js
    - Browser init hook wired into applyWindowActivationEffects
    - Require path fix for browser-routes → browser-host
    - 23/23 spike acceptance tests still pass
18. NB-4 Shell Integration phase completed in a single pass:
    - Server: settings-store.js (homepage, search engine, session restore, external link behavior)
    - Routes: settings GET/update/reset endpoints + browser status endpoint added
    - Client: openInBrowser(url) global launch routing function
    - Client: browser settings panel in Advanced tab (homepage, search engine, session restore, external links, clear history/bookmarks)
    - Client: browser status card in Task Manager (tab count, active URL, status)
    - Client: taskbar badge showing tab count on browser pinned-app button
    - Client: graceful shutdown (browserCleanup on beforeunload, sendBeacon session save, session save on window close)
    - Client: iframe blocked-site overlay with fallback to system browser
    - Client: search engine setting wired into URL normalization (Google/DuckDuckGo/Bing)
    - CSS: blocked overlay, taskbar badge, position:relative on pinned-app buttons
    - 23/23 spike acceptance tests still pass
19. NB-5 Human Mode Completion phase completed in a single pass:
    - Server: history-store upgraded (deleteEntry, deleteByDateRange, exportAll, importEntries)
    - Server: bookmark-store upgraded (search, update, clear, exportAll, importBookmarks, getFolders)
    - Routes: 10 new endpoints (history delete/delete-range/export, bookmarks update/clear/export/import/folders, settings export)
    - Client: bookmark manager panel (search, folder filter, inline edit, add form, delete per-item)
    - Client: history manager panel (search, grouped by date, per-entry delete, delete today, clear all)
    - Client: tab context menu (right-click: duplicate, reload, pin/unpin, mute/unmute, close, close others)
    - Client: middle-click tab to close, pinned tabs (sorted first, no close button, visual indicator)
    - Client: keyboard shortcuts (Ctrl+T/W/L/R/D/H/J, Ctrl+Shift+B, Ctrl+1-9, Alt+Left/Right, F5, Escape)
    - Client: import/export bookmarks (JSON), import/export settings (JSON), export history (JSON)
    - HTML: bookmark/history manager panels, toolbar with manager buttons, shortcuts bar, import/export buttons in Advanced tab
    - CSS: context menu, manager panels, manager rows, edit inputs, action buttons, shortcuts bar, pinned tab style
    - 23/23 spike acceptance tests still pass

## Session Ledger - 2026-03-14 (NekoCore Browser Roadmap Draft)

Status: `Planned`

Purpose:
1. Define a compliant path for a real NekoCore Browser product.
2. Keep the work open-source friendly, commercial-friendly, and contributor-safe.
3. Lock a phased plan before implementation starts.

Planning outputs:
1. Added `NEKOCORE-BROWSER-ROADMAP.md` as the source-of-truth draft for browser scope, guardrails, and phased delivery.
2. Defined product position as a browser application built on an existing engine, not a custom rendering engine.
3. Documented legal and commercial guardrails for licensing, contributor provenance, third-party notices, and prohibited bypass features.
4. Broke work into seven phases:
   - governance and compliance,
   - technical spike and repo layout,
   - browser core MVP,
   - shell integration,
   - human mode,
   - LLM mode and safety,
   - packaging and community readiness.

Next recommended action:
1. Review and approve the roadmap direction.
2. Start Phase 0 decisions before any browser-host implementation begins.

## Session Ledger — 2026-03-14 (Resilience + OS Window Runtime)

Status: `Done`

Slices completed:
1. Full backup/restore feature landed (folder-based):
   - Added APIs for backup/restore in `server/routes/config-routes.js`.
   - Added manifest generation and restore safety snapshots.
   - Added Advanced tab UI controls + handlers in `client/index.html` and `client/js/app.js`.
   - Fixed safety snapshot recursion bug by storing pre-restore snapshots outside `server/data/`.

2. Startup and WebUI auto-open behavior reworked to OS-style flow:
   - Removed strict timer-driven lockout behavior.
   - Added state-based open/switch behavior via lock-state + WebUI presence tracking.
   - Added `POST /api/system/webui-presence` and client heartbeat/beacon reporting.

3. Dedicated window launch behavior implemented cross-platform:
   - Windows/macOS/Linux launcher paths now prefer dedicated app/kiosk window modes.
   - Startup logs now explicitly report dedicated window launch/focus behavior.

4. Strict runtime policy enforced per OS with hard failure:
   - Default runtime policy: Windows=`edge`, macOS=`chrome`, Linux=`chrome`.
   - Missing runtime now fails loudly (no silent fallback to normal tab open).
   - Optional override supported via `REM_UI_RUNTIME`.

5. Test coverage updates for launcher/runtime logic:
   - Updated and expanded `tests/unit/auto-open-browser.test.js` for:
     - dedicated launch command builders,
     - state-based switching behavior,
     - strict runtime missing failure behavior.

Primary files touched this session:
1. `server/routes/config-routes.js`
2. `server/services/auto-open-browser.js`
3. `server/server.js`
4. `client/index.html`
5. `client/js/app.js`
6. `tests/unit/auto-open-browser.test.js`

Verification outcome:
1. Full automated suite green (`323 pass, 0 fail`) with additional isolated and recursive sweeps.

## Test Verification — 2026-03-14

Status: `Done`

Scope:
1. Full baseline suite (`unit + integration`) via package script.
2. Explicit isolated runs for `unit` and `integration` scripts.
3. Exhaustive recursive sweep of every `tests/**/*.test.js` file.

Execution notes:
1. PowerShell policy blocked direct `npm` execution (`npm.ps1` restricted); used `cmd /c npm ...` for script invocations.
2. Test warnings about config/profile validation and mocked LLM fallback paths are expected in current fixtures and did not produce failures.

Commands and outcomes:
1. `cmd /c npm test` → `323 passed, 0 failed`.
2. `cmd /c npm run test:unit` → `246 passed, 0 failed`.
3. `cmd /c npm run test:integration` → `77 passed, 0 failed`.
4. `node --test <all recursive tests>` (from `Get-ChildItem tests -Recurse -Filter *.test.js`) → `323 passed, 0 failed`.

Conclusion:
1. Automated test suite is green across baseline, isolated layers, and recursive exhaustive run.

## Documentation Checkout Policy

Purpose:
1. Keep docs synchronized with architecture/code changes in real time.
2. Prevent implementation drift from planned design.

Required workflow:
1. Before coding:
   - update planned flow/contracts in docs
   - mark phase as `Planned`
2. During coding:
   - log landed slices with date, scope, and files changed
   - mark status `In Progress` or `Done`
3. After coding slice:
   - update `CHANGELOG.md` under `Unreleased`
   - record next-phase actions and residual risks
4. No new feature slice may start if the active cleanup gate is open.

## BugTest Notes Loop

Purpose:
1. Keep a live queue of behavior-impacting slices that require manual bug testing.
2. Make testing phases deterministic by tracking what to validate, what passed, and what regressed.

Operating rules:
1. Bug testing is required for behavior-impacting slices (runtime logic, retrieval, orchestration, routing, persistence, auth, prompt wiring).
2. Bug testing is optional for low-risk cosmetic or text-only changes unless explicitly requested.
3. For required slices, add/update an entry in `Documents/current/BUGTEST-NOTES.md` in the same slice.
4. At test time, move entry status through `Queued` → `In Test` → `Pass`/`Fail`/`Deferred`.
5. If `Fail`, link follow-up fix slice IDs and keep the BugTest item open until revalidated.

Status labels:
1. `Planned`
2. `In Progress`
3. `Done`
4. `Blocked`

## Architecture Boundary and Script Bloat Policy

Purpose:
1. Prevent oversized scripts and mixed-layer logic.
2. Enforce separation of frontend, backend, routes, and contracts.

Hard boundaries:
1. Frontend (`client/**`) must not contain backend orchestration, file system logic, or server-side policy logic.
2. Backend (`server/**`) must not contain DOM/UI rendering concerns.
3. API routing belongs in `server/routes/**`; avoid plugging new route logic into `server/server.js`.
4. Data schemas and output validators belong in contracts modules (`server/contracts/**`).
5. `server/server.js` acts as composition/bootstrap only; new business logic should be extracted to modules.

Size and complexity guardrails:
1. New modules should target <= 300 lines when practical.
2. Any file above 800 lines is considered high-risk and must not receive large new feature blocks.
3. If a file above 1200 lines needs changes, refactor extraction is required in the same slice.

Required implementation markers in tickets/notes:
1. `[BOUNDARY_OK]` confirms layer placement is correct.
2. `[JS_OFFLOAD]` confirms deterministic logic is script-owned.
3. `[CONTRACT_ENFORCED]` confirms contributor output/input contract is validated.

## Cleanup Gate (Must Complete Before New Feature Expansion)

Status: `Done`

Rule:
1. Do not start new feature expansion until the cleanup gate is marked `Done`.

Gate checklist:
1. Extract recently added orchestration helper logic out of overloaded files where required.
2. Move any route/business logic still living in `server/server.js` into `server/routes/**` or `server/brain/**` modules.
3. Add/confirm contracts for new contributor artifacts and worker outputs.
4. Document file ownership boundaries in source-of-truth docs.
5. Add regression checks for boundary violations.

## Cleanup Evaluation and Execution Policy

Purpose:
1. Ensure cleanup is measurable, phased, and resumable.
2. Ensure we can always answer: where we stopped, what was in progress, and what is next.

Required operating rules:
1. Every cleanup slice must have explicit Start, End, and Done criteria.
2. Every slice completion must update checkbox state and ledger entry.
3. Work may not jump ahead if previous required slice criteria are unmet.
4. At pause/stop, update the Stop/Resume Snapshot before ending the session.

## Phase A Re-evaluation — Cleanup Remediation Plan

Status: `Planned`

### Background

Phase A (A1-A5) was marked `Done` but a post-`D` full code audit reveals the cleanup was incomplete.
`server/server.js` is 2396 lines — **double the 1200-line extraction threshold**.
**~1050 lines (44%) are inlined business logic** that violates the composition-only policy.

The four A1-A4 extractions that were done are wired correctly (no duplicate definitions, no dead imports).
The problem is that large clusters of business logic were **never added to the original A-phase scope** and therefore were never extracted.

There is also one confirmed code duplication: `parseJsonBlock` exists as a private copy in `server/services/post-response-memory.js` AND as the canonical version in `server/services/llm-runtime-utils.js`.

---

### Audit Findings Summary

| Cluster | Location | Lines | Target Module |
|---------|----------|-------|---------------|
| `callLLMWithRuntime` + `callSubconsciousReranker` | server.js L1573-L1810 | ~210 | `server/services/llm-interface.js` |
| `normalizeSubconsciousRuntimeConfig`, `normalizeAspectRuntimeConfig`, `mapAspectKey`, `loadAspectRuntimeConfig`, `resolveProfileAspectConfigs` | server.js L1396-L1570 | ~209 | `server/services/config-runtime.js` |
| `createCoreMemory` + `createSemanticKnowledge` | server.js L749-L1006 | ~258 | `server/services/memory-operations.js` |
| `getSubconsciousMemoryContext` + helpers (`extractSubconsciousTopics`, `getSemanticPreview`, `getChatlogContent`, `buildSubconsciousContextBlock`) | server.js L680-L1391 | ~365 | `server/services/memory-retrieval.js` |
| `parseJsonBlock` duplicate | post-response-memory.js L1-17 | ~17 | Remove — import from llm-runtime-utils instead |

**Total extractable lines**: ~1059 lines (~44% of file)
**Expected server.js line count after cleanup**: ~1100-1200 lines (still large but within policy range for composition file)

---

### Re-evaluation Slice Checklist

- [x] A-Re0: Extend `tests/unit/boundary-cleanup-guards.test.js` with guards for all clusters below (write guard tests BEFORE extracting, to lock in expected state after extraction)
- [x] A-Re1: Extract `callLLMWithRuntime` + `callSubconsciousReranker` → `server/services/llm-interface.js`
- [x] A-Re2: Extract config runtime cluster → `server/services/config-runtime.js`
- [x] A-Re3: Extract memory operations (`createCoreMemory`, `createSemanticKnowledge`) → `server/services/memory-operations.js`
- [x] A-Re4: Extract memory retrieval (`getSubconsciousMemoryContext` + helpers) → `server/services/memory-retrieval.js`
- [x] A-Re5: Fix `parseJsonBlock` duplication — remove local copy from `post-response-memory.js`, import from `llm-runtime-utils`
- [x] A-Re6: Run full test suite. Verify no regressions. Confirm server.js drops below 1400 lines.

---

### Slice Definitions

#### A-Re0 — Boundary Guard Tests (write first)

Start criteria: Phase D done (current state).

Work:
1. In `tests/unit/boundary-cleanup-guards.test.js`, add source-scan assertions:
   - `callLLMWithRuntime` function definition must NOT appear in server.js
   - `callSubconsciousReranker` must NOT appear in server.js
   - `loadAspectRuntimeConfig` must NOT appear in server.js
   - `normalizeAspectRuntimeConfig` must NOT appear in server.js
   - `createCoreMemory` must NOT appear in server.js
   - `createSemanticKnowledge` must NOT appear in server.js
   - `getSubconsciousMemoryContext` must NOT appear in server.js
   - `parseJsonBlock` must NOT be defined (only imported) in post-response-memory.js
2. These tests will FAIL until each extraction slice completes — that is expected.

End criteria: Guards written. Tests fail (expected). Existing passing tests unaffected.

#### A-Re1 — LLM Interface Extraction

Start criteria: A-Re0 guards written.

Work:
1. Create `server/services/llm-interface.js`.
2. Move `callLLMWithRuntime(runtime, messages, opts, somaticAwareness)` from server.js (L1573-L1722).
3. Move `callSubconsciousReranker(candidates, userMessage, runtime)` from server.js (L1750-L1810).
4. Export both functions.
5. In server.js, replace definitions with `const { callLLMWithRuntime, callSubconsciousReranker } = require('./services/llm-interface')`.
6. Verify all internal call sites resolve correctly.

End criteria: Definitions removed from server.js. A-Re0 callLLMWithRuntime+callSubconsciousReranker guards pass. Full suite passes.

#### A-Re2 — Config Runtime Extraction

Start criteria: A-Re0 guards written (can parallel with A-Re1).

Work:
1. Create `server/services/config-runtime.js`.
2. Move `normalizeSubconsciousRuntimeConfig`, `normalizeAspectRuntimeConfig`, `mapAspectKey`, `loadAspectRuntimeConfig`, `resolveProfileAspectConfigs` from server.js (L1396-L1570).
3. Export all five.
4. In server.js, replace with require import.
5. All call sites of these functions must be verified (they are used throughout the chat pipeline).

End criteria: Definitions removed from server.js. A-Re0 guards for loadAspectRuntimeConfig + normalizeAspectRuntimeConfig pass. Full suite passes.

#### A-Re3 — Memory Operations Extraction

Start criteria: A-Re0 guards written (can parallel with A-Re1 and A-Re2).

Work:
1. Create `server/services/memory-operations.js`.
2. Move `createCoreMemory(entityId, memStorage, graphStorage, timelineLogger, text, opts)` from server.js (L749-L882).
3. Move `createSemanticKnowledge(entityId, memStorage, graphStorage, sourceMemId, text, language, opts)` from server.js (L884-L1006).
4. These functions receive their dependencies as parameters — no closed-over server.js globals allowed.
5. Export both. In server.js, replace definitions with require import.
6. In `server/services/post-response-memory.js`, update the call sites to use the imported versions.

End criteria: Definitions removed from server.js. A-Re0 guards for createCoreMemory + createSemanticKnowledge pass. Full suite passes.

#### A-Re4 — Memory Retrieval Extraction (largest)

Start criteria: A-Re3 done (memory operations must be separated first).

Work:
1. Create `server/services/memory-retrieval.js`.
2. Move the following from server.js:
   - `extractSubconsciousTopics(text, limit)` (L680-L704)
   - `getSemanticPreview(entityId, memStorage, memId)` (L706-L720)
   - `getChatlogContent(entityId, ltmStorage, ltmId)` (L722-L743)
   - `buildSubconsciousContextBlock(connections, chatlogContext)` (L981-L1040)
   - `getSubconsciousMemoryContext(entityId, memStorage, ..., userMessage)` (L1041-L1395)
3. These helpers are exclusively used by `getSubconsciousMemoryContext` — keep them in the same module file (not re-exported unless needed).
4. Export only `getSubconsciousMemoryContext`.
5. In server.js, replace definition with require import.
6. `getSubconsciousMemoryContext` uses `callSubconsciousReranker` (from A-Re1) and reads graph/index/storage via passed parameters.

End criteria: Definitions removed from server.js. A-Re0 getSubconsciousMemoryContext guard passes. Full suite passes. server.js drops to ~1100-1300 lines.

#### A-Re5 — parseJsonBlock Deduplication

Start criteria: A-Re1 done (llm-runtime-utils is canonical source).

Work:
1. In `server/services/post-response-memory.js`, remove the local `parseJsonBlock` definition (lines 1-17).
2. Add `const { parseJsonBlock } = require('./llm-runtime-utils');` at the top of the file.
3. Verify no behavioural difference (llm-runtime-utils version is strictly more robust).

End criteria: Single definition of parseJsonBlock in codebase. A-Re0 parseJsonBlock guard passes. Full suite passes.

#### A-Re6 — Final Verification

Start criteria: All A-Re0 through A-Re5 done.

Work:
1. Run full test suite — all A-Re0 boundary guards now pass.
2. Verify server.js line count is below 1400. If not, identify remaining extraction candidates and add to backlog.
3. Update WORKLOG ledger, CHANGELOG, and A-phases checklist.

End criteria: Full suite passes. server.js < 1400 lines. All A-Re0 guards green. Docs updated.

---

### Risk Notes

1. **`getSubconsciousMemoryContext` (A-Re4) is server.js' most complex function** — 346 lines with multi-step async logic, LLM calls, graph lookups, and trace writes. Extract it last (after A-Re1 and A-Re3 remove its dependencies) to keep each slice independently testable.
2. **`callLLMWithRuntime` is the hottest call path** — every LLM call in the system goes through it. A-Re1 must not change its signature or behaviour. Move only, no refactoring.
3. **Config runtime (A-Re2) is deeply tangled** — `loadAspectRuntimeConfig` reads from the request body AND global config. It uses `mapAspectKey` and `resolveProfileAspectConfigs` internally. All must move together.
4. **`createCoreMemory` is called from post-response-memory.js** — after A-Re3, update the import in that service too.

---

### Stop/Resume Snapshot (Required)

- Current phase: `UI Navigation Overhaul`
- Current slice: `Nav-2 (chat layout restructure)`
- Last completed slice: `Nav-2 — chat layout restructure (Advanced, Visualizer, sidebar Physical+Logs)`
- In-progress item: `none`
- Next action on resume: `Browser-verify all 6 changes; check Physical widget + Log in chat sidebar render correctly`

### Planned Queue Additions

Status: `Planned`

1. **Media Cost-Safe Test Ladder**
    - Goal: Minimize image/video generation spend during prompt/style experimentation.
    - Scope:
       - Add a documented draft-to-final ladder (low-res image drafts -> shortlist -> single short video render).
       - Define default test settings (smaller resolution, lower fps, shorter duration, fixed seed).
       - Add optional per-session soft budget guidance for creator workflow notes.
    - Outcome target: predictable low-cost iteration before paid final renders.

## A-Cleanup Phased Checklist (Source of Execution Truth)

Phase objective:
1. Decompose overloaded backend composition areas and enforce strict boundaries.

Slice checklist:
- [x] A1: Extract runtime lifecycle concerns from `server/server.js`.
- [x] A2: Extract post-response memory encoding and trace-linking from `server/server.js`.
- [x] A3: Extract response postprocessing from `server/server.js`.
- [x] A4: Extract remaining general-purpose helper blocks from `server/server.js` into dedicated util/service modules.
- [x] A5: Add boundary regression checks and close cleanup gate.

### A4 Definition (Planned)

Start criteria:
1. A1-A3 completed and documented.
2. Cleanup gate remains `In Progress`.

Work in-between:
1. Identify remaining helper candidates in `server/server.js` that are not composition concerns.
2. Extract helpers to module-owned targets.
3. Rewire call sites and preserve behavior.
4. Run full tests.
5. Update ledger + changelog.

End criteria:
1. Target helper cluster extracted.
2. No new boundary violations introduced.
3. Tests pass.
4. Ledger and checkbox updated.

## Version Tracking Policy

Purpose:
1. Keep release/version references consistent across code and docs.

Current working version:
1. `0.5.2-prealpha`

When version changes, update all of the following in the same slice:
1. `package.json` version field
2. `README.md` version banner/snapshot references
3. `CHANGELOG.md` section headers and release notes
4. `WORKLOG.md` current working version line
5. Any architecture/plan docs that explicitly mention version context

Required verification checklist before marking a version bump `Done`:
1. Search confirms no stale previous version strings in active docs
2. `CHANGELOG.md` has a matching release section
3. `README.md` headline/version text matches `package.json`
4. Worklog snapshot updated

Status labels for version work:
1. `Version-Planned`
2. `Version-In-Progress`
3. `Version-Done`

## Phase E — Runtime Quality Hardening

Status: `In Progress`

### Background

First live-system test exposed four bugs in the memory retrieval and UI pipeline:

1. **`doc_*` noise in subconscious context** — Document-ingestion chunk memories (IDs prefixed `doc_`) scored 0.965 for a simple conversational message and appeared in `[SUBCONSCIOUS MEMORY CONTEXT]` as EXPERIENCE memories, flooding the LLM context with irrelevant book content.
2. **`doc_*` entries in chatlog recall** — Document chunks stored in `ltm/` were being scanned as conversation archives and included in `[CONVERSATION RECALL]`, triggering an extra LLM chatlog-reconstruction pass and adding ~2s latency per turn.
3. **Corrupted memory summary leaking into conscious output** — A `user_profile_*` memory had `semantic` = `"User profile: Subconscious turn context for this user message only: [SUBCONSCIOUS MEMORY CONTEXT]"`. When displayed in the context block, the conscious LLM echoed back the system boilerplate string, causing the conscious output to begin with `[SUBCONSCIOUS MEMORY CONTEXT]`.
4. **Stale timing UI labels** — The `Sub` and `Conscious` labels both displayed the same value (the full parallel contributor batch wall-clock). This is a relic of the old serial pipeline — the new parallel architecture needs consolidated labels.

### Slice Checklist

- [x] E1: Filter `doc_*` entries from `contextConnections` (prevents doc chunks appearing as EXPERIENCE memories). Add boilerplate-summary guard to same filter (prevents corrupt user_profile echoing).
- [x] E2: Filter `doc_*` from chatlog recall topic collection and from `ltmFolders` directory scan (prevents doc chunks appearing in `[CONVERSATION RECALL]` and being reconstructed).
- [x] E3: Add boilerplate guard to `post-response-memory.js` — reject memory creation if `semantic` contains system boilerplate markers.
- [x] E4: Fix timing UI labels in `client/js/chat.js` — replace stale Sub/Conscious per-contributor labels with accurate parallel-phase and pipeline-stage labels.

### Implementation Ledger Entry

Status: `Done`

Scope delivered:
1. **E1** — `server/services/memory-retrieval.js`: After computing `contextConnections`, filter out all `doc_*` ID entries and any entry whose `semantic` summary contains system boilerplate markers (`[SUBCONSCIOUS MEMORY CONTEXT]`, `Subconscious turn context for this user message`). Fallback revised to skip corrupt/doc entries.
2. **E2** — Same file: Chatlog recall topic collection now excludes `doc_*` IDs (`!c.id.startsWith('doc_')`). `ltmFolders` directory scan now pre-filters `doc_*` named folders before stat check.
3. **E3** — `server/services/post-response-memory.js`: Before `createCoreMemory`, validate that `episodic.semantic` does not contain `[SUBCONSCIOUS MEMORY CONTEXT]`, `[CONVERSATION RECALL]`, `[INTERNAL-RESUME]`, or similar boilerplate — if so, skip memory creation with a warning.
4. **E4** — `client/js/chat.js`: Timing display now uses `contributors_parallel_ms` / `refinement_ms` / `orchestrator_final_ms` keys with correct labels (`Contributors (∥)`, `Refinement (2B)`, `Final`) instead of the stale `Sub/Dream/Conscious/Merge` labels from the old serial pipeline.

Files changed:
1. `server/services/memory-retrieval.js`
2. `server/services/post-response-memory.js`
3. `client/js/chat.js`

Validation:
1. Full test suite: 318 pass, 0 fail.

Root causes addressed:
- `doc_*` memories score 0.965 in subconscious retrieval because document ingestion stores chunks with high importance (1.0) and decay (1.0). They now never appear in the [SUBCONSCIOUS MEMORY CONTEXT] prompt block.
- `doc_*` folders in `ltm/` (where document ingestion stores chunks) are excluded from chatlog recall scan — eliminating the spurious V4-chatlog-reconstruction LLM call that added ~2s latency per turn.
- Corrupted `user_profile_*` memory (whose semantic summary accidentally captured the system context block) is now filtered from display AND future creation of such entries is blocked.
- Timing UI was showing `Sub: 11886ms · Conscious: 11886ms` (identical values) because both used the same `contributors_parallel_ms`. Labels now reflect the actual pipeline stages.

### Stop/Resume Snapshot

- Current phase: Documentation Truth Sync
- Current slice: Docs-Truth-Review-1 (complete)
- Last completed slice: Docs-Truth-Review-1 — full code-vs-doc review, source-of-truth docs refreshed, REM-Architecture-v0.6.0.html aligned to runtime
- In-progress item: none
- Next action on resume: Continue WebGUI artifact cleanup and queue any remaining doc drift into next docs slice

---

## Current Phase Snapshot

1. Cleanup gate (boundary + bloat clampdown): `Done`
2. Architecture correction live-loop refactor: `Done`
3. Dream split hardening (live intuition vs maintenance pipeline): `Done`
4. Policy and safety hardening (O2 escalation controls): `Done`
5. Worker subsystem pilot (main-role binding): `Done`
6. Phase A re-evaluation and remediation: `Done`
7. Runtime quality hardening: `Done`
8. Pipeline reflow — Dream→Conscious, Orchestrator→Reviewer: `Done` (plan: `Documents/current/PLAN-PIPELINE-REFLOW-v1.md`)

## Implementation Ledger

### 2026-03-13 - Full Documentation Truth Sync + Architecture Deck Refresh (Docs-Truth-Review-1)

Status: `Done`

Scope delivered:
1. **Full code-vs-doc review** over core runtime modules (`orchestrator`, contracts, services, routes) against source-of-truth docs.
2. **Source-of-truth docs updated**:
   - `Documents/current/ARCHITECTURE-OVERVIEW.md`
   - `Documents/current/MEMORY-SYSTEM.md`
   - `Documents/current/CONTRACTS-AND-SCHEMAS.md`
   - `Documents/current/OPEN-ITEMS-AUDIT.md`
   - `README.md`
3. **Architecture deck updated** (`Documents/REM-Architecture-v0.6.0.html`):
   - removed stale preAlpha wording
   - corrected orchestrator flow to `1A + 1D → 1C → Final (2B inlined)`
   - corrected route/module count and key route examples
   - corrected memory schema wording and document-ingest retrieval behavior notes
4. **Internal source comments updated** (`server/brain/core/orchestrator.js`) to match real pipeline execution order.

Validation:
1. Drift verification via targeted search and source reads completed.
2. No runtime behavior changes introduced; documentation and comments only.

[BOUNDARY_OK] — Documentation/comment synchronization only; no cross-layer logic migration required.

### 2026-03-13 - Version 0.6.0 Release (Version-0.6.0)

Status: `Done`

Scope delivered:
1. **Version bump across all files** — `package.json`, all `client/js/*.js` headers, `client/css/*.css` comment headers, `client/index.html` UI badge, `server/server.js` startup banner, `server/brain/generation/aspect-prompts.js` and `core-life-generator.js` entity self-awareness strings all updated from `v0.4.0-pre` / `v0.5.2-prealpha` to `v0.6.0`.
2. **Chat message font bug fixed** (`client/js/chat.js`, `client/js/app.js`, `client/js/sleep.js`) — content span now given `chat-content` class; all `querySelector('span:last-child')` sites updated to `.chat-content`. Prevents assistant messages after first response from rendering in the JetBrains Mono model-tag pill font.
3. **CHANGELOG promoted** — `[Unreleased]` section promoted to `[0.6.0] - 2026-03-13`; fresh `[Unreleased]` section added above.
4. **README updated** — version badge, Release Snapshot heading and bullet list updated to reflect 0.6.0 scope; Known Limitations cleaned of "prealpha research system" language.
5. **Pushed to main.**

Files changed:
1. `package.json`
2. `client/index.html`
3. `client/js/app.js`, `chat.js`, `pipeline.js`, `auth.js`, `memory-ui.js`, `sleep.js`, `skills-ui.js`
4. `client/css/ui.css`, `ui-v2.css`, `theme.css`, `icons.css`
5. `server/server.js`
6. `server/brain/generation/aspect-prompts.js`, `core-life-generator.js`
7. `CHANGELOG.md`
8. `README.md`
9. `WORKLOG.md`

[BOUNDARY_OK] — Version bump and docs only; no business logic modified.

### 2026-03-13 - Skills Token-Gating + Trigger System (Skills-Gate-1)

Status: `Done`

Scope delivered:
1. **Skills/tools docs gated behind explicit commands** (`server/brain/generation/aspect-prompts.js`): `getConsciousPrompt()` extended with a 4th `options = {}` parameter. Skills, workspace-tools, and task-planning sections are omitted from the prompt by default (zero tokens). They are only included when `options.activeSkillsSection` or `options.includeWorkspaceTools` is truthy.
2. **Command detection in Orchestrator** (`server/brain/core/orchestrator.js`): `runConscious()` now parses `/skill <trigger>` (captures first word after `/skill`, command part case-insensitive) and `/tool` from the user message. Both flags are passed to `getConsciousPrompt` as options. Added `this.getSkillContext` callback slot to constructor.
3. **Exact case-sensitive trigger dispatch** (`server/brain/skills/skill-manager.js`): `buildSkillsPromptFor(trigger)` new method — exact string comparison on `skill.trigger || skill.name`, no fuzzy/partial/lowercase fallback. Returns XML block or null.
4. **Trigger field on skills** (`server/brain/skills/skill-manager.js`): `loadAll()` reads `trigger` from SKILL.md frontmatter; `list()` exposes it; `createSkill()` accepts `options.trigger` and writes it to frontmatter. Recommended: no spaces, use hyphens.
5. **Server wired** (`server/server.js`): `getSkillContext: (skillName) => skillManager ? skillManager.buildSkillsPromptFor(skillName) : null` passed into Orchestrator constructor options.
6. **Skills routes passthrough** (`server/routes/skills-routes.js`): `trigger` destructured from POST body and passed to `sm.createSkill()`.
7. **WebGUI create modal** (`client/index.html`): Trigger input field added (`id="newSkillTrigger"`) with explanation and note about exact/case-sensitive matching. How-to guide completely rewritten to explain `/skill <trigger>` and `/tool` commands.
8. **Skill detail trigger display** (`client/index.html`): `<code id="skillDetailTrigger">` added to skill detail panel status badges row showing the `/skill <trigger>` invoke command.
9. **Skills UI wired** (`client/js/skills-ui.js`): Skill cards show a monospace `/skill <trigger>` badge. Detail panel populates `skillDetailTrigger`. `executeCreateSkill()` reads and POSTs trigger field; clears it on success.
10. **README skills section** (`README.md`): Fully rewritten — explains `/skill <trigger>` invocation, exact/case-sensitive warning, `/tool` command, built-in skills table with trigger column, creating a skill with trigger field.

Token savings:
- Default turn: ~750 tokens removed per turn (skills + workspace tools + task-planning sections no longer injected unless commanded).
- `/skill <trigger>` turn: only the matching skill XML block injected (~50-300 tokens depending on skill size).
- `/tool` turn: workspace tools docs only (~500 tokens), strictly on demand.

Files changed:
1. `server/brain/generation/aspect-prompts.js`
2. `server/brain/core/orchestrator.js`
3. `server/brain/skills/skill-manager.js`
4. `server/routes/skills-routes.js`
5. `server/server.js`
6. `client/index.html`
7. `client/js/skills-ui.js`
8. `README.md`

Validation:
1. Full test suite: 318 pass, 0 fail.

[BOUNDARY_OK] — Backend changes in `server/brain/**`, `server/routes/**`, `server/server.js` (composition only). Client changes in `client/**`. No layer violations.

### 2026-03-13 - Pipeline Reflow (Pipeline-Reflow-F1/F3)

Status: `Done`

Scope delivered:
1. **Promise chain rewired** (`server/brain/core/orchestrator.js`): `consciousPromise` now does `Promise.all([subconsciousPromise, dreamPromise]).then(...)` — Conscious starts only after both 1A and 1D complete.
2. **Dream output piped into Conscious** (`server/brain/core/orchestrator.js`): `runConscious()` receives `options.dreamText` from the resolved 1D output; `conciseDreamHint` is now real 1D content (not a static instruction string). `null` is passed when unavailable, which the prompt template handles by suppressing the dream section.
3. **Orchestrator merge prompt restructured** (`server/brain/core/orchestrator.js`): Orchestrator now receives Conscious draft as primary input + full copy of what Conscious had (1A context, 1D output, turn signals). REVIEW DIRECTIVE replaces SYNTHESIS DIRECTIVE — Orchestrator shapes HOW it is said, not WHAT.
4. **Orchestrator system prompt rewritten** (`server/brain/generation/aspect-prompts.js`): `getOrchestratorPrompt()` defines reviewer/voicer role explicitly. Removed "synthesize the inner processing" language; added "The Conscious reasoning is the answer — voice it authentically, do not re-derive it."
5. **Dream-split guard test updated** (`tests/unit/dream-split-guards.test.js`): Updated guard regex to match new code structure (`runDreamIntuition` upstream of `Promise.all`). Guard intent preserved — verifies `runDreamIntuition` is the live-loop contributor.
6. **Pipeline docs updated** (`Documents/current/PIPELINE-AND-ORCHESTRATION.md`): Overview, diagram, and contributor phase descriptions updated to match new flow.
7. **BugTest entry added** (`Documents/current/BUGTEST-NOTES.md`): BT-2026-03-13-04 queued for manual smoke testing.

Files changed:
1. `server/brain/core/orchestrator.js`
2. `server/brain/generation/aspect-prompts.js`
3. `tests/unit/dream-split-guards.test.js`
4. `Documents/current/PIPELINE-AND-ORCHESTRATION.md`
5. `Documents/current/BUGTEST-NOTES.md`
6. `Documents/current/CHANGELOG.md`

Validation:
1. Full test suite: 318 pass, 0 fail.

[BOUNDARY_OK] — All changes in `server/brain/**` and `tests/**`; no route/client boundary violations.

### 2026-03-13 - Pipeline Diagram Flow Sync (Docs-Flow-Sync-1)

Status: `Done`

Scope delivered:
1. **Pipeline docs synced** (`Documents/current/PIPELINE-AND-ORCHESTRATION.md`): updated stage diagram and text to match current orchestrator flow (`1A + 1D` parallel, `1C` after `1A` with reused memoryContext, final synthesis with inlined refinement).
2. **README diagram synced** (`README.md`): per-message pipeline block updated to same runtime flow ordering.

Files changed:
1. `Documents/current/PIPELINE-AND-ORCHESTRATION.md`
2. `README.md`

Validation:
1. Manual code-vs-doc check against `server/brain/core/orchestrator.js` confirms ordering and stage descriptions are now aligned.

[BOUNDARY_OK] — Documentation-only change; no runtime behavior modified.

### 2026-03-13 - Conscious Active Context Reuse (Con-ActiveCtx-2)

Status: `Done`

Scope delivered:
1. **Removed duplicate retrieval** (`server/brain/core/orchestrator.js`): conscious no longer calls `getMemoryContext(userMessage)` directly.
2. **Reused same-turn subconscious context** (`server/brain/core/orchestrator.js`): orchestrator now passes `subconsciousRaw.memoryContext` into `runConscious(...)` as `options.memoryContext`.
3. **Active context feed preserved** (`server/brain/core/orchestrator.js`): conscious still receives bounded active recall hints (top memories/chatlogs), now sourced from reused subconscious context.

Files changed:
1. `server/brain/core/orchestrator.js`

Validation:
1. Diagnostics check: no errors in `server/brain/core/orchestrator.js`.

[BOUNDARY_OK] — Backend orchestration/prompt wiring in `server/**`; no route/client boundary violations.

### 2026-03-13 - Conscious Active Recall Context (Con-ActiveCtx-1)

Status: `Done`

Scope delivered:
1. **Conscious active recall feed added** (`server/brain/core/orchestrator.js`): `runConscious()` now fetches current recall context via `getMemoryContext(userMessage)` and builds a bounded `[ACTIVE RECALL CONTEXT]` section.
2. **Memory and chatlog context piped into conscious briefing** (`server/brain/core/orchestrator.js`): concise top recalled memory lines (up to 6) and related chatlog snippets (up to 3) are appended to the conscious-side briefing input.
3. **Existing relationship feed preserved** (`server/brain/core/orchestrator.js`): active relationship signal remains in the same conscious briefing payload.

Files changed:
1. `server/brain/core/orchestrator.js`

Validation:
1. Diagnostics check: no errors in `server/brain/core/orchestrator.js`.

[BOUNDARY_OK] — Backend orchestration/prompt wiring in `server/**`; no route/client boundary violations.

### 2026-03-13 - BugTest Loop Introduction (BugTest-Loop-1)

Status: `Done`

Scope delivered:
1. **New active BugTest notes doc** (`Documents/current/BUGTEST-NOTES.md`): created a live queue, status model, checklist template, and initial queued items for `Rel-Flow-1` and `Mem-Recall-Tuning-1`.
2. **WORKLOG policy update** (`WORKLOG.md`): added `BugTest Notes Loop` section defining when bug testing is required vs optional and making queue updates part of slice workflow.

Files changed:
1. `Documents/current/BUGTEST-NOTES.md`
2. `WORKLOG.md`

Validation:
1. BugTest notes file exists and includes active queue entries for current high-impact slices.

[BOUNDARY_OK] — Process/documentation-only change; no runtime behavior altered.

### 2026-03-13 - Memory Recall Cap Tuning (Mem-Recall-Tuning-1)

Status: `Done`

Scope delivered:
1. **Pull max raised** (`server/services/memory-retrieval.js`): `getSubconsciousMemoryContext(userMessage, limit = 36)` (was 24).
2. **Prompt context cap raised** (`server/services/memory-retrieval.js`): `contextConnections` cap increased to 12 (was 8) before context block build.
3. **Chatlog recall cap raised** (`server/services/memory-retrieval.js`): top relevant `ltm` chatlogs included increased to 3 (was 1).

Files changed:
1. `server/services/memory-retrieval.js`

Validation:
1. Diagnostics check: no errors in `server/services/memory-retrieval.js`.

[BOUNDARY_OK] — Backend retrieval tuning confined to `server/**`; no route/client boundary violations.

### 2026-03-13 - Conscious Relationship Context Plumbing (Rel-Flow-1)

Status: `Done`

Scope delivered:
1. **Conscious input now includes relationship state** (`server/brain/core/orchestrator.js`): `orchestrate()` now passes `entityId` into `runConscious(...)` so conscious has deterministic access to active entity relationship data.
2. **Compact relationship signal injected into conscious briefing** (`server/brain/core/orchestrator.js`): `runConscious()` now loads active-user relationship state via `relationship-service` and appends a bounded `[RELATIONSHIP SIGNAL]` block (feeling, trust, rapport, roles, top beliefs, summary) into the concise briefing used by `getConsciousPrompt(...)`.
3. **No pipeline order change**: Subconscious, Conscious, and Dream still run in parallel; this slice only closes the missing context path into conscious composition.

Files changed:
1. `server/brain/core/orchestrator.js`

Validation:
1. Diagnostics check: no errors in `server/brain/core/orchestrator.js`.

[BOUNDARY_OK] — Backend orchestration change in `server/**`; no route placement or client boundary violations.

### 2026-03-12 - Chat Layout Restructure (Nav-2)

Status: `Done`

Scope delivered:
1. **Advanced as regular nav item** (`client/index.html`): Replaced the collapsible `nav-group` (toggle + arrow + nested item) with a simple `nav-item` button. Uses a gear icon and "Sleep & Tokens" label. Opens as a full page tab like everything else — no dropdown.
2. **Neural replaced with Visualizer** (`client/index.html`): Changed the Neural nav-item to "Visualizer" with `data-tab="visualizer"`. Replaced the old `tab-neural` Three.js container with a new `tab-visualizer` that embeds `/visualizer.html` in an iframe. No more popup window.
3. **openVisualizer redirect** (`client/js/chat.js`): Changed `openVisualizer()` from `window.open` popup to `switchMainTab('visualizer')`.
4. **Workspace + Activity moved to nav sidebar** (`client/index.html`): Added Workspace and Entity Activity as top-level nav-items. Created corresponding `tab-workspace` and `tab-activity` tab-content panels with the content that was previously in the chat sidebar.
5. **Physical nav removed from sidebar**: Physical tab no longer in nav — its compact widget is now always visible in chat right panel.
6. **Chat right panel: Physical + Logs** (`client/index.html`): Replaced the old chat-sidebar (Workspace/Activity/Neural View) with: (a) Physical body compact widget — always visible, shows overall state + per-metric rows, (b) Pipeline Log — collapsed by default, uses `sidebar-section` pattern.
7. **Pipeline log relocated** (`client/index.html`, `client/js/app.js`, `client/js/chat.js`): Moved from `chat-main` (`.lp` block) to `chat-sidebar` as a collapsible sidebar section. Updated `lg()`, `toggleLog()`, `autoOpenLog()`, `addSystemToLog()`, and `resetAll()` to target `sidebarLogContent` instead of `lgB`.
8. **Chat Physical widget** (`client/js/app.js`): Added `updateChatPhysical()` and `initChatPhysical()` functions. Fetches somatic state on load, listens for SSE `SOMATIC_UPDATE` events. Shows overall status + per-metric compact rows.
9. **All dropdowns start closed**: Log starts with `collapsed` class. Physical is always visible (no toggle needed). No nav-groups remain.

Files changed:
1. `client/index.html` (nav sidebar, chat layout, tab panels)
2. `client/css/ui-v2.css` (no changes needed — existing styles support new structure)
3. `client/js/app.js` (log functions, physical widget, init)
4. `client/js/chat.js` (openVisualizer, lgB→sidebarLogContent)

Validation:
1. Full test suite: 318 pass, 0 fail.

[BOUNDARY_OK] — Client-only change; no server logic modified.

### 2026-03-12 - Collapsible Nav Sidebar (Nav-1)

Status: `Done`

Scope delivered:
1. **Nav sidebar** (`client/index.html`): Replaced the horizontal tab bar (9 tabs + Advanced dropdown) and the old model-sidebar with a single collapsible vertical sidebar. Contains: entity/profile zone at top, main nav items (Chat, Skills, Settings, Neural, Physical, Dreams, Life Diary, Dream Diary, Documents), and an expandable Advanced group (Sleep & Tokens).
2. **Advanced panel** (`client/index.html`): Converted the `advancedMenu` floating dropdown into a regular `tab-content` panel (`tab-advanced`), so it shows in the main content area when clicked from the sidebar.
3. **CSS** (`client/css/ui-v2.css`): Added `.nav-sidebar` styles with collapsed/expanded states (220px → 52px). Added `body.nav-collapsed` rules for `.app` and `.hdr` padding transitions. Updated `.hdr` to offset for sidebar. Hidden old `.tab-navigation` and `.model-sidebar` via `display: none !important`. Updated responsive breakpoint to auto-collapse.
4. **JS** (`client/js/app.js`): Added `toggleNavSidebar()`, `toggleNavGroup()`, `syncNavSidebarEntities()`, `syncNavSidebarProfiles()`. Updated `switchMainTab` to clear `.nav-item` active states. Updated `toggleAdvancedMenu` to redirect to `switchMainTab('advanced')`.

Files changed:
1. `client/index.html` (nav sidebar + advanced panel conversion)
2. `client/css/ui-v2.css` (sidebar styles, .app/.hdr offsets, responsive)
3. `client/js/app.js` (sidebar toggle, tab switching, entity/profile sync)

Validation:
1. Full test suite: 318 pass, 0 fail.
2. HTML div balance verified: 487 opens, 487 closes.

[BOUNDARY_OK] — Client-only change; no server logic modified.

### 2026-03-12 - Settings UI Simplification (Settings-1)

Status: `Done`

Scope delivered:
1. **HTML overhaul** (`client/index.html`): Replaced the entire LLM Provider Section (4 provider tabs × 2 sub-tabs each + 5 preset tabs + 5 connect buttons + inheritance logic) with a simple two-panel UI. OpenRouter: enter API key → pick/paste model. Ollama: enter address → fetch models → pick from dropdown. Preset buttons (Best/Fast/Cheap/Balanced) auto-fill the model. Advanced per-aspect overrides collapsed in a `<details>` toggle.
2. **JS functions** (`client/js/app.js`): Added `simplePickProvider`, `simpleApplyPreset`, `simpleFetchOllamaModels`, `simpleSaveConfig`, `simpleShowStatus`, `initSimpleProviderUI`. Config hydration reads from `savedConfig` on page load. Saves all 4 aspects via existing `/api/entity-config` endpoint (no server changes needed).

Root cause of change:
- Old per-aspect settings UI was confusing and produced invalid configs (e.g. type:"ollama" with openrouter endpoint), leading to 401 auth errors.

Files changed:
1. `client/index.html` (LLM Provider Section replaced ~lines 886-970)
2. `client/js/app.js` (6 new functions added after `initSettingsModelSuggestions`)

Validation:
1. Full test suite: 318 pass, 0 fail.
2. Server API compatibility: `simpleSaveConfig` uses existing `/api/entity-config` + `normalizeIncomingRuntimeConfig` — no server changes required.

[BOUNDARY_OK] — Client-only change; no server logic modified.

### 2026-03-12 - Namespace Deduplication: Root memories/ Isolation

Status: `Done`

Scope delivered:
1. **Timeline logger resolver** (`server.js`): Stopped returning `rootDir: MEM_DIR` when no entity is active or when entity path resolution fails. System events now write to `memories/logs/timeline-system.ndjson` (clearly namespaced), and entity events always target `entities/entity_<id>/memories/logs/timeline.ndjson`.
2. **Memory routes** (`server/routes/memory-routes.js`): Removed all `ctx.MEM_DIR` fallback paths for entity-type data. Write operations (`postMemory`, `postSessionMeta`, `postPersona`) now return HTTP 409 when no entity is active instead of writing orphaned data to root `memories/`. Read operations (`getStatus`, `getMemories`, `getPersona`, `getMemoryHeal`, `getMemoryStats`) return empty/defaults when no entity is active. Only `getSystemPrompt` retains a root `memories/system-prompt.txt` fallback as an explicit default template.
3. **MEM_DIR documentation** (`server.js`): Updated comments to clarify root `memories/` is for system-level defaults only (default prompt template, system timeline logs). Entity-specific data lives exclusively in `entities/entity_<id>/memories/`.

Root cause:
- `MEM_DIR` (root `memories/`) was serving as a fallback for all entity-level operations, creating a "ghost entity" namespace that duplicated the structure inside `entities/entity_*/memories/`. This caused confusion with files like `timeline.ndjson`, `persona.json`, `mood.txt`, etc. appearing in both locations.

Files changed:
1. `server/server.js` (entity resolver, MEM_DIR comments)
2. `server/routes/memory-routes.js` (9 MEM_DIR fallback removal edits)

Validation:
1. Full test suite: 318 pass, 0 fail.

[BOUNDARY_OK] — entity data stays in `entities/`, system defaults stay in root `memories/`.

### 2026-03-11 - Server Config Ghost Dir Removal

Status: `Done`

Scope delivered:
1. Identified two `Config/` directories in the project: `<root>/Config/` (canonical, used by `server.js`) and `<root>/server/Config/` (orphan, never referenced, empty).
2. Removed `server/Config/` entirely.

Active config path (unchanged): `<root>/Config/ma-config.json`
Legacy migration path (unchanged): `<root>/ma-config.json` → auto-copied to `Config/` on first load.

Files changed:
1. `server/Config/` (deleted — empty directory, dead code path)

Validation:
1. Server starts without errors. No references to `server/Config/` exist in any source file.

### 2026-03-11 - Startup ReferenceError Fix (getSemanticPreview / getChatlogContent)

Status: `Done`

Scope delivered:
1. `server.js` `ctx` object referenced `getSemanticPreview` and `getChatlogContent` as bare names after Phase A Re-evaluation extracted them into `server/services/memory-retrieval.js`.
2. Added both names to the `createMemoryRetrieval` destructure so they are bound before the `ctx` object is constructed.

Files changed:
1. `server/server.js` — `createMemoryRetrieval` destructure extended from 2 to 4 names.

Validation:
1. Server starts without `ReferenceError`. All prior tests remain 318 pass, 0 fail.

### 2026-03-11 - Live-Loop Refactor Hardening

Status: `Done`

Scope delivered:
1. Fixed budget guard wiring: cumulative contributor token usage (subconscious + conscious + dream + refinement) is now passed to `runOrchestrator` as `tokenUsageSoFar`, enabling `enforceBudgetGuard` to correctly block O2 escalation when the pipeline has already consumed its budget.
2. Added H2 artifact shape tests to `tests/integration/orchestrator.test.js`: all parallel contributor artifacts (`oneA`, `oneC`, `oneD`, `twoB`), `turnSignals`, `escalation` key structure, `workerDiagnostics` key structure, `timing` keys, `tokenUsage` keys.
3. Added H3 contributor failure isolation tests: `orchestrate()` completes without throwing and returns valid fallback strings for all 4 artifacts when `callLLM` always throws.
4. Added H4 budget guard integration tests: direct `runOrchestrator` call with over-budget `tokenUsageSoFar` sets `_escalation.budgetBlocked = true` and reason contains `'budget-cap'`; under-budget usage sets `budgetBlocked = false`.

Files changed:
1. `server/brain/core/orchestrator.js` (budget-guard wiring fix — 10 lines added to `orchestrate()`)
2. `tests/integration/orchestrator.test.js` (14 new tests added: H2 ×6, H3 ×2, H4 ×2, plus existing 14 = 28 total)

Validation:
1. Full test suite: 318 pass, 0 fail.

### 2026-03-11 - Phase D (Worker Subsystem Pilot)

Status: `Done`

Scope delivered:
1. Worker output contract module (`server/contracts/worker-output-contract.js`) with `validateWorkerOutput` and `normalizeWorkerOutput`. Required fields: `summary`, `signals`, `confidence`. Optional: `memoryRefs`, `nextHints`.
2. Worker registry (`server/brain/core/worker-registry.js`) — in-memory Map with `registerWorker`, `unregisterWorker`, `getWorker`, `listWorkers`, `clearRegistry`.
3. Worker dispatcher (`server/brain/core/worker-dispatcher.js`) — `invokeWorker` wraps worker LLM call in latency guard, validates contract, emits D5 diagnostics bus events (`worker_invoked`, `worker_success`, `worker_fallback`), returns null on any failure.
4. Orchestrator wiring: `workerRegistry` constructor option added; `runSubconscious`, `runConscious`, `runDreamIntuition` each check registry first and early-return worker output (tagged `_source: 'worker'`) if available.
5. `innerDialog.artifacts.workerDiagnostics` added: per-contributor `{ used, entityId }` object present on every orchestration call.
6. 46 regression tests in `tests/unit/worker-subsystem.test.js` covering contract validation, normalisation, registry CRUD, dispatcher valid/fallback/timeout/bus-event paths, and integration guards.

Files changed:
1. `server/contracts/worker-output-contract.js` (new)
2. `server/brain/core/worker-registry.js` (new)
3. `server/brain/core/worker-dispatcher.js` (new)
4. `server/brain/core/orchestrator.js` (updated — require, constructor, 3 contributor method injections, innerDialog.artifacts)
5. `tests/unit/worker-subsystem.test.js` (new)

Validation:
1. Full test suite passed (`300 pass, 0 fail`).

### 2026-03-11 - Phase C (Escalation Guardrails)

Status: `Done`

Scope delivered:
1. `shouldEscalateO2` now returns `{ escalate: boolean, reason: string }` instead of a bare boolean. Reason vocabulary: `'high-tension'`, `'error-constraint-combo'`, `'planning-implementation-combo'`, `'user-requested-depth'`, `'none'`.
2. `chooseO2Runtime` updated to consume `decision.escalate` from the new shape.
3. `enforceBudgetGuard` now returns `{ ok: true, reason: null }` (previously omitted `reason` field on success).
4. New `enforceLatencyGuard(callFn, maxMs)` function in `orchestration-policy.js`: wraps any async call in a timeout race; rejects with `{ timedOut: true, maxMs }` on ceiling hit; defaults to 35 000 ms.
5. `runOrchestrator` in `orchestrator.js` wired with all three guardrails:
   - **C2 budget guard**: evaluates `tokenUsageSoFar` before choosing model; over-budget forces reason `'budget-cap-<…>'` and blocks escalation.
   - **C3 latency guard**: O2 synthesis call wrapped in `enforceLatencyGuard`; on timeout, falls back to `defaultRuntime` then to conscious output.
   - **C4 telemetry**: returns `_escalation: { reason, modelUsed, timedOut, budgetBlocked, latencyMs, tokenCost }` from `runOrchestrator`.
6. `innerDialog.artifacts.escalation` populated from `finalResponse._escalation` so all call sites receive the telemetry.
7. 31 regression tests in `tests/unit/escalation-guardrails.test.js`: reason coverage for all triggers, budget cap paths, latency timeout path, fallback error pass-through, integration call-site guards.

Files changed:
1. `server/brain/core/orchestration-policy.js` (updated — `shouldEscalateO2`, `chooseO2Runtime`, `enforceBudgetGuard`, `enforceLatencyGuard` new, exports updated)
2. `server/brain/core/orchestrator.js` (updated — imports, `runOrchestrator` full body, `innerDialog.artifacts.escalation`)
3. `tests/unit/escalation-guardrails.test.js` (new)

Validation:
1. Full test suite passed (`254 pass, 0 fail`).

### 2026-03-11 - Phase B (Dream Split Hardening)

Status: `Done`

Scope delivered:
1. Guard tests confirming live orchestrator loop uses `runDreamIntuition()` only and adapter has no memory-write call sites.
2. Created `dream-maintenance-selector.js` with deterministic candidate scoring across emotion, learn tags, error markers, staleness, and graph degree dimensions.
3. Created `dream-link-writer.js` with dream-to-source link persistence and cognitive bus event emission.
4. Wired selector into `phase-dreams.js` replacing inline `getMostImportant` heuristic.
5. Wired link writer into `phase-dreams.js` after each dream commit.
6. 34 unit tests covering selector scoring, selection filtering, bucketing, and link writer paths.

Files changed:
1. `tests/unit/dream-split-guards.test.js` (new)
2. `tests/unit/dream-maintenance.test.js` (new)
3. `server/brain/cognition/dream-maintenance-selector.js` (new)
4. `server/brain/knowledge/dream-link-writer.js` (new)
5. `server/brain/cognition/phases/phase-dreams.js` (updated — selector + link writer wired)

Validation:
1. Full test suite passed (`224 pass, 0 fail`).

### 2026-03-11 - Slice A5

Status: `Done`

Scope delivered:
1. Added boundary regression tests enforcing service delegation patterns in `server/server.js`.
2. Verified cleanup boundary guardrails with test coverage.

Files changed:
1. `tests/unit/boundary-cleanup-guards.test.js` (new)

Validation:
1. Full tests passed (`190 pass, 0 fail`).

Cleanup gate impact:
1. Boundary regression checks now exist and pass.
2. Cleanup gate closure criteria satisfied.

### 2026-03-11 - Slice A4

Status: `Done`

Scope delivered:
1. Extracted remaining shared LLM runtime helper cluster from `server/server.js` into dedicated service module.
2. Rewired server runtime path to consume service-owned helpers.

Files changed:
1. `server/services/llm-runtime-utils.js` (new)
2. `server/server.js` (updated)

Validation:
1. Full tests passed (`190 pass, 0 fail`).

Cleanup gate impact:
1. Reduced helper bloat in `server/server.js`.
2. Improved composition-only server ownership boundaries.

### 2026-03-11 - Slice A3

Status: `Done`

Scope delivered:
1. Extracted natural-chat response postprocessing out of `server/server.js`.
2. Moved humanize/quick-clean/sentence-cap/chunking behavior into dedicated service.

Files changed:
1. `server/services/response-postprocess.js` (new)
2. `server/server.js` (updated wiring + removed inline natural-chat postprocessing block)

Validation:
1. Full tests passed (`186 pass, 0 fail`).

Cleanup gate impact:
1. Reduced backend composition-layer bloat further.
2. Strengthened boundary between orchestration flow and response postprocessing concerns.

### 2026-03-11 - Slice A2

Status: `Done`

Scope delivered:
1. Extracted post-response memory encoding and trace-linking pipeline out of `server/server.js`.
2. Moved dual memory encoding, fallback repair, semantic memory creation, and trace-link updates into dedicated service.

Files changed:
1. `server/services/post-response-memory.js` (new)
2. `server/server.js` (updated wiring + removed inlined memory encoding block)

Validation:
1. Full tests passed (`186 pass, 0 fail`).

Cleanup gate impact:
1. Further reduced backend business logic bloat in server composition layer.
2. Improved boundary alignment for cognition-memory post-processing.

### 2026-03-11 - Slice A1

Status: `Done`

Scope delivered:
1. Extracted runtime lifecycle concerns out of `server/server.js` into a dedicated service module.
2. Moved Telegram startup flow and graceful shutdown flow behind service boundaries.
3. Reduced direct lifecycle/business bloat in server composition layer.

Files changed:
1. `server/services/runtime-lifecycle.js` (new)
2. `server/server.js` (updated wiring + removed inlined lifecycle implementations)

Validation:
1. Full tests passed (`186 pass, 0 fail`).

Cleanup gate impact:
1. Route/composition boundary direction improved (`server/server.js` as composition shell).
2. Additional extraction passes still required for full gate closure.

### 2026-03-11 - Slice A

Status: `Done`

Scope delivered:
1. Added turn-signal JS extraction module.
2. Added contributor output validation contracts.
3. Added orchestration policy router for stage-based model escalation decisions.
4. Added live dream-intuition adapter.
5. Refactored orchestrator live loop to parallel contributors with artifacts `1A`, `1C`, `1D`, `2B`.

Files changed:
1. `server/brain/utils/turn-signals.js`
2. `server/contracts/contributor-contracts.js`
3. `server/brain/core/orchestration-policy.js`
4. `server/brain/cognition/dream-intuition-adapter.js`
5. `server/brain/core/orchestrator.js`

Validation:
1. Full tests passed (`186 pass, 0 fail`).

## Next Planned Slices

### Slice A1 - Boundary Cleanup and Decomposition

Status: `In Progress`

1. Enforce route/business logic split (`server/server.js` -> modular targets). (partial: runtime lifecycle extracted)
   - additional progress: post-response memory encoding extracted to service module
2. Enforce frontend/backend boundary checks for new additions.
3. Add missing contracts and validators where contributor outputs are consumed.
4. Keep large-file touch minimal unless extraction happens in the same slice.

### Slice A4 - Remaining Helper Extraction

Status: `Planned`

1. Extract remaining non-composition helper blocks from `server/server.js`.
2. Keep `server/server.js` focused on wiring/composition/dispatch.
3. Validate no behavior regressions with full tests.
4. Update checkboxes and ledger immediately upon completion.

## Remaining Cleanup Plan (Execution View)

This is the active plan for everything left before cleanup gate closure.

### A4 - Remaining Helper Extraction

Status: `Planned`

Scope:
1. Extract one remaining non-composition helper cluster from `server/server.js` into service/util module(s).
2. Keep behavior parity and wiring-only responsibility in `server/server.js`.

Deliverables:
1. New module(s) under `server/services/**` or `server/brain/**` (as ownership requires).
2. Updated `server/server.js` call sites.
3. Ledger + changelog updates.
4. Test pass confirmation.

Exit criteria:
1. Target cluster fully extracted.
2. Full tests pass.
3. A4 checkbox marked `[x]`.
4. Stop/Resume Snapshot updated.

### A5 - Boundary Regression and Gate Closure

Status: `Planned`

Scope:
1. Add boundary regression checks for the cleanup policy.
2. Verify contributor contract enforcement points.
3. Confirm no active cleanup checklist blockers remain.

Deliverables:
1. Regression check coverage for boundary violations.
2. Updated cleanup gate checklist with objective pass/fail notes.
3. Final `Cleanup gate` status moved to `Done` (if criteria met).

Exit criteria:
1. Gate checklist items all satisfied.
2. A5 checkbox marked `[x]`.
3. Current Phase Snapshot updated to show cleanup gate closure.

### Resume Pointer

1. Last completed slice: `A3`
2. Current next slice: `A4`
3. Immediate next action: `identify A4 helper cluster target in server/server.js and start extraction`

### Slice B - Dream Split Hardening

Status: `Done`

Context (code audit 2026-03-11):
1. Live loop already calls `runDreamIntuition()` from `dream-intuition-adapter.js`. Correct. But `runDream()` (heavier, legacy) is also defined on Orchestrator and could be accidentally re-wired.
2. `dream-maintenance-selector.js` does not exist. Candidate selection is an inline heuristic inside `dream-engine.js`.
3. `dream-link-writer.js` does not exist. Dream-to-source link persistence is not formally owned.

Slice checklist:
- [x] B1: Guard test proving live loop uses `runDreamIntuition()` only. Adapter contains no write call sites.
- [x] B2: Create `server/brain/cognition/dream-maintenance-selector.js` with `scoreDreamCandidate`, `selectDreamCandidates`, `bucketDreamCandidates`.
- [x] B3: Create `server/brain/knowledge/dream-link-writer.js` with `writeDreamSourceLinks`, `emitDreamLinkEvents`.
- [x] B4: Wire selector into `phase-dreams.js`, replace inline candidate scoring.
- [x] B5: Wire link writer into `phase-dreams.js` after dream generation commit.
- [x] B6: Unit tests for selector, link writer, and integration guard for no-write path.

Start criteria: Phase A gate `Done` (already met).
End criteria: All B checkboxes `[x]`. Full suite passes. Ledger + changelog updated.

Stop/Resume: Current B pointer — done. Next: Phase C.

### Slice C - Escalation Guardrails

Status: `Done`

Context (code audit 2026-03-11):
1. `shouldEscalateO2` returns bare `bool`. Reason for decision is lost.
2. `enforceBudgetGuard` exists but is NOT called in orchestrator before O2 fires.
3. No timeout ceiling around O2 final synthesis LLM call.
4. No escalation telemetry in `innerDialog`.

Slice checklist:
- [x] C1: Update `shouldEscalateO2` to return `{ escalate: bool, reason: string }`. Update call sites.
- [x] C2: Wire `enforceBudgetGuard` as blocking pre-check before O2 escalation. Over-budget → force fallback + log reason.
- [x] C3: Add `enforceLatencyGuard(callFn, maxMs)` to `orchestration-policy.js`. Wrap O2 synthesis call with it. On timeout, fallback to default model.
- [x] C4: Add `innerDialog.artifacts.escalation` telemetry: `{ reason, modelUsed, timedOut, budgetBlocked, latencyMs, tokenCost }`.
- [x] C5: Regression tests: shouldEscalateO2 reasons, budget cap blocks escalation, timeout fires fallback.

Start criteria: Phase B done.
End criteria: All C checkboxes `[x]`. Full suite passes. Ledger + changelog updated.

Stop/Resume: Phase C complete. All C1–C5 delivered. See Implementation Ledger 2026-03-11.

### Slice D - Worker Pilot

Status: `Done`

Context (code audit 2026-03-11):
1. No worker entity infrastructure exists at all.
2. `EntityRuntime` manages a single entity. No registry, dispatcher, or output contract.
3. Architecture spec: subsystem mode = worker entity acts as hidden role for host orchestration.
4. Contract: `{ summary, signals, confidence, memoryRefs?, nextHints? }`. On invalid/timeout → silent fallback to native aspect.

Slice checklist:
- [x] D1: Create `server/contracts/worker-output-contract.js` with `validateWorkerOutput`, `normalizeWorkerOutput`.
- [x] D2: Create `server/brain/core/worker-registry.js` with `registerWorker`, `unregisterWorker`, `getWorker`, `listWorkers`.
- [x] D3: Create `server/brain/core/worker-dispatcher.js` with `invokeWorker(binding, input, callLLM, opts)`. Silent fallback on failure/timeout.
- [x] D4: Wire registry check into Orchestrator constructor + contributor methods. Try worker first, fall back to native if null.
- [x] D5: Emit `worker_invoked`, `worker_success`, `worker_fallback` events on bus. Add `workerDiagnostics` to `innerDialog.artifacts`.
- [x] D6: Tests: contract validation paths, registry bind/unbind, dispatcher valid/invalid/timeout paths, orchestrator integration guard.

Start criteria: Phase C done.
End criteria: All D checkboxes `[x]`. Full suite passes. Ledger + changelog updated.

Stop/Resume: Phase D complete. All D1–D6 delivered. See Implementation Ledger 2026-03-11.

## Source-of-Truth Docs

1. `Documents/current/ARCHITECTURE-OVERVIEW.md`
2. `Documents/current/PIPELINE-AND-ORCHESTRATION.md`
3. `Documents/current/MEMORY-SYSTEM.md`
4. `Documents/current/CONTRACTS-AND-SCHEMAS.md`
5. `Documents/current/OPEN-ITEMS-AUDIT.md`
6. `CHANGELOG.md`
7. `package.json`

## Implementation Ledger (2026-03-14)

### UI Shell - Creator Extraction and Window App Integration

Status: `Done`

Scope:
1. Move entity creation flow out of inline modal into a dedicated creator app surface.
2. Make Creator a first-class window app in the desktop shell.
3. Remove `+ New` creation actions from Entity app surfaces.

Landed slices:
1. Added standalone creator app files:
   - `client/create.html`
   - `client/js/create.js`
2. Added shell app integration for Creator:
   - Added `creator` entry to `WINDOW_APPS` in `client/js/app.js`.
   - Added `tab-creator` iframe pane in `client/index.html`.
3. Rewired creation entry points to Creator app:
   - `showNewEntityDialog()` now routes to Creator window.
   - setup hatch route now routes to Creator window.
4. Removed inline entity-creation modal/progress markup from `client/index.html`.

Exit criteria:
1. Creator runs as its own resizable app window.
2. Entity app no longer owns `+ New` creation controls.

### UI Shell - Release/Checkout Controls Hardening

Status: `Done`

Scope:
1. Ensure entities can always be released after checkout.
2. Surface release controls in all key user paths.

Landed slices:
1. Release visibility now uses server-synced active entity state in `refreshSidebarEntities()`.
2. `releaseActiveEntity()` now resolves active entity from `/api/entities/current` if local state is stale.
3. Release controls added/wired in:
   - nav entity actions
   - start menu entity actions
   - chat toolbar
   - entity profile view action row

Exit criteria:
1. User can check out and release/check-in without UI dead-end.

### UI Shell - Users App + Power Controls

Status: `Done`

Scope:
1. Add first-class Users app window for profile management.
2. Add visible server power controls in requested locations.

Landed slices:
1. Added `users` app to shell window registry and new `tab-users` view in `client/index.html`.
2. Added users app handlers in `client/js/app.js`:
   - `usersAppRefresh`
   - `usersAppCreateUser`
   - `usersAppSetActive`
   - `usersAppClearActive`
   - `usersAppDelete`
3. Power control placement:
   - Start/Apps menu quick actions (`⏻ Power`)
   - left-bottom nav sidebar (`Power Off Server`)

Exit criteria:
1. Users app is launchable and functional against existing `/api/users*` routes.
2. Power button visible in both requested locations.

## Stop/Resume Snapshot

- Current phase: `UI Shell Consolidation`
- Current slice: `Post-integration UX verification`
- Last completed slice: `Users app + release control hardening + power controls`
- In-progress item: `none`
- Next action on resume: `Run browser validation pass for Creator/Users/Release/Power controls and update CHANGELOG if missing entries`

## Documentation Audit Note (2026-03-14)

Status: `Done`

1. Requested git comparison could not be executed in this workspace because `c:\Users\voard\Desktop\NekoCore-main` has no `.git` metadata.
2. Fallback used: reconcile docs against concrete in-workspace file changes and live implemented features.
3. Changelog updated under `Unreleased` to capture Creator extraction, release/check-in controls, Users app, and power-control placement.
4. If repository metadata is restored, run a follow-up true git diff audit and append any missing deltas.

## Session Stop Checkpoint (2026-03-14)

Status: `Paused`

1. Attempted to pull missing `Documents/` from `https://github.com/voardwalker-code/NekoCore.git`.
2. Remote clone succeeded, but no `Documents/` (or `docs/`) directory exists on `origin/main`.
3. User confirmed newer docs are available on another laptop/git source; docs import deferred.
4. Resume action: import docs from alternate source, then run a docs truth-sync pass against current Creator/Users/Release/Power changes.

### 2026-03-14 - entityPaths Module Relocation (Path-Hygiene-1)

Status: `Done`

Scope delivered:
1. Moved canonical path module from `server/entities/entityPaths.js` to `server/entityPaths.js` to avoid confusion with top-level runtime data folder.
2. Updated server and tests imports to the new module location.
3. Removed obsolete `server/entities/` directory after migration.
4. Kept root runtime data folder (`entities/`) as the canonical per-entity storage target.

Validation:
1. `node --test tests/unit/entity-paths.test.js` => 12 pass, 0 fail.

## Manual Test Notes Queue (2026-03-14)

Status: `Queued`

1. Dream memory regression check:
   - Symptom to verify: `Dream Memory not found` appears unexpectedly.
2. Physical self UI verification:
   - Symptom to verify: `Physical Self` display/layout appears visually off.

### 2026-03-14 - Personal Data Sweep (Pre-Push)

Status: `Done`

Scope delivered:
1. Cleared runtime auth/user state files to empty objects:
   - `server/data/accounts.json`
   - `server/data/sessions.json`
   - `server/data/checkouts.json`
2. Cleared system timeline log file:
   - `memories/logs/timeline-system.ndjson`
3. Ensured root runtime folder exists as required:
   - `entities/`

Push status:
1. Push could not be executed from this workspace: no `.git` metadata is present (`fatal: not a git repository`).

### 2026-03-14 - NekoCore Browser Phase NB-2 Technical Spike (Complete)

Status: `Done`

Scope delivered (NB-2-2 through NB-2-6 in one pass):

1. **NB-2-2 — Navigation POC:**
   - Created `browser-host/navigation.js` with navigate/back/forward/reload.
   - Per-tab history stacks (back + forward) with URL validation and protocol whitelisting.
   - Emits `browser.navigation.state` events with contract fields.

2. **NB-2-3 — Tab Model POC:**
   - Created `browser-host/tab-model.js` with create/switch/close.
   - Deterministic active-tab fallback: next → previous → null.
   - Emits `browser.tab.lifecycle` events on create/close.

3. **NB-2-4 — Lifecycle and Download POC:**
   - Created `browser-host/lifecycle.js` with host state machine (host_starting → host_ready → host_closing).
   - Created `browser-host/download-manager.js` with start/complete/failure and correlatable IDs.
   - Both emit contract events through shared event bus.

4. **NB-2-5 — Backend Bridge Wiring:**
   - Created `server/routes/browser-routes.js` following existing route factory pattern.
   - Endpoints: GET session/tabs/downloads; POST navigate/tab-create/tab-activate/tab-close/reload/go-back/go-forward.
   - SSE relay: all `browser.*` events forwarded to SSE clients via `broadcastSSE`.
   - Registered in `server/server.js` dispatcher array.

5. **NB-2-6 — Spike Acceptance Run:**
   - Created `tests/unit/browser-spike-acceptance.js` with 23 tests.
   - Result: 23/23 pass — all NB-1-0 acceptance criteria met.
   - Categories: host lifecycle (3), tab model (6), navigation (8), downloads (4), event shape (2).

6. **Supporting infrastructure:**
   - Created `browser-host/event-bus.js` — lightweight EventEmitter with auto-timestamp and wildcard relay.
   - Updated `browser-host/index.js` entry point to re-export all submodules.

Validation:
1. `node tests/unit/browser-spike-acceptance.js` => 23 pass, 0 fail.
2. `require('./browser-host')` loads cleanly with all 5 submodules.
3. Plan checklist NB-2-2 through NB-2-6 checked done; phase status set to Done.
4. Ledger, stop/resume snapshot, CHANGELOG updated.
