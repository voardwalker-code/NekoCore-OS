'use strict';
/**
 * Benchmark: RAKE extraction + BM25 archive search at various scales.
 * Goal: find the entry-count ceiling that stays under 100ms total.
 *
 * Usage:  node tests/bench-archive.js
 */

const { extractPhrases } = require('../server/brain/utils/rake');
const { bm25Score }      = require('../server/brain/utils/bm25');

// ── Synthetic data generators ────────────────────────────────────────────────

const TOPICS = [
  'neuroscience', 'pipeline orchestration', 'entity memory', 'dream states',
  'cognitive routing', 'belief propagation', 'subconscious processing',
  'conversation history', 'semantic analysis', 'topic extraction',
  'archive system', 'memory consolidation', 'emotion classification',
  'temporal decay', 'knowledge graph', 'sleep cycle', 'context window',
  'attention mechanism', 'language model', 'inference pipeline',
  'identity formation', 'reflective reasoning', 'predictive topology',
  'sharded buckets', 'bm25 scoring', 'rake keyphrasing',
  'digital consciousness', 'memory layers', 'episodic recall',
  'hierarchical context', 'active learning', 'self model',
];

function randomTopics(n) {
  const picked = [];
  for (let i = 0; i < n; i++) {
    picked.push(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  }
  return picked;
}

function generateEntries(count) {
  const entries = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      memId: 'mem_' + String(i).padStart(8, '0'),
      topics: randomTopics(3 + Math.floor(Math.random() * 8)),
      type: ['episodic', 'doc', 'semantic_knowledge'][i % 3],
      created: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
      importance: Math.random(),
    });
  }
  return entries;
}

// ── Benchmark: RAKE extraction ───────────────────────────────────────────────

function benchRake() {
  const texts = [
    'How does the subconscious dream processing pipeline work with belief propagation?',
    'Tell me about neuroscience and cognitive routing in the memory system',
    'What is the relationship between entity memory consolidation and temporal decay?',
    'Show me everything about archive sharding and BM25 scoring implementation',
    'I want to understand how the hierarchical context window and attention mechanism interact with knowledge graph traversal during sleep cycle processing',
  ];

  console.log('\n=== RAKE Extraction Benchmark ===');
  for (const text of texts) {
    const runs = 10000;
    const start = process.hrtime.bigint();
    let result;
    for (let i = 0; i < runs; i++) {
      result = extractPhrases(text);
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
    const perCall = elapsed / runs;
    console.log(`  "${text.slice(0, 60)}…" → ${result.length} phrases, ${perCall.toFixed(4)}ms/call`);
  }
}

// ── Benchmark: BM25 scoring per entry ────────────────────────────────────────

function benchBm25() {
  const queryTopics = ['neuroscience', 'pipeline orchestration', 'entity memory', 'dream states'];
  const doc = randomTopics(8);

  console.log('\n=== BM25 Score (single pair) Benchmark ===');
  const runs = 100000;
  const start = process.hrtime.bigint();
  for (let i = 0; i < runs; i++) {
    bm25Score(queryTopics, doc);
  }
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  console.log(`  ${runs} calls in ${elapsed.toFixed(1)}ms → ${(elapsed / runs * 1000).toFixed(2)}µs/call`);
}

// ── Benchmark: Full query simulation (in-memory, no disk) ────────────────────

function benchQuerySim() {
  const queryTopics = extractPhrases(
    'How does neuroscience inform the memory consolidation and dream state processing pipeline?'
  );
  console.log('\n=== Full Query Simulation (RAKE → BM25 score all → sort → top 20) ===');
  console.log(`  Query topics: [${queryTopics.join(', ')}]`);

  const sizes = [100, 500, 1000, 2500, 5000, 8000, 10000, 12000, 16000, 25000, 50000, 100000];

  for (const size of sizes) {
    const entries = generateEntries(size);

    // Warm up
    for (const e of entries.slice(0, 10)) {
      bm25Score(queryTopics, e.topics);
    }

    const trials = Math.max(3, Math.ceil(50000 / size));
    const times = [];

    for (let t = 0; t < trials; t++) {
      const start = process.hrtime.bigint();

      // Simulate queryArchive: score all, filter, sort, limit
      const results = [];
      for (const entry of entries) {
        const score = bm25Score(queryTopics, entry.topics);
        if (score > 0) results.push({ memId: entry.memId, score });
      }
      results.sort((a, b) => b.score - a.score);
      const top = results.slice(0, 20);

      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      times.push(elapsed);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const marker = avg < 100 ? '✅' : '❌';

    console.log(
      `  ${marker} ${String(size).padStart(7)} entries → avg ${avg.toFixed(2)}ms  `
      + `(min ${min.toFixed(2)}, max ${max.toFixed(2)}) — ${trials} trials`
    );
  }
}

// ── Benchmark: Sharded path (bucket read simulation) ─────────────────────────

function benchBucketParse() {
  console.log('\n=== NDJSON Bucket Parse Simulation ===');
  const sizes = [100, 500, 1000, 5000, 10000];

  for (const size of sizes) {
    // Build a fake NDJSON string
    const lines = [];
    for (let i = 0; i < size; i++) {
      lines.push(JSON.stringify({
        memId: 'mem_' + String(i).padStart(8, '0'),
        topics: randomTopics(6),
        type: 'doc',
        created: new Date().toISOString(),
        importance: 0.5,
      }));
    }
    const ndjson = lines.join('\n') + '\n';

    const trials = 100;
    const start = process.hrtime.bigint();
    for (let t = 0; t < trials; t++) {
      const entries = [];
      for (const line of ndjson.split('\n')) {
        if (!line.trim()) continue;
        const obj = JSON.parse(line);
        if (!obj.stub && obj.memId) entries.push(obj);
      }
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`  ${String(size).padStart(7)} lines NDJSON → ${(elapsed / trials).toFixed(2)}ms/parse (${(ndjson.length / 1024).toFixed(0)} KB)`);
  }
}

// ── Benchmark: End-to-end (RAKE extract + BM25 query sim) ────────────────────

function benchEndToEnd() {
  const query = 'How does the archive sharding system handle neuroscience documents with temporal decay and dream state consolidation?';
  console.log('\n=== End-to-End: RAKE + Query (no disk I/O) ===');
  console.log(`  Query: "${query}"`);

  const sizes = [500, 1000, 5000, 8000, 10000, 12000, 16000, 25000, 50000];

  for (const size of sizes) {
    const entries = generateEntries(size);
    const trials = Math.max(3, Math.ceil(10000 / size));
    const times = [];

    for (let t = 0; t < trials; t++) {
      const start = process.hrtime.bigint();

      // RAKE extraction
      const topics = extractPhrases(query);

      // BM25 score + filter + sort + slice
      const results = [];
      for (const entry of entries) {
        const score = bm25Score(topics, entry.topics);
        if (score > 0) results.push({ memId: entry.memId, score });
      }
      results.sort((a, b) => b.score - a.score);
      results.slice(0, 20);

      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      times.push(elapsed);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const marker = avg < 100 ? '✅' : '❌';
    console.log(`  ${marker} ${String(size).padStart(7)} entries → avg ${avg.toFixed(2)}ms (${trials} trials)`);
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log('Archive Search Performance Benchmark');
console.log('=====================================');

benchRake();
benchBm25();
benchQuerySim();
benchBucketParse();
benchEndToEnd();

console.log('\n===== DONE =====');
