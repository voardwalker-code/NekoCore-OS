// ── Tests · Desktop Extraction Guards.Test ────────────────────────────────────────────────────
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.resolve(__dirname, '../../client/js');
const clientRoot = path.resolve(__dirname, '../../client');

const appSrc = readFileSync(path.join(jsRoot, 'app.js'), 'utf8');
const desktopSrc = readFileSync(path.join(jsRoot, 'desktop.js'), 'utf8');
const indexSrc = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

test('app.js contains P3-S2 desktop redirect comment', () => {
  assert.ok(appSrc.includes('Desktop shell functions moved to client/js/desktop.js (P3-S2)'));
});

test('app.js no longer defines initDesktopShell', () => {
  assert.equal(/^function initDesktopShell\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines closeStartMenu', () => {
  assert.equal(/^function closeStartMenu\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines renderPinnedApps', () => {
  assert.equal(/^function renderPinnedApps\s*\(/m.test(appSrc), false);
});

test('desktop.js defines initDesktopShell', () => {
  assert.ok(/^function initDesktopShell\s*\(/m.test(desktopSrc));
});

test('desktop.js defines toggleStartMenu', () => {
  assert.ok(/^function toggleStartMenu\s*\(/m.test(desktopSrc));
});

test('desktop.js defines renderPinnedApps', () => {
  assert.ok(/^function renderPinnedApps\s*\(/m.test(desktopSrc));
});

test('desktop.js defines updateTaskbarOverflow', () => {
  assert.ok(/^function updateTaskbarOverflow\s*\(/m.test(desktopSrc));
});

test('index.html loads desktop.js after app.js', () => {
  const appIndex = indexSrc.indexOf('<script src="js/app.js"></script>');
  const desktopIndex = indexSrc.indexOf('<script src="js/desktop.js"></script>');
  assert.notEqual(appIndex, -1);
  assert.notEqual(desktopIndex, -1);
  assert.ok(desktopIndex > appIndex);
});

test('index.html keeps window-manager.js after desktop.js', () => {
  const desktopIndex = indexSrc.indexOf('<script src="js/desktop.js"></script>');
  const windowManagerIndex = indexSrc.indexOf('<script src="js/window-manager.js"></script>');
  assert.notEqual(desktopIndex, -1);
  assert.notEqual(windowManagerIndex, -1);
  assert.ok(windowManagerIndex > desktopIndex);
});