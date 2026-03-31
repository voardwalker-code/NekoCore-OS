// ── Tests · Cmd Run Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, path, fs, ../../server/integrations/cmd-executor. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// cmd_run Tool + Rust/Python Skill Guard Tests
// Validates: command executor security, tool wiring, skill
// structure, task-type integration, workspace-tools dispatch.
// ============================================================

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ── cmd-executor module ──

const cmdExecutor = require('../../server/integrations/cmd-executor');

// === Section 1: Command Whitelist ===

describe('cmd-executor — command whitelist', () => {
  it('exports COMMAND_WHITELIST as a non-empty object', () => {
    assert.ok(typeof cmdExecutor.COMMAND_WHITELIST === 'object');
    assert.ok(Object.keys(cmdExecutor.COMMAND_WHITELIST).length >= 10);
  });

  it('includes Rust toolchain commands', () => {
    assert.ok(cmdExecutor.COMMAND_WHITELIST['cargo']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['rustc']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['rustfmt']);
  });

  it('includes Python commands', () => {
    assert.ok(cmdExecutor.COMMAND_WHITELIST['python']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['python3']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['pip']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['pip3']);
  });

  it('includes Node.js commands', () => {
    assert.ok(cmdExecutor.COMMAND_WHITELIST['node']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['npm']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['npx']);
  });

  it('includes general build tools', () => {
    assert.ok(cmdExecutor.COMMAND_WHITELIST['gcc']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['make']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['go']);
    assert.ok(cmdExecutor.COMMAND_WHITELIST['git']);
  });

  it('cargo has restricted subcommands', () => {
    const cargo = cmdExecutor.COMMAND_WHITELIST['cargo'];
    assert.ok(Array.isArray(cargo.allowedSubcommands));
    assert.ok(cargo.allowedSubcommands.includes('build'));
    assert.ok(cargo.allowedSubcommands.includes('run'));
    assert.ok(cargo.allowedSubcommands.includes('test'));
    assert.ok(cargo.allowedSubcommands.includes('check'));
    assert.ok(cargo.allowedSubcommands.includes('clippy'));
    assert.ok(cargo.allowedSubcommands.includes('fmt'));
    assert.ok(cargo.allowedSubcommands.includes('init'));
    assert.ok(cargo.allowedSubcommands.includes('new'));
    assert.ok(cargo.allowedSubcommands.includes('add'));
  });

  it('pip has restricted subcommands', () => {
    const pip = cmdExecutor.COMMAND_WHITELIST['pip'];
    assert.ok(Array.isArray(pip.allowedSubcommands));
    assert.ok(pip.allowedSubcommands.includes('install'));
    assert.ok(pip.allowedSubcommands.includes('list'));
    assert.ok(pip.allowedSubcommands.includes('freeze'));
  });

  it('git has restricted subcommands', () => {
    const git = cmdExecutor.COMMAND_WHITELIST['git'];
    assert.ok(Array.isArray(git.allowedSubcommands));
    assert.ok(git.allowedSubcommands.includes('init'));
    assert.ok(git.allowedSubcommands.includes('status'));
    assert.ok(!git.allowedSubcommands.includes('push'), 'git push should NOT be whitelisted');
    assert.ok(!git.allowedSubcommands.includes('pull'), 'git pull should NOT be whitelisted');
  });
});

// === Section 2: Command Parsing and Security ===

