// ── MA Project Archive ──────────────────────────────────────────────────────
// Per-project archive: stores every step, code, response, agent dispatch,
// thought, and decision as NekoCore OS-compatible memory nodes with weights,
// decay, importance, topics, and a full connection graph (edges).
// Designed to feed the predictive memory system — nodes + weighted edges.
'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { extractPhrases }  = require('./MA-rake');
const { extractKeywords }  = require('./MA-yake');

const MA_ROOT      = path.join(__dirname, '..');
const ARCHIVES_DIR = path.join(MA_ROOT, 'MA-entity', 'entity_ma', 'archives');

// ── Schema Constants (NekoCore OS-compatible) ───────────────────────────────

const MEMORY_SCHEMA_VERSION = 1;

const NODE_TYPES = ['step', 'code', 'response', 'agent-dispatch', 'thought', 'decision', 'error', 'semantic'];

const EDGE_TYPES = [
  'precedes',     // temporal: node A happened before node B
  'derives',      // semantic knowledge derived from episodic step
  'produces',     // step produced code artifact
  'delegates',    // step dispatched to agent
  'supports',     // reinforcing connection
  'contradicts',  // conflicting information
  'references'    // generic cross-reference
];

const IMPORTANCE_MAP = {
  'step':           0.5,
  'code':           0.7,
  'response':       0.4,
  'agent-dispatch': 0.6,
  'thought':        0.5,
  'decision':       0.8,
  'error':          0.6,
  'semantic':       0.7
};

// ── Project Lifecycle ───────────────────────────────────────────────────────

function _projectDir(projectId) {
  return path.join(ARCHIVES_DIR, `proj_${projectId}`);
}

