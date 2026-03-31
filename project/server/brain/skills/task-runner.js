// ── Services · Task Runner Engine ───────────────────────────────────────────
//
// HOW TASK RUNNING WORKS:
// This module parses [TASK_PLAN] blocks, executes steps one-by-one with tool
// support, tracks progress in `_taskplan.md`, and returns a final summary.
//
// WHAT USES THIS:
//   chat/task execution flows that run multi-step plans
//
// EXPORTS:
//   parsePlan(), stripPlanBlock(), executeTaskPlan(), runTask(), detectNeedsInput()
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// REM System — Task Runner
//
// When the entity receives a multi-step task, it creates a plan
// using [TASK_PLAN] blocks. This module:
//   1. Writes the plan as _taskplan.md in the entity's workspace
//   2. Loops through each step, prompting the entity to CHECK
//      the workspace todo list, execute the step, then UPDATE it
//   3. Deletes _taskplan.md when all steps are complete
//
// Max 6 steps per plan. Max 20 LLM calls total per task.
// Designed to be callable from chat AND sleep cycles.
// ============================================================

const fs = require('fs');
const path = require('path');
const blueprintLoader = require('../tasks/blueprint-loader');

const PLAN_REGEX = /\[TASK_PLAN\]([\s\S]*?)\[\/TASK_PLAN\]/;
const NEEDS_INPUT_REGEX = /\[NEEDS_INPUT:\s*([^\]]+)\]/;
const PLAN_FILENAME = '_taskplan.md';
const MAX_STEPS = 6;
const MAX_LLM_CALLS = 20;

/**
 * Detect a [NEEDS_INPUT: question] tag in worker output.
 * Returns the question string or null.
 */
/** Extract a [NEEDS_INPUT: ...] prompt from model output, if present. */
function detectNeedsInput(text) {
  if (!text) return null;
  const match = NEEDS_INPUT_REGEX.exec(text);
  return match ? match[1].trim() : null;
}

/**
 * Parse a [TASK_PLAN] block from entity output.
 * Returns { steps: [{description, done}], raw } or null.
 */
/** Parse a [TASK_PLAN] block into normalized step objects. */
function parsePlan(text) {
  if (!text) return null;
  const match = PLAN_REGEX.exec(text);
  if (!match) return null;

  const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
  const steps = [];
  for (const line of lines) {
    // Match:  - [ ] desc  |  1. [ ] desc  |  - desc  |  1. desc
    const m = line.match(/^(?:[-*]|\d+[.)]\s*)(?:\[[ x]\]\s*)?(.+)$/);
    if (m && m[1].trim()) {
      steps.push({ description: m[1].trim(), done: false, output: '' });
    }
  }

  if (steps.length === 0) return null;
  return { steps: steps.slice(0, MAX_STEPS), raw: match[0] };
}

/**
 * Strip [TASK_PLAN] block from text, leaving the rest.
 */
/** Remove the [TASK_PLAN] section from a response body. */
function stripPlanBlock(text) {
  return text.replace(PLAN_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Generate the markdown content for _taskplan.md
 */
/** Build markdown content for the workspace `_taskplan.md` file. */
function buildPlanMarkdown(plan, userMessage, stepOutputs) {
  let md = `# Active Task Plan\n\n`;
  md += `**Original Request:** ${userMessage}\n\n`;
  md += `## Steps\n\n`;

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const check = step.done ? 'x' : ' ';
    md += `- [${check}] **Step ${i + 1}:** ${step.description}\n`;
    // If there's output for this step, include it
    const output = stepOutputs.find(s => s.step === i + 1);
    if (output && output.output) {
      const brief = output.output.replace(/\n/g, ' ').slice(0, 200);
      md += `  - _Result: ${brief}_\n`;
    }
  }

  const done = plan.steps.filter(s => s.done).length;
  md += `\n---\n_Progress: ${done}/${plan.steps.length} complete_\n`;
  return md;
}

/**
 * Write or update _taskplan.md in the workspace.
 */
/** Write the current task plan snapshot to `_taskplan.md`. */
function writePlanFile(workspacePath, plan, userMessage, stepOutputs) {
  if (!workspacePath) return;
  const filePath = path.join(workspacePath, PLAN_FILENAME);
  const md = buildPlanMarkdown(plan, userMessage, stepOutputs);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, md, 'utf-8');
}

/**
 * Delete _taskplan.md from the workspace.
 */
/** Remove `_taskplan.md` after task execution completes. */
function deletePlanFile(workspacePath) {
  if (!workspacePath) return;
  const filePath = path.join(workspacePath, PLAN_FILENAME);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
}

