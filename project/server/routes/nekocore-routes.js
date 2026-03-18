// ── NekoCore Routes ───────────────────────────────────────────────────────────
// /api/nekocore/status
// /api/nekocore/pending
// /api/nekocore/model-recommend
// /api/nekocore/model-apply
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const path = require('path');
const { appendAuditRecord, readAuditRecords } = require('../brain/nekocore/audit');
const { ROLE_DEFINITIONS }                    = require('../brain/nekocore/model-intelligence');
const SkillManager                            = require('../brain/skill-manager');
const { getMemoryRoot }                       = require('../entityPaths');
const {
  getPersonaPresets,
  readPersona,
  applyPersonaUpdate,
  createDefaultPersona,
  writePersonaFiles
} = require('../brain/nekocore/persona-profile');
const { resetNekoCoreRuntime } = require('../brain/nekocore/reset-runtime');
const { ingestArchitectureDocs } = require('../brain/nekocore/doc-ingestion');
const { ensureSystemEntity } = require('../brain/nekocore/bootstrap');
const NK_DOCS_DIR = path.join(__dirname, '..', '..', '..', 'Documents', 'current');
const entityPaths                             = require('../entityPaths');

// ── In-memory recommendation store ───────────────────────────────────────────
// Keyed by recommendationId. Server-restart safe is acceptable for v0.7.0.
const _pendingRecommendations = new Map();

function _shortId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// ── Route factory ─────────────────────────────────────────────────────────────

