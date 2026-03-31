// ── Brain · Cognitive Feedback ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ../utils/rake, ../utils/bm25.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ============================================================
// Cognitive State Integration — Cognitive Feedback Engine (C6)
//
// Runs async after the response is sent. Analyzes the user/entity
// exchange and determines what cognitive state changes should occur.
// ALL analysis is NLP-based (RAKE, BM25, lexicon) — NO LLM calls.
//
// Public API:
//   analyzeTurnFeedback(params) → CognitiveFeedback
// ============================================================

const { extractPhrases } = require('../utils/rake');
const { bm25Score }      = require('../utils/bm25');

// ── Sentiment Lexicon ─────────────────────────────────────────────────────────
// Weighted word lists for basic sentiment classification.
// Intensity weights: 1 = mild, 2 = moderate, 3 = strong.

const POSITIVE_LEXICON = {
  happy: 2, joy: 3, love: 3, wonderful: 3, amazing: 3, great: 2, good: 1,
  fantastic: 3, excellent: 3, beautiful: 2, kind: 2, sweet: 2, grateful: 2,
  thankful: 2, appreciate: 2, awesome: 2, perfect: 2, brilliant: 2,
  exciting: 2, delightful: 2, pleased: 1, glad: 1, nice: 1, enjoy: 2,
  fun: 1, laugh: 2, smile: 2, comfort: 2, warm: 1, trust: 2,
  proud: 2, inspired: 2, hopeful: 2, peaceful: 1, calm: 1,
  yes: 1, absolutely: 2, exactly: 1, agree: 1, right: 1, correct: 1
};

const NEGATIVE_LEXICON = {
  sad: 2, angry: 3, hate: 3, terrible: 3, awful: 3, bad: 1, horrible: 3,
  disappointing: 2, frustrated: 2, annoyed: 2, upset: 2, hurt: 2,
  betrayed: 3, abandoned: 3, lonely: 2, scared: 2, afraid: 2, anxious: 2,
  worried: 2, stressed: 2, confused: 1, lost: 1, broken: 2, wrong: 1,
  fail: 2, failure: 2, stupid: 2, ugly: 2, disgusting: 3, cruel: 3,
  mean: 2, rude: 2, unfair: 2, painful: 2, suffering: 3, miserable: 3,
  no: 1, never: 1, disagree: 1, unfortunately: 1, sorry: 1
};

// Topics that amplify emotional magnitude
const SENSITIVITY_TOPICS = new Set([
  'death', 'dying', 'grief', 'loss', 'mourning', 'funeral',
  'love', 'romance', 'relationship', 'breakup', 'divorce', 'heartbreak',
  'betrayal', 'trust', 'cheating', 'lying', 'deception',
  'abuse', 'trauma', 'violence', 'fear', 'danger',
  'achievement', 'success', 'graduation', 'promotion', 'victory',
  'family', 'parent', 'child', 'birth', 'marriage',
  'identity', 'purpose', 'meaning', 'existential', 'self'
]);

// Goal-fulfillment keyword signals
const COMPLETION_KEYWORDS = new Set([
  'done', 'finished', 'completed', 'accomplished', 'achieved', 'figured',
  'solved', 'resolved', 'worked', 'succeeded', 'managed', 'finally'
]);

/**
 * Score sentiment of a text using the lexicon.
 * Returns { positive: number, negative: number, net: number [-1, +1] }
 */
// scoreSentiment()
// WHAT THIS DOES: scoreSentiment is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call scoreSentiment(...) where this helper behavior is needed.
function scoreSentiment(text) {
  if (!text) return { positive: 0, negative: 0, net: 0 };
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  let pos = 0, neg = 0;

  for (const w of words) {
    if (POSITIVE_LEXICON[w]) pos += POSITIVE_LEXICON[w];
    if (NEGATIVE_LEXICON[w]) neg += NEGATIVE_LEXICON[w];
  }

  // Exclamation density boost
  // exclamations()
  // WHAT THIS DOES: exclamations is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call exclamations(...) where this helper behavior is needed.
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 0) {
    const boost = Math.min(exclamations * 0.5, 2);
    if (pos > neg) pos += boost;
    else if (neg > pos) neg += boost;
  }

  // Caps ratio boost (more than 20% caps = intensity)
  const alpha = text.replace(/[^a-zA-Z]/g, '');
  if (alpha.length > 5) {
    // capsRatio()
    // WHAT THIS DOES: capsRatio is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call capsRatio(...) where this helper behavior is needed.
    const capsRatio = (alpha.replace(/[^A-Z]/g, '').length) / alpha.length;
    if (capsRatio > 0.2) {
      const boost = capsRatio * 2;
      if (pos > neg) pos += boost;
      else if (neg > pos) neg += boost;
    }
  }

  const total = pos + neg || 1;
  // net()
  // Purpose: helper wrapper used by this module's main flow.
  // net()
  // WHAT THIS DOES: net is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call net(...) where this helper behavior is needed.
  const net = (pos - neg) / total;  // normalized [-1, +1]
  return { positive: pos, negative: neg, net };
}

