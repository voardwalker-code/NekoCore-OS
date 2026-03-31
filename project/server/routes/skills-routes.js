// ── Routes · Skills Routes ───────────────────────────────────────────────────
//
// HOW SKILLS ROUTING WORKS:
// This module provides APIs for skill listing, approval workflows, quarantine,
// workspace file operations, skill install/create/toggle, and web-search tools.
//
// WHAT USES THIS:
//   skills management UI and runtime skill governance flows
//
// EXPORTS:
//   createSkillsRoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

// ── Skills Routes ─────────────────────────────────────────────
// /api/skills/*, /api/skills/quarantine/*, /api/skills/workspace/*,
// /api/skills/web-search/*

// createSkillsRoutes()
// WHAT THIS DOES: Builds skills route dispatcher for management and tooling endpoints.
// WHY IT EXISTS: Skill lifecycle, quarantine, workspace, and web tools share one route surface.
// HOW TO USE IT: Call createSkillsRoutes(ctx) during server route registration.
function createSkillsRoutes(ctx) {
  const _fs = require('fs');
  const _path = require('path');
  const MA_SKILLS_DIRS = [
    _path.resolve(__dirname, '..', '..', '..', '..', 'MA-Memory-Architect', 'MA', 'MA-skills'),
    _path.join(__dirname, '..', '..', 'MA', 'MA-skills')
  ];

  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;
    const sm = ctx.skillManager;

    if (p === '/api/ma-skills' && m === 'GET') { listMASkills(req, res, apiHeaders); return true; }
    if (p === '/api/skills' && m === 'GET') { listSkills(req, res, apiHeaders, sm); return true; }
    if (p === '/api/skills/approval-mode' && m === 'GET') { getApprovalMode(req, res, apiHeaders); return true; }
    if (p === '/api/skills/approval-mode' && m === 'POST') { await setApprovalMode(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/skills/reload' && m === 'POST') { reloadSkills(req, res, apiHeaders, sm); return true; }
    if (p === '/api/skills/pending' && m === 'GET') { listPending(req, res, apiHeaders, sm); return true; }
    if (p === '/api/skills/approve' && m === 'POST') { await approveSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/reject' && m === 'POST') { await rejectSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/create' && m === 'POST') { await createSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/toggle' && m === 'POST') { await toggleSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/delete' && m === 'POST') { await deleteSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/detail' && m === 'GET') { getSkillDetail(req, res, apiHeaders, url, sm); return true; }
    if (p === '/api/skills/install' && m === 'POST') { await installSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/quarantine' && m === 'GET') { listQuarantined(req, res, apiHeaders, sm); return true; }
    if (p === '/api/skills/quarantine/detail' && m === 'GET') { getQuarantinedDetail(req, res, apiHeaders, url, sm); return true; }
    if (p === '/api/skills/quarantine/vet' && m === 'POST') { await vetSkill(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/quarantine/delete' && m === 'POST') { await deleteQuarantined(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/quarantine/rescan' && m === 'POST') { await rescanQuarantined(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/workspace/list' && m === 'GET') { listWorkspace(req, res, apiHeaders, url, sm); return true; }
    if (p === '/api/skills/workspace/read' && m === 'GET') { readWorkspace(req, res, apiHeaders, url, sm); return true; }
    if (p === '/api/skills/workspace/write' && m === 'POST') { await writeWorkspace(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/workspace/delete' && m === 'POST') { await deleteWorkspace(req, res, apiHeaders, readBody, sm); return true; }
    if (p === '/api/skills/web-search/search' && m === 'POST') { await webSearch(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/skills/web-search/fetch' && m === 'POST') { await webFetch(req, res, apiHeaders, readBody); return true; }
    return false;
  }
  // _noManager()
  // WHAT THIS DOES: Returns standardized error when no skill manager is active.
  // WHY IT EXISTS: Keeps no-entity/no-manager error responses consistent.
  // HOW TO USE IT: Call _noManager(res, apiHeaders) for manager-dependent endpoints.
  function _noManager(res, apiHeaders) {
    res.writeHead(400, apiHeaders);
    res.end(JSON.stringify({ ok: false, error: 'No entity loaded' }));
  }
  // listSkills()
  // WHAT THIS DOES: Lists loaded skills plus pending/quarantine counts.
  // WHY IT EXISTS: Skills dashboard needs one summary payload.
  // HOW TO USE IT: Route GET /api/skills to listSkills(req, res, apiHeaders, sm).
  function listSkills(req, res, apiHeaders, sm) {
    if (!sm) { res.writeHead(200, apiHeaders); res.end(JSON.stringify({ ok: true, skills: [], entityId: null, pendingCount: 0, quarantineCount: 0 })); return; }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, skills: sm.list(), entityId: ctx.currentEntityId, pendingCount: sm.pendingSkills.size, quarantineCount: sm.quarantined.size }));
  }
  // reloadSkills()
  // WHAT THIS DOES: Reloads skill catalog from disk and returns updated list.
  // WHY IT EXISTS: Operators need an immediate refresh path after filesystem changes.
  // HOW TO USE IT: Route POST /api/skills/reload to reloadSkills(req, res, apiHeaders, sm).
  function reloadSkills(req, res, apiHeaders, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    sm.loadAll();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, skills: sm.list(), entityId: ctx.currentEntityId }));
  }
  // getApprovalMode()
  // WHAT THIS DOES: Returns whether skill approval is required for current entity.
  // WHY IT EXISTS: UI must reflect current governance mode before skill actions.
  // HOW TO USE IT: Route GET /api/skills/approval-mode to getApprovalMode(req, res, apiHeaders).
  function getApprovalMode(req, res, apiHeaders) {
    const entityId = ctx.currentEntityId;
    if (!entityId) {
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, entityId: null, required: true }));
      return;
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const entityPaths = require('../entityPaths');
      const entityFile = path.join(entityPaths.getEntityRoot(entityId), 'entity.json');
      let required = true;
      if (fs.existsSync(entityFile)) {
        const entity = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
        required = entity.skillApprovalRequired !== false;
      }
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, entityId, required }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function setApprovalMode(req, res, apiHeaders, readBody) {
    const entityId = ctx.currentEntityId;
    if (!entityId) { _noManager(res, apiHeaders); return; }

    try {
      const body = JSON.parse(await readBody(req));
      const required = body.required !== false;

      const fs = require('fs');
      const path = require('path');
      const entityPaths = require('../entityPaths');
      const entityFile = path.join(entityPaths.getEntityRoot(entityId), 'entity.json');
      if (!fs.existsSync(entityFile)) {
        res.writeHead(404, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Entity not found' }));
        return;
      }

      const entity = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
      entity.skillApprovalRequired = required;
      fs.writeFileSync(entityFile, JSON.stringify(entity, null, 2), 'utf8');

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, entityId, required }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }
  // listPending()
  // WHAT THIS DOES: Lists skill proposals waiting for approval.
  // WHY IT EXISTS: Review queue UI needs pending proposals with minimal overhead.
  // HOW TO USE IT: Route GET /api/skills/pending to listPending(req, res, apiHeaders, sm).
  function listPending(req, res, apiHeaders, sm) {
    if (!sm) { res.writeHead(200, apiHeaders); res.end(JSON.stringify({ ok: true, pending: [] })); return; }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, pending: sm.listPending() }));
  }

  async function approveSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.proposalId) throw new Error('proposalId required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.approveSkill(body.proposalId)));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function rejectSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.proposalId) throw new Error('proposalId required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.rejectSkill(body.proposalId)));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function createSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      const { name, description, instructions, version, requires, tools, trigger } = body;
      if (!name) throw new Error('Name required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.createSkill(name, description || '', instructions || '', { version, requires, tools, trigger })));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function toggleSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      const result = sm.setEnabled(body.name, !!body.enabled);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: result }));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function deleteSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: sm.deleteSkill(body.name) }));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }
  // getSkillDetail()
  // WHAT THIS DOES: Returns detail payload for one installed skill.
  // WHY IT EXISTS: Editors/inspectors need full skill metadata and warnings.
  // HOW TO USE IT: Route GET /api/skills/detail?name=... to getSkillDetail(req, res, apiHeaders, url, sm).
  function getSkillDetail(req, res, apiHeaders, url, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    const name = url.searchParams.get('name');
    const skill = sm.get(name);
    if (!skill) { res.writeHead(404, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'Skill not found' })); return; }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, skill: { name: skill.name, description: skill.description, version: skill.version, enabled: sm.enabledSkills.has(skill.name), instructions: skill.instructions, hasWorkspace: skill.hasWorkspace, tools: skill.tools, requires: skill.requires, clawhubOrigin: skill.clawhubOrigin, securityWarnings: sm.scanSkillContent(skill.instructions, skill.name, skill.dir) } }));
  }

  async function installSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.sourcePath) throw new Error('sourcePath required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.installSkill(body.sourcePath, body.source || 'local')));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }
  // listQuarantined()
  // WHAT THIS DOES: Lists quarantined skills and reasons.
  // WHY IT EXISTS: Security review screen needs clear quarantine inventory.
  // HOW TO USE IT: Route GET /api/skills/quarantine to listQuarantined(req, res, apiHeaders, sm).
  function listQuarantined(req, res, apiHeaders, sm) {
    if (!sm) { res.writeHead(200, apiHeaders); res.end(JSON.stringify({ ok: true, quarantined: [] })); return; }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, quarantined: sm.listQuarantined() }));
  }
  // getQuarantinedDetail()
  // WHAT THIS DOES: Returns detail for one quarantined skill.
  // WHY IT EXISTS: Review workflows need full quarantine context before vet/delete.
  // HOW TO USE IT: Route GET /api/skills/quarantine/detail?name=... to getQuarantinedDetail(...).
  function getQuarantinedDetail(req, res, apiHeaders, url, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    const name = url.searchParams.get('name');
    const q = sm.getQuarantined(name);
    if (!q) { res.writeHead(404, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'Not found in quarantine' })); return; }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, skill: q }));
  }

  async function vetSkill(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.name) throw new Error('name required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.vetSkill(body.name)));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function deleteQuarantined(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.name) throw new Error('name required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.deleteQuarantined(body.name)));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function rescanQuarantined(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.name) throw new Error('name required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(sm.rescanQuarantined(body.name)));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }
  // listWorkspace()
  // WHAT THIS DOES: Lists files in one skill workspace path.
  // WHY IT EXISTS: Skill authoring UI needs directory browsing support.
  // HOW TO USE IT: Route GET /api/skills/workspace/list to listWorkspace(req, res, apiHeaders, url, sm).
  function listWorkspace(req, res, apiHeaders, url, sm) {
    if (!sm) { res.writeHead(200, apiHeaders); res.end(JSON.stringify({ ok: true, files: [] })); return; }
    const skillName = url.searchParams.get('skill');
    const relPath = url.searchParams.get('path') || '.';
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, files: sm.workspaceList(skillName, relPath) }));
  }
  // readWorkspace()
  // WHAT THIS DOES: Reads one workspace file for a skill.
  // WHY IT EXISTS: Skill editors need direct file-content retrieval.
  // HOW TO USE IT: Route GET /api/skills/workspace/read to readWorkspace(req, res, apiHeaders, url, sm).
  function readWorkspace(req, res, apiHeaders, url, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    const skillName = url.searchParams.get('skill');
    const relPath = url.searchParams.get('path');
    if (!relPath) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'path required' })); return; }
    const content = sm.workspaceRead(skillName, relPath);
    if (content === null) { res.writeHead(404, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'File not found' })); return; }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, content }));
  }

  async function writeWorkspace(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      const { skill, path: relPath, content } = body;
      if (!skill || !relPath) throw new Error('skill and path required');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: sm.workspaceWrite(skill, relPath, content || '') }));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function deleteWorkspace(req, res, apiHeaders, readBody, sm) {
    if (!sm) { _noManager(res, apiHeaders); return; }
    try {
      const body = JSON.parse(await readBody(req));
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: sm.workspaceDelete(body.skill, body.path) }));
    } catch (e) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function webSearch(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.query) throw new Error('query required');
      const results = await ctx.webFetch.webSearch(body.query);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, query: body.query, results }));
    } catch (e) { res.writeHead(500, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  async function webFetch(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const targetUrl = body.url;
      if (!targetUrl) throw new Error('url required');
      let parsed;
      try { parsed = new URL(targetUrl); } catch { throw new Error('Invalid URL'); }
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP/HTTPS URLs allowed');
      const result = await ctx.webFetch.fetchAndExtract(targetUrl);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, url: targetUrl, text: result.text, length: result.text.length }));
    } catch (e) { res.writeHead(500, apiHeaders); res.end(JSON.stringify({ ok: false, error: e.message })); }
  }

  // ── MA Skills (drop-in folder) ──────────────────────────────
  // listMASkills()
  // WHAT THIS DOES: Discovers MA drop-in skills and returns lightweight metadata.
  // WHY IT EXISTS: UI should expose skills available from MA shared folders.
  // HOW TO USE IT: Route GET /api/ma-skills to listMASkills(req, res, apiHeaders).
  function listMASkills(req, res, apiHeaders) {
    const skills = [];
    try {
      const maSkillsDir = MA_SKILLS_DIRS.find((dir) => _fs.existsSync(dir));
      if (maSkillsDir) {
        const dirs = _fs.readdirSync(maSkillsDir).filter(d => {
          const full = _path.join(maSkillsDir, d);
          return _fs.statSync(full).isDirectory();
        });
        for (const dir of dirs) {
          let skillMdPath = _path.join(maSkillsDir, dir, 'SKILL.md');
          if (!_fs.existsSync(skillMdPath)) skillMdPath = _path.join(maSkillsDir, dir, 'skill.md');
          if (!_fs.existsSync(skillMdPath)) continue;
          const raw = _fs.readFileSync(skillMdPath, 'utf-8');
          const { meta, body } = _parseFrontmatter(raw);
          skills.push({
            name: meta.name || dir,
            description: meta.description || '',
            enabled: meta.enabled !== false,
            version: meta.version || '1.0.0',
            trigger: meta.trigger || dir
          });
        }
      }
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
      return;
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, skills }));
  }

  /** Minimal YAML-frontmatter parser for MA skill files */
  // _parseFrontmatter()
  // WHAT THIS DOES: Parses simple YAML-like frontmatter from SKILL markdown text.
  // WHY IT EXISTS: Skill metadata should be extracted without full YAML parser dependency.
  // HOW TO USE IT: Call _parseFrontmatter(text) with raw SKILL.md contents.
  function _parseFrontmatter(text) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { meta: {}, body: text };
    const meta = {};
    for (const line of match[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!kv) continue;
      const val = kv[2].trim();
      if (val === 'true') meta[kv[1]] = true;
      else if (val === 'false') meta[kv[1]] = false;
      else meta[kv[1]] = val;
    }
    return { meta, body: text.slice(match[0].length).trim() };
  }

  return { dispatch };
}

module.exports = createSkillsRoutes;
