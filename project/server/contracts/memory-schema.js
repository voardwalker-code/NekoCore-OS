// ── Contracts · Memory Record Schema ──────────────────────────────────────────
//
// HOW THIS CONTRACT WORKS:
// This file defines the canonical normalized shape for persisted memory records.
// It converts loose/legacy input into stable v2 memory metadata fields.
//
// WHAT USES THIS:
//   memory persistence and retrieval layers that read/write memory records
//
// EXPORTS:
//   MEMORY_SCHEMA_VERSION, VALID_SHAPES, normalizeMemoryRecord()
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Memory Schema Contract
// Shared canonical record shape for persisted memory metadata.
//
// v1: Base fields (importance, decay, topics, emotionalTag, etc.)
// v2: Memory-agent fields (creationContext, shape, edges,
//     activationLevel, lastActivationContext)
// ============================================================

const MEMORY_SCHEMA_VERSION = 2;

const VALID_SHAPES = Object.freeze([
  'narrative', 'reflective', 'factual', 'emotional', 'anticipatory', 'unclassified'
]);
/** Convert unknown input to a finite number or a fallback value. */
function toFiniteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
/** Keep only trimmed non-empty strings from an input array. */
function toStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter(v => typeof v === 'string')
    .map(v => v.trim())
    .filter(Boolean);
}
/** Keep only valid memory edge descriptors. */
function normalizeEdges(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(e =>
    e && typeof e === 'object' &&
    typeof e.targetId === 'string' &&
    typeof e.relation === 'string' &&
    typeof e.strength === 'number' && Number.isFinite(e.strength)
  );
}
/** Normalize one memory record into the canonical schema shape. */
function normalizeMemoryRecord(input, options = {}) {
  const record = (input && typeof input === 'object') ? input : {};
  const now = new Date().toISOString();

  const shape = typeof record.shape === 'string' && VALID_SHAPES.includes(record.shape)
    ? record.shape
    : 'unclassified';

  return {
    memorySchemaVersion: MEMORY_SCHEMA_VERSION,
    memory_id: String(record.memory_id || record.id || options.defaultId || ''),
    type: String(record.type || options.defaultType || 'episodic'),
    created: String(record.created || now),
    last_accessed: String(record.last_accessed || record.created || now),
    access_count: Math.max(0, Math.floor(toFiniteNumber(record.access_count, 0))),
    access_events: Array.isArray(record.access_events) ? record.access_events : [],
    decay: toFiniteNumber(record.decay, 1.0),
    importance: toFiniteNumber(record.importance, 0.5),
    topics: toStringArray(record.topics),
    emotionalTag: typeof record.emotionalTag === 'string' ? record.emotionalTag : null,
    // v2 fields — memory-agent identity
    creationContext: (record.creationContext && typeof record.creationContext === 'object')
      ? record.creationContext
      : null,
    shape,
    edges: normalizeEdges(record.edges),
    activationLevel: Math.min(1.0, Math.max(0.0, toFiniteNumber(record.activationLevel, 0.0))),
    lastActivationContext: (record.lastActivationContext && typeof record.lastActivationContext === 'object')
      ? record.lastActivationContext
      : null
  };
}

module.exports = {
  MEMORY_SCHEMA_VERSION,
  VALID_SHAPES,
  normalizeMemoryRecord
};
