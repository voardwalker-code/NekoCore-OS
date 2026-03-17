'use strict';

const fs = require('fs');
const path = require('path');

const entityPaths = require('../../entityPaths');
const { ensureSystemEntity } = require('./bootstrap');
const { ingestArchitectureDocs } = require('./doc-ingestion');
const { seedRoleKnowledge, seedModelRegistry } = require('./model-intelligence');
const { createDefaultPersona, writePersonaFiles } = require('./persona-profile');

function _rmSafe(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

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

function resetNekoCoreRuntime(options = {}) {
  const docsDir = options.docsDir || path.join(__dirname, '..', '..', '..', '..', 'Documents', 'current');

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
