/* ╔══════════════════════════════════════════════════════════════╗
   ║  WINDOW MANAGER                                            ║
   ║  Floating window lifecycle, drag, resize, snap, layout     ║
   ║  plus the start-menu launcher builder                      ║
   ║  Extracted from app.js — P3-S1                             ║
   ║  Depends on: app.js globals (windowManager, taskbarLayout, ║
   ║    layoutResizeRaf, WINDOW_APPS, APP_CATEGORY_BY_TAB,      ║
   ║    START_MENU_SPECIAL_APPS, START_MENU_CATEGORY_ORDER,     ║
   ║    WINDOW_LAYOUT_STORAGE_KEY, pinnedApps, runtimeTelemetry)║
   ╚══════════════════════════════════════════════════════════════╝ */

/* eslint-disable no-undef */

// ── Geometry helpers ────────────────────────────────────────────────────────

function getStageRect() {
  if (!windowManager.stage) {
    const reserved = taskbarLayout && taskbarLayout.height ? (taskbarLayout.height + 40) : 108;
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight - reserved };
  }
  return windowManager.stage.getBoundingClientRect();
}

function scheduleLayoutResizeSignal(detail = {}) {
  if (layoutResizeRaf) return;
  layoutResizeRaf = requestAnimationFrame(() => {
    layoutResizeRaf = 0;
    try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('rem:layout-resized', { detail })); } catch (_) {}
  });
}

function clampWindowRect(rect, minWidth = 460, minHeight = 320) {
  const stage = getStageRect();
  const width = Math.max(minWidth, Math.min(rect.width, stage.width));
  const height = Math.max(minHeight, Math.min(rect.height, stage.height));
  const maxLeft = Math.max(0, stage.width - width);
  const maxTop = Math.max(0, stage.height - height);
  const left = Math.max(0, Math.min(rect.left, maxLeft));
  const top = Math.max(0, Math.min(rect.top, maxTop));
  return { left, top, width, height };
}

function setWindowRect(meta, rect) {
  const clamped = clampWindowRect(rect);
  meta.el.style.left = clamped.left + 'px';
  meta.el.style.top = clamped.top + 'px';
  meta.el.style.width = clamped.width + 'px';
  meta.el.style.height = clamped.height + 'px';
  scheduleLayoutResizeSignal({ tab: meta.tab, width: clamped.width, height: clamped.height });
}

function captureWindowRect(meta) {
  return {
    left: parseFloat(meta.el.style.left) || 0,
    top: parseFloat(meta.el.style.top) || 0,
    width: parseFloat(meta.el.style.width) || 900,
    height: parseFloat(meta.el.style.height) || 640
  };
}

function rememberWindowRestoreRect(meta) {
  if (meta.maximized || meta.snapState) return;
  meta.restoreRect = captureWindowRect(meta);
}

function clearWindowDockState(meta) {
  meta.maximized = false;
  meta.snapState = null;
  meta.el.classList.remove('maximized');
}

function restoreWindowForDrag(meta, pointerEvent) {
  if (!meta.maximized && !meta.snapState) {
    return captureWindowRect(meta);
  }

  const stage = getStageRect();
  const currentBounds = meta.el.getBoundingClientRect();
  const fallback = getWindowApp(meta.tab);
  const restoreRect = meta.restoreRect || {
    left: Math.round((stage.width - fallback.w) / 2),
    top: Math.round((stage.height - fallback.h) / 2),
    width: fallback.w,
    height: fallback.h
  };
  const pointerRatioX = currentBounds.width > 0
    ? (pointerEvent.clientX - currentBounds.left) / currentBounds.width
    : 0.5;
  const anchorX = Math.max(0.18, Math.min(0.82, pointerRatioX));
  const targetRect = {
    left: (pointerEvent.clientX - stage.left) - (restoreRect.width * anchorX),
    top: Math.max(0, (pointerEvent.clientY - stage.top) - 24),
    width: restoreRect.width,
    height: restoreRect.height
  };

  clearWindowDockState(meta);
  setWindowRect(meta, targetRect);
  return captureWindowRect(meta);
}

// ── Focus & activation ───────────────────────────────────────────────────────

function focusWindow(tabName) {
  const meta = windowManager.windows.get(tabName);
  if (!meta || !meta.open) return;
  windowManager.z += 1;
  meta.el.style.zIndex = String(windowManager.z);
  windowManager.windows.forEach((item) => item.el.classList.remove('focused'));
  meta.el.classList.add('focused');
  runtimeTelemetry.activeWindowTab = tabName;
}

