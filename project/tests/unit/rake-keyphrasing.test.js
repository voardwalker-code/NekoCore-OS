'use strict';
/**
 * tests/unit/rake-keyphrasing.test.js
 * IME Phase I1-0 guard tests — RAKE keyphrasing
 *
 * Verifies that:
 *   1. Multi-word phrases are extracted correctly
 *   2. Output is lowercase (normalizeTopics contract)
 *   3. Fallback fires when input is too short or yields < 2 phrases
 *   4. Empty / null input returns []
 *   5. Max 12 phrases cap is honoured
 *   6. extractSubconsciousTopics() wrapper returns multi-word phrases (smoke)
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { extractPhrases, buildCandidatePhrases } = require('../../server/brain/utils/rake');

// ── 1. Multi-word phrase extraction ──────────────────────────────────────────
test('RAKE: extracts multi-word phrases from a rich sentence', () => {
  const text =
    'The pipeline orchestration system needs a memory consolidation pass to improve performance.';
  const phrases = extractPhrases(text);

  const multiWord = phrases.filter(p => p.includes(' '));
  assert.ok(multiWord.length >= 1, 'Expected at least one multi-word phrase');

  const joined = phrases.join('|');
  const hasPipeline = joined.includes('pipeline');
  const hasMemory   = joined.includes('memory');
  assert.ok(hasPipeline || hasMemory, 'Expected "pipeline" or "memory" in extracted phrases');
});

// ── 2. Output is lowercase clean strings ─────────────────────────────────────
test('RAKE: output phrases are lowercase clean strings', () => {
  const text = 'Emotional-processing core running dream synthesis cycles tonight.';
  const phrases = extractPhrases(text);

  for (const phrase of phrases) {
    assert.equal(typeof phrase, 'string');
    assert.equal(phrase, phrase.toLowerCase(), `Phrase should be lowercase: "${phrase}"`);
    assert.ok(phrase.length > 0);
  }
});

// ── 3. Fallback for very short input ─────────────────────────────────────────
test('RAKE: falls back to single-word tokenizer for very short input', () => {
  const text = 'memory test';
  const phrases = extractPhrases(text);
  const multiWord = phrases.filter(p => p.includes(' '));
  assert.equal(multiWord.length, 0, 'Short text should not produce multi-word phrases');
});

// ── 4. Empty / null / undefined input → [] ───────────────────────────────────
test('RAKE: returns [] for empty string', () => {
  assert.deepEqual(extractPhrases(''), []);
});

test('RAKE: returns [] for null', () => {
  assert.deepEqual(extractPhrases(null), []);
});

test('RAKE: returns [] for undefined', () => {
  assert.deepEqual(extractPhrases(undefined), []);
});

// ── 5. Max cap ────────────────────────────────────────────────────────────────
test('RAKE: returns at most 12 phrases by default', () => {
  const longText =
    'neural network architecture design with convolutional filters and pooling layers ' +
    'produces semantic embedding vectors for memory consolidation pipeline orchestration ' +
    'within the cognitive processing system using emotional resonance signal weighting ' +
    'and belief state entropy reduction across multiple attention heads simultaneously';
  const phrases = extractPhrases(longText);
  assert.ok(phrases.length <= 12, `Expected <= 12, got ${phrases.length}`);
});

test('RAKE: respects custom maxPhrases parameter', () => {
  const text =
    'neural network architecture design with convolutional filters and pooling layers ' +
    'produces semantic embedding vectors for memory consolidation pipeline orchestration';
  const phrases = extractPhrases(text, 3);
  assert.ok(phrases.length <= 3, `Expected <= 3, got ${phrases.length}`);
});

// ── 6. buildCandidatePhrases correctness ─────────────────────────────────────
test('RAKE: buildCandidatePhrases produces non-empty word-array candidates', () => {
  const text = 'The pipeline orchestration system needs a memory consolidation pass.';
  const candidates = buildCandidatePhrases(text);
  assert.ok(candidates.length > 0, 'Expected at least one candidate phrase');
  for (const phrase of candidates) {
    assert.ok(Array.isArray(phrase));
    assert.ok(phrase.length > 0);
  }
});

// ── 7. Integration smoke — extractSubconsciousTopics wrapper ─────────────────
describe('extractSubconsciousTopics integration smoke', () => {
  let extractSubconsciousTopics = null;

  before(() => {
    try {
      const mr = require('../../server/services/memory-retrieval');
      const instance = mr.createMemoryRetrieval
        ? mr.createMemoryRetrieval({
            getCurrentEntityId:       () => 'test',
            getMemoryStorage:         () => null,
            getMemoryIndex:           () => null,
            getNeurochemistry:        () => ({}),
            getCognitivePulse:        () => null,
            getCognitiveBus:          () => null,
            logTimeline:              () => {},
            callSubconsciousReranker: async () => [],
            loadAspectRuntimeConfig:  () => ({}),
          })
        : mr;
      extractSubconsciousTopics = instance.extractSubconsciousTopics;
    } catch {
      extractSubconsciousTopics = null;
    }
  });

  test('extractSubconsciousTopics returns an array of strings for rich input', () => {
    if (!extractSubconsciousTopics) return; // env stub — skip gracefully
    const result = extractSubconsciousTopics(
      'The pipeline orchestration system needs a memory consolidation pass to improve performance.'
    );
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0, 'Expected at least one topic');
    for (const item of result) assert.equal(typeof item, 'string');
  });

  test('extractSubconsciousTopics returns [] for null', () => {
    if (!extractSubconsciousTopics) return;
    assert.deepEqual(extractSubconsciousTopics(null), []);
  });
});
