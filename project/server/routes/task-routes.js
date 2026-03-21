// ── Task Routes ─────────────────────────────────────────────
// POST /api/task/run
// GET  /api/task/session/:id
// POST /api/task/cancel/:id
// GET  /api/task/modules
// GET  /api/task/history/:entityId

function createTaskRoutes(ctx) {
  const { classify } = require('../brain/tasks/intent-classifier');
  const { gatherContext } = require('../brain/tasks/task-context-gatherer');
  const taskModuleRegistry = require('../brain/tasks/task-module-registry');
  const taskSession = require('../brain/tasks/task-session');
  const taskExecutor = require('../brain/tasks/task-executor');
  const taskEventBus = require('../brain/tasks/task-event-bus');
  const projectStore = require('../brain/tasks/task-project-store');
  const archiveWriter = require('../brain/tasks/task-archive-writer');
  const workspaceTools = require('../brain/workspace-tools');

  function _sessionOpts() {
    return {};
  }

  function _activeEntityId(body) {
    return (body && body.entityId) || (ctx.getActiveEntityId ? ctx.getActiveEntityId() : null);
  }

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
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Object.values(data || {});
    } catch (_) {
      return [];
    }
  }

  function _attachEventSync(sessionId) {
    const handler = (event) => {
      if (!event || !event.type) return;
      if (event.type === 'milestone') {
        taskSession.appendStep(sessionId, {
          stepIndex: event.stepIndex,
          stepTotal: event.stepTotal,
          description: event.stepDescription,
          summary: event.stepSummary,
          taskType: event.taskType,
          timestamp: event.timestamp
        }, _sessionOpts());
      } else if (event.type === 'needs_input') {
        taskSession.setStall(sessionId, event.question, _sessionOpts());
      } else if (event.type === 'task_complete') {
        taskSession.clearStall(sessionId, _sessionOpts());
        taskSession.closeSession(sessionId, 'complete', _sessionOpts());
      } else if (event.type === 'task_error') {
        taskSession.closeSession(sessionId, 'cancelled', _sessionOpts());
      }
    };

    taskEventBus.subscribe(sessionId, handler);
    return () => taskEventBus.unsubscribe(sessionId, handler);
  }

  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;

    if (p === '/api/task/run' && m === 'POST') {
      await runTask(req, res, apiHeaders, readBody);
      return true;
    }

    if (p === '/api/task/modules' && m === 'GET') {
      listModules(res, apiHeaders);
      return true;
    }

    const sessionMatch = p.match(/^\/api\/task\/session\/([^/]+)$/);
    if (sessionMatch && m === 'GET') {
      getSession(res, apiHeaders, decodeURIComponent(sessionMatch[1]));
      return true;
    }

    const cancelMatch = p.match(/^\/api\/task\/cancel\/([^/]+)$/);
    if (cancelMatch && m === 'POST') {
      cancelSession(res, apiHeaders, decodeURIComponent(cancelMatch[1]));
      return true;
    }

    const historyMatch = p.match(/^\/api\/task\/history\/([^/]+)$/);
    if (historyMatch && m === 'GET') {
      getHistory(res, apiHeaders, decodeURIComponent(historyMatch[1]), url);
      return true;
    }

    return false;
  }

  async function runTask(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const userMessage = String(body.message || '').trim();
      if (!userMessage) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Missing message' }));
        return;
      }

      const entityId = _activeEntityId(body);
      if (!entityId) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'No active entity' }));
        return;
      }

      const classification = body.taskType
        ? { intent: 'task', taskType: body.taskType, confidence: 1, method: 'override' }
        : await classify(userMessage, { llmFallback: false });

      if (classification.intent !== 'task' || !classification.taskType) {
        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({ ok: true, intent: 'conversation', classification }));
        return;
      }

      const moduleConfig = taskModuleRegistry.getModule(classification.taskType);
      if (!moduleConfig) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Unsupported task type', classification }));
        return;
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
        sharedContext: {
          userMessage,
          classification
        }
      }, _sessionOpts());

      const context = await gatherContext(classification.taskType, userMessage, { id: entityId });
      taskSession.updateSession(session.id, {
        sharedContext: {
          taskContext: context
        }
      }, _sessionOpts());

      // Resolve entity profile from disk for workspace path and identity
      const entityProfile = _loadEntityProfile(entityId);

      const runConfig = {
        sessionId: session.id,
        taskType: classification.taskType,
        userMessage,
        entity: {
          id: entityId,
          name: body.entityName || entityProfile.name || 'Entity',
          persona: body.persona || entityProfile.persona || null,
          mood: body.mood || null,
          relationship: body.relationship || null,
          workspacePath: body.workspacePath || entityProfile.workspacePath || ''
        },
        contextSnippets: context.snippets || [],
        callLLM: ctx.callLLMWithRuntime,
        runtime: body.runtime || {},
        allTools: {
          workspaceTools,
          webFetch: ctx.webFetch
        },
        taskArchiveId,
        archiveWriter
      };

      const unsubscribe = _attachEventSync(session.id);

      // Wire Frontman for SSE feedback if available on ctx
      if (ctx.taskFrontman && typeof ctx.taskFrontman.startSession === 'function') {
        ctx.taskFrontman.startSession({
          sessionId: session.id,
          entityId,
          entity: runConfig.entity,
          relationshipSignal: 'neutral',
          runtime: body.runtime || {}
        });
      }

      const asyncMode = body.async === true;
      if (asyncMode) {
        setImmediate(async () => {
          try {
            const result = await taskExecutor.executeTask(runConfig);
            taskSession.updateSession(session.id, {
              sharedContext: {
                finalOutput: result.finalOutput,
                completedAt: result.completedAt
              }
            }, _sessionOpts());
          } catch (e) {
            taskSession.updateSession(session.id, {
              sharedContext: {
                lastError: e.message
              }
            }, _sessionOpts());
          } finally {
            unsubscribe();
          }
        });

        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({
          ok: true,
          async: true,
          sessionId: session.id,
          taskType: classification.taskType,
          projectId: project.id,
          taskArchiveId
        }));
        return;
      }

      let result;
      try {
        result = await taskExecutor.executeTask(runConfig);
      } finally {
        unsubscribe();
      }

      taskSession.updateSession(session.id, {
        sharedContext: {
          finalOutput: result.finalOutput,
          completedAt: result.completedAt
        }
      }, _sessionOpts());

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        async: false,
        sessionId: session.id,
        taskType: result.taskType,
        entityId: result.entityId,
        steps: result.steps,
        finalOutput: result.finalOutput,
        completedAt: result.completedAt
      }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  function getSession(res, apiHeaders, sessionId) {
    const session = taskSession.getSession(sessionId, _sessionOpts());
    if (!session) {
      res.writeHead(404, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Session not found' }));
      return;
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, session }));
  }

  function cancelSession(res, apiHeaders, sessionId) {
    const closed = taskSession.closeSession(sessionId, 'cancelled', _sessionOpts());
    if (!closed) {
      res.writeHead(404, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Session not found' }));
      return;
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, sessionId, status: 'cancelled' }));
  }

  function listModules(res, apiHeaders) {
    const modules = taskModuleRegistry.listModules();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, modules }));
  }

  function getHistory(res, apiHeaders, entityId, url) {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
    const sessions = _readAllSessionsForHistory()
      .filter((s) => String(s.entityId) === String(entityId))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, limit);

    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, entityId, sessions }));
  }

  return { dispatch };
}

module.exports = createTaskRoutes;
