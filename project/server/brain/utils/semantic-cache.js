'use strict';
/**
 * server/brain/utils/semantic-cache.js
 * Token Optimization Phase 4 — Semantic Cache (T4-0)
 *
 * LRU cache that stores recent LLM responses keyed by RAKE topic vectors.
 * On a new turn, the incoming message is vectorized and compared against
 * cached entries using BM25 similarity. If the score exceeds a threshold,
 * the cached response is returned — saving a full orchestrator pipeline call.
 *
 * Entity-scoped: each entity gets its own cache instance via the factory.
 *
 * Public API:
 *   createSemanticCache(opts?)       → SemanticCache instance
 *   SemanticCache.lookup(message)    → { hit, entry } | { hit: false }
 *   SemanticCache.store(message, response, meta?)
 *   SemanticCache.clear()
 *   SemanticCache.size
 *   SemanticCache.stats()
 */

const { extractPhrases } = require('./rake');
const { bm25Score }      = require('./bm25');

const DEFAULT_MAX_ENTRIES   = 200;
const DEFAULT_TTL_MS        = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MIN_THRESHOLD = 0.85;
const MIN_TOPICS_FOR_CACHE  = 2; // messages with < 2 topics are too ambiguous to cache

/**
 * @param {object} [opts]
 * @param {number} [opts.maxEntries]   - LRU capacity (default 200)
 * @param {number} [opts.ttlMs]        - Entry TTL in ms (default 15 min)
 * @param {number} [opts.threshold]    - BM25 similarity threshold (default 0.85)
 */
function createSemanticCache(opts = {}) {
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const ttlMs      = opts.ttlMs      ?? DEFAULT_TTL_MS;
  const threshold  = opts.threshold   ?? DEFAULT_MIN_THRESHOLD;

  // Map preserves insertion order — oldest first for LRU eviction
  const cache = new Map();
  let hits = 0;
  let misses = 0;

  /**
   * Extract a topic vector from a message string.
   * @param {string} message
   * @returns {string[]}
   */
  function vectorize(message) {
    if (!message || typeof message !== 'string') return [];
    return extractPhrases(message.trim(), 12);
  }

  /**
   * Remove expired entries from the cache.
   */
  function evictExpired() {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.timestamp > ttlMs) {
        cache.delete(key);
      }
    }
  }

  /**
   * Evict the oldest entry if cache has reached capacity.
   */
  function evictLRU() {
    if (cache.size <= maxEntries) return;
    // Map iteration is insertion-order; first key is the oldest
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  /**
   * Look up a message in the cache.
   * @param {string} message - User message text
   * @returns {{ hit: boolean, entry?: { response: string, topics: string[], score: number, originalTurnId?: string, source: string } }}
   */
  function lookup(message) {
    evictExpired();

    const queryTopics = vectorize(message);
    if (queryTopics.length < MIN_TOPICS_FOR_CACHE) {
      misses++;
      return { hit: false };
    }

    let bestScore = 0;
    let bestEntry = null;

    for (const [, entry] of cache) {
      const score = bm25Score(queryTopics, entry.topics);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    if (bestEntry && bestScore >= threshold) {
      hits++;
      // Move to end (most recently used) — delete + re-insert
      const key = bestEntry.key;
      cache.delete(key);
      cache.set(key, bestEntry);

      return {
        hit: true,
        entry: {
          response: bestEntry.response,
          topics: bestEntry.topics,
          score: bestScore,
          originalTurnId: bestEntry.turnId || null,
          source: 'semantic-cache'
        }
      };
    }

    misses++;
    return { hit: false };
  }

  /**
   * Store a message→response pair in the cache.
   * @param {string} message  - User message
   * @param {string} response - LLM response
   * @param {object} [meta]
   * @param {string} [meta.turnId] - Optional turn identifier
   */
  function store(message, response, meta = {}) {
    const topics = vectorize(message);
    if (topics.length < MIN_TOPICS_FOR_CACHE) return; // too ambiguous to cache

    const key = topics.sort().join('|');

    // Upsert — delete old if exists to refresh LRU position
    if (cache.has(key)) cache.delete(key);

    cache.set(key, {
      key,
      topics,
      response,
      turnId: meta.turnId || null,
      timestamp: Date.now()
    });

    evictLRU();
  }

  /**
   * Clear all cache entries.
   */
  function clear() {
    cache.clear();
    hits = 0;
    misses = 0;
  }

  /**
   * @returns {{ size: number, hits: number, misses: number, hitRate: number }}
   */
  function stats() {
    const total = hits + misses;
    return {
      size: cache.size,
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0
    };
  }

  return {
    lookup,
    store,
    clear,
    stats,
    get size() { return cache.size; }
  };
}

// ── Entity-scoped factory registry ────────────────────────────────────────────

const entityCaches = new Map();

/**
 * Get or create a cache instance for an entity.
 * @param {string} entityId
 * @param {object} [opts] - Forwarded to createSemanticCache on first call
 * @returns {ReturnType<typeof createSemanticCache>}
 */
function getEntityCache(entityId, opts) {
  if (!entityId) return createSemanticCache(opts);
  if (!entityCaches.has(entityId)) {
    entityCaches.set(entityId, createSemanticCache(opts));
  }
  return entityCaches.get(entityId);
}

/**
 * Clear a specific entity's cache, or all caches if no entityId given.
 * @param {string} [entityId]
 */
function clearEntityCache(entityId) {
  if (entityId) {
    const c = entityCaches.get(entityId);
    if (c) c.clear();
    entityCaches.delete(entityId);
  } else {
    for (const c of entityCaches.values()) c.clear();
    entityCaches.clear();
  }
}

module.exports = {
  createSemanticCache,
  getEntityCache,
  clearEntityCache,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_TTL_MS,
  DEFAULT_MIN_THRESHOLD,
  MIN_TOPICS_FOR_CACHE
};
