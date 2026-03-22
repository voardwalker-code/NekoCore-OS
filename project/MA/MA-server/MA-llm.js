// ── MA LLM Interface ─────────────────────────────────────────────────────────
// Minimal unified caller for OpenRouter and Ollama.
// Single flat config: { type, endpoint, apiKey, model }
// No profiles, no subconscious, no dream — just callLLM.
'use strict';

const http  = require('http');
const https = require('https');

const DEFAULT_TIMEOUT  = 90000;  // 90s
const DEFAULT_MAX_TOKENS = 12288;

/**
 * Call an LLM provider.
 * @param {object} config  - { type, endpoint, apiKey, model }
 * @param {Array}  messages - [{ role, content }]
 * @param {object} opts    - { temperature, maxTokens, timeout, responseFormat }
 * @returns {Promise<string>} LLM response text
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
  // Default: OpenRouter / OpenAI-compatible
  return _callOpenRouter(config, messages, { temperature, maxTokens, timeout, responseFormat: opts.responseFormat });
}

// ── OpenRouter / OpenAI-compatible ──────────────────────────────────────────
async function _callOpenRouter(config, messages, opts) {
  const body = JSON.stringify({
    model:       config.model,
    messages,
    temperature: opts.temperature,
    max_tokens:  opts.maxTokens,
    ...(opts.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {})
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

  return (data.choices[0].message?.content || '').trim();
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
