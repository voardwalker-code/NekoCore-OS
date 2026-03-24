// Extracted from ma-ui.js: activity, session, projects, blueprints, todos, chores.
function addActivity(category, detail, data) {
  if (!actFeed) return;
  const iconMap = {
    memory_search: '\u{1F50D}', knowledge_load: '\u{1F4D6}', workspace_scan: '\u{1F4C2}',
    tool_call: '\u{1F527}', tool_result: '\u2705', llm_call: '\u{1F916}',
    plan: '\u{1F4CB}', step_start: '\u25B6', step_done: '\u2713',
    file_verify: '\u{1F4C4}', agent_dispatch: '\u{1F464}', worklog: '\u{1F4DD}', error: '\u274C'
  };
  const classMap = {
    tool_call: 'tool-call', tool_result: 'tool-result',
    llm_call: 'llm-call', error: 'error'
  };
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'act-entry ' + (classMap[category] || '');
  entry.innerHTML = '<span class="act-time">' + time + '</span><span class="act-icon">' + (iconMap[category] || '\u00B7') + '</span><span class="act-text">' + escHtml(detail || '') + '</span>';
  actFeed.appendChild(entry);
  actFeed.scrollTop = actFeed.scrollHeight;
}

function setTaskPlan(steps) {
  if (!actPlan) return;
  const section = document.getElementById('act-plan-section');
  const normalized = (steps || []).map(function(step) {
    return typeof step === 'string'
      ? { done: false, description: step }
      : { done: !!step.done, description: step.description || '' };
  }).filter(function(step) { return step.description; });
  if (section) section.style.display = normalized.length ? '' : 'none';
  actPlan.innerHTML = normalized.map(function(step, i) {
    const stateClass = step.done ? ' done' : '';
    const icon = step.done ? '\u2713' : '\u2610';
    return '<div class="act-plan-item' + stateClass + '" data-idx="' + i + '"><span class="icon">' + icon + '</span><span>' + escHtml(step.description) + '</span></div>';
  }).join('');
}

function markPlanStep(idx, status) {
  if (!actPlan) return;
  const items = actPlan.querySelectorAll('.act-plan-item');
  if (items[idx]) {
    items[idx].className = 'act-plan-item ' + status;
    items[idx].querySelector('.icon').textContent = status === 'done' ? '\u2713' : status === 'active' ? '\u25B6' : '\u2610';
  }
}

function renderTaskEditor(state) {
  document.getElementById('task-current-input').value = state.currentTask || '';
  document.getElementById('task-resume-input').value = state.resumePoint || '';
  const list = document.getElementById('task-plan-list');
  const plan = Array.isArray(state.taskPlan) ? state.taskPlan : [];
  if (!plan.length) {
    list.innerHTML = '<div class="side-empty">No task plan yet.</div>';
    return;
  }
  list.innerHTML = plan.map(function(step, idx) {
    return '<div class="task-step-row' + (step.done ? ' done' : '') + '">' +
      '<input type="checkbox" ' + (step.done ? 'checked ' : '') + 'onchange="toggleTaskStep(' + idx + ', this.checked)">' +
      '<div class="body"><input value="' + escHtml(step.description || '') + '" oninput="updateTaskStep(' + idx + ', this.value)"></div>' +
      '<button class="tiny-btn danger" onclick="removeTaskStep(' + idx + ')">Remove</button>' +
    '</div>';
  }).join('');
}

function readTaskPlanDraft() {
  const steps = [];
  document.querySelectorAll('#task-plan-list .task-step-row').forEach(function(row) {
    const textInput = row.querySelector('.body input');
    const checkbox = row.querySelector('input[type="checkbox"]');
    const description = (textInput?.value || '').trim();
    if (!description) return;
    steps.push({ done: !!checkbox?.checked, description });
  });
  return steps;
}

function toggleTaskStep(index, done) {
  const steps = readTaskPlanDraft();
  if (!steps[index]) return;
  steps[index].done = done;
  renderTaskEditor({ currentTask: document.getElementById('task-current-input').value, resumePoint: document.getElementById('task-resume-input').value, taskPlan: steps });
}

function updateTaskStep(index, value) {
  const steps = readTaskPlanDraft();
  if (!steps[index]) return;
  steps[index].description = value;
}

