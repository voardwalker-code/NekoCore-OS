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
  constructor(raw) {
    this._map = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        this._map[k.toLowerCase()] = String(v);
      }
    }
  }
  get(name) { return this._map[String(name).toLowerCase()] ?? null; }
  has(name) { return String(name).toLowerCase() in this._map; }
  entries() { return Object.entries(this._map); }
}

// ── Fallback fetch using http/https ─────────────────────────
function simpleFetch(input, init = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(input);
    const mod = parsed.protocol === 'https:' ? https : http;

    const reqHeaders = {};
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
function fetchWithFallback(input, init) {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(input, init);
  }
  return simpleFetch(input, init);
}

module.exports = { fetch: fetchWithFallback };
