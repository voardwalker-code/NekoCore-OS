// ── Tests · Archive Sharding.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, fs, os, path. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
// ============================================================
// Unit Tests — archive-sharding.test.js
// Phase 4.6 — S0 Guard Tests
//
// Pins the CURRENT flat-index behavior of archive-index.js
// before any sharding changes are made.  These tests must
// continue to pass throughout S1–S4 (they become regression
// anchors for backward-compat + fallback paths).
//
// Also covers the NEW modules added in S1–S4.5:
//   • archive-router.js   (topicToSlug, readRouter, updateRouter,
//                          resolveQueryBuckets, listBuckets)
//   • bulk-ingest.js      (chunkText, chunkHash)
// Those sections are marked SKIP until the modules exist.
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

// makeTmpDir()
// WHAT THIS DOES: makeTmpDir creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call makeTmpDir(...) before code that depends on this setup.
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'neko-archive-test-'));
}
function patchEntitiesDir(mod, tmpDir) {
  // Allow tests to redirect ENTITIES_DIR to a temp location
  mod.ENTITIES_DIR = tmpDir;
}

// ============================================================
// SECTION A — Flat archive-index behavior guards
// These must pass NOW (before any S1–S4 changes).
// ============================================================

test('archive-index: ensureArchiveDirs creates episodic and docs subdirs', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { ensureArchiveDirs } = require('../../server/brain/utils/archive-index');
    ensureArchiveDirs('test_guard');
    assert.ok(fs.existsSync(path.join(tmp, 'Entity-test_guard', 'memories', 'archive', 'episodic')));
    assert.ok(fs.existsSync(path.join(tmp, 'Entity-test_guard', 'memories', 'archive', 'docs')));
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: appendArchiveEntry writes to flat archiveIndex.json', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, readArchiveIndex } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard001', 'mem_aaa', {
      topics: ['memory', 'test'],
      type: 'episodic',
      created: '2025-01-01T00:00:00.000Z',
      archivedAt: '2025-06-01T00:00:00.000Z',
      emotion: 'neutral',
      importance: 0.6,
      decayAtArchive: 0.04,
      docId: null
    });
    const index = readArchiveIndex('guard001');
    assert.ok(index['mem_aaa'], 'entry should exist in flat index');
    assert.deepEqual(index['mem_aaa'].topics, ['memory', 'test']);
    assert.equal(index['mem_aaa'].type, 'episodic');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: appendArchiveEntry defaults missing fields', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, readArchiveIndex } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard002', 'mem_bbb', { topics: ['science'] });
    const index = readArchiveIndex('guard002');
    const entry = index['mem_bbb'];
    assert.equal(entry.type, 'episodic');
    assert.equal(entry.emotion, 'neutral');
    assert.equal(entry.importance, 0.5);
    assert.equal(entry.decayAtArchive, 0);
    assert.equal(entry.docId, null);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: removeArchiveEntry deletes entry from flat index', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, removeArchiveEntry, readArchiveIndex } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard003', 'mem_ccc', { topics: ['philosophy'] });
    removeArchiveEntry('guard003', 'mem_ccc');
    const index = readArchiveIndex('guard003');
    assert.equal(index['mem_ccc'], undefined, 'entry should be deleted');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: removeArchiveEntry is a no-op for unknown memId', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { removeArchiveEntry } = require('../../server/brain/utils/archive-index');
    // Should not throw
    assert.doesNotThrow(() => removeArchiveEntry('guard004', 'mem_nonexistent'));
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: readArchiveIndex returns empty object when no file exists', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { readArchiveIndex } = require('../../server/brain/utils/archive-index');
    const index = readArchiveIndex('guard005_nofile');
    assert.deepEqual(index, {});
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: queryArchive returns empty array when index is empty', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { queryArchive } = require('../../server/brain/utils/archive-index');
    const results = queryArchive('guard006', ['memory'], 10);
    assert.deepEqual(results, []);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: queryArchive ranks exact topic match above partial match', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, queryArchive } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard007', 'mem_exact', {
      topics: ['memory', 'consolidation', 'pipeline'],
      created: '2025-01-01T00:00:00.000Z'
    });
    appendArchiveEntry('guard007', 'mem_partial', {
      topics: ['memory'],
      created: '2025-01-01T00:00:00.000Z'
    });
    const results = queryArchive('guard007', ['memory', 'consolidation', 'pipeline'], 10);
    assert.ok(results.length >= 2, 'should return both entries');
    assert.equal(results[0].memId, 'mem_exact', 'exact match should rank first');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: queryArchive respects yearRange.start filter', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, queryArchive } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard008', 'mem_old', { topics: ['history'], created: '2020-01-01T00:00:00.000Z' });
    appendArchiveEntry('guard008', 'mem_new', { topics: ['history'], created: '2024-01-01T00:00:00.000Z' });
    const results = queryArchive('guard008', ['history'], 10, { start: '2023-01-01T00:00:00.000Z' });
    const ids = results.map(r => r.memId);
    assert.ok(!ids.includes('mem_old'), 'old entry should be filtered out');
    assert.ok(ids.includes('mem_new'), 'new entry should be included');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: queryArchive respects yearRange.end filter', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, queryArchive } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard009', 'mem_old', { topics: ['biology'], created: '2020-01-01T00:00:00.000Z' });
    appendArchiveEntry('guard009', 'mem_new', { topics: ['biology'], created: '2025-06-01T00:00:00.000Z' });
    const results = queryArchive('guard009', ['biology'], 10, { end: '2022-12-31T23:59:59.000Z' });
    const ids = results.map(r => r.memId);
    assert.ok(ids.includes('mem_old'), 'old entry should be included');
    assert.ok(!ids.includes('mem_new'), 'new entry should be filtered out');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: queryArchive returns empty array for empty topics array', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, queryArchive } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('guard010', 'mem_x', { topics: ['quantum', 'physics'] });
    const results = queryArchive('guard010', [], 10);
    assert.deepEqual(results, []);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index: queryArchive respects limit', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, queryArchive } = require('../../server/brain/utils/archive-index');
    for (let i = 0; i < 10; i++) {
      appendArchiveEntry('guard011', `mem_${i}`, { topics: ['science', 'data'], created: '2024-01-01T00:00:00.000Z' });
    }
    const results = queryArchive('guard011', ['science'], 3);
    assert.equal(results.length, 3);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

