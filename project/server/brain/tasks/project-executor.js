// ── Brain · Project Executor ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./task-event-bus,
// ./blueprint-loader. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Project Executor
//
// Chains multi-phase project plans into sequential task execution.
// Takes a project plan (from planning-orchestrator or user input)
// and executes each phase as a full task via task-executor, feeding
// results from completed phases into subsequent phases as context.
//
// Flow:
//   1. Decompose plan into ordered phases via LLM
//   2. For each phase:
//      a. Dispatch as a full task (step loop, tool calls, etc.)
//      b. Wait for completion
//      c. Validate result + feed into next phase context
//      d. Emit progress event
//   3. Produce final project summary
//
// Limits:
//   MAX_PHASES = 10  (project-level phases)
//   Each phase gets its own task step loop (6-8 steps per phase)
//   MAX_PHASE_RETRIES = 1 (one re-attempt per failed phase)
// ============================================================

'use strict';

const taskEventBus = require('./task-event-bus');
const blueprintLoader = require('./blueprint-loader');

const MAX_PHASES = 10;
const MAX_PHASE_RETRIES = 1;

// Regex to extract [PROJECT_PHASES] blocks from LLM output
const PHASES_REGEX = /\[PROJECT_PHASES\]([\s\S]*?)\[\/PROJECT_PHASES\]/;

/**
 * Parse a [PROJECT_PHASES] block from LLM output into structured phases.
 * Each phase has: { name, description, taskType, dependsOn }
 *
 * Expected format inside the block:
 *   - Phase 1: Setup project structure | type: code
 *   - Phase 2: Implement authentication | type: code | depends: 1
 *   - Phase 3: Research best practices | type: research
 *
 * @param {string} text - LLM raw output
 * @returns {Array|null} Array of phase objects or null
 */
// parseProjectPhases()
// WHAT THIS DOES: parseProjectPhases reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into parseProjectPhases(...) and use the transformed output.
function parseProjectPhases(text) {
  if (!text) return null;
  const match = PHASES_REGEX.exec(text);
  if (!match) return null;

  const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
  const phases = [];

  for (const line of lines) {
    // Match: - Phase N: description | type: taskType | depends: N
    const m = line.match(
      /^(?:[-*]|\d+[.)]\s*)\s*(?:Phase\s+\d+:\s*)?([^|]+?)\s*(?:\|\s*type:\s*(\w+)\s*)?(?:\|\s*depends:\s*([\d,\s]+))?\s*$/i
    );
    if (m && m[1].trim()) {
      const dependsRaw = m[3] ? m[3].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : [];
      phases.push({
        name: m[1].trim(),
        description: m[1].trim(),
        taskType: (m[2] || 'code').toLowerCase(),
        dependsOn: dependsRaw,
        status: 'pending',
        output: null,
        error: null
      });
    }
  }

  if (phases.length === 0) return null;
  return phases.slice(0, MAX_PHASES);
}

/**
 * Strip the [PROJECT_PHASES] block from text.
 */
