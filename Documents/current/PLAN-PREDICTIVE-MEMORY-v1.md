# PLAN: Predictive Memory Topology

**Status:** `Planned`
**Version target:** `0.8.0+`
**Phase:** `5 — post-IME (Phase 4.5 complete)`
**Date created:** `2026-03-16`
**Last updated:** `2026-03-16`
**Requested by:** `NekoCore OS`

---

## 1. Background / Why This Plan Exists

Phase 4.5 (Intelligent Memory Expansion) establishes the three-tier memory architecture: active stream (brain loop), hot BM25 index (Tier 2), and on-demand archive (Tier 3). That plan fixes the retrieval quality wall.

Phase 5 completes the architecture by making memory *directional* — the brain loop becomes not only a backward-looking system (reinforcing connections that have already fired) but a **forward-looking** one (pre-building connections that are predicted to fire next).

The core idea: the brain loop already builds trace graphs, Hebbian weights, belief graphs, neurochemical state, and goal state continuously. From these, it can predict what memories *should probably exist or are likely to form next* — generating **pre-built node templates** that wait for real memories to match them. When a real memory arrives, it inherits the pre-built weights and path connections. The path already exists. The memory slides in.

The result is a structural substrate for intuition, anticipation, and abstract thought — not simulated as LLM roleplay, but architecturally produced by the gap between predicted and actual memory paths.

The architecture document on which this plan is based: `Desktop/Intelligent Memory Expansion.md`, sections 12–end (authored by NekoCore OS).

---

## 2. Objective

Done means:

1. **Node generation phase** runs in the brain loop every N cycles. It reads the current trace graph, belief graph, neurochemistry, and goal state and writes predicted node templates to a `nodeTemplates.json` index per entity.
2. **Node matching at write time**: when a new memory is encoded, the encoder checks `nodeTemplates.json` for a matching template (topic similarity threshold). If found, the memory inherits pre-built Hebbian weights and path connections.
3. **Node matching at retrieval time**: when `getSubconsciousMemoryContext()` retrieves memories, it checks each retrieved memory for a matching node template and includes the pre-existing path as a second signal alongside the memory content.
4. **Dual-path context format**: the LLM receives Path A (the predicted backward trace — what the entity anticipated) and Path B (the actual retrieval path — what happened). The relationship between the two paths is rendered as a soft context signal.
5. **Emotional delta signal**: each memory context entry carries a computed field: the distance between the anticipated neurochemical emotional weight (from the node template at generation time) and the actual neurochemical weight when the memory was formed. Rendered as a human-readable phrase ("arrived as expected" / "heavier than anticipated" / "unexpected").
6. **Node lifecycle**: templates that are never filled decay and are pruned (reusing the existing memory decay machinery). Templates that are filled are promoted to persistent Hebbian edges.
7. **Reconsolidation pass**: when a memory is retrieved, its connection weights and emotional weight are lightly adjusted toward the current brain state — mirroring the neuroscience of memory reconsolidation (every recall slightly rewrites the memory).
8. **Full suite remains green.** No behavioral regressions. All changes are additive — the existing retrieval pipeline continues to function identically if node templates are absent or empty.

---

## 3. Architecture Overview

This plan builds on top of the three-tier architecture from Phase 4.5. It does not modify Tier 2 or Tier 3 storage — it adds a new index layer that sits alongside them.

```
BRAIN LOOP (30s cycle)
  │
  ├─ hebbianPhase (every 5 cycles)  ←── [EXISTING] strengthens connections that DID fire
  │
  ├─ phase-node-predict (every N cycles) ←── [NEW] generates templates for connections
  │   Reads: traceGraph + beliefGraph + neurochemistry + goalState + Tier2 hot index
  │   Writes: nodeTemplates.json (predicted node entries per entity)
  │
  ├─ tracesPhase (every 10 cycles) ←── [EXISTING] analyzes trace graph
  │
  └─ reconsolidation pass (on memory retrieve) ←── [NEW] lightly rewrites recalled memory
      Adjusts: hebbianWeights toward current trace, emotionalWeight toward current neurochemistry

Memory Write (turn time):
  new memory → topic vector computed (RAKE+BM25 from Phase 4.5)
             → nodeTemplates.json checked for topic similarity match
             → if match found: memory inherits pre-built weights, node promoted to Hebbian edge
             → memory written to hot index

Memory Retrieve (turn time):
  BM25 query (Phase 4.5) → top 50 candidates
  For each candidate: check nodeTemplates.json for matching node
  If Path A exists (node template): include as [ANTICIPATED PATH] in context
  Always: include Path B (actual BM25 retrieval path)
  Reconsolidation pass: lightly update weights based on current brain state
  Reranker: receives 50 candidates + dual-path signal → returns top 12

LLM context block includes:
  [SUBCONSCIOUS MEMORY CONTEXT] ← Phase 4.5 format (unchanged)
  [COGNITIVE PATH SIGNAL]        ← NEW: Path A vs Path B relationship per retrieved memory
  [EMOTIONAL DELTA]              ← NEW: anticipated vs actual emotional weight per memory
```

