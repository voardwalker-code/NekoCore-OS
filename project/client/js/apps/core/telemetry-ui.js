// ── Services · Client Telemetry UI ───────────────────────────────────────────
//
// HOW TELEMETRY UI WORKS:
// This module gathers runtime metrics (models, token usage, pipeline phase,
// app resource trends) and renders Task Manager telemetry panels. It also
// exposes hooks used by SSE/chat modules to push orchestration events.
//
// WHAT USES THIS:
//   task manager panel, chat SSE event handlers, and window manager metrics cards
//
// EXPORTS:
//   runtime telemetry state + reporting/render helpers on `window`
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS — Telemetry UI
// Extracted from app.js by P3-S11
// Depends on globals: windowManager (window-manager.js), getWindowApp (desktop.js),
//   pinnedApps (app.js), activeConfig (app.js), savedConfig (app.js), syncShellStatusWidgets (app.js)
// Exports: runtimeTelemetry, formatTelemetryModel, pushTelemetryEvent,
//   normalizePercent, getFocusedWindowTab, getOrCreateAppStats, pushSeriesPoint,
//   estimateHeapPercent, updateAppStatsSeries, sparklinePath, renderAppMetrics,
//   reportPipelinePhase, reportOrchestrationMetrics, updateTaskManagerView
// Global hooks: window.reportPipelinePhase, window.reportOrchestrationMetrics
// ============================================================

