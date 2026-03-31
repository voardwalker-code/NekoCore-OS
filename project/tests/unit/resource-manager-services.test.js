// ── Tests · Resource Manager Services.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, fs, path, os. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ── Resource Manager — Service + Route Unit Tests ────────────
// Tests for todo-store.js, resource-active-state.js, and route module loading.

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── todo-store tests (with temp entity dir) ────────────────

describe('todo-store — CRUD operations', () => {
  let tmpDir;
  let originalEntitiesDir;
  const entityPaths = require('../../server/entityPaths');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-test-'));
    const entityDir = path.join(tmpDir, 'entity_testunit');
    fs.mkdirSync(path.join(entityDir, 'memories', 'todos'), { recursive: true });
    originalEntitiesDir = entityPaths.ENTITIES_DIR;
    entityPaths.ENTITIES_DIR = tmpDir;
  });

  afterEach(() => {
    entityPaths.ENTITIES_DIR = originalEntitiesDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('listTodos returns empty array for fresh entity', () => {
    const todoStore = require('../../server/services/todo-store');
    const list = todoStore.listTodos('testunit');
    assert.deepStrictEqual(list, []);
  });

  it('createTodo generates id and persists', () => {
    const todoStore = require('../../server/services/todo-store');
    const result = todoStore.createTodo('testunit', {
      title: 'Test todo',
      description: 'A test',
      priority: 'high',
      status: 'active',
      tags: ['test']
    });
    assert.strictEqual(result.ok, true);
    assert.ok(result.todo.id.startsWith('todo_'));
    assert.strictEqual(result.todo.title, 'Test todo');
    assert.strictEqual(result.todo.priority, 'high');
    // Verify on disk
    const list = todoStore.listTodos('testunit');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, result.todo.id);
  });

  it('createTodo rejects empty title', () => {
    const todoStore = require('../../server/services/todo-store');
    const result = todoStore.createTodo('testunit', { title: '' });
    assert.strictEqual(result.ok, false);
  });

  it('createTodo rejects invalid priority', () => {
    const todoStore = require('../../server/services/todo-store');
    const result = todoStore.createTodo('testunit', { title: 'X', priority: 'bogus' });
    assert.strictEqual(result.ok, false);
  });

  it('getTodo returns specific todo', () => {
    const todoStore = require('../../server/services/todo-store');
    const { todo } = todoStore.createTodo('testunit', { title: 'Find me' });
    const found = todoStore.getTodo('testunit', todo.id);
    assert.strictEqual(found.title, 'Find me');
  });

  it('getTodo returns null for missing id', () => {
    const todoStore = require('../../server/services/todo-store');
    assert.strictEqual(todoStore.getTodo('testunit', 'nonexistent'), null);
  });

  it('updateTodo modifies and persists', () => {
    const todoStore = require('../../server/services/todo-store');
    const { todo } = todoStore.createTodo('testunit', { title: 'Original' });
    const result = todoStore.updateTodo('testunit', todo.id, { title: 'Updated', priority: 'low' });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.todo.title, 'Updated');
    assert.strictEqual(result.todo.priority, 'low');
  });

  it('updateTodo returns error for missing todo', () => {
    const todoStore = require('../../server/services/todo-store');
    const result = todoStore.updateTodo('testunit', 'missing', { title: 'X' });
    assert.strictEqual(result.ok, false);
  });

  it('deleteTodo removes item', () => {
    const todoStore = require('../../server/services/todo-store');
    const { todo } = todoStore.createTodo('testunit', { title: 'Delete me' });
    const result = todoStore.deleteTodo('testunit', todo.id);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(todoStore.listTodos('testunit').length, 0);
  });

  it('deleteTodo returns error for missing todo', () => {
    const todoStore = require('../../server/services/todo-store');
    const result = todoStore.deleteTodo('testunit', 'missing');
    assert.strictEqual(result.ok, false);
  });
});

// ── resource-active-state tests ────────────────────────────

