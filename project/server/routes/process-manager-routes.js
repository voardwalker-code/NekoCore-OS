// ── Routes · Process Manager Routes ──────────────────────────────────────────
//
// HOW PROCESS MANAGEMENT WORKS:
// This module provides start/stop/status endpoints for MA, REM, and NekoCore
// sidecar servers using detached process launch and health probing.
//
// WHAT USES THIS:
//   server control UI and automation flows that manage sidecar runtimes
//
// EXPORTS:
//   createProcessManagerRoutes() + process management helpers/constants
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
// ── Process Manager Routes ──────────────────────────────────────────────────
// Start / stop / status for the three sub-servers (MA, REM, NekoCore Mind).
// Reuses the existing background-launcher scripts so behaviour is identical
// to running them from the terminal.
//
//   POST /api/servers/:id/start
//   POST /api/servers/:id/stop
//   GET  /api/servers/:id/status
//   GET  /api/servers/status          ← all at once

const { spawn } = require('child_process');
const path  = require('path');
const fs    = require('fs');
const http  = require('http');

const PROJECT = path.resolve(__dirname, '..', '..');          // project/
const MA_EXTERNAL = path.resolve(PROJECT, '..', '..', 'MA-Memory-Architect', 'MA');
const MA_INTERNAL = path.join(PROJECT, 'MA');
const MA_ROOT = fs.existsSync(path.join(MA_EXTERNAL, 'MA-Server.js')) ? MA_EXTERNAL : MA_INTERNAL;
const MA_REPO_URL = 'https://github.com/voardwalker-code/MA-Memory-Architect';

const SERVERS = {
  ma: {
    label:      'MA',
    script:     path.join(MA_ROOT, 'MA-Server.js'),
    pidFile:    path.join(MA_ROOT, 'ma.pid'),
    cwd:        MA_ROOT,
    port:       3850,
    healthPath: '/api/health',
    env:        { MA_NO_OPEN_BROWSER: '1' }
  },
  rem: {
    label:      'REM System',
    script:     path.join(MA_ROOT, 'MA-workspace', 'rem-system', 'rem-server.js'),
    pidFile:    path.join(MA_ROOT, 'MA-workspace', 'rem-system', 'rem.pid'),
    cwd:        path.join(MA_ROOT, 'MA-workspace', 'rem-system'),
    port:       3860,
    healthPath: '/api/health',
    env:        {}
  },
  nekocore: {
    label:      'NekoCore Mind',
    script:     path.join(MA_ROOT, 'MA-workspace', 'nekocore', 'nekocore-server.js'),
    pidFile:    path.join(MA_ROOT, 'MA-workspace', 'nekocore', 'nekocore.pid'),
    cwd:        path.join(MA_ROOT, 'MA-workspace', 'nekocore'),
    port:       3870,
    healthPath: '/nekocore/health',
    env:        {}
  }
};

// ── helpers ─────────────────────────────────────────────────────────────────

/** Return true when process id exists and is signalable. */
function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function readPid(srv) {
  if (!fs.existsSync(srv.pidFile)) return null;
  const pid = parseInt(fs.readFileSync(srv.pidFile, 'utf8'), 10);
  if (!pid || !isRunning(pid)) {
    try { fs.unlinkSync(srv.pidFile); } catch {}
    return null;
  }
  return pid;
}
/** Probe one server health endpoint and return availability payload. */
function healthCheck(srv) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${srv.port}${srv.healthPath}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ up: true, status: res.statusCode, body: d }));
    });
    req.on('error', () => resolve({ up: false }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ up: false }); });
  });
}
/** Start detached server process and persist pid file. */
function startServer(srv) {
  const pid = readPid(srv);
  if (pid) return { ok: true, already: true, pid };
  if (!fs.existsSync(srv.script)) {
    return { ok: false, error: `Script not found: ${srv.script}`, reason: 'ma_not_found', repoUrl: MA_REPO_URL };
  }
  if (!fs.existsSync(srv.cwd)) {
    return { ok: false, error: `Working directory not found: ${srv.cwd}`, reason: 'ma_not_found', repoUrl: MA_REPO_URL };
  }

  const child = spawn(process.execPath, [srv.script], {
    cwd:      srv.cwd,
    stdio:    'ignore',
    detached: true,
    env:      Object.assign({}, process.env, srv.env)
  });
  child.unref();
  fs.writeFileSync(srv.pidFile, String(child.pid));
  return { ok: true, already: false, pid: child.pid };
}
/** Stop running server process and clear pid file. */
function stopServer(srv) {
  const pid = readPid(srv);
  if (!pid) return { ok: true, wasRunning: false };
  try { process.kill(pid); } catch {}
  try { fs.unlinkSync(srv.pidFile); } catch {}
  return { ok: true, wasRunning: true, pid };
}

// ── route factory ───────────────────────────────────────────────────────────

/** Build process-manager route dispatcher for all managed servers. */
function createProcessManagerRoutes(/* ctx */) {
  function json(res, code, obj, apiHeaders) {
    res.writeHead(code, apiHeaders);
    res.end(JSON.stringify(obj));
  }

  async function dispatch(req, res, url, apiHeaders) {
    // GET /api/servers/status — all servers
    if (url.pathname === '/api/servers/status' && req.method === 'GET') {
      const out = {};
      for (const [id, srv] of Object.entries(SERVERS)) {
        const pid = readPid(srv);
        const h   = await healthCheck(srv);
        out[id] = { label: srv.label, port: srv.port, pid, running: !!pid, healthy: h.up };
      }
      json(res, 200, out, apiHeaders);
      return true;
    }

    // /api/servers/:id/...
    const m = url.pathname.match(/^\/api\/servers\/(ma|rem|nekocore)\/(start|stop|status)$/);
    if (!m) return false;

    const srv    = SERVERS[m[1]];
    const action = m[2];

    if (action === 'start' && req.method === 'POST') {
      const result = startServer(srv);
      json(res, 200, { server: m[1], label: srv.label, port: srv.port, ...result }, apiHeaders);
      return true;
    }

    if (action === 'stop' && req.method === 'POST') {
      const result = stopServer(srv);
      json(res, 200, { server: m[1], label: srv.label, ...result }, apiHeaders);
      return true;
    }

    if (action === 'status' && req.method === 'GET') {
      const pid = readPid(srv);
      const h   = await healthCheck(srv);
      json(res, 200, { server: m[1], label: srv.label, port: srv.port, pid, running: !!pid, healthy: h.up }, apiHeaders);
      return true;
    }

    return false;
  }

  return { dispatch };
}

module.exports = createProcessManagerRoutes;
module.exports.SERVERS      = SERVERS;
module.exports.startServer  = startServer;
module.exports.stopServer   = stopServer;
module.exports.healthCheck  = healthCheck;
module.exports.readPid      = readPid;
module.exports.isRunning    = isRunning;
module.exports.MA_REPO_URL  = MA_REPO_URL;
