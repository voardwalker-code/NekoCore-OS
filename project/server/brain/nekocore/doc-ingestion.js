'use strict';
// ============================================================
// NekoCore — Architecture Document Ingestion
//
// Reads markdown docs from docs/, splits them into
// section chunks, and writes each chunk as a semantic memory in
// NekoCore's memories/semantic/ directory.
//
// This runs on every server start (via ensureNekoCoreDocs in
// server.js). A manifest file tracks mtime so unchanged docs
// are skipped in O(1).
//
// Memory ID format: nkdoc_<docslug>_<sectionIndex>
// These are regular semantic_knowledge entries — the knowledge
// retrieval scanner in knowledge-retrieval.js handles them.
// ============================================================

const fs   = require('fs');
const path = require('path');
const { extractTopSentences } = require('../utils/textrank');
const { appendArchiveEntry }  = require('../utils/archive-index');

const MANIFEST_FILE = '.nk-doc-manifest.json';

// ── Topic maps: known per-document concept tags ─────────────────────────────
const DOC_TOPIC_SEEDS = {
  'ARCHITECTURE-OVERVIEW':       ['architecture', 'overview', 'rem', 'nekocore', 'system', 'pipeline', 'subsystem'],
  'AUTH-AND-USERS':              ['auth', 'authentication', 'users', 'session', 'login', 'accounts', 'profiles'],
  'BUGTEST-NOTES':               ['bugs', 'testing', 'notes', 'fixes', 'tests'],
  'CHANGELOG':                   ['changelog', 'versions', 'release', 'changes'],
  'CONTRACTS-AND-SCHEMAS':       ['contracts', 'schemas', 'validation', 'data', 'structure'],
  'DREAM-SYSTEM':                ['dream', 'intuition', 'sleep', 'maintenance', 'offline', 'narrative'],
  'ENTITY-AND-IDENTITY':         ['entity', 'identity', 'personality', 'traits', 'unbreakable', 'creation', 'hatching'],
  'HYBRID-CONSCIOUS-ROUTING':    ['routing', 'conscious', 'hybrid', 'model', 'escalation', 'budget'],
  'LLM-PROMPT-REFERENCE':        ['prompt', 'llm', 'reference', 'template', 'system'],
  'MEMORY-SYSTEM':               ['memory', 'echo', 'episodic', 'semantic', 'ltm', 'decay', 'recall', 'index'],
  'MODEL-RECOMMENDATIONS':       ['model', 'recommendations', 'openrouter', 'ollama', 'provider', 'config'],
  'OPEN-ITEMS-AUDIT':            ['open', 'items', 'audit', 'todo', 'pending'],
  'PIPELINE-AND-ORCHESTRATION':  ['pipeline', 'orchestration', 'subconscious', 'conscious', 'dream', 'orchestrator', 'phases'],
  'PLAN-MA-CORE-BUILD-v1':       ['plan', 'build', 'phases', 'roadmap'],
  'PLAN-NEKOCORE-SYSTEM-ENTITY-v1': ['plan', 'nekocore', 'system', 'entity', 'bootstrap'],
  'PLAN-NEKOCORE-BROWSER-PHASE0-v1': ['plan', 'browser', 'nekocore', 'phases'],
  'PLAN-PIPELINE-REFLOW-v1':     ['plan', 'pipeline', 'reflow', 'refactor'],
  'RELEASE-NOTES':               ['release', 'notes', 'version', 'changes'],
  'SERVER-MODULE-MAP':           ['server', 'module', 'map', 'services', 'routes', 'architecture'],
  'TOKEN-ROLE-REVIEW':           ['tokens', 'roles', 'review', 'limits', 'budget'],
  'VISION-AND-ROADMAP':          ['vision', 'roadmap', 'future', 'agentecho', 'phases', 'goals'],
  'PHASE-PLAN-TEMPLATE':         ['plan', 'template', 'phases'],
};

// ── Extract topics from a section heading + content ─────────────────────────
const TOPIC_STOPWORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'be', 'been',
  'a', 'an', 'it', 'its', 'of', 'that', 'this', 'with', 'from', 'has', 'have', 'had',
  'by', 'as', 'up', 'not', 'all', 'any', 'can', 'may', 'will', 'no', 'do', 'does',
  'use', 'used', 'when', 'what', 'how', 'why', 'which', 'per', 'via', 'each',
]);

