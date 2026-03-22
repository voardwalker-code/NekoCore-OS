# Layer 1 — Memory Operations

## Pre-Requisite
- Layer 0 tests pass: `node tests/test-runner.js 0`

## Scope
Fill in all NOT_IMPLEMENTED stubs in:
1. `server/memory/memory-ops.js` — High-level memory operations built on storage + index

## Instructions

### memory-ops.js
This module composes storage + index + NLP into meaningful operations:

- **createCoreMemory(opts)**:
  1. Build record via `memorySchema.createMemoryRecord({ type: 'episodic', ...opts })`
  2. Validate with `memorySchema.validateMemoryRecord(record)`
  3. Call `storage.writeMemory(record, opts.content || opts.summary)`
  4. Extract topics with `rake.extractPhrases(opts.summary)` → take top 5
  5. Call `index.addToIndex(record, topics)`
  6. Return record

- **createSemanticKnowledge(opts)**:
  1. Same as createCoreMemory but type = 'semantic'
  2. Set `record.decay = 1.0` (semantic exempt from decay but starts at 1.0)
  3. Set `record.semantic_exempt = true`

- **dualPathEncode(message, response, context)**:
  1. Call `createCoreMemory({ topic: context.topic, summary: message, content: response })`
  2. If response contains significant knowledge (length > 500 and importance > 0.7):
     Call `createSemanticKnowledge({ topic: context.topic, summary: extracted_knowledge })`
  3. Return { episodic: record1, semantic: record2 || null }

- **retrieveMemories(query, opts)**:
  1. Extract keywords from query via `rake.extractPhrases(query, 8)`
  2. For each keyword, `index.lookupByTopic(keyword)` → collect candidate IDs
  3. Deduplicate candidate IDs
  4. For each candidate: `storage.readMemory(id)` → get record
  5. Score each: `bm25.bm25ScoreWithImportance(query, record.summary, record.importance, record.decay)`
  6. Apply decay weighting: `finalScore = baseWeight × (0.35 + importance × decay)`
  7. Sort by finalScore descending
  8. Filter out `doc_*` memories (boilerplate)
  9. Return top N (opts.limit || 10)

- **decayMemories()**:
  1. `storage.listMemories()` → all IDs
  2. For each: `storage.readMemory(id)` → check `semantic_exempt`
  3. If not exempt: apply formula `newDecay = currentDecay × (1 - 0.01 × (1 - importance × 0.7))`
  4. Enforce floor: `Math.max(newDecay, 0.1)`
  5. `storage.updateMemory(id, { decay: newDecay })`
  6. Return { processed, decayed, exempt }

- **semanticAbstract(memories)**:
  1. Group memories by shared topics (2+ topics in common)
  2. For each group: concatenate summaries
  3. Extract common themes via `yake.extractKeywords(combined, 5)`
  4. Create a new semantic memory summarizing the group
  5. Return created abstractions

## Done When
```bash
node tests/test-runner.js 1
# All tests pass
```

## After Completion
Update `PROJECT-MANIFEST.json`: layer 1 → "complete", memory-ops → "implemented"
