'use strict';

const { classify } = require('./intent-classifier');
const { gatherContext } = require('./task-context-gatherer');
const taskExecutor = require('./task-executor');
const taskSession = require('./task-session');
const taskProjectStore = require('./task-project-store');
const taskArchiveWriter = require('./task-archive-writer');
const taskModuleRegistry = require('./task-module-registry');
const entityChatManager = require('./entity-chat-manager');
const EntityManager = require('../utils/entity-manager');
const { runPlanningSession } = require('./planning-orchestrator');
const { executeProject } = require('./project-executor');

const TASK_MIN_CONFIDENCE = 0.7;

function createTaskPipelineBridge(deps = {}) {
  const {
    callLLMWithRuntime,
    frontman,
    getSubconsciousMemoryContext,
    webFetch,
    workspaceTools,
    cmdRun,
    logTimeline = () => {},
    classifyIntent = classify,
    gatherTaskContext = gatherContext,
    taskExecutorImpl = taskExecutor,
    taskSessionStore = taskSession,
    taskProjectStoreApi = taskProjectStore,
    taskArchiveWriterApi = taskArchiveWriter,
    taskModuleRegistryApi = taskModuleRegistry
  } = deps;

  function stripTaskIntentDecorators(userMessage) {
    const raw = String(userMessage || '');
    if (!raw) return '';

    if (/^\s*Subconscious turn context for this user message only:/i.test(raw)) {
      const match = raw.match(/User message:\s*([^\n]+)/i);
      if (match && match[1]) return String(match[1]).trim();
    }

    return raw.trim();
  }

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

  /**
   * Heuristic: should a task be delegated to a worker entity?
   * Delegates research/analysis tasks that are sufficiently complex.
   */
  function shouldDelegate(classification, userMessage) {
    const delegatableTypes = new Set(['research', 'analysis', 'RESEARCH', 'ANALYSIS']);
    if (!delegatableTypes.has(classification.taskType)) return false;
    if (classification.confidence < 0.85) return false;
    if (String(userMessage || '').length < 100) return false;
    return true;
  }

  /**
   * Spawn a worker entity, execute the task with worker context, then clean up.
   * Returns results attributed to the requesting entity.
   */
  async function _handleDelegation(classification, taskIntentMessage, entity, options = {}) {
    const { aspectConfigs = {} } = options;
    const mgr = new EntityManager();

    const worker = mgr.spawnWorkerEntity({
      specialty: classification.taskType,
      traits: ['focused', 'efficient', 'analytical'],
      taskType: classification.taskType
    });

    logTimeline('task.delegation.worker_spawned', {
      entityId: entity.id,
      workerId: worker.id,
      taskType: classification.taskType
    });

    const project = taskProjectStoreApi.resolveOrCreateProject(entity.id, classification.taskType, taskIntentMessage);
    const taskId = 'task_' + Date.now();
    const taskArchiveId = taskArchiveWriterApi.createTaskArchive(project.id, taskId, {
      userMessage: taskIntentMessage,
      taskType: classification.taskType,
      delegatedTo: worker.id
    }, { entityId: entity.id });

    const session = taskSessionStore.createSession({
      entityId: entity.id,
      taskType: classification.taskType,
      projectId: project.id,
      taskArchiveId,
      sharedContext: {
        userMessage: taskIntentMessage,
        classification,
        delegatedWorkerId: worker.id
      }
    });

    const context = await gatherTaskContext(classification.taskType, taskIntentMessage, { id: entity.id });
    taskSessionStore.updateSession(session.id, {
      sharedContext: { taskContext: context }
    });

    const relationshipSignal = await _relationshipSignal(taskIntentMessage);
    frontman.startSession({
      sessionId: session.id,
      entityId: entity.id,
      entity,
      relationshipSignal,
      runtime: aspectConfigs.main || {}
    });

    // Fire-and-forget: execute with worker entity, clean up after
    setImmediate(async () => {
      try {
        const workerEntity = {
          id: worker.id,
          name: worker.name,
          workspacePath: worker.entityPath
        };

        const execResult = await taskExecutorImpl.executeTask({
          taskType: classification.taskType,
          userMessage: taskIntentMessage,
          entity: workerEntity,
          contextSnippets: context.snippets || [],
          callLLM: callLLMWithRuntime,
          runtime: aspectConfigs.main || {},
          allTools: { workspaceTools, webFetch, cmdRun },
          taskArchiveId,
          archiveWriter: taskArchiveWriterApi
        });

        taskSessionStore.updateSession(session.id, {
          sharedContext: {
            finalOutput: execResult.finalOutput,
            completedAt: execResult.completedAt,
            delegatedWorkerId: worker.id
          }
        });
        taskSessionStore.closeSession(session.id, 'complete');
      } catch (e) {
        taskSessionStore.updateSession(session.id, {
          sharedContext: { lastError: e.message }
        });
        taskSessionStore.closeSession(session.id, 'error');
      } finally {
        // Clean up worker entity unless keepWorker is requested
        if (!options.keepWorker) {
          try { mgr.cleanupWorkerEntity(worker.id); } catch (_) { /* ignore */ }
        }
      }
    });

    const response = `I've delegated this ${classification.taskType} task to a specialist worker. I'll keep you updated as milestones complete.`;

    logTimeline('task.delegation.dispatch', {
      entityId: entity.id,
      sessionId: session.id,
      workerId: worker.id,
      taskType: classification.taskType
    });

    return {
      handled: true,
      mode: 'delegation',
      response,
      classification,
      taskSessionId: session.id,
      workerId: worker.id
    };
  }

  /**
   * Handle a project-type task: plan it, then execute all phases sequentially.
   * Plans via LLM decomposition, then chains each phase through executeTask.
   */
  async function _handleProjectExecution(classification, taskIntentMessage, entity, options = {}) {
    const { aspectConfigs = {} } = options;

    const project = taskProjectStoreApi.resolveOrCreateProject(entity.id, 'project', taskIntentMessage);
    const taskId = 'task_' + Date.now();
    const taskArchiveId = taskArchiveWriterApi.createTaskArchive(project.id, taskId, {
      userMessage: taskIntentMessage,
      taskType: 'project'
    }, { entityId: entity.id });

    const session = taskSessionStore.createSession({
      entityId: entity.id,
      taskType: 'project',
      projectId: project.id,
      taskArchiveId,
      sharedContext: {
        userMessage: taskIntentMessage,
        classification
      }
    });

    const context = await gatherTaskContext('project', taskIntentMessage, { id: entity.id });
    taskSessionStore.updateSession(session.id, {
      sharedContext: { taskContext: context }
    });

    const relationshipSignal = await _relationshipSignal(taskIntentMessage);
    frontman.startSession({
      sessionId: session.id,
      entityId: entity.id,
      entity,
      relationshipSignal,
      runtime: aspectConfigs.main || {}
    });

    logTimeline('task.project.started', {
      entityId: entity.id,
      sessionId: session.id
    });

    // Fire-and-forget: plan decomposition + sequential phase execution
    setImmediate(async () => {
      try {
        // The project plan is the user's request itself — the project-executor
        // will use LLM to decompose it into phases, then execute each one.
        const result = await executeProject({
          projectPlan: taskIntentMessage,
          userMessage: taskIntentMessage,
          entity,
          callLLM: callLLMWithRuntime,
          runtime: aspectConfigs.main || {},
          allTools: { workspaceTools, webFetch, cmdRun },
          executeTaskFn: taskExecutorImpl.executeTask,
          projectSessionId: session.id,
          archiveWriter: taskArchiveWriterApi,
          taskArchiveId,
          contextSnippets: context.snippets || []
        });

        taskSessionStore.updateSession(session.id, {
          sharedContext: {
            finalOutput: result.finalSummary,
            phases: result.phases.map(p => ({
              name: p.name,
              status: p.status,
              taskType: p.taskType
            })),
            completedCount: result.completedCount,
            failedCount: result.failedCount,
            completedAt: Date.now()
          }
        });
        taskSessionStore.closeSession(session.id, result.failedCount === 0 ? 'complete' : 'partial');
      } catch (e) {
        taskSessionStore.updateSession(session.id, {
          sharedContext: { lastError: e.message }
        });
        taskSessionStore.closeSession(session.id, 'error');
      }
    });

    const response = `I'm starting a multi-phase project. I'll decompose the plan into phases, execute each one in order, and keep you updated as phases complete.`;

    return {
      handled: true,
      mode: 'project',
      response,
      classification,
      taskSessionId: session.id
    };
  }

  async function detectAndDispatchTask(userMessage, entity, options = {}) {
    const {
      isInternalResume = false,
      aspectConfigs = {}
    } = options;

    if (!entity || !entity.id) return { handled: false };
    if (isInternalResume) return { handled: false };

    const taskIntentMessage = stripTaskIntentDecorators(userMessage);

    const classification = await classifyIntent(taskIntentMessage, { llmFallback: false });
    const active = frontman.getActiveSession(entity.id);

    // Mid-task user message handling (when not a new high-confidence task intent)
    const isHighConfidenceTask = classification.intent === 'task' && classification.confidence >= TASK_MIN_CONFIDENCE;
    if (active && !isHighConfidenceTask) {
      const routed = await frontman.handleMidTaskUserMessage(entity.id, taskIntentMessage, { isNewTaskIntent: false });
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

    const relationshipSignal = await _relationshipSignal(taskIntentMessage);

    // Planning mode: run real multi-entity deliberation via planning orchestrator
    if (classification.taskType === 'planning') {
      const participantIds = _selectPlanningEntities(taskIntentMessage);
      const registry = require('./entity-network-registry');

      // Build participant list with metadata for the orchestrator
      const participants = participantIds.map(id => {
        const ent = registry.getEntity(id);
        return ent
          ? { entityId: id, name: ent.name, capabilities: ent.capabilities || [] }
          : { entityId: id, name: id, capabilities: [] };
      });

      // Create archive for the planning session
      const project = taskProjectStoreApi.resolveOrCreateProject(entity.id, 'planning', taskIntentMessage);
      const taskId = 'task_' + Date.now();
      const taskArchiveId = taskArchiveWriterApi.createTaskArchive(project.id, taskId, {
        userMessage: taskIntentMessage,
        taskType: 'planning'
      }, { entityId: entity.id });

      const taskSessionObj = taskSessionStore.createSession({
        entityId: entity.id,
        taskType: 'planning',
        projectId: project.id,
        taskArchiveId,
        sharedContext: { userMessage: taskIntentMessage, classification }
      });

      logTimeline('task.planning.started', {
        entityId: entity.id,
        sessionId: taskSessionObj.id,
        participantCount: participants.length
      });

      // Fire-and-forget: run deliberation async
      setImmediate(async () => {
        try {
          const result = await runPlanningSession({
            prompt: taskIntentMessage,
            participants,
            callLLM: callLLMWithRuntime,
            runtime: aspectConfigs.main || {},
            taskSessionId: taskSessionObj.id
          });

          // Archive the planning session
          taskArchiveWriterApi.createPlanningArchive(taskArchiveId, {
            sessionId: result.sessionId,
            prompt: taskIntentMessage,
            roundCount: result.rounds.length,
            consensus: result.consensus,
            participants: participants.map(p => ({ ...p, role: 'contributor' }))
          });

          for (const round of result.rounds) {
            taskArchiveWriterApi.appendPlanningRound(taskArchiveId, round);
          }

          taskArchiveWriterApi.writePlanningArtifacts(taskArchiveId, {
            finalPlan: result.plan,
            decisionRationale: result.rationale,
            issuesFlagged: result.issues
          });

          taskSessionStore.updateSession(taskSessionObj.id, {
            sharedContext: { finalOutput: result.plan, completedAt: Date.now() }
          });
          taskSessionStore.closeSession(taskSessionObj.id, 'complete');
        } catch (e) {
          taskSessionStore.updateSession(taskSessionObj.id, {
            sharedContext: { lastError: e.message }
          });
          taskSessionStore.closeSession(taskSessionObj.id, 'error');
        }
      });

      const response = `I kicked off a planning session with ${participants.length || 0} specialist entities. I will moderate the discussion and bring you a consolidated plan.`;

      return {
        handled: true,
        mode: 'planning',
        response,
        classification,
        planningSessionId: taskSessionObj.id
      };
    }

    // Project mode: multi-phase execution with sequential phase chaining
    if (classification.taskType === 'project') {
      return _handleProjectExecution(classification, taskIntentMessage, entity, options);
    }

    const module = taskModuleRegistryApi.getModule(classification.taskType);
    if (!module) {
      return { handled: false, classification };
    }

    // Delegation mode: complex tasks can be handled by spawned worker entities
    if (shouldDelegate(classification, taskIntentMessage)) {
      return _handleDelegation(classification, taskIntentMessage, entity, options);
    }

    const project = taskProjectStoreApi.resolveOrCreateProject(entity.id, classification.taskType, taskIntentMessage);
    const taskId = 'task_' + Date.now();
    const taskArchiveId = taskArchiveWriterApi.createTaskArchive(project.id, taskId, {
      userMessage: taskIntentMessage,
      taskType: classification.taskType
    }, { entityId: entity.id });

    const session = taskSessionStore.createSession({
      entityId: entity.id,
      taskType: classification.taskType,
      projectId: project.id,
      taskArchiveId,
      sharedContext: {
        userMessage: taskIntentMessage,
        classification
      }
    });

    const context = await gatherTaskContext(classification.taskType, taskIntentMessage, { id: entity.id });
    taskSessionStore.updateSession(session.id, {
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
        const execResult = await taskExecutorImpl.executeTask({
          taskType: classification.taskType,
          userMessage: taskIntentMessage,
          entity,
          contextSnippets: context.snippets || [],
          callLLM: callLLMWithRuntime,
          runtime: aspectConfigs.main || {},
          allTools: {
            workspaceTools,
            webFetch,
            cmdRun
          },
          taskArchiveId,
          archiveWriter: taskArchiveWriterApi
        });

        taskSessionStore.updateSession(session.id, {
          sharedContext: {
            finalOutput: execResult.finalOutput,
            completedAt: execResult.completedAt
          }
        });
        taskSessionStore.closeSession(session.id, 'complete');
      } catch (e) {
        taskSessionStore.updateSession(session.id, {
          sharedContext: {
            lastError: e.message
          }
        });
        taskSessionStore.closeSession(session.id, 'error');
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
    shouldDelegate,
    TASK_MIN_CONFIDENCE
  };
}

module.exports = { createTaskPipelineBridge, TASK_MIN_CONFIDENCE };