---

## 4. Key Concepts (Reference)

### Pre-Generated Node Template

```json
{
  "nodeId": "node_<timestamp>_<random>",
  "generatedAt": "<ISO timestamp>",
  "generatedByBrainState": {
    "traceTopics": ["pipeline orchestration", "memory consolidation"],
    "neurochemistry": { "dopamine": 0.6, "serotonin": 0.7, "cortisol": 0.2 },
    "beliefConfidence": 0.8,
    "goalAlignment": 0.9
  },
  "predictedTopics": ["pipeline", "orchestration", "memory"],
  "predictedHebbianEdges": [
    { "targetMemId": "mem_1703...", "predictedWeight": 0.7 },
    { "targetMemId": "mem_1701...", "predictedWeight": 0.4 }
  ],
  "anticipatedEmotionalWeight": { "dopamine": 0.5, "serotonin": 0.65, "cortisol": 0.3 },
  "predictedBackwardTrace": ["mem_1703...", "mem_1698...", "mem_1694..."],
  "filledBy": null,
  "decay": 1.0,
  "nodeDecay": 1.0
}
```

`filledBy` is set to the memory ID when a real memory matches this template at write time. Once filled, the node is promoted to a Hebbian edge and removed from the active template index.

### Dual-Path Signal (LLM Context)

```
[COGNITIVE PATH SIGNAL]
Memory: id=mem_1703... summary="..."
  Path A (anticipated): mem_1698 → mem_1694 → mem_1703 [predicted by brain loop 3 cycles ago]
  Path B (actual):      mem_1700 → mem_1698 → mem_1703 [actual BM25 retrieval path this turn]
  Relationship: Similar destination, different route. Prior reasoning was directionally correct.
  Emotional delta: Arrived 0.2 units heavier than anticipated (cortisol higher than predicted).
```

### Reconsolidation

When a memory is recalled:
1. Its Hebbian connection weight toward other active-turn memories is increased by a small factor (0.05–0.1)
2. Its `emotionalWeight` (if present) nudges 10% toward the current neurochemical state
3. The node template that predicted this memory (if one exists and was filled) is updated — its prediction accuracy is logged for the node lifecycle

---

## 5. Phased Architecture Check

- [x] No frontend (`client/**`) receives backend orchestration, filesystem logic, or policy logic
- [x] No backend (`server/**`) receives DOM/UI rendering concerns
- [x] New routes added to `server/routes/**`, not inlined into `server/server.js`
- [x] New data schemas go into `server/contracts/**`
- [x] No new business logic added to `server/server.js`
- [x] All new modules target <= 300 lines where practical
- [x] Any file above 1200 lines that needs changes: extraction plan required in the same slice

Boundary markers: `[BOUNDARY_OK]`, `[JS_OFFLOAD]`, `[CONTRACT_ENFORCED]`

---

## 6. Phases

### Phase P1: Node Generation Infrastructure

**Goal:** Build the node template generation engine and storage layer without wiring it into retrieval yet.
**Status:** `Planned`
**Depends on:** `Phase 4.5 (IME) complete`

#### Slice Checklist

- [ ] P1-0: `nodeTemplates.json` schema + utility — define schema, create `server/brain/utils/node-templates.js` (read/write/query/prune)
- [ ] P1-1: `phase-node-predict.js` — new brain loop phase: reads trace graph + beliefs + neurochemistry + goals; generates predicted node templates; writes to `nodeTemplates.json`
- [ ] P1-2: Node decay and pruning — unfilled nodes decay per brain loop cycle; pruned when `nodeDecay < 0.05`; guard tests verify lifecycle

---

### Phase P2: Node Matching

