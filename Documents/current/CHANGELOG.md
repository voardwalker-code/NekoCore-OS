# REM System — Changelog

All notable changes to REM System.
Format: most recent first within each version block.

---

## [Unreleased — post-0.6.0]

### 2026-03-16

**Refactor — App Folder Modularization COMPLETE (Phases A1 → E1)**
- All 17 app modules migrated out of the flat `project/client/js/` surface into explicit ownership folders `project/client/js/apps/core/` (9 modules) and `project/client/js/apps/optional/` (8 modules). `js/vfs.js` retained as documented flat-path exception (shell-critical DOMContentLoaded bootstrap).
- Core modules migrated: `chat.js`, `entity-ui.js`, `users-ui.js`, `setup-ui.js`, `config-profiles.js`, `simple-provider.js`, `system-health.js`, `telemetry-ui.js`, `debug-core-app.js`
- Optional modules migrated: `diary.js`, `theme-manager.js`, `physical-ui.js`, `visualizer-ui.js`, `browser-app.js`, `document-digest.js`, `skills-ui.js`, `dream-gallery.js` (already moved at P4-G0, confirmed)
- 4 `typeof` guards added to shell-core callers: `initPhysicalTab` (`window-manager.js`), `initChatPhysical` (`boot.js`), `applyTheme`/`getStoredThemeId` (`desktop.js`), `showMiniMemoryDetail` (`app.js`)
- `project/client/js/apps/app-manifest.json` — all 20 app sourcePaths updated to final migration targets
- New guard test files: `core-app-migration-guards.test.js` (34 tests), `optional-app-migration-guards.test.js` (42 tests), `registry-path-audit-guards.test.js` (~20 tests), `optional-failure-simulation.test.js` (14 tests)
- 10+ existing extraction guard test files cascade-updated for new module paths
- `Documents/current/APP-FOLDER-OWNERSHIP.md` — contributor guide: folder taxonomy, Core vs Optional criteria, migration checklist, documented exceptions, test file index
- Final suite validation: **866 pass, 0 fail**
- Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

---

### 2026-03-16 (continued)

**Refactor — App Folder Modularization Phase A1 complete**
- `project/tests/unit/optional-app-degradation-guards.test.js` — extended with 8 new guards covering `diary.js` (lifediary + dreamdiary entrypoints), `document-digest.js` (documents tab), and `browser-app.js` (browser tab). Asserts no direct hard-calls from shell-core and confirms entrypoint declarations exist.
- `project/client/js/apps/app-manifest.json` (new) — machine-readable app ownership manifest for all 20 `WINDOW_APPS` tabs. Each entry: `tabId`, `class` (core/optional), `sourcePath`, `bootstrapCritical`, `dependencies`.
- `project/tests/unit/app-manifest-guards.test.js` (new) — 9-test consistency guard suite: manifest exists, covers all 20 tabs, valid classes only, all JS sourcePaths exist on disk, correct core/optional counts (10 each).
- `project/tests/unit/script-load-order-guards.test.js` (new) — 9-test load-order baseline: locks critical ordering (`shared/sse.js` → `shared/api.js` → `js/app.js` → `js/chat.js`, neural-viz chain, `js/boot.js` last local script). Detects accidental reordering during migration slices.
- Validation: full suite `npm.cmd test` passed (`756 pass, 0 fail`).
- Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]` `[CONTRACT_ENFORCED]`

**Refactor — pre-Phase-4 app folder modularity cleanup started**
- `WORKLOG.md` — added `P4-G0 App Structure Cleanup` pre-Phase-4 gate with checklist and explicit closure criteria.
- `Documents/current/PLAN-PHASE3-MODULARIZATION-COMPLETION-v1.md` — appended a follow-on cleanup track section for Core vs Optional app placement.
- `project/client/js/apps/core/.gitkeep` and `project/client/js/apps/optional/` — scaffolded modular app folder structure.
- `project/client/js/apps/optional/dream-gallery.js` — pilot Optional app migration from `project/client/js/dream-gallery.js`.
- `project/client/index.html` — updated script path to load dream gallery from Optional app folder.
- `project/tests/unit/optional-app-degradation-guards.test.js` (new) — added source guards for optional-path load wiring and no hard shell-core call to `loadDreamGallery()`.
- Validation: full suite `npm.cmd test` passed (`730 pass, 0 fail`).
- Markers: `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**Critical bug fix — Visualizer memory rendering, NekoCore dreaming, and entity picker refresh**
- `project/entities/entity_nekocore/entity.json` — removed `dreamDisabled: true`; NekoCore now participates in the dream pipeline on each brain loop cycle.
- `project/server/brain/nekocore/bootstrap.js` — removed `dreamDisabled: true` from provisioning template so reprovisioned installs no longer re-disable dreaming.
- `project/server/routes/cognitive-routes.js` — `getMemoryGraphNodes` now reads `entityId` URL param: uses live in-memory graph for the active entity; scans disk via `getEntityMemoryScanDirs` with topic co-occurrence edges for any non-active entity. `getFullMindGraph` reads `entityId` URL param and uses it as the scan target instead of always using `ctx.currentEntityId`. `getTraces` and `getBeliefGraphNodes` accept `entityId` param and return empty payloads for non-active entities (those subsystems are in-memory only).
- `project/client/js/visualizer.js` — added `refreshEntityPickerList()` called on `visibilitychange` (visible) so entity list (including Rebecca and other user entities) stays current when navigating back to the Visualizer tab. `clearFilter()` now passes `selectedEntityId` to `NeuralViz.loadGraphData()` so clearing a filter does not drop entity context.
- `project/tests/unit/nekocore-bootstrap.test.js` — updated B-1 guard test from asserting `dreamDisabled === true` to asserting it is `undefined`, reflecting the intentional reversal.
- Validation: full suite `npm.cmd test` passed (`554 pass, 0 fail`). `[BOUNDARY_OK] [JS_OFFLOAD]`

**Critical bug fix — Visualizer entity context and NekoCore memory views realigned**
- `project/server/services/entity-runtime.js` — added `shareMutableGlobals` gating so always-on runtimes can avoid mutating shared active-entity globals.
- `project/server/server.js` — NekoCore persistent runtime now initializes with `shareMutableGlobals: false`, isolating system-entity runtime state from the currently loaded user entity.
- `project/server/routes/entity-routes.js` — `/api/entity` now reports the real active entity from `entityManager.getCurrentEntity()` instead of reading shared `hatchEntity` state.
- `project/server/routes/memory-routes.js` — visualizer-backed memory search/detail/reconstruct and chat-history endpoints now accept explicit entity context, so selected-entity memory views no longer depend on stale global active state.
- `project/client/js/visualizer.js` — entity picker now keeps an explicit `Select entity` placeholder, merges the current entity into the dropdown when the list omits it, and threads the selected entity id through memory, graph, diagnostics, reconstruction, and chat-history requests.
- `project/client/js/neural-viz/renderer.js` — graph, trace, and belief requests now carry optional entity context so the rendered graph matches the selected entity.
- Added/updated regression coverage in `project/tests/unit/visualizer-entity-context-regression.test.js`, `project/tests/unit/nekocore-visualizer-memory-regression.test.js`, and `project/tests/unit/nekocore-parity-guards.test.js`.
- Validation: full suite `npm.cmd test` passed (`554 pass, 0 fail`). `[BOUNDARY_OK] [JS_OFFLOAD]`

**Critical bug fix — NekoCore system entity pipeline parity restored**
- Restored architectural parity: NekoCore now gets persistent EntityRuntime with DreamEngine, Neurochemistry, memory consolidation, goal tracking, curiosity, belief reasoning.
- Modified `project/server/server.js` to initialize `nekoSystemRuntime = new EntityRuntime({...})` with activation.
- Modified `project/server/services/nekocore-pipeline.js` to inject and delegate to `nekoSystemRuntime` instead of creating local modules.
- Added `project/tests/unit/nekocore-parity-guards.test.js` with 25 tests covering 12 subsystems and memory parity.
- Test suite: 527 pass, 0 fail. Unblocks Phase 3 modularization. `[BOUNDARY_OK] [JS_OFFLOAD]`

