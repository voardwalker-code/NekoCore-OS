// ── Tests · Memory Schema.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/contracts/memory-schema. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MEMORY_SCHEMA_VERSION, normalizeMemoryRecord } = require('../../server/contracts/memory-schema');

test('normalizeMemoryRecord applies default schema version', () => {
  const out = normalizeMemoryRecord({ memory_id: 'mem_1' });
  assert.equal(out.memorySchemaVersion, MEMORY_SCHEMA_VERSION);
});

test('normalizeMemoryRecord maps id to memory_id', () => {
  const out = normalizeMemoryRecord({ id: 'abc', type: 'semantic' });
  assert.equal(out.memory_id, 'abc');
  assert.equal(out.type, 'semantic');
});

test('normalizeMemoryRecord sanitizes topics to string array', () => {
  const out = normalizeMemoryRecord({ topics: ['alpha', '', 10, 'beta'] });
  assert.deepEqual(out.topics, ['alpha', 'beta']);
});
