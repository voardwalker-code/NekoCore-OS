// ============================================================
// REM System — Workspace Tools
//
// Parses tool-call commands from entity LLM output and executes
// them against the configured workspace and web search.
//
// Three-pass parser (block → inline JSON → legacy quoted-string):
//
// Block format (ws_write / ws_append):
//   [TOOL:ws_write {"path":"notes.txt"}]
//   File content goes here...
//   [/TOOL]
//
// Inline JSON format:
//   [TOOL:ws_list {"path":"subdir"}]
//   [TOOL:ws_read {"path":"notes.txt"}]
//   [TOOL:web_search {"query":"quantum computing"}]
//
// Legacy format (backward compat):
//   [TOOL:ws_read path="notes.txt"]
//   [TOOL:ws_write path="notes.txt" content="Hello world"]
//
// Returns: { hadTools, cleanedResponse, toolResults[] }
// ============================================================

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// ── Zod Tool Schemas ────────────────────────────────────────────────────────
const ToolSchemas = {
  ws_list:        z.object({ path: z.string().default('.') }),
  ws_read:        z.object({ path: z.string() }),
  ws_write:       z.object({ path: z.string(), content: z.string().optional() }),
  ws_append:      z.object({ path: z.string(), content: z.string().optional() }),
  ws_delete:      z.object({ path: z.string() }),
  ws_mkdir:       z.object({ path: z.string() }),
  ws_move:        z.object({ src: z.string(), dst: z.string() }),
  web_search:     z.object({ query: z.string() }),
  web_fetch:      z.object({ url: z.string() }),
  mem_search:     z.object({ query: z.string().optional(), search: z.string().optional() }),
  mem_create:     z.object({ semantic: z.string().optional(), importance: z.string().optional(), emotion: z.string().optional(), topics: z.string().optional() }).passthrough(),
  search_archive: z.object({ query: z.string(), yearRange: z.string().optional(), limit: z.union([z.string(), z.number()]).optional() }),
  skill_create:   z.object({ name: z.string(), description: z.string().optional(), instructions: z.string().optional() }).passthrough(),
  skill_list:     z.object({}).passthrough(),
  skill_edit:     z.object({ name: z.string(), instructions: z.string().optional() }).passthrough(),
  profile_update: z.object({}).passthrough(),
  cmd_run:        z.object({ cmd: z.string().optional(), command: z.string().optional(), timeout: z.union([z.string(), z.number()]).optional() }),
};

// ── Regex patterns ──────────────────────────────────────────────────────────
// Block: [TOOL:ws_write {"path":"f"}]\ncontent\n[/TOOL]  (only ws_write/ws_append)
const BLOCK_RE = /\[TOOL:(ws[-_]write|ws[-_]append)\s*(\{[\s\S]*?\})?\s*\]\n?([\s\S]*?)\[\s*\/\s*TOOL\s*\]/gi;
// Inline JSON: [TOOL:name {"key":"val"}] or [TOOL:name]
const INLINE_RE = /\[TOOL:(\w[\w-]*)\s*(\{[\s\S]*?\})?\s*\]/gi;
// Legacy: [TOOL:name param="value" param2="value2"]
const LEGACY_RE = /\[TOOL:\s*([a-zA-Z_][\w-]*)\s*((?:\s+[a-zA-Z_][\w-]*\s*=\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))*)\s*\]/gi;
// Strip pattern: blocks first, then inline, then legacy
const STRIP_RE = /\[TOOL:[\s\S]*?\[\s*\/\s*TOOL\s*\]|\[TOOL:\w[\w-]*\s*(?:\{[\s\S]*?\})?\s*\]|\[TOOL:\s*[a-zA-Z_][\w-]*\s*(?:\s+[a-zA-Z_][\w-]*\s*=\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))*\s*\]/gi;

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
  if (!schema) return { ok: true, data: raw || {} }; // unknown tools pass through — caught at execution

  const params = { ...raw };
  if (blockContent !== undefined && (name === 'ws_write' || name === 'ws_append')) {
    params.content = blockContent;
  }

  const result = schema.safeParse(params);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    const msgs = issues.map(i => `${(i.path || []).join('.') || 'param'}: ${i.message}`);
    return { ok: false, error: `${name} schema error: ${msgs.join('; ')}` };
  }
  return { ok: true, data: result.data };
}

