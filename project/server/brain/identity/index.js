// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./identity-manager,
// ./goals-manager, ./goal-generator, ./hatch-entity, ./core-memory-manager.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  IdentityManager: require('./identity-manager'),
  GoalsManager: require('./goals-manager'),
  GoalGenerator: require('./goal-generator'),
  HatchEntity: require('./hatch-entity'),
  CoreMemoryManager: require('./core-memory-manager'),
};
