/* Desktop shell extracted from app.js - P3-S2 */

/* eslint-disable no-undef */

function closeStartMenu() {
  const menu = document.getElementById('osStartMenu');
  const scrim = document.getElementById('osStartScrim');
  const button = document.getElementById('osStartButton');
  if (menu) {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
  }
  if (scrim) scrim.classList.remove('open');
  if (button) button.setAttribute('aria-expanded', 'false');
  closeStartPowerMenu();
}

function updateStartUserChip() {
  const nameEl = document.getElementById('osStartUserName');
  if (!nameEl) return;

  try {
    const account = typeof getCurrentAccount === 'function' ? getCurrentAccount() : null;
    if (account && (account.displayName || account.username)) {
      nameEl.textContent = account.displayName || account.username;
      return;
    }
  } catch (_) {}

  const fallback = document.getElementById('accountUsername');
  const fallbackName = fallback ? String(fallback.textContent || '').trim() : '';
  nameEl.textContent = fallbackName || 'NekoCore User';
}

function closeStartPowerMenu() {
  const powerMenu = document.getElementById('osStartPowerMenu');
  const powerButton = document.getElementById('osStartPowerButton');
  if (powerMenu) {
    powerMenu.classList.remove('open');
    powerMenu.setAttribute('aria-hidden', 'true');
  }
  if (powerButton) powerButton.setAttribute('aria-expanded', 'false');
}

function toggleStartPowerMenu(forceOpen) {
  const powerMenu = document.getElementById('osStartPowerMenu');
  const powerButton = document.getElementById('osStartPowerButton');
  if (!powerMenu) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !powerMenu.classList.contains('open');
  powerMenu.classList.toggle('open', shouldOpen);
  powerMenu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  if (powerButton) powerButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function restartShellUI() {
  closeStartMenu();
  window.location.reload();
}

function toggleStartMenu(forceOpen) {
  const menu = document.getElementById('osStartMenu');
  const scrim = document.getElementById('osStartScrim');
  const button = document.getElementById('osStartButton');
  if (!menu || !scrim) return;

  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !menu.classList.contains('open');
  menu.classList.toggle('open', shouldOpen);
  menu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  scrim.classList.toggle('open', shouldOpen);
  if (button) button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  if (shouldOpen) {
    startCategoryViewMode = 'categories';
    updateStartUserChip();
    buildLauncherMenu();
  }
}

function openStartCategoryApps(categoryId) {
  if (!categoryId) return;
  selectedStartCategoryId = categoryId;
  startCategoryViewMode = 'apps';
  buildLauncherMenu();
}

function showStartCategories() {
  startCategoryViewMode = 'categories';
  buildLauncherMenu();
}

function showAllStartApps() {
  startCategoryViewMode = 'all';
  buildLauncherMenu();
}

function getDefaultTaskbarLayout() {
  const viewportWidth = Math.max(780, window.innerWidth || 1280);
  return {
    align: 'center',
    width: Math.max(720, Math.min(1120, viewportWidth - 40)),
    height: 68,
    iconScale: 1
  };
}

function normalizeTaskbarLayout(layout) {
  const next = layout && typeof layout === 'object' ? layout : {};
  const defaults = getDefaultTaskbarLayout();
  const align = ['left', 'center', 'right'].includes(next.align) ? next.align : 'center';
  const legacyScale = Math.max(0.72, Math.min(1.08, Number(next.scale) || 0.84));
  const maxWidth = Math.max(640, (window.innerWidth || defaults.width) - 24);
  const width = Math.max(640, Math.min(maxWidth, Number(next.width) || Math.round(defaults.width * legacyScale)));
  const height = Math.max(56, Math.min(120, Number(next.height) || Math.round(defaults.height * legacyScale)));
  const iconScale = Math.max(0.75, Math.min(1.35, Number(next.iconScale) || 1));
  return { align, width: Math.round(width), height: Math.round(height), iconScale: Math.round(iconScale * 100) / 100 };
}

function applyTaskbarLayout() {
  const taskbar = document.querySelector('.os-taskbar');
  const editor = document.getElementById('osTaskbarEditor');
  const body = document.body;
  if (!taskbar) return;
  taskbarLayout = normalizeTaskbarLayout(taskbarLayout);
  const uiScale = Math.max(0.82, Math.min(1.22, taskbarLayout.height / 68));
  taskbar.dataset.align = taskbarLayout.align;
  taskbar.style.setProperty('--taskbar-scale', String(uiScale));
  taskbar.style.setProperty('--taskbar-icon-scale', String(taskbarLayout.iconScale || 1));
  taskbar.style.setProperty('--taskbar-width', taskbarLayout.width + 'px');
  taskbar.style.setProperty('--taskbar-height', taskbarLayout.height + 'px');
  taskbar.classList.toggle('is-editing', taskbarEditMode);
  if (editor) editor.hidden = !taskbarEditMode;
  if (body) body.style.setProperty('--taskbar-shell-space', (taskbarLayout.height + 40) + 'px');
  updateTaskbarOverflow();
  scheduleLayoutResizeSignal({ source: 'taskbar-layout' });
}

function saveTaskbarLayout(showLog) {
  try {
    localStorage.setItem(TASKBAR_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeTaskbarLayout(taskbarLayout)));
    if (showLog) lg('ok', `Taskbar saved: ${taskbarLayout.align}, ${taskbarLayout.width}x${taskbarLayout.height}`);
  } catch (err) {
    if (showLog) lg('warn', 'Could not save taskbar layout: ' + err.message);
  }
}

