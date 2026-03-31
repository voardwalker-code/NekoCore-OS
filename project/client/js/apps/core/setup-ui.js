// ── Services · Client Setup UI ───────────────────────────────────────────────
//
// HOW THE SETUP WIZARD WORKS:
// This module enforces provider configuration and runs the 3-step setup wizard:
// provider direction, pipeline model assignment, and skills selection. It then
// saves all aspect configs and opens the post-setup hatch flow.
//
// WHAT USES THIS:
//   first-run startup checks, setup overlays, and settings onboarding controls
//
// EXPORTS:
//   global setup/guard helpers used across app and settings modules
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS — setup-ui.js
// Owns: setup enforcement checks, setup wizard flow (3-step)
// Step 1: Provider direction + API key(s)
// Step 2: Pipeline configuration (all aspects with model selection)
// Step 3: Skills selection (4-column grid) + save
// Depends on globals from app.js: activeConfig, savedConfig, lg,
//   persistConfig, refreshSidebarEntities, addChatBubble, openWindow,
//   OPENROUTER_ROLE_MODELS, switchMainTab, setupActive, setupStep, setupData
// Depends on globals from auth.js: OPENROUTER_PRESET
// Depends on globals from config-profiles.js: RECOMMENDED_MODEL_STACKS,
//   OLLAMA_RECOMMENDED_STACKS, RECOMMENDED_PANEL_COPY
// ============================================================

// ============================================================
// SETUP ENFORCEMENT — Require API configuration before entity ops
// ============================================================
/** Return true when an active provider config is complete enough to use. */
function isApiConfigured() {
  if (!activeConfig || !activeConfig.model || !activeConfig.endpoint) return false;
  if (activeConfig.type === 'openrouter' || activeConfig.type === 'anthropic') {
    return !!activeConfig.apiKey;
  }
  return true;
}
/** Show modal prompting user to complete provider setup. */
function showSetupRequired() {
  const modal = document.getElementById('setupRequiredModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
}
/** Hide setup-required modal with close transition. */
function hideSetupRequired() {
  const modal = document.getElementById('setupRequiredModal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}
/** Jump settings UI to setup tab and preselect provider. */
function goToSetupTab(provider) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('on'));
  const settingsBtn = document.querySelector('.tab-btn:nth-child(3)');
  if (settingsBtn) settingsBtn.classList.add('on');
  document.getElementById('tab-settings').classList.add('on');
  setTimeout(() => {
    if (typeof simplePickProvider === 'function') simplePickProvider(provider);
  }, 100);
  hideSetupRequired();
}
/** Block entity operations until provider setup is complete. */
function guardEntityOperation(operationName) {
  if (!isApiConfigured()) {
    lg('err', 'API not configured. Please set up OpenRouter or Ollama first.');
    showSetupRequired();
    return false;
  }
  return true;
}

// ============================================================
// SETUP WIZARD — constants and state
// ============================================================

const SETUP_STEPS = {
  PROVIDER: 1,
  PIPELINE: 2,
  FINISH: 3
};

const SETUP_TOTAL_STEPS = 3;

const SETUP_ASPECTS = ['main', 'subconscious', 'dream', 'orchestrator', 'nekocore'];

const SETUP_ASPECT_LABELS = {
  main: 'Main Mind',
  subconscious: 'Background Processing',
  dream: 'Dream Engine',
  orchestrator: 'Orchestrator',
  nekocore: 'NekoCore & MA'
};

const SETUP_ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-6', l: 'Claude Opus 4.6 (strongest)' },
  { id: 'claude-sonnet-4-6', l: 'Claude Sonnet 4.6 (balanced)' },
  { id: 'claude-haiku-4-5', l: 'Claude Haiku 4.5 (fast/cheap)' }
];

const SETUP_ANTHROPIC_ASPECT_DEFAULTS = {
  main: 'claude-sonnet-4-6',
  subconscious: 'claude-haiku-4-5',
  dream: 'claude-sonnet-4-6',
  orchestrator: 'claude-sonnet-4-6',
  nekocore: 'claude-sonnet-4-6'
};

// Wizard state
let setupDirection = null;       // 'openrouter' | 'anthropic' | 'ollama' | 'hybrid'
let setupPrimaryKeys = { openrouter: '', anthropic: '', ollamaUrl: 'http://localhost:11434' };
let setupAspectProviders = {};   // per-aspect provider for hybrid mode
let setupAspectConfigs = {};
let setupSkillSelection = new Set();
let setupReadyAtMs = 0;
/** Populate OpenRouter model suggestions for one setup input. */
function applyOpenRouterModelSuggestions(fieldId, aspect = 'main') {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const rolePreset = OPENROUTER_ROLE_MODELS[aspect] || OPENROUTER_ROLE_MODELS.main;
  const models = rolePreset.models || OPENROUTER_PRESET.models;
  const defaultModel = rolePreset.def || OPENROUTER_PRESET.def;

  if (field.tagName === 'SELECT') {
    field.innerHTML = '';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.l;
      field.appendChild(opt);
    });
    field.value = defaultModel;
    return;
  }

  const listId = field.getAttribute('list');
  if (listId) {
    const list = document.getElementById(listId);
    if (list) {
      list.innerHTML = '';
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        if (m.l) opt.label = m.l;
        list.appendChild(opt);
      });
    }
  }
  field.placeholder = defaultModel + ' (or paste any OpenRouter model id)';
}

// ============================================================
// SETUP WIZARD — navigation
// ============================================================

