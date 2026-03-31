// ── Tests · Window Titlebar Controls Guards.Test ────────────────────────────────────────────────────
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

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const windowManagerSrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'window-manager.js'), 'utf8');
const indexHtmlSrc = fs.readFileSync(path.join(ROOT, 'client', 'index.html'), 'utf8');
const tabChatHtmlSrc = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'core', 'tab-chat.html'), 'utf8');

test('window titlebar includes minimize plus true left/right snap arrows', () => {
  assert.match(windowManagerSrc, /data-action="minimize" title="Minimize">&#8722;/, 'window-manager.js must provide a minimize titlebar button');
  assert.match(windowManagerSrc, /data-action="snap-left" title="Snap left">&#8592;/, 'window-manager.js must use a left arrow for snap-left');
  assert.match(windowManagerSrc, /data-action="snap-right" title="Snap right">&#8594;/, 'window-manager.js must use a right arrow for snap-right');
  assert.match(windowManagerSrc, /if \(action === 'minimize'\) minimizeWindow\(tabName\);/, 'window-manager.js must route the minimize titlebar action');
});

test('window manager defines minimizeWindow hide behavior', () => {
  assert.match(windowManagerSrc, /function minimizeWindow\(tabName\)/, 'window-manager.js must define minimizeWindow');
  assert.match(windowManagerSrc, /meta\.minimized = true;/, 'minimizeWindow must mark window state as minimized');
  assert.match(windowManagerSrc, /meta\.el\.style\.display = 'none';/, 'minimizeWindow must hide the window shell');
});

test('shell close and back buttons no longer render as question marks', () => {
  assert.match(indexHtmlSrc, /aria-label="Close start menu">&#10005;</, 'index.html must render the start menu close button as X');
  assert.match(tabChatHtmlSrc, /closeTaskHistory\(\)" title="Close">&#10005;</, 'tab-chat.html must render task history close button as X');
  assert.match(tabChatHtmlSrc, /closeTaskDetail\(\)" title="Back to history">&#8592; Back</, 'tab-chat.html must render task detail back button as a left arrow');
  assert.match(tabChatHtmlSrc, /closeTaskDetail\(\)" title="Close">&#10005;</, 'tab-chat.html must render task detail close button as X');
});