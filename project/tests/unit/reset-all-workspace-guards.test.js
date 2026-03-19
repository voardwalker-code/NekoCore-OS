'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const resetSrc = fs.readFileSync(path.join(ROOT, 'reset-all.js'), 'utf8');

test('reset-all clears virtual desktop workspace state', () => {
  assert.match(
    resetSrc,
    /path\.join\('workspace', 'desktop'\)/,
    'reset-all.js must delete workspace/desktop so stale virtual desktop folders do not survive factory reset'
  );
  assert.match(
    resetSrc,
    /path\.join\('workspace', 'trash'\)/,
    'reset-all.js must delete workspace/trash so stale move logs and trash markers do not survive factory reset'
  );
});