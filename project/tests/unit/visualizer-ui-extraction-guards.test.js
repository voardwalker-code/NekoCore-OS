import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.resolve(__dirname, '../../client/js');
const clientRoot = path.resolve(__dirname, '../../client');

const appSrc = readFileSync(path.join(jsRoot, 'app.js'), 'utf8');
const vizUiSrc = readFileSync(path.join(jsRoot, 'apps', 'optional', 'visualizer-ui.js'), 'utf8');
const indexSrc = readFileSync(path.join(clientRoot, 'index.html'), 'utf8');

test('app.js contains P3-S4 visualizer redirect comment', () => {
  assert.ok(appSrc.includes('Visualizer UI helpers moved to client/js/visualizer-ui.js (P3-S4)'));
});

test('app.js no longer defines showMemoryDetail', () => {
  assert.equal(/^function showMemoryDetail\s*\(/m.test(appSrc), false);
});

test('app.js no longer defines setupVizSearch', () => {
  assert.equal(/^function setupVizSearch\s*\(/m.test(appSrc), false);
});

test('app.js no longer registers the visualizer DOMContentLoaded handler', () => {
  assert.equal(appSrc.includes("setupVizSearch('vizSearchInput');"), false);
});

test('visualizer-ui.js defines showMemoryDetail', () => {
  assert.ok(/^function showMemoryDetail\s*\(/m.test(vizUiSrc));
});

test('visualizer-ui.js defines setupVizSearch', () => {
  assert.ok(/^function setupVizSearch\s*\(/m.test(vizUiSrc));
});

test('visualizer-ui.js registers visualizer DOMContentLoaded setup', () => {
  assert.ok(vizUiSrc.includes("document.addEventListener('DOMContentLoaded', function() {"));
  assert.ok(vizUiSrc.includes("setupVizSearch('vizSearchInput');"));
});

test('index.html loads visualizer-ui.js after neural-viz/index.js', () => {
  const vizIndex = indexSrc.indexOf('<script src="js/neural-viz/index.js"></script>');
  const uiIndex = indexSrc.indexOf('<script src="js/apps/optional/visualizer-ui.js"></script>');
  assert.notEqual(vizIndex, -1);
  assert.notEqual(uiIndex, -1);
  assert.ok(uiIndex > vizIndex);
});
