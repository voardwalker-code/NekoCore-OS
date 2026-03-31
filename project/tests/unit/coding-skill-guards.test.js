// ── Tests · Coding Skill Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, path, fs, os. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Coding Skill Guard Tests
// Validates: coding skill SKILL.md, ws_mkdir tool, code module
// tool list, code blueprint enhancements, skill auto-migration.
// ============================================================

'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

// === Section 1: Coding skill file existence and structure ===

describe('Coding skill — SKILL.md', () => {
  const skillPath = path.join(__dirname, '../../skills/coding/SKILL.md');

  it('coding/SKILL.md exists', () => {
    assert.ok(fs.existsSync(skillPath), 'skills/coding/SKILL.md should exist');
  });

  it('has YAML frontmatter', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.startsWith('---'), 'should start with YAML frontmatter');
    const endIdx = content.indexOf('---', 3);
    assert.ok(endIdx > 3, 'should have closing frontmatter delimiter');
  });

  it('frontmatter has name: coding', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('name: coding'), 'frontmatter should declare name: coding');
  });

  it('frontmatter has enabled: true', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('enabled: true'), 'frontmatter should declare enabled: true');
  });

  it('frontmatter has description', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('description:'), 'frontmatter should include description');
  });
});

// === Section 2: Coding skill content quality ===

describe('Coding skill — content completeness', () => {
  const skillPath = path.join(__dirname, '../../skills/coding/SKILL.md');
  let content;

  it('loads content', () => {
    content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.length > 500, 'skill should have substantial instructions');
  });

  it('documents ws_write tool', () => {
    assert.ok(content.includes('ws_write'), 'should document ws_write tool');
  });

  it('documents ws_read tool', () => {
    assert.ok(content.includes('ws_read'), 'should document ws_read tool');
  });

  it('documents ws_list tool', () => {
    assert.ok(content.includes('ws_list'), 'should document ws_list tool');
  });

  it('documents ws_mkdir tool', () => {
    assert.ok(content.includes('ws_mkdir'), 'should document ws_mkdir tool');
  });

  it('documents ws_delete tool', () => {
    assert.ok(content.includes('ws_delete'), 'should document ws_delete tool');
  });

  it('documents ws_move tool', () => {
    assert.ok(content.includes('ws_move'), 'should document ws_move tool');
  });

  it('emphasizes COMPLETE files rule', () => {
    assert.ok(content.includes('COMPLETE'), 'should emphasize writing complete files');
  });

  it('emphasizes READ before EDIT rule', () => {
    assert.ok(content.includes('READ before'), 'should emphasize reading before editing');
  });

  it('includes JavaScript pattern', () => {
    assert.ok(content.includes('module.exports'), 'should include JS export pattern');
  });

  it('includes Python pattern', () => {
    assert.ok(content.includes('__name__'), 'should include Python main guard pattern');
  });

  it('includes HTML pattern', () => {
    assert.ok(content.includes('<!DOCTYPE html>'), 'should include HTML doctype pattern');
  });

  it('includes project scaffolding patterns', () => {
    assert.ok(content.includes('package.json'), 'should mention package.json in scaffold');
  });

  it('mentions security (no secrets in code)', () => {
    assert.ok(content.includes('secret') || content.includes('API key') || content.includes('password'),
      'should warn about not hardcoding secrets');
  });
});

// === Section 3: Code module tool list ===

describe('Code module — task-types.js', () => {
  const { DEFAULT_MODULE_CONFIGS, TASK_TYPES } = require('../../server/brain/tasks/task-types');

  it('CODE task type exists', () => {
    assert.ok(TASK_TYPES.CODE, 'CODE task type should exist');
    assert.equal(TASK_TYPES.CODE, 'code');
  });

  it('code module config exists', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config, 'code module config should exist');
  });

  it('code module has ws_read', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_read'), 'should include ws_read');
  });

  it('code module has ws_write', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_write'), 'should include ws_write');
  });

  it('code module has ws_list', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_list'), 'should include ws_list');
  });

  it('code module has ws_append', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_append'), 'should include ws_append');
  });

  it('code module has ws_delete', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_delete'), 'should include ws_delete');
  });

  it('code module has ws_move', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_move'), 'should include ws_move');
  });

  it('code module has ws_mkdir', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.tools.includes('ws_mkdir'), 'should include ws_mkdir');
  });

  it('code module has increased maxSteps for multi-file work', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(config.maxSteps >= 8, 'maxSteps should be >= 8 for multi-file projects');
  });
});

