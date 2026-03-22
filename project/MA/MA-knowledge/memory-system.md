# REM System — Memory System Design

Reference doc for MA when building or extending the REM memory layer.

---

## Memory Types

| Type | Directory | Purpose |
|------|-----------|---------|
| Episodic | memories/episodic/ | Individual conversation events |
| Semantic | memories/semantic/ | Abstracted knowledge derived from episodes |
| Long-Term (LTM) | memories/ltm/ | Compressed chatlog chunks for session continuity |
| Core | memories/episodic/ (high importance) | High-importance events, protected from decay |

---

## Memory Record Structure

Each memory is a folder:
```
mem_<timestamp>_<random>/
  log.json      — metadata (id, type, topics, importance, decay, created, etc.)
  semantic.txt  — plain-text content (what gets read into LLM context)
  memory.zip    — compressed full content for LTM reconstruction
```

**Critical:** `log.json` is metadata-only. Actual content is in `semantic.txt`.

---

## Memory Schema (version 1)

Canonical module: `server/contracts/memory-schema.js`

Fields: memorySchemaVersion (always 1), memory_id, type (episodic|semantic|ltm|core), created, last_accessed, access_count, access_events, decay (0.0–1.0), importance (0.0–1.0), topics (string[]), emotionalTag.

---

## Memory Lifecycle

```
Conversation event → Dual encode (episodic + semantic) → Schema normalize
→ Atomic persist (write-to-temp + rename) → Index update (memoryIndex + topicIndex + recencyIndex)
→ Active retrieval → Decay and consolidation (brain loop, 24h)
→ Dream and belief integration → Archive → Heal and rebuild
```

---

## Dual-Path Encoding (IME)

Every exchange produces BOTH an episodic event record AND a semantic knowledge record. `post-response-memory.js` calls `createCoreMemory` and `createSemanticKnowledge`. Two records with different topics, importance scores, indexed independently.

---

## Decay System

Formula: `newDecay = currentDecay × (1 - decayFactor)` where `decayFactor = baseDecayRate × (1 - importance × 0.7)`

- Base rate: 0.01 (1% per brain-loop day)
- Higher importance = slower decay (importance 0.9 → ~0.37%/day)
- Floor: 0.1 — memories never vanish
- Semantic knowledge: exempt from decay entirely

---

## Retrieval Scoring

1. Topic extraction from user message → keywords → stopword filter → max 12 topics
2. O(1) index lookup per topic, substring fallback
3. Score: `relevanceScore = baseWeight × (0.35 + importance × decay)`
4. Optional LLM rerank: blends lexical (45%) + LLM score (55%)
5. Zero-match fallback: `score = importance × 0.7 + decay × 0.3`

### Filtering Rules
- `doc_*` IDs excluded (document ingestion chunks, not experiential)
- Boilerplate markers excluded (corrupted system context entries)

---

## NLP Components

### RAKE (Rapid Automatic Keyword Extraction)
Extracts multi-word keyphrases by splitting on stopwords, scoring by word degree/frequency ratio. Used in topic extraction on store and search.

### BM25 (Best Match 25)
Probabilistic relevance scoring: term frequency, inverse document frequency, document length normalization. Parameters: k1=1.5, b=0.75. Used in search ranking.

### YAKE (Yet Another Keyword Extractor)
Statistical keyword extraction using positional, frequency, and co-occurrence features. Complements RAKE with different scoring perspective.

### Integration Pattern
- On store: RAKE + YAKE extract topics automatically
- On search: RAKE extracts query terms, BM25 scores against stored topics with importance weighting and decay factor

---

## Memory Index

Three indexes per entity: memoryIndex (topic→memory_id[]), topicIndex (topic→count), recencyIndex (sorted by last_accessed). Cached in memory, persisted to disk, divergence detection and atomic repair.

---

## Topic Archive (Sharded)

NDJSON bucket files keyed by topic slug. RAKE extraction + BM25 scoring over shards. Scales to large memory corpuses without loading entire index into memory.

---

## Best Practices

1. Always write atomically (temp file + rename) — prevents partial writes
2. Always normalize to memory schema v1 before persisting
3. Dual-path encode every exchange — episodic + semantic
4. Never store system context as memory content
5. Filter doc_* from retrieval — they flood context
6. Index updates must be synchronous with writes — no eventual consistency
7. Importance scoring should factor emotional intensity + novelty
8. Keep memory content in semantic.txt, metadata in log.json — never mix
