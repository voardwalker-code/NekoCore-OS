// ─────────────────────────────────────────────────────────────────────────────
// NekoCore OS — Slash Command System
// Intercepts "/" commands from the chat input before they reach the LLM.
// Provides a Minecraft-style narrowing autocomplete picker and handlers for:
//   /task, /project, /skill, /websearch, /stop, /list, /listactive
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── Tiny HTML escape (for API-sourced strings inserted into DOM) ──────────────
  function _escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Command Registry ──────────────────────────────────────────────────────────
  const COMMANDS = [
    { cmd: 'task',       args: '[description]',  desc: 'Create a task — set schedule, skill & output in the wizard' },
    { cmd: 'project',    args: '[description]',  desc: 'Start an in-depth project with research support'            },
    { cmd: 'skill',      args: '<name> [args…]', desc: 'Invoke a named skill directly'                              },
    { cmd: 'websearch',  args: '<query>',         desc: 'Run a web research task and return results in chat'         },
    { cmd: 'stop',       args: '[session-id]',    desc: 'Stop the active task (or a session by ID)'                 },
    { cmd: 'list',       args: '',                desc: 'Open the task history panel'                               },
    { cmd: 'listactive', args: '',                desc: 'Show all currently running tasks in chat'                  },
    { cmd: 'ma',         args: '<message>',       desc: 'Send a message to MA for tool execution'                    },
  ];

  // ── State ─────────────────────────────────────────────────────────────────────
  let _activeIndex = -1;
  let _visibleCmds = [];

  // ── DOM helpers ───────────────────────────────────────────────────────────────
  function _picker()     { return document.getElementById('slashPicker');      }
  function _input()      { return document.getElementById('chatInput');        }
  function _wizard()     { return document.getElementById('taskWizard');       }
  function _wizardMode() { return document.getElementById('taskWizardIsProject'); }

  // ── Picker: render ────────────────────────────────────────────────────────────
  function _renderPicker(matches) {
    const el = _picker();
    if (!el) return;
    if (!matches.length) { hide(); return; }

    _visibleCmds  = matches;
    _activeIndex  = 0;

    el.innerHTML = matches.map((c, i) =>
      `<div class="slash-picker-item${i === 0 ? ' active' : ''}" data-idx="${i}"` +
      ` onmousedown="event.preventDefault()"` +
      ` onclick="window.SlashCommands._select(${i})">` +
      `<span class="slash-picker-cmd">/${_escHtml(c.cmd)}</span>` +
      (c.args ? `<span class="slash-picker-args"> ${_escHtml(c.args)}</span>` : '') +
      `<span class="slash-picker-desc">${_escHtml(c.desc)}</span>` +
      `</div>`
    ).join('');

    el.removeAttribute('aria-hidden');
    el.style.display = 'block';
  }

  function _setActive(idx) {
    const el = _picker();
    if (!el) return;
    _activeIndex = Math.max(0, Math.min(idx, _visibleCmds.length - 1));
    el.querySelectorAll('.slash-picker-item').forEach((item, i) => {
      item.classList.toggle('active', i === _activeIndex);
    });
  }

  // ── Picker: hide ─────────────────────────────────────────────────────────────
  function hide() {
    const el = _picker();
    if (!el) return;
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    _visibleCmds = [];
    _activeIndex = -1;
  }

  // ── Picker: fill input with selected command ──────────────────────────────────
  function _select(idx) {
    const c = _visibleCmds[idx];
    if (!c) return;
    const inp = _input();
    if (!inp) return;
    // Commands with args need a trailing space so user can start typing the arg.
    // Commands with no args (list, listactive, stop) get a trailing space too —
    // user may want to add a session ID to /stop.
    inp.value = '/' + c.cmd + ' ';
    inp.focus();
    hide();
  }

  // ── Public: update picker based on current textarea value ────────────────────
  function update(val) {
    if (!val || val[0] !== '/') { hide(); return; }
    const typed = val.slice(1).toLowerCase();
    // Once a space exists the command has been chosen — picker not needed.
    if (typed.includes(' ')) { hide(); return; }
    const matches = COMMANDS.filter(c => c.cmd.startsWith(typed));
    _renderPicker(matches);
  }

  // ── Public: key handling called from chat.js chatKeyDown ─────────────────────
  // Returns true if the event was consumed (stops propagation to chat.js logic).
  function handleKey(e) {
    const el = _picker();
    if (!el || el.style.display === 'none') return false;

    if (e.key === 'ArrowDown')  { e.preventDefault(); _setActive(_activeIndex + 1); return true; }
    if (e.key === 'ArrowUp')    { e.preventDefault(); _setActive(_activeIndex - 1); return true; }
    if (e.key === 'Escape')     { e.preventDefault(); hide(); return true; }

    // Tab → auto-fill, always
    if (e.key === 'Tab') {
      e.preventDefault();
      _select(_activeIndex);
      return true;
    }

    // Enter: if there is exactly ONE visible command and the typed text is an
    // exact match for it, let the event fall through so sendChatMessage() handles
    // the dispatch (cleaner than double-Enter). Otherwise auto-fill.
    if (e.key === 'Enter') {
      const inp = _input();
      const typed = (inp?.value || '').slice(1).trim().toLowerCase();
      if (_visibleCmds.length === 1 && _visibleCmds[0].cmd === typed) {
        // Exact match — hide picker and let Enter propagate to sendChatMessage
        hide();
        return false;
      }
      // Partial match — auto-fill
      e.preventDefault();
      _select(_activeIndex);
      return true;
    }

    return false;
  }

  // ── Public: dispatch a slash command from sendChatMessage ─────────────────────
  // Returns true if handled (chat.js should NOT proceed to LLM call).
  function dispatch(text) {
    if (!text || text[0] !== '/') return false;
    const parts = text.slice(1).trim().split(/\s+/);
    const cmd   = (parts[0] || '').toLowerCase();
    const rest  = parts.slice(1).join(' ');

    switch (cmd) {
      case 'task':       _cmdTask(rest);       return true;
      case 'project':    _cmdProject(rest);    return true;
      case 'skill':      _cmdSkill(rest);      return true;
      case 'websearch':  _cmdWebSearch(rest);  return true;
      case 'stop':       _cmdStop(rest);       return true;
      case 'list':       _cmdList();           return true;
      case 'listactive': _cmdListActive();     return true;
    }

    // Unknown slash command — let it fall through to LLM
    return false;
  }

  // ── Command: /task ────────────────────────────────────────────────────────────
  function _cmdTask(description) {
    const wiz = _wizard();
    if (!wiz) return;
    const m = _wizardMode();
    if (m) m.value = '0';
    _updateWizardTitle(false);
    if (description) {
      const el = document.getElementById('taskWizardDesc');
      if (el) el.value = description;
    }
    _loadSkillOptions();
    wiz.style.display = 'flex';
    setTimeout(() => document.getElementById('taskWizardDesc')?.focus(), 50);
  }

  // ── Command: /project ─────────────────────────────────────────────────────────
  function _cmdProject(description) {
    const wiz = _wizard();
    if (!wiz) return;
    const m = _wizardMode();
    if (m) m.value = '1';
    _updateWizardTitle(true);
    if (description) {
      const el = document.getElementById('taskWizardDesc');
      if (el) el.value = description;
    }
    _loadSkillOptions();
    wiz.style.display = 'flex';
    setTimeout(() => document.getElementById('taskWizardDesc')?.focus(), 50);
  }

  function _updateWizardTitle(isProject) {
    const el = document.getElementById('taskWizardTitle');
    if (el) el.textContent = isProject ? '🚀 New Project' : '⚡ New Task';
    const hint = document.getElementById('taskWizardDescHint');
    if (hint) hint.textContent = isProject
      ? 'Describe your project — NekoCore will research and execute in stages.'
      : 'Describe what you want done. NekoCore will classify and run it.';
  }

  // ── Command: /skill ───────────────────────────────────────────────────────────
  function _cmdSkill(args) {
    const parts = args.split(/\s+/);
    const skillName = parts[0];
    if (!skillName) { _sysMsg('Usage: /skill <name> [args…]'); return; }
    const skillArgs = parts.slice(1).join(' ');
    const entityId = _entityId();
    if (!entityId) { _sysMsg('⚠️ Load an entity first.'); return; }
    _sysMsg(`🔧 Invoking skill: ${skillName}${skillArgs ? ' — ' + skillArgs : ''}…`);
    _post('/api/task/run', {
      message: skillArgs || skillName,
      entityId,
      taskType: 'skill',
      skill: skillName,
      async: true,
    }).then(r => {
      if (r && !r.ok) _sysMsg('⚠️ Skill dispatch failed: ' + (r.error || 'unknown error'));
    }).catch(() => _sysMsg('⚠️ Skill request failed — check the Skills tab for available skills.'));
  }

  // ── Command: /websearch ───────────────────────────────────────────────────────
  function _cmdWebSearch(query) {
    if (!query) { _sysMsg('Usage: /websearch <query>'); return; }
    const entityId = _entityId();
    if (!entityId) { _sysMsg('⚠️ Load an entity first.'); return; }
    _sysMsg(`🔍 Starting web research: "${query}"`);
    _post('/api/task/run', {
      message: query,
      entityId,
      taskType: 'research',
      async: true,
    }).then(r => {
      if (r && !r.ok) _sysMsg('⚠️ Web research task failed to start: ' + (r.error || 'unknown error'));
    }).catch(() => _sysMsg('⚠️ Web research request failed.'));
  }

  // ── Command: /stop ────────────────────────────────────────────────────────────
  function _cmdStop(sessionId) {
    if (sessionId) {
      _post(`/api/task/cancel/${encodeURIComponent(sessionId)}`, {})
        .then(() => _sysMsg(`✋ Task ${sessionId} cancelled.`))
        .catch(() => _sysMsg('⚠️ Cancel failed.'));
    } else if (typeof window.cancelActiveTask === 'function') {
      window.cancelActiveTask();
      _sysMsg('✋ Stop signal sent to active task.');
    } else {
      _sysMsg('No active task found. Use /stop <session-id> to cancel a specific task.');
    }
  }

  // ── Command: /list ────────────────────────────────────────────────────────────
  function _cmdList() {
    if (typeof window.openTaskHistory === 'function') {
      window.openTaskHistory();
    } else {
      _sysMsg('Task history panel is not available.');
    }
  }

  // ── Command: /listactive ──────────────────────────────────────────────────────
  function _cmdListActive() {
    const entityId = _entityId();
    if (!entityId) { _sysMsg('⚠️ Load an entity first.'); return; }
    _get(`/api/task/history/${encodeURIComponent(entityId)}`)
      .then(r => {
        const sessions = (r?.sessions || []).filter(s =>
          s.status === 'running' || s.status === 'pending'
        );
        if (!sessions.length) { _sysMsg('No active tasks running.'); return; }
        const lines = sessions.map(s =>
          `• [${s.id}]  ${s.taskType || '—'}  ${s.status}`
        ).join('\n');
        _sysMsg('Active tasks:\n' + lines);
      })
      .catch(() => _sysMsg('⚠️ Could not fetch active tasks.'));
  }

  // ── Task wizard: load skill options from API ───────────────────────────────────
  function _loadSkillOptions() {
    const sel = document.getElementById('taskWizardSkill');
    if (!sel || sel.dataset.loaded === '1') return;
    _get('/api/skills')
      .then(r => {
        const skills = (r?.skills || []).filter(s => s.enabled !== false);
        sel.innerHTML =
          '<option value="">Auto-detect</option>' +
          skills.map(s =>
            `<option value="${_escHtml(s.name)}">${_escHtml(s.name)}</option>`
          ).join('');
        sel.dataset.loaded = '1';
      })
      .catch(() => {/* silently leave "Auto-detect" only */});
  }

  // ── Task wizard: schedule field visibility ────────────────────────────────────
  function _updateScheduleFields() {
    const sel = document.querySelector('input[name="twSchedule"]:checked')?.value || 'once';
    const iRow = document.getElementById('twIntervalRow');
    const dRow = document.getElementById('twDailyRow');
    if (iRow) iRow.style.display = sel === 'interval' ? 'flex' : 'none';
    if (dRow) dRow.style.display = sel === 'daily'    ? 'flex' : 'none';
  }

  // ── Task wizard: submit ───────────────────────────────────────────────────────
  function _submitTaskWizard() {
    const desc = (document.getElementById('taskWizardDesc')?.value || '').trim();
    if (!desc) {
      document.getElementById('taskWizardDesc')?.focus();
      return;
    }

    const entityId = _entityId();
    if (!entityId) { _sysMsg('⚠️ Load an entity first.'); closeTaskWizard(); return; }

    const isProject   = document.getElementById('taskWizardIsProject')?.value === '1';
    const taskType    = document.getElementById('taskWizardType')?.value || '';
    const skill       = document.getElementById('taskWizardSkill')?.value || '';
    const output      = document.getElementById('taskWizardOutput')?.value || 'chat';
    const schedType   = document.querySelector('input[name="twSchedule"]:checked')?.value || 'once';
    const intervalVal = parseInt(document.getElementById('twIntervalVal')?.value || '30', 10);
    const intervalUnit= document.getElementById('twIntervalUnit')?.value || 'minutes';
    const dailyTime   = document.getElementById('twDailyTime')?.value || '';

    const schedule = schedType === 'once' ? null : {
      type: schedType,
      intervalValue: intervalVal,
      intervalUnit,
      dailyTime,
    };

    const payload = {
      message:   desc,
      entityId,
      async:     true,
      outputMode: output,
      isProject,
      ...(taskType ? { taskType }  : {}),
      ...(skill    ? { skill }     : {}),
      ...(schedule ? { schedule }  : {}),
    };

    _sysMsg(
      isProject
        ? `🚀 Starting project: "${desc.slice(0, 72)}${desc.length > 72 ? '…' : ''}"`
        : `⚡ Starting task: "${desc.slice(0, 72)}${desc.length > 72 ? '…' : ''}"`
    );

    closeTaskWizard();

    _post('/api/task/run', payload)
      .then(r => {
        if (r && !r.ok && r.intent === 'conversation') {
          _sysMsg('⚠️ Could not classify as a task — sending as a chat message instead.');
          const inp = _input();
          if (inp) inp.value = desc;
          if (typeof window.sendChatMessage === 'function') window.sendChatMessage();
        }
      })
      .catch(err => _sysMsg(`⚠️ Task start error: ${err?.message || 'unknown'}`));
  }

  // ── Task wizard: close + reset ────────────────────────────────────────────────
  function closeTaskWizard() {
    const wiz = _wizard();
    if (wiz) wiz.style.display = 'none';

    // Reset fields
    const desc = document.getElementById('taskWizardDesc');
    if (desc) desc.value = '';
    const mode = _wizardMode();
    if (mode) mode.value = '0';
    const typeEl = document.getElementById('taskWizardType');
    if (typeEl) typeEl.value = '';
    const skillEl = document.getElementById('taskWizardSkill');
    if (skillEl) skillEl.value = '';
    const outputEl = document.getElementById('taskWizardOutput');
    if (outputEl) outputEl.value = 'chat';
    const once = document.querySelector('input[name="twSchedule"][value="once"]');
    if (once) { once.checked = true; _updateScheduleFields(); }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────

  function _entityId() {
    return typeof window.getActiveEntityId === 'function'
      ? window.getActiveEntityId()
      : null;
  }

  function _get(path) {
    if (window.RemAPI?.get) return window.RemAPI.get(path);
    return fetch(path).then(r => r.json());
  }

  function _post(path, body) {
    if (window.RemAPI?.post) return window.RemAPI.post(path, body);
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  // Inject a styled system message into #chatMessages (no LLM, no chat history)
  function _sysMsg(text) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) { console.log('[slash]', text); return; }
    const d = document.createElement('div');
    d.className = 'chat-slash-msg';
    d.textContent = text; // textContent is XSS-safe
    msgs.appendChild(d);
    msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
  }

  // ── Input event delegation ───────────────────────────────────────────────────
  // Using document-level delegation avoids any script-load-order dependency
  // on when #chatInput appears in the DOM (it's injected by core-html-loader).
  document.addEventListener('input', function (e) {
    if (e.target.id === 'chatInput') update(e.target.value);
  });

  // Close picker on outside clicks
  document.addEventListener('click', function (e) {
    const el = _picker();
    const inp = _input();
    if (el && !el.contains(e.target) && e.target !== inp) hide();
  });

  // Close wizard on overlay click (but not on the card itself)
  document.addEventListener('click', function (e) {
    const wiz = _wizard();
    if (wiz && e.target === wiz) closeTaskWizard();
  });

  // ── Public API ────────────────────────────────────────────────────────────────
  window.SlashCommands = {
    COMMANDS,
    update,
    handleKey,
    dispatch,
    hide,
    _select,             // called from onclick in picker HTML
    closeTaskWizard,
    submitTaskWizard:    _submitTaskWizard,
    updateScheduleFields: _updateScheduleFields,
  };

})();
