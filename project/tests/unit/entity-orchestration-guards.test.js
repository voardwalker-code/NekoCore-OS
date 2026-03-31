// ── Tests · Entity Orchestration Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, path, fs,
// ../../server/brain/tasks/entity-network-registry. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Entity Orchestration Guard Tests (E-0 through E-6)
// Locks existing behavior of entity network registry, entity chat
// manager, planning session contract, task pipeline bridge planning
// branch, entity-manager loadEntity shape, and entity worker invoker.
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// ── Section 1: Entity Network Registry — config load + API ──

test('entity-network.json exists and is valid JSON', () => {
  const configPath = path.join(__dirname, '../../server/config/entity-network.json');
  assert.ok(fs.existsSync(configPath), 'entity-network.json must exist');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw);
  assert.ok(config.entities, 'config must have entities array');
  assert.ok(Array.isArray(config.entities), 'entities must be an array');
  assert.ok(config.entities.length >= 3, 'seed config must have at least 3 entities');
});

test('entity-network.json entities have required fields', () => {
  const configPath = path.join(__dirname, '../../server/config/entity-network.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  for (const ent of config.entities) {
    assert.ok(ent.id, `entity must have id: ${JSON.stringify(ent)}`);
    assert.ok(ent.name, `entity must have name: ${ent.id}`);
    assert.ok(ent.host, `entity must have host: ${ent.id}`);
    assert.ok(typeof ent.port === 'number', `entity must have numeric port: ${ent.id}`);
    assert.ok(Array.isArray(ent.capabilities), `entity must have capabilities array: ${ent.id}`);
    assert.ok(ent.capabilities.length > 0, `entity must have at least one capability: ${ent.id}`);
  }
});

test('EntityNetworkRegistry loads seed entities', () => {
  // Re-require to trigger load
  delete require.cache[require.resolve('../../server/brain/tasks/entity-network-registry')];
  const registry = require('../../server/brain/tasks/entity-network-registry');
  const all = registry.listEntities();
  assert.ok(all.length >= 3, `registry should have at least 3 entities, got ${all.length}`);
});

test('EntityNetworkRegistry getEntity returns entity by id', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');
  const ent = registry.getEntity('entity_research');
  assert.ok(ent, 'entity_research must exist in registry');
  assert.equal(ent.id, 'entity_research');
  assert.equal(ent.name, 'Research');
});

test('EntityNetworkRegistry getEntity returns null for unknown id', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');
  assert.equal(registry.getEntity('nonexistent_entity'), null);
  assert.equal(registry.getEntity(''), null);
  assert.equal(registry.getEntity(null), null);
});

test('EntityNetworkRegistry findByCapability filters correctly', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');

  const webSearchEntities = registry.findByCapability('web_search');
  assert.ok(webSearchEntities.length > 0, 'should find at least one entity with web_search');
  for (const e of webSearchEntities) {
    assert.ok(e.capabilities.includes('web_search'), `${e.id} must have web_search capability`);
  }

  const analysisEntities = registry.findByCapability('data_analysis');
  assert.ok(analysisEntities.length > 0, 'should find at least one entity with data_analysis');

  const noMatch = registry.findByCapability('quantum_computing');
  assert.equal(noMatch.length, 0, 'should return empty array for unmatched capability');
});

test('EntityNetworkRegistry findByCapability handles empty/null input', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');
  assert.deepEqual(registry.findByCapability(''), []);
  assert.deepEqual(registry.findByCapability(null), []);
});

test('EntityNetworkRegistry requestEntityUrl constructs valid URLs', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');
  const url = registry.requestEntityUrl('entity_research', '/api/chat');
  assert.ok(url, 'URL must not be null');
  assert.ok(url.startsWith('http://'), 'URL must start with http://');
  assert.ok(url.endsWith('/api/chat'), 'URL must end with the path');
});

test('EntityNetworkRegistry requestEntityUrl returns null for unknown entity', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');
  assert.equal(registry.requestEntityUrl('nonexistent', '/api/chat'), null);
});

// ── Section 2: Entity Chat Manager — CRUD lifecycle ──

test('EntityChatManager createSession returns valid session', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({
    sessionType: 'planning',
    prompt: 'Test planning session',
    entityIds: ['entity_a', 'entity_b']
  });
  assert.ok(session.id, 'session must have an id');
  assert.equal(session.sessionType, 'planning');
  assert.equal(session.prompt, 'Test planning session');
  assert.deepEqual(session.entityIds, ['entity_a', 'entity_b']);
  assert.equal(session.status, 'active');
  assert.ok(Array.isArray(session.messages));
  assert.ok(Array.isArray(session.artifacts));
  assert.equal(session.messages.length, 0);
});

test('EntityChatManager getSession retrieves session by id', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ prompt: 'get test' });
  const retrieved = manager.getSession(session.id);
  assert.ok(retrieved);
  assert.equal(retrieved.id, session.id);
});

test('EntityChatManager getSession returns null for unknown id', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  assert.equal(manager.getSession('nonexistent_session_id'), null);
});

test('EntityChatManager addEntity adds entity to active session', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ entityIds: ['entity_a'] });
  const updated = manager.addEntity(session.id, 'entity_b');
  assert.ok(updated);
  assert.ok(updated.entityIds.includes('entity_b'));
  assert.ok(updated.entityIds.includes('entity_a'));
});

test('EntityChatManager addEntity rejects add to closed session', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ entityIds: ['entity_a'] });
  manager.closeSession(session.id);
  const result = manager.addEntity(session.id, 'entity_c');
  assert.equal(result, null);
});

test('EntityChatManager removeEntity removes entity from active session', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ entityIds: ['entity_a', 'entity_b'] });
  const updated = manager.removeEntity(session.id, 'entity_a');
  assert.ok(updated);
  assert.ok(!updated.entityIds.includes('entity_a'));
  assert.ok(updated.entityIds.includes('entity_b'));
});

test('EntityChatManager routeMessage stores message in session', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ prompt: 'msg test' });
  const msg = manager.routeMessage(session.id, { content: 'Hello world', from: 'entity_a' });
  assert.ok(msg);
  assert.equal(msg.content, 'Hello world');
  assert.equal(msg.from, 'entity_a');
  assert.ok(msg.timestamp > 0);
  const s = manager.getSession(session.id);
  assert.equal(s.messages.length, 1);
  assert.equal(s.messages[0].content, 'Hello world');
});

