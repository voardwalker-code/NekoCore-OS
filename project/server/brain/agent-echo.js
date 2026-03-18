// ============================================================
// Agent Echo — Non-LLM retrieval coordinator (Phase 4.7)
//
// Three agents mirror the entity's three-part mind:
//   Echo Now    (Conscious)    — hot STM+LTM window, instant recall
//   Echo Past   (Subconscious) — archive index hierarchical search (E-2)
//   Echo Future (Dream)        — shape/topology matching (Phase 5)
//
// All agents are purely algorithmic — no LLM calls.
// ============================================================

'use strict';

const ConsciousMemory = require('./memory/conscious-memory');

// Simple topic-overlap scorer used for merging STM+LTM pools.
// Returns a value in [0, 1].
function _topicScore(entry, topics) {
  if (!entry.topics?.length || !topics?.length) return 0;
  const querySet = new Set(topics.map(t => t.toLowerCase()));
  const matches = entry.topics.filter(t => querySet.has(t.toLowerCase())).length;
  return matches / Math.max(entry.topics.length, topics.length);
}

// ── Echo Now ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the top-N conscious memories most relevant to `topics`.
 * Scans the hot STM+LTM window (no archive, no LLM).
 * Expected latency: <1ms for typical entity STM sizes.
 *
 * @param {string}   entityId
 * @param {string[]} topics
 * @param {number}   [limit=8]
 * @param {Object}   [_opts]
 * @param {ConsciousMemory} [_opts.consciousMemory]  Injected instance for tests.
 * @returns {Object[]} Scored memory entries, highest relevance first.
 */
function echoNow(entityId, topics, limit = 8, _opts = {}) {
  if (!topics || topics.length === 0) return [];

  const cm = _opts.consciousMemory || new ConsciousMemory({ entityId });

  // Pull from both tiers using ConsciousMemory's built-in scoring,
  // requesting a larger pool so the merge has enough candidates.
  const poolSize = Math.min(limit * 3, 50);
  const stm = cm.getStmContext(topics, poolSize);
  const ltm = cm.getLtmContext(topics, poolSize);

  // Merge, deduplicating by id (STM wins on collision).
  const seen = new Set(stm.map(e => e.id));
  const merged = [...stm, ...ltm.filter(e => !seen.has(e.id))];

  // Re-score merged pool so cross-tier ordering is correct.
  const scored = merged.map(entry => ({
    ...entry,
    _echoScore: _topicScore(entry, topics)
  }));

  scored.sort((a, b) => b._echoScore - a._echoScore);

  // Strip internal score field before returning.
  return scored.slice(0, limit).map(({ _echoScore, ...e }) => e);
}

// ── Echo Past (stub — implemented in E-2) ────────────────────────────────────

/**
 * Search the archive directory for memories older than the hot STM/LTM window.
 *
 * Round 1 (default): scan directory → pick top-ranked archive → BM25 via queryArchive.
 *   Retries on miss: up to 3 archives probed before returning [].
 *
 * Round 2 (options.round === 2): probes archives NOT already tried in round-1.
 *   Called asynchronously during the humanizer typing window.
 *   Cap: probes up to 10 new archives (each ~22ms → ~220ms max; typing window is 2-4s).
 *   Returns on first hit — caller re-invokes if more time remains.
 *
 * Injectable for tests:
 *   options._archives        — pre-built ranked archive list (skips scanDirectory FS read)
 *   options._queryArchive    — mock function replacing queryArchive
 *   options._round1ProbeSet  — Set<archiveId> already probed in round-1 (required for round-2)
 *
 * @param {string}   entityId
 * @param {string[]} topics
 * @param {Object}   [options]
 * @param {number}   [options.round=1]           1 (default) or 2 (async enrichment).
 * @param {number}   [options.limit=12]           Max results to return per probe.
 * @param {Object}   [options.yearRange]           Passed through to queryArchive.
 * @param {Object|null} [options.timeRange]        Passed to scanDirectory for pre-filtering.
 * @param {Set}      [options._round1ProbeSet]     Set of archiveIds already probed (round-2).
 * @param {Object[]} [options._archives]           Test injection: archive list.
 * @param {Function} [options._queryArchive]       Test injection: mock queryArchive.
 * @returns {Object[]}  Memory entries with `id` field. Round-2 entries include `_archiveScore`.
 */
