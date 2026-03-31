// ── Routes · Entity Chat Routes ──────────────────────────────────────────────
//
// HOW ENTITY CHAT ROUTING WORKS:
// This module manages multi-entity chat session lifecycle APIs (create, route
// messages, add/remove entities, fetch session, close session).
//
// WHAT USES THIS:
//   entity-network and multi-agent chat coordination surfaces
//
// EXPORTS:
//   createEntityChatRoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

// ── Entity Chat Routes ──────────────────────────────────────
// POST /api/entity/chat/create
// POST /api/entity/chat/message
// POST /api/entity/chat/add/:sessionId/:entityId
// POST /api/entity/chat/remove/:sessionId/:entityId
// GET  /api/entity/chat/:sessionId
// POST /api/entity/chat/:sessionId/close

/** Build entity chat route dispatcher and session handlers. */
function createEntityChatRoutes(ctx) {
  const manager = require('../brain/tasks/entity-chat-manager');

  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;

    if (p === '/api/entity/chat/create' && m === 'POST') {
      await createSession(req, res, apiHeaders, readBody);
      return true;
    }

    if (p === '/api/entity/chat/message' && m === 'POST') {
      await postMessage(req, res, apiHeaders, readBody);
      return true;
    }

    const addMatch = p.match(/^\/api\/entity\/chat\/add\/([^/]+)\/([^/]+)$/);
    if (addMatch && m === 'POST') {
      addEntity(res, apiHeaders, decodeURIComponent(addMatch[1]), decodeURIComponent(addMatch[2]));
      return true;
    }

    const removeMatch = p.match(/^\/api\/entity\/chat\/remove\/([^/]+)\/([^/]+)$/);
    if (removeMatch && m === 'POST') {
      removeEntity(res, apiHeaders, decodeURIComponent(removeMatch[1]), decodeURIComponent(removeMatch[2]));
      return true;
    }

    const getMatch = p.match(/^\/api\/entity\/chat\/([^/]+)$/);
    if (getMatch && m === 'GET') {
      getSession(res, apiHeaders, decodeURIComponent(getMatch[1]));
      return true;
    }

    const closeMatch = p.match(/^\/api\/entity\/chat\/([^/]+)\/close$/);
    if (closeMatch && m === 'POST') {
      await closeSession(req, res, apiHeaders, readBody, decodeURIComponent(closeMatch[1]));
      return true;
    }

    return false;
  }

  async function createSession(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const session = manager.createSession({
        sessionType: body.sessionType || 'planning',
        prompt: body.prompt || '',
        entityIds: Array.isArray(body.entityIds) ? body.entityIds : []
      });
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, sessionId: session.id }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postMessage(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const msg = manager.routeMessage(body.sessionId, {
        content: body.content,
        from: body.from || 'system'
      });
      if (!msg) {
        res.writeHead(404, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Session not found or closed' }));
        return;
      }
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, message: msg }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }
  /** Add one entity to an existing chat session. */
  function addEntity(res, apiHeaders, sessionId, entityId) {
    const session = manager.addEntity(sessionId, entityId);
    if (!session) {
      res.writeHead(404, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Session not found or closed' }));
      return;
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, sessionId, entityIds: session.entityIds }));
  }
  /** Remove one entity from an existing chat session. */
  function removeEntity(res, apiHeaders, sessionId, entityId) {
    const session = manager.removeEntity(sessionId, entityId);
    if (!session) {
      res.writeHead(404, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Session not found or closed' }));
      return;
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, sessionId, entityIds: session.entityIds }));
  }
  /** Return one entity chat session payload by id. */
  function getSession(res, apiHeaders, sessionId) {
    const session = manager.getSession(sessionId);
    if (!session) {
      res.writeHead(404, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Session not found' }));
      return;
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, session }));
  }

  async function closeSession(req, res, apiHeaders, readBody, sessionId) {
    try {
      const body = JSON.parse(await readBody(req));
      const session = manager.closeSession(sessionId, body.artifact || null);
      if (!session) {
        res.writeHead(404, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Session not found' }));
        return;
      }
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, sessionId: session.id, status: session.status }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  return { dispatch };
}

module.exports = createEntityChatRoutes;
