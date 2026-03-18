# Changelog

All notable changes to NekoCore OS (built on the REM System) will be documented in this file.
Built with MA (Memory Architect v1).

## [Unreleased]

### Planned
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA):** Plan locked and architecture finalized. **Entity Networking & Collaborative Planning added (2026-03-18).** NekoCore OS gains a full task orchestration engine alongside the companion pipeline. Tri-stage pipeline (Classify → Contextualize → Execute). NekoCore acts as the Frontman — workers execute silently; she translates step completions into milestone messages in her own voice, handles stall detection and user prompting, and routes mid-task messages to steer or redirect workers. Task Archive & Project Store: workers write to durable per-task archives at each step using existing `archive-manager.js` infrastructure — no LLM calls. Each project accumulates a complete story (brief, steps, sources, drafts, final output) that survives context overflow and serves as the data foundation for Phase 5 Predictive Memory. **Entity Networking (NEW):** Static LAN-based entity discovery (fixed config). Multi-entity planning task type: user poses a complex question, NekoCore launches a collaborative planning chat, adds relevant entities (research, analysis, synthesis specialists), moderates rounds of debate, and synthesizes a final plan with full reasoning archive (why we chose this, rebuttals, trade-offs). This is the high-rigor foundation for AI capability research. New subsystems: Task Module Registry, Intent Classifier, Task Context Gatherer, Task Executor + Event Bus, Task Session Manager, Task Archive Writer/Reader, Task Project Store, Entity Network Registry, Entity Chat Manager, Planning Orchestrator, Frontman Bridge, Task Routes API, Entity Chat Endpoints, Client Task UI. Non-breaking — companion pipeline unchanged. See `Documents/current/PLAN-MTOA-v1.md`.

