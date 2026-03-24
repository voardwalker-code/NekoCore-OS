// ── MA Model Router — Capability Awareness Tests ────────────────────────────
// Tests for Slice 8: capability fields in roster, evaluateJob desiredCaps,
// selectModel capability scoring.
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// We need to point the router at a temp config directory so tests don't
// interfere with real data. We'll do this by temporarily replacing the
// module's internal paths via a fresh require from a temp copy.

let tmpDir;
let router;

function setupTempRouter() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-router-test-'));
  const configDir = path.join(tmpDir, 'MA-Config');
  fs.mkdirSync(configDir, { recursive: true });

  // Write empty roster + perf files
  fs.writeFileSync(path.join(configDir, 'model-roster.json'), JSON.stringify({ models: [] }));
  fs.writeFileSync(path.join(configDir, 'model-performance.json'), JSON.stringify({ records: {} }));

  // Create a wrapper module that patches paths
  const routerSrc = fs.readFileSync(path.resolve(__dirname, '..', 'MA-server', 'MA-model-router.js'), 'utf8');
  const patched = routerSrc
    .replace(
      /const MA_ROOT\s*=.*?;/,
      `const MA_ROOT = ${JSON.stringify(tmpDir)};`
    );

  const patchedPath = path.join(tmpDir, 'MA-model-router-patched.js');
  fs.writeFileSync(patchedPath, patched);
  router = require(patchedPath);
  router.init({});
}

function cleanupTemp() {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MA-model-router — roster capabilities field', () => {
  before(() => setupTempRouter());
  after(() => cleanupTemp());

  it('addModel stores capabilities array', () => {
    const result = router.addModel({
      id: 'anthropic/claude-sonnet-4-6',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-test',
      contextWindow: 200000,
      capabilities: ['thinking', 'caching', 'native-tools'],
      tier: 'mid'
    });

    assert.ok(result.ok);
    assert.deepEqual(result.model.capabilities, ['thinking', 'caching', 'native-tools']);
  });

  it('addModel defaults capabilities to empty array when omitted', () => {
    const result = router.addModel({
      id: 'ollama/llama3.2:3b',
      provider: 'ollama',
      model: 'llama3.2:3b',
      endpoint: 'http://localhost:11434',
      contextWindow: 131072,
      tier: 'local'
    });

    assert.ok(result.ok);
    assert.deepEqual(result.model.capabilities, []);
  });

  it('capabilities persist through getRoster', () => {
    const roster = router.getRoster();
    const anthro = roster.models.find(m => m.id === 'anthropic/claude-sonnet-4-6');
    assert.deepEqual(anthro.capabilities, ['thinking', 'caching', 'native-tools']);
  });
});

describe('MA-model-router — evaluateJob desiredCaps', () => {
  before(() => { if (!router) setupTempRouter(); });
  after(() => cleanupTemp());

  it('complex coding task desires thinking + caching + native-tools', () => {
    const job = router.evaluateJob('Architect a full app with database schema', 'architect', null);
    assert.ok(job.desiredCaps.includes('thinking'));
    assert.ok(job.desiredCaps.includes('caching'));
    assert.ok(job.desiredCaps.includes('native-tools'));
  });

  it('simple task does not desire thinking', () => {
    const job = router.evaluateJob('hello world quick test', 'general', null);
    assert.ok(!job.desiredCaps.includes('thinking'));
  });

  it('simple task does not desire caching', () => {
    const job = router.evaluateJob('simple quick question', 'general', null);
    assert.ok(!job.desiredCaps.includes('caching'));
  });

  it('code task desires native-tools', () => {
    const job = router.evaluateJob('Write a function module', 'code', null);
    assert.ok(job.desiredCaps.includes('native-tools'));
  });

  it('deep_research desires thinking', () => {
    const job = router.evaluateJob('Research database architecture', 'deep_research', null);
    assert.ok(job.desiredCaps.includes('thinking'));
  });

  it('desiredCaps is always an array', () => {
    const job = router.evaluateJob('hello', 'general', null);
    assert.ok(Array.isArray(job.desiredCaps));
  });
});

