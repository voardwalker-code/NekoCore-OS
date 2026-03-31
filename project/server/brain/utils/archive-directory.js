// ── Brain · Archive Directory ────────────────────────────────────────────────────
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
// server/brain/utils/archive-directory.js
// Phase 4.7 E-2 — Archive Directory (hierarchical search tier 1)
//
// Manages the entity's archive directory: a flat JSON array of
// archive headers stored at:
//   memories/archive/archive_directory.json
//
// Each header describes one bucket archive:
//   {
//     archiveId : string     — bucket filename, e.g. 'bucket_physics.ndjson'
//     topics    : string[]   — canonical topic slugs present in this archive
//     timeRange : { start: ISO, end: ISO }  (optional)
//     subject   : string     (optional display label)
//     entryCount: number     (optional; informational)
//   }
//
// Public API:
//   readDirectory(entityId, opts?)                          → header[]
//   writeDirectory(entityId, directory, opts?)              → void (atomic)
//   registerArchive(entityId, archiveId, header, opts?)     → void
//   scanDirectory(entityId, topics, timeRange?, opts?)      → ranked header[]
//
// opts.baseDir — override entities root (test isolation via os.tmpdir()).
// ============================================================

const fs   = require('fs');
const path = require('path');
const { getArchiveRoot } = require('../../entityPaths');

// ── Internal path helpers ─────────────────────────────────────────────────────

// _directoryPath()
// WHAT THIS DOES: _directoryPath is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _directoryPath(...) where this helper behavior is needed.
function _directoryPath(entityId, opts) {
  if (opts && opts.baseDir) {
    return path.join(opts.baseDir, `entity_${entityId}`, 'memories', 'archive', 'archive_directory.json');
  }
  return path.join(getArchiveRoot(entityId), 'archive_directory.json');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read the archive directory for an entity.
 * Returns an empty array if the file does not exist yet.
 *
 * @param {string} entityId
 * @param {Object} [opts]
 * @param {string} [opts.baseDir]  Override entities root (for tests).
 * @returns {Object[]} Array of archive header objects.
 */
// readDirectory()
// WHAT THIS DOES: readDirectory reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call readDirectory(...), then use the returned value in your next step.
function readDirectory(entityId, opts = {}) {
  const filePath = _directoryPath(entityId, opts);
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Write (overwrite) the archive directory for an entity.
 * Uses atomic write (tmp + rename) to prevent corruption.
 *
 * @param {string}   entityId
 * @param {Object[]} directory  Array of archive header objects.
 * @param {Object}   [opts]
 */
// writeDirectory()
// WHAT THIS DOES: writeDirectory changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call writeDirectory(...) with the new values you want to persist.
function writeDirectory(entityId, directory, opts = {}) {
  const filePath = _directoryPath(entityId, opts);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(directory, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Add or update an archive header in the directory.
 * Matches by `archiveId` — if an entry with the same archiveId exists it is
 * replaced; otherwise the new header is appended.
 *
 * @param {string} entityId
 * @param {string} archiveId   Bucket filename, e.g. 'bucket_physics.ndjson'.
 * @param {Object} header      Header fields (topics, timeRange, entryCount, …).
 * @param {Object} [opts]
 */
// registerArchive()
// WHAT THIS DOES: registerArchive is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call registerArchive(...) where this helper behavior is needed.
function registerArchive(entityId, archiveId, header, opts = {}) {
  const directory = readDirectory(entityId, opts);
  const idx = directory.findIndex(h => h.archiveId === archiveId);
  const entry = { archiveId, ...header };
  if (idx >= 0) {
    directory[idx] = entry;
  } else {
    directory.push(entry);
  }
  writeDirectory(entityId, directory, opts);
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

// Jaccard-style topic overlap score in [0, 1].
// _topicOverlap()
// WHAT THIS DOES: _topicOverlap is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _topicOverlap(...) where this helper behavior is needed.
function _topicOverlap(headerTopics, queryTopics) {
  if (!headerTopics?.length || !queryTopics?.length) return 0;
  const qSet = new Set(queryTopics.map(t => t.toLowerCase()));
  const matches = headerTopics.filter(t => qSet.has(t.toLowerCase())).length;
  return matches / Math.max(headerTopics.length, queryTopics.length);
}

// Returns true if the header's timeRange overlaps the query date range.
// If either range is absent, returns true (no filter applied).
// _rangeOverlaps()
// WHAT THIS DOES: _rangeOverlaps is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _rangeOverlaps(...) where this helper behavior is needed.
function _rangeOverlaps(header, queryRange) {
  if (!queryRange) return true;
  if (!header.timeRange) return true;
  const hStart = header.timeRange.start || '';
  const hEnd   = header.timeRange.end   || '';
  const qStart = queryRange.start || '';
  const qEnd   = queryRange.end   || '';
  // header ends before query starts → no overlap
  if (qStart && hEnd  && hEnd  < qStart) return false;
  // header starts after query ends → no overlap
  if (qEnd   && hStart && hStart > qEnd)  return false;
  return true;
}

/**
 * Scan the archive directory and return headers ranked by topic relevance.
 * Archives with zero topic overlap are excluded.
 * If timeRange is provided, archives whose timeRange does not overlap
 * the query range are excluded.
 *
 * @param {string}   entityId
 * @param {string[]} topics      Query topic strings.
 * @param {Object|null} [timeRange]  Optional { start: ISO, end: ISO } filter.
 * @param {Object}   [opts]
 * @returns {Object[]} Ranked archive headers, highest relevance first.
 *                     The internal `_score` field is stripped before return.
 */
// scanDirectory()
// WHAT THIS DOES: scanDirectory is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call scanDirectory(...) where this helper behavior is needed.
function scanDirectory(entityId, topics, timeRange = null, opts = {}) {
  if (!topics?.length) return [];
  const directory = readDirectory(entityId, opts);
  if (!directory.length) return [];

  const scored = directory
    .filter(h => _rangeOverlaps(h, timeRange))
    .map(h => ({ ...h, _score: _topicOverlap(h.topics, topics) }))
    .filter(h => h._score > 0)
    .sort((a, b) => b._score - a._score);

  // Strip internal score field before returning.
  return scored.map(({ _score, ...h }) => h);
}

module.exports = {
  readDirectory,
  writeDirectory,
  registerArchive,
  scanDirectory,
};
