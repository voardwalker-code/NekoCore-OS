// ============================================================
// REM System v0.6.0 — Physical Body UI Module (P3-S5)
// ============================================================

let physicalTabInitialized = false;
let physicalSSE = null;
let chatPhysicalSSE = null;

const SOMATIC_METRIC_LABELS = {
  cpu_usage:         { label: 'CPU Usage',          icon: '⚡', desc: 'Processing power available' },
  ram_usage:         { label: 'RAM Usage',           icon: '🧠', desc: 'Working memory space' },
  disk_usage:        { label: 'Disk Usage',          icon: '💾', desc: 'Memory archive storage' },
  response_latency:  { label: 'Response Latency',    icon: '⏱️', desc: 'How fast responses come' },
  context_fullness:  { label: 'Context Fullness',    icon: '📋', desc: 'Attention span capacity' },
  memory_decay_rate: { label: 'Memory Decay',        icon: '🔮', desc: 'Rate of memory fading' },
  cycle_time:        { label: 'Cycle Time',          icon: '🔄', desc: 'Brain loop cycle speed' },
  error_rate:        { label: 'Error Rate',          icon: '⚠️', desc: 'System reliability' }
};

function initPhysicalTab() {
  if (!physicalTabInitialized) {
    physicalTabInitialized = true;
    buildPhysicalMetricCards();
    connectPhysicalSSE();
    fetchDeepSleepInterval();
  }
  fetchPhysicalState();
}

function buildPhysicalMetricCards() {
  const grid = document.getElementById('physicalMetricsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const [metric, info] of Object.entries(SOMATIC_METRIC_LABELS)) {
    const card = document.createElement('div');
    card.className = 'config-card';
    card.id = 'physical-card-' + metric;
    card.style.cssText = 'border-left:3px solid var(--border-default);transition:border-color .5s';
    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">' +
        '<div style="display:flex;align-items:center;gap:var(--space-2)">' +
          '<span style="font-size:1.1rem">' + info.icon + '</span>' +
          '<span style="font-weight:600;font-size:var(--text-sm)">' + info.label + '</span>' +
        '</div>' +
        '<div class="sub-toggle on" id="physical-toggle-' + metric + '" onclick="toggleSomaticMetric(\'' + metric + '\')" title="Toggle this sense"></div>' +
      '</div>' +
      '<div class="text-xs-c text-tertiary-c" style="margin-bottom:var(--space-2)">' + info.desc + '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">' +
        '<div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">' +
          '<div id="physical-bar-' + metric + '" style="height:100%;width:0%;border-radius:3px;transition:width .5s,background .5s;background:var(--accent-green)"></div>' +
        '</div>' +
        '<span class="text-xs-c" id="physical-zone-' + metric + '" style="padding:1px 6px;border-radius:3px;background:var(--bg-tertiary);min-width:50px;text-align:center">—</span>' +
      '</div>' +
      '<div class="text-xs-c" id="physical-phrase-' + metric + '" style="color:var(--text-secondary);font-style:italic;min-height:1.2em">—</div>';
    grid.appendChild(card);
  }
}

async function fetchPhysicalState() {
  try {
    const resp = await fetch('/api/somatic');
    const data = await resp.json();
    if (data.ok) updatePhysicalUI(data);
  } catch (err) {
    lg('err', 'Failed to fetch somatic state: ' + err.message);
  }
  fetchNeuroState();
}

async function fetchNeuroState() {
  try {
    const resp = await fetch('/api/neurochemistry');
    const data = await resp.json();
    if (data) updateNeuroUI(data);
  } catch (err) {
    lg('err', 'Failed to fetch neurochemistry state: ' + err.message);
  }
}

function updateNeuroUI(data) {
  const chemicals = data.chemicals || data.state || {};
  const vec = data.emotionalVector || {};

  const chems = ['dopamine', 'serotonin', 'cortisol', 'oxytocin'];
  for (const chem of chems) {
    const val = chemicals[chem];
    if (val == null) continue;
    const pct = Math.round(val * 100);
    const bar = document.getElementById('neuro-bar-' + chem);
    const label = document.getElementById('neuro-val-' + chem);
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
  }

  const valence = vec.valence != null ? vec.valence : null;
  const arousal = vec.arousal != null ? vec.arousal : null;
  const moodEl = document.getElementById('neuroMoodLabel');
  const emotionsEl = document.getElementById('neuroEmotionsLabel');
  if (moodEl && valence != null) {
    const moodText = valence > 0.6 ? 'Positive' : valence < 0.35 ? 'Low' : 'Neutral';
    const energyText = arousal > 0.6 ? 'High energy' : arousal < 0.35 ? 'Low energy' : 'Balanced';
    moodEl.textContent = moodText;
    if (emotionsEl) emotionsEl.textContent = energyText + ' · valence ' + Math.round(valence * 100) + '% · arousal ' + Math.round(arousal * 100) + '%';
  } else if (moodEl) {
    moodEl.textContent = 'Active';
  }
}

