#!/usr/bin/env node
// ============================================================
// NekoCore OS — System Map Generator
// Generates docs/system-map.md and docs/system-map.json
// Run from project root: node scripts/generate-system-map.js
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Configuration ─────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');
const CLIENT_ROOT = path.join(ROOT, 'client');
const SERVER_ROOT = path.join(ROOT, 'server');
const DOCS_DIR    = path.join(ROOT, '..', 'docs');   // ../docs relative to project/
const OUT_MD      = path.join(DOCS_DIR, 'system-map.md');
const OUT_JSON    = path.join(DOCS_DIR, 'system-map.json');

// ── Utilities ─────────────────────────────────────────────────
function log(msg) { process.stdout.write('  ' + msg + '\n'); }

function walkDir(dir, exts, results = []) {
  if (!fs.existsSync(dir)) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip node_modules, .git, test fixtures
      if (['node_modules', '.git', 'tmp-backups', 'restore-snapshots'].includes(e.name)) continue;
      walkDir(full, exts, results);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (exts.includes(ext)) results.push(full);
    }
  }
  return results;
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); }
  catch (_) { return ''; }
}

function lineCount(content) {
  return content ? content.split('\n').length : 0;
}

function relPath(fp) {
  return path.relative(ROOT, fp).replace(/\\/g, '/');
}

