// ── Services · Resource Active State ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../entityPaths.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ── Resource Active State ────────────────────────────────────
// Manages per-entity active-resources.json
// Tracks which todo, task, project, and pulse is currently "active".
// Storage: entities/entity_{id}/active-resources.json

'use strict';

const fs = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');

const VALID_TYPES = new Set(['todo', 'task', 'project', 'pulse']);
// _stateFile()
// WHAT THIS DOES: _stateFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _stateFile(...) where this helper behavior is needed.
function _stateFile(entityId) {
  return path.join(entityPaths.getEntityRoot(entityId), 'active-resources.json');
}
function _writeAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}
// _defaultState()
// WHAT THIS DOES: _defaultState is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _defaultState(...) where this helper behavior is needed.
function _defaultState() {
  return {
    activeTodo: null,
    activeTask: null,
    activeProject: null,
    activePulse: null,
    updatedAt: new Date().toISOString()
  };
}
// _fieldName()
// WHAT THIS DOES: _fieldName is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _fieldName(...) where this helper behavior is needed.
function _fieldName(type) {
  return 'active' + type.charAt(0).toUpperCase() + type.slice(1);
}
function getActiveResources(entityId) {
  const fp = _stateFile(entityId);
  if (!fs.existsSync(fp)) return _defaultState();
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return Object.assign(_defaultState(), data);
  } catch (_) {
    return _defaultState();
  }
}
// setActive()
// WHAT THIS DOES: setActive changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call setActive(...) with the new values you want to persist.
function setActive(entityId, type, id) {
  if (!VALID_TYPES.has(type)) {
    return { ok: false, error: 'type must be one of: todo, task, project, pulse' };
  }
  const state = getActiveResources(entityId);
  state[_fieldName(type)] = id;
  state.updatedAt = new Date().toISOString();
  _writeAtomic(_stateFile(entityId), state);
  return { ok: true, state };
}
// unsetActive()
// WHAT THIS DOES: unsetActive is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call unsetActive(...) where this helper behavior is needed.
function unsetActive(entityId, type) {
  return setActive(entityId, type, null);
}

module.exports = {
  getActiveResources,
  setActive,
  unsetActive,
  VALID_TYPES
};
