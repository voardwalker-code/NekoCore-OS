// ── Client Optional · Popout Manager ────────────────────────────────────────────────────
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
// Exposed API includes: window-attached API object.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS - Popout Manager
// Managed detached browser windows for optional/core app shells.
// ============================================================

(function () {
  var POPOUT_REGISTRY_KEY = 'rem-popout-registry-v1';
  var POPOUT_COMMAND_KEY = 'rem-popout-command-v1';
  var POPOUT_HEARTBEAT_MS = 15000;
  var POPOUT_STALE_MS = POPOUT_HEARTBEAT_MS * 3;
  var currentPopoutTab = null;
  var heartbeatTimer = 0;
  // now()
  // WHAT THIS DOES: now is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call now(...) where this helper behavior is needed.
  function now() {
    return Date.now();
  }
  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  // readRegistry()
  // WHAT THIS DOES: readRegistry reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call readRegistry(...), then use the returned value in your next step.
  function readRegistry() {
    try {
      var raw = localStorage.getItem(POPOUT_REGISTRY_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return isObject(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  // writeRegistry()
  // WHAT THIS DOES: writeRegistry changes saved state or updates data.
  // WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
  // HOW TO USE IT: call writeRegistry(...) with the new values you want to persist.
  function writeRegistry(registry) {
    try {
      localStorage.setItem(POPOUT_REGISTRY_KEY, JSON.stringify(registry));
    } catch (_) {
      // Ignore storage failures.
    }
  }
  // pruneRegistry()
  // WHAT THIS DOES: pruneRegistry is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call pruneRegistry(...) where this helper behavior is needed.
  function pruneRegistry(registry) {
    var changed = false;
    var cutoff = now() - POPOUT_STALE_MS;
    Object.keys(registry).forEach(function (tabId) {
      var entry = registry[tabId];
      if (!isObject(entry)) {
        delete registry[tabId];
        changed = true;
        return;
      }
      if (Number(entry.updatedAt) < cutoff) {
        delete registry[tabId];
        changed = true;
      }
    });
    if (changed) writeRegistry(registry);
    return registry;
  }
  // getRegistry()
  // WHAT THIS DOES: getRegistry reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getRegistry(...), then use the returned value in your next step.
  function getRegistry() {
    return pruneRegistry(readRegistry());
  }
  function getPopoutApps() {
    if (typeof WINDOW_APPS === 'undefined' || !Array.isArray(WINDOW_APPS)) return [];
    return WINDOW_APPS.filter(function (app) {
      return app && app.tab && app.tab !== 'popouts';
    });
  }
  // upsertCurrentPopout()
  // WHAT THIS DOES: upsertCurrentPopout is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call upsertCurrentPopout(...) where this helper behavior is needed.
  function upsertCurrentPopout(tabId) {
    if (!tabId) return;
    var app = typeof getWindowApp === 'function' ? getWindowApp(tabId) : { tab: tabId, label: tabId };
    var registry = getRegistry();
    var existing = isObject(registry[tabId]) ? registry[tabId] : {};
    registry[tabId] = {
      tabId: tabId,
      label: String(app.label || tabId),
      openedAt: Number(existing.openedAt) || now(),
      updatedAt: now(),
      url: window.location.href
    };
    writeRegistry(registry);
  }
  // removePopout()
  // WHAT THIS DOES: removePopout removes, resets, or shuts down existing state.
  // WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
  // HOW TO USE IT: call removePopout(...) when you need a safe teardown/reset path.
  function removePopout(tabId) {
    if (!tabId) return;
    var registry = getRegistry();
    if (!registry[tabId]) return;
    delete registry[tabId];
    writeRegistry(registry);
  }
  // sendCommand()
  // WHAT THIS DOES: sendCommand is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call sendCommand(...) where this helper behavior is needed.
  function sendCommand(action, tabId) {
    try {
      localStorage.setItem(POPOUT_COMMAND_KEY, JSON.stringify({
        action: action,
        tabId: tabId,
        ts: now()
      }));
    } catch (_) {
      // Ignore storage failures.
    }
  }
  // requestPopoutClose()
  // WHAT THIS DOES: requestPopoutClose is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call requestPopoutClose(...) where this helper behavior is needed.
  function requestPopoutClose(tabId) {
    if (!tabId) return;
    sendCommand('close', tabId);
    removePopout(tabId);
    refreshPopoutManagerView(true);
  }
  // isPopoutOpen()
  // WHAT THIS DOES: isPopoutOpen answers a yes/no rule check.
  // WHY IT EXISTS: guard checks are kept readable and reusable in one place.
  // HOW TO USE IT: call isPopoutOpen(...) and branch logic based on true/false.
  function isPopoutOpen(tabId) {
    if (!tabId) return false;
    return !!getRegistry()[tabId];
  }
  // focusDetachedPopout()
  // WHAT THIS DOES: focusDetachedPopout is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call focusDetachedPopout(...) where this helper behavior is needed.
  function focusDetachedPopout(tabId) {
    if (!tabId) return;
    if (typeof popOutWindow === 'function') popOutWindow(tabId);
  }
  // getPopoutRegistrySnapshot()
  // WHAT THIS DOES: getPopoutRegistrySnapshot reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getPopoutRegistrySnapshot(...), then use the returned value in your next step.
  function getPopoutRegistrySnapshot() {
    return getRegistry();
  }
  function closeAllPopouts() {
    var registry = getRegistry();
    Object.keys(registry).forEach(function (tabId) {
      sendCommand('close', tabId);
    });
    writeRegistry({});
    refreshPopoutManagerView(true);
  }
  // formatOpenedAt()
  // WHAT THIS DOES: formatOpenedAt reshapes data from one form into another.
  // WHY IT EXISTS: conversion rules live here so the same transformation is reused.
  // HOW TO USE IT: pass input data into formatOpenedAt(...) and use the transformed output.
  function formatOpenedAt(timestamp) {
    if (!Number.isFinite(Number(timestamp))) return 'Not opened';
    try {
      return new Date(Number(timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'Open';
    }
  }
  // renderManagerCards()
  // WHAT THIS DOES: renderManagerCards builds or updates what the user sees.
  // WHY IT EXISTS: display logic is separated from data/business logic for clarity.
  // HOW TO USE IT: call renderManagerCards(...) after state changes that need UI refresh.
  function renderManagerCards(host, registry) {
    host.innerHTML = '';
    getPopoutApps().forEach(function (app) {
      var tabId = String(app.tab || '').trim();
      if (!tabId) return;
      var entry = registry[tabId] || null;
      var card = document.createElement('section');
      card.className = 'config-card';
      card.style.padding = 'var(--space-4)';
      card.innerHTML = [
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3)">',
        '<div>',
        '<div style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">' + app.label + '</div>',
        '<div class="text-xs-c text-secondary-c" style="margin-top:var(--space-1)">' + (entry ? 'Popout active since ' + formatOpenedAt(entry.openedAt) : 'Available for detached window mode') + '</div>',
        '</div>',
        '<span class="pill ' + (entry ? 'ok' : '') + '" style="white-space:nowrap">' + (entry ? 'Open' : 'Closed') + '</span>',
        '</div>',
        '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)">',
        '<button class="btn bp" type="button" data-popout-open="' + tabId + '">' + (entry ? 'Focus Popout' : 'Open Popout') + '</button>',
        '<button class="btn bg" type="button" data-popout-shell="' + tabId + '">Open In Shell</button>',
        '<button class="btn" type="button" data-popout-close="' + tabId + '"' + (entry ? '' : ' disabled aria-disabled="true"') + '>Close Popout</button>',
        '</div>'
      ].join('');
      host.appendChild(card);
    });
  }
  // bindManagerActions()
  // WHAT THIS DOES: bindManagerActions is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call bindManagerActions(...) where this helper behavior is needed.
  function bindManagerActions(host) {
    if (!host || host.dataset.popoutBound === '1') return;
    host.addEventListener('click', function (event) {
      var openButton = event.target.closest('[data-popout-open]');
      if (openButton) {
        var openTab = openButton.getAttribute('data-popout-open');
        if (typeof popOutWindow === 'function') popOutWindow(openTab);
        refreshPopoutManagerView(true);
        return;
      }

      var shellButton = event.target.closest('[data-popout-shell]');
      if (shellButton) {
        var shellTab = shellButton.getAttribute('data-popout-shell');
        if (typeof switchMainTab === 'function') switchMainTab(shellTab, null, { forceInShell: true });
        return;
      }

      var closeButton = event.target.closest('[data-popout-close]');
      if (closeButton) {
        var closeTab = closeButton.getAttribute('data-popout-close');
        requestPopoutClose(closeTab);
      }
    });
    host.dataset.popoutBound = '1';
  }
  // refreshPopoutManagerView()
  // WHAT THIS DOES: refreshPopoutManagerView is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call refreshPopoutManagerView(...) where this helper behavior is needed.
  function refreshPopoutManagerView(forcePrune) {
    var host = document.getElementById('popoutManagerGrid');
    var empty = document.getElementById('popoutManagerEmpty');
    var status = document.getElementById('popoutManagerStatus');
    if (!host) return;

    var registry = forcePrune ? pruneRegistry(readRegistry()) : getRegistry();
    var apps = getPopoutApps();
    if (empty) empty.style.display = apps.length ? 'none' : '';
    if (status) {
      var openCount = Object.keys(registry).length;
      status.textContent = openCount
        ? openCount + ' popout window' + (openCount === 1 ? '' : 's') + ' active.'
        : 'No detached windows are active.';
    }

    renderManagerCards(host, registry);
    bindManagerActions(host);
    if (typeof syncDetachedShellStateUI === 'function') {
      try { syncDetachedShellStateUI(registry); } catch (_) {}
    }
  }
  // handleStorageEvent()
  // WHAT THIS DOES: handleStorageEvent handles an event and routes follow-up actions.
  // WHY IT EXISTS: event flow is easier to debug when listener logic is centralized.
  // HOW TO USE IT: wire handleStorageEvent to the relevant event source or dispatcher.
  function handleStorageEvent(event) {
    if (event.key === POPOUT_REGISTRY_KEY) {
      refreshPopoutManagerView(false);
      return;
    }
    if (event.key !== POPOUT_COMMAND_KEY) return;
    if (!currentPopoutTab) return;

    try {
      var command = JSON.parse(String(event.newValue || '{}'));
      if (command.action === 'close' && command.tabId === currentPopoutTab) {
        removePopout(currentPopoutTab);
        window.close();
      }
    } catch (_) {
      // Ignore malformed commands.
    }
  }
  // startCurrentPopoutLifecycle()
  // WHAT THIS DOES: startCurrentPopoutLifecycle creates or initializes something needed by the flow.
  // WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
  // HOW TO USE IT: call startCurrentPopoutLifecycle(...) before code that depends on this setup.
  function startCurrentPopoutLifecycle() {
    currentPopoutTab = String(new URLSearchParams(window.location.search).get('popout') || '').trim();
    if (!currentPopoutTab) return;

    upsertCurrentPopout(currentPopoutTab);
    heartbeatTimer = window.setInterval(function () {
      upsertCurrentPopout(currentPopoutTab);
    }, POPOUT_HEARTBEAT_MS);

    window.addEventListener('beforeunload', function () {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      removePopout(currentPopoutTab);
    });
  }

  startCurrentPopoutLifecycle();
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('focus', function () {
    if (currentPopoutTab) upsertCurrentPopout(currentPopoutTab);
    refreshPopoutManagerView(false);
  });

  window.requestPopoutClose = requestPopoutClose;
  window.closeAllPopouts = closeAllPopouts;
  window.isPopoutOpen = isPopoutOpen;
  window.focusDetachedPopout = focusDetachedPopout;
  window.getPopoutRegistrySnapshot = getPopoutRegistrySnapshot;
  window.refreshPopoutManagerView = refreshPopoutManagerView;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      refreshPopoutManagerView(true);
    }, { once: true });
  } else {
    refreshPopoutManagerView(true);
  }
})();