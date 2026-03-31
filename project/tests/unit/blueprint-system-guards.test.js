// ── Tests · Blueprint System Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, path, fs, ../../server/brain/tasks/blueprint-loader.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Blueprint System Guard Tests
// Validates: blueprint-loader module, file existence, phase
// assembly, integration with task-executor / task-runner /
// planning-orchestrator.
// ============================================================

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// === Section 1: Blueprint file existence ===

describe('Blueprint files — existence', () => {
  const blueprintsDir = path.join(__dirname, '../../server/brain/tasks/blueprints');
  const coreDir = path.join(blueprintsDir, 'core');
  const modulesDir = path.join(blueprintsDir, 'modules');

  it('core/ directory exists', () => {
    assert.ok(fs.existsSync(coreDir), 'core/ directory should exist');
  });

  it('modules/ directory exists', () => {
    assert.ok(fs.existsSync(modulesDir), 'modules/ directory should exist');
  });

  const coreFiles = [
    'task-decomposition.md',
    'tool-guide.md',
    'quality-gate.md',
    'error-recovery.md',
    'output-format.md'
  ];

  for (const file of coreFiles) {
    it(`core/${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(coreDir, file)), `core/${file} should exist`);
    });
  }

  const moduleFiles = [
    'research.md',
    'code.md',
    'writing.md',
    'analysis.md',
    'planning.md'
  ];

  for (const file of moduleFiles) {
    it(`modules/${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(modulesDir, file)), `modules/${file} should exist`);
    });
  }
});

// === Section 2: Blueprint content quality ===

describe('Blueprint files — content quality', () => {
  const blueprintsDir = path.join(__dirname, '../../server/brain/tasks/blueprints');

  it('every .md file has a title heading', () => {
    const dirs = [
      path.join(blueprintsDir, 'core'),
      path.join(blueprintsDir, 'modules')
    ];
    for (const dir of dirs) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        assert.ok(content.startsWith('# '), `${file} should start with a # heading`);
      }
    }
  });

  it('every .md file is non-trivial (> 200 chars)', () => {
    const dirs = [
      path.join(blueprintsDir, 'core'),
      path.join(blueprintsDir, 'modules')
    ];
    for (const dir of dirs) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        assert.ok(content.length > 200, `${file} should have substantial content (got ${content.length} chars)`);
      }
    }
  });

  it('core/task-decomposition.md contains [TASK_PLAN] format example', () => {
    const content = fs.readFileSync(path.join(blueprintsDir, 'core', 'task-decomposition.md'), 'utf-8');
    assert.ok(content.includes('[TASK_PLAN]'), 'Should include [TASK_PLAN] tag reference');
    assert.ok(content.includes('[/TASK_PLAN]'), 'Should include [/TASK_PLAN] closing tag');
  });

  it('core/tool-guide.md references all major tool tags', () => {
    const content = fs.readFileSync(path.join(blueprintsDir, 'core', 'tool-guide.md'), 'utf-8');
    const requiredTools = ['ws_write', 'ws_read', 'ws_list', 'web_search', 'mem_search'];
    for (const tool of requiredTools) {
      assert.ok(content.includes(tool), `Should reference ${tool}`);
    }
  });

  it('core/error-recovery.md contains [NEEDS_INPUT] reference', () => {
    const content = fs.readFileSync(path.join(blueprintsDir, 'core', 'error-recovery.md'), 'utf-8');
    assert.ok(content.includes('[NEEDS_INPUT'), 'Should reference [NEEDS_INPUT] tag');
  });

  it('modules/planning.md contains JSON format examples', () => {
    const content = fs.readFileSync(path.join(blueprintsDir, 'modules', 'planning.md'), 'utf-8');
    assert.ok(content.includes('"consensus"'), 'Should contain consensus JSON example');
    assert.ok(content.includes('"finalPlan"'), 'Should contain finalPlan JSON example');
  });

  it('modules/research.md emphasizes source citation', () => {
    const content = fs.readFileSync(path.join(blueprintsDir, 'modules', 'research.md'), 'utf-8');
    assert.ok(content.toLowerCase().includes('source'), 'Research blueprint should emphasize sources');
    assert.ok(content.toLowerCase().includes('cite') || content.toLowerCase().includes('citation'), 'Should reference citation');
  });
});

