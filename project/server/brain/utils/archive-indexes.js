'use strict';
// ============================================================
// server/brain/utils/archive-indexes.js
// Phase 4.7 E-1 — Multi-Axis Archive Index Utility
//
// Manages per-entity, per-axis index files stored at:
//   memories/archive/indexes/<axis>/<key>.idx.json
//
// Each index file is a plain JSON array of memIds (strings).
// Axes in use: 'temporal' (YYYY-MM keys), 'subject' (slug keys).
// Echo Future (Phase 5) will add a 'shape' axis.
//
// Public API:
//   readIndex(entityId, axis, key, opts?)              → string[]
//   writeIndex(entityId, axis, key, entries, opts?)    → void
//   listIndexes(entityId, axis, opts?)                 → string[]
//   intersectIndexes(entityId, filters, opts?)         → Set<string>
//   narrowByIndex(entries, narrowSet)                  → Object[]
//
// opts.baseDir — override the entities root (used in tests for tmp dirs).
// ============================================================

const fs   = require('fs');
const path = require('path');
const { getArchiveIndexDir } = require('../../entityPaths');

// ── Internal path helpers ─────────────────────────────────────────────────────

/**
 * Resolve the indexes root directory, respecting the test baseDir override.
 * When baseDir is provided the directory structure mirrors the normal layout but
 * rooted at baseDir instead of the live entities dir.
 */
function _indexDir(entityId, axis, opts = {}) {
  if (opts.baseDir) {
    return path.join(opts.baseDir, `entity_${entityId}`, 'memories', 'archive', 'indexes', axis);
  }
  return path.join(getArchiveIndexDir(entityId), axis);
}

function _indexFile(entityId, axis, key, opts) {
  return path.join(_indexDir(entityId, axis, opts), `${key}.idx.json`);
}

function _ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read an index for a given axis + key.
 * Returns an empty array if the index file does not exist.
 *
 * @param {string}   entityId
 * @param {string}   axis      e.g. 'temporal', 'subject', 'shape'
 * @param {string}   key       e.g. '2025-03', 'physics'
 * @param {Object}   [opts]
 * @param {string}   [opts.baseDir]  Override entities root (for tests).
 * @returns {string[]} Array of memIds.
 */
function readIndex(entityId, axis, key, opts = {}) {
  const filePath = _indexFile(entityId, axis, key, opts);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Write (overwrite) the index for a given axis + key.
 * Creates the directory if it does not exist.
 *
 * @param {string}   entityId
 * @param {string}   axis
 * @param {string}   key
 * @param {string[]} entries   Array of memIds.
 * @param {Object}   [opts]
 */
function writeIndex(entityId, axis, key, entries, opts = {}) {
  const dir = _indexDir(entityId, axis, opts);
  _ensureDir(dir);
  const filePath = _indexFile(entityId, axis, key, opts);
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 0), 'utf8');
}

/**
 * List all keys (index file stems) stored under a given axis.
 * Returns an empty array if no index files exist yet.
 *
 * @param {string}   entityId
 * @param {string}   axis
 * @param {Object}   [opts]
 * @returns {string[]} Array of key strings (e.g. ['2025-03', '2025-04']).
 */
function listIndexes(entityId, axis, opts = {}) {
  const dir = _indexDir(entityId, axis, opts);
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.idx.json'))
      .map(f => f.slice(0, -('.idx.json'.length)));
  } catch {
    return [];
  }
}

/**
 * Intersect multiple axis+key index lookups.
 * Returns only memIds present in ALL specified index lookups.
 * Returns an empty Set when filters is empty.
 *
 * @param {string}   entityId
 * @param {Array<{axis: string, key: string}>} filters
 * @param {Object}   [opts]
 * @returns {Set<string>}
 */
function intersectIndexes(entityId, filters, opts = {}) {
  if (!filters || filters.length === 0) return new Set();

  // Load first filter as starting set.
  let result = new Set(readIndex(entityId, filters[0].axis, filters[0].key, opts));

  for (let i = 1; i < filters.length; i++) {
    const next = new Set(readIndex(entityId, filters[i].axis, filters[i].key, opts));
    // Keep only ids present in both.
    for (const id of result) {
      if (!next.has(id)) result.delete(id);
    }
    if (result.size === 0) break; // early exit — can't get smaller
  }

  return result;
}

/**
 * Filter an entries array to only those whose `id` field is in narrowSet.
 * Order is preserved.
 *
 * @param {Object[]}    entries    Array of memory objects with an `id` field.
 * @param {Set<string>} narrowSet  Pre-computed Set of allowed memIds.
 * @returns {Object[]}
 */
