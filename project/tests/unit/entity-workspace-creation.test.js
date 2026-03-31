// ── Tests · Entity Workspace Creation.Test ────────────────────────────────────────────────────
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
const ENTITY_ROUTES = path.join(ROOT, 'server', 'routes', 'entity-routes.js');
// readEntityRoutes()
// WHAT THIS DOES: readEntityRoutes reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call readEntityRoutes(...), then use the returned value in your next step.
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
  assert.ok(block.includes('_ensureEntityDesktopWorkspace(entity.name, newCanonicalId);'),
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