function echoPast(entityId, topics, options = {}) {
  if (!topics || topics.length === 0) return [];

  const { scanDirectory }  = require('./utils/archive-directory');
  const { queryArchive }   = require('./utils/archive-index');

  const qArchive = options._queryArchive || queryArchive;
  const round    = options.round || 1;

  // Allow test injection of a pre-built archive list.
  const rankedArchives = options._archives !== undefined
    ? options._archives
    : scanDirectory(entityId, topics, options.timeRange || null);

  if (!rankedArchives.length) return [];

  const limit = options.limit || 12;
  const yearRange = options.yearRange || {};

  if (round === 1) {
    // ── Round 1: try top-3 ranked archives ────────────────────────────────
    const maxAttempts = Math.min(3, rankedArchives.length);
    for (let i = 0; i < maxAttempts; i++) {
      const archive = rankedArchives[i];
      const arcTopics = (archive.topics || []).filter(t =>
        topics.some(q => q.toLowerCase() === t.toLowerCase())
      );
      const queryTopics = arcTopics.length > 0 ? arcTopics : topics;
      const hits = qArchive(entityId, queryTopics, limit, yearRange);
      if (hits.length > 0) {
        return hits.map(h => ({ id: h.memId, ...h.meta, _archiveScore: h.score }));
      }
    }
    return [];
  }

  // ── Round 2: probe archives NOT already tried in round-1 ──────────────────
  const probed  = options._round1ProbeSet instanceof Set ? options._round1ProbeSet : new Set();
  const maxProbes = 10; // cap: stay well inside a 2-4s humanizer window
  let attempts = 0;

  for (const archive of rankedArchives) {
    if (probed.has(archive.archiveId)) continue;
    if (attempts >= maxProbes) break;
    attempts++;

    const arcTopics = (archive.topics || []).filter(t =>
      topics.some(q => q.toLowerCase() === t.toLowerCase())
    );
    const queryTopics = arcTopics.length > 0 ? arcTopics : topics;
    const hits = qArchive(entityId, queryTopics, limit, yearRange);
    if (hits.length > 0) {
      return hits.map(h => ({ id: h.memId, ...h.meta, _archiveScore: h.score }));
    }
  }

  return [];
}

// ── STM Promotion (E-5-1) ─────────────────────────────────────────────────────

const PROMOTION_SCORE_THRESHOLD = 1.2; // default minimum _archiveScore for STM injection

/**
 * Promote round-2 Echo Past results above a relevance threshold into ConsciousMemory STM.
 * Strong archive finds become immediately available to Echo Now on the next turn.
 *
 * @param {string}   entityId
 * @param {Object[]} hits        Array of echoPast return values (must have _archiveScore).
 * @param {Object}   [opts]
 * @param {number}   [opts.threshold=1.2]          Minimum _archiveScore to qualify.
 * @param {ConsciousMemory} [opts._consciousMemory]  Test injection.
 * @returns {number} Count of entries promoted.
 */
function promoteToStm(entityId, hits, opts = {}) {
  if (!hits || hits.length === 0) return 0;

  const threshold = typeof opts.threshold === 'number' ? opts.threshold : PROMOTION_SCORE_THRESHOLD;
  const qualifying = hits.filter(h => Number(h._archiveScore || 0) > threshold);
  if (!qualifying.length) return 0;

  const ConsciousMemory = require('./memory/conscious-memory');
  const cm = opts._consciousMemory || new ConsciousMemory({ entityId });

  let promoted = 0;
  for (const hit of qualifying) {
    try {
      cm.addToStm({
        summary: String(hit.summary || hit.semantic || '').slice(0, 500),
        topics:  Array.isArray(hit.topics) ? hit.topics : [],
        source:  'echo_past_r2',
      });
      promoted++;
    } catch {
      // non-fatal — promotion is always additive
    }
  }
  return promoted;
}

// ── Echo Future (stub — implemented in Phase 5) ───────────────────────────────

/**
 * Shape/topology matching for predictive memory recall.
 * Stub: returns null until Phase 5.
 *
 * @param {string} entityId
 * @returns {null}
 */
function echoFuture(entityId) { // eslint-disable-line no-unused-vars
  return null;
}

module.exports = { echoNow, echoPast, echoFuture, promoteToStm };
