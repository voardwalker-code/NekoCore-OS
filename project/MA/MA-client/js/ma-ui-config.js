// MA UI — Config panel, whitelist management, Ollama model management, API key masking.
async function checkConfig() {
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.configured) {
      statusDot.classList.add('ok');
      statusTxt.textContent = `${d.type}/${d.model}`;
    } else {
      statusTxt.textContent = d.hasFile ? 'Needs API key' : 'Not configured';
      addSystem('No LLM configured. Click ⚙ to set up.');
      // Pre-fill from existing config if file exists
      if (d.endpoint) document.getElementById('cfg-endpoint').value = d.endpoint;
      if (d.model) document.getElementById('cfg-model').value = d.model;
      if (d.hasApiKey) setMaskedCfgKey();
      if (d.type) {
        document.getElementById('cfg-type').value = d.type;
        document.getElementById('cfg-type').dispatchEvent(new Event('change'));
      }
      if (d.maxTokens) { document.getElementById('cfg-tokens').value = d.maxTokens; document.getElementById('cfg-tokens-val').textContent = d.maxTokens; }
    }
  } catch (e) {
    statusTxt.textContent = 'Offline';
    addSystem('Cannot reach server.');
  }
}

function setMaskedCfgKey() {
  const keyEl = document.getElementById('cfg-key');
  const toggleEl = document.getElementById('cfg-key-toggle');
  if (!keyEl) return;
  keyEl.type = 'password';
  keyEl.value = MA_MASKED_KEY;
  keyEl.dataset.hasStoredKey = 'true';
  keyEl.dataset.revealed = 'false';
  if (toggleEl) toggleEl.textContent = 'See';
}

function clearCfgKeyMaskState() {
  const keyEl = document.getElementById('cfg-key');
  const toggleEl = document.getElementById('cfg-key-toggle');
  if (!keyEl) return;
  if (keyEl.value !== MA_MASKED_KEY) {
    keyEl.dataset.revealed = 'false';
    if (toggleEl) toggleEl.textContent = 'See';
  }
}

async function toggleCfgKeyVisibility() {
  const keyEl = document.getElementById('cfg-key');
  const toggleEl = document.getElementById('cfg-key-toggle');
  if (!keyEl || !toggleEl) return;

  const isRevealed = keyEl.dataset.revealed === 'true';
  const hasStoredKey = keyEl.dataset.hasStoredKey === 'true';

  if (isRevealed) {
    keyEl.type = 'password';
    if (hasStoredKey) {
      keyEl.value = MA_MASKED_KEY;
    }
    keyEl.dataset.revealed = 'false';
    toggleEl.textContent = 'See';
    return;
  }

  if (hasStoredKey) {
    try {
      const r = await fetch('/api/config?revealKey=1');
      const d = await r.json();
      if (d && d.apiKey) {
        keyEl.type = 'text';
        keyEl.value = d.apiKey;
        keyEl.dataset.revealed = 'true';
        toggleEl.textContent = 'Hide';
        return;
      }
    } catch (_) {}
  }

  keyEl.type = 'text';
  keyEl.dataset.revealed = 'true';
  toggleEl.textContent = 'Hide';
}

// ── Config ────────────────────────────────────────────────────────────────
function toggleConfig() {
  cfgPanel.classList.toggle('show');
  if (!cfgPanel.classList.contains('show')) setRailActive('rail-' + currentInspector);
}

function getThinkingBudgetRequirement() {
  const type = document.getElementById('cfg-type').value;
  const thinkingEnabled = document.getElementById('cap-thinking').checked;
  if (type !== 'anthropic' || !thinkingEnabled) return 0;
  return Math.max(1024, parseInt(document.getElementById('cap-thinking-budget').value, 10) || 4096);
}

