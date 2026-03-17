// ============================================================
// NekoCore OS — setup-ui.js
// Extracted from app.js (P3-S7)
// Owns: setup enforcement checks, setup wizard flow, user-name modal
// Depends on globals from app.js: activeConfig, savedConfig, lg, updateProviderUI,
//   persistConfig, refreshSidebarEntities, addChatBubble, openWindow,
//   OPENROUTER_ROLE_MODELS, switchMainTab
// Depends on globals from auth.js: OPENROUTER_PRESET
// ============================================================

// ============================================================
// SETUP ENFORCEMENT — Require API configuration before entity ops
// ============================================================
function isApiConfigured() {
  if (!activeConfig || !activeConfig.model || !activeConfig.endpoint) return false;
  // OpenRouter requires API key, Ollama does not
  if (activeConfig.type === 'openrouter') {
    return !!activeConfig.apiKey;
  }
  // Ollama only needs endpoint and model
  return true;
}

function showSetupRequired() {
  const modal = document.getElementById('setupRequiredModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
}

function hideSetupRequired() {
  const modal = document.getElementById('setupRequiredModal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

function goToSetupTab(provider) {
  // Switch to Settings tab
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('on'));
  
  const settingsBtn = document.querySelector('.tab-btn:nth-child(3)');
  if (settingsBtn) {
    settingsBtn.classList.add('on');
  }
  document.getElementById('tab-settings').classList.add('on');
  
  // Switch to the requested provider tab
  setTimeout(() => {
    if (provider === 'openrouter') {
      const btn = document.querySelector('[onclick="showProviderTab(\'main\', this)"]');
      if (btn) btn.click();
      const tabBtn = document.querySelector('[onclick="switchTab(\'openrouter-main\', this)"]');
      if (tabBtn) tabBtn.click();
    } else if (provider === 'ollama') {
      const btn = document.querySelector('[onclick="showProviderTab(\'main\', this)"]');
      if (btn) btn.click();
      const tabBtn = document.querySelector('[onclick="switchTab(\'ollama-main\', this)"]');
      if (tabBtn) tabBtn.click();
    }
  }, 100);
  
  // Hide the setup modal
  hideSetupRequired();
}

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
  MAIN: 1,
  READY: 2
};

const LLM_ROLES = {
  main: 'Main Mind (Conscious)',
  subconscious: 'Subconscious',
  dream: 'Dream Engine'
};

// Store configs for onboarding.
let setupAspectConfigs = {
  main: null
};

function applyOpenRouterModelSuggestions(fieldId, aspect = 'main') {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const rolePreset = OPENROUTER_ROLE_MODELS[aspect] || OPENROUTER_ROLE_MODELS.main;
  const models = rolePreset.models || OPENROUTER_PRESET.models;
  const defaultModel = rolePreset.def || OPENROUTER_PRESET.def;

  // Support legacy <select> and new <input list=...> fields.
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

  // Hint that custom model IDs are supported.
  field.placeholder = defaultModel + ' (or paste any OpenRouter model id)';
}

// ============================================================
// SETUP WIZARD — flow functions
// ============================================================

function showSetupWizard() {
  const overlay = document.getElementById('setupOverlay');
  if (overlay) overlay.classList.add('active');
  setupActive = true;
  setupStep = SETUP_STEPS.MAIN;
  setupAspectConfigs = { main: null };
  setupData = { currentAspect: 'main', provider: null };
  updateSetupSteps(SETUP_STEPS.MAIN);
  lg('info', 'Setup wizard opened — connect the Main Mind first');
}

function hideSetupWizard() {
  const overlay = document.getElementById('setupOverlay');
  if (overlay) overlay.classList.remove('active');
  setupActive = false;
}

function updateSetupSteps(step) {
  for (let i = 1; i <= 2; i++) {
    const el = document.getElementById('setupStep' + i);
    if (!el) continue;
    el.className = 'setup-step' + (i < step ? ' done' : '') + (i === step ? ' active' : '');
  }
  for (let i = 1; i <= 2; i++) {
    const panel = document.getElementById('setupPanel' + i);
    if (panel) panel.style.display = (i === step) ? 'block' : 'none';
  }
}

/**
 * Setup a single LLM aspect (main, subconscious, or dream)
 */
function setupSelectProviderForAspect(aspect, type) {
  setupData.currentAspect = aspect;
  setupData.provider = type;
  
  // Determine form suffixes based on aspect
  let suffix = aspect === 'main' ? '' : (aspect === 'subconscious' ? '2' : '3');
  
  // Hide all provider section containers (use exact IDs to avoid hiding child inputs)
  ['setupOpenrouter', 'setupOpenrouter2', 'setupOpenrouter3'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  ['setupOllama', 'setupOllama2', 'setupOllama3'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  
  const orSectionId = 'setupOpenrouter' + suffix;
  const olSectionId = 'setupOllama' + suffix;
  const orSection = document.getElementById(orSectionId);
  const olSection = document.getElementById(olSectionId);

  if (type === 'openrouter') {
    if (orSection) {
      orSection.style.display = 'block';
      applyOpenRouterModelSuggestions('setupOrModel' + suffix, aspect);
    }
  } else {
    if (olSection) olSection.style.display = 'block';
  }

  // Show the config section
  const configSection = document.querySelector('#setupPanel1 .setup-config-section');
  if (configSection) configSection.style.display = 'block';

  document.getElementById('setupStatus').textContent = '';
  lg('info', 'Configuring ' + LLM_ROLES[aspect] + '...');
}

/**
 * Test and save config for current LLM aspect
 */
async function setupTestConnectionForAspect() {
  const statusEl = document.getElementById('setupStatus');
  const aspect = setupData.currentAspect;
  statusEl.textContent = 'Testing connection for ' + LLM_ROLES[aspect] + '...';
  statusEl.style.color = 'var(--wn)';

  try {
    let config = null;
    let suffix = aspect === 'main' ? '' : (aspect === 'subconscious' ? '2' : '3');

    if (setupData.provider === 'openrouter') {
      const keyId = 'setupOrKey' + suffix;
      const modelId = 'setupOrModel' + suffix;
      
      const key = document.getElementById(keyId).value.trim();
      const model = document.getElementById(modelId).value;
      if (!key) { 
        statusEl.textContent = 'API key is required'; 
        statusEl.style.color = 'var(--dn)'; 
        return; 
      }

      // Test with a minimal request
      const resp = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: OPENROUTER_PRESET.ep,
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
          body: { model, messages: [{ role: 'user', content: 'Say "ok"' }], max_tokens: 5 }
        })
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error('API returned ' + resp.status + ': ' + errText.slice(0, 200));
      }

      config = {
        type: 'openrouter',
        endpoint: OPENROUTER_PRESET.ep,
        key: key,
        model: model
      };

      statusEl.textContent = LLM_ROLES[aspect] + ' connected (' + model.split('/').pop() + ')';
      statusEl.style.color = 'var(--em)';

    } else {
      // Ollama
      const urlId = 'setupOllamaUrl' + suffix;
      const modelId = 'setupOllamaModel' + suffix;
      
      const url = document.getElementById(urlId).value.trim() || 'http://localhost:11434';
      const model = document.getElementById(modelId).value.trim() || 'llama3';

      const resp = await fetch(url + '/api/tags');
      if (!resp.ok) throw new Error('Cannot reach Ollama at ' + url);
      const data = await resp.json();
      const models = (data.models || []).map(m => m.name);

      config = {
        type: 'ollama',
        ollamaUrl: url,
        ollamaModel: model
      };

      statusEl.textContent = LLM_ROLES[aspect] + ' connected (' + model + ')';
      statusEl.style.color = 'var(--em)';
    }

    // Save to aspect-specific config
    setupAspectConfigs[aspect] = config;
    lg('ok', LLM_ROLES[aspect] + ' configured successfully');

    // Move to next step
    advanceSetupStep();

  } catch (err) {
    statusEl.textContent = 'Connection failed: ' + err.message;
    statusEl.style.color = 'var(--dn)';
    lg('err', 'Setup test failed: ' + err.message);
  }
}

