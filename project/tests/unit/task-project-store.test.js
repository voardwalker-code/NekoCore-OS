const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const store = require('../../server/brain/tasks/task-project-store');

function tmpBase() {
  const base = path.join(os.tmpdir(), 'nekocore-task-project-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(base, { recursive: true });
  return {
    base,
    opts: { baseEntitiesDir: base },
    cleanup: () => fs.rmSync(base, { recursive: true, force: true })
  };
}

test('createProject writes project.json', () => {
  const t = tmpBase();
  const p = store.createProject('entity_test', 'Test Project', t.opts);

  const pFile = path.join(t.base, 'entities', 'entity_test', 'memories', 'projects', p.id, 'project.json');
  assert.equal(fs.existsSync(pFile), true);
  t.cleanup();
});

test('listProjects returns only projects for that entity', () => {
  const t = tmpBase();
  const p1 = store.createProject('entity_a', 'A1', t.opts);
  store.createProject('entity_a', 'A2', t.opts);
  store.createProject('entity_b', 'B1', t.opts);

  const listA = store.listProjects('entity_a', t.opts);
  const listB = store.listProjects('entity_b', t.opts);

  assert.equal(listA.length, 2);
  assert.equal(listB.length, 1);
  assert.ok(listA.some((p) => p.id === p1.id));
  t.cleanup();
});

test('addTaskToProject appends task id once', () => {
  const t = tmpBase();
  const p = store.createProject('entity_a', 'A', t.opts);

  store.addTaskToProject(p.id, 'task_1', { ...t.opts, entityId: 'entity_a' });
  store.addTaskToProject(p.id, 'task_1', { ...t.opts, entityId: 'entity_a' });
  const loaded = store.getProject(p.id, { ...t.opts, entityId: 'entity_a' });

  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0], 'task_1');
  t.cleanup();
});

test('resolveOrCreateProject returns existing project on keyword overlap', () => {
  const t = tmpBase();
  const p = store.createProject('entity_a', 'climate change analysis', t.opts);

  // Ensure project has rich keywords
  p.keywords = ['climate', 'change', 'analysis', 'temperature'];
  const pFile = path.join(t.base, 'entities', 'entity_a', 'memories', 'projects', p.id, 'project.json');
  fs.writeFileSync(pFile, JSON.stringify(p, null, 2), 'utf8');

  const resolved = store.resolveOrCreateProject('entity_a', 'analysis', 'Analyze climate change temperature trends', t.opts);
  assert.equal(resolved.id, p.id);
  t.cleanup();
});

test('resolveOrCreateProject creates new project when no overlap', () => {
  const t = tmpBase();
  store.createProject('entity_a', 'cooking recipes', t.opts);

  const resolved = store.resolveOrCreateProject('entity_a', 'code', 'Build a JavaScript API server', t.opts);
  const list = store.listProjects('entity_a', t.opts);

  assert.ok(resolved.id);
  assert.equal(list.length, 2);
  t.cleanup();
});
