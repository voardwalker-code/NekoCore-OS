'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const VISUALIZER_JS = path.join(ROOT, 'client', 'js', 'visualizer.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('visualizer initEntityPicker does not auto-select first entity as active id', () => {
  const src = read(VISUALIZER_JS);
  const start = src.indexOf('async function initEntityPicker() {');
  const end = src.indexOf('async function switchVisualizerEntity(');
  const block = src.slice(start, end > start ? end : start + 1200);

  assert.ok(
    block.includes('selectedEntityId = currentId || null;'),
    'visualizer should only set selectedEntityId from current server state'
  );
  assert.ok(
    !block.includes('selectedEntityId = currentId || (entities[0] && entities[0].id) || null;'),
    'visualizer must not auto-checkout first listed entity when no current entity exists'
  );
});