// === Section 3: Blueprint loader module ===

describe('Blueprint loader — module exports', () => {
  const loader = require('../../server/brain/tasks/blueprint-loader');

  it('exports getCoreBlueprint function', () => {
    assert.equal(typeof loader.getCoreBlueprint, 'function');
  });

  it('exports getAllCoreBlueprints function', () => {
    assert.equal(typeof loader.getAllCoreBlueprints, 'function');
  });

  it('exports getModuleBlueprint function', () => {
    assert.equal(typeof loader.getModuleBlueprint, 'function');
  });

  it('exports getBlueprintForPhase function', () => {
    assert.equal(typeof loader.getBlueprintForPhase, 'function');
  });

  it('exports listBlueprints function', () => {
    assert.equal(typeof loader.listBlueprints, 'function');
  });

  it('exports clearCache function', () => {
    assert.equal(typeof loader.clearCache, 'function');
  });

  it('exports CORE_NAMES array', () => {
    assert.ok(Array.isArray(loader.CORE_NAMES));
    assert.ok(loader.CORE_NAMES.length >= 5);
  });

  it('exports MODULE_MAP object', () => {
    assert.equal(typeof loader.MODULE_MAP, 'object');
    assert.ok('research' in loader.MODULE_MAP);
    assert.ok('code' in loader.MODULE_MAP);
    assert.ok('planning' in loader.MODULE_MAP);
  });

  it('exports BLUEPRINTS_DIR path', () => {
    assert.ok(typeof loader.BLUEPRINTS_DIR === 'string');
    assert.ok(fs.existsSync(loader.BLUEPRINTS_DIR));
  });
});

// === Section 4: Blueprint loader — reading ===

describe('Blueprint loader — reading blueprints', () => {
  const loader = require('../../server/brain/tasks/blueprint-loader');

  beforeEach(() => {
    loader.clearCache();
  });

  it('getCoreBlueprint returns task-decomposition content', () => {
    const content = loader.getCoreBlueprint('task-decomposition');
    assert.ok(content.length > 100);
    assert.ok(content.includes('TASK_PLAN'));
  });

  it('getCoreBlueprint returns tool-guide content', () => {
    const content = loader.getCoreBlueprint('tool-guide');
    assert.ok(content.length > 100);
    assert.ok(content.includes('ws_write'));
  });

  it('getCoreBlueprint returns empty string for unknown name', () => {
    const content = loader.getCoreBlueprint('nonexistent-blueprint');
    assert.equal(content, '');
  });

  it('getCoreBlueprint returns empty string for null/undefined', () => {
    assert.equal(loader.getCoreBlueprint(null), '');
    assert.equal(loader.getCoreBlueprint(undefined), '');
    assert.equal(loader.getCoreBlueprint(''), '');
  });

  it('getModuleBlueprint returns research content', () => {
    const content = loader.getModuleBlueprint('research');
    assert.ok(content.length > 100);
    assert.ok(content.toLowerCase().includes('research'));
  });

  it('getModuleBlueprint returns code content', () => {
    const content = loader.getModuleBlueprint('code');
    assert.ok(content.length > 100);
  });

  it('getModuleBlueprint returns writing content', () => {
    const content = loader.getModuleBlueprint('writing');
    assert.ok(content.length > 100);
  });

  it('getModuleBlueprint returns analysis content', () => {
    const content = loader.getModuleBlueprint('analysis');
    assert.ok(content.length > 100);
  });

  it('getModuleBlueprint returns planning content', () => {
    const content = loader.getModuleBlueprint('planning');
    assert.ok(content.length > 100);
    assert.ok(content.includes('"consensus"'));
  });

  it('getModuleBlueprint returns empty string for memory_query (no dedicated blueprint)', () => {
    assert.equal(loader.getModuleBlueprint('memory_query'), '');
  });

  it('getModuleBlueprint returns empty string for unknown task type', () => {
    assert.equal(loader.getModuleBlueprint('fake_task'), '');
  });

  it('getAllCoreBlueprints returns all 5 blueprints joined', () => {
    const all = loader.getAllCoreBlueprints();
    assert.ok(all.includes('Task Decomposition'));
    assert.ok(all.includes('Tool Usage Guide'));
    assert.ok(all.includes('Quality Gate'));
    assert.ok(all.includes('Error Recovery'));
    assert.ok(all.includes('Output Format'));
  });
});

