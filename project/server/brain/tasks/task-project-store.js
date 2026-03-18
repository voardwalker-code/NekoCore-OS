'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const entityPaths = require('../../entityPaths');

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'by',
  'from', 'at', 'is', 'are', 'be', 'this', 'that', 'it', 'as', 'we', 'you', 'our'
]);

function _entityRoot(entityId, opts = {}) {
  const id = entityPaths.normalizeEntityId(entityId);
  if (!id) throw new Error('Invalid entityId for project store');
  if (opts.baseEntitiesDir) {
    return path.join(opts.baseEntitiesDir, 'entities', 'entity_' + id);
  }
  return entityPaths.getEntityRoot(id);
}

function _projectsRoot(entityId, opts = {}) {
  return path.join(_entityRoot(entityId, opts), 'memories', 'projects');
}

function _projectDir(entityId, projectId, opts = {}) {
  return path.join(_projectsRoot(entityId, opts), projectId);
}

function _projectFile(entityId, projectId, opts = {}) {
  return path.join(_projectDir(entityId, projectId, opts), 'project.json');
}

function _writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function _readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function _keywords(text) {
  if (!text || typeof text !== 'string') return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 2)
    .filter((w) => !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 20);
}

function _overlapScore(a, b) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  let hits = 0;
  b.forEach((w) => {
    if (setA.has(w)) hits += 1;
  });
  return hits / Math.max(a.length, b.length);
}

function _newProjectId() {
  if (typeof crypto.randomUUID === 'function') return 'proj_' + crypto.randomUUID();
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

function createProject(entityId, name, opts = {}) {
  const id = opts.projectId || _newProjectId();
  const now = Date.now();
  const project = {
    id,
    entityId: entityPaths.normalizeEntityId(entityId),
    name: name || 'Untitled Project',
    tasks: [],
    keywords: _keywords(name || ''),
    createdAt: now,
    updatedAt: now,
    lastTaskAt: null
  };

  const projectPath = _projectDir(entityId, id, opts);
  fs.mkdirSync(path.join(projectPath, 'tasks'), { recursive: true });
  _writeJsonAtomic(path.join(projectPath, 'project.json'), project);
  return project;
}

function getProject(projectId, opts = {}) {
  if (!projectId) return null;

  if (opts.entityId) {
    return _readJson(_projectFile(opts.entityId, projectId, opts), null);
  }

  // Search all entities when entityId is not supplied.
  const entitiesRoot = opts.baseEntitiesDir
    ? path.join(opts.baseEntitiesDir, 'entities')
    : entityPaths.ENTITIES_DIR;

  if (!fs.existsSync(entitiesRoot)) return null;
  const entities = fs.readdirSync(entitiesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('entity_'));

  for (const e of entities) {
    const projectFile = path.join(entitiesRoot, e.name, 'memories', 'projects', projectId, 'project.json');
    if (fs.existsSync(projectFile)) {
      return _readJson(projectFile, null);
    }
  }

  return null;
}

function listProjects(entityId, opts = {}) {
  const root = _projectsRoot(entityId, opts);
  if (!fs.existsSync(root)) return [];

  const dirs = fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return dirs
    .map((projectId) => _readJson(_projectFile(entityId, projectId, opts), null))
    .filter(Boolean)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

function addTaskToProject(projectId, taskId, opts = {}) {
  const project = getProject(projectId, opts);
  if (!project) return null;

  const entityId = project.entityId;
  const filePath = _projectFile(entityId, projectId, opts);
  const current = _readJson(filePath, project);

  current.tasks = Array.isArray(current.tasks) ? current.tasks : [];
  if (!current.tasks.includes(taskId)) {
    current.tasks.push(taskId);
  }
  current.lastTaskAt = Date.now();
  current.updatedAt = Date.now();

  _writeJsonAtomic(filePath, current);
  return current;
}

function resolveOrCreateProject(entityId, taskType, userMessage, opts = {}) {
  const queryWords = _keywords((taskType || '') + ' ' + (userMessage || ''));
  const existing = listProjects(entityId, opts);

  let best = null;
  let bestScore = 0;
  existing.forEach((p) => {
    const score = _overlapScore(Array.isArray(p.keywords) ? p.keywords : [], queryWords);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  });

  if (best && bestScore >= 0.3) {
    return best;
  }

  const fallbackName = (taskType || 'task') + ' project ' + new Date().toISOString().slice(0, 10);
  const created = createProject(entityId, fallbackName, opts);
  created.keywords = queryWords;
  _writeJsonAtomic(_projectFile(entityId, created.id, opts), created);
  return created;
}

module.exports = {
  createProject,
  getProject,
  listProjects,
  addTaskToProject,
  resolveOrCreateProject
};
