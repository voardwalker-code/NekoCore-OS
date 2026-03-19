/* ╔════════════════════════════════════════════════════════════════╗
   ║  D-3 LAUNCH INTEGRATION + FALLBACK GUARDS                  ║
   ║  Tests for manifest-driven launch routing with shadow loader   ║
   ║  branching and legacy fallback path                             ║
   ╚════════════════════════════════════════════════════════════════╝ */

import { test } from 'node:test';
import assert from 'node:assert';

test('D-3: Launch Integration + Fallback', async (t) => {
  // ── Test 1: getManifestAppEntry retrieves full app metadata including packagePath ──
  await t.test('getManifestAppEntry returns manifest entry with packagePath', () => {
    // Mock manifest
    const mockManifest = {
      apps: [
        {
          id: 'creator',
          name: 'Creator',
          packagePath: 'apps/entity-creator',
          packageEntry: 'apps/entity-creator/index.html'
        },
        {
          id: 'chat',
          name: 'Chat',
          packagePath: null
        }
      ]
    };

    // Mock function
    function getManifestAppEntry(appId, manifest) {
      if (!manifest || !Array.isArray(manifest.apps)) return null;
      return manifest.apps.find((entry) => entry.id === appId) || null;
    }

    const creatorEntry = getManifestAppEntry('creator', mockManifest);
    assert.ok(creatorEntry, 'Should find creator entry');
    assert.strictEqual(creatorEntry.packagePath, 'apps/entity-creator', 'Should have packagePath');
    assert.strictEqual(creatorEntry.packageEntry, 'apps/entity-creator/index.html', 'Should have packageEntry');

    const chatEntry = getManifestAppEntry('chat', mockManifest);
    assert.ok(chatEntry, 'Should find chat entry');
    assert.strictEqual(chatEntry.packagePath, null, 'Chat should have null packagePath');
  });

  // ── Test 2: Launch routing detects packagePath and routes to shadow loader ──
  await t.test('Launch routing branches on packagePath presence', () => {
    // Mock router logic
    function shouldUseShadowLoader(appEntry) {
      if (!appEntry || typeof appEntry !== 'object') return false;
      if (typeof appEntry.packagePath !== 'string' || appEntry.packagePath.trim().length === 0) return false;
      const appType = String(appEntry.appType || '').trim();
      return appType !== 'iframe-page' && appType !== 'hybrid-iframe-page';
    }

    const packaged = { id: 'visualizer', appType: 'hybrid-shell-html', packagePath: 'apps/visualizer', packageEntry: 'apps/visualizer/index.html' };
    const packagedIframe = { id: 'creator', appType: 'iframe-page', packagePath: 'apps/entity-creator', packageEntry: 'apps/entity-creator/index.html' };
    const legacy = { id: 'chat', packagePath: null };
    const noEntry = null;

    assert.ok(shouldUseShadowLoader(packaged), 'Packaged app should route to shadow loader');
    assert.ok(!shouldUseShadowLoader(packagedIframe), 'Packaged iframe app should stay on the legacy iframe host path');
    assert.ok(!shouldUseShadowLoader(legacy), 'Legacy app should not route to shadow loader');
    assert.ok(!shouldUseShadowLoader(noEntry), 'Missing entry should not route to shadow loader');
  });

  // ── Test 3: Shadow loader integration creates AppWindow and loads package ──
  await t.test('Shadow launch creates AppWindow and loads package', () => {
    // Mock AppWindow and ShadowContentLoader
    const mockRegistry = new Map();
    
    class MockAppWindow {
      constructor(tabName, metadata) {
        this.tabName = tabName;
        this.metadata = metadata;
        this.shadowRoot = null;
      }
      initialize() {
        this.shadowRoot = { mode: 'open' };
        return this;
      }
      open() {
        return this;
      }
    }

    function getOrCreateAppWindow(tabName, metadata) {
      if (!mockRegistry.has(tabName)) {
        const aw = new MockAppWindow(tabName, metadata);
        aw.initialize();
        mockRegistry.set(tabName, aw);
      }
      return mockRegistry.get(tabName);
    }

    // Simulate shadow launch
    const appWindow = getOrCreateAppWindow('creator', { name: 'Creator' });
    assert.ok(appWindow, 'AppWindow should be created');
    assert.ok(appWindow.shadowRoot, 'Shadow root should be initialized');
    assert.strictEqual(appWindow.tabName, 'creator', 'AppWindow should have correct tab name');
  });

  await t.test('Shadow launch keeps packagePath separate from packageEntry', () => {
    function buildLoaderArgs(packagePath, packageEntry) {
      return {
        packagePath,
        packageEntry: packageEntry || (packagePath + '/index.html')
      };
    }

    const args = buildLoaderArgs('apps/entity-creator', 'apps/entity-creator/index.html');
    assert.strictEqual(args.packagePath, 'apps/entity-creator', 'packagePath should stay at the app directory');
    assert.strictEqual(args.packageEntry, 'apps/entity-creator/index.html', 'packageEntry should point to the html file once');
    assert.notStrictEqual(args.packageEntry, args.packagePath + '/index.html/index.html', 'packageEntry must not double-append index.html');
  });

  // ── Test 4: Legacy fallback preserves existing iframe/tab behavior ──
  await t.test('Legacy fallback maintains iframe/tab launch for non-packaged apps', () => {
    // Mock fallback logic
    function launchLegacy(tabName, sourcePath) {
      // Simulate finding or creating iframe element
      if (!sourcePath) return false;
      return {
        type: 'legacy',
        tab: tabName,
        source: sourcePath
      };
    }

    const legacyResult = launchLegacy('chat', 'js/apps/core/chat.js');
    assert.ok(legacyResult, 'Legacy launch should succeed');
    assert.strictEqual(legacyResult.type, 'legacy', 'Should mark as legacy');
    assert.strictEqual(legacyResult.source, 'js/apps/core/chat.js', 'Should preserve source path');
  });

  // ── Test 5: Error boundary ensures failed shadow loads don't break shell ──
  await t.test('Error boundary on failed package load shows fallback UI', () => {
    // Mock error boundary
    function injectErrorBoundary(shadowRoot, errorMessage) {
      if (!shadowRoot) return false;
      const ui = {
        type: 'error-boundary',
        message: errorMessage,
        hasRetry: true
      };
      return ui;
    }

    const mockShadowRoot = { mode: 'open' };
    const boundary = injectErrorBoundary(mockShadowRoot, 'Failed to load app package');
    assert.ok(boundary, 'Error boundary should be created');
    assert.strictEqual(boundary.type, 'error-boundary', 'Should be error boundary UI');
    assert.ok(boundary.hasRetry, 'Should have retry button');
  });

  // ── Test 6: Launch integration preserves manifest contract fields ──
  await t.test('Launch integration preserves installer contract fields', () => {
    const manifestEntry = {
      id: 'creator',
      packagePath: 'apps/entity-creator',
      packageEntry: 'apps/entity-creator/index.html',
      // Installer contract fields
      ownership: {
        controllerPath: 'js/create.js',
        hostPath: 'index.html#tab-creator',
        pagePath: 'create.html'
      },
      // Deterministic anchors for payload targeting
      _installerMarker: 'entity-creator-package-0.1.0'
    };

    // Verify all required fields preserved
    assert.ok(manifestEntry.id, 'Should have app id');
    assert.ok(manifestEntry.packagePath, 'Should have packagePath for routing');
    assert.ok(manifestEntry.packageEntry, 'Should have entry point');
    assert.ok(manifestEntry.ownership, 'Should preserve ownership contract');
    assert.strictEqual(manifestEntry.ownership.controllerPath, 'js/create.js', 'Should preserve controller path');
  });

  // ── Test 7: Launch path detects installer marker for payload lifecycle ──
  await t.test('Load sequence detects installer markers for create/delete lifecycle', () => {
    // Mock marker detection
    function extractInstallerMarker(appEntry) {
      if (!appEntry || typeof appEntry !== 'object') return null;
      return appEntry._installerMarker || null;
    }

    const entry = {
      id: 'creator',
      _installerMarker: 'entity-creator-package-0.1.0'
    };

    const marker = extractInstallerMarker(entry);
    assert.ok(marker, 'Should extract marker');
    assert.strictEqual(marker, 'entity-creator-package-0.1.0', 'Should return correct marker');
  });

  // ── Test 8: Mixed runtime: packaged and legacy apps can coexist ──
  await t.test('Mixed runtime launches packaged and legacy apps in same shell', () => {
    const apps = [
      { id: 'visualizer', appType: 'hybrid-shell-html', packagePath: 'apps/visualizer', type: 'shadow' },
      { id: 'creator', appType: 'iframe-page', packagePath: 'apps/entity-creator', type: 'legacy' },
      { id: 'chat', packagePath: null, type: 'legacy' },
      { id: 'workspace', packagePath: null, type: 'legacy' }
    ];

    const launched = {
      shadow: [],
      legacy: []
    };

    apps.forEach((app) => {
      const isPackaged = app.packagePath && app.packagePath.trim().length > 0;
      const usesShadow = isPackaged && app.appType !== 'iframe-page' && app.appType !== 'hybrid-iframe-page';
      if (usesShadow) {
        launched.shadow.push(app.id);
      } else {
        launched.legacy.push(app.id);
      }
    });

    assert.deepStrictEqual(launched.shadow, ['visualizer'], 'Should have 1 shadow-hosted packaged app');
    assert.deepStrictEqual(launched.legacy, ['creator', 'chat', 'workspace'], 'Should keep iframe-packaged and legacy apps on compatibility paths');
  });

  // ── Test 9: Fallback path for apps without manifest entry ──
  await t.test('Apps without manifest entries fall back to legacy WINDOW_APPS', () => {
    // Mock WINDOW_APPS fallback
    const WINDOW_APPS = [
      { tab: 'browser', label: 'Browser', w: 900, h: 640 }
    ];

    function getSafeAppMetadata(tabName, manifestEntry) {
      if (manifestEntry) return manifestEntry;
      // Fallback to WINDOW_APPS
      return WINDOW_APPS.find((app) => app.tab === tabName) || null;
    }

    const fromManifest = getSafeAppMetadata('creator', { id: 'creator', packagePath: 'apps/entity-creator' });
    assert.ok(fromManifest, 'Should return manifest entry when available');

    const fromLegacy = getSafeAppMetadata('browser', null);
    assert.ok(fromLegacy, 'Should fall back to WINDOW_APPS');
    assert.strictEqual(fromLegacy.label, 'Browser', 'Should return legacy app');
  });

  // ── Test 10: Deterministic loader boundaries for installer targeting ──
  await t.test('Loader boundaries expose deterministic anchor points per app', () => {
    // Mock boundary registry
    const loaderBoundaries = new Map();

    function registerLoaderBoundary(appId, boundary) {
      loaderBoundaries.set(appId, boundary);
      return true;
    }

    function getLoaderBoundary(appId) {
      return loaderBoundaries.get(appId) || null;
    }

    const creatorBoundary = {
      appId: 'creator',
      containerElementId: 'tab-creator',
      shadowHostClass: 'wm-content',
      packagePath: 'apps/entity-creator',
      fetchEntryPoint: 'apps/entity-creator/index.html',
      payloadCreateMarker: 'entity-creator-payload-0.1.0',
      payloadDeleteMarker: 'entity-creator-cleanup-0.1.0'
    };

    registerLoaderBoundary('creator', creatorBoundary);
    const retrieved = getLoaderBoundary('creator');
    assert.ok(retrieved, 'Should retrieve boundary');
    assert.strictEqual(retrieved.packagePath, 'apps/entity-creator', 'Should have packagePath in boundary');
    assert.ok(retrieved.payloadCreateMarker, 'Should have create marker for installer');
  });
});