function _ensureProjectDirs(projectId) {
  const root = _projectDir(projectId);
  for (const sub of ['nodes', 'graph', 'index']) {
    const d = path.join(root, sub);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
  return root;
}

/**
 * Create a new project archive.
 * @param {string} projectId — slug identifier (e.g. 'rem-system')
 * @param {object} meta — { name, description, tags[] }
 * @returns {object} project-meta.json contents
 */
function createProject(projectId, meta = {}) {
  if (!projectId || typeof projectId !== 'string') throw new Error('projectId required');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(projectId)) throw new Error('projectId must be lowercase alphanumeric with hyphens/underscores');

  const root = _ensureProjectDirs(projectId);
  const metaPath = path.join(root, 'project-meta.json');

  if (fs.existsSync(metaPath)) throw new Error(`Project archive already exists: ${projectId}`);

  const project = {
    id: projectId,
    name: meta.name || projectId,
    description: meta.description || '',
    tags: meta.tags || [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodeCount: 0,
    edgeCount: 0
  };

  _atomicWrite(metaPath, project);

  // Initialize empty graph
  _atomicWrite(path.join(root, 'graph', 'edges.json'), { edges: [], count: 0 });

  // Initialize empty indexes
  _atomicWrite(path.join(root, 'index', 'topic-index.json'), {});
  _atomicWrite(path.join(root, 'index', 'temporal-index.json'), []);

  return project;
}

/**
 * Get project metadata.
 */
function getProject(projectId) {
  const metaPath = path.join(_projectDir(projectId), 'project-meta.json');
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

/**
 * List all project archives.
 */
function listProjects() {
  if (!fs.existsSync(ARCHIVES_DIR)) return [];
  return fs.readdirSync(ARCHIVES_DIR)
    .filter(d => d.startsWith('proj_') && fs.statSync(path.join(ARCHIVES_DIR, d)).isDirectory())
    .map(d => {
      const metaPath = path.join(ARCHIVES_DIR, d, 'project-meta.json');
      if (!fs.existsSync(metaPath)) return null;
      try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Close a project archive (mark as complete, freeze for predictive).
 */
function closeProject(projectId) {
  const meta = getProject(projectId);
  if (!meta) throw new Error(`Project not found: ${projectId}`);
  meta.status = 'closed';
  meta.closedAt = new Date().toISOString();
  meta.updatedAt = new Date().toISOString();
  _atomicWrite(path.join(_projectDir(projectId), 'project-meta.json'), meta);
  return meta;
}

/**
 * Resume/reopen a closed project archive.
 * Sets status back to 'active' and clears closedAt.
 */
function resumeProject(projectId) {
  const meta = getProject(projectId);
  if (!meta) throw new Error(`Project not found: ${projectId}`);
  if (meta.status === 'active') return meta; // already active
  meta.status = 'active';
  delete meta.closedAt;
  meta.updatedAt = new Date().toISOString();
  _atomicWrite(path.join(_projectDir(projectId), 'project-meta.json'), meta);
  return meta;
}

// ── Node Operations (Memory Records) ────────────────────────────────────────

/**
 * Record a node in the project archive.
 * Every step, code output, response, agent dispatch, thought, or decision
 * becomes a NekoCore OS-compatible memory node with weights.
 *
 * @param {string} projectId
 * @param {object} opts
 * @param {string} opts.sourceType — one of NODE_TYPES
 * @param {string} opts.content — full content/code/response text
 * @param {string} [opts.summary] — short summary (auto-generated if omitted)
 * @param {number} [opts.importance] — 0.0–1.0 (defaults by sourceType)
 * @param {string[]} [opts.topics] — auto-extracted if <3 provided
 * @param {string} [opts.agentId] — if from a delegated agent
 * @param {number} [opts.stepNumber] — sequential step in the project
 * @param {object} [opts.metadata] — any extra metadata
 * @returns {object} the stored node record
 */
function recordNode(projectId, opts = {}) {
  const project = getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const sourceType = opts.sourceType || 'step';
  if (!NODE_TYPES.includes(sourceType)) throw new Error(`Invalid sourceType: ${sourceType}. Must be one of: ${NODE_TYPES.join(', ')}`);

  const content = opts.content || '';
  const nodeId = `arc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // Auto-extract topics with RAKE + YAKE
  let topics = opts.topics || [];
  if (topics.length < 3 && content) {
    const rake = extractPhrases(content, 8);
    const yake = extractKeywords(content, 6);
    const set = new Set(topics.map(t => t.toLowerCase()));
    for (const p of rake) set.add(p.toLowerCase());
    for (const k of yake) set.add(k.toLowerCase());
    topics = [...set].slice(0, 12);
  }

  const now = new Date().toISOString();

  // NekoCore OS-compatible memory record + archive extensions
  const node = {
    // ── NekoCore OS schema fields ──
    memorySchemaVersion: MEMORY_SCHEMA_VERSION,
    memory_id: nodeId,
    type: sourceType === 'semantic' ? 'semantic' : 'episodic',
    created: now,
    last_accessed: now,
    access_count: 0,
    access_events: [],
    decay: sourceType === 'semantic' ? 1.0 : 1.0,  // starts fresh
    importance: opts.importance ?? IMPORTANCE_MAP[sourceType] ?? 0.5,
    topics,
    emotionalTag: opts.emotionalTag || '',

    // ── Archive extensions ──
    projectId,
    sourceType,
    content,
    summary: opts.summary || content.slice(0, 200),
    agentId: opts.agentId || null,
    stepNumber: opts.stepNumber ?? (project.nodeCount + 1),
    metadata: opts.metadata || {}
  };

  // Write node to disk
  const nodePath = path.join(_projectDir(projectId), 'nodes', `${nodeId}.json`);
  _atomicWrite(nodePath, node);

  // Update indexes
  _addToTopicIndex(projectId, nodeId, topics);
  _addToTemporalIndex(projectId, nodeId, now);

  // Update project meta
  project.nodeCount += 1;
  project.updatedAt = now;
  _atomicWrite(path.join(_projectDir(projectId), 'project-meta.json'), project);

  return node;
}

/**
 * Read a node by ID.
 */
function getNode(projectId, nodeId) {
  const nodePath = path.join(_projectDir(projectId), 'nodes', `${nodeId}.json`);
  if (!fs.existsSync(nodePath)) return null;
  const node = JSON.parse(fs.readFileSync(nodePath, 'utf8'));
  // Update access tracking
  node.access_count += 1;
  node.last_accessed = new Date().toISOString();
  node.access_events.push(node.last_accessed);
  _atomicWrite(nodePath, node);
  return node;
}

/**
 * List all nodes for a project (metadata only — no content).
 */
function listNodes(projectId, opts = {}) {
  const nodesDir = path.join(_projectDir(projectId), 'nodes');
  if (!fs.existsSync(nodesDir)) return [];

  const files = fs.readdirSync(nodesDir).filter(f => f.startsWith('arc_') && f.endsWith('.json'));
  const nodes = [];

  for (const f of files) {
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(nodesDir, f), 'utf8'));
      nodes.push({
        memory_id: rec.memory_id,
        sourceType: rec.sourceType,
        summary: rec.summary,
        importance: rec.importance,
        decay: rec.decay,
        topics: rec.topics,
        stepNumber: rec.stepNumber,
        agentId: rec.agentId,
        created: rec.created
      });
    } catch { /* skip corrupt */ }
  }

  // Sort by stepNumber or creation time
  nodes.sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));

  if (opts.sourceType) return nodes.filter(n => n.sourceType === opts.sourceType);
  if (opts.limit) return nodes.slice(0, opts.limit);
  return nodes;
}

// ── Edge Operations (Connection Graph) ──────────────────────────────────────

/**
 * Add a weighted edge between two nodes.
 * This is the connection graph the predictive system will traverse.
 *
 * @param {string} projectId
 * @param {object} edge
 * @param {string} edge.sourceId — source node memory_id
 * @param {string} edge.targetId — target node memory_id
 * @param {string} edge.type — one of EDGE_TYPES
 * @param {number} [edge.strength] — 0.0–1.0 (default 0.5)
 * @param {string} [edge.label] — human-readable label
 * @returns {object} the edge record
 */
function addEdge(projectId, edge = {}) {
  if (!edge.sourceId || !edge.targetId) throw new Error('sourceId and targetId required');
  if (!EDGE_TYPES.includes(edge.type)) throw new Error(`Invalid edge type: ${edge.type}. Must be one of: ${EDGE_TYPES.join(', ')}`);

  const graphPath = path.join(_projectDir(projectId), 'graph', 'edges.json');
  const graph = fs.existsSync(graphPath) ? JSON.parse(fs.readFileSync(graphPath, 'utf8')) : { edges: [], count: 0 };

  const edgeRecord = {
    id: `edge_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    type: edge.type,
    strength: typeof edge.strength === 'number' ? Math.max(0, Math.min(1, edge.strength)) : 0.5,
    label: edge.label || '',
    created: new Date().toISOString()
  };

  graph.edges.push(edgeRecord);
  graph.count = graph.edges.length;
  _atomicWrite(graphPath, graph);

  // Update project meta edge count
  const meta = getProject(projectId);
  if (meta) {
    meta.edgeCount = graph.count;
    meta.updatedAt = new Date().toISOString();
    _atomicWrite(path.join(_projectDir(projectId), 'project-meta.json'), meta);
  }

  return edgeRecord;
}

/**
 * Get all edges for a project.
 */
function getGraph(projectId) {
  const graphPath = path.join(_projectDir(projectId), 'graph', 'edges.json');
  if (!fs.existsSync(graphPath)) return { edges: [], count: 0 };
  return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
}

/**
 * Get edges connected to a specific node (inbound + outbound).
 */
function getNodeEdges(projectId, nodeId) {
  const graph = getGraph(projectId);
  return graph.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId);
}

/**
 * Reinforce an edge (increase strength by delta, cap at 1.0).
 */
function reinforceEdge(projectId, edgeId, delta = 0.05) {
  const graphPath = path.join(_projectDir(projectId), 'graph', 'edges.json');
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const edge = graph.edges.find(e => e.id === edgeId);
  if (!edge) throw new Error(`Edge not found: ${edgeId}`);
  edge.strength = Math.min(1.0, edge.strength + delta);
  _atomicWrite(graphPath, graph);
  return edge;
}

// ── Convenience: Record + Auto-Edge ─────────────────────────────────────────

/**
 * Record a step with automatic temporal edge to previous step.
 * This is the primary method MA should call for every action.
 *
 * @param {string} projectId
 * @param {object} opts — same as recordNode, plus:
 * @param {string} [opts.previousNodeId] — explicit previous node to link
 * @param {object[]} [opts.extraEdges] — additional edges to create
 * @returns {{ node, edges[] }}
 */
function recordStep(projectId, opts = {}) {
  const node = recordNode(projectId, opts);
  const edges = [];

  // Auto-create temporal 'precedes' edge from previous node
  if (opts.previousNodeId) {
    edges.push(addEdge(projectId, {
      sourceId: opts.previousNodeId,
      targetId: node.memory_id,
      type: 'precedes',
      strength: 0.8,
      label: `step ${(opts.stepNumber || 0) - 1} → step ${opts.stepNumber || 0}`
    }));
  }

  // Create any extra edges
  if (Array.isArray(opts.extraEdges)) {
    for (const e of opts.extraEdges) {
      edges.push(addEdge(projectId, {
        sourceId: e.sourceId || node.memory_id,
        targetId: e.targetId || node.memory_id,
        type: e.type || 'references',
        strength: e.strength,
        label: e.label
      }));
    }
  }

  return { node, edges };
}

/**
 * Record a step and its derived semantic knowledge (dual-path encoding).
 * Creates both the episodic node and a semantic node + derives edge.
 *
 * @param {string} projectId
 * @param {object} opts — same as recordStep
 * @param {string} opts.semanticContent — the derived knowledge text
 * @param {string} [opts.semanticSummary]
 * @returns {{ node, semanticNode, edges[] }}
 */
function recordStepWithKnowledge(projectId, opts = {}) {
  const { node, edges } = recordStep(projectId, opts);

  if (opts.semanticContent) {
    const semNode = recordNode(projectId, {
      sourceType: 'semantic',
      content: opts.semanticContent,
      summary: opts.semanticSummary || opts.semanticContent.slice(0, 200),
      importance: 0.7,
      topics: opts.topics
    });

    edges.push(addEdge(projectId, {
      sourceId: node.memory_id,
      targetId: semNode.memory_id,
      type: 'derives',
      strength: 0.7,
      label: 'semantic extraction'
    }));

    return { node, semanticNode: semNode, edges };
  }

  return { node, semanticNode: null, edges };
}

// ── Export for Predictive System ─────────────────────────────────────────────

/**
 * Export the full project graph — all nodes with weights + all edges.
 * Returns the exact shape the predictive memory system will consume.
 *
 * @param {string} projectId
 * @returns {{ project, nodes[], edges[], stats }}
 */
function exportForPredictive(projectId) {
  const project = getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const nodesDir = path.join(_projectDir(projectId), 'nodes');
  const nodes = [];
  if (fs.existsSync(nodesDir)) {
    for (const f of fs.readdirSync(nodesDir).filter(f => f.endsWith('.json'))) {
      try { nodes.push(JSON.parse(fs.readFileSync(path.join(nodesDir, f), 'utf8'))); }
      catch { /* skip */ }
    }
  }
  nodes.sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));

  const graph = getGraph(projectId);

  // Compute graph stats for predictive system
  const stats = {
    totalNodes: nodes.length,
    totalEdges: graph.count,
    nodesByType: {},
    edgesByType: {},
    avgImportance: 0,
    avgDecay: 0,
    avgEdgeStrength: 0
  };

  for (const n of nodes) {
    stats.nodesByType[n.sourceType] = (stats.nodesByType[n.sourceType] || 0) + 1;
    stats.avgImportance += n.importance;
    stats.avgDecay += n.decay;
  }
  for (const e of graph.edges) {
    stats.edgesByType[e.type] = (stats.edgesByType[e.type] || 0) + 1;
    stats.avgEdgeStrength += e.strength;
  }

  if (nodes.length) {
    stats.avgImportance = +(stats.avgImportance / nodes.length).toFixed(3);
    stats.avgDecay = +(stats.avgDecay / nodes.length).toFixed(3);
  }
  if (graph.edges.length) {
    stats.avgEdgeStrength = +(stats.avgEdgeStrength / graph.edges.length).toFixed(3);
  }

  return { project, nodes, edges: graph.edges, stats };
}

// ── Index Management ────────────────────────────────────────────────────────

function _addToTopicIndex(projectId, nodeId, topics) {
  const indexPath = path.join(_projectDir(projectId), 'index', 'topic-index.json');
  const idx = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : {};
  for (const t of topics) {
    const key = t.toLowerCase();
    if (!idx[key]) idx[key] = [];
    if (!idx[key].includes(nodeId)) idx[key].push(nodeId);
  }
  _atomicWrite(indexPath, idx);
}

function _addToTemporalIndex(projectId, nodeId, timestamp) {
  const indexPath = path.join(_projectDir(projectId), 'index', 'temporal-index.json');
  const idx = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];
  idx.push({ nodeId, timestamp });
  _atomicWrite(indexPath, idx);
}

