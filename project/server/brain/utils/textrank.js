// ── Brain · Textrank ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/utils/textrank.js
 * IME Phase I2-0 — TextRank Extractive Summarization
 *
 * Pure JS TextRank implementation (~150 lines).
 * Produces a high-quality extractive abstract by selecting the most
 * "central" sentences from a passage using sentence similarity PageRank.
 *
 * Replaces first-N-char truncation for semantic.txt write-time generation
 * and doc-ingestion chunk abstracts.
 *
 * Public API:
 *   extractTopSentences(text, maxSentences?)  → string   (joined abstract)
 *   rankSentences(text, maxSentences?)        → string[] (ranked sentence array)
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Split a text block into individual sentences.
 * Handles common terminal punctuation; avoids splitting on abbreviations
 * by requiring a capital letter or end-of-string after the punctuation.
 *
 * @param {string} text
 * @returns {string[]}
 */
// splitSentences()
// WHAT THIS DOES: splitSentences is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call splitSentences(...) where this helper behavior is needed.
function splitSentences(text) {
  // Split on . ! ? followed by optional whitespace and an uppercase letter or EOL.
  const raw = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])\s*$/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return raw;
}

/**
 * Tokenize a sentence into a normalized word-frequency map.
 * Filters out very short words (< 3 chars) and common stopwords.
 *
 * @param {string} sentence
 * @returns {Map<string, number>} word → count
 */
const TR_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'was', 'are', 'be', 'been', 'being', 'it', 'its', 'this', 'that', 'these',
  'those', 'as', 'by', 'from', 'not', 'we', 'he', 'she', 'they', 'you', 'i',
  'also', 'but', 'so', 'if', 'do', 'did', 'does', 'had', 'has', 'have',
]);
// tokenizeToFreq()
// WHAT THIS DOES: tokenizeToFreq is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call tokenizeToFreq(...) where this helper behavior is needed.
function tokenizeToFreq(sentence) {
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !TR_STOPWORDS.has(w));

  const freq = new Map();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

/**
 * Cosine-similarity approximation between two sentence term-frequency maps.
 * Returns value in [0, 1].
 *
 * @param {Map<string, number>} freqA
 * @param {Map<string, number>} freqB
 * @returns {number}
 */
// cosineSimilarity()
// WHAT THIS DOES: cosineSimilarity is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call cosineSimilarity(...) where this helper behavior is needed.
function cosineSimilarity(freqA, freqB) {
  if (freqA.size === 0 || freqB.size === 0) return 0;

  let dotProduct = 0;
  for (const [word, countA] of freqA) {
    const countB = freqB.get(word);
    if (countB) dotProduct += countA * countB;
  }
  if (dotProduct === 0) return 0;

  let normA = 0;
  for (const c of freqA.values()) normA += c * c;
  let normB = 0;
  for (const c of freqB.values()) normB += c * c;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a normalized sentence-similarity adjacency matrix.
 * Only pairs with similarity above `threshold` are linked (sparse graph).
 *
 * @param {Map<string,number>[]} freqMaps
 * @param {number}               [threshold=0.1]
 * @returns {number[][]}  N×N row-normalized adjacency matrix
 */
// buildSimilarityGraph()
// WHAT THIS DOES: buildSimilarityGraph creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildSimilarityGraph(...) before code that depends on this setup.
function buildSimilarityGraph(freqMaps, threshold = 0.1) {
  const n = freqMaps.length;
  const graph = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const sim = cosineSimilarity(freqMaps[i], freqMaps[j]);
      if (sim >= threshold) graph[i][j] = sim;
    }
    // Normalise row
    const rowSum = graph[i].reduce((s, v) => s + v, 0);
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) graph[i][j] /= rowSum;
    }
  }
  return graph;
}

/**
 * Run PageRank on the similarity graph.
 *
 * @param {number[][]} graph           - Row-normalized adjacency matrix
 * @param {number}     [iterations=20]
 * @param {number}     [damping=0.85]
 * @returns {number[]} score per sentence index
 */
// pageRank()
// WHAT THIS DOES: pageRank is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call pageRank(...) where this helper behavior is needed.
function pageRank(graph, iterations = 20, damping = 0.85) {
  const n = graph.length;
  if (n === 0) return [];

  let scores = new Array(n).fill(1 / n);

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Array(n).fill((1 - damping) / n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        newScores[j] += damping * scores[i] * graph[i][j];
      }
    }
    scores = newScores;
  }
  return scores;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the top-ranked sentences from text, sorted by their original position
 * so the summary reads naturally.
 *
 * Falls back to first-sentence truncation if the text is too short for
 * meaningful graph ranking (< 2 sentences that survive tokenization).
 *
 * @param {string} text
 * @param {number} [maxSentences=3]
 * @returns {string[]}  Ordered array of representative sentences
 */
// rankSentences()
// WHAT THIS DOES: rankSentences is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call rankSentences(...) where this helper behavior is needed.
function rankSentences(text, maxSentences = 3) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return [];

  const sentences = splitSentences(text).filter(s => s.length >= 20);
  if (sentences.length <= maxSentences) return sentences;

  const freqMaps = sentences.map(tokenizeToFreq);

  // Require at least 2 sentences with content words for a meaningful graph
  const contentSentences = freqMaps.filter(f => f.size >= 2);
  if (contentSentences.length < 2) {
    return sentences.slice(0, maxSentences);
  }

  const graph  = buildSimilarityGraph(freqMaps);
  const scores = pageRank(graph);

  // Rank by score, then restore document order for the top N
  const indexed = scores.map((score, idx) => ({ idx, score }));
  indexed.sort((a, b) => b.score - a.score);

  const topIndices = indexed
    .slice(0, maxSentences)
    .map(x => x.idx)
    .sort((a, b) => a - b);   // restore original order

  return topIndices.map(i => sentences[i]);
}

/**
 * Extract a high-quality abstract from text using TextRank.
 * Returns the selected sentences joined with a single space.
 *
 * This is the primary drop-in replacement for:
 *   text.slice(0, 3000)   (doc-ingestion chunk summaries)
 *   content.slice(0, 280) (memory semantic.txt write-time truncation)
 *
 * @param {string} text
 * @param {number} [maxSentences=3]
 * @returns {string}
 */
// extractTopSentences()
// WHAT THIS DOES: extractTopSentences is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call extractTopSentences(...) where this helper behavior is needed.
function extractTopSentences(text, maxSentences = 3) {
  return rankSentences(text, maxSentences).join(' ');
}

module.exports = {
  extractTopSentences,
  rankSentences,
  // Exports for testing internals
  splitSentences,
  cosineSimilarity,
  buildSimilarityGraph,
  pageRank,
};
