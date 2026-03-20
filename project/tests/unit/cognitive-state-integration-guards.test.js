// Cognitive State Integration — Guard Tests (Slice C0)
// Verifies structure, API surface, and integration points for cognitive snapshot
// and cognitive feedback systems. Runs before implementation slices to catch regressions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── File paths ────────────────────────────────────────────────────────────────

const CONTRACT_FILE    = resolve('server/contracts/cognitive-snapshot-contract.js');
const ASSEMBLER_FILE   = resolve('server/brain/cognition/cognitive-snapshot.js');
const FEEDBACK_FILE    = resolve('server/brain/cognition/cognitive-feedback.js');
const MAGNITUDE_FILE   = resolve('server/brain/cognition/interaction-magnitude.js');
const ORCH_FILE        = resolve('server/brain/core/orchestrator.js');
const PIPELINE_FILE    = resolve('server/services/chat-pipeline.js');
const GOALS_FILE       = resolve('server/brain/identity/goals-manager.js');
const BELIEF_FILE      = resolve('server/brain/knowledge/beliefGraph.js');
const NEURO_FILE       = resolve('server/brain/affect/neurochemistry.js');
const CURIOSITY_FILE   = resolve('server/brain/cognition/curiosity-engine.js');
const THOUGHT_TYPES    = resolve('server/brain/bus/thought-types.js');
const POST_MEM_FILE    = resolve('server/services/post-response-memory.js');

// ── Helper: read file safely ──────────────────────────────────────────────────

