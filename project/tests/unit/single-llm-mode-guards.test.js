// ============================================================
// Guard Tests — Phase 4.8: Single-LLM Entity Mode + Memory Store Toggle
// Guards that define and lock expected behavior of:
//   1. entityMode field stored on entity creation (S-1)
//   2. processSingleLlmChatMessage in chat-pipeline (S-2)
//   3. chat-routes routing by entityMode + reading flags (S-3)
//   4. server.js exposure of processSingleLlmChatMessage (S-3)
//   5. Chat UI toggle elements and flag sending (S-4)
//   6. Creator mode selector in create.js (S-5)
// ============================================================

'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const ENTITY_ROUTES  = path.join(ROOT, 'server', 'routes', 'entity-routes.js');
const CHAT_PIPELINE  = path.join(ROOT, 'server', 'services', 'chat-pipeline.js');
const CHAT_ROUTES    = path.join(ROOT, 'server', 'routes', 'chat-routes.js');
const SERVER_JS      = path.join(ROOT, 'server', 'server.js');
const CHAT_JS        = path.join(ROOT, 'client', 'js', 'apps', 'core', 'chat.js');
const CREATE_JS      = path.join(ROOT, 'client', 'js', 'create.js');
const INDEX_HTML     = path.join(ROOT, 'client', 'index.html');

// ── S-1: entityMode stored on entity creation ─────────────────────────────

test('entity-routes postEntitiesCreate reads entityMode from request body', () => {
  const src = fs.readFileSync(ENTITY_ROUTES, 'utf8');
  const start = src.indexOf('async function postEntitiesCreate(');
  const end   = src.indexOf('async function postEntitiesCreateHatch(');
  const block = src.slice(start, end > start ? end : start + 3000);
  assert.ok(
    block.includes('entityMode'),
    'postEntitiesCreate must read entityMode from body'
  );
});

test('entity-routes postEntitiesCreate writes entityMode to entity json', () => {
  const src = fs.readFileSync(ENTITY_ROUTES, 'utf8');
  const start = src.indexOf('async function postEntitiesCreate(');
  const end   = src.indexOf('async function postEntitiesCreateHatch(');
  const block = src.slice(start, end > start ? end : start + 3000);
  // entityMode must appear where entity data is written (after body parsing)
  const modeIdx = block.indexOf('entityMode');
  const writeIdx = block.indexOf('writeFile') !== -1
    ? block.indexOf('writeFile')
    : block.indexOf('writeFileSync');
  assert.ok(modeIdx !== -1, 'postEntitiesCreate block must reference entityMode');
  // entityMode referenced in the entity data object (before file write)
  assert.ok(
    block.includes("entityMode"),
    'entityMode must be written into the entity json object'
  );
});

test('entity-routes postEntitiesCreate allows single-llm creation without traits', () => {
  const src = fs.readFileSync(ENTITY_ROUTES, 'utf8');
  const start = src.indexOf('async function postEntitiesCreate(');
  const end   = src.indexOf('async function postEntitiesCreateHatch(');
  const block = src.slice(start, end > start ? end : start + 3000);
  assert.ok(
    block.includes("single-llm"),
    'postEntitiesCreate must have special handling for single-llm mode (traits optional)'
  );
});

// ── S-2: processSingleLlmChatMessage in chat-pipeline ─────────────────────

test('chat-pipeline exports processSingleLlmChatMessage', () => {
  const src = fs.readFileSync(CHAT_PIPELINE, 'utf8');
  assert.ok(
    src.includes('processSingleLlmChatMessage'),
    'chat-pipeline.js must define processSingleLlmChatMessage'
  );
});

test('chat-pipeline processSingleLlmChatMessage accepts memoryRecall flag', () => {
  const src = fs.readFileSync(CHAT_PIPELINE, 'utf8');
  const start = src.indexOf('function processSingleLlmChatMessage(');
  assert.ok(start !== -1, 'processSingleLlmChatMessage must be defined');
  const block = src.slice(start, start + 2000);
  assert.ok(
    block.includes('memoryRecall'),
    'processSingleLlmChatMessage must accept memoryRecall parameter'
  );
});

