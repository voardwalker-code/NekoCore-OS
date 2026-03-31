// ── Services · Thought Types Re-export ───────────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical thought-types module from
// `server/brain/bus` so legacy import paths continue to resolve.
//
// WHAT USES THIS:
//   modules importing `server/brain/thought-types`
//
// EXPORTS:
//   Thought types module from `./bus/thought-types`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./bus/thought-types');
