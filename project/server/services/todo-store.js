// ── Services · Todo Store ────────────────────────────────────────────────────
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

// ── Todo Store ───────────────────────────────────────────────
// CRUD for per-entity todos.
// Storage: entities/entity_{id}/memories/todos/todos.json
// Each todo: { id, title, description, priority, status, tags, createdAt, updatedAt }

'use strict';

const fs = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');
// _todosDir()
// WHAT THIS DOES: _todosDir is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _todosDir(...) where this helper behavior is needed.
function _todosDir(entityId) {
  const memRoot = entityPaths.getMemoryRoot(entityId);
  return path.join(memRoot, 'todos');
}
// _todosFile()
// WHAT THIS DOES: _todosFile is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _todosFile(...) where this helper behavior is needed.
function _todosFile(entityId) {
  return path.join(_todosDir(entityId), 'todos.json');
}
function _writeAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}
// _readTodos()
// WHAT THIS DOES: _readTodos reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call _readTodos(...), then use the returned value in your next step.
function _readTodos(entityId) {
  const fp = _todosFile(entityId);
  if (!fs.existsSync(fp)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}
// _generateId()
// WHAT THIS DOES: _generateId is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _generateId(...) where this helper behavior is needed.
function _generateId() {
  return 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

const VALID_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
const VALID_STATUSES = new Set(['active', 'paused', 'done', 'cancelled']);
// _validateFields()
// WHAT THIS DOES: _validateFields answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call _validateFields(...) and branch logic based on true/false.
function _validateFields(data) {
  const errors = [];
  if (data.priority !== undefined && !VALID_PRIORITIES.has(data.priority)) {
    errors.push('priority must be one of: critical, high, medium, low');
  }
  if (data.status !== undefined && !VALID_STATUSES.has(data.status)) {
    errors.push('status must be one of: active, paused, done, cancelled');
  }
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    errors.push('tags must be an array');
  }
  return errors;
}
// listTodos()
// WHAT THIS DOES: listTodos is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call listTodos(...) where this helper behavior is needed.
function listTodos(entityId) {
  return _readTodos(entityId);
}
function getTodo(entityId, todoId) {
  const todos = _readTodos(entityId);
  return todos.find(t => t.id === todoId) || null;
}
// createTodo()
// WHAT THIS DOES: createTodo creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createTodo(...) before code that depends on this setup.
function createTodo(entityId, data) {
  const title = String(data.title || '').trim();
  if (!title) return { ok: false, error: 'title is required' };

  const errors = _validateFields(data);
  if (errors.length) return { ok: false, error: errors.join('; ') };

  const now = new Date().toISOString();
  const todo = {
    id: _generateId(),
    title,
    description: String(data.description || '').trim(),
    priority: data.priority || 'medium',
    status: data.status || 'active',
    tags: Array.isArray(data.tags) ? data.tags.map(t => String(t).trim()).filter(Boolean) : [],
    createdAt: now,
    updatedAt: now
  };

  const todos = _readTodos(entityId);
  todos.push(todo);
  _writeAtomic(_todosFile(entityId), todos);
  return { ok: true, todo };
}
// updateTodo()
// WHAT THIS DOES: updateTodo changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call updateTodo(...) with the new values you want to persist.
function updateTodo(entityId, todoId, data) {
  const errors = _validateFields(data);
  if (errors.length) return { ok: false, error: errors.join('; ') };

  const todos = _readTodos(entityId);
  const idx = todos.findIndex(t => t.id === todoId);
  if (idx === -1) return { ok: false, error: 'Todo not found' };

  const existing = todos[idx];
  if (data.title !== undefined) existing.title = String(data.title).trim();
  if (data.description !== undefined) existing.description = String(data.description).trim();
  if (data.priority !== undefined) existing.priority = data.priority;
  if (data.status !== undefined) existing.status = data.status;
  if (data.tags !== undefined) existing.tags = data.tags.map(t => String(t).trim()).filter(Boolean);
  existing.updatedAt = new Date().toISOString();

  todos[idx] = existing;
  _writeAtomic(_todosFile(entityId), todos);
  return { ok: true, todo: existing };
}
// deleteTodo()
// WHAT THIS DOES: deleteTodo removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call deleteTodo(...) when you need a safe teardown/reset path.
function deleteTodo(entityId, todoId) {
  const todos = _readTodos(entityId);
  const idx = todos.findIndex(t => t.id === todoId);
  if (idx === -1) return { ok: false, error: 'Todo not found' };

  todos.splice(idx, 1);
  _writeAtomic(_todosFile(entityId), todos);
  return { ok: true };
}

module.exports = {
  listTodos,
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo
};
