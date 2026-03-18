// ============================================================
// Guard Tests — Phase 4.7 E-1: Index Infrastructure
// Guards that define and lock the expected behavior of:
//   1. entityPaths.getArchiveIndexDir() path helper
//   2. archive-indexes.js module shape
//   3. readIndex / writeIndex round-trip contract
//   4. listIndexes axis enumeration
//   5. intersectIndexes multi-axis Set intersection
//   6. narrowByIndex entry filtering
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');

const entityPathsPath   = path.join(__dirname, '../../server/entityPaths.js');
const archiveIndexesPath = path.join(__dirname, '../../server/brain/utils/archive-indexes.js');

// ── entityPaths.getArchiveIndexDir ───────────────────────────────────────────

test('entityPaths exports getArchiveIndexDir', () => {
  const ep = require(entityPathsPath);
  assert.equal(typeof ep.getArchiveIndexDir, 'function',
    'entityPaths must export getArchiveIndexDir as a function');
});

test('getArchiveIndexDir returns path ending with archive/indexes', () => {
  const { getArchiveIndexDir } = require(entityPathsPath);
  const result = getArchiveIndexDir('test_abc');
  assert.ok(
    result.replace(/\\/g, '/').endsWith('memories/archive/indexes'),
    `Expected path to end with memories/archive/indexes, got: ${result}`
  );
});

test('getArchiveIndexDir is scoped to the entity', () => {
  const { getArchiveIndexDir } = require(entityPathsPath);
  const a = getArchiveIndexDir('ent_aaa');
  const b = getArchiveIndexDir('ent_bbb');
  assert.notEqual(a, b, 'Different entities must have different archive index dirs');
  assert.ok(a.includes('ent_aaa') || a.includes('entity_aaa'),
    'Path must contain the entity id');
});

// ── archive-indexes.js module shape ─────────────────────────────────────────

test('archive-indexes.js exists at expected path', () => {
  assert.ok(fs.existsSync(archiveIndexesPath),
    'archive-indexes.js must exist at server/brain/utils/archive-indexes.js');
});

test('archive-indexes exports readIndex as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.readIndex, 'function', 'readIndex must be exported');
});

test('archive-indexes exports writeIndex as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.writeIndex, 'function', 'writeIndex must be exported');
});

test('archive-indexes exports listIndexes as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.listIndexes, 'function', 'listIndexes must be exported');
});

test('archive-indexes exports intersectIndexes as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.intersectIndexes, 'function', 'intersectIndexes must be exported');
});

test('archive-indexes exports narrowByIndex as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.narrowByIndex, 'function', 'narrowByIndex must be exported');
});

// ── readIndex / writeIndex round-trip ────────────────────────────────────────

function tmpEntityId() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

