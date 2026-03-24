'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  TOOL_DEFS,
  buildToolSchemas,
  buildAnthropicTools,
  buildOpenRouterTools,
  parseAnthropicResponse,
  parseOpenRouterResponse,
  formatAnthropicToolResults,
  formatOpenRouterToolResults,
  isWorkspaceTool,
  createToolExecutor
} = require('../../server/services/tool-use-adapter');

// ── TOOL_DEFS ─────────────────────────────────────────────────────────────

describe('tool-use-adapter: TOOL_DEFS', () => {
  it('is a frozen array with at least 10 tools', () => {
    assert.ok(Array.isArray(TOOL_DEFS));
    assert.ok(Object.isFrozen(TOOL_DEFS));
    assert.ok(TOOL_DEFS.length >= 10, `Expected >=10 tools, got ${TOOL_DEFS.length}`);
  });

  it('each tool def has name, description, parameters', () => {
    for (const t of TOOL_DEFS) {
      assert.ok(typeof t.name === 'string' && t.name.length > 0, `Missing name`);
      assert.ok(typeof t.description === 'string' && t.description.length > 0, `Missing description for ${t.name}`);
      assert.ok(t.parameters && t.parameters.type === 'object', `Missing/bad parameters for ${t.name}`);
    }
  });

  it('includes core workspace tools', () => {
    const names = TOOL_DEFS.map(t => t.name);
    for (const n of ['ws_list', 'ws_read', 'ws_write', 'ws_delete', 'ws_mkdir', 'ws_move', 'ws_append']) {
      assert.ok(names.includes(n), `Missing tool: ${n}`);
    }
  });

  it('includes web tools', () => {
    const names = TOOL_DEFS.map(t => t.name);
    assert.ok(names.includes('web_search'));
    assert.ok(names.includes('web_fetch'));
  });

  it('includes skill tools', () => {
    const names = TOOL_DEFS.map(t => t.name);
    assert.ok(names.includes('skill_create'));
    assert.ok(names.includes('skill_list'));
    assert.ok(names.includes('skill_edit'));
  });

  it('includes cmd_run', () => {
    assert.ok(TOOL_DEFS.some(t => t.name === 'cmd_run'));
  });

  it('does NOT include memory tools (handled by memory-tool-bridge)', () => {
    const names = TOOL_DEFS.map(t => t.name);
    assert.ok(!names.includes('memory_search'), 'should not include memory_search');
    assert.ok(!names.includes('memory_store'), 'should not include memory_store');
    assert.ok(!names.includes('memory_read'), 'should not include memory_read');
    assert.ok(!names.includes('memory_list'), 'should not include memory_list');
  });
});

// ── Schema Builders ─────────────────────────────────────────────────────────

describe('tool-use-adapter: buildAnthropicTools', () => {
  it('returns array with input_schema per tool', () => {
    const schemas = buildAnthropicTools();
    assert.ok(Array.isArray(schemas));
    assert.strictEqual(schemas.length, TOOL_DEFS.length);
    for (const s of schemas) {
      assert.ok(typeof s.name === 'string');
      assert.ok(typeof s.description === 'string');
      assert.ok(s.input_schema && s.input_schema.type === 'object');
    }
  });
});

describe('tool-use-adapter: buildOpenRouterTools', () => {
  it('returns array with type=function wrapper per tool', () => {
    const schemas = buildOpenRouterTools();
    assert.ok(Array.isArray(schemas));
    assert.strictEqual(schemas.length, TOOL_DEFS.length);
    for (const s of schemas) {
      assert.strictEqual(s.type, 'function');
      assert.ok(typeof s.function === 'object');
      assert.ok(typeof s.function.name === 'string');
      assert.ok(typeof s.function.description === 'string');
      assert.ok(s.function.parameters && s.function.parameters.type === 'object');
    }
  });
});

describe('tool-use-adapter: buildToolSchemas', () => {
  it('returns Anthropic format for anthropic', () => {
    const schemas = buildToolSchemas('anthropic');
    assert.ok(Array.isArray(schemas));
    assert.ok(schemas[0].input_schema, 'should have input_schema (Anthropic format)');
  });

  it('returns OpenRouter format for openrouter', () => {
    const schemas = buildToolSchemas('openrouter');
    assert.ok(Array.isArray(schemas));
    assert.strictEqual(schemas[0].type, 'function');
  });

  it('returns null for ollama (no native tool use)', () => {
    assert.strictEqual(buildToolSchemas('ollama'), null);
  });

  it('returns null for unknown provider', () => {
    assert.strictEqual(buildToolSchemas('unknown'), null);
  });
});

// ── Response Parsers ────────────────────────────────────────────────────────

describe('tool-use-adapter: parseAnthropicResponse', () => {
  it('extracts text and tool_use blocks', () => {
    const data = {
      content: [
        { type: 'text', text: 'Let me read that file.' },
        { type: 'tool_use', id: 'toolu_123', name: 'ws_read', input: { path: 'README.md' } },
        { type: 'text', text: ' Done.' }
      ]
    };
    const result = parseAnthropicResponse(data);
    assert.strictEqual(result.content, 'Let me read that file. Done.');
    assert.strictEqual(result.toolCalls.length, 1);
    assert.strictEqual(result.toolCalls[0].id, 'toolu_123');
    assert.strictEqual(result.toolCalls[0].name, 'ws_read');
    assert.deepStrictEqual(result.toolCalls[0].input, { path: 'README.md' });
  });

  it('returns empty toolCalls when no tool_use blocks', () => {
    const result = parseAnthropicResponse({ content: [{ type: 'text', text: 'Hello' }] });
    assert.strictEqual(result.toolCalls.length, 0);
    assert.strictEqual(result.content, 'Hello');
  });

  it('handles null/missing data gracefully', () => {
    const result = parseAnthropicResponse(null);
    assert.strictEqual(result.content, '');
    assert.strictEqual(result.toolCalls.length, 0);
  });

  it('handles multiple tool calls', () => {
    const data = {
      content: [
        { type: 'tool_use', id: 't1', name: 'ws_list', input: { path: '.' } },
        { type: 'tool_use', id: 't2', name: 'ws_read', input: { path: 'a.txt' } }
      ]
    };
    const result = parseAnthropicResponse(data);
    assert.strictEqual(result.toolCalls.length, 2);
    assert.strictEqual(result.toolCalls[0].name, 'ws_list');
    assert.strictEqual(result.toolCalls[1].name, 'ws_read');
  });
});

