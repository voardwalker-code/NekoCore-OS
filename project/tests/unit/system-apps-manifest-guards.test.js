'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.join(ROOT, 'client', 'js', 'apps', 'system-apps.json');
const SCHEMA_PATH = path.join(ROOT, 'client', 'js', 'apps', 'system-apps.schema.json');
const LEGACY_MANIFEST_PATH = path.join(ROOT, 'client', 'js', 'apps', 'app-manifest.json');
const NON_CORE_MANIFEST_PATH = path.join(ROOT, 'client', 'apps', 'non-core', 'non-core-apps.manifest.json');
const INDEX_PATH = path.join(ROOT, 'client', 'index.html');
const CREATE_PATH = path.join(ROOT, 'client', 'create.html');
const CREATOR_PACKAGE_INDEX_PATH = path.join(ROOT, 'client', 'apps', 'entity-creator', 'index.html');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

const systemManifest = readJson(MANIFEST_PATH);
const schema = readJson(SCHEMA_PATH);
const legacyManifest = readJson(LEGACY_MANIFEST_PATH);
const nonCoreManifest = readJson(NON_CORE_MANIFEST_PATH);
const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
const tabCreatorHtml = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'core', 'tab-creator.html'), 'utf8');
const tabNekocoreHtml = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'core', 'tab-nekocore.html'), 'utf8');
const createHtml = fs.readFileSync(CREATE_PATH, 'utf8');
const creatorPackageIndexHtml = fs.readFileSync(CREATOR_PACKAGE_INDEX_PATH, 'utf8');

test('system-apps manifest and schema exist', () => {
  assert.ok(fs.existsSync(MANIFEST_PATH), 'system-apps.json must exist');
  assert.ok(fs.existsSync(SCHEMA_PATH), 'system-apps.schema.json must exist');
});

test('system-apps schema declares expected manifest title', () => {
  assert.equal(schema.title, 'System Apps Manifest');
  assert.equal(schema.properties.apps.type, 'array');
});

test('system-apps manifest contains expected app ids including installer-managed helloworld', () => {
  const ids = systemManifest.apps.map((app) => app.id);
  const expected = [
    'chat', 'entity', 'creator', 'users', 'browser', 'skills', 'workspace',
    'popouts', 'documents', 'visualizer', 'physical', 'dreamgallery', 'lifediary',
    'dreamdiary', 'helloworld', 'themes', 'settings', 'advanced', 'activity',
    'observability', 'debugcore', 'archive', 'nekocore', 'ma-server',
    'bugtracker', 'resourcemgr', 'qachecklist', 'profiler', 'welcome'
  ];
  assert.deepEqual(ids, expected);
});

test('system-apps manifest includes required B-1 fields for every entry', () => {
  for (const app of systemManifest.apps) {
    assert.equal(typeof app.id, 'string');
    assert.equal(typeof app.name, 'string');
    assert.equal(typeof app.icon, 'string');
    assert.equal(typeof app.sourcePath, 'string');
    assert.equal(typeof app.appType, 'string');
    assert.equal(typeof app.defaultWindow.width, 'number');
    assert.equal(typeof app.defaultWindow.height, 'number');
    assert.equal(typeof app.optional, 'boolean');
    assert.equal(typeof app.launchMode, 'string');
    assert.equal(typeof app.embedded.tabId, 'string');
    assert.equal(typeof app.embedded.target, 'string');
    assert.equal(typeof app.popout.eligible, 'boolean');
    assert.equal(typeof app.ownership, 'object');
  }
});

test('legacy app-manifest entries all exist in system-apps manifest', () => {
  const systemIds = new Set(systemManifest.apps.map((app) => app.id));
  for (const legacyEntry of legacyManifest.apps) {
    assert.ok(systemIds.has(legacyEntry.tabId), `system-apps.json must include legacy tabId "${legacyEntry.tabId}"`);
  }
});

test('non-core mounted tabs map to host paths in system-apps manifest', () => {
  for (const nonCoreEntry of nonCoreManifest.nonCoreApps) {
    const app = systemManifest.apps.find((candidate) => candidate.id === nonCoreEntry.tabId);
    assert.ok(app, `system-apps.json must include non-core tabId "${nonCoreEntry.tabId}"`);
    assert.equal(app.embedded.hostPath, nonCoreEntry.path, `embedded.hostPath must match non-core manifest path for "${nonCoreEntry.tabId}"`);
  }
});

test('system-apps manifest preserves current shell-critical exceptions and shared-source groups', () => {
  const workspace = systemManifest.apps.find((app) => app.id === 'workspace');
  const settings = systemManifest.apps.find((app) => app.id === 'settings');
  const advanced = systemManifest.apps.find((app) => app.id === 'advanced');
  const lifediary = systemManifest.apps.find((app) => app.id === 'lifediary');
  const dreamdiary = systemManifest.apps.find((app) => app.id === 'dreamdiary');

  assert.equal(workspace.sourcePath, 'js/vfs.js');
  assert.equal(settings.ownership.sharedSourceGroup, 'setup-ui');
  assert.equal(advanced.ownership.sharedSourceGroup, 'setup-ui');
  assert.equal(lifediary.ownership.sharedSourceGroup, 'diary');
  assert.equal(dreamdiary.ownership.sharedSourceGroup, 'diary');
});

