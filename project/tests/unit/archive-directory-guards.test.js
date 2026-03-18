// ============================================================
// Guard Tests — Phase 4.7 E-2: Echo Past (Round 1)
// Guards that define and lock the expected behavior of:
//   1. archive-directory.js module shape and CRUD
//   2. scanDirectory topic overlap ranking and time range filtering
//   3. echoPast() round-1 hierarchical search in agent-echo.js
//   4. memory-retrieval.js wires echoPast into subconscious context
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');

const archiveDirPath  = path.join(__dirname, '../../server/brain/utils/archive-directory.js');
const agentEchoPath   = path.join(__dirname, '../../server/brain/agent-echo.js');
const memRetrievalPath = path.join(__dirname, '../../server/services/memory-retrieval.js');

// ── archive-directory.js module shape ────────────────────────────────────────

test('archive-directory.js exists at expected path', () => {
  assert.ok(fs.existsSync(archiveDirPath),
    'archive-directory.js must exist at server/brain/utils/archive-directory.js');
});

test('archive-directory exports readDirectory as a function', () => {
  const ad = require(archiveDirPath);
  assert.equal(typeof ad.readDirectory, 'function', 'readDirectory must be exported');
});

test('archive-directory exports writeDirectory as a function', () => {
  const ad = require(archiveDirPath);
  assert.equal(typeof ad.writeDirectory, 'function', 'writeDirectory must be exported');
});

test('archive-directory exports scanDirectory as a function', () => {
  const ad = require(archiveDirPath);
  assert.equal(typeof ad.scanDirectory, 'function', 'scanDirectory must be exported');
});

test('archive-directory exports registerArchive as a function', () => {
  const ad = require(archiveDirPath);
  assert.equal(typeof ad.registerArchive, 'function', 'registerArchive must be exported');
});

// ── readDirectory / writeDirectory ───────────────────────────────────────────

