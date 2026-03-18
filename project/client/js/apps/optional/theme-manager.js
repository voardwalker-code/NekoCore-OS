// ============================================================
// NekoCore OS — Theme Manager
// Extracted from app.js by P3-S10
// Depends on globals: none (self-contained DOM + localStorage)
// Exports: THEME_STORAGE_KEY, SHELL_THEMES, getStoredThemeId,
//   updateShellThemeSummary, syncThemeSelectorUI, renderThemeGallery, applyTheme
// ============================================================

const THEME_STORAGE_KEY = 'rem-ui-theme';
const THEME_CUSTOM_STORAGE_KEY = 'rem-ui-theme-custom';
const THEME_USER_THEMES_STORAGE_KEY = 'rem-ui-user-themes';
const THEME_FALLBACK_ID = 'neko-default';
const THEME_MANIFEST_PATH = 'themes/themes.manifest.json';
const THEME_EXTENSION_HOST_ID = 'themeCustomExtensionHost';
const THEME_WALLPAPER_BASE_PATH = '/shared-assets/Background images/';
const THEME_WALLPAPER_OPTIONS = [
  { value: '', label: 'Gradient Only' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_31_33 PM.png', label: 'Background 01' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_32_43 PM.png', label: 'Background 02' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_33_47 PM.png', label: 'Background 03' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_34_29 PM.png', label: 'Background 04' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_34_58 PM.png', label: 'Background 05' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_36_16 PM.png', label: 'Background 06' },
  { value: 'ChatGPT Image Mar 17, 2026, 12_37_32 PM.png', label: 'Background 07' }
];
const THEME_WALLPAPER_ALLOWED = new Set(THEME_WALLPAPER_OPTIONS.map((item) => item.value));
const THEME_WALLPAPER_BY_THEME = {
  'system-default': { image: 'ChatGPT Image Mar 17, 2026, 12_31_33 PM.png', tintA: 'rgba(11, 19, 34, 0.06)', tintB: 'rgba(15, 23, 42, 0.08)' },
  'light-default': { image: 'ChatGPT Image Mar 17, 2026, 12_32_43 PM.png', tintA: 'rgba(224, 242, 254, 0.06)', tintB: 'rgba(191, 219, 254, 0.08)' },
  'neko-default': { image: 'ChatGPT Image Mar 17, 2026, 12_33_47 PM.png', tintA: 'rgba(16, 185, 129, 0.06)', tintB: 'rgba(6, 78, 59, 0.08)' },
  'sunset-terminal': { image: 'ChatGPT Image Mar 17, 2026, 12_34_29 PM.png', tintA: 'rgba(249, 115, 22, 0.06)', tintB: 'rgba(124, 45, 18, 0.08)' },
  'frosted-orbit': { image: 'ChatGPT Image Mar 17, 2026, 12_34_58 PM.png', tintA: 'rgba(56, 189, 248, 0.06)', tintB: 'rgba(30, 64, 175, 0.08)' },
  'glass-clear': { image: 'ChatGPT Image Mar 17, 2026, 12_36_16 PM.png', tintA: 'rgba(255, 255, 255, 0.03)', tintB: 'rgba(255, 255, 255, 0.05)' },
  'mac-sequoia': { image: 'ChatGPT Image Mar 17, 2026, 12_37_32 PM.png', tintA: 'rgba(125, 211, 252, 0.06)', tintB: 'rgba(59, 130, 246, 0.08)' },
  'ubuntu-dash': { image: 'ChatGPT Image Mar 17, 2026, 12_34_29 PM.png', tintA: 'rgba(251, 146, 60, 0.06)', tintB: 'rgba(194, 65, 12, 0.08)' }
};
const BUILTIN_SHELL_THEMES = {
  'system-default': { id: 'system-default', label: 'System Default', href: '' },
  'light-default': { id: 'light-default', label: 'Light Mode', href: 'themes/core/light-default.css', bodyClasses: ['theme-light-mode'] },
  'neko-default': { id: 'neko-default', label: 'NekoCore', href: 'themes/core/neko-default.css' },
  'sunset-terminal': { id: 'sunset-terminal', label: 'Sunset Terminal', href: 'themes/core/sunset-terminal.css' },
  'frosted-orbit': { id: 'frosted-orbit', label: 'Frosted Orbit', href: 'themes/core/frosted-orbit.css' },
  'glass-clear': { id: 'glass-clear', label: 'Glass Clear', href: 'themes/core/glass-clear.css' }
};
let SHELL_THEMES = { ...BUILTIN_SHELL_THEMES };

