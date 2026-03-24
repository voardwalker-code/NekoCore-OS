// ── MA Tool Adapter Tests ────────────────────────────────────────────────────
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  TOOL_DEFS,
  buildAnthropicTools,
  buildOpenRouterTools,
  buildToolSchemas,
  parseAnthropicResponse,
  parseOpenRouterResponse,
  formatAnthropicToolResults,
  formatOpenRouterToolResults
} = require('../MA-server/MA-tool-adapter');

// ── TOOL_DEFS ───────────────────────────────────────────────────────────────
describe('TOOL_DEFS', () => {
  it('exports 11 tools', () => {
    assert.equal(TOOL_DEFS.length, 11);
  });

  it('every tool has name, description, parameters', () => {
    for (const t of TOOL_DEFS) {
      assert.ok(t.name, `missing name`);
      assert.ok(t.description, `${t.name} missing description`);
      assert.ok(t.parameters, `${t.name} missing parameters`);
      assert.equal(t.parameters.type, 'object');
    }
  });

  it('covers all workspace tool names', () => {
    const names = TOOL_DEFS.map(t => t.name);
    for (const expected of ['ws_list', 'ws_read', 'ws_write', 'ws_append', 'ws_delete',
      'ws_mkdir', 'ws_move', 'web_search', 'web_fetch', 'cmd_run', 'memory_search']) {
      assert.ok(names.includes(expected), `missing ${expected}`);
    }
  });
});

// ── Schema Builders ─────────────────────────────────────────────────────────
describe('buildAnthropicTools', () => {
  it('returns Anthropic format with input_schema', () => {
    const tools = buildAnthropicTools();
    assert.equal(tools.length, 11);
    for (const t of tools) {
      assert.ok(t.name);
      assert.ok(t.description);
      assert.ok(t.input_schema);
      assert.equal(t.input_schema.type, 'object');
      assert.ok(!t.parameters, 'should not have parameters key');
    }
  });
});

describe('buildOpenRouterTools', () => {
  it('returns OpenAI format with type:function wrapper', () => {
    const tools = buildOpenRouterTools();
    assert.equal(tools.length, 11);
    for (const t of tools) {
      assert.equal(t.type, 'function');
      assert.ok(t.function.name);
      assert.ok(t.function.description);
      assert.ok(t.function.parameters);
    }
  });
});

describe('buildToolSchemas', () => {
  it('returns Anthropic format for anthropic type', () => {
    const tools = buildToolSchemas('anthropic');
    assert.ok(tools[0].input_schema, 'should have input_schema');
  });

  it('returns OpenRouter format for openrouter type', () => {
    const tools = buildToolSchemas('openrouter');
    assert.equal(tools[0].type, 'function');
  });

  it('returns OpenRouter format for unknown types', () => {
    const tools = buildToolSchemas('ollama');
    assert.equal(tools[0].type, 'function');
  });
});

// ── Response Parsers ────────────────────────────────────────────────────────
describe('parseAnthropicResponse', () => {
  it('extracts text and tool_use blocks', () => {
    const data = {
      content: [
        { type: 'text', text: 'Let me read that file.' },
        { type: 'tool_use', id: 'tu_01', name: 'ws_read', input: { path: 'README.md' } }
      ]
    };
    const result = parseAnthropicResponse(data);
    assert.equal(result.content, 'Let me read that file.');
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].id, 'tu_01');
    assert.equal(result.toolCalls[0].name, 'ws_read');
    assert.deepEqual(result.toolCalls[0].input, { path: 'README.md' });
  });

  it('handles text-only response', () => {
    const data = { content: [{ type: 'text', text: 'Hello!' }] };
    const result = parseAnthropicResponse(data);
    assert.equal(result.content, 'Hello!');
    assert.equal(result.toolCalls.length, 0);
  });

  it('handles tool-only response without text', () => {
    const data = {
      content: [
        { type: 'tool_use', id: 'tu_02', name: 'ws_list', input: { path: '.' } }
      ]
    };
    const result = parseAnthropicResponse(data);
    assert.equal(result.content, '');
    assert.equal(result.toolCalls.length, 1);
  });

  it('skips thinking blocks', () => {
    const data = {
      content: [
        { type: 'thinking', thinking: 'I should check...' },
        { type: 'text', text: 'Here is the result.' }
      ]
    };
    const result = parseAnthropicResponse(data);
    assert.equal(result.content, 'Here is the result.');
    assert.equal(result.toolCalls.length, 0);
  });

  it('handles multiple tool_use blocks', () => {
    const data = {
      content: [
        { type: 'text', text: 'Reading files.' },
        { type: 'tool_use', id: 'tu_a', name: 'ws_read', input: { path: 'a.txt' } },
        { type: 'tool_use', id: 'tu_b', name: 'ws_read', input: { path: 'b.txt' } }
      ]
    };
    const result = parseAnthropicResponse(data);
    assert.equal(result.toolCalls.length, 2);
    assert.equal(result.toolCalls[0].id, 'tu_a');
    assert.equal(result.toolCalls[1].id, 'tu_b');
  });

  it('handles empty content array', () => {
    const result = parseAnthropicResponse({ content: [] });
    assert.equal(result.content, '');
    assert.equal(result.toolCalls.length, 0);
  });

  it('defaults input to empty object when missing', () => {
    const data = {
      content: [{ type: 'tool_use', id: 'tu_x', name: 'ws_list' }]
    };
    const result = parseAnthropicResponse(data);
    assert.deepEqual(result.toolCalls[0].input, {});
  });
});