### Added
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA) T-7: Client Task UI + SSE Task Panel (complete)**
  - Added `client/js/apps/optional/task-ui.js` (optional app, 280 lines): `window.handleTaskSSEEvent` delegation hook entry point, `_taskUI` state manager, `_taskUIRenderBadge`, `openTaskHistory` (fetches `/api/task/history/:entityId`), `openTaskSessionDetail` (fetches `/api/task/session/:id`), `cancelActiveTask` (calls `POST /api/task/cancel/:id`), `_taskUIPushTelemetry` (bridges task SSE events to tmEventFeed)
  - Added task SSE event delegates in `chat.js` `initBrainSSE()`: `task_milestone`, `task_needs_input`, `task_complete`, `task_error`, `task_steering_injected` — all delegate to `window.handleTaskSSEEvent`; chat.js owns SSE connection, task-ui.js owns state
  - Added `runtimeTelemetry.taskState` field to `telemetry-ui.js`; updated `updateTaskManagerView` to render `#tmActiveTaskSection` with live task type/step/status
  - Added to `index.html`: task status badge in chat-bar-r, task history panel, task detail panel, tmActiveTaskSection in Task Manager, `<script>` tag for task-ui.js before boot.js
  - Added task badge/panel/step/history/detail styles to `ui-v2.css`
  - Added `task-ui-guards.test.js` (25 tests); validation: **25 pass, 0 fail** (guards); **89 pass, 0 fail** (T-3→T-7 stack)
  - `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA) T-6: Task Pipeline Integration + Frontman Bridge (complete)**
  - Added `server/brain/tasks/task-frontman.js` to consume task event-bus lifecycle events and synthesize user-facing milestone/status updates in NekoCore voice (workers remain silent)
  - Added `server/brain/tasks/task-pipeline-bridge.js` with `detectAndDispatchTask(...)` for pre-orchestrator task intent fork, confidence gating, planning-mode collaborative routing, and non-task fallback
  - Integrated task fork into `server/services/chat-pipeline.js` before companion orchestration path so task-intent turns dispatch to task execution/planning when confidence threshold is met
  - Added `buildTaskFrontmanPrompt` to `server/brain/generation/aspect-prompts.js` and exported it for Frontman synthesis wiring
  - Added guard tests: `task-frontman.test.js`, `task-pipeline-bridge.test.js`
  - Validation runs: focused T-6 batch + task route/chat route checks -> **15 passed, 0 failed**; consolidated T-3→T-6 task stack -> **80 passed, 0 failed**
  - `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]` — pipeline fork remains server-side orchestration only; route/server bootstrap boundaries preserved
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA) T-5: Task Routes + Entity Chat Endpoints (complete)**
  - Added `server/routes/task-routes.js` with task operations API: `POST /api/task/run`, `GET /api/task/session/:id`, `POST /api/task/cancel/:id`, `GET /api/task/modules`, `GET /api/task/history/:entityId`
  - Added `server/brain/tasks/entity-chat-manager.js` (chat session orchestration: create/get/add/remove/route/close)
  - Added `server/routes/entity-chat-routes.js` with entity chat API: `POST /api/entity/chat/create`, `POST /api/entity/chat/message`, `POST /api/entity/chat/add/:sessionId/:entityId`, `POST /api/entity/chat/remove/:sessionId/:entityId`, `GET /api/entity/chat/:sessionId`, `POST /api/entity/chat/:sessionId/close`
  - Wired task and entity-chat routes into `server/server.js` route bootstrap + dispatcher chain (composition only)
  - Added guard tests: `task-routes.test.js`, `entity-chat-routes.test.js`
  - Updated `task-executor.test.js` for Node test runner compatibility (`node:test` imports and cleanup assertions)
  - Validation run: task orchestration stack tests (T-3/T-4/T-5) -> **71 passed, 0 failed**
  - `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]` — route handlers remain thin; orchestration/state logic is delegated to task modules/managers
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA) T-4/T-4b: Session Manager + Task Archive/Project Store (complete)**
  - `task-session.js` — persisted session lifecycle in `server/data/task-sessions.json` with atomic writes: `createSession`, `getSession`, `updateSession`, `appendStep`, `setStall`, `clearStall`, `appendSteering`, `closeSession`, `pruneOldSessions`
  - `task-project-store.js` — project container persistence under `entities/entity_{id}/memories/projects/`: `createProject`, `getProject`, `listProjects`, `addTaskToProject`, `resolveOrCreateProject` (keyword-overlap continuation heuristic)
  - `task-archive-writer.js` — durable per-task archive writes in `projects/{projectId}/tasks/{taskId}/`: `createTaskArchive`, `appendStep`, `appendSource`, `saveDraft`, `finalize`; non-existent archive operations fail safely
  - `task-archive-reader.js` — archive read-side API: `getTaskSummary`, `getStepHistory`, `getSources`, `getLatestDraft`; supports missing/partial archives without throw
  - Guard tests added (Node test runner): `task-session.test.js`, `task-project-store.test.js`, `task-archive-writer.test.js`, `task-archive-reader.test.js`
  - Validation: targeted suite `node --test` for all four files -> **22 passed, 0 failed**
  - `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]` — task state persistence isolated to server task modules; no UI/route business logic leakage
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA) T-3: Task Executor + Milestone Events (complete)**
  - `task-event-bus.js` — per-session EventEmitter singleton; `emit(sessionId, event)`, `subscribe/unsubscribe`, `drain()` (clears queue), `peek()` (read-only), `cleanup()`, `hasEvents()`
  - `task-executor.js` — `executeTask(config)` orchestrates module-aware prompt assembly, tool filtering, and step execution; emits `milestone` (per step), `needs_input` (stall), `task_complete`, `task_error` events; non-blocking archive writes via `setImmediate`; `resumeWithInput(sessionId, answer)` unblocks stalled executor; `buildTaskSystemPrompt()`, `filterTools()`, `extractSources()`, `isStalled()`
  - `task-runner.js` — added `detectNeedsInput(text)`, `runTask(config)` entry point (plan generation → `executeTaskPlan` pipeline), `onStep`/`onNeedsInput` callbacks wired into step loop; new exports alongside existing API (no breaking changes)
  - `task-executor.test.js` — 53 guard tests: event bus (emit/subscribe/drain/peek/cleanup/hasEvents), system prompt assembly, tool filtering, source extraction, milestone events per step, task_complete shape, task_error + rethrow, needs_input suspend + resume, entity bridge, `runTask`/`detectNeedsInput` guard tests
  - Also fixed wrong require paths in T-1 (`intent-classifier.test.js`) and T-2 (`task-context-gatherer.test.js`) test files
  - `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]` — executor emits events for Frontman consumption; workers are silent; no UI rendering in server modules
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA) T-2: Task Context Gatherer (complete)**
  - Per-task-type source-of-truth retrieval: archive (BM25 entity memory search), workspace_files (scan src/docs for relevant files), web_seed (curated URLs per task type), custom (extensible placeholder)
  - Strategy dispatch: module registry determines which strategy per task type
  - Main API: `gatherContext(taskType, message, entity, options)` → { snippets[], strategy, taskType, retrievedAt, elapsedMs }
  - Batch retrieval: `gatherContextBatch()` for parallel context gathering across multiple task types
  - `task-context-strategies.js` — 260 lines, 4 retrieval strategies with graceful error handling
  - `task-context-gatherer.js` — 140 lines, strategy dispatch and context orchestration
  - `task-context-gatherer.test.js` — 43 guard tests: all strategies, null entity, invalid inputs, snippet format, all 6 task types, batch gathering, performance, edge cases
  - `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]` — gathers context before task execution without modifying task state

### Changed
- Installer readiness proof run (pre-cleanup bounded override):
  - Added exact installer marker slots in `client/js/app.js` (window registry and app-category map) and `client/js/apps/non-core-html-loader.js` (non-core app manifest extension point).
  - Added non-core Hello World payload `client/apps/non-core/core/tab-hello-world.html` with a minimal canvas pong loop and keyboard controls.
  - Added concrete contract `server/contracts/installer-hello-world.contract.example.json` with three install actions (`hello-loader-001`, `hello-window-001`, `hello-category-001`) under strict marker-boundary semantics.
  - Verified strict transactional behavior: initial install attempt failed on exact marker boundary mismatch and auto-rolled back batch writes; after marker normalization, install succeeded with 3 per-entry logs (`entryId`, `writtenBlock`, `closeMarker`).
  - Focused validation pack after successful install: **32 pass, 0 fail** across `installer-marker-engine`, `installer-cli`, `installer-vfs-phase-ab`, `app-manifest-guards`, `desktop-extraction-guards`.

- Installer marker engine repeat-install fix (2026-03-18):
  - Fixed safe-slot consumption bug in `server/tools/installer-marker-engine.js` where first install could consume the only exact insertion boundary.
  - Engine now preserves a new exact marker boundary immediately after each inserted block, enabling subsequent app installs without manual marker recreation.
  - Updated guard tests in `tests/unit/installer-marker-engine.test.js` to lock next-slot preservation and single-boundary multi-entry behavior.
  - Restored fresh empty exact slots after current Hello World inserts in `client/js/app.js` and `client/js/apps/non-core-html-loader.js`.
  - Verified with installer dry-run using `server/contracts/installer-hello-world.contract.example.json`: `ok: true`, `rollback: false`, `appliedFiles: 2`.

- Installer wrapper metadata enhancement (2026-03-18):
  - Installer-inserted blocks now include visible entry-id metadata line: `//JsonEntryId: "<entryId>"` to support safe uninstall targeting by exact string.
  - Marker engine still preserves a fresh exact next boundary after each insertion (`//Open Next json entry id` + blank line + `//Close "`).
  - Backfilled current Hello World wrapper blocks in `client/js/app.js` and `client/js/apps/non-core-html-loader.js` with `hello-window-001`, `hello-category-001`, `hello-loader-001`.
  - Updated focused tests in `tests/unit/installer-marker-engine.test.js` and `tests/unit/installer-cli.test.js`; validation: **9 pass, 0 fail**.