let systemThemeMediaQuery = null;
let themeCssErrorCount = 0;
let activeThemeBodyClasses = [];
let activeThemeExtraLinks = [];
let activeThemeExtraNodes = [];
let activeThemeCustomData = null;

const THEME_CUSTOM_DEFAULTS = {
  backgroundStart: '#04060d',
  backgroundEnd: '#0b172a',
  bgOpacity: 0.2,
  wallpaperImage: '',
  windowColor: '#0d1526',
  windowOpacity: 0.82,
  textPrimary: '#e4e4e7',
  textSecondary: '#a1a1aa',
  inputBg: '#ffffff',
  inputText: '#111111',
  accent: '#34d399'
};

function _clamp(num, min, max) {
  return Math.max(min, Math.min(max, Number(num)));
}

function _isValidThemeEntry(id, theme) {
  if (!id || typeof id !== 'string') return false;
  if (!theme || typeof theme !== 'object') return false;
  if (!theme.label || typeof theme.label !== 'string') return false;
  if (typeof theme.href !== 'string') return false;
  if (theme.href && !theme.href.endsWith('.css')) return false;
  return true;
}

function _isSafeThemeAssetPath(path, ext) {
  const str = String(path || '').trim();
  if (!str) return false;
  if (!str.startsWith('themes/')) return false;
  if (str.includes('..')) return false;
  if (ext && !str.endsWith(ext)) return false;
  return true;
}

function _normalizeBodyClasses(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  raw.forEach((entry) => {
    const cls = String(entry || '').trim();
    if (!cls) return;
    if (!/^[a-z0-9_-]+$/i.test(cls)) return;
    if (seen.has(cls)) return;
    seen.add(cls);
    out.push(cls);
  });
  return out;
}

function _normalizeThemeExtras(rawExtras) {
  const extras = {
    css: [],
    html: []
  };
  if (!rawExtras || typeof rawExtras !== 'object') return extras;
  if (Array.isArray(rawExtras.css)) {
    rawExtras.css.forEach((path) => {
      const p = String(path || '').trim();
      if (_isSafeThemeAssetPath(p, '.css')) extras.css.push(p);
    });
  }
  if (Array.isArray(rawExtras.html)) {
    rawExtras.html.forEach((entry) => {
      const path = String(entry?.path || '').trim();
      const target = String(entry?.target || '#' + THEME_EXTENSION_HOST_ID).trim();
      const mode = String(entry?.mode || 'append').trim().toLowerCase();
      if (!_isSafeThemeAssetPath(path, '.html')) return;
      if (!target.startsWith('#') && !target.startsWith('.')) return;
      extras.html.push({
        path,
        target,
        mode: mode === 'replace' ? 'replace' : 'append'
      });
    });
  }
  return extras;
}

function _normalizeThemeManifest(entries) {
  const normalized = {
    'system-default': { ...BUILTIN_SHELL_THEMES['system-default'] }
  };
  if (Array.isArray(entries)) {
    entries.forEach((entry) => {
      const id = String(entry?.id || '').trim();
      const theme = {
        id,
        label: String(entry?.label || ''),
        href: String(entry?.href || ''),
        bodyClasses: _normalizeBodyClasses(entry?.bodyClasses),
        preview: (entry?.preview && typeof entry.preview === 'object') ? {
          bg: String(entry.preview.bg || ''),
          fg: String(entry.preview.fg || ''),
          accent: String(entry.preview.accent || '')
        } : null,
        extras: _normalizeThemeExtras(entry?.extras)
      };
      if (_isValidThemeEntry(id, theme)) normalized[id] = theme;
    });
  }
  if (!normalized[THEME_FALLBACK_ID]) {
    normalized[THEME_FALLBACK_ID] = { ...BUILTIN_SHELL_THEMES[THEME_FALLBACK_ID] };
  }
  return normalized;
}

