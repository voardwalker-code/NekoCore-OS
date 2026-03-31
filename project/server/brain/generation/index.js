// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./chapter-generator,
// ./core-life-generator, ./synthetic-memory-generator, ./aspect-prompts,
// ./pixel-art-engine. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  ChapterGenerator: require('./chapter-generator'),
  CoreLifeGenerator: require('./core-life-generator'),
  SyntheticMemoryGenerator: require('./synthetic-memory-generator'),
  aspectPrompts: require('./aspect-prompts'),
  PixelArtEngine: require('./pixel-art-engine'),
  ContextConsolidator: require('./context-consolidator'),
};