function loadTaskbarLayout() {
  try {
    const raw = localStorage.getItem(TASKBAR_LAYOUT_STORAGE_KEY);
    if (raw) taskbarLayout = normalizeTaskbarLayout(JSON.parse(raw));
  } catch (_) {
    taskbarLayout = normalizeTaskbarLayout(taskbarLayout);
  }
  applyTaskbarLayout();
}

function setTaskbarAlign(align, persist) {
  taskbarLayout.align = align;
  applyTaskbarLayout();
  if (persist !== false) saveTaskbarLayout(false);
}

function adjustTaskbarScale(delta, silent) {
  const next = normalizeTaskbarLayout({
    align: taskbarLayout.align,
    width: taskbarLayout.width + (delta * 420),
    height: taskbarLayout.height + (delta * 56),
    iconScale: taskbarLayout.iconScale
  });
  taskbarLayout.width = next.width;
  taskbarLayout.height = next.height;
  taskbarLayout.iconScale = next.iconScale;
  applyTaskbarLayout();
  saveTaskbarLayout(false);
  if (!silent) lg('ok', `Taskbar size ${taskbarLayout.width}x${taskbarLayout.height}`);
}

function adjustTaskbarIconScale(delta, silent) {
  const next = normalizeTaskbarLayout({
    align: taskbarLayout.align,
    width: taskbarLayout.width,
    height: taskbarLayout.height,
    iconScale: (taskbarLayout.iconScale || 1) + delta
  });
  taskbarLayout.iconScale = next.iconScale;
  applyTaskbarLayout();
  saveTaskbarLayout(false);
  if (!silent) lg('ok', `Taskbar icon size ${Math.round(taskbarLayout.iconScale * 100)}%`);
}

function startTaskbarEditMode() {
  taskbarEditMode = true;
  applyTaskbarLayout();
  lg('ok', 'Taskbar edit mode: drag the dock to move it, drag the top or side handles to resize it, or use A-/A+ for coarse size changes.');
}

function stopTaskbarEditMode() {
  taskbarEditMode = false;
  taskbarDragPointerId = null;
  taskbarResizeState = null;
  applyTaskbarLayout();
  saveTaskbarLayout(true);
}

