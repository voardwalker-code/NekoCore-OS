// ── Todo Store ───────────────────────────────────────────────
// CRUD for per-entity todos.
// Storage: entities/entity_{id}/memories/todos/todos.json
// Each todo: { id, title, description, priority, status, tags, createdAt, updatedAt }

'use strict';

const fs = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');

function _todosDir(entityId) {
  const memRoot = entityPaths.getMemoryRoot(entityId);
  return path.join(memRoot, 'todos');
}

function _todosFile(entityId) {
  return path.join(_todosDir(entityId), 'todos.json');
}

function _writeAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

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

function _generateId() {
  return 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

const VALID_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
const VALID_STATUSES = new Set(['active', 'paused', 'done', 'cancelled']);

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

function listTodos(entityId) {
  return _readTodos(entityId);
}

function getTodo(entityId, todoId) {
  const todos = _readTodos(entityId);
  return todos.find(t => t.id === todoId) || null;
}

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
