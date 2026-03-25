// Extracted from ma-ui.js: workspace tree + IDE editor logic.

// ── Explorer section scaffolds ────────────────────────────────────────────
function _scaffoldSection(name) {
  if (!explorerBodyEl) return;
  const scaffolds = {
    blueprints:
      '<div id="bp-list"></div>' +
      '<div style="margin-top:10px">' +
        '<div id="bp-status" style="font-size:11px;color:var(--dim);margin-bottom:4px"></div>' +
        '<div id="bp-path" style="font-size:11px;color:var(--dim);margin-bottom:6px"></div>' +
        '<textarea id="bp-editor" class="bp-editor-area" rows="10" placeholder="Select a blueprint to edit..." spellcheck="false"></textarea>' +
        '<div class="btn-row" style="margin-top:8px"><button class="btn-save" onclick="saveBlueprint()">Save Blueprint</button></div>' +
      '</div>',
    projects:
      '<div id="proj-list"></div>',
    session:
      '<div id="session-summary" style="margin-bottom:12px"></div>' +
      '<h3 style="font-size:13px;color:var(--text);margin:0 0 6px">Conversations</h3>' +
      '<div id="session-conversations"></div>' +
      '<h3 style="font-size:13px;color:var(--text);margin:12px 0 6px">Recent Work</h3>' +
      '<div id="session-recent"></div>' +
      '<h3 style="font-size:13px;color:var(--text);margin:12px 0 6px">Task Editor</h3>' +
      '<label style="font-size:12px;color:var(--dim)">Current Task</label>' +
      '<input id="task-current-input" placeholder="What are you working on?">' +
      '<label style="font-size:12px;color:var(--dim);margin-top:6px">Resume Point</label>' +
      '<input id="task-resume-input" placeholder="Where to pick up...">' +
      '<label style="font-size:12px;color:var(--dim);margin-top:6px">Plan Steps</label>' +
      '<div id="task-plan-list"></div>' +
      '<div class="task-add-row" style="display:flex;gap:4px;margin-top:6px">' +
        '<input id="task-plan-new" placeholder="New step..." style="flex:1">' +
        '<button class="btn-save" onclick="addTaskStep()">Add</button>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn-save" onclick="saveTaskWorkspace()">Save Task</button></div>',
    todos:
      '<div class="task-add-row" style="display:flex;gap:4px;margin-bottom:8px">' +
        '<input id="todo-new" placeholder="New todo..." style="flex:1">' +
        '<button class="btn-save" onclick="addTodo()">Add</button>' +
      '</div>' +
      '<div id="todo-list"></div>',
    chores:
      '<div id="chore-list"></div>' +
      '<h3 style="font-size:13px;color:var(--text);margin:12px 0 6px">Add Chore</h3>' +
      '<input id="chore-name" placeholder="Chore name">' +
      '<input id="chore-desc" placeholder="Description" style="margin-top:4px">' +
      '<label style="font-size:12px;color:var(--dim);margin-top:4px">Interval (ms)</label>' +
      '<input id="chore-interval" type="number" value="1800000" placeholder="1800000">' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn-save" onclick="addChoreFromPane()">Add Chore</button></div>',
    archives:
      '<div class="archive-search-bar" style="margin-bottom:10px">' +
        '<input id="archive-search" placeholder="Search archives..." oninput="filterArchiveList()" style="width:100%;background:rgba(13,17,23,.9);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:8px 12px;font-size:13px;font-family:inherit">' +
      '</div>' +
      '<div id="archive-list"></div>'
  };
  explorerBodyEl.innerHTML = scaffolds[name] || '';
}

