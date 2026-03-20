# NekoCore OS — Dead Code & Orphan File Audit

**Generated:** 2026-03-20  
**Scope:** Full client + server pass from `index.html` entry point outward, plus server-side route/service/brain scan.  
**Method:** Subagent trace of all `<script>`, `<link>`, `data-core-tab`, `data-optional-tab`, `data-core-overlay`, CSS `@import`, route mounts, and service requires.

---

## Section 1 — Orphaned Files (safe to delete)

These files exist on disk but are never loaded, required, or imported anywhere in the codebase.

### Server

| File | Reason |
|------|--------|
| `project/server/services/llm-service.js` | Exported class never imported or required. All LLM logic migrated to `llm-interface.js`. Confirmed by full scan of all 16 routes and 25 services. |

### Client

| File | Reason |
|------|--------|
| `project/client/js/starfield.js` | `css/ui-v2.css` line 39 contains: `/* #stars removed — starfield.js deleted for performance */`. No `<script>` tag in any HTML file and no import anywhere. File is inert. |
| `project/client/js/neural-viz.js` | Monolithic legacy visualizer. Superseded by the modular `js/neural-viz/` folder (`renderer.js`, `data-layer.js`, `index.js`). Both `index.html` and `visualizer.html` load the modular folder; the root `neural-viz.js` only self-references itself. |

---

## Section 2 — Active Bug: CSS Never Loaded

| File | Issue |
|------|-------|
| `project/client/css/system-shared.css` | **Not loaded anywhere.** No `<link>` tag in `index.html`, `nekocore.html`, `visualizer.html`, or `create.html`. No `@import` in `ui-v2.css`, `theme.css`, or any theme file. All `sys-inline-XXXX` utility classes defined in this file are silently inaccessible at runtime. |

**Fix (one-line):** Add to `project/client/index.html` after the `ui-v2.css` link:
```html
<link rel="stylesheet" href="css/system-shared.css">
```

---

## Section 3 — App Registration Gap

| Item | Issue |
|------|-------|
| `apps/non-core/core/tab-hello-world.html` | Registered in `non-core-html-loader.js` via installer block (`hello-loader-001`, tabId `helloworld`). **Not present** in `apps/non-core/non-core-apps.manifest.json`. The two registration sources are out of sync. |

**Fix:** Add an entry for `helloworld` to `non-core-apps.manifest.json` matching the installer block values, or remove the installer block if the app is not intended to ship.

---

## Section 4 — Stubs and Incomplete Implementations

### Server Brain Stubs

| File | Stub | Notes |
|------|------|-------|
| `server/brain/agent-echo.js` | `echoFuture()` (line 205) returns `null` unconditionally | Intentional Phase 5 placeholder. Comment: "Echo Future (stub — implemented in Phase 5)". |
| `server/brain/identity/goals-manager.js` | `detectInterferences()` (line 323) and `synthesizeGoals()` (line 333) | Both contain only `// TODO` comments and `console.log` placeholders. No conflict detection or synthesis logic exists. |
| `server/brain/utils/archive-indexes.js` | `rebuildShapeIndexes()` (line 382) | Phase 5 TODO. Zero implementation. Shape index rebuild has never been written. |
| `server/brain/utils/model-router.js` | Lines 151, 299–317 | Generic local LLM support, cost-aware routing, and fallback chain routing are all `console.log` placeholders. No routing logic for these paths. |

### MTOA Task Subsystem Stubs