function updatePhysicalUI(data) {
  const zoneColors = { good: 'var(--accent-green)', warn: 'var(--wn)', critical: 'var(--dn)' };
  const zoneBg = { good: 'var(--accent-green)', warn: 'var(--wn)', critical: 'var(--dn)' };

  const overallStress = data.overallStress || 0;
  const overallZone = overallStress < 0.2 ? 'HEALTHY' : overallStress < 0.5 ? 'MILD STRAIN' : overallStress < 0.75 ? 'STRESSED' : 'DISTRESSED';
  const overallColor = overallStress < 0.2 ? 'var(--accent-green)' : overallStress < 0.5 ? 'var(--wn)' : 'var(--dn)';

  const zoneEl = document.getElementById('physicalOverallZone');
  const narrativeEl = document.getElementById('physicalNarrative');
  const overallBar = document.getElementById('physicalOverallBar');
  const overallCard = document.getElementById('physicalOverallCard');

  if (zoneEl) { zoneEl.textContent = overallZone; zoneEl.style.background = overallColor; }
  if (narrativeEl) narrativeEl.textContent = data.bodyNarrative || 'No body awareness data yet.';
  if (overallBar) { overallBar.style.width = (overallStress * 100) + '%'; overallBar.style.background = overallColor; }
  if (overallCard) overallCard.style.borderLeftColor = overallColor;

  runtimeTelemetry.somatic.cpu = normalizePercent((data?.metrics?.cpu_usage ?? data?.sensations?.cpu_usage?.stress ?? 0));
  runtimeTelemetry.somatic.ram = normalizePercent((data?.metrics?.ram_usage ?? data?.sensations?.ram_usage?.stress ?? 0));

  if (data.toggles) {
    for (const [metric, enabled] of Object.entries(data.toggles)) {
      const toggleEl = document.getElementById('physical-toggle-' + metric);
      if (toggleEl) {
        toggleEl.classList.toggle('on', enabled);
      }
    }
  }

  for (const [metric] of Object.entries(SOMATIC_METRIC_LABELS)) {
    const sensation = data.sensations && data.sensations[metric];
    const card = document.getElementById('physical-card-' + metric);
    const bar = document.getElementById('physical-bar-' + metric);
    const zoneSpan = document.getElementById('physical-zone-' + metric);
    const phrase = document.getElementById('physical-phrase-' + metric);
    const enabled = !data.toggles || data.toggles[metric] !== false;

    if (card) card.style.opacity = enabled ? '1' : '0.4';

    if (sensation) {
      const color = zoneColors[sensation.zone] || 'var(--border-default)';
      if (bar) { bar.style.width = (sensation.stress * 100) + '%'; bar.style.background = color; }
      if (zoneSpan) { zoneSpan.textContent = sensation.zone.toUpperCase(); zoneSpan.style.background = zoneBg[sensation.zone] || 'var(--bg-tertiary)'; zoneSpan.style.color = 'var(--bg-primary)'; }
      if (phrase) phrase.textContent = sensation.phrase || '—';
      if (card) card.style.borderLeftColor = color;
    } else if (!enabled) {
      if (bar) { bar.style.width = '0%'; }
      if (zoneSpan) { zoneSpan.textContent = 'OFF'; zoneSpan.style.background = 'var(--bg-tertiary)'; zoneSpan.style.color = 'var(--text-tertiary)'; }
      if (phrase) phrase.textContent = 'Sense disabled';
      if (card) card.style.borderLeftColor = 'var(--border-default)';
    }
  }
}

