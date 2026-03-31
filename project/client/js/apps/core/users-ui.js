// ── Services · Client Users UI ───────────────────────────────────────────────
//
// HOW USER SWITCHING WORKS:
// This file manages the in-app user profile switcher tied to the active
// entity. It opens/closes the panel, lists users, marks active user, and
// handles add/switch/clear/delete operations via API calls.
//
// WHAT USES THIS:
//   chat/sidebar/users tab controls — call these helpers through global handlers
//
// EXPORTS:
//   global functions for panel toggles and users app actions
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// USER SWITCHER + USERS APP UI (P3-S6)
// ============================================================

let _userPanelOpen = false;
let _userPanelOutsideHandler = null;
/** Toggle users panel open/closed. */
function toggleUserPanel() {
  if (_userPanelOpen) closeUserPanel();
  else openUserPanel();
}

async function openUserPanel() {
  const panel = document.getElementById('userPanel');
  const btn = document.getElementById('userSwitcherBtn');
  if (!panel || !btn) return;
  // Portal: move panel to document.body so it escapes overflow:hidden ancestors
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  const rect = btn.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.top = (rect.bottom + 6) + 'px';
  panel.style.right = (window.innerWidth - rect.right) + 'px';
  panel.style.left = 'auto';
  panel.style.display = 'block';
  _userPanelOpen = true;
  await renderUserPanelList();
  if (_userPanelOutsideHandler) document.removeEventListener('mousedown', _userPanelOutsideHandler);
  _userPanelOutsideHandler = (e) => {
    const p = document.getElementById('userPanel');
    const b = document.getElementById('userSwitcherBtn');
    if (p && !p.contains(e.target) && b && !b.contains(e.target)) closeUserPanel();
  };
  setTimeout(() => document.addEventListener('mousedown', _userPanelOutsideHandler), 50);
}
/** Close users panel and remove outside-click handler. */
function closeUserPanel() {
  const panel = document.getElementById('userPanel');
  if (panel) panel.style.display = 'none';
  _userPanelOpen = false;
  if (_userPanelOutsideHandler) {
    document.removeEventListener('mousedown', _userPanelOutsideHandler);
    _userPanelOutsideHandler = null;
  }
}

const _FEELING_EMOJI = {
  loathing:'😤', hate:'😡', dislike:'😒', cold:'🧊', wary:'😑',
  neutral:'😶', indifferent:'🫥', warm:'🙂', like:'😊', fond:'🥰',
  care:'💚', trust:'🤝', love:'❤️', devoted:'💜'
};
/** Render compact trust meter for relationship badges. */
function _trustBar(trust) {
  const filled = Math.round((trust || 0) * 5);
  const bar = '█'.repeat(filled) + '░'.repeat(5 - filled);
  const pct = Math.round((trust || 0) * 100);
  const col = trust < 0.3 ? '#ef4444' : trust < 0.6 ? '#f59e0b' : '#10b981';
  return '<span title="Trust ' + pct + '%" style="font-family:monospace;font-size:.6rem;color:' + col + ';letter-spacing:-.5px">' + bar + '</span>';
}

async function renderUserPanelList() {
  const list = document.getElementById('userPanelList');
  if (!list) return;
  try {
    const [usersResp, relResp] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/relationships').catch(() => null)
    ]);
    if (!usersResp.ok) throw new Error('Failed to load users');
    const data = await usersResp.json();
    const users = data.users || [];
    const activeId = data.activeUserId;

    // Build relationship map userId -> rel
    const relMap = {};
    if (relResp && relResp.ok) {
      const relData = await relResp.json().catch(() => ({}));
      (relData.relationships || []).forEach(r => { relMap[r.userId] = r; });
    }

    if (users.length === 0) {
      list.innerHTML = '<div style="color:var(--text-tertiary);font-size:.75rem;text-align:center;padding:8px 0">No users yet — add one below</div>';
      return;
    }
    list.innerHTML = '';
    users.forEach(u => {
      const isActive = u.id === activeId;
      const rel = relMap[u.id];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:5px;margin-bottom:2px;' + (isActive ? 'background:rgba(255,255,255,.05)' : '');
      const safeName = escapeHtmlInner(u.name || 'User');
      const safeInfo = u.info ? escapeHtmlInner(u.info) : '';

      // Relationship badge: only show if entity has met this user
      let relBadge = '';
      if (rel && rel.interactionCount > 0) {
        const emoji = _FEELING_EMOJI[rel.feeling] || '😶';
        relBadge =
          '<div title="Feeling: ' + escapeHtmlInner(rel.feeling || 'neutral') + '\nInteractions: ' + (rel.interactionCount || 0) + '" ' +
            'style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;gap:1px;cursor:default">' +
            '<span style="font-size:.85rem;line-height:1">' + emoji + '</span>' +
            _trustBar(rel.trust) +
          '</div>';
      }

      row.innerHTML =
        '<div style="width:26px;height:26px;border-radius:50%;background:#6d28d9;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:600;flex-shrink:0;color:#fff">' +
          safeName[0].toUpperCase() +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:.78rem;font-weight:' + (isActive ? '600' : '400') + ';color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            safeName + (isActive ? ' <span style="color:#10b981;font-size:.6rem;font-weight:400">● active</span>' : '') +
          '</div>' +
          (safeInfo ? '<div style="font-size:.65rem;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + safeInfo + '</div>' : '') +
        '</div>' +
        relBadge +
        (isActive
          ? '<button onclick="clearUserSwitch()" title="Clear active user" style="background:none;border:1px solid var(--border-default);color:var(--text-tertiary);font-size:.62rem;border-radius:3px;cursor:pointer;padding:2px 5px;flex-shrink:0">✕ clear</button>'
          : '<button onclick="switchToUser(\'' + u.id + '\')" style="background:#3b82f6;border:none;color:#fff;font-size:.65rem;border-radius:3px;cursor:pointer;padding:2px 6px;flex-shrink:0">Switch</button>');
      list.appendChild(row);
    });
  } catch (err) {
    list.innerHTML = '<div style="color:var(--dn);font-size:.75rem;padding:4px">' + err.message + '</div>';
  }
}

