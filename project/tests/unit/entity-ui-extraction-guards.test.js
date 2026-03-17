'use strict';

// ============================================================
// P3-S14 — Entity UI Extraction Guards
// Locks the ownership boundary after entity browser/checkout/
// release/delete UI flows are moved from app.js to entity-ui.js.
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT        = path.resolve(__dirname, '..', '..');
const ENTITY_UI   = path.join(ROOT, 'client', 'js', 'apps', 'core', 'entity-ui.js');
const APP_JS      = path.join(ROOT, 'client', 'js', 'app.js');
const INDEX_HTML  = path.join(ROOT, 'client', 'index.html');

function read(filePath) { return fs.readFileSync(filePath, 'utf8'); }
function has(src, sig)  { return src.includes(sig); }

// ============================================================
// 1. Functions that MUST be in entity-ui.js
// ============================================================

test('entity-ui.js owns avatar helper: deriveEntityAvatar', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function deriveEntityAvatar('), 'entity-ui.js must define deriveEntityAvatar()');
});

test('entity-ui.js owns display helper: setEntityDisplay', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function setEntityDisplay('), 'entity-ui.js must define setEntityDisplay()');
});

test('entity-ui.js owns sidebar chip builder: buildEntityChip', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function buildEntityChip(entity)'), 'entity-ui.js must define buildEntityChip()');
});

test('entity-ui.js owns entity browser renderer: renderEntityBrowser', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function renderEntityBrowser(entities)'), 'entity-ui.js must define renderEntityBrowser()');
});

test('entity-ui.js owns entity window content loader: ensureEntityWindowContent', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function ensureEntityWindowContent('), 'entity-ui.js must define ensureEntityWindowContent()');
});

test('entity-ui.js owns sidebar entity refresh: refreshSidebarEntities', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function refreshSidebarEntities()'), 'entity-ui.js must define refreshSidebarEntities()');
});

test('entity-ui.js owns entity preview: sidebarSelectEntity', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function sidebarSelectEntity('), 'entity-ui.js must define sidebarSelectEntity()');
});

test('entity-ui.js owns entity checkout: checkoutEntity', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function checkoutEntity('), 'entity-ui.js must define checkoutEntity()');
});

test('entity-ui.js owns info panel toggle: toggleEntityInfoPanel', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function toggleEntityInfoPanel()'), 'entity-ui.js must define toggleEntityInfoPanel()');
});

test('entity-ui.js owns info panel renderer: renderEntityInfoPanel', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function renderEntityInfoPanel('), 'entity-ui.js must define renderEntityInfoPanel()');
});

test('entity-ui.js owns relationship detail toggle: _toggleRelDetail', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function _toggleRelDetail('), 'entity-ui.js must define _toggleRelDetail()');
});

test('entity-ui.js owns entity release: releaseActiveEntity', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function releaseActiveEntity()'), 'entity-ui.js must define releaseActiveEntity()');
});

test('entity-ui.js owns entity delete (sidebar): sidebarDeleteEntity', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function sidebarDeleteEntity('), 'entity-ui.js must define sidebarDeleteEntity()');
});

test('entity-ui.js owns entity list loader: loadEntityList', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function loadEntityList()'), 'entity-ui.js must define loadEntityList()');
});

test('entity-ui.js owns settings entity selector: selectEntity', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'async function selectEntity('), 'entity-ui.js must define selectEntity()');
});

test('entity-ui.js owns entity card display updater: updateEntityDisplay', () => {
  const src = read(ENTITY_UI);
  assert.ok(has(src, 'function updateEntityDisplay(entity)'), 'entity-ui.js must define updateEntityDisplay()');
});

// ============================================================
// 2. Functions that MUST NOT be in app.js after P3-S14
// ============================================================

test('app.js does NOT define buildEntityChip', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'function buildEntityChip(entity)'), 'buildEntityChip() must NOT remain in app.js');
});

test('app.js does NOT define renderEntityBrowser', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'function renderEntityBrowser(entities)'), 'renderEntityBrowser() must NOT remain in app.js');
});

test('app.js does NOT define refreshSidebarEntities', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'async function refreshSidebarEntities()'), 'refreshSidebarEntities() must NOT remain in app.js');
});

test('app.js does NOT define checkoutEntity', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'async function checkoutEntity('), 'checkoutEntity() must NOT remain in app.js');
});

test('app.js does NOT define releaseActiveEntity', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'async function releaseActiveEntity()'), 'releaseActiveEntity() must NOT remain in app.js');
});

test('app.js does NOT define sidebarDeleteEntity', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'async function sidebarDeleteEntity('), 'sidebarDeleteEntity() must NOT remain in app.js');
});

test('app.js does NOT define renderEntityInfoPanel', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'function renderEntityInfoPanel('), 'renderEntityInfoPanel() must NOT remain in app.js');
});

test('app.js does NOT define deriveEntityAvatar', () => {
  const src = read(APP_JS);
  assert.ok(!has(src, 'function deriveEntityAvatar('), 'deriveEntityAvatar() must NOT remain in app.js');
});

// ============================================================
// 3. Functions that MUST stay in app.js (permanent — not entity UI)
// ============================================================

test('app.js retains shell bridge: resetChatForEntitySwitch', () => {
  const src = read(APP_JS);
  assert.ok(has(src, 'function resetChatForEntitySwitch('), 'resetChatForEntitySwitch() must remain in app.js');
});

test('app.js retains nav sync helpers: syncNavSidebarProfiles', () => {
  const src = read(APP_JS);
  assert.ok(has(src, 'function syncNavSidebarProfiles()'), 'syncNavSidebarProfiles() must remain in app.js');
});

test('app.js retains nav sync helpers: syncNavSidebarEntities', () => {
  const src = read(APP_JS);
  assert.ok(has(src, 'function syncNavSidebarEntities()'), 'syncNavSidebarEntities() must remain in app.js');
});

test('app.js retains tab switcher: switchMainTab', () => {
  const src = read(APP_JS);
  assert.ok(has(src, 'function switchMainTab('), 'switchMainTab() must remain in app.js');
});

// ============================================================
// 4. Script load order in index.html
// ============================================================

test('index.html loads entity-ui.js after users-ui.js', () => {
  const src = read(INDEX_HTML);
  const usersIdx  = src.indexOf('js/apps/core/users-ui.js');
  const entityIdx = src.indexOf('js/apps/core/entity-ui.js');
  assert.ok(usersIdx !== -1, 'index.html must include users-ui.js');
  assert.ok(entityIdx !== -1, 'index.html must include entity-ui.js');
  assert.ok(usersIdx < entityIdx, 'entity-ui.js must load after users-ui.js (depends on _FEELING_EMOJI + usersAppRefresh)');
});

test('index.html loads entity-ui.js after setup-ui.js', () => {
  const src = read(INDEX_HTML);
  const setupIdx  = src.indexOf('js/apps/core/setup-ui.js');
  const entityIdx = src.indexOf('js/apps/core/entity-ui.js');
  assert.ok(setupIdx !== -1, 'index.html must include setup-ui.js');
  assert.ok(entityIdx !== -1, 'index.html must include entity-ui.js');
  assert.ok(setupIdx < entityIdx, 'entity-ui.js must load after setup-ui.js (depends on guardEntityOperation)');
});
