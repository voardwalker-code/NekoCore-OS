'use strict';
/**
 * tests/integration/archive-search.test.js
 * IME Phase I4-0 — integration tests for POST /api/archive/search
 *
 * Verifies:
 *   1. Valid query returns 200 and results array
 *   2. Empty query returns 400
 *   3. Missing/blank query returns 400
 *   4. Unauthenticated request returns 401
 *   5. yearRange filter works (only returns entries within range)
 *   6. limit parameter is respected
 *   7. Null currentEntityId falls back to 'nekocore' and returns 200 with empty results
 */

const { test, before, after } = require('node:test');
const assert  = require('node:assert/strict');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const createArchiveRoutes  = require('../../server/routes/archive-routes');

// ── Test helpers ─────────────────────────────────────────────────────────────

let tmpRoot;
let tmpEntityId;

before(() => {
  tmpRoot     = fs.mkdtempSync(path.join(os.tmpdir(), 'neko-arcsearch-test-'));
  tmpEntityId = 'arcsearch_unit';

  // Patch ENTITIES_DIR so the route uses our temp directory
  const ep = require('../../server/entityPaths');
  ep._origEntitiesDir = ep.ENTITIES_DIR;
  Object.defineProperty(ep, 'ENTITIES_DIR', {
    value: path.join(tmpRoot, 'entities'),
    writable: true,
    configurable: true,
  });

  // Ensure entity memories/archive dirs exist
  const { ensureArchiveDirs, appendArchiveEntry } = require('../../server/brain/utils/archive-index');
  ensureArchiveDirs(tmpEntityId);

  // Seed archive index with two test entries
  const now2024 = '2024-06-01T00:00:00.000Z';
  const now2025 = '2025-06-01T00:00:00.000Z';

  appendArchiveEntry(tmpEntityId, 'mem_arc001', {
    topics: ['pipeline', 'memory', 'consolidation'], archivedAt: now2024, type: 'episodic',
    decayAtArchive: 0.02, created: now2024, emotion: 'calm', importance: 0.7, docId: null,
  });
  appendArchiveEntry(tmpEntityId, 'mem_arc002', {
    topics: ['dream', 'synthesis', 'emotion'], archivedAt: now2025, type: 'episodic',
    decayAtArchive: 0.01, created: now2025, emotion: 'wonder', importance: 0.6, docId: null,
  });

  // Write semantic.txt for mem_arc001 so summary is non-empty
  const ep2 = require('../../server/entityPaths');
  const episodicDir = path.join(ep2.getArchiveEpisodicPath(tmpEntityId), 'mem_arc001');
  fs.mkdirSync(episodicDir, { recursive: true });
  fs.writeFileSync(path.join(episodicDir, 'semantic.txt'),
    'This archived memory is about pipeline consolidation and memory management.', 'utf8');
});

after(() => {
  const ep = require('../../server/entityPaths');
  if (ep._origEntitiesDir) ep.ENTITIES_DIR = ep._origEntitiesDir;
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
});

function makeCtx(entityId = tmpEntityId) {
  return { currentEntityId: entityId };
}

function makeRes() {
  return {
    statusCode: null,
    headers: {},
    body: '',
    writeHead(code, hdrs) { this.statusCode = code; this.headers = { ...hdrs }; },
    end(data) { this.body = data || ''; },
    json() { return JSON.parse(this.body); },
  };
}

function makeReq(accountId = 'test-user') {
  return { method: 'POST', accountId };
}

function readBodyFn(bodyObj) {
  return () => Promise.resolve(JSON.stringify(bodyObj));
}

function makeUrl(p) {
  return new URL(p, 'http://localhost:3000');
}

const API_HEADERS = { 'Content-Type': 'application/json' };

// ── Tests ─────────────────────────────────────────────────────────────────────

test('POST /api/archive/search — valid query returns 200 and results', async () => {
  const routes = createArchiveRoutes(makeCtx());
  const req    = makeReq();
  const res    = makeRes();

  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({ query: 'pipeline consolidation memory' }));

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.ok);
  assert.ok(Array.isArray(body.results));
  assert.ok(body.results.length >= 1);
  assert.ok(typeof body.total === 'number');
  // mem_arc001 should appear (topic overlap with query)
  const hit = body.results.find(r => r.id === 'mem_arc001');
  assert.ok(hit, 'mem_arc001 should be returned');
  assert.ok(typeof hit.summary === 'string');
  assert.ok(hit.summary.length > 0, 'summary should be non-empty (semantic.txt was seeded)');
});

test('POST /api/archive/search — empty query returns 400', async () => {
  const routes = createArchiveRoutes(makeCtx());
  const req    = makeReq();
  const res    = makeRes();

  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({ query: '' }));

  assert.equal(res.statusCode, 400);
  assert.ok(res.json().error);
});

test('POST /api/archive/search — missing query returns 400', async () => {
  const routes = createArchiveRoutes(makeCtx());
  const req    = makeReq();
  const res    = makeRes();

  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({}));

  assert.equal(res.statusCode, 400);
  assert.ok(res.json().error);
});

test('POST /api/archive/search — unauthenticated returns 401', async () => {
  const routes  = createArchiveRoutes(makeCtx());
  const req     = makeReq(null);   // no accountId
  const res     = makeRes();

  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({ query: 'test' }));

  assert.equal(res.statusCode, 401);
});

test('POST /api/archive/search — yearRange filter excludes out-of-range entries', async () => {
  const routes = createArchiveRoutes(makeCtx());
  const req    = makeReq();
  const res    = makeRes();

  // yearRange restricts to 2025 only — should not return mem_arc001 (archived 2024)
  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({
    query: 'pipeline memory',
    yearRange: { start: '2025-01-01T00:00:00.000Z', end: '2026-01-01T00:00:00.000Z' },
  }));

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.ok);
  const has2024 = body.results.some(r => r.id === 'mem_arc001');
  assert.equal(has2024, false, 'mem_arc001 (archived 2024) should be excluded by yearRange');
});

test('POST /api/archive/search — limit parameter respected', async () => {
  const routes = createArchiveRoutes(makeCtx());
  const req    = makeReq();
  const res    = makeRes();

  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({ query: 'pipeline memory dream', limit: 1 }));

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.ok);
  assert.ok(body.results.length <= 1, `Expected ≤ 1 result with limit=1, got ${body.results.length}`);
});

test('POST /api/archive/search — null currentEntityId falls back to nekocore and returns 200', async () => {
  // resolveEntityId always falls back to 'nekocore' when no entity is checked out,
  // so this path no longer errors — it searches the nekocore archive (empty here) and returns 200.
  const routes = createArchiveRoutes({ currentEntityId: null });
  const req    = makeReq();
  const res    = makeRes();

  await routes.dispatch(req, res, makeUrl('/api/archive/search'), API_HEADERS, readBodyFn({ query: 'test query' }));

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.ok);
  assert.ok(Array.isArray(body.results));
});
