// ── Client Optional · Task Ui ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This client module drives browser-side behavior and state updates for UI
// features.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// Exposed API includes: window-attached API object.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NekoCore OS — Task UI
 * T-7: Client task panel SSE events, step indicators, stall badge, and history.
 *
 * Owns: task status badge state, task history panel, task session detail panel,
 *       task cancel action, SSE event delegation hook.
 * Must NOT contain: chat pipeline logic, subconscious/brain cycle logic,
 *                   entity config, any server-side policy, DOM rendering for chat messages.
 *
 * Hook pattern: chat.js delegates raw task SSE events via window.handleTaskSSEEvent(name, data).
 */

/* global showNotification */

// ─── State ────────────────────────────────────────────────────────────────────
const _taskUI = {
  activeSessionId: null,
  activeTaskType: null,
  stepCount: 0,
  stalled: false,
  needsInput: false,
  complete: false,
  historyOpen: false,
  detailOpen: false,
  detailSessionId: null,
};

// ─── SSE Event Entry Point ────────────────────────────────────────────────────
// Called by chat.js initBrainSSE task event delegates.
// [CONTRACT_ENFORCED] This is the only function that should mutate _taskUI from SSE events.
window.handleTaskSSEEvent = function handleTaskSSEEvent(eventName, data) {
  try {
    switch (eventName) {
      case 'task_milestone':
        _taskUI.activeSessionId = data.sessionId || _taskUI.activeSessionId;
        _taskUI.activeTaskType = data.taskType || _taskUI.activeTaskType;
        _taskUI.stepCount = (data.stepIndex != null) ? data.stepIndex + 1 : _taskUI.stepCount + 1;
        _taskUI.stalled = false;
        _taskUI.needsInput = false;
        _taskUI.complete = false;
        _taskUIRenderBadge();
        _taskUIPushTelemetry('task_milestone', data.milestone || data.label || 'Step ' + _taskUI.stepCount);
        break;

      case 'task_needs_input':
        _taskUI.activeSessionId = data.sessionId || _taskUI.activeSessionId;
        _taskUI.stalled = false;
        _taskUI.needsInput = true;
        _taskUI.complete = false;
        _taskUIRenderBadge();
        _taskUIPushTelemetry('task_needs_input', data.prompt || 'Waiting for input');
        break;

      case 'task_complete':
        _taskUI.activeSessionId = data.sessionId || _taskUI.activeSessionId;
        _taskUI.complete = true;
        _taskUI.stalled = false;
        _taskUI.needsInput = false;
        _taskUIRenderBadge();
        _taskUIPushTelemetry('task_complete', data.summary || 'Task complete');
        // Auto-clear badge after 8 seconds
        setTimeout(() => { _taskUIClearBadge(); }, 8000);
        break;

      case 'task_error':
        _taskUI.activeSessionId = data.sessionId || _taskUI.activeSessionId;
        _taskUI.stalled = true;
        _taskUI.needsInput = false;
        _taskUI.complete = false;
        _taskUIRenderBadge();
        _taskUIPushTelemetry('task_error', data.error || 'Task error');
        break;

      case 'task_steering_injected':
        _taskUI.activeSessionId = data.sessionId || _taskUI.activeSessionId;
        _taskUI.stalled = false;
        _taskUI.needsInput = false;
        _taskUIRenderBadge();
        _taskUIPushTelemetry('task_steering_injected', 'Steering: ' + (data.instruction || ''));
        break;
    }
  } catch (_) { /* silently ignore parse errors */ }
};

