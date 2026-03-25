// ── Entity Genesis — Guard & Unit Tests ─────────────────────────────────────
// Locks existing contracts and structure before Entity Genesis implementation.
// Run with: node --test tests/unit/entity-genesis-guards.test.js (from project/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ── File existence guards ───────────────────────────────────────────────────

test('entityPaths.js exists', () => {
  assert.ok(existsSync(resolve('server/entityPaths.js')));
});

test('memory-schema.js exists', () => {
  assert.ok(existsSync(resolve('server/contracts/memory-schema.js')));
});

test('entity-routes.js exists', () => {
  assert.ok(existsSync(resolve('server/routes/entity-routes.js')));
});

test('MA-tasks.js exists', () => {
  assert.ok(existsSync(resolve('MA/MA-server/MA-tasks.js')));
});

test('MA-blueprints modules directory exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules')));
});

test('slash-interceptor.js has /ma case', () => {
  const src = readFileSync(resolve('server/routes/slash-interceptor.js'), 'utf8');
  assert.ok(src.includes("case 'ma':"), '/ma must still be in interceptor');
});

// ── entityPaths contract ────────────────────────────────────────────────────

test('entityPaths exports required functions', () => {
  const ep = require(resolve('server/entityPaths.js'));
  const required = [
    'getEntityRoot', 'getMemoryRoot', 'getEpisodicMemoryPath',
    'getSemanticMemoryPath', 'getNeurochemistryPath', 'getEntityFile',
    'getIndexPath', 'getBeliefsPath', 'normalizeEntityId'
  ];
  for (const fn of required) {
    assert.equal(typeof ep[fn], 'function', `${fn} must be exported`);
  }
});

test('entityPaths normalizeEntityId strips prefix', () => {
  const { normalizeEntityId } = require(resolve('server/entityPaths.js'));
  assert.equal(normalizeEntityId('entity_luna'), 'luna');
  assert.equal(normalizeEntityId('luna'), 'luna');
  assert.equal(normalizeEntityId('entity_entity_test'), 'test');
});

// ── memory-schema contract ──────────────────────────────────────────────────

test('memory-schema normalizeMemoryRecord returns required fields', () => {
  const { normalizeMemoryRecord } = require(resolve('server/contracts/memory-schema.js'));
  const rec = normalizeMemoryRecord({ memory_id: 'test_123', type: 'episodic' });
  assert.ok(rec.memory_id, 'memory_id required');
  assert.ok(rec.type, 'type required');
  assert.ok(rec.created, 'created required');
  assert.equal(typeof rec.importance, 'number', 'importance must be number');
  assert.equal(typeof rec.decay, 'number', 'decay must be number');
  assert.ok(Array.isArray(rec.topics), 'topics must be array');
});

// ── MA task types registry ──────────────────────────────────────────────────

const MA_TASKS_SRC = readFileSync(resolve('MA/MA-server/MA-tasks.js'), 'utf8');

test('MA TASK_TYPES has all 9 current types', () => {
  const expected = [
    'architect', 'delegate', 'code', 'research', 'deep_research',
    'writing', 'analysis', 'project', 'memory_query'
  ];
  for (const t of expected) {
    assert.ok(MA_TASKS_SRC.includes(`${t}:`), `TASK_TYPES must have ${t}`);
  }
});

test('MA classify function exists', () => {
  assert.ok(MA_TASKS_SRC.includes('function classify'), 'classify must exist');
});

test('MA getBlueprint function exists', () => {
  assert.ok(MA_TASKS_SRC.includes('function getBlueprint'), 'getBlueprint must exist');
});

// ── MA blueprint structure ──────────────────────────────────────────────────

test('MA core blueprints exist', () => {
  const coreDir = resolve('MA/MA-blueprints/core');
  const expected = ['task-decomposition.md', 'tool-guide.md', 'error-recovery.md', 'quality-gate.md', 'output-format.md'];
  for (const f of expected) {
    assert.ok(existsSync(resolve(coreDir, f)), `${f} must exist`);
  }
});

test('MA module blueprints exist for current task types', () => {
  const modDir = resolve('MA/MA-blueprints/modules');
  const expected = ['code.md', 'research.md', 'analysis.md', 'writing.md', 'architect.md'];
  for (const f of expected) {
    assert.ok(existsSync(resolve(modDir, f)), `${f} must exist`);
  }
});

// ── Entity enrichment routes (post-implementation) ──────────────────────────

test('entity-enrichment-routes.js exists after implementation', () => {
  const exists = existsSync(resolve('server/routes/entity-enrichment-routes.js'));
  // This will fail before Slice 1 — that's expected and confirms guard ordering
  assert.ok(exists, 'entity-enrichment-routes.js must be created by Slice 1');
});

// ── MA entity_genesis task type (post-implementation) ───────────────────────

test('entity_genesis task type registered', () => {
  assert.ok(MA_TASKS_SRC.includes('entity_genesis'), 'entity_genesis type must be added');
});

// ── MA entity genesis blueprint (post-implementation) ───────────────────────

test('entity_genesis blueprint exists', () => {
  assert.ok(
    existsSync(resolve('MA/MA-blueprints/modules/entity_genesis.md')),
    'entity_genesis.md blueprint must exist'
  );
});

// ── MA entity genesis skill (post-implementation) ───────────────────────────

test('entity-genesis skill file exists', () => {
  assert.ok(
    existsSync(resolve('MA/MA-skills/entity-genesis/SKILL.md')),
    'entity-genesis SKILL.md must exist'
  );
});
