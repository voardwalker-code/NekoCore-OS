// ── Tests · Archive Index Rebuild Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, fs, path, os. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Guard Tests — Phase 4.7 E-3 + E-4: Temporal & Subject Index Builders
// Guards that define and lock the expected behavior of:
//   1. rebuildTemporalIndexes() — groups bucket entries by YYYY-MM
//   2. rebuildSubjectIndexes() — clusters topics by co-occurrence
//   3. phase-archive-index.js — brain loop phase module shape
//   4. phase-archive-index registered in phases/index.js after 'archive'
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');

const archiveIndexesPath    = path.join(__dirname, '../../server/brain/utils/archive-indexes.js');
const archiveIndexPath      = path.join(__dirname, '../../server/brain/utils/archive-index.js');
const archiveRouterPath     = path.join(__dirname, '../../server/brain/utils/archive-router.js');
const phaseArchiveIndexPath = path.join(__dirname, '../../server/brain/cognition/phases/phase-archive-index.js');
const phasesIndexPath       = path.join(__dirname, '../../server/brain/cognition/phases/index.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

// tmpBase()
// WHAT THIS DOES: tmpBase is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call tmpBase(...) where this helper behavior is needed.
function tmpBase() {
  return path.join(os.tmpdir(), `neko_idx_rebuild_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
}

/**
 * Write fake bucket NDJSON entries for test isolation.
 * baseDir mirrors the live entities root layout.
 */
// writeBucket()
// WHAT THIS DOES: writeBucket changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call writeBucket(...) with the new values you want to persist.
function writeBucket(baseDir, entityId, filename, entries) {
  const { getArchiveRoot } = require(path.join(__dirname, '../../server/entityPaths'));
  // We can't call getArchiveRoot with baseDir override, so we build the path manually.
  const bucketPath = path.join(baseDir, `entity_${entityId}`, 'memories', 'archive', filename);
  fs.mkdirSync(path.dirname(bucketPath), { recursive: true });
  const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(bucketPath, lines, 'utf8');
}

/**
 * Write a fake router.json for test isolation.
 */
// writeRouter()
// WHAT THIS DOES: writeRouter changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call writeRouter(...) with the new values you want to persist.
function writeRouter(baseDir, entityId, routerObj) {
  const routerPath = path.join(baseDir, `entity_${entityId}`, 'memories', 'archive', 'router.json');
  fs.mkdirSync(path.dirname(routerPath), { recursive: true });
  fs.writeFileSync(routerPath, JSON.stringify(routerObj), 'utf8');
}

// ── rebuildTemporalIndexes — module shape ─────────────────────────────────────

test('archive-indexes exports rebuildTemporalIndexes as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.rebuildTemporalIndexes, 'function',
    'rebuildTemporalIndexes must be exported from archive-indexes.js');
});

// ── rebuildTemporalIndexes — behavior ────────────────────────────────────────

test('rebuildTemporalIndexes creates temporal indexes grouped by YYYY-MM', () => {
  const { rebuildTemporalIndexes, readIndex } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_ent';

  // Write a bucket with entries spanning two months.
  writeBucket(baseDir, entityId, 'bucket_physics.ndjson', [
    { memId: 'mem_001', topics: ['physics'], created: '2025-03-10T10:00:00Z' },
    { memId: 'mem_002', topics: ['physics'], created: '2025-03-22T08:00:00Z' },
    { memId: 'mem_003', topics: ['physics'], created: '2025-04-05T14:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, { 'physics': 'bucket_physics.ndjson' });

  rebuildTemporalIndexes(entityId, { baseDir });

  const march = readIndex(entityId, 'temporal', '2025-03', { baseDir });
  const april = readIndex(entityId, 'temporal', '2025-04', { baseDir });

  assert.ok(march.includes('mem_001'), 'mem_001 (March) must appear in temporal/2025-03 index');
  assert.ok(march.includes('mem_002'), 'mem_002 (March) must appear in temporal/2025-03 index');
  assert.equal(march.length, 2, 'temporal/2025-03 must contain exactly 2 entries');
  assert.ok(april.includes('mem_003'), 'mem_003 (April) must appear in temporal/2025-04 index');
  assert.equal(april.length, 1, 'temporal/2025-04 must contain exactly 1 entry');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('rebuildTemporalIndexes merges entries from multiple buckets', () => {
  const { rebuildTemporalIndexes, readIndex } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_ent2';

  writeBucket(baseDir, entityId, 'bucket_a.ndjson', [
    { memId: 'mem_A1', topics: ['alpha'], created: '2025-06-01T00:00:00Z' },
  ]);
  writeBucket(baseDir, entityId, 'bucket_b.ndjson', [
    { memId: 'mem_B1', topics: ['beta'],  created: '2025-06-15T00:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, { 'alpha': 'bucket_a.ndjson', 'beta': 'bucket_b.ndjson' });

  rebuildTemporalIndexes(entityId, { baseDir });

  const june = readIndex(entityId, 'temporal', '2025-06', { baseDir });
  assert.ok(june.includes('mem_A1'), 'mem_A1 from bucket_a must be in 2025-06');
  assert.ok(june.includes('mem_B1'), 'mem_B1 from bucket_b must be in 2025-06');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('rebuildTemporalIndexes deduplicates memIds across buckets', () => {
  const { rebuildTemporalIndexes, readIndex } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_ent3';

  // Same memId appears in two buckets (stub cross-reference pattern)
  writeBucket(baseDir, entityId, 'bucket_primary.ndjson', [
    { memId: 'mem_X', topics: ['primary'], created: '2025-05-10T00:00:00Z' },
  ]);
  writeBucket(baseDir, entityId, 'bucket_secondary.ndjson', [
    { memId: 'mem_X', topics: ['secondary'], created: '2025-05-10T00:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, { 'primary': 'bucket_primary.ndjson', 'secondary': 'bucket_secondary.ndjson' });

  rebuildTemporalIndexes(entityId, { baseDir });

  const may = readIndex(entityId, 'temporal', '2025-05', { baseDir });
  const count = may.filter(id => id === 'mem_X').length;
  assert.equal(count, 1, 'rebuildTemporalIndexes must not duplicate mem_X even if it appears in 2 buckets');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('rebuildTemporalIndexes skips entries with no created field', () => {
  const { rebuildTemporalIndexes, listIndexes } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_ent4';

  writeBucket(baseDir, entityId, 'bucket_orphan.ndjson', [
    { memId: 'orphan_001', topics: ['x'] }, // no created field
  ]);
  writeRouter(baseDir, entityId, { 'x': 'bucket_orphan.ndjson' });

  rebuildTemporalIndexes(entityId, { baseDir });

  const keys = listIndexes(entityId, 'temporal', { baseDir });
  assert.deepEqual(keys, [], 'Entries without created field must not produce any temporal index');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('rebuildTemporalIndexes returns count of processed memIds', () => {
  const { rebuildTemporalIndexes } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_ent5';

  writeBucket(baseDir, entityId, 'bucket_q.ndjson', [
    { memId: 'mem_Q1', topics: ['q'], created: '2025-09-01T00:00:00Z' },
    { memId: 'mem_Q2', topics: ['q'], created: '2025-09-02T00:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, { 'q': 'bucket_q.ndjson' });

  const count = rebuildTemporalIndexes(entityId, { baseDir });
  assert.equal(count, 2, 'rebuildTemporalIndexes must return the number of unique memIds indexed');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

// ── rebuildSubjectIndexes — module shape ──────────────────────────────────────

test('archive-indexes exports rebuildSubjectIndexes as a function', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.rebuildSubjectIndexes, 'function',
    'rebuildSubjectIndexes must be exported from archive-indexes.js');
});

// ── rebuildSubjectIndexes — behavior ─────────────────────────────────────────

test('rebuildSubjectIndexes clusters co-occurring topics into subject indexes', () => {
  const { rebuildSubjectIndexes, listIndexes } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_subj1';

  // Physics + quantum always appear together in these entries.
  writeBucket(baseDir, entityId, 'bucket_phys.ndjson', [
    { memId: 'mem_001', topics: ['physics', 'quantum'], created: '2025-01-01T00:00:00Z' },
    { memId: 'mem_002', topics: ['physics', 'quantum'], created: '2025-01-02T00:00:00Z' },
    { memId: 'mem_003', topics: ['physics', 'quantum'], created: '2025-01-03T00:00:00Z' },
  ]);
  // Cooking always alone.
  writeBucket(baseDir, entityId, 'bucket_cook.ndjson', [
    { memId: 'mem_101', topics: ['cooking'], created: '2025-02-01T00:00:00Z' },
    { memId: 'mem_102', topics: ['cooking'], created: '2025-02-02T00:00:00Z' },
    { memId: 'mem_103', topics: ['cooking'], created: '2025-02-03T00:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, {
    'physics': 'bucket_phys.ndjson', 'quantum': 'bucket_phys.ndjson',
    'cooking': 'bucket_cook.ndjson',
  });

  rebuildSubjectIndexes(entityId, { baseDir });

  const subjectKeys = listIndexes(entityId, 'subject', { baseDir });
  assert.ok(subjectKeys.length >= 1, 'At least one subject index must be created');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('rebuildSubjectIndexes puts co-occurring topic entries into the same subject index', () => {
  const { rebuildSubjectIndexes, readIndex } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_subj2';

  // All 4 entries share physics+quantum — tight co-occurrence cluster.
  writeBucket(baseDir, entityId, 'bucket_phys.ndjson', [
    { memId: 'mem_001', topics: ['physics', 'quantum'], created: '2025-01-01T00:00:00Z' },
    { memId: 'mem_002', topics: ['physics', 'quantum'], created: '2025-01-02T00:00:00Z' },
    { memId: 'mem_003', topics: ['physics', 'quantum'], created: '2025-01-03T00:00:00Z' },
    { memId: 'mem_004', topics: ['physics', 'quantum'], created: '2025-01-04T00:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, {
    'physics': 'bucket_phys.ndjson', 'quantum': 'bucket_phys.ndjson',
  });

  rebuildSubjectIndexes(entityId, { baseDir });

  // The dominant topic (physics) becomes the subject label.
  const physicsIndex = readIndex(entityId, 'subject', 'physics', { baseDir });
  assert.ok(physicsIndex.length >= 4,
    'All 4 entries with physics+quantum must be in the physics subject index');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('rebuildSubjectIndexes returns count of subject indexes written', () => {
  const { rebuildSubjectIndexes } = require(archiveIndexesPath);
  const baseDir  = tmpBase();
  const entityId = 'test_subj3';

  writeBucket(baseDir, entityId, 'bucket_x.ndjson', [
    { memId: 'mem_x1', topics: ['alpha', 'beta'], created: '2025-01-01T00:00:00Z' },
    { memId: 'mem_x2', topics: ['alpha', 'beta'], created: '2025-01-02T00:00:00Z' },
  ]);
  writeRouter(baseDir, entityId, { 'alpha': 'bucket_x.ndjson', 'beta': 'bucket_x.ndjson' });

  const count = rebuildSubjectIndexes(entityId, { baseDir });
  assert.ok(count >= 1, 'rebuildSubjectIndexes must return at least 1 (number of subject indexes written)');

  fs.rmSync(baseDir, { recursive: true, force: true });
});

// ── phase-archive-index.js — module shape ────────────────────────────────────

test('phase-archive-index.js exists at expected path', () => {
  assert.ok(fs.existsSync(phaseArchiveIndexPath),
    'phase-archive-index.js must exist at server/brain/cognition/phases/phase-archive-index.js');
});

test('phase-archive-index.js exports a function', () => {
  const phase = require(phaseArchiveIndexPath);
  assert.equal(typeof phase, 'function', 'phase-archive-index.js must export a function (the phase handler)');
});

// ── phases/index.js registration ─────────────────────────────────────────────

test('phases/index.js registers archive_index phase', () => {
  const phases = require(phasesIndexPath);
  const hasArchiveIndex = phases.some(([name]) => name === 'archive_index');
  assert.ok(hasArchiveIndex, 'phases/index.js must register an "archive_index" phase');
});

test('phases/index.js registers archive_index after archive phase', () => {
  const phases = require(phasesIndexPath);
  const archiveIdx      = phases.findIndex(([name]) => name === 'archive');
  const archiveIndexIdx = phases.findIndex(([name]) => name === 'archive_index');
  assert.ok(archiveIdx >= 0, '"archive" phase must exist in phases/index.js');
  assert.ok(archiveIndexIdx > archiveIdx,
    '"archive_index" phase must appear after "archive" phase in the phases array');
});
