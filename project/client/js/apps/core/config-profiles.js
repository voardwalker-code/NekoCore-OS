// ============================================================
// NekoCore OS — Config Profiles & Model Recommendations
// Extracted from app.js by P3-S8
// Depends on globals from app.js: savedConfig, activeConfig, CONFIG_API, lg,
//   updateProviderUI, inheritMainConfigToAspect, initSimpleProviderUI (→simple-provider.js P3-S9),
//   ollamaConnect, saveMainProviderConfig, saveSubconsciousConfig, saveDreamConfig,
//   saveOrchestratorConfig, syncNavSidebarProfiles
// Depends on globals from auth.js: OPENROUTER_PRESET
// Depends on globals from setup-ui.js: isApiConfigured, hideSetupRequired
// ============================================================

// ============================================================
// CONFIG PERSISTENCE (via server.js /api/config)
// ============================================================
async function loadSavedConfig() {
  try {
    const resp = await fetch(CONFIG_API);
    if (!resp.ok) throw new Error('Server not reachable');
    const data = await resp.json();
    if (data && data.profiles) {
      savedConfig = data;
      lg('info', 'Config loaded from server (' + Object.keys(data.profiles).length + ' profile(s))');
      renderProfileChips();
      
      // Do NOT auto-connect from last active profile. Require user to select a model/profile.
      // Optionally, highlight the last active profile for user convenience.
      if (data.lastActive && data.profiles[data.lastActive]) {
        lg('info', 'Last active profile available: ' + data.lastActive + ' (user must select to connect)');
      }
    }
  } catch (e) {
    lg('warn', 'Config not loaded (ensure server is running): ' + e.message);
  }
}

function getMainConfigFromProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  // Preferred multi-aspect profile format.
  if (profile.main && typeof profile.main === 'object') {
    const m = profile.main;
    const mType = String(m.type || '').toLowerCase();
    if (mType === 'openrouter') {
      const endpoint = m.endpoint || OPENROUTER_PRESET.ep;
      const apiKey = m.apiKey || m.key || '';
      const model = m.model || OPENROUTER_PRESET.def;
      if (endpoint && apiKey && model) {
        return { type: 'openrouter', endpoint, apiKey, model };
      }
    }
    if (mType === 'ollama') {
      const endpoint = m.endpoint || m.ollamaUrl || 'http://localhost:11434';
      const model = m.model || m.ollamaModel || 'llama3';
      if (endpoint && model) {
        return { type: 'ollama', endpoint, model };
      }
    }
  }

  // Legacy single-provider profile format.
  const aType = String(profile._activeType || '').toLowerCase();
  if ((aType === 'apikey' || aType === 'openrouter') && profile.apikey) {
    const endpoint = profile.apikey.endpoint || OPENROUTER_PRESET.ep;
    const apiKey = profile.apikey.key || profile.apikey.apiKey || '';
    const model = profile.apikey.model || OPENROUTER_PRESET.def;
    if (endpoint && apiKey && model) {
      return { type: 'openrouter', endpoint, apiKey, model };
    }
  }
  if (aType === 'ollama' && profile.ollama) {
    const endpoint = profile.ollama.url || profile.ollama.endpoint || 'http://localhost:11434';
    const model = profile.ollama.model || 'llama3';
    if (endpoint && model) {
      return { type: 'ollama', endpoint, model };
    }
  }

  return null;
}

function hydrateMainProviderInputs(config) {
  if (!config) return;

  const endpointEl = document.getElementById('apikeyEndpoint-main');
  const keyEl = document.getElementById('apikeyKey-main');
  const modelEl = document.getElementById('apikeyModel-main');
  const ollamaUrlEl = document.getElementById('ollamaUrl-main');
  const ollamaModelEl = document.getElementById('ollamaModel-main');

  if (config.type === 'openrouter') {
    if (endpointEl) endpointEl.value = config.endpoint || OPENROUTER_PRESET.ep;
    if (keyEl) keyEl.value = config.apiKey || '';
    if (modelEl) modelEl.value = config.model || OPENROUTER_PRESET.def;
  } else if (config.type === 'ollama') {
    if (ollamaUrlEl) ollamaUrlEl.value = config.endpoint || 'http://localhost:11434';
    if (ollamaModelEl) ollamaModelEl.value = config.model || 'llama3';
  }

  // Pre-fill sub/dream/orchestrator endpoint + key from main so user only needs to pick a model
  if (config.type === 'openrouter' && config.endpoint && config.apiKey) {
    inheritMainConfigToAspect('subconscious');
    inheritMainConfigToAspect('dreams');
    inheritMainConfigToAspect('orchestrator');
    inheritMainConfigToAspect('nekocore');
  }
}

