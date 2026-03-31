// ── Contracts · Contributor Contracts ────────────────────────────────────────────────────
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

// asText()
// WHAT THIS DOES: asText is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call asText(...) where this helper behavior is needed.
function asText(payload) {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.trim();
  if (typeof payload._text === 'string') return payload._text.trim();
  if (typeof payload.text === 'string') return payload.text.trim();
  return String(payload).trim();
}
// normalizeContributorOutputs()
// WHAT THIS DOES: normalizeContributorOutputs reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into normalizeContributorOutputs(...) and use the transformed output.
function normalizeContributorOutputs(outputs = {}) {
  return {
    subconscious: asText(outputs.subconscious),
    conscious: asText(outputs.conscious),
    dreamIntuition: asText(outputs.dreamIntuition),
    refinement: asText(outputs.refinement)
  };
}
// validateSubconsciousOutput()
// WHAT THIS DOES: validateSubconsciousOutput answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateSubconsciousOutput(...) and branch logic based on true/false.
function validateSubconsciousOutput(payload) {
  const text = asText(payload);
  if (!text) return { ok: false, reason: 'empty-subconscious-output', value: '' };
  return { ok: true, value: text };
}
// validateConsciousOutput()
// WHAT THIS DOES: validateConsciousOutput answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateConsciousOutput(...) and branch logic based on true/false.
function validateConsciousOutput(payload) {
  const text = asText(payload);
  if (!text) return { ok: false, reason: 'empty-conscious-output', value: '' };
  return { ok: true, value: text };
}
// validateDreamIntuitionOutput()
// WHAT THIS DOES: validateDreamIntuitionOutput answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateDreamIntuitionOutput(...) and branch logic based on true/false.
function validateDreamIntuitionOutput(payload) {
  const text = asText(payload);
  if (!text) return { ok: false, reason: 'empty-dream-intuition-output', value: '' };
  return { ok: true, value: text };
}

module.exports = {
  normalizeContributorOutputs,
  validateSubconsciousOutput,
  validateConsciousOutput,
  validateDreamIntuitionOutput
};
