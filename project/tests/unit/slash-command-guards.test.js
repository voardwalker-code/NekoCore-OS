// ── Tests · Slash Command Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// Slash Command System — Guard Tests
// Verifies structure, registry completeness, and security properties.
// These run before any implementation changes are made to catch regressions early.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SLASH_FILE = resolve('client/js/apps/core/slash-commands.js');
const CHAT_FILE  = resolve('client/js/apps/core/chat.js');
const CHAT_HTML  = resolve('client/apps/core/tab-chat.html');

// ── File existence ────────────────────────────────────────────────────────────

test('slash-commands.js exists', () => {
  assert.ok(existsSync(SLASH_FILE), 'slash-commands.js should exist');
});

// ── Command registry ──────────────────────────────────────────────────────────

const SRC = existsSync(SLASH_FILE) ? readFileSync(SLASH_FILE, 'utf8') : '';

test('slash-commands.js registers /task', () => {
  assert.ok(SRC.includes("cmd: 'task'"), '/task registered');
});
test('slash-commands.js registers /project', () => {
  assert.ok(SRC.includes("cmd: 'project'"), '/project registered');
});
test('slash-commands.js registers /skill', () => {
  assert.ok(SRC.includes("cmd: 'skill'"), '/skill registered');
});
test('slash-commands.js registers /websearch', () => {
  assert.ok(SRC.includes("cmd: 'websearch'"), '/websearch registered');
});
test('slash-commands.js registers /stop', () => {
  assert.ok(SRC.includes("cmd: 'stop'"), '/stop registered');
});
test('slash-commands.js registers /list', () => {
  assert.ok(SRC.includes("cmd: 'list'"), '/list registered');
});
test('slash-commands.js registers /listactive', () => {
  assert.ok(SRC.includes("cmd: 'listactive'"), '/listactive registered');
});

// ── Public API surface ────────────────────────────────────────────────────────

test('slash-commands.js exposes window.SlashCommands', () => {
  assert.ok(SRC.includes('window.SlashCommands'), 'global must be exposed');
});
test('slash-commands.js has dispatch function', () => {
  assert.ok(SRC.includes('function dispatch'), 'dispatch required');
});
test('slash-commands.js has task wizard submit', () => {
  assert.ok(SRC.includes('_submitTaskWizard'), 'wizard submit required');
});
test('slash-commands.js has closeTaskWizard', () => {
  assert.ok(SRC.includes('closeTaskWizard'), 'close wizard required');
});
test('slash-commands.js has updateScheduleFields', () => {
  assert.ok(SRC.includes('_updateScheduleFields'), 'schedule field toggle required');
});

// ── Security properties ───────────────────────────────────────────────────────

test('slash-commands.js has no eval()', () => {
  assert.ok(!SRC.includes('eval('), 'eval() must not be used');
});
test('slash-commands.js escapes skill names before DOM insertion', () => {
  assert.ok(SRC.includes('_escHtml') || SRC.includes('escapeHtml') || SRC.includes('replace('),
    'skill names from API must be sanitized before DOM insertion');
});

// ── chat.js integration points ────────────────────────────────────────────────

const CHAT_SRC = existsSync(CHAT_FILE) ? readFileSync(CHAT_FILE, 'utf8') : '';

test('chat.js exposes getActiveEntityId on window', () => {
  assert.ok(CHAT_SRC.includes('window.getActiveEntityId'), 'entity ID must be exposed');
});
test('chat.js calls SlashCommands.handleKey in chatKeyDown', () => {
  assert.ok(CHAT_SRC.includes('SlashCommands') && CHAT_SRC.includes('handleKey'),
    'slash picker key handling must be wired');
});
test('chat.js dispatches slash commands in sendChatMessage', () => {
  assert.ok(CHAT_SRC.includes('SlashCommands') && CHAT_SRC.includes('dispatch'),
    'slash dispatch must be wired in sendChatMessage');
});

// ── tab-chat.html structure ───────────────────────────────────────────────────

const HTML_SRC = existsSync(CHAT_HTML) ? readFileSync(CHAT_HTML, 'utf8') : '';

test('tab-chat.html contains slash picker element', () => {
  assert.ok(HTML_SRC.includes('id="slashPicker"'), 'slash picker div required');
});
test('tab-chat.html contains task wizard element', () => {
  assert.ok(HTML_SRC.includes('id="taskWizard"'), 'task wizard div required');
});
test('tab-chat.html contains task wizard description textarea', () => {
  assert.ok(HTML_SRC.includes('id="taskWizardDesc"'), 'description textarea required');
});
test('tab-chat.html contains schedule radio buttons', () => {
  assert.ok(HTML_SRC.includes('twSchedule'), 'schedule radio name required');
});
