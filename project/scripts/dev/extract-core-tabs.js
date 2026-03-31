// ── Scripts · Extract Core Tabs ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This script automates maintenance, generation, validation, or local
// development workflows.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * extract-core-tabs.js
 * One-time migration: extracts core tab content blocks + overlays from index.html
 * into separate HTML files and replaces them with slot divs.
 *
 * Run from project/ directory:
 *   node scripts/dev/extract-core-tabs.js
 */

const fs   = require('fs');
const path = require('path');

const CLIENT    = path.resolve(__dirname, '../../client');
const INDEX_PATH = path.join(CLIENT, 'index.html');
const CORE_DIR  = path.join(CLIENT, 'apps', 'core');
const OVER_DIR  = path.join(CORE_DIR, 'overlays');

fs.mkdirSync(OVER_DIR, { recursive: true });

let html = fs.readFileSync(INDEX_PATH, 'utf8');

// ---- div-depth scanner (skips HTML comments and <script>…</script> blocks) ----
// findBlockEnd()
// WHAT THIS DOES: findBlockEnd reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call findBlockEnd(...), then use the returned value in your next step.
function findBlockEnd(src, openTagStart) {
  let depth = 0;
  let i = openTagStart;
  while (i < src.length) {
    // skip HTML comment
    if (src.startsWith('<!--', i)) {
      const ce = src.indexOf('-->', i + 4);
      i = ce >= 0 ? ce + 3 : src.length;
      continue;
    }
    // skip <script> … </script> (don't count divs inside scripts)
    if (src.startsWith('<script', i) && /[\s>]/.test(src[i + 7] || '')) {
      const se = src.indexOf('</script>', i + 7);
      i = se >= 0 ? se + 9 : src.length;
      continue;
    }
    // opening <div …>
    if (src.startsWith('<div', i) && /[\s>]/.test(src[i + 4] || '')) {
      depth++;
      const gt = src.indexOf('>', i + 4);
      i = gt >= 0 ? gt + 1 : i + 1;
      continue;
    }
    // closing </div>
    if (src.startsWith('</div>', i)) {
      depth--;
      if (depth === 0) return i + 6; // position after the closing tag
      i += 6;
      continue;
    }
    i++;
  }
  return -1;
}
// findTagStart()
// WHAT THIS DOES: findTagStart reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call findTagStart(...), then use the returned value in your next step.
function findTagStart(src, id, fromIdx) {
  fromIdx = fromIdx || 0;
  // match <div … id="X" …>
  const re = new RegExp('<div(?=[^>]*\\s+id="' + id + '")', 'g');
  re.lastIndex = fromIdx;
  const m = re.exec(src);
  if (!m) throw new Error('Could not find <div id="' + id + '">');
  return m.index;
}
// extractBlock()
// WHAT THIS DOES: extractBlock is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call extractBlock(...) where this helper behavior is needed.
function extractBlock(src, id) {
  const start = findTagStart(src, id, 0);
  const end   = findBlockEnd(src, start);
  if (end < 0) throw new Error('No matching </div> for id="' + id + '"');
  return { block: src.slice(start, end), start, end };
}

// ---- things to extract ----

const CORE_TABS = [
  'chat', 'activity', 'archive', 'debugcore', 'settings',
  'advanced', 'creator', 'users', 'entity', 'nekocore'
];

// Each overlay entry: id = slug used in slot/file name, divIds = one or more div ids to pull
const CORE_OVERLAYS = [
  { id: 'boot-login',   divIds: ['bootOverlay', 'loginOverlay'] },
  { id: 'setup-wizard', divIds: ['setupOverlay'] },
  { id: 'sleep',        divIds: ['sleepOverlay'] }
];

// Collect all replacements then apply in reverse order so offsets stay valid
const replacements = []; // { start, end, replaceWith }

// ---- extract tabs ----
CORE_TABS.forEach(function (tabId) {
  try {
    const { block, start, end } = extractBlock(html, 'tab-' + tabId);
    const outPath = path.join(CORE_DIR, 'tab-' + tabId + '.html');
    fs.writeFileSync(outPath, block + '\n', 'utf8');
    console.log('OK  tab-' + tabId + ' (' + block.length + ' chars) -> apps/core/tab-' + tabId + '.html');
    replacements.push({
      start,
      end,
      replaceWith: '<div id="core-tab-slot-' + tabId + '" data-core-tab="' + tabId + '"></div>'
    });
  } catch (e) {
    console.error('ERR tab-' + tabId + ': ' + e.message);
    process.exit(1);
  }
});

// ---- extract overlays ----
CORE_OVERLAYS.forEach(function (ov) {
  try {
    const blocks  = ov.divIds.map(function (did) { return extractBlock(html, did); });
    const combined = blocks.map(function (b) { return b.block; }).join('\n');
    const outPath  = path.join(OVER_DIR, ov.id + '.html');
    fs.writeFileSync(outPath, combined + '\n', 'utf8');
    console.log('OK  overlay ' + ov.id + ' -> apps/core/overlays/' + ov.id + '.html');

    // Replace from the start of the first div to the end of the last div
    const rangeStart = blocks[0].start;
    const rangeEnd   = blocks[blocks.length - 1].end;
    replacements.push({
      start: rangeStart,
      end:   rangeEnd,
      replaceWith: '<div id="core-overlay-slot-' + ov.id + '" data-core-overlay="' + ov.id + '"></div>'
    });
  } catch (e) {
    console.error('ERR overlay ' + ov.id + ': ' + e.message);
    process.exit(1);
  }
});

// ---- apply replacements in reverse order (highest offset first) ----
replacements.sort(function (a, b) { return b.start - a.start; });
replacements.forEach(function (r) {
  html = html.slice(0, r.start) + r.replaceWith + html.slice(r.end);
});

fs.writeFileSync(INDEX_PATH, html, 'utf8');
console.log('\nDone. ' + replacements.length + ' replacements applied to index.html.');
console.log('Extracted tabs:    ' + CORE_TABS.length);
console.log('Extracted overlays:' + CORE_OVERLAYS.length);
