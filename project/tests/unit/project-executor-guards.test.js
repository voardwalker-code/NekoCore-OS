// ── Tests · Project Executor Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, path, fs, ../../server/brain/tasks/project-executor.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Project Executor Guard Tests
// Validates: phase parsing, context building, executor config
// validation, PROJECT task type registration, pipeline bridge
// routing, blueprint existence, module registry, limits.
// ============================================================

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const {
  parseProjectPhases,
  stripPhasesBlock,
  buildPhaseContext,
  executeProject,
  MAX_PHASES,
  MAX_PHASE_RETRIES
} = require('../../server/brain/tasks/project-executor');

const { TASK_TYPES, DEFAULT_MODULE_CONFIGS } = require('../../server/brain/tasks/task-types');
const blueprintLoader = require('../../server/brain/tasks/blueprint-loader');

// === Section 1: Constants ===

describe('Project Executor — constants', () => {
  it('MAX_PHASES is 10', () => {
    assert.strictEqual(MAX_PHASES, 10);
  });

  it('MAX_PHASE_RETRIES is 1', () => {
    assert.strictEqual(MAX_PHASE_RETRIES, 1);
  });
});

// === Section 2: parseProjectPhases ===

describe('Project Executor — parseProjectPhases', () => {
  it('returns null for empty input', () => {
    assert.strictEqual(parseProjectPhases(''), null);
    assert.strictEqual(parseProjectPhases(null), null);
    assert.strictEqual(parseProjectPhases(undefined), null);
  });

  it('returns null when no [PROJECT_PHASES] block present', () => {
    assert.strictEqual(parseProjectPhases('Just some random text'), null);
    assert.strictEqual(parseProjectPhases('Phase 1: stuff'), null);
  });

  it('parses a simple phases block', () => {
    const text = `Here is the plan:
[PROJECT_PHASES]
- Phase 1: Setup project structure | type: code
- Phase 2: Write unit tests | type: code | depends: 1
[/PROJECT_PHASES]
Done.`;

    const phases = parseProjectPhases(text);
    assert.ok(Array.isArray(phases));
    assert.strictEqual(phases.length, 2);
    assert.strictEqual(phases[0].name, 'Setup project structure');
    assert.strictEqual(phases[0].taskType, 'code');
    assert.deepStrictEqual(phases[0].dependsOn, []);
    assert.strictEqual(phases[1].name, 'Write unit tests');
    assert.deepStrictEqual(phases[1].dependsOn, [1]);
  });

  it('defaults taskType to code when not specified', () => {
    const text = `[PROJECT_PHASES]
- Phase 1: Do something
[/PROJECT_PHASES]`;

    const phases = parseProjectPhases(text);
    assert.strictEqual(phases[0].taskType, 'code');
  });

  it('handles multiple depends', () => {
    const text = `[PROJECT_PHASES]
- Phase 1: First | type: code
- Phase 2: Second | type: code | depends: 1
- Phase 3: Third | type: analysis | depends: 1, 2
[/PROJECT_PHASES]`;

    const phases = parseProjectPhases(text);
    assert.strictEqual(phases.length, 3);
    assert.deepStrictEqual(phases[2].dependsOn, [1, 2]);
    assert.strictEqual(phases[2].taskType, 'analysis');
  });

  it('clamps to MAX_PHASES', () => {
    const lines = [];
    for (let i = 1; i <= 15; i++) {
      lines.push(`- Phase ${i}: Task number ${i} | type: code`);
    }
    const text = `[PROJECT_PHASES]\n${lines.join('\n')}\n[/PROJECT_PHASES]`;

    const phases = parseProjectPhases(text);
    assert.ok(phases.length <= MAX_PHASES, `Should clamp to ${MAX_PHASES} but got ${phases.length}`);
  });

  it('sets initial status to pending', () => {
    const text = `[PROJECT_PHASES]
- Phase 1: Something | type: research
[/PROJECT_PHASES]`;

    const phases = parseProjectPhases(text);
    assert.strictEqual(phases[0].status, 'pending');
    assert.strictEqual(phases[0].output, null);
    assert.strictEqual(phases[0].error, null);
  });

  it('returns null for empty phases block', () => {
    const text = `[PROJECT_PHASES]
[/PROJECT_PHASES]`;
    assert.strictEqual(parseProjectPhases(text), null);
  });

  it('handles research and writing types', () => {
    const text = `[PROJECT_PHASES]
- Phase 1: Find information | type: research
- Phase 2: Draft document | type: writing | depends: 1
[/PROJECT_PHASES]`;

    const phases = parseProjectPhases(text);
    assert.strictEqual(phases[0].taskType, 'research');
    assert.strictEqual(phases[1].taskType, 'writing');
  });
});