/** Show setup overlay and initialize first-step UI state. */
function showSetupWizard() {
  const overlay = document.getElementById('setupOverlay');
  if (overlay) overlay.classList.add('active');
  setupActive = true;
  setupStep = SETUP_STEPS.PROVIDER;
  setupReadyAtMs = 0;
  setupDirection = null;
  setupPrimaryKeys = { openrouter: '', anthropic: '', ollamaUrl: 'http://localhost:11434' };
  setupAspectProviders = {};
  setupAspectConfigs = {};
  setupSkillSelection = new Set();
  setupData = { currentAspect: 'main', provider: null };
  updateSetupSteps(SETUP_STEPS.PROVIDER);
  // Reset direction button highlight
  ['openrouter', 'anthropic', 'ollama', 'hybrid'].forEach(d => {
    const btn = document.getElementById('setupDirBtn-' + d);
    if (btn) btn.classList.remove('selected');
  });
  const creds = document.getElementById('setupCredentials');
  if (creds) creds.style.display = 'none';
  // Reset card width
  const card = document.getElementById('setupCard');
  if (card) card.classList.remove('setup-card-wide');
  lg('info', 'Setup wizard opened');
}
/** Hide setup overlay and detach setup-only listeners. */
function hideSetupWizard() {
  const overlay = document.getElementById('setupOverlay');
  if (overlay) overlay.classList.remove('active');
  setupActive = false;
}
/** Mark setup steps as active/complete based on current index. */
function updateSetupSteps(step) {
  for (let i = 1; i <= SETUP_TOTAL_STEPS; i++) {
    const el = document.getElementById('setupStep' + i);
    if (!el) continue;
    el.className = 'setup-step' + (i < step ? ' done' : '') + (i === step ? ' active' : '');
  }
  for (let i = 1; i <= SETUP_TOTAL_STEPS; i++) {
    const panel = document.getElementById('setupPanel' + i);
    if (panel) panel.style.display = (i === step) ? 'block' : 'none';
  }
  // Widen card for pipeline and finish steps
  const card = document.getElementById('setupCard');
  if (card) card.classList.toggle('setup-card-wide', step >= SETUP_STEPS.PIPELINE);
}
/** Move setup workflow back to a previous step. */
function setupGoBack(toStep) {
  setupStep = toStep;
  updateSetupSteps(toStep);
  document.getElementById('setupStatus').textContent = '';
}

// ============================================================
// STEP 1: Provider Direction
// ============================================================

/** Select single-provider or hybrid setup direction. */
function setupPickDirection(direction) {
  setupDirection = direction;
  setupData.provider = direction === 'hybrid' ? null : direction;

  // Highlight active direction button
  ['openrouter', 'anthropic', 'ollama', 'hybrid'].forEach(d => {
    const btn = document.getElementById('setupDirBtn-' + d);
    if (btn) btn.classList.toggle('selected', d === direction);
  });

  // Show credential forms
  const creds = document.getElementById('setupCredentials');
  if (creds) creds.style.display = 'block';

  const types = ['openrouter', 'anthropic', 'ollama', 'hybrid'];
  types.forEach(t => {
    const el = document.getElementById('setupCred-' + t);
    if (el) el.style.display = 'none';
  });

  if (direction === 'hybrid') {
    document.getElementById('setupCred-hybrid').style.display = 'block';
    document.getElementById('setupTestBtn').textContent = 'Continue';
  } else {
    document.getElementById('setupCred-' + direction).style.display = 'block';
    document.getElementById('setupTestBtn').textContent = 'Test & Continue';
  }

  document.getElementById('setupStatus').textContent = '';
  lg('info', 'Provider direction: ' + direction);
}

async function setupTestAndContinue() {
  const statusEl = document.getElementById('setupStatus');
  if (!setupDirection) {
    statusEl.textContent = 'Please choose a provider first.';
    statusEl.style.color = 'var(--dn)';
    return;
  }

  // Gather primary keys from step 1
  if (setupDirection === 'hybrid') {
    setupPrimaryKeys.openrouter = (document.getElementById('setupHybridKeyOr')?.value || '').trim();
    setupPrimaryKeys.anthropic = (document.getElementById('setupHybridKeyAnthropic')?.value || '').trim();
    setupPrimaryKeys.ollamaUrl = (document.getElementById('setupHybridUrlOllama')?.value || 'http://localhost:11434').trim();
    // Initialize per-aspect providers based on which keys were provided
    const defaultHybrid = setupPrimaryKeys.openrouter ? 'openrouter'
      : setupPrimaryKeys.anthropic ? 'anthropic' : 'ollama';
    SETUP_ASPECTS.forEach(a => { setupAspectProviders[a] = defaultHybrid; });
    setupAdvanceToPipeline();
    return;
  }

  if (setupDirection === 'openrouter') {
    // key()
    const key = (document.getElementById('setupKeyOpenrouter')?.value || '').trim();
    if (!key) { statusEl.textContent = 'API key is required'; statusEl.style.color = 'var(--dn)'; return; }
    setupPrimaryKeys.openrouter = key;
    statusEl.textContent = 'Testing OpenRouter connection...';
    statusEl.style.color = 'var(--wn)';
    try {
      const resp = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: OPENROUTER_PRESET.ep,
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
          body: { model: 'openai/gpt-4o', messages: [{ role: 'user', content: 'Say "ok"' }], max_tokens: 5 }
        })
      });
      if (!resp.ok) { const t = await resp.text(); throw new Error('API ' + resp.status + ': ' + t.slice(0, 200)); }
      statusEl.textContent = 'Connected \u2713';
      statusEl.style.color = 'var(--em)';
    } catch (err) {
      statusEl.textContent = 'Connection failed: ' + err.message;
      statusEl.style.color = 'var(--dn)';
      return;
    }
  } else if (setupDirection === 'anthropic') {
    // key()
    const key = (document.getElementById('setupKeyAnthropic')?.value || '').trim();
    if (!key) { statusEl.textContent = 'API key is required'; statusEl.style.color = 'var(--dn)'; return; }
    setupPrimaryKeys.anthropic = key;
    statusEl.textContent = 'Testing Anthropic connection...';
    statusEl.style.color = 'var(--wn)';
    try {
      const resp = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://api.anthropic.com/v1/messages',
          method: 'POST',
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: { model: 'claude-sonnet-4-6', max_tokens: 16, messages: [{ role: 'user', content: 'Say "ok"' }] }
        })
      });
      if (!resp.ok) { const t = await resp.text(); throw new Error('API ' + resp.status + ': ' + t.slice(0, 200)); }
      statusEl.textContent = 'Connected \u2713 — prompt caching enabled';
      statusEl.style.color = 'var(--em)';
    } catch (err) {
      statusEl.textContent = 'Connection failed: ' + err.message;
      statusEl.style.color = 'var(--dn)';
      return;
    }
  } else if (setupDirection === 'ollama') {
    // url()
    const url = (document.getElementById('setupUrlOllama')?.value || 'http://localhost:11434').trim();
    setupPrimaryKeys.ollamaUrl = url;
    statusEl.textContent = 'Testing Ollama connection...';
    statusEl.style.color = 'var(--wn)';
    try {
      const resp = await fetch(url + '/api/tags');
      if (!resp.ok) throw new Error('Cannot reach Ollama at ' + url);
      statusEl.textContent = 'Connected \u2713';
      statusEl.style.color = 'var(--em)';
    } catch (err) {
      statusEl.textContent = 'Connection failed: ' + err.message;
      statusEl.style.color = 'var(--dn)';
      return;
    }
  }

  // Short delay so user sees success message, then advance
  setTimeout(() => setupAdvanceToPipeline(), 600);
}

