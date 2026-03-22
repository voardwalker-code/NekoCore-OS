# Layer 4 — Dream / Brain Loop / Beliefs

## Pre-Requisite
- Layer 3 tests pass: `node tests/test-runner.js 3`

## Scope
Fill in all NOT_IMPLEMENTED stubs in:
1. `server/cognition/brain-loop.js` — 5-phase sleep cycle orchestrator
2. `server/cognition/decay.js` — Memory decay with importance shielding
3. `server/cognition/consolidation.js` — Episodic → semantic compression
4. `server/cognition/dream-engine.js` — Dream generation from memory seeds
5. `server/cognition/belief-graph.js` — Emergent belief discovery

## Instructions Per Module

### decay.js — `runDecayPhase(memoryOps)`
- Walk all memories via `memoryOps` underlying storage
- For each non-exempt memory:
  ```
  newDecay = currentDecay × (1 - 0.01 × (1 - importance × 0.7))
  newDecay = Math.max(newDecay, 0.1)  // floor
  ```
- Skip memories where `semantic_exempt === true`
- Update each record with new decay value
- Return { processed: N, decayed: N, exempt: N, belowFloor: N }

### consolidation.js — `runConsolidationPhase(memoryOps)`
- **findConsolidationGroups(memories)**:
  1. Filter memories with decay < 0.3 (heavily decayed)
  2. Group by shared topics (2+ topics in common = same group)
  3. Each group needs 3+ memories to be worth consolidating
  4. Return array of groups

- **runConsolidationPhase(memoryOps)**:
  1. List all memories
  2. `findConsolidationGroups(memories)` → groups
  3. For each group:
     a. Concatenate summaries
     b. Extract common themes via `yake.extractKeywords(combined, 5)`
     c. Create new semantic memory: `memoryOps.createSemanticKnowledge({ topic, summary: compressed })`
     d. Mark original episodic memories as `consolidated: true`
  4. Return { groupsFound, memoriesConsolidated, semanticCreated }

### dream-engine.js — `runDreamPhase(memoryOps, llm, entityState, entityId)`
- **selectDreamSeeds(memories, count)**:
  1. Score each: `importance × 0.6 + recency × 0.4` (recency = normalize last_accessed)
  2. Add randomness: multiply by `0.8 + Math.random() * 0.4`
  3. Sort descending, take top `count` (default 5)

- **runDreamPhase(...)**:
  1. List memories, select 5 dream seeds
  2. Load entity persona for voice constraints
  3. Build dream prompt: "Given these memory fragments, generate creative connections..."
  4. Call LLM with **temperature 0.95** (maximum creativity)
  5. Parse dream output: extract new connections/associations
  6. Store dream as a new memory: `memoryOps.createCoreMemory({ type: 'dream', ... })`
  7. Return { dreamSeeds, dreamContent, stored: true }

### belief-graph.js — `createBeliefGraph(entityDir)`
- **Data structure**: Topic co-occurrence matrix
  - `beliefs`: Map<topic, { strength, evidence: string[], firstSeen, lastSeen }>
  - Stored as `beliefs.json` in entity directory

- **discoverBeliefs(memories)**:
  1. Build topic co-occurrence matrix from all memories
  2. For topic pairs appearing in 3+ memories: generate candidate belief
  3. Score belief strength by evidence count
  4. Beliefs are emergent — they come FROM the memories, not predefined
  5. Return new beliefs discovered

- **getBeliefs()**: Return all beliefs from in-memory cache
- **getBeliefsByTopic(topic)**: Filter beliefs containing given topic
- **loadBeliefs()**: Read beliefs.json from entity dir
- **saveBeliefs()**: Write beliefs.json to entity dir

### brain-loop.js — `createBrainLoop(deps)`
- **isSleepDue(entityId)**:
  1. Check last sleep timestamp for entity
  2. If > threshold (e.g. 6 hours or 50 turns), return true
  3. Return { due: boolean, reason, lastSleep, turnsSince }

- **runSleepCycle(entityId)**:
  Execute 5 phases IN ORDER:
  1. **Decay**: `deps.decayModule.runDecayPhase(deps.memoryOps)`
  2. **Consolidation**: `deps.consolidation.runConsolidationPhase(deps.memoryOps)`
  3. **Dream**: `deps.dreamEngine.runDreamPhase(deps.memoryOps, deps.llm, deps.entityState, entityId)`
  4. **Beliefs**: `deps.beliefGraph.discoverBeliefs(allMemories)`
  5. **Identity Reinforcement**: If evolution mode, update persona with any new beliefs
  - Return { phases: [results...], duration, timestamp }
  - If ANY phase throws, catch it, log it, continue to next phase (resilient)

## Done When
```bash
node tests/test-runner.js 4
# All tests pass
```

## After Completion
Update `PROJECT-MANIFEST.json`: layer 4 → "complete", all 5 modules → "implemented"
