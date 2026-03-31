// ── Tests · Task Archive Reader.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, fs, os, path. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projects = require('../../server/brain/tasks/task-project-store');
const writer = require('../../server/brain/tasks/task-archive-writer');
const reader = require('../../server/brain/tasks/task-archive-reader');
// tmpBase()
// WHAT THIS DOES: tmpBase is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call tmpBase(...) where this helper behavior is needed.
function tmpBase() {
  const base = path.join(os.tmpdir(), 'nekocore-task-archive-reader-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(base, { recursive: true });
  return {
    base,
    opts: { baseEntitiesDir: base },
    cleanup: () => fs.rmSync(base, { recursive: true, force: true })
  };
}

test('getTaskSummary returns required fields', () => {
  const t = tmpBase();
  const p = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(p.id, 'task_1', { goal: 'x' }, { ...t.opts, entityId: 'entity_a' });
  writer.appendStep(archiveId, { stepIndex: 0, description: 'one', timestamp: Date.now() }, t.opts);
  writer.appendSource(archiveId, { url: 'https://example.com' }, t.opts);
  writer.saveDraft(archiveId, 1, 'draft', 'md', t.opts);
  writer.finalize(archiveId, 'final', t.opts);

  const summary = reader.getTaskSummary(archiveId, t.opts);
  assert.equal(summary.taskArchiveId, archiveId);
  assert.equal(summary.stepCount, 1);
  assert.equal(summary.sourceCount, 1);
  assert.equal(summary.draftCount, 1);
  assert.equal(summary.hasFinal, true);
  t.cleanup();
});

test('getTaskSummary handles missing archive safely', () => {
  const t = tmpBase();
  const summary = reader.getTaskSummary('entity_x|proj_x|task_x', t.opts);
  assert.equal(summary, null);
  t.cleanup();
});

test('partial archive (steps 0-2 of 5) summarizes correctly', () => {
  const t = tmpBase();
  const p = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(p.id, 'task_partial', { totalSteps: 5 }, { ...t.opts, entityId: 'entity_a' });

  writer.appendStep(archiveId, { stepIndex: 0, description: 's1' }, t.opts);
  writer.appendStep(archiveId, { stepIndex: 1, description: 's2' }, t.opts);
  writer.appendStep(archiveId, { stepIndex: 2, description: 's3' }, t.opts);

  const summary = reader.getTaskSummary(archiveId, t.opts);
  assert.equal(summary.stepCount, 3);
  assert.equal(summary.hasFinal, false);
  t.cleanup();
});

test('getStepHistory returns steps in order', () => {
  const t = tmpBase();
  const p = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(p.id, 'task_order', {}, { ...t.opts, entityId: 'entity_a' });

  writer.appendStep(archiveId, { stepIndex: 0, description: 'first' }, t.opts);
  writer.appendStep(archiveId, { stepIndex: 1, description: 'second' }, t.opts);

  const history = reader.getStepHistory(archiveId, t.opts);
  assert.equal(history.length, 2);
  assert.equal(history[0].description, 'first');
  assert.equal(history[1].description, 'second');
  t.cleanup();
});

test('getSources and getLatestDraft return expected data', () => {
  const t = tmpBase();
  const p = projects.createProject('entity_a', 'A', t.opts);
  const archiveId = writer.createTaskArchive(p.id, 'task_assets', {}, { ...t.opts, entityId: 'entity_a' });

  writer.appendSource(archiveId, { url: 'https://a.com' }, t.opts);
  writer.saveDraft(archiveId, 1, 'draft one', 'md', t.opts);
  writer.saveDraft(archiveId, 2, 'draft two', 'md', t.opts);

  const sources = reader.getSources(archiveId, t.opts);
  const latest = reader.getLatestDraft(archiveId, t.opts);

  assert.equal(sources.length, 1);
  assert.ok(latest);
  assert.ok(latest.content.includes('draft'));
  t.cleanup();
});
