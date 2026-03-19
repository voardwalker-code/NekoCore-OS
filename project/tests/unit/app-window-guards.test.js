'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

const appWindowJs = readFile(path.join(ROOT, 'client', 'js', 'app-window.js'));
const indexHtml = readFile(path.join(ROOT, 'client', 'index.html'));

test('D-1: AppWindow class exists and is properly defined', () => {
  assert.match(appWindowJs, /class AppWindow/, 'app-window.js must define AppWindow class');
  assert.match(appWindowJs, /constructor\(tabName, appMetadata/, 'AppWindow must have constructor with tabName and appMetadata');
  assert.match(appWindowJs, /this\.tabName = tabName/, 'constructor must set tabName property');
  assert.match(appWindowJs, /this\.shadowRoot = null/, 'constructor must initialize shadowRoot as null');
});

test('D-1: AppWindow class provides lifecycle hooks', () => {
  assert.match(appWindowJs, /this\.onOpen = null/, 'constructor must initialize onOpen hook');
  assert.match(appWindowJs, /this\.onFocus = null/, 'constructor must initialize onFocus hook');
  assert.match(appWindowJs, /this\.onClose = null/, 'constructor must initialize onClose hook');
  assert.match(appWindowJs, /typeof this\.onOpen === 'function'/, 'open() must check and call onOpen hook');
  assert.match(appWindowJs, /typeof this\.onFocus === 'function'/, 'focus() must check and call onFocus hook');
  assert.match(appWindowJs, /typeof this\.onClose === 'function'/, 'close() must check and call onClose hook');
});

test('D-1: AppWindow.initialize() attaches shadow root', () => {
  assert.match(appWindowJs, /initialize\(\)/, 'AppWindow must have initialize method');
  assert.match(appWindowJs, /attachShadow\(\s*{\s*mode:\s*'open'/i, 'initialize must call attachShadow with mode open');
  assert.match(appWindowJs, /this\.shadowRoot = contentEl\.attachShadow/, 'initialize must assign attachShadow result to this.shadowRoot');
  assert.match(appWindowJs, /meta\.__shadowHost = true/, 'initialize must mark meta with shadow host flag');
  assert.match(appWindowJs, /meta\.__shadowRoot = this\.shadowRoot/, 'initialize must store shadow root reference in meta');
});

test('D-1: AppWindow provides query methods for shadow root content', () => {
  assert.match(appWindowJs, /querySelector\(selector\)/, 'AppWindow must have querySelector method');
  assert.match(appWindowJs, /querySelectorAll\(selector\)/, 'AppWindow must have querySelectorAll method');
  assert.match(appWindowJs, /this\.shadowRoot\.querySelector\(selector\)/, 'querySelector must delegate to shadowRoot');
  assert.match(appWindowJs, /this\.shadowRoot\.querySelectorAll\(selector\)/, 'querySelectorAll must delegate to shadowRoot');
});

test('D-1: AppWindow provides content injection methods', () => {
  assert.match(appWindowJs, /injectHTML\(html, preserveInnerScripts/, 'AppWindow must have injectHTML method');
  assert.match(appWindowJs, /injectCSS\(css\)/, 'AppWindow must have injectCSS method');
  assert.match(appWindowJs, /this\.shadowRoot\.appendChild\(temp\.firstChild\)/, 'injectHTML must append nodes to shadow root');
  assert.match(appWindowJs, /const styleEl = document\.createElement\('style'\)/, 'injectCSS must create style element');
  assert.match(appWindowJs, /styleEl\.textContent = css/, 'injectCSS must set textContent to provided css');
});

test('D-1: AppWindow delegates lifecycle operations to windowManager', () => {
  assert.match(appWindowJs, /open\(\)/, 'AppWindow must have open method');
  assert.match(appWindowJs, /focus\(\)/, 'AppWindow must have focus method');
  assert.match(appWindowJs, /close\(\)/, 'AppWindow must have close method');
  assert.match(appWindowJs, /openWindow\(this\.tabName\)/, 'open must call windowManager openWindow');
  assert.match(appWindowJs, /focusWindow\(this\.tabName\)/, 'focus must call windowManager focusWindow');
  assert.match(appWindowJs, /closeWindow\(this\.tabName\)/, 'close must call windowManager closeWindow');
});

test('D-1: AppWindow provides factory functions', () => {
  assert.match(appWindowJs, /function getOrCreateAppWindow/, 'app-window.js must export getOrCreateAppWindow factory');
  assert.match(appWindowJs, /function getAppWindow\(tabName\)/, 'app-window.js must export getAppWindow retrieval function');
  assert.match(appWindowJs, /window\.__appWindowRegistry = window\.__appWindowRegistry \|\| new Map/, 'factory must use global registry');
  assert.match(appWindowJs, /window\.__appWindowRegistry\.set\(tabName, appWindow\)/, 'factory must register instances');
});

test('D-1: AppWindow is loaded into index.html after window-manager.js', () => {
  assert.match(indexHtml, /<script src="js\/window-manager\.js"><\/script>\s*<script src="js\/app-window\.js"><\/script>/, 'index.html must load app-window.js immediately after window-manager.js');
});

test('D-1: AppWindow error handling is defensive', () => {
  assert.match(appWindowJs, /typeof windowManager === 'undefined'/, 'initialize must check for windowManager availability');
  assert.match(appWindowJs, /try\s*{[\s\S]*?this\.shadowRoot = contentEl\.attachShadow/, 'initialize must wrap attachShadow in try-catch');
  assert.match(appWindowJs, /typeof openWindow !== 'function'/, 'open must check for openWindow availability');
  assert.match(appWindowJs, /typeof focusWindow !== 'function'/, 'focus must check for focusWindow availability');
  assert.match(appWindowJs, /typeof closeWindow !== 'function'/, 'close must check for closeWindow availability');
  assert.match(appWindowJs, /!this\.shadowRoot/, 'injectHTML must check if shadowRoot is available');
});

test('D-1: AppWindow supports window state tracking', () => {
  assert.match(appWindowJs, /this\.state = \{/, 'AppWindow must track window state');
  assert.match(appWindowJs, /maximized: false/, 'state must include maximized flag');
  assert.match(appWindowJs, /snapState: null/, 'state must include snapState field');
});

test('D-1: AppWindow.clear() and getBaseStyle() provide content management', () => {
  assert.match(appWindowJs, /clear\(\)/, 'AppWindow must have clear method to remove shadow root content');
  assert.match(appWindowJs, /getBaseStyle\(\)/, 'AppWindow must have getBaseStyle method');
  assert.match(appWindowJs, /getElement\(\)/, 'AppWindow must have getElement accessor');
  assert.match(appWindowJs, /getShadowRoot\(\)/, 'AppWindow must have getShadowRoot accessor');
  assert.match(appWindowJs, /getContentElement\(\)/, 'AppWindow must have getContentElement accessor');
});
