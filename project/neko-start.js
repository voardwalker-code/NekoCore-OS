#!/usr/bin/env node
'use strict';
// ── NekoCore OS Background Launcher ─────────────────────────────────────────
// Usage:  node neko-start.js          → start server in background
//         node neko-start.js --stop   → kill running server
//         node neko-start.js --status → check if running

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SERVER_SCRIPT = path.join(__dirname, 'server', 'server.js');
const PID_FILE = path.join(__dirname, 'neko.pid');
const PORT = 3847;
const HEALTH_PATH = '/api/nekocore/status';

const arg = process.argv[2];

if (arg === '--stop') {
  stop();
} else if (arg === '--status') {
  status();
} else {
  start();
}

function start() {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    if (isRunning(pid)) {
      console.log(`[NekoCore OS] Already running (PID ${pid})`);
      process.exit(0);
    }
    fs.unlinkSync(PID_FILE);
  }

  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    cwd: __dirname,
    stdio: 'ignore',
    detached: true
  });

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`[NekoCore OS] Server started in background (PID ${child.pid})`);
  console.log(`[NekoCore OS] http://localhost:${PORT}`);
  console.log(`[NekoCore OS] Stop with: node neko-start.js --stop`);
  process.exit(0);
}

function stop() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('[NekoCore OS] No PID file found — server not running.');
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
  try {
    process.kill(pid);
    console.log(`[NekoCore OS] Stopped (PID ${pid})`);
  } catch (e) {
    console.log(`[NekoCore OS] Process ${pid} not found — was already stopped.`);
  }
  fs.unlinkSync(PID_FILE);
}

function status() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('[NekoCore OS] Not running (no PID file).');
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
  if (!isRunning(pid)) {
    console.log(`[NekoCore OS] Not running (stale PID ${pid}).`);
    fs.unlinkSync(PID_FILE);
    return;
  }

  const req = http.get(`http://localhost:${PORT}${HEALTH_PATH}`, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(`[NekoCore OS] Running (PID ${pid}) — ${d}`));
  });
  req.on('error', () => {
    console.log(`[NekoCore OS] Process alive (PID ${pid}) but not responding on port ${PORT}.`);
  });
  req.setTimeout(3000, () => {
    req.destroy();
    console.log(`[NekoCore OS] Process alive (PID ${pid}) but health check timed out.`);
  });
}

function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
