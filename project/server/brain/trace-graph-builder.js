// ── Services · Trace Graph Builder Re-export ─────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical trace graph builder module
// from `server/brain/knowledge` to keep older import paths stable.
//
// WHAT USES THIS:
//   modules importing `server/brain/trace-graph-builder`
//
// EXPORTS:
//   Trace graph builder module from `./knowledge/trace-graph-builder`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./knowledge/trace-graph-builder');
