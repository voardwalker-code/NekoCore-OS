// ── Tests · Task Session.Test ────────────────────────────────────────────────────
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

const session = require('../../server/brain/tasks/task-session');
// tempFile()
// WHAT THIS DOES: tempFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call tempFile(...) where this helper behavior is needed.
function tempFile() {
  const dir = path.join(os.tmpdir(), 'nekocore-task-session-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(dir, { recursive: true });
  return {
    dataFile: path.join(dir, 'task-sessions.json'),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

test('createSession/getSession lifecycle works', () => {
  const t = tempFile();
  const created = session.createSession({ entityId: 'e1', taskType: 'research' }, { dataFile: t.dataFile });
  const loaded = session.getSession(created.id, { dataFile: t.dataFile });

  assert.ok(created.id);
  assert.equal(loaded.entityId, 'e1');
  assert.equal(loaded.taskType, 'research');
  assert.equal(loaded.status, 'active');
  t.cleanup();
});

test('updateSession merges sharedContext without dropping old keys', () => {
  const t = tempFile();
  const s = session.createSession({ sharedContext: { a: 1, b: 2 } }, { dataFile: t.dataFile });
  const updated = session.updateSession(s.id, { sharedContext: { b: 3, c: 4 } }, { dataFile: t.dataFile });

  assert.equal(updated.sharedContext.a, 1);
  assert.equal(updated.sharedContext.b, 3);
  assert.equal(updated.sharedContext.c, 4);
  t.cleanup();
});

test('appendStep appends step without overwrite', () => {
  const t = tempFile();
  const s = session.createSession({}, { dataFile: t.dataFile });
  session.appendStep(s.id, { stepIndex: 0, output: 'first' }, { dataFile: t.dataFile });
  session.appendStep(s.id, { stepIndex: 1, output: 'second' }, { dataFile: t.dataFile });

  const loaded = session.getSession(s.id, { dataFile: t.dataFile });
  assert.equal(loaded.steps.length, 2);
  assert.equal(loaded.steps[0].output, 'first');
  assert.equal(loaded.steps[1].output, 'second');
  t.cleanup();
});

test('setStall and clearStall cycle toggles stall state correctly', () => {
  const t = tempFile();
  const s = session.createSession({}, { dataFile: t.dataFile });

  const stalled = session.setStall(s.id, 'Need clarification?', { dataFile: t.dataFile });
  assert.equal(stalled.stall.active, true);
  assert.equal(stalled.stall.question, 'Need clarification?');
  assert.equal(stalled.status, 'stalled');

  const cleared = session.clearStall(s.id, { dataFile: t.dataFile });
  assert.equal(cleared.stall.active, false);
  assert.equal(cleared.stall.question, null);
  assert.equal(cleared.status, 'active');
  t.cleanup();
});

test('appendSteering appends instructions and preserves history', () => {
  const t = tempFile();
  const s = session.createSession({}, { dataFile: t.dataFile });

  session.appendSteering(s.id, 'Use concise output', { dataFile: t.dataFile });
  session.appendSteering(s.id, 'Focus on tests first', { dataFile: t.dataFile });
  const loaded = session.getSession(s.id, { dataFile: t.dataFile });

  assert.equal(loaded.steering.length, 2);
  assert.equal(loaded.steering[0].instruction, 'Use concise output');
  assert.equal(loaded.steering[1].instruction, 'Focus on tests first');
  t.cleanup();
});

test('closeSession updates status', () => {
  const t = tempFile();
  const s = session.createSession({}, { dataFile: t.dataFile });
  const closed = session.closeSession(s.id, 'complete', { dataFile: t.dataFile });
  assert.equal(closed.status, 'complete');
  t.cleanup();
});

test('updateSession derives complete status when completedAt is recorded', () => {
  const t = tempFile();
  const s = session.createSession({}, { dataFile: t.dataFile });
  const updated = session.updateSession(s.id, {
    sharedContext: { completedAt: 12345, finalOutput: 'done' }
  }, { dataFile: t.dataFile });

  assert.equal(updated.status, 'complete');
  t.cleanup();
});

test('getSession repairs stale active sessions that already have completedAt', () => {
  const t = tempFile();
  const s = session.createSession({}, { dataFile: t.dataFile });
  const map = JSON.parse(fs.readFileSync(t.dataFile, 'utf8'));
  map[s.id].status = 'active';
  map[s.id].sharedContext = { completedAt: 12345, finalOutput: 'done' };
  fs.writeFileSync(t.dataFile, JSON.stringify(map, null, 2), 'utf8');

  const repaired = session.getSession(s.id, { dataFile: t.dataFile });
  assert.equal(repaired.status, 'complete');

  const persisted = JSON.parse(fs.readFileSync(t.dataFile, 'utf8'));
  assert.equal(persisted[s.id].status, 'complete');
  t.cleanup();
});

test('pruneOldSessions skips active and stalled sessions', () => {
  const t = tempFile();
  const now = Date.now();

  const active = session.createSession({ status: 'active' }, { dataFile: t.dataFile });
  const stalled = session.createSession({ status: 'active' }, { dataFile: t.dataFile });
  session.setStall(stalled.id, 'waiting', { dataFile: t.dataFile });

  const done = session.createSession({ status: 'complete' }, { dataFile: t.dataFile });
  // Age the completed session directly in fixture storage so prune threshold applies.
  const map = JSON.parse(fs.readFileSync(t.dataFile, 'utf8'));
  map[done.id].updatedAt = now - (10 * 24 * 60 * 60 * 1000);
  fs.writeFileSync(t.dataFile, JSON.stringify(map, null, 2), 'utf8');

  const result = session.pruneOldSessions(5, { dataFile: t.dataFile });
  assert.equal(result.pruned, 1);
  assert.ok(session.getSession(active.id, { dataFile: t.dataFile }));
  assert.ok(session.getSession(stalled.id, { dataFile: t.dataFile }));
  assert.equal(session.getSession(done.id, { dataFile: t.dataFile }), null);
  t.cleanup();
});
