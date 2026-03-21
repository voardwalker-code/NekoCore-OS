'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const simpleProviderSrc = fs.readFileSync(path.join(ROOT, 'client', 'js', 'apps', 'core', 'simple-provider.js'), 'utf8');
const configRoutesSrc = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'config-routes.js'), 'utf8');
const indexHtmlSrc = fs.readFileSync(path.join(ROOT, 'client', 'index.html'), 'utf8');
const tabSettingsHtmlSrc = fs.readFileSync(path.join(ROOT, 'client', 'apps', 'core', 'tab-settings.html'), 'utf8');

test('simple provider preserves saved OpenRouter key when settings field is blank', () => {
  assert.match(simpleProviderSrc, /const SIMPLE_PROVIDER_REDACTED_KEY = '••••••••';/, 'simple-provider.js must define the redacted API key sentinel');
  assert.match(simpleProviderSrc, /function _simpleHasStoredOpenRouterKey\(\)/, 'simple-provider.js must detect an already-saved OpenRouter key');
  assert.match(simpleProviderSrc, /mainKey = typedKey \|\| \(hasStoredKey \? SIMPLE_PROVIDER_REDACTED_KEY : ''\);/, 'simple-provider.js must preserve a saved key when the visible field is blank');
});

test('entity config route merges redacted keys back before normalizing runtime config', () => {
  assert.match(configRoutesSrc, /const mergedConfig = mergeKeysBack\(config, mergeBase\);/, 'config-routes.js must merge stored keys back into entity-config writes');
  assert.match(configRoutesSrc, /const normalizedConfig = normalizeIncomingRuntimeConfig\(mergedConfig\);/, 'config-routes.js must normalize the merged config rather than the raw client payload');
});

test('settings provider buttons and labels no longer render missing icon placeholders', () => {
  assert.match(tabSettingsHtmlSrc, /simpleProviderBtn-openrouter[\s\S]*&#9729; OpenRouter/, 'tab-settings.html must render the OpenRouter settings button with an icon');
  assert.match(tabSettingsHtmlSrc, /simpleProviderBtn-ollama[\s\S]*&#128302; Ollama \(Local\)/, 'tab-settings.html must render the Ollama settings button with an icon');
  assert.match(tabSettingsHtmlSrc, /Sign up here &#8599;/, 'tab-settings.html must render the OpenRouter signup link with an external-link arrow');
  assert.match(tabSettingsHtmlSrc, /&#9881; Advanced - per-stage model overrides/, 'tab-settings.html must render the advanced settings summary without placeholder glyphs');
});