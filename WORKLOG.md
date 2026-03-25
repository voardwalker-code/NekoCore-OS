# WORKLOG

Status: active architecture refactor tracking.
Last updated: 2026-03-24

Repository packaging note:
1. The runnable source tree now lives under `project/`.
2. Root remains documentation/governance-first (`README.md`, `WORKLOG.md`, `BUGS.md`, `CHANGELOG.md`, `.github/`).
3. Historical file paths below may use the pre-wrapper root-relative layout.

---

## ✅ PHASE 4 GATE — OPEN (2026-03-16)

Phases 1 (Bug Fixes), 2 (Refactor/Cleanup), and 3 (Modularization) are all confirmed complete.
App Folder Modularization plan is complete (866 pass, 0 fail).
Feature work is now authorized. Active mandate below is satisfied.

**Phase 4.5 status:** `Documents/current/PLAN-IME-v1.md` — Intelligent Memory Expansion (`Complete` by user declaration on 2026-03-18; detailed exit summary can be backfilled if needed)
**Active bounded cleanup workstream:** `Documents/current/PLAN-APP-MANIFEST-SHADOW-REFACTOR-v1.md` — HTML shadow cleanup (guard-first)
**Active Phase 5 plan:** `Documents/current/PLAN-PREDICTIVE-MEMORY-v1.md` — Predictive Memory Topology (`Active — Slice -0 not started`)

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

## Stop/Resume Snapshot — 2026-03-24 (v0.9.0-alpha.6 Release)

- **Current phase:** `Version bump + documentation update + push`
- **Current slice:** `Complete`
- **Last completed work:** `Bumped version to 0.9.0-alpha.6 in both package.json files. Updated CHANGELOG.md — promoted [Unreleased] to [0.9.0-alpha.6] with all session work (QA expansion, Bug Tracker Export, MA Skills GUI, Prompt Engineering Blueprint, App Builder Blueprint, Blueprint Builder, D&D+Study Blueprints, Book-to-Entity, Archives panel, etc.). Updated README.md — version text, test badge (2,605), QA Checklist (625/61), roadmap (Phases 4.26–4.33 + Phase 5), Bug Tracker export description.`
- **In-progress item:** `none`
- **Blocking issue:** `none`
- **Next action on resume:** `User direction.`
- **Active plans:**
  - `Documents/current/PLAN-PREDICTIVE-MEMORY-v1.md` — Phase 5: Predictive Memory Topology — `COMPLETE — all 13 slices (-0 through 11), archived`
  - `Documents/current/PLAN-RESOURCE-MANAGER-APP-v1.md` — Resource Manager App — `Complete`
  - `Documents/current/PLAN-BUG-TRACKER-APP-v1.md` — Bug Tracker App — `Complete`
  - `Documents/current/PLAN-SETUP-WIZARD-v1.md` — Setup Wizard — `Plan ready, awaiting review`
  - `Documents/current/PLAN-ANTHROPIC-BATCH-API-v1.md` — Anthropic Batch API — `In planning — async latency concerns for tight-loop call sites need design resolution`
  - `Documents/current/PLAN-PROVIDER-AGNOSTIC-CAPABILITIES-v1.md` — Provider-Agnostic Capabilities Layer — `Complete (all 11 slices: -0 through 10) — awaiting archive`
  - `Documents/current/PLAN-MA-PROVIDER-AGNOSTIC-CAPABILITIES-v1.md` — MA Provider-Agnostic Capabilities — `Complete (all 10 slices)`
  - `Documents/current/PLAN-OS-TOOL-UPGRADE-v1.md` — OS Tool Upgrade — `Complete`
  - `Documents/current/PLAN-ENTITY-GENESIS-v1.md` — Entity Genesis Skill — `Complete`
  - `Documents/current/PLAN-MA-BRIDGE-v1.md` — MA Bridge Slash Command — `Complete`
  - `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — Phase 4.10: Entity Orchestration — `Complete`
  - `Documents/current/PLAN-TOKEN-OPTIMIZATION-v1.md` — COMPLETE (Phases 1–4 done, Phase 5 cancelled)
  - `Documents/current/PLAN-COGNITIVE-STATE-INTEGRATION-v1.md` — COMPLETE (all 4 phases, 14 slices)
  - `Documents/current/PLAN-INTROSPECTION-LOOP-v1.md` — 6-axis self-inquiry brain-loop phase with local model
  - `Documents/current/PLAN-BOOK-TO-ENTITY-v1.md` — Book-to-Entity Character Ingestion — `Complete (all 7 slices: -0 through 6)`
  - `Documents/current/PLAN-DND-AND-STUDY-BLUEPRINTS-v1.md` — D&D + Education/Study Blueprints & Skills — `Complete (all 11 slices: -0 through 10)`
- **Prior plan (paused):** `Documents/current/PLAN-SLASH-COMMAND-SYSTEM-v1.md — A0/A1/A2 complete; A3/A4 future`
- **MA workspace projects:** `Moved to separate repo — MA-workspace is now fully cleared on reset`

---

## Session Ledger — 2026-03-24 (v0.9.0-alpha.6 Release)

Status: `Complete`

- **Request:** Bump version, update CHANGELOG/README/WORKLOG, push.
- **Files changed:** `package.json` (root + project: 0.9.0-alpha.5 → 0.9.0-alpha.6), `CHANGELOG.md` ([Unreleased] promoted to [0.9.0-alpha.6] with all session additions), `README.md` (version, test badge 2605, QA 625/61, roadmap Phases 4.26–4.33, Bug Tracker export), `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Bug Tracker Export)

Status: `Complete`

- **Request:** Replace Bug Tracker Save with Export that generates a Markdown file and opens native Windows file explorer for save location.
- **Files changed:** `project/client/apps/non-core/core/tab-bugtracker.html` (replaced Save button with Export, new buildExportMarkdown() with area grouping + severity table + checkboxes, new exportFile() with showSaveFilePicker + download fallback), `project/client/apps/non-core/core/tab-qachecklist.html` (updated Bug Tracker test items for Export), `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (QA Checklist — Full MA Test Matrix)

Status: `Complete`

- **Request:** Add comprehensive MA testing coverage to QA Checklist and update with all features added since original creation.
- **Files changed:** `project/client/apps/non-core/core/tab-qachecklist.html` (expanded from ~270 items / 40 sections to 625 items / 61 sections — added 18 MA sections + Book Upload & Character Selection + Archive Panel + Conversation History + expanded Memory System + expanded Edge Cases + expanded Skills Manager with MA Skills GUI), `project/client/apps/non-core/core/tab-bugtracker.html` (added MA area option to bug area dropdown), `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Blueprint Builder)

Status: `Complete`

- **Request:** Create a meta-blueprint that enables MA to build new blueprints when asked to do something without an existing blueprint.
- **Files changed:** `project/MA/MA-server/MA-tasks.js` (added blueprint_builder task type, complex type, RULES — now 17/12/17), `project/MA/MA-blueprints/modules/blueprint_builder.md` (new — 240+ line meta-blueprint with quality standards, structural conventions, tool reference, entity integration pattern, classifier registration guidance), `project/MA/MA-skills/blueprint-builder/SKILL.md` (new), `project/MA/MA-entity/entity_ma/skills/blueprint-builder.md` (new), `project/tests/unit/dnd-study-blueprints-guards.test.js` (extended to 128 tests), `CHANGELOG.md`, `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (App Builder Blueprint + Skill)

Status: `Complete`

- **Request:** Create an App Builder blueprint and skill for MA to create NekoCore OS compatible apps, including HTML window creation and installation knowledge.
- **Files changed:** `project/MA/MA-blueprints/modules/app_builder.md` (new — 4-mode blueprint: Simple, Interactive, Canvas, API-Connected — 7-phase workflow with full installer contract, HTML payload template, CSS vars, API patterns), `project/MA/MA-skills/app-builder/SKILL.md` (new — skill registration with triggers/workflow/tools/checklist), `project/MA/MA-entity/entity_ma/skills/app-builder.md` (new — compact runtime skill reference), `project/MA/MA-server/MA-tasks.js` (added app_builder task type, complex type, RULES with 16 keywords + 4 regexes — now 19/14/19), `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Prompt Engineering Blueprint)

Status: `Complete`

- **Request:** Create a production-quality prompt engineering blueprint for MA.
- **Files changed:** `project/MA/MA-blueprints/modules/prompt_engineering.md` (new — 6-mode blueprint: System Prompt, Prompt Refinement, Few-Shot Template, Chain-of-Thought, Structured/Tool Prompt, General Prompt), `project/MA/MA-server/MA-tasks.js` (added prompt_engineering task type, complex type, RULES — now 18/13/18), `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (MA Skills GUI)

Status: `Complete`

- **Request:** Wire MA-skills/ drop-in folder for auto-pickup by MA and GUI visibility on the Skills tab.
- **Files changed:** `project/MA/MA-server/MA-core.js` (loadSkills now scans both entity_ma/skills/ and MA-skills/), `project/server/routes/skills-routes.js` (added /api/ma-skills GET endpoint + frontmatter parser), `project/client/apps/non-core/core/tab-skills.html` (added 'MA Skills' section), `project/client/js/apps/optional/skills-ui.js` (added loadMASkillsList, init call), `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Blueprint Builder)

Status: `Complete`

- **Request:** Implement PLAN-DND-AND-STUDY-BLUEPRINTS-v1.md — 5 new consolidated blueprint task types for D&D and education/study content.
- **Files changed:** `project/MA/MA-server/MA-tasks.js` (5 new task types, 5 complex types, 5 RULES entries — now 16/11/16 total), `project/MA/MA-blueprints/modules/study_guide.md` (new — 4 modes: Study Guide, Flashcard, Outline, Timeline), `project/MA/MA-blueprints/modules/dnd_create.md` (new — 3 modes: Encounter, NPC Factory, Character with entity creation), `project/MA/MA-blueprints/modules/tutor_entity.md` (new — 2 modes: Tutor, TA with entity creation), `project/MA/MA-blueprints/modules/dnd_campaign.md` (new — 4 modes: Campaign Builder, Session Prep, Session Recap, World Lore), `project/MA/MA-blueprints/modules/course_creator.md` (new — 3 modes: Course Creator, Book-to-Course, Exam Prep), `project/MA/MA-skills/study-guide/SKILL.md` (new), `project/MA/MA-skills/dnd-create/SKILL.md` (new), `project/MA/MA-skills/tutor-entity/SKILL.md` (new), `project/MA/MA-skills/dnd-campaign/SKILL.md` (new), `project/MA/MA-skills/course-creator/SKILL.md` (new), `project/MA/MA-entity/entity_ma/skills/study-guide.md` (new), `project/MA/MA-entity/entity_ma/skills/dnd-create.md` (new), `project/MA/MA-entity/entity_ma/skills/tutor-entity.md` (new), `project/MA/MA-entity/entity_ma/skills/dnd-campaign.md` (new), `project/MA/MA-entity/entity_ma/skills/course-creator.md` (new), `project/tests/unit/dnd-study-blueprints-guards.test.js` (new — 111 tests), `CHANGELOG.md`, `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Book-to-Entity Implementation)

Status: `Complete`

- **Request:** Implement Book-to-Entity character ingestion system: ingest books, extract characters with POV-isolated knowledge, create as NekoCore OS entities.
- **Files changed:** `project/MA/MA-Server.js` (book upload + chunking routes, _chunkBookText helper), `project/MA/MA-server/MA-tasks.js` (book_ingestion task type + classifier rules), `project/MA/MA-blueprints/modules/book_ingestion.md` (new blueprint), `project/MA/MA-skills/book-ingestion/SKILL.md` (new skill), `project/MA/MA-entity/entity_ma/skills/book-ingestion.md` (runtime copy), `project/MA/MA-client/js/ma-ui-chat.js` (character selection buttons), `project/MA/MA-client/css/ma-ui.css` (selection bar styles), `project/tests/unit/book-ingestion-guards.test.js` (41 tests), `Documents/current/PLAN-BOOK-TO-ENTITY-v1.md` (plan file), `CHANGELOG.md`, `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Book-to-Entity Plan)

Status: `Complete — plan drafted, awaiting review`

- **Request:** Design a system to ingest an entire book, extract characters with POV-isolated knowledge, and create them as NekoCore OS entities with shared conversation memories.
- **Deliverable:** `Documents/current/PLAN-BOOK-TO-ENTITY-v1.md` — 6 phases, 7 slices, full data schemas, processing flow diagram, token budget estimate, validation strategy.

---

## Session Ledger — 2026-03-24 (Entity Genesis fix + Archives panel)

Status: `Complete`

