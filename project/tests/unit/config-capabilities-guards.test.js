'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createConfigRuntime } = require('../../server/services/config-runtime');

// ── Config schema extension tests (Slice 2) ──────────────────────────────────
// Verify that normalizeAspectRuntimeConfig + resolveProfileAspectConfigs
// correctly attach resolved capabilities from provider defaults + user overrides.

test('Config Capabilities Integration', async (t) => {

  // ── resolveProfileAspectConfigs with capabilities ──────────────────────
  const { resolveProfileAspectConfigs, loadAspectRuntimeConfig } = createConfigRuntime({
    getConfig: () => ({
      lastActive: 'test-profile',
      profiles: {
        'test-profile': {
          main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' },
          subconscious: { type: 'ollama', model: 'llama3.2:3b' },
          capabilities: { extendedCache: false, extendedThinking: true }
        }
      }
    })
  });

  await t.test('resolveProfileAspectConfigs: anthropic main gets anthropic defaults', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.ok(configs.main.capabilities, 'main should have capabilities');
    assert.equal(configs.main.capabilities.promptCaching, true);
    assert.equal(configs.main.capabilities.extendedCache, true);
    assert.equal(configs.main.capabilities.compaction, 'api');
  });

  await t.test('resolveProfileAspectConfigs: ollama aspects get ollama defaults', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' },
      subconscious: { type: 'ollama', model: 'llama3.2:3b' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.equal(configs.subconscious.capabilities.promptCaching, false);
    assert.equal(configs.subconscious.capabilities.extendedCache, false);
    assert.equal(configs.subconscious.capabilities.nativeToolUse, false);
  });

  await t.test('resolveProfileAspectConfigs: user overrides merge with defaults', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' },
      capabilities: { extendedCache: false, extendedThinking: false }
    };
    const configs = resolveProfileAspectConfigs(profile);
    // User override: extendedCache disabled
    assert.equal(configs.main.capabilities.extendedCache, false);
    assert.equal(configs.main.capabilities.extendedThinking, false);
    // Other anthropic defaults preserved
    assert.equal(configs.main.capabilities.promptCaching, true);
    assert.equal(configs.main.capabilities.compaction, 'api');
  });

  await t.test('resolveProfileAspectConfigs: capabilities are frozen', () => {
    const profile = {
      main: { type: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.ok(Object.isFrozen(configs.main.capabilities));
  });

  await t.test('resolveProfileAspectConfigs: no capabilities block = pure provider defaults', () => {
    const profile = {
      main: { type: 'ollama', model: 'llama3.2:3b' }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.equal(configs.main.capabilities.nativeToolUse, false);
    assert.equal(configs.main.capabilities.extendedCache, false);
  });

  await t.test('resolveProfileAspectConfigs: legacy format also gets capabilities', () => {
    const profile = {
      _activeType: 'openrouter',
      apikey: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        key: 'sk-or-test',
        model: 'openai/gpt-4o'
      }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.ok(configs.main.capabilities, 'legacy main should have capabilities');
    assert.equal(configs.main.capabilities.nativeToolUse, true); // OpenRouter has native tools
    assert.equal(configs.main.capabilities.extendedCache, false);
  });

  await t.test('resolveProfileAspectConfigs: legacy ollama gets capabilities', () => {
    const profile = {
      _activeType: 'ollama',
      ollama: {
        url: 'http://localhost:11434',
        model: 'llama3.2:3b'
      }
    };
    const configs = resolveProfileAspectConfigs(profile);
    assert.ok(configs.main.capabilities, 'legacy ollama should have capabilities');
    assert.equal(configs.main.capabilities.nativeToolUse, false);
    assert.equal(configs.main.capabilities.compaction, 'prompt');
  });

  // ── loadAspectRuntimeConfig with capabilities ─────────────────────────
  await t.test('loadAspectRuntimeConfig: returns runtime with capabilities', () => {
    const rt = loadAspectRuntimeConfig('main');
    assert.ok(rt, 'should resolve runtime');
    assert.ok(rt.capabilities, 'should have capabilities');
    assert.equal(rt.type, 'anthropic');
    // Profile overrides: extendedCache=false, extendedThinking=true
    assert.equal(rt.capabilities.extendedCache, false);
    assert.equal(rt.capabilities.extendedThinking, true);
    // Anthropic defaults preserved for non-overridden caps
    assert.equal(rt.capabilities.promptCaching, true);
  });

  await t.test('loadAspectRuntimeConfig: subconscious ollama gets ollama caps with profile overrides', () => {
    const rt = loadAspectRuntimeConfig('subconscious');
    assert.ok(rt, 'should resolve runtime');
    assert.equal(rt.type, 'ollama');
    assert.ok(rt.capabilities);
    assert.equal(rt.capabilities.nativeToolUse, false);
    // Profile-level override applies to all aspects in the profile
    // extendedThinking=true from profile overrides ollama default of false
    assert.equal(rt.capabilities.extendedThinking, true);
  });

  await t.test('loadAspectRuntimeConfig: inline config gets capabilities', () => {
    const rt = loadAspectRuntimeConfig('main', {
      main: { type: 'ollama', model: 'phi3:mini' }
    });
    assert.ok(rt, 'should resolve inline runtime');
    assert.equal(rt.type, 'ollama');
    assert.ok(rt.capabilities);
    assert.equal(rt.capabilities.nativeToolUse, false);
  });
});
