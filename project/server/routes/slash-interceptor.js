// ── Server-Side Slash Command Interceptor ────────────────────────────────────
// Detects /command messages before they reach the LLM pipeline.
// Used by both /api/chat and /api/nekocore/chat so slash commands work
// from every client: entity chat, NekoCore OS chat, and failsafe console.
//
// Returns { handled, response } where:
//   handled: true  → caller should return `response` to the client
//   handled: false → message is not a slash command, proceed to LLM
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const SLASH_RE = /^\/([a-z]+)(?:\s+(.*))?$/i;

const taskSession = require('../brain/tasks/task-session');
const taskExecutor = require('../brain/tasks/task-executor');
const taskEventBus = require('../brain/tasks/task-event-bus');
const { classify } = require('../brain/tasks/intent-classifier');
const { gatherContext } = require('../brain/tasks/task-context-gatherer');
const taskModuleRegistry = require('../brain/tasks/task-module-registry');
const projectStore = require('../brain/tasks/task-project-store');
const archiveWriter = require('../brain/tasks/task-archive-writer');
const workspaceTools = require('../brain/workspace-tools');

function _loadEntityProfile(entityId) {
  const fs = require('fs');
  const path = require('path');
  try {
    const entityPaths = require('../entityPaths');
    const entityFile = path.join(entityPaths.getEntityRoot(entityId), 'entity.json');
    if (fs.existsSync(entityFile)) {
      return JSON.parse(fs.readFileSync(entityFile, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function _readAllSessionsForHistory() {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '..', 'data', 'task-sessions.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return Object.values(JSON.parse(fs.readFileSync(filePath, 'utf8')) || {});
  } catch (_) { return []; }
}

/**
 * Try to intercept a slash command.
 * @param {string} message   — the raw user message (already trimmed)
 * @param {string} entityId  — resolved entity ID (active entity or 'nekocore')
 * @param {object} ctx       — server context (callLLMWithRuntime, broadcastSSE, webFetch)
 * @returns {{ handled: boolean, response?: object }}
 */
async function intercept(message, entityId, ctx) {
  if (!message || message[0] !== '/') return { handled: false };

  const m = message.match(SLASH_RE);
  if (!m) return { handled: false };

  const cmd  = m[1].toLowerCase();
  const args = (m[2] || '').trim();

  switch (cmd) {
    case 'task':       return _dispatchTask(args, entityId, ctx, false);
    case 'project':    return _dispatchTask(args, entityId, ctx, true);
    case 'skill':      return _dispatchSkill(args, entityId, ctx);
    case 'websearch':  return _dispatchWebSearch(args, entityId, ctx);
    case 'stop':       return _cmdStop(args);
    case 'list':       return _cmdList(entityId);
    case 'listactive': return _cmdListActive(entityId);
    default:           return { handled: false }; // unknown → pass to LLM
  }
}

// ── /task and /project ──────────────────────────────────────────────────────
async function _dispatchTask(description, entityId, ctx, isProject) {
  if (!description) {
    return _ok(`Usage: /${isProject ? 'project' : 'task'} <description>`);
  }
  if (!entityId) return _ok('⚠️ No active entity. Load an entity first.');

  const taskType = isProject ? 'project' : null;
  return _runTask(description, entityId, ctx, taskType);
}

// ── /skill ──────────────────────────────────────────────────────────────────
async function _dispatchSkill(args, entityId, ctx) {
  const parts = args.split(/\s+/);
  const skillName = parts[0];
  if (!skillName) return _ok('Usage: /skill <name> [args…]');
  if (!entityId) return _ok('⚠️ No active entity. Load an entity first.');

  const skillArgs = parts.slice(1).join(' ');
  return _runTask(skillArgs || skillName, entityId, ctx, 'skill', skillName);
}

// ── /websearch ──────────────────────────────────────────────────────────────
async function _dispatchWebSearch(query, entityId, ctx) {
  if (!query) return _ok('Usage: /websearch <query>');
  if (!entityId) return _ok('⚠️ No active entity. Load an entity first.');
  return _runTask(query, entityId, ctx, 'research');
}

// ── /stop ───────────────────────────────────────────────────────────────────
function _cmdStop(sessionId) {
  if (!sessionId) return _ok('Usage: /stop <session-id>');
  const closed = taskSession.closeSession(sessionId, 'cancelled', {});
  if (!closed) return _ok(`⚠️ Session "${sessionId}" not found.`);
  return _ok(`✋ Task ${sessionId} cancelled.`);
}

// ── /list ───────────────────────────────────────────────────────────────────
function _cmdList(entityId) {
  if (!entityId) return _ok('⚠️ No active entity.');
  const sessions = _readAllSessionsForHistory()
    .filter(s => String(s.entityId) === String(entityId))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 20);
  if (!sessions.length) return _ok('No task history found.');
  const lines = sessions.map(s =>
    `• [${s.id}]  ${s.taskType || '—'}  ${s.status || '—'}`
  ).join('\n');
  return _ok('Task history:\n' + lines);
}

// ── /listactive ─────────────────────────────────────────────────────────────
function _cmdListActive(entityId) {
  if (!entityId) return _ok('⚠️ No active entity.');
  const sessions = _readAllSessionsForHistory()
    .filter(s =>
      String(s.entityId) === String(entityId) &&
      (s.status === 'running' || s.status === 'pending')
    );
  if (!sessions.length) return _ok('No active tasks running.');
  const lines = sessions.map(s =>
    `• [${s.id}]  ${s.taskType || '—'}  ${s.status}`
  ).join('\n');
  return _ok('Active tasks:\n' + lines);
}

// ── Shared task dispatch ────────────────────────────────────────────────────
async function _runTask(userMessage, entityId, ctx, taskType, skill) {
  try {
    const classification = taskType
      ? { intent: 'task', taskType, confidence: 1, method: 'slash-command' }
      : await classify(userMessage, { llmFallback: false });

    if (classification.intent !== 'task' || !classification.taskType) {
      return _ok('Could not classify task — try being more specific.');
    }

    const moduleConfig = taskModuleRegistry.getModule(classification.taskType);
    if (!moduleConfig) {
      return _ok(`⚠️ Unsupported task type: ${classification.taskType}`);
    }

    const project = projectStore.resolveOrCreateProject(entityId, classification.taskType, userMessage);
    const taskId = 'task_' + Date.now();
    const taskArchiveId = archiveWriter.createTaskArchive(project.id, taskId, {
      userMessage,
      taskType: classification.taskType
    }, { entityId });

    const session = taskSession.createSession({
      entityId,
      taskType: classification.taskType,
      projectId: project.id,
      taskArchiveId,
      sharedContext: { userMessage, classification }
    }, {});

    const context = await gatherContext(classification.taskType, userMessage, { id: entityId });
    taskSession.updateSession(session.id, {
      sharedContext: { taskContext: context }
    }, {});

    // Resolve entity profile from disk for workspace path and identity
    const entityProfile = _loadEntityProfile(entityId);

    const runConfig = {
      sessionId: session.id,
      taskType: classification.taskType,
      userMessage,
      entity: {
        id: entityId,
        name: entityProfile.name || 'Entity',
        persona: entityProfile.personality_traits || null,
        mood: null,
        relationship: null,
        workspacePath: entityProfile.workspacePath || ''
      },
      contextSnippets: context.snippets || [],
      callLLM: ctx.callLLMWithRuntime,
      runtime: {},
      allTools: { workspaceTools, webFetch: ctx.webFetch },
      taskArchiveId,
      archiveWriter,
      ...(skill ? { skill } : {})
    };

    // Wire Frontman for SSE feedback if available on ctx
    if (ctx.taskFrontman && typeof ctx.taskFrontman.startSession === 'function') {
      ctx.taskFrontman.startSession({
        sessionId: session.id,
        entityId,
        entity: runConfig.entity,
        relationshipSignal: 'neutral',
        runtime: {}
      });
    }

    // Subscribe to task events for session tracking
    const handler = (event) => {
      if (!event || !event.type) return;
      if (event.type === 'milestone') {
        taskSession.appendStep(session.id, {
          stepIndex: event.stepIndex, stepTotal: event.stepTotal,
          description: event.stepDescription, summary: event.stepSummary,
          taskType: event.taskType, timestamp: event.timestamp
        }, {});
      } else if (event.type === 'task_complete') {
        taskSession.closeSession(session.id, 'complete', {});
      } else if (event.type === 'task_error') {
        taskSession.closeSession(session.id, 'cancelled', {});
      }
    };
    taskEventBus.subscribe(session.id, handler);

    // Fire-and-forget async execution
    setImmediate(async () => {
      try {
        const result = await taskExecutor.executeTask(runConfig);
        taskSession.updateSession(session.id, {
          sharedContext: { finalOutput: result.finalOutput, completedAt: result.completedAt }
        }, {});
      } catch (e) {
        taskSession.updateSession(session.id, {
          sharedContext: { lastError: e.message }
        }, {});
      } finally {
        taskEventBus.unsubscribe(session.id, handler);
      }
    });

    const label = classification.taskType.charAt(0).toUpperCase() + classification.taskType.slice(1);
    return _ok(
      `✅ ${label} task started (session: ${session.id}).\n` +
      `Use /listactive to check progress, or /stop ${session.id} to cancel.`
    );
  } catch (e) {
    return _ok('⚠️ Task dispatch failed: ' + e.message);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function _ok(text) {
  return { handled: true, response: { ok: true, response: text, slashCommand: true } };
}

module.exports = { intercept };