function refreshWorkspaceSection() {
  if (currentInspector === 'workspace') return loadWorkspaceTree();
  if (currentInspector === 'projects') { _scaffoldSection('projects'); return loadProjects(); }
  if (currentInspector === 'blueprints') { _scaffoldSection('blueprints'); return loadBlueprints(); }
  if (currentInspector === 'session' || currentInspector === 'tasks') { _scaffoldSection('session'); loadWorklog(); loadConversationHistory(); return; }
  if (currentInspector === 'todos') { _scaffoldSection('todos'); return renderTodos(); }
  if (currentInspector === 'chores') { _scaffoldSection('chores'); return loadChoresPane(); }
  if (currentInspector === 'archives') { _scaffoldSection('archives'); return loadArchives(); }
  if (currentInspector === 'activity') {
    if (explorerBodyEl) {
      explorerBodyEl.innerHTML = '<div class="side-empty">Activity stream remains visible in chat interactions while workspace integration is being finalized.</div>';
    }
    return;
  }
  if (explorerBodyEl) {
    explorerBodyEl.innerHTML = '<div class="side-empty">This section is under construction.</div>';
  }
}

// ── Workspace File Tree ───────────────────────────────────────────────────
async function loadWorkspaceTree() {
  if (!explorerBodyEl) return;
  explorerBodyEl.innerHTML = '<div class="side-empty">Loading workspace...</div>';
  try {
    const r = await fetch('/api/workspace/tree');
    const d = await r.json();
    const items = d.items || [];
    if (!items.length) {
      explorerBodyEl.innerHTML = '<div class="side-empty">Workspace is empty.</div>';
      return;
    }
    explorerBodyEl.innerHTML = renderTreeNodes(items, 0);
  } catch (e) {
    explorerBodyEl.innerHTML = '<div class="side-empty">Could not load workspace: ' + escHtml(e.message) + '</div>';
  }
}

function renderTreeNodes(nodes, depth) {
  return nodes.map(function(node) {
    if (node.type === 'directory') {
      const children = node.children ? renderTreeNodes(node.children, depth + 1) : '';
      return '<div class="tree-node" style="margin-left:' + (depth * 12) + 'px">' +
        '<div class="tree-row" onclick="toggleTreeDir(this)">' +
          '<span class="tree-toggle">▶</span>' +
          '<span>📁 ' + escHtml(node.name) + '</span>' +
        '</div>' +
        '<div class="tree-children" style="display:none">' + children + '</div>' +
      '</div>';
    }
    const ext = (node.name.match(/\.([^.]+)$/) || [])[1] || '';
    const icon = fileIcon(ext);
    return '<div class="tree-node" style="margin-left:' + (depth * 12) + 'px">' +
      '<button class="explorer-item" onclick="openFileInEditor(\'' + escAttr(node.path) + '\')">' +
        '<span>' + icon + '</span>' +
        '<span>' + escHtml(node.name) + '</span>' +
        '<span class="meta">' + escHtml(ext.toUpperCase()) + '</span>' +
      '</button>' +
    '</div>';
  }).join('');
}

