// ── Client · Login ────────────────────────────────────────────────────
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

// ============================================================
// REM System — Login / Account System
// Handles login overlay, register, and session state.
// Session is managed via HttpOnly cookie set by the server.
// ============================================================

// ── Auth state ────────────────────────────────────────────────────────────────
let _remAccountId   = null;
let _remUsername    = null;
let _remDisplayName = null;
let _remAccountInfo = null;
let _authWaiters    = [];
// getAccountId()
// WHAT THIS DOES: getAccountId reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getAccountId(...), then use the returned value in your next step.
function getAccountId()   { return _remAccountId;   }
function getUsername()    { return _remUsername;     }
function getDisplayName() { return _remDisplayName; }
function getAccountInfo() { return _remAccountInfo; }

// getCurrentAccount()
// WHAT THIS DOES: getCurrentAccount reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getCurrentAccount(...), then use the returned value in your next step.
function getCurrentAccount() {
  if (!_remAccountId) return null;
  return {
    id: _remAccountId,
    username: _remUsername,
    displayName: _remDisplayName,
    info: _remAccountInfo
  };
}
// resolveAuthWaiters()
// WHAT THIS DOES: resolveAuthWaiters is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call resolveAuthWaiters(...) where this helper behavior is needed.
function resolveAuthWaiters(account) {
  const waiters = _authWaiters;
  _authWaiters = [];
  waiters.forEach(resolve => resolve(account));
}

// ── Tab switcher ──────────────────────────────────────────────────────────────
// switchLoginTab()
// WHAT THIS DOES: switchLoginTab is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call switchLoginTab(...) where this helper behavior is needed.
function switchLoginTab(tab) {
  const loginTab   = document.getElementById('authLoginTab');
  const registerTab = document.getElementById('authRegisterTab');
  const loginBtn   = document.getElementById('authTabLoginBtn');
  const regBtn     = document.getElementById('authTabRegBtn');
  if (!loginTab || !registerTab) return;

  if (tab === 'login') {
    loginTab.style.display    = '';
    registerTab.style.display = 'none';
    if (loginBtn)  loginBtn.className  = 'btn bp flex-1';
    if (regBtn)    regBtn.className    = 'btn bd flex-1';
  } else {
    loginTab.style.display    = 'none';
    registerTab.style.display = '';
    if (loginBtn)  loginBtn.className  = 'btn bd flex-1';
    if (regBtn)    regBtn.className    = 'btn bp flex-1';
  }
  // Clear errors on tab switch
  clearLoginErrors();
}
// clearLoginErrors()
// WHAT THIS DOES: clearLoginErrors removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call clearLoginErrors(...) when you need a safe teardown/reset path.
function clearLoginErrors() {
  const le = document.getElementById('authLoginError');
  const re = document.getElementById('authRegisterError');
  if (le) { le.style.display = 'none'; le.textContent = ''; }
  if (re) { re.style.display = 'none'; re.textContent = ''; }
}

// ── Overlay show/hide ─────────────────────────────────────────────────────────
// showLoginOverlay()
// WHAT THIS DOES: showLoginOverlay builds or updates what the user sees.
// WHY IT EXISTS: display logic is separated from data/business logic for clarity.
// HOW TO USE IT: call showLoginOverlay(...) after state changes that need UI refresh.
function showLoginOverlay() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.style.display = 'flex';
}
// hideLoginOverlay()
// WHAT THIS DOES: hideLoginOverlay is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call hideLoginOverlay(...) where this helper behavior is needed.
function hideLoginOverlay() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Header badge update ───────────────────────────────────────────────────────
// _updateAccountBadge()
// WHAT THIS DOES: _updateAccountBadge changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call _updateAccountBadge(...) with the new values you want to persist.
function _updateAccountBadge(username) {
  const badge     = document.getElementById('accountBadge');
  const nameSpan  = document.getElementById('accountUsername');
  if (badge)    badge.style.display = '';
  if (nameSpan) nameSpan.textContent = username;
  if (typeof updateStartUserChip === 'function') updateStartUserChip();
}
// _clearAccountBadge()
// WHAT THIS DOES: _clearAccountBadge removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call _clearAccountBadge(...) when you need a safe teardown/reset path.
function _clearAccountBadge() {
  const badge = document.getElementById('accountBadge');
  if (badge) badge.style.display = 'none';
  if (typeof updateStartUserChip === 'function') updateStartUserChip();
}

// ── On successful auth ────────────────────────────────────────────────────────
// _onAuthSuccess()
// WHAT THIS DOES: _onAuthSuccess handles an event and routes follow-up actions.
// WHY IT EXISTS: event flow is easier to debug when listener logic is centralized.
// HOW TO USE IT: wire _onAuthSuccess to the relevant event source or dispatcher.
function _onAuthSuccess(account) {
  _remAccountId   = account.id;
  _remUsername    = account.username;
  _remDisplayName = account.displayName || '';
  _remAccountInfo = account.info || '';
  _updateAccountBadge(account.displayName || account.username);
  hideLoginOverlay();
  if (typeof nkSound !== 'undefined') nkSound.play('login');
  // Refresh entity list so the new user's entities are shown
  if (typeof refreshSidebarEntities === 'function') refreshSidebarEntities();
  resolveAuthWaiters(getCurrentAccount());
  // Auto-launch setup wizard if no valid LLM profile is configured yet
  setTimeout(() => {
    try {
      // profiles()
      // WHAT THIS DOES: profiles is a helper used by this module's main flow.
      // WHY IT EXISTS: it keeps repeated logic in one reusable place.
      // HOW TO USE IT: call profiles(...) where this helper behavior is needed.
      const profiles = (typeof savedConfig !== 'undefined' && savedConfig && savedConfig.profiles) ? savedConfig.profiles : {};
      const hasValidProfile = Object.values(profiles).some(p => typeof getMainConfigFromProfile === 'function' && getMainConfigFromProfile(p) !== null);
      if (!hasValidProfile && typeof showSetupWizard === 'function') {
        showSetupWizard();
      }
    } catch (_) {}
  }, 350);
}

