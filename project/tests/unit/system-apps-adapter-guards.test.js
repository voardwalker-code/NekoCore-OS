// ── Tests · System Apps Adapter Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:fs, node:path,
// ../../client/js/apps/system-apps-adapter.js. Keep import and call-site
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
const ADAPTER_PATH = path.join(ROOT, 'client', 'js', 'apps', 'system-apps-adapter.js');
const INDEX_PATH = path.join(ROOT, 'client', 'index.html');
const APP_PATH = path.join(ROOT, 'client', 'js', 'app.js');

const adapterSrc = fs.readFileSync(ADAPTER_PATH, 'utf8');
const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
const appJs = fs.readFileSync(APP_PATH, 'utf8');

const SystemAppsAdapter = require('../../client/js/apps/system-apps-adapter.js');

test('system-apps-adapter.js exists and exports compatibility functions', () => {
  assert.ok(fs.existsSync(ADAPTER_PATH), 'system-apps-adapter.js must exist');
  assert.equal(typeof SystemAppsAdapter.applyCompatToLegacy, 'function');
  assert.equal(typeof SystemAppsAdapter.applyCompat, 'function');
  assert.equal(typeof SystemAppsAdapter.resolveWindowApps, 'function');
  assert.equal(SystemAppsAdapter.MANIFEST_PATH, 'js/apps/system-apps.json');
});

test('safeParseJson tolerates BOM-prefixed manifest text', () => {
  const parsed = SystemAppsAdapter.safeParseJson('\uFEFF{"version":"1.0.0","apps":[]}');
  assert.equal(parsed.version, '1.0.0');
  assert.deepEqual(parsed.apps, []);
});

test('applyCompatToLegacy overlays label and default window size from system manifest', () => {
  const legacy = [{ tab: 'chat', label: 'Old Chat', w: 100, h: 100, icon: '<svg></svg>' }];
  const categories = { chat: 'core' };
  const manifest = {
    version: '1.0.0',
    apps: [
      {
        id: 'chat',
        name: 'Chat',
        icon: 'WINDOW_APPS:inline-svg',
        sourcePath: 'js/apps/core/chat.js',
        appType: 'shell-inline',
        defaultWindow: { width: 980, height: 680 },
        standalonePath: null,
        optional: false,
        launchMode: 'both',
        embedded: { tabId: 'chat', target: '#tab-chat' },
        popout: { eligible: true },
        ownership: { controllerPath: 'js/apps/core/chat.js', hostPath: 'index.html#tab-chat' }
      }
    ]
  };

  const result = SystemAppsAdapter.applyCompatToLegacy(legacy, categories, manifest);

  assert.equal(result.ok, true);
  assert.equal(result.touched, 1);
  assert.equal(legacy[0].label, 'Chat');
  assert.equal(legacy[0].w, 980);
  assert.equal(legacy[0].h, 680);
  assert.equal(legacy[0].icon, '<svg></svg>', 'compat mode must not overwrite placeholder icon-hint values');
});

test('applyCompatToLegacy is non-destructive when manifest is missing or invalid', () => {
  const legacy = [{ tab: 'chat', label: 'Chat', w: 980, h: 680 }];
  const original = JSON.parse(JSON.stringify(legacy));

  const missing = SystemAppsAdapter.applyCompatToLegacy(legacy, {}, null);
  assert.equal(missing.ok, false);
  assert.deepEqual(legacy, original);
});

test('resolveWindowApps returns manifest-ordered launcher list in compatibility mode', () => {
  const legacy = [
    { tab: 'entity', label: 'Entity', w: 820, h: 620, icon: '<svg></svg>', accent: 'gold' },
    { tab: 'chat', label: 'Chat', w: 980, h: 680, icon: '<svg></svg>', accent: 'green' }
  ];
  const manifest = {
    version: '1.0.0',
    apps: [
      {
        id: 'chat', name: 'Chat', icon: 'WINDOW_APPS:inline-svg', sourcePath: 'js/apps/core/chat.js',
        appType: 'shell-inline', defaultWindow: { width: 900, height: 600 }, standalonePath: null,
        optional: false, launchMode: 'both', embedded: { tabId: 'chat', target: '#tab-chat' },
        popout: { eligible: true }, ownership: { controllerPath: 'js/apps/core/chat.js', hostPath: 'index.html#tab-chat' }
      },
      {
        id: 'entity', name: 'Entity', icon: 'WINDOW_APPS:inline-svg', sourcePath: 'js/apps/core/entity-ui.js',
        appType: 'shell-inline', defaultWindow: { width: 810, height: 610 }, standalonePath: null,
        optional: false, launchMode: 'both', embedded: { tabId: 'entity', target: '#tab-entity' },
        popout: { eligible: true }, ownership: { controllerPath: 'js/apps/core/entity-ui.js', hostPath: 'index.html#tab-entity' }
      }
    ]
  };

  const resolved = SystemAppsAdapter.resolveWindowApps(legacy, { manifest, preferManifest: true });
  assert.deepEqual(resolved.map((app) => app.tab), ['chat', 'entity']);
  assert.equal(resolved[0].w, 900);
  assert.equal(resolved[1].h, 610);
  assert.equal(resolved[0].icon, '<svg></svg>', 'resolveWindowApps must preserve legacy renderable icons in compatibility mode');
});

test('resolveWindowApps falls back to legacy list when manifest is unavailable', () => {
  const legacy = [{ tab: 'chat', label: 'Chat', w: 980, h: 680 }];
  const resolved = SystemAppsAdapter.resolveWindowApps(legacy, { manifest: null, preferManifest: true });
  assert.strictEqual(resolved, legacy, 'resolveWindowApps must return original list when manifest is missing');
});

test('index.html loads system-apps-adapter.js before app.js for compatibility bootstrap', () => {
  const scriptSrcs = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
  const adapterIndex = scriptSrcs.indexOf('js/apps/system-apps-adapter.js');
  const appIndex = scriptSrcs.indexOf('js/app.js');

  assert.notEqual(adapterIndex, -1, 'index.html must include js/apps/system-apps-adapter.js');
  assert.notEqual(appIndex, -1, 'index.html must include js/app.js');
  assert.ok(adapterIndex < appIndex, 'system-apps adapter must load before app.js');
});

test('app.js applies compatibility adapter and exposes status marker', () => {
  assert.match(appJs, /SystemAppsAdapter\.applyCompat\(/, 'app.js must call SystemAppsAdapter.applyCompat');
  assert.match(appJs, /window\.__systemAppsCompatStatus = systemAppsCompatStatus;/, 'app.js must expose adapter status');
});

test('adapter source keeps legacy fallback behavior and avoids throw-on-failure bootstrap', () => {
  assert.match(adapterSrc, /return \{ ok: false, reason: 'manifest-unavailable', path: MANIFEST_PATH \};/);
  assert.match(adapterSrc, /function resolveWindowApps\(windowApps, options\)/);
  assert.match(adapterSrc, /Keep legacy behavior on read errors\./);
});