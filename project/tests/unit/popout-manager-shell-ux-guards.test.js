'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DESKTOP_JS = path.join(ROOT, 'client', 'js', 'desktop.js');
const APP_JS = path.join(ROOT, 'client', 'js', 'app.js');
const WINDOW_MANAGER_JS = path.join(ROOT, 'client', 'js', 'window-manager.js');
const CONTEXT_MENU_JS = path.join(ROOT, 'client', 'js', 'context-menu.js');
const POPOUT_MANAGER_JS = path.join(ROOT, 'client', 'js', 'apps', 'optional', 'popout-manager.js');
const UI_CSS = path.join(ROOT, 'client', 'css', 'ui-v2.css');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('desktop.js defines detached shell state sync helper', () => {
  const src = read(DESKTOP_JS);
  assert.ok(src.includes('function syncDetachedShellStateUI(registry) {'));
  assert.ok(src.includes('launcher-detached-badge'));
  assert.ok(src.includes('.wm-window[data-tab]'));
});

test('window-manager.js applies detached state sync after launcher rebuilds', () => {
  const src = read(WINDOW_MANAGER_JS);
  assert.ok(src.includes("if (typeof syncDetachedShellStateUI === 'function')"));
});

test('app.js switchMainTab routes default opens to detached focus with forceInShell override', () => {
  const src = read(APP_JS);
  assert.ok(src.includes('function switchMainTab(tabName, el, options) {'));
  assert.ok(src.includes('opts.forceInShell !== true'));
  assert.ok(src.includes('focusDetachedPopout(tabName);'));
});

test('context-menu.js includes popout context actions', () => {
  const src = read(CONTEXT_MENU_JS);
  assert.ok(src.includes('function buildPopoutContextItems(tab) {'));
  assert.ok(src.includes('Pop Out to Desktop'));
  assert.ok(src.includes('Focus Detached Window'));
  assert.ok(src.includes('Close Detached Window'));
});

test('popout-manager.js exposes detached-state helpers', () => {
  const src = read(POPOUT_MANAGER_JS);
  assert.ok(src.includes('function isPopoutOpen(tabId) {'));
  assert.ok(src.includes('window.isPopoutOpen = isPopoutOpen;'));
  assert.ok(src.includes('window.focusDetachedPopout = focusDetachedPopout;'));
  assert.ok(src.includes('window.getPopoutRegistrySnapshot = getPopoutRegistrySnapshot;'));
  assert.ok(src.includes("switchMainTab(shellTab, null, { forceInShell: true })"));
});

test('ui-v2.css contains detached badges for launcher and taskbar surfaces', () => {
  const src = read(UI_CSS);
  assert.ok(src.includes('.os-pinned-app.is-detached::after'));
  assert.ok(src.includes('.launcher-detached-badge'));
  assert.ok(src.includes('.wm-window.is-detached .wm-title::after'));
});
