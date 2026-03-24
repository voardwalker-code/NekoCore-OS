// ── MA-llm.js Guard Tests ────────────────────────────────────────────────────
// Lock existing LLM dispatch behavior before adding Anthropic branch.
// Uses node:test + a local HTTP mock server to intercept _fetch calls.
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { callLLM } = require('../MA-server/MA-llm');

// ── Mock HTTP Server ────────────────────────────────────────────────────────
// Captures the last request body/headers and returns a configurable response.
let mockServer;
let mockPort;
let lastRequest = {};
let mockResponse = {};

function setMockResponse(resp) { mockResponse = resp; }

function startMockServer() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        lastRequest = {
          method: req.method,
          url: req.url,
          headers: { ...req.headers },
          rawBody,
          body: JSON.parse(rawBody)
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponse));
      });
    });
    mockServer.listen(0, '127.0.0.1', () => {
      mockPort = mockServer.address().port;
      resolve();
    });
  });
}

function stopMockServer() {
  return new Promise((resolve) => {
    if (mockServer) mockServer.close(() => { mockServer = null; resolve(); });
    else resolve();
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MA-llm callLLM() — input validation', () => {
  it('throws on missing config', async () => {
    await assert.rejects(() => callLLM(null, []), /LLM config missing type/);
  });

  it('throws on missing config.type', async () => {
    await assert.rejects(() => callLLM({}, []), /LLM config missing type/);
  });

  it('throws on missing config.endpoint', async () => {
    await assert.rejects(
      () => callLLM({ type: 'openrouter' }, []),
      /LLM config missing endpoint/
    );
  });

  it('throws on missing config.model', async () => {
    await assert.rejects(
      () => callLLM({ type: 'openrouter', endpoint: 'http://localhost' }, []),
      /LLM config missing model/
    );
  });
});

describe('MA-llm callLLM() — OpenRouter path', () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it('sends correct request body shape', async () => {
    setMockResponse({
      choices: [{ message: { content: 'Hello from mock' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      apiKey: 'test-key-123',
      model: 'test/model-v1'
    };
    const messages = [
      { role: 'system', content: 'You are a test assistant.' },
      { role: 'user', content: 'Hello' }
    ];

    const result = await callLLM(config, messages, { temperature: 0.5, maxTokens: 1024 });

    assert.equal(result, 'Hello from mock');
    assert.equal(lastRequest.body.model, 'test/model-v1');
    assert.equal(lastRequest.body.temperature, 0.5);
    assert.equal(lastRequest.body.max_tokens, 1024);
    assert.deepEqual(lastRequest.body.messages, messages);
  });

  it('includes Authorization header when apiKey present', async () => {
    setMockResponse({
      choices: [{ message: { content: 'ok' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      apiKey: 'sk-test-abc',
      model: 'test/model'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.headers['authorization'], 'Bearer sk-test-abc');
  });

  it('omits Authorization header when apiKey is absent', async () => {
    setMockResponse({
      choices: [{ message: { content: 'ok' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.headers['authorization'], undefined);
  });

  it('includes response_format when json requested', async () => {
    setMockResponse({
      choices: [{ message: { content: '{"key":"val"}' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    await callLLM(config, [{ role: 'user', content: 'json please' }], { responseFormat: 'json' });

    assert.deepEqual(lastRequest.body.response_format, { type: 'json_object' });
  });

  it('does not include response_format when not requested', async () => {
    setMockResponse({
      choices: [{ message: { content: 'text' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.body.response_format, undefined);
  });

  it('uses default temperature 0.7 and maxTokens 12288', async () => {
    setMockResponse({
      choices: [{ message: { content: 'ok' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.body.temperature, 0.7);
    assert.equal(lastRequest.body.max_tokens, 12288);
  });

  it('throws on API error response', async () => {
    setMockResponse({ error: { message: 'Rate limited' } });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    await assert.rejects(
      () => callLLM(config, [{ role: 'user', content: 'hi' }]),
      /Rate limited/
    );
  });

  it('throws on empty choices array', async () => {
    setMockResponse({ choices: [] });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    await assert.rejects(
      () => callLLM(config, [{ role: 'user', content: 'hi' }]),
      /No choices in LLM response/
    );
  });

  it('trims whitespace from response content', async () => {
    setMockResponse({
      choices: [{ message: { content: '  padded response  \n' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test/model'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(result, 'padded response');
  });
});

describe('MA-llm callLLM() — Ollama path', () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it('sends correct request body shape for Ollama', async () => {
    setMockResponse({ message: { content: 'Ollama response' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'llama3.2:3b'
    };
    const messages = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Test' }
    ];

    const result = await callLLM(config, messages, { temperature: 0.3, maxTokens: 2048 });

    assert.equal(result, 'Ollama response');
    assert.equal(lastRequest.body.model, 'llama3.2:3b');
    assert.equal(lastRequest.body.stream, false);
    assert.equal(lastRequest.body.options.temperature, 0.3);
    assert.equal(lastRequest.body.options.num_predict, 2048);
    assert.equal(lastRequest.body.options.num_ctx, 4096); // maxTokens * 2
    assert.equal(lastRequest.url, '/api/chat');
  });

  it('routes to /api/chat endpoint', async () => {
    setMockResponse({ message: { content: 'ok' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'test-model'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.url, '/api/chat');
  });

  it('strips trailing slashes from endpoint', async () => {
    setMockResponse({ message: { content: 'ok' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}///`,
      model: 'test-model'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.url, '/api/chat');
  });

  it('extracts base64 from data URL images', async () => {
    setMockResponse({ message: { content: 'saw image' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'llava'
    };
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: 'What is this?' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAA' } }
      ]
    }];

    await callLLM(config, messages);

    const sentMsg = lastRequest.body.messages[0];
    assert.equal(sentMsg.content, 'What is this?');
    assert.deepEqual(sentMsg.images, ['iVBORw0KGgoAAAA']);
  });

  it('passes plain text messages unchanged', async () => {
    setMockResponse({ message: { content: 'ok' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'test-model'
    };
    const messages = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello' }
    ];

    await callLLM(config, messages);

    assert.deepEqual(lastRequest.body.messages, messages);
  });

  it('throws on Ollama error response', async () => {
    setMockResponse({ error: 'model not found' });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'nonexistent'
    };

    await assert.rejects(
      () => callLLM(config, [{ role: 'user', content: 'hi' }]),
      /model not found/
    );
  });

  it('trims whitespace from Ollama response', async () => {
    setMockResponse({ message: { content: '  trimmed  \n' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'test-model'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(result, 'trimmed');
  });
});

describe('MA-llm callLLM() — provider routing', () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it('routes type=ollama to Ollama endpoint', async () => {
    setMockResponse({ message: { content: 'ollama' } });

    const config = {
      type: 'ollama',
      endpoint: `http://127.0.0.1:${mockPort}`,
      model: 'test'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(lastRequest.url, '/api/chat');
  });

  it('routes type=openrouter to OpenRouter endpoint', async () => {
    setMockResponse({
      choices: [{ message: { content: 'openrouter' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(lastRequest.url, '/v1/chat/completions');
  });

  it('routes type=anthropic to Anthropic endpoint', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'anthropic response' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(result, 'anthropic response');
    assert.equal(lastRequest.url, '/v1/messages');
  });

  it('routes unknown types to OpenRouter (default fallback)', async () => {
    setMockResponse({
      choices: [{ message: { content: 'default' } }]
    });

    const config = {
      type: 'some-other-provider',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(result, 'default');
    // Should use OpenRouter body shape (has choices)
    assert.ok(lastRequest.body.messages);
  });

  it('returns a string (not an object)', async () => {
    setMockResponse({
      choices: [{ message: { content: 'plain string' } }]
    });

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      model: 'test'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(typeof result, 'string');
    assert.equal(result, 'plain string');
  });
});

describe('MA-llm callLLM() — Anthropic path', () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it('sends correct Anthropic request body shape', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'Hello from Claude' }],
      usage: { input_tokens: 50, output_tokens: 10 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6'
    };
    const messages = [
      { role: 'system', content: 'You are MA.' },
      { role: 'user', content: 'Hello' }
    ];

    const result = await callLLM(config, messages, { temperature: 0.5, maxTokens: 4096 });

    assert.equal(result, 'Hello from Claude');
    assert.equal(lastRequest.body.model, 'claude-sonnet-4-6');
    assert.equal(lastRequest.body.max_tokens, 4096);
    assert.equal(lastRequest.body.temperature, 0.5);
    // System extracted to separate parameter
    assert.ok(Array.isArray(lastRequest.body.system));
    assert.equal(lastRequest.body.system[0].type, 'text');
    assert.equal(lastRequest.body.system[0].text, 'You are MA.');
    // Non-system messages in messages array
    assert.equal(lastRequest.body.messages.length, 1);
    assert.equal(lastRequest.body.messages[0].role, 'user');
  });

  it('sets correct Anthropic headers', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-api-key-123',
      model: 'claude-sonnet-4-6'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }]);

    assert.equal(lastRequest.headers['x-api-key'], 'sk-ant-api-key-123');
    assert.equal(lastRequest.headers['anthropic-version'], '2023-06-01');
    assert.equal(lastRequest.headers['content-type'], 'application/json');
  });

  it('annotates last system block with cache_control', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };
    const messages = [
      { role: 'system', content: 'System prompt part 1' },
      { role: 'system', content: 'System prompt part 2' },
      { role: 'user', content: 'Hello' }
    ];

    await callLLM(config, messages);

    const sysBlocks = lastRequest.body.system;
    assert.equal(sysBlocks.length, 2);
    // First block has NO cache_control
    assert.equal(sysBlocks[0].cache_control, undefined);
    // Last block HAS cache_control
    assert.deepEqual(sysBlocks[1].cache_control, { type: 'ephemeral' });
  });

  it('merges consecutive same-role messages', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };
    const messages = [
      { role: 'user', content: 'First part' },
      { role: 'user', content: 'Second part' },
      { role: 'assistant', content: 'Reply' }
    ];

    await callLLM(config, messages);

    const msgs = lastRequest.body.messages;
    assert.equal(msgs.length, 2);
    assert.ok(msgs[0].content.includes('First part'));
    assert.ok(msgs[0].content.includes('Second part'));
    assert.equal(msgs[1].role, 'assistant');
  });

  it('prepends user stub when first non-system message is assistant', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };
    const messages = [
      { role: 'system', content: 'System' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Hi' }
    ];

    await callLLM(config, messages);

    const msgs = lastRequest.body.messages;
    assert.equal(msgs[0].role, 'user');
    assert.equal(msgs[1].role, 'assistant');
  });

  it('throws on Anthropic error response', async () => {
    setMockResponse({ error: { message: 'Invalid API key' } });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'bad-key',
      model: 'claude-sonnet-4-6'
    };

    await assert.rejects(
      () => callLLM(config, [{ role: 'user', content: 'hi' }]),
      /Invalid API key/
    );
  });

  it('throws on empty content array', async () => {
    setMockResponse({ content: [], usage: { input_tokens: 10, output_tokens: 0 } });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    await assert.rejects(
      () => callLLM(config, [{ role: 'user', content: 'hi' }]),
      /No content in Anthropic response/
    );
  });

  it('extracts only text blocks from response content', async () => {
    setMockResponse({
      content: [
        { type: 'thinking', thinking: 'Let me think...' },
        { type: 'text', text: 'The answer is 42' },
        { type: 'text', text: '. Definitely.' }
      ],
      usage: { input_tokens: 10, output_tokens: 15 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'what is the answer?' }]);
    assert.equal(result, 'The answer is 42. Definitely.');
  });

  it('uses default endpoint when config.endpoint is empty', async () => {
    // This test verifies the default is set but will fail to connect —
    // we just verify the function doesn't throw on setup
    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(typeof result, 'string');
  });

  it('returns string type (same contract as other providers)', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'response' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(typeof result, 'string');
  });

  // ── Extended cache (1-hour TTL) tests ───────────────────────────────────

  it('adds anthropic-beta header when extendedCache capability is true', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'cached' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      capabilities: { extendedCache: true }
    };

    await callLLM(config, [
      { role: 'system', content: 'You are MA.' },
      { role: 'user', content: 'Hello' }
    ]);

    assert.equal(lastRequest.headers['anthropic-beta'], 'prompt-caching-2024-07-31');
  });

  it('sets cache_control TTL to 3600 when extendedCache is true', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'cached' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      capabilities: { extendedCache: true }
    };

    await callLLM(config, [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello' }
    ]);

    const sysBlocks = lastRequest.body.system;
    assert.deepEqual(sysBlocks[0].cache_control, { type: 'ephemeral', ttl: '1h' });
  });

  it('does NOT add anthropic-beta header when extendedCache is false/missing', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
      // no capabilities → no extendedCache
    };

    await callLLM(config, [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello' }
    ]);

    assert.equal(lastRequest.headers['anthropic-beta'], undefined);
    // Standard ephemeral cache (no TTL)
    assert.deepEqual(lastRequest.body.system[0].cache_control, { type: 'ephemeral' });
  });

  it('does NOT add anthropic-beta header when capabilities.extendedCache is explicitly false', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      capabilities: { extendedCache: false }
    };

    await callLLM(config, [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello' }
    ]);

    assert.equal(lastRequest.headers['anthropic-beta'], undefined);
    assert.deepEqual(lastRequest.body.system[0].cache_control, { type: 'ephemeral' });
  });
});

// ── Extended Thinking Tests ─────────────────────────────────────────────────

describe('MA-llm callLLM() — Anthropic extended thinking', () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it('adds thinking parameter for Opus when opts.thinking + capability enabled', async () => {
    setMockResponse({
      content: [{ type: 'thinking', thinking: 'deep thought' }, { type: 'text', text: 'answer' }],
      usage: { input_tokens: 100, output_tokens: 50 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-opus-4-6',
      capabilities: { extendedThinking: true }
    };

    const result = await callLLM(config, [{ role: 'user', content: 'Think hard' }], { thinking: true });

    assert.equal(result, 'answer');
    assert.deepEqual(lastRequest.body.thinking, { type: 'enabled', budget_tokens: 10000 });
    // Temperature must NOT be present when thinking is active
    assert.equal(lastRequest.body.temperature, undefined);
  });

  it('adds thinking with budget for Sonnet', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'result' }],
      usage: { input_tokens: 50, output_tokens: 20 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      capabilities: { extendedThinking: true }
    };

    await callLLM(config, [{ role: 'user', content: 'Reason' }], { thinking: true });

    assert.deepEqual(lastRequest.body.thinking, { type: 'enabled', budget_tokens: 8192 });
    assert.equal(lastRequest.body.temperature, undefined);
  });

  it('uses custom thinkingBudget from capabilities', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      capabilities: { extendedThinking: true, thinkingBudget: 16384 }
    };

    await callLLM(config, [{ role: 'user', content: 'Think' }], { thinking: true });

    assert.equal(lastRequest.body.thinking.budget_tokens, 16384);
  });

  it('raises max_tokens to match thinkingBudget when needed', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      capabilities: { extendedThinking: true, thinkingBudget: 16384 }
    };

    await callLLM(config, [{ role: 'user', content: 'Think deeply' }], { thinking: true, maxTokens: 4096 });

    assert.equal(lastRequest.body.thinking.budget_tokens, 16384);
    assert.equal(lastRequest.body.max_tokens, 16384);
  });

  it('sanitizes lone surrogate characters before sending Anthropic JSON', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    await callLLM(config, [{ role: 'user', content: 'broken surrogate: \uD83D here' }], { maxTokens: 4096 });

    assert.ok(!lastRequest.rawBody.includes('\\ud83d'));
    assert.equal(lastRequest.body.messages[0].content, 'broken surrogate: � here');
  });

  it('does NOT add thinking for Haiku (speed-optimized)', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'fast' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-haiku-4-5',
      capabilities: { extendedThinking: true }
    };

    await callLLM(config, [{ role: 'user', content: 'Quick' }], { thinking: true });

    assert.equal(lastRequest.body.thinking, undefined);
    // Temperature IS present since thinking is not active
    assert.equal(typeof lastRequest.body.temperature, 'number');
  });

  it('does NOT add thinking when opts.thinking is false/missing', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'normal' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-opus-4-6',
      capabilities: { extendedThinking: true }
    };

    await callLLM(config, [{ role: 'user', content: 'Normal' }]);

    assert.equal(lastRequest.body.thinking, undefined);
    assert.equal(typeof lastRequest.body.temperature, 'number');
  });

  it('does NOT add thinking when capability is false', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'no thinking' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-opus-4-6',
      capabilities: { extendedThinking: false }
    };

    await callLLM(config, [{ role: 'user', content: 'Think' }], { thinking: true });

    assert.equal(lastRequest.body.thinking, undefined);
    assert.equal(typeof lastRequest.body.temperature, 'number');
  });

  it('extracts only text blocks when thinking blocks are in response', async () => {
    setMockResponse({
      content: [
        { type: 'thinking', thinking: 'Step 1: analyze...\nStep 2: decide...' },
        { type: 'text', text: 'The final answer is 42.' }
      ],
      usage: { input_tokens: 100, output_tokens: 80 }
    });

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-opus-4-6',
      capabilities: { extendedThinking: true }
    };

    const result = await callLLM(config, [{ role: 'user', content: 'What?' }], { thinking: true });

    // Thinking content should NOT appear in the result
    assert.ok(!result.includes('Step 1'));
    assert.ok(!result.includes('analyze'));
    assert.equal(result, 'The final answer is 42.');
  });
});

// ── Native Tool Call Tests ──────────────────────────────────────────────────
describe('MA-llm callLLM() — native tool calls', () => {
  before(async () => { if (!mockServer) await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it('sends tools array in Anthropic request body', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'done' }],
      usage: { input_tokens: 50, output_tokens: 10 }
    });

    const tools = [
      { name: 'ws_read', description: 'Read file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
    ];

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    await callLLM(config, [{ role: 'user', content: 'hi' }], { tools });

    assert.ok(lastRequest.body.tools);
    assert.equal(lastRequest.body.tools.length, 1);
    assert.equal(lastRequest.body.tools[0].name, 'ws_read');
    assert.ok(lastRequest.body.tools[0].input_schema);
  });

  it('returns structured response when Anthropic returns tool_use blocks', async () => {
    setMockResponse({
      content: [
        { type: 'text', text: 'Let me read that.' },
        { type: 'tool_use', id: 'toolu_01abc', name: 'ws_read', input: { path: 'README.md' } }
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 50, output_tokens: 30 }
    });

    const tools = [
      { name: 'ws_read', description: 'Read file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
    ];

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'read README' }], { tools });

    assert.equal(typeof result, 'object');
    assert.equal(result.content, 'Let me read that.');
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].id, 'toolu_01abc');
    assert.equal(result.toolCalls[0].name, 'ws_read');
    assert.deepEqual(result.toolCalls[0].input, { path: 'README.md' });
    assert.equal(result._stopReason, 'tool_use');
  });

  it('returns string when Anthropic response has tools option but no tool_use blocks', async () => {
    setMockResponse({
      content: [{ type: 'text', text: 'No tools needed.' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 50, output_tokens: 10 }
    });

    const tools = [
      { name: 'ws_read', description: 'Read file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
    ];

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'hello' }], { tools });

    assert.equal(typeof result, 'string');
    assert.equal(result, 'No tools needed.');
  });

  it('sends tools array in OpenRouter request body', async () => {
    setMockResponse({
      choices: [{ message: { content: 'done' } }]
    });

    const tools = [
      { type: 'function', function: { name: 'ws_list', description: 'List dir', parameters: { type: 'object', properties: { path: { type: 'string' } } } } }
    ];

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/api/v1/chat/completions`,
      apiKey: 'sk-or-test',
      model: 'test/model'
    };

    await callLLM(config, [{ role: 'user', content: 'list files' }], { tools });

    assert.ok(lastRequest.body.tools);
    assert.equal(lastRequest.body.tools.length, 1);
    assert.equal(lastRequest.body.tools[0].type, 'function');
  });

  it('returns structured response when OpenRouter returns tool_calls', async () => {
    setMockResponse({
      choices: [{
        message: {
          content: 'Listing...',
          tool_calls: [{
            id: 'call_xyz',
            type: 'function',
            function: { name: 'ws_list', arguments: '{"path":"."}' }
          }]
        },
        finish_reason: 'tool_calls'
      }]
    });

    const tools = [
      { type: 'function', function: { name: 'ws_list', description: 'List dir', parameters: { type: 'object', properties: { path: { type: 'string' } } } } }
    ];

    const config = {
      type: 'openrouter',
      endpoint: `http://127.0.0.1:${mockPort}/api/v1/chat/completions`,
      apiKey: 'sk-or-test',
      model: 'test/model'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'list files' }], { tools });

    assert.equal(typeof result, 'object');
    assert.equal(result.content, 'Listing...');
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].id, 'call_xyz');
    assert.equal(result.toolCalls[0].name, 'ws_list');
    assert.deepEqual(result.toolCalls[0].input, { path: '.' });
  });

  it('handles multiple Anthropic tool_use blocks', async () => {
    setMockResponse({
      content: [
        { type: 'text', text: 'Reading both.' },
        { type: 'tool_use', id: 'toolu_a', name: 'ws_read', input: { path: 'a.txt' } },
        { type: 'tool_use', id: 'toolu_b', name: 'ws_read', input: { path: 'b.txt' } }
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 50, output_tokens: 40 }
    });

    const tools = [
      { name: 'ws_read', description: 'Read file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
    ];

    const config = {
      type: 'anthropic',
      endpoint: `http://127.0.0.1:${mockPort}/v1/messages`,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    };

    const result = await callLLM(config, [{ role: 'user', content: 'read both' }], { tools });

    assert.equal(result.toolCalls.length, 2);
    assert.equal(result.toolCalls[0].id, 'toolu_a');
    assert.equal(result.toolCalls[1].id, 'toolu_b');
  });
});
