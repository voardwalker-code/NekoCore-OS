const chatEl    = document.getElementById('chat');
const inputEl   = document.getElementById('msg-input');
const sendBtn   = document.getElementById('send-btn');
const statusDot = document.getElementById('status-dot');
const statusTxt = document.getElementById('status-text');
const cfgPanel  = document.getElementById('config-panel');

const sessionSummaryEl = document.getElementById('session-summary');
const sessionRecentEl  = document.getElementById('session-recent');
const sideTitleEl      = document.getElementById('side-title');
const actFeed          = document.getElementById('act-feed');
const actPlan          = document.getElementById('act-plan');
const explorerTitleEl  = document.getElementById('explorer-title');
const explorerBodyEl   = document.getElementById('explorer-body');

let history = [];
let sending = false;
let pendingFiles = []; // { name, content } from drag-and-drop
let lastContinuation = null; // stores continuation point for "continue" button
const MA_MASKED_KEY = '********';
const TODO_STORAGE_KEY = 'ma-ui-todos-v1';
const inspectorTitles = {
  session: 'Session',
  activity: 'Activity',
  blueprints: 'Blueprints',
  projects: 'Projects',
  tasks: 'Tasks',
  todos: 'Todos',
  chores: 'Chores',
  archives: 'Archives'
};

let currentInspector = 'session';
let selectedBlueprintPath = '';
const hasLegacyInspector = !!(sessionSummaryEl && sessionRecentEl && sideTitleEl);

// ── Theme System ──────────────────────────────────────────────────────────
const THEME_KEY = 'ma-theme-v1';

function applyTheme(choice) {
  if (!choice) choice = localStorage.getItem(THEME_KEY) || 'system';
  localStorage.setItem(THEME_KEY, choice);
  const themeSelect = document.getElementById('cfg-theme');
  if (themeSelect) themeSelect.value = choice;

  let effective;
  if (choice === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } else {
    effective = choice;
  }

  if (effective === 'light') {
    document.body.setAttribute('data-theme', 'light');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

applyTheme();
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if ((localStorage.getItem(THEME_KEY) || 'system') === 'system') applyTheme('system');
});

// ── Editor State ──────────────────────────────────────────────────────────
const editorTabs = document.getElementById('editor-tabs');
const editorContent = document.getElementById('editor-content');
const openTabs = []; // { id, path, name, content, mode, dirty }
let activeTabId = null;

// ── Init ──────────────────────────────────────────────────────────────────
function initializeMAUI() {
  checkConfig();
  loadSessionList();
  syncMode();
  if (hasLegacyInspector) {
    selectInspector('session');
  }
  if (document.getElementById('todo-list') && typeof renderTodos === 'function') {
    renderTodos();
  }
  selectWorkspaceSection('workspace');
}
