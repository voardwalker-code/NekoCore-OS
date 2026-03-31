// ── Tests · Window Manager Extraction Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// Guard tests — P3-S1 window-manager extraction
// Verifies that window-manager.js was correctly split from app.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../client/js');

const appSrc = readFileSync(path.join(root, 'app.js'), 'utf8');
const wmSrc  = readFileSync(path.join(root, 'window-manager.js'), 'utf8');

test('app.js contains P3-S1 redirect comment', () => {
  assert.ok(
    appSrc.includes('window-manager.js (P3-S1)'),
    'Expected redirect comment not found in app.js'
  );
});

test('app.js does NOT define getStageRect as a top-level function', () => {
  // The function must NOT appear as a bare top-level declaration in app.js
  // (it may appear inside a string/comment, so we check for the definition pattern)
  const topLevelDef = /^function getStageRect\s*\(/m;
  assert.equal(
    topLevelDef.test(appSrc), false,
    'getStageRect is still defined as a top-level function in app.js'
  );
});

test('app.js does NOT define initWindowManager as a top-level function', () => {
  const topLevelDef = /^function initWindowManager\s*\(/m;
  assert.equal(
    topLevelDef.test(appSrc), false,
    'initWindowManager is still defined as a top-level function in app.js'
  );
});

test('app.js does NOT define createWindowShell as a top-level function', () => {
  const topLevelDef = /^function createWindowShell\s*\(/m;
  assert.equal(
    topLevelDef.test(appSrc), false,
    'createWindowShell is still defined as a top-level function in app.js'
  );
});

test('window-manager.js defines getStageRect', () => {
  assert.ok(/^function getStageRect\s*\(/m.test(wmSrc), 'getStageRect not found in window-manager.js');
});

test('window-manager.js defines initWindowManager', () => {
  assert.ok(/^function initWindowManager\s*\(/m.test(wmSrc), 'initWindowManager not found in window-manager.js');
});

test('window-manager.js defines createWindowShell', () => {
  assert.ok(/^function createWindowShell\s*\(/m.test(wmSrc), 'createWindowShell not found in window-manager.js');
});

test('window-manager.js defines buildLauncherMenu', () => {
  assert.ok(/^function buildLauncherMenu\s*\(/m.test(wmSrc), 'buildLauncherMenu not found in window-manager.js');
});

test('window-manager.js defines saveWindowLayout', () => {
  assert.ok(/^function saveWindowLayout\s*\(/m.test(wmSrc), 'saveWindowLayout not found in window-manager.js');
});

test('window-manager.js defines restoreWindowLayout', () => {
  assert.ok(/^function restoreWindowLayout\s*\(/m.test(wmSrc), 'restoreWindowLayout not found in window-manager.js');
});