- Installer package guideline baseline finalized pre-cleanup (2026-03-18):
  - Added canonical app-package authoring contract to `docs/CONTRACTS-AND-SCHEMAS.md` with required artifacts, install/uninstall action fields, wrapper format, and transaction/logging rules.
  - Hardened contract schema and examples with required `loggingPolicy.logJsonEntryId=true`:
    - `server/contracts/installer-uninstaller-contract.schema.json`
    - `server/contracts/installer-uninstaller.contract.example.json`
    - `server/contracts/installer-hello-world.contract.example.json`
  - Extended A/B contract guards in `tests/unit/installer-vfs-phase-ab.test.js` to lock `logJsonEntryId` policy.
  - Focused validation run: **14 pass, 0 fail** (`installer-marker-engine`, `installer-cli`, `installer-vfs-phase-ab`).

- Installer app-package checklist completion (2026-03-18):
  - Expanded `docs/CONTRACTS-AND-SCHEMAS.md` installer section with explicit app-author conventions for icon usage, nav target/category mapping, contract template baseline, and package validation checklist.
  - This closes the remaining "partially complete" gap and sets a single canonical packaging guideline before HTML cleanup.

- Installer uninstall cycle support and end-to-end validation (2026-03-18):
  - Added remove-by-entry support to `server/tools/installer-marker-engine.js` using wrapper metadata line `//JsonEntryId: "<entryId>"`.
  - Added `uninstall` command support to `server/tools/installer-cli.js` (transactional grouped remove actions from contract `uninstallActions`).
  - Added npm helper script `installer:remove` in `project/package.json`.
  - Added uninstall-focused guard coverage in:
    - `tests/unit/installer-marker-engine.test.js`
    - `tests/unit/installer-cli.test.js`
  - Executed real Hello World cycle:
    - uninstall apply succeeded (`ok: true`, `rollback: false`, `appliedFiles: 2`)
    - reinstall apply succeeded (`ok: true`, `rollback: false`, `appliedFiles: 2`)
  - Full regression run after cycle: **1364 pass, 0 fail**.

- Added complete app-author transition guide:
  - `docs/HOW-TO-CREATE-AN-APP.md` now documents package structure, wrapper contract model, install/uninstall commands, validation checklist, and reference workflow.

- Installer marker duplication/order regression fix (2026-03-18):
  - Fixed in-file multi-action install ordering in `server/tools/installer-marker-engine.js` by applying entries against original boundary order before considering newly-created next slots.
  - Fixed uninstall normalization to consume optional trailing empty slot and collapse adjacent duplicate empty marker boundaries to one safe slot.
  - Added focused regression guards in `tests/unit/installer-marker-engine.test.js` and `tests/unit/installer-cli.test.js`.
  - Ran uninstall+reinstall heal cycle for Hello World and validated focused installer pack: **20 pass, 0 fail**.

- Cleanup prompt hardening for installer markers (2026-03-18):
  - Updated Gemini cleanup prompt pack and source plan with mandatory marker-preservation rules for installer-managed regions:
    - `Documents/current/PROMPTS-APP-MANIFEST-SHADOW-REFACTOR-v1.md`
    - `Documents/current/PLAN-APP-MANIFEST-SHADOW-REFACTOR-v1.md`
  - Added executable cleanup guard test in `tests/unit/installer-vfs-phase-ab.test.js` to fail if installer open/close markers or empty safe slots are removed from protected shell registration files.
  - Updated `docs/HOW-TO-CREATE-AN-APP.md` with current HTML-scope clarification (registration wiring is installer-managed; payload HTML remains package-authored) and added App Creator Engine plan section.
  - Validation: `node --test tests/unit/installer-vfs-phase-ab.test.js` -> **6 pass, 0 fail**.

- Installer payload lifecycle support before cleanup (2026-03-18):
  - Extended installer contract/action runtime to support file lifecycle actions:
    - `create-file` on install
    - `delete-file` on uninstall
  - Updated runtime and contracts:
    - `server/tools/installer-cli.js`
    - `server/contracts/installer-uninstaller-contract.schema.json`
    - `server/contracts/installer-hello-world.contract.example.json`
    - `server/contracts/payloads/tab-hello-world.template.html`
  - Added focused guard coverage for new action types and behavior:
    - `tests/unit/installer-cli.test.js`
    - `tests/unit/installer-vfs-phase-ab.test.js`
  - Updated `docs/HOW-TO-CREATE-AN-APP.md` to reflect installer-managed payload create/delete flow.
  - Real-cycle validation: Hello World uninstall removed `client/apps/non-core/core/tab-hello-world.html`; reinstall recreated it successfully.
  - Focused installer pack: **23 pass, 0 fail**. Full regression rerun (`npm.cmd test`): **1369 pass, 0 fail**.

- Installer/VFS Phase A/B kickoff completed:
  - `/api/nekocore/tooling/workspace` auto-default now targets project root on first-time setup (preserves existing configured workspace path).
  - Workspace tab root breadcrumb now renders as `C:` in the non-core workspace tab surface and explorer breadcrumb renderer.
  - Added focused A/B guard suite `tests/unit/installer-vfs-phase-ab.test.js` to lock workspace manifest presence, root breadcrumb contract, auto-default behavior, and contract artifact presence.

- Added Installer/VFS contract draft artifacts for Phase A:
  - `server/contracts/installer-uninstaller-contract.schema.json`
  - `server/contracts/installer-uninstaller.contract.example.json`
  - `server/contracts/vfs-drive-mapping.contract.schema.json`
  - `server/contracts/vfs-drive-mapping.contract.example.json`

