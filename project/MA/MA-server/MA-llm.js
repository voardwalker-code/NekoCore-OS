// ── MA LLM Interface ─────────────────────────────────────────────────────────
// Unified caller for OpenRouter, Ollama, and Anthropic Direct.
// Single flat config: { type, endpoint, apiKey, model }
// No profiles, no subconscious, no dream — just callLLM.
'use strict';

const http  = require('http');
const https = require('https');

const DEFAULT_TIMEOUT  = 90000;  // 90s
const DEFAULT_MAX_TOKENS = 12288;
const ANTHROPIC_API_VERSION = '2023-06-01';
const ANTHROPIC_DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages';

/**
 * Call an LLM provider.
 * @param {object} config  - { type, endpoint, apiKey, model, capabilities? }
 * @param {Array}  messages - [{ role, content }]
 * @param {object} opts    - { temperature, maxTokens, timeout, responseFormat, thinking, tools }
 * @returns {Promise<string|{content:string, toolCalls:Array}>} String normally; object when tools are active and tool_use blocks returned
 */
async function callLLM(config, messages, opts = {}) {
  if (!config || !config.type) throw new Error('LLM config missing type');
  if (!config.endpoint)        throw new Error('LLM config missing endpoint');
  if (!config.model)           throw new Error('LLM config missing model');

  const temperature = opts.temperature ?? 0.7;
  const maxTokens   = opts.maxTokens   ?? DEFAULT_MAX_TOKENS;
  const timeout     = opts.timeout     ?? DEFAULT_TIMEOUT;

  if (config.type === 'ollama') {
    return _callOllama(config, messages, { temperature, maxTokens, timeout });
  }
  if (config.type === 'anthropic') {
    return _callAnthropic(config, messages, { temperature, maxTokens, timeout, thinking: opts.thinking, tools: opts.tools });
  }
  // Default: OpenRouter / OpenAI-compatible
  return _callOpenRouter(config, messages, { temperature, maxTokens, timeout, responseFormat: opts.responseFormat, tools: opts.tools });
}

// ── OpenRouter / OpenAI-compatible ──────────────────────────────────────────
async function _callOpenRouter(config, messages, opts) {
  const body = JSON.stringify({
    model:       config.model,
    messages,
    temperature: opts.temperature,
    max_tokens:  opts.maxTokens,
    ...(opts.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    ...(opts.tools && opts.tools.length ? { tools: opts.tools } : {})
  });

  const url = new URL(config.endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
  };

  const raw = await _fetch(url, body, headers, opts.timeout);
  const data = JSON.parse(raw);

  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (!data.choices || !data.choices.length) throw new Error('No choices in LLM response');

  // If native tools were used and tool_calls are in the response, return structured result
  const msg = data.choices[0].message;
  if (opts.tools && opts.tools.length && msg.tool_calls && msg.tool_calls.length) {
    return {
      content: (msg.content || '').trim(),
      toolCalls: msg.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function?.name || '',
        input: JSON.parse(tc.function?.arguments || '{}')
      })),
      _raw: msg  // preserve for re-injection
    };
  }

  return (msg?.content || '').trim();
}

// ── Ollama ──────────────────────────────────────────────────────────────────
async function _callOllama(config, messages, opts) {
  const endpoint = config.endpoint.replace(/\/+$/, '');
  const url = new URL(endpoint + '/api/chat');

  // Ollama expects images in a separate `images` field per message (base64 only, no data URL prefix)
  const ollamaMessages = messages.map(m => {
    if (Array.isArray(m.content)) {
      const textParts = m.content.filter(c => c.type === 'text').map(c => c.text);
      const imageParts = m.content.filter(c => c.type === 'image_url' && c.image_url?.url);
      const images = imageParts.map(c => {
        const dataUrl = c.image_url.url;
        const commaIdx = dataUrl.indexOf(',');
        return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      });
      return { role: m.role, content: textParts.join('\n'), ...(images.length ? { images } : {}) };
    }
    return m;
  });

  const body = JSON.stringify({
    model:   config.model,
    messages: ollamaMessages,
    stream:  false,
    options: {
      temperature: opts.temperature,
      num_predict: opts.maxTokens,
      num_ctx:     opts.maxTokens * 2
    }
  });

  const headers = { 'Content-Type': 'application/json' };
  const raw = await _fetch(url, body, headers, opts.timeout);
  const data = JSON.parse(raw);

  if (data.error) throw new Error(data.error);
  return (data.message?.content || '').trim();
}

