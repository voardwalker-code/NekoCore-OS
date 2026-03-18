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
    if (typeof initChatPhysical === 'function') initChatPhysical();

    setBootOverlayState(getBootGreetingTitle(), 'Desktop shell ready', 100);
    setTimeout(() => hideBootOverlay(), 220);
  } catch (err) {
    lg('err', 'Boot pipeline failed: ' + err.message);
    hideBootOverlay();
  } finally {
    clearTimeout(forceHideTimer);
  }
});