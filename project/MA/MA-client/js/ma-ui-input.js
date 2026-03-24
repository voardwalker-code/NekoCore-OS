// Extracted from ma-ui.js: slash commands, token bar, continuation, drag/drop attachments.
const cmdPopup = document.getElementById('cmd-popup');
let slashCommands = [];
let cmdActiveIdx = -1;

// Load commands from server
fetch('/api/commands').then(r => r.json()).then(cmds => { slashCommands = cmds; }).catch(() => {});

function handleInput() {
  const val = inputEl.value;
  if (val.startsWith('/')) {
    const filter = val.slice(1).toLowerCase();
    const matches = slashCommands.filter(c => c.cmd.slice(1).toLowerCase().startsWith(filter) || c.usage.toLowerCase().includes(filter));
    if (matches.length > 0) {
      cmdPopup.innerHTML = matches.map((c, i) =>
        `<div class="cmd-item${i === cmdActiveIdx ? ' active' : ''}" data-idx="${i}" onclick="pickCmd('${c.usage}')">`
        + `<span class="cmd-name">${c.usage}</span><span class="cmd-desc">${c.desc}</span></div>`
      ).join('');
      cmdPopup.classList.add('show');
      return;
    }
  }
  cmdPopup.classList.remove('show');
  cmdActiveIdx = -1;
}

function pickCmd(usage) {
  inputEl.value = usage;
  cmdPopup.classList.remove('show');
  cmdActiveIdx = -1;
  inputEl.focus();
}

// Override handleKey for arrow navigation in popup and slash dispatch
const _origHandleKey = handleKey;
handleKey = function(e) {
  if (cmdPopup.classList.contains('show')) {
    const items = cmdPopup.querySelectorAll('.cmd-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdActiveIdx = Math.min(cmdActiveIdx + 1, items.length - 1); _highlightCmd(items); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); cmdActiveIdx = Math.max(cmdActiveIdx - 1, 0); _highlightCmd(items); return; }
    if (e.key === 'Tab' || (e.key === 'Enter' && cmdActiveIdx >= 0 && !e.shiftKey)) {
      e.preventDefault();
      if (cmdActiveIdx >= 0 && items[cmdActiveIdx]) {
        inputEl.value = items[cmdActiveIdx].querySelector('.cmd-name').textContent;
        cmdPopup.classList.remove('show');
        cmdActiveIdx = -1;
      }
      return;
    }
    if (e.key === 'Escape') { cmdPopup.classList.remove('show'); cmdActiveIdx = -1; return; }
  }
  // Slash command execution on Enter
  if (e.key === 'Enter' && !e.shiftKey && inputEl.value.trim().startsWith('/')) {
    e.preventDefault();
    execSlash(inputEl.value.trim());
    return;
  }
  _origHandleKey(e);
};

function _highlightCmd(items) {
  items.forEach((el, i) => el.classList.toggle('active', i === cmdActiveIdx));
  if (items[cmdActiveIdx]) items[cmdActiveIdx].scrollIntoView({ block: 'nearest' });
}

async function execSlash(command) {
  cmdPopup.classList.remove('show');
  addMsg('user', command);
  inputEl.value = '';
  inputEl.style.height = 'auto';
  try {
    const r = await fetch('/api/slash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const d = await r.json();
    addMsg(d.type || 'system', d.text || '(no output)');
  } catch (e) {
    addSystem('Command error: ' + e.message);
  }
}

// ── Token Usage Indicator ────────────────────────────────────────────────
function updateTokenBar(usage) {
  const fill = document.querySelector('#token-bar .fill');
  const info = document.getElementById('token-info');
  if (!usage || !usage.contextBudget) return;
  const pct = Math.min(100, Math.round((usage.contextTokens / usage.contextBudget) * 100));
  fill.style.width = pct + '%';
  fill.className = 'fill' + (pct >= 85 ? ' crit' : pct >= 65 ? ' warn' : '');
  info.textContent = `Context: ~${usage.contextTokens} / ${usage.contextBudget} tokens (${pct}%) · Response reserve: ${usage.responseReserve}`;
}

// ── Continue Button ─────────────────────────────────────────────────────
function showContinueButton(point) {
  const bar = document.createElement('div');
  bar.className = 'continue-bar';
  bar.innerHTML = `<button onclick="sendContinue()">Continue from: ${point.slice(0, 60)}</button>`;
  chatEl.appendChild(bar);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function sendContinue() {
  if (!lastContinuation) return;
  inputEl.value = `Continue from where you left off: ${lastContinuation}`;
  lastContinuation = null;
  // Remove continue buttons
  chatEl.querySelectorAll('.continue-bar').forEach(el => el.remove());
  send();
}

// ── Drag & Drop File Attach ─────────────────────────────────────────────
const dropOverlay = document.getElementById('drop-overlay');
const fileChips   = document.getElementById('file-chips');
let dragCounter = 0;

document.addEventListener('dragenter', e => {
  e.preventDefault();
  dragCounter++;
  if (e.dataTransfer.types.includes('Files')) dropOverlay.classList.add('show');
});

document.addEventListener('dragleave', e => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('show'); }
});

document.addEventListener('dragover', e => { e.preventDefault(); });

const IMAGE_TYPES = new Set(['image/png','image/jpeg','image/jpg','image/gif','image/webp','image/svg+xml']);
const MAX_FILE_SIZE = 524288; // 512KB
const MAX_IMAGE_SIZE = 5242880; // 5MB

document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('show');
  if (!e.dataTransfer.files.length) return;
  for (const file of e.dataTransfer.files) {
    const isImage = IMAGE_TYPES.has(file.type);
    const limit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    const limitLabel = isImage ? '5MB' : '512KB';
    if (file.size > limit) {
      addSystem(`Skipped "${file.name}" — too large (max ${limitLabel})`);
      continue;
    }
    if (pendingFiles.length >= 5) {
      addSystem('Max 5 files at a time');
      break;
    }
    const reader = new FileReader();
    if (isImage) {
      reader.onload = () => {
        pendingFiles.push({ name: file.name, content: reader.result, type: 'image', mime: file.type });
        renderFileChips();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        pendingFiles.push({ name: file.name, content: reader.result, type: 'text' });
        renderFileChips();
      };
      reader.readAsText(file);
    }
  }
});

function renderFileChips() {
  fileChips.innerHTML = pendingFiles.map((f, i) => {
    const thumb = f.type === 'image' ? `<img src="${f.content}" alt="${f.name}">` : '';
    return `<span class="file-chip">${thumb}${f.name}<button onclick="removeFile(${i})" title="Remove">✕</button></span>`;
  }).join('');
}

function removeFile(idx) {
  pendingFiles.splice(idx, 1);
  renderFileChips();
}