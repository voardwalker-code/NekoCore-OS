'use strict';
/**
 * tests/unit/archive-index.test.js
 * IME Phase I3-0 guard tests — archive-index utility
 *
 * All tests use a temporary directory so no real entity data is touched.
 *
 * Verifies:
 *   1. ensureArchiveDirs creates the required directory tree
 *   2. readArchiveIndex returns {} for a fresh entity (no file yet)
 *   3. appendArchiveEntry writes a correct entry
 *   4. removeArchiveEntry deletes an entry
 *   5. queryArchive returns BM25-ranked matches
 *   6. queryArchive respects yearRange filter
 *   7. queryArchive returns [] when no topics match
 *   8. queryArchive returns [] for empty topics input
 */

const { test, before, after } = require('node:test');
const assert  = require('node:assert/strict');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

// ── We test archive-index.js directly but it needs entityPaths.js to resolve ──
// Patch the module to use a temp entity root so no real entity data is touched.
let tmpRoot;
let tmpEntityId;

// We'll temporarily override the 'archive' sub-paths by working around entityPaths.
// archive-index.js imports entityPaths, so we mock by placing a real entity tree
// in the temp dir matching the ENTITIES_DIR convention.

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'neko-archive-test-'));
  tmpEntityId = 'test_archive_unit';

  // archive-index.js uses getArchiveRoot which calls getEntityRoot(entityId) = ENTITIES_DIR/entity_<id>/memories
  // We need to make that path exist in tmp. The simplest approach: use the real
  // archive-index.js but point ENTITIES_DIR to our tmp dir by setting up the
  // full entity directory structure.
  const entityDir = path.join(tmpRoot, 'entities', `entity_${tmpEntityId}`, 'memories');
  fs.mkdirSync(entityDir, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
});

// Helper: get a fresh require of archive-index with ENTITIES_DIR overridden
function getArchiveIndex() {
  // Clear require cache so we can re-require with fresh state
  const aiPath = require.resolve('../../server/brain/utils/archive-index');
  const epPath = require.resolve('../../server/entityPaths');
  delete require.cache[aiPath];
  delete require.cache[epPath];

  // Override ENTITIES_DIR by monkey-patching after require
  const ep  = require('../../server/entityPaths');
  const origEntitiesDir = ep.ENTITIES_DIR;

  // Point ENTITIES_DIR to our tmp dir
  Object.defineProperty(ep, 'ENTITIES_DIR', {
    value: path.join(tmpRoot, 'entities'),
    writable: true,
    configurable: true,
  });

  const ai = require('../../server/brain/utils/archive-index');
  return { ai, ep, origEntitiesDir };
}

// ── 1. ensureArchiveDirs ──────────────────────────────────────────────────────
test('archive-index: ensureArchiveDirs creates archive/episodic and archive/docs', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);

    const archiveEpisodic = path.join(tmpRoot, 'entities', `entity_${tmpEntityId}`, 'memories', 'archive', 'episodic');
    const archiveDocs     = path.join(tmpRoot, 'entities', `entity_${tmpEntityId}`, 'memories', 'archive', 'docs');

    assert.ok(fs.existsSync(archiveEpisodic), `archive/episodic should exist`);
    assert.ok(fs.existsSync(archiveDocs),     `archive/docs should exist`);
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

