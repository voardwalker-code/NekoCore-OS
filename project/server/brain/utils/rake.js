// ── Brain · Rake ────────────────────────────────────────────────────
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
// Exposed API includes: extractPhrases, buildCandidatePhrases,
// computeWordScores, scorePhrases.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/utils/rake.js
 * IME Phase I1-0 — RAKE Keyphrasing
 *
 * Rapid Automatic Keyword Extraction (RAKE).
 * Pure JS, zero external dependencies.
 *
 * Replaces the single-word tokenizer in extractSubconsciousTopics().
 * Multi-word phrases like "pipeline orchestration" become precise index keys
 * instead of two generic single-word tokens.
 *
 * Public API:
 *   extractPhrases(text, maxPhrases?) → string[]
 */

// ── Stopword set ──────────────────────────────────────────────────────────────
// Extended set covering common English function words that should never
// be phrase boundaries *and* never appear as standalone topics.
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'get', 'got', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'like', 'me', 'more', 'most', 'my', 'myself', 'no', 'not', 'now', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 's',
  'same', 'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'us', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  // short noise words
  'also', 'about', 'into', 'than', 'then', 'them', 'they', 'been',
]);

// Sentence-level delimiters — phrase boundaries
const PHRASE_DELIMITERS = /[.!?,;:()\[\]{}"'\n\t]+/;

/**
 * Tokenize text into candidate phrases by splitting on sentence-end punctuation
 * and stopwords. Returns array of phrase arrays (each phrase is an array of words).
 *
 * @param {string} text
 * @returns {string[][]}
 */
// buildCandidatePhrases()
// WHAT THIS DOES: buildCandidatePhrases creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildCandidatePhrases(...) before code that depends on this setup.
function buildCandidatePhrases(text) {
  // First split on hard punctuation to get sentence-level chunks
  const sentenceChunks = text.toLowerCase().split(PHRASE_DELIMITERS);
  const candidates = [];

  for (const chunk of sentenceChunks) {
    const words = chunk.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    let currentPhrase = [];
    for (const word of words) {
      // Clean the word to alphanumeric only
      const clean = word.replace(/[^a-z0-9]/g, '');
      if (!clean || clean.length < 2) {
        // Break on empty/tiny tokens
        if (currentPhrase.length > 0) {
          candidates.push(currentPhrase);
          currentPhrase = [];
        }
        continue;
      }
      if (STOPWORDS.has(clean)) {
        // Stopword = phrase boundary
        if (currentPhrase.length > 0) {
          candidates.push(currentPhrase);
          currentPhrase = [];
        }
      } else {
        currentPhrase.push(clean);
      }
    }
    if (currentPhrase.length > 0) {
      candidates.push(currentPhrase);
      currentPhrase = [];
    }
  }

  // Filter: at least one word, all words at least 3 chars, max 4 words per phrase
  return candidates.filter(p =>
    p.length >= 1 &&
    p.length <= 4 &&
    p.every(w => w.length >= 3)
  );
}

/**
 * Compute word frequency and degree scores across all candidate phrases.
 * - freq[word] = how many phrases it appears in
 * - degree[word] = total co-occurrence count (phrase length - 1) across all phrases
 *
 * RAKE word score = degree / freq
 */
// computeWordScores()
// WHAT THIS DOES: computeWordScores is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call computeWordScores(...) where this helper behavior is needed.
function computeWordScores(candidates) {
  const freq = {};
  const degree = {};

  for (const phrase of candidates) {
    const phraseLen = phrase.length;
    for (const word of phrase) {
      freq[word] = (freq[word] || 0) + 1;
      degree[word] = (degree[word] || 0) + phraseLen;
    }
  }

  const scores = {};
  for (const word of Object.keys(freq)) {
    // degree includes the word itself, so degree is always >= freq
    scores[word] = degree[word] / freq[word];
  }
  return scores;
}

/**
 * Score each candidate phrase as the sum of its word scores.
 * Returns array of { phrase: string, score: number }.
 */
// scorePhrases()
// WHAT THIS DOES: scorePhrases is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call scorePhrases(...) where this helper behavior is needed.
function scorePhrases(candidates, wordScores) {
  const seen = new Set();
  const results = [];

  for (const phrase of candidates) {
    const phraseStr = phrase.join(' ');
    if (seen.has(phraseStr)) continue;
    seen.add(phraseStr);

    let score = 0;
    for (const word of phrase) {
      score += wordScores[word] || 0;
    }
    results.push({ phrase: phraseStr, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Extract ranked keyphrases from text using RAKE.
 *
 * Falls back to single-word extraction when the text is too short
 * to produce meaningful multi-word candidates (< 2 usable phrases).
 *
 * @param {string} text          - Input text to extract from
 * @param {number} [maxPhrases]  - Maximum phrases to return (default 12)
 * @returns {string[]}           - Ranked array of phrase strings
 */
// extractPhrases()
// WHAT THIS DOES: extractPhrases is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call extractPhrases(...) where this helper behavior is needed.
function extractPhrases(text, maxPhrases = 12) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return [];

  const candidates = buildCandidatePhrases(text);
  if (candidates.length < 2) {
    // Fallback: single-word extraction (same behaviour as old tokenizer)
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w))
      .slice(0, maxPhrases);
  }

  const wordScores = computeWordScores(candidates);
  const ranked = scorePhrases(candidates, wordScores);

  return ranked.slice(0, maxPhrases).map(r => r.phrase);
}

module.exports = { extractPhrases, buildCandidatePhrases, computeWordScores, scorePhrases };
