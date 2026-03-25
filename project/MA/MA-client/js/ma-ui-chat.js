// MA UI — Chat, session management, typing indicators, progress widget, send/receive.

// ── Session state ─────────────────────────────────────────────────────────
let activeSessionId = null; // null = new session (not yet saved)
let allSessions = [];       // cached session list from server

// ── Long-request timeout popup ────────────────────────────────────────────
const LONG_REQUEST_THRESHOLD = 30000; // 30s before showing popup
const AUTOPILOT_KEY = 'ma-autopilot-v1';
let _lrTimer = null;
let _lrStartTime = 0;
let _lrAbortController = null;
let _lrDismissed = false;

function isAutoPilot() { return localStorage.getItem(AUTOPILOT_KEY) === '1'; }
function setAutoPilot(on) { localStorage.setItem(AUTOPILOT_KEY, on ? '1' : '0'); }

function _startLongRequestTimer() {
  _lrStartTime = Date.now();
  _lrDismissed = false;
  _clearLongRequestTimer();
  if (isAutoPilot()) return; // no popups in auto pilot
  _lrTimer = setTimeout(_showLongRequestPopup, LONG_REQUEST_THRESHOLD);
}

function _resetLongRequestTimer() {
  // Reset on any progress event (SSE activity/step)
  if (_lrDismissed || isAutoPilot()) return;
  _clearLongRequestTimer();
  _lrTimer = setTimeout(_showLongRequestPopup, LONG_REQUEST_THRESHOLD);
}

function _clearLongRequestTimer() {
  if (_lrTimer) { clearTimeout(_lrTimer); _lrTimer = null; }
}

function _showLongRequestPopup() {
  const overlay = document.getElementById('long-request-overlay');
  const elapsedEl = document.getElementById('lr-elapsed');
  if (!overlay) return;
  const elapsed = Math.round((Date.now() - _lrStartTime) / 1000);
  if (elapsedEl) elapsedEl.textContent = elapsed;
  overlay.classList.remove('hidden');
}

function dismissLongRequest() {
  const overlay = document.getElementById('long-request-overlay');
  if (overlay) overlay.classList.add('hidden');
  _lrDismissed = true;
  _clearLongRequestTimer();
}

function cancelLongRequest() {
  const overlay = document.getElementById('long-request-overlay');
  if (overlay) overlay.classList.add('hidden');
  _clearLongRequestTimer();
  if (_lrAbortController) { _lrAbortController.abort(); _lrAbortController = null; }
  hideTyping();
  addSystem('Request cancelled.');
  sending = false;
  sendBtn.disabled = false;
  inputEl.focus();
}

function toggleAutoPilotFromPopup(checked) {
  setAutoPilot(checked);
  if (checked) dismissLongRequest();
}

// ── Session picker ────────────────────────────────────────────────────────
async function loadSessionList() {
  try {
    const r = await fetch('/api/chat/sessions');
    const d = await r.json();
    allSessions = d.sessions || [];
  } catch (_) { allSessions = []; }
  renderSessionPicker();
}

