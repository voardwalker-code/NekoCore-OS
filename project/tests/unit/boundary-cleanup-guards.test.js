const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_FILE = path.join(ROOT, 'server', 'server.js');

function readServer() {
  return fs.readFileSync(SERVER_FILE, 'utf8');
}

test('server composition delegates runtime lifecycle to service module', () => {
  const src = readServer();
  assert.match(src, /createRuntimeLifecycle\s*=\s*require\('\.\/services\/runtime-lifecycle'\)/);
  assert.ok(!/async function startTelegramBot\(/.test(src));
  assert.ok(!/async function gracefulShutdown\(/.test(src));
});

test('server composition delegates post-response memory pipeline to service module', () => {
  const src = readServer();
  assert.match(src, /runPostResponseMemoryEncoding\s*\}\s*=\s*require\('\.\/services\/post-response-memory'\)/);
  assert.ok(!/const memPrompt = `Process this conversation exchange into a memory record\./.test(src));
});

test('server composition delegates natural chat postprocess to service module', () => {
  const src = readServer();
  assert.match(src, /postProcessResponse\s*\}\s*=\s*require\('\.\/services\/response-postprocess'\)/);
  assert.ok(!/humanizeResponse\s*,\s*quickClean/.test(src));
  assert.ok(!/result\.chunks\s*=\s*splitIntoChunks\(polished\)/.test(src));
});

test('server composition delegates shared LLM runtime helper utilities to service module', () => {
  const src = readServer();
  assert.match(src, /services\/llm-runtime-utils/);
  assert.ok(!/function parseJsonBlock\(/.test(src));
  assert.ok(!/function estimateUsageFromText\(/.test(src));
  assert.ok(!/function stripInternalResumeTag\(/.test(src));
});

// ── Phase A Re-evaluation guards ────────────────────────────────────────────
// These tests are EXPECTED TO FAIL until each extraction slice completes.
// They enforce the target state and turn green as each slice lands.

test('A-Re1: callLLMWithRuntime must not be defined in server.js (should be in llm-interface.js)', () => {
  const src = readServer();
  assert.ok(
    !/async function callLLMWithRuntime\(/.test(src),
    'callLLMWithRuntime must be extracted to services/llm-interface.js'
  );
});

test('A-Re1: callSubconsciousReranker must not be defined in server.js (should be in llm-interface.js)', () => {
  const src = readServer();
  assert.ok(
    !/async function callSubconsciousReranker\(/.test(src),
    'callSubconsciousReranker must be extracted to services/llm-interface.js'
  );
});

test('A-Re2: loadAspectRuntimeConfig must not be defined in server.js (should be in config-runtime.js)', () => {
  const src = readServer();
  assert.ok(
    !/function loadAspectRuntimeConfig\(/.test(src),
    'loadAspectRuntimeConfig must be extracted to services/config-runtime.js'
  );
});

test('A-Re2: normalizeAspectRuntimeConfig must not be defined in server.js (should be in config-runtime.js)', () => {
  const src = readServer();
  assert.ok(
    !/function normalizeAspectRuntimeConfig\(/.test(src),
    'normalizeAspectRuntimeConfig must be extracted to services/config-runtime.js'
  );
});

test('A-Re3: createCoreMemory must not be defined in server.js (should be in memory-operations.js)', () => {
  const src = readServer();
  assert.ok(
    !/async function createCoreMemory\(/.test(src),
    'createCoreMemory must be extracted to services/memory-operations.js'
  );
});

test('A-Re3: createSemanticKnowledge must not be defined in server.js (should be in memory-operations.js)', () => {
  const src = readServer();
  assert.ok(
    !/async function createSemanticKnowledge\(/.test(src),
    'createSemanticKnowledge must be extracted to services/memory-operations.js'
  );
});

test('A-Re4: getSubconsciousMemoryContext must not be defined in server.js (should be in memory-retrieval.js)', () => {
  const src = readServer();
  assert.ok(
    !/async function getSubconsciousMemoryContext\(/.test(src),
    'getSubconsciousMemoryContext must be extracted to services/memory-retrieval.js'
  );
});

test('A-Re5: parseJsonBlock must not be defined in post-response-memory.js (should import from llm-runtime-utils)', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'server', 'services', 'post-response-memory.js'),
    'utf8'
  );
  assert.ok(
    !/function parseJsonBlock\(/.test(src),
    'parseJsonBlock must not be locally defined in post-response-memory.js — import from llm-runtime-utils'
  );
});

// ── Phase 2 cleanup guards (P2-S1) — config-service wiring ──────────────────

test('P2-S1: TOKEN_LIMIT_DEFAULTS must not be defined inline in server.js (should reference config-service)', () => {
  const src = readServer();
  assert.ok(
    !/const TOKEN_LIMIT_DEFAULTS = \{/.test(src),
    'TOKEN_LIMIT_DEFAULTS object literal must not be inline in server.js — delegate to configService.getTokenLimitDefaults()'
  );
});

test('P2-S1: makeDefaultGlobalConfig must not be defined in server.js (handled by config-service)', () => {
  const src = readServer();
  assert.ok(
    !/function makeDefaultGlobalConfig\(/.test(src),
    'makeDefaultGlobalConfig must not be defined in server.js'
  );
});

test('P2-S1: normalizeGlobalConfigShape must not be defined in server.js (handled by config-service)', () => {
  const src = readServer();
  assert.ok(
    !/function normalizeGlobalConfigShape\(/.test(src),
    'normalizeGlobalConfigShape must not be defined in server.js'
  );
});

test('P2-S1: ensureGlobalConfigDir must not be defined in server.js (handled by config-service)', () => {
  const src = readServer();
  assert.ok(
    !/function ensureGlobalConfigDir\(/.test(src),
    'ensureGlobalConfigDir must not be defined in server.js'
  );
});

test('P2-S1: migrateLegacyGlobalConfigIfNeeded must not be defined in server.js (handled by config-service)', () => {
  const src = readServer();
  assert.ok(
    !/function migrateLegacyGlobalConfigIfNeeded\(/.test(src),
    'migrateLegacyGlobalConfigIfNeeded must not be defined in server.js'
  );
});

test('P2-S1: server.js imports config-service singleton', () => {
  const src = readServer();
  assert.match(
    src,
    /configService\s*=\s*require\('\.\/services\/config-service'\)/,
    'server.js must import configService from services/config-service'
  );
});

// ── Phase 2 cleanup guards (P2-S2) — EntityRuntime wiring ───────────────────

test('P2-S2: setActiveEntity must not construct MemoryStorage inline in server.js', () => {
  const src = readServer();
  assert.ok(
    !/memoryStorage\s*=\s*new MemoryStorage/.test(src),
    'MemoryStorage must be constructed inside EntityRuntime, not inline in server.js'
  );
});

test('P2-S2: setActiveEntity must not construct Neurochemistry inline in server.js', () => {
  const src = readServer();
  assert.ok(
    !/neurochemistry\s*=\s*new Neurochemistry/.test(src),
    'Neurochemistry must be constructed inside EntityRuntime, not inline in server.js'
  );
});

test('P2-S2: setActiveEntity must not construct BoredomEngine inline in server.js', () => {
  const src = readServer();
  assert.ok(
    !/boredomEngine\s*=\s*new BoredomEngine/.test(src),
    'BoredomEngine must be constructed inside EntityRuntime, not inline in server.js'
  );
});

test('P2-S2: server.js wires EntityRuntime from entity-runtime service', () => {
  const src = readServer();
  assert.match(
    src,
    /require\('\.\/services\/entity-runtime'\)/,
    'server.js must require entity-runtime service'
  );
});

test('P2-S2: setActiveEntity delegates to entityRuntime.activate()', () => {
  const src = readServer();
  assert.match(
    src,
    /entityRuntime\.activate\(entityId\)/,
    'setActiveEntity must delegate to entityRuntime.activate()'
  );
});

test('P2-S2: clearActiveEntity delegates to entityRuntime.deactivate()', () => {
  const src = readServer();
  assert.match(
    src,
    /entityRuntime\.deactivate\(\)/,
    'clearActiveEntity must delegate to entityRuntime.deactivate()'
  );
});

// ── Phase 2 cleanup guards (P2-S3) — startup-preflight service ───────────────

test('P2-S3: backupCorruptFile must not be defined inline in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^function backupCorruptFile/m,
    'backupCorruptFile must not be defined inline in server.js'
  );
});

test('P2-S3: ensureDirectory must not be defined inline in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^function ensureDirectory/m,
    'ensureDirectory must not be defined inline in server.js'
  );
});

test('P2-S3: buildDefaultEntityPersona must not be defined inline in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^function buildDefaultEntityPersona/m,
    'buildDefaultEntityPersona must not be defined inline in server.js'
  );
});

test('P2-S3: ensureEntityRuntimeState must not be defined inline in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^function ensureEntityRuntimeState/m,
    'ensureEntityRuntimeState must not be defined inline in server.js'
  );
});

test('P2-S3: server.js must require startup-preflight service', () => {
  const src = readServer();
  assert.match(
    src,
    /require\(['"]\.\/services\/startup-preflight['"]\)/,
    'server.js must require startup-preflight service'
  );
});

test('P2-S3: runStartupPreflight must be created via createRunStartupPreflight factory', () => {
  const src = readServer();
  assert.match(
    src,
    /createRunStartupPreflight\(/,
    'runStartupPreflight must be wired via createRunStartupPreflight factory'
  );
});

// ── Phase 2 cleanup guards (P2-S4) — app.js ctxMenu + vfs extraction ─────────

const APP_JS    = path.join(ROOT, 'client', 'js', 'app.js');
const CTX_JS    = path.join(ROOT, 'client', 'js', 'context-menu.js');
const VFS_JS    = path.join(ROOT, 'client', 'js', 'vfs.js');
const INDEX_HTML = path.join(ROOT, 'client', 'index.html');

function readClientFile(p) { return fs.readFileSync(p, 'utf8'); }

test('P2-S4: ctxMenu IIFE must not be defined inline in app.js', () => {
  const src = readClientFile(APP_JS);
  assert.doesNotMatch(
    src,
    /const ctxMenu\s*=\s*\(function\(\)/,
    'ctxMenu IIFE must be extracted out of app.js'
  );
});

test('P2-S4: vfs IIFE must not be defined inline in app.js', () => {
  const src = readClientFile(APP_JS);
  assert.doesNotMatch(
    src,
    /const vfs\s*=\s*\(function\(\)/,
    'vfs IIFE must be extracted out of app.js'
  );
});

test('P2-S4: context-menu.js must exist and define ctxMenu', () => {
  const src = readClientFile(CTX_JS);
  assert.match(
    src,
    /const ctxMenu\s*=\s*\(function\(\)/,
    'context-menu.js must contain the ctxMenu IIFE'
  );
});

test('P2-S4: vfs.js must exist and define vfs', () => {
  const src = readClientFile(VFS_JS);
  assert.match(
    src,
    /const vfs\s*=\s*\(function\(\)/,
    'vfs.js must contain the vfs IIFE'
  );
});

test('P2-S4: index.html must load vfs.js', () => {
  const src = readClientFile(INDEX_HTML);
  assert.match(
    src,
    /src="js\/vfs\.js"/,
    'index.html must have a script tag for vfs.js'
  );
});

test('P2-S4: index.html must load context-menu.js after vfs.js', () => {
  const src = readClientFile(INDEX_HTML);
  assert.match(
    src,
    /src="js\/context-menu\.js"/,
    'index.html must have a script tag for context-menu.js'
  );
  const vfsPos = src.indexOf('js/vfs.js');
  const ctxPos = src.indexOf('js/context-menu.js');
  assert.ok(vfsPos !== -1 && ctxPos !== -1, 'both script tags must exist');
  assert.ok(vfsPos < ctxPos, 'vfs.js must be declared before context-menu.js in index.html');
});

// ── Phase 2 cleanup guards (P2-S6) — server.js pipeline extractions ──────────

test('P2-S6-a: processChatMessage must not be defined inline in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^async function processChatMessage\(/m,
    'processChatMessage must be extracted to services/chat-pipeline.js'
  );
});

test('P2-S6-a: services/chat-pipeline.js must exist', () => {
  const p = path.join(ROOT, 'server', 'services', 'chat-pipeline.js');
  assert.ok(fs.existsSync(p), 'services/chat-pipeline.js must exist');
});

test('P2-S6-b: processNekoCoreChatMessage must not be defined inline in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^async function processNekoCoreChatMessage\(/m,
    'processNekoCoreChatMessage must be extracted to services/nekocore-pipeline.js'
  );
});

test('P2-S6-b: services/nekocore-pipeline.js must exist', () => {
  const p = path.join(ROOT, 'server', 'services', 'nekocore-pipeline.js');
  assert.ok(fs.existsSync(p), 'services/nekocore-pipeline.js must exist');
});

test('P2-S6-c: entity-scoped shadow vars must not be declared at module level in server.js', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^let memoryStorage = null;/m,
    'Shadow var "let memoryStorage = null" must be removed — read from entityRuntime directly'
  );
});

test('P2-S6-d: startup IIFE must not be inline in server.js (extracted to services/boot.js)', () => {
  const src = readServer();
  assert.doesNotMatch(
    src,
    /^\s*thoughtStream\.start\(\)/m,
    'thoughtStream.start() must be in services/boot.js, not inline in server.js'
  );
});

test('P2-S6-d: services/boot.js must exist', () => {
  const p = path.join(ROOT, 'server', 'services', 'boot.js');
  assert.ok(fs.existsSync(p), 'services/boot.js must exist');
});
