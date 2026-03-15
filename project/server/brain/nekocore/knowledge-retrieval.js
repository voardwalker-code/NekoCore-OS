'use strict';
// ============================================================
// NekoCore — Knowledge Retrieval
//
// Lightweight topic-based retrieval over NekoCore's semantic
// memory directory. Used by processNekoCoreChatMessage to
// surface relevant architecture doc chunks before the
// orchestrator call — the same way the subconscious surfaces
// memories for regular entities, without the full cognitive
// machinery (neurochemistry, cognitivePulse, etc.) NekoCore
// doesn't use.
//
// Returns: { contextBlock, topics, connections, chatlogContext }
// Matches the shape getMemoryContext must return for the Orchestrator.
// ============================================================

const fs          = require('fs');
const path        = require('path');
const entityPaths = require('../../entityPaths');

// ── Topic extractor — min-length 3 to catch "rem", "api", "llm", "sse" ──────
const STOPWORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'be', 'been',
  'a', 'an', 'it', 'its', 'of', 'that', 'this', 'with', 'from', 'has', 'have', 'had',
  'by', 'as', 'up', 'not', 'all', 'any', 'can', 'may', 'will', 'no', 'do', 'does',
  'use', 'used', 'when', 'what', 'how', 'why', 'which', 'per', 'via', 'each', 'you',
  'i', 'me', 'my', 'she', 'her', 'him', 'we', 'our', 'they', 'them', 'your',
  'tell', 'know', 'explain', 'describe', 'show', 'just', 'more', 'about', 'help',
]);

