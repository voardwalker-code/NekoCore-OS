# REM System — Memory System

Last updated: 2026-03-17

Covers: storage, lifecycle, retrieval, decay, belief graph, context assembly, and memory operations.

---

## Memory Types

| Type | Directory | Purpose |
|------|-----------|---------|
| Episodic | `memories/episodic/` | Individual conversation events |
| Semantic | `memories/semantic/` | Abstracted knowledge derived from episodes |
| Long-Term (LTM) | `memories/ltm/` | Compressed chatlog chunks for session continuity |
| Core | `memories/episodic/` (high importance) | High-importance events, protected from aggressive decay |

---

## Memory Record Structure

Each memory is a folder containing three files:

```
mem_<timestamp>_<random>/
     log.json        — metadata (id, type, topics, importance, decay, created, etc.)
  semantic.txt    — plain-text content of the memory (this is what gets read into LLM context)
  memory.zip      — compressed full content for LTM reconstruction
```

**Important:** `log.json` is metadata-only. Actual memory content is always in `semantic.txt`. Code that needs memory text must read `semantic.txt` directly.

---

## Memory Schema (version 1)

Canonical module: `server/contracts/memory-schema.js`

```
memorySchemaVersion  — always 1
memory_id            — unique identifier
type                 — episodic | semantic | ltm | core
created              — ISO timestamp
last_accessed        — ISO timestamp
access_count         — integer
access_events        — array of access timestamps
decay                — float 0.0–1.0 (1.0 = fully fresh)
importance           — float 0.0–1.0
topics               — string array
emotionalTag         — string
```

Route/service payloads may carry extra fields, but canonical persisted metadata is normalized to the schema above.

---

## Memory Lifecycle

```
Conversation event
       ↓
     Dual encode (episodic + semantic)
       ↓
  Schema normalize (memorySchemaVersion = 1)
       ↓
  Atomic persist (write-to-temp + rename — prevents partial writes)
       ↓
  Index update (memoryIndex + topicIndex + recencyIndex)
       ↓
  Active retrieval (scored lookups during subconscious phase)
       ↓
  Decay and consolidation (brain loop, once per 24h)
       ↓
  Dream and belief integration (sleep cycles)
       ↓
  Archive and long-term retention
       ↓
  Heal and rebuild operations (divergence repair tooling)
```

---

## Memory Decay System

Formula:
```
newDecay = currentDecay × (1 - decayFactor)
decayFactor = baseDecayRate × importanceShield
importanceShield = 1 - (importance × 0.7)
```

Base decay rate: 0.01 (1% per brain-loop day), applied once every 24 hours.

Importance shielding — higher importance = slower decay:

| Importance | Effective decay rate / day |
|-----------|---------------------------|
| 0.9 | ~0.37% |
| 0.7 | ~0.51% |
| 0.5 | ~0.65% |
| 0.1 | ~0.93% |

Floor: 0.1 — memories never fully vanish.
Semantic knowledge memories: exempt from decay entirely — knowledge persists indefinitely.

---

## Memory Retrieval

File: `server/services/memory-retrieval.js`

### Topic extraction
User message → keywords → stopword filter → max 12 topics.

### Index lookup
O(1) per topic via `memoryIndex`. Substring fallback when no exact matches.

### Scoring
```
relevanceScore = baseWeight × (0.35 + importance × decay)
baseWeight = max(1, numTopics - topicIndex)   — earlier topics weighted higher
```

### LLM rerank (optional)
Blends lexical score (45%) and LLM score (55%) for semantic depth.

### Fallback (zero topic matches)
```
score = importance × 0.7 + decay × 0.3
```
Surfaces top-N memories by importance rather than returning nothing.

### doc_* filtering
Memories with IDs starting with `doc_` are always excluded from retrieval results. Document ingestion chunks are stored for reconstruction but are not episodic experiences and should not appear in subconscious context. They previously scored 0.965 (near-perfect) and flooded context with book content.

### Boilerplate filtering
Memory entries whose `semantic` content contains system context markers (`[SUBCONSCIOUS MEMORY CONTEXT]`, `Subconscious turn context for this user message`) are excluded. These are corrupted entries where the system context block was accidentally captured as memory content.

---

## Memory Operations

File: `server/services/memory-operations.js`

### createCoreMemory(entityId, memStorage, graphStorage, timelineLogger, text, opts)
Creates an episodic memory record. If importance is above a threshold, classifies as `core`. Writes `semantic.txt`, `log.json`, `memory.zip`. Updates index.