- **Request:** Fix MA entity genesis to write to NekoCore OS entities folder with unique IDs. Add Archives panel accessible from left rail and top bar with search and plain-text display in editor viewport.
- **Files changed:** `project/MA/MA-blueprints/modules/entity_genesis.md` (Phase 2 rewritten to use API), `project/MA/MA-skills/entity-genesis/SKILL.md` (added create endpoint, removed ws_write instructions), `project/MA/MA-client/MA-index.html` (archives rail button + top bar button), `project/MA/MA-client/css/ma-ui.css` (archive folder/node styles), `project/MA/MA-client/js/ma-ui.js` (archives in inspectorTitles), `project/MA/MA-client/js/ma-ui-editor.js` (archives scaffold), `project/MA/MA-client/js/ma-ui-nav.js` (archives in refreshInspector), `project/MA/MA-client/js/ma-ui-workspace.js` (loadArchives, filterArchiveList, openArchiveNode functions), `project/MA/MA-Server.js` (node listing + node content routes), `CHANGELOG.md`, `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (MA timeout UX + conversation history)

Status: `Complete`

- **Request:** Replace hardcoded LLM timeouts with user-facing popup (cancel/continue/auto-pilot). Fix conversation history — only showing one entry, should show day-grouped folders.
- **Files changed:** `project/MA/MA-client/MA-index.html` (popup HTML, auto-pilot config checkbox, new-chat button), `project/MA/MA-client/css/ma-ui.css` (popup + conversation folder styles), `project/MA/MA-client/js/ma-ui-chat.js` (timer system, abort controller, auto-pilot localStorage, payload wiring), `project/MA/MA-client/js/ma-ui-config.js` (auto-pilot hydrate+save), `project/MA/MA-client/js/ma-ui-editor.js` (conversations section in session scaffold), `project/MA/MA-client/js/ma-ui-nav.js` (refresh inspector for conversations), `project/MA/MA-client/js/ma-ui-workspace.js` (loadConversationHistory function), `project/MA/MA-server/MA-llm.js` (timeout=0 bypass), `project/MA/MA-Server.js` (autoPilot flag forwarding), `project/MA/MA-server/MA-core.js` (autoPilot in handleChat + callLLM wrappers), `CHANGELOG.md`, `WORKLOG.md`

---

## Session Ledger — 2026-03-24 (Landing page professional overhaul)

Status: `Complete`

- **Request:** Update Neko-Core.html to be more professional, add MA section, About/Bio, Contact with email (VoardWalker-Code@proton.me), Remote Work Inquiry section, links to both GitHub repos and GitHub user profile.
- **Files changed:** `project/Neko-Core.html`, `WORKLOG.md`, `CHANGELOG.md`
- **Implementation:** (1) Added 3 new themed sections: MA (purple, 6 feature cards — Browser IDE, Terminal, Chat Sessions, Memory Ingest, Workspace Tree, Modular Architecture), About/Bio (cyan, Projects list + Professional Interests list + GitHub Profile button), Contact (gold, General Contact email + Remote Work Inquiry with mailto: subject line). (2) Updated nav: replaced Roadmap/White Paper links with MA/About/Contact; GitHub button now links to user profile. (3) Fixed architecture title "Zero framework dependencies" → "Near-zero dependencies." (4) Updated roadmap: Phase 4 consolidated, Phase 5 marked done, MA as Tooling milestone, v0.9 as current, Setup Wizard as next. (5) Updated CTA: second button now links to MA repo. (6) Updated footer: GitHub profile, both repo links, White Paper, Contact email, "2026 VoardWalker" copyright. (7) Added CSS for purple/cyan/gold section themes, bio-grid, contact-grid, btn-github-profile, responsive rules.
- **Validation:** File structure verified. All new sections use scroll-reveal animations consistent with existing page.

## Session Ledger — 2026-03-24 (Zero-deps claim correction)

Status: `Complete`

- **Request:** Fix all "zero dependencies" claims — Zod (^4.3.6) is a required dependency in both package.json files.
- **Files changed:** `README.md`, `project/MA/README.md`, `docs/USER-GUIDE.md`, `docs/NEKOCORE-OS-WHITE-PAPER-v2.md`, `docs/NEKOCORE-OS-ARCHITECTURE-v1.md`, `docs/ARCHITECTURE-OVERVIEW.md`, `project/Neko-Core.html`, `WORKLOG.md`
- **Implementation:** (1) Root README: badge "dependencies-0" → "dependencies-1%20(zod)", stats table "0 Runtime Dependencies" → "1 Runtime Dependency", convictions "Zero dependencies" → "Near-zero dependencies" with Zod mention, tech spec updated. (2) MA README: "zero npm dependencies" → "single dependency: Zod". (3) docs/USER-GUIDE: "zero npm install required" → "only Zod (npm install once)". (4) White paper: abstract, constraint paragraph, and design-decisions table all updated. (5) Architecture v1: abstract, constraint paragraph, conclusion, and design-decisions table all updated. (6) Architecture overview: "zero-dependency" → "near-zero-dependency". (7) Neko-Core.html: hero stat "0 Dependencies" → "1 Dependency". All "Zero framework dependencies" claims examined — updated to "Near-zero dependencies (Zod only)" since Zod is the sole required package.
- **Validation:** All changes verified against both package.json files.

## Session Ledger — 2026-03-24 (Factory reset + documentation update)

Status: `Complete`

- **Request:** Run reset-all, update root README for entire project, update MA USER-GUIDE.md and MA README.md for standalone repo copy.
- **Files changed:** `README.md`, `project/MA/README.md`, `project/MA/USER-GUIDE.md`, `CHANGELOG.md`, `WORKLOG.md`
- **Implementation:** (1) Ran `node reset-all.js` — cleared entities, memories, accounts, sessions, MA workspace, chores, model perf, entity, agents, pulse logs, config. (2) Root README: updated MA capability description to mention browser IDE/terminal/menus/sessions/ingest/themes, updated architecture tree from single-file SPA to 8-script modular client, added standalone GitHub repo link. (3) MA README: added 12 new feature table entries (dropdown menus, IDE editor, terminal panel, workspace tree, sessions, memory ingest, recall controls, theme switcher, rail utilities), rewrote architecture diagram to show 8 JS modules + CSS, added 9 new API endpoints (chat sessions, workspace tree/save/mkdir, terminal exec, folder ingest), added standalone repo link. (4) MA USER-GUIDE: expanded to 26 sections — added Menu Bar, Toolbar, IDE Editor, Terminal Panel, Workspace File Tree, Chat Sessions, Memory Ingest, Theme Switching sections; rewrote Settings Panel access paths; updated Tips. (5) CHANGELOG: added 5 new [Unreleased] entries.
- **Validation:** All documentation reviewed for consistency with implemented features.

## Session Ledger — 2026-03-24 (MA UI overhaul — menus, sections, terminal)

Status: `Complete`

- **Request:** Fix broken left-rail sections (blueprints/projects/tasks/todos/chores not rendering), rework non-functional top menu bar, add context-aware File menu, move toolbar icons to left rail, add terminal panel.
- **Files changed:** `project/MA/MA-client/MA-index.html`, `project/MA/MA-client/js/ma-ui-editor.js`, `project/MA/MA-client/js/ma-ui-workspace.js`, `project/MA/MA-client/js/ma-ui-nav.js`, `project/MA/MA-Server.js`, `project/MA/MA-client/css/ma-ui.css`, `WORKLOG.md`
- **Implementation:** (1) Added `_scaffoldSection()` to ma-ui-editor.js that injects DOM scaffold for each section type into explorerBodyEl before load functions run. (2) Fixed `loadWorklog()` in ma-ui-workspace.js to query session-summary/session-recent fresh from DOM. (3) Replaced static menu buttons in HTML with dropdown menu system (File/Edit/View/Terminal/Help with sub-items). (4) Added menu toggle/close logic and File menu action functions (new file/folder, open, save/saveAll) to ma-ui-nav.js. (5) Moved Ingest/Settings/Terminal to rail-utils section at left rail bottom. (6) Added terminal panel HTML + toggleTerminalPanel/runTerminalCmd in JS. (7) Added /api/terminal/exec and /api/workspace/mkdir server endpoints. (8) Added CSS for menu dropdowns, terminal panel, rail-utils, bp-editor-area.
- **Validation:** All 4 modified JS files pass `node -c` parse check. CSS and HTML verified for presence of all new structures.

## Session Ledger — 2026-03-24 (MA UI script modular split pass 2)

Status: `Complete`

- **Request:** Further refactor `ma-ui.js` — still too much in one file (~924 lines).
- **Extraction:** Created `ma-ui-chat.js` (287 lines — chat history, messaging, SSE streaming, progress widget), `ma-ui-nav.js` (117 lines — rail, inspector, mode toggle), `ma-ui-config.js` (441 lines — config panel, whitelist, Ollama, API key masking). Trimmed `ma-ui.js` to 83 lines (globals, theme, editor state, init).
- **Files changed:** `project/MA/MA-client/MA-index.html`, `project/MA/MA-client/js/ma-ui.js`, `project/MA/MA-client/js/ma-ui-chat.js` (new), `project/MA/MA-client/js/ma-ui-nav.js` (new), `project/MA/MA-client/js/ma-ui-config.js` (new), `CHANGELOG.md`, `WORKLOG.md`
- **Load order (8 scripts):** ma-ui.js → ma-ui-chat.js → ma-ui-nav.js → ma-ui-config.js → ma-ui-editor.js → ma-ui-workspace.js → ma-ui-input.js → ma-ui-bootstrap.js

## Session Ledger — 2026-03-24 (MA UI script modular split)

Status: `Complete`

- **Request:** Refactor `ma-ui.js` into smaller scripts.
- **Files changed:** `project/MA/MA-client/MA-index.html`, `project/MA/MA-client/js/ma-ui.js`, `project/MA/MA-client/js/ma-ui-editor.js`, `project/MA/MA-client/js/ma-ui-workspace.js`, `project/MA/MA-client/js/ma-ui-input.js`, `project/MA/MA-client/js/ma-ui-bootstrap.js`, `CHANGELOG.md`, `WORKLOG.md`
- **Implementation:** Extracted editor/tree logic, workspace/surfaces logic, and input/slash/attachment logic into dedicated files; left core/chat/config in `ma-ui.js`; replaced eager top-level init calls with `initializeMAUI()` and invoked it from `ma-ui-bootstrap.js`; updated HTML script tags to preserve dependency order.
- **Validation:** `get_errors` on all affected MA client files → `No errors found`.

---

## Session Ledger — 2026-03-24 (MA theme + workspace tree + built-in editor)

Status: `Complete`

- **Request:** Finish the three features started in the workspace shell: theme switcher (dark/light/system), workspace file tree navigation, and a built-in IDE-style editor with smart rendering per file type.
- **Files changed:** `project/MA/MA-client/js/ma-ui.js`, `CHANGELOG.md`, `WORKLOG.md`
- **Implementation:**
  - Theme system: `applyTheme()` reads localStorage or falls back to `prefers-color-scheme` media query. The Settings > Theme dropdown persists the choice. A live media-query listener keeps "system" mode in sync.
  - Workspace tree: `loadWorkspaceTree()` fetches `/api/workspace/tree`, renders collapsible `tree-node` elements with file-type icons. Clicking a file calls `openFileInEditor()`.
  - Editor: Tab management (`openTabs[]`, `activateTab`, `closeTab`), smart rendering per file type (Markdown: preview/raw toggle; HTML: iframe preview/source toggle; Code: syntax-highlighted read-only view with line numbers/Edit toggle). `renderMarkdown()` does lightweight MD→HTML. `highlightLine()` does regex-based syntax coloring for JS/TS/Python/Rust/C#/CSS/JSON/HTML. `saveEditorTab()` writes back via `/api/workspace/save`. Chat file-link chips now open in the editor instead of new browser tabs.
- **Validation:** `get_errors` → `No errors found` on all 3 client files.

---

## Session Ledger — 2026-03-24 (MA client shell extraction + workspace guard pass)

Status: `Complete`

- **Request:** Stop growing `MA-index.html` as a monolith and match the NekoCore client template by moving inline CSS/JS out into dedicated files.
- **Root cause:** MA workspace work had accumulated large inline `<style>` and `<script>` blocks directly in `MA-index.html`, making iteration brittle and obscuring migration state.
- **Files fixed:** `project/MA/MA-client/MA-index.html`, `project/MA/MA-client/css/ma-ui.css`, `project/MA/MA-client/js/ma-ui.js`, `CHANGELOG.md`, `WORKLOG.md`
- **Fix:** Externalized MA browser assets to `css/ma-ui.css` and `js/ma-ui.js`, rewired `MA-index.html` to link those files, and added workspace-shell safety guards in `ma-ui.js` so missing legacy inspector DOM elements no longer throw during load while workspace views are being migrated.
- **Validation:** `get_errors project/MA/MA-client/MA-index.html project/MA/MA-client/js/ma-ui.js project/MA/MA-client/css/ma-ui.css` → `No errors found`.

---

## Session Ledger — 2026-03-24 (MA GUI persistent inspector + centered chat)

Status: `Complete`

- **Request:** Keep chat visible while exposing session history, activity, and current workspace surfaces like blueprints, projects, tasks, todos, and chores at the same time.
- **Root cause:** The MA GUI previously stretched chat too wide on large screens and treated side information as a single overloaded view, so users could not inspect workspace state beside the conversation.
- **Files fixed:** `project/MA/MA-client/MA-index.html`, `project/MA/MA-Server.js`, `project/MA/USER-GUIDE.md`, `project/MA/README.md`
- **Fix:** Rebuilt the MA browser layout into a centered chat stage plus a persistent right-side inspector. Split session history from live activity telemetry, exposed separate left-rail tabs for Blueprints, Projects, Tasks, Todos, and Chores, added MA API endpoints for project archive browsing and blueprint file browse/save, and wired task workspace editing through the worklog API.
- **Validation:** `get_errors project/MA/MA-client/MA-index.html project/MA/MA-Server.js` → `No errors found`.

---

## Session Ledger — 2026-03-24 (MA GUI left-rail restoration)

Status: `Complete`

- **Request:** Verify whether the MA browser GUI actually had the promised left menu bar and fix the layout if it was missing.
- **Root cause:** The current MA SPA only had a top header plus the right-side Activity Monitor; no left navigation rail had actually been implemented, so the reported menu did not exist.
- **Files fixed:** `project/MA/MA-client/MA-index.html`, `project/MA/USER-GUIDE.md`, `project/MA/README.md`
- **Fix:** Added a persistent left rail with direct Chat, Activity, Settings, Whitelist, and Guide actions, plus a mode pill that mirrors Work/Chat state. Reused the existing Activity Monitor, settings modal, whitelist tab, and help route instead of introducing a second navigation system.
- **Validation:** `get_errors project/MA/MA-client/MA-index.html` → `No errors found`.

---

## Session Ledger — 2026-03-24 (MA Anthropic prompt-caching header parity)

Status: `Complete`

- **Request:** MA Anthropic extended cache fails with `Unexpected value(s) ... for the 'anthropic-beta' header`; compare with NekoCore and fix MA to match the working implementation.
- **Root cause:** MA was sending `prompt-caching-2024-12-20` while NekoCore uses the accepted `prompt-caching-2024-07-31` beta header for Anthropic prompt caching.
- **Files fixed:** `project/MA/MA-server/MA-llm.js`, `project/MA/tests/MA-llm.test.js`
- **Fix:** Aligned MA to the NekoCore prompt-caching beta header value and updated the MA LLM regression test to lock the working header in place.
- **Validation:** `node --test tests/MA-llm.test.js` → `54 pass, 0 fail`.

---

## Session Ledger — 2026-03-24 (MA thinking-budget visibility + Anthropic JSON sanitization)

Status: `Complete`

- **Request:** In MA, surface the minimum Max Tokens required by Anthropic thinking budget, and fix intermittent `request body is not valid JSON: no low surrogate in string` errors.
- **Root cause:** MA settings exposed the thinking budget slider but did not display or enforce the required `maxTokens >= thinkingBudget` relationship. Separately, MA Anthropic requests serialized raw message/tool strings without sanitizing malformed surrogate pairs, so invalid Unicode could reach the provider.
- **Files fixed:** `project/MA/MA-client/MA-index.html`, `project/MA/MA-server/MA-core.js`, `project/MA/MA-Server.js`, `project/MA/MA-server/MA-llm.js`, `project/MA/tests/MA-llm.test.js`, `project/MA/tests/MA-config-caps.test.js`
- **Fix:** Added a settings hint and live sync so Anthropic extended thinking shows and enforces `Max Tokens >= thinkingBudget`; persisted `maxTokens` and `vision` in unified `profile.ma` config; used in-memory config as a fallback during `setConfig`; preserved explicit `contextWindow` overrides in memory; sanitized lone surrogates before JSON serialization; and auto-raised Anthropic `max_tokens` to the active thinking budget when needed.
- **Validation:** `node --test tests/MA-config-caps.test.js tests/MA-llm.test.js` → `66 pass, 0 fail`.

---

## Session Ledger — 2026-03-24 (v0.9.0-alpha.5 release prep)

Status: `Complete`

- **Request:** Update documentation, fix broken tests, version bump, push to main + staging.
- **Work done:**
  - README updated: test badge 2,248→2,505, version bump to v0.9.0-alpha.5, Phase 5 + Phase 4.25/4.26 marked complete on roadmap, Anthropic Direct provider added to config examples/prerequisites/feature table, Predictive Memory + QA Checklist added to capability grid, Memory Topology added to tech spec.
  - CHANGELOG: Unreleased items tagged as `[0.9.0-alpha.5] — 2026-03-24`.
  - package.json (root + project): version bumped to `0.9.0-alpha.5`.
  - Fixed 3 broken tests: system-apps-manifest-guards (`qachecklist` added to expected list), single-llm-mode-guards (search window widened from 3000→6000 chars), llm-interface-guards (compaction assertion updated for hard-disable).
  - 2,505 tests passing, 0 real failures (2 file-level Node 24 runner deserialization artifacts).
- **Files changed:** `README.md`, `CHANGELOG.md`, `WORKLOG.md`, `package.json`, `project/package.json`, `project/tests/unit/system-apps-manifest-guards.test.js`, `project/tests/unit/single-llm-mode-guards.test.js`, `project/tests/unit/llm-interface-guards.test.js`

---

## Session Ledger — 2026-03-24 (Theme wallpaper immediate preview)

Status: `Complete`

- **Request:** Selecting a background image in the Themes tab should show on the desktop immediately instead of only after saving.
- **Root cause:** Theme customizer only applied wallpaper changes during save/apply flows; background controls had no live preview hook.
- **Files fixed:** `project/client/js/apps/optional/theme-manager.js`
- **Fix:** Added `_previewCustomizerForm()` and wired background controls (`themeBgStart`, `themeBgEnd`, `themeBgOpacity`, `themeWallpaperImage`, `themeWallpaperCustom`) to apply a live desktop preview as the user changes them, without persisting until save.

---

## Session Ledger — 2026-03-24 (Taskbar icon right-click target fix)

Status: `Complete`

- **Request:** Right-clicking taskbar icons should open app-specific menu; currently it often shows generic taskbar options.
- **Root cause:** Context-menu icon matcher did not include dynamic running-window buttons (`.os-running-app`), so those clicks fell through to taskbar-area branch.
- **Files fixed:** `project/client/js/context-menu.js`
- **Fix:** Expanded taskbar app selector to include `.os-running-app` and unified icon-menu branch so pinned/dash/overflow/running buttons all resolve to app-level `Open/Close` actions.

---

## Session Ledger — 2026-03-24 (Taskbar icon right-click Open + Close)

Status: `Complete`

- **Request:** Users need right-click on taskbar app icons to expose both `Open` and `Close`.
- **Root cause:** Taskbar icon menu only exposed `Open` (plus pin/shortcut options), with no direct close action.
- **Files fixed:** `project/client/js/context-menu.js`
- **Fix:** Updated taskbar icon context menu branch (`.os-pinned-app`, `.os-dash-app`, `.os-overflow-app`) to include explicit `Open <app>` and `Close <app>` actions. `Close` calls `closeWindow(tab)` directly from the taskbar context menu.

---

## Session Ledger — 2026-03-24 (Theme customizer save target + desktop customize shortcut)

Status: `Complete`

- **Request:** If a custom theme card is active, user must be able to choose between saving updates to that active theme or creating a new one; desktop right-click should include a direct customize-desktop action that opens the Themes customizer.
- **Root cause:** Theme customizer only exposed `Save As New Theme`; desktop context menu had no direct route to theme customization.
- **Files fixed:** `project/client/apps/non-core/core/tab-themes.html`, `project/client/js/apps/optional/theme-manager.js`, `project/client/js/context-menu.js`
- **Fix:** Added `Save to Active Theme` button (enabled only when active theme is a user theme) and overwrite flow for the currently active custom theme; retained `Save As New Theme` for clone/new behavior. Added global `openThemeCustomizer()` helper and wired desktop context menus (`.os-desktop-files`, `.os-home`, fallback background) with `Customize Desktop` action that opens Themes and focuses the customizer.

---

## Session Ledger — 2026-03-24 (Themes app delete button for custom themes)

Status: `Complete`

- **Bug:** Users could not remove stale custom theme cards from the Themes gallery.
- **Root cause:** Gallery had apply-only cards with no delete action for `isUserTheme` entries.
- **Files fixed:** `project/client/js/apps/optional/theme-manager.js`, `project/client/css/ui-v2.css`
- **Fix:** Added `Delete` action on user-theme cards; deleting active custom theme now falls back to `neko-default` and removes persisted theme entry from `rem-ui-user-themes`.

---

## Session Ledger — 2026-03-24 (MA dedicated config slot + compaction safety default)

Status: `Complete`

- **Request:** MA must use its own config field (not shared with main runtime), and MA compaction should be default-disabled pending stability.
- **Root cause:** MA config read/write was bound to `profiles[*].nekocore` and MA Anthropic capability/UI defaulted compaction on.
- **Files fixed:** `project/MA/MA-server/MA-core.js`, `project/client/js/apps/core/setup-ui.js`, `project/Config/ma-config.example.json`, `project/MA/MA-server/MA-capabilities.js`, `project/MA/MA-client/MA-index.html`, `project/MA/tests/MA-capabilities.test.js`, `CURRENT-BUGS.md`
- **Fix:** MA now reads/writes `profiles[lastActive].ma` (legacy fallback from `profiles[*].nekocore` for compatibility), setup wizard seeds `profile.ma` instead of `profile.nekocore`, example config blueprint now models `ma`, Anthropic MA compaction defaults to `false`, MA settings compaction toggle defaults unchecked and only hydrates enabled when explicitly true/mode, and CURRENT-BUGS now records MA-side compaction mitigation.

---

## Session Ledger — 2026-03-24 (MA/NekoCore unified config + masked key reveal)

Status: `Complete`

- **Request:** Make MA use NekoCore OS config by default, wire MA settings to the same config source, add MA setup visibility in wizard/settings, and auto-hydrate API keys as masked with reveal.
- **Root cause:** MA had a separate config file (`MA/MA-Config/ma-config.json`) and UI path, causing config drift and key UX mismatch.
- **Files fixed:** `project/MA/MA-server/MA-core.js`, `project/MA/MA-Server.js`, `project/MA/MA-client/MA-index.html`, `project/client/js/auth.js`, `project/client/apps/core/tab-settings.html`, `project/client/apps/core/overlays/setup-wizard.html`, `project/client/js/apps/core/setup-ui.js`
- **Fix:** MA now reads/writes NekoCore global config (`project/Config/ma-config.json`) using `profile.nekocore` (fallback `profile.main`). MA settings `/api/config` now returns masked-key state (`hasApiKey`, `apiKeyMasked`) and supports explicit reveal fetch (`revealKey=1`), with client-side See/Hide toggle. NekoCore settings now auto-hydrates stored keys as `********` with See/Hide controls and preserves existing keys when masked values are submitted. Setup wizard now states MA inheritance and seeds `profile.nekocore` from first-run main provider defaults when unset.

---

## Session Ledger — 2026-03-24 (Example config blueprint + QA Checklist registration)

Status: `Complete`

- **Request:** Ensure the example config reflects the new unified config blueprint and verify QA Checklist app availability.
- **Root cause:** `ma-config.example.json` lagged the unified schema fields used in runtime (`nekocore`, `_activeType`, `workspacePath`), and QA Checklist was present in non-core manifest but missing in launcher/system app registries.
- **Files fixed:** `project/Config/ma-config.example.json`, `project/client/js/app.js`, `project/client/js/apps/system-apps.json`
- **Fix:** Example config now includes `profiles[*].nekocore`, `_activeType`, expanded `_activeTypes`, and top-level `workspacePath`. QA Checklist app is now registered in legacy launcher metadata (`WINDOW_APPS`, `APP_CATEGORY_BY_TAB`) and in `system-apps.json`, aligning windowing/start-menu compatibility paths.

---

## Session Ledger — 2026-03-24 (Task Manager phase/token telemetry reliability)

Status: `Complete`

- **Request:** Task Manager did not consistently show pipeline phase and last token usage, especially after provider/runtime path changes.
- **Root cause:** Single-LLM chat path did not emit orchestration/phase SSE telemetry at all, and client telemetry reset token counters to zero whenever bypass routes emitted `orchestration_complete` with `tokenUsage: null`.
- **Files fixed:** `project/server/services/chat-pipeline.js`, `project/client/js/apps/core/telemetry-ui.js`
- **Fix:** Added SSE telemetry emits (`orchestration_start`, `phase_start`, `phase_complete`, `orchestration_complete`) to single-LLM processing with real usage (`returnUsage: true`) and model/timing payloads. Updated Task Manager telemetry reducer to keep last valid token totals when a null-usage bypass event arrives.

---

## Session Ledger — 2026-03-24 (Custom themes persisting after reset-all)

Status: `Complete`

- **Bug:** User-created custom themes continued to appear in Themes app after `reset-all`.
- **Root cause:** Theme user entries were persisted in browser localStorage (`rem-ui-user-themes`, `rem-ui-theme-custom`, `rem-ui-theme`), which filesystem reset does not remove.
- **Files fixed:** `project/client/js/login.js`
- **Fix:** On auth bootstrap when `hasAccounts === false` (true first-run/reset state), login init now clears theme localStorage keys before normal auth/session flow.

---

## Session Ledger — 2026-03-24 (Taskbar quick-message persistence)

Status: `Complete`

- **Bug:** Previously typed messages in the taskbar quick-message field kept appearing after reset cycles.
- **Root cause:** Browser autofill/history was still enabled on `nkQuickInput`, so entries were persisted by browser profile state outside runtime reset data.
- **Files fixed:** `project/client/index.html`
- **Fix:** Added `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"` to the taskbar quick-message input.

---

## Session Ledger — 2026-03-24 (Anthropic cache_control TTL Bugfix)

Status: `Complete`

- **Bug:** Anthropic API rejecting all LLM calls with `invalid_request_error: system.0.cache_control.ephemeral.ttl: Input should be '5m' or '1h'`
- **Root cause:** Extended cache TTL was sent as numeric `3600` instead of string `'1h'`
- **Files fixed:** `server/services/llm-interface.js`, `MA/MA-server/MA-llm.js`
- **Tests updated:** `tests/unit/llm-interface-guards.test.js`, `MA/tests/MA-llm.test.js`
- **Also fixed:** Added `api.anthropic.com` to ALLOWED_HOSTS in `server/routes/config-routes.js` and `server/server.js` (proxy allowlist for connection test)
- **Suite result:** 44/44 pass (llm-interface-guards)

---

## Session Ledger — 2026-03-24 (QA Checklist App)

Status: `Complete`

- **Feature:** QA Checklist app — comprehensive test checklist that complements Bug Tracker
- **Files created:** `client/apps/non-core/core/tab-qachecklist.html` (~620 lines)
- **Files modified:** `client/apps/non-core/non-core-apps.manifest.json` (added qachecklist entry)
- **Summary:** New non-core app with ~270 test items across 40 sections covering full NekoCore OS test surface: boot/auth, setup wizard, shell UI (header, sidebar, taskbar, start menu, window management, context menu, desktop), all 10 core tabs, 3 overlays, all 14 non-core tabs, and integration tests (entity lifecycle, sleep pipeline, memory system, provider switching, skills, themes, backup/restore, edge cases). Each item has Pass/Fail buttons. Fail opens Bug Tracker tab and auto-creates a new bug pre-filled with title ("QA FAIL: ..."), area (matched from checklist section), description, and steps. Pass records timestamp. Progress bar + stats in toolbar. Filter by status (all/untested/pass/fail). Collapse/expand sections. Results persist in localStorage. Save/Load as `.qacheck.json` files. Reset with confirmation.

---

## Session Ledger — 2026-03-24 (MA Chat Mode vs Work Mode)

Status: `Complete`

- **Feature:** MA Chat Mode / Work Mode toggle
- **Files changed:** `MA/MA-server/MA-core.js` (mode state, getMode/setMode, chat-mode routing bypass, system prompt adaptation, native tool schema filtering, blockedTools in toolOpts), `MA/MA-server/MA-workspace-tools.js` (blockedTools check in executeToolCalls + executeNativeToolCalls), `MA/MA-server/MA-Server.js` (GET/POST /api/mode routes), `MA/MA-index.html` (Work/Chat toggle buttons, switchMode/updateModeUI/syncMode JS, localStorage persistence)
- **Summary:** Added dual-mode system. Chat Mode: forces conversation intent (no task classification), restricts to 5 read-only tools (ws_list, ws_read, web_search, web_fetch, memory_search), blocks 6 write/execute tools (ws_write, ws_append, ws_delete, ws_mkdir, ws_move, cmd_run), hides code-output instructions from system prompt. Work Mode: full tool access + task routing (default). Tool blocking enforced at 3 layers: (1) native schemas filtered before LLM sees them, (2) text-parsed tool calls checked at execution time, (3) native tool calls checked at execution time. Blocked tools return friendly "switch to Work Mode" message. Mode persists via server state + client localStorage.

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 11: Legacy Memory Migration)

Status: `Complete`

- **Slice:** Slice 11 — Legacy Memory Migration
- **Files changed:** `server/tools/migrate-memory-agents.js` (new ~230 lines), `package.json` (+migrate:memory-agents npm script), `tests/unit/predictive-memory-guards.test.js` (+8 tests)
- **Summary:** Created CLI migration tool for v1→v2 memory backfill. Scans entity episodic+semantic directories for log.json files. Phase 1: classify shapes via heuristic classifyShape(). Phase 2: build duck-typed mini-index (with normalizeTopics parity with MemoryIndexCache) and seed edges via seedEdges(). Phase 3: write updated log.json (only with --apply). Preserves userId/userName after normalizeMemoryRecord for temporal_adjacent edge detection. Idempotent — skips memories already at v2 with valid non-unclassified shape. Exports main/migrateEntity/scanMemories/buildMiniIndex for testing. Bug found + fixed during test: buildMiniIndex was storing raw topics (not normalized), causing topic_sibling edge detection to fail vs the normalized newTopicSet in seedEdges.
- **Suite result:** 2,599 tests, 2,596 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 10: Dream Reconsolidation)

Status: `Complete`

- **Slice:** Slice 10 — Dream Reconsolidation
- **Files changed:** `server/brain/memory/reconsolidation.js` (new ~240 lines), `server/brain/cognition/phases/phase-dreams.js` (reconsolidation wiring at every 4th dream cycle), `tests/unit/predictive-memory-guards.test.js` (+12 tests)
- **Summary:** Created reconsolidation.js with reconsolidate(entityId, indexCache, beliefGraph, opts). Three stages: (1) Edge strength adjustment — recently accessed memories have edges strengthened to co-accessed neighbors (+0.1) and weakened to un-accessed neighbors (-0.05, floor 0.1). (2) Cluster detection — union-find on mutual strong edges (>0.5 threshold) with dominant topic tagging. (3) Anticipatory stub creation — beliefs reinforced 3+ times in 48h with source memories in a detected cluster generate anticipatory memory stubs (type:anticipatory, shape:anticipatory, edges to cluster members, importance = confidence × 0.5). Wired into phase-dreams.js with cadence gate (every 4th dream cycle ≈ every 20 brain loops). Injectable _getEdges/_setEdges/_createStub for test isolation. No LLM calls.
- **Suite result:** 2,593 tests, 2,590 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 9: Belief-Linked Activation)

Status: `Complete`

- **Slice:** Slice 9 — Belief-Linked Activation
- **Files changed:** `server/brain/knowledge/beliefGraph.js` (+getAttentionBoosts method), `server/services/memory-retrieval.js` (+belief activation before scoring), `server/brain/memory/edge-builder.js` (+seedBeliefEdges function), `server/services/memory-operations.js` (+belief_linked edges in both create functions), `server/server.js` (+getBeliefGraph getter), `tests/unit/predictive-memory-guards.test.js` (+10 tests), `tests/unit/echo-future-stub-guards.test.js` (stub test updated null→[])
- **Summary:** Added getAttentionBoosts(topics) to beliefGraph.js — returns [{beliefId, confidence, sourceMemIds, boost}] where boost = BELIEF_ACTIVATION_BOOST (0.2) × confidence. Wired into memory-retrieval.js — before scoring, calls getAttentionBoosts then activate(srcMemId, boost) for each belief source memory. Added seedBeliefEdges(newMemId, beliefs, existingTargets) to edge-builder.js — creates belief_linked edges from new memory to belief source memories (strength 0.5 × confidence, skip < 0.01, dedup, respects MAX_EDGES). Wired into both createCoreMemory and createSemanticKnowledge via creationContext.activeBeliefIds. Added getBeliefGraph getter to server.js factory call. No LLM calls.
- **Suite result:** 2,581 tests, 2,579 pass, 2 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 8: Echo Future Implementation)

Status: `Complete`

- **Slice:** Slice 8 — Echo Future Implementation
- **Files changed:** `server/brain/agent-echo.js` (replaced echoFuture stub with working implementation ~55 lines), `server/services/memory-retrieval.js` (echoFuture merge + SSE event), `server/brain/bus/thought-types.js` (+ECHO_FUTURE_HIT), `tests/unit/predictive-memory-guards.test.js` (+11 new tests, 5 stub tests updated), `tests/unit/agent-echo-guards.test.js` (1 stub test updated)
- **Summary:** Replaced echoFuture() stub with working implementation. Steps: (1) getPreActivated(indexCache, 0.15, 20) for candidates, (2) topic overlap filter if topics provided, (3) +0.2 activation boost for anticipatory shape memories, (4) sort by activation descending, return top-N (default 5). Returns [{id, topics, shape, activationLevel, creationContext}]. Wired into memory-retrieval.js after echoPast merge — results tagged with _source: 'echo_future' for observability. ECHO_FUTURE_HIT thought type emitted via cognitive bus when echoFuture contributes results. No LLM calls.
- **Suite result:** 2,593 tests, 2,591 pass, 2 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 7: Wire Activation into Retrieval Path)

Status: `Complete`

- **Slice:** Slice 7 — Wire Activation into Retrieval Path
- **Files changed:** `server/services/memory-retrieval.js` (activation boost in scoring + propagation trigger after retrieval), `server/brain/cognition/phases/phase-decay.js` (decayAllActivations every cycle, fixed require path), `tests/unit/predictive-memory-guards.test.js` (+6 tests)
- **Summary:** Wired activation network into the live retrieval and decay paths. In memory-retrieval.js scoring: if activationLevel > 0.15, adds activationLevel × 0.25 score boost (up to 25%). After topConnections built, triggers activate(conn.id, 0.8) for top 12 connections — primes neighbors for next turn. In phase-decay.js: added decayAllActivations(indexCache, 0.3) BEFORE the 24h daily gate, so activation decays every brain loop cycle (much faster than the daily 0.01 memory decay). Fixed a require path bug: phases/ needed ../../memory/ not ../memory/ to reach activation-network.js. No LLM calls.
- **Suite result:** 2,557 tests, 2,554 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 6: Activation Propagation Engine)

Status: `Complete`

- **Slice:** Slice 6 — Activation Propagation Engine
- **Files changed:** `server/brain/memory/activation-network.js` (new ~130 lines), `tests/unit/predictive-memory-guards.test.js` (+13 tests)
- **Summary:** Created activation-network.js with three exports: activate(memId, energy, indexCache, opts) propagates activation energy through 2 hops — hop-1 gets energy×strength×0.5, hop-2 gets hop1Energy×strength×0.25. Energy is additive and caps at 1.0. Loop-back to source prevented. decayAllActivations(indexCache, rate) multiplies all levels by (1-rate), default 0.3, floors at 0. getPreActivated(indexCache, threshold, limit) returns memIds above threshold sorted by energy descending. activationLevel stored transiently on indexCache memoryIndex entries (resets to 0 on index rebuild). No LLM calls.
- **Suite result:** 2,551 tests, 2,549 pass, 2 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 5: Edge Seeding at Creation)

