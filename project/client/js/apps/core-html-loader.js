// ── Services · Client Core HTML Loader ──────────────────────────────────────
//
// HOW CORE HTML LOADING WORKS:
// This file mounts critical UI HTML pieces for the client shell. Overlays are
// loaded synchronously so login/setup/sleep DOM exists before first paint, and
// core tabs are fetched in parallel then mounted.
//
// WHAT USES THIS:
//   boot.js startup flow — waits on `window.__nonCoreHtmlReady` chain before init
//
// EXPORTS:
//   side-effect module — sets/extends `window.__nonCoreHtmlReady` promise
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS — Core tab + overlay HTML loader
// Mirrors the non-core-html-loader pattern.
//
// Overlays (boot/login, setup wizard, sleep) are injected
// synchronously so they are in the DOM before first paint.
//
// Core tabs are fetched in parallel with Promise.all and
// mounted once ready. The result is chained onto
// window.__nonCoreHtmlReady so boot.js waits for all content
// before starting initialisation.
// ============================================================

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  // Core tab slots that get mounted asynchronously.
  var CORE_TABS = [
    { tabId: 'chat',       path: 'apps/core/tab-chat.html' },
    { tabId: 'activity',   path: 'apps/core/tab-activity.html' },
    { tabId: 'archive',    path: 'apps/core/tab-archive.html' },
    { tabId: 'debugcore',  path: 'apps/core/tab-debugcore.html' },
    { tabId: 'settings',   path: 'apps/core/tab-settings.html' },
    { tabId: 'advanced',   path: 'apps/core/tab-advanced.html' },
    { tabId: 'creator',    path: 'apps/core/tab-creator.html' },
    { tabId: 'users',      path: 'apps/core/tab-users.html' },
    { tabId: 'entity',     path: 'apps/core/tab-entity.html' },
    { tabId: 'nekocore',   path: 'apps/core/tab-nekocore.html' }
  ];

  // Critical overlays mounted synchronously before first paint.
  var CORE_OVERLAYS = [
    { id: 'boot-login',   path: 'apps/core/overlays/boot-login.html' },
    { id: 'setup-wizard', path: 'apps/core/overlays/setup-wizard.html' },
    { id: 'sleep',        path: 'apps/core/overlays/sleep.html' }
  ];

  // ── Guards ────────────────────────────────────────────────────────────────

  // ---- path safety ----
  // Guardrail: only allow known core HTML paths, never traversal.
  /** Validate local core HTML path shape. */
  function isSafePath(p) {
    var s = String(p || '').trim();
    return !!s && s.startsWith('apps/core/') && s.endsWith('.html') && s.indexOf('..') === -1;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // ---- synchronous XHR (used for overlays — must land before first paint) ----
  // This intentionally blocks so overlay DOM exists before boot logic runs.
  /** Synchronously read HTML text from a local path. */
  function syncGetText(path) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false); // synchronous
      xhr.send(null);
      if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) {
        return xhr.responseText;
      }
    } catch (_) {}
    return null;
  }

  // ---- inject HTML string into slot's position ----
  // Replaces placeholder slot node with mounted HTML.
  /** Replace a slot element with provided HTML. */
  function mountIntoSlot(slotId, html) {
    var slot = document.getElementById(slotId);
    if (!slot || !html) return false;
    // outerHTML replacement works for multi-root strings (multiple sibling elements)
    slot.outerHTML = html;
    return true;
  }

  // ---- run any <script> tags in mounted HTML (mirrors non-core-html-loader) ----
  // Dynamic HTML scripts can be inert after injection; re-run explicitly.
  /** Re-execute script tags from mounted HTML. */
  function runMountedScripts(html) {
    if (!html) return;
    var probe = document.createElement('div');
    probe.innerHTML = html;
    probe.querySelectorAll('script').forEach(function (oldScript) {
      try {
        if (oldScript.src) {
          var newScript = document.createElement('script');
          Array.prototype.forEach.call(oldScript.attributes, function (attr) {
            newScript.setAttribute(attr.name, attr.value);
          });
          document.head.appendChild(newScript);
          return;
        }
        var code = oldScript.textContent || '';
        if (code.trim()) (0, eval)(code); // eslint-disable-line no-eval
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[core-html-loader] mounted script failed:', err);
        }
      }
    });
  }

  // ── Core Flow ────────────────────────────────────────────────────────

  // ====================================================================
  // 1. OVERLAYS — synchronous, must be in DOM before first paint
  // ====================================================================
  CORE_OVERLAYS.forEach(function (ov) {
    if (!isSafePath(ov.path)) return;
    var html = syncGetText(ov.path);
    if (!html) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[core-html-loader] overlay not loaded: ' + ov.path);
      }
      return;
    }
    var slotId = 'core-overlay-slot-' + ov.id;
    var ok = mountIntoSlot(slotId, html);
    if (!ok && typeof console !== 'undefined' && console.warn) {
      console.warn('[core-html-loader] overlay slot not found: #' + slotId);
    }
  });

  // ====================================================================
  // 2. CORE TABS — async, fetched in parallel with Promise.all
  // ====================================================================
  // Fetch one tab payload and keep tabId attached for mount step.
  /** Fetch one tab HTML payload with its tab ID. */
  function fetchTabHtml(entry) {
    if (!isSafePath(entry.path)) {
      return Promise.reject(new Error('Unsafe path: ' + entry.path));
    }
    return fetch(entry.path)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + entry.path);
        return res.text();
      })
      .then(function (html) {
        return { tabId: entry.tabId, html: html };
      });
  }

  // Mount all fetched tabs and execute their script tags.
  /** Mount fetched core tabs and run embedded scripts. */
  function mountAllCoreTabs(results) {
    results.forEach(function (result) {
      if (!result || !result.html) return;
      var slotId = 'core-tab-slot-' + result.tabId;
      var ok = mountIntoSlot(slotId, result.html);
      if (ok) {
        runMountedScripts(result.html);
      } else if (typeof console !== 'undefined' && console.warn) {
        console.warn('[core-html-loader] tab slot not found: #' + slotId);
      }
    });
  }

  var coreTabsReady = Promise.all(CORE_TABS.map(fetchTabHtml))
    .then(mountAllCoreTabs)
    .catch(function (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[core-html-loader] tab loading error:', err);
      }
    });

  // Chain onto existing non-core readiness promise so boot waits for both
  // non-core and core tab HTML to be fully mounted.
  var prior = window.__nonCoreHtmlReady;
  window.__nonCoreHtmlReady = (prior && typeof prior.then === 'function')
    ? prior.then(function () { return coreTabsReady; })
    : coreTabsReady;

}());
