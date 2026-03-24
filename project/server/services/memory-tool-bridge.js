'use strict';
/**
 * server/services/memory-tool-bridge.js
 *
 * Bridges Anthropic's native tool_use interface to NekoCore's memory system.
 * When the LLM is given memory tools, it can search, read, list, and store
 * memories through structured tool calls instead of text-based [TOOL:] tags.
 *
 * Non-Anthropic providers continue using the existing text-tag system.
 * The bridge is an enhanced path, not a replacement.
 */

const MEMORY_TOOL_SCHEMAS = Object.freeze([
  {
    name: 'memory_search',
    description: 'Search entity memories for relevant past experiences, knowledge, and conversation context. Returns matching memories ranked by relevance.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query for memory retrieval.' }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_store',
    description: 'Store a new memory — an important fact, experience, or observation worth remembering for future conversations.',
    input_schema: {
      type: 'object',
      properties: {
        semantic: { type: 'string', description: 'The memory content to store.' },
        importance: { type: 'number', description: 'Importance weight 0.0–1.0 (default 0.5). Higher = less likely to decay.' },
        emotion: { type: 'string', description: 'Emotional context (e.g. joy, curiosity, concern, neutral).' },
        topics: { type: 'string', description: 'Comma-separated topic tags for retrieval.' }
      },
      required: ['semantic']
    }
  },
  {
    name: 'memory_read',
    description: 'Read a specific memory by its ID to see full content and metadata.',
    input_schema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string', description: 'The memory ID (e.g. mem_..., sem_...).' }
      },
      required: ['memory_id']
    }
  },
  {
    name: 'memory_list',
    description: 'List recent memories to review what has been stored.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum memories to return (default 10, max 50).' }
      }
    }
  }
]);

const MAX_TOOL_ROUNDS = 3;

/**
 * Get Anthropic-format tool definitions for memory operations.
 */
function getMemoryToolSchemas() {
  return MEMORY_TOOL_SCHEMAS;
}

/**
 * Check if a tool name is a memory bridge tool.
 */
function isMemoryTool(name) {
  return MEMORY_TOOL_SCHEMAS.some(t => t.name === name);
}

/**
 * Execute a single memory tool call.
 *
 * @param {string} name - Tool name (memory_search, memory_store, memory_read, memory_list)
 * @param {Object} input - Tool input parameters
 * @param {Object} deps - Memory dependencies
 * @param {Function} deps.memorySearch - async (query) => { ok, memories, message }
 * @param {Function} deps.memoryCreate - async (params) => { ok, memId?, error? }
 * @param {Object} [deps.memoryStorage] - MemoryStorage instance for read/list
 * @returns {{ content: string, is_error?: boolean }}
 */
