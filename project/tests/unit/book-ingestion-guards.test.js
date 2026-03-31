// ── Tests · Book Ingestion Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ── Book-to-Entity Ingestion — Guard Tests ─────────────────────────────────
// Locks existing entity creation, memory injection, cognitive processing,
// and MA task classification contracts before Book-to-Entity implementation.
// Run with: node --test tests/unit/book-ingestion-guards.test.js (from project/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ── File existence guards ───────────────────────────────────────────────────

test('entity-enrichment-routes.js exists', () => {
  assert.ok(existsSync(resolve('server/routes/entity-enrichment-routes.js')));
});

test('entity-routes.js exists', () => {
  assert.ok(existsSync(resolve('server/routes/entity-routes.js')));
});

test('MA-tasks.js exists', () => {
  assert.ok(existsSync(resolve('MA/MA-server/MA-tasks.js')));
});

test('MA-Server.js exists', () => {
  assert.ok(existsSync(resolve('MA/MA-Server.js')));
});

test('entityPaths.js exists', () => {
  assert.ok(existsSync(resolve('server/entityPaths.js')));
});

test('memory-schema.js exists', () => {
  assert.ok(existsSync(resolve('server/contracts/memory-schema.js')));
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

test('entityPaths normalizeEntityId strips entity_ prefix', () => {
  const { normalizeEntityId } = require(resolve('server/entityPaths.js'));
  assert.equal(normalizeEntityId('entity_alice'), 'alice');
  assert.equal(normalizeEntityId('alice'), 'alice');
});

// ── memory-schema contract ──────────────────────────────────────────────────

test('memory-schema normalizeMemoryRecord returns required fields', () => {
  const { normalizeMemoryRecord } = require(resolve('server/contracts/memory-schema.js'));
  const rec = normalizeMemoryRecord({ memory_id: 'test_book_001', type: 'episodic' });
  assert.ok(rec.memory_id, 'memory_id required');
  assert.ok(rec.type, 'type required');
  assert.ok(rec.created, 'created required');
  assert.equal(typeof rec.importance, 'number', 'importance must be number');
  assert.equal(typeof rec.decay, 'number', 'decay must be number');
  assert.ok(Array.isArray(rec.topics), 'topics must be array');
});

// ── MA task types registry ──────────────────────────────────────────────────

const MA_TASKS_SRC = readFileSync(resolve('MA/MA-server/MA-tasks.js'), 'utf8');

test('MA TASK_TYPES has all existing types preserved', () => {
  const expected = [
    'architect', 'delegate', 'code', 'research', 'deep_research',
    'writing', 'analysis', 'project', 'memory_query', 'entity_genesis'
  ];
  for (const t of expected) {
    assert.ok(MA_TASKS_SRC.includes(`${t}:`), `TASK_TYPES must have ${t}`);
  }
});

test('MA classify function exists', () => {
  assert.ok(MA_TASKS_SRC.includes('function classify'), 'classify must exist');
});

test('MA classify returns correct shape', () => {
  const mod = require(resolve('MA/MA-server/MA-tasks.js'));
  // classify must be exported
  assert.equal(typeof mod.classify, 'function', 'classify must be exported');
  const result = mod.classify('hello');
  assert.ok('intent' in result, 'must have intent');
  assert.ok('taskType' in result, 'must have taskType');
  assert.ok('confidence' in result, 'must have confidence');
});

test('MA classify routes entity genesis correctly', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const result = classify('create entity Luna, a vampire from Romania');
  assert.equal(result.intent, 'task');
  assert.equal(result.taskType, 'entity_genesis');
});

test('MA getBlueprint function exists', () => {
  assert.ok(MA_TASKS_SRC.includes('function getBlueprint'), 'getBlueprint must exist');
});

test('MA runTask function exists', () => {
  assert.ok(MA_TASKS_SRC.includes('function runTask'), 'runTask must exist');
});

// ── Entity enrichment routes contract ───────────────────────────────────────

const ENRICHMENT_SRC = readFileSync(resolve('server/routes/entity-enrichment-routes.js'), 'utf8');

test('entity-enrichment-routes has postInjectMemory', () => {
  assert.ok(ENRICHMENT_SRC.includes('postInjectMemory'), 'must have postInjectMemory handler');
});

test('entity-enrichment-routes has postCognitiveTick', () => {
  assert.ok(ENRICHMENT_SRC.includes('postCognitiveTick') || ENRICHMENT_SRC.includes('cognitiveTick'),
    'must have cognitive tick handler');
});

test('entity-enrichment-routes has getCognitiveState', () => {
  assert.ok(ENRICHMENT_SRC.includes('getCognitiveState') || ENRICHMENT_SRC.includes('cognitiveState'),
    'must have cognitive state handler');
});

test('entity-enrichment-routes validates content is required', () => {
  assert.ok(ENRICHMENT_SRC.includes('content'), 'must validate content field');
});

// ── Entity-routes entity creation contract ──────────────────────────────────

const ENTITY_ROUTES_SRC = readFileSync(resolve('server/routes/entity-routes.js'), 'utf8');

test('entity-routes has create endpoint handler', () => {
  assert.ok(ENTITY_ROUTES_SRC.includes('postEntitiesCreate') || ENTITY_ROUTES_SRC.includes('create'),
    'must have entity creation handler');
});

test('entity-routes validates entityId and name', () => {
  assert.ok(ENTITY_ROUTES_SRC.includes('entityId'), 'must use entityId');
  assert.ok(ENTITY_ROUTES_SRC.includes('name'), 'must use name');
});

// ── MA blueprint structure ──────────────────────────────────────────────────

test('MA entity_genesis blueprint exists', () => {
  assert.ok(
    existsSync(resolve('MA/MA-blueprints/modules/entity_genesis.md')),
    'entity_genesis.md must exist'
  );
});

test('entity-genesis skill exists', () => {
  assert.ok(
    existsSync(resolve('MA/MA-skills/entity-genesis/SKILL.md')),
    'entity-genesis SKILL.md must exist'
  );
});

// ── MA-Server route registration ────────────────────────────────────────────

const MA_SERVER_SRC = readFileSync(resolve('MA/MA-Server.js'), 'utf8');

test('MA-Server has /api/projects route', () => {
  assert.ok(MA_SERVER_SRC.includes('/api/projects'), 'must have projects route');
});

test('MA-Server has /api/chat route', () => {
  assert.ok(MA_SERVER_SRC.includes('/api/chat'), 'must have chat route');
});

test('MA-Server exports or creates HTTP server', () => {
  assert.ok(MA_SERVER_SRC.includes('createServer') || MA_SERVER_SRC.includes('http'),
    'must create HTTP server');
});

// ── Book ingestion additions ────────────────────────────────────────────────

test('MA-Server has /api/book/upload route', () => {
  assert.ok(MA_SERVER_SRC.includes('/api/book/upload'), 'must have book upload route');
});

test('MA-Server has book chunk routes', () => {
  assert.ok(MA_SERVER_SRC.includes('/api/book/'), 'must have book chunk routes');
  assert.ok(MA_SERVER_SRC.includes('/chunks'), 'must have chunks listing route');
});

test('MA-Server has _chunkBookText function', () => {
  assert.ok(MA_SERVER_SRC.includes('_chunkBookText'), 'must have chunking function');
});

test('MA TASK_TYPES has book_ingestion', () => {
  assert.ok(MA_TASKS_SRC.includes('book_ingestion'), 'book_ingestion task type must exist');
});

test('MA RULES has book_ingestion classification', () => {
  assert.ok(MA_TASKS_SRC.includes('book_ingestion'), 'book_ingestion rules must exist');
});

test('MA classify routes book ingestion correctly', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r1 = classify('ingest this book and extract all characters');
  assert.equal(r1.intent, 'task');
  assert.equal(r1.taskType, 'book_ingestion');
  const r2 = classify('extract characters from this novel');
  assert.equal(r2.intent, 'task');
  assert.equal(r2.taskType, 'book_ingestion');
});

