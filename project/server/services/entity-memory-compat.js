'use strict';

const path = require('path');

function getEntityMemoryScanDirs(memoryRoot, options = {}) {
  const includeDreams = options.includeDreams === true;
  const dirs = [
    { dir: path.join(memoryRoot, 'episodic'), fallbackType: 'episodic' },
    { dir: path.join(memoryRoot, 'semantic'), fallbackType: 'semantic' },
    { dir: path.join(memoryRoot, 'ltm'), fallbackType: 'long_term_memory' }
  ];

  if (includeDreams) {
    dirs.push({ dir: path.join(memoryRoot, 'dreams', 'episodic'), fallbackType: 'dream_memory' });
    dirs.push({ dir: path.join(memoryRoot, 'dreams', 'semantic'), fallbackType: 'dream_memory' });
    dirs.push({ dir: path.join(memoryRoot, 'dreams', 'core'), fallbackType: 'dream_memory' });
  }

  // Backward compatibility for legacy entity-scoped Memory2 storage.
  dirs.push({ dir: path.join(memoryRoot, 'Memory2'), fallbackType: 'episodic' });

  return dirs;
}

function getEntityMemoryRecordDirs(memoryRoot, memId, options = {}) {
  return getEntityMemoryScanDirs(memoryRoot, options).map(({ dir, fallbackType }) => ({
    dir: path.join(dir, memId),
    fallbackType
  }));
}

module.exports = {
  getEntityMemoryScanDirs,
  getEntityMemoryRecordDirs
};