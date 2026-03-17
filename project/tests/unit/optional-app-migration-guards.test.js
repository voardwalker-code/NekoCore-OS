'use strict';

// ============================================================
// C1-0 — Optional App Migration Guards
//
// Guard-first tests for migrating all remaining optional-class
// app modules from the flat js/ directory into js/apps/optional/.
//
// These tests define the TARGET state after C1-1 through C1-3.
// On first run (before migration) the path-existence and
// index.html-path tests will fail — that is expected and correct.
// The hard-call guards (typeof protection) will also fail for
// physical-ui, theme-manager, and visualizer-ui until their
// callers are patched in C1-2.
//
// Modules covered by this file:
//   diary.js          → js/apps/optional/diary.js       (C1-1)
//   theme-manager.js  → js/apps/optional/theme-manager.js (C1-2)
//   physical-ui.js    → js/apps/optional/physical-ui.js  (C1-2)
//   visualizer-ui.js  → js/apps/optional/visualizer-ui.js (C1-2)
//   browser-app.js    → js/apps/optional/browser-app.js  (C1-3)
//   document-digest.js→ js/apps/optional/document-digest.js (C1-3)
//   skills-ui.js      → js/apps/optional/skills-ui.js    (C1-3)
//
// Modules NOT moved (shell-critical, excluded from optional migration):
//   vfs.js            — underpins desktop VFS boot (renderDesktop on DOMContentLoaded)
//   neural-viz/*.js   — shared visualizer engine (dependency, not an app module)
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX_HTML   = path.join(ROOT, 'client', 'index.html');
const APP_JS       = path.join(ROOT, 'client', 'js', 'app.js');
const BOOT_JS      = path.join(ROOT, 'client', 'js', 'boot.js');
const DESKTOP_JS   = path.join(ROOT, 'client', 'js', 'desktop.js');
const WIN_MGR_JS   = path.join(ROOT, 'client', 'js', 'window-manager.js');

function JS(...parts) { return path.join(ROOT, 'client', 'js', ...parts); }
function read(filePath) { return fs.readFileSync(filePath, 'utf8'); }

// ============================================================
// 1. DIARY.JS — lifediary + dreamdiary tabs
// ============================================================

const DIARY_NEW = JS('apps', 'optional', 'diary.js');

test('diary.js exists at js/apps/optional/diary.js', () => {
  assert.ok(fs.existsSync(DIARY_NEW), 'diary.js must be at js/apps/optional/diary.js');
});

test('index.html loads diary.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/diary.js'), 'index.html must load diary.js from js/apps/optional');
});

test('diary.js (optional) declares loadLifeDiary entrypoint', () => {
  const src = read(DIARY_NEW);
  assert.ok(src.includes('async function loadLifeDiary()'), 'diary.js must declare loadLifeDiary');
});

test('diary.js (optional) declares loadDreamDiary entrypoint', () => {
  const src = read(DIARY_NEW);
  assert.ok(src.includes('async function loadDreamDiary()'), 'diary.js must declare loadDreamDiary');
});

test('flat-path regression: index.html no longer loads js/diary.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/diary.js"'), 'old flat path js/diary.js must be absent from index.html');
});

// ============================================================
// 2. THEME-MANAGER.JS — themes tab
// ============================================================

const THEME_NEW = JS('apps', 'optional', 'theme-manager.js');

test('theme-manager.js exists at js/apps/optional/theme-manager.js', () => {
  assert.ok(fs.existsSync(THEME_NEW), 'theme-manager.js must be at js/apps/optional/theme-manager.js');
});

test('index.html loads theme-manager.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/theme-manager.js'), 'index.html must load theme-manager.js from js/apps/optional');
});

test('theme-manager.js (optional) declares applyTheme entrypoint', () => {
  const src = read(THEME_NEW);
  assert.ok(src.includes('function applyTheme('), 'theme-manager.js must declare applyTheme');
});

test('theme-manager.js (optional) declares renderThemeGallery entrypoint', () => {
  const src = read(THEME_NEW);
  assert.ok(src.includes('function renderThemeGallery()'), 'theme-manager.js must declare renderThemeGallery');
});

test('flat-path regression: index.html no longer loads js/theme-manager.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/theme-manager.js"'), 'old flat path js/theme-manager.js must be absent from index.html');
});