test('EntityChatManager routeMessage rejects message to closed session', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({});
  manager.closeSession(session.id);
  const result = manager.routeMessage(session.id, { content: 'too late', from: 'entity_a' });
  assert.equal(result, null);
});

test('EntityChatManager closeSession sets status to closed', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ prompt: 'close test' });
  const closed = manager.closeSession(session.id);
  assert.ok(closed);
  assert.equal(closed.status, 'closed');
  assert.ok(closed.closedAt > 0);
});

test('EntityChatManager closeSession with artifact stores artifact', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ prompt: 'artifact test' });
  const artifact = { type: 'plan', content: 'Final plan document' };
  const closed = manager.closeSession(session.id, artifact);
  assert.ok(closed);
  assert.equal(closed.artifacts.length, 1);
  assert.equal(closed.artifacts[0].type, 'plan');
  assert.equal(closed.artifacts[0].content, 'Final plan document');
});

test('EntityChatManager deduplicates entityIds on create', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ entityIds: ['a', 'b', 'a', 'b', 'c'] });
  assert.equal(session.entityIds.length, 3);
});

// ── Section 3: Planning Session Contract — validation ──

test('planning-session-contract.js exists', () => {
  const contractPath = path.join(__dirname, '../../server/contracts/planning-session-contract.js');
  assert.ok(fs.existsSync(contractPath));
});

test('validatePlanningSession accepts valid session', () => {
  const { validatePlanningSession } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningSession({
    id: 'echat_123',
    sessionType: 'planning',
    prompt: 'Plan a research methodology',
    entityIds: ['entity_a', 'entity_b'],
    messages: [],
    status: 'active'
  });
  assert.ok(result.ok, `should be ok, errors: ${result.errors.join(', ')}`);
});

test('validatePlanningSession rejects non-object', () => {
  const { validatePlanningSession } = require('../../server/contracts/planning-session-contract');
  assert.equal(validatePlanningSession(null).ok, false);
  assert.equal(validatePlanningSession('string').ok, false);
  assert.equal(validatePlanningSession(42).ok, false);
});

test('validatePlanningSession catches missing fields', () => {
  const { validatePlanningSession } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningSession({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test('validatePlanningSession catches invalid status', () => {
  const { validatePlanningSession } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningSession({
    id: 'x', sessionType: 'planning', prompt: '', entityIds: [], messages: [], status: 'bogus'
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('status')));
});

test('validatePlanningRound accepts valid round', () => {
  const { validatePlanningRound } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningRound({
    roundIndex: 0,
    responses: [
      { entityId: 'entity_a', content: 'My contribution' },
      { entityId: 'entity_b', content: 'My analysis' }
    ]
  });
  assert.ok(result.ok, `should be ok, errors: ${result.errors.join(', ')}`);
});

test('validatePlanningRound rejects negative roundIndex', () => {
  const { validatePlanningRound } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningRound({ roundIndex: -1, responses: [] });
  assert.equal(result.ok, false);
});

test('validatePlanningRound rejects response without entityId', () => {
  const { validatePlanningRound } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningRound({
    roundIndex: 0,
    responses: [{ content: 'no entity id' }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('entityId')));
});

test('validateParticipant accepts valid participant', () => {
  const { validateParticipant } = require('../../server/contracts/planning-session-contract');
  const result = validateParticipant({
    entityId: 'entity_research',
    name: 'Research',
    capabilities: ['web_search'],
    role: 'researcher'
  });
  assert.ok(result.ok, `should be ok, errors: ${result.errors.join(', ')}`);
});

test('validateParticipant rejects missing role', () => {
  const { validateParticipant } = require('../../server/contracts/planning-session-contract');
  const result = validateParticipant({
    entityId: 'x', name: 'X', capabilities: []
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('role')));
});

test('validatePlanningArtifacts accepts valid artifacts', () => {
  const { validatePlanningArtifacts } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningArtifacts({
    finalPlan: 'The plan is to do X then Y.',
    decisionRationale: 'We chose X because...',
    issuesFlagged: ['Risk A', 'Risk B']
  });
  assert.ok(result.ok, `should be ok, errors: ${result.errors.join(', ')}`);
});

test('validatePlanningArtifacts rejects empty finalPlan', () => {
  const { validatePlanningArtifacts } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningArtifacts({
    finalPlan: '',
    decisionRationale: '',
    issuesFlagged: []
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('finalPlan')));
});

test('validatePlanningArtifacts rejects non-array issuesFlagged', () => {
  const { validatePlanningArtifacts } = require('../../server/contracts/planning-session-contract');
  const result = validatePlanningArtifacts({
    finalPlan: 'Plan',
    decisionRationale: 'Because',
    issuesFlagged: 'not an array'
  });
  assert.equal(result.ok, false);
});

test('PLANNING_LIMITS has correct caps', () => {
  const { PLANNING_LIMITS } = require('../../server/contracts/planning-session-contract');
  assert.equal(PLANNING_LIMITS.MAX_ROUNDS, 3);
  assert.equal(PLANNING_LIMITS.MAX_ENTITIES_PER_SESSION, 4);
  assert.equal(PLANNING_LIMITS.MAX_RESPONSE_TOKENS, 800);
  assert.equal(PLANNING_LIMITS.ENTITY_TIMEOUT_MS, 120000);
});

// ── Section 4: Task Pipeline Bridge — planning branch behavior lock ──

test('planning intent with entities creates planning session', async () => {
  const { createTaskPipelineBridge } = require('../../server/brain/tasks/task-pipeline-bridge');

  const frontman = {
    getActiveSession: () => null,
    startSession: (meta) => meta,
    handleMidTaskUserMessage: async () => ({ handled: false })
  };

  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'task', taskType: 'planning', confidence: 0.92 })
  });

  const result = await bridge.detectAndDispatchTask(
    'Plan a research methodology for studying sleep patterns',
    { id: 'entity_neko', name: 'NekoCore' },
    {}
  );

  assert.ok(result.handled, 'planning task should be handled');
  assert.equal(result.mode, 'planning');
  assert.ok(result.planningSessionId, 'should have planningSessionId');
  assert.ok(result.response, 'should have a response message');
});

test('planning branch creates task session and dispatches orchestrator', async () => {
  const { createTaskPipelineBridge } = require('../../server/brain/tasks/task-pipeline-bridge');
  const taskSessionStore = require('../../server/brain/tasks/task-session');

  const frontman = {
    getActiveSession: () => null,
    startSession: (meta) => meta,
    handleMidTaskUserMessage: async () => ({ handled: false })
  };

  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => 'ok',
    frontman,
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'task', taskType: 'planning', confidence: 0.95 })
  });

  const result = await bridge.detectAndDispatchTask(
    'Research and analyze the evidence for sleep pattern effects',
    { id: 'entity_neko', name: 'NekoCore' },
    {}
  );

  assert.ok(result.handled);
  assert.equal(result.mode, 'planning');
  assert.ok(result.planningSessionId, 'should have planningSessionId (task session)');
  // The planning branch now creates a task session and fires runPlanningSession async
  const tsession = taskSessionStore.getSession(result.planningSessionId);
  assert.ok(tsession, 'task session should exist in task session store');
  assert.equal(tsession.taskType, 'planning');
});

