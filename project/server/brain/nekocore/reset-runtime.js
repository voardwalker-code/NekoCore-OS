// ── Brain · Reset Runtime ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../../entityPaths,
// ./bootstrap, ./doc-ingestion. Keep import and call-site contracts aligned
// during refactors.
//
// EXPORTS:
// Exposed API includes: resetNekoCoreRuntime.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');

const entityPaths = require('../../entityPaths');
const { ensureSystemEntity } = require('./bootstrap');
const { ingestArchitectureDocs } = require('./doc-ingestion');
const { seedRoleKnowledge, seedModelRegistry } = require('./model-intelligence');
const { createDefaultPersona, writePersonaFiles } = require('./persona-profile');
// _rmSafe()
// WHAT THIS DOES: _rmSafe is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _rmSafe(...) where this helper behavior is needed.
function _rmSafe(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}
// _purgeDirContents()
// WHAT THIS DOES: _purgeDirContents is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _purgeDirContents(...) where this helper behavior is needed.
function _purgeDirContents(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    return;
  }
  const names = fs.readdirSync(targetDir);
  for (const name of names) {
    _rmSafe(path.join(targetDir, name));
  }
}
// _resetSemanticToSystemDocs()
// WHAT THIS DOES: _resetSemanticToSystemDocs removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call _resetSemanticToSystemDocs(...) when you need a safe teardown/reset path.
function _resetSemanticToSystemDocs(semanticDir) {
  if (!fs.existsSync(semanticDir)) {
    fs.mkdirSync(semanticDir, { recursive: true });
    return;
  }

  for (const name of fs.readdirSync(semanticDir)) {
    const childPath = path.join(semanticDir, name);
    const isDocChunk = name.startsWith('nkdoc_');
    if (!isDocChunk) {
      _rmSafe(childPath);
    }
  }
}
// resetNekoCoreRuntime()
// WHAT THIS DOES: resetNekoCoreRuntime removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call resetNekoCoreRuntime(...) when you need a safe teardown/reset path.
function resetNekoCoreRuntime(options = {}) {
  const docsDir = options.docsDir || path.join(__dirname, '..', '..', '..', '..', 'docs');

  ensureSystemEntity();

  const memoryRoot = entityPaths.getMemoryRoot('nekocore');
  if (!fs.existsSync(memoryRoot)) fs.mkdirSync(memoryRoot, { recursive: true });

  const wipeDirs = [
    'episodic',
    'dreams',
    'archives',
    'goals',
    'ltm',
    'conscious',
    'images',
    'pixel-art',
    'relationships',
    'users',
    'logs'
  ];
  for (const rel of wipeDirs) {
    _purgeDirContents(path.join(memoryRoot, rel));
  }

  _resetSemanticToSystemDocs(path.join(memoryRoot, 'semantic'));

  const filesToDelete = [
    'life-diary.md',
    'dream-diary.md',
    'neurochemistry.json',
    'model-performance.json'
  ];
  for (const rel of filesToDelete) {
    _rmSafe(path.join(memoryRoot, rel));
  }

  const persona = createDefaultPersona();
  writePersonaFiles(memoryRoot, persona);

  seedRoleKnowledge(memoryRoot);
  seedModelRegistry(memoryRoot);

  ingestArchitectureDocs(memoryRoot, docsDir);

  return {
    ok: true,
    memoryRoot,
    preserved: ['nkdoc_* architecture chunks'],
    reset: ['episodic', 'dreams', 'archives', 'goals', 'ltm', 'conscious', 'images', 'pixel-art', 'relationships', 'users', 'logs']
  };
}

module.exports = { resetNekoCoreRuntime };
