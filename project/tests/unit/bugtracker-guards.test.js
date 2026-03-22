'use strict';
/**
 * Guard + unit tests for the Bug Tracker App (PLAN-BUG-TRACKER-APP-v1).
 * Validates: manifest acceptance, WINDOW_APPS registration, .bugtrack.json
 * schema, bug-ID generation, and Markdown report generation.
 * Run with: node --test tests/unit/bugtracker-guards.test.js  (from project/)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/* ── Manifest guard ─────────────────────────────────────────────── */

describe('Bug Tracker — Manifest guard', () => {
  const manifestPath = path.join(ROOT, 'client/apps/non-core/non-core-apps.manifest.json');

  it('non-core manifest file exists and is valid JSON', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest file must exist');
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(data.nonCoreApps, 'must have nonCoreApps key');
    assert.ok(Array.isArray(data.nonCoreApps), 'nonCoreApps must be array');
  });

  it('bugtracker entry present in manifest', () => {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entry = data.nonCoreApps.find(a => a.tabId === 'bugtracker');
    assert.ok(entry, 'bugtracker entry must be in manifest');
    assert.strictEqual(entry.enabled, true);
    assert.match(entry.path, /tab-bugtracker\.html$/);
  });
});

/* ── WINDOW_APPS guard ──────────────────────────────────────────── */

