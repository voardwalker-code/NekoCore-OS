// ── Services · Client Debug Core App ────────────────────────────────────────
//
// HOW CORE DEBUG UI WORKS:
// This module renders debug telemetry in the Debug Core tab. It fetches server
// timeline records, reads local debug-buffer lines from the browser bridge, and
// wires refresh/dump/reset/clear actions to the UI buttons.
//
// WHAT USES THIS:
//   Debug Core tab — calls `window.initCoreDebugApp()` during tab startup
//
// EXPORTS:
//   initCoreDebugApp() on `window`
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  let initialized = false;
  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Return an element by ID. */
  function byId(id) {
    return document.getElementById(id);
  }

  /** Update a status label when present. */
  function setStatus(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
  }

  /** Format a timeline/debug line with timestamp prefix. */
  function formatLine(prefix, message, ts) {
    const when = ts ? new Date(ts).toLocaleTimeString() : new Date().toLocaleTimeString();
    return '[' + when + '] ' + prefix + ' ' + message;
  }
  /** Render line array into a target panel. */
  function renderLines(targetId, lines) {
    const target = byId(targetId);
    if (!target) return;
    if (!lines || !lines.length) {
      target.innerHTML = '<div class="placeholder-content">No entries yet.</div>';
      return;
    }
    target.textContent = lines.join('\n');
    target.scrollTop = target.scrollHeight;
  }

  async function loadTimeline(limit) {
    const n = Math.max(10, Number(limit) || 80);
    setStatus('debugCoreStatus', 'Loading timeline...');
    try {
      const response = await fetch('/api/timeline?limit=' + encodeURIComponent(n));
      const data = await response.json();
      if (!data || !data.ok) throw new Error((data && data.error) || 'timeline load failed');
      const rows = (Array.isArray(data.records) ? data.records : []).map(function (record) {
        const kind = String(record.kind || 'event');
        const summary = String(record.summary || '');
        return formatLine(kind, summary, record.ts);
      });
      renderLines('debugCoreTimeline', rows);
      setStatus('debugCoreStatus', 'Loaded ' + rows.length + ' timeline events');
    } catch (error) {
      renderLines('debugCoreTimeline', [formatLine('error', 'Timeline load failed: ' + error.message)]);
      setStatus('debugCoreStatus', 'Timeline unavailable');
    }
  }
  /** Load local debug buffer rows from bridge API. */
  function loadClientBuffer() {
    const bridge = window.__coreDebugBridge;
    if (!bridge || typeof bridge.getLines !== 'function') {
      renderLines('debugCoreClientBuffer', [formatLine('warn', 'Debug bridge unavailable')]);
      setStatus('debugCoreBufferStatus', 'Bridge unavailable');
      return;
    }

    const rows = bridge.getLines(180).map(function (line) {
      return formatLine(line.k || 'info', line.m || '', line.ts);
    });
    renderLines('debugCoreClientBuffer', rows);
    const queueSize = typeof bridge.getQueueSize === 'function' ? bridge.getQueueSize() : 0;
    setStatus('debugCoreBufferStatus', 'Local entries: ' + rows.length + ' | Pending uploads: ' + queueSize);
  }
  /** Bind Debug Core action buttons once. */
  function bindActions() {
    const refreshBtn = byId('debugCoreRefreshBtn');
    const dumpBtn = byId('debugCoreDumpBtn');
    const resetBtn = byId('debugCoreResetWindowsBtn');
    const clearBtn = byId('debugCoreClearBtn');

    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = '1';
      refreshBtn.addEventListener('click', function () {
        window.initCoreDebugApp();
      });
    }

    if (dumpBtn && !dumpBtn.dataset.bound) {
      dumpBtn.dataset.bound = '1';
      dumpBtn.addEventListener('click', function () {
        const bridge = window.__coreDebugBridge;
        if (bridge && typeof bridge.dumpState === 'function') bridge.dumpState();
        window.initCoreDebugApp();
      });
    }

    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', function () {
        const bridge = window.__coreDebugBridge;
        if (bridge && typeof bridge.resetWindows === 'function') {
          bridge.resetWindows();
          return;
        }
        if (typeof window.resetWindowLayout === 'function') {
          window.resetWindowLayout();
        } else {
          location.reload();
        }
      });
    }

    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = '1';
      clearBtn.addEventListener('click', function () {
        const bridge = window.__coreDebugBridge;
        if (bridge && typeof bridge.clearLines === 'function') bridge.clearLines();
        window.initCoreDebugApp();
      });
    }
  }

  window.initCoreDebugApp = function initCoreDebugApp() {
    bindActions();
    loadTimeline(120);
    loadClientBuffer();
    initialized = true;
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (initialized) return;
    const tab = byId('tab-debugcore');
    if (!tab) return;
    bindActions();
  });
})();