function narrowByIndex(entries, narrowSet) {
  if (!entries || entries.length === 0) return [];
  if (!narrowSet || narrowSet.size === 0) return [];
  return entries.filter(e => narrowSet.has(e.id));
}

// ── Index Rebuild Helpers ─────────────────────────────────────────────────────

/**
 * Read all non-stub NDJSON entries from a single bucket file.
 * Bucket path is resolved via the entities layout; opts.baseDir overrides root.
 *
 * @param {string} entityId
 * @param {string} filename   e.g. 'bucket_physics.ndjson'
 * @param {Object} [opts]
 * @param {string} [opts.baseDir]
 * @returns {{ memId: string, topics?: string[], created?: string }[]}
 */
function _readBucketEntries(entityId, filename, opts = {}) {
  let bucketPath;
  if (opts.baseDir) {
    bucketPath = path.join(opts.baseDir, `entity_${entityId}`, 'memories', 'archive', filename);
  } else {
    const { getArchiveBucketPath } = require('../../entityPaths');
    bucketPath = getArchiveBucketPath(entityId, filename);
  }
  if (!fs.existsSync(bucketPath)) return [];
  const entries = [];
  for (const line of fs.readFileSync(bucketPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (!obj.stub && obj.memId) entries.push(obj);
    } catch { /* skip malformed */ }
  }
  return entries;
}

/**
 * Read the router.json for an entity and return all unique bucket filenames.
 * opts.baseDir overrides entities root for test isolation.
 *
 * @param {string} entityId
 * @param {Object} [opts]
 * @returns {string[]}
 */
function _listBucketFilenames(entityId, opts = {}) {
  let routerPath;
  if (opts.baseDir) {
    routerPath = path.join(opts.baseDir, `entity_${entityId}`, 'memories', 'archive', 'router.json');
  } else {
    const { getArchiveRouterPath } = require('../../entityPaths');
    routerPath = getArchiveRouterPath(entityId);
  }
  if (!fs.existsSync(routerPath)) return [];
  try {
    const router = JSON.parse(fs.readFileSync(routerPath, 'utf8'));
    return [...new Set(Object.values(router))];
  } catch { return []; }
}

// ── Temporal Index Builder (E-3-0) ────────────────────────────────────────────

/**
 * Rebuild temporal indexes from all registered bucket files.
 * Groups bucket entries by YYYY-MM derived from their `created` field.
 * Skips entries with no parseable `created` field.
 * Deduplicates memIds across buckets before writing.
 *
 * @param {string} entityId
 * @param {Object} [opts]
 * @param {string} [opts.baseDir]  Override entities root (for tests).
 * @returns {number} Count of unique memIds indexed.
 */
function rebuildTemporalIndexes(entityId, opts = {}) {
  const bucketFiles = _listBucketFilenames(entityId, opts);
  if (!bucketFiles.length) return 0;

  // month → Set<memId>
  const byMonth = new Map();

  for (const filename of bucketFiles) {
    const entries = _readBucketEntries(entityId, filename, opts);
    for (const entry of entries) {
      if (!entry.created) continue;
      const month = entry.created.slice(0, 7); // 'YYYY-MM'
      if (!/^\d{4}-\d{2}$/.test(month)) continue;
      if (!byMonth.has(month)) byMonth.set(month, new Set());
      byMonth.get(month).add(entry.memId);
    }
  }

  let total = 0;
  for (const [month, memIds] of byMonth) {
    const arr = Array.from(memIds);
    writeIndex(entityId, 'temporal', month, arr, opts);
    total += arr.length;
  }
  return total;
}

// ── Subject Index Builder (E-4-0) ─────────────────────────────────────────────

/**
 * Rebuild subject indexes by analyzing topic co-occurrence across all bucket entries.
 *
 * Algorithm:
 *   1. Build a co-occurrence frequency matrix: for each pair (topicA, topicB) that
 *      appear together in an entry, increment their co-occurrence count.
 *   2. Union-Find clusters: link topics via edges where co-occurrence > 0.
 *   3. For each cluster: the most-frequent topic becomes the subject label (slug).
 *   4. Write subject_<label>.idx.json with all memIds from all topics in the cluster.
 *
 * Deduplicates memIds within each subject index.
 *
 * @param {string} entityId
 * @param {Object} [opts]
 * @param {string} [opts.baseDir]  Override entities root (for tests).
 * @returns {number} Count of subject index files written.
 */
