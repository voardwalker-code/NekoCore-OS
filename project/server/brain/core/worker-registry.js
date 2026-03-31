// ── Brain · Worker Registry ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// Exposed API includes: registerWorker, unregisterWorker, getWorker,
// listWorkers, clearRegistry.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/brain/core/worker-registry.js
 * Phase D — Worker Subsystem Pilot
 *
 * In-memory registry mapping aspect keys to worker entity bindings.
 * Not persisted — rebuilt at runtime from config injection.
 *
 * Aspect keys: 'subconscious', 'conscious', 'dream'
 * Binding shape: { entityId: string, mode: 'subsystem', runtime: object|null }
 */

const _registry = new Map();

/**
 * Bind a worker entity to an aspect key.
 *
 * @param {string} aspectKey  - e.g. 'subconscious', 'conscious', 'dream'
 * @param {string} entityId   - The worker entity's id string
 * @param {object|null} [runtime] - LLM runtime config for the worker (required for dispatch)
 */
// registerWorker()
// WHAT THIS DOES: registerWorker is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call registerWorker(...) where this helper behavior is needed.
function registerWorker(aspectKey, entityId, runtime = null) {
  if (!aspectKey || typeof aspectKey !== 'string') return;
  if (!entityId || typeof entityId !== 'string') return;
  _registry.set(aspectKey, { entityId, mode: 'subsystem', runtime: runtime || null });
}

/**
 * Remove a worker binding for an aspect key.
 *
 * @param {string} aspectKey
 */
// unregisterWorker()
// WHAT THIS DOES: unregisterWorker is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call unregisterWorker(...) where this helper behavior is needed.
function unregisterWorker(aspectKey) {
  _registry.delete(String(aspectKey));
}

/**
 * Look up the worker binding for an aspect key.
 * Returns null if no worker is registered for that key.
 *
 * @param {string} aspectKey
 * @returns {{ entityId: string, mode: string, runtime: object|null }|null}
 */
// getWorker()
// WHAT THIS DOES: getWorker reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getWorker(...), then use the returned value in your next step.
function getWorker(aspectKey) {
  return _registry.get(String(aspectKey)) || null;
}

/**
 * List all registered workers.
 *
 * @returns {Array<{ aspectKey: string, entityId: string, mode: string, runtime: object|null }>}
 */
// listWorkers()
// WHAT THIS DOES: listWorkers is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call listWorkers(...) where this helper behavior is needed.
function listWorkers() {
  return Array.from(_registry.entries()).map(([key, binding]) => ({
    aspectKey: key,
    ...binding
  }));
}

/**
 * Clear all registered workers.
 * Useful for test isolation.
 */
// clearRegistry()
// WHAT THIS DOES: clearRegistry removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call clearRegistry(...) when you need a safe teardown/reset path.
function clearRegistry() {
  _registry.clear();
}

module.exports = { registerWorker, unregisterWorker, getWorker, listWorkers, clearRegistry };