function readSafe(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 1: New file existence (these fail until implementation slices land)
// ════════════════════════════════════════════════════════════════════════════════

test('cognitive-snapshot-contract.js exists', () => {
  assert.ok(existsSync(CONTRACT_FILE), 'contract file must exist');
});

test('cognitive-snapshot.js assembler exists', () => {
  assert.ok(existsSync(ASSEMBLER_FILE), 'snapshot assembler must exist');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 2: Contract API surface
// ════════════════════════════════════════════════════════════════════════════════

const CONTRACT_SRC = readSafe(CONTRACT_FILE);

test('contract exports validateSnapshot', () => {
  assert.ok(CONTRACT_SRC.includes('validateSnapshot'), 'validateSnapshot must be exported');
});

test('contract exports buildSnapshotBlock', () => {
  assert.ok(CONTRACT_SRC.includes('buildSnapshotBlock'), 'buildSnapshotBlock must be exported');
});

test('contract validates beliefs section', () => {
  assert.ok(CONTRACT_SRC.includes('beliefs'), 'contract must validate beliefs');
});

test('contract validates goals section', () => {
  assert.ok(CONTRACT_SRC.includes('goals'), 'contract must validate goals');
});

test('contract validates mood section', () => {
  assert.ok(CONTRACT_SRC.includes('mood'), 'contract must validate mood');
});

test('contract validates curiosity section', () => {
  assert.ok(CONTRACT_SRC.includes('curiosity'), 'contract must validate curiosity');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 3: Snapshot assembler API surface
// ════════════════════════════════════════════════════════════════════════════════

const ASSEMBLER_SRC = readSafe(ASSEMBLER_FILE);

test('assembler exports assembleCognitiveSnapshot', () => {
  assert.ok(ASSEMBLER_SRC.includes('assembleCognitiveSnapshot'), 'main assembler function must be exported');
});

test('assembler references beliefGraph', () => {
  assert.ok(ASSEMBLER_SRC.includes('beliefGraph') || ASSEMBLER_SRC.includes('getRelevantBeliefs'),
    'assembler must read from belief graph');
});

test('assembler references goalsManager', () => {
  assert.ok(ASSEMBLER_SRC.includes('goalsManager') || ASSEMBLER_SRC.includes('getActiveGoals'),
    'assembler must read from goals manager');
});

test('assembler references neurochemistry', () => {
  assert.ok(ASSEMBLER_SRC.includes('neurochemistry') || ASSEMBLER_SRC.includes('deriveMood'),
    'assembler must read from neurochemistry');
});

test('assembler references curiosity', () => {
  assert.ok(ASSEMBLER_SRC.includes('curiosity'),
    'assembler must read from curiosity engine');
});

test('assembler includes COGNITIVE STATE header', () => {
  // Header lives in the contract's buildSnapshotBlock, which the assembler calls
  assert.ok(CONTRACT_SRC.includes('COGNITIVE STATE') || ASSEMBLER_SRC.includes('COGNITIVE STATE'),
    'output block must include COGNITIVE STATE header');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 4: Goals manager existing API (regression guards)
// ════════════════════════════════════════════════════════════════════════════════

const GOALS_SRC = readSafe(GOALS_FILE);

test('goals-manager.js exists', () => {
  assert.ok(existsSync(GOALS_FILE), 'goals manager must exist');
});

test('goals manager has getActiveGoals', () => {
  assert.ok(GOALS_SRC.includes('getActiveGoals'), 'getActiveGoals must exist');
});

test('goals manager has completeGoal', () => {
  assert.ok(GOALS_SRC.includes('completeGoal'), 'completeGoal must exist');
});

test('goals manager has analyzeProgress', () => {
  assert.ok(GOALS_SRC.includes('analyzeProgress'), 'analyzeProgress must exist');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 5: Belief graph existing API (regression guards)
// ════════════════════════════════════════════════════════════════════════════════

const BELIEF_SRC = readSafe(BELIEF_FILE);

test('beliefGraph.js exists', () => {
  assert.ok(existsSync(BELIEF_FILE), 'belief graph must exist');
});

test('belief graph has getRelevantBeliefs', () => {
  assert.ok(BELIEF_SRC.includes('getRelevantBeliefs'), 'getRelevantBeliefs must exist');
});

test('belief graph has reinforceBelief', () => {
  assert.ok(BELIEF_SRC.includes('reinforceBelief'), 'reinforceBelief must exist');
});

test('belief graph has contradictBelief', () => {
  assert.ok(BELIEF_SRC.includes('contradictBelief'), 'contradictBelief must exist');
});

test('belief graph has createBeliefNode', () => {
  assert.ok(BELIEF_SRC.includes('createBeliefNode'), 'createBeliefNode must exist');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 6: Orchestrator integration points (regression guards)
// ════════════════════════════════════════════════════════════════════════════════

const ORCH_SRC = readSafe(ORCH_FILE);

test('orchestrator has getBeliefs callback', () => {
  assert.ok(ORCH_SRC.includes('getBeliefs'), 'orchestrator must accept getBeliefs callback');
});

test('orchestrator injects STANDING BELIEFS', () => {
  assert.ok(ORCH_SRC.includes('STANDING BELIEFS'), 'belief injection block must exist');
});

test('orchestrator injects SOMATIC AWARENESS', () => {
  assert.ok(ORCH_SRC.includes('SOMATIC AWARENESS'), 'somatic awareness block must exist');
});

test('orchestrator has compressContext', () => {
  assert.ok(ORCH_SRC.includes('compressContext'), 'compressContext must exist');
});

test('orchestrator accepts cognitiveSnapshot in options', () => {
  assert.ok(ORCH_SRC.includes('cognitiveSnapshot'),
    'orchestrator must accept cognitiveSnapshot option for unified injection');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 7: Pipeline integration points
// ════════════════════════════════════════════════════════════════════════════════

const PIPELINE_SRC = readSafe(PIPELINE_FILE);

test('pipeline calls deriveMood before orchestrator', () => {
  const moodIdx = PIPELINE_SRC.indexOf('deriveMood');
  const orchIdx = PIPELINE_SRC.indexOf('new Orchestrator');
  assert.ok(moodIdx > -1 && orchIdx > -1, 'both deriveMood and Orchestrator must exist');
  assert.ok(moodIdx < orchIdx, 'deriveMood must be called before Orchestrator construction');
});

test('pipeline passes getBeliefs to orchestrator', () => {
  assert.ok(PIPELINE_SRC.includes('getBeliefs'), 'pipeline must pass getBeliefs to orchestrator');
});

test('pipeline passes getSomaticState to orchestrator', () => {
  assert.ok(PIPELINE_SRC.includes('getSomaticState'), 'pipeline must pass getSomaticState to orchestrator');
});

test('pipeline calls assembleCognitiveSnapshot before orchestrator', () => {
  assert.ok(PIPELINE_SRC.includes('assembleCognitiveSnapshot'),
    'pipeline must call cognitive snapshot assembler before orchestrator');
});

test('pipeline passes cognitiveSnapshot to orchestrator', () => {
  // Check that the snapshot is passed either as a constructor arg or orchestrate() option
  const hasCognitiveSnapshotArg = PIPELINE_SRC.includes('cognitiveSnapshot');
  assert.ok(hasCognitiveSnapshotArg,
    'pipeline must pass cognitiveSnapshot to orchestrator');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 8: Neurochemistry existing API (regression guards)
// ════════════════════════════════════════════════════════════════════════════════

const NEURO_SRC = readSafe(NEURO_FILE);

test('neurochemistry has deriveMood', () => {
  assert.ok(NEURO_SRC.includes('deriveMood'), 'deriveMood must exist');
});

test('neurochemistry has getChemicalState', () => {
  assert.ok(NEURO_SRC.includes('getChemicalState'), 'getChemicalState must exist');
});

test('neurochemistry has updateChemistry', () => {
  assert.ok(NEURO_SRC.includes('updateChemistry'), 'updateChemistry must exist');
});

test('neurochemistry has _saturatedDelta or saturation dampening', () => {
  assert.ok(NEURO_SRC.includes('saturated') || NEURO_SRC.includes('dampen'),
    'saturation dampening must exist in neurochemistry');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 9: Thought types for interaction events
// ════════════════════════════════════════════════════════════════════════════════

const THOUGHT_SRC = readSafe(THOUGHT_TYPES);

test('thought-types.js exists', () => {
  assert.ok(existsSync(THOUGHT_TYPES), 'thought types file must exist');
});

test('thought types includes BELIEF_REINFORCED', () => {
  assert.ok(THOUGHT_SRC.includes('BELIEF_REINFORCED'), 'BELIEF_REINFORCED must exist');
});

test('thought types includes BELIEF_CONTRADICTED', () => {
  assert.ok(THOUGHT_SRC.includes('BELIEF_CONTRADICTED'), 'BELIEF_CONTRADICTED must exist');
});

test('thought types includes GOAL_FULFILLED', () => {
  assert.ok(THOUGHT_SRC.includes('GOAL_FULFILLED'), 'GOAL_FULFILLED must exist');
});

test('thought types includes interaction event types', () => {
  assert.ok(THOUGHT_SRC.includes('INTERACTION_POSITIVE'),
    'INTERACTION_POSITIVE thought type must exist for mood nudge channel');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 10: Curiosity engine existing API (regression guards)
// ════════════════════════════════════════════════════════════════════════════════

const CURIOSITY_SRC = readSafe(CURIOSITY_FILE);

test('curiosity-engine.js exists', () => {
  assert.ok(existsSync(CURIOSITY_FILE), 'curiosity engine must exist');
});

test('curiosity engine has getStats', () => {
  assert.ok(CURIOSITY_SRC.includes('getStats'), 'getStats must exist');
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 11: Security / safety guards
// ════════════════════════════════════════════════════════════════════════════════

test('contract does not use eval', () => {
  assert.ok(!CONTRACT_SRC.includes('eval('), 'no eval in contract');
});

test('assembler does not use eval', () => {
  assert.ok(!ASSEMBLER_SRC.includes('eval('), 'no eval in assembler');
});

test('assembler does not make LLM calls', () => {
  // Snapshot assembly must be NLP-only, no LLM calls
  assert.ok(!ASSEMBLER_SRC.includes('callLLM'), 'assembler must not call LLM');
});