function rebuildSubjectIndexes(entityId, opts = {}) {
  const bucketFiles = _listBucketFilenames(entityId, opts);
  if (!bucketFiles.length) return 0;

  // topic → Set<memId>
  const topicToMemIds = new Map();
  // co-occurrence: topic → topic → count
  const coOccur = new Map();

  for (const filename of bucketFiles) {
    const entries = _readBucketEntries(entityId, filename, opts);
    for (const entry of entries) {
      const topics = (entry.topics || []).filter(t => t && typeof t === 'string');
      if (!topics.length) continue;

      for (const topic of topics) {
        if (!topicToMemIds.has(topic)) topicToMemIds.set(topic, new Set());
        topicToMemIds.get(topic).add(entry.memId);
      }

      // Record all pairwise co-occurrences.
      for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
          const a = topics[i], b = topics[j];
          if (!coOccur.has(a)) coOccur.set(a, new Map());
          if (!coOccur.has(b)) coOccur.set(b, new Map());
          coOccur.get(a).set(b, (coOccur.get(a).get(b) || 0) + 1);
          coOccur.get(b).set(a, (coOccur.get(b).get(a) || 0) + 1);
        }
      }
    }
  }

  if (!topicToMemIds.size) return 0;

  // ── Union-Find cluster builder ────────────────────────────────────────────
  const parent = new Map();
  function find(x) {
    if (!parent.has(x)) return x;
    const root = find(parent.get(x));
    parent.set(x, root); // path compression
    return root;
  }
  function union(x, y) {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent.set(ry, rx);
  }

  for (const [topicA, neighbors] of coOccur) {
    for (const [topicB] of neighbors) {
      union(topicA, topicB);
    }
  }

  // Group topics by cluster root.
  const clusters = new Map(); // root → Set<topic>
  for (const topic of topicToMemIds.keys()) {
    const root = find(topic);
    if (!clusters.has(root)) clusters.set(root, new Set());
    clusters.get(root).add(topic);
  }

  // Write one subject index per cluster; label = most-frequent topic.
  let written = 0;
  for (const [, topicsInCluster] of clusters) {
    // The label is the topic with the most memIds (most prominent).
    let label = null;
    let maxSize = 0;
    for (const t of topicsInCluster) {
      const sz = topicToMemIds.get(t)?.size || 0;
      if (sz > maxSize) { maxSize = sz; label = t; }
    }
    if (!label) continue;

    // Collect all unique memIds across all topics in this cluster.
    const allMemIds = new Set();
    for (const t of topicsInCluster) {
      for (const id of (topicToMemIds.get(t) || [])) {
        allMemIds.add(id);
      }
    }

    writeIndex(entityId, 'subject', label, Array.from(allMemIds), opts);
    written++;
  }

  return written;
}

// ── Echo Future — Shape Index Builder (Phase 5 Slice 4) ─────────────────────

/**
 * Rebuild shape indexes from all registered archive bucket entries.
 * Groups entries by their memory shape label (emotional, reflective,
 * narrative, factual, anticipatory, unclassified).
 *
 * For entries that already carry a `shape` field, uses it directly.
 * For legacy entries without `shape`, runs the heuristic classifier
 * on the available metadata (emotion, importance, type).
 *
 * Writes one index per shape label: shape/<label>.idx.json
 *
 * @param {string} entityId
 * @param {Object} [opts]
 * @param {string} [opts.baseDir]  Override entities root (for tests).
 * @returns {number} Count of unique memIds indexed.
 */
function rebuildShapeIndexes(entityId, opts = {}) {
  const { classifyShape } = require('../memory/shape-classifier');
  const bucketFiles = _listBucketFilenames(entityId, opts);
  if (!bucketFiles.length) return 0;

  // shape → Set<memId>
  const byShape = new Map();

  for (const filename of bucketFiles) {
    const entries = _readBucketEntries(entityId, filename, opts);
    for (const entry of entries) {
      const shape = entry.shape || classifyShape({
        semantic: null,
        emotion: entry.emotion || 'neutral',
        topics: entry.topics || [],
        importance: entry.importance ?? 0.5,
        type: entry.type || 'episodic'
      });
      if (!byShape.has(shape)) byShape.set(shape, new Set());
      byShape.get(shape).add(entry.memId);
    }
  }

  let total = 0;
  for (const [shape, memIds] of byShape) {
    const arr = Array.from(memIds);
    writeIndex(entityId, 'shape', shape, arr, opts);
    total += arr.length;
  }
  return total;
}

module.exports = {
  readIndex,
  writeIndex,
  listIndexes,
  intersectIndexes,
  narrowByIndex,
  rebuildTemporalIndexes,
  rebuildSubjectIndexes,
  rebuildShapeIndexes,
};
