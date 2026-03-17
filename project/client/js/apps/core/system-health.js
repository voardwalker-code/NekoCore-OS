// ============================================================
// NekoCore OS — System Health & Maintenance Module
// Extracted from app.js — P3-S15
//
// Owns: memory self-heal, memory stats, trace graph rebuild,
//       system backup, system restore, formatBytes helper.
//
// Depends on (globals from other modules loaded before this):
//   app.js  — lg
//   chat.js — addChatBubble
// ============================================================

async function repairMemoryLogs() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Repairing...';
  
  const statusEl = document.getElementById('healStatus');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Running self-heal...';
  
  try {
    const resp = await fetch('/api/entities/heal', { method: 'POST' });
    if (!resp.ok) throw new Error('Failed to run memory heal');
    
    const data = await resp.json();
    statusEl.innerHTML = `
      ✓ Repair complete<br>
      Repaired: ${data.repaired} files<br>
      Errors: ${data.errors}
    `;
    lg('ok', 'Memory self-heal: ' + data.repaired + ' repaired');
  } catch (e) {
    statusEl.innerHTML = '✗ ' + e.message;
    lg('err', 'Memory heal failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Self-Heal';
  }
}

async function showMemoryStats() {
  try {
    const resp = await fetch('/api/memory-stats');
    if (!resp.ok) throw new Error('Failed to fetch stats');
    const stats = await resp.json();
    
    addChatBubble('system', 'Memory Statistics:\n\n' +
      '📊 Total memories: ' + stats.totalMemories + '\n' +
      '💾 Storage size: ' + formatBytes(stats.storageSize) + '\n' +
      '📂 Memory logs: ' + stats.memoryLogs + '\n' +
      '✓ Healthy logs: ' + stats.healthyLogs + '\n' +
      '⚠ Corrupted logs: ' + stats.corruptedLogs);
  } catch (e) {
    lg('err', 'Failed to fetch memory stats: ' + e.message);
  }
}

async function rebuildTraceGraph() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Rebuilding...';
  
  try {
    const resp = await fetch('/api/trace-rebuild', { method: 'POST' });
    if (!resp.ok) throw new Error('Failed to rebuild');
    
    const data = await resp.json();
    addChatBubble('system', 'Trace graph rebuilt:\n' +
      '🔗 Connections: ' + data.connections + '\n' +
      '✓ Complete');
    lg('ok', 'Trace graph rebuilt with ' + data.connections + ' connections');
  } catch (e) {
    lg('err', 'Failed to rebuild trace graph: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Rebuild';
  }
}

async function runSystemBackup(buttonEl) {
  const statusEl = document.getElementById('backupStatus');
  const inputEl = document.getElementById('backupTargetFolder');
  const targetFolder = (inputEl?.value || '').trim();

  if (!targetFolder) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Please enter a backup target folder path.';
    }
    return;
  }

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Creating Backup...';
  }
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Creating backup...';
  }

  try {
    const resp = await fetch('/api/system/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetFolder })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error(data.error || 'Backup failed');

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `✓ Backup created:<br>${data.backupDir}`;
    }
    lg('ok', 'Backup created at ' + data.backupDir);
  } catch (e) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = '✗ ' + e.message;
    }
    lg('err', 'Backup failed: ' + e.message);
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Create Backup';
    }
  }
}

async function runSystemRestore(buttonEl) {
  const statusEl = document.getElementById('restoreStatus');
  const inputEl = document.getElementById('restoreSourceFolder');
  const sourceFolder = (inputEl?.value || '').trim();

  if (!sourceFolder) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Please enter a backup source folder path.';
    }
    return;
  }

  const ok = window.confirm('Restore will overwrite current runtime data (config, server data, entities, memories). Continue?');
  if (!ok) return;

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Restoring...';
  }
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Restoring backup...';
  }

  try {
    const resp = await fetch('/api/system/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceFolder })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error(data.error || 'Restore failed');

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `✓ Restore complete.<br>Safety snapshot: ${data.safetySnapshot}<br>Reload page now. Server restart recommended.`;
    }
    lg('ok', 'Restore completed from ' + data.restoredFrom);
  } catch (e) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = '✗ ' + e.message;
    }
    lg('err', 'Restore failed: ' + e.message);
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Restore Backup';
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
