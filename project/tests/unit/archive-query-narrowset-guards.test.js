// ============================================================
// Guard Tests — Phase 4.7 E-6: Query Narrowing API + UI
// Guards that define and lock the expected behavior of:
//   1. queryArchive() narrowSet 6th parameter (E-6-0)
//   2. archive-routes.js month + subject narrowing (E-6-1)
//   3. Archive UI month/subject controls (E-6-2)
// ============================================================

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

const archiveIndexPath = path.join(__dirname, '../../server/brain/utils/archive-index.js');
const archiveRoutesPath = path.join(__dirname, '../../server/routes/archive-routes.js');
const archiveUiJsPath   = path.join(__dirname, '../../client/js/apps/core/archive-ui.js');
const indexHtmlPath     = path.join(__dirname, '../../client/index.html');

// ── Temp entity setup (mirrors archive-index.test.js pattern) ────────────────

let tmpRoot;
const tmpEntityId = 'test_narrowset_e6';

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'neko-e6-narrowset-'));
  const entityDir = path.join(tmpRoot, 'entities', `entity_${tmpEntityId}`, 'memories');
  fs.mkdirSync(entityDir, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
});

function getArchiveIndex() {
  const aiPath = require.resolve('../../server/brain/utils/archive-index');
  const epPath = require.resolve('../../server/entityPaths');
  delete require.cache[aiPath];
  delete require.cache[epPath];

  const ep = require('../../server/entityPaths');
  const origEntitiesDir = ep.ENTITIES_DIR;
  Object.defineProperty(ep, 'ENTITIES_DIR', {
    value: path.join(tmpRoot, 'entities'),
    writable: true,
    configurable: true,
  });
  const ai = require('../../server/brain/utils/archive-index');
  return { ai, ep, origEntitiesDir };
}

// ── E-6-0: queryArchive narrowSet parameter ──────────────────────────────────

test('queryArchive: accepts narrowSet as 6th argument without error', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_a', {
      topics: ['physics', 'wave'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'calm', importance: 0.7, docId: null,
    });
    // Pass narrowSet — should not throw
    const narrowSet = new Set(['mem_ns_a']);
    assert.doesNotThrow(() =>
      ai.queryArchive(tmpEntityId, ['physics'], 10, {}, null, narrowSet)
    );
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

test('queryArchive narrowSet: filters out entries not in the set', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_b1', {
      topics: ['neuroscience', 'memory'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'calm', importance: 0.8, docId: null,
    });
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_b2', {
      topics: ['neuroscience', 'memory'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'calm', importance: 0.8, docId: null,
    });
    // narrowSet only allows mem_ns_b1
    const narrowSet = new Set(['mem_ns_b1']);
    const results = ai.queryArchive(tmpEntityId, ['neuroscience', 'memory'], 10, {}, null, narrowSet);
    const ids = results.map(r => r.memId);
    assert.ok(ids.includes('mem_ns_b1'), 'mem_ns_b1 should appear — it is in narrowSet');
    assert.ok(!ids.includes('mem_ns_b2'), 'mem_ns_b2 should be filtered out — not in narrowSet');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

test('queryArchive narrowSet: returns matching entry when in narrowSet', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_c', {
      topics: ['dreams', 'symbols'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'wonder', importance: 0.9, docId: null,
    });
    const narrowSet = new Set(['mem_ns_c', 'other_that_does_not_exist']);
    const results = ai.queryArchive(tmpEntityId, ['dreams', 'symbols'], 10, {}, null, narrowSet);
    const ids = results.map(r => r.memId);
    assert.ok(ids.includes('mem_ns_c'), 'mem_ns_c should appear when in narrowSet and topics match');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

test('queryArchive narrowSet = null: returns all matching results (backwards compatible)', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_d1', {
      topics: ['identity', 'self'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'calm', importance: 0.7, docId: null,
    });
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_d2', {
      topics: ['identity', 'consciousness'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'calm', importance: 0.6, docId: null,
    });
    // No narrowSet — both should be returned
    const resultsNoArg = ai.queryArchive(tmpEntityId, ['identity'], 10);
    const resultsNullArg = ai.queryArchive(tmpEntityId, ['identity'], 10, {}, null, null);
    assert.ok(resultsNoArg.length >= 2, 'Without narrowSet: should return all matching entries');
    assert.ok(resultsNullArg.length >= 2, 'With narrowSet=null: should return all matching entries');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

