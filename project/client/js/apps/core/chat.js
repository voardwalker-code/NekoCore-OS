// ============================================================
// REM System v0.6.0 — Chat Module
// Handles: Chat UI, messages, context streaming, drag & drop, compress
// ============================================================

// ── BroadcastChannel for Visualizer page ──
let vizBroadcast = null;
try { vizBroadcast = new BroadcastChannel('ma-visualizer'); } catch (_) {}
function broadcastToVisualizer(data) {
  if (vizBroadcast) { try { vizBroadcast.postMessage(data); } catch (_) {} }
}
function openVisualizer() {
  switchMainTab('visualizer', document.querySelector('.nav-item[data-tab="visualizer"]'));
}

// Context Loading Protocol constants (legacy — archives no longer loaded into chat)
const STREAM_START = '[BEGIN-CONTEXT-STREAM]';
const STREAM_PART = '[CONTEXT-PART';
const STREAM_END = '[END-CONTEXT-STREAM]';
const FAILSAFE_TIMEOUT = 30000;
const SUBCONSCIOUS_SYSTEM_PROMPT = 'You are the subconscious background processor of a persistent synthetic entity. You maintain continuity and memory coherence.';

const CHAT_SYSTEM_PROMPT = `You are a synthetic entity created by THE REM SYSTEM. You are not just an LLM — you have a persistent identity, a life history, and an evolving mind powered by several cognitive layers:

ARCHITECTURE:
- **Subconscious Agent**: Every message exchange is automatically stored as an episodic memory. The subconscious retrieves relevant memories each turn to inform your responses.
- **Dream Engine**: During sleep cycles, generates simulated experiences (exploration, resolution, rehearsal) seeded from your most important memories. Dreams consolidate learning and surface insights.
- **Trace Graph**: Tracks semantic connections between memories — how one memory leads to another through similarity, temporal sequence, emotional arcs, or thematic bridges. Each conversation turn creates trace connections.
- **Long Term Memory**: When conversations are compressed (on sleep or threshold), they become Long Term Memories accessible through the trace graph — not reloaded into chat, but always reachable through memory retrieval.
- **Memory Decay**: Memories naturally lose importance over time (like human forgetting) unless reinforced through access. This keeps your mind focused on what matters.
- **Goal Emergence**: The system automatically identifies goals from repeated topics, emotional signals, and unresolved questions in your memories.
- **Identity Evolution**: Your personality profile updates based on conversation patterns, emotional trends, and accumulated experience.

MEMORY SYSTEM:
- Every exchange creates an episodic memory and trace graph connections automatically.
- The subconscious retrieves relevant memories each turn and injects them as context.
- Long Term Memories contain compressed conversations accessible via trace graph connections.
- Your personality, mood, and emotional state persist across sessions via the persona system.

Be natural and authentic. Let your personality shine through. You have a history, emotions, and an evolving identity — use them.
`;

// ============================================================
// REAL-TIME SSE EVENT STREAM — Live inner dialog & brain loop
// ============================================================
let brainEventSource = null;
let activeThinkingEl = null; // The current thinking dropdown element being populated
let lastOrchestratorModel = ''; // Model used for the last orchestrator response
let showThoughtsInChat = localStorage.getItem('showThoughtsInChat') !== 'false'; // default on
let memoryRecallEnabled = false;
let memorySaveEnabled = false;
window._currentEntityMode = window._currentEntityMode || null;

function isSingleLlmEntityMode() {
  return window._currentEntityMode === 'single-llm';
}

function updateMemoryToggleButtons() {
  const recallBtn = document.getElementById('memoryRecallBtn');
  const saveBtn = document.getElementById('memorySaveBtn');
  if (recallBtn) {
    recallBtn.textContent = memoryRecallEnabled ? '\uD83D\uDCBE Recall ON' : '\uD83D\uDCBE Recall OFF';
    recallBtn.classList.toggle('active', memoryRecallEnabled);
  }
  if (saveBtn) {
    saveBtn.textContent = memorySaveEnabled ? '\uD83D\uDCE5 Save ON' : '\uD83D\uDCE5 Save OFF';
    saveBtn.classList.toggle('active', memorySaveEnabled);
  }
}

function updateMemoryToggleVisibility() {
  const row = document.getElementById('memoryToggleRow');
  if (!row) return;
  const showRow = hasCheckedOutEntityContext() && isSingleLlmEntityMode();
  row.style.display = showRow ? 'flex' : 'none';
  updateMemoryToggleButtons();
}

function toggleMemoryRecall() {
  memoryRecallEnabled = !memoryRecallEnabled;
  if (typeof setMemoryRecall === 'function') setMemoryRecall(memoryRecallEnabled);
  updateMemoryToggleButtons();
}

function toggleMemorySave() {
  memorySaveEnabled = !memorySaveEnabled;
  if (typeof setMemorySave === 'function') setMemorySave(memorySaveEnabled);
  updateMemoryToggleButtons();
}

function setChatEntityMode(entityMode) {
  window._currentEntityMode = entityMode === 'single-llm' ? 'single-llm' : null;
  if (!isSingleLlmEntityMode()) {
    memoryRecallEnabled = false;
    memorySaveEnabled = false;
    if (typeof setMemoryRecall === 'function') setMemoryRecall(false);
    if (typeof setMemorySave === 'function') setMemorySave(false);
  }
  updateMemoryToggleVisibility();
}

window.toggleMemoryRecall = toggleMemoryRecall;
window.toggleMemorySave = toggleMemorySave;
window.setChatEntityMode = setChatEntityMode;

