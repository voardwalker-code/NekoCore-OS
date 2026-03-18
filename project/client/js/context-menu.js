/* ╔══════════════════════════════════════════════════════════════╗
   ║  CONTEXT MENU SYSTEM                                       ║
   ║  Custom right-click menus replacing browser default         ║
   ║  Extracted from app.js — P2-S4                              ║
   ║  Depends on: app.js (globals), vfs.js (vfs)                 ║
   ╚══════════════════════════════════════════════════════════════╝ */

const ctxMenu = (function() {
  const el = document.getElementById('ctxMenu');
  if (!el) return { show() {}, hide() {} };

  function hide() {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '';
  }

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
  const pinnedBtn = target.closest('.os-pinned-app, .os-dash-app, .os-overflow-app');
  if (pinnedBtn) {
    const tab = pinnedBtn.getAttribute('data-tab');
    const app = getWindowApp(tab);
    if (!app) return;
    ctxMenu.show(e.clientX, e.clientY, [
      { icon: '📌', label: 'Unpin from Taskbar', action: function() { togglePinnedApp(tab); } },
      ...buildPopoutContextItems(tab),
      { icon: app.icon, label: 'Open ' + app.label, action: function() { switchMainTab(tab); } },
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
    { icon: '🔄', label: 'Refresh Desktop', action: function() { vfs.renderDesktop(); } }
  ]);
});
