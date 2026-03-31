// ── Services · Task Runner Re-export ─────────────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical task runner module from
// `server/brain/skills` so older import paths remain valid.
//
// WHAT USES THIS:
//   modules importing `server/brain/task-runner`
//
// EXPORTS:
//   Task runner module from `./skills/task-runner`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./skills/task-runner');
