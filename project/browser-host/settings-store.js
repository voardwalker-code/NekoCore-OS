// ── Services · Browser Settings Store ───────────────────────────────────────
//
// HOW SETTINGS STORAGE WORKS:
// This module keeps browser preferences in memory and syncs them to a JSON
// file. On first use, it merges saved values on top of defaults so missing
// keys always get safe fallback values.
//
// WHAT USES THIS:
//   browser host routes/UI settings handlers — read and update browser settings
//
// EXPORTS:
//   getAll(), get(key), update(partial), reset(), DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — Settings Store
 *
 * Persists browser settings to disk as JSON.
 * Settings: homepage, searchEngine, sessionRestore, externalLinkBehavior.
 */

const fs = require('fs');
const path = require('path');

// ── Constants ───────────────────────────────────────────────────────────────

const SETTINGS_FILE = path.join(__dirname, '..', 'server', 'data', 'browser-settings.json');

const DEFAULTS = {
  homepage: 'https://neko-core.com',
  searchEngine: 'duckduckgo',
  sessionRestore: true,
  externalLinkBehavior: 'in-app',
};

let _settings = null;

// ── Persistence Helpers ─────────────────────────────────────────────────────

/** Load settings once and merge saved values over defaults. */
function _load() {
  if (_settings) return;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      _settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
      return;
    }
  } catch { /* ignore corrupt file */ }
  _settings = { ...DEFAULTS };
}

/** Save current settings object to disk (best effort). */
function _save() {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(_settings, null, 2));
  } catch { /* best effort */ }
}

// ── Core Logic ──────────────────────────────────────────────────────────────

/** Return a shallow copy of all settings. */
function getAll() {
  _load();
  return { ..._settings };
}

/** Return one setting value, falling back to defaults. */
function get(key) {
  _load();
  return _settings[key] !== undefined ? _settings[key] : DEFAULTS[key];
}

/** Update allowed settings keys and persist changes. */
function update(partial) {
  _load();
  const allowed = Object.keys(DEFAULTS);
  for (const [key, value] of Object.entries(partial)) {
    if (allowed.includes(key)) _settings[key] = value;
  }
  _save();
  return { ..._settings };
}

/** Reset settings to defaults and persist. */
function reset() {
  _settings = { ...DEFAULTS };
  _save();
  return { ..._settings };
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { getAll, get, update, reset, DEFAULTS };
