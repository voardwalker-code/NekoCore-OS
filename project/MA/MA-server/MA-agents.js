// ── MA Agent Catalog ─────────────────────────────────────────────────────────
// CRUD + catalog for delegated agents stored in MA-entity/.
// Each agent is a folder: MA-entity/agent_{id}/agent.json + prompt-history/.
// MA reads the catalog to see who's available before hiring new agents.
'use strict';

const fs   = require('fs');
const path = require('path');

const ENTITY_DIR = path.join(__dirname, '..', 'MA-entity');
const AGENT_PREFIX = 'agent_';

// ── Schema ──────────────────────────────────────────────────────────────────

const AGENT_SCHEMA = {
  required: ['id', 'role', 'name', 'systemPrompt', 'capabilities'],
  shape: {
    id:           { type: 'string',  description: 'Unique slug (e.g. senior-coder)' },
    role:         { type: 'string',  description: 'Role category (coder, architect, researcher, writer, reviewer, tester)' },
    name:         { type: 'string',  description: 'Display name (e.g. Senior Coder)' },
    seniority:    { type: 'string',  description: 'junior | mid | senior | lead', enum: ['junior', 'mid', 'senior', 'lead'] },
    systemPrompt: { type: 'string',  description: 'Full system prompt used when delegating work to this agent' },
    capabilities: { type: 'array',   description: 'List of capability tags' },
    tools:        { type: 'array',   description: 'Tools this agent is allowed to use' },
    constraints:  { type: 'array',   description: 'Rules/limits for this agent' },
    createdAt:    { type: 'string',  description: 'ISO timestamp' },
    updatedAt:    { type: 'string',  description: 'ISO timestamp' },
    usageCount:   { type: 'number',  description: 'Times this agent has been dispatched' },
    lastUsed:     { type: 'string',  description: 'ISO timestamp of last dispatch' }
  }
};

const PROMPT_ENTRY_SCHEMA = {
  required: ['id', 'agentId', 'task', 'prompt', 'timestamp'],
  shape: {
    id:        { type: 'string',  description: 'Unique prompt ID' },
    agentId:   { type: 'string',  description: 'Agent this prompt was sent to' },
    task:      { type: 'string',  description: 'Short task label' },
    prompt:    { type: 'string',  description: 'Full prompt text sent to agent' },
    result:    { type: 'string',  description: 'Summary of agent output' },
    success:   { type: 'boolean', description: 'Whether the task succeeded' },
    project:   { type: 'string',  description: 'Project context (e.g. rem-system)' },
    timestamp: { type: 'string',  description: 'ISO timestamp' },
    tags:      { type: 'array',   description: 'Searchable tags' }
  }
};

// ── Agent CRUD ──────────────────────────────────────────────────────────────

function _agentDir(id) { return path.join(ENTITY_DIR, AGENT_PREFIX + id); }
function _agentFile(id) { return path.join(_agentDir(id), 'agent.json'); }
function _historyDir(id) { return path.join(_agentDir(id), 'prompt-history'); }