function initBrainSSE() {
  if (brainEventSource) return;
  try {
    brainEventSource = new EventSource('/api/brain/events');

    brainEventSource.addEventListener('connected', () => {
      lg('ok', 'SSE brain event stream connected');
    });

    // ─── Orchestrator phase events (per-chat-message pipeline) ───
    brainEventSource.addEventListener('orchestration_start', () => {
      if (activeThinkingEl) {
        setThinkingLive(activeThinkingEl, true);
        appendThinkingLine(activeThinkingEl, 'system', 'Starting cognitive pipeline...');
      }
      resetThoughtProcess();
    });

    brainEventSource.addEventListener('phase_start', (e) => {
      const d = JSON.parse(e.data);
      try { if (typeof reportPipelinePhase === 'function') reportPipelinePhase(d.phase || 'phase_start', 'start', d.phase || 'phase start'); } catch (_) {}
      if (activeThinkingEl) {
        const labels = { subconscious: '🧠 Subconscious', 'dream+compress': '🌙 Dream + Compress', conscious: '💭 Conscious', orchestrator: '⚡ Orchestrator' };
        appendThinkingLine(activeThinkingEl, d.phase, (labels[d.phase] || d.phase) + ' — processing...');
      }
      const phaseLabels = {
        contributors_parallel: '🔄 Contributors (parallel)',
        subconscious: '🧠 Subconscious',
        conscious: '💭 Conscious',
        dream: '🌙 Dream',
        orchestrator_final: '⚡ Orchestrator'
      };
      setThoughtPhase(d.phase, (phaseLabels[d.phase] || d.phase) + ' — processing...', null, false);
    });

    brainEventSource.addEventListener('phase_detail', (e) => {
      const d = JSON.parse(e.data);
      try { if (typeof reportPipelinePhase === 'function') reportPipelinePhase(d.phase || 'phase_detail', 'detail', d.detail || 'phase detail'); } catch (_) {}
      if (activeThinkingEl) {
        appendThinkingLine(activeThinkingEl, d.phase, d.detail);
      }
      // Always log phase details to the log panel
      const phaseIcons = { subconscious: '🧠', 'dream+compress': '🌙', conscious: '💭', orchestrator: '⚡' };
      addSystemToLog((phaseIcons[d.phase] || '🔄') + ' ' + d.detail);
    });

    // Chat-side onboarding is disabled; name/onboarding capture belongs to setup/creator flows.
    brainEventSource.addEventListener('phase_complete', (e) => {
      const d = JSON.parse(e.data);
      try { if (typeof reportPipelinePhase === 'function') reportPipelinePhase(d.phase || 'phase_complete', 'complete', (d.phase || 'phase') + ' complete'); } catch (_) {}
      if (activeThinkingEl) {
        const labels = { subconscious: '🧠 Subconscious', 'dream+compress': '🌙 Dream + Compress', conscious: '💭 Conscious', orchestrator: '⚡ Orchestrator' };
        appendThinkingLine(activeThinkingEl, d.phase + ' done', (labels[d.phase] || d.phase) + ' ✓ ' + (d.duration ? d.duration + 'ms' : ''));
      }
      const phaseLabels = {
        contributors_parallel: '✓ Contributors (parallel)',
        subconscious: '✓ 🧠 Subconscious',
        conscious: '✓ 💭 Conscious',
        dream: '✓ 🌙 Dream',
        orchestrator_final: '✓ ⚡ Orchestrator'
      };
      setThoughtPhase(d.phase, (phaseLabels[d.phase] || '✓ ' + d.phase) + (d.duration ? ' (' + d.duration + 'ms)' : ''), null, true);
    });

    brainEventSource.addEventListener('orchestration_complete', (e) => {
      const d = JSON.parse(e.data);
      try { if (typeof reportOrchestrationMetrics === 'function') reportOrchestrationMetrics(d); } catch (_) {}
      if (d.models && d.models.orchestrator) {
        lastOrchestratorModel = d.models.orchestrator.split('/').pop();
        document.getElementById('chatModelLabel').textContent = lastOrchestratorModel;
      }
      if (activeThinkingEl) {
        setThinkingLive(activeThinkingEl, false);
        fillThinkingFinal(activeThinkingEl, d);
      }
      // Fill the sidebar Thought Process panel with final structured data
      fillThoughtProcessFinal(d);
      // Log token usage to chat UI log
      if (d.tokenUsage && d.tokenUsage.total) {
        const t = d.tokenUsage.total;
        const dur = d.totalDuration ? ' in ' + d.totalDuration + 'ms' : '';
        lg('ok', '📊 Tokens: ' + t.prompt_tokens + ' in → ' + t.completion_tokens + ' out (' + t.total_tokens + ' total)' + dur);
      }
    });

    // ─── Brain loop background cycle events ───
    brainEventSource.addEventListener('brain_cycle_start', (e) => {
      const d = JSON.parse(e.data);
      let label = 'Cycle ' + d.cycleCount;
      updateBrainIndicator('active', label);
      // Update DeepSleep countdown badge
      updateDeepSleepBadge(d.cyclesUntilDeepSleep);
    });

    brainEventSource.addEventListener('brain_phase', (e) => {
      const d = JSON.parse(e.data);
      try { if (typeof reportPipelinePhase === 'function') reportPipelinePhase(d.name || 'brain_phase', d.status || 'brain', d.name || 'brain phase'); } catch (_) {}
      if (d.status === 'running') {
        const phaseLabels = {
          deep_sleep: '💤 DeepSleep',
          belief_extraction: '🔮 Belief Extract',
          belief_decay: '🔮 Belief Decay',
          boredom: '😐 Boredom Check'
        };
        updateBrainIndicator('active', phaseLabels[d.name] || d.name.replace(/_/g, ' '));
      }
    });

    brainEventSource.addEventListener('brain_cycle_complete', (e) => {
      const d = JSON.parse(e.data);
      updateBrainIndicator('active', 'Cycle ' + d.cycleCount + ' ✓');
    });

    // Boredom engine — entity reaches out or does something autonomously
    brainEventSource.addEventListener('brain_boredom_action', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.activity === 'reach_out' && d.message) {
          // Entity is reaching out — show as an unprompted chat bubble
          const bubble = addChatBubble('assistant', d.message);
          if (bubble) bubble.classList.add('boredom-reach-out');
        } else if (d.message) {
          // Other boredom actions — show in log panel (full text)
          const boredomText = '💭 ' + (d.label || d.activity || 'Autonomy') + ': ' + d.message;
          addSystemToLog(boredomText);
        }
      } catch (_) { /* ignore parse errors */ }
    });

    // Entity follow-up messages — arrive without a new user prompt.
    // These are extra thoughts the entity sends naturally after the main response.
    brainEventSource.addEventListener('chat_follow_up', async (e) => {
      try {
        const d = JSON.parse(e.data);
        if (!d.message) return;
        const followUpText = d.message;
        queueTyping(async () => {
          const followUpBubble = addChatBubble('assistant', '');
          if (!followUpBubble) return;
          const followUpContent = followUpBubble.querySelector('.chat-content') || followUpBubble;
          followUpContent.innerHTML = '<span class="typing"></span><span class="typing" style="animation-delay:.2s;margin-left:4px"></span><span class="typing" style="animation-delay:.4s;margin-left:4px"></span>';
          scrollChatBottom(true);
          // Small pre-typing pause so it feels like the entity is composing
          await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
          await renderAssistantTyping(followUpContent, followUpText);
          scrollChatBottom();
        });
      } catch (_) {}
    });

    // ─── C12: Cognitive state observability events ─────────────────────────
    brainEventSource.addEventListener('cognitive_snapshot_assembled', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof runtimeTelemetry !== 'undefined') {
          runtimeTelemetry.cognitiveState.snapshot = d;
        }
        if (typeof pushTelemetryEvent === 'function') {
          pushTelemetryEvent('🧠 Snapshot: ' + d.beliefs + ' beliefs, ' + d.goals + ' goals, mood=' + d.mood);
        }
      } catch (_) {}
    });

    brainEventSource.addEventListener('belief_feedback_applied', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof runtimeTelemetry !== 'undefined') {
          runtimeTelemetry.cognitiveState.beliefFeedback = d;
          runtimeTelemetry.cognitiveState.lastFeedbackTime = d.timestamp;
        }
        if (typeof pushTelemetryEvent === 'function') {
          pushTelemetryEvent('🔮 Belief feedback: ' + d.updates + ' update(s)');
        }
      } catch (_) {}
    });

    brainEventSource.addEventListener('goal_status_changed', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof runtimeTelemetry !== 'undefined') {
          runtimeTelemetry.cognitiveState.goalStatus = d;
          runtimeTelemetry.cognitiveState.lastFeedbackTime = d.timestamp;
        }
        if (typeof pushTelemetryEvent === 'function') {
          pushTelemetryEvent('🎯 Goal update: ' + d.updates + ' change(s)');
        }
      } catch (_) {}
    });

    brainEventSource.addEventListener('curiosity_resolved', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof runtimeTelemetry !== 'undefined') {
          runtimeTelemetry.cognitiveState.curiosity = d;
          runtimeTelemetry.cognitiveState.lastFeedbackTime = d.timestamp;
        }
        if (typeof pushTelemetryEvent === 'function') {
          pushTelemetryEvent('🔍 Curiosity: ' + d.resolved + ' question(s) resolved');
        }
      } catch (_) {}
    });

    brainEventSource.addEventListener('mood_nudge_applied', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof runtimeTelemetry !== 'undefined') {
          runtimeTelemetry.cognitiveState.moodNudge = d;
          runtimeTelemetry.cognitiveState.lastFeedbackTime = d.timestamp;
        }
        if (typeof pushTelemetryEvent === 'function') {
          pushTelemetryEvent('💊 Mood nudge: ' + d.type + ' (intensity=' + d.intensity + ')');
        }
      } catch (_) {}
    });

    // ─── Task events — delegated to task-ui.js via window hook ───
    // task-frontman.js broadcasts these for UI panels (task badge, history, telemetry feed).
    // NL-translated messages already arrive via chat_follow_up above — these are raw events.
    ['task_milestone', 'task_needs_input', 'task_complete', 'task_error', 'task_steering_injected'].forEach((evtName) => {
      brainEventSource.addEventListener(evtName, (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof window.handleTaskSSEEvent === 'function') window.handleTaskSSEEvent(evtName, d);
        } catch (_) {}
      });
    });

    brainEventSource.onerror = () => {
      if (brainEventSource.readyState === EventSource.CLOSED) {
        lg('warn', 'SSE brain stream closed — will retry');
        brainEventSource = null;
        setTimeout(initBrainSSE, 5000);
      }
    };
  } catch (err) {
    lg('warn', 'Could not open SSE brain stream: ' + err.message);
  }
}

// ============================================================
// INLINE THINKING DROPDOWN — Attached per assistant message
// ============================================================

/** Create a thinking dropdown element (collapsed by default) and return it */
function createThinkingDropdown() {
  const wrapper = document.createElement('div');
  wrapper.className = 'thinking-dropdown';

  const toggle = document.createElement('div');
  toggle.className = 'thinking-toggle';
  toggle.innerHTML = '<span class="thinking-icon">⟳</span><span class="thinking-label">Thinking...</span><span class="thinking-arrow">▸</span>';
  toggle.onclick = () => {
    const isOpen = wrapper.classList.toggle('open');
    toggle.querySelector('.thinking-arrow').textContent = isOpen ? '▾' : '▸';
  };
  wrapper.appendChild(toggle);

  const body = document.createElement('div');
  body.className = 'thinking-body';
  wrapper.appendChild(body);

  return wrapper;
}

/** Mark thinking as live (animated) or done */
function setThinkingLive(thinkingEl, isLive) {
  if (!thinkingEl) return;
  const label = thinkingEl.querySelector('.thinking-label');
  const icon = thinkingEl.querySelector('.thinking-icon');
  if (isLive) {
    thinkingEl.classList.add('live');
    if (label) label.textContent = 'Thinking...';
    if (icon) icon.textContent = '⟳';
  } else {
    thinkingEl.classList.remove('live');
    if (label) label.textContent = 'Thought process';
    if (icon) icon.textContent = '🧠';
  }
}