function createNekoCoreRoutes(ctx) {
  const { fs, path } = ctx;
  const NEKO_ENTITY_ID = 'nekocore';

  function getNekoEntityFile() {
    return path.join(entityPaths.getEntityRoot(NEKO_ENTITY_ID), 'entity.json');
  }

  function readNekoEntity() {
    ensureSystemEntity();
    const entityFile = getNekoEntityFile();
    if (!fs.existsSync(entityFile)) {
      throw new Error('NekoCore entity profile not found');
    }
    return JSON.parse(fs.readFileSync(entityFile, 'utf8'));
  }

  function writeNekoEntity(entity) {
    fs.writeFileSync(getNekoEntityFile(), JSON.stringify(entity, null, 2), 'utf8');
  }

  function getNekoSkillManager() {
    const manager = new SkillManager({ entityId: NEKO_ENTITY_ID });
    manager.loadAll();
    return manager;
  }

  // ── GET /api/nekocore/status ────────────────────────────────────────────────
  function getStatus(req, res, apiHeaders) {
    try {
      const memRoot = entityPaths.getMemoryRoot('nekocore');
      const isReady = fs.existsSync(memRoot);
      const entity = readNekoEntity();
      const skillManager = getNekoSkillManager();

      let activeModel = null;
      if (isReady) {
        try {
          const registryPath = path.join(memRoot, 'model-registry.json');
          if (fs.existsSync(registryPath)) {
            // Registry exists — NekoCore is seeded
            activeModel = '(registry loaded)';
          }
        } catch (_) {}
      }

      const cfg = ctx.loadConfig ? ctx.loadConfig() : null;
      const profile = cfg?.profiles?.[cfg?.lastActive] || null;
      if (profile?.nekocore?.model) activeModel = profile.nekocore.model;

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        isSystemEntityReady: isReady,
        activeModel,
        pendingCount: _pendingRecommendations.size,
        workspacePath: entity.workspacePath || '',
        workspaceScope: entity.workspaceScope || 'workspace-root',
        skillApprovalRequired: entity.skillApprovalRequired !== false,
        enabledSkillCount: skillManager.enabledSkills.size,
        totalSkillCount: skillManager.skills.size
      }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }

  function getTooling(req, res, apiHeaders) {
    try {
      const entity = readNekoEntity();
      const skillManager = getNekoSkillManager();
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        entityId: NEKO_ENTITY_ID,
        workspacePath: entity.workspacePath || '',
        workspaceScope: entity.workspaceScope || 'workspace-root',
        skillApprovalRequired: entity.skillApprovalRequired !== false,
        skills: skillManager.list()
      }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postToolingApproval(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const entity = readNekoEntity();
      entity.skillApprovalRequired = body.required !== false;
      writeNekoEntity(entity);

      appendAuditRecord({
        event: 'tooling_approval_mode',
        requestor: req.accountId || 'unknown',
        targetEntityId: NEKO_ENTITY_ID,
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: `required=${entity.skillApprovalRequired}`
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, required: entity.skillApprovalRequired }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postToolingSkillToggle(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const name = String(body.name || '').trim();
      if (!name) throw new Error('Skill name required');
      const manager = getNekoSkillManager();
      const ok = manager.setEnabled(name, !!body.enabled);
      if (!ok) {
        res.writeHead(404, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Skill not found' }));
        return;
      }

      appendAuditRecord({
        event: 'tooling_skill_toggle',
        requestor: req.accountId || 'unknown',
        targetEntityId: NEKO_ENTITY_ID,
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: `${name}=${body.enabled ? 'enabled' : 'disabled'}`
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, name, enabled: !!body.enabled }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postToolingWorkspace(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const entity = readNekoEntity();
      const wantsAutoDefault = body && body.autoDefault === true;
      let workspacePath = String(body.workspacePath || '').trim();

      if (!workspacePath && wantsAutoDefault) {
        // Default to the repository workspace folder on first-time setup.
        if (entity.workspacePath && String(entity.workspacePath).trim()) {
          workspacePath = String(entity.workspacePath).trim();
        } else {
          workspacePath = path.join(__dirname, '..', '..', 'workspace');
        }
      }

      if (!workspacePath) throw new Error('workspacePath is required');
      if (!path.isAbsolute(workspacePath)) throw new Error('workspacePath must be absolute');

      if (!fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true });
      }

      entity.workspacePath = workspacePath;
      entity.workspaceScope = 'workspace-root';
      writeNekoEntity(entity);

      // Keep the global workspace config aligned for workspace APIs used by the UI.
      if (ctx.loadConfig && ctx.saveConfig) {
        const cfg = ctx.loadConfig() || {};
        if (!cfg.workspacePath || wantsAutoDefault) {
          cfg.workspacePath = workspacePath;
          ctx.saveConfig(cfg);
        }
      }

      appendAuditRecord({
        event: 'tooling_workspace_update',
        requestor: req.accountId || 'unknown',
        targetEntityId: NEKO_ENTITY_ID,
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: `workspacePath=${workspacePath}`
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        workspacePath,
        workspaceScope: 'workspace-root',
        autoConfigured: wantsAutoDefault
      }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── GET /api/nekocore/persona ─────────────────────────────────────────────
  function getPersona(req, res, apiHeaders) {
    try {
      ensureSystemEntity();
      const memRoot = getMemoryRoot('nekocore');
      const persona = readPersona(memRoot);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, persona, presets: getPersonaPresets() }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── POST /api/nekocore/persona ────────────────────────────────────────────
  // Body: { presetId?, userName?, llmStyle?, tone?, llmPersonality?, mood? }
  async function postPersona(req, res, apiHeaders, readBody) {
    try {
      ensureSystemEntity();
      const body = JSON.parse(await readBody(req));
      const memRoot = getMemoryRoot('nekocore');
      const current = readPersona(memRoot);
      const updated = applyPersonaUpdate(current, body);
      writePersonaFiles(memRoot, updated);

      appendAuditRecord({
        event: 'persona_update',
        requestor: req.accountId || 'unknown',
        targetEntityId: 'nekocore',
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: `preset=${body?.presetId || 'custom'} userName=${updated.userName}`
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, persona: updated }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── POST /api/nekocore/persona/reset ──────────────────────────────────────
  async function postPersonaReset(req, res, apiHeaders) {
    try {
      ensureSystemEntity();
      const memRoot = getMemoryRoot('nekocore');
      const persona = createDefaultPersona();
      writePersonaFiles(memRoot, persona);

      appendAuditRecord({
        event: 'persona_reset',
        requestor: req.accountId || 'unknown',
        targetEntityId: 'nekocore',
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: 'Persona reset to defaults'
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, persona }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── POST /api/nekocore/docs-ingest ───────────────────────────────────────
  // Trigger architecture doc ingestion into NekoCore's semantic memory.
  // Body: { docsDir? }  — optional override path; defaults to Documents/current
  async function postDocsIngest(req, res, apiHeaders, readBody) {
    try {
      let docsDir = NK_DOCS_DIR;
      try {
        const body = JSON.parse(await readBody(req));
        if (body && body.docsDir && path.isAbsolute(body.docsDir)) {
          docsDir = body.docsDir;
        }
      } catch (_) {}

      if (!require('fs').existsSync(docsDir)) {
        res.writeHead(404, apiHeaders);
        res.end(JSON.stringify({ ok: false, error: 'Documents directory not found: ' + docsDir, docsDir }));
        return;
      }

      const memRoot = getMemoryRoot('nekocore');
      ingestArchitectureDocs(memRoot, docsDir);

      appendAuditRecord({
        event: 'docs_ingest',
        requestor: req.accountId || 'unknown',
        targetEntityId: 'nekocore',
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: 'docs-ingest triggered from UI: ' + docsDir
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, docsDir }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── GET /api/nekocore/memory-stats ─────────────────────────────────────────
  // Returns total memory count (by type), disk usage, and soft-limit thresholds.
  // SOFT_LIMIT_COUNT: the point where topic-index precision starts to degrade.
  // Disk size is informational only — the count wall is always hit first (~7 MB at 2000 memories).
  const MEMORY_SOFT_LIMIT_COUNT = 2000;

  function _getDirSizeBytes(dir) {
    let total = 0;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { total += _getDirSizeBytes(full); }
        else { try { total += fs.statSync(full).size; } catch (_) {} }
      }
    } catch (_) {}
    return total;
  }

  function getMemoryStats(req, res, apiHeaders) {
    try {
      const memRoot = getMemoryRoot('nekocore');
      if (!fs.existsSync(memRoot)) {
        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({ ok: true, totalCount: 0, episodicCount: 0, semanticCount: 0, docCount: 0, diskBytes: 0, diskMB: 0, softLimitCount: MEMORY_SOFT_LIMIT_COUNT }));
        return;
      }

      // Read the memory index for counts (no dir scan required for counts)
      const MemoryIndexCache = require('../brain/memory/memory-index-cache');
      const cache = new MemoryIndexCache('nekocore');
      cache.load();
      const index = cache.memoryIndex || {};

      let episodicCount = 0, semanticCount = 0, docCount = 0;
      for (const [id, meta] of Object.entries(index)) {
        if (id.startsWith('nkdoc_')) { docCount++; }
        else if ((meta.type || '') === 'episodic') { episodicCount++; }
        else { semanticCount++; }
      }
      const totalCount = episodicCount + semanticCount + docCount;

      // Disk size: walk the memories dir
      const diskBytes = _getDirSizeBytes(memRoot);
      const diskMB    = diskBytes / (1024 * 1024);

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, totalCount, episodicCount, semanticCount, docCount, diskBytes, diskMB, softLimitCount: MEMORY_SOFT_LIMIT_COUNT }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── POST /api/nekocore/reset ──────────────────────────────────────────────
  // Factory reset NekoCore runtime memory while preserving architecture docs.
  async function postRuntimeReset(req, res, apiHeaders) {
    try {
      const result = resetNekoCoreRuntime();

      appendAuditRecord({
        event: 'runtime_reset',
        requestor: req.accountId || 'unknown',
        targetEntityId: 'nekocore',
        targetAspect: 'nekocore',
        decision: 'applied',
        notes: 'Factory reset with architecture document preservation'
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── GET /api/nekocore/pending ───────────────────────────────────────────────
  function getPending(req, res, apiHeaders) {
    const items = [..._pendingRecommendations.values()];
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, pending: items }));
  }

  // ── POST /api/nekocore/model-recommend ─────────────────────────────────────
  // Body: { targetEntityId, targetAspect, reason }
  // Response: { recommendationId, currentModel, suggestedModel, rationale, riskNotes }
  async function postModelRecommend(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const { targetEntityId, targetAspect, reason } = body;

      if (!targetEntityId || !targetAspect) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ error: 'targetEntityId and targetAspect are required' }));
        return;
      }

      // Load current model for this aspect from global profile
      const cfg = ctx.loadConfig ? ctx.loadConfig() : null;
      const profile = cfg?.profiles?.[cfg?.lastActive] || {};
      const currentModel = profile?.[targetAspect]?.model || '(not configured)';

      // Load model registry + performance for selectModel
      const memRoot = entityPaths.getMemoryRoot('nekocore');
      let registry = null, performance = null;
      try {
        const mi = require('../brain/nekocore/model-intelligence');
        registry    = mi.getRegistry(memRoot);
        performance = mi.getPerformance(memRoot);
      } catch (_) {}

      // Suggest a model using NekoCore's intelligence
      let suggestedModel = currentModel;
      let rationale = 'No change recommended.';
      let riskNotes = null;
      let diffusionFlag = false;

      try {
        const mi = require('../brain/nekocore/model-intelligence');
        const result = mi.selectModel(targetAspect, { registry, performance, entityId: targetEntityId });
        if (result && result.modelId && result.modelId !== currentModel) {
          suggestedModel = result.modelId;
          rationale = `selectModel scored ${suggestedModel} highest for role "${targetAspect}" (${result.reason}).`;

          // Check if suggested model is a diffusion model and aspect is sensitive
          const DIFFUSION_SENSITIVE = new Set(['orchestrator', 'conscious']);
          const regModels = registry?.models || {};
          const modelEntry = regModels[suggestedModel];
          if (modelEntry?.diffusionModel && DIFFUSION_SENSITIVE.has(targetAspect)) {
            diffusionFlag = true;
            riskNotes = `${modelEntry.displayName} is a diffusion LLM. Character reformation artifacts may affect skill invocation, structured output, and persona fidelity for the "${targetAspect}" role. Consider a non-diffusion model for this aspect.`;
          } else if (modelEntry?.notes) {
            riskNotes = modelEntry.notes;
          }
        } else if (result?.modelId === currentModel) {
          rationale = `Current model "${currentModel}" is already the best fit for role "${targetAspect}" (score: ${result.score?.toFixed?.(2) || 'n/a'}).`;
        }
      } catch (_) {}

      const recommendationId = _shortId();
      const rec = {
        recommendationId,
        createdAt: new Date().toISOString(),
        requestor: req.accountId || 'unknown',
        targetEntityId,
        targetAspect,
        reason: reason || null,
        currentModel,
        suggestedModel,
        rationale,
        riskNotes,
        diffusionFlag,
        status: 'pending'
      };
      _pendingRecommendations.set(recommendationId, rec);

      appendAuditRecord({
        event: 'recommendation',
        recommendationId,
        requestor: rec.requestor,
        targetEntityId,
        targetAspect,
        beforeModel: currentModel,
        afterModel: suggestedModel,
        decision: 'pending',
        notes: reason || null,
        diffusionFlag
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, ...rec }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ── POST /api/nekocore/model-apply ─────────────────────────────────────────
  // Body: { recommendationId, approved: true|false }
  async function postModelApply(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const { recommendationId, approved } = body;

      if (!recommendationId) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ error: 'recommendationId is required' }));
        return;
      }

      const rec = _pendingRecommendations.get(recommendationId);
      if (!rec) {
        res.writeHead(404, apiHeaders);
        res.end(JSON.stringify({ error: 'Recommendation not found or already resolved' }));
        return;
      }

      if (!approved) {
        rec.status = 'rejected';
        _pendingRecommendations.delete(recommendationId);
        appendAuditRecord({
          event: 'rejection',
          recommendationId,
          requestor: req.accountId || 'unknown',
          targetEntityId:  rec.targetEntityId,
          targetAspect:    rec.targetAspect,
          beforeModel:     rec.currentModel,
          afterModel:      null,
          decision:        'rejected',
          notes:           null,
          diffusionFlag:   rec.diffusionFlag
        });
        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({ ok: true, decision: 'rejected', recommendationId }));
        return;
      }

      // Apply: write the suggested model into the global profile for the target aspect
      const globalCfg = ctx.loadConfig();
      if (!globalCfg.profiles) globalCfg.profiles = {};
      if (!globalCfg.lastActive) globalCfg.lastActive = 'default-multi-llm';
      if (!globalCfg.profiles[globalCfg.lastActive]) globalCfg.profiles[globalCfg.lastActive] = {};

      const targetProfile = globalCfg.profiles[globalCfg.lastActive];
      const existing = targetProfile[rec.targetAspect] || {};
      targetProfile[rec.targetAspect] = { ...existing, model: rec.suggestedModel };
      ctx.saveConfig(globalCfg);

      rec.status = 'approved';
      _pendingRecommendations.delete(recommendationId);

      appendAuditRecord({
        event: 'approval',
        recommendationId,
        requestor: req.accountId || 'unknown',
        targetEntityId:  rec.targetEntityId,
        targetAspect:    rec.targetAspect,
        beforeModel:     rec.currentModel,
        afterModel:      rec.suggestedModel,
        decision:        'approved',
        notes:           null,
        diffusionFlag:   rec.diffusionFlag
      });

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        decision: 'approved',
        recommendationId,
        targetAspect: rec.targetAspect,
        appliedModel: rec.suggestedModel
      }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ── POST /api/nekocore/chat ────────────────────────────────────────────────
  // Dedicated chat with the NekoCore system entity — no checkout required.
  // Body: { message, chatHistory? }
  async function postChat(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const { message, chatHistory } = body;
      if (!message || !String(message).trim()) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ error: 'Missing message' }));
        return;
      }
      const result = await ctx.processNekoCoreChatMessage(
        String(message).trim(),
        Array.isArray(chatHistory) ? chatHistory : []
      );
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, response: result.finalResponse || '' }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  // ── Dispatcher ────────────────────────────────────────────────────────────
  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;

    if (p === '/api/nekocore/status'          && m === 'GET')  { getStatus(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/tooling'         && m === 'GET')  { getTooling(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/tooling/approval' && m === 'POST') { await postToolingApproval(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/tooling/skill-toggle' && m === 'POST') { await postToolingSkillToggle(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/tooling/workspace' && m === 'POST') { await postToolingWorkspace(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/persona'         && m === 'GET')  { getPersona(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/persona'         && m === 'POST') { await postPersona(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/persona/reset'   && m === 'POST') { await postPersonaReset(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/memory-stats'     && m === 'GET')  { getMemoryStats(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/docs-ingest'     && m === 'POST') { await postDocsIngest(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/reset'           && m === 'POST') { await postRuntimeReset(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/pending'         && m === 'GET')  { getPending(req, res, apiHeaders); return true; }
    if (p === '/api/nekocore/model-recommend' && m === 'POST') { await postModelRecommend(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/model-apply'     && m === 'POST') { await postModelApply(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/nekocore/chat'            && m === 'POST') { await postChat(req, res, apiHeaders, readBody); return true; }

    return false;
  }

  return { dispatch };
}

module.exports = createNekoCoreRoutes;
