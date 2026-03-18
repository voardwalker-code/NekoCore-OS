/**
 * Task Executor
 * Wraps task-runner.js with module-aware prompt assembly, tool filtering,
 * per-step milestone events, stall detection, and non-blocking archive writes.
 */

const crypto = require('crypto');
const taskEventBus = require('./task-event-bus');
const taskModuleRegistry = require('./task-module-registry');

// Map of sessionId -> { resolve: Function } for stalled sessions awaiting input
const _pendingInputs = new Map();

/**
 * Execute a task using the specialized module pipeline
 *
 * @param {Object} config
 *   - taskType {string} — one of the registered task types
 *   - userMessage {string} — the user's request
 *   - entity {Object} — entity object { id, name, persona?, mood?, relationship?, workspacePath? }
 *   - contextSnippets {Array} — gathered context from task-context-gatherer
 *   - callLLM {Function} — async (runtime, messages, opts) => string
 *   - runtime {Object} — LLM runtime config
 *   - allTools {Object} — all available tools { toolName: handler }
 *   - taskArchiveId {string?} — archive ID for step writes (optional)
 *   - archiveWriter {Object?} — task-archive-writer instance (optional)
 *   - _runTaskFn {Function?} — override for testing; defaults to task-runner.runTask
 * @returns {Promise<Object>} { sessionId, steps, finalOutput, taskType, entityId, completedAt }
 */
async function executeTask(config) {
  const {
    taskType,
    userMessage,
    entity,
    contextSnippets = [],
    callLLM,
    runtime,
    allTools = {},
    taskArchiveId = null,
    archiveWriter = null,
    _runTaskFn = null
  } = config;

  // Validate inputs
  if (!taskType || typeof taskType !== 'string') {
    throw new Error('executeTask: taskType is required');
  }
  if (!callLLM || typeof callLLM !== 'function') {
    throw new Error('executeTask: callLLM must be a function');
  }

  // Generate unique session ID
  const sessionId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Get module config for this task type
  const moduleConfig = taskModuleRegistry.getModule(taskType);

  // Build the specialized system prompt
  const systemPrompt = buildTaskSystemPrompt(moduleConfig, entity, contextSnippets);

  // Filter tools to those allowed by this module type
  const allowedToolNames = moduleConfig ? (moduleConfig.allowedTools || []) : [];
  const filteredTools = filterTools(allTools, allowedToolNames);

  // Resolve the runTask function (allows injection for testing)
  let runTask;
  if (_runTaskFn) {
    runTask = _runTaskFn;
  } else {
    // Lazy require to avoid circular dependency issues at load time
    runTask = require('../skills/task-runner').runTask;
  }

  // Per-step milestone callback
  const onStep = async (stepResult) => {
    const milestoneEvent = {
      type: 'milestone',
      sessionId,
      stepIndex: stepResult.stepIndex,
      stepTotal: stepResult.stepTotal,
      stepDescription: stepResult.description,
      stepSummary: (stepResult.output || '').slice(0, 200),
      taskType,
      timestamp: Date.now()
    };

    taskEventBus.emit(sessionId, milestoneEvent);

    // Non-blocking archive step write (fire-and-forget)
    if (archiveWriter && taskArchiveId) {
      setImmediate(() => {
        Promise.resolve(archiveWriter.appendStep(taskArchiveId, {
          stepIndex: stepResult.stepIndex,
          description: stepResult.description,
          toolCalls: stepResult.toolCalls || [],
          output: stepResult.output,
          sources: extractSources(stepResult.output),
          timestamp: Date.now()
        })).catch(() => {}); // ignore archive errors — task continues
      });
    }
  };

  // Needs-input callback — suspends execution until resumeWithInput is called
  const onNeedsInput = async (question) => {
    const needsInputEvent = {
      type: 'needs_input',
      sessionId,
      question,
      context: userMessage,
      timestamp: Date.now()
    };

    taskEventBus.emit(sessionId, needsInputEvent);

    // Suspend: return a Promise that resolves when resumeWithInput(sessionId, answer) is called
    return new Promise((resolve) => {
      _pendingInputs.set(sessionId, { resolve });
    });
  };

  // Execute the task
  let result;
  try {
    result = await runTask({
      taskType,
      userMessage,
      systemPrompt,
      callLLM,
      runtime,
      tools: filteredTools,
      entityName: entity ? (entity.name || 'Entity') : 'Entity',
      workspacePath: entity ? (entity.workspacePath || '') : '',
      onStep,
      onNeedsInput
    });
  } catch (err) {
    const errorEvent = {
      type: 'task_error',
      sessionId,
      error: err.message,
      taskType,
      timestamp: Date.now()
    };
    taskEventBus.emit(sessionId, errorEvent);

    // Release any pending input resolver
    _pendingInputs.delete(sessionId);

    throw err;
  }

  const finalOutput = result.finalResponse;

  // Non-blocking archive finalize (fire-and-forget)
  if (archiveWriter && taskArchiveId) {
    setImmediate(() => {
      Promise.resolve(archiveWriter.finalize(taskArchiveId, finalOutput))
        .catch(() => {}); // ignore archive errors
    });
  }

  const completionEvent = {
    type: 'task_complete',
    sessionId,
    finalOutput,
    taskType,
    entityId: entity ? entity.id : null,
    completedAt: Date.now()
  };
  taskEventBus.emit(sessionId, completionEvent);

  return {
    sessionId,
    steps: result.stepOutputs || [],
    finalOutput,
    taskType,
    entityId: entity ? entity.id : null,
    completedAt: Date.now()
  };
}