function syncThinkingBudgetUi() {
  const tokensEl = document.getElementById('cfg-tokens');
  const tokensValEl = document.getElementById('cfg-tokens-val');
  const hintEl = document.getElementById('cfg-tokens-hint');
  const budgetRowEl = document.getElementById('thinking-budget-row');
  const budgetValEl = document.getElementById('cap-thinking-val');
  const requiredMin = getThinkingBudgetRequirement();

  budgetValEl.textContent = document.getElementById('cap-thinking-budget').value;
  budgetRowEl.style.display = requiredMin > 0 ? '' : 'none';
  tokensEl.min = String(requiredMin || 1024);

  if ((parseInt(tokensEl.value, 10) || 12288) < (requiredMin || 1024)) {
    tokensEl.value = String(requiredMin || 1024);
  }
  tokensValEl.textContent = tokensEl.value;

  if (requiredMin > 0) {
    hintEl.textContent = `Anthropic extended thinking requires Max Tokens >= ${requiredMin}.`;
    hintEl.style.color = 'var(--accent)';
  } else {
    hintEl.textContent = '20% of Max Tokens is reserved for MA\'s reply.';
    hintEl.style.color = 'var(--dim)';
  }
}

async function openConfig(defaultTab) {
  if (cfgPanel.classList.contains('show')) {
    cfgPanel.classList.remove('show');
    setRailActive('rail-' + currentInspector);
    return;
  }
  setRailActive(defaultTab === 'whitelist' ? 'rail-whitelist' : 'rail-settings');
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.type) document.getElementById('cfg-type').value = d.type;
    if (d.endpoint) document.getElementById('cfg-endpoint').value = d.endpoint;
    if (d.model) document.getElementById('cfg-model').value = d.model;
    const keyEl = document.getElementById('cfg-key');
    if (keyEl) {
      if (d.hasApiKey) setMaskedCfgKey();
      else {
        keyEl.value = '';
        keyEl.dataset.hasStoredKey = 'false';
        keyEl.dataset.revealed = 'false';
        keyEl.type = 'password';
        const toggleEl = document.getElementById('cfg-key-toggle');
        if (toggleEl) toggleEl.textContent = 'See';
      }
    }
    if (d.maxTokens) { document.getElementById('cfg-tokens').value = d.maxTokens; document.getElementById('cfg-tokens-val').textContent = d.maxTokens; }
    document.getElementById('cfg-vision').checked = d.vision === true;
    if (d.workspacePath) document.getElementById('cfg-workspace').value = d.workspacePath;
    // Hydrate theme dropdown with current choice
    document.getElementById('cfg-theme').value = localStorage.getItem(THEME_KEY) || 'system';
    // Hydrate memory controls
    const memLimit = d.memoryLimit || 6;
    document.getElementById('cfg-mem-limit').value = memLimit;
    document.getElementById('cfg-mem-limit-val').textContent = memLimit;
    document.getElementById('cfg-mem-recall').checked = d.memoryRecall !== false;
    // Hydrate Auto Pilot from localStorage
    document.getElementById('cfg-autopilot').checked = isAutoPilot();
    // Hydrate capabilities toggles
    if (d.capabilities) {
      const c = d.capabilities;
      document.getElementById('cap-cache').checked = c.extendedCache !== false;
      document.getElementById('cap-compaction').checked = c.compaction === true || c.compaction === 'api' || c.compaction === 'prompt';
      document.getElementById('cap-thinking').checked = c.extendedThinking === true;
      if (c.thinkingBudget) {
        document.getElementById('cap-thinking-budget').value = c.thinkingBudget;
        document.getElementById('cap-thinking-val').textContent = c.thinkingBudget;
      }
      document.getElementById('cap-native-tools').checked = c.nativeToolUse !== false;
    }
    document.getElementById('cfg-type').dispatchEvent(new Event('change'));
    syncThinkingBudgetUi();
  } catch (_) {}
  cfgPanel.classList.add('show');
  switchCfgTab(defaultTab === 'whitelist' ? 'whitelist' : 'llm');
}

