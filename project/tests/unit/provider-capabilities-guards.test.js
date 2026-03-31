// ── Tests · Provider Capabilities Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/services/provider-capabilities. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PROVIDER_CAPABILITIES,
  getCapabilities,
  hasCapability,
  getCapabilityMode,
  resolveCapabilities
} = require('../../server/services/provider-capabilities');

test('Provider Capabilities Registry', async (t) => {

  // ── PROVIDER_CAPABILITIES structure ────────────────────────────────────
  await t.test('exports frozen PROVIDER_CAPABILITIES map', () => {
    assert.ok(Object.isFrozen(PROVIDER_CAPABILITIES));
    assert.ok(Object.isFrozen(PROVIDER_CAPABILITIES.anthropic));
    assert.ok(Object.isFrozen(PROVIDER_CAPABILITIES.openrouter));
    assert.ok(Object.isFrozen(PROVIDER_CAPABILITIES.ollama));
  });

  await t.test('anthropic has all expected capabilities', () => {
    const caps = PROVIDER_CAPABILITIES.anthropic;
    assert.equal(caps.promptCaching, true);
    assert.equal(caps.extendedCache, true);
    assert.equal(caps.compaction, 'api');
    assert.equal(caps.extendedThinking, true);
    assert.equal(caps.adaptiveThinking, true);
    assert.equal(caps.nativeToolUse, true);
    assert.equal(caps.contextEditing, true);
    assert.equal(caps.memoryTool, true);
  });

  await t.test('openrouter has conservative defaults', () => {
    const caps = PROVIDER_CAPABILITIES.openrouter;
    assert.equal(caps.promptCaching, false);
    assert.equal(caps.extendedCache, false);
    assert.equal(caps.compaction, 'prompt');
    assert.equal(caps.extendedThinking, false);
    assert.equal(caps.nativeToolUse, true);  // OpenAI-compatible
    assert.equal(caps.memoryTool, false);
  });

  await t.test('ollama has all-false/prompt defaults', () => {
    const caps = PROVIDER_CAPABILITIES.ollama;
    assert.equal(caps.promptCaching, false);
    assert.equal(caps.extendedCache, false);
    assert.equal(caps.compaction, 'prompt');
    assert.equal(caps.extendedThinking, false);
    assert.equal(caps.nativeToolUse, false);
    assert.equal(caps.memoryTool, false);
  });

  // ── getCapabilities ────────────────────────────────────────────────────
  await t.test('getCapabilities returns anthropic caps', () => {
    const caps = getCapabilities('anthropic');
    assert.equal(caps.extendedCache, true);
    assert.equal(caps.compaction, 'api');
  });

  await t.test('getCapabilities returns openrouter caps', () => {
    const caps = getCapabilities('openrouter');
    assert.equal(caps.nativeToolUse, true);
    assert.equal(caps.extendedCache, false);
  });

  await t.test('getCapabilities returns ollama caps', () => {
    const caps = getCapabilities('ollama');
    assert.equal(caps.nativeToolUse, false);
  });

  await t.test('getCapabilities returns all-false for unknown type', () => {
    const caps = getCapabilities('unknown-provider');
    assert.equal(caps.promptCaching, false);
    assert.equal(caps.extendedCache, false);
    assert.equal(caps.compaction, false);
    assert.equal(caps.nativeToolUse, false);
  });

  await t.test('getCapabilities handles null/empty type', () => {
    assert.equal(getCapabilities(null).promptCaching, false);
    assert.equal(getCapabilities('').promptCaching, false);
    assert.equal(getCapabilities(undefined).promptCaching, false);
  });

  await t.test('getCapabilities is case-insensitive', () => {
    const caps = getCapabilities('ANTHROPIC');
    assert.equal(caps.extendedCache, true);
  });

  // ── hasCapability ──────────────────────────────────────────────────────
  await t.test('hasCapability returns true for supported capability', () => {
    const rt = { type: 'anthropic' };
    assert.equal(hasCapability(rt, 'extendedCache'), true);
    assert.equal(hasCapability(rt, 'promptCaching'), true);
  });

  await t.test('hasCapability returns false for unsupported capability', () => {
    const rt = { type: 'ollama' };
    assert.equal(hasCapability(rt, 'extendedCache'), false);
    assert.equal(hasCapability(rt, 'nativeToolUse'), false);
  });

  await t.test('hasCapability checks resolved capabilities first', () => {
    // Runtime with capabilities override — ollama with nativeToolUse forced on
    const rt = { type: 'ollama', capabilities: { nativeToolUse: true } };
    assert.equal(hasCapability(rt, 'nativeToolUse'), true);
  });

  await t.test('hasCapability returns false for null runtime', () => {
    assert.equal(hasCapability(null, 'extendedCache'), false);
  });

  await t.test('hasCapability returns false for null capName', () => {
    assert.equal(hasCapability({ type: 'anthropic' }, null), false);
  });

  // ── getCapabilityMode ──────────────────────────────────────────────────
  await t.test('getCapabilityMode returns mode value for compaction', () => {
    assert.equal(getCapabilityMode({ type: 'anthropic' }, 'compaction'), 'api');
    assert.equal(getCapabilityMode({ type: 'openrouter' }, 'compaction'), 'prompt');
    assert.equal(getCapabilityMode({ type: 'ollama' }, 'compaction'), 'prompt');
  });

  await t.test('getCapabilityMode returns boolean for boolean caps', () => {
    assert.equal(getCapabilityMode({ type: 'anthropic' }, 'extendedCache'), true);
    assert.equal(getCapabilityMode({ type: 'ollama' }, 'extendedCache'), false);
  });

  await t.test('getCapabilityMode checks resolved capabilities first', () => {
    const rt = { type: 'ollama', capabilities: { compaction: 'api' } };
    assert.equal(getCapabilityMode(rt, 'compaction'), 'api');
  });

  await t.test('getCapabilityMode returns false for unknown capability', () => {
    assert.equal(getCapabilityMode({ type: 'anthropic' }, 'nonexistent'), false);
  });

  await t.test('getCapabilityMode returns false for null inputs', () => {
    assert.equal(getCapabilityMode(null, 'extendedCache'), false);
    assert.equal(getCapabilityMode({ type: 'anthropic' }, null), false);
  });

  // ── resolveCapabilities ────────────────────────────────────────────────
  await t.test('resolveCapabilities returns defaults when no overrides', () => {
    const caps = resolveCapabilities('anthropic');
    assert.equal(caps.extendedCache, true);
    assert.equal(caps.compaction, 'api');
    assert.ok(Object.isFrozen(caps));
  });

  await t.test('resolveCapabilities merges user overrides', () => {
    const caps = resolveCapabilities('anthropic', { extendedCache: false, extendedThinking: false });
    assert.equal(caps.extendedCache, false);
    assert.equal(caps.extendedThinking, false);
    // Other caps retain defaults
    assert.equal(caps.compaction, 'api');
    assert.equal(caps.promptCaching, true);
  });

  await t.test('resolveCapabilities ignores unknown override keys', () => {
    const caps = resolveCapabilities('anthropic', { unknownCap: true });
    assert.equal(caps.unknownCap, undefined);
  });

  await t.test('resolveCapabilities returns frozen result', () => {
    const caps = resolveCapabilities('openrouter', { nativeToolUse: false });
    assert.ok(Object.isFrozen(caps));
  });

  await t.test('resolveCapabilities handles null overrides', () => {
    const caps = resolveCapabilities('ollama', null);
    assert.equal(caps.nativeToolUse, false);
    assert.ok(Object.isFrozen(caps));
  });

  await t.test('resolveCapabilities defaults for unknown provider', () => {
    const caps = resolveCapabilities('unknown');
    assert.equal(caps.promptCaching, false);
    assert.ok(Object.isFrozen(caps));
  });
});