test('writeIndex then readIndex returns the same entries', () => {
  const { writeIndex, readIndex } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);
  const entries = ['mem_001', 'mem_002', 'mem_003'];

  writeIndex(entityId, 'temporal', '2025-03', entries, { baseDir: tmpDir });
  const result = readIndex(entityId, 'temporal', '2025-03', { baseDir: tmpDir });

  assert.deepEqual(result, entries, 'readIndex must return the same entries written by writeIndex');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('readIndex returns empty array for a key that does not exist', () => {
  const { readIndex } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  const result = readIndex(entityId, 'temporal', 'nonexistent-key', { baseDir: tmpDir });
  assert.deepEqual(result, [], 'readIndex must return [] for a missing key');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('writeIndex overwrites an existing key with new entries', () => {
  const { writeIndex, readIndex } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  writeIndex(entityId, 'subject', 'physics', ['mem_001'], { baseDir: tmpDir });
  writeIndex(entityId, 'subject', 'physics', ['mem_002', 'mem_003'], { baseDir: tmpDir });
  const result = readIndex(entityId, 'subject', 'physics', { baseDir: tmpDir });

  assert.deepEqual(result, ['mem_002', 'mem_003'], 'writeIndex must overwrite existing entries');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── listIndexes ──────────────────────────────────────────────────────────────

test('listIndexes returns all keys written under an axis', () => {
  const { writeIndex, listIndexes } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  writeIndex(entityId, 'temporal', '2024-01', ['mem_a'], { baseDir: tmpDir });
  writeIndex(entityId, 'temporal', '2024-02', ['mem_b'], { baseDir: tmpDir });
  writeIndex(entityId, 'temporal', '2025-06', ['mem_c'], { baseDir: tmpDir });

  const keys = listIndexes(entityId, 'temporal', { baseDir: tmpDir });
  assert.ok(keys.includes('2024-01'), '2024-01 must be in key list');
  assert.ok(keys.includes('2024-02'), '2024-02 must be in key list');
  assert.ok(keys.includes('2025-06'), '2025-06 must be in key list');
  assert.equal(keys.length, 3, 'listIndexes must return exactly 3 keys');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('listIndexes returns empty array when axis has no indexes', () => {
  const { listIndexes } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  const keys = listIndexes(entityId, 'subject', { baseDir: tmpDir });
  assert.deepEqual(keys, [], 'listIndexes must return [] when no indexes exist for axis');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── intersectIndexes ─────────────────────────────────────────────────────────

test('intersectIndexes returns Set of memIds present in all filters', () => {
  const { writeIndex, intersectIndexes } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  // temporal: 2025-03 has mem_001, mem_002, mem_003
  writeIndex(entityId, 'temporal', '2025-03', ['mem_001', 'mem_002', 'mem_003'], { baseDir: tmpDir });
  // subject: physics has mem_002, mem_003, mem_004
  writeIndex(entityId, 'subject', 'physics', ['mem_002', 'mem_003', 'mem_004'], { baseDir: tmpDir });

  const result = intersectIndexes(entityId, [
    { axis: 'temporal', key: '2025-03' },
    { axis: 'subject',  key: 'physics' }
  ], { baseDir: tmpDir });

  assert.ok(result instanceof Set, 'intersectIndexes must return a Set');
  assert.ok(result.has('mem_002'), 'mem_002 is in both indexes — must be in result');
  assert.ok(result.has('mem_003'), 'mem_003 is in both indexes — must be in result');
  assert.equal(result.has('mem_001'), false, 'mem_001 is only in temporal — must NOT be in result');
  assert.equal(result.has('mem_004'), false, 'mem_004 is only in subject — must NOT be in result');
  assert.equal(result.size, 2, 'Intersection must contain exactly 2 ids');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('intersectIndexes returns empty Set when no filters provided', () => {
  const { intersectIndexes } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  const result = intersectIndexes(entityId, [], { baseDir: tmpDir });
  assert.ok(result instanceof Set, 'intersectIndexes must always return a Set');
  assert.equal(result.size, 0, 'Empty filters must yield empty Set');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('intersectIndexes returns empty Set when intersection is empty', () => {
  const { writeIndex, intersectIndexes } = require(archiveIndexesPath);
  const entityId = tmpEntityId();
  const tmpDir = path.join(os.tmpdir(), `nekocore_idx_test_${Date.now()}`);

  writeIndex(entityId, 'temporal', '2024-01', ['mem_A', 'mem_B'], { baseDir: tmpDir });
  writeIndex(entityId, 'subject',  'cooking',  ['mem_C', 'mem_D'], { baseDir: tmpDir });

  const result = intersectIndexes(entityId, [
    { axis: 'temporal', key: '2024-01' },
    { axis: 'subject',  key: 'cooking' }
  ], { baseDir: tmpDir });

  assert.equal(result.size, 0, 'Disjoint index sets must yield empty intersection');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── narrowByIndex ────────────────────────────────────────────────────────────

test('narrowByIndex returns only entries whose id is in the narrowSet', () => {
  const { narrowByIndex } = require(archiveIndexesPath);
  const entries = [
    { id: 'mem_001', summary: 'first' },
    { id: 'mem_002', summary: 'second' },
    { id: 'mem_003', summary: 'third' },
  ];
  const narrowSet = new Set(['mem_001', 'mem_003']);
  const result = narrowByIndex(entries, narrowSet);

  assert.equal(result.length, 2, 'narrowByIndex must return exactly 2 matching entries');
  assert.ok(result.some(e => e.id === 'mem_001'), 'mem_001 must be in result');
  assert.ok(result.some(e => e.id === 'mem_003'), 'mem_003 must be in result');
  assert.equal(result.some(e => e.id === 'mem_002'), false, 'mem_002 must NOT be in result');
});

test('narrowByIndex returns empty array when narrowSet is empty', () => {
  const { narrowByIndex } = require(archiveIndexesPath);
  const entries = [{ id: 'mem_001' }, { id: 'mem_002' }];
  const result = narrowByIndex(entries, new Set());
  assert.deepEqual(result, [], 'narrowByIndex with empty Set must return []');
});

test('narrowByIndex returns all entries when all ids are in narrowSet', () => {
  const { narrowByIndex } = require(archiveIndexesPath);
  const entries = [{ id: 'mem_A' }, { id: 'mem_B' }, { id: 'mem_C' }];
  const narrowSet = new Set(['mem_A', 'mem_B', 'mem_C']);
  const result = narrowByIndex(entries, narrowSet);
  assert.equal(result.length, 3, 'narrowByIndex must return all entries when all match');
});

test('narrowByIndex returns empty array for empty entries', () => {
  const { narrowByIndex } = require(archiveIndexesPath);
  const result = narrowByIndex([], new Set(['mem_001']));
  assert.deepEqual(result, [], 'narrowByIndex with empty entries must return []');
});