function _parseLegacyParams(paramStr) {
  const params = {};
  const paramRegex = /([a-zA-Z_][\w-]*)\s*=\s*("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while ((m = paramRegex.exec(paramStr)) !== null) {
    const raw = m[3] !== undefined ? m[3] : m[4];
    params[m[1]] = String(raw || '').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  return params;
}

/**
 * Extract tool calls from LLM output.
 *
 * Three-pass strategy:
 *  1. Block format — [TOOL:ws_write {"path":"..."}]\ncontent\n[/TOOL]
 *  2. Inline JSON  — [TOOL:name {"key":"value"}]
 *  3. Legacy       — [TOOL:name param="value"] (backward compat)
 *
 * Returns array of { command, params, error? }
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
    const command = _normName(m[1]);
    const json = _parseJSON(m[2]);
    if (json === null) {
      calls.push({ command, params: {}, error: `Invalid JSON in [TOOL:${command}]: ${m[2]}`, _pos: m.index });
    } else {
      const v = _validate(command, json, m[3]);
      calls.push(v.ok
        ? { command, params: v.data, _pos: m.index }
        : { command, params: {}, error: v.error, _pos: m.index });
    }
  }

  // Pass 2: Inline JSON — skip positions covered by blocks
  const inlineRe = new RegExp(INLINE_RE.source, INLINE_RE.flags);
  while ((m = inlineRe.exec(cleaned))) {
    if (_overlaps(m.index, m[0].length, matched)) continue;
    matched.push([m.index, m.index + m[0].length]);
    const command = _normName(m[1]);
    const json = _parseJSON(m[2]);
    if (json === null) {
      calls.push({ command, params: {}, error: `Invalid JSON in [TOOL:${command}]: ${m[2]}`, _pos: m.index });
    } else {
      const v = _validate(command, json, undefined);
      calls.push(v.ok
        ? { command, params: v.data, _pos: m.index }
        : { command, params: {}, error: v.error, _pos: m.index });
    }
  }

  // Pass 3: Legacy quoted-string — backward compatibility
  const legacyRe = new RegExp(LEGACY_RE.source, LEGACY_RE.flags);
  while ((m = legacyRe.exec(cleaned))) {
    if (_overlaps(m.index, m[0].length, matched)) continue;
    const command = _normName(m[1]);
    const raw = _parseLegacyParams(m[2] || '');
    const v = _validate(command, raw, undefined);
    calls.push(v.ok
      ? { command, params: v.data, _pos: m.index }
      : { command, params: raw, error: v.error, _pos: m.index });
  }

  // Sort by document order, strip internal position marker
  calls.sort((a, b) => a._pos - b._pos);
  return calls.map(({ _pos, ...rest }) => rest);
}

/** Remove tool blocks from text (including block format and code-fenced tool calls). */
function stripToolCalls(text) {
  if (!text) return '';
  let out = _preCleanToolText(text);
  out = out.replace(STRIP_RE, '');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Execute workspace tool calls found in the LLM output.
 *
 * @param {string} responseText - The LLM's raw response text
 * @param {Object} options
 * @param {string} options.workspacePath - Configured workspace root directory
 * @param {Object} [options.webFetch] - The web-fetch module (for web_search/web_fetch)
 * @returns {{ hadTools: boolean, cleanedResponse: string, toolResults: Array }}
 */
async function executeToolCalls(responseText, options = {}) {
  const calls = extractToolCalls(responseText);
  if (calls.length === 0) {
    return { hadTools: false, cleanedResponse: responseText, toolResults: [] };
  }

  const wsRoot = options.workspacePath;
  const webFetch = options.webFetch;
  const toolResults = [];

  // Limit to 8 tool calls per turn to prevent abuse
  const maxCalls = Math.min(calls.length, 8);

  for (let i = 0; i < maxCalls; i++) {
    const call = calls[i];
    const command = call.command;

    // Zod validation errors are surfaced without throwing
    if (call.error) {
      toolResults.push({ command, params: call.params || {}, result: { ok: false, error: call.error }, ok: false });
      continue;
    }

    let result;
    try {
      switch (command) {
        case 'ws_list':
          result = await execWsList(wsRoot, call.params.path || '.');
          break;
        case 'ws_read':
          result = await execWsRead(wsRoot, call.params.path);
          break;
        case 'ws_write':
          result = await execWsWrite(wsRoot, call.params.path, call.params.content || '');
          break;
        case 'ws_append':
          result = await execWsAppend(wsRoot, call.params.path, call.params.content || '');
          break;
        case 'ws_delete':
          result = await execWsDelete(wsRoot, call.params.path);
          break;
        case 'ws_move':
          result = await execWsMove(wsRoot, call.params.src, call.params.dst);
          break;
        case 'ws_mkdir':
          result = await execWsMkdir(wsRoot, call.params.path);
          break;
        case 'web_search':
          result = await execWebSearch(webFetch, call.params.query);
          break;
        case 'web_fetch':
          result = await execWebFetch(webFetch, call.params.url);
          break;
        case 'mem_search':
          if (options.memorySearch) {
            result = await options.memorySearch(call.params.query || call.params.search || '');
          } else {
            result = { ok: false, error: 'Memory search not available' };
          }
          break;
        case 'mem_create':
          if (options.memoryCreate) {
            result = await options.memoryCreate(call.params);
          } else {
            result = { ok: false, error: 'Memory creation not available' };
          }
          break;
        case 'search_archive':
          if (options.archiveSearch) {
            result = await options.archiveSearch(
              call.params.query || '',
              call.params.yearRange || null,
              parseInt(call.params.limit, 10) || 5
            );
          } else {
            result = { ok: false, error: 'Archive search not available' };
          }
          break;
        case 'skill_create':
          if (options.skillCreate) {
            result = await options.skillCreate(call.params);
          } else {
            result = { ok: false, error: 'Skill creation not available' };
          }
          break;
        case 'skill_list':
          if (options.skillList) {
            result = await options.skillList();
          } else {
            result = { ok: false, error: 'Skill listing not available' };
          }
          break;
        case 'skill_edit':
          if (options.skillEdit) {
            result = await options.skillEdit(call.params);
          } else {
            result = { ok: false, error: 'Skill editing not available' };
          }
          break;
        case 'profile_update':
          if (options.profileUpdate) {
            result = await options.profileUpdate(call.params);
          } else {
            result = { ok: false, error: 'Profile update not available' };
          }
          break;
        case 'cmd_run':
          if (options.cmdRun) {
            result = await options.cmdRun(
              call.params.cmd || call.params.command || '',
              wsRoot,
              { timeout: call.params.timeout ? parseInt(call.params.timeout, 10) : undefined }
            );
          } else {
            result = { ok: false, error: 'Command execution not available' };
          }
          break;
        default:
          result = { ok: false, error: `Unknown tool: ${call.command}` };
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }
    toolResults.push({ command, params: call.params, result, ok: result.ok !== false });
  }

  const cleanedResponse = stripToolCalls(responseText);
  return { hadTools: true, cleanedResponse, toolResults };
}

// ── Safe path resolution ──
function resolveSafe(wsRoot, relPath) {
  if (!wsRoot) return null;
  const resolved = path.resolve(wsRoot, relPath || '.');
  if (!resolved.startsWith(path.resolve(wsRoot))) return null;
  return resolved;
}

// ── Tool implementations ──

async function execWsList(wsRoot, relPath) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  const dir = resolveSafe(wsRoot, relPath);
  if (!dir) return { ok: false, error: 'Path outside workspace' };
  if (!fs.existsSync(dir)) return { ok: true, files: [] };
  const entries = fs.readdirSync(dir).map(name => {
    try {
      const stat = fs.statSync(path.join(dir, name));
      return stat.isDirectory() ? name + '/' : name;
    } catch { return name; }
  });
  return { ok: true, files: entries };
}

async function execWsRead(wsRoot, relPath) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  if (!relPath) return { ok: false, error: 'No path specified' };
  const filep = resolveSafe(wsRoot, relPath);
  if (!filep) return { ok: false, error: 'Path outside workspace' };
  if (!fs.existsSync(filep)) return { ok: false, error: 'File not found: ' + relPath };
  const stat = fs.statSync(filep);
  if (stat.size > 100 * 1024) return { ok: false, error: 'File too large (>100KB)' };
  const content = fs.readFileSync(filep, 'utf-8');
  return { ok: true, content: content.slice(0, 8000) };
}

async function execWsWrite(wsRoot, relPath, content) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  if (!relPath) return { ok: false, error: 'No path specified' };
  const filep = resolveSafe(wsRoot, relPath);
  if (!filep) return { ok: false, error: 'Path outside workspace' };
  const dir = path.dirname(filep);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filep, content, 'utf-8');
  return { ok: true, message: 'Written ' + relPath + ' (' + content.length + ' bytes)' };
}