function renderSessionPicker() {
  const bar = document.getElementById('session-recent-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const recent = allSessions.slice(0, 4);
  if (!recent.length) {
    bar.innerHTML = '<span class="sp-empty">No recent sessions</span>';
    return;
  }
  for (const s of recent) {
    const btn = document.createElement('button');
    btn.className = 'sp-chip' + (s.id === activeSessionId ? ' active' : '');
    btn.textContent = s.preview || 'Session';
    btn.onclick = () => loadSession(s.id);
    bar.appendChild(btn);
  }
}

function toggleSessionDropdown() {
  const dd = document.getElementById('session-dropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) renderSessionDropdown();
}

function renderSessionDropdown() {
  const dd = document.getElementById('session-dropdown');
  if (!dd) return;
  dd.innerHTML = '';
  if (!allSessions.length) {
    dd.innerHTML = '<div class="sp-dd-empty">No sessions yet</div>';
    return;
  }
  // Group by date
  const groups = {};
  for (const s of allSessions) {
    const day = (s.updatedAt || s.createdAt || '').slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(s);
  }
  for (const [day, items] of Object.entries(groups)) {
    const label = document.createElement('div');
    label.className = 'sp-dd-date';
    label.textContent = day;
    dd.appendChild(label);
    for (const s of items) {
      const row = document.createElement('button');
      row.className = 'sp-dd-item' + (s.id === activeSessionId ? ' active' : '');
      row.textContent = s.preview || 'Session';
      row.onclick = () => { loadSession(s.id); dd.classList.add('hidden'); };
      dd.appendChild(row);
    }
  }
}

async function loadSession(id) {
  try {
    const r = await fetch('/api/chat/session/' + encodeURIComponent(id));
    if (!r.ok) { addSystem('Could not load session.'); return; }
    const d = await r.json();
    activeSessionId = d.id;
    history = d.messages || [];
    chatEl.innerHTML = '';
    for (const msg of history) {
      if (msg.role === 'user') addMsg('user', msg.content);
      else if (msg.role === 'assistant') addMsg('ma', msg.content);
    }
    renderSessionPicker();
  } catch (_) { addSystem('Failed to load session.'); }
}

function startNewSession() {
  activeSessionId = null;
  history = [];
  chatEl.innerHTML = '';
  renderSessionPicker();
}

async function saveSession() {
  if (!history.length) return;
  try {
    const r = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeSessionId, messages: history })
    });
    const d = await r.json();
    if (d.id) activeSessionId = d.id;
    loadSessionList(); // refresh picker
    if (typeof loadConversationHistory === 'function') loadConversationHistory(); // refresh explorer
  } catch (_) { /* silent */ }
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('session-dropdown-wrap');
  const dd = document.getElementById('session-dropdown');
  if (dd && wrap && !wrap.contains(e.target)) dd.classList.add('hidden');
});

