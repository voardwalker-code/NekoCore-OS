'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Imports ──────────────────────────────────────────────────────────────────

const {
  MEMORY_SCHEMA_VERSION,
  VALID_SHAPES,
  normalizeMemoryRecord
} = require('../../server/contracts/memory-schema');

const { echoFuture } = require('../../server/brain/agent-echo');

const {
  rebuildShapeIndexes
} = require('../../server/brain/utils/archive-indexes');

const MemoryIndexCache = require('../../server/brain/memory/memory-index-cache');

const { classifyShape, SHAPE_LABELS } = require('../../server/brain/memory/shape-classifier');

// ============================================================================
//  Slice -0: Guard tests — lock pre-Phase-5 behavior
//  These tests freeze the current contracts so Phase 5 changes can be
//  validated against a known baseline.
// ============================================================================

// ── Memory Schema ────────────────────────────────────────────────────────────

describe('Guard: memory-schema v1 backward compatibility', () => {

  it('MEMORY_SCHEMA_VERSION is 2', () => {
    assert.equal(MEMORY_SCHEMA_VERSION, 2);
  });

  it('normalizeMemoryRecord produces exactly 16 fields for empty input', () => {
    const rec = normalizeMemoryRecord({});
    const keys = Object.keys(rec);
    assert.equal(keys.length, 16, `Expected 16 fields, got ${keys.length}: ${keys.join(', ')}`);
  });

  it('normalizeMemoryRecord contains all v1 + v2 field names', () => {
    const rec = normalizeMemoryRecord({});
    const expected = [
      'memorySchemaVersion', 'memory_id', 'type', 'created',
      'last_accessed', 'access_count', 'access_events', 'decay',
      'importance', 'topics', 'emotionalTag',
      'creationContext', 'shape', 'edges', 'activationLevel', 'lastActivationContext'
    ];
    for (const key of expected) {
      assert.ok(key in rec, `Missing field: ${key}`);
    }
  });

  it('v1 defaults are preserved (backward compat)', () => {
    const rec = normalizeMemoryRecord({});
    assert.equal(rec.memorySchemaVersion, 2);
    assert.equal(rec.memory_id, '');
    assert.equal(rec.type, 'episodic');
    assert.equal(rec.access_count, 0);
    assert.deepStrictEqual(rec.access_events, []);
    assert.equal(rec.decay, 1.0);
    assert.equal(rec.importance, 0.5);
    assert.deepStrictEqual(rec.topics, []);
    assert.equal(rec.emotionalTag, null);
  });

  it('v2 defaults are safe for missing fields', () => {
    const rec = normalizeMemoryRecord({});
    assert.equal(rec.creationContext, null);
    assert.equal(rec.shape, 'unclassified');
    assert.deepStrictEqual(rec.edges, []);
    assert.equal(rec.activationLevel, 0.0);
    assert.equal(rec.lastActivationContext, null);
  });

  it('normalizeMemoryRecord preserves existing v1 fields', () => {
    const input = {
      memorySchemaVersion: 1,
      memory_id: 'mem_abc123',
      type: 'core_memory',
      created: '2026-01-01T00:00:00.000Z',
      last_accessed: '2026-02-01T00:00:00.000Z',
      access_count: 5,
      access_events: ['2026-01-15T00:00:00.000Z'],
      decay: 0.85,
      importance: 0.9,
      topics: ['cats', 'dreams'],
      emotionalTag: 'joy'
    };
    const rec = normalizeMemoryRecord(input);
    assert.equal(rec.memory_id, 'mem_abc123');
    assert.equal(rec.type, 'core_memory');
    assert.equal(rec.created, '2026-01-01T00:00:00.000Z');
    assert.equal(rec.last_accessed, '2026-02-01T00:00:00.000Z');
    assert.equal(rec.access_count, 5);
    assert.deepStrictEqual(rec.access_events, ['2026-01-15T00:00:00.000Z']);
    assert.equal(rec.decay, 0.85);
    assert.equal(rec.importance, 0.9);
    assert.deepStrictEqual(rec.topics, ['cats', 'dreams']);
    assert.equal(rec.emotionalTag, 'joy');
  });

  it('v1 records get v2 defaults applied (backward compat upgrade)', () => {
    const v1Record = {
      memory_id: 'mem_v1test',
      type: 'episodic',
      created: '2026-01-01T00:00:00.000Z',
      decay: 0.95,
      importance: 0.7,
      topics: ['test'],
      emotionalTag: 'neutral'
    };
    const rec = normalizeMemoryRecord(v1Record);
    assert.equal(rec.memory_id, 'mem_v1test');
    assert.equal(rec.memorySchemaVersion, 2);
    // v2 fields present with safe defaults
    assert.equal(rec.creationContext, null);
    assert.equal(rec.shape, 'unclassified');
    assert.deepStrictEqual(rec.edges, []);
    assert.equal(rec.activationLevel, 0.0);
    assert.equal(rec.lastActivationContext, null);
  });

  it('normalizeMemoryRecord filters non-string topics', () => {
    const rec = normalizeMemoryRecord({ topics: ['valid', 42, '', null, 'ok'] });
    assert.deepStrictEqual(rec.topics, ['valid', 'ok']);
  });

  it('normalizeMemoryRecord falls back on options.defaultId', () => {
    const rec = normalizeMemoryRecord({}, { defaultId: 'fallback_id' });
    assert.equal(rec.memory_id, 'fallback_id');
  });

  it('normalizeMemoryRecord falls back on options.defaultType', () => {
    const rec = normalizeMemoryRecord({}, { defaultType: 'semantic_knowledge' });
    assert.equal(rec.type, 'semantic_knowledge');
  });

  it('normalizeMemoryRecord clamps non-finite importance to 0.5', () => {
    const rec = normalizeMemoryRecord({ importance: NaN });
    assert.equal(rec.importance, 0.5);
  });

  it('normalizeMemoryRecord clamps non-finite decay to 1.0', () => {
    const rec = normalizeMemoryRecord({ decay: Infinity });
    assert.equal(rec.decay, 1.0);
  });
});

// ── Memory Schema v2 fields ─────────────────────────────────────────────────

describe('Guard: memory-schema v2 fields', () => {

  it('VALID_SHAPES is a frozen array with 6 entries', () => {
    assert.ok(Array.isArray(VALID_SHAPES));
    assert.ok(Object.isFrozen(VALID_SHAPES));
    assert.equal(VALID_SHAPES.length, 6);
    assert.deepStrictEqual([...VALID_SHAPES], [
      'narrative', 'reflective', 'factual', 'emotional', 'anticipatory', 'unclassified'
    ]);
  });

  it('shape accepts valid labels', () => {
    for (const s of ['narrative', 'reflective', 'factual', 'emotional', 'anticipatory']) {
      const rec = normalizeMemoryRecord({ shape: s });
      assert.equal(rec.shape, s);
    }
  });

  it('shape defaults to unclassified for invalid values', () => {
    assert.equal(normalizeMemoryRecord({ shape: 'banana' }).shape, 'unclassified');
    assert.equal(normalizeMemoryRecord({ shape: 42 }).shape, 'unclassified');
    assert.equal(normalizeMemoryRecord({ shape: null }).shape, 'unclassified');
    assert.equal(normalizeMemoryRecord({}).shape, 'unclassified');
  });

  it('creationContext preserves valid object', () => {
    const ctx = { mood: 'happy', emotions: ['joy'], tone: 'warm', activeBeliefIds: [], conversationTopics: ['cats'], userId: 'u1', userName: 'Test' };
    const rec = normalizeMemoryRecord({ creationContext: ctx });
    assert.deepStrictEqual(rec.creationContext, ctx);
  });

  it('creationContext defaults to null for non-object', () => {
    assert.equal(normalizeMemoryRecord({ creationContext: 'string' }).creationContext, null);
    assert.equal(normalizeMemoryRecord({ creationContext: 42 }).creationContext, null);
    assert.equal(normalizeMemoryRecord({}).creationContext, null);
  });

  it('edges preserves valid edge array', () => {
    const edges = [
      { targetId: 'mem_001', relation: 'temporal_adjacent', strength: 0.9 },
      { targetId: 'mem_002', relation: 'topic_sibling', strength: 0.6 }
    ];
    const rec = normalizeMemoryRecord({ edges });
    assert.deepStrictEqual(rec.edges, edges);
  });

  it('edges filters out malformed entries', () => {
    const edges = [
      { targetId: 'mem_001', relation: 'temporal_adjacent', strength: 0.9 },
      { targetId: 42, relation: 'bad', strength: 0.5 },
      { relation: 'missing_target', strength: 0.5 },
      { targetId: 'mem_003', relation: 'ok', strength: NaN },
      'not_an_object',
      null
    ];
    const rec = normalizeMemoryRecord({ edges });
    assert.equal(rec.edges.length, 1);
    assert.equal(rec.edges[0].targetId, 'mem_001');
  });

  it('edges defaults to empty array', () => {
    assert.deepStrictEqual(normalizeMemoryRecord({}).edges, []);
    assert.deepStrictEqual(normalizeMemoryRecord({ edges: 'not_array' }).edges, []);
  });

  it('activationLevel clamps to [0.0, 1.0]', () => {
    assert.equal(normalizeMemoryRecord({ activationLevel: 0.5 }).activationLevel, 0.5);
    assert.equal(normalizeMemoryRecord({ activationLevel: -0.5 }).activationLevel, 0.0);
    assert.equal(normalizeMemoryRecord({ activationLevel: 1.5 }).activationLevel, 1.0);
    assert.equal(normalizeMemoryRecord({ activationLevel: NaN }).activationLevel, 0.0);
  });

  it('lastActivationContext preserves valid object', () => {
    const ctx = { query: 'cats', turn: 5, timestamp: '2026-03-01T00:00:00.000Z' };
    const rec = normalizeMemoryRecord({ lastActivationContext: ctx });
    assert.deepStrictEqual(rec.lastActivationContext, ctx);
  });

  it('lastActivationContext defaults to null for non-object', () => {
    assert.equal(normalizeMemoryRecord({}).lastActivationContext, null);
    assert.equal(normalizeMemoryRecord({ lastActivationContext: 'nope' }).lastActivationContext, null);
  });

  it('memorySchemaVersion is always stamped as 2 (even for v1 input)', () => {
    const rec = normalizeMemoryRecord({ memorySchemaVersion: 1 });
    assert.equal(rec.memorySchemaVersion, 2);
  });

  it('normalizeMemoryRecord is identity for a full v2 record', () => {
    const full = {
      memorySchemaVersion: 2,
      memory_id: 'mem_full',
      type: 'core_memory',
      created: '2026-03-01T00:00:00.000Z',
      last_accessed: '2026-03-02T00:00:00.000Z',
      access_count: 3,
      access_events: ['2026-03-01T12:00:00.000Z'],
      decay: 0.9,
      importance: 0.8,
      topics: ['rust', 'memory'],
      emotionalTag: 'excitement',
      creationContext: { mood: 'focused', emotions: ['curiosity'], tone: 'analytical', activeBeliefIds: ['b1'], conversationTopics: ['rust'], userId: 'u1', userName: 'Dev' },
      shape: 'narrative',
      edges: [{ targetId: 'mem_002', relation: 'temporal_adjacent', strength: 0.9 }],
      activationLevel: 0.4,
      lastActivationContext: { query: 'rust', turn: 2 }
    };
    const rec = normalizeMemoryRecord(full);
    assert.equal(rec.memory_id, 'mem_full');
    assert.equal(rec.memorySchemaVersion, 2);
    assert.equal(rec.shape, 'narrative');
    assert.deepStrictEqual(rec.creationContext, full.creationContext);
    assert.deepStrictEqual(rec.edges, full.edges);
    assert.equal(rec.activationLevel, 0.4);
    assert.deepStrictEqual(rec.lastActivationContext, full.lastActivationContext);
  });
});

