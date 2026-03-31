// ── Tests · Telemetry Extraction Guards.Test ────────────────────────────────────────────────────
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
// Exposed API includes: window-attached API object.
// ─────────────────────────────────────────────────────────────────────────────

// P3-S11 extraction boundary guards — telemetry-ui.js
// Asserts: redirect comment in app.js, ownership in telemetry-ui.js, script order in index.html
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '../../client/js/app.js'), 'utf8');
const telemetryJs = fs.readFileSync(path.join(__dirname, '../../client/js/apps/core/telemetry-ui.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../../client/index.html'), 'utf8');

// ── Redirect comment exists in app.js ──
test('app.js has P3-S11 redirect comment for telemetry-ui', () => {
  assert.ok(
    appJs.includes('telemetry-ui.js (P3-S11)'),
    'app.js should have a P3-S11 redirect comment pointing to telemetry-ui.js'
  );
});

// ── Removed from app.js ──
test('runtimeTelemetry not defined in app.js', () => {
  assert.ok(
    !appJs.includes('const runtimeTelemetry = {'),
    'runtimeTelemetry must not be defined in app.js'
  );
});

test('formatTelemetryModel not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function formatTelemetryModel('),
    'formatTelemetryModel() must not be defined in app.js'
  );
});

test('pushTelemetryEvent not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function pushTelemetryEvent('),
    'pushTelemetryEvent() must not be defined in app.js'
  );
});

test('normalizePercent not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function normalizePercent('),
    'normalizePercent() must not be defined in app.js'
  );
});

test('getFocusedWindowTab not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function getFocusedWindowTab('),
    'getFocusedWindowTab() must not be defined in app.js'
  );
});

test('getOrCreateAppStats not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function getOrCreateAppStats('),
    'getOrCreateAppStats() must not be defined in app.js'
  );
});

test('pushSeriesPoint not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function pushSeriesPoint('),
    'pushSeriesPoint() must not be defined in app.js'
  );
});

test('estimateHeapPercent not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function estimateHeapPercent('),
    'estimateHeapPercent() must not be defined in app.js'
  );
});

test('updateAppStatsSeries not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function updateAppStatsSeries('),
    'updateAppStatsSeries() must not be defined in app.js'
  );
});

test('sparklinePath not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function sparklinePath('),
    'sparklinePath() must not be defined in app.js'
  );
});

test('renderAppMetrics not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function renderAppMetrics('),
    'renderAppMetrics() must not be defined in app.js'
  );
});

test('reportPipelinePhase not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function reportPipelinePhase('),
    'reportPipelinePhase() must not be defined in app.js'
  );
});

test('reportOrchestrationMetrics not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function reportOrchestrationMetrics('),
    'reportOrchestrationMetrics() must not be defined in app.js'
  );
});

test('updateTaskManagerView not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function updateTaskManagerView('),
    'updateTaskManagerView() must not be defined in app.js'
  );
});

// ── Owned by telemetry-ui.js ──
test('telemetry-ui.js owns runtimeTelemetry', () => {
  assert.ok(
    telemetryJs.includes('const runtimeTelemetry = {'),
    'telemetry-ui.js must define runtimeTelemetry'
  );
});

test('telemetry-ui.js owns formatTelemetryModel', () => {
  assert.ok(
    telemetryJs.includes('function formatTelemetryModel('),
    'telemetry-ui.js must define formatTelemetryModel()'
  );
});

test('telemetry-ui.js owns pushTelemetryEvent', () => {
  assert.ok(
    telemetryJs.includes('function pushTelemetryEvent('),
    'telemetry-ui.js must define pushTelemetryEvent()'
  );
});

test('telemetry-ui.js owns normalizePercent', () => {
  assert.ok(
    telemetryJs.includes('function normalizePercent('),
    'telemetry-ui.js must define normalizePercent()'
  );
});

test('telemetry-ui.js owns getFocusedWindowTab', () => {
  assert.ok(
    telemetryJs.includes('function getFocusedWindowTab('),
    'telemetry-ui.js must define getFocusedWindowTab()'
  );
});

test('telemetry-ui.js owns reportPipelinePhase', () => {
  assert.ok(
    telemetryJs.includes('function reportPipelinePhase('),
    'telemetry-ui.js must define reportPipelinePhase()'
  );
});

test('telemetry-ui.js owns reportOrchestrationMetrics', () => {
  assert.ok(
    telemetryJs.includes('function reportOrchestrationMetrics('),
    'telemetry-ui.js must define reportOrchestrationMetrics()'
  );
});

test('telemetry-ui.js owns updateTaskManagerView', () => {
  assert.ok(
    telemetryJs.includes('function updateTaskManagerView('),
    'telemetry-ui.js must define updateTaskManagerView()'
  );
});

// ── Global hooks preserved ──
test('telemetry-ui.js assigns window.reportPipelinePhase', () => {
  assert.ok(
    telemetryJs.includes('window.reportPipelinePhase = reportPipelinePhase'),
    'telemetry-ui.js must assign window.reportPipelinePhase'
  );
});

test('telemetry-ui.js assigns window.reportOrchestrationMetrics', () => {
  assert.ok(
    telemetryJs.includes('window.reportOrchestrationMetrics = reportOrchestrationMetrics'),
    'telemetry-ui.js must assign window.reportOrchestrationMetrics'
  );
});

// ── Script order in index.html ──
test('index.html includes telemetry-ui.js', () => {
  assert.ok(
    indexHtml.includes('<script src="js/apps/core/telemetry-ui.js">'),
    'index.html must include telemetry-ui.js'
  );
});

test('index.html loads telemetry-ui.js after theme-manager.js', () => {
  const themePos = indexHtml.indexOf('js/apps/optional/theme-manager.js');
  const telemetryPos = indexHtml.indexOf('js/apps/core/telemetry-ui.js');
  assert.ok(themePos > -1, 'theme-manager.js must be in index.html');
  assert.ok(telemetryPos > -1, 'telemetry-ui.js must be in index.html');
  assert.ok(
    telemetryPos > themePos,
    'telemetry-ui.js must be loaded after theme-manager.js in index.html'
  );
});
