# Part 2 — Advanced Memory & Knowledge

**Pre-requisite**: Part 1 tests pass (21/21).

## Scope

| Module | File | What to Build |
|--------|------|---------------|
| Conscious Memory | `server/memory/conscious-memory.js` | STM (7 items FIFO) + LTM promotion (importance > 0.7 OR rehearsal > 3) |
| Dream Memory | `server/memory/dream-memory.js` | 3 tiers (vivid/fading/fragments), auto-demotion |
| Memory Graph | `server/memory/memory-graph.js` | Spreading activation (decay 0.7, threshold 0.1, max depth 4) |
| Memory Graph Builder | `server/memory/memory-graph-builder.js` | Jaccard similarity, temporal window 5min, emotion matching |
| Archive Manager | `server/memory/archive-manager.js` | Gzip compression pipeline for conversation archival |
| Trace Graph | `server/knowledge/trace-graph.js` | Cause→effect chains for belief discovery |
| Trace Graph Builder | `server/knowledge/trace-graph-builder.js` | Sliding window analysis, emotion shift detection |
| Dream Link Writer | `server/knowledge/dream-link-writer.js` | Post-dream memory linking |
| TextRank | `server/utils/textrank.js` | PageRank on sentence similarity graph |
| Memory Encoder NLP | `server/utils/memory-encoder-nlp.js` | Full NLP pipeline (RAKE+YAKE→topics→emotion→importance) |
| Semantic Cache | `server/utils/semantic-cache.js` | LRU cache (500 entries, 10min TTL) |

## Build Steps

1. Fill `textrank.js` — reference existing NLP in MA (MA-rake.js, MA-bm25.js, MA-yake.js)
2. Fill `memory-encoder-nlp.js` — uses textrank + RAKE + YAKE for topic extraction
3. Fill `semantic-cache.js` — LRU with TTL
4. Fill `conscious-memory.js` — STM array + LTM map + promotion logic
5. Fill `dream-memory.js` — 3-tier storage with demotion timers
6. Fill `memory-graph.js` — adjacency list + spreading activation algorithm
7. Fill `memory-graph-builder.js` — link creation based on similarity/temporal/emotion
8. Fill `archive-manager.js` — gzip + index management
9. Fill `trace-graph.js` — directed graph for cause→effect
10. Fill `trace-graph-builder.js` — analyze conversation for trace edges
11. Fill `dream-link-writer.js` — cross-reference dream memories with waking memories

## Done When

```
node tests/test-runner.js 2
→ 22 passed, 0 failed
```
