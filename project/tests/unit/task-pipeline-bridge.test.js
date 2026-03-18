const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createTaskPipelineBridge } = require('../../server/brain/tasks/task-pipeline-bridge');

function mkFrontman() {
  const calls = { started: [], mid: [] };
  return {
    calls,
    getActiveSession: () => null,
    startSession: (meta) => { calls.started.push(meta); return meta; },
    handleMidTaskUserMessage: async (_entityId, _message) => {
      calls.mid.push({ _entityId, _message });
      return { handled: true, response: 'handled by frontman', action: 'steer' };
    }
  };
}

test('conversation intent bypasses task fork', async () => {
  const frontman = mkFrontman();
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'conversation', taskType: null, confidence: 0.9 })
  });

  const result = await bridge.detectAndDispatchTask('hello there', { id: 'entity_a', name: 'Neko' }, {});
  assert.equal(result.handled, false);
});

test('low-confidence task intent bypasses companion fork', async () => {
  const frontman = mkFrontman();
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'task', taskType: 'code', confidence: 0.4 })
  });

  const result = await bridge.detectAndDispatchTask('maybe write code', { id: 'entity_a', name: 'Neko' }, {});
  assert.equal(result.handled, false);
});

test('high-confidence planning intent routes to planning orchestrator mode', async () => {
  const frontman = mkFrontman();
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({ connections: [{ type: 'episodic' }] }),
    classifyIntent: async () => ({ intent: 'task', taskType: 'planning', confidence: 0.95 })
  });

  const result = await bridge.detectAndDispatchTask('Plan a research roadmap', { id: 'entity_a', name: 'Neko' }, {});
  assert.equal(result.handled, true);
  assert.equal(result.mode, 'planning');
  assert.ok(result.planningSessionId);
});

test('high-confidence non-planning task routes to frontman+executor path', async () => {
  const frontman = mkFrontman();
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({
      connections: [{ type: 'core_memory', topics: ['user', 'priority'] }]
    }),
    webFetch: null,
    workspaceTools: null,
    classifyIntent: async () => ({ intent: 'task', taskType: 'research', confidence: 0.92 })
  });

  const result = await bridge.detectAndDispatchTask('Research GPU memory trends', {
    id: 'entity_a',
    name: 'Neko',
    workspacePath: ''
  }, {
    aspectConfigs: { main: { type: 'openrouter' } }
  });

  assert.equal(result.handled, true);
  assert.equal(result.mode, 'task');
  assert.ok(result.taskSessionId);
  assert.equal(frontman.calls.started.length, 1);
  assert.ok(frontman.calls.started[0].relationshipSignal);
});

test('active task session + non-task message routes to frontman mid-task handler', async () => {
  const frontman = mkFrontman();
  frontman.getActiveSession = () => ({ sessionId: 'active_s1' });

  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'conversation', taskType: null, confidence: 0.95 })
  });

  const result = await bridge.detectAndDispatchTask('Can you explain what happened?', { id: 'entity_a', name: 'Neko' }, {});
  assert.equal(result.handled, true);
  assert.equal(result.mode, 'frontman_mid_task');
  assert.equal(result.response, 'handled by frontman');
});
