// ── Tests · Taskbar Icon Guards.Test ────────────────────────────────────────────────────
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

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'client', 'index.html'), 'utf8');

test('taskbar user button uses explicit user icon entity', () => {
  assert.match(
    indexHtml,
    /<span class="os-start-user-avatar">&#128100;<\/span>/,
    'index.html must render the taskbar user avatar with an explicit HTML entity'
  );
});

test('taskbar power button and menu use explicit icon entities', () => {
  assert.match(
    indexHtml,
    /id="osStartPowerButton"[\s\S]*?&#x23FB;<\/button>/,
    'index.html must render the taskbar power button with an explicit HTML entity'
  );
  assert.match(
    indexHtml,
    /&#127769; Sleep \(Close Menu\)/,
    'index.html must render the sleep action with an explicit icon entity'
  );
  assert.match(
    indexHtml,
    /&#128682; Sign out/,
    'index.html must render the sign-out action with an explicit icon entity'
  );
});