// ── Anthropic Messages API ───────────────────────────────────────────────────
async function _callAnthropic(config, messages, opts) {
  const endpoint = config.endpoint || ANTHROPIC_DEFAULT_ENDPOINT;
  const url = new URL(endpoint);

  // Extract system messages into a separate system parameter (Anthropic requirement)
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  // Determine if extended cache (1-hour TTL) is active
  const useExtendedCache = !!(config.capabilities && config.capabilities.extendedCache);

  // Build system content blocks with cache_control on the last block
  const systemBlocks = systemMessages.map((msg, idx) => {
    const block = { type: 'text', text: msg.content };
    if (idx === systemMessages.length - 1) {
      block.cache_control = useExtendedCache
        ? { type: 'ephemeral', ttl: '1h' }
        : { type: 'ephemeral' };
    }
    return block;
  });

  // Ensure alternating user/assistant roles (Anthropic requirement)
  const anthropicMessages = _enforceAlternatingRoles(nonSystemMessages);

  // Resolve thinking mode: only for Anthropic when capability + opts signal it
  const caps = config.capabilities || {};
  const useThinking = !!(opts.thinking && caps.extendedThinking);
  let thinkingParam;
  if (useThinking) {
    if (/opus/i.test(config.model)) {
      thinkingParam = { type: 'enabled', budget_tokens: caps.thinkingBudget || 10000 };
    } else if (/sonnet/i.test(config.model)) {
      thinkingParam = { type: 'enabled', budget_tokens: caps.thinkingBudget || 8192 };
    }
    // Haiku: skip thinking (speed-optimized)
  }

  const reqBody = {
    model:      config.model,
    system:     systemBlocks.length ? systemBlocks : undefined,
    messages:   anthropicMessages,
    max_tokens: opts.maxTokens
  };

  // Native tool use: include tools array in request
  if (opts.tools && opts.tools.length) {
    reqBody.tools = opts.tools;
  }

  // Temperature is incompatible with thinking — only include when not thinking
  if (thinkingParam) {
    reqBody.thinking = thinkingParam;
    console.log(`  ⟐ MA: Extended thinking active (budget: ${thinkingParam.budget_tokens})`);
  } else {
    reqBody.temperature = opts.temperature;
  }

  const body = JSON.stringify(reqBody);

  const headers = {
    'Content-Type':      'application/json',
    'x-api-key':         config.apiKey,
    'anthropic-version':  ANTHROPIC_API_VERSION
  };

  // Extended cache: adds beta header for 1-hour TTL support
  if (useExtendedCache) {
    headers['anthropic-beta'] = 'prompt-caching-2024-12-20';
    console.log('  ⟐ MA: Extended cache (1h) active');
  }

  const raw = await _fetch(url, body, headers, opts.timeout);
  const data = JSON.parse(raw);

  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (!data.content || !data.content.length) throw new Error('No content in Anthropic response');

  // Log cache performance
  const cacheRead = data.usage?.cache_read_input_tokens || 0;
  const cacheCreation = data.usage?.cache_creation_input_tokens || 0;
  if (cacheRead || cacheCreation) {
    console.log(`  \u27D0 MA Anthropic cache: ${cacheRead} read, ${cacheCreation} creation tokens`);
  }

  // Extract text from content blocks (skip thinking blocks)
  const textParts = data.content.filter(b => b.type === 'text');
  const text = textParts.map(b => b.text).join('').trim();

  // If native tools were used, check for tool_use blocks
  if (opts.tools && opts.tools.length) {
    const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');
    if (toolUseBlocks.length) {
      return {
        content: text,
        toolCalls: toolUseBlocks.map(b => ({
          id: b.id,
          name: b.name,
          input: b.input || {}
        })),
        _stopReason: data.stop_reason
      };
    }
  }

  return text;
}

// Anthropic requires strictly alternating user/assistant messages.
// Merge consecutive same-role messages and ensure conversation starts with user.
function _enforceAlternatingRoles(messages) {
  if (!messages.length) return [{ role: 'user', content: '.' }];

  const merged = [];
  for (const msg of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content += '\n\n' + msg.content;
    } else {
      merged.push({ role: msg.role, content: msg.content });
    }
  }

  // Ensure first message is user role
  if (merged[0]?.role !== 'user') {
    merged.unshift({ role: 'user', content: '.' });
  }

  return merged;
}

// ── Raw HTTP POST ───────────────────────────────────────────────────────────
function _fetch(url, body, headers, timeout) {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(url, { method: 'POST', headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('LLM request timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Raw HTTP GET ────────────────────────────────────────────────────────────
function _get(url, timeout) {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(url, { method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

// ── Ollama model management ─────────────────────────────────────────────────
async function ollamaListModels(endpoint) {
  if (!endpoint) throw new Error('No Ollama endpoint provided');
  const url = new URL(endpoint.replace(/\/+$/, '') + '/api/tags');
  const raw = await _get(url, 15000);
  const data = JSON.parse(raw);
  return (data.models || []).map(m => ({
    name: m.name, size: m.size, modified: m.modified_at
  }));
}

async function ollamaShowModel(endpoint, model) {
  if (!endpoint) throw new Error('No Ollama endpoint provided');
  if (!model) throw new Error('No model name provided');
  const url = new URL(endpoint.replace(/\/+$/, '') + '/api/show');
  const body = JSON.stringify({ model });
  const raw = await _fetch(url, body, { 'Content-Type': 'application/json' }, 15000);
  const data = JSON.parse(raw);
  let contextLength = null;
  if (data.model_info) {
    for (const key of Object.keys(data.model_info)) {
      if (key.endsWith('.context_length')) { contextLength = data.model_info[key]; break; }
    }
  }
  return {
    contextLength,
    parameterSize: data.details?.parameter_size || null,
    family: data.details?.family || null,
    quantization: data.details?.quantization_level || null
  };
}

async function ollamaPullModel(endpoint, model) {
  if (!endpoint) throw new Error('No Ollama endpoint provided');
  if (!model) throw new Error('No model name provided');
  const url = new URL(endpoint.replace(/\/+$/, '') + '/api/pull');
  const body = JSON.stringify({ model, stream: false });
  const raw = await _fetch(url, body, { 'Content-Type': 'application/json' }, 600000);
  return JSON.parse(raw);
}

module.exports = { callLLM, ollamaListModels, ollamaShowModel, ollamaPullModel };
