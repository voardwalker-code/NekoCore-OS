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

  function now() {
    return Date.now();
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function readRegistry() {
    try {
      var raw = localStorage.getItem(POPOUT_REGISTRY_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return isObject(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeRegistry(registry) {
    try {
      localStorage.setItem(POPOUT_REGISTRY_KEY, JSON.stringify(registry));
    } catch (_) {
      // Ignore storage failures.
    }
  }

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

  function getRegistry() {
    return pruneRegistry(readRegistry());
  }

  function getPopoutApps() {
    if (typeof WINDOW_APPS === 'undefined' || !Array.isArray(WINDOW_APPS)) return [];
    return WINDOW_APPS.filter(function (app) {
      return app && app.tab && app.tab !== 'popouts';
    });
  }

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

  function removePopout(tabId) {
    if (!tabId) return;
    var registry = getRegistry();
    if (!registry[tabId]) return;
    delete registry[tabId];
    writeRegistry(registry);
  }

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

  function requestPopoutClose(tabId) {
    if (!tabId) return;
    sendCommand('close', tabId);
    removePopout(tabId);
    refreshPopoutManagerView(true);
  }

  function isPopoutOpen(tabId) {
    if (!tabId) return false;
    return !!getRegistry()[tabId];
  }

  function focusDetachedPopout(tabId) {
    if (!tabId) return;
    if (typeof popOutWindow === 'function') popOutWindow(tabId);
  }

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

  function formatOpenedAt(timestamp) {
    if (!Number.isFinite(Number(timestamp))) return 'Not opened';
    try {
      return new Date(Number(timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'Open';
    }
  }

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