// ============================================================
// STEP 2: Pipeline Configuration
// ============================================================

/** Advance setup from provider step to pipeline step. */
async function setupAdvanceToPipeline() {
  setupStep = SETUP_STEPS.PIPELINE;
  updateSetupSteps(SETUP_STEPS.PIPELINE);

  // Show hardware panel for Ollama/hybrid-with-ollama
  const useOllama = setupDirection === 'ollama' || (setupDirection === 'hybrid' && setupPrimaryKeys.ollamaUrl);
  const hwPanel = document.getElementById('setupHardwarePanel');
  if (hwPanel) hwPanel.style.display = useOllama ? 'block' : 'none';

  if (useOllama) {
    const statusEl = document.getElementById('setupStatus');
    if (statusEl) { statusEl.textContent = 'Fetching installed Ollama models...'; statusEl.style.color = 'var(--wn)'; }
    setupInstalledOllamaModels = await setupFetchInstalledOllamaModels();
    if (statusEl) statusEl.textContent = '';
  }

  setupPopulateModelLists();

  if (useOllama && setupInstalledOllamaModels.length > 0) {
    setupAutoSelectOllamaModels();
  } else if (!useOllama) {
    setupApplyPreset('best');
  }

  if (setupDirection === 'hybrid') setupShowHybridProviderPickers();
  document.getElementById('setupStatus').textContent = '';
}
/** Resolve selected provider for a given aspect. */
function setupGetAspectProvider(aspect) {
  if (setupDirection === 'hybrid') return setupAspectProviders[aspect] || 'openrouter';
  return setupDirection;
}
/** Refresh model datalists for all setup aspects. */
function setupPopulateModelLists() {
  SETUP_ASPECTS.forEach(aspect => {
    const provider = setupGetAspectProvider(aspect);
    setupPopulateModelListForAspect(aspect, provider);
  });
}
/** Refresh one aspect model list based on active provider. */
function setupPopulateModelListForAspect(aspect, provider) {
  const fieldId = 'setupAspectModel-' + aspect;
  const listId = 'setupModelList-' + aspect;
  const recEl = document.getElementById('setupRec-' + aspect);
  let field = document.getElementById(fieldId);
  const list = document.getElementById(listId);
  if (!field) return;

  if (provider === 'ollama') {
    // Swap <input> to <select> so users can only pick installed models
    if (field.tagName !== 'SELECT') {
      const select = document.createElement('select');
      select.id = fieldId;
      if (field.className) select.className = field.className;
      field.parentNode.replaceChild(select, field);
      field = select;
      if (list) list.style.display = 'none';
    }
    field.innerHTML = '';

    if (setupInstalledOllamaModels.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No models found — pull models in Ollama first';
      field.appendChild(opt);
      if (recEl) recEl.textContent = '(no models found)';
    } else {
      setupInstalledOllamaModels.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        const sizeInfo = setupOllamaModelDetails[m];
        opt.textContent = m + (sizeInfo ? ' (' + sizeInfo + ')' : '');
        field.appendChild(opt);
      });
      if (recEl) recEl.textContent = '(' + setupInstalledOllamaModels.length + ' model' + (setupInstalledOllamaModels.length === 1 ? '' : 's') + ' installed)';
    }
    return;
  }

  // Non-Ollama: ensure we have an <input> (in case it was swapped to <select>)
  if (field.tagName === 'SELECT') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = fieldId;
    if (field.className) input.className = field.className;
    input.placeholder = 'Select model...';
    input.setAttribute('list', listId);
    field.parentNode.replaceChild(input, field);
    field = input;
    if (list) list.style.display = '';
  }

  if (!list) return;
  list.innerHTML = '';

  if (provider === 'openrouter') {
    const rolePreset = OPENROUTER_ROLE_MODELS[aspect] || OPENROUTER_ROLE_MODELS.main;
    const models = rolePreset.models || [];
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      if (m.l) opt.label = m.l;
      list.appendChild(opt);
    });
    if (recEl) recEl.textContent = '(rec: ' + (rolePreset.def || '') + ')';
  } else if (provider === 'anthropic') {
    SETUP_ANTHROPIC_MODELS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      if (m.l) opt.label = m.l;
      list.appendChild(opt);
    });
    if (recEl) recEl.textContent = '(rec: ' + (SETUP_ANTHROPIC_ASPECT_DEFAULTS[aspect] || 'claude-sonnet-4-6') + ')';
  }
}

// ============================================================
// OLLAMA HARDWARE DETECTION + MODEL PULL
// ============================================================

let setupInstalledOllamaModels = []; // populated from /api/tags
let setupOllamaModelDetails = {};   // model name → size label (e.g. "3.6B Q4_K_M")