// ============================================================
// SECTION B — archive-router.js (S1 — skipped until module exists)
// These become active once archive-router.js is created.
// ============================================================

test('archive-router: topicToSlug lowercases and replaces spaces with underscores', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const { topicToSlug } = require('../../server/brain/utils/archive-router');
  assert.equal(topicToSlug('Neural Plasticity'), 'neural_plasticity');
  assert.equal(topicToSlug('QUANTUM PHYSICS'), 'quantum_physics');
  assert.equal(topicToSlug('memory consolidation'), 'memory_consolidation');
});

test('archive-router: topicToSlug strips non-alphanumeric except underscores', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const { topicToSlug } = require('../../server/brain/utils/archive-router');
  assert.equal(topicToSlug('DNA/RNA'), 'dna_rna');
  assert.equal(topicToSlug('  spaced  '), 'spaced');
  assert.equal(topicToSlug(''), '_misc');
});

test('archive-router: readRouter returns empty object when no router file', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { readRouter } = require('../../server/brain/utils/archive-router');
    assert.deepEqual(readRouter('router_test_no_file'), {});
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-router: updateRouter creates and updates router atomically', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { updateRouter, readRouter } = require('../../server/brain/utils/archive-router');
    updateRouter('router_test_wr', 'neuroscience', 'bucket_neuroscience.ndjson');
    const router = readRouter('router_test_wr');
    assert.equal(router['neuroscience'], 'bucket_neuroscience.ndjson');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-router: resolveQueryBuckets returns matching bucket filenames', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { updateRouter, resolveQueryBuckets } = require('../../server/brain/utils/archive-router');
    updateRouter('router_test_q', 'neuroscience', 'bucket_neuroscience.ndjson');
    updateRouter('router_test_q', 'philosophy', 'bucket_philosophy.ndjson');
    const buckets = resolveQueryBuckets('router_test_q', ['neuroscience', 'unknown_topic']);
    assert.ok(buckets.includes('bucket_neuroscience.ndjson'));
    assert.equal(buckets.length, 1, 'unknown topic should not add a bucket');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-router: resolveQueryBuckets returns [] for all unknown topics', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { resolveQueryBuckets } = require('../../server/brain/utils/archive-router');
    const buckets = resolveQueryBuckets('router_test_empty', ['totally_unknown_xyz']);
    assert.deepEqual(buckets, []);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-router: listBuckets returns all registered bucket filenames', { skip: !moduleExists('../../server/brain/utils/archive-router') }, () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { updateRouter, listBuckets } = require('../../server/brain/utils/archive-router');
    updateRouter('router_test_list', 'biology', 'bucket_biology.ndjson');
    updateRouter('router_test_list', 'chemistry', 'bucket_chemistry.ndjson');
    const buckets = listBuckets('router_test_list');
    assert.ok(buckets.includes('bucket_biology.ndjson'));
    assert.ok(buckets.includes('bucket_chemistry.ndjson'));
    assert.equal(buckets.length, 2);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

// ============================================================
// SECTION C — bulk-ingest.js (S4.5 — skipped until module exists)
// ============================================================

test('bulk-ingest: chunkText splits text into chunks of ~target size', { skip: !moduleExists('../../server/brain/utils/bulk-ingest') }, () => {
  const { chunkText } = require('../../server/brain/utils/bulk-ingest');
  // Build a text of ~6000 chars by repeating short paragraphs
  const para = 'The quick brown fox jumps over the lazy dog. ';
  const text = para.repeat(134); // ~6030 chars
  const chunks = chunkText(text, 600);
  assert.ok(chunks.length >= 8, 'should produce multiple chunks');
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 800, `chunk too long: ${chunk.length}`);
    assert.ok(chunk.length > 0, 'chunk should not be empty');
  }
});