function extractTopics(text) {
  const lower = (text || '').toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
  const seen = new Set();
  const result = [];
  for (const w of words) {
    if (!seen.has(w) && result.length < 16) {
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

// ── Score a memory against query topics ──────────────────────────────────────
function scoreMemory(memTopics, queryTopics) {
  if (!Array.isArray(memTopics) || !Array.isArray(queryTopics)) return 0;
  let hits = 0;
  for (const qt of queryTopics) {
    if (memTopics.includes(qt)) hits++;
  }
  return hits;
}

// ── Scan an episodic memory directory for topic matches ───────────────────────
function scanEpisodicDir(episodicDir, topics, limit, srcType, entityName) {
  if (!fs.existsSync(episodicDir)) return [];
  let entries;
  try {
    entries = fs.readdirSync(episodicDir).filter(f => {
      if (!f.startsWith('mem_') && !f.startsWith('ltm_')) return false;
      try { return fs.statSync(path.join(episodicDir, f)).isDirectory(); } catch { return false; }
    });
  } catch (_) { return []; }

  const candidates = [];
  for (const folder of entries) {
    const logPath = path.join(episodicDir, folder, 'log.json');
    if (!fs.existsSync(logPath)) continue;
    let log;
    try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch (_) { continue; }

    // Skip heavily-decayed memories (nothing useful remains)
    const decay = Number(log.decay);
    if (Number.isFinite(decay) && decay > 0.95) continue;

    const score = scoreMemory(log.topics || [], topics);
    if (score === 0) continue;

    const importance = Number(log.importance || 0.5);
    candidates.push({
      id: folder,
      relevanceScore: score * importance,
      topics: log.topics || [],
      importance,
      source: srcType,
      entityName: entityName || null,
    });
  }

  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const results = [];
  for (const c of candidates.slice(0, limit)) {
    const semPath = path.join(episodicDir, c.id, 'semantic.txt');
    let semantic = '';
    try { semantic = fs.readFileSync(semPath, 'utf8').trim(); } catch (_) {}
    results.push({ ...c, semantic });
  }
  return results;
}

// ── Build context block in the shape the Orchestrator's subconscious expects ─
function buildContextBlock(userMessage, topics, matches) {
  const lines = [];
  lines.push('[SUBCONSCIOUS MEMORY CONTEXT]');
  lines.push('User message: ' + userMessage);
  lines.push('Detected topics: ' + (topics.length ? topics.join(', ') : 'none'));

  if (matches.length === 0) {
    lines.push('Potentially related memories: none');
    lines.push('No system knowledge chunks matched this query.');
  } else {
    lines.push('Potentially related memories (main should decide relevance):');
    matches.forEach((m, idx) => {
      const topicStr = (m.topics || []).join(', ');
      const preview = (m.semantic || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      let tag;
      if (m.source === 'self_memory')    tag = '[SELF_MEMORY]';
      else if (m.source === 'entity_memory') tag = `[ENTITY ${m.entityName || 'unknown'}]`;
      else                               tag = '[DOCUMENT]';
      lines.push(
        `${idx + 1}. ${tag} id=${m.id} score=${Number(m.relevanceScore || 0).toFixed(2)} topics=[${topicStr}] summary="${preview}"`
      );
    });
    lines.push('');
    lines.push('DOCUMENT memories are from architecture docs. SELF_MEMORY entries are NekoCore\'s own past experiences. ENTITY entries belong to active entities — use these to understand what each entity has been experiencing.');
  }

  return lines.join('\n');
}

// ── Main retrieval function ───────────────────────────────────────────────────
/**
 * Scan NekoCore's architecture docs, her own episodic memories, and all
 * known entity episodic memories for topic matches — returns a combined
 * subconscious context block. READ-ONLY; no approval gate required.
 *
 * @param {string} userMessage
 * @param {string} memRoot  — path to entities/entity_nekocore/memories/
 * @param {Object} [opts]
 * @param {number} [opts.limit=10]
 * @returns {{ contextBlock: string, topics: string[], connections: Array, chatlogContext: [] }}
 */
function buildNekoKnowledgeContext(userMessage, memRoot, opts = {}) {
  const limit  = opts.limit || 10;
  const topics = extractTopics(userMessage || '');

  if (!topics.length) {
    return { contextBlock: buildContextBlock(userMessage, topics, []), topics, connections: [], chatlogContext: [] };
  }

  // ── 1. Architecture docs (nkdoc_* under semantic/) ─────────────────────────
  const nkdocMatches = [];
  const semanticDir  = path.join(memRoot, 'semantic');
  if (fs.existsSync(semanticDir)) {
    let entries = [];
    try {
      entries = fs.readdirSync(semanticDir).filter(f => {
        if (!f.startsWith('nkdoc_')) return false;
        try { return fs.statSync(path.join(semanticDir, f)).isDirectory(); } catch { return false; }
      });
    } catch (_) {}
    const candidates = [];
    for (const folder of entries) {
      const logPath = path.join(semanticDir, folder, 'log.json');
      if (!fs.existsSync(logPath)) continue;
      let log;
      try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch (_) { continue; }
      const score = scoreMemory(log.topics || [], topics);
      if (score === 0) continue;
      const importance = Number(log.importance || 0.9);
      candidates.push({ id: folder, relevanceScore: score * importance, topics: log.topics || [], importance, source: 'nkdoc' });
    }
    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
    for (const c of candidates.slice(0, Math.ceil(limit * 0.5))) {
      const semPath = path.join(semanticDir, c.id, 'semantic.txt');
      let semantic = '';
      try { semantic = fs.readFileSync(semPath, 'utf8').trim(); } catch (_) {}
      nkdocMatches.push({ ...c, semantic });
    }
  }

  // ── 2. NekoCore's own episodic memories ─────────────────────────────────────
  const selfEpisodicDir = path.join(memRoot, 'episodic');
  const selfMatches     = scanEpisodicDir(selfEpisodicDir, topics, 3, 'self_memory', null);

  // ── 3. Other entities' episodic memories (read-only, no approval required) ──
  const entityMatches = [];
  try {
    const entitiesDir = entityPaths.ENTITIES_DIR;
    const nekoDirName = `entity_${entityPaths.normalizeEntityId('nekocore')}`;
    const entityDirs  = fs.readdirSync(entitiesDir).filter(f => {
      if (f === nekoDirName || !f.startsWith('entity_')) return false;
      try { return fs.statSync(path.join(entitiesDir, f)).isDirectory(); } catch { return false; }
    });
    for (const dir of entityDirs) {
      let entityName = dir.replace(/^entity_/, '');
      try {
        const ef = path.join(entitiesDir, dir, 'entity.json');
        if (fs.existsSync(ef)) entityName = JSON.parse(fs.readFileSync(ef, 'utf8')).name || entityName;
      } catch (_) {}
      const ep = path.join(entitiesDir, dir, 'memories', 'episodic');
      entityMatches.push(...scanEpisodicDir(ep, topics, 2, 'entity_memory', entityName));
    }
    entityMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (_) {}

  // ── 4. Merge — nkdocs first, then self, then entities capped at ~40% budget ─
  const connections = [
    ...nkdocMatches,
    ...selfMatches,
    ...entityMatches.slice(0, Math.floor(limit * 0.4)),
  ];
  const contextBlock = buildContextBlock(userMessage, topics, connections);
  return { contextBlock, topics, connections, chatlogContext: [] };
}

module.exports = { buildNekoKnowledgeContext };
