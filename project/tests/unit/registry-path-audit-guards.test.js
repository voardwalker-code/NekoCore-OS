// ── Tests · Registry Path Audit Guards.Test ────────────────────────────────────────────────────
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
// D1-0 — Registry-Path Consistency Audit Guards
//
// Verifies that the app registry (WINDOW_APPS), manifest, and
// index.html script load list remain aligned after all B1 + C1
// migrations. Detects folder-ownership drift, flat-path
// regressions, and manifest-to-html coverage gaps.
//
// Axioms:
//   • Core JS modules  → js/apps/core/
//   • Optional JS modules → js/apps/optional/
//   • Exceptions: creator (create.html iframe), nekocore
//     (nekocore.html iframe), workspace (js/vfs.js shell-critical)
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.join(ROOT, 'client', 'js', 'apps', 'app-manifest.json');
const INDEX_HTML   = path.join(ROOT, 'client', 'index.html');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const indexSrc  = fs.readFileSync(INDEX_HTML, 'utf8');

// All <script src="..."> values in load order
const SCRIPT_SRCS = [...indexSrc.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);

// Tabs whose sourcePath is an .html iframe host (no <script src> in index.html)
const IFRAME_SOURCE_TABS = new Set(['creator', 'nekocore']);

// The one documented flat-path exception (shell-critical vfs bootstrap)
const VFS_FLAT_EXCEPTION = 'workspace';

// ── Folder ownership: core JS modules ───────────────────────

test('all core JS modules have sourcePath under js/apps/core/', () => {
  const coreApps = manifest.apps.filter(
    a => a.class === 'core' && !IFRAME_SOURCE_TABS.has(a.tabId)
  );
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const app of coreApps) {
    assert.ok(
      app.sourcePath.startsWith('js/apps/core/'),
      `Core tabId "${app.tabId}" sourcePath must start with "js/apps/core/", got "${app.sourcePath}"`
    );
  }
});

test('iframe-hosted core tabs (creator, nekocore) use .html sourcePaths', () => {
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const tabId of IFRAME_SOURCE_TABS) {
    const entry = manifest.apps.find(a => a.tabId === tabId);
    assert.ok(entry, `manifest must contain tabId "${tabId}"`);
    assert.ok(
      entry.sourcePath.endsWith('.html'),
      `iframe-hosted tabId "${tabId}" sourcePath must end with .html, got "${entry.sourcePath}"`
    );
  }
});

// ── Folder ownership: optional JS modules ───────────────────

test('all optional JS modules have sourcePath under js/apps/optional/ (workspace vfs.js excepted)', () => {
  const optionalApps = manifest.apps.filter(
    a => a.class === 'optional' && a.tabId !== VFS_FLAT_EXCEPTION
  );
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const app of optionalApps) {
    assert.ok(
      app.sourcePath.startsWith('js/apps/optional/'),
      `Optional tabId "${app.tabId}" sourcePath must start with "js/apps/optional/", got "${app.sourcePath}"`
    );
  }
});

test('workspace tab vfs.js remains flat (shell-critical exception documented)', () => {
  const workspace = manifest.apps.find(a => a.tabId === 'workspace');
  assert.ok(workspace, 'manifest must contain workspace tab entry');
  assert.strictEqual(
    workspace.sourcePath,
    'js/vfs.js',
    'workspace sourcePath must remain "js/vfs.js" — shell-critical flat exception'
  );
});

// ── index.html coverage: all non-iframe JS modules present ──

test('every non-iframe non-workspace manifest JS sourcePath appears as <script src> in index.html', () => {
  const jsSources = manifest.apps.filter(
    a => !IFRAME_SOURCE_TABS.has(a.tabId) && a.sourcePath.endsWith('.js') && a.tabId !== VFS_FLAT_EXCEPTION
  );
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const app of jsSources) {
    assert.ok(
      SCRIPT_SRCS.some(s => s.includes(app.sourcePath)),
      `manifest sourcePath "${app.sourcePath}" (tabId "${app.tabId}") must appear as script src in index.html`
    );
  }
});