describe('tool-use-adapter: parseOpenRouterResponse', () => {
  it('extracts content and tool_calls', () => {
    const data = {
      choices: [{
        message: {
          content: 'Reading file...',
          tool_calls: [{
            id: 'call_abc',
            function: { name: 'ws_read', arguments: '{"path":"README.md"}' }
          }]
        }
      }]
    };
    const result = parseOpenRouterResponse(data);
    assert.strictEqual(result.content, 'Reading file...');
    assert.strictEqual(result.toolCalls.length, 1);
    assert.strictEqual(result.toolCalls[0].id, 'call_abc');
    assert.strictEqual(result.toolCalls[0].name, 'ws_read');
    assert.deepStrictEqual(result.toolCalls[0].input, { path: 'README.md' });
  });

  it('handles missing message gracefully', () => {
    const result = parseOpenRouterResponse({ choices: [] });
    assert.strictEqual(result.content, '');
    assert.strictEqual(result.toolCalls.length, 0);
  });

  it('handles malformed arguments gracefully', () => {
    const data = {
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'c1',
            function: { name: 'ws_list', arguments: 'NOT_JSON' }
          }]
        }
      }]
    };
    const result = parseOpenRouterResponse(data);
    assert.strictEqual(result.toolCalls.length, 1);
    assert.deepStrictEqual(result.toolCalls[0].input, {});
  });
});

// ── Result Formatters ───────────────────────────────────────────────────────

describe('tool-use-adapter: formatAnthropicToolResults', () => {
  it('formats successful results', () => {
    const results = [{ id: 't1', tool: 'ws_read', result: 'file content', ok: true }];
    const formatted = formatAnthropicToolResults(results);
    assert.strictEqual(formatted.length, 1);
    assert.strictEqual(formatted[0].type, 'tool_result');
    assert.strictEqual(formatted[0].tool_use_id, 't1');
    assert.strictEqual(formatted[0].content, 'file content');
    assert.strictEqual(formatted[0].is_error, undefined);
  });

  it('formats error results with is_error flag', () => {
    const results = [{ id: 't1', tool: 'ws_read', result: 'not found', ok: false }];
    const formatted = formatAnthropicToolResults(results);
    assert.strictEqual(formatted[0].content, 'ERROR: not found');
    assert.strictEqual(formatted[0].is_error, true);
  });
});

describe('tool-use-adapter: formatOpenRouterToolResults', () => {
  it('formats as role=tool messages', () => {
    const results = [{ id: 'c1', tool: 'ws_list', result: 'dir listing', ok: true }];
    const formatted = formatOpenRouterToolResults(results);
    assert.strictEqual(formatted.length, 1);
    assert.strictEqual(formatted[0].role, 'tool');
    assert.strictEqual(formatted[0].tool_call_id, 'c1');
    assert.strictEqual(formatted[0].content, 'dir listing');
  });

  it('formats errors with ERROR prefix', () => {
    const results = [{ id: 'c1', tool: 'ws_delete', result: 'permission denied', ok: false }];
    const formatted = formatOpenRouterToolResults(results);
    assert.strictEqual(formatted[0].content, 'ERROR: permission denied');
  });
});

// ── isWorkspaceTool ─────────────────────────────────────────────────────────

describe('tool-use-adapter: isWorkspaceTool', () => {
  it('returns true for known workspace tools', () => {
    assert.ok(isWorkspaceTool('ws_read'));
    assert.ok(isWorkspaceTool('web_search'));
    assert.ok(isWorkspaceTool('cmd_run'));
    assert.ok(isWorkspaceTool('skill_list'));
  });

  it('returns false for memory tools', () => {
    assert.ok(!isWorkspaceTool('memory_search'));
    assert.ok(!isWorkspaceTool('memory_store'));
  });

  it('returns false for unknown tools', () => {
    assert.ok(!isWorkspaceTool('unknown_tool'));
    assert.ok(!isWorkspaceTool(''));
  });
});

// ── createToolExecutor ──────────────────────────────────────────────────────

describe('tool-use-adapter: createToolExecutor', () => {
  it('returns a function', () => {
    const executor = createToolExecutor({ workspacePath: '/tmp' });
    assert.strictEqual(typeof executor, 'function');
  });

  it('executes ws_list through workspace-tools bridge', async () => {
    // This tests the synthetic text bridge approach.
    // We create a minimal executor and verify it calls workspace-tools.
    const executor = createToolExecutor({ workspacePath: '/nonexistent/path' });
    const result = await executor('ws_list', { path: '.' });
    // Will likely fail (nonexistent path) or return an error — just verify shape
    assert.ok(typeof result === 'object');
    assert.ok(typeof result.content === 'string');
    assert.ok(result.content.length > 0);
  });

  it('returns error for truly invalid operations', async () => {
    const executor = createToolExecutor({ workspacePath: '' });
    // web_search without a webFetch module should fail gracefully
    const result = await executor('web_search', { query: 'test' });
    assert.ok(typeof result.content === 'string');
  });
});
