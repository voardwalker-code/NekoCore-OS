# REM System — Vision and Roadmap

Last updated: 2026-03-14

---

## What Is This File

This document consolidates the product direction and open-source release plan into a single reference. It draws from `long-term-vision-agent-echo.md` and `open-source-release-playbook.md` (preserved unchanged in the parent `Documents/` folder).

Current execution note (2026-03-14):
1. Near-term work is interface-first: make shell/app flows intuitive and reliable.
2. Browser strategy follows `NEKOCORE-BROWSER-ROADMAP.md` (embedded-engine path with compliance guardrails).
3. Browser scope lock is active: app-on-engine only, no bypass-class feature direction.
4. Contributor provenance baseline for browser phase is DCO.

Working phase statement:
1. REM System (Recursive Echo Memory) is the core system we have now.
2. The active phase is NekoCore: building the OS environment layer on top of REM.
3. Interface quality is a prerequisite milestone, not optional polish. We identified that UX friction was slowing everything down and must be solved before the next phase.
4. NekoCore OS is planned as a hybrid Human/LLM environment, with REM at the core.

---

## Core Vision — REM to NekoCore to AgentEcho

### Phase Progression

**Phase 1: Hubslie**
Proved that mixed human + LLM group-chat interaction can feel collaborative. A frontman-style orchestrator coordinating multiple agents for a single user goal was validated. Missing: deeper reasoning logic, reliable specialization and continuity at scale.

**Phase 2: Memory Architect**
Solved the context window problem. Chatlog compression enabled cross-session, cross-model continuity with meaningfully lower token overhead. This was the practical bridge beyond classic heavy RAG patterns.

**Phase 3: REM System / Echo (current)**
The Evolution Target:
- **Persistent memory + personality** — entities carry who they are across sessions
- **Orchestrated specialization** — task routing to the right entity for the job
- **Task execution + companionship** — both function and relationship, in one coherent system

**Phase 4: NekoCore OS Environment (current active phase)**
The immediate build target:
- **OS environment on top of REM** — NekoCore uses REM as its cognitive foundation
- **Interface-first execution** — make every core flow intuitive, discoverable, and reliable
- **Entity-centered operating model** — entity management and runtime orchestration become first-class OS capabilities

**Phase 5: AgentEcho Evolution (target)**
Where NekoCore grows next:
- Start small, as Hubslie did, then scale toward a full AgentEcho orchestration model
- Move from proof-of-concept entity management into workforce-style entity orchestration
- Preserve Human + LLM hybrid operation while increasing autonomous coordination capability

---

## Current NekoCore Phase (Execution Focus)

### Why interface work is first

We identified a hard blocker:
1. The interface was holding system capability back.
2. Users could not reliably discover or use core features quickly.
3. Without intuitive UX, expanding orchestration and entity workflows would create complexity debt.

Therefore, current execution order is:
1. Fix interface and interaction quality.
2. Stabilize OS-like app flows and runtime lifecycle behavior.
3. Expand NekoCore into deeper entity-driven orchestration.

### Browser scope lock for this phase

NekoCore Browser is locked to:
1. Embedded-engine browser application direction.
2. NekoCore-owned policy, UX, and LLM tooling layers.

Explicit non-goals:
1. No custom rendering engine work in this phase.
2. No bypass features (DRM/paywall/CSP/frame-header circumvention).
3. No silent persistence of page content without user-directed intent.

### Current goal

Create a NekoCore OS environment that uses REM System to operate more efficiently.

This means:
1. Human users can operate in a clear desktop-style app shell.
2. LLM entity cognition is persistent and context-aware through REM.
3. The OS layer can manage entity lifecycle and system organization with lower friction.

### Entity at the core of NekoCore OS

Planned core behavior for the central entity:
1. Track what exists in the system and where it lives.
2. Understand how components are used.
3. Audit and report system state.
4. Create, edit, and delete entities.
5. Act as the operational bridge between human workflows and LLM workflows.

Note on current implementation status:
1. Current entity creation and management is a proof of concept for this end goal.
2. Capability will expand in phases as interface and runtime stability milestones are completed.

### Single-Entity, Multi-LLM core

NekoCore currently runs a 4-part multi-LLM AI stack as one entity pipeline:
1. Subconscious (1A)
2. Dream-Intuition (1D)
3. Conscious (1C)
4. Final Orchestrator

This is treated as one cohesive entity mind, not four separate chatbots.

---

## Target Architecture — Agent Echo as Workforce Orchestrator

The long-term product goal is for **Agent Echo** to act as a frontman orchestrator for a dynamic entity workforce.

### Echo Responsibilities
- Intake user goals
- Build execution plans
- Define required job roles
- Select and assign entities from the user's entity contact list
- Coordinate handoffs between entities
- Maintain progress and accountability
- Synthesize outputs back to the user

### Interaction Modes Under Consideration

**Mode A — Group-Chat Visible Orchestration**
Echo brings entities into the shared chat when direct clarification is needed. Entities can ask the user questions directly when information is missing. Multiple entities can coordinate in real time.