// === Section 5: Blueprint loader — phase assembly ===

describe('Blueprint loader — getBlueprintForPhase', () => {
  const loader = require('../../server/brain/tasks/blueprint-loader');

  beforeEach(() => {
    loader.clearCache();
  });

  it('plan phase returns task-decomposition + module blueprint', () => {
    const bp = loader.getBlueprintForPhase('research', { phase: 'plan' });
    assert.ok(bp.includes('Task Decomposition'), 'Should include task decomposition');
    assert.ok(bp.includes('Research Task Blueprint'), 'Should include research module');
  });

  it('execute phase returns tool-guide + error-recovery + module blueprint', () => {
    const bp = loader.getBlueprintForPhase('code', { phase: 'execute' });
    assert.ok(bp.includes('Tool Usage Guide'), 'Should include tool guide');
    assert.ok(bp.includes('Error Recovery'), 'Should include error recovery');
    assert.ok(bp.includes('Code Task Blueprint'), 'Should include code module');
  });

  it('summarize phase returns quality-gate + output-format', () => {
    const bp = loader.getBlueprintForPhase('writing', { phase: 'summarize' });
    assert.ok(bp.includes('Quality Gate'), 'Should include quality gate');
    assert.ok(bp.includes('Output Format'), 'Should include output format');
  });

  it('default phase is execute', () => {
    const bp = loader.getBlueprintForPhase('analysis');
    assert.ok(bp.includes('Tool Usage Guide'));
    assert.ok(bp.includes('Analysis Task Blueprint'));
  });

  it('unknown task type still returns core blueprints for execute phase', () => {
    const bp = loader.getBlueprintForPhase('mystery_type', { phase: 'execute' });
    assert.ok(bp.includes('Tool Usage Guide'));
    assert.ok(bp.includes('Error Recovery'));
  });

  it('planning module blueprint included in plan phase', () => {
    const bp = loader.getBlueprintForPhase('planning', { phase: 'plan' });
    assert.ok(bp.includes('Planning Task Blueprint'));
  });

  it('sections are separated by dividers', () => {
    const bp = loader.getBlueprintForPhase('research', { phase: 'execute' });
    assert.ok(bp.includes('---'), 'Multi-section blueprints should have dividers');
  });
});

// === Section 6: Blueprint loader — caching ===

describe('Blueprint loader — caching', () => {
  const loader = require('../../server/brain/tasks/blueprint-loader');

  it('second read is identical to first read (cache hit)', () => {
    loader.clearCache();
    const first = loader.getCoreBlueprint('task-decomposition');
    const second = loader.getCoreBlueprint('task-decomposition');
    assert.equal(first, second);
  });

  it('clearCache causes re-read from disk', () => {
    const before = loader.getCoreBlueprint('tool-guide');
    loader.clearCache();
    const after = loader.getCoreBlueprint('tool-guide');
    assert.equal(before, after, 'Content should be same after clear + re-read');
  });
});

// === Section 7: Blueprint loader — listBlueprints ===

describe('Blueprint loader — listBlueprints', () => {
  const loader = require('../../server/brain/tasks/blueprint-loader');

  it('lists 5 core blueprint names', () => {
    const list = loader.listBlueprints();
    assert.equal(list.core.length, 5);
    assert.ok(list.core.includes('task-decomposition'));
    assert.ok(list.core.includes('tool-guide'));
    assert.ok(list.core.includes('quality-gate'));
    assert.ok(list.core.includes('error-recovery'));
    assert.ok(list.core.includes('output-format'));
  });

  it('lists module blueprint names (excludes memory_query)', () => {
    const list = loader.listBlueprints();
    assert.ok(list.modules.includes('research'));
    assert.ok(list.modules.includes('code'));
    assert.ok(list.modules.includes('writing'));
    assert.ok(list.modules.includes('analysis'));
    assert.ok(list.modules.includes('planning'));
    assert.ok(!list.modules.includes('memory_query'), 'memory_query has no dedicated blueprint');
  });
});