function removeTaskStep(index) {
  const steps = readTaskPlanDraft();
  steps.splice(index, 1);
  renderTaskEditor({ currentTask: document.getElementById('task-current-input').value, resumePoint: document.getElementById('task-resume-input').value, taskPlan: steps });
}

function addTaskStep() {
  const input = document.getElementById('task-plan-new');
  const description = input.value.trim();
  if (!description) return;
  const steps = readTaskPlanDraft();
  steps.push({ done: false, description });
  renderTaskEditor({ currentTask: document.getElementById('task-current-input').value, resumePoint: document.getElementById('task-resume-input').value, taskPlan: steps });
  input.value = '';
}

async function saveTaskWorkspace() {
  try {
    const r = await fetch('/api/worklog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentTask: document.getElementById('task-current-input').value.trim(),
        resumePoint: document.getElementById('task-resume-input').value.trim(),
        taskPlan: readTaskPlanDraft()
      })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Could not save task workspace');
    addSystem('Task workspace updated.');
    loadWorklog();
  } catch (e) {
    addSystem('Task workspace error: ' + e.message);
  }
}

async function loadWorklog() {
  const summaryEl = document.getElementById('session-summary');
  const recentEl = document.getElementById('session-recent');
  if (!summaryEl || !recentEl) return;
  try {
    const r = await fetch('/api/worklog');
    const d = await r.json();
    if (!d || (!d.activeProject && !d.currentTask && !d.resumePoint && (!d.recentWork || !d.recentWork.length))) {
      summaryEl.innerHTML = '<div class="side-empty">No session history yet.</div>';
      recentEl.innerHTML = '<div class="side-empty">Recent work will appear here after MA completes a task.</div>';
      renderTaskEditor({ currentTask: '', resumePoint: '', taskPlan: [] });
      setTaskPlan([]);
      return;
    }
    const summary = [];
    if (d.activeProject) summary.push('<div><strong style="color:var(--accent)">Project:</strong> ' + escHtml(d.activeProject) + '</div>');
    if (d.currentTask) summary.push('<div><strong style="color:var(--text)">Task:</strong> ' + escHtml(d.currentTask) + '</div>');
    if (d.resumePoint) summary.push('<div><strong style="color:var(--dim)">Resume:</strong> ' + escHtml(d.resumePoint) + '</div>');
    summaryEl.innerHTML = summary.join('') || '<div class="side-empty">No session metadata available.</div>';

    const recent = Array.isArray(d.recentWork) ? d.recentWork.slice().reverse().slice(0, 6) : [];
    recentEl.innerHTML = recent.length
      ? recent.map(function(item) {
          return '<div class="stack-card"><strong>' + escHtml(item.task || 'Untitled work') + '</strong><div class="meta">' + escHtml(item.date || '') + ' · ' + escHtml(item.status || '') + (item.files ? ' · ' + escHtml(item.files) : '') + '</div></div>';
        }).join('')
      : '<div class="side-empty">No recent work yet.</div>';

    renderTaskEditor(d);
    setTaskPlan(d.taskPlan || []);
  } catch (e) {
    summaryEl.innerHTML = '<div class="side-empty">Could not load session worklog.</div>';
    recentEl.innerHTML = '<div class="side-empty">Retry from the Refresh button.</div>';
  }
}