**Refactor — Debug Core app modularized and moved out of shell bootstrap overlay**
- `project/client/js/debug-core-app.js` (new) — added dedicated Debug Core module with `initCoreDebugApp()` for timeline loading (`/api/timeline`), local client debug buffer rendering, and control actions (refresh, dump state, clear local buffer, reset windows).
- `project/client/index.html` — removed floating DBG/RESET debug overlay creation from the startup debug script, added bridge-only debug collector (`window.__coreDebugBridge`) for resilient forwarding, added new `Debug Core` nav item and `#tab-debugcore` panel, and added script include for `js/debug-core-app.js`.
- `project/client/js/app.js` — registered `debugcore` in `WINDOW_APPS` and `APP_CATEGORY_BY_TAB`.
- `project/client/js/window-manager.js` — window activation effects now call `initCoreDebugApp()` when the `debugcore` tab is opened.

**Refactor — setup enforcement/setup wizard/user-name modal extracted from app.js for Phase 3 modularization**
- `project/client/js/setup-ui.js` (new) — extracted setup enforcement helpers (`isApiConfigured`, setup-required modal helpers, guardEntityOperation), setup wizard constants/state/flow (`SETUP_STEPS`, `LLM_ROLES`, setup connect/test/finish path), and user-name modal helpers (`checkAndPromptUserName` through `skipUserName`) from `app.js`.
- `project/client/js/app.js` — replaced the extracted setup/user-name ownership blocks with P3-S7 redirect comments.
- `project/client/index.html` — now loads `setup-ui.js` after `js/users-ui.js` and before `js/skills-ui.js`.
- `project/tests/unit/setup-ui-extraction-guards.test.js` (new) — added regression guards for extraction boundary and script order.

**Refactor — user-switcher/users-app UI helpers extracted from app.js for Phase 3 modularization**
- `project/client/js/users-ui.js` (new) — extracted User Switcher panel state/flows and Users app management handlers from `app.js`, including open/close panel behavior, user switch/add flows, active-user initialization, users-app list/create/set-active/delete handlers, and relationship badge rendering.
- `project/client/js/app.js` — replaced the extracted block with a P3-S6 redirect comment.
- `project/client/index.html` — now loads `users-ui.js` after `js/physical-ui.js`.
- `project/tests/unit/users-ui-extraction-guards.test.js` (new) — added regression guards for extraction boundary and script order.

**Refactor — physical body/deep-sleep UI helpers extracted from app.js for Phase 3 modularization**
- `project/client/js/physical-ui.js` (new) — extracted Physical Body tab rendering/state refresh helpers, neurochemistry panel updates, chat-side physical mirror widget, somatic toggle mutation, SSE listeners, and deep-sleep interval slider helpers from `app.js`.
- `project/client/js/app.js` — replaced the extracted block with a P3-S5 redirect comment.
- `project/client/index.html` — now loads `physical-ui.js` after `js/sleep.js` so physical helpers are available before `boot.js` startup hooks.
- `project/tests/unit/physical-ui-extraction-guards.test.js` (new) — added regression guards for extraction boundary and script order.

**Critical bug fix — NekoCore Visualizer memory rendering restored**
- `project/server/services/nekocore-pipeline.js` — NekoCore direct chat now constructs `MemoryStorage` with `entityId: 'nekocore'` and passes the correct object payload into `storeNekoConversationSnapshot()`, so new NekoCore conversation memories are written to the standard entity-scoped memory layout.
- `project/server/services/entity-memory-compat.js` (new) — added shared compatibility helpers for enumerating standard entity memory folders plus legacy entity `Memory2` storage.
- `project/server/routes/memory-routes.js`, `project/server/routes/cognitive-routes.js` — visualizer-backed search, detail, reconstruction, summary, and full-mind graph endpoints now include legacy `Memory2` directories alongside the standard memory folders, restoring visibility for previously stored NekoCore records without requiring migration.
- `project/tests/unit/nekocore-visualizer-memory-regression.test.js` (new) — added regression coverage for legacy `Memory2` visibility in visualizer routes and a guard that NekoCore pipeline stays on entity-scoped storage.

**Refactor — visualizer UI helpers extracted from app.js for Phase 3 modularization**
- `project/client/js/visualizer-ui.js` (new) — extracted visualizer detail rendering, mini/detail sync helpers, activity feed updates, search handlers, and the visualizer-specific DOM-ready bootstrap from `app.js`.
- `project/client/js/app.js` — replaced the visualizer helper block with a P3-S4 redirect comment.
- `project/client/index.html` — now loads `visualizer-ui.js` immediately after `js/neural-viz/index.js`.
- `project/tests/unit/visualizer-ui-extraction-guards.test.js` (new) — added regression guards for the extraction boundary and script order.

**Refactor — main app boot extracted from app.js for Phase 3 modularization**
- `project/client/js/boot.js` (new) — extracted the primary `DOMContentLoaded` startup path from `app.js`, including shell init, saved-config hydration, post-load app start, polling start, and chat physical boot.
- `project/client/js/app.js` — replaced the extracted main boot block with a P3-S3 redirect comment.
- `project/client/index.html` — now loads `boot.js` after `browser-app.js` so startup registration remains at the end of app script loading.
- `project/tests/unit/boot-extraction-guards.test.js` (new) — added regression guards for the boot extraction and script order.

**Refactor — desktop shell extracted from app.js for Phase 3 modularization**
- `project/client/js/desktop.js` (new) — extracted the desktop shell/start-menu/taskbar module from `app.js`, including start menu state, taskbar layout persistence/edit mode, pinned-app drag/reorder/render flow, shell init, presence heartbeat, and `getWindowApp()`.
- `project/client/js/app.js` — replaced the extracted desktop-shell block with a P3-S2 redirect comment so the main file no longer owns that UI logic directly.
- `project/client/index.html` — now loads `desktop.js` after `app.js` and before `window-manager.js`.
- `project/tests/unit/desktop-extraction-guards.test.js` (new) — added regression guards that pin the extraction boundary and script load order.

### 2026-03-15

**Planning doc — modular platform feature candidates captured for Phase 3+**
- `Documents/current/PLAN-MODULAR-FEATURES-v1.md` (new) — added a planning document for candidate modular platform features requested during NekoCore OS stabilization: plug-in registration hub, feature-flag system, lazy-load loading, shared state store, theming engine, automated testing scaffold, and documentation generator.
- The document records scope, architecture boundaries, rollout phases, test targets, and risks while explicitly keeping this work in planning-only status until later Phase 3/4 slices authorize implementation.

**Critical bug fix — skill action reliability for TOOL/TASK_PLAN flows**
- `project/server/brain/skills/workspace-tools.js` — hardened `[TOOL:...]` parsing and stripping to support flexible casing/spacing, single-quote params, and hyphenated command aliases (normalized to underscore commands at execution).
- `project/server/server.js` — pending skill-approval draft responses now strip `[TASK_PLAN]...[/TASK_PLAN]` blocks before returning to chat, preventing plan text leakage in user-visible messages.
- `project/server/server.js` — one-step task plans now execute through the task runner (`steps.length >= 1`) instead of being silently skipped.
- `project/tests/unit/workspace-tools-parser.test.js` (new) — added regression coverage for flexible parser syntax, stripping behavior, and command normalization (`ws-move` → `ws_move`).

**Critical bug fix — NekoCore direct chat now executes actions instead of leaking directives**
- `project/server/server.js` — `processNekoCoreChatMessage()` now executes inline `[TOOL:...]` calls and synthesizes a clean post-tool response, matching the main chat action flow.
- `project/server/server.js` — NekoCore now executes `[TASK_PLAN]` blocks when present (including one-step plans) rather than returning plan text directly to the chat panel.
- `project/server/server.js` — added final response sanitization in NekoCore path to strip residual `[TOOL:]` / `[TASK_PLAN]` directives so implementation text never appears in user-visible bubbles.

**Critical bug fix — skill manager now matches OpenClaw-compatible SKILL semantics**
- `project/server/brain/skills/skill-manager.js` — replaced legacy frontmatter assumptions (`enabled`/`version`) with OpenClaw-compatible parsing for `metadata` JSON blocks plus `user-invocable` and `disable-model-invocation` flags.
- `project/server/brain/skills/skill-manager.js` — moved skill enabled-state persistence out of `SKILL.md` into `skills/.skill-state.json`, so toggles no longer inject unsupported frontmatter keys that break compatibility.
- `project/server/brain/skills/skill-manager.js` — updated model prompt injection logic to exclude `disable-model-invocation` skills while still allowing explicit user invocation for enabled skills.
- `project/tests/unit/skill-manager-openclaw-compat.test.js` (new) — added regression coverage for OpenClaw metadata parsing and enabled-state persistence behavior.

