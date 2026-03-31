// ── Brain · Activation Network ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../../entityPaths.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: activate, decayAllActivations, getPreActivated.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/memory/activation-network.js
 * Slice 6 — Activation Propagation Engine
 *
 * When a memory is activated (retrieved), propagates activation energy
 * to connected neighbors up to 2 hops. Energy decays per hop and per
 * brain-loop cycle. Pre-activated memories receive a retrieval boost.
 *
 * activationLevel is stored transiently on indexCache memoryIndex entries.
 * It resets to 0 on index rebuild — this is intentional since activation
 * is short-lived (0.3 decay rate per cycle).
 */

const fs = require('fs');
const path = require('path');

/**
 * Default edge reader — reads edges from a memory's log.json on disk.
 * @param {string} memId
 * @param {string} entityId
 * @returns {Array<{targetId: string, strength: number}>}
 */
// _defaultReadEdges()
// WHAT THIS DOES: _defaultReadEdges is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _defaultReadEdges(...) where this helper behavior is needed.
function _defaultReadEdges(memId, entityId) {
  if (!entityId) return [];
  try {
    const entityPathsMod = require('../../entityPaths');
    const baseDir = memId.startsWith('sem_')
      ? entityPathsMod.getSemanticMemoryPath(entityId)
      : entityPathsMod.getEpisodicMemoryPath(entityId);
    const log = JSON.parse(fs.readFileSync(path.join(baseDir, memId, 'log.json'), 'utf8'));
    return Array.isArray(log.edges) ? log.edges : [];
  } catch { return []; }
}

/**
 * Activate a memory and propagate energy to its neighbors (2-hop max).
 *
 * @param {string} memId — memory to activate
 * @param {number} energy — activation energy (0.0–1.0)
 * @param {object} indexCache — MemoryIndexCache instance
 * @param {object} [opts]
 * @param {string} [opts.entityId] — entity ID for disk-based edge reading
 * @param {function} [opts.readEdges] — (memId) => Array<{targetId, strength}>
 * @returns {{ activated: string[], propagated: number }}
 */
// activate()
// WHAT THIS DOES: activate is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call activate(...) where this helper behavior is needed.
function activate(memId, energy, indexCache, opts = {}) {
  const readEdges = opts.readEdges || ((id) => _defaultReadEdges(id, opts.entityId));
  const clamped = Math.min(1.0, Math.max(0.0, energy));
  if (clamped === 0) return { activated: [], propagated: 0 };

  const activatedSet = new Set();
  let propagated = 0;

  // Activate the target memory
  const meta = indexCache.getMemoryMeta(memId);
  if (!meta) return { activated: [], propagated: 0 };

  const oldLevel = meta.activationLevel || 0;
  meta.activationLevel = Math.min(1.0, oldLevel + clamped);
  activatedSet.add(memId);

  // Hop 1: propagate to direct neighbors
  const edges = readEdges(memId);
  const hop1Targets = [];

  for (const edge of edges) {
    const hop1Energy = clamped * (edge.strength || 0) * 0.5;
    if (hop1Energy < 0.01) continue;

    const neighbor = indexCache.getMemoryMeta(edge.targetId);
    if (!neighbor) continue;

    const prev = neighbor.activationLevel || 0;
    neighbor.activationLevel = Math.min(1.0, prev + hop1Energy);
    activatedSet.add(edge.targetId);
    propagated++;
    hop1Targets.push({ id: edge.targetId, energy: hop1Energy });
  }

  // Hop 2: propagate from hop-1 neighbors
  for (const h1 of hop1Targets) {
    const h1Edges = readEdges(h1.id);
    for (const edge of h1Edges) {
      if (edge.targetId === memId) continue; // no loop-back to source
      const hop2Energy = h1.energy * (edge.strength || 0) * 0.25;
      if (hop2Energy < 0.01) continue;

      const neighbor2 = indexCache.getMemoryMeta(edge.targetId);
      if (!neighbor2) continue;

      const prev2 = neighbor2.activationLevel || 0;
      neighbor2.activationLevel = Math.min(1.0, prev2 + hop2Energy);
      activatedSet.add(edge.targetId);
      propagated++;
    }
  }

  return { activated: [...activatedSet], propagated };
}

/**
 * Decay all activation levels across the index.
 * Called by the brain-loop decay phase.
 *
 * @param {object} indexCache — MemoryIndexCache instance
 * @param {number} [rate=0.3] — decay rate per cycle (0.0–1.0)
 */
// decayAllActivations()
// WHAT THIS DOES: decayAllActivations is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call decayAllActivations(...) where this helper behavior is needed.
function decayAllActivations(indexCache, rate = 0.3) {
  indexCache.load();
  const factor = 1 - Math.min(1, Math.max(0, rate));
  for (const meta of Object.values(indexCache.memoryIndex)) {
    if (meta.activationLevel && meta.activationLevel > 0) {
      meta.activationLevel *= factor;
      if (meta.activationLevel < 0.001) meta.activationLevel = 0;
    }
  }
}

/**
 * Get memory IDs that are above the activation threshold, sorted by energy.
 *
 * @param {object} indexCache — MemoryIndexCache instance
 * @param {number} [threshold=0.15]
 * @param {number} [limit=20]
 * @returns {string[]} — memIds sorted by activationLevel descending
 */
// getPreActivated()
// WHAT THIS DOES: getPreActivated reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getPreActivated(...), then use the returned value in your next step.
function getPreActivated(indexCache, threshold = 0.15, limit = 20) {
  indexCache.load();
  const results = [];
  for (const [memId, meta] of Object.entries(indexCache.memoryIndex)) {
    if ((meta.activationLevel || 0) > threshold) {
      results.push({ memId, activationLevel: meta.activationLevel });
    }
  }
  results.sort((a, b) => b.activationLevel - a.activationLevel);
  return results.slice(0, limit).map(r => r.memId);
}

module.exports = { activate, decayAllActivations, getPreActivated };
