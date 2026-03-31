// ── Brain · Archive Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ./bm25,
// ../../entityPaths, ./archive-router. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/utils/archive-index.js
 * IME Phase I3-0 — Archive Index Utility
 *
 * Manages the three-tier archive for an entity:
 *   memories/archive/episodic/   — promoted hot-index episodic memories
 *   memories/archive/docs/       — nkdoc_* chunks routed at ingest time
 *   memories/archive/archiveIndex.json — searchable index over both
 *
 * archiveIndex.json schema:
 *   {
 *     "<memId>": {
 *       "topics":        string[],
 *       "archivedAt":    ISO string,
 *       "type":          "episodic" | "doc" | "semantic_knowledge",
 *       "decayAtArchive": number,
 *       "created":       ISO string,
 *       "emotion":       string,
 *       "importance":    number,
 *       "docId":         string | null   // for doc chunks: source doc identifier
 *     }
 *   }
 *
 * Public API:
 *   ensureArchiveDirs(entityId)                     → void
 *   readArchiveIndex(entityId)                      → object
 *   appendArchiveEntry(entityId, memId, entry)      → void
 *   removeArchiveEntry(entityId, memId)             → void
 *   queryArchive(entityId, topics, limit, yearRange) → { memId, score, meta }[]
 */

const fs   = require('fs');
const path = require('path');
const { bm25Score } = require('./bm25');
const {
  getArchiveRoot,
  getArchiveEpisodicPath,
  getArchiveDocsPath,
  getArchiveIndexPath,
  getArchiveBucketPath,
  getArchiveMigrationMarkerPath,
} = require('../../entityPaths');
const { topicToSlug, updateRouter, resolveQueryBuckets } = require('./archive-router');
// _sleepMs()
// WHAT THIS DOES: _sleepMs is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _sleepMs(...) where this helper behavior is needed.
function _sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Intentional tiny sync wait for retry-based atomic rename on Windows.
  }
}
// _replaceFileAtomic()
// WHAT THIS DOES: _replaceFileAtomic is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _replaceFileAtomic(...) where this helper behavior is needed.
function _replaceFileAtomic(filePath, content) {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  fs.writeFileSync(tmpPath, content, 'utf8');

  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code) || attempt === 5) {
        break;
      }
      _sleepMs(25 * (attempt + 1));
    }
  }

  try { fs.rmSync(tmpPath, { force: true }); } catch (_) {}
  throw lastError;
}

// ── Bucket I/O helpers ────────────────────────────────────────────────────────

/**
 * Append a single JSON line to a bucket NDJSON file.
 * Creates the file (and parent dir) if it doesn't exist.
 *
 * @param {string} entityId
 * @param {string} filename  e.g. 'bucket_neuroscience.ndjson'
 * @param {object} lineObj
 */
// _appendBucketLine()
// WHAT THIS DOES: _appendBucketLine is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _appendBucketLine(...) where this helper behavior is needed.
function _appendBucketLine(entityId, filename, lineObj) {
  const bucketPath = getArchiveBucketPath(entityId, filename);
  fs.mkdirSync(path.dirname(bucketPath), { recursive: true });
  fs.appendFileSync(bucketPath, JSON.stringify(lineObj) + '\n', 'utf8');
}

/**
 * Remove all lines whose `memId` matches from a bucket NDJSON file.
 * No-op if the file doesn't exist.
 *
 * @param {string} entityId
 * @param {string} filename
 * @param {string} memId
 */