> **Tracked by:** Phase 4.9-C active plan (see [Section 7 R-4](#phase-r-4-mtoa-implementation-phase-49-c) for full slice breakdown)

| File | Stub | Impact | Addressed In |
|------|------|--------|-------------|
| `server/brain/tasks/entity-chat-manager.js` | `routeMessage()` | Appends to an in-memory array only. No LLM is invoked and no message is relayed to any entity. Planning sessions create sessions but entities never respond. | C-1 |
| `server/brain/tasks/entity-network-registry.js` | `requestEntityUrl()` | URL builder only. The method constructs a URL but never issues an HTTP fetch. `server/config/entity-network.json` has three entries pointing to `localhost:3001–3003` — these are phantom entries (no services run there). | C-1, C-3 |
| `project/client/js/apps/optional/task-ui.js` | Whole file | View-only status and history display. No task submission, wizard, or entity selector UI exists. | C-5 |

---

## Section 5 — Incomplete Features

| Feature | Current State | Key Files | Plan Slice |
|---------|---------------|-----------|------------|
| **Task submission UI** | `task-ui.js` loaded; no standalone tab; operates as T-7 overlays inside `tab-chat.html` only | `task-ui.js`, `tab-chat.html` | Phase 4.9-C / C-5 |
| **Multi-entity planning** | Sessions are created and logged; entities never receive messages or respond | `entity-chat-manager.js`, `entity-network-registry.js` | Phase 4.9-C / C-1, C-2 |
| **Specialist entity creation** | No `create-specialist` route. Only `create`, `create-hatch`, `create-guided`, `create-character` exist | `server/routes/entity-routes.js` | Phase 4.9-C / C-3 |
| **Dynamic entity hiring** | `_selectPlanningEntities()` filters by capability but never spawns a specialist if none match | `task-pipeline-bridge.js` | Phase 4.9-C / C-4 |
| **Managed specialists view** | No UI to see which specialists NekoCore created, from which task, or to remove them | `tab-entity.html`, `entity-routes.js` | Phase 4.9-C / C-6 |
| **Goal system** | `goals-manager.js` is called in the brain loop, but `detectInterferences()` and `synthesizeGoals()` are empty | `server/brain/identity/goals-manager.js` | Phase R-3 (stub doc) |
| **Model routing** | `model-router.js` is active and used, but cost-aware routing and fallback chains are stubs | `server/brain/utils/model-router.js` | Phase R-3 (stub doc) |

---

## Section 6 — All-Green (No Action Needed)

Confirmed working by full trace:

- **All 16 server routes** — wired in `server.js` with working `dispatch()` implementations
- **All 25 server services** — imported and actively used (except `llm-service.js`, covered in §1)
- **All 4 server contracts** — present and used
- **All 10 core tab HTML files** — exist and match `core-html-loader.js` paths
- **All 11 non-core tab HTML files** — exist and registered in `non-core-apps.manifest.json`
- **All 3 core overlays** — exist and loaded by `core-html-loader.js`
- **All 45 client JS files** referenced in `index.html` — present on disk (no broken `<script src>` tags)
- **`js/neural-viz/` modules** (renderer, data-layer, index) — loaded in both `index.html` and `visualizer.html`
- **Integrations** — `telegram.js` and `web-fetch.js` both fully implemented
- **`brain-loop.js`, `dream-engine.js`, `task-executor.js`, `task-frontman.js`** — all functional
- **`intent-classifier.js`** — rule-based + LLM fallback both implemented
- **Custom app examples** in `apps/non-core/custom/` — disabled intentionally (`.gitkeep` present)

---

## Section 7 — Cleanup Plan

### Phase R-1: Safe Deletes (no risk, immediate)
1. **DELETE** `project/server/services/llm-service.js`
2. **DELETE** `project/client/js/starfield.js`
3. **DELETE** `project/client/js/neural-viz.js` (root-level monolith, not the `js/neural-viz/` folder)

### Phase R-2: Quick Fixes (1–2 lines each)
4. **ADD** `<link rel="stylesheet" href="css/system-shared.css">` to `project/client/index.html` — **active silent bug, all `sys-inline-XXXX` classes are currently unreachable**
5. **SYNC** `non-core-apps.manifest.json` with the `hello-loader-001` installer block — add or remove entry to reconcile the two registration sources

### Phase R-3: Stub Documentation / Phase 5 Prep
6. `goals-manager.js` — implement `detectInterferences()` and `synthesizeGoals()` or add formal `@phase5` gate and WORKLOG entry
7. `model-router.js` — document routing limitations in README, or implement a basic fallback chain
8. `agent-echo.js`, `archive-indexes.js` — already phase-tagged; confirm in WORKLOG as Phase 5 scope

### Phase R-4: MTOA Implementation (Phase 4.9-C)

All MTOA gaps are tracked in the active **Phase 4.9-C** plan. Slices must be completed in order:

| Slice | Goal | New Files | Modified Files |
|-------|------|-----------|----------------|
| **C-0** | Guard test baseline (write before any changes) | `tests/unit/entity-chat-manager-guards.test.js`, `entity-network-registry-guards.test.js` | — |
| **C-1** | Entity chat response loop — entities actually respond in planning sessions | `server/brain/tasks/entity-relay.js`, `server/brain/tasks/planning-orchestrator.js` | `entity-chat-manager.js`, `task-routes.js` |
| **C-2** | Planning moderator + synthesis — NekoCore moderates rounds, detects consensus, synthesizes final plan | — | `planning-orchestrator.js`, `task-pipeline-bridge.js` |
| **C-3** | Specialist entity creation — `POST /api/entities/create-specialist` (instant scaffold, no LLM chain) | — | `entity-routes.js`, `entity-network-registry.js` |
| **C-4** | Dynamic entity hiring — auto-spawn specialist if no entity matches required capability | — | `task-pipeline-bridge.js` |
| **C-5** | Task submission UI — entity selector dropdown in `/task` wizard | — | `slash-commands.js`, `tab-chat.html` |
| **C-6** | Managed specialists view — collapsible section in Entity tab (name, role, origin task, actions) | — | `tab-entity.html`, `entity-routes.js` |

> **C-5 and C-6 can run in parallel once C-3 is complete.**  
> Background context for this plan was researched against `Documents/current/PLAN-MTOA-v1.md` and the live codebase state as of 2026-03-20.