test('system-apps manifest records installer hooks for helloworld and legacy neural alias note for visualizer', () => {
  const hello = systemManifest.apps.find((app) => app.id === 'helloworld');
  const visualizer = systemManifest.apps.find((app) => app.id === 'visualizer');

  assert.ok(hello.installerHooks, 'helloworld must include installerHooks');
  assert.equal(hello.installerHooks.managed, true);
  assert.equal(hello.installerHooks.createFile, true);
  assert.equal(hello.installerHooks.deleteFile, true);
  assert.deepEqual(hello.installerHooks.entryIds, ['hello-window-001', 'hello-category-001', 'hello-loader-001']);
  assert.ok(visualizer.notes.some((note) => note.includes('data-tab=neural')), 'visualizer must record the legacy neural alias drift');
});

test('system-apps manifest embedded targets remain aligned with current shell hosts', () => {
  const creator = systemManifest.apps.find((app) => app.id === 'creator');
  const nekocore = systemManifest.apps.find((app) => app.id === 'nekocore');

  assert.match(tabCreatorHtml, /id="creatorAppFrame"\s+src="create\.html\?embed=1"/, 'tab-creator.html must host creator via embedded iframe');
  assert.match(tabNekocoreHtml, /id="nekocore-panel-frame"/, 'tab-nekocore.html must host the nekocore iframe shell');
  assert.equal(creator.standalonePath, 'create.html');
  assert.equal(nekocore.standalonePath, 'nekocore.html');
});

test('creator entry keeps compatibility page while package owns C-2 app body and dependencies', () => {
  const creator = systemManifest.apps.find((app) => app.id === 'creator');
  assert.equal(creator.packagePath, 'apps/entity-creator');
  assert.equal(creator.packageEntry, 'apps/entity-creator/index.html');
  assert.equal(creator.sourcePath, 'create.html', 'compatibility sourcePath must remain create.html during C-2');
  assert.equal(creator.ownership.pagePath, 'create.html', 'compatibility page ownership must remain create.html during C-2');

  const packageRoot = path.join(ROOT, 'client', creator.packagePath);
  assert.ok(fs.existsSync(path.join(packageRoot, 'index.html')), 'entity creator package index.html must exist');
  assert.ok(fs.existsSync(path.join(packageRoot, 'entity-creator.css')), 'entity creator package css entry must exist');
  assert.ok(fs.existsSync(path.join(packageRoot, 'entity-creator.js')), 'entity creator package js entry must exist');

  assert.match(createHtml, /window\.location\.replace\(target\);/, 'create.html must redirect to packaged creator runtime');
  assert.match(createHtml, /apps\/entity-creator\/index\.html/, 'create.html compatibility bridge must target package index');
  assert.match(creatorPackageIndexHtml, /<script src="\/shared\/api\.js"><\/script>/, 'packaged creator index must load shared api runtime');
  assert.match(creatorPackageIndexHtml, /<script src="\/js\/create\.js"><\/script>/, 'packaged creator index must load creator controller');
});

test('C-3: entity creator dual-mode operation — mode detection and lifecycle', () => {
  const createJs = fs.readFileSync(path.join(ROOT, 'client', 'js', 'create.js'), 'utf8');
  
  // Mode detection: IS_EMBED flag read from URL parameter
  assert.match(createJs, /const IS_EMBED = PAGE_PARAMS\.get\('embed'\) === '1'/, 'create.js must detect embed mode via url param');
  assert.match(createJs, /const PAGE_PARAMS = new URLSearchParams\(window\.location\.search\)/, 'create.js must parse query string for mode detection');

  // DOMContentLoaded initialization handler
  assert.match(createJs, /document\.addEventListener\('DOMContentLoaded',/, 'create.js must initialize on DOMContentLoaded for single-fire safety');
  
  // Embedded mode styling: topbar hidden, embed-mode class added
  assert.match(createJs, /if \(IS_EMBED\)/, 'create.js must branch on embed mode for setup');
  assert.match(createJs, /document\.body\.classList\.add\('embed-mode'\)/, 'create.js must add embed-mode class when embedded');
  assert.match(createJs, /topbar\.style\.display = 'none'/, 'create.js must hide topbar in embedded mode');
  
  // Navigation branching: goToMain() function behavior
  assert.match(createJs, /function goToMain\(\)/, 'create.js must define goToMain navigation function');
  assert.match(createJs, /if \(IS_EMBED\)\s*\{\s*syncParentAfterCreate\(\);/, 'goToMain must call syncParentAfterCreate in embedded mode');
  assert.match(createJs, /window\.location\.href = '\/index\.html'/, 'goToMain must navigate to shell root in standalone mode');
  
  // Parent sync: cross-frame parent communication
  assert.match(createJs, /function syncParentAfterCreate\(\)/, 'create.js must define parent sync function');
  assert.match(createJs, /if \(!window\.parent \|\| window\.parent === window\) return/, 'syncParentAfterCreate must guard against non-embedded context');
  assert.match(createJs, /const p = window\.parent;/, 'syncParentAfterCreate must reference parent window as local variable');
  assert.match(createJs, /p\.refreshSidebarEntities/, 'syncParentAfterCreate must call parent refresh on creation');
  assert.match(createJs, /p\.closeWindow\('creator'\)/, 'syncParentAfterCreate must close creator window via parent');

  // Success screen mode-aware redirect
  assert.match(createJs, /if \(IS_EMBED\)[\s\S]*?setTimeout\(\(\) => \{ syncParentAfterCreate\(\); \}, 900\)/, 'success screen must trigger parent sync after 900ms in embedded mode');
  assert.match(createJs, /else[\s\S]*?setTimeout\(\(\) => \{ goToMain\(\); \}, 3000\)/, 'success screen must auto-redirect after 3s in standalone mode');
});
