const { test } = require('node:test');
const assert = require('node:assert/strict');

const createTaskRoutes = require('../../server/routes/task-routes');

function makeReq(method, body) {
  return { method, _body: body ? JSON.stringify(body) : '' };
}

function makeRes() {
  return {
    status: null,
    headers: null,
    body: '',
    writeHead(code, headers) {
      this.status = code;
      this.headers = headers;
    },
    end(payload) {
      this.body = payload || '';
    }
  };
}

async function readBody(req) {
  return req._body || '';
}

test('GET /api/task/modules returns module list shape', async () => {
  const routes = createTaskRoutes({
    getActiveEntityId: () => 'entity_test',
    callLLMWithRuntime: async () => 'ok',
    webFetch: null
  });
  const apiHeaders = { 'Content-Type': 'application/json' };
  const req = makeReq('GET');
  const res = makeRes();
  const url = new URL('http://localhost/api/task/modules');

  const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
  assert.equal(handled, true);
  assert.equal(res.status, 200);

  const parsed = JSON.parse(res.body);
  assert.equal(parsed.ok, true);
  assert.ok(Array.isArray(parsed.modules));
  assert.ok(parsed.modules.length >= 1);
});

test('POST /api/task/run rejects missing message', async () => {
  const routes = createTaskRoutes({
    getActiveEntityId: () => 'entity_test',
    callLLMWithRuntime: async () => 'ok',
    webFetch: null
  });
  const apiHeaders = { 'Content-Type': 'application/json' };
  const req = makeReq('POST', { message: '' });
  const res = makeRes();
  const url = new URL('http://localhost/api/task/run');

  const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
  assert.equal(handled, true);
  assert.equal(res.status, 400);

  const parsed = JSON.parse(res.body);
  assert.equal(parsed.ok, false);
});

test('POST /api/task/cancel/:id returns 404 for missing session', async () => {
  const routes = createTaskRoutes({
    getActiveEntityId: () => 'entity_test',
    callLLMWithRuntime: async () => 'ok',
    webFetch: null
  });
  const apiHeaders = { 'Content-Type': 'application/json' };
  const req = makeReq('POST');
  const res = makeRes();
  const url = new URL('http://localhost/api/task/cancel/nonexistent_session');

  const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
  assert.equal(handled, true);
  assert.equal(res.status, 404);
});

test('GET /api/task/session/:id returns 404 for missing session', async () => {
  const routes = createTaskRoutes({
    getActiveEntityId: () => 'entity_test',
    callLLMWithRuntime: async () => 'ok',
    webFetch: null
  });
  const apiHeaders = { 'Content-Type': 'application/json' };
  const req = makeReq('GET');
  const res = makeRes();
  const url = new URL('http://localhost/api/task/session/nonexistent_session');

  const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
  assert.equal(handled, true);
  assert.equal(res.status, 404);
});

test('GET /api/task/history/:entityId returns session array shape', async () => {
  const routes = createTaskRoutes({
    getActiveEntityId: () => 'entity_test',
    callLLMWithRuntime: async () => 'ok',
    webFetch: null
  });
  const apiHeaders = { 'Content-Type': 'application/json' };
  const req = makeReq('GET');
  const res = makeRes();
  const url = new URL('http://localhost/api/task/history/entity_test?limit=5');

  const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
  assert.equal(handled, true);
  assert.equal(res.status, 200);

  const parsed = JSON.parse(res.body);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.entityId, 'entity_test');
  assert.ok(Array.isArray(parsed.sessions));
});