test('workspace vfs.js appears as <script src> in index.html', () => {
  assert.ok(
    SCRIPT_SRCS.some(s => s.includes('js/vfs.js')),
    'js/vfs.js must appear as script src in index.html'
  );
});

// ── Flat-path regression guards: core modules ───────────────

const CORE_MODULE_FILENAMES = [
  'chat.js', 'entity-ui.js', 'users-ui.js', 'setup-ui.js',
  'config-profiles.js', 'simple-provider.js', 'system-health.js',
  'telemetry-ui.js', 'debug-core-app.js'
];

test('no core module filename loads from flat js/ root in index.html', () => {
  for (const filename of CORE_MODULE_FILENAMES) {
    const flatPattern = `src="js/${filename}"`;
    assert.ok(
      !indexSrc.includes(flatPattern),
      `index.html must NOT load core module "${filename}" from flat js/ path — must use js/apps/core/`
    );
  }
});

// ── Flat-path regression guards: optional modules ───────────

const OPTIONAL_MODULE_FILENAMES = [
  'diary.js', 'theme-manager.js', 'physical-ui.js', 'visualizer-ui.js',
  'browser-app.js', 'document-digest.js', 'skills-ui.js', 'dream-gallery.js',
  'popout-manager.js'
];

test('no optional module filename loads from flat js/ root in index.html', () => {
  for (const filename of OPTIONAL_MODULE_FILENAMES) {
    const flatPattern = `src="js/${filename}"`;
    assert.ok(
      !indexSrc.includes(flatPattern),
      `index.html must NOT load optional module "${filename}" from flat js/ path — must use js/apps/optional/`
    );
  }
});

// ── On-disk existence: all migrated modules live in right folder ─

test('all core JS module paths exist on disk under js/apps/core/', () => {
  const coreApps = manifest.apps.filter(
    a => a.class === 'core' && !IFRAME_SOURCE_TABS.has(a.tabId)
  );
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const app of coreApps) {
    const absPath = path.join(ROOT, 'client', app.sourcePath);
    assert.ok(
      fs.existsSync(absPath),
      `Core tabId "${app.tabId}" source "${app.sourcePath}" must exist on disk at ${absPath}`
    );
  }
});

test('all optional JS module paths exist on disk (workspace vfs.js excepted)', () => {
  const optionalApps = manifest.apps.filter(
    a => a.class === 'optional' && a.tabId !== VFS_FLAT_EXCEPTION
  );
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const app of optionalApps) {
    const absPath = path.join(ROOT, 'client', app.sourcePath);
    assert.ok(
      fs.existsSync(absPath),
      `Optional tabId "${app.tabId}" source "${app.sourcePath}" must exist on disk at ${absPath}`
    );
  }
});

// ── index.html contains no stale legacy-path references ─────

test('index.html script list has no duplicate src entries', () => {
  const localScripts = SCRIPT_SRCS.filter(s => !s.startsWith('http'));
  const seen = new Set();
  // for()
  // WHAT THIS DOES: for is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call for(...) where this helper behavior is needed.
  for (const src of localScripts) {
    assert.ok(!seen.has(src), `Duplicate script src "${src}" found in index.html`);
    seen.add(src);
  }
});

test('total non-shared local script count in index.html matches known module inventory', () => {
  // Count scripts under js/ (excludes shared/ and neural-viz/ sub-scripts, includes boot.js)
  const jsScripts = SCRIPT_SRCS.filter(s => s.startsWith('js/') && !s.includes('http'));
  // Expected: app.js, desktop.js, window-manager.js, vfs.js, context-menu.js,
  //           auth.js, pipeline.js, memory-ui.js, sleep.js, boot.js
  //         + 9 core apps + 9 optional apps = 28 total
  assert.ok(
    jsScripts.length >= 28,
    `Expected at least 28 js/ local scripts in index.html, found ${jsScripts.length}`
  );
});
