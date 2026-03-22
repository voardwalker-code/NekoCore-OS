#!/usr/bin/env node
// ── MA-Server.js ────────────────────────────────────────────────────────────
// MA — HTTP server shell. Thin layer over MA-core.
// All business logic lives in server/MA-core.js.
// Start: node MA-Server.js
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const core = require('./MA-server/MA-core');
const cmdExec = require('./MA-server/MA-cmd-executor');
const llm     = require('./MA-server/MA-llm');
const pulse   = require('./MA-server/MA-pulse');
const modelRouter = require('./MA-server/MA-model-router');

// ── Paths ───────────────────────────────────────────────────────────────────
const CLIENT_DIR    = path.join(core.MA_ROOT, 'MA-client');
const DEFAULT_PORT  = 3850;
const FALLBACK_PORT = 3851;

// ── HTTP helpers ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/plain'
};

// ── User Guide as HTML ──────────────────────────────────────────────────────
function renderMarkdownToHtml(md) {
  // Lightweight markdown→HTML for the user guide
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\| (.+) \|$/gm, (m) => {
      const cells = m.slice(1, -1).split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '';
      const tag = m.includes('---') ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/^```(\w*)$/gm, '<pre><code>').replace(/^```$/gm, '</code></pre>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^---$/gm, '<hr>');
  // Wrap li sequences in ul
  html = html.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => '<ul>' + m + '</ul>');
  // Wrap tr sequences in table
  html = html.replace(/(<tr>.*?<\/tr>\n?)+/gs, (m) => '<table border="1" cellpadding="6" cellspacing="0">' + m + '</table>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MA — User Guide</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#0d1117;color:#c9d1d9;line-height:1.6}
h1,h2,h3{color:#58a6ff}code{background:#161b22;padding:2px 6px;border-radius:4px;font-size:0.9em}
pre{background:#161b22;padding:16px;border-radius:8px;overflow-x:auto}pre code{padding:0;background:none}
table{border-collapse:collapse;margin:12px 0}th,td{padding:8px 12px;border:1px solid #30363d;text-align:left}th{background:#161b22}
ul{padding-left:24px}li{margin:4px 0}a{color:#58a6ff}hr{border:0;border-top:1px solid #30363d;margin:24px 0}
strong{color:#e6edf3}</style></head><body><p>${html}</p></body></html>`;
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => { size += c.length; if (size > 10485760) { reject(new Error('Body too large')); req.destroy(); } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── Slash command handler (for GUI) ─────────────────────────────────────────
async function handleSlashCommand(line) {
  const parts = line.slice(1).split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  switch (cmd) {
    case 'health': {
      const result = core.health.scan();
      return { type: 'system', text: core.health.formatReport(result) };
    }
    case 'memory': {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'stats') {
        const mem = core.getMemory();
        return { type: 'system', text: mem ? JSON.stringify(mem.stats(), null, 2) : 'No memory store' };
      }
      if (sub === 'search') {
        const q = parts.slice(2).join(' ');
        if (!q) return { type: 'system', text: 'Usage: /memory search <query>' };
        const mem = core.getMemory();
        const results = mem ? mem.search(q, 5) : [];
        if (!results.length) return { type: 'system', text: 'No results.' };
        const text = results.map(r => `[${r.score.toFixed(2)}] ${(r.summary || '').slice(0, 120)}`).join('\n');
        return { type: 'system', text };
      }
      return { type: 'system', text: 'Usage: /memory stats | /memory search <query>' };
    }
    case 'knowledge': {
      if (!arg) {
        const docs = core.listKnowledge();
        return { type: 'system', text: docs.length ? 'Knowledge docs:\n' + docs.join('\n') : 'No knowledge docs.' };
      }
      const content = core.loadKnowledge(arg);
      return { type: 'system', text: content || `Not found: ${arg}` };
    }
    case 'ingest': {
      if (!arg) return { type: 'system', text: 'Usage: /ingest <filepath>' };
      try {
        const mem = core.getMemory();
        const result = mem.ingest(arg, {});
        return { type: 'system', text: `Ingested: ${result.chunksStored} chunks` };
      } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
    }
    case 'config': {
      const cfg = core.getConfig();
      if (cfg) return { type: 'system', text: `Type: ${cfg.type}\nModel: ${cfg.model}\nEndpoint: ${cfg.endpoint}\nMax Tokens: ${cfg.maxTokens || 12288}` };
      return { type: 'system', text: 'Not configured. Click ⚙ to set up.' };
    }
    case 'projects': {
      const projects = core.projectArchive.listProjects();
      if (!projects.length) return { type: 'system', text: 'No project archives.' };
      const text = projects.map(p => `${p.id} (${p.status}) — ${p.name}, ${p.nodeCount || 0} nodes`).join('\n');
      return { type: 'system', text: 'Project Archives:\n' + text };
    }
    case 'project': {
      const sub = (parts[1] || '').toLowerCase();
      const id = parts.slice(2).join(' ').trim();
      if (sub === 'open' && id) {
        try {
          const p = core.projectArchive.resumeProject(id);
          return { type: 'system', text: `Project ${p.id} reopened (${p.status}). ${p.nodeCount || 0} nodes, ${p.edgeCount || 0} edges.` };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'close' && id) {
        try {
          const p = core.projectArchive.closeProject(id);
          return { type: 'system', text: `Project ${p.id} closed.` };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'status' && id) {
        const s = core.projectArchive.getArchiveStats(id);
        if (!s) return { type: 'system', text: `Project not found: ${id}` };
        return { type: 'system', text: JSON.stringify(s, null, 2) };
      }
      return { type: 'system', text: 'Usage: /project open|close|status <id>' };
    }
    case 'whitelist': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub) {
        const wl = cmdExec.getWhitelist();
        const lines = Object.entries(wl).map(([bin, subs]) =>
          subs ? `  ${bin}: [${subs.join(', ')}]` : `  ${bin}: (all subcommands)`
        );
        return { type: 'system', text: 'Command Whitelist:\n' + lines.join('\n') };
      }
      if (sub === 'add') {
        const bin = parts[2];
        if (!bin) return { type: 'system', text: 'Usage: /whitelist add <binary> [sub1,sub2,...]' };
        const subs = parts[3] ? parts[3].split(',').map(s => s.trim()).filter(Boolean) : null;
        try {
          cmdExec.whitelistAdd(bin, subs);
          return { type: 'system', text: `Added: ${bin}` + (subs ? ` [${subs.join(', ')}]` : ' (all subcommands)') };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'remove') {
        const bin = parts[2];
        if (!bin) return { type: 'system', text: 'Usage: /whitelist remove <binary>' };
        try {
          cmdExec.whitelistRemove(bin);
          return { type: 'system', text: `Removed: ${bin}` };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'reset') {
        cmdExec.whitelistReset();
        return { type: 'system', text: 'Whitelist reset to defaults.' };
      }
      return { type: 'system', text: 'Usage: /whitelist | /whitelist add|remove|reset' };
    }
    case 'pulse': {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'status' || !sub) {
        const status = pulse.getPulseStatus();
        const cfg = pulse.getPulseConfig();
        const lines = ['Pulse Status:'];
        for (const [id, s] of Object.entries(status)) {
          lines.push(`  ${id}: running (every ${(s.intervalMs / 60000).toFixed(0)}min, since ${s.startedAt})`);
        }
        lines.push('\nConfig:');
        for (const [id, c] of Object.entries(cfg)) {
          lines.push(`  ${id}: ${c.enabled ? 'enabled' : 'disabled'}, interval: ${(c.intervalMs / 60000).toFixed(0)}min`);
        }
        return { type: 'system', text: lines.join('\n') };
      }
      if (sub === 'start') {
        pulse.startAll();
        return { type: 'system', text: 'Pulses started.' };
      }
      if (sub === 'stop') {
        pulse.stopAll();
        return { type: 'system', text: 'Pulses stopped.' };
      }
      if (sub === 'log') {
        const logType = parts[2] || 'health';
        const lines = pulse.readLog(`pulse-${logType}.log`, 20);
        return { type: 'system', text: lines.length ? lines.join('\n') : 'No log entries.' };
      }
      return { type: 'system', text: 'Usage: /pulse [status|start|stop|log health|log chores]' };
    }
    case 'chores': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub || sub === 'list') {
        const data = pulse.getChores();
        if (!data.chores.length) return { type: 'system', text: 'No chores defined. Use /chores add <name> | <description>' };
        const lines = data.chores.map(c => {
          const status = c.enabled ? '✓' : '✗';
          const grade = c.lastGrade ? ` [${c.lastGrade}]` : '';
          const runs = c.runCount || 0;
          return `  ${status} ${c.name} (${c.id}) — runs: ${runs}${grade}${c.assignTo ? ', agent: ' + c.assignTo : ''}`;
        });
        return { type: 'system', text: 'Chores:\n' + lines.join('\n') };
      }
      if (sub === 'add') {
        const rest = parts.slice(2).join(' ');
        const [name, description] = rest.split('|').map(s => s.trim());
        if (!name) return { type: 'system', text: 'Usage: /chores add <name> | <description>' };
        try {
          const c = pulse.addChore({ name, description: description || '' });
          return { type: 'system', text: `Added chore: ${c.name} (${c.id})` };
        } catch (e) { return { type: 'system', text: 'Error: ' + e.message }; }
      }
      if (sub === 'remove') {
        const id = parts.slice(2).join(' ').trim();
        if (!id) return { type: 'system', text: 'Usage: /chores remove <id>' };
        try {
          pulse.removeChore(id);
          return { type: 'system', text: 'Removed: ' + id };
        } catch (e) { return { type: 'system', text: 'Error: ' + e.message }; }
      }
      if (sub === 'run') {
        const id = parts.slice(2).join(' ').trim();
        if (!id) return { type: 'system', text: 'Usage: /chores run <id>' };
        const data = pulse.getChores();
        const chore = data.chores.find(c => c.id === id);
        if (!chore) return { type: 'system', text: 'Chore not found: ' + id };
        return { type: 'system', text: `Running chore "${chore.name}"... check /pulse log chores for results.` };
      }
      return { type: 'system', text: 'Usage: /chores [list|add|remove|run]' };
    }
    case 'models': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub || sub === 'list') {
        const roster = modelRouter.getRoster();
        if (!roster.models.length) return { type: 'system', text: 'Model roster is empty. Use /models add <provider> <model> [endpoint] to add models.' };
        const lines = roster.models.map(m => {
          const status = m.enabled ? '✓' : '✗';
          const ctx = m.contextWindow ? `${(m.contextWindow / 1024).toFixed(0)}k ctx` : '';
          const cost = (m.costPer1kIn || 0) > 0 ? `$${m.costPer1kIn}/1k in` : 'free';
          return `  ${status} ${m.id} (${m.tier}) — ${ctx}, ${cost}${m.strengths?.length ? ', strengths: ' + m.strengths.join(', ') : ''}`;
        });
        return { type: 'system', text: 'Model Roster:\n' + lines.join('\n') };
      }
      if (sub === 'add') {
        const provider = parts[2];
        const modelName = parts[3];
        if (!provider || !modelName) return { type: 'system', text: 'Usage: /models add <provider> <model> [endpoint]\nProvider: ollama or openrouter\nExample: /models add ollama llama3.1:8b http://localhost:11434' };
        const endpoint = parts[4] || (provider === 'ollama' ? 'http://localhost:11434' : '');
        const result = modelRouter.addModel({ provider, model: modelName, endpoint });
        if (!result.ok) return { type: 'system', text: 'Error: ' + result.error };
        return { type: 'system', text: `Added: ${result.model.id} (${result.model.tier})` };
      }
      if (sub === 'remove') {
        const id = parts.slice(2).join(' ').trim();
        if (!id) return { type: 'system', text: 'Usage: /models remove <id>' };
        const result = modelRouter.removeModel(id);
        if (!result.ok) return { type: 'system', text: 'Error: ' + result.error };
        return { type: 'system', text: 'Removed: ' + id };
      }
      if (sub === 'perf' || sub === 'performance') {
        const summary = modelRouter.getPerformanceSummary();
        return { type: 'system', text: 'Model Performance:\n' + summary };
      }
      if (sub === 'route') {
        const testMsg = parts.slice(2).join(' ') || 'write a python script';
        const taskType = core.tasks.classify(testMsg);
        const routed = modelRouter.routeModel(testMsg, taskType.taskType, null, core.getConfig());
        if (!routed.routed) return { type: 'system', text: 'Would use primary config (no roster match).\nReason: ' + routed.reason };
        return { type: 'system', text: `Would route to: ${routed.modelId} (score: ${routed.score})\nReason: ${routed.reason}${routed.alternatives?.length ? '\nAlternatives:\n' + routed.alternatives.map(a => `  ${a.id} (score: ${a.score})`).join('\n') : ''}` };
      }
      if (sub === 'research') {
        const modelName = parts.slice(2).join(' ').trim();
        if (!modelName) return { type: 'system', text: 'Usage: /models research <model-name-or-roster-id>' };
        try {
          const result = await modelRouter.researchAndUpdate(modelName);
          if (!result.ok) return { type: 'system', text: 'Research failed: ' + (result.error || 'unknown') };
          const info = result.info;
          const lines = [`Model: ${info.modelName}`, info.summary || '', `Context: ${info.contextWindow || 'unknown'}`, `Tier: ${info.tier || 'unknown'}`, `Cost: $${info.costPer1kIn || 0}/$${info.costPer1kOut || 0} per 1k tokens`, `Strengths: ${(info.strengths || []).join(', ') || 'unknown'}`, `Weaknesses: ${(info.weaknesses || []).join(', ') || 'unknown'}`];
          if (result.updated?.length) lines.push(`Updated roster fields: ${result.updated.join(', ')}`);
          return { type: 'system', text: lines.filter(Boolean).join('\n') };
        } catch (e) { return { type: 'system', text: 'Error: ' + e.message }; }
      }
      return { type: 'system', text: 'Usage: /models [list|add|remove|perf|route|research]' };
    }
    case 'worklog': {
      const state = core.worklog.getState();
      if (!state.activeProject && !state.resumePoint && (!state.recentWork || !state.recentWork.length)) {
        return { type: 'system', text: 'No worklog entries yet.' };
      }
      const lines = ['MA Worklog:'];
      if (state.activeProject) lines.push(`Active project: ${state.activeProject}`);
      if (state.currentTask) lines.push(`Current task: ${state.currentTask}`);
      if (state.resumePoint) lines.push(`Resume: ${state.resumePoint}`);
      if (state.recentWork && state.recentWork.length) {
        lines.push('\nRecent work:');
        for (const w of state.recentWork.slice(-5)) lines.push(`  ${w.date} \u2014 ${w.task} (${w.status})`);
      }
      return { type: 'system', text: lines.join('\n') };
    }
    default:
      return { type: 'system', text: `Unknown command: /${cmd}. Type / to see available commands.` };
  }
}

// ── Route handler ───────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  try {
    // ── API routes ────────────────────────────────────────────────────

    // SSE streaming endpoint — sends step progress events for multi-step tasks
    if (url.pathname === '/api/chat/stream' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const result = await core.handleChat({
          message: body.message,
          history: body.history,
          attachments: body.attachments,
          onStep: async (stepInfo) => {
            sendEvent('step', {
              stepIndex: stepInfo.stepIndex,
              stepTotal: stepInfo.stepTotal,
              description: stepInfo.description,
              summary: (stepInfo.output || '').slice(0, 300)
            });
          },
          onActivity: async (category, detail, data) => {
            sendEvent('activity', { category, detail, data, ts: new Date().toISOString() });
          }
        });
        console.log('[DEBUG] SSE done result keys:', Object.keys(result), 'filesChanged:', JSON.stringify(result.filesChanged));
        sendEvent('done', result);
      } catch (e) {
        sendEvent('error', { error: e.message });
      }
      res.write('event: close\ndata: {}\n\n');
      return res.end();
    }

    if (url.pathname === '/api/chat' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const result = await core.handleChat({
        message: body.message,
        history: body.history,
        attachments: body.attachments
      });
      return json(res, 200, result);
    }

    // ── Chat history persistence (survives page refresh) ──────────────
    if (url.pathname === '/api/chat/history' && method === 'GET') {
      const histFile = path.join(path.dirname(core.CONFIG_PATH), 'chat-history.json');
      if (fs.existsSync(histFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(histFile, 'utf8'));
          return json(res, 200, data);
        } catch { return json(res, 200, { messages: [] }); }
      }
      return json(res, 200, { messages: [] });
    }

    if (url.pathname === '/api/chat/history' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const histFile = path.join(path.dirname(core.CONFIG_PATH), 'chat-history.json');
      const messages = (body.messages || []).slice(-8); // Keep last 8 messages (4 exchanges)
      fs.writeFileSync(histFile, JSON.stringify({ messages, savedAt: new Date().toISOString() }, null, 2));
      return json(res, 200, { ok: true, saved: messages.length });
    }

    if (url.pathname === '/api/config' && method === 'GET') {
      const config = core.getConfig();
      const hasFile = fs.existsSync(core.CONFIG_PATH);
      let fileData = null;
      if (hasFile && !config) {
        try { fileData = JSON.parse(fs.readFileSync(core.CONFIG_PATH, 'utf8')); } catch (_) {}
      }
      const src = config || fileData;
      return json(res, 200, {
        configured: !!config, hasFile,
        type: src?.type || null, model: src?.model || null, endpoint: src?.endpoint || null,
        maxTokens: src?.maxTokens || 12288,
        vision: src?.vision || false,
        workspacePath: core.WORKSPACE_DIR
      });
    }

    if (url.pathname === '/api/config' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.type || !body.endpoint || !body.model) return json(res, 400, { error: 'Need type, endpoint, model' });
      const maxTokens = parseInt(body.maxTokens, 10);
      // Preserve existing apiKey if the new one is blank (password fields don't pre-fill)
      const existingConfig = core.getConfig();
      const apiKey = body.apiKey && body.apiKey.trim() ? body.apiKey.trim() : (existingConfig?.apiKey || '');
      core.setConfig({
        type: body.type, endpoint: body.endpoint, apiKey, model: body.model,
        maxTokens: (maxTokens > 0 && maxTokens <= 1000000) ? maxTokens : 12288,
        vision: body.vision === true,
        workspacePath: body.workspacePath || ''
      });
      return json(res, 200, { ok: true });
    }

    // ── Ollama model management routes ──────────────────────────────
    if (url.pathname === '/api/ollama/models' && method === 'GET') {
      const endpoint = url.searchParams.get('endpoint') || core.getConfig()?.endpoint;
      if (!endpoint) return json(res, 400, { error: 'No Ollama endpoint' });
      try {
        const models = await llm.ollamaListModels(endpoint);
        return json(res, 200, { models });
      } catch (e) { return json(res, 502, { error: e.message }); }
    }

    if (url.pathname === '/api/ollama/show' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const endpoint = body.endpoint || core.getConfig()?.endpoint;
      if (!endpoint || !body.model) return json(res, 400, { error: 'Need endpoint and model' });
      try {
        const info = await llm.ollamaShowModel(endpoint, body.model);
        return json(res, 200, info);
      } catch (e) { return json(res, 502, { error: e.message }); }
    }

    if (url.pathname === '/api/ollama/pull' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const endpoint = body.endpoint || core.getConfig()?.endpoint;
      if (!endpoint || !body.model) return json(res, 400, { error: 'Need endpoint and model' });
      try {
        const result = await llm.ollamaPullModel(endpoint, body.model);
        return json(res, 200, { ok: true, status: result.status || 'success' });
      } catch (e) { return json(res, 502, { error: e.message }); }
    }

    if (url.pathname === '/api/entity' && method === 'GET') {
      return json(res, 200, core.getEntity() || { name: 'MA', id: 'ma' });
    }

    if (url.pathname === '/api/health' && method === 'GET') {
      return json(res, 200, core.health.scan());
    }

    // ── Pulse & Chores routes ─────────────────────────────────────────
    if (url.pathname === '/api/pulse/status' && method === 'GET') {
      return json(res, 200, { timers: pulse.getPulseStatus(), config: pulse.getPulseConfig() });
    }

    if (url.pathname === '/api/pulse/config' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const cfg = pulse.getPulseConfig();
      if (body.healthScan) cfg.healthScan = { ...cfg.healthScan, ...body.healthScan };
      if (body.choreCheck) cfg.choreCheck = { ...cfg.choreCheck, ...body.choreCheck };
      pulse.savePulseConfig(cfg);
      pulse.stopAll();
      pulse.startAll();
      return json(res, 200, { ok: true, config: cfg });
    }

    if (url.pathname === '/api/pulse/start' && method === 'POST') {
      pulse.startAll();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/pulse/stop' && method === 'POST') {
      pulse.stopAll();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/pulse/logs' && method === 'GET') {
      const type = url.searchParams.get('type') || 'health';
      const lines = parseInt(url.searchParams.get('lines') || '50', 10);
      return json(res, 200, { lines: pulse.readLog(`pulse-${type}.log`, lines) });
    }

    if (url.pathname === '/api/chores' && method === 'GET') {
      return json(res, 200, pulse.getChores());
    }

    if (url.pathname === '/api/chores/add' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.name) return json(res, 400, { error: 'Need chore name' });
      try {
        const chore = pulse.addChore(body);
        return json(res, 200, { ok: true, chore });
      } catch (e) { return json(res, 400, { error: e.message }); }
    }

    if (url.pathname === '/api/chores/update' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.id) return json(res, 400, { error: 'Need chore id' });
      try {
        const chore = pulse.updateChore(body.id, body);
        return json(res, 200, { ok: true, chore });
      } catch (e) { return json(res, 400, { error: e.message }); }
    }

    if (url.pathname === '/api/chores/remove' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.id) return json(res, 400, { error: 'Need chore id' });
      try {
        pulse.removeChore(body.id);
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // ── Model Roster routes ──────────────────────────────────────────
    if (url.pathname === '/api/models/roster' && method === 'GET') {
      return json(res, 200, modelRouter.getRoster());
    }

    if (url.pathname === '/api/models/add' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.model) return json(res, 400, { error: 'Need model name' });
      const result = modelRouter.addModel(body);
      return json(res, result.ok ? 200 : 400, result);
    }

    if (url.pathname === '/api/models/update' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.id) return json(res, 400, { error: 'Need model id' });
      const result = modelRouter.updateModel(body.id, body);
      return json(res, result.ok ? 200 : 400, result);
    }

    if (url.pathname === '/api/models/remove' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.id) return json(res, 400, { error: 'Need model id' });
      const result = modelRouter.removeModel(body.id);
      return json(res, result.ok ? 200 : 400, result);
    }

    if (url.pathname === '/api/models/route' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const routed = modelRouter.routeModel(body.message || '', body.taskType || 'code', body.agentRole || null, core.getConfig());
      return json(res, 200, routed);
    }

    if (url.pathname === '/api/models/performance' && method === 'GET') {
      return json(res, 200, modelRouter.getAllPerformance());
    }

    if (url.pathname === '/api/models/research' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.model) return json(res, 400, { error: 'Need model name' });
      try {
        const result = await modelRouter.researchAndUpdate(body.model);
        return json(res, result.ok ? 200 : 400, result);
      } catch (e) { return json(res, 500, { error: e.message }); }
    }

    if (url.pathname === '/api/worklog' && method === 'GET') {
      return json(res, 200, core.worklog.getState());
    }

    if (url.pathname === '/api/commands' && method === 'GET') {
      return json(res, 200, [
        { cmd: '/health', desc: 'Run system health scan', usage: '/health' },
        { cmd: '/memory stats', desc: 'Show memory statistics', usage: '/memory stats' },
        { cmd: '/memory search', desc: 'Search memories', usage: '/memory search <query>' },
        { cmd: '/knowledge', desc: 'List knowledge docs', usage: '/knowledge' },
        { cmd: '/knowledge', desc: 'Show a knowledge doc', usage: '/knowledge <name>' },
        { cmd: '/ingest', desc: 'Ingest a file into memory', usage: '/ingest <filepath>' },
        { cmd: '/config', desc: 'Show current LLM config', usage: '/config' },
        { cmd: '/projects', desc: 'List all projects', usage: '/projects' },
        { cmd: '/project open', desc: 'Resume a project', usage: '/project open <id>' },
        { cmd: '/project close', desc: 'Close a project', usage: '/project close <id>' },
        { cmd: '/project status', desc: 'Show project status', usage: '/project status <id>' },
        { cmd: '/whitelist', desc: 'Show allowed commands', usage: '/whitelist' },
        { cmd: '/whitelist add', desc: 'Allow a command', usage: '/whitelist add <binary> [sub1,sub2,...]' },
        { cmd: '/whitelist remove', desc: 'Remove a command', usage: '/whitelist remove <binary>' },
        { cmd: '/whitelist reset', desc: 'Reset to defaults', usage: '/whitelist reset' },
        { cmd: '/pulse', desc: 'Pulse timer status', usage: '/pulse [status|start|stop|log]' },
        { cmd: '/chores', desc: 'View/manage chores', usage: '/chores [list|add|remove|run]' },
        { cmd: '/chores add', desc: 'Add a recurring chore', usage: '/chores add <name> | <description>' },
        { cmd: '/chores remove', desc: 'Remove a chore', usage: '/chores remove <id>' },
        { cmd: '/models', desc: 'View model roster', usage: '/models [list|add|remove|perf|route|research]' },
        { cmd: '/models add', desc: 'Add a model to roster', usage: '/models add <provider> <model> [endpoint]' },
        { cmd: '/models remove', desc: 'Remove a model', usage: '/models remove <id>' },
        { cmd: '/models perf', desc: 'Show model performance', usage: '/models perf' },
        { cmd: '/models research', desc: 'Research a model\'s capabilities', usage: '/models research <model>' },
        { cmd: '/worklog', desc: 'Show MA session worklog', usage: '/worklog' }
      ]);
    }

    if (url.pathname === '/api/slash' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const result = await handleSlashCommand(body.command || '');
      return json(res, 200, result);
    }

    // ── Whitelist management routes ─────────────────────────────────
    if (url.pathname === '/api/whitelist' && method === 'GET') {
      return json(res, 200, cmdExec.getWhitelist());
    }

    if (url.pathname === '/api/whitelist/add' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.binary) return json(res, 400, { error: 'Need binary name' });
      try {
        const result = cmdExec.whitelistAdd(body.binary, body.subcommands ?? null);
        return json(res, 200, { ok: true, ...result });
      } catch (e) { return json(res, 400, { error: e.message }); }
    }

    if (url.pathname === '/api/whitelist/remove' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.binary) return json(res, 400, { error: 'Need binary name' });
      try {
        const result = cmdExec.whitelistRemove(body.binary);
        return json(res, 200, { ok: true, ...result });
      } catch (e) { return json(res, 400, { error: e.message }); }
    }

    if (url.pathname === '/api/whitelist/reset' && method === 'POST') {
      const result = cmdExec.whitelistReset();
      return json(res, 200, { ok: true, ...result });
    }

    if (url.pathname === '/api/memory/search' && method === 'GET') {
      const q = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const mem = core.getMemory();
      return json(res, 200, mem ? mem.search(q, limit) : []);
    }

    if (url.pathname === '/api/memory/store' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.content) return json(res, 400, { error: 'Need content' });
      const mem = core.getMemory();
      const id = mem.store(body.type || 'semantic', body.content, body.meta || {});
      return json(res, 200, { id });
    }

    if (url.pathname === '/api/memory/stats' && method === 'GET') {
      const mem = core.getMemory();
      return json(res, 200, mem ? mem.stats() : {});
    }

    if (url.pathname === '/api/memory/ingest' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.filePath) return json(res, 400, { error: 'Need filePath' });
      const safe = path.resolve(core.WORKSPACE_DIR, body.filePath);
      if (!safe.startsWith(path.resolve(core.WORKSPACE_DIR))) return json(res, 403, { error: 'Path outside workspace' });
      const mem = core.getMemory();
      const count = mem.ingest(safe, body.meta || {});
      return json(res, 200, { chunks: count });
    }

    // ── Workspace file serving (for clickable file links in chat) ───
    if (url.pathname === '/api/workspace/file' && method === 'GET') {
      const reqPath = url.searchParams.get('path');
      if (!reqPath) return json(res, 400, { error: 'Need path param' });
      const wsRoot = path.resolve(core.WORKSPACE_DIR);
      const safe = path.resolve(wsRoot, reqPath);
      if (!safe.startsWith(wsRoot + path.sep) && safe !== wsRoot) return json(res, 403, { error: 'Path outside workspace' });
      if (!fs.existsSync(safe) || !fs.statSync(safe).isFile()) return json(res, 404, { error: 'File not found' });
      const ext = path.extname(safe).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline'
      });
      return fs.createReadStream(safe).pipe(res);
    }

    // ── User Guide as HTML ─────────────────────────────────────────
    if (url.pathname === '/user-guide' && method === 'GET') {
      const guidePath = path.join(core.MA_ROOT, 'USER-GUIDE.md');
      if (fs.existsSync(guidePath)) {
        const md = fs.readFileSync(guidePath, 'utf8');
        const html = renderMarkdownToHtml(md);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      res.writeHead(404);
      return res.end('User guide not found');
    }

    // ── Static file serving ───────────────────────────────────────────
    let filePath = url.pathname === '/' ? '/MA-index.html' : url.pathname;
    const resolved = path.resolve(CLIENT_DIR, '.' + filePath);
    if (!resolved.startsWith(CLIENT_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return fs.createReadStream(resolved).pipe(res);
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    console.error('Request error:', e.message);
    json(res, 500, { error: e.message });
  }
}

// ── Port guard ──────────────────────────────────────────────────────────────
const { resolvePort } = require('../server/services/port-guard');

function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
            : process.platform === 'darwin' ? `open "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

// ── Start ───────────────────────────────────────────────────────────────────
async function start() {
  core.boot();

  // Initialize model router
  modelRouter.init({ callLLM: (msgs, opts) => llm.callLLM(core.getConfig(), msgs, opts) });
  console.log('  Model router ready (' + modelRouter.listModels().length + ' models in roster)');

  // Initialize and start pulse engine
  pulse.init({ core, callLLM: llm.callLLM, agentCatalog: core.agentCatalog, health: core.health });
  pulse.startAll();
  console.log('  Pulse engine started');

  const port = await resolvePort({
    defaultPort:  DEFAULT_PORT,
    serverName:   'MA (Memory Architect)',
    healthPath:   '/api/health',
    portRange:    [DEFAULT_PORT, 3860],
    allowMultiple: true
  });
  if (port === 0) { process.exit(1); }
  const server = http.createServer(handleRequest);
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`\n  ✓ Running at ${url}`);
    console.log(`  ✓ Workspace: ${core.WORKSPACE_DIR}`);
    if (!core.isConfigured()) console.log('  ⚠ No LLM configured — the GUI will open for setup');
    if (!process.env.MA_NO_OPEN_BROWSER) {
      console.log('\n  Opening browser...\n');
      openBrowser(url);
    } else {
      console.log('\n  (browser open suppressed — launched by REM System)\n');
    }
  });
}

start().catch(e => { console.error('Fatal:', e); process.exit(1); });