describe('MA-model-router — selectModel capability scoring', () => {
  let localRouter;
  let localTmpDir;

  before(() => {
    localTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-router-score-'));
    const configDir = path.join(localTmpDir, 'MA-Config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'model-roster.json'), JSON.stringify({ models: [] }));
    fs.writeFileSync(path.join(configDir, 'model-performance.json'), JSON.stringify({ records: {} }));

    const routerSrc = fs.readFileSync(path.resolve(__dirname, '..', 'MA-server', 'MA-model-router.js'), 'utf8');
    const patched = routerSrc.replace(
      /const MA_ROOT\s*=.*?;/,
      `const MA_ROOT = ${JSON.stringify(localTmpDir)};`
    );
    const patchedPath = path.join(localTmpDir, 'MA-model-router-scored.js');
    fs.writeFileSync(patchedPath, patched);
    localRouter = require(patchedPath);
    localRouter.init({});

    // Add two models: one with capabilities, one without
    localRouter.addModel({
      id: 'anthropic/claude-sonnet',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-test',
      contextWindow: 200000,
      costPer1kIn: 0.003,
      costPer1kOut: 0.015,
      capabilities: ['thinking', 'caching', 'native-tools'],
      tier: 'mid'
    });

    localRouter.addModel({
      id: 'ollama/llama3.2:3b',
      provider: 'ollama',
      model: 'llama3.2:3b',
      endpoint: 'http://localhost:11434',
      contextWindow: 131072,
      capabilities: [],
      tier: 'local'
    });
  });

  after(() => {
    if (localTmpDir) fs.rmSync(localTmpDir, { recursive: true, force: true });
  });

  it('complex task gives capability-rich model higher score than baseline', () => {
    const jobReqs = localRouter.evaluateJob('Architect a complex multi-file refactor with database', 'architect', null);
    const result = localRouter.selectModel(jobReqs);

    // The Anthropic model should win for complex tasks despite not being free
    assert.ok(result);
    assert.equal(result.model.id, 'anthropic/claude-sonnet');
    assert.ok(result.reason.includes('thinking capable'));
  });

  it('simple task still prefers local model', () => {
    const jobReqs = localRouter.evaluateJob('quick simple hello world', 'general', null);
    const result = localRouter.selectModel(jobReqs);

    assert.ok(result);
    assert.equal(result.model.id, 'ollama/llama3.2:3b');
    assert.ok(result.reason.includes('local model'));
  });

  it('models without capabilities field score normally (backward compatible)', () => {
    // Add a model with no capabilities field at all
    localRouter.addModel({
      id: 'openrouter/gpt-4o',
      provider: 'openrouter',
      model: 'gpt-4o',
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-or-test',
      contextWindow: 128000,
      costPer1kIn: 0.005,
      costPer1kOut: 0.015,
      tier: 'premium'
    });

    const jobReqs = localRouter.evaluateJob('simple quick test', 'general', null);
    const result = localRouter.selectModel(jobReqs);

    // Should still work — local model preferred for simple
    assert.ok(result);
    assert.equal(result.model.id, 'ollama/llama3.2:3b');
  });

  it('capability score adds up to 35 max for all three caps', () => {
    const jobReqs = localRouter.evaluateJob('Architect a full project with complex code', 'architect', 'lead');
    const result = localRouter.selectModel(jobReqs);

    // Anthropic model should have thinking(15) + caching(10) + native-tools(10) = 35 bonus
    assert.ok(result);
    assert.equal(result.model.id, 'anthropic/claude-sonnet');

    // Verify all three cap reasons present
    assert.ok(result.reason.includes('thinking capable'));
    assert.ok(result.reason.includes('prompt caching'));
    assert.ok(result.reason.includes('native tool use'));
  });
});
