// ============================================================
// Guard Tests — Phase 4.7 E-0: Agent Echo + Echo Now
// Guards that define and lock expected behavior of:
//   1. agent-echo.js module shape (echoNow, echoPast, echoFuture)
//   2. echoNow() behavioral contract with fixture data
//   3. ConsciousMemory STM_MAX_ENTRIES cap + shouldConsolidate()
//   4. phase-deep-sleep consolidation trigger wiring (source-scan)
//
// These tests MUST remain green after E-0 implementation.
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const agentEchoPath      = path.join(__dirname, '../../server/brain/agent-echo.js');
const consciousMemPath   = path.join(__dirname, '../../server/brain/memory/conscious-memory.js');
const deepSleepPhasePath = path.join(__dirname, '../../server/brain/cognition/phases/phase-deep-sleep.js');

// ── Module shape ─────────────────────────────────────────────────────────────

test('agent-echo.js exists at expected path', () => {
  assert.ok(fs.existsSync(agentEchoPath), 'agent-echo.js must exist at server/brain/agent-echo.js');
});

test('agent-echo exports echoNow as a function', () => {
  const agentEcho = require(agentEchoPath);
  assert.equal(typeof agentEcho.echoNow, 'function', 'echoNow must be exported as a function');
});

test('agent-echo exports echoPast as a function', () => {
  const agentEcho = require(agentEchoPath);
  assert.equal(typeof agentEcho.echoPast, 'function', 'echoPast must be exported as a function');
});

test('agent-echo exports echoFuture as a function', () => {
  const agentEcho = require(agentEchoPath);
  assert.equal(typeof agentEcho.echoFuture, 'function', 'echoFuture must be exported as a function');
});

// ── echoNow behavioral contract ──────────────────────────────────────────────

test('echoNow returns empty array when topics is empty', () => {
  const { echoNow } = require(agentEchoPath);
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  cm.addToStm({ summary: 'some memory', topics: ['physics'] });
  const result = echoNow('test_entity', [], 8, { consciousMemory: cm });
  assert.deepEqual(result, [], 'echoNow must return [] when topics is empty');
});

test('echoNow returns empty array when topics is null', () => {
  const { echoNow } = require(agentEchoPath);
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  cm.addToStm({ summary: 'some memory', topics: ['physics'] });
  const result = echoNow('test_entity', null, 8, { consciousMemory: cm });
  assert.deepEqual(result, [], 'echoNow must return [] when topics is null');
});

test('echoNow returns relevant STM entries by topic overlap', () => {
  const { echoNow } = require(agentEchoPath);
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  cm.addToStm({ summary: 'Physics discussion', topics: ['physics', 'science'] });
  cm.addToStm({ summary: 'Cooking recipes', topics: ['cooking', 'food'] });
  cm.addToStm({ summary: 'Science fair', topics: ['science', 'school'] });

  const result = echoNow('test_entity', ['physics', 'science'], 5, { consciousMemory: cm });
  assert.ok(result.length >= 1, 'echoNow must return at least one result for matching topics');
  const summaries = result.map(e => e.summary);
  // Physics/science entry must rank above cooking entry
  const physicsIdx = summaries.indexOf('Physics discussion');
  const cookingIdx = summaries.indexOf('Cooking recipes');
  assert.ok(physicsIdx !== -1, 'Physics discussion must appear in results');
  if (cookingIdx !== -1) {
    assert.ok(physicsIdx < cookingIdx, 'Physics entry (higher overlap) must rank above cooking entry');
  }
});

test('echoNow deduplicates entries appearing in both STM and LTM', () => {
  const { echoNow } = require(agentEchoPath);
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();

  // Add same entry to both STM and LTM directly via internal maps
  const stmEntry = cm.addToStm({ summary: 'Shared memory', topics: ['shared'] });
  // Simulate the same id appearing in LTM pool by directly calling addToLtm
  cm.addToLtm({ id: stmEntry.id, summary: 'Shared memory', topics: ['shared'] });

  const result = echoNow('test_entity', ['shared'], 10, { consciousMemory: cm });
  const ids = result.map(e => e.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, 'echoNow must not return duplicate ids');
});

