# REM System — Cognitive Pipeline

Reference doc for MA when building or extending the pipeline and orchestration layer.

---

## Pipeline Overview

Incoming user turns first classify for task intent. High-confidence tasks dispatch to MTOA (Modular Task Orchestration). Low confidence falls to the companion pipeline: Subconscious (1A) and Dream-Intuition (1D) run in parallel, then Conscious (1C) reasons with all context, then the Orchestrator voices the response.

Post-turn side effects (memory encoding, relationship update) run asynchronously after response is sent.

---

## Pipeline Flow

```
User Input
    │
    ├─ Task fork? ──yes──→ MTOA: classify → contextualize → execute
    │                        └── Frontman events → SSE → Client
    │
    └─ No ──→ Companion Pipeline:
              ├── 1A Subconscious (parallel)  ── memory retrieval, relationship context
              ├── 1D Dream-Intuition (parallel) ── abstract associations, lateral links
              │
              └── Both complete → 1C Conscious ── full reasoning draft
                                    │
                                    └── Orchestrator (Final) ── review + voice
                                           │
                                    ┌──────┴──────┐
                                    v              v
                              Memory Encode   Relationship Update
                              (async)         (async)
```

**LLM calls per message:** 4 synchronous (1A, 1D, 1C, Final) + optional chatlog reconstruction + up to 2 async post-turn.

---

## Contributor Phases

### 1A — Subconscious
- Memory retrieval scoring: `relevanceScore = baseWeight × (0.35 + importance × decay)`
- Assembles: activated memories + conversation recall + relationship context
- Filters doc_* entries and boilerplate markers
- Outputs: emotion signals, topic signals, memory observations

### 1D — Dream-Intuition
- Receives turn signals (subject, event, emotion, tension — extracted deterministically, no LLM)
- Generates abstract associations, lateral links, creative metaphors
- Runs parallel with 1A. Has NO memory write access — intuition only

### 1C — Conscious
- Waits for both 1A and 1D to complete
- Full cognitive context: memories + relationships + creative associations
- Produces primary reasoned response draft
- Can request tools via `[TOOL: ...]` tags
- MUST NOT generate `[TASK_PLAN]` when a single `[TOOL:]` call suffices

### Final — Orchestrator
- Receives: user message + full 1A/1D context + Conscious draft
- Reviews for coherence and fit, delivers in entity's authentic voice
- Does NOT re-synthesize — shapes HOW it's said, not WHAT
- Passes through tool and task tags unchanged

---

## Orchestration Policy

### O2 Escalation
Triggers: high-tension, error-constraint-combo, planning-implementation-combo, user-requested-depth.

### Budget Guard
Token cap enforcement. If total exceeds cap: forces no-escalation.

### Latency Guard
35,000ms timeout race on Final synthesis. On timeout: falls back to default runtime, then Conscious output.

---

## Task Orchestration (MTOA)

Pre-orchestrator task fork in `chat-pipeline.js`:
1. `detectAndDispatchTask` classifies the turn
2. If task: create/resume session → gather context by type → execute steps
3. Frontman emits lifecycle events over SSE: task_milestone, task_needs_input, task_complete, task_error

Task types: code, research, writing, analysis, project, memory_query

---

## Worker Entity Subsystem

Any contributor aspect (1A, 1C, 1D) can be bound to a separate Worker Entity in subsystem mode. Workers override the contributor's default LLM call. Registered via worker-registry.js (in-memory Map by aspect key).

---

## Turn Signals

Extracted deterministically (no LLM): subject, event, emotion, tension. Fed to Dream-Intuition. Also used for topic extraction and archival routing.

---

## Best Practices

1. Keep Promise.all for parallel contributors — never serialize 1A and 1D
2. Orchestrator is voicer/reviewer only — never add reasoning to Final pass
3. Post-turn memory encoding must be async — never block response delivery
4. Budget and latency guards are non-negotiable safety rails
5. Tool calls use `[TOOL: name; params]` syntax — parsed and executed between passes
6. Task dispatch precedes companion pipeline — check task intent first
7. System prompt assembly goes through context-consolidator — never hardcode
