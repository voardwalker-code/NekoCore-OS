// ── Module · EntityPaths ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This module belongs to the NekoCore OS codebase and provides focused
// subsystem behavior.
//
// WHAT USES THIS:
// Primary dependencies in this module include: path, fs, crypto. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: ENTITIES_DIR.
// ─────────────────────────────────────────────────────────────────────────────

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
// normalizeEntityId()
// WHAT THIS DOES: normalizeEntityId reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into normalizeEntityId(...) and use the transformed output.
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
// slugifyName()
// WHAT THIS DOES: slugifyName is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call slugifyName(...) where this helper behavior is needed.
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
// buildEntityId()
// WHAT THIS DOES: buildEntityId creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildEntityId(...) before code that depends on this setup.
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
// getEntityRoot()
// WHAT THIS DOES: getEntityRoot reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getEntityRoot(...), then use the returned value in your next step.
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
// getMemoryRoot()
// WHAT THIS DOES: getMemoryRoot reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getMemoryRoot(...), then use the returned value in your next step.
function getMemoryRoot(entityId) {
  return path.join(getEntityRoot(entityId), 'memories');
}

// ── Memory sub-directories ──────────────────────────────────

// getEpisodicMemoryPath()
// WHAT THIS DOES: getEpisodicMemoryPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getEpisodicMemoryPath(...), then use the returned value in your next step.
function getEpisodicMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'episodic');
}
function getSemanticMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'semantic');
}
// getLtmPath()
// WHAT THIS DOES: getLtmPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getLtmPath(...), then use the returned value in your next step.
function getLtmPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'ltm');
}
function getDreamMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'dreams');
}
// getConsciousMemoryPath()
// WHAT THIS DOES: getConsciousMemoryPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getConsciousMemoryPath(...), then use the returned value in your next step.
function getConsciousMemoryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'conscious');
}
function getThinkingLogPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'thinking-logs');
}

// ── Dream sub-directories ───────────────────────────────────

// getDreamEpisodicPath()
// WHAT THIS DOES: getDreamEpisodicPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getDreamEpisodicPath(...), then use the returned value in your next step.
function getDreamEpisodicPath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'episodic');
}
function getDreamSemanticPath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'semantic');
}
// getDreamCorePath()
// WHAT THIS DOES: getDreamCorePath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getDreamCorePath(...), then use the returned value in your next step.
function getDreamCorePath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'core');
}
function getDreamIndexPath(entityId) {
  return path.join(getDreamMemoryPath(entityId), 'index');
}

// ── Entity-root sub-directories ────────────────────────────

// getIndexPath()
// WHAT THIS DOES: getIndexPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getIndexPath(...), then use the returned value in your next step.
function getIndexPath(entityId) {
  return path.join(getEntityRoot(entityId), 'index');
}
function getBeliefsPath(entityId) {
  return path.join(getEntityRoot(entityId), 'beliefs');
}
// getSkillsPath()
// WHAT THIS DOES: getSkillsPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getSkillsPath(...), then use the returned value in your next step.
function getSkillsPath(entityId) {
  return path.join(getEntityRoot(entityId), 'skills');
}
function getQuarantinePath(entityId) {
  return path.join(getEntityRoot(entityId), 'quarantine');
}

// ── Named files ─────────────────────────────────────────────

// getNeurochemistryPath()
// WHAT THIS DOES: getNeurochemistryPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getNeurochemistryPath(...), then use the returned value in your next step.
function getNeurochemistryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'neurochemistry.json');
}
function getLifeDiaryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'life-diary.md');
}
// getDreamDiaryPath()
// WHAT THIS DOES: getDreamDiaryPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getDreamDiaryPath(...), then use the returned value in your next step.
function getDreamDiaryPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'dream-diary.md');
}
function getEntityFile(entityId) {
  return path.join(getEntityRoot(entityId), 'entity.json');
}

// ── Media directories ───────────────────────────────────────

// getPixelArtPath()
// WHAT THIS DOES: getPixelArtPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getPixelArtPath(...), then use the returned value in your next step.
function getPixelArtPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'pixel-art');
}
function getMemoryImagesPath(entityId) {
  return path.join(getMemoryRoot(entityId), 'images');
}

// ── Archive directories (IME I3-0) ─────────────────────────

// getArchiveRoot()
// WHAT THIS DOES: getArchiveRoot reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getArchiveRoot(...), then use the returned value in your next step.
function getArchiveRoot(entityId) {
  return path.join(getMemoryRoot(entityId), 'archive');
}
function getArchiveEpisodicPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'episodic');
}
// getArchiveDocsPath()
// WHAT THIS DOES: getArchiveDocsPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getArchiveDocsPath(...), then use the returned value in your next step.
function getArchiveDocsPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'docs');
}
function getArchiveIndexPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'archiveIndex.json');
}
// getArchiveRouterPath()
// WHAT THIS DOES: getArchiveRouterPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getArchiveRouterPath(...), then use the returned value in your next step.
function getArchiveRouterPath(entityId) {
  return path.join(getArchiveRoot(entityId), 'router.json');
}
function getArchiveBucketPath(entityId, filename) {
  return path.join(getArchiveRoot(entityId), filename);
}
// getArchiveMigrationMarkerPath()
// WHAT THIS DOES: getArchiveMigrationMarkerPath reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getArchiveMigrationMarkerPath(...), then use the returned value in your next step.
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
