// ── Tests · Script Load Order Guards.Test ────────────────────────────────────────────────────
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
// A1-2 — Script Load Order Baseline Guards
//
// Locks critical load ordering relationships in index.html.
// These guards detect accidental script reordering during the
// app-folder migration slices (B1/C1).
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX_HTML = path.join(ROOT, 'client', 'index.html');
// getScriptOrder()
// WHAT THIS DOES: getScriptOrder reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getScriptOrder(...), then use the returned value in your next step.
function getScriptOrder() {
  const src = fs.readFileSync(INDEX_HTML, 'utf8');
  const matches = [...src.matchAll(/<script\s+src="([^"]+)"/g)];
  return matches.map(m => m[1]);
}
// indexOf()
// WHAT THIS DOES: indexOf is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call indexOf(...) where this helper behavior is needed.
function indexOf(scripts, fragment) {
  return scripts.findIndex(s => s.includes(fragment));
}
function assertBefore(scripts, a, b) {
  const idxA = indexOf(scripts, a);
  const idxB = indexOf(scripts, b);
  assert.ok(idxA !== -1, `script containing "${a}" must be present in index.html`);
  assert.ok(idxB !== -1, `script containing "${b}" must be present in index.html`);
  assert.ok(
    idxA < idxB,
    `"${a}" (pos ${idxA}) must load before "${b}" (pos ${idxB})`
  );
}

test('shared/sse.js loads before shared/api.js', () => {
  assertBefore(getScriptOrder(), 'shared/sse.js', 'shared/api.js');
});

test('shared/api.js loads before js/app.js', () => {
  assertBefore(getScriptOrder(), 'shared/api.js', 'js/app.js');
});

test('js/app.js loads before js/apps/core/chat.js', () => {
  assertBefore(getScriptOrder(), 'js/app.js', 'js/apps/core/chat.js');
});

test('js/app.js loads before js/boot.js', () => {
  assertBefore(getScriptOrder(), 'js/app.js', 'js/boot.js');
});

test('js/neural-viz/index.js loads before js/visualizer-ui.js', () => {
  assertBefore(getScriptOrder(), 'neural-viz/index.js', 'js/apps/optional/visualizer-ui.js');
});

test('js/visualizer-ui.js loads before js/apps/optional/dream-gallery.js', () => {
  assertBefore(getScriptOrder(), 'js/apps/optional/visualizer-ui.js', 'js/apps/optional/dream-gallery.js');
});

test('js/apps/optional/dream-gallery.js loads before js/boot.js', () => {
  assertBefore(getScriptOrder(), 'js/apps/optional/dream-gallery.js', 'js/boot.js');
});

test('js/boot.js is the last local script loaded', () => {
  const scripts = getScriptOrder().filter(s => !s.startsWith('http'));
  const lastLocal = scripts[scripts.length - 1];
  assert.ok(
    lastLocal.includes('js/boot.js'),
    `js/boot.js must be the last local script loaded; got "${lastLocal}"`
  );
});

test('all migrated optional app paths reference js/apps/optional prefix', () => {
  // Pins that already-migrated modules stay in apps/optional, not regress to flat js/
  const scripts = getScriptOrder();
  const dreamGalleryEntry = scripts.find(s => s.includes('dream-gallery.js'));
  assert.ok(dreamGalleryEntry, 'dream-gallery.js must be present in index.html script list');
  assert.ok(
    dreamGalleryEntry.includes('js/apps/optional/'),
    `dream-gallery.js must load from js/apps/optional/, got "${dreamGalleryEntry}"`
  );
});
