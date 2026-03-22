// ── MA Model Router ─────────────────────────────────────────────────────────
// Intelligent model selection for agents and tasks.
// Evaluates job requirements, selects from a user-configured roster,
// prefers local models, tracks model performance, and learns from results.
'use strict';

const fs   = require('fs');
const path = require('path');

const MA_ROOT    = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(MA_ROOT, 'MA-Config');
const ROSTER_PATH      = path.join(CONFIG_DIR, 'model-roster.json');
const PERF_PATH        = path.join(CONFIG_DIR, 'model-performance.json');

// ── Dependencies (injected via init) ────────────────────────────────────────
let _deps = null;

function init(deps) {
  _deps = deps;  // { callLLM, webFetch }
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(ROSTER_PATH)) {
    fs.writeFileSync(ROSTER_PATH, JSON.stringify({ models: [] }, null, 2));
  }
  if (!fs.existsSync(PERF_PATH)) {
    fs.writeFileSync(PERF_PATH, JSON.stringify({ records: {} }, null, 2));
  }
}

// ── Model Roster ────────────────────────────────────────────────────────────
// User-managed list of available models with metadata.
//
// Each model entry:
// {
//   id:           "ollama/llama3.1:8b"   (unique key)
//   provider:     "ollama" | "openrouter"
//   model:        "llama3.1:8b"          (actual model name for API calls)
//   endpoint:     "http://localhost:11434"
//   apiKey:       ""                      (blank for Ollama)
//   contextWindow: 131072
//   costPer1kIn:  0                       ($ per 1k input tokens, 0 for local)
//   costPer1kOut: 0                       ($ per 1k output tokens, 0 for local)
//   strengths:    ["python", "creative-writing"]
//   weaknesses:   ["rust", "long-code"]
//   tier:         "local" | "cheap" | "mid" | "premium"
//   enabled:      true
//   notes:        "User notes"
// }