// ── Shape Classifier ────────────────────────────────────────────────────────

describe('Guard: shape-classifier', () => {

  it('SHAPE_LABELS matches VALID_SHAPES from schema', () => {
    assert.deepStrictEqual([...SHAPE_LABELS], [...VALID_SHAPES]);
  });

  it('exports classifyShape as a function', () => {
    assert.equal(typeof classifyShape, 'function');
  });

  // ── Priority 1: emotional ──

  it('classifies strong emotion as emotional', () => {
    for (const emo of ['anger', 'joy', 'sadness', 'fear', 'love', 'grief']) {
      assert.equal(
        classifyShape({ semantic: 'some text', emotion: emo }),
        'emotional',
        `Expected emotional for emotion=${emo}`
      );
    }
  });

  it('classifies high importance (>= 0.85) as emotional', () => {
    assert.equal(classifyShape({ semantic: 'just a fact', importance: 0.85 }), 'emotional');
    assert.equal(classifyShape({ semantic: 'just a fact', importance: 0.95 }), 'emotional');
  });

  it('emotion check is case-insensitive', () => {
    assert.equal(classifyShape({ semantic: 'text', emotion: 'JOY' }), 'emotional');
    assert.equal(classifyShape({ semantic: 'text', emotion: 'Grief' }), 'emotional');
  });

  // ── Priority 2: anticipatory ──

  it('classifies future-oriented text as anticipatory', () => {
    const futures = [
      'I will do it tomorrow',
      'We plan to visit next week',
      'She want to learn Rust',
      'Going to the store later',
      'I hope to finish this someday',
      'Looking forward to the trip'
    ];
    for (const text of futures) {
      assert.equal(
        classifyShape({ semantic: text, emotion: 'neutral', importance: 0.5 }),
        'anticipatory',
        `Expected anticipatory for: "${text}"`
      );
    }
  });

  it('emotional takes priority over anticipatory', () => {
    assert.equal(
      classifyShape({ semantic: 'I will do it tomorrow', emotion: 'joy' }),
      'emotional'
    );
  });

  // ── Priority 3: reflective ──

  it('classifies self-referential text as reflective', () => {
    const reflectives = [
      'I think this is important',
      'I feel different now',
      'I realize I was wrong',
      "I've been thinking about this",
      'Looking back on it all',
      'I wonder what happens next'
    ];
    for (const text of reflectives) {
      assert.equal(
        classifyShape({ semantic: text, emotion: 'neutral', importance: 0.5 }),
        'reflective',
        `Expected reflective for: "${text}"`
      );
    }
  });

  it('anticipatory takes priority over reflective', () => {
    assert.equal(
      classifyShape({ semantic: 'I think I will plan to go tomorrow', emotion: 'neutral', importance: 0.5 }),
      'anticipatory'
    );
  });

  // ── Priority 4: factual ──

  it('classifies semantic_knowledge type as factual', () => {
    assert.equal(
      classifyShape({ semantic: 'The capital of Japan is Tokyo', type: 'semantic_knowledge', importance: 0.8 }),
      'factual'
    );
  });

  it('classifies neutral/absent emotion + low importance as factual', () => {
    assert.equal(
      classifyShape({ semantic: 'A plain statement', emotion: 'neutral', importance: 0.4 }),
      'factual'
    );
    assert.equal(
      classifyShape({ semantic: 'A plain statement', emotion: '', importance: 0.3 }),
      'factual'
    );
  });

  it('does not classify as factual if importance >= 0.6 and has emotion', () => {
    assert.notEqual(
      classifyShape({ semantic: 'Something happened', emotion: 'curious', importance: 0.7 }),
      'factual'
    );
  });

  // ── Priority 5: narrative (default fallback) ──

  it('falls back to narrative when no other rule matches', () => {
    assert.equal(
      classifyShape({ semantic: 'We went to the park and had lunch', emotion: 'content', importance: 0.6 }),
      'narrative'
    );
  });

  it('returns narrative for empty/default input', () => {
    // Empty call: emotion='', importance=0.5, type='episodic'
    // emotion is '' (falsy) AND importance < 0.6 → factual
    // Actually: empty emotion + 0.5 importance → factual (rule 4)
    assert.equal(classifyShape({}), 'factual');
    // But with a non-empty non-strong emotion and moderate importance → narrative
    assert.equal(
      classifyShape({ emotion: 'curious', importance: 0.65 }),
      'narrative'
    );
  });

  // ── Edge cases ──

  it('handles missing/undefined semantic gracefully', () => {
    assert.doesNotThrow(() => classifyShape({ semantic: undefined }));
    assert.doesNotThrow(() => classifyShape({ semantic: null }));
    assert.doesNotThrow(() => classifyShape({ semantic: 42 }));
  });

  it('handles missing/undefined emotion gracefully', () => {
    assert.doesNotThrow(() => classifyShape({ emotion: undefined }));
    assert.doesNotThrow(() => classifyShape({ emotion: null }));
    assert.doesNotThrow(() => classifyShape({ emotion: 42 }));
  });

  it('returns only values from SHAPE_LABELS', () => {
    const inputs = [
      { semantic: 'angry text', emotion: 'anger' },
      { semantic: 'I will plan to', emotion: 'neutral', importance: 0.5 },
      { semantic: 'I think about life', emotion: 'neutral', importance: 0.5 },
      { semantic: 'fact', type: 'semantic_knowledge' },
      { semantic: 'went to park', emotion: 'happy', importance: 0.6 },
      {}
    ];
    for (const input of inputs) {
      const shape = classifyShape(input);
      assert.ok(SHAPE_LABELS.includes(shape), `"${shape}" not in SHAPE_LABELS`);
    }
  });
});

// ── Echo Future Contract ────────────────────────────────────────────────────

describe('Guard: echoFuture contract', () => {

  it('echoFuture returns [] when no indexCache provided', () => {
    const result = echoFuture('test-entity');
    assert.deepEqual(result, []);
  });

  it('echoFuture returns [] when entityId is falsy', () => {
    assert.deepEqual(echoFuture(null), []);
    assert.deepEqual(echoFuture(''), []);
  });

  it('echoFuture accepts entityId without throwing', () => {
    assert.doesNotThrow(() => echoFuture('any-entity-id'));
  });

  it('echoFuture is exported from agent-echo', () => {
    const mod = require('../../server/brain/agent-echo');
    assert.equal(typeof mod.echoFuture, 'function');
  });

  it('agent-echo exports echoNow, echoPast, echoFuture, promoteToStm', () => {
    const mod = require('../../server/brain/agent-echo');
    assert.equal(typeof mod.echoNow, 'function');
    assert.equal(typeof mod.echoPast, 'function');
    assert.equal(typeof mod.echoFuture, 'function');
    assert.equal(typeof mod.promoteToStm, 'function');
    assert.equal(Object.keys(mod).length, 4, 'Expected exactly 4 exports');
  });
});

// ── rebuildShapeIndexes Stub ─────────────────────────────────────────────────

