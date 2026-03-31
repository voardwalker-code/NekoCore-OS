// ── Tests · Shadow Cleanup A0 Guards.Test ────────────────────────────────────────────────────
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
const INDEX_PATH = path.join(ROOT, 'client', 'index.html');
const APP_PATH = path.join(ROOT, 'client', 'js', 'app.js');
const DESKTOP_PATH = path.join(ROOT, 'client', 'js', 'desktop.js');
const WINDOW_MANAGER_PATH = path.join(ROOT, 'client', 'js', 'window-manager.js');

const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
const appJs = fs.readFileSync(APP_PATH, 'utf8');
const desktopJs = fs.readFileSync(DESKTOP_PATH, 'utf8');
const windowManagerJs = fs.readFileSync(WINDOW_MANAGER_PATH, 'utf8');

const scriptSrcs = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
// scriptIndex()
// WHAT THIS DOES: scriptIndex is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call scriptIndex(...) where this helper behavior is needed.
function scriptIndex(src) {
  return scriptSrcs.indexOf(src);
}

test('A-0 guard: shell bootstrap script order remains stable for launcher and shadow cleanup work', () => {
  const requiredOrder = [
    'js/login.js',
    'js/apps/non-core-html-loader.js',
    'js/apps/system-apps-adapter.js',
    'js/app.js',
    'js/desktop.js',
    'js/window-manager.js',
    'js/vfs.js',
    'js/boot.js'
  ];

  requiredOrder.forEach((src) => {
    assert.notStrictEqual(scriptIndex(src), -1, `index.html must include ${src}`);
  });

  for (let index = 1; index < requiredOrder.length; index += 1) {
    const previous = requiredOrder[index - 1];
    const current = requiredOrder[index];
    assert.ok(
      scriptIndex(previous) < scriptIndex(current),
      `${previous} must load before ${current}`
    );
  }
});

test('A-0 guard: switchMainTab preserves launcher, shortcut, and pinned-shell activation surfaces', () => {
  assert.match(
    appJs,
    /document\.querySelectorAll\('\.tab-btn, \.nav-item, \.os-shortcut, \.os-launcher-item, \.os-start-pinned-app, \.os-start-app-item, \.os-pinned-app, \.os-dash-app, \.os-overflow-app'\)/,
    'switchMainTab must clear active state across launcher, shortcut, and pinned shell surfaces'
  );
  assert.match(appJs, /openWindow\(tabName\);/, 'switchMainTab must continue opening shell windows');
  assert.match(appJs, /closeStartMenu\(\);/, 'switchMainTab must continue closing the start menu after launch');
});

test('A-0 guard: desktop icon entrypoints stay wired to switchMainTab and detached-state sync', () => {
  assert.match(
    desktopJs,
    /const sourceApps = typeof getShellWindowApps === 'function' \? getShellWindowApps\(\) : WINDOW_APPS;/,
    'desktop.js must resolve app source via getShellWindowApps() with WINDOW_APPS fallback'
  );
  assert.match(
    desktopJs,
    /function createPinnedButton\(app, className\)[\s\S]*button\.onclick = function\(\) \{ taskbarAppClick\(app\.tab\); \};/,
    'createPinnedButton must keep taskbar icon launches routed through taskbarAppClick'
  );
  assert.match(
    desktopJs,
    /dashBtn\.onclick = function\(\) \{ switchMainTab\(app\.tab, dashBtn\); \};/,
    'renderPinnedApps must keep side-dash icon launches routed through switchMainTab'
  );
  assert.match(
    desktopJs,
    /document\.querySelectorAll\('\.os-pinned-app\[data-tab\], \.os-dash-app\[data-tab\], \.os-overflow-app\[data-tab\], \.os-shortcut\[data-tab\], \.wm-window\[data-tab\]'\)/,
    'syncDetachedShellStateUI must continue covering desktop shortcuts and shell window surfaces'
  );
  assert.match(desktopJs, /document\.querySelectorAll\('\.os-launcher-item\[data-tab\]'\)/, 'syncDetachedShellStateUI must continue covering launcher entries');
});

test('A-0 guard: launcher builder preserves data-tab launch buttons and detached sync hook', () => {
  assert.match(
    windowManagerJs,
    /const sourceApps = typeof getShellWindowApps === 'function' \? getShellWindowApps\(\) : WINDOW_APPS;/,
    'buildLauncherMenu must use adapter-resolved app source with WINDOW_APPS fallback'
  );
  assert.match(windowManagerJs, /button\.setAttribute\('data-tab', app\.launchTab\);/, 'launcher items must preserve data-tab metadata');
  assert.match(
    windowManagerJs,
    /button\.onclick = function\(\) \{ switchMainTab\(app\.launchTab, button\); \};/,
    'launcher buttons must keep opening apps through switchMainTab'
  );
  assert.match(
    windowManagerJs,
    /if \(typeof syncDetachedShellStateUI === 'function'\)[\s\S]*syncDetachedShellStateUI\(\)/,
    'buildLauncherMenu must continue resyncing detached shell state after rebuilds'
  );
});

test('B-2 guard: app bootstrap applies system-apps compatibility adapter with legacy fallback', () => {
  assert.match(appJs, /window\.SystemAppsAdapter && typeof window\.SystemAppsAdapter\.applyCompat === 'function'/, 'app.js must guard adapter usage behind capability checks');
  assert.match(appJs, /windowApps: WINDOW_APPS/, 'app.js must pass WINDOW_APPS into compatibility adapter');
  assert.match(appJs, /categoryByTab: APP_CATEGORY_BY_TAB/, 'app.js must pass APP_CATEGORY_BY_TAB into compatibility adapter');
  assert.match(appJs, /function getShellWindowApps\(\)/, 'app.js must expose getShellWindowApps() for compatibility-mode app sourcing');
  assert.match(appJs, /window\.getShellWindowApps = getShellWindowApps;/, 'app.js must publish getShellWindowApps globally');
  assert.match(appJs, /window\.__systemAppsCompatStatus = systemAppsCompatStatus;/, 'app.js must expose compatibility status for diagnostics');
});