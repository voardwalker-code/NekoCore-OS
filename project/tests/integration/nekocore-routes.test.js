// ============================================================
// Integration Tests — nekocore-routes.js  (Phase E-6)
// Smoke tests for GET /api/nekocore/status and
//                 GET /api/nekocore/pending
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const createNekoCoreRoutes = require('../../server/routes/nekocore-routes');

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_HEADERS = { 'Content-Type': 'application/json' };

function makeCtx(cfg = {}) {
  let _cfg = { lastActive: 'default', profiles: { default: { main: { model: 'google/gemini-flash-2.0' } } }, ...cfg };
  return {
    fs,
    path,
    loadConfig: () => JSON.parse(JSON.stringify(_cfg)),
    saveConfig: (c) => { _cfg = JSON.parse(JSON.stringify(c)); }
  };
}

function makeRes() {
  const res = {
    statusCode: null,
    body: '',
    writableEnded: false,
    writeHead(code)  { this.statusCode = code; },
    end(data)        { this.body = data || ''; this.writableEnded = true; },
    json()           { return JSON.parse(this.body); },
    on() {},
    removeListener() {}
  };
  return res;
}

function makeReq(method = 'GET', body = null) { return { method, body, accountId: 'test-user', on() {}, removeListener() {} }; }
function readBodyFn(body) { return () => Promise.resolve(typeof body === 'string' ? body : '{}'); }
function makeUrl(p)  { return new URL(p, 'http://localhost:3000'); }

// Dedicated routes instance for smoke tests
const smokeRoutes = createNekoCoreRoutes(makeCtx());

// ── GET /api/nekocore/status ──────────────────────────────────────────────────

test('GET /api/nekocore/status — returns 200', async () => {
  const res = makeRes();
  const handled = await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/status'), BASE_HEADERS, readBodyFn()
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
});

test('GET /api/nekocore/status — body has ok:true', async () => {
  const res = makeRes();
  await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/status'), BASE_HEADERS, readBodyFn()
  );
  const data = res.json();
  assert.equal(data.ok, true);
});

test('GET /api/nekocore/status — isSystemEntityReady is boolean', async () => {
  const res = makeRes();
  await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/status'), BASE_HEADERS, readBodyFn()
  );
  const data = res.json();
  assert.equal(typeof data.isSystemEntityReady, 'boolean');
});

test('GET /api/nekocore/status — pendingCount is a number', async () => {
  const res = makeRes();
  await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/status'), BASE_HEADERS, readBodyFn()
  );
  const data = res.json();
  assert.equal(typeof data.pendingCount, 'number');
});

// ── GET /api/nekocore/pending ─────────────────────────────────────────────────

test('GET /api/nekocore/pending — returns 200', async () => {
  const res = makeRes();
  const handled = await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/pending'), BASE_HEADERS, readBodyFn()
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
});

test('GET /api/nekocore/pending — body has ok:true', async () => {
  const res = makeRes();
  await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/pending'), BASE_HEADERS, readBodyFn()
  );
  const data = res.json();
  assert.equal(data.ok, true);
});

test('GET /api/nekocore/pending — pending is an array', async () => {
  const res = makeRes();
  await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/pending'), BASE_HEADERS, readBodyFn()
  );
  const data = res.json();
  assert.ok(Array.isArray(data.pending), 'pending should be an array');
});

test('GET /api/nekocore/pending — empty array on fresh instance', async () => {
  const freshRoutes = createNekoCoreRoutes(makeCtx());
  const res = makeRes();
  await freshRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/pending'), BASE_HEADERS, readBodyFn()
  );
  const data = res.json();
  assert.equal(data.pending.length, 0);
});

// ── Unhandled paths ───────────────────────────────────────────────────────────

test('GET /api/nekocore/unknown — dispatch returns false', async () => {
  const res = makeRes();
  const handled = await smokeRoutes.dispatch(
    makeReq(), res, makeUrl('/api/nekocore/unknown'), BASE_HEADERS, readBodyFn()
  );
  assert.equal(handled, false);
});

test('GET /api/nekocore/persona — returns defaults and presets', async () => {
  const res = makeRes();
  const handled = await smokeRoutes.dispatch(
    makeReq('GET'),
    res,
    makeUrl('/api/nekocore/persona'),
    BASE_HEADERS,
    readBodyFn()
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.ok, true);
  assert.ok(Array.isArray(data.presets));
  assert.ok(typeof data.persona.userName === 'string');
});

test('POST /api/nekocore/persona — saves custom voice fields', async () => {
  const res = makeRes();
  const body = JSON.stringify({ userName: 'WrongWay', llmStyle: 'clear and kind', tone: 'warm-professional' });
  const handled = await smokeRoutes.dispatch(
    makeReq('POST', body),
    res,
    makeUrl('/api/nekocore/persona'),
    BASE_HEADERS,
    readBodyFn(body)
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.ok, true);
  assert.equal(data.persona.userName, 'WrongWay');
  assert.equal(data.persona.tone, 'warm-professional');
});

test('POST /api/nekocore/reset — returns ok true', async () => {
  const res = makeRes();
  const handled = await smokeRoutes.dispatch(
    makeReq('POST', '{}'),
    res,
    makeUrl('/api/nekocore/reset'),
    BASE_HEADERS,
    readBodyFn('{}')
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.ok, true);
});

test('POST /api/nekocore/chat — returns finalResponse from the chat pipeline', async () => {
  const routes = createNekoCoreRoutes({
    ...makeCtx(),
    processNekoCoreChatMessage: async (message, chatHistory) => ({
      finalResponse: `Echo: ${message} (${chatHistory.length})`
    })
  });
  const res = makeRes();
  const body = JSON.stringify({
    message: 'hello neko',
    chatHistory: [{ role: 'user', content: 'earlier' }]
  });

  const handled = await routes.dispatch(
    makeReq('POST', body),
    res,
    makeUrl('/api/nekocore/chat'),
    BASE_HEADERS,
    readBodyFn(body)
  );

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true, response: 'Echo: hello neko (1)' });
});