function resetTaskbarLayout() {
  taskbarLayout = getDefaultTaskbarLayout();
  taskbarEditMode = false;
  taskbarResizeState = null;
  applyTaskbarLayout();
  saveTaskbarLayout(true);
}

function bindTaskbarEditor() {
  const inner = document.querySelector('.os-taskbar-inner');
  if (!inner || inner.dataset.taskbarEditorBound === '1') return;
  const editor = document.getElementById('osTaskbarEditor');
  const iconDown = document.getElementById('taskbarIconDownBtn');
  const iconUp = document.getElementById('taskbarIconUpBtn');
  const sizeDown = document.getElementById('taskbarSizeDownBtn');
  const sizeUp = document.getElementById('taskbarSizeUpBtn');
  const doneBtn = document.getElementById('taskbarEditDoneBtn');

  if (editor && editor.dataset.bound !== '1') {
    const onIconDown = () => adjustTaskbarIconScale(-0.05);
    const onIconUp = () => adjustTaskbarIconScale(0.05);
    const onSizeDown = () => adjustTaskbarScale(-0.05);
    const onSizeUp = () => adjustTaskbarScale(0.05);
    const onDone = (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopTaskbarEditMode();
    };
    if (iconDown) { iconDown.addEventListener('click', onIconDown); iconDown.onclick = onIconDown; }
    if (iconUp) { iconUp.addEventListener('click', onIconUp); iconUp.onclick = onIconUp; }
    if (sizeDown) { sizeDown.addEventListener('click', onSizeDown); sizeDown.onclick = onSizeDown; }
    if (sizeUp) { sizeUp.addEventListener('click', onSizeUp); sizeUp.onclick = onSizeUp; }
    if (doneBtn) { doneBtn.addEventListener('click', onDone); doneBtn.onclick = onDone; }
    editor.dataset.bound = '1';
  }

  const finishPointerAction = (event) => {
    if (taskbarResizeState && taskbarResizeState.pointerId === event.pointerId) {
      taskbarResizeState = null;
      saveTaskbarLayout(false);
      return;
    }
    if (taskbarDragPointerId === event.pointerId) {
      taskbarDragPointerId = null;
      saveTaskbarLayout(false);
    }
  };

  inner.addEventListener('pointerdown', (event) => {
    if (!taskbarEditMode) return;
    if (event.button !== 0) return;
    const resizeHandle = event.target.closest('[data-taskbar-resize]');
    if (resizeHandle) {
      taskbarResizeState = {
        pointerId: event.pointerId,
        edge: resizeHandle.getAttribute('data-taskbar-resize'),
        startX: event.clientX,
        startY: event.clientY,
        startWidth: taskbarLayout.width,
        startHeight: taskbarLayout.height
      };
      try { inner.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
      return;
    }
    if (event.target.closest('button, input, textarea, a')) return;
    taskbarDragPointerId = event.pointerId;
    try { inner.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  });

  inner.addEventListener('pointermove', (event) => {
    if (taskbarResizeState && taskbarResizeState.pointerId === event.pointerId) {
      const dx = event.clientX - taskbarResizeState.startX;
      const dy = event.clientY - taskbarResizeState.startY;
      if (taskbarResizeState.edge === 'e') {
        taskbarLayout.width = taskbarResizeState.startWidth + dx;
      } else if (taskbarResizeState.edge === 'w') {
        taskbarLayout.width = taskbarResizeState.startWidth - dx;
      } else if (taskbarResizeState.edge === 'n') {
        taskbarLayout.height = taskbarResizeState.startHeight - dy;
      }
      applyTaskbarLayout();
      return;
    }
    if (!taskbarEditMode || taskbarDragPointerId !== event.pointerId) return;
    const ratio = Math.max(0, Math.min(1, event.clientX / Math.max(window.innerWidth, 1)));
    const nextAlign = ratio < 0.34 ? 'left' : (ratio > 0.66 ? 'right' : 'center');
    if (nextAlign !== taskbarLayout.align) setTaskbarAlign(nextAlign, false);
  });

  inner.addEventListener('pointerup', finishPointerAction);
  inner.addEventListener('pointercancel', finishPointerAction);
  inner.addEventListener('wheel', (event) => {
    if (!taskbarEditMode) return;
    if (event.target.closest('input, textarea')) return;
    event.preventDefault();
    adjustTaskbarScale(event.deltaY > 0 ? -0.03 : 0.03, true);
  }, { passive: false });

  inner.dataset.taskbarEditorBound = '1';
}

function initDesktopShell() {
  if (desktopShellInitialized) return;
  desktopShellInitialized = true;

  if (typeof applyTheme === 'function') applyTheme(typeof getStoredThemeId === 'function' ? getStoredThemeId() : null);
  initWindowManager();
  loadBrowserSearchHistory();
  renderBrowserSearchHome();
  loadPinnedApps();
  loadTaskbarLayout();
  updateStartUserChip();
  buildLauncherMenu();
  renderPinnedApps();
  bindTaskbarEditor();
  updateShellClock();
  syncShellStatusWidgets();
  updateTaskManagerView();
  syncNavSidebarEntities();
  syncNavSidebarProfiles();

  if (!windowManager.popoutTab) {
    const restored = restoreWindowLayout();
    if (!restored) {
      switchMainTab('chat');
    }
  }

  shellClockTimer = window.setInterval(updateShellClock, 30000);
  shellStatusTimer = window.setInterval(syncShellStatusWidgets, 4000);
  window.setInterval(updateTaskManagerView, 1200);
  startWebUiPresenceHeartbeat();

  document.addEventListener('keydown', (event) => {
    if (taskbarEditMode && event.key === 'Escape') {
      stopTaskbarEditMode();
      return;
    }
    if (event.key === 'Escape') closeStartMenu();
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (taskbarEditMode && !target.closest('.os-taskbar')) {
      stopTaskbarEditMode();
    }

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const clickedInStartMenu = path.includes(document.getElementById('osStartMenu'));
    const clickedStartButton = path.includes(document.getElementById('osStartButton'));
    const clickedTaskbarLeft = path.includes(document.querySelector('.os-taskbar-left'));

    if (!target.closest('.os-start-power-wrap')) {
      closeStartPowerMenu();
    }
    if (clickedInStartMenu || clickedStartButton || clickedTaskbarLeft) return;
    closeStartMenu();
  });

  window.addEventListener('beforeunload', () => {
    if (!windowManager.popoutTab) saveWindowLayout();
    if (typeof browserCleanup === 'function') browserCleanup();
    reportWebUiPresence(false, { beacon: true });

    // Release active entity on page unload so the server clears brain modules
    // and the checkout lock is freed for other users.
    if (typeof currentEntityId === 'string' && currentEntityId) {
      try {
        const blob = new Blob(
          [JSON.stringify({ entityId: currentEntityId })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('/api/entities/release', blob);
      } catch (_) {}
    }
  });
}

function reportWebUiPresence(isOpen, options = {}) {
  const payload = JSON.stringify({
    isOpen: !!isOpen,
    url: window.location.origin
  });

  if (options.beacon && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/system/webui-presence', blob);
    return;
  }

  fetch('/api/system/webui-presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: !!options.keepalive
  }).catch(() => {});
}

function startWebUiPresenceHeartbeat() {
  if (webUiPresenceStarted) return;
  webUiPresenceStarted = true;

  reportWebUiPresence(true);
  webUiPresenceTimer = window.setInterval(() => reportWebUiPresence(true), 15000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reportWebUiPresence(true);
  });
}

function getWindowApp(tabName) {
  const sourceApps = typeof getShellWindowApps === 'function' ? getShellWindowApps() : WINDOW_APPS;
  return sourceApps.find((app) => app.tab === tabName)
    || { tab: tabName, label: tabName, icon: '<img src="/shared-assets/AppTrayIcon.png" alt="" aria-hidden="true" class="os-runtime-icon-img">', w: 900, h: 640 };
}

function loadPinnedApps() {
  let hasStoredPins = false;
  try {
    const raw = localStorage.getItem(PINNED_APPS_STORAGE_KEY);
    if (raw !== null) {
      hasStoredPins = true;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sourceApps = typeof getShellWindowApps === 'function' ? getShellWindowApps() : WINDOW_APPS;
        pinnedApps = parsed.filter((tab) => sourceApps.some((app) => app.tab === tab));
      } else {
        pinnedApps = [];
      }
    }
  } catch (_) {
    pinnedApps = [];
  }

  if (!hasStoredPins && !pinnedApps.length) pinnedApps = [...DEFAULT_PINNED_APPS];
}

function savePinnedApps() {
  try {
    localStorage.setItem(PINNED_APPS_STORAGE_KEY, JSON.stringify(pinnedApps));
  } catch (_) {}
}

function isPinnedApp(tabName) {
  return pinnedApps.includes(tabName);
}

function togglePinnedApp(tabName) {
  if (isPinnedApp(tabName)) {
    pinnedApps = pinnedApps.filter((tab) => tab !== tabName);
  } else {
    pinnedApps.push(tabName);
  }
  savePinnedApps();
  buildLauncherMenu();
  renderPinnedApps();
}

function reorderPinnedApps(dragTab, beforeTab) {
  if (!dragTab || !pinnedApps.includes(dragTab)) return;
  const next = pinnedApps.filter((tab) => tab !== dragTab);
  const insertAt = beforeTab && next.includes(beforeTab) ? next.indexOf(beforeTab) : next.length;
  next.splice(insertAt, 0, dragTab);
  pinnedApps = next;
  savePinnedApps();
  buildLauncherMenu();
  renderPinnedApps();
}

function clearPinnedDropTargets() {
  document.querySelectorAll('.os-pinned-app.drop-target, .os-dash-app.drop-target').forEach((el) => {
    el.classList.remove('drop-target');
  });
}

function onPinnedDragStart(event) {
  const el = event.currentTarget;
  if (!(el instanceof Element)) return;
  const tab = el.getAttribute('data-tab');
  if (!tab) return;
  pinnedDragState.tab = tab;
  pinnedDragState.source = el.classList.contains('os-dash-app') ? 'dash' : 'taskbar';
  el.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tab);
  }
}

