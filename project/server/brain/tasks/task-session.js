// ── Brain · Task Session ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, crypto. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SESSION_FILE = path.join(__dirname, '../../data/task-sessions.json');
// _sessionFile()
// WHAT THIS DOES: _sessionFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _sessionFile(...) where this helper behavior is needed.
function _sessionFile(opts = {}) {
  return opts.dataFile || DEFAULT_SESSION_FILE;
}
function _applyDerivedStatus(session) {
  if (!session || typeof session !== 'object') return session;

  // sharedContext()
  // Purpose: helper wrapper used by this module's main flow.
  // sharedContext()
  // WHAT THIS DOES: sharedContext is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call sharedContext(...) where this helper behavior is needed.
  const sharedContext = (session.sharedContext && typeof session.sharedContext === 'object')
    ? session.sharedContext
    : {};

  if ((session.status === 'active' || session.status === 'stalled') && sharedContext.lastError) {
    session.status = 'error';
  } else if ((session.status === 'active' || session.status === 'stalled') && sharedContext.completedAt) {
    session.status = 'complete';
  }

  return session;
}
// _readSessions()
// WHAT THIS DOES: _readSessions reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call _readSessions(...), then use the returned value in your next step.
function _readSessions(opts = {}) {
  const filePath = _sessionFile(opts);
  if (!fs.existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return {};

    let changed = false;
    Object.keys(parsed).forEach((id) => {
      const session = parsed[id];
      const beforeStatus = session && typeof session === 'object' ? session.status : undefined;
      parsed[id] = _applyDerivedStatus(session);
      if (parsed[id] && parsed[id].status !== beforeStatus) changed = true;
    });

    if (changed) _writeSessions(parsed, opts);
    return parsed;
  } catch (_) {
    return {};
  }
}
// _writeSessions()
// WHAT THIS DOES: _writeSessions changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call _writeSessions(...) with the new values you want to persist.
function _writeSessions(map, opts = {}) {
  const filePath = _sessionFile(opts);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}
// _mergeSharedContext()
// WHAT THIS DOES: _mergeSharedContext is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _mergeSharedContext(...) where this helper behavior is needed.
function _mergeSharedContext(existing, incoming) {
  const base = (existing && typeof existing === 'object') ? existing : {};
  const patch = (incoming && typeof incoming === 'object') ? incoming : {};
  return { ...base, ...patch };
}
// _newId()
// WHAT THIS DOES: _newId is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _newId(...) where this helper behavior is needed.
function _newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'task-session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}
// createSession()
// WHAT THIS DOES: createSession creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createSession(...) before code that depends on this setup.
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
// getSession()
// WHAT THIS DOES: getSession reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getSession(...), then use the returned value in your next step.
function getSession(id, opts = {}) {
  if (!id) return null;
  const sessions = _readSessions(opts);
  return sessions[id] || null;
}
// updateSession()
// WHAT THIS DOES: updateSession changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call updateSession(...) with the new values you want to persist.
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

  _applyDerivedStatus(merged);

  sessions[id] = merged;
  _writeSessions(sessions, opts);
  return merged;
}
// appendStep()
// WHAT THIS DOES: appendStep is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendStep(...) where this helper behavior is needed.
function appendStep(id, step, opts = {}) {
  const sessions = _readSessions(opts);
  const current = sessions[id];
  if (!current) return null;

  // nextStep()
  // Purpose: helper wrapper used by this module's main flow.
  // nextStep()
  // WHAT THIS DOES: nextStep is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call nextStep(...) where this helper behavior is needed.
  const nextStep = (step && typeof step === 'object') ? step : { output: String(step || '') };
  current.steps = Array.isArray(current.steps) ? current.steps : [];
  current.steps.push(nextStep);
  current.updatedAt = Date.now();

  sessions[id] = current;
  _writeSessions(sessions, opts);
  return current;
}
// setStall()
// WHAT THIS DOES: setStall changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call setStall(...) with the new values you want to persist.
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
// clearStall()
// WHAT THIS DOES: clearStall removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call clearStall(...) when you need a safe teardown/reset path.
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
// appendSteering()
// WHAT THIS DOES: appendSteering is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendSteering(...) where this helper behavior is needed.
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
// closeSession()
// WHAT THIS DOES: closeSession removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call closeSession(...) when you need a safe teardown/reset path.
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
// pruneOldSessions()
// WHAT THIS DOES: pruneOldSessions is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call pruneOldSessions(...) where this helper behavior is needed.
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