// ─── Badge Rendering ──────────────────────────────────────────────────────────
// _taskUIRenderBadge()
// WHAT THIS DOES: _taskUIRenderBadge is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _taskUIRenderBadge(...) where this helper behavior is needed.
function _taskUIRenderBadge() {
  const badge = document.getElementById('taskStatusBadge');
  if (!badge) return;

  if (!_taskUI.activeSessionId && !_taskUI.stepCount) {
    badge.style.display = 'none';
    return;
  }

  badge.style.display = '';

  // State class
  badge.className = 'task-badge';
  // if()
  // WHAT THIS DOES: if is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call if(...) where this helper behavior is needed.
  if (_taskUI.complete) {
    badge.classList.add('task-badge-complete');
  } else if (_taskUI.stalled) {
    badge.classList.add('task-badge-stalled');
  } else if (_taskUI.needsInput) {
    badge.classList.add('task-badge-needs-input');
  } else {
    badge.classList.add('task-badge-active');
  }

  // Label
  const typeLabel = _taskUI.activeTaskType ? _taskUI.activeTaskType.replace(/_/g, ' ') : 'Task';
  let statusIcon = '⚙';
  if (_taskUI.complete) statusIcon = '✓';
  else if (_taskUI.stalled) statusIcon = '⚠';
  else if (_taskUI.needsInput) statusIcon = '⏸';

  const labelEl = badge.querySelector('.task-badge-label');
  const stepEl = badge.querySelector('.task-badge-step');
  if (labelEl) labelEl.textContent = statusIcon + ' ' + typeLabel;
  // if()
  // WHAT THIS DOES: if is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call if(...) where this helper behavior is needed.
  if (stepEl) {
    if (_taskUI.complete) {
      stepEl.textContent = 'Done';
    } else if (_taskUI.stalled) {
      stepEl.textContent = 'Error';
    } else if (_taskUI.needsInput) {
      stepEl.textContent = 'Awaiting input';
    } else {
      stepEl.textContent = 'Step ' + _taskUI.stepCount;
    }
  }
}
// _taskUIClearBadge()
// WHAT THIS DOES: _taskUIClearBadge is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _taskUIClearBadge(...) where this helper behavior is needed.
function _taskUIClearBadge() {
  _taskUI.activeSessionId = null;
  _taskUI.activeTaskType = null;
  _taskUI.stepCount = 0;
  _taskUI.stalled = false;
  _taskUI.needsInput = false;
  _taskUI.complete = false;
  const badge = document.getElementById('taskStatusBadge');
  if (badge) {
    badge.style.display = 'none';
    badge.className = 'task-badge';
  }
}

// ─── Telemetry Bridge ─────────────────────────────────────────────────────────
// _taskUIPushTelemetry()
// WHAT THIS DOES: _taskUIPushTelemetry is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _taskUIPushTelemetry(...) where this helper behavior is needed.
function _taskUIPushTelemetry(eventName, detail) {
  try {
    if (typeof pushTelemetryEvent === 'function') {
      const icons = {
        task_milestone: '🔧',
        task_needs_input: '⏸',
        task_complete: '✅',
        task_error: '⚠️',
        task_steering_injected: '🔀',
      };
      const icon = icons[eventName] || '🔧';
      pushTelemetryEvent(icon + ' ' + detail);
    }
  } catch (_) {}
}

// ─── Task History Panel ───────────────────────────────────────────────────────
async function openTaskHistory() {
  // Resolve entityId from the global entity manager
  let entityId = null;
  try {
    if (typeof window.getActiveEntityId === 'function') {
      entityId = window.getActiveEntityId();
    }
  } catch (_) {}

  const panel = document.getElementById('taskHistoryPanel');
  if (!panel) return;

  _taskUI.historyOpen = true;
  panel.style.display = '';
  panel.classList.add('task-panel-open');
  document.getElementById('taskHistoryList').innerHTML = '<div class="task-panel-loading">Loading…</div>';

  if (!entityId) {
    document.getElementById('taskHistoryList').innerHTML = '<div class="task-panel-empty">No entity loaded — open an entity first.</div>';
    return;
  }

  try {
    const res = await fetch('/api/task/history/' + encodeURIComponent(entityId));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const sessions = await res.json();
    _taskUIRenderHistoryList(sessions);
  } catch (err) {
    document.getElementById('taskHistoryList').innerHTML = '<div class="task-panel-empty">Could not load history: ' + (err.message || 'unknown error') + '</div>';
  }
}
// _taskUIRenderHistoryList()
// WHAT THIS DOES: _taskUIRenderHistoryList is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _taskUIRenderHistoryList(...) where this helper behavior is needed.
function _taskUIRenderHistoryList(sessions) {
  const listEl = document.getElementById('taskHistoryList');
  if (!listEl) return;

  if (!sessions || !sessions.length) {
    listEl.innerHTML = '<div class="task-panel-empty">No task sessions yet.</div>';
    return;
  }

  listEl.innerHTML = sessions.map((s) => {
    const date = s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—';
    const statusClass = s.status === 'complete' ? 'task-history-status-done'
      : s.status === 'error' ? 'task-history-status-error'
      : 'task-history-status-active';
    // taskType()
    // Purpose: helper wrapper used by this module's main flow.
    // taskType()
    // WHAT THIS DOES: taskType is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call taskType(...) where this helper behavior is needed.
    const taskType = (s.taskType || 'task').replace(/_/g, ' ');
    return '<div class="task-history-row" onclick="openTaskSessionDetail(\'' + s.sessionId + '\')">' +
      '<div class="task-history-meta">' +
        '<span class="task-history-type">' + taskType + '</span>' +
        '<span class="task-history-date">' + date + '</span>' +
      '</div>' +
      '<div class="task-history-status ' + statusClass + '">' + (s.status || 'unknown') + '</div>' +
    '</div>';
  }).join('');
}
// closeTaskHistory()
// WHAT THIS DOES: closeTaskHistory removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call closeTaskHistory(...) when you need a safe teardown/reset path.
function closeTaskHistory() {
  _taskUI.historyOpen = false;
  const panel = document.getElementById('taskHistoryPanel');
  if (panel) {
    panel.classList.remove('task-panel-open');
    setTimeout(() => { panel.style.display = 'none'; }, 250);
  }
}