async function switchToUser(userId) {
  try {
    const resp = await fetch('/api/users/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!resp.ok) throw new Error('Failed to switch user');
    const data = await resp.json();
    const name = data.user ? data.user.name : userId;
    const label = document.getElementById('activeUserLabel');
    if (label) label.textContent = name;
    await renderUserPanelList();
    lg('ok', 'Switched to: ' + name);
  } catch (err) {
    lg('err', 'Switch failed: ' + err.message);
  }
}

async function clearUserSwitch() {
  try {
    await fetch('/api/users/active', { method: 'DELETE' });
    const label = document.getElementById('activeUserLabel');
    if (label) label.textContent = (typeof getUsername === 'function' && getUsername()) || 'User';
    await renderUserPanelList();
    lg('info', 'Active user cleared');
  } catch (err) {
    lg('err', 'Clear failed: ' + err.message);
  }
}

async function addAndSwitchUser() {
  const nameEl = document.getElementById('newUserName');
  const infoEl = document.getElementById('newUserInfo');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) { lg('err', 'Enter a name for the new user'); return; }
  const info = infoEl ? infoEl.value.trim() : '';
  try {
    const createResp = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, info })
    });
    if (!createResp.ok) throw new Error('Failed to create user');
    const created = await createResp.json();
    const userId = created.user && created.user.id;
    if (!userId) throw new Error('No user id returned');

    const switchResp = await fetch('/api/users/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!switchResp.ok) throw new Error('Failed to set active user');

    if (nameEl) nameEl.value = '';
    if (infoEl) infoEl.value = '';
    const label = document.getElementById('activeUserLabel');
    if (label) label.textContent = name;
    await renderUserPanelList();
    lg('ok', 'Added and switched to: ' + name);
    if (typeof addChatBubble === 'function') addChatBubble('system', '👤 Chatting as ' + name);
  } catch (err) {
    lg('err', 'Add user failed: ' + err.message);
  }
}