function applyWindowActivationEffects(tabName) {
  if (tabName === 'physical') {
    if (typeof initPhysicalTab === 'function') initPhysicalTab();
  }
  if (tabName === 'entity') {
    ensureEntityWindowContent(false);
  }
  if (tabName === 'users') {
    usersAppRefresh();
  }
  if (tabName === 'lifediary' && typeof loadLifeDiary === 'function') {
    loadLifeDiary();
  }
  if (tabName === 'dreamdiary' && typeof loadDreamDiary === 'function') {
    loadDreamDiary();
  }
  if (tabName === 'browser' && typeof initBrowserApp === 'function') {
    initBrowserApp();
  }
  if (tabName === 'debugcore' && typeof initCoreDebugApp === 'function') {
    initCoreDebugApp();
  }
}

// ── Open / Close ─────────────────────────────────────────────────────────────

function openNekoCoreWithMessage(msg) {
  const text = (msg || '').trim();
  if (!text) { openWindow('nekocore'); return; }
  // Clear the taskbar input
  const inp = document.getElementById('nkQuickInput');
  if (inp) inp.value = '';
  // Open (or focus) the NekoCore window
  openWindow('nekocore');
  // Load the iframe if not yet loaded
  const fr = document.getElementById('nekocore-panel-frame');
  if (!fr) return;
  const dispatch = () => fr.contentWindow && fr.contentWindow.postMessage({ type: 'nk_send_message', text }, '*');
  if (!frameHasExpectedPath(fr, ['nekocore.html'])) {
    fr.addEventListener('load', () => setTimeout(dispatch, 80), { once: true });
    fr.src = '/nekocore.html';
  } else {
    // Already loaded — post immediately (allow a tick for focus)
    setTimeout(dispatch, 80);
  }
}

// ── D-3: Manifest Entry Lookup ──────────────────────────────────────────────────

function getManifestAppEntry(appId) {
  try {
    if (typeof window.SystemAppsAdapter !== 'object' || typeof window.SystemAppsAdapter.loadManifestSync !== 'function') {
      return null;
    }
    const manifest = window.SystemAppsAdapter.loadManifestSync();
    if (!manifest || !Array.isArray(manifest.apps)) return null;
    return manifest.apps.find((entry) => entry && entry.id === appId) || null;
  } catch (_) {
    return null;
  }
}

// ── D-3: Shadow App Loader Integration ──────────────────────────────────────────

function launchAppViaShadowLoader(tabName, packagePath, packageEntry) {
  try {
    // Guard: AppWindow and ShadowContentLoader must be available
    if (typeof window.getOrCreateAppWindow !== 'function' || typeof window.getOrCreateShadowLoader !== 'function') {
      return false;
    }

    // Get/create AppWindow for this tab
    const meta = windowManager.windows.get(tabName);
    if (!meta) return false;

    const appMetadata = { name: meta.label || tabName, packagePath };
    const appWindow = window.getOrCreateAppWindow(tabName, appMetadata);
    if (!appWindow) return false;

    // Initialize shadow root if not already done
    if (!appWindow.getShadowRoot) {
      appWindow.initialize();
    }

    // Create/get shadow content loader
    const loader = window.getOrCreateShadowLoader(appWindow, packagePath, packageEntry);
    if (!loader) return false;

    // Load the app package payload
    return loader.load();
  } catch (_) {
    return false;
  }
}

function shouldLaunchViaShadowLoader(manifestEntry) {
  if (!manifestEntry || typeof manifestEntry !== 'object') {
    return false;
  }
  if (typeof manifestEntry.packagePath !== 'string' || !manifestEntry.packagePath.trim()) {
    return false;
  }
  const appType = String(manifestEntry.appType || '').trim();
  if (appType === 'iframe-page' || appType === 'hybrid-iframe-page') {
    return false;
  }
  return true;
}

function frameHasExpectedPath(frame, expectedPaths) {
  if (!frame || !Array.isArray(expectedPaths) || expectedPaths.length === 0) {
    return false;
  }

  const rawSrc = String(frame.getAttribute('src') || '').trim();
  if (!rawSrc) return false;

  const normalizedExpected = expectedPaths
    .map((entry) => String(entry || '').replace(/\\/g, '/').toLowerCase())
    .filter(Boolean);

  try {
    const resolved = new URL(rawSrc, window.location.href);
    const pathname = resolved.pathname.replace(/\\/g, '/').toLowerCase();
    return normalizedExpected.some((expected) => pathname === '/' + expected || pathname.endsWith('/' + expected));
  } catch (_) {
    const fallbackPath = rawSrc.replace(/\\/g, '/').toLowerCase();
    return normalizedExpected.some((expected) => fallbackPath === expected || fallbackPath.endsWith('/' + expected));
  }
}

