'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SESSION_FILE = path.join(__dirname, '../../data/task-sessions.json');

function _sessionFile(opts = {}) {
  return opts.dataFile || DEFAULT_SESSION_FILE;
}

function _readSessions(opts = {}) {
  const filePath = _sessionFile(opts);
  if (!fs.existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function _writeSessions(map, opts = {}) {
  const filePath = _sessionFile(opts);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function _mergeSharedContext(existing, incoming) {
  const base = (existing && typeof existing === 'object') ? existing : {};
  const patch = (incoming && typeof incoming === 'object') ? incoming : {};
  return { ...base, ...patch };
}

function _newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'task-session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

function createSession(input = {}, opts = {}) {
  const sessions = _readSessions(opts);
  const now = Date.now();
  const id = input.id || _newId();

  const session = {
    id,
    entityId: input.entityId || null,
    taskType: input.taskType || null,
    projectId: input.projectId || null,
    taskArchiveId: input.taskArchiveId || null,
    createdAt: now,
    updatedAt: now,
    steps: Array.isArray(input.steps) ? input.steps.slice() : [],
    sharedContext: (input.sharedContext && typeof input.sharedContext === 'object') ? input.sharedContext : {},
    stall: {
      active: false,
      question: null,
      awaitingSince: null
    },
    steering: [],
    status: input.status || 'active'
  };

  sessions[id] = session;
  _writeSessions(sessions, opts);
  return session;
}

function getSession(id, opts = {}) {
  if (!id) return null;
  const sessions = _readSessions(opts);
  return sessions[id] || null;
}

function updateSession(id, patch = {}, opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  const merged = {
    ...current,
    ...patch,
    sharedContext: _mergeSharedContext(current.sharedContext, patch.sharedContext),
    updatedAt: Date.now()
  };

  sessions[id] = merged;
  _writeSessions(sessions, opts);
  return merged;
}

function appendStep(id, step, opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  const nextStep = (step && typeof step === 'object') ? step : { output: String(step || '') };
  current.steps = Array.isArray(current.steps) ? current.steps : [];
  current.steps.push(nextStep);
  current.updatedAt = Date.now();

  sessions[id] = current;
  _writeSessions(sessions, opts);
  return current;
}

function setStall(id, question, opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  current.stall = {
    active: true,
    question: question || null,
    awaitingSince: Date.now()
  };
  current.status = 'stalled';
  current.updatedAt = Date.now();

  sessions[id] = current;
  _writeSessions(sessions, opts);
  return current;
}

function clearStall(id, opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  current.stall = {
    active: false,
    question: null,
    awaitingSince: null
  };
  if (current.status === 'stalled') {
    current.status = 'active';
  }
  current.updatedAt = Date.now();

  sessions[id] = current;
  _writeSessions(sessions, opts);
  return current;
}

function appendSteering(id, instruction, opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  current.steering = Array.isArray(current.steering) ? current.steering : [];
  current.steering.push({
    instruction,
    timestamp: Date.now()
  });
  current.updatedAt = Date.now();

  sessions[id] = current;
  _writeSessions(sessions, opts);
  return current;
}

function closeSession(id, status = 'complete', opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  current.status = status;
  current.updatedAt = Date.now();
  sessions[id] = current;
  _writeSessions(sessions, opts);
  return current;
}

function pruneOldSessions(maxAgeDays, opts = {}) {
  const sessions = _readSessions(opts);
  const maxAgeMs = Math.max(0, Number(maxAgeDays || 0)) * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - maxAgeMs;

  let pruned = 0;
  Object.keys(sessions).forEach((id) => {
    const s = sessions[id];
    if (!s) return;
    if (s.status === 'active' || s.status === 'stalled') return;
    const updated = Number(s.updatedAt || s.createdAt || 0);
    if (updated > 0 && updated < cutoff) {
      delete sessions[id];
      pruned += 1;
    }
  });

  _writeSessions(sessions, opts);
  return { pruned, remaining: Object.keys(sessions).length };
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  appendStep,
  setStall,
  clearStall,
  appendSteering,
  closeSession,
  pruneOldSessions
};