// === Section 4: ws_mkdir tool in workspace-tools ===

describe('ws_mkdir — workspace tool execution', () => {
  const { executeToolCalls } = require('../../server/brain/skills/workspace-tools');
  // makeTempWorkspace()
  // WHAT THIS DOES: makeTempWorkspace creates or initializes something needed by the flow.
  // WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
  // HOW TO USE IT: call makeTempWorkspace(...) before code that depends on this setup.
  function makeTempWorkspace() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'nekocore-ws-mkdir-'));
  }
  function cleanup(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  it('creates a new directory', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      const payload = '[TOOL:ws_mkdir path="src/utils"]';
      const out = await executeToolCalls(payload, { workspacePath: wsRoot });

      assert.equal(out.hadTools, true);
      assert.equal(out.toolResults.length, 1);
      assert.equal(out.toolResults[0].command, 'ws_mkdir');
      assert.equal(out.toolResults[0].result.ok, true);
      assert.ok(fs.existsSync(path.join(wsRoot, 'src', 'utils')), 'directory should be created');
    } finally {
      cleanup(wsRoot);
    }
  });

  it('creates nested directories recursively', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      const payload = '[TOOL:ws_mkdir path="a/b/c/d"]';
      const out = await executeToolCalls(payload, { workspacePath: wsRoot });

      assert.equal(out.toolResults[0].result.ok, true);
      assert.ok(fs.existsSync(path.join(wsRoot, 'a', 'b', 'c', 'd')), 'nested dirs should be created');
    } finally {
      cleanup(wsRoot);
    }
  });

  it('succeeds if directory already exists', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      const targetDir = path.join(wsRoot, 'existing');
      fs.mkdirSync(targetDir);

      const payload = '[TOOL:ws_mkdir path="existing"]';
      const out = await executeToolCalls(payload, { workspacePath: wsRoot });

      assert.equal(out.toolResults[0].result.ok, true);
      assert.ok(out.toolResults[0].result.message.includes('already exists'));
    } finally {
      cleanup(wsRoot);
    }
  });

  it('rejects path outside workspace', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      const payload = '[TOOL:ws_mkdir path="../escape"]';
      const out = await executeToolCalls(payload, { workspacePath: wsRoot });

      assert.equal(out.toolResults[0].result.ok, false);
      assert.ok(out.toolResults[0].result.error.includes('outside workspace'));
    } finally {
      cleanup(wsRoot);
    }
  });

  it('fails with no path specified', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      const payload = '[TOOL:ws_mkdir path=""]';
      const out = await executeToolCalls(payload, { workspacePath: wsRoot });

      assert.equal(out.toolResults[0].result.ok, false);
    } finally {
      cleanup(wsRoot);
    }
  });

  it('fails with no workspace configured', async () => {
    const payload = '[TOOL:ws_mkdir path="test"]';
    const out = await executeToolCalls(payload, { workspacePath: '' });

    assert.equal(out.toolResults[0].result.ok, false);
    assert.ok(out.toolResults[0].result.error.includes('No workspace'));
  });
});

// === Section 5: Code blueprint enhancements ===

describe('Code blueprint — enhanced content', () => {
  const blueprintPath = path.join(__dirname, '../../server/brain/tasks/blueprints/modules/code.md');
  let content;

  it('loads blueprint', () => {
    content = fs.readFileSync(blueprintPath, 'utf-8');
    assert.ok(content.length > 500, 'blueprint should be substantial');
  });

  it('mentions writing real files', () => {
    assert.ok(content.includes('real file') || content.includes('REAL') || content.includes('actual file'),
      'should emphasize writing real files');
  });

  it('has multi-file project plan pattern', () => {
    assert.ok(content.includes('multi-file') || content.includes('Multi-File'),
      'should include multi-file project pattern');
  });

  it('documents ws_mkdir tool', () => {
    assert.ok(content.includes('ws_mkdir'), 'should document ws_mkdir for scaffolding');
  });

  it('documents ws_delete tool', () => {
    assert.ok(content.includes('ws_delete'), 'should document ws_delete');
  });

  it('documents ws_move tool', () => {
    assert.ok(content.includes('ws_move'), 'should document ws_move');
  });

  it('has MANDATORY workflow section', () => {
    assert.ok(content.includes('MANDATORY') || content.includes('mandatory'),
      'should have a mandatory workflow section');
  });

  it('emphasizes COMPLETE files', () => {
    assert.ok(content.includes('COMPLETE file') || content.includes('complete file'),
      'should emphasize writing complete files');
  });

  it('warns against common mistakes', () => {
    assert.ok(content.includes('Common Mistakes') || content.includes('common mistake') || content.includes('Avoid'),
      'should warn against common coding mistakes');
  });
});

