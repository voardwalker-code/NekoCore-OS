// ── Routes · Server Control Routes ───────────────────────────────────────────
//
// HOW SERVER CONTROL WORKS:
// This module exposes status and boot endpoints for NekoCore and MA, including
// detached process start and lightweight health probing.
//
// WHAT USES THIS:
//   admin/control UI flows that inspect or restart local server processes
//
// EXPORTS:
//   createServerControlRoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

// ── Server Control Routes ─────────────────────────────────────
// GET  /api/server/status       — health status of NekoCore + MA
// POST /api/server/boot/neko    — restart NekoCore OS server
// POST /api/server/boot/ma      — start MA server
// POST /api/server/boot/both    — restart NekoCore + start MA
'use strict';

const { spawn } = require('child_process');
const path  = require('path');
const fs    = require('fs');
const http  = require('http');
/** Build route dispatcher for server health and boot control endpoints. */
function createServerControlRoutes(ctx) {
  const PROJECT_ROOT       = path.resolve(__dirname, '..', '..');
  const MA_EXTERNAL_DIR    = path.resolve(PROJECT_ROOT, '..', '..', 'MA-Memory-Architect', 'MA');
  const MA_INTERNAL_DIR    = path.join(PROJECT_ROOT, 'MA');
  const MA_DIR             = fs.existsSync(path.join(MA_EXTERNAL_DIR, 'MA-Server.js')) ? MA_EXTERNAL_DIR : MA_INTERNAL_DIR;
  const MA_SERVER_SCRIPT   = path.join(MA_DIR, 'MA-Server.js');
  const MA_PID_FILE        = path.join(MA_DIR, 'ma.pid');
  const MA_PORT            = 3850;
  const MA_HEALTH          = '/api/health';

  const NEKO_SERVER_SCRIPT = path.resolve(__dirname, '..', 'server.js');
  const NEKO_PID_FILE      = path.join(PROJECT_ROOT, 'neko.pid');
  const NEKO_PORT          = 3847;
  const NEKO_HEALTH        = '/api/nekocore/status';

  async function dispatch(req, res, url, apiHeaders) {
    const p = url.pathname;
    const m = req.method;
    if (p === '/api/server/status'     && m === 'GET')  { await serverStatus(res, apiHeaders); return true; }
    if (p === '/api/server/boot/neko'  && m === 'POST') { await bootNeko(res, apiHeaders);     return true; }
    if (p === '/api/server/boot/ma'    && m === 'POST') { await bootMA(res, apiHeaders);       return true; }
    if (p === '/api/server/boot/both'  && m === 'POST') { await bootBoth(res, apiHeaders);     return true; }
    return false;
  }

  // ── helpers ────────────────────────────────────────────────

  /** Probe one server health endpoint and return running status. */
  function checkHealth(port, healthPath, timeout) {
    timeout = timeout || 3000;
    return new Promise(function (resolve) {
      var req = http.get('http://localhost:' + port + healthPath, function (r) {
        var d = '';
        r.on('data', function (c) { d += c; });
        r.on('end', function () { resolve({ running: true, info: d }); });
      });
      req.on('error', function () { resolve({ running: false }); });
      req.setTimeout(timeout, function () { req.destroy(); resolve({ running: false }); });
    });
  }
  /** Spawn detached node process and return child pid. */
  function spawnDetached(script, cwd, extraEnv) {
    var child = spawn(process.execPath, [script], {
      cwd: cwd,
      stdio: 'ignore',
      detached: true,
      env: Object.assign({}, process.env, extraEnv || {})
    });
    child.unref();
    return child.pid;
  }

  // ── handlers ───────────────────────────────────────────────

  async function serverStatus(res, apiHeaders) {
    var results = await Promise.all([
      checkHealth(NEKO_PORT, NEKO_HEALTH),
      checkHealth(MA_PORT, MA_HEALTH)
    ]);
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, neko: results[0], ma: results[1] }));
  }

  async function startMA() {
    var status = await checkHealth(MA_PORT, MA_HEALTH);
    if (status.running) return { started: false, reason: 'already_running' };

    if (!fs.existsSync(MA_SERVER_SCRIPT)) return { started: false, reason: 'ma_not_found', repoUrl: 'https://github.com/voardwalker-code/MA-Memory-Architect' };

    // Clean stale PID
    try { if (fs.existsSync(MA_PID_FILE)) fs.unlinkSync(MA_PID_FILE); } catch (_) {}

    var pid = spawnDetached(MA_SERVER_SCRIPT, MA_DIR, { MA_NO_OPEN_BROWSER: '1' });
    try { fs.writeFileSync(MA_PID_FILE, String(pid)); } catch (_) {}
    return { started: true, pid: pid };
  }
  /** Start new NekoCore process and schedule current process exit. */
  function restartNeko() {
    var pid = spawnDetached(NEKO_SERVER_SCRIPT, path.dirname(NEKO_SERVER_SCRIPT));
    try { fs.writeFileSync(NEKO_PID_FILE, String(pid)); } catch (_) {}
    // Exit this process after response flushes
    setTimeout(function () { process.exit(0); }, 300);
    return { restarting: true, pid: pid };
  }

  async function bootNeko(res, apiHeaders) {
    var result = restartNeko();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, server: 'neko', restarting: true, pid: result.pid }));
  }

  async function bootMA(res, apiHeaders) {
    var result = await startMA();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, server: 'ma', started: result.started, reason: result.reason || null, pid: result.pid || null }));
  }

  async function bootBoth(res, apiHeaders) {
    var maResult = await startMA();
    var nekoResult = restartNeko();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, neko: nekoResult, ma: maResult }));
  }

  return { dispatch: dispatch };
}

module.exports = createServerControlRoutes;