/**
 * Read _taskplan.md from the workspace (for the step prompt).
 */
/** Read current `_taskplan.md` content for step prompts. */
function readPlanFile(workspacePath) {
  if (!workspacePath) return null;
  const filePath = path.join(workspacePath, PLAN_FILENAME);
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {}
  return null;
}

/**
 * Build the prompt for a single step execution.
 */
/** Build one execution prompt for the current plan step. */
function buildStepPrompt(plan, stepIndex, stepOutputs, userMessage, planFileContent) {
  const step = plan.steps[stepIndex];
  const total = plan.steps.length;

  let msg = `ORIGINAL REQUEST: "${userMessage}"\n\n`;

  // Show the entity its own workspace todo list
  if (planFileContent) {
    msg += `YOUR WORKSPACE TODO LIST (_taskplan.md):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${planFileContent}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  msg += `► YOU ARE NOW ON: Step ${stepIndex + 1} of ${total} — ${step.description}\n\n`;

  if (stepOutputs.length > 0) {
    msg += 'COMPLETED STEPS:\n';
    for (const prev of stepOutputs) {
      const brief = prev.output ? prev.output.replace(/\n/g, ' ').slice(0, 150) : '(done)';
      msg += `  ✓ Step ${prev.step}. ${prev.description} — ${brief}\n`;
    }
    msg += '\n';
  }

  const remaining = plan.steps.slice(stepIndex + 1);
  if (remaining.length > 0) {
    msg += 'REMAINING: ' + remaining.map((s, i) => `${stepIndex + 2 + i}. ${s.description}`).join(' → ') + '\n\n';
  }

  msg += `INSTRUCTIONS: Execute step ${stepIndex + 1} now. `;
  msg += `Use [TOOL:ws_write {"path":"filename"}]content[/TOOL] to write content to your workspace — DO NOT dump large text into the chat. `;
  msg += `When this step is complete, briefly describe what you accomplished.`;
  return msg;
}

/**
 * Execute a full task plan step by step.
 *
 * @param {Object} plan - Parsed plan from parsePlan()
 * @param {string} userMessage - The original user message/task
 * @param {Object} options
 * @param {string} options.entityName
 * @param {string} options.systemPrompt - Entity identity/system prompt text
 * @param {Function} options.callLLM - async (runtime, messages, opts) => string
 * @param {Object} options.runtime - LLM runtime config
 * @param {string} options.workspacePath
 * @param {Object} options.webFetch
 * @param {Object} options.workspaceTools
 * @returns {{ finalResponse, allToolResults, stepOutputs, plan, llmCalls }}
 */
async function executeTaskPlan(plan, userMessage, options) {
  const {
    taskType = 'task',
    entityName = 'Entity',
    systemPrompt = '',
    callLLM,
    runtime,
    workspacePath = '',
    webFetch,
    workspaceTools,
    cmdRun,
    memorySearch,
    memoryCreate,
    skillCreate,
    skillList,
    skillEdit,
    profileUpdate
  } = options;

  const allToolResults = [];
  const stepOutputs = [];
  let llmCalls = 0;

  console.log(`  📋 Task plan started: ${plan.steps.length} steps`);

  // Step 0: Write the initial _taskplan.md to workspace
  writePlanFile(workspacePath, plan, userMessage, stepOutputs);
  console.log(`  📋 Wrote _taskplan.md to workspace`);

  for (let i = 0; i < plan.steps.length && llmCalls < MAX_LLM_CALLS; i++) {
    const step = plan.steps[i];
    console.log(`  📋 Step ${i + 1}/${plan.steps.length}: ${step.description}`);

    // Read the current plan file so the entity sees its own checklist
    const planFileContent = readPlanFile(workspacePath);

    const stepPromptText = buildStepPrompt(plan, i, stepOutputs, userMessage, planFileContent);

    // Inject execution-phase blueprints (tool guide + error recovery + module-specific)
    const stepBlueprint = blueprintLoader.getBlueprintForPhase(taskType, { phase: 'execute' });
    const blueprintSection = stepBlueprint ? `\n\n[Execution Instructions]\n${stepBlueprint}` : '';

    const systemMsg = `You are ${entityName}. You are executing step ${i + 1} of a ${plan.steps.length}-step task plan.
Stay in character. Your workspace directory is where you write all output files.

CRITICAL RULES:
- Use [TOOL:ws_write {"path":"filename"}] followed by content and [/TOOL] to write content TO FILES in your workspace
- Do NOT output the full content of documents/stories/code into the chat — write them to files instead
- If a step involves creating content (writing, research notes, outlines, etc.), ALWAYS write it to a file
- You may use multiple tools in one response
- Be thorough but keep CHAT responses concise — the real output goes to workspace files${blueprintSection}`;

    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user', content: stepPromptText }
    ];

    // Call LLM for this step
    let stepResponse;
    try {
      stepResponse = await callLLM(runtime, messages, { temperature: 0.7 });
      llmCalls++;
    } catch (err) {
      console.warn(`  ⚠ Task step ${i + 1} failed:`, err.message);
      stepOutputs.push({ step: i + 1, description: step.description, output: '(failed: ' + err.message + ')' });
      step.done = true;
      // Update plan file even on failure
      writePlanFile(workspacePath, plan, userMessage, stepOutputs);
      continue;
    }

    // Execute any tool calls in the step response
    let finalStepOutput = stepResponse;
    if (workspaceTools) {
      try {
        const toolExec = await workspaceTools.executeToolCalls(stepResponse, {
          workspacePath,
          webFetch,
          cmdRun,
          memorySearch,
          memoryCreate,
          skillCreate,
          skillList,
          skillEdit,
          profileUpdate
        });

        if (toolExec.hadTools && toolExec.toolResults.length > 0) {
          console.log(`    🔧 Step ${i + 1} used ${toolExec.toolResults.length} tool(s)`);
          allToolResults.push(...toolExec.toolResults);
          const toolBlock = workspaceTools.formatToolResults(toolExec.toolResults);

          // Follow-up: incorporate tool results into step output
          const followUp = [
            {
              role: 'system',
              content: `You are ${entityName}. You just used tools during step ${i + 1}. Summarize what this step accomplished. Keep it brief — the actual content is in the workspace files. Do NOT include [TOOL:...] tags. Do NOT create a new [TASK_PLAN].`
            },
            {
              role: 'user',
              content: `Step: ${step.description}\n\nYour action:\n${toolExec.cleanedResponse}\n\n${toolBlock}\n\nBriefly describe what this step accomplished.`
            }
          ];

          try {
            if (llmCalls < MAX_LLM_CALLS) {
              finalStepOutput = await callLLM(runtime, followUp, { temperature: 0.5 });
              llmCalls++;
            } else {
              finalStepOutput = toolExec.cleanedResponse;
            }
          } catch (_) {
            finalStepOutput = toolExec.cleanedResponse;
          }
        }
      } catch (toolErr) {
        console.warn(`    ⚠ Tool exec in step ${i + 1}:`, toolErr.message);
      }
    }

    // Check for [NEEDS_INPUT: question] tag — suspend loop if onNeedsInput provided
    const needsInputQuestion = detectNeedsInput(finalStepOutput);
    if (needsInputQuestion && options.onNeedsInput) {
      const answer = await options.onNeedsInput(needsInputQuestion);
      // Inject the user's answer into the step output and continue
      finalStepOutput = finalStepOutput.replace(NEEDS_INPUT_REGEX, `[USER_ANSWER: ${answer}]`);
    }

    stepOutputs.push({ step: i + 1, description: step.description, output: finalStepOutput });
    step.done = true;

    // Fire onStep callback for milestone events (non-blocking in caller)
    if (options.onStep) {
      await options.onStep({
        stepIndex: i,
        stepTotal: plan.steps.length,
        description: step.description,
        output: finalStepOutput,
        toolCalls: allToolResults.slice()
      });
    }

    // Update _taskplan.md after each step completes
    writePlanFile(workspacePath, plan, userMessage, stepOutputs);
    console.log(`  ✓ Step ${i + 1} complete — _taskplan.md updated (${llmCalls} LLM calls so far)`);
  }

  // Final summary — ask entity to tie it all together
  let finalSummary;
  try {
    const stepsBlock = stepOutputs.map(s =>
      `Step ${s.step} — ${s.description}:\n${s.output}`
    ).join('\n\n');

    // Inject summarize-phase blueprints (quality gate + output format)
    const summaryBlueprint = blueprintLoader.getBlueprintForPhase(taskType, { phase: 'summarize' });
    const summaryBpSection = summaryBlueprint ? `\n\n[Before you respond, check these rules]\n${summaryBlueprint}` : '';

    const summaryMessages = [
      {
        role: 'system',
        content: `You are ${entityName}. You have completed a multi-step task for the user. Give a natural, brief summary of what you accomplished and where the files are in your workspace. Stay in character. Do NOT repeat the full content of files — just tell the user what you created and where to find it.${summaryBpSection}`
      },
      {
        role: 'user',
        content: `Original request: "${userMessage}"\n\nYou completed ${stepOutputs.length} steps:\n\n${stepsBlock}\n\nNow give the user a brief summary of what you created and where to find it in the workspace.`
      }
    ];

    if (llmCalls < MAX_LLM_CALLS) {
      finalSummary = await callLLM(runtime, summaryMessages, { temperature: 0.6 });
      llmCalls++;
    } else {
      finalSummary = stepOutputs.map(s => `**${s.description}**\n${s.output}`).join('\n\n');
    }
  } catch (err) {
    finalSummary = stepOutputs.map(s => `**${s.description}**\n${s.output}`).join('\n\n');
  }

  // Delete _taskplan.md — task is done
  deletePlanFile(workspacePath);
  console.log(`  📋 Task complete: ${stepOutputs.length} steps, ${llmCalls} LLM calls, ${allToolResults.length} tool calls — _taskplan.md deleted`);

  return {
    finalResponse: finalSummary,
    allToolResults,
    stepOutputs,
    plan,
    llmCalls
  };
}

/**
 * runTask — module-aware entry point for the Task Executor.
 * Accepts an assembled system prompt and step/needs-input hooks.
 * Calls the LLM to generate a plan, then hands off to executeTaskPlan.
 *
 * @param {Object} config
 *   - taskType {string}
 *   - userMessage {string}
 *   - systemPrompt {string} — assembled by task-executor
 *   - callLLM {Function} — async (runtime, messages, opts) => string
 *   - runtime {Object}
 *   - tools {Object} — already filtered by executor
 *   - entityName {string}
 *   - workspacePath {string}
 *   - onStep {Function?} — async ({ stepIndex, stepTotal, description, output, toolCalls }) => void
 *   - onNeedsInput {Function?} — async (question) => string (answer)
 * @returns {Promise<Object>} { finalResponse, stepOutputs, allToolResults, plan, llmCalls }
 */
async function runTask(config) {
  const {
    taskType = 'task',
    userMessage,
    systemPrompt = '',
    callLLM,
    runtime,
    tools = {},
    entityName = 'Entity',
    workspacePath = '',
    onStep,
    onNeedsInput
  } = config;

  if (!callLLM || typeof callLLM !== 'function') {
    throw new Error('runTask: callLLM must be a function');
  }
  if (!userMessage) {
    throw new Error('runTask: userMessage is required');
  }

  // Step 1: Call LLM to generate a plan
  const planBlueprint = blueprintLoader.getBlueprintForPhase(taskType, { phase: 'plan' });
  const planSystemContent = planBlueprint
    ? `${systemPrompt}\n\n[Planning Instructions]\n${planBlueprint}`
    : (systemPrompt || `You are ${entityName}. Create a step-by-step task plan using [TASK_PLAN]...[/TASK_PLAN] blocks.`);

  const planMessages = [
    {
      role: 'system',
      content: planSystemContent
    },
    {
      role: 'user',
      content: `${userMessage}\n\nCreate a concise task plan to complete this request.`
    }
  ];

  let planResponse;
  try {
    planResponse = await callLLM(runtime, planMessages, { temperature: 0.7 });
  } catch (err) {
    throw new Error(`runTask: plan generation failed: ${err.message}`);
  }

  // Step 2: Parse the plan
  const plan = parsePlan(planResponse);

  if (!plan) {
    // No [TASK_PLAN] block found — treat as a single-step direct response
    const singleStep = { step: 1, description: 'Execute task', output: planResponse };
    if (onStep) {
      await onStep({
        stepIndex: 0,
        stepTotal: 1,
        description: singleStep.description,
        output: singleStep.output,
        toolCalls: []
      });
    }
    return {
      finalResponse: planResponse,
      stepOutputs: [singleStep],
      allToolResults: [],
      plan: null,
      llmCalls: 1
    };
  }

  // Step 3: Execute the plan with hooks
  return executeTaskPlan(plan, userMessage, {
    taskType,
    entityName,
    systemPrompt,
    callLLM,
    runtime,
    workspacePath,
    workspaceTools: tools.workspaceTools || null,
    webFetch: tools.webFetch || null,
    cmdRun: tools.cmdRun || null,
    memorySearch: tools.memorySearch || null,
    memoryCreate: tools.memoryCreate || null,
    onStep,
    onNeedsInput
  });
}

module.exports = { parsePlan, stripPlanBlock, executeTaskPlan, runTask, detectNeedsInput };