### createSemanticKnowledge(entityId, memStorage, graphStorage, sourceMemId, text, language, opts)
Creates a semantic knowledge record from an abstraction. Cannot be decoded — it is derived knowledge. Exempt from decay.

### Dual-path encoding (IME)
`post-response-memory.js` calls **both** `createCoreMemory` and `createSemanticKnowledge` for every exchange. This dual-path behavior (Intelligent Memory Expansion, Phase 4.5) ensures each conversation produces both an episodic event record and a derived semantic knowledge record. The two records carry different topics and importance scores and are indexed independently.

---

## Memory Index

File: `server/brain/memory/memory-index-cache.js`

Three indexes maintained per entity:
- `memoryIndex` — metadata by id → O(1) lookups
- `topicIndex` — topic string → array of memory ids
- `recencyIndex` — recent access ordering

**Atomic writes**: index writes use write-to-temp + rename to prevent partial-write corruption.

**Divergence detection**: `auditIndex()` compares disk state vs cached index state and reports:
- diskCount / indexCount
- missingInIndex (on disk but not indexed)
- staleInIndex (indexed but not on disk)
- diverged (boolean)

**Rebuild**: `rebuildFromDisk()` scans episodic, semantic, and ltm directories to reconstruct index from actual files.

---

## Belief Graph

Files: `server/beliefs/beliefGraph.js`, `server/brain/knowledge/beliefGraph.js`
Storage: `entities/<id>/beliefs/`

### Belief formation
Beliefs emerge when 3+ semantic memories share a common topic. They carry confidence scores and connect to source memories and other beliefs.

```json
{
  "belief_id": "bel_a1b2c3",
  "content": "Thorough, structured communication is effective",
  "confidence": 0.65,
  "topics": ["communication"],
  "source_memories": ["mem_001", "mem_002", "mem_003"],
  "connections": [{ "target_id": "bel_d4e5f6", "strength": 0.4, "type": "supports" }],
  "created": "...",
  "last_reinforced": "..."
}
```

### Confidence dynamics


| Action | Delta | Range |
|--------|-------|-------|
| Reinforcement (new matching evidence) | +0.05 | floor 0.10 |
| Contradiction (conflicting evidence) | −0.10 | ceiling 0.95 |

### Attention routing
`routeAttention()` exists in `beliefGraph.js` and computes a per-topic boost (0.20 × belief.confidence) intended to surface worldview-consistent memories. **This function is not wired into the live retrieval path.** Beliefs currently influence dream processing and confidence dynamics but do not yet modify retrieval scores at query time. The integration point is reserved for Phase 4.7 (Agent Echo).

---

## Context Assembly (context-consolidator.js)

File: `server/brain/generation/context-consolidator.js`

Builds `context.md` for every entity before each LLM call. Sections in order:

### Evolving entities (default)
1. **Identity Foundation** — `system-prompt.txt` with backstory extracted and frozen traits line stripped
2. **Current Persona State** — `persona.json` (live mood, emotions, tone, evolved `llmPersonality`)
3. **User Profile** — active user's name, identity notes, relationship
4. **Relevant Memories** — scored memories retrieved from episodic/semantic store
5. **Origin Story (last)** — extracted backstory repositioned here under "Roots, Not Chains" framing

Placing the origin story LAST means current emotional state and accumulated memories take precedence in the LLM's attention. The entity's lived experience dominates its static starting description.

### Unbreakable entities (opt-in flag)
1. `system-prompt.txt` verbatim — backstory stays at top (authoritative), frozen traits preserved, `🔒 IDENTITY LOCK` block visible
- Sections 2–5 still assembled as normal
- No backstory extraction or repositioning (that is the whole point)

The `unbreakable` flag is read from `entity.json` on every context rebuild.

### What gets stripped in evolving mode
- `YOUR BACKSTORY: ...` / `YOUR ORIGIN STORY: ...` blocks extracted and moved to Section 5
- `Personality: I am X. My traits are: Y.` line removed — this is a frozen creation snapshot; `persona.json` Self-Image carries the live version
- Default `llmPersonality` suppressed if it still matches the auto-generated format (`I am X. My traits are: A, B, C.`) — prevents creation snapshot from re-entering via persona.json

---

## Sharded Topic Archive

Files: `server/brain/utils/archive-index.js`, `server/brain/utils/archive-router.js`
Storage: `entities/<id>/memories/archive/`

Implemented in Phase 4.6. A secondary long-term memory surface that supplements the episodic/semantic store.

