# REM System — Architecture Overview

Version: 0.9.0-alpha.4.24
Last updated: 2026-03-22

---

## What REM Is

REM (Recursive Echo Memory) is a near-zero-dependency Node.js cognitive architecture that sits between a user interface and one or more LLM providers. It gives AI language model instances a persistent, evolving inner life — continuous memory, emotional baseline, belief formation, dreaming, and per-user relationship tracking that all survive across sessions.

Core design conviction: an entity should be shaped by what it has experienced, not only by what it was told on day one.

---

## Current Direction Snapshot (2026-03-18)

Phases 1–3 (bug fixes, refactor, modularization) are complete. Feature work is authorized.

- **Phase 4.5 — Intelligent Memory Expansion (IME):** ✅ COMPLETE — dual-path post-turn encoding now produces both episodic (`createCoreMemory`) and semantic knowledge (`createSemanticKnowledge`) records per exchange.
- **Phase 4.6 — Sharded Topic Archive:** ✅ COMPLETE — RAKE extraction + BM25 scoring over NDJSON topic-keyed shards (`archive-index.js`, `archive-router.js`).
- **Phase 4.7 — Agent Echo: Multi-Index Archive + Retrieval Pipeline:** ✅ COMPLETE — Echo Now + Echo Past retrieval behavior integrated.
- **Phase 4.8 — Pipeline Hardening + Modularization Completion:** ✅ COMPLETE.
- **Phase 4.9 — Modular Task Orchestration Architecture (MTOA):** ✅ COMPLETE — task intent fork, context gatherer, executor/event bus, sessions/archive/project store, frontman bridge, task routes, entity-chat planning, and client task UI are live.
- **Phase 4.10 — Entity Orchestration:** ✅ COMPLETE — multi-entity session API and planning infrastructure.
- **OS Tool System Upgrade:** ✅ COMPLETE — three-pass JSON/Zod parser replaces regex, block format for file writes, structured result formatting.
- **Entity Genesis Skill:** ✅ COMPLETE — MA-driven entity creation with iterative memory injection and cognitive ticking.
- **MA Bridge:** ✅ COMPLETE — `/ma` slash command for server-to-server MA calls with auto-boot.
- **Bug Tracker App:** ✅ COMPLETE — developer bug tracking with screenshots, JSON persistence, markdown reports.
- **Resource Manager App:** ✅ COMPLETE — unified GUI for Todos, Pulses, Tasks, Projects, and Blueprints with CRUD, active-state toggling, and MA pulse proxy.
- **Installer package baseline (pre-cleanup):** ✅ COMPLETE — strict marker-boundary installer/uninstaller, rollback guarantees, `JsonEntryId` targeting, and app payload file lifecycle (`create-file`, `delete-file`) validated with Hello World end-to-end.
- **Phase 5 — Predictive Memory Topology:** next approved feature phase.

Desktop shell, browser, and runtime stability work continues in parallel with Phase 4.x feature slices.

---

## Subsystem Map

