const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projects = require('../../server/brain/tasks/task-project-store');
const writer = require('../../server/brain/tasks/task-archive-writer');

function tmpBase() {
  const base = path.join(os.tmpdir(), 'nekocore-task-archive-writer-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(base, { recursive: true });
  return {
    base,
    opts: { baseEntitiesDir: base },
    cleanup: () => fs.rmSync(base, { recursive: true, force: true })
  };
}

test('createTaskArchive writes directory and brief.json', () => {
  const t = tmpBase();
  const project = projects.createProject('entity_a', 'A', t.opts);

  const archiveId = writer.createTaskArchive(project.id, 'task_1', { message: 'hello' }, { ...t.opts, entityId: 'entity_a' });
  const archiveDir = writer.resolveTaskArchivePath(archiveId, t.opts);

  assert.equal(fs.existsSync(archiveDir), true);
  assert.equal(fs.existsSync(path.join(archiveDir, 'brief.json')), true);
  t.cleanup();
});

test('appendStep accumulates step files without overwrite', () => {
  const t = tmpBase();
  const project = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(project.id, 'task_1', {}, { ...t.opts, entityId: 'entity_a' });

  writer.appendStep(archiveId, { stepIndex: 0, output: 'one' }, t.opts);
  writer.appendStep(archiveId, { stepIndex: 1, output: 'two' }, t.opts);

  const stepDir = path.join(writer.resolveTaskArchivePath(archiveId, t.opts), 'steps');
  const files = fs.readdirSync(stepDir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 2);
  t.cleanup();
});

test('appendSource merges into sources.json', () => {
  const t = tmpBase();
  const project = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(project.id, 'task_1', {}, { ...t.opts, entityId: 'entity_a' });

  writer.appendSource(archiveId, { url: 'https://example.com', title: 'Example' }, t.opts);
  writer.appendSource(archiveId, { url: 'https://example.com', title: 'Example' }, t.opts);

  const sourcesPath = path.join(writer.resolveTaskArchivePath(archiveId, t.opts), 'sources', 'sources.json');
  const data = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  assert.equal(data.length, 1);
  t.cleanup();
});

test('finalize writes deliverable in final directory', () => {
  const t = tmpBase();
  const project = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(project.id, 'task_1', {}, { ...t.opts, entityId: 'entity_a' });

  writer.finalize(archiveId, '# Final answer', t.opts);
  const outPath = path.join(writer.resolveTaskArchivePath(archiveId, t.opts), 'final', 'output.md');

  assert.equal(fs.existsSync(outPath), true);
  t.cleanup();
});

test('non-existent archive operations are safe', () => {
  const t = tmpBase();
  const badId = 'entity_a|p_missing|t_missing';
  assert.equal(writer.appendStep(badId, { stepIndex: 0 }, t.opts), false);
  assert.equal(writer.appendSource(badId, { url: 'https://x.com' }, t.opts), false);
  assert.equal(writer.finalize(badId, 'x', t.opts), false);
  t.cleanup();
});
