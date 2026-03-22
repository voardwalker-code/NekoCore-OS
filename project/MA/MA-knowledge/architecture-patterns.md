# REM System — Architecture Patterns

Reference doc for MA when building or extending the REM System.

---

## Core Architecture

REM (Recursive Echo Memory) is a zero-dependency Node.js cognitive architecture between a user interface and LLM providers. It gives AI entities persistent memory, emotional state, belief formation, dreaming, and relationship tracking across sessions.

**Core conviction:** an entity should be shaped by what it has experienced, not only by what it was told on day one.

---

## Boundary Policy (Non-Negotiable)

- `client/**` — no backend orchestration, filesystem logic, or server policy logic
- `server/**` — no DOM or UI rendering concerns
- New routes go in `server/routes/**`, not `server/server.js`
- New schemas and validators go in `server/contracts/**`
- `server/server.js` is composition/bootstrap only — no business logic
- New modules target <= 300 lines where practical
- Any file above 1200 lines that needs changes requires an extraction plan

---

## Subsystem Map

| Subsystem | Key Files | Purpose |
|-----------|-----------|---------|
| Cognitive Pipeline | server/brain/core/orchestrator.js | 1A+1D parallel, then 1C, then Final |
| Task Orchestration | server/brain/tasks/, server/services/chat-pipeline.js | Pre-orchestrator task fork |
| Memory Retrieval | server/services/memory-retrieval.js | Subconscious context assembly |
| Memory Operations | server/services/memory-operations.js | createCoreMemory, createSemanticKnowledge |
| Memory Storage | server/brain/memory/memory-storage.js | Atomic read/write for episodic/semantic/ltm |
| Memory Index | server/brain/memory/memory-index-cache.js | O(1) lookups, divergence repair |
| Belief Graph | server/brain/knowledge/beliefGraph.js | Emergent beliefs from memory cross-reference |
| Dream Intuition | server/brain/cognition/dream-intuition-adapter.js | Live-loop abstract associations (1D) |
| Dream Maintenance | server/brain/cognition/dream-maintenance-selector.js | Offline sleep-cycle processing |
| Entity Runtime | server/services/entity-runtime.js | Entity state lifecycle |
| Context Assembly | server/brain/generation/context-consolidator.js | Builds context.md before each LLM call |
| User Profiles | server/services/user-profiles.js | Per-entity user registry |
| Relationship Service | server/services/relationship-service.js | Per-user feeling/trust/rapport |
| LLM Interface | server/services/llm-interface.js | callLLMWithRuntime, reranker |
| Topic Archive | server/brain/utils/archive-index.js | RAKE+BM25 sharded topic archive |
| Skills | skills/ | Pluggable tools (web search, file ops, memory tools) |

---

## Key Design Principles

### Evolution Over Origin
Origin story is placed LAST in LLM context, after current emotional state and memories. Lived experience > starting description. Exception: Unbreakable Mode locks origin as permanently authoritative.

### Parallel Contributors
Subconscious (1A) and Dream-Intuition (1D) run via `Promise.all`. Conscious (1C) starts after both. Final Orchestrator voices/reviews.

### Modular Decomposition
server.js is bootstrap-only. Business logic in service and brain modules. No module above 800 lines receives new feature blocks without extraction plan.

---

## File Organization

| Location | Purpose |
|----------|---------|
| server/brain/core/ | Pipeline orchestrator, policy, worker system |
| server/brain/cognition/ | Dream, decay, introspection |
| server/brain/generation/ | Context consolidator, aspect prompts |
| server/brain/knowledge/ | Belief graph, dream links |
| server/brain/memory/ | Memory storage, index cache |
| server/brain/tasks/ | Task modules per type |
| server/brain/utils/ | Archive, topic extraction |
| server/services/ | Chat pipeline, memory ops, auth, entity runtime, LLM interface |
| server/routes/ | HTTP route handlers |
| server/contracts/ | Schemas, validators, installer contracts |
| client/js/apps/core/ | Core UI modules |
| client/css/ | System-shared styles (single namespace: sys-inline-XXXX) |
| skills/ | Pluggable skill directories |
| entities/ | Runtime entity data per entity |

---

## Contract Enforcement

Contracts enforce shapes at boundaries. Memory schema (v1), contributor output contracts, worker output contracts, installer package contracts — all have explicit shape definitions. Refactors are safe inside a module as long as boundary shapes are preserved.

---

## Phase Plan Discipline

Multi-step work follows: guard tests first (slice -0), then slices in order, never skip ahead. Update ledger and stop/resume snapshot after every slice.