test('echoNow respects the limit parameter', () => {
  const { echoNow } = require(agentEchoPath);
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  for (let i = 0; i < 10; i++) {
    cm.addToStm({ summary: `memory ${i}`, topics: ['shared'] });
  }
  const result = echoNow('test_entity', ['shared'], 3, { consciousMemory: cm });
  assert.ok(result.length <= 3, `echoNow must return at most limit entries; got ${result.length}`);
});

test('echoNow returns an array (not null or undefined)', () => {
  const { echoNow } = require(agentEchoPath);
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  const result = echoNow('test_entity', ['anything'], 5, { consciousMemory: cm });
  assert.ok(Array.isArray(result), 'echoNow must always return an array');
});

// ── echoPast stub ─────────────────────────────────────────────────────────────

test('echoPast returns an array (stub for E-2)', () => {
  const { echoPast } = require(agentEchoPath);
  const result = echoPast('test_entity', ['topics'], {});
  assert.ok(Array.isArray(result), 'echoPast stub must return an array');
});

// ── echoFuture stub ───────────────────────────────────────────────────────────

test('echoFuture returns null (stub for Phase 5)', () => {
  const { echoFuture } = require(agentEchoPath);
  const result = echoFuture('test_entity');
  assert.equal(result, null, 'echoFuture stub must return null');
});

// ── ConsciousMemory STM_MAX_ENTRIES cap ──────────────────────────────────────

test('ConsciousMemory.STM_MAX_ENTRIES is exported and equals 8000', () => {
  const ConsciousMemory = require(consciousMemPath);
  assert.equal(ConsciousMemory.STM_MAX_ENTRIES, 8000,
    'ConsciousMemory.STM_MAX_ENTRIES must equal 8000');
});

test('ConsciousMemory has shouldConsolidate() method', () => {
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  assert.equal(typeof cm.shouldConsolidate, 'function',
    'ConsciousMemory must have shouldConsolidate() method');
});

test('shouldConsolidate() returns false when STM is empty', () => {
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  assert.equal(cm.shouldConsolidate(), false,
    'shouldConsolidate() must return false when STM is below cap');
});

test('shouldConsolidate() returns true after STM_MAX_ENTRIES entries are added', () => {
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  const cap = ConsciousMemory.STM_MAX_ENTRIES;
  for (let i = 0; i <= cap; i++) {
    cm.addToStm({ summary: `entry ${i}`, topics: ['test'] });
  }
  assert.equal(cm.shouldConsolidate(), true,
    'shouldConsolidate() must return true when STM size reaches STM_MAX_ENTRIES');
});

test('ConsciousMemory has clearConsolidationFlag() method', () => {
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  assert.equal(typeof cm.clearConsolidationFlag, 'function',
    'ConsciousMemory must have clearConsolidationFlag() method');
});

test('clearConsolidationFlag() resets shouldConsolidate() to false', () => {
  const ConsciousMemory = require(consciousMemPath);
  const cm = new ConsciousMemory();
  const cap = ConsciousMemory.STM_MAX_ENTRIES;
  for (let i = 0; i <= cap; i++) {
    cm.addToStm({ summary: `entry ${i}`, topics: ['test'] });
  }
  assert.equal(cm.shouldConsolidate(), true, 'Pre-condition: shouldConsolidate must be true');
  cm.clearConsolidationFlag();
  assert.equal(cm.shouldConsolidate(), false,
    'clearConsolidationFlag() must reset consolidation flag to false');
});

// ── phase-deep-sleep consolidation wiring (source-scan) ──────────────────────

test('phase-deep-sleep source contains shouldConsolidate call', () => {
  const src = fs.readFileSync(deepSleepPhasePath, 'utf8');
  assert.ok(src.includes('shouldConsolidate'),
    'phase-deep-sleep.js must call shouldConsolidate() to detect STM cap');
});

test('phase-deep-sleep source contains clearConsolidationFlag call', () => {
  const src = fs.readFileSync(deepSleepPhasePath, 'utf8');
  assert.ok(src.includes('clearConsolidationFlag'),
    'phase-deep-sleep.js must call clearConsolidationFlag() after consolidation');
});
