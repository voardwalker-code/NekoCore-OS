// ── Brain · Bootstrap ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ./persona-profile,
// ./model-intelligence. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// Exposed API includes: ensureSystemEntity, SYSTEM_ENTITY_ID.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs   = require('fs');
const path = require('path');
const { createDefaultPersona, writePersonaFiles } = require('./persona-profile');

const SYSTEM_ENTITY_ID = 'nekocore';

/**
 * Ensure the NekoCore system entity folder and seed files exist.
 *
 * @param {string} [overrideEntitiesDir]  Override the entities root directory.
 *   Used only in unit tests to point at a temp directory.
 *   Production callers omit this argument.
 * @returns {boolean}  true = created fresh, false = already existed (no-op).
 */
// ensureSystemEntity()
// WHAT THIS DOES: ensureSystemEntity is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureSystemEntity(...) where this helper behavior is needed.
function ensureSystemEntity(overrideEntitiesDir, overrideWorkspaceDesktopDir) {
  // Resolve entities dir: use override (tests) or derive from this file's location
  // server/brain/nekocore/bootstrap.js → ../../../entities
  const entitiesDir = overrideEntitiesDir ||
    path.join(__dirname, '..', '..', '..', 'entities');

  const projectRoot = path.join(__dirname, '..', '..', '..');
  const workspaceRoot = overrideWorkspaceDesktopDir ||
    (overrideEntitiesDir ? null : path.join(projectRoot, 'workspace'));

  const entityDir  = path.join(entitiesDir, `entity_${SYSTEM_ENTITY_ID}`);
  const entityFile = path.join(entityDir, 'entity.json');
  // getSystemWorkspacePath()
  // WHAT THIS DOES: getSystemWorkspacePath reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getSystemWorkspacePath(...), then use the returned value in your next step.
  function getSystemWorkspacePath() {
    return workspaceRoot || '';
  }
  function patchSystemWorkspaceOnExistingEntity() {
    if (!fs.existsSync(entityFile)) return false;
    try {
      const existing = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
      const expectedWorkspace = getSystemWorkspacePath();
      const needsWorkspace = expectedWorkspace && !existing.workspacePath;
      const needsScope = existing.workspaceScope !== 'workspace-root';
      if (!needsWorkspace && !needsScope) return false;

      if (needsWorkspace) existing.workspacePath = expectedWorkspace;
      if (needsScope) existing.workspaceScope = 'workspace-root';
      fs.writeFileSync(entityFile, JSON.stringify(existing, null, 2), 'utf8');
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Idempotency guard ────────────────────────────────────────────────────
  if (fs.existsSync(entityFile)) {
    patchSystemWorkspaceOnExistingEntity();
    console.log('  ✓ NekoCore system entity already present — skipping bootstrap');
    return false;
  }

  console.log('  … NekoCore system entity not found — provisioning…');

  // ── Directory structure ──────────────────────────────────────────────────
  // Mirrors what EntityManager.createEntityFolder() creates for regular entities
  const subdirs = [
    'memories/episodic',
    'memories/dreams',
    'memories/archives',
    'memories/goals',
    'memories/index',
    'beliefs',
  ];
  for (const sub of subdirs) {
    fs.mkdirSync(path.join(entityDir, sub), { recursive: true });
  }

  // ── entity.json ──────────────────────────────────────────────────────────
  const entity = {
    id:                 SYSTEM_ENTITY_ID,
    name:               'NekoCore',
    gender:             'female',
    isSystemEntity:     true,   // blocks delete / visibility toggle / rename
    operationalMemory:  true,   // no TTL eviction (B-2)
    isPublic:           false,
    ownerId:            '__system__',
    personality_traits: ['precise', 'direct', 'warm', 'professional', 'protective', 'methodical'],
    introduction:       'I am NekoCore — the orchestrating intelligence of NekoCore OS. I manage entities, monitor system health, and route governance decisions.',
    emotional_baseline: { curiosity: 0.8, confidence: 0.9, openness: 0.6, stability: 0.95 },
    memory_count:       0,
    core_memories:      [],
    chapters:           [],
    workspacePath:      getSystemWorkspacePath(),
    workspaceScope:     'workspace-root',
    created:            new Date().toISOString(),
  };
  fs.writeFileSync(entityFile, JSON.stringify(entity, null, 2), 'utf8');

  // ── memories/persona.json + system-prompt.txt ────────────────────────────
  const memRoot = path.join(entityDir, 'memories');
  writePersonaFiles(memRoot, createDefaultPersona());

  // ── C-1: Seed model intelligence memory files ─────────────────────────────
  const { seedRoleKnowledge, seedModelRegistry } = require('./model-intelligence');
  seedRoleKnowledge(memRoot);
  seedModelRegistry(memRoot);

  console.log(`  ✓ NekoCore system entity provisioned: entity_${SYSTEM_ENTITY_ID}`);
  return true;
}

module.exports = { ensureSystemEntity, SYSTEM_ENTITY_ID };
