// ── Brain · Task Archive Writer ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../../entityPaths,
// ./task-project-store, ../../contracts/planning-session-contract. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');
const entityPaths = require('../../entityPaths');
const projectStore = require('./task-project-store');
// parseTaskArchiveId()
// WHAT THIS DOES: parseTaskArchiveId reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into parseTaskArchiveId(...) and use the transformed output.
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
// buildTaskArchiveId()
// WHAT THIS DOES: buildTaskArchiveId creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildTaskArchiveId(...) before code that depends on this setup.
function buildTaskArchiveId(entityId, projectId, taskId) {
  return [entityId, projectId, taskId].join('|');
}
function _entityRoot(entityId, opts = {}) {
  if (opts.baseEntitiesDir) {
    return path.join(opts.baseEntitiesDir, 'entities', 'entity_' + entityPaths.normalizeEntityId(entityId));
  }
  return entityPaths.getEntityRoot(entityId);
}
// _archivePath()
// WHAT THIS DOES: _archivePath is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _archivePath(...) where this helper behavior is needed.
function _archivePath(entityId, projectId, taskId, opts = {}) {
  return path.join(_entityRoot(entityId, opts), 'memories', 'projects', projectId, 'tasks', taskId);
}
function resolveTaskArchivePath(taskArchiveId, opts = {}) {
  const parsed = parseTaskArchiveId(taskArchiveId);
  if (!parsed) return null;
  return _archivePath(parsed.entityId, parsed.projectId, parsed.taskId, opts);
}
// _writeJsonAtomic()
// WHAT THIS DOES: _writeJsonAtomic changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call _writeJsonAtomic(...) with the new values you want to persist.
function _writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}
// _readJson()
// WHAT THIS DOES: _readJson reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call _readJson(...), then use the returned value in your next step.
function _readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}
// createTaskArchive()
// WHAT THIS DOES: createTaskArchive creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createTaskArchive(...) before code that depends on this setup.
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
// appendStep()
// WHAT THIS DOES: appendStep is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendStep(...) where this helper behavior is needed.
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
// appendSource()
// WHAT THIS DOES: appendSource is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendSource(...) where this helper behavior is needed.
function appendSource(taskArchiveId, source, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return false;

  const sourcesPath = path.join(archiveDir, 'sources', 'sources.json');
  const current = _readJson(sourcesPath, []);
  const next = Array.isArray(current) ? current : [];

  // entry()
  // Purpose: helper wrapper used by this module's main flow.
  // entry()
  // WHAT THIS DOES: entry is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call entry(...) where this helper behavior is needed.
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
// saveDraft()
// WHAT THIS DOES: saveDraft changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call saveDraft(...) with the new values you want to persist.
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
// finalize()
// WHAT THIS DOES: finalize is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call finalize(...) where this helper behavior is needed.
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

// ── Planning archive methods ──

const { validatePlanningRound, validatePlanningArtifacts } = require('../../contracts/planning-session-contract');
// createPlanningArchive()
// WHAT THIS DOES: createPlanningArchive creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createPlanningArchive(...) before code that depends on this setup.
function createPlanningArchive(taskArchiveId, sessionMeta, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir) throw new Error('Invalid taskArchiveId for planning archive');

  const planningDir = path.join(archiveDir, 'planning');
  fs.mkdirSync(planningDir, { recursive: true });

  _writeJsonAtomic(path.join(planningDir, 'session.json'), {
    taskArchiveId,
    sessionId: sessionMeta.sessionId || null,
    prompt: sessionMeta.prompt || '',
    roundCount: sessionMeta.roundCount || 0,
    consensus: !!sessionMeta.consensus,
    createdAt: Date.now()
  });

  _writeJsonAtomic(path.join(planningDir, 'participants.json'),
    Array.isArray(sessionMeta.participants) ? sessionMeta.participants : []
  );

  return planningDir;
}
// appendPlanningRound()
// WHAT THIS DOES: appendPlanningRound is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendPlanningRound(...) where this helper behavior is needed.
function appendPlanningRound(taskArchiveId, round, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir) return false;

  const v = validatePlanningRound(round);
  if (!v.ok) throw new Error('Invalid planning round: ' + v.errors.join('; '));

  const roundDir = path.join(archiveDir, 'planning', 'round-' + String(round.roundIndex).padStart(2, '0'));
  fs.mkdirSync(roundDir, { recursive: true });

  for (const resp of round.responses) {
    const safeId = String(resp.entityId).replace(/[^a-z0-9_-]/gi, '_');
    _writeJsonAtomic(path.join(roundDir, safeId + '.json'), {
      entityId: resp.entityId,
      content: resp.content,
      writtenAt: Date.now()
    });
  }

  return true;
}
// writePlanningArtifacts()
// WHAT THIS DOES: writePlanningArtifacts changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call writePlanningArtifacts(...) with the new values you want to persist.
function writePlanningArtifacts(taskArchiveId, artifacts, opts = {}) {
  const archiveDir = resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir) return false;

  const v = validatePlanningArtifacts(artifacts);
  if (!v.ok) throw new Error('Invalid planning artifacts: ' + v.errors.join('; '));

  const planningDir = path.join(archiveDir, 'planning');
  fs.mkdirSync(planningDir, { recursive: true });

  fs.writeFileSync(path.join(planningDir, 'final-plan.md'), artifacts.finalPlan, 'utf8');
  fs.writeFileSync(path.join(planningDir, 'decision-rationale.md'), artifacts.decisionRationale, 'utf8');
  _writeJsonAtomic(path.join(planningDir, 'issues-flagged.json'), artifacts.issuesFlagged);

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
  finalize,
  createPlanningArchive,
  appendPlanningRound,
  writePlanningArtifacts
};
