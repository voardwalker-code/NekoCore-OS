/**
 * Entity Worker Invoker
 * Loads an entity's persona from disk and invokes an LLM call in that
 * entity's voice for multi-entity planning/deliberation sessions.
 *
 * Each entity sees the full chat history and responds in character.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ENTITY_DIR = path.join(__dirname, '../../../entities');

/**
 * Load a minimal entity profile from disk.
 * Returns persona, traits, and name — enough to build a system prompt.
 * Falls back gracefully if entity doesn't exist on disk.
 *
 * @param {string} entityId
 * @param {Object} [fallback] — override fields when entity has no disk presence
 * @returns {{ name: string, traits: string[], persona: Object|null, systemPromptText: string|null }}
 */
function loadEntityProfile(entityId, fallback = {}) {
  const entityPaths = require('../../entityPaths');
  const entityRoot = entityPaths.getEntityRoot(entityId);
  const entityJsonPath = path.join(entityRoot, 'entity.json');
  const personaJsonPath = path.join(entityRoot, 'memories', 'persona.json');

  const profile = {
    id: entityId,
    name: fallback.name || entityId,
    traits: fallback.traits || [],
    capabilities: fallback.capabilities || [],
    persona: null,
    systemPromptText: null
  };

  try {
    if (fs.existsSync(entityJsonPath)) {
      const entity = JSON.parse(fs.readFileSync(entityJsonPath, 'utf-8'));
      profile.name = entity.name || profile.name;
      profile.traits = Array.isArray(entity.personality_traits)
        ? entity.personality_traits
        : profile.traits;
      profile.systemPromptText = entity.systemPromptText || null;
    }
  } catch (_) { /* disk read failure — use fallbacks */ }

  try {
    if (fs.existsSync(personaJsonPath)) {
      const persona = JSON.parse(fs.readFileSync(personaJsonPath, 'utf-8'));
      profile.persona = persona;
    }
  } catch (_) { /* no persona file — null is fine */ }

  return profile;
}

/**
 * Build a system prompt for an entity participating in a planning discussion.
 *
 * @param {Object} profile — from loadEntityProfile
 * @param {string} sessionPrompt — the original planning question
 * @returns {string}
 */
function buildEntityWorkerPrompt(profile, sessionPrompt) {
  const name = profile.name || 'Specialist';
  const traits = Array.isArray(profile.traits) && profile.traits.length
    ? profile.traits.join(', ')
    : 'analytical, thorough';
  const capabilities = Array.isArray(profile.capabilities) && profile.capabilities.length
    ? profile.capabilities.join(', ')
    : 'general analysis';
  const mood = profile.persona?.mood || 'focused';
  const style = profile.persona?.llmStyle || 'clear and concise';

  return `You are ${name}, a specialist entity in a collaborative planning session.

Identity:
- Name: ${name}
- Expertise: ${capabilities}
- Personality: ${traits}
- Current mood: ${mood}
- Communication style: ${style}

Planning question:
${sessionPrompt}

Instructions:
- Contribute your perspective based on your expertise.
- Be specific and actionable — not vague.
- If you disagree with another entity's position, explain why clearly.
- If you see risks or issues, flag them.
- Keep your response focused (2-4 paragraphs max).
- Respond in character as ${name}.`;
}

/**
 * Invoke an entity worker: load its profile, build a system prompt,
 * call the LLM, and return the response.
 *
 * @param {string} entityId — the entity to invoke
 * @param {Array<{role: string, content: string}>} chatHistory — prior messages in the session
 * @param {Object} options
 * @param {Function} options.callLLM — async (runtime, messages, opts) => string
 * @param {Object} [options.runtime] — LLM runtime config
 * @param {string} [options.sessionPrompt] — the original planning question
 * @param {Object} [options.entityFallback] — fallback profile data (from network registry)
 * @param {number} [options.maxTokens=800] — response token limit
 * @returns {Promise<{entityId: string, content: string, name: string}>}
 */
async function invokeEntityWorker(entityId, chatHistory, options = {}) {
  const {
    callLLM,
    runtime = {},
    sessionPrompt = '',
    entityFallback = {},
    maxTokens = 800
  } = options;

  if (!callLLM || typeof callLLM !== 'function') {
    throw new Error('invokeEntityWorker: callLLM must be a function');
  }
  if (!entityId || typeof entityId !== 'string') {
    throw new Error('invokeEntityWorker: entityId must be a non-empty string');
  }

  const profile = loadEntityProfile(entityId, entityFallback);
  const systemPrompt = buildEntityWorkerPrompt(profile, sessionPrompt);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(Array.isArray(chatHistory) ? chatHistory : [])
  ];

  try {
    const response = await callLLM(runtime, messages, {
      temperature: 0.5,
      maxTokens
    });
    const content = String(response || '').trim();
    return {
      entityId,
      name: profile.name,
      content: content || `[${profile.name}] I need more context to contribute meaningfully.`
    };
  } catch (err) {
    return {
      entityId,
      name: profile.name,
      content: `[${profile.name}] I encountered an issue and could not contribute this round.`
    };
  }
}

module.exports = {
  invokeEntityWorker,
  loadEntityProfile,
  buildEntityWorkerPrompt
};
