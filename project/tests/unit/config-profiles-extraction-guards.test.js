// P3-S8 extraction boundary guards — config-profiles.js
// Asserts: redirect comment in app.js, ownership in config-profiles.js, script order in index.html
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '../../client/js/app.js'), 'utf8');
const configProfilesJs = fs.readFileSync(path.join(__dirname, '../../client/js/apps/core/config-profiles.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../../client/index.html'), 'utf8');

// ── Redirect comment exists in app.js ──
test('app.js has P3-S8 redirect comment for config-profiles', () => {
  assert.ok(
    appJs.includes('config-profiles.js (P3-S8)'),
    'app.js should have a P3-S8 redirect comment pointing to config-profiles.js'
  );
});

// ── Removed from app.js ──
test('loadSavedConfig not defined in app.js', () => {
  assert.ok(
    !appJs.includes('async function loadSavedConfig('),
    'loadSavedConfig() must not be defined in app.js'
  );
});

test('getMainConfigFromProfile not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function getMainConfigFromProfile('),
    'getMainConfigFromProfile() must not be defined in app.js'
  );
});

test('hydrateMainProviderInputs not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function hydrateMainProviderInputs('),
    'hydrateMainProviderInputs() must not be defined in app.js'
  );
});

test('persistConfig not defined in app.js', () => {
  assert.ok(
    !appJs.includes('async function persistConfig('),
    'persistConfig() must not be defined in app.js'
  );
});

test('gatherProfile not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function gatherProfile('),
    'gatherProfile() must not be defined in app.js'
  );
});

test('autoSaveConfig not defined in app.js', () => {
  assert.ok(
    !appJs.includes('async function autoSaveConfig('),
    'autoSaveConfig() must not be defined in app.js'
  );
});

test('refreshSavedConfig not defined in app.js', () => {
  assert.ok(
    !appJs.includes('async function refreshSavedConfig('),
    'refreshSavedConfig() must not be defined in app.js'
  );
});

test('saveCurrentProfile not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function saveCurrentProfile('),
    'saveCurrentProfile() must not be defined in app.js'
  );
});

test('loadProfile not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function loadProfile('),
    'loadProfile() must not be defined in app.js'
  );
});

test('deleteProfile not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function deleteProfile('),
    'deleteProfile() must not be defined in app.js'
  );
});

test('renderProfileChips not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function renderProfileChips('),
    'renderProfileChips() must not be defined in app.js'
  );
});

test('OPENROUTER_ROLE_MODELS not defined in app.js', () => {
  assert.ok(
    !appJs.includes('const OPENROUTER_ROLE_MODELS ='),
    'OPENROUTER_ROLE_MODELS must not be defined in app.js'
  );
});

test('RECOMMENDED_MODEL_STACKS not defined in app.js', () => {
  assert.ok(
    !appJs.includes('const RECOMMENDED_MODEL_STACKS ='),
    'RECOMMENDED_MODEL_STACKS must not be defined in app.js'
  );
});

test('OLLAMA_RECOMMENDED_STACKS not defined in app.js', () => {
  assert.ok(
    !appJs.includes('const OLLAMA_RECOMMENDED_STACKS ='),
    'OLLAMA_RECOMMENDED_STACKS must not be defined in app.js'
  );
});

test('RECOMMENDED_PANEL_COPY not defined in app.js', () => {
  assert.ok(
    !appJs.includes('const RECOMMENDED_PANEL_COPY ='),
    'RECOMMENDED_PANEL_COPY must not be defined in app.js'
  );
});

test('refreshRecommendedPanelCopy not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function refreshRecommendedPanelCopy('),
    'refreshRecommendedPanelCopy() must not be defined in app.js'
  );
});

test('showRecommendedPresetProvider not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function showRecommendedPresetProvider('),
    'showRecommendedPresetProvider() must not be defined in app.js'
  );
});

test('showRecommendedSetupTab not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function showRecommendedSetupTab('),
    'showRecommendedSetupTab() must not be defined in app.js'
  );
});

test('applyRecommendedPresetInputs not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function applyRecommendedPresetInputs('),
    'applyRecommendedPresetInputs() must not be defined in app.js'
  );
});

test('applyRecommendedSetupTab not defined in app.js', () => {
  assert.ok(
    !appJs.includes('async function applyRecommendedSetupTab('),
    'applyRecommendedSetupTab() must not be defined in app.js'
  );
});

test('applySettingsOpenRouterSuggestions not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function applySettingsOpenRouterSuggestions('),
    'applySettingsOpenRouterSuggestions() must not be defined in app.js'
  );
});

test('initSettingsModelSuggestions not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function initSettingsModelSuggestions('),
    'initSettingsModelSuggestions() must not be defined in app.js'
  );
});

// ── Owned by config-profiles.js ──
test('config-profiles.js owns loadSavedConfig', () => {
  assert.ok(
    configProfilesJs.includes('async function loadSavedConfig('),
    'config-profiles.js must define loadSavedConfig()'
  );
});

