// ── Services · Http Fetch ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include: http, https, url. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: fetch.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/services/http-fetch.js
 *
 * Shared server-side fetch helper.
 * Uses globalThis.fetch when available (Node 18+), otherwise falls back
 * to a minimal implementation built on the built-in http/https modules.
 *
 * Lazy resolution — checked at call time, not at require() time —
 * so the module is safe to import during early server bootstrap.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ── Minimal Headers polyfill ────────────────────────────────
class SimpleHeaders {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor(raw) {
    this._map = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        this._map[k.toLowerCase()] = String(v);
      }
    }
  }
  // get()
  // WHAT THIS DOES: get reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call get(...), then use the returned value in your next step.
  get(name) { return this._map[String(name).toLowerCase()] ?? null; }
  has(name) { return String(name).toLowerCase() in this._map; }
  entries() { return Object.entries(this._map); }
}

// ── Fallback fetch using http/https ─────────────────────────
// simpleFetch()
// WHAT THIS DOES: simpleFetch is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call simpleFetch(...) where this helper behavior is needed.
function simpleFetch(input, init = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(input);
    const mod = parsed.protocol === 'https:' ? https : http;

    const reqHeaders = {};
    // if()
    // WHAT THIS DOES: if is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call if(...) where this helper behavior is needed.
    if (init.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        reqHeaders[k] = String(v);
      }
    }

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: (init.method || 'GET').toUpperCase(),
      headers: reqHeaders
    };

    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: new SimpleHeaders(res.headers),
          text() { return Promise.resolve(body); },
          json() { return Promise.resolve(JSON.parse(body)); }
        });
      });
    });

    req.on('error', reject);

    if (init.signal) {
      init.signal.addEventListener('abort', () => {
        req.destroy();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      }, { once: true });
    }

    if (init.body != null) {
      req.write(typeof init.body === 'string' ? init.body : JSON.stringify(init.body));
    }
    req.end();
  });
}

// ── Public export: lazy resolution ──────────────────────────
// fetchWithFallback()
// WHAT THIS DOES: fetchWithFallback reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call fetchWithFallback(...), then use the returned value in your next step.
function fetchWithFallback(input, init) {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(input, init);
  }
  return simpleFetch(input, init);
}

module.exports = { fetch: fetchWithFallback };
