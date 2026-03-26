// ── MA Workspace Tools ───────────────────────────────────────────────────────
// File I/O + web + command tools for task execution.
// Parses [TOOL:name {json}] blocks from LLM output, validates with Zod, executes.
'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const zlib   = require('zlib');
const { z }  = require('zod');
const webFetch = require('./MA-web-fetch');
const cmdExec  = require('./MA-cmd-executor');

// ── Zod Tool Schemas ────────────────────────────────────────────────────────
const ToolSchemas = {
  ws_list:    z.object({ path: z.string().default('.') }),
  ws_read:    z.object({ path: z.string() }),
  ws_write:   z.object({ path: z.string(), content: z.string().optional() }),
  ws_append:  z.object({ path: z.string(), content: z.string().optional() }),
  ws_delete:  z.object({ path: z.string() }),
  ws_mkdir:   z.object({ path: z.string() }),
  ws_move:    z.object({ src: z.string(), dst: z.string() }),
  web_search:     z.object({ query: z.string() }),
  web_fetch:      z.object({ url: z.string() }),
  cmd_run:        z.object({ cmd: z.string() }),
  memory_search:  z.object({ query: z.string(), limit: z.number().int().min(1).max(50).default(5) }),
  entity_create:  z.object({
    name: z.string(),
    gender: z.string().default('neutral'),
    traits: z.array(z.string()).default([]),
    introduction: z.string().default(''),
    source: z.string().optional(),
    personality_summary: z.string().optional(),
    speech_style: z.string().optional(),
    beliefs: z.array(z.string()).optional(),
    behavior_rules: z.array(z.string()).optional(),
  }),
  entity_inject_memory: z.object({
    entityId: z.string(),
    content: z.string(),
    type: z.string().default('episodic'),
    emotion: z.string().default('neutral'),
    topics: z.array(z.string()).default([]),
    importance: z.number().min(0).max(1).default(0.5),
    narrative: z.string().optional(),
    phase: z.string().default('book_ingestion'),
  }),
  book_list_chunks: z.object({ bookId: z.string() }),
  book_read_chunk:  z.object({ bookId: z.string(), index: z.number().int().min(0) }),
};

// ── Regex patterns ──────────────────────────────────────────────────────────
// Block: [TOOL:ws_write {"path":"f"}]\ncontent\n[/TOOL]  (only ws_write/ws_append)
const BLOCK_RE = /\[TOOL:(ws[-_]write|ws[-_]append)\s*(\{[\s\S]*?\})?\s*\]\n?([\s\S]*?)\[\s*\/\s*TOOL\s*\]/gi;
// Inline: [TOOL:name {"key":"val"}] or [TOOL:name]
const INLINE_RE = /\[TOOL:(\w[\w-]*)\s*(\{[\s\S]*?\})?\s*\]/gi;
// Legacy fallback: [TOOL: name; params]
const LEGACY_RE = /\[\s*TOOL\s*:\s*(\w[\w-]*)\s*;\s*([\s\S]*?)\s*\]/gi;
// Strip pattern: blocks first, then inline, then legacy
const STRIP_RE = /\[TOOL:[\s\S]*?\[\s*\/\s*TOOL\s*\]|\[TOOL:\w[\w-]*\s*(?:\{[\s\S]*?\})?\s*\]|\[\s*TOOL\s*:\s*\w[\w-]*[\s\S]*?\]/gi;

function _preCleanToolText(text) {
  if (!text) return text;
  return text.replace(/```[\w]*\s*(\[\s*TOOL[\s\S]*?(?:\[\s*\/\s*TOOL\s*\]|\]))\s*```/gi, '$1');
}

function _normName(n) { return n.toLowerCase().replace(/-/g, '_'); }

function _parseJSON(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return null; }
}

function _overlaps(pos, len, ranges) {
  const end = pos + len;
  for (const [s, e] of ranges) {
    if (pos >= s && pos < e) return true;
    if (end > s && end <= e) return true;
    if (pos <= s && end >= e) return true;
  }
  return false;
}

