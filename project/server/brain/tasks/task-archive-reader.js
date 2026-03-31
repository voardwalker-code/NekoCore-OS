// ── Brain · Task Archive Reader ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path,
// ./task-archive-writer. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');
const writer = require('./task-archive-writer');
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
// getStepHistory()
// WHAT THIS DOES: getStepHistory reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getStepHistory(...), then use the returned value in your next step.
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
// getSources()
// WHAT THIS DOES: getSources reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getSources(...), then use the returned value in your next step.
function getSources(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir || !fs.existsSync(archiveDir)) return [];

  const sources = _readJson(path.join(archiveDir, 'sources', 'sources.json'), []);
  return Array.isArray(sources) ? sources : [];
}
// getLatestDraft()
// WHAT THIS DOES: getLatestDraft reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getLatestDraft(...), then use the returned value in your next step.
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
// getTaskSummary()
// WHAT THIS DOES: getTaskSummary reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getTaskSummary(...), then use the returned value in your next step.
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

// ── Planning archive reader methods ──

// getPlanningRounds()
// WHAT THIS DOES: getPlanningRounds reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getPlanningRounds(...), then use the returned value in your next step.
function getPlanningRounds(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir) return [];

  const planningDir = path.join(archiveDir, 'planning');
  if (!fs.existsSync(planningDir)) return [];

  const roundDirs = fs.readdirSync(planningDir)
    .filter(d => d.startsWith('round-') && fs.statSync(path.join(planningDir, d)).isDirectory())
    .sort();

  return roundDirs.map(dir => {
    const roundPath = path.join(planningDir, dir);
    const match = dir.match(/round-(\d+)/);
    const roundIndex = match ? parseInt(match[1], 10) : 0;

    const responses = fs.readdirSync(roundPath)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(f => _readJson(path.join(roundPath, f), null))
      .filter(Boolean);

    return { roundIndex, responses };
  });
}
// getPlanningArtifacts()
// WHAT THIS DOES: getPlanningArtifacts reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getPlanningArtifacts(...), then use the returned value in your next step.
function getPlanningArtifacts(taskArchiveId, opts = {}) {
  const archiveDir = writer.resolveTaskArchivePath(taskArchiveId, opts);
  if (!archiveDir) return null;

  const planningDir = path.join(archiveDir, 'planning');
  if (!fs.existsSync(planningDir)) return null;

  const planPath = path.join(planningDir, 'final-plan.md');
  const rationalePath = path.join(planningDir, 'decision-rationale.md');
  const issuesPath = path.join(planningDir, 'issues-flagged.json');

  if (!fs.existsSync(planPath)) return null;

  return {
    finalPlan: fs.readFileSync(planPath, 'utf8'),
    decisionRationale: fs.existsSync(rationalePath) ? fs.readFileSync(rationalePath, 'utf8') : '',
    issuesFlagged: _readJson(issuesPath, [])
  };
}

module.exports = {
  getTaskSummary,
  getStepHistory,
  getSources,
  getLatestDraft,
  getPlanningRounds,
  getPlanningArtifacts
};
