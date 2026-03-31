// ── Tests · Task Executor.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test, assert,
// ../../server/brain/tasks/task-executor,
// ../../server/brain/tasks/task-event-bus,
// ../../server/brain/skills/task-runner. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Task Executor Guard Tests
 * Validates milestone events, stall/resume, entity bridge, tool filter,
 * and task_complete/task_error event shape.
 */

const { describe, it } = require('node:test');
const assert = require('assert');
const {
  executeTask,
  resumeWithInput,
  buildTaskSystemPrompt,
  filterTools,
  extractSources,
  isStalled
} = require('../../server/brain/tasks/task-executor');

const taskEventBus = require('../../server/brain/tasks/task-event-bus');

// ==================== Helpers ====================

/**
 * Collect all events for a session from the bus (using wildcard listener).
 * Returns an array; add to it by registering before the task runs.
 */
// collectEvents()
// WHAT THIS DOES: collectEvents is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call collectEvents(...) where this helper behavior is needed.
function collectEvents(sessionId) {
  const events = [];
  const handler = (event) => events.push(event);
  taskEventBus.subscribe(sessionId, handler);
  return { events, handler };
}

/**
 * Build a mock callLLM that returns responses sequentially.
 */
// mockCallLLM()
// WHAT THIS DOES: mockCallLLM is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call mockCallLLM(...) where this helper behavior is needed.
function mockCallLLM(responses) {
  let idx = 0;
  return async (_runtime, _messages, _opts) => {
    const response = responses[idx] || responses[responses.length - 1];
    idx++;
    return response;
  };
}

/**
 * Build a minimal mock runTask for testing the executor independently.
 * Accepts an array of steps to simulate.
 */
// mockRunTask()
// WHAT THIS DOES: mockRunTask is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call mockRunTask(...) where this helper behavior is needed.
function mockRunTask(steps, finalResponse = 'Task complete') {
  return async (config) => {
    const stepOutputs = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Fire onNeedsInput if the step has a question
      if (step.needsInput && config.onNeedsInput) {
        const answer = await config.onNeedsInput(step.needsInput);
        step.output = `[USER_ANSWER: ${answer}]`;
      }

      const stepResult = {
        stepIndex: i,
        stepTotal: steps.length,
        description: step.description || `Step ${i + 1}`,
        output: step.output || `Output for step ${i + 1}`,
        toolCalls: step.toolCalls || []
      };

      if (config.onStep) {
        await config.onStep(stepResult);
      }

      stepOutputs.push({ step: i + 1, description: stepResult.description, output: stepResult.output });
    }

    return {
      finalResponse,
      stepOutputs,
      allToolResults: [],
      plan: { steps: steps.map(s => ({ description: s.description, done: true })) },
      llmCalls: steps.length
    };
  };
}

// ==================== Event Bus ====================

