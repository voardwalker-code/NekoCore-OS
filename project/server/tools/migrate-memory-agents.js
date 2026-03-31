// ── Tools · Migrate Memory Agents ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This module belongs to the NekoCore OS codebase and provides focused
// subsystem behavior.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../entityPaths,
// ../contracts/memory-schema, ../brain/memory/shape-classifier. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: main, migrateEntity, scanMemories, buildMiniIndex.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/tools/migrate-memory-agents.js
 * Slice 11 — Legacy Memory Migration
 *
 * CLI tool to backfill v1 memories with v2 fields:
 *   - Shape classification via heuristic classifier
 *   - Edge seeding from topic co-occurrence
 *   - creationContext defaults to null (cannot reconstruct)
 *   - activationLevel / lastActivationContext defaults
 *
 * Usage:
 *   node server/tools/migrate-memory-agents.js --dry-run          (report only)
 *   node server/tools/migrate-memory-agents.js --apply            (write changes)
 *   node server/tools/migrate-memory-agents.js --apply --entity myentity
 *
 * Idempotent: already-v2 memories are skipped.
 */

const fs = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');
const { MEMORY_SCHEMA_VERSION, normalizeMemoryRecord } = require('../contracts/memory-schema');
const { classifyShape } = require('../brain/memory/shape-classifier');
const { seedEdges } = require('../brain/memory/edge-builder');
const { normalizeTopics } = require('../brain/utils/topic-utils');

// ── Arg parsing ─────────────────────────────────────────────

// parseArgs()
// WHAT THIS DOES: parseArgs reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into parseArgs(...) and use the transformed output.
function parseArgs(argv) {
  const args = { entity: null, apply: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--entity' && argv[i + 1]) {
      args.entity = argv[i + 1];
      i++;
    } else if (token === '--apply') {
      args.apply = true;
    } else if (token === '--dry-run') {
      args.dryRun = true;
    }
  }
  // Default to dry-run when neither flag is set
  if (!args.apply) args.dryRun = true;
  return args;
}

// ── Helpers ─────────────────────────────────────────────────

// listEntityIds()
// WHAT THIS DOES: listEntityIds is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call listEntityIds(...) where this helper behavior is needed.
function listEntityIds(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir)
    .filter(name => name.startsWith('entity_'))
    .filter(name => {
      try { return fs.statSync(path.join(baseDir, name)).isDirectory(); } catch { return false; }
    })
    .map(name => name.replace(/^entity_/, ''));
}
// safeReadJson()
// WHAT THIS DOES: safeReadJson is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call safeReadJson(...) where this helper behavior is needed.
function safeReadJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}
function safeReadText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

/**
 * Scan an entity's episodic + semantic directories, return all memory entries.
 */
// scanMemories()
// WHAT THIS DOES: scanMemories is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call scanMemories(...) where this helper behavior is needed.
function scanMemories(entityId) {
  const entries = [];
  const dirs = [
    { base: entityPaths.getEpisodicMemoryPath(entityId), type: 'episodic' },
    { base: entityPaths.getSemanticMemoryPath(entityId), type: 'semantic' }
  ];
  for (const { base, type } of dirs) {
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      const memDir = path.join(base, name);
      try {
        if (!fs.statSync(memDir).isDirectory()) continue;
      } catch { continue; }
      const logPath = path.join(memDir, 'log.json');
      const semPath = path.join(memDir, 'semantic.txt');
      if (!fs.existsSync(logPath)) continue;
      entries.push({ memId: name, logPath, semPath, type });
    }
  }
  return entries;
}

/**
 * Build a minimal in-memory index from scanned memories for edge seeding.
 * Returns an object that duck-types enough of MemoryIndexCache for seedEdges().
 */
// buildMiniIndex()
// WHAT THIS DOES: buildMiniIndex creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildMiniIndex(...) before code that depends on this setup.
function buildMiniIndex(memoryMetas) {
  const memoryIndex = {};
  const recency = [];
  for (const m of memoryMetas) {
    // Normalize topics the same way MemoryIndexCache does, so seedEdges comparisons work
    const entry = { ...m.meta, topics: normalizeTopics(m.meta.topics || []) };
    memoryIndex[m.memId] = entry;
    recency.push({ memId: m.memId, lastAccessed: m.meta.last_accessed || m.meta.created, created: m.meta.created });
  }
  recency.sort((a, b) => (b.lastAccessed || '').localeCompare(a.lastAccessed || ''));

  return {
    getRecentMemories(limit) { return recency.slice(0, limit); },
    getMemoryMeta(id) { return memoryIndex[id] || null; },
    getAllMemoryIds() { return Object.keys(memoryIndex); }
  };
}

/**
 * Migrate a single entity's memories.
 */
