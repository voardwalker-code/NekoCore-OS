// ── Client Shared · Sse ────────────────────────────────────────────────────
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

// ============================================================
// REM System — Shared SSE Client
// Factory that manages an EventSource with auto-reconnect.
// Usage:
//   const conn = RemSSE.connect('/api/brain/events', {
//     thought:         (data) => { ... },
//     memory_created:  (data) => { ... },
//     _open:           ()     => { ... },  // special: on open
//     _error:          (err)  => { ... },  // special: on error
//   });
//   conn.close();
// ============================================================
window.RemSSE = (function () {

  /**
   * Open an SSE connection with auto-reconnect.
   * @param {string}   url        SSE endpoint
   * @param {object}   handlers   { eventName: fn(parsedData), _open: fn, _error: fn }
   * @param {object}   [options]  { reconnectDelay: 5000 }
   * @returns {{ close: function }}
   */
  // connect()
  // WHAT THIS DOES: connect is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call connect(...) where this helper behavior is needed.
  function connect(url, handlers, options) {
    const opts = Object.assign({ reconnectDelay: 5000 }, options);
    let es = null;
    let closed = false;
    let reconnectTimer = null;

    // Open one EventSource session and wire all handlers.
    // open()
    // WHAT THIS DOES: open creates or initializes something needed by the flow.
    // WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
    // HOW TO USE IT: call open(...) before code that depends on this setup.
    function open() {
      if (closed) return;
      es = new EventSource(url);

      es.onopen = () => {
        if (handlers._open) handlers._open();
      };

      // Register named event listeners supplied by caller.
      for (const [name, fn] of Object.entries(handlers)) {
        if (name.startsWith('_')) continue; // skip special keys
        es.addEventListener(name, (e) => {
          let data = e.data;
          try { data = JSON.parse(e.data); } catch (_) { /* keep raw string */ }
          fn(data, e);
        });
      }

      // Generic message fallback for unnamed server events.
      es.onmessage = (e) => {
        if (handlers._message) {
          let data = e.data;
          try { data = JSON.parse(e.data); } catch (_) {}
          handlers._message(data, e);
        }
      };

      // If connection closes, schedule reconnect unless explicitly closed.
      es.onerror = (err) => {
        if (handlers._error) handlers._error(err);
        if (es.readyState === EventSource.CLOSED) {
          es = null;
          if (!closed) {
            reconnectTimer = setTimeout(open, opts.reconnectDelay);
          }
        }
      };
    }

    open();

    return {
      close() {
        closed = true;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (es) { es.close(); es = null; }
      },
      /** Replace the underlying EventSource (e.g. after manual close) */
      reconnect() {
        closed = false;
        if (es) { es.close(); es = null; }
        open();
      }
    };
  }

  return { connect };
})();