async function getAuthBootstrap() {
  try {
    const resp = await fetch('/api/auth/bootstrap');
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data && data.ok) return data;
  } catch (_) {}
  return { ok: false, authenticated: false, hasAccounts: false, account: null };
}
// beginAuthFlow()
// WHAT THIS DOES: beginAuthFlow is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call beginAuthFlow(...) where this helper behavior is needed.
function beginAuthFlow(preferredTab = 'login') {
  switchLoginTab(preferredTab === 'register' ? 'register' : 'login');
function clearFirstRunThemeLocalState(bootstrap) {
  if (!bootstrap || bootstrap.hasAccounts !== false) return;
  const keys = ['rem-ui-user-themes', 'rem-ui-theme-custom', 'rem-ui-theme'];
  keys.forEach((key) => {
    try { localStorage.removeItem(key); } catch (_) {}
  });
}
  clearLoginErrors();
  showLoginOverlay();
  const existing = getCurrentAccount();
  if (existing) return Promise.resolve(existing);
  return new Promise(resolve => {
    _authWaiters.push(resolve);
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function handleLogin() {
  // username()
  // WHAT THIS DOES: username is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call username(...) where this helper behavior is needed.
  const username = (document.getElementById('authLoginUsername') || {}).value || '';
  const password = (document.getElementById('authLoginPassword') || {}).value || '';
  const errEl    = document.getElementById('authLoginError');

  if (!username.trim() || !password) {
    if (errEl) { errEl.textContent = 'Enter username and password'; errEl.style.display = ''; }
    return;
  }

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password })
    });
    const data = await resp.json().catch(() => ({}));
    if (data.ok) {
      _onAuthSuccess(data.account);
    } else {
      if (errEl) { errEl.textContent = data.error || 'Login failed'; errEl.style.display = ''; }
    }
  } catch (e) {
    if (errEl) { errEl.textContent = 'Network error: ' + e.message; errEl.style.display = ''; }
  }
}

// ── Register ──────────────────────────────────────────────────────────────────
async function handleRegister() {
  // displayName()
  // WHAT THIS DOES: displayName builds or updates what the user sees.
  // WHY IT EXISTS: display logic is separated from data/business logic for clarity.
  // HOW TO USE IT: call displayName(...) after state changes that need UI refresh.
  const displayName = (document.getElementById('authRegDisplayName') || {}).value || '';
  const info        = (document.getElementById('authRegInfo')        || {}).value || '';
  // username()
  // Purpose: helper wrapper used by this module's main flow.
  // username()
  // WHAT THIS DOES: username is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call username(...) where this helper behavior is needed.
  const username    = (document.getElementById('authRegUsername')    || {}).value || '';
  const password    = (document.getElementById('authRegPassword')    || {}).value || '';
  const errEl       = document.getElementById('authRegisterError');

  if (!displayName.trim()) {
    if (errEl) { errEl.textContent = 'Please enter your name or nickname'; errEl.style.display = ''; }
    return;
  }
  if (!username.trim() || !password) {
    if (errEl) { errEl.textContent = 'Enter username and password'; errEl.style.display = ''; }
    return;
  }

  try {
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim(), info: info.trim(), username: username.trim(), password })
    });
    const data = await resp.json().catch(() => ({}));
    if (data.ok) {
      _onAuthSuccess(data.account);
    } else {
      if (errEl) { errEl.textContent = data.error || 'Registration failed'; errEl.style.display = ''; }
    }
  } catch (e) {
    if (errEl) { errEl.textContent = 'Network error: ' + e.message; errEl.style.display = ''; }
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  _remAccountId   = null;
  _remUsername    = null;
  _remDisplayName = null;
  _remAccountInfo = null;
  _clearAccountBadge();
  // Clear entity state
  if (typeof currentEntityId !== 'undefined') {
    // eslint-disable-next-line no-global-assign
    currentEntityId = null;
  }
  const sidebarList = document.getElementById('sidebarEntityList');
  if (sidebarList) sidebarList.innerHTML = '<div style="color:var(--td);text-align:center;padding:.75rem .25rem;font-size:.65rem;">No entities yet</div>';
  switchLoginTab('login');
  showLoginOverlay();
}

// ── Init: check for existing session on page load ────────────────────────────
async function initLogin(options = {}) {
  const { showOverlayOnFail = true } = options;

  try {
    const bootstrap = await getAuthBootstrap();
    clearFirstRunThemeLocalState(bootstrap);
    if (bootstrap.ok && bootstrap.authenticated && bootstrap.account) {
      _onAuthSuccess(bootstrap.account);
      return { authenticated: true, account: bootstrap.account };
    }
  } catch (_) {}

  try {
    const resp = await fetch('/api/auth/me');
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      if (data.ok && data.account) {
        _onAuthSuccess(data.account);
        return { authenticated: true, account: data.account };
      }
    }
  } catch (_) {}
  if (showOverlayOnFail) showLoginOverlay();
  return { authenticated: false, account: null };
}

// Allow Enter key to submit login/register forms
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('authLoginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('authLoginUsername')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('authRegPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
  document.getElementById('authRegUsername')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
  document.getElementById('authRegDisplayName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
  document.getElementById('authRegInfo')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
});