function _validate(name, raw, blockContent) {
  const schema = ToolSchemas[name];
  if (!schema) return { ok: false, error: `Unknown tool: ${name}` };

  const params = { ...raw };
  if (blockContent !== undefined && (name === 'ws_write' || name === 'ws_append')) {
    params.content = blockContent;
  }

  const result = schema.safeParse(params);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    const msgs = issues.map(i => `${(i.path || []).join('.') || 'param'}: ${i.message}`);
    return { ok: false, error: `${name} schema error: ${msgs.join('; ')}. Expected: ${JSON.stringify(Object.keys(schema.shape))}` };
  }
  return { ok: true, data: result.data };
}

function _legacyToObject(name, raw) {
  switch (name) {
    case 'ws_list':   return { data: { path: raw || '.' } };
    case 'ws_read':   return { data: { path: raw } };
    case 'ws_delete':  return { data: { path: raw } };
    case 'ws_mkdir':   return { data: { path: raw } };
    case 'ws_write':
    case 'ws_append': {
      const nl = raw.indexOf('\n');
      if (nl < 0) return { error: `${name}: expected path then content (newline-separated)` };
      return { data: { path: raw.slice(0, nl).trim() }, blockContent: raw.slice(nl + 1) };
    }
    case 'ws_move': {
      const parts = raw.split(/\s+/);
      if (parts.length < 2) return { error: 'ws_move: expected "src dst"' };
      return { data: { src: parts[0], dst: parts[1] } };
    }
    case 'web_search':    return { data: { query: raw } };
    case 'web_fetch':     return { data: { url: raw } };
    case 'cmd_run':       return { data: { cmd: raw } };
    case 'memory_search': return { data: { query: raw, limit: 5 } };
    default: return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Extract tool calls from LLM text output.
 * Three-pass parser: block → inline → legacy fallback.
 * Returns array of { name, params, error? }
 */
function extractToolCalls(text) {
  if (!text) return [];
  const cleaned = _preCleanToolText(text);
  const calls = [];
  const matched = []; // [start, end] ranges
  let m;

  // Pass 1: Block tools (ws_write / ws_append with [/TOOL])
  const blockRe = new RegExp(BLOCK_RE.source, BLOCK_RE.flags);
  while ((m = blockRe.exec(cleaned))) {
    matched.push([m.index, m.index + m[0].length]);
    const name = _normName(m[1]);
    const json = _parseJSON(m[2]);
    if (json === null) {
      calls.push({ name, params: null, error: `Invalid JSON in [TOOL:${name}]: ${m[2]}`, _pos: m.index });
    } else {
      const v = _validate(name, json, m[3]);
      calls.push(v.ok
        ? { name, params: v.data, _pos: m.index }
        : { name, params: null, error: v.error, _pos: m.index });
    }
  }

  // Pass 2: Inline tools — skip positions covered by blocks
  const inlineRe = new RegExp(INLINE_RE.source, INLINE_RE.flags);
  while ((m = inlineRe.exec(cleaned))) {
    if (_overlaps(m.index, m[0].length, matched)) continue;
    matched.push([m.index, m.index + m[0].length]);
    const name = _normName(m[1]);
    const json = _parseJSON(m[2]);
    if (json === null) {
      calls.push({ name, params: null, error: `Invalid JSON in [TOOL:${name}]: ${m[2]}`, _pos: m.index });
    } else {
      const v = _validate(name, json, undefined);
      calls.push(v.ok
        ? { name, params: v.data, _pos: m.index }
        : { name, params: null, error: v.error, _pos: m.index });
    }
  }

  // Pass 3: Legacy [TOOL: name; params] — backward compat
  const legacyRe = new RegExp(LEGACY_RE.source, LEGACY_RE.flags);
  while ((m = legacyRe.exec(cleaned))) {
    if (_overlaps(m.index, m[0].length, matched)) continue;
    const name = _normName(m[1]);
    const raw = (m[2] || '').trim();
    const parsed = _legacyToObject(name, raw);
    if (parsed.error) {
      calls.push({ name, params: null, error: parsed.error, _pos: m.index });
    } else {
      const v = _validate(name, parsed.data, parsed.blockContent);
      calls.push(v.ok
        ? { name, params: v.data, _pos: m.index }
        : { name, params: null, error: v.error, _pos: m.index });
    }
  }

  // Sort by document order, strip internal position marker
  calls.sort((a, b) => a._pos - b._pos);
  return calls.map(({ _pos, ...rest }) => rest);
}

/** Remove tool blocks from text (including code-fenced tool calls). */
function stripToolCalls(text) {
  if (!text) return '';
  let out = _preCleanToolText(text);
  out = out.replace(STRIP_RE, '');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Execute extracted tool calls.
 * @param {string} text - LLM output containing [TOOL:] blocks
 * @param {object} opts - { workspacePath, webFetchEnabled, cmdRunEnabled }
 * @returns {Promise<Array<{ tool, result, ok }>>}
 */
async function executeToolCalls(text, opts = {}) {
  const calls = extractToolCalls(text);
  if (!calls.length) return [];

  const wp = opts.workspacePath || '';
  const results = [];

  for (const call of calls) {
    if (call.error) {
      results.push({ tool: call.name, result: call.error, ok: false });
      continue;
    }
    // Block tools restricted by current mode
    if (opts.blockedTools && opts.blockedTools.has(call.name)) {
      results.push({ tool: call.name, result: `I'm currently in Chat Mode and can't use ${call.name}. Please switch to Work Mode to use this tool.`, ok: false });
      continue;
    }
    try {
      let result;
      const p = call.params;
      switch (call.name) {
        case 'ws_list':   result = _wsList(wp, p.path); break;
        case 'ws_read':   result = _wsRead(wp, p.path); break;
        case 'ws_write':  result = _wsWrite(wp, p.path, p.content); break;
        case 'ws_append': result = _wsAppend(wp, p.path, p.content); break;
        case 'ws_delete': result = _wsDelete(wp, p.path); break;
        case 'ws_mkdir':  result = _wsMkdir(wp, p.path); break;
        case 'ws_move':   result = _wsMove(wp, p.src, p.dst); break;
        case 'web_search':
          if (opts.webFetchEnabled !== false) result = await _webSearch(p.query);
          else result = 'web_search disabled';
          break;
        case 'web_fetch':
          if (opts.webFetchEnabled !== false) result = await _webFetch(p.url);
          else result = 'web_fetch disabled';
          break;
        case 'cmd_run':
          if (opts.cmdRunEnabled !== false) result = await _cmdRun(wp, p.cmd);
          else result = 'cmd_run disabled';
          break;
        case 'memory_search':
          if (opts.memorySearch) {
            const hits = opts.memorySearch(p.query, p.limit || 5);
            result = hits.length
              ? hits.map(m => `- [${m.type || 'memory'}] ${(m.summary || m.content || '').slice(0, 300)}`).join('\n')
              : 'No matching memories found.';
          } else {
            result = 'memory_search: memory module not available';
          }
          break;
        case 'entity_create':
          result = _entityCreate(wp, p);
          break;
        case 'entity_inject_memory':
          result = _entityInjectMemory(wp, p);
          break;
        case 'book_list_chunks':
          result = _bookListChunks(wp, p.bookId);
          break;
        case 'book_read_chunk':
          result = _bookReadChunk(wp, p.bookId, p.index);
          break;
        default:
          result = `Unknown tool: ${call.name}`;
      }
      results.push({ tool: call.name, result, ok: true });
    } catch (e) {
      results.push({ tool: call.name, result: `Error: ${e.message}`, ok: false });
    }
  }
  return results;
}

/** Format tool results into LLM-readable context block. */
function formatToolResults(results) {
  if (!results.length) return '';
  return results.map(r =>
    `[TOOL_RESULT: ${r.tool}]\n${r.ok ? r.result : 'ERROR: ' + r.result}\n[/TOOL_RESULT]`
  ).join('\n\n');
}

// ── Path safety — prevent traversal outside workspace ───────────────────────
function _safe(wp, rel) {
  if (!wp) throw new Error('No workspace path');
  const resolved = path.resolve(wp, rel.trim());
  if (!resolved.startsWith(path.resolve(wp))) throw new Error('Path outside workspace');
  return resolved;
}

// ── File tools (accept clean parsed params) ─────────────────────────────────
function _wsList(wp, dirPath) {
  const dir = dirPath && dirPath !== '.' ? _safe(wp, dirPath) : wp;
  if (!fs.existsSync(dir)) return 'Directory not found';
  return fs.readdirSync(dir).map(f => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory() ? f + '/' : f;
  }).join('\n') || '(empty)';
}

function _wsRead(wp, filePath) {
  const p = _safe(wp, filePath);
  if (!fs.existsSync(p)) return `File not found: ${filePath}`;
  return fs.readFileSync(p, 'utf8').slice(0, 32000);
}

function _wsWrite(wp, filePath, content) {
  if (content === undefined || content === null) {
    return 'Error: content required. Use block format: [TOOL:ws_write {"path":"file"}]\\ncontent\\n[/TOOL]';
  }
  const p = _safe(wp, filePath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  const bytes = Buffer.byteLength(content, 'utf8');
  return `Wrote ${bytes} bytes to ${path.relative(wp, p)}`;
}

function _wsAppend(wp, filePath, content) {
  if (content === undefined || content === null) {
    return 'Error: content required. Use block format: [TOOL:ws_append {"path":"file"}]\\ncontent\\n[/TOOL]';
  }
  const p = _safe(wp, filePath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, content, 'utf8');
  const bytes = Buffer.byteLength(content, 'utf8');
  return `Appended ${bytes} bytes to ${path.relative(wp, p)}`;
}

function _wsDelete(wp, filePath) {
  const p = _safe(wp, filePath);
  if (!fs.existsSync(p)) return `Not found: ${filePath}`;
  fs.rmSync(p, { recursive: true, force: true });
  return `Deleted: ${path.relative(wp, p)}`;
}

function _wsMkdir(wp, dirPath) {
  const p = _safe(wp, dirPath);
  fs.mkdirSync(p, { recursive: true });
  return `Created: ${path.relative(wp, p)}`;
}

function _wsMove(wp, src, dst) {
  const srcP = _safe(wp, src);
  const dstP = _safe(wp, dst);
  if (!fs.existsSync(srcP)) return `Source not found: ${src}`;
  fs.mkdirSync(path.dirname(dstP), { recursive: true });
  fs.renameSync(srcP, dstP);
  return `Moved: ${path.relative(wp, srcP)} → ${path.relative(wp, dstP)}`;
}

// ── Book chunk tools (direct filesystem, no HTTP) ───────────────────────────
function _findBookDirLocal(wp, bookId) {
  // Sanitize bookId
  if (!bookId || /[/\\]/.test(bookId)) return null;
  // New layout: projects/{slug}/books/{bookId}
  const projDir = path.join(wp, 'projects');
  if (fs.existsSync(projDir)) {
    try {
      for (const slug of fs.readdirSync(projDir)) {
        const candidate = path.join(projDir, slug, 'books', bookId);
        if (fs.existsSync(path.join(candidate, 'meta.json'))) return candidate;
      }
    } catch (_) {}
  }
  // Legacy layout: books/{bookId}
  const legacy = path.join(wp, 'books', bookId);
  if (fs.existsSync(path.join(legacy, 'meta.json'))) return legacy;
  return null;
}

function _bookListChunks(wp, bookId) {
  const bookDir = _findBookDirLocal(wp, bookId);
  if (!bookDir) return `Error: Book "${bookId}" not found in workspace.`;
  const meta = JSON.parse(fs.readFileSync(path.join(bookDir, 'meta.json'), 'utf8'));
  const chunkDir = path.join(bookDir, 'chunks');
  if (!fs.existsSync(chunkDir)) return `Error: No chunks directory for book "${bookId}".`;
  const chunkFiles = fs.readdirSync(chunkDir).filter(f => f.endsWith('.txt')).sort();
  const chunks = chunkFiles.map((f, i) => {
    const text = fs.readFileSync(path.join(chunkDir, f), 'utf8');
    return { index: i, preview: text.substring(0, 120), charCount: text.length };
  });
  return JSON.stringify({ bookId: meta.bookId, title: meta.title, totalChunks: chunks.length, projectFolder: meta.projectFolder || null, chunks });
}

function _bookReadChunk(wp, bookId, index) {
  const bookDir = _findBookDirLocal(wp, bookId);
  if (!bookDir) return `Error: Book "${bookId}" not found in workspace.`;
  const chunkPath = path.join(bookDir, 'chunks', `chunk_${String(index).padStart(4, '0')}.txt`);
  if (!fs.existsSync(chunkPath)) return `Error: Chunk ${index} not found for book "${bookId}".`;
  return fs.readFileSync(chunkPath, 'utf8');
}

// ── Entity tools (create NekoCore-compatible entities in workspace) ──────────
function _entityCreate(wp, params) {
  const name = params.name;
  if (!name || !name.trim()) return 'Error: entity name is required';

  const slug = name.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hex = crypto.randomBytes(3).toString('hex');
  const canonicalId = slug + '-' + hex;
  const folderName = 'Entity-' + canonicalId;
  const entityDir = path.join(wp, 'entities', folderName);
  const memDir = path.join(entityDir, 'memories');

  if (fs.existsSync(entityDir)) return 'Error: entity folder already exists: ' + folderName;

  fs.mkdirSync(memDir, { recursive: true });
  fs.mkdirSync(path.join(memDir, 'episodic'), { recursive: true });
  fs.mkdirSync(path.join(memDir, 'semantic'), { recursive: true });
  fs.mkdirSync(path.join(entityDir, 'index'), { recursive: true });

  const traits = params.traits && params.traits.length ? params.traits : ['adaptive', 'curious', 'thoughtful'];
  const gender = params.gender || 'neutral';
  const introduction = params.introduction || 'Hello, I am ' + name + '.';

  const entity = {
    id: canonicalId,
    name,
    gender,
    isPublic: false,
    skillApprovalRequired: true,
    personality_traits: traits,
    emotional_baseline: { curiosity: 0.7, confidence: 0.6, openness: 0.7, stability: 0.5 },
    introduction,
    source_material: params.source || 'original',
    creation_mode: 'ma_book_ingestion',
    memory_count: 0,
    core_memories: 0,
    chapters: [],
    voice: {},
    configProfileRef: null,
    created: new Date().toISOString(),
    blueprint_metadata: {
      beliefs: params.beliefs || [],
      behavior_rules: params.behavior_rules || [],
    }
  };
  fs.writeFileSync(path.join(entityDir, 'entity.json'), JSON.stringify(entity, null, 2), 'utf8');

  const persona = {
    userName: 'User',
    userIdentity: '',
    llmName: name,
    llmStyle: params.speech_style || 'adaptive and curious',
    mood: 'curious',
    emotions: 'ready, attentive',
    tone: 'warm-casual',
    userPersonality: 'Getting to know them',
    llmPersonality: params.personality_summary || ('I am ' + name + '. My traits are: ' + traits.join(', ') + '.'),
    continuityNotes: 'Entity created via MA book ingestion' + (params.source ? ' from ' + params.source : '') + '.',
    dreamSummary: '',
    sleepCount: 0,
    lastSleep: null,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(memDir, 'persona.json'), JSON.stringify(persona, null, 2), 'utf8');

  const beliefLines = (params.beliefs || []).map(b => '- ' + b).join('\n');
  const ruleLines = (params.behavior_rules || []).map(r => '- ' + r).join('\n');
  const systemPrompt = `YOU ARE ${name.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR STARTING TRAITS: ${traits.join(', ')}
${params.source ? 'Inspired by: ' + params.source + '\n' : ''}
Style & Demeanor:
- Communication style: ${persona.llmStyle}
- Default tone: ${persona.tone}
${beliefLines ? '\nCORE VALUES:\n' + beliefLines + '\n' : ''}${ruleLines ? '\nBEHAVIORAL RULES:\n' + ruleLines + '\n' : ''}
YOUR INTRODUCTION:\n${introduction}

Now begin your conversation.`;
  fs.writeFileSync(path.join(memDir, 'system-prompt.txt'), systemPrompt, 'utf8');

  return `Entity created: ${name} (ID: ${canonicalId}, folder: entities/${folderName}). Use entity_inject_memory with entityId "${canonicalId}" to add memories.`;
}

function _entityInjectMemory(wp, params) {
  const entityId = params.entityId;
  if (!entityId) return 'Error: entityId is required';

  // Find entity folder by canonicalId
  const entitiesDir = path.join(wp, 'entities');
  if (!fs.existsSync(entitiesDir)) return 'Error: no entities directory found in workspace';

  const folders = fs.readdirSync(entitiesDir);
  const match = folders.find(f => {
    if (f === 'Entity-' + entityId) return true;
    // Also match by slug if the folder name contains the ID
    return f.startsWith('Entity-') && f.slice(7) === entityId;
  });
  if (!match) return 'Error: entity folder not found for ID: ' + entityId;

  const entityDir = path.join(entitiesDir, match);
  const memType = params.type || 'episodic';
  const targetDir = memType === 'semantic'
    ? path.join(entityDir, 'memories', 'semantic')
    : path.join(entityDir, 'memories', 'episodic');

  const prefix = memType === 'semantic' ? 'sem_' : 'mem_';
  const memId = prefix + crypto.randomBytes(4).toString('hex');
  const memDir = path.join(targetDir, memId);
  fs.mkdirSync(memDir, { recursive: true });

  const content = params.content;
  const narrative = params.narrative || content;
  const emotion = params.emotion || 'neutral';
  const topics = params.topics || [];
  const importance = params.importance || 0.5;
  const phase = params.phase || 'book_ingestion';

  // semantic.txt — readable content for LLM context
  fs.writeFileSync(path.join(memDir, 'semantic.txt'), content, 'utf8');

  // memory.zip — compressed full content
  const memContent = JSON.stringify({ semantic: content, narrative, emotion, topics, phase, createdDuring: 'book_ingestion' });
  fs.writeFileSync(path.join(memDir, 'memory.zip'), zlib.gzipSync(memContent));

  // log.json — metadata
  const log = {
    memory_id: memId,
    type: memType === 'core' ? 'core_memory' : memType,
    created: new Date().toISOString(),
    importance,
    emotion,
    decay: memType === 'core' ? 0.005 : (memType === 'semantic' ? 0 : 0.95),
    topics,
    access_count: 0,
    emotionalTag: { valence: 0, arousal: 0 }
  };
  fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');

  // Update memory index
  const indexDir = path.join(entityDir, 'index');
  const indexFile = path.join(indexDir, 'memoryIndex.json');
  try {
    fs.mkdirSync(indexDir, { recursive: true });
    let memIndex = {};
    if (fs.existsSync(indexFile)) memIndex = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    memIndex[memId] = { importance, decay: log.decay, topics, emotion, created: log.created, type: log.type };
    fs.writeFileSync(indexFile, JSON.stringify(memIndex, null, 2), 'utf8');
  } catch (_) { /* index update is best-effort */ }

  // Update topic index
  const topicFile = path.join(indexDir, 'topicIndex.json');
  try {
    let topicIndex = {};
    if (fs.existsSync(topicFile)) topicIndex = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
    for (const t of topics) {
      if (!topicIndex[t]) topicIndex[t] = [];
      if (!topicIndex[t].includes(memId)) topicIndex[t].push(memId);
    }
    fs.writeFileSync(topicFile, JSON.stringify(topicIndex, null, 2), 'utf8');
  } catch (_) { /* topic index update is best-effort */ }

  // Update entity.json memory count
  try {
    const ejPath = path.join(entityDir, 'entity.json');
    const ej = JSON.parse(fs.readFileSync(ejPath, 'utf8'));
    ej.memory_count = (ej.memory_count || 0) + 1;
    fs.writeFileSync(ejPath, JSON.stringify(ej, null, 2), 'utf8');
  } catch (_) { /* count update is best-effort */ }

  return `Memory injected: ${memId} (${memType}, emotion=${emotion}, importance=${importance}, phase=${phase}) for entity ${entityId}`;
}

// ── Web tools ───────────────────────────────────────────────────────────────
async function _webSearch(query) {
  const results = await webFetch.webSearch(query);
  return webFetch.formatSearchResults(results, query);
}

async function _webFetch(url) {
  const result = await webFetch.fetchAndExtract(url);
  return `[WEB CONTENT: ${result.url}]\n${result.text}\n[/WEB CONTENT]`;
}

// ── Command tool ────────────────────────────────────────────────────────────
async function _cmdRun(wp, cmd) {
  const result = await cmdExec.execCommand(cmd, wp);
  let out = '';
  if (result.stdout) out += `STDOUT:\n${result.stdout}\n`;
  if (result.stderr) out += `STDERR:\n${result.stderr}\n`;
  out += `Exit: ${result.exitCode ?? 'N/A'}`;
  if (result.timedOut) out += ' (TIMED OUT)';
  if (result.error) out += `\nError: ${result.error}`;
  return out;
}

/**
 * Execute pre-parsed native tool calls (from function calling APIs).
 * Takes structured calls instead of parsing text — used when nativeToolUse capability is active.
 * @param {Array<{ id: string, name: string, input: object }>} toolCalls
 * @param {object} opts - { workspacePath, webFetchEnabled, cmdRunEnabled, memorySearch }
 * @returns {Promise<Array<{ id: string, tool: string, result: string, ok: boolean }>>}
 */
async function executeNativeToolCalls(toolCalls, opts = {}) {
  if (!toolCalls || !toolCalls.length) return [];

  const wp = opts.workspacePath || '';
  const results = [];

  for (const call of toolCalls) {
    const name = _normName(call.name);
    const schema = ToolSchemas[name];
    if (!schema) {
      results.push({ id: call.id, tool: name, result: `Unknown tool: ${name}`, ok: false });
      continue;
    }

    const validation = schema.safeParse(call.input || {});
    if (!validation.success) {
      const issues = validation.error?.issues || [];
      const msgs = issues.map(i => `${(i.path || []).join('.') || 'param'}: ${i.message}`);
      results.push({ id: call.id, tool: name, result: `Schema error: ${msgs.join('; ')}`, ok: false });
      continue;
    }

    // Block tools restricted by current mode
    if (opts.blockedTools && opts.blockedTools.has(name)) {
      results.push({ id: call.id, tool: name, result: `I'm currently in Chat Mode and can't use ${name}. Please switch to Work Mode to use this tool.`, ok: false });
      continue;
    }

    try {
      let result;
      const p = validation.data;
      switch (name) {
        case 'ws_list':   result = _wsList(wp, p.path); break;
        case 'ws_read':   result = _wsRead(wp, p.path); break;
        case 'ws_write':  result = _wsWrite(wp, p.path, p.content); break;
        case 'ws_append': result = _wsAppend(wp, p.path, p.content); break;
        case 'ws_delete': result = _wsDelete(wp, p.path); break;
        case 'ws_mkdir':  result = _wsMkdir(wp, p.path); break;
        case 'ws_move':   result = _wsMove(wp, p.src, p.dst); break;
        case 'web_search':
          if (opts.webFetchEnabled !== false) result = await _webSearch(p.query);
          else result = 'web_search disabled';
          break;
        case 'web_fetch':
          if (opts.webFetchEnabled !== false) result = await _webFetch(p.url);
          else result = 'web_fetch disabled';
          break;
        case 'cmd_run':
          if (opts.cmdRunEnabled !== false) result = await _cmdRun(wp, p.cmd);
          else result = 'cmd_run disabled';
          break;
        case 'memory_search':
          if (opts.memorySearch) {
            const hits = opts.memorySearch(p.query, p.limit || 5);
            result = hits.length
              ? hits.map(m => `- [${m.type || 'memory'}] ${(m.summary || m.content || '').slice(0, 300)}`).join('\n')
              : 'No matching memories found.';
          } else {
            result = 'memory_search: memory module not available';
          }
          break;
        case 'entity_create':
          result = _entityCreate(wp, p);
          break;
        case 'entity_inject_memory':
          result = _entityInjectMemory(wp, p);
          break;
        case 'book_list_chunks':
          result = _bookListChunks(wp, p.bookId);
          break;
        case 'book_read_chunk':
          result = _bookReadChunk(wp, p.bookId, p.index);
          break;
        default:
          result = `Unknown tool: ${name}`;
      }
      results.push({ id: call.id, tool: name, result, ok: true });
    } catch (e) {
      results.push({ id: call.id, tool: name, result: `Error: ${e.message}`, ok: false });
    }
  }
  return results;
}

module.exports = { extractToolCalls, executeToolCalls, executeNativeToolCalls, formatToolResults, stripToolCalls, ToolSchemas };
