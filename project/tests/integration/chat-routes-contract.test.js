// ── Tests · Chat Routes Contract.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/routes/chat-routes. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const createChatRoutes = require('../../server/routes/chat-routes');

const API_HEADERS = { 'Content-Type': 'application/json' };
// makeUrl()
// WHAT THIS DOES: makeUrl creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call makeUrl(...) before code that depends on this setup.
function makeUrl(pathname) {
  return new URL(pathname, 'http://localhost:3000');
}
function readBodyFn(body) {
  return () => Promise.resolve(JSON.stringify(body));
}
// makeReq()
// WHAT THIS DOES: makeReq creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call makeReq(...) before code that depends on this setup.
function makeReq(body) {
  return { method: 'POST', accountId: 'test-user', body, on() {}, removeListener() {} };
}
function makeRes() {
  return {
    statusCode: null,
    body: '',
    headersSent: false,
    writeHeadCalls: 0,
    writableEnded: false,
    writeHead(code) {
      this.writeHeadCalls += 1;
      this.statusCode = code;
    },
    end(data) {
      this.headersSent = true;
      this.writableEnded = true;
      this.body = data || '';
    },
    json() {
      return JSON.parse(this.body);
    },
    on() {},
    removeListener() {}
  };
}

test('POST /api/chat returns single 500 response on contract validation failure', async () => {
  const routes = createChatRoutes({
    processChatMessage: async () => ({ finalResponse: 123, innerDialog: null })
  });
  const res = makeRes();

  await routes.dispatch(
    makeReq({ message: 'hello', chatHistory: [] }),
    res,
    makeUrl('/api/chat'),
    API_HEADERS,
    readBodyFn({ message: 'hello', chatHistory: [] })
  );

  assert.equal(res.statusCode, 500);
  assert.equal(res.writeHeadCalls, 1);
  assert.equal(res.headersSent, true);
  const data = res.json();
  assert.match(data.error, /Response contract violation for \/api\/chat/);
});