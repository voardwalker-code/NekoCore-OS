// ── NekoCore OS Panel ─────────────────────────────────────────────────────────
// Self-contained client for client/nekocore.html
// No app.js globals — runs inside an iframe.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ── Minimal toast (no app.js dependency) ─────────────────────────────────────

function _toast(msg, type) {
  const COLORS = {
    ok:    { bg: '#1a3d2a', border: '#22c55e', text: '#86efac' },
    error: { bg: '#3d1a1a', border: '#ef4444', text: '#fca5a5' },
    info:  { bg: '#1a2c3d', border: '#3b82f6', text: '#93c5fd' },
    warn:  { bg: '#3d2e1a', border: '#f59e0b', text: '#fcd34d' }
  };
  const s = COLORS[type] || COLORS.info;
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
    background: s.bg, border: '1px solid ' + s.border, color: s.text,
    padding: '.5rem 1rem', borderRadius: '6px', fontSize: '.8rem',
    fontFamily: 'var(--font-mono, monospace)', maxWidth: '320px',
    zIndex: '9999', opacity: '0', transition: 'opacity .2s ease', cursor: 'pointer'
  });
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
  const dismiss = () => {
    el.style.opacity = '0';
    setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 220);
  };
  el.addEventListener('click', dismiss);
  setTimeout(dismiss, 4000);
}

// ── HTML escape ───────────────────────────────────────────────────────────────

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── API helpers ───────────────────────────────────────────────────────────────

const API = {
  status() {
    return fetch('/api/nekocore/status').then((r) => r.json());
  },
  pending() {
    return fetch('/api/nekocore/pending').then((r) => r.json());
  },
  apply(recommendationId, approved) {
    return fetch('/api/nekocore/model-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendationId, approved })
    }).then((r) => r.json());
  },
  persona() {
    return fetch('/api/nekocore/persona').then((r) => r.json());
  },
  savePersona(payload) {
    return fetch('/api/nekocore/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    }).then((r) => r.json());
  },
  resetPersona() {
    return fetch('/api/nekocore/persona/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }).then((r) => r.json());
  },
  factoryResetNeko() {
    return fetch('/api/nekocore/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }).then((r) => r.json());
  }
};

let _personaState = null;
let _presetState = [];

function _setInfoPanelOpen(isOpen) {
  const panel = document.getElementById('nkInfoPanel');
  const toggle = document.getElementById('nkInfoToggle');
  if (!panel || !toggle) return;
  panel.classList.toggle('is-collapsed', !isOpen);
  toggle.textContent = isOpen ? 'Hide Voice & Info' : 'Show Voice & Info';
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function _focusVoiceSettings() {
  _setInfoPanelOpen(true);
  const target = document.getElementById('nkUserName') || document.getElementById('nkVoiceStyle');
  if (target && typeof target.focus === 'function') {
    window.setTimeout(() => target.focus(), 80);
  }
}

function _setPersonaForm(persona) {
  const src = persona || {};
  const userName = document.getElementById('nkUserName');
  const voice = document.getElementById('nkVoiceStyle');
  const tone = document.getElementById('nkTone');
  const mood = document.getElementById('nkMood');
  const personality = document.getElementById('nkPersonalityText');
  if (userName) userName.value = src.userName || '';
  if (voice) voice.value = src.llmStyle || '';
  if (tone) tone.value = src.tone || '';
  if (mood) mood.value = src.mood || '';
  if (personality) personality.value = src.llmPersonality || '';
}

function _collectPersonaForm() {
  return {
    userName: (document.getElementById('nkUserName')?.value || '').trim(),
    llmStyle: (document.getElementById('nkVoiceStyle')?.value || '').trim(),
    tone: (document.getElementById('nkTone')?.value || '').trim(),
    mood: (document.getElementById('nkMood')?.value || '').trim(),
    llmPersonality: (document.getElementById('nkPersonalityText')?.value || '').trim()
  };
}

function _renderPresets(presets) {
  const row = document.getElementById('nkPresetRow');
  if (!row) return;
  _presetState = Array.isArray(presets) ? presets.slice() : [];
  if (!_presetState.length) {
    row.innerHTML = '';
    return;
  }

  row.innerHTML = _presetState.map((preset) => (
    `<button class="nk-preset-btn" data-preset-id="${esc(preset.id)}" title="${esc(preset.summary || '')}">${esc(preset.label || preset.id)}</button>`
  )).join('');

  row.querySelectorAll('[data-preset-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = _presetState.find((p) => p.id === btn.dataset.presetId);
      if (!preset) return;
      const next = {
        ...(_personaState || {}),
        llmStyle: preset.llmStyle,
        tone: preset.tone,
        llmPersonality: preset.llmPersonality
      };
      _setPersonaForm(next);
    });
  });
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderStatus(data) {
  const dot   = document.getElementById('nkStatusDot');
  const label = document.getElementById('nkStatusLabel');
  const model = document.getElementById('nkActiveModel');
  const count = document.getElementById('nkPendingCount');
  const ready = document.getElementById('nkEntityReady');

  dot.className  = 'nk-status-dot ' + (data.ok ? 'ok' : 'err');
  label.textContent = data.ok ? 'Operational' : 'Error';
  model.textContent = data.activeModel || '(not configured)';
  count.textContent = String(data.pendingCount ?? 0);

  const isReady = !!data.isSystemEntityReady;
  ready.textContent  = isReady ? '✓ Ready' : '✗ Not provisioned';
  ready.style.color  = isReady ? 'var(--accent, #34d399)' : 'var(--danger, #f87171)';
}

function renderPending(items) {
  const list = document.getElementById('nkPendingList');
  if (!items || !items.length) {
    list.innerHTML = '<p class="nk-empty">No pending recommendations.</p>';
    return;
  }

  list.innerHTML = items.map((rec) => `
    <div class="nk-rec-card">
      <div class="nk-rec-header">
        <span class="nk-rec-entity">${esc(rec.targetEntityId)}</span>
        <span class="nk-rec-aspect">${esc(rec.targetAspect)}</span>
        <span class="nk-rec-date">${esc(rec.createdAt ? rec.createdAt.slice(0, 19).replace('T', ' ') : '')}</span>
      </div>
      <div class="nk-rec-body">
        <div class="nk-rec-meta"><span class="nk-meta-label">Current</span><code>${esc(rec.currentModel)}</code></div>
        <div class="nk-rec-meta"><span class="nk-meta-label">Suggested</span><code class="nk-code-highlight">${esc(rec.suggestedModel)}</code></div>
        <div class="nk-rec-rationale">${esc(rec.rationale)}</div>
        ${rec.riskNotes ? `<div class="nk-rec-risk">⚠ ${esc(rec.riskNotes)}</div>` : ''}
        ${rec.reason    ? `<div class="nk-rec-reason">Reason: ${esc(rec.reason)}</div>` : ''}
      </div>
      <div class="nk-rec-actions">
        <button class="nk-rec-approve" data-id="${esc(rec.recommendationId)}" data-approved="true">✓ Approve</button>
        <button class="nk-rec-deny"    data-id="${esc(rec.recommendationId)}" data-approved="false">✕ Deny</button>
      </div>
    </div>
  `).join('');

  // Wire buttons via event delegation (no inline onclick = no XSS)
  list.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      App.apply(btn.dataset.id, btn.dataset.approved === 'true');
    });
  });
}