describe('cmd-executor — parseCommand security', () => {
  it('rejects empty command', () => {
    const result = cmdExecutor.parseCommand('');
    assert.strictEqual(result.ok, false);
  });

  it('rejects null command', () => {
    const result = cmdExecutor.parseCommand(null);
    assert.strictEqual(result.ok, false);
  });

  it('rejects non-whitelisted command', () => {
    const result = cmdExecutor.parseCommand('rm -rf /');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('not allowed'));
  });

  it('rejects shell metacharacters in arguments', () => {
    const result = cmdExecutor.parseCommand('node script.js; rm -rf /');
    assert.strictEqual(result.ok, false);
  });

  it('rejects pipe operator in arguments', () => {
    const result = cmdExecutor.parseCommand('node script.js | cat');
    assert.strictEqual(result.ok, false);
  });

  it('rejects backtick injection', () => {
    const result = cmdExecutor.parseCommand('node `malicious`');
    assert.strictEqual(result.ok, false);
  });

  it('rejects dollar sign expansion', () => {
    const result = cmdExecutor.parseCommand('node $HOME/script.js');
    assert.strictEqual(result.ok, false);
  });

  it('rejects directory traversal in args', () => {
    const result = cmdExecutor.parseCommand('node ../../etc/passwd');
    assert.strictEqual(result.ok, false);
  });

  it('rejects dangerous commands embedded in args', () => {
    const result = cmdExecutor.parseCommand('node --eval "require(\'child_process\').exec(\'rm -rf /\')"');
    assert.strictEqual(result.ok, false);
  });

  it('rejects curl/wget in arguments', () => {
    const result = cmdExecutor.parseCommand('node curl http://evil.com');
    assert.strictEqual(result.ok, false);
  });

  it('rejects powershell in arguments', () => {
    const result = cmdExecutor.parseCommand('node powershell -c bad');
    assert.strictEqual(result.ok, false);
  });

  it('rejects disallowed cargo subcommand', () => {
    const result = cmdExecutor.parseCommand('cargo publish');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('Subcommand'));
  });

  it('rejects disallowed pip subcommand', () => {
    const result = cmdExecutor.parseCommand('pip download some-package');
    assert.strictEqual(result.ok, false);
  });

  it('accepts valid cargo build', () => {
    const result = cmdExecutor.parseCommand('cargo build');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.binary, 'cargo');
    assert.deepStrictEqual(result.args, ['build']);
  });

  it('accepts valid python command', () => {
    const result = cmdExecutor.parseCommand('python main.py');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.binary, 'python');
    assert.deepStrictEqual(result.args, ['main.py']);
  });

  it('accepts valid npm test', () => {
    const result = cmdExecutor.parseCommand('npm test');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.binary, 'npm');
    assert.deepStrictEqual(result.args, ['test']);
  });

  it('accepts cargo with flags', () => {
    const result = cmdExecutor.parseCommand('cargo build --release');
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.args, ['build', '--release']);
  });

  it('accepts python with module flag', () => {
    const result = cmdExecutor.parseCommand('python -m pytest tests/ -v');
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.args, ['-m', 'pytest', 'tests/', '-v']);
  });

  it('handles quoted arguments', () => {
    const result = cmdExecutor.parseCommand('node -e "console.log(42)"');
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.args, ['-e', 'console.log(42)']);
  });
});

// === Section 3: execCommand validation ===

describe('cmd-executor — execCommand validation', () => {
  it('rejects missing workspace path', async () => {
    const result = await cmdExecutor.execCommand('node -v', '');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('workspace'));
  });

  it('rejects non-existent workspace path', async () => {
    const result = await cmdExecutor.execCommand('node -v', '/nonexistent/path/xyz123');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('not exist'));
  });

  it('rejects non-whitelisted command via execCommand', async () => {
    const result = await cmdExecutor.execCommand('rm -rf /', PROJECT_ROOT);
    assert.strictEqual(result.ok, false);
  });

  it('executes node -v successfully', async () => {
    const result = await cmdExecutor.execCommand('node -v', PROJECT_ROOT);
    assert.strictEqual(result.ok, true);
    assert.ok(result.stdout.startsWith('v'), 'Should return node version');
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.timedOut, false);
  });

  it('captures exit code for failing command', async () => {
    const result = await cmdExecutor.execCommand('node -e "process.exit(1)"', PROJECT_ROOT);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.exitCode, 1);
  });

  it('captures stderr output', async () => {
    const result = await cmdExecutor.execCommand('node -e "console.error(\'test error\')"', PROJECT_ROOT);
    assert.ok(result.stderr.includes('test error'));
  });
});

// === Section 4: Module exports ===

describe('cmd-executor — exports', () => {
  it('exports execCommand', () => {
    assert.strictEqual(typeof cmdExecutor.execCommand, 'function');
  });

  it('exports parseCommand', () => {
    assert.strictEqual(typeof cmdExecutor.parseCommand, 'function');
  });

  it('exports getAvailableCommands', () => {
    assert.strictEqual(typeof cmdExecutor.getAvailableCommands, 'function');
  });

  it('getAvailableCommands returns a string listing commands', () => {
    const list = cmdExecutor.getAvailableCommands();
    assert.ok(typeof list === 'string');
    assert.ok(list.includes('cargo'));
    assert.ok(list.includes('python'));
    assert.ok(list.includes('node'));
  });

  it('exports constants', () => {
    assert.ok(typeof cmdExecutor.MAX_OUTPUT_BYTES === 'number');
    assert.ok(typeof cmdExecutor.DEFAULT_TIMEOUT_MS === 'number');
    assert.ok(typeof cmdExecutor.MAX_TIMEOUT_MS === 'number');
    assert.ok(cmdExecutor.MAX_TIMEOUT_MS >= cmdExecutor.DEFAULT_TIMEOUT_MS);
  });
});

