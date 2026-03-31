// ── Services · Browser Event Bus ────────────────────────────────────────────
//
// HOW BROWSER EVENTS WORK:
// Think of this like a radio station inside browser-host. Different parts of
// the system publish updates (tab ready, download started), and listeners tune
// into channels they care about.
//
// This bus also broadcasts every event to the "*" channel so tools can observe
// all traffic in one place.
//
// WHAT USES THIS:
//   tab-model.js, navigation.js, lifecycle.js, download-manager.js — publish state updates
//
// EXPORTS:
//   BrowserEventBus instance — EventEmitter with stamped emit()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — Event Bus
 *
 * Lightweight pub/sub for browser host events.
 * Keeps event emission decoupled from host internals.
 */

const { EventEmitter } = require('events');

class BrowserEventBus extends EventEmitter {
  /** Emit channel event and mirrored wildcard event with timestamp. */
  emit(channel, payload) {
    const stamped = { ...payload, timestamp: payload.timestamp || Date.now() };
    super.emit(channel, stamped);
    super.emit('*', { channel, ...stamped });
    return true;
  }
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = new BrowserEventBus();
