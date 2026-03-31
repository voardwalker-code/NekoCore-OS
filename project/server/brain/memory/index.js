// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./memory-storage,
// ./memory-graph, ./memory-graph-builder, ./memory-index,
// ./memory-index-cache. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  MemoryStorage: require('./memory-storage'),
  MemoryGraph: require('./memory-graph'),
  MemoryGraphBuilder: require('./memory-graph-builder'),
  MemoryIndex: require('./memory-index'),
  MemoryIndexCache: require('./memory-index-cache'),
  ArchiveManager: require('./archive-manager'),
  MemoryImages: require('./memory-images'),
};
