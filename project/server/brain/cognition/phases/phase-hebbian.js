// ── Brain · Phase Hebbian ────────────────────────────────────────────────────
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

// Phase: Hebbian Reinforcement
// Strengthens memory connections that co-activate frequently.
// Runs every 5 cycles.

// hebbianPhase()
// WHAT THIS DOES: hebbianPhase is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call hebbianPhase(...) where this helper behavior is needed.
function hebbianPhase(loop) {
  if (!loop.neurochemistry) return;
  if (loop.cycleCount % 5 !== 0) return;

  loop._emit('phase', { name: 'hebbian', status: 'running' });
  const hebbianResult = loop.neurochemistry.applyHebbianReinforcement(3);
  loop._emit('phase', { name: 'hebbian', status: 'done', ...hebbianResult });
}

module.exports = hebbianPhase;
