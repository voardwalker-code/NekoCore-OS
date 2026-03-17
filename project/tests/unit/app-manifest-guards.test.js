'use strict';

// ============================================================
// A1-1 — App Manifest Consistency Guards
//
// Validates that app-manifest.json covers all known WINDOW_APPS
// tabs and that classification and path structure are internally
// consistent. Refined further in D1-0 registry audit.
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.join(ROOT, 'client', 'js', 'apps', 'app-manifest.json');

// Canonical list of expected tab IDs drawn from WINDOW_APPS in app.js
const EXPECTED_TAB_IDS = [
  'chat', 'entity', 'creator', 'users', 'browser', 'skills', 'workspace',
  'documents', 'visualizer', 'physical', 'dreamgallery', 'lifediary',
  'dreamdiary', 'themes', 'settings', 'advanced', 'activity', 'observability',
  'debugcore', 'nekocore'
];

const VALID_CLASSES = ['core', 'optional'];

let manifest;

test('app-manifest.json exists at js/apps/app-manifest.json', () => {
  assert.ok(fs.existsSync(MANIFEST_PATH), 'app-manifest.json must exist at js/apps/app-manifest.json');
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
});

test('manifest contains an apps array with entries', () => {
  assert.ok(Array.isArray(manifest.apps), 'manifest must have an apps array');
  assert.ok(manifest.apps.length > 0, 'manifest apps array must be non-empty');
});

test('manifest covers all 20 expected WINDOW_APPS tab IDs', () => {
  const manifestIds = manifest.apps.map(a => a.tabId);
  for (const expectedId of EXPECTED_TAB_IDS) {
    assert.ok(
      manifestIds.includes(expectedId),
      `manifest must include tabId "${expectedId}" from WINDOW_APPS`
    );
  }
  assert.strictEqual(
    manifest.apps.length,
    EXPECTED_TAB_IDS.length,
    `manifest must have exactly ${EXPECTED_TAB_IDS.length} entries — one per WINDOW_APPS tab`
  );
});

test('every manifest entry has a valid class (core or optional)', () => {
  for (const app of manifest.apps) {
    assert.ok(
      VALID_CLASSES.includes(app.class),
      `tabId "${app.tabId}" must have class "core" or "optional", got "${app.class}"`
    );
  }
});

test('every manifest entry has a non-empty sourcePath', () => {
  for (const app of manifest.apps) {
    assert.ok(
      typeof app.sourcePath === 'string' && app.sourcePath.length > 0,
      `tabId "${app.tabId}" must have a non-empty sourcePath`
    );
  }
});

test('every manifest entry has a bootstrapCritical boolean', () => {
  for (const app of manifest.apps) {
    assert.strictEqual(
      typeof app.bootstrapCritical,
      'boolean',
      `tabId "${app.tabId}" must have a boolean bootstrapCritical field`
    );
  }
});

test('manifest JS sourcePaths that exist on disk are at expected locations', () => {
  for (const app of manifest.apps) {
    if (!app.sourcePath.endsWith('.js')) continue; // skip html iframe entries
    const absPath = path.join(ROOT, 'client', app.sourcePath);
    assert.ok(
      fs.existsSync(absPath),
      `manifest sourcePath "${app.sourcePath}" for tabId "${app.tabId}" must exist on disk`
    );
  }
});

test('core apps total matches expected count (10 core)', () => {
  const coreApps = manifest.apps.filter(a => a.class === 'core');
  assert.strictEqual(coreApps.length, 10, 'manifest must classify exactly 10 apps as core');
});

test('optional apps total matches expected count (10 optional)', () => {
  const optionalApps = manifest.apps.filter(a => a.class === 'optional');
  assert.strictEqual(optionalApps.length, 10, 'manifest must classify exactly 10 apps as optional');
});