function escAttr(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

function toggleTreeDir(rowEl) {
  const children = rowEl.nextElementSibling;
  const toggle = rowEl.querySelector('.tree-toggle');
  if (!children) return;
  const open = children.style.display !== 'none';
  children.style.display = open ? 'none' : '';
  toggle.textContent = open ? '▶' : '▼';
}

function fileIcon(ext) {
  const icons = { js: '📜', ts: '📜', json: '📋', md: '📖', html: '🌐', css: '🎨', py: '🐍', rs: '⚙', cs: '🔷', txt: '📄', svg: '🖼', png: '🖼', jpg: '🖼', gif: '🖼', yaml: '📋', yml: '📋', toml: '📋', xml: '🌐' };
  return icons[ext.toLowerCase()] || '📄';
}

// ── Editor Tab Management ─────────────────────────────────────────────────
async function openFileInEditor(filePath) {
  // Reuse existing tab if already open
  const existing = openTabs.find(t => t.path === filePath);
  if (existing) return activateTab(existing.id);

  try {
    const r = await fetch('/api/workspace/read?path=' + encodeURIComponent(filePath));
    const d = await r.json();
    if (d.error) { addSystem('Error: ' + d.error); return; }

    const name = filePath.split('/').pop();
    const ext = (name.match(/\.([^.]+)$/) || [])[1] || '';
    const mode = detectEditorMode(ext);
    const tab = {
      id: 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      path: filePath,
      name: name,
      content: d.content,
      originalContent: d.content,
      ext: ext,
      mode: mode,
      viewMode: mode === 'markdown' ? 'preview' : mode === 'html' ? 'preview' : 'source',
      dirty: false
    };
    openTabs.push(tab);
    renderEditorTabs();
    activateTab(tab.id);
  } catch (e) {
    addSystem('Could not open file: ' + e.message);
  }
}

function detectEditorMode(ext) {
  const e = ext.toLowerCase();
  if (e === 'md' || e === 'markdown') return 'markdown';
  if (e === 'html' || e === 'htm') return 'html';
  return 'code';
}

function renderEditorTabs() {
  if (!editorTabs) return;
  editorTabs.innerHTML = openTabs.map(function(tab) {
    const active = tab.id === activeTabId ? ' active' : '';
    const dirtyDot = tab.dirty ? ' •' : '';
    return '<button class="editor-tab' + active + '" data-tab="' + tab.id + '" onclick="activateTab(\'' + tab.id + '\')">' +
      '<span class="name">' + escHtml(tab.name) + dirtyDot + '</span>' +
      '<span class="close" onclick="event.stopPropagation();closeTab(\'' + tab.id + '\')" title="Close">&times;</span>' +
    '</button>';
  }).join('');
}

function activateTab(tabId) {
  activeTabId = tabId;
  renderEditorTabs();
  renderEditorContent();
}

function closeTab(tabId) {
  const idx = openTabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  const tab = openTabs[idx];
  if (tab.dirty && !confirm('Discard unsaved changes to ' + tab.name + '?')) return;
  openTabs.splice(idx, 1);
  if (activeTabId === tabId) {
    activeTabId = openTabs.length ? openTabs[Math.min(idx, openTabs.length - 1)].id : null;
  }
  renderEditorTabs();
  renderEditorContent();
}

function renderEditorContent() {
  if (!editorContent) return;
  const tab = openTabs.find(t => t.id === activeTabId);
  if (!tab) {
    editorContent.innerHTML = '<div id="editor-empty">Select a file or workspace item to open it in the editor.</div>';
    return;
  }

  const toolbar = buildEditorToolbar(tab);
  let body = '';

  if (tab.mode === 'markdown') {
    if (tab.viewMode === 'preview') {
      body = '<div class="preview-surface"><div class="md-preview">' + renderMarkdown(tab.content) + '</div></div>';
    } else {
      body = '<div class="editor-surface"><textarea class="editor-textarea" oninput="onEditorInput(this)" spellcheck="false">' + escHtml(tab.content) + '</textarea></div>';
    }
  } else if (tab.mode === 'html') {
    if (tab.viewMode === 'preview') {
      body = '<div class="editor-surface"><iframe class="html-preview-frame" sandbox="allow-scripts allow-same-origin"></iframe></div>';
    } else {
      body = '<div class="editor-surface"><textarea class="editor-textarea" oninput="onEditorInput(this)" spellcheck="false">' + escHtml(tab.content) + '</textarea></div>';
    }
  } else {
    // Code mode: read-only syntax highlighted view by default, editable source on switch
    if (tab.viewMode === 'source') {
      body = '<div class="editor-surface"><textarea class="editor-textarea" oninput="onEditorInput(this)" spellcheck="false">' + escHtml(tab.content) + '</textarea></div>';
    } else {
      body = '<div class="editor-code-view">' + renderCodeView(tab.content, tab.ext) + '</div>';
    }
  }

  editorContent.innerHTML =
    '<div class="editor-pane active">' +
      '<div class="editor-pane-header">' + toolbar + '</div>' +
      '<div class="editor-pane-body">' + body + '</div>' +
    '</div>';

  // Write HTML into iframe after DOM is ready
  if (tab.mode === 'html' && tab.viewMode === 'preview') {
    const iframe = editorContent.querySelector('.html-preview-frame');
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(tab.content);
      doc.close();
    }
  }
}