- Installer/uninstaller contract semantics tightened to match script-diary boundary model:
  - Exact marker-boundary contract added (`//Open Next json entry id` + blank line + `//Close "`) for installer-accessible regions.
  - Transaction policy now encodes `auto-rollback-error` when any required marker boundary is missing in batch changes.
  - Logging policy now requires entry-level logging of entryId, written block payload, and close marker.
  - Guard coverage extended in `tests/unit/installer-vfs-phase-ab.test.js` to lock marker boundary, rollback policy, and logging policy fields.

- Bounded pre-cleanup installer implementation slice added:
  - New utility `server/tools/installer-marker-engine.js` implements exact-boundary insertion with transactional rollback semantics.
  - Engine enforces exact `open + blank + close` boundary matching only; no partial writes on batch boundary miss.
  - Engine returns per-entry write logs (`entryId`, `writtenBlock`, `closeMarker`) for installer traceability.
  - New focused tests in `tests/unit/installer-marker-engine.test.js` validate insertion, multi-entry batch behavior, rollback-on-missing-boundary, strict blank-line matching, and logging fields.

- Thin installer command path added for pre-cleanup structure visibility:
  - New CLI `server/tools/installer-cli.js` with bounded install flow: `install --contract <path> [--root <dir>] [--dry] [--log <path>]`.
  - CLI stages all file updates and writes only when all marker-boundary insertions succeed (transactional all-or-nothing).
  - Added npm script `installer:apply` for terminal usage.
  - New focused tests `tests/unit/installer-cli.test.js` validate real file apply, dry-run no-write behavior, and cross-file rollback on missing marker boundary.

- **Phase 4.9 — T-8 Exit Audit (complete):** Updated architecture docs to reflect live MTOA behavior and boundaries; completed full-suite stabilization.
  - `docs/PIPELINE-AND-ORCHESTRATION.md` now documents the pre-orchestrator task fork, frontman SSE lifecycle event surface, and client task-event delegation boundary (`chat.js` -> `task-ui.js`).
  - `docs/ARCHITECTURE-OVERVIEW.md` now includes Phase 4.9 status in the direction snapshot, MTOA subsystem map entries, task UI subsystem, and route map entries for `task-routes.js` and `entity-chat-routes.js`.
  - Full-suite audit rerun via Node test runner: **1346 total**, **1346 pass**, **0 fail**.
  - Test stabilization fixes: `classifySync` now returns a true synchronous rule-based object shape, classifier keyword matching is boundary-aware (prevents substring false positives), task classification rules were tuned for analysis/memory-query disambiguation, and task module registry registration now normalizes required defaults (including `sourceOfTruth`) for custom module entries.
- Test runner compatibility hardening: added `tests/unit/test-compat.js` shim and wired mixed-style unit tests (`entity-network-registry.test.js`, `intent-classifier.test.js`, `task-context-gatherer.test.js`, `task-module-registry.test.js`) to the Node test runtime globals (`describe`/`it`/`test`/`expect`).
- Chat now exposes live per-session memory `Recall` and `Save` toggles for single-LLM entities, routes those flags through `/api/chat`, and skips the client-side subconscious pre-call when the single-LLM mode is active.
- Repo tracking audit sync: `BUGS.md` and `WORKLOG.md` now reflect the completed bug-fix state instead of the stale open-bug ledger.
- Entity/context chat now recovers its main provider runtime from the checked-out entity profile or saved last-active profile before blocking sends, preventing false `No provider connected` failures after checkout or reload.
- `/api/chat` now omits `innerDialog` when the single-LLM path has no orchestration object to return, keeping the response contract valid for bare single-LLM entities.
- `/api/chat` now validates payloads before writing `200` headers and guards the error path against duplicate writes, preventing `ERR_HTTP_HEADERS_SENT` when contract enforcement fails.
- Single-LLM chat no longer throws a client-side `subconTurn is not defined` error after a valid reply; the chat send flow now keeps that variable defined across both full-pipeline and single-LLM modes.
- Repo doc-path audit repaired stale references to moved source-of-truth docs, and NekoCore architecture-doc ingestion now defaults to `docs/` instead of the obsolete `Documents/current/` path.

---

## [0.8.0] - 2026-03-17

### Changed
- Repository packaging wrapper: moved the runnable codebase, assets, tests, browser host, and runtime folders under `project/` so the repository root stays documentation-first for visitors. Updated root README instructions and root ignore rules to match the new source location.
- NekoCore OS panel now exposes its own Tools and Workspace settings: per-skill enable/disable controls, approval-mode toggle, and editable workspace root path for the system entity.
- NekoCore direct chat now writes multi-layer memory again: each turn still keeps a raw decay-free conversation snapshot, and it now also runs the shared post-response encoder to create `core_memory` plus `semantic_knowledge` records. Shared memory storage now prunes stale index entries when the backing memory folders are gone, preventing repeated `Memory not found` retrieval noise.
- NekoCore subconscious retrieval now always injects a recent conversation recall window from her own latest episodic chat memories, so continuity works even when current-message wording does not overlap prior-turn topics.

