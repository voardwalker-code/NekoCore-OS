// ── Services · Entity Memory Compat ──────────────────────────────────────────
//
// HOW MEMORY COMPAT WORKS:
// This module returns directory lists that merge current memory layout with
// legacy paths so scanning and record lookup remain backward compatible.
//
// WHAT USES THIS:
//   entity memory scanners and record resolvers across migration boundaries
//
// EXPORTS:
//   getEntityMemoryScanDirs(), getEntityMemoryRecordDirs()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const path = require('path');
/** Return all memory directories to scan, including legacy compatibility paths. */
function getEntityMemoryScanDirs(memoryRoot, options = {}) {
  const includeDreams = options.includeDreams === true;
  const dirs = [
    { dir: path.join(memoryRoot, 'episodic'), fallbackType: 'episodic' },
    { dir: path.join(memoryRoot, 'semantic'), fallbackType: 'semantic' },
    { dir: path.join(memoryRoot, 'ltm'), fallbackType: 'long_term_memory' },
    { dir: path.join(memoryRoot, 'archive', 'episodic'), fallbackType: 'episodic' },
    { dir: path.join(memoryRoot, 'archive', 'docs'), fallbackType: 'semantic_knowledge' }
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
/** Return candidate record directories for one memory id across all layouts. */
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