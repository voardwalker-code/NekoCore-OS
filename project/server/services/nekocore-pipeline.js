// ============================================================
// NekoCore OS — NekoCore Chat Pipeline Service
// Extracted from server.js P2-S6-b.
// Owns: processNekoCoreChatMessage — no entityRuntime dependency;
//       spin-up its own local brain modules per call.
// ============================================================
'use strict';

const path = require('path');
const fs   = require('fs');

const entityPaths   = require('../entityPaths');
const Orchestrator  = require('../brain/orchestrator');
const SkillManager  = require('../brain/skill-manager');
const ConsciousMemory = require('../brain/memory/conscious-memory');
const MemoryStorage = require('../brain/memory-storage');
const { buildNekoKnowledgeContext } = require('../brain/nekocore/knowledge-retrieval');
const {
  storeNekoConversationSnapshot,
  encodeNekoConversationMemory
} = require('./nekocore-memory');

const NEKOCORE_ID = 'nekocore';

/**
 * Create the NekoCore chat pipeline.
 *
 * @param {Object} deps
 * @param {Function} deps.callLLMWithRuntime
 * @param {Function} deps.resolveProfileAspectConfigs
 * @param {Function} deps.loadConfig
 * @param {Object}   deps.entityManager
 * @param {Object}   deps.workspaceTools
 * @param {Object}   deps.taskRunner
 * @param {Object}   deps.webFetch
 * @param {Function} deps.getTokenLimit
 * @param {Function} deps.broadcastSSE
 * @param {Function} deps.logTimeline
 */