function openWindow(tabName, options = {}) {
  const meta = windowManager.windows.get(tabName);
  if (!meta) return;

  const needsCenter = options.center === true || !meta.open;
  meta.open = true;
  meta.minimized = false;
  meta.el.style.display = 'flex';
  meta.el.classList.remove('minimized');
  meta.el.classList.add('open', 'opening');

  // ── D-3: Check manifest for packagePath and route through shadow loader ──
  const manifestEntry = getManifestAppEntry(tabName);
  if (shouldLaunchViaShadowLoader(manifestEntry)) {
    const shadowLoaded = launchAppViaShadowLoader(
      tabName,
      manifestEntry.packagePath,
      manifestEntry.packageEntry || manifestEntry.packagePath + '/index.html'
    );
    if (shadowLoaded) {
      // Shadow loader handled the app load — apply visual effects and close legacy hooks
      window.setTimeout(() => meta.el.classList.remove('opening'), 220);
      if (needsCenter && !meta.maximized) {
        const stage = getStageRect();
        const app = getWindowApp(tabName);
        setWindowRect(meta, {
          left: Math.round((stage.width - app.w) / 2),
          top: Math.round((stage.height - app.h) / 2),
          width: app.w,
          height: app.h
        });
      }
      if (options.maximize) {
        toggleMaximizeWindow(tabName, true);
      }
      focusWindow(tabName);
      applyWindowActivationEffects(tabName);
      syncShellStatusWidgets();
      return; // Exit early — shadow loader took over
    }
    // If shadow load failed, fall through to legacy path below
  }

  // ── Legacy path (non-packaged apps) ──────────────────────────────────────────
  meta.el.classList.add('open', 'opening');
  window.setTimeout(() => meta.el.classList.remove('opening'), 220);

  if (needsCenter && !meta.maximized) {
    const stage = getStageRect();
    const app = getWindowApp(tabName);
    setWindowRect(meta, {
      left: Math.round((stage.width - app.w) / 2),
      top: Math.round((stage.height - app.h) / 2),
      width: app.w,
      height: app.h
    });
  }

  if (options.maximize) {
    toggleMaximizeWindow(tabName, true);
  }

  focusWindow(tabName);
  applyWindowActivationEffects(tabName);
  syncShellStatusWidgets();

  // Per-tab on-open hooks
  if (tabName === 'workspace' && typeof feRender === 'function') feRender();
  if (tabName === 'creator') {
    const fr = document.getElementById('creatorAppFrame');
    const resetCreator = () => {
      try {
        if (fr && fr.contentWindow && typeof fr.contentWindow.resetCreatorFlow === 'function') {
          fr.contentWindow.resetCreatorFlow({ skipWelcome: true });
        }
      } catch (_) {}
    };
    if (fr && !frameHasExpectedPath(fr, ['create.html', 'apps/entity-creator/index.html'])) {
      fr.addEventListener('load', () => setTimeout(resetCreator, 60), { once: true });
      fr.src = '/create.html?embed=1';
    } else if (fr && fr.contentWindow && typeof fr.contentWindow.resetCreatorFlow === 'function') {
      setTimeout(resetCreator, 60);
    } else if (fr) {
      fr.addEventListener('load', () => setTimeout(resetCreator, 60), { once: true });
    }
  }
  if (tabName === 'nekocore') {
    const fr = document.getElementById('nekocore-panel-frame');
    if (fr && !frameHasExpectedPath(fr, ['nekocore.html'])) fr.src = '/nekocore.html';
  }
}

function closeWindow(tabName) {
  const meta = windowManager.windows.get(tabName);
  if (!meta) return;
  // Browser-specific: save session on window close
  if (tabName === 'browser' && typeof _browserSaveSessionSync === 'function') {
    _browserSaveSessionSync();
  }
  // Chat-specific: release the active entity so memories sync and checkout frees
  if (tabName === 'chat' && typeof currentEntityId === 'string' && currentEntityId) {
    try {
      fetch('/api/entities/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: currentEntityId }),
        keepalive: true
      }).catch(() => {});
      currentEntityId = null;
      currentEntityName = null;
      currentEntityVoice = null;
      if (typeof clearChat === 'function') clearChat();
      if (typeof refreshSidebarEntities === 'function') refreshSidebarEntities();
    } catch (_) {}
  }
  meta.open = false;
  meta.minimized = false;
  meta.el.classList.remove('open', 'focused');
  meta.el.classList.remove('minimized');
  meta.el.style.display = 'none';
  runtimeTelemetry.activeWindowTab = getFocusedWindowTab();

  // ── D-3: Cleanup shadow-hosted app if present ──
  try {
    if (typeof window.getShadowLoader === 'function') {
      const loader = window.getShadowLoader(tabName);
      if (loader && typeof loader.unload === 'function') {
        loader.unload();
      }
    }
  } catch (_) {
    // Safely ignore cleanup errors — window closing takes priority
  }
  syncShellStatusWidgets();
}

