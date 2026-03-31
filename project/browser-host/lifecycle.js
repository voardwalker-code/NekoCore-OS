// ── Services · Browser Lifecycle ────────────────────────────────────────────
//
// HOW LIFECYCLE STATE WORKS:
// This module tracks host-level lifecycle phases for browser-host and emits a
// normalized event whenever state changes. It gives the rest of the system one
// place to ask "is browser host starting, ready, or closing?"
//
// WHAT USES THIS:
//   browser host startup/shutdown flow — sets and reads host lifecycle state
//
// EXPORTS:
//   startup(), shutdown(), setHostState(state), getHostState(), reset()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — Lifecycle Controller (NB-2-4)
 *
 * Owns: host-level lifecycle states and tab lifecycle relay.
 * Emits: browser.host.lifecycle events via the browser event bus.
 *
 * Host states: host_starting → host_ready → host_closing
 * Tab states relayed from tab-model: tab_created, tab_navigating, tab_ready, tab_closed
 */

const eventBus = require('./event-bus');

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_HOST_STATES = ['host_starting', 'host_ready', 'host_closing'];
let _hostState = null;

// ── Core Logic ──────────────────────────────────────────────────────────────

/** Set the host lifecycle state and emit it. */
function setHostState(state) {
  if (!VALID_HOST_STATES.includes(state)) {
    throw new Error(`Invalid host state: ${state}`);
  }
  _hostState = state;
  eventBus.emit('browser.host.lifecycle', { state });
}
/** Get the current host lifecycle state. */
function getHostState() {
  return _hostState;
}

/** Transition host to starting then ready. */
function startup() {
  setHostState('host_starting');
  // In a real engine integration, async init happens here.
  setHostState('host_ready');
}
/** Transition host to closing and clear in-memory state. */
function shutdown() {
  setHostState('host_closing');
  _hostState = null;
}

/** Reset lifecycle state (for tests). */
function reset() {
  _hostState = null;
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { startup, shutdown, setHostState, getHostState, reset };
