'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const ENTITY_ROUTES = path.join(ROOT, 'server', 'routes', 'entity-routes.js');
const APP_JS = path.join(ROOT, 'client', 'js', 'app.js');
const ENTITY_UI_JS = path.join(ROOT, 'client', 'js', 'apps', 'core', 'entity-ui.js');
const SERVER_JS = path.join(ROOT, 'server', 'server.js');
const ENTITY_MANAGER = path.join(ROOT, 'server', 'brain', 'utils', 'entity-manager.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('postEntitiesRelease clears active entity using canonical-id comparison', () => {
  const src = read(ENTITY_ROUTES);
  const start = src.indexOf('async function postEntitiesRelease(');
  const end = src.indexOf('// ── Entity profile (aggregated info for info panel)');
  const block = src.slice(start, end > start ? end : start + 700);

  assert.ok(
    block.includes('entityPaths.normalizeEntityId(ctx.currentEntityId) === canonicalId'),
    'release handler must normalize ctx.currentEntityId before comparing to canonicalId'
  );
});

test('refreshSidebarEntities normalizes active id before filtering visible entities', () => {
  const src = read(ENTITY_UI_JS);
  const start = src.indexOf('async function refreshSidebarEntities() {');
  const end = src.indexOf('async function sidebarSelectEntity(');
  const block = src.slice(start, end > start ? end : start + 1600);

  assert.ok(
    block.includes('const normalizeEntityId = (value) => String(value || \'\').replace(/^entity_+/, \'\');'),
    'refreshSidebarEntities should define canonical id normalization'
  );
  assert.ok(
    block.includes('data.entities.filter(e => normalizeEntityId(e.id) === activeEntityId)'),
    'refreshSidebarEntities should compare normalized ids to avoid hiding released entities'
  );
  assert.ok(
    block.includes('if (activeEntityId && entitiesToShow.length === 0) {'),
    'refreshSidebarEntities should clear stale active state and fall back to full visible list'
  );
});

test('clearActiveEntity also clears EntityManager state used by /api/entities/current', () => {
  const serverSrc = read(SERVER_JS);
  const clearStart = serverSrc.indexOf('function clearActiveEntity() {');
  const clearEnd = serverSrc.indexOf('function getEntityMemoryRootIfActive() {');
  const clearBlock = serverSrc.slice(clearStart, clearEnd > clearStart ? clearEnd : clearStart + 500);

  assert.ok(
    clearBlock.includes("entityManager.clearCurrentEntity()"),
    'clearActiveEntity should call entityManager.clearCurrentEntity() to prevent stale loaded state'
  );

  const managerSrc = read(ENTITY_MANAGER);
  assert.ok(
    managerSrc.includes('clearCurrentEntity() {'),
    'EntityManager should expose clearCurrentEntity()'
  );
});