// ── Section 5: Task Module Registry — planning module exists ──

test('task module registry has planning module', () => {
  const registry = require('../../server/brain/tasks/task-module-registry');
  const planning = registry.getModule('planning');
  assert.ok(planning, 'planning module must be registered');
  assert.equal(planning.taskType, 'planning');
  assert.ok(planning.systemPromptKey, 'planning module must have systemPromptKey');
});

test('TASK_TYPES includes PLANNING', () => {
  const { TASK_TYPES } = require('../../server/brain/tasks/task-types');
  assert.equal(TASK_TYPES.PLANNING, 'planning');
});

// ── Section 6: Security guards ──

test('entity network registry rejects entity without required fields', () => {
  const registry = require('../../server/brain/tasks/entity-network-registry');
  assert.throws(() => registry.registerEntity({}), /Entity must have id, host, and port/);
  assert.throws(() => registry.registerEntity({ id: 'x' }), /Entity must have id, host, and port/);
  assert.throws(() => registry.registerEntity(null), /Entity must have id, host, and port/);
});

test('entity chat manager sanitizes message content to string', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({});
  const msg = manager.routeMessage(session.id, { content: 12345, from: null });
  assert.equal(typeof msg.content, 'string');
  assert.equal(typeof msg.from, 'string');
});

test('entity chat manager filters falsy entityIds on create', () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ entityIds: ['a', null, '', undefined, 'b'] });
  assert.deepEqual(session.entityIds, ['a', 'b']);
});

// ── Section 7: Entity Worker Invoker (E-1) ──

test('entity-worker-invoker.js exports required functions', () => {
  const invoker = require('../../server/brain/tasks/entity-worker-invoker');
  assert.equal(typeof invoker.invokeEntityWorker, 'function');
  assert.equal(typeof invoker.loadEntityProfile, 'function');
  assert.equal(typeof invoker.buildEntityWorkerPrompt, 'function');
});

test('loadEntityProfile returns fallback for nonexistent entity', () => {
  const { loadEntityProfile } = require('../../server/brain/tasks/entity-worker-invoker');
  const profile = loadEntityProfile('nonexistent_test_entity_xyz', {
    name: 'Test Specialist',
    traits: ['analytical'],
    capabilities: ['data_analysis']
  });
  assert.equal(profile.name, 'Test Specialist');
  assert.deepEqual(profile.traits, ['analytical']);
  assert.deepEqual(profile.capabilities, ['data_analysis']);
  assert.equal(profile.persona, null);
});

test('loadEntityProfile uses entityId as name fallback', () => {
  const { loadEntityProfile } = require('../../server/brain/tasks/entity-worker-invoker');
  const profile = loadEntityProfile('entity_unknown_xyz');
  assert.equal(profile.name, 'entity_unknown_xyz');
  assert.equal(profile.id, 'entity_unknown_xyz');
});

test('buildEntityWorkerPrompt includes entity name and capabilities', () => {
  const { buildEntityWorkerPrompt } = require('../../server/brain/tasks/entity-worker-invoker');
  const prompt = buildEntityWorkerPrompt({
    name: 'Research',
    traits: ['thorough', 'methodical'],
    capabilities: ['web_search', 'source_synthesis'],
    persona: { mood: 'curious', llmStyle: 'detailed' }
  }, 'Design a research methodology');
  assert.ok(prompt.includes('Research'), 'prompt must include entity name');
  assert.ok(prompt.includes('web_search'), 'prompt must include capabilities');
  assert.ok(prompt.includes('thorough'), 'prompt must include traits');
  assert.ok(prompt.includes('Design a research methodology'), 'prompt must include session question');
});

test('buildEntityWorkerPrompt uses defaults for missing fields', () => {
  const { buildEntityWorkerPrompt } = require('../../server/brain/tasks/entity-worker-invoker');
  const prompt = buildEntityWorkerPrompt({}, 'Test question');
  assert.ok(prompt.includes('Specialist'), 'should default to Specialist');
  assert.ok(prompt.includes('analytical'), 'should default to analytical trait');
});

test('invokeEntityWorker calls LLM and returns response', async () => {
  const { invokeEntityWorker } = require('../../server/brain/tasks/entity-worker-invoker');
  const mockResponse = 'I recommend a mixed-methods approach combining surveys and interviews.';
  // callLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // callLLM()
  // WHAT THIS DOES: callLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call callLLM(...) where this helper behavior is needed.
  const callLLM = async (_runtime, messages, _opts) => {
    assert.ok(messages.length >= 1, 'should have at least system message');
    assert.equal(messages[0].role, 'system');
    return mockResponse;
  };

  const result = await invokeEntityWorker('entity_test', [], {
    callLLM,
    sessionPrompt: 'Design a research methodology',
    entityFallback: { name: 'Research', capabilities: ['web_search'] }
  });

  assert.equal(result.entityId, 'entity_test');
  assert.equal(result.name, 'Research');
  assert.equal(result.content, mockResponse);
});

test('invokeEntityWorker includes chat history in messages', async () => {
  const { invokeEntityWorker } = require('../../server/brain/tasks/entity-worker-invoker');
  let capturedMessages;
  // callLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // callLLM()
  // WHAT THIS DOES: callLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call callLLM(...) where this helper behavior is needed.
  const callLLM = async (_r, messages) => {
    capturedMessages = messages;
    return 'response';
  };

  const history = [
    { role: 'user', content: '[entity_a]: I think we should start with surveys.' },
    { role: 'user', content: '[entity_b]: I disagree, interviews are better.' }
  ];

  await invokeEntityWorker('entity_c', history, {
    callLLM,
    sessionPrompt: 'Plan research',
    entityFallback: { name: 'Synthesis' }
  });

  assert.equal(capturedMessages.length, 3, 'system + 2 history messages');
  assert.equal(capturedMessages[0].role, 'system');
  assert.ok(capturedMessages[1].content.includes('surveys'));
  assert.ok(capturedMessages[2].content.includes('interviews'));
});

