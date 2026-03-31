// ── Services · Skills Module Index ───────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This barrel file exposes the primary skills subsystem modules from one import
// point for simpler wiring in orchestrators and runtime setup.
//
// WHAT USES THIS:
//   server brain wiring that imports skill manager/task runner/workspace tools
//
// EXPORTS:
//   SkillManager, TaskRunner, WorkspaceTools
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  SkillManager: require('./skill-manager'),
  TaskRunner: require('./task-runner'),
  WorkspaceTools: require('./workspace-tools'),
};
