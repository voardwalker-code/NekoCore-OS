// ── Services · Browser Host Index ───────────────────────────────────────────
//
// HOW THE BROWSER HOST MODULE WORKS:
// This file is the front desk for browser-host internals. It gathers each
// focused sub-module (tabs, navigation, lifecycle, storage) and exports one
// object so callers can use a stable API from one import path.
//
// WHAT USES THIS:
//   browser host startup/route wiring — imports one shared browser host module
//
// EXPORTS:
//   name, version                       — module identity
//   eventBus, tabModel, navigation      — runtime tab/nav primitives
//   lifecycle, downloadManager          — lifecycle + download state
//   historyStore, bookmarkStore         — persisted browsing data
//   sessionStore, settingsStore         — session + settings persistence
//   researchSession                     — research-mode session storage
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — entry point.
 *
 * Owns: embedded-engine runtime lifecycle, window/tab primitives,
 *       navigation execution, and host event emission.
 * Must NOT contain: REM memory writes, entity orchestration, or route handlers.
 */

// ── Constants ───────────────────────────────────────────────────────────────

const MODULE_NAME = '@nekocore/browser-host';
const MODULE_VERSION = '0.0.1';

// ── Imports ─────────────────────────────────────────────────────────────────

const eventBus         = require('./event-bus');
const tabModel         = require('./tab-model');
const navigation       = require('./navigation');
const lifecycle        = require('./lifecycle');
const downloadManager  = require('./download-manager');
const historyStore     = require('./history-store');
const bookmarkStore    = require('./bookmark-store');
const sessionStore     = require('./session-store');
const settingsStore    = require('./settings-store');
const researchSession  = require('./research-session');

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  eventBus,
  tabModel,
  navigation,
  lifecycle,
  downloadManager,
  historyStore,
  bookmarkStore,
  sessionStore,
  settingsStore,
  researchSession,
};
