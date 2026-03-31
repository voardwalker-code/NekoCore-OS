// ── Tests · Port Guard.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:net, node:http, ../../server/services/port-guard.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
const test   = require('node:test');
const assert = require('node:assert/strict');
const net    = require('node:net');
const http   = require('node:http');

const { isPortFree, identifyInstance, probe, resolvePort } = require('../../server/services/port-guard');

// ── Helper: occupy a port with a dummy server ───────────────────────────────
// occupy()
// WHAT THIS DOES: occupy is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call occupy(...) where this helper behavior is needed.
function occupy(port, handler) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(handler || ((_, res) => { res.end('ok'); }));
    srv.listen(port, '127.0.0.1', () => resolve(srv));
    srv.on('error', reject);
  });
}
// freePort()
// WHAT THIS DOES: freePort is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call freePort(...) where this helper behavior is needed.
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
    s.on('error', reject);
  });
}

// ── isPortFree ──────────────────────────────────────────────────────────────

test('isPortFree returns true for an unused port', async () => {
  const p = await freePort();
  assert.equal(await isPortFree(p), true);
});

test('isPortFree returns false for an occupied port', async () => {
  const p = await freePort();
  const srv = await occupy(p);
  try {
    assert.equal(await isPortFree(p), false);
  } finally {
    srv.close();
  }
});

// ── probe ───────────────────────────────────────────────────────────────────

test('probe returns ok:true with body for a responding server', async () => {
  const p = await freePort();
  const srv = await occupy(p, (_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'up' }));
  });
  try {
    const r = await probe(p, '/health', 1000);
    assert.equal(r.ok, true);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { status: 'up' });
  } finally {
    srv.close();
  }
});

test('probe returns ok:false for an unoccupied port', async () => {
  const p = await freePort();
  const r = await probe(p, '/', 500);
  assert.equal(r.ok, false);
});

// ── identifyInstance ────────────────────────────────────────────────────────

test('identifyInstance detects a NekoCore OS server', async () => {
  const p = await freePort();
  const srv = await occupy(p, (req, res) => {
    if (req.url === '/api/nekocore/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, isSystemEntityReady: true, activeModel: 'test-model' }));
    } else { res.writeHead(404); res.end(); }
  });
  try {
    const id = await identifyInstance(p);
    assert.equal(id.identified, true);
    assert.equal(id.name, 'NekoCore OS');
    assert.ok(id.detail.includes('test-model'));
  } finally {
    srv.close();
  }
});

test('identifyInstance detects an MA server', async () => {
  const p = await freePort();
  const srv = await occupy(p, (req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, status: 'healthy', files: 42, critical: 0 }));
    } else { res.writeHead(404); res.end(); }
  });
  try {
    const id = await identifyInstance(p);
    assert.equal(id.identified, true);
    assert.equal(id.name, 'MA (Memory Architect)');
  } finally {
    srv.close();
  }
});

test('identifyInstance returns identified:false for an unoccupied port', async () => {
  const p = await freePort();
  const id = await identifyInstance(p);
  assert.equal(id.identified, false);
});

// ── resolvePort ─────────────────────────────────────────────────────────────

test('resolvePort returns the default port when it is free', async () => {
  const p = await freePort();
  const resolved = await resolvePort({
    defaultPort: p,
    serverName: 'Test',
    healthPath: '/health',
    portRange: [p, p + 5]
  });
  assert.equal(resolved, p);
});

test('resolvePort finds an alternative when default is busy and stdin is not a TTY', async () => {
  // When stdin is not a TTY, askUser returns defaultAnswer.
  // For a different-service collision the default is 'y' (proceed).
  const p = await freePort();
  const srv = await occupy(p, (_, res) => { res.writeHead(200); res.end('hi'); });
  try {
    const alt = await freePort();
    const resolved = await resolvePort({
      defaultPort: p,
      serverName: 'Test',
      healthPath: '/test-health',
      portRange: [alt, alt + 5]
    });
    assert.ok(resolved >= alt && resolved <= alt + 5, `expected port in range ${alt}-${alt + 5}, got ${resolved}`);
  } finally {
    srv.close();
  }
});

test('resolvePort returns 0 when same-type instance detected and stdin is not a TTY', async () => {
  // Same-type detection + non-TTY stdin → default 'n' → returns 0
  const p = await freePort();
  const srv = await occupy(p, (req, res) => {
    if (req.url === '/api/nekocore/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, isSystemEntityReady: true, activeModel: 'x' }));
    } else { res.writeHead(404); res.end(); }
  });
  try {
    const resolved = await resolvePort({
      defaultPort: p,
      serverName: 'NekoCore OS',
      healthPath: '/api/nekocore/status',
      portRange: [p, p + 5]
    });
    assert.equal(resolved, 0);
  } finally {
    srv.close();
  }
});