// stripPhasesBlock()
// WHAT THIS DOES: stripPhasesBlock is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call stripPhasesBlock(...) where this helper behavior is needed.
function stripPhasesBlock(text) {
  return text.replace(PHASES_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Build context from completed phases to feed into the next phase.
 * @param {Array} completedPhases - Phases that have finished
 * @returns {string} Context block for the LLM
 */
// buildPhaseContext()
// WHAT THIS DOES: buildPhaseContext creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildPhaseContext(...) before code that depends on this setup.
function buildPhaseContext(completedPhases) {
  if (!completedPhases.length) return '';

  const parts = ['[COMPLETED PROJECT PHASES]'];
  for (const phase of completedPhases) {
    const summary = phase.output
      ? String(phase.output).slice(0, 500)
      : '(no output)';
    parts.push(`✓ Phase: ${phase.name}\n  Result: ${summary}`);
  }
  parts.push('[/COMPLETED PROJECT PHASES]');
  return parts.join('\n');
}

/**
 * Execute a complete project plan phase-by-phase.
 *
 * @param {Object} config
 * @param {string}   config.projectPlan - The plan text (from planning-orchestrator or user)
 * @param {string}   config.userMessage - The original user request
 * @param {Object}   config.entity - Entity running the project { id, name, workspacePath }
 * @param {Function} config.callLLM - async (runtime, messages, opts) => string
 * @param {Object}   config.runtime - LLM runtime config
 * @param {Object}   config.allTools - { workspaceTools, webFetch }
 * @param {Function} config.executeTaskFn - task-executor.executeTask function
 * @param {string}   [config.projectSessionId] - session ID for event bus
 * @param {Object}   [config.archiveWriter] - task-archive-writer
 * @param {string}   [config.taskArchiveId] - archive ID
 * @param {Array}    [config.contextSnippets] - initial context
 * @returns {Promise<Object>} { phases, finalSummary, completedCount, failedCount, totalLLMCalls }
 */
async function executeProject(config) {
  const {
    projectPlan,
    userMessage,
    entity,
    callLLM,
    runtime = {},
    allTools = {},
    executeTaskFn,
    projectSessionId,
    archiveWriter = null,
    taskArchiveId = null,
    contextSnippets = []
  } = config;

  if (!projectPlan || typeof projectPlan !== 'string') {
    throw new Error('executeProject: projectPlan is required');
  }
  if (!callLLM || typeof callLLM !== 'function') {
    throw new Error('executeProject: callLLM must be a function');
  }
  if (!executeTaskFn || typeof executeTaskFn !== 'function') {
    throw new Error('executeProject: executeTaskFn is required');
  }

  // Step 1: Decompose the plan into phases via LLM
  const phases = await _decomposePlan(projectPlan, userMessage, callLLM, runtime);

  if (!phases || phases.length === 0) {
    // No phases parsed — fall back to single direct task
    const result = await executeTaskFn({
      taskType: 'code',
      userMessage,
      entity,
      contextSnippets,
      callLLM,
      runtime,
      allTools,
      taskArchiveId,
      archiveWriter
    });
    return {
      phases: [{ name: 'Direct execution', status: 'complete', output: result.finalOutput }],
      finalSummary: result.finalOutput,
      completedCount: 1,
      failedCount: 0,
      totalLLMCalls: 1
    };
  }

  // Emit project started
  if (projectSessionId) {
    taskEventBus.emit(projectSessionId, {
      type: 'project_started',
      phaseCount: phases.length,
      phases: phases.map(p => ({ name: p.name, taskType: p.taskType })),
      timestamp: Date.now()
    });
  }

  // Step 2: Execute phases in order
  const completedPhases = [];
  let totalLLMCalls = 1; // count the decompose call
  let failedCount = 0;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    phase.status = 'in_progress';

    // Emit phase started
    if (projectSessionId) {
      taskEventBus.emit(projectSessionId, {
        type: 'project_phase_started',
        phaseIndex: i,
        phaseTotal: phases.length,
        phaseName: phase.name,
        taskType: phase.taskType,
        timestamp: Date.now()
      });
    }

    // Build phase-specific user message with context from completed phases
    const phaseContext = buildPhaseContext(completedPhases);
    const phaseMessage = _buildPhaseMessage(phase, userMessage, phaseContext, i, phases.length);

    // Merge completed phase outputs as context snippets
    const phaseSnippets = [
      ...contextSnippets,
      ...completedPhases.map(p => ({
        source: `completed_phase:${p.name}`,
        text: String(p.output || '').slice(0, 300)
      }))
    ];

    let phaseResult = null;
    let retries = 0;

    while (retries <= MAX_PHASE_RETRIES) {
      try {
        phaseResult = await executeTaskFn({
          taskType: phase.taskType,
          userMessage: phaseMessage,
          entity,
          contextSnippets: phaseSnippets,
          callLLM,
          runtime,
          allTools,
          taskArchiveId,
          archiveWriter
        });
        break; // success
      } catch (err) {
        retries++;
        if (retries > MAX_PHASE_RETRIES) {
          phase.status = 'failed';
          phase.error = err.message;
          failedCount++;

          if (projectSessionId) {
            taskEventBus.emit(projectSessionId, {
              type: 'project_phase_failed',
              phaseIndex: i,
              phaseName: phase.name,
              error: err.message,
              timestamp: Date.now()
            });
          }
          break;
        }

        // Emit retry event
        if (projectSessionId) {
          taskEventBus.emit(projectSessionId, {
            type: 'project_phase_retry',
            phaseIndex: i,
            phaseName: phase.name,
            attempt: retries + 1,
            error: err.message,
            timestamp: Date.now()
          });
        }
      }
    }

    if (phaseResult) {
      phase.status = 'complete';
      phase.output = phaseResult.finalOutput;
      totalLLMCalls += phaseResult.steps ? phaseResult.steps.length : 1;
      completedPhases.push(phase);

      // Archive the phase result
      if (archiveWriter && taskArchiveId) {
        try {
          archiveWriter.appendStep(taskArchiveId, {
            stepIndex: i,
            description: `Project Phase ${i + 1}: ${phase.name}`,
            output: phaseResult.finalOutput,
            phaseType: phase.taskType,
            timestamp: Date.now()
          });
        } catch (_) { /* ignore archive errors */ }
      }

      // Emit phase complete
      if (projectSessionId) {
        taskEventBus.emit(projectSessionId, {
          type: 'project_phase_complete',
          phaseIndex: i,
          phaseTotal: phases.length,
          phaseName: phase.name,
          completedCount: completedPhases.length,
          summary: String(phaseResult.finalOutput || '').slice(0, 200),
          timestamp: Date.now()
        });
      }
    }
  }

  // Step 3: Generate final project summary
  const finalSummary = await _generateProjectSummary(
    phases, userMessage, callLLM, runtime, entity
  );
  totalLLMCalls++;

  // Finalize archive
  if (archiveWriter && taskArchiveId) {
    try {
      archiveWriter.finalize(taskArchiveId, finalSummary);
    } catch (_) { /* ignore */ }
  }

  // Emit project complete
  if (projectSessionId) {
    taskEventBus.emit(projectSessionId, {
      type: 'project_complete',
      completedCount: completedPhases.length,
      failedCount,
      totalPhases: phases.length,
      summary: finalSummary.slice(0, 300),
      timestamp: Date.now()
    });
  }

  return {
    phases,
    finalSummary,
    completedCount: completedPhases.length,
    failedCount,
    totalLLMCalls
  };
}

/**
 * Decompose a project plan into structured phases via LLM.
 * @private
 */
async function _decomposePlan(projectPlan, userMessage, callLLM, runtime) {
  const blueprint = blueprintLoader.getModuleBlueprint('planning');
  const blueprintRef = blueprint ? `\n\n${blueprint}` : '';

  const messages = [
    {
      role: 'system',
      content: `You are a project planner. Break the following project plan into ordered execution phases.

Output your phases inside a [PROJECT_PHASES]...[/PROJECT_PHASES] block.

FORMAT — one phase per line:
- Phase 1: Description of what to do | type: code
- Phase 2: Description of next step | type: research | depends: 1
- Phase 3: Description of third step | type: code | depends: 1,2

Allowed types: code, research, writing, analysis
Only list depends if a phase truly requires output from a prior phase.

Rules:
- Maximum 10 phases
- Each phase should be a single coherent task — not too broad, not too narrow
- Order phases so dependencies come first
- The first phase should set up foundations (project structure, config, etc.)
- The last phase should be integration, testing, or final polish${blueprintRef}`
    },
    {
      role: 'user',
      content: `Original request: "${userMessage}"\n\nProject plan to decompose:\n${projectPlan}`
    }
  ];

  try {
    const raw = await callLLM(runtime, messages, { temperature: 0.5 });
    return parseProjectPhases(raw);
  } catch {
    return null;
  }
}

/**
 * Build the phase-specific task message that feeds into executeTask.
 * @private
 */
// _buildPhaseMessage()
// WHAT THIS DOES: _buildPhaseMessage creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call _buildPhaseMessage(...) before code that depends on this setup.
function _buildPhaseMessage(phase, originalRequest, phaseContext, phaseIndex, totalPhases) {
  let msg = `PROJECT PHASE ${phaseIndex + 1} of ${totalPhases}: ${phase.name}\n\n`;
  msg += `ORIGINAL PROJECT REQUEST: "${originalRequest}"\n\n`;
  msg += `YOUR TASK FOR THIS PHASE: ${phase.description}\n\n`;

  if (phaseContext) {
    msg += `CONTEXT FROM PRIOR PHASES:\n${phaseContext}\n\n`;
  }

  msg += `INSTRUCTIONS:\n`;
  msg += `- Complete this phase fully — write all files, create all code, do all research\n`;
  msg += `- Use [TOOL:ws_write] to save your work to actual files\n`;
  msg += `- Build on work from prior phases — read existing files before modifying them\n`;
  msg += `- When done, summarize what you created and where the output files are`;

  return msg;
}

/**
 * Generate a final summary across all project phases.
 * @private
 */
async function _generateProjectSummary(phases, userMessage, callLLM, runtime, entity) {
  const entityName = entity ? (entity.name || 'Entity') : 'Entity';
  const phaseSummaries = phases.map((p, i) => {
    const status = p.status === 'complete' ? '✓' : '✗';
    const output = p.output ? String(p.output).slice(0, 300) : (p.error || 'no output');
    return `${status} Phase ${i + 1}: ${p.name} [${p.taskType}]\n  ${output}`;
  }).join('\n\n');

  const messages = [
    {
      role: 'system',
      content: `You are ${entityName}. You just completed a multi-phase project for the user. Give a clear summary of what was accomplished, what files were created, and any issues. Stay in character. Be concise but thorough.`
    },
    {
      role: 'user',
      content: `Original request: "${userMessage}"\n\nPhase results:\n${phaseSummaries}\n\nSummarize the completed project.`
    }
  ];

  try {
    const summary = await callLLM(runtime, messages, { temperature: 0.5 });
    return summary;
  } catch {
    // Fallback: stitch phase outputs together
    return phases
      .filter(p => p.status === 'complete')
      .map(p => `**${p.name}**: ${p.output || '(done)'}`)
      .join('\n\n');
  }
}

module.exports = {
  executeProject,
  parseProjectPhases,
  stripPhasesBlock,
  buildPhaseContext,
  MAX_PHASES,
  MAX_PHASE_RETRIES
};
