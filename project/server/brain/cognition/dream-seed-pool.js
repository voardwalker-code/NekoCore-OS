// ── Brain · Dream Seed Pool ────────────────────────────────────────────────────
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
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// REM System — Dream Seed Pool
// A ring buffer of interrupted pulse thoughts that the dream
// engine drains before falling back to random memory selection.
// When the brain-loop interrupts the cognitive pulse, the last
// visited memory node is pushed here so dreams stay personally
// meaningful — reflecting what the entity was actually thinking.
// ============================================================

class DreamSeedPool {
  /**
   * @param {number} capacity — max seeds held before oldest is evicted (default 20)
   */
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor(capacity = 20) {
    this.capacity = capacity;
    this._pool = [];
  }

  /**
   * Push a pulse node into the pool.
   * Evicts the oldest entry when capacity is exceeded.
   * @param {Object} memory — pulse node: { nodeId, title, timestamp, hopCount, path, ... }
   */
  // push()
  // WHAT THIS DOES: push is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call push(...) where this helper behavior is needed.
  push(memory) {
    if (!memory) return;
    this._pool.push(memory);
    if (this._pool.length > this.capacity) {
      this._pool.shift();
    }
  }

  /**
   * Drain all seeds from the pool and return them.
   * Pool is empty after this call.
   * @returns {Object[]}
   */
  // drain()
  // WHAT THIS DOES: drain is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call drain(...) where this helper behavior is needed.
  drain() {
    const seeds = this._pool.slice();
    this._pool = [];
    return seeds;
  }

  /**
   * Peek at current pool contents without consuming them.
   * @returns {Object[]}
   */
  // peek()
  // WHAT THIS DOES: peek is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call peek(...) where this helper behavior is needed.
  peek() {
    return this._pool.slice();
  }

  /** Current number of seeds in the pool. */
  get size() {
    return this._pool.length;
  }
}

module.exports = DreamSeedPool;