describe('Bug Tracker — WINDOW_APPS guard', () => {
  const appJsPath = path.join(ROOT, 'client/js/app.js');

  it('app.js exists', () => {
    assert.ok(fs.existsSync(appJsPath), 'app.js must exist');
  });

  it('WINDOW_APPS contains bugtracker entry', () => {
    const src = fs.readFileSync(appJsPath, 'utf8');
    assert.match(src, /tab:\s*['"]bugtracker['"]/);
  });

  it('APP_CATEGORY_BY_TAB contains bugtracker entry', () => {
    const src = fs.readFileSync(appJsPath, 'utf8');
    assert.match(src, /bugtracker:\s*['"]tools['"]/);
  });
});

/* ── HTML payload guard ─────────────────────────────────────────── */

describe('Bug Tracker — HTML payload guard', () => {
  const htmlPath = path.join(ROOT, 'client/apps/non-core/core/tab-bugtracker.html');

  it('tab-bugtracker.html exists', () => {
    assert.ok(fs.existsSync(htmlPath), 'tab-bugtracker.html must exist');
  });

  it('root container has correct id and class', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /id=["']tab-bugtracker["']/);
    assert.match(html, /class=["'][^"']*tab-content[^"']*["']/);
  });

  it('has IIFE init guard', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /__bugtrackerInit/);
  });

  it('contains no <style> or <link> tags', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.doesNotMatch(html, /<style[\s>]/i);
    assert.doesNotMatch(html, /<link[\s>]/i);
  });
});

/* ── .bugtrack.json schema validation ───────────────────────────── */

describe('Bug Tracker — Schema validation', () => {
  const SEVERITIES = ['critical', 'high', 'medium', 'low'];
  const STATUSES   = ['open', 'in-progress', 'fixed', 'wont-fix', 'duplicate'];

  function validateBugtrackFile(obj) {
    const errors = [];
    if (obj.format !== 'nekocore-bugtrack-v1') errors.push('bad format');
    if (typeof obj.project !== 'string' || !obj.project) errors.push('missing project');
    if (!Array.isArray(obj.bugs)) errors.push('bugs must be array');
    for (const bug of (obj.bugs || [])) {
      if (typeof bug.id !== 'string' || !bug.id.match(/^BUG-\d{3,}$/)) errors.push(`bad id: ${bug.id}`);
      if (typeof bug.title !== 'string' || !bug.title.trim()) errors.push(`empty title on ${bug.id}`);
      if (!SEVERITIES.includes(bug.severity)) errors.push(`bad severity: ${bug.severity}`);
      if (!STATUSES.includes(bug.status)) errors.push(`bad status: ${bug.status}`);
      if (!Array.isArray(bug.screenshots)) errors.push(`screenshots must be array on ${bug.id}`);
    }
    return errors;
  }

  it('valid bugtrack file passes validation', () => {
    const valid = {
      format: 'nekocore-bugtrack-v1',
      project: 'NekoCore OS',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      bugs: [
        {
          id: 'BUG-001', title: 'Test bug', severity: 'medium', status: 'open',
          area: 'Chat', description: 'desc', steps: '', expected: '', actual: '',
          screenshots: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }
      ]
    };
    assert.deepStrictEqual(validateBugtrackFile(valid), []);
  });

  it('rejects missing format', () => {
    const bad = { format: 'wrong', project: 'X', bugs: [] };
    assert.ok(validateBugtrackFile(bad).includes('bad format'));
  });

  it('rejects empty project', () => {
    const bad = { format: 'nekocore-bugtrack-v1', project: '', bugs: [] };
    assert.ok(validateBugtrackFile(bad).includes('missing project'));
  });

  it('rejects bad bug ID format', () => {
    const bad = {
      format: 'nekocore-bugtrack-v1', project: 'X', bugs: [
        { id: 'BUG-A', title: 'x', severity: 'low', status: 'open', screenshots: [] }
      ]
    };
    const errs = validateBugtrackFile(bad);
    assert.ok(errs.some(e => e.includes('bad id')));
  });

  it('rejects invalid severity', () => {
    const bad = {
      format: 'nekocore-bugtrack-v1', project: 'X', bugs: [
        { id: 'BUG-001', title: 'x', severity: 'extreme', status: 'open', screenshots: [] }
      ]
    };
    const errs = validateBugtrackFile(bad);
    assert.ok(errs.some(e => e.includes('bad severity')));
  });
});

/* ── Bug ID generation ──────────────────────────────────────────── */

describe('Bug Tracker — ID generation', () => {
  function nextBugId(bugs) {
    if (!bugs.length) return 'BUG-001';
    const nums = bugs.map(b => parseInt(b.id.replace('BUG-', ''), 10)).filter(n => !isNaN(n));
    const max = Math.max(0, ...nums);
    return `BUG-${String(max + 1).padStart(3, '0')}`;
  }

  it('first bug gets BUG-001', () => {
    assert.strictEqual(nextBugId([]), 'BUG-001');
  });

  it('sequential after existing', () => {
    const bugs = [{ id: 'BUG-001' }, { id: 'BUG-002' }];
    assert.strictEqual(nextBugId(bugs), 'BUG-003');
  });

  it('fills after gap correctly (uses max, not gap-fill)', () => {
    const bugs = [{ id: 'BUG-001' }, { id: 'BUG-005' }];
    assert.strictEqual(nextBugId(bugs), 'BUG-006');
  });

  it('handles three-digit overflow', () => {
    const bugs = [{ id: 'BUG-999' }];
    assert.strictEqual(nextBugId(bugs), 'BUG-1000');
  });
});

/* ── Markdown report generation ─────────────────────────────────── */

describe('Bug Tracker — Markdown report generation', () => {
  function generateMarkdownReport(project, bugs) {
    const open  = bugs.filter(b => b.status === 'open').length;
    const fixed = bugs.filter(b => b.status === 'fixed').length;
    let md = `# Bug Report — ${project}\n`;
    md += `Generated: ${new Date().toISOString().slice(0, 10)}\n`;
    md += `Total: ${bugs.length} | Open: ${open} | Fixed: ${fixed}\n\n---\n\n`;
    for (const bug of bugs) {
      md += `## ${bug.id} — ${bug.title}\n`;
      md += `**Area:** ${bug.area || 'Unspecified'}  \n`;
      md += `**Severity:** ${bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1)}  \n`;
      md += `**Status:** ${bug.status.charAt(0).toUpperCase() + bug.status.slice(1)}  \n`;
      if (bug.description) md += `**Description:** ${bug.description}  \n`;
      if (bug.steps) md += `**Steps to Reproduce:** ${bug.steps}  \n`;
      if (bug.expected) md += `**Expected:** ${bug.expected}  \n`;
      if (bug.actual) md += `**Actual:** ${bug.actual}  \n`;
      if (bug.screenshots && bug.screenshots.length) {
        md += `**Screenshots:** ${bug.screenshots.length} attached (see .bugtrack.json for images)  \n`;
      }
      md += `\n---\n\n`;
    }
    return md;
  }

  it('report header contains project name and counts', () => {
    const bugs = [
      { id: 'BUG-001', title: 'A', severity: 'high', status: 'open', area: 'UI', description: '', steps: '', expected: '', actual: '', screenshots: [] },
      { id: 'BUG-002', title: 'B', severity: 'low', status: 'fixed', area: 'Server', description: '', steps: '', expected: '', actual: '', screenshots: [] }
    ];
    const md = generateMarkdownReport('Test Project', bugs);
    assert.ok(md.includes('# Bug Report — Test Project'));
    assert.ok(md.includes('Total: 2 | Open: 1 | Fixed: 1'));
  });

  it('each bug has its own section', () => {
    const bugs = [
      { id: 'BUG-001', title: 'First', severity: 'critical', status: 'open', area: 'Chat', description: 'Broken', steps: '1. open', expected: 'works', actual: 'crash', screenshots: [] }
    ];
    const md = generateMarkdownReport('P', bugs);
    assert.ok(md.includes('## BUG-001 — First'));
    assert.ok(md.includes('**Severity:** Critical'));
    assert.ok(md.includes('**Description:** Broken'));
  });

  it('screenshot count mentioned when present', () => {
    const bugs = [
      { id: 'BUG-001', title: 'X', severity: 'low', status: 'open', area: '', description: '', steps: '', expected: '', actual: '', screenshots: [{ name: 'a.png' }, { name: 'b.png' }] }
    ];
    const md = generateMarkdownReport('P', bugs);
    assert.ok(md.includes('**Screenshots:** 2 attached'));
  });

  it('empty bug list produces header only', () => {
    const md = generateMarkdownReport('Empty', []);
    assert.ok(md.includes('Total: 0 | Open: 0 | Fixed: 0'));
    assert.ok(!md.includes('## BUG-'));
  });
});
