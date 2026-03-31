// ── Services · Memory Storage Re-export ──────────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical memory storage module from
// `server/brain/memory` to keep older import paths stable.
//
// WHAT USES THIS:
//   modules importing `server/brain/memory-storage`
//
// EXPORTS:
//   Memory storage module from `./memory/memory-storage`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./memory/memory-storage');
