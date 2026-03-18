'use strict';

// ============================================================
// P3-S16 — Shell-Core Minimization & Phase 3 Exit Audit
//
// These tests provide the documented evidence for Phase 3 closure:
//
//   1. app.js is shell-core only — line count within target bounds
//   2. All cross-module calls use typeof guards (graceful degradation)
//   3. Non-core modules are NOT defined inside app.js
//   4. login.js uses typeof guard for refreshSidebarEntities (entity-ui.js dep)
//   5. Script load order: all extracted modules present in index.html
//   6. P3-S15/P3-S14 redirect comments are present in app.js
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT       = path.resolve(__dirname, '..', '..');
const APP_JS     = path.join(ROOT, 'client', 'js', 'app.js');
const LOGIN_JS   = path.join(ROOT, 'client', 'js', 'login.js');
const INDEX_HTML = path.join(ROOT, 'client', 'index.html');

function read(filePath) { return fs.readFileSync(filePath, 'utf8'); }

// ============================================================
// 1. app.js line count — shell-core minimization check
// ============================================================

test('app.js is within shell-core size bounds (< 1200 lines)', () => {
  const src = read(APP_JS);
  const lineCount = src.split('\n').length;
  assert.ok(
    lineCount < 1200,
    'app.js should be < 1200 lines after Phase 3 extraction — got ' + lineCount
  );
});

// ============================================================
// 2. Cross-module calls use typeof guards — graceful degradation
// ============================================================

test('app.js guards flushPendingSystemPrompt with typeof check (chat.js dep)', () => {
  const src = read(APP_JS);
  assert.ok(
    src.includes("typeof flushPendingSystemPrompt === 'function'"),
    'app.js must guard flushPendingSystemPrompt with a typeof check'
  );
});

test('app.js guards clearChat with typeof check (chat.js dep)', () => {
  const src = read(APP_JS);
  assert.ok(
    src.includes("typeof clearChat === 'function'"),
    'app.js must guard clearChat with a typeof check'
  );
});

test('app.js guards updateDeepSleepBadge with typeof check (sleep.js dep)', () => {
  const src = read(APP_JS);
  assert.ok(
    src.includes("typeof updateDeepSleepBadge === 'function'"),
    'app.js must guard updateDeepSleepBadge with a typeof check'
  );
});

// ============================================================
// 3. Non-core ownership NOT in app.js
// ============================================================

test('app.js does NOT own entity browser functions (moved to entity-ui.js)', () => {
  const src = read(APP_JS);
  assert.ok(!src.includes('async function refreshSidebarEntities('), 'refreshSidebarEntities must NOT be in app.js');
  assert.ok(!src.includes('function renderEntityInfoPanel('), 'renderEntityInfoPanel must NOT be in app.js');
  assert.ok(!src.includes('async function checkoutEntity('), 'checkoutEntity must NOT be in app.js');
});

test('app.js does NOT own system health handlers (moved to system-health.js)', () => {
  const src = read(APP_JS);
  assert.ok(!src.includes('async function repairMemoryLogs('), 'repairMemoryLogs must NOT be in app.js');
  assert.ok(!src.includes('async function runSystemBackup('), 'runSystemBackup must NOT be in app.js');
  assert.ok(!src.includes('function formatBytes('), 'formatBytes must NOT be in app.js');
});

test('app.js does NOT own theme functions (moved to theme-manager.js)', () => {
  const src = read(APP_JS);
  assert.ok(!src.includes('function applyTheme('), 'applyTheme must NOT be in app.js');
  assert.ok(!src.includes('function renderThemeGallery('), 'renderThemeGallery must NOT be in app.js');
});

test('app.js does NOT own telemetry rendering (moved to telemetry-ui.js)', () => {
  const src = read(APP_JS);
  assert.ok(!src.includes('function renderAppMetrics('), 'renderAppMetrics must NOT be in app.js');
  assert.ok(!src.includes('function updateTaskManagerView('), 'updateTaskManagerView must NOT be in app.js');
});

// ============================================================
// 4. login.js uses typeof guard for entity-ui.js dep
// ============================================================

test('login.js guards refreshSidebarEntities with typeof check (entity-ui.js dep)', () => {
  const src = read(LOGIN_JS);
  assert.ok(
    src.includes("typeof refreshSidebarEntities === 'function'"),
    'login.js must guard refreshSidebarEntities call — cross-module dep from entity-ui.js'
  );
});

// ============================================================
// 5. Script load order — all extracted modules present
// ============================================================

const REQUIRED_MODULES = [
  'js/apps/core/config-profiles.js',
  'js/apps/core/simple-provider.js',
  'js/apps/optional/theme-manager.js',
  'js/apps/core/telemetry-ui.js',
  'js/apps/core/entity-ui.js',
  'js/apps/core/system-health.js',
];

for (const mod of REQUIRED_MODULES) {
  test('index.html includes extracted module: ' + mod, () => {
    const src = read(INDEX_HTML);
    assert.ok(src.includes(mod), 'index.html must include ' + mod);
  });
}

// ============================================================
// 6. Redirect comments present in app.js (audit trail)
// ============================================================

test('app.js has P3-S14 entity UI redirect comment', () => {
  const src = read(APP_JS);
  assert.ok(
    src.includes('entity-ui.js (P3-S14)'),
    'app.js must have redirect comment pointing to entity-ui.js for P3-S14 extractions'
  );
});

test('app.js has P3-S15 system health redirect comment', () => {
  const src = read(APP_JS);
  assert.ok(
    src.includes('system-health.js (P3-S15)'),
    'app.js must have redirect comment pointing to system-health.js for P3-S15 extractions'
  );
});