const OLLAMA_HW_TIERS = {
  low:    { label: 'Low-end',   models: { main: 'qwen2.5:1.5b', subconscious: 'qwen2.5:0.5b', dream: 'qwen2.5:0.5b', orchestrator: 'qwen2.5:1.5b', nekocore: 'qwen2.5:1.5b' } },
  medium: { label: 'Mid-range', models: { main: 'qwen2.5:3b',   subconscious: 'qwen2.5:1.5b', dream: 'qwen2.5:1.5b', orchestrator: 'qwen2.5:3b',   nekocore: 'qwen2.5:3b' } },
  high:   { label: 'High-end',  models: { main: 'qwen2.5:7b',   subconscious: 'qwen2.5:3b',   dream: 'qwen2.5:3b',   orchestrator: 'qwen2.5:7b',   nekocore: 'qwen2.5:7b' } },
  ultra:  { label: 'Ultra',     models: { main: 'qwen2.5:14b',  subconscious: 'qwen2.5:7b',   dream: 'qwen2.5:7b',   orchestrator: 'qwen2.5:14b',  nekocore: 'qwen2.5:14b' } }
};
/** Estimate local hardware tier from setup form values. */
function setupDetectHardwareTier() {
  const ram = parseInt(document.getElementById('setupHwRam')?.value || '0', 10);
  const gpu = document.getElementById('setupHwGpu')?.value || '';
  const vram = parseInt(document.getElementById('setupHwVram')?.value || '0', 10);

  if (!ram) return null;

  // Determine tier based on available memory for models
  // With dedicated GPU, VRAM is what matters most
  if (gpu === 'dedicated' && vram >= 16) return 'ultra';
  if (gpu === 'dedicated' && vram >= 8)  return 'high';
  if (gpu === 'dedicated' && vram >= 4)  return 'medium';
  // Integrated GPU or low VRAM — rely on system RAM
  if (ram >= 32) return 'high';
  if (ram >= 16) return 'medium';
  return 'low';
}

async function setupFetchInstalledOllamaModels() {
  const url = setupPrimaryKeys.ollamaUrl || 'http://localhost:11434';
  try {
    const resp = await fetch(url + '/api/tags');
    if (!resp.ok) return [];
    const data = await resp.json();
    const models = Array.isArray(data.models) ? data.models : [];
    setupOllamaModelDetails = {};
    return models.map(m => {
      const name = String(m.name || m.model || '').toLowerCase();
      const params = m.details?.parameter_size || '';
      const quant = m.details?.quantization_level || '';
      if (params || quant) setupOllamaModelDetails[name] = [params, quant].filter(Boolean).join(' ');
      return name;
    });
  } catch { return []; }
}
/** Re-fetch Ollama models and refresh all Ollama aspect dropdowns. */
async function setupRefreshOllamaModels() {
  const btn = document.getElementById('setupRefreshOllamaBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing...'; }
  setupInstalledOllamaModels = await setupFetchInstalledOllamaModels();
  SETUP_ASPECTS.forEach(aspect => {
    if (setupGetAspectProvider(aspect) === 'ollama') {
      setupPopulateModelListForAspect(aspect, 'ollama');
    }
  });
  if (btn) { btn.disabled = false; btn.textContent = 'Refresh Models'; }
}
/** Auto-select the best installed model for each Ollama aspect. */
function setupAutoSelectOllamaModels() {
  if (setupInstalledOllamaModels.length === 0) return;
  const best = typeof OLLAMA_RECOMMENDED_STACKS !== 'undefined' ? OLLAMA_RECOMMENDED_STACKS.best : null;
  SETUP_ASPECTS.forEach(aspect => {
    if (setupGetAspectProvider(aspect) !== 'ollama') return;
    const el = document.getElementById('setupAspectModel-' + aspect);
    if (!el) return;
    const recommended = best ? (best[aspect] || best.main || '') : '';
    if (recommended && setupIsModelInstalled(recommended)) {
      el.value = setupInstalledOllamaModels.find(m => m === recommended.toLowerCase() || m.startsWith(recommended.toLowerCase() + ':')) || setupInstalledOllamaModels[0];
    } else {
      el.value = setupInstalledOllamaModels[0];
    }
  });
}
/** Check whether a model id exists in locally installed models list. */
function setupIsModelInstalled(modelName) {
  const needle = modelName.toLowerCase();
  return setupInstalledOllamaModels.some(m => m === needle || m.startsWith(needle + ':') || needle.startsWith(m.split(':')[0] + ':'));
}
/** Apply auto-selected preset based on detected hardware tier. */
function setupApplyHardwareRecommendation() {
  const tier = setupDetectHardwareTier();
  if (!tier) {
    const statusEl = document.getElementById('setupStatus');
    if (statusEl) { statusEl.textContent = 'Please fill in your RAM at minimum.'; statusEl.style.color = 'var(--dn)'; }
    return;
  }

  const hwTier = OLLAMA_HW_TIERS[tier];
  const stack = hwTier.models;
  const missingModels = [];

  SETUP_ASPECTS.forEach(aspect => {
    const el = document.getElementById('setupAspectModel-' + aspect);
    if (!el) return;
    const model = stack[aspect] || stack.main;
    if (setupIsModelInstalled(model)) {
      const exact = setupInstalledOllamaModels.find(m => m === model.toLowerCase() || m.startsWith(model.toLowerCase() + ':'));
      el.value = exact || setupInstalledOllamaModels[0] || '';
    } else {
      el.value = setupInstalledOllamaModels[0] || '';
      if (model) missingModels.push(model);
    }
  });

  const descEl = document.getElementById('setupPresetDesc');
  if (descEl) descEl.textContent = hwTier.label + ' hardware detected — models chosen to fit your system.';

  ['best', 'fast', 'cheap', 'balanced'].forEach(k => {
    const btn = document.getElementById('setupPreset-' + k);
    if (btn) btn.classList.remove('on');
  });

  setupShowOllamaModelStatus(stack);
  if (missingModels.length > 0) setupShowRecommendedPullList([...new Set(missingModels)]);
}

