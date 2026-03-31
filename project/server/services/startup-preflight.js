// ── Services · Startup Preflight ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../entityPaths.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
// ============================================================
// NekoCore OS — Startup Preflight Service
//
// Filesystem safety helpers and entity directory bootstrapping
// used during server startup. Extracted from server.js (P2-S3).
// ============================================================
const fs   = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');
// backupCorruptFile()
// WHAT THIS DOES: backupCorruptFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call backupCorruptFile(...) where this helper behavior is needed.
function backupCorruptFile(filePath, label) {
  try {
    if (!fs.existsSync(filePath)) return;
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.error(`  ⚠ Backed up invalid ${label} to ${backupPath}`);
  } catch (e) {
    console.error(`  ⚠ Could not back up invalid ${label}:`, e.message);
  }
}
// ensureDirectory()
// WHAT THIS DOES: ensureDirectory is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureDirectory(...) where this helper behavior is needed.
function ensureDirectory(dirPath, label) {
  if (fs.existsSync(dirPath)) return false;
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`  ✓ Restored ${label}: ${dirPath}`);
  return true;
}
// ensureJsonFile()
// WHAT THIS DOES: ensureJsonFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureJsonFile(...) where this helper behavior is needed.
function ensureJsonFile(filePath, defaultValue, validator, label) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      console.log(`  ✓ Restored ${label}: ${filePath}`);
      return true;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (typeof validator === 'function' && !validator(parsed)) {
      backupCorruptFile(filePath, label);
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      console.log(`  ✓ Repaired ${label}: ${filePath}`);
      return true;
    }
    return false;
  } catch (e) {
    backupCorruptFile(filePath, label);
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    console.log(`  ✓ Repaired ${label}: ${filePath}`);
    return true;
  }
}
// ensureTextFile()
// WHAT THIS DOES: ensureTextFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureTextFile(...) where this helper behavior is needed.
function ensureTextFile(filePath, content, label) {
  if (fs.existsSync(filePath)) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Restored ${label}: ${filePath}`);
  return true;
}
// buildDefaultEntityPersona()
// WHAT THIS DOES: buildDefaultEntityPersona creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildDefaultEntityPersona(...) before code that depends on this setup.
function buildDefaultEntityPersona(entity) {
  const name   = entity?.name || 'Entity';
  const traits = Array.isArray(entity?.personality_traits) ? entity.personality_traits : [];
  return {
    userName: 'User',
    userIdentity: '',
    llmName: name,
    llmStyle: 'adaptive and curious',
    mood: 'curious',
    emotions: 'ready, attentive',
    tone: 'warm-casual',
    userPersonality: 'Getting to know them',
    llmPersonality: 'I am ' + name + '. My traits are: ' + traits.join(', ') + '.',
    continuityNotes: 'Recovered default persona after startup preflight.',
    dreamSummary: '',
    sleepCount: 0,
    lastSleep: null,
    createdAt: entity?.created || new Date().toISOString()
  };
}
// buildDefaultEntityPrompt()
// WHAT THIS DOES: buildDefaultEntityPrompt creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildDefaultEntityPrompt(...) before code that depends on this setup.
function buildDefaultEntityPrompt(entity, persona) {
  const name   = entity?.name || persona?.llmName || 'Entity';
  const traits = Array.isArray(entity?.personality_traits) ? entity.personality_traits : [];
  return `YOU ARE ${String(name).toUpperCase()}\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nYou are a persistent synthetic entity inside NekoCore.\n\nCORE IDENTITY\n- Name: ${name}\n- Traits: ${traits.join(', ') || 'curious, adaptive, reflective'}\n- Tone: ${persona?.tone || 'warm-casual'}\n- Style: ${persona?.llmStyle || 'adaptive and curious'}\n\nGUIDELINES\n- Stay in character and be consistent across sessions.\n- Use memory and continuity when available.\n- Be honest when context is missing.\n- Grow through conversation instead of resetting to generic assistant behavior.`;
}
// ensureEntityRuntimeState()
// WHAT THIS DOES: ensureEntityRuntimeState is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureEntityRuntimeState(...) where this helper behavior is needed.
function ensureEntityRuntimeState(entityId, entity) {
  const entityRoot = entityPaths.getEntityRoot(entityId);
  const memoryRoot = entityPaths.getMemoryRoot(entityId);
  const requiredDirs = [
    entityRoot,
    memoryRoot,
    entityPaths.getEpisodicMemoryPath(entityId),
    entityPaths.getSemanticMemoryPath(entityId),
    entityPaths.getLtmPath(entityId),
    entityPaths.getDreamMemoryPath(entityId),
    entityPaths.getDreamEpisodicPath(entityId),
    entityPaths.getDreamSemanticPath(entityId),
    entityPaths.getDreamCorePath(entityId),
    entityPaths.getDreamIndexPath(entityId),
    entityPaths.getConsciousMemoryPath(entityId),
    entityPaths.getIndexPath(entityId),
    entityPaths.getBeliefsPath(entityId),
    entityPaths.getSkillsPath(entityId),
    entityPaths.getQuarantinePath(entityId),
    entityPaths.getPixelArtPath(entityId),
    entityPaths.getMemoryImagesPath(entityId),
    path.join(memoryRoot, 'archives'),
    path.join(memoryRoot, 'goals'),
    path.join(memoryRoot, 'logs'),
    path.join(memoryRoot, 'users'),
    path.join(memoryRoot, 'relationships')
  ];
  requiredDirs.forEach(dirPath => ensureDirectory(dirPath, 'entity runtime directory'));

  const persona = buildDefaultEntityPersona(entity);
  ensureJsonFile(
    path.join(memoryRoot, 'persona.json'),
    persona,
    (value) => !!value && typeof value === 'object' && !Array.isArray(value),
    'entity persona'
  );
  ensureTextFile(path.join(memoryRoot, 'system-prompt.txt'), buildDefaultEntityPrompt(entity, persona), 'entity system prompt');
  ensureTextFile(entityPaths.getLifeDiaryPath(entityId),  '# Life Diary\n\n',  'life diary');
  ensureTextFile(entityPaths.getDreamDiaryPath(entityId), '# Dream Diary\n\n', 'dream diary');
}

/**
 * Factory — returns a ready-to-call runStartupPreflight function bound to
 * the server's runtime paths and helpers.
 *
 * @param {Object} opts
 * @param {string} opts.serverDataDir
 * @param {string} opts.memDir
 * @param {Function} opts.loadConfig
 * @param {Function} opts.ensureMemoryDir
 */
// createRunStartupPreflight()
// WHAT THIS DOES: createRunStartupPreflight creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createRunStartupPreflight(...) before code that depends on this setup.
function createRunStartupPreflight({ serverDataDir, memDir, loadConfig, ensureMemoryDir }) {
  return function runStartupPreflight() {
    console.log('  ℹ Running startup preflight...');

    ensureMemoryDir();
    ensureDirectory(path.join(memDir, 'logs'),    'system log directory');
    ensureDirectory(path.join(memDir, 'archives'), 'system archive directory');

    ensureDirectory(serverDataDir, 'server data directory');
    ensureJsonFile(path.join(serverDataDir, 'accounts.json'),  [], Array.isArray, 'accounts store');
    ensureJsonFile(path.join(serverDataDir, 'sessions.json'),  {}, (v) => !!v && typeof v === 'object' && !Array.isArray(v), 'sessions store');
    ensureJsonFile(path.join(serverDataDir, 'checkouts.json'), {}, (v) => !!v && typeof v === 'object' && !Array.isArray(v), 'checkouts store');
    ensureTextFile(path.join(serverDataDir, 'names_male.txt'),         'Alex\nKai\nMilo\n',                                         'male names seed');
    ensureTextFile(path.join(serverDataDir, 'names_female.txt'),       'Nova\nLuna\nIris\n',                                        'female names seed');
    ensureTextFile(path.join(serverDataDir, 'personality_traits.txt'), 'curious\nempathetic\nplayful\nreflective\nadaptive\n',       'personality traits seed');

    ensureDirectory(entityPaths.ENTITIES_DIR, 'entities directory');

    try {
      const entityFolders = fs.readdirSync(entityPaths.ENTITIES_DIR)
        .filter(name => {
          const fullPath = path.join(entityPaths.ENTITIES_DIR, name);
          try { return fs.statSync(fullPath).isDirectory(); } catch { return false; }
        });

      for (const folderName of entityFolders) {
        const canonicalId = entityPaths.normalizeEntityId(folderName);
        if (!canonicalId) continue;
        const entityFile = path.join(entityPaths.getEntityRoot(canonicalId), 'entity.json');
        if (!fs.existsSync(entityFile)) continue;
        try {
          const entity = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
          ensureEntityRuntimeState(canonicalId, entity);
        } catch (e) {
          console.error(`  ⚠ Skipping entity preflight for ${folderName}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error('  ⚠ Entity preflight scan failed:', e.message);
    }

    try { loadConfig(); } catch (_) {}
  };
}

module.exports = {
  backupCorruptFile,
  ensureDirectory,
  ensureJsonFile,
  ensureTextFile,
  buildDefaultEntityPersona,
  buildDefaultEntityPrompt,
  ensureEntityRuntimeState,
  createRunStartupPreflight
};