async function loadThemeManifest() {
  try {
    const response = await fetch(THEME_MANIFEST_PATH, { cache: 'no-store' });
    if (!response.ok) return false;
    const payload = await response.json();
    const nextThemes = _normalizeThemeManifest(payload?.themes);
    if (!nextThemes || !nextThemes[THEME_FALLBACK_ID]) return false;
    SHELL_THEMES = nextThemes;
    return true;
  } catch (_) {
    return false;
  }
}

function _persistThemeId(themeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (_) {
    // Ignore storage failures and continue with in-memory theme.
  }
}

function _clearThemeBodyClasses() {
  if (!document.body) return;
  activeThemeBodyClasses.forEach((cls) => document.body.classList.remove(cls));
  activeThemeBodyClasses = [];
}

function _applyThemeBodyClasses(theme) {
  _clearThemeBodyClasses();
  if (!document.body) return;
  const classes = _normalizeBodyClasses(theme?.bodyClasses);
  classes.forEach((cls) => document.body.classList.add(cls));
  activeThemeBodyClasses = classes;
}

function _clearThemeExtras() {
  activeThemeExtraLinks.forEach((link) => {
    if (link && link.parentNode) link.parentNode.removeChild(link);
  });
  activeThemeExtraLinks = [];
  activeThemeExtraNodes.forEach((node) => {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  });
  activeThemeExtraNodes = [];
}

function _resolveThemeExtraTarget(selector) {
  const host = document.getElementById(THEME_EXTENSION_HOST_ID);
  if (selector) {
    const target = document.querySelector(selector);
    if (target) return target;
  }
  return host || document.body;
}

function _applyThemeExtras(theme) {
  _clearThemeExtras();
  const extras = theme?.extras || {};
  const css = Array.isArray(extras.css) ? extras.css : [];
  const htmlEntries = Array.isArray(extras.html) ? extras.html : [];

  css.forEach((path) => {
    if (!_isSafeThemeAssetPath(path, '.css')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path;
    link.dataset.themeExtra = '1';
    link.addEventListener('error', () => {
      _setCustomizerStatus('Theme extra CSS failed to load: ' + path);
    }, { once: true });
    document.head.appendChild(link);
    activeThemeExtraLinks.push(link);
  });

  htmlEntries.forEach((entry) => {
    if (!_isSafeThemeAssetPath(entry.path, '.html')) return;
    fetch(entry.path, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('missing');
        return response.text();
      })
      .then((html) => {
        const target = _resolveThemeExtraTarget(entry.target);
        if (!target) return;
        if (entry.mode === 'replace') target.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'theme-extra-block';
        wrap.dataset.themeExtraPath = entry.path;
        wrap.innerHTML = html;
        target.appendChild(wrap);
        activeThemeExtraNodes.push(wrap);
      })
      .catch(() => {
        _setCustomizerStatus('Theme extra HTML failed to load: ' + entry.path);
      });
  });
}

function _wireThemeLinkFallback(themeLink, attemptedThemeId) {
  if (!themeLink) return;
  if (themeLink.__remThemeErrorHandler) {
    themeLink.removeEventListener('error', themeLink.__remThemeErrorHandler);
    themeLink.__remThemeErrorHandler = null;
  }
  if (!attemptedThemeId || !SHELL_THEMES[attemptedThemeId] || !SHELL_THEMES[attemptedThemeId].href) return;
  const onError = () => {
    themeCssErrorCount += 1;
    if (themeCssErrorCount > 1 || attemptedThemeId === THEME_FALLBACK_ID) {
      _persistThemeId('system-default');
      applyTheme('system-default');
      _setCustomizerStatus('Theme load failed. Switched to system default.');
      return;
    }
    _persistThemeId(THEME_FALLBACK_ID);
    applyTheme(THEME_FALLBACK_ID);
    _setCustomizerStatus('Theme load failed. Reverted to NekoCore default.');
  };
  themeLink.addEventListener('error', onError, { once: true });
  themeLink.__remThemeErrorHandler = onError;
}

