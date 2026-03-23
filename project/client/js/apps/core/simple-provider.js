// ============================================================
// NekoCore OS — Simple Provider UI
// Extracted from app.js by P3-S9
// Depends on globals from app.js: savedConfig, activeConfig, OPENROUTER_PRESET, lg, updateProviderUI
// Depends on globals from config-profiles.js: OPENROUTER_ROLE_MODELS, RECOMMENDED_MODEL_STACKS,
//   refreshSavedConfig
// Depends on globals from setup-ui.js: isApiConfigured, hideSetupRequired
// ============================================================

// ============================================================
// SIMPLIFIED PROVIDER UI
// ============================================================

let simpleActiveProvider = 'openrouter';
const SIMPLE_PROVIDER_REDACTED_KEY = '••••••••';

function _getSimpleStoredOpenRouterConfig() {
  const profile = savedConfig?.profiles?.[savedConfig?.lastActive] || null;
  const mainCfg = profile?.main;
  if (mainCfg && String(mainCfg.type || '').toLowerCase() === 'openrouter') {
    return mainCfg;
  }
  if (profile?.apikey) {
    return {
      type: 'openrouter',
      endpoint: profile.apikey.endpoint || OPENROUTER_PRESET.ep,
      apiKey: profile.apikey.apiKey || profile.apikey.key || '',
      model: profile.apikey.model || ''
    };
  }
  if (activeConfig?.type === 'openrouter') {
    return activeConfig;
  }
  return null;
}

function _simpleHasStoredOpenRouterKey() {
  const stored = _getSimpleStoredOpenRouterConfig();
  const key = String(stored?.apiKey || stored?.key || '').trim();
  return !!key;
}

function initSimpleProviderUI() {
  // Populate OpenRouter model suggestions in the simple UI datalist
  const list = document.getElementById('simpleOrModelList');
  if (list) {
    list.innerHTML = '';
    const allModels = new Map();
    for (const role of Object.values(OPENROUTER_ROLE_MODELS)) {
      for (const m of role.models) allModels.set(m.id, m.l);
    }
    for (const [id, label] of allModels) {
      const opt = document.createElement('option');
      opt.value = id;
      if (label) opt.label = label;
      list.appendChild(opt);
    }
  }

  // Hydrate fields from saved config
  try {
    const profile = savedConfig?.profiles?.[savedConfig.lastActive];
    if (profile) {
      const mainCfg = profile.main;
      if (mainCfg) {
        if (mainCfg.type === 'ollama') {
          simplePickProvider('ollama');
          const urlEl = document.getElementById('simpleOllamaUrl');
          if (urlEl && mainCfg.endpoint) urlEl.value = mainCfg.endpoint;
          simpleFetchOllamaModels().then(() => {
            const sel = document.getElementById('simpleOllamaModel');
            if (sel && mainCfg.model) sel.value = mainCfg.model;
          });
        } else {
          simplePickProvider('openrouter');
          const keyEl = document.getElementById('simpleOrKey');
          const modelEl = document.getElementById('simpleOrModel');
          if (keyEl) {
            keyEl.value = '';
            keyEl.dataset.hasStoredKey = mainCfg.apiKey ? 'true' : 'false';
            if (mainCfg.apiKey) keyEl.placeholder = 'Saved API key on file';
          }
          if (modelEl && mainCfg.model) modelEl.value = mainCfg.model;
        }
      }
      // Hydrate advanced overrides
      if (profile.subconscious?.model) {
        const el = document.getElementById('simpleAdvSub');
        if (el) el.value = profile.subconscious.model;
      }
      if (profile.dream?.model) {
        const el = document.getElementById('simpleAdvDream');
        if (el) el.value = profile.dream.model;
      }
      if (profile.orchestrator?.model) {
        const el = document.getElementById('simpleAdvOrch');
        if (el) el.value = profile.orchestrator.model;
      }
    }
  } catch (_) {}

  const keyEl = document.getElementById('simpleOrKey');
  if (keyEl && !keyEl.dataset.hasStoredKey) {
    const hasStoredKey = _simpleHasStoredOpenRouterKey();
    keyEl.dataset.hasStoredKey = hasStoredKey ? 'true' : 'false';
    if (hasStoredKey && !keyEl.value) keyEl.placeholder = 'Saved API key on file';
  }
}

