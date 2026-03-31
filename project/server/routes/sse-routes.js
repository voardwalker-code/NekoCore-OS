// ── Routes · SSE Routes ──────────────────────────────────────────────────────
//
// HOW SSE ROUTING WORKS:
// This route module handles Server-Sent Events subscription for brain event
// streaming and tracks active SSE client connections.
//
// WHAT USES THIS:
//   client real-time brain/thought event listeners
//
// EXPORTS:
//   createSSERoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

// ── SSE Routes ───────────────────────────────────────────────
// GET /api/brain/events — real-time cognitive event stream

/** Build SSE route dispatcher and register connection lifecycle handling. */
function createSSERoutes(ctx) {
  async function dispatch(req, res, url, apiHeaders) {
    if (url.pathname === '/api/brain/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': `http://localhost:${ctx.PORT}`
      });
      res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: Date.now() })}\n\n`);
      ctx.sseClients.add(res);
      req.on('close', () => { ctx.sseClients.delete(res); });
      return true;
    }
    return false;
  }

  return { dispatch };
}

module.exports = createSSERoutes;