function onPinnedDragEnd(event) {
  const el = event.currentTarget;
  if (el instanceof Element) el.classList.remove('is-dragging');
  pinnedDragState.tab = null;
  pinnedDragState.source = null;
  pinnedDragState.hoveringTab = null;
  clearPinnedDropTargets();
}

function onPinnedDragOver(event) {
  if (!pinnedDragState.tab) return;
  event.preventDefault();
  const el = event.currentTarget;
  if (!(el instanceof Element)) return;
  const targetTab = el.getAttribute('data-tab');
  if (!targetTab || targetTab === pinnedDragState.tab) return;
  clearPinnedDropTargets();
  el.classList.add('drop-target');
  pinnedDragState.hoveringTab = targetTab;
}

function onPinnedDrop(event) {
  if (!pinnedDragState.tab) return;
  event.preventDefault();
  const el = event.currentTarget;
  const targetTab = el instanceof Element ? el.getAttribute('data-tab') : null;
  reorderPinnedApps(pinnedDragState.tab, targetTab || pinnedDragState.hoveringTab || null);
  clearPinnedDropTargets();
}

function onPinnedContainerDragOver(event) {
  if (!pinnedDragState.tab) return;
  event.preventDefault();
}

function onPinnedContainerDrop(event) {
  if (!pinnedDragState.tab) return;
  event.preventDefault();
  if (pinnedDragState.hoveringTab) {
    reorderPinnedApps(pinnedDragState.tab, pinnedDragState.hoveringTab);
  } else {
    reorderPinnedApps(pinnedDragState.tab, null);
  }
  clearPinnedDropTargets();
}

