#!/usr/bin/env node
'use strict';
// ── MA Background Launcher ──────────────────────────────────────────────────
// Usage:  node ma-start.js          → start server in background
//         node ma-start.js --stop   → kill running server
//         node ma-start.js --status → check if running

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SERVER_SCRIPT = path.join(__dirname, 'MA-Server.js');
const PID_FILE = path.join(__dirname, 'ma.pid');
const PORT = 3850;
const HEALTH_PATH = '/api/health';

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
      console.log(`[MA] Already running (PID ${pid})`);
      process.exit(0);
    }
    fs.unlinkSync(PID_FILE);
  }

  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    cwd: __dirname,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, MA_NO_OPEN_BROWSER: '1' }
  });

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`[MA] Server started in background (PID ${child.pid})`);
  console.log(`[MA] http://localhost:${PORT}`);
  console.log(`[MA] Stop with: node ma-start.js --stop`);
  process.exit(0);
}

function stop() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('[MA] No PID file found — server not running.');
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
  try {
    process.kill(pid);
    console.log(`[MA] Stopped (PID ${pid})`);
  } catch (e) {
    console.log(`[MA] Process ${pid} not found — was already stopped.`);
  }
  fs.unlinkSync(PID_FILE);
}

function status() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('[MA] Not running (no PID file).');
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
  if (!isRunning(pid)) {
    console.log(`[MA] Not running (stale PID ${pid}).`);
    fs.unlinkSync(PID_FILE);
    return;
  }

  const req = http.get(`http://localhost:${PORT}${HEALTH_PATH}`, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(`[MA] Running (PID ${pid}) — ${d}`));
  });
  req.on('error', () => {
    console.log(`[MA] Process alive (PID ${pid}) but not responding on port ${PORT}.`);
  });
  req.setTimeout(3000, () => {
    req.destroy();
    console.log(`[MA] Process alive (PID ${pid}) but health check timed out.`);
  });
}

function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