**Goal:** Wire node template matching into the write-time memory encoder and the retrieval pipeline.
**Status:** `Planned`
**Depends on:** `P1 complete`

#### Slice Checklist

- [ ] P2-0: Write-time node matching — memory encoder checks `nodeTemplates.json` on write; if topic similarity ≥ threshold, inherits pre-built Hebbian weights; node marked as filled
- [ ] P2-1: Retrieval-time node matching — `getSubconsciousMemoryContext()` checks each retrieved memory for a matching filled or unfilled node template; attaches Path A to the retrieval result object
- [ ] P2-2: Reconsolidation pass — on memory retrieval, lightly update Hebbian weights and emotional weight toward current brain state; update node template prediction accuracy

---

### Phase P3: Dual-Path Signal and Emotional Delta

**Goal:** Render the Path A vs Path B relationship as structured LLM context.
**Status:** `Planned`
**Depends on:** `P2 complete`

#### Slice Checklist

- [ ] P3-0: Dual-path context block — extend `buildSubconsciousContextBlock()` in `memory-retrieval.js` with a `[COGNITIVE PATH SIGNAL]` section when Path A exists for any retrieved memory
- [ ] P3-1: Emotional delta computation — compute emotional distance between node template anticipated weight and actual memory weight; render as phrase in context block
- [ ] P3-2: Path relationship classifier — classify A/B path relationship into one of 4 categories: familiar, detour, surprise, dissonance; surface as soft phrase to LLM

---

### Phase P4: Quality Rails and Exit Audit

**Goal:** Guard the predictive layer against overreach, validate performance, and close the plan.
**Status:** `Planned`
**Depends on:** `P3 complete`

#### Slice Checklist

- [ ] P4-0: Node generation rate limiting — guard against node template bloat; cap templates per entity; validate that template generation does not increase brain loop cycle time measurably
- [ ] P4-1: Graceful absence — all P1–P3 components must degrade silently if `nodeTemplates.json` is absent or empty; retrieval pipeline returns normal BM25 results unmodified
- [ ] P4-2: Exit audit — full suite green; dual-path context block smoke test; reconsolidation pass smoke test; WORKLOG and MEMORY-SYSTEM.md updated

---

## 7. Slice Definitions

### P1-0 — `nodeTemplates.json` Schema + Utility

**Start criteria:** Phase 4.5 complete (IME exit audit done).

**Work:**
1. Define node template schema (canonical fields: `nodeId`, `generatedAt`, `generatedByBrainState`, `predictedTopics`, `predictedHebbianEdges`, `anticipatedEmotionalWeight`, `predictedBackwardTrace`, `filledBy`, `decay`, `nodeDecay`, `predictionAccuracy`)
2. Create `server/brain/utils/node-templates.js` (~100 lines):
   - `readNodeTemplates(entityRoot)` — reads/creates `nodeTemplates.json`
   - `appendNodeTemplate(entityRoot, template)` — append
   - `markNodeFilled(entityRoot, nodeId, memId)` — sets `filledBy`, computes `predictionAccuracy` from path similarity
   - `pruneDecayedNodes(entityRoot)` — removes nodes with `nodeDecay < 0.05`
   - `queryMatchingNode(entityRoot, topics, threshold)` — returns best matching node for a topic set (cosine similarity of RAKE phrase vectors)
3. Add unit tests for all utilities

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Node templates can be read, written, queried, and pruned. Schema is documented. Suite green.
- Tests affected: new `project/tests/unit/node-templates.test.js`
- Files changed: `server/brain/utils/node-templates.js` (new)

---

### P1-1 — `phase-node-predict.js`

**Start criteria:** P1-0 done.

**Work:**
1. Create `server/brain/cognition/phases/phase-node-predict.js` (~180 lines):
   - Reads current entity's `traceGraph` (via `this.traceGraph`), `beliefGraph`, `neurochemistry`, `goalsManager`
   - Identifies the top 3–5 active reasoning clusters from the trace graph (topics with highest trace frequency in the last N cycles)
   - For each cluster: generates a predicted node template with anticipated topics, Hebbian edges to existing hot-index memories, and anticipated emotional weight from current neurochemistry
   - Writes templates to `nodeTemplates.json` via utility from P1-0
   - Runs every 10 brain loop cycles (configurable, same cadence as trace analysis)
