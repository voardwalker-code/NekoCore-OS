// ── Client · Context Menu ────────────────────────────────────────────────────
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

/* ╔══════════════════════════════════════════════════════════════╗
   ║  CONTEXT MENU SYSTEM                                       ║
   ║  Custom right-click menus replacing browser default         ║
   ║  Extracted from app.js — P2-S4                              ║
   ║  Depends on: app.js (globals), vfs.js (vfs)                 ║
   ╚══════════════════════════════════════════════════════════════╝ */

// ctxMenu()
// Purpose: helper wrapper used by this module's main flow.
// ctxMenu()
// WHAT THIS DOES: ctxMenu is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ctxMenu(...) where this helper behavior is needed.
const ctxMenu = (function() {
  const el = document.getElementById('ctxMenu');
  if (!el) return { show() {}, hide() {} };

  // hide()
  // WHAT THIS DOES: hide is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call hide(...) where this helper behavior is needed.
  function hide() {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '';
  }
  // show()
  // WHAT THIS DOES: show builds or updates what the user sees.
  // WHY IT EXISTS: display logic is separated from data/business logic for clarity.
  // HOW TO USE IT: call show(...) after state changes that need UI refresh.
  function show(x, y, items) {
    el.innerHTML = '';
    items.forEach(function(item) {
      if (item === '---') {
        const sep = document.createElement('div');
        sep.className = 'ctx-menu-sep';
        el.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'ctx-menu-item' + (item.danger ? ' danger' : '');
      btn.setAttribute('role', 'menuitem');
      btn.innerHTML = (item.icon ? '<span class="ctx-icon">' + item.icon + '</span>' : '') + item.label;
      btn.onclick = function(e) {
        e.stopPropagation();
        hide();
        if (item.action) item.action();
      };
      el.appendChild(btn);
    });

    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');

    // Position — keep within viewport
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = el.offsetWidth;
    const menuH = el.offsetHeight;
    const finalX = x + menuW > vw ? Math.max(4, vw - menuW - 4) : x;
    const finalY = y + menuH > vh ? Math.max(4, vh - menuH - 4) : y;
    el.style.left = finalX + 'px';
    el.style.top = finalY + 'px';
  }

  // Close on any click outside
  document.addEventListener('click', function() { hide(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') hide(); });

  return { show: show, hide: hide };
})();

// hasDetachedPopout()
// WHAT THIS DOES: hasDetachedPopout answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call hasDetachedPopout(...) and branch logic based on true/false.
function hasDetachedPopout(tab) {
  return !!(tab && typeof isPopoutOpen === 'function' && isPopoutOpen(tab));
}
function buildPopoutContextItems(tab) {
  if (!tab) return [];
  const detached = hasDetachedPopout(tab);
  const items = [
    {
      icon: '↗',
      label: detached ? 'Focus Detached Window' : 'Pop Out to Desktop',
      action: function() {
        if (typeof focusDetachedPopout === 'function') focusDetachedPopout(tab);
        else if (typeof popOutWindow === 'function') popOutWindow(tab);
      }
    }
  ];
  if (detached) {
    items.push({
      icon: '✕',
      label: 'Close Detached Window',
      action: function() {
        if (typeof requestPopoutClose === 'function') requestPopoutClose(tab);
      }
    });
  }
  return items;
}

// Block browser context menu everywhere inside the app shell
document.addEventListener('contextmenu', function(e) {
  const target = e.target;

  // Allow context menu on actual <input> and <textarea> for text editing
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

  e.preventDefault();

  // ── Pinned app on taskbar ──
  const taskbarAppBtn = target.closest('.os-pinned-app, .os-dash-app, .os-overflow-app, .os-running-app');
  if (taskbarAppBtn) {
    const tab = taskbarAppBtn.getAttribute('data-tab');
    const app = getWindowApp(tab);
    const appLabel = app?.label || tab || 'App';
    const appIcon = app?.icon || '🪟';
    const meta = windowManager && windowManager.windows ? windowManager.windows.get(tab) : null;
    const isOpen = !!(meta && meta.open);
    ctxMenu.show(e.clientX, e.clientY, [
      { icon: appIcon, label: 'Open ' + appLabel, action: function() { switchMainTab(tab); } },
      { icon: '✕', label: 'Close ' + appLabel, danger: isOpen, action: function() { closeWindow(tab); } },
      '---',
      { icon: '📌', label: 'Unpin from Taskbar', action: function() { togglePinnedApp(tab); } },
      ...buildPopoutContextItems(tab),
      '---',
      { icon: '📄', label: 'Create Shortcut on Desktop', action: function() { vfs.createDesktopShortcut(tab); } }
    ]);
    return;
  }

  const taskbarArea = target.closest('.os-taskbar, .os-taskbar-inner, .os-taskbar-left, .os-taskbar-center, .os-taskbar-tray, .nk-quick-bar');
  if (taskbarArea) {
    ctxMenu.show(e.clientX, e.clientY, [
      { icon: '🛠️', label: taskbarEditMode ? 'Finish Editing Taskbar' : 'Edit Taskbar', action: function() { if (taskbarEditMode) stopTaskbarEditMode(); else startTaskbarEditMode(); } },
      { icon: '↔️', label: 'Move Left', action: function() { setTaskbarAlign('left'); } },
      { icon: '⏺️', label: 'Center Taskbar', action: function() { setTaskbarAlign('center'); } },
      { icon: '➡️', label: 'Move Right', action: function() { setTaskbarAlign('right'); } },
      '---',
      { icon: '◧-', label: 'Smaller Icons', action: function() { adjustTaskbarIconScale(-0.05); } },
      { icon: '◧+', label: 'Larger Icons', action: function() { adjustTaskbarIconScale(0.05); } },
      '---',
      { icon: 'A-', label: 'Smaller', action: function() { adjustTaskbarScale(-0.05); } },
      { icon: 'A+', label: 'Larger', action: function() { adjustTaskbarScale(0.05); } },
      { icon: '↺', label: 'Reset Taskbar', action: function() { resetTaskbarLayout(); } }
    ]);
    return;
  }

  // ── Desktop shortcut (static) ──
  const shortcut = target.closest('.os-shortcut');
  if (shortcut) {
    const tab = shortcut.getAttribute('data-tab');
    ctxMenu.show(e.clientX, e.clientY, [
      { icon: '🚀', label: 'Open', action: function() { switchMainTab(tab); } },
      ...buildPopoutContextItems(tab),
      { icon: '📌', label: isPinnedApp(tab) ? 'Unpin from Taskbar' : 'Pin to Taskbar', action: function() { togglePinnedApp(tab); } }
    ]);
    return;
  }

  // ── Desktop file / folder ──
  const desktopFile = target.closest('.desktop-file');
  if (desktopFile) {
    const path = desktopFile.getAttribute('data-path');
    const entry = vfs.stat(path);
    if (!entry) return;
    const items = [];
    if (entry.type === 'folder') {
      items.push({ icon: '📂', label: 'Open Folder', action: function() { vfs.openFolder(path); } });
    } else if (entry.type === 'shortcut' && entry.launchTab) {
      items.push({ icon: '🚀', label: 'Open', action: function() { switchMainTab(entry.launchTab); } });
    } else {
      items.push({ icon: '📄', label: 'Open', action: function() { vfs.openFile(path); } });
    }
    items.push('---');
    items.push({ icon: '✏️', label: 'Rename', action: function() { vfs.beginRename(desktopFile); } });
    items.push({ icon: '🗑️', label: 'Delete', danger: true, action: function() { vfs.remove(path); } });
    ctxMenu.show(e.clientX, e.clientY, items);
    return;
  }

  // ── Empty desktop area ──
  const desktopArea = target.closest('.os-desktop-files, .os-home');
  if (desktopArea) {
    ctxMenu.show(e.clientX, e.clientY, [
      { icon: '📄', label: 'New Document', action: function() { vfs.createOnDesktop('document'); } },
      { icon: '📁', label: 'New Folder', action: function() { vfs.createOnDesktop('folder'); } },
      { icon: '📝', label: 'New Note', action: function() { vfs.createOnDesktop('note'); } },
      '---',
      { icon: '🎨', label: 'Customize Desktop', action: function() { if (typeof window.openThemeCustomizer === 'function') window.openThemeCustomizer(); else switchMainTab('themes'); } },
      { icon: '🔄', label: 'Refresh Desktop', action: function() { vfs.renderDesktop(); } }
    ]);
    return;
  }

  // ── Start menu app items ──
  const startAppItem = target.closest('.os-start-app-item, .os-start-pinned-app');
  if (startAppItem) {
    const tab = startAppItem.getAttribute('data-tab');
    const app = getWindowApp(tab);
    if (!app) return;
    ctxMenu.show(e.clientX, e.clientY, [
      { icon: app.icon, label: 'Open ' + app.label, action: function() { switchMainTab(tab); } },
      ...buildPopoutContextItems(tab),
      { icon: '📌', label: isPinnedApp(tab) ? 'Unpin from Taskbar' : 'Pin to Taskbar', action: function() { togglePinnedApp(tab); } },
      { icon: '📄', label: 'Create Desktop Shortcut', action: function() { vfs.createDesktopShortcut(tab); } }
    ]);
    return;
  }

  // ── Window titlebar ──
  const titlebar = target.closest('.wm-titlebar');
  if (titlebar) {
    const appEl = titlebar.closest('.wm-window, .app');
    if (!appEl) return;
    const tab = appEl.getAttribute('data-tab');
    const app = getWindowApp(tab);
    if (!app) return;
    ctxMenu.show(e.clientX, e.clientY, [
      ...buildPopoutContextItems(tab),
      { icon: '📌', label: isPinnedApp(tab) ? 'Unpin from Taskbar' : 'Pin to Taskbar', action: function() { togglePinnedApp(tab); } },
      { icon: '📄', label: 'Create Desktop Shortcut', action: function() { vfs.createDesktopShortcut(tab); } },
      '---',
      { icon: '✕', label: 'Close Window', danger: true, action: function() { closeWindow(tab); } }
    ]);
    return;
  }

  // ── Fallback: Desktop background (body, empty areas) ──
  ctxMenu.show(e.clientX, e.clientY, [
    { icon: '📄', label: 'New Document', action: function() { vfs.createOnDesktop('document'); } },
    { icon: '📁', label: 'New Folder', action: function() { vfs.createOnDesktop('folder'); } },
    { icon: '📝', label: 'New Note', action: function() { vfs.createOnDesktop('note'); } },
    '---',
    { icon: '🎨', label: 'Customize Desktop', action: function() { if (typeof window.openThemeCustomizer === 'function') window.openThemeCustomizer(); else switchMainTab('themes'); } },
    { icon: '🔄', label: 'Refresh Desktop', action: function() { vfs.renderDesktop(); } }
  ]);
});