// === Section 3: stripPhasesBlock ===

describe('Project Executor — stripPhasesBlock', () => {
  it('removes [PROJECT_PHASES] block from text', () => {
    const text = `Before text\n[PROJECT_PHASES]\n- Phase 1: stuff\n[/PROJECT_PHASES]\nAfter text`;
    const stripped = stripPhasesBlock(text);
    assert.ok(!stripped.includes('[PROJECT_PHASES]'));
    assert.ok(!stripped.includes('[/PROJECT_PHASES]'));
    assert.ok(stripped.includes('Before text'));
    assert.ok(stripped.includes('After text'));
  });

  it('returns text unchanged if no block present', () => {
    const text = 'No phases here';
    assert.strictEqual(stripPhasesBlock(text), text);
  });

  it('collapses excess newlines', () => {
    const text = `Before\n\n\n[PROJECT_PHASES]\n- Phase 1: x\n[/PROJECT_PHASES]\n\n\n\nAfter`;
    const stripped = stripPhasesBlock(text);
    assert.ok(!stripped.includes('\n\n\n'), 'Should collapse triple+ newlines');
  });
});

// === Section 4: buildPhaseContext ===

describe('Project Executor — buildPhaseContext', () => {
  it('returns empty string for no completed phases', () => {
    assert.strictEqual(buildPhaseContext([]), '');
  });

  it('builds context from completed phases', () => {
    const completed = [
      { name: 'Setup', output: 'Created project directory' },
      { name: 'Auth', output: 'Added login system' }
    ];
    const context = buildPhaseContext(completed);
    assert.ok(context.includes('[COMPLETED PROJECT PHASES]'));
    assert.ok(context.includes('[/COMPLETED PROJECT PHASES]'));
    assert.ok(context.includes('Setup'));
    assert.ok(context.includes('Created project directory'));
    assert.ok(context.includes('Auth'));
    assert.ok(context.includes('Added login system'));
  });

  it('handles phase with null output', () => {
    const completed = [{ name: 'Phase X', output: null }];
    const context = buildPhaseContext(completed);
    assert.ok(context.includes('(no output)'));
  });

  it('truncates long outputs', () => {
    const longOutput = 'x'.repeat(1000);
    const completed = [{ name: 'Big phase', output: longOutput }];
    const context = buildPhaseContext(completed);
    assert.ok(context.length < longOutput.length, 'Context should truncate long outputs');
  });
});

// === Section 5: executeProject config validation ===

describe('Project Executor — executeProject validation', () => {
  it('throws if projectPlan is missing', async () => {
    await assert.rejects(
      () => executeProject({ callLLM: async () => '', executeTaskFn: async () => ({}) }),
      { message: /projectPlan is required/ }
    );
  });

  it('throws if callLLM is missing', async () => {
    await assert.rejects(
      () => executeProject({ projectPlan: 'plan', executeTaskFn: async () => ({}) }),
      { message: /callLLM must be a function/ }
    );
  });

  it('throws if executeTaskFn is missing', async () => {
    await assert.rejects(
      () => executeProject({ projectPlan: 'plan', callLLM: async () => '' }),
      { message: /executeTaskFn is required/ }
    );
  });
});

// === Section 6: executeProject fallback path ===

describe('Project Executor — fallback to single task', () => {
  it('delegates to executeTaskFn when no phases parsed', async () => {
    let taskCalled = false;
    const result = await executeProject({
      projectPlan: 'do something simple',
      userMessage: 'do something simple',
      entity: { id: 'e1', name: 'Test' },
      callLLM: async () => 'No phases here, just do it',
      runtime: {},
      allTools: {},
      executeTaskFn: async (config) => {
        taskCalled = true;
        return { finalOutput: 'done', steps: [] };
      }
    });

    assert.ok(taskCalled, 'Should have called executeTaskFn directly');
    assert.strictEqual(result.completedCount, 1);
    assert.strictEqual(result.failedCount, 0);
    assert.strictEqual(result.phases.length, 1);
    assert.strictEqual(result.phases[0].name, 'Direct execution');
  });
});

// === Section 7: executeProject multi-phase execution ===

