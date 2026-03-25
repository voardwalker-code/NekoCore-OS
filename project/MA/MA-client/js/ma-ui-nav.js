// MA UI — Navigation rail, inspector switching, workspace sections, mode toggle, menus, terminal.

// ── Menu dropdown system ──────────────────────────────────────────────────
let _activeMenu = null;

function toggleMenu(name) {
  const dd = document.getElementById('menu-' + name + '-dropdown');
  if (!dd) return;
  if (_activeMenu === name) { closeMenus(); return; }
  closeMenus();
  dd.classList.add('show');
  _activeMenu = name;
}

function closeMenus() {
  document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));
  _activeMenu = null;
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.menu-item')) closeMenus();
});

// ── File menu actions ─────────────────────────────────────────────────────
function menuNewFile() {
  closeMenus();
  const name = prompt('New file name (relative to workspace):');
  if (!name || !name.trim()) return;
  fetch('/api/workspace/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: name.trim(), content: '' })
  }).then(r => r.json()).then(d => {
    if (!d.ok) { addSystem('Error: ' + (d.error || 'Could not create file')); return; }
    addSystem('Created ' + name.trim());
    if (currentInspector === 'workspace') loadWorkspaceTree();
    openFileInEditor(name.trim());
  }).catch(e => addSystem('Create error: ' + e.message));
}

function menuNewFolder() {
  closeMenus();
  const name = prompt('New folder name (relative to workspace):');
  if (!name || !name.trim()) return;
  fetch('/api/workspace/mkdir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: name.trim() })
  }).then(r => r.json()).then(d => {
    if (!d.ok) { addSystem('Error: ' + (d.error || 'Could not create folder')); return; }
    addSystem('Created folder ' + name.trim());
    if (currentInspector === 'workspace') loadWorkspaceTree();
  }).catch(e => addSystem('Create folder error: ' + e.message));
}

function menuOpenFile() {
  closeMenus();
  const path = prompt('File path to open (relative to workspace):');
  if (!path || !path.trim()) return;
  openFileInEditor(path.trim());
}

function menuOpenFolder() {
  closeMenus();
  const path = prompt('Folder path to open in workspace:');
  if (!path || !path.trim()) return;
  addSystem('Folder navigation is controlled by the workspace tree. Use the Workspace section in the left rail.');
  selectWorkspaceSection('workspace');
}

function menuSave() {
  closeMenus();
  if (activeTabId) saveEditorTab();
  else addSystem('No file open to save.');
}

function menuSaveAll() {
  closeMenus();
  let saved = 0;
  const dirtyTabs = openTabs.filter(t => t.dirty);
  if (!dirtyTabs.length) { addSystem('All files are already saved.'); return; }
  dirtyTabs.forEach(function(tab) {
    const ta = (tab.id === activeTabId) ? document.querySelector('.editor-textarea') : null;
    if (ta) tab.content = ta.value;
    fetch('/api/workspace/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tab.path, content: tab.content })
    }).then(r => r.json()).then(d => {
      if (d.ok) {
        tab.originalContent = tab.content;
        tab.dirty = false;
        saved++;
        if (saved === dirtyTabs.length) {
          renderEditorTabs();
          renderEditorContent();
          addSystem('Saved ' + saved + ' file(s).');
        }
      }
    }).catch(() => {});
  });
}

// ── Terminal panel ────────────────────────────────────────────────────────
function toggleTerminalPanel() {
  closeMenus();
  const panel = document.getElementById('terminal-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    document.getElementById('terminal-input').focus();
  }
}

