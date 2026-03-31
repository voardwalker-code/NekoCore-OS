// ── Services · Client Simple Provider UI ────────────────────────────────────
//
// HOW SIMPLE PROVIDER SETUP WORKS:
// This module drives the lightweight provider setup panel. It lets users pick
// OpenRouter/Anthropic/Ollama, apply presets, validate required fields, and
// save per-aspect provider configs through `/api/entity-config`.
//
// WHAT USES THIS:
//   Settings provider panel — buttons and selects call these helpers
//
// EXPORTS:
//   global setup/helper functions in browser scope
// ─────────────────────────────────────────────────────────────────────────────

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
/** Return stored OpenRouter config from active profile/legacy fallbacks. */
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
/** Check whether an OpenRouter key already exists in saved config. */
function _simpleHasStoredOpenRouterKey() {
  const stored = _getSimpleStoredOpenRouterConfig();
  const key = String(stored?.apiKey || stored?.key || '').trim();
  return !!key;
}
/** Initialize simple provider UI controls and hydrate saved values. */
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
        } else if (mainCfg.type === 'anthropic') {
          simplePickProvider('anthropic');
          const keyEl = document.getElementById('simpleAnthropicKey');
          const modelEl = document.getElementById('simpleAnthropicModel');
          if (keyEl && mainCfg.apiKey) keyEl.value = mainCfg.apiKey;
          if (modelEl && mainCfg.model) modelEl.value = mainCfg.model;
          // Hydrate capability toggles from saved profile
          if (profile.capabilities) _hydrateCapabilityToggles(profile.capabilities);
        } else {
          simplePickProvider('openrouter');
          const keyEl = document.getElementById('simpleOrKey');
          const modelEl = document.getElementById('simpleOrModel');
          if (keyEl && mainCfg.apiKey) keyEl.value = mainCfg.apiKey;
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

  _initCapabilityToggles();
}
/** Switch visible provider panel. */
function simplePickProvider(provider) {
  simpleActiveProvider = provider;
  const orBtn = document.getElementById('simpleProviderBtn-openrouter');
  const antBtn = document.getElementById('simpleProviderBtn-anthropic');
  const olBtn = document.getElementById('simpleProviderBtn-ollama');
  const orPanel = document.getElementById('simplePanel-openrouter');
  const antPanel = document.getElementById('simplePanel-anthropic');
  const olPanel = document.getElementById('simplePanel-ollama');
  if (orBtn) orBtn.classList.toggle('on', provider === 'openrouter');
  if (antBtn) antBtn.classList.toggle('on', provider === 'anthropic');
  if (olBtn) olBtn.classList.toggle('on', provider === 'ollama');
  if (orPanel) orPanel.style.display = provider === 'openrouter' ? '' : 'none';
  if (antPanel) antPanel.style.display = provider === 'anthropic' ? '' : 'none';
  if (olPanel) olPanel.style.display = provider === 'ollama' ? '' : 'none';
}
/** Apply recommended model stack to simple provider fields. */
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
  const isAnthropic = simpleActiveProvider === 'anthropic';
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
  } else if (isAnthropic) {
    mainType = 'anthropic';
    mainEndpoint = 'https://api.anthropic.com/v1/messages';
    keyEl = document.getElementById('simpleAnthropicKey');
    mainKey = (keyEl?.value || '').trim();

    mainModel = (document.getElementById('simpleAnthropicModel')?.value || '').trim();
    if (!mainKey) {
      simpleShowStatus('anthropicStatus', 'API key is required', 'var(--dn)');
      return;
    }
    if (!mainModel) {
      simpleShowStatus('anthropicStatus', 'Pick or paste a model', 'var(--dn)');
      return;
    }
  } else {
    mainType = 'openrouter';
    mainEndpoint = OPENROUTER_PRESET.ep;
    keyEl = document.getElementById('simpleOrKey');
    mainKey = (keyEl?.value || '').trim();

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

  const statusKey = isOllama ? 'ollamaStatus' : (isAnthropic ? 'anthropicStatus' : 'orStatus');
  simpleShowStatus(statusKey, 'Saving...', 'var(--wn)');

  try {
    let cfg;
    if (isOllama) {
      cfg = { type: 'ollama', endpoint: mainEndpoint, model: mainModel };
    } else if (isAnthropic) {
      cfg = { type: 'anthropic', endpoint: mainEndpoint, apiKey: mainKey, model: mainModel,
        capabilities: _readCapabilityToggles() };
    } else {
      cfg = { type: 'openrouter', endpoint: mainEndpoint, apiKey: mainKey, model: mainModel };
    }
    const resp = await fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'main', config: cfg })
    });
    if (!resp.ok) throw new Error('Failed to save main provider');

    // Save per-stage model overrides
    const stageFields = [
      ['subconscious', 'simpleAdvSub'],
      ['dream',        'simpleAdvDream'],
      ['orchestrator', 'simpleAdvOrch'],
    ];
    for (const [aspect, fieldId] of stageFields) {
      const val = (document.getElementById(fieldId)?.value || '').trim();
      if (!val) continue;
      // Build config inheriting connection details from main, override model only
      const stCfg = { type: mainType, endpoint: mainEndpoint, model: val };
      if (mainKey) stCfg.apiKey = mainKey;
      await fetch('/api/entity-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aspect, config: stCfg })
      });
    }

    // Update local active config
    activeConfig = {
      type: mainType,
      endpoint: mainEndpoint,
      ...(mainKey ? { apiKey: mainKey } : {}),
      model: mainModel
    };

    // Sync savedConfig from server
    await refreshSavedConfig();

    // On first setup, seed any unconfigured aspects with role-appropriate default models
    if (!isOllama && !isAnthropic && mainKey) {
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

    // For Anthropic: seed other aspects with the same Anthropic config (no OpenRouter model presets)
    if (isAnthropic && mainKey) {
      const profile = (savedConfig?.profiles?.[savedConfig?.lastActive]) || {};
      let seeded = false;
      for (const aspect of ['subconscious', 'dream', 'orchestrator']) {
        if (!profile[aspect]) {
          await fetch('/api/entity-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: aspect,
              config: { type: 'anthropic', endpoint: mainEndpoint, apiKey: mainKey, model: mainModel }
            })
          }).catch(() => {});
          seeded = true;
        }
      }
      if (seeded) await refreshSavedConfig();
    }

    // Update provider UI
    const providerLabel = isOllama ? 'Ollama' : (isAnthropic ? 'Anthropic' : 'OpenRouter');
    const label = providerLabel + ' (' + mainModel.split('/').pop() + ')';
    updateProviderUI(mainType, true, label);

    simpleShowStatus(statusKey, '✓ Connected — ' + mainModel, 'var(--em)');
    lg('ok', 'Main provider saved: ' + mainType + ' / ' + mainModel + ' (other roles inherit until customized)');

    if (isApiConfigured()) hideSetupRequired();
  } catch (e) {
    simpleShowStatus(statusKey, 'Error: ' + e.message, 'var(--dn)');
    lg('err', 'Config save failed: ' + e.message);
  }
}
/** Update provider panel status text by suffix key. */
function simpleShowStatus(suffix, text, color) {
  const el = document.getElementById('simple' + suffix.charAt(0).toUpperCase() + suffix.slice(1));
  if (el) {
    el.textContent = text;
    el.style.color = color || '';
  }
}