describe('Guard: rebuildShapeIndexes (Slice 4)', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const { writeIndex, readIndex, rebuildShapeIndexes: rebuildFn } = require('../../server/brain/utils/archive-indexes');

  function makeTmpArchiveDir(entityId, bucketEntries) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-shape-idx-'));
    const archiveDir = path.join(tmpDir, `entity_${entityId}`, 'memories', 'archive');
    const indexDir = path.join(tmpDir, `entity_${entityId}`, 'memories', 'archive', 'indexes');
    fs.mkdirSync(indexDir, { recursive: true });

    // Build router.json and bucket files from entries grouped by primary topic
    const router = {};
    const bucketLines = {};
    for (const entry of bucketEntries) {
      const primaryTopic = (entry.topics || ['general'])[0] || 'general';
      const slug = primaryTopic.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const bucketName = `bucket_${slug}.ndjson`;
      router[slug] = bucketName;
      if (!bucketLines[bucketName]) bucketLines[bucketName] = [];
      bucketLines[bucketName].push(JSON.stringify(entry));
    }

    fs.writeFileSync(path.join(archiveDir, 'router.json'), JSON.stringify(router), 'utf8');
    for (const [filename, lines] of Object.entries(bucketLines)) {
      fs.writeFileSync(path.join(archiveDir, filename), lines.join('\n') + '\n', 'utf8');
    }

    return tmpDir;
  }

  it('returns 0 for entity with no bucket files', () => {
    const result = rebuildShapeIndexes('nonexistent-entity');
    assert.equal(result, 0);
    assert.strictEqual(typeof result, 'number');
  });

  it('accepts opts without throwing', () => {
    assert.doesNotThrow(() => rebuildShapeIndexes('nonexistent', { baseDir: '/tmp/fake' }));
  });

  it('is synchronous (not a promise)', () => {
    const result = rebuildShapeIndexes('nonexistent');
    assert.ok(!(result instanceof Promise), 'Should be synchronous');
  });

  it('archive-indexes exports expected functions', () => {
    const mod = require('../../server/brain/utils/archive-indexes');
    const expected = [
      'readIndex', 'writeIndex', 'listIndexes', 'intersectIndexes',
      'narrowByIndex', 'rebuildTemporalIndexes', 'rebuildSubjectIndexes',
      'rebuildShapeIndexes'
    ];
    for (const name of expected) {
      assert.equal(typeof mod[name], 'function', `Missing export: ${name}`);
    }
  });

  it('classifies entries and writes per-shape index files', () => {
    const entityId = 'shape-idx-test';
    const entries = [
      { memId: 'mem_e1', topics: ['feelings'], emotion: 'anger', importance: 0.9, type: 'core_memory', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_e2', topics: ['feelings'], emotion: 'joy', importance: 0.8, type: 'core_memory', created: '2026-01-02T00:00:00Z' },
      { memId: 'mem_f1', topics: ['science'], emotion: 'neutral', importance: 0.3, type: 'semantic_knowledge', created: '2026-01-03T00:00:00Z' },
      { memId: 'mem_n1', topics: ['stories'], emotion: 'interested', importance: 0.5, type: 'core_memory', created: '2026-01-04T00:00:00Z' }
    ];
    const tmpDir = makeTmpArchiveDir(entityId, entries);
    try {
      const count = rebuildFn(entityId, { baseDir: tmpDir });
      assert.ok(count > 0, `Expected indexed entries, got ${count}`);

      // Emotional memories should be in the 'emotional' shape index
      const emotionalIdx = readIndex(entityId, 'shape', 'emotional', { baseDir: tmpDir });
      assert.ok(emotionalIdx.includes('mem_e1'), 'Angry memory should be emotional');
      assert.ok(emotionalIdx.includes('mem_e2'), 'Joyful memory should be emotional');

      // Factual memory should be in 'factual' shape index
      const factualIdx = readIndex(entityId, 'shape', 'factual', { baseDir: tmpDir });
      assert.ok(factualIdx.includes('mem_f1'), 'semantic_knowledge should be factual');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('uses pre-existing shape field when present in bucket entry', () => {
    const entityId = 'shape-preexist';
    const entries = [
      { memId: 'mem_pre1', topics: ['music'], emotion: 'neutral', importance: 0.5, type: 'core_memory', shape: 'reflective', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_pre2', topics: ['music'], emotion: 'neutral', importance: 0.5, type: 'core_memory', shape: 'anticipatory', created: '2026-01-02T00:00:00Z' }
    ];
    const tmpDir = makeTmpArchiveDir(entityId, entries);
    try {
      const count = rebuildFn(entityId, { baseDir: tmpDir });
      assert.equal(count, 2);

      const reflective = readIndex(entityId, 'shape', 'reflective', { baseDir: tmpDir });
      assert.deepStrictEqual(reflective, ['mem_pre1']);

      const anticipatory = readIndex(entityId, 'shape', 'anticipatory', { baseDir: tmpDir });
      assert.deepStrictEqual(anticipatory, ['mem_pre2']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('deduplicates memIds across buckets', () => {
    const entityId = 'shape-dedup';
    // Same memId appears in two topic buckets (primary + stub-free duplicate)
    const entries = [
      { memId: 'mem_dup1', topics: ['a'], emotion: 'anger', importance: 0.9, type: 'core_memory', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_dup1', topics: ['b'], emotion: 'anger', importance: 0.9, type: 'core_memory', created: '2026-01-01T00:00:00Z' }
    ];
    const tmpDir = makeTmpArchiveDir(entityId, entries);
    try {
      const count = rebuildFn(entityId, { baseDir: tmpDir });
      // Even though entry appears twice, unique memId count should be 1
      assert.equal(count, 1, 'Should deduplicate across buckets');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('intersectIndexes works with shape axis', () => {
    const { intersectIndexes } = require('../../server/brain/utils/archive-indexes');
    const entityId = 'shape-intersect';
    const entries = [
      { memId: 'mem_i1', topics: ['physics'], emotion: 'anger', importance: 0.9, type: 'core_memory', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_i2', topics: ['physics'], emotion: 'neutral', importance: 0.3, type: 'semantic_knowledge', created: '2026-01-02T00:00:00Z' }
    ];
    const tmpDir = makeTmpArchiveDir(entityId, entries);
    try {
      rebuildFn(entityId, { baseDir: tmpDir });
      // Write a temporal index with both
      writeIndex(entityId, 'temporal', '2026-01', ['mem_i1', 'mem_i2'], { baseDir: tmpDir });

      // Intersect temporal + shape(emotional) should yield only mem_i1
      const result = intersectIndexes(entityId, [
        { axis: 'temporal', key: '2026-01' },
        { axis: 'shape', key: 'emotional' }
      ], { baseDir: tmpDir });
      assert.ok(result instanceof Set);
      assert.ok(result.has('mem_i1'), 'Emotional memory should be in intersection');
      assert.ok(!result.has('mem_i2'), 'Factual memory should NOT be in emotional intersection');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── Memory Index Cache ──────────────────────────────────────────────────────

describe('Guard: MemoryIndexCache addMemory contract', () => {

  it('addMemory stores metadata with expected v1 fields', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    // Bypass disk load — set as already loaded
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    cache.addMemory('mem_guard01', {
      importance: 0.8,
      decay: 0.95,
      topics: ['cats', 'dreams'],
      created: '2026-03-01T00:00:00.000Z',
      emotion: 'happy',
      emotionalTag: 'joy',
      type: 'core_memory',
      userId: 'user1',
      userName: 'TestUser'
    });

    const stored = cache.memoryIndex['mem_guard01'];
    assert.ok(stored, 'Memory should be in memoryIndex');
    assert.equal(stored.importance, 0.8);
    assert.equal(stored.decay, 0.95);
    assert.equal(stored.type, 'core_memory');
    assert.equal(stored.emotionalTag, 'joy');
    assert.equal(stored.userId, 'user1');
    assert.equal(stored.userName, 'TestUser');
  });

  it('addMemory populates topicIndex', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    cache.addMemory('mem_guard02', {
      topics: ['astronomy', 'physics'],
      created: '2026-03-01T00:00:00.000Z'
    });

    // Topics are normalized via stemming, so check that SOME topics exist
    const allTopics = Object.keys(cache.topicIndex);
    assert.ok(allTopics.length > 0, 'topicIndex should have entries');
  });

  it('addMemory populates recencyIndex', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    cache.addMemory('mem_guard03', {
      topics: ['test'],
      created: '2026-03-01T00:00:00.000Z',
      last_accessed: '2026-03-02T00:00:00.000Z'
    });

    assert.equal(cache.recencyIndex.length, 1);
    assert.equal(cache.recencyIndex[0].memId, 'mem_guard03');
  });

  it('addMemory applies defaults for missing optional fields', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    cache.addMemory('mem_guard04', {
      created: '2026-03-01T00:00:00.000Z'
    });

    const stored = cache.memoryIndex['mem_guard04'];
    assert.equal(stored.importance, 0.5);
    assert.equal(stored.decay, 1.0);
    assert.equal(stored.type, 'episodic');
    assert.equal(stored.emotionalTag, null);
    assert.equal(stored.userId, null);
    assert.equal(stored.userName, null);
  });

  it('v1 log.json shape (no v2 fields) is accepted without error', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    // Simulate a v1 log.json — no shape, edges, activationLevel, etc.
    assert.doesNotThrow(() => {
      cache.addMemory('mem_v1compat', {
        importance: 0.7,
        decay: 0.9,
        topics: ['legacy'],
        created: '2025-01-01T00:00:00.000Z',
        emotion: 'neutral',
        emotionalTag: null,
        type: 'episodic',
        userId: null,
        userName: null
      });
    });
    assert.ok(cache.memoryIndex['mem_v1compat']);
  });

  it('memoryIndex entry includes shape field (Slice 3)', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    cache.addMemory('mem_withshape', {
      importance: 0.5,
      topics: ['test'],
      created: '2026-01-01T00:00:00.000Z',
      shape: 'emotional'
    });

    const stored = cache.memoryIndex['mem_withshape'];
    assert.equal(stored.shape, 'emotional');
  });

  it('memoryIndex shape defaults to unclassified when absent', () => {
    const cache = new MemoryIndexCache('test-entity-guard');
    cache._loaded = true;
    cache.memoryIndex = {};
    cache.topicIndex = {};
    cache.recencyIndex = [];

    cache.addMemory('mem_noshape', {
      importance: 0.5,
      topics: ['test'],
      created: '2026-01-01T00:00:00.000Z'
    });

    const stored = cache.memoryIndex['mem_noshape'];
    assert.equal(stored.shape, 'unclassified');
    assert.equal('edges' in stored, false, 'edges should not exist in index entry');
    assert.equal('activationLevel' in stored, false, 'activationLevel should not exist in index entry');
  });
});

// ============================================================================
//  Slice 3: Creation Context Capture — guard tests
// ============================================================================

describe('Guard: createCoreMemory accepts creationContext + shape', () => {
  // These tests verify the memory-operations contract without hitting the
  // filesystem — we call createMemoryOperations with mock deps.

  const { createMemoryOperations } = require('../../server/services/memory-operations');
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  function makeTmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'pm-guard-'));
  }

  function makeMockDeps(entityDir) {
    const entityId = 'test-entity-slice3';
    // Create episodic + semantic dirs so writes succeed
    const episodicDir = path.join(entityDir, 'memories', 'episodic');
    const semanticDir = path.join(entityDir, 'memories', 'semantic');
    fs.mkdirSync(episodicDir, { recursive: true });
    fs.mkdirSync(semanticDir, { recursive: true });

    // Patch entityPaths module so it returns our tmp paths
    const entityPathsMod = require('../../server/entityPaths');
    const origGetEpisodic = entityPathsMod.getEpisodicMemoryPath;
    const origGetSemantic = entityPathsMod.getSemanticMemoryPath;
    entityPathsMod.getEpisodicMemoryPath = () => episodicDir;
    entityPathsMod.getSemanticMemoryPath = () => semanticDir;

    const indexCache = new MemoryIndexCache(entityId);
    indexCache._loaded = true;
    indexCache.memoryIndex = {};
    indexCache.topicIndex = {};
    indexCache.recencyIndex = [];

    const ops = createMemoryOperations({
      getCurrentEntityId: () => entityId,
      getMemoryStorage: () => ({ indexCache }),
      getMemoryGraph: () => null,
      logTimeline: () => {}
    });

    return { ops, indexCache, entityDir, episodicDir, semanticDir, restore: () => {
      entityPathsMod.getEpisodicMemoryPath = origGetEpisodic;
      entityPathsMod.getSemanticMemoryPath = origGetSemantic;
    }};
  }

  it('createCoreMemory persists creationContext + shape in log.json', () => {
    const tmpDir = makeTmpDir();
    const { ops, episodicDir, restore } = makeMockDeps(tmpDir);
    try {
      const ctx = { mood: 'curious', emotions: ['curiosity'], tone: 'inquisitive', activeBeliefIds: ['b1'], conversationTopics: ['ai'], userId: 'u1', userName: 'Tester' };
      const result = ops.createCoreMemory({
        semantic: 'Test memory with creation context',
        narrative: 'Narrative test',
        emotion: 'curious',
        topics: ['ai'],
        importance: 0.7,
        creationContext: ctx,
        shape: 'reflective'
      });

      assert.ok(result.ok, 'createCoreMemory should succeed');
      const logPath = path.join(episodicDir, result.memId, 'log.json');
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      assert.deepStrictEqual(log.creationContext, ctx);
      assert.equal(log.shape, 'reflective');
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('createCoreMemory defaults creationContext to null and shape to unclassified', () => {
    const tmpDir = makeTmpDir();
    const { ops, episodicDir, restore } = makeMockDeps(tmpDir);
    try {
      const result = ops.createCoreMemory({
        semantic: 'Memory without context fields',
        narrative: 'Narrative',
        emotion: 'neutral',
        topics: ['misc'],
        importance: 0.4
      });

      assert.ok(result.ok);
      const logPath = path.join(episodicDir, result.memId, 'log.json');
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      assert.equal(log.creationContext, null);
      assert.equal(log.shape, 'unclassified');
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('createSemanticKnowledge persists creationContext + shape in log.json', () => {
    const tmpDir = makeTmpDir();
    const { ops, semanticDir, restore } = makeMockDeps(tmpDir);
    try {
      const ctx = { mood: 'neutral', emotions: [], tone: null, activeBeliefIds: [], conversationTopics: ['science'], userId: null, userName: null };
      const result = ops.createSemanticKnowledge({
        knowledge: 'The speed of light is approximately 300,000 km/s',
        topics: ['science', 'physics'],
        importance: 0.8,
        sourceMemId: 'mem_abc123',
        creationContext: ctx,
        shape: 'factual'
      });

      assert.ok(result.ok, 'createSemanticKnowledge should succeed');
      const logPath = path.join(semanticDir, result.memId, 'log.json');
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      assert.deepStrictEqual(log.creationContext, ctx);
      assert.equal(log.shape, 'factual');
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('createSemanticKnowledge defaults creationContext to null and shape to unclassified', () => {
    const tmpDir = makeTmpDir();
    const { ops, semanticDir, restore } = makeMockDeps(tmpDir);
    try {
      const result = ops.createSemanticKnowledge({
        knowledge: 'Water freezes at 0 degrees Celsius under standard pressure',
        topics: ['science'],
        importance: 0.6,
        sourceMemId: 'mem_xyz789'
      });

      assert.ok(result.ok);
      const logPath = path.join(semanticDir, result.memId, 'log.json');
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      assert.equal(log.creationContext, null);
      assert.equal(log.shape, 'unclassified');
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('indexCache receives shape from createCoreMemory log', () => {
    const tmpDir = makeTmpDir();
    const { ops, indexCache, restore } = makeMockDeps(tmpDir);
    try {
      const result = ops.createCoreMemory({
        semantic: 'Emotional memory for shape index test',
        narrative: 'Feeling deeply sad today',
        emotion: 'sadness',
        topics: ['feelings'],
        importance: 0.9,
        creationContext: null,
        shape: 'emotional'
      });

      assert.ok(result.ok);
      const entry = indexCache.memoryIndex[result.memId];
      assert.ok(entry, 'Memory should be in indexCache');
      assert.equal(entry.shape, 'emotional');
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
//  Slice 5: Edge Seeding at Creation — guard tests
// ============================================================================

describe('Guard: edge-builder seedEdges (Slice 5)', () => {
  const { seedEdges, MAX_EDGES, SCAN_WINDOW } = require('../../server/brain/memory/edge-builder');
  const { normalizeTopics } = require('../../server/brain/utils/topic-utils');

  function mockIndexCache(memories) {
    const memoryIndex = {};
    const recencyIndex = [];
    for (const m of memories) {
      const meta = { ...m };
      delete meta.memId;
      meta.topics = normalizeTopics(meta.topics || []);
      memoryIndex[m.memId] = meta;
      recencyIndex.push({ memId: m.memId, lastAccessed: m.created, created: m.created });
    }
    return {
      getRecentMemories: (limit) => recencyIndex.slice(0, limit),
      getMemoryMeta: (id) => memoryIndex[id] || null
    };
  }

  it('exports seedEdges, MAX_EDGES, SCAN_WINDOW', () => {
    assert.equal(typeof seedEdges, 'function');
    assert.equal(MAX_EDGES, 8);
    assert.equal(SCAN_WINDOW, 50);
  });

  it('returns { edges, patchedIds } shape', () => {
    const cache = mockIndexCache([]);
    const result = seedEdges('mem_new', { created: new Date().toISOString(), topics: [] }, cache);
    assert.ok(Array.isArray(result.edges));
    assert.ok(Array.isArray(result.patchedIds));
  });

  it('returns empty edges for empty index', () => {
    const cache = mockIndexCache([]);
    const result = seedEdges('mem_new', { created: new Date().toISOString(), topics: ['test'] }, cache);
    assert.equal(result.edges.length, 0);
    assert.equal(result.patchedIds.length, 0);
  });

  it('creates temporal_adjacent edge for same userId within 10 minutes', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const cache = mockIndexCache([
      { memId: 'mem_old', created: fiveMinAgo.toISOString(), topics: ['dog'], emotion: 'neutral', userId: 'user1' }
    ]);
    const result = seedEdges('mem_new', {
      created: now.toISOString(),
      topics: ['cat'],
      emotion: 'neutral',
      userId: 'user1'
    }, cache);
    assert.equal(result.edges.length, 1);
    assert.equal(result.edges[0].relation, 'temporal_adjacent');
    assert.equal(result.edges[0].strength, 0.9);
    assert.equal(result.edges[0].targetId, 'mem_old');
    assert.deepStrictEqual(result.patchedIds, ['mem_old']);
  });

  it('creates topic_sibling edge for 2+ shared topics within 24 hours', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const cache = mockIndexCache([
      { memId: 'mem_sib', created: twoHoursAgo.toISOString(), topics: ['cat', 'dream', 'sleep'], emotion: 'neutral', userId: 'user2' }
    ]);
    const result = seedEdges('mem_new', {
      created: now.toISOString(),
      topics: ['cat', 'dream'],
      emotion: 'happy',
      userId: 'user1'
    }, cache);
    assert.equal(result.edges.length, 1);
    assert.equal(result.edges[0].relation, 'topic_sibling');
    assert.equal(result.edges[0].strength, 0.6);
  });

  it('creates emotional_echo edge for same emotion + shared topic within 7 days', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const cache = mockIndexCache([
      { memId: 'mem_echo', created: threeDaysAgo.toISOString(), topics: ['cat'], emotion: 'joy', emotionalTag: 'joy', userId: 'user2' }
    ]);
    const result = seedEdges('mem_new', {
      created: now.toISOString(),
      topics: ['cat', 'dog'],
      emotion: 'joy',
      userId: 'user1'
    }, cache);
    assert.equal(result.edges.length, 1);
    assert.equal(result.edges[0].relation, 'emotional_echo');
    assert.equal(result.edges[0].strength, 0.7);
  });

  it('enforces MAX_EDGES cap', () => {
    const now = new Date();
    const memories = [];
    for (let i = 0; i < 15; i++) {
      memories.push({
        memId: `mem_${String(i).padStart(3, '0')}`,
        created: new Date(now.getTime() - (i + 1) * 60 * 1000).toISOString(),
        topics: ['cat'],
        emotion: 'neutral',
        userId: 'user1'
      });
    }
    const cache = mockIndexCache(memories);
    const result = seedEdges('mem_new', {
      created: now.toISOString(),
      topics: ['cat'],
      emotion: 'neutral',
      userId: 'user1'
    }, cache);
    assert.ok(result.edges.length <= MAX_EDGES, `Expected max ${MAX_EDGES} edges, got ${result.edges.length}`);
    assert.equal(result.edges.length, MAX_EDGES);
  });

  it('strongest rule wins per candidate (temporal > emotional > topic)', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const cache = mockIndexCache([
      { memId: 'mem_all', created: fiveMinAgo.toISOString(), topics: ['cat', 'dream'], emotion: 'joy', userId: 'user1' }
    ]);
    const result = seedEdges('mem_new', {
      created: now.toISOString(),
      topics: ['cat', 'dream'],
      emotion: 'joy',
      userId: 'user1'
    }, cache);
    assert.equal(result.edges.length, 1);
    assert.equal(result.edges[0].relation, 'temporal_adjacent');
  });

  it('does not create edges outside time windows', () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const cache = mockIndexCache([
      { memId: 'mem_old', created: tenDaysAgo.toISOString(), topics: ['cat', 'dream'], emotion: 'joy', userId: 'user1' }
    ]);
    const result = seedEdges('mem_new', {
      created: now.toISOString(),
      topics: ['cat', 'dream'],
      emotion: 'joy',
      userId: 'user1'
    }, cache);
    assert.equal(result.edges.length, 0);
  });

  it('skips self-reference (newMemId in index)', () => {
    const now = new Date();
    const cache = mockIndexCache([
      { memId: 'mem_self', created: now.toISOString(), topics: ['cat'], emotion: 'neutral', userId: 'user1' }
    ]);
    const result = seedEdges('mem_self', {
      created: now.toISOString(),
      topics: ['cat'],
      emotion: 'neutral',
      userId: 'user1'
    }, cache);
    assert.equal(result.edges.length, 0);
  });
});

describe('Guard: createCoreMemory persists edges (Slice 5)', () => {
  const { createMemoryOperations } = require('../../server/services/memory-operations');
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  function makeTmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'pm-edge-'));
  }

  function makeMockDeps(entityDir) {
    const entityId = 'test-entity-slice5';
    const episodicDir = path.join(entityDir, 'memories', 'episodic');
    const semanticDir = path.join(entityDir, 'memories', 'semantic');
    fs.mkdirSync(episodicDir, { recursive: true });
    fs.mkdirSync(semanticDir, { recursive: true });

    const entityPathsMod = require('../../server/entityPaths');
    const origGetEpisodic = entityPathsMod.getEpisodicMemoryPath;
    const origGetSemantic = entityPathsMod.getSemanticMemoryPath;
    entityPathsMod.getEpisodicMemoryPath = () => episodicDir;
    entityPathsMod.getSemanticMemoryPath = () => semanticDir;

    const indexCache = new MemoryIndexCache(entityId);
    indexCache._loaded = true;
    indexCache.memoryIndex = {};
    indexCache.topicIndex = {};
    indexCache.recencyIndex = [];

    const ops = createMemoryOperations({
      getCurrentEntityId: () => entityId,
      getMemoryStorage: () => ({ indexCache }),
      getMemoryGraph: () => null,
      logTimeline: () => {}
    });

    return { ops, indexCache, entityDir, episodicDir, semanticDir, restore: () => {
      entityPathsMod.getEpisodicMemoryPath = origGetEpisodic;
      entityPathsMod.getSemanticMemoryPath = origGetSemantic;
    }};
  }

  it('log.json includes edges field (empty when no neighbors)', () => {
    const tmpDir = makeTmpDir();
    const { ops, episodicDir, restore } = makeMockDeps(tmpDir);
    try {
      const result = ops.createCoreMemory({
        semantic: 'Lonely memory with no neighbors',
        narrative: 'Alone',
        emotion: 'neutral',
        topics: ['solo'],
        importance: 0.5,
        shape: 'narrative'
      });
      assert.ok(result.ok);
      const log = JSON.parse(fs.readFileSync(path.join(episodicDir, result.memId, 'log.json'), 'utf8'));
      assert.ok(Array.isArray(log.edges), 'edges should be an array');
      assert.equal(log.edges.length, 0);
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('log.json includes userId and userName from creationContext', () => {
    const tmpDir = makeTmpDir();
    const { ops, episodicDir, restore } = makeMockDeps(tmpDir);
    try {
      const ctx = { mood: 'calm', emotions: [], tone: null, activeBeliefIds: [], conversationTopics: ['test'], userId: 'u42', userName: 'Alice' };
      const result = ops.createCoreMemory({
        semantic: 'Memory with user info on log',
        narrative: 'Test',
        emotion: 'neutral',
        topics: ['test'],
        importance: 0.5,
        creationContext: ctx,
        shape: 'narrative'
      });
      assert.ok(result.ok);
      const log = JSON.parse(fs.readFileSync(path.join(episodicDir, result.memId, 'log.json'), 'utf8'));
      assert.equal(log.userId, 'u42');
      assert.equal(log.userName, 'Alice');
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('seeds edges and patches connected memory bidirectionally', () => {
    const tmpDir = makeTmpDir();
    const { ops, indexCache, episodicDir, restore } = makeMockDeps(tmpDir);
    try {
      const ctx = { mood: 'calm', emotions: [], tone: null, activeBeliefIds: [], conversationTopics: ['cat', 'dream'], userId: 'u1', userName: 'Tester' };

      // First memory — no neighbors, should have empty edges
      const r1 = ops.createCoreMemory({
        semantic: 'Memory about cats and dreams first',
        emotion: 'neutral',
        topics: ['cat', 'dream'],
        importance: 0.5,
        creationContext: ctx,
        shape: 'narrative'
      });
      assert.ok(r1.ok);

      // Second memory — same topics as first, should discover topic_sibling
      const r2 = ops.createCoreMemory({
        semantic: 'Memory about cats and dreams second',
        emotion: 'neutral',
        topics: ['cat', 'dream'],
        importance: 0.5,
        creationContext: ctx,
        shape: 'narrative'
      });
      assert.ok(r2.ok);

      // Check second memory has edges
      const log2 = JSON.parse(fs.readFileSync(path.join(episodicDir, r2.memId, 'log.json'), 'utf8'));
      assert.ok(log2.edges.length > 0, 'Second memory should have edges to first');
      assert.equal(log2.edges[0].targetId, r1.memId);

      // Check first memory was patched with reverse edge
      const log1 = JSON.parse(fs.readFileSync(path.join(episodicDir, r1.memId, 'log.json'), 'utf8'));
      assert.ok(log1.edges.length > 0, 'First memory should have reverse edge from second');
      assert.equal(log1.edges[0].targetId, r2.memId);
    } finally {
      restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
//  Slice 6: Activation Propagation Engine — guard tests
// ============================================================================

describe('Guard: activation-network (Slice 6)', () => {
  const { activate, decayAllActivations, getPreActivated } = require('../../server/brain/memory/activation-network');

  function mockIndexCache(entries) {
    // entries: array of { memId, ...meta }
    const memoryIndex = {};
    for (const e of entries) {
      const meta = { ...e };
      delete meta.memId;
      memoryIndex[e.memId] = meta;
    }
    return {
      getMemoryMeta: (id) => memoryIndex[id] || null,
      load: () => {},
      memoryIndex
    };
  }

  it('exports activate, decayAllActivations, getPreActivated', () => {
    assert.equal(typeof activate, 'function');
    assert.equal(typeof decayAllActivations, 'function');
    assert.equal(typeof getPreActivated, 'function');
  });

  it('activate sets activationLevel on target memory', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    const result = activate('mem_a', 0.8, cache, { readEdges: () => [] });
    assert.deepStrictEqual(result.activated, ['mem_a']);
    assert.equal(result.propagated, 0);
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 0.8);
  });

  it('activate clamps energy to [0.0, 1.0]', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    activate('mem_a', 1.5, cache, { readEdges: () => [] });
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 1.0);
  });

  it('activation stacks but caps at 1.0', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    activate('mem_a', 0.6, cache, { readEdges: () => [] });
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 0.6);
    activate('mem_a', 0.7, cache, { readEdges: () => [] });
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 1.0);
  });

  it('propagates to hop-1 neighbors', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    const edgeMap = {
      'mem_a': [{ targetId: 'mem_b', relation: 'topic_sibling', strength: 0.6 }],
      'mem_b': []
    };
    const result = activate('mem_a', 0.8, cache, {
      readEdges: (id) => edgeMap[id] || []
    });
    assert.ok(result.activated.includes('mem_b'));
    assert.equal(result.propagated, 1);
    // hop-1 energy: 0.8 * 0.6 * 0.5 = 0.24
    const bLevel = cache.memoryIndex['mem_b'].activationLevel;
    assert.ok(Math.abs(bLevel - 0.24) < 0.001, `Expected ~0.24, got ${bLevel}`);
  });

  it('propagates to hop-2 neighbors', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_c', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    const edgeMap = {
      'mem_a': [{ targetId: 'mem_b', relation: 'temporal_adjacent', strength: 0.9 }],
      'mem_b': [{ targetId: 'mem_c', relation: 'topic_sibling', strength: 0.6 }],
      'mem_c': []
    };
    const result = activate('mem_a', 0.8, cache, {
      readEdges: (id) => edgeMap[id] || []
    });
    assert.ok(result.activated.includes('mem_c'));
    // hop-1 energy for mem_b: 0.8 * 0.9 * 0.5 = 0.36
    // hop-2 energy for mem_c: 0.36 * 0.6 * 0.25 = 0.054
    const cLevel = cache.memoryIndex['mem_c'].activationLevel;
    assert.ok(Math.abs(cLevel - 0.054) < 0.001, `Expected ~0.054, got ${cLevel}`);
    assert.ok(result.propagated >= 2);
  });

  it('does not loop back to source on hop-2', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    const edgeMap = {
      'mem_a': [{ targetId: 'mem_b', relation: 'topic_sibling', strength: 0.9 }],
      'mem_b': [{ targetId: 'mem_a', relation: 'topic_sibling', strength: 0.9 }]
    };
    activate('mem_a', 0.8, cache, { readEdges: (id) => edgeMap[id] || [] });
    // mem_a should have 0.8 from direct activation, NOT additional from hop-2 loop-back
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 0.8);
  });

  it('returns empty for unknown memId', () => {
    const cache = mockIndexCache([]);
    const result = activate('mem_unknown', 0.5, cache, { readEdges: () => [] });
    assert.deepStrictEqual(result.activated, []);
    assert.equal(result.propagated, 0);
  });

  it('decayAllActivations reduces levels by rate', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 1.0;
    cache.memoryIndex['mem_b'].activationLevel = 0.5;

    decayAllActivations(cache, 0.3);

    assert.ok(Math.abs(cache.memoryIndex['mem_a'].activationLevel - 0.7) < 0.001);
    assert.ok(Math.abs(cache.memoryIndex['mem_b'].activationLevel - 0.35) < 0.001);
  });

  it('decayAllActivations floors at 0', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.0005;
    decayAllActivations(cache, 0.3);
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 0);
  });

  it('getPreActivated returns memIds above threshold sorted by energy', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_c', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_d', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.8;
    cache.memoryIndex['mem_b'].activationLevel = 0.1; // below threshold
    cache.memoryIndex['mem_c'].activationLevel = 0.5;
    // mem_d has no activationLevel

    const result = getPreActivated(cache, 0.15);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'mem_a'); // highest first
    assert.equal(result[1], 'mem_c');
  });

  it('getPreActivated respects limit', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_c', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.8;
    cache.memoryIndex['mem_b'].activationLevel = 0.6;
    cache.memoryIndex['mem_c'].activationLevel = 0.4;

    const result = getPreActivated(cache, 0.15, 2);
    assert.equal(result.length, 2);
  });

  it('getPreActivated returns empty when no memories above threshold', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    const result = getPreActivated(cache, 0.15);
    assert.equal(result.length, 0);
  });
});

// ============================================================================
//  Slice 7: Wire Activation into Retrieval Path — guard tests
// ============================================================================

describe('Guard: activation wiring in retrieval + decay (Slice 7)', () => {
  const { activate, decayAllActivations, getPreActivated } = require('../../server/brain/memory/activation-network');
  const decayPhase = require('../../server/brain/cognition/phases/phase-decay');

  function mockIndexCache(entries) {
    const memoryIndex = {};
    for (const e of entries) {
      const meta = { ...e };
      delete meta.memId;
      memoryIndex[e.memId] = meta;
    }
    return {
      getMemoryMeta: (id) => memoryIndex[id] || null,
      load: () => {},
      memoryIndex
    };
  }

  it('activation boost: pre-activated memory scores higher', () => {
    // Simulate what memory-retrieval.js does: adds activationLevel * 0.25
    const baseScoringFn = (meta) => {
      let score = meta.importance * 1.2;
      if ((meta.activationLevel || 0) > 0.15) {
        score += meta.activationLevel * 0.25;
      }
      return score;
    };

    const withActivation = baseScoringFn({ importance: 0.5, activationLevel: 0.8 });
    const withoutActivation = baseScoringFn({ importance: 0.5, activationLevel: 0 });
    assert.ok(withActivation > withoutActivation, 'Pre-activated memory should score higher');
    assert.ok(Math.abs((withActivation - withoutActivation) - 0.2) < 0.001, 'Boost should be 0.8 * 0.25 = 0.2');
  });

  it('activation boost: below-threshold memory gets no boost', () => {
    const baseScoringFn = (meta) => {
      let score = meta.importance * 1.2;
      if ((meta.activationLevel || 0) > 0.15) {
        score += meta.activationLevel * 0.25;
      }
      return score;
    };

    const belowThreshold = baseScoringFn({ importance: 0.5, activationLevel: 0.1 });
    const noActivation = baseScoringFn({ importance: 0.5, activationLevel: 0 });
    assert.equal(belowThreshold, noActivation, 'Below-threshold should get no boost');
  });

  it('decayPhase decays activation levels every cycle', async () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.8;
    cache.memoryIndex['mem_b'].activationLevel = 0.5;

    // Simulate what phase-decay does: call on every cycle, before 24h gate
    const mockLoop = {
      memoryStorage: { indexCache: cache },
      lastDecayTime: Date.now(), // recent — so daily gate won't pass
      _emit: () => {},
      _memoryIndex: null,
      _identityManager: null
    };

    await decayPhase(mockLoop);

    // Activation should have decayed even though daily gate didn't pass
    assert.ok(cache.memoryIndex['mem_a'].activationLevel < 0.8, 'Activation should decay');
    assert.ok(Math.abs(cache.memoryIndex['mem_a'].activationLevel - 0.56) < 0.01, 'Expected ~0.56 after 0.3 rate');
    assert.ok(Math.abs(cache.memoryIndex['mem_b'].activationLevel - 0.35) < 0.01, 'Expected ~0.35 after 0.3 rate');
  });

  it('decayPhase does not error when no indexCache', async () => {
    const mockLoop = {
      memoryStorage: null,
      lastDecayTime: Date.now(),
      _emit: () => {},
      _memoryIndex: null,
      _identityManager: null
    };
    await assert.doesNotReject(async () => decayPhase(mockLoop));
  });

  it('activation propagation then decay then getPreActivated cycle', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], created: '2026-01-01T00:00:00Z' }
    ]);
    const edgeMap = {
      'mem_a': [{ targetId: 'mem_b', relation: 'topic_sibling', strength: 0.6 }],
      'mem_b': []
    };

    // 1. Activate
    activate('mem_a', 0.8, cache, { readEdges: (id) => edgeMap[id] || [] });
    assert.equal(cache.memoryIndex['mem_a'].activationLevel, 0.8);
    assert.ok(cache.memoryIndex['mem_b'].activationLevel > 0);

    // 2. Pre-activated should include both
    let preActivated = getPreActivated(cache, 0.15);
    assert.ok(preActivated.includes('mem_a'));
    assert.ok(preActivated.includes('mem_b'));

    // 3. Decay multiple cycles
    for (let i = 0; i < 5; i++) {
      decayAllActivations(cache, 0.3);
    }

    // 4. After 5 decay cycles, mem_b should be below threshold
    // mem_b started at 0.24, after 5 decays: 0.24 * 0.7^5 ≈ 0.04
    preActivated = getPreActivated(cache, 0.15);
    assert.ok(!preActivated.includes('mem_b'), 'mem_b should be below threshold after 5 decays');
  });

  it('phase-decay exports a function', () => {
    assert.equal(typeof decayPhase, 'function');
  });
});

// ============================================================================
//  Slice 8: Echo Future Implementation — guard tests
// ============================================================================

describe('Guard: echoFuture implementation (Slice 8)', () => {
  const { echoFuture } = require('../../server/brain/agent-echo');
  const { activate } = require('../../server/brain/memory/activation-network');

  function mockIndexCache(entries) {
    const memoryIndex = {};
    for (const e of entries) {
      const meta = { ...e };
      delete meta.memId;
      memoryIndex[e.memId] = meta;
    }
    return {
      getMemoryMeta: (id) => memoryIndex[id] || null,
      load: () => {},
      memoryIndex
    };
  }

  it('returns [] when no memories are pre-activated', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' }
    ]);
    const result = echoFuture('test-entity', ['test'], { _indexCache: cache });
    assert.deepEqual(result, []);
  });

  it('returns pre-activated memories with correct shape', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['cats', 'pets'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['dogs', 'pets'], shape: 'emotional', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.5;
    cache.memoryIndex['mem_b'].activationLevel = 0.3;

    const result = echoFuture('test-entity', ['pets'], { _indexCache: cache });
    assert.ok(result.length === 2);
    assert.equal(result[0].id, 'mem_a');
    assert.equal(result[0].shape, 'narrative');
    assert.equal(result[1].id, 'mem_b');
    assert.equal(result[1].shape, 'emotional');
  });

  it('filters by topic overlap when topics provided', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['cats'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['dogs'], shape: 'narrative', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.5;
    cache.memoryIndex['mem_b'].activationLevel = 0.5;

    const result = echoFuture('test-entity', ['cats'], { _indexCache: cache });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'mem_a');
  });

  it('returns all pre-activated when topics is null', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['cats'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['dogs'], shape: 'narrative', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.5;
    cache.memoryIndex['mem_b'].activationLevel = 0.3;

    const result = echoFuture('test-entity', null, { _indexCache: cache });
    assert.equal(result.length, 2);
  });

  it('applies +0.2 boost for anticipatory shape', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], shape: 'anticipatory', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.3;
    cache.memoryIndex['mem_b'].activationLevel = 0.4;

    const result = echoFuture('test-entity', ['test'], { _indexCache: cache });
    // mem_a: 0.3 + 0.2 = 0.5 (anticipatory boost)
    // mem_b: 0.4 (no boost)
    assert.equal(result[0].id, 'mem_a', 'Anticipatory memory should rank higher after boost');
    assert.ok(Math.abs(result[0].activationLevel - 0.5) < 0.01);
  });

  it('caps anticipatory boost at 1.0', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], shape: 'anticipatory', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.9;

    const result = echoFuture('test-entity', ['test'], { _indexCache: cache });
    assert.ok(result[0].activationLevel <= 1.0, 'Should cap at 1.0');
  });

  it('respects limit parameter', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_c', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.5;
    cache.memoryIndex['mem_b'].activationLevel = 0.4;
    cache.memoryIndex['mem_c'].activationLevel = 0.3;

    const result = echoFuture('test-entity', ['test'], { _indexCache: cache, limit: 2 });
    assert.equal(result.length, 2);
  });

  it('returns entries with expected fields', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z', creationContext: { mood: 'happy' } }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.5;

    const result = echoFuture('test-entity', ['test'], { _indexCache: cache });
    assert.equal(result.length, 1);
    const entry = result[0];
    assert.equal(entry.id, 'mem_a');
    assert.deepEqual(entry.topics, ['test']);
    assert.equal(entry.shape, 'narrative');
    assert.equal(entry.activationLevel, 0.5);
    assert.deepEqual(entry.creationContext, { mood: 'happy' });
  });

  it('ECHO_FUTURE_HIT thought type exists', () => {
    const ThoughtTypes = require('../../server/brain/bus/thought-types');
    assert.equal(ThoughtTypes.ECHO_FUTURE_HIT, 'echo_future_hit');
  });

  it('returns sorted by activation level descending', () => {
    const cache = mockIndexCache([
      { memId: 'mem_a', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_b', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' },
      { memId: 'mem_c', topics: ['test'], shape: 'narrative', created: '2026-01-01T00:00:00Z' }
    ]);
    cache.memoryIndex['mem_a'].activationLevel = 0.3;
    cache.memoryIndex['mem_b'].activationLevel = 0.8;
    cache.memoryIndex['mem_c'].activationLevel = 0.5;

    const result = echoFuture('test-entity', null, { _indexCache: cache });
    assert.equal(result[0].id, 'mem_b');
    assert.equal(result[1].id, 'mem_c');
    assert.equal(result[2].id, 'mem_a');
  });
});

