// ============================================================
// NekoCore OS — Chat Pipeline Service
// Extracted from server.js P2-S6-a.
// Owns: processChatMessage, processPendingSkillApproval,
//       skill approval state (pendingSkillToolApprovals Map),
//       and all related helpers.
// ============================================================
'use strict';

const path         = require('path');
const fs           = require('fs');
const entityPaths  = require('../entityPaths');
const Orchestrator = require('../brain/orchestrator');
const { createTaskFrontman } = require('../brain/tasks/task-frontman');
const { createTaskPipelineBridge } = require('../brain/tasks/task-pipeline-bridge');
const cmdExecutor = require('../integrations/cmd-executor');
const { resumeWithInput } = require('../brain/tasks/task-executor');
const { stripInternalResumeTag, runtimeLabel } = require('./llm-runtime-utils');
const { runPostResponseMemoryEncoding } = require('./post-response-memory');
const { runCognitiveFeedbackLoop }      = require('./post-response-cognitive-feedback');
const { postProcessResponse }           = require('./response-postprocess');
const { assembleCognitiveSnapshot }     = require('../brain/cognition/cognitive-snapshot');
const { classifyTurn }                  = require('../brain/utils/turn-classifier');
const { getTemplateResponse }           = require('../brain/utils/template-responses');
const { validateClassification }        = require('../contracts/turn-classifier-contract');
const { getEntityCache }                = require('../brain/utils/semantic-cache');

// ── Skill approval state ──────────────────────────────────────────────────────
// Exclusively used by this pipeline — no other module needs these.

const SKILL_RUNTIME_TOOL_COMMANDS = new Set([
  'ws_list', 'ws_read', 'ws_write', 'ws_append', 'ws_delete', 'ws_move',
  'web_search', 'web_fetch', 'mem_search', 'mem_create', 'search_archive'
]);

const pendingSkillToolApprovals = new Map();

function cleanupPendingSkillApprovals(now = Date.now()) {
  const ttlMs = 5 * 60 * 1000;
  for (const [id, pending] of pendingSkillToolApprovals.entries()) {
    const createdAt = pending?.createdAt || 0;
    if ((now - createdAt) > ttlMs) pendingSkillToolApprovals.delete(id);
  }
}

