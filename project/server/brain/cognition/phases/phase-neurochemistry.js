// ── Brain · Phase Neurochemistry ────────────────────────────────────────────────────
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

// Phase: Neurochemistry Tick
// Drifts all four neuromodulators toward their baselines.
// Runs every cycle.

// neurochemistryPhase()
// WHAT THIS DOES: neurochemistryPhase is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call neurochemistryPhase(...) where this helper behavior is needed.
function neurochemistryPhase(loop) {
  if (loop.neurochemistry) {
    loop.neurochemistry.tick();
  }
}

module.exports = neurochemistryPhase;
