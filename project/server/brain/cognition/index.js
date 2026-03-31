// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./brain-loop, ./dream-engine,
// ./dream-visualizer, ./boredom-engine, ./curiosity-engine. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  BrainLoop: require('./brain-loop'),
  DreamEngine: require('./dream-engine'),
  DreamVisualizer: require('./dream-visualizer'),
  BoredomEngine: require('./boredom-engine'),
  CuriosityEngine: require('./curiosity-engine'),
  AttentionSystem: require('./attention-system'),
};
