// ============================================================
// NekoCore OS — Theme Manager
// Extracted from app.js by P3-S10
// Depends on globals: none (self-contained DOM + localStorage)
// Exports: THEME_STORAGE_KEY, SHELL_THEMES, getStoredThemeId,
//   updateShellThemeSummary, syncThemeSelectorUI, renderThemeGallery, applyTheme
// ============================================================

const THEME_STORAGE_KEY = 'rem-ui-theme';
const SHELL_THEMES = {
  'system-default': { id: 'system-default', label: 'System Default', href: '' },
  'light-default': { id: 'light-default', label: 'Light Mode', href: 'themes/light-default.css' },
  'neko-default': { id: 'neko-default', label: 'NekoCore', href: 'themes/neko-default.css' },
  'sunset-terminal': { id: 'sunset-terminal', label: 'Sunset Terminal', href: 'themes/sunset-terminal.css' },
  'frosted-orbit': { id: 'frosted-orbit', label: 'Frosted Orbit', href: 'themes/frosted-orbit.css' },
  'mac-sequoia': { id: 'mac-sequoia', label: 'Mac Sequoia', href: 'themes/mac-sequoia.css' },
  'ubuntu-dash': { id: 'ubuntu-dash', label: 'Ubuntu Dash', href: 'themes/ubuntu-dash.css' },
  'glass-clear': { id: 'glass-clear', label: 'Glass Clear', href: 'themes/glass-clear.css' }
};

let systemThemeMediaQuery = null;

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
  const THEME_PREVIEWS = {
    'system-default': { bg: 'linear-gradient(135deg,#1a1a2e 50%,#f5f5f5 50%)', fg: '#fff', accent: '#6c63ff' },
    'light-default':  { bg: '#f5f5f5', fg: '#1a1a2e', accent: '#0078d4' },
    'neko-default':   { bg: '#04060d', fg: '#e4e4e7', accent: '#34d399' },
    'sunset-terminal':{ bg: '#1c1017', fg: '#f0d0a0', accent: '#ff6b35' },
    'frosted-orbit':  { bg: '#101828', fg: '#d0dff0', accent: '#38bdf8' },
    'mac-sequoia':    { bg: '#1e1e2e', fg: '#cdd6f4', accent: '#89b4fa' },
    'ubuntu-dash':    { bg: '#2c001e', fg: '#ffffff', accent: '#e95420' },
    'glass-clear':    { bg: '#000000', fg: '#f4f4f5', accent: '#e4e4e7' }
  };
  Object.entries(SHELL_THEMES).forEach(([id, theme]) => {
    const p = THEME_PREVIEWS[id] || { bg: '#222', fg: '#eee', accent: '#888' };
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
  const selected = SHELL_THEMES[themeId] ? themeId : 'neko-default';
  const theme = SHELL_THEMES[selected];
  const themeLink = document.getElementById('themeOverrideLink');

  if (systemThemeMediaQuery && systemThemeMediaQuery.__remListener) {
    systemThemeMediaQuery.removeEventListener('change', systemThemeMediaQuery.__remListener);
    systemThemeMediaQuery.__remListener = null;
  }

  const applyResolvedTheme = (resolvedId) => {
    const resolvedTheme = SHELL_THEMES[resolvedId] || SHELL_THEMES['neko-default'];
    if (themeLink) {
      themeLink.setAttribute('href', resolvedTheme.href);
    }
    document.documentElement.setAttribute('data-theme', selected);
    if (document.body) {
      document.body.classList.toggle('theme-ubuntu-dash', resolvedTheme.id === 'ubuntu-dash');
      document.body.classList.toggle('theme-mac-sequoia', resolvedTheme.id === 'mac-sequoia');
      document.body.classList.toggle('theme-light-mode', resolvedTheme.id === 'light-default');
    }
    updateShellThemeSummary(selected);
  };

  if (selected === 'system-default') {
    systemThemeMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const resolveSystemTheme = () => (systemThemeMediaQuery && systemThemeMediaQuery.matches) ? 'neko-default' : 'light-default';
    applyResolvedTheme(resolveSystemTheme());
    if (systemThemeMediaQuery) {
      const listener = () => applyResolvedTheme(resolveSystemTheme());
      systemThemeMediaQuery.addEventListener('change', listener);
      systemThemeMediaQuery.__remListener = listener;
    }
  } else {
    applyResolvedTheme(selected);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, selected);
  } catch (_) {
    // Ignore storage failures and continue with in-memory theme.
  }
  syncThemeSelectorUI(selected);
}
