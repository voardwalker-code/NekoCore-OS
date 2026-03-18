// ============================================================
// REM System v0.6.0 — App Bootstrap & Core Utilities
// ============================================================

// ============================================================
// GLOBAL STATE
// ============================================================
let busy = false;

// Active provider config: { type: 'openrouter'|'ollama', endpoint, apiKey, model }
let activeConfig = null;
let currentEntityId = null;
let currentEntityName = null;
let currentEntityAvatar = '\u{1F916}';
let currentEntityVoice = null;


// Chat state (used by chat.js)
let chatHistory = [];
let chatBusy = false;
let chatArchive = '';
let chatRawSource = '';
let pendingSystemPromptText = null;
let loadedArchives = [];
let contextStreamActive = false;
let contextFailsafeTimer = null;

// Subconscious state (used by sleep.js)
let subEnabled = true;
let subArchiving = false;
let subArchiveCount = 0;
let sleeping = false;
let subconsciousBootstrapped = false;

// Config state
const CONFIG_API = '/api/config';
let savedConfig = { profiles: {}, lastActive: null };

// Setup wizard state
let setupActive = false;
let setupStep = 0;
let setupData = {};

// ── Theme constants moved to client/js/theme-manager.js (P3-S10) ──

let desktopShellInitialized = false;
let shellClockTimer = null;
let shellStatusTimer = null;
let webUiPresenceTimer = null;
let webUiPresenceStarted = false;
let taskbarOverflowRaf = 0;
const WINDOW_LAYOUT_STORAGE_KEY = 'rem-window-layout-v2';
const PINNED_APPS_STORAGE_KEY = 'rem-pinned-apps-v1';
const TASKBAR_LAYOUT_STORAGE_KEY = 'rem-taskbar-layout-v1';
const DEFAULT_PINNED_APPS = ['chat', 'skills', 'activity', 'browser'];
const DEFAULT_RUNTIME_ICON_FILE = '/shared-assets/AppTrayIcon.png';
const DEFAULT_RUNTIME_ICON_HTML = '<img src="' + DEFAULT_RUNTIME_ICON_FILE + '" alt="" aria-hidden="true" class="os-runtime-icon-img">';
const ICON_SPRITE_SHEET_FILE = 'assets/icons/NekoCore OS Icons Sprite Sheet.png';
const ICON_SPRITE_COLUMNS = 10;
const ICON_SPRITE_ROWS = 10;
const ICON_SPRITE_COORDS = {
  'app.chat': { col: 4, row: 8 },
  'app.entity': { col: 3, row: 2 },
  'app.creator': { col: 2, row: 0 },
  'app.users': { col: 0, row: 1 },
  'app.browser': { col: 1, row: 0 },
  'app.skills': { col: 3, row: 1 },
  'app.workspace': { col: 0, row: 7 },
  'app.popouts': { col: 1, row: 4 },
  'app.documents': { col: 5, row: 1 },
  'app.visualizer': { col: 3, row: 3 },
  'app.physical': { col: 8, row: 8 },
  'app.dreamgallery': { col: 2, row: 2 },
  'app.lifediary': { col: 6, row: 2 },
  'app.dreamdiary': { col: 7, row: 2 },
  'app.themes': { col: 5, row: 2 },
  'app.settings': { col: 2, row: 1 },
  'app.advanced': { col: 5, row: 3 },
  'app.activity': { col: 7, row: 1 },
  'app.observability': { col: 4, row: 3 },
  'app.debugcore': { col: 8, row: 3 },
  'app.archive': { col: 2, row: 4 },
  'app.nekocore': { col: 7, row: 3 },
  'start.control_panel': { col: 2, row: 1 },
  'start.save_layout': { col: 2, row: 3 },
  'start.restore_layout': { col: 2, row: 5 },
  'start.reset_layout': { col: 2, row: 6 },
  'wm.pin': { col: 3, row: 4 },
  'wm.snap_left': { col: 7, row: 4 },
  'wm.snap_right': { col: 8, row: 4 },
  'wm.popout': { col: 1, row: 5 },
  'wm.maximize': { col: 5, row: 0 },
  'wm.close': { col: 6, row: 6 },
  'app.fallback': { col: 5, row: 0 }
};

