// ── Services · Somatic Awareness Re-export ───────────────────────────────────
//
// HOW THIS SHIM WORKS:
// This compatibility file re-exports the canonical somatic-awareness module
// from `server/brain/affect` to preserve legacy import paths.
//
// WHAT USES THIS:
//   modules importing `server/brain/somatic-awareness`
//
// EXPORTS:
//   Somatic awareness module from `./affect/somatic-awareness`
// ─────────────────────────────────────────────────────────────────────────────

﻿module.exports = require('./affect/somatic-awareness');