function updateChatPhysical(data) {
  const overallStress = data.overallStress || 0;
  const zoneLabel = overallStress < 0.2 ? 'HEALTHY' : overallStress < 0.5 ? 'MILD STRAIN' : overallStress < 0.75 ? 'STRESSED' : 'DISTRESSED';
  const color = overallStress < 0.2 ? 'var(--accent-green)' : overallStress < 0.5 ? 'var(--wn)' : 'var(--dn)';

  const zone = document.getElementById('chatPhysicalZone');
  const narrative = document.getElementById('chatPhysicalNarrative');
  const bar = document.getElementById('chatPhysicalBar');
  const card = document.getElementById('chatPhysicalOverallCard');

  if (zone) { zone.textContent = zoneLabel; zone.style.background = color; }
  if (narrative) narrative.textContent = data.bodyNarrative || 'No body awareness data yet.';
  if (bar) { bar.style.width = (overallStress * 100) + '%'; bar.style.background = color; }
  if (card) card.style.borderLeftColor = color;

  const container = document.getElementById('chatPhysicalMetrics');
  if (!container) return;
  container.innerHTML = '';
  for (const [metric, info] of Object.entries(SOMATIC_METRIC_LABELS)) {
    const sensation = data.sensations && data.sensations[metric];
    if (!sensation) continue;
    const mColor = sensation.zone === 'good' ? 'var(--accent-green)' : sensation.zone === 'warn' ? 'var(--wn)' : 'var(--dn)';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;padding:2px 0';
    row.innerHTML = '<span>' + info.icon + '</span><span style="flex:1;color:var(--text-secondary)">' + info.label + '</span>' +
      '<span style="padding:1px 5px;border-radius:3px;background:' + mColor + ';color:var(--bg-primary);font-size:10px">' + sensation.zone.toUpperCase() + '</span>';
    container.appendChild(row);
  }
}

function initChatPhysical() {
  fetch('/api/somatic').then(r => r.json()).then(data => {
    if (data.ok) updateChatPhysical(data);
  }).catch(() => {});

  if (!chatPhysicalSSE) {
    try {
      chatPhysicalSSE = new EventSource('/api/brain/events');
      chatPhysicalSSE.addEventListener('thought', function(e) {
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'SOMATIC_UPDATE') updateChatPhysical(d);
        } catch (_) {}
      });
    } catch (_) {}
  }
}

async function toggleSomaticMetric(metric) {
  const toggleEl = document.getElementById('physical-toggle-' + metric);
  if (!toggleEl) return;
  const currentlyOn = toggleEl.classList.contains('on');
  const newEnabled = !currentlyOn;

  try {
    const resp = await fetch('/api/somatic/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric: metric, enabled: newEnabled })
    });
    const data = await resp.json();
    if (data.ok) {
      toggleEl.classList.toggle('on', newEnabled);
      fetchPhysicalState();
    }
  } catch (err) {
    lg('err', 'Failed to toggle metric: ' + err.message);
  }
}

function connectPhysicalSSE() {
  if (physicalSSE) return;
  try {
    physicalSSE = new EventSource('/api/brain/events');
    physicalSSE.addEventListener('thought', function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'SOMATIC_UPDATE') {
          updatePhysicalUI({
            metrics: data.metrics,
            sensations: data.sensations,
            overallStress: data.overallStress,
            bodyNarrative: data.bodyNarrative,
            toggles: data.toggles
          });
        } else if (data.type === 'NEUROCHEMICAL_SHIFT' && data.state) {
          updateNeuroUI({ chemicals: data.state, emotionalVector: data.emotionalVector });
        }
      } catch (err) { /* ignore */ }
    });
  } catch (err) { /* ignore */ }
}

function updateDeepSleepIntervalLabel(val) {
  const el = document.getElementById('deepSleepIntervalValue');
  if (el) el.textContent = val + ' cycles';
}

async function fetchDeepSleepInterval() {
  try {
    const resp = await fetch('/api/brain/deep-sleep-interval');
    const data = await resp.json();
    if (data.ok) {
      const slider = document.getElementById('deepSleepIntervalSlider');
      const label = document.getElementById('deepSleepIntervalValue');
      if (slider) slider.value = data.deepSleepInterval;
      if (label) label.textContent = data.deepSleepInterval + ' cycles';
    }
  } catch (err) { /* ignore */ }
}

async function saveDeepSleepInterval(val) {
  try {
    await fetch('/api/brain/deep-sleep-interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deepSleepInterval: Number(val) })
    });
  } catch (err) { /* ignore */ }
}
