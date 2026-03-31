// ── Tests · Core App Migration Guards.Test ────────────────────────────────────────────────────
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
// B1-0 — Core App Migration Guards
//
// Pre-migration baseline for Phase B1 (Core App Path Migration).
// These guards pin:
//   1. Current file existence for each core module
//   2. index.html load path for each core module
//   3. Key entrypoint declarations (ownership proof)
//
// Guards in this file are updated alongside each migration batch:
//   B1-1: chat.js, entity-ui.js, users-ui.js
//   B1-2: setup-ui.js, config-profiles.js, simple-provider.js, system-health.js
//   B1-3: telemetry-ui.js, debug-core-app.js
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX_HTML = path.join(ROOT, 'client', 'index.html');
// JS()
// Purpose: helper wrapper used by this module's main flow.
// JS()
// WHAT THIS DOES: JS is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call JS(...) where this helper behavior is needed.
const JS = (...parts) => path.join(ROOT, 'client', 'js', ...parts);

function readIndex() { return fs.readFileSync(INDEX_HTML, 'utf8'); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
// indexLoads()
// WHAT THIS DOES: indexLoads is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call indexLoads(...) where this helper behavior is needed.
function indexLoads(fragment) { return readIndex().includes(`src="${fragment}"`); }

// ============================================================
// Batch 1 — chat.js, entity-ui.js, users-ui.js
// ============================================================

test('chat.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'chat.js')), 'chat.js must exist under js/apps/core/');
});

test('index.html loads chat.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/chat.js'), 'index.html must load chat.js from js/apps/core/');
});

test('chat.js declares sendChatMessage entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'chat.js')).includes('async function sendChatMessage()'), 'chat.js must declare sendChatMessage');
});

test('chat.js declares initBrainSSE entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'chat.js')).includes('function initBrainSSE()'), 'chat.js must declare initBrainSSE');
});

test('chat.js declares clearChat entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'chat.js')).includes('function clearChat()'), 'chat.js must declare clearChat');
});

test('entity-ui.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'entity-ui.js')), 'entity-ui.js must exist under js/apps/core/');
});

test('index.html loads entity-ui.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/entity-ui.js'), 'index.html must load entity-ui.js from js/apps/core/');
});

test('entity-ui.js declares checkoutEntity entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'entity-ui.js')).includes('async function checkoutEntity('), 'entity-ui.js must declare checkoutEntity');
});

test('entity-ui.js declares refreshSidebarEntities entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'entity-ui.js')).includes('async function refreshSidebarEntities()'), 'entity-ui.js must declare refreshSidebarEntities');
});

test('users-ui.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'users-ui.js')), 'users-ui.js must exist under js/apps/core/');
});

test('index.html loads users-ui.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/users-ui.js'), 'index.html must load users-ui.js from js/apps/core/');
});

test('users-ui.js declares initUserSwitcher entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'users-ui.js')).includes('async function initUserSwitcher()'), 'users-ui.js must declare initUserSwitcher');
});

test('users-ui.js declares usersAppRefresh entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'users-ui.js')).includes('async function usersAppRefresh()'), 'users-ui.js must declare usersAppRefresh');
});

// ============================================================
// Batch 2 — setup-ui.js, config-profiles.js, simple-provider.js, system-health.js
// ============================================================

test('setup-ui.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'setup-ui.js')), 'setup-ui.js must exist under js/apps/core/');
});

test('index.html loads setup-ui.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/setup-ui.js'), 'index.html must load setup-ui.js from js/apps/core/');
});

test('setup-ui.js declares isApiConfigured entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'setup-ui.js')).includes('function isApiConfigured()'), 'setup-ui.js must declare isApiConfigured');
});

test('setup-ui.js declares showSetupWizard entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'setup-ui.js')).includes('function showSetupWizard()'), 'setup-ui.js must declare showSetupWizard');
});

test('config-profiles.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'config-profiles.js')), 'config-profiles.js must exist under js/apps/core/');
});

test('index.html loads config-profiles.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/config-profiles.js'), 'index.html must load config-profiles.js from js/apps/core/');
});

test('config-profiles.js declares loadSavedConfig entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'config-profiles.js')).includes('async function loadSavedConfig()'), 'config-profiles.js must declare loadSavedConfig');
});