const runtimeTelemetry = {
  activePhase: 'Idle',
  phaseSince: 0,
  tokenUsage: null,
  models: {},
  totalDurationMs: 0,
  brainCycleCount: 0,
  brainRunning: false,
  eventFeed: [],
  somatic: {
    cpu: 0,
    ram: 0
  },
  appStats: {},
  activeWindowTab: 'chat',
  lastRequestByTab: {},
  // T-7: active task state (updated by task-ui.js via handleTaskSSEEvent)
  taskState: {
    activeSessionId: null,
    activeTaskType: null,
    stepCount: 0,
    stalled: false,
    complete: false
  },
  // C12: Cognitive state observability
  cognitiveState: {
    snapshot: null,
    beliefFeedback: null,
    goalStatus: null,
    curiosity: null,
    moodNudge: null,
    lastFeedbackTime: null
  }
};
/** Format model IDs into short display names. */
function formatTelemetryModel(model) {
  if (!model) return '—';
  return String(model).split('/').pop();
}
/** Resolve saved per-aspect configs for telemetry fallbacks. */
function getSavedTaskManagerConfigs() {
  const profileName = savedConfig?.lastActive;
  const profile = profileName ? savedConfig?.profiles?.[profileName] : null;
  if (!profile || typeof profile !== 'object') return {};

  const main = profile.main && typeof profile.main === 'object'
    ? profile.main
    : (profile._activeType === 'ollama' && profile.ollama
        ? { type: 'ollama', endpoint: profile.ollama.url, model: profile.ollama.model }
        : profile.apikey
          ? { type: 'openrouter', endpoint: profile.apikey.endpoint, apiKey: profile.apikey.key, model: profile.apikey.model }
          : null);

  return {
    main,
    subconscious: profile.subconscious || main,
    dream: profile.dream || profile.dreams || main,
    conscious: profile.main || main,
    orchestrator: profile.orchestrator || main
  };
}
/** Push one telemetry line into bounded event feed. */
function pushTelemetryEvent(line) {
  runtimeTelemetry.eventFeed.unshift({ ts: Date.now(), line });
  runtimeTelemetry.eventFeed = runtimeTelemetry.eventFeed.slice(0, 30);
}
/** Normalize percentage-like values to 0-100. */
function normalizePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n <= 1) return Math.max(0, Math.min(100, n * 100));
  return Math.max(0, Math.min(100, n));
}
/** Return the tab id of the topmost open window. */
function getFocusedWindowTab() {
  const openWindows = Array.from(windowManager.windows.values()).filter((meta) => meta.open);
  if (!openWindows.length) return 'chat';
  openWindows.sort((a, b) => (parseInt(b.el.style.zIndex || '1', 10) - parseInt(a.el.style.zIndex || '1', 10)));
  return openWindows[0].tab;
}
/** Return telemetry bucket for one app tab, creating it if needed. */
function getOrCreateAppStats(tabName) {
  if (!runtimeTelemetry.appStats[tabName]) {
    runtimeTelemetry.appStats[tabName] = {
      cpu: [],
      memory: [],
      requestMs: [],
      label: getWindowApp(tabName).label,
      icon: getWindowApp(tabName).icon
    };
  }
  return runtimeTelemetry.appStats[tabName];
}
/** Push one rounded sample and keep a bounded history length. */
function pushSeriesPoint(series, value) {
  series.push(Math.round(value));
  if (series.length > 28) series.shift();
}
/** Estimate browser heap pressure as a percentage. */
function estimateHeapPercent() {
  const mem = (typeof performance !== 'undefined' && performance.memory) ? performance.memory : null;
  if (!mem || !mem.totalJSHeapSize) return 0;
  return normalizePercent(mem.usedJSHeapSize / mem.totalJSHeapSize);
}
/** Refresh synthetic CPU/memory/request series for visible/pinned apps. */
function updateAppStatsSeries() {
  const activeTab = runtimeTelemetry.activeWindowTab || getFocusedWindowTab();
  const openTabs = Array.from(windowManager.windows.values()).filter((meta) => meta.open).map((meta) => meta.tab);
  const candidateTabs = Array.from(new Set([...pinnedApps, ...openTabs, activeTab])).slice(0, 9);
  if (!candidateTabs.length) return;

  const cpuBase = normalizePercent(runtimeTelemetry.somatic.cpu) || 7;
  const ramBase = normalizePercent(runtimeTelemetry.somatic.ram) || estimateHeapPercent() || 22;
  const lastRequest = runtimeTelemetry.totalDurationMs || 0;

  candidateTabs.forEach((tabName) => {
    const stats = getOrCreateAppStats(tabName);
    const isOpen = openTabs.includes(tabName);
    const isActive = tabName === activeTab;
    const activityWeight = isActive ? 1 : (isOpen ? 0.6 : 0.28);
    const jitter = (Math.random() * 10) - 5;
    const cpuPoint = Math.max(1, Math.min(100, (cpuBase * activityWeight) + (isOpen ? 10 : 2) + jitter));
    const memPoint = Math.max(2, Math.min(100, (ramBase * (isActive ? 0.82 : 0.55)) + (isOpen ? 9 : 3) + (jitter * 0.4)));
    const reqSample = runtimeTelemetry.lastRequestByTab[tabName] || (tabName === activeTab ? lastRequest : Math.round(lastRequest * 0.38));

    pushSeriesPoint(stats.cpu, cpuPoint);
    pushSeriesPoint(stats.memory, memPoint);
    pushSeriesPoint(stats.requestMs, Math.max(0, Math.min(120000, Number(reqSample) || 0)));
  });
}
/** Convert numeric samples to an SVG path command string. */
function sparklinePath(values, width, height, maxValue) {
  if (!values.length) return '';
  const max = Math.max(1, maxValue || Math.max.apply(null, values));
  const step = values.length === 1 ? width : width / (values.length - 1);
  return values.map((v, idx) => {
    const x = (idx * step).toFixed(1);
    const y = (height - ((Math.max(0, v) / max) * height)).toFixed(1);
    return (idx === 0 ? 'M' : 'L') + x + ' ' + y;
  }).join(' ');
}
/** Render app telemetry cards and sparkline visualizations. */
function renderAppMetrics() {
  const host = document.getElementById('tmAppMetricsGrid');
  if (!host) return;

  updateAppStatsSeries();

  const keys = Object.keys(runtimeTelemetry.appStats)
    .filter((key) => pinnedApps.includes(key) || windowManager.windows.get(key)?.open)
    .slice(0, 9);

  if (!keys.length) {
    host.innerHTML = '<div class="tm-metric-empty">Open or pin apps to see live app telemetry.</div>';
    return;
  }

  host.innerHTML = keys.map((tabName) => {
    const stats = runtimeTelemetry.appStats[tabName];
    const app = getWindowApp(tabName);
    const cpuNow = stats.cpu.length ? stats.cpu[stats.cpu.length - 1] : 0;
    const memNow = stats.memory.length ? stats.memory[stats.memory.length - 1] : 0;
    const reqNow = stats.requestMs.length ? stats.requestMs[stats.requestMs.length - 1] : 0;
    const reqMax = Math.max(1000, Math.max.apply(null, stats.requestMs.concat([1000])));
    const cpuPath = sparklinePath(stats.cpu, 112, 28, 100);
    const memPath = sparklinePath(stats.memory, 112, 28, 100);
    const reqPath = sparklinePath(stats.requestMs, 112, 28, reqMax);
    const isOpen = windowManager.windows.get(tabName)?.open;

    return '<div class="tm-metric-card' + (isOpen ? ' is-open' : '') + '">' +
      '<div class="tm-metric-head"><span><span class="wm-title-icon" data-accent="' + (app.accent || 'green') + '">' + app.icon + '</span> ' + app.label + '</span><span class="tm-metric-pill">' + (isOpen ? 'Open' : 'Pinned') + '</span></div>' +
      '<div class="tm-spark-row"><span>CPU ' + cpuNow + '%</span><svg viewBox="0 0 112 28" aria-hidden="true"><path d="' + cpuPath + '"></path></svg></div>' +
      '<div class="tm-spark-row"><span>MEM ' + memNow + '%</span><svg viewBox="0 0 112 28" aria-hidden="true"><path d="' + memPath + '"></path></svg></div>' +
      '<div class="tm-spark-row"><span>REQ ' + reqNow + 'ms</span><svg viewBox="0 0 112 28" aria-hidden="true"><path d="' + reqPath + '"></path></svg></div>' +
    '</div>';
  }).join('');
}
/** Update runtime phase badge and append optional feed detail. */
function reportPipelinePhase(phase, status, detail) {
  runtimeTelemetry.activePhase = phase || 'Idle';
  runtimeTelemetry.phaseSince = Date.now();
  if (detail) pushTelemetryEvent((status ? status + ': ' : '') + detail);
}
/** Apply orchestration metrics payload to dashboard state. */
function reportOrchestrationMetrics(data) {
  const usage = data?.tokenUsage?.total || data?.tokenUsage || null;
  if (usage && Number.isFinite(Number(usage.total_tokens || 0))) {
    runtimeTelemetry.tokenUsage = usage;
  }
  runtimeTelemetry.models = data?.models || runtimeTelemetry.models;
  runtimeTelemetry.totalDurationMs = data?.totalDuration || data?.timing?.total_ms || 0;
  const activeTab = runtimeTelemetry.activeWindowTab || getFocusedWindowTab();
  if (runtimeTelemetry.totalDurationMs > 0 && activeTab) {
    runtimeTelemetry.lastRequestByTab[activeTab] = runtimeTelemetry.totalDurationMs;
  }
  runtimeTelemetry.activePhase = 'Idle';
  runtimeTelemetry.phaseSince = Date.now();
  pushTelemetryEvent('Orchestration complete' + (runtimeTelemetry.totalDurationMs ? ' in ' + runtimeTelemetry.totalDurationMs + 'ms' : ''));
}
/** Refresh all task manager telemetry widgets from current state. */
function updateTaskManagerView() {
  const savedConfigs = getSavedTaskManagerConfigs();
  const providerConfig = activeConfig || savedConfigs.main || null;
  const providerType = providerConfig?.type || 'none';
  const providerModel = providerConfig?.model || 'Not connected';
  const providerModelEl = document.getElementById('tmProviderModel');
  const providerTypeEl = document.getElementById('tmProviderType');
  if (providerModelEl) providerModelEl.textContent = formatTelemetryModel(providerModel) || 'Not connected';
  if (providerTypeEl) providerTypeEl.textContent = providerType === 'none' ? 'Not connected' : providerType;

  const phaseEl = document.getElementById('tmPipelinePhase');
  const ageEl = document.getElementById('tmPipelineAge');
  if (phaseEl) phaseEl.textContent = runtimeTelemetry.activePhase || 'Idle';
  if (ageEl) {
    const ageMs = runtimeTelemetry.phaseSince ? Date.now() - runtimeTelemetry.phaseSince : 0;
    ageEl.textContent = runtimeTelemetry.activePhase === 'Idle'
      ? 'No active orchestration'
      : 'Active for ' + Math.max(0, Math.round(ageMs / 1000)) + 's';
  }

  const tokens = runtimeTelemetry.tokenUsage;
  const tokenTotalEl = document.getElementById('tmTokensTotal');
  const tokenBreakEl = document.getElementById('tmTokensBreakdown');
  if (tokenTotalEl) tokenTotalEl.textContent = tokens ? String(tokens.total_tokens || 0) : '0';
  if (tokenBreakEl) tokenBreakEl.textContent = tokens
    ? 'In: ' + (tokens.prompt_tokens || 0) + ' • Out: ' + (tokens.completion_tokens || 0)
    : 'In: 0 • Out: 0';

  const brainStatusEl = document.getElementById('tmBrainStatus');
  const brainCycleEl = document.getElementById('tmBrainCycles');
  if (brainStatusEl) brainStatusEl.textContent = runtimeTelemetry.brainRunning ? 'Running' : 'Idle';
  if (brainCycleEl) {
    brainCycleEl.textContent = 'Cycle ' + (runtimeTelemetry.brainCycleCount || 0)
      + (runtimeTelemetry.totalDurationMs ? ' • Last run ' + runtimeTelemetry.totalDurationMs + 'ms' : '');
  }

  const models = runtimeTelemetry.models || {};
  const fallbackModels = {
    subconscious: savedConfigs.subconscious?.model || null,
    dream: savedConfigs.dream?.model || null,
    conscious: savedConfigs.conscious?.model || savedConfigs.main?.model || null,
    orchestrator: savedConfigs.orchestrator?.model || null
  };
  const setModel = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatTelemetryModel(value);
  };
  setModel('tmModelSub', models.subconscious || fallbackModels.subconscious);
  setModel('tmModelDream', models.dream || fallbackModels.dream);
  setModel('tmModelConscious', models.conscious || fallbackModels.conscious);
  setModel('tmModelOrchestrator', models.orchestrator || fallbackModels.orchestrator);

  // T-7: Active task section in Task Manager
  const tmTaskSection = document.getElementById('tmActiveTaskSection');
  if (tmTaskSection) {
    const ts = runtimeTelemetry.taskState;
    if (ts && ts.activeSessionId) {
      const taskType = ts.activeTaskType ? ts.activeTaskType.replace(/_/g, ' ') : 'Task';
      let statusText = 'Step ' + (ts.stepCount || 0);
      let statusClass = 'tm-task-active';
      if (ts.complete) { statusText = 'Complete'; statusClass = 'tm-task-done'; }
      else if (ts.stalled) { statusText = 'Error'; statusClass = 'tm-task-error'; }
      tmTaskSection.innerHTML =
        '<div class="tm-task-row ' + statusClass + '">' +
          '<span class="tm-task-type">' + taskType + '</span>' +
          '<span class="tm-task-status">' + statusText + '</span>' +
          '<span class="tm-task-id">' + ts.activeSessionId.slice(-8) + '</span>' +
        '</div>';
    } else {
      tmTaskSection.innerHTML = '<div class="tm-task-empty">No active task.</div>';
    }
  }

  const feedEl = document.getElementById('tmEventFeed');
  if (feedEl) {
    if (!runtimeTelemetry.eventFeed.length) {
      feedEl.innerHTML = '<div class="tm-event">Waiting for pipeline events...</div>';
    } else {
      feedEl.innerHTML = runtimeTelemetry.eventFeed.slice(0, 12).map((item) => {
        const time = new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return '<div class="tm-event"><span class="tm-event-ts">' + time + '</span><span>' + item.line + '</span></div>';
      }).join('');
    }
  }

  renderAppMetrics();
}

window.reportPipelinePhase = reportPipelinePhase;
window.reportOrchestrationMetrics = reportOrchestrationMetrics;
