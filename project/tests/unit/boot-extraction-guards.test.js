// ── Tests · Boot Extraction Guards.Test ────────────────────────────────────────────────────
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
const bootSrc = readFileSync(path.join(jsRoot, 'boot.js'), 'utf8');
const indexSrc = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

test('app.js contains P3-S3 boot redirect comment', () => {
  assert.ok(appSrc.includes('Main app boot handler moved to client/js/boot.js (P3-S3)'));
});

test('app.js no longer contains the main DOMContentLoaded boot handler body', () => {
  assert.equal(appSrc.includes("await loadSavedConfig();"), false);
  assert.equal(appSrc.includes("document.addEventListener('DOMContentLoaded', async function() {\n  initDesktopShell();"), false);
});

test('boot.js registers the main DOMContentLoaded handler', () => {
  assert.ok(bootSrc.includes("document.addEventListener('DOMContentLoaded', async function() {"));
});

test('boot.js boots desktop shell first', () => {
  assert.ok(bootSrc.includes('initDesktopShell();'));
});

test('boot.js loads saved config during startup', () => {
  assert.ok(bootSrc.includes('await loadSavedConfig();'));
});

test('boot.js starts app, polling, and chat physical init', () => {
  assert.ok(bootSrc.includes('_startApp();'));
  assert.ok(bootSrc.includes('startBrainPoll();'));
  assert.ok(bootSrc.includes('initChatPhysical();'));
});

test('index.html loads boot.js', () => {
  assert.notEqual(indexSrc.indexOf('<script src="js/boot.js"></script>'), -1);
});

test('index.html loads boot.js after browser-app.js', () => {
  const browserIndex = indexSrc.indexOf('<script src="js/apps/optional/browser-app.js"></script>');
  const bootIndex = indexSrc.indexOf('<script src="js/boot.js"></script>');
  assert.notEqual(browserIndex, -1);
  assert.notEqual(bootIndex, -1);
  assert.ok(bootIndex > browserIndex);
});