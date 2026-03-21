'use strict';

// ============================================================
// P3-S12 — Chat Ownership Audit Guard Slice
// Locks the ownership boundary between app.js and chat.js
// before P3-S13 extraction begins.
//
// Sections:
//   1. Functions that MUST be in chat.js
//   2. Functions that MUST NOT be in chat.js (still app.js, P3-S13 move targets)
//   3. Shared state that MUST be declared in app.js
//   4. Cross-boundary export: window.syncContextChatGuard
//   5. app.js must NOT own core chat send/render functions
//   6. P3-S13 move-target baseline — locks current app.js location
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const CHAT_JS = path.join(ROOT, 'client', 'js', 'apps', 'core', 'chat.js');
const APP_JS  = path.join(ROOT, 'client', 'js', 'app.js');
const ENTITY_UI_JS = path.join(ROOT, 'client', 'js', 'apps', 'core', 'entity-ui.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// ── helpers ────────────────────────────────────────────────
function hasDecl(src, sig) {
  return src.includes(sig);
}

// ============================================================
// 1. Functions that MUST be in chat.js
// ============================================================

test('chat.js owns core SSE connection: initBrainSSE', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function initBrainSSE()'), 'chat.js must define initBrainSSE()');
});

test('chat.js owns brain status indicator: updateBrainIndicator', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function updateBrainIndicator('), 'chat.js must define updateBrainIndicator()');
});

test('chat.js owns chat reset: clearChat', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function clearChat()'), 'chat.js must define clearChat()');
});

test('chat.js owns message renderer: addChatBubble', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function addChatBubble(role, text)'), 'chat.js must define addChatBubble()');
});

test('chat.js owns log appender: addSystemToLog', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function addSystemToLog(text)'), 'chat.js must define addSystemToLog()');
});

test('chat.js owns scroll helper: scrollChatBottom', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function scrollChatBottom(force)'), 'chat.js must define scrollChatBottom()');
});

test('chat.js owns entity guard predicate: hasCheckedOutEntityContext', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function hasCheckedOutEntityContext()'), 'chat.js must define hasCheckedOutEntityContext()');
});

test('chat.js owns guard sync: syncContextChatGuard', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function syncContextChatGuard()'), 'chat.js must define syncContextChatGuard()');
});

test('chat.js owns keyboard input handler: chatKeyDown', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function chatKeyDown(e)'), 'chat.js must define chatKeyDown()');
});

test('chat.js owns main send pipeline: sendChatMessage', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'async function sendChatMessage()'), 'chat.js must define sendChatMessage()');
});

test('chat.js owns LTM compression: compressChat', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'async function compressChat()'), 'chat.js must define compressChat()');
});

test('chat.js owns typing simulation engine: renderAssistantTyping', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'async function renderAssistantTyping(contentEl, text)'), 'chat.js must define renderAssistantTyping()');
});

test('chat.js owns drag-and-drop handlers: chatDragOver, chatDragLeave, chatDrop', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function chatDragOver('), 'chat.js must define chatDragOver()');
  assert.ok(hasDecl(src, 'function chatDragLeave('), 'chat.js must define chatDragLeave()');
  assert.ok(hasDecl(src, 'function chatDrop('), 'chat.js must define chatDrop()');
});

test('chat.js owns paste handler: setupPasteDetection', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function setupPasteDetection()'), 'chat.js must define setupPasteDetection()');
});

test('chat.js owns typing queue: queueTyping', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function queueTyping(fn)'), 'chat.js must define queueTyping()');
});

test('chat.js owns REM status banner: showRemStatusBannerOnce', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function showRemStatusBannerOnce()'), 'chat.js must define showRemStatusBannerOnce()');
});

test('chat.js owns HTML escape helper: escapeHtml', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function escapeHtml('), 'chat.js must define escapeHtml()');
});

test('chat.js owns subconscious helpers', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function runSubconsciousBootstrap()'), 'chat.js must define runSubconsciousBootstrap()');
  assert.ok(hasDecl(src, 'async function runSubconsciousTurn('), 'chat.js must define runSubconsciousTurn()');
});

test('chat.js owns skill approval helpers', () => {
  const src = read(CHAT_JS);
  assert.ok(hasDecl(src, 'function formatSkillApprovalPreview('), 'chat.js must define formatSkillApprovalPreview()');
  assert.ok(hasDecl(src, 'async function resolvePendingSkillApproval('), 'chat.js must define resolvePendingSkillApproval()');
});

// ============================================================
// 2. Functions NOT in chat.js (still owned by app.js permanently)
//    P3-S13 move targets (loadSystemPrompt, flushPendingSystemPrompt,
//    runStartupResumeRecap) have been moved — see Section 6.
// ============================================================

test('chat.js does NOT define resetChatForEntitySwitch (bridge — stays in app.js permanently)', () => {
  const src = read(CHAT_JS);
  assert.ok(
    !hasDecl(src, 'function resetChatForEntitySwitch('),
    'resetChatForEntitySwitch() must NOT be in chat.js — it is the entity/chat handoff bridge in app.js'
  );
});

test('chat.js does NOT define saveMemoryToServer (shared utility — stays in app.js)', () => {
  const src = read(CHAT_JS);
  assert.ok(
    !hasDecl(src, 'async function saveMemoryToServer('),
    'saveMemoryToServer() must NOT be in chat.js — shared with sleep.js'
  );
});

test('chat.js does NOT define saveSessionMetaToServer (shared utility — stays in app.js)', () => {
  const src = read(CHAT_JS);
  assert.ok(
    !hasDecl(src, 'async function saveSessionMetaToServer('),
    'saveSessionMetaToServer() must NOT be in chat.js — shared with sleep.js'
  );
});