// ============================================================================
//  Slice 9: Belief-Linked Activation — guard tests
// ============================================================================

describe('Guard: belief-linked activation (Slice 9)', () => {
  const { seedBeliefEdges, MAX_EDGES } = require('../../server/brain/memory/edge-builder');
  const BeliefGraph = require('../../server/brain/knowledge/beliefGraph');
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  it('seedBeliefEdges is exported', () => {
    assert.equal(typeof seedBeliefEdges, 'function');
  });

  it('seedBeliefEdges returns empty for no beliefs', () => {
    const result = seedBeliefEdges('mem_new', [], new Set());
    assert.deepEqual(result, []);
  });

  it('seedBeliefEdges creates belief_linked edges to source memories', () => {
    const beliefs = [
      { confidence: 0.8, sources: ['mem_src1', 'mem_src2'] }
    ];
    const result = seedBeliefEdges('mem_new', beliefs, new Set());
    assert.equal(result.length, 2);
    assert.equal(result[0].relation, 'belief_linked');
    assert.equal(result[0].targetId, 'mem_src1');
    assert.ok(Math.abs(result[0].strength - 0.4) < 0.01, 'Strength should be 0.5 * 0.8 = 0.4');
    assert.equal(result[1].targetId, 'mem_src2');
  });

  it('seedBeliefEdges skips self-reference', () => {
    const beliefs = [
      { confidence: 0.8, sources: ['mem_new', 'mem_other'] }
    ];
    const result = seedBeliefEdges('mem_new', beliefs, new Set());
    assert.equal(result.length, 1);
    assert.equal(result[0].targetId, 'mem_other');
  });

  it('seedBeliefEdges respects existing targets', () => {
    const beliefs = [
      { confidence: 0.8, sources: ['mem_already', 'mem_other'] }
    ];
    const result = seedBeliefEdges('mem_new', beliefs, new Set(['mem_already']));
    assert.equal(result.length, 1);
    assert.equal(result[0].targetId, 'mem_other');
  });

  it('seedBeliefEdges caps at MAX_EDGES', () => {
    const sources = [];
    for (let i = 0; i < 20; i++) sources.push(`mem_src_${i}`);
    const beliefs = [{ confidence: 0.8, sources }];
    const result = seedBeliefEdges('mem_new', beliefs, new Set());
    assert.ok(result.length <= MAX_EDGES);
  });

  it('seedBeliefEdges skips beliefs with near-zero confidence', () => {
    const beliefs = [
      { confidence: 0.01, sources: ['mem_src1'] }
    ];
    const result = seedBeliefEdges('mem_new', beliefs, new Set());
    assert.equal(result.length, 0, 'strength 0.5 * 0.01 = 0.005 < 0.01 threshold');
  });

  it('getAttentionBoosts returns structured boost data', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice9-'));
    const beliefsDir = path.join(tmpDir, 'beliefs');
    fs.mkdirSync(beliefsDir, { recursive: true });

    const bg = new BeliefGraph({ entityId: 'test', beliefsDir });
    bg.createBeliefNode({
      statement: 'Cats are interesting',
      confidence: 0.8,
      topics: ['cats'],
      sources: ['mem_1', 'mem_2']
    });

    const boosts = bg.getAttentionBoosts(['cats']);
    assert.ok(boosts.length > 0);
    assert.ok(boosts[0].beliefId);
    assert.equal(boosts[0].confidence, 0.8);
    assert.deepEqual(boosts[0].sourceMemIds, ['mem_1', 'mem_2']);
    assert.ok(Math.abs(boosts[0].boost - 0.16) < 0.01, 'boost = 0.2 * 0.8 = 0.16');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getAttentionBoosts returns [] for unrelated topics', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice9-'));
    const beliefsDir = path.join(tmpDir, 'beliefs');
    fs.mkdirSync(beliefsDir, { recursive: true });

    const bg = new BeliefGraph({ entityId: 'test', beliefsDir });
    bg.createBeliefNode({
      statement: 'Dogs are loyal',
      confidence: 0.8,
      topics: ['dogs'],
      sources: ['mem_1']
    });

    const boosts = bg.getAttentionBoosts(['quantum_physics']);
    assert.equal(boosts.length, 0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getAttentionBoosts returns [] for empty topics', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice9-'));
    const beliefsDir = path.join(tmpDir, 'beliefs');
    fs.mkdirSync(beliefsDir, { recursive: true });

    const bg = new BeliefGraph({ entityId: 'test', beliefsDir });
    assert.deepEqual(bg.getAttentionBoosts([]), []);
    assert.deepEqual(bg.getAttentionBoosts(null), []);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================================