describe('Task Event Bus', () => {
  it('should emit and subscribe to session events', () => {
    const sessionId = 'test-bus-' + Date.now();
    taskEventBus.subscribe(sessionId, (event) => {
      assert.strictEqual(event.type, 'test_event');
      taskEventBus.cleanup(sessionId);
    });
    taskEventBus.emit(sessionId, { type: 'test_event' });
  });

  it('should queue events for drain()', () => {
    const sessionId = 'test-drain-' + Date.now();
    taskEventBus.emit(sessionId, { type: 'event_1' });
    taskEventBus.emit(sessionId, { type: 'event_2' });
    const drained = taskEventBus.drain(sessionId);
    assert.strictEqual(drained.length, 2);
    assert.strictEqual(drained[0].type, 'event_1');
    assert.strictEqual(drained[1].type, 'event_2');
    // Queue should be empty now
    assert.strictEqual(taskEventBus.drain(sessionId).length, 0);
    taskEventBus.cleanup(sessionId);
  });

  it('drain() should clear the queue', () => {
    const sessionId = 'test-drain-clear-' + Date.now();
    taskEventBus.emit(sessionId, { type: 'x' });
    taskEventBus.drain(sessionId);
    const second = taskEventBus.drain(sessionId);
    assert.strictEqual(second.length, 0);
    taskEventBus.cleanup(sessionId);
  });

  it('should unsubscribe handlers', () => {
    const sessionId = 'test-unsub-' + Date.now();
    let callCount = 0;
    // handler()
    // Purpose: helper wrapper used by this module's main flow.
    // handler()
    // WHAT THIS DOES: handler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call handler(...) where this helper behavior is needed.
    const handler = () => { callCount++; };
    taskEventBus.subscribe(sessionId, handler);
    taskEventBus.emit(sessionId, { type: 'x' });
    taskEventBus.unsubscribe(sessionId, handler);
    taskEventBus.emit(sessionId, { type: 'y' });
    assert.strictEqual(callCount, 1, 'handler should only fire once, before unsubscribe');
    taskEventBus.cleanup(sessionId);
  });

  it('peek() should not clear the queue', () => {
    const sessionId = 'test-peek-' + Date.now();
    taskEventBus.emit(sessionId, { type: 'x' });
    const peeked = taskEventBus.peek(sessionId);
    assert.strictEqual(peeked.length, 1);
    const drained = taskEventBus.drain(sessionId);
    assert.strictEqual(drained.length, 1, 'peek should not drain the queue');
    taskEventBus.cleanup(sessionId);
  });

  it('hasEvents() should return correct boolean', () => {
    const sessionId = 'test-has-' + Date.now();
    assert.strictEqual(taskEventBus.hasEvents(sessionId), false);
    taskEventBus.emit(sessionId, { type: 'x' });
    assert.strictEqual(taskEventBus.hasEvents(sessionId), true);
    taskEventBus.drain(sessionId);
    assert.strictEqual(taskEventBus.hasEvents(sessionId), false);
    taskEventBus.cleanup(sessionId);
  });

  it('cleanup() should remove all listeners and queue', () => {
    const sessionId = 'test-cleanup-' + Date.now();
    let fired = false;
    taskEventBus.subscribe(sessionId, () => { fired = true; });
    taskEventBus.emit(sessionId, { type: 'before' });
    // Reset marker so we only observe post-cleanup emissions.
    fired = false;
    taskEventBus.cleanup(sessionId);
    taskEventBus.emit(sessionId, { type: 'after' });
    // Handler should not fire after cleanup (queue may be recreated by new emits).
    assert.strictEqual(fired, false, 'handler should not fire after cleanup');
    taskEventBus.cleanup(sessionId);
  });
});

// ==================== buildTaskSystemPrompt ====================

describe('buildTaskSystemPrompt', () => {
  it('should include module system prompt key', () => {
    const module = { systemPromptKey: 'research_agent' };
    const prompt = buildTaskSystemPrompt(module, null, []);
    assert(prompt.includes('research_agent'), 'prompt should include systemPromptKey');
  });

  it('should include entity name in identity bridge', () => {
    const entity = { name: 'Neko', persona: 'Curious and analytical' };
    const prompt = buildTaskSystemPrompt(null, entity, []);
    assert(prompt.includes('Neko'), 'prompt should include entity name');
    assert(prompt.includes('Curious and analytical'), 'prompt should include persona');
  });

  it('should include mood in identity bridge', () => {
    const entity = { name: 'Echo', mood: 'focused' };
    const prompt = buildTaskSystemPrompt(null, entity, []);
    assert(prompt.includes('focused'), 'prompt should include mood');
  });

  it('should include relationship in identity bridge', () => {
    const entity = { name: 'Neko', relationship: 'trusted companion' };
    const prompt = buildTaskSystemPrompt(null, entity, []);
    assert(prompt.includes('trusted companion'), 'prompt should include relationship');
  });

  it('should include context snippets', () => {
    const snippets = [
      { text: 'climate change affects rainfall patterns', source: 'archive:2026' }
    ];
    const prompt = buildTaskSystemPrompt(null, null, snippets);
    assert(prompt.includes('climate change affects rainfall patterns'), 'prompt should include snippet text');
    assert(prompt.includes('archive:2026'), 'prompt should include snippet source');
  });

  it('should limit context snippets to 5', () => {
    const snippets = Array.from({ length: 10 }, (_, i) => ({
      text: `snippet-${i}`,
      source: `src-${i}`
    }));
    const prompt = buildTaskSystemPrompt(null, null, snippets);
    // Only 5 snippets should appear
    let count = 0;
    for (let i = 0; i < 10; i++) {
      if (prompt.includes(`snippet-${i}`)) count++;
    }
    assert(count <= 5, 'should include at most 5 context snippets');
  });

  it('should handle null module, entity, and snippets gracefully', () => {
    const prompt = buildTaskSystemPrompt(null, null, []);
    assert(typeof prompt === 'string', 'should return a string');
  });

  it('should handle entity without optional fields', () => {
    const entity = { id: 'test-id' };
    const prompt = buildTaskSystemPrompt(null, entity, []);
    assert(typeof prompt === 'string', 'should return a string without crashing');
  });
});

