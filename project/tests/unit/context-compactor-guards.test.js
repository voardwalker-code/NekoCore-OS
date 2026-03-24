'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  compactConversation,
  estimateTokens,
  DEFAULT_PRESERVE_LAST_N,
  DEFAULT_THRESHOLD_RATIO
} = require('../../server/services/context-compactor');

// ---------- estimateTokens ----------
describe('estimateTokens', () => {
  it('returns 0 for empty array', () => {
    assert.equal(estimateTokens([]), 0);
  });

  it('estimates tokens from message content', () => {
    const msgs = [{ role: 'user', content: 'Hello world' }]; // 11 chars → ceil(11/4)=3
    assert.equal(estimateTokens(msgs), 3);
  });

  it('handles missing content gracefully', () => {
    assert.equal(estimateTokens([{ role: 'user' }]), 0);
  });

  it('sums across multiple messages', () => {
    const msgs = [
      { role: 'user', content: 'abcd' },     // 4 chars → 1
      { role: 'assistant', content: 'efghij' } // 6 chars → ceil(10/4) = 3 total
    ];
    assert.equal(estimateTokens(msgs), 3);
  });
});

// ---------- compactConversation — no compaction needed ----------
describe('compactConversation — no-op cases', () => {
  const mockCallLLM = async () => 'should not be called';

  it('returns unchanged messages when under threshold', async () => {
    const messages = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' }
    ];
    const result = await compactConversation(mockCallLLM, { type: 'openrouter' }, messages, {
      threshold: 999999
    });
    assert.equal(result.compacted, false);
    assert.deepEqual(result.messages, messages);
  });

  it('returns empty array for null messages', async () => {
    const result = await compactConversation(mockCallLLM, { type: 'openrouter' }, null);
    assert.equal(result.compacted, false);
    assert.deepEqual(result.messages, []);
  });

  it('returns unchanged for missing callLLM', async () => {
    const msgs = [{ role: 'user', content: 'x' }];
    const result = await compactConversation(null, {}, msgs);
    assert.equal(result.compacted, false);
  });

  it('returns unchanged for missing runtime', async () => {
    const msgs = [{ role: 'user', content: 'x' }];
    const result = await compactConversation(mockCallLLM, null, msgs);
    assert.equal(result.compacted, false);
  });

  it('skips compaction when all messages are within preserveLastN', async () => {
    const messages = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
      { role: 'assistant', content: 'd' }
    ];
    const result = await compactConversation(mockCallLLM, { type: 'openrouter' }, messages, {
      threshold: 1,   // force under-token check to pass
      preserveLastN: 10 // keep all
    });
    assert.equal(result.compacted, false);
  });
});

// ---------- compactConversation — compaction triggers ----------
describe('compactConversation — compaction triggers', () => {
  function makeLongConvo(turnCount) {
    const msgs = [{ role: 'system', content: 'You are an AI.' }];
    for (let i = 0; i < turnCount; i++) {
      msgs.push({ role: 'user', content: 'A'.repeat(200) });
      msgs.push({ role: 'assistant', content: 'B'.repeat(200) });
    }
    return msgs;
  }

  it('compacts when over threshold and returns summary message', async () => {
    const messages = makeLongConvo(20); // ~40 conversation msgs, lots of tokens
    const mockLLM = async (_rt, _msgs, _opts) => 'Summary of earlier discussion.';

    const result = await compactConversation(mockLLM, { type: 'openrouter' }, messages, {
      threshold: 100, // low threshold to trigger
      preserveLastN: 6
    });

    assert.equal(result.compacted, true);
    assert.ok(result.summary.includes('Summary of earlier discussion'));
    // Should have: system(1) + summary(1) + recent(6) = 8
    assert.equal(result.messages.length, 8);
    assert.equal(result.messages[0].role, 'system');
    assert.equal(result.messages[0].content, 'You are an AI.');
    assert.equal(result.messages[1].role, 'system');
    assert.ok(result.messages[1].content.includes('[Conversation summary'));
  });

  it('preserves custom preserveLastN count', async () => {
    const messages = makeLongConvo(20);
    const mockLLM = async () => 'Summarized.';

    const result = await compactConversation(mockLLM, { type: 'anthropic' }, messages, {
      threshold: 100,
      preserveLastN: 4
    });

    assert.equal(result.compacted, true);
    // system(1) + summary(1) + recent(4) = 6
    assert.equal(result.messages.length, 6);
  });

  it('preserves all system messages at the front', async () => {
    const messages = [
      { role: 'system', content: 'System prompt 1' },
      { role: 'system', content: 'System prompt 2' },
      ...Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'X'.repeat(200)
      }))
    ];
    const mockLLM = async () => 'Compacted.';

    const result = await compactConversation(mockLLM, { type: 'openrouter' }, messages, {
      threshold: 50,
      preserveLastN: 4
    });

    assert.equal(result.compacted, true);
    assert.equal(result.messages[0].content, 'System prompt 1');
    assert.equal(result.messages[1].content, 'System prompt 2');
    assert.equal(result.messages[2].role, 'system'); // summary
    assert.ok(result.messages[2].content.includes('[Conversation summary'));
  });

  it('passes low temperature and maxTokens to the LLM call', async () => {
    const messages = makeLongConvo(20);
    let capturedOpts;
    const mockLLM = async (_rt, _msgs, opts) => {
      capturedOpts = opts;
      return 'Sum.';
    };

    await compactConversation(mockLLM, { type: 'openrouter' }, messages, {
      threshold: 100,
      preserveLastN: 6
    });

    assert.equal(capturedOpts.temperature, 0.2);
    assert.equal(capturedOpts.maxTokens, 800);
  });

  it('includes entity context in summarization prompt', async () => {
    const messages = makeLongConvo(20);
    let capturedPrompt;
    const mockLLM = async (_rt, msgs) => {
      capturedPrompt = msgs;
      return 'Entity summary.';
    };

    await compactConversation(mockLLM, { type: 'anthropic' }, messages, {
      threshold: 100,
      entityName: 'Neko',
      entityTraits: 'curious, playful'
    });

    const userPrompt = capturedPrompt.find(m => m.role === 'user');
    assert.ok(userPrompt.content.includes('Neko'));
    assert.ok(userPrompt.content.includes('curious, playful'));
  });

  it('handles object result from LLM with .content', async () => {
    const messages = makeLongConvo(20);
    const mockLLM = async () => ({ content: 'Object summary.' });

    const result = await compactConversation(mockLLM, { type: 'anthropic' }, messages, {
      threshold: 100
    });

    assert.equal(result.compacted, true);
    assert.equal(result.summary, 'Object summary.');
  });
});

