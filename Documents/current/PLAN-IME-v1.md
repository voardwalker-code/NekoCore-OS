# PLAN: Intelligent Memory Expansion (IME)

**Status:** `Planned`
**Version target:** `0.7.0`
**Phase:** `4.5 — post-Phase-3-close, pre-Phase-5`
**Date created:** `2026-03-16`
**Last updated:** `2026-03-16`
**Requested by:** `NekoCore OS`

---

## 1. Background / Why This Plan Exists

The current NekoCore OS memory retrieval system produces excellent results up to approximately 2,000 stored memories, then hits a hard quality wall. The root cause is a three-layer problem: the query-side tokenizer produces single-word tokens that miss multi-word concepts; the relevance scoring formula weights raw topic overlap multiplied by importance/decay, giving no advantage to rare or specific terms over common noise words; and there is no separation between hot working-memory and long-term archive, meaning every memory from every year competes for the same 36 retrieval slots on every turn.

All the cognitive machinery above retrieval — the brain loop, Hebbian weights, neurochemistry, CognitivePulse trace priors — is producing useful signal that feeds a first-stage that cannot use it properly. This plan fixes the foundation.

The proposal document on which this plan is based: `Desktop/Intelligent Memory Expansion.md` (user-authored architecture document, not copied here to avoid duplication).

---

## 2. Objective

Done means:

1. **BM25 scoring** replaces `baseScore * (0.35 + (importance * decay))` in `memory-retrieval.js`. Rare, specific terms score proportionally higher than frequent noise words. The effective quality wall moves from ~2,000 memories to ~20,000+.
2. **RAKE keyphrasing** replaces `extractSubconsciousTopics()` single-word tokenizer. Multi-word phrases like `"pipeline orchestration"` become precise index keys instead of splitting into two generic tokens.
3. **TextRank abstracts** replace first-3,000-char truncation at write time. Stored `semantic.txt` entries contain the most representative sentences, not just the first N characters.
4. **Three-tier archive** exists: `memories/archive/episodic/`, `memories/archive/docs/`, `archiveIndex.json`. Old memories move to archive automatically via the brain loop sleep/dream pass. They are never auto-scanned at turn time.
5. **`search_archive` route and tool** allow the entity to retrieve archived memories on demand, by free-text query and optional time range, exactly as she already calls `search_web`.
6. **Doc chunk routing**: `nkdoc_*` entries from doc ingestion are routed to `memories/archive/docs/` instead of competing for hot-index slots.
7. **GC consolidation pass**: oldest episodic clusters are TextRank-summarized before archiving so the archived abstract is high quality.
8. **Full suite remains green** — all existing tests pass. No behavioral regressions.

---

## 3. Audit Findings / Pre-Work Analysis

| Item | Current Location | Problem | Target |
|------|-----------------|---------|--------|
| `extractSubconsciousTopics()` | `server/services/memory-retrieval.js:32` | Single-word split+stopword; drops multi-word concepts; 12 tokens max | Replace with RAKE in `server/brain/utils/rake.js`; update callers |
| Relevance scoring | `memory-retrieval.js:247` — `baseScore * (0.35 + (importance * decay))` | Raw overlap count — common words score same as rare words; no IDF | Replace scoring loop with BM25; add IDF table computed at server start from `memoryIndex.json` |
| Subconscious reranker candidates | `memory-retrieval.js:409` — `topConnections.slice(0, Math.min(20, ...))` | BM25 pre-filtered pool should be 50 candidates, not 20 | Bump to 50 after BM25 is in place |
| `semantic.txt` write | `server/services/memory-encoder.js` (write time) | Truncates at ~3,000 chars — first N chars, not most representative | Apply TextRank at write time |
| Doc ingestion | `server/brain/nekocore/doc-ingestion.js` | Chunks written to `memories/episodic/nkdoc_*` — burns hot-index slots on reference material | Route chunks to `memories/archive/docs/` |
| Archive phase | `server/brain/cognition/phases/phase-archive.js` | Phase exists but likely handles only session archiving, not memory decay-to-archive promotion | Extend with memory lifecycle promotion: decay < 0.05, age > 90 days → move to archive |
| `search_archive` | Does not exist | Entities cannot retrieve memories older than the hot index window | New route `server/routes/archive-routes.js` |
| `archiveIndex.json` | Does not exist | No index for archived memories | Created and maintained by archive pass; format: `{ memId: { topics, hebbianWeights, archivedAt, type } }` |

