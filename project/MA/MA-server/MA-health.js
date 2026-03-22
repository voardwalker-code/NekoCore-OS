// ── MA Health Scanner ────────────────────────────────────────────────────────
// MA-scoped health check: validates core files, detects issues, reports status.
// Small registry — only MA's own files.
'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const MA_ROOT = path.resolve(__dirname, '..');

// ── MA Core Registry — every file MA needs to run ──────────────────────────
const CORE_REGISTRY = {
  'MA-Server.js':                    'Entry point — HTTP server',
  'MA-cli.js':                      'Entry point — Terminal CLI',
  'package.json':                   'Package metadata',
  'MA-server/MA-core.js':             'Shared bootstrap, state, chat orchestration',
  'MA-server/MA-llm.js':              'LLM caller (OpenRouter + Ollama)',
  'MA-server/MA-memory.js':           'Memory store/retrieve/search/ingest',
  'MA-server/MA-tasks.js':            'Intent classifier + task runner',
  'MA-server/MA-workspace-tools.js':  'Tool call parsing + execution',
  'MA-server/MA-web-fetch.js':        'Web search + URL fetch',
  'MA-server/MA-cmd-executor.js':     'Sandboxed command execution',
  'MA-server/MA-health.js':           'Health scanner (this file)',
  'MA-server/MA-agents.js':            'Agent catalog + delegation CRUD',
  'MA-server/MA-pulse.js':             'Pulse engine — timers, health scans, chores',
  'MA-server/MA-model-router.js':      'Intelligent model selection + performance tracking',
  'MA-server/MA-project-archive.js':   'Per-project archive with weighted graph',
  'MA-server/MA-worklog.js':           'Persistent session worklog for continuity',
  'MA-server/MA-rake.js':             'RAKE keyphrasing — topic extraction',
  'MA-server/MA-bm25.js':             'BM25 relevance scoring',
  'MA-server/MA-yake.js':             'YAKE keyword extraction',
  'MA-client/MA-index.html':          'Chat GUI',
  'MA-entity/entity_ma/entity.json':   'Entity profile'
};

// ── Scan logic ──────────────────────────────────────────────────────────────

/** Run a full health scan. Returns { issues[], summary } */
function scan() {
  const issues = [];

  // Pass 1: existence + zero-byte
  for (const [rel, desc] of Object.entries(CORE_REGISTRY)) {
    const abs = path.join(MA_ROOT, rel);
    if (!fs.existsSync(abs)) {
      issues.push({ file: rel, severity: 'critical', type: 'missing', desc });
    } else {
      const stat = fs.statSync(abs);
      if (stat.size === 0) {
        issues.push({ file: rel, severity: 'critical', type: 'zero_byte', desc });
      }
    }
  }

  // Pass 2: deep validation on existing files
  for (const [rel] of Object.entries(CORE_REGISTRY)) {
    const abs = path.join(MA_ROOT, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size === 0) continue;

    const ext = path.extname(rel).toLowerCase();
    try {
      const content = fs.readFileSync(abs, 'utf8');
      if (ext === '.js') _validateJS(rel, content, issues);
      if (ext === '.json') _validateJSON(rel, content, issues);
      if (ext === '.html') _validateHTML(rel, content, issues);
    } catch (e) {
      issues.push({ file: rel, severity: 'warning', type: 'read_error', detail: e.message });
    }
  }

  // Summary
  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  return {
    issues,
    summary: {
      total: Object.keys(CORE_REGISTRY).length,
      critical,
      warnings,
      healthy: critical === 0 && warnings === 0
    }
  };
}

function _validateJS(rel, content, issues) {
  try {
    new vm.Script(content, { filename: rel });
  } catch (e) {
    issues.push({ file: rel, severity: 'critical', type: 'syntax_error', detail: e.message });
  }
}

function _validateJSON(rel, content, issues) {
  try {
    JSON.parse(content);
  } catch (e) {
    issues.push({ file: rel, severity: 'critical', type: 'json_error', detail: e.message });
  }
}

function _validateHTML(rel, content, issues) {
  // Simple tag balance check
  const opens = (content.match(/<[a-z][^/>]*>/gi) || []).length;
  const closes = (content.match(/<\/[a-z][^>]*>/gi) || []).length;
  if (Math.abs(opens - closes) > 3) {
    issues.push({ file: rel, severity: 'warning', type: 'html_imbalance', detail: `open=${opens} close=${closes}` });
  }
}

/** Format scan results as readable text. */
function formatReport(result) {
  const lines = ['MA Health Scan', '='.repeat(40)];
  if (result.summary.healthy) {
    lines.push(`All ${result.summary.total} core files OK.`);
  } else {
    lines.push(`Files: ${result.summary.total} | Critical: ${result.summary.critical} | Warnings: ${result.summary.warnings}`);
    lines.push('');
    for (const i of result.issues) {
      lines.push(`  [${i.severity.toUpperCase()}] ${i.file} — ${i.type}${i.detail ? ': ' + i.detail : ''}`);
    }
  }
  return lines.join('\n');
}

module.exports = { scan, formatReport, CORE_REGISTRY, MA_ROOT };