// === Section 6: ws_mkdir + ws_write integration (scaffolding) ===

describe('Code scaffolding — mkdir + write integration', () => {
  const { executeToolCalls } = require('../../server/brain/skills/workspace-tools');
  // makeTempWorkspace()
  // WHAT THIS DOES: makeTempWorkspace creates or initializes something needed by the flow.
  // WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
  // HOW TO USE IT: call makeTempWorkspace(...) before code that depends on this setup.
  function makeTempWorkspace() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'nekocore-scaffold-'));
  }
  function cleanup(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  it('can create a directory then write a file into it', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      // Step 1: create directory
      const mkdirPayload = '[TOOL:ws_mkdir path="my-project/src"]';
      await executeToolCalls(mkdirPayload, { workspacePath: wsRoot });

      // Step 2: write a file
      const writePayload = '[TOOL:ws_write path="my-project/src/index.js" content="console.log(\'hello\');"]';
      const out = await executeToolCalls(writePayload, { workspacePath: wsRoot });

      assert.equal(out.toolResults[0].result.ok, true);
      const written = fs.readFileSync(path.join(wsRoot, 'my-project', 'src', 'index.js'), 'utf-8');
      assert.equal(written, "console.log('hello');");
    } finally {
      cleanup(wsRoot);
    }
  });

  it('can scaffold a multi-file project', async () => {
    const wsRoot = makeTempWorkspace();
    try {
      // Create directories
      await executeToolCalls('[TOOL:ws_mkdir path="app/src"]', { workspacePath: wsRoot });
      await executeToolCalls('[TOOL:ws_mkdir path="app/tests"]', { workspacePath: wsRoot });

      // Write files
      await executeToolCalls('[TOOL:ws_write path="app/package.json" content="{}"]', { workspacePath: wsRoot });
      await executeToolCalls('[TOOL:ws_write path="app/src/index.js" content="module.exports = {};"]', { workspacePath: wsRoot });
      await executeToolCalls('[TOOL:ws_write path="app/tests/test.js" content="// tests"]', { workspacePath: wsRoot });

      // Verify all files exist
      assert.ok(fs.existsSync(path.join(wsRoot, 'app', 'package.json')));
      assert.ok(fs.existsSync(path.join(wsRoot, 'app', 'src', 'index.js')));
      assert.ok(fs.existsSync(path.join(wsRoot, 'app', 'tests', 'test.js')));

      // Verify contents
      assert.equal(fs.readFileSync(path.join(wsRoot, 'app', 'package.json'), 'utf-8'), '{}');
      assert.equal(fs.readFileSync(path.join(wsRoot, 'app', 'src', 'index.js'), 'utf-8'), 'module.exports = {};');
    } finally {
      cleanup(wsRoot);
    }
  });
});

// === Section 7: Task module registry reflects code module changes ===

describe('Task module registry — code module', () => {
  it('code module is registered in singleton', () => {
    const registry = require('../../server/brain/tasks/task-module-registry');
    assert.ok(registry.hasModule('code'), 'code module should be registered');
  });

  it('code module has full tool set', () => {
    const registry = require('../../server/brain/tasks/task-module-registry');
    const mod = registry.getModule('code');
    assert.ok(mod, 'code module should exist');
    const expected = ['ws_read', 'ws_write', 'ws_list', 'ws_append', 'ws_delete', 'ws_move', 'ws_mkdir'];
    for (const tool of expected) {
      assert.ok(mod.tools.includes(tool), `code module should include ${tool}`);
    }
  });

  it('code module sourceOfTruth is workspace_files', () => {
    const registry = require('../../server/brain/tasks/task-module-registry');
    const mod = registry.getModule('code');
    assert.equal(mod.sourceOfTruth, 'workspace_files');
  });
});