function createPinnedButton(app, className) {
  const button = document.createElement('button');
  button.className = className;
  button.setAttribute('data-tab', app.tab);
  button.title = app.label;
  button.setAttribute('aria-label', app.label);
  button.innerHTML = '<span class="os-pinned-app-icon" data-accent="' + (app.accent || 'green') + '">' + app.icon + '</span>';
  button.onclick = function() { taskbarAppClick(app.tab); };
  button.draggable = true;
  button.addEventListener('dragstart', onPinnedDragStart);
  button.addEventListener('dragend', onPinnedDragEnd);
  button.addEventListener('dragover', onPinnedDragOver);
  button.addEventListener('drop', onPinnedDrop);
  return button;
}

function syncDetachedShellStateUI(registry) {
  const detachedRegistry = registry && typeof registry === 'object'
    ? registry
    : (typeof getPopoutRegistrySnapshot === 'function' ? getPopoutRegistrySnapshot() : {});

  const isDetached = (tabName) => !!(tabName && detachedRegistry && detachedRegistry[tabName]);

  document.querySelectorAll('.os-pinned-app[data-tab], .os-dash-app[data-tab], .os-overflow-app[data-tab], .os-shortcut[data-tab], .wm-window[data-tab]').forEach((el) => {
    const tabName = el.getAttribute('data-tab');
    const detached = isDetached(tabName);
    el.classList.toggle('is-detached', detached);
    if (el.classList.contains('wm-window')) {
      el.setAttribute('data-detached', detached ? 'true' : 'false');
    }
    if (el.classList.contains('os-pinned-app') || el.classList.contains('os-dash-app') || el.classList.contains('os-overflow-app')) {
      const app = getWindowApp(tabName);
      const label = app && app.label ? app.label : tabName;
      el.title = detached ? label + ' (Detached window active)' : label;
      el.setAttribute('aria-label', detached ? label + ' detached window active' : label);
    }
  });

  document.querySelectorAll('.os-launcher-item[data-tab]').forEach((el) => {
    const tabName = el.getAttribute('data-tab');
    const detached = isDetached(tabName);
    el.classList.toggle('is-detached', detached);

    let badge = el.querySelector('.launcher-detached-badge');
    if (detached && !badge) {
      badge = document.createElement('span');
      badge.className = 'launcher-detached-badge';
      badge.textContent = 'Detached';
      const pin = el.querySelector('.launcher-pin-btn');
      if (pin && pin.parentNode === el) {
        el.insertBefore(badge, pin);
      } else {
        el.appendChild(badge);
      }
    } else if (!detached && badge) {
      badge.remove();
    }
  });
}

