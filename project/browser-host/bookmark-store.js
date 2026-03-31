// ── Services · Browser Bookmark Store ───────────────────────────────────────
//
// HOW BOOKMARK STORAGE WORKS:
// Think of this file like a tiny notebook for saved links. It keeps bookmarks
// in memory while the app is running, and mirrors that list to a JSON file so
// bookmarks survive restarts.
//
// Flow:
//   1. _load() reads the bookmark JSON file once on first access
//   2. Public APIs update or query the in-memory list
//   3. _save() writes the latest list back to disk
//
// WHAT USES THIS:
//   browser-host routes/services — add, remove, search, and manage bookmarks
//
// EXPORTS:
//   add(url, title, folder)              → bookmark object
//   remove(id)                           → boolean
//   removeByUrl(url)                     → boolean
//   isBookmarked(url)                    → boolean
//   getAll()                             → bookmark[]
//   search(query)                        → bookmark[]
//   update(id, fields)                   → bookmark | null
//   clear()                              → void
//   exportAll()                          → bookmark[]
//   importBookmarks(bookmarks)           → number
//   getFolders()                         → string[]
//   reset()                              → void
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ── Imports ─────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Constants ───────────────────────────────────────────────────────────────

const BOOKMARKS_FILE = path.join(__dirname, '..', 'server', 'data', 'browser-bookmarks.json');

// ── State ───────────────────────────────────────────────────────────────────

let _bookmarks = [];
let _loaded = false;

// ── Persistence Helpers ─────────────────────────────────────────────────────

/** Load bookmarks from disk once (best effort). */
function _load() {
  if (_loaded) return;
  _loaded = true;
  try {
    if (fs.existsSync(BOOKMARKS_FILE)) {
      _bookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8'));
    }
  } catch { _bookmarks = []; }
}

/** Persist the current in-memory bookmark list to disk (best effort). */
function _save() {
  try {
    fs.mkdirSync(path.dirname(BOOKMARKS_FILE), { recursive: true });
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(_bookmarks, null, 2));
  } catch { /* best effort */ }
}

// ── Core Logic ──────────────────────────────────────────────────────────────

/** Add a bookmark if its URL is not already present. */
function add(url, title, folder) {
  _load();
  const existing = _bookmarks.find(b => b.url === url);
  if (existing) return existing;
  const bm = {
    id: crypto.randomBytes(6).toString('hex'),
    url,
    title: title || url,
    folder: folder || 'default',
    addedAt: Date.now(),
  };
  _bookmarks.unshift(bm);
  _save();
  return bm;
}

/** Remove a bookmark by ID. */
function remove(id) {
  _load();
  const idx = _bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return false;
  _bookmarks.splice(idx, 1);
  _save();
  return true;
}

/** Remove a bookmark by URL. */
function removeByUrl(url) {
  _load();
  const idx = _bookmarks.findIndex(b => b.url === url);
  if (idx === -1) return false;
  _bookmarks.splice(idx, 1);
  _save();
  return true;
}

/** Check whether a URL is already bookmarked. */
function isBookmarked(url) {
  _load();
  return _bookmarks.some(b => b.url === url);
}

/** Return the internal bookmark list. */
function getAll() {
  _load();
  return _bookmarks;
}

/** Search bookmarks by URL or title (case-insensitive). */
function search(query) {
  _load();
  const q = (query || '').toLowerCase();
  if (!q) return _bookmarks;
  return _bookmarks.filter(b => b.url.toLowerCase().includes(q) || (b.title || '').toLowerCase().includes(q));
}

/** Update editable bookmark fields by ID. */
function update(id, fields) {
  _load();
  const bm = _bookmarks.find(b => b.id === id);
  if (!bm) return null;
  if (fields.title != null) bm.title = fields.title;
  if (fields.folder != null) bm.folder = fields.folder;
  if (fields.url != null) bm.url = fields.url;
  _save();
  return bm;
}

/** Remove all bookmarks and persist empty state. */
function clear() {
  _bookmarks = [];
  _save();
}

/** Return a deep copy of all bookmarks for export. */
function exportAll() {
  _load();
  return JSON.parse(JSON.stringify(_bookmarks));
}

/** Import bookmarks, skipping entries without URLs or duplicate URLs. */
function importBookmarks(bookmarks) {
  _load();
  if (!Array.isArray(bookmarks)) return 0;
  let added = 0;
  for (const b of bookmarks) {
    if (!b.url) continue;
    if (_bookmarks.some(existing => existing.url === b.url)) continue;
    _bookmarks.push({
      id: crypto.randomBytes(6).toString('hex'),
      url: b.url,
      title: b.title || b.url,
      folder: b.folder || 'default',
      addedAt: b.addedAt || Date.now(),
    });
    added++;
  }
  _save();
  return added;
}

/** Return unique folder names used by saved bookmarks. */
function getFolders() {
  _load();
  const folders = new Set(_bookmarks.map(b => b.folder || 'default'));
  return [...folders];
}

/** Reset in-memory state for tests (does not write to disk). */
function reset() { _bookmarks = []; _loaded = false; }

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { add, remove, removeByUrl, isBookmarked, getAll, search, update, clear, exportAll, importBookmarks, getFolders, reset };