**Estimated total impact:** ~970 lines of new/changed code across 9 sequential steps. Zero new npm packages. Zero new server processes. Zero API keys required. All changes backward compatible with existing flat-file memory format.

---

## 4. Architecture Boundary Check

- [x] No frontend (`client/**`) receives backend orchestration, filesystem logic, or policy logic
- [x] No backend (`server/**`) receives DOM/UI rendering concerns
- [x] New routes added to `server/routes/**`, not inlined into `server/server.js`
- [x] New data schemas and validators go into `server/contracts/**`
- [x] No new business logic added to `server/server.js` (composition only)
- [x] All new modules target <= 300 lines where practical
- [x] Any file above 1200 lines that needs changes: extraction is required in the same slice

Boundary markers applied per slice: `[BOUNDARY_OK]`, `[JS_OFFLOAD]`, `[CONTRACT_ENFORCED]`

---

## 5. Phases

### Phase I1: Search Quality Foundation

**Goal:** Replace the tokenizer and scoring formula — the two highest-impact changes with zero structural risk.
**Status:** `Planned`
**Depends on:** `Phase 3 + App Folder Modularization complete` ✅

#### Slice Checklist

- [ ] I1-0: RAKE keyphrasing — new `server/brain/utils/rake.js`; replace `extractSubconsciousTopics()` tokenizer in `memory-retrieval.js`
- [ ] I1-1: BM25 scoring — new `server/brain/utils/bm25.js`; IDF table computed from `memoryIndex.json` at server start; replace scoring loop in `getSubconsciousMemoryContext()`
- [ ] I1-2: Reranker candidate bump — raise `callSubconsciousReranker` candidate pool from 20 → 50; guard tests for scoring behavior

---

### Phase I2: Write-Time Abstract Quality

**Goal:** Ensure `semantic.txt` entries stored at write time contain the most representative content, not just the first N characters.
**Status:** `Planned`
**Depends on:** `I1 complete`

#### Slice Checklist

- [ ] I2-0: TextRank implementation — new `server/brain/utils/textrank.js` (~150 lines pure JS)
- [ ] I2-1: Apply TextRank in `doc-ingestion.js` — replace first-N-char truncation for `nkdoc_*` chunks
- [ ] I2-2: Apply TextRank in memory encoder — apply to `semantic.txt` output during `runPostResponseMemoryEncoding` and semantic knowledge creation

---

### Phase I3: Three-Tier Archive Infrastructure

**Goal:** Create the archive tier, the archive index, and the archive promotion pass in the brain loop.
**Status:** `Planned`
**Depends on:** `I2 complete`

#### Slice Checklist

- [ ] I3-0: Archive directory structure + `archiveIndex.json` utility — create `memories/archive/episodic/`, `memories/archive/docs/`; write `server/brain/utils/archive-index.js` (read/write/query `archiveIndex.json`)
- [ ] I3-1: Archive promotion pass in brain loop — extend `phase-archive.js`: identify decay candidates (decay < 0.05, access_count == 0, age > 90 days); compress and move to archive dir; write `archiveIndex.json` entry; remove hot-index entry
- [ ] I3-2: Doc chunk routing — update `doc-ingestion.js` to write `nkdoc_*` chunks to `memories/archive/docs/` instead of `memories/episodic/`; update `archiveIndex.json` at ingest time
- [ ] I3-3: GC consolidation before archive — apply TextRank summary to episodic cluster before archiving so archived abstract quality is high; wire into I3-1 promotion pass

---

### Phase I4: On-Demand Archive Retrieval

**Goal:** Allow entities to retrieve archived memories as a tool call — same pattern as `search_web`.
**Status:** `Planned`
**Depends on:** `I3 complete`

#### Slice Checklist

