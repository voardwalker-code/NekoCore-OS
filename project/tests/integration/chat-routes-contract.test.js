'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const createChatRoutes = require('../../server/routes/chat-routes');

const API_HEADERS = { 'Content-Type': 'application/json' };

function makeUrl(pathname) {
  return new URL(pathname, 'http://localhost:3000');
}

function readBodyFn(body) {
  return () => Promise.resolve(JSON.stringify(body));
}

function makeReq(body) {
  return { method: 'POST', accountId: 'test-user', body };
}

function makeRes() {
  return {
    statusCode: null,
    body: '',
    headersSent: false,
    writeHeadCalls: 0,
    writeHead(code) {
      this.writeHeadCalls += 1;
      this.statusCode = code;
    },
    end(data) {
      this.headersSent = true;
      this.body = data || '';
    },
    json() {
      return JSON.parse(this.body);
    }
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