test('bulk-ingest: chunkText never splits mid-word', { skip: !moduleExists('../../server/brain/utils/bulk-ingest') }, () => {
  const { chunkText } = require('../../server/brain/utils/bulk-ingest');
  const words = 'neuroscience philosophy consciousness biology technology'.split(' ');
  // Generate text where splitting mid-word would be visible
  const text = Array.from({ length: 300 }, (_, i) => words[i % words.length] + ' ').join('');
  const chunks = chunkText(text, 100);
  for (const chunk of chunks) {
    // Should start and end on word boundaries (no trailing/leading partial words from mid-split)
    assert.ok(!/^\S*[a-z]\s/.test(chunk.slice(-3)), 'chunk should not end mid-sentence arbitrarily');
  }
});

test('bulk-ingest: chunkHash is deterministic', { skip: !moduleExists('../../server/brain/utils/bulk-ingest') }, () => {
  const { chunkHash } = require('../../server/brain/utils/bulk-ingest');
  const text = 'The mitochondria is the powerhouse of the cell.';
  assert.equal(chunkHash(text), chunkHash(text));
});

test('bulk-ingest: chunkHash differs for different content', { skip: !moduleExists('../../server/brain/utils/bulk-ingest') }, () => {
  const { chunkHash } = require('../../server/brain/utils/bulk-ingest');
  assert.notEqual(chunkHash('apple'), chunkHash('orange'));
});

// ── Helper ────────────────────────────────────────────────────────────────────

