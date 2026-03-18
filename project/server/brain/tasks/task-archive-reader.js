'use strict';

const fs = require('fs');
const path = require('path');
const writer = require('./task-archive-writer');

function _readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function getStepHistory(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return [];

  const stepDir = path.join(archiveDir, 'steps');
  if (!fs.existsSync(stepDir)) return [];

  return fs.readdirSync(stepDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => _readJson(path.join(stepDir, f), null))
    .filter(Boolean);
}

function getSources(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return [];

  const sources = _readJson(path.join(archiveDir, 'sources', 'sources.json'), []);
  return Array.isArray(sources) ? sources : [];
}

function getLatestDraft(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return null;

  const draftDir = path.join(archiveDir, 'drafts');
  if (!fs.existsSync(draftDir)) return null;

  const files = fs.readdirSync(draftDir)
    .map((name) => {
      const filePath = path.join(draftDir, name);
      const stat = fs.statSync(filePath);
      return { name, filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!files.length) return null;
  const latest = files[0];
  return {
    path: latest.filePath,
    name: latest.name,
    content: fs.readFileSync(latest.filePath, 'utf8')
  };
}

function getTaskSummary(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return null;

  const brief = _readJson(path.join(archiveDir, 'brief.json'), null);
  if (!brief) return null;

  const steps = getStepHistory(taskArchiveId, opts);
  const sources = getSources(taskArchiveId, opts);

  const draftDir = path.join(archiveDir, 'drafts');
  const drafts = fs.existsSync(draftDir) ? fs.readdirSync(draftDir) : [];

  const finalMd = path.join(archiveDir, 'final', 'output.md');
  const finalJson = path.join(archiveDir, 'final', 'output.json');
  const hasFinal = fs.existsSync(finalMd) || fs.existsSync(finalJson);

  const lastStep = steps.length ? steps[steps.length - 1] : null;

  return {
    taskArchiveId,
    entityId: brief.entityId || null,
    projectId: brief.projectId || null,
    taskId: brief.taskId || null,
    brief: brief.brief || null,
    stepCount: steps.length,
    sourceCount: sources.length,
    draftCount: drafts.length,
    hasFinal,
    createdAt: brief.createdAt || null,
    updatedAt: brief.updatedAt || null,
    lastStep: lastStep ? {
      stepIndex: lastStep.stepIndex,
      description: lastStep.description || null,
      timestamp: lastStep.timestamp || lastStep.writtenAt || null
    } : null
  };
}

module.exports = {
  getTaskSummary,
  getStepHistory,
  getSources,
  getLatestDraft
};
