# Layer 0 — Memory Storage + Index + NLP

## Pre-Requisite
- Contracts load without error: `node -e "require('./contracts/memory-schema')"`
- All 4 contract files parse cleanly

## Scope
Fill in all NOT_IMPLEMENTED stubs in:
1. `server/memory/memory-storage.js` — Atomic file read/write for memory records
2. `server/memory/memory-index.js` — In-memory indexes with disk persistence
3. `server/nlp/rake.js` — RAKE keyword extraction
4. `server/nlp/bm25.js` — BM25 scoring
5. `server/nlp/yake.js` — YAKE keyword extraction

## Instructions Per Module

### memory-storage.js
- **Pattern**: Atomic write = write to `.tmp` file, then `fs.rename` to final path
- **Memory folder structure**: Each memory is a folder containing `log.json` + `semantic.txt`
- **Read**: `readMemory(id)` → read `log.json`, parse, return object
- **Write**: `writeMemory(record, content)` → create folder, write `log.json` + `semantic.txt`
- **Content**: `getMemoryContent(id)` → read `semantic.txt`, return string
- **Delete**: `deleteMemory(id)` → remove entire folder (fs.rm recursive)
- **List**: `listMemories()` → readdir, filter folders containing `log.json`
- **Update**: `updateMemory(id, patch)` → read, merge, atomic write back

### memory-index.js
- **Three caches**: `topicToMemories` (Map: topic→Set<id>), `topicCounts` (Map: topic→number), `recencyIndex` (Array sorted by last_accessed)
- **addToIndex**: Extract topics from record, add ID to each topic set, push to recency
- **removeFromIndex**: Remove ID from all topic sets, remove from recency
- **lookupByTopic**: Return array of IDs for given topic
- **getMostRecent(n)**: Return top N from recency index
- **persistIndexes**: Write all three caches to `_indexes/` as JSON
- **loadIndexes**: Read from `_indexes/`, reconstruct Maps
- **rebuildIndexes**: Walk all memory folders, rebuild caches from scratch
- **detectDivergence**: Compare index count vs actual folder count, report mismatches

### NLP modules (rake.js, bm25.js, yake.js)
- **REFERENCE**: MA already has working implementations:
  - `rake.js` → copy logic from `../../server/MA-rake.js`
  - `bm25.js` → copy logic from `../../server/MA-bm25.js`
  - `yake.js` → copy logic from `../../server/MA-yake.js`
- Each stub has the exact algorithm documented in comments — follow those steps
- The STOPWORDS set is already included in each stub

## Done When
```bash
node tests/test-runner.js 0
# All tests pass — no failures
```

## After Completion
Update `PROJECT-MANIFEST.json`:
- Set layer 0 status to "complete"
- Set each module status to "implemented"