describe('Project Executor — multi-phase execution', () => {
  it('executes phases in order and produces summary', async () => {
    const llmResponses = [
      // First call: decomposition
      `[PROJECT_PHASES]
- Phase 1: Create files | type: code
- Phase 2: Write tests | type: code | depends: 1
[/PROJECT_PHASES]`,
      // Last call: summary
      'Project complete — created files and tests.'
    ];
    let llmIdx = 0;

    const phaseResults = [
      { finalOutput: 'Created index.js', steps: [1] },
      { finalOutput: 'Wrote test.js', steps: [1] }
    ];
    let taskIdx = 0;

    const result = await executeProject({
      projectPlan: 'Build a module with tests',
      userMessage: 'Build a module with tests',
      entity: { id: 'e1', name: 'Neko' },
      callLLM: async () => {
        const r = llmResponses[llmIdx] || llmResponses[llmResponses.length - 1];
        llmIdx++;
        return r;
      },
      runtime: {},
      allTools: {},
      executeTaskFn: async () => {
        const r = phaseResults[taskIdx] || phaseResults[phaseResults.length - 1];
        taskIdx++;
        return r;
      }
    });

    assert.strictEqual(result.phases.length, 2);
    assert.strictEqual(result.completedCount, 2);
    assert.strictEqual(result.failedCount, 0);
    assert.ok(result.finalSummary.length > 0, 'Should have a final summary');
    assert.strictEqual(result.phases[0].status, 'complete');
    assert.strictEqual(result.phases[1].status, 'complete');
  });

  it('marks phase as failed after retry exhaustion', async () => {
    const llmResponses = [
      `[PROJECT_PHASES]
- Phase 1: Broken phase | type: code
[/PROJECT_PHASES]`,
      'Summary of partial project.'
    ];
    let llmIdx = 0;

    const result = await executeProject({
      projectPlan: 'Do something that fails',
      userMessage: 'Do something that fails',
      entity: { id: 'e1', name: 'Neko' },
      callLLM: async () => {
        const r = llmResponses[llmIdx] || llmResponses[llmResponses.length - 1];
        llmIdx++;
        return r;
      },
      runtime: {},
      allTools: {},
      executeTaskFn: async () => { throw new Error('Phase exploded'); }
    });

    assert.strictEqual(result.phases.length, 1);
    assert.strictEqual(result.phases[0].status, 'failed');
    assert.strictEqual(result.failedCount, 1);
    assert.strictEqual(result.completedCount, 0);
    assert.ok(result.phases[0].error.includes('Phase exploded'));
  });

  it('feeds completed phase context into subsequent phases', async () => {
    const llmResponses = [
      `[PROJECT_PHASES]
- Phase 1: First step | type: code
- Phase 2: Second step | type: code | depends: 1
[/PROJECT_PHASES]`,
      'All done.'
    ];
    let llmIdx = 0;

    const taskMessages = [];
    const result = await executeProject({
      projectPlan: 'Two phase project',
      userMessage: 'Two phase project',
      entity: { id: 'e1', name: 'Neko' },
      callLLM: async () => {
        const r = llmResponses[llmIdx] || llmResponses[llmResponses.length - 1];
        llmIdx++;
        return r;
      },
      runtime: {},
      allTools: {},
      executeTaskFn: async (config) => {
        taskMessages.push(config.userMessage);
        return { finalOutput: `Output from phase`, steps: [1] };
      }
    });

    // Second phase should contain context from first phase
    assert.ok(taskMessages.length >= 2, 'Should have at least 2 task calls');
    assert.ok(
      taskMessages[1].includes('COMPLETED PROJECT PHASES'),
      'Second phase message should include completed phase context'
    );
  });
});

// === Section 8: EVENT emission ===

describe('Project Executor — event emission', () => {
  const taskEventBus = require('../../server/brain/tasks/task-event-bus');

  it('emits project_started and project_complete events', async () => {
    const sessionId = 'test-proj-events-' + Date.now();
    const events = [];
    taskEventBus.subscribe(sessionId, (evt) => events.push(evt));

    const llmResponses = [
      `[PROJECT_PHASES]
- Phase 1: Only phase | type: code
[/PROJECT_PHASES]`,
      'Done.'
    ];
    let llmIdx = 0;

    await executeProject({
      projectPlan: 'Single phase project',
      userMessage: 'Single phase project',
      entity: { id: 'e1', name: 'Neko' },
      callLLM: async () => {
        const r = llmResponses[llmIdx] || llmResponses[llmResponses.length - 1];
        llmIdx++;
        return r;
      },
      runtime: {},
      allTools: {},
      executeTaskFn: async () => ({ finalOutput: 'done', steps: [1] }),
      projectSessionId: sessionId
    });

    const types = events.map(e => e.type);
    assert.ok(types.includes('project_started'), 'Should emit project_started');
    assert.ok(types.includes('project_phase_started'), 'Should emit project_phase_started');
    assert.ok(types.includes('project_phase_complete'), 'Should emit project_phase_complete');
    assert.ok(types.includes('project_complete'), 'Should emit project_complete');

    taskEventBus.cleanup(sessionId);
  });
});