**Critical bug fix — tutorial-notes skill now uses strict, low-ambiguity tool guidance**
- `project/skills/tutorial-notes/SKILL.md` — removed unsupported frontmatter keys and replaced tutorial prose with deterministic execution rules, decision mapping, and canonical tool-tag examples.
- `project/entities/entity_nekocore/skills/tutorial-notes/SKILL.md` — synced with shared tutorial-notes skill content to avoid behavior drift between skill roots.

**Critical bug fix — ws_move skill manifest normalized in shared + NekoCore copies**
- `project/skills/ws_move/SKILL.md` — normalized frontmatter to schema-supported fields and clarified ws_move usage guidance while keeping canonical tool example syntax.
- `project/entities/entity_nekocore/skills/ws_move/SKILL.md` — synced with the shared ws_move skill manifest to prevent copy drift and inconsistent runtime availability behavior.

**Critical bug fix — NekoCore OS model update now reuses saved API key**
- `client/js/auth.js` — added NekoCore settings hydration on load so saved NekoCore endpoint/model values populate the Advanced settings panel.
- `client/js/auth.js` — `saveNekocoreConfig()` now supports model-only updates by reusing the currently stored NekoCore API key when the API key field is left blank, preventing false `API key is required` failures.

**Critical bug fix — context chat blocked without checked-out entity**
- `client/js/chat.js` — added `syncContextChatGuard()` to hard-disable context chat input/send controls when no entity is checked out, set explicit guidance placeholder text, and clear stale draft input in blocked state.
- `client/js/chat.js` — `sendChatMessage()` now has an early no-entity guard so messages cannot be sent unless an entity is actively checked out.
- `client/js/app.js` — `refreshSidebarEntities()` now calls the chat guard sync helper so input state follows checkout/release transitions.
- `tests/unit/context-chat-entity-guard.test.js` (new) — added source-guard tests for no-entity input blocking, send-time guard, and sidebar sync integration.

**Critical bug fix — entity release visibility and re-checkout regression**
- `server/routes/entity-routes.js` — `postEntitiesRelease` now normalizes `ctx.currentEntityId` before canonical-id comparison so releasing an entity always clears active server entity state, even if prefixed/non-prefixed id forms differ.
- `server/routes/entity-routes.js` — `/api/entities` visibility filtering now always includes system entities (NekoCore) regardless of owner/public flags, so NekoCore remains visible in entity lists.
- `client/js/app.js` — `refreshSidebarEntities()` now normalizes active and listed entity ids before filtering, preventing released entities from disappearing from the sidebar when stale prefixed id forms are returned.
- `tests/unit/entity-release-visibility-regression.test.js` (new) — added source-guard tests to lock canonical-id release clearing and normalized sidebar filtering behavior.
- `tests/unit/nekocore-protection.test.js` — added guard for system-entity inclusion in `/api/entities` visibility filter.
- Follow-up hardening:
- `server/brain/utils/entity-manager.js`, `server/server.js` — added `EntityManager.clearCurrentEntity()` and now call it from `clearActiveEntity()`, so `/api/entities/current` cannot remain stale `loaded:true` after release.
- `client/js/app.js` — sidebar now clears stale local active-id state and falls back to full visible entity rendering when active-only filtering yields no matches.
- `tests/unit/entity-release-visibility-regression.test.js` — extended guards for EntityManager clear integration and stale-filter fallback behavior.
- Contention fix:
- `client/js/visualizer.js` — removed auto-load behavior that previously selected and loaded the first entity when no active entity existed, which could silently re-checkout entities and conflict with release/check-in expectations.
- `tests/unit/visualizer-entity-autoload-guard.test.js` (new) — added guard to prevent reintroducing first-entity auto-load checkout behavior.

**Ad-hoc bug fix — NekoCore tooling controls + workspace settings**
- `server/routes/nekocore-routes.js` — added NekoCore-specific tooling endpoints for reading/updating approval mode, toggling per-skill enablement, and updating the system entity workspace path without relying on `currentEntityId`.
- `server/brain/nekocore/bootstrap.js` — changed bootstrap patching so the default workspace root is seeded when missing, but an explicit NekoCore workspace path is preserved across restarts.
- `client/nekocore.html`, `client/js/nekocore-app.js`, `client/css/ui-v2.css` — added a Tools and Workspace section to the NekoCore panel with skill toggles, approval-mode checkbox, workspace path field, and status rendering.

**Critical bug fix — NekoCore memory healing + multi-layer chat encoding**
- `server/services/nekocore-memory.js` — added a dedicated NekoCore memory service that reuses the shared memory-operations/post-response pipeline with a fixed entity scope, so direct NekoCore chat no longer bypasses `core_memory` and `semantic_knowledge` creation.
- `server/server.js` — `processNekoCoreChatMessage` now delegates raw snapshot persistence to the NekoCore memory service and triggers shared post-response memory encoding after each direct chat turn.
- `server/brain/memory/memory-storage.js` — retrieval/list/access paths now prune stale index entries when the referenced memory folder or log file is missing, repairing index/file drift opportunistically instead of repeatedly surfacing `Memory not found` warnings.
- `tests/unit/nekocore-memory.test.js` — added guard coverage for raw NekoCore conversation snapshots, multi-layer chat memory creation, and stale-index pruning.

**Critical bug fix — NekoCore recent conversation recall continuity**
- `server/brain/nekocore/knowledge-retrieval.js` — added recency-based recall scan for NekoCore's own conversation memories (`source: nekocore_conversation`), including decompressed user/assistant previews from `memory.zip`.
- `server/brain/nekocore/knowledge-retrieval.js` — `buildContextBlock` now includes a `[CONVERSATION RECALL]` section that always carries the most recent turns, even when topic matching returns weak or zero hits.
- `server/brain/nekocore/knowledge-retrieval.js` — merged context now prioritizes recent recall before topic matches, then deduplicates so the same memory is not injected twice.
- `tests/unit/nekocore-knowledge-retrieval.test.js` — added regression coverage for no-topic recall fallback and newest-first recall ordering.

**Ad-hoc repo packaging wrapper (docs-first root, runnable source under `project/`)**
- Repository layout changed so tracked runnable source now lives under `project/`, keeping the repository root documentation-first for GitHub visitors.
- Root `.gitignore` updated to target runtime/config artifacts under `project/`.
- Root `README.md` updated for the new layout, including `project/` install flow, architecture-deck path, and refreshed test badge/count.
- `WORKLOG.md` updated with a repository packaging note and ledger entry so future cleanup/refactor work starts from the wrapped layout.

**Ad-hoc regression fix — taskbar true resize + shell dock row-layout repair**
- `client/js/app.js` — upgraded persisted taskbar layout state (`rem-taskbar-layout-v1`) from scale-only to true `width`/`height` storage with legacy migration, added resize-handle pointer logic, and kept the taskbar context menu actions (`Edit Taskbar`, move left/center/right, smaller/larger, reset). Edit mode now supports drag-to-move plus real width/height resizing.
- `client/index.html` — added lightweight top/left/right resize handles around the taskbar in addition to the existing `A-`, `A+`, and `Done` editor controls.
- `client/css/ui-v2.css` — repaired the taskbar into a single-row four-area grid (`left`, `center`, `quick`, `tray`) so the NekoCore quick bar no longer drops into an implicit second row, switched shell bottom spacing to follow the real taskbar height, and converted the dock sizing to width/height-driven variables for a more compact default footprint.