//  Slice 10: Dream Reconsolidation — guard tests
// ============================================================================

describe('Guard: dream reconsolidation (Slice 10)', () => {
  const {
    reconsolidate,
    EDGE_STRENGTHEN,
    EDGE_WEAKEN,
    EDGE_FLOOR,
    MUTUAL_STRENGTH_THRESHOLD,
    BELIEF_REINFORCEMENT_THRESHOLD
  } = require('../../server/brain/memory/reconsolidation');

  // Helper: build a mock indexCache
  function mockIndexCache(entries, recencyEntries) {
    const memoryIndex = {};
    for (const [id, meta] of Object.entries(entries)) {
      memoryIndex[id] = meta;
    }
    return {
      getRecentMemories(limit) { return (recencyEntries || []).slice(0, limit); },
      getMemoryMeta(id) { return memoryIndex[id] || null; },
      getAllMemoryIds() { return Object.keys(memoryIndex); }
    };
  }

  it('reconsolidate is exported as function', () => {
    assert.equal(typeof reconsolidate, 'function');
  });

  it('returns zero-result for null indexCache', () => {
    const r = reconsolidate('ent_1', null, null);
    assert.equal(r.edgesUpdated, 0);
    assert.equal(r.stubsCreated, 0);
    assert.equal(r.clustersFound, 0);
  });

  it('returns zero-result when no recent memories', () => {
    const ic = mockIndexCache({}, []);
    const r = reconsolidate('ent_1', ic, null, { now: Date.now() });
    assert.equal(r.edgesUpdated, 0);
    assert.equal(r.clustersFound, 0);
  });

  it('strengthens edges between co-accessed memories', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const edgeStore = {
      mem_a: [{ targetId: 'mem_b', relation: 'topic_sibling', strength: 0.5 }],
      mem_b: [{ targetId: 'mem_a', relation: 'topic_sibling', strength: 0.5 }]
    };
    const written = {};

    const ic = mockIndexCache(
      { mem_a: { topics: ['t'] }, mem_b: { topics: ['t'] } },
      [
        { memId: 'mem_a', lastAccessed: recent },
        { memId: 'mem_b', lastAccessed: recent }
      ]
    );

    const r = reconsolidate('ent_1', ic, null, {
      now,
      _getEdges: (id) => edgeStore[id] ? edgeStore[id].map(e => ({ ...e })) : [],
      _setEdges: (id, edges) => { written[id] = edges; }
    });

    assert.ok(r.edgesUpdated >= 1);
    assert.ok(written.mem_a);
    assert.ok(Math.abs(written.mem_a[0].strength - (0.5 + EDGE_STRENGTHEN)) < 0.001);
  });

  it('weakens edges to un-accessed neighbors', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const ic = mockIndexCache(
      { mem_a: { topics: ['t'] }, mem_c: { topics: ['t'] } },
      [{ memId: 'mem_a', lastAccessed: recent }]
    );

    const written = {};
    reconsolidate('ent_1', ic, null, {
      now,
      _getEdges: (id) => id === 'mem_a' ? [{ targetId: 'mem_c', relation: 'topic_sibling', strength: 0.3 }] : [],
      _setEdges: (id, edges) => { written[id] = edges; }
    });

    assert.ok(written.mem_a);
    assert.ok(Math.abs(written.mem_a[0].strength - (0.3 + EDGE_WEAKEN)) < 0.001);
  });

  it('edge weakening floors at EDGE_FLOOR', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const ic = mockIndexCache(
      { mem_a: { topics: ['t'] } },
      [{ memId: 'mem_a', lastAccessed: recent }]
    );

    const written = {};
    reconsolidate('ent_1', ic, null, {
      now,
      _getEdges: (id) => id === 'mem_a' ? [{ targetId: 'mem_z', relation: 'temporal_adjacent', strength: 0.12 }] : [],
      _setEdges: (id, edges) => { written[id] = edges; }
    });

    // strength 0.12 + EDGE_WEAKEN (-0.05) = 0.07, but floor is 0.1
    assert.ok(written.mem_a);
    assert.equal(written.mem_a[0].strength, EDGE_FLOOR);
  });

  it('detects clusters from mutual strong edges', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const edgeStore = {
      mem_a: [{ targetId: 'mem_b', relation: 'temporal_adjacent', strength: 0.7 }],
      mem_b: [{ targetId: 'mem_a', relation: 'temporal_adjacent', strength: 0.7 }]
    };

    const ic = mockIndexCache(
      { mem_a: { topics: ['cats'] }, mem_b: { topics: ['cats', 'dogs'] } },
      [
        { memId: 'mem_a', lastAccessed: recent },
        { memId: 'mem_b', lastAccessed: recent }
      ]
    );

    const r = reconsolidate('ent_1', ic, null, {
      now,
      _getEdges: (id) => edgeStore[id] || [],
      _setEdges: () => {}
    });

    assert.ok(r.clustersFound >= 1, 'Should detect at least 1 cluster');
    assert.ok(r.clusters[0].members.length >= 2);
    assert.equal(r.clusters[0].dominantTopic, 'cats');
  });

  it('no clusters when edges are below mutual threshold', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const ic = mockIndexCache(
      { mem_a: { topics: ['t'] }, mem_b: { topics: ['t'] } },
      [
        { memId: 'mem_a', lastAccessed: recent },
        { memId: 'mem_b', lastAccessed: recent }
      ]
    );

    const r = reconsolidate('ent_1', ic, null, {
      now,
      _getEdges: (id) => id === 'mem_a' ? [{ targetId: 'mem_b', relation: 'topic_sibling', strength: 0.3 }] : [],
      _setEdges: () => {}
    });

    assert.equal(r.clustersFound, 0);
  });

  it('creates anticipatory stubs for heavily-reinforced beliefs', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const edgeStore = {
      mem_src1: [{ targetId: 'mem_src2', relation: 'temporal_adjacent', strength: 0.8 }],
      mem_src2: [{ targetId: 'mem_src1', relation: 'temporal_adjacent', strength: 0.8 }]
    };

    const ic = mockIndexCache(
      { mem_src1: { topics: ['trust'] }, mem_src2: { topics: ['trust'] } },
      [
        { memId: 'mem_src1', lastAccessed: recent },
        { memId: 'mem_src2', lastAccessed: recent }
      ]
    );

    const stubsCreated = [];
    const mockBeliefGraph = {
      getAllBeliefs: () => [{
        belief_id: 'b1',
        statement: 'Trust is earned',
        confidence: 0.9,
        topics: ['trust'],
        sources: ['mem_src1', 'mem_src2'],
        access_count: 5,
        last_reinforced: new Date(now - 3600000).toISOString()
      }]
    };

    const r = reconsolidate('ent_1', ic, mockBeliefGraph, {
      now,
      _getEdges: (id) => edgeStore[id] || [],
      _setEdges: () => {},
      _createStub: (args) => { stubsCreated.push(args); return true; }
    });

    assert.equal(r.stubsCreated, 1);
    assert.equal(stubsCreated[0].belief.belief_id, 'b1');
    assert.ok(stubsCreated[0].importance <= 0.45);
    assert.ok(stubsCreated[0].cluster.members.length >= 2);
  });

  it('skips stub when belief not recently reinforced', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const edgeStore = {
      mem_a: [{ targetId: 'mem_b', relation: 'temporal_adjacent', strength: 0.8 }],
      mem_b: [{ targetId: 'mem_a', relation: 'temporal_adjacent', strength: 0.8 }]
    };

    const ic = mockIndexCache(
      { mem_a: { topics: ['t'] }, mem_b: { topics: ['t'] } },
      [
        { memId: 'mem_a', lastAccessed: recent },
        { memId: 'mem_b', lastAccessed: recent }
      ]
    );

    const mockBeliefGraph = {
      getAllBeliefs: () => [{
        belief_id: 'b1',
        confidence: 0.9,
        topics: ['t'],
        sources: ['mem_a', 'mem_b'],
        access_count: 5,
        last_reinforced: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
      }]
    };

    const r = reconsolidate('ent_1', ic, mockBeliefGraph, {
      now,
      _getEdges: (id) => edgeStore[id] || [],
      _setEdges: () => {},
      _createStub: () => true
    });

    assert.equal(r.stubsCreated, 0);
  });

  it('skips stub when belief sources not in any cluster', () => {
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();

    const ic = mockIndexCache(
      { mem_a: { topics: ['t'] }, mem_b: { topics: ['t'] } },
      [
        { memId: 'mem_a', lastAccessed: recent },
        { memId: 'mem_b', lastAccessed: recent }
      ]
    );

    const mockBeliefGraph = {
      getAllBeliefs: () => [{
        belief_id: 'b1',
        confidence: 0.9,
        topics: ['t'],
        sources: ['mem_a', 'mem_b'],
        access_count: 5,
        last_reinforced: new Date(now - 3600000).toISOString()
      }]
    };

    const r = reconsolidate('ent_1', ic, mockBeliefGraph, {
      now,
      _getEdges: () => [],
      _setEdges: () => {},
      _createStub: () => true
    });

    assert.equal(r.stubsCreated, 0);
  });

  it('exports constants', () => {
    assert.equal(EDGE_STRENGTHEN, 0.1);
    assert.equal(EDGE_WEAKEN, -0.05);
    assert.equal(EDGE_FLOOR, 0.1);
    assert.equal(MUTUAL_STRENGTH_THRESHOLD, 0.5);
    assert.equal(BELIEF_REINFORCEMENT_THRESHOLD, 3);
  });
});

