const { test } = require('node:test');
const assert = require('node:assert/strict');

const createEntityChatRoutes = require('../../server/routes/entity-chat-routes');

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

test('entity chat route lifecycle: create -> message -> add/remove -> get -> close', async () => {
  const routes = createEntityChatRoutes({});
  const apiHeaders = { 'Content-Type': 'application/json' };

  const createReq = makeReq('POST', {
    sessionType: 'planning',
    prompt: 'Plan this feature',
    entityIds: ['entity_a', 'entity_b']
  });
  const createRes = makeRes();
  const createUrl = new URL('http://localhost/api/entity/chat/create');

  const handledCreate = await routes.dispatch(createReq, createRes, createUrl, apiHeaders, readBody);
  assert.equal(handledCreate, true);
  assert.equal(createRes.status, 200);

  const created = JSON.parse(createRes.body);
  assert.equal(created.ok, true);
  assert.ok(created.sessionId);

  const addReq = makeReq('POST');
  const addRes = makeRes();
  const addUrl = new URL('http://localhost/api/entity/chat/add/' + created.sessionId + '/entity_c');
  const handledAdd = await routes.dispatch(addReq, addRes, addUrl, apiHeaders, readBody);
  assert.equal(handledAdd, true);
  assert.equal(addRes.status, 200);

  const msgReq = makeReq('POST', { sessionId: created.sessionId, content: 'Round 1 thoughts', from: 'entity_a' });
  const msgRes = makeRes();
  const msgUrl = new URL('http://localhost/api/entity/chat/message');
  const handledMsg = await routes.dispatch(msgReq, msgRes, msgUrl, apiHeaders, readBody);
  assert.equal(handledMsg, true);
  assert.equal(msgRes.status, 200);

  const getReq = makeReq('GET');
  const getRes = makeRes();
  const getUrl = new URL('http://localhost/api/entity/chat/' + created.sessionId);
  const handledGet = await routes.dispatch(getReq, getRes, getUrl, apiHeaders, readBody);
  assert.equal(handledGet, true);
  assert.equal(getRes.status, 200);

  const state = JSON.parse(getRes.body);
  assert.equal(state.ok, true);
  assert.equal(state.session.id, created.sessionId);
  assert.ok(Array.isArray(state.session.messages));
  assert.ok(state.session.messages.length >= 1);

  const removeReq = makeReq('POST');
  const removeRes = makeRes();
  const removeUrl = new URL('http://localhost/api/entity/chat/remove/' + created.sessionId + '/entity_b');
  const handledRemove = await routes.dispatch(removeReq, removeRes, removeUrl, apiHeaders, readBody);
  assert.equal(handledRemove, true);
  assert.equal(removeRes.status, 200);

  const closeReq = makeReq('POST', { artifact: { type: 'plan', summary: 'Consensus reached' } });
  const closeRes = makeRes();
  const closeUrl = new URL('http://localhost/api/entity/chat/' + created.sessionId + '/close');
  const handledClose = await routes.dispatch(closeReq, closeRes, closeUrl, apiHeaders, readBody);
  assert.equal(handledClose, true);
  assert.equal(closeRes.status, 200);

  const closed = JSON.parse(closeRes.body);
  assert.equal(closed.ok, true);
  assert.equal(closed.status, 'closed');
});