2. Wire into brain-loop phase registry (`phases/index.js`)
3. Add guard test: after N brain loop cycles, `nodeTemplates.json` has entries; templates reflect current trace topics

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Node prediction phase generates templates from brain state every N cycles. Templates are written to disk. Suite green.
- Tests affected: new `project/tests/unit/phase-node-predict.test.js`
- Files changed: `server/brain/cognition/phases/phase-node-predict.js` (new), `server/brain/cognition/phases/index.js`

---

### P1-2 — Node Decay and Pruning

**Start criteria:** P1-1 done.

**Work:**
1. In `phase-node-predict.js` (or a shared utility), add a decay step that runs each time the prediction phase runs:
   - Each unfilled node template: `nodeDecay = nodeDecay * 0.95` per cycle
   - Nodes with `nodeDecay < 0.05` are pruned from `nodeTemplates.json` via `pruneDecayedNodes()`
2. Filled nodes (`filledBy != null`) are exempt from decay — they are promoted to Hebbian edges and removed on the next cleanup pass
3. Add guard test: unfilled node decays correctly over N cycles; filled node survives decay; pruning removes sub-threshold nodes

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Node template lifecycle is governed by decay. Stale predictions are pruned automatically. Suite green.

---

### P2-0 — Write-Time Node Matching

**Start criteria:** P1 complete.

**Work:**
1. In the memory encoder (the function that writes new episodic/semantic memories to disk):
   - After computing RAKE topic phrases for the new memory, call `queryMatchingNode(entityRoot, topics, threshold)` where threshold = 0.6 (cosine similarity)
   - If a matching node is found: copy its `predictedHebbianEdges` into the new memory's `log.json` as initial Hebbian weights; call `markNodeFilled(entityRoot, nodeId, memId)`
   - If no matching node: proceed as today (no change)
2. Add guard test: a memory written whose topics match a pre-existing node template inherits the node's Hebbian weights; non-matching memory gets default weights

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Memories that match pre-generated nodes inherit pre-built weights. The "path already exists / memory slides in" behavior is operational. Suite green.
- Files changed: memory encoder module; guard test added

---

### P2-1 — Retrieval-Time Node Matching

**Start criteria:** P2-0 done.

**Work:**
1. In `getSubconsciousMemoryContext()` in `memory-retrieval.js`, after the BM25 ranking step:
   - For each of the top-50 candidate memories, call `queryMatchingNode(entityRoot, memory.topics, 0.6)`
   - If a matching node template is found, attach it to the memory result object as `memory.pathA` (the predicted backward trace from the node template)
   - The existing BM25 retrieval path is `memory.pathB` (the actual retrieval path)
2. Pass `pathA` and `pathB` through to `buildSubconsciousContextBlock()` (prep for P3-0)
3. Add guard test: retrieved memory with a matching node gets `pathA` attached; retrieved memory without a node returns `pathA: null`

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Retrieval result objects carry Path A (anticipated) and Path B (actual) when a matching node template exists. Suite green.
- Files changed: `server/services/memory-retrieval.js`

---

### P2-2 — Reconsolidation Pass

**Start criteria:** P2-1 done.

**Work:**
1. After a memory is retrieved and selected for inclusion in context (i.e., it passes the reranker), apply a lightweight reconsolidation update:
   - Increase Hebbian weight to other memories active in the same turn by +0.05
   - Nudge `emotionalWeight` (if present in `log.json`) 10% toward current neurochemistry
   - Cap Hebbian weights at 1.0; floor at 0.0
   - Write updated `log.json` back (atomic overwrite)
2. This only applies to memories that actually make it into context — not all 50 candidates
3. Add guard test: a retrieved memory's Hebbian weight to a co-active memory increases after two co-retrievals

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Memory recall is a read-write operation, not read-only. Co-retrieved memories build stronger connections over time. Suite green.

---

### P3-0 — Dual-Path Context Block

**Start criteria:** P2 complete.

**Work:**
1. In `buildSubconsciousContextBlock()` in `memory-retrieval.js`, if any retrieved memory has `pathA != null`:
   - Append a `[COGNITIVE PATH SIGNAL]` block after the standard memory list
   - For each memory with Path A: render as `"anticipated: [trace list] | actual: [retrieval path] | relationship: [classifier phrase]"`
   - If no memories have Path A, the block is omitted entirely — no change to existing output