test('config-profiles.js declares initSettingsModelSuggestions entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'config-profiles.js')).includes('function initSettingsModelSuggestions()'), 'config-profiles.js must declare initSettingsModelSuggestions');
});

test('simple-provider.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'simple-provider.js')), 'simple-provider.js must exist under js/apps/core/');
});

test('index.html loads simple-provider.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/simple-provider.js'), 'index.html must load simple-provider.js from js/apps/core/');
});

test('simple-provider.js declares initSimpleProviderUI entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'simple-provider.js')).includes('function initSimpleProviderUI()'), 'simple-provider.js must declare initSimpleProviderUI');
});

test('system-health.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'system-health.js')), 'system-health.js must exist under js/apps/core/');
});

test('index.html loads system-health.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/system-health.js'), 'index.html must load system-health.js from js/apps/core/');
});

test('system-health.js declares repairMemoryLogs entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'system-health.js')).includes('async function repairMemoryLogs()'), 'system-health.js must declare repairMemoryLogs');
});

test('system-health.js declares showMemoryStats entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'system-health.js')).includes('async function showMemoryStats()'), 'system-health.js must declare showMemoryStats');
});

// ============================================================
// Batch 3 — telemetry-ui.js, debug-core-app.js
// ============================================================

test('telemetry-ui.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'telemetry-ui.js')), 'telemetry-ui.js must exist under js/apps/core/');
});

test('index.html loads telemetry-ui.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/telemetry-ui.js'), 'index.html must load telemetry-ui.js from js/apps/core/');
});

test('telemetry-ui.js declares reportPipelinePhase entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'telemetry-ui.js')).includes('function reportPipelinePhase('), 'telemetry-ui.js must declare reportPipelinePhase');
});

test('telemetry-ui.js declares updateTaskManagerView entrypoint', () => {
  assert.ok(read(JS('apps', 'core', 'telemetry-ui.js')).includes('function updateTaskManagerView('), 'telemetry-ui.js must declare updateTaskManagerView');
});

test('debug-core-app.js exists at apps/core path', () => {
  assert.ok(fs.existsSync(JS('apps', 'core', 'debug-core-app.js')), 'debug-core-app.js must exist under js/apps/core/');
});

test('index.html loads debug-core-app.js from apps/core', () => {
  assert.ok(indexLoads('js/apps/core/debug-core-app.js'), 'index.html must load debug-core-app.js from js/apps/core/');
});

test('debug-core-app.js declares initCoreDebugApp entrypoint', () => {
  assert.ok(
    read(JS('apps', 'core', 'debug-core-app.js')).includes('initCoreDebugApp'),
    'debug-core-app.js must expose initCoreDebugApp'
  );
});

// ============================================================
// Flat-path regression guards — migrated files must NOT remain at js/ root
// ============================================================

test('index.html does not load chat.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/chat.js"'), 'legacy src="js/chat.js" must not remain in index.html');
});

test('index.html does not load entity-ui.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/entity-ui.js"'), 'legacy src="js/entity-ui.js" must not remain in index.html');
});

test('index.html does not load users-ui.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/users-ui.js"'), 'legacy src="js/users-ui.js" must not remain in index.html');
});

test('index.html does not load setup-ui.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/setup-ui.js"'), 'legacy src="js/setup-ui.js" must not remain in index.html');
});

test('index.html does not load config-profiles.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/config-profiles.js"'), 'legacy src="js/config-profiles.js" must not remain in index.html');
});

test('index.html does not load simple-provider.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/simple-provider.js"'), 'legacy src="js/simple-provider.js" must not remain in index.html');
});

test('index.html does not load system-health.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/system-health.js"'), 'legacy src="js/system-health.js" must not remain in index.html');
});

test('index.html does not load telemetry-ui.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/telemetry-ui.js"'), 'legacy src="js/telemetry-ui.js" must not remain in index.html');
});

test('index.html does not load debug-core-app.js from flat js/ root', () => {
  assert.ok(!readIndex().includes('src="js/debug-core-app.js"'), 'legacy src="js/debug-core-app.js" must not remain in index.html');
});