function simplePickProvider(provider) {
  simpleActiveProvider = provider;
  const orBtn = document.getElementById('simpleProviderBtn-openrouter');
  const olBtn = document.getElementById('simpleProviderBtn-ollama');
  const orPanel = document.getElementById('simplePanel-openrouter');
  const olPanel = document.getElementById('simplePanel-ollama');
  if (orBtn) orBtn.classList.toggle('on', provider === 'openrouter');
  if (olBtn) olBtn.classList.toggle('on', provider === 'ollama');
  if (orPanel) orPanel.style.display = provider === 'openrouter' ? '' : 'none';
  if (olPanel) olPanel.style.display = provider === 'ollama' ? '' : 'none';
}

function simpleApplyPreset(stackKey) {
  const stack = RECOMMENDED_MODEL_STACKS[stackKey];
  if (!stack) return;
  const modelEl = document.getElementById('simpleOrModel');
  if (modelEl) modelEl.value = stack.main;
  // Fill advanced overrides with per-stage models
  const subEl = document.getElementById('simpleAdvSub');
  const dreamEl = document.getElementById('simpleAdvDream');
  const orchEl = document.getElementById('simpleAdvOrch');
  if (subEl) subEl.value = stack.subconscious !== stack.main ? stack.subconscious : '';
  if (dreamEl) dreamEl.value = stack.dream !== stack.main ? stack.dream : '';
  if (orchEl) orchEl.value = stack.orchestrator !== stack.main ? stack.orchestrator : '';
  // Highlight active preset
  ['best', 'fast', 'cheap', 'hybrid'].forEach(k => {
    const btn = document.getElementById('simplePresetBtn-' + k);
    if (btn) btn.classList.toggle('on', k === stackKey);
  });
  // Auto-open advanced if overrides differ
  if (subEl?.value || dreamEl?.value || orchEl?.value) {
    const details = document.getElementById('simpleAdvancedToggle');
    if (details) details.open = true;
  }
}

async function simpleFetchOllamaModels() {
  const urlEl = document.getElementById('simpleOllamaUrl');
  const selEl = document.getElementById('simpleOllamaModel');
  const statusEl = document.getElementById('simpleOllamaFetchStatus');
  const url = (urlEl?.value || 'http://localhost:11434').trim();
  if (statusEl) { statusEl.textContent = 'Connecting...'; statusEl.style.color = 'var(--wn)'; }
  try {
    const resp = await fetch(url + '/api/tags');
    if (!resp.ok) throw new Error('Cannot reach Ollama at ' + url);
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name);
    if (selEl) {
      selEl.innerHTML = '';
      if (models.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No models found — pull one with `ollama pull`';
        selEl.appendChild(opt);
      } else {
        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          selEl.appendChild(opt);
        });
      }
    }
    if (statusEl) { statusEl.textContent = models.length + ' model(s) found'; statusEl.style.color = 'var(--em)'; }
  } catch (e) {
    if (statusEl) { statusEl.textContent = 'Failed: ' + e.message; statusEl.style.color = 'var(--dn)'; }
  }
}