async function execWsAppend(wsRoot, relPath, content) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  if (!relPath) return { ok: false, error: 'No path specified' };
  const filep = resolveSafe(wsRoot, relPath);
  if (!filep) return { ok: false, error: 'Path outside workspace' };
  const dir = path.dirname(filep);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filep, content, 'utf-8');
  return { ok: true, message: 'Appended to ' + relPath + ' (' + content.length + ' chars added)' };
}

async function execWsDelete(wsRoot, relPath) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  if (!relPath) return { ok: false, error: 'No path specified' };
  const filep = resolveSafe(wsRoot, relPath);
  if (!filep) return { ok: false, error: 'Path outside workspace' };
  if (!fs.existsSync(filep)) return { ok: true, message: 'Already gone' };
  fs.unlinkSync(filep);
  return { ok: true, message: 'Deleted ' + relPath };
}

async function execWsMkdir(wsRoot, relPath) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  if (!relPath) return { ok: false, error: 'No path specified' };
  const dir = resolveSafe(wsRoot, relPath);
  if (!dir) return { ok: false, error: 'Path outside workspace' };
  if (fs.existsSync(dir)) return { ok: true, message: 'Directory already exists: ' + relPath };
  fs.mkdirSync(dir, { recursive: true });
  return { ok: true, message: 'Created directory: ' + relPath };
}

