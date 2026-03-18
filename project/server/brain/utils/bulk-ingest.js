'use strict';
// ============================================================
// bulk-ingest.js — Phase 4.6 S4.5
//
// Streams a text corpus into the sharded archive for an entity.
// Designed for large inputs (Wikipedia extracts, Gutenberg texts)
// via a maxChunks-controlled batch loop:
//
//   let done = false;
//   while (!done) {
//     ({ done } = await ingestCorpus(entityId, filePath, { docId, maxChunks: 5000 }));
//   }
//
// Content-hash dedup: re-ingesting the same file produces 0 new entries.
// Progress resume: subsequent calls pick up from where the previous left off.
// ============================================================

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { extractPhrases }     = require('./rake');
const { appendArchiveEntry } = require('./archive-index');
const { listBuckets }        = require('./archive-router');
const {
  getArchiveRoot,
  getArchiveBucketPath,
  getArchiveDocsPath,
} = require('../../entityPaths');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Split a long paragraph on sentence boundaries without exceeding maxLen.
 * Falls back to word-boundary splits for sentences that exceed maxLen.
 *
 * @param {string} text
 * @param {number} maxLen
 * @returns {string[]}
 */
function _splitOnSentences(text, maxLen) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      // Single sentence exceeds maxLen — split on word boundaries
      if (current) { chunks.push(current); current = ''; }
      for (const word of sentence.split(/\s+/)) {
        if (!current) {
          current = word;
        } else if (current.length + 1 + word.length <= maxLen) {
          current += ' ' + word;
        } else {
          chunks.push(current);
          current = word;
        }
      }
    } else if (!current) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= maxLen) {
      current += ' ' + sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(c => c.trim());
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Chunk a string into paragraphs of ~chunkSize chars, never splitting mid-word.
 *
 * Algorithm:
 *   1. Split on blank lines (paragraph boundaries)
 *   2. Accumulate paragraphs until next would exceed chunkSize
 *   3. Paragraphs longer than chunkSize are split on sentence boundaries
 *   4. Sentences longer than chunkSize are split on word boundaries
 *
 * @param {string} text
 * @param {number} [chunkSize=600]
 * @returns {string[]}
 */
function chunkText(text, chunkSize = 600) {
  if (!text || !text.trim()) return [];

  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const sub = para.length > chunkSize ? _splitOnSentences(para, chunkSize) : [para];

    for (const s of sub) {
      if (!current) {
        current = s;
      } else if (current.length + 1 + s.length <= chunkSize) {
        current += '\n' + s;
      } else {
        chunks.push(current);
        current = s;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Compute a short SHA-256 content-hash for dedup purposes.
 *
 * @param {string} text
 * @returns {string}  16-char hex string
 */
function chunkHash(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Build a Set of chunkHash values already ingested for a given docId
 * by scanning all registered bucket files.
 *
 * @param {string} entityId
 * @param {string} docId
 * @returns {Set<string>}
 */
function _loadIngestedHashes(entityId, docId) {
  const seen = new Set();
  let buckets;
  try { buckets = listBuckets(entityId); } catch { return seen; }

  for (const filename of buckets) {
    const bucketPath = getArchiveBucketPath(entityId, filename);
    if (!fs.existsSync(bucketPath)) continue;
    try {
      for (const line of fs.readFileSync(bucketPath, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (!obj.stub && obj.docId === docId && obj.chunkHash) seen.add(obj.chunkHash);
        } catch { /* skip malformed */ }
      }
    } catch { /* skip unreadable */ }
  }
  return seen;
}

/**
 * Read (or initialize) the progress marker for a docId.
 *
 * @param {string} entityId
 * @param {string} docId
 * @returns {{ lastChunk: number, total: number, startedAt: string, updatedAt: string } | null}
 */
function _readProgress(entityId, docId) {
  const markerPath = path.join(getArchiveRoot(entityId), `ingest_progress_${_safeId(docId)}.json`);
  if (!fs.existsSync(markerPath)) return null;
  try { return JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch { return null; }
}

/**
 * Write (or update) the progress marker.
 */
function _writeProgress(entityId, docId, { lastChunk, total, startedAt }) {
  const markerPath = path.join(getArchiveRoot(entityId), `ingest_progress_${_safeId(docId)}.json`);
  fs.writeFileSync(
    markerPath,
    JSON.stringify({ docId, lastChunk, total, startedAt, updatedAt: new Date().toISOString() }),
    'utf8'
  );
}

/**
 * Delete the progress marker (ingest complete).
 */
function _clearProgress(entityId, docId) {
  const markerPath = path.join(getArchiveRoot(entityId), `ingest_progress_${_safeId(docId)}.json`);
  try { fs.unlinkSync(markerPath); } catch { /* already gone */ }
}

/**
 * Sanitize a docId to a filesystem-safe identifier.
 */
function _safeId(docId) {
  return String(docId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Stream a corpus file into the sharded archive for an entity.
 *
 * Supports plain text (.txt) and Markdown (.md).
 * Call repeatedly (with the same arguments) until `done: true`.
 * Progress is tracked in a marker file; each call resumes from where the last left off.
 *
 * @param {string} entityId
 * @param {string} filePath        - Absolute path to the corpus file
 * @param {{
 *   chunkSize?:  number,    - Target chars per chunk (default 600)
 *   maxChunks?:  number,    - Max new entries per call (null = no cap)
 *   resumeFrom?: number,    - Override chunk index to start from (else read from marker)
 *   docId?:      string,    - Source document identifier (default: basename)
 *   type?:       string,    - 'doc' | 'semantic_knowledge' (default 'doc')
 * }} [options]
 * @returns {{ ingested: number, skipped: number, total: number, resumeAt: number, done: boolean }}
 */
async function ingestCorpus(entityId, filePath, options = {}) {
  const {
    chunkSize  = 600,
    maxChunks  = null,
    type       = 'doc',
  } = options;

  const docId      = options.docId || path.basename(filePath, path.extname(filePath));
  const startedAt  = new Date().toISOString();

  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  const allChunks = chunkText(content, chunkSize);
  const total = allChunks.length;

  // Determine where to resume
  const marker     = _readProgress(entityId, docId);
  const resumeFrom = options.resumeFrom !== undefined
    ? options.resumeFrom
    : (marker ? marker.lastChunk : 0);

  // Build dedup set from already-written entries
  const ingestedHashes = _loadIngestedHashes(entityId, docId);

  let ingested    = 0;
  let skipped     = 0;
  let lastChunk   = resumeFrom;
  const batchEnd  = maxChunks !== null ? Math.min(resumeFrom + maxChunks, total) : total;

  for (let i = resumeFrom; i < batchEnd; i++) {
    const chunk = allChunks[i];
    const hash  = chunkHash(chunk);

    if (ingestedHashes.has(hash)) {
      skipped++;
      lastChunk = i + 1;
      continue;
    }

    const topics = extractPhrases(chunk, 6);
    // Include the docId as an explicit topic so users can search by document name
    const safeDocTopic = docId.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (safeDocTopic && !topics.includes(safeDocTopic)) topics.unshift(safeDocTopic);
    const memId  = `ingest_${_safeId(docId)}_${String(i).padStart(8, '0')}`;

    appendArchiveEntry(entityId, memId, {
      topics,
      type,
      docId,
      chunkHash: hash,
      created:    startedAt,
      archivedAt: startedAt,
      emotion:    'neutral',
      importance: 0.4,
    });

    // Write semantic.txt so search results return the chunk content as a summary
    try {
      const chunkDir = path.join(getArchiveDocsPath(entityId), memId);
      if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });
      fs.writeFileSync(path.join(chunkDir, 'semantic.txt'), chunk, 'utf8');
    } catch (_) {}

    ingestedHashes.add(hash);
    ingested++;
    lastChunk = i + 1;

    // Update progress marker every 100 chunks
    if (ingested % 100 === 0) {
      _writeProgress(entityId, docId, { lastChunk, total, startedAt: marker?.startedAt || startedAt });
    }
  }

  const done = lastChunk >= total;
  if (done) {
    _clearProgress(entityId, docId);
  } else {
    _writeProgress(entityId, docId, { lastChunk, total, startedAt: marker?.startedAt || startedAt });
  }

  return { ingested, skipped, total, resumeAt: lastChunk, done };
}

module.exports = {
  chunkText,
  chunkHash,
  ingestCorpus,
};