async function executeMemoryToolCall(name, input, deps) {
  if (!deps) return { content: 'Memory tools not available.', is_error: true };

  switch (name) {
    case 'memory_search': {
      const query = String(input?.query || '').trim();
      if (!query) return { content: 'Error: query parameter is required.', is_error: true };
      if (!deps.memorySearch) return { content: 'Memory search not available.', is_error: true };
      try {
        const result = await deps.memorySearch(query);
        if (!result?.ok) return { content: result?.error || result?.message || 'Memory search failed.', is_error: true };
        const memories = (result.memories || []).slice(0, 10).map(m => ({
          id: m.id || m.memory_id,
          type: m.type,
          score: m.relevanceScore || m.score,
          semantic: String(m.semantic || '').slice(0, 200),
          topics: m.topics,
          importance: m.importance,
          decay: m.decay
        }));
        return { content: JSON.stringify({ count: memories.length, memories, message: result.message || '' }) };
      } catch (e) {
        return { content: 'Memory search error: ' + e.message, is_error: true };
      }
    }

    case 'memory_store': {
      const semantic = String(input?.semantic || '').trim();
      if (!semantic) return { content: 'Error: semantic parameter is required.', is_error: true };
      if (!deps.memoryCreate) return { content: 'Memory creation not available.', is_error: true };
      try {
        const result = await deps.memoryCreate({
          semantic,
          importance: input?.importance != null ? String(input.importance) : '0.5',
          emotion: input?.emotion || 'neutral',
          topics: input?.topics || ''
        });
        if (!result?.ok) return { content: result?.error || 'Memory creation failed.', is_error: true };
        return { content: `Memory stored successfully. ID: ${result.memId || result.id || 'unknown'}` };
      } catch (e) {
        return { content: 'Memory creation error: ' + e.message, is_error: true };
      }
    }

    case 'memory_read': {
      const memId = String(input?.memory_id || '').trim();
      if (!memId) return { content: 'Error: memory_id parameter is required.', is_error: true };
      if (!deps.memoryStorage) return { content: 'Memory storage not available for direct read.', is_error: true };
      try {
        const mem = await deps.memoryStorage.retrieveMemory(memId);
        if (!mem) return { content: `Memory ${memId} not found.`, is_error: true };
        return {
          content: JSON.stringify({
            id: mem.id || mem.memory_id,
            type: mem.type,
            semantic: mem.semantic,
            topics: mem.topics,
            emotion: mem.emotionalTag || mem.content?.emotion,
            importance: mem.importance,
            decay: mem.decay,
            created: mem.created,
            access_count: mem.access_count
          })
        };
      } catch (e) {
        return { content: 'Memory read error: ' + e.message, is_error: true };
      }
    }

    case 'memory_list': {
      if (!deps.memoryStorage) return { content: 'Memory storage not available for listing.', is_error: true };
      try {
        const limit = Math.min(Math.max(1, Number(input?.limit) || 10), 50);
        const memories = await deps.memoryStorage.listMemories(limit, 0);
        const summary = (memories || []).map(m => ({
          id: m.id || m.memory_id,
          type: m.type,
          topics: m.topics,
          importance: m.importance,
          decay: m.decay,
          created: m.created
        }));
        return { content: JSON.stringify({ count: summary.length, memories: summary }) };
      } catch (e) {
        return { content: 'Memory list error: ' + e.message, is_error: true };
      }
    }

    default:
      return { content: `Unknown memory tool: ${name}`, is_error: true };
  }
}

/**
 * Create a callLLM wrapper that injects memory tools for Anthropic providers.
 *
 * @param {Object} deps - Memory operation dependencies
 * @param {Function} deps.memorySearch - async (query) => search result
 * @param {Function} deps.memoryCreate - async (params) => create result
 * @param {Object} [deps.memoryStorage] - MemoryStorage instance
 * @returns {Function} wrapCallLLM(originalCallLLM) => wrappedCallLLM
 */
function createMemoryToolBridge(deps) {
  return function wrapCallLLM(originalCallLLM) {
    return async function callLLMWithMemoryTools(runtime, messages, options = {}) {
      const memToolActive = runtime?.type === 'anthropic' &&
        (runtime?.capabilities?.memoryTool === true || runtime?.capabilities?.memoryTool === 'api');

      if (!memToolActive) {
        return originalCallLLM(runtime, messages, options);
      }

      // Merge with any existing tools (e.g. workspace tools from orchestrator)
      const existingTools = Array.isArray(options.tools) ? options.tools : [];
      const mergedTools = [...existingTools, ...getMemoryToolSchemas()];
      const existingHandler = typeof options.executeToolCall === 'function' ? options.executeToolCall : null;

      return originalCallLLM(runtime, messages, {
        ...options,
        tools: mergedTools,
        executeToolCall: async (name, input) => {
          if (isMemoryTool(name)) return executeMemoryToolCall(name, input, deps);
          if (existingHandler) return existingHandler(name, input);
          return { content: `Unknown tool: ${name}`, is_error: true };
        }
      });
    };
  };
}

module.exports = {
  getMemoryToolSchemas,
  isMemoryTool,
  executeMemoryToolCall,
  createMemoryToolBridge,
  MAX_TOOL_ROUNDS
};