// ============================================================
// 3. Shared state MUST be declared in app.js
// ============================================================

test('app.js owns shared chat state: chatHistory', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, 'let chatHistory = []'), 'app.js must declare chatHistory as shared state');
});

test('app.js owns shared chat state: chatBusy', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, 'let chatBusy = false'), 'app.js must declare chatBusy as shared state');
});

test('app.js owns shared chat state: chatArchive', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, "let chatArchive = ''"), 'app.js must declare chatArchive as shared state');
});

test('app.js owns shared chat state: chatRawSource', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, "let chatRawSource = ''"), 'app.js must declare chatRawSource as shared state');
});

test('app.js owns shared chat state: pendingSystemPromptText', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, 'let pendingSystemPromptText = null'), 'app.js must declare pendingSystemPromptText as shared state');
});

test('app.js owns shared chat state: loadedArchives', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, 'let loadedArchives = []'), 'app.js must declare loadedArchives as shared state');
});

test('app.js owns shared chat state: contextStreamActive', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, 'let contextStreamActive = false'), 'app.js must declare contextStreamActive as shared state');
});

test('app.js owns shared chat state: subconsciousBootstrapped', () => {
  const src = read(APP_JS);
  assert.ok(hasDecl(src, 'let subconsciousBootstrapped = false'), 'app.js must declare subconsciousBootstrapped as shared state');
});

// ============================================================
// 4. Cross-boundary export: syncContextChatGuard
// ============================================================

test('chat.js exports syncContextChatGuard as window property for app.js access', () => {
  const src = read(CHAT_JS);
  assert.ok(
    /window\.syncContextChatGuard\s+=\s+syncContextChatGuard/.test(src),
    'chat.js must export syncContextChatGuard as window.syncContextChatGuard'
  );
});

test('entity-ui.js calls syncContextChatGuard via typeof guard (not direct call)', () => {
  // refreshSidebarEntities (now in entity-ui.js, P3-S14) owns the cross-module guard call.
  const src = read(ENTITY_UI_JS);
  assert.ok(
    hasDecl(src, "typeof syncContextChatGuard === 'function'"),
    "entity-ui.js must call syncContextChatGuard through a typeof guard — it's a cross-module reference"
  );
});

// ============================================================
// 5. app.js must NOT own core chat send/render functions
// ============================================================

test('app.js does NOT define clearChat', () => {
  const src = read(APP_JS);
  assert.ok(
    !hasDecl(src, 'function clearChat()'),
    'clearChat() must NOT be defined in app.js — it belongs to chat.js'
  );
});

test('app.js does NOT define addChatBubble', () => {
  const src = read(APP_JS);
  assert.ok(
    !hasDecl(src, 'function addChatBubble('),
    'addChatBubble() must NOT be defined in app.js — it belongs to chat.js'
  );
});

test('app.js does NOT define addSystemToLog', () => {
  const src = read(APP_JS);
  assert.ok(
    !hasDecl(src, 'function addSystemToLog('),
    'addSystemToLog() must NOT be defined in app.js — it belongs to chat.js'
  );
});

test('app.js does NOT define sendChatMessage', () => {
  const src = read(APP_JS);
  assert.ok(
    !hasDecl(src, 'function sendChatMessage()'),
    'sendChatMessage() must NOT be defined in app.js — it belongs to chat.js'
  );
});

test('app.js does NOT define compressChat', () => {
  const src = read(APP_JS);
  assert.ok(
    !hasDecl(src, 'function compressChat()'),
    'compressChat() must NOT be defined in app.js — it belongs to chat.js'
  );
});

// ============================================================
// 6. P3-S13 move-target baseline — locks current app.js location
//    These assertions will INVERT in P3-S13 (move chat.js, remove app.js).
// ============================================================

// ── P3-S13 completed: baseline assertions inverted ────────

test('P3-S13: loadSystemPrompt is now in chat.js', () => {
  const chatSrc = read(CHAT_JS);
  const appSrc  = read(APP_JS);
  assert.ok(
    hasDecl(chatSrc, 'async function loadSystemPrompt()'),
    'loadSystemPrompt() must be defined in chat.js after P3-S13'
  );
  assert.ok(
    !hasDecl(appSrc, 'async function loadSystemPrompt()'),
    'loadSystemPrompt() must NOT remain in app.js after P3-S13'
  );
});

test('P3-S13: flushPendingSystemPrompt is now in chat.js', () => {
  const chatSrc = read(CHAT_JS);
  const appSrc  = read(APP_JS);
  assert.ok(
    hasDecl(chatSrc, 'function flushPendingSystemPrompt()'),
    'flushPendingSystemPrompt() must be defined in chat.js after P3-S13'
  );
  assert.ok(
    !hasDecl(appSrc, 'function flushPendingSystemPrompt()'),
    'flushPendingSystemPrompt() must NOT remain in app.js after P3-S13'
  );
});

test('P3-S13: runStartupResumeRecap is now in chat.js', () => {
  const chatSrc = read(CHAT_JS);
  const appSrc  = read(APP_JS);
  assert.ok(
    hasDecl(chatSrc, 'async function runStartupResumeRecap('),
    'runStartupResumeRecap() must be defined in chat.js after P3-S13'
  );
  assert.ok(
    !hasDecl(appSrc, 'async function runStartupResumeRecap('),
    'runStartupResumeRecap() must NOT remain in app.js after P3-S13'
  );
});

test('P3-S13 baseline: resetChatForEntitySwitch is currently in app.js (permanent bridge)', () => {
  const src = read(APP_JS);
  assert.ok(
    hasDecl(src, 'function resetChatForEntitySwitch('),
    'resetChatForEntitySwitch() must be in app.js — entity/chat handoff bridge; does NOT move in P3-S13'
  );
});
