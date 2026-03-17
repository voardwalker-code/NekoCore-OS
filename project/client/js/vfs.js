/* ╔══════════════════════════════════════════════════════════════╗
   ║  VIRTUAL FILE SYSTEM (VFS)                                 ║
   ║  localStorage-backed file/folder tree with desktop surface  ║
   ║  Extracted from app.js — P2-S4                              ║
   ║  Depends on: app.js (globals: getWindowApp, switchMainTab)  ║
   ╚══════════════════════════════════════════════════════════════╝ */

const vfs = (function() {
  const BASE = '/api/vfs';

  // Local stat cache — populated after each renderDesktop() so sync stat() works
  // for context-menu handlers that fire on already-rendered icons.
  let _cache = {};

  function apiPost(endpoint, body) {
    return fetch(BASE + '/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  // Synchronous stat from local cache (populated by renderDesktop)
  function stat(virtualPath) {
    return _cache[virtualPath] || null;
  }

  async function list(folderPath) {
    const r = await fetch(BASE + '/list?' + new URLSearchParams({ path: folderPath }));
    const data = await r.json();
    if (!data.ok) return [];
    return data.entries || [];
  }

  async function createEntry(parentPath, name, type, extra) {
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 64);
    const virtPath = parentPath === '/' ? '/' + safeName : parentPath + '/' + safeName;
    try {
      let result;
      if (type === 'folder') {
        result = await apiPost('mkdir', {
          path: virtPath,
          meta: Object.assign({ type: 'folder' }, extra || {}),
          dedup: true
        });
      } else {
        result = await apiPost('write', {
          path: virtPath,
          content: (extra && extra.content) || '',
          meta: Object.assign({ type: type }, extra || {}),
          dedup: true
        });
      }
      await renderDesktop();
      return result.path;
    } catch (e) {
      console.error('[VFS] createEntry failed:', e);
      return null;
    }
  }

  async function remove(virtualPath) {
    if (virtualPath === '/desktop' || virtualPath === '/') return;
    try {
      await apiPost('delete', { path: virtualPath });
      await renderDesktop();
    } catch (e) {
      console.error('[VFS] remove failed:', e);
    }
  }

  async function rename(virtualPath, newName) {
    const safeName = newName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 64);
    if (!safeName) return virtualPath;
    const parts = virtualPath.split('/');
    parts.pop();
    const parentPath = parts.join('/') || '/desktop';
    const newPath = parentPath + '/' + safeName;
    if (newPath === virtualPath) return virtualPath;
    try {
      const result = await apiPost('move', { from: virtualPath, to: newPath });
      await renderDesktop();
      return result.path || newPath;
    } catch (e) {
      console.error('[VFS] rename failed:', e);
      return virtualPath;
    }
  }

  async function getContent(virtualPath) {
    try {
      const r = await fetch(BASE + '/read?' + new URLSearchParams({ path: virtualPath }));
      if (!r.ok) return '';
      return r.text();
    } catch (_) { return ''; }
  }

  async function setContent(virtualPath, content) {
    try { await apiPost('write', { path: virtualPath, content }); } catch (_) {}
  }

  async function saveMeta(virtualPath, metaPatch) {
    try { await apiPost('meta', { path: virtualPath, meta: metaPatch }); } catch (_) {}
  }

  // ── Desktop rendering ──────────────────────────────────────────────────────

  function fileAccent(entry) {
    if (entry.type === 'shortcut') {
      var app = getWindowApp(entry.launchTab);
      return app ? app.accent : 'green';
    }
    if (entry.type === 'folder') return 'gold';
    if (entry.fileExt === 'note' || entry.fileExt === 'txt') return 'cyan';
    return 'indigo';
  }

  function fileIcon(entry) {
    if (entry.type === 'shortcut') {
      var app = getWindowApp(entry.launchTab);
      return app ? app.icon : '🔗';
    }
    if (entry.type === 'folder') return '📁';
    if (entry.fileExt === 'note') return '📝';
    return '📄';
  }

  var desktopSelection = null;
  var ICON_W = 96, ICON_H = 112, ICON_GAP = 8, SNAP = 8;

  function snap(v) { return Math.round(v / SNAP) * SNAP; }

  // Delete key removes selected desktop file
  document.addEventListener('keydown', function(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && desktopSelection) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) return;
      var p = desktopSelection.getAttribute('data-path');
      if (p) { desktopSelection = null; remove(p); }
    }
  });

  function autoPos(index, hostW, hostH) {
    var cols = Math.max(1, Math.floor((hostW - 48) / (ICON_W + ICON_GAP)));
    var col = index % cols;
    var row = Math.floor(index / cols);
    // anchor from bottom-left
    return {
      x: 24 + col * (ICON_W + ICON_GAP),
      y: Math.max(0, hostH - ICON_H - 8 - row * (ICON_H + ICON_GAP))
    };
  }

  async function renderDesktop() {
    var host = document.getElementById('desktopFilesArea');
    if (!host) return;

    var items;
    try { items = await list('/desktop'); } catch (_) { items = []; }

    // Refresh sync stat cache
    _cache = {};
    items.forEach(function(item) { _cache[item.path] = item; });

    host.innerHTML = '';

    // One-time host listeners
    if (!host._bound) {
      host._bound = true;
      host.addEventListener('click', function(e) {
        if (e.target === host) {
          if (desktopSelection) desktopSelection.classList.remove('selected');
          desktopSelection = null;
        }
      });
    }

    var hostRect = host.getBoundingClientRect();
    var hostW = hostRect.width || window.innerWidth;
    var hostH = hostRect.height || (window.innerHeight - 72);

    items.forEach(function(item, index) {
      var pos = item.pos || autoPos(index, hostW, hostH);

      var el = document.createElement('div');
      el.className = 'desktop-file';
      el.setAttribute('data-path', item.path);
      el.setAttribute('data-type', item.type);
      el.style.left = pos.x + 'px';
      el.style.top  = pos.y + 'px';
      var accent = fileAccent(item);
      el.innerHTML =
        '<div class="desktop-file-icon" data-accent="' + accent + '">' + fileIcon(item) + '</div>' +
        '<div class="desktop-file-name">' + item.name + '</div>';

      // Double-click to open
      el.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        if (item.type === 'shortcut' && item.launchTab) {
          switchMainTab(item.launchTab);
        } else if (item.type === 'folder') {
          openFolder(item.path);
        } else {
          openFile(item.path);
        }
      });

      // Pointer drag for free-position move
      el.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        e.stopPropagation();

        // Select
        if (desktopSelection) desktopSelection.classList.remove('selected');
        el.classList.add('selected');
        desktopSelection = el;

        var startCX = e.clientX, startCY = e.clientY;
        var startL  = pos.x,     startT  = pos.y;
        var dragging = false;
        var THRESHOLD = 6;
        var dropTarget = null;

        el.setPointerCapture(e.pointerId);

        function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

        function findFolderAt(cx, cy) {
          // Temporarily remove pointer-events so el doesn't block hit testing
          el.style.pointerEvents = 'none';
          var elems = document.elementsFromPoint(cx, cy);
          el.style.pointerEvents = '';
          for (var i = 0; i < elems.length; i++) {
            var cand = elems[i].closest('.desktop-file');
            if (cand && cand !== el && cand.getAttribute('data-type') === 'folder') return cand;
          }
          return null;
        }

        function onMove(ev) {
          var dx = ev.clientX - startCX;
          var dy = ev.clientY - startCY;
          if (!dragging) {
            if (Math.hypot(dx, dy) < THRESHOLD) return;
            dragging = true;
            el.classList.add('dragging');
          }
          var nx = clamp(snap(startL + dx), 0, hostW - ICON_W);
          var ny = clamp(snap(startT + dy), 0, hostH - ICON_H);
          el.style.left = nx + 'px';
          el.style.top  = ny + 'px';

          // Drop-target highlight
          var folderEl = findFolderAt(ev.clientX, ev.clientY);
          if (dropTarget && dropTarget !== folderEl) {
            dropTarget.classList.remove('drop-over');
          }
          dropTarget = folderEl;
          if (dropTarget) dropTarget.classList.add('drop-over');
        }

        function onUp(ev) {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerup',   onUp);
          el.classList.remove('dragging');
          if (dropTarget) dropTarget.classList.remove('drop-over');

          if (dragging && dropTarget) {
            // Move item into the folder
            var targetPath = dropTarget.getAttribute('data-path');
            var itemName = item.path.split('/').pop();
            var newPath = targetPath + '/' + itemName;
            apiPost('move', { from: item.path, to: newPath })
              .then(function() { renderDesktop(); })
              .catch(function() { renderDesktop(); });
            return;
          }

          if (!dragging) return;
          var nx = clamp(snap(startL + (ev.clientX - startCX)), 0, hostW - ICON_W);
          var ny = clamp(snap(startT + (ev.clientY - startCY)), 0, hostH - ICON_H);
          pos = { x: nx, y: ny };
          saveMeta(item.path, { pos: pos });
        }

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup',   onUp);
      });

      host.appendChild(el);
    });
  }

  // ── Create helpers ──────────────────────────────────────────────────────────

  function createOnDesktop(kind) {
    if (kind === 'folder') {
      createEntry('/desktop', 'New Folder', 'folder');
    } else if (kind === 'note') {
      createEntry('/desktop', 'New Note.note', 'file', { fileExt: 'note' });
    } else {
      createEntry('/desktop', 'New Document.doc', 'file', { fileExt: 'doc' });
    }
  }

  function createDesktopShortcut(tabName) {
    var app = getWindowApp(tabName);
    if (!app) return;
    createEntry('/desktop', app.label, 'shortcut', { type: 'shortcut', launchTab: tabName });
  }

  // ── Inline rename ──────────────────────────────────────────────────────────

  function beginRename(el) {
    var nameEl = el.querySelector('.desktop-file-name');
    if (!nameEl) return;
    var virtPath = el.getAttribute('data-path');
    nameEl.setAttribute('contenteditable', 'true');
    nameEl.focus();
    // Select all text
    var range = document.createRange();
    range.selectNodeContents(nameEl);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function commit() {
      nameEl.removeAttribute('contenteditable');
      var newName = nameEl.textContent.trim();
      if (newName && newName !== virtPath.split('/').pop()) {
        rename(virtPath, newName);
      } else {
        renderDesktop();
      }
    }
    nameEl.addEventListener('blur', commit, { once: true });
    nameEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
      if (e.key === 'Escape') { nameEl.textContent = virtPath.split('/').pop(); nameEl.blur(); }
    });
  }

  // ── Open file in a simple editor modal ────────────────────────────────────

  async function openFile(virtPath) {
    var content = await getContent(virtPath);
    var name = virtPath.split('/').pop();

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:180;background:rgba(0,0,0,0.5);display:grid;place-items:center;';
    var card = document.createElement('div');
    card.style.cssText = 'width:600px;max-width:90vw;max-height:80vh;background:var(--window-bg);border:1px solid var(--border-emphasis);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.4);';

    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid var(--border-default);display:flex;justify-content:space-between;align-items:center;';
    header.innerHTML = '<span style="font-weight:700;font-size:14px;">' + name + '</span>';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:var(--text-secondary);font-size:16px;cursor:pointer;padding:4px 8px;';
    closeBtn.onclick = function() {
      setContent(virtPath, textarea.value);
      overlay.remove();
    };
    header.appendChild(closeBtn);

    var textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.cssText = 'flex:1;padding:16px;border:none;background:transparent;color:var(--text-primary);font-family:JetBrains Mono,monospace;font-size:13px;resize:none;outline:none;min-height:300px;';

    card.appendChild(header);
    card.appendChild(textarea);
    overlay.appendChild(card);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { setContent(virtPath, textarea.value); overlay.remove(); }
    });
    document.body.appendChild(overlay);
    textarea.focus();
  }

  async function openFolder(virtPath) {
    var items;
    try { items = await list(virtPath); } catch (_) { items = []; }
    var name = virtPath.split('/').pop();
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:180;background:rgba(0,0,0,0.5);display:grid;place-items:center;';
    var card = document.createElement('div');
    card.style.cssText = 'width:500px;max-width:90vw;max-height:60vh;background:var(--window-bg);border:1px solid var(--border-emphasis);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.4);';

    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid var(--border-default);display:flex;justify-content:space-between;align-items:center;';
    header.innerHTML = '<span style="font-weight:700;font-size:14px;">📁 ' + name + '</span>';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:var(--text-secondary);font-size:16px;cursor:pointer;padding:4px 8px;';
    closeBtn.onclick = function() { overlay.remove(); };
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.style.cssText = 'padding:16px;display:grid;grid-template-columns:repeat(auto-fill,80px);gap:8px;overflow-y:auto;';
    if (items.length === 0) {
      body.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-tertiary);padding:24px;font-size:13px;">Empty folder</div>';
    } else {
      items.forEach(function(item) {
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:10px;cursor:pointer;text-align:center;';
        el.innerHTML = '<div style="font-size:28px;">' + fileIcon(item) + '</div><div style="font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72px;">' + item.name + '</div>';
        el.addEventListener('dblclick', function() {
          overlay.remove();
          if (item.type === 'folder') openFolder(item.path);
          else if (item.type === 'shortcut' && item.launchTab) switchMainTab(item.launchTab);
          else openFile(item.path);
        });
        el.addEventListener('mouseenter', function() { el.style.background = 'color-mix(in srgb, var(--accent) 14%, transparent)'; });
        el.addEventListener('mouseleave', function() { el.style.background = ''; });
        body.appendChild(el);
      });
    }

    card.appendChild(header);
    card.appendChild(body);
    overlay.appendChild(card);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  return {
    stat: stat,
    list: list,
    createEntry: createEntry,
    remove: remove,
    rename: rename,
    getContent: getContent,
    setContent: setContent,
    saveMeta: saveMeta,
    renderDesktop: renderDesktop,
    createOnDesktop: createOnDesktop,
    createDesktopShortcut: createDesktopShortcut,
    beginRename: beginRename,
    openFile: openFile,
    openFolder: openFolder
  };
})();

// Render desktop files on load
document.addEventListener('DOMContentLoaded', function() { vfs.renderDesktop(); });
