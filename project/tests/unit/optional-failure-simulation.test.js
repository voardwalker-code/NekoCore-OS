// ── Tests · Optional Failure Simulation.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:fs, node:path. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ============================================================
// D1-1 — Optional Failure Simulation Runbook
//
// Verifies that shell-core caller files do not hard-call any
// optional module entrypoint without a typeof guard. This is
// the static-analysis evidence that optional modules can be
// safely absent — i.e., if an optional module file is removed
// from the load order, the shell will not throw on boot or
// primary tab activation.
//
// One test per optional module, documenting:
//   • Expected caller file(s)
//   • The guarded call pattern that must be present
//   • The unguarded call pattern that must be absent
//
// Simulation result key:
//   PASS — module can be absent; all callers are typeof-guarded
//   FAIL — at least one unguarded call would throw at runtime
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const JS   = path.join(ROOT, 'client', 'js');
// read()
// WHAT THIS DOES: read reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call read(...), then use the returned value in your next step.
function read(rel) { return fs.readFileSync(path.join(JS, rel), 'utf8'); }

const WINDOW_MANAGER = read('window-manager.js');
const BOOT           = read('boot.js');
const DESKTOP        = read('desktop.js');
const APP            = read('app.js');

// ── Helper ───────────────────────────────────────────────────

// assertGuarded()
// WHAT THIS DOES: assertGuarded is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call assertGuarded(...) where this helper behavior is needed.
function assertGuarded(src, funcName, callerLabel) {
  // Any call to funcName in this file must be preceded by typeof funcName === 'function'
  const guardPattern  = `typeof ${funcName} === 'function'`;
  const directPattern = new RegExp(`(?<!typeof\\s)\\b${funcName}\\s*\\(`);

  // If the function is called at all, verify at least one typeof guard exists
  if (directPattern.test(src)) {
    assert.ok(
      src.includes(guardPattern),
      `[SIMULATION FAIL] "${callerLabel}" calls ${funcName}() without typeof guard — optional module would cause runtime error if absent`
    );
  }
  // Pass silently if the function name doesn't appear (caller doesn't use it)
}

// assertNeverCalledUnguarded()
// WHAT THIS DOES: assertNeverCalledUnguarded is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call assertNeverCalledUnguarded(...) where this helper behavior is needed.
function assertNeverCalledUnguarded(src, funcName, callerLabel) {
  // For each call-site line, verify it is either:
  //   (a) guarded inline:  if (typeof funcName === 'function') funcName();
  //   (b) inside a typeof-guarded block on a preceding line (within 3 lines)
  const rawCallPattern = new RegExp(`\\b${escapeRegex(funcName)}\\s*\\(`);
  const guardPattern   = `typeof ${funcName}`;
  const lines = src.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!rawCallPattern.test(line))  continue; // no call on this line
    if (line.includes('typeof'))     continue; // inline guard — safe

    // Check whether a typeof guard for this function appears in the preceding 3 lines
    let hasGuard = false;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (lines[j].includes(guardPattern)) { hasGuard = true; break; }
    }

    assert.ok(
      hasGuard,
      `[SIMULATION FAIL] "${callerLabel}" contains unguarded call to ${funcName}() ` +
      `on line ${i + 1}: "${line.trim()}"`
    );
  }
}
// escapeRegex()
// WHAT THIS DOES: escapeRegex is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call escapeRegex(...) where this helper behavior is needed.
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Module: diary.js — loadLifeDiary, loadDreamDiary ─────────
// Caller: window-manager.js (openWindow tab activation)

