// ── Brain · Interaction Magnitude ────────────────────────────────────────────────────
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

// ============================================================
// Cognitive State Integration — Interaction Magnitude Classifier (C10)
//
// Pure NLP classifier that converts the mood signal from
// cognitive-feedback.js into a typed INTERACTION_* event with
// a numeric intensity value that neurochemistry can consume.
//
// No LLM calls. The magnitude thresholds produce intensity
// values that, after saturation dampening, yield the graduated
// mood shift described in the plan:
//   minor   → 0.002–0.005 per chemical (one small message)
//   moderate → 0.005–0.015 per chemical (emotional content)
//   major   → 0.02–0.04  per chemical (trust betrayal, deep bonding)
// ============================================================

// Magnitude → intensity multiplier for neurochemistry.updateChemistry()
// The EVENT_EFFECTS base deltas are tuned for "moderate" (1.0 intensity).
// Minor scales them down, major scales them up.
const MAGNITUDE_INTENSITY = {
  minor:    0.3,
  moderate: 1.0,
  major:    3.0
};

// Map mood signal type → INTERACTION_* thought type constant
const MOOD_TYPE_TO_THOUGHT = {
  positive: 'interaction_positive',
  negative: 'interaction_negative',
  bonding:  'interaction_bonding',
  conflict: 'interaction_conflict',
  insight:  'interaction_insight'
};

/**
 * Convert a mood signal (from analyzeTurnFeedback) into a typed interaction
 * event ready for the cognitive bus.
 *
 * @param {Object} moodSignal - { type, magnitude, reason }
 * @returns {{ thoughtType: string, intensity: number, reason: string } | null}
 *   null if the signal is neutral or invalid
 */
// classifyInteraction()
// WHAT THIS DOES: classifyInteraction is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call classifyInteraction(...) where this helper behavior is needed.
function classifyInteraction(moodSignal) {
  if (!moodSignal || moodSignal.type === 'neutral') return null;

  const thoughtType = MOOD_TYPE_TO_THOUGHT[moodSignal.type];
  if (!thoughtType) return null;

  const intensity = MAGNITUDE_INTENSITY[moodSignal.magnitude] || MAGNITUDE_INTENSITY.minor;

  return {
    thoughtType,
    intensity,
    reason: moodSignal.reason || ''
  };
}

module.exports = {
  classifyInteraction,
  MAGNITUDE_INTENSITY,
  MOOD_TYPE_TO_THOUGHT
};
