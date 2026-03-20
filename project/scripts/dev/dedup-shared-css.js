#!/usr/bin/env node
// dedup-shared-css.js
// Finds exact duplicate CSS rules inside the /* BEGIN / END GENERATED INLINE
// STYLE CLASSES */ block in css/system-shared.css, then:
//   1. Builds a mapping { "nk-s-XXXX": "nk-s-YYYY" } — XXXX is removed,
//      YYYY (lower number) is kept.
//   2. Replaces all HTML class references to the removed names with the
//      canonical ones across every .html file under client/.
//   3. Removes the duplicate rule lines (comment + declaration) from the CSS.
//   4. Reports a summary.
//
// Safe to run multiple times — exits without writing if no duplicates exist.
//
// Usage (from project/ directory):
//   node scripts/dev/dedup-shared-css.js
//   node scripts/dev/dedup-shared-css.js --dry    ← preview only, no writes

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────
const PROJECT_CLIENT = path.join(__dirname, '../../client');
const CSS_FILE       = path.join(PROJECT_CLIENT, 'css/system-shared.css');

const BEGIN_MARKER = '/* BEGIN GENERATED INLINE STYLE CLASSES */';
const END_MARKER   = '/* END GENERATED INLINE STYLE CLASSES */';

// ── CLI flags ──────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry');
if (DRY_RUN) console.log('[dry-run] No files will be written.\n');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape a string for use in a RegExp */
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Recursively collect all .html files under a directory */
function findHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findHtml(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Normalise a CSS declaration block body so equivalent rules compare equal
 * regardless of internal whitespace or property order.
 *
 * Input:  "{ font-size: var(--text-xs); color: var(--text-secondary); }"
 * Output: "color:var(--text-secondary);font-size:var(--text-xs)"
 */
function normalizeDecl(body) {
  return body
    .replace(/^\s*\{\s*/, '')
    .replace(/\s*\}\s*$/, '')
    .split(';')
    .map(p => p.replace(/\s+/g, '').toLowerCase())
    .filter(Boolean)
    .sort()
    .join(';');
}

// ── 1. Parse the CSS block ─────────────────────────────────────────────────

if (!fs.existsSync(CSS_FILE)) {
  console.error(`CSS file not found: ${CSS_FILE}`);
  process.exit(1);
}

const cssOriginal = fs.readFileSync(CSS_FILE, 'utf8');

const beginIdx = cssOriginal.indexOf(BEGIN_MARKER);
const endIdx   = cssOriginal.indexOf(END_MARKER);
if (beginIdx === -1 || endIdx === -1) {
  console.error('BEGIN/END markers not found in system-shared.css.');
  process.exit(1);
}

const blockContent = cssOriginal.slice(beginIdx + BEGIN_MARKER.length, endIdx);

// Match single-line rules like: .nk-s-0001 { ... }
// Also tolerate a leading comment on the preceding line (we'll strip those too).
const RULE_RE = /\.nk-s-(\d{4})\s*(\{[^}]+\})/g;

const rules = []; // { num, className, body, normalized }
let m;
while ((m = RULE_RE.exec(blockContent)) !== null) {
  const num        = m[1];
  const body       = m[2];
  const normalized = normalizeDecl(body);
  rules.push({ num, className: `nk-s-${num}`, body, normalized });
}

if (rules.length === 0) {
  console.log('No rules found in the generated block — nothing to do.');
  process.exit(0);
}

console.log(`Parsed ${rules.length} rule(s) from system-shared.css\n`);

// ── 2. Find duplicates ─────────────────────────────────────────────────────

/** Map normalizedDecl → array of rules having that declaration */
const byDecl = new Map();
for (const rule of rules) {
  if (!byDecl.has(rule.normalized)) byDecl.set(rule.normalized, []);
  byDecl.get(rule.normalized).push(rule);
}

/**
 * dupMap: { "nk-s-XXXX": "nk-s-YYYY" }
 *   XXXX = duplicate to remove (higher number)
 *   YYYY = canonical to keep  (lower  number)
 */