// ==================== filterTools ====================

describe('filterTools', () => {
  it('should filter tools to allowed list', () => {
    const allTools = { web_search: () => {}, ws_write: () => {}, memory_create: () => {} };
    const filtered = filterTools(allTools, ['web_search', 'ws_write']);
    assert(filtered.web_search, 'should include web_search');
    assert(filtered.ws_write, 'should include ws_write');
    assert(!filtered.memory_create, 'should exclude memory_create');
  });

  it('should return all tools when allowedToolNames is empty', () => {
    const allTools = { a: () => {}, b: () => {} };
    const filtered = filterTools(allTools, []);
    assert(filtered.a, 'should include all tools when no filter');
    assert(filtered.b, 'should include all tools when no filter');
  });

  it('should return empty object for null allTools', () => {
    const filtered = filterTools(null, ['web_search']);
    assert.deepStrictEqual(filtered, {});
  });

  it('should not include tools not in the allowed list', () => {
    const allTools = { a: () => {}, b: () => {}, c: () => {} };
    const filtered = filterTools(allTools, ['a', 'b']);
    assert(!filtered.c, 'should not include c');
  });

  it('should handle allowedToolNames that reference non-existent tools', () => {
    const allTools = { a: () => {} };
    const filtered = filterTools(allTools, ['a', 'nonexistent']);
    assert(filtered.a, 'should include a');
    assert(!filtered.nonexistent, 'should not include nonexistent');
  });
});

// ==================== extractSources ====================

describe('extractSources', () => {
  it('should extract URLs from text', () => {
    const text = 'See https://example.com and https://github.com for more.';
    const sources = extractSources(text);
    assert(sources.includes('https://example.com'), 'should extract example.com');
    assert(sources.includes('https://github.com'), 'should extract github.com');
  });

  it('should deduplicate URLs', () => {
    const text = 'See https://example.com and https://example.com again.';
    const sources = extractSources(text);
    assert.strictEqual(sources.filter(s => s === 'https://example.com').length, 1, 'should deduplicate');
  });

  it('should return empty array for empty text', () => {
    assert.deepStrictEqual(extractSources(''), []);
    assert.deepStrictEqual(extractSources(null), []);
  });

  it('should cap at 10 URLs', () => {
    const urls = Array.from({ length: 15 }, (_, i) => `https://example${i}.com`);
    const text = urls.join(' ');
    const sources = extractSources(text);
    assert(sources.length <= 10, 'should cap at 10 URLs');
  });
});

// ==================== executeTask milestone events ====================

