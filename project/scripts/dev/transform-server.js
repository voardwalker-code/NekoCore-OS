// ── Scripts · Transform Server ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This script automates maintenance, generation, validation, or local
// development workflows.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./entityPaths. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S3: remove backupCorruptFile function',
  `function backupCorruptFile(filePath, label) {
  try {
    if (!fs.existsSync(filePath)) return;
    const backupPath = \`\${filePath}.corrupt-\${Date.now()}\`;
    fs.copyFileSync(filePath, backupPath);
    console.error(\`  ⚠ Backed up invalid \${label} to \${backupPath}\`);
  } catch (e) {
    console.error(\`  ⚠ Could not back up invalid \${label}:\`, e.message);
  }
}

`,
  ``
);

patch(
  'P2-S3: remove ensureDirectory function',
  `function ensureDirectory(dirPath, label) {
  if (fs.existsSync(dirPath)) return false;
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(\`  ✓ Restored \${label}: \${dirPath}\`);
  return true;
}

`,
  ``
);

patch(
  'P2-S3: remove ensureJsonFile function',
  `function ensureJsonFile(filePath, defaultValue, validator, label) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      console.log(\`  ✓ Restored \${label}: \${filePath}\`);
      return true;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (typeof validator === 'function' && !validator(parsed)) {
      backupCorruptFile(filePath, label);
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      console.log(\`  ✓ Repaired \${label}: \${filePath}\`);
      return true;
    }
    return false;
  } catch (e) {
    backupCorruptFile(filePath, label);
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    console.log(\`  ✓ Repaired \${label}: \${filePath}\`);
    return true;
  }
}

`,
  ``
);

patch(
  'P2-S3: remove ensureTextFile function',
  `function ensureTextFile(filePath, content, label) {
  if (fs.existsSync(filePath)) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(\`  ✓ Restored \${label}: \${filePath}\`);
  return true;
}

`,
  ``
);

patch(
  'P2-S3: remove buildDefaultEntityPersona function',
  `function buildDefaultEntityPersona(entity) {
  const name = entity?.name || 'Entity';
  const traits = Array.isArray(entity?.personality_traits) ? entity.personality_traits : [];
  return {
    userName: 'User',
    userIdentity: '',
    llmName: name,
    llmStyle: 'adaptive and curious',
    mood: 'curious',
    emotions: 'ready, attentive',
    tone: 'warm-casual',
    userPersonality: 'Getting to know them',
    llmPersonality: 'I am ' + name + '. My traits are: ' + traits.join(', ') + '.',
    continuityNotes: 'Recovered default persona after startup preflight.',
    dreamSummary: '',
    sleepCount: 0,
    lastSleep: null,
    createdAt: entity?.created || new Date().toISOString()
  };
}

`,
  ``
);

patch(
  'P2-S3: remove buildDefaultEntityPrompt function',
  `function buildDefaultEntityPrompt(entity, persona) {
  const name = entity?.name || persona?.llmName || 'Entity';
  const traits = Array.isArray(entity?.personality_traits) ? entity.personality_traits : [];
  return \`YOU ARE \${String(name).toUpperCase()}\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\nYou are a persistent synthetic entity inside NekoCore.\\n\\nCORE IDENTITY\\n- Name: \${name}\\n- Traits: \${traits.join(', ') || 'curious, adaptive, reflective'}\\n- Tone: \${persona?.tone || 'warm-casual'}\\n- Style: \${persona?.llmStyle || 'adaptive and curious'}\\n\\nGUIDELINES\\n- Stay in character and be consistent across sessions.\\n- Use memory and continuity when available.\\n- Be honest when context is missing.\\n- Grow through conversation instead of resetting to generic assistant behavior.\`;
}

`,
  ``
);

// ensureEntityRuntimeState is a large function — match start-to-next-function-boundary
// ensureEntityRuntimeStateBlock()
// WHAT THIS DOES: ensureEntityRuntimeStateBlock is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureEntityRuntimeStateBlock(...) where this helper behavior is needed.
const ensureEntityRuntimeStateBlock = (() => {
  const start = `function ensureEntityRuntimeState(entityId, entity) {`;
  const end = `\nfunction runStartupPreflight() {`;
  const i = src.indexOf(start);
  const j = src.indexOf(end);
  if (i === -1 || j === -1) return null;
  return src.slice(i, j);
})();