| Subsystem | Key Files | What It Does |
|-----------|-----------|--------------|
| **Cognitive Pipeline** | server/brain/core/orchestrator.js | Runs 1A + 1D in parallel, then 1C, then Final orchestrator pass (2B inlined) |
| **Task Orchestration (MTOA)** | server/brain/tasks/, server/services/chat-pipeline.js | Pre-orchestrator task fork: classify -> contextualize -> execute; frontman event synthesis and session lifecycle |
| **Orchestration Policy** | server/brain/core/orchestration-policy.js | Budget guard, latency guard, O2 escalation decision |
| **Worker Subsystem** | server/brain/core/worker-registry.js, worker-dispatcher.js | Plugin-style worker slots that override contributor phases |
| **Memory Retrieval** | server/services/memory-retrieval.js | Subconscious context block assembly, chatlog recall, doc_* filtering |
| **Memory Operations** | server/services/memory-operations.js | createCoreMemory, createSemanticKnowledge |
| **Memory Storage** | server/brain/memory/memory-storage.js | Atomic read/write for episodic/semantic/ltm |
| **Memory Index** | server/brain/memory/memory-index-cache.js | O(1) lookups, divergence detection and repair |
| **Memory Lifecycle** | server/brain/cognition/phases/phase-decay.js + server/brain/memory/memory-storage.js | Decay tick orchestration + decayMemories implementation |
| **Context Consolidation** | server/brain/generation/context-consolidator.js | Builds context.md for every entity before each LLM call |
| **Belief Graph** | server/brain/knowledge/beliefGraph.js, server/beliefs/ | Emergent beliefs from memory cross-reference |
| **Dream Intuition** | server/brain/cognition/dream-intuition-adapter.js | Live-loop abstract association contributor (1D) |
| **Dream Maintenance** | server/brain/cognition/dream-maintenance-selector.js, server/brain/knowledge/dream-link-writer.js | Offline sleep-cycle dream processing |
| **Brain Loop** | server/brain/brain-loop.js | Background cognition ticker |
| **Entity Runtime** | server/services/entity-runtime.js | Entity state lifecycle per active entity |
| **Context Assembly** | server/brain/generation/aspect-prompts.js | System prompts for each contributor phase |
| **User Profiles** | server/services/user-profiles.js | Per-entity registry of users the entity has met |
| **Relationship Service** | server/services/relationship-service.js | Per-user feeling/trust/rapport/beliefs, LLM-updated |
| **Entity Checkout** | server/services/entity-checkout.js | Multi-user checkout ownership and idle-release guard |
| **Post-Response Memory** | server/services/post-response-memory.js | Async memory encoding + relationship update after each response |
| **Authentication** | server/services/auth-service.js, server/routes/auth-routes.js | Login, session management, account registry |
| **LLM Interface** | server/services/llm-interface.js | callLLMWithRuntime, callSubconsciousReranker |
| **Config Runtime** | server/services/config-runtime.js | Profile/aspect config resolution for multi-LLM routing |
| **Response Postprocess** | server/services/response-postprocess.js | Strips tool tags, formats final output |
| **Runtime Lifecycle** | server/services/runtime-lifecycle.js | Server startup/shutdown orchestration |
| **Voice Profile** | server/services/voice-profile.js | Generates per-entity typing voice from personality traits — speed, rhythm, errors, fillers, brb phrases |
| **Topic Archive** | server/brain/utils/archive-index.js, archive-router.js | RAKE+BM25 sharded topic archive — NDJSON bucket files keyed by topic slug |
| **Skills** | skills/ | Pluggable tools (web search, file ops, memory tools) |
| **SSE / Diagnostics** | server/routes/sse-routes.js | Real-time streaming diagnostics and cognitive bus events |
| **Task UI (Client)** | client/js/apps/optional/task-ui.js, client/js/apps/core/chat.js, client/js/apps/core/telemetry-ui.js | Task badge/status in chat, task history/detail panel, Task Manager active-task telemetry |
| **MA Bridge** | server/services/ma-bridge.js | Server-to-server calls to MA (port 3850) with auto-boot via process manager |
| **Process Manager** | server/routes/process-manager-routes.js | Start/stop/health-check for MA, REM System, and NekoCore servers |
| **Entity Enrichment** | server/routes/entity-enrichment-routes.js | Memory injection, cognitive tick, and state read for external builders (Entity Genesis) |
| **Todo Store** | server/services/todo-store.js | Per-entity todo CRUD with atomic disk writes |
| **Resource Active State** | server/services/resource-active-state.js | Tracks which todo/task/project/pulse is "active" per entity |
| **Resource Manager Routes** | server/routes/resource-manager-routes.js | REST API for todos, tasks, projects, blueprints, MA pulse proxy, and active state |
| **Bug Tracker (Client)** | client/apps/non-core/core/tab-bugtracker.html | Developer bug tracking app with screenshot capture and reporting |

---

## Key Design Principles

### Evolution Over Origin
Entities are not frozen snapshots. The origin story (backstory, starting traits) is placed LAST in the LLM context, after current emotional state and accumulated memories. The entity's lived experience takes precedence over its starting description.

The one exception: **Unbreakable Mode** (opt-in at creation) locks the origin story as permanently authoritative, for NPCs and fixed characters that must never drift.

### Parallel Contributors
Subconscious (1A) and Dream-Intuition (1D) run in parallel via `Promise.all`. Conscious (1C) starts after both complete so it can reason with full memory + dream context. Final Orchestrator pass voices/reviews with refinement inlined.