// === Section 9: TASK_TYPES registration ===

describe('Project Executor — TASK_TYPES registration', () => {
  it('PROJECT exists in TASK_TYPES', () => {
    assert.strictEqual(TASK_TYPES.PROJECT, 'project');
  });

  it('PROJECT module config exists', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.PROJECT];
    assert.ok(config, 'project module config should exist');
    assert.strictEqual(config.id, 'project-module');
    assert.strictEqual(config.taskType, 'project');
  });

  it('PROJECT module has correct tool list', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.PROJECT];
    const expected = ['ws_read', 'ws_write', 'ws_list', 'ws_append', 'ws_delete', 'ws_move', 'ws_mkdir', 'web_search', 'web_fetch', 'cmd_run'];
    assert.deepStrictEqual(config.tools, expected);
  });

  it('PROJECT module has elevated limits', () => {
    const config = DEFAULT_MODULE_CONFIGS[TASK_TYPES.PROJECT];
    assert.strictEqual(config.maxSteps, 10);
    assert.strictEqual(config.maxLLMCalls, 40);
  });
});

// === Section 10: Blueprint existence ===

describe('Project Executor — blueprint', () => {
  it('project.md blueprint exists on disk', () => {
    const blueprintPath = path.join(__dirname, '../../server/brain/tasks/blueprints/modules/project.md');
    assert.ok(fs.existsSync(blueprintPath), 'blueprints/modules/project.md should exist');
  });

  it('project blueprint loads via blueprint-loader', () => {
    const bp = blueprintLoader.getModuleBlueprint('project');
    assert.ok(bp && bp.length > 100, 'project blueprint should load via getModuleBlueprint');
  });

  it('project blueprint mentions phases', () => {
    const bp = blueprintLoader.getModuleBlueprint('project');
    assert.ok(bp.includes('phase'), 'project blueprint should reference phases');
  });

  it('blueprint MODULE_MAP includes project entry', () => {
    // Verify indirectly — if getModuleBlueprint works, the mapping exists
    const bp = blueprintLoader.getModuleBlueprint('project');
    assert.ok(typeof bp === 'string' && bp.length > 0);
  });
});

// === Section 11: Pipeline bridge routing ===

describe('Project Executor — pipeline bridge integration', () => {
  it('task-pipeline-bridge.js requires project-executor', () => {
    const bridgePath = path.join(__dirname, '../../server/brain/tasks/task-pipeline-bridge.js');
    const src = fs.readFileSync(bridgePath, 'utf-8');
    assert.ok(
      src.includes("require('./project-executor')"),
      'Pipeline bridge should import project-executor'
    );
  });

  it('task-pipeline-bridge.js routes project taskType', () => {
    const bridgePath = path.join(__dirname, '../../server/brain/tasks/task-pipeline-bridge.js');
    const src = fs.readFileSync(bridgePath, 'utf-8');
    assert.ok(
      src.includes("classification.taskType === 'project'"),
      'Pipeline bridge should check for project taskType'
    );
  });

  it('task-pipeline-bridge.js has _handleProjectExecution function', () => {
    const bridgePath = path.join(__dirname, '../../server/brain/tasks/task-pipeline-bridge.js');
    const src = fs.readFileSync(bridgePath, 'utf-8');
    assert.ok(
      src.includes('_handleProjectExecution'),
      'Pipeline bridge should define _handleProjectExecution'
    );
  });

  it('_handleProjectExecution returns project mode', () => {
    const bridgePath = path.join(__dirname, '../../server/brain/tasks/task-pipeline-bridge.js');
    const src = fs.readFileSync(bridgePath, 'utf-8');
    assert.ok(
      src.includes("mode: 'project'"),
      'Project handler should return mode: project'
    );
  });
});

// === Section 12: project-executor.js file structure ===

describe('Project Executor — module exports', () => {
  it('exports executeProject as a function', () => {
    assert.strictEqual(typeof executeProject, 'function');
  });

  it('exports parseProjectPhases as a function', () => {
    assert.strictEqual(typeof parseProjectPhases, 'function');
  });

  it('exports stripPhasesBlock as a function', () => {
    assert.strictEqual(typeof stripPhasesBlock, 'function');
  });

  it('exports buildPhaseContext as a function', () => {
    assert.strictEqual(typeof buildPhaseContext, 'function');
  });

  it('exports MAX_PHASES as a number', () => {
    assert.strictEqual(typeof MAX_PHASES, 'number');
  });

  it('exports MAX_PHASE_RETRIES as a number', () => {
    assert.strictEqual(typeof MAX_PHASE_RETRIES, 'number');
  });
});
