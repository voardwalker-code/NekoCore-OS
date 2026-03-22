// ── MA Memory System ─────────────────────────────────────────────────────────
// Store, retrieve, search, and ingest memories for a single entity.
// Flat JSON files — no zip compression, no decay engine.
// Episodic (events) + Semantic (knowledge) memory types.
// Uses RAKE + YAKE for topic extraction, BM25 for search scoring.
'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { extractPhrases }  = require('./MA-rake');
const { extractKeywords }  = require('./MA-yake');
const { bm25ScoreWithImportance } = require('./MA-bm25');

const MA_ROOT = path.join(__dirname, '..');

// ── Memory Storage ──────────────────────────────────────────────────────────

/**
 * Create a memory store scoped to an entity.
 * @param {string} entityId - Entity folder name (e.g. 'ma')
 * @returns {object} Memory API
 */
function createMemoryStore(entityId) {
  const entityRoot  = path.join(MA_ROOT, 'MA-entity', `entity_${entityId}`);
  const memRoot     = path.join(entityRoot, 'memories');
  const episodicDir = path.join(memRoot, 'episodic');
  const semanticDir = path.join(memRoot, 'semantic');
  const indexFile   = path.join(entityRoot, 'index', 'memoryIndex.json');

  // Ensure dirs exist
  [episodicDir, semanticDir, path.dirname(indexFile)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // ── Index (fast topic lookup) ────────────────────────────────────────────
  let _index = _loadIndex();

  function _loadIndex() {
    try { return JSON.parse(fs.readFileSync(indexFile, 'utf8')); }
    catch { return { episodic: [], semantic: [] }; }
  }

  function _saveIndex() {
    fs.writeFileSync(indexFile, JSON.stringify(_index, null, 2), 'utf8');
  }

  // ── Store ────────────────────────────────────────────────────────────────
  function store(type, content, meta = {}) {
    const id   = `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const dir  = type === 'semantic' ? semanticDir : episodicDir;
    const dest = path.join(dir, id);
    fs.mkdirSync(dest, { recursive: true });

    // Auto-extract topics with RAKE + YAKE when caller provides few/none
    let topics = meta.topics || [];
    if (topics.length < 3 && content) {
      const rake = extractPhrases(content, 8);
      const yake = extractKeywords(content, 6);
      const set = new Set(topics.map(t => t.toLowerCase()));
      for (const p of rake) set.add(p.toLowerCase());
      for (const k of yake) set.add(k.toLowerCase());
      topics = [...set].slice(0, 12);
    }

    const now = Date.now();
    const record = {
      id,
      type,
      content,
      topics,
      summary:   meta.summary   || content.slice(0, 200),
      importance: meta.importance ?? 0.5,
      createdAt: now,
      createdAtISO: new Date(now).toISOString(),
      chainId: meta.chainId || null,
      accessCount: 0
    };

    // Write semantic.txt (plain text for scanning) + record.json (structured)
    fs.writeFileSync(path.join(dest, 'semantic.txt'), content, 'utf8');
    fs.writeFileSync(path.join(dest, 'record.json'), JSON.stringify(record, null, 2), 'utf8');

    // Update index
    const entry = { id, type, topics: record.topics, summary: record.summary, importance: record.importance, createdAt: record.createdAt, createdAtISO: record.createdAtISO, chainId: record.chainId };
    (type === 'semantic' ? _index.semantic : _index.episodic).push(entry);
    _saveIndex();

    return record;
  }

  // ── Retrieve ─────────────────────────────────────────────────────────────
  function retrieve(memId) {
    // Try both dirs
    for (const dir of [episodicDir, semanticDir]) {
      const p = path.join(dir, memId, 'record.json');
      if (fs.existsSync(p)) {
        const rec = JSON.parse(fs.readFileSync(p, 'utf8'));
        rec.accessCount = (rec.accessCount || 0) + 1;
        fs.writeFileSync(p, JSON.stringify(rec, null, 2), 'utf8');
        return rec;
      }
    }
    return null;
  }

  // ── Search (RAKE query extraction + BM25 scoring) ─────────────────────────
  function search(query, limit = 10) {
    if (!query || typeof query !== 'string') return [];

    // Extract query topics via RAKE (multi-word phrases) + fallback single words
    const queryTopics = extractPhrases(query, 12);
    // Also keep raw lowercased terms for summary keyword fallback
    const rawTerms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
    if (!queryTopics.length && !rawTerms.length) return [];

    const all = [..._index.episodic, ..._index.semantic];
    const now = Date.now();

    const scored = all.map(entry => {
      const docTopics = (entry.topics || []).map(t => t.toLowerCase());
      const importance = entry.importance || 0.5;
      // Simple recency decay: 1.0 at creation, 0.5 after 7 days, floor 0.1
      const ageMs = now - (entry.createdAt || now);
      const decay = Math.max(0.1, Math.exp(-ageMs / (7 * 86400000)));

      // BM25 score with importance + decay
      let score = bm25ScoreWithImportance(queryTopics, docTopics, importance, decay);

      // Keyword fallback: also check summary for raw terms (catches sparse-topic memories)
      const summaryStr = (entry.summary || '').toLowerCase();
      for (const t of rawTerms) {
        if (summaryStr.includes(t)) score += 0.15;
      }

      return { ...entry, score };
    }).filter(e => e.score > 0);

    scored.sort((a, b) => b.score - a.score);
    let results = scored.slice(0, limit);

    // Chain expansion: for top results with a chainId, pull in chain siblings
    const seenIds = new Set(results.map(r => r.id));
    const chainIds = new Set(results.filter(r => r.chainId).map(r => r.chainId));
    if (chainIds.size > 0) {
      const all = [..._index.episodic, ..._index.semantic];
      for (const entry of all) {
        if (entry.chainId && chainIds.has(entry.chainId) && !seenIds.has(entry.id)) {
          results.push({ ...entry, score: 0.05, chainLinked: true });
          seenIds.add(entry.id);
        }
      }
    }

    return results;
  }

  // ── List ─────────────────────────────────────────────────────────────────
  function list(type, limit = 50) {
    const arr = type === 'semantic' ? _index.semantic : type === 'episodic' ? _index.episodic : [..._index.episodic, ..._index.semantic];
    return arr.slice(-limit);
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  function stats() {
    return {
      episodic: _index.episodic.length,
      semantic: _index.semantic.length,
      total: _index.episodic.length + _index.semantic.length
    };
  }

  // ── Archive Ingest (read file → chunk → store as semantic) ───────────────
  function ingest(filePath, meta = {}) {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const chunks = _chunkText(raw, 1500);  // ~1500 chars per chunk
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const rec = store('semantic', chunk, {
        topics:    meta.topics || [path.basename(filePath)],
        summary:   chunk.slice(0, 200),
        importance: meta.importance ?? 0.6
      });
      results.push(rec.id);
    }
    return { chunksStored: results.length, ids: results };
  }

  // ── Rebuild index from disk ──────────────────────────────────────────────
  function rebuildIndex() {
    _index = { episodic: [], semantic: [] };
    for (const [type, dir] of [['episodic', episodicDir], ['semantic', semanticDir]]) {
      if (!fs.existsSync(dir)) continue;
      for (const folder of fs.readdirSync(dir)) {
        const recFile = path.join(dir, folder, 'record.json');
        if (!fs.existsSync(recFile)) continue;
        try {
          const rec = JSON.parse(fs.readFileSync(recFile, 'utf8'));
          _index[type].push({
            id: rec.id, type, topics: rec.topics || [],
            summary: rec.summary || '', importance: rec.importance || 0.5,
            createdAt: rec.createdAt || 0
          });
        } catch { /* skip corrupt */ }
      }
    }
    _saveIndex();
    return stats();
  }

  return { store, retrieve, search, list, stats, ingest, rebuildIndex };
}

// ── Chunking helper ─────────────────────────────────────────────────────────
function _chunkText(text, maxLen) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/);
  let current = '';
  for (const p of paragraphs) {
    if ((current + '\n\n' + p).length > maxLen && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + '\n\n' + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

module.exports = { createMemoryStore };