function updateTaskbarOverflow() {
  if (taskbarOverflowRaf) {
    cancelAnimationFrame(taskbarOverflowRaf);
    taskbarOverflowRaf = 0;
  }

  taskbarOverflowRaf = requestAnimationFrame(() => {
    taskbarOverflowRaf = 0;
    const center = document.getElementById('osTaskbarCenter');
    const startBtn = document.getElementById('osStartButton');
    const taskbarHost = document.getElementById('osTaskbarPinned');
    const overflowWrap = document.getElementById('osTaskbarOverflowWrap');
    const overflowMenu = document.getElementById('osTaskbarOverflowMenu');
    const overflowButton = document.getElementById('osTaskbarOverflowButton');
    if (!center || !startBtn || !taskbarHost || !overflowWrap || !overflowMenu || !overflowButton) return;

    overflowMenu.innerHTML = '';
    overflowWrap.classList.remove('open');
    overflowWrap.style.display = 'none';
    overflowButton.setAttribute('aria-expanded', 'false');

    const allButtons = Array.from(taskbarHost.querySelectorAll('.os-pinned-app'));
    if (!allButtons.length) return;

    allButtons.forEach((btn) => {
      btn.style.display = '';
    });

    const available = Math.max(120, center.clientWidth - startBtn.offsetWidth - 14);
    let used = 0;
    let visibleCount = allButtons.length;

    for (let i = 0; i < allButtons.length; i += 1) {
      const width = allButtons[i].offsetWidth + 8;
      if (used + width > available) {
        visibleCount = i;
        break;
      }
      used += width;
    }

    if (visibleCount >= allButtons.length) return;

    overflowWrap.style.display = 'inline-flex';
    overflowWrap.classList.remove('open');
    const reserve = overflowButton.offsetWidth + 8;
    while (visibleCount > 0 && used + reserve > available) {
      visibleCount -= 1;
      used -= (allButtons[visibleCount].offsetWidth + 8);
    }

    allButtons.forEach((btn, index) => {
      if (index < visibleCount) {
        btn.style.display = '';
        return;
      }
      btn.style.display = 'none';
      const clone = btn.cloneNode(true);
      clone.classList.add('os-overflow-app');
      clone.style.display = '';
      clone.onclick = function() {
        switchMainTab(clone.getAttribute('data-tab'), clone);
        overflowWrap.classList.remove('open');
        overflowButton.setAttribute('aria-expanded', 'false');
      };
      overflowMenu.appendChild(clone);
    });

    if (!overflowMenu.children.length) {
      overflowWrap.style.display = 'none';
    }
  });
}