// === Section 8: Integration — task-executor uses blueprints ===

describe('Task executor — blueprint integration', () => {
  const taskExecutor = require('../../server/brain/tasks/task-executor');

  it('buildTaskSystemPrompt includes blueprint content for research tasks', () => {
    const prompt = taskExecutor.buildTaskSystemPrompt(
      { systemPromptKey: 'task_research', taskType: 'research' },
      { name: 'TestEntity' },
      []
    );
    assert.ok(prompt.includes('[Task Blueprints]'), 'Should have blueprint section');
    assert.ok(prompt.includes('Tool Usage Guide') || prompt.includes('Research Task Blueprint'),
      'Should contain blueprint content');
  });

  it('buildTaskSystemPrompt includes blueprint content for code tasks', () => {
    const prompt = taskExecutor.buildTaskSystemPrompt(
      { systemPromptKey: 'task_code', taskType: 'code' },
      { name: 'TestEntity' },
      []
    );
    assert.ok(prompt.includes('[Task Blueprints]'));
    assert.ok(prompt.includes('Code Task Blueprint'));
  });

  it('buildTaskSystemPrompt still works without moduleConfig', () => {
    const prompt = taskExecutor.buildTaskSystemPrompt(null, { name: 'TestEntity' }, []);
    assert.ok(typeof prompt === 'string');
    assert.ok(!prompt.includes('[Task Blueprints]'), 'No blueprint when no module config');
  });

  it('buildTaskSystemPrompt preserves entity identity and context', () => {
    const prompt = taskExecutor.buildTaskSystemPrompt(
      { systemPromptKey: 'task_writing', taskType: 'writing' },
      { name: 'Aria', persona: 'creative writer', mood: 'inspired' },
      [{ text: 'test context', source: 'archive' }]
    );
    assert.ok(prompt.includes('Aria'));
    assert.ok(prompt.includes('creative writer'));
    assert.ok(prompt.includes('inspired'));
    assert.ok(prompt.includes('test context'));
    assert.ok(prompt.includes('[Task Blueprints]'));
  });
});

// === Section 9: Integration — task-runner uses blueprints ===

describe('Task runner — blueprint integration', () => {
  const { runTask } = require('../../server/brain/skills/task-runner');

  it('plan generation uses planning-phase blueprint', async () => {
    let capturedMessages = null;

    // mockLLM()
    // Purpose: helper wrapper used by this module's main flow.
    // mockLLM()
    // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
    const mockLLM = async (_runtime, messages) => {
      if (!capturedMessages) capturedMessages = messages;
      return '[TASK_PLAN]\n- [ ] Step one\n[/TASK_PLAN]';
    };

    // runTask will call LLM for plan, then for each step, then summary
    // We capture the first call (plan generation)
    let callCount = 0;
    // trackingLLM()
    // WHAT THIS DOES: trackingLLM is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call trackingLLM(...) where this helper behavior is needed.
    const trackingLLM = async (runtime, messages, opts) => {
      callCount++;
      if (callCount === 1) capturedMessages = messages;
      if (callCount <= 1) return '[TASK_PLAN]\n- [ ] Do the thing\n[/TASK_PLAN]';
      return 'Done.';
    };

    await runTask({
      taskType: 'research',
      userMessage: 'Research quantum computing advances',
      callLLM: trackingLLM,
      runtime: {},
      entityName: 'TestBot'
    });

    assert.ok(capturedMessages, 'Should have captured plan generation messages');
    const systemContent = capturedMessages[0].content;
    assert.ok(
      systemContent.includes('Task Decomposition') || systemContent.includes('Planning Instructions'),
      'Plan generation prompt should include planning-phase blueprint'
    );
  });

  it('step execution uses execution-phase blueprint', async () => {
    const stepMessages = [];
    let callCount = 0;

    // trackingLLM()
    // Purpose: helper wrapper used by this module's main flow.
    // trackingLLM()
    // WHAT THIS DOES: trackingLLM is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call trackingLLM(...) where this helper behavior is needed.
    const trackingLLM = async (_runtime, messages) => {
      callCount++;
      if (callCount >= 2 && callCount <= 3) stepMessages.push(messages);
      if (callCount === 1) return '[TASK_PLAN]\n- [ ] Write the report\n[/TASK_PLAN]';
      return 'Step done.';
    };

    await runTask({
      taskType: 'research',
      userMessage: 'Research the topic',
      callLLM: trackingLLM,
      runtime: {},
      entityName: 'TestBot'
    });

    assert.ok(stepMessages.length > 0, 'Should have captured step execution messages');
    const stepSystem = stepMessages[0][0].content;
    assert.ok(
      stepSystem.includes('Execution Instructions') || stepSystem.includes('Tool Usage Guide'),
      'Step prompt should include execution-phase blueprint'
    );
  });
});