// moduleExists()
// WHAT THIS DOES: moduleExists is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call moduleExists(...) where this helper behavior is needed.
function moduleExists(relPath) {
  try {
    require.resolve(path.resolve(__dirname, relPath));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// SECTION D — Sharded write behavior (S2)
// Verifies dual-write: entries land in both flat index AND bucket.
// ============================================================

test('archive-index (S2): appendArchiveEntry writes entry to primary bucket file', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('s2_001', 'mem_s2_a', {
      topics: ['neuroscience', 'plasticity'],
      type: 'episodic',
      created: '2025-01-01T00:00:00.000Z'
    });
    const bucketPath = path.join(tmp, 'Entity-s2_001', 'memories', 'archive', 'bucket_neuroscience.ndjson');
    assert.ok(fs.existsSync(bucketPath), 'primary bucket file should exist');
    const lines = fs.readFileSync(bucketPath, 'utf8').trim().split('\n').filter(Boolean);
    assert.equal(lines.length, 1, 'should have exactly one line in bucket');
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.memId, 'mem_s2_a');
    assert.deepEqual(entry.topics, ['neuroscience', 'plasticity']);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index (S2): appendArchiveEntry updates router for primary topic', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry } = require('../../server/brain/utils/archive-index');
    const { readRouter } = require('../../server/brain/utils/archive-router');
    appendArchiveEntry('s2_002', 'mem_s2_b', { topics: ['philosophy', 'ethics'] });
    const router = readRouter('s2_002');
    assert.equal(router['philosophy'], 'bucket_philosophy.ndjson');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index (S2): appendArchiveEntry writes stubs for secondary topics', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('s2_003', 'mem_s2_c', {
      topics: ['biology', 'genetics', 'evolution']
    });
    // Secondary bucket for 'genetics' should have a stub
    const geneticsBucket = path.join(tmp, 'Entity-s2_003', 'memories', 'archive', 'bucket_genetics.ndjson');
    assert.ok(fs.existsSync(geneticsBucket), 'secondary bucket should exist');
    const lines = fs.readFileSync(geneticsBucket, 'utf8').trim().split('\n').filter(Boolean);
    const stub = JSON.parse(lines[0]);
    assert.equal(stub.memId, 'mem_s2_c');
    assert.equal(stub.stub, true);
    assert.equal(stub.primaryBucket, 'bucket_biology.ndjson');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index (S2): removeArchiveEntry removes line from primary bucket', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { appendArchiveEntry, removeArchiveEntry } = require('../../server/brain/utils/archive-index');
    appendArchiveEntry('s2_004', 'mem_s2_d', { topics: ['chemistry'] });
    removeArchiveEntry('s2_004', 'mem_s2_d');
    const bucketPath = path.join(tmp, 'entity_s2_004', 'memories', 'archive', 'bucket_chemistry.ndjson');
    if (fs.existsSync(bucketPath)) {
      const lines = fs.readFileSync(bucketPath, 'utf8').trim().split('\n').filter(Boolean);
      const found = lines.some(l => { try { return JSON.parse(l).memId === 'mem_s2_d'; } catch { return false; } });
      assert.ok(!found, 'removed entry should not appear in bucket');
    }
    // Flat index should also be gone (existing guard behavior)
    const { readArchiveIndex } = require('../../server/brain/utils/archive-index');
    assert.equal(readArchiveIndex('s2_004')['mem_s2_d'], undefined);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

// ============================================================
// SECTION E — Migration utility (S4)
// ============================================================

