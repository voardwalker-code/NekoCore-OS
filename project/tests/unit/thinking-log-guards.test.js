'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createThinkingLog } = require('../../server/services/thinking-log');
const { extractThinkingContent } = require('../../server/services/llm-runtime-utils');

// ── Temp directory management ────────────────────────────────────────────────
let tmpDir;

function makeTmpDir() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlog-test-'));
  return tmpDir;
}

function cleanupTmpDir() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── extractThinkingContent tests ─────────────────────────────────────────────
describe('extractThinkingContent', () => {
  it('extracts content from single thinking block', () => {
    const input = '<thinking>Step 1: analyze the question</thinking>The answer is 42.';
    assert.equal(extractThinkingContent(input), 'Step 1: analyze the question');
  });

  it('concatenates multiple thinking blocks', () => {
    const input = '<thinking>First thought</thinking>Hello <thinking>Second thought</thinking>world';
    assert.equal(extractThinkingContent(input), 'First thought\n\nSecond thought');
  });

  it('handles multiline thinking blocks', () => {
    const input = `<thinking>
Line 1
Line 2
</thinking>Final answer.`;
    assert.equal(extractThinkingContent(input), 'Line 1\nLine 2');
  });

  it('returns null for null/undefined input', () => {
    assert.equal(extractThinkingContent(null), null);
    assert.equal(extractThinkingContent(undefined), null);
    assert.equal(extractThinkingContent(''), null);
  });

  it('returns null when no thinking tags present', () => {
    assert.equal(extractThinkingContent('Just a normal response.'), null);
  });

  it('returns null for empty thinking blocks', () => {
    assert.equal(extractThinkingContent('<thinking>   </thinking>Normal text'), null);
  });

  it('is case-insensitive', () => {
    const result = extractThinkingContent('<THINKING>loud thinking</THINKING>Result');
    assert.equal(result, 'loud thinking');
  });

  it('returns null for non-string input', () => {
    assert.equal(extractThinkingContent(42), null);
    assert.equal(extractThinkingContent({}), null);
  });
});

// ── createThinkingLog tests ──────────────────────────────────────────────────
describe('createThinkingLog', () => {
  beforeEach(() => {
    makeTmpDir();
  });

  afterEach(() => {
    cleanupTmpDir();
  });

  it('stores and retrieves a thinking entry', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    const id = log.storeThinkingEntry('entity_test', 'conscious', 'I analyzed the question...', 'user asked about cats');

    assert.ok(id, 'should return an ID');
    assert.match(id, /^tlog_/);

    const entry = log.getThinkingEntry('entity_test', id);
    assert.ok(entry);
    assert.equal(entry.id, id);
    assert.equal(entry.entityId, 'entity_test');
    assert.equal(entry.aspect, 'conscious');
    assert.equal(entry.thinkingContent, 'I analyzed the question...');
    assert.equal(entry.contextSummary, 'user asked about cats');
    assert.ok(entry.timestamp);
  });

  it('returns null for empty thinking content', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    assert.equal(log.storeThinkingEntry('entity_test', 'conscious', ''), null);
    assert.equal(log.storeThinkingEntry('entity_test', 'conscious', '   '), null);
    assert.equal(log.storeThinkingEntry('entity_test', 'conscious', null), null);
  });

  it('returns null for missing entity ID', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    assert.equal(log.storeThinkingEntry('', 'conscious', 'some thinking'), null);
    assert.equal(log.storeThinkingEntry(null, 'conscious', 'some thinking'), null);
  });

  it('getThinkingEntry returns null for non-existent entry', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    assert.equal(log.getThinkingEntry('entity_test', 'tlog_nonexistent'), null);
  });

  it('getThinkingEntry returns null for missing args', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    assert.equal(log.getThinkingEntry(null, 'tlog_123'), null);
    assert.equal(log.getThinkingEntry('entity_test', null), null);
  });

  it('creates directory if it does not exist', () => {
    const subDir = path.join(tmpDir, 'deep', 'nested');
    const log = createThinkingLog({ getThinkingLogDir: () => subDir });
    const id = log.storeThinkingEntry('entity_test', 'orchestrator', 'deep thinking');

    assert.ok(id);
    assert.ok(fs.existsSync(subDir));
  });

  it('generates unique IDs per entry', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    const id1 = log.storeThinkingEntry('entity_test', 'conscious', 'thought 1');
    const id2 = log.storeThinkingEntry('entity_test', 'conscious', 'thought 2');
    assert.notEqual(id1, id2);
  });

  it('truncates contextSummary to 300 chars', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    const longContext = 'x'.repeat(500);
    const id = log.storeThinkingEntry('entity_test', 'conscious', 'thinking', longContext);
    const entry = log.getThinkingEntry('entity_test', id);
    assert.equal(entry.contextSummary.length, 300);
  });

  it('stores with null contextSummary when not provided', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    const id = log.storeThinkingEntry('entity_test', 'conscious', 'thinking');
    const entry = log.getThinkingEntry('entity_test', id);
    assert.equal(entry.contextSummary, null);
  });

  it('trims thinking content', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    const id = log.storeThinkingEntry('entity_test', 'conscious', '  padded content  ');
    const entry = log.getThinkingEntry('entity_test', id);
    assert.equal(entry.thinkingContent, 'padded content');
  });

  it('defaults aspect to unknown when not provided', () => {
    const log = createThinkingLog({ getThinkingLogDir: () => tmpDir });
    const id = log.storeThinkingEntry('entity_test', null, 'thinking');
    const entry = log.getThinkingEntry('entity_test', id);
    assert.equal(entry.aspect, 'unknown');
  });
});

// ── Conscious memory thinking_log_id integration ─────────────────────────────
describe('conscious-memory thinking_log_id', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanupTmpDir());

  it('addToStm accepts and stores thinking_log_id', () => {
    const ConsciousMemory = require('../../server/brain/memory/conscious-memory');
    const cm = new ConsciousMemory();

    cm.addToStm({
      summary: 'Test memory with thinking',
      topics: ['test'],
      source: 'conscious_observation',
      thinking_log_id: 'tlog_123_abc'
    });

    // Access internal STM map to verify thinking_log_id was stored
    const entries = Array.from(cm._stm.values());
    const entry = entries.find(e => e.summary === 'Test memory with thinking');
    assert.ok(entry, 'entry should exist in STM');
    assert.equal(entry.thinking_log_id, 'tlog_123_abc');
  });

  it('addToStm works without thinking_log_id', () => {
    const ConsciousMemory = require('../../server/brain/memory/conscious-memory');
    const cm = new ConsciousMemory();

    cm.addToStm({
      summary: 'No thinking log',
      topics: ['test'],
      source: 'conscious_observation'
    });

    const entries = Array.from(cm._stm.values());
    const entry = entries.find(e => e.summary === 'No thinking log');
    assert.ok(entry);
    assert.equal(entry.thinking_log_id, undefined);
  });
});
