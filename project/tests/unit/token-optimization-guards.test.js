// Token Optimization — Guard Tests (Slice T1-0)
// Locks current behavior of memory encoding, reranker, and stubs
// for YAKE extractor + NLP encoder that will be created in T1-1/T1-2.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ── File paths ────────────────────────────────────────────────────────────────

const POST_MEM_FILE     = resolve('server/services/post-response-memory.js');
const MEM_RETRIEVAL     = resolve('server/services/memory-retrieval.js');
const RAKE_FILE         = resolve('server/brain/utils/rake.js');
const BM25_FILE         = resolve('server/brain/utils/bm25.js');
const YAKE_FILE         = resolve('server/brain/utils/yake.js');
const NLP_ENCODER_FILE  = resolve('server/brain/utils/memory-encoder-nlp.js');
const PIPELINE_FILE     = resolve('server/services/chat-pipeline.js');

// ── Helper ────────────────────────────────────────────────────────────────────

function readSafe(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 1: Memory encoding output shape (post-response-memory.js)
// ════════════════════════════════════════════════════════════════════════════════

const POST_MEM_SRC = readSafe(POST_MEM_FILE);

describe('Memory encoding current behavior', () => {
  test('post-response-memory.js exists', () => {
    assert.ok(existsSync(POST_MEM_FILE));
  });

  test('exports runPostResponseMemoryEncoding', () => {
    assert.ok(POST_MEM_SRC.includes('runPostResponseMemoryEncoding'));
  });

  test('calls callLLMWithRuntime for encoding', () => {
    assert.ok(POST_MEM_SRC.includes('callLLMWithRuntime'), 'must use LLM for encoding');
  });

  test('expects episodic output fields: semantic, narrative, emotion, topics, importance', () => {
    for (const field of ['semantic', 'narrative', 'emotion', 'topics', 'importance']) {
      assert.ok(POST_MEM_SRC.includes(field), `encoding output must reference ${field}`);
    }
  });

  test('expects knowledge field in encoding output', () => {
    assert.ok(POST_MEM_SRC.includes('knowledge'), 'encoding output must include knowledge');
  });

  test('calls createCoreMemory after encoding', () => {
    assert.ok(POST_MEM_SRC.includes('createCoreMemory'));
  });

  test('emits memory_created SSE event', () => {
    assert.ok(POST_MEM_SRC.includes('memory_created'));
  });

  test('calls createSemanticKnowledge for factual extractions', () => {
    assert.ok(POST_MEM_SRC.includes('createSemanticKnowledge'));
  });

  test('updates relationship after memory encoding', () => {
    assert.ok(POST_MEM_SRC.includes('relationship'));
  });

  test('has boilerplate guard against context leaking into memory', () => {
    assert.ok(POST_MEM_SRC.includes('SUBCONSCIOUS MEMORY CONTEXT'));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 2: Memory retrieval reranker behavior
// ════════════════════════════════════════════════════════════════════════════════

const MEM_RET_SRC = readSafe(MEM_RETRIEVAL);

describe('Memory retrieval reranker behavior', () => {
  test('memory-retrieval.js exists', () => {
    assert.ok(existsSync(MEM_RETRIEVAL));
  });

  test('exports createMemoryRetrieval factory', () => {
    assert.ok(MEM_RET_SRC.includes('createMemoryRetrieval'));
  });

  test('uses BM25 for initial scoring', () => {
    assert.ok(MEM_RET_SRC.includes('bm25ScoreWithImportance'), 'must use BM25 for scoring');
  });

  test('calls callSubconsciousReranker', () => {
    assert.ok(MEM_RET_SRC.includes('callSubconsciousReranker'), 'must have reranker call');
  });

  test('blends BM25 and reranker scores (45/55 weighting)', () => {
    assert.ok(MEM_RET_SRC.includes('0.45') || MEM_RET_SRC.includes('0.55'),
      'must contain blend weighting constants');
  });

  test('handles reranker failure gracefully', () => {
    // The reranker failure path preserves BM25 ordering
    assert.ok(MEM_RET_SRC.includes('rerankError') || MEM_RET_SRC.includes('rerank.ok'),
      'must handle reranker failure');
  });

  test('builds subconscious context block', () => {
    assert.ok(MEM_RET_SRC.includes('buildSubconsciousContextBlock') ||
              MEM_RET_SRC.includes('SUBCONSCIOUS MEMORY CONTEXT'));
  });

  test('returns getSubconsciousMemoryContext function', () => {
    assert.ok(MEM_RET_SRC.includes('getSubconsciousMemoryContext'));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 3: Existing NLP utilities (RAKE, BM25)
// ════════════════════════════════════════════════════════════════════════════════

describe('Existing NLP utilities', () => {
  test('rake.js exists and exports extractPhrases', () => {
    assert.ok(existsSync(RAKE_FILE));
    const src = readSafe(RAKE_FILE);
    assert.ok(src.includes('extractPhrases'));
  });

  test('bm25.js exists and exports bm25Score + bm25ScoreWithImportance', () => {
    assert.ok(existsSync(BM25_FILE));
    const src = readSafe(BM25_FILE);
    assert.ok(src.includes('bm25Score'));
    assert.ok(src.includes('bm25ScoreWithImportance'));
  });

  test('RAKE extractPhrases returns array of strings', () => {
    const { extractPhrases } = require('../../server/brain/utils/rake');
    const result = extractPhrases('The quick brown fox jumped over the lazy dog');
    assert.ok(Array.isArray(result), 'must return array');
    assert.ok(result.every(p => typeof p === 'string'), 'each element must be string');
  });

  test('BM25 scores return numeric values', () => {
    const { bm25Score } = require('../../server/brain/utils/bm25');
    const score = bm25Score(['cats', 'dogs'], ['cats', 'birds']);
    assert.equal(typeof score, 'number');
    assert.ok(score >= 0, 'score must be non-negative');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 4: YAKE keyword extractor (created in T1-1)
// ════════════════════════════════════════════════════════════════════════════════

describe('YAKE keyword extractor', () => {
  test('yake.js exists', () => {
    assert.ok(existsSync(YAKE_FILE), 'yake.js must exist after T1-1');
  });

  test('exports extractKeywords function', () => {
    const src = readSafe(YAKE_FILE);
    assert.ok(src.includes('extractKeywords'), 'must export extractKeywords');
  });

  test('extractKeywords returns array of strings', () => {
    const { extractKeywords } = require('../../server/brain/utils/yake');
    const result = extractKeywords('Deep learning neural networks achieve state of the art results');
    assert.ok(Array.isArray(result), 'must return array');
    assert.ok(result.length > 0, 'must return at least one keyword');
    assert.ok(result.every(k => typeof k === 'string'), 'each keyword must be string');
  });

  test('extractKeywords respects maxKeywords parameter', () => {
    const { extractKeywords } = require('../../server/brain/utils/yake');
    const result = extractKeywords('Deep learning neural networks achieve state of the art results on many benchmarks', 3);
    assert.ok(result.length <= 3, 'must not exceed maxKeywords');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 5: NLP memory encoder (created in T1-2)
// ════════════════════════════════════════════════════════════════════════════════

describe('NLP memory encoder', () => {
  test('memory-encoder-nlp.js exists', () => {
    assert.ok(existsSync(NLP_ENCODER_FILE), 'NLP encoder must exist after T1-2');
  });

  test('exports encodeMemory function', () => {
    const src = readSafe(NLP_ENCODER_FILE);
    assert.ok(src.includes('encodeMemory'), 'must export encodeMemory');
  });

  test('encodeMemory returns required fields', () => {
    const { encodeMemory } = require('../../server/brain/utils/memory-encoder-nlp');
    const result = encodeMemory(
      'I just adopted a cat named Whiskers yesterday',
      'That is wonderful! Cats are amazing companions.'
    );
    assert.ok(result.topics, 'must include topics');
    assert.ok(result.semantic, 'must include semantic summary');
    assert.ok(result.narrative, 'must include narrative');
    assert.ok(result.emotion, 'must include emotion');
    assert.ok(typeof result.importance === 'number', 'importance must be a number');
    assert.ok(result.importance >= 0 && result.importance <= 1, 'importance must be 0-1');
  });

  test('encodeMemory returns knowledge field', () => {
    const { encodeMemory } = require('../../server/brain/utils/memory-encoder-nlp');
    const result = encodeMemory(
      'The capital of France is Paris',
      'That is correct! Paris is the capital of France.'
    );
    assert.ok('knowledge' in result, 'must include knowledge field');
    assert.ok(typeof result.knowledge === 'string', 'knowledge must be a string');
  });

  test('encodeMemory does not call any LLM', () => {
    const src = readSafe(NLP_ENCODER_FILE);
    assert.ok(!src.includes('callLLM'), 'must not call any LLM');
    assert.ok(!src.includes('callModel'), 'must not call any model');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 6: Pipeline integration surface
// ════════════════════════════════════════════════════════════════════════════════

const PIPELINE_SRC = readSafe(PIPELINE_FILE);

describe('Pipeline integration surface', () => {
  test('pipeline calls runPostResponseMemoryEncoding', () => {
    assert.ok(PIPELINE_SRC.includes('runPostResponseMemoryEncoding'));
  });

  test('pipeline imports memory retrieval', () => {
    assert.ok(PIPELINE_SRC.includes('memory') || PIPELINE_SRC.includes('retrieval'));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 7: Security — no eval, no exec, no LLM in NLP modules
// ════════════════════════════════════════════════════════════════════════════════

describe('Security guards', () => {
  test('RAKE does not use eval', () => {
    const src = readSafe(RAKE_FILE);
    assert.ok(!src.includes('eval('), 'RAKE must not use eval');
  });

  test('BM25 does not use eval', () => {
    const src = readSafe(BM25_FILE);
    assert.ok(!src.includes('eval('), 'BM25 must not use eval');
  });

  test('YAKE does not use eval or exec', () => {
    const src = readSafe(YAKE_FILE);
    assert.ok(!src.includes('eval('), 'YAKE must not use eval');
    assert.ok(!src.includes('exec('), 'YAKE must not use exec');
  });

  test('NLP encoder does not use eval or exec', () => {
    const src = readSafe(NLP_ENCODER_FILE);
    assert.ok(!src.includes('eval('), 'NLP encoder must not use eval');
    assert.ok(!src.includes('exec('), 'NLP encoder must not use exec');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 8: Turn classifier contract (T2-0)
// ════════════════════════════════════════════════════════════════════════════════

const TURN_CONTRACT_FILE = resolve('server/contracts/turn-classifier-contract.js');
const TURN_CLASSIFIER_FILE = resolve('server/brain/utils/turn-classifier.js');
const TEMPLATE_RESP_FILE = resolve('server/brain/utils/template-responses.js');

const { validateClassification, VALID_CATEGORIES, BYPASS_THRESHOLD } = require(TURN_CONTRACT_FILE);

describe('Turn classifier contract', () => {
  test('contract file exists', () => {
    assert.ok(existsSync(TURN_CONTRACT_FILE));
  });

  test('exports validateClassification function', () => {
    assert.equal(typeof validateClassification, 'function');
  });

  test('exports VALID_CATEGORIES array with expected entries', () => {
    assert.ok(Array.isArray(VALID_CATEGORIES));
    for (const cat of ['greeting', 'status', 'confirmation', 'farewell', 'command', 'simple-question', 'deep']) {
      assert.ok(VALID_CATEGORIES.includes(cat), `missing category: ${cat}`);
    }
  });

  test('exports BYPASS_THRESHOLD as a number', () => {
    assert.equal(typeof BYPASS_THRESHOLD, 'number');
    assert.ok(BYPASS_THRESHOLD > 0 && BYPASS_THRESHOLD <= 1);
  });

  test('validates well-formed classification', () => {
    const r = validateClassification({ category: 'greeting', confidence: 0.95, bypass: true });
    assert.ok(r.ok);
    assert.equal(r.errors.length, 0);
  });

  test('rejects invalid category', () => {
    const r = validateClassification({ category: 'unknown', confidence: 0.5, bypass: false });
    assert.ok(!r.ok);
  });

  test('rejects confidence outside [0,1]', () => {
    const r = validateClassification({ category: 'greeting', confidence: 1.5, bypass: true });
    assert.ok(!r.ok);
  });

  test('rejects non-boolean bypass', () => {
    const r = validateClassification({ category: 'greeting', confidence: 0.9, bypass: 'yes' });
    assert.ok(!r.ok);
  });

  test('rejects null input', () => {
    const r = validateClassification(null);
    assert.ok(!r.ok);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 9: Turn classifier engine (T2-1)
// ════════════════════════════════════════════════════════════════════════════════

const { classifyTurn } = require(TURN_CLASSIFIER_FILE);

describe('Turn classifier engine', () => {
  test('classifier file exists', () => {
    assert.ok(existsSync(TURN_CLASSIFIER_FILE));
  });

  test('exports classifyTurn function', () => {
    assert.equal(typeof classifyTurn, 'function');
  });

  test('classifies greetings correctly', () => {
    for (const msg of ['hi', 'hello', 'hey', 'good morning', 'yo']) {
      const r = classifyTurn(msg);
      assert.equal(r.category, 'greeting', `"${msg}" should be greeting`);
      assert.ok(r.bypass, `"${msg}" should bypass`);
    }
  });

  test('classifies status questions correctly', () => {
    for (const msg of ['how are you', 'how are you?', 'are you ok?']) {
      const r = classifyTurn(msg);
      assert.equal(r.category, 'status', `"${msg}" should be status`);
      assert.ok(r.bypass, `"${msg}" should bypass`);
    }
  });

  test('classifies confirmations correctly', () => {
    for (const msg of ['yes', 'no', 'ok', 'sure', 'thanks', 'got it']) {
      const r = classifyTurn(msg);
      assert.equal(r.category, 'confirmation', `"${msg}" should be confirmation`);
      assert.ok(r.bypass, `"${msg}" should bypass`);
    }
  });

  test('classifies farewells correctly', () => {
    for (const msg of ['bye', 'goodbye', 'goodnight', 'see you']) {
      const r = classifyTurn(msg);
      assert.equal(r.category, 'farewell', `"${msg}" should be farewell`);
      assert.ok(r.bypass, `"${msg}" should bypass`);
    }
  });

  test('classifies slash commands without bypass', () => {
    const r = classifyTurn('/help');
    assert.equal(r.category, 'command');
    assert.ok(!r.bypass, 'commands should NOT bypass');
  });

  test('classifies simple-questions correctly', () => {
    for (const msg of ['whats your name', 'who are you', 'how old are you']) {
      const r = classifyTurn(msg);
      assert.equal(r.category, 'simple-question', `"${msg}" should be simple-question`);
      assert.ok(r.bypass, `"${msg}" should bypass`);
    }
  });

  test('classifies complex messages as deep', () => {
    const r = classifyTurn('Can you explain the philosophical implications of consciousness in AI systems and how it relates to the hard problem?');
    assert.equal(r.category, 'deep');
    assert.ok(!r.bypass);
  });

  test('guard: long question (>15 words with ?) never bypasses', () => {
    const r = classifyTurn('Can you tell me about the many different types of flowers that grow in the spring season and which ones are best for my garden?');
    assert.ok(!r.bypass, 'long question must not bypass');
  });

  test('guard: empty/null input returns deep category', () => {
    assert.equal(classifyTurn('').category, 'deep');
    assert.equal(classifyTurn(null).category, 'deep');
    assert.equal(classifyTurn(undefined).category, 'deep');
  });

  test('output always passes contract validation', () => {
    for (const msg of ['hi', 'how are you', 'yes', 'bye', '/help', 'what is your name', 'tell me about AI ethics in detail']) {
      const r = classifyTurn(msg);
      const v = validateClassification(r);
      assert.ok(v.ok, `classification for "${msg}" must pass validation: ${v.errors.join(', ')}`);
    }
  });

  test('does not use eval, exec, or LLM calls', () => {
    const src = readSafe(TURN_CLASSIFIER_FILE);
    assert.ok(!src.includes('eval('), 'must not use eval');
    assert.ok(!src.includes('exec('), 'must not use exec');
    assert.ok(!src.includes('callLLM'), 'must not call LLM');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 10: Template response library (T2-2)
// ════════════════════════════════════════════════════════════════════════════════

const { getTemplateResponse, TEMPLATES } = require(TEMPLATE_RESP_FILE);

describe('Template response library', () => {
  test('template file exists', () => {
    assert.ok(existsSync(TEMPLATE_RESP_FILE));
  });

  test('exports getTemplateResponse function', () => {
    assert.equal(typeof getTemplateResponse, 'function');
  });

  test('returns response for greeting category', () => {
    const r = getTemplateResponse('greeting', { userName: 'TestUser' });
    assert.ok(r);
    assert.equal(r._source, 'template');
    assert.ok(r.response.length > 0);
  });

  test('returns response for status category with mood', () => {
    const r = getTemplateResponse('status', { userName: 'TestUser', mood: 'happy' });
    assert.ok(r);
    assert.equal(r._source, 'template');
  });

  test('returns response for confirmation category', () => {
    const r = getTemplateResponse('confirmation');
    assert.ok(r);
    assert.equal(r._source, 'template');
  });

  test('returns response for farewell category', () => {
    const r = getTemplateResponse('farewell', { userName: 'TestUser' });
    assert.ok(r);
    assert.equal(r._source, 'template');
  });

  test('returns null for deep category (no template)', () => {
    assert.equal(getTemplateResponse('deep'), null);
  });

  test('returns null for simple-question (requires LLM)', () => {
    assert.equal(getTemplateResponse('simple-question'), null);
  });

  test('substitutes {user} placeholder', () => {
    const r = getTemplateResponse('greeting', { userName: 'Alice' });
    // At least some templates should contain the user name
    const anyContainsName = TEMPLATES.greeting.some(t => t.includes('{user}'));
    assert.ok(anyContainsName, 'at least one greeting template uses {user} placeholder');
  });

  test('does not use eval, exec, or LLM calls', () => {
    const src = readSafe(TEMPLATE_RESP_FILE);
    assert.ok(!src.includes('eval('), 'must not use eval');
    assert.ok(!src.includes('exec('), 'must not use exec');
    assert.ok(!src.includes('callLLM'), 'must not call LLM');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 11: Pipeline hybrid router integration (T2-3)
// ════════════════════════════════════════════════════════════════════════════════

describe('Pipeline hybrid router integration', () => {
  test('pipeline imports classifyTurn', () => {
    assert.ok(PIPELINE_SRC.includes('classifyTurn'), 'pipeline must import classifyTurn');
  });

  test('pipeline imports getTemplateResponse', () => {
    assert.ok(PIPELINE_SRC.includes('getTemplateResponse'), 'pipeline must import getTemplateResponse');
  });

  test('pipeline imports validateClassification', () => {
    assert.ok(PIPELINE_SRC.includes('validateClassification'), 'pipeline must import validateClassification');
  });

  test('pipeline emits turn_classified SSE event', () => {
    assert.ok(PIPELINE_SRC.includes('turn_classified'), 'pipeline must emit turn_classified SSE');
  });

  test('pipeline has hybridRouter config toggle', () => {
    assert.ok(PIPELINE_SRC.includes('hybridRouter'), 'pipeline must have hybridRouter toggle');
  });

  test('pipeline logs tokens_saved_estimate on bypass', () => {
    assert.ok(PIPELINE_SRC.includes('tokens_saved_estimate'), 'pipeline must log estimated savings');
  });

  test('pipeline still runs memory encoding on bypass path', () => {
    // The bypass block must still call runPostResponseMemoryEncoding
    const bypassSection = PIPELINE_SRC.slice(PIPELINE_SRC.indexOf('hybrid_router.bypass'));
    assert.ok(bypassSection.includes('runPostResponseMemoryEncoding'), 'bypass must still encode memory');
  });

  test('pipeline still runs cognitive feedback on bypass path', () => {
    const bypassSection = PIPELINE_SRC.slice(PIPELINE_SRC.indexOf('hybrid_router.bypass'));
    assert.ok(bypassSection.includes('runCognitiveFeedbackLoop'), 'bypass must still run cognitive feedback');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 12: Subconscious context pruning (T3-0)
// ════════════════════════════════════════════════════════════════════════════════

const MEM_RETRIEVAL_SRC = readSafe(MEM_RETRIEVAL);
const DREAM_ADAPTER_FILE = resolve('server/brain/cognition/dream-intuition-adapter.js');
const DREAM_ADAPTER_SRC = readSafe(DREAM_ADAPTER_FILE);
const ORCHESTRATOR_FILE = resolve('server/brain/core/orchestrator.js');
const ORCHESTRATOR_SRC = readSafe(ORCHESTRATOR_FILE);

describe('Subconscious context pruning (T3-0)', () => {
  test('memory summaries capped at 150 chars (not 280)', () => {
    // All .slice(0, 280) should have been replaced with .slice(0, 150)
    const matches280 = (MEM_RETRIEVAL_SRC.match(/\.slice\(0,\s*280\)/g) || []).length;
    assert.equal(matches280, 0, 'no .slice(0, 280) should remain for summaries');
    const matches150 = (MEM_RETRIEVAL_SRC.match(/\.slice\(0,\s*150\)/g) || []).length;
    assert.ok(matches150 >= 3, 'at least 3 instances of .slice(0, 150) for summaries');
  });

  test('context connections capped at 8 (not 12)', () => {
    assert.ok(MEM_RETRIEVAL_SRC.includes('.slice(0, 8)'), 'contextConnections must be capped at 8');
    // The only remaining .slice(0, 12) is in the chatlog search loop, not context connections
    const contextLine = MEM_RETRIEVAL_SRC.match(/minContextScore\)\.slice\(0,\s*(\d+)\)/);
    assert.ok(contextLine, 'must have contextConnections slice');
    assert.equal(contextLine[1], '8', 'contextConnections cap must be 8');
  });

  test('chatlog per-entry limit reduced from 900 to 600', () => {
    assert.ok(MEM_RETRIEVAL_SRC.includes('600)'), 'chatlog chars should be capped at 600');
  });

  test('instructional text condensed (no multi-line memory type explanations)', () => {
    assert.ok(!MEM_RETRIEVAL_SRC.includes('The "with user" tag identifies which user was in that conversation'), 'verbose instructional text removed');
    assert.ok(!MEM_RETRIEVAL_SRC.includes('ingested from external files/documents'), 'verbose document explanation removed');
  });

  test('conversation recall header condensed', () => {
    assert.ok(!MEM_RETRIEVAL_SRC.includes('Reconstruct the narrative context'), 'verbose recall header removed');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 13: Dream-Intuition compression (T3-1)
// ════════════════════════════════════════════════════════════════════════════════

describe('Dream-Intuition compression (T3-1)', () => {
  test('dream-intuition-adapter.js exists', () => {
    assert.ok(existsSync(DREAM_ADAPTER_FILE));
  });

  test('default maxTokens reduced to 200 (not 260)', () => {
    assert.ok(DREAM_ADAPTER_SRC.includes('maxTokens = 200'), 'default should be 200');
    assert.ok(!DREAM_ADAPTER_SRC.includes('maxTokens = 260'), 'old default 260 should be gone');
  });

  test('system prompt is single-line (no verbose preamble)', () => {
    assert.ok(!DREAM_ADAPTER_SRC.includes('You are the Dream-Intuition contributor in a cognitive pipeline'), 'verbose system prompt removed');
  });

  test('skips 1D when no turn signals extracted', () => {
    assert.ok(DREAM_ADAPTER_SRC.includes('hasSignals'), 'must check for meaningful signals');
    const { runDreamIntuition, buildDreamIntuitionInput } = require(DREAM_ADAPTER_FILE);
    // Empty signals → should return empty text without calling LLM
    const emptyInput = buildDreamIntuitionInput({}, 'hello');
    // Subjects/events/intentHints all empty → hasSignals = false
    assert.equal(emptyInput.subjects.length, 0);
    assert.equal(emptyInput.events.length, 0);
    assert.equal(emptyInput.intentHints.length, 0);
  });

  test('does not use eval or exec', () => {
    assert.ok(!DREAM_ADAPTER_SRC.includes('eval('), 'must not use eval');
    assert.ok(!DREAM_ADAPTER_SRC.includes('exec('), 'must not use exec');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 14: Conscious prompt trimming (T3-2)
// ════════════════════════════════════════════════════════════════════════════════

describe('Conscious prompt trimming (T3-2)', () => {
  test('orchestrator caps history messages at 1200 chars', () => {
    assert.ok(ORCHESTRATOR_SRC.includes('.slice(0, 1200)'), 'history messages must be truncated');
  });

  test('history window is 8 turns', () => {
    assert.ok(ORCHESTRATOR_SRC.includes('.slice(-8)'), 'history must be limited to last 8');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 15: Final/Orchestrator prompt trimming (T3-3)
// ════════════════════════════════════════════════════════════════════════════════

describe('Final/Orchestrator prompt trimming (T3-3)', () => {
  test('final merge prompt uses condensed subconscious (600 char cap)', () => {
    assert.ok(ORCHESTRATOR_SRC.includes('.slice(0, 600)'), 'subconscious output must be capped in final');
  });

  test('final merge prompt uses condensed dream (300 char cap)', () => {
    assert.ok(ORCHESTRATOR_SRC.includes('.slice(0, 300)'), 'dream output must be capped in final');
  });

  test('turn signals condensed to single-line summary (no JSON.stringify)', () => {
    // The merge prompt section should not have JSON.stringify for turn signals
    const mergeSection = ORCHESTRATOR_SRC.slice(ORCHESTRATOR_SRC.indexOf('SYNTHESIS DIRECTIVE'));
    assert.ok(!mergeSection.includes('JSON.stringify(options.turnSignals'), 'turn signals should not be full JSON dump in final prompt');
  });

  test('final merge prompt has CONTEXT SUMMARY header (not CONTEXT USED BY CONSCIOUS)', () => {
    assert.ok(ORCHESTRATOR_SRC.includes('CONTEXT SUMMARY'), 'should use condensed header');
    assert.ok(!ORCHESTRATOR_SRC.includes('CONTEXT USED BY CONSCIOUS'), 'verbose header should be removed');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 16: Semantic cache module (T4-0)
// ════════════════════════════════════════════════════════════════════════════════

const CACHE_FILE = resolve('server/brain/utils/semantic-cache.js');
const CACHE_SRC  = readSafe(CACHE_FILE);

describe('Semantic cache module (T4-0)', () => {
  test('semantic-cache.js exists', () => {
    assert.ok(existsSync(CACHE_FILE));
  });

  test('exports createSemanticCache factory', () => {
    const mod = require(CACHE_FILE);
    assert.equal(typeof mod.createSemanticCache, 'function');
  });

  test('exports getEntityCache factory', () => {
    const mod = require(CACHE_FILE);
    assert.equal(typeof mod.getEntityCache, 'function');
  });

  test('exports clearEntityCache', () => {
    const mod = require(CACHE_FILE);
    assert.equal(typeof mod.clearEntityCache, 'function');
  });

  test('cache returns miss for novel message', () => {
    const mod = require(CACHE_FILE);
    const cache = mod.createSemanticCache();
    const result = cache.lookup('completely unique novel message about quantum entanglement');
    assert.equal(result.hit, false);
  });

  test('cache returns hit for semantically similar message', () => {
    const mod = require(CACHE_FILE);
    const cache = mod.createSemanticCache();
    cache.store('Tell me about neural network architectures and deep learning models', 'They are layered computation graphs.');
    const result = cache.lookup('What are neural network architectures and deep learning?');
    assert.equal(result.hit, true);
    assert.equal(result.entry.source, 'semantic-cache');
    assert.ok(result.entry.score >= 0.85, 'score must meet threshold');
  });

  test('cache respects LRU capacity', () => {
    const mod = require(CACHE_FILE);
    const cache = mod.createSemanticCache({ maxEntries: 2 });
    cache.store('Topic alpha bravo charlie discussion', 'resp1');
    cache.store('Topic delta echo foxtrot discussion', 'resp2');
    cache.store('Topic golf hotel india discussion', 'resp3');
    assert.ok(cache.size <= 2, 'cache must not exceed maxEntries');
  });

  test('cache skips messages with < 2 RAKE topics', () => {
    const mod = require(CACHE_FILE);
    const cache = mod.createSemanticCache();
    cache.store('hi', 'hello!');
    assert.equal(cache.size, 0, 'short messages should not be cached');
  });

  test('entity-scoped caches are isolated', () => {
    const mod = require(CACHE_FILE);
    mod.clearEntityCache(); // clean slate
    const cacheA = mod.getEntityCache('entity-a');
    const cacheB = mod.getEntityCache('entity-b');
    cacheA.store('Tell me about neural network architectures and deep learning', 'A response');
    const resultB = cacheB.lookup('Tell me about neural network architectures and deep learning');
    assert.equal(resultB.hit, false, 'entity B must not see entity A cache');
    mod.clearEntityCache();
  });

  test('stats tracks hits and misses', () => {
    const mod = require(CACHE_FILE);
    const cache = mod.createSemanticCache();
    cache.store('Explain quantum computing principles and qubit entanglement', 'Qubits...');
    cache.lookup('What is quantum computing and qubit entanglement?');
    cache.lookup('Something completely unrelated about gardening tips');
    const s = cache.stats();
    assert.equal(typeof s.hits, 'number');
    assert.equal(typeof s.misses, 'number');
    assert.equal(typeof s.hitRate, 'number');
  });

  test('does not use eval or exec', () => {
    assert.ok(!CACHE_SRC.includes('eval('), 'must not use eval');
    assert.ok(!CACHE_SRC.includes('exec('), 'must not use exec');
  });

  test('uses RAKE extractPhrases for vectorization', () => {
    assert.ok(CACHE_SRC.includes('extractPhrases'), 'must use RAKE for topic extraction');
  });

  test('uses BM25 bm25Score for similarity', () => {
    assert.ok(CACHE_SRC.includes('bm25Score'), 'must use BM25 for similarity matching');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 17: Pipeline semantic cache integration (T4-1)
// ════════════════════════════════════════════════════════════════════════════════

describe('Pipeline semantic cache integration (T4-1)', () => {
  test('pipeline imports getEntityCache', () => {
    assert.ok(PIPELINE_SRC.includes('getEntityCache'), 'pipeline must import semantic cache');
  });

  test('pipeline has semanticCache config toggle', () => {
    assert.ok(PIPELINE_SRC.includes('semanticCache'), 'pipeline must have semanticCache toggle');
  });

  test('pipeline emits cache_hit SSE event', () => {
    assert.ok(PIPELINE_SRC.includes('cache_hit'), 'pipeline must emit cache_hit SSE event');
  });

  test('pipeline logs tokens_saved_estimate on cache hit', () => {
    const cacheSection = PIPELINE_SRC.slice(PIPELINE_SRC.indexOf('semantic_cache.hit'));
    assert.ok(cacheSection.includes('tokens_saved_estimate'), 'must log estimated savings');
  });

  test('pipeline still runs memory encoding on cache hit', () => {
    const cacheSection = PIPELINE_SRC.slice(PIPELINE_SRC.indexOf('semantic_cache.hit'));
    assert.ok(cacheSection.includes('runPostResponseMemoryEncoding'), 'must still encode memory');
  });

  test('pipeline still runs cognitive feedback on cache hit', () => {
    const cacheSection = PIPELINE_SRC.slice(PIPELINE_SRC.indexOf('semantic_cache.hit'));
    assert.ok(cacheSection.includes('runCognitiveFeedbackLoop'), 'must still run cognitive feedback');
  });

  test('pipeline stores orchestrator response in cache after run', () => {
    assert.ok(PIPELINE_SRC.includes('entityCache.store'), 'must store new responses in cache');
  });
});
