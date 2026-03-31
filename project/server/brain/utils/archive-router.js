// ── Brain · Archive Router ────────────────────────────────────────────────────
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
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
// ============================================================
// archive-router.js — Phase 4.6 Topic Router
//
// Maintains memories/archive/router.json which maps canonical
// topic slugs to bucket filenames.  All reads/writes are
// atomic (tmp + rename).
//
// Bucket filename convention:  bucket_<slug>.ndjson
// Reserved slugs:
//   _misc            — entries with no extractable primary topic
//   _node_templates  — Phase 5 predicted topology node templates
// ============================================================

const fs   = require('fs');
const path = require('path');
const {
  getArchiveRoot,
  getArchiveRouterPath,
  getArchiveBucketPath,
} = require('../../entityPaths');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ensure the archive directory exists so atomic writes don't fail.
 * Intentionally lightweight — called inline rather than as a setup step.
 */
// _ensureArchiveDir()
// WHAT THIS DOES: _ensureArchiveDir is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _ensureArchiveDir(...) where this helper behavior is needed.
function _ensureArchiveDir(entityId) {
  fs.mkdirSync(getArchiveRoot(entityId), { recursive: true });
}
function _sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Intentional tiny sync wait for retry-based atomic rename on Windows.
  }
}
// _writeJsonAtomic()
// WHAT THIS DOES: _writeJsonAtomic changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call _writeJsonAtomic(...) with the new values you want to persist.
function _writeJsonAtomic(filePath, value) {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');

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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Convert a topic string to a canonical slug suitable for use as a
 * bucket file name component.
 *
 * Algorithm:
 *   1. Lowercase and trim whitespace
 *   2. Replace every non-alphanumeric character with _
 *   3. Collapse consecutive underscores into one
 *   4. Strip leading/trailing underscores
 *   5. Fallback to '_misc' if the result is empty
 *
 * @param {string} topic
 * @returns {string}
 */
// topicToSlug()
// WHAT THIS DOES: topicToSlug is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call topicToSlug(...) where this helper behavior is needed.
function topicToSlug(topic) {
  if (!topic || typeof topic !== 'string') return '_misc';
  const slug = topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || '_misc';
}

/**
 * Read the router index for an entity.
 *
 * @param {string} entityId
 * @returns {{ [slug: string]: string }}  slug → bucketFilename map
 */
// readRouter()
// WHAT THIS DOES: readRouter reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call readRouter(...), then use the returned value in your next step.
function readRouter(entityId) {
  const routerPath = getArchiveRouterPath(entityId);
  try {
    return JSON.parse(fs.readFileSync(routerPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Register a slug → bucketFilename mapping in the router.
 * Atomic write: writes to a tmp file then renames into place.
 *
 * @param {string} entityId
 * @param {string} slug           canonical topic slug
 * @param {string} bucketFilename e.g. 'bucket_neuroscience.ndjson'
 */
// updateRouter()
// WHAT THIS DOES: updateRouter changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call updateRouter(...) with the new values you want to persist.
function updateRouter(entityId, slug, bucketFilename) {
  _ensureArchiveDir(entityId);
  const routerPath = getArchiveRouterPath(entityId);
  const router = readRouter(entityId);
  router[slug] = bucketFilename;
  _writeJsonAtomic(routerPath, router);
}

/**
 * Given an array of query topic strings, return the distinct set of
 * bucket filenames that cover those topics.  Topics with no registered
 * bucket are silently skipped.
 *
 * @param {string}   entityId
 * @param {string[]} topics   raw topic strings (will be slugified here)
 * @returns {string[]}  unique bucket filenames; [] if none matched
 */
// resolveQueryBuckets()
// WHAT THIS DOES: resolveQueryBuckets is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call resolveQueryBuckets(...) where this helper behavior is needed.
function resolveQueryBuckets(entityId, topics) {
  if (!Array.isArray(topics) || topics.length === 0) return [];
  const router = readRouter(entityId);
  const seen = new Set();
  for (const topic of topics) {
    const slug = topicToSlug(topic);
    const filename = router[slug];
    if (filename) seen.add(filename);
  }
  return Array.from(seen);
}

/**
 * Return all registered bucket filenames (unique values from the router).
 *
 * @param {string} entityId
 * @returns {string[]}
 */
// listBuckets()
// WHAT THIS DOES: listBuckets is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call listBuckets(...) where this helper behavior is needed.
function listBuckets(entityId) {
  const router = readRouter(entityId);
  return [...new Set(Object.values(router))];
}

module.exports = {
  topicToSlug,
  readRouter,
  updateRouter,
  resolveQueryBuckets,
  listBuckets,
};
