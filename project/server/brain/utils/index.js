// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./topic-utils,
// ./model-router, ./entity-manager. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  topicUtils: require('./topic-utils'),
  ModelRouter: require('./model-router'),
  EntityManager: require('./entity-manager'),
};
