// ── Services · Browser Session Store ────────────────────────────────────────
//
// HOW SESSION RESTORE WORKS:
// This file saves a snapshot of open tabs so the browser can recover after a
// restart or crash. It writes one JSON payload with tabs, active tab, and save
// timestamp.
//
// WHAT USES THIS:
//   browser host lifecycle/routes — save and restore open tab sessions
//
// EXPORTS:
//   save(tabs, activeTabId), load(), clear()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — Session Store
 *
 * Persists open tabs to disk for crash-safe session restore.
 * Format: { tabs: [{ tabId, url, title, index }], activeTabId, savedAt }
 */

const fs = require('fs');
const path = require('path');

// ── Constants ───────────────────────────────────────────────────────────────

const SESSION_FILE = path.join(__dirname, '..', 'server', 'data', 'browser-session.json');

// ── Core Logic ──────────────────────────────────────────────────────────────

/** Save a compact session snapshot to disk (best effort). */
function save(tabs, activeTabId) {
  const snapshot = {
    tabs: tabs.map(t => ({ tabId: t.tabId, url: t.url, title: t.title, index: t.index })),
    activeTabId,
    savedAt: Date.now(),
  };
  try {
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(snapshot, null, 2));
  } catch { /* best effort */ }
  return snapshot;
}

/** Load a previously saved session snapshot, or null. */
function load() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch { /* ignore corrupt file */ }
  return null;
}

/** Delete the session snapshot file if it exists. */
function clear() {
  try { if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE); } catch { /* ok */ }
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { save, load, clear };