async function initUserSwitcher() {
  const btn = document.getElementById('userSwitcherBtn');
  if (!btn) return;
  try {
    // If no user profiles exist yet and we have a registered display name, auto-create one
    const listResp = await fetch('/api/users');
    if (listResp.ok) {
      const listData = await listResp.json();
      const displayName = (typeof getDisplayName === 'function' && getDisplayName()) || '';
      if (listData.users && listData.users.length === 0 && displayName) {
        const info = (typeof getAccountInfo === 'function' && getAccountInfo()) || '';
        const createResp = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: displayName, info })
        });
        if (createResp.ok) {
          const created = await createResp.json();
          if (created.ok && created.user) {
            await fetch('/api/users/active', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: created.user.id })
            });
          }
        }
      }
    }

    const resp = await fetch('/api/users/active');
    if (resp.ok) {
      const data = await resp.json();
      const label = document.getElementById('activeUserLabel');
      if (data.user && data.user.name) {
        if (label) label.textContent = data.user.name;
      } else {
        if (label) label.textContent = (typeof getDisplayName === 'function' && getDisplayName()) || (typeof getUsername === 'function' && getUsername()) || 'User';
      }
    }
  } catch (_) {}
  btn.style.display = 'inline-flex';
  await usersAppRefresh();
}
/** Reset switcher UI when no entity is active. */
function resetUserSwitcher() {
  const btn = document.getElementById('userSwitcherBtn');
  if (btn) btn.style.display = 'none';
  const label = document.getElementById('activeUserLabel');
  if (label) label.textContent = 'User';
  closeUserPanel();
}
/** Update status text in users app panel. */
function _usersAppSetStatus(text, type) {
  const el = document.getElementById('usersAppStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'err' ? 'var(--dn)' : (type === 'ok' ? 'var(--em)' : 'var(--text-secondary)');
}

async function usersAppRefresh() {
  const listEl = document.getElementById('usersAppList');
  if (!listEl) return;

  if (!currentEntityId) {
    listEl.innerHTML = '<div class="text-secondary-c text-sm-c">No active entity loaded. Check out an entity first.</div>';
    _usersAppSetStatus('No active entity', 'info');
    return;
  }

  try {
    const [usersResp, activeResp] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/users/active')
    ]);
    if (!usersResp.ok) throw new Error('Failed to load users');

    const usersData = await usersResp.json();
    const activeData = activeResp.ok ? await activeResp.json() : {};
    const users = usersData.users || [];
    const activeId = usersData.activeUserId || activeData.user?.id || null;

    if (!users.length) {
      listEl.innerHTML = '<div class="text-secondary-c text-sm-c">No users yet. Add one above.</div>';
      _usersAppSetStatus('No users found', 'info');
      return;
    }

    listEl.innerHTML = users.map((u) => {
      const isActive = u.id === activeId;
      const safeName = escapeHtmlInner(u.name || 'User');
      const safeInfo = escapeHtmlInner(u.info || '');
      return ''
        + '<div class="config-card" style="padding:10px;display:flex;align-items:center;gap:10px">'
        +   '<div style="width:30px;height:30px;border-radius:50%;background:#6d28d9;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff">' + safeName.charAt(0).toUpperCase() + '</div>'
        +   '<div style="flex:1;min-width:0">'
        +     '<div style="font-size:.82rem;font-weight:600">' + safeName + (isActive ? ' <span style="color:var(--em);font-weight:400">● active</span>' : '') + '</div>'
        +     '<div class="text-xs-c text-secondary-c" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (safeInfo || 'No details') + '</div>'
        +   '</div>'
        +   (isActive
              ? '<button class="btn bg text-xs-c" onclick="usersAppClearActive()">Clear</button>'
              : '<button class="btn bp text-xs-c" onclick="usersAppSetActive(\'' + u.id.replace(/'/g, "\\'") + '\')">Set Active</button>')
        +   '<button class="btn br text-xs-c" onclick="usersAppDelete(\'' + u.id.replace(/'/g, "\\'") + '\', \'' + safeName.replace(/'/g, "\\'") + '\')">Delete</button>'
        + '</div>';
    }).join('');

    _usersAppSetStatus('Loaded ' + users.length + ' user profile' + (users.length === 1 ? '' : 's'), 'ok');
  } catch (err) {
    listEl.innerHTML = '<div class="text-sm-c" style="color:var(--dn)">' + err.message + '</div>';
    _usersAppSetStatus('Failed to load users', 'err');
  }
}

async function usersAppCreateUser() {
  if (!currentEntityId) {
    _usersAppSetStatus('Load an entity first', 'err');
    return;
  }
  const nameEl = document.getElementById('usersAppNewName');
  const infoEl = document.getElementById('usersAppNewInfo');
  const name = (nameEl?.value || '').trim();
  const info = (infoEl?.value || '').trim();
  if (!name) {
    _usersAppSetStatus('User name is required', 'err');
    return;
  }

  try {
    const resp = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, info })
    });
    if (!resp.ok) throw new Error('Failed to create user');
    const data = await resp.json();
    if (!data.ok || !data.user?.id) throw new Error(data.error || 'Invalid create response');

    if (nameEl) nameEl.value = '';
    if (infoEl) infoEl.value = '';
    _usersAppSetStatus('User created: ' + name, 'ok');
    await usersAppSetActive(data.user.id);
    await renderUserPanelList();
  } catch (err) {
    _usersAppSetStatus(err.message, 'err');
  }
}

async function usersAppSetActive(userId) {
  try {
    const resp = await fetch('/api/users/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!resp.ok) throw new Error('Failed to set active user');
    const data = await resp.json();
    const name = data.user?.name || 'User';
    const label = document.getElementById('activeUserLabel');
    if (label) label.textContent = name;
    _usersAppSetStatus('Active user: ' + name, 'ok');
    await usersAppRefresh();
    await renderUserPanelList();
  } catch (err) {
    _usersAppSetStatus(err.message, 'err');
  }
}

async function usersAppClearActive() {
  try {
    const resp = await fetch('/api/users/active', { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to clear active user');
    const label = document.getElementById('activeUserLabel');
    if (label) label.textContent = (typeof getDisplayName === 'function' && getDisplayName()) || 'User';
    _usersAppSetStatus('Active user cleared', 'ok');
    await usersAppRefresh();
    await renderUserPanelList();
  } catch (err) {
    _usersAppSetStatus(err.message, 'err');
  }
}

async function usersAppDelete(userId, name) {
  if (!confirm('Delete user "' + (name || userId) + '"?')) return;
  try {
    const resp = await fetch('/api/users/' + encodeURIComponent(userId), { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete user');
    _usersAppSetStatus('Deleted user: ' + (name || userId), 'ok');
    await usersAppRefresh();
    await renderUserPanelList();
  } catch (err) {
    _usersAppSetStatus(err.message, 'err');
  }
}
