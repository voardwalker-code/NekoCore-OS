'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMemoryToolSchemas,
  isMemoryTool,
  executeMemoryToolCall,
  createMemoryToolBridge,
  MAX_TOOL_ROUNDS
} = require('../../server/services/memory-tool-bridge');

test('Memory Tool Bridge — schemas', async (t) => {

  await t.test('getMemoryToolSchemas returns exactly 4 tool definitions', () => {
    const schemas = getMemoryToolSchemas();
    assert.equal(schemas.length, 4);
    const names = schemas.map(s => s.name);
    assert.deepEqual(names.sort(), ['memory_list', 'memory_read', 'memory_search', 'memory_store']);
  });

  await t.test('each schema has name, description, and input_schema', () => {
    for (const schema of getMemoryToolSchemas()) {
      assert.equal(typeof schema.name, 'string');
      assert.equal(typeof schema.description, 'string');
      assert.ok(schema.input_schema);
      assert.equal(schema.input_schema.type, 'object');
      assert.ok(schema.input_schema.properties);
    }
  });

  await t.test('schemas are frozen', () => {
    const schemas = getMemoryToolSchemas();
    assert.ok(Object.isFrozen(schemas));
  });

  await t.test('memory_search requires query', () => {
    const schema = getMemoryToolSchemas().find(s => s.name === 'memory_search');
    assert.deepEqual(schema.input_schema.required, ['query']);
  });

  await t.test('memory_store requires semantic', () => {
    const schema = getMemoryToolSchemas().find(s => s.name === 'memory_store');
    assert.deepEqual(schema.input_schema.required, ['semantic']);
  });

  await t.test('memory_read requires memory_id', () => {
    const schema = getMemoryToolSchemas().find(s => s.name === 'memory_read');
    assert.deepEqual(schema.input_schema.required, ['memory_id']);
  });

  await t.test('memory_list has no required fields', () => {
    const schema = getMemoryToolSchemas().find(s => s.name === 'memory_list');
    assert.equal(schema.input_schema.required, undefined);
  });
});

test('Memory Tool Bridge — isMemoryTool', async (t) => {

  await t.test('recognises all four memory tools', () => {
    assert.ok(isMemoryTool('memory_search'));
    assert.ok(isMemoryTool('memory_store'));
    assert.ok(isMemoryTool('memory_read'));
    assert.ok(isMemoryTool('memory_list'));
  });

  await t.test('rejects unknown tool names', () => {
    assert.equal(isMemoryTool('memory_delete'), false);
    assert.equal(isMemoryTool('web_search'), false);
    assert.equal(isMemoryTool(''), false);
    assert.equal(isMemoryTool(null), false);
    assert.equal(isMemoryTool(undefined), false);
  });
});