function getStoredThemeId() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'system-default';
  } catch (_) {
    return 'system-default';
  }
}

function updateShellThemeSummary(themeId) {
  const resolvedThemeId = themeId === 'system-default'
    ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'neko-default' : 'light-default')
    : themeId;
  const theme = SHELL_THEMES[resolvedThemeId] || SHELL_THEMES['neko-default'];
  const summary = document.getElementById('shellThemeSummary');
  if (summary) summary.textContent = themeId === 'system-default' ? 'System (' + theme.label + ')' : theme.label;
  const tmTheme = document.getElementById('tmThemeName');
  if (tmTheme) tmTheme.textContent = themeId === 'system-default' ? 'System (' + theme.label + ')' : theme.label;
}

function _readStoredThemeCustom() {
  try {
    const raw = localStorage.getItem(THEME_CUSTOM_STORAGE_KEY);
    if (!raw) return { enabled: false, ...THEME_CUSTOM_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { enabled: parsed?.enabled === true, ...THEME_CUSTOM_DEFAULTS, ...(parsed || {}) };
  } catch (_) {
    return { enabled: false, ...THEME_CUSTOM_DEFAULTS };
  }
}

function _saveThemeCustom(custom) {
  try {
    localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, JSON.stringify({ ...custom, enabled: true }));
  } catch (_) {
    // Ignore storage failures.
  }
}

function _hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
  if (!m) return { r: 13, g: 21, b: 38 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function _rgbaFromHex(hex, alpha) {
  const rgb = _hexToRgb(hex);
  const a = _clamp(alpha, 0, 1);
  return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + a.toFixed(2) + ')';
}

function _setCustomizerStatus(message) {
  const el = document.getElementById('themeCustomizerStatus');
  if (el) el.textContent = message;
}

function _sanitizeThemeName(value) {
  const raw = String(value || '').trim();
  return raw || 'My Custom Theme';
}

function _slugThemeName(value) {
  return _sanitizeThemeName(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'custom-theme';
}

function _sanitizeWallpaperImage(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  if (THEME_WALLPAPER_ALLOWED.has(candidate)) return candidate;
  if (candidate.includes('..')) return '';
  if (candidate.includes('/') || candidate.includes('\\')) return '';
  if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(candidate)) return '';
  if (!/^[a-z0-9 _.,()\-]+$/i.test(candidate)) return '';
  return candidate;
}

function _buildWallpaperImageUrl(fileName) {
  const safeName = _sanitizeWallpaperImage(fileName);
  if (!safeName) return '';
  return encodeURI(THEME_WALLPAPER_BASE_PATH + safeName);
}

function _renderWallpaperOptions() {
  const select = document.getElementById('themeWallpaperImage');
  if (!select) return;
  select.innerHTML = '';
  THEME_WALLPAPER_OPTIONS.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.value;
    option.textContent = entry.label;
    select.appendChild(option);
  });
}

