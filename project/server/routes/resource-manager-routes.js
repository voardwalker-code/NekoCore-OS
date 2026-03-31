// ── Routes · Resource Manager Routes ─────────────────────────────────────────
//
// HOW RESOURCE ROUTING WORKS:
// This module serves resource manager APIs for todos, tasks, projects, pulses,
// blueprints, and active state selection across entities.
//
// WHAT USES THIS:
//   resource manager UI and project/task workflow panels
//
// EXPORTS:
//   createResourceManagerRoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

// ── Resource Manager Routes ─────────────────────────────────
// REST API for the Resource Manager app.
// /api/resources/todos, /api/resources/tasks, /api/resources/projects,
// /api/resources/pulses, /api/resources/blueprints, /api/resources/active

'use strict';
// createResourceManagerRoutes()
// WHAT THIS DOES: Builds Resource Manager route dispatcher and helper utilities.
// WHY IT EXISTS: Todos/tasks/projects/pulses/blueprints share one API surface in this module.
// HOW TO USE IT: Call createResourceManagerRoutes(ctx) during route registration.
function createResourceManagerRoutes(ctx) {
  const fs = require('fs');
  const path = require('path');
  const http = require('http');
  const entityPaths = require('../entityPaths');
  const todoStore = require('../services/todo-store');
  const activeState = require('../services/resource-active-state');
  const projectStore = require('../brain/tasks/task-project-store');
  const blueprintLoader = require('../brain/tasks/blueprint-loader');

  const MA_PORT = 3850;
  const MA_REPO_URL = 'https://github.com/voardwalker-code/MA-Memory-Architect';
  const BLUEPRINTS_DIR = blueprintLoader.BLUEPRINTS_DIR;
  const CORE_DIR = path.join(BLUEPRINTS_DIR, 'core');
  const MODULES_DIR = path.join(BLUEPRINTS_DIR, 'modules');

  // ── helpers ─────────────────────────────────────────────

  // json()
  // WHAT THIS DOES: Writes JSON response using shared API headers.
  // WHY IT EXISTS: Keeps response formatting consistent across handlers.
  // HOW TO USE IT: Call json(res, statusCode, payload, apiHeaders).
  function json(res, code, obj, apiHeaders) {
    res.writeHead(code, apiHeaders);
    res.end(JSON.stringify(obj));
  }
  // validateEntityId()
  // WHAT THIS DOES: Validates entity id and confirms entity root exists.
  // WHY IT EXISTS: Route handlers should reject unknown entities consistently.
  // HOW TO USE IT: Call validateEntityId(entityId) before entity-scoped operations.
  function validateEntityId(entityId) {
    if (!entityId) return false;
    const id = entityPaths.normalizeEntityId(entityId);
    if (!id) return false;
    try {
      const root = entityPaths.getEntityRoot(id);
      return fs.existsSync(root);
    } catch (_) {
      return false;
    }
  }
  // safeBlueprintName()
  // WHAT THIS DOES: Sanitizes blueprint names and blocks traversal patterns.
  // WHY IT EXISTS: Blueprint file APIs must be safe against path manipulation.
  // HOW TO USE IT: Call safeBlueprintName(name) before read/write/delete blueprint paths.
  function safeBlueprintName(name) {
    if (!name || typeof name !== 'string') return null;
    // Block path traversal
    if (/[/\\]/.test(name) || name.includes('..') || name.includes('\0')) return null;
    // Strip .md if supplied, allow only alphanumeric, hyphens, underscores
    const clean = name.replace(/\.md$/i, '');
    if (!/^[a-zA-Z0-9_-]+$/.test(clean)) return null;
    return clean;
  }

  // ── MA proxy helper ─────────────────────────────────────

  // proxyMA()
  // WHAT THIS DOES: Proxies requests to MA sidecar API and normalizes response shape.
  // WHY IT EXISTS: Pulses/chores routes rely on MA while keeping this API contract stable.
  // HOW TO USE IT: Call proxyMA(method, path, body) for MA-backed endpoint operations.
  function proxyMA(method, maPath, body) {
    return new Promise((resolve) => {
      const opts = {
        hostname: '127.0.0.1',
        port: MA_PORT,
        path: maPath,
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      };
      const req = http.request(opts, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (c) => data += c);
        proxyRes.on('end', () => {
          try {
            resolve({ ok: true, status: proxyRes.statusCode, data: JSON.parse(data) });
          } catch (_) {
            resolve({ ok: true, status: proxyRes.statusCode, data: data });
          }
        });
      });
      req.on('error', (err) => resolve({ ok: false, error: 'MA unreachable: ' + err.message, repoUrl: MA_REPO_URL }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'MA timeout', repoUrl: MA_REPO_URL }); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // ── Task scanning ───────────────────────────────────────

  // scanTasks()
  // WHAT THIS DOES: Scans projects/tasks tree and returns task briefs sorted newest-first.
  // WHY IT EXISTS: Resource task list needs aggregated task data across project folders.
  // HOW TO USE IT: Call scanTasks(entityId) to build tasks payload for GET routes.
  function scanTasks(entityId) {
    const id = entityPaths.normalizeEntityId(entityId);
    const projectsRoot = path.join(entityPaths.getMemoryRoot(id), 'projects');
    if (!fs.existsSync(projectsRoot)) return [];

    const tasks = [];
    const projDirs = fs.readdirSync(projectsRoot, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const projDir of projDirs) {
      const tasksDir = path.join(projectsRoot, projDir.name, 'tasks');
      if (!fs.existsSync(tasksDir)) continue;

      const taskDirs = fs.readdirSync(tasksDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const taskDir of taskDirs) {
        const briefFile = path.join(tasksDir, taskDir.name, 'brief.json');
        if (!fs.existsSync(briefFile)) continue;
        try {
          const brief = JSON.parse(fs.readFileSync(briefFile, 'utf8'));
          tasks.push(brief);
        } catch (_) { /* skip corrupt files */ }
      }
    }

    tasks.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    return tasks;
  }
  // getTask()
  // WHAT THIS DOES: Returns one task by id from scanned task list.
  // WHY IT EXISTS: Task detail route needs a simple resolver over scan results.
  // HOW TO USE IT: Call getTask(entityId, taskId) in task item route handlers.
  function getTask(entityId, taskId) {
    const all = scanTasks(entityId);
    return all.find(t => t.taskId === taskId) || null;
  }

  // ── Blueprint reading/writing ───────────────────────────

  // listAllBlueprints()
  // WHAT THIS DOES: Reads all core/module blueprint markdown files into payload list.
  // WHY IT EXISTS: Blueprint gallery needs one endpoint returning both categories.
  // HOW TO USE IT: Call listAllBlueprints() in GET /api/resources/blueprints.
  function listAllBlueprints() {
    const results = [];

    // Core blueprints
    if (fs.existsSync(CORE_DIR)) {
      const files = fs.readdirSync(CORE_DIR).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const name = f.replace(/\.md$/, '');
        const content = fs.readFileSync(path.join(CORE_DIR, f), 'utf8');
        results.push({ category: 'core', name, filename: f, content });
      }
    }

    // Module blueprints
    if (fs.existsSync(MODULES_DIR)) {
      const files = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const name = f.replace(/\.md$/, '');
        const content = fs.readFileSync(path.join(MODULES_DIR, f), 'utf8');
        results.push({ category: 'modules', name, filename: f, content });
      }
    }

    return results;
  }
  // getBlueprint()
  // WHAT THIS DOES: Reads one blueprint by category/name after safety checks.
  // WHY IT EXISTS: Centralizes category mapping and existence checks for blueprint reads.
  // HOW TO USE IT: Call getBlueprint(category, name) in blueprint detail routes.
  function getBlueprint(category, name) {
    const safeName = safeBlueprintName(name);
    if (!safeName) return null;
    const dir = category === 'core' ? CORE_DIR : MODULES_DIR;
    const fp = path.join(dir, safeName + '.md');
    if (!fs.existsSync(fp)) return null;
    return { category, name: safeName, content: fs.readFileSync(fp, 'utf8') };
  }

  // ── dispatch ────────────────────────────────────────────

  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;

    // ── Todos ─────────────────────────────────────────────
    const todosListMatch = p.match(/^\/api\/resources\/todos\/([^/]+)$/);
    if (todosListMatch) {
      const entityId = decodeURIComponent(todosListMatch[1]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      const id = entityPaths.normalizeEntityId(entityId);
      if (m === 'GET') { json(res, 200, { ok: true, todos: todoStore.listTodos(id) }, apiHeaders); return true; }
      if (m === 'POST') {
        const body = JSON.parse(await readBody(req));
        const result = todoStore.createTodo(id, body);
        json(res, result.ok ? 201 : 400, result, apiHeaders);
        return true;
      }
    }

    const todoItemMatch = p.match(/^\/api\/resources\/todos\/([^/]+)\/([^/]+)$/);
    if (todoItemMatch) {
      const entityId = decodeURIComponent(todoItemMatch[1]);
      const todoId = decodeURIComponent(todoItemMatch[2]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      const id = entityPaths.normalizeEntityId(entityId);
      if (m === 'GET') {
        const todo = todoStore.getTodo(id, todoId);
        if (!todo) { json(res, 404, { ok: false, error: 'Todo not found' }, apiHeaders); return true; }
        json(res, 200, { ok: true, todo }, apiHeaders);
        return true;
      }
      if (m === 'PUT') {
        const body = JSON.parse(await readBody(req));
        const result = todoStore.updateTodo(id, todoId, body);
        json(res, result.ok ? 200 : 400, result, apiHeaders);
        return true;
      }
      if (m === 'DELETE') {
        const result = todoStore.deleteTodo(id, todoId);
        json(res, result.ok ? 200 : 404, result, apiHeaders);
        return true;
      }
    }

    // ── Tasks ─────────────────────────────────────────────
    const tasksListMatch = p.match(/^\/api\/resources\/tasks\/([^/]+)$/);
    if (tasksListMatch && m === 'GET') {
      const entityId = decodeURIComponent(tasksListMatch[1]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      json(res, 200, { ok: true, tasks: scanTasks(entityPaths.normalizeEntityId(entityId)) }, apiHeaders);
      return true;
    }

    const taskItemMatch = p.match(/^\/api\/resources\/tasks\/([^/]+)\/([^/]+)$/);
    if (taskItemMatch && m === 'GET') {
      const entityId = decodeURIComponent(taskItemMatch[1]);
      const taskId = decodeURIComponent(taskItemMatch[2]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      const task = getTask(entityPaths.normalizeEntityId(entityId), taskId);
      if (!task) { json(res, 404, { ok: false, error: 'Task not found' }, apiHeaders); return true; }
      json(res, 200, { ok: true, task }, apiHeaders);
      return true;
    }

    // ── Projects ──────────────────────────────────────────
    const projectsListMatch = p.match(/^\/api\/resources\/projects\/([^/]+)$/);
    if (projectsListMatch) {
      const entityId = decodeURIComponent(projectsListMatch[1]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      const id = entityPaths.normalizeEntityId(entityId);
      if (m === 'GET') {
        json(res, 200, { ok: true, projects: projectStore.listProjects(id) }, apiHeaders);
        return true;
      }
      if (m === 'POST') {
        const body = JSON.parse(await readBody(req));
        const name = String(body.name || '').trim();
        if (!name) { json(res, 400, { ok: false, error: 'name is required' }, apiHeaders); return true; }
        const project = projectStore.createProject(id, name);
        if (body.keywords && Array.isArray(body.keywords)) {
          project.keywords = body.keywords.map(k => String(k).trim()).filter(Boolean);
          // Re-save with updated keywords
          const projFile = path.join(entityPaths.getMemoryRoot(id), 'projects', project.id, 'project.json');
          fs.mkdirSync(path.dirname(projFile), { recursive: true });
          const tmp = projFile + '.tmp-' + process.pid + '-' + Date.now();
          fs.writeFileSync(tmp, JSON.stringify(project, null, 2), 'utf8');
          fs.renameSync(tmp, projFile);
        }
        json(res, 201, { ok: true, project }, apiHeaders);
        return true;
      }
    }

    const projectItemMatch = p.match(/^\/api\/resources\/projects\/([^/]+)\/([^/]+)$/);
    if (projectItemMatch) {
      const entityId = decodeURIComponent(projectItemMatch[1]);
      const projectId = decodeURIComponent(projectItemMatch[2]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      const id = entityPaths.normalizeEntityId(entityId);
      if (m === 'GET') {
        const project = projectStore.getProject(projectId, { entityId: id });
        if (!project) { json(res, 404, { ok: false, error: 'Project not found' }, apiHeaders); return true; }
        json(res, 200, { ok: true, project }, apiHeaders);
        return true;
      }
      if (m === 'PUT') {
        const body = JSON.parse(await readBody(req));
        const existing = projectStore.getProject(projectId, { entityId: id });
        if (!existing) { json(res, 404, { ok: false, error: 'Project not found' }, apiHeaders); return true; }
        if (body.name !== undefined) existing.name = String(body.name).trim();
        if (body.keywords !== undefined && Array.isArray(body.keywords)) {
          existing.keywords = body.keywords.map(k => String(k).trim()).filter(Boolean);
        }
        existing.updatedAt = Date.now();
        const projFile = path.join(entityPaths.getMemoryRoot(id), 'projects', projectId, 'project.json');
        const tmp = projFile + '.tmp-' + process.pid + '-' + Date.now();
        fs.writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf8');
        fs.renameSync(tmp, projFile);
        json(res, 200, { ok: true, project: existing }, apiHeaders);
        return true;
      }
      if (m === 'DELETE') {
        const existing = projectStore.getProject(projectId, { entityId: id });
        if (!existing) { json(res, 404, { ok: false, error: 'Project not found' }, apiHeaders); return true; }
        const projDir = path.join(entityPaths.getMemoryRoot(id), 'projects', projectId);
        if (fs.existsSync(projDir)) fs.rmSync(projDir, { recursive: true, force: true });
        json(res, 200, { ok: true }, apiHeaders);
        return true;
      }
    }

    // ── Pulses (proxy to MA) ──────────────────────────────
    if (p === '/api/resources/pulses' && m === 'GET') {
      const [pulseResult, choreResult] = await Promise.all([
        proxyMA('GET', '/api/pulse/status'),
        proxyMA('GET', '/api/chores/list')
      ]);
      const maReachable = pulseResult.ok && choreResult.ok;
      json(res, 200, {
        ok: true,
        pulses: pulseResult.ok ? pulseResult.data : null,
        chores: choreResult.ok ? choreResult.data : null,
        maReachable,
        repoUrl: maReachable ? undefined : MA_REPO_URL
      }, apiHeaders);
      return true;
    }

    if (p === '/api/resources/pulses/chores' && m === 'POST') {
      const body = JSON.parse(await readBody(req));
      const result = await proxyMA('POST', '/api/chores/add', body);
      json(res, result.ok ? 201 : 502, result.ok ? result.data : { ok: false, error: result.error }, apiHeaders);
      return true;
    }

    const choreUpdateMatch = p.match(/^\/api\/resources\/pulses\/chores\/([^/]+)$/);
    if (choreUpdateMatch) {
      const choreId = decodeURIComponent(choreUpdateMatch[1]);
      if (m === 'PUT') {
        const body = JSON.parse(await readBody(req));
        body.id = choreId;
        const result = await proxyMA('POST', '/api/chores/update', body);
        json(res, result.ok ? 200 : 502, result.ok ? result.data : { ok: false, error: result.error }, apiHeaders);
        return true;
      }
      if (m === 'DELETE') {
        const result = await proxyMA('POST', '/api/chores/remove', { id: choreId });
        json(res, result.ok ? 200 : 502, result.ok ? result.data : { ok: false, error: result.error }, apiHeaders);
        return true;
      }
    }

    const pulseToggleMatch = p.match(/^\/api\/resources\/pulses\/([^/]+)\/toggle$/);
    if (pulseToggleMatch && m === 'POST') {
      const pulseId = decodeURIComponent(pulseToggleMatch[1]);
      const body = JSON.parse(await readBody(req));
      const enabled = !!body.enabled;
      const maPath = enabled ? '/api/pulse/start' : '/api/pulse/stop';
      const result = await proxyMA('POST', maPath, { id: pulseId });
      json(res, result.ok ? 200 : 502, result.ok ? result.data : { ok: false, error: result.error }, apiHeaders);
      return true;
    }

    // ── Blueprints ────────────────────────────────────────
    if (p === '/api/resources/blueprints' && m === 'GET') {
      json(res, 200, { ok: true, blueprints: listAllBlueprints() }, apiHeaders);
      return true;
    }

    const bpGetMatch = p.match(/^\/api\/resources\/blueprints\/(core|modules)\/([^/]+)$/);
    if (bpGetMatch) {
      const category = bpGetMatch[1];
      const name = decodeURIComponent(bpGetMatch[2]);
      if (m === 'GET') {
        const bp = getBlueprint(category, name);
        if (!bp) { json(res, 404, { ok: false, error: 'Blueprint not found' }, apiHeaders); return true; }
        json(res, 200, { ok: true, blueprint: bp }, apiHeaders);
        return true;
      }
      if (m === 'PUT') {
        const safeName = safeBlueprintName(name);
        if (!safeName) { json(res, 400, { ok: false, error: 'Invalid blueprint name' }, apiHeaders); return true; }
        const dir = category === 'core' ? CORE_DIR : MODULES_DIR;
        const fp = path.join(dir, safeName + '.md');
        if (!fs.existsSync(fp)) { json(res, 404, { ok: false, error: 'Blueprint not found' }, apiHeaders); return true; }
        const body = JSON.parse(await readBody(req));
        const content = String(body.content || '');
        const tmp = fp + '.tmp-' + process.pid + '-' + Date.now();
        fs.writeFileSync(tmp, content, 'utf8');
        fs.renameSync(tmp, fp);
        // Clear blueprint loader cache so re-reads pick up changes
        blueprintLoader.clearCache();
        json(res, 200, { ok: true, blueprint: { category, name: safeName, content } }, apiHeaders);
        return true;
      }
      if (m === 'DELETE') {
        if (category === 'core') { json(res, 403, { ok: false, error: 'Cannot delete core blueprints' }, apiHeaders); return true; }
        const safeName = safeBlueprintName(name);
        if (!safeName) { json(res, 400, { ok: false, error: 'Invalid blueprint name' }, apiHeaders); return true; }
        const fp = path.join(MODULES_DIR, safeName + '.md');
        if (!fs.existsSync(fp)) { json(res, 404, { ok: false, error: 'Blueprint not found' }, apiHeaders); return true; }
        fs.unlinkSync(fp);
        blueprintLoader.clearCache();
        json(res, 200, { ok: true }, apiHeaders);
        return true;
      }
    }

    if (p === '/api/resources/blueprints/modules' && m === 'POST') {
      const body = JSON.parse(await readBody(req));
      const safeName = safeBlueprintName(body.name);
      if (!safeName) { json(res, 400, { ok: false, error: 'Invalid blueprint name (alphanumeric, hyphens, underscores only)' }, apiHeaders); return true; }
      const fp = path.join(MODULES_DIR, safeName + '.md');
      if (fs.existsSync(fp)) { json(res, 409, { ok: false, error: 'Blueprint already exists' }, apiHeaders); return true; }
      const content = String(body.content || '');
      fs.mkdirSync(MODULES_DIR, { recursive: true });
      const tmp = fp + '.tmp-' + process.pid + '-' + Date.now();
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, fp);
      blueprintLoader.clearCache();
      json(res, 201, { ok: true, blueprint: { category: 'modules', name: safeName, content } }, apiHeaders);
      return true;
    }

    // ── Active State ──────────────────────────────────────
    const activeGetMatch = p.match(/^\/api\/resources\/active\/([^/]+)$/);
    if (activeGetMatch) {
      const entityId = decodeURIComponent(activeGetMatch[1]);
      if (!validateEntityId(entityId)) { json(res, 404, { ok: false, error: 'Entity not found' }, apiHeaders); return true; }
      const id = entityPaths.normalizeEntityId(entityId);
      if (m === 'GET') {
        json(res, 200, { ok: true, active: activeState.getActiveResources(id) }, apiHeaders);
        return true;
      }
      if (m === 'POST') {
        const body = JSON.parse(await readBody(req));
        const type = String(body.type || '').trim();
        const resourceId = body.id !== undefined ? body.id : null;
        const result = activeState.setActive(id, type, resourceId);
        json(res, result.ok ? 200 : 400, result, apiHeaders);
        return true;
      }
    }

    return false;
  }

  return { dispatch };
}

module.exports = createResourceManagerRoutes;
