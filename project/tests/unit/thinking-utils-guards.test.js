// ── Tests · Thinking Utils Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/services/llm-runtime-utils. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { stripThinkingTags, THINKING_PROMPT_SUFFIX } = require('../../server/services/llm-runtime-utils');

// ---------- stripThinkingTags ----------
describe('stripThinkingTags', () => {
  it('removes single thinking block', () => {
    const input = '<thinking>Step 1: analyze the question</thinking>The answer is 42.';
    assert.equal(stripThinkingTags(input), 'The answer is 42.');
  });

  it('removes multiple thinking blocks', () => {
    const input = '<thinking>First thought</thinking>Hello <thinking>Second thought</thinking>world';
    assert.equal(stripThinkingTags(input), 'Hello world');
  });

  it('handles multiline thinking blocks', () => {
    const input = `<thinking>
Line 1
Line 2
Line 3
</thinking>Final answer here.`;
    assert.equal(stripThinkingTags(input), 'Final answer here.');
  });

  it('is case-insensitive', () => {
    const input = '<THINKING>loud thinking</THINKING>Result';
    assert.equal(stripThinkingTags(input), 'Result');
  });

  it('returns empty string for null/undefined input', () => {
    assert.equal(stripThinkingTags(null), '');
    assert.equal(stripThinkingTags(undefined), '');
    assert.equal(stripThinkingTags(''), '');
  });

  it('returns text unchanged when no thinking tags present', () => {
    const input = 'Just a normal response.';
    assert.equal(stripThinkingTags(input), 'Just a normal response.');
  });

  it('trims whitespace after stripping', () => {
    const input = '  <thinking>thoughts</thinking>  Clean text  ';
    assert.equal(stripThinkingTags(input), 'Clean text');
  });

  it('handles thinking block at end of text', () => {
    const input = 'The answer is here.<thinking>meta reasoning</thinking>';
    assert.equal(stripThinkingTags(input), 'The answer is here.');
  });
});

// ---------- THINKING_PROMPT_SUFFIX ----------
describe('THINKING_PROMPT_SUFFIX', () => {
  it('is a non-empty string', () => {
    assert.ok(typeof THINKING_PROMPT_SUFFIX === 'string');
    assert.ok(THINKING_PROMPT_SUFFIX.length > 0);
  });

  it('mentions <thinking> tags', () => {
    assert.ok(THINKING_PROMPT_SUFFIX.includes('<thinking>'));
    assert.ok(THINKING_PROMPT_SUFFIX.includes('</thinking>'));
  });

  it('starts with newlines for clean appending', () => {
    assert.ok(THINKING_PROMPT_SUFFIX.startsWith('\n\n'));
  });
});
