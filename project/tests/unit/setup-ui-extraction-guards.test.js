// ── Tests · Setup Ui Extraction Guards.Test ────────────────────────────────────────────────────
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

// P3-S7 extraction boundary guards — setup-ui.js
// Asserts: redirect comment in app.js, ownership in setup-ui.js, script order in index.html
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '../../client/js/app.js'), 'utf8');
const setupUiJs = fs.readFileSync(path.join(__dirname, '../../client/js/apps/core/setup-ui.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../../client/index.html'), 'utf8');

// ── Redirect comment exists in app.js ──
test('app.js has P3-S7 redirect comment for setup enforcement', () => {
  assert.ok(
    appJs.includes('setup-ui.js (P3-S7)'),
    'app.js should have a P3-S7 redirect comment pointing to setup-ui.js'
  );
});

// ── Removed from app.js ──
test('isApiConfigured not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function isApiConfigured('),
    'isApiConfigured() must not be defined in app.js'
  );
});

test('showSetupWizard not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function showSetupWizard('),
    'showSetupWizard() must not be defined in app.js'
  );
});

test('checkAndPromptUserName not defined in app.js', () => {
  assert.ok(
    !appJs.includes('function checkAndPromptUserName('),
    'checkAndPromptUserName() must not be defined in app.js'
  );
});

test('SETUP_STEPS not defined in app.js', () => {
  assert.ok(
    !appJs.includes('const SETUP_STEPS ='),
    'SETUP_STEPS constant must not be defined in app.js'
  );
});

test('setupAspectConfigs not defined in app.js', () => {
  assert.ok(
    !appJs.includes('let setupAspectConfigs ='),
    'setupAspectConfigs must not be declared in app.js'
  );
});

// ── Owned by setup-ui.js ──
test('setup-ui.js owns isApiConfigured', () => {
  assert.ok(
    setupUiJs.includes('function isApiConfigured('),
    'setup-ui.js must define isApiConfigured()'
  );
  assert.ok(
    !setupUiJs.includes('window.__desktopTestBypass'),
    'setup-ui.js must not bypass provider setup via window.__desktopTestBypass'
  );
});

test('setup-ui.js owns showSetupRequired', () => {
  assert.ok(
    setupUiJs.includes('function showSetupRequired('),
    'setup-ui.js must define showSetupRequired()'
  );
});

test('setup-ui.js owns hideSetupRequired', () => {
  assert.ok(
    setupUiJs.includes('function hideSetupRequired('),
    'setup-ui.js must define hideSetupRequired()'
  );
});

test('setup-ui.js owns guardEntityOperation', () => {
  assert.ok(
    setupUiJs.includes('function guardEntityOperation('),
    'setup-ui.js must define guardEntityOperation()'
  );
});

test('setup-ui.js owns SETUP_STEPS', () => {
  assert.ok(
    setupUiJs.includes('const SETUP_STEPS ='),
    'setup-ui.js must define SETUP_STEPS constant'
  );
});

test('setup-ui.js owns showSetupWizard', () => {
  assert.ok(
    setupUiJs.includes('function showSetupWizard('),
    'setup-ui.js must define showSetupWizard()'
  );
});

test('setup-ui.js owns setupFinish', () => {
  assert.ok(
    setupUiJs.includes('function setupFinish('),
    'setup-ui.js must define setupFinish()'
  );
});

test('setup-ui.js owns checkAndPromptUserName', () => {
  assert.ok(
    setupUiJs.includes('function checkAndPromptUserName('),
    'setup-ui.js must define checkAndPromptUserName()'
  );
});

test('setup-ui.js owns saveUserName', () => {
  assert.ok(
    setupUiJs.includes('function saveUserName('),
    'setup-ui.js must define saveUserName()'
  );
});

// ── Script order in index.html ──
test('index.html loads setup-ui.js after users-ui.js', () => {
  const usersPos = indexHtml.indexOf('"js/apps/core/users-ui.js"');
  const setupPos = indexHtml.indexOf('"js/apps/core/setup-ui.js"');
  assert.ok(usersPos !== -1, 'users-ui.js must be in index.html');
  assert.ok(setupPos !== -1, 'setup-ui.js must be in index.html');
  assert.ok(setupPos > usersPos, 'setup-ui.js must load after users-ui.js');
});

test('index.html loads setup-ui.js before skills-ui.js', () => {
  const setupPos = indexHtml.indexOf('"js/apps/core/setup-ui.js"');
  const skillsPos = indexHtml.indexOf('"js/apps/optional/skills-ui.js"');
  assert.ok(setupPos !== -1, 'setup-ui.js must be in index.html');
  assert.ok(skillsPos !== -1, 'skills-ui.js must be in index.html');
  assert.ok(setupPos < skillsPos, 'setup-ui.js must load before skills-ui.js');
});