// migrateEntity()
// WHAT THIS DOES: migrateEntity is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call migrateEntity(...) where this helper behavior is needed.
function migrateEntity(entityId, apply) {
  const stats = {
    scanned: 0,
    skipped: 0,
    migrated: 0,
    shapeCounts: {},
    edgesCreated: 0
  };

  const entries = scanMemories(entityId);
  stats.scanned = entries.length;
  if (entries.length === 0) return stats;

  // Phase 1: Read all logs and classify shapes
  const memoryMetas = [];
  for (const entry of entries) {
    const log = safeReadJson(entry.logPath);
    if (!log) { stats.skipped++; continue; }

    // Already v2? Skip.
    if (log.memorySchemaVersion >= 2 && log.shape && log.shape !== 'unclassified') {
      stats.skipped++;
      memoryMetas.push({ memId: entry.memId, meta: log, needsMigration: false, entry });
      continue;
    }

    // Classify shape from existing data
    const semantic = safeReadText(entry.semPath);
    const shape = classifyShape({
      semantic,
      emotion: log.emotionalTag || log.emotion || null,
      topics: log.topics || [],
      importance: log.importance,
      type: log.type
    });

    // Normalize to v2
    const normalized = normalizeMemoryRecord(log);
    normalized.shape = shape;
    // Preserve userId/userName for edge seeding (not in v2 schema but needed for temporal_adjacent)
    if (log.userId) normalized.userId = log.userId;
    if (log.userName) normalized.userName = log.userName;
    // creationContext stays null (cannot reconstruct)
    // activationLevel stays 0.0
    // edges will be seeded in phase 2

    stats.shapeCounts[shape] = (stats.shapeCounts[shape] || 0) + 1;
    memoryMetas.push({ memId: entry.memId, meta: normalized, needsMigration: true, entry });
  }

  // Phase 2: Seed edges for memories that need migration
  const miniIndex = buildMiniIndex(memoryMetas);
  for (const m of memoryMetas) {
    if (!m.needsMigration) continue;

    // Only seed edges if the memory doesn't have them yet
    if (!m.meta.edges || m.meta.edges.length === 0) {
      try {
        const result = seedEdges(m.memId, m.meta, miniIndex);
        m.meta.edges = result.edges;
        stats.edgesCreated += result.edges.length;
      } catch {
        m.meta.edges = [];
      }
    }
  }

  // Phase 3: Write updated logs
  for (const m of memoryMetas) {
    if (!m.needsMigration) continue;
    if (apply) {
      try {
        fs.writeFileSync(m.entry.logPath, JSON.stringify(m.meta, null, 2), 'utf8');
      } catch (e) {
        console.warn(`  ⚠ Failed to write ${m.entry.logPath}: ${e.message}`);
        continue;
      }
    }
    stats.migrated++;
  }

  return stats;
}

// ── Main ────────────────────────────────────────────────────

// main()
// WHAT THIS DOES: main is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call main(...) where this helper behavior is needed.
function main(argv) {
  const args = parseArgs(argv || process.argv);
  const mode = args.apply ? 'APPLY' : 'DRY-RUN';
  const startTime = Date.now();

  console.log(`\n🔄 Memory Agent Migration (v1 → v2) — mode: ${mode}\n`);

  const baseDir = entityPaths.ENTITIES_DIR;
  const entityIds = args.entity ? [args.entity] : listEntityIds(baseDir);

  if (entityIds.length === 0) {
    console.log('  No entities found. Nothing to migrate.');
    return { totalScanned: 0, totalMigrated: 0, totalSkipped: 0, totalEdges: 0, shapeCounts: {} };
  }

  let totalScanned = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalEdges = 0;
  const allShapeCounts = {};

  for (const entityId of entityIds) {
    console.log(`  📦 Entity: ${entityId}`);
    const stats = migrateEntity(entityId, args.apply);
    totalScanned += stats.scanned;
    totalMigrated += stats.migrated;
    totalSkipped += stats.skipped;
    totalEdges += stats.edgesCreated;
    for (const [shape, count] of Object.entries(stats.shapeCounts)) {
      allShapeCounts[shape] = (allShapeCounts[shape] || 0) + count;
    }
    console.log(`     Scanned: ${stats.scanned}, Migrated: ${stats.migrated}, Skipped: ${stats.skipped}, Edges: ${stats.edgesCreated}`);
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n  ✓ Migration complete in ${elapsed}ms`);
  console.log(`    Total scanned: ${totalScanned}`);
  console.log(`    Total migrated: ${totalMigrated}`);
  console.log(`    Total skipped: ${totalSkipped}`);
  console.log(`    Total edges created: ${totalEdges}`);
  if (Object.keys(allShapeCounts).length > 0) {
    console.log(`    Shapes: ${JSON.stringify(allShapeCounts)}`);
  }
  if (!args.apply) {
    console.log(`\n  ℹ Dry-run mode — no files were modified. Use --apply to write changes.\n`);
  }

  return { totalScanned, totalMigrated, totalSkipped, totalEdges, shapeCounts: allShapeCounts };
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, migrateEntity, scanMemories, buildMiniIndex };