async function persistConfig() {
  try {
    lg('info', 'Saving config (' + Object.keys(savedConfig.profiles || {}).length + ' profile(s))...');
    const resp = await fetch(CONFIG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedConfig)
    });
    if (!resp.ok) throw new Error('Server returned ' + resp.status);
    lg('ok', 'Config saved successfully (lastActive: ' + savedConfig.lastActive + ')');
    return true;
  } catch (e) {
    lg('err', 'Could not save config: ' + e.message);
    return false;
  }
}

function gatherProfile() {
  const profile = {};
  const olUrl = document.getElementById('ollamaUrl-main')?.value?.trim();
  if (olUrl) profile.ollama = { url: olUrl, model: document.getElementById('ollamaModel-main')?.value || 'llama3' };
  const akEp = document.getElementById('apikeyEndpoint-main')?.value?.trim();
  const akKey = document.getElementById('apikeyKey-main')?.value?.trim();
  const akMd = document.getElementById('apikeyModel-main')?.value;
  if (akEp) profile.apikey = { endpoint: akEp, key: akKey, model: akMd };
  return profile;
}

async function autoSaveConfig() {
  // Reload from server first so we never overwrite aspect configs saved via /api/entity-config
  try {
    const freshResp = await fetch(CONFIG_API);
    if (freshResp.ok) {
      const freshData = await freshResp.json();
      if (freshData && freshData.profiles) savedConfig = freshData;
    }
  } catch (_) { /* proceed with local copy if server unreachable */ }

  const profile = gatherProfile();
  let name = savedConfig.lastActive || 'default-multi-llm';
  const existing = savedConfig.profiles[name] || {};

  // Merge gathered main fields into the existing profile.
  // Only write legacy apikey/_activeType for profiles that have not yet migrated to multi-aspect format.
  if (profile.ollama) existing.ollama = profile.ollama;
  if (!existing.main) {
    if (profile.apikey) existing.apikey = profile.apikey;
    existing._activeType = activeConfig?.type || existing._activeType || null;
  }

  // Update the main aspect config from activeConfig (keeps sub/dream/orchestrator intact)
  if (activeConfig) {
    existing.main = {
      type: activeConfig.type,
      endpoint: activeConfig.endpoint || activeConfig.url || '',
      ...(activeConfig.apiKey ? { apiKey: activeConfig.apiKey } : {}),
      model: activeConfig.model || ''
    };
    if (!existing._activeTypes || typeof existing._activeTypes !== 'object') existing._activeTypes = {};
    existing._activeTypes.main = activeConfig.type;
  }

  savedConfig.profiles[name] = existing;
  savedConfig.lastActive = name;
  const ok = await persistConfig();
  if (ok) {
    const el = document.getElementById('saveStatus');
    el.textContent = '\u2713 Auto-saved';
    el.style.color = 'var(--em)';
    setTimeout(() => { el.textContent = ''; }, 2500);
    renderProfileChips();
    lg('ok', 'Auto-saved config: ' + name);
    if (isApiConfigured()) {
      hideSetupRequired();
    }
  }
}

/** Reload savedConfig from server so client stays in sync after /api/entity-config writes */
async function refreshSavedConfig() {
  try {
    const resp = await fetch(CONFIG_API);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.profiles) {
        savedConfig = data;
        renderProfileChips();
        initSimpleProviderUI();
      }
    }
  } catch (_) {}
}

function saveCurrentProfile() {
  const profile = gatherProfile();
  let name = savedConfig.lastActive || 'default';
  const inputName = prompt('Save profile as:', name);
  if (!inputName) return;
  name = inputName.trim();
  profile._activeType = activeConfig?.type || null;
  savedConfig.profiles[name] = profile;
  savedConfig.lastActive = name;
  persistConfig().then(ok => {
    if (ok) {
      const el = document.getElementById('saveStatus');
      el.textContent = 'Saved!';
      el.style.color = 'var(--em)';
      setTimeout(() => { el.textContent = ''; }, 2000);
      renderProfileChips();
      lg('ok', 'Profile saved: ' + name);
    }
  });
}