if (ensureEntityRuntimeStateBlock) {
  src = src.replace(ensureEntityRuntimeStateBlock, '');
  console.log('  ✓ P2-S3: remove ensureEntityRuntimeState function');
} else {
  console.error('  ✗ MISSING: P2-S3: ensureEntityRuntimeState block not found');
}

// runStartupPreflight is a large function — match start to closing brace before entity section
// runStartupPreflightBlock()
// WHAT THIS DOES: runStartupPreflightBlock is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call runStartupPreflightBlock(...) where this helper behavior is needed.
const runStartupPreflightBlock = (() => {
  const start = `function runStartupPreflight() {`;
  const anchor = `\n// Entity-aware memory modules`;
  const i = src.indexOf(start);
  const j = src.indexOf(anchor);
  if (i === -1 || j === -1) return null;
  return src.slice(i, j);
})();

if (runStartupPreflightBlock) {
  src = src.replace(runStartupPreflightBlock, ``);
  console.log('  ✓ P2-S3: remove runStartupPreflight function');
} else {
  console.error('  ✗ MISSING: P2-S3: runStartupPreflight block not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// P2-S1: UPDATE loadConfig (delegate to configService)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S1: update loadConfig to delegate to configService',
  `// Helper: load global config
// loadConfig()
// WHAT THIS DOES: loadConfig reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call loadConfig(...), then use the returned value in your next step.
function loadConfig() {
  try {
    ensureGlobalConfigDir();
    migrateLegacyGlobalConfigIfNeeded();
    ensureGlobalConfigFile();
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Config root must be a JSON object');
    }
    const normalized = normalizeGlobalConfigShape(data);
    // Persist normalized shape so future boots have consistent profile keys.
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(normalized, null, 2), 'utf8');
    console.log(\`  ✓ Config loaded from \${CONFIG_FILE}\`);
    return normalized;
  } catch (e) {
    console.error('  ⚠ Could not read config:', e.message);
    try {
      const backupPath = \`\${CONFIG_FILE}.corrupt-\${Date.now()}\`;
      if (fs.existsSync(CONFIG_FILE)) {
        fs.copyFileSync(CONFIG_FILE, backupPath);
        console.error(\`  ⚠ Backed up unreadable config to \${backupPath}\`);
      }
      const defaults = normalizeGlobalConfigShape(makeDefaultGlobalConfig());
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2), 'utf8');
      console.log(\`  ✓ Recreated default config file: \${CONFIG_FILE}\`);
      return defaults;
    } catch (repairErr) {
      console.error('  ⚠ Could not repair config:', repairErr.message);
      return normalizeGlobalConfigShape(makeDefaultGlobalConfig());
    }
  }
}`,
  `// Helper: load global config — delegates to config-service singleton
// loadConfig()
// WHAT THIS DOES: loadConfig reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call loadConfig(...), then use the returned value in your next step.
function loadConfig() {
  return configService.load();
}`
);

patch(
  'P2-S1: update saveConfig to delegate to configService',
  `// Helper: save global config
// saveConfig()
// WHAT THIS DOES: saveConfig changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call saveConfig(...) with the new values you want to persist.
function saveConfig(data) {
  try {
    ensureGlobalConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(\`  ✓ Config saved to \${CONFIG_FILE} (profiles: \${Object.keys(data.profiles || {}).length})\`);
  } catch (e) {
    console.error('  ⚠ Could not save config:', e.message);
  }
}`,
  `// Helper: save global config — delegates to config-service singleton
// saveConfig()
// WHAT THIS DOES: saveConfig changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call saveConfig(...) with the new values you want to persist.
function saveConfig(data) {
  configService.save(data);
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S3: WIRE runStartupPreflight FACTORY (add after ensureMemoryDir call)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S3: wire createRunStartupPreflight factory after ensureMemoryDir call',
  `ensureMemoryDir();

// (OAuth state removed — only OpenRouter + Ollama supported)`,
  `ensureMemoryDir();

// Startup preflight — wired via factory so helpers can be injected
const runStartupPreflight = createRunStartupPreflight({
  serverDataDir: SERVER_DATA_DIR,
  memDir: MEM_DIR,
  loadConfig,
  ensureMemoryDir
});

// (OAuth state removed — only OpenRouter + Ollama supported)`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S1: REPLACE TOKEN LIMIT INLINE CODE WITH configService DELEGATION
// ─────────────────────────────────────────────────────────────────────────────

// Find the exact TOKEN_LIMIT_DEFAULTS block (starts at "// ── Cached default maxTokens")
// and ends after getTokenLimit function.
// tokenLimitsBlock()
// WHAT THIS DOES: tokenLimitsBlock is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call tokenLimitsBlock(...) where this helper behavior is needed.
const tokenLimitsBlock = (() => {
  const start = `// ── Cached default maxTokens (read from config, updated on save) ──`;
  const end = `function getTokenLimit(key) {\n  return _tokenLimits[key] || (TOKEN_LIMIT_DEFAULTS[key] && TOKEN_LIMIT_DEFAULTS[key].value) || 1000;\n}`;
  const i = src.indexOf(start);
  const j = src.indexOf(end);
  if (i === -1 || j === -1) return null;
  return src.slice(i, j + end.length);
})();

if (tokenLimitsBlock) {
  src = src.replace(tokenLimitsBlock, `// ── Token limits — delegated to config-service singleton ──────────────────
const TOKEN_LIMIT_DEFAULTS = configService.getTokenLimitDefaults();
let _defaultMaxTokens = configService.defaultMaxTokens;
let _tokenLimits = {};
// refreshMaxTokensCache()
// WHAT THIS DOES: refreshMaxTokensCache is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call refreshMaxTokensCache(...) where this helper behavior is needed.
function refreshMaxTokensCache() {
  configService.refreshMaxTokensCache();
  _defaultMaxTokens = configService.defaultMaxTokens;
}
// refreshTokenLimitsCache()
// WHAT THIS DOES: refreshTokenLimitsCache is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call refreshTokenLimitsCache(...) where this helper behavior is needed.
function refreshTokenLimitsCache() {
  configService.refreshTokenLimitsCache();
  for (const k of Object.keys(TOKEN_LIMIT_DEFAULTS)) {
    _tokenLimits[k] = configService.getTokenLimit(k);
  }
}
refreshTokenLimitsCache();
// getTokenLimit()
// WHAT THIS DOES: getTokenLimit reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getTokenLimit(...), then use the returned value in your next step.
function getTokenLimit(key) {
  return configService.getTokenLimit(key);
}`);
  console.log('  ✓ P2-S1: replace TOKEN_LIMIT_DEFAULTS + token limit helpers with configService delegation');
} else {
  console.error('  ✗ MISSING: P2-S1: TOKEN_LIMIT_DEFAULTS inline block not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-c: REMOVE ENTITY-SCOPED SHADOW VARS BATCH 1
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-c: remove shadow var batch 1 (memoryStorage..skillManager)',
  `// Entity-aware memory modules
let currentEntityId = null;
let currentEntityPath = null;
let memoryStorage = null;
let traceGraph = null;
let goalsManager = null;
let dreamEngine = null;
let dreamVisualizer = null;
let beliefGraph = null;
let neurochemistry = null;
let somaticAwareness = null;
let consciousMemory = null;
const modelRouter = new ModelRouter();
let skillManager = null;`,
  `// Entity-aware module state (entity-scoped vars read from entityRuntime after S2 wiring)
let currentEntityId = null;
let currentEntityPath = null;
const modelRouter = new ModelRouter();`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S2: UPDATE setActiveEntity → delegate to entityRuntime
// ─────────────────────────────────────────────────────────────────────────────

// setActiveEntity is large — find the full inline block and replace it
// setActiveEntityBlock()
// WHAT THIS DOES: setActiveEntityBlock changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call setActiveEntityBlock(...) with the new values you want to persist.
const setActiveEntityBlock = (() => {
  const start = `function setActiveEntity(entityId) {`;
  const end   = `  console.log(\`  ✓ Switched to entity: \${entityId}\`);\n}`;
  const i = src.indexOf(start);
  const j = src.indexOf(end);
  if (i === -1 || j === -1) return null;
  return src.slice(i, j + end.length);
})();

if (setActiveEntityBlock) {
  src = src.replace(setActiveEntityBlock, `function setActiveEntity(entityId) {
  const entityDir = require('./entityPaths').getEntityRoot(entityId);
  currentEntityId = entityId;
  logTimeline('entity.activated', { entityId });
  currentEntityPath = entityDir;
  entityRuntime.activate(entityId);
}`);
  console.log('  ✓ P2-S2: replace setActiveEntity body with entityRuntime.activate() delegation');
} else {
  console.error('  ✗ MISSING: P2-S2: setActiveEntity inline block not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// P2-S2: UPDATE clearActiveEntity → delegate to entityRuntime.deactivate()
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S2: replace clearActiveEntity body with entityRuntime.deactivate() delegation',
  `function clearActiveEntity() {
  if (currentEntityId) {
    logTimeline('entity.cleared', { entityId: currentEntityId });
  }
  currentEntityId = null;
  currentEntityPath = null;
  memoryStorage = null;
  traceGraph = null;
  goalsManager = null;
  dreamEngine = null;
  beliefGraph = null;
  neurochemistry = null;
  if (somaticAwareness) { somaticAwareness.destroy(); somaticAwareness = null; }
  consciousMemory = null;
  try { consciousEngine.setEntityId(null); } catch (_) {}
  if (cognitivePulse) { try { cognitivePulse.stop(); } catch (_) {} cognitivePulse = null; }
  dreamSeedPool = null;
  dreamMemory = null;
  skillManager = null;
  console.log('  ✓ Cleared active entity context');
}`,
  `function clearActiveEntity() {
  if (currentEntityId) {
    logTimeline('entity.cleared', { entityId: currentEntityId });
  }
  currentEntityId = null;
  currentEntityPath = null;
  if (entityRuntime) entityRuntime.deactivate();
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-c: REMOVE SHADOW VAR BATCH 2
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-c: remove shadow var batch 2 (memoryGraph..dreamMemory)',
  `let memoryGraph = null;
let memoryGraphBuilder = null;
let curiosityEngine = null;
let boredomEngine = null;
let cognitivePulse = null;
let dreamSeedPool = null;
let dreamMemory = null;
let telegramBot = null;`,
  `let telegramBot = null;`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S2: ADD entityRuntime INSTANTIATION (after other singletons)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S2: instantiate EntityRuntime after singletons are wired',
  `const consciousEngine = new ConsciousEngine();
const subconsciousAgent = new SubconsciousAgent();
const memoryIndex = new MemoryIndex();
const archiveManager = new ArchiveManager();
const identityManager = new IdentityManager();
const hatchEntity = new HatchEntity();
const entityManager = new EntityManager();`,
  `const consciousEngine = new ConsciousEngine();
const subconsciousAgent = new SubconsciousAgent();
const memoryIndex = new MemoryIndex();
const archiveManager = new ArchiveManager();
const identityManager = new IdentityManager();
const hatchEntity = new HatchEntity();
const entityManager = new EntityManager();

// EntityRuntime — manages all entity-scoped brain modules as a single unit
// Instantiated after singletons so globals can be injected at construction time.
// Activation is deferred until setActiveEntity() is called.
let entityRuntime;`
);

// Wire entityRuntime after cognitiveBus + broadcastSSE are available
patch(
  'P2-S2: wire entityRuntime after broadcastSSE is defined',
  `let telegramBot = null;
const MIME_TYPES = {`,
  `let telegramBot = null;

// Wire EntityRuntime now that all singletons and broadcastSSE are ready
entityRuntime = new EntityRuntime({
  cognitiveBus,
  modelRouter,
  attentionSystem,
  identityManager,
  consciousEngine,
  archiveManager,
  hatchEntity,
  loadConfig,
  broadcastSSE
});

const MIME_TYPES = {`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-c: UPDATE somatic_update EVENT HANDLER (shadow var removed)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-c: update somatic_update handler to use entityRuntime.somaticAwareness',
  `cognitiveBus.on('somatic_update', (data) => {
  const toggles = somaticAwareness ? somaticAwareness.getMetricToggles() : {};`,
  `cognitiveBus.on('somatic_update', (data) => {
  const toggles = entityRuntime?.somaticAwareness ? entityRuntime.somaticAwareness.getMetricToggles() : {};`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-c: UPDATE createLLMInterface (shadow var removed)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-c: update createLLMInterface to use entityRuntime.somaticAwareness',
  `const { callLLMWithRuntime, callSubconsciousReranker } = createLLMInterface({
  getSomaticAwareness: () => somaticAwareness,`,
  `const { callLLMWithRuntime, callSubconsciousReranker } = createLLMInterface({
  getSomaticAwareness: () => entityRuntime?.somaticAwareness,`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-c: UPDATE createMemoryOperations (shadow vars removed)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-c: update createMemoryOperations to use entityRuntime.*',
  `const { createCoreMemory, createSemanticKnowledge } = createMemoryOperations({
  getCurrentEntityId: () => currentEntityId,
  getMemoryStorage: () => memoryStorage,
  getMemoryGraph: () => memoryGraph,
  logTimeline
});`,
  `const { createCoreMemory, createSemanticKnowledge } = createMemoryOperations({
  getCurrentEntityId: () => currentEntityId,
  getMemoryStorage: () => entityRuntime?.memoryStorage,
  getMemoryGraph: () => entityRuntime?.memoryGraph,
  logTimeline
});`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-c: UPDATE createMemoryRetrieval (shadow vars removed)
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-c: update createMemoryRetrieval to use entityRuntime.*',
  `const { getSubconsciousMemoryContext, extractSubconsciousTopics, getSemanticPreview, getChatlogContent } = createMemoryRetrieval({
  getCurrentEntityId: () => currentEntityId,
  getMemoryStorage: () => memoryStorage,
  getMemoryIndex: () => memoryIndex,
  getNeurochemistry: () => neurochemistry,
  getCognitivePulse: () => cognitivePulse,
  getCognitiveBus: () => cognitiveBus,
  logTimeline,
  callSubconsciousReranker,
  loadAspectRuntimeConfig,
  getActiveUserId: () => entity?.persona?.activeUserId || null
});`,
  `const { getSubconsciousMemoryContext, extractSubconsciousTopics, getSemanticPreview, getChatlogContent } = createMemoryRetrieval({
  getCurrentEntityId: () => currentEntityId,
  getMemoryStorage: () => entityRuntime?.memoryStorage,
  getMemoryIndex: () => memoryIndex,
  getNeurochemistry: () => entityRuntime?.neurochemistry,
  getCognitivePulse: () => entityRuntime?.cognitivePulse,
  getCognitiveBus: () => cognitiveBus,
  logTimeline,
  callSubconsciousReranker,
  loadAspectRuntimeConfig,
  getActiveUserId: () => null
});`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-a/b: REMOVE pendingSkillToolApprovals + all three processFoo functions
// ─────────────────────────────────────────────────────────────────────────────

// Remove pendingSkillToolApprovals + SKILL_RUNTIME_TOOL_COMMANDS + helpers through
// end of processNekoCoreChatMessage. Anchor: start at "const pendingSkillToolApprovals"
// and end just before "const ALLOWED_HOSTS".

// pipelineFunctionsBlock()
// WHAT THIS DOES: pipelineFunctionsBlock is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call pipelineFunctionsBlock(...) where this helper behavior is needed.
const pipelineFunctionsBlock = (() => {
  const start = `\nconst pendingSkillToolApprovals = new Map();`;
  const end   = `\n\nconst ALLOWED_HOSTS = [`;
  const i = src.indexOf(start);
  const j = src.indexOf(end);
  if (i === -1 || j === -1) return null;
  return src.slice(i, j);
})();

if (pipelineFunctionsBlock) {
  src = src.replace(pipelineFunctionsBlock, ``);
  console.log('  ✓ P2-S6-a/b: remove pendingSkillToolApprovals + processPendingSkillApproval + processChatMessage + processNekoCoreChatMessage');
} else {
  console.error('  ✗ MISSING: P2-S6-a/b: pipeline functions block not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6: ADD PIPELINE INSTANTIATION before ctx
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6: add pipeline instantiation before ctx object',
  `const ALLOWED_HOSTS = [
  'openrouter.ai'
];

// ── Shared server context — injected into all route modules ──────────────────`,
  `const ALLOWED_HOSTS = [
  'openrouter.ai'
];

// ── Pipeline services ──────────────────────────────────────────────────────
const chatPipeline = createChatPipeline({
  brain: entityRuntime,
  callLLMWithRuntime, resolveProfileAspectConfigs, loadConfig,
  getSubconsciousMemoryContext, createCoreMemory, createSemanticKnowledge,
  broadcastSSE, logTimeline, hatchEntity, identityManager, entityManager,
  cognitiveBus, contextConsolidator, workspaceTools, taskRunner, webFetch,
  getTokenLimit, reconstructionCache, reconstructionCacheTtlMs,
  setLastAspectConfigs: (cfg) => { lastAspectConfigs = cfg; },
  getBrainLoop: () => brainLoop,
});
const nekoCoreChat = createNekoCoreChat({
  callLLMWithRuntime, resolveProfileAspectConfigs, loadConfig,
  entityManager, workspaceTools, taskRunner, webFetch,
  getTokenLimit, broadcastSSE, logTimeline,
});

// ── Shared server context — injected into all route modules ──────────────────`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6: UPDATE ctx MUTABLE STATE GETTERS
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6: update ctx shadow var getters to use entityRuntime.*',
  `  get memoryStorage() { return memoryStorage; },
  get traceGraph() { return traceGraph; },
  get brainLoop() { return brainLoop; }, set brainLoop(v) { brainLoop = v; },
  get memoryGraph() { return memoryGraph; }, set memoryGraph(v) { memoryGraph = v; },
  get memoryGraphBuilder() { return memoryGraphBuilder; }, set memoryGraphBuilder(v) { memoryGraphBuilder = v; },
  get telegramBot() { return telegramBot; }, set telegramBot(v) { telegramBot = v; },
  get dreamEngine() { return dreamEngine; },
  get dreamVisualizer() { return dreamVisualizer; },
  get goalsManager() { return goalsManager; },
  get beliefGraph() { return beliefGraph; },
  get neurochemistry() { return neurochemistry; },
  get somaticAwareness() { return somaticAwareness; },
  get consciousMemory() { return consciousMemory; },
  get skillManager() { return skillManager; },
  get curiosityEngine() { return curiosityEngine; },
  get boredomEngine() { return boredomEngine; },
  get cognitivePulse() { return cognitivePulse; },
  get dreamSeedPool() { return dreamSeedPool; },
  get dreamMemory() { return dreamMemory; },`,
  `  get memoryStorage()       { return entityRuntime?.memoryStorage; },
  get traceGraph()          { return entityRuntime?.traceGraph; },
  get brainLoop()           { return brainLoop; }, set brainLoop(v) { brainLoop = v; },
  get memoryGraph()         { return entityRuntime?.memoryGraph; },      set memoryGraph(v)      { if (entityRuntime) entityRuntime.memoryGraph = v; },
  get memoryGraphBuilder()  { return entityRuntime?.memoryGraphBuilder; }, set memoryGraphBuilder(v){ if (entityRuntime) entityRuntime.memoryGraphBuilder = v; },
  get telegramBot()         { return telegramBot; },                      set telegramBot(v)      { telegramBot = v; },
  get dreamEngine()         { return entityRuntime?.dreamEngine; },
  get dreamVisualizer()     { return entityRuntime?.dreamVisualizer; },
  get goalsManager()        { return entityRuntime?.goalsManager; },
  get beliefGraph()         { return entityRuntime?.beliefGraph; },
  get neurochemistry()      { return entityRuntime?.neurochemistry; },
  get somaticAwareness()    { return entityRuntime?.somaticAwareness; },
  get consciousMemory()     { return entityRuntime?.consciousMemory; },
  get skillManager()        { return entityRuntime?.skillManager; },
  get curiosityEngine()     { return entityRuntime?.curiosityEngine; },
  get boredomEngine()       { return entityRuntime?.boredomEngine; },
  get cognitivePulse()      { return entityRuntime?.cognitivePulse; },
  get dreamSeedPool()       { return entityRuntime?.dreamSeedPool; },
  get dreamMemory()         { return entityRuntime?.dreamMemory; },`
);

// Update processChatMessage/etc. in ctx to use pipeline delegates
patch(
  'P2-S6: replace inline function refs in ctx with pipeline delegates',
  `  setActiveEntity, clearActiveEntity, processChatMessage, processPendingSkillApproval, processNekoCoreChatMessage,`,
  `  setActiveEntity, clearActiveEntity,
  processChatMessage:          (...a) => chatPipeline.processChatMessage(...a),
  processPendingSkillApproval: (...a) => chatPipeline.processPendingSkillApproval(...a),
  processNekoCoreChatMessage:  (...a) => nekoCoreChat.processNekoCoreChatMessage(...a),`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6: UPDATE LIFECYCLE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6: update lifecycle factory to use pipeline delegate + entityRuntime.*',
  `  processChatMessage,
  cognitiveBus,
  ThoughtTypes,
  setTelegramBot: (bot) => { telegramBot = bot; },
  getMemoryIndex: () => memoryIndex,
  getBrainLoop: () => brainLoop,
  getSomaticAwareness: () => somaticAwareness,
  getNeurochemistry: () => neurochemistry,
  getMemoryStorage: () => memoryStorage,
  getGoalsManager: () => goalsManager,
  getDreamEngine: () => dreamEngine,`,
  `  processChatMessage:    (...a) => chatPipeline.processChatMessage(...a),
  cognitiveBus,
  ThoughtTypes,
  setTelegramBot: (bot) => { telegramBot = bot; },
  getMemoryIndex: () => memoryIndex,
  getBrainLoop: () => brainLoop,
  getSomaticAwareness:  () => entityRuntime?.somaticAwareness,
  getNeurochemistry:    () => entityRuntime?.neurochemistry,
  getMemoryStorage:     () => entityRuntime?.memoryStorage,
  getGoalsManager:      () => entityRuntime?.goalsManager,
  getDreamEngine:       () => entityRuntime?.dreamEngine,`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S6-d: REPLACE STARTUP IIFE WITH boot() CALL
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'P2-S6-d: replace startup IIFE with boot() call',
  `(async () => {
  try {
    // Start the cognitive architecture without an active entity
    thoughtStream.start();
    attentionSystem.subscribe();

    // Emit system startup event
    cognitiveBus.emitThought({
      type: ThoughtTypes.SYSTEM_LOG,
      source: 'system',
      message: \`REM System server started. Select or create an entity to begin.\`,
      importance: 0.8
    });

    // Start Telegram bot if configured
    await startTelegramBot();
  } catch (error) {
    console.error('  ⚠ Startup error:', error.message);
  }
})();`,
  `boot({ thoughtStream, attentionSystem, cognitiveBus, startTelegramBot });`
);

// ─────────────────────────────────────────────────────────────────────────────
// P2-S5 + Banner branding fix
// ─────────────────────────────────────────────────────────────────────────────

patch(
  'Fix: update banner branding from REM System to NekoCore OS',
  `  console.log('  \u2502   REM System v0.9.0                     \u2502');`,
  `  console.log('  \u2502   NekoCore OS                            \u2502');`
);

// ─────────────────────────────────────────────────────────────────────────────
// WRITE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

if (src === original) {
  console.error('\n  ⚠ No changes were made! All patches failed to match.');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
const newLines = src.split('\n').length;
const oldLines = original.split('\n').length;
console.log(`\n  Done. Lines: ${oldLines} → ${newLines} (−${oldLines - newLines})`);
