// ── Services · Workspace Tools Re-export ─────────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical workspace tools module from
// `server/brain/skills` so older import paths continue to work.
//
// WHAT USES THIS:
//   legacy brain modules importing `server/brain/workspace-tools`
//
// EXPORTS:
//   Workspace tools module from `./skills/workspace-tools`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./skills/workspace-tools');
