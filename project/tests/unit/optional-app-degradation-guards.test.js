// ── Tests · Optional App Degradation Guards.Test ────────────────────────────────────────────────────
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

// ============================================================
// P4-G0 — Optional App Degradation Guards
//
// These guards ensure optional app wiring does not create hard
// shell-core dependencies that can break boot continuity.
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP_JS = path.join(ROOT, 'client', 'js', 'app.js');
const INDEX_HTML = path.join(ROOT, 'client', 'index.html');
const OPTIONAL_DREAM_GALLERY = path.join(ROOT, 'client', 'js', 'apps', 'optional', 'dream-gallery.js');
// read()
// WHAT THIS DOES: read reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call read(...), then use the returned value in your next step.
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('index.html loads dream gallery from optional app folder', () => {
  const src = read(INDEX_HTML);
  assert.ok(
    src.includes('js/apps/optional/dream-gallery.js'),
    'index.html must load dream-gallery.js from js/apps/optional'
  );
  assert.ok(
    !src.includes('js/dream-gallery.js'),
    'legacy root path js/dream-gallery.js must not remain in index.html'
  );
});

test('optional dream gallery module exists at new path', () => {
  assert.ok(
    fs.existsSync(OPTIONAL_DREAM_GALLERY),
    'optional dream-gallery.js file must exist at js/apps/optional'
  );
});

test('app.js does not hard-call optional dream gallery loader', () => {
  const src = read(APP_JS);
  assert.ok(
    !src.includes('loadDreamGallery('),
    'app.js must not directly call loadDreamGallery to preserve optional-module absence safety'
  );
});

test('optional dream gallery module still exports loader behavior by declaration', () => {
  const src = read(OPTIONAL_DREAM_GALLERY);
  assert.ok(
    src.includes('async function loadDreamGallery()'),
    'optional dream-gallery module must keep loadDreamGallery entrypoint'
  );
});

// ============================================================
// A1-0 Extension — diary.js optional module guards
// (covers lifediary + dreamdiary tabs)
// ============================================================

const DIARY_JS = path.join(ROOT, 'client', 'js', 'apps', 'optional', 'diary.js');

test('app.js does not hard-call loadLifeDiary entrypoint', () => {
  const src = read(APP_JS);
  assert.ok(
    !src.includes('loadLifeDiary('),
    'app.js must not directly call loadLifeDiary to preserve optional-module absence safety'
  );
});

test('app.js does not hard-call loadDreamDiary entrypoint', () => {
  const src = read(APP_JS);
  assert.ok(
    !src.includes('loadDreamDiary('),
    'app.js must not directly call loadDreamDiary to preserve optional-module absence safety'
  );
});

test('diary.js declares loadLifeDiary entrypoint', () => {
  const src = read(DIARY_JS);
  assert.ok(
    src.includes('async function loadLifeDiary()'),
    'diary.js must declare loadLifeDiary entrypoint for lifediary tab'
  );
});

test('diary.js declares loadDreamDiary entrypoint', () => {
  const src = read(DIARY_JS);
  assert.ok(
    src.includes('async function loadDreamDiary()'),
    'diary.js must declare loadDreamDiary entrypoint for dreamdiary tab'
  );
});

// ============================================================
// A1-0 Extension — document-digest.js optional module guards
// (covers documents tab)
// ============================================================

const DOCUMENT_DIGEST_JS = path.join(ROOT, 'client', 'js', 'apps', 'optional', 'document-digest.js');

test('app.js does not hard-call initDocumentDigest entrypoint', () => {
  const src = read(APP_JS);
  assert.ok(
    !src.includes('initDocumentDigest('),
    'app.js must not directly call initDocumentDigest to preserve optional-module absence safety'
  );
});

test('document-digest.js declares initDocumentDigest entrypoint', () => {
  const src = read(DOCUMENT_DIGEST_JS);
  assert.ok(
    src.includes('function initDocumentDigest()'),
    'document-digest.js must declare initDocumentDigest entrypoint for documents tab'
  );
});

// ============================================================
// A1-0 Extension — browser-app.js optional module guards
// (covers browser tab)
// ============================================================

const BROWSER_APP_JS = path.join(ROOT, 'client', 'js', 'apps', 'optional', 'browser-app.js');
const POPOUT_MANAGER_JS = path.join(ROOT, 'client', 'js', 'apps', 'optional', 'popout-manager.js');

test('app.js does not hard-call initBrowserApp entrypoint', () => {
  const src = read(APP_JS);
  assert.ok(
    !src.includes('initBrowserApp('),
    'app.js must not directly call initBrowserApp to preserve optional-module absence safety'
  );
});

test('browser-app.js declares initBrowserApp entrypoint', () => {
  const src = read(BROWSER_APP_JS);
  assert.ok(
    src.includes('async function initBrowserApp()'),
    'browser-app.js must declare initBrowserApp entrypoint for browser tab'
  );
});

test('index.html loads popout-manager.js from optional app folder', () => {
  const src = read(INDEX_HTML);
  assert.ok(
    src.includes('js/apps/optional/popout-manager.js'),
    'index.html must load popout-manager.js from js/apps/optional'
  );
  assert.ok(
    !src.includes('js/popout-manager.js'),
    'legacy root path js/popout-manager.js must not remain in index.html'
  );
});

test('optional popout manager module exists at new path', () => {
  assert.ok(
    fs.existsSync(POPOUT_MANAGER_JS),
    'optional popout-manager.js file must exist at js/apps/optional'
  );
});