function loadProfile(name) {
  const p = savedConfig.profiles[name];
  if (!p) return;

  // Load Ollama fields if present
  if (p.ollama) {
    const urlEl = document.getElementById('ollamaUrl-main');
    const modelEl = document.getElementById('ollamaModel-main');
    if (urlEl) urlEl.value = p.ollama.url || 'http://localhost:11434';
    if (modelEl) modelEl.value = p.ollama.model || 'llama3';
  }

  // Load OpenRouter/API key fields if present
  if (p.apikey) {
    const epEl = document.getElementById('apikeyEndpoint-main');
    const keyEl = document.getElementById('apikeyKey-main');
    const modelEl = document.getElementById('apikeyModel-main');
    if (epEl) epEl.value = p.apikey.endpoint || '';
    if (keyEl) keyEl.value = p.apikey.key || '';
    if (modelEl) modelEl.value = p.apikey.model || '';
  }

  // Auto-connect based on saved active type
  const aType = p._activeType;
  if ((aType === 'apikey' || aType === 'openrouter') && p.apikey && p.apikey.endpoint && p.apikey.key) {
    activeConfig = { type: 'openrouter', endpoint: p.apikey.endpoint, apiKey: p.apikey.key, model: p.apikey.model };
    updateProviderUI('openrouter', true, 'OpenRouter (' + p.apikey.model + ')');
    lg('ok', 'Auto-connected: ' + p.apikey.model);
    hideSetupRequired();
  } else if (aType === 'ollama' && p.ollama) {
    activeConfig = { type: 'ollama', endpoint: p.ollama.url, model: p.ollama.model };
    updateProviderUI('ollama', true, 'Ollama (' + p.ollama.model + ')');
    hideSetupRequired();
  }

  savedConfig.lastActive = name;
  persistConfig();
  renderProfileChips();
  lg('info', 'Loaded profile: ' + name);
}

function deleteProfile(name, ev) {
  ev.stopPropagation();
  if (!confirm('Delete profile "' + name + '"?')) return;
  delete savedConfig.profiles[name];
  if (savedConfig.lastActive === name) savedConfig.lastActive = null;
  persistConfig().then(() => {
    renderProfileChips();
    lg('info', 'Deleted profile: ' + name);
  });
}

