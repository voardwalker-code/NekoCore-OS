'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const entityPaths = require('../../server/entityPaths');
const createMemoryRoutes = require('../../server/routes/memory-routes');
const createCognitiveRoutes = require('../../server/routes/cognitive-routes');

function makeEntityId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

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

function createLegacyMemory2Record(entityId, memId) {
  const memoryDir = path.join(entityPaths.getMemoryRoot(entityId), 'Memory2', memId);
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(path.join(memoryDir, 'semantic.txt'), 'Legacy NekoCore memory visible in visualizer.', 'utf8');
  fs.writeFileSync(path.join(memoryDir, 'log.json'), JSON.stringify({
    memory_id: memId,
    created: '2026-03-16T00:00:00.000Z',
    type: 'episodic',
    topics: ['nekocore', 'visualizer'],
    importance: 0.91,
    decay: 0,
    access_count: 2
  }, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(memoryDir, 'memory.zip'),
    zlib.gzipSync(JSON.stringify({ text: 'Legacy Memory2 payload for visualizer regression coverage.' }))
  );
}

function createJsonResponseCapture() {
  return {
    statusCode: null,
    headers: null,
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(payload) {
      this.body = payload || '';
    }
  };
}

async function dispatchJson(dispatch, pathname, entityId, query = '') {
  const req = {
    method: 'GET',
    on() {}
  };
  const res = createJsonResponseCapture();
  const url = new URL(`http://localhost${pathname}${query}`);
  const ctxApiHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
  await dispatch(req, res, url, ctxApiHeaders, async () => '');
  assert.equal(res.statusCode, 200, `expected 200 response for ${pathname} on ${entityId}`);
  return JSON.parse(res.body);
}

function createMemoryRoutesContext(entityId) {
  return {
    fs,
    path,
    zlib,
    currentEntityId: entityId,
    reconstructionCache: new Map(),
    reconstructionCacheTtlMs: 1000,
    getEntityMemoryRootIfActive: () => entityPaths.getMemoryRoot(entityId),
    hatchEntity: { getEntityStatus: () => ({}) },
    MEM_DIR: path.join(__dirname, '..', '..', 'memories')
  };
}

function createCognitiveRoutesContext(entityId) {
  return {
    fs,
    path,
    currentEntityId: entityId,
    cognitiveBus: { getStats: () => ({}) },
    thoughtStream: { getStats: () => ({}) },
    attentionSystem: { getStats: () => ({}), getCurrentFocus: () => null, getAttentionHistory: () => [] },
    memoryGraph: null,
    curiosityEngine: null,
    boredomEngine: null,
    beliefGraph: null,
    timelineLogger: null
  };
}

test('visualizer memory search and detail include legacy Memory2 records for NekoCore-era data', async () => {
  const entityId = makeEntityId('test_neko_viz_memory2');
  createTestEntity(entityId);
  createLegacyMemory2Record(entityId, 'mem_legacy_neko');

  try {
    const routes = createMemoryRoutes(createMemoryRoutesContext(entityId));
    const searchData = await dispatchJson(routes.dispatch, '/api/memories/search', entityId);
    assert.ok(
      searchData.memories.some((memory) => memory.id === 'mem_legacy_neko'),
      'expected legacy Memory2 memory to appear in /api/memories/search'
    );

    const detailData = await dispatchJson(
      routes.dispatch,
      '/api/memory/detail',
      entityId,
      '?id=mem_legacy_neko'
    );
    assert.equal(detailData.id, 'mem_legacy_neko');
    assert.match(detailData.semantic, /Legacy NekoCore memory visible/);
    assert.match(detailData.content, /Legacy Memory2 payload/);
  } finally {
    removeTestEntity(entityId);
  }
});

test('full mind graph includes legacy Memory2 records so NekoCore nodes render in visualizer', async () => {
  const entityId = makeEntityId('test_neko_viz_graph');
  createTestEntity(entityId);
  createLegacyMemory2Record(entityId, 'mem_legacy_graph');

  try {
    const routes = createCognitiveRoutes(createCognitiveRoutesContext(entityId));
    const data = await dispatchJson(routes.dispatch.bind(routes), '/api/memory-graph/full-mind', entityId);
    assert.ok(
      data.nodes.some((node) => node.id === 'mem_legacy_graph'),
      'expected legacy Memory2 node to appear in /api/memory-graph/full-mind'
    );
  } finally {
    removeTestEntity(entityId);
  }
});

test('nekocore pipeline uses injected runtime storage and object-based snapshot calls', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'server', 'services', 'nekocore-pipeline.js'),
    'utf8'
  );

  assert.match(source, /nekoSystemRuntime/);
  assert.match(source, /const nekoCoreMemStorage = nekoSystemRuntime\.memoryStorage;/);
  assert.doesNotMatch(source, /new MemoryStorage\(\{ entityId: NEKOCORE_ID \}\)/);
  assert.match(
    source,
    /await storeNekoConversationSnapshot\(\{[\s\S]*memoryStorage: nekoCoreMemStorage,[\s\S]*message: userMessage,[\s\S]*response: result\.finalResponse[\s\S]*\}\);/
  );
});