/**
 * Advance to next setup step
 */
function advanceSetupStep() {
  setupStep = SETUP_STEPS.READY;
  updateSetupSteps(SETUP_STEPS.READY);
  updateSetupSummary();
  document.getElementById('setupStatus').textContent = '';
}

/**
 * Clear form fields for the next setup aspect
 */
function clearSetupFormFields() {
  const suffix = '';
  
  const keyInputId = 'setupOrKey' + suffix;
  const modelSelectId = 'setupOrModel' + suffix;
  const urlInputId = 'setupOllamaUrl' + suffix;
  const ollamaModelId = 'setupOllamaModel' + suffix;
  
  const keyInput = document.getElementById(keyInputId);
  const modelSelect = document.getElementById(modelSelectId);
  const urlInput = document.getElementById(urlInputId);
  const ollamaModel = document.getElementById(ollamaModelId);
  
  if (keyInput) keyInput.value = '';
  if (urlInput) urlInput.value = 'http://localhost:11434';
  if (ollamaModel) ollamaModel.value = 'llama3';
  
  // Hide provider section containers (use exact IDs to avoid hiding child inputs)
  ['setupOpenrouter', 'setupOpenrouter2', 'setupOpenrouter3'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  ['setupOllama', 'setupOllama2', 'setupOllama3'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  
  // Hide config section
  const configSection = document.querySelector('#setupPanel1 .setup-config-section');
  if (configSection) configSection.style.display = 'none';
}

/**
 * Update the summary display before hatch
 */
function updateSetupSummary() {
  const summaryMain = document.getElementById('setupSummaryMain');
  
  if (summaryMain && setupAspectConfigs.main) {
    const model = (setupAspectConfigs.main.model || setupAspectConfigs.main.ollamaModel || '').split('/').pop();
    summaryMain.textContent = setupAspectConfigs.main.type + ' (' + model + ')';
  }
}

/**
 * Get the LLM aspect for a given setup step
 */
function getAspectForStep(step) {
  return step === SETUP_STEPS.READY ? 'main' : 'main';
}

/**
 * Go back to previous setup step
 */
function previousSetupStep() {
  if (setupStep > SETUP_STEPS.MAIN) {
    setupStep--;
    updateSetupSteps(setupStep);
    document.getElementById('setupStatus').textContent = '';
  }
}

/**
 * Finalize setup: save all configs and hatch entity
 */
async function setupFinish() {
  const statusEl = document.getElementById('setupStatus');
  const btn = document.querySelector('#setupPanel' + SETUP_STEPS.READY + ' .btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }
  statusEl.textContent = 'Saving LLM configurations...';
  statusEl.style.color = 'var(--wn)';

  try {
    const mainConfig = setupAspectConfigs.main;
    if (!mainConfig) throw new Error('Main provider config is missing');

    const profileName = savedConfig.lastActive || 'default-multi-llm';
    const existing = savedConfig.profiles[profileName] || {};
    const profile = {
      ...existing,
      main: mainConfig,
      _activeType: mainConfig.type,
      _activeTypes: {
        ...(existing._activeTypes || {}),
        main: mainConfig.type
      }
    };

    if (mainConfig.type === 'openrouter') {
      profile.apikey = {
        endpoint: mainConfig.endpoint,
        key: mainConfig.key,
        model: mainConfig.model
      };
    } else if (mainConfig.type === 'ollama') {
      profile.ollama = {
        url: mainConfig.ollamaUrl,
        model: mainConfig.ollamaModel
      };
    }

    savedConfig.profiles[profileName] = profile;
    savedConfig.lastActive = profileName;
    await persistConfig();

    // Set main provider as active for UI
    const m = setupAspectConfigs.main;
    if (m.type === 'openrouter') {
      activeConfig = { type: 'openrouter', endpoint: m.endpoint, apiKey: m.key, model: m.model };
      updateProviderUI('openrouter', true, 'OpenRouter (' + m.model.split('/').pop() + ')');
    } else {
      activeConfig = { type: 'ollama', endpoint: m.ollamaUrl, model: m.ollamaModel };
      updateProviderUI('ollama', true, 'Ollama (' + m.ollamaModel + ')');
    }

    hideSetupWizard();
    lg('ok', 'Main provider saved. Advanced roles will inherit it until you customize them later.');

    showHatchScreen();

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

function showHatchScreen() {
  openWindow('nekocore');
  const fr = document.getElementById('nekocore-panel-frame');
  if (!fr) return;
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

function skipUserName() {
  closeUserNameModal();
  lg('info', 'You can set your name later in settings');
}
