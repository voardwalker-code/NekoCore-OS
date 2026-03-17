// ============================================================
// REM System — Neural Visualizer (standalone page JS)
// Chat display + 3D memory graph + memory browser + diagnostics
// ============================================================
(function () {
  'use strict';

  // ── State ──
  let eventSource = null;
  let allNodes = [];
  let allEdges = [];
  let traceGraph = {};
  let filteredNodeIds = null; // null = show all
  let chatExchanges = []; // Array of { id, user, assistant, memories: [{id,type,semantic}], timestamp }
  let selectedExchangeId = null;
  let selectedMemoryId = null;
  let focusedNodeId = null; // last clicked node in 3D view (for center button)
  let timelineRecords = [];
  let timelineCursor = 0;
  let timelineTimer = null;
  let timelineLiveSse = null;
  let timelineSpeed = 1;
  let selectedEntityId = null;

  function appendEntityId(urlOrPath, entityId) {
    if (!entityId) return urlOrPath;
    const url = new URL(urlOrPath, window.location.origin);
    url.searchParams.set('entityId', entityId);
    return url.pathname + url.search;
  }
  // Live mode event queue — events are processed with a delay so animations are watchable
  let _liveQueue = [];
  let _liveQueueRunning = false;

  // ── Memory type colors — used for chat/memory-browser UI elements only.
  // 3D rendering is fully delegated to NeuralViz (neural-viz.js).
  const MEM_COLORS = {
    core_memory:       0xfbbf24,
    episodic:           0x34d399,
    semantic_knowledge: 0x60a5fa,
    long_term_memory:   0x2dd4bf,
    semantic:           0x60a5fa,
    reflection:         0xc084fc,
    interaction:        0xfb7185,
    learning:           0x22d3ee,
    creation:           0xfb923c,
    achievement:        0xa3e635,
    dream:              0xe879f9,
    dream_memory:       0xa78bfa,
    chatlog:           0xf472b6
  };
  const DEFAULT_COLOR = 0x71717a;
  function getMemColor(type) { return MEM_COLORS[type] || DEFAULT_COLOR; }

  // ═══════════════════ INIT ═══════════════════
  document.addEventListener('DOMContentLoaded', () => {
    initEntityPicker();
    initTabs();
    initDiagTabs();
    init3D();
    initSSE();
    initChatPanel();
    initMemoryBrowser();
    initTimelinePanel();
    initDiagnostics();
    loadGraphData();
    loadTraceData();
    loadEntityInfo();

    document.getElementById('btnRefreshGraph').onclick = () => { loadGraphData(); loadTraceData(); };
    document.getElementById('btnCenterGraph').onclick = centerCamera;
    const nodeLimit = document.getElementById('nodeLimit');
    const nodeLimitValue = document.getElementById('nodeLimitValue');
    let nodeLimitTimer = null;
    nodeLimit.addEventListener('input', () => {
      nodeLimitValue.textContent = nodeLimit.value;
      clearTimeout(nodeLimitTimer);
      nodeLimitTimer = setTimeout(() => NeuralViz.setNodeLimit(parseInt(nodeLimit.value)), 400);
    });
    document.getElementById('btnClearFilter').onclick = clearFilter;
    document.getElementById('btnShowAll').onclick = clearFilter;
    document.getElementById('btnFullMind').onclick = loadFullMind;
    document.getElementById('btnLoadChatHistory').onclick = loadChatHistory;
    document.getElementById('btnCloseNodeDetail').onclick = () => { document.getElementById('nodeDetail').style.display = 'none'; };

    // Refresh entity list whenever the visualizer page becomes visible again
    // (e.g. user navigates back to the Visualizer tab in the shell)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshEntityPickerList();
      }
    });
  });

  function setEntitySwitchStatus(text, cls) {
    const el = document.getElementById('vizEntitySwitchStatus');
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('ok', 'err');
    if (cls) el.classList.add(cls);
  }

  // Refresh the entity picker dropdown options without altering the active selection.
  // Called when the visualizer page regains visibility so newly created entities appear.
  async function refreshEntityPickerList() {
    const picker = document.getElementById('vizEntityPicker');
    if (!picker || picker.disabled) return;
    try {
      const [entitiesResp, currentResp] = await Promise.all([
        fetch('/api/entities'),
        fetch('/api/entities/current')
      ]);
      const [entitiesData, currentData] = await Promise.all([
        entitiesResp.json(),
        currentResp.json()
      ]);
      const entities = Array.isArray(entitiesData?.entities) ? entitiesData.entities.slice() : [];
      const currentEntity = currentData?.entity || null;
      if (currentEntity && currentEntity.id && !entities.some((e) => String(e?.id || '') === String(currentEntity.id))) {
        entities.push({ id: currentEntity.id, name: currentEntity.name || currentEntity.id });
      }
      if (!entities.some((e) => String(e?.id || '').toLowerCase() === 'nekocore')) {
        entities.push({ id: 'nekocore', name: 'NekoCore OS' });
      }
      const prevValue = picker.value;
      picker.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select entity';
      picker.appendChild(placeholder);
      for (const entity of entities) {
        if (!entity || !entity.id) continue;
        const opt = document.createElement('option');
        opt.value = entity.id;
        const isSystem = String(entity.id).toLowerCase() === 'nekocore';
        opt.textContent = isSystem ? (entity.name || entity.id) + ' (System)' : (entity.name || entity.id);
        picker.appendChild(opt);
      }
      picker.value = prevValue || selectedEntityId || '';
    } catch { /* silent — refresh is best-effort */ }
  }

  async function initEntityPicker() {
    const picker = document.getElementById('vizEntityPicker');
    if (!picker) return;

    picker.disabled = true;
    setEntitySwitchStatus('Loading...');
    try {
      const [entitiesResp, currentResp] = await Promise.all([
        fetch('/api/entities'),
        fetch('/api/entities/current')
      ]);
      const [entitiesData, currentData] = await Promise.all([
        entitiesResp.json(),
        currentResp.json()
      ]);

      const entities = Array.isArray(entitiesData?.entities) ? entitiesData.entities.slice() : [];
      const currentEntity = currentData?.entity || null;
      if (currentEntity && currentEntity.id && !entities.some((e) => String(e?.id || '') === String(currentEntity.id))) {
        entities.push({
          id: currentEntity.id,
          name: currentEntity.name || currentEntity.id
        });
      }
      if (!entities.some((e) => String(e?.id || '').toLowerCase() === 'nekocore')) {
        entities.push({ id: 'nekocore', name: 'NekoCore OS' });
      }

      picker.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select entity';
      picker.appendChild(placeholder);
      for (const entity of entities) {
        if (!entity || !entity.id) continue;
        const opt = document.createElement('option');
        opt.value = entity.id;
        const isSystem = String(entity.id).toLowerCase() === 'nekocore';
        const label = entity.name || entity.id;
        opt.textContent = isSystem ? label + ' (System)' : label;
        picker.appendChild(opt);
      }

      const currentId = currentData?.entity?.id || currentData?.currentEntityId || null;
      selectedEntityId = currentId || null;
      if (selectedEntityId) {
        picker.value = selectedEntityId;
      } else {
        picker.value = '';
      }
      picker.disabled = false;
      setEntitySwitchStatus(selectedEntityId ? 'Ready' : 'Select entity');

      picker.onchange = async () => {
        const nextId = picker.value;
        if (!nextId || nextId === selectedEntityId) return;
        await switchVisualizerEntity(nextId);
      };

      // Do not auto-load the first entity when no active entity exists.
      // Auto-switch only when the server already has an active entity.
      if (selectedEntityId) {
        await switchVisualizerEntity(selectedEntityId, { forceReload: true, preservePickerState: true });
      }
    } catch (e) {
      setEntitySwitchStatus('Load failed', 'err');
      picker.innerHTML = '<option value="">Unavailable</option>';
      picker.disabled = true;
    }
  }

  async function switchVisualizerEntity(entityId, options = {}) {
    const forceReload = options.forceReload === true;
    const preservePickerState = options.preservePickerState === true;
    const picker = document.getElementById('vizEntityPicker');
    const searchInput = document.getElementById('memorySearchInput');
    const typeFilter = document.getElementById('memoryTypeFilter');
    const sortBy = document.getElementById('memorySortBy');
    if (picker) picker.disabled = true;
    setEntitySwitchStatus('Switching...');

    try {
      const resp = await fetch('/api/entities/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load entity');
      }

      selectedEntityId = entityId;
      if (picker && preservePickerState) {
        picker.value = entityId;
      }
      chatExchanges = [];
      selectedExchangeId = null;
      selectedMemoryId = null;
      focusedNodeId = null;
      filteredNodeIds = null;

      renderChatExchanges();
      await loadEntityInfo();
      await loadChatHistory();
      await searchMemories(searchInput?.value || '', typeFilter?.value || '', sortBy?.value || 'date');
      loadGraphData();
      loadTraceData();
      loadBrainStatus();
      loadNeurochemistry();
      loadGraphStats();

      const filter = document.getElementById('filterIndicator');
      if (filter) filter.style.display = 'none';
      setEntitySwitchStatus('Loaded', 'ok');
    } catch (e) {
      setEntitySwitchStatus('Switch failed', 'err');
      diagLog('events', 'error', 'Entity switch failed: ' + e.message);
      if (picker && selectedEntityId && !forceReload) picker.value = selectedEntityId;
    } finally {
      if (picker) picker.disabled = false;
      setTimeout(() => {
        if (document.getElementById('vizEntitySwitchStatus')?.textContent === 'Loaded') {
          setEntitySwitchStatus('Ready');
        }
      }, 2500);
    }
  }

  // ═══════════════════ TABS ═══════════════════
  function initTabs() {
    document.querySelectorAll('.viz-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.viz-panel-content').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
      });
    });
  }

  function initDiagTabs() {
    document.querySelectorAll('.viz-diag-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.viz-diag-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.viz-diag-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('diag-' + tab.dataset.diag).classList.add('active');
      });
    });
    document.getElementById('btnClearLogs').onclick = () => {
      document.getElementById('diagEventLog').innerHTML = '';
      document.getElementById('diagPhaseLog').innerHTML = '';
    };
  }

  // ═══════════════════ ENTITY INFO ═══════════════════
  async function loadEntityInfo() {
    try {
      const r = await fetch(appendEntityId('/api/entity', selectedEntityId));
      const d = await r.json();
      if (d.ok && d.entity) {
        const name = d.entity.name || 'Entity';
        const avatar = d.entity.avatar || '◇';
        document.getElementById('entityName').textContent = avatar + ' ' + name;
      } else if (!selectedEntityId) {
        document.getElementById('entityName').textContent = '—';
      }
    } catch (e) { /* ignore */ }
  }

  // ═══════════════════ SSE EVENT STREAM ═══════════════════
  function initSSE() {
    if (eventSource) return;
    const statusEl = document.getElementById('sseStatus');

    eventSource = window.RemSSE.connect('/api/brain/events', {
      _open: () => {
        statusEl.textContent = '\u25CF Connected';
        statusEl.classList.add('connected');
        diagLog('events', 'ok', 'SSE stream connected');
      },
      _error: () => {
        statusEl.textContent = '\u25CF Disconnected';
        statusEl.classList.remove('connected');
      },
      _message: (d, e) => {
        if (e.data && e.data !== ':keep-alive') {
          try {
            diagLog('events', 'info', JSON.stringify(d).slice(0, 200));
          } catch (_) {
            diagLog('events', 'info', String(e.data).slice(0, 200));
          }
        }
      },

      // --- Connection confirmation ---
      connected: () => {
        statusEl.textContent = '\u25CF Connected';
        statusEl.classList.add('connected');
        diagLog('events', 'ok', 'SSE stream connected');
      },

      // --- Chat orchestration events ---
      orchestration_start: () => {
        diagLog('phases', 'phase', 'Pipeline starting...');
      },
      phase_start: (d) => {
        const labels = { subconscious: '\u{1F9E0} Subconscious', 'dream+compress': '\u{1F319} Dream+Compress', conscious: '\u{1F4AD} Conscious', orchestrator: '\u26A1 Orchestrator' };
        diagLog('phases', 'phase', (labels[d.phase] || d.phase) + ' \u2014 processing...');
      },
      phase_detail: (d) => {
        diagLog('phases', 'info', d.detail);
      },
      phase_complete: (d) => {
        const labels = { subconscious: '\u{1F9E0} Subconscious', 'dream+compress': '\u{1F319} Dream+Compress', conscious: '\u{1F4AD} Conscious', orchestrator: '\u26A1 Orchestrator' };
        diagLog('phases', 'ok', (labels[d.phase] || d.phase) + ' \u2713 ' + (d.duration || '') + 'ms');
      },
      orchestration_complete: (d) => {
        diagLog('phases', 'ok', 'Pipeline complete \u2014 ' + (d.totalDuration || 0) + 'ms total');
        if (d.tokenUsage?.total) {
          const t = d.tokenUsage.total;
          updateDiagCard('diagTokenUsage', `In: ${t.prompt_tokens}\nOut: ${t.completion_tokens}\nTotal: ${t.total_tokens}`);
        }
        if (d.subconscious || d.conscious || d.dream) {
          updateLatestExchangeThinking({
            subconscious: d.subconscious,
            compressedContext: d.compressedContext,
            conscious: d.conscious,
            dream: d.dream,
            orchestrator: d.orchestrator,
            timing: d.timing,
            tokenUsage: d.tokenUsage
          });
        }
        setTimeout(() => { loadGraphData(); loadTraceData(); }, 2000);
      },

      // --- Brain loop events ---
      brain_cycle_start: (d) => {
        diagLog('events', 'info', 'Brain cycle ' + d.cycleCount + ' (sleep in ' + d.cyclesUntilDeepSleep + ')');
      },
      brain_cycle_complete: (d) => {
        diagLog('events', 'ok', 'Brain cycle ' + d.cycleCount + ' complete');
      },
      brain_phase: (d) => {
        diagLog('events', 'phase', 'Brain phase: ' + d.name + ' \u2014 ' + d.status);
      },
      belief_created: (d) => {
        diagLog('events', 'info', 'Belief: ' + (d.statement || d.belief_id));
      },
      neurochemical_shift: (d) => {
        diagLog('events', 'info', 'Neurochemistry shift: ' + (d.trigger || ''));
        loadNeurochemistry();
      },
      memory_created: (d) => {
        diagLog('events', 'ok', 'Memory created: ' + (d.memory_id || d.id || ''));
        if (chatExchanges.length > 0) {
          const latest = chatExchanges[chatExchanges.length - 1];
          if (d.memory_id || d.id) {
            latest.newMemories = latest.newMemories || [];
            latest.newMemories.push({ id: d.memory_id || d.id, type: d.type || 'episodic' });
            renderChatExchanges();
          }
        }
      },
      memory_accessed: (d) => {
        diagLog('events', 'info', 'Memory accessed: ' + (d.memory_id || ''));
      }
    }, { reconnectDelay: 5000 });
  }

  // ═══════════════════ CHAT PANEL ═══════════════════
  function initChatPanel() {
    // Listen for messages sent from the main UI via BroadcastChannel
    try {
      const bc = new BroadcastChannel('ma-visualizer');
      bc.onmessage = (e) => {
        if (e.data?.type === 'chat_exchange') {
          addChatExchange(e.data);
        }
      };
    } catch (_) { /* BroadcastChannel not supported, fall back to polling */ }
  }

  function addChatExchange(data) {
    const exchange = {
      id: data.id || Date.now(),
      user: data.user || '',
      assistant: data.assistant || '',
      memories: data.memories || [],
      newMemories: data.newMemories || [],
      thinking: data.thinking || null,
      timestamp: data.timestamp || new Date().toISOString()
    };
    chatExchanges.push(exchange);
    renderChatExchanges();
    // Scroll to bottom
    const el = document.getElementById('chatMessages');
    el.scrollTop = el.scrollHeight;
    // Auto-save to server
    saveChatExchange(exchange);
  }

  function saveChatExchange(exchange) {
    fetch('/api/visualizer/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange, entityId: selectedEntityId })
    }).catch(() => {});
  }

  async function loadChatHistory() {
    const statusEl = document.getElementById('chatHistoryStatus');
    statusEl.textContent = 'Loading...';
    try {
      const r = await fetch(appendEntityId('/api/visualizer/chat-history', selectedEntityId));
      const d = await r.json();
      if (d.ok && d.history && d.history.length > 0) {
        // Collect existing IDs to avoid duplicates
        const existingIds = new Set(chatExchanges.map(e => e.id));
        let added = 0;
        for (const ex of d.history) {
          if (!existingIds.has(ex.id)) {
            chatExchanges.push(ex);
            existingIds.add(ex.id);
            added++;
          }
        }
        // Sort by timestamp
        chatExchanges.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        renderChatExchanges();
        statusEl.textContent = added > 0 ? 'Loaded ' + added + ' messages' : 'No new messages';
      } else {
        statusEl.textContent = 'No saved history';
      }
    } catch (e) {
      statusEl.textContent = 'Load failed';
    }
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
  }

  function renderChatExchanges() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    if (chatExchanges.length === 0) {
      container.innerHTML = '<div class="viz-chat-empty">Listening for chat messages...<br><small>Chat in the main UI — messages will appear here</small></div>';
      return;
    }

    for (let idx = 0; idx < chatExchanges.length; idx++) {
      const ex = chatExchanges[idx];
      const exDiv = document.createElement('div');
      exDiv.className = 'viz-exchange' + (selectedExchangeId === ex.id ? ' selected' : '');
      exDiv.dataset.exchangeId = ex.id;

      // ── Exchange header (click to collapse/expand whole exchange) ──
      const header = document.createElement('div');
      header.className = 'viz-exchange-header';
      const timeStr = ex.timestamp ? new Date(ex.timestamp).toLocaleTimeString() : '';
      const preview = (ex.user || '').slice(0, 60) + ((ex.user || '').length > 60 ? '...' : '');
      header.innerHTML = '<span class="viz-exchange-arrow">▾</span>'
        + '<span class="viz-exchange-num">#' + (idx + 1) + '</span>'
        + '<span class="viz-exchange-preview">' + escapeHtml(preview) + '</span>'
        + '<span class="viz-exchange-time">' + escapeHtml(timeStr) + '</span>';
      header.onclick = () => {
        exDiv.classList.toggle('collapsed');
        header.querySelector('.viz-exchange-arrow').textContent = exDiv.classList.contains('collapsed') ? '▸' : '▾';
      };
      exDiv.appendChild(header);

      // ── Exchange body (collapsible) ──
      const body = document.createElement('div');
      body.className = 'viz-exchange-body';

      // User message section
      if (ex.user) {
        body.appendChild(makeCollapsibleSection('👤 You', ex.user, 'user', false, () => selectExchange(ex.id)));
      }

      // Entity message section
      if (ex.assistant) {
        body.appendChild(makeCollapsibleSection('🤖 Entity', ex.assistant, 'assistant', false, () => selectExchange(ex.id)));
      }

      // ── Mind / Pipeline sections ──
      if (ex.thinking) {
        const mindHeader = document.createElement('div');
        mindHeader.className = 'viz-mind-divider';
        mindHeader.textContent = '— Mind Activity —';
        body.appendChild(mindHeader);

        if (ex.thinking.subconscious) {
          const content = typeof ex.thinking.subconscious === 'object'
            ? (ex.thinking.subconscious.reflection || JSON.stringify(ex.thinking.subconscious, null, 2))
            : ex.thinking.subconscious;
          body.appendChild(makeCollapsibleSection('🧠 Subconscious', content, 'subconscious', true));
        }

        if (ex.thinking.compressedContext) {
          const content = typeof ex.thinking.compressedContext === 'object'
            ? JSON.stringify(ex.thinking.compressedContext, null, 2)
            : ex.thinking.compressedContext;
          body.appendChild(makeCollapsibleSection('📋 Compressed Context', content, 'compress', true));
        }

        if (ex.thinking.dream) {
          const content = typeof ex.thinking.dream === 'object'
            ? JSON.stringify(ex.thinking.dream, null, 2)
            : ex.thinking.dream;
          body.appendChild(makeCollapsibleSection('🌙 Dream', content, 'dream', true));
        }

        if (ex.thinking.conscious) {
          const content = typeof ex.thinking.conscious === 'object'
            ? JSON.stringify(ex.thinking.conscious, null, 2)
            : ex.thinking.conscious;
          body.appendChild(makeCollapsibleSection('💭 Conscious', content, 'conscious', true));
        }

        if (ex.thinking.orchestrator) {
          const content = typeof ex.thinking.orchestrator === 'object'
            ? JSON.stringify(ex.thinking.orchestrator, null, 2)
            : ex.thinking.orchestrator;
          body.appendChild(makeCollapsibleSection('⚡ Orchestrator', content, 'orchestrator', true));
        }

        // Timing summary
        if (ex.thinking.timing) {
          const t = ex.thinking.timing;
          const timingText = 'Total: ' + (t.total_ms || 0) + 'ms'
            + ' · Sub: ' + (t.subconscious_ms || 0) + 'ms'
            + ' · Dream+Compress: ' + (t.dream_compress_ms || 0) + 'ms'
            + ' · Conscious: ' + (t.conscious_ms || 0) + 'ms'
            + ' · Orchestrator: ' + (t.orchestrator_ms || 0) + 'ms';
          body.appendChild(makeCollapsibleSection('⏱ Timing', timingText, 'timing', true));
        }

        // Token usage summary
        if (ex.thinking.tokenUsage) {
          const tu = ex.thinking.tokenUsage;
          const fmt = (u) => u ? u.prompt_tokens + ' → ' + u.completion_tokens + ' (' + u.total_tokens + ')' : '—';
          const tokenText = 'Subconscious: ' + fmt(tu.subconscious) + '\n'
            + 'Compress: ' + fmt(tu.compress) + '\n'
            + 'Dream: ' + fmt(tu.dream) + '\n'
            + 'Conscious: ' + fmt(tu.conscious) + '\n'
            + 'Orchestrator: ' + fmt(tu.orchestrator) + '\n'
            + 'Total: ' + fmt(tu.total);
          body.appendChild(makeCollapsibleSection('📊 Token Usage', tokenText, 'tokens', true));
        }
      }

      // Memory buttons
      const allMems = [...(ex.memories || []), ...(ex.newMemories || [])];
      if (allMems.length > 0) {
        const memRow = document.createElement('div');
        memRow.className = 'viz-chat-memories';
        for (const mem of ex.memories || []) {
          memRow.appendChild(createMemoryButton(mem, false));
        }
        for (const mem of ex.newMemories || []) {
          memRow.appendChild(createMemoryButton(mem, true));
        }
        body.appendChild(memRow);
      }

      exDiv.appendChild(body);
      container.appendChild(exDiv);
    }
  }

  /** Create a collapsible section with a toggle header */
  function makeCollapsibleSection(label, content, cssClass, startCollapsed, onHeaderClick) {
    const section = document.createElement('div');
    section.className = 'viz-section viz-section-' + cssClass + (startCollapsed ? ' collapsed' : '');

    const header = document.createElement('div');
    header.className = 'viz-section-header';
    header.innerHTML = '<span class="viz-section-arrow">' + (startCollapsed ? '▸' : '▾') + '</span>'
      + '<span class="viz-section-label">' + label + '</span>';

    const body = document.createElement('div');
    body.className = 'viz-section-body';
    // Use textContent for safety, then convert newlines to <br> for display
    const textEl = document.createElement('div');
    textEl.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    body.appendChild(textEl);
    body.style.whiteSpace = 'pre-wrap';

    header.onclick = (e) => {
      e.stopPropagation();
      section.classList.toggle('collapsed');
      header.querySelector('.viz-section-arrow').textContent = section.classList.contains('collapsed') ? '▸' : '▾';
      if (onHeaderClick && !section.classList.contains('collapsed')) {
        onHeaderClick();
      }
    };

    section.appendChild(header);
    section.appendChild(body);
    return section;
  }

  function createMemoryButton(mem, isNew) {
    const btn = document.createElement('button');
    btn.className = 'viz-mem-btn' + (isNew ? ' new-memory' : '') + (selectedMemoryId === mem.id ? ' active' : '');
    const hexColor = '#' + getMemColor(mem.type).toString(16).padStart(6, '0');
    btn.innerHTML = '<span class="mem-type-dot" style="background:' + hexColor + '"></span>' + (mem.id || '').slice(0, 20);
    btn.title = (isNew ? '✨ New: ' : '') + (mem.semantic || mem.id || '');
    btn.onclick = (e) => {
      e.stopPropagation();
      selectMemory(mem.id);
    };
    return btn;
  }

  function selectExchange(exchangeId) {
    if (selectedExchangeId === exchangeId) {
      // Deselect
      selectedExchangeId = null;
      clearFilter();
      renderChatExchanges();
      return;
    }
    selectedExchangeId = exchangeId;
    const exchange = chatExchanges.find(e => e.id === exchangeId);
    if (!exchange) return;

    // Collect all memory IDs for this exchange
    const memIds = new Set();
    (exchange.memories || []).forEach(m => memIds.add(m.id));
    (exchange.newMemories || []).forEach(m => memIds.add(m.id));

    if (memIds.size > 0) {
      filterToMemories(memIds, 'Exchange ' + new Date(exchange.timestamp).toLocaleTimeString());
    }
    renderChatExchanges();
  }

  function selectMemory(memId) {
    if (selectedMemoryId === memId) {
      selectedMemoryId = null;
      clearFilter();
      renderChatExchanges();
      return;
    }
    selectedMemoryId = memId;

    // Filter to this memory + its trace connections
    const related = new Set([memId]);
    // Look in trace graph for connections
    if (traceGraph[memId]) {
      traceGraph[memId].forEach(conn => related.add(conn.to));
    }
    // Also find incoming connections
    for (const [src, conns] of Object.entries(traceGraph)) {
      for (const c of conns) {
        if (c.to === memId) related.add(src);
      }
    }
    // Also check edge data
    for (const edge of allEdges) {
      if (edge.source === memId) related.add(edge.target);
      if (edge.target === memId) related.add(edge.source);
    }

    filterToMemories(related, memId.slice(0, 25));
    renderChatExchanges();
    showNodeDetail(memId);
  }

  function updateLatestExchangeThinking(innerDialog) {
    if (chatExchanges.length === 0) return;
    const latest = chatExchanges[chatExchanges.length - 1];
    latest.thinking = {
      subconscious: innerDialog.subconscious,
      dream: innerDialog.dream,
      conscious: innerDialog.conscious,
      compressedContext: innerDialog.compressedContext,
      orchestrator: innerDialog.orchestrator,
      timing: innerDialog.timing,
      tokenUsage: innerDialog.tokenUsage
    };
    renderChatExchanges();
    // Auto-save the updated exchange with thinking data
    saveChatExchange(latest);
  }

  // ═══════════════════ MEMORY BROWSER ═══════════════════
  function initMemoryBrowser() {
    const searchBtn = document.getElementById('btnSearchMemories');
    const searchInput = document.getElementById('memorySearchInput');
    const typeFilter = document.getElementById('memoryTypeFilter');
    const sortBy = document.getElementById('memorySortBy');

    const doSearch = () => searchMemories(searchInput.value, typeFilter.value, sortBy.value);
    searchBtn.onclick = doSearch;
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    typeFilter.onchange = doSearch;
    sortBy.onchange = doSearch;

    document.getElementById('btnCloseMemoryDetail').onclick = () => {
      document.getElementById('memoryDetail').style.display = 'none';
    };

    // Load all memories on first open
    searchMemories('', '', 'date');
  }

  async function searchMemories(keyword, type, sort) {
    const listEl = document.getElementById('memoryList');
    listEl.innerHTML = '<div class="viz-memory-empty">Searching...</div>';

    try {
      const params = new URLSearchParams();
      if (keyword) params.set('q', keyword);
      if (type) params.set('type', type);
      if (sort) params.set('sort', sort);
      params.set('limit', '200');
      if (selectedEntityId) params.set('entityId', selectedEntityId);

      const r = await fetch('/api/memories/search?' + params);
      const d = await r.json();
      if (!d.ok || !d.memories?.length) {
        listEl.innerHTML = '<div class="viz-memory-empty">No memories found</div>';
        return;
      }

      listEl.innerHTML = '';
      for (const mem of d.memories) {
        const item = document.createElement('div');
        item.className = 'viz-memory-item';
        item.dataset.memId = mem.id;

        const hexColor = '#' + getMemColor(mem.type).toString(16).padStart(6, '0');
        const dateStr = mem.created ? new Date(mem.created).toLocaleDateString() + ' ' + new Date(mem.created).toLocaleTimeString() : '—';

        let topicsHtml = '';
        if (mem.topics?.length) {
          topicsHtml = '<div class="viz-memory-item-topics">' + mem.topics.slice(0, 6).map(t => '<span class="viz-topic-tag">' + escapeHtml(t) + '</span>').join('') + '</div>';
        }

        const isLTM = mem.type === 'long_term_memory' || mem.type === 'chatlog';
        const isDocKnowledge = mem.type === 'knowledge_memory';
        const reconstructBtn = (isLTM || isDocKnowledge)
          ? '<button class="mem-reconstruct-btn" data-mem-id="' + escapeAttr(mem.id) + '">Reconstruct</button>'
          : '';
        const thumbHtml = mem.imageUrl
          ? '<img class="viz-memory-thumb" src="' + escapeAttr(mem.imageUrl) + '" alt="Memory image" loading="lazy">'
          : '<div class="viz-memory-thumb viz-memory-thumb-empty" title="No image">🖼️</div>';

        item.innerHTML = `
          <div class="viz-memory-item-header">
            <span class="viz-memory-item-type" style="border-left:3px solid ${hexColor}">${escapeHtml(mem.type)}</span>
            <span class="viz-memory-item-date">${dateStr}</span>
          </div>
          <div class="viz-memory-thumb-wrap">${thumbHtml}</div>
          <div class="viz-memory-item-id">${escapeHtml(mem.id)}</div>
          <div class="viz-memory-item-semantic">${escapeHtml(mem.semantic || '(no summary)')}</div>
          ${topicsHtml}
          <div class="viz-memory-item-bar">
            <div class="viz-importance-bar"><div class="viz-importance-bar-fill" style="width:${Math.round(mem.importance * 100)}%;background:${hexColor}"></div></div>
            <button class="mem-show-btn" data-mem-id="${escapeAttr(mem.id)}">Show in Graph</button>
            ${reconstructBtn}
          </div>
        `;

        item.onclick = () => openMemoryDetail(mem.id);
        listEl.appendChild(item);
      }

      // Wire up show-in-graph buttons
      listEl.querySelectorAll('.mem-show-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          selectMemory(btn.dataset.memId);
        };
      });

      // Wire up reconstruct buttons
      listEl.querySelectorAll('.mem-reconstruct-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          reconstructChat(btn.dataset.memId, btn);
        };
      });
    } catch (e) {
      listEl.innerHTML = '<div class="viz-memory-empty">Error: ' + escapeHtml(e.message) + '</div>';
    }
  }

  async function openMemoryDetail(memId) {
    const detailEl = document.getElementById('memoryDetail');
    const bodyEl = document.getElementById('memoryDetailBody');
    const titleEl = document.getElementById('memoryDetailTitle');
    titleEl.textContent = memId;
    bodyEl.innerHTML = 'Loading...';
    detailEl.style.display = 'flex';

    try {
      const params = new URLSearchParams({ id: memId });
      if (selectedEntityId) params.set('entityId', selectedEntityId);
      const r = await fetch('/api/memory/detail?' + params.toString());
      const d = await r.json();
      if (!d.ok) { bodyEl.textContent = 'Error loading memory'; return; }

      let html = '';
      html += '<div class="detail-section"><div class="detail-label">Summary</div><div class="detail-value">' + escapeHtml(d.semantic || '—') + '</div></div>';

      if (d.log) {
        html += '<div class="detail-section"><div class="detail-label">Type</div><div class="detail-value">' + escapeHtml(d.log.type || '—') + '</div></div>';
        html += '<div class="detail-section"><div class="detail-label">Importance / Decay</div><div class="detail-value">' + (d.log.importance || 0).toFixed(3) + ' / ' + (d.log.decay || 0).toFixed(3) + '</div></div>';
        html += '<div class="detail-section"><div class="detail-label">Created</div><div class="detail-value">' + (d.log.created || '—') + '</div></div>';
        if (d.log.topics?.length) {
          html += '<div class="detail-section"><div class="detail-label">Topics</div><div class="detail-value">' + d.log.topics.map(t => '<span class="viz-topic-tag">' + escapeHtml(t) + '</span> ').join('') + '</div></div>';
        }
        if (d.log.emotionalTag) {
          html += '<div class="detail-section"><div class="detail-label">Emotion</div><div class="detail-value">' + escapeHtml(d.log.emotionalTag) + '</div></div>';
        }
      }

      if (d.content) {
        html += '<div class="detail-section"><div class="detail-label">Content</div><div class="detail-value" style="font-size:11px;max-height:200px;overflow:auto">' + escapeHtml(d.content) + '</div></div>';
      }
      if (d.imageUrl) {
        html += '<div class="detail-section"><div class="detail-label">Memory Image</div><div class="detail-value"><img class="viz-memory-detail-image" src="' + escapeAttr(d.imageUrl) + '" alt="Memory image"></div></div>';
      }

      // Related memories (trace connections)
      if (d.related) {
        const outgoing = d.related.outgoing || [];
        const incoming = d.related.incoming || [];
        if (outgoing.length > 0 || incoming.length > 0) {
          html += '<div class="detail-section"><div class="detail-label">Trace Connections</div><div class="detail-related">';
          for (const rel of outgoing) {
            html += '<button class="viz-mem-btn" onclick="window._vizSelectMemory(\'' + escapeAttr(rel.memory_id) + '\')">' + escapeHtml((rel.memory_id || '').slice(0, 20)) + ' →</button>';
          }
          for (const rel of incoming) {
            html += '<button class="viz-mem-btn" onclick="window._vizSelectMemory(\'' + escapeAttr(rel.memory_id) + '\')">← ' + escapeHtml((rel.memory_id || '').slice(0, 20)) + '</button>';
          }
          html += '</div></div>';
        }
      }

      // Reconstruct button for LTM/chatlog
      const isLTM = d.log?.type === 'long_term_memory' || d.log?.type === 'chatlog';
      const isDocKnowledge = d.log?.type === 'knowledge_memory';
      if (isLTM || isDocKnowledge) {
        html += '<div class="detail-section"><div class="detail-label">Reconstruct Content</div><button class="viz-btn-sm" id="detailReconstructBtn">Reconstruct from LLM</button><div id="detailReconstructResult"></div></div>';
      }

      bodyEl.innerHTML = html;

      // Wire reconstruct button
      const rBtn = document.getElementById('detailReconstructBtn');
      if (rBtn) {
        rBtn.onclick = () => reconstructChatInDetail(memId);
      }
    } catch (e) {
      bodyEl.textContent = 'Error: ' + e.message;
    }
  }

  async function reconstructChat(memId, btnEl) {
    if (btnEl) { btnEl.textContent = 'Reconstructing...'; btnEl.disabled = true; }
    try {
      const r = await fetch('/api/memories/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: memId, entityId: selectedEntityId })
      });
      const d = await r.json();
      if (d.ok && d.reconstructed) {
        // Open in memory detail panel
        openMemoryDetail(memId);
        setTimeout(() => {
          const resultEl = document.getElementById('detailReconstructResult');
          if (resultEl) resultEl.innerHTML = '<div class="viz-reconstruct-result">' + escapeHtml(d.reconstructed) + '</div>';
        }, 500);
      } else {
        diagLog('events', 'error', 'Reconstruct failed: ' + (d.error || 'unknown'));
      }
    } catch (e) {
      diagLog('events', 'error', 'Reconstruct error: ' + e.message);
    } finally {
      if (btnEl) { btnEl.textContent = 'Reconstruct'; btnEl.disabled = false; }
    }
  }

  async function reconstructChatInDetail(memId) {
    const resultEl = document.getElementById('detailReconstructResult');
    const btn = document.getElementById('detailReconstructBtn');
    if (!resultEl || !btn) return;
    btn.textContent = 'Reconstructing...';
    btn.disabled = true;
    resultEl.innerHTML = '';

    try {
      const r = await fetch('/api/memories/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: memId, entityId: selectedEntityId })
      });
      const d = await r.json();
      if (d.ok && d.reconstructed) {
        resultEl.innerHTML = '<div class="viz-reconstruct-result">' + escapeHtml(d.reconstructed) + '</div>';
      } else {
        resultEl.textContent = 'Failed: ' + (d.error || 'unknown');
      }
    } catch (e) {
      resultEl.textContent = 'Error: ' + e.message;
    } finally {
      btn.textContent = 'Reconstruct from LLM';
      btn.disabled = false;
    }
  }

  // Expose for inline onclick in detail panel
  window._vizSelectMemory = selectMemory;

  function initTimelinePanel() {
    const speedInput = document.getElementById('timelineSpeed');
    const speedValue = document.getElementById('timelineSpeedValue');
    const btnLoad = document.getElementById('btnTimelineLoad');
    const btnRewindBig = document.getElementById('btnTimelineRewindBig');
    const btnRewind = document.getElementById('btnTimelineRewind');
    const btnStepBack = document.getElementById('btnTimelineStepBack');
    const btnPlay = document.getElementById('btnTimelinePlay');
    const btnPause = document.getElementById('btnTimelinePause');
    const btnStop = document.getElementById('btnTimelineStop');
    const btnStepForward = document.getElementById('btnTimelineStepForward');
    const btnFastForward = document.getElementById('btnTimelineFastForward');
    const btnFastForwardBig = document.getElementById('btnTimelineFastForwardBig');
    const btnSlowMo = document.getElementById('btnTimelineSlowMo');
    const btnSpeedHalf = document.getElementById('btnTimelineSpeedHalf');
    const btnSpeedNormal = document.getElementById('btnTimelineSpeedNormal');
    const btnSpeedFast = document.getElementById('btnTimelineSpeedFast');
    const btnLive = document.getElementById('btnTimelineLive');
    if (!speedInput || !btnLoad || !btnRewindBig || !btnRewind || !btnStepBack || !btnPlay || !btnPause || !btnStop || !btnStepForward || !btnFastForward || !btnFastForwardBig || !btnSlowMo || !btnSpeedHalf || !btnSpeedNormal || !btnSpeedFast || !btnLive) return;

    speedInput.oninput = () => {
      timelineSpeed = Math.max(0.25, Number(speedInput.value || 1));
      speedValue.textContent = timelineSpeed.toFixed(2) + 'x';
    };

    btnLoad.onclick = loadTimelineRecords;
    btnRewindBig.onclick = () => jumpTimeline(-50);
    btnRewind.onclick = () => jumpTimeline(-10);
    btnStepBack.onclick = () => stepTimeline(-1);
    btnPlay.onclick = playTimeline;
    btnPause.onclick = pauseTimeline;
    btnStop.onclick = stopTimeline;
    btnStepForward.onclick = () => stepTimeline(1);
    btnFastForward.onclick = () => jumpTimeline(10);
    btnFastForwardBig.onclick = () => jumpTimeline(50);
    btnSlowMo.onclick = () => setTimelineSpeedPreset(0.25);
    btnSpeedHalf.onclick = () => setTimelineSpeedPreset(0.5);
    btnSpeedNormal.onclick = () => setTimelineSpeedPreset(1);
    btnSpeedFast.onclick = () => setTimelineSpeedPreset(2);
    btnLive.onclick = toggleTimelineLive;

    bindTimelineKeyboardShortcuts();
  }

  function bindTimelineKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (e.repeat) return;

      const target = e.target;
      const tag = target && target.tagName ? String(target.tagName).toUpperCase() : '';
      const isTypingField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable);
      if (isTypingField) return;

      const panel = document.getElementById('panel-timeline');
      if (!panel || !panel.classList.contains('active')) return;

      e.preventDefault();
      if (timelineTimer) pauseTimeline();
      else playTimeline();
    });
  }

  async function loadTimelineRecords() {
    const limitEl = document.getElementById('timelineLimit');
    const limit = Math.max(50, Math.min(5000, parseInt((limitEl && limitEl.value) || '600', 10)));
    setTimelineStatus('Loading timeline...');
    try {
      const r = await fetch('/api/timeline?limit=' + encodeURIComponent(limit));
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'timeline load failed');

      timelineRecords = Array.isArray(d.records) ? d.records : [];
      timelineCursor = 0;
      renderTimelineLog();

      const meta = document.getElementById('timelineMeta');
      if (meta) {
        const first = timelineRecords[0] ? new Date(timelineRecords[0].ts).toLocaleString() : '—';
        const last = timelineRecords[timelineRecords.length - 1] ? new Date(timelineRecords[timelineRecords.length - 1].ts).toLocaleString() : '—';
        meta.textContent = 'Records: ' + timelineRecords.length + ' | First: ' + first + ' | Last: ' + last;
      }

      setTimelineStatus('Loaded ' + timelineRecords.length + ' records');
      diagLog('events', 'ok', 'Timeline loaded: ' + timelineRecords.length + ' records');
    } catch (e) {
      setTimelineStatus('Load failed');
      diagLog('events', 'error', 'Timeline load error: ' + e.message);
    }
  }

  function playTimeline() {
    if (!timelineRecords.length) {
      loadTimelineRecords().then(() => {
        if (timelineRecords.length) playTimeline();
      });
      return;
    }
    if (timelineTimer) return;

    // On fresh start (cursor at beginning) enter playback mode — hides all nodes
    // so they appear one-by-one as the timeline advances.
    if (timelineCursor === 0 && NeuralViz && typeof NeuralViz.enterPlaybackMode === 'function') {
      NeuralViz.enterPlaybackMode();
    }

    setTimelineStatus('Playing');
    const tick = () => {
      if (timelineCursor >= timelineRecords.length) {
        pauseTimeline();
        setTimelineStatus('Playback complete');
        return;
      }

      const rec = timelineRecords[timelineCursor];
      applyTimelineRecord(rec, timelineCursor, false);
      timelineCursor++;

      const delayMs = computeTimelineDelayMs();
      timelineTimer = setTimeout(tick, delayMs);
    };

    tick();
  }

  function pauseTimeline() {
    if (timelineTimer) {
      clearTimeout(timelineTimer);
      timelineTimer = null;
    }
    setTimelineStatus('Paused');
  }

  function stopTimeline() {
    pauseTimeline();
    timelineCursor = 0;
    renderTimelineLog();
    setTimelineStatus('Stopped');
    // Restore all nodes to normal visibility
    if (NeuralViz && typeof NeuralViz.exitPlaybackMode === 'function') {
      NeuralViz.exitPlaybackMode();
    }
  }

  function stepTimeline(direction) {
    if (!timelineRecords.length) return;
    pauseTimeline();

    if (direction < 0) {
      timelineCursor = Math.max(0, timelineCursor - 1);
      renderTimelineLog();
      highlightTimelineLine(timelineCursor);
      setTimelineStatus('Step back to ' + (timelineCursor + 1) + '/' + timelineRecords.length);
      return;
    }

    if (timelineCursor >= timelineRecords.length) {
      setTimelineStatus('End of timeline');
      return;
    }

    const idx = timelineCursor;
    applyTimelineRecord(timelineRecords[idx], idx, false);
    timelineCursor = Math.min(timelineRecords.length, timelineCursor + 1);
    setTimelineStatus('Step forward to ' + timelineCursor + '/' + timelineRecords.length);
  }

  function jumpTimeline(delta) {
    if (!timelineRecords.length) return;
    pauseTimeline();

    timelineCursor = Math.max(0, Math.min(timelineRecords.length - 1, timelineCursor + delta));
    renderTimelineLog();
    highlightTimelineLine(timelineCursor);

    if (delta < 0) {
      setTimelineStatus('Rewound to ' + (timelineCursor + 1) + '/' + timelineRecords.length);
    } else {
      setTimelineStatus('Fast-forwarded to ' + (timelineCursor + 1) + '/' + timelineRecords.length);
    }
  }

  function setTimelineSpeedPreset(speed) {
    const value = Math.max(0.25, Math.min(4, Number(speed) || 1));
    timelineSpeed = value;

    const speedInput = document.getElementById('timelineSpeed');
    const speedValue = document.getElementById('timelineSpeedValue');
    if (speedInput) speedInput.value = String(value);
    if (speedValue) speedValue.textContent = timelineSpeed.toFixed(2) + 'x';

    setTimelineStatus('Speed set to ' + timelineSpeed.toFixed(2) + 'x');
  }

  // Slower base (900ms at 1x speed) makes playback feel like a movie.
  // At 2x → ~450ms, slow-mo (0.25x) → ~3600ms.
  function computeTimelineDelayMs() {
    return Math.max(150, Math.round(900 / Math.max(0.25, timelineSpeed)));
  }

  function toggleTimelineLive() {
    const btnLive = document.getElementById('btnTimelineLive');
    if (!btnLive) return;

    if (timelineLiveSse) {
      timelineLiveSse.close();
      timelineLiveSse = null;
      // Clear any queued animations that haven't played yet
      _liveQueue = [];
      _liveQueueRunning = false;
      btnLive.textContent = 'Live SSE';
      setTimelineStatus('Live stream disconnected');
      return;
    }

    try {
      timelineLiveSse = new EventSource('/api/timeline/stream?tail=80');
      btnLive.textContent = 'Stop Live';
      setTimelineStatus('Live stream connected');

      timelineLiveSse.addEventListener('timeline', (e) => {
        try {
          const rec = JSON.parse(e.data);
          timelineRecords.push(rec);
          if (timelineRecords.length > 2500) {
            timelineRecords = timelineRecords.slice(-2500);
            timelineCursor = Math.max(0, timelineCursor - 1);
          }
          // Queue the record so animations play back-to-back at a watchable pace
          _enqueueLiveRecord(rec);
        } catch (_) {}
      });

      timelineLiveSse.onerror = () => {
        setTimelineStatus('Live stream reconnecting...');
      };
    } catch (e) {
      setTimelineStatus('Live stream failed');
      diagLog('events', 'error', 'Timeline stream error: ' + e.message);
    }
  }

  function applyTimelineRecord(rec, idx, appendOnly) {
    if (!rec) return;

    if (!appendOnly) highlightTimelineLine(idx);
    else appendTimelineLine(rec, idx, true);

    const type = String(rec.type || '');
    const payload = rec.payload || {};
    const event = payload.event || payload;

    if (type.indexOf('thought.') === 0 && event && event.type && NeuralViz && typeof NeuralViz.handleBrainEvent === 'function') {
      NeuralViz.handleBrainEvent(event);
    }

    const memoryId = event.memory_id || event.target_id || event.memId || payload.memory_id || payload.memId || null;
    // In playback mode revealNode births the node with animation; in live mode it flashes it.
    if (memoryId && NeuralViz) {
      if (typeof NeuralViz.revealNode === 'function') {
        NeuralViz.revealNode(memoryId);
      } else if (typeof NeuralViz.flashNode === 'function') {
        NeuralViz.flashNode(memoryId, NeuralViz._colors && NeuralViz._colors.nodeActive, 0.9);
      }
      if (typeof NeuralViz.selectNodeById === 'function') NeuralViz.selectNodeById(memoryId);
    }

    // Use slower trace animation in live mode so the path is clearly visible
    const liveTraceOpts = appendOnly ? { stepDuration: 2.0, particleSize: 0.22 } : null;

    const directPath = Array.isArray(event.path) ? event.path : (Array.isArray(payload.path) ? payload.path : null);
    if (directPath && directPath.length >= 2 && NeuralViz && typeof NeuralViz.animateTrace === 'function') {
      NeuralViz.animateTrace(directPath.slice(0, 8), liveTraceOpts);
    }

    if (type === 'trace.updated' && payload.memory_id && Array.isArray(payload.retrievedIds) && payload.retrievedIds.length > 0) {
      const trace = [payload.memory_id].concat(payload.retrievedIds.slice(0, 4));
      if (NeuralViz && typeof NeuralViz.animateTrace === 'function') NeuralViz.animateTrace(trace, liveTraceOpts);
    }

    if ((type === 'thought.memory_decay_tick' || type === 'memory_decay_tick') && Array.isArray(event.samples)) {
      const hotColor = NeuralViz && NeuralViz._colors ? NeuralViz._colors.nodeHot : 0xf87171;
      event.samples.slice(0, 5).forEach((s, n) => {
        setTimeout(() => {
          if (NeuralViz && typeof NeuralViz.flashNode === 'function' && s.id) {
            NeuralViz.flashNode(s.id, hotColor, 0.7);
          }
        }, n * 90);
      });
    }

    if (type === 'memory.core.created' || type === 'memory.semantic.created') {
      const createdId = payload.memId || payload.memory_id || null;
      if (createdId && NeuralViz && typeof NeuralViz.debouncedGraphReload === 'function') {
        NeuralViz.debouncedGraphReload(createdId);
      }
    }
  }

  function renderTimelineLog() {
    const logEl = document.getElementById('timelineLog');
    if (!logEl) return;
    logEl.innerHTML = '';

    if (!timelineRecords.length) {
      logEl.innerHTML = '<div class="viz-timeline-empty">No timeline records loaded.</div>';
      return;
    }

    const start = Math.max(0, timelineCursor - 180);
    const end = Math.min(timelineRecords.length, start + 220);
    for (let i = start; i < end; i++) {
      appendTimelineLine(timelineRecords[i], i, i === timelineCursor);
    }
  }

  function appendTimelineLine(rec, idx, active) {
    const logEl = document.getElementById('timelineLog');
    if (!logEl || !rec) return;
    const line = document.createElement('div');
    line.className = 'viz-timeline-line' + (active ? ' active' : '');
    line.dataset.idx = String(idx);
    const t = rec.ts ? new Date(rec.ts).toLocaleTimeString() : '—';
    const summary = summarizeTimelineRecord(rec);
    line.innerHTML = '<span class="ts">' + escapeHtml(t) + '</span><span class="txt">' + escapeHtml(summary) + '</span>';
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function highlightTimelineLine(idx) {
    const logEl = document.getElementById('timelineLog');
    if (!logEl) return;
    logEl.querySelectorAll('.viz-timeline-line.active').forEach((el) => el.classList.remove('active'));
    const hit = logEl.querySelector('.viz-timeline-line[data-idx="' + idx + '"]');
    if (hit) {
      hit.classList.add('active');
      hit.scrollIntoView({ block: 'nearest' });
      return;
    }
    renderTimelineLog();
  }

  function summarizeTimelineRecord(rec) {
    const type = String(rec.type || 'unknown');
    const payload = rec.payload || {};
    const event = payload.event || payload;
    if (type === 'chat.user_message') return 'User: ' + String(payload.userMessage || '').slice(0, 90);
    if (type === 'chat.assistant_response') return 'Assistant response len=' + String(payload.responseLength || 0);
    if (type === 'memory.recall.completed') return 'Recall selected=' + String(payload.selectedCount || 0);
    if (type === 'trace.updated') return 'Trace updated id=' + String(payload.traceId || '');
    if (type === 'memory.core.created' || type === 'memory.semantic.created') return type + ' ' + String(payload.memId || payload.memory_id || '');
    if (type === 'thought.memory_decay_tick' || type === 'memory_decay_tick') return 'Decay tick Δ=' + String(event.totalDecayDelta || 0);
    if (type.indexOf('thought.') === 0) return 'Thought: ' + String(event.type || type).slice(0, 80);
    return type;
  }

  // ── Live event queue ──────────────────────────────────────────
  // Events from SSE are buffered here and replayed with a 500ms gap so the
  // 3D trace animations have time to run before the next event overwrites them.
  function _enqueueLiveRecord(rec) {
    _liveQueue.push(rec);
    if (!_liveQueueRunning) _processLiveQueue();
  }

  function _processLiveQueue() {
    if (!_liveQueue.length) { _liveQueueRunning = false; return; }
    _liveQueueRunning = true;
    const rec = _liveQueue.shift();
    applyTimelineRecord(rec, timelineRecords.length - _liveQueue.length, true);
    setTimeout(_processLiveQueue, 500);
  }

  function setTimelineStatus(text) {
    const el = document.getElementById('timelineStatus');
    if (el) el.textContent = text;
  }

  // ═══════════════════ DIAGNOSTICS ═══════════════════
  function initDiagnostics() {
    loadBrainStatus();
    loadNeurochemistry();
    loadGraphStats();
    // Refresh system cards periodically
    setInterval(() => {
      loadBrainStatus();
      loadNeurochemistry();
      loadGraphStats();
    }, 30000);
  }

  function diagLog(target, cls, text) {
    const logId = target === 'phases' ? 'diagPhaseLog' : 'diagEventLog';
    const log = document.getElementById(logId);
    if (!log) return;
    const line = document.createElement('div');
    line.className = 'viz-diag-line ' + cls;
    const now = new Date();
    line.innerHTML = '<span class="viz-diag-time">' + now.toLocaleTimeString() + '</span><span class="viz-diag-category">' + escapeHtml(cls) + '</span><span class="viz-diag-text">' + escapeHtml(text) + '</span>';
    log.appendChild(line);
    // Keep max 500 lines
    while (log.children.length > 500) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  function updateDiagCard(cardId, text) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.querySelector('.viz-diag-card-body').textContent = text;
  }

  async function loadBrainStatus() {
    try {
      const r = await fetch(appendEntityId('/api/brain/status', selectedEntityId));
      const d = await r.json();
      let text = 'Running: ' + (d.running ? 'Yes' : 'No');
      text += '\nCycles: ' + (d.cycleCount || 0);
      text += '\nSleep: ' + (d.cyclesUntilDeepSleep || '—');
      if (d.memoryStats) text += '\nMemories: ' + (d.memoryStats.total || 0);
      updateDiagCard('diagBrainStatus', text);
    } catch (e) { updateDiagCard('diagBrainStatus', 'Error: ' + e.message); }
  }

  async function loadNeurochemistry() {
    try {
      const r = await fetch(appendEntityId('/api/neurochemistry', selectedEntityId));
      const d = await r.json();
      if (d.ok && d.state) {
        const s = d.state;
        let text = '';
        for (const [k, v] of Object.entries(s)) {
          if (typeof v === 'number') text += k + ': ' + v.toFixed(3) + '\n';
        }
        updateDiagCard('diagNeuroState', text || 'No data');
      }
    } catch (e) { updateDiagCard('diagNeuroState', 'Error: ' + e.message); }
  }

  async function loadGraphStats() {
    try {
      const r = await fetch(appendEntityId('/api/memory-graph/stats', selectedEntityId));
      const d = await r.json();
      let text = 'Nodes: ' + (d.node_count || 0);
      text += '\nConnections: ' + (d.connection_count || 0);
      text += '\nAvg Activation: ' + (d.average_activation || 0).toFixed(3);
      text += '\nAvg Emotion: ' + (d.average_emotion || 0).toFixed(3);
      if (d.top_topics?.length) text += '\nTop Topics: ' + d.top_topics.slice(0, 5).map(t => t.topic).join(', ');
      updateDiagCard('diagGraphStats', text);
    } catch (e) { updateDiagCard('diagGraphStats', 'Error: ' + e.message); }
  }

  // ═══════════════════ 3D VISUALIZATION (delegated to NeuralViz) ═══════════
  function init3D() {
    NeuralViz.init(document.getElementById('vizContainer'));

    // Clicking a node in the 3D view pauses both timeline playback and live mode,
    // so the user can inspect a node without animations overwriting their selection.
    window.onNeuralNodeSelected = function(/* memId */) {
      if (timelineTimer) pauseTimeline();
      // Stop live queue so no new events come in while inspecting
      if (_liveQueueRunning) {
        _liveQueueRunning = false;
        _liveQueue = [];
        setTimelineStatus('Paused (node selected — click Stop Live to disconnect)');
      }
    };
  }

  function loadGraphData() {
    NeuralViz.loadGraphData(selectedEntityId);
  }

  async function loadFullMind() {
    const btn = document.getElementById('btnFullMind');
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;
    try {
      await NeuralViz.loadFromUrl(appendEntityId('/api/memory-graph/full-mind', selectedEntityId), selectedEntityId);
      filteredNodeIds = null;
      document.getElementById('filterIndicator').style.display = 'none';
      diagLog('events', 'ok', '🧠 Full Mind loaded');
    } catch (e) {
      diagLog('events', 'error', 'Full mind load error: ' + e.message);
    } finally {
      btn.textContent = '🧠 Full Mind';
      btn.disabled = false;
    }
  }

  function loadTraceData() { /* handled internally by NeuralViz */ }

  // ═══════════════════ FILTERING ═══════════════════
  function filterToMemories(memIds, label) {
    filteredNodeIds = memIds instanceof Set ? memIds : new Set(memIds);
    NeuralViz.filterNodes(filteredNodeIds);
    document.getElementById('filterLabel').textContent = 'Showing: ' + label + ' (' + filteredNodeIds.size + ')';
    document.getElementById('filterIndicator').style.display = 'flex';
  }

  function clearFilter() {
    filteredNodeIds = null;
    selectedExchangeId = null;
    selectedMemoryId = null;
    focusedNodeId = null;
    NeuralViz.clearFilter();
    NeuralViz.loadGraphData(selectedEntityId);
    document.getElementById('filterIndicator').style.display = 'none';
    renderChatExchanges();
  }

  function centerCamera() { NeuralViz.resetCamera(); }

  // ═══════════════════ NODE DETAIL PANEL ═══════════════════
  function showNodeDetail(memId) { NeuralViz.selectNodeById(memId); }

  // ═══════════════════ HELPERS ═══════════════════
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
