// ── MA Pulse Engine ──────────────────────────────────────────────────────────
// Timer-driven recurring tasks: health scans, chores file, custom pulses.
// Each pulse is an interval timer that calls a handler function.
// Chores are read from MA-Config/chores.json and delegated to agents.
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ───────────────────────────────────────────────────────────────────
const MA_ROOT    = path.join(__dirname, '..');
const LOG_DIR    = path.join(MA_ROOT, 'MA-logs');
const CHORE_PATH = path.join(MA_ROOT, 'MA-Config', 'chores.json');
const PULSE_CFG  = path.join(MA_ROOT, 'MA-Config', 'pulse-config.json');

// ── State ───────────────────────────────────────────────────────────────────
const _timers = new Map();   // id → { intervalId, config }
let _deps = null;            // { core, callLLM, agentCatalog, health, execTools }

// ── Bootstrap ───────────────────────────────────────────────────────────────

function init(deps) {
  _deps = deps;
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  _ensureChoresFile();
  _ensurePulseConfig();
}

function _ensureChoresFile() {
  const dir = path.dirname(CHORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CHORE_PATH)) {
    fs.writeFileSync(CHORE_PATH, JSON.stringify({ chores: [] }, null, 2));
  }
}

function _ensurePulseConfig() {
  if (!fs.existsSync(PULSE_CFG)) {
    fs.writeFileSync(PULSE_CFG, JSON.stringify({
      healthScan: { enabled: true, intervalMs: 3600000 },
      choreCheck: { enabled: true, intervalMs: 1800000 }
    }, null, 2));
  }
}

// ── Logging ─────────────────────────────────────────────────────────────────

function _log(logFile, entry) {
  const fp = path.join(LOG_DIR, logFile);
  const ts = new Date().toISOString();
  const line = `[${ts}] ${typeof entry === 'string' ? entry : JSON.stringify(entry)}\n`;
  fs.appendFileSync(fp, line);
}

function readLog(logFile, lines = 50) {
  const fp = path.join(LOG_DIR, logFile);
  if (!fs.existsSync(fp)) return [];
  const all = fs.readFileSync(fp, 'utf8').trim().split('\n').filter(Boolean);
  return all.slice(-lines);
}

// ── Health Pulse ────────────────────────────────────────────────────────────

function _runHealthPulse() {
  if (!_deps || !_deps.health) return;
  try {
    const result = _deps.health.scan();
    const summary = result.summary || {};
    const entry = {
      type: 'health_scan',
      total: summary.total || 0,
      critical: summary.critical || 0,
      warnings: summary.warnings || 0,
      issues: (result.issues || [])
        .filter(i => i.severity === 'critical' || i.severity === 'warning')
        .map(i => ({ file: i.file, severity: i.severity, message: i.message }))
    };
    _log('pulse-health.log', entry);
  } catch (e) {
    _log('pulse-health.log', { type: 'error', message: e.message });
  }
}

// ── Chores System ───────────────────────────────────────────────────────────

function getChores() {
  _ensureChoresFile();
  try {
    return JSON.parse(fs.readFileSync(CHORE_PATH, 'utf8'));
  } catch { return { chores: [] }; }
}

function saveChores(data) {
  _ensureChoresFile();
  fs.writeFileSync(CHORE_PATH, JSON.stringify(data, null, 2));
}

function addChore(chore) {
  if (!chore.name) throw new Error('Chore must have a name');
  const data = getChores();
  const id = 'chore_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  const entry = {
    id,
    name: chore.name,
    description: chore.description || '',
    assignTo: chore.assignTo || null,       // agent id or null (MA picks)
    intervalMs: chore.intervalMs || 3600000, // default 1 hour
    lastRun: null,
    lastResult: null,
    lastGrade: null,
    runCount: 0,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  data.chores.push(entry);
  saveChores(data);
  return entry;
}

function updateChore(id, updates) {
  const data = getChores();
  const idx = data.chores.findIndex(c => c.id === id);
  if (idx < 0) throw new Error('Chore not found: ' + id);
  const safe = { ...updates };
  delete safe.id;
  delete safe.createdAt;
  data.chores[idx] = { ...data.chores[idx], ...safe };
  saveChores(data);
  return data.chores[idx];
}

function removeChore(id) {
  const data = getChores();
  const idx = data.chores.findIndex(c => c.id === id);
  if (idx < 0) throw new Error('Chore not found: ' + id);
  const removed = data.chores.splice(idx, 1)[0];
  saveChores(data);
  return removed;
}

// ── Chore Execution ─────────────────────────────────────────────────────────

