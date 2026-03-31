// ── Brain · Phase Consolidation ────────────────────────────────────────────────────
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

// Phase: Memory Consolidation
// Strengthens high-emotion memories and flags low-value ones during DeepSleep.
// Runs every 15 cycles (DeepSleep cadence).

async function consolidationPhase(loop) {
  if (!loop.neurochemistry || !loop.memoryStorage) return;
  const deepSleepInterval = loop.deepSleepInterval || 150;
  if (loop.cycleCount % deepSleepInterval !== 0) return;

  loop._emit('phase', { name: 'consolidation', status: 'running' });
  const directives = loop._lastDirectives;
  // consolidationLimit()
  // Purpose: helper wrapper used by this module's main flow.
  // consolidationLimit()
  // WHAT THIS DOES: consolidationLimit is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call consolidationLimit(...) where this helper behavior is needed.
  const consolidationLimit = (directives && directives.maxMemoryBatchSize) || 100;
  const allMemories = await loop.memoryStorage.listMemories(consolidationLimit);
  if (allMemories && allMemories.length > 0) {
    const consolidationResult = loop.neurochemistry.runConsolidation(allMemories);
    loop._emit('phase', { name: 'consolidation', status: 'done', ...consolidationResult });
  } else {
    loop._emit('phase', { name: 'consolidation', status: 'done', strengthened: 0, pruned: 0 });
  }
}

module.exports = consolidationPhase;