function minimizeWindow(tabName) {
  const meta = windowManager.windows.get(tabName);
  if (!meta || !meta.open) return;
  meta.minimized = true;
  meta.el.classList.remove('focused');
  meta.el.classList.add('minimized');
  meta.el.style.display = 'none';
  runtimeTelemetry.activeWindowTab = getFocusedWindowTab();
  syncShellStatusWidgets();
}

// ── Maximize & Snap ──────────────────────────────────────────────────────────

function toggleMaximizeWindow(tabName, force) {
  const meta = windowManager.windows.get(tabName);
  if (!meta) return;
  const shouldMaximize = typeof force === 'boolean' ? force : !meta.maximized;
  const stage = getStageRect();

  if (shouldMaximize && !meta.maximized) {
    rememberWindowRestoreRect(meta);
    meta.maximized = true;
    meta.snapState = null;
    meta.el.classList.add('maximized');
    setWindowRect(meta, { left: 0, top: 0, width: stage.width, height: stage.height });
  } else if (!shouldMaximize && meta.maximized) {
    clearWindowDockState(meta);
    if (meta.restoreRect) setWindowRect(meta, meta.restoreRect);
  }
}

function snapWindow(tabName, side) {
  const meta = windowManager.windows.get(tabName);
  if (!meta) return;
  const stage = getStageRect();
  rememberWindowRestoreRect(meta);
  clearWindowDockState(meta);
  if (side === 'left') {
    meta.snapState = 'left';
    setWindowRect(meta, { left: 0, top: 0, width: stage.width / 2, height: stage.height });
  } else if (side === 'right') {
    meta.snapState = 'right';
    setWindowRect(meta, { left: stage.width / 2, top: 0, width: stage.width / 2, height: stage.height });
  } else if (side === 'top') {
    meta.snapState = 'top';
    setWindowRect(meta, { left: 0, top: 0, width: stage.width, height: stage.height / 2 });
  } else if (side === 'bottom') {
    meta.snapState = 'bottom';
    setWindowRect(meta, { left: 0, top: stage.height / 2, width: stage.width, height: stage.height / 2 });
  } else if (side === 'top-left') {
    meta.snapState = 'top-left';
    setWindowRect(meta, { left: 0, top: 0, width: stage.width / 2, height: stage.height / 2 });
  } else if (side === 'top-right') {
    meta.snapState = 'top-right';
    setWindowRect(meta, { left: stage.width / 2, top: 0, width: stage.width / 2, height: stage.height / 2 });
  } else if (side === 'bottom-left') {
    meta.snapState = 'bottom-left';
    setWindowRect(meta, { left: 0, top: stage.height / 2, width: stage.width / 2, height: stage.height / 2 });
  } else if (side === 'bottom-right') {
    meta.snapState = 'bottom-right';
    setWindowRect(meta, { left: stage.width / 2, top: stage.height / 2, width: stage.width / 2, height: stage.height / 2 });
  } else if (side === 'maximize') {
    toggleMaximizeWindow(tabName, true);
    return;
  }
  focusWindow(tabName);
}