/**
 * Resume a stalled task that is waiting for user input
 * @param {string} sessionId - The session that is stalled
 * @param {string} answer - The user's answer to unblock execution
 * @returns {boolean} True if a pending input was found and resolved, false otherwise
 */
function resumeWithInput(sessionId, answer) {
  const pending = _pendingInputs.get(sessionId);
  if (!pending) return false;
  _pendingInputs.delete(sessionId);
  pending.resolve(answer);
  return true;
}

/**
 * Build the specialized system prompt for a task
 * Composes: module system prompt key + entity identity bridge + context snippets
 * @param {Object|null} moduleConfig - Module config from task-module-registry
 * @param {Object|null} entity - Entity object
 * @param {Array} contextSnippets - Gathered context snippets
 * @returns {string} Assembled system prompt
 */
function buildTaskSystemPrompt(moduleConfig, entity, contextSnippets) {
  const parts = [];

  // Module system prompt key
  if (moduleConfig && moduleConfig.systemPromptKey) {
    parts.push(`[Task Mode: ${moduleConfig.systemPromptKey}]`);
    parts.push(`You are executing a specialized ${moduleConfig.systemPromptKey} task.`);
  }

  // Entity identity bridge (persona, mood, relationship signal)
  if (entity) {
    const bridgeParts = [];
    if (entity.name) bridgeParts.push(`You are ${entity.name}.`);
    if (entity.persona) bridgeParts.push(`Your persona: ${entity.persona}`);
    if (entity.mood) bridgeParts.push(`Your current mood/tone: ${entity.mood}`);
    if (entity.relationship) bridgeParts.push(`Your relationship to the user: ${entity.relationship}`);
    if (bridgeParts.length > 0) {
      parts.push('\n[Entity Identity]');
      parts.push(bridgeParts.join(' '));
    }
  }

  // Task context snippets from source-of-truth retrieval
  if (contextSnippets && contextSnippets.length > 0) {
    parts.push('\n[Relevant Context]');
    contextSnippets.slice(0, 5).forEach(snippet => {
      if (snippet && snippet.text) {
        parts.push(`- [${snippet.source || 'context'}]: ${snippet.text.slice(0, 300)}`);
      }
    });
  }

  return parts.join('\n');
}

/**
 * Filter allTools to only include those in the allowedToolNames list
 * @param {Object} allTools - All available tools
 * @param {string[]} allowedToolNames - Tool names to keep
 * @returns {Object} Filtered tools object
 */
function filterTools(allTools, allowedToolNames) {
  if (!allTools || typeof allTools !== 'object') return {};
  if (!allowedToolNames || allowedToolNames.length === 0) return allTools;

  const filtered = {};
  for (const toolName of allowedToolNames) {
    if (Object.prototype.hasOwnProperty.call(allTools, toolName)) {
      filtered[toolName] = allTools[toolName];
    }
  }
  return filtered;
}

/**
 * Extract source URLs from output text
 * @param {string} outputText
 * @returns {string[]} Unique URLs found in the text
 */
function extractSources(outputText) {
  if (!outputText || typeof outputText !== 'string') return [];
  const urlRegex = /https?:\/\/[^\s\]'"<>]+/g;
  const urls = outputText.match(urlRegex) || [];
  return [...new Set(urls)].slice(0, 10);
}

/**
 * Check if a session is currently stalled (waiting for input)
 * @param {string} sessionId
 * @returns {boolean}
 */
function isStalled(sessionId) {
  return _pendingInputs.has(sessionId);
}

module.exports = {
  executeTask,
  resumeWithInput,
  buildTaskSystemPrompt,
  filterTools,
  extractSources,
  isStalled
};
