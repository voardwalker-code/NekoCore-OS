// ── Brain · Phase Pruning ────────────────────────────────────────────────────
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

// Phase: Connection Pruning
// Removes weak or stale memory connections from the neurochemistry layer.
// Runs every 15 cycles (DeepSleep cadence).

// pruningPhase()
// WHAT THIS DOES: pruningPhase is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call pruningPhase(...) where this helper behavior is needed.
function pruningPhase(loop) {
  if (!loop.neurochemistry || !loop.memoryStorage) return;
  const deepSleepInterval = loop.deepSleepInterval || 150;
  if (loop.cycleCount % deepSleepInterval !== 0) return;

  loop._emit('phase', { name: 'connection_pruning', status: 'running' });
  const pruneResult = loop.neurochemistry.pruneWeakConnections();
  loop._emit('phase', { name: 'connection_pruning', status: 'done', ...pruneResult });
}

module.exports = pruningPhase;