// ---------- compactConversation — failure cases ----------
describe('compactConversation — LLM failure resilience', () => {
  function makeLongConvo(turnCount) {
    const msgs = [];
    for (let i = 0; i < turnCount; i++) {
      msgs.push({ role: 'user', content: 'A'.repeat(200) });
      msgs.push({ role: 'assistant', content: 'B'.repeat(200) });
    }
    return msgs;
  }

  it('returns uncompacted when LLM throws', async () => {
    const messages = makeLongConvo(20);
    const failLLM = async () => { throw new Error('API timeout'); };

    const result = await compactConversation(failLLM, { type: 'openrouter' }, messages, {
      threshold: 100
    });

    assert.equal(result.compacted, false);
    assert.deepEqual(result.messages, messages);
  });

  it('returns uncompacted when LLM returns empty string', async () => {
    const messages = makeLongConvo(20);
    const emptyLLM = async () => '';

    const result = await compactConversation(emptyLLM, { type: 'openrouter' }, messages, {
      threshold: 100
    });

    assert.equal(result.compacted, false);
  });

  it('returns uncompacted when LLM returns null', async () => {
    const messages = makeLongConvo(20);
    const nullLLM = async () => null;

    const result = await compactConversation(nullLLM, { type: 'openrouter' }, messages, {
      threshold: 100
    });

    assert.equal(result.compacted, false);
  });
});

// ---------- defaults ----------
describe('constants', () => {
  it('DEFAULT_PRESERVE_LAST_N is 6', () => {
    assert.equal(DEFAULT_PRESERVE_LAST_N, 6);
  });

  it('DEFAULT_THRESHOLD_RATIO is 0.6', () => {
    assert.equal(DEFAULT_THRESHOLD_RATIO, 0.6);
  });
});

// ---------- threshold calculation ----------
describe('compactConversation — threshold calculation', () => {
  it('uses contextWindow * 0.6 as default threshold', async () => {
    // 10 messages of 100 chars each → ~250 tokens total
    // contextWindow=400 → threshold=240 → 250 > 240 → should compact
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'X'.repeat(100)
    }));
    const mockLLM = async () => 'Summarized.';

    const result = await compactConversation(mockLLM, { type: 'openrouter' }, messages, {
      contextWindow: 400,
      preserveLastN: 4
    });

    assert.equal(result.compacted, true);
  });

  it('does not compact when tokens are under contextWindow * 0.6', async () => {
    const messages = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' }
    ];
    const mockLLM = async () => { throw new Error('should not be called'); };

    const result = await compactConversation(mockLLM, { type: 'openrouter' }, messages, {
      contextWindow: 100000
    });

    assert.equal(result.compacted, false);
  });
});
