// ── Services · MA Bridge ─────────────────────────────────────────────────────
//
// HOW THIS BRIDGE WORKS:
// This module ensures the MA sidecar process is running and provides a thin
// request/health adapter for server flows that delegate work to MA.
//
// WHAT USES THIS:
//   orchestration flows that need MA startup, chat call, and health checks
//
// EXPORTS:
//   ensureMARunning(), callMA(), getMAHealth()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const http = require('http');
const {
  SERVERS,
  startServer,
  healthCheck,
  readPid,
  MA_REPO_URL
} = require('../routes/process-manager-routes');

const MA = SERVERS.ma;
const MA_PORT = MA.port;           // 3850
const MA_CHAT_PATH = '/api/chat';
const BOOT_TIMEOUT_MS = 20000;     // max wait for MA to become healthy
const CALL_TIMEOUT_MS = 120000;    // max wait for a single /api/chat call

// ── ensureMARunning ─────────────────────────────────────────────────────────

async function ensureMARunning() {
  // Fast path: already healthy
  const probe = await healthCheck(MA);
  if (probe.up) return { ok: true, wasAlready: true };

  // Try to start
  const startResult = startServer(MA);
  if (!startResult.ok) return { ok: false, reason: 'startServer failed', repoUrl: MA_REPO_URL };

  // Poll until healthy or timeout
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await _sleep(1500);
    const h = await healthCheck(MA);
    if (h.up) return { ok: true, wasAlready: false, pid: startResult.pid };
  }

  return { ok: false, reason: `MA did not become healthy within ${BOOT_TIMEOUT_MS / 1000}s`, repoUrl: MA_REPO_URL };
}

// ── callMA ──────────────────────────────────────────────────────────────────

/** Send one chat request to MA service and normalize its response payload. */
function callMA(message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message, history: [] });

    const req = http.request({
      hostname: 'localhost',
      port:     MA_PORT,
      path:     MA_CHAT_PATH,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length':  Buffer.byteLength(body)
      },
      timeout:  CALL_TIMEOUT_MS
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            ok:           true,
            reply:        parsed.reply || '',
            filesChanged: parsed.filesChanged || [],
            taskType:     parsed.taskType || null,
            steps:        parsed.steps || 0
          });
        } catch (e) {
          resolve({ ok: false, error: 'Invalid JSON from MA', raw: data.slice(0, 500) });
        }
      });
    });

    req.on('error', err => {
      resolve({ ok: false, error: err.message, repoUrl: MA_REPO_URL });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: `MA did not respond within ${CALL_TIMEOUT_MS / 1000}s`, repoUrl: MA_REPO_URL });
    });

    req.write(body);
    req.end();
  });
}

// ── getMAHealth ─────────────────────────────────────────────────────────────

async function getMAHealth() {
  const pid = readPid(MA);
  const h = await healthCheck(MA);
  return {
    running: !!pid,
    healthy: h.up,
    pid:     pid || null,
    port:    MA_PORT
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Sleep helper used for MA health polling loop. */
function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { ensureMARunning, callMA, getMAHealth };
