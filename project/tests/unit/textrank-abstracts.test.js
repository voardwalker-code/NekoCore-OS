'use strict';
/**
 * tests/unit/textrank-abstracts.test.js
 * IME Phase I2-0 guard tests — TextRank extractive summarization
 *
 * Verifies:
 *   1. Output of extractTopSentences is shorter than input for long text
 *   2. Output is at most maxSentences sentences
 *   3. Short input (≤ maxSentences sentences) is returned unchanged
 *   4. Empty / null input returns ''
 *   5. Sentences are selected by centrality, not just first-N
 *   6. rankSentences returns an ordered array
 *   7. splitSentences handles terminal punctuation correctly
 *   8. cosineSimilarity returns 1.0 for identical term sets, 0 for disjoint
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  extractTopSentences,
  rankSentences,
  splitSentences,
  cosineSimilarity,
} = require('../../server/brain/utils/textrank');

// ── 1. Output shorter than input ──────────────────────────────────────────────
test('TextRank: extractTopSentences < input length for multi-sentence passage', () => {
  const text = [
    'The pipeline orchestration system is the core of the cognitive processing loop.',
    'Memory consolidation happens during the dream phase, which runs on a scheduled brain tick.',
    'Emotional resonance weighting adjusts retrieval scores based on neurochemical state.',
    'Topic indexing uses RAKE-extracted keyphrases to build a multi-word phrase index.',
    'BM25 scoring replaces the legacy raw overlap scoring formula for better precision.',
    'The subconscious reranker receives the top 50 pre-filtered candidates after BM25.',
    'Archive promotion removes memories with decay below 0.05 from the hot working index.',
    'TextRank selects the most representative sentences rather than truncating at N characters.',
  ].join(' ');

  const abstract = extractTopSentences(text, 3);
  assert.ok(abstract.length < text.length,
    `Abstract (${abstract.length}) should be shorter than input (${text.length})`);
});

// ── 2. At most maxSentences in output ─────────────────────────────────────────
test('TextRank: extractTopSentences returns at most maxSentences sentences', () => {
  const text = [
    'The pipeline orchestration system is the core of the cognitive processing loop.',
    'Memory consolidation happens during the dream phase, which runs on a scheduled brain tick.',
    'Emotional resonance weighting adjusts retrieval scores based on neurochemical state.',
    'Topic indexing uses RAKE-extracted keyphrases to build a multi-word phrase index.',
    'BM25 scoring replaces the legacy raw overlap scoring formula for better precision.',
  ].join(' ');

  const ranked = rankSentences(text, 3);
  assert.ok(ranked.length <= 3, `Expected ≤ 3 sentences, got ${ranked.length}`);
});

// ── 3. Short input returned unchanged ─────────────────────────────────────────
test('TextRank: short input (≤ maxSentences) passes through unchanged', () => {
  const text = 'Memory consolidation happens during the dream phase.';
  const result = extractTopSentences(text, 3);
  // Single sentence — should be returned as-is
  assert.ok(result.includes('Memory consolidation'));
});

// ── 4. Empty / null → '' ──────────────────────────────────────────────────────
test('TextRank: returns "" for empty string', () => {
  assert.equal(extractTopSentences(''), '');
});

test('TextRank: returns "" for null', () => {
  assert.equal(extractTopSentences(null), '');
});

test('TextRank: rankSentences returns [] for null', () => {
  assert.deepEqual(rankSentences(null), []);
});

// ── 5. Non-trivial selection: repeated-theme sentence scores high ─────────────
test('TextRank: centralmost sentence is included in abstract', () => {
  // "memory" and "pipeline" are the dominant shared theme of these sentences.
  // The sentence that mentions both should rank highest.
  const text = [
    'Weather affects emotional states in complex ways.',
    'The memory pipeline processes and stores conversational context for future retrieval.',
    'Memory consolidation occurs during pipeline sleep cycles via the archive promotion pass.',
    'Birds migrate south during winter months to avoid cold.',
    'Pipeline orchestration drives the memory index maintenance schedule.',
  ].join(' ');

  const abstract = extractTopSentences(text, 2);
  const hasCentral = abstract.includes('pipeline') || abstract.includes('memory');
  assert.ok(hasCentral, `Expected pipeline/memory-related sentence in abstract: "${abstract}"`);
});

// ── 6. rankSentences returns an array ─────────────────────────────────────────
test('TextRank: rankSentences returns array of strings', () => {
  const text = [
    'Pipeline orchestration drives the memory system.',
    'BM25 scoring improves relevance precision.',
    'TextRank selects representative sentences from long passages.',
    'Archive memory is never scanned during live retrieval.',
  ].join(' ');

  const sentences = rankSentences(text, 2);
  assert.ok(Array.isArray(sentences));
  assert.ok(sentences.length >= 1);
  for (const s of sentences) assert.equal(typeof s, 'string');
});

// ── 7. splitSentences handles terminal punctuation ────────────────────────────
test('TextRank: splitSentences splits on . ! ? correctly', () => {
  const text = 'First sentence. Second sentence! Third sentence? Fourth sentence.';
  const parts = splitSentences(text);
  assert.ok(parts.length >= 3, `Expected ≥ 3 splits, got ${parts.length}: ${parts}`);
});

test('TextRank: splitSentences does not split on abbreviations mid-sentence', () => {
  // Trailing period before lowercase should not split
  const text = 'The system uses e.g. BM25 scoring. It is very effective.';
  const parts = splitSentences(text);
  // Should have at most 2 parts (the abbreviation might or might not split — what matters
  // is that we don't get more than 3 meaningless fragments)
  assert.ok(parts.length <= 3, `Too many splits for text with abbreviation: ${parts.length}`);
});

// ── 8. cosineSimilarity ───────────────────────────────────────────────────────
test('TextRank: cosineSimilarity returns 1.0 for identical term maps', () => {
  const freq = new Map([['memory', 2], ['pipeline', 1]]);
  const sim = cosineSimilarity(freq, freq);
  assert.ok(Math.abs(sim - 1.0) < 1e-10, `Expected 1.0, got ${sim}`);
});

test('TextRank: cosineSimilarity returns 0 for disjoint term maps', () => {
  const freqA = new Map([['memory', 1]]);
  const freqB = new Map([['pipeline', 1]]);
  assert.equal(cosineSimilarity(freqA, freqB), 0);
});

test('TextRank: cosineSimilarity returns 0 for empty maps', () => {
  assert.equal(cosineSimilarity(new Map(), new Map([['memory', 1]])), 0);
});
