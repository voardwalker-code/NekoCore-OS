// ── Tests · Bm25 Scoring.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/brain/utils/bm25. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * tests/unit/bm25-scoring.test.js
 * IME Phase I1-1 guard tests — BM25 relevance scoring
 *
 * Verifies:
 *   1. Exact match gives higher score than partial match
 *   2. Longer document is penalised vs shorter document with same matches
 *   3. Zero matches returns 0
 *   4. Empty query or empty doc returns 0
 *   5. bm25ScoreWithImportance: importance and decay affect output correctly
 *   6. BM25 fallback path in memory-retrieval is not exercised for well-formed meta
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { bm25Score, bm25ScoreWithImportance, K1, B, AVG_DL } = require('../../server/brain/utils/bm25');

// ── 1. More matching topics → higher score ────────────────────────────────────
test('BM25: full match scores higher than partial match', () => {
  const query  = ['pipeline', 'memory', 'orchestration'];
  const fullMatch    = ['pipeline', 'memory', 'orchestration', 'core'];
  const partialMatch = ['pipeline', 'unrelated', 'topics', 'here'];

  const full    = bm25Score(query, fullMatch);
  const partial = bm25Score(query, partialMatch);
  assert.ok(full > partial, `full (${full}) should be > partial (${partial})`);
});

// ── 2. Length normalisation — shorter doc wins at same TF count ───────────────
test('BM25: shorter document scores higher than longer doc with equal matches', () => {
  const query  = ['memory', 'pipeline'];
  const short  = ['memory', 'pipeline'];   // exactly  2 topics
  const long   = ['memory', 'pipeline', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa'];

  const scoreShort = bm25Score(query, short);
  const scoreLong  = bm25Score(query, long);
  assert.ok(scoreShort > scoreLong,
    `short doc (${scoreShort.toFixed(4)}) should score higher than long doc (${scoreLong.toFixed(4)})`);
});

// ── 3. Zero matches returns 0 ─────────────────────────────────────────────────
test('BM25: zero overlap returns 0', () => {
  const score = bm25Score(['memory', 'pipeline'], ['unrelated', 'topics', 'only']);
  assert.equal(score, 0);
});

// ── 4. Empty inputs return 0 ──────────────────────────────────────────────────
test('BM25: empty query returns 0', () => {
  assert.equal(bm25Score([], ['memory', 'pipeline']), 0);
});

test('BM25: empty doc returns 0', () => {
  assert.equal(bm25Score(['memory', 'pipeline'], []), 0);
});

test('BM25: null query returns 0', () => {
  assert.equal(bm25Score(null, ['memory', 'pipeline']), 0);
});

test('BM25: null doc returns 0', () => {
  assert.equal(bm25Score(['memory', 'pipeline'], null), 0);
});

// ── 5. bm25ScoreWithImportance — importance/decay modulate output ─────────────
test('BM25WithImportance: high-importance memory scores higher than low-importance', () => {
  const query = ['memory', 'pipeline'];
  const doc   = ['memory', 'pipeline', 'core'];

  const high = bm25ScoreWithImportance(query, doc, 1.0, 1.0);
  const low  = bm25ScoreWithImportance(query, doc, 0.1, 0.1);
  assert.ok(high > low, `high importance (${high.toFixed(4)}) should > low (${low.toFixed(4)})`);
});

test('BM25WithImportance: returns 0 when no topic overlap', () => {
  const score = bm25ScoreWithImportance(['memory', 'pipeline'], ['unrelated'], 1.0, 1.0);
  assert.equal(score, 0);
});

test('BM25WithImportance: score is greater than 0 for matching topics', () => {
  const score = bm25ScoreWithImportance(['memory', 'pipeline'], ['memory', 'pipeline', 'core'], 0.8, 0.9);
  assert.ok(score > 0, `Expected positive score, got ${score}`);
});

// ── 6. BM25 gives consistently positive scores across range of realistic inputs ─
test('BM25: scores are non-negative for all inputs', () => {
  const cases = [
    { q: ['memory'],             d: ['memory', 'dream', 'pipeline'] },
    { q: ['pipeline', 'system'], d: ['pipeline', 'orchestration']   },
    { q: ['belief', 'state'],    d: ['belief', 'state', 'entropy']  },
  ];
  for (const { q, d } of cases) {
    const score = bm25Score(q, d);
    assert.ok(score >= 0, `Expected non-negative score for q=${q}, d=${d} — got ${score}`);
  }
});

// ── 7. Module exports expected constants ──────────────────────────────────────
test('BM25: module exports expected constants', () => {
  assert.equal(K1,     1.5);
  assert.equal(B,      0.75);
  assert.equal(AVG_DL, 8);
});