// === Section 5: workspace-tools cmd_run dispatch ===

describe('workspace-tools — cmd_run dispatch', () => {
  const workspaceTools = require('../../server/brain/skills/workspace-tools');

  it('extractToolCalls parses cmd_run tag', () => {
    const calls = workspaceTools.extractToolCalls('[TOOL:cmd_run cmd="cargo build"]');
    assert.ok(calls.length >= 1);
    const call = calls.find(c => c.command === 'cmd_run');
    assert.ok(call);
    assert.strictEqual(call.params.cmd, 'cargo build');
  });

  it('executeToolCalls returns error when cmdRun handler is missing', async () => {
    const result = await workspaceTools.executeToolCalls('[TOOL:cmd_run cmd="cargo build"]', {
      workspacePath: PROJECT_ROOT
    });
    assert.ok(result.hadTools);
    assert.ok(result.toolResults.length >= 1);
    const cmdResult = result.toolResults.find(r => r.command === 'cmd_run');
    assert.ok(cmdResult);
    assert.strictEqual(cmdResult.result.ok, false);
    assert.ok(cmdResult.result.error.includes('not available'));
  });

  it('executeToolCalls invokes cmdRun handler when provided', async () => {
    let calledWith = null;
    // mockCmdRun()
    // Purpose: helper wrapper used by this module's main flow.
    // mockCmdRun()
    // WHAT THIS DOES: mockCmdRun is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call mockCmdRun(...) where this helper behavior is needed.
    const mockCmdRun = async (cmd, wsPath, opts) => {
      calledWith = { cmd, wsPath, opts };
      return { ok: true, exitCode: 0, stdout: 'mock output', stderr: '', timedOut: false };
    };

    const result = await workspaceTools.executeToolCalls('[TOOL:cmd_run cmd="cargo build"]', {
      workspacePath: PROJECT_ROOT,
      cmdRun: mockCmdRun
    });

    assert.ok(result.hadTools);
    assert.ok(calledWith);
    assert.strictEqual(calledWith.cmd, 'cargo build');
    assert.strictEqual(calledWith.wsPath, PROJECT_ROOT);
    const cmdResult = result.toolResults.find(r => r.command === 'cmd_run');
    assert.strictEqual(cmdResult.result.ok, true);
    assert.strictEqual(cmdResult.result.stdout, 'mock output');
  });

  it('formatToolResults formats cmd_run output with stdout/stderr', () => {
    const formatted = workspaceTools.formatToolResults([{
      command: 'cmd_run',
      params: { cmd: 'cargo build' },
      result: { ok: true, exitCode: 0, stdout: 'Compiling my-project v0.1.0', stderr: 'warning: unused variable', timedOut: false }
    }]);
    assert.ok(formatted.includes('STDOUT:'));
    assert.ok(formatted.includes('Compiling my-project'));
    assert.ok(formatted.includes('STDERR:'));
    assert.ok(formatted.includes('unused variable'));
    assert.ok(formatted.includes('Exit code: 0'));
  });
});

// === Section 6: Task types include cmd_run ===

describe('task-types — cmd_run tool access', () => {
  const { DEFAULT_MODULE_CONFIGS, TASK_TYPES } = require('../../server/brain/tasks/task-types');

  it('CODE task type includes cmd_run', () => {
    const codeConfig = DEFAULT_MODULE_CONFIGS[TASK_TYPES.CODE];
    assert.ok(codeConfig.tools.includes('cmd_run'), 'CODE should have cmd_run');
  });

  it('PROJECT task type includes cmd_run', () => {
    const projectConfig = DEFAULT_MODULE_CONFIGS[TASK_TYPES.PROJECT];
    assert.ok(projectConfig.tools.includes('cmd_run'), 'PROJECT should have cmd_run');
  });

  it('RESEARCH task type does NOT include cmd_run', () => {
    const researchConfig = DEFAULT_MODULE_CONFIGS[TASK_TYPES.RESEARCH];
    assert.ok(!researchConfig.tools.includes('cmd_run'), 'RESEARCH should not have cmd_run');
  });

  it('WRITING task type does NOT include cmd_run', () => {
    const writingConfig = DEFAULT_MODULE_CONFIGS[TASK_TYPES.WRITING];
    assert.ok(!writingConfig.tools.includes('cmd_run'), 'WRITING should not have cmd_run');
  });

  it('ANALYSIS task type does NOT include cmd_run', () => {
    const analysisConfig = DEFAULT_MODULE_CONFIGS[TASK_TYPES.ANALYSIS];
    assert.ok(!analysisConfig.tools.includes('cmd_run'), 'ANALYSIS should not have cmd_run');
  });
});

