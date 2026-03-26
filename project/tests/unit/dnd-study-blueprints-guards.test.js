// ── D&D + Study Blueprints — Guard Tests ────────────────────────────────────
// Locks existing task classification, blueprint/skill file structure, and
// entity creation contracts before adding D&D + Education/Study blueprints.
// Run with: node --test tests/unit/dnd-study-blueprints-guards.test.js (from project/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ── Source snapshots ────────────────────────────────────────────────────────

const MA_TASKS_SRC = readFileSync(resolve('MA/MA-server/MA-tasks.js'), 'utf8');

// ── File existence guards ───────────────────────────────────────────────────

test('MA-tasks.js exists', () => {
  assert.ok(existsSync(resolve('MA/MA-server/MA-tasks.js')));
});

test('MA-Server.js exists', () => {
  assert.ok(existsSync(resolve('MA/MA-Server.js')));
});

test('entity_genesis blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/entity_genesis.md')));
});

test('book_ingestion blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/book_ingestion.md')));
});

test('entity-genesis skill exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/entity-genesis/SKILL.md')));
});

test('book-ingestion skill exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/book-ingestion/SKILL.md')));
});

test('book-ingestion runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/book-ingestion/SKILL.md')));
});

test('entity-enrichment-routes.js exists', () => {
  assert.ok(existsSync(resolve('server/routes/entity-enrichment-routes.js')));
});

test('entity-routes.js exists', () => {
  assert.ok(existsSync(resolve('server/routes/entity-routes.js')));
});

test('memory-schema.js exists', () => {
  assert.ok(existsSync(resolve('server/contracts/memory-schema.js')));
});

// ── MA task types registry — all 11 existing types preserved ────────────────

test('MA TASK_TYPES has all 11 existing types', () => {
  const expected = [
    'architect', 'delegate', 'code', 'research', 'deep_research',
    'writing', 'analysis', 'project', 'memory_query',
    'entity_genesis', 'book_ingestion'
  ];
  for (const t of expected) {
    assert.ok(MA_TASKS_SRC.includes(`${t}:`), `TASK_TYPES must have ${t}`);
  }
});

test('COMPLEX_TASK_TYPES includes expected types', () => {
  assert.ok(MA_TASKS_SRC.includes("'architect'"), 'architect must be complex');
  assert.ok(MA_TASKS_SRC.includes("'code'"), 'code must be complex');
  assert.ok(MA_TASKS_SRC.includes("'deep_research'"), 'deep_research must be complex');
  assert.ok(MA_TASKS_SRC.includes("'project'"), 'project must be complex');
  assert.ok(MA_TASKS_SRC.includes("'entity_genesis'"), 'entity_genesis must be complex');
  assert.ok(MA_TASKS_SRC.includes("'book_ingestion'"), 'book_ingestion must be complex');
});

// ── MA classify function contract ───────────────────────────────────────────

test('classify function exists and is exported', () => {
  const mod = require(resolve('MA/MA-server/MA-tasks.js'));
  assert.equal(typeof mod.classify, 'function');
});

test('classify returns correct shape', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const result = classify('hello world');
  assert.ok('intent' in result);
  assert.ok('taskType' in result);
  assert.ok('confidence' in result);
});

// ── Existing classification routes — no regressions ─────────────────────────

test('classify: "create entity Luna" → entity_genesis', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create entity Luna, a vampire from Romania');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'entity_genesis');
});

test('classify: "ingest this book" → book_ingestion', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('ingest this book and extract all characters');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'book_ingestion');
});

test('classify: "extract characters from novel" → book_ingestion', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('extract characters from this novel');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'book_ingestion');
});

test('classify: "write a function to sort" → code', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('write a function to sort an array in javascript');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'code');
});

test('classify: "deep dive research on AI" → deep_research', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('deep dive research on artificial intelligence');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'deep_research');
});

test('classify: "analyze the pros and cons" → analysis', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('analyze the pros and cons of this approach');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'analysis');
});

test('classify: "do you remember what we talked about" → memory_query', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('do you remember what we talked about yesterday');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'memory_query');
});

// ── Blueprint content guards ────────────────────────────────────────────────

test('entity_genesis blueprint has entity creation tool references', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/entity_genesis.md'), 'utf8');
  assert.ok(bp.includes('entity_create'), 'must reference entity_create tool');
  assert.ok(bp.includes('entity_inject_memory'), 'must reference entity_inject_memory tool');
  assert.ok(bp.includes('MA-workspace/entities/'), 'must reference workspace entity output path');
});

