// ── Tests · Nekocore Chat Enter Guards.Test ────────────────────────────────────────────────────
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
const src = fs.readFileSync(path.join(ROOT, 'client', 'js', 'nekocore-app.js'), 'utf8');

test('NekoCore chat sends on Enter and preserves Shift+Enter for multiline', () => {
  assert.match(src, /if \(e\.isComposing\) return;/, 'nekocore-app.js must ignore IME composition enter events');
  assert.match(src, /if \(e\.key === 'Enter' && !e\.shiftKey\)/, 'nekocore-app.js must send when Enter is pressed without Shift');
  assert.doesNotMatch(src, /\(e\.ctrlKey \|\| e\.metaKey\) && e\.key === 'Enter'/, 'nekocore-app.js must not require Ctrl+Enter or Cmd+Enter anymore');
});