function hashIconId(iconId) {
  const text = String(iconId || 'icon.default');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSpriteIndex(iconId) {
  const total = ICON_SPRITE_COLUMNS * ICON_SPRITE_ROWS;
  return hashIconId(iconId) % total;
}

function getSpriteCell(iconId) {
  const fixed = ICON_SPRITE_COORDS[iconId];
  if (fixed) return fixed;
  const index = getSpriteIndex(iconId);
  return {
    col: index % ICON_SPRITE_COLUMNS,
    row: Math.floor(index / ICON_SPRITE_COLUMNS)
  };
}

function getSpriteIconHtml(iconId) {
  const cell = getSpriteCell(iconId);
  const safeId = String(iconId || 'icon.default').replace(/"/g, '&quot;');
  const posX = ICON_SPRITE_COLUMNS > 1 ? ((cell.col * 100) / (ICON_SPRITE_COLUMNS - 1)) : 0;
  const posY = ICON_SPRITE_ROWS > 1 ? ((cell.row * 100) / (ICON_SPRITE_ROWS - 1)) : 0;
  const sizeX = ICON_SPRITE_COLUMNS * 100;
  const sizeY = ICON_SPRITE_ROWS * 100;
  return '<span class="os-runtime-icon-sprite" data-icon-id="' + safeId + '" style="background-image:url(\'' + ICON_SPRITE_SHEET_FILE + '\');background-size:' + sizeX + '% ' + sizeY + '%;background-position:' + posX + '% ' + posY + '%"></span>';
}

function getRuntimeIconHtml(iconId) {
  if (!iconId) return DEFAULT_RUNTIME_ICON_HTML;
  return getSpriteIconHtml(iconId);
}

function getRuntimeIconHtmlById(iconId) {
  return getRuntimeIconHtml(iconId);
}

const WINDOW_APPS = [
  { tab: 'chat', label: 'Chat', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', accent: 'green', w: 980, h: 680 },
  { tab: 'entity', label: 'Entity', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', accent: 'gold', w: 820, h: 620 },
  { tab: 'creator', label: 'Creator', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', accent: 'gold', w: 980, h: 760 },
  { tab: 'users', label: 'Users', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', accent: 'cyan', w: 900, h: 660 },
  { tab: 'browser', label: 'NekoCore Browser', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', accent: 'cyan', w: 1080, h: 720 },
  { tab: 'skills', label: 'Skills', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', accent: 'orange', w: 980, h: 680 },
  { tab: 'workspace', label: 'Workspace', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', accent: 'orange', w: 980, h: 680 },
  { tab: 'popouts', label: 'Popouts', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v7H3V3h7"/></svg>', accent: 'orange', w: 980, h: 680 },
  { tab: 'documents', label: 'Documents', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', accent: 'orange', w: 980, h: 680 },
  { tab: 'visualizer', label: 'Visualizer', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', accent: 'indigo', w: 1020, h: 700 },
  { tab: 'physical', label: 'Physical Body', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', accent: 'pink', w: 900, h: 640 },
  { tab: 'dreamgallery', label: 'Dream Gallery', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', accent: 'purple', w: 980, h: 680 },
  { tab: 'lifediary', label: 'Life Diary', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', accent: 'pink', w: 900, h: 640 },
  { tab: 'dreamdiary', label: 'Dream Diary', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', accent: 'purple', w: 900, h: 640 },
//Open Next json entry id
//JsonEntryId: "hello-window-001"
  { tab: 'helloworld', label: 'Hello World', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14c1.5 1.5 6.5 1.5 8 0"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>', accent: 'orange', w: 980, h: 680 },
//Close "
//Open Next json entry id

//Close "
  { tab: 'themes', label: 'Themes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>', accent: 'teal', w: 900, h: 640 },
  { tab: 'settings', label: 'Settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', accent: 'teal', w: 980, h: 700 },
  { tab: 'advanced', label: 'Advanced', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', accent: 'teal', w: 980, h: 680 },
  { tab: 'activity', label: 'Task Manager', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', accent: 'indigo', w: 980, h: 680 },
  { tab: 'observability', label: 'Observability', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', accent: 'indigo', w: 980, h: 680 },
  { tab: 'debugcore', label: 'Core Debug', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v.01"/><path d="M12 8v5"/></svg>', accent: 'indigo', w: 980, h: 700 },
  { tab: 'archive', label: 'Archive', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>', accent: 'indigo', w: 980, h: 680 },
  { tab: 'nekocore', label: 'NekoCore OS', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>', accent: 'indigo', w: 900, h: 640 }
];

const START_MENU_CATEGORY_ORDER = [
  { id: 'core', label: 'Core' },
  { id: 'browse', label: 'Browse & Research' },
  { id: 'tools', label: 'Tools & Workspace' },
  { id: 'mind', label: 'Mind & Identity' },
  { id: 'journal', label: 'Journals & Dreams' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'system', label: 'System' }
];

const APP_CATEGORY_BY_TAB = {
  chat: 'core',
  entity: 'core',
  creator: 'core',
  users: 'core',
  browser: 'browse',
  skills: 'tools',
  workspace: 'tools',
  popouts: 'tools',
  documents: 'tools',
  visualizer: 'mind',
  physical: 'mind',
  dreamgallery: 'journal',
  lifediary: 'journal',
  dreamdiary: 'journal',
//Open Next json entry id
//JsonEntryId: "hello-category-001"
  helloworld: 'tools',
//Close "
//Open Next json entry id

//Close "
  themes: 'appearance',
  settings: 'system',
  advanced: 'system',
  activity: 'system',
  observability: 'system',
  debugcore: 'system',
  archive: 'system',
  nekocore: 'system'
};

const START_MENU_SPECIAL_APPS = [
  {
    id: 'control-panel',
    tab: 'settings',
    launchTab: 'settings',
    label: 'Control Panel',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12l-4-4m4 4l4-4"/><path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/></svg>',
    accent: 'teal',
    category: 'system',
    pinnable: false,
    description: 'Classic settings hub'
  },

  {
    id: 'save-layout',
    label: 'Save Layout',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    accent: 'green',
    category: 'appearance',
    pinnable: false,
    description: 'Save current windows',
    action: 'saveWindowLayout'
  },
  {
    id: 'restore-layout',
    label: 'Restore Layout',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    accent: 'indigo',
    category: 'appearance',
    pinnable: false,
    description: 'Restore saved layout',
    action: 'restoreWindowLayout'
  },
  {
    id: 'reset-layout',
    label: 'Reset Layout',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    accent: 'pink',
    category: 'appearance',
    pinnable: false,
    description: 'Reset window positions',
    action: 'resetWindowLayout'
  }
];

function applyRuntimeIconOverrides() {
  WINDOW_APPS.forEach((app) => {
    app.icon = getRuntimeIconHtml('app.' + app.tab);
  });
  START_MENU_SPECIAL_APPS.forEach((app) => {
    const iconId = app.id ? ('start.' + String(app.id).replace(/-/g, '_')) : 'start.special';
    app.icon = getRuntimeIconHtml(iconId);
  });
}

// applyRuntimeIconOverrides() — disabled; inline SVGs in WINDOW_APPS are used directly.
// Per-app icon files (see icon-replacement-matrix.csv) will be wired manually when ready.
// window.getRuntimeIconHtmlById is not exported; wm titlebar buttons use HTML entity fallbacks.

const windowManager = {
  stage: null,
  windows: new Map(),
  z: 20,
  initialized: false,
  popoutTab: null,
  dock: {
    overlay: null,
    active: false,
    selectedZone: null,
    tab: null
  }
};
let pinnedApps = [];
let selectedStartCategoryId = '';
let startCategoryViewMode = 'categories';
let layoutResizeRaf = 0;
// systemThemeMediaQuery moved to theme-manager.js (P3-S10)
let taskbarEditMode = false;
let taskbarDragPointerId = null;
let taskbarResizeState = null;
let taskbarLayout = {
  align: 'center',
  width: 1120,
  height: 68,
  iconScale: 1
};
const pinnedDragState = {
  tab: null,
  source: null,
  hoveringTab: null
};

// ── Telemetry state and task-manager rendering moved to client/js/telemetry-ui.js (P3-S11) ──

// ============================================================
// LOGGING
// ============================================================
function lg(type, msg) {
  const body = document.getElementById('sidebarLogContent');
  if (!body) return;
  const entry = document.createElement('div');
  entry.className = 'le ' + type;
  entry.innerHTML = '<span class="ts">' + new Date().toLocaleTimeString() + '</span><span class="mg">' + msg + '</span>';
  body.appendChild(entry);
  body.scrollTop = body.scrollHeight;
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setBootOverlayState(title, detail, percent) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const titleEl = document.getElementById('bootTitle');
  const detailEl = document.getElementById('bootDetail');
  const phaseEl = document.getElementById('bootPhaseLabel');
  const percentEl = document.getElementById('bootPercentLabel');
  const barEl = document.getElementById('bootProgressBar');
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  if (phaseEl) phaseEl.textContent = title;
  if (percentEl) percentEl.textContent = pct + '%';
  if (barEl) barEl.style.width = pct + '%';
}

function showBootOverlay() {
  const overlay = document.getElementById('bootOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideBootOverlay() {
  const overlay = document.getElementById('bootOverlay');
  if (overlay) overlay.style.display = 'none';
}

function getBootGreetingTitle() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

async function runBootStage(title, detail, percent, delayMs = 520) {
  setBootOverlayState(title, detail, percent);
  await waitMs(delayMs);
}

// ============================================================
// UI HELPERS
// ============================================================
function updateProviderUI(type, connected, label) {
  const statusEl = document.getElementById(type + 'Status');
  if (statusEl) {
    statusEl.className = 'auth-status ' + (connected ? 'connected' : 'disconnected');
    statusEl.querySelector('span').textContent = connected ? 'Connected' : 'Not connected';
  }
  if (connected && label) {
    document.getElementById('providerName').textContent = label;
    const colors = { openrouter: 'var(--ac)', ollama: 'var(--ollama)', apikey: 'var(--ac)' };
    document.getElementById('providerDot').style.background = colors[type] || 'var(--em)';
  } else if (!activeConfig) {
    document.getElementById('providerName').textContent = 'No provider';
    document.getElementById('providerDot').style.background = 'var(--td)';
  }
  if (connected) {
    try { if (typeof flushPendingSystemPrompt === 'function') flushPendingSystemPrompt(); } catch (e) { /* ignore */ }
  }
  syncShellStatusWidgets();
}

// ── Theme functions moved to client/js/theme-manager.js (P3-S10) ──

function updateShellClock() {
  const clock = document.getElementById('shellClock');
  const date = document.getElementById('shellDate');
  if (!clock && !date) return;
  const now = new Date();
  if (clock) clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date) date.textContent = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function syncShellStatusWidgets() {
  const entitySummary = document.getElementById('shellEntitySummary');
  const providerSummary = document.getElementById('shellProviderSummary');
  const brainSummary = document.getElementById('shellBrainSummary');
  const taskbarStatus = document.getElementById('shellTaskbarStatus');

  const entityText = (currentEntityName && currentEntityName.trim())
    || document.getElementById('entityName')?.textContent?.trim()
    || document.getElementById('entityTraits')?.textContent?.trim()
    || 'No entity loaded';
  const providerText = document.getElementById('providerName')?.textContent?.trim() || 'No provider';
  const brainText = document.getElementById('brainLabel')?.textContent?.trim() || 'Idle';
  const openCount = Array.from(windowManager.windows.values()).filter((meta) => meta.open).length;

  if (entitySummary) entitySummary.textContent = entityText;
  if (providerSummary) providerSummary.textContent = providerText;
  if (brainSummary) brainSummary.textContent = brainText;
  if (taskbarStatus) {
    taskbarStatus.textContent = openCount > 0
      ? openCount + ' window' + (openCount === 1 ? '' : 's') + ' open'
      : 'No windows open';
  }

  const tmOpen = document.getElementById('tmOpenWindows');
  if (tmOpen) tmOpen.textContent = String(openCount);
  const tmPinned = document.getElementById('tmPinnedApps');
  if (tmPinned) tmPinned.textContent = String(pinnedApps.length);
}

// ── Task manager view and telemetry functions moved to client/js/telemetry-ui.js (P3-S11) ──

// Desktop shell functions moved to client/js/desktop.js (P3-S2)

// ── Window manager functions moved to client/js/window-manager.js (P3-S1) ──

// ── Browser app code moved to client/js/browser-app.js (NB-3) ──

function switchTab(name, el) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.auth-tab-content').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('tab-' + name).classList.add('on');
}

function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('s' + i);
    if (!el) continue;
    el.className = 'pip';
    if (i < n) el.classList.add('dn');
    if (i === n) el.classList.add('on');
  }
}

function setStatus(type, text) {
  const dot = document.getElementById('sDot');
  if (dot) {
    dot.className = 'dot';
    if (type) dot.classList.add(type);
  }
  const statusText = document.getElementById('sTxt');
  if (statusText) statusText.textContent = text;
}

function toggleAuth(forceOpen) {
  const body = document.getElementById('authBody');
  const tgl = document.getElementById('authTgl');
  if (forceOpen === true || !body.classList.contains('open')) {
    body.classList.add('open'); tgl.innerHTML = '&#9650; Hide';
  } else { body.classList.remove('open'); tgl.innerHTML = '&#9660; Show'; }
}

function toggleLog() {
  toggleSidebarLog();
}

function toggleSidebarLog() {
  const body = document.getElementById('sidebarLogBody');
  const arrow = document.getElementById('sidebarLogArrow');
  if (!body) return;
  body.classList.toggle('collapsed');
  if (arrow) arrow.textContent = body.classList.contains('collapsed') ? '>' : 'v';
}

function autoOpenLog() {
  const body = document.getElementById('sidebarLogBody');
  const arrow = document.getElementById('sidebarLogArrow');
  if (body && body.classList.contains('collapsed')) {
    body.classList.remove('collapsed');
    if (arrow) arrow.textContent = 'v';
  }
}

// ── Setup enforcement + setup wizard + user-name modal moved to client/js/setup-ui.js (P3-S7) ──

// Main app boot handler moved to client/js/boot.js (P3-S3)

function copyOut() {
  const v = document.getElementById('finalOut').value;
  if (!v) return;
  navigator.clipboard.writeText(v).then(() => lg('ok', 'Copied')).catch(() => { document.getElementById('finalOut').select(); document.execCommand('copy'); lg('ok', 'Copied'); });
}

function dlOut() {
  const v = document.getElementById('finalOut').value;
  if (!v) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/plain' }));
  a.download = 'memory-archive-' + Date.now() + '.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  lg('ok', 'Downloaded');
}

function resetAll() {
  if (busy || chatBusy) return;
  document.getElementById('rawInput').value = '';
  document.getElementById('finalOut').value = '';
  const logEl = document.getElementById('sidebarLogContent');
  if (logEl) logEl.innerHTML = '';
  document.getElementById('sSrc').textContent = '0';
  document.getElementById('sOut').textContent = '0';
  document.getElementById('sSav').innerHTML = '&mdash;';
  clearChat();
  setStep(0); setStatus('', 'Ready');
  lg('info', 'Reset');
}

async function shutdownServer() {
  if (!confirm('Stop the REM System server? You will lose access to this page.')) return;
  try {
    await fetch('/api/shutdown', { method: 'POST' });
  } catch (e) { /* connection will drop */ }

  // Try to self-close the dedicated app window after shutdown completes.
  setTimeout(() => {
    try {
      window.open('', '_self');
      window.close();
    } catch (_) {}
  }, 220);

  setTimeout(() => {
    if (!document.hidden) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#04060d;color:#a1a1aa;font-family:sans-serif;flex-direction:column;gap:1rem"><h1 style="color:#e4e4e7">Server Stopped</h1><p>WebUI close was requested. If this window is still open, you can close it now. Run <code style="color:#34d399">npm start</code> to restart.</p></div>';
    }
  }, 500);
}

// ============================================================
// SERVER COMMUNICATION HELPERS
// ============================================================
async function saveMemoryToServer(filename, content) {
  try {
    const resp = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || resp.status);
    }
    lg('ok', 'Saved memory to server: ' + filename);
  } catch (e) {
    lg('err', 'Failed to save memory to server: ' + e.message);
  }
}

async function saveSessionMetaToServer(metaText) {
  if (!metaText) return;
  try {
    const resp = await fetch('/api/session-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaText })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || resp.status);
    }
    lg('ok', 'Saved session meta to server');
  } catch (e) {
    lg('err', 'Failed to save session meta: ' + e.message);
  }
}

// ============================================================
// SYSTEM PROMPT LOADING → chat.js (P3-S13)
// loadSystemPrompt, flushPendingSystemPrompt moved to chat.js
// ============================================================

// ============================================================
// CONFIG PERSISTENCE + MODEL RECOMMENDATIONS → config-profiles.js (P3-S8)
// loadSavedConfig, getMainConfigFromProfile, hydrateMainProviderInputs, persistConfig,
// gatherProfile, autoSaveConfig, refreshSavedConfig, saveCurrentProfile, loadProfile,
// deleteProfile, renderProfileChips, OPENROUTER_ROLE_MODELS, getOpenRouterRolePreset,
// RECOMMENDED_MODEL_STACKS, OLLAMA_RECOMMENDED_STACKS, RECOMMENDED_PANEL_COPY,
// refreshRecommendedPanelCopy, showRecommendedPresetProvider, showRecommendedSetupTab,
// applyRecommendedPresetInputs, applyRecommendedSetupTab, applySettingsOpenRouterSuggestions,
// initSettingsModelSuggestions
// ============================================================

// ── Simplified provider UI moved to client/js/simple-provider.js (P3-S9) ──


// ── Setup wizard + constants moved to client/js/setup-ui.js (P3-S7) ──


// ── Entity avatar + display helpers moved to client/js/entity-ui.js (P3-S14) ──
// ============================================================
// NEW TAB SYSTEM & ENTITY MANAGEMENT
// ============================================================

function switchMainTab(tabName, el, options) {
  const opts = options && typeof options === 'object' ? options : {};
  if (!windowManager.initialized) {
    const tab = document.getElementById('tab-' + tabName);
    document.querySelectorAll('.tab-content').forEach((node) => node.classList.remove('on'));
    if (tab) tab.classList.add('on');
    return;
  }

  document.querySelectorAll('.tab-btn, .nav-item, .os-shortcut, .os-launcher-item, .os-start-pinned-app, .os-start-app-item, .os-pinned-app, .os-dash-app, .os-overflow-app').forEach((button) => {
    button.classList.remove('on');
  });

  if (el) el.classList.add('on');
  document.querySelectorAll('[data-tab="' + tabName + '"]').forEach((button) => button.classList.add('on'));

  const shouldFocusDetached = !windowManager.popoutTab
    && opts.forceInShell !== true
    && typeof isPopoutOpen === 'function'
    && isPopoutOpen(tabName)
    && typeof focusDetachedPopout === 'function';

  if (shouldFocusDetached) {
    focusDetachedPopout(tabName);
    runtimeTelemetry.activeWindowTab = tabName;
    closeStartMenu();
    return;
  }

  openWindow(tabName);
  runtimeTelemetry.activeWindowTab = tabName;
  closeStartMenu();
}

// ── Nav Sidebar ──────────────────────────────────
function toggleNavSidebar() {
  const sidebar = document.getElementById('navSidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('nav-collapsed', sidebar.classList.contains('collapsed'));
}

function toggleNavGroup(groupId) {
  const group = document.getElementById(groupId);
  if (group) group.classList.toggle('open');
}

// Sync entity list and profile chips into nav sidebar
function syncNavSidebarEntities() {
  const src = document.getElementById('sidebarEntityList');
  const dst = document.getElementById('navEntityList');
  if (src && dst) dst.innerHTML = src.innerHTML;
  const shellDst = document.getElementById('shellEntityList');
  if (src && shellDst) shellDst.innerHTML = src.innerHTML;
}
function syncNavSidebarProfiles() {
  const src = document.getElementById('profileChips');
  const dst = document.getElementById('navProfileChips');
  if (src && dst) dst.innerHTML = src.innerHTML;
  const shellDst = document.getElementById('shellProfileChips');
  if (src && shellDst) shellDst.innerHTML = src.innerHTML;
}

// ── Physical Body Tab ──────────────────────────────────
// Physical Body and deep-sleep UI helpers moved to client/js/physical-ui.js (P3-S5)

// ── Mini Neural Viz in Chat Sidebar (data-only panel) ──
let miniVizInitialized = false;
let miniVizEventSource = null;

function toggleMiniViz() {
  const body = document.getElementById('miniVizBody');
  const arrow = document.getElementById('miniVizArrow');
  if (!body) return;

  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';

  // Initialize mini viz SSE on first open
  if (!isOpen && !miniVizInitialized) {
    miniVizInitialized = true;
    setupMiniVizSSE();
  }
}

function setupMiniVizSSE() {
  try {
    miniVizEventSource = new EventSource('/api/brain/events');
    miniVizEventSource.addEventListener('memory_accessed', function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.memory_id) {
          if (typeof showMiniMemoryDetail === 'function') showMiniMemoryDetail(data.memory_id);
        }
      } catch (err) { /* ignore */ }
    });
  } catch (err) { /* ignore */ }
}

// Visualizer UI helpers moved to client/js/visualizer-ui.js (P3-S4)

function toggleAdvancedMenu(el) {
  // Legacy — Advanced is now a regular tab in the nav sidebar
  switchMainTab('advanced', el);
}

function toggleAdvancedSection(headerEl) {
  const content = headerEl.nextElementSibling;
  if (content) {
    content.classList.toggle('open');
    const toggle = headerEl.querySelector('.section-toggle');
    if (toggle) {
      toggle.style.transform = content.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0)';
    }
  }
}

function showProviderTab(providerName, el) {
  // Hide all provider tabs
  document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('on'));
  
  // Show selected provider
  const tab = document.getElementById('provider-' + providerName);
  if (tab) {
    tab.classList.add('on');
    el.classList.add('on');
  }

  applySettingsOpenRouterSuggestions(providerName);

  // Auto-inherit endpoint + API key from Main Chat into sub/dream/orchestrator tabs
  if (providerName === 'subconscious' || providerName === 'dreams' || providerName === 'orchestrator') {
    inheritMainConfigToAspect(providerName);
  }
}

/** Pre-fill sub/dream/orchestrator endpoint + key from the main config when those fields are empty. */
function inheritMainConfigToAspect(panel) {
  const mainEndpoint = document.getElementById('apikeyEndpoint-main')?.value?.trim() || '';
  const mainKey      = document.getElementById('apikeyKey-main')?.value?.trim() || '';
  if (!mainEndpoint && !mainKey) return; // nothing to inherit

  const idMap = {
    subconscious: { ep: 'subApiEndpoint', key: 'subApiKey' },
    dreams:       { ep: 'dreamApiEndpoint', key: 'dreamApiKey' },
    orchestrator: { ep: 'orchApiEndpoint', key: 'orchApiKey' },
    nekocore:     { ep: 'apikeyEndpoint-nekocore', key: 'nekocoreApiKey' }
  };
  const ids = idMap[panel];
  if (!ids) return;

  const epEl  = document.getElementById(ids.ep);
  const keyEl = document.getElementById(ids.key);
  if (epEl && !epEl.value.trim() && mainEndpoint) epEl.value = mainEndpoint;
  if (keyEl && !keyEl.value.trim() && mainKey)     keyEl.value = mainKey;
}

// ── Entity UI flows moved to client/js/entity-ui.js (P3-S14) ──

// ============================================================
// STARTUP RESUME RECAP → chat.js (P3-S13)
// runStartupResumeRecap moved to chat.js
// ============================================================

function resetChatForEntitySwitch(entityName, introText, memoryCount) {
  // Full reset so previous entity context/archives are not reused.
  if (typeof clearChat === 'function') clearChat();
  chatHistory = [];
  loadedArchives = [];
  contextStreamActive = false;
  subconsciousBootstrapped = false;

  const emptyEl = document.querySelector('.chat-empty');
  if (emptyEl) emptyEl.remove();

  if (memoryCount && memoryCount > 0) {
    // Existing entity with memories — run a startup recap through the brain pipeline.
    addChatBubble('system', 'Loading ' + entityName + '\'s memory chain...');
    fetch('/api/entity-last-memory')
      .then(r => r.ok ? r.json() : Promise.reject('fetch failed'))
      .then(memData => {
        if (memData.ok && memData.summary) {
          fetch('/api/memories/prewarm-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'entity-switch' })
          }).catch(() => {});
          runStartupResumeRecap(entityName, memData);
        } else {
          addChatBubble('assistant', 'Memory chain loaded. Ready to continue.');
        }
      })
      .catch(() => {
        addChatBubble('assistant', 'Memory chain loaded. Ready to continue.');
      });
  } else if (introText) {
    // Brand new entity — show introduction
    addChatBubble('assistant', introText);
  } else if (entityName) {
    addChatBubble('system', 'Switched to ' + entityName + '. Starting a fresh chat context.');
  }

  // Reload entity system prompt so the new entity's identity is used
  loadSystemPrompt();

  // Only auto-load archives if entity has established history (memoryCount > 1)
  // Skip for brand-new entities to prevent contamination from misplaced archives.
  if (activeConfig && memoryCount && memoryCount > 1) {
    setTimeout(() => { loadServerMemories(); }, 500);
  } else if (memoryCount === 0 || !memoryCount) {
    lg('info', 'Fresh entity - skipping archive auto-load');
  }
}

// ====================================
// Entity Creation State
// ====================================
// ============================================================
// Entity Creation — moved to client/create.html + client/js/create.js
// The functions below are minimal stubs so any surviving references
// don't throw ReferenceErrors.
// ============================================================

function showNewEntityDialog() {
  switchMainTab('creator');
}
// ====================================
function closeNewEntityDialog() { /* no-op: modal removed */ }
function selectEntityMode() {}
function creatorContinueToModeSelection() {}
function backToModeSelection() {}
function executeEntityCreation() {}
async function createNewEntity() { showNewEntityDialog(); }
// ── User name modal moved to client/js/setup-ui.js (P3-S7) ──
async function saveDreamConfig() {
  let endpoint = document.getElementById('dreamApiEndpoint').value.trim();
  let key = document.getElementById('dreamApiKey').value.trim();
  const model = document.getElementById('dreamModel').value.trim();

  // Inherit from Main Chat if endpoint/key are empty
  if (!endpoint) endpoint = document.getElementById('apikeyEndpoint-main')?.value?.trim() || '';
  if (!key)      key      = document.getElementById('apikeyKey-main')?.value?.trim() || '';

  if (!endpoint || !key || !model) {
    lg('err', 'Model is required (endpoint & key inherited from Main Chat if empty)');
    return;
  }
  
  try {
    const resp = await fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'dream',
        config: {
          endpoint,
          key,
          model,
          ollamaUrl: document.getElementById('ollamaUrl-dreams').value.trim(),
          ollamaModel: document.getElementById('ollamaModel-dreams').value.trim()
        }
      })
    });
    if (!resp.ok) throw new Error('Failed to save config');
    await refreshSavedConfig();
    const statusEl = document.getElementById('dreamConfigStatus');
    statusEl.style.display = 'block';
    setTimeout(() => statusEl.style.display = 'none', 3000);
    lg('ok', 'Dream engine global config saved');
  } catch (e) {
    lg('err', 'Failed to save dream config: ' + e.message);
  }
}

async function saveOrchestratorConfig() {
  let endpoint = document.getElementById('orchApiEndpoint').value.trim();
  let key = document.getElementById('orchApiKey').value.trim();
  const model = document.getElementById('orchModel').value.trim();

  // Inherit from Main Chat if endpoint/key are empty
  if (!endpoint) endpoint = document.getElementById('apikeyEndpoint-main')?.value?.trim() || '';
  if (!key)      key      = document.getElementById('apikeyKey-main')?.value?.trim() || '';

  if (!endpoint || !key || !model) {
    lg('err', 'Model is required (endpoint & key inherited from Main Chat if empty)');
    return;
  }

  try {
    const resp = await fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'orchestrator',
        config: {
          endpoint,
          key,
          model,
          ollamaUrl: document.getElementById('ollamaUrl-orchestrator').value.trim(),
          ollamaModel: document.getElementById('ollamaModel-orchestrator').value.trim()
        }
      })
    });
    if (!resp.ok) throw new Error('Failed to save config');
    await refreshSavedConfig();
    const statusEl = document.getElementById('orchConfigStatus');
    statusEl.style.display = 'block';
    setTimeout(() => statusEl.style.display = 'none', 3000);
    lg('ok', 'Orchestrator global config saved');
  } catch (e) {
    lg('err', 'Failed to save orchestrator config: ' + e.message);
  }
}

// Save main provider config (example for API Key panel)
async function saveMainProviderConfig() {
  const endpoint = document.getElementById('apikeyEndpoint-main').value.trim();
  const key = document.getElementById('apikeyKey-main').value.trim();
  const model = document.getElementById('apikeyModel-main').value.trim();
  const ollamaUrl = document.getElementById('ollamaUrl-main').value.trim();
  const ollamaModel = document.getElementById('ollamaModel-main').value.trim();
  try {
    const resp = await fetch('/api/entity-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'main',
        config: { endpoint, key, model, ollamaUrl, ollamaModel }
      })
    });
    if (!resp.ok) throw new Error('Failed to save config');
    await refreshSavedConfig();
    lg('ok', 'Main provider global config saved');
  } catch (e) {
    lg('err', 'Failed to save main provider config: ' + e.message);
  }
}

/* ── Unified Save All LLM Config ── */
async function saveAllLLMConfig() {
  const mainKey      = document.getElementById('apikeyKey-main')?.value?.trim() || '';
  const mainEndpoint = document.getElementById('apikeyEndpoint-main')?.value?.trim() || '';

  // If sub/dream/orch key or endpoint is empty, inherit from main
  for (const [keyId, epId] of [
    ['subApiKey',   'subApiEndpoint'],
    ['dreamApiKey', 'dreamApiEndpoint'],
    ['orchApiKey',  'orchApiEndpoint']
  ]) {
    const kEl = document.getElementById(keyId);
    const eEl = document.getElementById(epId);
    if (kEl && !kEl.value.trim() && mainKey)      kEl.value = mainKey;
    if (eEl && !eEl.value.trim() && mainEndpoint)  eEl.value = mainEndpoint;
  }

  const statusEl = document.getElementById('allLlmConfigStatus');
  try {
    await saveMainProviderConfig();
    await saveSubconsciousConfig();
    await saveDreamConfig();
    await saveOrchestratorConfig();
    if (statusEl) { statusEl.style.display = 'inline'; setTimeout(() => statusEl.style.display = 'none', 4000); }
    lg('ok', 'All LLM configs saved');
  } catch (e) {
    lg('err', 'Error saving LLM configs: ' + e.message);
  }
}

// ── System health & maintenance handlers moved to client/js/system-health.js (P3-S15) ──

// Entity display is handled by refreshSidebarEntities() on startup.
// No auto-load — user must preview and check out an entity first.

// Brain status polling (fallback — SSE handles real-time updates)
let brainPollHandle = null;
function startBrainPoll() {
  if (brainPollHandle) return;
  // Only poll infrequently as SSE provides real-time updates
  pollBrainStatus();
  brainPollHandle = setInterval(pollBrainStatus, 60000); // Every 60s as fallback
}
async function pollBrainStatus() {
  try {
    const resp = await fetch('/api/brain/status');
    if (!resp.ok) return;
    const data = await resp.json();
    runtimeTelemetry.brainRunning = !!data.running;
    runtimeTelemetry.brainCycleCount = Number(data.cycleCount || 0);
    const el = document.getElementById('brainStatus');
    const label = document.getElementById('brainLabel');
    if (data.running) {
      el.classList.add('active');
      label.textContent = 'Cycle ' + data.cycleCount;
    } else {
      el.classList.remove('active');
      label.textContent = 'Idle';
    }
    if (typeof updateDeepSleepBadge === 'function') {
      updateDeepSleepBadge(data.cyclesUntilDeepSleep);
    }
  } catch (e) { /* ignore */ }
}

// Startup is triggered from DOMContentLoaded handler above.

// ============================================================
// USER SWITCHER + USERS APP helpers moved to client/js/users-ui.js (P3-S6)
// ============================================================


window.adjustTaskbarScale = window.adjustTaskbarScale || function () {};
window.adjustTaskbarIconScale = window.adjustTaskbarIconScale || function () {};
window.stopTaskbarEditMode = window.stopTaskbarEditMode || function () {};

// Context menu system — see js/context-menu.js (loaded after app.js)
// VFS (virtual file system) — see js/vfs.js (loaded after app.js)

