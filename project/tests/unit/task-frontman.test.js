// ── Tests · Task Frontman.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/brain/tasks/task-event-bus,
// ../../server/brain/tasks/task-frontman. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

const { test } = require('node:test');
const assert = require('node:assert/strict');

const taskEventBus = require('../../server/brain/tasks/task-event-bus');
const { createTaskFrontman } = require('../../server/brain/tasks/task-frontman');
// wait()
// WHAT THIS DOES: wait is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call wait(...) where this helper behavior is needed.
function wait(ms = 25) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('milestone event triggers frontman synthesis + chat message', async () => {
  const sse = [];
  const frontman = createTaskFrontman({
    callLLMWithRuntime: async () => 'Milestone update to user.',
    broadcastSSE: (event, payload) => sse.push({ event, payload }),
    resumeWithInput: () => true,
    sessionStore: {
      appendSteering() {},
      clearStall() {},
      closeSession() {}
    }
  });

  const meta = frontman.startSession({
    sessionId: 'fm_s1',
    entityId: 'entity_a',
    entity: { name: 'NekoCore' },
    relationshipSignal: 'trusted'
  });

  assert.equal(meta.sessionId, 'fm_s1');

  taskEventBus.emit('fm_s1', {
    type: 'milestone',
    stepIndex: 0,
    stepTotal: 2,
    stepDescription: 'Collect sources'
  });

  await wait();

  const chat = sse.find((x) => x.event === 'chat_follow_up');
  const taskEvt = sse.find((x) => x.event === 'task_milestone');
  assert.ok(chat);
  assert.ok(taskEvt);
  assert.ok(String(chat.payload.message || '').length > 0);
});

test('needs_input marks stalled and resume path returns handled response', async () => {
  const sse = [];
  let resumed = null;
  const frontman = createTaskFrontman({
    callLLMWithRuntime: async () => 'I need your input.',
    broadcastSSE: (event, payload) => sse.push({ event, payload }),
    resumeWithInput: (sessionId, answer) => {
      resumed = { sessionId, answer };
      return true;
    },
    sessionStore: {
      appendSteering() {},
      clearStall() {},
      closeSession() {}
    }
  });

  frontman.startSession({
    sessionId: 'fm_s2',
    entityId: 'entity_b',
    entity: { name: 'NekoCore' },
    relationshipSignal: 'collaborative'
  });

  taskEventBus.emit('fm_s2', {
    type: 'needs_input',
    question: 'Which scope should I use?'
  });
  await wait();

  const active = frontman.getActiveSession('entity_b');
  assert.ok(active);
  assert.equal(active.stalled, true);

  const routed = await frontman.handleMidTaskUserMessage('entity_b', 'Use project scope', { isNewTaskIntent: false });
  assert.equal(routed.handled, true);
  assert.equal(routed.action, 'resume');
  assert.ok(resumed);
  assert.equal(resumed.sessionId, 'fm_s2');
  assert.equal(resumed.answer, 'Use project scope');
});

test('mid-task steering injects guidance and emits steering event', async () => {
  const sse = [];
  const steering = [];
  const frontman = createTaskFrontman({
    callLLMWithRuntime: async () => 'Course corrected.',
    broadcastSSE: (event, payload) => sse.push({ event, payload }),
    resumeWithInput: () => false,
    sessionStore: {
      appendSteering: (id, text) => steering.push({ id, text }),
      clearStall() {},
      closeSession() {}
    }
  });

  frontman.startSession({
    sessionId: 'fm_s3',
    entityId: 'entity_c',
    entity: { name: 'NekoCore' },
    relationshipSignal: 'neutral'
  });

  const routed = await frontman.handleMidTaskUserMessage('entity_c', 'Prioritize the test fixes first', { isNewTaskIntent: false });
  assert.equal(routed.handled, true);
  assert.equal(routed.action, 'steer');
  assert.equal(steering.length, 1);
  assert.equal(steering[0].id, 'fm_s3');

  const steeringEvt = sse.find((x) => x.event === 'task_steering_injected');
  assert.ok(steeringEvt);
});

test('task_complete and task_error close active sessions', async () => {
  const frontman = createTaskFrontman({
    callLLMWithRuntime: async () => 'Summary.',
    broadcastSSE: () => {},
    resumeWithInput: () => false,
    sessionStore: {
      appendSteering() {},
      clearStall() {},
      closeSession() {}
    }
  });

  frontman.startSession({
    sessionId: 'fm_s4',
    entityId: 'entity_d',
    entity: { name: 'NekoCore' },
    relationshipSignal: 'neutral'
  });

  taskEventBus.emit('fm_s4', { type: 'task_complete' });
  await wait();
  assert.equal(frontman.getActiveSession('entity_d'), null);

  frontman.startSession({
    sessionId: 'fm_s5',
    entityId: 'entity_e',
    entity: { name: 'NekoCore' },
    relationshipSignal: 'neutral'
  });
  taskEventBus.emit('fm_s5', { type: 'task_error', error: 'network timeout' });
  await wait();
  assert.equal(frontman.getActiveSession('entity_e'), null);
});
