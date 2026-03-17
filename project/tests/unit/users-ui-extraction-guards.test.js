import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.resolve(__dirname, '../../client/js');
const clientRoot = path.resolve(__dirname, '../../client');

const appSrc = readFileSync(path.join(jsRoot, 'app.js'), 'utf8');
const usersUiSrc = readFileSync(path.join(jsRoot, 'apps', 'core', 'users-ui.js'), 'utf8');
const indexSrc = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

test('app.js contains P3-S6 users redirect comment', () => {
  assert.ok(appSrc.includes('USER SWITCHER + USERS APP helpers moved to client/js/users-ui.js (P3-S6)'));
});

test('app.js no longer defines toggleUserPanel', () => {
  assert.equal(/^function toggleUserPanel\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines initUserSwitcher', () => {
  assert.equal(/^async function initUserSwitcher\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines usersAppRefresh', () => {
  assert.equal(/^async function usersAppRefresh\s*\(/m.test(appSrc), false);
});

test('users-ui.js defines user-switcher entry points', () => {
  assert.ok(/^function toggleUserPanel\s*\(/m.test(usersUiSrc));
  assert.ok(/^async function initUserSwitcher\s*\(/m.test(usersUiSrc));
  assert.ok(/^function resetUserSwitcher\s*\(/m.test(usersUiSrc));
});

test('users-ui.js defines users app entry points', () => {
  assert.ok(/^async function usersAppRefresh\s*\(/m.test(usersUiSrc));
  assert.ok(/^async function usersAppCreateUser\s*\(/m.test(usersUiSrc));
  assert.ok(/^async function usersAppDelete\s*\(/m.test(usersUiSrc));
});

test('index.html loads users-ui.js after physical-ui.js', () => {
  const physicalIndex = indexSrc.indexOf('<script src="js/apps/optional/physical-ui.js"></script>');
  const usersUiIndex = indexSrc.indexOf('<script src="js/apps/core/users-ui.js"></script>');
  assert.notEqual(physicalIndex, -1);
  assert.notEqual(usersUiIndex, -1);
  assert.ok(usersUiIndex > physicalIndex);
});
