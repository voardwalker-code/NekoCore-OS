// ============================================================
// REM System v0.6.0 — Provider Module
// Supports: OpenRouter (API key) and Ollama (local)
// ============================================================

// ============================================================
// OPENROUTER PRESET
// ============================================================
const OPENROUTER_PRESET = {
  ep: 'https://openrouter.ai/api/v1/chat/completions',
  models: [
    {id:'openai/gpt-4o',l:'OpenAI GPT-4o'},
    {id:'anthropic/claude-sonnet-4.6',l:'Claude Sonnet 4.6'},
    {id:'anthropic/claude-sonnet-4',l:'Claude Sonnet 4'},
    {id:'google/gemini-2.5-flash',l:'Gemini 2.5 Flash'},
    {id:'meta-llama/llama-3.3-70b-instruct',l:'Llama 3.3 70B'},
    {id:'deepseek/deepseek-chat-v3-0324',l:'DeepSeek V3'}
  ],
  def: 'openai/gpt-4o'
};

// ============================================================
// OLLAMA
// ============================================================
async function ollamaConnect(panel = 'main') {
  const urlMap = { main: 'ollamaUrl-main', subconscious: 'ollamaUrl-subconscious', dreams: 'ollamaUrl-dreams', orchestrator: 'ollamaUrl-orchestrator', nekocore: 'ollamaUrl-nekocore' };
  const modelMap = { main: 'ollamaModel-main', subconscious: 'ollamaModel-subconscious', dreams: 'ollamaModel-dreams', orchestrator: 'ollamaModel-orchestrator', nekocore: 'ollamaModel-nekocore' };
  const urlId = urlMap[panel] || urlMap.main;
  const modelId = modelMap[panel] || modelMap.main;
  const url = document.getElementById(urlId).value.trim() || 'http://localhost:11434';
  const model = document.getElementById(modelId).value.trim() || 'llama3';
  try {
    const resp = await fetch(url + '/api/tags');
    if (!resp.ok) throw new Error('Cannot reach Ollama');
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name);
    if (models.length > 0) {
      if (document.getElementById(modelId).tagName === 'SELECT') {
        populateSelect(modelId, models.map(m => ({ id: m, label: m })), model);
      } else {
        document.getElementById(modelId).value = model;
      }
    }
    activeConfig = { type: 'ollama', endpoint: url, model: document.getElementById(modelId).value };
    updateProviderUI('ollama', true, 'Ollama (' + activeConfig.model + ')');
    autoSaveConfig();
    // Save global aspect config (entities pull from global profile reference)
    const aspect = panel === 'nekocore' ? 'nekocore' : (panel === 'subconscious' ? 'subconscious' : (panel === 'dreams' ? 'dream' : (panel === 'orchestrator' ? 'orchestrator' : 'main')));
    fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: aspect, config: { type: 'ollama', endpoint: url, model: activeConfig.model } })
    }).catch(() => {});
    lg('ok', 'Ollama connected. Models: ' + models.join(', '));
  } catch (e) {
    lg('err', 'Ollama connection failed: ' + e.message);
    updateProviderUI('ollama', false);
  }
}

// ============================================================
// OPENROUTER (API KEY)
// ============================================================
function openrouterQuick(panel = 'main') {
  const endpointMap = { main: 'apikeyEndpoint-main', subconscious: 'subApiEndpoint', dreams: 'dreamApiEndpoint', orchestrator: 'orchApiEndpoint', nekocore: 'apikeyEndpoint-nekocore' };
  const modelMap = { main: 'apikeyModel-main', subconscious: 'subModel', dreams: 'dreamModel', orchestrator: 'orchModel', nekocore: 'nekocoreModel' };
  const endpointId = endpointMap[panel] || endpointMap.main;
  const modelId = modelMap[panel] || modelMap.main;
  const aspect = panel === 'nekocore' ? 'nekocore' : (panel === 'subconscious' ? 'subconscious' : (panel === 'dreams' ? 'dream' : (panel === 'orchestrator' ? 'orchestrator' : 'main')));
  const preset = (typeof getOpenRouterRolePreset === 'function')
    ? getOpenRouterRolePreset(aspect)
    : { models: OPENROUTER_PRESET.models, def: OPENROUTER_PRESET.def };
  document.getElementById(endpointId).value = OPENROUTER_PRESET.ep;
  const sel = document.getElementById(modelId);
  if (sel.tagName === 'SELECT') {
    sel.innerHTML = '';
    preset.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.l;
      sel.appendChild(opt);
    });
  } else {
    const listId = sel.getAttribute('list');
    if (listId) {
      const list = document.getElementById(listId);
      if (list) {
        list.innerHTML = '';
        preset.models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          if (m.l) opt.label = m.l;
          list.appendChild(opt);
        });
      }
    }

    sel.placeholder = preset.def + ' (or paste any OpenRouter model id)';
  }
  lg('info', 'OpenRouter preset loaded (' + panel + ')');
}