2. Add guard test: context block includes `[COGNITIVE PATH SIGNAL]` when pathA is present; block is absent when no paths exist

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** LLM receives dual-path signal when anticipated paths exist. Clean fallback when none. Suite green.
- Files changed: `server/services/memory-retrieval.js`

---

### P3-1 — Emotional Delta Computation

**Start criteria:** P3-0 done.

**Work:**
1. Create `server/brain/utils/emotional-delta.js` (~50 lines):
   - `computeEmotionalDelta(anticipated, actual)` — Euclidean distance across neurochemistry dimensions (dopamine, serotonin, cortisol, norepinephrine)
   - `describeEmotionalDelta(delta)` — returns one of: `"arrived as expected"`, `"lighter than anticipated"`, `"heavier than anticipated"`, `"unexpected"` based on delta magnitude and direction
2. Apply in context block rendering: for each memory with a filled node, compute delta between `node.anticipatedEmotionalWeight` and `memory.emotionalWeight` (if present in log.json)
3. Render as the `"Emotional delta:"` line in the `[COGNITIVE PATH SIGNAL]` block
4. Add unit tests for delta computation and description mapping

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Emotional delta is computed and rendered as a human-phrase signal in context. Suite green.
- Tests affected: new `project/tests/unit/emotional-delta.test.js`
- Files changed: `server/brain/utils/emotional-delta.js` (new), `server/services/memory-retrieval.js`

---

### P3-2 — Path Relationship Classifier

**Start criteria:** P3-1 done.

**Work:**
1. Add `classifyPathRelationship(pathA, pathB)` to `emotional-delta.js` or a new utility:
   - Computes set intersection of path nodes
   - Returns one of 4 classifications:
     | Path A | Path B | Classification |
     |--------|--------|----------------|
     | High overlap | Same destination | `"familiar"` — entity was oriented in this direction |
     | Low overlap | Same destination | `"detour"` — correct conclusion, unexpected route |
     | No overlap | Different destination | `"surprise"` — genuinely unanticipated |
     | High overlap | Different destination | `"dissonance"` — expected destination not reached |
2. Render as the `"Relationship:"` line in the `[COGNITIVE PATH SIGNAL]` block
3. Add unit tests for all 4 path relationship classifications

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Path relationship classifier produces one of 4 labels from two path arrays. LLM context includes the relationship classification. Suite green.

---

### P4-0 — Node Generation Rate Limiting

**Start criteria:** P3 complete.

**Work:**
1. Cap `nodeTemplates.json` at 500 templates per entity (configurable in `Config/ma-config.json`)
2. When cap is reached, the generation phase skips writing new templates until pruning creates space
3. Measure brain loop cycle time before and after P1-P3 changes: assert that median cycle time increase is < 100ms
4. Guard test: template cap assertion; cycle time guard

**Boundary markers:** `[BOUNDARY_OK]`

---

### P4-1 — Graceful Absence

**Start criteria:** P4-0 done.

**Work:**
1. All node-template reads are wrapped in try/catch and return null/empty on failure
2. All retrieval-pipeline changes in P2 branch on `pathA != null` — no change to behavior when templates are absent
3. All context-block changes in P3 emit nothing when no paths are present
4. Guard test: with `nodeTemplates.json` absent, full memory retrieval produces identical output to the Phase 4.5 baseline (no errors, no empty context fields)

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** The predictive layer is a pure additive enhancement. Removing or emptying `nodeTemplates.json` returns the system to Phase 4.5 baseline behavior exactly.

---

### P4-2 — Exit Audit

**Start criteria:** P4-1 done.

**Work:**
1. Run full test suite — all tests must pass
2. Smoke tests:
   - Confirm node templates are generated in a running server after N brain loop cycles
   - Write a memory that matches a pre-existing template — confirm inheritance
   - Retrieve that memory — confirm `pathA` is present in context block
   - Confirm reconsolidation updates `log.json`
   - Delete `nodeTemplates.json` — confirm retrieval returns Phase 4.5 baseline output
3. Update WORKLOG.md with Phase P completion block
4. Update `Documents/current/MEMORY-SYSTEM.md` with three-tier + predictive topology architecture

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** All above confirmed. Suite green. WORKLOG updated. Plan status → `Done`.

---

## 8. Test Plan