test('Memory Tool Bridge — executeMemoryToolCall', async (t) => {

  // ── memory_search ─────────────────────────────────────────────────────
  await t.test('memory_search calls deps.memorySearch with query', async () => {
    let capturedQuery = null;
    const deps = {
      memorySearch: async (q) => {
        capturedQuery = q;
        return { ok: true, memories: [{ id: 'mem_1', semantic: 'hello', topics: ['test'] }], message: 'Found 1' };
      }
    };
    const result = await executeMemoryToolCall('memory_search', { query: 'cats' }, deps);
    assert.equal(capturedQuery, 'cats');
    assert.equal(result.is_error, undefined);
    const parsed = JSON.parse(result.content);
    assert.equal(parsed.count, 1);
  });

  await t.test('memory_search returns error when query is empty', async () => {
    const result = await executeMemoryToolCall('memory_search', { query: '' }, {});
    assert.equal(result.is_error, true);
    assert.ok(result.content.includes('query'));
  });

  await t.test('memory_search returns error when deps.memorySearch is missing', async () => {
    const result = await executeMemoryToolCall('memory_search', { query: 'test' }, {});
    assert.equal(result.is_error, true);
  });

  await t.test('memory_search handles search failure gracefully', async () => {
    const deps = { memorySearch: async () => ({ ok: false, error: 'DB down' }) };
    const result = await executeMemoryToolCall('memory_search', { query: 'test' }, deps);
    assert.equal(result.is_error, true);
    assert.ok(result.content.includes('DB down'));
  });

  await t.test('memory_search caps results at 10', async () => {
    const deps = {
      memorySearch: async () => ({
        ok: true,
        memories: Array.from({ length: 20 }, (_, i) => ({ id: `mem_${i}`, semantic: `m${i}` })),
        message: 'Found 20'
      })
    };
    const result = await executeMemoryToolCall('memory_search', { query: 'all' }, deps);
    const parsed = JSON.parse(result.content);
    assert.equal(parsed.count, 10);
  });

  // ── memory_store ──────────────────────────────────────────────────────
  await t.test('memory_store calls deps.memoryCreate with params', async () => {
    let capturedParams = null;
    const deps = {
      memoryCreate: async (params) => {
        capturedParams = params;
        return { ok: true, memId: 'mem_new' };
      }
    };
    const result = await executeMemoryToolCall('memory_store', {
      semantic: 'remember this',
      importance: 0.8,
      emotion: 'joy',
      topics: 'testing,memory'
    }, deps);
    assert.equal(result.is_error, undefined);
    assert.ok(result.content.includes('mem_new'));
    assert.equal(capturedParams.semantic, 'remember this');
    assert.equal(capturedParams.emotion, 'joy');
    assert.equal(capturedParams.topics, 'testing,memory');
  });

  await t.test('memory_store returns error when semantic is empty', async () => {
    const result = await executeMemoryToolCall('memory_store', {}, {});
    assert.equal(result.is_error, true);
  });

  await t.test('memory_store returns error when memoryCreate missing', async () => {
    const result = await executeMemoryToolCall('memory_store', { semantic: 'test' }, {});
    assert.equal(result.is_error, true);
  });

  await t.test('memory_store defaults importance to 0.5', async () => {
    let capturedParams = null;
    const deps = {
      memoryCreate: async (params) => {
        capturedParams = params;
        return { ok: true, memId: 'mem_x' };
      }
    };
    await executeMemoryToolCall('memory_store', { semantic: 'test' }, deps);
    assert.equal(capturedParams.importance, '0.5');
  });

  // ── memory_read ───────────────────────────────────────────────────────
  await t.test('memory_read calls memoryStorage.retrieveMemory', async () => {
    let capturedId = null;
    const deps = {
      memoryStorage: {
        retrieveMemory: async (id) => {
          capturedId = id;
          return {
            id: 'mem_42', memory_id: 'mem_42', type: 'semantic',
            semantic: 'stored fact', topics: ['ai'], emotionalTag: 'curious',
            importance: 0.7, decay: 0.1, created: '2026-01-01', access_count: 3
          };
        }
      }
    };
    const result = await executeMemoryToolCall('memory_read', { memory_id: 'mem_42' }, deps);
    assert.equal(capturedId, 'mem_42');
    assert.equal(result.is_error, undefined);
    const parsed = JSON.parse(result.content);
    assert.equal(parsed.id, 'mem_42');
    assert.equal(parsed.semantic, 'stored fact');
    assert.equal(parsed.importance, 0.7);
  });

  await t.test('memory_read returns error when id empty', async () => {
    const result = await executeMemoryToolCall('memory_read', {}, {});
    assert.equal(result.is_error, true);
  });

  await t.test('memory_read returns error when memory not found', async () => {
    const deps = { memoryStorage: { retrieveMemory: async () => null } };
    const result = await executeMemoryToolCall('memory_read', { memory_id: 'mem_nope' }, deps);
    assert.equal(result.is_error, true);
    assert.ok(result.content.includes('not found'));
  });

  await t.test('memory_read returns error when memoryStorage missing', async () => {
    const result = await executeMemoryToolCall('memory_read', { memory_id: 'mem_1' }, {});
    assert.equal(result.is_error, true);
  });

  // ── memory_list ───────────────────────────────────────────────────────
  await t.test('memory_list calls memoryStorage.listMemories', async () => {
    let capturedLimit = null;
    const deps = {
      memoryStorage: {
        listMemories: async (limit) => {
          capturedLimit = limit;
          return [
            { id: 'mem_1', type: 'semantic', topics: ['test'], importance: 0.5, decay: 0, created: '2026-01-01' },
            { id: 'mem_2', type: 'episodic', topics: ['chat'], importance: 0.3, decay: 0.1, created: '2026-01-02' }
          ];
        }
      }
    };
    const result = await executeMemoryToolCall('memory_list', { limit: 5 }, deps);
    assert.equal(capturedLimit, 5);
    const parsed = JSON.parse(result.content);
    assert.equal(parsed.count, 2);
  });

  await t.test('memory_list defaults limit to 10', async () => {
    let capturedLimit = null;
    const deps = {
      memoryStorage: { listMemories: async (limit) => { capturedLimit = limit; return []; } }
    };
    await executeMemoryToolCall('memory_list', {}, deps);
    assert.equal(capturedLimit, 10);
  });

  await t.test('memory_list caps limit at 50', async () => {
    let capturedLimit = null;
    const deps = {
      memoryStorage: { listMemories: async (limit) => { capturedLimit = limit; return []; } }
    };
    await executeMemoryToolCall('memory_list', { limit: 200 }, deps);
    assert.equal(capturedLimit, 50);
  });

  await t.test('memory_list returns error when memoryStorage missing', async () => {
    const result = await executeMemoryToolCall('memory_list', {}, {});
    assert.equal(result.is_error, true);
  });

  // ── unknown tool ──────────────────────────────────────────────────────
  await t.test('unknown tool returns is_error', async () => {
    const result = await executeMemoryToolCall('memory_delete', {}, {});
    assert.equal(result.is_error, true);
    assert.ok(result.content.includes('Unknown'));
  });

  // ── null deps ─────────────────────────────────────────────────────────
  await t.test('null deps returns is_error', async () => {
    const result = await executeMemoryToolCall('memory_search', { query: 'test' }, null);
    assert.equal(result.is_error, true);
  });
});

