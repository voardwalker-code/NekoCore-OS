// ── Services · Affect Module Index ───────────────────────────────────────────
//
// HOW AFFECT MODULE EXPORTS WORK:
// This file is a tiny index that re-exports affect-related subsystem classes so
// callers can import one path for chemistry + somatic awareness utilities.
//
// WHAT USES THIS:
//   brain bootstrap/composition wiring
//
// EXPORTS:
//   Neurochemistry, SomaticAwareness
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  Neurochemistry: require('./neurochemistry'),
  SomaticAwareness: require('./somatic-awareness'),
};