function buildEditorToolbar(tab) {
  const saveClass = tab.dirty ? 'save-indicator dirty' : 'save-indicator saved';
  const saveText = tab.dirty ? 'Unsaved' : 'Saved';

  let viewButtons = '';
  if (tab.mode === 'markdown') {
    viewButtons =
      '<div class="view-switch">' +
        '<button class="editor-mode-btn' + (tab.viewMode === 'preview' ? ' active' : '') + '" onclick="switchViewMode(\'preview\')">Preview</button>' +
        '<button class="editor-mode-btn' + (tab.viewMode === 'source' ? ' active' : '') + '" onclick="switchViewMode(\'source\')">Raw</button>' +
      '</div>';
  } else if (tab.mode === 'html') {
    viewButtons =
      '<div class="view-switch">' +
        '<button class="editor-mode-btn' + (tab.viewMode === 'preview' ? ' active' : '') + '" onclick="switchViewMode(\'preview\')">Preview</button>' +
        '<button class="editor-mode-btn' + (tab.viewMode === 'source' ? ' active' : '') + '" onclick="switchViewMode(\'source\')">Source</button>' +
      '</div>';
  } else {
    viewButtons =
      '<div class="view-switch">' +
        '<button class="editor-mode-btn' + (tab.viewMode === 'highlight' ? ' active' : '') + '" onclick="switchViewMode(\'highlight\')">Highlighted</button>' +
        '<button class="editor-mode-btn' + (tab.viewMode === 'source' ? ' active' : '') + '" onclick="switchViewMode(\'source\')">Edit</button>' +
      '</div>';
  }

  return '<div class="editor-toolbar">' +
    '<div class="meta-wrap">' +
      '<span class="editor-pane-title">' + escHtml(tab.name) + '</span>' +
      '<span class="editor-pane-meta">' + escHtml(tab.path) + ' <span class="' + saveClass + '">' + saveText + '</span></span>' +
    '</div>' +
    '<div class="actions">' +
      viewButtons +
      '<button class="editor-action-btn primary" onclick="saveEditorTab()" title="Save file">Save</button>' +
    '</div>' +
  '</div>';
}

function switchViewMode(mode) {
  const tab = openTabs.find(t => t.id === activeTabId);
  if (!tab) return;
  // On switching away from source, capture textarea content
  if (tab.viewMode === 'source') {
    const ta = editorContent.querySelector('.editor-textarea');
    if (ta) tab.content = ta.value;
  }
  tab.viewMode = mode;
  renderEditorContent();
}

function onEditorInput(textarea) {
  const tab = openTabs.find(t => t.id === activeTabId);
  if (!tab) return;
  tab.content = textarea.value;
  tab.dirty = tab.content !== tab.originalContent;
  renderEditorTabs();
  // Update save indicator inline
  const indicator = editorContent.querySelector('.save-indicator');
  if (indicator) {
    indicator.className = tab.dirty ? 'save-indicator dirty' : 'save-indicator saved';
    indicator.textContent = tab.dirty ? 'Unsaved' : 'Saved';
  }
}

async function saveEditorTab() {
  const tab = openTabs.find(t => t.id === activeTabId);
  if (!tab) return;
  // Capture textarea content if in source mode
  const ta = editorContent.querySelector('.editor-textarea');
  if (ta) tab.content = ta.value;
  try {
    const r = await fetch('/api/workspace/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tab.path, content: tab.content })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Save failed');
    tab.originalContent = tab.content;
    tab.dirty = false;
    renderEditorTabs();
    renderEditorContent();
    addSystem('Saved ' + tab.name);
  } catch (e) {
    addSystem('Save error: ' + e.message);
  }
}