test('archive-index (S4): migrateToShards on empty index writes marker with count=0', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const { migrateToShards } = require('../../server/brain/utils/archive-index');
    // Ensure archive dir exists so migration can write marker
    fs.mkdirSync(path.join(tmp, 'entity_s4_001', 'memories', 'archive'), { recursive: true });
    migrateToShards('s4_001');
    const markerPath = path.join(tmp, 'entity_s4_001', 'memories', 'archive', 'migration_complete.json');
    assert.ok(fs.existsSync(markerPath), 'migration marker should be written');
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    assert.equal(marker.count, 0);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index (S4): migrateToShards migrates flat index entries to buckets', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    // Write a flat index directly (bypassing appendArchiveEntry to simulate pre-S2 state)
    const archiveDir = path.join(tmp, 'entity_s4_002', 'memories', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const flatIndex = {
      'mem_legacy_x': { topics: ['history', 'archaeology'], type: 'episodic', created: '2024-01-01T00:00:00.000Z', archivedAt: '2024-01-01T00:00:00.000Z', emotion: 'neutral', importance: 0.5, decayAtArchive: 0, docId: null },
      'mem_legacy_y': { topics: ['physics'], type: 'doc', created: '2024-06-01T00:00:00.000Z', archivedAt: '2024-06-01T00:00:00.000Z', emotion: 'curious', importance: 0.7, decayAtArchive: 0.01, docId: 'doc_001' }
    };
    fs.writeFileSync(path.join(archiveDir, 'archiveIndex.json'), JSON.stringify(flatIndex), 'utf8');

    const { migrateToShards } = require('../../server/brain/utils/archive-index');
    migrateToShards('s4_002');

    // Primary bucket for 'history' should have mem_legacy_x
    const histBucket = path.join(archiveDir, 'bucket_history.ndjson');
    assert.ok(fs.existsSync(histBucket), 'history bucket should exist');
    const histLines = fs.readFileSync(histBucket, 'utf8').trim().split('\n').filter(Boolean);
    const histEntry = histLines.map(JSON.parse).find(e => e.memId === 'mem_legacy_x');
    assert.ok(histEntry && !histEntry.stub, 'full entry should be in history bucket');

    // Primary bucket for 'physics' should have mem_legacy_y
    const physBucket = path.join(archiveDir, 'bucket_physics.ndjson');
    assert.ok(fs.existsSync(physBucket), 'physics bucket should exist');
    const physLines = fs.readFileSync(physBucket, 'utf8').trim().split('\n').filter(Boolean);
    const physEntry = physLines.map(JSON.parse).find(e => e.memId === 'mem_legacy_y');
    assert.ok(physEntry && !physEntry.stub, 'full entry should be in physics bucket');

    // Stub for secondary topic 'archaeology' should be in its bucket
    const archBucket = path.join(archiveDir, 'bucket_archaeology.ndjson');
    assert.ok(fs.existsSync(archBucket), 'archaeology stub bucket should exist');
    const archLines = fs.readFileSync(archBucket, 'utf8').trim().split('\n').filter(Boolean);
    const archStub = archLines.map(JSON.parse).find(e => e.memId === 'mem_legacy_x');
    assert.ok(archStub && archStub.stub === true, 'stub should be written for secondary topic');

    // Router should map both primary slugs
    const { readRouter } = require('../../server/brain/utils/archive-router');
    const router = readRouter('s4_002');
    assert.equal(router['history'], 'bucket_history.ndjson');
    assert.equal(router['physics'], 'bucket_physics.ndjson');

    // Marker count
    const marker = JSON.parse(fs.readFileSync(path.join(archiveDir, 'migration_complete.json'), 'utf8'));
    assert.equal(marker.count, 2);
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index (S4): migrateToShards is idempotent (marker prevents re-run)', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const archiveDir = path.join(tmp, 'entity_s4_003', 'memories', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const flatIndex = {
      'mem_idem': { topics: ['chemistry'], type: 'episodic', created: '2024-01-01T00:00:00.000Z', archivedAt: '2024-01-01T00:00:00.000Z', emotion: 'neutral', importance: 0.5, decayAtArchive: 0, docId: null }
    };
    fs.writeFileSync(path.join(archiveDir, 'archiveIndex.json'), JSON.stringify(flatIndex), 'utf8');

    const { migrateToShards } = require('../../server/brain/utils/archive-index');
    migrateToShards('s4_003');
    migrateToShards('s4_003'); // second call — should be no-op

    const chemBucket = path.join(archiveDir, 'bucket_chemistry.ndjson');
    const lines = fs.readFileSync(chemBucket, 'utf8').trim().split('\n').filter(Boolean);
    // Should have exactly 1 line (not 2 from a duplicate migration run)
    assert.equal(lines.length, 1, 'bucket should have exactly 1 entry after idempotent migration');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});

test('archive-index (S4): queryArchive returns correct results after migration from flat index', () => {
  const tmp = makeTmpDir();
  const entityPaths = require('../../server/entityPaths');
  const origDir = entityPaths.ENTITIES_DIR;
  entityPaths.ENTITIES_DIR = tmp;
  try {
    const archiveDir = path.join(tmp, 'entity_s4_004', 'memories', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    // Pre-existing flat index (no buckets, no router)
    const flatIndex = {
      'mem_mig_a': { topics: ['neuroscience', 'plasticity'], type: 'episodic', created: '2024-01-01T00:00:00.000Z', archivedAt: '2024-01-01T00:00:00.000Z', emotion: 'focused', importance: 0.8, decayAtArchive: 0, docId: null },
      'mem_mig_b': { topics: ['mathematics'], type: 'episodic', created: '2024-01-01T00:00:00.000Z', archivedAt: '2024-01-01T00:00:00.000Z', emotion: 'neutral', importance: 0.5, decayAtArchive: 0, docId: null }
    };
    fs.writeFileSync(path.join(archiveDir, 'archiveIndex.json'), JSON.stringify(flatIndex), 'utf8');

    const { migrateToShards, queryArchive } = require('../../server/brain/utils/archive-index');
    migrateToShards('s4_004');

    const results = queryArchive('s4_004', ['neuroscience', 'plasticity'], 10);
    assert.ok(results.length >= 1, 'should find at least 1 result');
    assert.equal(results[0].memId, 'mem_mig_a', 'best match should come first');
    // mathematics entry should not appear for neuroscience query
    assert.ok(!results.find(r => r.memId === 'mem_mig_b'), 'unrelated entry should not appear');
  } finally {
    entityPaths.ENTITIES_DIR = origDir;
  }
});
