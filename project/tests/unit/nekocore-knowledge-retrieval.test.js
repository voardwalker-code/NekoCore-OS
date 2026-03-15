const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { buildNekoKnowledgeContext } = require('../../server/brain/nekocore/knowledge-retrieval');

function makeTempRoot() {
  const root = path.join(process.cwd(), '.tmp-nekocore-recall-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8));
  fs.mkdirSync(path.join(root, 'episodic'), { recursive: true });
  fs.mkdirSync(path.join(root, 'semantic'), { recursive: true });
  return root;
}

function writeConversationMemory(memRoot, id, created, userMessage, response) {
  const folder = path.join(memRoot, 'episodic', id);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'semantic.txt'), `[Conversation] ${userMessage} -> ${response}`, 'utf8');
  fs.writeFileSync(path.join(folder, 'log.json'), JSON.stringify({
    memory_id: id,
    created,
    type: 'episodic',
    source: 'nekocore_conversation',
    importance: 0.75,
    topics: []
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(folder, 'memory.zip'), zlib.gzipSync(JSON.stringify({ userMessage, response })));
}

test('buildNekoKnowledgeContext includes recent conversation recall with no topical match', () => {
  const memRoot = makeTempRoot();
  try {
    writeConversationMemory(
      memRoot,
      'mem_recent_1',
      new Date('2026-03-15T12:10:00.000Z').toISOString(),
      'Yesterday we discussed model routing bugs.',
      'I explained the orchestrator and recall flow.'
    );

    const ctx = buildNekoKnowledgeContext('the and for it', memRoot, { limit: 6, recentConversationLimit: 4 });

    assert.ok(ctx.contextBlock.includes('[CONVERSATION RECALL]'));
    assert.ok(ctx.contextBlock.includes('Yesterday we discussed model routing bugs.'));
    assert.ok(ctx.connections.some((m) => m.id === 'mem_recent_1'));
  } finally {
    fs.rmSync(memRoot, { recursive: true, force: true });
  }
});

test('buildNekoKnowledgeContext prioritizes newest recent conversations', () => {
  const memRoot = makeTempRoot();
  try {
    writeConversationMemory(
      memRoot,
      'mem_old_1',
      new Date('2026-03-10T08:00:00.000Z').toISOString(),
      'Old memory message',
      'Old response'
    );
    writeConversationMemory(
      memRoot,
      'mem_new_1',
      new Date('2026-03-15T08:00:00.000Z').toISOString(),
      'Newest memory message',
      'Newest response'
    );

    const ctx = buildNekoKnowledgeContext('the and for it', memRoot, { limit: 4, recentConversationLimit: 2 });
    const firstLine = ctx.contextBlock.split('\n').find((line) => line.startsWith('1. ')) || '';

    assert.ok(firstLine.includes('mem_new_1'));
  } finally {
    fs.rmSync(memRoot, { recursive: true, force: true });
  }
});