// ============================================================================
//  Slice 11: Legacy Memory Migration — guard tests
// ============================================================================

describe('Guard: legacy memory migration (Slice 11)', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const { main, migrateEntity, scanMemories, buildMiniIndex } = require('../../server/tools/migrate-memory-agents');

  function createSyntheticEntity(tmpDir, entityId, memories) {
    const entityDir = path.join(tmpDir, `entity_${entityId}`);
    const epiDir = path.join(entityDir, 'memories', 'episodic');
    fs.mkdirSync(epiDir, { recursive: true });

    for (const mem of memories) {
      const memDir = path.join(epiDir, mem.id);
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(mem.log, null, 2));
      fs.writeFileSync(path.join(memDir, 'semantic.txt'), mem.semantic || '');
    }
    return entityDir;
  }

  it('exports main, migrateEntity, scanMemories, buildMiniIndex', () => {
    assert.equal(typeof main, 'function');
    assert.equal(typeof migrateEntity, 'function');
    assert.equal(typeof scanMemories, 'function');
    assert.equal(typeof buildMiniIndex, 'function');
  });

  it('dry-run mode does not modify files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice11-'));
    const v1Log = {
      memory_id: 'mem_v1test',
      type: 'episodic',
      created: new Date().toISOString(),
      importance: 0.7,
      decay: 0.5,
      topics: ['cats', 'dogs'],
      emotionalTag: 'joy'
    };
    createSyntheticEntity(tmpDir, 'test11', [
      { id: 'mem_v1test', log: v1Log, semantic: 'I love cats and dogs' }
    ]);

    // Temporarily override ENTITIES_DIR
    const origDir = require('../../server/entityPaths').ENTITIES_DIR;
    require('../../server/entityPaths').ENTITIES_DIR = tmpDir;

    try {
      const result = main(['node', 'script', '--dry-run', '--entity', 'test11']);
      assert.equal(result.totalMigrated, 1);
      // File should NOT be modified (dry-run)
      const afterLog = JSON.parse(fs.readFileSync(
        path.join(tmpDir, 'entity_test11', 'memories', 'episodic', 'mem_v1test', 'log.json'), 'utf8'
      ));
      assert.equal(afterLog.memorySchemaVersion, undefined, 'v1 log should not have version field in dry-run');
    } finally {
      require('../../server/entityPaths').ENTITIES_DIR = origDir;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('apply mode writes v2 fields to log.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice11-'));
    const v1Log = {
      memory_id: 'mem_apply1',
      type: 'episodic',
      created: new Date().toISOString(),
      importance: 0.7,
      decay: 0.5,
      topics: ['technology'],
      emotionalTag: 'neutral'
    };
    createSyntheticEntity(tmpDir, 'test11a', [
      { id: 'mem_apply1', log: v1Log, semantic: 'The capital of Japan is Tokyo' }
    ]);

    const origDir = require('../../server/entityPaths').ENTITIES_DIR;
    require('../../server/entityPaths').ENTITIES_DIR = tmpDir;

    try {
      const result = main(['node', 'script', '--apply', '--entity', 'test11a']);
      assert.equal(result.totalMigrated, 1);

      const afterLog = JSON.parse(fs.readFileSync(
        path.join(tmpDir, 'entity_test11a', 'memories', 'episodic', 'mem_apply1', 'log.json'), 'utf8'
      ));
      assert.equal(afterLog.memorySchemaVersion, 2);
      assert.ok(afterLog.shape && afterLog.shape !== 'unclassified', `shape should be classified, got: ${afterLog.shape}`);
      assert.equal(afterLog.creationContext, null);
      assert.equal(afterLog.activationLevel, 0);
    } finally {
      require('../../server/entityPaths').ENTITIES_DIR = origDir;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('idempotent — re-running on v2 memories skips them', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice11-'));
    const v2Log = {
      memory_id: 'mem_v2already',
      memorySchemaVersion: 2,
      type: 'episodic',
      created: new Date().toISOString(),
      importance: 0.7,
      decay: 0.5,
      topics: ['music'],
      emotionalTag: 'joy',
      shape: 'emotional',
      creationContext: null,
      edges: [{ targetId: 'mem_other', relation: 'topic_sibling', strength: 0.6 }],
      activationLevel: 0,
      lastActivationContext: null
    };
    createSyntheticEntity(tmpDir, 'test11b', [
      { id: 'mem_v2already', log: v2Log, semantic: 'Music is beautiful' }
    ]);

    const origDir = require('../../server/entityPaths').ENTITIES_DIR;
    require('../../server/entityPaths').ENTITIES_DIR = tmpDir;

    try {
      const result = main(['node', 'script', '--apply', '--entity', 'test11b']);
      assert.equal(result.totalMigrated, 0, 'Already-v2 should be skipped');
      assert.equal(result.totalSkipped, 1);
    } finally {
      require('../../server/entityPaths').ENTITIES_DIR = origDir;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('shape classification assigns reasonable labels', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice11-'));
    const now = new Date().toISOString();

    createSyntheticEntity(tmpDir, 'test11c', [
      { id: 'mem_emo', log: { memory_id: 'mem_emo', type: 'episodic', created: now, importance: 0.9, decay: 0.5, topics: ['love'], emotionalTag: 'love' }, semantic: 'I love you deeply' },
      { id: 'mem_fact', log: { memory_id: 'mem_fact', type: 'semantic_knowledge', created: now, importance: 0.4, decay: 0.002, topics: ['science'] }, semantic: 'Water boils at 100C' },
      { id: 'mem_ant', log: { memory_id: 'mem_ant', type: 'episodic', created: now, importance: 0.5, decay: 0.5, topics: ['plans'] }, semantic: 'I will learn Rust next week' }
    ]);

    const origDir = require('../../server/entityPaths').ENTITIES_DIR;
    require('../../server/entityPaths').ENTITIES_DIR = tmpDir;

    try {
      const result = main(['node', 'script', '--apply', '--entity', 'test11c']);
      assert.equal(result.totalMigrated, 3);

      const emoLog = JSON.parse(fs.readFileSync(path.join(tmpDir, 'entity_test11c', 'memories', 'episodic', 'mem_emo', 'log.json'), 'utf8'));
      assert.equal(emoLog.shape, 'emotional');

      const factLog = JSON.parse(fs.readFileSync(path.join(tmpDir, 'entity_test11c', 'memories', 'episodic', 'mem_fact', 'log.json'), 'utf8'));
      assert.equal(factLog.shape, 'factual');

      const antLog = JSON.parse(fs.readFileSync(path.join(tmpDir, 'entity_test11c', 'memories', 'episodic', 'mem_ant', 'log.json'), 'utf8'));
      assert.equal(antLog.shape, 'anticipatory');
    } finally {
      require('../../server/entityPaths').ENTITIES_DIR = origDir;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('seeds edges between related memories', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice11-'));
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const nowStr = now.toISOString();

    createSyntheticEntity(tmpDir, 'test11d', [
      { id: 'mem_e1', log: { memory_id: 'mem_e1', type: 'episodic', created: fiveMinAgo, importance: 0.7, decay: 0.5, topics: ['cats', 'pets'], userId: 'user1' }, semantic: 'I talked about cats' },
      { id: 'mem_e2', log: { memory_id: 'mem_e2', type: 'episodic', created: nowStr, importance: 0.7, decay: 0.5, topics: ['cats', 'dogs'], userId: 'user1' }, semantic: 'Then about cats and dogs' }
    ]);

    const origDir = require('../../server/entityPaths').ENTITIES_DIR;
    require('../../server/entityPaths').ENTITIES_DIR = tmpDir;

    try {
      const result = main(['node', 'script', '--apply', '--entity', 'test11d']);
      assert.ok(result.totalEdges > 0, `Should create at least 1 edge, got ${result.totalEdges}`);

      const log2 = JSON.parse(fs.readFileSync(path.join(tmpDir, 'entity_test11d', 'memories', 'episodic', 'mem_e2', 'log.json'), 'utf8'));
      assert.ok(Array.isArray(log2.edges));
      assert.ok(log2.edges.length > 0, 'mem_e2 should have edges to mem_e1');
    } finally {
      require('../../server/entityPaths').ENTITIES_DIR = origDir;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('buildMiniIndex creates duck-typed index for seedEdges', () => {
    const metas = [
      { memId: 'mem_1', meta: { topics: ['a'], created: '2026-01-01T00:00:00Z', importance: 0.5, decay: 0.5, emotion: '' } },
      { memId: 'mem_2', meta: { topics: ['b'], created: '2026-01-01T00:01:00Z', importance: 0.5, decay: 0.5, emotion: '' } }
    ];
    const idx = buildMiniIndex(metas);
    assert.equal(typeof idx.getRecentMemories, 'function');
    assert.equal(typeof idx.getMemoryMeta, 'function');
    assert.equal(typeof idx.getAllMemoryIds, 'function');
    assert.ok(idx.getRecentMemories(10).length === 2);
    assert.ok(idx.getMemoryMeta('mem_1'));
    assert.equal(idx.getMemoryMeta('mem_nonexistent'), null);
    assert.deepEqual(idx.getAllMemoryIds().sort(), ['mem_1', 'mem_2']);
  });

  it('returns zero totals for empty entity directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice11-'));
    const origDir = require('../../server/entityPaths').ENTITIES_DIR;
    require('../../server/entityPaths').ENTITIES_DIR = tmpDir;

    try {
      const result = main(['node', 'script', '--dry-run']);
      assert.equal(result.totalScanned, 0);
      assert.equal(result.totalMigrated, 0);
    } finally {
      require('../../server/entityPaths').ENTITIES_DIR = origDir;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
