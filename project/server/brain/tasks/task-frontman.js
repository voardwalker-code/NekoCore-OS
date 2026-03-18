'use strict';

const taskEventBus = require('./task-event-bus');
const taskSession = require('./task-session');
const { buildTaskFrontmanPrompt } = require('../generation/aspect-prompts');

function createTaskFrontman(deps = {}) {
  const {
    callLLMWithRuntime,
    broadcastSSE = () => {},
    logTimeline = () => {},
    runtime = {},
    resumeWithInput = () => false,
    sessionStore = taskSession
  } = deps;

  const activeByEntity = new Map(); // entityId -> session meta
  const handlersBySession = new Map(); // sessionId -> handler

  async function synthesize(entity, relationshipSignal, brief) {
    const name = entity?.name || 'NekoCore';
    const relationship = relationshipSignal || 'neutral';

    if (typeof callLLMWithRuntime !== 'function') {
      return `[${name}] ${brief}`;
    }

    const prompt = buildTaskFrontmanPrompt(entity, relationship, brief);
    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: brief }
    ];

    try {
      const response = await callLLMWithRuntime(runtime, messages, { temperature: 0.4 });
      return String(response || '').trim() || `[${name}] ${brief}`;
    } catch (_) {
      return `[${name}] ${brief}`;
    }
  }

  async function emitChatMessage(entityId, sessionId, message) {
    broadcastSSE('chat_follow_up', {
      message,
      taskSessionId: sessionId,
      entityId,
      timestamp: Date.now()
    });
  }

  async function handleTaskEvent(meta, event) {
    const { entityId, sessionId, entity, relationshipSignal } = meta;
    if (!event || !event.type) return;

    if (event.type === 'milestone') {
      const brief = `Step ${Number(event.stepIndex || 0) + 1}/${event.stepTotal || '?'} completed: ${event.stepDescription || 'progress made'}.`;
      const msg = await synthesize(entity, relationshipSignal, brief);
      await emitChatMessage(entityId, sessionId, msg);
      broadcastSSE('task_milestone', { sessionId, entityId, event, timestamp: Date.now() });
      return;
    }

    if (event.type === 'needs_input') {
      const brief = `I need your input before continuing: ${event.question || 'Please clarify the next step.'}`;
      const msg = await synthesize(entity, relationshipSignal, brief);
      const s = activeByEntity.get(entityId);
      if (s) {
        s.stalled = true;
        s.question = event.question || null;
      }
      await emitChatMessage(entityId, sessionId, msg);
      broadcastSSE('task_needs_input', { sessionId, entityId, event, timestamp: Date.now() });
      return;
    }

    if (event.type === 'task_complete') {
      const brief = 'Task complete. I wrapped everything up and prepared the final result.';
      const msg = await synthesize(entity, relationshipSignal, brief);
      await emitChatMessage(entityId, sessionId, msg);
      broadcastSSE('task_complete', { sessionId, entityId, event, timestamp: Date.now() });
      stopSession(entityId, sessionId);
      return;
    }

    if (event.type === 'task_error') {
      const brief = `Something went wrong while running this task: ${event.error || 'unknown error'}.`;
      const msg = await synthesize(entity, relationshipSignal, brief);
      await emitChatMessage(entityId, sessionId, msg);
      broadcastSSE('task_error', { sessionId, entityId, event, timestamp: Date.now() });
      stopSession(entityId, sessionId);
    }
  }

  function startSession(meta) {
    const sessionMeta = {
      ...meta,
      stalled: false,
      question: null
    };
    activeByEntity.set(meta.entityId, sessionMeta);

    const handler = (event) => {
      Promise.resolve(handleTaskEvent(sessionMeta, event)).catch(() => {});
    };

    handlersBySession.set(meta.sessionId, handler);
    taskEventBus.subscribe(meta.sessionId, handler);
    return sessionMeta;
  }

  function stopSession(entityId, sessionId) {
    const active = activeByEntity.get(entityId);
    if (active && active.sessionId === sessionId) {
      activeByEntity.delete(entityId);
    }
    const handler = handlersBySession.get(sessionId);
    if (handler) {
      taskEventBus.unsubscribe(sessionId, handler);
      handlersBySession.delete(sessionId);
    }
    taskEventBus.cleanup(sessionId);
  }

  async function handleMidTaskUserMessage(entityId, userMessage, options = {}) {
    const sessionMeta = activeByEntity.get(entityId);
    if (!sessionMeta) return { handled: false };

    const text = String(userMessage || '').trim();
    if (!text) return { handled: false };

    if (options.isNewTaskIntent) {
      return { handled: false };
    }

    const isStop = /\b(stop|cancel|abort|pause)\b/i.test(text);
    if (isStop) {
      sessionStore.closeSession(sessionMeta.sessionId, 'cancelled');
      const msg = await synthesize(sessionMeta.entity, sessionMeta.relationshipSignal, 'Understood. I cancelled the active task and kept the progress so far.');
      stopSession(entityId, sessionMeta.sessionId);
      return { handled: true, response: msg, action: 'cancel' };
    }

    if (sessionMeta.stalled) {
      sessionStore.clearStall(sessionMeta.sessionId);
      const ok = resumeWithInput(sessionMeta.sessionId, text);
      sessionMeta.stalled = false;
      sessionMeta.question = null;
      const brief = ok
        ? 'Got it, thanks. I have what I need and I am continuing now.'
        : 'Thanks. I attempted to resume, but the worker was no longer waiting for input.';
      const msg = await synthesize(sessionMeta.entity, sessionMeta.relationshipSignal, brief);
      return { handled: true, response: msg, action: 'resume' };
    }

    sessionStore.appendSteering(sessionMeta.sessionId, text);
    broadcastSSE('task_steering_injected', {
      sessionId: sessionMeta.sessionId,
      entityId,
      instruction: text,
      timestamp: Date.now()
    });
    const msg = await synthesize(sessionMeta.entity, sessionMeta.relationshipSignal, 'Got it. I injected your guidance and adjusted course.');
    return { handled: true, response: msg, action: 'steer' };
  }

  function getActiveSession(entityId) {
    return activeByEntity.get(entityId) || null;
  }

  return {
    startSession,
    stopSession,
    handleMidTaskUserMessage,
    getActiveSession,
    synthesize
  };
}

module.exports = { createTaskFrontman };
