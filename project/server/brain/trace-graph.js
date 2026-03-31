// ── Services · Trace Graph Re-export ─────────────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical trace graph implementation
// from `server/brain/knowledge` for stable legacy import paths.
//
// WHAT USES THIS:
//   modules importing `server/brain/trace-graph`
//
// EXPORTS:
//   Trace graph module from `./knowledge/trace-graph`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./knowledge/trace-graph');
