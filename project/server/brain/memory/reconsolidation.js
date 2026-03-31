// ── Brain · Reconsolidation ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../../entityPaths,
// crypto. Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/memory/reconsolidation.js
 * Slice 10 — Dream Reconsolidation
 *
 * During sleep/dream cycles, reorganizes the memory network:
 * 1. Edge strength adjustment based on co-access patterns
 * 2. Cluster detection (strongly-connected components)
 * 3. Anticipatory stub creation for heavily-reinforced beliefs
 *
 * All heuristic — no LLM calls.
 */

const fs = require('fs');
const path = require('path');

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const EDGE_STRENGTHEN = 0.1;
const EDGE_WEAKEN = -0.05;
const EDGE_FLOOR = 0.1;
const MUTUAL_STRENGTH_THRESHOLD = 0.5;
const BELIEF_REINFORCEMENT_THRESHOLD = 3;

/**
 * Read a memory's edges from its log.json on disk.
 * @returns {Array<{targetId,relation,strength}>}
 */
// _diskGetEdges()
// WHAT THIS DOES: _diskGetEdges is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _diskGetEdges(...) where this helper behavior is needed.
function _diskGetEdges(entityId, memId) {
  try {
    const ep = require('../../entityPaths');
    const baseDir = memId.startsWith('sem_')
      ? ep.getSemanticMemoryPath(entityId)
      : ep.getEpisodicMemoryPath(entityId);
    const logPath = path.join(baseDir, memId, 'log.json');
    if (!fs.existsSync(logPath)) return [];
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    return Array.isArray(log.edges) ? log.edges : [];
  } catch { return []; }
}

/**
 * Write updated edges to a memory's log.json.
 */
// _diskSetEdges()
// WHAT THIS DOES: _diskSetEdges is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _diskSetEdges(...) where this helper behavior is needed.
function _diskSetEdges(entityId, memId, edges) {
  try {
    const ep = require('../../entityPaths');
    const baseDir = memId.startsWith('sem_')
      ? ep.getSemanticMemoryPath(entityId)
      : ep.getEpisodicMemoryPath(entityId);
    const logPath = path.join(baseDir, memId, 'log.json');
    if (!fs.existsSync(logPath)) return;
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    log.edges = edges;
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
  } catch { /* non-critical */ }
}

/**
 * Default stub creator — writes an anticipatory memory to disk.
 */
// _defaultCreateStub()
// WHAT THIS DOES: _defaultCreateStub is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _defaultCreateStub(...) where this helper behavior is needed.
function _defaultCreateStub({ entityId, belief, cluster, importance }) {
  try {
    const crypto = require('crypto');
    const ep = require('../../entityPaths');
    const episodicPath = ep.getEpisodicMemoryPath(entityId);

    const memId = 'mem_' + crypto.randomBytes(4).toString('hex');
    const memDir = path.join(episodicPath, memId);
    fs.mkdirSync(memDir, { recursive: true });

    const semantic = `[Anticipated] Entity may revisit: ${belief.statement || 'unknown belief'}`;
    fs.writeFileSync(path.join(memDir, 'semantic.txt'), semantic, 'utf8');

    const edges = cluster.members.slice(0, 8).map(targetId => ({
      targetId,
      relation: 'anticipatory_link',
      strength: 0.4
    }));

    const log = {
      memory_id: memId,
      created: new Date().toISOString(),
      importance,
      emotion: 'neutral',
      decay: 0.05,
      topics: belief.topics || [],
      access_count: 0,
      type: 'anticipatory',
      shape: 'anticipatory',
      edges,
      creationContext: {
        source: 'reconsolidation',
        beliefId: belief.belief_id,
        clusterTopic: cluster.dominantTopic
      },
      activationLevel: 0.0,
      lastActivationContext: null
    };
    fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');
    return true;
  } catch { return false; }
}

/**
 * Count reinforcements for a belief since a cutoff time.
 * Uses access_count as a proxy when the belief was recently reinforced.
 */
// _countReinforcements()
// WHAT THIS DOES: _countReinforcements is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _countReinforcements(...) where this helper behavior is needed.
function _countReinforcements(belief, sinceCutoff) {
  if (!belief.last_reinforced) return 0;
  const ts = new Date(belief.last_reinforced).getTime();
  if (isNaN(ts) || ts < sinceCutoff) return 0;
  return belief.access_count || (belief.sources ? belief.sources.length : 0);
}

/**
 * Detect memory clusters — groups with mutual strong edges (strength > 0.5).
 * Uses union-find on bidirectional strong edges within the provided edge map.
 *
 * @param {Map<string,Array>} edgeMap — memId → edges array
 * @param {object} indexCache — for topic metadata
 * @returns {Array<{members:string[], dominantTopic:string|null, size:number}>}
 */
