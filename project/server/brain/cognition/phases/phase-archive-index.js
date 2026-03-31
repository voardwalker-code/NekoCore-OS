// ── Brain · Phase Archive Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ../../utils/archive-indexes.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Phase: Archive Index Rebuild (Phase 4.7 E-3 + E-4)
//
// Runs every 10 brain loop cycles.
// Rebuilds temporal (YYYY-MM) and subject (co-occurrence cluster)
// multi-axis indexes from all registered archive bucket files.
//
// This phase is purely additive and non-blocking for the entity's
// conscious processing — failures are caught and logged, never rethrown.
// ============================================================

'use strict';

const INDEX_REBUILD_INTERVAL = 10; // cycles between full rebuilds

async function archiveIndexPhase(loop) {
  if (!loop || loop.cycleCount % INDEX_REBUILD_INTERVAL !== 0) return;

  const entityId = loop.currentEntityId || loop.entityId || null;
  if (!entityId) return;

  loop._emit('phase', { name: 'archive_index', status: 'running' });

  try {
    const { rebuildTemporalIndexes, rebuildSubjectIndexes, rebuildShapeIndexes } = require('../../utils/archive-indexes');

    const temporalCount = rebuildTemporalIndexes(entityId);
    if (temporalCount > 0) {
      console.log(`  🗂 Archive index: temporal rebuild — ${temporalCount} entries indexed`);
    }

    const subjectCount = rebuildSubjectIndexes(entityId);
    if (subjectCount > 0) {
      console.log(`  🗂 Archive index: subject rebuild — ${subjectCount} subject clusters written`);
    }

    // Shape index — classifies archive entries by memory shape
    const shapeCount = rebuildShapeIndexes(entityId);
    if (shapeCount > 0) {
      console.log(`  🗂 Archive index: shape rebuild — ${shapeCount} entries indexed`);
    }
  } catch (err) {
    console.warn('  ⚠ Archive index rebuild error:', err.message);
  }

  loop._emit('phase', { name: 'archive_index', status: 'done' });
}

module.exports = archiveIndexPhase;
