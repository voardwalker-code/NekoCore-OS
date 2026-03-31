// ── Tests · Theme Custom Persistence Guards.Test ────────────────────────────────────────────────────
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
const themeManagerSrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'apps', 'optional', 'theme-manager.js'), 'utf8');

test('theme manager hydrates saved user themes before DOMContentLoaded restore', () => {
  const injectIndex = themeManagerSrc.indexOf('_injectUserThemes();');
  const domReadyIndex = themeManagerSrc.indexOf("document.addEventListener('DOMContentLoaded', async () => {");

  assert.notEqual(injectIndex, -1, 'theme-manager.js must hydrate saved user themes');
  assert.notEqual(domReadyIndex, -1, 'theme-manager.js must keep DOMContentLoaded initialization');
  assert.ok(
    injectIndex < domReadyIndex,
    'theme-manager.js must hydrate saved user themes before DOMContentLoaded boot-time theme restore'
  );
});