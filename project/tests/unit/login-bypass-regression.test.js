// ── Tests · Login Bypass Regression.Test ────────────────────────────────────────────────────
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
const LOGIN_JS = path.join(ROOT, 'client', 'js', 'login.js');
// read()
// WHAT THIS DOES: read reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call read(...), then use the returned value in your next step.
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('login.js does not retain desktop bypass helpers', () => {
  const src = read(LOGIN_JS);
  assert.ok(!src.includes('function isDesktopBypassEnabled()'), 'login.js must not define isDesktopBypassEnabled()');
  assert.ok(!src.includes('function applyDesktopBypassAccount()'), 'login.js must not define applyDesktopBypassAccount()');
});

test('initLogin no longer bypasses authenticated session checks', () => {
  const src = read(LOGIN_JS);
  const start = src.indexOf('async function initLogin(options = {}) {');
  const end = src.indexOf('// Allow Enter key to submit login/register forms');
  const block = src.slice(start, end > start ? end : undefined);

  assert.ok(block.includes("const resp = await fetch('/api/auth/me');"), 'initLogin must check the live auth session');
  assert.ok(!block.includes('isDesktopBypassEnabled()'), 'initLogin must not short-circuit through a desktop bypass flag');
  assert.ok(!block.includes('applyDesktopBypassAccount()'), 'initLogin must not synthesize a bypass account');
  assert.ok(!src.includes('NEKO_DESKTOP_BYPASS'), 'login.js must not read NEKO_DESKTOP_BYPASS from localStorage');
  assert.ok(!src.includes('desktopBypass'), 'login.js must not read desktopBypass query flags');
  assert.ok(!src.includes('__desktopTestBypass'), 'login.js must not rely on __desktopTestBypass globals');
});