// _removeBucketLine()
// WHAT THIS DOES: _removeBucketLine removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call _removeBucketLine(...) when you need a safe teardown/reset path.
function _removeBucketLine(entityId, filename, memId) {
  const bucketPath = getArchiveBucketPath(entityId, filename);
  if (!fs.existsSync(bucketPath)) return;
  const lines = fs.readFileSync(bucketPath, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .filter(l => {
      try { return JSON.parse(l).memId !== memId; } catch { return true; }
    });
  _replaceFileAtomic(bucketPath, lines.join('\n') + (lines.length ? '\n' : ''));
}

/**
 * Read all non-stub, non-malformed entries from a bucket NDJSON file.
 *
 * @param {string} entityId
 * @param {string} filename
 * @returns {{ memId: string, [key: string]: any }[]}
 */
// _readBucket()
// WHAT THIS DOES: _readBucket reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call _readBucket(...), then use the returned value in your next step.
function _readBucket(entityId, filename) {
  const bucketPath = getArchiveBucketPath(entityId, filename);
  if (!fs.existsSync(bucketPath)) return [];
  const entries = [];
  for (const line of fs.readFileSync(bucketPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (!obj.stub && obj.memId) entries.push(obj);
    } catch { /* skip malformed lines */ }
  }
  return entries;
}

// ── Directory initialisation ──────────────────────────────────────────────────

/**
 * Idempotently create the archive directory tree for an entity.
 * Called on server start and before any archive write.
 * Triggers a one-time migration of any pre-existing flat archiveIndex.json
 * into the sharded bucket layout (skipped if migration_complete.json exists).
 *
 * @param {string} entityId
 */
// ensureArchiveDirs()
// WHAT THIS DOES: ensureArchiveDirs is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureArchiveDirs(...) where this helper behavior is needed.
function ensureArchiveDirs(entityId) {
  fs.mkdirSync(getArchiveRoot(entityId),         { recursive: true });
  fs.mkdirSync(getArchiveEpisodicPath(entityId), { recursive: true });
  fs.mkdirSync(getArchiveDocsPath(entityId),     { recursive: true });
  migrateToShards(entityId);
}

// ── Index I/O ─────────────────────────────────────────────────────────────────

/**
 * Read the archiveIndex.json for an entity.
 * Creates an empty index if the file doesn't exist yet.
 *
 * @param {string} entityId
 * @returns {object}  { memId: entry, ... }
 */
// readArchiveIndex()
// WHAT THIS DOES: readArchiveIndex reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call readArchiveIndex(...), then use the returned value in your next step.
function readArchiveIndex(entityId) {
  const indexPath = getArchiveIndexPath(entityId);
  if (!fs.existsSync(indexPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Write the full archive index with atomic rename.
 *
 * @param {string} entityId
 * @param {object} index
 */
// _writeArchiveIndex()
// WHAT THIS DOES: _writeArchiveIndex changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call _writeArchiveIndex(...) with the new values you want to persist.
function _writeArchiveIndex(entityId, index) {
  const indexPath = getArchiveIndexPath(entityId);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  _replaceFileAtomic(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Append or update a single entry in archiveIndex.json.
 *
 * @param {string} entityId
 * @param {string} memId
 * @param {{
 *   topics:         string[],
 *   archivedAt:     string,
 *   type:           string,
 *   decayAtArchive: number,
 *   created:        string,
 *   emotion:        string,
 *   importance:     number,
 *   docId:          string|null
 * }} entry
 */
// appendArchiveEntry()
// WHAT THIS DOES: appendArchiveEntry is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendArchiveEntry(...) where this helper behavior is needed.
function appendArchiveEntry(entityId, memId, entry) {
  ensureArchiveDirs(entityId);
  const normalized = {
    topics:         entry.topics        || [],
    archivedAt:     entry.archivedAt    || new Date().toISOString(),
    type:           entry.type          || 'episodic',
    decayAtArchive: entry.decayAtArchive ?? 0,
    created:        entry.created       || new Date().toISOString(),
    emotion:        entry.emotion       || 'neutral',
    importance:     entry.importance    ?? 0.5,
    docId:          entry.docId         || null,
  };

  // ── Dual-write: flat index (backward compat + rollback safety) ────────────
  const index = readArchiveIndex(entityId);
  index[memId] = normalized;
  _writeArchiveIndex(entityId, index);

  // ── Bucket write: route by primary topic ──────────────────────────────────
  const topics = normalized.topics;
  const primarySlug   = topicToSlug(topics[0]);
  const primaryBucket = `bucket_${primarySlug}.ndjson`;
  updateRouter(entityId, primarySlug, primaryBucket);
  _appendBucketLine(entityId, primaryBucket, { memId, ...normalized });

  // ── Stub write: secondary topics (lightweight cross-bucket pointers) ──────
  for (let i = 1; i < topics.length; i++) {
    const secondarySlug   = topicToSlug(topics[i]);
    const secondaryBucket = `bucket_${secondarySlug}.ndjson`;
    updateRouter(entityId, secondarySlug, secondaryBucket);
    _appendBucketLine(entityId, secondaryBucket, { memId, primaryBucket, stub: true });
  }
}

/**
 * Remove an entry from archiveIndex.json.
 *
 * @param {string} entityId
 * @param {string} memId
 */
// removeArchiveEntry()
// WHAT THIS DOES: removeArchiveEntry removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call removeArchiveEntry(...) when you need a safe teardown/reset path.
function removeArchiveEntry(entityId, memId) {
  const index = readArchiveIndex(entityId);
  if (!index[memId]) return;

  // Capture topics before deletion so we can clean up bucket files
  const entry = index[memId];
  delete index[memId];
  _writeArchiveIndex(entityId, index);

  // Remove from primary bucket and stubs from secondary buckets
  const topics = entry.topics || [];
  if (topics.length > 0) {
    const primarySlug = topicToSlug(topics[0]);
    _removeBucketLine(entityId, `bucket_${primarySlug}.ndjson`, memId);
    for (let i = 1; i < topics.length; i++) {
      const secondarySlug = topicToSlug(topics[i]);
      _removeBucketLine(entityId, `bucket_${secondarySlug}.ndjson`, memId);
    }
  }
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * BM25 search over the archive index.
 *
 * Routing logic:
 *   1. Use topic router to find matching bucket files.
 *   2. If buckets found: read entries from those buckets (skip stubs),
 *      dedup by memId (keep first occurrence), score, filter, sort.
 *   3. If no matching buckets (router missing or topics unknown):
 *      fall back to full scan of flat archiveIndex.json.
 *
 * @param {string}    entityId
 * @param {string[]}  topics          - RAKE-normalized query topics
 * @param {number}    [limit=20]      - Max results to return
 * @param {{ start?: string, end?: string }} [yearRange]
 *   Optional ISO date range filter: only entries with `created` within range included.
 * @param {string[]|null} [types]     - Optional type filter ('episodic', 'doc', etc.)
 * @param {Set<string>|null} [narrowSet]
 *   When provided (non-null), only entries whose memId is in the Set are scored.
 *   An empty Set returns []. Pass null/undefined to disable (zero-cost).
 * @returns {{ memId: string, score: number, meta: object }[]}
 *   Sorted by BM25 score descending.
 */
// queryArchive()
// WHAT THIS DOES: queryArchive is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call queryArchive(...) where this helper behavior is needed.
function queryArchive(entityId, topics, limit = 20, yearRange = {}, types = null, narrowSet = null) {
  if (!topics || topics.length === 0) return [];

  // typeSet()
  // Purpose: helper wrapper used by this module's main flow.
  // typeSet()
  // WHAT THIS DOES: typeSet is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call typeSet(...) where this helper behavior is needed.
  const typeSet = (types && types.length > 0) ? new Set(types) : null;
  const typeOk  = typeSet ? (meta) => typeSet.has(meta.type || 'episodic') : () => true;

  // ── Sharded path ──────────────────────────────────────────────────────────
  const bucketFiles = resolveQueryBuckets(entityId, topics);
  if (bucketFiles.length > 0) {
    // Merge entries from all matching buckets; dedup by memId (first wins)
    const byMemId = new Map();
    for (const filename of bucketFiles) {
      for (const entry of _readBucket(entityId, filename)) {
        if (!byMemId.has(entry.memId)) byMemId.set(entry.memId, entry);
      }
    }

    const results = [];
    for (const [memId, entry] of byMemId) {
      // narrowSet: null = no filter; empty Set = exclude all; Set with ids = allow list
      if (narrowSet != null && !narrowSet.has(memId)) continue;
      const { memId: _id, ...meta } = entry;
      if (!typeOk(meta)) continue;
      if (yearRange.start && meta.created < yearRange.start) continue;
      if (yearRange.end   && meta.created > yearRange.end)   continue;
      const score = bm25Score(topics, meta.topics || []);
      if (score > 0) results.push({ memId, score, meta });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // ── Fallback: flat scan on archiveIndex.json ──────────────────────────────
  const index   = readArchiveIndex(entityId);
  const entries = Object.entries(index);
  if (entries.length === 0) return [];

  const results = [];
  for (const [memId, meta] of entries) {
    // narrowSet: null = no filter; empty Set = exclude all; Set with ids = allow list
    if (narrowSet != null && !narrowSet.has(memId)) continue;
    if (!typeOk(meta)) continue;
    if (yearRange.start && meta.created < yearRange.start) continue;
    if (yearRange.end   && meta.created > yearRange.end)   continue;
    const score = bm25Score(topics, meta.topics || []);
    if (score > 0) results.push({ memId, score, meta });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * One-time migration: re-bucket all entries in any existing flat
 * archiveIndex.json into the sharded bucket layout.
 *
 * Idempotent: skipped on subsequent calls when migration_complete.json exists.
 * The flat archiveIndex.json is kept in place as a static fallback — nothing
 * is deleted.
 *
 * @param {string} entityId
 */
// migrateToShards()
// WHAT THIS DOES: migrateToShards is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call migrateToShards(...) where this helper behavior is needed.
function migrateToShards(entityId) {
  const markerPath = getArchiveMigrationMarkerPath(entityId);
  if (fs.existsSync(markerPath)) return;

  const index   = readArchiveIndex(entityId);
  const entries = Object.entries(index);

  for (const [memId, entry] of entries) {
    const topics        = entry.topics || [];
    const primarySlug   = topicToSlug(topics[0]);
    const primaryBucket = `bucket_${primarySlug}.ndjson`;
    updateRouter(entityId, primarySlug, primaryBucket);
    _appendBucketLine(entityId, primaryBucket, { memId, ...entry });

    for (let i = 1; i < topics.length; i++) {
      const secondarySlug   = topicToSlug(topics[i]);
      const secondaryBucket = `bucket_${secondarySlug}.ndjson`;
      updateRouter(entityId, secondarySlug, secondaryBucket);
      _appendBucketLine(entityId, secondaryBucket, { memId, primaryBucket, stub: true });
    }
  }

  fs.writeFileSync(
    markerPath,
    JSON.stringify({ migratedAt: new Date().toISOString(), count: entries.length }),
    'utf8'
  );
}

module.exports = {
  ensureArchiveDirs,
  readArchiveIndex,
  appendArchiveEntry,
  removeArchiveEntry,
  queryArchive,
  migrateToShards,
};