async function loadProjects() {
  const list = document.getElementById('proj-list');
  if (!list) return;
  list.innerHTML = '<div class="side-empty">Loading project archives...</div>';
  try {
    const r = await fetch('/api/projects');
    const d = await r.json();
    const projects = d.projects || [];
    if (!projects.length) {
      list.innerHTML = '<div class="side-empty">No project archives yet.</div>';
      return;
    }
    list.innerHTML = projects.map(function(project) {
      const isClosed = project.status === 'closed';
      return '<div class="project-card">' +
        '<div class="split-row"><div><h4>' + escHtml(project.name || project.id) + '</h4><div class="meta">' + escHtml(project.id || '') + '</div></div><span class="status-pill' + (isClosed ? ' closed' : '') + '">' + escHtml(project.status || 'active') + '</span></div>' +
        '<div class="meta" style="margin-top:8px">Updated: ' + escHtml(project.updatedAt || project.createdAt || 'unknown') + '<br>Nodes: ' + escHtml(String(project.nodeCount || 0)) + ' · Edges: ' + escHtml(String(project.edgeCount || 0)) + '</div>' +
        '<div class="pane-actions"><button class="secondary" onclick="setProjectState(\'' + project.id.replace(/'/g, '\\&#39;') + '\', \'' + (isClosed ? 'resume' : 'close') + '\')">' + (isClosed ? 'Resume Project' : 'Close Project') + '</button></div>' +
      '</div>';
    }).join('');
  } catch (e) {
    list.innerHTML = '<div class="side-empty">Could not load projects: ' + escHtml(e.message) + '</div>';
  }
}

async function setProjectState(projectId, action) {
  try {
    const r = await fetch('/api/projects/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, action })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Project update failed');
    addSystem('Project ' + projectId + ' updated.');
    loadProjects();
    loadWorklog();
  } catch (e) {
    addSystem('Project update error: ' + e.message);
  }
}

async function loadBlueprints() {
  const list = document.getElementById('bp-list');
  if (!list) return;
  list.innerHTML = '<div class="side-empty">Loading blueprints...</div>';
  try {
    const r = await fetch('/api/blueprints');
    const d = await r.json();
    const files = d.files || [];
    if (!files.length) {
      list.innerHTML = '<div class="side-empty">No blueprint files found.</div>';
      return;
    }
    list.innerHTML = files.map(function(file) {
      const active = file.path === selectedBlueprintPath ? ' active' : '';
      return '<button class="bp-item' + active + '" onclick="openBlueprint(\'' + file.path.replace(/'/g, '\\&#39;') + '\')"><div class="name">' + escHtml(file.name) + '</div><div class="meta">' + escHtml(file.path) + '</div></button>';
    }).join('');
    const hasSelection = selectedBlueprintPath && files.some(function(file) { return file.path === selectedBlueprintPath; });
    if (!hasSelection) {
      selectedBlueprintPath = files[0].path;
      return openBlueprint(selectedBlueprintPath);
    }
  } catch (e) {
    list.innerHTML = '<div class="side-empty">Could not load blueprints: ' + escHtml(e.message) + '</div>';
  }
}

async function openBlueprint(filePath) {
  if (!document.getElementById('bp-path') || !document.getElementById('bp-status')) return;
  selectedBlueprintPath = filePath;
  document.getElementById('bp-path').textContent = filePath;
  document.getElementById('bp-status').textContent = 'Loading blueprint...';
  try {
    const r = await fetch('/api/blueprints/file?path=' + encodeURIComponent(filePath));
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    document.getElementById('bp-editor').value = d.content || '';
    document.getElementById('bp-status').textContent = 'Editing ' + filePath;
    document.querySelectorAll('.bp-item').forEach(function(item) {
      item.classList.toggle('active', item.textContent.includes(filePath.split('/').pop()));
    });
  } catch (e) {
    document.getElementById('bp-status').textContent = 'Blueprint error: ' + e.message;
  }
}

async function saveBlueprint() {
  if (!document.getElementById('bp-status') || !document.getElementById('bp-editor')) return;
  if (!selectedBlueprintPath) {
    addSystem('Pick a blueprint before saving.');
    return;
  }
  try {
    const r = await fetch('/api/blueprints/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedBlueprintPath, content: document.getElementById('bp-editor').value })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Save failed');
    document.getElementById('bp-status').textContent = 'Saved ' + selectedBlueprintPath;
  } catch (e) {
    document.getElementById('bp-status').textContent = 'Blueprint save error: ' + e.message;
  }
}

function getTodos() {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  if (!list) return;
  const todos = getTodos();
  if (!todos.length) {
    list.innerHTML = '<div class="side-empty">No todos yet.</div>';
    return;
  }
  list.innerHTML = todos.map(function(todo, idx) {
    return '<div class="todo-item' + (todo.done ? ' done' : '') + '">' +
      '<input type="checkbox" ' + (todo.done ? 'checked ' : '') + 'onchange="toggleTodo(' + idx + ', this.checked)">' +
      '<div class="body"><textarea oninput="updateTodoText(' + idx + ', this.value)">' + escHtml(todo.text || '') + '</textarea><div class="meta">Updated ' + escHtml(todo.updatedAt || 'just now') + '</div></div>' +
      '<button class="tiny-btn danger" onclick="deleteTodo(' + idx + ')">Delete</button>' +
    '</div>';
  }).join('');
}

function addTodo() {
  const input = document.getElementById('todo-new');
  const text = input.value.trim();
  if (!text) return;
  const todos = getTodos();
  todos.unshift({ text, done: false, updatedAt: new Date().toISOString() });
  saveTodos(todos);
  input.value = '';
  renderTodos();
}

function toggleTodo(index, done) {
  const todos = getTodos();
  if (!todos[index]) return;
  todos[index].done = done;
  todos[index].updatedAt = new Date().toISOString();
  saveTodos(todos);
  renderTodos();
}

function updateTodoText(index, value) {
  const todos = getTodos();
  if (!todos[index]) return;
  todos[index].text = value;
  todos[index].updatedAt = new Date().toISOString();
  saveTodos(todos);
}

function deleteTodo(index) {
  const todos = getTodos();
  todos.splice(index, 1);
  saveTodos(todos);
  renderTodos();
}

async function loadChoresPane() {
  const list = document.getElementById('chore-list');
  if (!list) return;
  list.innerHTML = '<div class="side-empty">Loading chores...</div>';
  try {
    const r = await fetch('/api/chores');
    const d = await r.json();
    const chores = d.chores || [];
    if (!chores.length) {
      list.innerHTML = '<div class="side-empty">No chores defined.</div>';
      return;
    }
    list.innerHTML = chores.map(function(chore) {
      return '<div class="chore-card">' +
        '<div class="split-row"><div><h4>' + escHtml(chore.name || chore.id) + '</h4><div class="meta">' + escHtml(chore.description || 'No description') + '</div></div><span class="status-pill' + (chore.enabled === false ? ' closed' : '') + '">' + (chore.enabled === false ? 'paused' : 'active') + '</span></div>' +
        '<div class="meta" style="margin-top:8px">Interval: ' + escHtml(String(Math.round((chore.intervalMs || 0) / 60000))) + ' min · Runs: ' + escHtml(String(chore.runCount || 0)) + (chore.lastRun ? ' · Last run: ' + escHtml(chore.lastRun) : '') + '</div>' +
        '<div class="pane-actions"><button class="secondary" onclick="toggleChoreEnabled(\'' + chore.id.replace(/'/g, '\\&#39;') + '\', ' + (chore.enabled === false ? 'true' : 'false') + ')">' + (chore.enabled === false ? 'Enable' : 'Pause') + '</button><button class="danger" onclick="removeChoreFromPane(\'' + chore.id.replace(/'/g, '\\&#39;') + '\')">Delete</button></div>' +
      '</div>';
    }).join('');
  } catch (e) {
    list.innerHTML = '<div class="side-empty">Could not load chores: ' + escHtml(e.message) + '</div>';
  }
}

async function addChoreFromPane() {
  const name = document.getElementById('chore-name').value.trim();
  const description = document.getElementById('chore-desc').value.trim();
  const intervalMs = parseInt(document.getElementById('chore-interval').value, 10) || 1800000;
  if (!name) {
    addSystem('Chore name is required.');
    return;
  }
  try {
    const r = await fetch('/api/chores/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, intervalMs })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Could not add chore');
    document.getElementById('chore-name').value = '';
    document.getElementById('chore-desc').value = '';
    loadChoresPane();
  } catch (e) {
    addSystem('Chore add error: ' + e.message);
  }
}

async function toggleChoreEnabled(id, enabled) {
  try {
    const r = await fetch('/api/chores/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Could not update chore');
    loadChoresPane();
  } catch (e) {
    addSystem('Chore update error: ' + e.message);
  }
}

async function removeChoreFromPane(id) {
  try {
    const r = await fetch('/api/chores/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Could not remove chore');
    loadChoresPane();
  } catch (e) {
    addSystem('Chore remove error: ' + e.message);
  }
}

// ── Mode toggle (Chat / Work) ────────────────────────────────────────────