test('invokeEntityWorker handles LLM failure gracefully', async () => {
  const { invokeEntityWorker } = require('../../server/brain/tasks/entity-worker-invoker');
  // callLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // callLLM()
  // WHAT THIS DOES: callLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call callLLM(...) where this helper behavior is needed.
  const callLLM = async () => { throw new Error('LLM timeout'); };

  const result = await invokeEntityWorker('entity_fail', [], {
    callLLM,
    entityFallback: { name: 'FailBot' }
  });

  assert.equal(result.entityId, 'entity_fail');
  assert.ok(result.content.includes('FailBot'), 'fallback must mention entity name');
  assert.ok(result.content.includes('could not contribute'), 'fallback must indicate failure');
});

test('invokeEntityWorker rejects missing callLLM', async () => {
  const { invokeEntityWorker } = require('../../server/brain/tasks/entity-worker-invoker');
  await assert.rejects(
    () => invokeEntityWorker('entity_x', [], {}),
    /callLLM must be a function/
  );
});

test('invokeEntityWorker rejects empty entityId', async () => {
  const { invokeEntityWorker } = require('../../server/brain/tasks/entity-worker-invoker');
  await assert.rejects(
    () => invokeEntityWorker('', [], { callLLM: async () => 'ok' }),
    /entityId must be a non-empty string/
  );
});

// ── Section 8: EntityChatManager.invokeEntity integration (E-1) ──

test('EntityChatManager invokeEntity calls LLM and stores response', async () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({
    prompt: 'Plan a research methodology',
    entityIds: ['entity_test_inv']
  });

  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async () => 'My analysis suggests a qualitative approach.';
  const msg = await manager.invokeEntity(session.id, 'entity_test_inv', {
    callLLM: mockLLM,
    entityFallback: { name: 'Analyst', capabilities: ['data_analysis'] }
  });

  assert.ok(msg, 'should return a message');
  assert.equal(msg.from, 'entity_test_inv');
  assert.ok(msg.content.includes('qualitative approach'));

  const s = manager.getSession(session.id);
  assert.ok(s.messages.some(m => m.from === 'entity_test_inv'));
});

test('EntityChatManager invokeEntity returns null for closed session', async () => {
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.createSession({ prompt: 'closed test' });
  manager.closeSession(session.id);

  const result = await manager.invokeEntity(session.id, 'entity_x', {
    callLLM: async () => 'should not run'
  });
  assert.equal(result, null);
});

// ── Section 9: Entity Spawning — spawnWorkerEntity / isWorkerEntity / cleanupWorkerEntity (E-2) ──

const EntityManager = require('../../server/brain/utils/entity-manager');

// Track spawned worker ids for cleanup after tests
const spawnedWorkerIds = [];

test('spawnWorkerEntity creates entity directory with entity.json and persona.json', () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity({ specialty: 'Research', traits: ['curious', 'thorough'] });
  spawnedWorkerIds.push(result.id);

  assert.ok(result.id.startsWith('worker_'), 'worker id must start with worker_');
  assert.equal(result.name, 'Worker: Research');
  assert.deepStrictEqual(result.traits, ['curious', 'thorough']);
  assert.ok(fs.existsSync(result.entityPath), 'entity directory must exist');
  assert.ok(fs.existsSync(path.join(result.entityPath, 'entity.json')), 'entity.json must exist');
  assert.ok(fs.existsSync(path.join(result.entityPath, 'memories', 'persona.json')), 'persona.json must exist');
});

test('spawnWorkerEntity entity.json has correct shape', () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity({ specialty: 'Analysis', taskType: 'CODE' });
  spawnedWorkerIds.push(result.id);

  const entityJson = JSON.parse(fs.readFileSync(path.join(result.entityPath, 'entity.json'), 'utf-8'));
  assert.equal(entityJson.id, result.id);
  assert.equal(entityJson.name, 'Worker: Analysis');
  assert.equal(entityJson.creation_mode, 'worker');
  assert.equal(entityJson.taskType, 'CODE');
  assert.ok(entityJson.created, 'must have created timestamp');
  assert.ok(Array.isArray(entityJson.personality_traits));
});

test('spawnWorkerEntity persona.json has correct shape', () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity({ specialty: 'Writing', llmStyle: 'verbose' });
  spawnedWorkerIds.push(result.id);

  const persona = JSON.parse(fs.readFileSync(path.join(result.entityPath, 'memories', 'persona.json'), 'utf-8'));
  assert.equal(persona.mood, 'neutral');
  assert.equal(persona.tone, 'professional');
  assert.equal(persona.llmStyle, 'verbose');
  assert.ok(persona.llmPersonality.includes('Writing'));
});

test('spawnWorkerEntity rejects reserved names', () => {
  const mgr = new EntityManager();
  for (const reserved of ['NekoCore', 'neko', 'Echo', 'AgentEcho']) {
    assert.throws(
      () => mgr.spawnWorkerEntity({ specialty: reserved }),
      /Cannot spawn worker with reserved name/,
      `should reject reserved name: ${reserved}`
    );
  }
});

test('spawnWorkerEntity uses defaults when config is empty', () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity();
  spawnedWorkerIds.push(result.id);

  assert.equal(result.name, 'Worker: General');
  assert.deepStrictEqual(result.traits, ['focused', 'efficient']);
});

test('isWorkerEntity returns true for spawned workers', () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity({ specialty: 'Detect' });
  spawnedWorkerIds.push(result.id);
  assert.equal(mgr.isWorkerEntity(result.id), true);
});

test('isWorkerEntity returns false for non-existent entity', () => {
  const mgr = new EntityManager();
  assert.equal(mgr.isWorkerEntity('entity_nonexistent_999'), false);
});