describe('parseOpenRouterResponse', () => {
  it('extracts tool_calls from OpenAI format', () => {
    const data = {
      choices: [{
        message: {
          content: 'Let me check.',
          tool_calls: [{
            id: 'call_abc',
            type: 'function',
            function: { name: 'ws_read', arguments: '{"path":"index.js"}' }
          }]
        }
      }]
    };
    const result = parseOpenRouterResponse(data);
    assert.equal(result.content, 'Let me check.');
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].id, 'call_abc');
    assert.equal(result.toolCalls[0].name, 'ws_read');
    assert.deepEqual(result.toolCalls[0].input, { path: 'index.js' });
  });

  it('handles no tool_calls', () => {
    const data = { choices: [{ message: { content: 'Just text.' } }] };
    const result = parseOpenRouterResponse(data);
    assert.equal(result.content, 'Just text.');
    assert.equal(result.toolCalls.length, 0);
  });

  it('handles missing message', () => {
    const result = parseOpenRouterResponse({ choices: [{}] });
    assert.equal(result.content, '');
    assert.equal(result.toolCalls.length, 0);
  });
});

// ── Result Formatters ───────────────────────────────────────────────────────
describe('formatAnthropicToolResults', () => {
  it('formats success results as tool_result blocks', () => {
    const results = [{ id: 'tu_01', tool: 'ws_read', result: 'file content', ok: true }];
    const formatted = formatAnthropicToolResults(results);
    assert.equal(formatted.length, 1);
    assert.equal(formatted[0].type, 'tool_result');
    assert.equal(formatted[0].tool_use_id, 'tu_01');
    assert.equal(formatted[0].content, 'file content');
    assert.ok(!formatted[0].is_error);
  });

  it('formats error results with is_error flag', () => {
    const results = [{ id: 'tu_02', tool: 'ws_read', result: 'File not found', ok: false }];
    const formatted = formatAnthropicToolResults(results);
    assert.equal(formatted[0].content, 'ERROR: File not found');
    assert.equal(formatted[0].is_error, true);
  });

  it('handles multiple results', () => {
    const results = [
      { id: 'tu_a', tool: 'ws_read', result: 'aaa', ok: true },
      { id: 'tu_b', tool: 'ws_list', result: 'bbb', ok: true }
    ];
    const formatted = formatAnthropicToolResults(results);
    assert.equal(formatted.length, 2);
    assert.equal(formatted[0].tool_use_id, 'tu_a');
    assert.equal(formatted[1].tool_use_id, 'tu_b');
  });
});

describe('formatOpenRouterToolResults', () => {
  it('formats results as tool messages', () => {
    const results = [{ id: 'call_abc', tool: 'ws_read', result: 'data', ok: true }];
    const formatted = formatOpenRouterToolResults(results);
    assert.equal(formatted.length, 1);
    assert.equal(formatted[0].role, 'tool');
    assert.equal(formatted[0].tool_call_id, 'call_abc');
    assert.equal(formatted[0].content, 'data');
  });

  it('prefixes ERROR for failures', () => {
    const results = [{ id: 'call_err', tool: 'ws_delete', result: 'Not found', ok: false }];
    const formatted = formatOpenRouterToolResults(results);
    assert.equal(formatted[0].content, 'ERROR: Not found');
  });
});