### Added
- **NekoCore Browser Phase NB-6 — LLM Mode Foundation (complete)**
  - Mode switch: toggle between Human Mode (🧠) and LLM Mode (🤖) via toolbar button, LLM panel slides in as sidebar
  - Page extraction: server-side URL fetch via existing webFetch.fetchAndExtract(), returns clean text from any page
  - Page summarization: LLM-powered summary with markdown formatting, auto-tracks in research session
  - Ask-this-page chat: multi-turn Q&A grounded only in extracted page content, conversation history maintained per page
  - Source citation: every AI answer includes 📎 source links with excerpt preview, clicking navigates to source URL
  - Structured extraction: LLM-powered extraction of tables (rendered as HTML tables), named entities (typed + context), links (categorized), and page outline (hierarchical with summaries)
  - User confirmation for writes: save-to-memory requires explicit confirmation dialog with topic editing before any entity memory write
  - Research session model: separate from normal chat — tracks extracted pages, Q&A exchanges, and structured extractions; session CRUD with create/list/get/activate/delete/clear
  - Ephemeral vs saved toggle: clear control to choose ephemeral analysis (no auto-save) vs persistent session tracking
  - Domain-aware safety: page content extracted server-side through SSRF-protected webFetch, max 12K chars to LLM, no raw HTML sent to client
  - `browser-host/research-session.js` — new module: session state management with JSON persistence, max 20 sessions, 100 messages per session
  - 13 new API endpoints: extract-page, summarize, ask-page, extract-structured, save-to-memory, research CRUD (list/create/get/activate/active/delete/clear)
  - Full CSS: LLM sidebar panel, source preview, chat messages, citation links, extraction renderers (tables/entities/links/outline), save confirmation dialog, ephemeral/saved toggle, mode button glow
  - Bookmark Manager: full-screen panel with search, folder filter, inline edit (title/URL/folder), add form, per-item delete, and import/export
  - History Manager: full-screen panel with search, grouped by date, per-entry delete, clear today, clear all, and export
  - Tab context menu: right-click for duplicate tab, reload, pin/unpin, mute/unmute, close, close other tabs
  - Tab UX polish: middle-click to close, pinned tabs (sorted first, no close button, shorter title), mute indicator
  - Keyboard shortcuts: Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+L (address bar), Ctrl+R (reload), Ctrl+D (bookmark), Ctrl+Shift+B (bookmark manager), Ctrl+H (history), Ctrl+J (downloads), Ctrl+1-9 (switch tabs), Alt+Left/Right (back/forward), F5 (reload), Esc (close managers)
  - Import/export: bookmarks as JSON, settings as JSON, history as JSON — available in manager panels and Advanced tab
  - Server store upgrades: history deleteEntry/deleteByDateRange/exportAll/importEntries; bookmarks search/update/clear/exportAll/importBookmarks/getFolders
  - 10 new API endpoints for history, bookmarks, and settings CRUD
  - Shortcuts reference bar in browser footer
  - New CSS: context menu, manager panels, edit mode, action buttons, date-grouped history, shortcuts bar
- **NekoCore Browser Phase NB-4 — Shell Integration (complete)**
  - `browser-host/settings-store.js` — browser settings persistence (homepage, search engine, session restore, external link behavior)
  - Settings API endpoints: GET/update/reset for browser settings, GET /api/browser/status for shell status reporting
  - `openInBrowser(url)` — global launch routing function: opens browser window and navigates to URL from any app
  - Browser settings panel in Advanced tab: homepage URL, search engine selector (Google/DuckDuckGo/Bing), session restore toggle, external link behavior, clear history/bookmarks buttons
  - Browser status card in Task Manager: open tab count, active URL, loading status with 3s periodic updates
  - Taskbar tab count badge on browser pinned-app button (visible when 2+ tabs open)
  - Graceful shutdown: `browserCleanup()` on `beforeunload`, `sendBeacon` session save, session save on browser window close
  - Iframe blocked-site overlay: detects load failures, shows fallback UI with "Open in System Browser" action + home button
  - Search engine preference wired into address bar URL normalization
  - CSS: blocked site overlay, taskbar badge, position:relative on pinned-app buttons
- **NekoCore Browser Phase NB-3 — Browser Core MVP (complete)**
  - `browser-host/history-store.js` — server-side browsing history persistence (500 max entries, search, clear)
  - `browser-host/bookmark-store.js` — server-side bookmarks with deduplication by URL, add/remove/check
  - `browser-host/session-store.js` — crash-safe tab session save/load/clear for session restore
  - `server/routes/browser-routes.js` — full rewrite with 22+ endpoints: history CRUD, bookmarks CRUD, session save/restore, update-tab state
  - `client/js/browser-app.js` — standalone multi-tab browser client (~420 lines): tab strip management, per-tab iframes, address bar navigation, back/forward/reload/home, URL normalization (auto-https, search-query fallback), bookmark toggle, downloads panel, session auto-save/restore, web search integration, compatibility shims for legacy app.js
  - Multi-tab HTML structure with tab strip, frames container, downloads panel, bookmarks/history home cards
  - CSS for tab strip, tab buttons (active/hover states), tab close/new, downloads panel with rows, history rows, empty states, frames container
  - Old browser code extracted from app.js to standalone module
- **NekoCore Browser Phase NB-2 — Technical Spike Implementation (complete)**
  - `browser-host/event-bus.js` — lightweight pub/sub with automatic timestamping and wildcard relay
  - `browser-host/tab-model.js` — tab create/switch/close with deterministic active-tab fallback (next → prev → null)
  - `browser-host/navigation.js` — URL navigate, back, forward, reload with per-tab history stacks, URL validation, and error envelopes
  - `browser-host/lifecycle.js` — host state machine (host_starting → host_ready → host_closing)
  - `browser-host/download-manager.js` — download start/complete/failure with correlatable IDs
  - `server/routes/browser-routes.js` — HTTP bridge with session/tabs/downloads read endpoints and navigate/tab-create/tab-activate/tab-close/reload/go-back/go-forward commands; SSE event relay
  - `tests/unit/browser-spike-acceptance.js` — 23-test acceptance suite validating all NB-1-0 criteria
- Standalone Entity Creator app surface (`client/create.html`, `client/js/create.js`) with embedded shell mode support
- Creator window app integration in desktop shell (`tab-creator` + `WINDOW_APPS` entry)
- Users window app (`tab-users`) with in-app profile management actions: create, set active, clear active, delete
- Users app logout action for direct sign-out from the Users surface
- Additional release/check-in controls in chat toolbar and entity profile view
- Start menu power action (`⏻ Power`) and left-bottom sidebar power action (`Power Off Server`)
- Start menu category launcher and taskbar UX refresh:
  - apps grouped by category with pinned-first behavior
  - taskbar apps switched to icon-first layout
  - taskbar-left user and power controls