// ─── Task Session Detail Panel ────────────────────────────────────────────────
async function openTaskSessionDetail(sessionId) {
  _taskUI.detailOpen = true;
  _taskUI.detailSessionId = sessionId;

  const panel = document.getElementById('taskDetailPanel');
  if (!panel) return;

  panel.style.display = '';
  panel.classList.add('task-panel-open');
  document.getElementById('taskDetailContent').innerHTML = '<div class="task-panel-loading">Loading…</div>';

  try {
    const res = await fetch('/api/task/session/' + encodeURIComponent(sessionId));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const session = await res.json();
    _taskUIRenderDetail(session);
  } catch (err) {
    document.getElementById('taskDetailContent').innerHTML = '<div class="task-panel-empty">Could not load session: ' + (err.message || 'unknown error') + '</div>';
  }
}
// _taskUIRenderDetail()
// WHAT THIS DOES: _taskUIRenderDetail is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _taskUIRenderDetail(...) where this helper behavior is needed.
function _taskUIRenderDetail(session) {
  const el = document.getElementById('taskDetailContent');
  if (!el) return;

  // Render milestones/steps
  const steps = Array.isArray(session.milestones) ? session.milestones
    : Array.isArray(session.steps) ? session.steps : [];

  // taskType()
  // Purpose: helper wrapper used by this module's main flow.
  // taskType()
  // WHAT THIS DOES: taskType is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call taskType(...) where this helper behavior is needed.
  const taskType = (session.taskType || 'Task').replace(/_/g, ' ');
  const status = session.status || 'unknown';
  const date = session.updatedAt ? new Date(session.updatedAt).toLocaleString() : '—';

  const stepsHtml = steps.length
    ? steps.map((step, i) => {
        // label()
        // Purpose: helper wrapper used by this module's main flow.
        // label()
        // WHAT THIS DOES: label is a helper used by this module's main flow.
        // WHY IT EXISTS: it keeps repeated logic in one reusable place.
        // HOW TO USE IT: call label(...) where this helper behavior is needed.
        const label = (typeof step === 'string') ? step
          : (step.label || step.milestone || step.title || ('Step ' + (i + 1)));
        const done = step.done || step.completed || step.status === 'complete';
        return '<div class="task-step-row' + (done ? ' task-step-done' : '') + '">' +
          '<span class="task-step-num">' + (i + 1) + '</span>' +
          '<span class="task-step-label">' + label + '</span>' +
          (done ? '<span class="task-step-check">✓</span>' : '') +
        '</div>';
      }).join('')
    : '<div class="task-panel-empty">No step data recorded.</div>';

  el.innerHTML =
    '<div class="task-detail-header">' +
      '<strong>' + taskType + '</strong>' +
      '<span class="task-detail-status">' + status + '</span>' +
      '<span class="task-detail-date">' + date + '</span>' +
    '</div>' +
    '<div class="task-step-list">' + stepsHtml + '</div>' +
    (session.summary ? '<div class="task-detail-summary">' + session.summary + '</div>' : '');
}
// closeTaskDetail()
// WHAT THIS DOES: closeTaskDetail removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call closeTaskDetail(...) when you need a safe teardown/reset path.
function closeTaskDetail() {
  _taskUI.detailOpen = false;
  _taskUI.detailSessionId = null;
  const panel = document.getElementById('taskDetailPanel');
  if (panel) {
    panel.classList.remove('task-panel-open');
    setTimeout(() => { panel.style.display = 'none'; }, 250);
  }
}

// ─── Cancel Active Task ───────────────────────────────────────────────────────
async function cancelActiveTask() {
  const sessionId = _taskUI.activeSessionId;
  if (!sessionId) {
    if (typeof showNotification === 'function') showNotification('No active task to cancel.', 'warn');
    return;
  }

  try {
    const res = await fetch('/api/task/cancel/' + encodeURIComponent(sessionId), { method: 'POST' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _taskUIClearBadge();
    if (typeof showNotification === 'function') showNotification('Task cancelled.', 'ok');
  } catch (err) {
    if (typeof showNotification === 'function') showNotification('Cancel failed: ' + (err.message || 'error'), 'error');
  }
}

// ─── Exports (window globals for index.html onclick wiring) ───────────────────
window.openTaskHistory = openTaskHistory;
window.closeTaskHistory = closeTaskHistory;
window.openTaskSessionDetail = openTaskSessionDetail;
window.closeTaskDetail = closeTaskDetail;
window.cancelActiveTask = cancelActiveTask;
