// ── Tests · System Health Extraction Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:fs, node:path. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ============================================================
// P3-S15 — System Health Extraction Guard Tests
//
// Locks the ownership boundary: maintenance handlers must live in
// system-health.js and must NOT be defined in app.js.
//
// Sections:
//   1. Functions MUST be in system-health.js
//   2. Functions MUST NOT be in app.js
//   3. Script load-order: system-health.js must load after entity-ui.js
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SH_JS  = path.join(ROOT, 'client', 'js', 'apps', 'core', 'system-health.js');
const APP_JS = path.join(ROOT, 'client', 'js', 'app.js');
const INDEX_HTML = path.join(ROOT, 'client', 'index.html');
// read()
// WHAT THIS DOES: read reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call read(...), then use the returned value in your next step.
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}
function hasDecl(src, fragment) {
  return src.includes(fragment);
}

// ============================================================
// 1. Functions MUST be in system-health.js
// ============================================================

test('system-health.js defines repairMemoryLogs', () => {
  const src = read(SH_JS);
  assert.ok(hasDecl(src, 'function repairMemoryLogs('), 'repairMemoryLogs must be in system-health.js');
});

test('system-health.js defines showMemoryStats', () => {
  const src = read(SH_JS);
  assert.ok(hasDecl(src, 'function showMemoryStats('), 'showMemoryStats must be in system-health.js');
});

test('system-health.js defines rebuildTraceGraph', () => {
  const src = read(SH_JS);
  assert.ok(hasDecl(src, 'function rebuildTraceGraph('), 'rebuildTraceGraph must be in system-health.js');
});

test('system-health.js defines runSystemBackup', () => {
  const src = read(SH_JS);
  assert.ok(hasDecl(src, 'function runSystemBackup('), 'runSystemBackup must be in system-health.js');
});

test('system-health.js defines runSystemRestore', () => {
  const src = read(SH_JS);
  assert.ok(hasDecl(src, 'function runSystemRestore('), 'runSystemRestore must be in system-health.js');
});

test('system-health.js defines formatBytes', () => {
  const src = read(SH_JS);
  assert.ok(hasDecl(src, 'function formatBytes('), 'formatBytes must be in system-health.js');
});

// ============================================================
// 2. Functions MUST NOT be in app.js
// ============================================================

test('app.js does NOT define repairMemoryLogs', () => {
  const src = read(APP_JS);
  assert.ok(!hasDecl(src, 'async function repairMemoryLogs('), 'repairMemoryLogs must NOT be defined in app.js');
});

test('app.js does NOT define showMemoryStats', () => {
  const src = read(APP_JS);
  assert.ok(!hasDecl(src, 'async function showMemoryStats('), 'showMemoryStats must NOT be defined in app.js');
});

test('app.js does NOT define rebuildTraceGraph', () => {
  const src = read(APP_JS);
  assert.ok(!hasDecl(src, 'async function rebuildTraceGraph('), 'rebuildTraceGraph must NOT be defined in app.js');
});

test('app.js does NOT define runSystemBackup', () => {
  const src = read(APP_JS);
  assert.ok(!hasDecl(src, 'async function runSystemBackup('), 'runSystemBackup must NOT be defined in app.js');
});

test('app.js does NOT define runSystemRestore', () => {
  const src = read(APP_JS);
  assert.ok(!hasDecl(src, 'async function runSystemRestore('), 'runSystemRestore must NOT be defined in app.js');
});

test('app.js does NOT define formatBytes', () => {
  const src = read(APP_JS);
  assert.ok(!hasDecl(src, 'function formatBytes('), 'formatBytes must NOT be defined in app.js');
});

// ============================================================
// 3. Script load order: system-health.js must load after entity-ui.js
// ============================================================

test('index.html includes system-health.js script tag', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/core/system-health.js'), 'index.html must include system-health.js');
});

test('index.html loads system-health.js after entity-ui.js', () => {
  const src = read(INDEX_HTML);
  const posEntityUi = src.indexOf('js/apps/core/entity-ui.js');
  const posSysHealth = src.indexOf('js/apps/core/system-health.js');
  assert.ok(posEntityUi !== -1, 'entity-ui.js must be in index.html');
  assert.ok(posSysHealth !== -1, 'system-health.js must be in index.html');
  assert.ok(posSysHealth > posEntityUi, 'system-health.js must load after entity-ui.js');
});
