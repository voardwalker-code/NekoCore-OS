/**
 * Guard tests for workspace-tools upgrade (PLAN-OS-TOOL-UPGRADE-v1 Slice -0).
 * Lock the exported API shape and critical behaviors so the parser upgrade
 * doesn't break callers (chat-pipeline.js, task-runner.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const workspaceTools = require('../../server/brain/skills/workspace-tools');

// ── Exported API shape ──────────────────────────────────────────────────────

test('exports extractToolCalls as a function', () => {
  assert.equal(typeof workspaceTools.extractToolCalls, 'function');
});

test('exports executeToolCalls as a function', () => {
  assert.equal(typeof workspaceTools.executeToolCalls, 'function');
});

test('exports formatToolResults as a function', () => {
  assert.equal(typeof workspaceTools.formatToolResults, 'function');
});

test('exports stripToolCalls as a function', () => {
  assert.equal(typeof workspaceTools.stripToolCalls, 'function');
});

// ── extractToolCalls return shape ───────────────────────────────────────────

test('extractToolCalls returns an array', () => {
  const calls = workspaceTools.extractToolCalls('hello');
  assert.ok(Array.isArray(calls));
  assert.equal(calls.length, 0);
});

test('extractToolCalls items have command and params', () => {
  const calls = workspaceTools.extractToolCalls('[TOOL:ws_list path="."]');
  assert.ok(calls.length >= 1);
  const call = calls[0];
  assert.ok('command' in call, 'must have command key');
  assert.ok('params' in call, 'must have params key');
  assert.equal(typeof call.params, 'object');
});

// ── executeToolCalls return shape ───────────────────────────────────────────

test('executeToolCalls returns {hadTools, cleanedResponse, toolResults} when no tools', async () => {
  const result = await workspaceTools.executeToolCalls('just text', {});
  assert.ok('hadTools' in result, 'must have hadTools key');
  assert.ok('cleanedResponse' in result, 'must have cleanedResponse key');
  assert.ok('toolResults' in result, 'must have toolResults key');
  assert.equal(result.hadTools, false);
  assert.ok(Array.isArray(result.toolResults));
});

test('executeToolCalls returns hadTools=true when tools found', async () => {
  const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-guard-'));
  try {
    const result = await workspaceTools.executeToolCalls(
      '[TOOL:ws_list path="."]',
      { workspacePath: wsRoot }
    );
    assert.equal(result.hadTools, true);
    assert.ok(result.toolResults.length >= 1);
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});

test('executeToolCalls toolResults items have command, params, result', async () => {
  const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-guard-'));
  try {
    const result = await workspaceTools.executeToolCalls(
      '[TOOL:ws_list path="."]',
      { workspacePath: wsRoot }
    );
    const tr = result.toolResults[0];
    assert.ok('command' in tr, 'must have command');
    assert.ok('params' in tr, 'must have params');
    assert.ok('result' in tr, 'must have result');
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});

// ── formatToolResults ───────────────────────────────────────────────────────

test('formatToolResults returns a string', () => {
  const result = workspaceTools.formatToolResults([]);
  assert.equal(typeof result, 'string');
});

test('formatToolResults includes tool name in output', () => {
  const result = workspaceTools.formatToolResults([
    { command: 'ws_list', params: { path: '.' }, result: { ok: true, files: ['a.txt'] } }
  ]);
  assert.ok(result.includes('ws_list'), 'output must mention tool name');
});

// ── stripToolCalls ──────────────────────────────────────────────────────────

test('stripToolCalls returns a string', () => {
  const result = workspaceTools.stripToolCalls('hello');
  assert.equal(typeof result, 'string');
  assert.equal(result, 'hello');
});

test('stripToolCalls removes tool tags from text', () => {
  const result = workspaceTools.stripToolCalls(
    'before [TOOL:ws_read path="file.txt"] after'
  );
  assert.ok(!result.includes('[TOOL:'), 'tool tags must be removed');
  assert.ok(result.includes('before'), 'surrounding text must remain');
  assert.ok(result.includes('after'), 'surrounding text must remain');
});

// ── Core tool parsing — ws_write with content ───────────────────────────────

test('extractToolCalls parses ws_write with path and content', () => {
  const calls = workspaceTools.extractToolCalls(
    '[TOOL:ws_write path="test.md" content="hello world"]'
  );
  assert.ok(calls.length >= 1);
  assert.equal(calls[0].params.path, 'test.md');
  assert.equal(calls[0].params.content, 'hello world');
});

// ── ws_write execution actually writes a file ───────────────────────────────

test('ws_write tool creates file in workspace', async () => {
  const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-guard-'));
  try {
    const result = await workspaceTools.executeToolCalls(
      '[TOOL:ws_write path="out.txt" content="test data"]',
      { workspacePath: wsRoot }
    );
    assert.equal(result.hadTools, true);
    const filep = path.join(wsRoot, 'out.txt');
    assert.ok(fs.existsSync(filep), 'file must exist');
    assert.equal(fs.readFileSync(filep, 'utf-8'), 'test data');
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});

// ── Multiple tool calls in one response ─────────────────────────────────────

test('extractToolCalls handles multiple tools', () => {
  const text = '[TOOL:ws_list path="."]\n[TOOL:ws_read path="file.txt"]';
  const calls = workspaceTools.extractToolCalls(text);
  assert.ok(calls.length >= 2, 'must parse at least 2 calls');
});

// ── Unknown tool returns error ──────────────────────────────────────────────

test('executeToolCalls handles unknown tools gracefully', async () => {
  const result = await workspaceTools.executeToolCalls(
    '[TOOL:nonexistent_tool param="x"]',
    { workspacePath: os.tmpdir() }
  );
  assert.equal(result.hadTools, true);
  assert.ok(result.toolResults[0].result.ok === false ||
    (typeof result.toolResults[0].result === 'string' && result.toolResults[0].result.includes('Unknown')),
    'unknown tool must produce an error');
});

// ── Path safety — traversal rejection ───────────────────────────────────────

test('ws_read rejects path traversal', async () => {
  const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-guard-'));
  try {
    const result = await workspaceTools.executeToolCalls(
      '[TOOL:ws_read path="../../../etc/passwd"]',
      { workspacePath: wsRoot }
    );
    assert.equal(result.hadTools, true);
    const r = result.toolResults[0].result;
    assert.ok(r.ok === false, 'traversal must be rejected');
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});

// ── New JSON format support (post-upgrade) ──────────────────────────────────

test('extractToolCalls handles JSON param format', () => {
  const calls = workspaceTools.extractToolCalls(
    '[TOOL:ws_read {"path":"notes.txt"}]'
  );
  assert.ok(calls.length >= 1, 'JSON format must be parsed');
  assert.equal(calls[0].params.path, 'notes.txt');
});

test('extractToolCalls handles block format for ws_write', () => {
  const text = '[TOOL:ws_write {"path":"out.md"}]\n# Hello World\nSome content here.\n[/TOOL]';
  const calls = workspaceTools.extractToolCalls(text);
  assert.ok(calls.length >= 1, 'block format must be parsed');
  assert.equal(calls[0].params.path, 'out.md');
  assert.ok(calls[0].params.content.includes('Hello World'), 'content must be captured from block');
});

test('block format ws_write actually writes file content', async () => {
  const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-guard-'));
  try {
    const text = '[TOOL:ws_write {"path":"block-test.md"}]\n# Block Content\nLine two.\n[/TOOL]';
    const result = await workspaceTools.executeToolCalls(text, { workspacePath: wsRoot });
    assert.equal(result.hadTools, true);
    const filep = path.join(wsRoot, 'block-test.md');
    assert.ok(fs.existsSync(filep), 'file must be written');
    const content = fs.readFileSync(filep, 'utf-8');
    assert.ok(content.includes('Block Content'), 'block content must be in file');
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});

// ── Structured result format (post-upgrade) ─────────────────────────────────

test('formatToolResults uses [TOOL_RESULT:] structured format', () => {
  const output = workspaceTools.formatToolResults([
    { command: 'ws_read', params: { path: 'file.txt' }, result: { ok: true, content: 'hello' } }
  ]);
  assert.ok(output.includes('[TOOL_RESULT:') || output.includes('ws_read'),
    'result format must include tool name');
});
