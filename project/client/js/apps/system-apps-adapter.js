// ============================================================
// NekoCore OS - System Apps Compatibility Adapter
// B-2 compatibility layer: reads system-apps.json and overlays
// launcher/window metadata onto legacy WINDOW_APPS without
// changing existing shell call paths.
// ============================================================

(function (global) {
  'use strict';

  var MANIFEST_PATH = 'js/apps/system-apps.json';
  var cachedManifest = null;

  function safeParseJson(raw) {
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw.replace(/^\uFEFF/, ''));
    } catch (_) {
      return null;
    }
  }

  function syncGetText(path) {
    try {
      if (typeof XMLHttpRequest === 'undefined') return null;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send(null);
      if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) {
        return xhr.responseText;
      }
    } catch (_) {
      // Keep legacy behavior on read errors.
    }
    return null;
  }

  function normalizeManifest(rawManifest) {
    if (!rawManifest || typeof rawManifest !== 'object') return null;
    if (!Array.isArray(rawManifest.apps)) return null;
    return rawManifest;
  }

  function buildAppMap(manifest) {
    var byId = new Map();
    manifest.apps.forEach(function (entry) {
      if (!entry || typeof entry !== 'object') return;
      var id = String(entry.id || '').trim();
      if (!id) return;
      byId.set(id, entry);
    });
    return byId;
  }

  function shouldUseSystemIcon(iconValue) {
    var icon = String(iconValue || '').trim();
    if (!icon) return false;
    // Current B-1 manifest records icon ownership hints rather than renderable SVG/HTML.
    if (/^WINDOW_APPS:/.test(icon)) return false;
    return true;
  }

  function applyCompatToLegacy(windowApps, categoryByTab, manifest) {
    if (!Array.isArray(windowApps)) return { ok: false, reason: 'window-apps-missing' };
    var normalized = normalizeManifest(manifest);
    if (!normalized) return { ok: false, reason: 'manifest-invalid' };

    var byId = buildAppMap(normalized);
    var touched = 0;

    windowApps.forEach(function (legacyApp) {
      if (!legacyApp || typeof legacyApp !== 'object') return;
      var id = String(legacyApp.tab || '').trim();
      if (!id) return;
      var next = byId.get(id);
      if (!next) return;

      if (typeof next.name === 'string' && next.name.trim()) {
        legacyApp.label = next.name;
      }

      if (next.defaultWindow && Number.isFinite(Number(next.defaultWindow.width))) {
        legacyApp.w = Number(next.defaultWindow.width);
      }

      if (next.defaultWindow && Number.isFinite(Number(next.defaultWindow.height))) {
        legacyApp.h = Number(next.defaultWindow.height);
      }

      if (shouldUseSystemIcon(next.icon)) {
        legacyApp.icon = next.icon;
      }

      legacyApp._systemSourcePath = typeof next.sourcePath === 'string' ? next.sourcePath : legacyApp._systemSourcePath;
      legacyApp._systemLaunchMode = typeof next.launchMode === 'string' ? next.launchMode : legacyApp._systemLaunchMode;
      legacyApp._systemOptional = typeof next.optional === 'boolean' ? next.optional : legacyApp._systemOptional;

      if (categoryByTab && typeof categoryByTab === 'object' && typeof next.category === 'string' && next.category.trim()) {
        categoryByTab[id] = next.category.trim();
      }

      touched += 1;
    });

    return {
      ok: true,
      touched: touched,
      total: normalized.apps.length,
      version: String(normalized.version || ''),
      path: MANIFEST_PATH
    };
  }

  function loadManifestSync() {
    if (cachedManifest) return cachedManifest;
    var raw = syncGetText(MANIFEST_PATH);
    if (!raw) return null;
    var parsed = safeParseJson(raw);
    cachedManifest = normalizeManifest(parsed);
    return cachedManifest;
  }

  function toLegacyWindowShape(entry, legacyMap) {
    var id = String(entry && entry.id || '').trim();
    if (!id) return null;
    var legacy = legacyMap.get(id) || null;
    return {
      tab: id,
      label: String(entry && entry.name || (legacy && legacy.label) || id),
      icon: legacy && legacy.icon ? legacy.icon : '<img src="/shared-assets/AppTrayIcon.png" alt="" aria-hidden="true" class="os-runtime-icon-img">',
      accent: legacy && legacy.accent ? legacy.accent : 'green',
      w: entry && entry.defaultWindow && Number.isFinite(Number(entry.defaultWindow.width)) ? Number(entry.defaultWindow.width) : (legacy && Number(legacy.w)) || 900,
      h: entry && entry.defaultWindow && Number.isFinite(Number(entry.defaultWindow.height)) ? Number(entry.defaultWindow.height) : (legacy && Number(legacy.h)) || 640
    };
  }

  function resolveWindowApps(windowApps, options) {
    if (!Array.isArray(windowApps)) return [];
    var opts = options && typeof options === 'object' ? options : {};
    if (opts.preferManifest === false) return windowApps;

    var manifest = opts.manifest || loadManifestSync();
    var normalized = normalizeManifest(manifest);
    if (!normalized) return windowApps;

    var legacyMap = new Map();
    windowApps.forEach(function (app) {
      if (!app || typeof app !== 'object') return;
      var id = String(app.tab || '').trim();
      if (!id) return;
      legacyMap.set(id, app);
    });

    var resolved = normalized.apps.map(function (entry) {
      return toLegacyWindowShape(entry, legacyMap);
    }).filter(Boolean);

    if (!resolved.length) return windowApps;
    return resolved;
  }

  function applyCompat(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var manifest = opts.manifest || loadManifestSync();
    if (!manifest) {
      return { ok: false, reason: 'manifest-unavailable', path: MANIFEST_PATH };
    }

    return applyCompatToLegacy(opts.windowApps, opts.categoryByTab, manifest);
  }

  var api = {
    MANIFEST_PATH: MANIFEST_PATH,
    safeParseJson: safeParseJson,
    normalizeManifest: normalizeManifest,
    applyCompatToLegacy: applyCompatToLegacy,
    applyCompat: applyCompat,
    loadManifestSync: loadManifestSync,
    resolveWindowApps: resolveWindowApps
  };

  global.SystemAppsAdapter = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);