**Mode B — Echo-Only Interface**
User sees one surface: Echo. Internal orchestration is visible only as scoped identity labels like `Agent Echo(EntityName)`. Cleaner, but less transparent.

Both modes should remain compatible with the same orchestration core.

---

## Entity Workforce Governance Concept

When entities execute task roles, performance accountability is needed. Proposed policy:

| Step | Action |
|------|--------|
| 1 | Verbal warning |
| 2 | Written warning — user notified |
| 3 | Final warning / probation — increased monitoring |
| 4 | Automatic removal from active role assignment |

This prevents silent failures when an assigned entity is underperforming on a critical task.

---

## Open-Source Release Readiness

### Release Goals
- Preserve credibility on first public drop
- Minimize immediate issue chaos
- Highlight novelty (cognitive architecture, not just chat UI)
- Attract contributors and signal technical depth

### Repo Hygiene (Before Public Release)
- [ ] Remove or sanitize any local secrets, API keys, tokens, or private endpoints
- [x] Verify `.gitignore` covers entity runtime artifacts and local config files
- [ ] Ensure no personal/private test data is committed in `entities/` or `memories/`
- [ ] Confirm no absolute local paths remain in docs or code comments
- [ ] Run a final sweep for `TODO`, `FIXME`, `HACK` and decide what stays

Quick scan commands:
```bash
rg -n "sk-|api[_-]?key|token|secret|password"
rg -n "TODO|FIXME|HACK"
```

### Documentation Baseline (Before Public Release)
- [ ] README has a clean Quick Start that works on a fresh machine
- [ ] Add `What Works Today` section
- [ ] Add `Known Limitations` section
- [ ] Add architecture index linking docs in `Documents/`
- [x] Add a "Safety and Behavior" note clarifying persona and autonomy boundaries
- [ ] Add `CONTRIBUTING.md` with branch and PR expectations
- [ ] Add `CODE_OF_CONDUCT.md`
- [ ] Add issue templates (bug report, feature request, question)

### Stability Gates (Must Pass Before Public Release)
- [ ] Chat send/receive works end-to-end
- [ ] Document ingest works for both select and drag-drop
- [ ] Reconstruct works for `long_term_memory` and `knowledge_memory`
- [ ] Shutdown from UI performs full graceful cycle and exits cleanly
- [ ] Brain loop survives at least 20 cycles without fatal break
- [ ] Entity switch + reload preserves expected memory continuity

### Contract and Schema Gates
- [ ] Canonical response shapes established for `/api/chat`, `/api/document/ingest`, `/api/memories/reconstruct`
- [ ] Non-null fields normalized (no null/array shape drift)
- [ ] `memorySchemaVersion` defined and documented
- [ ] Legacy adapter behavior documented
- [ ] Migration strategy documented for older document chunks

### Tests and Verification
- [ ] Add smoke test script (manual is fine for first release)
- [ ] At least one test each for: memory store/retrieve, reconstruct route, shutdown path
- [ ] Run `npm test` clean and store pass count in release notes
- [ ] Verify startup from a clean clone + config on a second machine

---

## Branch Plan for First Public Release

```
main          — stable public branch
develop       — active integration
feature/*     — individual features
release/*     — release staging
```

Suggested first release tag: `v0.5.2-prealpha` or `v0.6.0-prealpha` after refactor stabilizes.

Suggested 0.6.0 release commit sequence:
```bash
git checkout main
git pull origin main
git add -A
git commit -m "release: 0.6.0-prealpha server decomposition and worker subsystem"
git tag -a v0.6.0-prealpha -m "REM System 0.6.0-prealpha"
git push origin main
git push origin v0.6.0-prealpha
```

### Browser Contributor Provenance (NB-0-4)

Policy decision:
1. Use DCO for contributor provenance in browser-phase work.
2. Browser-related PRs require commit sign-offs.
3. CLA is not selected at this phase.

---

## Feature Milestones (Toward 0.6.0)

| Milestone | Status | Notes |
|-----------|--------|-------|
| Parallel contributor pipeline | ✅ Live | 1A + 1C + 1D parallel via Promise.all |
| Multi-user + relationships | ✅ Live | User profiles, 14-value feeling scale, trust/rapport |
| server.js decomposition | ✅ Live | −46%, composition-first server bootstrap |
| Worker entity subsystem | ✅ Live | Registry + dispatcher + output contract |
| Escalation guardrails | ✅ Live | O2 budget cap, latency guard, reason telemetry |
| Dream pipeline split | ✅ Live | Live intuition (no writes) vs offline maintenance |
| Authentication system | ✅ Live | Login, sessions, account management |
| Unbreakable Identity mode | ✅ Live | Origin story locked as permanently authoritative |
| Desktop shell usability refactor | ✅ Live | Launcher categories, pinned behavior hardening, user/power clarity |
| Browser app UX pass | ✅ Live | In-app search home/results/page model, minimized-results recovery |
| NekoCore Browser roadmap draft | ✅ Planned Baseline | `NEKOCORE-BROWSER-ROADMAP.md` defines phased engine-based path |
| **Agent Echo orchestrator** | ⬜ Planned | Multi-entity task routing and workforce management |
| **Worker entity groups** | ⬜ Planned | Entity contact list + role assignment |
| **Group-chat interface** | ⬜ Planned | Mode A: multiple entities in shared chat |
| **Echo-only interface** | ⬜ Planned | Mode B: single Echo surface with internal routing |
| Vector embedding retrieval | ⬜ Proposed | Replace lexical topic index with semantic vector search (see Architecture Change below) |
| **Public release readiness** | ⬜ Planned | Repo hygiene + docs + stability gates |