// ── Main App object ───────────────────────────────────────────────────────────

const App = {
  async refresh() {
    try {
      const [statusData, pendingData, personaData] = await Promise.all([
        API.status(),
        API.pending(),
        API.persona()
      ]);
      renderStatus(statusData);
      renderPending(pendingData.pending || []);
      if (personaData && personaData.ok) {
        _personaState = personaData.persona || {};
        _setPersonaForm(_personaState);
        _renderPresets(personaData.presets || []);
      }
    } catch (e) {
      _toast('Error loading NekoCore status: ' + e.message, 'error');
      const dot = document.getElementById('nkStatusDot');
      if (dot) dot.className = 'nk-status-dot err';
      const label = document.getElementById('nkStatusLabel');
      if (label) label.textContent = 'Offline';
    }
  },

  async apply(recommendationId, approved) {
    const btns = document.querySelectorAll(`[data-id="${CSS.escape(recommendationId)}"]`);
    btns.forEach((b) => { b.disabled = true; });

    try {
      const result = await API.apply(recommendationId, approved);
      if (!result.ok) throw new Error(result.error || 'Unknown error');

      if (approved) {
        _toast('Model applied: ' + (result.appliedModel || 'ok'), 'ok');
      } else {
        _toast('Recommendation denied.', 'info');
      }
      await this.refresh();
    } catch (e) {
      _toast('Failed: ' + e.message, 'error');
      btns.forEach((b) => { b.disabled = false; });
    }
  },

  async savePersona() {
    try {
      const payload = _collectPersonaForm();
      const result = await API.savePersona(payload);
      if (!result.ok) throw new Error(result.error || 'Save failed');
      _personaState = result.persona || payload;
      _setPersonaForm(_personaState);
      _toast('NekoCore voice updated.', 'ok');
    } catch (e) {
      _toast('Persona save failed: ' + e.message, 'error');
    }
  },

  async resetPersona() {
    try {
      const result = await API.resetPersona();
      if (!result.ok) throw new Error(result.error || 'Reset failed');
      _personaState = result.persona || {};
      _setPersonaForm(_personaState);
      _toast('NekoCore voice reset to defaults.', 'info');
    } catch (e) {
      _toast('Persona reset failed: ' + e.message, 'error');
    }
  },

  async factoryResetNeko() {
    const ok = window.confirm('Factory reset NekoCore memory now? System document knowledge will be preserved.');
    if (!ok) return;
    try {
      const result = await API.factoryResetNeko();
      if (!result.ok) throw new Error(result.error || 'Factory reset failed');
      _toast('NekoCore factory reset complete (system docs preserved).', 'warn');
      await this.refresh();
    } catch (e) {
      _toast('Factory reset failed: ' + e.message, 'error');
    }
  }
};