async function runTerminalCmd() {
  const input = document.getElementById('terminal-input');
  const output = document.getElementById('terminal-output');
  if (!input || !output) return;
  const cmd = input.value.trim();
  if (!cmd) return;
  input.value = '';
  // Show command in output
  const cmdLine = document.createElement('div');
  cmdLine.className = 'term-cmd';
  cmdLine.textContent = '> ' + cmd;
  output.appendChild(cmdLine);
  output.scrollTop = output.scrollHeight;
  try {
    const r = await fetch('/api/terminal/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    const d = await r.json();
    const result = document.createElement('div');
    if (d.error) {
      result.className = 'term-err';
      result.textContent = d.error;
    } else if (d.timedOut) {
      result.className = 'term-err';
      result.textContent = (d.stdout || '') + (d.stderr ? '\n' + d.stderr : '') + '\n[Command timed out]';
    } else {
      result.className = d.code === 0 ? 'term-out' : 'term-err';
      const text = (d.stdout || '') + (d.stderr ? '\n' + d.stderr : '');
      result.textContent = text || '(no output)';
    }
    output.appendChild(result);
  } catch (e) {
    const errLine = document.createElement('div');
    errLine.className = 'term-err';
    errLine.textContent = 'Connection error: ' + e.message;
    output.appendChild(errLine);
  }
  output.scrollTop = output.scrollHeight;
}

// ── Rail & Inspector ──────────────────────────────────────────────────────
function setRailActive(activeId) {
  document.querySelectorAll('.rail-btn').forEach(function(button) {
    button.classList.toggle('active', button.id === activeId);
  });
}

function selectInspector(name) {
  if (!inspectorTitles[name]) return;
  currentInspector = name;
  document.querySelectorAll('.side-pane').forEach(function(pane) {
    pane.classList.toggle('active', pane.id === 'pane-' + name);
  });
  if (sideTitleEl) sideTitleEl.textContent = inspectorTitles[name];
  setRailActive('rail-' + name);
  refreshInspector();
}

function selectWorkspaceSection(name) {
  currentInspector = name;
  setRailActive('rail-' + name);
  if (explorerTitleEl) {
    explorerTitleEl.textContent = inspectorTitles[name] || 'Workspace Files';
  }
  refreshWorkspaceSection();
}


function saveActiveTab() {
  if (activeTabId) return saveEditorTab();
  saveBlueprint();
}

function resetWorkspaceLayout() {
  localStorage.removeItem('ma-workspace-layout-v1');
  location.reload();
}

function refreshInspector() {
  if (currentInspector === 'session' || currentInspector === 'tasks') { loadWorklog(); loadConversationHistory(); return; }
  if (currentInspector === 'blueprints') return loadBlueprints();
  if (currentInspector === 'projects') return loadProjects();
  if (currentInspector === 'todos') return renderTodos();
  if (currentInspector === 'chores') return loadChoresPane();
  if (currentInspector === 'archives') return loadArchives();
}

function syncRailMode() {
  const pill = document.getElementById('rail-mode-pill');
  if (!pill) return;
  pill.textContent = currentMode.toUpperCase();
  if (currentMode === 'chat') {
    pill.style.color = 'var(--ma)';
    pill.style.background = 'rgba(35,134,54,.12)';
    pill.style.borderColor = 'rgba(35,134,54,.25)';
  } else {
    pill.style.color = 'var(--accent)';
    pill.style.background = 'rgba(88,166,255,.12)';
    pill.style.borderColor = 'rgba(88,166,255,.25)';
  }
}

function focusChatView() {
  cfgPanel.classList.remove('show');
  setRailActive('rail-chat');
  inputEl.focus();
}

function openConfigPanelTab(tab) {
  openConfig(tab);
}

function toggleActivity() {
  selectInspector('activity');
}


let currentMode = localStorage.getItem('ma-mode') || 'work';

async function switchMode(mode) {
  if (mode !== 'chat' && mode !== 'work') return;
  try {
    const r = await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const d = await r.json();
    if (d.ok) {
      currentMode = d.mode;
      localStorage.setItem('ma-mode', currentMode);
      updateModeUI();
    }
  } catch (e) {
    console.error('Mode switch failed:', e);
  }
}

function updateModeUI() {
  const btns = document.querySelectorAll('.mode-btn');
  btns.forEach(b => {
    b.classList.remove('active', 'chat-active');
    if (b.dataset.mode === currentMode) {
      b.classList.add('active');
      if (currentMode === 'chat') b.classList.add('chat-active');
    }
  });
  syncRailMode();
}

async function syncMode() {
  try {
    const r = await fetch('/api/mode');
    const d = await r.json();
    currentMode = d.mode || 'work';
    localStorage.setItem('ma-mode', currentMode);
    updateModeUI();
  } catch { /* ignore — will default to work */ }
};