function _readUserThemes() {
  try {
    const raw = localStorage.getItem(THEME_USER_THEMES_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string' && typeof entry.label === 'string' && entry.customData && typeof entry.customData === 'object');
  } catch (_) {
    return [];
  }
}

function _writeUserThemes(entries) {
  try {
    localStorage.setItem(THEME_USER_THEMES_STORAGE_KEY, JSON.stringify(Array.isArray(entries) ? entries : []));
  } catch (_) {
    // Ignore storage failures.
  }
}

function _injectUserThemes() {
  const userThemes = _readUserThemes();
  userThemes.forEach((entry) => {
    const baseTheme = SHELL_THEMES[entry.baseThemeId] || SHELL_THEMES[THEME_FALLBACK_ID] || SHELL_THEMES['system-default'];
    SHELL_THEMES[entry.id] = {
      id: entry.id,
      label: entry.label,
      href: baseTheme?.href || '',
      bodyClasses: Array.isArray(baseTheme?.bodyClasses) ? [...baseTheme.bodyClasses] : [],
      extras: baseTheme?.extras || { css: [], html: [] },
      preview: {
        bg: 'linear-gradient(135deg, ' + String(entry.customData.backgroundStart || '#1b263b') + ', ' + String(entry.customData.backgroundEnd || '#0f172a') + ')',
        fg: String(entry.customData.textPrimary || '#e5e7eb'),
        accent: String(entry.customData.accent || '#34d399')
      },
      isUserTheme: true,
      customData: entry.customData
    };
  });
}

function _saveCurrentAsUserTheme(custom) {
  const themeName = _sanitizeThemeName(document.getElementById('themeCustomName')?.value);
  const baseThemeId = getStoredThemeId();
  const id = 'user-' + _slugThemeName(themeName) + '-' + Date.now();
  const customData = { ...THEME_CUSTOM_DEFAULTS, ...custom, themeName, enabled: true };
  const userThemes = _readUserThemes();
  userThemes.push({ id, label: themeName, baseThemeId, customData, createdAt: new Date().toISOString() });
  _writeUserThemes(userThemes);
  _injectUserThemes();
  return id;
}

function _applyThemeWallpaperPreset(themeId) {
  const root = document.documentElement;
  if (!root) return;
  const preset = THEME_WALLPAPER_BY_THEME[themeId] || null;
  if (!preset || !preset.image) {
    root.style.removeProperty('--desktop-wallpaper');
    root.style.removeProperty('--desktop-overlay');
    return;
  }
  const imageUrl = _buildWallpaperImageUrl(preset.image);
  if (!imageUrl) {
    root.style.removeProperty('--desktop-wallpaper');
    root.style.removeProperty('--desktop-overlay');
    return;
  }
  const tintA = String(preset.tintA || 'rgba(10, 16, 30, 0.06)');
  const tintB = String(preset.tintB || 'rgba(10, 16, 30, 0.08)');
  root.style.setProperty(
    '--desktop-wallpaper',
    'linear-gradient(180deg, ' + tintA + ' 0%, ' + tintB + ' 100%), url("' + imageUrl + '") center/cover no-repeat fixed'
  );
  root.style.setProperty('--desktop-overlay', 'linear-gradient(135deg, rgba(6, 10, 18, 0.05), rgba(6, 10, 18, 0.12))');
}

function _syncCustomizerForm(custom) {
  const safeWallpaper = _sanitizeWallpaperImage(custom.wallpaperImage);
  const wallpaperIsPreset = THEME_WALLPAPER_ALLOWED.has(safeWallpaper);
  const map = {
    themeBgStart: custom.backgroundStart,
    themeBgEnd: custom.backgroundEnd,
    themeBgOpacity: String(custom.bgOpacity !== undefined ? custom.bgOpacity : 1),
    themeWallpaperImage: wallpaperIsPreset ? safeWallpaper : '',
    themeWallpaperCustom: wallpaperIsPreset ? '' : safeWallpaper,
    themeCustomName: _sanitizeThemeName(custom.themeName || ''),
    themeWindowColor: custom.windowColor,
    themeWindowOpacity: String(custom.windowOpacity),
    themeTextPrimary: custom.textPrimary,
    themeTextSecondary: custom.textSecondary,
    themeInputBg: custom.inputBg,
    themeInputText: custom.inputText,
    themeAccent: custom.accent
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  const opacityEl = document.getElementById('themeWindowOpacityValue');
  if (opacityEl) opacityEl.textContent = Number(custom.windowOpacity).toFixed(2);
  const bgOpacityEl = document.getElementById('themeBgOpacityValue');
  if (bgOpacityEl) bgOpacityEl.textContent = Math.round(Number(custom.bgOpacity !== undefined ? custom.bgOpacity : 1) * 100) + '%';
}

function _collectCustomizerForm() {
  const get = (id, fallback) => (document.getElementById(id)?.value || fallback);
  const customWallpaper = _sanitizeWallpaperImage(get('themeWallpaperCustom', ''));
  const selectedWallpaper = _sanitizeWallpaperImage(get('themeWallpaperImage', THEME_CUSTOM_DEFAULTS.wallpaperImage));
  return {
    backgroundStart: get('themeBgStart', THEME_CUSTOM_DEFAULTS.backgroundStart),
    backgroundEnd: get('themeBgEnd', THEME_CUSTOM_DEFAULTS.backgroundEnd),
    bgOpacity: Number(get('themeBgOpacity', THEME_CUSTOM_DEFAULTS.bgOpacity)),
    wallpaperImage: customWallpaper || selectedWallpaper,
    windowColor: get('themeWindowColor', THEME_CUSTOM_DEFAULTS.windowColor),
    windowOpacity: Number(get('themeWindowOpacity', THEME_CUSTOM_DEFAULTS.windowOpacity)),
    textPrimary: get('themeTextPrimary', THEME_CUSTOM_DEFAULTS.textPrimary),
    textSecondary: get('themeTextSecondary', THEME_CUSTOM_DEFAULTS.textSecondary),
    inputBg: get('themeInputBg', THEME_CUSTOM_DEFAULTS.inputBg),
    inputText: get('themeInputText', THEME_CUSTOM_DEFAULTS.inputText),
    accent: get('themeAccent', THEME_CUSTOM_DEFAULTS.accent)
  };
}

function _applyThemeCustomToDom(custom) {
  const root = document.documentElement;
  if (!root || !custom) return;

  if (custom.enabled !== true) {
    _clearThemeCustomFromDom();
    return;
  }

  const bgOpacity = _clamp(custom.bgOpacity !== undefined ? custom.bgOpacity : 1, 0, 1);
  const bgStart = _rgbaFromHex(custom.backgroundStart, bgOpacity);
  const bgEnd   = _rgbaFromHex(custom.backgroundEnd,   bgOpacity);
  const gradientWallpaper = bgOpacity === 0 ? 'transparent' : 'linear-gradient(180deg, ' + bgStart + ' 0%, ' + bgEnd + ' 100%)';
  const wallpaperImageUrl = _buildWallpaperImageUrl(custom.wallpaperImage);
  const desktopWallpaper = wallpaperImageUrl
    ? (bgOpacity === 0
        ? 'url("' + wallpaperImageUrl + '") center/cover no-repeat fixed'
        : 'linear-gradient(180deg, ' + bgStart + ' 0%, ' + bgEnd + ' 100%), url("' + wallpaperImageUrl + '") center/cover no-repeat fixed')
    : gradientWallpaper;
  root.style.setProperty('--desktop-wallpaper', desktopWallpaper);
  root.style.setProperty('--surface-0', bgOpacity === 0 ? 'transparent' : _rgbaFromHex(custom.backgroundEnd, bgOpacity));
  root.style.setProperty('--surface-1', _rgbaFromHex(custom.windowColor, _clamp(custom.windowOpacity - 0.10, 0.50, 0.95)));
  root.style.setProperty('--surface-2', _rgbaFromHex(custom.windowColor, _clamp(custom.windowOpacity - 0.04, 0.56, 0.98)));
  root.style.setProperty('--surface-3', _rgbaFromHex(custom.windowColor, _clamp(custom.windowOpacity + 0.04, 0.62, 1)));
  root.style.setProperty('--window-bg', _rgbaFromHex(custom.windowColor, custom.windowOpacity));
  root.style.setProperty('--text-primary', custom.textPrimary);
  root.style.setProperty('--text-secondary', custom.textSecondary);
  root.style.setProperty('--accent', custom.accent);
  root.style.setProperty('--accent-strong', custom.accent);
  root.style.setProperty('--app-surface', 'var(--surface-1)');
  root.style.setProperty('--app-surface-alt', 'var(--surface-2)');
  root.style.setProperty('--app-surface-elevated', 'var(--surface-3)');
  root.style.setProperty('--app-text', custom.textPrimary);
  root.style.setProperty('--app-text-muted', custom.textSecondary);
  root.style.setProperty('--app-input-bg', custom.inputBg);
  root.style.setProperty('--app-input-bg-hover', custom.inputBg);
  root.style.setProperty('--app-input-bg-focus', custom.inputBg);
  root.style.setProperty('--app-input-text', custom.inputText);
  root.style.setProperty('--app-input-placeholder', custom.textSecondary);
  root.style.setProperty('--app-input-border', _rgbaFromHex(custom.windowColor, _clamp(custom.windowOpacity + 0.06, 0.18, 0.45)));
  root.style.setProperty('--app-input-border-focus', custom.accent);
  root.style.setProperty('--app-input-focus-ring', _rgbaFromHex(custom.accent, 0.18));
}

function _clearThemeCustomFromDom() {
  const root = document.documentElement;
  if (root) {
    ['--desktop-wallpaper', '--surface-0', '--surface-1', '--surface-2', '--surface-3', '--window-bg', '--text-primary', '--text-secondary', '--accent', '--accent-strong', '--app-surface', '--app-surface-alt', '--app-surface-elevated', '--app-text', '--app-text-muted', '--app-input-bg', '--app-input-bg-hover', '--app-input-bg-focus', '--app-input-text', '--app-input-placeholder', '--app-input-border', '--app-input-border-focus', '--app-input-focus-ring'].forEach((key) => {
      root.style.removeProperty(key);
    });
  }
}

function applyStoredThemeCustomizer() {
  _applyThemeCustomToDom(_readStoredThemeCustom());
}

function initThemeCustomizer() {
  const applyBtn = document.getElementById('themeCustomizerApply');
  const resetNekoBtn = document.getElementById('themeCustomizerResetNeko');
  const resetBtn = document.getElementById('themeCustomizerReset');
  if (!applyBtn || !resetBtn || !resetNekoBtn) return;

  _renderWallpaperOptions();

  const stored = _readStoredThemeCustom();
  _syncCustomizerForm(stored);

  const opacityInput = document.getElementById('themeWindowOpacity');
  if (opacityInput) {
    opacityInput.addEventListener('input', () => {
      const valueEl = document.getElementById('themeWindowOpacityValue');
      if (valueEl) valueEl.textContent = Number(opacityInput.value || 0).toFixed(2);
    });
  }

  const bgOpacityInput = document.getElementById('themeBgOpacity');
  if (bgOpacityInput) {
    bgOpacityInput.addEventListener('input', () => {
      const valueEl = document.getElementById('themeBgOpacityValue');
      if (valueEl) valueEl.textContent = Math.round(Number(bgOpacityInput.value || 0) * 100) + '%';
    });
  }

  applyBtn.addEventListener('click', () => {
    const custom = _collectCustomizerForm();
    const newThemeId = _saveCurrentAsUserTheme(custom);
    _saveThemeCustom({ ...custom, enabled: false });
    applyTheme(newThemeId);
    _setCustomizerStatus('Saved as new theme: ' + _sanitizeThemeName(document.getElementById('themeCustomName')?.value));
  });

  resetNekoBtn.addEventListener('click', () => {
    try { localStorage.removeItem(THEME_CUSTOM_STORAGE_KEY); } catch (_) {}
    _clearThemeCustomFromDom();
    const defaults = { ...THEME_CUSTOM_DEFAULTS };
    _syncCustomizerForm(defaults);
    applyTheme('neko-default');
    _setCustomizerStatus('Theme reset to standard NekoCore.');
  });

  resetBtn.addEventListener('click', () => {
    try { localStorage.removeItem(THEME_CUSTOM_STORAGE_KEY); } catch (_) {}
    _clearThemeCustomFromDom();
    const defaults = { ...THEME_CUSTOM_DEFAULTS };
    _syncCustomizerForm(defaults);
    _setCustomizerStatus('Customizer reset to theme defaults.');
    const currentTheme = getStoredThemeId();
    applyTheme(currentTheme);
  });
}

function syncThemeSelectorUI(themeId) {
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.classList.toggle('is-active', button.getAttribute('data-theme-option') === themeId);
  });
  updateShellThemeSummary(themeId);
  renderThemeGallery();
}

