// ── MA-core config + capability integration tests ──────────────────────────
// Slice 3: Verify resolveCapabilities is wired into loadConfig / setConfig,
// and context window inference works as expected.
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

// We need to isolate MA-core from the real filesystem.
// Strategy: use a temp directory and override CONFIG_PATH via a fresh require.

function makeTmpMA() {
  const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-caps-test-'));
  const tmp = path.join(tmpParent, 'MA');
  const dirs = [
    'MA-Config',
    'MA-entity/entity_ma/memories/episodic',
    'MA-entity/entity_ma/memories/semantic',
    'MA-entity/entity_ma/index',
    'MA-workspace',
    'MA-knowledge',
    'MA-scripts',
    'MA-server',
    'MA-skills'
  ];
  fs.mkdirSync(tmp, { recursive: true });
  for (const d of dirs) {
    fs.mkdirSync(path.join(tmp, d), { recursive: true });
  }
  fs.mkdirSync(path.join(tmpParent, 'Config'), { recursive: true });
  return tmp;
}

function writeConfig(tmpRoot, cfg) {
  const cfgPath = path.join(tmpRoot, 'MA-Config', 'ma-config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

function readSavedConfig(tmpRoot) {
  const cfgPath = path.join(tmpRoot, 'MA-Config', 'ma-config.json');
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

function readSavedGlobalConfig(tmpRoot) {
  const cfgPath = path.join(tmpRoot, '..', 'Config', 'ma-config.json');
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

// ── _inferContextWindow tests (unit-level, no filesystem) ───────────────────

describe('_inferContextWindow logic', () => {
  // We test the logic indirectly via getConfig().contextWindow after setConfig.
  // The function is private, so we verify through the public API.

  it('anthropic opus/sonnet → 1M context', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'anthropic', apiKey: 'sk-test', model: 'claude-sonnet-4-6' });
      // Isolate MA-core by rewriting its path constants
      const core = requireFreshCore(tmpRoot);
      core.boot();
      const cfg = core.getConfig();
      assert.equal(cfg.contextWindow, 1000000);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('anthropic haiku → 200K context', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'anthropic', apiKey: 'sk-test', model: 'claude-haiku-4-5' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      const cfg = core.getConfig();
      assert.equal(cfg.contextWindow, 200000);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('ollama → 32K default', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      const cfg = core.getConfig();
      assert.equal(cfg.contextWindow, 32768);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('openrouter → 128K default', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'openrouter', apiKey: 'sk-test', model: 'anthropic/claude-sonnet-4-6' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      const cfg = core.getConfig();
      assert.equal(cfg.contextWindow, 128000);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ── resolveCapabilities wiring via loadConfig ───────────────────────────────

describe('loadConfig wires resolveCapabilities', () => {
  it('anthropic config gets capabilities.promptCaching = true', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'anthropic', apiKey: 'sk-test', model: 'claude-sonnet-4-6' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      const cfg = core.getConfig();
      assert.ok(cfg.capabilities, 'should have .capabilities');
      assert.equal(cfg.capabilities.promptCaching, true);
      assert.equal(cfg.capabilities.extendedThinking, true);
      assert.equal(cfg.capabilities.nativeToolUse, true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('ollama config gets capabilities.nativeToolUse = false', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      const cfg = core.getConfig();
      assert.ok(cfg.capabilities);
      assert.equal(cfg.capabilities.nativeToolUse, false);
      assert.equal(cfg.capabilities.promptCaching, false);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('unconfigured (no API key) → config stays null', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'openrouter', apiKey: 'YOUR_API_KEY_HERE', model: 'test' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      assert.equal(core.getConfig(), null);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ── setConfig wires resolveCapabilities ─────────────────────────────────────

describe('setConfig wires resolveCapabilities', () => {
  it('sets capabilities when switching providers', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      // Switch to anthropic
      core.setConfig({ type: 'anthropic', apiKey: 'sk-new', model: 'claude-opus-4-6' });
      const cfg = core.getConfig();
      assert.equal(cfg.capabilities.promptCaching, true);
      assert.equal(cfg.contextWindow, 1000000);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('does not persist computed capabilities to disk', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      core.setConfig({ type: 'anthropic', apiKey: 'sk-test', model: 'claude-sonnet-4-6' });
      const saved = readSavedConfig(tmpRoot);
      assert.equal(saved.capabilities, undefined, 'computed capabilities should not be saved');
      assert.equal(saved.contextWindow, undefined, 'contextWindow should not be saved');
      assert.equal(saved.type, 'anthropic');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('preserves user-level capability overrides to disk', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      core.setConfig({
        type: 'anthropic',
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-6',
        _userCapabilities: { extendedThinking: false }
      });
      const saved = readSavedConfig(tmpRoot);
      assert.deepStrictEqual(saved.capabilities, { extendedThinking: false });
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('persists maxTokens and vision in unified profile.ma config', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      core.setConfig({
        type: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1/messages',
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-6',
        maxTokens: 16384,
        vision: true,
        _userCapabilities: { extendedThinking: true, thinkingBudget: 16384 }
      });

      const savedGlobal = readSavedGlobalConfig(tmpRoot);
      const runtime = savedGlobal.profiles[savedGlobal.lastActive].ma;
      assert.equal(runtime.maxTokens, 16384);
      assert.equal(runtime.vision, true);
      assert.deepStrictEqual(runtime.capabilities, { extendedThinking: true, thinkingBudget: 16384 });
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
      fs.rmSync(path.join(tmpRoot, '..', 'Config'), { recursive: true, force: true });
    }
  });

  it('contextWindow honours explicit override', async () => {
    const tmpRoot = makeTmpMA();
    try {
      writeConfig(tmpRoot, { type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3' });
      const core = requireFreshCore(tmpRoot);
      core.boot();
      core.setConfig({ type: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3', contextWindow: 65536 });
      const cfg = core.getConfig();
      assert.equal(cfg.contextWindow, 65536, 'explicit contextWindow should be preserved');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ── Helper: fresh MA-core with overridden paths ─────────────────────────────

/**
 * Load MA-core module with a temp directory as root.
 * Copies all source files and creates a node_modules junction
 * so transitive deps (zod, etc.) resolve correctly.
 */
function requireFreshCore(tmpRoot) {
  const maRoot = path.join(__dirname, '..');

  // Copy MA-server/*.js
  const serverSrc = path.join(maRoot, 'MA-server');
  const serverDst = path.join(tmpRoot, 'MA-server');
  for (const f of fs.readdirSync(serverSrc).filter(f => f.endsWith('.js'))) {
    fs.copyFileSync(path.join(serverSrc, f), path.join(serverDst, f));
  }

  // Copy MA-scripts/*.js (agent-definitions etc.)
  const scriptsSrc = path.join(maRoot, 'MA-scripts');
  const scriptsDst = path.join(tmpRoot, 'MA-scripts');
  if (fs.existsSync(scriptsSrc)) {
    for (const f of fs.readdirSync(scriptsSrc).filter(f => f.endsWith('.js'))) {
      fs.copyFileSync(path.join(scriptsSrc, f), path.join(scriptsDst, f));
    }
  }

  // Junction node_modules so zod and other deps resolve
  const nmSrc = path.join(maRoot, 'node_modules');
  const nmDst = path.join(tmpRoot, 'node_modules');
  if (fs.existsSync(nmSrc) && !fs.existsSync(nmDst)) {
    fs.symlinkSync(nmSrc, nmDst, 'junction');
  }

  // Clear require cache for all temp-dir modules
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(tmpRoot)) delete require.cache[key];
  }

  return require(path.join(serverDst, 'MA-core.js'));
}
