// ── Tests · Physical Ui Extraction Guards.Test ────────────────────────────────────────────────────
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.resolve(__dirname, '../../client/js');
const clientRoot = path.resolve(__dirname, '../../client');

const appSrc = readFileSync(path.join(jsRoot, 'app.js'), 'utf8');
const physicalSrc = readFileSync(path.join(jsRoot, 'apps', 'optional', 'physical-ui.js'), 'utf8');
const indexSrc = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

test('app.js contains P3-S5 physical redirect comment', () => {
  assert.ok(appSrc.includes('Physical Body and deep-sleep UI helpers moved to client/js/physical-ui.js (P3-S5)'));
});

test('app.js no longer defines initPhysicalTab', () => {
  assert.equal(/^function initPhysicalTab\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines initChatPhysical', () => {
  assert.equal(/^function initChatPhysical\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines saveDeepSleepInterval', () => {
  assert.equal(/^async function saveDeepSleepInterval\s*\(/m.test(appSrc), false);
});

test('physical-ui.js defines initPhysicalTab and connectPhysicalSSE', () => {
  assert.ok(/^function initPhysicalTab\s*\(/m.test(physicalSrc));
  assert.ok(/^function connectPhysicalSSE\s*\(/m.test(physicalSrc));
});

test('physical-ui.js defines chat physical hooks', () => {
  assert.ok(/^function updateChatPhysical\s*\(/m.test(physicalSrc));
  assert.ok(/^function initChatPhysical\s*\(/m.test(physicalSrc));
});

test('physical-ui.js defines deep-sleep interval helpers', () => {
  assert.ok(/^function updateDeepSleepIntervalLabel\s*\(/m.test(physicalSrc));
  assert.ok(/^async function fetchDeepSleepInterval\s*\(/m.test(physicalSrc));
  assert.ok(/^async function saveDeepSleepInterval\s*\(/m.test(physicalSrc));
});

test('index.html loads physical-ui.js after sleep.js', () => {
  const sleepIndex = indexSrc.indexOf('<script src="js/sleep.js"></script>');
  const physicalIndex = indexSrc.indexOf('<script src="js/apps/optional/physical-ui.js"></script>');
  assert.notEqual(sleepIndex, -1);
  assert.notEqual(physicalIndex, -1);
  assert.ok(physicalIndex > sleepIndex);
});