async function openrouterConnect(panel = 'main') {
  const endpointMap = { main: 'apikeyEndpoint-main', subconscious: 'subApiEndpoint', dreams: 'dreamApiEndpoint', orchestrator: 'orchApiEndpoint', nekocore: 'apikeyEndpoint-nekocore' };
  const keyMap = { main: 'apikeyKey-main', subconscious: 'subApiKey', dreams: 'dreamApiKey', orchestrator: 'orchApiKey', nekocore: 'nekocoreApiKey' };
  const modelMap = { main: 'apikeyModel-main', subconscious: 'subModel', dreams: 'dreamModel', orchestrator: 'orchModel', nekocore: 'nekocoreModel' };
  const endpointId = endpointMap[panel] || endpointMap.main;
  const keyId = keyMap[panel] || keyMap.main;
  const modelId = modelMap[panel] || modelMap.main;

  const aspect = panel === 'nekocore' ? 'nekocore' : (panel === 'subconscious' ? 'subconscious' : (panel === 'dreams' ? 'dream' : (panel === 'orchestrator' ? 'orchestrator' : 'main')));
  const preset = (typeof getOpenRouterRolePreset === 'function')
    ? getOpenRouterRolePreset(aspect)
    : { def: OPENROUTER_PRESET.def };

  const endpoint = document.getElementById(endpointId).value.trim() || OPENROUTER_PRESET.ep;
  const key = document.getElementById(keyId).value.trim();
  const model = document.getElementById(modelId).value.trim() || preset.def;

  if (!key) {
    lg('err', 'API key is required');
    return;
  }

  activeConfig = {
    type: 'openrouter',
    endpoint,
    apiKey: key,
    model
  };

  updateProviderUI('openrouter', true, 'OpenRouter (' + model + ')');

  if (panel === 'main') {
    autoSaveConfig();
    flushPendingSystemPrompt();
  }

  // Save global aspect config (entities pull from global profile reference)
  const provider = aspect; // main, subconscious, dream, orchestrator
  fetch('/api/entity-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, config: { type: 'openrouter', endpoint, key, model } })
  }).catch(() => {});

  lg('ok', 'OpenRouter connected: ' + model + ' (' + panel + ')');
}

// ============================================================
// NEKOCORE OS CONFIG
// ============================================================
let _nkActiveProvider = 'openrouter';
const NK_MASKED_KEY = '********';

function _nkGetKeyField(provider) {
  if (provider === 'anthropic') {
    return {
      input: document.getElementById('nekocoreAnthropicKey'),
      toggle: document.getElementById('nekocoreAnthropicKeyToggle')
    };
  }
  return {
    input: document.getElementById('nekocoreApiKey'),
    toggle: document.getElementById('nekocoreApiKeyToggle')
  };
}

function _nkSetMaskedKeyState(provider, hasStoredKey) {
  const refs = _nkGetKeyField(provider);
  const input = refs.input;
  const toggle = refs.toggle;
  if (!input) return;

  input.type = 'password';
  input.dataset.hasStoredKey = hasStoredKey ? 'true' : 'false';
  input.dataset.revealed = 'false';
  input.value = hasStoredKey ? NK_MASKED_KEY : '';

  if (toggle) toggle.textContent = 'See';
}

function _nkBindKeyMaskInput(provider) {
  const refs = _nkGetKeyField(provider);
  const input = refs.input;
  const toggle = refs.toggle;
  if (!input || input.dataset.maskBound === 'true') return;

  input.addEventListener('input', () => {
    if (input.value !== NK_MASKED_KEY) {
      input.dataset.revealed = 'false';
      if (toggle) toggle.textContent = 'See';
    }
  });
  input.dataset.maskBound = 'true';
}

async function nkToggleApiKey(provider) {
  const refs = _nkGetKeyField(provider);
  const input = refs.input;
  const toggle = refs.toggle;
  if (!input || !toggle) return;

  const isRevealed = input.dataset.revealed === 'true';
  const hasStoredKey = input.dataset.hasStoredKey === 'true';

  if (isRevealed) {
    input.type = 'password';
    if (hasStoredKey) {
      input.value = NK_MASKED_KEY;
    }
    input.dataset.revealed = 'false';
    toggle.textContent = 'See';
    return;
  }

  if (hasStoredKey) {
    try {
      const resp = await fetch('/api/entity-config?provider=nekocore');
      if (resp.ok) {
        const existing = await resp.json();
        const key = String(existing?.apiKey || existing?.key || '').trim();
        if (key) {
          input.type = 'text';
          input.value = key;
          input.dataset.revealed = 'true';
          toggle.textContent = 'Hide';
          return;
        }
      }
    } catch (_) {}
  }

  input.type = 'text';
  input.dataset.revealed = 'true';
  toggle.textContent = 'Hide';
}