function escMd(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/`/g, "'");
}

// ── Collect all files ─────────────────────────────────────────
log('Collecting files...');
const jsFiles   = [...walkDir(CLIENT_ROOT, ['.js']), ...walkDir(SERVER_ROOT, ['.js'])];
const htmlFiles = walkDir(CLIENT_ROOT, ['.html']);
const cssFiles  = walkDir(CLIENT_ROOT, ['.css']);

// Extra HTML files at project root level
for (const f of ['index.html', 'create.html', 'nekocore.html', 'visualizer.html']) {
  const fp = path.join(CLIENT_ROOT, f);
  if (fs.existsSync(fp) && !htmlFiles.includes(fp)) htmlFiles.push(fp);
}

log(`Found ${jsFiles.length} JS, ${htmlFiles.length} HTML, ${cssFiles.length} CSS files`);

// ── Read contents ─────────────────────────────────────────────
const fileContents = {};
[...jsFiles, ...htmlFiles, ...cssFiles].forEach(fp => {
  fileContents[fp] = readFile(fp);
});

// ══════════════════════════════════════════════════════════════
// SECTION 1 — File Inventory
// ══════════════════════════════════════════════════════════════
log('Section 1: File inventory...');

const allFiles = [...jsFiles, ...htmlFiles, ...cssFiles];
const fileInventory = allFiles.map(fp => {
  const content  = fileContents[fp] || '';
  const lines    = lineCount(content);
  const stat     = fs.statSync(fp);
  const modified = stat.mtime.toISOString().slice(0, 10);
  const rel      = relPath(fp);
  const dir      = path.dirname(rel);
  return { path: rel, dir, lines, modified, ext: path.extname(fp) };
}).sort((a, b) => a.dir.localeCompare(b.dir) || a.path.localeCompare(b.path));

// Group by directory
const byDir = {};
for (const f of fileInventory) {
  if (!byDir[f.dir]) byDir[f.dir] = [];
  byDir[f.dir].push(f);
}

const totalLines = fileInventory.reduce((s, f) => s + f.lines, 0);

// ══════════════════════════════════════════════════════════════
// SECTION 2 — Global Function Registry
// ══════════════════════════════════════════════════════════════
log('Section 2: Global function registry...');

// Find window.X = assignments in JS files
const windowAssignments = [];
for (const fp of jsFiles) {
  const content = fileContents[fp] || '';
  const lines   = content.split('\n');
  lines.forEach((line, idx) => {
    // Match: window.foo = ... or window.foo=
    const m = line.match(/window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    if (m && !line.trim().startsWith('//')) {
      windowAssignments.push({
        name: m[1],
        file: relPath(fp),
        line: idx + 1,
        snippet: line.trim().slice(0, 80)
      });
    }
  });
}

// Find all function definitions: function foo(...) { and const foo = function/(...) => in JS files
const funcDefs = {};   // name -> [ { file, line } ]
for (const fp of jsFiles) {
  const content = fileContents[fp] || '';
  const lines   = content.split('\n');
  lines.forEach((line, idx) => {
    // Standard function declaration
    let m = line.match(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (!m) {
      // var/let/const foo = function or foo = async function
      m = line.match(/(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function/);
    }
    if (!m) {
      // top-level arrow: const foo = (...) =>
      m = line.match(/^(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(/);
    }
    if (m && !line.trim().startsWith('//')) {
      const name = m[1];
      if (!funcDefs[name]) funcDefs[name] = [];
      funcDefs[name].push({ file: relPath(fp), line: idx + 1 });
    }
  });
}

// Find inline event handler calls from HTML files
const inlineHandlerCalls = [];   // { funcName, attr, file, line, element }
const inlineHandlerAttrs = ['onclick', 'oninput', 'onkeydown', 'onkeyup', 'onchange', 'onsubmit', 'onfocus', 'onblur', 'onmousedown', 'onmouseup'];
const inlineCallRe = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;

for (const fp of htmlFiles) {
  const content = fileContents[fp] || '';
  const lines   = content.split('\n');
  lines.forEach((line, idx) => {
    for (const attr of inlineHandlerAttrs) {
      const attrRe = new RegExp(attr + '\\s*=\\s*["\']([^"\']+)["\']', 'gi');
      let attrM;
      while ((attrM = attrRe.exec(line)) !== null) {
        const handlerBody = attrM[1];
        let callM;
        while ((callM = inlineCallRe.exec(handlerBody)) !== null) {
          inlineHandlerCalls.push({
            funcName: callM[1],
            attr,
            file: relPath(fp),
            line: idx + 1
          });
        }
        inlineCallRe.lastIndex = 0;
      }
    }
  });
}

// Cross reference — unique inline functions and where they're defined
const inlineFuncNames = [...new Set(inlineHandlerCalls.map(c => c.funcName))];
const inlineFuncRegistry = inlineFuncNames.map(name => {
  const defs     = funcDefs[name] || [];
  const calls    = inlineHandlerCalls.filter(c => c.funcName === name);
  const calledIn = [...new Set(calls.map(c => c.file + ':' + c.line))];
  return {
    name,
    definedIn: defs.length ? defs[0].file : '⚠ not found',
    defLine: defs.length ? defs[0].line : '',
    calledFrom: calledIn.slice(0, 5).join(', ')
  };
}).sort((a, b) => a.name.localeCompare(b.name));

// ══════════════════════════════════════════════════════════════
// SECTION 3 — Script Load Order
// ══════════════════════════════════════════════════════════════
log('Section 3: Script load order...');

const indexHtmlPath = path.join(CLIENT_ROOT, 'index.html');
const indexHtml     = fileContents[indexHtmlPath] || '';
const scriptTags    = [];
const scriptTagRe   = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
const indexLines    = indexHtml.split('\n');

indexLines.forEach((line, idx) => {
  let m;
  scriptTagRe.lastIndex = 0;
  while ((m = scriptTagRe.exec(line)) !== null) {
    const src = m[1];
    const isExternal = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
    let exists = null;
    if (!isExternal) {
      const fp = path.join(CLIENT_ROOT, src);
      exists = fs.existsSync(fp);
    }
    scriptTags.push({ src, line: idx + 1, isExternal, exists });
  }
});

const missingScripts = scriptTags.filter(s => s.exists === false);

// ══════════════════════════════════════════════════════════════
// SECTION 4 — Tab & Slot Registry
// ══════════════════════════════════════════════════════════════
log('Section 4: Tab & slot registry...');

const slotRegistry = [];

const dataCoreTabRe     = /data-core-tab=["']([^"']+)["']/gi;
const dataOptionalTabRe = /data-optional-tab=["']([^"']+)["']/gi;
const dataCoreOverlayRe = /data-core-overlay=["']([^"']+)["']/gi;

function extractSlots(html, re, type, pathBuilder) {
  const items = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(html)) !== null) {
    const id       = m[1];
    const expected = pathBuilder(id);
    const full     = path.join(CLIENT_ROOT, expected);
    items.push({ type, id, slotId: type === 'core-tab' ? 'core-tab-slot-' + id : type === 'optional-tab' ? 'optional-tab-slot-' + id : 'core-overlay-slot-' + id, expectedFile: expected, exists: fs.existsSync(full) });
  }
  return items;
}

slotRegistry.push(
  ...extractSlots(indexHtml, dataCoreTabRe,     'core-tab',     id => `apps/core/tab-${id}.html`),
  ...extractSlots(indexHtml, dataOptionalTabRe, 'optional-tab', id => `apps/non-core/core/tab-${id}.html`),
  ...extractSlots(indexHtml, dataCoreOverlayRe, 'core-overlay', id => `apps/core/overlays/${id}.html`)
);

const missingSlotFiles = slotRegistry.filter(s => !s.exists);

// Also parse non-core-html-loader for the non-core manifest-driven list
const nonCoreManifestPath = path.join(CLIENT_ROOT, 'apps/non-core/non-core-apps.manifest.json');
let nonCoreManifest = [];
if (fs.existsSync(nonCoreManifestPath)) {
  try { nonCoreManifest = JSON.parse(fs.readFileSync(nonCoreManifestPath, 'utf8')); }
  catch (_) {}
  // manifest may have a wrapper key
  if (nonCoreManifest && nonCoreManifest.nonCoreApps) nonCoreManifest = nonCoreManifest.nonCoreApps;
  if (!Array.isArray(nonCoreManifest)) nonCoreManifest = [];
}
const nonCoreSlots = nonCoreManifest.filter(a => a.enabled !== false).map(a => {
  const fp = path.join(CLIENT_ROOT, a.path || '');
  return { type: 'manifest-non-core', id: a.tabId, slotId: 'optional-tab-slot-' + a.tabId, expectedFile: a.path, exists: a.path ? fs.existsSync(fp) : false };
});

// ══════════════════════════════════════════════════════════════
// SECTION 5 — API Endpoint Map
// ══════════════════════════════════════════════════════════════
log('Section 5: API endpoint map...');

const apiCalls = [];
const fetchApiRe = /fetch\s*\(\s*[`'"](\/api\/[^`'"?\s]+)/g;
const fetchApiReWith = /fetch\s*\(\s*[`'"]([^`'"]*\/api\/[^`'"\s?]+)/g;
// Also catch fetch('/api/ + string concatenation
const fetchVarRe = /fetch\s*\(\s*`([^`]*\/api\/[^`]*)`/g;

// Method hints via surrounding context — look for method: 'POST'/'GET' etc up to 5 lines after fetch
function extractMethod(lines, lineIdx) {
  const window = lines.slice(lineIdx, lineIdx + 6).join(' ');
  const mMatch = window.match(/method\s*:\s*['"`]([A-Z]+)['"`]/);
  return mMatch ? mMatch[1] : 'GET';
}

for (const fp of [...jsFiles, ...htmlFiles]) {
  const content = fileContents[fp] || '';
  const lines   = content.split('\n');
  lines.forEach((line, idx) => {
    let m;
    const patterns = [fetchApiRe, fetchApiReWith, fetchVarRe];
    for (const re of patterns) {
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        const raw     = m[1];
        // Normalize: strip template literal vars for display
        const endpoint = raw.replace(/\$\{[^}]+\}/g, '{var}');
        if (endpoint.includes('/api/')) {
          const cleanEndpoint = endpoint.includes('/api/') ? '/api/' + endpoint.split('/api/')[1] : endpoint;
          const method = extractMethod(lines, idx);
          apiCalls.push({
            endpoint: cleanEndpoint.split('?')[0].replace(/[`'"]/g, ''),
            method,
            file: relPath(fp),
            line: idx + 1
          });
        }
      }
    }
  });
}

// Deduplicate and group by endpoint
const apiByEndpoint = {};
for (const c of apiCalls) {
  const key = c.endpoint;
  if (!apiByEndpoint[key]) apiByEndpoint[key] = [];
  // Avoid exact file+line duplicates
  const isDup = apiByEndpoint[key].some(e => e.file === c.file && e.line === c.line);
  if (!isDup) apiByEndpoint[key].push(c);
}
const apiEndpoints = Object.entries(apiByEndpoint)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([endpoint, calls]) => ({ endpoint, calls, multipleCallers: calls.length > 1 }));

// ══════════════════════════════════════════════════════════════
// SECTION 6 — SSE & Event Registry
// ══════════════════════════════════════════════════════════════
log('Section 6: SSE & event registry...');

const sseEntries         = [];
const customEventEntries = [];
const addEventEntries    = [];

const eventSourceRe = /new\s+EventSource\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g;
const ssAddListenerRe = /\.addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g;
const dispatchRe    = /(?:window|document)\.dispatchEvent\s*\(\s*new\s+(?:Custom)?Event\s*\(\s*['"`]([^'"`]+)['"`]/g;
const windowAddRe   = /(?:window|document)\.addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g;

for (const fp of jsFiles) {
  const content = fileContents[fp] || '';
  const lines   = content.split('\n');
  const rel     = relPath(fp);

  lines.forEach((line, idx) => {
    let m;

    // SSE source creation
    eventSourceRe.lastIndex = 0;
    while ((m = eventSourceRe.exec(line)) !== null) {
      sseEntries.push({ endpoint: m[1], file: rel, line: idx + 1, type: 'EventSource' });
    }

    // SSE event listeners on EventSource objects (crude heuristic)
    ssAddListenerRe.lastIndex = 0;
    while ((m = ssAddListenerRe.exec(line)) !== null) {
      // Track all addEventListener calls — filter to SSE vs DOM later by context
      addEventEntries.push({ event: m[1], file: rel, line: idx + 1, raw: line.trim().slice(0, 80) });
    }

    // dispatchEvent calls
    dispatchRe.lastIndex = 0;
    while ((m = dispatchRe.exec(line)) !== null) {
      customEventEntries.push({ event: m[1], file: rel, line: idx + 1, type: 'dispatch' });
    }

    // window/document addEventListener
    windowAddRe.lastIndex = 0;
    while ((m = windowAddRe.exec(line)) !== null) {
      if (!['click', 'keydown', 'keyup', 'resize', 'scroll', 'load', 'DOMContentLoaded', 'blur', 'focus', 'input', 'change', 'submit', 'mousemove', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'visibilitychange', 'beforeunload', 'unload'].includes(m[1])) {
        customEventEntries.push({ event: m[1], file: rel, line: idx + 1, type: 'listen' });
      }
    }
  });
}

// Known SSE event names from source
const knownSseEvents = [];
for (const e of addEventEntries) {
  // SSE events are usually on an EventSource variable — best heuristic: non-DOM events
  const domEvents = new Set(['click','keydown','keyup','input','change','submit','focus','blur','mouseover','mouseout','mousedown','mouseup','resize','scroll','load','DOMContentLoaded','error','abort','progress','message','open','close','touchstart','touchend','contextmenu','dblclick','select','drag','dragstart','dragend','drop','wheel','pointerdown','pointerup','pointermove','pointerenter','pointerleave']);
  if (!domEvents.has(e.event) && e.event.length < 60) {
    knownSseEvents.push(e);
  }
}

// Deduplicate SSE events by name+file
const sseEventMap = {};
for (const e of knownSseEvents) {
  const key = e.event + '|' + e.file;
  sseEventMap[key] = e;
}
const sseEventsUniq = Object.values(sseEventMap).sort((a, b) => a.event.localeCompare(b.event));

// ══════════════════════════════════════════════════════════════
// SECTION 7 — Storage Registry
// ══════════════════════════════════════════════════════════════
log('Section 7: Storage registry...');

const storageEntries = [];
const storageRe = /(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\s*\(\s*['"`]([^'"`]+)['"`]/g;

for (const fp of [...jsFiles, ...htmlFiles]) {
  const content = fileContents[fp] || '';
  const lines   = content.split('\n');
  const rel     = relPath(fp);
  lines.forEach((line, idx) => {
    storageRe.lastIndex = 0;
    let m;
    while ((m = storageRe.exec(line)) !== null) {
      storageEntries.push({ store: m[1], op: m[2], key: m[3], file: rel, line: idx + 1 });
    }
  });
}

storageEntries.sort((a, b) => a.key.localeCompare(b.key));

// ══════════════════════════════════════════════════════════════
// SECTION 8 — CSS sys-inline Class Usage
// ══════════════════════════════════════════════════════════════
log('Section 8: CSS sys-inline class audit...');

const sharedCssPath = path.join(CLIENT_ROOT, 'css/system-shared.css');
const sharedCss     = fileContents[sharedCssPath] || '';

// Extract all defined sys-inline-XXXX classes from system-shared.css
const cssClassRe = /\.(sys-inline-[A-Za-z0-9_-]+)\b/g;
const definedCssClasses = new Set();
let cssM;
while ((cssM = cssClassRe.exec(sharedCss)) !== null) {
  definedCssClasses.add(cssM[1]);
}

// Find all usages in HTML files
const htmlClassUsages = {};  // className -> [file]
const htmlClassRe = /class=["'][^"']*\b(sys-inline-[A-Za-z0-9_-]+)\b[^"']*["']/g;

for (const fp of htmlFiles) {
  const content = fileContents[fp] || '';
  const rel     = relPath(fp);
  htmlClassRe.lastIndex = 0;
  let m;
  while ((m = htmlClassRe.exec(content)) !== null) {
    const cls = m[1];
    if (!htmlClassUsages[cls]) htmlClassUsages[cls] = [];
    if (!htmlClassUsages[cls].includes(rel)) htmlClassUsages[cls].push(rel);
  }
}

// Also check JS files that may set className or classList
const jsClassRe = /(sys-inline-[A-Za-z0-9_-]+)/g;
for (const fp of jsFiles) {
  const content = fileContents[fp] || '';
  const rel     = relPath(fp);
  jsClassRe.lastIndex = 0;
  let m;
  while ((m = jsClassRe.exec(content)) !== null) {
    const cls = m[1];
    if (!htmlClassUsages[cls]) htmlClassUsages[cls] = [];
    if (!htmlClassUsages[cls].includes(rel)) htmlClassUsages[cls].push(rel);
  }
}

const usedCssClasses   = new Set(Object.keys(htmlClassUsages));
const undefinedClasses = [...usedCssClasses].filter(c => !definedCssClasses.has(c));
const unusedClasses    = [...definedCssClasses].filter(c => !usedCssClasses.has(c));

const cssAuditRows = [
  ...[...definedCssClasses].sort().map(cls => ({
    cls,
    defined: true,
    used: usedCssClasses.has(cls),
    usedIn: (htmlClassUsages[cls] || []).join(', ').slice(0, 80)
  })),
  ...undefinedClasses.sort().map(cls => ({
    cls,
    defined: false,
    used: true,
    usedIn: (htmlClassUsages[cls] || []).join(', ').slice(0, 80)
  }))
];

// ══════════════════════════════════════════════════════════════
// SECTION 9 — Dependency Graph (cross-file function calls)
// ══════════════════════════════════════════════════════════════
log('Section 9: Dependency graph...');

// Build reverse map: funcName -> file(s) that define it
const funcToFiles = {};
for (const [name, defs] of Object.entries(funcDefs)) {
  funcToFiles[name] = defs.map(d => d.file);
}

// For each JS file, find calls to functions defined in OTHER files
const dependencies = {};
for (const fp of jsFiles) {
  const rel     = relPath(fp);
  const content = fileContents[fp] || '';
  // Find all function calls: word followed by (
  const callRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]{2,})\s*\(/g;
  let m;
  const deps = new Set();
  callRe.lastIndex = 0;
  while ((m = callRe.exec(content)) !== null) {
    const name = m[1];
    if (Array.isArray(funcToFiles[name])) {
      for (const defFile of funcToFiles[name]) {
        if (defFile !== rel) {
          deps.add(defFile);
        }
      }
    }
  }
  if (deps.size > 0) {
    dependencies[rel] = [...deps].sort();
  }
}

// Detect circular: A depends on B and B depends on A
const circularPairs = [];
const depFiles = Object.keys(dependencies);
for (let i = 0; i < depFiles.length; i++) {
  for (const dep of (dependencies[depFiles[i]] || [])) {
    if ((dependencies[dep] || []).includes(depFiles[i])) {
      const pair = [depFiles[i], dep].sort().join(' ↔ ');
      if (!circularPairs.includes(pair)) circularPairs.push(pair);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// SECTION 10 — Health Summary (computed last)
// ══════════════════════════════════════════════════════════════
const warnings = missingScripts.length + missingSlotFiles.length + undefinedClasses.length;

// ══════════════════════════════════════════════════════════════
// BUILD JSON
// ══════════════════════════════════════════════════════════════
log('Building JSON output...');

const jsonOut = {
  generated:    new Date().toISOString(),
  health: {
    totalJsFiles:    jsFiles.length,
    totalHtmlFiles:  htmlFiles.length,
    totalCssFiles:   cssFiles.length,
    totalLines,
    globalFunctions:         Object.keys(funcDefs).length,
    windowAssignments:       windowAssignments.length,
    apiEndpoints:      apiEndpoints.length,
    sseEventsFound:    sseEventsUniq.length,
    localStorageKeys:  [...new Set(storageEntries.filter(e => e.store === 'localStorage').map(e => e.key))].length,
    sessionStorageKeys:[...new Set(storageEntries.filter(e => e.store === 'sessionStorage').map(e => e.key))].length,
    missingSlotFiles:  missingSlotFiles.length,
    undefinedCssClasses: undefinedClasses.length,
    unusedCssClasses:  unusedClasses.length,
    missingScriptFiles: missingScripts.length,
    circularDependencies: circularPairs.length,
    warnings
  },
  fileInventory,
  windowAssignments,
  inlineFuncRegistry,
  scriptLoadOrder: scriptTags,
  slotRegistry: [...slotRegistry, ...nonCoreSlots],
  apiEndpoints,
  sseEventSources: sseEntries,
  sseEvents: sseEventsUniq,
  customEvents: customEventEntries,
  storageEntries,
  cssAudit: { defined: [...definedCssClasses], used: [...usedCssClasses], undefined: undefinedClasses, unused: unusedClasses, rows: cssAuditRows },
  dependencies,
  circularDependencies: circularPairs
};

// ══════════════════════════════════════════════════════════════
// RENDER MARKDOWN
// ══════════════════════════════════════════════════════════════
log('Rendering markdown...');

const lines_md = [];
function h1(t) { lines_md.push('# ' + t); lines_md.push(''); }
function h2(t) { lines_md.push('## ' + t); lines_md.push(''); }
function h3(t) { lines_md.push('### ' + t); lines_md.push(''); }
function p(t)  { lines_md.push(t); lines_md.push(''); }
function tableHeader(cols) { lines_md.push('| ' + cols.join(' | ') + ' |'); lines_md.push('| ' + cols.map(() => '---').join(' | ') + ' |'); }
function tableRow(vals)    { lines_md.push('| ' + vals.map(v => escMd(String(v ?? ''))).join(' | ') + ' |'); }
function tableEnd()        { lines_md.push(''); }

h1('NekoCore OS — System Map');
p(`**Generated:** ${new Date().toISOString()}  `);
p('This document is auto-generated by `scripts/generate-system-map.js`. Do not edit manually — run `npm run map` to regenerate.');
p('');

// ── Health Dashboard ──
h2('Health Dashboard');
const H = jsonOut.health;
tableHeader(['Metric', 'Value', 'Status']);
tableRow(['Last generated', new Date().toISOString(), '']);
tableRow(['Total JS files',    H.totalJsFiles, '✅']);
tableRow(['Total HTML files',  H.totalHtmlFiles, '✅']);
tableRow(['Total CSS files',   H.totalCssFiles, '✅']);
tableRow(['Total lines of code', H.totalLines.toLocaleString(), '✅']);
tableRow(['Global functions defined', H.globalFunctions, '✅']);
tableRow(['window.* assignments', H.windowAssignments, '']);
tableRow(['API endpoints found', H.apiEndpoints, '✅']);
tableRow(['SSE events found', H.sseEventsFound, '✅']);
tableRow(['localStorage keys', H.localStorageKeys, '']);
tableRow(['sessionStorage keys', H.sessionStorageKeys, '']);
tableRow(['Missing slot files', H.missingSlotFiles, H.missingSlotFiles > 0 ? '⚠' : '✅']);
tableRow(['Undefined CSS classes', H.undefinedCssClasses, H.undefinedCssClasses > 0 ? '⚠' : '✅']);
tableRow(['Unused CSS classes', H.unusedCssClasses, H.unusedCssClasses > 0 ? '⚠' : '✅']);
tableRow(['Missing script files', H.missingScriptFiles, H.missingScriptFiles > 0 ? '⚠' : '✅']);
tableRow(['Circular dependencies', H.circularDependencies, H.circularDependencies > 0 ? '⚠' : '✅']);
tableRow(['Total warnings', H.warnings, H.warnings > 0 ? '⚠' : '✅']);
tableEnd();

// ══════════════════════════════════
// SECTION 1 — File Inventory
// ══════════════════════════════════
h2('Section 1 — File Inventory');
const dirs = Object.keys(byDir).sort();
for (const dir of dirs) {
  h3(dir);
  tableHeader(['File', 'Lines', 'Modified']);
  for (const f of byDir[dir]) {
    tableRow([f.path, f.lines, f.modified]);
  }
  tableEnd();
}

// ══════════════════════════════════
// SECTION 2 — Global Function Registry
// ══════════════════════════════════
h2('Section 2 — Global Function Registry');

h3('2a — window.* Assignments');
p('Functions explicitly placed on the `window` object (globally accessible across all scripts):');
tableHeader(['Name', 'Defined In', 'Line', 'Snippet']);
for (const w of windowAssignments) {
  tableRow([w.name, w.file, w.line, w.snippet]);
}
tableEnd();

h3('2b — Inline HTML Event Handler Functions');
p('Functions called from inline HTML event handlers (onclick, oninput, etc.) cross-referenced to their JS definitions:');
tableHeader(['Function', 'Defined In', 'Def Line', 'Called From (file:line)']);
for (const r of inlineFuncRegistry) {
  tableRow([r.name, r.definedIn, r.defLine, r.calledFrom]);
}
tableEnd();

// ══════════════════════════════════
// SECTION 3 — Script Load Order
// ══════════════════════════════════
h2('Section 3 — Script Load Order (index.html)');
tableHeader(['#', 'src', 'index.html line', 'External?', 'File Exists?']);
scriptTags.forEach((s, i) => {
  const extLabel = s.isExternal ? '🌐 external' : '';
  const existLabel = s.isExternal ? 'N/A' : (s.exists ? '✅' : '❌ MISSING');
  tableRow([i + 1, s.src, s.line, extLabel, existLabel]);
});
tableEnd();
if (missingScripts.length > 0) {
  p('⚠ **Missing scripts:** ' + missingScripts.map(s => s.src).join(', '));
}

// ══════════════════════════════════
// SECTION 4 — Tab & Slot Registry
// ══════════════════════════════════
h2('Section 4 — Tab & Slot Registry');

h3('4a — index.html Slot Attributes');
tableHeader(['Type', 'Tab/Overlay ID', 'Slot Element ID', 'Expected File', 'On Disk?']);
for (const s of slotRegistry) {
  tableRow([s.type, s.id, s.slotId, s.expectedFile, s.exists ? '✅' : '❌ MISSING']);
}
tableEnd();

h3('4b — Non-Core Manifest Entries (non-core-apps.manifest.json)');
tableHeader(['Tab ID', 'Expected File', 'On Disk?']);
for (const s of nonCoreSlots) {
  tableRow([s.id, s.expectedFile, s.exists ? '✅' : '❌ MISSING']);
}
tableEnd();

if (missingSlotFiles.length > 0) {
  p('⚠ **Missing slot files:** ' + missingSlotFiles.map(s => s.expectedFile).join(', '));
}

// ══════════════════════════════════
// SECTION 5 — API Endpoint Map
// ══════════════════════════════════
h2('Section 5 — API Endpoint Map');
p(`${apiEndpoints.length} unique API endpoints found. Endpoints called from multiple locations are flagged.`);
tableHeader(['Endpoint', 'Method', 'Called From', 'Line', 'Multi-caller?']);
for (const ep of apiEndpoints) {
  for (const call of ep.calls) {
    tableRow([ep.endpoint, call.method, call.file, call.line, ep.multipleCallers ? '⚠ yes' : '']);
  }
}
tableEnd();

// ══════════════════════════════════
// SECTION 6 — SSE & Event Registry
// ══════════════════════════════════
h2('Section 6 — SSE & Event Registry');

h3('6a — EventSource Connections');
tableHeader(['Endpoint', 'Created In', 'Line']);
for (const s of sseEntries) {
  tableRow([s.endpoint, s.file, s.line]);
}
tableEnd();

h3('6b — Non-Standard addEventListener (custom & SSE events)');
tableHeader(['Event Name', 'File', 'Line', 'Raw Snippet']);
for (const e of sseEventsUniq) {
  tableRow([e.event, e.file, e.line, e.raw]);
}
tableEnd();

h3('6c — dispatchEvent / Custom Events');
if (customEventEntries.filter(e => e.type === 'dispatch').length === 0) {
  p('No `dispatchEvent` calls with literal event names found in JS files.');
} else {
  tableHeader(['Event Name', 'Type', 'File', 'Line']);
  for (const e of customEventEntries.filter(c => c.type === 'dispatch')) {
    tableRow([e.event, e.type, e.file, e.line]);
  }
  tableEnd();
}

// ══════════════════════════════════
// SECTION 7 — Storage Registry
// ══════════════════════════════════
h2('Section 7 — Storage Registry');
p(`${storageEntries.length} total storage accesses found across ${[...new Set(storageEntries.map(e => e.file))].length} files.`);
tableHeader(['Store', 'Key', 'Operation', 'File', 'Line']);
for (const e of storageEntries) {
  tableRow([e.store, e.key, e.op, e.file, e.line]);
}
tableEnd();

// ══════════════════════════════════
// SECTION 8 — CSS sys-inline Audit
// ══════════════════════════════════
h2('Section 8 — CSS sys-inline Class Audit');
p(`Source file: \`client/css/system-shared.css\`  \n**Defined:** ${definedCssClasses.size} | **Used:** ${usedCssClasses.size} | **Undefined (⚠):** ${undefinedClasses.length} | **Unused (⚠):** ${unusedClasses.length}`);
tableHeader(['Class', 'Defined in CSS?', 'Used in Files?', 'Used In (up to 80 chars)']);
for (const row of cssAuditRows.slice(0, 300)) {  // cap at 300 rows
  const defLabel  = row.defined ? '✅' : '❌';
  const usedLabel = row.used    ? '✅' : '❌ unused';
  tableRow([row.cls, defLabel, usedLabel, row.usedIn]);
}
tableEnd();

if (undefinedClasses.length > 0) {
  p('⚠ **Undefined classes (used in HTML/JS but not in system-shared.css):** ' + undefinedClasses.join(', '));
}
if (unusedClasses.length > 0) {
  p('⚠ **Unused classes (defined in CSS but never used):** ' + unusedClasses.join(', '));
}

// ══════════════════════════════════
// SECTION 9 — Dependency Graph
// ══════════════════════════════════
h2('Section 9 — Dependency Graph');
p('Cross-file function-call dependencies. Only files that call functions defined in other files are listed.');
const depFilesListed = Object.keys(dependencies).sort();
tableHeader(['File', 'Depends On (files with called function definitions)']);
for (const f of depFilesListed) {
  tableRow([f, dependencies[f].join(', ')]);
}
tableEnd();

if (circularPairs.length > 0) {
  h3('⚠ Circular Dependencies Detected');
  for (const pair of circularPairs) {
    p('- ' + pair);
  }
} else {
  p('✅ No circular dependencies detected.');
}

// ══════════════════════════════════// SECTION 10 — Known Dynamic Patterns
// ════════════════════════════════════
h2('Section 10 — Known Dynamic Patterns (Static Analysis Blind Spots)');
p('The following patterns are documented in `docs/system-map-addendum.md` '
  + 'and verified by `scripts/validate-dynamic-patterns.js`.  \n'
  + 'Static analysis cannot track these — run `npm run validate` for current status.');

tableHeader(['Pattern', 'Location', 'Risk', 'Validation Check']);
tableRow(['window[app.action] dispatch',      'window-manager.js:763',                        'Medium', 'Check 1']);
tableRow(['new Function(code)() execution',   'shadow-content-loader.js:181',                 'High',   'Check 2']);
tableRow(['Sleep Phase 3 dead code',          'sleep.js — fetch(\'/api/system-prompt\')',    'Low',    'Check 3']);
tableRow(['chatHistory loss on sleep error',  'sleep.js — clearChat() before wake LLM call',  'Medium', 'Check 4']);
tableRow(['Ollama URL unvalidated',           'auth.js, setup-ui.js, simple-provider.js',     'Medium', 'Check 5']);
tableRow(['VFS path partial sanitisation',    'vfs.js — filename strip only',                 'High',   'Check 6']);
tableRow(['nk-s- namespace pending rename',   'system-shared.css + 9 consumer files',         'Low',    'Check 7']);
tableRow(['Task SSE startup race',            'chat.js — handleTaskSSEEvent typeof guard',    'Medium', 'Check 8']);
tableEnd();

{
  const VALIDATION_REPORT = require('path').join(DOCS_DIR, 'dynamic-validation-report.md');
  let lastValidated = 'never';
  try {
    const rpt = require('fs').readFileSync(VALIDATION_REPORT, 'utf8');
    const dm = rpt.match(/\*\*Generated:\*\*\s*([^\n]+)/);
    if (dm) lastValidated = dm[1].trim();
  } catch (_) { /* report not yet generated */ }
  p(`Last validated: ${lastValidated}`);
}

// ════════════════════════════════════// WRITE OUTPUT
// ══════════════════════════════════
log('Writing output files...');

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

fs.writeFileSync(OUT_MD,   lines_md.join('\n'), 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify(jsonOut, null, 2), 'utf8');

const totalWarnings = H.warnings;
console.log(`\nSystem map generated — ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''} found`);
console.log(`  MD  → ${path.relative(ROOT, OUT_MD)}`);
console.log(`  JSON → ${path.relative(ROOT, OUT_JSON)}`);