/**
 * Lookup nodes by topic.
 */
function lookupByTopic(projectId, topic) {
  const indexPath = path.join(_projectDir(projectId), 'index', 'topic-index.json');
  if (!fs.existsSync(indexPath)) return [];
  const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  return idx[topic.toLowerCase()] || [];
}

/**
 * Get project archive stats.
 */
function getArchiveStats(projectId) {
  const project = getProject(projectId);
  if (!project) return null;
  const graph = getGraph(projectId);
  const indexPath = path.join(_projectDir(projectId), 'index', 'topic-index.json');
  const topicIdx = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : {};
  return {
    projectId,
    status: project.status,
    nodeCount: project.nodeCount,
    edgeCount: graph.count,
    topicCount: Object.keys(topicIdx).length,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

// ── Atomic Write Helper ─────────────────────────────────────────────────────

function _atomicWrite(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp_' + crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Project lifecycle
  createProject,
  getProject,
  listProjects,
  closeProject,
  resumeProject,

  // Node operations
  recordNode,
  getNode,
  listNodes,

  // Edge operations
  addEdge,
  getGraph,
  getNodeEdges,
  reinforceEdge,

  // Convenience (auto-edges)
  recordStep,
  recordStepWithKnowledge,

  // Predictive export
  exportForPredictive,

  // Index/stats
  lookupByTopic,
  getArchiveStats,

  // Constants
  NODE_TYPES,
  EDGE_TYPES,
  IMPORTANCE_MAP,
  MEMORY_SCHEMA_VERSION,
  ARCHIVES_DIR
};