test('isWorkerEntity returns false for regular entities', () => {
  const mgr = new EntityManager();
  // Use the known test entity nekocore if it exists, otherwise skip
  const entitiesDir = path.join(__dirname, '../../entities');
  if (!fs.existsSync(entitiesDir)) return;
  const folders = fs.readdirSync(entitiesDir).filter(f =>
    fs.statSync(path.join(entitiesDir, f)).isDirectory()
  );
  const regularFolder = folders.find(f => !f.startsWith('entity_worker_') && !f.startsWith('Entity-worker_') && !f.startsWith('worker_'));
  if (!regularFolder) return; // no regular entities to test against
  const entityJson = path.join(entitiesDir, regularFolder, 'entity.json');
  if (!fs.existsSync(entityJson)) return;
  const data = JSON.parse(fs.readFileSync(entityJson, 'utf-8'));
  const canonicalId = regularFolder.replace(/^Entity-/, '').replace(/^entity_/, '');
  assert.equal(mgr.isWorkerEntity(canonicalId), false, `regular entity ${canonicalId} should not be a worker`);
});

test('cleanupWorkerEntity removes worker directory', () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity({ specialty: 'Cleanup' });
  assert.ok(fs.existsSync(result.entityPath), 'entity dir should exist before cleanup');

  mgr.cleanupWorkerEntity(result.id);
  assert.ok(!fs.existsSync(result.entityPath), 'entity dir should be removed after cleanup');
});

test('cleanupWorkerEntity refuses to delete non-worker entities', () => {
  const mgr = new EntityManager();
  assert.throws(
    () => mgr.cleanupWorkerEntity('entity_nonexistent_999'),
    /not a worker/,
    'should refuse non-worker cleanup'
  );
});

test('spawned worker can be loaded by entity-worker-invoker', async () => {
  const mgr = new EntityManager();
  const result = mgr.spawnWorkerEntity({ specialty: 'Integration', traits: ['precise'] });
  spawnedWorkerIds.push(result.id);

  const { loadEntityProfile } = require('../../server/brain/tasks/entity-worker-invoker');
  const profile = loadEntityProfile(result.id);
  assert.equal(profile.name, 'Worker: Integration');
  assert.ok(profile.traits.includes('precise'));
});

// Cleanup all spawned workers after tests
test('cleanup: remove all spawned test workers', () => {
  const mgr = new EntityManager();
  for (const id of spawnedWorkerIds) {
    try {
      if (mgr.isWorkerEntity(id)) {
        mgr.cleanupWorkerEntity(id);
      }
    } catch {
      // already cleaned up
    }
  }
});

// ── Section 10: Planning Orchestrator — deliberation loop (E-3) ──

const { runPlanningSession, _parseModerationResponse, _parseSynthesisResponse } = require('../../server/brain/tasks/planning-orchestrator');
const taskEventBus = require('../../server/brain/tasks/task-event-bus');

test('planning-orchestrator module exports runPlanningSession', () => {
  assert.equal(typeof runPlanningSession, 'function');
  assert.equal(typeof _parseModerationResponse, 'function');
  assert.equal(typeof _parseSynthesisResponse, 'function');
});

test('runPlanningSession rejects missing prompt', async () => {
  await assert.rejects(
    () => runPlanningSession({ callLLM: async () => '' }),
    /Planning prompt must be a non-empty string/
  );
});

test('runPlanningSession rejects missing callLLM', async () => {
  await assert.rejects(
    () => runPlanningSession({ prompt: 'test' }),
    /callLLM must be a function/
  );
});

test('runPlanningSession runs 1 round with 2 entities and reaches consensus', async () => {
  let callCount = 0;
  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async (_rt, messages) => {
    callCount++;
    const lastMsg = messages[messages.length - 1]?.content || '';
    // Entity calls get generic response
    if (!lastMsg.includes('Is there consensus')) {
      if (!lastMsg.includes('Produce the final')) {
        return 'I suggest we use approach A for maximum efficiency.';
      }
      // Synthesis call
      return JSON.stringify({
        finalPlan: 'Use approach A with monitoring.',
        decisionRationale: 'Both entities agreed on approach A.',
        issuesFlagged: []
      });
    }
    // Moderation call — report consensus
    return JSON.stringify({
      consensus: true,
      summary: 'All entities agree on approach A.',
      unresolvedIssues: []
    });
  };

  const result = await runPlanningSession({
    prompt: 'How should we structure the research project?',
    participants: [
      { entityId: 'entity_alpha', name: 'Alpha', capabilities: ['research'] },
      { entityId: 'entity_beta', name: 'Beta', capabilities: ['analysis'] }
    ],
    callLLM: mockLLM
  });

  assert.ok(result.plan, 'must have a plan');
  assert.ok(result.plan.includes('approach A'));
  assert.ok(result.rationale, 'must have rationale');
  assert.deepStrictEqual(result.participantIds, ['entity_alpha', 'entity_beta']);
  assert.equal(result.rounds.length, 1, 'should complete in 1 round with consensus');
  assert.equal(result.consensus, true);
  assert.ok(result.sessionId.startsWith('echat_'));
  // 2 entity calls + 1 moderation + 1 synthesis = 4 LLM calls
  assert.equal(callCount, 4);
});

test('runPlanningSession respects max rounds cap', async () => {
  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async (_rt, messages) => {
    const lastMsg = messages[messages.length - 1]?.content || '';
    if (lastMsg.includes('Produce the final')) {
      return JSON.stringify({
        finalPlan: 'Fallback plan after max rounds.',
        decisionRationale: 'No consensus reached.',
        issuesFlagged: ['no_consensus']
      });
    }
    if (lastMsg.includes('Is there consensus')) {
      return JSON.stringify({ consensus: false, summary: 'No agreement yet.', unresolvedIssues: ['timing'] });
    }
    return 'I think we need more discussion.';
  };

  const result = await runPlanningSession({
    prompt: 'Debate the approach',
    participants: [
      { entityId: 'entity_one', name: 'One', capabilities: ['general'] }
    ],
    callLLM: mockLLM,
    maxRounds: 2
  });

  assert.equal(result.rounds.length, 2, 'should stop at maxRounds=2');
  assert.equal(result.consensus, false);
  assert.ok(result.plan.includes('Fallback plan'));
});

