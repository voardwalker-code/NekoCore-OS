// ── Brain · Phase Somatic ────────────────────────────────────────────────────
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

// Phase: Somatic Awareness Tick
// Polls hardware metrics, computes felt sensations, influences neurochemistry.
// Runs every cycle.

// somaticPhase()
// WHAT THIS DOES: somaticPhase is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call somaticPhase(...) where this helper behavior is needed.
function somaticPhase(loop) {
  if (!loop.somaticAwareness) return;
  loop._emit('phase', { name: 'somatic_awareness', status: 'running' });
  loop.somaticAwareness.tick();
  loop._emit('phase', { name: 'somatic_awareness', status: 'done', stress: loop.somaticAwareness.overallStress });
}

module.exports = somaticPhase;
