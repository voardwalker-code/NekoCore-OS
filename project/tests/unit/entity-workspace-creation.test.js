'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const ENTITY_ROUTES = path.join(ROOT, 'server', 'routes', 'entity-routes.js');

function readEntityRoutes() {
  return fs.readFileSync(ENTITY_ROUTES, 'utf8');
}

test('entity-routes defines workspace desktop folder helper', () => {
  const src = readEntityRoutes();
  assert.ok(src.includes("const WORKSPACE_DESKTOP_DIR = path.join(PROJECT_ROOT, 'workspace', 'desktop');"),
    'expected WORKSPACE_DESKTOP_DIR constant for VFS desktop root');
  assert.ok(src.includes('function _ensureEntityDesktopWorkspace(entityName, entityId) {'),
    'expected workspace helper function in entity-routes');
});

test('postEntitiesCreate ensures entity desktop workspace folder', () => {
  const src = readEntityRoutes();
  const start = src.indexOf('async function postEntitiesCreate(');
  const end = src.indexOf('async function postEntitiesCreateHatch(');
  const block = src.slice(start, end > start ? end : start + 2200);
  assert.ok(block.includes('_ensureEntityDesktopWorkspace(name, canonicalId);'),
    'postEntitiesCreate must create workspace/desktop/<Entity Name> folder');
});

test('postEntitiesCreateHatch ensures entity desktop workspace folder', () => {
  const src = readEntityRoutes();
  const start = src.indexOf('async function postEntitiesCreateHatch(');
  const end = src.indexOf('async function postEntitiesCreateGuided(');
  const block = src.slice(start, end > start ? end : start + 2600);
  assert.ok(block.includes('_ensureEntityDesktopWorkspace(entity.name, hatchResult.entityId);'),
    'postEntitiesCreateHatch must create workspace/desktop/<Entity Name> folder');
});

test('postEntitiesCreateGuided ensures entity desktop workspace folder', () => {
  const src = readEntityRoutes();
  const start = src.indexOf('async function postEntitiesCreateGuided(');
  const end = src.indexOf('async function postEntitiesCreateCharacter(');
  const block = src.slice(start, end > start ? end : start + 5200);
  assert.ok(block.includes('_ensureEntityDesktopWorkspace(name, canonicalId);'),
    'postEntitiesCreateGuided must create workspace/desktop/<Entity Name> folder');
});

test('postEntitiesCreateCharacter ensures entity desktop workspace folder', () => {
  const src = readEntityRoutes();
  const start = src.indexOf('async function postEntitiesCreateCharacter(');
  const end = src.indexOf('async function postEntitiesDelete(');
  const block = src.slice(start, end > start ? end : start + 5200);
  assert.ok(block.includes('_ensureEntityDesktopWorkspace(name, canonicalId);'),
    'postEntitiesCreateCharacter must create workspace/desktop/<Entity Name> folder');
});