// === Section 10: Integration — planning-orchestrator uses blueprints ===

describe('Planning orchestrator — blueprint integration', () => {
  const { runPlanningSession } = require('../../server/brain/tasks/planning-orchestrator');

  it('moderation prompt includes planning blueprint reference', async () => {
    const capturedCalls = [];

    // mockLLM()
    // Purpose: helper wrapper used by this module's main flow.
    // mockLLM()
    // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
    const mockLLM = async (_runtime, messages) => {
      capturedCalls.push(messages);
      // First N calls are entity invocations, then moderation, then synthesis
      const sysContent = messages[0]?.content || '';
      if (sysContent.includes('moderating')) {
        return '{"consensus": true, "summary": "All agree", "unresolvedIssues": []}';
      }
      if (sysContent.includes('final plan')) {
        return '{"finalPlan": "Do X", "decisionRationale": "Because Y", "issuesFlagged": []}';
      }
      return 'Entity contribution here.';
    };

    await runPlanningSession({
      prompt: 'Plan a research project',
      participants: [{ entityId: 'test_entity_1', name: 'Researcher', capabilities: ['research'] }],
      callLLM: mockLLM,
      runtime: {}
    });

    // Find the moderation call (system content includes 'moderating')
    const moderationCall = capturedCalls.find(msgs =>
      msgs[0]?.content?.includes('moderating')
    );

    assert.ok(moderationCall, 'Should have a moderation LLM call');
    assert.ok(
      moderationCall[0].content.includes('Planning Reference') ||
      moderationCall[0].content.includes('Planning Task Blueprint'),
      'Moderation prompt should include planning blueprint'
    );
  });

  it('synthesis prompt includes planning blueprint reference', async () => {
    const capturedCalls = [];

    // mockLLM()
    // Purpose: helper wrapper used by this module's main flow.
    // mockLLM()
    // WHAT THIS DOES: mockLLM is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call mockLLM(...) where this helper behavior is needed.
    const mockLLM = async (_runtime, messages) => {
      capturedCalls.push(messages);
      const sysContent = messages[0]?.content || '';
      if (sysContent.includes('moderating')) {
        return '{"consensus": true, "summary": "Agreed", "unresolvedIssues": []}';
      }
      if (sysContent.includes('final plan') || sysContent.includes('synthesized plan')) {
        return '{"finalPlan": "Plan X", "decisionRationale": "Because Z", "issuesFlagged": []}';
      }
      return 'My analysis suggests...';
    };

    await runPlanningSession({
      prompt: 'Devise a strategy',
      participants: [{ entityId: 'test_entity_2', name: 'Analyst', capabilities: ['analysis'] }],
      callLLM: mockLLM,
      runtime: {}
    });

    const synthesisCall = capturedCalls.find(msgs =>
      msgs[0]?.content?.includes('final plan') || msgs[0]?.content?.includes('synthesized plan')
    );

    assert.ok(synthesisCall, 'Should have a synthesis LLM call');
    assert.ok(
      synthesisCall[0].content.includes('Synthesis Reference') ||
      synthesisCall[0].content.includes('Planning Task Blueprint'),
      'Synthesis prompt should include planning blueprint'
    );
  });
});
