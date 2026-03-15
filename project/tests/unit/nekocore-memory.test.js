const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const entityPaths = require('../../server/entityPaths');
const MemoryStorage = require('../../server/brain/memory/memory-storage');
const {
  storeNekoConversationSnapshot,
  encodeNekoConversationMemory
} = require('../../server/services/nekocore-memory');

function createTestEntity(entityId) {
  const root = entityPaths.getEntityRoot(entityId);
  fs.mkdirSync(path.join(root, 'index'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memories', 'episodic'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memories', 'semantic'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memories', 'dreams'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memories', 'conscious'), { recursive: true });
  fs.writeFileSync(path.join(root, 'entity.json'), JSON.stringify({ id: entityId, name: entityId }, null, 2), 'utf8');
  return root;
}

function removeTestEntity(entityId) {
  fs.rmSync(entityPaths.getEntityRoot(entityId), { recursive: true, force: true });
}

function makeEntityId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

test('storeNekoConversationSnapshot persists a raw episodic conversation memory', async () => {
  const entityId = makeEntityId('test_neko_snapshot');
  createTestEntity(entityId);

  try {
    const memoryStorage = new MemoryStorage({ entityId });
    const memId = await storeNekoConversationSnapshot({
      memoryStorage,
      message: 'Remember that I like jasmine tea.',
      response: 'I will remember your jasmine tea preference.',
      topics: ['tea', 'preference']
    });

    assert.match(memId, /^mem_/);

    const stored = await memoryStorage.retrieveMemory(memId);
    assert.equal(stored.type, 'episodic');
    assert.equal(stored.decay, 0);
    assert.equal(stored.content.userMessage, 'Remember that I like jasmine tea.');
    assert.equal(stored.content.response, 'I will remember your jasmine tea preference.');
  } finally {
    removeTestEntity(entityId);
  }
});

test('encodeNekoConversationMemory creates core and semantic memory layers for a chat turn', async () => {
  const entityId = makeEntityId('test_neko_layers');
  createTestEntity(entityId);

  try {
    const memoryStorage = new MemoryStorage({ entityId });
    await encodeNekoConversationMemory({
      effectiveUserMessage: 'I like jasmine tea and rainy mornings.',
      finalResponse: 'I will remember that you like jasmine tea and rainy mornings.',
      innerDialog: { subconscious: { memoryContext: { connections: [] } } },
      memoryEntityId: entityId,
      memoryAspectConfigs: {
        subconscious: { type: 'ollama', model: 'test', endpoint: 'http://localhost' },
        background: { type: 'ollama', model: 'test', endpoint: 'http://localhost' }
      },
      callLLMWithRuntime: async () => JSON.stringify({
        episodic: {
          semantic: 'The user shared that they like jasmine tea and rainy mornings.',
          narrative: 'During the conversation, the user mentioned a preference for jasmine tea and rainy mornings.',
          emotion: 'warm',
          topics: ['tea', 'rain', 'preference'],
          importance: 0.72
        },
        knowledge: 'The user likes jasmine tea and rainy mornings.'
      }),
      getTokenLimit: () => 1200,
      broadcastSSE: () => {},
      traceGraph: null,
      memoryGraph: null,
      logTimeline: () => {},
      memoryStorage,
      entityName: 'NekoCore',
      userName: 'User',
      activeUserId: 'user_test',
      entityPersona: {}
    });

    const episodicDir = entityPaths.getEpisodicMemoryPath(entityId);
    const semanticDir = entityPaths.getSemanticMemoryPath(entityId);

    const episodicLogs = fs.readdirSync(episodicDir)
      .filter((name) => name.startsWith('mem_'))
      .map((name) => JSON.parse(fs.readFileSync(path.join(episodicDir, name, 'log.json'), 'utf8')));
    const semanticLogs = fs.readdirSync(semanticDir)
      .filter((name) => name.startsWith('sem_'))
      .map((name) => JSON.parse(fs.readFileSync(path.join(semanticDir, name, 'log.json'), 'utf8')));

    assert.ok(episodicLogs.some((log) => log.type === 'core_memory'), 'expected a core_memory log');
    assert.ok(semanticLogs.some((log) => log.type === 'semantic_knowledge'), 'expected a semantic_knowledge log');
  } finally {
    removeTestEntity(entityId);
  }
});

test('MemoryStorage prunes stale index entries when a memory folder is missing', async () => {
  const entityId = makeEntityId('test_neko_stale');
  createTestEntity(entityId);

  try {
    const memoryStorage = new MemoryStorage({ entityId });
    const staleId = 'mem_missing_entry';
    memoryStorage.indexCache.addMemory(staleId, {
      created: new Date().toISOString(),
      importance: 0.5,
      decay: 1,
      topics: ['stale'],
      type: 'episodic'
    });
    memoryStorage.indexCache.save();

    const missing = await memoryStorage.retrieveMemory(staleId);
    assert.equal(missing, null);
    assert.equal(memoryStorage.indexCache.getMemoryMeta(staleId), null);

    const list = await memoryStorage.listMemories(10, 0);
    assert.ok(!list.some((entry) => entry.id === staleId));
  } finally {
    removeTestEntity(entityId);
  }
});