- Browser app enhancements in desktop shell:
  - homepage default set to `https://neko-core.com`
  - in-browser web search panel with results/home/page view switching
  - search history chips and minimized-results recovery controls
- Browser window lifecycle improvements:
  - graceful shutdown now closes dedicated WebUI browser window
  - browser-open lock state is reset during server shutdown
- Roadmap draft for real browser strategy and compliance-first rollout (`NEKOCORE-BROWSER-ROADMAP.md`)

### Changed
- Documentation sync pass for source-of-truth docs (`docs/ARCHITECTURE-OVERVIEW.md`, `docs/PIPELINE-AND-ORCHESTRATION.md`, `docs/MEMORY-SYSTEM.md`, `docs/CONTRACTS-AND-SCHEMAS.md`, `Documents/current/OPEN-ITEMS-AUDIT.md`) to reflect v0.6.0 runtime behavior
- Updated architecture deck `Documents/REM-Architecture-v0.6.0.html` to match current orchestration flow (1A+1D parallel, 1C after both, 2B inlined), route/module counts, and schema wording
- Updated README docs-governance wording to reflect tracked source-of-truth docs in `docs/` and planning docs in `Documents/current/`
- Entity creation flow moved from inline modal to dedicated Creator app window; legacy `showNewEntityDialog()` entry points now route to Creator
- Entity app browser no longer exposes `+ New` creation controls; creation is owned by Creator app
- Creator app layout tightened for shell parity and made scrollable in embedded mode to prevent form clipping
- Release button visibility/state now server-synced via `/api/entities/current`, preventing checkout/check-in dead-ends from stale local state
- Header stop-server control converted to icon-only power button (`⏻`)
- Browser auto-open runtime behavior now prefers dedicated Chrome launch flow in server startup paths
- Start menu interaction handling hardened to avoid category click close-race after rerender
- Window manager resize signaling improved so app surfaces reflow after window resizing

### Governance
- Added browser direction and guardrails draft for open-source and commercial-safe evolution:
  - build browser app on existing engine rather than custom rendering engine
  - avoid DRM/paywall/security-header bypass features
  - require transparent, user-directed AI content handling

## [0.6.0] - 2026-03-13

### Added
- Turn-signal extraction helpers (`server/brain/utils/turn-signals.js`) for deterministic subject/event/emotion/tension preprocessing
- Contributor contract validators (`server/contracts/contributor-contracts.js`) for subconscious/conscious/dream-intuition outputs
- Orchestration policy router (`server/brain/core/orchestration-policy.js`) for stage-based final-pass model escalation decisions
- Live dream-intuition adapter (`server/brain/cognition/dream-intuition-adapter.js`) for abstract no-write intuition artifacts
- Shared LLM runtime helper service (`server/services/llm-runtime-utils.js`) for endpoint normalization, JSON block parsing, usage estimation, and resume-tag stripping
- Boundary cleanup guard tests (`tests/unit/boundary-cleanup-guards.test.js`) to enforce service delegation policy in server composition
- Dream maintenance selector (`server/brain/cognition/dream-maintenance-selector.js`) for deterministic memory scoring across emotion, learn tags, error markers, staleness, and graph degree
- Dream link writer (`server/brain/knowledge/dream-link-writer.js`) for dream-to-source-memory link persistence and bus event emission
- Dream split guard tests (`tests/unit/dream-split-guards.test.js`) verifying live loop no-write policy and module wiring
- Dream maintenance unit tests (`tests/unit/dream-maintenance.test.js`) with 34 tests covering selector and link writer
- `enforceLatencyGuard(callFn, maxMs)` in `orchestration-policy.js`: wraps any async call in a timeout race; rejects with `{ timedOut: true, maxMs }` on ceiling hit; defaults to 35 000 ms
- Escalation guardrail regression tests (`tests/unit/escalation-guardrails.test.js`) with 31 tests covering all reason triggers, budget cap paths, timeout rejection, and integration call-site guards
- Worker output contract (`server/contracts/worker-output-contract.js`) with `validateWorkerOutput` and `normalizeWorkerOutput`; required: `summary`, `signals`, `confidence`; optional: `memoryRefs`, `nextHints`
- Worker registry (`server/brain/core/worker-registry.js`) — in-memory aspect-key-to-entity binding with register/unregister/get/list/clear
- Worker dispatcher (`server/brain/core/worker-dispatcher.js`) — `invokeWorker` wraps worker LLM call with latency guard, contract validation, and silent fallback
- Worker subsystem regression tests (`tests/unit/worker-subsystem.test.js`) with 46 tests covering contract validation, registry CRUD, dispatcher paths, and integration guards
- Phase A Re-evaluation (A-Re1–A-Re6): extracted ~1106 lines of business logic from `server/server.js` into focused service modules:
  - `server/services/llm-interface.js` — `callLLMWithRuntime` + `callSubconsciousReranker` factory (A-Re1)
  - `server/services/config-runtime.js` — aspect runtime config helpers factory (A-Re2)
  - `server/services/memory-operations.js` — `createCoreMemory` + `createSemanticKnowledge` factory (A-Re3)
  - `server/services/memory-retrieval.js` — `getSubconsciousMemoryContext` + helpers factory (A-Re4)
  - Removed duplicate `parseJsonBlock` from `post-response-memory.js` — now imported from `llm-runtime-utils` (A-Re5)
- Live-loop refactor hardening:
  - Fixed `enforceBudgetGuard` wiring: cumulative contributor token usage is now tracked and passed to `runOrchestrator` so the budget cap can actually block O2 escalation
  - 14 new orchestrator integration tests covering: all 4 parallel-contributor artifact strings, escalation/workerDiagnostics/timing/tokenUsage shape, contributor total-failure isolation, and budget guard integration via direct `runOrchestrator` call
  - `server.js` reduced from 2396 → 1290 lines (−46%); all 12 boundary guards green; 308 tests pass