function renderProfileChips() {
  const container = document.getElementById('profileChips');
  if (!container) return;
  const names = Object.keys(savedConfig.profiles || {});
  if (names.length === 0) {
    container.innerHTML = '<span style="font-size:.6rem;color:var(--td)">No saved profiles</span>';
    return;
  }
  container.innerHTML = '';
  names.forEach(name => {
    const chip = document.createElement('button');
    chip.className = 'profile-chip' + (name === savedConfig.lastActive ? ' active' : '');
    const p = savedConfig.profiles[name];
    let icon = '\u{1F511}';
    if (p._activeType === 'ollama') icon = '\u{1F7E0}';
    else if (p._activeType === 'openrouter' || p._activeType === 'apikey') icon = '\u{1F310}';
    chip.innerHTML = icon + ' ' + name + '<span class="del" onclick="deleteProfile(\'' + name.replace(/'/g, "\\'") + '\', event)">&times;</span>';
    chip.onclick = () => loadProfile(name);
    container.appendChild(chip);
  });
  syncNavSidebarProfiles();
}

// ============================================================
// MODEL RECOMMENDATIONS — STACKS, COPY, PRESET UI
// ============================================================

// Curated OpenRouter recommendations per cognitive role.
// Users can always type/paste any custom model ID in the same input field.
const OPENROUTER_ROLE_MODELS = {
  main: {
    def: 'openai/gpt-4o',
    models: [
      { id: 'openai/gpt-4o', l: 'OpenAI GPT-4o (balanced main chat)' },
      { id: 'anthropic/claude-sonnet-4.6', l: 'Claude Sonnet 4.6 (latest high quality)' },
      { id: 'anthropic/claude-sonnet-4', l: 'Claude Sonnet 4 (strong reasoning)' },
      { id: 'google/gemini-2.5-pro', l: 'Gemini 2.5 Pro (deep thinking)' },
      { id: 'google/gemini-2.5-flash', l: 'Gemini 2.5 Flash (fast/cheap)' },
      { id: 'deepseek/deepseek-chat-v3-0324', l: 'DeepSeek V3 (cost-effective)' }
    ]
  },
  subconscious: {
    def: 'google/gemini-2.5-flash',
    models: [
      { id: 'google/gemini-2.5-flash', l: 'Gemini 2.5 Flash (memory/background tasks)' },
      { id: 'deepseek/deepseek-chat-v3-0324', l: 'DeepSeek V3 (long context value)' },
      { id: 'anthropic/claude-sonnet-4.6', l: 'Claude Sonnet 4.6 (reflection quality+)' },
      { id: 'anthropic/claude-sonnet-4', l: 'Claude Sonnet 4 (reflection quality)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', l: 'Llama 3.3 70B (self-host friendly alt)' },
      { id: 'openai/gpt-4o-mini', l: 'OpenAI GPT-4o Mini (low-cost throughput)' }
    ]
  },
  dream: {
    def: 'anthropic/claude-sonnet-4.6',
    models: [
      { id: 'anthropic/claude-sonnet-4.6', l: 'Claude Sonnet 4.6 (creative synthesis+)' },
      { id: 'anthropic/claude-sonnet-4', l: 'Claude Sonnet 4 (creative synthesis)' },
      { id: 'openai/gpt-4o', l: 'OpenAI GPT-4o (imaginative + coherent)' },
      { id: 'google/gemini-2.5-pro', l: 'Gemini 2.5 Pro (narrative planning)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', l: 'Llama 3.3 70B (dream simulation alt)' },
      { id: 'deepseek/deepseek-chat-v3-0324', l: 'DeepSeek V3 (economical dream cycles)' }
    ]
  },
  orchestrator: {
    def: 'anthropic/claude-sonnet-4.6',
    models: [
      { id: 'anthropic/claude-sonnet-4.6', l: 'Claude Sonnet 4.6 (recommended orchestrator)' },
      { id: 'openai/gpt-4o', l: 'OpenAI GPT-4o (balanced synthesis)' },
      { id: 'anthropic/claude-sonnet-4', l: 'Claude Sonnet 4 (strong persona modulation)' },
      { id: 'google/gemini-2.5-pro', l: 'Gemini 2.5 Pro (deep integration)' },
      { id: 'google/gemini-2.5-flash', l: 'Gemini 2.5 Flash (fast/cheap orchestration)' },
      { id: 'deepseek/deepseek-chat-v3-0324', l: 'DeepSeek V3 (cost-effective)' }
    ]
  }
};

function getOpenRouterRolePreset(aspect) {
  return OPENROUTER_ROLE_MODELS[aspect] || OPENROUTER_ROLE_MODELS.main;
}

let currentRecommendedSetupTab = 'best';
let currentRecommendedPresetProvider = 'openrouter';

const RECOMMENDED_MODEL_STACKS = {
  best: {
    main: 'anthropic/claude-sonnet-4.6',
    subconscious: 'moonshotai/kimi-k2.5',
    dream: 'anthropic/claude-sonnet-4.6',
    orchestrator: 'anthropic/claude-sonnet-4.6'
  },
  fast: {
    main: 'inception/mercury-2',
    subconscious: 'inception/mercury-2',
    dream: 'google/gemini-3.1-flash-lite-preview',
    orchestrator: 'anthropic/claude-sonnet-4'
  },
  cheap: {
    main: 'arcee-ai/trinity-large-preview:free',
    subconscious: 'stepfun/step-3.5-flash:free',
    dream: 'arcee-ai/trinity-large-preview:free',
    orchestrator: 'arcee-ai/trinity-large-preview:free'
  },
  hybrid: {
    main: 'deepseek/deepseek-v3.2',
    subconscious: 'inception/mercury-2',
    dream: 'google/gemini-3-flash-preview',
    orchestrator: 'deepseek/deepseek-v3.2'
  }
};

const OLLAMA_RECOMMENDED_STACKS = {
  best: {
    main: 'qwen2.5:7b',
    subconscious: 'qwen2.5:3b',
    dream: 'Qwen:latest',
    orchestrator: 'qwen2.5:7b'
  },
  fast: {
    main: 'llama3.2:3b',
    subconscious: 'qwen2.5:1.5b',
    dream: 'Qwen:latest',
    orchestrator: 'llama3.2:3b'
  },
  cheap: {
    main: 'Qwen:latest',
    subconscious: 'gemma3:1b',
    dream: 'Qwen:latest',
    orchestrator: 'Qwen:latest'
  },
  hybrid: {
    main: 'Qwen:latest',
    subconscious: 'qwen2.5:3b',
    dream: 'qwen2.5:3b',
    orchestrator: 'Qwen:latest'
  }
};

const RECOMMENDED_PANEL_COPY = {
  openrouter: {
    best: 'Best quality and strongest persona fidelity. Uses Claude Sonnet 4.6 for personality-facing phases.',
    fast: 'Lowest latency stack. Uses Mercury 2 for Main Mind and Claude Sonnet 4 for Orchestrator to reduce character drift.',
    cheap: 'Cost floor stack. Uses free-tier Trinity + Step 3.5 Flash.',
    hybrid: 'Balanced quality, speed, and cost using DeepSeek + Mercury + Gemini.',
    custom: 'Set each aspect manually below and save each panel as needed.'
  },
  ollama: {
    best: 'Best local quality stack without 8B: qwen2.5:7b core with lighter support models.',
    fast: 'Lowest local latency stack using lightweight 3B/1.5B workers and a fast dream model.',
    cheap: 'Lowest local footprint stack for stability under load on 8GB VRAM.',
    hybrid: 'Recommended balanced local stack without 8B for chat quality, latency, and parallel-stage stability.',
    custom: 'Set each Ollama aspect manually below, then connect/save each panel as needed.'
  }
};

function refreshRecommendedPanelCopy() {
  const copy = RECOMMENDED_PANEL_COPY[currentRecommendedPresetProvider] || RECOMMENDED_PANEL_COPY.openrouter;
  ['best', 'fast', 'cheap', 'hybrid', 'custom'].forEach(name => {
    const el = document.getElementById('recommendedPanelText-' + name);
    if (el && copy[name]) el.textContent = copy[name];
  });
  const hint = document.getElementById('recommendedProviderHint');
  if (hint) {
    hint.textContent = currentRecommendedPresetProvider === 'ollama'
      ? 'Applying Ollama stacks'
      : 'Applying OpenRouter stacks';
  }
}

function showRecommendedPresetProvider(provider, el) {
  currentRecommendedPresetProvider = (provider === 'ollama') ? 'ollama' : 'openrouter';
  const orBtn = document.getElementById('recommendedProvider-openrouter');
  const olBtn = document.getElementById('recommendedProvider-ollama');
  if (orBtn) orBtn.classList.toggle('on', currentRecommendedPresetProvider === 'openrouter');
  if (olBtn) olBtn.classList.toggle('on', currentRecommendedPresetProvider === 'ollama');
  if (el && !el.classList.contains('on')) el.classList.add('on');
  refreshRecommendedPanelCopy();
  const statusEl = document.getElementById('recommendedPresetStatus');
  if (statusEl) statusEl.textContent = '';
}

function showRecommendedSetupTab(tabName, el) {
  currentRecommendedSetupTab = tabName;
  ['best', 'fast', 'cheap', 'hybrid', 'custom'].forEach(name => {
    const btn = document.getElementById('recommendedTab-' + name);
    const panel = document.getElementById('recommendedPanel-' + name);
    if (btn) btn.classList.toggle('on', name === tabName);
    if (panel) panel.classList.toggle('on', name === tabName);
  });
  refreshRecommendedPanelCopy();
  const statusEl = document.getElementById('recommendedPresetStatus');
  if (statusEl) statusEl.textContent = '';
  if (el && !el.classList.contains('on')) el.classList.add('on');
}

function applyRecommendedPresetInputs(stackKey, provider = 'openrouter') {
  const stack = provider === 'ollama'
    ? OLLAMA_RECOMMENDED_STACKS[stackKey]
    : RECOMMENDED_MODEL_STACKS[stackKey];
  if (!stack) return false;

  if (provider === 'ollama') {
    const endpoint = 'http://localhost:11434';
    const mainUrl = document.getElementById('ollamaUrl-main');
    const subUrl = document.getElementById('ollamaUrl-subconscious');
    const dreamUrl = document.getElementById('ollamaUrl-dreams');
    const orchUrl = document.getElementById('ollamaUrl-orchestrator');
    if (mainUrl) mainUrl.value = endpoint;
    if (subUrl) subUrl.value = endpoint;
    if (dreamUrl) dreamUrl.value = endpoint;
    if (orchUrl) orchUrl.value = endpoint;

    const mainModel = document.getElementById('ollamaModel-main');
    const subModel = document.getElementById('ollamaModel-subconscious');
    const dreamModel = document.getElementById('ollamaModel-dreams');
    const orchModel = document.getElementById('ollamaModel-orchestrator');
    if (mainModel) mainModel.value = stack.main;
    if (subModel) subModel.value = stack.subconscious;
    if (dreamModel) dreamModel.value = stack.dream;
    if (orchModel) orchModel.value = stack.orchestrator;
    return true;
  }

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const mainEndpoint = document.getElementById('apikeyEndpoint-main');
  if (mainEndpoint) mainEndpoint.value = endpoint;

  const subEndpoint = document.getElementById('subApiEndpoint');
  const dreamEndpoint = document.getElementById('dreamApiEndpoint');
  const orchEndpoint = document.getElementById('orchApiEndpoint');
  if (subEndpoint) subEndpoint.value = endpoint;
  if (dreamEndpoint) dreamEndpoint.value = endpoint;
  if (orchEndpoint) orchEndpoint.value = endpoint;

  const mainModel = document.getElementById('apikeyModel-main');
  const subModel = document.getElementById('subModel');
  const dreamModel = document.getElementById('dreamModel');
  const orchModel = document.getElementById('orchModel');
  if (mainModel) mainModel.value = stack.main;
  if (subModel) subModel.value = stack.subconscious;
  if (dreamModel) dreamModel.value = stack.dream;
  if (orchModel) orchModel.value = stack.orchestrator;
  return true;
}

async function applyRecommendedSetupTab() {
  const statusEl = document.getElementById('recommendedPresetStatus');
  if (currentRecommendedSetupTab === 'custom') {
    if (statusEl) statusEl.textContent = 'Custom mode selected. Edit fields below, then save each panel.';
    return;
  }

  const provider = currentRecommendedPresetProvider;
  const ok = applyRecommendedPresetInputs(currentRecommendedSetupTab, provider);
  if (!ok) {
    if (statusEl) statusEl.textContent = 'Preset not found.';
    return;
  }

  if (provider === 'ollama') {
    try {
      await ollamaConnect('main');
      await ollamaConnect('subconscious');
      await ollamaConnect('dreams');
      await ollamaConnect('orchestrator');
      await refreshSavedConfig();
      if (statusEl) statusEl.textContent = 'Ollama preset applied and saved to global profile.';
      lg('ok', 'Applied ' + currentRecommendedSetupTab + ' Ollama preset to global settings');
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Failed to save Ollama preset globally.';
      lg('err', 'Ollama preset save failed: ' + e.message);
    }
    return;
  }

  const key = (document.getElementById('apikeyKey-main')?.value || '').trim();
  if (!key) {
    if (statusEl) statusEl.textContent = 'Preset applied to fields. Add OpenRouter key, then click Apply again to save globally.';
    lg('warn', 'Preset filled, but API key is missing. Add key to save global settings.');
    return;
  }

  try {
    await saveMainProviderConfig();
    await saveSubconsciousConfig();
    await saveDreamConfig();
    await saveOrchestratorConfig();
    if (statusEl) statusEl.textContent = 'Preset applied and saved to global profile.';
    lg('ok', 'Applied ' + currentRecommendedSetupTab + ' preset to global settings');
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Failed to save preset globally.';
    lg('err', 'Preset save failed: ' + e.message);
  }
}

function applySettingsOpenRouterSuggestions(panel = 'main') {
  const aspect = panel === 'subconscious' ? 'subconscious' : (panel === 'dreams' ? 'dream' : (panel === 'orchestrator' ? 'orchestrator' : 'main'));
  const preset = getOpenRouterRolePreset(aspect);
  const modelId = panel === 'main' ? 'apikeyModel-main' : (panel === 'subconscious' ? 'subModel' : (panel === 'orchestrator' ? 'orchModel' : 'dreamModel'));
  const listId = panel === 'main' ? 'openrouterModelList-main' : (panel === 'subconscious' ? 'openrouterModelList-sub' : (panel === 'orchestrator' ? 'openrouterModelList-orch' : 'openrouterModelList-dream'));
  const modelInput = document.getElementById(modelId);
  const modelList = document.getElementById(listId);
  if (!modelInput) return;

  if (modelList) {
    modelList.innerHTML = '';
    preset.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      if (m.l) opt.label = m.l;
      modelList.appendChild(opt);
    });
  }

  modelInput.placeholder = preset.def + ' (or paste any OpenRouter model id)';
}

function initSettingsModelSuggestions() {
  applySettingsOpenRouterSuggestions('main');
  applySettingsOpenRouterSuggestions('subconscious');
  applySettingsOpenRouterSuggestions('dreams');
  applySettingsOpenRouterSuggestions('orchestrator');
  refreshRecommendedPanelCopy();
  initSimpleProviderUI();
}
