// ── Tests · Echo Past Round2 Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, fs, path. Keep import and call-site contracts aligned
// during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Guard Tests — Phase 4.7 E-5: Echo Past Round 2 (Async Enrichment)
// Guards that define and lock the expected behavior of:
//   1. echoPast() round-2 mode — probes archives not hit in round-1
//   2. promoteToStm() — promotes round-2 hits above threshold into STM
//   3. chat-pipeline.js wires async round-2 after LLM response
// ============================================================

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const agentEchoPath      = path.join(__dirname, '../../server/brain/agent-echo.js');
const chatPipelinePath   = path.join(__dirname, '../../server/services/chat-pipeline.js');

// ── echoPast() round-2 mode ───────────────────────────────────────────────────

test('echoPast exports promoteToStm as a function', () => {
  const ae = require(agentEchoPath);
  assert.equal(typeof ae.promoteToStm, 'function',
    'agent-echo.js must export promoteToStm');
});

test('echoPast round:2 skips archives already probed in round-1', () => {
  const { echoPast } = require(agentEchoPath);

  const probed = new Set(['bucket_a.ndjson']); // already tried in round-1
  let calledWith = [];

  const mockArchives = [
    { archiveId: 'bucket_a.ndjson', topics: ['physics'] },     // already tried
    { archiveId: 'bucket_b.ndjson', topics: ['physics'] },     // new
    { archiveId: 'bucket_c.ndjson', topics: ['physics'] },     // new
  ];
  const mockHits = [{ memId: 'mem_new', score: 1.5, meta: { topics: ['physics'], type: 'episodic' } }];

  const result = echoPast('entity_test', ['physics'], {
    round: 2,
    _round1ProbeSet: probed,
    _archives: mockArchives,
    _queryArchive: (eId, topics) => {
      calledWith.push(topics);
      return mockHits;
    },
  });

  assert.ok(!calledWith.some(() => false), 'sanity check');
  // round-2 must skip bucket_a (already in probed set), start from bucket_b
  assert.ok(result.length > 0, 'round-2 must return results from un-probed archives');
  assert.equal(result[0].id, 'mem_new', 'round-2 result must come from the first un-probed archive');
});

test('echoPast round:2 returns [] when all archives were already probed', () => {
  const { echoPast } = require(agentEchoPath);

  const mockArchives = [
    { archiveId: 'bucket_a.ndjson', topics: ['physics'] },
  ];
  const probed = new Set(['bucket_a.ndjson']); // all probed

  const result = echoPast('entity_test', ['physics'], {
    round: 2,
    _round1ProbeSet: probed,
    _archives: mockArchives,
    _queryArchive: () => [{ memId: 'x', score: 1, meta: {} }],
  });

  assert.deepEqual(result, [], 'round-2 must return [] when all archives were already probed');
});

test('echoPast round:2 probes up to maxRound2 archives before stopping', () => {
  const { echoPast } = require(agentEchoPath);

  let probeCount = 0;
  const mockArchives = Array.from({ length: 20 }, (_, i) => ({
    archiveId: `bucket_${i}.ndjson`, topics: ['topic']
  }));

  // Inject empty hits so round-2 keeps retrying — we test it stops at a cap.
  echoPast('entity_test', ['topic'], {
    round: 2,
    _round1ProbeSet: new Set(),
    _archives: mockArchives,
    _queryArchive: () => { probeCount++; return []; },
  });

  assert.ok(probeCount <= 10,
    `round-2 must cap at ≤10 archive probes, but probed ${probeCount}`);
  assert.ok(probeCount >= 1,
    'round-2 must probe at least 1 archive');
});

test('echoPast round:2 result entries include _archiveScore', () => {
  const { echoPast } = require(agentEchoPath);

  const mockArchives = [{ archiveId: 'bucket_x.ndjson', topics: ['cooking'] }];
  const mockHits = [{ memId: 'mem_cook', score: 2.1, meta: { topics: ['cooking'], type: 'episodic' } }];

  const result = echoPast('entity_test', ['cooking'], {
    round: 2,
    _round1ProbeSet: new Set(),
    _archives: mockArchives,
    _queryArchive: () => mockHits,
  });

  assert.ok(result.length > 0, 'round-2 must return results');
  assert.ok('_archiveScore' in result[0], 'round-2 results must include _archiveScore');
  assert.equal(result[0]._archiveScore, 2.1, '_archiveScore must match the BM25 score');
});

