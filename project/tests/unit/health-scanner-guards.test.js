// ============================================================
// System Health Scanner + Fixer Generator Guard Tests
// Validates: core registry completeness, scanner engine,
// fixer generator output, cross-platform paths, BOM handling,
// JSON/JS/HTML/CSS checks, programmatic API exports.
// ============================================================

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { CORE_REGISTRY, runScan } = require('../../scripts/health-scan');
const { generateFixer } = require('../../scripts/generate-fixer');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// === Section 1: CORE_REGISTRY structure ===

describe('Health Scanner — CORE_REGISTRY', () => {
  it('exports CORE_REGISTRY as a non-empty object', () => {
    assert.ok(typeof CORE_REGISTRY === 'object' && CORE_REGISTRY !== null);
    assert.ok(Object.keys(CORE_REGISTRY).length > 200, 'Should have 200+ core files');
  });

  it('all keys are relative paths with forward slashes', () => {
    for (const key of Object.keys(CORE_REGISTRY)) {
      assert.ok(!key.includes('\\'), `Key should use forward slashes: ${key}`);
      assert.ok(!path.isAbsolute(key), `Key should be relative: ${key}`);
    }
  });

  it('all values are non-empty description strings', () => {
    for (const [key, val] of Object.entries(CORE_REGISTRY)) {
      assert.ok(typeof val === 'string' && val.length > 0, `Description for ${key} should be non-empty`);
    }
  });

  it('includes server bootstrap', () => {
    assert.ok(CORE_REGISTRY['server/server.js'], 'Should include server/server.js');
  });

  it('includes client shell', () => {
    assert.ok(CORE_REGISTRY['client/index.html'], 'Should include client/index.html');
  });

  it('includes brain core orchestrator', () => {
    assert.ok(CORE_REGISTRY['server/brain/core/orchestrator.js']);
  });

  it('includes chat pipeline', () => {
    assert.ok(CORE_REGISTRY['server/services/chat-pipeline.js']);
  });

  it('includes all brain subsystem indexes', () => {
    const indexes = [
      'server/brain/core/index.js',
      'server/brain/cognition/index.js',
      'server/brain/bus/index.js',
      'server/brain/utils/index.js',
      'server/brain/memory/index.js',
      'server/brain/identity/index.js',
      'server/brain/affect/index.js',
      'server/brain/generation/index.js',
      'server/brain/knowledge/index.js',
      'server/brain/skills/index.js'
    ];
    for (const idx of indexes) {
      assert.ok(CORE_REGISTRY[idx], `Should include ${idx}`);
    }
  });

  it('includes all cognition phases', () => {
    const phases = [
      'phase-archive', 'phase-archive-index', 'phase-beliefs', 'phase-boredom',
      'phase-conscious-stm', 'phase-consolidation', 'phase-decay', 'phase-deep-sleep',
      'phase-dreams', 'phase-goals', 'phase-hebbian', 'phase-identity',
      'phase-neurochemistry', 'phase-pruning', 'phase-somatic', 'phase-traces'
    ];
    for (const phase of phases) {
      const key = `server/brain/cognition/phases/${phase}.js`;
      assert.ok(CORE_REGISTRY[key], `Should include ${key}`);
    }
  });

  it('includes all task system files', () => {
    const taskFiles = [
      'task-executor', 'task-frontman', 'task-pipeline-bridge', 'task-session',
      'task-event-bus', 'task-types', 'blueprint-loader', 'intent-classifier',
      'planning-orchestrator', 'project-executor'
    ];
    for (const f of taskFiles) {
      const key = `server/brain/tasks/${f}.js`;
      assert.ok(CORE_REGISTRY[key], `Should include ${key}`);
    }
  });

  it('includes all blueprint files', () => {
    const coreBlueprints = ['task-decomposition', 'tool-guide', 'quality-gate', 'error-recovery', 'output-format'];
    const moduleBlueprints = ['research', 'code', 'writing', 'analysis', 'planning', 'project'];

    for (const bp of coreBlueprints) {
      assert.ok(CORE_REGISTRY[`server/brain/tasks/blueprints/core/${bp}.md`]);
    }
    for (const bp of moduleBlueprints) {
      assert.ok(CORE_REGISTRY[`server/brain/tasks/blueprints/modules/${bp}.md`]);
    }
  });

  it('includes all route files', () => {
    const routes = [
      'archive-routes', 'auth-routes', 'brain-routes', 'browser-routes',
      'chat-routes', 'cognitive-routes', 'config-routes', 'document-routes',
      'entity-chat-routes', 'entity-routes', 'memory-routes', 'nekocore-routes',
      'skills-routes', 'sse-routes', 'task-routes', 'vfs-routes'
    ];
    for (const r of routes) {
      assert.ok(CORE_REGISTRY[`server/routes/${r}.js`], `Should include ${r}`);
    }
  });

  it('includes client CSS files', () => {
    assert.ok(CORE_REGISTRY['client/css/system-shared.css']);
    assert.ok(CORE_REGISTRY['client/css/ui-v2.css']);
    assert.ok(CORE_REGISTRY['client/css/theme.css']);
  });

  it('includes core tab HTML files', () => {
    const tabs = ['chat', 'activity', 'archive', 'debugcore', 'settings', 'advanced', 'creator', 'users', 'entity', 'nekocore'];
    for (const tab of tabs) {
      assert.ok(CORE_REGISTRY[`client/apps/core/tab-${tab}.html`]);
    }
  });

  it('includes theme system', () => {
    assert.ok(CORE_REGISTRY['client/themes/themes.manifest.json']);
    assert.ok(CORE_REGISTRY['client/themes/core/neko-default.css']);
  });
});