- [ ] I4-0: `search_archive` route — new `server/routes/archive-routes.js`; accepts `query`, `yearRange`, `limit`; queries `archiveIndex.json` with BM25 scoring; returns matching memory chunks
- [ ] I4-1: Tool registration — add `search_archive` to entity tool manifest so the LLM can call it as a tool
- [ ] I4-2: Exit audit — full suite green; existing memory tests pass; archive promotion smoke test; `search_archive` smoke test; WORKLOG updated

---

## 6. Slice Definitions

### I1-0 — RAKE Keyphrasing

**Start criteria:** Phase 3 and App Folder Modularization complete. ✅

**Work:**
1. Create `server/brain/utils/rake.js` (~120 lines):
   - Build co-occurrence graph across word sequences from input text
   - Score candidate phrases by word co-occurrence frequency vs. independent frequency
   - Return ranked multi-word phrase array (max 12 phrases)
   - Multi-word phrase keys like `"pipeline orchestration"` replace single-word tokens like `"pipeline"` and `"orchestration"` separately
2. In `memory-retrieval.js`, replace the `extractSubconsciousTopics()` body with a call to RAKE
3. Pass RAKE output through existing `normalizeTopics()` (preserved — synonym/stem rules still apply to individual words within phrases)
4. Add guard tests: RAKE produces multi-word phrases; single-word fallback still works; normalizeTopics still applies

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** `extractSubconsciousTopics("The pipeline orchestration system needs a memory consolidation pass")` returns phrases including `"pipeline orchestration"` or equivalent multi-word candidates. Guards green. Suite green.
- Tests affected: new `project/tests/unit/rake-keyphrasing.test.js`
- Files changed: `server/brain/utils/rake.js` (new), `server/services/memory-retrieval.js`

---

### I1-1 — BM25 Scoring

**Start criteria:** RAKE keyphrasing in place (I1-0 done).

**Work:**
1. Create `server/brain/utils/bm25.js` (~80 lines):
   - `buildIdfTable(memoryIndex)` — compute IDF for all terms from `memoryIndex.json`: `IDF = log((N - df + 0.5) / (df + 0.5))` where N = total memories, df = memories containing the term. Cached in memory.
   - `bm25Score(terms, memoryTopics, idfTable, docLen, avgDocLen)` — BM25 scoring with k=1.5, b=0.75
2. In `getSubconsciousMemoryContext()` in `memory-retrieval.js`:
   - On factory init: build IDF table from current memoryIndex; rebuild when index is written
   - Replace `baseScore * (0.35 + (importance * decay))` with `bm25Score(...)` as the primary signal
   - Keep importance/decay as a secondary blend multiplier (lightly weighted, `0.1` blend): `finalScore = bm25 * 0.9 + (importance * decay) * 0.1`
   - Keep CognitivePulse trace prior boosts (existing — untouched)
3. Add guard tests: BM25 produces higher scores for rare/specific terms than common terms; IDF table builds from index; score is always a finite number

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** Scoring formula replaced. Rare/specific query terms produce proportionally higher scores. IDF table is computed at start and on memoryIndex write. Suite green.
- Tests affected: new `project/tests/unit/bm25-scoring.test.js`
- Files changed: `server/brain/utils/bm25.js` (new), `server/services/memory-retrieval.js`

---

### I1-2 — Reranker Candidate Bump

**Start criteria:** BM25 scoring in place (I1-1 done).

**Work:**
1. In `memory-retrieval.js`, raise the `callSubconsciousReranker` slice from `topConnections.slice(0, Math.min(20, ...))` to `slice(0, Math.min(50, ...))`
2. Add guard test asserting the candidate pool cap is 50, not 20
3. Run full suite to confirm reranker behavior is unchanged (it receives more, better-ranked candidates — still returns top 12)

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Subconscious reranker receives up to 50 pre-filtered candidates. Guard test passes. Suite green.
- Tests affected: guard test update in `memory-retrieval` tests
- Files changed: `server/services/memory-retrieval.js`

---

### I2-0 — TextRank Implementation

**Start criteria:** I1 complete.

