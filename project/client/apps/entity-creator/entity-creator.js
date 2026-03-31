// ── Module · Entity Creator ────────────────────────────────────────────────────
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

(function initEntityCreatorPackageRuntime(globalScope) {
  'use strict';

  const doc = globalScope.document;
  if (!doc || !doc.body) {
    return;
  }

  doc.body.setAttribute('data-creator-package', 'entity-creator');
  globalScope.__creatorPackageRuntime = {
    packagePath: 'apps/entity-creator',
    compatibilityPage: 'create.html'
  };
})(window);
