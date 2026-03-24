'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createLLMInterface } = require('../../server/services/llm-interface');

// ── Mock HTTP Server ─────────────────────────────────────────────────────────
let mockServer = null;
let mockPort = 0;
let lastRequest = null;
let mockResponse = {};

function startMockServer() {
  return new Promise((resolve, reject) => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        lastRequest = {
          method: req.method,
          url: req.url,
          headers: { ...req.headers },
          body: body ? JSON.parse(body) : null
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponse));
      });
    });
    mockServer.listen(0, '127.0.0.1', () => {
      mockPort = mockServer.address().port;
      resolve();
    });
    mockServer.on('error', reject);
  });
}

function stopMockServer() {
  return new Promise(resolve => {
    if (!mockServer) return resolve();
    mockServer.close(() => {
      mockServer = null;
      resolve();
    });
  });
}

function resetMock() {
  lastRequest = null;
  mockResponse = {};
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const { callLLMWithRuntime } = createLLMInterface();

const openrouterRuntime = () => ({
  type: 'openrouter',
  endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
  apiKey: 'sk-test-or-key',
  model: 'openai/gpt-4o'
});

const anthropicRuntime = () => ({
  type: 'anthropic',
  endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
  apiKey: 'sk-ant-test-key',
  model: 'claude-sonnet-4-6'
});

const ollamaRuntime = () => ({
  type: 'ollama',
  endpoint: `http://127.0.0.1:${mockPort}`,
  model: 'llama3.2:3b'
});

const basicMessages = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello' }
];

// ── Test Lifecycle ───────────────────────────────────────────────────────────