test('desktop.js guards applyTheme call with typeof check', () => {
  const src = read(DESKTOP_JS);
  assert.ok(
    !src.match(/(?<!typeof\s+applyTheme\s*===\s*['"]function['"]\s*&&\s*)applyTheme\(/) ||
    src.includes('typeof applyTheme === \'function\'') ||
    src.includes('typeof applyTheme === "function"'),
    'desktop.js must not hard-call applyTheme() without a typeof guard'
  );
});

// ============================================================
// 3. PHYSICAL-UI.JS — physical tab + chat physical widget
// ============================================================

const PHYSICAL_NEW = JS('apps', 'optional', 'physical-ui.js');

test('physical-ui.js exists at js/apps/optional/physical-ui.js', () => {
  assert.ok(fs.existsSync(PHYSICAL_NEW), 'physical-ui.js must be at js/apps/optional/physical-ui.js');
});

test('index.html loads physical-ui.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/physical-ui.js'), 'index.html must load physical-ui.js from js/apps/optional');
});

test('physical-ui.js (optional) declares initPhysicalTab entrypoint', () => {
  const src = read(PHYSICAL_NEW);
  assert.ok(src.includes('function initPhysicalTab()'), 'physical-ui.js must declare initPhysicalTab');
});

test('physical-ui.js (optional) declares initChatPhysical entrypoint', () => {
  const src = read(PHYSICAL_NEW);
  assert.ok(src.includes('function initChatPhysical()'), 'physical-ui.js must declare initChatPhysical');
});

test('flat-path regression: index.html no longer loads js/physical-ui.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/physical-ui.js"'), 'old flat path js/physical-ui.js must be absent from index.html');
});

test('window-manager.js guards initPhysicalTab call with typeof check', () => {
  const src = read(WIN_MGR_JS);
  assert.ok(
    src.includes("typeof initPhysicalTab === 'function'") ||
    src.includes('typeof initPhysicalTab === "function"'),
    'window-manager.js must guard initPhysicalTab() with typeof before calling it'
  );
});

test('boot.js guards initChatPhysical call with typeof check', () => {
  const src = read(BOOT_JS);
  assert.ok(
    src.includes("typeof initChatPhysical === 'function'") ||
    src.includes('typeof initChatPhysical === "function"'),
    'boot.js must guard initChatPhysical() with typeof before calling it'
  );
});

// ============================================================
// 4. VISUALIZER-UI.JS — visualizer tab
// ============================================================

const VIZ_UI_NEW = JS('apps', 'optional', 'visualizer-ui.js');

test('visualizer-ui.js exists at js/apps/optional/visualizer-ui.js', () => {
  assert.ok(fs.existsSync(VIZ_UI_NEW), 'visualizer-ui.js must be at js/apps/optional/visualizer-ui.js');
});

test('index.html loads visualizer-ui.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/visualizer-ui.js'), 'index.html must load visualizer-ui.js from js/apps/optional');
});

test('visualizer-ui.js (optional) declares showMemoryDetail entrypoint', () => {
  const src = read(VIZ_UI_NEW);
  assert.ok(src.includes('function showMemoryDetail('), 'visualizer-ui.js must declare showMemoryDetail');
});

test('visualizer-ui.js (optional) declares showMiniMemoryDetail entrypoint', () => {
  const src = read(VIZ_UI_NEW);
  assert.ok(src.includes('function showMiniMemoryDetail('), 'visualizer-ui.js must declare showMiniMemoryDetail');
});

test('flat-path regression: index.html no longer loads js/visualizer-ui.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/visualizer-ui.js"'), 'old flat path js/visualizer-ui.js must be absent from index.html');
});

test('app.js guards showMiniMemoryDetail call with typeof check', () => {
  const src = read(APP_JS);
  assert.ok(
    src.includes("typeof showMiniMemoryDetail === 'function'") ||
    src.includes('typeof showMiniMemoryDetail === "function"'),
    'app.js must guard showMiniMemoryDetail() with typeof before calling it'
  );
});

// ============================================================
// 5. BROWSER-APP.JS — browser tab
// ============================================================

const BROWSER_NEW = JS('apps', 'optional', 'browser-app.js');

test('browser-app.js exists at js/apps/optional/browser-app.js', () => {
  assert.ok(fs.existsSync(BROWSER_NEW), 'browser-app.js must be at js/apps/optional/browser-app.js');
});

test('index.html loads browser-app.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/browser-app.js'), 'index.html must load browser-app.js from js/apps/optional');
});

