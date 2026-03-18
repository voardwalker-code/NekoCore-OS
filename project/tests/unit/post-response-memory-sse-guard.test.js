const test = require('node:test');
const assert = require('node:assert/strict');

const { runPostResponseMemoryEncoding } = require('../../server/services/post-response-memory');

test('memory encoding does not fail when broadcastSSE is missing', async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));

  let createCoreCalls = 0;

  try {
    await runPostResponseMemoryEncoding({
      effectiveUserMessage: 'remember this detail',
      finalResponse: 'I will remember it.',
      memoryEntityId: 'nekocore',
      memoryAspectConfigs: { subconscious: { type: 'mock' } },
      callLLMWithRuntime: async () => JSON.stringify({
        episodic: {
          semantic: 'The user asked the entity to remember a detail.',
          narrative: 'A memory-worthy reminder was exchanged.',
          emotion: 'focused',
          topics: ['memory'],
          importance: 0.7
        },
        knowledge: ''
      }),
      getTokenLimit: () => 256,
      createCoreMemory: () => {
        createCoreCalls += 1;
        return { ok: true, memId: 'mem-test-1' };
      },
      createSemanticKnowledge: () => ({ ok: false }),
      broadcastSSE: null,
      traceGraph: null,
      memoryGraph: null,
      logTimeline: () => {},
      memoryStorage: null,
      entityName: 'NekoCore',
      userName: 'User'
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(createCoreCalls, 1, 'core memory should still be created without SSE');
  assert.equal(
    warnings.some((w) => w.includes('Memory encoding failed: broadcastSSE is not a function')),
    false,
    'should not emit broadcastSSE type failure warning'
  );
});