// _detectClusters()
// WHAT THIS DOES: _detectClusters is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _detectClusters(...) where this helper behavior is needed.
function _detectClusters(edgeMap, indexCache) {
  // Build mutual strong-edge adjacency
  const parent = new Map();
  function find(id) {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)));
    return parent.get(id);
  }
  // union()
  // WHAT THIS DOES: union is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call union(...) where this helper behavior is needed.
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const [memId, edges] of edgeMap) {
    for (const edge of edges) {
      if (edge.strength <= MUTUAL_STRENGTH_THRESHOLD) continue;
      // Check reciprocal
      const neighborEdges = edgeMap.get(edge.targetId);
      if (!neighborEdges) continue;
      const reciprocal = neighborEdges.find(e => e.targetId === memId);
      if (!reciprocal || reciprocal.strength <= MUTUAL_STRENGTH_THRESHOLD) continue;
      union(memId, edge.targetId);
    }
  }

  // Group by root
  const groups = new Map();
  for (const memId of edgeMap.keys()) {
    if (!parent.has(memId)) continue;
    const root = find(memId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(memId);
  }

  // Filter to clusters >= 2 and tag with dominant topic
  const clusters = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const topicCounts = new Map();
    for (const memId of members) {
      const meta = indexCache.getMemoryMeta(memId);
      if (meta && meta.topics) {
        for (const t of meta.topics) topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
      }
    }
    let dominantTopic = null;
    let maxCount = 0;
    for (const [topic, count] of topicCounts) {
      if (count > maxCount) { maxCount = count; dominantTopic = topic; }
    }
    clusters.push({ members, dominantTopic, size: members.length });
  }
  return clusters;
}

/**
 * Main reconsolidation entry point.
 *
 * @param {string} entityId
 * @param {object} indexCache — MemoryIndexCache instance
 * @param {object|null} beliefGraph — BeliefGraph instance (optional)
 * @param {object} [opts]
 * @param {number}   [opts.now]         — override Date.now() for testing
 * @param {Function} [opts._getEdges]   — (memId) => edges[] (test injection)
 * @param {Function} [opts._setEdges]   — (memId, edges) => void (test injection)
 * @param {Function} [opts._createStub] — ({entityId, belief, cluster, importance}) => boolean
 * @returns {{ edgesUpdated: number, stubsCreated: number, clustersFound: number, clusters: Array }}
 */
// reconsolidate()
// WHAT THIS DOES: reconsolidate is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call reconsolidate(...) where this helper behavior is needed.
function reconsolidate(entityId, indexCache, beliefGraph, opts = {}) {
  const now = opts.now || Date.now();
  const result = { edgesUpdated: 0, stubsCreated: 0, clustersFound: 0, clusters: [] };
  if (!indexCache) return result;

  const getEdges = opts._getEdges || _diskGetEdges.bind(null, entityId);
  const setEdges = opts._setEdges || _diskSetEdges.bind(null, entityId);
  const createStub = opts._createStub || _defaultCreateStub;

  // Step 1: Find recently accessed memories (last 24h via recency index)
  const recentEntries = indexCache.getRecentMemories(200);
  const cutoff = now - TWENTY_FOUR_HOURS_MS;
  const accessedIds = [];
  for (const entry of recentEntries) {
    const ts = new Date(entry.lastAccessed).getTime();
    if (!isNaN(ts) && ts >= cutoff) accessedIds.push(entry.memId);
  }
  const accessedSet = new Set(accessedIds);

  // Step 2: Adjust edge strengths and build edge map for cluster detection
  const edgeMap = new Map();
  for (const memId of accessedIds) {
    const edges = getEdges(memId);
    if (!edges || edges.length === 0) continue;
    edgeMap.set(memId, edges);

    let changed = false;
    for (const edge of edges) {
      const prev = edge.strength;
      if (accessedSet.has(edge.targetId)) {
        edge.strength = Math.min(1.0, edge.strength + EDGE_STRENGTHEN);
      } else {
        edge.strength = Math.max(EDGE_FLOOR, edge.strength + EDGE_WEAKEN);
      }
      if (edge.strength !== prev) changed = true;
    }
    if (changed) {
      setEdges(memId, edges);
      result.edgesUpdated++;
    }
  }

  // Step 3: Detect clusters from the accessed-memory edge map
  result.clusters = _detectClusters(edgeMap, indexCache);
  result.clustersFound = result.clusters.length;

  // Step 4: Create anticipatory stubs for heavily-reinforced beliefs
  if (beliefGraph && typeof beliefGraph.getAllBeliefs === 'function') {
    const allBeliefs = beliefGraph.getAllBeliefs(100);
    const cutoff48h = now - FORTY_EIGHT_HOURS_MS;

    const memToCluster = new Map();
    for (let i = 0; i < result.clusters.length; i++) {
      for (const mid of result.clusters[i].members) {
        memToCluster.set(mid, i);
      }
    }

    for (const belief of allBeliefs) {
      if (_countReinforcements(belief, cutoff48h) < BELIEF_REINFORCEMENT_THRESHOLD) continue;
      const sourceMemIds = belief.sources || [];
      const clusterIdxs = new Set();
      for (const srcId of sourceMemIds) {
        if (memToCluster.has(srcId)) clusterIdxs.add(memToCluster.get(srcId));
      }
      if (clusterIdxs.size === 0) continue;

      const cluster = result.clusters[clusterIdxs.values().next().value];
      if (createStub({ entityId, belief, cluster, importance: Math.min(1.0, (belief.confidence || 0.5) * 0.5) })) {
        result.stubsCreated++;
      }
    }
  }

  return result;
}

module.exports = {
  reconsolidate,
  EDGE_STRENGTHEN,
  EDGE_WEAKEN,
  EDGE_FLOOR,
  MUTUAL_STRENGTH_THRESHOLD,
  BELIEF_REINFORCEMENT_THRESHOLD
};
