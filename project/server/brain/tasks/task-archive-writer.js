'use strict';

const fs = require('fs');
const path = require('path');
const entityPaths = require('../../entityPaths');
const projectStore = require('./task-project-store');

function parseTaskArchiveId(taskArchiveId) {
  if (!taskArchiveId || typeof taskArchiveId !== 'string') return null;
  const parts = taskArchiveId.split('|');
  if (parts.length !== 3) return null;
  return {
    entityId: parts[0],
    projectId: parts[1],
    taskId: parts[2]
  };
}

function buildTaskArchiveId(entityId, projectId, taskId) {
  return [entityId, projectId, taskId].join('|');
}

function _entityRoot(entityId, opts = {}) {
  if (opts.baseEntitiesDir) {
    return path.join(opts.baseEntitiesDir, 'entities', 'entity_' + entityPaths.normalizeEntityId(entityId));
  }
  return entityPaths.getEntityRoot(entityId);
}

function _archivePath(entityId, projectId, taskId, opts = {}) {
  return path.join(_entityRoot(entityId, opts), 'memories', 'projects', projectId, 'tasks', taskId);
}

function resolveTaskArchivePath(taskArchiveId, opts = {}) {
  const parsed = parseTaskArchiveId(taskArchiveId);
  if (!parsed) return null;
  return _archivePath(parsed.entityId, parsed.projectId, parsed.taskId, opts);
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

function createTaskArchive(projectId, taskId, brief, opts = {}) {
  let entityId = opts.entityId || null;
  if (!entityId) {
    const project = projectStore.getProject(projectId, opts);
    if (!project || !project.entityId) {
      throw new Error('createTaskArchive: unable to resolve entityId from project');
    }
    entityId = project.entityId;
  }

  const archiveDir = _archivePath(entityId, projectId, taskId, opts);
  fs.mkdirSync(path.join(archiveDir, 'steps'), { recursive: true });
  fs.mkdirSync(path.join(archiveDir, 'sources'), { recursive: true });
  fs.mkdirSync(path.join(archiveDir, 'drafts'), { recursive: true });
  fs.mkdirSync(path.join(archiveDir, 'final'), { recursive: true });

  const now = Date.now();
  const taskArchiveId = buildTaskArchiveId(entityId, projectId, taskId);

  _writeJsonAtomic(path.join(archiveDir, 'brief.json'), {
    taskArchiveId,
    entityId,
    projectId,
    taskId,
    brief: brief || null,
    createdAt: now,
    updatedAt: now
  });

  _writeJsonAtomic(path.join(archiveDir, 'sources', 'sources.json'), []);

  return taskArchiveId;
}

function appendStep(taskArchiveId, stepData, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return false;

  const stepDir = path.join(archiveDir, 'steps');
  fs.mkdirSync(stepDir, { recursive: true });

  const stepIndexRaw = Number(stepData && stepData.stepIndex);
  let stepIndex = Number.isFinite(stepIndexRaw) ? stepIndexRaw + 1 : NaN;
  if (!Number.isFinite(stepIndex)) {
    const existing = fs.readdirSync(stepDir).filter((f) => /^step-\d+\.json$/.test(f));
    stepIndex = existing.length + 1;
  }

  let fileName = 'step-' + String(stepIndex).padStart(4, '0') + '.json';
  let filePath = path.join(stepDir, fileName);
  if (fs.existsSync(filePath)) {
    fileName = 'step-' + String(stepIndex).padStart(4, '0') + '-' + Date.now() + '.json';
    filePath = path.join(stepDir, fileName);
  }

  const payload = {
    ...stepData,
    writtenAt: Date.now()
  };

  _writeJsonAtomic(filePath, payload);

  const briefPath = path.join(archiveDir, 'brief.json');
  const brief = _readJson(briefPath, {});
  brief.updatedAt = Date.now();
  _writeJsonAtomic(briefPath, brief);

  return true;
}

function appendSource(taskArchiveId, source, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return false;

  const sourcesPath = path.join(archiveDir, 'sources', 'sources.json');
  const current = _readJson(sourcesPath, []);
  const next = Array.isArray(current) ? current : [];

  const entry = (source && typeof source === 'object') ? source : { value: source };
  const identity = String(entry.url || entry.id || entry.title || JSON.stringify(entry));

  const already = next.some((s) => {
    const sId = String((s && (s.url || s.id || s.title)) || JSON.stringify(s));
    return sId === identity;
  });

  if (!already) {
    next.push({ ...entry, addedAt: Date.now() });
    _writeJsonAtomic(sourcesPath, next);
  }

  return true;
}

function saveDraft(taskArchiveId, draftIndex, content, ext = 'txt', opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return null;

  const safeExt = String(ext || 'txt').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'txt';
  const draftDir = path.join(archiveDir, 'drafts');
  fs.mkdirSync(draftDir, { recursive: true });

  const idx = Number.isFinite(Number(draftIndex)) ? Number(draftIndex) : Date.now();
  const fileName = 'draft-' + idx + '.' + safeExt;
  const filePath = path.join(draftDir, fileName);
  fs.writeFileSync(filePath, String(content || ''), 'utf8');
  return filePath;
}

function finalize(taskArchiveId, finalOutput, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return false;

  const finalDir = path.join(archiveDir, 'final');
  fs.mkdirSync(finalDir, { recursive: true });

  if (typeof finalOutput === 'string') {
    fs.writeFileSync(path.join(finalDir, 'output.md'), finalOutput, 'utf8');
  } else {
    _writeJsonAtomic(path.join(finalDir, 'output.json'), finalOutput || {});
  }

  const briefPath = path.join(archiveDir, 'brief.json');
  const brief = _readJson(briefPath, {});
  brief.updatedAt = Date.now();
  brief.finalizedAt = Date.now();
  _writeJsonAtomic(briefPath, brief);

  return true;
}

module.exports = {
  parseTaskArchiveId,
  buildTaskArchiveId,
  resolveTaskArchivePath,
  createTaskArchive,
  appendStep,
  appendSource,
  saveDraft,
  finalize
};