### Changed
- Orchestrator live loop refactored to parallel contributors under orchestrator control: subconscious (1A), conscious (1C), dream-intuition (1D)
- Added explicit orchestrator refinement artifact (2B) before final synthesis stage
- Final orchestrator stage now supports policy-driven strong-runtime escalation hooks with fallback selection
- Runtime lifecycle concerns extracted from `server/server.js` into `server/services/runtime-lifecycle.js` (Telegram startup + graceful shutdown)
- Post-response memory encoding and trace-linking extracted from `server/server.js` into `server/services/post-response-memory.js`
- Natural-chat response postprocessing extracted from `server/server.js` into `server/services/response-postprocess.js`
- Dream maintenance candidate selection replaced inline `getMostImportant` heuristic with scored `selectDreamCandidates` from selector module
- Dream generation commits now write source links and emit bus events via `dream-link-writer`
- `shouldEscalateO2` in `orchestration-policy.js` now returns `{ escalate: boolean, reason: string }` instead of bare boolean; reason vocabulary: `'high-tension'`, `'error-constraint-combo'`, `'planning-implementation-combo'`, `'user-requested-depth'`, `'none'`
- `chooseO2Runtime` updated to consume `decision.escalate` from the new decision shape
- `enforceBudgetGuard` now returns `{ ok: true, reason: null }` on success (was missing `reason` field)
- `runOrchestrator` in `orchestrator.js` now calls `enforceBudgetGuard` as a blocking pre-check before O2 model selection; over-budget forces `escalate: false` with `'budget-cap-<reason>'`
- `runOrchestrator` wraps its `callLLM` call in `enforceLatencyGuard`; on timeout, falls back to `defaultRuntime` then to conscious-output fallback string
- `innerDialog.artifacts` now includes `escalation: { reason, modelUsed, timedOut, budgetBlocked, latencyMs, tokenCost }` on every orchestration call
- Orchestrator constructor now accepts `workerRegistry` option; `runSubconscious`, `runConscious`, `runDreamIntuition` each check registry before native call and use worker output when available
- Worker contributor results tagged with `_source: 'worker'`; native results implicitly `_source: 'native'` (absent field)
- `innerDialog.artifacts.workerDiagnostics` added: per-contributor `{ used, entityId }` on every orchestration call
- Worker dispatcher emits `worker_invoked`, `worker_success`, `worker_fallback` on cognitive bus

### Planned
- Architecture correction plan documented: user-facing `main` will map to final orchestrating self, with `conscious` treated as optional internal helper
- Worker-entity subsystem plan documented: reusable worker entities as host-aspect subsystems with system-only structured LLM-to-LLM outputs when assigned
- Worker subsystem constraints captured: workers can serve multiple hosts, can be directly chatted with when selected, and will support template-driven creation
- Phase B (Dream split hardening) fully scoped and delivered: B1 no-write guard, B2 dream-maintenance-selector, B3 dream-link-writer, B4-B5 wiring, B6 tests
- Phase C (Policy and safety hardening) fully scoped and delivered: C1 escalation reason output, C2 budget guard wiring, C3 latency timeout ceiling, C4 escalation telemetry, C5 regression tests
- Phase D (Worker subsystem pilot) fully scoped: D1 worker-output-contract, D2 worker-registry, D3 worker-dispatcher, D4 orchestrator wiring, D5 diagnostics, D6 tests — grounded in code audit

### Governance
- Activated documentation checkout policy with mandatory implementation ledger updates and phase status tracking
- Added boundary and anti-bloat enforcement policy (frontend/backend separation, route/contracts ownership, script size guardrails)
- Added cleanup gate that must pass before new expansion slices proceed
- Completed cleanup gate A-phase (A1-A5) with checkbox-driven execution and stop/resume tracking

## [0.5.1-prealpha] - 2026-03-10

### Added
- Timeline logger service (`server/services/timeline-logger.js`) with chronological NDJSON records for thought/chat/memory/trace activity
- Timeline APIs: `GET /api/timeline` and `GET /api/timeline/stream` for playback and live diagnostics
- Timeline Playback panel in neural visualizer with transport controls (play/pause/stop, step, rewind/fast-forward, speed controls, live mode)
- Space-key play/pause shortcut for timeline playback when Timeline tab is active
- Browser auto-open guard service (`server/services/auto-open-browser.js`) and unit tests (`tests/unit/auto-open-browser.test.js`) to prevent duplicate window opens on quick restarts

### Changed
- Completed Phase 15 hardening and stabilization: atomic memory writes, memory index divergence audit/rebuild tooling, and brain-loop health counters with circuit-breaker diagnostics
- Updated project version references to `0.5.1-prealpha`
- Subconscious retrieval path upgraded with pulse-backed trace hinting/indexing and reinforcement-aware best-path handling
- Decay phase now emits explicit memory-decay tick telemetry with sampled per-memory deltas for visual replay

## [0.5.0-prealpha] - 2026-03-09