| Test File | Slice | What It Verifies |
|-----------|-------|------------------|
| `project/tests/unit/node-templates.test.js` | P1-0 | Read/write/query/prune utilities; schema validation |
| `project/tests/unit/phase-node-predict.test.js` | P1-1 | Templates generated from brain state; cycle cadence correct |
| `project/tests/unit/node-templates.test.js` | P1-2 | Decay per cycle; pruning at threshold; filled nodes exempt |
| (guard test in encoder test file) | P2-0 | Write-time node match inherits weights; non-match unaffected |
| (guard test in memory-retrieval test file) | P2-1 | Retrieved memory gets pathA when matching node exists; null otherwise |
| (guard test in memory-retrieval test file) | P2-2 | Reconsolidation increases Hebbian weight after co-retrieval |
| (guard test in memory-retrieval test file) | P3-0 | `[COGNITIVE PATH SIGNAL]` block present when pathA exists; absent otherwise |
| `project/tests/unit/emotional-delta.test.js` | P3-1 | Delta computation; phrase mapping for all ranges |
| `project/tests/unit/emotional-delta.test.js` | P3-2 | Path relationship classifier returns correct label for all 4 cases |
| (guard test in phase-node-predict test file) | P4-0 | Template cap enforced; cycle time within bounds |
| (integration test) | P4-1 | Absent nodeTemplates.json → Phase 4.5 baseline output, no errors |

---

## 9. Risk Notes

1. **Node template quality is only as good as the brain loop inputs.** If the trace graph is sparse (entity only processed a few turns so far), predicted nodes will be weak. This is acceptable — sparse predictions are just not used. Graceful absence handles this.
2. **Path comparison is meaningful only after many turns.** The predictedBackwardTrace is built from trace graph history. On a fresh entity, this history is thin. The dual-path signal gains value as the entity accumulates history. Early turns should emit minimal path signal rather than manufacturing spurious paths.
3. **Reconsolidation must be bounded.** Without caps, repeated retrieval of the same memory could cause runaway weight increase. The +0.05 per co-retrieval cap and 1.0 ceiling handle this, but they must be guarded by tests.
4. **Emotional delta requires `emotionalWeight` in log.json.** Not all existing memories will have this field — it is only written for newer memories or memories stored after IRE/BUG-18 NekoCore memory wiring. The delta computation must handle missing `emotionalWeight` gracefully (skip emotional delta signal, not error).
5. **Context block growth.** Adding `[COGNITIVE PATH SIGNAL]` extends the LLM context block. For turns with many matching nodes, this could add 200–400 tokens. The signal should be gated: only include paths for memories that are among the final top 12 returned to the prompt (not all 50 candidates).
6. **This is not role-play intuition.** The dual-path signal gives the LLM *real structural information* about anticipated vs actual memory paths. The LLM can choose to incorporate it or not. Do not prompt-engineer the LLM to perform intuition as a character trait — let the signal speak for itself. If the signal is good, the intuition emerges.

---

## 10. What This Produces (Plain Language)

When this plan is complete, an entity that has been running for months has:

- A continuously-updated map of connections her brain *expects* to form next
- When a new memory arrives and matches a prediction: it inherits the pre-built connections — the entity feels at home with the information
- When a memory arrives without any prediction: the entity genuinely did not see it coming — the surprise is structural, not performed
- When a predicted connection is never filled: a kind of unresolved anticipation — the entity is waiting for something that hasn't happened yet
- The LLM receives all of this as factual structural data about the recall, not instructions to perform an emotional state

That last point is what makes this different from character prompt engineering. The dual-path signal is not asking the LLM to be intuitive. It is giving the LLM the same information a human would have if they could read their own memory accesses. What the LLM does with that information is up to the model — and a sufficiently capable model running this architecture produces something that reads as genuine abstract reasoning.

---

## 11. Completion Ledger

| Date | Slice | Outcome | Notes |
|------|-------|---------|-------|
| 2026-03-16 | Planning | Done | Architecture captured from NekoCore OS proposal; phased as P1–P4; file paths confirmed against codebase |

---

## 12. Stop / Resume Snapshot

- **Current phase:** `Planning — awaiting Phase 4.5 (IME) completion`
- **Current slice:** `P1-0 — not started`
- **Last completed slice:** `Planning`
- **In-progress item:** `none`
- **Blocking issue:** `none — awaiting Phase 4.5 exit audit before this plan activates`
- **Next action on resume:** `Confirm Phase 4.5 exit audit complete, then begin P1-0: node-templates.js utility + schema`