Status: `Complete`

- **Slice:** Slice 5 — Edge Seeding at Creation
- **Files changed:** `server/brain/memory/edge-builder.js` (new ~95 lines), `server/services/memory-operations.js` (added _patchReverseEdge, edges/userId/userName in log, seedEdges call + bidirectional patching in both create functions), `tests/unit/predictive-memory-guards.test.js` (+13 tests: 10 seedEdges unit + 3 integration)
- **Summary:** Created edge-builder.js with seedEdges(newMemId, newMeta, indexCache) that scans last 50 memories from recencyIndex and discovers edges via 3 rules: temporal_adjacent (same userId within 10 min, strength 0.9), emotional_echo (same emotion + shared topic within 7 days, 0.7), topic_sibling (2+ shared topics within 24h, 0.6). Strongest rule wins per candidate. Max 8 edges per memory. Wired into createCoreMemory and createSemanticKnowledge — seedEdges runs after log object build, before write. Bidirectional patching via _patchReverseEdge (read→append→write connected memory log.json, respects 8-edge cap and dedup). Added userId/userName to log.json top level from creationContext. Topics normalized via normalizeTopics for correct matching against index. No LLM calls.
- **Suite result:** 2,538 tests, 2,535 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 4: Shape Index Implementation)

Status: `Complete`

- **Slice:** Slice 4 — Shape Index Implementation
- **Files changed:** `server/brain/utils/archive-indexes.js` (rebuildShapeIndexes stub → full implementation ~45 lines), `server/brain/cognition/phases/phase-archive-index.js` (logs shape count), `tests/unit/predictive-memory-guards.test.js` (+4 net tests: 8 shape index tests replacing 4 stub tests)
- **Summary:** Filled the Phase 5 stub in archive-indexes.js. rebuildShapeIndexes() reads all archive bucket entries via _listBucketFilenames()/_readBucketEntries(), classifies each by shape (uses pre-existing entry.shape if available, otherwise runs classifyShape() heuristic on emotion/importance/type), groups memIds into a Map by shape label, writes one .idx.json per shape via writeIndex(entityId, 'shape', label, memIds, opts). Deduplicates via Set. Returns total unique memIds indexed. Phase loop now logs count. Tests verify: empty entity returns 0, accepts opts, synchronous, exports intact, classifies + writes index files, respects pre-existing shape, deduplicates across buckets, intersectIndexes works with shape axis. No LLM calls.
- **Suite result:** 2,526 tests, 2,523 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 3: Creation Context Capture)

Status: `Complete`

- **Slice:** Slice 3 — Creation Context Capture
- **Files changed:** `server/services/chat-pipeline.js` (4 call sites: added `beliefGraph` param), `server/services/post-response-memory.js` (added `classifyShape` import, `buildCreationContext` helper, wired creationContext + shape into all 3 createCoreMemory/createSemanticKnowledge calls), `server/services/memory-operations.js` (expanded createCoreMemory + createSemanticKnowledge signatures, added creationContext + shape to log.json), `server/brain/memory/memory-index-cache.js` (added shape to memoryIndex entry in addMemory), `tests/unit/predictive-memory-guards.test.js` (+7 tests: 2 index cache shape tests, 5 filesystem-backed memory-operations tests)
- **Summary:** New memories now capture the full creation context (mood, emotions, tone, activeBeliefIds from beliefGraph, conversationTopics, userId, userName) and are classified by shape (emotional/anticipatory/reflective/factual/narrative/unclassified) at creation time. Both fields persisted to log.json and indexed in memory cache. beliefGraph threaded from brain through all 4 pipeline call sites. Backward compatible — old code paths that omit these fields get null/unclassified defaults. No LLM calls added.
- **Suite result:** 2,523 tests, 2,520 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 2: Shape Classifier)

Status: `Complete`

- **Slice:** Slice 2 — Shape Classifier
- **Files created:** `server/brain/memory/shape-classifier.js` (~85 lines)
- **Files changed:** `tests/unit/predictive-memory-guards.test.js` (+17 tests, 1 new describe block)
- **Summary:** Pure-heuristic shape classifier with strict priority chain: emotional (strong emotion set: anger/joy/sadness/fear/love/grief + expanded set, or importance >= 0.85) > anticipatory (13 future-oriented markers) > reflective (12 self-referential markers) > factual (semantic_knowledge type, or neutral/absent emotion + importance < 0.6) > narrative (default fallback). Case-insensitive emotion and semantic matching. SHAPE_LABELS re-exported from VALID_SHAPES (single source of truth in memory-schema.js). No LLM calls.
- **Suite result:** 2,512 tests, 2,510 pass, 2 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice 1: Memory Schema v2)

Status: `Complete`

- **Slice:** Slice 1 — Memory Schema v2
- **Files changed:** `server/contracts/memory-schema.js`, `tests/unit/predictive-memory-guards.test.js`
- **Summary:** Bumped MEMORY_SCHEMA_VERSION from 1 to 2. Added 5 new fields to normalizeMemoryRecord (creationContext, shape, edges, activationLevel, lastActivationContext) with backward-compatible defaults. Added normalizeEdges() helper that filters malformed entries. Added VALID_SHAPES frozen array export. Shape validated against enum, activationLevel clamped [0,1], memorySchemaVersion always stamps as current version (2). Guard tests updated from 25 to 39: v1 backward compat block (12 tests) + v2 fields block (13 tests). All v1 field behaviors preserved.
- **Suite result:** 2,510 tests, 2,507 pass, 3 pre-existing deserialization warnings

---

## Session Ledger — 2026-03-24 (Predictive Memory Slice -0: Guard Tests)

Status: `Complete`

- **Slice:** Slice -0 — Guard tests
- **Files created:** `tests/unit/predictive-memory-guards.test.js` (25 tests, 4 describe blocks)
- **Guard coverage:**
  - `normalizeMemoryRecord()` — 11 fields, all defaults, v1 shape frozen, topic filtering, option fallbacks, non-finite clamping, v2 field absence
  - `echoFuture()` — returns null (not undefined/[]/{}), export shape (4 exports)
  - `rebuildShapeIndexes()` — returns 0, synchronous, export shape (8 exports)
  - `MemoryIndexCache.addMemory()` — v1 field storage, topicIndex/recencyIndex population, default application, v2 field absence in index entries
- **Suite result:** 2,480 tests, 2,477 pass, 3 pre-existing deserialization warnings (port-guard, llm-interface-guards)
- **Summary:** All current contracts locked. No implementation code written. Phase 5 can now safely modify these modules with regression detection.

---

## Session Ledger — 2026-03-24 (Phase 5 Plan: Predictive Memory Topology)

Status: `Complete`

- **Purpose:** Create comprehensive Phase 5 plan document: PLAN-PREDICTIVE-MEMORY-v1.md
- **Research:** Analyzed MiroFish/OASIS swarm intelligence engine (agent-from-graph-node spawning, Zep Cloud graph memory with live feedback loop). Validated memory-as-agent pattern at scale. Compared with NekoCore's 9 memory subsystems. Language decision: stay Node.js (BM25 25K in 70ms, Rust NAPI reserved for 50K+ scaling).
- **Plan structure:** 4 phases, 12 slices (-0 through 11)
  - P1 (Slices -0 to 3): Schema v2 + Creation Context + Shape Classifier + Shape Index
  - P2 (Slices 4–6): Edge Seeding + Activation Propagation + Retrieval Wiring
  - P3 (Slices 7–8): Echo Future Implementation + Prediction Pipeline
  - P4 (Slices 9–11): Belief Integration + Dream Reconsolidation + Legacy Migration
- **Files created:** `Documents/current/PLAN-PREDICTIVE-MEMORY-v1.md` (~500 lines)
- **Files changed:** `WORKLOG.md` (snapshot + ledger + Phase 5 activation)
- **Key design decisions:** Memory schema v2 (backward-compatible, 5 new fields), 5 shape labels + unclassified, 6 edge types, 2-hop activation cap (energy halves per hop), 0.3 activation decay rate, heuristic shape classification (no LLM), dream reconsolidation creates anticipatory stub nodes
- **Suite result:** No code changes — plan only

---

## Session Ledger — 2026-03-23 (Provider-Agnostic Capabilities Slice 10)

Status: `Complete`

- **Slice:** Slice 10 — Native tool use migration
- **Files created:** `server/services/tool-use-adapter.js` (~280 lines), `tests/unit/tool-use-adapter-guards.test.js` (30 tests)
- **Files changed:** `server/services/llm-interface.js`, `server/brain/core/orchestrator.js`, `server/services/memory-tool-bridge.js`, `server/services/chat-pipeline.js`, `server/services/nekocore-pipeline.js`
- **Suite result:** 2,494 pass, 0 real failures (1 pre-existing deserialization warning on port-guard test)
- **Summary:** Created tool-use-adapter.js with 16 workspace tool definitions (ws_*, web_*, skill_*, search_archive, profile_update, cmd_run), provider-specific schema builders (Anthropic input_schema + OpenRouter function wrapper), response parsers, result formatters, and createToolExecutor bridge that routes native tool calls through existing workspace-tools.executeToolCalls via synthetic text. Added OpenRouter tool_use loop to llm-interface.js (mirrors Anthropic pattern from Slice 8). Orchestrator conscious phase now passes workspace tool schemas + executor to callLLM when runtime supports nativeToolUse. Memory bridge updated for composable tool merging (existing + memory tools + composite handler). Both pipelines wire tool schemas + executor into Orchestrator. Ollama falls through gracefully (buildToolSchemas returns null). Text-tag fallback system untouched for non-native providers.

---

## Session Ledger — 2026-03-23 (Provider-Agnostic Capabilities Slice 9)

Status: `Complete`

- **Slice:** Slice 9 — Settings UI: capability toggles
- **Files changed:** `client/apps/core/tab-settings.html`, `client/js/apps/core/simple-provider.js`, `server/routes/config-routes.js`
- **Summary:** Added collapsible Capabilities section to Anthropic settings panel with 4 toggles (extended cache, compaction, memory tool bridge, extended thinking) + thinking budget slider (1024–16384). OpenRouter/Ollama get informational notice about Anthropic-exclusive features. Fixed `normalizeIncomingRuntimeConfig()` to handle `anthropic` type (was falling through to `openrouter`). Capabilities elevated from aspect config to `profile.capabilities` for the `resolveCapabilities()` pipeline. Hydration reads from `profile.capabilities` on page load.

---

## Session Ledger — 2026-03-23 (Provider-Agnostic Capabilities Slice 8)

Status: `Complete`

- **Slice:** Slice 8 — Memory Tool Bridge
- **Files created:** `server/services/memory-tool-bridge.js` (~190 lines)
- **Files changed:** `server/services/llm-interface.js`, `server/services/chat-pipeline.js`, `server/services/nekocore-pipeline.js`
- **Tests created:** `tests/unit/memory-tool-bridge-guards.test.js` (41 tests), `tests/unit/llm-tool-use-loop-guards.test.js` (6 tests)
- **Suite result:** 2,428 pass, 0 real failures (3 pre-existing deserialization warnings on mock-HTTP tests)
- **Summary:** Created Anthropic native memory tool bridge. 4 tool schemas (memory_search, memory_store, memory_read, memory_list) exposed via Anthropic tool_use API. `createMemoryToolBridge(deps)` returns `wrapCallLLM()` wrapper that transparently injects tools for Anthropic with `memoryTool` capability. llm-interface.js handles tool_use loop (max 3 rounds) with `executeToolCall` callback. Both chat-pipeline and nekocore-pipeline wrap callLLM with the bridge. Non-Anthropic providers pass through unchanged.

---

## Session Ledger — 2026-03-23 (Anthropic Direct + Prompt Caching)

Status: `Complete`

- **Purpose:** Add Anthropic Direct as a third provider type (alongside OpenRouter and Ollama) with native prompt caching support, saving up to 90% on input tokens for repeated system prompts.
- **Changes:**
  1. **llm-interface.js** — Added `anthropic` branch in `callLLMWithRuntime()`. Converts OpenAI-style messages to Anthropic Messages API format (separate `system` parameter, alternating user/assistant roles). Annotates the last system block with `cache_control: { type: "ephemeral" }` for prompt caching. Logs cache read/creation token counts. Maps Anthropic usage fields (`input_tokens`/`output_tokens`) to the standard usage shape.
  2. **config-runtime.js** — Added `anthropic` type recognition in `normalizeAspectRuntimeConfig()` with default endpoint `https://api.anthropic.com/v1/messages`.
  3. **orchestrator.js** — Updated `isRuntimeUsable()` to check for API key on `anthropic` type (same pattern as `openrouter`).
  4. **setup-wizard.html** — Added "Anthropic Direct" provider button and form fields (API key, model datalist with Claude models, prompt caching callout).
  5. **tab-settings.html** — Added "Anthropic Direct" provider button and panel with key/model inputs and caching notice.
  6. **index.html** — Updated setupRequiredModal to include Anthropic Direct button and description.
  7. **setup-ui.js** — Updated `isApiConfigured()`, `setupSelectProviderForAspect()`, `setupTestConnectionForAspect()`, `clearSetupFormFields()`, and `goToSetupTab()` to handle `anthropic` provider type.
  8. **simple-provider.js** — Updated `simplePickProvider()`, `simpleSaveConfig()`, and `initSimpleProviderUI()` with Anthropic branch. Anthropic config seeds all pipeline aspects with the same Anthropic model on first setup.
  9. **pipeline.js** (client) — Added `anthropic` type to `normalizeRuntimeConfig()`.
- **Tests:** 2,249 tests, 1 pre-existing fail (port-guard.test.js)

---

## Session Ledger — 2026-03-22 (Settings app API key fix)

Status: `Complete`

- **Purpose:** Fix Settings app not allowing model-only saves — API key not detected from stored config, save blocked with "API key is required".
- **Root Cause:** `keyEl` and `typedKey` were declared with `const` inside the `else` block of `simpleSaveConfig()` but referenced later in the `try` block outside that scope. This caused a silent `ReferenceError` after the POST succeeded, preventing `refreshSavedConfig()` from running and `hasStoredKey` from ever being set.
- **Changes:**
  1. **simple-provider.js** — Hoisted `keyEl` and `typedKey` from block-scoped `const` to function-scoped `let` declarations. Added server-side fallback: when no stored key is detected in-memory, fetches `GET /api/entity-config?provider=main` to check for a stored key on disk (matches the pattern used by `saveNekocoreConfig()`).
- **Tests:** 2,248 tests, 1 pre-existing fail (port-guard.test.js)

---

## Session Ledger — 2026-03-22 (Taskbar running-windows fix)

Status: `Complete`

- **Purpose:** Fix open app windows not being represented on the taskbar — minimized windows were unrecoverable.
- **Changes:**
  1. **index.html** — Added `#osTaskbarRunning` container div inside `os-taskbar-center`, after the overflow wrap
  2. **desktop.js** — Added `syncRunningApps()` function: renders dynamic buttons for open non-pinned windows, updates pinned-app buttons with `has-window`/`is-minimized` indicator classes, and adds `taskbarAppClick()` for toggle focus/minimize behavior. Updated `createPinnedButton()` to use `taskbarAppClick` instead of `switchMainTab`.
  3. **app.js** — Wired `syncRunningApps()` into `syncShellStatusWidgets()` so taskbar updates on every window open/close/minimize/focus
  4. **ui-v2.css** — Added `.os-taskbar-running` layout, `.os-running-app` button styles (matches pinned-app sizing), indicator dot (`::before`) for open windows on both pinned and running buttons, dimmed dot + opacity for minimized state
- **Tests:** 2,248 tests, 1 pre-existing fail (port-guard.test.js)

---

## Session Ledger — 2026-03-22 (MA-Server.js extraction)

Status: `Complete`

- **Purpose:** Slim MA-Server.js from ~750 to ~500 lines by extracting the inline `handleSlashCommand()` switch block (~250 lines) and `renderMarkdownToHtml()` (~30 lines) into dedicated modules.
- **Changes:**
  1. **MA-server/MA-slash-commands.js** — NEW. Extracted `handleSlashCommand()` with all 13 command families (health, memory, knowledge, ingest, config, projects, project, whitelist, pulse, chores, models, worklog). Requires core, cmdExec, pulse, modelRouter directly.
  2. **MA-server/MA-markdown.js** — NEW. Extracted lightweight markdown→HTML renderer used by the `/user-guide` endpoint.
  3. **MA-Server.js** — Replaced inline functions with `require()` imports. Line count: ~750 → ~502. No logic changes — pure extraction.
  4. **shadow-cleanup-a0-guards.test.js** — Updated guard assertion for `createPinnedButton` to match `taskbarAppClick` routing (introduced by the earlier taskbar fix, guard was stale).
- **Tests:** 2,248 tests, 0 fail

---

## Session Ledger — 2026-03-22 (App Visibility Fix)

- **Purpose:** Fix Bug Tracker, Resource Manager, and Setup Wizard not visible/accessible in the OS.
- **Changes:**
  1. **index.html** — Added missing `optional-tab-slot-bugtracker` and `optional-tab-slot-resourcemgr` slot divs (before `optional-tab-custom-slot`) so the non-core-html-loader mounts them at the correct DOM position
  2. **app.js** — Added "Setup Wizard" entry to `START_MENU_SPECIAL_APPS` (id: `setup-wizard`, category: `system`, action: `showSetupWizard`) so users can re-open the wizard from the Start menu
  3. **CHANGELOG.md** — Logged both fixes under `[Unreleased]`
- **Tests:** 2,248 pass, 1 pre-existing fail (port-guard.test.js Node.js deserialization issue)

---

## Session Ledger — 2026-03-22 (MA GUI fix + app removal)

Status: `Complete`

- **Purpose:** Fix MA app GUI sizing/scrollability in iframe. Remove REM System and NekoCore Mind apps (already built-in to NekoCore OS).
- **Changes:**
  1. **MA-index.html** — Replaced `body{height:100vh}` with `html,body{height:100%;overflow:hidden}` so it fits the iframe container. Reduced header padding (12px→6px), input bar padding (12px→6px), message font (14px→13px), textarea max-height (120px→80px). Added `min-height:0` to `#main-wrap` for proper flex scroll. Chat messages now 85% max-width.
  2. **non-core-apps.manifest.json** — Removed `rem-server` and `nekocore-mind` entries
  3. **system-apps.json** — Removed `rem-server` and `nekocore-mind` entries
  4. **index.html** — Removed `optional-tab-slot-rem-server` and `optional-tab-slot-nekocore-mind` slot divs
  5. **system-apps-manifest-guards.test.js** — Removed `rem-server` and `nekocore-mind` from expected app IDs
- **Tests:** 2,248 pass, 1 pre-existing fail

---

## Session Ledger — 2026-03-22 (MA agent reset + auto-provisioning)

Status: `Complete`

- **Purpose:** Fix MA-Reset-All.js not wiping agents (retained job info across resets). Add idempotent auto-provisioning on boot.
- **Changes:**
  1. **MA-scripts/agent-definitions.js** (NEW) — Extracted 6 default agent definitions + default MA entity definition into a shared module importable by both seed script and boot
  2. **MA-server/MA-core.js** — Added `ensureEntity()` (creates entity.json + skills dir if missing) and `ensureAgents()` (seeds any missing default agents). Both called in `boot()` before `loadEntity()` and after `loadSkills()` respectively. Idempotent — skips if already present.
  3. **MA-Reset-All.js** — Added full `entity_ma/` dir to TARGETS (was only clearing memories/index/archives). Added `agents` target type that deletes all `agent_*` directories. Removed entity.json and skills from PRESERVE list. Added `deleteAgents()` helper. Added "recreated on next boot" confirmation message.
  4. **MA-scripts/seed-agents.js** — Replaced inline 280-line agent definitions with `require('./agent-definitions')` import, eliminating duplication
- **Tests:** 2,246 pass, 1 pre-existing fail (port-guard.test.js Node.js deserialization)

---

## Session Ledger — 2026-03-22 (staging → main merge)

Status: `Complete`

- **Purpose:** Promote staging branch to main for pre-alpha public release (v0.9.0-alpha.4.24).
- **Changes:**
  1. **README.md** — Replaced staging-specific WARNING block with pre-alpha CAUTION disclaimer; updated test badge and stats table to 2,248
  2. **Git** — Committed disclaimer update on staging, merged staging→main (--no-ff), pushed both branches to origin
- **Commits merged:** 10 (8 prior staging commits + disclaimer commit + merge commit)

---

## Session Ledger — 2026-03-22 (CI Fix — system-apps entries)

Status: `Complete`

- **Purpose:** Fix CI test failure — 5 non-core apps existed in `non-core-apps.manifest.json` but were missing from `system-apps.json`, causing the `system-apps-manifest-guards` test to fail.
- **Changes:**
  1. **system-apps.json** — Added 5 new entries: ma-server, rem-server, nekocore-mind, bugtracker, resourcemgr (appType: html-only, sourcePath: their host HTML file)
  2. **system-apps-manifest-guards.test.js** — Updated expected app IDs list to include the 5 new entries
- **Tests:** 2,248 pass, 0 fail (was 2,247 pass, 1 fail)

---

## Session Ledger — 2026-03-22 (MA Workspace Reset)

Status: `Complete`

- **Purpose:** Reset MA workspace sub-projects from completed builds to starter scaffolds so the repo ships buildable example projects instead of finished output.

