// ── Services · Browser History Store ────────────────────────────────────────
//
// HOW HISTORY STORAGE WORKS:
// This file keeps a rolling list of visited pages. It loads history once into
// memory, updates that list as pages are visited, and writes JSON to disk so
// history survives restarts.
//
// WHAT USES THIS:
//   browser host routes/services — read, search, and clear browsing history
//
// EXPORTS:
//   addEntry(url, title), getAll(), search(query), deleteEntry(id)
//   deleteByDateRange(startMs, endMs), clear(), exportAll(), importEntries(entries), reset()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — History Store
 *
 * Persists browsing history to disk as JSON.
 * Each entry: { id, url, title, visitedAt }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Constants ───────────────────────────────────────────────────────────────

const HISTORY_FILE = path.join(__dirname, '..', 'server', 'data', 'browser-history.json');
const MAX_ENTRIES = 500;

// ── State ───────────────────────────────────────────────────────────────────

let _entries = [];
let _loaded = false;

// ── Persistence Helpers ─────────────────────────────────────────────────────

/** Load history JSON once into memory (best effort). */
function _load() {
  if (_loaded) return;
  _loaded = true;
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      _entries = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch { _entries = []; }
}

/** Persist current in-memory history list to disk (best effort). */
function _save() {
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(_entries, null, 2));
  } catch { /* best effort */ }
}

// ── Core Logic ──────────────────────────────────────────────────────────────

/** Add a new history entry and trim to max size. */
function addEntry(url, title) {
  _load();
  const entry = {
    id: crypto.randomBytes(6).toString('hex'),
    url,
    title: title || url,
    visitedAt: Date.now(),
  };
  _entries.unshift(entry);
  if (_entries.length > MAX_ENTRIES) _entries.length = MAX_ENTRIES;
  _save();
  return entry;
}

/** Return full history list in current order (newest first). */
function getAll() {
  _load();
  return _entries;
}

/** Search history by URL or title (case-insensitive). */
function search(query) {
  _load();
  const q = (query || '').toLowerCase();
  if (!q) return _entries;
  return _entries.filter(e => e.url.toLowerCase().includes(q) || (e.title || '').toLowerCase().includes(q));
}

/** Delete a single history entry by ID. */
function deleteEntry(id) {
  _load();
  const idx = _entries.findIndex(e => e.id === id);
  if (idx === -1) return false;
  _entries.splice(idx, 1);
  _save();
  return true;
}

/** Delete entries whose timestamps are inside the provided range. */
function deleteByDateRange(startMs, endMs) {
  _load();
  const before = _entries.length;
  _entries = _entries.filter(e => e.visitedAt < startMs || e.visitedAt > endMs);
  _save();
  return before - _entries.length;
}

/** Clear all history and persist empty state. */
function clear() {
  _entries = [];
  _save();
}

/** Return a deep copy of history entries for export. */
function exportAll() {
  _load();
  return JSON.parse(JSON.stringify(_entries));
}

/** Import entries from an array and trim to max size. */
function importEntries(entries) {
  _load();
  if (!Array.isArray(entries)) return 0;
  let added = 0;
  for (const e of entries) {
    if (!e.url) continue;
    _entries.push({
      id: crypto.randomBytes(6).toString('hex'),
      url: e.url,
      title: e.title || e.url,
      visitedAt: e.visitedAt || Date.now(),
    });
    added++;
  }
  if (_entries.length > MAX_ENTRIES) _entries.length = MAX_ENTRIES;
  _save();
  return added;
}

/** Reset in-memory state for tests (does not write). */
function reset() { _entries = []; _loaded = false; }

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { addEntry, getAll, search, deleteEntry, deleteByDateRange, clear, exportAll, importEntries, reset };