### Modular Decomposition
`server/server.js` is a composition/bootstrap file only. Business logic lives in dedicated service and brain modules. No module above 800 lines should receive new feature blocks without an extraction plan.

### Contracts and Schema Governance
Critical boundaries are guarded by explicit contracts. Memory records have a versioned schema. Worker outputs have a validated contract. Contributor outputs have a defined shape.

### Persistent Identity Across Sessions
Entity state is disk-persisted. Every conversation is encoded into memory. Sleep cycles consolidate and reprocess. The entity that wakes up after a sleep cycle is the same one that went to sleep — with new memories integrated.

---

## Server Routing Structure

```
server/routes/
  auth-routes.js         — login, logout, session check
  chat-routes.js         — main conversation endpoint
  task-routes.js         — task run/session/cancel/modules/history API
  entity-chat-routes.js  — planning/multi-entity chat session API
  entity-routes.js       — entity CRUD, user profiles, relationships, guided/character creation
  entity-enrichment-routes.js — memory injection, cognitive tick, state read (Entity Genesis)
  memory-routes.js       — memory read/write/search
  brain-routes.js        — brain loop control
  cognitive-routes.js    — sleep, dream, archive triggers
  document-routes.js     — document ingestion pipeline
  config-routes.js       — runtime config management
  sse-routes.js          — real-time event streaming
  skills-routes.js       — skill invocation surface
  browser-routes.js      — embedded browser session management
  vfs-routes.js          — virtual filesystem operations
  nekocore-routes.js     — NekoCore OS system routes
  archive-routes.js      — conversation archive management
  process-manager-routes.js — MA/REM/NekoCore server lifecycle
  resource-manager-routes.js — todos, tasks, projects, pulses, blueprints, active state
```

---

## Entity Folder Layout

```
entities/
  entity_<name>-<timestamp>/
    entity.json          — id, name, traits, creation_mode, unbreakable flag
    brain-loop-state.json
    onboarding-state.json
    beliefs/             — belief graph persistence
    index/               — memory index files
    active-resources.json — tracks which todo/task/project/pulse is currently active
    memories/
      context.md         — assembled LLM context (rebuilt on server start and memory update)
      system-prompt.txt  — identity foundation and backstory
      persona.json       — live emotional state (mood, tone, llmPersonality, etc.)
      users/             — per-user profile files + _active.json
      episodic/          — episodic memory folders
      semantic/          — semantic knowledge folders
      ltm/               — long-term compressed chatlog chunks
      todos/             — per-entity todo items (todos.json)
    quarantine/
    skills/
```

---

## Document Index (this folder)

| File | Contents |
|------|----------|
| ARCHITECTURE-OVERVIEW.md | This file — system map and design principles |
| USER-GUIDE.md | Complete NekoCore OS user guide — desktop, apps, entities, chat, brain, memory, dreams, LLM setup |
| MA-AND-PROJECT-STRUCTURE.md | MA's role, folder relationship, gitignored builds, sub-project history |
| PIPELINE-AND-ORCHESTRATION.md | Cognitive pipeline, orchestrator, worker subsystem, escalation |
| MEMORY-SYSTEM.md | All memory subsystems — storage, retrieval, decay, belief graph, topic archive, context assembly |
| ENTITY-AND-IDENTITY.md | Entity creation, identity modes, voice profiles, context consolidation |
| DREAM-SYSTEM.md | Dream intuition (live) and dream maintenance (offline sleep) |
| CONTRACTS-AND-SCHEMAS.md | Memory schema, voice profile schema, worker output contract, contributor contracts |
| MODEL-RECOMMENDATIONS.md | OpenRouter + Ollama model picks for each pipeline stage |
| HOW-TO-CREATE-AN-APP.md | Step-by-step guide for building new NekoCore OS apps |
| APP-FOLDER-OWNERSHIP.md | File ownership rules for client apps |
| NEKOCORE-OS-WHITE-PAPER-v2.md | Technical white paper — architecture, philosophy, and benchmark results |
| NEKOCORE-OS-ARCHITECTURE-v1.md | Deep technical reference — full subsystem coverage, file map, ADRs |