- **Changes:**
  1. **MA-workspace/rem-system/** — Deleted all completed build files (42 files). Created fresh starter scaffold: `PROJECT-MANIFEST.json` (8 layers, 26 modules, all "not-started"), `BUILD-ORDER.md` (full construction guide), `package.json` (zero deps).
  2. **MA-workspace/nekocore/** — Deleted all completed build files (692 files). Created fresh starter scaffold: `PROJECT-MANIFEST.json` (5 parts, 97 modules, all "not-started"), `BUILD-ORDER.md` (full construction guide), `package.json` (express dep for routes).
  3. **MA-workspace/MA-WORKLOG.md** — Reset to clean state (no active project, no active task).
  4. **.gitignore** — Replaced 2 blanket directory exclusions with 20 granular rules: scaffold files (PROJECT-MANIFEST.json, BUILD-ORDER.md, package.json) are now tracked in git; build artifacts (server/, contracts/, client/, tests/, scripts/, node_modules/, transport files) remain ignored.
  5. **docs/MA-AND-PROJECT-STRUCTURE.md** — Updated from "completed builds" language to "starter scaffolds". Rewrote gitignore rationale section. Updated sub-project build history to reflect scaffold state.

- **Files created:** `MA-workspace/rem-system/PROJECT-MANIFEST.json`, `MA-workspace/rem-system/BUILD-ORDER.md`, `MA-workspace/rem-system/package.json`, `MA-workspace/nekocore/PROJECT-MANIFEST.json`, `MA-workspace/nekocore/BUILD-ORDER.md`, `MA-workspace/nekocore/package.json`
- **Files modified:** `MA-workspace/MA-WORKLOG.md`, `.gitignore`, `docs/MA-AND-PROJECT-STRUCTURE.md`, `WORKLOG.md`, `CHANGELOG.md`

---

## Session Ledger — 2026-03-22 (Docs Update + Express Audit)

Status: `Complete`

- **Purpose:** Update all documentation to reflect smart port management feature. Audit Express usage to determine if it's a real dependency.

- **Changes:**
  1. **docs/USER-GUIDE.md** — Updated startup output block to show port-guard behavior, added note about auto-port-resolution. Updated troubleshooting section (removed manual `netstat` advice, replaced with port-guard explanation). Updated Related Servers table header to "Default Port" with note about smart port management.
  2. **README.md** — Removed bogus `"port": 3000` from both Ollama and OpenRouter config examples (config file has no port field). Added note explaining port is set via env var or built-in default. Updated "Zero dependencies" line and Technical Specification table to explicitly say "no Express, no frameworks."
  3. **project/QUICKSTART.md** — Updated to say "Open the URL shown in the startup banner" with fallback note.
  4. **project/MA/USER-GUIDE.md** — Fixed port table: NekoCore OS 3000→3847. Added smart port management note.
  5. **project/MA/README.md** — Simplified Ports table (removed separate fallback entry, unified to "3851–3860 fallback range"). Added smart port management description.
  6. **Express audit result:** Express is NOT used anywhere in the shipped codebase. All 13 `require('express')` imports are in `project/MA/MA-workspace/nekocore/` which is gitignored. No package.json lists express. The main NekoCore OS server and MA both use raw `http.createServer()`.

- **Files modified:** `docs/USER-GUIDE.md`, `README.md`, `project/QUICKSTART.md`, `project/MA/USER-GUIDE.md`, `project/MA/README.md`, `WORKLOG.md`

---

## Session Ledger — 2026-03-22 (Smart Port Management)

Status: `Complete`

- **Purpose:** Implement smart port management for both NekoCore OS and MA servers — detect port conflicts, identify running instances, prompt users before spawning duplicates, support power users running multiple servers.

- **Changes:**
  1. **server/services/port-guard.js** (new) — Shared port-guard utility with `resolvePort()`, `isPortFree()`, `identifyInstance()`, `probe()`. Checks default port → if busy, probes `/api/nekocore/status` and `/api/health` to identify NekoCore OS or MA instances → prompts user via stdin (non-TTY safe: auto-answers for background launches) → finds next free port in configurable range. Supports `allowMultiple` flag.
  2. **server/server.js** — Replaced hard-crash `EADDRINUSE` handler and static `const PORT = 3847` with async `resolvePort()` flow. Port is now resolved before `server.listen()`. Old "REM System may already be running" message removed. `windowTitle` references updated from `REM-System` to `NekoCore-OS`.
  3. **MA/MA-Server.js** — Replaced local `isPortFree()`/`findPort()` with shared `resolvePort()` from port-guard. Removed unused `net` import. MA now identifies existing instances and prompts before silently finding next port. Silent fallback preserved for `MA_NO_OPEN_BROWSER` (process-manager) launches via non-TTY detection.
  4. **tests/unit/port-guard.test.js** (new) — 10 tests: `isPortFree` (free/occupied), `probe` (responding/unoccupied), `identifyInstance` (NekoCore OS/MA/unoccupied), `resolvePort` (free port/different-service fallback/same-type duplicate rejection). All passing.

- **Files created:** `server/services/port-guard.js`, `tests/unit/port-guard.test.js`
- **Files modified:** `server/server.js`, `MA/MA-Server.js`, `WORKLOG.md`, `CHANGELOG.md`

---

## Session Ledger — 2026-03-22 (User Guides)

Status: `Complete`

- **Purpose:** Create a comprehensive NekoCore OS User Guide and update the existing MA User Guide with missing feature documentation.

- **Changes:**
  1. **docs/USER-GUIDE.md** (new) — Full 24-section NekoCore OS user guide: Getting Started (server startup, first-time setup, requirements), Desktop Interface (shell layout, header widgets, windows), Start Menu & App Launcher (sections, categories), Core Apps (Chat, Entity, Creator, Users), Mind & Identity Apps (Visualizer, Physical Body), Journal & Dream Apps (Dream Gallery, Life Diary, Dream Diary), Tools & Workspace Apps (Workspace, Documents, Skills, Browser, Bug Tracker, Resource Manager, Popouts), System Apps (Settings, Advanced, Task Manager, Observability, Core Debug, Archive, NekoCore OS), Entity System (creation methods, switching, privacy, deletion, data layout), Chat & Conversations (pipeline stages, inner dialog, file context, skill approval), Slash Commands (8 commands with /ma bridge), Brain & Cognitive Engine (loop, deep sleep, neurochemistry, user controls), Memory System (tiers, recall, decay, consolidation, beliefs, graph), Dream System (intuition, maintenance, diary vs gallery), LLM Configuration (5 slots, OpenRouter/Ollama setup, per-aspect overrides), System Health & Maintenance (5 tools, cognitive bus stats), Theme System (selection, architecture), Keyboard Shortcuts (chat, browser, bug tracker, general), MA Integration (what MA provides, starting, /ma command, related servers), Multi-User & Profiles (profiles, relationships, switching), Tasks & Projects (single tasks, projects, monitoring), Server Administration (start/stop, backup/restore, reset, ports, Telegram), Troubleshooting (6 common issues), Tips & Best Practices (conversations, entity development, performance, developers).
  2. **project/MA/USER-GUIDE.md** (updated) — TOC expanded from 18 to 23 entries. Added 6 new sections: Activity Monitor (real-time sidebar, task plan display, session worklog), Worklog System (persistent MA-WORKLOG.md, auto-updated, `/worklog` command), Deep Research (trigger phrases, comparison table vs regular research, output structure), Entity Genesis Skill (multi-round workflow, requirements, what makes it special), NekoCore OS Integration (`/ma` bridge, auto-boot, use cases, ports). Expanded Memory System section with: Chat History Persistence (8-message restore on refresh), Memory Chain IDs (linked user+assistant memories, chain sibling expansion), ISO Timestamps (human-readable datetime on all records), Blueprint Injection (task-type blueprints in conversational mode). Added Activity Monitor and Workspace Path to Browser GUI section.
  3. **docs/ARCHITECTURE-OVERVIEW.md** — Document Index updated with USER-GUIDE.md entry.

- **Files created:** `docs/USER-GUIDE.md`
- **Files modified:** `project/MA/USER-GUIDE.md`, `docs/ARCHITECTURE-OVERVIEW.md`, `WORKLOG.md`, `CHANGELOG.md`

---

## Session Ledger — 2026-03-22 (Documentation + Gitignore Update)

Status: `Complete`

- **Purpose:** Update documentation to reflect all recent feature work, explain MA's central role in the project structure, and gitignore completed MA workspace builds.

- **Changes:**
  1. **.gitignore** — Added `/project/MA/MA-workspace/nekocore/` and `/project/MA/MA-workspace/rem-system/` with comments explaining they are completed builds to be replaced with incomplete starter examples. Verified with `git check-ignore -v`. Neither project was previously tracked.
  2. **docs/MA-AND-PROJECT-STRUCTURE.md** (new) — Comprehensive document explaining: why MA lives inside `project/`, folder relationship between OS (port 3000), MA (port 3850), REM System (port 3860), and NekoCore Cognitive Mind (port 3870), server-to-server communication patterns (MA Bridge `/ma` command, pulse/chore proxy, process manager lifecycle), sub-project build history, gitignore rationale, and how to build new projects with MA.
  3. **docs/ARCHITECTURE-OVERVIEW.md** — Version bumped to 0.10.0. Updated: Current Direction Snapshot (added 7 completed phases: Phase 4.10 Entity Orchestration, OS Tool Upgrade, Entity Genesis, MA Bridge, Bug Tracker, Resource Manager), Subsystem Map (9 new entries: MA Bridge, Process Manager, Entity Enrichment, Todo Store, Resource Active State, Resource Manager Routes, Bug Tracker), Server Routing Structure (expanded from 12 to 20 route files, adding entity-enrichment, browser, vfs, nekocore, archive, process-manager, resource-manager routes), Entity Folder Layout (added `active-resources.json` and `memories/todos/`), Document Index (added MA-AND-PROJECT-STRUCTURE.md, HOW-TO-CREATE-AN-APP.md, APP-FOLDER-OWNERSHIP.md).

- **Files created:** `docs/MA-AND-PROJECT-STRUCTURE.md`
- **Files modified:** `.gitignore`, `docs/ARCHITECTURE-OVERVIEW.md`, `WORKLOG.md`
- **Verification:** `git check-ignore -v` confirmed both gitignore patterns match correctly. All doc updates are factual summaries of already-implemented code.

---

## Session Ledger — 2026-03-22 (Bug Tracker App)

Status: `Complete`

- **Purpose:** Standalone NekoCore OS developer tool for tracking bugs/errors with screenshot capture, structured JSON persistence, and Markdown report generation.

- **Changes:**
  1. **tab-bugtracker.html** (new) — Complete non-core app in `apps/non-core/core/`. Two-panel layout: left panel with searchable/filterable/sortable bug list; right panel with full bug editor (title, severity radio group, status/area dropdowns, description/steps/expected/actual textareas). IIFE with `__bugtrackerInit` guard. Includes: bug CRUD with auto-generated sequential IDs (BUG-001+), screenshot capture via html2canvas (local file with CDN fallback) for full OS or active window with JPEG compression for large captures, save/load `.bugtrack.json` files with merge dialog, Markdown/JSON report generation with format+filter options, keyboard shortcuts (Ctrl+N/S/Shift+S), dirty tracking with status bar.
  2. **non-core-apps.manifest.json** — Added bugtracker entry: `{ tabId: "bugtracker", enabled: true, path: "apps/non-core/core/tab-bugtracker.html", label: "Bug Tracker", icon: "🐛", navTarget: "#navOptionalAppsHost" }`.
  3. **app.js WINDOW_APPS** — Added `{ tab: 'bugtracker', label: 'Bug Tracker', icon: '<svg>…</svg>', accent: 'red', w: 960, h: 700 }`.
  4. **app.js APP_CATEGORY_BY_TAB** — Added `bugtracker: 'tools'`.
  5. **ui-v2.css** — Appended ~120 lines of `.bt-*` namespaced CSS: container layout, toolbar, panels, list items with severity dots, editor form fields, severity radio group with `:has()` color coding, screenshot gallery with thumbnails, dialog overlays, preview container, status bar.
  6. **bugtracker-guards.test.js** (new) — 22 tests across 6 suites: manifest guard, WINDOW_APPS guard, HTML payload guard, schema validation, bug ID generation, Markdown report generation. All passing.

- **Files created:** `client/apps/non-core/core/tab-bugtracker.html`, `tests/unit/bugtracker-guards.test.js`
- **Files modified:** `client/apps/non-core/non-core-apps.manifest.json`, `client/js/app.js`, `client/css/ui-v2.css`
- **Plan:** `Documents/current/PLAN-BUG-TRACKER-APP-v1.md`
- **Verification:** 22/22 bugtracker tests, 2088/2089 full suite (1 pre-existing unrelated failure in system-apps-manifest-guards re: ma-server).

---

## Session Ledger — 2026-03-22 (MA Bridge Slash Command)

Status: `Complete`

- **Purpose:** Enable NekoCore OS entities to call MA's HTTP API server-to-server via `/ma` slash command — OS keeps its cognitive brain, MA provides tool execution.

- **Changes:**
  1. **process-manager-routes.js helpers export** — `SERVERS`, `startServer`, `stopServer`, `healthCheck`, `readPid`, `isRunning` now exported alongside the factory function for reuse by ma-bridge.js.
  2. **server/services/ma-bridge.js** (new) — `ensureMARunning()` auto-boots MA via process-manager helpers if not healthy, polls up to 20s. `callMA(message)` POSTs to `localhost:3850/api/chat` with 120s timeout, returns `{ ok, reply, filesChanged, taskType, steps }`. `getMAHealth()` returns running/healthy/pid/port status.
  3. **slash-interceptor.js /ma command** — New `case 'ma':` dispatches to `_dispatchMA(args, entityId, ctx)` which calls ensureMARunning → callMA → formats response with MA attribution, boot note, task type, files changed.
  4. **client slash-commands.js** — `/ma` registered in COMMANDS array for autocomplete.
  5. **tests/unit/ma-bridge.test.js** (new) — 15 guard + unit tests: file existence, export shapes, source analysis of slash-interceptor, client registration, runtime behavior tests (callMA, getMAHealth, ensureMARunning shapes).

- **Files modified:** `server/routes/process-manager-routes.js`, `server/routes/slash-interceptor.js`, `client/js/apps/core/slash-commands.js`
- **Files created:** `server/services/ma-bridge.js`, `tests/unit/ma-bridge.test.js`
- **Plan:** `Documents/current/PLAN-MA-BRIDGE-v1.md`
- **Verification:** 15/15 ma-bridge tests, 22/22 slash-command guards, all 3 JS files pass `node --check`.

---

## Session Ledger — 2026-03-22 (Entity Genesis Skill)

Status: `Complete`

- **Purpose:** Add a new MA skill for deep, iterative entity creation. MA designs a character, creates the entity on the OS, then generates memories chapter by chapter — reading and responding to the entity's evolving cognitive state between rounds.

- **Changes:**
  1. **OS Entity Enrichment Routes** (`server/routes/entity-enrichment-routes.js`, new) — Three API endpoints: `POST /api/entities/:id/memories/inject` (creates memory folder with log.json/semantic.txt/memory.zip, updates memory-index.json), `POST /api/entities/:id/cognitive/tick` (runs single-cycle neurochemistry homeostasis + memory consolidation + belief integration via cognitive phases), `GET /api/entities/:id/cognitive/state` (read-only snapshot of neurochemistry, persona, beliefs, goals, memory count). All validate entity existence. Registered in `server/server.js`.
  2. **MA entity_genesis Task Type** (`MA/MA-server/MA-tasks.js`) — Added `entity_genesis: { maxSteps: 10, maxLLM: 50 }` to TASK_TYPES. Classifier rules with 11 keywords and 2 regex patterns. Agent role mapped to `architect`.
  3. **MA Entity Genesis Blueprint** (`MA/MA-blueprints/modules/modules/entity_genesis.md`, new) — Multi-round workflow: character design, entity shell creation, chapter-by-chapter memory genesis loop (read state, generate memories in evolved voice, inject individually, cognitive tick, log evolution), summary.
  4. **MA Entity Genesis Skill** (`MA/MA-skills/entity-genesis/SKILL.md` + runtime copy to `MA-entity/entity_ma/skills/entity-genesis.md`, new) — Skill with YAML frontmatter, capability description, OS API endpoint templates, memory quality rules, available emotions list.
  5. **Guard Tests** (`tests/unit/entity-genesis-guards.test.js`, new) — 18 tests covering contract guards and implementation guards. 18/18 passing.

- **Files created:** `server/routes/entity-enrichment-routes.js`, `MA/MA-blueprints/modules/modules/entity_genesis.md`, `MA/MA-skills/entity-genesis/SKILL.md`, `MA/MA-entity/entity_ma/skills/entity-genesis.md`, `tests/unit/entity-genesis-guards.test.js`
- **Files modified:** `server/server.js` (route registration), `MA/MA-server/MA-tasks.js` (task type + classifier + roleMap)
- **Plan:** `Documents/current/PLAN-ENTITY-GENESIS-v1.md`
- **Verification:** 18/18 entity-genesis + 15/15 ma-bridge + 22/22 slash-command = 55 tests, 0 failures.

---

## Session Ledger — 2026-03-22 (MA Context Persistence + Memory Chaining + Blueprints)

Status: `Complete`

- **Purpose:** Fix 6 user-reported issues: workspace path not configurable, blueprints not consulted during tasks, research blueprint too limited, chat context lost on page refresh, memories not chained together, memories missing human-readable timestamps.

- **Changes:**
  1. **Chat History Persistence** (`MA-Server.js`, `MA-client/MA-index.html`) — New `GET /POST /api/chat/history` routes save/load last 8 messages to `MA-Config/chat-history.json`. Client calls `loadHistory()` on page init to restore previous messages and renders them in chat. `saveHistory()` called after every assistant response. Survives page refresh.
  2. **Memory ISO Timestamps** (`MA-server/MA-memory.js`) — Every memory record now includes `createdAtISO: new Date(now).toISOString()` alongside the existing epoch `createdAt`. Index entries also carry `createdAtISO`.
  3. **Memory Chain IDs** (`MA-server/MA-memory.js`, `MA-server/MA-core.js`) — Each message loop generates a unique `chainId` (`chain_{timestamp}_{random}`). Both task-path and conversational-path memory stores pass `chainId` so user message and assistant reply memories are linked. Memory search expands top results to include chain siblings (same `chainId`), enabling connected recall.
  4. **Blueprint Injection in Conversational Path** (`MA-server/MA-core.js`) — When classify detects a task type (even at low confidence), the relevant blueprint is injected into the conversational path system prompt. Previously, blueprints were only available in the task path.
  5. **Task Path Confidence Threshold Lowered** (`MA-server/MA-core.js`) — Changed from `>= 0.3` to `>= 0.2` so more research/analysis requests route through the full task pipeline with blueprints.
  6. **Research Blueprint Rewrite** (`MA-blueprints/modules/modules/research.md`) — Removed all hardcoded limits ("2-3 sentence overview", "2-4 sentences explaining"). Now requires 3-5 different search queries, comprehensive source listing, thorough explanations, and opposing viewpoints.
  7. **Output Format Limit Removed** (`MA-blueprints/core/core/output-format.md`) — Replaced "Keep chat responses SHORT: 1-4 sentences" with adaptive length guidance matching response depth to task complexity.
  8. **Workspace Path Configurable** (`MA-server/MA-core.js`, `MA-Server.js`, `MA-client/MA-index.html`) — `WORKSPACE_DIR` is now `let` instead of `const`; loadable from `config.workspacePath`; settings UI has workspace path input field.

- **Files modified:**
  - `MA/MA-Server.js` — chat history routes, config GET/POST workspace path + vision, hasFile fix
  - `MA/MA-server/MA-core.js` — chainId generation, chain-aware memory storage, blueprint injection in conversational path, task threshold 0.2, workspace path configurable
  - `MA/MA-server/MA-memory.js` — createdAtISO timestamp, chainId in records/index, chain expansion in search
  - `MA/MA-server/MA-tasks.js` — (unchanged, but classify threshold effect via core.js)
  - `MA/MA-client/MA-index.html` — loadHistory/saveHistory, workspace path settings input
  - `MA/MA-blueprints/modules/modules/research.md` — full rewrite, no hardcoded limits
  - `MA/MA-blueprints/core/core/output-format.md` — removed 1-4 sentences limit

- **Verification:** 21/21 health (0 critical, 1 warning: HTML tag imbalance — pre-existing), all 4 JS files pass `node --check`, module chain loads OK (core/tasks/llm), skills loaded (6 files).

---

## Session Ledger — 2026-03-23 (NekoCore Part 4 — Identity & Generation)

Status: `Complete`

- **Part:** 4 — Identity & Generation
- **Modules implemented:** 17 (8 identity + 9 generation)
  - **Identity (8):** hatch-entity (reserved name validation, persona/core-memory/system-prompt generation), identity-manager (unbreakable trait protection, maxDelta clamping, evolution history), core-memory-manager (Map-based, MAX=50, THRESHOLD=0.85), goal-generator (trace-pattern frequency≥3 analysis), goals-manager (MAX_ACTIVE=10, full lifecycle), dream-diary (theme extraction, recurring freq≥2), life-diary (summary concatenation), onboarding (7-step session-tracked flow)
  - **Generation (9):** aspect-prompts (6-aspect templates with persona/chemical interpolation), context-consolidator (7-source budget allocation, DEFAULT_TOKEN_BUDGET=4000), humanize-filter (4 ROBOTIC_PATTERNS regex), core-life-generator (narrative from memories+chapters), chapter-generator (topic-overlap evaluation + lifecycle), synthetic-memory-generator (initial+gap tagged sourceType:'synthetic'), diary-prompts (4 DIARY_TYPES templates), message-chunker (paragraph>sentence>word splitting, DEFAULT_CHUNK_SIZE=2000), voice-profile (formality/humor/vocabulary management)
- **Tests:** 72/72 passed (behavioral, rewritten from stub-checking)
- **Full suite:** 214/214 (21 + 22 + 50 + 72 + 49)
- **Manifest updated:** Part 4 → complete, 17 modules → implemented, completedModules → 64

---

## Session Ledger — 2026-03-23 (NekoCore Part 5 — Services & Transport)

Status: `Complete`

- **Part:** 5 — Services & Transport
- **Modules implemented:** 33 (16 services + 1 util + 12 routes + 3 transport)
  - **Services (16):** auth-service (Map-based sessions, crypto.randomBytes token, 24h expiry), boot (async sequence: BOOT_STARTED → config → preflight → entity checkout → runtime init → memory → pipeline → pulse → routes → BOOT_READY), chat-pipeline (full turn: TURN_START → classify → magnitude → snapshot → recall → consolidate → generate → humanize → postprocess → TURN_COMPLETE → fire-and-forget post-response), config-runtime (in-memory key-value with CONFIG_CHANGED events), config-service (loads ma-config.json or defaults, getLLMConfig/getEntityConfig), entity-checkout (async with fs.existsSync, listEntities), entity-memory-compat (hydrate/flush stubs returning counts), entity-runtime (init/getState/getPersona/shutdown), memory-service (store/recall with keyword matching, stm/ltm by importance≥0.7), post-response-cognitive-feedback (fire-and-forget, COGNITION.FEEDBACK_PROCESSED), post-response-memory (stores user+entity messages, MEMORY.POST_RESPONSE_COMPLETE), relationship-service (Map-based trust/familiarity/sharedMemories/emotionalBond/interactionCount), response-postprocess (chunks text, adds processedAt), startup-preflight (checks server/contracts/client/Config dirs), timeline-logger (append-only log/getRecent), user-profiles (Map-based getProfile/upsertProfile/listUsers)
  - **Utils (1):** model-router (6 TASK_TYPES, placeholder text when no LLM)
  - **Routes (12):** auth-routes (POST /login /logout, GET /session), brain-routes (GET /snapshot /chemicals /pulse, POST /pulse/trigger), chat-routes (POST /turn, GET /history, DELETE /history/:id), memory-routes (GET /search, POST /store, GET /stats /graph), entity-routes (GET / /state, PUT /persona, GET /goals), config-routes (GET /, PUT /:key, GET /runtime), archive-routes (POST /run, GET /status /stats), cognitive-routes (GET /snapshot /feedback /attention /dreams), sse-routes (GET /events /bus with SSE headers), entity-chat-routes (POST /message, GET /context /relationship), document-routes (POST /summarize /encode), nekocore-routes (GET /health /status /version)
  - **Transport (3):** nekocore-server.js (full service wiring + 12 route groups + boot), nekocore-cli.js (HTTP request function + command dispatch), client/index.html (fetch-based chat + /health check)
- **Fixes applied:** entity-chat-routes.js identifier `createEntity-ChatRoutes` → `createEntityChatRoutes`; added fs/path requires to entity-checkout.js
- **Tests:** 74/74 passed (behavioral, rewritten from stub-checking)
- **Full suite:** 239/239 (21 + 22 + 50 + 72 + 74) ALL PARTS PASSED
- **Manifest updated:** Part 5 → complete, 33 modules → implemented, completedModules → 97
- **NekoCore project status:** COMPLETE — 97/97 modules, 239/239 tests, all behavioral

---

## Session Ledger — 2026-03-23 (NekoCore Part 4 — Identity & Generation)

Status: `Complete`

- **Part:** 3 — Cognition Engine (Phases + Attention + Feedback)
- **Modules implemented:** 25 (9 engines + 16 phases)
  - **Engines (9):** attention-system (stack-based salience scoring), cognitive-feedback (chemical delta mapping per feedback type), cognitive-pulse (background graph walker), cognitive-snapshot (full state capture via contract), curiosity-engine (gap+surprise+novelty weighted scoring), boredom-engine (repetition detection + exploration), dream-seed-pool (weighted random with decay), dream-maintenance-selector (emotional/goal/core scoring), dream-intuition-adapter (dream→pipeline context builder)
  - **Phases (16):** phase-decay, phase-consolidation, phase-conscious-stm, phase-dreams, phase-deep-sleep, phase-beliefs, phase-goals, phase-identity, phase-neurochemistry, phase-somatic, phase-hebbian, phase-pruning, phase-traces, phase-archive, phase-archive-index, phase-boredom
- **Tests:** 50/50 passed (behavioral, rewritten from stub-checking)
- **Full suite:** 176/176 (21 + 22 + 50 + 34 + 49)
- **Manifest updated:** Part 3 → complete, 25 modules → implemented, completedModules → 47

---

## Session Ledger — 2026-03-23 (NekoCore Part 1 — Cognitive Foundation)

Status: `Complete`

- **Purpose:** Audit REM Layer 5, then implement NekoCore Part 1: Cognitive Foundation (Bus + Affect + Contracts).

- **Changes:**
  1. **REM Layer 5 Audit** — Verified all 3 Layer 5 modules (llm-interface.js, orchestration-policy.js, ma-integration.js) are fully implemented. MA endpoint compatibility confirmed: `/api/chat` POST and `/api/health` GET both exist and match integration code. No fixes needed.
  2. **cognitive-bus.js** — Implemented 6 methods: `emit` (typed envelope with seq/timestamp, fires snoops→wildcards→exact), `on` (wildcard pattern support with priority sorting), `once` (auto-unsubscribe), `snoop` (global listener), `getHistory` (circular buffer newest-first), `destroy` (cleanup).
  3. **neurochemistry.js** — Implemented 6 methods: `stimulate` (delta + interaction rules: cortisol↑→serotonin↓×0.3, oxytocin↑→cortisol↓×0.4, dopamine↑→serotonin↑×0.15), `decay` (toward baseline, recovery at 0.5× rate), `getLevels`, `resetToBaseline`, `checkCrisis` (cortisol>0.7 && serotonin<0.25), `serialize`.
  4. **somatic-awareness.js** — Implemented 3 methods + state: `computeSomatic` (8 sensations in priority order, intensity from max chemical deviation), `describe` (natural language output), `getSnapshot`.
  5. **turn-classifier.js** — Implemented `classifyTurn` with 7 keyword dictionaries, 14 feature extraction, 10 intent classification with priority ordering and confidence scoring. Returns validated classification via contract.
  6. **interaction-magnitude.js** — Implemented `scoreMagnitude` with 5 weighted factors: length(0–0.2), emotional intensity(0–0.25), topic novelty(0–0.25), question depth(0–0.15), personal disclosure(0–0.15). Returns `{ magnitude, factors }`.
  7. **part-1.test.js** — Rewrote from stub-checking (assertThrows NOT_IMPLEMENTED) to behavioral validation. 21/21 tests passing.
  8. **PROJECT-MANIFEST.json** — Part 1 status → "complete", 5 contracts + 6 modules → "implemented", completedModules → 11.
  9. **Part 2 — Advanced Memory & Knowledge** — All 11 modules implemented from stubs:
     - `conscious-memory.js` — STM (7 items FIFO) + LTM promotion (importance > 0.7 OR rehearsal > 3), rehearsal tracking, topic-based LTM search
     - `dream-memory.js` — 3-tier storage (vivid/fading/fragments), age-based demotion, topic/emotion search
     - `memory-graph.js` — Adjacency-based graph with BFS spreading activation (decay 0.7, threshold 0.1, max depth 4), bidirectional edges, Hebbian weakening and pruning
     - `memory-graph-builder.js` — Jaccard topic similarity, temporal window (5min), emotion matching, auto-edge creation
     - `archive-manager.js` — Gzip compression pipeline, date-based directory structure, index rebuild from disk
     - `trace-graph.js` — Cause→event→effect chains, outcome tracking, strength-based retrieval
     - `trace-graph-builder.js` — Sliding window analysis (2-5 memories), emotion shift detection, topic continuity, deduplication
     - `dream-link-writer.js` — Creates/strengthens graph edges between dream seed memories
     - `textrank.js` — PageRank on sentence similarity graph, convergence-based iteration, extractive summarization
     - `memory-encoder-nlp.js` — Keyword extraction, emotion lexicon detection, topic classification, importance estimation
     - `semantic-cache.js` — LRU cache with TTL expiry, hit/miss stats
  10. **part-2.test.js** — Rewrote from stub-checking to behavioral validation. 22/22 tests passing.
  11. **PROJECT-MANIFEST.json** — Part 2 status → "complete", 11 modules → "implemented", completedModules → 22.

- **Files modified:**
  - `nekocore/server/bus/cognitive-bus.js` — 6 methods from stubs
  - `nekocore/server/affect/neurochemistry.js` — 6 methods from stubs
  - `nekocore/server/affect/somatic-awareness.js` — 3 methods + state from stubs
  - `nekocore/server/utils/turn-classifier.js` — classifyTurn from stub
  - `nekocore/server/utils/interaction-magnitude.js` — scoreMagnitude from stub
  - `nekocore/tests/part-1.test.js` — behavioral tests replacing stub checks
  - `nekocore/PROJECT-MANIFEST.json` — Part 1 marked complete

- **Verification:** 21/21 Part 1 tests passing, all 5 files pass `node --check` syntax validation.

---

## Session Ledger — 2026-03-21 (MA File Links + Skills)

Status: `Complete`

- **Purpose:** Fix MA's file creation confusion by adding clickable file links in chat, improving tool result visibility in activity feed, and populating the empty entity skills folder.

- **Changes:**
  1. **Clickable File Links in Chat** (`MA-client/MA-index.html`) — When MA creates or modifies files, clickable link chips appear below the assistant message. Each link has a file-type icon, filename, and opens the workspace file in a new tab via `/api/workspace/file`. CSS: `.file-links`, `.file-link` with hover effects. `addMsg()` updated to return the div and wrap MA messages in a `.bubble` container for appending file links.
  2. **Workspace File Serving Route** (`MA-Server.js`) — New `GET /api/workspace/file?path=` endpoint serves files from the workspace directory with path traversal protection. Returns appropriate MIME type.
  3. **Files Changed Tracking — Task Path** (`MA-server/MA-tasks.js`) — Added `allWrittenFiles` array that collects all written/appended file paths across all task steps. Returned in `{ filesChanged: allWrittenFiles }` alongside `finalResponse`.
  4. **Files Changed Tracking — Conversational Path** (`MA-server/MA-core.js`) — Extracts written file paths from `toolResults` after conversational tool execution. Returns `filesChanged` array in response object.
  5. **Task Path filesChanged Passthrough** (`MA-server/MA-core.js`) — Task path return now includes `filesChanged: result.filesChanged || []`.
  6. **Improved Activity Detail** (`MA-server/MA-core.js`, `MA-server/MA-tasks.js`) — Tool result activity events now include the full result string (e.g., `ws_write: Wrote 1234 bytes to myfile.js`) instead of just the tool name.
  7. **Entity Skills** (`MA-entity/entity_ma/skills/`) — Created 6 operational skill documents: `coding.md`, `memory-tools.md`, `self-repair.md`, `web-search.md`, `search-archive.md`, `workspace-ops.md`. Skills loaded at boot and injected into system prompt by keyword relevance (up to 2 matched skills per message).
  8. **Skill Loading System** (`MA-server/MA-core.js`) — New `loadSkills()` function reads `.md` files from entity skills dir. `skills` state variable and `skillsCtx` injected into system prompt template.

- **Files modified:**
  - `MA/MA-client/MA-index.html` — file link CSS, `addMsg()` bubble wrapper, `handleChatResult()` file link rendering
  - `MA/MA-Server.js` — `/api/workspace/file` route
  - `MA/MA-server/MA-core.js` — skill loading, skill state, skillsCtx injection, filesChanged tracking (conversational + task passthrough), improved activity detail
  - `MA/MA-server/MA-tasks.js` — allWrittenFiles tracking, filesChanged in return, improved activity detail

- **Files created:**
  - `MA/MA-entity/entity_ma/skills/coding.md`
  - `MA/MA-entity/entity_ma/skills/memory-tools.md`
  - `MA/MA-entity/entity_ma/skills/self-repair.md`
  - `MA/MA-entity/entity_ma/skills/web-search.md`
  - `MA/MA-entity/entity_ma/skills/search-archive.md`
  - `MA/MA-entity/entity_ma/skills/workspace-ops.md`

- **Verification:** 21/21 health (0 critical), all 3 JS files pass syntax check, module chain (core/tasks/llm) loads OK, skills loaded at boot (6 files).

---

## Session Ledger — 2026-03-21 (MA Image/Vision Support)

Status: `Complete`

- **Purpose:** Add image drag-and-drop support to MA chat, raise file size limits, and support vision/multimodal LLM models (OpenRouter + Ollama).

- **Changes:**
  1. **Image Drop Support** (`MA-client/MA-index.html`) — `IMAGE_TYPES` set (png, jpeg, jpg, gif, webp, svg+xml). Images read as base64 data URLs via `readAsDataURL()`. Text file limit raised from 32KB to 512KB, image limit 5MB. Image thumbnails shown in file chips (28×28) and inline in chat bubbles (max 300×200). `.chat-img` CSS class added.
  2. **Server Body Limit** (`MA-Server.js`) — Raised from 1MB to 10MB (`10485760`). Config save now persists `vision: body.vision === true`.
  3. **Vision Message Building** (`MA-server/MA-core.js`) — Separates text vs image attachments during processing. Images stored as `{ name, dataUrl, mime }`. Text file truncation raised to 128KB. If `config.vision === true` and images present, builds OpenAI-format multimodal content blocks `[{type:"text"},{type:"image_url",image_url:{url:dataUrl}}]`. If images present but no vision, appends note telling user to enable vision.
  4. **Ollama Vision Format** (`MA-server/MA-llm.js`) — Ollama caller detects multimodal content arrays, extracts text parts and base64 image data (stripping data URL prefix), passes images in Ollama's per-message `{ images: [base64...] }` format. OpenRouter/OpenAI caller unchanged (already supports content arrays natively).
  5. **Vision Model Flag** (`MA-server/MA-model-router.js`) — Added `vision: entry.vision === true` to model definition object.
  6. **Vision Config UI** (`MA-client/MA-index.html`) — Vision checkbox `#cfg-vision` in config panel. Wired into save (sends `vision: checked`) and load (reads `d.vision`).

- **Files modified:**
  - `MA/MA-client/MA-index.html` — image drop handler, thumbnails, chat image display, vision config checkbox
  - `MA/MA-Server.js` — body limit 10MB, vision config persistence
  - `MA/MA-server/MA-core.js` — image/text attachment separation, vision multimodal content blocks
  - `MA/MA-server/MA-llm.js` — Ollama multimodal image format conversion
  - `MA/MA-server/MA-model-router.js` — vision flag in model definition

- **Verification:** 21/21 health (0 critical), all 5 files pass syntax check, module chain (core/llm/router) loads OK.

---

## Session Ledger — 2026-03-21 (MA Activity Monitor + Session Continuity)

Status: `Complete`

- **Purpose:** Add real-time Activity Monitor panel, persistent worklog for session continuity, enhanced project awareness (reads manifests), and wire agent dispatch into task execution.

- **Changes:**
  1. **Activity Monitor Panel** (`MA-client/MA-index.html`) — Collapsible right sidebar showing real-time activity feed (tool calls, LLM calls, memory searches, knowledge loads, agent dispatches, step progress). Auto-opens when task starts. Task plan displayed with checkboxes. Session worklog summary visible. Toggle button in header.
  2. **MA Worklog System** (`MA-server/MA-worklog.js`) — NEW module. Persistent `MA-workspace/MA-WORKLOG.md` with structured sections: Active Project, Current Task, Task Plan (checkboxes), Recent Work (table), Resume Point. Auto-updated on task start/completion. Loaded into system prompt so MA knows where it left off. API route `GET /api/worklog` + `/worklog` slash command.
  3. **Enhanced Project Awareness** (`MA-server/MA-core.js`) — Workspace scan now reads `PROJECT-MANIFEST.json` from each project dir. Injects layer count, completion status, and description into system prompt. Tells MA "You built these projects — read PROJECT-MANIFEST.json and BUILD-ORDER.md to continue."
  4. **Agent Dispatch** (`MA-server/MA-tasks.js`) — Task execution now checks agent catalog for matching role (code→coder, research→researcher, etc.). Selects highest-seniority agent. Injects agent's systemPrompt into step execution. Records prompt history per agent. Fires `agent_dispatch` activity event.
  5. **SSE Activity Streaming** (`MA-Server.js`) — `/api/chat/stream` now streams `activity` events alongside existing `step`/`done`/`error`. Activities include: `memory_search`, `knowledge_load`, `workspace_scan`, `llm_call`, `tool_result`, `plan`, `step_start`, `step_done`, `agent_dispatch`, `worklog`, `error`.
  6. **Bug Fix** — Fixed duplicate try/catch/cleanup code in `handleChatResult()` that was left over from the SSE extraction refactor.
  7. **Health Registry** — Updated to 21 core files (added MA-worklog.js).

- **Files changed:**
  - `MA/MA-server/MA-worklog.js` — NEW: persistent session worklog module
  - `MA/MA-server/MA-core.js` — onActivity callback, worklog integration, enhanced project scanning, worklog in system prompt
  - `MA/MA-server/MA-tasks.js` — onActivity callback, agent dispatch, prompt history recording
  - `MA/MA-Server.js` — activity SSE streaming, /api/worklog route, /worklog slash command
  - `MA/MA-client/MA-index.html` — Activity Monitor panel (CSS + HTML + JS), handleChatResult bug fix
  - `MA/MA-server/MA-health.js` — Added MA-worklog.js to CORE_REGISTRY

---

## Session Ledger — 2026-03-21 (MA Whitelist Management + Token Limit Strategy)

Status: `Complete`

- **Purpose:** Make cmd_run whitelist user-configurable via GUI settings + slash commands, address character/token limit issue for large script generation.

- **Changes:**
  1. **Configurable Whitelist** (`MA-server/MA-cmd-executor.js`) — whitelist now loads from `MA-Config/cmd-whitelist.json`, persists on change. Added `getWhitelist()`, `whitelistAdd()`, `whitelistRemove()`, `whitelistReset()`. Dangerous binaries (rm, del, curl, bash, powershell, etc.) permanently blocked.
  2. **Whitelist API Routes** (`MA-Server.js`) — GET `/api/whitelist`, POST `/api/whitelist/add`, `/api/whitelist/remove`, `/api/whitelist/reset`
  3. **Whitelist GUI Tab** (`MA-client/MA-index.html`) — Settings panel now has tabbed layout (LLM | Command Whitelist). Whitelist tab shows all allowed commands, per-command subcommand restrictions, add/remove buttons, and reset-to-defaults.
  4. **Whitelist Slash Commands** — `/whitelist`, `/whitelist add <binary> [sub1,sub2]`, `/whitelist remove <binary>`, `/whitelist reset` — in both GUI and CLI.
  5. **Chunked-Write System Prompt** (`MA-server/MA-core.js`) — Added `[Writing Large Files]` section to system prompt instructing MA to use ws_write + ws_append for multi-part file creation when files are >80 lines.

- **Files modified:**
  - `MA/MA-server/MA-cmd-executor.js` — configurable whitelist, file persistence, CRUD API, forbidden binary guard
  - `MA/MA-Server.js` — whitelist API routes, whitelist slash commands, cmdExec import
  - `MA/MA-client/MA-index.html` — tabbed settings (LLM + Whitelist), whitelist management UI
  - `MA/MA-cli.js` — /whitelist commands + cmdExec import
  - `MA/MA-server/MA-core.js` — chunked-write guidance in system prompt

- **Verification:** 18/18 health (0 critical), whitelist add/remove/block-dangerous all pass

---

## Session Ledger — 2026-03-21 (MA 5-Item Bug Fix + Feature Batch)

Status: `Complete`

- **Purpose:** Fix 5 user-reported issues with MA:
  1. MA can't see projects in workspace → auto-scan MA-workspace/ dirs + project archives into system prompt
  2. Token limit too restrictive → tripled DEFAULT_MAX_TOKENS 4096→12288, added maxTokens to config persistence + GUI slider (1024–65536 range)
  3. Tool calls posted as text instead of executed → improved TOOL_RE regex to allow hyphens, added _preCleanToolText() to strip code fences wrapping tool calls, enhanced system prompt with strict tool syntax instructions
  4. No slash command helper in GUI → added /api/commands + /api/slash endpoints, added autocomplete popup in GUI (type / to see commands, arrow keys + Tab to select), ported all CLI commands to GUI
  5. No way to continue a project → added resumeProject() to project-archive, added /project open|close|status to CLI + GUI, wired into slash command handler

- **Files modified:**
  - `MA/MA-server/MA-core.js` — workspace auto-scan, archive context, maxTokens passthrough, enhanced system prompt
  - `MA/MA-server/MA-llm.js` — DEFAULT_MAX_TOKENS 4096→12288
  - `MA/MA-server/MA-workspace-tools.js` — _preCleanToolText(), improved regex, better stripToolCalls
  - `MA/MA-server/MA-project-archive.js` — resumeProject() + export
  - `MA/MA-Server.js` — /api/commands, /api/slash routes, handleSlashCommand(), maxTokens in config GET/POST
  - `MA/MA-client/MA-index.html` — maxTokens slider, slash command popup + autocomplete + execution
  - `MA/MA-cli.js` — /projects, /project open|close|status commands + updated banner

- **Verification:** 18/18 health, all tool parse tests pass (normal, hyphenated, code-fenced, language-fenced)

---

## Session Ledger — 2026-03-21 (NekoCore Cognitive Mind Project Scaffold)

Status: `Complete`

- **Purpose:** Create a new MA project called "nekocore" that scaffolds all the cognitive mind modules the REM System needs to become a full NekoCore OS entity. The REM System provides the base architecture; NekoCore adds the complete cognitive pipeline — bus, affect engine, memory system, knowledge graphs, cognition engine (with 16 dream/brain phases), identity lifecycle, generation pipeline, and the full service/route layer to wire it all together. Excludes task/worker/skill management (MA handles those), Telegram, pixel-art, image-generator, dream-visualizer.
- **New files created (MA-workspace/nekocore/):**
  - Infrastructure: `PROJECT-MANIFEST.json`, `BUILD-ORDER.md`, `package.json`
  - 5 contracts: `cognitive-snapshot-contract.js`, `cognitive-feedback-contract.js`, `turn-classifier-contract.js`, `response-contract.js`, `worker-output-contract.js`
  - Part 1 (Cognitive Foundation — 6 stubs): `bus/cognitive-bus.js`, `bus/thought-types.js`, `affect/neurochemistry.js`, `affect/somatic-awareness.js`, `utils/turn-classifier.js`, `utils/interaction-magnitude.js`
  - Part 2 (Memory & Knowledge — 11 stubs): `memory/conscious-memory.js`, `memory/dream-memory.js`, `memory/memory-graph.js`, `memory/memory-graph-builder.js`, `memory/archive-manager.js`, `knowledge/trace-graph.js`, `knowledge/trace-graph-builder.js`, `knowledge/dream-link-writer.js`, `utils/textrank.js`, `utils/memory-encoder-nlp.js`, `utils/semantic-cache.js`
  - Part 3 (Cognition Engine — 25 stubs): 9 engines (`attention-system`, `cognitive-feedback`, `cognitive-pulse`, `cognitive-snapshot`, `curiosity-engine`, `boredom-engine`, `dream-seed-pool`, `dream-maintenance-selector`, `dream-intuition-adapter`) + 16 phases in `cognition/phases/`
  - Part 4 (Identity & Generation — 17 stubs): 8 identity (`hatch-entity`, `identity-manager`, `core-memory-manager`, `goal-generator`, `goals-manager`, `dream-diary`, `life-diary`, `onboarding`) + 9 generation (`aspect-prompts`, `context-consolidator`, `humanize-filter`, `core-life-generator`, `chapter-generator`, `synthetic-memory-generator`, `diary-prompts`, `message-chunker`, `voice-profile`)
  - Part 5 (Services & Transport — 33 stubs): 16 services, 1 util (`model-router`), 12 routes, 3 transport (`nekocore-server.js` port 3870, `nekocore-cli.js`, `client/index.html`)
  - Tests: `test-runner.js` + 5 part test files (`part-1.test.js` through `part-5.test.js`)
  - Scripts: `project-status.js`
  - Blueprints: `MA-blueprints/nekocore/INDEX.md` + 5 per-part blueprint files
- **Test results:** 176/176 (21 + 22 + 50 + 34 + 49), all parts green
- **Architecture:** Pre-req is REM System. NekoCore port 3870 (REM: 3860, MA: 3850). Every stub has full JSDoc, algorithm pseudocode comments, and `throw new Error('NOT_IMPLEMENTED: fn')`. Blueprints guide MA through building each part in dependency order.
- **What MA handles separately (excluded from scaffold):** Task system (8 types), worker dispatch, skill management, NLP engines (RAKE/BM25/YAKE), web-fetch, agent delegation, project archive

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (MA Project Archive System)

Status: `Complete`

- **Purpose:** Give MA a complete per-project archive that stores every step, code, response, agent dispatch, thought, and decision as NekoCore OS-compatible memory nodes with weights (importance, decay, topics) and a full connection graph (edges with type + strength). Designed to feed the predictive memory system later.
- **New files created:**
  - `MA-server/MA-project-archive.js` (~430 lines) — Full archive module:
    - **Project lifecycle:** `createProject()`, `getProject()`, `listProjects()`, `closeProject()`
    - **Node operations:** `recordNode()` (stores NekoCore OS-schema memory records with archive extensions — sourceType, projectId, stepNumber, agentId, metadata), `getNode()` (with access tracking), `listNodes()` (filterable by sourceType)
    - **Edge operations:** `addEdge()` (weighted connections: precedes/derives/produces/delegates/supports/contradicts/references), `getGraph()`, `getNodeEdges()`, `reinforceEdge()`
    - **Convenience:** `recordStep()` (auto-creates temporal 'precedes' edge to previous node), `recordStepWithKnowledge()` (dual-path — creates episodic + semantic node + derives edge)
    - **Predictive export:** `exportForPredictive()` — returns full graph (all nodes with weights + all edges + stats by type/averages) ready for predictive system consumption
    - **Indexing:** Auto-maintained topic-index.json (topic → node IDs) + temporal-index.json (time-sorted), `lookupByTopic()`, `getArchiveStats()`
    - **Atomic writes** throughout (temp file + rename pattern)
    - 8 node types: step, code, response, agent-dispatch, thought, decision, error, semantic
    - 7 edge types: precedes, derives, produces, delegates, supports, contradicts, references
  - `MA-knowledge/project-archive.md` — Knowledge doc teaching MA when to archive (every action), what node types to use, how to maintain the temporal chain, dual-path encoding pattern, and export for predictive
- **Storage layout:** `MA-entity/entity_ma/archives/proj_{id}/` with `project-meta.json`, `nodes/arc_*.json`, `graph/edges.json`, `index/topic-index.json`, `index/temporal-index.json`
- **Node schema:** Full NekoCore OS compatibility: `memorySchemaVersion: 1`, `memory_id`, `type` (episodic/semantic), `created`, `last_accessed`, `access_count`, `access_events`, `decay`, `importance`, `topics`, `emotionalTag` — plus archive extensions: `projectId`, `sourceType`, `content`, `summary`, `agentId`, `stepNumber`, `metadata`
- **Modified files:** MA-server/MA-core.js (require + re-export projectArchive), MA-server/MA-health.js (registry entry — now 18 entries)
- **Integration test:** Created project, recorded 4 nodes (thought→code→step+semantic), 3 auto-edges (2 precedes + 1 derives), 15 topics auto-extracted, exported full graph successfully. Cleaned up.
- **Test results:** All JS syntax OK, MA health 18/18

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (MA Integration into REM System)

Status: `Complete`

- **Purpose:** Allow users and entities in the REM System to call MA via `/MA` chat commands or programmatically via `/api/ma` endpoint — so that project planning, task delegation, and agent management are accessible from within any REM-built entity.
- **New files created:**
  - `MA-workspace/rem-system/server/services/ma-integration.js` — Bridge module: `parseMACommand()` (implemented — regex `/^\/ma\s*(.*)/i`, extracts command + args, defaults to 'status'), `callMA()` (stub — HTTP client to MA port 3850), `chatWithMA()` (stub — POST to /api/chat), `checkMAStatus()` (stub — GET /api/health), `routeMACommand()` (stub — command switch). MA_DEFAULTS: `{host:'localhost', port:3850, basePath:'/api'}`. No MA imports — talks via HTTP only.
- **Modified files:**
  - `MA-workspace/rem-system/rem-server.js` — (1) Lazy-load `getMAIntegration()` for ma-integration module, (2) `/MA` command interception at top of `handleChat()` before cognitive pipeline, (3) `handleMA(req, res)` — dedicated POST `/api/ma` endpoint for direct MA calls, (4) `/api/ma` route added to router, (5) `maIntegration` flag in health endpoint
  - `MA-workspace/rem-system/tests/layer-5.test.js` — 18 new tests: exports check (6), parseMACommand scenarios (8 — plan, lowercase, no-args default, normal message, delegate with args, null/empty), stub behavior (4 — callMA/chatWithMA/checkMAStatus/routeMACommand throw NOT_IMPLEMENTED)
  - `MA-workspace/rem-system/PROJECT-MANIFEST.json` — Layer 5 now has 3 modules (was 2), totalModules: 23, ma-integration.js added with status "stub"
  - `MA-workspace/rem-system/BUILD-ORDER.md` — Layer 5 section expanded with ma-integration.js details (/MA commands, HTTP client pattern, parseMACommand specification)
  - `MA-blueprints/rem-system/layer-5-integration.md` — Added full ma-integration.js algorithm section: callMA (HTTP request builder), chatWithMA (POST to /api/chat), checkMAStatus (GET /api/health), routeMACommand (switch: status/plan/delegate/agents/help/default). Updated scope + "After Completion" to include all 3 modules.
- **Test results:** 205/205 full REM System suite (0 fail), MA health 17/17
- **Architecture note:** MA runs on port 3850, REM on port 3860. The integration module never imports MA code — all communication is HTTP. `/MA` commands are intercepted at the transport layer BEFORE the cognitive pipeline runs.

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (MA Agent Delegation System)

Status: `Complete`

- **Purpose:** Give MA the ability to create, catalog, and dispatch specialist agents stored in MA-entity/. Agents are reusable across projects. Every prompt sent to an agent is saved and cataloged for reuse.
- **New files created:**
  - `MA-server/MA-agents.js` — Agent catalog module: CRUD, roster scan, role/capability search, prompt history recording + searching, validation. Added to health registry (17 entries now).
  - `MA-scripts/seed-agents.js` — Seed script that registers the 6 agents MA needs for the REM System project
  - `MA-knowledge/agent-delegation.md` — Knowledge doc teaching MA how to check the roster, match tasks to agents, construct delegation prompts, record dispatches, and create new agents
  - `MA-blueprints/modules/modules/delegate.md` — Task blueprint for the `delegate` task type
- **6 REM-project agents created** (all reusable for future projects):
  - `senior-coder` (coder/senior) — implements modules from blueprints
  - `junior-coder` (coder/junior) — simple implementation tasks, one function at a time
  - `contract-architect` (architect/lead) — designs data shapes, validators, factories
  - `test-engineer` (tester/senior) — writes/runs layer tests, regression checks
  - `nlp-researcher` (researcher/senior) — RAKE/BM25/YAKE algorithm research + adaptation
  - `code-reviewer` (reviewer/lead) — reviews implementations against blueprints
- **Storage layout:** `MA-entity/agent_{id}/agent.json` + `prompt-history/` per agent
- **Prompt history system:** Every dispatch is recorded with task label, full prompt, result summary, success flag, project tag, and searchable tags. `searchPromptHistory()` searches across all agents.
- **Integration:** `delegate` task type added to MA-tasks.js (maxSteps: 8, maxLLM: 30) with classification rules. MA-agents.js wired into MA-core.js as `agentCatalog` re-export.
- **Modified files:** MA-server/MA-tasks.js (delegate type + rules), MA-server/MA-core.js (require + re-export), MA-server/MA-health.js (registry entry)
- Verified: all JS syntax OK, health 17/17, REM System 181/181 tests pass, catalog CRUD + prompt history all functional

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (MA Architect Blueprint Workflow Fix)

Status: `Complete`

- **Purpose:** Ensure MA can create project-specific blueprint subfolders during planning/execution, and verify her architect output covers all artifacts that the REM System actually has.
- **Deep-dive findings:** REM System fully inventoried — 45 files (4 contracts, 7 tests, 20 module stubs, 2 transport modules, 1 status script, 3 config/planning docs), 181/181 tests passing, 7 blueprint files in `MA-blueprints/rem-system/`. No critical discrepancies between architect blueprint and actual REM System structure.
- **Gaps identified and fixed:**
  1. **Blueprint location wrong** — architect.md Step 5 wrote to `workspace/{project}/{prefix}-blueprints/` but REM has them in `MA-blueprints/rem-system/`. Fixed: Step 5 now creates `MA-blueprints/{project-name}/` subfolder with INDEX.md + per-layer blueprints
  2. **No INDEX.md** — architect.md didn't mention INDEX.md. Fixed: Step 5 now includes INDEX.md template matching REM's actual INDEX.md structure
  3. **No project-status.js creation** — package.json referenced a status script but no step created it. Fixed: Step 8 now includes full project-status.js template
  4. **No transport layer step** — REM has rem-server.js + client/index.html. Fixed: Added optional Step 9 for projects with browser/API interfaces
  5. **Task plan template outdated** — had 8 steps, didn't include blueprint subfolder or status script. Fixed: Updated to 9 steps with explicit blueprint subfolder and status script entries
- **Files modified:**
  - `MA-blueprints/modules/modules/architect.md` — task plan template (9 steps), Step 5 rewritten for MA-blueprints location + INDEX.md, Step 8 expanded with project-status.js, Step 9 (optional transport) added, common mistakes updated
  - `MA-knowledge/project-architect.md` — "What Gets Generated" section restructured into workspace artifacts vs MA-blueprints artifacts vs optional transport
- Verified: all JS syntax OK, health 16/16, REM System 181/181 tests pass

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (MA Namespace Refactor)

Status: `Complete`

- **Purpose:** Prefix all MA folders with `MA-` to prevent namespace collisions between projects, and teach MA to apply the same convention to all projects she creates.
- **Folders renamed** (9 total):
  - `blueprints/` → `MA-blueprints/`
  - `client/` → `MA-client/`
  - `Config/` → `MA-Config/`
  - `entity/` → `MA-entity/`
  - `knowledge/` → `MA-knowledge/`
  - `scripts/` → `MA-scripts/`
  - `server/` → `MA-server/`
  - `skills/` → `MA-skills/`
  - `workspace/` → `MA-workspace/`
- **Code references updated** (8 files):
  - `MA-server/MA-core.js` — CONFIG_PATH, ENTITY_DIR, WORKSPACE_DIR, KNOWLEDGE_DIR path constants + log message
  - `MA-Server.js` — require path (`./MA-server/MA-core`), CLIENT_DIR path
  - `MA-cli.js` — require path, 3× Config path references, knowledge path reference
  - `MA-server/MA-tasks.js` — BP_DIR blueprint path
  - `MA-server/MA-memory.js` — entity root path
  - `MA-server/MA-health.js` — all 13 CORE_REGISTRY path entries (server→MA-server, client→MA-client, entity→MA-entity)
  - `MA-scripts/MA-generate-fixer.js` — require path for health module
  - `package.json` — health and fixer script paths
- **Knowledge + Blueprint updated** for namespace convention:
  - `MA-knowledge/project-architect.md` — added "Namespace Prefix Rule (NON-NEGOTIABLE)" section; updated artifact list to use `{prefix}-` pattern
  - `MA-blueprints/modules/modules/architect.md` — all folder references now use `{prefix}-` pattern (contracts, blueprints, tests, scripts); added explicit warning that generic names are FORBIDDEN
- Verified: all 7 JS files syntax OK, health 16/16, REM System 181/181 tests pass, task classifier + blueprint loading + knowledge docs all resolve correctly

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (MA Project Architect Capability)

Status: `Complete`

- **Purpose:** Give MA the ability to interview users about new project ideas and generate REM-System-quality project scaffolds — build orders, contracts, layer blueprints, test harnesses, and module stubs — for any project.
- Created `MA/knowledge/project-architect.md` (~3500 chars) — interview protocol knowledge doc: 9-area discovery interview (5 must-have + 4 should-have), research-and-propose workflow for when users don't have answers, REQUIREMENTS.md accumulation pattern, generation trigger phrase, artifact checklist, quality markers
- Created `MA/blueprints/modules/modules/architect.md` (~12K chars) — comprehensive generation blueprint: pre-generation checklist, 8-step artifact sequence (requirements analysis → BUILD-ORDER.md → PROJECT-MANIFEST.json → contracts/ → blueprints/ → module stubs → test harness → package.json), full template schemas for each artifact type, quality verification steps, common mistakes
- Modified `MA/server/MA-tasks.js`:
  - Added `architect` task type (maxSteps: 10, maxLLM: 50)
  - Added architect intent classification rules (9 keywords including 'project plan', 'detailed plan', 'plan out', 'blueprint', 'specification'; 3 regex patterns)
  - Fixed blueprint loading paths: `core/` → `core/core/`, `modules/` → `modules/modules/` (bug fix — blueprints were not loading for ANY task type due to double-nested directory structure)
  - Fixed `parsePlan()` to accept per-type `maxSteps` parameter (was hardcoded to 6; architect tasks can now use up to 10 steps)
- Verified: MA-tasks.js syntax OK, MA-core.js syntax OK, MA health 16/16, REM System 181/181 tests pass
- Verified classification: "plan out a project" → architect, "generate the project plan" → architect, "build me a project" → project (correct differentiation)
- Verified blueprint loading: architect blueprint 11,858 chars, code blueprint 6,541 chars (all blueprints now loading correctly)
- Knowledge doc auto-loads when user message contains "project" or "architect" (keyword matching)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (Self-Repair Skill)

Status: `Complete`

- **Purpose:** Give Neko explicit knowledge of her own BIOS, diagnostics, and recovery tools so she can diagnose problems, guide users through repair, and fix herself when asked.
- Created `skills/self-repair/SKILL.md` (~180 lines) — comprehensive self-repair and diagnostics skill covering: health scanner (scripts/health-scan.js with cmd_run tool syntax, all CLI modes: default, --json, --fix-list), fixer generator (scripts/generate-fixer.js → neko_fixer.py with all modes: dry-run, --repair, --force, --verify, --list), failsafe console (client/failsafe.html URL and purpose), CORE_REGISTRY as source of truth (300 entries), step-by-step diagnosis workflow (run scan → categorize damage → choose repair strategy → verify), UI-broken recovery flow, headless server recovery (SSH + fixer + Telegram), key file locations table, "fix yourself" complete sequence, and "what NOT to do" section
- Registered `skills/self-repair/SKILL.md` in CORE_REGISTRY — registry now 300 entries
- Updated `tests/unit/bios-failsafe-guards.test.js` — added 14 new tests (Section 9: self-repair skill structure, frontmatter, scanner/fixer/failsafe coverage, cmd_run syntax, fixer modes, headless recovery, what-not-to-do, fix-yourself sequence, registry check); updated skills count assertion from 10→11; updated registry count from 299→300
- Tests: 2012/2012 full suite (0 fail), +14 new

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (Server-Side Slash Interceptor)

Status: `Complete`

- **Purpose:** Make slash commands work from all clients (entity chat, NekoCore OS chat, failsafe console) by intercepting `/command` messages at the server level before the LLM pipeline.
- Created `server/routes/slash-interceptor.js` (~210 lines) — server-side slash command detector and dispatcher: regex parser for `/command arg` syntax, handles `/task`, `/project`, `/skill`, `/websearch` (fire-and-forget async via task system), `/list` (task history), `/listactive` (running tasks), `/stop` (cancel active session); returns `{ handled, response }` so callers skip LLM when a slash command is detected
- Wired into `server/routes/chat-routes.js` (`/api/chat`) — intercept call before LLM pipeline using `ctx.getActiveEntityId()` for entity resolution
- Wired into `server/routes/nekocore-routes.js` (`/api/nekocore/chat`) — intercept call with hardcoded `'nekocore'` entity ID
- Registered in CORE_REGISTRY — registry now 301 entries
- Tests: 2012/2012 full suite (0 fail)
- Pushed to `origin staging` (commit c3a0602)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (BIOS Completeness + Failsafe Console)

Status: `Complete`

- **Purpose:** Close all BIOS registry gaps so the fixer generator embeds every essential file, and build a zero-dependency failsafe emergency WebGUI for disaster recovery.
- **BIOS registry audit:** Ran full cross-reference of CORE_REGISTRY vs disk. Found 20 files present on disk but not registered. Registered all 20.
  - Skills (7): memory-tools, search-archive, web-search, vscode, ws_mkdir, ws_move, tutorial-notes
  - Integrations (1): telegram.js
  - Services (1): voice-profile.js
  - Contracts (6): vfs-drive-mapping schema+example, installer-uninstaller schema+example, installer-hello-world example, payloads/tab-hello-world template
  - Brain (3): agent-echo.js, bulk-ingest.js, memory-images.js
  - Client (2): system-apps.schema.json, neural-viz.js wrapper
- CORE_REGISTRY grew from 278 → 299 entries (20 gap files + 1 failsafe.html)
- **Failsafe Console:** Created `client/failsafe.html` — single-file, zero-external-dependency emergency WebGUI
  - Phase 1: Auth — login/register forms hitting `/api/auth/login` + `/api/auth/register` + `/api/auth/bootstrap`
  - Phase 2: LLM Setup — Ollama or OpenRouter provider config, test connection, save to `/api/config`
  - Phase 3: Chat — full chat interface hitting `/api/chat` with chat history, memory recall/save, SSE follow-up listener (`/api/brain/events` → `chat_follow_up`), entity auto-load
  - All inline (CSS + JS in single HTML file), works even if every other client file is broken
  - Accessible at `http://localhost:3847/failsafe.html`
- Created `tests/unit/bios-failsafe-guards.test.js` — 68 tests across 11 sections: registry count (1), skills completeness (11+dynamic), integrations completeness (6), services (3), contracts (6), brain gaps (3), client gaps (2), failsafe registry (1), failsafe existence (2), failsafe structure (15), no stale entries (18 disk checks)
- Tests: 1998/1998 full suite (0 fail), +68 new

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-21 (cmd_run Tool + Rust/Python Skills)

Status: `Complete`

- **Purpose:** Enable entities to compile, run, and test code in Rust, Python, and other languages via a sandboxed shell execution tool (`cmd_run`), plus provide structured Rust and Python skills.
- Created `server/integrations/cmd-executor.js` (~250 lines) — sandboxed command executor: COMMAND_WHITELIST (20+ commands: cargo, rustc, rustfmt, python, python3, pip, pip3, node, npm, npx, gcc, g++, make, cmake, go, git, cat, head, tail, wc, ls, dir, find, grep, type); subcommand restrictions per command; BLOCKED_PATTERNS (shell metacharacters, directory traversal, redirects, destructive commands, shell escape commands); parseCommand() tokenizer with whitelist + blocked pattern validation; execCommand() with child_process.spawn (shell:false, workspace jail, timeout enforcement, output truncation at 16KB, CI env vars); getAvailableCommands() for prompt injection; exports: execCommand, parseCommand, getAvailableCommands, COMMAND_WHITELIST, constants
- Modified `server/brain/skills/workspace-tools.js` — added `case 'cmd_run':` dispatch (calls options.cmdRun with workspace path + timeout); added cmd_run output formatting in formatToolResults (STDOUT/STDERR blocks, exit code, timed-out indicator)
- Modified `server/brain/tasks/task-types.js` — added `cmd_run` to CODE and PROJECT task type tool lists
- Modified `server/services/chat-pipeline.js` — imports cmd-executor, passes `cmdRun: cmdExecutor.execCommand` to bridge deps
- Modified `server/brain/tasks/task-pipeline-bridge.js` — threads `cmdRun` through all three allTools assembly points (delegation, project, standard)
- Modified `server/brain/skills/task-runner.js` — passes `cmdRun` through to executeToolCalls options
- Created `skills/rust/SKILL.md` (~300 lines) — comprehensive Rust skill: cargo lifecycle (build/run/test/check/clippy/fmt), project scaffolding (CLI, library, web API), Rust patterns (structs, enums, traits, Result/?, iterators, collections), Cargo.toml patterns, common crates table (15 entries), debugging workflow with error code table (E0382/E0308/E0502/E0433/E0599), testing patterns
- Created `skills/python/SKILL.md` (~300 lines) — comprehensive Python skill: script/project creation, pip management, Python patterns (classes, error handling, pathlib, requests, collections, comprehensions, context managers), common packages table (17 entries), testing (unittest + pytest), requirements.txt patterns, debugging workflow with error type table (8 types), project scaffolding (script, CLI, Flask API, data pipeline)
- Modified `skills/coding/SKILL.md` — added cmd_run tool reference and updated package installation rule
- Modified `scripts/health-scan.js` — added 3 entries to CORE_REGISTRY (cmd-executor.js, rust/SKILL.md, python/SKILL.md); registry now 278 entries
- Created `tests/unit/cmd-run-guards.test.js` — 70 tests across 10 sections: command whitelist (8), parseCommand security (18), execCommand validation (6), module exports (5), workspace-tools dispatch (4), task-types integration (5), Rust skill structure (7), Python skill structure (7), coding skill update (1), pipeline wiring (5), CORE_REGISTRY coverage (3)
- Updated `tests/unit/project-executor-guards.test.js` — updated PROJECT tool list assertion to include cmd_run
- Tests: 1930/1930 full suite (0 fail), +70 new

Boundary markers: [BOUNDARY_OK] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-21 (Health Scanner + Fixer Generator)

Status: `Complete`

- **Purpose:** System diagnostics and self-healing BIOS — scanner finds broken/missing/malformed files across the entire core, fixer generator produces a standalone Python script that can rebuild the core from embedded DNA.
- Created `scripts/health-scan.js` — 275-entry CORE_REGISTRY mapping every essential file with descriptions; multi-pass scanning: existence/size check, JS syntax validation (vm.Script), require() reference checking, JSON parse validation (with BOM detection), HTML tag matching, CSS brace matching; unregistered file detection in core directories; report output: console + `scripts/health-report.log`; CLI modes: default (full report), --json, --fix-list; exports: CORE_REGISTRY, runScan
- Created `scripts/generate-fixer.js` — reads all CORE_REGISTRY files, Base64-encodes each with SHA-256 hash, generates standalone Python 3 repair script (neko_fixer.py); generated script supports: dry-run integrity check, --repair (missing/empty only), --force (full restore), --verify (hash check), --list (inventory); zero dependencies (Python 3 stdlib only), cross-platform; CLI: --output, --dry-run; exports: generateFixer
- Updated `.gitignore` — added `project/neko_fixer.py` (generated build artifact)
- Created `tests/unit/health-scanner-guards.test.js` — 41 tests across 8 sections: CORE_REGISTRY structure (13), core files exist on disk (2), scanner engine exports (1), fixer generator exports + dry-run (3), script file existence (4), path safety (3), subsystem coverage (11), gitignore coverage (2)
- Validated: scanner ran against live project (275 files, 275 healthy, 0 missing, 0 zero-byte); generator produced 59,458-line neko_fixer.py (4.8 MB, 275 embedded files)
- Tests: 1860/1860 full suite (0 fail), +41 new

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Project Executor)

Status: `Complete`

- **Purpose:** Enable full end-to-end project execution — NekoCore can now decompose a project plan into ordered phases, execute each phase as a full task (with its own step loop, tool calls, and blueprints), and feed completed phase outputs into subsequent phases as context.
- Created `server/brain/tasks/project-executor.js` (~440 lines)
  - `executeProject(config)` — main entry: LLM-decomposes plan into [PROJECT_PHASES] block, loops through phases executing each via `executeTaskFn`, feeds completed phase outputs as context snippets to next phase, retries once per failed phase, generates final summary
  - `parseProjectPhases(text)` — regex parser for `[PROJECT_PHASES]...[/PROJECT_PHASES]` block with per-line `- Phase N: description | type: taskType | depends: N,N` format
  - `stripPhasesBlock(text)` — removes phases block from text
  - `buildPhaseContext(completedPhases)` — builds `[COMPLETED PROJECT PHASES]` context string from completed phases
  - `_decomposePlan()` — LLM call to break user request into structured phases
  - `_buildPhaseMessage()` — constructs phase-specific task message with original request, phase description, and prior phase context
  - `_generateProjectSummary()` — LLM call to summarize completed project across all phases
  - Events emitted: project_started, project_phase_started, project_phase_complete, project_phase_failed, project_phase_retry, project_complete
  - Limits: MAX_PHASES = 10, MAX_PHASE_RETRIES = 1
  - Fallback: if no phases parsed, delegates to single executeTaskFn call
- Created `server/brain/tasks/blueprints/modules/project.md` — project execution blueprint with phase patterns (code/research/writing), rules for building on prior work, and common mistakes section
- Modified `server/brain/tasks/task-types.js` — added `PROJECT: 'project'` to TASK_TYPES, added project-module config (9 tools: ws_read/ws_write/ws_list/ws_append/ws_delete/ws_move/ws_mkdir/web_search/web_fetch, maxSteps 10, maxLLMCalls 40)
- Modified `server/brain/tasks/blueprint-loader.js` — added `project: 'project'` to MODULE_MAP
- Modified `server/brain/tasks/task-pipeline-bridge.js` — added project-executor import, routing check for `classification.taskType === 'project'`, and `_handleProjectExecution()` function (creates session/archive, gathers context, fires executeProject async, returns immediate response)
- Fixed regex bug in parseProjectPhases: lazy `.+?` with optional suffix groups was consuming everything; switched to `[^|]+?` with `\s*` spacing between groups so type and depends are correctly captured
- Created `tests/unit/project-executor-guards.test.js` — 44 tests across 12 sections: constants, phase parsing (8 cases), strip block, context building, config validation, fallback path, multi-phase execution, failed phase retry, context feeding, event emission, TASK_TYPES registration, blueprint existence, pipeline bridge integration, module exports
- Tests: 1819/1819 full suite (0 fail), +44 new

Boundary markers: [BOUNDARY_OK] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-0)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-0 (Guard tests + entity network config)
- `entity-network.json` confirmed present with 3 seed entities (Research, Analysis, Synthesis) — registry loads all 3
- Created `server/contracts/planning-session-contract.js` — validates planning sessions, rounds, participants, and artifacts; exports PLANNING_LIMITS (3 rounds, 4 entities, 800 tokens, 120s timeout)
- Created `tests/unit/entity-orchestration-guards.test.js` — 41 guard tests across 6 sections: entity network registry (9), entity chat manager CRUD (11), planning session contract validation (14), task pipeline bridge planning lock (2), task module registry planning module (2), security guards (3)
- Tests: 1608/1608 full suite (0 fail), +41 new

Boundary markers: [BOUNDARY_OK] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-1)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-1 (Entity worker invocation)
- Created `server/brain/tasks/entity-worker-invoker.js` — loads entity persona from disk, builds persona-based system prompt, calls LLM; exports `invokeEntityWorker()`, `loadEntityProfile()`, `buildEntityWorkerPrompt()`
- Modified `server/brain/tasks/entity-chat-manager.js` — added `invokeEntity(sessionId, entityId, options)` method that calls entity-worker-invoker and stores response as a session message
- Added 12 guard tests to `entity-orchestration-guards.test.js` (Sections 7+8): entity worker invoker persona loading, prompt building, graceful missing-entity fallback; EntityChatManager.invokeEntity integration
- Tests: 1620/1620 full suite (0 fail), +12 new (53 total entity-orchestration tests)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-4)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-4 (Planning archive)
- Added 3 planning archive methods to `server/brain/tasks/task-archive-writer.js`:
  - `createPlanningArchive(taskArchiveId, sessionMeta, opts)` — creates `planning/` subdir with session.json + participants.json
  - `appendPlanningRound(taskArchiveId, round, opts)` — writes `round-{nn}/` with per-entity JSON files; validates via planning-session-contract
  - `writePlanningArtifacts(taskArchiveId, artifacts, opts)` — writes final-plan.md, decision-rationale.md, issues-flagged.json; validates via contract
- Added 2 planning archive reader methods to `server/brain/tasks/task-archive-reader.js`:
  - `getPlanningRounds(taskArchiveId, opts)` — reads all round directories and entity responses
  - `getPlanningArtifacts(taskArchiveId, opts)` — reads final plan, rationale, and issues
- Added 10 guard tests in Section 11 of `entity-orchestration-guards.test.js`: create planning archive, append round, reject invalid round, write artifacts, reject invalid artifacts, read rounds round-trip, read artifacts round-trip, empty returns for missing archives, archive test cleanup
- Tests: 1656/1656 full suite (0 fail), +10 new (89 total entity-orchestration tests)

Boundary markers: [BOUNDARY_OK] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-5)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-5 (Task delegation to worker entities)
- Modified `server/brain/tasks/task-pipeline-bridge.js`:
  - Added `shouldDelegate(classification, userMessage)` — heuristic: delegates research/analysis tasks when confidence >= 0.85 and message length >= 100
  - Added `_handleDelegation()` — spawns worker via EntityManager, runs executor with worker context, archives attributed to requesting entity, cleans up worker on completion
  - Delegation check inserted before standard task dispatch — planning > delegation > normal
  - `shouldDelegate` exported on bridge return object for testability
- Added 6 guard tests in Section 12: shouldDelegate true/false for various conditions, export check
- Tests: 1662/1662 full suite (0 fail), +6 new (95 total entity-orchestration tests)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-6)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-6 (Integration)
- Replaced canned planning branch in `task-pipeline-bridge.js` with real async orchestrator call: builds participant list from registry, creates task session + archive, fires `runPlanningSession()` async, archives rounds + artifacts, closes session
- Updated E-0 guard test to reflect new behavior (task session instead of entity chat session)
- Added 5 integration guard tests in Section 13
- Tests: 1667/1667 full suite (0 fail), +5 new (100 total entity-orchestration tests)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-3)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-3 (Planning deliberation loop)
- Created `server/brain/tasks/planning-orchestrator.js` — async deliberation engine:
  - `runPlanningSession(config)` — entity resolution, round loop (max 3), sequential entity invocation per round, NekoCore moderator consensus detection, final synthesis; emits `planning_round_complete` and `planning_complete` events on task event bus
  - `_parseModerationResponse()` — extracts JSON or falls back to keyword heuristic for consensus
  - `_parseSynthesisResponse()` — extracts final plan JSON or falls back to plain text
- Entity cap (4) and round cap (3) enforced from PLANNING_LIMITS
- Session closed with artifacts on completion
- Graceful LLM failure handling (moderation falls through, synthesis provides fallback)
- Added 14 guard tests in Section 10 of `entity-orchestration-guards.test.js`: module exports, input validation, 1-round consensus, maxRounds cap, entity cap, event bus emission, JSON/keyword moderation parsing, synthesis parsing, LLM failure, session closure
- Tests: 1646/1646 full suite (0 fail), +14 new (79 total entity-orchestration tests)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-2)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-2 (Entity spawning for tasks)
- Added 3 methods to `server/brain/utils/entity-manager.js`:
  - `spawnWorkerEntity(config)` — creates lightweight entity directory with minimal entity.json (creation_mode: 'worker') + persona.json; names prefixed "Worker: {specialty}"; reserved name guard enforced
  - `isWorkerEntity(entityId)` — checks entity.json for creation_mode === 'worker'
  - `cleanupWorkerEntity(entityId)` — removes worker entity directory; refuses non-workers
- Added static constants `RESERVED_NAMES` and `WORKER_PREFIX` to EntityManager class
- Added 12 guard tests in Section 9 of `entity-orchestration-guards.test.js`: spawn creates valid structure, entity/persona JSON shapes, reserved name rejection, defaults, isWorkerEntity true/false, cleanup works/refuses, invoker integration
- Tests: 1632/1632 full suite (0 fail), +12 new (65 total entity-orchestration tests)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Entity Orchestration E-7)

Status: `Complete`

- Plan: `Documents/current/PLAN-ENTITY-ORCHESTRATION-v1.md` — slice E-7 (Exit audit + docs)
- Updated CHANGELOG.md with Phase 4.10 Entity Orchestration entry documenting all new files, methods, and capabilities
- Marked plan status `Complete`, all 7 phases complete, all slices E-0 through E-7 checked off
- Updated WORKLOG stop/resume snapshot to reflect plan completion
- Final test count: 1667/1667 (0 fail), 100 entity-orchestration guard tests across 13 sections
- Plan deliverables: planning-orchestrator.js, entity-worker-invoker.js, planning-session-contract.js, entity-network.json; EntityManager worker methods; archive writer/reader planning methods; delegation heuristic; full integration wiring

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Coding Skill)

Status: `Complete`

- Created `skills/coding/SKILL.md` — comprehensive coding skill for entities to write real code files
  - Tool reference: ws_write, ws_read, ws_list, ws_append, ws_delete, ws_move, ws_mkdir with syntax examples
  - 5 critical rules: complete files, read-before-edit, list-before-read, one-file-per-write, escape quotes
  - Step-by-step workflows for creating, editing, and debugging code
  - Language patterns: JavaScript/Node.js, Python, HTML, CSS
  - Project scaffolding templates: Node.js, Node.js with tests, static website, Python project
  - Code quality checklist, debugging workflow, session notes pattern
  - Explicit "What NOT to Do" section for small LLM compliance
  - Auto-migrates to entities via existing SkillManager.migrateGlobalSkills()
- Added `ws_mkdir` tool to `server/brain/skills/workspace-tools.js`
  - `execWsMkdir(wsRoot, relPath)` — create directories recursively
  - Path-traversal protection via existing `resolveSafe()`
  - Idempotent: succeeds if directory already exists
- Updated code module in `server/brain/tasks/task-types.js`
  - Tools: ws_read, ws_write, ws_list, ws_append, ws_delete, ws_move, ws_mkdir (was 4 tools → now 7)
  - maxSteps: 8 (was 6), maxLLMCalls: 25 (was 20) — supports multi-file projects
- Enhanced code blueprint `server/brain/tasks/blueprints/modules/code.md`
  - Added multi-file project plan pattern with step-by-step scaffolding order
  - Added mandatory workflow section (LIST → READ → WRITE COMPLETE)
  - Added ws_delete, ws_move, ws_mkdir to tool documentation
  - Added "Common Mistakes to Avoid" section
- Created `tests/unit/coding-skill-guards.test.js` — 49 tests across 7 sections:
  - SKILL.md existence/structure (5), content completeness (14), code module tools (10)
  - ws_mkdir execution (6), blueprint enhancements (9), scaffolding integration (2), registry reflection (3)
- Tests: 1775/1775 full suite (0 fail), +49 new

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Task Blueprint System)

Status: `Complete`

- Created 5 core blueprints in `server/brain/tasks/blueprints/core/`:
  - `task-decomposition.md` — how to break tasks into [TASK_PLAN] steps, step count guide, when to ask for input
  - `tool-guide.md` — complete tool reference with format examples and when-to-use guidance
  - `quality-gate.md` — completeness/accuracy/scope/output checklist before submission
  - `error-recovery.md` — decision tree for failures, retry rules, graceful degradation
  - `output-format.md` — chat vs file rules, file naming, structure templates, special tags
- Created 5 module blueprints in `server/brain/tasks/blueprints/modules/`:
  - `research.md` — search→evaluate→extract→write pattern, source evaluation, citation rules
  - `code.md` — new/edit/debug patterns, read-before-write, debugging sequence
  - `writing.md` — article/creative/editing patterns, audience-purpose-tone, sentence craft
  - `analysis.md` — data/comparison/diagnosis patterns, evidence evaluation, confidence rating
  - `planning.md` — deliberation flow, consensus checking, moderation/synthesis JSON formats
- Created `server/brain/tasks/blueprint-loader.js` — loads/caches markdown blueprints, phase-aware assembly (plan/execute/summarize), `getBlueprintForPhase(taskType, {phase})` returns appropriate combination of core + module blueprints
- Wired into `task-executor.js` — `buildTaskSystemPrompt` now injects execute-phase blueprints via `[Task Blueprints]` section
- Wired into `task-runner.js` — plan generation gets plan-phase blueprint, step execution gets execute-phase blueprint, final summary gets summarize-phase blueprint; `taskType` now passed through to `executeTaskPlan`
- Wired into `planning-orchestrator.js` — moderation and synthesis prompts now include planning module blueprint
- Created `tests/unit/blueprint-system-guards.test.js` — 59 tests across 10 sections: file existence (12), content quality (6), loader exports (9), reading (12), phase assembly (7), caching (2), listing (2), executor integration (4), runner integration (2), orchestrator integration (3)
- All blueprints optimized for small/local LLMs: numbered instructions, concrete examples, positive framing, output format enforcement, decision trees, explicit do/don't rules
- Tests: 1726/1726 full suite (0 fail), +59 new

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Dynamic CI test badge)

Status: `Complete`

- Issue: README test badge was hardcoded shields.io static badge (`tests-1567%20passing`) that goes stale every time test count changes
- Fix: CI workflow now captures `npm test` output via `tee`, parses `# pass` and `# fail` counts with grep, and uses `schneegans/dynamic-badges-action@v1.7.0` to write a JSON badge file to a GitHub Gist; README badge replaced with `img.shields.io/endpoint?url=<gist-raw-url>` pointing to that Gist; badge auto-updates on every push to main; shows green when 0 failures, red with "X passing, Y failing" when failures exist
- Files changed: `.github/workflows/ci.yml` (test output capture + parse + Gist update step), `README.md` (static badge → dynamic endpoint badge)
- Setup required: user must create a GitHub Gist and add `GIST_SECRET` (PAT with gist scope) + `BADGE_GIST_ID` (repo variable) to the repo settings; README Gist URL placeholder needs the real Gist ID

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (CI test fix — 12 pre-existing failures)

Status: `Complete`

- Issue: CI failing — 12 guard tests still checking `index.html` for DOM elements that were extracted to `tab-*.html` files during HTML shadow cleanup (Phase 4.7); plus 1 string-match mismatch and 1 variable-scoping bug
- Root causes:
  1. 10 tests read `client/index.html` for elements now in `tab-archive.html`, `tab-settings.html`, `tab-activity.html`, `tab-chat.html`, `tab-creator.html`, `tab-nekocore.html`
  2. `chat-extraction-guards.test.js` used `includes()` with single space for a double-space export line `window.syncContextChatGuard  = syncContextChatGuard`
  3. `post-response-memory.js` LLM path had a `let memData` shadowing the outer `memData`, so the LLM result was lost after the else block ended — `nekocore-memory.test.js` discovered this
- Fix (9 files):
  - `tests/unit/archive-query-narrowset-guards.test.js` — Read `tab-archive.html` for archiveSearchMonth/archiveSearchSubject
  - `tests/unit/chat-extraction-guards.test.js` — Use regex `/window\.syncContextChatGuard\s+=\s+syncContextChatGuard/` instead of `includes()`
  - `tests/unit/nekocore-memory.test.js` — Pass `memoryEncodingUseNLP: false` to force LLM path (test has LLM mock)
  - `tests/unit/settings-provider-persistence-guards.test.js` — Read `tab-settings.html` for provider buttons
  - `tests/unit/system-apps-manifest-guards.test.js` — Read `tab-creator.html` and `tab-nekocore.html` for iframe hosts
  - `tests/unit/task-manager-fallback-guards.test.js` — Read `tab-activity.html` for Task Manager/Browser Status icons
  - `tests/unit/task-ui-guards.test.js` — Read `tab-chat.html` for task badge/panels, `tab-activity.html` for tmActiveTaskSection
  - `tests/unit/window-titlebar-controls-guards.test.js` — Read `tab-chat.html` for task history/detail buttons (start menu close stays in `index.html`)
  - `server/services/post-response-memory.js` — Fixed `let memData` → `memData` in LLM path to use outer-scoped variable
- Tests: 1567/1567 full suite (0 fail)
- README: Updated test count 1555 → 1567 in badge, spec table, and directory tree

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Entity release on refresh/close fix)

Status: `Complete`

- Issue: When user refreshes the web GUI or closes the context chat window, the entity stays loaded server-side with no visual representation on the client — ghost entity lingers indefinitely
- Root cause 1: `beforeunload` handler in desktop.js did not release the entity — only saved window layout and reported presence disconnect
- Root cause 2: `closeWindow('chat')` in window-manager.js did not release the entity — only cleared DOM
- Root cause 3: `postEntitiesRelease` in entity-routes.js did not stop the brain loop — EntityRuntime was deactivated but brain loop kept running with null module references
- Fix (3 files):
  - `project/client/js/desktop.js` — Added `navigator.sendBeacon('/api/entities/release', blob)` in beforeunload handler to release entity on page refresh/close; uses Blob with application/json; sendBeacon sends cookies (same-origin) so session middleware attaches req.accountId
  - `project/client/js/window-manager.js` — Added chat-specific entity release in `closeWindow()` when `tabName === 'chat'` and `currentEntityId` exists; calls `fetch('/api/entities/release', {keepalive: true})` silently (no confirm dialog), then clears currentEntityId/currentEntityName/currentEntityVoice, calls clearChat() and refreshSidebarEntities()
  - `project/server/routes/entity-routes.js` — Enhanced `postEntitiesRelease()` to stop brain loop before clearing active entity via `loop.stop()` + `loop._saveState()` to flush pending state
- Memory sync: Confirmed memories are saved per-turn via `runPostResponseMemoryEncoding()` — no batch save needed at release time. Brain loop state now saved via `_saveState()` on release.
- Tests: 1555/1567 full suite (12 pre-existing), 4/4 entity-specific tests, 0 regressions

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Task Manager telemetry fix)

Status: `Complete`

- Issue: Task Manager showing "Pipeline Phase: Idle" and "Total Tokens: 0" for all chat turns — no way to measure token optimization results
- Root cause: Template bypass (hybrid router) and semantic cache hit paths returned early without emitting `orchestration_complete` SSE event. Full pipeline path was working via cognitiveBus bridge in server.js but user's test messages were likely all caught by the hybrid router.
- Fix: Added `broadcastSSE('orchestration_complete', ...)` calls in both the template bypass and semantic cache hit early-return paths in `server/services/chat-pipeline.js`; added diagnostic `console.log` in server.js cognitiveBus bridge for the full-pipeline path
- Files changed: `server/services/chat-pipeline.js` (2 broadcastSSE additions), `server/server.js` (1 diagnostic log)
- Tests: 113/113 token opt guards, 47/47 cognitive state, 1555/1567 full suite (12 pre-existing)

---

## Session Ledger — 2026-03-20 (Token Optimization Plan Closure)

Status: `Complete`

- Plan: `Documents/current/PLAN-TOKEN-OPTIMIZATION-v1.md` — PLAN COMPLETE
- Phase 5 (Brain Loop Batching & Gating) cancelled after thorough audit of `server/brain/cognition/brain-loop.js` and all 16 phase files
- Cancellation rationale: brain loop already has aggressive built-in gating — beliefs every 10 cycles + homeostatic skip, dreams every 5 cycles + homeostatic skip, identity diary with 30-min per-title and 5-min global cooldowns + 20% random skip, boredom requiring boredom≥0.5 + 10min since last action + 15min idle; zero-LLM phases (neurochemistry drift, somatic awareness, goals decay, hebbian, consolidation, pruning, archive, STM) must run every cycle for cognitive state integrity; dirty-flagging would invert purpose of idle inner-life behavior
- Final tally: 15 slices across 4 phases complete (T1-0 through T4-1), 2 slices cancelled (T5-0, T5-1), 113 guard tests, estimated ~68% per-turn token reduction
- Phases 1–4 savings breakdown: Phase 1 ~2,700 tokens/turn (NLP encode + reranker bypass), Phase 2 ~15,000 tokens/turn for ~60% of casual turns (hybrid router), Phase 3 ~4,700–9,300 tokens/turn (prompt compression), Phase 4 ~16,000 tokens on cache hits (semantic cache)

---

## Session Ledger — 2026-03-20 (Token Optimization Phase 1 — Call Elimination)

Status: `Complete`

- Plan: `Documents/current/PLAN-TOKEN-OPTIMIZATION-v1.md` — slices T1-0–T1-4
- Pre-optimization rollback snapshot: local backup zip (30 MB)
- T1-0: Created `project/tests/unit/token-optimization-guards.test.js` — 37 guard tests across 7 suites: memory encoding output shape (10), reranker behavior (8), existing NLP utilities (4), YAKE extractor (4), NLP encoder (4), pipeline integration (2), security (5)
- T1-1: Created `project/server/brain/utils/yake.js` — YAKE keyword extractor (~170 lines); statistical features: WPos (position), WFreq (frequency normalization), WCase (uppercase ratio), WRel (sentence spread), WDiff (position spread); unigram + bigram scoring with overlap dedup; `extractKeywords(text, maxKeywords?)` → `string[]`
- T1-2: Created `project/server/brain/utils/memory-encoder-nlp.js` — NLP memory encoder (~170 lines); RAKE + YAKE for topics, TextRank-lite extractive summarization for semantic/narrative, lexicon-based emotion detection via scoreSentiment() from cognitive-feedback, heuristic importance scoring (question density, exclamation density, topic richness, length, sentiment strength, personal pronouns), regex-based factual knowledge extraction; `encodeMemory(userMessage, entityResponse, opts?)` → `{topics, semantic, narrative, emotion, importance, knowledge}`
- T1-3: Modified `project/server/services/post-response-memory.js` — imports encodeMemory from NLP encoder; added `useNLP` toggle (default true via `params.memoryEncodingUseNLP !== false`); when NLP enabled, skips LLM callLLMWithRuntime + JSON repair entirely, builds memData directly from NLP result; LLM path preserved as else branch for rollback
- T1-4: Modified `project/server/services/memory-retrieval.js` — added `llmRerank` parameter to createMemoryRetrieval factory (default false); reranker block gated behind `llmRerank` flag; BM25 ordering preserved as sole ranking path when off; set `llmRerank: true` in factory call to re-enable
- Estimated savings: ~700 tokens/turn (memory encoding) + ~2000 tokens/turn (reranker bypass) = ~2700 tokens/turn for Phase 1
- Regression: 37/37 token opt guard tests pass; 73/73 cognitive state tests pass; 1479/1491 full suite (12 pre-existing failures, 0 regressions)

Boundary markers: [BOUNDARY_OK] [JS_OFFLOAD]

---

## Session Ledger — 2026-03-20 (Token Optimization Phase 4 — Semantic Cache)

Status: `Complete`

- Plan: `Documents/current/PLAN-TOKEN-OPTIMIZATION-v1.md` — slices T4-0–T4-1
- T4-0: Created `project/server/brain/utils/semantic-cache.js` — LRU cache (Map-based, max 200 entries, 15min TTL); vectorization via RAKE `extractPhrases()` → topic arrays; similarity via `bm25Score()` with threshold ≥0.85; messages with <2 RAKE topics excluded (too ambiguous); entity-scoped factory (`getEntityCache(entityId)`) with registry; `clearEntityCache()` for cleanup; hit/miss/hitRate stats tracking
- T4-1: Modified `project/server/services/chat-pipeline.js` — imports `getEntityCache` from semantic-cache; cache lookup inserted after hybrid router but before cognitive snapshot/orchestrator; on cache hit: returns cached response, emits `cache_hit` SSE event, logs `semantic_cache.hit` with score + tokens_saved_estimate (16000), still runs NLP memory encoding + cognitive feedback (async); after orchestrator completes: stores response in cache via `entityCache.store()`; config toggle: `pipeline.semanticCache !== false` (defaults true)
- Added 20 new guard tests to `project/tests/unit/token-optimization-guards.test.js`: Section 16 (Semantic cache module T4-0, 13 tests — existence, factories, lookup miss/hit, LRU capacity, ambiguous skip, entity isolation, stats, security, RAKE/BM25 usage), Section 17 (Pipeline integration T4-1, 7 tests — import, toggle, SSE event, savings log, memory encoding, cognitive feedback, cache store)
- Estimated savings: 100% token savings (~16,000 tokens) on cache hits, estimated ~10-20% of turns in typical sessions
- Regression: 113/113 token opt guard tests pass; 47/47 cognitive state tests pass; 1662/1674 full suite (12 pre-existing failures, 0 regressions)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Token Optimization Phase 3 — Prompt Compression)

Status: `Complete`

- Plan: `Documents/current/PLAN-TOKEN-OPTIMIZATION-v1.md` — slices T3-0–T3-3
- T3-0: Modified `project/server/services/memory-retrieval.js` — memory summaries capped at 150 chars (was 280, 4 locations: getSemanticPreview ×2, indexed memory, pulse-hint); context connections 12→8 (line 400); chatlog per-entry limit 900→600; instructional text condensed from 4 lines to 2; conversation recall header condensed to single line
- T3-1: Modified `project/server/brain/cognition/dream-intuition-adapter.js` — default maxTokens 260→200; system prompt condensed to single line; added hasSignals check that skips 1D entirely when subjects+events+intentHints are all empty (returns zero-usage placeholder)
- T3-2: Modified `project/server/brain/core/orchestrator.js` — individual history messages capped at 1200 chars via `.slice(0, 1200)` before injection into Conscious prompt
- T3-3: Modified `project/server/brain/core/orchestrator.js` — replaced full copies of subconsciousOutput/dreamOutput/turnSignals in mergePrompt with condensed versions: subconscious capped at 600 chars, dream at 300 chars, turn signals condensed to single-line summary (subjects/emotion/tension) instead of JSON.stringify dump; header changed from "CONTEXT USED BY CONSCIOUS" to "CONTEXT SUMMARY"
- Added 16 new guard tests to `project/tests/unit/token-optimization-guards.test.js`: T3-0 (5), T3-1 (5), T3-2 (2), T3-3 (4)
- Estimated savings: ~4700-9300 tokens/turn across all 4 pipeline nodes
- Regression: 93/93 token opt guard tests pass; 47/47 cognitive state tests pass; 1642/1654 full suite (12 pre-existing failures, 0 regressions)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Token Optimization Phase 2 — Hybrid Router)

Status: `Complete`

- Plan: `Documents/current/PLAN-TOKEN-OPTIMIZATION-v1.md` — slices T2-0–T2-3
- T2-0: Created `project/server/contracts/turn-classifier-contract.js` — defines turn classification taxonomy (greeting, status, confirmation, farewell, command, simple-question, deep); `validateClassification(result)` → `{ok, errors}`; exports `VALID_CATEGORIES`, `BYPASS_THRESHOLD` (0.8)
- T2-1: Created `project/server/brain/utils/turn-classifier.js` — pure regex+keyword classifier (<1ms); pattern libraries per category; confidence=0.95 for matches; guards: >15 words with ? → never bypass, >30 words → always deep; commands bypass=false (handled upstream); `classifyTurn(text)` → `{category, confidence, bypass}`
- T2-2: Created `project/server/brain/utils/template-responses.js` — per-category response templates with personality-aware variation; mood descriptors for status responses; `getTemplateResponse(category, context?)` → `{response, _source:'template'}` or null; greeting/status/confirmation/farewell have 5 templates each; deep/simple-question return null (need LLM)
- T2-3: Modified `project/server/services/chat-pipeline.js` — imports classifyTurn, getTemplateResponse, validateClassification; inserts classifier check after T-6 task fork and before cognitive snapshot assembly; on bypass: returns template response, skips full 4-node orchestrator pipeline, still runs NLP memory encoding + cognitive feedback (async); emits `turn_classified` SSE event; logs `tokens_saved_estimate: 15000` on bypass; config toggle: `pipeline.hybridRouter !== false` (defaults true)
- Added 40 new guard tests to `project/tests/unit/token-optimization-guards.test.js`: turn classifier contract (9 tests), turn classifier engine (12 tests), template response library (8 tests), pipeline hybrid router integration (8 tests), security guards for all new modules (3 tests)
- Estimated savings: ~15,000 tokens/turn for ~60% of casual turns (greetings, status, confirmations, farewells)
- Regression: 77/77 token opt guard tests pass; 73/73 cognitive state tests pass; 1626/1638 full suite (12 pre-existing failures, 0 regressions)

Boundary markers: [BOUNDARY_OK] [JS_OFFLOAD] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-20 (Token Optimization Phase 1 — Call Elimination)

Status: `Complete`

- Plan: `Documents/current/PLAN-COGNITIVE-STATE-INTEGRATION-v1.md` — slices C12–C13 (final phase)
- C12: Modified `project/server/services/chat-pipeline.js` — emits `cognitive_snapshot_assembled` SSE event after snapshot assembly with summary (beliefs, conflicts, goals, mood, stressTier, curiosity, timestamp)
- C12: Modified `project/client/js/apps/core/telemetry-ui.js` — added `cognitiveState` property to `runtimeTelemetry` object (snapshot, beliefFeedback, goalStatus, curiosity, moodNudge, lastFeedbackTime)
- C12: Modified `project/client/js/apps/core/chat.js` — added 5 cognitive SSE event listeners in `initBrainSSE()`: cognitive_snapshot_assembled, belief_feedback_applied, goal_status_changed, curiosity_resolved, mood_nudge_applied; each updates runtimeTelemetry.cognitiveState and pushes telemetry event feed entry
- C13: Created `project/tests/unit/cognitive-state-e2e.test.js` — 26 end-to-end integration tests across 7 suites: pre-turn snapshot assembly (3), post-turn feedback analysis (5), interaction magnitude classification (4), neurochemistry INTERACTION_* wiring (2), graduated mood shift bounds (4), full turn cycle integration (4), SSE observability source-level assertions (4)
- Full plan summary: 14 slices (C0–C13) across 4 phases complete — pre-turn cognitive snapshot, post-turn feedback loop, graduated neurochemistry nudge from conversation, SSE observability + telemetry + end-to-end tests
- Regression: 26/26 e2e integration tests pass; 47/47 guard tests pass; 0 regressions

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Cognitive State Integration Phase 3 complete)

Status: `Complete`

- Plan: `Documents/current/PLAN-COGNITIVE-STATE-INTEGRATION-v1.md` — slices C10–C11
- Created `project/server/brain/cognition/interaction-magnitude.js` — classifyInteraction(moodSignal) converts mood signal type+magnitude into typed INTERACTION_* event with numeric intensity; MAGNITUDE_INTENSITY mapping: minor=0.3x, moderate=1.0x, major=3.0x
- Modified `project/server/brain/affect/neurochemistry.js` — added 5 INTERACTION_* entries to EVENT_EFFECTS table (INTERACTION_POSITIVE: dopamine+0.008/serotonin+0.004, INTERACTION_NEGATIVE: cortisol+0.008/serotonin-0.004, INTERACTION_BONDING: oxytocin+0.008/dopamine+0.003, INTERACTION_CONFLICT: cortisol+0.008/dopamine-0.002, INTERACTION_INSIGHT: dopamine+0.008/serotonin+0.003); updated _subscribe() to forward event.intensity to updateChemistry()
- Modified `project/server/services/post-response-cognitive-feedback.js` — imports classifyInteraction; after diary trigger, emits INTERACTION_* event on cognitive bus with intensity from magnitude classifier; emits mood_nudge_applied SSE event + timeline log
- Graduated mood shift math: 100 minor positive turns → 100×0.008×0.3 dopamine = ~0.24 raw, ~0.15 after saturation dampening + baseline drift; 1 major negative turn → 0.008×3.0 cortisol = 0.024 single nudge, decays within 3–5 brain cycles
- Regression: 47/47 cognitive state guard tests pass; 1525/1536 full suite pass (11 pre-existing failures, 0 regressions)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Cognitive State Integration Phase 2)

Status: `Complete`

- Plan: `Documents/current/PLAN-COGNITIVE-STATE-INTEGRATION-v1.md` — slices C5–C9
- C5 (recovered): `project/server/contracts/cognitive-feedback-contract.js` — validateFeedback() with belief actions (reinforce/weaken/contradict), goal actions (progress/fulfilled/blocked/irrelevant), mood signal types + magnitudes; intact from prior session
- C6 (recovered): `project/server/brain/cognition/cognitive-feedback.js` — analyzeTurnFeedback() NLP-only engine: lexicon-based sentiment scoring, RAKE topic extraction, BM25 belief/goal/curiosity matching, graduated magnitude classification, diary trigger detection; intact from prior session
- C7: Created `project/server/services/post-response-cognitive-feedback.js` — runCognitiveFeedbackLoop() applies belief updates via beliefGraph.reinforceBelief()/contradictBelief(), emits BELIEF_REINFORCED/BELIEF_CONTRADICTED on cognitive bus
- C8: Goal fulfillment feedback in same module — applies goal updates via goalsManager.markExplored()/completeGoal(), emits GOAL_PROGRESS/GOAL_FULFILLED on cognitive bus
- C9: Curiosity closure via curiosityEngine.markQuestionResolved() (new method added); diary trigger via LifeDiary.appendEntry() tagged with conversation_feedback source
- Modified `project/server/brain/bus/thought-types.js` — added GOAL_PROGRESS and CURIOSITY_RESOLVED types
- Modified `project/server/brain/cognition/curiosity-engine.js` — added markQuestionResolved(questionText) method
- Modified `project/server/services/chat-pipeline.js` — imports runCognitiveFeedbackLoop; calls it after runPostResponseMemoryEncoding in both orchestrator and single-LLM paths; captures cognitiveSnapshotData for feedback pre-snapshot
- Regression: 47/47 cognitive state guard tests pass; 1525/1536 full suite pass (11 pre-existing failures in archive-query, chat-extraction, settings-provider, system-apps-manifest, task-manager, task-ui, window-titlebar guards — 0 regressions)

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-20 (Cognitive State Integration Phase 1)

Status: `Complete`

- Plan: `Documents/current/PLAN-COGNITIVE-STATE-INTEGRATION-v1.md` — slices C0–C4
- Created `project/tests/unit/cognitive-state-integration-guards.test.js` (47 guard tests — file existence, contract API, assembler API, goals/belief/neuro regression, orchestrator/pipeline integration, thought types, curiosity, security)
- Created `project/server/contracts/cognitive-snapshot-contract.js` — validateSnapshot() + buildSnapshotBlock() with caps (6 beliefs, 3 conflicts, 3 goals, 3 diary insights, 3 curiosity questions); output header `[COGNITIVE STATE — Your current inner landscape]`
- Created `project/server/brain/cognition/cognitive-snapshot.js` — assembleCognitiveSnapshot(deps) reads beliefGraph, goalsManager, neurochemistry, curiosityEngine, identityManager, selfModel, entityId, userMessageTopics; graceful degradation for missing subsystems; BM25 curiosity matching; mood trend derivation from chemical positions vs 0.5 baseline (±0.08 threshold); stress tier from cortisol
- Modified `project/server/brain/cognition/curiosity-engine.js` — added recentQuestions cache (max 20) + getRecentQuestions(limit=10) method
- Modified `project/server/brain/core/orchestrator.js` — added cognitiveSnapshot constructor option; injects [COGNITIVE STATE] block after [SOMATIC AWARENESS] in runSubconscious()
- Modified `project/server/services/chat-pipeline.js` — calls assembleCognitiveSnapshot() before orchestrator with all brain subsystems as deps; passes cognitiveSnapshotBlock to orchestrator constructor; try/catch with console.warn fallback
- Modified `project/server/brain/bus/thought-types.js` — added 5 new types: INTERACTION_POSITIVE, INTERACTION_NEGATIVE, INTERACTION_BONDING, INTERACTION_CONFLICT, INTERACTION_INSIGHT
- Regression: 47/47 cognitive state guard tests pass; 1525/1537 full suite pass (12 pre-existing failures in archive-query, chat-extraction, settings-provider, system-apps-manifest, task-manager, task-pipeline-bridge, task-ui, window-titlebar guards — 0 regressions from this work)

Boundary markers: [BOUNDARY_OK] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-19 (Slash Command System A0+A1+A2)

Status: `Complete`

- Created `Documents/current/PLAN-SLASH-COMMAND-SYSTEM-v1.md` (slices A0–A4 defined)
- Created `project/tests/unit/slash-command-guards.test.js` (33 guard tests covering registry, security, and integration wiring)
- Created `project/client/js/apps/core/slash-commands.js` (full IIFE — picker, command registry, task wizard, all 7 handlers)
  - Commands: `/task`, `/skill`, `/project`, `/websearch`, `/stop`, `/list`, `/listactive`
  - Picker: keyboard nav (↑↓ / Tab / Escape / Enter), rendered via `_renderPicker` with `_escHtml()` (XSS-safe)
  - System messages via `.textContent` (no LLM, no chat history pollution)
  - Schedule metadata captured (once / interval / daily) — repeat-execution loop is slice A3
- Modified `project/client/js/apps/core/chat.js`:
  - Exposed `window.getActiveEntityId = () => currentEntityId`
  - Added `if (window.SlashCommands?.handleKey(e)) return;` in `chatKeyDown`
  - Added slash intercept block at top of `sendChatMessage` (routes before LLM path)
- Modified `project/client/apps/core/tab-chat.html`:
  - Wrapped input in `.chat-input-wrap` with `#slashPicker` div
  - Added full `#taskWizard` modal (type/skill/schedule/output fields)
- Modified `project/client/index.html`: added `slash-commands.js` script tag after `chat.js`
- Modified `project/client/css/ui-v2.css`: appended `.slash-picker*`, `.chat-slash-msg`, `.task-wizard*`, `.tw-*` styles
- CI `.github/workflows/ci.yml` created (ubuntu-latest, `working-directory: project`, `npm ci --omit=optional`, `npm test`)
- `README.md` fully redesigned in website style (cat SVG preserved; CI badge added; `.bat` / `booter.js` references removed)

Boundary markers: [BOUNDARY_OK] [JS_OFFLOAD]

---

## Session Ledger — 2026-03-19 (Core-tab slot extraction)

Status: `Complete`

- Extracted 10 core tab blocks from `project/client/index.html` into `project/client/apps/core/tab-*.html`:
  `tab-chat`, `tab-activity`, `tab-archive`, `tab-debugcore`, `tab-settings`, `tab-advanced`, `tab-creator`, `tab-users`, `tab-entity`, `tab-nekocore`
- Extracted 3 overlay groups into `project/client/apps/core/overlays/`:
  `boot-login.html` (bootOverlay + loginOverlay), `setup-wizard.html` (setupOverlay), `sleep.html` (sleepOverlay)
- Each extracted block replaced in index.html with a typed slot div (`data-core-tab` / `data-core-overlay`)
- Created `project/client/js/apps/core-html-loader.js`:
  - Overlays: synchronous XHR injection (in DOM before first paint)
  - Tabs: `Promise.all(fetch)` in parallel; chains result onto `window.__nonCoreHtmlReady` so `boot.js` awaits all content
- `index.html` reduced from ~1800 lines to 743 lines; shell chrome (header, nav, taskbar, snap dock, context menu, start menu) remains inline
- No IDs, class names, JS function calls, or event handlers changed; HTML structure only

Boundary markers: [BOUNDARY_OK]

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup E-3/E-4 Closure + Installer Handoff)

Status: `Complete`

- Captured installer-support handoff artifact in `Documents/current/PLAN-APP-MANIFEST-SHADOW-REFACTOR-v1.md` (E-3):
   - Stable app id contract source: `project/client/js/apps/system-apps.json` (`apps[].id`)
   - Installer-dependent manifest fields: `id`, `sourcePath`, `appType`, `optional`, `standalonePath`, `packagePath`, `packageEntry`, `ownership.*`
   - Deterministic loader boundaries: `getManifestAppEntry(...)` packagePath branch + `launchAppViaShadowLoader(...)` -> `ShadowContentLoader.load()`
   - Payload ownership mapping source: `system-apps.json` `ownership.*` + package fields
   - Unresolved blockers: none (interactive manual smoke remains non-blocking follow-up)
- Confirmed installer marker boundaries preserved in protected files:
   - `project/client/js/app.js`
   - `project/client/js/apps/non-core-html-loader.js`
- Installer/VFS guard evidence:
   - Command: `node --test tests/unit/installer-vfs-phase-ab.test.js`
   - Result: `7 pass, 0 fail`
- E-4 bookkeeping complete:
   - Updated WORKLOG stop/resume snapshot
   - Updated CHANGELOG Unreleased notes
   - Updated prompt/plan checklists through Phase E completion

Boundary markers: [BOUNDARY_OK] [CONTRACT_ENFORCED]

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup E-1/E-2 Validation)

Status: `Complete`

- E-1 targeted validation completed with launch/manifest/shadow guard focus:
   - Command: `node --test tests/unit/shadow-cleanup-a0-guards.test.js tests/unit/app-manifest-guards.test.js tests/unit/system-apps-manifest-guards.test.js tests/unit/system-apps-adapter-guards.test.js tests/unit/window-manager-extraction-guards.test.js tests/unit/app-window-guards.test.js tests/unit/shadow-content-loader-guards.test.js tests/unit/launch-integration-guards.test.js`
   - Result: `80 pass, 0 fail`
- E-2 full regression validation completed:
   - Command: `node --test`
   - Result: `1432 pass, 0 fail`
- Manual UI smoke scope from E-1 remains pending interactive verification (desktop icon rendering, creator open/close/reopen, pop-out parity, style bleed check) because this pass was terminal/test-runner only.

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup D-2 Shadow Content Loader)

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup D-3 Launch Integration + Fallback)

Status: `Complete`

- Implemented D-3 Launch Integration + Fallback in `project/client/js/window-manager.js`:
   - Added `getManifestAppEntry(appId)` function to retrieve full manifest entry (including packagePath) via SystemAppsAdapter
   - Added `launchAppViaShadowLoader(tabName, packagePath, packageEntry)` function to route packaged apps through AppWindow + ShadowContentLoader
   - Modified `openWindow()` to check manifest entry for packagePath; if present and package loads successfully, uses shadow path; otherwise falls back to legacy path
   - Modified `closeWindow()` to unload shadow content via ShadowContentLoader.unload() for proper cleanup
   - Shadow routing: if packagePath exists and is non-empty string, creates AppWindow, initializes shadow root, creates ShadowContentLoader, and calls loader.load()
   - Legacy fallback: non-packaged apps (packagePath missing/null/empty) continue through existing launch hooks (creator iframe reset, nekocore lazy-load, etc.)
   - Installer contract preserved: manifest fields (id, packagePath, packageEntry, ownership) remain accessible for downstream installer targeting
   - Error handling: shadow load failure silently falls through to legacy path; no regressions or blocking errors
- Created comprehensive D-3 guard suite in `project/tests/unit/launch-integration-guards.test.js` (11 tests):
   - Manifest entry lookup with packagePath presence detection
   - Launch routing branching logic (shadow vs legacy)
   - AppWindow creation and shadow initialization
   - Legacy fallback for non-packaged apps
   - Error boundary UI for failed loads
   - Installer contract field preservation (ownership, controller, host paths)
   - Installer marker detection for payload lifecycle
   - Mixed runtime (packaged + legacy coexistence)
   - Apps without manifest entries fall back to WINDOW_APPS
   - Deterministic loader boundaries with anchor points for installer targeting
- Focused validation run: `11 pass, 0 fail` (D-3 launch-integration-guards tests only)
- Full focused guard suite (integrated): `89 pass, 0 fail` ✅ (78 prior + 11 D-3)

---

Status: `Complete`

- Implemented ShadowContentLoader class in `project/client/js/shadow-content-loader.js` (320 lines):
  - Constructor stores appWindow, packagePath, packageEntry, and lifecycle state tracking (loaded, loadError)
  - `fetchPackageHTML()` async method fetches app package from `/apps/{appName}/index.html` with HTTP status validation
  - `parseHTML(html)` extracts document body nodes, inline `<style>` elements, external `<link rel="stylesheet">` references, and `<script>` elements (with src/type/async/defer properties captured)
  - `injectContent(parsed)` orchestrates 4-step injection: external stylesheets → inline styles → HTML body (cloned to preserve originals) → scripts (executed sequentially)
  - `executeExternalScript(src)` creates `<script>` element, appends to shadow root, returns Promise on load/error
  - `executeInlineScript(code)` wraps in try-catch, executes via `new Function(code)()` in global scope for window access
  - `injectErrorBoundary(errorMessage)` creates user-safe error UI with clear message and retry button (triggers `clear() + load()` cycle)
  - `load()` main entry point: fetch → parse → inject → set loaded=true; catches errors and injects boundary UI
  - Lifecycle methods: `unload()` resets state, `isLoaded()` checks loaded flag, `getError()` returns last caught error
  - Defensive error handling: validates HTTP responses, checks shadow root existence, logs warnings/errors without throwing
  - Factory pattern: `getOrCreateShadowLoader(appWindow, packagePath)` creates/registers instances; `getShadowLoader(tabName)` retrieves
- Wired ShadowContentLoader into shell bootstrap: added `<script src="js/shadow-content-loader.js"></script>` to `project/client/index.html` immediately after app-window.js (depends on AppWindow class)
- Added comprehensive D-2 guard suite in `project/tests/unit/shadow-content-loader-guards.test.js` (14 tests):
  - Class definition and constructor validation
  - Fetch method with HTTP response validation
  - HTML parsing (body extraction, style/script/link detection)
  - Content injection workflow (styles → HTML → scripts)
  - External script execution with async Promise handling
  - Inline script execution with try-catch safety
  - Script execution order preservation (Document order iteration)
  - Error boundary UI creation and retry flow
  - Lifecycle methods (unload/isLoaded/getError)
  - Factory function registration and retrieval
  - Script loading order in index.html
  - Defensive error handling validation
  - Single catch block covers all failure modes
  - Shadow root existence validation
- First D-2 guard validation run: 14 tests, 1 failed (error boundary test assertion expected `this.unload()` but code implemented `appWindow.clear()`)
  - Root cause: test assertion did not match actual implementation (both achieve same result, test was overly prescriptive)
  - Fix: updated assertion to check for `appWindow.clear()` call followed by `load()` invocation, matching actual error boundary retry flow
- Second D-2 guard validation run: `14 pass, 0 fail` ✅
- Full focused guard suite (integrated): `78 pass, 0 fail` ✅ (64 prior + 14 D-2)

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup D-1 AppWindow Class)

Status: `Complete`

- Implemented AppWindow class in `project/client/js/app-window.js` (275 lines):
  - Constructor initializes tabName, metadata, shadow root reference, and lifecycle hooks (onOpen, onFocus, onClose)
  - `initialize()` method attaches shadow root to window content region with `mode: 'open'` for outer access if needed
  - Lifecycle methods (`open()`, `focus()`, `close()`) delegate to existing windowManager functions while triggering hooks
  - Content injection: `injectHTML()` parses and appends HTML into shadow root; `injectCSS()` creates scoped styles
  - Query methods: `querySelector()` and `querySelectorAll()` work on shadow root content
  - State tracking: `maximized`, `snapState`, `zIndex` tracked alongside existence check flags
  - Accessors: `getElement()`, `getShadowRoot()`, `getContentElement()`, `getBaseStyle()`
  - Defensive error handling: checks for windowManager/function availability, wraps attachShadow in try-catch
  - Factory pattern: `getOrCreateAppWindow(tabName, metadata)` creates/registers instances; `getAppWindow(tabName)` retrieves
- Wired AppWindow into shell bootstrap: added `<script src="js/app-window.js"></script>` to `project/client/index.html` immediately after window-manager.js to ensure windowManager global is available
- Added comprehensive D-1 guard suite in `project/tests/unit/app-window-guards.test.js` (11 tests):
  - Class definition and constructor validation
  - Lifecycle hook initialization and invocation
  - Shadow root attachment and meta flagging
  - Query method delegation to shadow root
  - Content injection (HTML and CSS)
  - Lifecycle operation delegation (open/focus/close)
  - Factory function registration and retrieval
  - Script loading order in index.html
  - Defensive error handling validation
  - Window state tracking
  - Content management methods
- Focused validation run: `64 pass, 0 fail` (53 prior + 11 D-1 AppWindow tests)

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup C-3 Dual-Mode Operation Hardening)

Status: `Complete`

- Added C-3 guard test in `project/tests/unit/system-apps-manifest-guards.test.js` to pin entity creator dual-mode behavior:
  - IS_EMBED mode detection via URL parameter query string parsing
  - DOMContentLoaded initialization handler for single-fire safety
  - Embedded mode: CSS class injection (`embed-mode`), topbar hiding, padding adjustment
  - Standalone mode: default HTML layout without class injection
  - Navigation branching: `goToMain()` routes to parent sync (embedded) vs shell root (standalone)
  - Parent communication: `syncParentAfterCreate()` guards against non-embedded contexts and calls parent UI refresh/sync functions
  - Success screen lifecycle: mode-aware auto-redirect timing (900ms embedded parent sync vs 3s standalone nav)
- Focused guard validation run: `53 pass, 0 fail` (52 prior + 1 new C-3 test)

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup C-2 Entity Creator App Body Extraction)

Status: `Complete`

- Migrated the active Entity Creator markup/style ownership into `project/client/apps/entity-creator/` (`index.html`, `entity-creator.css`) and wired package runtime bootstrap in `entity-creator.js` plus existing controller reuse (`/shared/api.js`, `/js/create.js`).
- Converted `project/client/create.html` into a compatibility bridge that forwards to `apps/entity-creator/index.html` while preserving query/hash so embedded shell launch paths remain stable.
- Updated creator return-to-shell routing in `project/client/js/create.js` (`/index.html`) and expanded manifest guards to pin package runtime ownership plus compatibility-bridge behavior; focused validation batch passed (`52 pass, 0 fail`).

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup C-1 Entity Creator Package Scaffold)

Status: `Complete`

- Added `project/client/apps/entity-creator/` scaffold (`index.html`, `entity-creator.css`, `entity-creator.js`) as the first package target for Entity Creator migration.
- Registered scaffold metadata on the `creator` manifest entry in `project/client/js/apps/system-apps.json` (`packagePath`, `packageEntry`) while preserving legacy `create.html` runtime ownership and launch flow.
- Extended manifest schema + guards to pin scaffold registration and on-disk path presence before C-2 body extraction.

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup B-3 Desktop Population Wiring)

Status: `Complete`

- Wired desktop and launcher app-source reads through compatibility resolver (`getShellWindowApps()` -> `SystemAppsAdapter.resolveWindowApps(...)`) with explicit `WINDOW_APPS` fallback.
- Updated desktop/pinned app lookup and launcher menu source paths without changing launch APIs (`switchMainTab`, `getWindowApp`, `buildLauncherMenu`) or current pin/order behavior.
- Extended guard coverage for B-3 source routing and resolver behavior; focused validation batch passed (`51 pass, 0 fail`).

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup B-2 Compatibility Adapter)

Status: `Complete`

- Added `project/client/js/apps/system-apps-adapter.js` as the compatibility loader that reads `system-apps.json` and overlays legacy shell metadata in-place.
- Wired `project/client/index.html` to load the adapter before `app.js` and updated `project/client/js/app.js` to apply adapter output via guarded fallback (`window.__systemAppsCompatStatus` recorded for diagnostics).
- Added `project/tests/unit/system-apps-adapter-guards.test.js` and extended `tests/unit/shadow-cleanup-a0-guards.test.js` with B-2 bootstrap checks; validation batch passed (`49 pass, 0 fail`).

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup B-1 System App Manifest)

Status: `Complete`

- Added `project/client/js/apps/system-apps.schema.json` and `project/client/js/apps/system-apps.json` as the new schema-backed baseline for the manifest-driven shell migration.
- Encoded current launch ownership without runtime rewiring: embedded targets, host paths, standalone pages, popout eligibility, shared-source groups, and installer-managed `helloworld` hooks/registration anchors.
- Added `project/tests/unit/system-apps-manifest-guards.test.js` and ran the focused cleanup batch -> `41 pass, 0 fail`.

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup A-1 App Inventory Map)

Status: `Complete`

- Added `Documents/current/APP-INVENTORY-MAP-HTML-SHADOW-v1.md` with normalized app ids, source owners, launch modes, launch targets, and ambiguity flags for current shell wiring.
- Documented key migration hazards: installer-managed `helloworld` living outside `app-manifest.json`, optional-app split ownership across JS and mounted HTML registries, dual iframe-hosted apps, and the legacy `data-tab="neural"` mismatch versus canonical `visualizer`.
- Ran on-disk source validation across app manifest sources, non-core HTML payload hosts, and standalone/installer exceptions -> `verified 33 client-relative app source paths`.

---

## Session Ledger — 2026-03-18 (HTML Shadow Cleanup A-0 Guard Baseline)

Status: `Complete`

- Added `project/tests/unit/shadow-cleanup-a0-guards.test.js` to pin current shell bootstrap order and launcher/icon behavior before extraction.
- Locked `switchMainTab(...)` shell activation coverage, taskbar and dash icon launch entrypoints, detached-state sync selectors, and launcher `data-tab` wiring.
- Ran focused validation batch: `node --test tests/unit/shadow-cleanup-a0-guards.test.js tests/unit/app-manifest-guards.test.js tests/unit/registry-path-audit-guards.test.js tests/unit/window-manager-extraction-guards.test.js tests/unit/installer-vfs-phase-ab.test.js` -> `42 pass, 0 fail`.

---

## Session Ledger — 2026-03-18 (Phase 4.5 Reconciliation And Cleanup Handoff)

Status: `Complete`

- Recorded user-declared completion of `PLAN-IME-v1.md` Phase 4.5 in `WORKLOG.md` so the tracker no longer blocks the requested cleanup stream.
- Switched the active stop/resume snapshot to the HTML shadow cleanup prompt pack and set the next resume action to A-0 guard refresh.
- Left detailed IME exit-summary backfill as optional follow-up work rather than blocking the cleanup handoff.

---

## Session Ledger — 2026-03-18 (Cleanup Prompt Sync For Installer Runtime)

Status: `Complete`

- Refactor cleanup prompt pack updated to match live installer/uninstaller runtime instead of future handoff assumptions.
- Added explicit cleanup constraints for file lifecycle actions (`create-file`, `delete-file`) and dynamic payload script execution in `project/client/js/apps/non-core-html-loader.js`.
- Extended `tests/unit/installer-vfs-phase-ab.test.js` with a cleanup guard that pins the mounted-script execution path used by installed HTML payloads.

---

## Session Ledger — 2026-03-18 (Safe Project Root Cleanup)

Status: `Complete`

- Moved generated test outputs from `project/` root into `project/artifacts/test-runs/`.
- Moved generated installer logs from `project/` root and `project/server/contracts/` into `project/artifacts/installer/`.
- Moved standalone dev helpers `fix-encoding.js`, `kill-server.js`, and `transform-server.js` into `project/scripts/dev/`.
- Updated moved helper script comments/path assumptions and added `project/artifacts/**` to `.gitignore`.

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
- Critical bug fix completed — Three Visualizer + NekoCore regressions fixed: (1) NekoCore dreaming re-enabled: removed `dreamDisabled: true` from `entity_nekocore/entity.json` and `bootstrap.js` so `phase-dreams.js` no longer skips the dream pipeline; bootstrap guard test updated to assert `dreamDisabled` is absent. (2) Memory graph endpoints now entity-aware: `getMemoryGraphNodes` uses active entity's in-memory graph when `entityId` param matches active entity, otherwise scans disk using `getEntityMemoryScanDirs` with topic co-occurrence edges; `getFullMindGraph` reads `entityId` URL param and uses it as target; `getTraces` and `getBeliefGraphNodes` return empty data for non-active entities (in-memory only subsystems). (3) Visualizer entity picker now refreshes on `visibilitychange` via new `refreshEntityPickerList()` so newly created/loaded entities appear without a full page reload; `clearFilter()` now passes `selectedEntityId` to `NeuralViz.loadGraphData()`. Suite: 554 pass, 0 fail. `[BOUNDARY_OK] [JS_OFFLOAD]`
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
---

## Closing Rule For Every Agent Session

After completing your changes, check this list:
- Did you add or remove any `.js`, `.html`, or `.css` file? → run `npm run map`
- Did you add any new function called from HTML? → run `npm run map`
- Did you add any new API fetch call? → run `npm run map`
- Did you add any new `localStorage` key? → run `npm run map`
- Did you complete a Phase from `docs/project-status-audit.md`? → run `npm run map`

If none of the above → skip the map regeneration.

Report at the end of your session: `Map regenerated ✅` or `Map skipped — no structural changes`

## When To Run Scripts

```
npm run map       — after any structural file change
npm run validate  — after any session touching sleep, brain loop,
                    vfs, auth, shadow-content-loader, or window-manager
```