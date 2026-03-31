// ── Tests · Context Chat Entity Guard.Test ────────────────────────────────────────────────────
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
const CHAT_JS = path.join(ROOT, 'client', 'js', 'apps', 'core', 'chat.js');
const APP_JS = path.join(ROOT, 'client', 'js', 'app.js');
const ENTITY_UI_JS = path.join(ROOT, 'client', 'js', 'apps', 'core', 'entity-ui.js');
// read()
// WHAT THIS DOES: read reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call read(...), then use the returned value in your next step.
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('context chat module includes no-entity guard sync function', () => {
  const src = read(CHAT_JS);

  assert.ok(
    src.includes('function syncContextChatGuard() {'),
    'chat.js should define syncContextChatGuard() for text field guard state'
  );
  assert.ok(
    src.includes("input.placeholder = 'Check out an entity to start context chat...';"),
    'chat guard should set a no-entity placeholder message'
  );
});

test('sendChatMessage hard-stops when no entity is checked out', () => {
  const src = read(CHAT_JS);
  const start = src.indexOf('async function sendChatMessage() {');
  const end = src.indexOf('// ============================================================\n// COMPRESS & SAVE');
  const block = src.slice(start, end > start ? end : start + 1200);

  assert.ok(
    block.includes('if (!syncContextChatGuard()) {'),
    'sendChatMessage should gate sends through syncContextChatGuard()'
  );
  assert.ok(
    block.includes("No entity checked out. Check out an entity before sending context chat messages."),
    'sendChatMessage should log a clear no-entity warning message'
  );
});

test('sidebar refresh syncs context chat guard after entity state updates', () => {
  const src = read(ENTITY_UI_JS);
  const start = src.indexOf('async function refreshSidebarEntities() {');
  const end = src.indexOf('async function sidebarSelectEntity(');
  const block = src.slice(start, end > start ? end : start + 2000);

  assert.ok(
    block.includes("const syncChatGuard = () => { if (typeof syncContextChatGuard === 'function') syncContextChatGuard(); };"),
    'refreshSidebarEntities should include a chat guard sync helper'
  );
  assert.ok(
    block.includes('syncChatGuard();'),
    'refreshSidebarEntities should invoke syncChatGuard() so chat input state tracks checkout state'
  );
});
