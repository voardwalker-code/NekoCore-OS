// ── Tests · Reset All Workspace Guards.Test ────────────────────────────────────────────────────
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
const resetSrc = fs.readFileSync(path.join(ROOT, 'reset-all.js'), 'utf8');

test('reset-all clears virtual desktop workspace state', () => {
  assert.match(
    resetSrc,
    /path\.join\('workspace', 'desktop'\)/,
    'reset-all.js must delete workspace/desktop so stale virtual desktop folders do not survive factory reset'
  );
  assert.match(
    resetSrc,
    /path\.join\('workspace', 'trash'\)/,
    'reset-all.js must delete workspace/trash so stale move logs and trash markers do not survive factory reset'
  );
});