test('config-profiles.js owns getMainConfigFromProfile', () => {
  assert.ok(
    configProfilesJs.includes('function getMainConfigFromProfile('),
    'config-profiles.js must define getMainConfigFromProfile()'
  );
});

test('config-profiles.js owns hydrateMainProviderInputs', () => {
  assert.ok(
    configProfilesJs.includes('function hydrateMainProviderInputs('),
    'config-profiles.js must define hydrateMainProviderInputs()'
  );
});

test('config-profiles.js owns persistConfig', () => {
  assert.ok(
    configProfilesJs.includes('async function persistConfig('),
    'config-profiles.js must define persistConfig()'
  );
});

test('config-profiles.js owns gatherProfile', () => {
  assert.ok(
    configProfilesJs.includes('function gatherProfile('),
    'config-profiles.js must define gatherProfile()'
  );
});

test('config-profiles.js owns autoSaveConfig', () => {
  assert.ok(
    configProfilesJs.includes('async function autoSaveConfig('),
    'config-profiles.js must define autoSaveConfig()'
  );
});

test('config-profiles.js owns refreshSavedConfig', () => {
  assert.ok(
    configProfilesJs.includes('async function refreshSavedConfig('),
    'config-profiles.js must define refreshSavedConfig()'
  );
});

test('config-profiles.js owns saveCurrentProfile', () => {
  assert.ok(
    configProfilesJs.includes('function saveCurrentProfile('),
    'config-profiles.js must define saveCurrentProfile()'
  );
});

test('config-profiles.js owns loadProfile', () => {
  assert.ok(
    configProfilesJs.includes('function loadProfile('),
    'config-profiles.js must define loadProfile()'
  );
});

test('config-profiles.js owns deleteProfile', () => {
  assert.ok(
    configProfilesJs.includes('function deleteProfile('),
    'config-profiles.js must define deleteProfile()'
  );
});

test('config-profiles.js owns renderProfileChips', () => {
  assert.ok(
    configProfilesJs.includes('function renderProfileChips('),
    'config-profiles.js must define renderProfileChips()'
  );
});

test('config-profiles.js owns OPENROUTER_ROLE_MODELS', () => {
  assert.ok(
    configProfilesJs.includes('const OPENROUTER_ROLE_MODELS ='),
    'config-profiles.js must define OPENROUTER_ROLE_MODELS'
  );
});

test('config-profiles.js owns RECOMMENDED_MODEL_STACKS', () => {
  assert.ok(
    configProfilesJs.includes('const RECOMMENDED_MODEL_STACKS ='),
    'config-profiles.js must define RECOMMENDED_MODEL_STACKS'
  );
});

test('config-profiles.js owns OLLAMA_RECOMMENDED_STACKS', () => {
  assert.ok(
    configProfilesJs.includes('const OLLAMA_RECOMMENDED_STACKS ='),
    'config-profiles.js must define OLLAMA_RECOMMENDED_STACKS'
  );
});

test('config-profiles.js owns RECOMMENDED_PANEL_COPY', () => {
  assert.ok(
    configProfilesJs.includes('const RECOMMENDED_PANEL_COPY ='),
    'config-profiles.js must define RECOMMENDED_PANEL_COPY'
  );
});

test('config-profiles.js owns getOpenRouterRolePreset', () => {
  assert.ok(
    configProfilesJs.includes('function getOpenRouterRolePreset('),
    'config-profiles.js must define getOpenRouterRolePreset()'
  );
});

test('config-profiles.js owns initSettingsModelSuggestions', () => {
  assert.ok(
    configProfilesJs.includes('function initSettingsModelSuggestions('),
    'config-profiles.js must define initSettingsModelSuggestions()'
  );
});

// ── Script order in index.html ──
test('index.html loads config-profiles.js', () => {
  assert.ok(
    indexHtml.includes('"js/apps/core/config-profiles.js"'),
    'index.html must include config-profiles.js script tag'
  );
});

test('index.html loads config-profiles.js after setup-ui.js', () => {
  const setupPos = indexHtml.indexOf('"js/apps/core/setup-ui.js"');
  const configPos = indexHtml.indexOf('"js/apps/core/config-profiles.js"');
  assert.ok(setupPos !== -1, 'setup-ui.js must be in index.html');
  assert.ok(configPos !== -1, 'config-profiles.js must be in index.html');
  assert.ok(configPos > setupPos, 'config-profiles.js must load after setup-ui.js');
});

test('index.html loads config-profiles.js before boot.js', () => {
  const configPos = indexHtml.indexOf('"js/apps/core/config-profiles.js"');
  const bootPos = indexHtml.indexOf('"js/boot.js"');
  assert.ok(configPos !== -1, 'config-profiles.js must be in index.html');
  assert.ok(bootPos !== -1, 'boot.js must be in index.html');
  assert.ok(configPos < bootPos, 'config-profiles.js must load before boot.js');
});
