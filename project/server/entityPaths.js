// ============================================================
// REM System — Entity Paths
// Canonical path resolver for all per-entity file/directory
// locations. Every module that needs a path into an entity's
// folder tree should go through here — never build paths ad-hoc.
//
// Entity folder layout (under <project_root>/entities/):
//
//   Entity-<Name>-<shortId>/           (new format)
//   entity_<id>/                        (legacy format — still resolved)
//     entity.json
//     index/              ← memoryIndex / topicIndex / recencyIndex
//     beliefs/            ← belief graph persistence
//     skills/             ← per-entity skills (SKILL.md files)
//     quarantine/         ← quarantined skill proposals
//     memories/
//       persona.json
//       system-prompt.txt
//       neurochemistry.json
//       life-diary.md
//       dream-diary.md
//       episodic/         ← mem_* and ltm_* folders
//       semantic/         ← semantic knowledge folders
//       ltm/              ← long-term memory archives
//       dreams/
//         episodic/
//         semantic/
//         core/
//         index/
//       archives/
//       conscious/
//       images/
//       pixel-art/
//       relationships/
//       goals/
//       logs/
//       users/
// ============================================================

'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Absolute path to the top-level entities/ data directory
// (one level up from server/ → project root → entities/)
const ENTITIES_DIR = path.join(__dirname, '..', 'entities');

// ── Normalisation ───────────────────────────────────────────

/**
 * Strip any leading folder prefix ("Entity-" or legacy "entity_")
 * and whitespace from an entityId so callers can pass either form.
 *
 * @param {*} entityId
 * @returns {string}  canonical id (no prefix), or '' for null/empty
 */
function normalizeEntityId(entityId) {
  if (entityId === null || entityId === undefined) return '';
  let id = String(entityId).trim();
  // New format prefix (strip once)
  if (id.startsWith('Entity-')) {
    id = id.slice('Entity-'.length);
  }
  // Legacy prefix(es)
  while (id.startsWith('entity_')) {
    id = id.slice('entity_'.length);
  }
  return id;
}

/**
 * Create a filesystem-safe slug from an entity name.
 * Preserves original case, replaces non-alphanumeric with hyphens.
 */
function slugifyName(name) {
  return String(name || '').trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

/**
 * Build a human-readable entity ID from a name.
 * Format: <NameSlug>-<shortHex>  e.g. "Luna-a1b2c3"
 */
function buildEntityId(name) {
  const slug = slugifyName(name);
  const shortHex = crypto.randomBytes(3).toString('hex');
  return slug ? `${slug}-${shortHex}` : shortHex;
}

// ── Core helpers ────────────────────────────────────────────

/**
 * Absolute path to the entity root folder.
 * Checks new format (Entity-<id>) first, falls back to legacy (entity_<id>).
 * For new entities, defaults to new format.
 * Throws if entityId normalises to empty.
 */
function getEntityRoot(entityId) {
  const id = normalizeEntityId(entityId);
  if (!id) throw new Error(`Invalid entityId: ${JSON.stringify(entityId)}`);
  const newPath = path.join(module.exports.ENTITIES_DIR, `Entity-${id}`);
  if (fs.existsSync(newPath)) return newPath;
  const legacyPath = path.join(module.exports.ENTITIES_DIR, `entity_${id}`);
  if (fs.existsSync(legacyPath)) return legacyPath;
  return newPath;
}

/**
 * Absolute path to the entity's memories/ directory.
 */
function getMemoryRoot(entityId) {
  return path.join(getEntityRoot(entityId), 'memories');
}

// ── Memory sub-directories ──────────────────────────────────

function getEpisodicMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'episodic');
}

function getSemanticMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'semantic');
}

function getLtmPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'ltm');
}

function getDreamMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'dreams');
}

function getConsciousMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'conscious');
}

function getThinkingLogPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'thinking-logs');
}

// ── Dream sub-directories ───────────────────────────────────

function getDreamEpisodicPath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'episodic');
}

function getDreamSemanticPath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'semantic');
}

function getDreamCorePath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'core');
}

function getDreamIndexPath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'index');
}

// ── Entity-root sub-directories ────────────────────────────

function getIndexPath(entityId) {
  return path.join(getEntityRoot(entityId), 'index');
}

function getBeliefsPath(entityId) {
  return path.join(getEntityRoot(entityId), 'beliefs');
}

function getSkillsPath(entityId) {
  return path.join(getEntityRoot(entityId), 'skills');
}

function getQuarantinePath(entityId) {
  return path.join(getEntityRoot(entityId), 'quarantine');
}

// ── Named files ─────────────────────────────────────────────

function getNeurochemistryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'neurochemistry.json');
}

function getLifeDiaryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'life-diary.md');
}

function getDreamDiaryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'dream-diary.md');
}

function getEntityFile(entityId) {
  return path.join(getEntityRoot(entityId), 'entity.json');
}

// ── Media directories ───────────────────────────────────────

function getPixelArtPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'pixel-art');
}

function getMemoryImagesPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'images');
}

// ── Archive directories (IME I3-0) ─────────────────────────

function getArchiveRoot(entityId) {
  return path.join(getMemoryRoot(entityId), 'archive');
}

function getArchiveEpisodicPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'episodic');
}

function getArchiveDocsPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'docs');
}

function getArchiveIndexPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'archiveIndex.json');
}

function getArchiveRouterPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'router.json');
}

function getArchiveBucketPath(entityId, filename) {
  return path.join(getArchiveRoot(entityId), filename);
}

function getArchiveMigrationMarkerPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'migration_complete.json');
}

function getArchiveIndexDir(entityId) {
  return path.join(getArchiveRoot(entityId), 'indexes');
}

// ── Exports ─────────────────────────────────────────────────

module.exports = {
  ENTITIES_DIR,

  normalizeEntityId,
  slugifyName,
  buildEntityId,

  getEntityRoot,
  getMemoryRoot,

  getEpisodicMemoryPath,
  getSemanticMemoryPath,
  getLtmPath,
  getDreamMemoryPath,
  getConsciousMemoryPath,
  getThinkingLogPath,

  getDreamEpisodicPath,
  getDreamSemanticPath,
  getDreamCorePath,
  getDreamIndexPath,

  getIndexPath,
  getBeliefsPath,
  getSkillsPath,
  getQuarantinePath,

  getNeurochemistryPath,
  getLifeDiaryPath,
  getDreamDiaryPath,
  getEntityFile,

  getPixelArtPath,
  getMemoryImagesPath,

  getArchiveRoot,
  getArchiveEpisodicPath,
  getArchiveDocsPath,
  getArchiveIndexPath,
  getArchiveRouterPath,
  getArchiveBucketPath,
  getArchiveMigrationMarkerPath,
  getArchiveIndexDir,
};
