// ── Tests · Config Runtime Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/services/config-runtime. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createConfigRuntime } = require('../../server/services/config-runtime');

// Use factory with a dummy getConfig
const {
  normalizeAspectRuntimeConfig,
  normalizeSubconsciousRuntimeConfig,
  mapAspectKey,
  resolveProfileAspectConfigs
} = createConfigRuntime({ getConfig: () => ({}) });

// ── normalizeAspectRuntimeConfig guards ──────────────────────────────────────

test('Config Runtime Guard Tests', async (t) => {

  // ── Null / invalid input ───────────────────────────────────────────────
  await t.test('returns null for null input', () => {
    assert.equal(normalizeAspectRuntimeConfig(null), null);
  });

  await t.test('returns null for empty object', () => {
    assert.equal(normalizeAspectRuntimeConfig({}), null);
  });

  await t.test('returns null for non-object input', () => {
    assert.equal(normalizeAspectRuntimeConfig('hello'), null);
  });

  // ── OpenRouter type ────────────────────────────────────────────────────
  await t.test('openrouter: normalizes with explicit type', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o'
    });
    assert.deepEqual(result, {
      type: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o'
    });
  });

  await t.test('openrouter: applies default endpoint when missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'openrouter',
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o'
    });
    assert.equal(result.endpoint, 'https://openrouter.ai/api/v1/chat/completions');
  });

  await t.test('openrouter: returns null when apiKey is missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openai/gpt-4o'
    });
    assert.equal(result, null);
  });

  await t.test('openrouter: returns null when model is missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: 'sk-or-test'
    });
    assert.equal(result, null);
  });

  await t.test('openrouter: accepts key as alternative to apiKey', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'openrouter',
      key: 'sk-or-alt',
      model: 'openai/gpt-4o'
    });
    assert.equal(result.apiKey, 'sk-or-alt');
  });

  // ── Anthropic type ─────────────────────────────────────────────────────
  await t.test('anthropic: normalizes with explicit type', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    });
    assert.deepEqual(result, {
      type: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    });
  });

  await t.test('anthropic: applies default endpoint when missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    });
    assert.equal(result.endpoint, 'https://api.anthropic.com/v1/messages');
  });

  await t.test('anthropic: returns null when apiKey is missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'anthropic',
      model: 'claude-sonnet-4-6'
    });
    assert.equal(result, null);
  });

  await t.test('anthropic: returns null when model is missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'anthropic',
      apiKey: 'sk-ant-test'
    });
    assert.equal(result, null);
  });

  // ── Ollama type ────────────────────────────────────────────────────────
  await t.test('ollama: normalizes with explicit type', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3.2:3b'
    });
    assert.deepEqual(result, {
      type: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3.2:3b'
    });
  });

  await t.test('ollama: applies default endpoint when missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'ollama',
      model: 'llama3.2:3b'
    });
    assert.equal(result.endpoint, 'http://localhost:11434');
  });

  await t.test('ollama: does not require apiKey', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'ollama',
      model: 'llama3.2:3b'
    });
    assert.ok(result, 'Ollama should normalize without apiKey');
    assert.equal(result.apiKey, undefined);
  });

  await t.test('ollama: returns null when model is missing', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'ollama',
      endpoint: 'http://localhost:11434'
    });
    assert.equal(result, null);
  });

  // ── Inferred types ─────────────────────────────────────────────────────
  await t.test('inferred: openrouter from endpoint+key+model (no type)', () => {
    const result = normalizeAspectRuntimeConfig({
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      key: 'sk-test',
      model: 'openai/gpt-4o'
    });
    assert.equal(result.type, 'openrouter');
  });

  await t.test('inferred: ollama from ollamaUrl+ollamaModel (no type)', () => {
    const result = normalizeAspectRuntimeConfig({
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2:3b'
    });
    assert.equal(result.type, 'ollama');
  });

  // ── Type normalization ─────────────────────────────────────────────────
  await t.test('type is case-insensitive', () => {
    const result = normalizeAspectRuntimeConfig({
      type: 'ANTHROPIC',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6'
    });
    assert.equal(result.type, 'anthropic');
  });

  // ── mapAspectKey ───────────────────────────────────────────────────────
  await t.test('mapAspectKey: main for empty/null', () => {
    assert.equal(mapAspectKey(''), 'main');
    assert.equal(mapAspectKey(null), 'main');
  });

  await t.test('mapAspectKey: maps subconscious', () => {
    assert.equal(mapAspectKey('subconscious'), 'subconscious');
    assert.equal(mapAspectKey('sub'), 'subconscious');
  });

  await t.test('mapAspectKey: maps dream', () => {
    assert.equal(mapAspectKey('dream'), 'dream');
  });

  await t.test('mapAspectKey: maps orchestrator', () => {
    assert.equal(mapAspectKey('orchestrator'), 'orchestrator');
    assert.equal(mapAspectKey('orchestr'), 'orchestrator');
  });

  await t.test('mapAspectKey: maps nekocore', () => {
    assert.equal(mapAspectKey('nekocore'), 'nekocore');
  });

  await t.test('mapAspectKey: maps conscious to main', () => {
    assert.equal(mapAspectKey('conscious'), 'main');
  });

  // ── resolveProfileAspectConfigs ────────────────────────────────────────
  await t.test('resolveProfileAspectConfigs: returns empty for null profile', () => {
    assert.deepEqual(resolveProfileAspectConfigs(null), {});
  });

  await t.test('resolveProfileAspectConfigs: multi-aspect format populates all aspects', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.ok(configs.main, 'main should be populated');
    assert.ok(configs.subconscious, 'subconscious should fallback to main');
    assert.ok(configs.dream, 'dream should fallback to main');
    assert.ok(configs.orchestrator, 'orchestrator should fallback to main');
    // All should be the same when only main is specified
    assert.equal(configs.subconscious.model, 'claude-sonnet-4-6');
    assert.equal(configs.dream.model, 'claude-sonnet-4-6');
    assert.equal(configs.orchestrator.model, 'claude-sonnet-4-6');
  });

  await t.test('resolveProfileAspectConfigs: per-aspect overrides work', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' },
      subconscious: { type: 'ollama', model: 'llama3.2:3b' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.equal(configs.main.type, 'anthropic');
    assert.equal(configs.subconscious.type, 'ollama');
    // Dream/orchestrator should still fallback to main
    assert.equal(configs.dream.type, 'anthropic');
    assert.equal(configs.orchestrator.type, 'anthropic');
  });

  await t.test('resolveProfileAspectConfigs: nekocore does not fallback to main', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.equal(configs.nekocore, null, 'nekocore should not fallback to main');
  });

  // ── normalizeSubconsciousRuntimeConfig ─────────────────────────────────
  await t.test('normalizeSubconsciousRuntimeConfig: openrouter from endpoint+key+model', () => {
    const result = normalizeSubconsciousRuntimeConfig({
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      key: 'sk-test',
      model: 'openai/gpt-4o'
    });
    assert.equal(result.type, 'openrouter');
    assert.equal(result.apiKey, 'sk-test');
  });

  await t.test('normalizeSubconsciousRuntimeConfig: ollama from ollamaUrl+ollamaModel', () => {
    const result = normalizeSubconsciousRuntimeConfig({
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2:3b'
    });
    assert.equal(result.type, 'ollama');
    assert.equal(result.endpoint, 'http://localhost:11434');
  });

  await t.test('normalizeSubconsciousRuntimeConfig: returns null for invalid input', () => {
    assert.equal(normalizeSubconsciousRuntimeConfig(null), null);
    assert.equal(normalizeSubconsciousRuntimeConfig({}), null);
  });
});