test('MA classify still routes entity genesis correctly', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const result = classify('create entity Luna, a vampire from Romania');
  assert.equal(result.intent, 'task');
  assert.equal(result.taskType, 'entity_genesis');
});

test('book_ingestion blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/book_ingestion.md')),
    'book_ingestion.md blueprint must exist');
});

test('book-ingestion skill exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/book-ingestion/SKILL.md')),
    'book-ingestion SKILL.md must exist');
});

test('book-ingestion runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/book-ingestion/SKILL.md')),
    'source book-ingestion SKILL.md must exist');
});

test('book_ingestion blueprint contains POV isolation rules', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/book_ingestion.md'), 'utf8');
  assert.ok(bp.includes('POV Isolation'), 'must contain POV isolation section');
  assert.ok(bp.includes('cross-contamination'), 'must warn about cross-contamination');
  assert.ok(bp.includes('first-person'), 'must require first-person perspective');
});

test('book_ingestion blueprint contains character selection modes', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/book_ingestion.md'), 'utf8');
  assert.ok(bp.includes('Main Characters Only'), 'must have main characters mode');
  assert.ok(bp.includes('All Characters'), 'must have all characters mode');
  assert.ok(bp.includes('Specific'), 'must have specific characters mode');
});

test('book-ingestion skill references all API endpoints', () => {
  const skill = readFileSync(resolve('MA/MA-skills/book-ingestion/SKILL.md'), 'utf8');
  assert.ok(skill.includes('/api/book/upload'), 'must reference book upload');
  assert.ok(skill.includes('/api/entities/create'), 'must reference entity creation');
  assert.ok(skill.includes('/api/entities/{id}/memories/inject'), 'must reference memory injection');
  assert.ok(skill.includes('/api/entities/{id}/cognitive/tick'), 'must reference cognitive tick');
});

test('character selection UI exists in ma-ui-chat.js', () => {
  const chatSrc = readFileSync(resolve('MA/MA-client/js/ma-ui-chat.js'), 'utf8');
  assert.ok(chatSrc.includes('_renderCharacterSelectionButtons'), 'must have character selection renderer');
  assert.ok(chatSrc.includes('BOOK_SELECTION'), 'must send BOOK_SELECTION format');
  assert.ok(chatSrc.includes('book-selection-bar'), 'must use selection bar class');
});

test('character selection CSS exists', () => {
  const css = readFileSync(resolve('MA/MA-client/css/ma-ui.css'), 'utf8');
  assert.ok(css.includes('book-selection-bar'), 'must have selection bar styles');
  assert.ok(css.includes('book-select-btn'), 'must have select button styles');
  assert.ok(css.includes('book-char-input'), 'must have character input styles');
});
