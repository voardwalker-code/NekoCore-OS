// ── Services · BeliefGraph Re-export ─────────────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical belief graph implementation
// from `server/brain/knowledge` so older import paths keep working.
//
// WHAT USES THIS:
//   legacy modules importing `server/beliefs/beliefGraph`
//
// EXPORTS:
//   BeliefGraph module from `../brain/knowledge/beliefGraph`
// ─────────────────────────────────────────────────────────────────────────────

module.exports = require('../brain/knowledge/beliefGraph');