function extractTopicsFromText(text, extra = []) {
  const raw = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !TOPIC_STOPWORDS.has(w));
  const seen = new Set(extra.map(t => t.toLowerCase()));
  const result = [...extra.map(t => t.toLowerCase())];
  for (const w of raw) {
    if (!seen.has(w) && result.length < 18) {
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

// ── Split a markdown document into sections by ## headers ───────────────────
function chunkDocument(docName, content) {
  const baseName = path.basename(docName, '.md');
  const seedTopics = DOC_TOPIC_SEEDS[baseName] || [];

  // Split on H2 headers (## ...) while keeping the header in the chunk
  const parts = content.split(/^(?=## )/m);
  // parts[0] is the intro/preamble before first ## section (H1 header and intro text)

  const chunks = [];

  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i].trim();
    if (!raw || raw.length < 40) continue;  // skip trivially short fragments

    // Extract heading for this chunk
    const firstLine = raw.split('\n')[0].trim();
    const heading = firstLine.startsWith('#') ? firstLine.replace(/^#+\s*/, '') : baseName;

    // Build topics from seed + heading words + first 300 chars of content body
    const body = raw.slice(firstLine.length).trim();
    const topicsFromContent = extractTopicsFromText(heading + ' ' + body.slice(0, 300), seedTopics);

    // IME I2-1: TextRank abstract instead of first-N-char truncation.
    // extractTopSentences selects the 5 most representative sentences from the body.
    // Falls back to a hard truncation if TextRank yields nothing (very short sections).
    const bodyAbstract = extractTopSentences(body, 5) || body.slice(0, 600);
    const semanticText = `[SYSTEM DOC: ${baseName}] ${heading}\n\n${bodyAbstract}`;

    chunks.push({
      heading,
      topics: topicsFromContent,
      semantic: semanticText,
    });
  }

  return chunks;
}

// ── Write a single doc-archive chunk to disk ─────────────────────────────────
// IME I3-2: writes to memories/archive/docs/ instead of memories/semantic/
// Writes archiveIndex.json entry; does NOT touch memoryIndex.json.
function writeChunk(archiveDocsDir, memRoot, memId, chunk, now) {
  const memDir = path.join(archiveDocsDir, memId);
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  fs.writeFileSync(path.join(memDir, 'semantic.txt'), chunk.semantic, 'utf8');

  const log = {
    memory_id:           memId,
    created:             now,
    last_accessed:       now,
    access_count:        0,
    access_events:       [],
    memorySchemaVersion: 1,
    importance:          0.92,
    emotion:             'professional',
    decay:               0.0005,  // system docs almost never decay
    topics:              chunk.topics,
    type:                'semantic_knowledge',
    source:              'system_document',
  };
  fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');

  // Write archiveIndex entry so search_archive can find this chunk
  // Derive entityId from memRoot (memRoot = entities/entity_<id>/memories)
  const entityRoot = path.dirname(memRoot);
  const entityId   = path.basename(entityRoot).replace(/^entity_/, '');
  appendArchiveEntry(entityId, memId, {
    topics:         chunk.topics,
    archivedAt:     now,
    type:           'semantic_knowledge',
    decayAtArchive: 0.0005,
    created:        now,
    emotion:        'professional',
    importance:     0.92,
    docId:          chunk.heading || memId,
  });
}

// ── Remove old chunks for a doc that is being re-ingested ────────────────────
// Checks both the new archive/docs path and the legacy memories/semantic/ path.
function removeOldChunks(archiveDocsDir, oldChunkIds, legacySemanticDir) {
  for (const id of (oldChunkIds || [])) {
    for (const dir of [archiveDocsDir, legacySemanticDir].filter(Boolean)) {
      const chunkDir = path.join(dir, id);
      if (fs.existsSync(chunkDir)) {
        try { fs.rmSync(chunkDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  }
}

// ── Main: ingest all docs from docsDir into NekoCore's archive/docs/ ─────────
// IME I3-2: chunks go to memories/archive/docs/ not memories/semantic/
function ingestArchitectureDocs(memRoot, docsDir) {
  if (!fs.existsSync(docsDir)) {
    console.log('  ℹ NekoCore doc ingestion: docs/ not found, skipping.');
    return;
  }

  // New destination: archive/docs/
  const archiveDocsDir  = path.join(memRoot, 'archive', 'docs');
  // Legacy path (chunks may remain here from before I3-2)
  const legacySemanticDir = path.join(memRoot, 'semantic');
  if (!fs.existsSync(archiveDocsDir)) fs.mkdirSync(archiveDocsDir, { recursive: true });

  const manifestPath = path.join(memRoot, MANIFEST_FILE);
  let manifest = {};
  try {
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
  } catch (_) { manifest = {}; }

  const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
  let ingested = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const docFile of docFiles) {
    const docPath = path.join(docsDir, docFile);
    let mtime;
    try { mtime = fs.statSync(docPath).mtimeMs; } catch (_) { continue; }

    const entry = manifest[docFile];
    if (entry && entry.mtime === mtime) { skipped++; continue; }

    // Re-ingest: remove old chunks from both archive/docs and legacy semantic/
    if (entry && entry.chunkIds) removeOldChunks(archiveDocsDir, entry.chunkIds, legacySemanticDir);

    let content;
    try { content = fs.readFileSync(docPath, 'utf8'); } catch (_) { continue; }

    const chunks = chunkDocument(docFile, content);
    const baseName = path.basename(docFile, '.md');
    const chunkIds = [];

    for (let i = 0; i < chunks.length; i++) {
      const memId = `nkdoc_${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 28)}_${i}`;
      writeChunk(archiveDocsDir, memRoot, memId, chunks[i], now);
      chunkIds.push(memId);
    }

    manifest[docFile] = { mtime, chunkIds };
    ingested++;
    console.log(`  ✓ NekoCore knowledge: ingested ${docFile} (${chunks.length} chunks)`);
  }

  // Remove manifest entries for docs that no longer exist
  for (const key of Object.keys(manifest)) {
    if (!fs.existsSync(path.join(docsDir, key))) {
      if (manifest[key].chunkIds) removeOldChunks(archiveDocsDir, manifest[key].chunkIds, legacySemanticDir);
      delete manifest[key];
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  if (ingested > 0) {
    console.log(`  ✓ NekoCore doc ingestion complete: ${ingested} doc(s) updated, ${skipped} unchanged.`);
  }
}

module.exports = { ingestArchitectureDocs };
