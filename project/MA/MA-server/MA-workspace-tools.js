// ── MA Workspace Tools ───────────────────────────────────────────────────────
// File I/O + web + command tools for task execution.
// Parses [TOOL:name {json}] blocks from LLM output, validates with Zod, executes.
'use strict';

const fs   = require('fs');
const path = require('path');
const { z } = require('zod');
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
  memory_search:  z.object({ query: z.string(), limit: z.number().int().min(1).max(20).default(5) }),
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

module.exports = { extractToolCalls, executeToolCalls, formatToolResults, stripToolCalls, ToolSchemas };