**Work:**
1. Create `server/brain/utils/textrank.js` (~150 lines):
   - `sentenceSimilarity(s1, s2)` — cosine similarity of term overlap between two sentences
   - `buildSimilarityGraph(sentences)` — sentence adjacency graph
   - `pageRank(graph, iterations=20, dampingFactor=0.85)` — standard PageRank on sentence graph
   - `extractTopSentences(text, maxSentences=3)` — main API: splits text → builds graph → runs PageRank → returns top N most representative sentences joined as string
2. Add guard tests: TextRank on a 500-word passage returns ≤3 sentences; output length < input length; most representative sentences are selected (not just first N chars)

**Boundary markers:** `[BOUNDARY_OK]` `[JS_OFFLOAD]`

**End criteria:** `textrank.extractTopSentences(longText, 3)` returns a representative 3-sentence abstract. Suite green.
- Tests affected: new `project/tests/unit/textrank-abstracts.test.js`
- Files changed: `server/brain/utils/textrank.js` (new)

---

### I2-1 — TextRank in Doc Ingestion

**Start criteria:** I2-0 done.

**Work:**
1. In `server/brain/nekocore/doc-ingestion.js`, locate the chunk-writing step that writes `semantic.txt`
2. Wrap each chunk's content in `textrank.extractTopSentences(chunk, 3)` before writing to `semantic.txt`
3. Preserve original full content in `memory.zip` (unchanged)
4. Add integration test: ingest a test document; assert `semantic.txt` length < raw chunk length

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Ingested `nkdoc_*` semantic.txt entries contain representative sentences, not raw truncation. Suite green.
- Files changed: `server/brain/nekocore/doc-ingestion.js`, new `project/tests/integration/doc-ingestion-textrank.test.js`

---

### I2-2 — TextRank in Memory Encoder

**Start criteria:** I2-1 done.

**Work:**
1. Locate the memory encoder that writes `semantic.txt` for episodic and semantic knowledge entries
2. Apply `textrank.extractTopSentences(content, 3)` when content exceeds 600 characters — below that threshold, truncation is fine and TextRank adds no value
3. Add guard test: encoder with content > 600 chars produces a TextRank summary; content < 600 chars bypasses TextRank

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Memory encoder applies TextRank for long entries. Short entries unchanged. Suite green.
- Files changed: memory encoder module; guard test added

---

### I3-0 — Archive Directory + Index Utility

**Start criteria:** I2 complete.

**Work:**
1. Create `memories/archive/episodic/` and `memories/archive/docs/` directories (ensure dir creation is idempotent — run on server start)
2. Create `server/brain/utils/archive-index.js` (~100 lines):
   - `readArchiveIndex(entityRoot)` — reads/creates `memories/archive/archiveIndex.json`
   - `appendArchiveEntry(entityRoot, memId, entry)` — append-only write: `{ topics, hebbianWeights, archivedAt, type, decayAtArchive }`
   - `queryArchive(entityRoot, rakeTerms, idfTable, limit, yearRange)` — BM25 query over archiveIndex entries; returns top-N matches with topic + timestamp filters
3. Add unit tests for each utility function

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Archive dirs created idempotently; `archiveIndex.json` readable/writable; `queryArchive` returns ranked results from the archive. Suite green.
- Tests affected: new `project/tests/unit/archive-index.test.js`
- Files changed: `server/brain/utils/archive-index.js` (new); `entities/entity_<id>/memories/archive/` dirs created at runtime

---

### I3-1 — Archive Promotion Pass in Brain Loop

**Start criteria:** I3-0 done.

**Work:**
1. In `server/brain/cognition/phases/phase-archive.js`, add memory lifecycle promotion logic:
   - Scan `memories/episodic/` entries in the current entity's memory root
   - Identify candidates: `decay < 0.05 AND access_count == 0 AND age_days > 90`
   - For each candidate: GC consolidation (see I3-3, add TextRank summary if len > 600), then move file to `memories/archive/episodic/<id>/`, write `archiveIndex.json` entry, remove old entry from `memoryIndex.json`, trigger IDF table rebuild
   - Limit batch size per cycle: max 20 promotions per pass (cap to avoid long blocking cycles)