// ── Markdown Renderer (lightweight) ───────────────────────────────────────
function renderMarkdown(src) {
  let html = escHtml(src);
  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
    return '<pre><code class="lang-' + lang + '">' + code + '</code></pre>';
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Blockquotes
  html = html.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');
  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Tables (simple)
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, function(_, header, sep, body) {
    const ths = header.split('|').filter(Boolean).map(c => '<th>' + c.trim() + '</th>').join('');
    const rows = body.trim().split('\n').map(function(row) {
      return '<tr>' + row.split('|').filter(Boolean).map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
    }).join('');
    return '<table><thead><tr>' + ths + '</tr></thead><tbody>' + rows + '</tbody></table>';
  });
  // Paragraphs (lines that aren't already wrapped in tags)
  html = html.replace(/^(?!<[a-z])((?!<[a-z]).+)$/gm, '<p>$1</p>');
  // Consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
  return html;
}

// ── Syntax Highlighting (lightweight) ─────────────────────────────────────
function renderCodeView(content, ext) {
  const lines = content.split('\n');
  const lang = ext.toLowerCase();
  return lines.map(function(line, i) {
    return '<div class="code-line">' +
      '<span class="code-gutter">' + (i + 1) + '</span>' +
      '<span class="code-content">' + highlightLine(escHtml(line), lang) + '</span>' +
    '</div>';
  }).join('');
}

function highlightLine(line, lang) {
  // Comments
  if (lang === 'js' || lang === 'ts' || lang === 'json' || lang === 'cs' || lang === 'rs' || lang === 'css' || lang === 'java' || lang === 'c' || lang === 'cpp') {
    line = line.replace(/^(\s*)(\/\/.*)$/, '$1<span class="tok-comment">$2</span>');
    line = line.replace(/(\/\*.*?\*\/)/, '<span class="tok-comment">$1</span>');
  }
  if (lang === 'py') {
    line = line.replace(/^(\s*)(#.*)$/, '$1<span class="tok-comment">$2</span>');
  }
  if (lang === 'html' || lang === 'htm' || lang === 'xml' || lang === 'svg') {
    line = line.replace(/(&lt;!--.*?--&gt;)/, '<span class="tok-comment">$1</span>');
  }

  // Strings
  line = line.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;|&#39;(?:[^&]|&(?!#39;))*?&#39;|`[^`]*`)/g, '<span class="tok-string">$1</span>');

  // Numbers
  line = line.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-number">$1</span>');

  // HTML tags
  if (lang === 'html' || lang === 'htm' || lang === 'xml' || lang === 'svg') {
    line = line.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tok-tag">$2</span>');
    line = line.replace(/\b([\w-]+)(=)/g, '<span class="tok-attr">$1</span>$2');
  }

  // CSS selectors / properties
  if (lang === 'css') {
    line = line.replace(/\b([\w-]+)\s*(?=:)/g, '<span class="tok-attr">$1</span>');
  }

  // Keywords by language
  const kwSets = {
    js: /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|new|this|import|export|default|from|async|await|try|catch|throw|typeof|instanceof|of|in|yield|null|undefined|true|false)\b/g,
    ts: /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|new|this|import|export|default|from|async|await|try|catch|throw|typeof|instanceof|of|in|yield|null|undefined|true|false|interface|type|enum|implements|extends|public|private|protected|readonly|abstract)\b/g,
    py: /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|raise|with|pass|break|continue|yield|lambda|and|or|not|in|is|None|True|False|self|async|await)\b/g,
    rs: /\b(fn|let|mut|const|if|else|for|while|loop|match|return|struct|enum|impl|trait|pub|use|mod|self|Self|super|crate|as|in|ref|move|async|await|true|false|None|Some|Ok|Err)\b/g,
    cs: /\b(class|struct|interface|enum|namespace|using|public|private|protected|internal|static|void|int|string|bool|var|new|return|if|else|for|while|foreach|switch|case|break|continue|try|catch|throw|async|await|null|true|false|this|base|override|virtual|abstract)\b/g,
    json: /\b(true|false|null)\b/g
  };
  const kwPat = kwSets[lang];
  if (kwPat) {
    line = line.replace(kwPat, '<span class="tok-keyword">$1</span>');
  }

  // Function calls — word followed by (
  line = line.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="tok-function">$1</span>');

  return line;
}