test('[SIMULATION PASS] diary.js: loadLifeDiary guarded in window-manager.js', () => {
  assert.ok(
    WINDOW_MANAGER.includes("typeof loadLifeDiary === 'function'"),
    'window-manager.js must guard loadLifeDiary with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'loadLifeDiary', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'loadLifeDiary', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'loadLifeDiary', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'loadLifeDiary', 'app.js');
});

test('[SIMULATION PASS] diary.js: loadDreamDiary guarded in window-manager.js', () => {
  assert.ok(
    WINDOW_MANAGER.includes("typeof loadDreamDiary === 'function'"),
    'window-manager.js must guard loadDreamDiary with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'loadDreamDiary', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'loadDreamDiary', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'loadDreamDiary', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'loadDreamDiary', 'app.js');
});

// ── Module: theme-manager.js — applyTheme ────────────────────
// Caller: desktop.js (initDesktopShell)

test('[SIMULATION PASS] theme-manager.js: applyTheme guarded in desktop.js', () => {
  assert.ok(
    DESKTOP.includes("typeof applyTheme === 'function'"),
    'desktop.js must guard applyTheme with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'applyTheme', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'applyTheme', 'boot.js');
  assertNeverCalledUnguarded(APP,            'applyTheme', 'app.js');
});

// ── Module: physical-ui.js — initPhysicalTab, initChatPhysical ──
// Callers: window-manager.js (tab activation), boot.js (DOMContentLoaded)

test('[SIMULATION PASS] physical-ui.js: initPhysicalTab guarded in window-manager.js', () => {
  assert.ok(
    WINDOW_MANAGER.includes("typeof initPhysicalTab === 'function'"),
    'window-manager.js must guard initPhysicalTab with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'initPhysicalTab', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'initPhysicalTab', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'initPhysicalTab', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'initPhysicalTab', 'app.js');
});

test('[SIMULATION PASS] physical-ui.js: initChatPhysical guarded in boot.js', () => {
  assert.ok(
    BOOT.includes("typeof initChatPhysical === 'function'"),
    'boot.js must guard initChatPhysical with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'initChatPhysical', 'window-manager.js');
  assertNeverCalledUnguarded(DESKTOP,        'initChatPhysical', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'initChatPhysical', 'app.js');
});

// ── Module: visualizer-ui.js — showMiniMemoryDetail ──────────
// Caller: app.js (mini visualizer hover)

test('[SIMULATION PASS] visualizer-ui.js: showMiniMemoryDetail guarded in app.js', () => {
  assert.ok(
    APP.includes("typeof showMiniMemoryDetail === 'function'"),
    'app.js must guard showMiniMemoryDetail with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'showMiniMemoryDetail', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'showMiniMemoryDetail', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'showMiniMemoryDetail', 'desktop.js');
});

// ── Module: browser-app.js — initBrowserApp, browserCleanup ──
// Callers: window-manager.js (tab activation), desktop.js (beforeunload)

test('[SIMULATION PASS] browser-app.js: initBrowserApp guarded in window-manager.js', () => {
  assert.ok(
    WINDOW_MANAGER.includes("typeof initBrowserApp === 'function'"),
    'window-manager.js must guard initBrowserApp with typeof before calling'
  );
  assertNeverCalledUnguarded(BOOT,    'initBrowserApp', 'boot.js');
  assertNeverCalledUnguarded(APP,     'initBrowserApp', 'app.js');
  assertNeverCalledUnguarded(DESKTOP, 'initBrowserApp', 'desktop.js');
});

test('[SIMULATION PASS] browser-app.js: browserCleanup guarded in desktop.js', () => {
  assert.ok(
    DESKTOP.includes("typeof browserCleanup === 'function'"),
    'desktop.js must guard browserCleanup with typeof before calling'
  );
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'browserCleanup', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'browserCleanup', 'boot.js');
  assertNeverCalledUnguarded(APP,            'browserCleanup', 'app.js');
});

// ── Module: document-digest.js — initDocumentDigest ──────────
// No shell-core hard callers; tab activated on demand

test('[SIMULATION PASS] document-digest.js: initDocumentDigest not hard-called from shell-core', () => {
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'initDocumentDigest', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'initDocumentDigest', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'initDocumentDigest', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'initDocumentDigest', 'app.js');
});

// ── Module: skills-ui.js — loadSkillsList, loadPendingSkills ──
// No shell-core hard callers; skills tab activated on demand

test('[SIMULATION PASS] skills-ui.js: loadSkillsList not hard-called from shell-core', () => {
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'loadSkillsList', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'loadSkillsList', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'loadSkillsList', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'loadSkillsList', 'app.js');
});

test('[SIMULATION PASS] skills-ui.js: loadPendingSkills not hard-called from shell-core', () => {
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'loadPendingSkills', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'loadPendingSkills', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'loadPendingSkills', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'loadPendingSkills', 'app.js');
});

// ── Module: dream-gallery.js — initDreamGallery ──────────────
// No shell-core hard callers

test('[SIMULATION PASS] dream-gallery.js: initDreamGallery not hard-called from shell-core', () => {
  assertNeverCalledUnguarded(WINDOW_MANAGER, 'initDreamGallery', 'window-manager.js');
  assertNeverCalledUnguarded(BOOT,           'initDreamGallery', 'boot.js');
  assertNeverCalledUnguarded(DESKTOP,        'initDreamGallery', 'desktop.js');
  assertNeverCalledUnguarded(APP,            'initDreamGallery', 'app.js');
});