// ── Chat ──────────────────────────────────────────────────────────────────
function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  if (role === 'ma') {
    // Render MA messages with basic formatting
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    div.appendChild(bubble);
  } else {
    div.textContent = text;
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function addSystem(text) {
  const div = document.createElement('div');
  div.className = 'msg system';
  div.textContent = text;
  chatEl.appendChild(div);
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.textContent = 'MA is thinking...';
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

// ── Task progress widget ────────────────────────────────────────────
function createProgressWidget() {
  const widget = document.createElement('div');
  widget.className = 'task-progress';
  widget.id = 'task-progress';
  widget.innerHTML = '<div class="tp-header"><div class="tp-spinner"></div><span>Working...</span></div>' +
    '<div class="tp-bar"><div class="tp-fill" style="width:0%"></div></div>' +
    '<div class="tp-steps"></div>';
  chatEl.appendChild(widget);
  chatEl.scrollTop = chatEl.scrollHeight;
  return widget;
}

function updateProgress(widget, stepInfo) {
  const pct = Math.round(((stepInfo.stepIndex + 1) / stepInfo.stepTotal) * 100);
  const fill = widget.querySelector('.tp-fill');
  const header = widget.querySelector('.tp-header span');
  const steps = widget.querySelector('.tp-steps');

  fill.style.width = pct + '%';
  header.textContent = `Step ${stepInfo.stepIndex + 1} of ${stepInfo.stepTotal}`;

  // Mark previous steps as done
  const existing = steps.querySelectorAll('.tp-step.active');
  existing.forEach(el => { el.classList.remove('active'); el.classList.add('done'); el.querySelector('.tp-icon').textContent = '✓'; });

  // Add current step
  const stepEl = document.createElement('div');
  stepEl.className = 'tp-step active';
  stepEl.innerHTML = '<span class="tp-icon">►</span><span>' + escHtml(stepInfo.description) + '</span>';
  steps.appendChild(stepEl);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function finalizeProgress(widget) {
  const spinner = widget.querySelector('.tp-spinner');
  if (spinner) spinner.remove();
  const header = widget.querySelector('.tp-header span');
  header.textContent = 'Complete';
  const active = widget.querySelectorAll('.tp-step.active');
  active.forEach(el => { el.classList.remove('active'); el.classList.add('done'); el.querySelector('.tp-icon').textContent = '✓'; });
  const fill = widget.querySelector('.tp-fill');
  fill.style.width = '100%';
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

async function send() {
  const text = inputEl.value.trim();
  if (!text && !pendingFiles.length) return;
  if (sending) return;

  sending = true;
  sendBtn.disabled = true;

  // Build display text: message + filenames
  const fileNames = pendingFiles.map(f => f.name);
  const imageFiles = pendingFiles.filter(f => f.type === 'image');
  const displayText = fileNames.length
    ? (text ? text + '\n📎 ' + fileNames.join(', ') : '📎 ' + fileNames.join(', '))
    : text;
  addMsg('user', displayText);
  // Show image thumbnails inline in the chat
  if (imageFiles.length) {
    const lastBubble = chatEl.querySelector('.msg:last-child .bubble');
    if (lastBubble) {
      for (const img of imageFiles) {
        const el = document.createElement('img');
        el.src = img.content; el.className = 'chat-img'; el.alt = img.name;
        lastBubble.appendChild(el);
      }
    }
  }
  inputEl.value = '';
  inputEl.style.height = 'auto';

  const msgText = text || ('I attached these files: ' + fileNames.join(', '));
  history.push({ role: 'user', content: msgText });
  showTyping();

  // Capture and clear attachments
  const attachments = pendingFiles.slice();
  pendingFiles = [];
  document.getElementById('file-chips').innerHTML = '';

  const payload = JSON.stringify({
    message: msgText,
    history: history.slice(-10),
    attachments: attachments.length ? attachments : undefined,
    autoPilot: isAutoPilot()
  });

  try {
    // Use SSE streaming endpoint for step progress
    _lrAbortController = new AbortController();
    _startLongRequestTimer();
    const r = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: _lrAbortController.signal
    });

    if (!r.ok) {
      // Fallback: try regular endpoint
      _clearLongRequestTimer();
      hideTyping();
      const r2 = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      const d = await r2.json();
      if (d.error) { addSystem('Error: ' + d.error); }
      else { handleChatResult(d); }
      sending = false; sendBtn.disabled = false; inputEl.focus(); return;
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let progressWidget = null;
    let gotSteps = false;
    let eventType = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line in buffer
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          _resetLongRequestTimer(); // got data — reset timeout popup
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'activity') {
              addActivity(data.category, data.detail, data.data);
              if (data.category === 'plan' && data.data && data.data.steps) setTaskPlan(data.data.steps);
              if (data.category === 'plan' || data.category === 'worklog') loadWorklog();
            } else if (eventType === 'step') {
              if (!gotSteps) {
                hideTyping();
                progressWidget = createProgressWidget();
                gotSteps = true;
              }
              updateProgress(progressWidget, data);
            } else if (eventType === 'done') {
              _clearLongRequestTimer();
              hideTyping();
              if (progressWidget) finalizeProgress(progressWidget);
              handleChatResult(data);
            } else if (eventType === 'error') {
              _clearLongRequestTimer();
              hideTyping();
              if (progressWidget) finalizeProgress(progressWidget);
              addSystem('Error: ' + (data.error || 'Unknown error'));
            }
          } catch (_) { /* skip parse errors */ }
          eventType = null;
        } else if (line === '') {
          eventType = null; // reset on blank line
        }
      }
    }

    _clearLongRequestTimer();
    // If no events came through at all, handle gracefully
    if (!gotSteps) hideTyping();

  } catch (e) {
    _clearLongRequestTimer();
    dismissLongRequest();
    hideTyping();
    if (e.name !== 'AbortError') addSystem('Network error: ' + e.message);
  }

  sending = false;
  sendBtn.disabled = false;
  inputEl.focus();
}