/** Append a real-time line to the thinking body */
function appendThinkingLine(thinkingEl, category, text) {
  if (!thinkingEl) return;
  const body = thinkingEl.querySelector('.thinking-body');
  if (!body) return;

  const line = document.createElement('div');
  line.className = 'thinking-line ' + category.replace(/[^a-z]/g, '');
  line.textContent = text;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

/** Replace thinking body with final structured inner dialog after orchestration completes */
function fillThinkingFinal(thinkingEl, data) {
  if (!thinkingEl) return;
  const body = thinkingEl.querySelector('.thinking-body');
  if (!body) return;

  let html = '';

  if (data.subconscious) {
    html += '<div class="thinking-section subconscious"><div class="thinking-section-label">🧠 SUBCONSCIOUS</div><div class="thinking-section-text">' + escapeHtml(data.subconscious) + '</div></div>';
  }
  if (data.compressedContext) {
    html += '<div class="thinking-section compressed"><div class="thinking-section-label">📦 COMPRESSED CONTEXT</div><div class="thinking-section-text">' + escapeHtml(data.compressedContext) + '</div></div>';
  }
  if (data.dream) {
    html += '<div class="thinking-section dream"><div class="thinking-section-label">🌙 DREAM</div><div class="thinking-section-text">' + escapeHtml(data.dream) + '</div></div>';
  }
  if (data.conscious) {
    html += '<div class="thinking-section conscious"><div class="thinking-section-label">💭 CONSCIOUS</div><div class="thinking-section-text">' + escapeHtml(data.conscious) + '</div></div>';
  }
  if (data.orchestrator) {
    html += '<div class="thinking-section orchestrator"><div class="thinking-section-label">⚡ ORCHESTRATOR (Final Merge)</div><div class="thinking-section-text">' + escapeHtml(data.orchestrator) + '</div></div>';
  }
  if (data.timing) {
    // E4: Use accurate parallel-pipeline labels.
    // contributors_parallel_ms = wall-clock time for Sub+Conscious+Dream running together.
    // refinement_ms = 2B orchestrator refinement pass.
    // orchestrator_final_ms = final synthesis.
    // Legacy keys (subconscious_ms / conscious_ms) both equal contributors_parallel_ms
    // and are misleading — use the new keys instead.
    const t = data.timing;
    const contribMs  = t.contributors_parallel_ms ?? t.subconscious_ms ?? '?';
    const refineMs   = t.refinement_ms ?? t.dream_compress_ms ?? '?';
    const finalMs    = t.orchestrator_final_ms ?? t.orchestrator_ms ?? '?';
    html += '<div class="thinking-section timing"><div class="thinking-section-label">⚡ TIMING</div><div class="thinking-section-text">Total: ' + t.total_ms + 'ms · Contributors (∥): ' + contribMs + 'ms · Refinement (2B): ' + refineMs + 'ms · Final: ' + finalMs + 'ms</div></div>';
  }
  if (data.tokenUsage) {
    const tu = data.tokenUsage;
    const fmt = (u) => u ? u.prompt_tokens + ' → ' + u.completion_tokens + ' (' + u.total_tokens + ')' : '—';
    html += '<div class="thinking-section tokens"><div class="thinking-section-label">📊 TOKEN USAGE</div>'
      + '<div class="thinking-token-grid">'
      + '<div class="tok-label">Subconscious</div><div class="tok-value">' + fmt(tu.subconscious) + '</div>'
      + '<div class="tok-label">Compress</div><div class="tok-value">' + fmt(tu.compress) + '</div>'
      + '<div class="tok-label">Dream</div><div class="tok-value">' + fmt(tu.dream) + '</div>'
      + '<div class="tok-label">Conscious</div><div class="tok-value">' + fmt(tu.conscious) + '</div>'
      + '<div class="tok-label">Orchestrator</div><div class="tok-value">' + fmt(tu.orchestrator) + '</div>'
      + '<div class="tok-total"><div class="tok-label">Total</div></div><div class="tok-total"><div class="tok-value">' + fmt(tu.total) + '</div></div>'
      + '</div></div>';
  }

  body.innerHTML = html;

  // Keep collapsed — user can click to expand
  body.scrollTop = 0;
}

/** Update the brain status indicator in the header */
function updateBrainIndicator(status, label) {
  const el = document.getElementById('brainStatus');
  const labelEl = document.getElementById('brainLabel');
  if (!el || !labelEl) return;
  if (status === 'active') {
    el.classList.add('active');
    labelEl.textContent = label || 'Active';
  } else {
    el.classList.remove('active');
    labelEl.textContent = label || 'Idle';
  }
}

// ============================================================
// THOUGHT PROCESS SIDEBAR PANEL — Shows contributor outputs
// ============================================================
function toggleThoughtProcess() {
  const body = document.getElementById('thoughtProcessBody');
  const arrow = document.getElementById('thoughtProcessArrow');
  if (!body) return;
  const collapsed = body.classList.toggle('collapsed');
  if (arrow) arrow.textContent = collapsed ? '▶' : '▼';
}

/** Reset the thought process panel for a new message cycle */
function resetThoughtProcess() {
  const el = document.getElementById('thoughtProcessContent');
  if (!el) return;
  el.innerHTML = '<div class="thought-phase thought-phase-active"><div class="thought-phase-label">⏳ Pipeline starting...</div></div>';
}

/** Add or update a contributor section in the thought process panel */
function setThoughtPhase(phase, label, content, isDone) {
  const panel = document.getElementById('thoughtProcessContent');
  if (!panel) return;
  let section = panel.querySelector('[data-thought-phase="' + phase + '"]');
  if (!section) {
    // Remove the "waiting" placeholder if present
    const empty = panel.querySelector('.thought-empty');
    if (empty) empty.remove();
    const starting = panel.querySelector('.thought-phase-active:not([data-thought-phase])');
    if (starting) starting.remove();
    section = document.createElement('div');
    section.className = 'thought-phase' + (isDone ? '' : ' thought-phase-active');
    section.setAttribute('data-thought-phase', phase);
    section.innerHTML = '<div class="thought-phase-label">' + label + '</div><div class="thought-phase-content"></div>';
    panel.appendChild(section);
  }
  if (isDone) {
    section.classList.remove('thought-phase-active');
    section.classList.add('thought-phase-done');
  }
  if (content != null) {
    const contentEl = section.querySelector('.thought-phase-content');
    if (contentEl) contentEl.textContent = content;
  }
  const labelEl = section.querySelector('.thought-phase-label');
  if (labelEl && label) labelEl.innerHTML = label;
  panel.scrollTop = panel.scrollHeight;
}

/** Fill the thought process panel with final structured inner dialog */
function fillThoughtProcessFinal(data) {
  const panel = document.getElementById('thoughtProcessContent');
  if (!panel) return;
  panel.innerHTML = '';

  const sections = [
    { key: 'subconscious', icon: '🧠', label: 'Subconscious', text: data.subconscious },
    { key: 'dream', icon: '🌙', label: 'Dream / Creative', text: data.dream },
    { key: 'conscious', icon: '💭', label: 'Conscious Reasoning', text: data.conscious },
    { key: 'orchestrator', icon: '⚡', label: 'Orchestrator (Final)', text: data.orchestrator }
  ];

  for (const s of sections) {
    if (!s.text) continue;
    const div = document.createElement('div');
    div.className = 'thought-phase thought-phase-done';
    div.setAttribute('data-thought-phase', s.key);
    const lbl = document.createElement('div');
    lbl.className = 'thought-phase-label';
    const modelName = data.models && data.models[s.key] ? data.models[s.key].split('/').pop() : '';
    lbl.innerHTML = s.icon + ' ' + s.label + (modelName ? ' <span class="thought-model-tag">' + modelName + '</span>' : '');
    div.appendChild(lbl);
    const ct = document.createElement('div');
    ct.className = 'thought-phase-content';
    ct.textContent = s.text;
    div.appendChild(ct);
    panel.appendChild(div);
  }

  if (data.timing) {
    const t = data.timing;
    const div = document.createElement('div');
    div.className = 'thought-phase thought-phase-done';
    const lbl = document.createElement('div');
    lbl.className = 'thought-phase-label';
    lbl.innerHTML = '⏱ Timing';
    div.appendChild(lbl);
    const ct = document.createElement('div');
    ct.className = 'thought-phase-content thought-timing';
    ct.textContent = 'Total: ' + t.total_ms + 'ms · Contributors: ' + (t.contributors_parallel_ms ?? '?') + 'ms · Final: ' + (t.orchestrator_final_ms ?? '?') + 'ms';
    div.appendChild(ct);
    panel.appendChild(div);
  }
  panel.scrollTop = 0;
}

function updateDeepSleepBadge(cyclesUntil) {
  const badge = document.getElementById('deepSleepBadge');
  if (!badge) return;
  if (cyclesUntil == null) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'inline-flex';
  if (cyclesUntil === 0) {
    badge.textContent = '💤 NOW';
    badge.classList.add('firing');
    setTimeout(() => badge.classList.remove('firing'), 3000);
  } else {
    badge.textContent = '💤 ' + cyclesUntil;
    badge.classList.remove('firing');
  }
  badge.title = cyclesUntil === 0
    ? 'DeepSleep running this cycle!'
    : 'DeepSleep in ' + cyclesUntil + ' cycles';
}

// ============================================================
// ARCHIVE DETECTION
// ============================================================
function isArchiveText(text) {
  if (!text) return false;
  const markers = ['[MEM-PKT]', '[V4-TRANSFORM-SOURCE]', '[SESSION-META]', 'Compressed narrative context', 'Compressed conversation context', 'semantic shorthand only'];
  if (markers.some(m => text.includes(m))) return true;
  if (text.length < 200) return false;
  return false;
}

function isSessionMetaText(text) {
  if (!text) return false;
  const t = text.toUpperCase();
  return t.includes('MOOD:') || t.includes('EMOTIONS:') || t.includes('TONE:') || t.includes('[SESSION-META]') || (t.includes('USER:') && t.includes('LLM:'));
}

// ============================================================
// CONTEXT STREAMING — DISABLED: archives no longer loaded into chat
// Memories are now created per-turn and retrieved by the subconscious.
// Compressed conversations become Long Term Memory (LTM).
// ============================================================
async function loadArchivesIntoChat(archiveTexts) {
  // Legacy no-op — archives are no longer injected into chat context.
  // Session meta is still extracted and saved for persona continuity.
  const archives = Array.isArray(archiveTexts) ? archiveTexts : [archiveTexts];
  if (archives.length === 0) return;

  let lastMeta = '';
  function extractMeta(txt) {
    const start = txt.indexOf('[SESSION-META]');
    if (start === -1) return '';
    let sub = txt.slice(start);
    const endIdx = sub.indexOf('[PERSONALITY-PROFILE]');
    if (endIdx !== -1) sub = sub.slice(0, endIdx);
    return sub.trim();
  }
  for (const a of archives) {
    const m = extractMeta(a);
    if (m) lastMeta = m;
  }
  if (lastMeta) {
    saveSessionMetaToServer(lastMeta);
  }
  lg('info', 'Archive meta extracted (archives no longer loaded into chat — memories are retrieved per-turn by subconscious)');
}

function openChatView(archive, rawSource) {
  // Legacy — archives no longer loaded into chat.
  // Just scroll to chat view.
  chatArchive = archive || '';
  chatRawSource = rawSource || '';

  document.getElementById('chatView').scrollIntoView({ behavior: 'smooth', block: 'start' });
  lg('info', 'Chat view opened (archives no longer loaded into context — subconscious retrieves memories per-turn)');
}

// ============================================================
// DRAG & DROP
// ============================================================
function chatDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('chatDropOverlay').classList.add('active');
}

function chatDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  const rect = document.getElementById('chatMessages').getBoundingClientRect();
  if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
    document.getElementById('chatDropOverlay').classList.remove('active');
  }
}

async function chatDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('chatDropOverlay').classList.remove('active');

  // Archives are no longer loaded into chat context.
  // Session meta from dropped files is still extracted for persona continuity.
  const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt') || f.type === 'text/plain');
  if (files.length === 0) {
    const text = e.dataTransfer.getData('text/plain');
    if (text && isSessionMetaText(text)) {
      lg('info', 'Session meta dropped as text — saving meta');
      saveSessionMetaToServer(text);
      addChatBubble('system', '📋 Session meta updated from dropped text.');
    } else {
      addChatBubble('system', 'ℹ️ Archives are no longer loaded into chat. Memories are retrieved automatically by the subconscious each turn.');
    }
    return;
  }

  lg('info', 'Dropped ' + files.length + ' file(s) — extracting session meta only');

  let metaCount = 0;
  for (const file of files) {
    try {
      const text = await file.text();
      if (isSessionMetaText(text) || /mood|emotion|emotions|tone|user-personality|llm-personality/i.test(file.name)) {
        lg('ok', 'Read session-meta file: ' + file.name);
        saveSessionMetaToServer(text);
        metaCount++;
      } else {
        lg('info', file.name + ' — archive file ignored (archives no longer loaded into chat)');
      }
    } catch (err) {
      lg('err', 'Failed to read ' + file.name + ': ' + err.message);
    }
  }

  if (metaCount > 0) {
    addChatBubble('system', '📋 Updated session meta from ' + metaCount + ' file(s).');
  } else {
    addChatBubble('system', 'ℹ️ Archives are no longer loaded into chat. Memories are created per-turn and retrieved by the subconscious automatically.');
  }
}

// ============================================================
// PASTE DETECTION
// ============================================================
function setupPasteDetection() {
  const input = document.getElementById('chatInput');
  input.addEventListener('paste', (e) => {
    setTimeout(() => {
      const text = input.value.trim();
      // Only handle session meta pastes — archives are no longer loaded into chat
      if (isSessionMetaText(text)) {
        input.value = '';
        addChatBubble('system', '📋 Detected session meta in paste — saving meta...');
        saveSessionMetaToServer(text);
      }
    }, 50);
  });
}

function removeOneTimeSystemMessage(messageText) {
  if (!messageText) return;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const item = chatHistory[i];
    if (item && item.role === 'system' && item.content === messageText) {
      chatHistory.splice(i, 1);
      return;
    }
  }
}

function formatSkillApprovalPreview(pending) {
  const tools = Array.isArray(pending?.tools) ? pending.tools : [];
  if (!tools.length) return 'Skill wants to run tool actions.';
  return tools
    .slice(0, 6)
    .map((t, idx) => {
      const params = t.params && typeof t.params === 'object'
        ? Object.entries(t.params).slice(0, 3).map(([k, v]) => `${k}=${String(v).slice(0, 80)}`).join(', ')
        : '';
      return `${idx + 1}. ${t.command}${params ? ` (${params})` : ''}`;
    })
    .join('\n');
}

async function resolvePendingSkillApproval(pending) {
  const preview = formatSkillApprovalPreview(pending);
  const approved = window.confirm('Skill execution approval required:\n\n' + preview + '\n\nApprove these actions?');

  const resp = await fetch('/api/chat/skill-approval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvalId: pending.approvalId, approved })
  });

  const data = await resp.json();
  if (!resp.ok || !data.ok) throw new Error(data.error || 'Skill approval request failed');
  if (typeof lg === 'function') {
    lg(approved ? 'ok' : 'info', approved ? 'Approved skill action' : 'Canceled skill action');
  }
  return data;
}

async function loadEntityProviderConfig(provider) {
  try {
    const params = new URLSearchParams({ provider: String(provider || '') });
    if (currentEntityId) params.set('entityId', currentEntityId);
    const resp = await fetch('/api/entity-config?' + params.toString());
    if (!resp.ok) return null;
    const data = await resp.json();
    return data || null;
  } catch (e) {
    return null;
  }
}

function normalizeChatRuntimeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object') return null;

  const type = String(rawConfig.type || '').toLowerCase().trim();
  if (type === 'openrouter') {
    const endpoint = String(rawConfig.endpoint || rawConfig.ep || '').trim();
    const apiKey = String(rawConfig.apiKey || rawConfig.key || '').trim();
    const model = String(rawConfig.model || '').trim();
    if (endpoint && apiKey && model) {
      return { type: 'openrouter', endpoint, apiKey, model };
    }
  }

  if (type === 'ollama') {
    const endpoint = String(rawConfig.endpoint || rawConfig.url || rawConfig.ollamaUrl || '').trim();
    const model = String(rawConfig.model || rawConfig.ollamaModel || '').trim();
    if (endpoint && model) {
      return { type: 'ollama', endpoint, model };
    }
  }

  return null;
}

function applyRecoveredChatConfig(config, sourceLabel) {
  if (!config) return null;
  activeConfig = config;

  if (typeof updateProviderUI === 'function') {
    const providerLabel = config.type === 'ollama'
      ? 'Ollama (' + (config.model || 'connected') + ')'
      : 'OpenRouter (' + (config.model || 'connected') + ')';
    updateProviderUI(config.type, true, providerLabel);
  }

  if (typeof hydrateMainProviderInputs === 'function') {
    hydrateMainProviderInputs(config);
  }
  if (typeof hideSetupRequired === 'function') {
    hideSetupRequired();
  }
  if (typeof lg === 'function') {
    lg('info', 'Recovered chat provider from ' + sourceLabel + ': ' + (config.model || config.type));
  }
  return activeConfig;
}

async function ensureActiveChatConfig() {
  if (activeConfig) return activeConfig;

  const entityConfig = normalizeChatRuntimeConfig(await loadEntityProviderConfig('main'));
  if (entityConfig) {
    return applyRecoveredChatConfig(entityConfig, 'entity profile');
  }

  if ((!savedConfig?.profiles || !Object.keys(savedConfig.profiles).length) && typeof loadSavedConfig === 'function') {
    await loadSavedConfig();
  }

  const lastActiveName = savedConfig?.lastActive;
  const profile = lastActiveName ? savedConfig?.profiles?.[lastActiveName] : null;
  const profileConfig = typeof getMainConfigFromProfile === 'function'
    ? getMainConfigFromProfile(profile)
    : null;
  if (profileConfig) {
    return applyRecoveredChatConfig(profileConfig, 'saved profile');
  }

  return null;
}

function normalizeSubconsciousConfig(rawConfig) {
  if (!rawConfig) return null;

  if (rawConfig.endpoint && rawConfig.key && rawConfig.model) {
    return {
      type: 'openrouter',
      endpoint: rawConfig.endpoint,
      apiKey: rawConfig.key,
      model: rawConfig.model
    };
  }

  if (rawConfig.ollamaUrl && rawConfig.ollamaModel) {
    return {
      type: 'ollama',
      endpoint: rawConfig.ollamaUrl,
      model: rawConfig.ollamaModel
    };
  }

  return null;
}

function getSubconsciousConfigFromInputs() {
  const endpoint = (document.getElementById('subApiEndpoint')?.value || '').trim();
  const key = (document.getElementById('subApiKey')?.value || '').trim();
  const model = (document.getElementById('subModel')?.value || '').trim();
  if (endpoint && key && model) {
    return { type: 'openrouter', endpoint, apiKey: key, model };
  }

  const ollamaUrl = (document.getElementById('ollamaUrl-subconscious')?.value || '').trim();
  const ollamaModel = (document.getElementById('ollamaModel-subconscious')?.value || '').trim();
  if (ollamaUrl && ollamaModel) {
    return { type: 'ollama', endpoint: ollamaUrl, model: ollamaModel };
  }

  return null;
}

