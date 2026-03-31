// ── Client · Index ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This client module drives browser-side behavior and state updates for UI
// features.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * neural-viz/index.js
 *
 * Final assembly: promotes window._NVR (set by renderer.js, patched by
 * data-layer.js) to the public NeuralViz global and removes the temp symbol.
 *
 * Load order: renderer.js → data-layer.js → index.js
 */
const NeuralViz = window._NVR;
delete window._NVR;
