'use strict';
/**
 * server/services/llm-interface.js
 * Phase A Re-evaluation — A-Re1
 *
 * LLM call infrastructure: callLLMWithRuntime (OpenRouter + Ollama + Anthropic Direct)
 * and callSubconsciousReranker (memory relevance scoring).
 *
 * Both functions are bound to mutable server-level state (somaticAwareness,
 * defaultMaxTokens) via getter functions supplied at creation time.
 *
 * Usage:
 *   const { callLLMWithRuntime, callSubconsciousReranker } =
 *     createLLMInterface({
 *       getSomaticAwareness: () => somaticAwareness,
 *       getDefaultMaxTokens: () => _defaultMaxTokens
 *     });
 */

const { toChatEndpoint, estimateUsageFromText, parseJsonBlock } = require('./llm-runtime-utils');
const { hasCapability, getCapabilityMode } = require('./provider-capabilities');

const ANTHROPIC_API_VERSION = '2023-06-01';
const ANTHROPIC_DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages';

/**
 * @param {{ getSomaticAwareness: Function, getDefaultMaxTokens: Function }} deps
 */
function createLLMInterface({ getSomaticAwareness = () => null, getDefaultMaxTokens = () => 16000 } = {}) {

  async function callLLMWithRuntime(runtime, messages, options = {}) {
    if (!runtime || !messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid runtime or messages');
    }

    const somaticAwareness = getSomaticAwareness();
    const _defaultMaxTokens = getDefaultMaxTokens();
    const _llmStart = Date.now();
    const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.35;
    const maxTokens = Number.isFinite(options.maxTokens) ? options.maxTokens : _defaultMaxTokens;
    const timeoutMs = Number.isFinite(options.timeout) ? options.timeout : 90000;
    const normalizedContextWindow = Number.isFinite(options.contextWindow)
      ? Math.max(1024, Math.min(32768, Math.floor(options.contextWindow)))
      : (Number.isFinite(runtime?.contextWindow)
        ? Math.max(1024, Math.min(32768, Math.floor(runtime.contextWindow)))
        : null);

    if (runtime.type === 'openrouter') {
      const apiKey = String(runtime.apiKey || runtime.key || '').trim();
      const endpoint = String(runtime.endpoint || '').trim() || 'https://openrouter.ai/api/v1/chat/completions';
      if (!apiKey) throw new Error('OpenRouter runtime missing API key');
      if (!runtime.model) throw new Error('OpenRouter runtime missing model');

      const headers = { 'Content-Type': 'application/json' };
      headers.Authorization = 'Bearer ' + apiKey;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      const bodyObj = { model: runtime.model, temperature, max_tokens: maxTokens, messages };
      if (options.responseFormat === 'json') bodyObj.response_format = { type: 'json_object' };

      // Native tool use: inject tool schemas for OpenRouter/OpenAI function calling
      if (Array.isArray(options.tools) && options.tools.length > 0) {
        bodyObj.tools = options.tools;
      }

      let resp;
      try {
        resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: ac.signal,
          body: JSON.stringify(bodyObj)
        });
      } catch (err) {
        clearTimeout(timer);
        if (somaticAwareness) somaticAwareness.reportCallOutcome(false);
        if (err.name === 'AbortError') throw new Error(`OpenRouter call timed out after ${timeoutMs / 1000}s`);
        throw err;
      }
      clearTimeout(timer);
      if (!resp.ok) {
        if (somaticAwareness) somaticAwareness.reportCallOutcome(false);
        const err = await resp.text();
        throw new Error('OpenRouter call failed: ' + err.slice(0, 220));
      }
      let data = await resp.json();
      let msg = data?.choices?.[0]?.message;
      let content = msg?.content || msg?.reasoning || '';

      // Tool use loop: if response contains tool_calls and a handler is provided,
      // execute tools and send results back (up to 3 rounds).
      if (typeof options.executeToolCall === 'function') {
        let currentMessages = [...messages];
        for (let round = 0; round < 3; round++) {
          const toolCalls = msg?.tool_calls || [];
          if (toolCalls.length === 0) break;

          const toolResults = [];
          for (const tc of toolCalls) {
            let input = {};
            try { input = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}
            const name = tc.function?.name || '';
            try {
              const result = await options.executeToolCall(name, input);
              toolResults.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: typeof result?.content === 'string' ? result.content : JSON.stringify(result?.content || '')
              });
            } catch (execErr) {
              toolResults.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: 'Tool execution error: ' + (execErr.message || 'unknown')
              });
            }
          }

          // Append assistant message + tool results, then re-call
          currentMessages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
          currentMessages.push(...toolResults);

          console.log(`  ⟐ Tool use round ${round + 1}: ${toolCalls.map(tc => tc.function?.name).join(', ')}`);

          const toolAc = new AbortController();
          const toolTimer = setTimeout(() => toolAc.abort(), timeoutMs);
          try {
            const toolResp = await fetch(endpoint, {
              method: 'POST',
              headers,
              signal: toolAc.signal,
              body: JSON.stringify({ ...bodyObj, messages: currentMessages })
            });
            clearTimeout(toolTimer);
            if (!toolResp.ok) break;
            data = await toolResp.json();
            msg = data?.choices?.[0]?.message;
            content = msg?.content || msg?.reasoning || '';
          } catch (_) {
            clearTimeout(toolTimer);
            break;
          }
        }
      }

      const finishReason = data?.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        console.warn(`  ⚠ OpenRouter response truncated (finish_reason=length, max_tokens=${maxTokens}, model=${runtime.model})`);
      }
      if (somaticAwareness) {
        somaticAwareness.reportLatency(Date.now() - _llmStart);
        somaticAwareness.reportCallOutcome(true);
        const u = data?.usage || {};
        const contextWindow = options.contextWindow || 128000;
        if (u.prompt_tokens) somaticAwareness.reportContextFullness(u.prompt_tokens, contextWindow);
      }
      if (options.returnUsage) {
        const u = data?.usage || {};
        let usage = {
          prompt_tokens: u.prompt_tokens || 0,
          completion_tokens: u.completion_tokens || 0,
          total_tokens: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0)
        };
        if (!usage.prompt_tokens && !usage.completion_tokens) {
          usage = estimateUsageFromText(messages, content);
        }
        return { content, usage };
      }
      return content;
    }

    // Anthropic direct branch — uses Messages API with prompt caching
    if (runtime.type === 'anthropic') {
      const apiKey = String(runtime.apiKey || runtime.key || '').trim();
      const endpoint = String(runtime.endpoint || '').trim() || ANTHROPIC_DEFAULT_ENDPOINT;
      if (!apiKey) throw new Error('Anthropic runtime missing API key');
      if (!runtime.model) throw new Error('Anthropic runtime missing model');

      // Separate system messages from conversation messages
      const systemMessages = [];
      const conversationMessages = [];
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemMessages.push(msg);
        } else {
          conversationMessages.push(msg);
        }
      }

      // Build system parameter with cache_control on the last system block
      // Anthropic prompt caching: marking a block as ephemeral tells the API to
      // cache everything up to and including that block — subsequent requests that
      // share the same prefix get a 90% input-token discount on cache hits.
      const useExtendedCache = hasCapability(runtime, 'extendedCache');
      const systemBlocks = systemMessages.map((msg, idx) => {
        const block = { type: 'text', text: msg.content };
        if (idx === systemMessages.length - 1) {
          block.cache_control = useExtendedCache
            ? { type: 'ephemeral', ttl: '1h' }
            : { type: 'ephemeral' };
        }
        return block;
      });

      // Convert conversation messages to Anthropic format
      // Merge consecutive same-role messages (Anthropic requires alternating roles)
      const anthropicMessages = [];
      for (const msg of conversationMessages) {
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
        const last = anthropicMessages[anthropicMessages.length - 1];
        if (last && last.role === role) {
          // Merge into existing
          if (typeof last.content === 'string') {
            last.content = [{ type: 'text', text: last.content }, { type: 'text', text: msg.content }];
          } else {
            last.content.push({ type: 'text', text: msg.content });
          }
        } else {
          anthropicMessages.push({ role, content: msg.content });
        }
      }

      // Ensure conversation starts with a user message
      if (anthropicMessages.length === 0 || anthropicMessages[0].role !== 'user') {
        anthropicMessages.unshift({ role: 'user', content: '(continue)' });
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION
      };
      const betaHeaders = [];
      if (useExtendedCache) {
        betaHeaders.push('prompt-caching-2024-07-31');
        console.log('  ⟐ Extended cache (1h) enabled');
      }

      const bodyObj = {
        model: runtime.model,
        max_tokens: maxTokens,
        temperature,
        messages: anthropicMessages
      };
      if (systemBlocks.length > 0) {
        bodyObj.system = systemBlocks;
      }

      // Anthropic native extended thinking: when the provider supports API-level
      // thinking, add the thinking parameter and remove temperature (incompatible).
      const useNativeThinking = getCapabilityMode(runtime, 'extendedThinking') === 'api';
      if (useNativeThinking) {
        delete bodyObj.temperature;
        const budget = Number(runtime.capabilities?.thinkingBudget) || 4096;
        bodyObj.thinking = { type: 'enabled', budget_tokens: budget };
        console.log(`  ⟐ Anthropic native thinking enabled (budget=${budget})`);
      }

      // Anthropic API-level compaction: when enabled, ask the API to compact
      // context when it approaches the limit, preserving entity identity signals.
      const requestedApiCompaction = hasCapability(runtime, 'compaction') &&
        (runtime.capabilities?.compaction === 'api' || runtime.capabilities?.compaction === true);
      const useApiCompaction = false; // Hard-disabled for stability.
      if (useApiCompaction) {
        bodyObj.context_management = {
          edits: [{ type: 'compact_20260112' }]
        };
        betaHeaders.push('compact-2026-01-12');
        console.log('  ⟐ Anthropic API compaction enabled');
      } else if (requestedApiCompaction) {
        console.log('  ℹ Anthropic API compaction requested but forced disabled');
      }

      if (betaHeaders.length > 0) {
        headers['anthropic-beta'] = betaHeaders.join(',');
      }

      // Memory/native tool injection: add tool schemas to request body
      if (Array.isArray(options.tools) && options.tools.length > 0) {
        bodyObj.tools = options.tools;
      }

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      let resp;
      try {
        resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: ac.signal,
          body: JSON.stringify(bodyObj)
        });
      } catch (err) {
        clearTimeout(timer);
        if (somaticAwareness) somaticAwareness.reportCallOutcome(false);
        if (err.name === 'AbortError') throw new Error(`Anthropic call timed out after ${timeoutMs / 1000}s`);
        throw err;
      }
      clearTimeout(timer);
      if (!resp.ok) {
        if (somaticAwareness) somaticAwareness.reportCallOutcome(false);
        const err = await resp.text();
        throw new Error('Anthropic call failed: ' + err.slice(0, 220));
      }
      let data = await resp.json();

      // Tool use loop: if response contains tool_use blocks and a handler is provided,
      // execute tools and send results back (up to 3 rounds).
      if (typeof options.executeToolCall === 'function') {
        let currentMessages = [...anthropicMessages];
        for (let round = 0; round < 3; round++) {
          const toolUseBlocks = (data?.content || []).filter(b => b.type === 'tool_use');
          if (toolUseBlocks.length === 0) break;

          // Execute each tool call
          const toolResults = [];
          for (const block of toolUseBlocks) {
            try {
              const result = await options.executeToolCall(block.name, block.input);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: typeof result?.content === 'string' ? result.content : JSON.stringify(result?.content || ''),
                ...(result?.is_error ? { is_error: true } : {})
              });
            } catch (execErr) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Tool execution error: ' + (execErr.message || 'unknown'),
                is_error: true
              });
            }
          }

          // Append assistant response + tool results, then re-call
          currentMessages.push({ role: 'assistant', content: data.content });
          currentMessages.push({ role: 'user', content: toolResults });

          console.log(`  ⟐ Tool use round ${round + 1}: ${toolUseBlocks.map(b => b.name).join(', ')}`);

          const toolAc = new AbortController();
          const toolTimer = setTimeout(() => toolAc.abort(), timeoutMs);
          try {
            const toolResp = await fetch(endpoint, {
              method: 'POST',
              headers,
              signal: toolAc.signal,
              body: JSON.stringify({ ...bodyObj, messages: currentMessages })
            });
            clearTimeout(toolTimer);
            if (!toolResp.ok) break;
            data = await toolResp.json();
          } catch (_) {
            clearTimeout(toolTimer);
            break;
          }
        }
      }
      // Separate thinking blocks from text blocks in the response
      const contentBlocks = data?.content || [];
      const textParts = contentBlocks.filter(b => b.type === 'text').map(b => b.text || '');
      const thinkingParts = contentBlocks.filter(b => b.type === 'thinking').map(b => b.thinking || '');
      const content = textParts.join('');
      const thinkingContent = thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null;
      if (data?.stop_reason === 'max_tokens') {
        console.warn(`  ⚠ Anthropic response truncated (stop_reason=max_tokens, max_tokens=${maxTokens}, model=${runtime.model})`);
      }
      // API compaction telemetry — log when compaction was applied
      if (data?.stop_reason === 'compaction') {
        console.log(`  ⟐ Anthropic API compaction applied (model=${runtime.model})`);
      }
      // Log cache performance when available
      const cacheRead = data?.usage?.cache_read_input_tokens || 0;
      const cacheCreation = data?.usage?.cache_creation_input_tokens || 0;
      if (cacheRead > 0 || cacheCreation > 0) {
        console.log(`  ⟐ Anthropic cache: ${cacheRead} read, ${cacheCreation} creation tokens (model=${runtime.model})`);
      }
      if (somaticAwareness) {
        somaticAwareness.reportLatency(Date.now() - _llmStart);
        somaticAwareness.reportCallOutcome(true);
        const u = data?.usage || {};
        const contextWindow = options.contextWindow || 200000;
        if (u.input_tokens) somaticAwareness.reportContextFullness(u.input_tokens, contextWindow);
      }
      if (options.returnUsage) {
        const u = data?.usage || {};
        let usage = {
          prompt_tokens: u.input_tokens || 0,
          completion_tokens: u.output_tokens || 0,
          total_tokens: (u.input_tokens || 0) + (u.output_tokens || 0),
          cache_read_input_tokens: cacheRead,
          cache_creation_input_tokens: cacheCreation
        };
        if (!usage.prompt_tokens && !usage.completion_tokens) {
          usage = estimateUsageFromText(messages, content);
        }
        const result = { content, usage };
        if (thinkingContent) result.thinkingContent = thinkingContent;
        return result;
      }
      return content;
    }

    // Ollama branch
    const endpoint = toChatEndpoint(runtime.endpoint);
    if (!endpoint) throw new Error('Ollama runtime missing endpoint');
    const ac2 = new AbortController();
    const timer2 = setTimeout(() => ac2.abort(), timeoutMs);
    const ollamaBody = { model: runtime.model, temperature, max_tokens: maxTokens, messages };
    if (normalizedContextWindow) {
      ollamaBody.options = {
        num_ctx: normalizedContextWindow,
        num_predict: Math.floor(maxTokens)
      };
    }
    if (options.responseFormat === 'json') ollamaBody.format = 'json';

    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac2.signal,
        body: JSON.stringify(ollamaBody)
      });
    } catch (err) {
      clearTimeout(timer2);
      if (somaticAwareness) somaticAwareness.reportCallOutcome(false);
      if (err.name === 'AbortError') throw new Error(`Ollama call timed out after ${timeoutMs / 1000}s`);
      throw err;
    }
    clearTimeout(timer2);
    if (!resp.ok) {
      if (somaticAwareness) somaticAwareness.reportCallOutcome(false);
      const err = await resp.text();
      throw new Error('Ollama call failed: ' + err.slice(0, 220));
    }
    const data = await resp.json();
    const msg2 = data?.choices?.[0]?.message;
    const content2 = msg2?.content || msg2?.reasoning || '';
    if (somaticAwareness) {
      somaticAwareness.reportLatency(Date.now() - _llmStart);
      somaticAwareness.reportCallOutcome(true);
      const u = data?.usage || {};
      const contextWindow2 = normalizedContextWindow || 128000;
      if (u.prompt_tokens) somaticAwareness.reportContextFullness(u.prompt_tokens, contextWindow2);
    }
    if (options.returnUsage) {
      const u = data?.usage || {};
      let usage = {
        prompt_tokens: u.prompt_tokens || 0,
        completion_tokens: u.completion_tokens || 0,
        total_tokens: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0)
      };
      if (!usage.prompt_tokens && !usage.completion_tokens) {
        usage = estimateUsageFromText(messages, content2);
      }
      return { content: content2, usage };
    }
    return content2;
  }

  async function callSubconsciousReranker(runtime, userMessage, candidates) {
    if (!runtime || !candidates || candidates.length === 0) {
      return { ok: false, reason: 'missing-runtime-or-candidates' };
    }

    const payloadCandidates = candidates.map((c, idx) => ({
      rank: idx + 1,
      id: c.id,
      topics: c.topics || [],
      summary: (c.semantic || '').slice(0, 220),
      lexical_score: Number(c.relevanceScore || 0)
    }));

    const prompt = `You are the Subconscious relevance scorer for memory retrieval.
Given a user message and candidate memories, score each memory for relevance from 0.0 to 1.0.
Return ONLY valid JSON in this exact shape:
{
  "scores": [
    {"id":"<memory_id>","relevance":0.0,"reason":"short reason"}
  ]
}

Guidelines:
- 1.0 = directly relevant and useful to answer the user now.
- 0.5 = maybe related background context.
- 0.0 = not relevant.
- Be conservative. If unsure, score lower.
- Keep reasons very short.

User message:
${userMessage}

Candidates:
${JSON.stringify(payloadCandidates, null, 2)}`;

    const messages = [
      { role: 'system', content: 'You score memory relevance for subconscious retrieval. Output JSON only.' },
      { role: 'user', content: prompt }
    ];

    let text = '';
    try {
      const result = await callLLMWithRuntime(runtime, messages, { temperature: 0.1, maxTokens: 2000 });
      text = typeof result === 'object' && result.content !== undefined ? result.content : String(result || '');
    } catch (err) {
      throw err;
    }

    const parsed = parseJsonBlock(text);
    if (!parsed || !Array.isArray(parsed.scores)) {
      return { ok: false, reason: 'invalid-rerank-json' };
    }

    const scoreMap = new Map();
    parsed.scores.forEach(item => {
      if (!item || !item.id) return;
      const relevance = Math.max(0, Math.min(1, Number(item.relevance || 0)));
      scoreMap.set(item.id, {
        relevance,
        reason: String(item.reason || '').slice(0, 120)
      });
    });

    return { ok: true, scoreMap };
  }

  return { callLLMWithRuntime, callSubconsciousReranker };
}

module.exports = { createLLMInterface };