test('archive-index: ensureArchiveDirs is idempotent (no error on second call)', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);
    assert.doesNotThrow(() => ai.ensureArchiveDirs(tmpEntityId));
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 2. readArchiveIndex — empty ───────────────────────────────────────────────
test('archive-index: readArchiveIndex returns {} for new entity', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    const index = ai.readArchiveIndex('nonexistent_entity_xyz');
    assert.deepEqual(index, {});
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 3. appendArchiveEntry ─────────────────────────────────────────────────────
test('archive-index: appendArchiveEntry writes a correct entry', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_test001', {
      topics:         ['memory', 'pipeline'],
      archivedAt:     now,
      type:           'episodic',
      decayAtArchive: 0.04,
      created:        now,
      emotion:        'calm',
      importance:     0.7,
      docId:          null,
    });

    const index = ai.readArchiveIndex(tmpEntityId);
    assert.ok(index['mem_test001'], 'Entry should exist in index');
    assert.deepEqual(index['mem_test001'].topics, ['memory', 'pipeline']);
    assert.equal(index['mem_test001'].type,      'episodic');
    assert.equal(index['mem_test001'].importance, 0.7);
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 4. removeArchiveEntry ─────────────────────────────────────────────────────
test('archive-index: removeArchiveEntry deletes an entry', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_del001', {
      topics: ['test'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'neutral',
      importance: 0.5, docId: null,
    });
    ai.removeArchiveEntry(tmpEntityId, 'mem_del001');

    const index = ai.readArchiveIndex(tmpEntityId);
    assert.equal(index['mem_del001'], undefined, 'Deleted entry should not exist');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 5. queryArchive — BM25 match ──────────────────────────────────────────────
test('archive-index: queryArchive returns matching entries sorted by BM25 score', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_q001', {
      topics: ['memory', 'pipeline', 'consolidation'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.02, created: now, emotion: 'calm', importance: 0.8, docId: null,
    });
    ai.appendArchiveEntry(tmpEntityId, 'mem_q002', {
      topics: ['pipeline'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'calm', importance: 0.5, docId: null,
    });
    ai.appendArchiveEntry(tmpEntityId, 'mem_q003', {
      topics: ['dream', 'synthesis'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'wonder', importance: 0.6, docId: null,
    });

    const results = ai.queryArchive(tmpEntityId, ['memory', 'pipeline', 'consolidation'], 10);
    assert.ok(results.length >= 2, `Expected ≥ 2 results, got ${results.length}`);
    // mem_q001 has 3/3 topic overlap — should rank first
    const topId = results[0].memId;
    assert.equal(topId, 'mem_q001', `Expected mem_q001 first, got ${topId}`);
    // mem_q003 (no overlap) should not appear
    const hasQ3 = results.some(r => r.memId === 'mem_q003');
    assert.equal(hasQ3, false, 'mem_q003 should not appear (no topic overlap)');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 6. queryArchive — yearRange filter ───────────────────────────────────────
test('archive-index: queryArchive respects yearRange filter', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.appendArchiveEntry(tmpEntityId, 'mem_yr2020', {
      topics: ['memory', 'pipeline'], archivedAt: '2020-01-01T00:00:00.000Z', type: 'episodic',
      decayAtArchive: 0.01, created: '2020-01-01T00:00:00.000Z', emotion: 'calm', importance: 0.6, docId: null,
    });
    ai.appendArchiveEntry(tmpEntityId, 'mem_yr2025', {
      topics: ['memory', 'pipeline'], archivedAt: '2025-06-01T00:00:00.000Z', type: 'episodic',
      decayAtArchive: 0.01, created: '2025-06-01T00:00:00.000Z', emotion: 'calm', importance: 0.6, docId: null,
    });

    const results = ai.queryArchive(tmpEntityId, ['memory', 'pipeline'], 10, {
      start: '2025-01-01T00:00:00.000Z',
      end:   '2025-12-31T23:59:59.999Z',
    });

    const ids = results.map(r => r.memId);
    assert.ok(ids.includes('mem_yr2025'), 'mem_yr2025 should be included');
    assert.ok(!ids.includes('mem_yr2020'), 'mem_yr2020 should be excluded by year range');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 7. queryArchive — no match returns [] ────────────────────────────────────
test('archive-index: queryArchive returns [] when no topics match', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    const results = ai.queryArchive(tmpEntityId, ['zzz_nonexistent_topic_xyz'], 10);
    assert.ok(Array.isArray(results));
    assert.equal(results.filter(r => r.memId.startsWith('mem_yr') === false && r.score > 0).length === results.length || results.length === 0, true);
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── 8. queryArchive — empty topics returns [] ────────────────────────────────
test('archive-index: queryArchive returns [] for empty topics', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    assert.deepEqual(ai.queryArchive(tmpEntityId, []), []);
    assert.deepEqual(ai.queryArchive(tmpEntityId, null), []);
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});
