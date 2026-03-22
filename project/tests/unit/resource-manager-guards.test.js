'use strict';
/**
 * Guard + unit tests for the Resource Manager App (PLAN-RESOURCE-MANAGER-APP-v1).
 * Validates: manifest, WINDOW_APPS registration, existing module exports
 * (task-project-store, blueprint-loader), blueprint file integrity,
 * todo schema, active-resources schema, and cookie-cutter templates.
 * Run with: node --test tests/unit/resource-manager-guards.test.js (from project/)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/* ── Existing module export guards ──────────────────────────────── */

describe('Resource Manager — task-project-store exports', () => {
  const storePath = path.join(ROOT, 'server/brain/tasks/task-project-store.js');

  it('task-project-store.js exists', () => {
    assert.ok(fs.existsSync(storePath), 'task-project-store.js must exist');
  });

  it('exports expected functions', () => {
    const mod = require(storePath);
    assert.strictEqual(typeof mod.createProject, 'function');
    assert.strictEqual(typeof mod.getProject, 'function');
    assert.strictEqual(typeof mod.listProjects, 'function');
    assert.strictEqual(typeof mod.addTaskToProject, 'function');
    assert.strictEqual(typeof mod.resolveOrCreateProject, 'function');
  });
});

describe('Resource Manager — blueprint-loader exports', () => {
  const loaderPath = path.join(ROOT, 'server/brain/tasks/blueprint-loader.js');

  it('blueprint-loader.js exists', () => {
    assert.ok(fs.existsSync(loaderPath), 'blueprint-loader.js must exist');
  });

  it('exports expected functions and constants', () => {
    const mod = require(loaderPath);
    assert.strictEqual(typeof mod.getCoreBlueprint, 'function');
    assert.strictEqual(typeof mod.getModuleBlueprint, 'function');
    assert.strictEqual(typeof mod.getAllCoreBlueprints, 'function');
    assert.ok(Array.isArray(mod.CORE_NAMES), 'CORE_NAMES must be an array');
    assert.ok(mod.MODULE_MAP, 'MODULE_MAP must exist');
  });
});

/* ── Blueprint file integrity ───────────────────────────────────── */

describe('Resource Manager — blueprint files on disk', () => {
  const coreDir = path.join(ROOT, 'server/brain/tasks/blueprints/core');
  const modulesDir = path.join(ROOT, 'server/brain/tasks/blueprints/modules');

  const expectedCore = [
    'error-recovery.md', 'output-format.md', 'quality-gate.md',
    'task-decomposition.md', 'tool-guide.md'
  ];
  const expectedModules = [
    'analysis.md', 'code.md', 'planning.md',
    'project.md', 'research.md', 'writing.md'
  ];

  it('core blueprint directory exists', () => {
    assert.ok(fs.existsSync(coreDir), 'blueprints/core/ must exist');
  });

  it('all core blueprints present', () => {
    for (const f of expectedCore) {
      assert.ok(fs.existsSync(path.join(coreDir, f)), `core/${f} must exist`);
    }
  });

  it('module blueprint directory exists', () => {
    assert.ok(fs.existsSync(modulesDir), 'blueprints/modules/ must exist');
  });

  it('all module blueprints present', () => {
    for (const f of expectedModules) {
      assert.ok(fs.existsSync(path.join(modulesDir, f)), `modules/${f} must exist`);
    }
  });
});

/* ── Todo schema validation ─────────────────────────────────────── */