function handleChatResult(d) {
  const reply = d.reply || '(empty response)';
  const msgDiv = addMsg('ma', reply);
  history.push({ role: 'assistant', content: reply });

  // Render clickable file links for created/modified files
  console.log('[MA-UI] handleChatResult filesChanged:', d.filesChanged);
  if (d.filesChanged && d.filesChanged.length > 0) {
    const container = msgDiv.querySelector('.bubble') || msgDiv;
    const linksDiv = document.createElement('div');
    linksDiv.className = 'file-links';
    const extIcons = { '.js': '\u{1F4DC}', '.ts': '\u{1F4DC}', '.json': '\u{1F4CB}', '.md': '\u{1F4D6}', '.html': '\u{1F310}', '.css': '\u{1F3A8}', '.py': '\u{1F40D}', '.rs': '\u2699', '.txt': '\u{1F4C4}' };
    for (const fp of d.filesChanged) {
      const ext = '.' + fp.split('.').pop().toLowerCase();
      const icon = extIcons[ext] || '\u{1F4C4}';
      const name = fp.split('/').pop();
      const a = document.createElement('a');
      a.className = 'file-link';
      a.href = '#';
      a.title = fp;
      a.onclick = function(e) { e.preventDefault(); openFileInEditor(fp); };
      a.innerHTML = '<span class="fl-icon">' + icon + '</span><span class="fl-name">' + escHtml(name) + '</span>';
      linksDiv.appendChild(a);
    }
    container.appendChild(linksDiv);
  }

  if (d.taskType) addSystem('Task: ' + d.taskType + ' (' + (d.steps || 0) + ' steps)');
  if (d.contextUsage) updateTokenBar(d.contextUsage);
  if (d.continuationPoint) {
    lastContinuation = d.continuationPoint;
    showContinueButton(d.continuationPoint);
  } else {
    lastContinuation = null;
  }

  // Book ingestion: render character selection UI when MA presents the list
  if (reply.includes('Selection options') || reply.includes('Which would you like')) {
    _renderCharacterSelectionButtons(msgDiv);
  }

  loadWorklog();
  if (currentInspector === 'projects') loadProjects();
  saveSession();
}

/** Render quick-select buttons for book character selection below the MA message. */
function _renderCharacterSelectionButtons(msgDiv) {
  const container = msgDiv.querySelector('.bubble') || msgDiv;
  const bar = document.createElement('div');
  bar.className = 'book-selection-bar';

  const modes = [
    { label: '★ Main Characters Only', value: 'main' },
    { label: '● All Characters', value: 'all' },
    { label: '✎ Select Specific...', value: 'specific' }
  ];

  for (const mode of modes) {
    const btn = document.createElement('button');
    btn.className = 'book-select-btn';
    btn.textContent = mode.label;
    btn.onclick = function () {
      bar.querySelectorAll('.book-select-btn').forEach(b => b.disabled = true);
      if (mode.value === 'specific') {
        // Show text input for character names
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'book-char-input';
        inp.placeholder = 'Character names (comma-separated)...';
        inp.onkeydown = function (e) {
          if (e.key === 'Enter' && inp.value.trim()) {
            const names = inp.value.trim();
            inputEl.value = '[BOOK_SELECTION] mode=specific selected=' + names;
            send();
            inp.disabled = true;
          }
        };
        const go = document.createElement('button');
        go.className = 'book-select-btn';
        go.textContent = 'Extract';
        go.onclick = function () {
          if (inp.value.trim()) {
            inputEl.value = '[BOOK_SELECTION] mode=specific selected=' + inp.value.trim();
            send();
            inp.disabled = true;
            go.disabled = true;
          }
        };
        bar.appendChild(inp);
        bar.appendChild(go);
      } else {
        inputEl.value = '[BOOK_SELECTION] mode=' + mode.value;
        send();
      }
    };
    bar.appendChild(btn);
  }

  container.appendChild(bar);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  // Auto-resize
  setTimeout(() => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }, 0);
}