function isSkillApprovalRequired(entityId) {
  if (!entityId) return true;
  try {
    const entityFile = path.join(entityPaths.getEntityRoot(entityId), 'entity.json');
    if (!fs.existsSync(entityFile)) return true;
    const entityData = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
    return entityData.skillApprovalRequired !== false;
  } catch (_) {
    return true;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create the main chat pipeline.
 *
 * @param {Object} deps
 * @param {Object}   deps.brain                  - EntityRuntime (entity-scoped state)
 * @param {Function} deps.callLLMWithRuntime
 * @param {Function} deps.resolveProfileAspectConfigs
 * @param {Function} deps.loadConfig
 * @param {Function} deps.getSubconsciousMemoryContext
 * @param {Function} deps.createCoreMemory
 * @param {Function} deps.createSemanticKnowledge
 * @param {Function} deps.broadcastSSE
 * @param {Function} deps.logTimeline
 * @param {Object}   deps.hatchEntity
 * @param {Object}   deps.identityManager
 * @param {Object}   deps.entityManager
 * @param {Object}   deps.cognitiveBus
 * @param {Object}   deps.contextConsolidator
 * @param {Object}   deps.workspaceTools
 * @param {Object}   deps.taskRunner
 * @param {Object}   deps.webFetch
 * @param {Function} deps.getTokenLimit
 * @param {Map}      deps.reconstructionCache
 * @param {number}   deps.reconstructionCacheTtlMs
 * @param {Function} deps.setLastAspectConfigs   - (cfg) => void
 * @param {Function} deps.getBrainLoop           - () => brainLoop | null
 */
function createChatPipeline(deps) {
  const {
    brain,
    callLLMWithRuntime,
    resolveProfileAspectConfigs,
    loadConfig,
    getSubconsciousMemoryContext,
    createCoreMemory,
    createSemanticKnowledge,
    broadcastSSE,
    logTimeline,
    hatchEntity,
    identityManager,
    entityManager,
    cognitiveBus,
    contextConsolidator,
    workspaceTools,
    taskRunner,
    webFetch,
    getTokenLimit,
    reconstructionCache,
    reconstructionCacheTtlMs,
    setLastAspectConfigs,
    getBrainLoop,
  } = deps;

  // ── Task pipeline fork (T-6) ─────────────────────────────────────────────
  const taskFrontman = createTaskFrontman({
    callLLMWithRuntime,
    broadcastSSE,
    logTimeline,
    resumeWithInput
  });
  const taskPipelineBridge = createTaskPipelineBridge({
    callLLMWithRuntime,
    frontman: taskFrontman,
    getSubconsciousMemoryContext,
    webFetch,
    workspaceTools,
    cmdRun: cmdExecutor.execCommand,
    logTimeline
  });

  // ── Build shared callback sets (used by both processChatMessage and processPendingSkillApproval) ──

  function buildMemoryCallbacks() {
    const memorySearchFn = async (query) => {
      if (!query) return { ok: false, error: 'No search query provided' };
      try {
        const ctx = await getSubconsciousMemoryContext(query, 10);
        return {
          ok: true,
          memories: (ctx.connections || []).slice(0, 10),
          chatlogContext: ctx.chatlogContext || [],
          message: `Found ${ctx.connections.length} memories` + (ctx.chatlogContext?.length ? ` and ${ctx.chatlogContext.length} related chatlogs` : '')
        };
      } catch (e) { return { ok: false, error: 'Memory search failed: ' + e.message }; }
    };
    const memoryCreateFn = async (params) => {
      const { semantic, importance, emotion, topics } = params;
      if (!semantic) return { ok: false, error: 'No semantic content provided' };
      try {
        const topicArr = topics ? topics.split(',').map(t => t.trim()) : [];
        return createCoreMemory(semantic, semantic, emotion || 'neutral', topicArr, parseFloat(importance) || 0.8);
      } catch (e) { return { ok: false, error: 'Memory creation failed: ' + e.message }; }
    };
    return { memorySearchFn, memoryCreateFn };
  }

  function buildArchiveCallbacks() {
    const archiveSearchFn = async (query, yearRangeRaw, limitRaw) => {
      const entityId = brain.entityId || null;
      if (!entityId) return { ok: false, error: 'No entity loaded' };
      if (!query) return { ok: false, error: 'No query provided' };
      try {
        const { extractPhrases } = require('../brain/utils/rake');
        const { queryArchive }   = require('../brain/utils/archive-index');
        const archivePaths       = require('../entityPaths');
        const topics = extractPhrases(String(query));
        let yearRange = {};
        if (yearRangeRaw && typeof yearRangeRaw === 'string') {
          try { yearRange = JSON.parse(yearRangeRaw); } catch (_) {}
        } else if (yearRangeRaw && typeof yearRangeRaw === 'object') {
          yearRange = yearRangeRaw;
        }
        const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 5, 1), 20);
        const hits = queryArchive(entityId, topics, limit, yearRange);
        const results = hits.map(h => {
          let summary = '';
          try {
            const epPath = path.join(archivePaths.getArchiveEpisodicPath(entityId), h.memId, 'semantic.txt');
            const docPath = path.join(archivePaths.getArchiveDocsPath(entityId), h.memId, 'semantic.txt');
            const src = fs.existsSync(epPath) ? epPath : fs.existsSync(docPath) ? docPath : null;
            if (src) summary = fs.readFileSync(src, 'utf8').slice(0, 1500);
          } catch (_) {}
          return { id: h.memId, score: h.score, summary, archivedAt: h.meta.archivedAt || null, topics: h.meta.topics || [], type: h.meta.type || 'episodic' };
        });
        return { ok: true, results, total: results.length };
      } catch (e) { return { ok: false, error: 'Archive search failed: ' + e.message }; }
    };
    return { archiveSearchFn };
  }

  function buildSkillCallbacks() {
    const skillCreateFn = async (params) => {
      if (!brain.skillManager) return { ok: false, error: 'No entity loaded — skills unavailable' };
      const { name, description, instructions } = params;
      if (!name) return { ok: false, error: 'No skill name provided' };
      if (!instructions) return { ok: false, error: 'No instructions provided — write the skill\'s purpose and behavior' };
      try {
        const result = brain.skillManager.proposeSkill(name, description || '', instructions);
        if (result.ok) console.log(`  ⏳ Entity proposed skill: ${result.name} (pending approval)`);
        return result;
      } catch (e) { return { ok: false, error: 'Skill proposal failed: ' + e.message }; }
    };
    const skillListFn = async () => {
      if (!brain.skillManager) return { ok: false, error: 'No entity loaded — skills unavailable' };
      try { return { ok: true, skills: brain.skillManager.list() }; }
      catch (e) { return { ok: false, error: 'Skill listing failed: ' + e.message }; }
    };
    const skillEditFn = async (params) => {
      if (!brain.skillManager) return { ok: false, error: 'No entity loaded — skills unavailable' };
      const { name, description, instructions } = params;
      if (!name) return { ok: false, error: 'No skill name provided' };
      const skill = brain.skillManager.get(name);
      if (!skill) return { ok: false, error: `Skill not found: ${name}` };
      try {
        const result = brain.skillManager.proposeEdit(name, description, instructions);
        if (result.ok) console.log(`  ⏳ Entity proposed edit to skill: ${name} (pending approval)`);
        return result;
      } catch (e) { return { ok: false, error: 'Skill edit proposal failed: ' + e.message }; }
    };
    const profileUpdateFn = async (params) => {
      if (!brain.entityId) return { ok: false, error: 'No entity loaded — profile update unavailable' };
      try {
        const entityFile = path.join(entityPaths.getEntityRoot(brain.entityId), 'entity.json');
        if (!fs.existsSync(entityFile)) return { ok: false, error: 'Entity profile file not found' };
        const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
        const updatedFields = [];
        if (typeof params.name === 'string' && params.name.trim()) { data.name = params.name.trim().slice(0, 80); updatedFields.push('name'); }
        if (typeof params.gender === 'string' && params.gender.trim()) { data.gender = params.gender.trim().slice(0, 30); updatedFields.push('gender'); }
        if (typeof params.introduction === 'string' && params.introduction.trim()) { data.introduction = params.introduction.trim().slice(0, 2000); updatedFields.push('introduction'); }
        if (Array.isArray(params.traits)) { data.personality_traits = params.traits.map(t => String(t).trim()).filter(Boolean).slice(0, 12); updatedFields.push('personality_traits'); }
        else if (typeof params.traits === 'string' && params.traits.trim()) { data.personality_traits = params.traits.split(',').map(t => t.trim()).filter(Boolean).slice(0, 12); updatedFields.push('personality_traits'); }
        if (updatedFields.length === 0) return { ok: false, error: 'No valid fields provided. Use name, gender, introduction, or traits.' };
        fs.writeFileSync(entityFile, JSON.stringify(data, null, 2), 'utf8');
        return { ok: true, message: 'Profile updated: ' + updatedFields.join(', '), updatedFields, profile: { name: data.name, gender: data.gender, introduction: data.introduction, personality_traits: data.personality_traits || [] } };
      } catch (e) { return { ok: false, error: 'Profile update failed: ' + e.message }; }
    };
    return { skillCreateFn, skillListFn, skillEditFn, profileUpdateFn };
  }

  // ── processPendingSkillApproval ───────────────────────────────────────────

  async function processPendingSkillApproval(approvalId, approved) {
    cleanupPendingSkillApprovals();
    const pending = pendingSkillToolApprovals.get(String(approvalId || ''));
    if (!pending) {
      return { ok: false, error: 'Skill approval request expired or not found' };
    }
    if (!approved) {
      pendingSkillToolApprovals.delete(String(approvalId));
      return { ok: true, response: pending.cancelResponse || pending.draftResponse || '', toolResults: [] };
    }
    pendingSkillToolApprovals.delete(String(approvalId));

    const { memorySearchFn, memoryCreateFn } = buildMemoryCallbacks();
    const { skillCreateFn, skillListFn, skillEditFn, profileUpdateFn } = buildSkillCallbacks();
    const { archiveSearchFn } = buildArchiveCallbacks();

    const toolExec = await workspaceTools.executeToolCalls(pending.rawResponse, {
      workspacePath: pending.workspacePath || '',
      webFetch,
      memorySearch: memorySearchFn,
      memoryCreate: memoryCreateFn,
      archiveSearch: archiveSearchFn,
      skillCreate: skillCreateFn,
      skillList: skillListFn,
      skillEdit: skillEditFn,
      profileUpdate: profileUpdateFn
    });

    if (!toolExec.hadTools || toolExec.toolResults.length === 0) {
      return { ok: true, response: pending.cancelResponse || pending.draftResponse || '', toolResults: [] };
    }

    const toolResultsBlock = workspaceTools.formatToolResults(toolExec.toolResults);
    const followUpMessages = [
      { role: 'system', content: `You are ${pending.entityName || 'the entity'}. The user approved your requested skill action. Incorporate the tool results naturally. Stay in character. Do NOT include [TOOL:...] tags in your response.` },
      { role: 'user', content: `Original user message: "${pending.userMessage}"\n\nYour draft response (before tools ran):\n${toolExec.cleanedResponse}\n\n${toolResultsBlock}\n\nNow write your final response incorporating the tool results naturally. Stay in character.` }
    ];
    const followUpResponse = await callLLMWithRuntime(pending.runtime, followUpMessages, { temperature: 0.6 });
    return {
      ok: true,
      response: followUpResponse || toolExec.cleanedResponse,
      toolResults: toolExec.toolResults
    };
  }

  // ── processChatMessage ────────────────────────────────────────────────────

  async function processChatMessage(userMessage, chatHistory = []) {
    const isInternalResume = /^\s*\[INTERNAL-RESUME\]/i.test(String(userMessage || ''));
    const isWakeFromSleep = /^\s*\[WAKE-FROM-SLEEP\]/i.test(String(userMessage || ''));
    const effectiveUserMessage = isInternalResume ? stripInternalResumeTag(userMessage) : userMessage;
    logTimeline('chat.user_message', {
      isInternalResume,
      isWakeFromSleep,
      userMessage: String(effectiveUserMessage || '').slice(0, 1200),
      chatHistoryCount: Array.isArray(chatHistory) ? chatHistory.length : 0
    });

    let aspectConfigs = {};
    let entity = null;
    if (brain.entityId) {
      try { entity = hatchEntity.loadEntity(); } catch (_) {}
    }

    const globalConfig = loadConfig();
    const profileRef = globalConfig?.lastActive;
    if (globalConfig && globalConfig.profiles && profileRef) {
      const profile = globalConfig.profiles[profileRef];
      const resolved = resolveProfileAspectConfigs(profile);
      if (resolved.main) {
        aspectConfigs.main = resolved.main;
        aspectConfigs.subconscious = resolved.subconscious;
        aspectConfigs.dream = resolved.dream;
        aspectConfigs.orchestrator = resolved.orchestrator;
        aspectConfigs.background = resolved.background;
      }
    }

    if (!aspectConfigs.main || !aspectConfigs.main.type) {
      throw new Error('No LLM aspect configurations available. Please complete setup.');
    }

    setLastAspectConfigs(aspectConfigs);
    const _brainLoop = getBrainLoop();
    if (_brainLoop) {
      _brainLoop.setAspectConfigs(aspectConfigs);
      _brainLoop.setCallLLM(callLLMWithRuntime);
      _brainLoop.setOnEvent((event, data) => broadcastSSE('brain_' + event, data));
    }

    if (!entity) {
      entity = hatchEntity.loadEntity();
    }

    // Enrich entity with system prompt and persona
    if (entity && brain.entityId) {
      try {
        const entityMemRoot = entityPaths.getMemoryRoot(brain.entityId);
        const consolidatedCtx = contextConsolidator.loadConsolidatedContext(brain.entityId, entityPaths);
        if (consolidatedCtx) {
          entity.systemPromptText = consolidatedCtx;
        } else {
          const sysPromptPath = path.join(entityMemRoot, 'system-prompt.txt');
          if (fs.existsSync(sysPromptPath)) {
            entity.systemPromptText = fs.readFileSync(sysPromptPath, 'utf8');
          }
        }
        const personaPath = path.join(entityMemRoot, 'persona.json');
        if (fs.existsSync(personaPath)) {
          entity.persona = JSON.parse(fs.readFileSync(personaPath, 'utf8'));
        }
        try {
          const userProfiles = require('./user-profiles');
          const activeUser = userProfiles.getActiveUser(brain.entityId, entityPaths);
          if (activeUser) {
            if (!entity.persona) entity.persona = {};
            entity.persona.userName = activeUser.name;
            entity.persona.userIdentity = activeUser.info || '';
            entity.persona.activeUserId = activeUser.id;
          }
        } catch (_) {}
      } catch (enrichErr) {
        console.warn('  ⚠ Could not enrich entity with prompt/persona:', enrichErr.message);
      }
    }

    // Inject skills context
    if (entity && brain.skillManager) {
      entity.skillsPrompt = brain.skillManager.buildSkillsPrompt();
      try {
        const maConfig = loadConfig();
        const shouldUseConfigWorkspace = !entity.isSystemEntity || !entity.workspacePath;
        if (shouldUseConfigWorkspace && maConfig.workspacePath) {
          entity.workspacePath = maConfig.workspacePath;
        }
      } catch (_) {}
      try {
        const identity = identityManager.getIdentity();
        if (identity.beliefs && Object.keys(identity.beliefs).length > 0) {
          entity.beliefs = identity.beliefs;
        }
      } catch (_) {}
    }

    // Overlay live mood from neurochemistry
    if (entity && brain.neurochemistry) {
      try {
        const live = brain.neurochemistry.deriveMood();
        if (!entity.persona) entity.persona = {};
        entity.persona.mood = live.mood;
        entity.persona.emotions = live.emotions;
        entity.neurochemicalState = brain.neurochemistry.getChemicalState();
      } catch (_) {}
    }

    // T-6: Task dispatch fork before companion pipeline.
    // High-confidence tasks route to Frontman + task executor/planning orchestrator.
    try {
      const taskDispatch = await taskPipelineBridge.detectAndDispatchTask(effectiveUserMessage, {
        id: brain.entityId,
        name: entity?.name || 'Entity',
        personality_traits: entity?.personality_traits || [],
        persona: entity?.persona || null,
        mood: entity?.persona?.mood || null,
        relationship: entity?.persona?.userIdentity || null,
        workspacePath: entity?.workspacePath || '',
        systemPromptText: entity?.systemPromptText || ''
      }, {
        isInternalResume: isInternalResume || isWakeFromSleep,
        aspectConfigs
      });

      if (taskDispatch && taskDispatch.handled) {
        logTimeline('chat.task_fork.dispatched', {
          mode: taskDispatch.mode,
          taskType: taskDispatch.classification?.taskType || null,
          confidence: taskDispatch.classification?.confidence || null,
          taskSessionId: taskDispatch.taskSessionId || null,
          planningSessionId: taskDispatch.planningSessionId || null
        });

        return {
          finalResponse: taskDispatch.response,
          innerDialog: null,
          memoryConnections: [],
          taskMode: taskDispatch.mode,
          taskSessionId: taskDispatch.taskSessionId || null,
          planningSessionId: taskDispatch.planningSessionId || null,
          classification: taskDispatch.classification || null
        };
      }
    } catch (taskForkErr) {
      // Never break companion chat on task-fork failures.
      console.warn('  ⚠ Task dispatch fork failed, continuing with companion pipeline:', taskForkErr.message);
    }

    // ── T2-3: Hybrid Router — classify turn and fast-path simple ones ────────
    const hybridRouterEnabled = loadConfig()?.pipeline?.hybridRouter !== false;
    if (hybridRouterEnabled && !isInternalResume) {
      try {
        const classification = classifyTurn(effectiveUserMessage);
        const valid = validateClassification(classification);
        if (valid.ok && classification.bypass) {
          const templateResult = getTemplateResponse(classification.category, {
            userName: entity?.persona?.userName || null,
            name: entity?.name || null,
            mood: entity?.persona?.mood || 'neutral'
          });

          if (templateResult) {
            broadcastSSE('turn_classified', {
              category: classification.category,
              confidence: classification.confidence,
              bypass: true,
              _source: 'template',
              timestamp: Date.now()
            });

            logTimeline('chat.hybrid_router.bypass', {
              category: classification.category,
              confidence: classification.confidence,
              tokens_saved_estimate: 15000
            });

            // Still run NLP memory encoding + cognitive feedback (async)
            const memoryEntityId = brain.entityId;
            const memoryAspectConfigs = { ...aspectConfigs };
            if (memoryEntityId && memoryAspectConfigs.subconscious) {
              setImmediate(async () => {
                await runPostResponseMemoryEncoding({
                  effectiveUserMessage,
                  finalResponse: templateResult.response,
                  innerDialog: null,
                  memoryEntityId,
                  memoryAspectConfigs,
                  callLLMWithRuntime,
                  getTokenLimit,
                  createCoreMemory,
                  createSemanticKnowledge,
                  broadcastSSE,
                  traceGraph: brain.traceGraph,
                  memoryGraph: brain.memoryGraph,
                  logTimeline,
                  memoryStorage: brain.memoryStorage,
                  entityName: entity?.name || null,
                  userName: entity?.persona?.userName || null,
                  activeUserId: entity?.persona?.activeUserId || null,
                  entityPersona: entity?.persona || null
                });
                await runCognitiveFeedbackLoop({
                  userMessage: effectiveUserMessage,
                  entityResponse: templateResult.response,
                  preSnapshot: null,
                  importance: 0,
                  trustDelta: 0,
                  beliefGraph: brain.beliefGraph || null,
                  goalsManager: brain.goalsManager || null,
                  curiosityEngine: brain.curiosityEngine || null,
                  cognitiveBus: cognitiveBus || null,
                  logTimeline,
                  broadcastSSE,
                  entityId: memoryEntityId
                });
              });
            }

            // Emit orchestration_complete so Task Manager shows the bypass
            broadcastSSE('orchestration_complete', {
              totalDuration: 0,
              timestamp: Date.now(),
              tokenUsage: null,
              models: null,
              timing: null,
              _source: 'template'
            });

            return {
              finalResponse: templateResult.response,
              innerDialog: null,
              memoryConnections: [],
              _source: 'template',
              _classification: classification
            };
          }
        }

        // Non-bypass: emit classification for observability, continue to full pipeline
        if (valid.ok) {
          broadcastSSE('turn_classified', {
            category: classification.category,
            confidence: classification.confidence,
            bypass: false,
            timestamp: Date.now()
          });
        }
      } catch (classifyErr) {
        // Never break companion chat on classifier failures.
        console.warn('  ⚠ Turn classifier failed, continuing with full pipeline:', classifyErr.message);
      }
    }

    // ── T4-1: Semantic cache — check before full pipeline ──────────────────
    const semanticCacheEnabled = loadConfig()?.pipeline?.semanticCache !== false;
    if (semanticCacheEnabled && !isInternalResume) {
      try {
        const entityCache = getEntityCache(brain.entityId);
        const cacheResult = entityCache.lookup(effectiveUserMessage);
        if (cacheResult.hit) {
          broadcastSSE('cache_hit', {
            score: cacheResult.entry.score,
            originalTurnId: cacheResult.entry.originalTurnId,
            timestamp: Date.now()
          });

          logTimeline('chat.semantic_cache.hit', {
            score: cacheResult.entry.score,
            tokens_saved_estimate: 16000
          });

          // Still run NLP memory encoding + cognitive feedback (async)
          const memoryEntityId = brain.entityId;
          const memoryAspectConfigs = { ...aspectConfigs };
          if (memoryEntityId && memoryAspectConfigs.subconscious) {
            setImmediate(async () => {
              await runPostResponseMemoryEncoding({
                effectiveUserMessage,
                finalResponse: cacheResult.entry.response,
                innerDialog: null,
                memoryEntityId,
                memoryAspectConfigs,
                callLLMWithRuntime,
                getTokenLimit,
                createCoreMemory,
                createSemanticKnowledge,
                broadcastSSE,
                traceGraph: brain.traceGraph,
                memoryGraph: brain.memoryGraph,
                logTimeline,
                memoryStorage: brain.memoryStorage,
                entityName: entity?.name || null,
                userName: entity?.persona?.userName || null,
                activeUserId: entity?.persona?.activeUserId || null,
                entityPersona: entity?.persona || null
              });
              await runCognitiveFeedbackLoop({
                userMessage: effectiveUserMessage,
                entityResponse: cacheResult.entry.response,
                preSnapshot: null,
                importance: 0,
                trustDelta: 0,
                beliefGraph: brain.beliefGraph || null,
                goalsManager: brain.goalsManager || null,
                curiosityEngine: brain.curiosityEngine || null,
                cognitiveBus: cognitiveBus || null,
                logTimeline,
                broadcastSSE,
                entityId: memoryEntityId
              });
            });
          }

          // Emit orchestration_complete so Task Manager shows the cache hit
          broadcastSSE('orchestration_complete', {
            totalDuration: 0,
            timestamp: Date.now(),
            tokenUsage: null,
            models: null,
            timing: null,
            _source: 'semantic-cache'
          });

          return {
            finalResponse: cacheResult.entry.response,
            innerDialog: null,
            memoryConnections: [],
            taskMode: taskDispatch.mode,
            taskSessionId: taskDispatch.taskSessionId || null,
            planningSessionId: taskDispatch.planningSessionId || null,
            classification: taskDispatch.classification || null,
            _source: 'semantic-cache'
          };
        }
      } catch (cacheErr) {
        console.warn('  ⚠ Semantic cache lookup failed, continuing with full pipeline:', cacheErr.message);
      }
    }

    // Run orchestrator
    // ── Assemble cognitive snapshot (pre-turn) ──
    let cognitiveSnapshotBlock = '';
    let cognitiveSnapshotData = null;
    try {
      const msgTopics = effectiveUserMessage.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4);
      const { snapshot, block } = assembleCognitiveSnapshot({
        beliefGraph: brain.beliefGraph || null,
        goalsManager: brain.goalsManager || null,
        neurochemistry: brain.neurochemistry || null,
        curiosityEngine: brain.curiosityEngine || null,
        identityManager: identityManager || null,
        entityId: brain.entityId,
        userMessageTopics: msgTopics
      });
      cognitiveSnapshotBlock = block || '';
      cognitiveSnapshotData = snapshot || null;

      // C12: SSE event for cognitive snapshot observability
      if (cognitiveSnapshotData) {
        broadcastSSE('cognitive_snapshot_assembled', {
          beliefs: (snapshot.beliefs?.standing || []).length,
          conflicts: (snapshot.beliefs?.conflicts || []).length,
          goals: (snapshot.goals?.active || []).length,
          mood: snapshot.mood?.current || 'unknown',
          stressTier: snapshot.mood?.stressTier || 'unknown',
          curiosity: (snapshot.curiosity?.activeQuestions || []).length,
          timestamp: Date.now()
        });
      }
    } catch (snapErr) {
      console.warn('  ⚠ Cognitive snapshot assembly failed, continuing without:', snapErr.message);
    }

    const orchestrator = new Orchestrator({
      entity,
      callLLM: callLLMWithRuntime,
      aspectConfigs,
      getMemoryContext: getSubconsciousMemoryContext,
      getBeliefs: (topics) => {
        const identityBeliefs = identityManager.getRelevantBeliefs(topics, 0.3);
        if (brain.beliefGraph) {
          const graphBeliefs = brain.beliefGraph.getRelevantBeliefs(topics, 0.3);
          return [...identityBeliefs, ...graphBeliefs];
        }
        return identityBeliefs;
      },
      getSomaticState: () => {
        if (!brain.somaticAwareness) return null;
        return {
          sensations: { ...brain.somaticAwareness.sensations },
          overallStress: brain.somaticAwareness.overallStress,
          bodyNarrative: brain.somaticAwareness.bodyNarrative
        };
      },
      getConsciousContext: brain.consciousMemory
        ? async (topics) => brain.consciousMemory.getContext(topics, 5)
        : null,
      storeConsciousObservation: brain.consciousMemory
        ? async (msg, response, topics) => {
            const summary = response?.slice(0, 300) || msg.slice(0, 300);
            brain.consciousMemory.addToStm({ summary, topics, source: 'conscious_observation' });
            brain.consciousMemory.reinforce(topics);
          }
        : null,
      reconstructedChatlogCache: reconstructionCache,
      reconstructedChatlogTtlMs: reconstructionCacheTtlMs,
      cognitiveBus,
      getTokenLimit,
      getSkillContext: (skillName) => brain.skillManager ? brain.skillManager.buildSkillsPromptFor(skillName) : null,
      getEntitySummaries: entity?.isSystemEntity ? () => {
        try {
          return (entityManager.listEntities() || [])
            .filter(e => e && !e.isSystemEntity)
            .map(e => ({ id: e.id, name: e.name, traits: (e.personality_traits || []).slice(0, 3) }));
        } catch (_) { return []; }
      } : null,
      cognitiveSnapshot: cognitiveSnapshotBlock
    });

    console.log(`  ℹ Running orchestrator with aspects: main=${runtimeLabel(aspectConfigs.main)}, sub=${runtimeLabel(aspectConfigs.subconscious)}, dream=${runtimeLabel(aspectConfigs.dream)}, orch=${runtimeLabel(aspectConfigs.orchestrator)}`);
    const trimmedChatHistory = Array.isArray(chatHistory) ? chatHistory.slice(-10) : [];
    const result = await orchestrator.orchestrate(effectiveUserMessage, trimmedChatHistory, {
      entityId: brain.entityId,
      memoryStorage: brain.memoryStorage,
      identityManager
    });

    const rawOrchestratorOutput = result.finalResponse;
    logTimeline('chat.orchestrator_completed', {
      responseLength: String(rawOrchestratorOutput || '').length,
      hasInnerDialog: !!result.innerDialog
    });

    // C-3: Record model performance into NekoCore's model intelligence memory (non-blocking)
    try {
      const _nekoMemDir = entityPaths.getMemoryRoot('nekocore');
      if (fs.existsSync(_nekoMemDir) && result.innerDialog) {
        const _mi     = require('../brain/nekocore/model-intelligence');
        const _models = result.innerDialog.models  || {};
        const _usage  = result.innerDialog.tokenUsage || {};
        const _timing = result.innerDialog.timing  || {};
        for (const _aspect of ['subconscious', 'conscious', 'dream', 'orchestrator']) {
          const _mid = _models[_aspect];
          if (!_mid || _mid === 'unknown') continue;
          _mi.recordPerformance(_nekoMemDir, {
            role:        _aspect,
            modelId:     _mid,
            entityId:    brain.entityId,
            quality:     0.75,
            latencyMs:   _timing.total_ms || null,
            tokensTotal: (_usage[_aspect] || {}).total_tokens || null
          });
        }
      }
    } catch (_) { /* non-critical */ }

    const { memorySearchFn, memoryCreateFn } = buildMemoryCallbacks();
    const { skillCreateFn, skillListFn, skillEditFn, profileUpdateFn } = buildSkillCallbacks();
    const { archiveSearchFn } = buildArchiveCallbacks();

    // Override profileUpdateFn to also update local entity reference on success
    const profileUpdateWithSync = async (params) => {
      const r = await profileUpdateFn(params);
      if (r.ok && entity) {
        if (r.updatedFields.includes('name')) entity.name = r.profile.name;
        if (r.updatedFields.includes('gender')) entity.gender = r.profile.gender;
        if (r.updatedFields.includes('introduction')) entity.introduction = r.profile.introduction;
        if (r.updatedFields.includes('personality_traits')) entity.personality_traits = r.profile.personality_traits;
      }
      return r;
    };

    // ── Skill approval gate ──────────────────────────────────────────────────
    const proposedToolCalls = workspaceTools.extractToolCalls(result.finalResponse || '');
    const needsSkillApproval = !isInternalResume &&
      isSkillApprovalRequired(brain.entityId) &&
      proposedToolCalls.some(c => SKILL_RUNTIME_TOOL_COMMANDS.has(c.command));

    if (needsSkillApproval) {
      cleanupPendingSkillApprovals();
      const approvalId = `skill_approval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const approvedTools = proposedToolCalls
        .filter(c => SKILL_RUNTIME_TOOL_COMMANDS.has(c.command))
        .map(c => ({ command: c.command, params: c.params || {} }));
      let cleanedDraft = workspaceTools.stripToolCalls(result.finalResponse || '');
      cleanedDraft = cleanedDraft.replace(/\[TASK_PLAN\][\s\S]*?\[\/TASK_PLAN\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
      pendingSkillToolApprovals.set(approvalId, {
        id: approvalId,
        createdAt: Date.now(),
        entityId: brain.entityId,
        userMessage: effectiveUserMessage,
        rawResponse: result.finalResponse || '',
        draftResponse: cleanedDraft,
        cancelResponse: cleanedDraft || 'Understood. I will not run that skill action.',
        runtime: (orchestrator.isRuntimeUsable && orchestrator.isRuntimeUsable(aspectConfigs.orchestrator))
          ? aspectConfigs.orchestrator
          : aspectConfigs.main,
        entityName: entity?.name || 'the entity',
        workspacePath: entity?.workspacePath || ''
      });
      result.finalResponse = cleanedDraft || 'I can handle that, but I need your approval before running the skill action.';
      result.pendingSkillApproval = {
        approvalId,
        tools: approvedTools,
        expiresInMs: 5 * 60 * 1000
      };
      return result;
    }

    // ── Tool execution loop ──────────────────────────────────────────────────
    try {
      if (isInternalResume) {
        throw new Error('skip-tools-for-internal-resume');
      }
      const toolExec = await workspaceTools.executeToolCalls(result.finalResponse, {
        workspacePath: entity?.workspacePath || '',
        webFetch,
        memorySearch: memorySearchFn,
        memoryCreate: memoryCreateFn,
        archiveSearch: archiveSearchFn,
        skillCreate: skillCreateFn,
        skillList: skillListFn,
        skillEdit: skillEditFn,
        profileUpdate: profileUpdateWithSync
      });

      if (toolExec.hadTools && toolExec.toolResults.length > 0) {
        console.log(`  🔧 Executed ${toolExec.toolResults.length} tool call(s): ${toolExec.toolResults.map(t => t.command).join(', ')}`);
        const toolResultsBlock = workspaceTools.formatToolResults(toolExec.toolResults);
        const followUpRuntime = (orchestrator.isRuntimeUsable && orchestrator.isRuntimeUsable(aspectConfigs.orchestrator))
          ? aspectConfigs.orchestrator : aspectConfigs.main;
        const followUpMessages = [
          { role: 'system', content: `You are ${entity?.name || 'the entity'}. You just used tools. Below are the tool results. Incorporate them naturally into your response to the user. Stay in character. Do NOT include [TOOL:...] tags in your response this time.` },
          { role: 'user', content: `Original user message: "${userMessage}"\n\nYour draft response (before tools ran):\n${toolExec.cleanedResponse}\n\n${toolResultsBlock}\n\nNow write your final response incorporating the tool results naturally. Stay in character.` }
        ];
        const followUpResponse = await callLLMWithRuntime(followUpRuntime, followUpMessages, { temperature: 0.6 });
        result.finalResponse = followUpResponse || toolExec.cleanedResponse;
        result.toolResults = toolExec.toolResults;
        result._toolsHandled = true;
        console.log(`  ✓ Tool follow-up response generated`);
      }
    } catch (toolErr) {
      if (toolErr.message !== 'skip-tools-for-internal-resume') {
        console.warn('  ⚠ Tool execution failed:', toolErr.message);
      }
    }

    // ── Task plan detection & execution ─────────────────────────────────────
    try {
      if (isInternalResume) throw new Error('skip-task-plan-for-internal-resume');
      if (result._toolsHandled) throw new Error('skip-task-plan-tools-already-ran');
      const plan = taskRunner.parsePlan(rawOrchestratorOutput);
      if (plan && plan.steps.length >= 1) {
        console.log(`  📋 Task plan detected: ${plan.steps.length} steps`);
        const taskResult = await taskRunner.executeTaskPlan(plan, userMessage, {
          entityName: entity?.name || 'Entity',
          systemPrompt: entity?.systemPromptText || '',
          callLLM: callLLMWithRuntime,
          runtime: aspectConfigs.main,
          workspacePath: entity?.workspacePath || '',
          webFetch,
          workspaceTools,
          memorySearch: memorySearchFn,
          memoryCreate: memoryCreateFn,
          archiveSearch: archiveSearchFn,
          skillCreate: skillCreateFn,
          skillList: skillListFn,
          skillEdit: skillEditFn,
          profileUpdate: profileUpdateWithSync
        });
        result.finalResponse = taskResult.finalResponse;
        result.toolResults = [...(result.toolResults || []), ...taskResult.allToolResults];
        result.taskPlan = {
          steps: taskResult.plan.steps,
          stepOutputs: taskResult.stepOutputs,
          llmCalls: taskResult.llmCalls
        };
      }
    } catch (taskErr) {
      if (taskErr.message !== 'skip-task-plan-for-internal-resume' &&
          taskErr.message !== 'skip-task-plan-tools-already-ran') {
        console.warn('  ⚠ Task plan execution failed:', taskErr.message);
      }
    }

    // ── Safety strip ─────────────────────────────────────────────────────────
    {
      let safe = String(result.finalResponse || '');
      safe = safe.replace(/\[TASK_PLAN\][\s\S]*?\[\/TASK_PLAN\]/gi, '').trim();
      safe = safe.replace(/\[TOOL:[^\]]*\]/g, '').trim();
      safe = safe.replace(/\[TOOL:(?:ws_write|ws_append)[\s\S]*?"\]/g, '').trim();
      if (safe !== result.finalResponse) {
        console.warn('  ⚠ Safety-stripped leftover [TOOL:] or [TASK_PLAN] tags from final response');
        result.finalResponse = safe || result.finalResponse;
      }
    }

    // ── Background memory encoding ───────────────────────────────────────────
    const memoryEntityId = brain.entityId;
    const memoryAspectConfigs = { ...aspectConfigs };
    if (!isInternalResume && memoryEntityId && memoryAspectConfigs.subconscious) {
      setImmediate(async () => {
        await runPostResponseMemoryEncoding({
          effectiveUserMessage,
          finalResponse: result.finalResponse,
          innerDialog: result.innerDialog,
          memoryEntityId,
          memoryAspectConfigs,
          callLLMWithRuntime,
          getTokenLimit,
          createCoreMemory,
          createSemanticKnowledge,
          broadcastSSE,
          traceGraph: brain.traceGraph,
          memoryGraph: brain.memoryGraph,
          logTimeline,
          memoryStorage: brain.memoryStorage,
          entityName: entity?.name || null,
          userName: entity?.persona?.userName || null,
          activeUserId: entity?.persona?.activeUserId || null,
          entityPersona: entity?.persona || null
        });

        // ── Cognitive feedback loop (C7/C8/C9) ──────────────────────────────
        await runCognitiveFeedbackLoop({
          userMessage: effectiveUserMessage,
          entityResponse: result.finalResponse,
          preSnapshot: cognitiveSnapshotData,
          importance: 0,
          trustDelta: 0,
          beliefGraph: brain.beliefGraph || null,
          goalsManager: brain.goalsManager || null,
          curiosityEngine: brain.curiosityEngine || null,
          cognitiveBus: cognitiveBus || null,
          logTimeline,
          broadcastSSE,
          entityId: memoryEntityId
        });
      });
    }

    // ── Echo Past round-2 (async enrichment — fires during humanizer window) ──
    if (!isInternalResume && memoryEntityId) {
      setImmediate(() => {
        try {
          const { extractPhrases }  = require('../brain/utils/rake');
          const { echoPast, promoteToStm } = require('../brain/agent-echo');
          const r2Topics = extractPhrases(String(effectiveUserMessage || ''));
          if (r2Topics.length > 0) {
            const r2Hits = echoPast(memoryEntityId, r2Topics, { round: 2 });
            if (r2Hits.length > 0) {
              promoteToStm(memoryEntityId, r2Hits);
            }
          }
        } catch (_e) {
          // round-2 is always additive — never block the response
        }
      });
    }

    // ── Post-process (humanize + chunk) ──────────────────────────────────────
    const postProcessed = await postProcessResponse({
      finalResponse: result.finalResponse,
      effectiveUserMessage,
      entity,
      aspectConfigs,
      loadConfig,
      callLLMWithRuntime
    });
    result.finalResponse = postProcessed.finalResponse;
    result.chunks = postProcessed.chunks;
    if (postProcessed.error) {
      console.warn('  ⚠ Natural chat processing failed:', postProcessed.error.message);
    }

    // ── T4-1: Store orchestrator response in semantic cache ─────────────────
    if (semanticCacheEnabled && !isInternalResume) {
      try {
        const entityCache = getEntityCache(brain.entityId);
        entityCache.store(effectiveUserMessage, result.finalResponse);
      } catch (_) { /* cache store is non-critical */ }
    }

    logTimeline('chat.assistant_response', {
      responseLength: String(result.finalResponse || '').length,
      chunkCount: Array.isArray(result.chunks) ? result.chunks.length : 0,
      toolResultCount: Array.isArray(result.toolResults) ? result.toolResults.length : 0,
      usedTaskPlan: !!result.taskPlan
    });

    return result;
  }

  // ── processSingleLlmChatMessage ───────────────────────────────────────────
  // Simplified pipeline for single-llm mode entities. No orchestrator, no
  // dream/conscious phases. One model, one system prompt, optional memory.
  //
  // @param {string}  userMessage
  // @param {Array}   chatHistory
  // @param {Object}  opts
  // @param {boolean} opts.memoryRecall  — inject subconscious memory context before LLM call
  // @param {boolean} opts.memorySave    — store conversation exchange after response

  async function processSingleLlmChatMessage(userMessage, chatHistory = [], { memoryRecall = false, memorySave = false } = {}) {
    logTimeline('chat.single_llm.user_message', {
      userMessage: String(userMessage || '').slice(0, 1200),
      memoryRecall,
      memorySave
    });

    // memorySave gates runPostResponseMemoryEncoding after the LLM response.

    // ── Load entity ──────────────────────────────────────────────────────────
    let entity = null;
    try { entity = hatchEntity.loadEntity(); } catch (_) {}
    if (!entity) throw new Error('No entity loaded for single-llm chat.');

    // ── Load aspect configs (main only) ──────────────────────────────────────
    let aspectConfigs = {};
    const globalConfig = loadConfig();
    const profileRef = globalConfig?.lastActive;
    if (globalConfig && globalConfig.profiles && profileRef) {
      const profile = globalConfig.profiles[profileRef];
      const resolved = resolveProfileAspectConfigs(profile);
      if (resolved.main) aspectConfigs.main = resolved.main;
      if (resolved.subconscious) aspectConfigs.subconscious = resolved.subconscious;
    }
    if (!aspectConfigs.main || !aspectConfigs.main.type) {
      throw new Error('No LLM configuration available. Please complete setup.');
    }

    // ── Enrich entity with system prompt + persona ───────────────────────────
    if (brain.entityId) {
      try {
        const entityMemRoot = entityPaths.getMemoryRoot(brain.entityId);
        const sysPromptPath = path.join(entityMemRoot, 'system-prompt.txt');
        if (fs.existsSync(sysPromptPath)) {
          entity.systemPromptText = fs.readFileSync(sysPromptPath, 'utf8');
        }
        const personaPath = path.join(entityMemRoot, 'persona.json');
        if (fs.existsSync(personaPath)) {
          entity.persona = JSON.parse(fs.readFileSync(personaPath, 'utf8'));
        }
        try {
          const userProfiles = require('./user-profiles');
          const activeUser = userProfiles.getActiveUser(brain.entityId, entityPaths);
          if (activeUser) {
            if (!entity.persona) entity.persona = {};
            entity.persona.userName = activeUser.name;
            entity.persona.userIdentity = activeUser.info || '';
            entity.persona.activeUserId = activeUser.id;
          }
        } catch (_) {}
      } catch (_) {}
    }

    // ── Build messages ───────────────────────────────────────────────────────
    const messages = [];
    const systemPrompt = entity.systemPromptText || `You are ${entity.name || 'an assistant'}.`;
    messages.push({ role: 'system', content: systemPrompt });

    // Optionally inject memory context (recall ON)
    if (memoryRecall && aspectConfigs.subconscious) {
      try {
        const memCtx = await getSubconsciousMemoryContext(String(userMessage || ''), 20);
        if (memCtx && memCtx.contextBlock) {
          messages.push({ role: 'system', content: memCtx.contextBlock });
        }
      } catch (_) { /* recall failure is non-fatal */ }
    }

    const trimmedHistory = Array.isArray(chatHistory) ? chatHistory.slice(-10) : [];
    for (const turn of trimmedHistory) {
      if (turn && (turn.role === 'user' || turn.role === 'assistant')) {
        messages.push({ role: turn.role, content: String(turn.content || '') });
      }
    }
    messages.push({ role: 'user', content: String(userMessage || '') });

    // ── Call LLM ─────────────────────────────────────────────────────────────
    console.log(`  ℹ Single-LLM chat: model=${runtimeLabel(aspectConfigs.main)}, recall=${memoryRecall}, save=${memorySave}`);
    const response = await callLLMWithRuntime(aspectConfigs.main, messages, { temperature: 0.7 });
    const finalResponse = String(response || '');

    // Optionally save memory (save ON)
    if (memorySave && aspectConfigs.subconscious && brain.entityId) {
      const memoryEntityId = brain.entityId;
      const memoryAspectConfigs = { ...aspectConfigs };
      setImmediate(async () => {
        try {
          await runPostResponseMemoryEncoding({
            effectiveUserMessage: String(userMessage || ''),
            finalResponse,
            innerDialog: null,
            memoryEntityId,
            memoryAspectConfigs,
            callLLMWithRuntime,
            getTokenLimit,
            createCoreMemory,
            createSemanticKnowledge,
            broadcastSSE,
            traceGraph: brain.traceGraph,
            memoryGraph: brain.memoryGraph,
            logTimeline,
            memoryStorage: brain.memoryStorage,
            entityName: entity?.name || null,
            userName: entity?.persona?.userName || null,
            activeUserId: entity?.persona?.activeUserId || null,
            entityPersona: entity?.persona || null
          });

          // ── Cognitive feedback (single-LLM path) ──────────────────────────
          await runCognitiveFeedbackLoop({
            userMessage: String(userMessage || ''),
            entityResponse: finalResponse,
            preSnapshot: null,
            importance: 0,
            trustDelta: 0,
            beliefGraph: brain.beliefGraph || null,
            goalsManager: brain.goalsManager || null,
            curiosityEngine: brain.curiosityEngine || null,
            cognitiveBus: cognitiveBus || null,
            logTimeline,
            broadcastSSE,
            entityId: memoryEntityId
          });
        } catch (_) { /* memory save failure is non-fatal */ }
      });
    }

    logTimeline('chat.single_llm.response', { responseLength: finalResponse.length });
    return { finalResponse, innerDialog: null, memoryConnections: [] };
  }

  return { processChatMessage, processSingleLlmChatMessage, processPendingSkillApproval, taskFrontman };
}

module.exports = createChatPipeline;