function tmpBase() {
  return path.join(os.tmpdir(), `nekocore_archdir_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
}

test('readDirectory returns empty array when no directory file exists', () => {
  const { readDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();
  const result = readDirectory('entity_test', { baseDir });
  assert.deepEqual(result, [], 'readDirectory must return [] when archive_directory.json is absent');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('writeDirectory then readDirectory returns same headers', () => {
  const { writeDirectory, readDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();
  const headers = [
    { archiveId: 'bucket_physics.ndjson', topics: ['physics', 'quantum'], entryCount: 50, timeRange: { start: '2025-01-01', end: '2025-06-30' } },
    { archiveId: 'bucket_cooking.ndjson', topics: ['cooking', 'recipes'], entryCount: 12, timeRange: { start: '2024-06-01', end: '2024-12-31' } },
  ];

  writeDirectory('entity_test', headers, { baseDir });
  const result = readDirectory('entity_test', { baseDir });

  assert.deepEqual(result, headers, 'readDirectory must return the exact headers written by writeDirectory');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

// ── registerArchive ───────────────────────────────────────────────────────────

test('registerArchive adds a new entry to an empty directory', () => {
  const { registerArchive, readDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();
  const header = { topics: ['astronomy'], entryCount: 20, timeRange: { start: '2025-03-01', end: '2025-03-31' } };

  registerArchive('entity_test', 'bucket_astronomy.ndjson', header, { baseDir });
  const result = readDirectory('entity_test', { baseDir });

  assert.equal(result.length, 1, 'Directory must have exactly 1 entry after first registerArchive');
  assert.equal(result[0].archiveId, 'bucket_astronomy.ndjson', 'archiveId must be set');
  assert.deepEqual(result[0].topics, ['astronomy'], 'topics must be preserved');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('registerArchive updates an existing entry with the same archiveId', () => {
  const { registerArchive, readDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();

  registerArchive('entity_test', 'bucket_physics.ndjson', { topics: ['physics'], entryCount: 10 }, { baseDir });
  registerArchive('entity_test', 'bucket_physics.ndjson', { topics: ['physics', 'quantum'], entryCount: 25 }, { baseDir });

  const result = readDirectory('entity_test', { baseDir });
  assert.equal(result.length, 1, 'Should still have exactly 1 entry (updated, not duplicated)');
  assert.equal(result[0].entryCount, 25, 'entryCount must reflect the updated value');
  assert.deepEqual(result[0].topics, ['physics', 'quantum'], 'topics must reflect the updated value');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('registerArchive adds distinct entries for different archiveIds', () => {
  const { registerArchive, readDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();

  registerArchive('entity_test', 'bucket_a.ndjson', { topics: ['alpha'] }, { baseDir });
  registerArchive('entity_test', 'bucket_b.ndjson', { topics: ['beta'] }, { baseDir });

  const result = readDirectory('entity_test', { baseDir });
  assert.equal(result.length, 2, 'Two distinct archives must result in 2 directory entries');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

// ── scanDirectory ─────────────────────────────────────────────────────────────

test('scanDirectory returns empty array for empty directory', () => {
  const { scanDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();

  const result = scanDirectory('entity_test', ['physics'], null, { baseDir });
  assert.deepEqual(result, [], 'scanDirectory must return [] when no archives are registered');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('scanDirectory returns empty array when no archives match query topics', () => {
  const { registerArchive, scanDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();

  registerArchive('entity_test', 'bucket_cooking.ndjson', { topics: ['cooking', 'recipes'] }, { baseDir });

  const result = scanDirectory('entity_test', ['astrophysics', 'nebula'], null, { baseDir });
  assert.deepEqual(result, [], 'scanDirectory must return [] when no topic overlap exists');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('scanDirectory ranks archives by topic overlap — best match first', () => {
  const { registerArchive, scanDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();

  // archive A matches 2 of 3 query topics
  registerArchive('entity_test', 'bucket_a.ndjson', { topics: ['physics', 'quantum', 'unrelated'] }, { baseDir });
  // archive B matches 1 of 3 query topics
  registerArchive('entity_test', 'bucket_b.ndjson', { topics: ['physics', 'cooking', 'cooking2'] }, { baseDir });

  const result = scanDirectory('entity_test', ['physics', 'quantum', 'relativity'], null, { baseDir });

  assert.ok(result.length >= 2, 'Both archives match at least one topic — both must be in results');
  assert.equal(result[0].archiveId, 'bucket_a.ndjson',
    'archive A (2/3 overlap) must rank before archive B (1/3 overlap)');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('scanDirectory filters out archives whose timeRange does not overlap query range', () => {
  const { registerArchive, scanDirectory } = require(archiveDirPath);
  const baseDir = tmpBase();

  // Archive from 2024 — outside our query range
  registerArchive('entity_test', 'bucket_old.ndjson', {
    topics: ['physics'],
    timeRange: { start: '2024-01-01', end: '2024-12-31' }
  }, { baseDir });
  // Archive from 2025 — within query range
  registerArchive('entity_test', 'bucket_new.ndjson', {
    topics: ['physics'],
    timeRange: { start: '2025-01-01', end: '2025-12-31' }
  }, { baseDir });

  const result = scanDirectory('entity_test', ['physics'], { start: '2025-01-01', end: '2025-12-31' }, { baseDir });

  assert.equal(result.length, 1, 'Only the 2025 archive must pass the time range filter');
  assert.equal(result[0].archiveId, 'bucket_new.ndjson', 'Only bucket_new must be returned');
  fs.rmSync(baseDir, { recursive: true, force: true });
});

// ── echoPast() in agent-echo.js ───────────────────────────────────────────────

test('echoPast returns empty array when topics is empty', () => {
  const { echoPast } = require(agentEchoPath);
  const result = echoPast('entity_test', []);
  assert.deepEqual(result, [], 'echoPast must return [] for empty topics');
});

test('echoPast returns empty array when topics is null', () => {
  const { echoPast } = require(agentEchoPath);
  const result = echoPast('entity_test', null);
  assert.deepEqual(result, [], 'echoPast must return [] for null topics');
});

test('echoPast returns [] when no archives are registered (_archives=[])', () => {
  const { echoPast } = require(agentEchoPath);
  const result = echoPast('entity_test', ['physics'], { _archives: [] });
  assert.deepEqual(result, [], 'echoPast must return [] when archive list is empty');
});

test('echoPast returns results from first archive when queryArchive hits', () => {
  const { echoPast } = require(agentEchoPath);

  const mockHits = [
    { memId: 'mem_001', score: 1.8, meta: { topics: ['physics'], type: 'episodic', importance: 0.9 } },
    { memId: 'mem_002', score: 1.2, meta: { topics: ['quantum'], type: 'episodic', importance: 0.7 } },
  ];
  const mockArchives = [
    { archiveId: 'bucket_physics.ndjson', topics: ['physics', 'quantum'] }
  ];

  const result = echoPast('entity_test', ['physics'], {
    _archives: mockArchives,
    _queryArchive: () => mockHits,
  });

  assert.ok(Array.isArray(result), 'echoPast must return an array');
  assert.equal(result.length, 2, 'echoPast must return all hits from the matching archive');
  assert.equal(result[0].id, 'mem_001', 'First result must be mem_001 (highest BM25 score)');
  assert.ok('_archiveScore' in result[0], 'echoPast results must include _archiveScore');
});

test('echoPast retries when first archive returns no results', () => {
  const { echoPast } = require(agentEchoPath);

  let callCount = 0;
  const mockArchives = [
    { archiveId: 'bucket_a.ndjson', topics: ['history'] },
    { archiveId: 'bucket_b.ndjson', topics: ['history', 'rome'] },
  ];
  const mockHits = [{ memId: 'mem_99', score: 0.9, meta: { topics: ['rome'], type: 'episodic' } }];

  const result = echoPast('entity_test', ['history', 'rome'], {
    _archives: mockArchives,
    _queryArchive: () => {
      callCount++;
      return callCount < 2 ? [] : mockHits; // first call misses, second hits
    },
  });

  assert.equal(callCount, 2, 'echoPast must retry when first archive misses (called queryArchive twice)');
  assert.equal(result.length, 1, 'echoPast must return results from the second archive on retry');
  assert.equal(result[0].id, 'mem_99', 'Result id must be mem_99 from second archive');
});

test('echoPast stops retrying after 3 attempts and returns []', () => {
  const { echoPast } = require(agentEchoPath);

  let callCount = 0;
  const mockArchives = [
    { archiveId: 'a.ndjson', topics: ['x'] },
    { archiveId: 'b.ndjson', topics: ['y'] },
    { archiveId: 'c.ndjson', topics: ['z'] },
    { archiveId: 'd.ndjson', topics: ['w'] }, // 4th — should never be reached
  ];

  const result = echoPast('entity_test', ['x', 'y'], {
    _archives: mockArchives,
    _queryArchive: () => { callCount++; return []; }, // always empty
  });

  assert.equal(callCount, 3, 'echoPast must attempt at most 3 archives, even if more are available');
  assert.deepEqual(result, [], 'echoPast must return [] when all 3 attempts miss');
});

// ── memory-retrieval.js wiring ────────────────────────────────────────────────

test('memory-retrieval.js source references echoPast for archive retrieval (E-2-2 wiring)', () => {
  const source = fs.readFileSync(memRetrievalPath, 'utf8');
  assert.ok(
    source.includes('echoPast'),
    'memory-retrieval.js must reference echoPast — E-2-2 wiring not yet applied'
  );
});