async function simpleSaveConfig() {
  const isOllama = simpleActiveProvider === 'ollama';
  let mainModel, mainEndpoint, mainKey, mainType;
  let keyEl = null;
  let typedKey = '';

  if (isOllama) {
    mainType = 'ollama';
    mainEndpoint = (document.getElementById('simpleOllamaUrl')?.value || 'http://localhost:11434').trim();
    mainModel = (document.getElementById('simpleOllamaModel')?.value || '').trim();
    mainKey = '';
    if (!mainModel) {
      simpleShowStatus('ollamaStatus', 'Pick a model first', 'var(--dn)');
      return;
    }
  } else {
    mainType = 'openrouter';
    mainEndpoint = OPENROUTER_PRESET.ep;
    keyEl = document.getElementById('simpleOrKey');
    typedKey = (keyEl?.value || '').trim();
    const hasStoredKey = keyEl?.dataset.hasStoredKey === 'true' || _simpleHasStoredOpenRouterKey();
    mainKey = typedKey || (hasStoredKey ? SIMPLE_PROVIDER_REDACTED_KEY : '');

    // If field is blank and no stored key detected in-memory, try fetching from server
    if (!mainKey) {
      try {
        const existingResp = await fetch('/api/entity-config?provider=main');
        if (existingResp.ok) {
          const existing = await existingResp.json();
          const storedKey = String(existing?.apiKey || existing?.key || '').trim();
          if (storedKey) mainKey = SIMPLE_PROVIDER_REDACTED_KEY;
        }
      } catch (_) {}
    }

    mainModel = (document.getElementById('simpleOrModel')?.value || '').trim();
    if (!mainKey) {
      simpleShowStatus('orStatus', 'API key is required', 'var(--dn)');
      return;
    }
    if (!mainModel) {
      simpleShowStatus('orStatus', 'Pick or paste a model', 'var(--dn)');
      return;
    }
  }

  const statusKey = isOllama ? 'ollamaStatus' : 'orStatus';
  simpleShowStatus(statusKey, 'Saving...', 'var(--wn)');

  try {
    const cfg = isOllama
      ? { type: 'ollama', endpoint: mainEndpoint, model: mainModel }
      : { type: 'openrouter', endpoint: mainEndpoint, apiKey: mainKey, model: mainModel };
    const resp = await fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'main', config: cfg })
    });
    if (!resp.ok) throw new Error('Failed to save main provider');

    // Update local active config
    activeConfig = {
      type: mainType,
      endpoint: mainEndpoint,
      ...(typedKey ? { apiKey: typedKey } : {}),
      model: mainModel
    };

    // Sync savedConfig from server
    await refreshSavedConfig();

    if (!isOllama && keyEl) {
      keyEl.value = '';
      keyEl.dataset.hasStoredKey = 'true';
      keyEl.placeholder = 'Saved API key on file';
    }

    // On first setup, seed any unconfigured aspects with role-appropriate default models
    if (!isOllama && mainKey) {
      const profile = (savedConfig?.profiles?.[savedConfig?.lastActive]) || {};
      const aspectDefaults = [
        ['subconscious', OPENROUTER_ROLE_MODELS.subconscious.def],
        ['dream',        OPENROUTER_ROLE_MODELS.dream.def],
        ['orchestrator', OPENROUTER_ROLE_MODELS.orchestrator.def],
      ];
      let seeded = false;
      for (const [aspect, defaultModel] of aspectDefaults) {
        if (!profile[aspect]) {
          await fetch('/api/entity-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: aspect,
              config: { type: 'openrouter', endpoint: mainEndpoint, apiKey: mainKey, model: defaultModel }
            })
          }).catch(() => {});
          seeded = true;
        }
      }
      if (seeded) await refreshSavedConfig();
    }

    // Update provider UI
    const label = (isOllama ? 'Ollama' : 'OpenRouter') + ' (' + mainModel.split('/').pop() + ')';
    updateProviderUI(mainType, true, label);

    simpleShowStatus(statusKey, '✓ Connected — ' + mainModel, 'var(--em)');
    lg('ok', 'Main provider saved: ' + mainType + ' / ' + mainModel + ' (other roles inherit until customized)');

    if (isApiConfigured()) hideSetupRequired();
  } catch (e) {
    simpleShowStatus(statusKey, 'Error: ' + e.message, 'var(--dn)');
    lg('err', 'Config save failed: ' + e.message);
  }
}

function simpleShowStatus(suffix, text, color) {
  const el = document.getElementById('simple' + suffix.charAt(0).toUpperCase() + suffix.slice(1));
  if (el) {
    el.textContent = text;
    el.style.color = color || '';
  }
}