async function saveConfig() {
  syncThinkingBudgetUi();
  const type = document.getElementById('cfg-type').value;
  const keyEl = document.getElementById('cfg-key');
  const rawKey = keyEl ? keyEl.value.trim() : '';
  const hasStoredKey = keyEl?.dataset.hasStoredKey === 'true';
  const normalizedKey = (rawKey && rawKey !== MA_MASKED_KEY) ? rawKey : (hasStoredKey ? '' : rawKey);
  const body = {
    type,
    endpoint: document.getElementById('cfg-endpoint').value.trim(),
    apiKey: normalizedKey,
    model: document.getElementById('cfg-model').value.trim(),
    maxTokens: parseInt(document.getElementById('cfg-tokens').value, 10) || 12288,
    vision: document.getElementById('cfg-vision').checked,
    workspacePath: document.getElementById('cfg-workspace').value.trim(),
    memoryLimit: parseInt(document.getElementById('cfg-mem-limit').value, 10) || 6,
    memoryRecall: document.getElementById('cfg-mem-recall').checked
  };

  // Apply theme choice (client-side only)
  applyTheme(document.getElementById('cfg-theme').value);

  // Save Auto Pilot (client-side only)
  setAutoPilot(document.getElementById('cfg-autopilot').checked);

  // Include capabilities for Anthropic
  if (type === 'anthropic') {
    body.capabilities = {
      extendedCache: document.getElementById('cap-cache').checked,
      compaction: document.getElementById('cap-compaction').checked,
      extendedThinking: document.getElementById('cap-thinking').checked,
      thinkingBudget: parseInt(document.getElementById('cap-thinking-budget').value, 10) || 4096,
      nativeToolUse: document.getElementById('cap-native-tools').checked
    };
  }

  if (!body.endpoint || !body.model) { alert('Need endpoint and model'); return; }

  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (d.ok) {
      toggleConfig();
      statusDot.classList.add('ok');
      statusTxt.textContent = `${body.type}/${body.model}`;
      if (keyEl && type !== 'ollama') setMaskedCfgKey();
      addSystem('LLM configured. Ready to chat.');
    } else {
      alert('Save failed: ' + (d.error || 'unknown'));
    }
  } catch (e) {
    alert('Save error: ' + e.message);
  }
}

document.getElementById('cfg-key').addEventListener('input', clearCfgKeyMaskState);

// Pre-fill defaults
document.getElementById('cfg-endpoint').value = 'https://openrouter.ai/api/v1/chat/completions';
document.getElementById('cfg-model').value = 'anthropic/claude-sonnet-4';

// ── Config Tab Switching ────────────────────────────────────────────────
function switchCfgTab(tab) {
  document.querySelectorAll('.cfg-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.cfg-pane').forEach(p => p.classList.remove('active'));
  if (tab === 'llm') {
    document.querySelector('.cfg-tab:nth-child(1)').classList.add('active');
    document.getElementById('cfg-llm').classList.add('active');
    if (cfgPanel.classList.contains('show')) setRailActive('rail-settings');
  } else {
    document.querySelector('.cfg-tab:nth-child(2)').classList.add('active');
    document.getElementById('cfg-whitelist').classList.add('active');
    if (cfgPanel.classList.contains('show')) setRailActive('rail-whitelist');
    wlLoad();
  }
}

// ── Whitelist Management ────────────────────────────────────────────────
async function wlLoad() {
  try {
    const r = await fetch('/api/whitelist');
    const wl = await r.json();
    const el = document.getElementById('wl-list');
    if (!Object.keys(wl).length) { el.innerHTML = '<p style="color:var(--dim);padding:8px">No commands whitelisted.</p>'; return; }
    el.innerHTML = Object.entries(wl).map(([bin, subs]) =>
      `<div class="wl-item"><span class="wl-bin">${bin}</span><span class="wl-subs">${subs ? subs.join(', ') : '(all)'}</span><button onclick="wlRemove('${bin}')">✕</button></div>`
    ).join('');
  } catch (e) { console.error('whitelist load:', e); }
}

