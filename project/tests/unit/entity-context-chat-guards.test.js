// ── Tests · Entity Context Chat Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:fs, node:path. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const pipelineSrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'pipeline.js'), 'utf8');

test('callChatLLM selects the latest user turn as /api/chat message payload', () => {
  assert.match(
    pipelineSrc,
    /if \(messages\[i\] && messages\[i\]\.role === 'user'\) return i;/,
    'pipeline.js must search backward for the latest user turn before posting to /api/chat'
  );
  assert.match(
    pipelineSrc,
    /message: currentMessage\.content \|\| ''/,
    'pipeline.js must post the latest user turn as the primary /api/chat message payload'
  );
  assert.match(
    pipelineSrc,
    /chatHistory: historyForServer/,
    'pipeline.js must preserve system subconscious context in chatHistory instead of promoting it to message'
  );
});