**BUG-18 — NekoCore persistent memory + entity episodic subconscious access**
- `server/server.js` — `processNekoCoreChatMessage` now creates `ConsciousMemory` and `MemoryStorage` instances scoped to `entity_nekocore`. `storeConsciousObservation` is wired: each chat turn is added to ConsciousMemory STM (persisted to `memories/conscious/stm.json`) and simultaneously written to `memories/episodic/` via `MemoryStorage.storeMemory()` with `decay: 0` (permanent, no TTL eviction). `getConsciousContext` is wired so prior conversation context surfaces in future turns. `memoryStorage: nekoCoreStorage` passed through to `orchestrate()` so the orchestration pipeline can reference storage if needed.
- `server/brain/nekocore/knowledge-retrieval.js` — `buildNekoKnowledgeContext` now performs a three-pass subconscious scan: (1) NekoCore's architecture docs (`nkdoc_*`, up to 50% of budget), (2) NekoCore's own episodic memories (up to 3 entries), (3) all other entity episodic memory dirs (up to 40% of budget, 2 entries per entity max). Entity memory access is read-only with no approval gate. `buildContextBlock` now emits `[SELF_MEMORY]`, `[ENTITY Name]`, and `[DOCUMENT]` tags so the orchestrator can distinguish memory sources. Added `scanEpisodicDir()` helper function reused across self and entity passes.

#### BUG-13 + BUG-09 + BUG-02 + BUG-01 + BUG-03 fixes (chat/setup/provider UX pass)
- `client/js/chat.js`: chat auto-scroll now uses animation-frame batching, updates user scroll intent from real scroll events, and avoids repeated snap-to-bottom writes that caused visible stream-time flicker.
- `client/index.html`: setup wizard branding updated to NekoCore OS and setup logo text adjusted; OpenRouter setup now includes explicit sign-up links.
- `client/index.html`: added visible BYOK disclosure in setup/settings OpenRouter surfaces clarifying support for any OpenAI-compatible endpoint + key + model, including endpoint example guidance.
- `client/index.html`: added pipeline recommendation notes to avoid reusing the same model for Main Mind and Orchestrator, with Mercury 2 + Claude Sonnet 4/4.6 guidance.
- `client/css/ui-v2.css`: setup wizard field contrast hardened (text/background/border/placeholder) to ensure readable typed input.
- `client/js/app.js`: updated fast OpenRouter recommended stack to pair `inception/mercury-2` (Main) with `anthropic/claude-sonnet-4` (Orchestrator), and aligned recommendation copy.
- Validation: `npm.cmd test` passed (403 pass, 0 fail).

#### BUG-05 fix (Creator personality traits assistance)
- `client/create.html`: trait inputs for Empty and Guided creation modes now use a shared suggestion datalist and expose `Auto-fill Traits` controls.
- `client/js/create.js`: added predefined personality-trait catalog, comma-aware autocomplete population for trait entry, and random one-click trait filling.
- Behavior: users now get dropdown + autocomplete guidance while typing, and can auto-fill traits instead of fully manual freehand entry.
- Validation: `npm.cmd test` passed (403 pass, 0 fail).

#### BUG-16 fix (entity VFS desktop workspace auto-creation)
- `server/routes/entity-routes.js`: added shared helper to ensure `workspace/desktop/<Entity Name>/` is created during entity creation.
- Applied to all entity creation flows: `postEntitiesCreate`, `postEntitiesCreateHatch`, `postEntitiesCreateGuided`, and `postEntitiesCreateCharacter`.
- Added regression guard tests in `tests/unit/entity-workspace-creation.test.js` to verify workspace-folder helper presence and invocation across all four creation routes.
- Validation: `npm.cmd test` passed (401 pass, 0 fail).

#### NekoCore workspace policy correction (workspace root, not desktop subfolder)
- `server/brain/nekocore/bootstrap.js`: removed dependency on a dedicated `workspace/desktop/NekoCore OS` folder and set system entity workspace metadata to workspace root (`workspaceScope: workspace-root`, `workspacePath` set to project workspace root in production bootstrap).
- `server/brain/nekocore/bootstrap.js`: existing installs are migrated on bootstrap when `nekocore` workspace metadata is missing/misaligned.
- `server/server.js`: global config `workspacePath` no longer overrides NekoCore's preconfigured workspace-root mapping when already set on the system entity.
- `tests/unit/nekocore-bootstrap.test.js`: added assertions for system workspace scope + workspace path defaults in override bootstrap mode.

#### Visualizer entity memory loading fix (entity picker + NekoCore memory view)
- `client/visualizer.html`, `client/css/visualizer.css`: added a Visualizer header entity picker with load status indicator.
- `client/js/visualizer.js`: added entity catalog loading (`/api/entities` + `/api/entities/current`) and runtime entity switch flow via `/api/entities/load`.
- Switching entity now refreshes graph, memory-browser search, diagnostics cards, and saved visualizer chat history against the selected entity context.
- Includes explicit `nekocore` option support so NekoCore OS memories can be loaded in Visualizer views.
- Validation: `npm.cmd test` passed (process exited successfully; no test failures).

#### BUG-04 fix (OpenRouter model dropdown behavior + orchestrator recommendation update)
- `client/js/app.js`, `client/js/auth.js`: OpenRouter model suggestion loaders now populate dropdown/datalist options without auto-prefilling the model field, so users can always see/select from the list directly.
- `client/js/app.js`, `client/js/auth.js`, `client/index.html`: added `anthropic/claude-sonnet-4.6` to OpenRouter model option sets.
- `client/js/app.js`: Orchestrator role preset default changed to `anthropic/claude-sonnet-4.6` to align with recommended synthesis quality/cost balance.
- Validation: `npm.cmd test` passed (396 pass, 0 fail).

#### BUG-15 + BUG-17 fixed (natural skill invocation + default skill hardening)
- `server/brain/core/orchestrator.js`, `server/brain/generation/aspect-prompts.js`: conscious prompt now receives available skill context by default so natural-language requests can trigger skill/tool usage without requiring `/skill` syntax.
- `server/server.js`, `server/routes/chat-routes.js`, `client/js/pipeline.js`, `client/js/chat.js`: added runtime skill tool approval flow. When approval mode is enabled, tool actions from skill-driven responses pause for user confirmation before execution; approve/cancel then returns a final assistant response.
- `server/routes/skills-routes.js`, `client/js/skills-ui.js`, `client/index.html`: added per-entity skill approval-mode GET/POST API and a Skills panel toggle (`Require approval before skill tool execution`). Default is enabled.
- `server/routes/entity-routes.js`: all entity creation paths now set `skillApprovalRequired: true` and force-disable all skills immediately after creation, fixing default-enabled regressions.
- Validation: `npm.cmd test` passed (396 pass, 0 fail).

#### NekoCore chat-first startup refinement
- `client/nekocore.html`, `client/js/nekocore-app.js`, `client/css/ui-v2.css`: reworked the NekoCore panel into a minimal chat-first layout with a toggle button for Voice & Info controls, so chat stays visible by default.
- `client/js/app.js`: setup completion now opens NekoCore OS and focuses voice settings instead of auto-opening Creator.
- `client/index.html`: setup CTA copy updated from `Save & Open Creator` to `Save & Open NekoCore OS`.
- Validation: `node --test tests/unit/*.test.js tests/integration/*.test.js` passed (396 pass, 0 fail).

#### Creator regression fix after BUG-14
- `client/create.html`: added the backstory depth slider to Random generation as well as Guided generation, and added a `Create Another` action on the success screen.
- `client/js/create.js`: added `resetCreatorFlow()` to restore the creator to a fresh creation state, reset progress/success UI, and reinitialize depth controls.
- `client/js/create.js`: Random generation now posts `backstoryDepth` so random entities can generate richer or lighter life histories intentionally.
- `client/js/app.js`: reopening the embedded Creator window now resets the iframe out of the previous success/preview state so users can create a new entity immediately.
- `server/routes/entity-routes.js`, `server/brain/identity/hatch-entity.js`, `server/brain/generation/core-life-generator.js`: Random hatch path now honors depth level by scaling life-story span and extracted memory count.
- Validation: `node --test tests/unit/*.test.js tests/integration/*.test.js` passed (396 pass, 0 fail).

#### NekoCore first-run reset and voice customization hardening
- `reset-all.js`: factory reset now always reprovisions `entity_nekocore` and seeds architecture document knowledge on reset.
- `server/brain/nekocore/reset-runtime.js` (new): added NekoCore-scoped runtime reset that preserves `nkdoc_*` architecture chunks while clearing non-system memory stores.
- `server/brain/nekocore/persona-profile.js` (new): added editable voice/personality profile presets and prompt regeneration helpers.
- `server/routes/nekocore-routes.js`: added new endpoints:
  - `GET /api/nekocore/persona`
  - `POST /api/nekocore/persona`
  - `POST /api/nekocore/persona/reset`
  - `POST /api/nekocore/reset`