function renderThemeGallery() {
  const grid = document.getElementById('themeGalleryGrid');
  if (!grid) return;
  const currentId = getStoredThemeId();
  grid.innerHTML = '';
  Object.entries(SHELL_THEMES).forEach(([id, theme]) => {
    const p = (theme.preview && theme.preview.bg && theme.preview.fg && theme.preview.accent)
      ? theme.preview
      : { bg: '#222', fg: '#eee', accent: '#888' };
    const card = document.createElement('button');
    card.className = 'theme-card' + (id === currentId ? ' is-active' : '');
    card.type = 'button';
    card.onclick = () => applyTheme(id);
    card.innerHTML =
      '<div class="theme-card-preview" style="background:' + p.bg + '">' +
        '<div class="theme-card-bar" style="background:' + p.accent + '"></div>' +
        '<div class="theme-card-line" style="background:' + p.fg + ';opacity:.5"></div>' +
        '<div class="theme-card-line short" style="background:' + p.fg + ';opacity:.3"></div>' +
      '</div>' +
      '<div class="theme-card-label">' + theme.label + '</div>' +
      (id === currentId ? '<div class="theme-card-badge">Active</div>' : '');
    grid.appendChild(card);
  });
}

function applyTheme(themeId) {
  const selected = SHELL_THEMES[themeId]
    ? themeId
    : (SHELL_THEMES[THEME_FALLBACK_ID] ? THEME_FALLBACK_ID : 'system-default');
  const theme = SHELL_THEMES[selected] || SHELL_THEMES[THEME_FALLBACK_ID] || SHELL_THEMES['system-default'];
  const themeLink = document.getElementById('themeOverrideLink');
  themeCssErrorCount = 0;

  if (systemThemeMediaQuery && systemThemeMediaQuery.__remListener) {
    systemThemeMediaQuery.removeEventListener('change', systemThemeMediaQuery.__remListener);
    systemThemeMediaQuery.__remListener = null;
  }

  const applyResolvedTheme = (resolvedId) => {
    const resolvedTheme = SHELL_THEMES[resolvedId] || SHELL_THEMES[THEME_FALLBACK_ID] || SHELL_THEMES['system-default'];
    _wireThemeLinkFallback(themeLink, resolvedTheme.id);
    if (themeLink) {
      themeLink.setAttribute('href', resolvedTheme.href);
    }
    document.documentElement.setAttribute('data-theme', selected);
    _applyThemeBodyClasses(resolvedTheme);
    _applyThemeExtras(resolvedTheme);
    _applyThemeWallpaperPreset(resolvedTheme.id);
    activeThemeCustomData = resolvedTheme.isUserTheme ? { ...THEME_CUSTOM_DEFAULTS, ...(resolvedTheme.customData || {}), enabled: true } : null;
    updateShellThemeSummary(selected);
  };

  if (selected === 'system-default') {
    systemThemeMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const resolveSystemTheme = () => {
      const preferredId = (systemThemeMediaQuery && systemThemeMediaQuery.matches) ? 'neko-default' : 'light-default';
      if (SHELL_THEMES[preferredId]) return preferredId;
      if (SHELL_THEMES[THEME_FALLBACK_ID]) return THEME_FALLBACK_ID;
      return 'system-default';
    };
    applyResolvedTheme(resolveSystemTheme());
    if (systemThemeMediaQuery) {
      const listener = () => applyResolvedTheme(resolveSystemTheme());
      systemThemeMediaQuery.addEventListener('change', listener);
      systemThemeMediaQuery.__remListener = listener;
    }
  } else {
    applyResolvedTheme(selected);
  }

  _persistThemeId(selected);
  if (activeThemeCustomData) {
    _applyThemeCustomToDom(activeThemeCustomData);
    _syncCustomizerForm(activeThemeCustomData);
  } else {
    _clearThemeCustomFromDom();
    _syncCustomizerForm(_readStoredThemeCustom());
  }
  syncThemeSelectorUI(selected);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadThemeManifest();
  _injectUserThemes();
  initThemeCustomizer();
  const storedTheme = getStoredThemeId();
  applyTheme(storedTheme);
});
