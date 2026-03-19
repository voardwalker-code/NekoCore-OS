'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const windowManagerSrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'window-manager.js'), 'utf8');

test('window manager defines iframe path guard helper', () => {
  assert.match(windowManagerSrc, /function frameHasExpectedPath\(frame, expectedPaths\)/, 'window-manager.js must define a reusable iframe path guard helper');
  assert.match(windowManagerSrc, /new URL\(rawSrc, window\.location\.href\)/, 'iframe path guard must resolve relative iframe src values against the current shell location');
});

test('creator window recovers the compatibility iframe runtime when iframe navigation drifts', () => {
  assert.match(windowManagerSrc, /if \(fr && !frameHasExpectedPath\(fr, \['create\.html', 'apps\/entity-creator\/index\.html'\]\)\) \{[\s\S]*fr\.src = '\/create\.html\?embed=1';/, 'Creator open path must restore the compatibility iframe runtime when the iframe is on the wrong page');
});

test('nekocore window and quick-send path recover the expected iframe runtime', () => {
  assert.match(windowManagerSrc, /if \(!frameHasExpectedPath\(fr, \['nekocore\.html'\]\)\) \{[\s\S]*fr\.src = '\/nekocore\.html';[\s\S]*\} else \{[\s\S]*setTimeout\(dispatch, 80\);[\s\S]*\}/, 'Quick-send must restore the NekoCore iframe runtime before posting chat messages');
  assert.match(windowManagerSrc, /if \(fr && !frameHasExpectedPath\(fr, \['nekocore\.html'\]\)\) fr\.src = '\/nekocore\.html';/, 'Opening the NekoCore window must restore the iframe runtime when it has drifted');
});