test('runPlanningSession enforces entity cap (max 4)', async () => {
  const invokedEntities = new Set();
  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async () => JSON.stringify({
    consensus: true, summary: 'ok', unresolvedIssues: [],
    finalPlan: 'plan', decisionRationale: 'rationale', issuesFlagged: []
  });

  // Override invokeEntity to track which entities are called
  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const origInvoke = manager.invokeEntity.bind(manager);

  manager.invokeEntity = async function(sid, eid, opts) {
    invokedEntities.add(eid);
    return origInvoke(sid, eid, opts);
  };

  const result = await runPlanningSession({
    prompt: 'Cap test',
    participants: [
      { entityId: 'e1', name: 'E1', capabilities: [] },
      { entityId: 'e2', name: 'E2', capabilities: [] },
      { entityId: 'e3', name: 'E3', capabilities: [] },
      { entityId: 'e4', name: 'E4', capabilities: [] },
      { entityId: 'e5', name: 'E5', capabilities: [] } // should be capped
    ],
    callLLM: mockLLM
  });

  // Restore
  manager.invokeEntity = origInvoke;

  assert.ok(result.participantIds.length <= 4, 'should cap at 4 entities');
  assert.ok(!invokedEntities.has('e5'), 'e5 should be excluded by cap');
});

test('runPlanningSession emits events on task event bus', async () => {
  const events = [];
  const testSessionId = 'task_test_' + Date.now();

  // handler()
  // Purpose: helper wrapper used by this module's main flow.
  // handler()
  // WHAT THIS DOES: handler is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call handler(...) where this helper behavior is needed.
  const handler = (evt) => events.push(evt);
  taskEventBus.subscribe(testSessionId, handler);

  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async (_rt, messages) => {
    const lastMsg = messages[messages.length - 1]?.content || '';
    if (lastMsg.includes('Produce the final')) {
      return JSON.stringify({ finalPlan: 'done', decisionRationale: 'ok', issuesFlagged: [] });
    }
    if (lastMsg.includes('Is there consensus')) {
      return JSON.stringify({ consensus: true, summary: 'agreed', unresolvedIssues: [] });
    }
    return 'entity response';
  };

  await runPlanningSession({
    prompt: 'Event test',
    participants: [{ entityId: 'e_evt', name: 'EventBot', capabilities: [] }],
    callLLM: mockLLM,
    taskSessionId: testSessionId
  });

  taskEventBus.unsubscribe(testSessionId, handler);
  taskEventBus.cleanup(testSessionId);

  const roundEvents = events.filter(e => e.type === 'planning_round_complete');
  const completeEvents = events.filter(e => e.type === 'planning_complete');
  assert.ok(roundEvents.length >= 1, 'should emit at least 1 round event');
  assert.equal(completeEvents.length, 1, 'should emit exactly 1 complete event');
  assert.equal(completeEvents[0].consensus, true);
});

test('_parseModerationResponse extracts JSON from response', () => {
  const resp = _parseModerationResponse(
    'Here is my assessment: {"consensus": true, "summary": "All agree.", "unresolvedIssues": []}'
  );
  assert.equal(resp.consensus, true);
  assert.equal(resp.summary, 'All agree.');
  assert.deepStrictEqual(resp.unresolvedIssues, []);
});

test('_parseModerationResponse handles non-JSON gracefully', () => {
  const resp = _parseModerationResponse('I think there is no agreement yet on the timeline.');
  assert.equal(resp.consensus, false);
  assert.ok(resp.summary.includes('no agreement'));
});

test('_parseModerationResponse detects keyword consensus', () => {
  const resp = _parseModerationResponse('Consensus reached — all parties agree on the approach.');
  assert.equal(resp.consensus, true);
});

test('_parseSynthesisResponse extracts JSON plan', () => {
  const resp = _parseSynthesisResponse(
    '{"finalPlan": "Do X then Y", "decisionRationale": "Because Z", "issuesFlagged": ["risk A"]}'
  );
  assert.equal(resp.finalPlan, 'Do X then Y');
  assert.equal(resp.decisionRationale, 'Because Z');
  assert.deepStrictEqual(resp.issuesFlagged, ['risk A']);
});

test('_parseSynthesisResponse handles plain text fallback', () => {
  const resp = _parseSynthesisResponse('We should proceed with option B for the research.');
  assert.ok(resp.finalPlan.includes('option B'));
  assert.equal(resp.decisionRationale, '');
  assert.deepStrictEqual(resp.issuesFlagged, []);
});

test('runPlanningSession handles LLM failures gracefully', async () => {
  let callNum = 0;
  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async () => {
    callNum++;
    if (callNum <= 2) return 'entity response'; // entity calls
    if (callNum === 3) throw new Error('LLM down'); // moderation fails
    // Synthesis still works
    return JSON.stringify({ finalPlan: 'recovery plan', decisionRationale: 'partial', issuesFlagged: ['llm_issue'] });
  };

  const result = await runPlanningSession({
    prompt: 'Failure test',
    participants: [
      { entityId: 'e_fail1', name: 'Fail1', capabilities: [] },
      { entityId: 'e_fail2', name: 'Fail2', capabilities: [] }
    ],
    callLLM: mockLLM,
    maxRounds: 1
  });

  // Should still produce a result despite moderation failure
  assert.ok(result.plan, 'should still have a plan even with moderation failure');
  assert.equal(result.rounds.length, 1);
});

test('runPlanningSession closes the chat session when done', async () => {
  // mockLLM()
  // Purpose: helper wrapper used by this module's main flow.
  // mockLLM()
  // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
  const mockLLM = async (_rt, messages) => {
    const lastMsg = messages[messages.length - 1]?.content || '';
    if (lastMsg.includes('Produce the final')) {
      return JSON.stringify({ finalPlan: 'closed test plan', decisionRationale: 'ok', issuesFlagged: [] });
    }
    if (lastMsg.includes('Is there consensus')) {
      return JSON.stringify({ consensus: true, summary: 'done', unresolvedIssues: [] });
    }
    return 'ok';
  };

  const result = await runPlanningSession({
    prompt: 'Close test',
    participants: [{ entityId: 'e_close', name: 'Closer', capabilities: [] }],
    callLLM: mockLLM
  });

  const manager = require('../../server/brain/tasks/entity-chat-manager');
  const session = manager.getSession(result.sessionId);
  assert.equal(session.status, 'closed', 'session should be closed after planning completes');
  assert.ok(session.artifacts.length > 0, 'session should have artifacts');
});

// ── Section 11: Planning Archive — write/read round-trip (E-4) ──