// ── Chat with NekoCore ──────────────────────────────────────────────────────

const Chat = (() => {
  // In-memory history for this panel session
  const _history = [];

  function _addMessage(role, text) {
    _history.push({ role, content: text });
    _render(role, text);
  }

  function _render(role, text) {
    const box  = document.getElementById('nkChatMessages');
    if (!box) return;
    const wrap = document.createElement('div');
    wrap.className = 'nk-msg nk-msg-' + (role === 'user' ? 'user' : 'neko');
    const bubble = document.createElement('div');
    bubble.className = 'nk-bubble';
    // Render newlines; all values are escaped or static strings
    bubble.innerHTML = esc(text).replace(/\n/g, '<br>');
    wrap.appendChild(bubble);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function _setLoading(on) {
    const btn   = document.getElementById('nkChatSend');
    const input = document.getElementById('nkChatInput');
    if (btn)   btn.disabled   = on;
    if (input) input.disabled = on;
    if (on) {
      const box = document.getElementById('nkChatMessages');
      if (box) {
        const el = document.createElement('div');
        el.id = 'nkTyping';
        el.className = 'nk-msg nk-msg-neko';
        el.innerHTML = '<div class="nk-bubble nk-typing">…</div>';
        box.appendChild(el);
        box.scrollTop = box.scrollHeight;
      }
    } else {
      const el = document.getElementById('nkTyping');
      if (el) el.parentNode && el.parentNode.removeChild(el);
    }
  }

  async function send() {
    const input = document.getElementById('nkChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    _addMessage('user', text);
    _setLoading(true);

    try {
      const resp = await fetch('/api/nekocore/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chatHistory: _history.slice(-12) })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'No response');
      _setLoading(false);
      _addMessage('assistant', data.response);
    } catch (e) {
      _setLoading(false);
      _toast('Chat error: ' + e.message, 'error');
    }
  }

  function clear() {
    _history.length = 0;
    const box = document.getElementById('nkChatMessages');
    if (box) box.innerHTML = '';
  }

  // Send on Ctrl+Enter / Cmd+Enter
  document.addEventListener('DOMContentLoaded', () => {
    const infoToggle = document.getElementById('nkInfoToggle');
    const saveBtn = document.getElementById('nkSavePersona');
    const resetBtn = document.getElementById('nkResetPersona');
    const factoryBtn = document.getElementById('nkFactoryResetNeko');
    if (infoToggle) infoToggle.addEventListener('click', () => {
      const panel = document.getElementById('nkInfoPanel');
      const isOpen = panel ? panel.classList.contains('is-collapsed') : false;
      _setInfoPanelOpen(isOpen);
    });
    if (saveBtn) saveBtn.addEventListener('click', () => App.savePersona());
    if (resetBtn) resetBtn.addEventListener('click', () => App.resetPersona());
    if (factoryBtn) factoryBtn.addEventListener('click', () => App.factoryResetNeko());

    _setInfoPanelOpen(false);

    const input = document.getElementById('nkChatInput');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          send();
        }
      });
    }
  });

  return { send, clear };
})();

// ── Taskbar quick-message bridge ─────────────────────────────────────────────
// Listen for messages posted from the parent shell (app.js openNekoCoreWithMessage)
window.addEventListener('message', (e) => {
  // Only accept messages from the same origin
  if (e.origin && typeof location !== 'undefined' && e.origin !== location.origin) return;
  if (!e.data) return;
  if (e.data.type === 'nk_focus_voice') {
    _focusVoiceSettings();
    return;
  }
  if (e.data.type !== 'nk_send_message') return;
  const text = (e.data.text || '').trim();
  if (!text) return;
  const input = document.getElementById('nkChatInput');
  if (input) {
    input.value = text;
    Chat.send();
  }
});

window.App  = App;
window.Chat = Chat;
document.addEventListener('DOMContentLoaded', () => App.refresh());
