'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── MA-core mode state ──────────────────────────────────────────────────────
const core = require('../../MA/MA-server/MA-core.js');

describe('MA mode toggle — core state', () => {
  it('defaults to work mode', () => {
    // Reset to default
    core.setMode('work');
    assert.equal(core.getMode(), 'work');
  });

  it('switches to chat mode', () => {
    core.setMode('chat');
    assert.equal(core.getMode(), 'chat');
  });

  it('switches back to work mode', () => {
    core.setMode('work');
    assert.equal(core.getMode(), 'work');
  });

  it('rejects invalid mode values (defaults to work)', () => {
    core.setMode('invalid');
    assert.equal(core.getMode(), 'work');
    core.setMode('');
    assert.equal(core.getMode(), 'work');
    core.setMode(null);
    assert.equal(core.getMode(), 'work');
  });

  it('exports getMode and setMode', () => {
    assert.equal(typeof core.getMode, 'function');
    assert.equal(typeof core.setMode, 'function');
  });
});

// ── Workspace tools blocked-tool enforcement ────────────────────────────────
const wsTools = require('../../MA/MA-server/MA-workspace-tools.js');

describe('MA mode toggle — tool blocking', () => {
  const BLOCKED = new Set(['ws_write', 'ws_append', 'ws_delete', 'ws_mkdir', 'ws_move', 'cmd_run']);

  it('blocks ws_write in chat mode (text-based)', async () => {
    const text = '[TOOL:ws_write {"path":"test.txt"}]\nhello\n[/TOOL]';
    const results = await wsTools.executeToolCalls(text, {
      workspacePath: __dirname,
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, false);
    assert.ok(results[0].result.includes('Chat Mode'));
  });

  it('blocks ws_delete in chat mode (text-based)', async () => {
    const text = '[TOOL:ws_delete {"path":"test.txt"}]';
    const results = await wsTools.executeToolCalls(text, {
      workspacePath: __dirname,
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, false);
    assert.ok(results[0].result.includes('Chat Mode'));
  });

  it('blocks cmd_run in chat mode (text-based)', async () => {
    const text = '[TOOL:cmd_run {"cmd":"echo hi"}]';
    const results = await wsTools.executeToolCalls(text, {
      workspacePath: __dirname,
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, false);
    assert.ok(results[0].result.includes('Chat Mode'));
  });

  it('allows ws_read in chat mode (text-based)', async () => {
    const text = '[TOOL:ws_read {"path":"package.json"}]';
    const results = await wsTools.executeToolCalls(text, {
      workspacePath: require('path').join(__dirname, '..', '..'),
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, true);
  });

  it('allows ws_list in chat mode (text-based)', async () => {
    const text = '[TOOL:ws_list {"path":"."}]';
    const results = await wsTools.executeToolCalls(text, {
      workspacePath: require('path').join(__dirname, '..', '..'),
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, true);
  });

  it('blocks ws_write in chat mode (native tool calls)', async () => {
    const toolCalls = [{ id: 'tc1', name: 'ws_write', input: { path: 'test.txt', content: 'hello' } }];
    const results = await wsTools.executeNativeToolCalls(toolCalls, {
      workspacePath: __dirname,
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, false);
    assert.ok(results[0].result.includes('Chat Mode'));
    assert.equal(results[0].id, 'tc1');
  });

  it('blocks cmd_run in chat mode (native tool calls)', async () => {
    const toolCalls = [{ id: 'tc2', name: 'cmd_run', input: { cmd: 'echo hi' } }];
    const results = await wsTools.executeNativeToolCalls(toolCalls, {
      workspacePath: __dirname,
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, false);
    assert.ok(results[0].result.includes('Chat Mode'));
  });

  it('allows ws_read in chat mode (native tool calls)', async () => {
    const toolCalls = [{ id: 'tc3', name: 'ws_read', input: { path: 'package.json' } }];
    const results = await wsTools.executeNativeToolCalls(toolCalls, {
      workspacePath: require('path').join(__dirname, '..', '..'),
      blockedTools: BLOCKED
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, true);
  });

  it('no blocking when blockedTools is absent (work mode)', async () => {
    const text = '[TOOL:ws_list {"path":"."}]';
    const results = await wsTools.executeToolCalls(text, {
      workspacePath: require('path').join(__dirname, '..', '..')
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].ok, true);
  });
});
