'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

test('NekoCore memory stats route counts archive docs and archived experiences', () => {
  const src = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'nekocore-routes.js'), 'utf8');
  assert.match(src, /archive', 'docs/);
  assert.match(src, /archivedExperienceCount/);
  assert.match(src, /archive', 'episodic/);
});

test('NekoCore panel labels live and archived memory buckets distinctly', () => {
  const src = fs.readFileSync(path.join(ROOT, 'client', 'js', 'nekocore-app.js'), 'utf8');
  assert.match(src, /live experiences/);
  assert.match(src, /archived knowledge docs/);
});