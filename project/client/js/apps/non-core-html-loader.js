// ── Services · Client Non-Core HTML Loader ──────────────────────────────────
//
// HOW NON-CORE HTML LOADING WORKS:
// This file mounts optional and custom app HTML using a manifest. It validates
// tab IDs and paths, injects HTML into known slots, re-runs script tags, and
// toggles nav button visibility based on app enablement.
//
// WHAT USES THIS:
//   client boot flow — waits on `window.__nonCoreHtmlReady` before startup
//
// EXPORTS:
//   side-effect module — sets `window.__nonCoreHtmlReady`
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS - Non-core app HTML loader
// Loads optional tab HTML from manifest-backed modular files.
// ============================================================

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  // Manifest source for optional and custom app entries.
  var MANIFEST_PATH = 'apps/non-core/non-core-apps.manifest.json';

  // Built-in fallback list used when manifest is missing or malformed.
  var DEFAULT_NON_CORE = [
    { tabId: 'workspace', enabled: true, path: 'apps/non-core/core/tab-workspace.html', label: 'Workspace', icon: '📁', navTarget: '#navOptionalAppsHost' },
    { tabId: 'skills', enabled: true, path: 'apps/non-core/core/tab-skills.html', label: 'Skills', icon: '🧩', navTarget: '#navOptionalAppsHost' },
    { tabId: 'popouts', enabled: true, path: 'apps/non-core/core/tab-popouts.html', label: 'Popouts', icon: '↗', navTarget: '#navOptionalAppsHost' },
    { tabId: 'themes', enabled: true, path: 'apps/non-core/core/tab-themes.html', label: 'Themes', icon: '🎨', navTarget: '#navOptionalAppsHost' },
    { tabId: 'visualizer', enabled: true, path: 'apps/non-core/core/tab-visualizer.html', label: 'Visualizer', icon: '🕸️', navTarget: '#navOptionalAppsHost' },
    { tabId: 'physical', enabled: true, path: 'apps/non-core/core/tab-physical.html', label: 'Physical', icon: '❤️', navTarget: '#navOptionalAppsHost' },
    { tabId: 'dreamgallery', enabled: true, path: 'apps/non-core/core/tab-dreamgallery.html', label: 'Dreams', icon: '🖼️', navTarget: '#navOptionalAppsHost' },
    { tabId: 'lifediary', enabled: true, path: 'apps/non-core/core/tab-lifediary.html', label: 'Life Diary', icon: '📖', navTarget: '#navOptionalAppsHost' },
    { tabId: 'dreamdiary', enabled: true, path: 'apps/non-core/core/tab-dreamdiary.html', label: 'Dream Diary', icon: '🌙', navTarget: '#navOptionalAppsHost' },
    { tabId: 'documents', enabled: true, path: 'apps/non-core/core/tab-documents.html', label: 'Documents', icon: '📄', navTarget: '#navOptionalAppsHost' },
    { tabId: 'browser', enabled: true, path: 'apps/non-core/core/tab-browser.html', label: 'Browser', icon: '🌐', navTarget: '#navOptionalAppsHost' }
  ];

  // Fast lookup map for fallback metadata by tabId.
  var DEFAULT_NON_CORE_BY_TAB = DEFAULT_NON_CORE.reduce(function (acc, item) {
    acc[item.tabId] = item;
    return acc;
  }, {});

  // ── Guards ────────────────────────────────────────────────────────────────

  /** Validate tab IDs to avoid selector/DOM injection edge cases. */
  function isSafeTabId(tabId) {
    return /^[a-z0-9_-]+$/i.test(String(tabId || '').trim());
  }

  /** Limit loads to local non-core HTML files only. */
  function isSafeHtmlPath(path) {
    var p = String(path || '').trim();
    return !!p && p.startsWith('apps/non-core/') && p.endsWith('.html') && p.indexOf('..') === -1;
  }

  /** Allow only simple #id nav targets. */
  function isSafeNavTarget(selector) {
    var s = String(selector || '').trim();
    return /^#[a-z0-9_-]+$/i.test(s);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Synchronous fetch because this loader initializes before shell boot.
  /** Synchronously fetch text content from a local path. */
  function syncGetText(path) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send(null);
      if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) {
        return xhr.responseText;
      }
    } catch (_) {
      // Ignore and return null.
    }
    return null;
  }

  /** Show or hide all nav buttons that target a tab ID. */
  function setNavVisibility(tabId, visible) {
    if (!tabId) return;
    var selector = '[data-tab="' + tabId + '"]';
    document.querySelectorAll(selector).forEach(function (el) {
      el.hidden = !visible;
      el.style.display = visible ? '' : 'none';
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
  }

  /** Escape text for safe insertion into HTML strings. */
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Resolve nav host node with fallback strategy. */
  function getNavTarget(selector, fallbackSelector) {
    if (isSafeNavTarget(selector)) {
      var exact = document.querySelector(selector);
      if (exact) return exact;
    }
    if (fallbackSelector && isSafeNavTarget(fallbackSelector)) {
      var fallback = document.querySelector(fallbackSelector);
      if (fallback) return fallback;
    }
    return document.querySelector('.nav') || null;
  }

  /** Ensure there is a nav button for a mounted optional/custom tab. */
  function ensureNavButton(entry, isCustomApp) {
    var tabId = String(entry.tabId || '').trim();
    if (!isSafeTabId(tabId)) return;

    var navButtons = Array.from(document.querySelectorAll('[data-tab="' + tabId + '"]'));
    if (navButtons.length > 0) {
      navButtons.forEach(function (btn) {
        btn.hidden = false;
        btn.style.display = '';
        btn.setAttribute('aria-hidden', 'false');
      });
      return;
    }

    var navTarget = getNavTarget(entry.navTarget, isCustomApp ? '#navCustomAppsHost' : '#navOptionalAppsHost');
    if (!navTarget) return;

    var button = document.createElement('button');
    button.className = 'nav-item nav-item-dynamic' + (isCustomApp ? ' nav-item-custom' : ' nav-item-optional');
    button.setAttribute('data-tab', tabId);
    button.setAttribute('type', 'button');
    button.setAttribute('aria-hidden', 'false');
    var label = String(entry.label || tabId).trim() || tabId;
    var icon = String(entry.icon || '🧩').trim() || '🧩';
    button.innerHTML = '<span style="font-size:16px;line-height:1">' + escapeHtml(icon) + '</span><span class="nav-label">' + escapeHtml(label) + '</span>';
    button.addEventListener('click', function () {
      if (typeof switchMainTab === 'function') switchMainTab(tabId, button);
    });
    navTarget.appendChild(button);
  }

  /** Re-run script tags from mounted HTML so behavior initializes. */
  function runMountedScripts(root, htmlSource) {
    var scripts = [];
    var seen = Object.create(null);
    function collectScript(scriptNode) {
      if (!scriptNode) return;
      var key = scriptNode.src ? ('src:' + scriptNode.src) : ('inline:' + (scriptNode.textContent || ''));
      if (seen[key]) return;
      seen[key] = true;
      scripts.push(scriptNode);
    }

    if (root) {
      Array.from(root.querySelectorAll('script')).forEach(collectScript);
    }

    if (htmlSource) {
      var probe = document.createElement('div');
      probe.innerHTML = htmlSource;
      Array.from(probe.querySelectorAll('script')).forEach(collectScript);
    }

    scripts.forEach(function (oldScript) {
      try {
        if (oldScript.src) {
          var newScript = document.createElement('script');
          Array.prototype.forEach.call(oldScript.attributes, function (attr) {
            newScript.setAttribute(attr.name, attr.value);
          });
          oldScript.parentNode.replaceChild(newScript, oldScript);
          return;
        }

        // Inert inline scripts from dynamic HTML do not always execute after outerHTML;
        // run their code explicitly in global scope.
        var code = oldScript.textContent || '';
        if (code.trim()) {
          (0, eval)(code);
        }
      } catch (err) {
        if (typeof lg === 'function') {
          lg('warn', 'Mounted tab script failed: ' + (err && err.message ? err.message : String(err)));
        }
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('Mounted tab script failed:', err);
        }
      } finally {
        if (oldScript.parentNode) oldScript.parentNode.removeChild(oldScript);
      }
    });
  }

  /** Find the mounted tab root after HTML injection. */
  function getMountedTabRoot(tabId) {
    return document.getElementById('tab-' + tabId);
  }

  /** Mount tab HTML with fallback insertion points. */
  function mountTabHtml(tabId, html) {
    var slot = document.getElementById('optional-tab-slot-' + tabId);
    if (slot) {
      slot.outerHTML = html;
      runMountedScripts(getMountedTabRoot(tabId), html);
      return true;
    }
    var existing = document.getElementById('tab-' + tabId);
    if (existing) {
      existing.outerHTML = html;
      runMountedScripts(getMountedTabRoot(tabId), html);
      return true;
    }

    var customSlot = document.getElementById('optional-tab-custom-slot');
    if (customSlot) {
      var wrapped = html;
      if (!/id\s*=\s*"tab-[^"]+"/i.test(html)) {
        wrapped = '<div class="tab-content" id="tab-' + tabId + '">' + html + '</div>';
      }
      customSlot.insertAdjacentHTML('beforebegin', wrapped);
      runMountedScripts(getMountedTabRoot(tabId), html);
      return true;
    }

    var stage = document.getElementById('windowStage');
    if (stage) {
      var finalHtml = html;
      if (!/id\s*=\s*"tab-[^"]+"/i.test(html)) {
        finalHtml = '<div class="tab-content" id="tab-' + tabId + '">' + html + '</div>';
      }
      stage.insertAdjacentHTML('beforeend', finalHtml);
      runMountedScripts(getMountedTabRoot(tabId), html);
      return true;
    }
    return false;
  }

  /** Build placeholder HTML for disabled or invalid optional apps. */
  function createDisabledTabHtml(tabId, reason) {
    return '<div class="tab-content" id="tab-' + tabId + '">' +
      '<div class="placeholder-sm text-xs-c" style="padding:var(--space-4)">' + reason + '</div>' +
      '</div>';
  }

  /** Read and parse manifest with safe fallbacks. */
  function resolveManifest() {
    var raw = syncGetText(MANIFEST_PATH);
    if (!raw) return { nonCoreApps: DEFAULT_NON_CORE, customApps: [] };
    try {
      var parsed = JSON.parse(raw);
      var nonCoreApps = Array.isArray(parsed.nonCoreApps) ? parsed.nonCoreApps : DEFAULT_NON_CORE;
      var customApps = Array.isArray(parsed.customApps) ? parsed.customApps : [];
      return { nonCoreApps: nonCoreApps, customApps: customApps };
    } catch (_) {
      return { nonCoreApps: DEFAULT_NON_CORE, customApps: [] };
    }
  }

  /** Normalize one manifest entry into a stable internal shape. */
  function normalizeEntry(entry, fallback, defaultNavTarget) {
    var tabId = String(entry && entry.tabId || fallback && fallback.tabId || '').trim();
    var path = String(entry && entry.path || fallback && fallback.path || '').trim();
    var enabled = entry && entry.enabled !== undefined ? entry.enabled !== false : (fallback ? fallback.enabled !== false : true);
    var label = String(entry && entry.label || fallback && fallback.label || tabId).trim() || tabId;
    var icon = String(entry && entry.icon || fallback && fallback.icon || '🧩').trim() || '🧩';
    var navTarget = String(entry && entry.navTarget || fallback && fallback.navTarget || defaultNavTarget).trim();
    return {
      tabId: tabId,
      path: path,
      enabled: enabled,
      label: label,
      icon: icon,
      navTarget: navTarget,
      id: String(entry && entry.id || tabId || 'custom').trim()
    };
  }

  /** Mount non-tab custom HTML blocks into custom host areas. */
  function mountCustomHtmlEntries(entries) {
    entries.forEach(function (entry) {
      if (!entry || entry.enabled === false) return;
      if (!isSafeHtmlPath(entry.path)) return;
      var html = syncGetText(entry.path);
      if (!html) return;
      var targetSelector = String(entry.target || '#nonCoreCustomAppHost').trim();
      var target = document.querySelector(targetSelector);
      if (!target) return;
      if (String(entry.mode || 'append').toLowerCase() === 'replace') {
        target.innerHTML = '';
      }
      var wrap = document.createElement('div');
      wrap.className = 'non-core-custom-block';
      wrap.dataset.customAppId = String(entry.id || 'custom');
      wrap.innerHTML = html;
      target.appendChild(wrap);
    });
  }

  // ── Core Flow ─────────────────────────────────────────────────────────────

  /** Orchestrate optional/custom HTML loading and nav visibility. */
  function loadNonCoreAppHtml() {
    var manifest = resolveManifest();

    // Installer anchor: hello-world app registration.
    // JsonEntryId: "hello-loader-001"
    manifest.nonCoreApps.push({ tabId: 'helloworld', enabled: true, path: 'apps/non-core/core/tab-hello-world.html', label: 'Hello World', icon: '🏓', navTarget: '#navOptionalAppsHost' });

    var enabledTabs = new Set();
    var managedTabs = new Set(Object.keys(DEFAULT_NON_CORE_BY_TAB));

    manifest.nonCoreApps.forEach(function (entry) {
      var fallback = DEFAULT_NON_CORE_BY_TAB[String(entry && entry.tabId || '').trim()] || null;
      var normalized = normalizeEntry(entry, fallback, '#navOptionalAppsHost');
      var tabId = normalized.tabId;
      if (!tabId) return;
      managedTabs.add(tabId);
      var enabled = normalized.enabled;
      if (!enabled) {
        setNavVisibility(tabId, false);
        mountTabHtml(tabId, createDisabledTabHtml(tabId, 'Optional app disabled.'));
        return;
      }
      var path = normalized.path;
      if (!isSafeHtmlPath(path)) {
        setNavVisibility(tabId, false);
        mountTabHtml(tabId, createDisabledTabHtml(tabId, 'Optional app path is invalid.'));
        return;
      }
      var html = syncGetText(path);
      if (!html) {
        setNavVisibility(tabId, false);
        mountTabHtml(tabId, createDisabledTabHtml(tabId, 'Optional app HTML is missing.'));
        return;
      }
      mountTabHtml(tabId, html);
      setNavVisibility(tabId, true);
      ensureNavButton(normalized, false);
      enabledTabs.add(tabId);
    });

    managedTabs.forEach(function (tabId) {
      if (!enabledTabs.has(tabId)) {
        setNavVisibility(tabId, false);
      }
    });

    (manifest.customApps || []).forEach(function (entry) {
      if (!entry) return;
      var normalized = normalizeEntry(entry, null, '#navCustomAppsHost');

      if (!normalized.tabId) {
        mountCustomHtmlEntries([entry]);
        return;
      }

      if (!isSafeTabId(normalized.tabId)) return;

      if (normalized.enabled === false) {
        setNavVisibility(normalized.tabId, false);
        return;
      }

      if (!isSafeHtmlPath(normalized.path)) {
        setNavVisibility(normalized.tabId, false);
        return;
      }

      var html = syncGetText(normalized.path);
      if (!html) {
        setNavVisibility(normalized.tabId, false);
        return;
      }

      mountTabHtml(normalized.tabId, html);
      ensureNavButton(normalized, true);
      setNavVisibility(normalized.tabId, true);
    });

    return true;
  }

  // Boot contract: expose readiness promise for boot.js to await.
  window.__nonCoreHtmlReady = Promise.resolve(loadNonCoreAppHtml());
})();
