'use strict';

const { classify } = require('./intent-classifier');
const { gatherContext } = require('./task-context-gatherer');
const taskExecutor = require('./task-executor');
const taskSession = require('./task-session');
const taskProjectStore = require('./task-project-store');
const taskArchiveWriter = require('./task-archive-writer');
const taskModuleRegistry = require('./task-module-registry');
const entityChatManager = require('./entity-chat-manager');

const TASK_MIN_CONFIDENCE = 0.7;

function createTaskPipelineBridge(deps = {}) {
  const {
    callLLMWithRuntime,
    frontman,
    getSubconsciousMemoryContext,
    webFetch,
    workspaceTools,
    logTimeline = () => {},
    classifyIntent = classify
  } = deps;

  async function _relationshipSignal(userMessage) {
    if (typeof getSubconsciousMemoryContext !== 'function') return 'neutral';
    try {
      const ctx = await getSubconsciousMemoryContext(userMessage, 5);
      const top = Array.isArray(ctx?.connections) && ctx.connections.length ? ctx.connections[0] : null;
      if (top && top.type) return String(top.type);
      if (top && Array.isArray(top.topics) && top.topics.length) return 'topic:' + top.topics.slice(0, 2).join(',');
      return 'neutral';
    } catch (_) {
      return 'neutral';
    }
  }

  function _selectPlanningEntities(userMessage) {
    const all = entityChatManager.listSessions ? [] : []; // no-op, kept for future extension
    void all;
    const registry = require('./entity-network-registry');
    const listed = registry.listEntities();
    if (!listed.length) return [];

    const lower = String(userMessage || '').toLowerCase();
    const preferred = [];

    const wantsResearch = /research|evidence|sources|literature|study/.test(lower);
    const wantsAnalysis = /analy|compare|tradeoff|evaluate|risk/.test(lower);
    const wantsSynthesis = /plan|roadmap|synth|write|final/.test(lower);

    if (wantsResearch) preferred.push(...registry.findByCapability('web_search'));
    if (wantsAnalysis) preferred.push(...registry.findByCapability('data_analysis'));
    if (wantsSynthesis) preferred.push(...registry.findByCapability('consensus_building'));

    const merged = [...preferred, ...listed].filter(Boolean);
    const dedup = [];
    const seen = new Set();
    merged.forEach((e) => {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        dedup.push(e.id);
      }
    });

    return dedup.slice(0, 4);
  }

  async function detectAndDispatchTask(userMessage, entity, options = {}) {
    const {
      isInternalResume = false,
      aspectConfigs = {}
    } = options;

    if (!entity || !entity.id) return { handled: false };
    if (isInternalResume) return { handled: false };

    const classification = await classifyIntent(userMessage, { llmFallback: false });
    const active = frontman.getActiveSession(entity.id);

    // Mid-task user message handling (when not a new high-confidence task intent)
    const isHighConfidenceTask = classification.intent === 'task' && classification.confidence >= TASK_MIN_CONFIDENCE;
    if (active && !isHighConfidenceTask) {
      const routed = await frontman.handleMidTaskUserMessage(entity.id, userMessage, { isNewTaskIntent: false });
      if (routed.handled) {
        logTimeline('task.frontman.mid_task_routed', {
          entityId: entity.id,
          sessionId: active.sessionId,
          action: routed.action || 'handled'
        });
        return {
          handled: true,
          mode: 'frontman_mid_task',
          response: routed.response,
          classification
        };
      }
    }

    if (!isHighConfidenceTask) {
      return { handled: false, classification };
    }

    const relationshipSignal = await _relationshipSignal(userMessage);

    // Planning mode: create collaborative chat session instead of single executor
    if (classification.taskType === 'planning') {
      const participantIds = _selectPlanningEntities(userMessage);
      const planningSession = entityChatManager.createSession({
        sessionType: 'planning',
        prompt: userMessage,
        entityIds: participantIds
      });

      entityChatManager.routeMessage(planningSession.id, {
        from: entity.id,
        content: userMessage
      });

      const response = `I kicked off a planning session with ${participantIds.length || 0} specialist entities. I will moderate the discussion and bring you a consolidated plan.`;

      logTimeline('task.planning.started', {
        entityId: entity.id,
        sessionId: planningSession.id,
        participantCount: participantIds.length
      });

      return {
        handled: true,
        mode: 'planning',
        response,
        classification,
        planningSessionId: planningSession.id
      };
    }

    const module = taskModuleRegistry.getModule(classification.taskType);
    if (!module) {
      return { handled: false, classification };
    }

    const project = taskProjectStore.resolveOrCreateProject(entity.id, classification.taskType, userMessage);
    const taskId = 'task_' + Date.now();
    const taskArchiveId = taskArchiveWriter.createTaskArchive(project.id, taskId, {
      userMessage,
      taskType: classification.taskType
    }, { entityId: entity.id });

    const session = taskSession.createSession({
      entityId: entity.id,
      taskType: classification.taskType,
      projectId: project.id,
      taskArchiveId,
      sharedContext: {
        userMessage,
        classification
      }
    });

    const context = await gatherContext(classification.taskType, userMessage, { id: entity.id });
    taskSession.updateSession(session.id, {
      sharedContext: { taskContext: context }
    });

    frontman.startSession({
      sessionId: session.id,
      entityId: entity.id,
      entity,
      relationshipSignal,
      runtime: aspectConfigs.main || {}
    });

    // Fire-and-forget task execution. Frontman emits user-visible progress from events.
    setImmediate(async () => {
      try {
        const execResult = await taskExecutor.executeTask({
          taskType: classification.taskType,
          userMessage,
          entity,
          contextSnippets: context.snippets || [],
          callLLM: callLLMWithRuntime,
          runtime: aspectConfigs.main || {},
          allTools: {
            workspaceTools,
            webFetch
          },
          taskArchiveId,
          archiveWriter: taskArchiveWriter
        });

        taskSession.updateSession(session.id, {
          sharedContext: {
            finalOutput: execResult.finalOutput,
            completedAt: execResult.completedAt
          }
        });
      } catch (e) {
        taskSession.updateSession(session.id, {
          sharedContext: {
            lastError: e.message
          }
        });
      }
    });

    const response = `I started a ${classification.taskType} task and I will keep you updated as each milestone completes.`;

    logTimeline('task.pipeline.dispatch', {
      entityId: entity.id,
      sessionId: session.id,
      taskType: classification.taskType,
      confidence: classification.confidence
    });

    return {
      handled: true,
      mode: 'task',
      response,
      classification,
      taskSessionId: session.id
    };
  }

  return {
    detectAndDispatchTask,
    TASK_MIN_CONFIDENCE
  };
}

module.exports = { createTaskPipelineBridge, TASK_MIN_CONFIDENCE };