test('book_ingestion blueprint has POV Isolation', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/book_ingestion.md'), 'utf8');
  assert.ok(bp.includes('POV Isolation'), 'must contain POV isolation section');
});

test('book_ingestion blueprint has character selection modes', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/book_ingestion.md'), 'utf8');
  assert.ok(bp.includes('Main Characters Only'), 'must have main characters mode');
  assert.ok(bp.includes('All Characters'), 'must have all characters mode');
});

// ── Skill content guards ────────────────────────────────────────────────────

test('entity-genesis skill has YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/entity-genesis/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: entity-genesis'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('book-ingestion skill has YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/book-ingestion/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: book-ingestion'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

// ── MA exports contract ─────────────────────────────────────────────────────

test('MA-tasks.js exports classify, runTask, TASK_TYPES, parsePlan, getBlueprint', () => {
  const mod = require(resolve('MA/MA-server/MA-tasks.js'));
  assert.equal(typeof mod.classify, 'function');
  assert.equal(typeof mod.runTask, 'function');
  assert.ok(mod.TASK_TYPES, 'TASK_TYPES must be exported');
  assert.equal(typeof mod.parsePlan, 'function');
  assert.equal(typeof mod.getBlueprint, 'function');
});

// ── RULES coverage guard ────────────────────────────────────────────────────

test('RULES has entries for all 11 existing task types', () => {
  const expected = [
    'delegate', 'architect', 'code', 'deep_research', 'research',
    'writing', 'analysis', 'project', 'memory_query',
    'entity_genesis', 'book_ingestion'
  ];
  for (const t of expected) {
    assert.ok(MA_TASKS_SRC.includes(`${t}:`), `RULES must have entry for ${t}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — study_guide + dnd_create integration tests
// ═══════════════════════════════════════════════════════════════════════════════

// ── study_guide task type ───────────────────────────────────────────────────

test('TASK_TYPES has study_guide', () => {
  assert.ok(MA_TASKS_SRC.includes('study_guide:'), 'study_guide must be in TASK_TYPES');
});

test('COMPLEX_TASK_TYPES includes study_guide', () => {
  assert.ok(MA_TASKS_SRC.includes("'study_guide'"), 'study_guide must be complex');
});

test('RULES has study_guide classification', () => {
  assert.ok(MA_TASKS_SRC.includes('study_guide:'), 'study_guide must be in RULES');
});

test('study_guide blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/study_guide.md')));
});

test('study_guide blueprint has mode detection', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/study_guide.md'), 'utf8');
  assert.ok(bp.includes('FLASHCARD MODE'), 'must have flashcard mode');
  assert.ok(bp.includes('OUTLINE MODE'), 'must have outline mode');
  assert.ok(bp.includes('TIMELINE MODE'), 'must have timeline mode');
  assert.ok(bp.includes('STUDY GUIDE MODE'), 'must have study guide mode');
});

test('study_guide blueprint has output phases', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/study_guide.md'), 'utf8');
  assert.ok(bp.includes('ws_write'), 'must use ws_write for output');
  assert.ok(bp.includes('web_search'), 'must use web_search for research');
});

test('study-guide skill exists with YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/study-guide/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: study-guide'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('study-guide runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/study-guide/SKILL.md')));
});

// study_guide classification tests
test('classify: "create a study guide for biology" → study_guide', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create a study guide for biology');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'study_guide');
});

test('classify: "make flashcards for chapter 5" → study_guide', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('make flashcards for chapter 5');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'study_guide');
});

test('classify: "build a timeline of World War 2" → study_guide', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('build a timeline of World War 2');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'study_guide');
});

test('classify: "help me study for my calculus exam" → study_guide', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('help me study for my calculus exam');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'study_guide');
});

// ── dnd_create task type ────────────────────────────────────────────────────

test('TASK_TYPES has dnd_create', () => {
  assert.ok(MA_TASKS_SRC.includes('dnd_create:'), 'dnd_create must be in TASK_TYPES');
});

test('COMPLEX_TASK_TYPES includes dnd_create', () => {
  assert.ok(MA_TASKS_SRC.includes("'dnd_create'"), 'dnd_create must be complex');
});

test('RULES has dnd_create classification', () => {
  assert.ok(MA_TASKS_SRC.includes('dnd_create:'), 'dnd_create must be in RULES');
});

test('dnd_create blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/dnd_create.md')));
});

test('dnd_create blueprint has mode detection', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_create.md'), 'utf8');
  assert.ok(bp.includes('ENCOUNTER MODE'), 'must have encounter mode');
  assert.ok(bp.includes('NPC FACTORY MODE'), 'must have NPC factory mode');
  assert.ok(bp.includes('CHARACTER MODE'), 'must have character mode');
});

test('dnd_create blueprint has entity creation API', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_create.md'), 'utf8');
  assert.ok(bp.includes('localhost:3847'), 'must reference NekoCore OS API');
  assert.ok(bp.includes('/api/entities/create'), 'must reference entity creation');
  assert.ok(bp.includes('/api/entities/{id}/memories/inject'), 'must reference memory injection');
  assert.ok(bp.includes('/api/entities/{id}/cognitive/tick'), 'must reference cognitive tick');
});

test('dnd-create skill exists with YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/dnd-create/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: dnd-create'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('dnd-create runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/dnd-create/SKILL.md')));
});

// dnd_create classification tests
test('classify: "design a combat encounter for level 5" → dnd_create', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('design a combat encounter for level 5 party');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_create');
});

test('classify: "I need a tavern full of NPCs" → dnd_create', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('I need a tavern full of NPCs for my DnD game');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_create');
});

test('classify: "roll a half-orc barbarian" → dnd_create', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('roll a half-orc barbarian character for 5e');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_create');
});

// ── No classification collisions ────────────────────────────────────────────

test('classify: "create entity Luna" still → entity_genesis (not dnd_create)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create entity Luna, a vampire from Romania');
  assert.equal(r.taskType, 'entity_genesis');
});

test('classify: "ingest this book" still → book_ingestion (not study_guide)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('ingest this book and extract all characters');
  assert.equal(r.taskType, 'book_ingestion');
});

test('classify: "write a function" still → code (not dnd_create or study_guide)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('write a function to sort an array in javascript');
  assert.equal(r.taskType, 'code');
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — tutor_entity + DnD entity integration tests
// ═══════════════════════════════════════════════════════════════════════════════

// ── tutor_entity task type ──────────────────────────────────────────────────

test('TASK_TYPES has tutor_entity', () => {
  assert.ok(MA_TASKS_SRC.includes('tutor_entity:'), 'tutor_entity must be in TASK_TYPES');
});

test('COMPLEX_TASK_TYPES includes tutor_entity', () => {
  assert.ok(MA_TASKS_SRC.includes("'tutor_entity'"), 'tutor_entity must be complex');
});

test('RULES has tutor_entity classification', () => {
  assert.ok(MA_TASKS_SRC.includes('tutor_entity:'), 'tutor_entity must be in RULES');
});

test('tutor_entity blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/tutor_entity.md')));
});

test('tutor_entity blueprint has mode detection', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/tutor_entity.md'), 'utf8');
  assert.ok(bp.includes('TUTOR MODE'), 'must have tutor mode');
  assert.ok(bp.includes('TA MODE'), 'must have TA mode');
});

test('tutor_entity blueprint has entity creation API', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/tutor_entity.md'), 'utf8');
  assert.ok(bp.includes('localhost:3847'), 'must reference NekoCore OS API');
  assert.ok(bp.includes('/api/entities/create'), 'must reference entity creation');
  assert.ok(bp.includes('/api/entities/{id}/memories/inject'), 'must reference memory injection');
  assert.ok(bp.includes('/api/entities/{id}/cognitive/tick'), 'must reference cognitive tick');
});

test('tutor_entity blueprint has memory schema', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/tutor_entity.md'), 'utf8');
  assert.ok(bp.includes('importance'), 'must reference importance');
  assert.ok(bp.includes('emotion'), 'must reference emotion');
  assert.ok(bp.includes('semantic'), 'must use semantic memory type');
  assert.ok(bp.includes('episodic'), 'must use episodic memory type');
});

test('tutor-entity skill exists with YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/tutor-entity/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: tutor-entity'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('tutor-entity runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/tutor-entity/SKILL.md')));
});

// tutor_entity classification tests
test('classify: "create a tutor for calculus" → tutor_entity', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create a tutor for calculus');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'tutor_entity');
});

test('classify: "build a TA for my biology course" → tutor_entity', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('build a TA for my biology course');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'tutor_entity');
});

test('classify: "I need a teacher for Spanish" → tutor_entity', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('I need a teacher for Spanish');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'tutor_entity');
});

// ── DnD entity integration verification ─────────────────────────────────────

test('dnd_create blueprint has memory importance tiers', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_create.md'), 'utf8');
  assert.ok(bp.includes('0.7-0.9'), 'must have formative importance tier');
  assert.ok(bp.includes('0.3-0.5'), 'must have everyday importance tier');
});

test('dnd_create blueprint has emotion list', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_create.md'), 'utf8');
  assert.ok(bp.includes('Available emotions'), 'must list available emotions');
  assert.ok(bp.includes('joy'), 'must include joy');
  assert.ok(bp.includes('neutral'), 'must include neutral');
});

test('dnd_create blueprint has cognitive state read', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_create.md'), 'utf8');
  assert.ok(bp.includes('cognitive/state'), 'must read cognitive state between chapters');
});

// ── Cross-type collision checks (all 14 types) ─────────────────────────────

test('classify: "create entity Luna" → entity_genesis (not tutor_entity)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create entity Luna, a vampire from Romania');
  assert.equal(r.taskType, 'entity_genesis');
});

test('classify: "create a tutor" → tutor_entity (not entity_genesis)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create a tutor for physics');
  assert.equal(r.taskType, 'tutor_entity');
});

test('classify: "research quantum physics" → research (not study_guide or tutor)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('research quantum physics for me');
  assert.equal(r.taskType, 'research');
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — dnd_campaign + course_creator + final classification audit
// ═══════════════════════════════════════════════════════════════════════════════

// ── dnd_campaign task type ──────────────────────────────────────────────────

test('TASK_TYPES has dnd_campaign', () => {
  assert.ok(MA_TASKS_SRC.includes('dnd_campaign:'), 'dnd_campaign must be in TASK_TYPES');
});

test('COMPLEX_TASK_TYPES includes dnd_campaign', () => {
  assert.ok(MA_TASKS_SRC.includes("'dnd_campaign'"), 'dnd_campaign must be complex');
});

test('RULES has dnd_campaign classification', () => {
  assert.ok(MA_TASKS_SRC.includes('dnd_campaign:'), 'dnd_campaign must be in RULES');
});

test('dnd_campaign blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/dnd_campaign.md')));
});

test('dnd_campaign blueprint has 4 modes', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_campaign.md'), 'utf8');
  assert.ok(bp.includes('CAMPAIGN BUILDER MODE'), 'must have campaign builder mode');
  assert.ok(bp.includes('SESSION PREP MODE'), 'must have session prep mode');
  assert.ok(bp.includes('SESSION RECAP MODE'), 'must have session recap mode');
  assert.ok(bp.includes('WORLD LORE MODE'), 'must have world lore mode');
});

test('dnd_campaign blueprint has entity integration', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_campaign.md'), 'utf8');
  assert.ok(bp.includes('/api/entities/create'), 'must reference entity creation');
  assert.ok(bp.includes('/api/entities/{id}/memories/inject'), 'must reference memory injection');
  assert.ok(bp.includes('/api/entities/{id}/cognitive/tick'), 'must reference cognitive tick');
});

test('dnd_campaign blueprint has interactive pause', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/dnd_campaign.md'), 'utf8');
  assert.ok(bp.includes('INTERACTIVE PAUSE'), 'must have interactive pause');
});

test('dnd-campaign skill exists with YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/dnd-campaign/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: dnd-campaign'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('dnd-campaign runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/dnd-campaign/SKILL.md')));
});

// dnd_campaign classification tests
test('classify: "build a DnD campaign for 5 players" → dnd_campaign', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('build a DnD campaign for 5 players');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_campaign');
});

test('classify: "session prep for next week" → dnd_campaign', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('session prep for next week');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_campaign');
});

test('classify: "recap of last session journal" → dnd_campaign', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('recap of last session journal');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_campaign');
});

test('classify: "world lore for the frozen wastes" → dnd_campaign', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('world lore for the frozen wastes');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_campaign');
});

test('classify: "faction lore for the shadowfell guild" → dnd_campaign', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('faction lore for the shadowfell guild');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'dnd_campaign');
});

// ── course_creator task type ────────────────────────────────────────────────

test('TASK_TYPES has course_creator', () => {
  assert.ok(MA_TASKS_SRC.includes('course_creator:'), 'course_creator must be in TASK_TYPES');
});

test('COMPLEX_TASK_TYPES includes course_creator', () => {
  assert.ok(MA_TASKS_SRC.includes("'course_creator'"), 'course_creator must be complex');
});

test('RULES has course_creator classification', () => {
  assert.ok(MA_TASKS_SRC.includes('course_creator:'), 'course_creator must be in RULES');
});

test('course_creator blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/course_creator.md')));
});

test('course_creator blueprint has 3 modes', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/course_creator.md'), 'utf8');
  assert.ok(bp.includes('COURSE CREATOR MODE'), 'must have course creator mode');
  assert.ok(bp.includes('BOOK-TO-COURSE MODE'), 'must have book-to-course mode');
  assert.ok(bp.includes('EXAM PREP MODE'), 'must have exam prep mode');
});

test('course_creator blueprint has interactive pause', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/course_creator.md'), 'utf8');
  assert.ok(bp.includes('INTERACTIVE PAUSE'), 'must have interactive pause');
});

test('course_creator blueprint references book upload API', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/course_creator.md'), 'utf8');
  assert.ok(bp.includes('/api/book/upload'), 'book-to-course must use existing book upload');
});

test('course_creator blueprint has assessment generation', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/course_creator.md'), 'utf8');
  assert.ok(bp.includes('Mock Exam') || bp.includes('mock exam'), 'exam prep must generate mock exam');
  assert.ok(bp.includes('Cheat Sheet') || bp.includes('cheat sheet'), 'exam prep must generate cheat sheet');
  assert.ok(bp.includes('answer key') || bp.includes('Answer Key'), 'assessments must have answer keys');
});

test('course-creator skill exists with YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/course-creator/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: course-creator'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('course-creator runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/course-creator/SKILL.md')));
});

// course_creator classification tests
test('classify: "create a course on machine learning" → course_creator', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create a course on machine learning');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'course_creator');
});

test('classify: "turn this book into a course" → course_creator', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('turn this book into a course');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'course_creator');
});

test('classify: "exam prep for calculus midterm" → course_creator', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('exam prep for calculus midterm');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'course_creator');
});

test('classify: "build a chemistry curriculum" → course_creator', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('build a chemistry curriculum');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'course_creator');
});

test('classify: "design a syllabus for intro to psychology" → course_creator', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('design a syllabus for intro to psychology');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'course_creator');
});

// ── Full cross-collision audit (all 16 types) ──────────────────────────────

test('classify: "help me study" → study_guide (not course_creator)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('help me study for biology');
  assert.equal(r.taskType, 'study_guide');
});

test('classify: "ingest this book" → book_ingestion (not course_creator)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('ingest this book and extract all characters');
  assert.equal(r.taskType, 'book_ingestion');
});

test('classify: "create NPC for 5e tavern" → dnd_create (not dnd_campaign)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create an NPC for my 5e tavern encounter');
  assert.equal(r.taskType, 'dnd_create');
});

test('classify: "generate encounter with goblins" → dnd_create (not dnd_campaign)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('generate a combat encounter with goblins for a level 3 party');
  assert.equal(r.taskType, 'dnd_create');
});

test('classify: "create entity named Shadow" → entity_genesis (not dnd_create or tutor)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create entity named Shadow, a mysterious figure');
  assert.equal(r.taskType, 'entity_genesis');
});

test('classify: "deep dive research on AI safety" → deep_research (not study_guide)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('deep dive research on AI safety and alignment');
  assert.equal(r.taskType, 'deep_research');
});

test('classify: "write me an article about cats" → writing (not study_guide)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('write me an article about cats and their behavior');
  assert.equal(r.taskType, 'writing');
});

// ── Count verification: 16 task types total ─────────────────────────────────

test('TASK_TYPES has exactly 19 entries', () => {
  const { TASK_TYPES } = require(resolve('MA/MA-server/MA-tasks.js'));
  assert.equal(Object.keys(TASK_TYPES).length, 19);
});

test('all 5 new task types are present', () => {
  const { TASK_TYPES } = require(resolve('MA/MA-server/MA-tasks.js'));
  const newTypes = ['study_guide', 'dnd_create', 'tutor_entity', 'dnd_campaign', 'course_creator'];
  for (const t of newTypes) {
    assert.ok(TASK_TYPES[t], `${t} must exist in TASK_TYPES`);
  }
});

test('COMPLEX_TASK_TYPES has exactly 14 entries', () => {
  assert.equal((MA_TASKS_SRC.match(/COMPLEX_TASK_TYPES = new Set\(\[([^\]]+)\]\)/)[1].split(',').length), 14);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — blueprint_builder meta-blueprint tests
// ═══════════════════════════════════════════════════════════════════════════════

test('TASK_TYPES has blueprint_builder', () => {
  assert.ok(MA_TASKS_SRC.includes('blueprint_builder:'), 'blueprint_builder must be in TASK_TYPES');
});

test('COMPLEX_TASK_TYPES includes blueprint_builder', () => {
  assert.ok(MA_TASKS_SRC.includes("'blueprint_builder'"), 'blueprint_builder must be complex');
});

test('RULES has blueprint_builder classification', () => {
  assert.ok(MA_TASKS_SRC.includes('blueprint_builder:'), 'blueprint_builder must be in RULES');
});

test('blueprint_builder blueprint exists', () => {
  assert.ok(existsSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md')));
});

test('blueprint_builder blueprint has quality standards section', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md'), 'utf8');
  assert.ok(bp.includes('Quality Standards'), 'must have quality standards');
  assert.ok(bp.includes('150-400 lines'), 'must specify line count target');
});

test('blueprint_builder blueprint has file structure template', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md'), 'utf8');
  assert.ok(bp.includes('Blueprint File Structure'), 'must document blueprint structure');
  assert.ok(bp.includes('Mode Detection'), 'must document mode detection pattern');
  assert.ok(bp.includes('Guidelines'), 'must require guidelines section');
});

test('blueprint_builder blueprint has tool reference', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md'), 'utf8');
  assert.ok(bp.includes('ws_write'), 'must reference ws_write');
  assert.ok(bp.includes('ws_list'), 'must reference ws_list');
  assert.ok(bp.includes('ws_read'), 'must reference ws_read');
});

test('blueprint_builder blueprint has entity integration pattern', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md'), 'utf8');
  assert.ok(bp.includes('/api/entities/create'), 'must include entity creation pattern');
  assert.ok(bp.includes('18 canonical emotions'), 'must include emotion list reference');
});

test('blueprint_builder blueprint has classifier registration guidance', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md'), 'utf8');
  assert.ok(bp.includes('TASK_TYPES'), 'must reference TASK_TYPES');
  assert.ok(bp.includes('COMPLEX_TASK_TYPES'), 'must reference COMPLEX_TASK_TYPES');
  assert.ok(bp.includes('RULES'), 'must reference RULES');
  assert.ok(bp.includes('Keyword Design Rules'), 'must have keyword guidance');
  assert.ok(bp.includes('Regex Design Rules'), 'must have regex guidance');
});

test('blueprint_builder blueprint lists existing task types', () => {
  const bp = readFileSync(resolve('MA/MA-blueprints/modules/blueprint_builder.md'), 'utf8');
  assert.ok(bp.includes('architect'), 'must list architect');
  assert.ok(bp.includes('entity_genesis'), 'must list entity_genesis');
  assert.ok(bp.includes('course_creator'), 'must list course_creator');
  assert.ok(bp.includes('blueprint_builder'), 'must list itself');
});

test('blueprint-builder skill exists with YAML frontmatter', () => {
  const sk = readFileSync(resolve('MA/MA-skills/blueprint-builder/SKILL.md'), 'utf8');
  assert.ok(sk.startsWith('---'), 'must start with YAML frontmatter');
  assert.ok(sk.includes('name: blueprint-builder'), 'must have name field');
  assert.ok(sk.includes('description:'), 'must have description field');
});

test('blueprint-builder runtime skill source exists', () => {
  assert.ok(existsSync(resolve('MA/MA-skills/blueprint-builder/SKILL.md')));
});

// blueprint_builder classification tests
test('classify: "create a blueprint for recipe management" → blueprint_builder', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('create a blueprint for recipe management');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'blueprint_builder');
});

test('classify: "there is no blueprint for meditation, make one" → blueprint_builder', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('there is no blueprint for meditation tracking, make one');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'blueprint_builder');
});

test('classify: "build a blueprint for daily journaling" → blueprint_builder', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('build a blueprint for daily journaling');
  assert.equal(r.intent, 'task');
  assert.equal(r.taskType, 'blueprint_builder');
});

// collision checks
test('classify: "write an article" → writing (not blueprint_builder)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('write an article about renewable energy');
  assert.equal(r.taskType, 'writing');
});

test('classify: "architect a project plan" → architect (not blueprint_builder)', () => {
  const { classify } = require(resolve('MA/MA-server/MA-tasks.js'));
  const r = classify('architect a project plan for my web app');
  assert.equal(r.taskType, 'architect');
});
