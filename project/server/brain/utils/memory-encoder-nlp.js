// ============================================================
// NLP Memory Encoder (Token Optimization T1-2)
//
// Drop-in replacement for the LLM-based memory encoding in
// post-response-memory.js. Uses RAKE + YAKE for topics,
// extractive summarization for semantic/narrative, lexicon
// for emotion, heuristic for importance, and pattern matching
// for factual knowledge extraction.
//
// Public API:
//   encodeMemory(userMessage, entityResponse, opts?) →
//     { topics, semantic, narrative, emotion, importance, knowledge }
//
// NO LLM calls. All processing is on-device NLP.
// ============================================================

const { extractPhrases } = require('./rake');
const { extractKeywords } = require('./yake');
const { scoreSentiment } = require('../cognition/cognitive-feedback');

// ── Emotion Labels ────────────────────────────────────────────────────────────

const EMOTION_MAP = [
  { label: 'joy',         test: (s) => s.positive >= 4 && s.net > 3 },
  { label: 'gratitude',   test: (s) => s.positive >= 3 && s.net > 1 },
  { label: 'excitement',  test: (s) => s.positive >= 2 && s.net > 1.5 },
  { label: 'frustration', test: (s) => s.negative >= 4 && s.net < -3 },
  { label: 'sadness',     test: (s) => s.negative >= 3 && s.net < -2 },
  { label: 'concern',     test: (s) => s.negative >= 2 && s.net < -1 },
  { label: 'curiosity',   test: (_, text) => (text.match(/\?/g) || []).length >= 2 },
  { label: 'neutral',     test: () => true }
];

// ── Importance Signals ────────────────────────────────────────────────────────

const IMPORTANCE_SIGNALS = {
  questionDensity:   (text) => Math.min(1, (text.match(/\?/g) || []).length * 0.2),
  exclamationDensity:(text) => Math.min(1, (text.match(/!/g) || []).length * 0.15),
  topicRichness:     (_text, topics) => Math.min(1, topics.length * 0.08),
  lengthSignal:      (text) => Math.min(1, text.length / 800),
  sentimentStrength: (_text, _topics, sentiment) => Math.min(1, Math.abs(sentiment.net) * 0.1),
  personalPronouns:  (text) => {
    const lower = text.toLowerCase();
    const hits = ['i ', 'my ', 'me ', 'myself', 'we ', 'our '].filter(p => lower.includes(p));
    return Math.min(1, hits.length * 0.12);
  }
};

// ── Sentence Extraction (TextRank-lite) ───────────────────────────────────────

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 10 && s.length <= 300);
}

function overlapScore(sentA, sentB) {
  const wordsA = new Set(sentA.toLowerCase().split(/\s+/));
  const wordsB = new Set(sentB.toLowerCase().split(/\s+/));
  let shared = 0;
  for (const w of wordsA) { if (wordsB.has(w)) shared++; }
  return shared / (Math.log(wordsA.size + 1) + Math.log(wordsB.size + 1) || 1);
}

function extractTopSentences(text, count = 2) {
  const sentences = splitSentences(text);
  if (sentences.length <= count) return sentences;

  // Score each sentence by cumulative overlap with all other sentences
  const scores = sentences.map((s, i) => {
    let score = 0;
    for (let j = 0; j < sentences.length; j++) {
      if (i !== j) score += overlapScore(s, sentences[j]);
    }
    // Slight position bias — earlier sentences carry more intro context
    score *= (1 + 0.1 / (i + 1));
    return { sentence: s, score, index: i };
  });

  // Return top-N by score, in original order
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, count);
  top.sort((a, b) => a.index - b.index);
  return top.map(t => t.sentence);
}

// ── Knowledge Extraction ──────────────────────────────────────────────────────

const FACTUAL_PATTERNS = [
  /(?:is|are|was|were)\s+(?:a|an|the)\s+.{5,60}/i,
  /(?:called|named|known as)\s+.{3,40}/i,
  /(?:born|created|founded|started|established)\s+(?:in|on|at)\s+.{3,30}/i,
  /(?:capital|population|language|currency)\s+(?:of|is)\s+.{3,40}/i,
  /(?:means|refers to|defined as)\s+.{5,60}/i,
  /(?:located|found|situated)\s+(?:in|at|near)\s+.{3,40}/i
];

function extractKnowledge(userMessage, entityResponse) {
  const combined = userMessage + ' ' + entityResponse;
  const found = [];

  for (const pattern of FACTUAL_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      const snippet = match[0].trim();
      if (snippet.length >= 10 && snippet.length <= 120) {
        found.push(snippet);
      }
    }
  }

  if (found.length === 0) return '';
  // Return the longest factual snippet
  found.sort((a, b) => b.length - a.length);
  return found[0];
}

// ── Main Encoder ──────────────────────────────────────────────────────────────

/**
 * Encode a conversation turn into memory-ready structured data.
 * @param {string} userMessage — the user's message
 * @param {string} entityResponse — the entity's response
 * @param {object} [opts] — optional overrides
 * @returns {{ topics: string[], semantic: string, narrative: string, emotion: string, importance: number, knowledge: string }}
 */
function encodeMemory(userMessage, entityResponse, opts = {}) {
  const combined = (userMessage || '') + ' ' + (entityResponse || '');

  // ── Topics: RAKE phrases + YAKE keywords, deduplicated ──────────────
  const rakePhrases = extractPhrases(userMessage || '', 8);
  const yakeKeywords = extractKeywords(combined, 8);
  const topicSet = new Set();
  for (const p of rakePhrases) topicSet.add(p.toLowerCase());
  for (const k of yakeKeywords) topicSet.add(k.toLowerCase());
  const topics = [...topicSet].slice(0, 12);

  // ── Semantic summary: top 1-2 sentences from combined text ──────────
  const topSentences = extractTopSentences(combined, 2);
  const semantic = topSentences.length > 0
    ? topSentences[0].slice(0, 200)
    : combined.slice(0, 150).trim();

  // ── Narrative: experience description from entity perspective ────────
  const entitySentences = extractTopSentences(entityResponse || '', 2);
  const narrative = entitySentences.length > 0
    ? entitySentences.join(' ').slice(0, 300)
    : (entityResponse || '').slice(0, 200).trim();

  // ── Emotion: lexicon-based detection ────────────────────────────────
  const sentiment = scoreSentiment(combined);
  let emotion = 'neutral';
  for (const e of EMOTION_MAP) {
    if (e.test(sentiment, combined)) {
      emotion = e.label;
      break;
    }
  }

  // ── Importance: heuristic composite ─────────────────────────────────
  let importance = 0.35; // baseline
  for (const [, fn] of Object.entries(IMPORTANCE_SIGNALS)) {
    importance += fn(combined, topics, sentiment) * 0.1;
  }
  importance = Math.max(0.3, Math.min(0.95, importance));

  // ── Knowledge: factual statement extraction ─────────────────────────
  const knowledge = extractKnowledge(userMessage || '', entityResponse || '');

  return { topics, semantic, narrative, emotion, importance, knowledge };
}

module.exports = { encodeMemory };
