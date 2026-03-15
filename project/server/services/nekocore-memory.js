'use strict';

const { createMemoryOperations } = require('./memory-operations');
const { runPostResponseMemoryEncoding } = require('./post-response-memory');

function createNekoCoreMemoryOps({ entityId = 'nekocore', memoryStorage, memoryGraph = null, logTimeline = () => {} } = {}) {
  return createMemoryOperations({
    getCurrentEntityId: () => entityId,
    getMemoryStorage: () => memoryStorage,
    getMemoryGraph: () => memoryGraph,
    logTimeline
  });
}

async function storeNekoConversationSnapshot({ consciousMemory = null, memoryStorage, message, response, topics } = {}) {
  if (consciousMemory) {
    const summary = (response || message || '').slice(0, 300);
    consciousMemory.addToStm({ summary, topics, source: 'conscious_observation' });
    consciousMemory.reinforce(topics);
  }

  if (!memoryStorage) return null;

  const semantic = `[Conversation] ${(message || '').slice(0, 150)} -> ${(response || '').slice(0, 200)}`;
  return memoryStorage.storeMemory({
    semantic,
    content: {
      userMessage: (message || '').slice(0, 500),
      response: (response || '').slice(0, 500)
    },
    topics: Array.isArray(topics) ? topics : [],
    importance: 0.75,
    decay: 0,
    emotion: 'neutral',
    type: 'episodic',
    source: 'nekocore_conversation'
  });
}

async function encodeNekoConversationMemory(params = {}) {
  const entityId = params.memoryEntityId || params.entityId || 'nekocore';
  const memoryStorage = params.memoryStorage;
  const memoryGraph = params.memoryGraph || null;
  const logTimeline = params.logTimeline || (() => {});
  const { createCoreMemory, createSemanticKnowledge } = createNekoCoreMemoryOps({
    entityId,
    memoryStorage,
    memoryGraph,
    logTimeline
  });

  return runPostResponseMemoryEncoding({
    ...params,
    memoryEntityId: entityId,
    createCoreMemory,
    createSemanticKnowledge,
    memoryStorage,
    memoryGraph,
    logTimeline
  });
}

module.exports = {
  createNekoCoreMemoryOps,
  storeNekoConversationSnapshot,
  encodeNekoConversationMemory
};