test('Memory Tool Bridge — createMemoryToolBridge', async (t) => {

  await t.test('returns a function (wrapCallLLM)', () => {
    const bridge = createMemoryToolBridge({ memorySearch: async () => {}, memoryCreate: async () => {} });
    assert.equal(typeof bridge, 'function');
  });

  await t.test('wrapCallLLM returns a function (wrappedCallLLM)', () => {
    const bridge = createMemoryToolBridge({ memorySearch: async () => {}, memoryCreate: async () => {} });
    const wrappedCallLLM = bridge(async () => ({}));
    assert.equal(typeof wrappedCallLLM, 'function');
  });

  await t.test('passes through for non-Anthropic runtimes', async () => {
    let callArgs = null;
    const originalCallLLM = async (runtime, messages, options) => {
      callArgs = { runtime, messages, options };
      return { content: 'hello' };
    };
    const bridge = createMemoryToolBridge({ memorySearch: async () => {}, memoryCreate: async () => {} });
    const wrapped = bridge(originalCallLLM);

    const runtime = { type: 'openrouter', model: 'gpt-4' };
    const messages = [{ role: 'user', content: 'hi' }];
    const result = await wrapped(runtime, messages, { temperature: 0.5 });

    assert.equal(result.content, 'hello');
    assert.equal(callArgs.runtime, runtime);
    assert.equal(callArgs.options.temperature, 0.5);
    assert.equal(callArgs.options.tools, undefined); // No tool injection
    assert.equal(callArgs.options.executeToolCall, undefined);
  });

  await t.test('passes through for Anthropic without memoryTool capability', async () => {
    let callArgs = null;
    const originalCallLLM = async (runtime, messages, options) => {
      callArgs = { runtime, messages, options };
      return { content: 'hello' };
    };
    const bridge = createMemoryToolBridge({ memorySearch: async () => {}, memoryCreate: async () => {} });
    const wrapped = bridge(originalCallLLM);

    const runtime = { type: 'anthropic', model: 'claude-sonnet', capabilities: {} };
    await wrapped(runtime, [{ role: 'user', content: 'hi' }], {});

    assert.equal(callArgs.options.tools, undefined);
    assert.equal(callArgs.options.executeToolCall, undefined);
  });

  await t.test('injects tools and executeToolCall for Anthropic with memoryTool=true', async () => {
    let callArgs = null;
    const originalCallLLM = async (runtime, messages, options) => {
      callArgs = { runtime, messages, options };
      return { content: 'hello' };
    };
    const bridge = createMemoryToolBridge({ memorySearch: async () => {}, memoryCreate: async () => {} });
    const wrapped = bridge(originalCallLLM);

    const runtime = { type: 'anthropic', model: 'claude-sonnet', capabilities: { memoryTool: true } };
    await wrapped(runtime, [{ role: 'user', content: 'hi' }], { temperature: 0.5 });

    assert.ok(Array.isArray(callArgs.options.tools));
    assert.equal(callArgs.options.tools.length, 4);
    assert.equal(typeof callArgs.options.executeToolCall, 'function');
    assert.equal(callArgs.options.temperature, 0.5); // Preserved
  });

  await t.test('injects tools for Anthropic with memoryTool="api"', async () => {
    let callArgs = null;
    const originalCallLLM = async (runtime, messages, options) => {
      callArgs = { runtime, messages, options };
      return { content: 'result' };
    };
    const bridge = createMemoryToolBridge({ memorySearch: async () => {}, memoryCreate: async () => {} });
    const wrapped = bridge(originalCallLLM);

    const runtime = { type: 'anthropic', model: 'claude-sonnet', capabilities: { memoryTool: 'api' } };
    await wrapped(runtime, [], {});

    assert.ok(Array.isArray(callArgs.options.tools));
    assert.equal(typeof callArgs.options.executeToolCall, 'function');
  });

  await t.test('injected executeToolCall routes to bridge deps', async () => {
    let searchCalled = false;
    const bridge = createMemoryToolBridge({
      memorySearch: async (q) => { searchCalled = true; return { ok: true, memories: [], message: 'ok' }; },
      memoryCreate: async () => ({})
    });
    let capturedExecute = null;
    const originalCallLLM = async (runtime, messages, options) => {
      capturedExecute = options.executeToolCall;
      return { content: 'done' };
    };
    const wrapped = bridge(originalCallLLM);
    const runtime = { type: 'anthropic', model: 'x', capabilities: { memoryTool: true } };
    await wrapped(runtime, [], {});

    // Now call the injected executeToolCall
    const result = await capturedExecute('memory_search', { query: 'find me' });
    assert.ok(searchCalled);
    assert.equal(result.is_error, undefined);
  });
});

test('Memory Tool Bridge — MAX_TOOL_ROUNDS constant', async (t) => {

  await t.test('MAX_TOOL_ROUNDS is 3', () => {
    assert.equal(MAX_TOOL_ROUNDS, 3);
  });
});
