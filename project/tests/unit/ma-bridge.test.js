// ── MA Bridge — Guard & Unit Tests ──────────────────────────────────────────
// Covers:  process-manager-routes exports, ma-bridge service, /ma slash command
// Run with: node --test tests/unit/ma-bridge.test.js  (from project/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const BRIDGE_FILE      = resolve('server/services/ma-bridge.js');
const INTERCEPTOR_FILE = resolve('server/routes/slash-interceptor.js');
const PROC_MGR_FILE    = resolve('server/routes/process-manager-routes.js');
const SLASH_CLIENT     = resolve('client/js/apps/core/slash-commands.js');

// ── File existence ──────────────────────────────────────────────────────────

test('ma-bridge.js exists', () => {
  assert.ok(existsSync(BRIDGE_FILE), 'server/services/ma-bridge.js must exist');
});

test('process-manager-routes.js exists', () => {
  assert.ok(existsSync(PROC_MGR_FILE));
});

test('slash-interceptor.js exists', () => {
  assert.ok(existsSync(INTERCEPTOR_FILE));
});

// ── process-manager-routes exports ──────────────────────────────────────────

test('process-manager-routes exports helper functions', () => {
  const pmr = require(PROC_MGR_FILE);
  assert.equal(typeof pmr, 'function', 'default export is factory');
  assert.equal(typeof pmr.SERVERS, 'object', 'SERVERS exported');
  assert.equal(typeof pmr.startServer, 'function', 'startServer exported');
  assert.equal(typeof pmr.stopServer, 'function', 'stopServer exported');
  assert.equal(typeof pmr.healthCheck, 'function', 'healthCheck exported');
  assert.equal(typeof pmr.readPid, 'function', 'readPid exported');
  assert.equal(typeof pmr.isRunning, 'function', 'isRunning exported');
});

test('SERVERS contains ma entry with correct port', () => {
  const { SERVERS } = require(PROC_MGR_FILE);
  assert.ok(SERVERS.ma, 'ma server entry exists');
  assert.equal(SERVERS.ma.port, 3850);
  assert.equal(SERVERS.ma.healthPath, '/api/health');
});

// ── ma-bridge.js module shape ───────────────────────────────────────────────

test('ma-bridge exports ensureMARunning, callMA, getMAHealth', () => {
  const bridge = require(BRIDGE_FILE);
  assert.equal(typeof bridge.ensureMARunning, 'function');
  assert.equal(typeof bridge.callMA, 'function');
  assert.equal(typeof bridge.getMAHealth, 'function');
});

// ── slash-interceptor source analysis ───────────────────────────────────────

const INTERCEPTOR_SRC = readFileSync(INTERCEPTOR_FILE, 'utf8');

test('slash-interceptor has case for /ma', () => {
  assert.ok(INTERCEPTOR_SRC.includes("case 'ma':"), '/ma case must exist in switch');
});

test('slash-interceptor requires ma-bridge', () => {
  assert.ok(
    INTERCEPTOR_SRC.includes("require('../services/ma-bridge')"),
    'must import ma-bridge service'
  );
});

test('slash-interceptor has _dispatchMA handler', () => {
  assert.ok(INTERCEPTOR_SRC.includes('_dispatchMA'), 'handler function must exist');
});

test('existing slash commands still present', () => {
  for (const cmd of ['task', 'project', 'skill', 'websearch', 'stop', 'list', 'listactive']) {
    assert.ok(INTERCEPTOR_SRC.includes(`case '${cmd}':`), `/${cmd} must still be registered`);
  }
});

test('slash-interceptor exports intercept function', () => {
  assert.ok(INTERCEPTOR_SRC.includes("module.exports = { intercept }"), 'intercept must be exported');
});

// ── client-side slash-commands.js ───────────────────────────────────────────

const SLASH_CLIENT_SRC = existsSync(SLASH_CLIENT) ? readFileSync(SLASH_CLIENT, 'utf8') : '';

test('client slash-commands.js registers /ma', () => {
  assert.ok(SLASH_CLIENT_SRC.includes("cmd: 'ma'"), '/ma registered in client autocomplete');
});

// ── ma-bridge behaviour (unit, no network) ──────────────────────────────────

test('callMA returns structured result shape (mocked)', async () => {
  // We can't call the real MA, but verify the contract by checking the
  // function handles connection-refused gracefully.
  const { callMA } = require(BRIDGE_FILE);
  const result = await callMA('test message');
  // When MA is not running, should return { ok: false, error: ... }
  assert.equal(typeof result, 'object');
  assert.equal(typeof result.ok, 'boolean');
  if (!result.ok) {
    assert.equal(typeof result.error, 'string', 'error message when MA offline');
  }
});

test('getMAHealth returns status shape', async () => {
  const { getMAHealth } = require(BRIDGE_FILE);
  const status = await getMAHealth();
  assert.equal(typeof status, 'object');
  assert.equal(typeof status.running, 'boolean');
  assert.equal(typeof status.healthy, 'boolean');
  assert.equal(status.port, 3850);
});

test('ensureMARunning returns result shape', async () => {
  const { ensureMARunning } = require(BRIDGE_FILE);
  const result = await ensureMARunning();
  assert.equal(typeof result, 'object');
  assert.equal(typeof result.ok, 'boolean');
  // When MA isn't running locally in test, ok could be true or false
  // but structure must be correct
});