- `client/nekocore.html`, `client/js/nekocore-app.js`, `client/css/ui-v2.css`: added preset buttons + editable fields for voice and character guidance, plus persona reset and NekoCore memory factory reset actions.
- `server/brain/nekocore/bootstrap.js`: now seeds persona/system prompt through shared persona profile helper for consistent first-run defaults.
- `tests/integration/nekocore-routes.test.js`: expanded smoke coverage for new persona/reset endpoints.

#### BUG-10 adjusted (onboarding removed from chat; owned by Creator/setup)
- `server/brain/core/orchestrator.js`: removed chat-time onboarding interception, so normal chat flow no longer diverts into onboarding Q&A.
- `client/js/chat.js`: removed chat-side onboarding announcements and first-message name prompt gate to prevent accidental name capture from generic greetings.
- `client/index.html` and `client/css/ui-v2.css`: removed chat onboarding banner UI and related styling.
- Onboarding now belongs to Creator/setup input flows and server onboarding seed endpoint, not runtime chat conversation.
- Validation: `npm.cmd test` passed (393 pass, 0 fail).

#### BUG-11 + BUG-12 fixed (sleep flow and compress/save reliability)
- `client/js/sleep.js`: `startSleep()` now blocks when no active entity is loaded; this prevents flash-and-return behavior with no valid target.
- `client/js/sleep.js`: when `/api/memories` returns no archive files, sleep now uses the pre-sleep compressed session as fallback dream input instead of aborting.
- `client/js/chat.js`: fixed manual compression fallback path by defining a safe fallback filename and awaiting fallback memory save.
- `client/js/chat.js`: made session-meta handling null-safe to avoid length/access errors when evaluator output is empty.
- `client/index.html`: updated chat toolbar button label from `Save` to `Compress & Save` at initial render.
- Validation: `npm.cmd test` passed (393 pass, 0 fail).

### 2026-03-14

#### NekoCore Browser host module scaffold created (NB-2-1)
- Created `browser-host/package.json` (`@nekocore/browser-host` v0.0.1, MIT, Node >=18).
- Created `browser-host/index.js` — minimal entry point exporting module name and version; boundary ownership comment included.
- Verified `require('./browser-host')` loads without error on target platform.
- Tracking docs synced: plan checklist, ledger, stop/resume, WORKLOG, OPEN-ITEMS all advanced to NB-2-2.

#### NekoCore Browser NB-1 exit review and NB-2 spike phase opened (NB-2-0)
- `Documents/current/PLAN-NEKOCORE-BROWSER-PHASE0-v1.md`: marked NB-1 Done; added Phase NB-2 with slices NB-2-0 through NB-2-6.
- `NEKOCORE-BROWSER-ROADMAP.md`: synced Phase 1 exit and NB-2 spike slice list.
- `WORKLOG.md` and `Documents/current/OPEN-ITEMS-AUDIT.md`: advanced active phase to NB-2 and set NB-2-1 as next action.

#### NekoCore Browser bridge/API contract baseline defined (NB-1-2)
- `Documents/current/PLAN-NEKOCORE-BROWSER-PHASE0-v1.md`: marked NB-1-2 complete and closed NB-1 slice set.
- `Documents/current/CONTRACTS-AND-SCHEMAS.md`: added Browser Bridge/API Contract Baseline with endpoint, event, and error payload shapes.
- `NEKOCORE-BROWSER-ROADMAP.md` and `Documents/current/RELEASE-NOTES.md`: synced NB-1-2 baseline decisions.
- `WORKLOG.md` and `Documents/current/OPEN-ITEMS-AUDIT.md`: marked NB-1 technical spike-prep gate complete.

#### NekoCore Browser repo module boundary map defined (NB-1-1)
- `Documents/current/PLAN-NEKOCORE-BROWSER-PHASE0-v1.md`: marked NB-1-1 complete and moved active slice to NB-1-2.
- `NEKOCORE-BROWSER-ROADMAP.md`: added NB-1-1 boundary ownership baseline.
- `Documents/current/CONTRACTS-AND-SCHEMAS.md`: added Browser Module Boundary Contract.
- `Documents/current/SERVER-MODULE-MAP.md`: added browser module ownership matrix.
- `WORKLOG.md` and `Documents/current/OPEN-ITEMS-AUDIT.md`: synced active slice to NB-1-2.

#### NekoCore Browser spike acceptance baseline defined (NB-1-0)
- `Documents/current/PLAN-NEKOCORE-BROWSER-PHASE0-v1.md`: added acceptance checks for navigation, tab model, lifecycle events, and download visibility.
- `Documents/current/CONTRACTS-AND-SCHEMAS.md`: added Browser Spike Acceptance Contract.
- `Documents/current/RELEASE-NOTES.md`: synced NB-1-0 acceptance baseline and evidence requirements.
- `WORKLOG.md` and `Documents/current/OPEN-ITEMS-AUDIT.md`: marked NB-1-0 complete and moved active slice to NB-1-1.

#### NekoCore Browser Phase 0 exit review completed (NB-0-5)
- `Documents/current/PLAN-NEKOCORE-BROWSER-PHASE0-v1.md`: marked NB-0 phase done and unlocked NB-1.
- Active slice moved to NB-1-0 (technical spike acceptance checks).
- `Documents/current/OPEN-ITEMS-AUDIT.md` and `WORKLOG.md`: synced active phase state to NB-1.

#### NekoCore Browser contributor provenance policy (NB-0-4)
- `NEKOCORE-BROWSER-ROADMAP.md`: contributor provenance decision finalized to DCO.
- Added DCO sign-off requirement and enforcement path notes.
- `Documents/current/VISION-AND-ROADMAP.md` and `README.md`: synchronized DCO baseline for browser-phase contributions.
- `Documents/current/OPEN-ITEMS-AUDIT.md`: marked NB-0-4 complete and moved next active slice to NB-0-5.

#### NekoCore Browser data boundary policy (NB-0-3)
- `NEKOCORE-BROWSER-ROADMAP.md`: added browser-data vs REM-memory policy, persistence defaults, and explicit consent rules.
- `Documents/current/CONTRACTS-AND-SCHEMAS.md`: added Browser Data Boundary Contract.
- `README.md`: added Browser Data and Memory Policy section for contributor/user clarity.
- `Documents/current/RELEASE-NOTES.md` and `Documents/current/OPEN-ITEMS-AUDIT.md`: synced NB-0-3 completion and next active slice.

#### NekoCore Browser dependency and notices policy (NB-0-2)
- `NEKOCORE-BROWSER-ROADMAP.md`: added dependency approval checklist and third-party notices policy.
- Added blocked dependency classes and release attribution requirements.
- Added engine notice mapping for WebView2/CEF/Electron-style runtime choices.
- `Documents/current/CONTRACTS-AND-SCHEMAS.md`: added Browser Dependency Governance Contract.
- `Documents/current/RELEASE-NOTES.md` and `Documents/current/OPEN-ITEMS-AUDIT.md`: synced NB-0-2 completion and next active slice.

#### NekoCore Browser scope lock and non-goals (NB-0-1)
- `NEKOCORE-BROWSER-ROADMAP.md`: status moved to `In Progress` and scope-lock section added.
- Scope now explicitly binds implementation to app-on-engine direction.
- Out-of-scope rules made explicit: no custom engine work, no bypass-class features, no hidden persistence.
- `Documents/current/VISION-AND-ROADMAP.md`: aligned to active scope-lock and non-goals statement.

#### Interface-first shell update + browser UX pass (UI-Shell-2026-03-14)
- `client/index.html`: start launcher and taskbar flows refined for easier discoverability; Users surface now includes direct logout action.
- `client/js/app.js`: start menu category navigation, pinned-app behavior stability, and interaction race handling hardened.
- `client/js/app.js`: browser app gains in-app search home/results/page switching with minimized-results recovery controls.
- `client/css/ui-v2.css`: power controls, launcher cards, taskbar icon styling, and browser results/home styles refined.
- `client/assets/NekoCat.svg`: new launcher/taskbar app icon asset.

