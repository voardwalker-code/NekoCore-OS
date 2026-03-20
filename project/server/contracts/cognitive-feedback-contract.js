'use strict';

// ============================================================
// Cognitive State Integration — Feedback Contract (Slice C5)
//
// Validates post-turn cognitive feedback shape.
// The feedback engine returns this after analyzing a conversation
// exchange to determine what state changes should occur.
// ============================================================

const VALID_BELIEF_ACTIONS = ['reinforce', 'weaken', 'contradict'];
const VALID_GOAL_ACTIONS   = ['progress', 'fulfilled', 'blocked', 'irrelevant'];
const VALID_MOOD_TYPES     = ['positive', 'negative', 'bonding', 'conflict', 'insight', 'neutral'];
const VALID_MAGNITUDES     = ['minor', 'moderate', 'major'];

/**
 * Validate a CognitiveFeedback object.
 * @param {Object} feedback
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateFeedback(feedback) {
  const errors = [];
  if (!feedback || typeof feedback !== 'object') {
    return { ok: false, errors: ['feedback must be a non-null object'] };
  }

  // ── beliefUpdates ─────────────────────────────────────────
  if (feedback.beliefUpdates !== undefined) {
    if (!Array.isArray(feedback.beliefUpdates)) {
      errors.push('beliefUpdates must be an array');
    } else {
      for (let i = 0; i < feedback.beliefUpdates.length; i++) {
        const bu = feedback.beliefUpdates[i];
        if (!bu || typeof bu !== 'object') {
          errors.push(`beliefUpdates[${i}] must be an object`);
          continue;
        }
        if (typeof bu.beliefId !== 'string' || !bu.beliefId) {
          errors.push(`beliefUpdates[${i}].beliefId must be a non-empty string`);
        }
        if (!VALID_BELIEF_ACTIONS.includes(bu.action)) {
          errors.push(`beliefUpdates[${i}].action must be one of: ${VALID_BELIEF_ACTIONS.join(', ')}`);
        }
        if (typeof bu.delta !== 'number' || bu.delta < 0 || bu.delta > 1) {
          errors.push(`beliefUpdates[${i}].delta must be a number in [0, 1]`);
        }
      }
    }
  }

  // ── goalUpdates ───────────────────────────────────────────
  if (feedback.goalUpdates !== undefined) {
    if (!Array.isArray(feedback.goalUpdates)) {
      errors.push('goalUpdates must be an array');
    } else {
      for (let i = 0; i < feedback.goalUpdates.length; i++) {
        const gu = feedback.goalUpdates[i];
        if (!gu || typeof gu !== 'object') {
          errors.push(`goalUpdates[${i}] must be an object`);
          continue;
        }
        if (typeof gu.goalId !== 'string' || !gu.goalId) {
          errors.push(`goalUpdates[${i}].goalId must be a non-empty string`);
        }
        if (!VALID_GOAL_ACTIONS.includes(gu.action)) {
          errors.push(`goalUpdates[${i}].action must be one of: ${VALID_GOAL_ACTIONS.join(', ')}`);
        }
      }
    }
  }

  // ── curiosityResolved ─────────────────────────────────────
  if (feedback.curiosityResolved !== undefined) {
    if (!Array.isArray(feedback.curiosityResolved)) {
      errors.push('curiosityResolved must be an array');
    } else {
      for (let i = 0; i < feedback.curiosityResolved.length; i++) {
        if (typeof feedback.curiosityResolved[i] !== 'string') {
          errors.push(`curiosityResolved[${i}] must be a string`);
        }
      }
    }
  }

  // ── diaryTrigger ──────────────────────────────────────────
  if (feedback.diaryTrigger !== undefined) {
    const dt = feedback.diaryTrigger;
    if (!dt || typeof dt !== 'object') {
      errors.push('diaryTrigger must be an object');
    } else {
      if (typeof dt.triggered !== 'boolean') {
        errors.push('diaryTrigger.triggered must be a boolean');
      }
      if (dt.triggered && typeof dt.importance !== 'number') {
        errors.push('diaryTrigger.importance must be a number when triggered');
      }
    }
  }

  // ── moodSignal ────────────────────────────────────────────
  if (feedback.moodSignal !== undefined) {
    const ms = feedback.moodSignal;
    if (!ms || typeof ms !== 'object') {
      errors.push('moodSignal must be an object');
    } else {
      if (!VALID_MOOD_TYPES.includes(ms.type)) {
        errors.push(`moodSignal.type must be one of: ${VALID_MOOD_TYPES.join(', ')}`);
      }
      if (!VALID_MAGNITUDES.includes(ms.magnitude)) {
        errors.push(`moodSignal.magnitude must be one of: ${VALID_MAGNITUDES.join(', ')}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  validateFeedback,
  VALID_BELIEF_ACTIONS,
  VALID_GOAL_ACTIONS,
  VALID_MOOD_TYPES,
  VALID_MAGNITUDES
};