async function wlAdd() {
  const bin = document.getElementById('wl-bin').value.trim();
  if (!bin) { alert('Enter a binary name'); return; }
  const subsRaw = document.getElementById('wl-subs').value.trim();
  const subs = subsRaw ? subsRaw.split(',').map(s => s.trim()).filter(Boolean) : null;
  try {
    const r = await fetch('/api/whitelist/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ binary: bin, subcommands: subs }) });
    const d = await r.json();
    if (d.error) { alert(d.error); return; }
    document.getElementById('wl-bin').value = '';
    document.getElementById('wl-subs').value = '';
    wlLoad();
  } catch (e) { alert('Error: ' + e.message); }
}

async function wlRemove(bin) {
  try {
    await fetch('/api/whitelist/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ binary: bin }) });
    wlLoad();
  } catch (e) { alert('Error: ' + e.message); }
}

async function wlReset() {
  if (!confirm('Reset command whitelist to defaults?')) return;
  try {
    await fetch('/api/whitelist/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    wlLoad();
  } catch (e) { alert('Error: ' + e.message); }
}

// ── Ollama Model Management ─────────────────────────────────────────────
document.getElementById('cfg-type').addEventListener('change', function() {
  const type = this.value;
  const isOllama = type === 'ollama';
  const isAnthropic = type === 'anthropic';
  document.getElementById('model-text-wrap').style.display = isOllama ? 'none' : '';
  document.getElementById('model-ollama-wrap').style.display = isOllama ? '' : 'none';

  // Capabilities section visibility
  const capsSection = document.getElementById('caps-section');
  const capsToggles = document.getElementById('caps-toggles');
  const capsNotice = document.getElementById('caps-notice');

  if (isAnthropic) {
    capsSection.style.display = '';
    capsToggles.style.display = '';
    capsNotice.style.display = 'none';
    // Default endpoint
    const ep = document.getElementById('cfg-endpoint');
    if (!ep.value || ep.value.includes('openrouter.ai') || ep.value.includes('localhost')) {
      ep.value = 'https://api.anthropic.com/v1/messages';
    }
    // Populate Anthropic model datalist
    const dl = document.getElementById('cfg-model-datalist');
    dl.innerHTML = '<option value="claude-opus-4-6"><option value="claude-sonnet-4-6"><option value="claude-haiku-4-5">';
  } else if (type === 'openrouter') {
    capsSection.style.display = '';
    capsToggles.style.display = 'none';
    capsNotice.style.display = '';
    capsNotice.textContent = 'Advanced capabilities like extended thinking and native tool use are available with Anthropic Direct.';
    const ep = document.getElementById('cfg-endpoint');
    if (!ep.value || ep.value.includes('anthropic.com') || ep.value.includes('localhost')) {
      ep.value = 'https://openrouter.ai/api/v1/chat/completions';
    }
    document.getElementById('cfg-model-datalist').innerHTML = '';
  } else {
    // Ollama
    capsSection.style.display = '';
    capsToggles.style.display = 'none';
    capsNotice.style.display = '';
    capsNotice.textContent = 'Advanced capabilities like prompt caching and extended thinking are available with Anthropic Direct.';
    const ep = document.getElementById('cfg-endpoint');
    if (!ep.value || ep.value.includes('openrouter.ai') || ep.value.includes('anthropic.com')) {
      ep.value = 'http://localhost:11434';
    }
    document.getElementById('cfg-model-datalist').innerHTML = '';
    loadOllamaModels();
  }

  syncThinkingBudgetUi();
});

// Thinking toggle visibility
document.getElementById('cap-thinking').addEventListener('change', function() {
  syncThinkingBudgetUi();
});

document.getElementById('cap-thinking-budget').addEventListener('input', syncThinkingBudgetUi);
document.getElementById('cfg-tokens').addEventListener('input', syncThinkingBudgetUi);

async function loadOllamaModels() {
  const endpoint = document.getElementById('cfg-endpoint').value.trim();
  if (!endpoint) return;
  const sel = document.getElementById('cfg-model-select');
  sel.innerHTML = '<option value="">Loading...</option>';
  sel.disabled = true;
  try {
    const r = await fetch('/api/ollama/models?endpoint=' + encodeURIComponent(endpoint));
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    const models = d.models || [];
    sel.innerHTML = '<option value="">-- select a model (' + models.length + ' available) --</option>';
    for (const m of models) {
      const sizeGB = m.size ? (m.size / 1073741824).toFixed(1) + ' GB' : '';
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name + (sizeGB ? ' (' + sizeGB + ')' : '');
      sel.appendChild(opt);
    }
    const cur = document.getElementById('cfg-model').value;
    if (cur) sel.value = cur;
  } catch (e) {
    sel.innerHTML = '<option value="">Could not reach Ollama</option>';
    document.getElementById('model-info').textContent = e.message;
  }
  sel.disabled = false;
}

async function onOllamaModelSelect() {
  const sel = document.getElementById('cfg-model-select');
  const model = sel.value;
  const info = document.getElementById('model-info');
  document.getElementById('cfg-model').value = model;
  if (!model) { info.textContent = ''; return; }
  const endpoint = document.getElementById('cfg-endpoint').value.trim();
  info.textContent = 'Fetching model info...';
  try {
    const r = await fetch('/api/ollama/show', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, model })
    });
    const d = await r.json();
    if (d.error) { info.textContent = ''; return; }
    const parts = [];
    if (d.family) parts.push(d.family);
    if (d.parameterSize) parts.push(d.parameterSize);
    if (d.quantization) parts.push(d.quantization);
    if (d.contextLength) {
      parts.push('context: ' + d.contextLength.toLocaleString());
      const tok = Math.min(d.contextLength, 65536);
      document.getElementById('cfg-tokens').value = tok;
      document.getElementById('cfg-tokens-val').textContent = tok;
    }
    info.textContent = parts.length ? parts.join(' \u00B7 ') : '';
  } catch (_) { info.textContent = ''; }
}