#### Browser lifecycle + shutdown behavior hardening (Runtime-Window-2026-03-14)
- `server/services/auto-open-browser.js`: dedicated WebUI window close helper added for shutdown flow.
- `server/services/runtime-lifecycle.js`: graceful shutdown now closes dedicated WebUI window and resets browser-open state.
- `server/server.js`: startup auto-open path aligned to preferred Chrome runtime and dedicated window behavior.
- `tests/unit/auto-open-browser.test.js`: launcher/runtime behavior tests expanded and kept green.

#### Documentation and roadmap sync (Docs-Sync-2026-03-14)
- `README.md`: added Current Direction and Copyright and Community Safety sections.
- `QUICKSTART.md`: added Basic Use Right Now flow for current desktop shell behavior.
- `NEKOCORE-BROWSER-ROADMAP.md`: phased draft for a compliant, engine-based NekoCore Browser strategy.
- `.gitignore`: backup snapshot folders and runtime artifact content rules tightened while allowing tracked directory placeholders.

Verification:
- `npm test`: 334 pass, 0 fail.

### 2026-03-13

#### Full documentation truth sync + architecture deck refresh (Docs-Truth-Review-1)
- `Documents/current/ARCHITECTURE-OVERVIEW.md`: version/state synced to 0.6.0, pipeline wording corrected (`1A + 1D` parallel, `1C` after both, final orchestrator with inlined 2B), memory lifecycle file ownership corrected.
- `Documents/current/MEMORY-SYSTEM.md`: corrected metadata-vs-content storage note (`log.json` metadata, `semantic.txt` content), schema text aligned to canonical fields, decay ownership paths corrected.
- `Documents/current/CONTRACTS-AND-SCHEMAS.md`: schema canonical field list aligned to `memory-schema.js`, enforcement wording updated, stale `memory-service.js` reference removed.
- `Documents/current/OPEN-ITEMS-AUDIT.md`: stale `memorySchemaVersion not enforced` item resolved to DONE; README/docs baseline statuses refreshed.
- `Documents/REM-Architecture-v0.6.0.html`: removed stale preAlpha wording and updated slides for current orchestrator flow, route/module counts, and memory schema language.
- `README.md`: docs-governance wording updated to reflect tracked source-of-truth docs in `Documents/current/`.

#### Skills token-gating + trigger system (Skills-Gate-1)
- `server/brain/generation/aspect-prompts.js`: `getConsciousPrompt()` extended with 4th `options = {}` param. Skills, workspace-tools, and task-planning sections now fully absent from the prompt by default (zero tokens). Injected only when `options.activeSkillsSection` or `options.includeWorkspaceTools` is truthy.
- `server/brain/core/orchestrator.js`: `runConscious()` parses `/skill <trigger>` (first word only, exact) and `/tool` from user message. Both passed as flags into `getConsciousPrompt`. `getSkillContext` callback slot added to constructor.
- `server/brain/skills/skill-manager.js`: new `buildSkillsPromptFor(trigger)` — exact, case-sensitive match on `skill.trigger || skill.name`. No fuzzy/partial/lowercase fallback. Returns XML block or null.
- `server/brain/skills/skill-manager.js`: `trigger` field added — read from SKILL.md frontmatter in `loadAll()`, exposed in `list()`, written in `createSkill()` when provided.
- `server/server.js`: `getSkillContext` callback wired into Orchestrator options.
- `server/routes/skills-routes.js`: `trigger` passed through from POST body to `createSkill()`.
- `client/index.html`: create-skill modal gains `Trigger` input field with exact/case-sensitive note; how-to guide rewritten for `/skill <trigger>` + `/tool` commands; skill detail panel gains invoke command display.
- `client/js/skills-ui.js`: skill cards show `/skill <trigger>` badge; detail panel shows invoke command; trigger field wired in create + cleared on close.
- `README.md`: Skills section fully rewritten with command syntax, exact/case-sensitive warning, built-in skills table with triggers, creation instructions.
- Token savings: ~750 tokens/turn on default turns; matched skill XML only on `/skill` turns; workspace docs only on `/tool` turns.
- All 318 tests pass.


- `server/brain/core/orchestrator.js`: rewired Promise chain so Conscious (1C) waits for BOTH Subconscious (1A) AND Dream-Intuition (1D) to complete before running.
- `server/brain/core/orchestrator.js`: 1D output (`dreamText`) is now passed into `runConscious()` and forwarded to `getConsciousPrompt()` as the real dream associations. Conscious reasons with 1A memory context AND 1D creative output simultaneously.
- `server/brain/core/orchestrator.js`: Orchestrator merge prompt restructured — role changed from "synthesizer" to "reviewer + voicer". Orchestrator receives full copy of everything Conscious had (1A context, 1D output, turn signals) plus the Conscious draft, reviews for fit, applies entity voice.
- `server/brain/generation/aspect-prompts.js`: `getOrchestratorPrompt()` system prompt rewritten to define reviewer/voicer role — explicit that thinking is done by Conscious, Orchestrator shapes HOW it is said not WHAT.
- `tests/unit/dream-split-guards.test.js`: updated guard regex to match the new code structure where `runDreamIntuition` feeds `Promise.all` upstream (intent unchanged — runDreamIntuition is still the live-loop contributor).
- `Documents/current/PIPELINE-AND-ORCHESTRATION.md`: overview, diagram, and contributor descriptions updated to reflect new flow.
- All 318 tests pass.
- `Documents/current/PIPELINE-AND-ORCHESTRATION.md`: updated stage diagram and stage descriptions to match current runtime flow: `1A + 1D` parallel, then `1C` with reused same-turn subconscious memory context, then single final orchestrator synthesis with refinement inlined.
- Updated call-count guidance to reflect current behavior (4 synchronous base calls, optional chatlog reconstruction calls inside 1A, async post-turn side effects).
- `README.md`: updated Per-Message Pipeline diagram to match the same flow.

#### Conscious active context reuse (Con-ActiveCtx-2)
- `server/brain/core/orchestrator.js`: removed second per-turn conscious retrieval (`getMemoryContext(userMessage)`) to avoid duplicate recall work.
- `server/brain/core/orchestrator.js`: conscious now receives active recall context from the already-fetched same-turn `subconsciousRaw.memoryContext`.
- Active recall hints (top memories + related chatlogs) remain in conscious briefing, but retrieval is now single-pass per turn.

#### Conscious active recall context (Con-ActiveCtx-1)
- `server/brain/core/orchestrator.js`: `runConscious()` appends a bounded `[ACTIVE RECALL CONTEXT]` block into the conscious briefing input.
- The active context includes concise top recalled memories (up to 6) and related chatlog snippets (up to 3) so conscious has direct per-turn retrieval context while composing.
- Relationship signal plumbing remains active and is combined with turn signals + active recall context in the same conscious-side prompt payload.

#### BugTest loop introduction (BugTest-Loop-1)
- New: `Documents/current/BUGTEST-NOTES.md` as active testing-phase queue with status flow (`Queued`, `In Test`, `Pass`, `Fail`, `Deferred`), reusable checklist template, and queued items for current high-impact slices.
- `WORKLOG.md`: added `BugTest Notes Loop` policy so behavior-impacting slices must add/update BugTest entries in the same slice, while low-risk cosmetic/text-only changes remain optional.

#### Memory recall cap tuning (Mem-Recall-Tuning-1)
- `server/services/memory-retrieval.js`: raised default subconscious pull cap from 24 to 36 (`getSubconsciousMemoryContext(..., limit = 36)`).
- `server/services/memory-retrieval.js`: raised prompt context memory cap from 8 to 12 (`contextConnections.slice(0, 12)`).
- `server/services/memory-retrieval.js`: raised related chatlog recall cap from 1 to 3 (`ltmScores.slice(0, 3)`).