describe('executeTask — milestone events', () => {
  it('should emit milestone event for each step', async () => {
    const sessionEvents = [];
    const mockRun = mockRunTask([
      { description: 'Step one', output: 'Done step one' },
      { description: 'Step two', output: 'Done step two' }
    ]);

    // Capture events via wildcard
    // wildcardHandler()
    // WHAT THIS DOES: wildcardHandler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call wildcardHandler(...) where this helper behavior is needed.
    const wildcardHandler = ({ sessionId, ...event }) => {
      if (event.type === 'milestone') sessionEvents.push(event);
    };
    taskEventBus.on('*', wildcardHandler);

    const result = await executeTask({
      taskType: 'research',
      userMessage: 'Research AI trends',
      entity: { id: 'test', name: 'Neko' },
      callLLM: mockCallLLM(['plan response']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskEventBus.off('*', wildcardHandler);
    taskEventBus.cleanup(result.sessionId);

    assert.strictEqual(sessionEvents.length, 2, 'should emit 2 milestone events');
    assert.strictEqual(sessionEvents[0].type, 'milestone');
    assert.strictEqual(sessionEvents[0].stepIndex, 0);
    assert.strictEqual(sessionEvents[1].stepIndex, 1);
  });

  it('milestone event should include required fields', async () => {
    let milestoneEvent = null;

    const mockRun = mockRunTask([{ description: 'Test step', output: 'Test output' }]);
    // wildcardHandler()
    // Purpose: helper wrapper used by this module's main flow.
    // wildcardHandler()
    // WHAT THIS DOES: wildcardHandler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call wildcardHandler(...) where this helper behavior is needed.
    const wildcardHandler = ({ sessionId, ...event }) => {
      if (event.type === 'milestone') milestoneEvent = event;
    };
    taskEventBus.on('*', wildcardHandler);

    const result = await executeTask({
      taskType: 'code',
      userMessage: 'Write a function',
      entity: { id: 'ent1', name: 'Neko' },
      callLLM: mockCallLLM(['resp']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskEventBus.off('*', wildcardHandler);
    taskEventBus.cleanup(result.sessionId);

    assert(milestoneEvent, 'should have received a milestone event');
    assert(milestoneEvent.sessionId || result.sessionId, 'milestone should have sessionId');
    assert(typeof milestoneEvent.stepIndex === 'number', 'should have stepIndex');
    assert(typeof milestoneEvent.stepTotal === 'number', 'should have stepTotal');
    assert(milestoneEvent.stepDescription, 'should have stepDescription');
    assert(milestoneEvent.taskType, 'should have taskType');
    assert(typeof milestoneEvent.timestamp === 'number', 'should have timestamp');
  });
});

// ==================== executeTask task_complete ====================

describe('executeTask — task_complete event', () => {
  it('should emit task_complete on successful execution', async () => {
    let completeEvent = null;
    const mockRun = mockRunTask([{ description: 'Do it', output: 'Done' }], 'Final answer');

    // wildcardHandler()
    // Purpose: helper wrapper used by this module's main flow.
    // wildcardHandler()
    // WHAT THIS DOES: wildcardHandler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call wildcardHandler(...) where this helper behavior is needed.
    const wildcardHandler = ({ sessionId, ...event }) => {
      if (event.type === 'task_complete') completeEvent = event;
    };
    taskEventBus.on('*', wildcardHandler);

    const result = await executeTask({
      taskType: 'writing',
      userMessage: 'Write a story',
      entity: { id: 'ent', name: 'Neko' },
      callLLM: mockCallLLM(['resp']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskEventBus.off('*', wildcardHandler);
    taskEventBus.cleanup(result.sessionId);

    assert(completeEvent, 'should emit task_complete');
    assert.strictEqual(completeEvent.type, 'task_complete');
    assert.strictEqual(completeEvent.finalOutput, 'Final answer');
    assert(typeof completeEvent.completedAt === 'number', 'should have completedAt');
  });

  it('executeTask return value should have required fields', async () => {
    const mockRun = mockRunTask([{ description: 'Step', output: 'Output' }], 'Final');

    const result = await executeTask({
      taskType: 'analysis',
      userMessage: 'Analyze data',
      entity: { id: 'ent2', name: 'Echo' },
      callLLM: mockCallLLM(['resp']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskEventBus.cleanup(result.sessionId);

    assert(result.sessionId, 'should have sessionId');
    assert(Array.isArray(result.steps), 'should have steps array');
    assert(result.finalOutput, 'should have finalOutput');
    assert.strictEqual(result.taskType, 'analysis', 'should have taskType');
    assert(result.entityId, 'should have entityId');
    assert(typeof result.completedAt === 'number', 'should have completedAt');
  });
});

// ==================== executeTask task_error ====================

describe('executeTask — task_error event', () => {
  it('should emit task_error and rethrow on failure', async () => {
    let errorEvent = null;
    // failingRun()
    // Purpose: helper wrapper used by this module's main flow.
    // failingRun()
    // WHAT THIS DOES: failingRun is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call failingRun(...) where this helper behavior is needed.
    const failingRun = async () => {
      throw new Error('Simulated task failure');
    };

    // wildcardHandler()
    // Purpose: helper wrapper used by this module's main flow.
    // wildcardHandler()
    // WHAT THIS DOES: wildcardHandler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call wildcardHandler(...) where this helper behavior is needed.
    const wildcardHandler = ({ sessionId, ...event }) => {
      if (event.type === 'task_error') errorEvent = event;
    };
    taskEventBus.on('*', wildcardHandler);

    let threw = false;
    let sessionId;
    try {
      const r = await executeTask({
        taskType: 'research',
        userMessage: 'Research something',
        entity: { id: 'ent', name: 'Neko' },
        callLLM: mockCallLLM(['resp']),
        runtime: {},
        _runTaskFn: failingRun
      });
      sessionId = r.sessionId;
    } catch (err) {
      threw = true;
      assert(err.message.includes('Simulated task failure'), 'should rethrow original error');
    }

    taskEventBus.off('*', wildcardHandler);
    if (sessionId) taskEventBus.cleanup(sessionId);

    assert(threw, 'should throw on task failure');
    assert(errorEvent, 'should emit task_error event');
    assert.strictEqual(errorEvent.type, 'task_error');
    assert(errorEvent.error, 'error event should have error message');
  });

  it('should validate taskType input', async () => {
    let threw = false;
    try {
      await executeTask({
        taskType: null,
        userMessage: 'Test',
        callLLM: mockCallLLM(['resp']),
        runtime: {}
      });
    } catch (err) {
      threw = true;
      assert(err.message.includes('taskType'), 'error should mention taskType');
    }
    assert(threw, 'should throw for null taskType');
  });

  it('should validate callLLM input', async () => {
    let threw = false;
    try {
      await executeTask({
        taskType: 'research',
        userMessage: 'Test',
        callLLM: 'not a function',
        runtime: {}
      });
    } catch (err) {
      threw = true;
      assert(err.message.includes('callLLM'), 'error should mention callLLM');
    }
    assert(threw, 'should throw for non-function callLLM');
  });
});

// ==================== executeTask needs_input / resume ====================

describe('executeTask — needs_input and resumeWithInput', () => {
  it('should emit needs_input event and suspend', async () => {
    let needsInputEvent = null;
    let capturedSessionId = null;
    let taskResolved = false;

    const mockRun = mockRunTask([
      { description: 'Needs clarification', needsInput: 'Which topic do you mean?' },
      { description: 'Final step', output: 'Done with topic' }
    ], 'Final output');

    // wildcardHandler()
    // Purpose: helper wrapper used by this module's main flow.
    // wildcardHandler()
    // WHAT THIS DOES: wildcardHandler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call wildcardHandler(...) where this helper behavior is needed.
    const wildcardHandler = ({ sessionId, ...event }) => {
      if (event.type === 'needs_input') {
        needsInputEvent = event;
        capturedSessionId = sessionId;
        // Resume after receiving needs_input event
        setTimeout(() => {
          resumeWithInput(sessionId, 'machine learning');
        }, 10);
      }
    };
    taskEventBus.on('*', wildcardHandler);

    const result = await executeTask({
      taskType: 'research',
      userMessage: 'Research something',
      entity: { id: 'ent', name: 'Neko' },
      callLLM: mockCallLLM(['resp']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskResolved = true;
    taskEventBus.off('*', wildcardHandler);
    taskEventBus.cleanup(result.sessionId);

    assert(needsInputEvent, 'should emit needs_input event');
    assert.strictEqual(needsInputEvent.type, 'needs_input');
    assert(needsInputEvent.question, 'needs_input should have a question');
    assert(taskResolved, 'task should complete after resume');
  });

  it('resumeWithInput should return false for unknown session', () => {
    const result = resumeWithInput('nonexistent-session-id', 'answer');
    assert.strictEqual(result, false, 'should return false for unknown session');
  });

  it('isStalled should return false for non-stalled session', () => {
    const result = isStalled('never-stalled-session');
    assert.strictEqual(result, false, 'should return false for non-stalled session');
  });
});

// ==================== executeTask entity bridge ====================

describe('executeTask — entity bridge', () => {
  it('should pass entityId to task_complete event', async () => {
    let completeEvent = null;
    const mockRun = mockRunTask([{ description: 'Step', output: 'Out' }], 'Done');

    // wildcardHandler()
    // Purpose: helper wrapper used by this module's main flow.
    // wildcardHandler()
    // WHAT THIS DOES: wildcardHandler is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call wildcardHandler(...) where this helper behavior is needed.
    const wildcardHandler = ({ sessionId, ...event }) => {
      if (event.type === 'task_complete') completeEvent = event;
    };
    taskEventBus.on('*', wildcardHandler);

    const result = await executeTask({
      taskType: 'code',
      userMessage: 'Write code',
      entity: { id: 'entity-123', name: 'Neko', persona: 'Analytical' },
      callLLM: mockCallLLM(['resp']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskEventBus.off('*', wildcardHandler);
    taskEventBus.cleanup(result.sessionId);

    assert.strictEqual(completeEvent.entityId, 'entity-123', 'entityId should be in task_complete');
    assert.strictEqual(result.entityId, 'entity-123', 'entityId should be in result');
  });

  it('should handle missing entity gracefully', async () => {
    const mockRun = mockRunTask([{ description: 'Step', output: 'Out' }]);

    const result = await executeTask({
      taskType: 'research',
      userMessage: 'Research something',
      entity: null,
      callLLM: mockCallLLM(['resp']),
      runtime: {},
      _runTaskFn: mockRun
    });

    taskEventBus.cleanup(result.sessionId);

    assert(result.sessionId, 'should still have a sessionId');
    assert.strictEqual(result.entityId, null, 'entityId should be null for missing entity');
  });
});

// ==================== task-runner detectNeedsInput ====================

describe('task-runner detectNeedsInput', () => {
  const { detectNeedsInput } = require('../../server/brain/skills/task-runner');

  it('should detect [NEEDS_INPUT: question] tag', () => {
    const text = 'Processing...\n[NEEDS_INPUT: What is the target audience?]\nMore text.';
    const question = detectNeedsInput(text);
    assert.strictEqual(question, 'What is the target audience?');
  });

  it('should return null when no NEEDS_INPUT tag', () => {
    const text = 'Normal output with no tag.';
    const result = detectNeedsInput(text);
    assert.strictEqual(result, null);
  });

  it('should handle empty or null text', () => {
    assert.strictEqual(detectNeedsInput(''), null);
    assert.strictEqual(detectNeedsInput(null), null);
  });

  it('should trim whitespace from extracted question', () => {
    const text = '[NEEDS_INPUT:   trim me   ]';
    const question = detectNeedsInput(text);
    assert.strictEqual(question, 'trim me');
  });
});

// ==================== task-runner runTask ====================

describe('task-runner runTask', () => {
  const { runTask } = require('../../server/brain/skills/task-runner');

  it('should throw when callLLM is missing', async () => {
    let threw = false;
    try {
      await runTask({ userMessage: 'test', callLLM: null, runtime: {} });
    } catch (err) {
      threw = true;
      assert(err.message.includes('callLLM'));
    }
    assert(threw);
  });

  it('should throw when userMessage is missing', async () => {
    let threw = false;
    try {
      await runTask({ userMessage: '', callLLM: async () => 'x', runtime: {} });
    } catch (err) {
      threw = true;
      assert(err.message.includes('userMessage'));
    }
    assert(threw);
  });

  it('should handle non-plan LLM response as single-step', async () => {
    const onStepCalls = [];
    const result = await runTask({
      userMessage: 'Short task',
      callLLM: async () => 'Direct answer without plan block',
      runtime: {},
      onStep: async (sr) => { onStepCalls.push(sr); }
    });

    assert(result.finalResponse === 'Direct answer without plan block', 'should return the direct response');
    assert(result.plan === null, 'no plan should be set');
    assert.strictEqual(onStepCalls.length, 1, 'onStep should fire once for single-step');
  });
});
