import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const THEME_CSS = fs.readFileSync(path.join(ROOT, 'client', 'css', 'theme.css'), 'utf8');
const UI_CSS = fs.readFileSync(path.join(ROOT, 'client', 'css', 'ui-v2.css'), 'utf8');
const CREATOR_CSS = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'entity-creator', 'entity-creator.css'), 'utf8');

test('theme font stack includes explicit emoji fallbacks', () => {
  assert.match(THEME_CSS, /--font-emoji:\s*'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Symbol';/, 'theme.css must define an explicit emoji font stack');
  assert.match(THEME_CSS, /--font-sans:\s*'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', var\(--font-emoji\), sans-serif;/, 'theme.css must route the sans stack through emoji fallbacks');
  assert.match(THEME_CSS, /--font-mono:\s*'JetBrains Mono', 'Fira Code', var\(--font-emoji\), monospace;/, 'theme.css must route the mono stack through emoji fallbacks');
});

test('creator and shared icon glyphs use emoji-aware font families', () => {
  assert.match(CREATOR_CSS, /font-family:\s*var\(--font-sans, 'Outfit', 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif\);/, 'entity-creator.css must inherit the shared emoji-aware font stack');
  assert.match(UI_CSS, /\.ctx-menu-item \.ctx-icon \{[\s\S]*font-family: var\(--font-emoji\);[\s\S]*\}/, 'context menu icons must use the emoji font stack');
  assert.match(UI_CSS, /\.entity-mode-icon \{ font-size: 2\.5rem; margin-bottom: var\(--space-3\); font-family: var\(--font-emoji\); \}/, 'entity mode icons must use the emoji font stack');
  assert.match(UI_CSS, /\.hatch-step-icon \{ font-size: 1\.1rem; min-width: 20px; font-family: var\(--font-emoji\); \}/, 'hatch progress icons must use the emoji font stack');
});