#### Conscious relationship context plumbing (Rel-Flow-1)
- `server/brain/core/orchestrator.js`: `orchestrate()` now passes `entityId` into `runConscious(...)` so conscious can resolve entity-scoped relationship state for the active user.
- `server/brain/core/orchestrator.js`: `runConscious()` now loads relationship state from `relationship-service` and appends a bounded `[RELATIONSHIP SIGNAL]` block (feeling, trust, rapport, role mapping, top beliefs, short summary) into the concise conscious briefing.
- No contributor order change: Subconscious, Conscious, and Dream remain parallel; this slice only closes missing relationship context parity for conscious composition.

### 2026-03-12

#### Chat layout restructure (Nav-2)
- Advanced nav item: Replaced collapsible nav-group with a regular nav-item button ("Sleep & Tokens"). Opens as a full page tab — no dropdown.
- Visualizer replaces Neural: Neural nav-item and tab replaced with Visualizer. Embeds `/visualizer.html` in an iframe — no more popup window. `openVisualizer()` now switches to the Visualizer tab.
- Workspace & Activity moved to nav sidebar: Added as top-level nav-items with dedicated tab-content panels. Removed from chat sidebar.
- Chat right panel redesigned: Now shows Physical compact widget (always visible, somatic status + per-metric rows) and Pipeline Log (collapsible, starts closed).
- Physical nav-item removed from sidebar (content lives in chat right panel now).
- All dropdowns start closed by default.
- Log functions (`lg()`, `toggleLog()`, `autoOpenLog()`, `addSystemToLog()`, `resetAll()`) updated to target new sidebar log element.

#### Namespace deduplication: root memories/ isolation
- `server/server.js`: Timeline logger entity resolver no longer returns `rootDir: MEM_DIR` as fallback — system events go to `timeline-system.ndjson`, entity events always target entity-scoped paths
- `server/routes/memory-routes.js`: Removed all 9 `ctx.MEM_DIR` fallback code paths that wrote/read entity-type data (persona, mood, archives, etc.) from root `memories/`. Write ops return 409 when no entity is active; read ops return empty defaults. Only `getSystemPrompt` retains root fallback as an explicit default template.
- Root `memories/` is now strictly for system-level defaults (template prompt, system timeline logs); entity data lives exclusively in `entities/entity_<id>/memories/`

#### Unbreakable Identity Mode (entity creation)
- Added `🔒 Unbreakable Identity` checkbox to guided entity creation form (`client/index.html`)
- `client/js/app.js` reads checkbox, passes `unbreakable` in POST body, resets on modal close
- `server/routes/entity-routes.js` (guided creation): stores `unbreakable: !!unbreakable` in `entity.json`; branches `system-prompt.txt` template:
  - **Unbreakable**: `Personality: I am X. My traits are: Y.` + `YOUR BACKSTORY:` at top + `🔒 IDENTITY LOCK` block
  - **Evolving** (default): `YOUR STARTING TRAITS (where you began — you will grow beyond these)` + `YOUR ORIGIN STORY:` — backstory moved last by consolidator
- `server/brain/generation/context-consolidator.js`: checks `entity.json` for `unbreakable: true` before every context rebuild:
  - Unbreakable → `system-prompt.txt` included verbatim, no extraction, no traits stripping, no Section 5 repositioning
  - Evolving → existing behavior: backstory extracted and moved after memories under "Roots, Not Chains" framing; frozen traits line stripped

#### TASK_PLAN / TOOL pipeline conflict fix
- `server/brain/generation/aspect-prompts.js` (conscious prompt): added `CRITICAL — MUTUALLY EXCLUSIVE` rule: single `[TOOL:]` call → use TOOL directly, do NOT wrap in `[TASK_PLAN]`
- `server/brain/generation/aspect-prompts.js` (orchestrator prompt): changed "PRESERVE [TASK_PLAN]" to "only echo if conscious draft already contains one; NEVER generate both [TASK_PLAN] AND inline [TOOL:] together"
- `server/server.js`: tool execution now sets `result._toolsHandled = true`; task plan detection skips when `_toolsHandled` is set; safety-net strip after all task/tool logic removes `[TASK_PLAN]...[/TASK_PLAN]` and orphan `[TOOL:...]` from `result.finalResponse` before postProcessResponse

#### semantic.txt memory loading fix
- `server/brain/generation/context-consolidator.js`: was reading `log.json.semantic` field (always empty); now falls back to reading `semantic.txt` companion file when `log.json` has no `semantic` field
- Impact: all entities were building context.md with zero memory content (visible but empty); this fix restores full memory access to the context for every entity

#### Origin story evolution fix (context-consolidator)
- `server/brain/generation/context-consolidator.js`: backstory/origin story block now extracted from `system-prompt.txt` and repositioned LAST in context (after memories), framed as "Roots, Not Chains"
- Frozen `Personality: I am X. My traits are: Y.` declaration stripped from injected system prompt content (is a creation snapshot, not current truth — persona.json carries the live version)
- Default auto-generated `llmPersonality` from persona.json suppressed from context (prevents frozen creation default overriding evolved state)

#### Neko legacy migration (entity_neko-1772823025096)
- Migrated from Memory Architect v1 format to REM System format
- `entity.json`: added `configProfileRef`, `ownerId`, `isPublic`, `creation_mode: "legacy"`, `memory_count: 607`
- `memories/persona.json`: added `llmName`, `llmStyle`, `userName`, `userIdentity`, `activeUserId`, `createdAt`; cleaned `continuityNotes`; removed `rawDreamOutput` blob
- `memories/system-prompt.txt`: rebranded header, updated to evolving-entity trait framing
- `memories/users/`: created with `user_..._voard.json` profile + `_active.json`
- `memories/context.md`: rebuilt from 2,313 chars (0 memories) → 11,764 chars (607 memories visible)

---

### 2026-03-11

#### Phase E — Runtime Quality Hardening (all slices done)

**E1 — doc_* and boilerplate memory filtering**
- `server/services/memory-retrieval.js`: after computing `contextConnections`, filter out all `doc_*` ID entries (document ingestion chunks were scoring 0.965 in subconscious retrieval and flooding LLM context with irrelevant book content)
- Same file: filter entries whose semantic summary contains system boilerplate markers (`[SUBCONSCIOUS MEMORY CONTEXT]`, `Subconscious turn context for this user message`) — prevents corrupted `user_profile_*` memories from echoing system context into responses

**E2 — doc_* chatlog recall filtering**
- `server/services/memory-retrieval.js`: chatlog recall topic collection now excludes `doc_*` IDs
- Same file: `ltm/` folder scan now pre-filters `doc_*` named folders before stat check — eliminates spurious V4-chatlog-reconstruction LLM call that added ~2s latency per turn

**E3 — boilerplate memory creation guard**
- `server/services/post-response-memory.js`: before `createCoreMemory`, validate that `episodic.semantic` does not contain `[SUBCONSCIOUS MEMORY CONTEXT]`, `[CONVERSATION RECALL]`, `[INTERNAL-RESUME]`, or similar boilerplate — if so, skip memory creation with warning

**E4 — timing UI label fix**
- `client/js/chat.js`: timing display now uses `contributors_parallel_ms` / `refinement_ms` / `orchestrator_final_ms` keys with correct labels (`Contributors (∥)`, `Refinement (2B)`, `Final`) instead of stale `Sub/Conscious` labels from old serial pipeline that both showed the same value

#### Phase A Re-evaluation — Server Decomposition (all slices done, 318 tests pass)

**A-Re0 — Boundary guard tests**
- `tests/unit/boundary-cleanup-guards.test.js`: source-scan assertions that function definitions for `callLLMWithRuntime`, `callSubconsciousReranker`, `loadAspectRuntimeConfig`, `normalizeAspectRuntimeConfig`, `createCoreMemory`, `createSemanticKnowledge`, `getSubconsciousMemoryContext` are NOT in `server.js`; and that `parseJsonBlock` is not locally defined in `post-response-memory.js`

**A-Re1 — LLM Interface extraction**
- New: `server/services/llm-interface.js` — `callLLMWithRuntime(runtime, messages, opts, somaticAwareness)` + `callSubconsciousReranker(candidates, userMessage, runtime)` extracted from server.js (~230 lines)

**A-Re2 — Config runtime extraction**
- New: `server/services/config-runtime.js` — `normalizeSubconsciousRuntimeConfig`, `normalizeAspectRuntimeConfig`, `mapAspectKey`, `loadAspectRuntimeConfig`, `resolveProfileAspectConfigs` extracted from server.js (~209 lines)

