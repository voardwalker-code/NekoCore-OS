// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./phase-archive,
// ./phase-archive-index, ./phase-decay, ./phase-goals, ./phase-dreams. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// Brain loop phases — exported as an ordered array of [name, fn] pairs.
// Each phase function receives the BrainLoop instance as its sole argument.
// The thin BrainLoop scheduler iterates these in order with per-phase try/catch.

module.exports = [
  ['archive',          require('./phase-archive')],
  ['archive_index',    require('./phase-archive-index')],
  ['decay',            require('./phase-decay')],
  ['goals',            require('./phase-goals')],
  ['dreams',           require('./phase-dreams')],
  ['traces',           require('./phase-traces')],
  ['identity',         require('./phase-identity')],
  ['beliefs',          require('./phase-beliefs')],
  ['deep_sleep',       require('./phase-deep-sleep')],
  ['neurochemistry',   require('./phase-neurochemistry')],
  ['somatic',          require('./phase-somatic')],
  ['hebbian',          require('./phase-hebbian')],
  ['pruning',          require('./phase-pruning')],
  ['consolidation',    require('./phase-consolidation')],
  ['boredom',          require('./phase-boredom')],
  ['conscious_stm',    require('./phase-conscious-stm')],
];