// === Section 7: Skill file structure ===

describe('skills — Rust skill', () => {
  const skillPath = path.join(PROJECT_ROOT, 'skills/rust/SKILL.md');

  it('SKILL.md exists', () => {
    assert.ok(fs.existsSync(skillPath));
  });

  it('has YAML frontmatter with name and enabled', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.startsWith('---'));
    assert.ok(content.includes('name: rust'));
    assert.ok(content.includes('enabled: true'));
  });

  it('describes cargo workflow', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('cargo build'));
    assert.ok(content.includes('cargo run'));
    assert.ok(content.includes('cargo test'));
  });

  it('includes cmd_run tool syntax', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('[TOOL:cmd_run'));
  });

  it('covers Cargo.toml patterns', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('Cargo.toml'));
    assert.ok(content.includes('[package]'));
    assert.ok(content.includes('[dependencies]'));
  });

  it('covers error handling patterns', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('Result'));
    assert.ok(content.includes('E0382'));
  });

  it('covers common crates', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('serde'));
    assert.ok(content.includes('tokio'));
    assert.ok(content.includes('clap'));
  });
});

describe('skills — Python skill', () => {
  const skillPath = path.join(PROJECT_ROOT, 'skills/python/SKILL.md');

  it('SKILL.md exists', () => {
    assert.ok(fs.existsSync(skillPath));
  });

  it('has YAML frontmatter with name and enabled', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.startsWith('---'));
    assert.ok(content.includes('name: python'));
    assert.ok(content.includes('enabled: true'));
  });

  it('describes python workflow', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('python main.py'));
    assert.ok(content.includes('pip install'));
    assert.ok(content.includes('requirements.txt'));
  });

  it('includes cmd_run tool syntax', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('[TOOL:cmd_run'));
  });

  it('covers common packages', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('requests'));
    assert.ok(content.includes('pandas'));
    assert.ok(content.includes('pytest'));
    assert.ok(content.includes('flask'));
  });

  it('covers error patterns', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('NameError'));
    assert.ok(content.includes('TypeError'));
    assert.ok(content.includes('ImportError'));
  });

  it('covers testing with pytest and unittest', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('pytest'));
    assert.ok(content.includes('unittest'));
  });
});

// === Section 8: Coding skill updated ===

describe('skills — coding skill cmd_run update', () => {
  const skillPath = path.join(PROJECT_ROOT, 'skills/coding/SKILL.md');

  it('coding skill mentions cmd_run', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('cmd_run'), 'Coding skill should mention cmd_run');
  });
});

// === Section 9: Pipeline wiring ===

describe('pipeline wiring — cmd_run', () => {
  it('chat-pipeline imports cmd-executor', () => {
    const pipeline = fs.readFileSync(
      path.join(PROJECT_ROOT, 'server/services/chat-pipeline.js'), 'utf-8'
    );
    assert.ok(pipeline.includes("require('../integrations/cmd-executor')"));
  });

  it('chat-pipeline passes cmdRun to bridge', () => {
    const pipeline = fs.readFileSync(
      path.join(PROJECT_ROOT, 'server/services/chat-pipeline.js'), 'utf-8'
    );
    assert.ok(pipeline.includes('cmdRun:'));
  });

  it('task-pipeline-bridge destructures cmdRun from deps', () => {
    const bridge = fs.readFileSync(
      path.join(PROJECT_ROOT, 'server/brain/tasks/task-pipeline-bridge.js'), 'utf-8'
    );
    assert.ok(bridge.includes('cmdRun'));
  });

  it('task-runner passes cmdRun to executeToolCalls', () => {
    const runner = fs.readFileSync(
      path.join(PROJECT_ROOT, 'server/brain/skills/task-runner.js'), 'utf-8'
    );
    assert.ok(runner.includes('cmdRun'));
  });

  it('cmd-executor.js file exists', () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'server/integrations/cmd-executor.js')));
  });
});

// === Section 10: CORE_REGISTRY includes new files ===

describe('health scanner — new file coverage', () => {
  const { CORE_REGISTRY } = require('../../scripts/health-scan');

  it('registry includes cmd-executor.js', () => {
    assert.ok(CORE_REGISTRY['server/integrations/cmd-executor.js']);
  });

  it('registry includes rust skill', () => {
    assert.ok(CORE_REGISTRY['skills/rust/SKILL.md']);
  });

  it('registry includes python skill', () => {
    assert.ok(CORE_REGISTRY['skills/python/SKILL.md']);
  });
});