function createNekoCoreChat(deps) {
  const {
    callLLMWithRuntime,
    resolveProfileAspectConfigs,
    loadConfig,
    entityManager,
    workspaceTools,
    taskRunner,
    webFetch,
    getTokenLimit,
    broadcastSSE,
    logTimeline,
    nekoSystemRuntime
  } = deps;

  async function processNekoCoreChatMessage(userMessage, chatHistory = []) {
    logTimeline('nekocore_chat.user_message', {
      userMessage: String(userMessage || '').slice(0, 400),
      chatHistoryCount: Array.isArray(chatHistory) ? chatHistory.length : 0
    });

    const globalConfig = loadConfig();
    const profileRef   = globalConfig?.lastActive;
    let aspectConfigs  = {};

    if (globalConfig && globalConfig.profiles && profileRef) {
      const profile  = globalConfig.profiles[profileRef];
      const resolved = resolveProfileAspectConfigs(profile);
      if (resolved.main) {
        aspectConfigs = { main: resolved.main, subconscious: resolved.subconscious, dream: resolved.dream, orchestrator: resolved.orchestrator };
      }
    }

    if (!aspectConfigs.main || !aspectConfigs.main.type) {
      throw new Error('No LLM aspect configurations available.');
    }

    // Load NekoCore entity spec
    const nekoCoreEntityFile = entityPaths.getEntityFile(NEKOCORE_ID);
    if (!fs.existsSync(nekoCoreEntityFile)) {
      throw new Error('NekoCore entity not found. Was the system entity hatch run?');
    }
    const nekoCoreEntityData = JSON.parse(fs.readFileSync(nekoCoreEntityFile, 'utf8'));

    // Build a local entity object with prompt + memory
    const entity = { ...nekoCoreEntityData, id: NEKOCORE_ID, isSystemEntity: true };
    const nekoCoreMemRoot = entityPaths.getMemoryRoot(NEKOCORE_ID);

    // Load NekoCore's system prompt
    const sysPromptPath = path.join(nekoCoreMemRoot, 'system-prompt.txt');
    if (fs.existsSync(sysPromptPath)) {
      entity.systemPromptText = fs.readFileSync(sysPromptPath, 'utf8');
    }

    // Delegate to nekoSystemRuntime for full entity parity
    // This gives NekoCore: dreamEngine, neurochemistry, memory consolidation, goal tracking, curiosity, etc.
    if (!nekoSystemRuntime || !nekoSystemRuntime.isActive) {
      throw new Error('NekoCore system runtime not initialized. Cannot process NekoCore chat without full entity parity.');
    }

    // Get subsystems from the persistent NekoCore runtime (same as user entities)
    const nekoCoreSkillManager = nekoSystemRuntime.skillManager;
    const nekoCoreConsciousMemory = nekoSystemRuntime.consciousMemory;
    const nekoCoreMemStorage = nekoSystemRuntime.memoryStorage;

    if (!nekoCoreSkillManager || !nekoCoreConsciousMemory || !nekoCoreMemStorage) {
      throw new Error('NekoCore system runtime subsystems not ready: skills, conscious memory, or storage missing.');
    }

    entity.skillsPrompt = nekoCoreSkillManager.buildSkillsPrompt();

    // Knowledge retrieval for NekoCore self-knowledge
    const knowledgeContext = buildNekoKnowledgeContext(userMessage, nekoCoreMemRoot, {
      limit: 8
    });
    if (knowledgeContext) {
      entity.knowledgeContext = knowledgeContext;
    }

    // Inject entity summaries so NekoCore knows about its managed entities
    entity.entitySummaries = (entityManager.listEntities() || [])
      .filter(e => e && !e.isSystemEntity)
      .map(e => ({ id: e.id, name: e.name, traits: (e.personality_traits || []).slice(0, 3) }));

    // Build memory callbacks — NekoCore-scoped
    const memorySearchFn = async (query) => {
      if (!query) return { ok: false, error: 'No search query provided' };
      try {
        const ctx = buildNekoKnowledgeContext(query, nekoCoreMemRoot, { limit: 10 });
        return {
          ok: true,
          memories: (ctx.connections || []).slice(0, 10),
          chatlogContext: ctx.chatlogContext || [],
          message: `Found ${ctx.connections.length} memories` + (ctx.chatlogContext?.length ? ` and ${ctx.chatlogContext.length} related chatlogs` : '')
        };
      } catch (e) {
        return { ok: false, error: 'Memory search failed: ' + e.message };
      }
    };
    const memoryCreateFn = async (params) => {
      const { semantic, importance, emotion, topics } = params;
      if (!semantic) return { ok: false, error: 'No semantic content provided' };
      try {
        const topicArr = topics ? topics.split(',').map(t => t.trim()) : [];
        const mem = await nekoCoreMemStorage.createMemory({
          content: semantic,
          semantic,
          emotion: emotion || 'neutral',
          topics: topicArr,
          importance: parseFloat(importance) || 0.8,
          entityId: NEKOCORE_ID
        });
        return { ok: true, message: 'Memory stored for NekoCore', id: mem?.id };
      } catch (e) {
        return { ok: false, error: 'Memory creation failed: ' + e.message };
      }
    };
    const skillCreateFn = async (params) => {
      const { name, description, instructions } = params;
      if (!name) return { ok: false, error: 'No skill name provided' };
      if (!instructions) return { ok: false, error: 'No instructions provided' };
      try {
        const result = nekoCoreSkillManager.proposeSkill(name, description || '', instructions);
        return result;
      } catch (e) {
        return { ok: false, error: 'Skill proposal failed: ' + e.message };
      }
    };
    const skillListFn = async () => {
      try { return { ok: true, skills: nekoCoreSkillManager.list() }; }
      catch (e) { return { ok: false, error: 'Skill listing failed: ' + e.message }; }
    };
    const skillEditFn = async (params) => {
      const { name, description, instructions } = params;
      if (!name) return { ok: false, error: 'No skill name provided' };
      try {
        const result = nekoCoreSkillManager.proposeEdit(name, description, instructions);
        return result;
      } catch (e) {
        return { ok: false, error: 'Skill edit failed: ' + e.message };
      }
    };

    // Construct & run orchestrator
    const orchestrator = new Orchestrator({
      entity,
      callLLM: callLLMWithRuntime,
      aspectConfigs,
      getMemoryContext: async (query, topK) => {
        return buildNekoKnowledgeContext(query, nekoCoreMemRoot, { limit: topK || 8 });
      },
      getBeliefs: () => [],
      getSomaticState: () => null,
      getConsciousContext: async (topics) => nekoCoreConsciousMemory.getContext(topics, 5),
      storeConsciousObservation: async (msg, response, topics) => {
        const summary = response?.slice(0, 300) || msg.slice(0, 300);
        nekoCoreConsciousMemory.addToStm({ summary, topics, source: 'conscious_observation' });
        nekoCoreConsciousMemory.reinforce(topics);
      },
      reconstructedChatlogCache: null,
      reconstructedChatlogTtlMs: 0,
      cognitiveBus: null,
      getTokenLimit,
      getSkillContext: (skillName) => nekoCoreSkillManager.buildSkillsPromptFor(skillName),
      getEntitySummaries: () => entity.entitySummaries || []
    });

    const trimmedChatHistory = Array.isArray(chatHistory) ? chatHistory.slice(-10) : [];
    const result = await orchestrator.orchestrate(userMessage, trimmedChatHistory, {
      entityId: NEKOCORE_ID,
      memoryStorage: nekoCoreMemStorage,
      identityManager: null
    });

    logTimeline('nekocore_chat.orchestrator_completed', {
      responseLength: String(result.finalResponse || '').length
    });

    // Tool execution
    try {
      const toolExec = await workspaceTools.executeToolCalls(result.finalResponse, {
        workspacePath: entity.workspacePath || '',
        webFetch,
        memorySearch: memorySearchFn,
        memoryCreate: memoryCreateFn,
        skillCreate: skillCreateFn,
        skillList: skillListFn,
        skillEdit: skillEditFn,
        profileUpdate: async () => ({ ok: false, error: 'Profile update not available for NekoCore' })
      });
      if (toolExec.hadTools && toolExec.toolResults.length > 0) {
        const toolResultsBlock = workspaceTools.formatToolResults(toolExec.toolResults);
        const followUpMessages = [
          { role: 'system', content: `You are NekoCore, the system entity. Tool results are below. Integrate them into your response naturally.` },
          { role: 'user', content: `Original message: "${userMessage}"\n\nDraft: ${toolExec.cleanedResponse}\n\n${toolResultsBlock}\n\nWrite final response.` }
        ];
        const followUpResponse = await callLLMWithRuntime(aspectConfigs.orchestrator || aspectConfigs.main, followUpMessages, { temperature: 0.6 });
        result.finalResponse = followUpResponse || toolExec.cleanedResponse;
        result.toolResults = toolExec.toolResults;
      }
    } catch (toolErr) {
      console.warn('  ⚠ NekoCore tool execution failed:', toolErr.message);
    }

    // Task plan detection
    try {
      const plan = taskRunner.parsePlan(result.finalResponse);
      if (plan && plan.steps.length >= 1) {
        const taskResult = await taskRunner.executeTaskPlan(plan, userMessage, {
          entityName: 'NekoCore',
          systemPrompt: entity.systemPromptText || '',
          callLLM: callLLMWithRuntime,
          runtime: aspectConfigs.main,
          workspacePath: entity.workspacePath || '',
          webFetch,
          workspaceTools,
          memorySearch: memorySearchFn,
          memoryCreate: memoryCreateFn,
          skillCreate: skillCreateFn,
          skillList: skillListFn,
          skillEdit: skillEditFn,
          profileUpdate: async () => ({ ok: false, error: 'N/A' })
        });
        result.finalResponse = taskResult.finalResponse;
        result.toolResults = [...(result.toolResults || []), ...taskResult.allToolResults];
        result.taskPlan = { steps: taskResult.plan.steps, stepOutputs: taskResult.stepOutputs };
      }
    } catch (taskErr) {
      console.warn('  ⚠ NekoCore task plan failed:', taskErr.message);
    }

    // Safety strip
    {
      let safe = String(result.finalResponse || '');
      safe = safe.replace(/\[TASK_PLAN\][\s\S]*?\[\/TASK_PLAN\]/gi, '').trim();
      safe = safe.replace(/\[TOOL:[^\]]*\]/g, '').trim();
      if (safe !== result.finalResponse) {
        result.finalResponse = safe || result.finalResponse;
      }
    }

    // Store conversation snapshot + async memory encoding
    setImmediate(async () => {
      try {
        await storeNekoConversationSnapshot({
          consciousMemory: nekoCoreConsciousMemory,
          memoryStorage: nekoCoreMemStorage,
          message: userMessage,
          response: result.finalResponse
        });
      } catch (_) { /* non-critical */ }
      if (aspectConfigs.subconscious) {
        try {
          await encodeNekoConversationMemory({
            effectiveUserMessage: userMessage,
            finalResponse: result.finalResponse,
            memDir: nekoCoreMemRoot,
            entityId: NEKOCORE_ID,
            callLLMWithRuntime,
            memoryAspectConfigs: { subconscious: aspectConfigs.subconscious },
            getTokenLimit,
            memoryStorage: nekoCoreMemStorage
          });
        } catch (_) { /* non-critical */ }
      }
    });

    logTimeline('nekocore_chat.assistant_response', {
      responseLength: String(result.finalResponse || '').length
    });

    return result;
  }

  return { processNekoCoreChatMessage };
}

module.exports = createNekoCoreChat;