---

## Proposed Architecture Change — Vector Embedding Retrieval

Last updated: 2026-03-16

### Current Bottleneck

The memory retrieval system has a hard quality wall that appears at approximately **2,000 stored memories**. The root cause is lexical topic matching.

**How retrieval works today:**
1. User message is tokenized into topic keywords (`extractSubconsciousTopics`)
2. `topicIndex.json` maps each keyword → list of memory IDs
3. Score = topic overlap count × importance × decay
4. Top 36 IDs are ranked, top ~12 passed to the prompt

**Why this breaks down at scale:**
- Two memories about the same thing but using different words never match: *"system architecture overview"* and *"structural design of the pipeline"* share zero topics
- As the topic bucket for common words like `memory`, `system`, `entity` grows, every query fills its top-36 window with noisy broad matches
- The retrieval window is fixed at 36 — at 2,000 memories that is only 1.8% sampled, and keyword collision means the 1.8% is low quality
- `topicIndex.json` is a single JSON file loaded and rewritten on every memory write — at 50,000+ memories this becomes a multi-second I/O bottleneck
- `readdirSync` directory scans used by the Visualizer iterate the entire `semantic/` folder on every request

**Hard numbers:**
| Scale | Quality | Dir scan | Index parse |
|-------|---------|----------|-------------|
| < 500 memories (~1.75 MB) | Good | < 5ms | negligible |
| 500–2,000 (~7 MB) | Degrading | 20–100ms | 10–50ms |
| 2,000–10,000 (~35 MB) | Poor | 100ms–1s+ | 50–500ms |
| > 10,000 (~35 MB+) | Broken | seconds | seconds |

Note: disk size is **not** the bottleneck. At 2,000 memories the total on-disk footprint is only ~7 MB. The count wall is always hit first.

---

### Proposed Fix: Embedding-Based Retrieval

**Core idea:** Generate a dense vector embedding for each memory at write time. Replace `topicIndex.json` with a vector index. Retrieval becomes *"embed the query, find the nearest neighbors"* — purely mathematical, no vocabulary overlap required.

**What this unlocks:**
- Semantic equivalence: *"pipeline orchestration"* matches *"how tasks get routed"* because the embedding space puts them near each other
- Scales to millions of memories with sub-millisecond lookup (HNSW approximate nearest neighbors)
- Zero LLM calls for retrieval — embedding models are small (50–300MB), fast (< 10ms/query), run fully local
- Enables cross-entity memory similarity: NekoCore could find related memories across all entities
- Dream consolidation quality improves dramatically — related memories cluster naturally

**Proposed implementation path:**

1. **Embedding model** — Use Ollama with `nomic-embed-text` (137M params, 768-dim vectors, MIT license). Falls back to a WASM in-process model if Ollama not available. Zero new API key requirements.

2. **Vector store** — `sqlite-vec` (SQLite extension, single `.db` file, no external process). Alternatively `hnswlib-node` for pure in-process HNSW. Both are < 1MB dependencies.

3. **Write path change** — After writing `log.json` + `semantic.txt`, call `embedder.embed(semanticText)` and upsert the 768-dim vector into the vector store keyed by `memId`.

4. **Read path change** — Replace `topicIndex.getMemoriesByTopic()` with `vectorStore.nearest(queryEmbedding, 50)`. Scoring still blends with importance/decay/emotion similarity.

5. **`topicIndex.json` retained as fallback** — Keep it for the reranker and graph builder, but remove it from the hot retrieval path.

6. **Migration** — One-time background job: iterate all existing `semantic/*/semantic.txt`, generate embeddings, populate the vector store. Estimated time: ~5 min for 2,000 memories on CPU.

**Deployment requirement:** Ollama running locally (already the standard recommended setup for NekoCore OS). No cloud dependency, no new API key, no billing exposure.

**Trade-off:** This adds a startup dependency on an embedding model. Mitigation: graceful degradation — if the embedding service is unavailable, fall back to current lexical retrieval with a console warning.

---

### Why This Is Phase 5+, Not Now

- Current scale is well under 2,000 memories — the problem is not urgent yet
- The current architecture is simpler to debug, run, and contribute to
- sqlite-vec / hnswlib introduce native dependencies that require node-gyp build tooling — adds contributor friction
- The soft-limit meter added (2026-03-16) gives users visible warning before they hit the wall
- This should be scoped as a dedicated milestone after the Phase 3 modularization closes, giving a clean extraction point for the retrieval subsystem
