// ── Tests · Llm Tool Use Loop Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:http, ../../server/services/llm-interface. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * Tests for the tool_use loop in llm-interface.js (Anthropic branch).
 * Uses a mock HTTP server to simulate Anthropic API responses with tool_use blocks.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// We need createLLMInterface to build callLLMWithRuntime
const { createLLMInterface } = require('../../server/services/llm-interface');

/**
 * Create a mock Anthropic server that serves canned responses.
 * @param {Function} handler - (reqBody, callIndex) => responseBody
 * @returns {Promise<{ server, port, close }>}
 */
// createMockAnthropicServer()
// WHAT THIS DOES: createMockAnthropicServer creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createMockAnthropicServer(...) before code that depends on this setup.
function createMockAnthropicServer(handler) {
  return new Promise((resolve) => {
    let callIndex = 0;
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const response = handler(body, callIndex++);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        port,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise(r => server.close(r))
      });
    });
  });
}

test('LLM Interface — tool_use loop (Anthropic)', async (t) => {

  await t.test('passes tools array to API request body', async () => {
    let capturedBody = null;
    const mock = await createMockAnthropicServer((body) => {
      capturedBody = body;
      return {
        content: [{ type: 'text', text: 'Hello' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
    });

    try {
      const { callLLMWithRuntime } = createLLMInterface({
        loadConfig: () => ({
          profiles: { test: { anthropic: { apiKey: 'test-key', model: 'claude-test' } } },
          lastActive: 'test'
        }),
        broadcastSSE: () => {},
        logTimeline: () => {},
        entityManager: { listEntities: () => [] }
      });

      const runtime = {
        type: 'anthropic',
        model: 'claude-test',
        apiKey: 'test-key',
        endpoint: `${mock.url}/v1/messages`,
        capabilities: { memoryTool: true }
      };

      const tools = [
        { name: 'memory_search', description: 'Search memories', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }
      ];

      await callLLMWithRuntime(runtime, [{ role: 'user', content: 'hi' }], {
        tools,
        temperature: 0.5,
        contextWindow: 4096,
        maxTokens: 1000
      });

      assert.ok(capturedBody.tools, 'tools should be in request body');
      assert.equal(capturedBody.tools.length, 1);
      assert.equal(capturedBody.tools[0].name, 'memory_search');
    } finally {
      await mock.close();
    }
  });

  await t.test('executes tool_use blocks and sends tool_result back', async () => {
    let callCount = 0;
    const mock = await createMockAnthropicServer((body, idx) => {
      callCount++;
      if (idx === 0) {
        // First call — return tool_use
        return {
          content: [
            { type: 'tool_use', id: 'toolu_001', name: 'memory_search', input: { query: 'cats' } }
          ],
          usage: { input_tokens: 20, output_tokens: 10 }
        };
      }
      // Second call — return final text (after tool_result)
      // Verify tool_result was sent
      const lastMsg = body.messages[body.messages.length - 1];
      assert.equal(lastMsg.role, 'user');
      assert.ok(Array.isArray(lastMsg.content));
      assert.equal(lastMsg.content[0].type, 'tool_result');
      assert.equal(lastMsg.content[0].tool_use_id, 'toolu_001');
      assert.ok(lastMsg.content[0].content.includes('Found 2 memories'));
      return {
        content: [{ type: 'text', text: 'I found some memories about cats.' }],
        usage: { input_tokens: 30, output_tokens: 15 }
      };
    });

    try {
      const { callLLMWithRuntime } = createLLMInterface({
        loadConfig: () => ({
          profiles: { test: { anthropic: { apiKey: 'key', model: 'claude-test' } } },
          lastActive: 'test'
        }),
        broadcastSSE: () => {},
        logTimeline: () => {},
        entityManager: { listEntities: () => [] }
      });

      const runtime = {
        type: 'anthropic',
        model: 'claude-test',
        apiKey: 'key',
        endpoint: `${mock.url}/v1/messages`,
        capabilities: {}
      };

      const result = await callLLMWithRuntime(runtime, [{ role: 'user', content: 'tell me about cats' }], {
        tools: [{ name: 'memory_search', description: 'Search', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }],
        executeToolCall: async (name, input) => {
          assert.equal(name, 'memory_search');
          assert.equal(input.query, 'cats');
          return { content: 'Found 2 memories about cats.' };
        },
        contextWindow: 4096,
        maxTokens: 1000,
        returnUsage: true
      });

      assert.equal(callCount, 2, 'should make two API calls (initial + after tool result)');
      assert.ok(result.content.includes('I found some memories'));
    } finally {
      await mock.close();
    }
  });

  await t.test('handles tool execution errors gracefully', async () => {
    const mock = await createMockAnthropicServer((body, idx) => {
      if (idx === 0) {
        return {
          content: [{ type: 'tool_use', id: 'toolu_err', name: 'memory_read', input: { memory_id: 'bad_id' } }],
          usage: { input_tokens: 10, output_tokens: 5 }
        };
      }
      // Verify error was sent as tool_result
      const lastMsg = body.messages[body.messages.length - 1];
      assert.equal(lastMsg.content[0].is_error, true);
      return {
        content: [{ type: 'text', text: 'Sorry, could not read that memory.' }],
        usage: { input_tokens: 15, output_tokens: 8 }
      };
    });

    try {
      const { callLLMWithRuntime } = createLLMInterface({
        loadConfig: () => ({
          profiles: { test: { anthropic: { apiKey: 'key', model: 'claude-test' } } },
          lastActive: 'test'
        }),
        broadcastSSE: () => {},
        logTimeline: () => {},
        entityManager: { listEntities: () => [] }
      });

      const runtime = {
        type: 'anthropic',
        model: 'claude-test',
        apiKey: 'key',
        endpoint: `${mock.url}/v1/messages`,
        capabilities: {}
      };

      const result = await callLLMWithRuntime(runtime, [{ role: 'user', content: 'read memory' }], {
        tools: [{ name: 'memory_read', description: 'Read', input_schema: { type: 'object', properties: { memory_id: { type: 'string' } }, required: ['memory_id'] } }],
        executeToolCall: async () => { throw new Error('Memory not found'); },
        contextWindow: 4096,
        maxTokens: 1000,
        returnUsage: true
      });

      assert.ok(result.content.includes('could not read'));
    } finally {
      await mock.close();
    }
  });

  await t.test('limits tool rounds to MAX_TOOL_ROUNDS (3)', async () => {
    let apiCallCount = 0;
    const mock = await createMockAnthropicServer(() => {
      apiCallCount++;
      // Always return tool_use to test the limit
      return {
        content: [{ type: 'tool_use', id: `toolu_${apiCallCount}`, name: 'memory_search', input: { query: 'loop' } }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
    });

    try {
      const { callLLMWithRuntime } = createLLMInterface({
        loadConfig: () => ({
          profiles: { test: { anthropic: { apiKey: 'key', model: 'claude-test' } } },
          lastActive: 'test'
        }),
        broadcastSSE: () => {},
        logTimeline: () => {},
        entityManager: { listEntities: () => [] }
      });

      const runtime = {
        type: 'anthropic',
        model: 'claude-test',
        apiKey: 'key',
        endpoint: `${mock.url}/v1/messages`,
        capabilities: {}
      };

      await callLLMWithRuntime(runtime, [{ role: 'user', content: 'loop' }], {
        tools: [{ name: 'memory_search', description: 'Search', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }],
        executeToolCall: async () => ({ content: 'result' }),
        contextWindow: 4096,
        maxTokens: 1000
      });

      // 1 initial call + 3 tool rounds = 4 total API calls max
      assert.ok(apiCallCount <= 4, `Expected at most 4 API calls, got ${apiCallCount}`);
    } finally {
      await mock.close();
    }
  });

  await t.test('no tool loop when executeToolCall not provided', async () => {
    let apiCallCount = 0;
    const mock = await createMockAnthropicServer(() => {
      apiCallCount++;
      return {
        content: [
          { type: 'text', text: 'Some text' },
          { type: 'tool_use', id: 'toolu_X', name: 'memory_search', input: { query: 'test' } }
        ],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
    });

    try {
      const { callLLMWithRuntime } = createLLMInterface({
        loadConfig: () => ({
          profiles: { test: { anthropic: { apiKey: 'key', model: 'claude-test' } } },
          lastActive: 'test'
        }),
        broadcastSSE: () => {},
        logTimeline: () => {},
        entityManager: { listEntities: () => [] }
      });

      const runtime = {
        type: 'anthropic',
        model: 'claude-test',
        apiKey: 'key',
        endpoint: `${mock.url}/v1/messages`,
        capabilities: {}
      };

      const result = await callLLMWithRuntime(runtime, [{ role: 'user', content: 'hi' }], {
        tools: [{ name: 'memory_search', description: 'Search', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }],
        // No executeToolCall provided
        contextWindow: 4096,
        maxTokens: 1000,
        returnUsage: true
      });

      assert.equal(apiCallCount, 1, 'should only make one API call when no handler');
      assert.equal(result.content, 'Some text'); // Only text blocks extracted
    } finally {
      await mock.close();
    }
  });
});