const dupMap   = {};
const toRemove = new Set(); // className strings to delete from CSS

for (const group of byDecl.values()) {
  if (group.length < 2) continue;

  // Sort ascending so index 0 is the lowest (canonical) number
  group.sort((a, b) => parseInt(a.num, 10) - parseInt(b.num, 10));
  const canonical = group[0];

  for (let i = 1; i < group.length; i++) {
    const dup = group[i];
    dupMap[dup.className] = canonical.className;
    toRemove.add(dup.className);
    console.log(`  duplicate: .${dup.className}  →  canonical: .${canonical.className}`);
    console.log(`    rule: .${dup.className} ${dup.body}\n`);
  }
}

if (Object.keys(dupMap).length === 0) {
  console.log('✓ No duplicate rules found — system-shared.css is clean.');
  process.exit(0);
}

console.log(`Found ${Object.keys(dupMap).length} duplicate(s) to remove.\n`);

// ── 3. Update HTML files ───────────────────────────────────────────────────

const htmlFiles      = findHtml(PROJECT_CLIENT);
let totalHtmlUpdates = 0;
const changedHtml    = [];

for (const htmlFile of htmlFiles) {
  const original = fs.readFileSync(htmlFile, 'utf8');
  let updated    = original;

  for (const [dup, canonical] of Object.entries(dupMap)) {
    // Match the class name only when it appears as a full token inside
    // a class="..." attribute — surrounded by a quote, space, or word boundary
    // so that e.g. "nk-s-0001" does not partially match "nk-s-00010".
    const re = new RegExp(`(?<=class="[^"]*?)\\b${escRe(dup)}\\b`, 'g');
    const occurrences = (updated.match(re) || []).length;
    if (occurrences > 0) {
      updated = updated.replace(re, canonical);
      totalHtmlUpdates += occurrences;
    }
  }

  if (updated !== original) {
    const rel = path.relative(PROJECT_CLIENT, htmlFile);
    changedHtml.push(rel);
    if (!DRY_RUN) {
      fs.writeFileSync(htmlFile, updated, 'utf8');
    }
    console.log(`  ${DRY_RUN ? '[dry] ' : ''}updated HTML: ${rel}`);
  }
}

// ── 4. Remove duplicate rules from CSS ────────────────────────────────────

let newCss = cssOriginal;

for (const className of toRemove) {
  // Remove the optional comment line immediately before the rule, then the rule.
  // Pattern covers:
  //   /* NNNN — ... */\n
  //   .nk-s-XXXX { ... }\n
  // Both lines are optional relative to each other (comment may be absent).
  const re = new RegExp(
    '(?:[ \\t]*\\/\\*[^\\n]*\\*\\/\\n)?'      // optional comment line
    + `[ \\t]*\\.${escRe(className)}[^}]+}[ \\t]*(?:\\n|$)`, // rule line
    'g'
  );
  newCss = newCss.replace(re, '');
}

// Collapse more than two consecutive blank lines introduced by removal
newCss = newCss.replace(/\n{3,}/g, '\n\n');

if (!DRY_RUN) {
  fs.writeFileSync(CSS_FILE, newCss, 'utf8');
}

// ── 5. Final rule count ────────────────────────────────────────────────────

const finalRuleCount = (newCss.match(/^\.nk-s-\d{4}\s*\{/gm) || []).length;

// ── 6. Report ──────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════');
console.log(' DEDUP REPORT');
console.log('═══════════════════════════════════');
console.log(`  Duplicates found:           ${Object.keys(dupMap).length}`);
console.log(`  HTML references updated:    ${totalHtmlUpdates}`);
console.log(`  HTML files changed:         ${changedHtml.length}`);
console.log(`  Rules remaining in CSS:     ${finalRuleCount}`);
if (DRY_RUN) {
  console.log('\n  [dry-run] No files were modified.');
}
console.log('═══════════════════════════════════\n');

if (Object.keys(dupMap).length > 0 && !DRY_RUN) {
  console.log('✓ Dedup applied successfully.');
}