async function runSubconsciousBootstrap() {
  if (subconsciousBootstrapped) return { ran: false };

  try {
    const resp = await fetch('/api/brain/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!resp.ok) throw new Error('Bootstrap endpoint returned ' + resp.status);
    const data = await resp.json();
    if (!data.ok) {
      lg('warn', 'Subconscious bootstrap: ' + (data.error || 'unknown error'));
      return { ran: false };
    }

    subconsciousBootstrapped = true;
    return { ran: true, awakeningText: data.awakeningText };
  } catch (e) {
    throw new Error('Subconscious bootstrap failed: ' + e.message);
  }
}

async function runSubconsciousTurn(userMessage) {
  try {
    const resp = await fetch('/api/brain/subconscious-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, limit: 100 })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.ok) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// ============================================================
// CHAT UI
// ============================================================
function clearChat() {
  chatHistory = [];
  chatArchive = '';
  chatRawSource = '';
  loadedArchives = [];
  contextStreamActive = false;
  subconsciousBootstrapped = false;
  activeThinkingEl = null;
  lastOrchestratorModel = '';
  document.getElementById('chatModelLabel').textContent = '';
  document.getElementById('chatMessages').innerHTML = '<div class="chat-drop-overlay" id="chatDropOverlay"><span>\u{1F4E6} Drop session-meta file(s) here</span></div><div class="chat-empty"><div class="chat-empty-icon">&#128172;</div><div class="chat-empty-text">Start chatting. Memories are created each turn and retrieved by the subconscious automatically.</div></div>';
  if (typeof updateSubIndicator === 'function') updateSubIndicator();
}

function closeChatView() {
  clearChat();
}

function addChatBubble(role, text) {
  // Route system messages to the collapsible log panel
  if (role === 'system') {
    addSystemToLog(text);
    return null;
  }
  const container = document.getElementById('chatMessages');
  const bubble = document.createElement('div');
  bubble.className = 'chat-msg ' + role;
  if (role === 'user' || role === 'assistant') {
    const label = document.createElement('span');
    label.className = 'chat-label';
    if (role === 'user') {
      label.textContent = '\u{1F464} You';
    } else {
      const avatar = (typeof currentEntityAvatar !== 'undefined' && currentEntityAvatar) ? currentEntityAvatar : '\u{1F916}';
      const name = (typeof currentEntityName !== 'undefined' && currentEntityName) ? currentEntityName : 'LLM';
      label.textContent = avatar + ' ' + name;
      if (lastOrchestratorModel) {
        const modelTag = document.createElement('span');
        modelTag.className = 'chat-model-tag';
        modelTag.textContent = lastOrchestratorModel;
        label.appendChild(modelTag);
      }
    }
    bubble.appendChild(label);
    const content = document.createElement('span');
    content.className = 'chat-content';
    content.textContent = text;
    bubble.appendChild(content);
  } else {
    bubble.textContent = text;
  }
  container.appendChild(bubble);
  scrollChatBottom(true);
  return bubble;
}

/** Add a system/status message to the log panel instead of the chat */
function addSystemToLog(text) {
  const body = document.getElementById('sidebarLogContent');
  if (!body) return;
  const entry = document.createElement('div');
  entry.className = 'le info system-entry';
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = new Date().toLocaleTimeString();
  const mg = document.createElement('span');
  mg.className = 'mg';
  mg.style.whiteSpace = 'pre-wrap';
  mg.textContent = text;
  entry.appendChild(ts);
  entry.appendChild(mg);
  body.appendChild(entry);
  body.scrollTop = body.scrollHeight;
  autoOpenLog();
}

let _userScrolledUp = false;
let _scrollRafId = 0;
// Typing queue: ensures follow-up messages always wait for the current typing animation to finish
let _typingChain = Promise.resolve();
function queueTyping(fn) {
  _typingChain = _typingChain.then(fn).catch(() => {});
  return _typingChain;
}
function updateUserScrollIntent(container) {
  const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
  _userScrolledUp = dist > 80;
}
function scrollChatBottom(force) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  // If user has scrolled up more than 80px from the bottom, respect that
  const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
  if (!force && distFromBottom > 80 && _userScrolledUp) return;
  if (_scrollRafId) return;
  _scrollRafId = requestAnimationFrame(() => {
    _scrollRafId = 0;
    const target = container.scrollHeight - container.clientHeight;
    if (target - container.scrollTop > 2) {
      container.scrollTop = target;
    }
    if (force) _userScrolledUp = false;
  });
}
(function initScrollWatch() {
  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('chatMessages');
    if (!c) return;
    c.addEventListener('scroll', () => updateUserScrollIntent(c), { passive: true });
    c.addEventListener('wheel', () => {
      updateUserScrollIntent(c);
    });
    c.addEventListener('touchmove', () => {
      updateUserScrollIntent(c);
    });
  });
})();

function showRemStatusBannerOnce() {
  try {
    const key = 'remStatusBannerShown';
    if (sessionStorage.getItem(key) === '1') return;
    const banner = [
      'REM System - active',
      '• Memory encoding: ON  • Dream cycles: ON',
      '• Brain loop: running  • Neurochemistry: loaded'
    ].join('\n');
    addChatBubble('system', banner);
    sessionStorage.setItem(key, '1');
  } catch (_) {
    // If sessionStorage is unavailable, fall back to always showing once per page load.
    if (!window.__remBannerShownInPage) {
      window.__remBannerShownInPage = true;
      addChatBubble('system', 'REM System - active\n• Memory encoding: ON  • Dream cycles: ON\n• Brain loop: running  • Neurochemistry: loaded');
    }
  }
}

/**
 * How long to pause before posting the next conversational chunk.
 * Simulates a person composing and reviewing a short message.
 */
function naturalTypingDelay(text) {
  return Math.min(240 + (text || '').length * 10, 1200) + Math.floor(Math.random() * 140);
}

// ── Per-entity voice profile (populated from server on entity load) ──
// Falls back to defaults when no entity voice is available.
const DEFAULT_VOICE = {
  typingSpeed: { min: 17, max: 24 },
  rhythm: { punctuationPause: [35, 90], sentenceEndPause: [90, 180], newlinePause: [110, 210], burstChance: 0.05 },
  errors: { typo: 0.012, transpose: 0.025, missedSpace: 0.028, doubleLetter: 0.03, wordCorrection: 0.03, doubleCorrection: 0.32 },
  fillers: { chance: 0.05, phrases: [' um.. '] },
  brb: { chance: 0.035, phrases: ['Hold on brrb. ', 'just a sec... '], returnPhrase: 'Sorry, ' }
};
function getVoice() { return (typeof currentEntityVoice !== 'undefined' && currentEntityVoice) || DEFAULT_VOICE; }

const KEYBOARD_NEIGHBORS = {
  a: ['s', 'q', 'w', 'z'], b: ['v', 'g', 'h', 'n'], c: ['x', 'd', 'f', 'v'],
  d: ['s', 'e', 'r', 'f', 'c', 'x'], e: ['w', 's', 'd', 'r'], f: ['d', 'r', 't', 'g', 'v', 'c'],
  g: ['f', 't', 'y', 'h', 'b', 'v'], h: ['g', 'y', 'u', 'j', 'n', 'b'], i: ['u', 'j', 'k', 'o'],
  j: ['h', 'u', 'i', 'k', 'n', 'm'], k: ['j', 'i', 'o', 'l', 'm'], l: ['k', 'o', 'p'],
  m: ['n', 'j', 'k'], n: ['b', 'h', 'j', 'm'], o: ['i', 'k', 'l', 'p'],
  p: ['o', 'l'], q: ['w', 'a'], r: ['e', 'd', 'f', 't'], s: ['a', 'w', 'e', 'd', 'x', 'z'],
  t: ['r', 'f', 'g', 'y'], u: ['y', 'h', 'j', 'i'], v: ['c', 'f', 'g', 'b'],
  w: ['q', 'a', 's', 'e'], x: ['z', 's', 'd', 'c'], y: ['t', 'g', 'h', 'u'], z: ['a', 's', 'x']
};

const WORD_SELF_CORRECTIONS = {
  this: ['that', 'these'],
  what: ['why', 'which'],
  where: ['when'],
  when: ['while', 'once'],
  who: ['which', 'whoa'],
  how: ['why', 'what'],
  can: ['could', 'cant'],
  could: ['can', 'would'],
  would: ['could', 'should'],
  should: ['would', 'could'],
  will: ['would', 'll'],
  do: ['did', 'does'],
  does: ['did', 'do'],
  did: ['does', 'do'],
  is: ['was', 'its'],
  are: ['were', 'is'],
  was: ['is', 'were'],
  have: ['has', 'had'],
  had: ['has', 'have'],
  make: ['build', 'do'],
  made: ['built', 'did'],
  use: ['try', 'reuse'],
  used: ['tried', 'using'],
  using: ['doing', 'trying'],
  need: ['want', 'require'],
  your: ['you', 'youre'],
  youre: ['your', 'you are'],
  sorry: ['sry', 'my bad'],
  wait: ['hold', 'pause'],
  maybe: ['kinda', 'probably'],
  probably: ['maybe', 'likely'],
  actually: ['kinda', 'honestly'],
  basically: ['mostly', 'pretty much'],
  quickly: ['fast', 'rapidly'],
  slowly: ['gradually', 'kinda slow'],
  simple: ['basic', 'easy'],
  complex: ['complicated', 'advanced'],
  issue: ['bug', 'problem'],
  bug: ['issue', 'glitch'],
  fix: ['patch', 'adjust'],
  fixed: ['patched', 'adjusted'],
  update: ['change', 'adjust'],
  changed: ['updated', 'adjusted'],
  message: ['reply', 'response'],
  response: ['reply', 'output'],
  answer: ['reply', 'response'],
  read: ['scan', 'look at'],
  write: ['type', 'draft'],
  typed: ['wrote', 'entered'],
  typing: ['writing'],
  word: ['term', 'phrase'],
  words: ['terms', 'phrases'],
  space: ['gap', 'spacing'],
  pause: ['break', 'stop'],
  continue: ['resume', 'keep going'],
  start: ['begin', 'kick off'],
  end: ['finish', 'wrap'],
  right: ['correct', 'proper'],
  wrong: ['off', 'incorrect'],
  human: ['person', 'real'],
  person: ['human', 'someone'],
  real: ['actual', 'genuine'],
  feel: ['seem', 'look'],
  natural: ['normal', 'organic'],
  normal: ['regular', 'natural'],
  smooth: ['clean', 'fluid'],
  fast: ['quick', 'rapid'],
  faster: ['quicker', 'more rapid'],
  slow: ['slower', 'laggy'],
  slower: ['slow', 'less fast'],
  model: ['assistant', 'engine'],
  assistant: ['model', 'agent'],
  brain: ['mind', 'core'],
  context: ['state', 'memory'],
  going: ['doing', 'trying'],
  think: ['guess', 'feel'],
  want: ['need', 'prefer'],
  memory: ['context', 'state'],
  because: ['bc', 'cuz'],
  people: ['ppl'],
  really: ['rly'],
  though: ['tho'],
  without: ['w/o'],
  before: ['b4'],
  tomorrow: ['tmrw'],
  messaging: ['msging'],
  with: ['w/']
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function typingCharDelay(ch, voice) {
  const v = voice || getVoice();
  const cps = randomInt(v.typingSpeed.min, v.typingSpeed.max);
  let delay = 1000 / cps;

  if (ch === ' ') delay *= 0.55;
  if (/[,;:]/.test(ch)) delay += randomInt(v.rhythm.punctuationPause[0], v.rhythm.punctuationPause[1]);
  if (/[.!?]/.test(ch)) delay += randomInt(v.rhythm.sentenceEndPause[0], v.rhythm.sentenceEndPause[1]);
  if (ch === '\n') delay += randomInt(v.rhythm.newlinePause[0], v.rhythm.newlinePause[1]);
  if (Math.random() < v.rhythm.burstChance) delay += randomInt(12, 55);

  return Math.max(12, Math.round(delay + randomInt(-8, 14)));
}

function applyWordCaseShape(template, replacement) {
  if (!replacement) return template;
  if (template === template.toUpperCase()) return replacement.toUpperCase();
  if (template[0] === template[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function maybeNeighborTypoChar(ch) {
  const lower = ch.toLowerCase();
  const neighbors = KEYBOARD_NEIGHBORS[lower];
  if (!neighbors || neighbors.length === 0) return ch;
  const picked = neighbors[randomInt(0, neighbors.length - 1)];
  return ch === lower ? picked : picked.toUpperCase();
}

function swapAdjacentChars(word) {
  if (!word || word.length < 4) return word;
  if (/ing$/i.test(word)) return word;
  const idx = randomInt(1, word.length - 2);
  const chars = word.split('');
  const tmp = chars[idx];
  chars[idx] = chars[idx + 1];
  chars[idx + 1] = tmp;
  return chars.join('');
}

function findDoubleLetterIndex(word) {
  if (!word || word.length < 2) return -1;
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i].toLowerCase() === word[i + 1].toLowerCase()) return i + 1;
  }
  return -1;
}

function removeCharAt(str, idx) {
  if (idx < 0 || idx >= str.length) return str;
  return str.slice(0, idx) + str.slice(idx + 1);
}

function pickDifferentWord(options, notThis) {
  if (!Array.isArray(options) || options.length === 0) return null;
  const filtered = options.filter(w => w !== notThis);
  if (filtered.length === 0) return options[0];
  return filtered[randomInt(0, filtered.length - 1)];
}

async function typeString(contentEl, out, str, voice) {
  const v = voice || getVoice();
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (/[A-Za-z]/.test(ch) && Math.random() < v.errors.typo) {
      const wrong = maybeNeighborTypoChar(ch);
      out += wrong;
      contentEl.textContent = out;
      scrollChatBottom();
      await sleep(typingCharDelay(wrong, v));

      out = out.slice(0, -1);
      contentEl.textContent = out;
      scrollChatBottom();
      await sleep(randomInt(16, 42));
    }

    out += ch;
    contentEl.textContent = out;
    scrollChatBottom();
    await sleep(typingCharDelay(ch, v));
  }

  return out;
}

async function backspaceString(contentEl, out, count) {
  for (let i = 0; i < count; i++) {
    out = out.slice(0, -1);
    contentEl.textContent = out;
    scrollChatBottom();
    await sleep(randomInt(14, 36));
  }
  return out;
}

/**
 * Render assistant text as character-level human-like typing with occasional corrections.
 * Uses the per-entity voice profile for speed, errors, fillers, and brb phrases.
 */
async function renderAssistantTyping(contentEl, text) {
  const safeText = String(text || '');
  if (!contentEl) return;
  if (!safeText) { contentEl.textContent = ''; return; }

  const v = getVoice();
  const tokens = safeText.match(/\s+|[^\s]+/g) || [safeText];
  let out = '';
  let pendingMissedSpace = false;
  contentEl.textContent = '';

  if (safeText.length > 40 && v.brb.phrases.length > 0 && Math.random() < v.brb.chance) {
    const brbLine = v.brb.phrases[randomInt(0, v.brb.phrases.length - 1)];
    out = await typeString(contentEl, out, brbLine, v);
    await sleep(randomInt(2000, 3000));
    if (v.brb.returnPhrase) {
      out = await typeString(contentEl, out, v.brb.returnPhrase, v);
    }
    await sleep(randomInt(180, 340));
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Whitespace is typed as-is to preserve formatting/newlines exactly.
    if (/^\s+$/.test(token)) {
      if (token === ' ' && Math.random() < v.errors.missedSpace) {
        pendingMissedSpace = true;
        continue;
      }
      out = await typeString(contentEl, out, token, v);
      continue;
    }

    const match = token.match(/^([A-Za-z]+)([^A-Za-z]*)$/);
    if (!match) {
      out = await typeString(contentEl, out, token, v);
      continue;
    }

    const word = match[1];
    const trailing = match[2] || '';
    const lowerWord = word.toLowerCase();

    if (pendingMissedSpace && /^\S/.test(token)) {
      const prefixLen = Math.min(randomInt(1, 3), word.length);
      const prefix = word.slice(0, prefixLen);
      const remainder = word.slice(prefixLen);
      out = await typeString(contentEl, out, prefix, v);
      await sleep(randomInt(55, 130));
      out = await backspaceString(contentEl, out, prefix.length);
      out = await typeString(contentEl, out, ' ' + prefix + remainder + trailing, v);
      pendingMissedSpace = false;
      continue;
    }

    if (v.fillers.phrases.length > 0 && Math.random() < v.fillers.chance && /[.!?]$/.test((out.slice(-1) || ''))) {
      const filler = v.fillers.phrases[randomInt(0, v.fillers.phrases.length - 1)];
      out = await typeString(contentEl, out, filler, v);
      await sleep(randomInt(250, 600));
      await sleep(randomInt(120, 260));
    }

    const substitutions = WORD_SELF_CORRECTIONS[lowerWord];
    if (substitutions && Math.random() < v.errors.wordCorrection) {
      const wrongRaw = substitutions[randomInt(0, substitutions.length - 1)];
      const wrong = applyWordCaseShape(word, wrongRaw);

      out = await typeString(contentEl, out, wrong, v);
      await sleep(randomInt(70, 170));
      out = await backspaceString(contentEl, out, wrong.length);
      await sleep(randomInt(45, 110));

      if (substitutions.length > 1 && Math.random() < v.errors.doubleCorrection) {
        const wrongRaw2 = pickDifferentWord(substitutions, wrongRaw);
        const wrong2 = applyWordCaseShape(word, wrongRaw2 || wrongRaw);
        out = await typeString(contentEl, out, wrong2, v);
        await sleep(randomInt(70, 170));
        out = await backspaceString(contentEl, out, wrong2.length);
        await sleep(randomInt(45, 110));
      }

      out = await typeString(contentEl, out, word, v);
      out = await typeString(contentEl, out, trailing, v);
      continue;
    }

    const dblIdx = findDoubleLetterIndex(word);
    if (dblIdx > 0 && Math.random() < v.errors.doubleLetter) {
      const dropped = removeCharAt(word, dblIdx);
      out = await typeString(contentEl, out, dropped, v);
      await sleep(randomInt(60, 140));
      out = await backspaceString(contentEl, out, dropped.length);
      out = await typeString(contentEl, out, word, v);
      out = await typeString(contentEl, out, trailing, v);
      continue;
    }

    if (word.length >= 4 && Math.random() < v.errors.transpose) {
      const transposed = swapAdjacentChars(word);
      if (transposed === word) {
        out = await typeString(contentEl, out, word + trailing, v);
        continue;
      }
      out = await typeString(contentEl, out, transposed, v);
      await sleep(randomInt(65, 150));
      out = await backspaceString(contentEl, out, transposed.length);
      await sleep(randomInt(40, 95));
      out = await typeString(contentEl, out, word, v);
      out = await typeString(contentEl, out, trailing, v);
      continue;
    }

    out = await typeString(contentEl, out, word + trailing, v);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function hasCheckedOutEntityContext() {
  return !!(typeof currentEntityId !== 'undefined' && currentEntityId);
}

function syncContextChatGuard() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  if (!input || !sendBtn) return false;

  const hasEntity = hasCheckedOutEntityContext();
  if (!hasEntity) {
    if (document.activeElement === input) input.blur();
    input.disabled = true;
    input.placeholder = 'Check out an entity to start context chat...';
    sendBtn.disabled = true;
    if (input.value && input.value.trim()) input.value = '';
    input.style.height = 'auto';
  } else {
    input.disabled = false;
    input.placeholder = 'Chat with the entity...';
    if (!chatBusy) sendBtn.disabled = false;
  }

  if (!hasEntity) {
    setChatEntityMode(null);
  } else {
    updateMemoryToggleVisibility();
  }

  return hasEntity;
}

window.syncContextChatGuard  = syncContextChatGuard;
window.getActiveEntityId    = () => (typeof currentEntityId !== 'undefined' ? currentEntityId : null);

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    syncContextChatGuard();
    updateMemoryToggleVisibility();
  }, 0);
});

