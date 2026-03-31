// ── Brain · Phase Archive ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, zlib,
// ../../utils/textrank, ../../utils/archive-index. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: runPromotionPass, isPromotionCandidate, daysDiff.
// ─────────────────────────────────────────────────────────────────────────────

// Phase: Archive Processing
// Converts unprocessed archived conversations into permanent memories.
// Runs every brain loop cycle.
//
// IME I3-1 / I3-3 — Memory lifecycle promotion pass:
// Episodic memories with decay < 0.05, zero access count, and age > 90 days
// are GC-consolidated (TextRank summary) then moved to memories/archive/episodic/.
// Hot index entry removed. archiveIndex.json updated.
// Max 20 promotions per cycle to avoid long blocking passes.

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const { extractTopSentences }  = require('../../utils/textrank');
const { appendArchiveEntry, ensureArchiveDirs } = require('../../utils/archive-index');
const entityPaths = require('../../../entityPaths');

// ── Constants ──────────────────────────────────────────────────────────────────
const PROMOTION_DECAY_THRESHOLD  = 0.05;   // memories with decay below this qualify
const PROMOTION_AGE_DAYS         = 90;     // minimum age in days
const PROMOTION_BATCH            = 20;     // max promotions per cycle
const TEXTRANK_THRESHOLD_CHARS   = 400;    // apply TextRank above this content length

// ── Helpers ────────────────────────────────────────────────────────────────────

// daysDiff()
// WHAT THIS DOES: daysDiff is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call daysDiff(...) where this helper behavior is needed.
function daysDiff(isoString) {
  const created = new Date(isoString);
  if (isNaN(created.getTime())) return 0;
  return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
}
// isPromotionCandidate()
// WHAT THIS DOES: isPromotionCandidate answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call isPromotionCandidate(...) and branch logic based on true/false.
function isPromotionCandidate(meta) {
  const decay       = Number(meta.decay ?? 1.0);
  const accessCount = Number(meta.access_count ?? 0);
  const ageDays     = daysDiff(meta.created);
  return decay < PROMOTION_DECAY_THRESHOLD && accessCount === 0 && ageDays >= PROMOTION_AGE_DAYS;
}

/**
 * GC consolidation: read memory.zip content, apply TextRank to produce a
 * compact abstract, rewrite semantic.txt inside the archive destination.
 *
 * @param {string} srcDir    path to mem_xxx/ in episodic/
 * @param {string} destDir   path to mem_xxx/ in archive/episodic/
 */
// consolidateMemory()
// WHAT THIS DOES: consolidateMemory is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call consolidateMemory(...) where this helper behavior is needed.
function consolidateMemory(srcDir, destDir) {
  // Copy the whole directory first (all files)
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }

  // Apply TextRank to semantic.txt if content is long enough
  const semPath = path.join(destDir, 'semantic.txt');
  if (fs.existsSync(semPath)) {
    const raw = fs.readFileSync(semPath, 'utf8');
    if (raw.length >= TEXTRANK_THRESHOLD_CHARS) {
      const abstract = extractTopSentences(raw, 3);
      if (abstract && abstract.length > 0) {
        fs.writeFileSync(semPath, abstract, 'utf8');
      }
    }
  }
}

// ── Memory lifecycle promotion ─────────────────────────────────────────────────

/**
 * Scan the entity's hot episodic index for promotion candidates.
 * Move qualifying memories to the archive tier.
 *
 * @param {string}         entityId
 * @param {MemoryIndexCache} indexCache  — live indexCache instance with removeMemory()
 * @returns {number}  number of memories promoted
 */