async function pullOllamaModel() {
  const nameEl = document.getElementById('cfg-pull-name');
  const model = nameEl.value.trim();
  if (!model) { alert('Enter a model name to pull'); return; }
  const endpoint = document.getElementById('cfg-endpoint').value.trim();
  if (!endpoint) { alert('Enter an Ollama endpoint first'); return; }
  const status = document.getElementById('pull-status');
  status.textContent = 'Pulling ' + model + '... this may take a while';
  status.style.color = 'var(--accent)';
  try {
    const r = await fetch('/api/ollama/pull', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, model })
    });
    const d = await r.json();
    if (d.error) {
      status.textContent = 'Pull failed: ' + d.error;
      status.style.color = 'var(--err)';
    } else {
      status.textContent = model + ' pulled successfully';
      status.style.color = 'var(--ma)';
      nameEl.value = '';
      loadOllamaModels();
    }
  } catch (e) {
    status.textContent = 'Pull error: ' + e.message;
    status.style.color = 'var(--err)';
  }
}

// ── Memory Ingest Panel ───────────────────────────────────────────────────

let _ingestAbort = null;

function toggleIngestPanel() {
  const panel = document.getElementById('ingest-panel');
  if (!panel) return;
  panel.classList.toggle('show');
  if (panel.classList.contains('show')) loadArchivesList();
}

async function loadArchivesList() {
  const el = document.getElementById('ingest-archives-list');
  if (!el) return;
  try {
    const r = await fetch('/api/memory/archives');
    const archives = await r.json();
    const keys = Object.keys(archives);
    if (!keys.length) { el.textContent = 'No archives yet.'; return; }
    el.innerHTML = '';
    for (const name of keys) {
      const a = archives[name];
      const row = document.createElement('div');
      row.className = 'archive-row';
      row.innerHTML = '<strong>' + escHtml(name) + '</strong> — ' +
        a.fileCount + ' files, ' + a.chunkCount + ' chunks' +
        '<br><span style="color:var(--dim);font-size:11px">' + (a.ingestedAt || '').slice(0, 16) + '</span>';
      el.appendChild(row);
    }
  } catch (_) { el.textContent = 'Could not load archives.'; }
}

function _openIngestProgress(label) {
  const overlay = document.getElementById('ingest-progress-overlay');
  overlay.classList.add('show');
  document.getElementById('ingest-prog-label').textContent = label;
  document.getElementById('ingest-prog-pct').textContent = '';
  const fill = document.getElementById('ingest-prog-fill');
  fill.style.width = '0%';
  fill.className = 'ingest-prog-fill';
  document.getElementById('ingest-prog-detail').textContent = '';
  document.getElementById('ingest-prog-log').innerHTML = '';
  const errEl = document.getElementById('ingest-prog-error');
  errEl.textContent = '';
  errEl.classList.add('hidden');
  document.getElementById('ingest-kill-btn').classList.remove('hidden');
  document.getElementById('ingest-close-btn').classList.add('hidden');
  // hide the ingest setup panel behind the progress overlay
  document.getElementById('ingest-panel').classList.remove('show');
}