const archiveWriter = require('../../server/brain/tasks/task-archive-writer');
const archiveReader = require('../../server/brain/tasks/task-archive-reader');
const os = require('os');

// Use a temp directory for archive tests so we don't pollute real data
const archiveTestDir = path.join(os.tmpdir(), 'nekocore-archive-test-' + Date.now());

test('planning archive: createPlanningArchive creates planning directory', () => {
  // Set up a minimal task archive structure
  const entityId = 'test_arch';
  const projectId = 'proj_1';
  const taskId = 'task_1';
  const opts = { baseEntitiesDir: archiveTestDir };

  // First create the task archive
  archiveWriter.createTaskArchive(projectId, taskId, 'test planning archive', { ...opts, entityId });

  const taskArchiveId = archiveWriter.buildTaskArchiveId(entityId, projectId, taskId);

  const planningDir = archiveWriter.createPlanningArchive(taskArchiveId, {
    sessionId: 'echat_test_123',
    prompt: 'How to build X?',
    roundCount: 2,
    consensus: true,
    participants: [{ entityId: 'e_a', name: 'Alpha', capabilities: ['research'], role: 'contributor' }]
  }, opts);

  assert.ok(fs.existsSync(planningDir), 'planning directory must exist');
  assert.ok(fs.existsSync(path.join(planningDir, 'session.json')), 'session.json must exist');
  assert.ok(fs.existsSync(path.join(planningDir, 'participants.json')), 'participants.json must exist');

  const session = JSON.parse(fs.readFileSync(path.join(planningDir, 'session.json'), 'utf-8'));
  assert.equal(session.prompt, 'How to build X?');
  assert.equal(session.consensus, true);
});

test('planning archive: appendPlanningRound writes round files', () => {
  const taskArchiveId = archiveWriter.buildTaskArchiveId('test_arch', 'proj_1', 'task_1');
  const opts = { baseEntitiesDir: archiveTestDir };

  archiveWriter.appendPlanningRound(taskArchiveId, {
    roundIndex: 0,
    responses: [
      { entityId: 'e_a', content: 'I suggest approach A.' },
      { entityId: 'e_b', content: 'I prefer approach B.' }
    ]
  }, opts);

  const archiveDir = archiveWriter.resolveTaskArchivePath(taskArchiveId, opts);
  const roundDir = path.join(archiveDir, 'planning', 'round-00');
  assert.ok(fs.existsSync(roundDir), 'round directory must exist');
  assert.ok(fs.existsSync(path.join(roundDir, 'e_a.json')));
  assert.ok(fs.existsSync(path.join(roundDir, 'e_b.json')));
});

test('planning archive: appendPlanningRound rejects invalid round', () => {
  const taskArchiveId = archiveWriter.buildTaskArchiveId('test_arch', 'proj_1', 'task_1');
  const opts = { baseEntitiesDir: archiveTestDir };

  assert.throws(
    () => archiveWriter.appendPlanningRound(taskArchiveId, { roundIndex: -1, responses: [] }, opts),
    /Invalid planning round/
  );
});

test('planning archive: writePlanningArtifacts creates files', () => {
  const taskArchiveId = archiveWriter.buildTaskArchiveId('test_arch', 'proj_1', 'task_1');
  const opts = { baseEntitiesDir: archiveTestDir };

  archiveWriter.writePlanningArtifacts(taskArchiveId, {
    finalPlan: 'We will use approach A with monitoring.',
    decisionRationale: 'Both entities favored A after round 2.',
    issuesFlagged: ['monitoring cost']
  }, opts);

  const archiveDir = archiveWriter.resolveTaskArchivePath(taskArchiveId, opts);
  const planningDir = path.join(archiveDir, 'planning');
  assert.ok(fs.existsSync(path.join(planningDir, 'final-plan.md')));
  assert.ok(fs.existsSync(path.join(planningDir, 'decision-rationale.md')));
  assert.ok(fs.existsSync(path.join(planningDir, 'issues-flagged.json')));
});

test('planning archive: writePlanningArtifacts rejects invalid artifacts', () => {
  const taskArchiveId = archiveWriter.buildTaskArchiveId('test_arch', 'proj_1', 'task_1');
  const opts = { baseEntitiesDir: archiveTestDir };

  assert.throws(
    () => archiveWriter.writePlanningArtifacts(taskArchiveId, { finalPlan: '', decisionRationale: 'ok', issuesFlagged: [] }, opts),
    /Invalid planning artifacts/
  );
});

test('planning archive: getPlanningRounds reads what was written', () => {
  const taskArchiveId = archiveWriter.buildTaskArchiveId('test_arch', 'proj_1', 'task_1');
  const opts = { baseEntitiesDir: archiveTestDir };

  const rounds = archiveReader.getPlanningRounds(taskArchiveId, opts);
  assert.ok(rounds.length >= 1, 'should have at least 1 round');
  assert.equal(rounds[0].roundIndex, 0);
  assert.equal(rounds[0].responses.length, 2);
  assert.ok(rounds[0].responses.some(r => r.entityId === 'e_a'));
  assert.ok(rounds[0].responses.some(r => r.entityId === 'e_b'));
});

test('planning archive: getPlanningArtifacts reads what was written', () => {
  const taskArchiveId = archiveWriter.buildTaskArchiveId('test_arch', 'proj_1', 'task_1');
  const opts = { baseEntitiesDir: archiveTestDir };

  const artifacts = archiveReader.getPlanningArtifacts(taskArchiveId, opts);
  assert.ok(artifacts, 'artifacts must exist');
  assert.ok(artifacts.finalPlan.includes('approach A'));
  assert.ok(artifacts.decisionRationale.includes('round 2'));
  assert.deepStrictEqual(artifacts.issuesFlagged, ['monitoring cost']);
});

test('planning archive: getPlanningRounds returns empty for no-planning archive', () => {
  const rounds = archiveReader.getPlanningRounds('nonexist|nope|nada', {});
  assert.deepStrictEqual(rounds, []);
});

test('planning archive: getPlanningArtifacts returns null for no-planning archive', () => {
  const artifacts = archiveReader.getPlanningArtifacts('nonexist|nope|nada', {});
  assert.equal(artifacts, null);
});

// Cleanup archive test directory
test('cleanup: remove archive test directory', () => {
  // deleteRecursive()
  // WHAT THIS DOES: deleteRecursive removes, resets, or shuts down existing state.
  // WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
  // HOW TO USE IT: call deleteRecursive(...) when you need a safe teardown/reset path.
  const deleteRecursive = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) deleteRecursive(fp);
      else fs.unlinkSync(fp);
    }
    fs.rmdirSync(dir);
  };
  deleteRecursive(archiveTestDir);
});