// runPromotionPass()
// WHAT THIS DOES: runPromotionPass is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call runPromotionPass(...) where this helper behavior is needed.
function runPromotionPass(entityId, indexCache) {
  if (!entityId || !indexCache) return 0;

  ensureArchiveDirs(entityId);

  const episodicPath = entityPaths.getEpisodicMemoryPath(entityId);
  const archivePath  = entityPaths.getArchiveEpisodicPath(entityId);

  if (!fs.existsSync(episodicPath)) return 0;

  indexCache.load();
  const candidates = [];

  for (const [memId, meta] of Object.entries(indexCache.memoryIndex || {})) {
    if (isPromotionCandidate(meta)) {
      candidates.push({ memId, meta });
    }
    if (candidates.length >= PROMOTION_BATCH) break;
  }

  let promoted = 0;
  for (const { memId, meta } of candidates) {
    const srcDir  = path.join(episodicPath, memId);
    const destDir = path.join(archivePath, memId);

    // Skip if source doesn't exist on disk (already cleaned up or orphaned)
    if (!fs.existsSync(srcDir)) {
      indexCache.removeMemory(memId);
      continue;
    }

    try {
      // Write to archive first, then remove from hot index (rollback-safe order)
      consolidateMemory(srcDir, destDir);

      appendArchiveEntry(entityId, memId, {
        topics:         meta.topics        || [],
        archivedAt:     new Date().toISOString(),
        type:           meta.type          || 'episodic',
        decayAtArchive: Number(meta.decay ?? 0),
        created:        meta.created       || new Date().toISOString(),
        emotion:        meta.emotion       || 'neutral',
        importance:     Number(meta.importance ?? 0.5),
        docId:          null,
      });

      // Remove source directory from hot episodic store
      fs.rmSync(srcDir, { recursive: true, force: true });

      // Remove from in-memory index cache (will be saved on next cycle save())
      indexCache.removeMemory(memId);

      promoted++;
    } catch (err) {
      console.warn(`  ⚠ Archive promotion failed for ${memId}: ${err.message}`);
      // If archive write succeeded but src removal failed, clean up to avoid ghost
      if (fs.existsSync(destDir) && fs.existsSync(srcDir)) {
        try { fs.rmSync(destDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  }

  if (promoted > 0) {
    indexCache.save();
    console.log(`  📦 Archive promotion: ${promoted} memories moved to archive`);
  }

  return promoted;
}

// ── Main phase ────────────────────────────────────────────────────────────────

async function archivePhase(loop) {
  loop._emit('phase', { name: 'archive', status: 'running' });

  // ── Existing: process unprocessed conversation archives ──
  const archives = loop.getUnprocessedArchives();

  if (archives.length > 0) {
    console.log(`  ✓ Archive phase: processing ${archives.length} archives`);

    for (const archivePath of archives) {
      try {
        const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'));

        let traceId = null;
        if (loop.traceGraph) {
          traceId = loop.traceGraph.createTrace('archive_processing', archivePath);
        }

        const episodic = loop._subconsciousAgent.createEpisodicMemory(archiveData);
        const semantic = loop._subconsciousAgent.createSemanticMemory(archiveData);

        if (loop.neurochemistry) {
          if (episodic) episodic.emotionalTag = loop.neurochemistry.createEmotionalTag();
          if (semantic) semantic.emotionalTag = loop.neurochemistry.createEmotionalTag();
        }

        if (loop.memoryStorage) {
          if (episodic) {
            const memId = await loop.memoryStorage.storeMemory(episodic);
            if (traceId) loop.traceGraph.addStep(archivePath, memId, 'archive_processing');
          }
          if (semantic) await loop.memoryStorage.storeMemory(semantic);
        }

        if (loop._memoryIndex) {
          if (episodic) loop._memoryIndex.addEpisodicMemory(episodic);
          if (semantic) loop._memoryIndex.addSemanticMemory(semantic);
        }

        if (loop._identityManager) loop._identityManager.updateFromArchive(archiveData);

        if (traceId && loop.traceGraph) loop.traceGraph.closeTrace();
        loop.markArchiveProcessed(archivePath);
      } catch (err) {
        console.error(`  ⚠ Error processing archive ${archivePath}:`, err.message);
      }
    }
  }

  // ── IME I3-1: Memory lifecycle promotion pass ──────────
  try {
    const entityId   = loop.currentEntityId || loop.entityId || null;
    const indexCache = loop.memoryStorage?.indexCache || null;
    if (entityId && indexCache) {
      runPromotionPass(entityId, indexCache);
    }
  } catch (err) {
    console.warn('  ⚠ Archive promotion pass error:', err.message);
  }

  loop._emit('phase', { name: 'archive', status: 'done' });
}

module.exports = archivePhase;
module.exports.runPromotionPass    = runPromotionPass;
module.exports.isPromotionCandidate = isPromotionCandidate;
module.exports.daysDiff            = daysDiff;