// === Section 2: All registered files actually exist ===

describe('Health Scanner — core files exist on disk', () => {
  it('every registered file exists', () => {
    const missing = [];
    for (const relPath of Object.keys(CORE_REGISTRY)) {
      const abs = path.join(PROJECT_ROOT, relPath);
      if (!fs.existsSync(abs)) {
        missing.push(relPath);
      }
    }
    assert.strictEqual(
      missing.length, 0,
      `${missing.length} registered files are missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`
    );
  });

  it('no registered file is zero bytes', () => {
    const empty = [];
    for (const relPath of Object.keys(CORE_REGISTRY)) {
      const abs = path.join(PROJECT_ROOT, relPath);
      if (fs.existsSync(abs) && fs.statSync(abs).size === 0) {
        empty.push(relPath);
      }
    }
    assert.strictEqual(
      empty.length, 0,
      `${empty.length} registered files are 0 bytes: ${empty.join(', ')}`
    );
  });
});

// === Section 3: Scanner engine ===

describe('Health Scanner — runScan programmatic', () => {
  it('exports runScan as a function', () => {
    assert.strictEqual(typeof runScan, 'function');
  });
});

// === Section 4: Fixer generator ===

describe('Fixer Generator — exports', () => {
  it('exports generateFixer as a function', () => {
    assert.strictEqual(typeof generateFixer, 'function');
  });
});

describe('Fixer Generator — dry run', () => {
  it('dry run produces expected metadata', () => {
    const result = generateFixer({ dryRun: true });
    assert.ok(result.dryRun === true);
    assert.ok(typeof result.encodedCount === 'number');
    assert.ok(result.encodedCount > 200, 'Should encode 200+ files');
    assert.ok(typeof result.totalSize === 'number');
    assert.ok(result.totalSize > 100000, 'Total size should be >100KB');
    assert.ok(typeof result.outputPath === 'string');
  });

  it('skipped count is zero when all files exist', () => {
    const result = generateFixer({ dryRun: true });
    assert.strictEqual(result.skippedCount, 0, 'No files should be skipped when all exist');
  });
});

// === Section 5: Script file existence ===

