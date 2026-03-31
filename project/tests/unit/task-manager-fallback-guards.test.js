// ── Tests · Task Manager Fallback Guards.Test ────────────────────────────────────────────────────
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
const telemetrySrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'apps', 'core', 'telemetry-ui.js'), 'utf8');
const tabActivityHtmlSrc = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'core', 'tab-activity.html'), 'utf8');

test('task manager telemetry falls back to saved profile provider and models', () => {
  assert.match(telemetrySrc, /function getSavedTaskManagerConfigs\(\)/, 'telemetry-ui.js must expose a saved-profile fallback helper for Task Manager');
  assert.match(telemetrySrc, /const providerConfig = activeConfig \|\| savedConfigs\.main \|\| null;/, 'updateTaskManagerView must fall back to the saved main config');
  assert.match(telemetrySrc, /models\.subconscious \|\| fallbackModels\.subconscious/, 'Task Manager subconscious model must fall back to saved config');
  assert.match(telemetrySrc, /models\.dream \|\| fallbackModels\.dream/, 'Task Manager dream model must fall back to saved config');
  assert.match(telemetrySrc, /models\.conscious \|\| fallbackModels\.conscious/, 'Task Manager conscious model must fall back to saved config');
  assert.match(telemetrySrc, /models\.orchestrator \|\| fallbackModels\.orchestrator/, 'Task Manager orchestrator model must fall back to saved config');
});

test('task manager headings and placeholders no longer render broken icon glyphs', () => {
  assert.match(tabActivityHtmlSrc, /&#128187; Task Manager/, 'tab-activity.html must render the Task Manager heading with a proper icon');
  assert.match(tabActivityHtmlSrc, /tmTokensBreakdown">In: 0 • Out: 0</, 'tab-activity.html must render the token separator correctly');
  assert.match(tabActivityHtmlSrc, /id="tmModelSub">—</, 'tab-activity.html must render a clean fallback dash for Task Manager models');
  assert.match(tabActivityHtmlSrc, /&#127760; Browser Status/, 'tab-activity.html must render the Browser Status heading with a proper icon');
});