async function execWsMove(wsRoot, srcRelPath, dstRelPath) {
  if (!wsRoot) return { ok: false, error: 'No workspace configured' };
  if (!srcRelPath) return { ok: false, error: 'No source path specified' };
  if (!dstRelPath) return { ok: false, error: 'No destination path specified' };

  const srcPath = resolveSafe(wsRoot, srcRelPath);
  const dstPath = resolveSafe(wsRoot, dstRelPath);
  if (!srcPath || !dstPath) return { ok: false, error: 'Path outside workspace' };
  if (!fs.existsSync(srcPath)) return { ok: false, error: 'Source not found: ' + srcRelPath };
  if (srcPath === dstPath) return { ok: false, error: 'Source and destination are the same path' };

  const dstDir = path.dirname(dstPath);
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });

  try {
    fs.renameSync(srcPath, dstPath);
    return { ok: true, message: `Moved ${srcRelPath} -> ${dstRelPath}` };
  } catch (err) {
    // Cross-device moves (EXDEV) require copy + remove fallback.
    if (err && err.code === 'EXDEV') {
      const srcStat = fs.statSync(srcPath);
      if (srcStat.isDirectory()) {
        fs.cpSync(srcPath, dstPath, { recursive: true });
        fs.rmSync(srcPath, { recursive: true, force: true });
      } else {
        fs.copyFileSync(srcPath, dstPath);
        fs.unlinkSync(srcPath);
      }
      return { ok: true, message: `Moved ${srcRelPath} -> ${dstRelPath}` };
    }
    return { ok: false, error: 'Move failed: ' + err.message };
  }
}

