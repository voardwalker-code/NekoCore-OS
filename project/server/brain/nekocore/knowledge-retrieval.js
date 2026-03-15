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
const zlib        = require('zlib');
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

function scanRecentConversationMemories(episodicDir, limit = 6) {
  if (!fs.existsSync(episodicDir)) return [];

  let entries;
  try {
    entries = fs.readdirSync(episodicDir).filter((f) => {
      if (!f.startsWith('mem_') && !f.startsWith('ltm_')) return false;
      try { return fs.statSync(path.join(episodicDir, f)).isDirectory(); } catch { return false; }
    });
  } catch (_) {
    return [];
  }

  const candidates = [];
  for (const folder of entries) {
    const folderPath = path.join(episodicDir, folder);
    const logPath = path.join(folderPath, 'log.json');
    if (!fs.existsSync(logPath)) continue;

    let log;
    try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch (_) { continue; }

    const source = String(log.source || '');
    const type = String(log.type || '');
    if (source !== 'nekocore_conversation' && type !== 'episodic') continue;

    let semantic = '';
    try { semantic = fs.readFileSync(path.join(folderPath, 'semantic.txt'), 'utf8').trim(); } catch (_) {}

    let convoPreview = '';
    const zipPath = path.join(folderPath, 'memory.zip');
    if (fs.existsSync(zipPath)) {
      try {
        const unzipped = zlib.gunzipSync(fs.readFileSync(zipPath)).toString('utf8');
        const parsed = JSON.parse(unzipped);
        const userPart = String(parsed.userMessage || '').replace(/\s+/g, ' ').trim().slice(0, 100);
        const responsePart = String(parsed.response || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (userPart || responsePart) {
          convoPreview = `User: ${userPart || '(empty)'} | NekoCore: ${responsePart || '(empty)'}`;
        }
      } catch (_) {}
    }

    const created = Date.parse(log.created || '') || 0;
    candidates.push({
      id: folder,
      created,
      source: 'self_recent',
      topics: Array.isArray(log.topics) ? log.topics : [],
      semantic,
      convoPreview,
      relevanceScore: 1000000000000 + created,
      importance: Number(log.importance || 0.7)
    });
  }

  candidates.sort((a, b) => b.created - a.created);
  return candidates.slice(0, limit);
}

// ── Build context block in the shape the Orchestrator's subconscious expects ─
function buildContextBlock(userMessage, topics, matches, recentRecalls = []) {
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

  if (recentRecalls.length > 0) {
    lines.push('');
    lines.push('[CONVERSATION RECALL]');
    recentRecalls.forEach((m, idx) => {
      const when = m.created > 0 ? new Date(m.created).toISOString() : 'unknown-time';
      const preview = (m.convoPreview || m.semantic || '').replace(/\s+/g, ' ').trim().slice(0, 220);
      lines.push(`${idx + 1}. ${m.id} (${when}) ${preview}`);
    });
    lines.push('Use these recent turns for continuity even when topic words differ from the current message.');
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
  const recentConversationLimit = opts.recentConversationLimit || 6;
  const topics = extractTopics(userMessage || '');

  const selfEpisodicDir = path.join(memRoot, 'episodic');
  const recentRecalls = scanRecentConversationMemories(selfEpisodicDir, recentConversationLimit);

  // ── 1. Architecture docs (nkdoc_* under semantic/) ─────────────────────────
  const nkdocMatches = [];
  const semanticDir  = path.join(memRoot, 'semantic');
  if (topics.length > 0 && fs.existsSync(semanticDir)) {
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
  const selfMatches = topics.length > 0
    ? scanEpisodicDir(selfEpisodicDir, topics, 3, 'self_memory', null)
    : [];

  // ── 3. Other entities' episodic memories (read-only, no approval required) ──
  const entityMatches = [];
  if (topics.length > 0) {
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
  }

  // ── 4. Merge — recent recall first, then docs/self/entities topic matches ───
  const merged = [];
  const seen = new Set();
  const pushUnique = (arr) => {
    for (const item of arr) {
      if (!item || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  };

  pushUnique(recentRecalls);
  pushUnique(nkdocMatches);
  pushUnique(selfMatches);
  pushUnique(entityMatches.slice(0, Math.floor(limit * 0.4)));

  const maxConnections = limit + recentConversationLimit;
  const connections = merged.slice(0, maxConnections);
  const contextBlock = buildContextBlock(userMessage, topics, connections, recentRecalls);
  return { contextBlock, topics, connections, chatlogContext: [] };
}

module.exports = { buildNekoKnowledgeContext };
