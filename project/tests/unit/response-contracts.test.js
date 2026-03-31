// ── Tests · Response Contracts.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/contracts/response-contracts. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  enforceResponseContract,
  validateChatResponse,
  validateMemoriesReconstructResponse,
  validateDocumentIngestResponse
} = require('../../server/contracts/response-contracts');

test('validateChatResponse returns no errors for valid payload', () => {
  const errs = validateChatResponse({ ok: true, response: 'hello', innerDialog: {} });
  assert.deepEqual(errs, []);
});

test('validateChatResponse allows omitting innerDialog', () => {
  const errs = validateChatResponse({ ok: true, response: 'hello' });
  assert.deepEqual(errs, []);
});

test('validateMemoriesReconstructResponse requires reconstructed string', () => {
  const errs = validateMemoriesReconstructResponse({ ok: true, reconstructed: 10 });
  assert.ok(errs.length > 0);
});

test('validateDocumentIngestResponse validates required fields', () => {
  const errs = validateDocumentIngestResponse({ ok: true, chunkId: 'doc_1', topics: ['x'], importance: 0.8, overwritten: false });
  assert.deepEqual(errs, []);
});

test('enforceResponseContract throws for invalid payload', () => {
  assert.throws(() => {
    enforceResponseContract('/api/chat', { ok: true, response: 123 });
  }, /Response contract violation/);
});
