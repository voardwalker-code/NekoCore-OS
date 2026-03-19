'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const sleepSrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'sleep.js'), 'utf8');
const chatPipelineSrc = fs.readFileSync(path.join(ROOT, 'server', 'services', 'chat-pipeline.js'), 'utf8');

test('sleep.js prefixes wake prompts with INTERNAL-RESUME', () => {
  assert.match(
    sleepSrc,
    /chatHistory\.push\(\{ role: 'user', content: '\[INTERNAL-RESUME\] ' \+ wakeMsg \+ '\\n\\nYou have just woken up\./,
    'sleep.js must prefix wake prompts with [INTERNAL-RESUME] so they bypass task routing'
  );
});

test('chat-pipeline.js bypasses task dispatch for WAKE-FROM-SLEEP prompts', () => {
  assert.ok(
    chatPipelineSrc.includes("const isWakeFromSleep = /^\\s*\\[WAKE-FROM-SLEEP\\]/i.test(String(userMessage || ''));") ,
    'chat-pipeline.js must detect raw [WAKE-FROM-SLEEP] prompts'
  );
  assert.ok(
    chatPipelineSrc.includes('isInternalResume: isInternalResume || isWakeFromSleep,'),
    'chat-pipeline.js must route wake prompts around the task fork'
  );
});