async function execWebSearch(webFetch, query) {
  if (!webFetch || !webFetch.webSearch) return { ok: false, error: 'Web search not available' };
  if (!query) return { ok: false, error: 'No query specified' };
  try {
    const results = await webFetch.webSearch(query);
    return { ok: true, results: (results || []).slice(0, 5) };
  } catch (err) {
    return { ok: false, error: 'Search failed: ' + err.message };
  }
}

async function execWebFetch(webFetch, url) {
  if (!webFetch || !webFetch.fetchAndExtract) return { ok: false, error: 'Web fetch not available' };
  if (!url) return { ok: false, error: 'No URL specified' };
  try {
    const result = await webFetch.fetchAndExtract(url);
    return { ok: true, text: (result.text || '').slice(0, 6000) };
  } catch (err) {
    return { ok: false, error: 'Fetch failed: ' + err.message };
  }
}

/**
 * Format tool results into structured blocks for the LLM follow-up call.
 * Uses [TOOL_RESULT: name]...[/TOOL_RESULT] wrapper for reliable re-parsing.
 */
function formatToolResults(toolResults) {
  if (!toolResults || toolResults.length === 0) return '';
  const blocks = [];
  for (const tr of toolResults) {
    const lines = [];
    if (tr.result && tr.result.ok === false) {
      lines.push('ERROR: ' + (tr.result.error || 'Unknown error'));
    } else if (tr.result && tr.result.files) {
      lines.push(tr.result.files.length === 0 ? '(empty directory)' : tr.result.files.join('\n'));
    } else if (tr.result && tr.result.content !== undefined) {
      lines.push(tr.result.content);
    } else if (tr.result && tr.result.results) {
      for (const r of tr.result.results) {
        lines.push(`• ${r.title || '(no title)'}\n  ${r.url || ''}\n  ${r.snippet || ''}`);
      }
    } else if (tr.result && tr.result.skills) {
      for (const s of tr.result.skills) {
        lines.push(`\u2022 [${s.enabled ? 'ON' : 'OFF'}] ${s.name} — ${s.description || '(no description)'}`);
      }
    } else if (tr.result && tr.result.memories) {
      for (const m of tr.result.memories) {
        const topicStr = Array.isArray(m.topics) ? m.topics.join(', ') : '';
        lines.push(`• [${m.type || 'memory'}] id=${m.id} score=${Number(m.relevanceScore || 0).toFixed(3)} topics=[${topicStr}] summary="${m.semantic || 'n/a'}"`);
      }
      if (tr.result.chatlogContext && tr.result.chatlogContext.length > 0) {
        lines.push('\n[RELATED CHATLOGS]:');
        for (const cl of tr.result.chatlogContext) {
          lines.push(`--- chatlog id=${cl.id} topic_overlap=${cl.overlap} ---`);
          if (cl.sessionMeta) lines.push(cl.sessionMeta);
          lines.push(cl.content);
          lines.push('--- end ---');
        }
      }
    } else if (tr.result && tr.result.text) {
      lines.push(tr.result.text.slice(0, 4000));
    } else if (tr.result && (tr.result.stdout !== undefined || tr.result.stderr !== undefined)) {
      if (tr.result.stdout) lines.push('STDOUT:\n' + tr.result.stdout.slice(0, 4000));
      if (tr.result.stderr) lines.push('STDERR:\n' + tr.result.stderr.slice(0, 4000));
      if (tr.result.exitCode !== undefined) lines.push('Exit code: ' + tr.result.exitCode);
      if (tr.result.timedOut) lines.push('(command timed out)');
    } else if (tr.result && tr.result.message) {
      lines.push(tr.result.message);
    } else if (typeof tr.result === 'string') {
      lines.push(tr.result);
    }
    blocks.push(`[TOOL_RESULT: ${tr.command}]\n${lines.join('\n')}\n[/TOOL_RESULT]`);
  }
  return blocks.join('\n\n');
}

module.exports = { extractToolCalls, executeToolCalls, formatToolResults, stripToolCalls };