describe('Resource Manager — Todo schema validation', () => {
  const PRIORITIES = ['critical', 'high', 'medium', 'low'];
  const STATUSES   = ['active', 'paused', 'done', 'cancelled'];

  function validateTodo(obj) {
    const errors = [];
    if (typeof obj.id !== 'string' || !obj.id.startsWith('todo_')) errors.push('bad id');
    if (typeof obj.title !== 'string' || !obj.title.trim()) errors.push('empty title');
    if (!PRIORITIES.includes(obj.priority)) errors.push(`bad priority: ${obj.priority}`);
    if (!STATUSES.includes(obj.status)) errors.push(`bad status: ${obj.status}`);
    if (!Array.isArray(obj.tags)) errors.push('tags must be array');
    if (typeof obj.createdAt !== 'string') errors.push('missing createdAt');
    if (typeof obj.updatedAt !== 'string') errors.push('missing updatedAt');
    return errors;
  }

  it('valid todo passes validation', () => {
    const valid = {
      id: 'todo_1774100000000_abc',
      title: 'Ship v1.0',
      description: 'Finalize changelog',
      priority: 'high',
      status: 'active',
      tags: ['release'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    assert.deepStrictEqual(validateTodo(valid), []);
  });

  it('rejects bad id prefix', () => {
    const bad = { id: 'task_123', title: 'x', priority: 'low', status: 'active', tags: [], createdAt: 'x', updatedAt: 'x' };
    assert.ok(validateTodo(bad).includes('bad id'));
  });

  it('rejects empty title', () => {
    const bad = { id: 'todo_1', title: '', priority: 'low', status: 'active', tags: [], createdAt: 'x', updatedAt: 'x' };
    assert.ok(validateTodo(bad).includes('empty title'));
  });

  it('rejects invalid priority', () => {
    const bad = { id: 'todo_1', title: 'x', priority: 'urgent', status: 'active', tags: [], createdAt: 'x', updatedAt: 'x' };
    assert.ok(validateTodo(bad).some(e => e.includes('bad priority')));
  });

  it('rejects invalid status', () => {
    const bad = { id: 'todo_1', title: 'x', priority: 'low', status: 'pending', tags: [], createdAt: 'x', updatedAt: 'x' };
    assert.ok(validateTodo(bad).some(e => e.includes('bad status')));
  });
});

/* ── Active-resources schema ────────────────────────────────────── */

describe('Resource Manager — Active-resources schema', () => {
  function validateActiveResources(obj) {
    const errors = [];
    const allowedKeys = ['activeTodo', 'activeTask', 'activeProject', 'activePulse', 'updatedAt'];
    for (const k of Object.keys(obj)) {
      if (!allowedKeys.includes(k)) errors.push(`unexpected key: ${k}`);
    }
    for (const k of ['activeTodo', 'activeTask', 'activeProject', 'activePulse']) {
      if (obj[k] !== null && obj[k] !== undefined && typeof obj[k] !== 'string') {
        errors.push(`${k} must be string or null`);
      }
    }
    return errors;
  }

  it('valid active-resources passes', () => {
    const valid = {
      activeTodo: 'todo_123',
      activeTask: null,
      activeProject: 'proj_abc',
      activePulse: null,
      updatedAt: new Date().toISOString()
    };
    assert.deepStrictEqual(validateActiveResources(valid), []);
  });

  it('rejects non-string active values', () => {
    const bad = { activeTodo: 123, activeTask: null, activeProject: null, activePulse: null };
    assert.ok(validateActiveResources(bad).some(e => e.includes('must be string or null')));
  });

  it('flags unexpected keys', () => {
    const bad = { activeTodo: null, activeBlueprint: 'bp_1' };
    assert.ok(validateActiveResources(bad).some(e => e.includes('unexpected key')));
  });
});

/* ── Cookie-cutter templates ────────────────────────────────────── */

describe('Resource Manager — Cookie-cutter templates', () => {
  const templates = {
    todo: {
      title: 'Untitled Todo',
      description: 'Describe what needs to be done...',
      priority: 'medium',
      status: 'active',
      tags: []
    },
    project: {
      name: 'New Project',
      keywords: ['keyword1', 'keyword2'],
      tasks: []
    },
    chore: {
      name: 'New Chore',
      description: 'Describe what this recurring task does...',
      assignTo: '',
      intervalMs: 3600000,
      enabled: true
    }
  };

  it('todo template has required fields', () => {
    assert.ok(templates.todo.title);
    assert.ok(templates.todo.description);
    assert.ok(['critical', 'high', 'medium', 'low'].includes(templates.todo.priority));
    assert.ok(['active', 'paused', 'done', 'cancelled'].includes(templates.todo.status));
    assert.ok(Array.isArray(templates.todo.tags));
  });

  it('project template has required fields', () => {
    assert.ok(templates.project.name);
    assert.ok(Array.isArray(templates.project.keywords));
    assert.ok(Array.isArray(templates.project.tasks));
  });

  it('chore template has required fields', () => {
    assert.ok(templates.chore.name);
    assert.strictEqual(typeof templates.chore.intervalMs, 'number');
    assert.ok(templates.chore.intervalMs > 0);
    assert.strictEqual(typeof templates.chore.enabled, 'boolean');
  });

  it('blueprint template is valid markdown', () => {
    const bpTemplate = `# [Task Type] Blueprint\n\n## Task Overview\n\nYou are assigned a task.`;
    assert.ok(bpTemplate.startsWith('#'));
    assert.ok(bpTemplate.includes('## Task Overview'));
  });
});
