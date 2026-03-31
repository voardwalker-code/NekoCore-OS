// ── Client · Boot ────────────────────────────────────────────────────
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

/* Boot path extracted from app.js - P3-S3 */

/* eslint-disable no-undef */

document.addEventListener('DOMContentLoaded', async function() {
  if (window.__nonCoreHtmlReady && typeof window.__nonCoreHtmlReady.then === 'function') {
    try { await window.__nonCoreHtmlReady; } catch (_) {}
  }

  const forceHideTimer = setTimeout(() => {
    // Safety net: never leave the shell blocked by the boot overlay.
    hideBootOverlay();
  }, 8000);

  initDesktopShell();
  initSettingsModelSuggestions();

  const thoughtsEl = document.getElementById('thoughtsToggle');
  if (thoughtsEl) thoughtsEl.classList.toggle('on', showThoughtsInChat);

  try {
    await loadSavedConfig();
    lg('ok', 'Saved configuration loaded');
    syncShellStatusWidgets();
  } catch (err) {
    lg('warn', 'Could not load saved config: ' + err.message);
  }

  try {
    setBootOverlayState('Starting services', 'Restoring runtime and session…', 42);

    if (typeof _startApp === 'function') {
      _startApp();
    } else {
      lg('warn', 'Boot shim: _startApp missing; continuing with direct startup path');
    }

    if (typeof initLogin === 'function') {
      await initLogin({ showOverlayOnFail: true });
    }

    startBrainPoll();
    if (typeof initBrainSSE === 'function') initBrainSSE();
    if (typeof initChatPhysical === 'function') initChatPhysical();

    setBootOverlayState(getBootGreetingTitle(), 'Desktop shell ready', 100);
    if (typeof nkSound !== 'undefined') nkSound.play('boot');
    setTimeout(() => {
      hideBootOverlay();
      // Auto-open Welcome tab if first setup just completed
      try {
        if (localStorage.getItem('nk-show-welcome') === '1') {
          localStorage.removeItem('nk-show-welcome');
          if (typeof switchMainTab === 'function') switchMainTab('welcome');
        }
      } catch (_) {}
    }, 220);
  } catch (err) {
    lg('err', 'Boot pipeline failed: ' + err.message);
    hideBootOverlay();
  } finally {
    clearTimeout(forceHideTimer);
  }
});