2. Ensure promotion is rollback-safe: write to archive first, then remove from hot index
3. Add guard test: a mock memory with decay < 0.05, zero access count, age > 90 days is promoted to archive; a memory with decay 0.5 is not

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Archive promotion runs on brain loop sleep cycle. Promoted memories are no longer in the hot index. `archiveIndex.json` updated. Suite green.
- Tests affected: new `project/tests/unit/archive-promotion.test.js`
- Files changed: `server/brain/cognition/phases/phase-archive.js`

---

### I3-2 — Doc Chunk Routing to Archive

**Start criteria:** I3-0 done (can run in parallel with I3-1).

**Work:**
1. In `server/brain/nekocore/doc-ingestion.js`, change the write destination for `nkdoc_*` chunks from `memories/episodic/` to `memories/archive/docs/`
2. Write the `archiveIndex.json` entry for each chunk at ingest time (type: `"doc"`, docId: the source doc identifier)
3. These chunks are never written to the hot `memoryIndex.json`
4. Update any references in `document-routes.js` that point user-uploaded documents to episodic storage — same routing change
5. Add guard test: post-ingestion, `nkdoc_*` entries exist in `memories/archive/docs/` but NOT in `memories/episodic/` or `memoryIndex.json`

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Doc chunks go to archive at ingest time. Hot index is not polluted by reference material. Suite green.
- Tests affected: update `doc-ingestion-textrank.test.js` for new path; new doc-routing guard test
- Files changed: `server/brain/nekocore/doc-ingestion.js`, `server/routes/document-routes.js`

---

### I3-3 — GC Consolidation Before Archive

**Start criteria:** I3-1 in progress (wired into promotion pass).

**Work:**
1. Before the archive promotion pass writes a memory to `memories/archive/`, apply `textrank.extractTopSentences(content, 3)` to produce a high-quality abstract
2. Store this abstract as the `semantic.txt` in the archive entry (the full content still goes to `memory.zip`)
3. This ensures archived memories have representative, searchable abstracts rather than the original raw truncation from write time

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Archived `semantic.txt` is a TextRank abstract, not raw truncation. Can be verified by archiving a test memory with long content and checking the output.
- Files changed: wired into `phase-archive.js` as part of I3-1

---

### I4-0 — `search_archive` Route

**Start criteria:** I3 complete.

**Work:**
1. Create `server/routes/archive-routes.js` (~120 lines):
   - `POST /api/archive/search` — body: `{ query: string, yearRange: [min, max]?, limit: number? }`
   - Validates auth; identifies current entity; calls `queryArchive()` from archive-index utility
   - Returns: `{ results: [{ id, summary, archivedAt, topics, type }] }` (top-N chunks)
   - Reads `semantic.txt` for each hit to provide the summary
   - Input validation: query must be a non-empty string; yearRange if present must be `[number, number]`; limit defaults to 5, max 20
2. Wire into `server.js` (composition only — `app.use('/api/archive', archiveRoutes)`)
3. Add integration smoke tests: valid query returns results; empty query returns 400; unauthenticated returns 401; year range filters correctly

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** `POST /api/archive/search` is live; returns ranked archive results; auth-gated. Suite green.
- Tests affected: new `project/tests/integration/archive-search.test.js`
- Files changed: `server/routes/archive-routes.js` (new), `server/server.js`

---

### I4-1 — Tool Registration

**Start criteria:** I4-0 done.

**Work:**
1. Locate the entity tool manifest and the tool invocation routing in the brain pipeline
2. Add `search_archive` tool definition:
   ```json
   {
     "name": "search_archive",
     "description": "Search the long-term memory archive for memories older than 90 days.",
     "parameters": {
       "query": "string",
       "yearRange": "[minYearsAgo, maxYearsAgo] — optional",
       "limit": "number — default 5, max 20"
     }
   }
   ```
3. Add tool handler that calls `/api/archive/search` internally
4. Guard test: `search_archive` appears in tool manifest when tools are enabled; handler routes to archive search correctly

**Boundary markers:** `[BOUNDARY_OK]` `[CONTRACT_ENFORCED]`

**End criteria:** Entity can invoke `search_archive` via natural language. Tool appears in manifest. Handler executes correctly. Suite green.
- Files changed: tool manifest, tool handler routing