/**
 * Count how many sensitive topics appear in the text/topics.
 */
// countSensitivityHits()
// WHAT THIS DOES: countSensitivityHits is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call countSensitivityHits(...) where this helper behavior is needed.
function countSensitivityHits(topics) {
  let hits = 0;
  for (const t of topics) {
    const words = t.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (SENSITIVITY_TOPICS.has(w)) hits++;
    }
  }
  return hits;
}

/**
 * Analyze a conversation turn and produce cognitive feedback.
 *
 * @param {Object} params
 * @param {string} params.userMessage       — raw user message
 * @param {string} params.entityResponse    — entity's response
 * @param {Object} [params.preSnapshot]     — pre-turn cognitive snapshot
 * @param {Object} [params.episodicMemory]  — encoded memory from post-response-memory
 * @param {number} [params.trustDelta]      — relationship trust change (if available)
 * @returns {Object} CognitiveFeedback
 */
// analyzeTurnFeedback()
// WHAT THIS DOES: analyzeTurnFeedback is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call analyzeTurnFeedback(...) where this helper behavior is needed.
function analyzeTurnFeedback(params = {}) {
  const {
    userMessage = '',
    entityResponse = '',
    preSnapshot,
    episodicMemory,
    trustDelta = 0
  } = params;

  const feedback = {
    beliefUpdates: [],
    goalUpdates: [],
    curiosityResolved: [],
    diaryTrigger: { triggered: false, reason: '', importance: 0 },
    moodSignal: { type: 'neutral', magnitude: 'minor', reason: '' }
  };

  // Extract topics from conversation
  const combinedText = `${userMessage} ${entityResponse}`;
  const turnTopics = extractPhrases(combinedText, 10);
  const userTopics = extractPhrases(userMessage, 6);

  // ── Belief Analysis ─────────────────────────────────────────
  if (preSnapshot?.beliefs?.standing?.length) {
    for (const belief of preSnapshot.beliefs.standing) {
      if (!belief.topic || !belief.statement) continue;
      const beliefTopics = extractPhrases(belief.statement, 5);
      const overlap = bm25Score(turnTopics, beliefTopics);

      if (overlap > 0.3) {
        // Check if response aligns or contradicts
        const responseSentiment = scoreSentiment(entityResponse);
        const beliefWords = belief.statement.toLowerCase().split(/\s+/);
        const responseWords = entityResponse.toLowerCase().split(/\s+/);
        const wordOverlap = beliefWords.filter(w => w.length > 3 && responseWords.includes(w)).length;

        if (wordOverlap >= 2) {
          // Referenced the belief's concepts → reinforce
          feedback.beliefUpdates.push({
            beliefId: belief.belief_id || belief.topic,
            action: 'reinforce',
            reason: `Response referenced belief topics (overlap: ${wordOverlap} words)`,
            delta: 0.03
          });
        } else if (responseSentiment.net < -0.3 && overlap > 0.5) {
          // Negative sentiment about a belief topic → weaken
          feedback.beliefUpdates.push({
            beliefId: belief.belief_id || belief.topic,
            action: 'weaken',
            reason: `Negative sentiment toward belief topic (net: ${responseSentiment.net.toFixed(2)})`,
            delta: 0.05
          });
        }
      }
    }
  }

  // ── Goal Analysis ───────────────────────────────────────────
  if (preSnapshot?.goals?.active?.length) {
    const responseWords = new Set(entityResponse.toLowerCase().split(/[^a-z]+/).filter(Boolean));
    const userWords = new Set(userMessage.toLowerCase().split(/[^a-z]+/).filter(Boolean));
    const hasCompletionKeyword = [...COMPLETION_KEYWORDS].some(k => responseWords.has(k) || userWords.has(k));

    for (const goal of preSnapshot.goals.active) {
      if (!goal.description) continue;
      const goalTopics = extractPhrases(goal.description, 5);
      const overlap = bm25Score(turnTopics, goalTopics);

      if (overlap > 0.4 && hasCompletionKeyword) {
        feedback.goalUpdates.push({
          goalId: goal.goal_id || goal.id || goal.description,
          action: 'fulfilled',
          evidence: `Completion keyword detected + topic overlap (score: ${overlap.toFixed(2)})`
        });
      } else if (overlap > 0.3) {
        feedback.goalUpdates.push({
          goalId: goal.goal_id || goal.id || goal.description,
          action: 'progress',
          evidence: `Turn addressed goal topics (score: ${overlap.toFixed(2)})`
        });
      }
    }
  }

  // ── Curiosity Analysis ──────────────────────────────────────
  if (preSnapshot?.curiosity?.activeQuestions?.length) {
    for (const question of preSnapshot.curiosity.activeQuestions) {
      const qTopics = extractPhrases(question, 5);
      const overlap = bm25Score(userTopics, qTopics);
      if (overlap > 0.4) {
        feedback.curiosityResolved.push(question);
      }
    }
  }

  // ── Diary Trigger ───────────────────────────────────────────
  const importance = episodicMemory?.importance || 0;
  const goalFulfilled = feedback.goalUpdates.some(g => g.action === 'fulfilled');
  const beliefContradicted = feedback.beliefUpdates.some(b => b.action === 'contradict' || b.action === 'weaken');

  if (importance >= 0.7 || goalFulfilled || beliefContradicted) {
    feedback.diaryTrigger = {
      triggered: true,
      reason: goalFulfilled ? 'goal fulfilled' : beliefContradicted ? 'belief challenged' : 'high importance exchange',
      importance: Math.max(importance, goalFulfilled ? 0.8 : 0.7)
    };
  }

  // ── Mood Signal (Interaction Magnitude) ─────────────────────
  const userSentiment = scoreSentiment(userMessage);
  const entitySentiment = scoreSentiment(entityResponse);
  const combinedSentiment = {
    positive: userSentiment.positive + entitySentiment.positive,
    negative: userSentiment.negative + entitySentiment.negative,
    net: (userSentiment.net + entitySentiment.net) / 2
  };

  const sensitivityHits = countSensitivityHits(turnTopics);
  const absSentiment = Math.abs(combinedSentiment.net);

  // Determine magnitude
  let magnitude = 'minor';
  if (absSentiment > 0.6 || sensitivityHits >= 2 || Math.abs(trustDelta) > 0.05) {
    magnitude = 'major';
  } else if (absSentiment > 0.3 || sensitivityHits >= 1) {
    magnitude = 'moderate';
  }

  // Neutral gate: very low signal = no emission
  if (absSentiment < 0.1 && sensitivityHits === 0 && Math.abs(trustDelta) < 0.01) {
    feedback.moodSignal = { type: 'neutral', magnitude: 'minor', reason: 'Low emotional signal' };
  } else {
    // Classify type
    let type = 'neutral';
    if (trustDelta > 0.03) {
      type = 'bonding';
    } else if (trustDelta < -0.03) {
      type = 'conflict';
    } else if (goalFulfilled || (combinedSentiment.net > 0.2 && sensitivityHits >= 1)) {
      type = 'insight';
    } else if (combinedSentiment.net > 0.15) {
      type = 'positive';
    } else if (combinedSentiment.net < -0.15) {
      type = 'negative';
    }

    const reason = `sentiment=${combinedSentiment.net.toFixed(2)}, sensitivity=${sensitivityHits}, trust_delta=${trustDelta.toFixed(3)}`;
    feedback.moodSignal = { type, magnitude, reason };
  }

  return feedback;
}

module.exports = {
  analyzeTurnFeedback,
  scoreSentiment,
  countSensitivityHits
};