test('LLM Interface Guard Tests', async (t) => {
  await startMockServer();
  t.after(() => stopMockServer());

  // ── Input validation ───────────────────────────────────────────────────
  await t.test('rejects null runtime', async () => {
    await assert.rejects(() => callLLMWithRuntime(null, basicMessages), /Invalid runtime/);
  });

  await t.test('rejects empty messages', async () => {
    await assert.rejects(() => callLLMWithRuntime(openrouterRuntime(), []), /Invalid runtime or messages/);
  });

  await t.test('rejects non-array messages', async () => {
    await assert.rejects(() => callLLMWithRuntime(openrouterRuntime(), 'hello'), /Invalid runtime or messages/);
  });

  // ── OpenRouter branch ──────────────────────────────────────────────────
  await t.test('OpenRouter: sends correct headers', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'Hi there' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    await callLLMWithRuntime(openrouterRuntime(), basicMessages);

    assert.equal(lastRequest.headers['content-type'], 'application/json');
    assert.equal(lastRequest.headers.authorization, 'Bearer sk-test-or-key');
  });

  await t.test('OpenRouter: sends correct body shape', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    await callLLMWithRuntime(openrouterRuntime(), basicMessages, { temperature: 0.5, maxTokens: 1000 });

    assert.equal(lastRequest.body.model, 'openai/gpt-4o');
    assert.equal(lastRequest.body.temperature, 0.5);
    assert.equal(lastRequest.body.max_tokens, 1000);
    assert.ok(Array.isArray(lastRequest.body.messages));
    assert.equal(lastRequest.body.messages.length, 2);
  });

  await t.test('OpenRouter: returns plain string by default', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'Hello world' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    const result = await callLLMWithRuntime(openrouterRuntime(), basicMessages);
    assert.equal(typeof result, 'string');
    assert.equal(result, 'Hello world');
  });

  await t.test('OpenRouter: returns { content, usage } with returnUsage', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'Hello world' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    const result = await callLLMWithRuntime(openrouterRuntime(), basicMessages, { returnUsage: true });
    assert.equal(typeof result, 'object');
    assert.equal(result.content, 'Hello world');
    assert.equal(result.usage.prompt_tokens, 10);
    assert.equal(result.usage.completion_tokens, 5);
    assert.equal(result.usage.total_tokens, 15);
  });

  await t.test('OpenRouter: throws on missing API key', async () => {
    const rt = openrouterRuntime();
    rt.apiKey = '';
    await assert.rejects(() => callLLMWithRuntime(rt, basicMessages), /missing API key/);
  });

  await t.test('OpenRouter: throws on missing model', async () => {
    const rt = openrouterRuntime();
    rt.model = '';
    await assert.rejects(() => callLLMWithRuntime(rt, basicMessages), /missing model/);
  });

  await t.test('OpenRouter: adds json response_format when requested', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    await callLLMWithRuntime(openrouterRuntime(), basicMessages, { responseFormat: 'json' });
    assert.deepEqual(lastRequest.body.response_format, { type: 'json_object' });
  });

  // ── Anthropic branch ───────────────────────────────────────────────────
  await t.test('Anthropic: sends correct headers', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hi there' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    await callLLMWithRuntime(anthropicRuntime(), basicMessages);

    assert.equal(lastRequest.headers['content-type'], 'application/json');
    assert.equal(lastRequest.headers['x-api-key'], 'sk-ant-test-key');
    assert.equal(lastRequest.headers['anthropic-version'], '2023-06-01');
  });

  await t.test('Anthropic: extracts system messages into system parameter', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hi' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    await callLLMWithRuntime(anthropicRuntime(), basicMessages);

    // System messages should be in system parameter, not in messages
    assert.ok(Array.isArray(lastRequest.body.system), 'system should be an array');
    assert.equal(lastRequest.body.system.length, 1);
    assert.equal(lastRequest.body.system[0].type, 'text');
    assert.equal(lastRequest.body.system[0].text, 'You are helpful.');
    // Conversation messages should only have user messages
    assert.ok(lastRequest.body.messages.every(m => m.role !== 'system'), 'no system role in messages');
  });

  await t.test('Anthropic: applies cache_control ephemeral on last system block', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hi' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const msgs = [
      { role: 'system', content: 'System prompt part 1' },
      { role: 'system', content: 'System prompt part 2' },
      { role: 'user', content: 'Hello' }
    ];
    // Use explicit no-extended-cache to test standard behavior
    const rt = anthropicRuntime();
    rt.capabilities = { extendedCache: false };
    await callLLMWithRuntime(rt, msgs);

    const sysBlocks = lastRequest.body.system;
    assert.equal(sysBlocks.length, 2);
    // First block: no cache_control
    assert.equal(sysBlocks[0].cache_control, undefined);
    // Last block: has ephemeral cache_control (standard 5-min)
    assert.deepEqual(sysBlocks[1].cache_control, { type: 'ephemeral' });
  });

  await t.test('Anthropic: merges consecutive same-role messages', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'OK' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const msgs = [
      { role: 'user', content: 'First' },
      { role: 'user', content: 'Second' },
      { role: 'assistant', content: 'Reply' }
    ];
    await callLLMWithRuntime(anthropicRuntime(), msgs);

    // Should be merged into 2 messages (merged user, then assistant)
    assert.equal(lastRequest.body.messages.length, 2);
    assert.equal(lastRequest.body.messages[0].role, 'user');
    // Merged content should be an array of text blocks
    assert.ok(Array.isArray(lastRequest.body.messages[0].content));
    assert.equal(lastRequest.body.messages[0].content.length, 2);
    assert.equal(lastRequest.body.messages[1].role, 'assistant');
  });

  await t.test('Anthropic: inserts (continue) if first message is not user role', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'OK' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const msgs = [
      { role: 'assistant', content: 'I said something' },
      { role: 'user', content: 'Now I reply' }
    ];
    await callLLMWithRuntime(anthropicRuntime(), msgs);

    assert.equal(lastRequest.body.messages[0].role, 'user');
    assert.equal(lastRequest.body.messages[0].content, '(continue)');
  });

  await t.test('Anthropic: returns plain string by default', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hello world' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const result = await callLLMWithRuntime(anthropicRuntime(), basicMessages);
    assert.equal(typeof result, 'string');
    assert.equal(result, 'Hello world');
  });

  await t.test('Anthropic: returns { content, usage } with returnUsage', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hello' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 20, output_tokens: 8, cache_read_input_tokens: 15, cache_creation_input_tokens: 5 }
    };
    const result = await callLLMWithRuntime(anthropicRuntime(), basicMessages, { returnUsage: true });
    assert.equal(typeof result, 'object');
    assert.equal(result.content, 'Hello');
    assert.equal(result.usage.prompt_tokens, 20);
    assert.equal(result.usage.completion_tokens, 8);
    assert.equal(result.usage.cache_read_input_tokens, 15);
    assert.equal(result.usage.cache_creation_input_tokens, 5);
  });

  await t.test('Anthropic: joins multiple text content blocks', async () => {
    resetMock();
    mockResponse = {
      content: [
        { type: 'text', text: 'Part 1 ' },
        { type: 'text', text: 'Part 2' }
      ],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const result = await callLLMWithRuntime(anthropicRuntime(), basicMessages);
    assert.equal(result, 'Part 1 Part 2');
  });

  await t.test('Anthropic: throws on missing API key', async () => {
    const rt = anthropicRuntime();
    rt.apiKey = '';
    await assert.rejects(() => callLLMWithRuntime(rt, basicMessages), /missing API key/);
  });

  await t.test('Anthropic: throws on missing model', async () => {
    const rt = anthropicRuntime();
    rt.model = '';
    await assert.rejects(() => callLLMWithRuntime(rt, basicMessages), /missing model/);
  });

  // ── Extended cache (Slice 3) ───────────────────────────────────────────
  await t.test('Anthropic: extended cache adds beta header and TTL', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hi' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedCache: true };
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.headers['anthropic-beta'], 'prompt-caching-2024-07-31');
    // cache_control should have ttl: '1h' (string, per Anthropic API spec)
    const sysBlocks = lastRequest.body.system;
    const lastBlock = sysBlocks[sysBlocks.length - 1];
    assert.deepEqual(lastBlock.cache_control, { type: 'ephemeral', ttl: '1h' });
  });

  await t.test('Anthropic: standard cache when extendedCache is false', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hi' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    // No beta header
    assert.equal(lastRequest.headers['anthropic-beta'], undefined);
    // Standard ephemeral cache_control (no ttl)
    const sysBlocks = lastRequest.body.system;
    const lastBlock = sysBlocks[sysBlocks.length - 1];
    assert.deepEqual(lastBlock.cache_control, { type: 'ephemeral' });
  });

  await t.test('Anthropic: default (no capabilities) uses standard 5-min cache', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Hi' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    // No capabilities on runtime — falls through to provider defaults
    // Anthropic default has extendedCache: true, so it should use extended cache
    await callLLMWithRuntime(anthropicRuntime(), basicMessages);

    // Anthropic provider default has extendedCache=true
    assert.equal(lastRequest.headers['anthropic-beta'], 'prompt-caching-2024-07-31');
  });

  await t.test('OpenRouter: not affected by extended cache capability', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    const rt = openrouterRuntime();
    rt.capabilities = { extendedCache: true }; // Should be ignored for OpenRouter
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.headers['anthropic-beta'], undefined);
  });

  // ── Anthropic API compaction (Slice 5) ─────────────────────────────────
  // API compaction is currently hard-disabled for stability (useApiCompaction = false).
  await t.test('Anthropic: context_management NOT sent when compaction hard-disabled', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'OK' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { compaction: 'api', extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.body.context_management, undefined,
      'context_management must not be sent while hard-disabled');
  });

  await t.test('Anthropic: no context_management when compaction=prompt', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'OK' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { compaction: 'prompt', extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.body.context_management, undefined);
  });

  await t.test('Anthropic: no context_management when compaction=false', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'OK' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { compaction: false, extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.body.context_management, undefined);
  });

  await t.test('Anthropic: logs compaction stop_reason', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Compacted response' }],
      stop_reason: 'compaction',
      usage: { input_tokens: 50, output_tokens: 20 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { compaction: 'api', extendedCache: false };
    const result = await callLLMWithRuntime(rt, basicMessages);

    // Should still return the content despite compaction stop_reason
    assert.equal(result, 'Compacted response');
  });

  // ── Anthropic native thinking (Slice 7) ────────────────────────────────
  await t.test('Anthropic: adds thinking parameter when extendedThinking=api', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Thoughtful response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 30, output_tokens: 15 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedThinking: 'api', extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    assert.ok(lastRequest.body.thinking, 'should have thinking parameter');
    assert.equal(lastRequest.body.thinking.type, 'enabled');
    assert.equal(lastRequest.body.thinking.budget_tokens, 4096);
    assert.equal(lastRequest.body.temperature, undefined, 'temperature must be removed when thinking is enabled');
  });

  await t.test('Anthropic: uses custom thinking budget from capabilities', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Deep thought' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 30, output_tokens: 15 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedThinking: 'api', thinkingBudget: 8192, extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.body.thinking.budget_tokens, 8192);
  });

  await t.test('Anthropic: no thinking parameter when extendedThinking=prompt', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'OK' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedThinking: 'prompt', extendedCache: false };
    await callLLMWithRuntime(rt, basicMessages);

    assert.equal(lastRequest.body.thinking, undefined);
    assert.ok(lastRequest.body.temperature !== undefined, 'temperature should remain');
  });

  await t.test('Anthropic: extracts thinking blocks from response', async () => {
    resetMock();
    mockResponse = {
      content: [
        { type: 'thinking', thinking: 'I need to analyze this carefully...' },
        { type: 'text', text: 'The answer is 42.' }
      ],
      stop_reason: 'end_turn',
      usage: { input_tokens: 30, output_tokens: 25 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedThinking: 'api', extendedCache: false };
    const result = await callLLMWithRuntime(rt, basicMessages, { returnUsage: true });

    // Content should only include text blocks
    assert.equal(result.content, 'The answer is 42.');
    // Thinking content should be returned separately
    assert.equal(result.thinkingContent, 'I need to analyze this carefully...');
  });

  await t.test('Anthropic: no thinkingContent when response has no thinking blocks', async () => {
    resetMock();
    mockResponse = {
      content: [{ type: 'text', text: 'Simple response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 }
    };
    const rt = anthropicRuntime();
    rt.capabilities = { extendedCache: false };
    const result = await callLLMWithRuntime(rt, basicMessages, { returnUsage: true });

    assert.equal(result.content, 'Simple response');
    assert.equal(result.thinkingContent, undefined);
  });

  // ── Ollama branch ──────────────────────────────────────────────────────
  await t.test('Ollama: sends correct body shape', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'Ollama says hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
    await callLLMWithRuntime(ollamaRuntime(), basicMessages, { temperature: 0.3, maxTokens: 500 });

    assert.equal(lastRequest.body.model, 'llama3.2:3b');
    assert.equal(lastRequest.body.temperature, 0.3);
    assert.equal(lastRequest.body.max_tokens, 500);
    assert.ok(Array.isArray(lastRequest.body.messages));
    // Ollama passes messages as-is (no system extraction)
    assert.equal(lastRequest.body.messages.length, 2);
  });

  await t.test('Ollama: no Authorization header', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    await callLLMWithRuntime(ollamaRuntime(), basicMessages);

    assert.equal(lastRequest.headers.authorization, undefined);
    assert.equal(lastRequest.headers['x-api-key'], undefined);
  });

  await t.test('Ollama: includes context window options when specified', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    await callLLMWithRuntime(ollamaRuntime(), basicMessages, { contextWindow: 4096, maxTokens: 512 });

    assert.ok(lastRequest.body.options, 'options should be present');
    assert.equal(lastRequest.body.options.num_ctx, 4096);
    assert.equal(lastRequest.body.options.num_predict, 512);
  });

  await t.test('Ollama: returns plain string by default', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'Local model' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    const result = await callLLMWithRuntime(ollamaRuntime(), basicMessages);
    assert.equal(typeof result, 'string');
    assert.equal(result, 'Local model');
  });

  await t.test('Ollama: returns { content, usage } with returnUsage', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'Local' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    const result = await callLLMWithRuntime(ollamaRuntime(), basicMessages, { returnUsage: true });
    assert.equal(typeof result, 'object');
    assert.equal(result.content, 'Local');
    assert.equal(result.usage.prompt_tokens, 5);
    assert.equal(result.usage.completion_tokens, 3);
    assert.equal(result.usage.total_tokens, 8);
  });

  await t.test('Ollama: adds json format when requested', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    await callLLMWithRuntime(ollamaRuntime(), basicMessages, { responseFormat: 'json' });
    assert.equal(lastRequest.body.format, 'json');
  });

  await t.test('Ollama: throws on missing endpoint', async () => {
    const rt = { type: 'ollama', endpoint: '', model: 'llama3.2:3b' };
    await assert.rejects(() => callLLMWithRuntime(rt, basicMessages), /missing endpoint/);
  });

  await t.test('Ollama: appends /v1/chat/completions to base endpoint', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    await callLLMWithRuntime(ollamaRuntime(), basicMessages);

    // The request URL should include /v1/chat/completions
    assert.ok(lastRequest.url.includes('/v1/chat/completions'), `URL was: ${lastRequest.url}`);
  });

  // ── Default parameter behavior ─────────────────────────────────────────
  await t.test('defaults temperature to 0.35 when not specified', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    await callLLMWithRuntime(openrouterRuntime(), basicMessages);
    assert.equal(lastRequest.body.temperature, 0.35);
  });

  await t.test('defaults max_tokens to 16000 when not specified', async () => {
    resetMock();
    mockResponse = {
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };
    await callLLMWithRuntime(openrouterRuntime(), basicMessages);
    assert.equal(lastRequest.body.max_tokens, 16000);
  });
});
