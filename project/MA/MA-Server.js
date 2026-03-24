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
const { handleSlashCommand } = require('./MA-server/MA-slash-commands');
const { renderMarkdownToHtml } = require('./MA-server/MA-markdown');

// ── Paths ───────────────────────────────────────────────────────────────────
const CLIENT_DIR    = path.join(core.MA_ROOT, 'MA-client');
const BLUEPRINT_DIR = path.join(core.MA_ROOT, 'MA-blueprints');
const DEFAULT_PORT  = 3850;
const FALLBACK_PORT = 3851;

// ── HTTP helpers ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/plain'
};

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

function resolveInsideRoot(rootDir, requestedPath) {
  const normalized = String(requestedPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const resolved = path.resolve(rootDir, normalized);
  const base = path.resolve(rootDir);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('Path escapes allowed root');
  }
  return resolved;
}

function listMarkdownFiles(rootDir, currentDir = rootDir, bucket = []) {
  if (!fs.existsSync(currentDir)) return bucket;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      listMarkdownFiles(rootDir, fullPath, bucket);
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    bucket.push({
      path: relativePath,
      name: entry.name,
      group: relativePath.includes('/') ? relativePath.split('/')[0] : 'root'
    });
  }
  return bucket;
}

function listWorkspaceTree(rootDir, currentDir = rootDir, depth = 0) {
  if (!fs.existsSync(currentDir)) return [];
  if (depth > 6) return [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    .filter(entry => !entry.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return entries.map(entry => {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    return {
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? 'directory' : 'file',
      children: entry.isDirectory() ? listWorkspaceTree(rootDir, fullPath, depth + 1) : undefined
    };
  });
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

    // ── Chat session persistence ────────────────────────────────────
    const sessionsDir = path.join(path.dirname(core.CONFIG_PATH), 'chat-sessions');

    // List all sessions (id, createdAt, updatedAt, preview) — newest first
    if (url.pathname === '/api/chat/sessions' && method === 'GET') {
      if (!fs.existsSync(sessionsDir)) return json(res, 200, { sessions: [] });
      const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
      const sessions = [];
      for (const f of files) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf8'));
          sessions.push({ id: raw.id, createdAt: raw.createdAt, updatedAt: raw.updatedAt, preview: raw.preview || '' });
        } catch { /* skip corrupt files */ }
      }
      sessions.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
      return json(res, 200, { sessions });
    }

    // Get a single session's full messages
    if (url.pathname.startsWith('/api/chat/session/') && method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/chat/session/'.length));
      if (!id || /[\/\\]/.test(id)) return json(res, 400, { error: 'invalid id' });
      const fp = path.join(sessionsDir, id + '.json');
      if (!fs.existsSync(fp)) return json(res, 404, { error: 'session not found' });
      try {
        const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
        return json(res, 200, data);
      } catch { return json(res, 500, { error: 'corrupt session file' }); }
    }

    // Save/update a session (POST with id in body)
    if (url.pathname === '/api/chat/session' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      fs.mkdirSync(sessionsDir, { recursive: true });
      const id = body.id || ('ses_' + Date.now());
      if (/[\/\\]/.test(id)) return json(res, 400, { error: 'invalid id' });
      const fp = path.join(sessionsDir, id + '.json');
      let existing = {};
      if (fs.existsSync(fp)) {
        try { existing = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { /* overwrite */ }
      }
      const messages = body.messages || existing.messages || [];
      const preview = messages.find(m => m.role === 'user')?.content?.slice(0, 80) || '';
      const session = {
        id,
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preview,
        messages
      };
      fs.writeFileSync(fp, JSON.stringify(session, null, 2));
      return json(res, 200, { ok: true, id, preview });
    }

    // Legacy endpoint — kept for backward compat, returns empty
    if (url.pathname === '/api/chat/history' && method === 'GET') {
      return json(res, 200, { messages: [] });
    }
    if (url.pathname === '/api/chat/history' && method === 'POST') {
      return json(res, 200, { ok: true, saved: 0 });
    }

    // ── Mode toggle (Chat / Work) ────────────────────────────────────
    if (url.pathname === '/api/mode' && method === 'GET') {
      return json(res, 200, { mode: core.getMode() });
    }

    if (url.pathname === '/api/mode' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const m = String(body.mode || '').toLowerCase();
      if (m !== 'chat' && m !== 'work') return json(res, 400, { error: 'mode must be "chat" or "work"' });
      core.setMode(m);
      return json(res, 200, { ok: true, mode: core.getMode() });
    }

    if (url.pathname === '/api/config' && method === 'GET') {
      const config = core.getConfig();
      const hasFile = fs.existsSync(core.CONFIG_PATH);
      const revealKey = url.searchParams.get('revealKey') === '1';
      let fileData = null;
      if (hasFile && !config) {
        try { fileData = JSON.parse(fs.readFileSync(core.CONFIG_PATH, 'utf8')); } catch (_) {}
      }
      const src = config || fileData;
      const key = String(src?.apiKey || src?.key || '').trim();
      const hasApiKey = !!key;
      return json(res, 200, {
        configured: !!config, hasFile,
        type: src?.type || null, model: src?.model || null, endpoint: src?.endpoint || null,
        maxTokens: src?.maxTokens || 12288,
        vision: src?.vision || false,
        workspacePath: src?.workspacePath || core.WORKSPACE_DIR,
        capabilities: src?.capabilities || null,
        hasApiKey,
        apiKeyMasked: hasApiKey ? '********' : '',
        memoryLimit: src?.memoryLimit || 6,
        memoryRecall: src?.memoryRecall !== false,
        ...(revealKey && hasApiKey ? { apiKey: key } : {})
      });
    }

    if (url.pathname === '/api/config' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.type || !body.endpoint || !body.model) return json(res, 400, { error: 'Need type, endpoint, model' });
      const maxTokens = parseInt(body.maxTokens, 10);
      const thinkingBudget = parseInt(body.capabilities?.thinkingBudget, 10);
      const minThinkingTokens = (body.type === 'anthropic' && body.capabilities?.extendedThinking === true)
        ? Math.max(1024, thinkingBudget > 0 ? thinkingBudget : 4096)
        : 1024;
      const normalizedMaxTokens = (maxTokens > 0 && maxTokens <= 1000000) ? maxTokens : 12288;
      // Preserve existing apiKey if the new one is blank (password fields don't pre-fill)
      const existingConfig = core.getConfig();
      const incomingKey = String(body.apiKey || '').trim();
      const apiKey = incomingKey && incomingKey !== '********' ? incomingKey : (existingConfig?.apiKey || '');
      const memoryLimit = Math.min(50, Math.max(6, parseInt(body.memoryLimit, 10) || 6));
      core.setConfig({
        type: body.type, endpoint: body.endpoint, apiKey, model: body.model,
        maxTokens: Math.max(normalizedMaxTokens, minThinkingTokens),
        vision: body.vision === true,
        workspacePath: body.workspacePath || '',
        memoryLimit,
        memoryRecall: body.memoryRecall !== false,
        ...(body.capabilities ? { capabilities: body.capabilities } : {})
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

    if (url.pathname === '/api/worklog' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const current = core.worklog.getState();
      const next = {
        ...current,
        activeProject: body.activeProject ?? current.activeProject,
        activeProjectStatus: body.activeProjectStatus ?? current.activeProjectStatus,
        currentTask: body.currentTask ?? current.currentTask,
        taskPlan: Array.isArray(body.taskPlan)
          ? body.taskPlan.map(step => ({ done: !!step.done, description: String(step.description || '').trim() })).filter(step => step.description)
          : current.taskPlan,
        recentWork: Array.isArray(body.recentWork) ? body.recentWork : current.recentWork,
        resumePoint: body.resumePoint ?? current.resumePoint,
        lastActivity: new Date().toISOString()
      };
      core.worklog.write(next);
      return json(res, 200, { ok: true, state: core.worklog.getState() });
    }

    if (url.pathname === '/api/projects' && method === 'GET') {
      const projects = core.projectArchive.listProjects().sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      return json(res, 200, { projects });
    }

    if (url.pathname === '/api/projects/state' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.id || !body.action) return json(res, 400, { error: 'Need project id and action' });
      try {
        const project = body.action === 'close'
          ? core.projectArchive.closeProject(body.id)
          : body.action === 'resume'
            ? core.projectArchive.resumeProject(body.id)
            : null;
        if (!project) return json(res, 400, { error: 'Unsupported action' });
        return json(res, 200, { ok: true, project });
      } catch (e) {
        return json(res, 400, { error: e.message });
      }
    }

    if (url.pathname === '/api/blueprints' && method === 'GET') {
      const files = listMarkdownFiles(BLUEPRINT_DIR).sort((a, b) => a.path.localeCompare(b.path));
      return json(res, 200, { files });
    }

    if (url.pathname === '/api/blueprints/file' && method === 'GET') {
      const requestedPath = url.searchParams.get('path');
      if (!requestedPath) return json(res, 400, { error: 'Need blueprint path' });
      try {
        const fullPath = resolveInsideRoot(BLUEPRINT_DIR, requestedPath);
        if (!fs.existsSync(fullPath)) return json(res, 404, { error: 'Blueprint not found' });
        return json(res, 200, {
          path: path.relative(BLUEPRINT_DIR, fullPath).replace(/\\/g, '/'),
          content: fs.readFileSync(fullPath, 'utf8')
        });
      } catch (e) {
        return json(res, 400, { error: e.message });
      }
    }

    if (url.pathname === '/api/blueprints/file' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.path || typeof body.content !== 'string') return json(res, 400, { error: 'Need blueprint path and content' });
      try {
        const fullPath = resolveInsideRoot(BLUEPRINT_DIR, body.path);
        if (!fs.existsSync(fullPath)) return json(res, 404, { error: 'Blueprint not found' });
        fs.writeFileSync(fullPath, body.content, 'utf8');
        return json(res, 200, { ok: true, path: path.relative(BLUEPRINT_DIR, fullPath).replace(/\\/g, '/') });
      } catch (e) {
        return json(res, 400, { error: e.message });
      }
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

    // Folder ingest with SSE progress
    if (url.pathname === '/api/memory/ingest-folder' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.folderPath) return json(res, 400, { error: 'Need folderPath' });
      const resolved = path.resolve(body.folderPath);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        return json(res, 400, { error: 'Not a valid directory' });
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      const sse = (event, data) => {
        if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      const abortState = { aborted: false };
      req.on('close', () => { abortState.aborted = true; });
      try {
        const mem = core.getMemory();
        const result = mem.ingestFolder(resolved, {
          archive: body.archive || path.basename(resolved),
          onProgress: (info) => sse('progress', info),
          abort: abortState
        });
        if (abortState.aborted) {
          sse('error', { error: 'Ingest stopped by user' });
        } else {
          sse('done', result);
        }
      } catch (e) {
        sse('error', { error: e.message });
      }
      if (!res.writableEnded) {
        res.write('event: close\ndata: {}\n\n');
        res.end();
      }
      return;
    }

    // List archives
    if (url.pathname === '/api/memory/archives' && method === 'GET') {
      const mem = core.getMemory();
      return json(res, 200, mem ? mem.listArchives() : {});
    }

    // ── Workspace file serving (for clickable file links in chat) ───
    if (url.pathname === '/api/workspace/tree' && method === 'GET') {
      return json(res, 200, { root: core.WORKSPACE_DIR, items: listWorkspaceTree(core.WORKSPACE_DIR) });
    }

    if (url.pathname === '/api/workspace/read' && method === 'GET') {
      const reqPath = url.searchParams.get('path');
      if (!reqPath) return json(res, 400, { error: 'Need path param' });
      const wsRoot = path.resolve(core.WORKSPACE_DIR);
      const safe = path.resolve(wsRoot, reqPath);
      if (!safe.startsWith(wsRoot + path.sep) && safe !== wsRoot) return json(res, 403, { error: 'Path outside workspace' });
      if (!fs.existsSync(safe) || !fs.statSync(safe).isFile()) return json(res, 404, { error: 'File not found' });
      return json(res, 200, {
        path: path.relative(wsRoot, safe).replace(/\\/g, '/'),
        content: fs.readFileSync(safe, 'utf8')
      });
    }

    if (url.pathname === '/api/workspace/save' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.path || typeof body.content !== 'string') return json(res, 400, { error: 'Need path and content' });
      const wsRoot = path.resolve(core.WORKSPACE_DIR);
      const safe = path.resolve(wsRoot, body.path);
      if (!safe.startsWith(wsRoot + path.sep) && safe !== wsRoot) return json(res, 403, { error: 'Path outside workspace' });
      fs.mkdirSync(path.dirname(safe), { recursive: true });
      fs.writeFileSync(safe, body.content, 'utf8');
      return json(res, 200, { ok: true, path: path.relative(wsRoot, safe).replace(/\\/g, '/') });
    }

    if (url.pathname === '/api/workspace/mkdir' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.path) return json(res, 400, { error: 'Need path' });
      const wsRoot = path.resolve(core.WORKSPACE_DIR);
      const safe = path.resolve(wsRoot, body.path);
      if (!safe.startsWith(wsRoot + path.sep) && safe !== wsRoot) return json(res, 403, { error: 'Path outside workspace' });
      fs.mkdirSync(safe, { recursive: true });
      return json(res, 200, { ok: true, path: path.relative(wsRoot, safe).replace(/\\/g, '/') });
    }

    // ── Terminal command execution ───────────────────────────────────
    if (url.pathname === '/api/terminal/exec' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.command || typeof body.command !== 'string') return json(res, 400, { error: 'Need command' });
      try {
        const parsed = cmdExec.parseCommand(body.command);
        if (!parsed.ok) return json(res, 200, { error: parsed.error });
        const result = await cmdExec.execCommand(body.command, core.WORKSPACE_DIR);
        return json(res, 200, { stdout: result.stdout || '', stderr: result.stderr || '', code: result.code });
      } catch (e) {
        return json(res, 200, { error: e.message });
      }
    }

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
