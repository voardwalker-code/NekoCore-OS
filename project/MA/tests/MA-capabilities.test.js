// ── MA-capabilities.js Tests ─────────────────────────────────────────────────
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { getCapabilities, hasCapability, resolveCapabilities, PROVIDER_CAPS } = require('../MA-server/MA-capabilities');

describe('getCapabilities()', () => {
  it('returns anthropic defaults for type=anthropic', () => {
    const caps = getCapabilities('anthropic');
    assert.equal(caps.promptCaching, true);
    assert.equal(caps.extendedCache, true);
    assert.equal(caps.compaction, false);
    assert.equal(caps.extendedThinking, true);
    assert.equal(caps.adaptiveThinking, true);
    assert.equal(caps.nativeToolUse, true);
    assert.equal(caps.contextEditing, true);
  });

  it('returns openrouter defaults for type=openrouter', () => {
    const caps = getCapabilities('openrouter');
    assert.equal(caps.promptCaching, false);
    assert.equal(caps.extendedCache, false);
    assert.equal(caps.compaction, 'prompt');
    assert.equal(caps.extendedThinking, false);
    assert.equal(caps.nativeToolUse, true);
  });

  it('returns ollama defaults for type=ollama', () => {
    const caps = getCapabilities('ollama');
    assert.equal(caps.promptCaching, false);
    assert.equal(caps.compaction, 'prompt');
    assert.equal(caps.nativeToolUse, false);
  });

  it('returns ollama defaults for unknown provider type', () => {
    const caps = getCapabilities('unknown-provider');
    assert.equal(caps.promptCaching, false);
    assert.equal(caps.nativeToolUse, false);
  });

  it('returns a copy (not a reference to the original)', () => {
    const caps1 = getCapabilities('anthropic');
    const caps2 = getCapabilities('anthropic');
    caps1.promptCaching = false;
    assert.equal(caps2.promptCaching, true);
  });
});

describe('hasCapability()', () => {
  it('returns true for supported anthropic capabilities', () => {
    const config = { type: 'anthropic' };
    assert.equal(hasCapability(config, 'promptCaching'), true);
    assert.equal(hasCapability(config, 'extendedThinking'), true);
  });

  it('returns false for unsupported ollama capabilities', () => {
    const config = { type: 'ollama' };
    assert.equal(hasCapability(config, 'promptCaching'), false);
    assert.equal(hasCapability(config, 'extendedThinking'), false);
    assert.equal(hasCapability(config, 'nativeToolUse'), false);
  });

  it('returns capability mode/default for compaction', () => {
    assert.equal(hasCapability({ type: 'anthropic' }, 'compaction'), false);
    assert.equal(hasCapability({ type: 'ollama' }, 'compaction'), 'prompt');
  });

  it('user override replaces provider default', () => {
    const config = {
      type: 'anthropic',
      capabilities: { extendedThinking: false }
    };
    assert.equal(hasCapability(config, 'extendedThinking'), false);
  });

  it('user override true on ollama enables capability', () => {
    const config = {
      type: 'ollama',
      capabilities: { nativeToolUse: true }
    };
    assert.equal(hasCapability(config, 'nativeToolUse'), true);
  });

  it('returns false for completely unknown capability names', () => {
    assert.equal(hasCapability({ type: 'anthropic' }, 'teleportation'), false);
  });

  it('falls back to ollama defaults for unknown provider', () => {
    const config = { type: 'mystery' };
    assert.equal(hasCapability(config, 'promptCaching'), false);
  });
});

describe('resolveCapabilities()', () => {
  it('returns frozen object', () => {
    const resolved = resolveCapabilities({ type: 'anthropic' });
    assert.throws(() => { resolved.promptCaching = false; }, TypeError);
  });

  it('returns provider defaults when no overrides', () => {
    const resolved = resolveCapabilities({ type: 'anthropic' });
    assert.equal(resolved.promptCaching, true);
    assert.equal(resolved.extendedThinking, true);
    assert.equal(resolved.compaction, false);
  });

  it('applies user overrides over provider defaults', () => {
    const resolved = resolveCapabilities({
      type: 'anthropic',
      capabilities: { extendedThinking: false, extendedCache: false }
    });
    assert.equal(resolved.extendedThinking, false);
    assert.equal(resolved.extendedCache, false);
    // Others unchanged
    assert.equal(resolved.promptCaching, true);
    assert.equal(resolved.compaction, false);
  });

  it('ignores unknown capability keys in overrides', () => {
    const resolved = resolveCapabilities({
      type: 'ollama',
      capabilities: { fakeCapability: true }
    });
    assert.equal(resolved.fakeCapability, undefined);
  });

  it('works with empty capabilities object', () => {
    const resolved = resolveCapabilities({
      type: 'openrouter',
      capabilities: {}
    });
    assert.equal(resolved.nativeToolUse, true);
    assert.equal(resolved.promptCaching, false);
  });

  it('ollama user with all defaults gets conservative settings', () => {
    const resolved = resolveCapabilities({ type: 'ollama' });
    assert.equal(resolved.promptCaching, false);
    assert.equal(resolved.extendedCache, false);
    assert.equal(resolved.extendedThinking, false);
    assert.equal(resolved.adaptiveThinking, false);
    assert.equal(resolved.nativeToolUse, false);
    assert.equal(resolved.contextEditing, false);
    assert.equal(resolved.compaction, 'prompt');
  });
});
