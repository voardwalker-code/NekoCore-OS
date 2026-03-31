// ── Tests · Creator Mode Card Visual Guards.Test ────────────────────────────────────────────────────
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
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const CREATOR_HTML = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'entity-creator', 'index.html'), 'utf8');
const CREATOR_CSS = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'entity-creator', 'entity-creator.css'), 'utf8');

test('creator mode cards keep explicit visual identity hooks', () => {
  assert.match(CREATOR_HTML, /entity-mode-card entity-mode-card--random/, 'Random creator mode must keep its package-scoped visual class');
  assert.match(CREATOR_HTML, /entity-mode-card entity-mode-card--empty/, 'Empty creator mode must keep its package-scoped visual class');
  assert.match(CREATOR_HTML, /entity-mode-card entity-mode-card--guided/, 'Guided creator mode must keep its package-scoped visual class');
  assert.match(CREATOR_HTML, /entity-mode-card entity-mode-card--character/, 'Character creator mode must keep its package-scoped visual class');
});

test('creator package css overrides shared glass cards with distinct mode backgrounds', () => {
  assert.match(CREATOR_CSS, /\.creator-shell \.entity-mode-card \{[\s\S]*min-height: 220px;[\s\S]*background-size: cover;/, 'Creator package CSS must own the mode-card layout and background treatment');
  assert.match(CREATOR_CSS, /\.creator-shell \.entity-mode-card--random::before \{[\s\S]*background-image:/, 'Random creator mode must define a dedicated background');
  assert.match(CREATOR_CSS, /\.creator-shell \.entity-mode-card--empty::before \{[\s\S]*background-image:/, 'Empty creator mode must define a dedicated background');
  assert.match(CREATOR_CSS, /\.creator-shell \.entity-mode-card--guided::before \{[\s\S]*background-image:/, 'Guided creator mode must define a dedicated background');
  assert.match(CREATOR_CSS, /\.creator-shell \.entity-mode-card--character::before \{[\s\S]*background-image:/, 'Character creator mode must define a dedicated background');
});