test('browser-app.js (optional) declares initBrowserApp entrypoint', () => {
  const src = read(BROWSER_NEW);
  assert.ok(src.includes('async function initBrowserApp()'), 'browser-app.js must declare initBrowserApp');
});

test('flat-path regression: index.html no longer loads js/browser-app.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/browser-app.js"'), 'old flat path js/browser-app.js must be absent from index.html');
});

test('window-manager.js already guards initBrowserApp with typeof', () => {
  const src = read(WIN_MGR_JS);
  assert.ok(
    src.includes("typeof initBrowserApp === 'function'") ||
    src.includes('typeof initBrowserApp === "function"'),
    'window-manager.js must guard initBrowserApp() with typeof'
  );
});

// ============================================================
// 6. DOCUMENT-DIGEST.JS — documents tab
// ============================================================

const DOCS_NEW = JS('apps', 'optional', 'document-digest.js');

test('document-digest.js exists at js/apps/optional/document-digest.js', () => {
  assert.ok(fs.existsSync(DOCS_NEW), 'document-digest.js must be at js/apps/optional/document-digest.js');
});

test('index.html loads document-digest.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/document-digest.js'), 'index.html must load document-digest.js from js/apps/optional');
});

test('document-digest.js (optional) declares initDocumentDigest entrypoint', () => {
  const src = read(DOCS_NEW);
  assert.ok(src.includes('function initDocumentDigest()'), 'document-digest.js must declare initDocumentDigest');
});

test('flat-path regression: index.html no longer loads js/document-digest.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/document-digest.js"'), 'old flat path js/document-digest.js must be absent from index.html');
});

// ============================================================
// 7. SKILLS-UI.JS — skills tab
// ============================================================

const SKILLS_NEW = JS('apps', 'optional', 'skills-ui.js');

test('skills-ui.js exists at js/apps/optional/skills-ui.js', () => {
  assert.ok(fs.existsSync(SKILLS_NEW), 'skills-ui.js must be at js/apps/optional/skills-ui.js');
});

test('index.html loads skills-ui.js from js/apps/optional/', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/skills-ui.js'), 'index.html must load skills-ui.js from js/apps/optional');
});

test('skills-ui.js (optional) declares loadSkillsList entrypoint', () => {
  const src = read(SKILLS_NEW);
  assert.ok(src.includes('async function loadSkillsList()'), 'skills-ui.js must declare loadSkillsList');
});

test('skills-ui.js (optional) declares loadPendingSkills entrypoint', () => {
  const src = read(SKILLS_NEW);
  assert.ok(src.includes('async function loadPendingSkills()'), 'skills-ui.js must declare loadPendingSkills');
});

test('flat-path regression: index.html no longer loads js/skills-ui.js', () => {
  const src = read(INDEX_HTML);
  assert.ok(!src.includes('src="js/skills-ui.js"'), 'old flat path js/skills-ui.js must be absent from index.html');
});

// ============================================================
// 8. VFS.JS — NOT MIGRATED (shell-critical)
// ============================================================

test('vfs.js remains at flat js/vfs.js (shell-critical, not migrated)', () => {
  const src = read(INDEX_HTML);
  assert.ok(
    src.includes('src="js/vfs.js"'),
    'vfs.js must stay at js/vfs.js — it underpins desktop VFS boot and must not be moved to apps/optional'
  );
});

test('vfs.js does NOT exist at apps/optional path', () => {
  assert.ok(
    !fs.existsSync(JS('apps', 'optional', 'vfs.js')),
    'vfs.js must NOT be moved to apps/optional — it is shell-critical'
  );
});

// ============================================================
// 9. DREAM-GALLERY.JS — already migrated (pilot P4-G0), confirm still valid
// ============================================================

const DREAM_GALLERY = JS('apps', 'optional', 'dream-gallery.js');

test('dream-gallery.js remains valid at js/apps/optional/ (P4-G0 pilot)', () => {
  assert.ok(fs.existsSync(DREAM_GALLERY), 'dream-gallery.js must exist at js/apps/optional/dream-gallery.js');
});

test('index.html loads dream-gallery.js from js/apps/optional/ (P4-G0 pilot)', () => {
  const src = read(INDEX_HTML);
  assert.ok(src.includes('js/apps/optional/dream-gallery.js'), 'dream-gallery.js must load from apps/optional');
});