function nkPickProvider(provider) {
  _nkActiveProvider = provider;
  const types = ['openrouter', 'anthropic', 'ollama'];
  for (const t of types) {
    const btn = document.getElementById('nkProviderBtn-' + t);
    const panel = document.getElementById('nkPanel-' + t);
    if (btn) btn.classList.toggle('on', t === provider);
    if (panel) panel.style.display = t === provider ? '' : 'none';
  }
}

async function saveNekocoreConfig() {
  const provider = _nkActiveProvider;
  let cfg, statusEl, key;

  if (provider === 'anthropic') {
    statusEl = document.getElementById('nekocoreAnthropicStatus');
    key = (document.getElementById('nekocoreAnthropicKey')?.value || '').trim();
    const model = (document.getElementById('nekocoreAnthropicModel')?.value || '').trim();
    if (!model) { _nkStatus(statusEl, 'Model is required', false); return; }
    if (!key) { _nkStatus(statusEl, 'API key is required', false); return; }
    cfg = { type: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', apiKey: key, model };
  } else if (provider === 'ollama') {
    statusEl = document.getElementById('nekocoreOllamaStatus');
    const url = (document.getElementById('nekocoreOllamaUrl')?.value || 'http://localhost:11434').trim();
    const model = (document.getElementById('nekocoreOllamaModel')?.value || '').trim();
    if (!model) { _nkStatus(statusEl, 'Model is required', false); return; }
    cfg = { type: 'ollama', endpoint: url, model };
  } else {
    statusEl = document.getElementById('nekocoreConfigStatus');
    const endpoint = (document.getElementById('apikeyEndpoint-nekocore')?.value || '').trim()
      || 'https://openrouter.ai/api/v1/chat/completions';
    key = (document.getElementById('nekocoreApiKey')?.value || '').trim();
    const model = (document.getElementById('nekocoreModel')?.value || '').trim();
    if (!model) { _nkStatus(statusEl, 'Model is required', false); return; }
    if (!key) { _nkStatus(statusEl, 'API key is required', false); return; }
    cfg = { type: 'openrouter', endpoint, key, model };
  }

  try {
    const resp = await fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'nekocore', config: cfg })
    });
    const data = await resp.json();
    if (data.ok) _nkStatus(statusEl, 'NekoCore OS config saved \u2713', true);
    else _nkStatus(statusEl, 'Save failed: ' + (data.error || 'unknown error'), false);
  } catch (e) {
    _nkStatus(statusEl, 'Save failed: ' + e.message, false);
  }
}

function _nkStatus(el, msg, ok) {
  if (el) { el.textContent = msg; el.style.color = ok ? 'var(--accent-green)' : 'var(--accent-red, #e55)'; }
}

async function _nkFetchStoredKey() {
  try {
    const resp = await fetch('/api/entity-config?provider=nekocore');
    if (resp.ok) {
      const existing = await resp.json();
      return String(existing?.apiKey || existing?.key || '').trim() || '';
    }
  } catch (_) {}
  return '';
}

async function loadNekocoreConfig() {
  try {
    const resp = await fetch('/api/entity-config?provider=nekocore');
    if (!resp.ok) return;
    const cfg = await resp.json();
    if (!cfg || typeof cfg !== 'object') return;

    const type = String(cfg.type || '').toLowerCase();
    if (type === 'anthropic') {
      nkPickProvider('anthropic');
      const keyEl = document.getElementById('nekocoreAnthropicKey');
      const modelEl = document.getElementById('nekocoreAnthropicModel');
      if (modelEl && cfg.model) modelEl.value = cfg.model;
      if (keyEl && (cfg.apiKey || cfg.key)) keyEl.value = String(cfg.apiKey || cfg.key);
    } else if (type === 'ollama') {
      nkPickProvider('ollama');
      const urlEl = document.getElementById('nekocoreOllamaUrl');
      const modelEl = document.getElementById('nekocoreOllamaModel');
      if (urlEl && cfg.endpoint) urlEl.value = cfg.endpoint;
      if (modelEl && cfg.model) modelEl.value = cfg.model;
    } else {
      nkPickProvider('openrouter');
      const endpointEl = document.getElementById('apikeyEndpoint-nekocore');
      const keyEl = document.getElementById('nekocoreApiKey');
      const modelEl = document.getElementById('nekocoreModel');
      if (endpointEl && cfg.endpoint) endpointEl.value = cfg.endpoint;
      if (modelEl && cfg.model) modelEl.value = cfg.model;
      if (keyEl && (cfg.apiKey || cfg.key)) keyEl.value = String(cfg.apiKey || cfg.key);
    }
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', () => {
  _nkBindKeyMaskInput('openrouter');
  _nkBindKeyMaskInput('anthropic');
  loadNekocoreConfig();
});

// ============================================================
// HELPERS
// ============================================================
function populateSelect(selectId, models, currentVal) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const prev = currentVal || sel.value;
  sel.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label || m.id;
    sel.appendChild(opt);
  });
  if (prev && [...sel.options].some(o => o.value === prev)) {
    sel.value = prev;
  }
}
