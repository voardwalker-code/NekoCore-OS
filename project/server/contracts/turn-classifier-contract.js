// ── Contracts · Turn Classifier Contract ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This module belongs to the NekoCore OS codebase and provides focused
// subsystem behavior.
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
// Turn Classifier Contract (Slice T2-0)
//
// Validates the output shape of the turn classifier. The classifier
// assigns an incoming user message to a category and decides whether
// the full 4-node orchestrator pipeline can be bypassed.
// ============================================================

const VALID_CATEGORIES = [
  'greeting',          // hi, hello, hey, good morning, etc.
  'status',            // how are you, what's up, you ok?
  'confirmation',      // yes, no, ok, sure, got it, thanks
  'farewell',          // bye, goodnight, see you, ttyl
  'command',           // slash commands (handled elsewhere)
  'simple-question',   // single factual recall (what's your name, etc.)
  'deep'               // everything else → full pipeline
];

const BYPASS_THRESHOLD = 0.8;

/**
 * Validate a turn classification result.
 * @param {Object} result
 * @returns {{ ok: boolean, errors: string[] }}
 */
// validateClassification()
// WHAT THIS DOES: validateClassification answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateClassification(...) and branch logic based on true/false.
function validateClassification(result) {
  const errors = [];
  if (!result || typeof result !== 'object') {
    return { ok: false, errors: ['classification must be a non-null object'] };
  }

  // category
  if (typeof result.category !== 'string') {
    errors.push('category must be a string');
  } else if (!VALID_CATEGORIES.includes(result.category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // confidence
  if (typeof result.confidence !== 'number') {
    errors.push('confidence must be a number');
  } else if (result.confidence < 0 || result.confidence > 1) {
    errors.push('confidence must be in [0, 1]');
  }

  // bypass
  if (typeof result.bypass !== 'boolean') {
    errors.push('bypass must be a boolean');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  VALID_CATEGORIES,
  BYPASS_THRESHOLD,
  validateClassification
};
