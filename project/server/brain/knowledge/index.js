// ── Brain · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./beliefGraph, ./trace-graph,
// ./trace-graph-builder. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  BeliefGraph: require('./beliefGraph'),
  TraceGraph: require('./trace-graph'),
  TraceGraphBuilder: require('./trace-graph-builder'),
};