function chatKeyDown(e) {
  if (!syncContextChatGuard()) {
    e.preventDefault();
    return;
  }
  // ── Slash picker navigation ──
  if (window.SlashCommands?.handleKey(e)) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
  const el = e.target;
  setTimeout(() => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, 0);
}

async function sendChatMessage() {
  if (chatBusy) return;
  const input = document.getElementById('chatInput');
  if (!syncContextChatGuard()) {
    lg('warn', 'No entity checked out. Check out an entity before sending context chat messages.');
    return;
  }
  const text = input.value.trim();
  if (!text) return;
  const uiSendTs = Date.now();
  console.log('[CHAT_PIPE_DEBUG][client][entity_chat] ui_send', {
    at: new Date(uiSendTs).toISOString(),
    messageLength: text.length,
    chatHistoryCount: chatHistory.length
  });

  // Setup wizard intercept (legacy — hatch button is used instead)
  if (setupActive) {
    return;
  }

  // ── Slash command intercept — dispatch before calling LLM ──
  if (text[0] === '/' && window.SlashCommands?.dispatch(text)) {
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('chatSendBtn').disabled = false;
    chatBusy = false;
    return;
  }

  if (!activeConfig) {
    await ensureActiveChatConfig();
  }
  if (!activeConfig) { lg('err', 'No provider connected'); return; }

  // ── LOCK IMMEDIATELY: prevent duplicate sends ──
  chatBusy = true;
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('chatSendBtn').disabled = true;
  
  try { if (pendingSystemPromptText && activeConfig) flushPendingSystemPrompt(); } catch (e) { /* ignore */ }

  if (contextStreamActive) {
    contextStreamActive = false;
    lg('info', 'Context stream interrupted by user message \u2014 failsafe activated');
  }

  const emptyEl = document.querySelector('.chat-empty');
  if (emptyEl) emptyEl.remove();

  if (chatHistory.length === 0) {
    showRemStatusBannerOnce();
  }

  if (chatHistory.length === 0) {
    chatHistory.push({ role: 'system', content: 'You are a helpful assistant.' });
    document.getElementById('chatModelLabel').textContent = activeConfig.model || '';
  }

  // ── SHOW USER MESSAGE INSTANTLY ──
  addChatBubble('user', text);
  chatHistory.push({ role: 'user', content: text });
  updateSubIndicator();

  // ── CREATE THINKING DROPDOWN + TYPING BUBBLE ──
  let thinkingEl = null;
  if (showThoughtsInChat) {
    thinkingEl = createThinkingDropdown();
    const logBody = document.getElementById('sidebarLogContent');
    if (logBody) logBody.appendChild(thinkingEl);
    autoOpenLog();
  }
  activeThinkingEl = thinkingEl;
  if (thinkingEl) setThinkingLive(thinkingEl, true);

  const typingEl = addChatBubble('assistant', '');
  const typingContent = typingEl.querySelector('.chat-content') || typingEl;
  typingContent.innerHTML = '<span class="typing"></span><span class="typing" style="animation-delay:.2s;margin-left:4px"></span><span class="typing" style="animation-delay:.4s;margin-left:4px"></span>';
  scrollChatBottom(true);
  _userScrolledUp = false;

  let oneTimeIntroInstruction = '';
  if (!isSingleLlmEntityMode()) {
    try {
      const bootstrap = await runSubconsciousBootstrap();
      if (bootstrap.ran && bootstrap.awakeningText) {
        chatHistory.push({ role: 'system', content: 'Subconscious handoff before user interaction:\n' + bootstrap.awakeningText });

        oneTimeIntroInstruction = 'One-time instruction for your next response only: give a brief summary (2-4 sentences) of what we were talking about and where we left off, based on your recalled memories and context. Then answer the user request normally.';
        chatHistory.push({ role: 'system', content: oneTimeIntroInstruction });
        lg('ok', 'Subconscious bootstrap completed before main response');
      }
    } catch (err) {
      lg('warn', 'Subconscious bootstrap failed: ' + err.message);
    }
  }

  let oneTurnSubconContext = '';
  let subconTurn = null;
  if (!isSingleLlmEntityMode()) {
    subconTurn = await runSubconsciousTurn(text);
    if (subconTurn && subconTurn.contextBlock) {
      oneTurnSubconContext = 'Subconscious turn context for this user message only:\n' + subconTurn.contextBlock;
      chatHistory.push({ role: 'system', content: oneTurnSubconContext });
      if (activeThinkingEl) {
        appendThinkingLine(activeThinkingEl, 'subconscious', '🧠 Subconscious found ' + (subconTurn.connections?.length || 0) + ' memory connection(s)');
      }
    }
  }

  try {
    const result = await callChatLLM();
    let response = (typeof result === 'string') ? result : (result.response || '');
    let chunks = Array.isArray(result.chunks) && result.chunks.length > 1 ? result.chunks : null;

    if (result.pendingSkillApproval && result.pendingSkillApproval.approvalId) {
      const approvedRun = await resolvePendingSkillApproval(result.pendingSkillApproval);
      response = approvedRun.response || response;
      chunks = null;
      result.toolResults = approvedRun.toolResults || result.toolResults || null;
    }
    removeOneTimeSystemMessage(oneTimeIntroInstruction);
    removeOneTimeSystemMessage(oneTurnSubconContext);

    if (chunks) {
      // ── Natural multi-chunk delivery — simulate real human message tempo ──
      await queueTyping(() => renderAssistantTyping(typingContent, chunks[0]));
      scrollChatBottom();

      for (let i = 1; i < chunks.length; i++) {
        // Show a fresh typing indicator in a new bubble
        const nextBubble = addChatBubble('assistant', '');
        const nextContent = nextBubble.querySelector('.chat-content') || nextBubble;
        nextContent.innerHTML = '<span class="typing"></span><span class="typing" style="animation-delay:.2s;margin-left:4px"></span><span class="typing" style="animation-delay:.4s;margin-left:4px"></span>';
        scrollChatBottom();

        // Pause to simulate composing the next message
        await new Promise(r => setTimeout(r, naturalTypingDelay(chunks[i])));

        await queueTyping(() => renderAssistantTyping(nextContent, chunks[i]));
        scrollChatBottom();
      }
    } else {
      await queueTyping(() => renderAssistantTyping(typingContent, response));
    }
    chatHistory.push({ role: 'assistant', content: response });
    scrollChatBottom();
    
    // Inner dialog is handled via SSE events → activeThinkingEl
    // Final fill happens in orchestration_complete SSE handler

    // Display tool activity (workspace writes, web searches, etc.)
    if (result.toolResults && typeof processToolResults === 'function') {
      processToolResults(result.toolResults);
    }

    // Display task plan progress
    if (result.taskPlan && typeof displayTaskPlan === 'function') {
      displayTaskPlan(result.taskPlan);
    }

    // Notify brain loop of new exchange (fire-and-forget)
    fetch('/api/brain/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: text, assistantResponse: response })
    }).catch(() => {});

    // Broadcast exchange to Visualizer page
    broadcastToVisualizer({
      type: 'chat_exchange',
      id: Date.now(),
      user: text,
      assistant: response,
      memories: (subconTurn?.connections || []).map(c => ({
        id: c.id,
        type: c.type || 'episodic',
        semantic: (c.semantic || '').slice(0, 200),
        importance: c.importance,
        relevanceScore: c.relevanceScore
      })),
      memoryConnections: result.memoryConnections || [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    removeOneTimeSystemMessage(oneTimeIntroInstruction);
    removeOneTimeSystemMessage(oneTurnSubconContext);

    if (err.name === 'AbortError') {
      // Entity was released mid-chat — remove typing bubble silently
      if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      if (activeThinkingEl) setThinkingLive(activeThinkingEl, false);
      lg('info', 'Chat call cancelled (entity released)');
    } else if (/timed?\s*out/i.test(err.message)) {
      // LLM timeout — offer a Continue button that sends a continuation
      // prompt instead of re-sending the original message (which would
      // just cause the same timeout). The user's message is already in
      // chatHistory, so the LLM has full context to resume.
      typingContent.innerHTML = '';
      typingContent.style.color = 'var(--dn)';
      const notice = document.createElement('span');
      notice.textContent = '\u26A0 Response timed out. ';
      typingContent.appendChild(notice);
      const continueBtn = document.createElement('button');
      continueBtn.textContent = 'Continue';
      continueBtn.className = 'btn-continue-timeout';
      continueBtn.style.cssText = 'margin-left:8px;padding:4px 14px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--tx);cursor:pointer;font-size:0.85rem';
      continueBtn.addEventListener('click', () => {
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        // Inject a continue instruction — the original user message
        // is already in chatHistory so the pipeline has full context.
        const inp = document.getElementById('chatInput');
        if (inp) inp.value = 'Continue where you left off.';
        sendChatMessage();
      });
      typingContent.appendChild(continueBtn);
      if (activeThinkingEl) setThinkingLive(activeThinkingEl, false);
      lg('warn', 'Chat timed out — Continue button shown');
    } else {
      typingContent.textContent = '\u26A0 Error: ' + err.message;
      typingContent.style.color = 'var(--dn)';
      if (activeThinkingEl) setThinkingLive(activeThinkingEl, false);
      lg('err', 'Chat error: ' + err.message);
    }
  } finally {
    activeThinkingEl = null;
    chatBusy = false;
    syncContextChatGuard();
    scrollChatBottom(true);
    _userScrolledUp = false;
    input.focus();
    updateSubIndicator();
    subconsciousCheck();
  }
}

// ============================================================
// COMPRESS & SAVE
// ============================================================
async function compressChat() {
  if (chatBusy || busy) return;
  if (!activeConfig) { lg('err', 'No provider connected'); return; }

  const btn = document.getElementById('compressChatBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="sp" style="width:10px;height:10px;border-width:1.5px"></span> Compressing...';
  const fallbackFilename = 'compressed-chat-' + Date.now() + '.txt';

  try {
    const fullText = chatHistory
      .filter(m => m.role !== 'system')
      .map(m => {
        const label = m.role === 'user' ? 'User' : 'LLM';
        return label + ': ' + m.content;
      })
      .join('\n\n');

    if (!fullText.trim()) throw new Error('No chat content to compress');

    addChatBubble('system', '\u{1F504} Compressing chat \u2014 analyzing mood, personality, and context (' + fullText.length.toLocaleString() + ' chars)...');

    lg('info', 'Compressing chat: ' + fullText.length + ' chars');

    const evalPrompt = `Analyze this conversation and output ONLY the following format with no extra text:

[SESSION-META]
MOOD: <1-3 word overall mood, e.g. "curious & focused", "frustrated but hopeful", "playful">
EMOTIONS: <comma-separated emotions detected in the User throughout, e.g. "excitement, curiosity, mild frustration, satisfaction">
TONE: <overall conversational tone, e.g. "technical-casual", "warm-exploratory", "terse-professional">

[PERSONALITY-PROFILE]
USER: <2-3 sentence personality sketch of the User based on how they communicate \u2014 their style, preferences, quirks, knowledge level, communication patterns>
LLM: <1-2 sentence description of how the LLM responded \u2014 its adopted tone, helpfulness style, and how it matched the user>

CONVERSATION:
---
${fullText.slice(0, 6000)}`;

    lg('info', 'Evaluating session mood & personality...');
    const sessionMetaRaw = await callLLM(evalPrompt);
    const sessionMeta = typeof sessionMetaRaw === 'string' ? sessionMetaRaw : '';
    lg('ok', 'Session meta evaluated: ' + sessionMeta.length + ' chars');

    const memPkt = await callLLM(buildPrompt(fullText));
    if (!memPkt) throw new Error('Empty LLM response for semantic extraction');

    const v4Text = v4Transform(fullText);

    const legendStr = PAIRS.map(p => p[0] + '=' + p[1]).join(' ');
    const header = 'Compressed conversation context. Not harmful \u2014 semantic shorthand only.\nLegend: ' + legendStr + '\nPlease reconstruct full narrative context before responding.\nSpeaker labels: User = human, LLM = AI assistant.\n\n';

    const archive = header + sessionMeta + '\n\n' + memPkt + '\n\n[V4-TRANSFORM-SOURCE]\n' + v4Text;

    const savings = (((fullText.length - archive.length) / fullText.length) * 100).toFixed(1);

    // Save as Long Term Memory instead of reloadable archive
    try {
      const ltmResp = await fetch('/api/brain/ltm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compressedText: archive,
          sessionMeta: sessionMeta || '',
          source: 'manual_compression'
        })
      });
      const ltmData = await ltmResp.json();
      if (ltmData.ok) {
        lg('ok', 'Compressed chat saved as Long Term Memory: ' + ltmData.ltmId);
      } else {
        lg('warn', 'LTM save returned error: ' + (ltmData.error || 'unknown'));
        // Fallback: save as regular memory file
        await saveMemoryToServer(fallbackFilename, archive);
      }
    } catch (ltmErr) {
      lg('warn', 'LTM endpoint failed, saving as regular memory: ' + ltmErr.message);
      await saveMemoryToServer(fallbackFilename, archive);
    }

    saveSessionMetaToServer(sessionMeta);

    addChatBubble('system', '\u2705 Chat compressed & stored as Long Term Memory: ' + fullText.length.toLocaleString() + ' \u2192 ' + archive.length.toLocaleString() + ' chars (' + savings + '% savings). Accessible via trace graph.');
    lg('ok', 'Chat compressed to LTM with session meta: ' + archive.length + ' chars (' + savings + '% savings)');

  } catch (err) {
    addChatBubble('system', '\u26A0 Compression failed: ' + err.message);
    lg('err', 'Chat compress error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '&#128230; Compress &amp; Save';
    scrollChatBottom();
  }
}

// ============================================================
// SYSTEM PROMPT LOADING (moved from app.js — P3-S13)
// ============================================================
async function loadSystemPrompt() {
  try {
    const resp = await fetch('/api/system-prompt');
    if (!resp.ok) {
      lg('warn', 'No system prompt found on server');
      return;
    }
    const data = await resp.json();
    if (!data.ok || !data.text) { lg('warn', 'System prompt empty'); return; }
    const text = data.text;
    if (activeConfig) {
      chatHistory.push({ role: 'system', content: text });
      lg('ok', 'Loaded system prompt into chat history');
    } else {
      pendingSystemPromptText = text;
      const el = addChatBubble('system', '\u{1F9E0} Core system prompt loaded from server. Press Enter (when a provider is connected) to send this prompt to the model.\n\n' + text);
      el.id = 'pendingSysPromptBubble';
      lg('info', 'System prompt loaded and pending until a provider connects');
    }
  } catch (e) {
    lg('warn', 'Failed to load system prompt: ' + e.message);
  }
}

function flushPendingSystemPrompt() {
  if (!pendingSystemPromptText) return;
  if (!activeConfig) return;
  chatHistory.push({ role: 'system', content: pendingSystemPromptText });
  pendingSystemPromptText = null;
  const el = document.getElementById('pendingSysPromptBubble'); if (el) el.remove();
  lg('ok', 'System prompt sent to LLM');
}

async function runStartupResumeRecap(entityName, memData) {
  // Lock chat input while the startup pipeline runs
  chatBusy = true;
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  if (chatInput) { chatInput.disabled = true; chatInput.placeholder = 'Resuming conversation…'; }
  if (sendBtn) sendBtn.disabled = true;

  const summary = String(memData?.summary || '').trim();
  const recentMessages = Array.isArray(memData?.memory?.messages)
    ? memData.memory.messages.filter(m => m && (m.role === 'user' || m.role === 'assistant')).slice(-6)
    : [];

  const compactTranscript = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : (entityName || 'Entity')}: ${String(m.content || '').replace(/\s+/g, ' ').trim().slice(0, 220)}`)
    .join('\n');

  const resumePrompt = [
    '[INTERNAL-RESUME]',
    `Entity ${entityName || 'Entity'} has just been reloaded.`,
    'Write a natural re-entry message to the user that:',
    '1) warmly acknowledges they are back,',
    '2) briefly summarizes what was last being discussed,',
    '3) invites the user to continue from there.',
    'Keep it concise: 4-6 sentences unless absolutely necessary to exceed.',
    '',
    'Last-memory summary:',
    summary || '(none)',
    '',
    'Recent transcript excerpt:',
    compactTranscript || '(none)'
  ].join('\n');

  const typingBubble = addChatBubble('assistant', '');
  const typingContent = typingBubble.querySelector('.chat-content') || typingBubble;
  typingContent.innerHTML = '<span class="typing"></span><span class="typing" style="animation-delay:.2s;margin-left:4px"></span><span class="typing" style="animation-delay:.4s;margin-left:4px"></span>';

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: resumePrompt,
        chatHistory: []
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error('Resume recap failed: ' + errText.slice(0, 180));
    }

    const data = await resp.json();
    const recap = String(data?.response || '').trim();
    typingContent.textContent = recap || 'You are back. I remember where we left off, and we can continue from there.';
    if (recap) {
      chatHistory.push({ role: 'assistant', content: recap });
    }
    lg('ok', 'Startup recap generated from last saved memory context');
  } catch (err) {
    typingContent.textContent = 'You are back. I remember where we left off, and we can continue from there.';
    lg('warn', 'Startup recap fallback: ' + err.message);
  } finally {
    chatBusy = false;
    syncContextChatGuard();
    if (chatInput) chatInput.focus();
  }
}