---

### I4-2 — Exit Audit

**Start criteria:** I4-1 done.

**Work:**
1. Run full test suite — all tests must pass
2. Smoke test the full memory lifecycle end-to-end in running server:
   - Write a new episodic memory → verify in hot index, BM25 IDF table updated
   - Run retrieval for a query → verify BM25-ranked results returned
   - Simulate an old/decayed memory → verify archive promotion moves it correctly
   - Call `search_archive` → verify archive result returned
3. Update WORKLOG.md: add Phase I completion block, stop/resume snapshot
4. Update `Documents/current/CHANGELOG.md` and `Documents/current/MEMORY-SYSTEM.md` with new architecture

**Boundary markers:** `[BOUNDARY_OK]`

**End criteria:** Suite green. Three-tier architecture confirmed operational. WORKLOG and changelog updated. Plan status → `Done`.

---

## 7. Test Plan

| Test File | Slice | What It Verifies |
|-----------|-------|------------------|
| `project/tests/unit/rake-keyphrasing.test.js` | I1-0 | RAKE produces multi-word phrase candidates; normalizeTopics still applies |
| `project/tests/unit/bm25-scoring.test.js` | I1-1 | BM25 scores rare terms higher than frequent terms; IDF table builds correctly; finite scores always returned |
| `project/tests/unit/textrank-abstracts.test.js` | I2-0 | TextRank returns ≤3 representative sentences; output < input; pure function (no side effects) |
| `project/tests/integration/doc-ingestion-textrank.test.js` | I2-1 | Ingested doc chunk semantic.txt length < raw chunk; passes through TextRank |
| `project/tests/unit/archive-index.test.js` | I3-0 | Archive dir creation idempotent; archiveIndex read/write/query all correct; BM25 query returns ranked results |
| `project/tests/unit/archive-promotion.test.js` | I3-1 | Decay+age candidate promoted; recent/high-decay memory NOT promoted; batch size capped |
| `project/tests/integration/archive-search.test.js` | I4-0 | POST /api/archive/search returns results; auth gated; year range filter works; input validation enforced |

**Test-first rule:** Write guard tests before replacing each algorithm. Confirm current behavior is captured before the replacement is made.

---

## 8. Risk Notes

1. **IDF table rebuild cost** — at 10,000+ memories, rebuilding the IDF table on server start is still fast (milliseconds, pure JSON scan), but rebuilding after every individual memory write would be wasteful. Rebuild strategy: rebuild at start and after bulk operations (doc ingestion, archive pass). Not on individual memory writes — stale IDF for a single new memory is acceptable.
2. **Archive promotion data loss** — the promotion pass moves files. Motion must be: write-to-archive first, then remove-from-hot. If server crashes between these two, the memory stays in both locations temporarily. The archive pass should deduplicate on next run.
3. **RAKE false positives on short queries** — very short messages (< 5 words) may not produce good RAKE output. Fallback: if RAKE returns fewer than 2 phrases, fall back to the existing single-word tokenizer.
4. **Doc chunk routing breaking existing knowledge** — existing `nkdoc_*` memories already in the hot index will remain there. The routing change is forward-only. Existing ingested docs are not retroactively moved. This is acceptable — they drain naturally via the archive promotion pass.
5. **LLM reranker with 50 candidates** — the reranker LLM call token cost increases slightly. If latency is a concern, the pool size can be tuned down. The guard test should document the configured value so it cannot drift silently.

---

## 9. Completion Ledger

| Date | Slice | Outcome | Notes |
|------|-------|---------|-------|
| 2026-03-16 | Planning | Done | Plan written from architecture proposal; file paths confirmed against codebase |

---

## 10. Stop / Resume Snapshot

- **Current phase:** `Planning — awaiting implementation kickoff`
- **Current slice:** `I1-0 — not started`
- **Last completed slice:** `Planning`
- **In-progress item:** `none`
- **Blocking issue:** `none`
- **Next action on resume:** `Begin I1-0: create server/brain/utils/rake.js, replace extractSubconsciousTopics tokenizer, add guard tests`