function bindTaskbarOverflowControls() {
  const overflowWrap = document.getElementById('osTaskbarOverflowWrap');
  const overflowButton = document.getElementById('osTaskbarOverflowButton');
  if (!overflowWrap || !overflowButton || overflowButton.dataset.bound === '1') return;

  overflowButton.dataset.bound = '1';
  overflowButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const shouldOpen = !overflowWrap.classList.contains('open');
    overflowWrap.classList.toggle('open', shouldOpen);
    overflowButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#osTaskbarOverflowWrap')) return;
    overflowWrap.classList.remove('open');
    overflowButton.setAttribute('aria-expanded', 'false');
  });
}

function renderPinnedApps() {
  const taskbarHost = document.getElementById('osTaskbarPinned');
  const dashHost = document.getElementById('osSideDashPinned');
  const overflowWrap = document.getElementById('osTaskbarOverflowWrap');
  const overflowMenu = document.getElementById('osTaskbarOverflowMenu');
  if (taskbarHost) taskbarHost.innerHTML = '';
  if (dashHost) dashHost.innerHTML = '';
  if (overflowMenu) overflowMenu.innerHTML = '';
  if (overflowWrap) overflowWrap.classList.remove('open');

  if (taskbarHost && taskbarHost.dataset.dropBound !== '1') {
    taskbarHost.addEventListener('dragover', onPinnedContainerDragOver);
    taskbarHost.addEventListener('drop', onPinnedContainerDrop);
    taskbarHost.dataset.dropBound = '1';
  }
  if (dashHost && dashHost.dataset.dropBound !== '1') {
    dashHost.addEventListener('dragover', onPinnedContainerDragOver);
    dashHost.addEventListener('drop', onPinnedContainerDrop);
    dashHost.dataset.dropBound = '1';
  }

  pinnedApps.forEach((tabName) => {
    const app = getWindowApp(tabName);
    if (!windowManager.windows.has(tabName)) return;
    if (taskbarHost) taskbarHost.appendChild(createPinnedButton(app, 'os-pinned-app'));
    if (dashHost) {
      const dashBtn = document.createElement('button');
      dashBtn.className = 'os-dash-app';
      dashBtn.setAttribute('data-tab', app.tab);
      dashBtn.title = app.label;
      dashBtn.innerHTML = '<span class="os-pinned-app-icon" data-accent="' + (app.accent || 'green') + '">' + app.icon + '</span>';
      dashBtn.onclick = function() { switchMainTab(app.tab, dashBtn); };
      dashBtn.draggable = true;
      dashBtn.addEventListener('dragstart', onPinnedDragStart);
      dashBtn.addEventListener('dragend', onPinnedDragEnd);
      dashBtn.addEventListener('dragover', onPinnedDragOver);
      dashBtn.addEventListener('drop', onPinnedDrop);
      dashHost.appendChild(dashBtn);
    }
  });

  bindTaskbarOverflowControls();
  updateTaskbarOverflow();
  updateTaskManagerView();
  syncDetachedShellStateUI();
}