**A-Re3 — Memory operations extraction**
- New: `server/services/memory-operations.js` — `createCoreMemory` + `createSemanticKnowledge` extracted from server.js (~258 lines)

**A-Re4 — Memory retrieval extraction**
- New: `server/services/memory-retrieval.js` — `getSubconsciousMemoryContext` + helpers (`extractSubconsciousTopics`, `getSemanticPreview`, `getChatlogContent`, `buildSubconsciousContextBlock`) extracted from server.js (~365 lines)

**A-Re5 — parseJsonBlock deduplication**
- Removed local `parseJsonBlock` definition from `server/services/post-response-memory.js` (lines 1-17); now imports from `llm-runtime-utils`

**A-Re6 — Final verification**
- `server/server.js` reduced from 2,396 lines → 1,290 lines (−46%); all 12 boundary guards green; 318 tests pass

#### Authentication System
- New: `server/services/auth-service.js` — account creation, login, session validation (bcrypt password hashing, session token generation)
- New: `server/routes/auth-routes.js` — `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`
- New: `client/js/login.js` — login UI logic
- New: `server/data/accounts.json` — account store
- New: `server/data/sessions.json` — session store

#### Live-Loop Refactor Hardening
- Fixed budget guard wiring: cumulative contributor token usage (1A + 1C + 1D + 2B) passed to `runOrchestrator` as `tokenUsageSoFar` so `enforceBudgetGuard` can block O2 escalation when budget is already consumed
- 14 new integration tests in `tests/integration/orchestrator.test.js` covering artifact shapes, contributor failure isolation, budget guard paths

#### Phase D — Worker Subsystem Pilot (all slices done, 300 tests pass)
- New: `server/contracts/worker-output-contract.js` — `validateWorkerOutput` + `normalizeWorkerOutput`; required fields: `summary`, `signals`, `confidence`
- New: `server/brain/core/worker-registry.js` — in-memory Map with register/unregister/get/list/clear
- New: `server/brain/core/worker-dispatcher.js` — `invokeWorker` wraps call in latency guard, validates contract, emits bus events, returns null on failure
- `server/brain/core/orchestrator.js`: accepts `workerRegistry` constructor option; all three contributors check registry first
- `innerDialog.artifacts.workerDiagnostics` added on every orchestration call
- New: `tests/unit/worker-subsystem.test.js` — 46 tests

#### Phase C — Escalation Guardrails (254 tests pass)
- `server/brain/core/orchestration-policy.js`: `shouldEscalateO2` returns `{ escalate, reason }` (was bare boolean); reason vocabulary: `high-tension`, `error-constraint-combo`, `planning-implementation-combo`, `user-requested-depth`, `none`
- New: `enforceLatencyGuard(callFn, maxMs)` — wraps async call in 35s timeout race; rejects with `{ timedOut: true, maxMs }` on ceiling hit
- `server/brain/core/orchestrator.js`: C2 budget check before O2 selection; C3 latency guard wrapping O2 synthesis; C4 `_escalation` telemetry object returned from `runOrchestrator`
- New: `tests/unit/escalation-guardrails.test.js` — 31 tests

#### Phase B — Dream Split Hardening (224 tests pass)
- New: `server/brain/cognition/dream-maintenance-selector.js` — candidate scoring across emotion, learn tags, error markers, staleness, graph degree; replaces inline `getMostImportant` heuristic
- New: `server/brain/knowledge/dream-link-writer.js` — dream-to-source-memory link persistence + cognitive bus event emission
- `server/brain/cognition/phases/phase-dreams.js`: wired with selector and link writer
- New: `tests/unit/dream-split-guards.test.js` — guards verifying live loop no-write policy
- New: `tests/unit/dream-maintenance.test.js` — 34 tests

#### Phase A — Initial Cleanup (all 5 slices done, 190 tests pass)
- New: `server/services/runtime-lifecycle.js` — server startup/shutdown extracted from server.js
- New: `server/services/post-response-memory.js` — async memory encoding + trace-linking extracted
- New: `server/services/response-postprocess.js` — response postprocessing extracted
- New: `tests/unit/boundary-cleanup-guards.test.js` — initial boundary regression tests
- New: `WORKLOG.md` — structured work tracking (37KB), phase checklists, slice definitions, implementation ledger, stop/resume snapshots

#### Other service extractions
- New: `server/services/user-profiles.js` — per-entity user registry management
- New: `server/services/relationship-service.js` — per-user relationship state (feeling/trust/rapport/beliefs), LLM-updated post-turn
- New: `server/services/config-runtime.js` — aspect/profile config resolution
- New: `server/services/llm-runtime-utils.js` — shared utilities (parseJsonBlock, endpoint normalization, usage estimation)
- New: `server/brain/utils/turn-signals.js` — turn signal extraction helpers
- New: `server/contracts/contributor-contracts.js` — contributor output shape validators
- New: `server/brain/core/orchestration-policy.js` — O2 escalation + budget + latency policy

#### Bug fixes
- Server startup `ReferenceError`: `getSemanticPreview` and `getChatlogContent` were referenced before extraction; fixed with correct destructure from `createMemoryRetrieval`
- Removed empty orphan config directory `server/Config/` (was not referenced anywhere; canonical config is `<root>/Config/`)

---

## [0.5.2-prealpha] — 2026-03-11

### Highlights
- Parallel contributor pipeline live (1A + 1C + 1D in parallel)
- Multi-user system (entity tracks separate user profiles)
- Per-user relationship system (entity develops feeling/trust/rapport/beliefs per user)
- Relationship context injected into subconscious pass

### Added
- Parallel contributor pipeline: subconscious (1A) + conscious (1C) + dream-intuition (1D) run via `Promise.all`; orchestrator runs 2B refinement then final synthesis
- `server/brain/cognition/dream-intuition-adapter.js` — live-loop dream-intuition contributor (abstract links, no memory writes)
- `server/brain/utils/turn-signals.js` — deterministic subject/event/emotion/tension preprocessing
- `server/contracts/contributor-contracts.js` — output shape validators for all three contributors
- `server/brain/core/orchestration-policy.js` — initial stage-based escalation policy
- User profiles: `server/services/user-profiles.js` + routes in `entity-routes.js` (GET/POST/PUT/DELETE /api/users, GET/POST /api/users/active)
- Relationship service: `server/services/relationship-service.js` — 14-value feeling scale, trust/rapport float, per-user beliefs, LLM-updated after each turn
- Timeline playback panel in neural visualizer (transport controls, live mode, speed controls)
- Browser auto-open guard (`server/services/auto-open-browser.js`) — prevents duplicate windows on quick restart
- `tests/integration/orchestrator.test.js` — initial orchestrator integration test suite

### Changed
- Dream maintenance (sleep offline) separated from Dream Intuition (live chat): intuition adapter has no memory writes at all
- `innerDialog.artifacts` now includes `escalation`, `workerDiagnostics`, timing, and tokenUsage keys

---

## [0.5.1-prealpha] — 2026-03-10

### Added
- Timeline logger (`server/services/timeline-logger.js`) with NDJSON records for all cognitive events
- Timeline APIs: `GET /api/timeline`, `GET /api/timeline/stream`
- Atomic memory writes (write-to-temp + rename strategy)
- Memory index divergence audit/rebuild tooling
- Brain-loop health counters and circuit-breaker controls

---

## [0.5.0-prealpha] — 2026-03-09

### Added
- Neko-Pixel-Pro pixel art engine from dream/memory narratives
- Dream Visualizer (animated GIF composition of pixel art frames)
- Dream Gallery tab in browser UI
- Boredom Engine — autonomous self-directed activity when entity is understimulated
- Neural Visualizer standalone page (Three.js 3D memory graph)
- Pipeline Debug View (real-time cognitive pipeline visualization)
- Belief Graph (`server/beliefs/beliefGraph.js`)
- Neurochemistry Engine (dopamine, cortisol, serotonin, oxytocin simulation)
- Somatic Awareness Engine (hardware metrics → felt sensations → neurochemical influence)
- Workspace skills: `ws_mkdir`, `ws_move`

---

## [0.4.0-prealpha] — 2026-03-09

- Rebranded from Memory Architect to REM System (Recursive Echo Memory)
