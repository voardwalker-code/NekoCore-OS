#!/usr/bin/env node
// ── Scripts · Validate Dynamic Patterns ────────────────────────────────────────────────────
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
// ============================================================
// NekoCore OS — Dynamic Pattern Validator
// Verifies known dynamic risks from docs/system-map-addendum.md
// Run: node scripts/validate-dynamic-patterns.js
//      npm run validate
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const DOCS_DIR  = path.join(ROOT, '..', 'docs');
const REPORT_MD = path.join(DOCS_DIR, 'dynamic-validation-report.md');
// readFile()
// WHAT THIS DOES: readFile reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call readFile(...), then use the returned value in your next step.
function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return null; }
}
function findFile(startDir, filename) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', '.git', 'tmp-backups'].includes(e.name)) continue;
    const full = path.join(startDir, e.name);
    if (e.isDirectory()) {
      const found = findFile(full, filename);
      if (found) return found;
    } else if (e.name === filename) {
      return full;
    }
  }
  return null;
}
// walkDir()
// WHAT THIS DOES: walkDir is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call walkDir(...) where this helper behavior is needed.
function walkDir(dir, exts, results = []) {
  if (!fs.existsSync(dir)) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'tmp-backups', 'restore-snapshots'].includes(e.name)) continue;
      walkDir(full, exts, results);
    } else if (e.isFile() && exts.includes(path.extname(e.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

const CLIENT_ROOT = path.join(ROOT, 'client');

// ── Results accumulator ──────────────────────────────────────
const results = [];
let passCount = 0;
let warnCount = 0;
let resolvedCount = 0;
// pass()
// WHAT THIS DOES: pass is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call pass(...) where this helper behavior is needed.
function pass(label)     { const m = `✅  ${label}`;     results.push(m); console.log(m); passCount++; }
function warn(label)     { const m = `⚠   ${label}`;     results.push(m); console.log(m); warnCount++; }
function resolved(label) { const m = `🔵  ${label}`;     results.push(m); console.log(m); resolvedCount++; }
function info(label)     { const m = `    ${label}`;      results.push(m); console.log(m); }

// ══════════════════════════════════════════════════════════════
// Check 1 — window[app.action] allowlist
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 1 — window[app.action] guard + allowlist');
const wmPath = findFile(CLIENT_ROOT, 'window-manager.js');
const appPath = findFile(CLIENT_ROOT, 'app.js');

const wmContent  = wmPath  ? readFile(wmPath)  : null;
const appContent = appPath ? readFile(appPath)  : null;

if (!wmContent) {
  warn('Check 1 — window-manager.js not found');
} else {
  const hasGuard = /window\[app\.action\]/.test(wmContent) &&
                   /typeof fn === 'function'/.test(wmContent);
  if (!hasGuard) {
    warn('Check 1 — window[app.action] dispatch pattern changed or guard removed');
  } else {
    // Scan app.js for action: 'value' properties
    const actionValues = [];
    if (appContent) {
      const re = /action\s*:\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(appContent)) !== null) actionValues.push(m[1]);
    }
    const KNOWN = ['saveWindowLayout', 'restoreWindowLayout', 'resetWindowLayout'];
    const added   = actionValues.filter(v => !KNOWN.includes(v));
    const removed = KNOWN.filter(v => !actionValues.includes(v));

    if (added.length === 0 && removed.length === 0) {
      pass(`Check 1 — window[app.action] guard present. Known values: ${KNOWN.join(', ')}`);
    } else {
      if (added.length)   warn(`Check 1 — New action values added: ${added.join(', ')}`);
      if (removed.length) warn(`Check 1 — Known action values removed: ${removed.join(', ')}`);
      info(`Check 1 — Current values found in app.js: ${actionValues.join(', ') || '(none)'}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// Check 2 — new Function(code)() execution in shadow-content-loader
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 2 — new Function(code)() in shadow-content-loader');
const sclPath    = findFile(CLIENT_ROOT, 'shadow-content-loader.js');
const sclContent = sclPath ? readFile(sclPath) : null;

if (!sclContent) {
  warn('Check 2 — shadow-content-loader.js not found');
} else {
  const hasNewFunction = /new Function\(code\)\(\)/.test(sclContent);
  const hasEval        = /\beval\(/.test(sclContent);
  const hasSanitise    = /sanitise|sanitize|DOMPurify|CSP|createPolicy/.test(sclContent);

  if (!hasNewFunction) {
    if (hasEval) {
      warn('Check 2 — new Function() replaced with eval() — still unsafe');
    } else {
      resolved('Check 2 — new Function(code)() pattern removed — execution path changed (verify safe replacement)');
    }
  } else if (hasSanitise) {
    resolved('Check 2 — new Function(code)() still present but sanitisation was added — GOOD CHANGE');
  } else {
    warn('Check 2 — new Function(code)() still executes tab scripts with no sanitisation or CSP');
  }
}

// ══════════════════════════════════════════════════════════════
// Check 3 — Sleep Phase 3 dead code
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 3 — Sleep Phase 3 dead code (/api/system-prompt)');
const sleepPath    = findFile(CLIENT_ROOT, 'sleep.js');
const sleepContent = sleepPath ? readFile(sleepPath) : null;

// Also check app.js as fallback location
const checkContent = sleepContent || appContent;
const checkLabel   = sleepContent ? 'sleep.js' : 'app.js';

if (!checkContent) {
  warn('Check 3 — sleep.js and app.js not found — cannot verify');
} else {
  const hasFetch    = checkContent.includes("fetch('/api/system-prompt')") ||
                      checkContent.includes('fetch("/api/system-prompt")');
  if (!hasFetch) {
    resolved('Check 3 — fetch(\'/api/system-prompt\') removed from sleep cycle — dead code cleaned up');
  } else {
    // Check whether the result is used
    // A "used" result means: response is stored in a variable that is read later
    const usedResult = /const\s+\w+\s*=\s*await\s+fetch\(['"]\/api\/system-prompt['"]/.test(checkContent) &&
                       !/\/\/.*fetch\(.*\/api\/system-prompt/.test(checkContent);
    if (usedResult) {
      resolved(`Check 3 — Sleep Phase 3 RESOLVED in ${checkLabel} — fetch('/api/system-prompt') result is now consumed`);
    } else {
      warn(`Check 3 — Sleep Phase 3 still dead code in ${checkLabel} — fetch('/api/system-prompt') result unused`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// Check 4 — chatHistory loss on sleep error
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 4 — chatHistory loss on sleep error');
const sleepSrc = sleepContent || appContent;
const sleepSrcLabel = sleepContent ? 'sleep.js' : 'app.js';

if (!sleepSrc) {
  warn('Check 4 — sleep source not found — cannot verify');
} else {
  const hasClearChat = /clearChat\(\)/.test(sleepSrc);
  const hasBackup    = /chatHistoryBackup\s*=|backupChat\s*=|savedHistory\s*=|chatHistoryCopy/.test(sleepSrc);
  const hasRestore   = /chatHistory\s*=\s*(?:chatHistoryBackup|backupChat|savedHistory|chatHistoryCopy)/.test(sleepSrc);

  if (!hasClearChat) {
    resolved('Check 4 — clearChat() removed from sleep cycle — history loss risk eliminated');
  } else if (hasBackup && hasRestore) {
    resolved('Check 4 — chatHistory backup/restore pattern added to sleep cycle — GOOD CHANGE');
  } else {
    warn(`Check 4 — clearChat() called in sleep cycle with no rollback in ${sleepSrcLabel} — chat loss on error remains`);
  }
}

// ══════════════════════════════════════════════════════════════
// Check 5 — Ollama URL validation
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 5 — Ollama URL validation');
const authPath   = findFile(CLIENT_ROOT, 'auth.js');
const setupPath  = findFile(CLIENT_ROOT, 'setup-ui.js');
const simplePath = findFile(CLIENT_ROOT, 'simple-provider.js');

const urlFiles = [
  { name: 'auth.js',            content: authPath   ? readFile(authPath)   : null },
  { name: 'setup-ui.js',        content: setupPath  ? readFile(setupPath)  : null },
  { name: 'simple-provider.js', content: simplePath ? readFile(simplePath) : null },
];

let ollamaValidated = true;
const ollamaUnvalidated = [];

for (const f of urlFiles) {
  if (!f.content) continue;
  if (!f.content.includes('/api/tags')) continue; // pattern not present in this file

  // Look for URL validation before the fetch
  const hasValidation = /new URL\(url\)|URL\.canParse\(url\)|allowedHosts|urlAllowlist|validateUrl|isValidUrl/.test(f.content);
  if (!hasValidation) {
    ollamaValidated = false;
    ollamaUnvalidated.push(f.name);
  }
}

if (ollamaUnvalidated.length === 0) {
  resolved('Check 5 — Ollama URL validation added in all source files — GOOD CHANGE');
} else {
  warn(`Check 5 — url + '/api/tags' fetch still unvalidated in: ${ollamaUnvalidated.join(', ')}`);
}

// ══════════════════════════════════════════════════════════════
// Check 6 — VFS path sanitisation
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 6 — VFS path sanitisation scope');
const vfsPath    = findFile(CLIENT_ROOT, 'vfs.js');
const vfsContent = vfsPath ? readFile(vfsPath) : null;

if (!vfsContent) {
  warn('Check 6 — vfs.js not found');
} else {
  // Find the character-strip regex
  const reMatch = vfsContent.match(/\/\[([^\]]+)\]\/[gim]*/);
  if (!reMatch) {
    // No strip regex found — check if server-side validation note is present or pattern changed
    const hasPathCheck = /path\.join|path\.resolve|\.normalize|traversal/i.test(vfsContent);
    if (hasPathCheck) {
      resolved('Check 6 — VFS character strip regex removed; path normalisation pattern found — verify server-side sanitisation');
    } else {
      warn('Check 6 — vfs.js character strip regex not found and no path normalisation visible');
    }
  } else {
    const regexStr = reMatch[0];
    // Check if the regex is applied to the full path or just filename
    const fullPathStrip = /folderPath|filePath|fullPath/.test(
      vfsContent.substring(Math.max(0, vfsContent.indexOf(regexStr) - 200), vfsContent.indexOf(regexStr) + 200)
    );
    if (fullPathStrip) {
      resolved('Check 6 — VFS strip regex applied to full path — GOOD CHANGE');
      info(`Check 6 — Current strip pattern: ${regexStr}`);
    } else {
      warn(`Check 6 — VFS path strip still applies to filename component only — full path not sanitised`);
      info(`Check 6 — Current strip pattern: ${regexStr}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// Check 7 — nk-s- namespace rename
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 7 — nk-s- namespace rename');
const htmlFiles = walkDir(CLIENT_ROOT, ['.html']);
const cssFiles  = walkDir(CLIENT_ROOT, ['.css']);
const allFiles  = [...htmlFiles, ...cssFiles];

let nksTotalCount    = 0;
let sysInlineCount   = 0;
const nksFileHits    = [];

for (const fp of allFiles) {
  const c = readFile(fp);
  if (!c) continue;
  // nksMatches()
  // Purpose: helper wrapper used by this module's main flow.
  // nksMatches()
  // WHAT THIS DOES: nksMatches is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call nksMatches(...) where this helper behavior is needed.
  const nksMatches = (c.match(/nk-s-\d{4}/g) || []).length;
  const siMatches  = (c.match(/sys-inline-\d{4}/g) || []).length;
  if (nksMatches > 0) nksFileHits.push(path.relative(ROOT, fp).replace(/\\/g, '/'));
  nksTotalCount  += nksMatches;
  sysInlineCount += siMatches;
}

if (nksTotalCount === 0 && sysInlineCount > 0) {
  resolved(`Check 7 — nk-s- rename RESOLVED — 0 nk-s- references remaining, ${sysInlineCount} sys-inline- references present`);
} else if (nksTotalCount === 0) {
  resolved('Check 7 — nk-s- rename RESOLVED — 0 references remaining');
} else {
  warn(`Check 7 — nk-s- rename PENDING — ${nksTotalCount} nk-s- references in ${nksFileHits.length} files`);
  info(`Check 7 — Files with nk-s-: ${nksFileHits.slice(0, 8).join(', ')}${nksFileHits.length > 8 ? ` …+${nksFileHits.length - 8} more` : ''}`);
  if (sysInlineCount > 0) {
    info(`Check 7 — sys-inline- references: ${sysInlineCount} (partial rename in progress)`);
  }
}

// ══════════════════════════════════════════════════════════════
// Check 8 — Task SSE startup race
// ══════════════════════════════════════════════════════════════
console.log('\nCheck 8 — Task SSE startup race (handleTaskSSEEvent)');
const chatPath    = findFile(CLIENT_ROOT, 'chat.js');
const chatContent = chatPath ? readFile(chatPath) : null;

if (!chatContent) {
  warn('Check 8 — chat.js not found');
} else {
  const hasHandler    = chatContent.includes('handleTaskSSEEvent');
  const hasTypeofGuard = /typeof\s+window\.handleTaskSSEEvent\s*===\s*'function'/.test(chatContent) ||
                         /typeof\s+window\.handleTaskSSEEvent\s*===\s*"function"/.test(chatContent);
  const hasQueue      = /taskEventQueue|pendingTaskEvents|replayTask|queuedEvents/.test(chatContent);

  if (!hasHandler) {
    resolved('Check 8 — handleTaskSSEEvent removed from chat.js — pattern changed; verify task system');
  } else if (hasQueue) {
    resolved('Check 8 — Task SSE queue/replay mechanism added — startup race mitigated');
  } else if (hasTypeofGuard && !hasQueue) {
    warn('Check 8 — Task SSE still uses typeof guard only with no queue — events fired before task-ui.js loads are silently dropped');
  } else {
    warn('Check 8 — handleTaskSSEEvent present but guard pattern changed — review chat.js');
  }
}

// ══════════════════════════════════════════════════════════════
// Write report
// ══════════════════════════════════════════════════════════════
const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const reportLines = [
  '# Dynamic Validation Report',
  '',
  `**Generated:** ${now}`,
  `**Script:** \`scripts/validate-dynamic-patterns.js\``,
  `**Source:** \`docs/system-map-addendum.md\``,
  '',
  `**Summary:** ${passCount} pass · ${warnCount} warning · ${resolvedCount} resolved`,
  '',
  '---',
  '',
  ...results.map(r => r.trimStart().startsWith('    ') ? r : `- ${r.trimStart()}`),
  '',
  '---',
  '',
  '*Run `npm run validate` to regenerate this report.*',
];

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.writeFileSync(REPORT_MD, reportLines.join('\n'), 'utf8');

console.log(`\n──────────────────────────────────────────────────────`);
console.log(`  ${passCount} pass  |  ${warnCount} warning  |  ${resolvedCount} resolved`);
console.log(`  Report → docs/dynamic-validation-report.md`);
console.log(`──────────────────────────────────────────────────────\n`);
