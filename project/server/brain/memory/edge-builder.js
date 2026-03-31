// ── Brain · Edge Builder ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ../utils/topic-utils. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: seedEdges, seedBeliefEdges, MAX_EDGES, SCAN_WINDOW.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/memory/edge-builder.js
 * Slice 5 — Edge Seeding at Creation
 *
 * Discovers edges from a new memory to its neighbors in the recency window.
 * Returns the edges for the new memory and the list of existing memory IDs
 * that need reverse-edge patching. The caller handles filesystem I/O for
 * bidirectional persistence.
 */

const { normalizeTopics } = require('../utils/topic-utils');

const MAX_EDGES = 8;
const SCAN_WINDOW = 50;

const TEN_MINUTES_MS = 10 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Discover edges from a newly created memory to existing neighbors.
 *
 * @param {string} newMemId
 * @param {object} newMeta — log.json-shaped object with created, topics, emotion, userId, etc.
 * @param {object} indexCache — MemoryIndexCache instance (must be loaded)
 * @returns {{ edges: Array<{targetId: string, relation: string, strength: number}>, patchedIds: string[] }}
 */
// seedEdges()
// WHAT THIS DOES: seedEdges is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call seedEdges(...) where this helper behavior is needed.
function seedEdges(newMemId, newMeta, indexCache) {
  const edges = [];
  const patchedIds = [];

  const recentEntries = indexCache.getRecentMemories(SCAN_WINDOW);
  const newTs = new Date(newMeta.created || Date.now()).getTime();
  if (isNaN(newTs)) return { edges, patchedIds };

  const newTopicSet = new Set(normalizeTopics(newMeta.topics || []));
  // newEmotion()
  // Purpose: helper wrapper used by this module's main flow.
  // newEmotion()
  // WHAT THIS DOES: newEmotion is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call newEmotion(...) where this helper behavior is needed.
  const newEmotion = ((newMeta.emotion || newMeta.emotionalTag || '') + '').toLowerCase().trim();
  const newUserId = newMeta.userId
    || (newMeta.creationContext && newMeta.creationContext.userId)
    || null;

  for (const { memId: candidateId } of recentEntries) {
    if (candidateId === newMemId) continue;
    if (edges.length >= MAX_EDGES) break;

    const meta = indexCache.getMemoryMeta(candidateId);
    if (!meta) continue;

    const candTs = new Date(meta.created).getTime();
    if (isNaN(candTs)) continue;
    const timeDiff = Math.abs(newTs - candTs);

    const candTopics = meta.topics || [];
    // candEmotion()
    // Purpose: helper wrapper used by this module's main flow.
    // candEmotion()
    // WHAT THIS DOES: candEmotion is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call candEmotion(...) where this helper behavior is needed.
    const candEmotion = ((meta.emotion || meta.emotionalTag || '') + '').toLowerCase().trim();
    const candUserId = meta.userId || null;

    // Count shared topics (candTopics already normalized by indexCache)
    let sharedTopicCount = 0;
    for (const t of candTopics) {
      if (newTopicSet.has(t)) sharedTopicCount++;
    }

    // Collect matching rules — pick strongest per candidate
    let bestRelation = null;
    let bestStrength = 0;

    // Rule 1: temporal_adjacent (0.9) — same user, within 10 minutes
    if (timeDiff <= TEN_MINUTES_MS && newUserId && newUserId === candUserId) {
      bestRelation = 'temporal_adjacent';
      bestStrength = 0.9;
    }

    // Rule 2: emotional_echo (0.7) — same emotion + ≥1 shared topic, within 7 days
    if (newEmotion && newEmotion === candEmotion && sharedTopicCount >= 1 && timeDiff <= SEVEN_DAYS_MS) {
      if (0.7 > bestStrength) {
        bestRelation = 'emotional_echo';
        bestStrength = 0.7;
      }
    }

    // Rule 3: topic_sibling (0.6) — ≥2 shared topics, within 24 hours
    if (sharedTopicCount >= 2 && timeDiff <= TWENTY_FOUR_HOURS_MS) {
      if (0.6 > bestStrength) {
        bestRelation = 'topic_sibling';
        bestStrength = 0.6;
      }
    }

    if (bestRelation) {
      edges.push({ targetId: candidateId, relation: bestRelation, strength: bestStrength });
      patchedIds.push(candidateId);
    }
  }

  return { edges, patchedIds };
}

/**
 * Create belief_linked edges from a new memory to the source memories of its
 * active beliefs. Called at memory creation when creationContext.activeBeliefIds
 * is present.
 *
 * @param {string}   newMemId      — the newly created memory's ID
 * @param {Object[]} beliefs       — resolved belief objects with { sources, confidence }
 * @param {Set|string[]} [existingTargets]  — target IDs already in edges (to dedup)
 * @returns {Array<{ targetId: string, relation: string, strength: number }>}
 */
// seedBeliefEdges()
// WHAT THIS DOES: seedBeliefEdges is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call seedBeliefEdges(...) where this helper behavior is needed.
function seedBeliefEdges(newMemId, beliefs, existingTargets) {
  const edges = [];
  const seen = existingTargets instanceof Set
    ? new Set(existingTargets)
    : new Set(existingTargets || []);

  for (const belief of beliefs) {
    if (!belief || !belief.sources) continue;
    const strength = Math.min(1.0, 0.5 * (belief.confidence || 0));
    if (strength < 0.01) continue;

    for (const srcMemId of belief.sources) {
      if (srcMemId === newMemId) continue;
      if (seen.has(srcMemId)) continue;
      if (edges.length >= MAX_EDGES) break;

      seen.add(srcMemId);
      edges.push({ targetId: srcMemId, relation: 'belief_linked', strength });
    }
    if (edges.length >= MAX_EDGES) break;
  }

  return edges;
}

module.exports = { seedEdges, seedBeliefEdges, MAX_EDGES, SCAN_WINDOW };