function getRoster() {
  try { return JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8')); }
  catch { return { models: [] }; }
}

function saveRoster(data) {
  fs.writeFileSync(ROSTER_PATH, JSON.stringify(data, null, 2));
}

function addModel(entry) {
  const roster = getRoster();
  if (!entry.id) {
    entry.id = `${entry.provider || 'unknown'}/${entry.model || 'unnamed'}`;
  }
  if (roster.models.find(m => m.id === entry.id)) {
    return { ok: false, error: 'Model already in roster: ' + entry.id };
  }
  const model = {
    id:            entry.id,
    provider:      entry.provider || 'ollama',
    model:         entry.model || '',
    endpoint:      entry.endpoint || '',
    apiKey:        entry.apiKey || '',
    contextWindow: entry.contextWindow || 8192,
    costPer1kIn:   entry.costPer1kIn || 0,
    costPer1kOut:  entry.costPer1kOut || 0,
    strengths:     entry.strengths || [],
    weaknesses:    entry.weaknesses || [],
    tier:          entry.tier || (entry.provider === 'ollama' ? 'local' : 'mid'),
    vision:        entry.vision === true,
    enabled:       entry.enabled !== false,
    notes:         entry.notes || '',
    addedAt:       new Date().toISOString()
  };
  roster.models.push(model);
  saveRoster(roster);
  return { ok: true, model };
}

function updateModel(id, updates) {
  const roster = getRoster();
  const idx = roster.models.findIndex(m => m.id === id);
  if (idx < 0) return { ok: false, error: 'Model not found: ' + id };
  const safe = { ...updates };
  delete safe.id;
  delete safe.addedAt;
  roster.models[idx] = { ...roster.models[idx], ...safe };
  saveRoster(roster);
  return { ok: true, model: roster.models[idx] };
}

function removeModel(id) {
  const roster = getRoster();
  const idx = roster.models.findIndex(m => m.id === id);
  if (idx < 0) return { ok: false, error: 'Model not found: ' + id };
  roster.models.splice(idx, 1);
  saveRoster(roster);
  return { ok: true };
}

function listModels() {
  return getRoster().models.filter(m => m.enabled);
}

// ── Performance Tracking ────────────────────────────────────────────────────
// Records how each model performs on different task types / languages.
//
// Structure: { records: { "modelId": { "taskType:language": { attempts, successes, avgGrade, lastUsed } } } }

function _loadPerf() {
  try { return JSON.parse(fs.readFileSync(PERF_PATH, 'utf8')); }
  catch { return { records: {} }; }
}

function _savePerf(data) {
  fs.writeFileSync(PERF_PATH, JSON.stringify(data, null, 2));
}

/** Grade is A=4, B=3, C=2, D=1, F=0 */
function _gradeToNum(grade) {
  const map = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  return map[(grade || 'C').toUpperCase().charAt(0)] ?? 2;
}

function _numToGrade(num) {
  if (num >= 3.5) return 'A';
  if (num >= 2.5) return 'B';
  if (num >= 1.5) return 'C';
  if (num >= 0.5) return 'D';
  return 'F';
}

/**
 * Record a model's performance on a task.
 * @param {string} modelId   - roster model id
 * @param {string} taskType  - e.g. "code", "research", "writing"
 * @param {string} language  - e.g. "python", "rust", "general"
 * @param {string} grade     - A/B/C/D/F
 */
function recordPerformance(modelId, taskType, language, grade) {
  const perf = _loadPerf();
  if (!perf.records[modelId]) perf.records[modelId] = {};

  const key = `${taskType}:${language || 'general'}`;
  const rec = perf.records[modelId][key] || { attempts: 0, successes: 0, totalGrade: 0, avgGrade: 'C', lastUsed: null };

  rec.attempts += 1;
  const gn = _gradeToNum(grade);
  rec.totalGrade = (rec.totalGrade || 0) + gn;
  if (gn >= 2) rec.successes += 1;  // C or better counts as success
  rec.avgGrade = _numToGrade(rec.totalGrade / rec.attempts);
  rec.lastUsed = new Date().toISOString();

  perf.records[modelId][key] = rec;
  _savePerf(perf);
}

function getPerformance(modelId) {
  const perf = _loadPerf();
  return perf.records[modelId] || {};
}

function getAllPerformance() {
  return _loadPerf().records;
}

// ── Job Evaluation & Model Selection ────────────────────────────────────────

const TIER_PRIORITY = ['local', 'cheap', 'mid', 'premium'];

/** Complexity keywords → rough context need multiplier */
const COMPLEXITY_SIGNALS = {
  simple:  { keywords: ['simple', 'basic', 'hello world', 'quick', 'small', 'trivial', 'short', 'easy'], contextNeed: 0.3 },
  medium:  { keywords: ['module', 'feature', 'endpoint', 'component', 'function', 'class', 'test'], contextNeed: 0.6 },
  complex: { keywords: ['architecture', 'full app', 'scaffold', 'project', 'refactor', 'database', 'multi-file', 'large', 'complex'], contextNeed: 1.0 }
};

const LANGUAGE_KEYWORDS = {
  python:     ['python', 'py', 'pip', 'flask', 'django', 'fastapi', 'pandas', 'numpy'],
  javascript: ['javascript', 'js', 'node', 'npm', 'react', 'express', 'vue', 'svelte', 'next'],
  typescript: ['typescript', 'ts', 'tsx', 'deno'],
  rust:       ['rust', 'cargo', 'rustc', 'tokio', 'axum', 'wasm'],
  go:         ['go', 'golang', 'goroutine'],
  html:       ['html', 'css', 'webpage', 'website', 'frontend', 'tailwind', 'bootstrap'],
  sql:        ['sql', 'database', 'sqlite', 'postgres', 'mysql', 'query'],
  general:    []
};

/**
 * Evaluate a job and return requirements.
 * @param {string} message    - the task description
 * @param {string} taskType   - classified task type (code, research, writing, etc.)
 * @param {string} agentRole  - optional agent role (coder, researcher, etc.)
 * @returns {{ complexity, language, estimatedContextNeed, minContextWindow, preferredTier }}
 */
function evaluateJob(message, taskType, agentRole) {
  const msgLow = (message || '').toLowerCase();

  // Detect complexity
  let complexity = 'medium';
  let maxScore = 0;
  for (const [level, def] of Object.entries(COMPLEXITY_SIGNALS)) {
    const score = def.keywords.filter(k => msgLow.includes(k)).length;
    if (score > maxScore) { maxScore = score; complexity = level; }
  }

  // Detect language
  let language = 'general';
  let langScore = 0;
  for (const [lang, kws] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (lang === 'general') continue;
    const score = kws.filter(k => msgLow.includes(k)).length;
    if (score > langScore) { langScore = score; language = lang; }
  }

  // Estimate context needs
  const contextMult = COMPLEXITY_SIGNALS[complexity]?.contextNeed || 0.6;
  const estimatedContextNeed = Math.round(contextMult * 32768);  // base: 32k for complex
  const minContextWindow = Math.max(4096, estimatedContextNeed);

  // Determine preferred tier based on complexity + task type
  let preferredTier = 'local';
  if (complexity === 'complex' || taskType === 'architect' || taskType === 'project') {
    preferredTier = 'mid';
  }
  if (agentRole === 'senior' || agentRole === 'lead') {
    preferredTier = 'mid';  // senior agents get at least mid-tier
  }

  return { complexity, language, estimatedContextNeed, minContextWindow, preferredTier, taskType: taskType || 'general' };
}

/**
 * Select the best model for a job from the roster.
 * Priority: local first, performance history, strengths/weaknesses, cost.
 *
 * @param {object} jobReqs - output from evaluateJob()
 * @returns {{ model, config, reason } | null}
 */
function selectModel(jobReqs) {
  const available = listModels();
  if (!available.length) return null;

  const perf = _loadPerf();
  const perfKey = `${jobReqs.taskType}:${jobReqs.language}`;

  // Filter models with enough context window
  let candidates = available.filter(m => (m.contextWindow || 8192) >= jobReqs.minContextWindow);
  if (!candidates.length) {
    // Relax: take all models and sort by context window
    candidates = [...available].sort((a, b) => (b.contextWindow || 0) - (a.contextWindow || 0));
  }

  // Score each candidate
  const scored = candidates.map(m => {
    let score = 0;
    const reason = [];

    // 1. Tier preference — local models get a big bonus
    const tierIdx = TIER_PRIORITY.indexOf(m.tier || 'mid');
    const prefIdx = TIER_PRIORITY.indexOf(jobReqs.preferredTier);
    if (m.tier === 'local') {
      score += 30;  // strong local preference
      reason.push('local model (preferred)');
    } else if (tierIdx <= prefIdx) {
      score += 15;
      reason.push('tier matches job');
    } else if (tierIdx > prefIdx) {
      score += 5;   // higher tier than needed — works but costly
      reason.push('higher tier than needed');
    }

    // 2. Performance history
    const modelPerf = perf.records[m.id];
    if (modelPerf && modelPerf[perfKey]) {
      const rec = modelPerf[perfKey];
      const gradeScore = _gradeToNum(rec.avgGrade);
      score += gradeScore * 8;  // up to 32 points for A average
      reason.push(`history: ${rec.avgGrade} avg (${rec.attempts} runs)`);

      // Penalize models that have failed badly (F average)
      if (gradeScore < 1) {
        score -= 40;  // hard penalty — avoid this model for this task
        reason.push('POOR HISTORY — avoiding');
      }
    } else {
      // No history — neutral, slight bonus for trying new combos
      score += 5;
      reason.push('no history (exploring)');
    }

    // 3. Strength/weakness matching
    const strengths = (m.strengths || []).map(s => s.toLowerCase());
    const weaknesses = (m.weaknesses || []).map(s => s.toLowerCase());

    if (strengths.includes(jobReqs.language) || strengths.includes(jobReqs.taskType)) {
      score += 15;
      reason.push('known strength');
    }
    if (weaknesses.includes(jobReqs.language) || weaknesses.includes(jobReqs.taskType)) {
      score -= 20;
      reason.push('known weakness');
    }

    // 4. Context window headroom
    const headroom = ((m.contextWindow || 8192) - jobReqs.minContextWindow) / 1000;
    score += Math.min(10, headroom);  // up to 10 points for spare context

    // 5. Cost efficiency (prefer cheaper when quality is similar)
    const cost = (m.costPer1kIn || 0) + (m.costPer1kOut || 0);
    if (cost === 0) {
      score += 10;  // free model bonus
      reason.push('free');
    } else if (cost < 0.01) {
      score += 5;
      reason.push('low cost');
    }

    return { model: m, score, reason };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;

  return {
    model: best.model,
    config: {
      type:     best.model.provider,
      endpoint: best.model.endpoint,
      apiKey:   best.model.apiKey,
      model:    best.model.model,
      maxTokens: Math.min(best.model.contextWindow || 8192, 131072)
    },
    reason: best.reason.join('; '),
    score: best.score,
    alternatives: scored.slice(1, 4).map(s => ({ id: s.model.id, score: s.score, reason: s.reason.join('; ') }))
  };
}

/**
 * Full pipeline: evaluate job → select model → return config.
 * Falls back to MA's primary config if no roster models match.
 */
function routeModel(message, taskType, agentRole, fallbackConfig) {
  const roster = getRoster();
  if (!roster.models.length) return { config: fallbackConfig, routed: false, reason: 'no models in roster' };

  const jobReqs = evaluateJob(message, taskType, agentRole);
  const selection = selectModel(jobReqs);

  if (!selection) return { config: fallbackConfig, routed: false, reason: 'no suitable model found' };

  return {
    config: selection.config,
    routed: true,
    modelId: selection.model.id,
    reason: selection.reason,
    score: selection.score,
    jobReqs,
    alternatives: selection.alternatives
  };
}

// ── Model Research ──────────────────────────────────────────────────────────

/**
 * Research a model via web to get capabilities, context window, pricing.
 * Returns a summary object (or null if web fetch isn't available).
 */
async function researchModel(modelName) {
  if (!_deps || !_deps.callLLM) return null;

  // Use MA's own LLM to research the model
  try {
    const prompt = `You are a helpful AI model expert. For the model "${modelName}", provide a JSON object with these fields:
- contextWindow: number (context window size in tokens, best estimate)
- costPer1kIn: number (USD per 1000 input tokens, 0 if free/local)
- costPer1kOut: number (USD per 1000 output tokens, 0 if free/local)
- strengths: string[] (what this model is good at, e.g. ["coding", "python", "reasoning"])
- weaknesses: string[] (what this model struggles with, e.g. ["long-code", "math"])
- tier: "local" | "cheap" | "mid" | "premium"
- summary: string (one-sentence description)

Respond with ONLY the JSON object, no markdown fences.`;

    const result = await _deps.callLLM(
      [{ role: 'system', content: 'Respond with only valid JSON.' }, { role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 512, responseFormat: 'json' }
    );

    const parsed = JSON.parse(result);
    return {
      modelName,
      contextWindow: parsed.contextWindow || null,
      costPer1kIn:   parsed.costPer1kIn || 0,
      costPer1kOut:  parsed.costPer1kOut || 0,
      strengths:     parsed.strengths || [],
      weaknesses:    parsed.weaknesses || [],
      tier:          parsed.tier || 'mid',
      summary:       parsed.summary || '',
      researchedAt:  new Date().toISOString()
    };
  } catch (e) {
    return { modelName, error: e.message, researchedAt: new Date().toISOString() };
  }
}

/**
 * Research a model and auto-update its roster entry if it exists.
 */
async function researchAndUpdate(modelId) {
  const roster = getRoster();
  const existing = roster.models.find(m => m.id === modelId);
  const searchName = existing ? existing.model : modelId;

  const info = await researchModel(searchName);
  if (!info || info.error) return { ok: false, error: info?.error || 'Research failed' };

  if (existing) {
    // Merge research into existing entry (don't overwrite user fields)
    const updates = {};
    if (info.contextWindow && !existing.contextWindow) updates.contextWindow = info.contextWindow;
    if (info.costPer1kIn !== undefined) updates.costPer1kIn = info.costPer1kIn;
    if (info.costPer1kOut !== undefined) updates.costPer1kOut = info.costPer1kOut;
    if (info.strengths?.length && !existing.strengths?.length) updates.strengths = info.strengths;
    if (info.weaknesses?.length && !existing.weaknesses?.length) updates.weaknesses = info.weaknesses;
    if (info.tier && !existing.tier) updates.tier = info.tier;
    if (Object.keys(updates).length) updateModel(modelId, updates);
    return { ok: true, info, updated: Object.keys(updates) };
  }

  return { ok: true, info, updated: [] };
}

// ── Performance Summary ─────────────────────────────────────────────────────

function getPerformanceSummary() {
  const perf = _loadPerf();
  const roster = getRoster();
  const lines = [];

  for (const m of roster.models) {
    const rec = perf.records[m.id];
    if (!rec || !Object.keys(rec).length) {
      lines.push(`${m.id} (${m.tier}) — no performance data yet`);
      continue;
    }
    const tasks = Object.entries(rec).map(([key, r]) => `${key}: ${r.avgGrade} (${r.attempts} runs)`);
    lines.push(`${m.id} (${m.tier}) — ${tasks.join(', ')}`);
  }

  return lines.join('\n') || 'No models in roster.';
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  init,
  // Roster CRUD
  getRoster, saveRoster, addModel, updateModel, removeModel, listModels,
  // Job evaluation & selection
  evaluateJob, selectModel, routeModel,
  // Performance tracking
  recordPerformance, getPerformance, getAllPerformance, getPerformanceSummary,
  // Research
  researchModel, researchAndUpdate,
  // Constants
  TIER_PRIORITY, COMPLEXITY_SIGNALS, LANGUAGE_KEYWORDS
};
