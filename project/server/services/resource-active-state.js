// ── Resource Active State ────────────────────────────────────
// Manages per-entity active-resources.json
// Tracks which todo, task, project, and pulse is currently "active".
// Storage: entities/entity_{id}/active-resources.json

'use strict';

const fs = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');

const VALID_TYPES = new Set(['todo', 'task', 'project', 'pulse']);

function _stateFile(entityId) {
  return path.join(entityPaths.getEntityRoot(entityId), 'active-resources.json');
}

function _writeAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function _defaultState() {
  return {
    activeTodo: null,
    activeTask: null,
    activeProject: null,
    activePulse: null,
    updatedAt: new Date().toISOString()
  };
}

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

function unsetActive(entityId, type) {
  return setActive(entityId, type, null);
}

module.exports = {
  getActiveResources,
  setActive,
  unsetActive,
  VALID_TYPES
};