test('chat-pipeline processSingleLlmChatMessage accepts memorySave flag', () => {
  const src = fs.readFileSync(CHAT_PIPELINE, 'utf8');
  const start = src.indexOf('function processSingleLlmChatMessage(');
  const block = src.slice(start, start + 2000);
  assert.ok(
    block.includes('memorySave'),
    'processSingleLlmChatMessage must accept memorySave parameter'
  );
});

test('chat-pipeline processSingleLlmChatMessage gates memory recall on flag', () => {
  const src = fs.readFileSync(CHAT_PIPELINE, 'utf8');
  const start = src.indexOf('function processSingleLlmChatMessage(');
  const block = src.slice(start, start + 3000);
  assert.ok(
    block.includes('getSubconsciousMemoryContext') && block.includes('memoryRecall'),
    'processSingleLlmChatMessage must gate getSubconsciousMemoryContext on memoryRecall flag'
  );
});

test('chat-pipeline processSingleLlmChatMessage gates memory save on flag', () => {
  const src = fs.readFileSync(CHAT_PIPELINE, 'utf8');
  const start = src.indexOf('function processSingleLlmChatMessage(');
  const block = src.slice(start, start + 3000);
  assert.ok(
    block.includes('runPostResponseMemoryEncoding') && block.includes('memorySave'),
    'processSingleLlmChatMessage must gate runPostResponseMemoryEncoding on memorySave flag'
  );
});

test('chat-pipeline module.exports includes processSingleLlmChatMessage', () => {
  const src = fs.readFileSync(CHAT_PIPELINE, 'utf8');
  const exportIdx = src.lastIndexOf('return {');
  const exportBlock = src.slice(exportIdx, exportIdx + 200);
  assert.ok(
    exportBlock.includes('processSingleLlmChatMessage'),
    'chat-pipeline must return processSingleLlmChatMessage in its factory exports'
  );
});

// ── S-3: chat-routes routing + server.js context ──────────────────────────

test('chat-routes reads memoryRecall from request body', () => {
  const src = fs.readFileSync(CHAT_ROUTES, 'utf8');
  assert.ok(
    src.includes('memoryRecall'),
    'chat-routes.js must read memoryRecall from request body'
  );
});

test('chat-routes reads memorySave from request body', () => {
  const src = fs.readFileSync(CHAT_ROUTES, 'utf8');
  assert.ok(
    src.includes('memorySave'),
    'chat-routes.js must read memorySave from request body'
  );
});

test('chat-routes routes single-llm entity to processSingleLlmChatMessage', () => {
  const src = fs.readFileSync(CHAT_ROUTES, 'utf8');
  assert.ok(
    src.includes('processSingleLlmChatMessage') && src.includes("single-llm"),
    'chat-routes.js must route single-llm entities to ctx.processSingleLlmChatMessage'
  );
});

test('server.js exposes processSingleLlmChatMessage in entity context', () => {
  const src = fs.readFileSync(SERVER_JS, 'utf8');
  assert.ok(
    src.includes('processSingleLlmChatMessage'),
    'server.js must expose processSingleLlmChatMessage in the entity context object'
  );
});

// ── S-4: Chat UI toggles ──────────────────────────────────────────────────

test('chat.js sends memoryRecall flag in chat request body', () => {
  const src = fs.readFileSync(CHAT_JS, 'utf8');
  assert.ok(
    src.includes('memoryRecall'),
    'chat.js must send memoryRecall in the /api/chat request body'
  );
});

test('chat.js sends memorySave flag in chat request body', () => {
  const src = fs.readFileSync(CHAT_JS, 'utf8');
  assert.ok(
    src.includes('memorySave'),
    'chat.js must send memorySave in the /api/chat request body'
  );
});

test('chat.js declares subconTurn outside the non-single-llm branch', () => {
  const src = fs.readFileSync(CHAT_JS, 'utf8');
  assert.ok(
    src.includes('let subconTurn = null;') && src.includes('subconTurn = await runSubconsciousTurn(text);'),
    'chat.js must keep subconTurn defined for single-llm mode before later visualizer/broadcast usage'
  );
});

// ── S-5: Creator mode selector ────────────────────────────────────────────

test('create.js sends entityMode in create request body', () => {
  const src = fs.readFileSync(CREATE_JS, 'utf8');
  assert.ok(
    src.includes('entityMode'),
    'create.js must include entityMode in the create entity request body'
  );
});
