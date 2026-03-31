// ── Services · Auth Service ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, crypto. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// REM System — Auth Service
// Simple username/password account system with session tokens.
// Accounts stored in server/data/accounts.json
// Sessions stored in memory + persisted to server/data/sessions.json
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR      = path.join(__dirname, '../data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// In-memory session store (also persisted to disk)
// Map<token, { accountId, createdAt }>
const sessions = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────

// ensureDataDir()
// WHAT THIS DOES: ensureDataDir is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureDataDir(...) where this helper behavior is needed.
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
// loadAccounts()
// WHAT THIS DOES: loadAccounts reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call loadAccounts(...), then use the returned value in your next step.
function loadAccounts() {
  ensureDataDir();
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.accounts)) return parsed.accounts;
      if (Array.isArray(parsed.users)) return parsed.users;
    }
    return [];
  } catch {
    return [];
  }
}
// hasAccounts()
// WHAT THIS DOES: hasAccounts answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call hasAccounts(...) and branch logic based on true/false.
function hasAccounts() {
  return loadAccounts().length > 0;
}
function saveAccounts(accounts) {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}
// loadPersistedSessions()
// WHAT THIS DOES: loadPersistedSessions reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call loadPersistedSessions(...), then use the returned value in your next step.
function loadPersistedSessions() {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}
// persistSessions()
// WHAT THIS DOES: persistSessions is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call persistSessions(...) where this helper behavior is needed.
function persistSessions() {
  ensureDataDir();
  const obj = {};
  for (const [token, data] of sessions) {
    obj[token] = data;
  }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}
// hashPassword()
// WHAT THIS DOES: hashPassword is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call hashPassword(...) where this helper behavior is needed.
function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

// Load persisted sessions on module load
(function initSessions() {
  const saved = loadPersistedSessions();
  for (const [token, data] of Object.entries(saved)) {
    sessions.set(token, data);
  }
})();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new account.
 * Returns { ok: true, account } or { ok: false, error }.
 */
// createAccount()
// WHAT THIS DOES: createAccount creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createAccount(...) before code that depends on this setup.
function createAccount(username, password, displayName, info) {
  if (!username || !password) {
    return { ok: false, error: 'Username and password are required' };
  }
  const clean = String(username).trim().toLowerCase();
  if (clean.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters' };
  }
  if (!/^[a-z0-9_\-\.]+$/.test(clean)) {
    return { ok: false, error: 'Username may only contain letters, numbers, underscores, hyphens, and dots' };
  }
  if (String(password).length < 3) {
    return { ok: false, error: 'Password must be at least 3 characters' };
  }
  const cleanDisplay = displayName ? String(displayName).trim() : '';
  if (!cleanDisplay) {
    return { ok: false, error: 'Please enter your name or nickname' };
  }

  const accounts = loadAccounts();
  if (accounts.find(a => a.username === clean)) {
    return { ok: false, error: 'Username already taken' };
  }

  const account = {
    id:           crypto.randomUUID(),
    username:     clean,
    passwordHash: hashPassword(password),
    displayName:  cleanDisplay,
    info:         info ? String(info).trim() : '',
    createdAt:    new Date().toISOString()
  };
  accounts.push(account);
  saveAccounts(accounts);

  console.log(`  ✓ Auth: account created — ${clean} ("${cleanDisplay}")`);
  return { ok: true, account: { id: account.id, username: account.username, displayName: account.displayName, info: account.info, createdAt: account.createdAt } };
}

/**
 * Verify username/password.
 * Returns the public account object, or null if invalid.
 */
// verifyAccount()
// WHAT THIS DOES: verifyAccount is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call verifyAccount(...) where this helper behavior is needed.
function verifyAccount(username, password) {
  if (!username || !password) return null;
  const clean = String(username).trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find(a => a.username === clean);
  if (!account) return null;
  if (account.passwordHash !== hashPassword(password)) return null;
  return { id: account.id, username: account.username, displayName: account.displayName || '', info: account.info || '', createdAt: account.createdAt };
}

/**
 * Look up an account by ID.
 * Returns the public account object, or null.
 */
// getAccount()
// WHAT THIS DOES: getAccount reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getAccount(...), then use the returned value in your next step.
function getAccount(accountId) {
  if (!accountId) return null;
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === accountId);
  if (!account) return null;
  return { id: account.id, username: account.username, displayName: account.displayName || '', info: account.info || '', createdAt: account.createdAt };
}

/**
 * Create a new session for the given accountId.
 * Returns the session token string.
 */
// createSession()
// WHAT THIS DOES: createSession creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createSession(...) before code that depends on this setup.
function createSession(accountId) {
  const token = crypto.randomUUID();
  sessions.set(token, { accountId, createdAt: Date.now() });
  persistSessions();
  return token;
}

/**
 * Validate a session token.
 * Returns the accountId, or null if invalid.
 */
// validateSession()
// WHAT THIS DOES: validateSession answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateSession(...) and branch logic based on true/false.
function validateSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  return session.accountId;
}

/**
 * Destroy a session (logout).
 */
// destroySession()
// WHAT THIS DOES: destroySession removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call destroySession(...) when you need a safe teardown/reset path.
function destroySession(token) {
  if (!token) return;
  sessions.delete(token);
  persistSessions();
}

module.exports = {
  createAccount,
  verifyAccount,
  getAccount,
  hasAccounts,
  createSession,
  validateSession,
  destroySession
};