function _updateIngestProgress(info) {
  const pct = info.total > 0 ? Math.round((info.processed / info.total) * 100) : 0;
  document.getElementById('ingest-prog-fill').style.width = pct + '%';
  document.getElementById('ingest-prog-pct').textContent = pct + '%';
  document.getElementById('ingest-prog-detail').textContent =
    info.phase === 'done'
      ? 'Done — ' + info.total + ' files, ' + info.chunks + ' chunks'
      : info.file ? ('Ingesting: ' + info.file + ' (' + info.processed + '/' + info.total + ')') : '';
  if (info.file) {
    const log = document.getElementById('ingest-prog-log');
    const line = document.createElement('div');
    line.textContent = info.file;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }
}

function _finishIngestProgress(result) {
  document.getElementById('ingest-prog-fill').style.width = '100%';
  document.getElementById('ingest-prog-label').textContent = 'Complete';
  document.getElementById('ingest-prog-pct').textContent = '100%';
  document.getElementById('ingest-prog-detail').textContent =
    result.filesProcessed + ' files → ' + result.chunksStored + ' chunks in archive "' + (result.archive || '') + '"';
  document.getElementById('ingest-kill-btn').classList.add('hidden');
  document.getElementById('ingest-close-btn').classList.remove('hidden');
  loadArchivesList();
}

function _showIngestError(msg) {
  const errEl = document.getElementById('ingest-prog-error');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
  document.getElementById('ingest-prog-fill').classList.add('error');
  document.getElementById('ingest-prog-label').textContent = 'Error';
  document.getElementById('ingest-kill-btn').classList.add('hidden');
  document.getElementById('ingest-close-btn').classList.remove('hidden');
}

function _showIngestStopped() {
  document.getElementById('ingest-prog-fill').classList.add('stopped');
  document.getElementById('ingest-prog-label').textContent = 'Stopped';
  document.getElementById('ingest-kill-btn').classList.add('hidden');
  document.getElementById('ingest-close-btn').classList.remove('hidden');
}

function closeIngestProgress() {
  document.getElementById('ingest-progress-overlay').classList.remove('show');
  _ingestAbort = null;
  document.getElementById('ingest-folder-btn').disabled = false;
}

function killIngest() {
  if (_ingestAbort) {
    _ingestAbort.abort();
    _ingestAbort = null;
  }
}

async function _sseIngest(url, body, label) {
  _openIngestProgress(label);
  const btn2 = document.getElementById('ingest-folder-btn');
  if (btn2) btn2.disabled = true;
  const controller = new AbortController();
  _ingestAbort = controller;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!r.ok) {
      let errMsg = 'Server returned ' + r.status;
      try { const errBody = await r.json(); errMsg = errBody.error || errMsg; } catch (_) {}
      _showIngestError(errMsg);
      if (btn2) btn2.disabled = false;
      return;
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventType = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); }
        else if (line.startsWith('data: ') && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'progress') _updateIngestProgress(data);
            else if (eventType === 'done') _finishIngestProgress(data);
            else if (eventType === 'error') _showIngestError(data.error || 'Unknown error');
          } catch (_) {}
          eventType = null;
        } else if (line === '') { eventType = null; }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      _showIngestStopped();
    } else {
      _showIngestError(e.message);
    }
  }
  _ingestAbort = null;
  if (btn2) btn2.disabled = false;
}

function ingestFolder() {
  const folderPath = document.getElementById('ingest-folder-path').value.trim();
  if (!folderPath) { alert('Enter a folder path.'); return; }
  const archive = document.getElementById('ingest-archive-name').value.trim() || undefined;
  _sseIngest('/api/memory/ingest-folder', { folderPath, archive }, 'Ingesting folder...');
}

