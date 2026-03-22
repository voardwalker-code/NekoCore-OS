// ── MA Worklog ──────────────────────────────────────────────────────────────
// Persistent worklog for session continuity.
// Stored at MA-workspace/MA-WORKLOG.md — auto-updated after tasks.
'use strict';

const fs   = require('fs');
const path = require('path');

const WORKSPACE_DIR = path.join(__dirname, '..', 'MA-workspace');
const WORKLOG_PATH  = path.join(WORKSPACE_DIR, 'MA-WORKLOG.md');

function _ensureDir() {
  if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

/** Read the current worklog. Returns raw markdown string or null. */
function read() {
  if (!fs.existsSync(WORKLOG_PATH)) return null;
  return fs.readFileSync(WORKLOG_PATH, 'utf8');
}

/** Get structured worklog data. */
function getState() {
  const raw = read();
  if (!raw) return { activeProject: null, currentTask: null, taskPlan: [], recentWork: [], resumePoint: null };

  const state = { activeProject: null, activeProjectStatus: null, currentTask: null, taskPlan: [], recentWork: [], resumePoint: null };

  const projMatch = raw.match(/## Active Project\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  if (projMatch) {
    for (const line of projMatch[1].trim().split('\n')) {
      const kv = line.match(/^- (.+?):\s*(.+)$/);
      if (kv) {
        const key = kv[1].toLowerCase();
        if (key === 'project') state.activeProject = kv[2].trim();
        if (key === 'status') state.activeProjectStatus = kv[2].trim();
      }
    }
  }

  const taskMatch = raw.match(/## Current Task\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  if (taskMatch) {
    const content = taskMatch[1].trim();
    if (content && content !== 'None') state.currentTask = content;
  }

  const planMatch = raw.match(/## Task Plan\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  if (planMatch) {
    for (const line of planMatch[1].trim().split('\n')) {
      const m = line.match(/^- \[([ x])\]\s*(.+)$/);
      if (m) state.taskPlan.push({ done: m[1] === 'x', description: m[2].trim() });
    }
  }

  const resumeMatch = raw.match(/## Resume Point\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  if (resumeMatch) state.resumePoint = resumeMatch[1].trim() || null;

  const workMatch = raw.match(/## Recent Work\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  if (workMatch) {
    for (const line of workMatch[1].trim().split('\n')) {
      if (!line.startsWith('|') || line.includes('---')) continue;
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 4 && cells[0] !== 'Date') {
        state.recentWork.push({ date: cells[0], task: cells[1], files: cells[2], status: cells[3] });
      }
    }
  }

  return state;
}

/** Write complete worklog state. */
function write(state) {
  _ensureDir();
  const lines = [
    '# MA Worklog', '',
    '## Active Project',
    state.activeProject ? `- Project: ${state.activeProject}` : '- Project: None',
  ];
  if (state.activeProjectStatus) lines.push(`- Status: ${state.activeProjectStatus}`);
  if (state.lastActivity) lines.push(`- Last activity: ${state.lastActivity}`);
  lines.push('', '## Current Task', state.currentTask || 'None');
  lines.push('', '## Task Plan');
  if (state.taskPlan && state.taskPlan.length) {
    for (const step of state.taskPlan) lines.push(`- [${step.done ? 'x' : ' '}] ${step.description}`);
  } else {
    lines.push('No active plan.');
  }
  lines.push('', '## Recent Work', '| Date | Task | Files | Status |', '|------|------|-------|--------|');
  for (const w of (state.recentWork || []).slice(-20)) {
    lines.push(`| ${w.date} | ${w.task} | ${w.files} | ${w.status} |`);
  }
  lines.push('', '## Resume Point', state.resumePoint || 'No pending work.', '');
  fs.writeFileSync(WORKLOG_PATH, lines.join('\n'));
}

/** Record task completion. */
function recordTask(taskType, description, filesOrSteps, status, projectId) {
  const state = getState();
  const date = new Date().toISOString().slice(0, 10);
  state.recentWork.push({
    date,
    task: `${taskType}: ${description.slice(0, 60)}`,
    files: typeof filesOrSteps === 'number' ? `${filesOrSteps} steps` : (filesOrSteps || '0'),
    status: status || 'complete'
  });
  if (projectId) {
    state.activeProject = projectId;
    state.activeProjectStatus = 'in-progress';
  }
  state.lastActivity = new Date().toISOString();
  state.currentTask = null;
  state.taskPlan = [];
  state.resumePoint = `Last completed: ${taskType} — ${description.slice(0, 80)}`;
  write(state);
}

/** Set the active task and plan. */
function setActiveTask(task, plan, projectId) {
  const state = getState();
  state.currentTask = task;
  state.taskPlan = (plan || []).map(s => typeof s === 'string' ? { done: false, description: s } : s);
  if (projectId) {
    state.activeProject = projectId;
    state.activeProjectStatus = 'in-progress';
  }
  state.lastActivity = new Date().toISOString();
  write(state);
}

/** Mark a step done by index. */
function markStepDone(stepIndex) {
  const state = getState();
  if (state.taskPlan && state.taskPlan[stepIndex]) {
    state.taskPlan[stepIndex].done = true;
    write(state);
  }
}

/** Get summary for system prompt injection. */
function getSummaryForPrompt() {
  const state = getState();
  const parts = [];
  if (state.activeProject) parts.push(`Active project: ${state.activeProject}${state.activeProjectStatus ? ' (' + state.activeProjectStatus + ')' : ''}`);
  if (state.currentTask) parts.push(`Current task: ${state.currentTask}`);
  if (state.taskPlan && state.taskPlan.length) {
    const done = state.taskPlan.filter(s => s.done).length;
    parts.push(`Plan progress: ${done}/${state.taskPlan.length} steps`);
    const next = state.taskPlan.find(s => !s.done);
    if (next) parts.push(`Next step: ${next.description}`);
  }
  if (state.resumePoint) parts.push(`Resume: ${state.resumePoint}`);
  if (state.recentWork && state.recentWork.length) {
    const last3 = state.recentWork.slice(-3);
    parts.push('Recent: ' + last3.map(w => `${w.task} (${w.status})`).join('; '));
  }
  return parts.length ? parts.join('\n') : null;
}

module.exports = { read, getState, write, recordTask, setActiveTask, markStepDone, getSummaryForPrompt, WORKLOG_PATH };