function showSnapDock(tabName) {
  const overlay = windowManager.dock.overlay;
  if (!overlay || windowManager.popoutTab) return;
  windowManager.dock.active = true;
  windowManager.dock.tab = tabName;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideSnapDock() {
  const overlay = windowManager.dock.overlay;
  if (!overlay) return;
  windowManager.dock.active = false;
  windowManager.dock.selectedZone = null;
  windowManager.dock.tab = null;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.querySelectorAll('.wm-snap-zone').forEach((zone) => zone.classList.remove('is-active'));
}

function updateSnapDockPointer(clientX, clientY) {
  if (!windowManager.dock.active || !windowManager.dock.overlay) return;
  const hovered = document.elementFromPoint(clientX, clientY);
  const zoneEl = hovered && hovered.closest ? hovered.closest('.wm-snap-zone') : null;
  windowManager.dock.overlay.querySelectorAll('.wm-snap-zone').forEach((zone) => {
    zone.classList.toggle('is-active', zone === zoneEl);
  });
  windowManager.dock.selectedZone = zoneEl ? zoneEl.getAttribute('data-zone') : null;
}

function resolveEdgeSnap(clientX, clientY) {
  const stage = getStageRect();
  const x = clientX - stage.left;
  const y = clientY - stage.top;
  const threshold = 26;

  const left = x <= threshold;
  const right = x >= stage.width - threshold;
  const top = y <= threshold;
  const bottom = y >= stage.height - threshold;

  if (top && left) return 'top-left';
  if (top && right) return 'top-right';
  if (bottom && left) return 'bottom-left';
  if (bottom && right) return 'bottom-right';
  if (top) return 'maximize';
  if (left) return 'left';
  if (right) return 'right';
  if (bottom) return 'bottom';
  return null;
}

// ── Drag & Resize ────────────────────────────────────────────────────────────

function startDrag(meta, event) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = restoreWindowForDrag(meta, event);

  const move = (moveEvent) => {
    const stage = getStageRect();
    const relativeY = moveEvent.clientY - stage.top;
    if (relativeY <= 30) {
      showSnapDock(meta.tab);
    } else if (windowManager.dock.active && relativeY > 86) {
      hideSnapDock();
    }
    updateSnapDockPointer(moveEvent.clientX, moveEvent.clientY);

    setWindowRect(meta, {
      left: rect.left + (moveEvent.clientX - startX),
      top: rect.top + (moveEvent.clientY - startY),
      width: rect.width,
      height: rect.height
    });
  };
  const up = (upEvent) => {
    const selectedZone = windowManager.dock.selectedZone || resolveEdgeSnap(upEvent.clientX, upEvent.clientY);
    if (selectedZone) {
      snapWindow(meta.tab, selectedZone);
    }
    hideSnapDock();
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function startResize(meta, direction, event) {
  if (meta.maximized) return;
  event.preventDefault();
  event.stopPropagation();

  const startX = event.clientX;
  const startY = event.clientY;
  const initial = {
    left: parseFloat(meta.el.style.left) || 0,
    top: parseFloat(meta.el.style.top) || 0,
    width: parseFloat(meta.el.style.width) || 900,
    height: parseFloat(meta.el.style.height) || 640
  };

  const move = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    const next = { ...initial };

    if (direction.includes('e')) next.width = initial.width + dx;
    if (direction.includes('s')) next.height = initial.height + dy;
    if (direction.includes('w')) {
      next.width = initial.width - dx;
      next.left = initial.left + dx;
    }
    if (direction.includes('n')) {
      next.height = initial.height - dy;
      next.top = initial.top + dy;
    }

    setWindowRect(meta, next);
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

// ── Pop-out ──────────────────────────────────────────────────────────────────

function popOutWindow(tabName) {
  const app = getWindowApp(tabName);
  const width = Math.max(720, Number(app.w) || 980);
  const height = Math.max(520, Number(app.h) || 680);
  const windowName = 'rem-popout-' + String(tabName || 'app');
  const url = new URL(window.location.href);
  url.searchParams.set('popout', tabName);
  const popout = window.open(
    url.toString(),
    windowName,
    'popup=yes,width=' + width + ',height=' + height + ',resizable=yes,scrollbars=yes'
  );
  if (popout && typeof popout.focus === 'function') {
    try { popout.focus(); } catch (_) {}
  }
  if (typeof refreshPopoutManagerView === 'function') {
    try { refreshPopoutManagerView(); } catch (_) {}
  }
}

// ── Shell creation ───────────────────────────────────────────────────────────

function createWindowShell(tabName, tabElement) {
  const app = getWindowApp(tabName);
  const isCurrentPopout = windowManager.popoutTab === tabName;
  const shell = document.createElement('section');
  shell.className = 'wm-window';
  shell.dataset.tab = tabName;
  shell.style.display = 'none';

  shell.innerHTML = `
    <header class="wm-titlebar">
      <div class="wm-title"><span class="wm-title-icon" data-accent="${app.accent || 'green'}">${app.icon}</span> ${app.label}</div>
      <div class="wm-controls">
        <button class="wm-btn" data-action="pin" title="Pin/Unpin to taskbar">&#9733;</button>
        <button class="wm-btn" data-action="minimize" title="Minimize">&#8722;</button>
        <button class="wm-btn" data-action="snap-left" title="Snap left">&#8592;</button>
        <button class="wm-btn" data-action="snap-right" title="Snap right">&#8594;</button>
        <button class="wm-btn" data-action="popout" title="Pop out window"${isCurrentPopout ? ' disabled aria-disabled="true"' : ''}>&#8599;</button>
        <button class="wm-btn" data-action="maximize" title="Maximize">&#9723;</button>
        <button class="wm-btn wm-btn-close" data-action="close" title="Close">&#10005;</button>
      </div>
    </header>
    <div class="wm-content"></div>
  `;

  ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((direction) => {
    const handle = document.createElement('div');
    handle.className = 'wm-resize wm-resize-' + direction;
    handle.addEventListener('pointerdown', (event) => startResize(windowManager.windows.get(tabName), direction, event));
    shell.appendChild(handle);
  });

  const content = shell.querySelector('.wm-content');
  tabElement.classList.remove('on');
  tabElement.classList.add('wm-tab-pane');
  content.appendChild(tabElement);

  const meta = {
    tab: tabName,
    el: shell,
    open: false,
    minimized: false,
    maximized: false,
    restoreRect: null,
    snapState: null
  };
  windowManager.windows.set(tabName, meta);

  shell.addEventListener('pointerdown', () => focusWindow(tabName));
  shell.querySelector('.wm-titlebar').addEventListener('pointerdown', (event) => {
    if (event.target.closest('.wm-controls')) return;
    focusWindow(tabName);
    startDrag(meta, event);
  });

  shell.querySelector('.wm-controls').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    if (action === 'close') closeWindow(tabName);
    if (action === 'minimize') minimizeWindow(tabName);
    if (action === 'maximize') toggleMaximizeWindow(tabName);
    if (action === 'popout') popOutWindow(tabName);
    if (action === 'snap-left') snapWindow(tabName, 'left');
    if (action === 'snap-right') snapWindow(tabName, 'right');
    if (action === 'pin') togglePinnedApp(tabName);
  });

  windowManager.stage.appendChild(shell);
  setWindowRect(meta, { left: 24, top: 24, width: app.w, height: app.h });
}

// ── Start menu / launcher builder ────────────────────────────────────────────

function buildLauncherMenu() {
  const categoryHost = document.getElementById('osStartCategoryGrid');
  const appsHost = document.getElementById('osStartCategoryApps');
  const pinnedHost = document.getElementById('osStartPinnedGrid');
  if (!categoryHost || !appsHost) return;
  categoryHost.innerHTML = '';
  appsHost.innerHTML = '';

  const sourceApps = typeof getShellWindowApps === 'function' ? getShellWindowApps() : WINDOW_APPS;
  const allApps = sourceApps
    .filter((app) => windowManager.windows.has(app.tab))
    .map((app) => ({
      ...app,
      launchTab: app.tab,
      category: APP_CATEGORY_BY_TAB[app.tab] || 'workspace',
      pinnable: true,
      description: ''
    }));
  const startApps = [...allApps, ...START_MENU_SPECIAL_APPS];

  const categoryGroups = new Map();
  startApps.forEach((app) => {
    const key = app.category || 'workspace';
    if (!categoryGroups.has(key)) categoryGroups.set(key, []);
    categoryGroups.get(key).push(app);
  });

  const availableCategories = START_MENU_CATEGORY_ORDER.filter((category) => (categoryGroups.get(category.id) || []).length > 0);
  if (!selectedStartCategoryId || !categoryGroups.has(selectedStartCategoryId)) {
    selectedStartCategoryId = availableCategories.length ? availableCategories[0].id : '';
  }

  if (pinnedHost) {
    pinnedHost.innerHTML = '';
    pinnedApps.forEach((tabName) => {
      const app = allApps.find((item) => item.tab === tabName);
      if (!app) return;
      const button = document.createElement('button');
      button.className = 'os-launcher-item os-start-pinned-app';
      button.setAttribute('data-tab', app.launchTab);
      button.innerHTML = '<span class="launcher-app-left"><span class="launcher-app-icon" data-accent="' + (app.accent || 'green') + '">' + app.icon + '</span><span class="launcher-app-label">' + app.label + '</span></span><span class="launcher-pin-btn">Pinned</span>';
      button.onclick = function() { switchMainTab(app.launchTab, button); };
      pinnedHost.appendChild(button);
    });
  }

  if (startCategoryViewMode === 'categories') {
    categoryHost.style.display = '';
    appsHost.style.display = '';
    availableCategories.forEach((category) => {
      const apps = categoryGroups.get(category.id) || [];
      const card = document.createElement('button');
      card.className = 'os-start-category-card';
      card.setAttribute('type', 'button');
      card.classList.toggle('on', category.id === selectedStartCategoryId);
      card.innerHTML = [
        '<span class="os-start-category-title">' + category.label + '</span>',
        '<span class="os-start-category-preview">',
        apps.slice(0, 4).map((app) => '<span class="os-start-category-app-icon" data-accent="' + (app.accent || 'green') + '" title="' + app.label + '">' + app.icon + '</span>').join(''),
        '</span>'
      ].join('');
      card.onclick = function(clickEvent) {
        clickEvent.stopPropagation();
        openStartCategoryApps(category.id);
      };
      categoryHost.appendChild(card);
    });
  } else {
    categoryHost.style.display = 'none';
    appsHost.style.display = '';
  }

  const makeAppButton = (app) => {
    const button = document.createElement('button');
    button.className = 'os-launcher-item os-start-app-item';
    if (app.launchTab) button.setAttribute('data-tab', app.launchTab);
    const desc = app.description ? '<span class="launcher-app-meta">' + app.description + '</span>' : '';
    button.innerHTML = '<span class="launcher-app-left"><span class="launcher-app-icon" data-accent="' + (app.accent || 'green') + '">' + app.icon + '</span><span class="launcher-app-label">' + app.label + '</span></span>' + desc;

    if (app.pinnable) {
      const pin = document.createElement('span');
      pin.className = 'launcher-pin-btn';
      pin.setAttribute('role', 'button');
      pin.setAttribute('tabindex', '0');
      pin.textContent = isPinnedApp(app.tab) ? 'Unpin' : 'Pin';
      pin.onclick = function(event) {
        event.stopPropagation();
        togglePinnedApp(app.tab);
      };
      pin.onkeydown = function(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        togglePinnedApp(app.tab);
      };
      button.appendChild(pin);
    }

    if (app.action) {
      button.onclick = function() {
        const fn = window[app.action];
        if (typeof fn === 'function') fn();
        closeStartMenu();
      };
    } else {
      button.onclick = function() { switchMainTab(app.launchTab, button); };
    }
    return button;
  };

  const selectedCategory = START_MENU_CATEGORY_ORDER.find((category) => category.id === selectedStartCategoryId);
  const selectedApps = categoryGroups.get(selectedStartCategoryId) || [];

  if (startCategoryViewMode === 'apps') {
    const tools = document.createElement('div');
    tools.className = 'os-start-inline-actions';
    const back = document.createElement('button');
    back.className = 'btn bg text-xs-c';
    back.textContent = '← Back to Categories';
    back.onclick = function(clickEvent) {
      clickEvent.stopPropagation();
      showStartCategories();
    };
    tools.appendChild(back);

    const showAll = document.createElement('button');
    showAll.className = 'btn bg text-xs-c';
    showAll.textContent = 'Show All Apps';
    showAll.onclick = function(clickEvent) {
      clickEvent.stopPropagation();
      showAllStartApps();
    };
    tools.appendChild(showAll);

    appsHost.appendChild(tools);

    const heading = document.createElement('div');
    heading.className = 'os-start-section-title';
    heading.textContent = (selectedCategory ? selectedCategory.label : 'Apps') + ' Apps';
    appsHost.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'os-launcher-grid os-launcher-grid-categorized';
    selectedApps.forEach((app) => grid.appendChild(makeAppButton(app)));
    appsHost.appendChild(grid);
  } else if (startCategoryViewMode === 'all') {
    const tools = document.createElement('div');
    tools.className = 'os-start-inline-actions';
    const back = document.createElement('button');
    back.className = 'btn bg text-xs-c';
    back.textContent = '← Back to Categories';
    back.onclick = function(clickEvent) {
      clickEvent.stopPropagation();
      showStartCategories();
    };
    tools.appendChild(back);
    appsHost.appendChild(tools);

    const heading = document.createElement('div');
    heading.className = 'os-start-section-title';
    heading.textContent = 'All Apps';
    appsHost.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'os-launcher-grid os-launcher-grid-categorized';
    startApps.forEach((app) => grid.appendChild(makeAppButton(app)));
    appsHost.appendChild(grid);
  } else {
    const hint = document.createElement('div');
    hint.className = 'os-start-section-title';
    hint.textContent = 'Select a category to open apps';
    appsHost.appendChild(hint);

    const tools = document.createElement('div');
    tools.className = 'os-start-inline-actions';
    const showAll = document.createElement('button');
    showAll.className = 'btn bg text-xs-c';
    showAll.textContent = 'Show All Apps';
    showAll.onclick = function(clickEvent) {
      clickEvent.stopPropagation();
      showAllStartApps();
    };
    tools.appendChild(showAll);
    appsHost.appendChild(tools);
  }

  if (typeof syncDetachedShellStateUI === 'function') {
    syncDetachedShellStateUI();
  }
}

// ── Layout persistence ───────────────────────────────────────────────────────

function serializeWindow(meta) {
  return {
    open: meta.open,
    maximized: meta.maximized,
    left: parseFloat(meta.el.style.left) || 0,
    top: parseFloat(meta.el.style.top) || 0,
    width: parseFloat(meta.el.style.width) || 900,
    height: parseFloat(meta.el.style.height) || 640,
    z: parseInt(meta.el.style.zIndex || '1', 10)
  };
}

function saveWindowLayout() {
  const layout = {};
  windowManager.windows.forEach((meta, tabName) => {
    layout[tabName] = serializeWindow(meta);
  });
  try {
    localStorage.setItem(WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    lg('ok', 'Window layout saved');
  } catch (err) {
    lg('warn', 'Could not save window layout: ' + err.message);
  }
}

function restoreWindowLayout() {
  let raw = null;
  try {
    raw = localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY);
  } catch (_) {
    raw = null;
  }
  if (!raw) return false;

  let layout = null;
  try {
    layout = JSON.parse(raw);
  } catch (_) {
    return false;
  }
  if (!layout || typeof layout !== 'object') return false;

  const stage = getStageRect();
  windowManager.windows.forEach((meta, tabName) => {
    const item = layout[tabName];
    if (!item) {
      closeWindow(tabName);
      return;
    }
    const restoredLeft = Number(item.left) || 0;
    const restoredTop  = Number(item.top)  || 0;
    const restoredW    = Number(item.width)  || 900;
    const restoredH    = Number(item.height) || 640;
    // Clamp off-screen windows back into the visible stage area
    const safeLeft = Math.max(0, Math.min(restoredLeft, stage.width  - Math.min(restoredW, 200)));
    const safeTop  = Math.max(0, Math.min(restoredTop,  stage.height - Math.min(restoredH, 80)));
    setWindowRect(meta, { left: safeLeft, top: safeTop, width: restoredW, height: restoredH });
    meta.el.style.zIndex = String(Number(item.z) || 10);
    if (item.open) {
      openWindow(tabName, { center: false });
      toggleMaximizeWindow(tabName, !!item.maximized);
    } else {
      closeWindow(tabName);
    }
  });

  const topWindow = Array.from(windowManager.windows.values())
    .filter((meta) => meta.open)
    .sort((a, b) => (parseInt(b.el.style.zIndex || '1', 10) - parseInt(a.el.style.zIndex || '1', 10)))[0];
  if (topWindow) focusWindow(topWindow.tab);
  syncShellStatusWidgets();
  return true;
}

function resetWindowLayout() {
  try {
    localStorage.removeItem(WINDOW_LAYOUT_STORAGE_KEY);
  } catch (_) {
    // ignore
  }
  windowManager.windows.forEach((_, tabName) => closeWindow(tabName));
  switchMainTab('chat');
}

// ── Initialization ───────────────────────────────────────────────────────────

function initWindowManager() {
  if (windowManager.initialized) return;
  const stage = document.getElementById('windowStage');
  if (!stage) return;

  windowManager.stage = stage;
  windowManager.popoutTab = new URLSearchParams(window.location.search).get('popout');
  windowManager.dock.overlay = document.getElementById('wmSnapDock');

  stage.querySelectorAll('.tab-content').forEach((tabElement) => {
    const id = tabElement.id || '';
    const tabName = id.replace(/^tab-/, '');
    if (!tabName) return;
    createWindowShell(tabName, tabElement);
  });

  windowManager.initialized = true;

  if (windowManager.popoutTab && !windowManager.windows.has(windowManager.popoutTab)) {
    windowManager.popoutTab = null;
  }

  if (windowManager.popoutTab && windowManager.windows.has(windowManager.popoutTab)) {
    document.body.classList.add('popout-mode');
    windowManager.windows.forEach((_, tabName) => closeWindow(tabName));
    openWindow(windowManager.popoutTab, { maximize: true, center: false });
  }

  window.addEventListener('resize', () => {
    windowManager.windows.forEach((meta) => {
      if (meta.maximized) {
        toggleMaximizeWindow(meta.tab, true);
      } else {
        setWindowRect(meta, {
          left: parseFloat(meta.el.style.left) || 0,
          top: parseFloat(meta.el.style.top) || 0,
          width: parseFloat(meta.el.style.width) || 900,
          height: parseFloat(meta.el.style.height) || 640
        });
      }
    });
    updateTaskbarOverflow();
  });
}