// ============================================================
// CAPABILITY TOGGLES (Anthropic-specific)
// ============================================================

/** Initialize Anthropic capability toggle interactions. */
function _initCapabilityToggles() {
  const thinkingCb = document.getElementById('capExtendedThinking');
  const budgetRow = document.getElementById('capThinkingBudgetRow');
  if (thinkingCb && budgetRow) {
    thinkingCb.addEventListener('change', () => {
      budgetRow.style.display = thinkingCb.checked ? '' : 'none';
    });
  }
}
/** Read Anthropic capability toggles into payload object. */
function _readCapabilityToggles() {
  const extCache = document.getElementById('capExtendedCache');
  const compact = document.getElementById('capCompaction');
  const memTool = document.getElementById('capMemoryTool');
  const thinking = document.getElementById('capExtendedThinking');
  const budget = document.getElementById('capThinkingBudget');
  if (compact) {
    compact.checked = false;
    compact.disabled = true;
  }
  return {
    extendedCache: extCache ? extCache.checked : true,
    compaction: false,
    memoryTool: memTool ? memTool.checked : true,
    extendedThinking: thinking ? thinking.checked : false,
    thinkingBudget: budget ? parseInt(budget.value, 10) || 4096 : 4096
  };
}
/** Hydrate Anthropic capability toggles from saved values. */
function _hydrateCapabilityToggles(caps) {
  if (!caps || typeof caps !== 'object') return;
  const extCache = document.getElementById('capExtendedCache');
  const compact = document.getElementById('capCompaction');
  const memTool = document.getElementById('capMemoryTool');
  const thinking = document.getElementById('capExtendedThinking');
  const budget = document.getElementById('capThinkingBudget');
  const budgetLabel = document.getElementById('capThinkingBudgetLabel');
  const budgetRow = document.getElementById('capThinkingBudgetRow');

  if (extCache && caps.extendedCache !== undefined) extCache.checked = !!caps.extendedCache;
  if (compact) {
    compact.checked = false;
    compact.disabled = true;
  }
  if (memTool && caps.memoryTool !== undefined) memTool.checked = !!caps.memoryTool;
  if (thinking && caps.extendedThinking !== undefined) thinking.checked = !!caps.extendedThinking;
  if (budget && caps.thinkingBudget) {
    budget.value = String(caps.thinkingBudget);
    if (budgetLabel) budgetLabel.textContent = String(caps.thinkingBudget);
  }
  if (budgetRow) budgetRow.style.display = (thinking && thinking.checked) ? '' : 'none';
}
