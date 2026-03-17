'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const VISUALIZER_JS = path.join(ROOT, 'client', 'js', 'visualizer.js');
const ENTITY_ROUTES = path.join(ROOT, 'server', 'routes', 'entity-routes.js');
const ENTITY_RUNTIME = path.join(ROOT, 'server', 'services', 'entity-runtime.js');
const SERVER_JS = path.join(ROOT, 'server', 'server.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('visualizer picker keeps an explicit Select entity placeholder', () => {
  const src = read(VISUALIZER_JS);
  assert.match(src, /placeholder\.value = '';/, 'visualizer must keep an explicit blank placeholder option');
  assert.match(src, /placeholder\.textContent = 'Select entity';/, 'visualizer placeholder label must remain visible');
  assert.match(src, /picker\.value = '';/, 'visualizer must not fake-select the first entity when no entity is active');
});

test('visualizer includes the currently loaded entity even if /api/entities omits it', () => {
  const src = read(VISUALIZER_JS);
  assert.match(src, /const currentEntity = currentData\?\.entity \|\| null;/, 'visualizer must inspect the current entity payload');
  assert.match(src, /!entities\.some\(\(e\) => String\(e\?\.id \|\| ''\) === String\(currentEntity\.id\)\)/, 'visualizer must merge the current entity into the dropdown when missing');
});

test('/api/entity reads current entity from entityManager, not hatchEntity shared state', () => {
  const src = read(ENTITY_ROUTES);
  assert.match(src, /const entity = ctx\.entityManager\.getCurrentEntity\(\);/, '/api/entity must read from entityManager current entity');
  assert.doesNotMatch(src, /const entity = ctx\.hatchEntity\.loadEntity\(\);/, '/api/entity must not be driven by hatchEntity shared state');
});

test('nekoSystemRuntime does not mutate shared active-entity globals', () => {
  const runtimeSrc = read(ENTITY_RUNTIME);
  const serverSrc = read(SERVER_JS);
  assert.match(serverSrc, /shareMutableGlobals: false/, 'nekoSystemRuntime must disable shared mutable globals');
  assert.match(runtimeSrc, /if \(shareMutableGlobals\) \{[\s\S]*hatchEntity\.entityId = entityId;/, 'entity runtime must guard hatchEntity mutation behind shareMutableGlobals');
  assert.match(runtimeSrc, /if \(shareMutableGlobals && attentionSystem\)/, 'entity runtime must guard attentionSystem mutation behind shareMutableGlobals');
});