// ── Services · Nekocore Memory ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./memory-operations,
// ./post-response-memory. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const { createMemoryOperations } = require('./memory-operations');
const { runPostResponseMemoryEncoding } = require('./post-response-memory');
// createNekoCoreMemoryOps()
// WHAT THIS DOES: createNekoCoreMemoryOps creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createNekoCoreMemoryOps(...) before code that depends on this setup.
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
    // summary()
    // Purpose: helper wrapper used by this module's main flow.
    // summary()
    // WHAT THIS DOES: summary is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call summary(...) where this helper behavior is needed.
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