describe('resource-active-state — active tracking', () => {
  let tmpDir;
  let originalEntitiesDir;
  const entityPaths = require('../../server/entityPaths');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-active-'));
    const entityDir = path.join(tmpDir, 'entity_testunit');
    fs.mkdirSync(entityDir, { recursive: true });
    originalEntitiesDir = entityPaths.ENTITIES_DIR;
    entityPaths.ENTITIES_DIR = tmpDir;
  });

  afterEach(() => {
    entityPaths.ENTITIES_DIR = originalEntitiesDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getActiveResources returns defaults for fresh entity', () => {
    const activeState = require('../../server/services/resource-active-state');
    const state = activeState.getActiveResources('testunit');
    assert.strictEqual(state.activeTodo, null);
    assert.strictEqual(state.activeTask, null);
    assert.strictEqual(state.activeProject, null);
    assert.strictEqual(state.activePulse, null);
  });

  it('setActive writes to disk', () => {
    const activeState = require('../../server/services/resource-active-state');
    const result = activeState.setActive('testunit', 'todo', 'todo_abc');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.state.activeTodo, 'todo_abc');
    // Read back
    const state = activeState.getActiveResources('testunit');
    assert.strictEqual(state.activeTodo, 'todo_abc');
  });

  it('unsetActive clears to null', () => {
    const activeState = require('../../server/services/resource-active-state');
    activeState.setActive('testunit', 'project', 'proj_123');
    const result = activeState.unsetActive('testunit', 'project');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.state.activeProject, null);
  });

  it('rejects invalid type', () => {
    const activeState = require('../../server/services/resource-active-state');
    const result = activeState.setActive('testunit', 'invalid', 'x');
    assert.strictEqual(result.ok, false);
  });
});

// ── route module loading ────────────────────────────────────

describe('resource-manager-routes — module loading', () => {
  it('exports a function', () => {
    const factory = require('../../server/routes/resource-manager-routes');
    assert.strictEqual(typeof factory, 'function');
  });

  it('returns an object with dispatch function', () => {
    const factory = require('../../server/routes/resource-manager-routes');
    const routes = factory({});
    assert.strictEqual(typeof routes.dispatch, 'function');
  });
});

// ── server.js registration ──────────────────────────────────

describe('server.js — resource manager registration', () => {
  it('server.js requires resource-manager-routes', () => {
    const serverSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'server.js'), 'utf8');
    assert.ok(serverSrc.includes("require('./routes/resource-manager-routes')"), 'route require missing');
  });

  it('server.js includes resourceMgrRoutes in dispatchers', () => {
    const serverSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'server.js'), 'utf8');
    assert.ok(serverSrc.includes('resourceMgrRoutes'), 'dispatcher entry missing');
  });
});

// ── manifest + app.js registration ──────────────────────────

describe('client registrations', () => {
  it('manifest includes resourcemgr entry', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', '..', 'client', 'apps', 'non-core', 'non-core-apps.manifest.json'), 'utf8'
    ));
    const entry = manifest.nonCoreApps.find(a => a.tabId === 'resourcemgr');
    assert.ok(entry, 'resourcemgr missing from manifest');
    assert.strictEqual(entry.enabled, true);
    assert.ok(entry.path.includes('tab-resourcemgr.html'));
  });

  it('tab-resourcemgr.html exists', () => {
    const htmlPath = path.join(__dirname, '..', '..', 'client', 'apps', 'non-core', 'core', 'tab-resourcemgr.html');
    assert.ok(fs.existsSync(htmlPath), 'HTML file missing');
  });

  it('app.js has WINDOW_APPS entry for resourcemgr', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'js', 'app.js'), 'utf8');
    assert.ok(src.includes("tab: 'resourcemgr'"), 'WINDOW_APPS entry missing');
  });

  it('app.js has APP_CATEGORY_BY_TAB entry for resourcemgr', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'js', 'app.js'), 'utf8');
    assert.ok(src.includes("resourcemgr: 'dev'"), 'category entry missing');
  });
});