async function setupShowOllamaModelStatus(stack) {
  const panel = document.getElementById('setupOllamaModelStatus');
  const listHost = document.getElementById('setupOllamaModelList');
  const descEl = document.getElementById('setupOllamaModelDesc');
  if (!panel || !listHost) return;

  panel.style.display = 'block';
  if (descEl) descEl.textContent = 'Checking installed models...';

  setupInstalledOllamaModels = await setupFetchInstalledOllamaModels();

  // Collect unique models from the recommended stack
  const uniqueModels = [...new Set(Object.values(stack))];
  const installed = uniqueModels.filter(m => setupIsModelInstalled(m));
  const missing = uniqueModels.filter(m => !setupIsModelInstalled(m));

  if (descEl) {
    if (missing.length === 0) {
      descEl.textContent = 'All recommended models are installed!';
    } else {
      descEl.textContent = installed.length + ' installed, ' + missing.length + ' need pulling.';
    }
  }

  listHost.innerHTML = '';
  for (const model of uniqueModels) {
    const isInst = setupIsModelInstalled(model);
    const row = document.createElement('div');
    row.className = 'setup-model-row';
    row.innerHTML = '<span class="model-name">' + model + '</span>'
      + (isInst
        ? '<span class="model-status installed">&#10003; Installed</span>'
        : '<span class="model-status missing">Not installed</span>'
          + '<button class="btn-pull" onclick="setupPullOllamaModel(this,\'' + model.replace(/'/g, "\\'") + '\')">Pull</button>');
    listHost.appendChild(row);
  }

  // Refresh all Ollama select dropdowns with latest installed models
  if (setupInstalledOllamaModels.length > 0) {
    SETUP_ASPECTS.forEach(aspect => {
      if (setupGetAspectProvider(aspect) === 'ollama') {
        const prev = document.getElementById('setupAspectModel-' + aspect)?.value || '';
        setupPopulateModelListForAspect(aspect, 'ollama');
        const el = document.getElementById('setupAspectModel-' + aspect);
        if (el && prev && setupIsModelInstalled(prev)) el.value = prev;
      }
    });
  }
}

async function setupPullOllamaModel(btnEl, modelName) {
  const url = setupPrimaryKeys.ollamaUrl || 'http://localhost:11434';
  btnEl.disabled = true;
  btnEl.textContent = 'Pulling...';

  const statusSpan = btnEl.previousElementSibling;

  try {
    const resp = await fetch(url + '/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText.slice(0, 200));
    }
    // Pull succeeded
    btnEl.style.display = 'none';
    if (statusSpan) { statusSpan.className = 'model-status installed'; statusSpan.innerHTML = '&#10003; Installed'; }
    setupInstalledOllamaModels.push(modelName.toLowerCase());
    // Re-populate select dropdowns with the newly pulled model
    SETUP_ASPECTS.forEach(aspect => {
      if (setupGetAspectProvider(aspect) === 'ollama') {
        const prev = document.getElementById('setupAspectModel-' + aspect)?.value || '';
        setupPopulateModelListForAspect(aspect, 'ollama');
        const el = document.getElementById('setupAspectModel-' + aspect);
        if (el && prev) el.value = prev;
      }
    });
  } catch (err) {
    btnEl.disabled = false;
    btnEl.textContent = 'Retry';
    if (statusSpan) statusSpan.textContent = 'Failed: ' + err.message.slice(0, 60);
  }
}
/** Apply one named setup preset into current aspect controls. */
function setupApplyPreset(presetKey) {
  const provider = setupDirection === 'hybrid' ? 'openrouter' : setupDirection;
  let stack;

  if (provider === 'openrouter') {
    stack = (typeof RECOMMENDED_MODEL_STACKS !== 'undefined' && RECOMMENDED_MODEL_STACKS[presetKey]) || null;
  } else if (provider === 'ollama') {
    stack = (typeof OLLAMA_RECOMMENDED_STACKS !== 'undefined' && OLLAMA_RECOMMENDED_STACKS[presetKey]) || null;
  } else if (provider === 'anthropic') {
    const tiers = {
      best: { main: 'claude-opus-4-6', subconscious: 'claude-sonnet-4-6', dream: 'claude-sonnet-4-6', orchestrator: 'claude-sonnet-4-6', nekocore: 'claude-sonnet-4-6' },
      fast: { main: 'claude-sonnet-4-6', subconscious: 'claude-haiku-4-5', dream: 'claude-haiku-4-5', orchestrator: 'claude-sonnet-4-6', nekocore: 'claude-sonnet-4-6' },
      cheap: { main: 'claude-haiku-4-5', subconscious: 'claude-haiku-4-5', dream: 'claude-haiku-4-5', orchestrator: 'claude-haiku-4-5', nekocore: 'claude-haiku-4-5' },
      hybrid: { main: 'claude-sonnet-4-6', subconscious: 'claude-haiku-4-5', dream: 'claude-sonnet-4-6', orchestrator: 'claude-sonnet-4-6', nekocore: 'claude-sonnet-4-6' }
    };
    stack = tiers[presetKey] || tiers.best;
  }

  if (stack) {
    const isOllama = provider === 'ollama';
    const missingModels = [];
    SETUP_ASPECTS.forEach(aspect => {
      const el = document.getElementById('setupAspectModel-' + aspect);
      if (!el) return;
      const model = stack[aspect] || stack.main || '';
      if (isOllama) {
        if (setupIsModelInstalled(model)) {
          const exact = setupInstalledOllamaModels.find(m => m === model.toLowerCase() || m.startsWith(model.toLowerCase() + ':'));
          el.value = exact || setupInstalledOllamaModels[0] || '';
        } else {
          el.value = setupInstalledOllamaModels[0] || '';
          if (model) missingModels.push(model);
        }
      } else {
        el.value = model;
      }
    });
    if (isOllama && missingModels.length > 0) {
      setupShowRecommendedPullList([...new Set(missingModels)]);
    }
  }

  // Highlight active preset button
  ['best', 'fast', 'cheap', 'balanced'].forEach(k => {
    const btn = document.getElementById('setupPreset-' + k);
    if (btn) btn.classList.toggle('on', k === presetKey || (k === 'balanced' && presetKey === 'hybrid'));
  });

  // Show preset description
  const descEl = document.getElementById('setupPresetDesc');
  if (descEl) {
    const provKey = (provider === 'ollama') ? 'ollama' : 'openrouter';
    const copy = (typeof RECOMMENDED_PANEL_COPY !== 'undefined' && RECOMMENDED_PANEL_COPY[provKey]) || {};
    descEl.textContent = copy[presetKey] || '';
  }
}
/** Show panel listing recommended models that need to be pulled. */
function setupShowRecommendedPullList(missingModels) {
  let panel = document.getElementById('setupOllamaRecommendedPull');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'setupOllamaRecommendedPull';
    panel.className = 'setup-aspect-card';
    panel.style.marginBottom = 'var(--space-3)';
    const hwPanel = document.getElementById('setupHardwarePanel');
    if (hwPanel) hwPanel.appendChild(panel);
    else return;
  }
  if (missingModels.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  panel.innerHTML = '<div class="setup-aspect-header" style="margin-bottom:var(--space-2)">'
    + '<span class="setup-aspect-icon">&#128229;</span>'
    + '<div><div class="setup-aspect-name">Recommended Models to Pull</div>'
    + '<div class="setup-aspect-desc">These models are recommended for this preset but not installed yet.</div></div></div>';
  missingModels.forEach(model => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)';
    row.innerHTML = '<span style="font-size:13px">' + model + '</span>'
      + '<button class="btn-pull" onclick="setupPullOllamaModel(this,\'' + model.replace(/'/g, "\\'") + '\')">Pull</button>';
    panel.appendChild(row);
  });
}
/** Toggle visibility of per-aspect provider selectors in hybrid mode. */
function setupShowHybridProviderPickers() {
  SETUP_ASPECTS.forEach(aspect => {
    const container = document.querySelector('.setup-aspect-card[data-aspect="' + aspect + '"] .setup-aspect-provider-pick');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = '<div class="flex gap-1 mb-2" style="flex-wrap:wrap">'
      + '<button class="setup-mini-provider-btn' + (setupAspectProviders[aspect] === 'openrouter' ? ' on' : '') + '" onclick="setupPickAspectProvider(\'' + aspect + '\',\'openrouter\',this)">OR</button>'
      + '<button class="setup-mini-provider-btn' + (setupAspectProviders[aspect] === 'anthropic' ? ' on' : '') + '" onclick="setupPickAspectProvider(\'' + aspect + '\',\'anthropic\',this)">Ant</button>'
      + '<button class="setup-mini-provider-btn' + (setupAspectProviders[aspect] === 'ollama' ? ' on' : '') + '" onclick="setupPickAspectProvider(\'' + aspect + '\',\'ollama\',this)">Oll</button>'
      + '</div>';
  });
}
/** Set provider for one aspect and refresh dependent controls. */
function setupPickAspectProvider(aspect, provider, btnEl) {
  setupAspectProviders[aspect] = provider;
  // Highlight active button
  const container = btnEl.closest('.setup-aspect-provider-pick');
  container.querySelectorAll('.setup-mini-provider-btn').forEach(b => b.classList.remove('on'));
  btnEl.classList.add('on');
  // Repopulate model list for this aspect
  setupPopulateModelListForAspect(aspect, provider);
  // Clear current model value
  const el = document.getElementById('setupAspectModel-' + aspect);
  if (el) el.value = '';
}
/** Validate pipeline selections and continue to final setup step. */
function setupAdvanceToFinish() {
  // Validate at least main has a model
  const mainModel = (document.getElementById('setupAspectModel-main')?.value || '').trim();
  const statusEl = document.getElementById('setupStatus');
  if (!mainModel) {
    statusEl.textContent = 'Please select a model for Main Mind at minimum.';
    statusEl.style.color = 'var(--dn)';
    return;
  }

  setupStep = SETUP_STEPS.FINISH;
  setupReadyAtMs = Date.now();
  updateSetupSteps(SETUP_STEPS.FINISH);
  setupBuildFinalSummary();
  setupRefreshSkillSummary();
  statusEl.textContent = '';
}
/** Build final setup summary card from current form selections. */
function setupBuildFinalSummary() {
  const host = document.getElementById('setupFinalSummary');
  if (!host) return;
  let html = '';
  SETUP_ASPECTS.forEach(aspect => {
    // model()
    // Purpose: helper wrapper used by this module's main flow.
    const model = (document.getElementById('setupAspectModel-' + aspect)?.value || '').trim();
    const provider = setupGetAspectProvider(aspect);
    const label = SETUP_ASPECT_LABELS[aspect] || aspect;
    const displayModel = model ? model.split('/').pop() : '(same as main)';
    html += '<div class="summary-row">' + label + ': <strong>' + provider + '</strong> \u2014 ' + displayModel + '</div>';
  });
  host.innerHTML = html;
}

// ============================================================
// STEP 3: Skills & Finish
// ============================================================

/** Render enabled-skill summary for the finish step. */
function setupRenderSkillSummary(skills) {
  const host = document.getElementById('setupSkillSummary');
  if (!host) return;
  if (!Array.isArray(skills) || skills.length === 0) {
    host.textContent = 'No skills detected.';
    return;
  }

  // 4-column grid layout
  host.className = 'setup-skill-grid text-xs-c text-secondary-c';
  host.innerHTML = skills.map((skill) => {
    const name = String(skill?.name || 'Unnamed skill');
    const checked = setupSkillSelection.has(name) ? ' checked' : '';
    return '<label class="setup-skill-item">'
      + '<input type="checkbox" data-setup-skill="' + name.replace(/"/g, '&quot;') + '"' + checked + '>'
      + ' ' + name
      + '</label>';
  }).join('');

  host.querySelectorAll('input[data-setup-skill]').forEach((el) => {
    el.addEventListener('change', () => {
      const skillName = el.getAttribute('data-setup-skill') || '';
      if (!skillName) return;
      if (el.checked) setupSkillSelection.add(skillName);
      else setupSkillSelection.delete(skillName);
    });
  });
}

async function setupFetchNekoTooling() {
  const resp = await fetch('/api/nekocore/tooling');
  if (!resp.ok) throw new Error('Failed to load tooling');
  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || 'Failed to load tooling');
  return data;
}

async function setupRefreshSkillSummary() {
  try {
    const tooling = await setupFetchNekoTooling();
    setupRenderSkillSummary(tooling.skills || []);
  } catch (_) {
    setupRenderSkillSummary([]);
  }
}

async function setupDisableAllNekoSkills() {
  try {
    const tooling = await setupFetchNekoTooling();
    // enabled()
    // Purpose: helper wrapper used by this module's main flow.
    const enabled = (tooling.skills || []).filter((skill) => !!skill.enabled);
    for (const skill of enabled) {
      await fetch('/api/nekocore/tooling/skill-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skill.name, enabled: false })
      });
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function setupApplySelectedNekoSkills() {
  try {
    await setupDisableAllNekoSkills();
    if (setupSkillSelection.size === 0) return true;
    for (const skillName of setupSkillSelection) {
      await fetch('/api/nekocore/tooling/skill-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skillName, enabled: true })
      });
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function setupEnsureDefaultWorkspace() {
  try {
    const resp = await fetch('/api/nekocore/tooling/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoDefault: true })
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return !!data.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Build a config object for an aspect from wizard state.
 * Uses the primary API key from step 1, or per-aspect override if provided.
 */
/** Build normalized provider config object for one setup aspect. */
function setupBuildAspectConfig(aspect) {
  const provider = setupGetAspectProvider(aspect);
  const model = (document.getElementById('setupAspectModel-' + aspect)?.value || '').trim();
  const overrideKey = (document.getElementById('setupAspectKey-' + aspect)?.value || '').trim();

  const config = { type: provider, model: model };

  if (provider === 'openrouter') {
    config.endpoint = OPENROUTER_PRESET.ep;
    config.apiKey = overrideKey || setupPrimaryKeys.openrouter;
  } else if (provider === 'anthropic') {
    config.endpoint = 'https://api.anthropic.com/v1/messages';
    config.apiKey = overrideKey || setupPrimaryKeys.anthropic;
  } else {
    config.endpoint = setupPrimaryKeys.ollamaUrl || 'http://localhost:11434';
  }

  return config;
}

/**
 * Finalize setup: save all aspect configs and open NekoCore OS
 */
async function setupFinish() {
  const statusEl = document.getElementById('setupStatus');
  const btn = document.getElementById('setupFinishBtn');

  if (setupStep !== SETUP_STEPS.FINISH) return;
  if (setupReadyAtMs && (Date.now() - setupReadyAtMs) < 450) {
    statusEl.textContent = 'Review your configuration, then click Save & Open.';
    statusEl.style.color = 'var(--wn)';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  statusEl.textContent = 'Saving LLM configurations...';
  statusEl.style.color = 'var(--wn)';

  try {
    // Build configs for all profile aspects (main, sub, dream, orch)
    const mainCfg = setupBuildAspectConfig('main');
    if (!mainCfg.model) throw new Error('Main Mind model is required');
    if (mainCfg.type !== 'ollama' && !mainCfg.apiKey) throw new Error('API key is required for Main Mind');

    const subCfg = setupBuildAspectConfig('subconscious');
    const dreamCfg = setupBuildAspectConfig('dream');
    const orchCfg = setupBuildAspectConfig('orchestrator');
    const nekocoreCfg = setupBuildAspectConfig('nekocore');

    // Fill empty models with main's model as fallback
    if (!subCfg.model) { subCfg.model = mainCfg.model; subCfg.type = mainCfg.type; subCfg.endpoint = mainCfg.endpoint; subCfg.apiKey = mainCfg.apiKey; }
    if (!dreamCfg.model) { dreamCfg.model = mainCfg.model; dreamCfg.type = mainCfg.type; dreamCfg.endpoint = mainCfg.endpoint; dreamCfg.apiKey = mainCfg.apiKey; }
    if (!orchCfg.model) { orchCfg.model = mainCfg.model; orchCfg.type = mainCfg.type; orchCfg.endpoint = mainCfg.endpoint; orchCfg.apiKey = mainCfg.apiKey; }
    if (!nekocoreCfg.model) { nekocoreCfg.model = mainCfg.model; nekocoreCfg.type = mainCfg.type; nekocoreCfg.endpoint = mainCfg.endpoint; nekocoreCfg.apiKey = mainCfg.apiKey; }

    const profileName = savedConfig.lastActive || 'default-multi-llm';
    const existing = savedConfig.profiles[profileName] || {};
    const profile = {
      ...existing,
      main: mainCfg,
      subconscious: subCfg,
      dream: dreamCfg,
      orchestrator: orchCfg,
      ma: { ...nekocoreCfg }
    };

    profile._activeType = mainCfg.type;
    profile._activeTypes = {
      main: mainCfg.type,
      subconscious: subCfg.type,
      dream: dreamCfg.type,
      orchestrator: orchCfg.type,
      ma: nekocoreCfg.type
    };

    // Set legacy fields for backward compatibility
    if (mainCfg.type === 'openrouter') {
      profile.apikey = { endpoint: mainCfg.endpoint, key: mainCfg.apiKey, model: mainCfg.model };
      delete profile.ollama;
    } else if (mainCfg.type === 'ollama') {
      profile.ollama = { url: mainCfg.endpoint, model: mainCfg.model };
      delete profile.apikey;
    } else if (mainCfg.type === 'anthropic') {
      delete profile.apikey;
      delete profile.ollama;
    }

    savedConfig.profiles[profileName] = profile;
    savedConfig.lastActive = profileName;
    await persistConfig();

    // Save NekoCore config separately via entity-config endpoint
    try {
      await fetch('/api/entity-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'nekocore', config: nekocoreCfg })
      });
    } catch (_) { /* best effort */ }

    // Auto-provision a default workspace path so first-time users can use tools immediately.
    await setupEnsureDefaultWorkspace();
    // Skills default OFF; apply only user-selected skills from setup.
    await setupApplySelectedNekoSkills();

    // Set main provider as active for UI
    if (mainCfg.type === 'openrouter') {
      activeConfig = { type: 'openrouter', endpoint: mainCfg.endpoint, apiKey: mainCfg.apiKey, model: mainCfg.model };
      updateProviderUI('openrouter', true, 'OpenRouter (' + mainCfg.model.split('/').pop() + ')');
    } else if (mainCfg.type === 'anthropic') {
      activeConfig = { type: 'anthropic', endpoint: mainCfg.endpoint, apiKey: mainCfg.apiKey, model: mainCfg.model };
      updateProviderUI('anthropic', true, 'Anthropic (' + mainCfg.model + ')');
    } else {
      activeConfig = { type: 'ollama', endpoint: mainCfg.endpoint, model: mainCfg.model };
      updateProviderUI('ollama', true, 'Ollama (' + mainCfg.model + ')');
    }

    hideSetupWizard();
    lg('ok', 'All pipeline stages configured and saved.');

    // Flag to auto-open Welcome tab after first setup (backup for page-reload case)
    try { localStorage.setItem('nk-show-welcome', '1'); } catch (_) {}

    showHatchScreen();

    // Open Welcome tab directly — boot.js already ran so the flag won't be read until reload
    setTimeout(() => {
      try {
        localStorage.removeItem('nk-show-welcome');
        if (typeof switchMainTab === 'function') switchMainTab('welcome');
      } catch (_) {}
    }, 350);

    refreshSidebarEntities();
  } catch (err) {
    statusEl.textContent = 'Setup failed: ' + err.message;
    statusEl.style.color = 'var(--dn)';
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Retry';
    }
    lg('err', 'Setup error: ' + err.message);
  }
}
/** Open hatch flow and continue onboarding after setup submit. */
function showHatchScreen() {
  openWindow('nekocore');
  const fr = document.getElementById('nekocore-panel-frame');
  if (!fr) return;
  // dispatch()
  // Purpose: helper wrapper used by this module's main flow.
  const dispatch = () => {
    try {
      fr.contentWindow && fr.contentWindow.postMessage({ type: 'nk_focus_voice' }, '*');
    } catch (_) {}
  };
  if (fr.getAttribute('src')) {
    setTimeout(dispatch, 100);
  } else {
    fr.addEventListener('load', () => setTimeout(dispatch, 100), { once: true });
  }
}

// ============================================================
// USER NAME MODAL
// ============================================================

async function checkAndPromptUserName() {
  try {
    // knownAccountName()
    // Purpose: helper wrapper used by this module's main flow.
    const knownAccountName = (typeof getDisplayName === 'function' && getDisplayName())
      || (typeof getUsername === 'function' && getUsername())
      || '';
    if (knownAccountName) {
      return false;
    }

    // If entity already has user profiles, the new user switcher handles identity — skip old modal
    if (currentEntityId) {
      const usersResp = await fetch('/api/users');
      if (usersResp.ok) {
        const usersData = await usersResp.json();
        if (usersData.ok && Array.isArray(usersData.users) && usersData.users.length > 0) {
          return false;
        }
      }
    }

    const resp = await fetch('/api/persona');
    if (!resp.ok) return;
    
    const data = await resp.json();
    const persona = data.persona;
    
    // If no persona or userName is still default 'User', prompt for name
    if (!persona || !persona.userName || persona.userName === 'User') {
      showUserNameModal();
      return true; // Indicates name prompt was shown
    }
    return false;
  } catch (err) {
    console.error('Failed to check user name:', err);
    return false;
  }
}
/** Show modal requesting an initial display name. */
function showUserNameModal() {
  const modal = document.getElementById('userNameModal');
  modal.style.display = 'flex';
  modal.classList.add('open');
  
  // Focus on input
  setTimeout(() => {
    const input = document.getElementById('userNameInput');
    input.focus();
    
    // Allow Enter key to submit
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveUserName();
      }
    };
  }, 300);
}
/** Close and reset username modal controls. */
function closeUserNameModal() {
  const modal = document.getElementById('userNameModal');
  modal.classList.remove('open');
  setTimeout(() => modal.style.display = 'none', 200);
  document.getElementById('userNameInput').value = '';
}

async function saveUserName() {
  const input = document.getElementById('userNameInput');
  const name = input.value.trim();
  
  if (!name) {
    lg('err', 'Please enter your name');
    return;
  }
  
  try {
    // Get current persona
    const getResp = await fetch('/api/persona');
    let persona = { userName: 'User' };
    if (getResp.ok) {
      const getData = await getResp.json();
      if (getData.persona) persona = getData.persona;
    }
    
    // Update userName
    persona.userName = name;
    persona.userIdentity = persona.userIdentity || `I am chatting with ${name}`;
    
    // Save persona
    const saveResp = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persona)
    });
    
    if (!saveResp.ok) throw new Error('Failed to save persona');
    
    closeUserNameModal();
    lg('ok', `Nice to meet you, ${name}!`);
    addChatBubble('system', `✨ Got it! I'll remember you as ${name} from now on.`);
  } catch (err) {
    lg('err', 'Failed to save name: ' + err.message);
  }
}
/** Skip username capture and continue onboarding. */
function skipUserName() {
  closeUserNameModal();
  lg('info', 'You can set your name later in settings');
}
