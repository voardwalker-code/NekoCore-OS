// ============================================================
// Shape Classifier — Heuristic memory shape labeling (Phase 5)
//
// Assigns a shape label to a memory record based on its content,
// emotional charge, importance, and type.  Purely algorithmic —
// no LLM calls.  Applied at memory creation time and during
// archive index rebuild for legacy records.
// ============================================================

'use strict';

const { VALID_SHAPES } = require('../../contracts/memory-schema');

// Re-export for convenience — single source of truth stays in memory-schema.
const SHAPE_LABELS = VALID_SHAPES;

// ── Strong-emotion set (triggers 'emotional' shape) ─────────────────────────

const STRONG_EMOTIONS = new Set([
  'anger', 'joy', 'sadness', 'fear', 'love', 'grief',
  'rage', 'elation', 'despair', 'terror', 'adoration', 'heartbreak'
]);

// ── Pattern lists ───────────────────────────────────────────────────────────

const FUTURE_MARKERS = [
  'will ', 'plan ', 'plan to ', 'want to ', 'going to ',
  'hope to ', 'hoping to ', 'next ', 'tomorrow', 'someday',
  'intend to ', 'looking forward', 'in the future'
];

const REFLECTIVE_MARKERS = [
  'i think ', 'i feel ', 'i realize', 'i realise',
  "i've been", 'i have been', 'looking back',
  'i wonder', 'i believe', 'i noticed',
  'i used to', 'i remember when'
];

// ── Classifier ──────────────────────────────────────────────────────────────

/**
 * Classify a memory's shape from its signals.  Rules are applied in
 * strict priority order — first match wins.
 *
 * @param {Object} params
 * @param {string}  [params.semantic]   — full semantic text content
 * @param {string}  [params.emotion]    — emotionalTag value
 * @param {string[]}[params.topics]     — topic array
 * @param {number}  [params.importance] — importance score (0–1)
 * @param {string}  [params.type]       — memory type (episodic, semantic_knowledge, etc.)
 * @returns {string} One of SHAPE_LABELS
 */
function classifyShape({ semantic = '', emotion = '', topics = [], importance = 0.5, type = 'episodic' } = {}) {
  const lowerSemantic = (typeof semantic === 'string' ? semantic : '').toLowerCase();
  const lowerEmotion  = (typeof emotion === 'string' ? emotion : '').toLowerCase().trim();

  // 1. emotional — strong emotional charge OR very high importance
  if (STRONG_EMOTIONS.has(lowerEmotion) || importance >= 0.85) {
    return 'emotional';
  }

  // 2. anticipatory — future-oriented language in the content
  if (lowerSemantic && FUTURE_MARKERS.some(m => lowerSemantic.includes(m))) {
    return 'anticipatory';
  }

  // 3. reflective — self-referential / introspective language
  if (lowerSemantic && REFLECTIVE_MARKERS.some(m => lowerSemantic.includes(m))) {
    return 'reflective';
  }

  // 4. factual — semantic knowledge type, or neutral/absent emotion with low importance
  if (type === 'semantic_knowledge') {
    return 'factual';
  }
  if ((!lowerEmotion || lowerEmotion === 'neutral') && importance < 0.6) {
    return 'factual';
  }

  // 5. narrative — default fallback (most episodic memories)
  return 'narrative';
}

module.exports = { classifyShape, SHAPE_LABELS };