test('queryArchive empty Set narrowSet: returns [] even when BM25 matches exist', () => {
  const { ai, ep, origEntitiesDir } = getArchiveIndex();
  try {
    ai.ensureArchiveDirs(tmpEntityId);
    const now = new Date().toISOString();
    ai.appendArchiveEntry(tmpEntityId, 'mem_ns_e', {
      topics: ['emotion', 'fear', 'response'], archivedAt: now, type: 'episodic',
      decayAtArchive: 0.01, created: now, emotion: 'tense', importance: 0.8, docId: null,
    });
    // Empty narrowSet → nothing can pass the filter
    const narrowSet = new Set();
    const results = ai.queryArchive(tmpEntityId, ['emotion', 'fear'], 10, {}, null, narrowSet);
    assert.equal(results.length, 0, 'Empty narrowSet must produce [] regardless of BM25 matches');
  } finally {
    ep.ENTITIES_DIR = origEntitiesDir;
  }
});

// ── E-6-1: Route source contract ─────────────────────────────────────────────

test('archive-routes.js source imports intersectIndexes (E-6-1 narrowing API)', () => {
  const src = fs.readFileSync(archiveRoutesPath, 'utf8');
  assert.ok(
    src.includes('intersectIndexes'),
    'archive-routes.js must import/use intersectIndexes to build narrowSet from temporal/subject indexes'
  );
});

test('archive-routes.js source handles month body param (E-6-1)', () => {
  const src = fs.readFileSync(archiveRoutesPath, 'utf8');
  assert.ok(
    src.includes('body.month') || src.includes("body['month']"),
    'archive-routes.js must read body.month for temporal index narrowing'
  );
});

test('archive-routes.js source handles subject body param (E-6-1)', () => {
  const src = fs.readFileSync(archiveRoutesPath, 'utf8');
  assert.ok(
    src.includes('body.subject') || src.includes("body['subject']"),
    'archive-routes.js must read body.subject for subject index narrowing'
  );
});

test('archive-routes.js passes narrowSet to queryArchive (E-6-1)', () => {
  const src = fs.readFileSync(archiveRoutesPath, 'utf8');
  assert.ok(
    src.includes('narrowSet'),
    'archive-routes.js must build and pass narrowSet variable to queryArchive'
  );
});

// ── E-6-2: Archive UI source + HTML contracts ─────────────────────────────────

test('index.html has archiveSearchMonth input element (E-6-2)', () => {
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.ok(
    html.includes('archiveSearchMonth'),
    'index.html must have an element with id="archiveSearchMonth" for month narrowing'
  );
});

test('index.html has archiveSearchSubject input element (E-6-2)', () => {
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.ok(
    html.includes('archiveSearchSubject'),
    'index.html must have an element with id="archiveSearchSubject" for subject narrowing'
  );
});

test('archive-ui.js reads archiveSearchMonth element (E-6-2)', () => {
  const src = fs.readFileSync(archiveUiJsPath, 'utf8');
  assert.ok(
    src.includes('archiveSearchMonth'),
    'archive-ui.js must read the archiveSearchMonth DOM element'
  );
});

test('archive-ui.js reads archiveSearchSubject element (E-6-2)', () => {
  const src = fs.readFileSync(archiveUiJsPath, 'utf8');
  assert.ok(
    src.includes('archiveSearchSubject'),
    'archive-ui.js must read the archiveSearchSubject DOM element'
  );
});

test('archive-ui.js sends month in body to API (E-6-2)', () => {
  const src = fs.readFileSync(archiveUiJsPath, 'utf8');
  assert.ok(
    src.includes('body.month') || src.includes("body['month']"),
    'archive-ui.js must include month in the body sent to /api/archive/search'
  );
});

test('archive-ui.js sends subject in body to API (E-6-2)', () => {
  const src = fs.readFileSync(archiveUiJsPath, 'utf8');
  assert.ok(
    src.includes('body.subject') || src.includes("body['subject']"),
    'archive-ui.js must include subject in the body sent to /api/archive/search'
  );
});