### Added
- **Neko-Pixel-Pro Pixel Art Engine** (`pixel-art-engine.js`) — Generates 64×64 pixel art from dream and memory narratives. Extracts keywords via LLM or regex fallback, maps them to a handcrafted visual vocabulary of 85+ keywords and 200+ synonyms, and renders shape-based scenes with emotion-driven palettes. Outputs upscaled PNGs via `@napi-rs/canvas`
- **Dream Visualizer** (`dream-visualizer.js`) — Composites pixel art frames into animated GIFs for each dream cycle, with smooth color interpolation between frames. Supports three image generation modes: built-in pixel art (`pixel`), external image API (`api`, OpenAI DALL-E compatible), or disabled (`off`). Configurable frame delay and transition frames
- **Dream Gallery** (`dream-gallery.js`, UI tab) — New Dream Gallery tab in the browser UI displaying all dream visualization cycles as an image grid. Refresh button, manual generation trigger, and per-dream modal viewer
- **Image Generation Settings** — Configurable image generation mode in Dream Gallery settings panel. Users can choose built-in pixel art (no API key needed), connect an external image API (endpoint, API key, model), or disable image generation entirely. Settings persist in config and apply at runtime
- **Boredom Engine** (`boredom-engine.js`) — Detects understimulation via idle time tracking and neurochemistry (low dopamine/oxytocin) and triggers autonomous self-directed activities: creative writing, making things, workspace organization, self-reflection, reaching out to user, goal review, and curiosity exploration. Activity selection is weight-based with history tracking to avoid repetition
- **UI Enhancements** — `ui-enhance.css` with refined landing page (radial gradients, backdrop blur), `visualizer-enhance.css` with enhanced neural visualizer styling (glow effects, header refinements)
- **New API Endpoints** — `GET /api/brain/pixel-art` (list dream art), `GET /api/brain/pixel-art/:cycleId/:filename` (serve art files), `POST /api/brain/pixel-art/generate` (manual generation), `GET /api/sleep/config` and `POST /api/sleep/config` (sleep and image gen configuration)

### Changed
- **Brain Loop** — Integrated pixel art generation into dream cycles; dream phases now produce visual art alongside narratives
- **Sleep Configuration** — Extended to include image generation mode, API endpoint, API key, and model settings
- **Image Generation Default** — Image generation starts disabled (`off`); built-in pixel art requires optional `npm install @napi-rs/canvas gif-encoder-2`; UI prompts user to install when selecting pixel mode
- **Zero Dependencies Preserved** — `@napi-rs/canvas` and `gif-encoder-2` moved to `optionalDependencies`; server runs without them; lazy-loaded only when pixel art mode is enabled

## [0.4.0-prealpha] - 2026-03-09

### Changed
- Rebranded from Memory Architect to REM System (Recursive Echo Memory for AI minds)
- Updated all version references to v0.4.0 (pre)Alpha
- Added "Built with MA (Memory Architect v1)" credit throughout

## [0.3.0-alpha] - 2026-03-08

### Added
- **Neurochemistry Engine** (`neurochemistry.js`) — Simulates four neuromodulators (dopamine, cortisol, serotonin, oxytocin) that drift toward baseline and are nudged by 20+ cognitive bus events; drives emotional tagging, emotion-similarity scoring, Hebbian co-activation reinforcement, weak connection pruning, and consolidation scoring for DeepSleep
- **Somatic Awareness Engine** (`somatic-awareness.js`) — Maps real hardware metrics (CPU, RAM, disk) and cognitive metrics (response latency, context fullness, memory decay rate, cycle time, error rate) into natural-language felt sensations and neurochemical influence vectors; gives the entity embodied self-awareness
- **Belief Graph** (`server/beliefs/beliefGraph.js`) — Persistent knowledge graph of entity beliefs; beliefs form from repeated semantic memory patterns, connect to source memories and to each other, carry confidence scores, and guide attention during memory retrieval; per-entity storage in `beliefs/` directory
- **Neural Visualizer** (`client/visualizer.html`) — Standalone 3D visualization page powered by Three.js; real-time memory graph rendering with orbit controls, chat panel, memory browser, and diagnostics; dedicated CSS (`visualizer.css`) and JS (`visualizer.js`, `neural-viz.js`)
- **Pipeline Debug View** (`client/js/pipeline.js`) — Real-time cognitive pipeline visualization showing per-message timing, token usage, and processing stages
- **Workspace Skills** — `ws_mkdir` (create directories) and `ws_move` (move/rename files) skills for entity workspace management

### Changed
- **Attention System** — Updated scoring to integrate neurochemistry-aware activation and belief graph influence
- **Memory Graph Builder** — Enhanced graph construction with belief-aware linking
- **Orchestrator** — Integrated neurochemistry and belief graph into the cognitive pipeline
- **Brain Loop** — Added neurochemistry tick, Hebbian reinforcement, and connection pruning to background cycle
- **Entity Manager** — Extended to initialize belief graph and neurochemistry per entity
- **Memory Storage** — Emotional tags now include neurochemical snapshot at time of storage
- **Thought Types** — Added new event types for neurochemistry, beliefs, and somatic awareness
- **Server** — New API endpoints for belief graph and visualizer; entity last-memory endpoint
- **Client UI** — Updated CSS, chat, auth, and app modules for new features

## [0.2.0-alpha] - 2026-03-07

### Added
- **Geist-inspired dark theme** — New design system with `theme.css` (design tokens), `ui-v2.css` (full stylesheet), and `icons.css` (SVG icon base classes)
- **Auto-open browser** — Server automatically opens `http://localhost:3847` in your default browser on startup (cross-platform)
- **Stop Server button** — Red power button in the header to gracefully shut down the server from the UI (`POST /api/shutdown`)
- **UTF-8 charset headers** — All text MIME types now include `charset=utf-8` for proper encoding
- `api-entity-last-memory.js` server module

### Fixed
- **Tab switching broken** — Skills, Settings, and Advanced tabs were nested inside the Chat tab due to a missing `</div>`, making them invisible when switching tabs
- **Emoji/icon rendering** — Fixed double-encoded UTF-8 emoji (CP1252 mojibake) causing garbled text instead of icons throughout the UI

## [0.1.0-alpha] - 2026-03-06

### Added
- Initial release of REM System
- Persistent entity system with evolving identity and memory
- Multi-provider LLM support (OpenRouter, Ollama)
- Brain loop with conscious engine, subconscious agent, and dream engine
- Cognitive architecture: attention system, memory graph, curiosity engine, thought stream
- Orchestrator for multi-aspect inner dialog
- Skills system with workspace file management
- Web search and fetch integration
- Telegram bot integration
- Sleep cycle with memory consolidation and dreaming
- Entity creation: random, empty, guided, and character ingestion modes
- Chat with auto-archive and subconscious compression
- Memory self-healing and trace graph rebuilding