### Structure
The archive is a directory of NDJSON bucket files keyed by topic slug:
```
memories/archive/
  router.json                    — topic → bucket slug mapping
  bucket_<slug>.ndjson           — one JSON object per line; each line = one archive entry
```

Each archive entry records a memory ID, its primary topic slug, and a BM25-scored relevance value. Entries are written on indexing and updated on access.

### Retrieval
Archive search uses RAKE keyword extraction on the query string, then BM25 scoring over the candidate entries in the matching topic bucket. Benchmark results on AMD Ryzen AI 7:

| Corpus size | Avg search time | Status |
|-------------|----------------|--------|
| 25,000 entries | 69.74ms | ✅ within ceiling |
| 50,000 entries | 116.75ms | ❌ above ceiling |

The 25K ceiling defines the practical operating range. Sharding by topic keeps individual bucket sizes manageable at scale.

### Agent Echo (Phase 4.7 — Live)

Agent Echo is the live retrieval pipeline implemented in `server/brain/agent-echo.js`. It exposes three functions:

- **`echoNow(entityId, query)`** — Searches ConsciousMemory STM (hot ≈8K window). Zero-latency; no disk access.
- **`echoPast(entityId, topics, options)`** — Hierarchical archive search. Round 1 (synchronous): scans `archive_directory.json` to rank archives by topic overlap, then BM25-queries the top 1–3 archive buckets (worst case ~68ms). Round 2 (async, fires in `setImmediate` during humanizer typing window): probes up to 10 additional un-tried archives and promotes strong hits into ConsciousMemory STM via `promoteToStm()`, making them available to Echo Now on the next turn.
- **`echoFuture(entityId)`** — Stub, returns `null`. Phase 5 implements memory shape classification (narrative, reflective, factual, emotional, anticipatory).

Multi-axis indexes are maintained by `archive-indexes.js` and rebuilt on a 10-cycle cadence by `phase-archive-index.js`:

| Axis | Key format | Purpose |
|------|-----------|--------|
| `temporal` | `YYYY-MM` | Narrow search to specific calendar months |
| `subject` | slug string | Narrow search by emergent topic cluster |
| `shape` | shape label | (Phase 5) Narrow by memory arc type |

Query narrowing is exposed through `POST /api/archive/search` (`body.month`, `body.subject`) and through the Archive UI Month/Subject controls. `intersectIndexes()` builds a `narrowSet` (Set<memId>) that is passed as the 6th argument to `queryArchive()`. An empty intersection short-circuits with no results before BM25 fires.

---

## Memory Encoding Guard

Before creating any episodic memory, `post-response-memory.js` validates that the semantic text does not contain:
- `[SUBCONSCIOUS MEMORY CONTEXT]`
- `[CONVERSATION RECALL]`
- `[INTERNAL-RESUME]`

If detected, the memory write is skipped with a warning. This prevents the system from accidentally encoding its own context boilerplate as a memory event.

---

## Relevant Files

| File | Role |
|------|------|
| server/services/memory-retrieval.js | Subconscious context block assembly, chatlog recall |
| server/services/memory-operations.js | createCoreMemory, createSemanticKnowledge |
| server/brain/memory/memory-storage.js | Atomic read/write for episodic/semantic/ltm |
| server/brain/memory/memory-index-cache.js | O(1) lookups, divergence audit/rebuild |
| server/brain/cognition/phases/phase-decay.js + server/brain/memory/memory-storage.js | Decay tick + decayMemories implementation |
| server/brain/generation/context-consolidator.js | context.md assembly |
| server/beliefs/beliefGraph.js | Belief graph persistence and query |
| server/contracts/memory-schema.js | Canonical schema + normalizeMemoryRecord |
| server/services/post-response-memory.js | Post-turn memory encoding (dual-path IME) |
| server/brain/utils/archive-index.js | NDJSON bucket read/write/remove for topic archive |
| server/brain/utils/archive-indexes.js | Multi-axis index CRUD (temporal, subject, shape stub) + rebuild phases |
| server/brain/utils/archive-directory.js | Archive directory CRUD + topic-overlap ranked scanDirectory |
| server/brain/agent-echo.js | Agent Echo coordinator: echoNow, echoPast (round-1 + round-2), promoteToStm, echoFuture stub |
| server/brain/cognition/phases/phase-archive-index.js | Brain loop phase (every 10 cycles): rebuildTemporalIndexes + rebuildSubjectIndexes + rebuildShapeIndexes stub |
| server/routes/archive-routes.js | POST /api/archive/search with month/subject narrowing via intersectIndexes |
