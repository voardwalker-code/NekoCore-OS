// ── Brain · Blueprint Loader ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blueprint Loader
 *
 * Loads markdown blueprint files from disk and caches them in memory.
 * Blueprints are source-of-truth instruction documents that get injected
 * into LLM prompts during task execution.
 *
 * Two categories:
 *   core/    — universal blueprints (task decomposition, tools, quality, errors, output)
 *   modules/ — task-type-specific blueprints (research, code, writing, analysis, planning)
 */

const fs = require('fs');
const path = require('path');

const BLUEPRINTS_DIR = path.join(__dirname, 'blueprints');
const CORE_DIR = path.join(BLUEPRINTS_DIR, 'core');
const MODULES_DIR = path.join(BLUEPRINTS_DIR, 'modules');

// In-memory cache: Map<string, string>
const _cache = new Map();

// Core blueprint names (filename without .md)
const CORE_NAMES = [
  'task-decomposition',
  'tool-guide',
  'quality-gate',
  'error-recovery',
  'output-format'
];

// Module blueprint names map taskType → filename
const MODULE_MAP = {
  research: 'research',
  code: 'code',
  writing: 'writing',
  analysis: 'analysis',
  planning: 'planning',
  project: 'project',
  memory_query: null    // no dedicated blueprint — uses core only
};

/**
 * Read a markdown file, cache it, and return its content.
 * Returns empty string if file does not exist.
 * @param {string} filePath - Absolute path to the .md file
 * @returns {string}
 */
// _loadFile()
// WHAT THIS DOES: _loadFile reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call _loadFile(...), then use the returned value in your next step.
function _loadFile(filePath) {
  if (_cache.has(filePath)) return _cache.get(filePath);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      _cache.set(filePath, content);
      return content;
    }
  } catch (_) { /* graceful — return empty */ }
  _cache.set(filePath, '');
  return '';
}

/**
 * Get a single core blueprint by name.
 * @param {string} name — one of CORE_NAMES (e.g. 'task-decomposition')
 * @returns {string} Blueprint content or empty string
 */
// getCoreBlueprint()
// WHAT THIS DOES: getCoreBlueprint reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getCoreBlueprint(...), then use the returned value in your next step.
function getCoreBlueprint(name) {
  if (!name || typeof name !== 'string') return '';
  return _loadFile(path.join(CORE_DIR, `${name}.md`));
}

/**
 * Get all core blueprints concatenated.
 * Used when injecting universal instructions into task prompts.
 * @returns {string}
 */
// getAllCoreBlueprints()
// WHAT THIS DOES: getAllCoreBlueprints reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getAllCoreBlueprints(...), then use the returned value in your next step.
function getAllCoreBlueprints() {
  return CORE_NAMES
    .map(name => _loadFile(path.join(CORE_DIR, `${name}.md`)))
    .filter(Boolean)
    .join('\n\n---\n\n');
}

/**
 * Get the module-specific blueprint for a task type.
 * @param {string} taskType — e.g. 'research', 'code', 'writing', 'analysis', 'planning'
 * @returns {string} Blueprint content or empty string
 */
// getModuleBlueprint()
// WHAT THIS DOES: getModuleBlueprint reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getModuleBlueprint(...), then use the returned value in your next step.
function getModuleBlueprint(taskType) {
  if (!taskType || typeof taskType !== 'string') return '';
  const filename = MODULE_MAP[taskType];
  if (!filename) return '';
  return _loadFile(path.join(MODULES_DIR, `${filename}.md`));
}

/**
 * Get the full prompt injection for a task type:
 * module blueprint + selected core blueprints relevant to the task phase.
 *
 * @param {string} taskType — e.g. 'research', 'code'
 * @param {Object} options
 *   - phase {'plan'|'execute'|'summarize'} — which phase of execution
 *     'plan'      → task-decomposition + module blueprint
 *     'execute'   → tool-guide + error-recovery + module blueprint
 *     'summarize' → quality-gate + output-format
 * @returns {string} Assembled blueprint text for prompt injection
 */
// getBlueprintForPhase()
// WHAT THIS DOES: getBlueprintForPhase reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getBlueprintForPhase(...), then use the returned value in your next step.
function getBlueprintForPhase(taskType, options = {}) {
  const { phase = 'execute' } = options;
  const parts = [];

  if (phase === 'plan') {
    const decomp = getCoreBlueprint('task-decomposition');
    if (decomp) parts.push(decomp);
    const mod = getModuleBlueprint(taskType);
    if (mod) parts.push(mod);
  } else if (phase === 'execute') {
    const tools = getCoreBlueprint('tool-guide');
    if (tools) parts.push(tools);
    const recovery = getCoreBlueprint('error-recovery');
    if (recovery) parts.push(recovery);
    const mod = getModuleBlueprint(taskType);
    if (mod) parts.push(mod);
  } else if (phase === 'summarize') {
    const quality = getCoreBlueprint('quality-gate');
    if (quality) parts.push(quality);
    const format = getCoreBlueprint('output-format');
    if (format) parts.push(format);
  }

  return parts.join('\n\n---\n\n');
}

/**
 * List all available blueprint names (core + modules).
 * @returns {{ core: string[], modules: string[] }}
 */
// listBlueprints()
// WHAT THIS DOES: listBlueprints is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call listBlueprints(...) where this helper behavior is needed.
function listBlueprints() {
  return {
    core: [...CORE_NAMES],
    modules: Object.keys(MODULE_MAP).filter(k => MODULE_MAP[k] !== null)
  };
}

/**
 * Clear the in-memory cache (for testing or hot reload).
 */
// clearCache()
// WHAT THIS DOES: clearCache removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call clearCache(...) when you need a safe teardown/reset path.
function clearCache() {
  _cache.clear();
}

module.exports = {
  getCoreBlueprint,
  getAllCoreBlueprints,
  getModuleBlueprint,
  getBlueprintForPhase,
  listBlueprints,
  clearCache,
  CORE_NAMES,
  MODULE_MAP,
  BLUEPRINTS_DIR
};
