// ── Brain · Task Event Bus ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: events. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Task Event Bus
 * Per-session event queue for task execution lifecycle events.
 * Decouples the executor from consumers (Frontman, SSE streams, tests).
 */

const { EventEmitter } = require('events');

class TaskEventBus extends EventEmitter {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor() {
    super();
    // Per-session queues for polling/drain consumers
    this._queues = new Map(); // sessionId -> event[]
  }

  /**
   * Emit an event for a session
   * Broadcasts to all session subscribers and queues for drain consumers
   * @param {string} sessionId - The session ID
   * @param {Object} event - The event object ({ type, ... })
   * @returns {boolean} True
   */
  // emit()
  // WHAT THIS DOES: emit is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call emit(...) where this helper behavior is needed.
  emit(sessionId, event) {
    // Queue for drain() consumers
    if (!this._queues.has(sessionId)) {
      this._queues.set(sessionId, []);
    }
    this._queues.get(sessionId).push(event);

    // Emit on session channel
    super.emit(sessionId, event);

    // Emit wildcard for monitoring/test observers
    super.emit('*', { sessionId, ...event });

    return true;
  }

  /**
   * Subscribe to events for a session
   * @param {string} sessionId - The session ID
   * @param {Function} handler - Handler function(event)
   */
  // subscribe()
  // WHAT THIS DOES: subscribe is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call subscribe(...) where this helper behavior is needed.
  subscribe(sessionId, handler) {
    this.on(sessionId, handler);
  }

  /**
   * Unsubscribe from session events
   * @param {string} sessionId - The session ID
   * @param {Function} handler - Handler to remove
   */
  unsubscribe(sessionId, handler) {
    this.off(sessionId, handler);
  }

  /**
   * Drain all queued events for a session (clears the queue)
   * @param {string} sessionId - The session ID
   * @returns {Object[]} All queued events since last drain (or session start)
   */
  drain(sessionId) {
    const queue = this._queues.get(sessionId) || [];
    this._queues.set(sessionId, []);
    return queue;
  }

  /**
   * Peek at queued events without clearing
   * @param {string} sessionId - The session ID
   * @returns {Object[]} Queued events (read-only view)
   */
  peek(sessionId) {
    return (this._queues.get(sessionId) || []).slice();
  }

  /**
   * Clean up all listeners and queue for a session
   * Call this when a session is fully complete and no longer needed
   * @param {string} sessionId - The session ID
   */
  cleanup(sessionId) {
    this._queues.delete(sessionId);
    this.removeAllListeners(sessionId);
  }

  /**
   * Check if a session has any queued events
   * @param {string} sessionId - The session ID
   * @returns {boolean}
   */
  hasEvents(sessionId) {
    const queue = this._queues.get(sessionId);
    return queue ? queue.length > 0 : false;
  }
}

// Singleton — one bus per server process
module.exports = new TaskEventBus();
