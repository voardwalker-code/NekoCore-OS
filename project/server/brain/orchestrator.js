// ── Services · Brain Orchestrator Re-export ──────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical brain orchestrator from
// `server/brain/core` so legacy import paths keep working.
//
// WHAT USES THIS:
//   modules importing `server/brain/orchestrator`
//
// EXPORTS:
//   Brain orchestrator module from `./core/orchestrator`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./core/orchestrator');