// ── Section 12: Task Delegation — shouldDelegate heuristic + delegation mode (E-5) ──

const { createTaskPipelineBridge } = require('../../server/brain/tasks/task-pipeline-bridge');

test('shouldDelegate returns true for high-confidence research with long message', () => {
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => '',
    frontman: { getActiveSession: () => null, startSession: () => {}, handleMidTaskUserMessage: async () => ({ handled: false }) },
    logTimeline: () => {}
  });

  const classification = { intent: 'task', taskType: 'research', confidence: 0.9 };
  const longMsg = 'Please research the latest developments in quantum computing including hardware advances, error correction, and application domains for enterprise. ' + 'x'.repeat(50);
  assert.equal(bridge.shouldDelegate(classification, longMsg), true);
});

test('shouldDelegate returns false for low confidence', () => {
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => '',
    frontman: { getActiveSession: () => null, startSession: () => {}, handleMidTaskUserMessage: async () => ({ handled: false }) },
    logTimeline: () => {}
  });

  const classification = { intent: 'task', taskType: 'research', confidence: 0.7 };
  const longMsg = 'x'.repeat(200);
  assert.equal(bridge.shouldDelegate(classification, longMsg), false);
});

test('shouldDelegate returns false for short messages', () => {
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => '',
    frontman: { getActiveSession: () => null, startSession: () => {}, handleMidTaskUserMessage: async () => ({ handled: false }) },
    logTimeline: () => {}
  });

  const classification = { intent: 'task', taskType: 'research', confidence: 0.9 };
  assert.equal(bridge.shouldDelegate(classification, 'short'), false);
});

test('shouldDelegate returns false for non-delegatable types', () => {
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => '',
    frontman: { getActiveSession: () => null, startSession: () => {}, handleMidTaskUserMessage: async () => ({ handled: false }) },
    logTimeline: () => {}
  });

  const classification = { intent: 'task', taskType: 'writing', confidence: 0.95 };
  const longMsg = 'x'.repeat(200);
  assert.equal(bridge.shouldDelegate(classification, longMsg), false);
});

test('shouldDelegate returns true for analysis type', () => {
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => '',
    frontman: { getActiveSession: () => null, startSession: () => {}, handleMidTaskUserMessage: async () => ({ handled: false }) },
    logTimeline: () => {}
  });

  const classification = { intent: 'task', taskType: 'analysis', confidence: 0.92 };
  const longMsg = 'Analyze the comparative performance of different machine learning approaches for natural language processing tasks across multiple benchmarks. ' + 'x'.repeat(50);
  assert.equal(bridge.shouldDelegate(classification, longMsg), true);
});

test('pipeline bridge exports shouldDelegate', () => {
  const bridge = createTaskPipelineBridge({
    callLLMWithRuntime: async () => '',
    frontman: { getActiveSession: () => null, startSession: () => {}, handleMidTaskUserMessage: async () => ({ handled: false }) },
    logTimeline: () => {}
  });
  assert.equal(typeof bridge.shouldDelegate, 'function');
  assert.equal(typeof bridge.detectAndDispatchTask, 'function');
});

// ── Section 13: Integration — planning pipeline wiring (E-6) ──

test('planning branch dispatches real orchestrator (async)', async () => {
  const { createTaskPipelineBridge: createBridge } = require('../../server/brain/tasks/task-pipeline-bridge');
  const taskSessionStore = require('../../server/brain/tasks/task-session');

  const bridge = createBridge({
    callLLMWithRuntime: async () => JSON.stringify({
      consensus: true, summary: 'ok', unresolvedIssues: [],
      finalPlan: 'test plan', decisionRationale: 'ok', issuesFlagged: []
    }),
    frontman: {
      getActiveSession: () => null,
      startSession: () => {},
      handleMidTaskUserMessage: async () => ({ handled: false })
    },
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'task', taskType: 'planning', confidence: 0.9 })
  });

  const result = await bridge.detectAndDispatchTask(
    'Plan a comprehensive approach to memory optimization',
    { id: 'entity_neko', name: 'NekoCore' },
    {}
  );

  assert.ok(result.handled);
  assert.equal(result.mode, 'planning');
  // Verify task session was created (orchestrator runs async via setImmediate)
  const tsession = taskSessionStore.getSession(result.planningSessionId);
  assert.ok(tsession, 'task session should be created');
  assert.ok(tsession.sharedContext.userMessage);
});

test('planning branch response message mentions specialist entities', async () => {
  const { createTaskPipelineBridge: createBridge } = require('../../server/brain/tasks/task-pipeline-bridge');

  const bridge = createBridge({
    callLLMWithRuntime: async () => '{}',
    frontman: {
      getActiveSession: () => null,
      startSession: () => {},
      handleMidTaskUserMessage: async () => ({ handled: false })
    },
    getSubconsciousMemoryContext: async () => ({ connections: [] }),
    classifyIntent: async () => ({ intent: 'task', taskType: 'planning', confidence: 0.88 })
  });

  const result = await bridge.detectAndDispatchTask(
    'Research the evidence and plan next steps',
    { id: 'entity_neko', name: 'NekoCore' },
    {}
  );

  assert.ok(result.response.includes('specialist entities'));
});

test('planning orchestrator is importable and has expected API', () => {
  const orchestrator = require('../../server/brain/tasks/planning-orchestrator');
  assert.equal(typeof orchestrator.runPlanningSession, 'function');
  assert.equal(typeof orchestrator._parseModerationResponse, 'function');
  assert.equal(typeof orchestrator._parseSynthesisResponse, 'function');
});

test('archive writer exports planning archive methods', () => {
  const writer = require('../../server/brain/tasks/task-archive-writer');
  assert.equal(typeof writer.createPlanningArchive, 'function');
  assert.equal(typeof writer.appendPlanningRound, 'function');
  assert.equal(typeof writer.writePlanningArtifacts, 'function');
});

test('archive reader exports planning archive methods', () => {
  const reader = require('../../server/brain/tasks/task-archive-reader');
  assert.equal(typeof reader.getPlanningRounds, 'function');
  assert.equal(typeof reader.getPlanningArtifacts, 'function');
});