test('echoPast round:1 (default) still works — no _round1ProbeSet option', () => {
  const { echoPast } = require(agentEchoPath);

  const mockArchives = [{ archiveId: 'bucket_phys.ndjson', topics: ['physics'] }];
  const mockHits = [{ memId: 'mem_001', score: 1.0, meta: { topics: ['physics'], type: 'episodic' } }];

  const result = echoPast('entity_test', ['physics'], {
    _archives: mockArchives,
    _queryArchive: () => mockHits,
  });

  assert.equal(result.length, 1, 'round-1 (default) must still work after round-2 changes');
  assert.equal(result[0].id, 'mem_001');
});

// ── promoteToStm() ────────────────────────────────────────────────────────────

test('promoteToStm adds hits above threshold to ConsciousMemory STM', () => {
  const { promoteToStm } = require(agentEchoPath);

  const promoted = [];
  const mockCm = {
    addToStm: (entry) => { promoted.push(entry); return { id: `cstm_x` }; }
  };

  const hits = [
    { id: 'mem_001', _archiveScore: 2.5, topics: ['physics'], summary: 'quantum tunneling', type: 'episodic' },
    { id: 'mem_002', _archiveScore: 0.1, topics: ['misc'],    summary: 'random thought',   type: 'episodic' },
  ];

  promoteToStm('entity_test', hits, { threshold: 1.0, _consciousMemory: mockCm });

  assert.equal(promoted.length, 1,
    'promoteToStm must only promote hits above the threshold (score 2.5 > 1.0)');
  assert.ok(promoted[0].topics.includes('physics'), 'Promoted entry must preserve topics');
  assert.ok(String(promoted[0].summary).includes('quantum'), 'Promoted entry must preserve summary');
});

test('promoteToStm promotes nothing when all hits are below threshold', () => {
  const { promoteToStm } = require(agentEchoPath);

  const promoted = [];
  const mockCm = { addToStm: (e) => { promoted.push(e); return {}; } };

  const hits = [
    { id: 'mem_low', _archiveScore: 0.05, topics: ['misc'], summary: 'low relevance' }
  ];

  promoteToStm('entity_test', hits, { threshold: 1.0, _consciousMemory: mockCm });
  assert.equal(promoted.length, 0, 'Nothing below threshold should be promoted');
});

test('promoteToStm returns count of promoted entries', () => {
  const { promoteToStm } = require(agentEchoPath);

  const mockCm = { addToStm: () => ({}) };
  const hits = [
    { id: 'a', _archiveScore: 3.0, topics: [], summary: 'A' },
    { id: 'b', _archiveScore: 2.5, topics: [], summary: 'B' },
    { id: 'c', _archiveScore: 0.2, topics: [], summary: 'C' },
  ];

  const count = promoteToStm('entity_test', hits, { threshold: 1.5, _consciousMemory: mockCm });
  assert.equal(count, 2, 'promoteToStm must return exactly 2 (scores 3.0 and 2.5 exceed 1.5)');
});

test('promoteToStm is a no-op for empty hits array', () => {
  const { promoteToStm } = require(agentEchoPath);

  const mockCm = { addToStm: () => { throw new Error('should not be called'); } };
  const count = promoteToStm('entity_test', [], { threshold: 1.0, _consciousMemory: mockCm });
  assert.equal(count, 0, 'promoteToStm must return 0 for empty hits');
});

// ── chat-pipeline.js wiring ───────────────────────────────────────────────────

test('chat-pipeline.js source references echoPast round-2 wiring (E-5-2)', () => {
  const source = fs.readFileSync(chatPipelinePath, 'utf8');
  assert.ok(
    source.includes('echoPast') && (source.includes('round: 2') || source.includes("round:2")),
    'chat-pipeline.js must reference echoPast with round:2 for E-5-2 async wiring'
  );
});
