'use strict';
/**
 * server/services/context-compactor.js
 *
 * Provider-agnostic context compaction via LLM-based summarization.
 * Works with any provider (Anthropic, OpenRouter, Ollama) by calling
 * the LLM to summarize old messages and keeping recent turns verbatim.
 *
 * Usage:
 *   const compacted = await compactConversation(callLLM, runtime, messages, options);
 */

const DEFAULT_PRESERVE_LAST_N = 6;  // 3 user + 3 assistant turns
const DEFAULT_THRESHOLD_RATIO = 0.6;
const SUMMARY_MAX_TOKENS = 800;

/**
 * Estimate rough token count for an array of messages.
 * Uses ~4 chars per token heuristic (same as estimateUsageFromText pattern).
 */
function estimateTokens(messages) {
  let chars = 0;
  for (const msg of messages) {
    chars += (msg.content || '').length;
  }
  return Math.ceil(chars / 4);
}

/**
 * Compact a conversation history when it exceeds a token threshold.
 * Works on any provider by asking the LLM to summarize prior context.
 *
 * @param {Function} callLLM - async (runtime, messages, opts) => string | { content }
 * @param {object} runtime - Normalized runtime config
 * @param {Array} messages - Full conversation history [{role, content}]
 * @param {object} [options]
 * @param {number} [options.threshold] - Token threshold to trigger compaction
 * @param {number} [options.contextWindow] - Provider's context window size
 * @param {number} [options.preserveLastN] - Number of recent messages to keep verbatim
 * @param {string} [options.entityName] - Entity name for context preservation
 * @param {string} [options.entityTraits] - Entity personality traits
 * @returns {Promise<{messages: Array, compacted: boolean, summary?: string}>}
 */
async function compactConversation(callLLM, runtime, messages, options = {}) {
  if (!callLLM || !runtime || !messages || !Array.isArray(messages)) {
    return { messages: messages || [], compacted: false };
  }

  const contextWindow = options.contextWindow || 128000;
  const threshold = options.threshold || Math.floor(contextWindow * DEFAULT_THRESHOLD_RATIO);
  const preserveLastN = options.preserveLastN || DEFAULT_PRESERVE_LAST_N;

  // Separate system messages from conversation
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const conversationTokens = estimateTokens(conversationMessages);
  if (conversationTokens < threshold) {
    return { messages, compacted: false };
  }

  // Split into old (to summarize) and recent (to keep)
  const splitPoint = Math.max(0, conversationMessages.length - preserveLastN);
  if (splitPoint <= 0) {
    return { messages, compacted: false };
  }

  const oldMessages = conversationMessages.slice(0, splitPoint);
  const recentMessages = conversationMessages.slice(splitPoint);

  // Build summarization prompt
  const entityContext = options.entityName
    ? `The conversation is between a user and ${options.entityName}${options.entityTraits ? ` (${options.entityTraits})` : ''}.`
    : '';

  const oldText = oldMessages.map(m => `[${m.role}]: ${m.content}`).join('\n\n');

  const summaryPrompt = [
    { role: 'system', content: 'You are a conversation summarizer. Output ONLY the summary, no preamble.' },
    {
      role: 'user',
      content: `Summarize the following conversation, preserving:
- Key facts and decisions made
- Active topics and ongoing threads
- Any commitments or promises made
- Emotional tone and relationship context
${entityContext}

Keep the summary concise but complete. Maximum 200 words.

Conversation to summarize:
${oldText}`
    }
  ];

  let summary;
  try {
    const result = await callLLM(runtime, summaryPrompt, {
      temperature: 0.2,
      maxTokens: SUMMARY_MAX_TOKENS
    });
    summary = typeof result === 'object' && result.content !== undefined ? result.content : String(result || '');
  } catch (err) {
    console.warn('  ⚠ Context compaction failed, returning uncompacted:', err.message);
    return { messages, compacted: false };
  }

  if (!summary || !summary.trim()) {
    return { messages, compacted: false };
  }

  // Reconstruct message array: system messages + summary injection + recent messages
  const summaryMessage = {
    role: 'system',
    content: `[Conversation summary — earlier messages compacted]\n${summary.trim()}`
  };

  const compactedMessages = [...systemMessages, summaryMessage, ...recentMessages];

  console.log(`  ⟐ Context compacted: ${oldMessages.length} messages → summary (${estimateTokens([summaryMessage])} tokens), ${recentMessages.length} recent kept`);

  return {
    messages: compactedMessages,
    compacted: true,
    summary: summary.trim()
  };
}

module.exports = {
  compactConversation,
  estimateTokens,
  DEFAULT_PRESERVE_LAST_N,
  DEFAULT_THRESHOLD_RATIO
};