function createAgent(def) {
  const errors = validateAgent(def);
  if (errors.length) return { ok: false, errors };

  const dir = _agentDir(def.id);
  if (fs.existsSync(dir)) return { ok: false, errors: ['Agent already exists: ' + def.id] };

  const agent = {
    ...def,
    createdAt: def.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    lastUsed: null
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(_historyDir(def.id), { recursive: true });
  fs.writeFileSync(_agentFile(def.id), JSON.stringify(agent, null, 2));
  return { ok: true, agent };
}

function getAgent(id) {
  const fp = _agentFile(id);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function updateAgent(id, updates) {
  const agent = getAgent(id);
  if (!agent) return { ok: false, errors: ['Agent not found: ' + id] };

  const merged = { ...agent, ...updates, id: agent.id, createdAt: agent.createdAt, updatedAt: new Date().toISOString() };
  const errors = validateAgent(merged);
  if (errors.length) return { ok: false, errors };

  fs.writeFileSync(_agentFile(id), JSON.stringify(merged, null, 2));
  return { ok: true, agent: merged };
}

function deleteAgent(id) {
  const dir = _agentDir(id);
  if (!fs.existsSync(dir)) return { ok: false, errors: ['Agent not found: ' + id] };
  fs.rmSync(dir, { recursive: true, force: true });
  return { ok: true };
}

// ── Catalog ─────────────────────────────────────────────────────────────────

function listAgents() {
  if (!fs.existsSync(ENTITY_DIR)) return [];
  return fs.readdirSync(ENTITY_DIR)
    .filter(d => d.startsWith(AGENT_PREFIX) && fs.statSync(path.join(ENTITY_DIR, d)).isDirectory())
    .map(d => {
      const id = d.slice(AGENT_PREFIX.length);
      return getAgent(id);
    })
    .filter(Boolean);
}

function findAgentsByRole(role) {
  return listAgents().filter(a => a.role === role);
}

function findAgentsByCapability(capability) {
  return listAgents().filter(a => (a.capabilities || []).includes(capability));
}

function getCatalogSummary() {
  const agents = listAgents();
  const byRole = {};
  for (const a of agents) {
    if (!byRole[a.role]) byRole[a.role] = [];
    byRole[a.role].push({ id: a.id, name: a.name, seniority: a.seniority, usageCount: a.usageCount });
  }
  return { total: agents.length, byRole };
}

// ── Prompt History ──────────────────────────────────────────────────────────

function recordPrompt(agentId, entry) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, errors: ['Agent not found: ' + agentId] };

  const histDir = _historyDir(agentId);
  if (!fs.existsSync(histDir)) fs.mkdirSync(histDir, { recursive: true });

  const record = {
    id: 'prompt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    agentId,
    task: entry.task || 'unnamed',
    prompt: entry.prompt,
    result: entry.result || '',
    success: entry.success !== false,
    project: entry.project || '',
    timestamp: new Date().toISOString(),
    tags: entry.tags || []
  };

  fs.writeFileSync(path.join(histDir, record.id + '.json'), JSON.stringify(record, null, 2));

  // Update agent usage stats
  agent.usageCount = (agent.usageCount || 0) + 1;
  agent.lastUsed = record.timestamp;
  fs.writeFileSync(_agentFile(agentId), JSON.stringify(agent, null, 2));

  return { ok: true, record };
}

function getPromptHistory(agentId, opts = {}) {
  const histDir = _historyDir(agentId);
  if (!fs.existsSync(histDir)) return [];

  let entries = fs.readdirSync(histDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(histDir, f), 'utf8')); }
      catch (_) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  if (opts.project) entries = entries.filter(e => e.project === opts.project);
  if (opts.tag) entries = entries.filter(e => (e.tags || []).includes(opts.tag));
  if (opts.limit) entries = entries.slice(0, opts.limit);

  return entries;
}

function searchPromptHistory(query) {
  const agents = listAgents();
  const results = [];
  const low = query.toLowerCase();

  for (const agent of agents) {
    const history = getPromptHistory(agent.id);
    for (const entry of history) {
      const haystack = [entry.task, entry.prompt, entry.result, ...(entry.tags || [])].join(' ').toLowerCase();
      if (haystack.includes(low)) results.push(entry);
    }
  }
  return results.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateAgent(def) {
  const errors = [];
  for (const f of AGENT_SCHEMA.required) {
    if (def[f] === undefined || def[f] === null || def[f] === '') {
      errors.push('Missing required: ' + f);
    }
  }
  if (def.id && !/^[a-z0-9-]+$/.test(def.id)) errors.push('id must be lowercase alphanumeric + hyphens');
  if (def.seniority && !['junior', 'mid', 'senior', 'lead'].includes(def.seniority)) {
    errors.push('seniority must be: junior, mid, senior, or lead');
  }
  if (def.capabilities && !Array.isArray(def.capabilities)) errors.push('capabilities must be array');
  return errors;
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  AGENT_SCHEMA, PROMPT_ENTRY_SCHEMA,
  createAgent, getAgent, updateAgent, deleteAgent,
  listAgents, findAgentsByRole, findAgentsByCapability, getCatalogSummary,
  recordPrompt, getPromptHistory, searchPromptHistory,
  validateAgent, ENTITY_DIR
};