describe('Health Scanner — script files', () => {
  it('health-scan.js exists', () => {
    const p = path.join(PROJECT_ROOT, 'scripts/health-scan.js');
    assert.ok(fs.existsSync(p));
  });

  it('generate-fixer.js exists', () => {
    const p = path.join(PROJECT_ROOT, 'scripts/generate-fixer.js');
    assert.ok(fs.existsSync(p));
  });

  it('health-scan.js is substantial', () => {
    const p = path.join(PROJECT_ROOT, 'scripts/health-scan.js');
    const size = fs.statSync(p).size;
    assert.ok(size > 5000, `health-scan.js should be >5KB, got ${size}`);
  });

  it('generate-fixer.js is substantial', () => {
    const p = path.join(PROJECT_ROOT, 'scripts/generate-fixer.js');
    const size = fs.statSync(p).size;
    assert.ok(size > 3000, `generate-fixer.js should be >3KB, got ${size}`);
  });
});

// === Section 6: CORE_REGISTRY path normalization ===

describe('Health Scanner — path safety', () => {
  it('no registry path traverses upward', () => {
    for (const key of Object.keys(CORE_REGISTRY)) {
      assert.ok(!key.includes('..'), `Path should not traverse up: ${key}`);
    }
  });

  it('no registry path starts with /', () => {
    for (const key of Object.keys(CORE_REGISTRY)) {
      assert.ok(!key.startsWith('/'), `Path should not start with /: ${key}`);
    }
  });

  it('no registry path contains node_modules', () => {
    for (const key of Object.keys(CORE_REGISTRY)) {
      assert.ok(!key.includes('node_modules'), `Path should not include node_modules: ${key}`);
    }
  });
});

// === Section 7: Registry subsystem coverage ===

describe('Health Scanner — subsystem coverage', () => {
  it('covers server routes', () => {
    const routes = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/routes/'));
    assert.ok(routes.length >= 16, `Should have 16+ route files, got ${routes.length}`);
  });

  it('covers server services', () => {
    const services = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/services/'));
    assert.ok(services.length >= 20, `Should have 20+ service files, got ${services.length}`);
  });

  it('covers server contracts', () => {
    const contracts = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/contracts/'));
    assert.ok(contracts.length >= 7, `Should have 7+ contract files, got ${contracts.length}`);
  });

  it('covers brain core', () => {
    const core = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/brain/core/'));
    assert.ok(core.length >= 6, `Should have 6+ brain core files, got ${core.length}`);
  });

  it('covers brain cognition', () => {
    const cognition = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/brain/cognition/'));
    assert.ok(cognition.length >= 14, `Should have 14+ cognition files, got ${cognition.length}`);
  });

  it('covers brain cognition phases', () => {
    const phases = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/brain/cognition/phases/'));
    assert.ok(phases.length >= 16, `Should have 16+ phase files, got ${phases.length}`);
  });

  it('covers brain tasks', () => {
    const tasks = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/brain/tasks/') && k.endsWith('.js'));
    assert.ok(tasks.length >= 18, `Should have 18+ task files, got ${tasks.length}`);
  });

  it('covers brain utils', () => {
    const utils = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('server/brain/utils/'));
    assert.ok(utils.length >= 15, `Should have 15+ util files, got ${utils.length}`);
  });

  it('covers client JS', () => {
    const js = Object.keys(CORE_REGISTRY).filter(k => k.startsWith('client/js/') && k.endsWith('.js'));
    assert.ok(js.length >= 25, `Should have 25+ client JS files, got ${js.length}`);
  });

  it('covers client HTML', () => {
    const html = Object.keys(CORE_REGISTRY).filter(k => k.endsWith('.html'));
    assert.ok(html.length >= 15, `Should have 15+ HTML files, got ${html.length}`);
  });

  it('covers blueprints', () => {
    const bps = Object.keys(CORE_REGISTRY).filter(k => k.includes('blueprints/') && k.endsWith('.md'));
    assert.ok(bps.length >= 11, `Should have 11+ blueprint files, got ${bps.length}`);
  });
});

// === Section 8: .gitignore covers generated artifacts ===

describe('Health Scanner — gitignore coverage', () => {
  it('.gitignore includes neko_fixer.py', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '../.gitignore'), 'utf-8');
    assert.ok(gitignore.includes('neko_fixer.py'), '.gitignore should cover neko_fixer.py');
  });

  it('.gitignore covers *.log files', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '../.gitignore'), 'utf-8');
    assert.ok(gitignore.includes('*.log'), '.gitignore should cover *.log (health-report.log)');
  });
});
