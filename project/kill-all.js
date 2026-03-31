#!/usr/bin/env node
// ── Module · Kill All ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This module belongs to the NekoCore OS codebase and provides focused
// subsystem behavior.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
// ── Kill All Servers ────────────────────────────────────────────────────────
// Stops every NekoCore-ecosystem server that was launched via its background
// launcher.  Safe to run even when nothing is running.
//
// Usage:  node kill-all.js

const fs = require('fs');
const path = require('path');

const SERVERS = [
  { name: 'NekoCore OS',   pid: path.join(__dirname, 'neko.pid') },
  { name: 'MA',            pid: path.join(__dirname, 'MA', 'ma.pid') },
  { name: 'REM System',    pid: path.join(__dirname, 'MA', 'MA-workspace', 'rem-system', 'rem.pid') },
  { name: 'NekoCore Mind', pid: path.join(__dirname, 'MA', 'MA-workspace', 'nekocore', 'nekocore.pid') }
];

let stopped = 0;
let already = 0;

for (const srv of SERVERS) {
  if (!fs.existsSync(srv.pid)) {
    console.log(`[${srv.name}] not running (no PID file)`);
    already++;
    continue;
  }

  const pid = parseInt(fs.readFileSync(srv.pid, 'utf8'), 10);

  try {
    process.kill(pid, 0);   // probe — throws if process gone
    process.kill(pid);       // SIGTERM
    console.log(`[${srv.name}] stopped (PID ${pid})`);
    stopped++;
  } catch {
    console.log(`[${srv.name}] already stopped (stale PID ${pid})`);
    already++;
  }

  fs.unlinkSync(srv.pid);
}

console.log(`\nDone — ${stopped} stopped, ${already} were not running.`);
