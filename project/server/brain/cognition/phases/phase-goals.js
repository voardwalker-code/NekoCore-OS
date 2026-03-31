// ── Brain · Phase Goals ────────────────────────────────────────────────────
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

// Phase: Goal Emergence
// Scans recent memories for patterns and generates new goals.
// Runs every 5 cycles; skippable under homeostatic stress.

async function goalsPhase(loop) {
  if (!loop.goalsManager) return;
  if (loop.cycleCount % 5 !== 0) return;

  const directives = loop._lastDirectives;
  if (directives && directives.skipGoalEmergence) {
    loop._emit('phase', { name: 'goal_emergence', status: 'skipped', reason: 'homeostasis' });
    return;
  }

  loop._emit('phase', { name: 'goal_emergence', status: 'running' });
  // memLimit()
  // Purpose: helper wrapper used by this module's main flow.
  // memLimit()
  // WHAT THIS DOES: memLimit is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call memLimit(...) where this helper behavior is needed.
  const memLimit = (directives && directives.maxMemoryBatchSize) || 50;
  const memories = await loop.memoryStorage?.listMemories(memLimit);
  if (memories) {
    loop.goalsManager.emergeGoals(memories, 2);
  }
  loop._emit('phase', { name: 'goal_emergence', status: 'done' });
}

module.exports = goalsPhase;
