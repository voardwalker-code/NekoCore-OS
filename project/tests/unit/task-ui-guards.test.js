'use strict';

// ============================================================
// T-7 Task UI Guard Slice
// Locks the ownership boundary for task badge, history panel,
// SSE delegation hook, and telemetry task state.
//
// Sections:
//   1. task-ui.js exists and owns required functions/globals
//   2. chat.js delegates task SSE events (does NOT own them)
//   3. telemetry-ui.js exposes taskState in runtimeTelemetry
//   4. index.html includes task-ui.js and task HTML hooks
//   5. Function ownership negations (task logic NOT in chat.js)
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const taskUiSrc   = read('client/js/apps/optional/task-ui.js');
const chatSrc     = read('client/js/apps/core/chat.js');
const telemetrySrc = read('client/js/apps/core/telemetry-ui.js');
const indexHtml   = read('client/index.html');
const tabChatHtml = read('client/apps/core/tab-chat.html');
const tabActivityHtml = read('client/apps/core/tab-activity.html');

// ── 1. task-ui.js ownership ──────────────────────────────────────────────────

test('task-ui.js exists and is non-empty', () => {
  assert.ok(taskUiSrc.length > 200, 'task-ui.js should be a non-trivial file');
});

test('task-ui.js owns window.handleTaskSSEEvent', () => {
  assert.ok(
    taskUiSrc.includes('window.handleTaskSSEEvent'),
    'task-ui.js must define window.handleTaskSSEEvent'
  );
});

test('task-ui.js owns openTaskHistory', () => {
  assert.ok(
    taskUiSrc.includes('function openTaskHistory'),
    'task-ui.js must define openTaskHistory()'
  );
});

test('task-ui.js owns closeTaskHistory', () => {
  assert.ok(
    taskUiSrc.includes('function closeTaskHistory'),
    'task-ui.js must define closeTaskHistory()'
  );
});

test('task-ui.js owns openTaskSessionDetail', () => {
  assert.ok(
    taskUiSrc.includes('function openTaskSessionDetail'),
    'task-ui.js must define openTaskSessionDetail()'
  );
});

test('task-ui.js owns cancelActiveTask', () => {
  assert.ok(
    taskUiSrc.includes('function cancelActiveTask'),
    'task-ui.js must define cancelActiveTask()'
  );
});

test('task-ui.js owns _taskUIRenderBadge', () => {
  assert.ok(
    taskUiSrc.includes('function _taskUIRenderBadge'),
    'task-ui.js must define _taskUIRenderBadge()'
  );
});

test('task-ui.js exports window.openTaskHistory', () => {
  assert.ok(
    taskUiSrc.includes('window.openTaskHistory = openTaskHistory'),
    'task-ui.js must export openTaskHistory as window global'
  );
});

test('task-ui.js exports window.cancelActiveTask', () => {
  assert.ok(
    taskUiSrc.includes('window.cancelActiveTask = cancelActiveTask'),
    'task-ui.js must export cancelActiveTask as window global'
  );
});

// ── 2. chat.js delegates task SSE events — does NOT own them ─────────────────

test('chat.js delegates task_milestone to window.handleTaskSSEEvent', () => {
  assert.ok(
    chatSrc.includes('handleTaskSSEEvent') && chatSrc.includes('task_milestone'),
    'chat.js must delegate task_milestone via window.handleTaskSSEEvent'
  );
});

test('chat.js delegates task_complete to window.handleTaskSSEEvent', () => {
  assert.ok(
    chatSrc.includes('task_complete'),
    'chat.js must register task_complete SSE event'
  );
});

test('chat.js delegates task_error to window.handleTaskSSEEvent', () => {
  assert.ok(
    chatSrc.includes('task_error'),
    'chat.js must register task_error SSE event'
  );
});

test('chat.js does NOT own _taskUI state', () => {
  assert.ok(
    !chatSrc.includes('const _taskUI =') && !chatSrc.includes('let _taskUI ='),
    'chat.js must not own _taskUI state object — belongs in task-ui.js'
  );
});

test('chat.js does NOT own openTaskHistory', () => {
  assert.ok(
    !chatSrc.includes('function openTaskHistory'),
    'chat.js must not define openTaskHistory() — belongs in task-ui.js'
  );
});

test('chat.js does NOT own cancelActiveTask', () => {
  assert.ok(
    !chatSrc.includes('function cancelActiveTask'),
    'chat.js must not define cancelActiveTask() — belongs in task-ui.js'
  );
});

// ── 3. telemetry-ui.js taskState ─────────────────────────────────────────────

test('runtimeTelemetry includes taskState field', () => {
  assert.ok(
    telemetrySrc.includes('taskState:'),
    'runtimeTelemetry in telemetry-ui.js must include taskState field'
  );
});

test('updateTaskManagerView renders tmActiveTaskSection', () => {
  assert.ok(
    telemetrySrc.includes('tmActiveTaskSection'),
    'updateTaskManagerView must reference tmActiveTaskSection element'
  );
});

// ── 4. index.html includes task-ui.js and task HTML hooks ────────────────────

test('index.html includes task-ui.js script', () => {
  assert.ok(
    indexHtml.includes('task-ui.js'),
    'index.html must include a <script src="...task-ui.js"> tag'
  );
});

test('index.html includes task-ui.js before boot.js', () => {
  const taskUiPos = indexHtml.indexOf('task-ui.js');
  const bootPos  = indexHtml.indexOf('boot.js');
  assert.ok(taskUiPos > -1, 'task-ui.js must be in index.html');
  assert.ok(bootPos  > -1, 'boot.js must be in index.html');
  assert.ok(taskUiPos < bootPos, 'task-ui.js must appear before boot.js in index.html');
});

test('tab-chat.html has taskStatusBadge element', () => {
  assert.ok(
    tabChatHtml.includes('taskStatusBadge'),
    'tab-chat.html must include taskStatusBadge element'
  );
});

test('tab-chat.html has taskHistoryPanel element', () => {
  assert.ok(
    tabChatHtml.includes('taskHistoryPanel'),
    'tab-chat.html must include taskHistoryPanel element'
  );
});

test('tab-chat.html has taskDetailPanel element', () => {
  assert.ok(
    tabChatHtml.includes('taskDetailPanel'),
    'tab-chat.html must include taskDetailPanel element'
  );
});

test('tab-activity.html has tmActiveTaskSection element', () => {
  assert.ok(
    tabActivityHtml.includes('tmActiveTaskSection'),
    'tab-activity.html must include tmActiveTaskSection element in Task Manager'
  );
});

// ── 5. task logic negations — not in wrong files ─────────────────────────────

test('task-ui.js does NOT contain chat pipeline logic (sendChatMessage)', () => {
  assert.ok(
    !taskUiSrc.includes('function sendChatMessage'),
    'task-ui.js must not define sendChatMessage — belongs in chat.js'
  );
});

test('task-ui.js does NOT contain brain SSE init (initBrainSSE)', () => {
  assert.ok(
    !taskUiSrc.includes('function initBrainSSE'),
    'task-ui.js must not define initBrainSSE — belongs in chat.js'
  );
});