// ── Running‑apps taskbar (dynamic window buttons) ───────────────────────────

/**
 * Sync the #osTaskbarRunning container with all currently open windows.
 * Pinned apps that are open get an indicator dot on their pinned button instead
 * of a duplicate entry here. Non-pinned open windows get a full button.
 * Called from syncShellStatusWidgets() on every window state change.
 */
function syncRunningApps() {
  const host = document.getElementById('osTaskbarRunning');
  if (!host || !windowManager.initialized) return;

  const pinnedSet = new Set(pinnedApps);
  const focusedTab = typeof getFocusedWindowTab === 'function' ? getFocusedWindowTab() : null;

  // Collect open windows
  const running = [];
  windowManager.windows.forEach(function(meta, tabName) {
    if (!meta.open) return;
    running.push({ tab: tabName, minimized: meta.minimized, focused: tabName === focusedTab });
  });

  // Update pinned-app indicator dots (open / minimized / focused)
  document.querySelectorAll('.os-pinned-app[data-tab]').forEach(function(btn) {
    const tab = btn.getAttribute('data-tab');
    const meta = windowManager.windows.get(tab);
    const isOpen = meta && meta.open;
    const isMin = meta && meta.minimized;
    const isFocused = tab === focusedTab && isOpen && !isMin;
    btn.classList.toggle('has-window', !!isOpen);
    btn.classList.toggle('is-minimized', !!isMin);
    btn.classList.toggle('on', !!isFocused);
  });

  // Build non-pinned running buttons
  const fragment = document.createDocumentFragment();
  running.forEach(function(entry) {
    if (pinnedSet.has(entry.tab)) return; // already shown via pinned button dot
    const app = getWindowApp(entry.tab);
    const btn = document.createElement('button');
    btn.className = 'os-running-app';
    if (entry.focused) btn.classList.add('on');
    if (entry.minimized) btn.classList.add('is-minimized');
    btn.setAttribute('data-tab', entry.tab);
    btn.title = app.label + (entry.minimized ? ' (minimized)' : '');
    btn.setAttribute('aria-label', app.label);
    btn.innerHTML = '<span class="os-pinned-app-icon" data-accent="' + (app.accent || 'green') + '">' + app.icon + '</span>';
    btn.onclick = function() { taskbarAppClick(entry.tab); };
    fragment.appendChild(btn);
  });

  host.innerHTML = '';
  host.appendChild(fragment);
}

/**
 * Standard taskbar click: if the window is focused → minimize it,
 * if minimized or unfocused → open/focus it (like Windows/macOS).
 */
function taskbarAppClick(tabName) {
  var meta = windowManager.windows.get(tabName);
  if (!meta) { switchMainTab(tabName); return; }

  var focusedTab = typeof getFocusedWindowTab === 'function' ? getFocusedWindowTab() : null;

  if (meta.open && !meta.minimized && tabName === focusedTab) {
    // Currently focused → minimize
    minimizeWindow(tabName);
  } else {
    // Minimized or not focused → open / restore / focus
    switchMainTab(tabName);
  }
}