async function _executeChore(chore) {
  if (!_deps || !_deps.callLLM || !_deps.core) return;

  const config = _deps.core.getConfig();
  if (!config) { _log('pulse-chores.log', { choreId: chore.id, error: 'No LLM configured' }); return; }

  // Determine which agent handles it
  let agentName = 'MA';
  let agentId = null;
  if (chore.assignTo && _deps.agentCatalog) {
    const agent = _deps.agentCatalog.getAgent(chore.assignTo);
    if (agent) { agentName = agent.name; agentId = agent.id; }
  }

  try {
    // Execute via task runner
    const result = await _deps.core.handleChat({
      message: `[CHORE] ${chore.name}: ${chore.description || chore.name}`,
      history: []
    });

    const reply = result.reply || '(no output)';

    // Grade the chore result via LLM
    let grade = null;
    try {
      const gradeResp = await _deps.callLLM(config, [
        { role: 'system', content: 'You are a task evaluator. Grade the following chore result on a scale of A (excellent), B (good), C (adequate), D (poor), F (failed). Reply with ONLY the letter grade followed by a one-sentence explanation.' },
        { role: 'user', content: `Chore: ${chore.name}\nDescription: ${chore.description || 'none'}\nAgent: ${agentName}\nResult: ${reply.slice(0, 2000)}` }
      ], { temperature: 0.3, maxTokens: 100 });
      grade = gradeResp.trim();
    } catch { grade = 'N/A — grading failed'; }

    // Update chore record
    const data = getChores();
    const idx = data.chores.findIndex(c => c.id === chore.id);
    if (idx >= 0) {
      data.chores[idx].lastRun = new Date().toISOString();
      data.chores[idx].lastResult = reply.slice(0, 500);
      data.chores[idx].lastGrade = grade;
      data.chores[idx].runCount = (data.chores[idx].runCount || 0) + 1;
      saveChores(data);
    }

    // Log
    const logEntry = {
      choreId: chore.id,
      choreName: chore.name,
      agent: agentName,
      agentId,
      grade,
      resultPreview: reply.slice(0, 300),
      timestamp: new Date().toISOString()
    };
    _log('pulse-chores.log', logEntry);

    // Record in agent prompt history
    if (agentId && _deps.agentCatalog) {
      _deps.agentCatalog.recordPrompt(agentId, {
        task: `Chore: ${chore.name}`,
        prompt: chore.description || chore.name,
        result: reply.slice(0, 500),
        success: !grade.startsWith('F'),
        tags: ['chore', chore.id]
      });
    }

    // Feed grade back into model router performance tracking
    if (result.routedModel) {
      try {
        const modelRouter = require('./MA-model-router');
        const letterGrade = (grade || 'C').charAt(0).toUpperCase();
        modelRouter.recordPerformance(result.routedModel, 'chore', 'general', letterGrade);
      } catch { /* router not available */ }
    }
  } catch (e) {
    _log('pulse-chores.log', { choreId: chore.id, error: e.message });
  }
}

async function _runChoreCheck() {
  const data = getChores();
  const now = Date.now();

  for (const chore of data.chores) {
    if (!chore.enabled) continue;
    const lastRun = chore.lastRun ? new Date(chore.lastRun).getTime() : 0;
    const interval = chore.intervalMs || 3600000;
    if (now - lastRun >= interval) {
      await _executeChore(chore);
    }
  }
}

// ── Pulse Manager ───────────────────────────────────────────────────────────

function getPulseConfig() {
  _ensurePulseConfig();
  try { return JSON.parse(fs.readFileSync(PULSE_CFG, 'utf8')); }
  catch { return { healthScan: { enabled: true, intervalMs: 3600000 }, choreCheck: { enabled: true, intervalMs: 1800000 } }; }
}

function savePulseConfig(cfg) {
  fs.writeFileSync(PULSE_CFG, JSON.stringify(cfg, null, 2));
}

function startPulse(id, handler, intervalMs) {
  stopPulse(id);
  const intervalId = setInterval(handler, intervalMs);
  _timers.set(id, { intervalId, intervalMs, handler, startedAt: new Date().toISOString() });
  // Run immediately on first start
  try { handler(); } catch { /* logged inside handlers */ }
}

function stopPulse(id) {
  if (_timers.has(id)) {
    clearInterval(_timers.get(id).intervalId);
    _timers.delete(id);
  }
}

function getPulseStatus() {
  const status = {};
  for (const [id, t] of _timers) {
    status[id] = { running: true, intervalMs: t.intervalMs, startedAt: t.startedAt };
  }
  return status;
}

/** Start all configured pulses. Call after init(). */
function startAll() {
  const cfg = getPulseConfig();
  if (cfg.healthScan?.enabled) {
    startPulse('health', _runHealthPulse, cfg.healthScan.intervalMs || 3600000);
  }
  if (cfg.choreCheck?.enabled) {
    startPulse('chores', () => _runChoreCheck().catch(e => _log('pulse-chores.log', { error: e.message })), cfg.choreCheck.intervalMs || 1800000);
  }
}

function stopAll() {
  for (const id of _timers.keys()) stopPulse(id);
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  init, startAll, stopAll,
  // Pulse control
  startPulse, stopPulse, getPulseStatus,
  getPulseConfig, savePulseConfig,
  // Chores
  getChores, addChore, updateChore, removeChore,
  // Logs
  readLog, LOG_DIR,
  // Paths
  CHORE_PATH, PULSE_CFG
};
