'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

const shadowLoaderJs = readFile(path.join(ROOT, 'client', 'js', 'shadow-content-loader.js'));
const indexHtml = readFile(path.join(ROOT, 'client', 'index.html'));

test('D-2: ShadowContentLoader class exists and is properly defined', () => {
  assert.match(shadowLoaderJs, /class ShadowContentLoader/, 'shadow-content-loader.js must define ShadowContentLoader class');
  assert.match(shadowLoaderJs, /constructor\(appWindow, packagePath, packageEntry\)/, 'constructor must accept appWindow, packagePath, and packageEntry');
  assert.match(shadowLoaderJs, /this\.appWindow = appWindow/, 'constructor must store appWindow reference');
  assert.match(shadowLoaderJs, /this\.packagePath/, 'constructor must initialize packagePath');
  assert.match(shadowLoaderJs, /this\.loaded = false/, 'constructor must initialize loaded flag');
});

test('D-2: ShadowContentLoader provides fetch and parse methods', () => {
  assert.match(shadowLoaderJs, /async fetchPackageHTML\(\)/, 'must have fetchPackageHTML async method');
  assert.match(shadowLoaderJs, /parseHTML\(html\)/, 'must have parseHTML method');
  assert.match(shadowLoaderJs, /await fetch\(\s*'\/'\s*\+\s*this\.packageEntry/, 'fetchPackageHTML must fetch from packageEntry path');
  assert.match(shadowLoaderJs, /const bodyEl = temp\.querySelector\('body'\)/, 'parseHTML must extract body element');
  assert.match(shadowLoaderJs, /Array\.from\(temp\.querySelectorAll\('style'\)\)/, 'parseHTML must extract style elements');
  assert.match(shadowLoaderJs, /Array\.from\(temp\.querySelectorAll\('link\[rel="stylesheet"\]'\)\)/, 'parseHTML must extract stylesheet links');
  assert.match(shadowLoaderJs, /Array\.from\(temp\.querySelectorAll\('script'\)\)/, 'parseHTML must extract script elements');
});

test('D-2: ShadowContentLoader provides safe content injection', () => {
  assert.match(shadowLoaderJs, /injectContent\(parsed\)/, 'must have injectContent method');
  assert.match(shadowLoaderJs, /for \(const styleRef of parsed\.externalStyles\)/, 'must loop through external styles');
  assert.match(shadowLoaderJs, /linkEl\.rel = 'stylesheet'/, 'must set rel attribute on stylesheet links');
  assert.match(shadowLoaderJs, /for \(const style of parsed\.styles\)/, 'must loop through inline styles');
  assert.match(shadowLoaderJs, /styleEl\.textContent = style\.content/, 'must inject style content');
  assert.match(shadowLoaderJs, /for \(const node of parsed\.bodyContent\)/, 'must loop through body nodes');
  assert.match(shadowLoaderJs, /const clone = node\.cloneNode\(true\)/, 'must clone nodes before injection to preserve original');
});

test('D-2: ShadowContentLoader handles script execution safely', () => {
  assert.match(shadowLoaderJs, /for \(const scriptDef of parsed\.scripts\)/, 'must loop through scripts for execution');
  assert.match(shadowLoaderJs, /if \(scriptDef\.src\)/, 'must check for external scripts');
  assert.match(shadowLoaderJs, /else if \(scriptDef\.content\)/, 'must check for inline script content');
  assert.match(shadowLoaderJs, /executeExternalScript\(scriptDef\.src\)/, 'must execute external scripts');
  assert.match(shadowLoaderJs, /executeInlineScript\(scriptDef\.content\)/, 'must execute inline scripts');
  assert.match(shadowLoaderJs, /try\s*\{[\s\S]*?\}\s*catch\s*\(err\)/, 'must wrap script execution in try-catch for safety');
});

test('D-2: ShadowContentLoader executes external scripts via shadow root', () => {
  assert.match(shadowLoaderJs, /executeExternalScript\(src\)/, 'must have executeExternalScript method');
  assert.match(shadowLoaderJs, /const scriptEl = document\.createElement\('script'\)/, 'must create script element');
  assert.match(shadowLoaderJs, /scriptEl\.src = src/, 'must set src attribute');
  assert.match(shadowLoaderJs, /scriptEl\.onerror/, 'must handle script load errors');
  assert.match(shadowLoaderJs, /scriptEl\.onload/, 'must handle script load success');
  assert.match(shadowLoaderJs, /this\.appWindow\.shadowRoot\.appendChild\(scriptEl\)/, 'must append script to shadow root for execution');
});

test('D-2: ShadowContentLoader executes inline scripts with error handling', () => {
  assert.match(shadowLoaderJs, /executeInlineScript\(code\)/, 'must have executeInlineScript method');
  assert.match(shadowLoaderJs, /if \(!code \|\| !code\.trim\(\)\) return/, 'must skip empty scripts');
  assert.match(shadowLoaderJs, /new Function\(code\)\(\)/, 'must execute code via Function constructor');
  assert.match(shadowLoaderJs, /catch \(err\)/, 'must catch execution errors');
  assert.match(shadowLoaderJs, /throw err/, 'must re-throw errors after logging');
});

test('D-2: ShadowContentLoader provides error boundary UI', () => {
  assert.match(shadowLoaderJs, /injectErrorBoundary\(errorMessage\)/, 'must have injectErrorBoundary method');
  assert.match(shadowLoaderJs, /Failed to Load App/, 'error boundary must show failure message');
  assert.match(shadowLoaderJs, /Retry/, 'error boundary must provide retry button');
  assert.match(shadowLoaderJs, /retryBtn\.onclick = \(\) => /, 'retry button must trigger reload');
  assert.match(shadowLoaderJs, /this\.appWindow\.clear\(\)/, 'retry must clear shadow root before reloading');
  assert.match(shadowLoaderJs, /this\.load\(\)/, 'retry must call load to reload content');
});

test('D-2: ShadowContentLoader provides main load() entry point', () => {
  assert.match(shadowLoaderJs, /async load\(\)/, 'must have async load method');
  assert.match(shadowLoaderJs, /if \(this\.loaded\)/, 'must check if already loaded');
  assert.match(shadowLoaderJs, /const html = await this\.fetchPackageHTML\(\)/, 'load must fetch HTML');
  assert.match(shadowLoaderJs, /const parsed = this\.parseHTML\(html\)/, 'load must parse HTML');
  assert.match(shadowLoaderJs, /this\.injectContent\(parsed\)/, 'load must inject content');
  assert.match(shadowLoaderJs, /this\.loaded = true/, 'load must set loaded flag on success');
  assert.match(shadowLoaderJs, /this\.injectErrorBoundary/, 'load must inject error UI on failure');
  assert.match(shadowLoaderJs, /return (true|false)/, 'load must return success/failure boolean');
});

test('D-2: ShadowContentLoader provides lifecycle methods', () => {
  assert.match(shadowLoaderJs, /unload\(\)/, 'must have unload method');
  assert.match(shadowLoaderJs, /isLoaded\(\)/, 'must have isLoaded method');
  assert.match(shadowLoaderJs, /getError\(\)/, 'must have getError method');
  assert.match(shadowLoaderJs, /this\.appWindow\.clear\(\)/, 'unload must clear shadow root');
  assert.match(shadowLoaderJs, /this\.loaded = false/, 'unload must reset loaded flag');
});

test('D-2: ShadowContentLoader provides factory functions', () => {
  assert.match(shadowLoaderJs, /function getOrCreateShadowLoader/, 'must export getOrCreateShadowLoader factory');
  assert.match(shadowLoaderJs, /function getShadowLoader\(tabName\)/, 'must export getShadowLoader retrieval function');
  assert.match(shadowLoaderJs, /window\.__shadowLoaderRegistry = window\.__shadowLoaderRegistry \|\| new Map/, 'factory must use global registry');
  assert.match(shadowLoaderJs, /window\.__shadowLoaderRegistry\.set\(key, loader\)/, 'factory must register instances');
});

test('D-2: ShadowContentLoader is loaded into index.html after app-window.js', () => {
  assert.match(indexHtml, /<script src="js\/app-window\.js"><\/script>\s*<script src="js\/shadow-content-loader\.js"><\/script>/, 'index.html must load shadow-content-loader.js immediately after app-window.js');
});

test('D-2: ShadowContentLoader error handling is defensive', () => {
  assert.match(shadowLoaderJs, /if \(!response\.ok\)/, 'fetchPackageHTML must check HTTP response status');
  assert.match(shadowLoaderJs, /throw new Error/, 'fetchPackageHTML must throw on HTTP errors');
  assert.match(shadowLoaderJs, /if \(!this\.appWindow\.shadowRoot\)/, 'injectContent must validate shadow root exists');
  assert.match(shadowLoaderJs, /console\.warn\(\s*'\[ShadowContentLoader\]/, 'must log warnings for non-fatal errors');
  assert.match(shadowLoaderJs, /console\.error\(\s*'\[ShadowContentLoader\]/, 'must log errors for fatal conditions');
});

test('D-2: ShadowContentLoader preserves script execution order', () => {
  assert.match(shadowLoaderJs, /for \(const scriptDef of parsed\.scripts\)/, 'must iterate scripts in order from parsed array');
  assert.match(shadowLoaderJs, /parseHTML\(html\)[\s\S]*?Array\.from\(temp\.querySelectorAll\('script'\)\)/, 'parseHTML must return scripts array preserving document order');
});

test('D-2: ShadowContentLoader provides fetch path construction', () => {
  assert.match(shadowLoaderJs, /const normalizedEntry = typeof packageEntry === 'string'/, 'constructor must normalize an explicit packageEntry when provided');
  assert.match(shadowLoaderJs, /this\.packageEntry = normalizedEntry \|\| \(this\.packagePath \+ '\/index\.html'\)/, 'constructor must prefer packageEntry and otherwise build it from packagePath');
  assert.match(shadowLoaderJs, /this\.packagePath = packagePath \|\| \('apps\/' \+ appWindow\.tabName\)/, 'constructor must default packagePath to apps/{tabName}');
});

test('D-2: ShadowContentLoader factory accepts packagePath and packageEntry separately', () => {
  assert.match(shadowLoaderJs, /function getOrCreateShadowLoader\(appWindow, packagePath, packageEntry\)/, 'factory must accept packagePath and packageEntry separately');
  assert.match(shadowLoaderJs, /new ShadowContentLoader\(appWindow, packagePath, packageEntry\)/, 'factory must pass packagePath and packageEntry through to the loader');
});
