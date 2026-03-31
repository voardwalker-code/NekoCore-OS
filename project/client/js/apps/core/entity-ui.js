// ── Services · Client Entity UI ──────────────────────────────────────────────
//
// HOW ENTITY UI WORKS:
// This module owns entity-focused client UI: sidebar chips, preview/check-out,
// active-entity info panel, release/delete actions, and related display state.
// It bridges entity API routes to DOM updates used by chat/settings panels.
//
// WHAT USES THIS:
//   entity tab, sidebar entity list, and chat entity context controls
//
// EXPORTS:
//   global entity helpers consumed by UI click handlers and companion modules
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS — Entity UI Module
// Extracted from app.js — P3-S14
//
// Owns: entity avatar helpers, sidebar chip builder,
//       entity browser/preview/checkout/release/delete,
//       entity info panel renderer and relationship detail.
//
// Depends on (globals from other modules loaded before this):
//   app.js      — lg, currentEntityId, currentEntityName,
//                 currentEntityAvatar, chatHistory, loadedArchives,
//                 contextStreamActive, subconsciousBootstrapped,
//                 syncShellStatusWidgets, switchMainTab, resetChatForEntitySwitch
//   chat.js     — clearChat, addChatBubble, syncContextChatGuard (window export)
//   memory-ui.js — loadServerMemories
//   users-ui.js — initUserSwitcher, resetUserSwitcher, usersAppRefresh,
//                 _FEELING_EMOJI
//   setup-ui.js — guardEntityOperation
// ============================================================

// ── Entity Avatar Helpers ──────────────────────────────────

/**
 * Derive an avatar emoji from entity gender / identity keywords.
 * Returns a single emoji character.
 */
/** Derive avatar emoji from entity identity keywords and gender fallback. */
function deriveEntityAvatar(gender, traits, name) {
  // Check traits/name for animal or non-human identity keywords
  const all = ((traits || []).join(' ') + ' ' + (name || '')).toLowerCase();
  const animalMap = [
    [/\bcat\b|\bfeline\b|\bkitty\b|\bneko\b/, '🐱'],
    [/\bdog\b|\bcanine\b|\bpuppy\b|\bwolf\b/, '🐺'],
    [/\bfox\b|\bvixen\b/, '🦊'],
    [/\bbear\b/, '🐻'],
    [/\browl\b|\bbird\b|\braven\b|\bcrow\b|\beagle\b|\bhawk\b/, '🦅'],
    [/\brobot\b|\bandroid\b|\bcyborg\b/, '🤖'],
    [/\bdragon\b/, '🐉'],
    [/\bdemon\b|\bdevil\b/, '😈'],
    [/\bangel\b|\bcelestial\b/, '😇'],
    [/\bghost\b|\bspirit\b|\bphantom\b/, '👻'],
    [/\belf\b|\belven\b/, '🧝'],
    [/\bwizard\b|\bmage\b|\bsorcerer\b/, '🧙'],
    [/\bvampire\b/, '🧛'],
    [/\bzombie\b|\bundead\b/, '🧟'],
    [/\bfairy\b|\bfae\b|\bpixie\b/, '🧚'],
    [/\bmonkey\b|\bape\b|\bprimate\b/, '🐵'],
    [/\brabbit\b|\bbunny\b|\bhare\b/, '🐰'],
    [/\bsnake\b|\bserpent\b/, '🐍'],
    [/\bunicorn\b/, '🦄'],
  ];
  for (const [regex, emoji] of animalMap) {
    if (regex.test(all)) return emoji;
  }
  // Gender-based fallback
  if (gender === 'female') return '👩';
  if (gender === 'male') return '👨';
  return '🧑'; // neutral/unknown
}

/**
 * Update the global entity display info (name + avatar).
 * Call after loading, switching, or hatching an entity.
 */
/** Update active entity display name/avatar and sync shell badges. */
function setEntityDisplay(name, gender, traits) {
  currentEntityName = name || 'Entity';
  currentEntityAvatar = deriveEntityAvatar(gender, traits, name);
  syncShellStatusWidgets();
}

// ── Sidebar Entity Chip ────────────────────────────────────

/** Build one clickable entity chip for sidebar lists. */
function buildEntityChip(entity) {
  const chip = document.createElement('div');
  chip.className = 'entity-chip' + (entity.id === currentEntityId ? ' active' : '');
  const avatar = deriveEntityAvatar(entity.gender, entity.traits || entity.personality_traits, entity.name);
  // traits()
  const traits = (entity.traits || entity.personality_traits || []).slice(0, 2).join(', ');
  const isOwner = entity.isOwner !== false;
  const isActive = entity.id === currentEntityId;
  const showVisibilityBtn = entity.ownerId && isOwner && !isActive;
  const visibilityHtml = showVisibilityBtn
    ? `<span class="entity-chip-vis" title="${entity.isPublic ? 'Shared — click to make private' : 'Private — click to share'}" style="font-size:.65rem;cursor:pointer;opacity:.6;margin-right:.15rem;">${entity.isPublic ? '🌐' : '🔒'}</span>`
    : (entity.ownerId && !isOwner && !isActive ? '<span style="font-size:.62rem;opacity:.4;margin-right:.15rem;" title="Shared by another user">🌐</span>' : '');

  chip.innerHTML = `
    <span class="entity-chip-avatar">${avatar}</span>
    <div class="entity-chip-info">
      <div class="entity-chip-name">${entity.name || 'Unnamed'}</div>
      <div class="entity-chip-meta">${traits || entity.gender || ''}</div>
    </div>
    ${visibilityHtml}
    ${isOwner && !isActive ? `<span class="entity-chip-del" title="Delete ${entity.name || 'entity'}">&times;</span>` : ''}
  `;

  chip.addEventListener('click', (e) => {
    if (e.target.closest('.entity-chip-del')) return;
    if (e.target.closest('.entity-chip-vis')) return;
    if (entity.id === currentEntityId) {
      toggleEntityInfoPanel();
    } else {
      sidebarSelectEntity(entity.id);
    }
  });

  const delBtn = chip.querySelector('.entity-chip-del');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebarDeleteEntity(entity.id, entity.name);
    });
  }

  const visBtn = chip.querySelector('.entity-chip-vis');
  if (visBtn) {
    visBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const vResp = await fetch('/api/entities/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityId: entity.id })
        });
        const data2 = await vResp.json();
        if (data2.ok) refreshSidebarEntities();
      } catch (_) {}
    });
  }

  return chip;
}

// ── Entity Browser (no active entity) ─────────────────────

/** Render entity cards in the browser panel. */
function renderEntityBrowser(entities) {
  const panel = document.getElementById('entityInfoPanel');
  if (!panel) return;

  if (!entities || !entities.length) {
    panel.innerHTML = '<div class="eip-card"><div class="eip-header"><div class="eip-header-info"><div class="eip-name">Entity Browser</div><div class="eip-meta">No entities available yet</div></div></div><div class="eip-section"><div class="eip-intro-text">No entities found. Open the Creator app to make one.</div></div></div>';
    return;
  }

  const cards = entities.map((entity) => {
    const avatar = deriveEntityAvatar(entity.gender, entity.traits || entity.personality_traits, entity.name);
    // traits()
    const traits = (entity.traits || entity.personality_traits || []).slice(0, 3).join(', ');
    const memCount = entity.memory_count ?? entity.memoryCount ?? 0;
    const status = entity.id === currentEntityId ? 'Active now' : (entity.isPublic ? 'Shared' : 'Available');
    return '<button class="entity-list-item" type="button" onclick="sidebarSelectEntity(\'' + String(entity.id).replace(/'/g, "\\'") + '\')">'
      + '<div style="display:flex;align-items:center;gap:12px">'
      + '<div class="entity-avatar" style="width:42px;height:42px;font-size:1.2rem">' + avatar + '</div>'
      + '<div style="flex:1;text-align:left">'
      + '<div class="entity-list-item-name">' + (entity.name || 'Unnamed') + '</div>'
      + '<div class="entity-list-item-traits">' + (traits || entity.gender || 'Unknown') + '</div>'
      + '<div class="entity-list-item-traits">' + memCount + ' memories \u2022 ' + status + '</div>'
      + '</div>'
      + '<div style="font-size:var(--text-xs);color:var(--text-secondary)">Preview</div>'
      + '</div>'
      + '</button>';
  }).join('');

  panel.innerHTML = '<div class="eip-card">'
    + '<div class="eip-header">'
    + '<div class="eip-header-info"><div class="eip-name">Entity Browser</div><div class="eip-meta">Select an entity to preview or check it out</div></div>'
    + '</div>'
    + '<div class="eip-section"><div class="eip-label">Available Entities</div><div style="display:grid;gap:10px">' + cards + '</div></div>'
    + '</div>';
}

async function ensureEntityWindowContent(forceRefresh) {
  const panel = document.getElementById('entityInfoPanel');
  if (!panel) return;
  const hasContent = panel.textContent && panel.textContent.trim().length > 0;
  if (!forceRefresh && hasContent) return;

  panel.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary)">Loading entities...</div>';

  // Always show the full entity browser list so users can switch between entities.
  try {
    const resp = await fetch('/api/entities');
    if (!resp.ok) throw new Error('Failed to fetch entities');
    const data = await resp.json();
    renderEntityBrowser(data.entities || []);
  } catch (e) {
    panel.innerHTML = '<div class="eip-card"><div class="eip-section"><div style="color:var(--danger)">Failed to load entities: ' + e.message + '</div></div></div>';
  }
}

// ── Sidebar Entity List ────────────────────────────────────

async function refreshSidebarEntities() {
  const syncChatGuard = () => { if (typeof syncContextChatGuard === 'function') syncContextChatGuard(); };
  const listEls = ['sidebarEntityList', 'navEntityList', 'shellEntityList']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!listEls.length) {
    syncChatGuard();
    return;
  }

  const titleEl = document.getElementById('navEntityTitle');
  const newBtn = document.getElementById('navNewEntityBtn');
  const releaseBtns = ['navReleaseEntityBtn', 'shellReleaseEntityBtn', 'chatReleaseEntityBtn']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  let activeEntityState = null;

  try {
    // normalizeEntityId()
    const normalizeEntityId = (value) => String(value || '').replace(/^Entity-/, '').replace(/^entity_+/, '');

    // Sync active entity from server so release controls remain accurate
    // even if local currentEntityId gets out of sync after reloads.
    let activeEntityId = normalizeEntityId(currentEntityId);
    try {
      const stateResp = await fetch('/api/entities/current');
      if (stateResp.ok) {
        const stateData = await stateResp.json();
        if (stateData?.loaded && stateData?.entity?.id) {
          activeEntityState = stateData.entity;
          activeEntityId = normalizeEntityId(stateData.entity.id);
          currentEntityId = activeEntityId;
          if (typeof setChatEntityMode === 'function') {
            setChatEntityMode(stateData.entity.entityMode || null);
          }
          // Load voice profile if not yet cached
          if (!currentEntityVoice) {
            try {
              const eResp = await fetch('/api/entity');
              if (eResp.ok) { const ed = await eResp.json(); if (ed.ok) currentEntityVoice = ed.entity.voice || null; }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    const resp = await fetch('/api/entities');
    if (!resp.ok) throw new Error('Failed to fetch');
    const data = await resp.json();

    // Update nav header and button states based on active entity
    if (activeEntityId) {
      if (titleEl) titleEl.textContent = 'Active Entity';
      if (newBtn) newBtn.style.display = '';
      releaseBtns.forEach((btn) => { btn.style.display = ''; });
    } else {
      if (titleEl) titleEl.textContent = 'Entities';
      if (newBtn) newBtn.style.display = '';
      releaseBtns.forEach((btn) => { btn.style.display = 'none'; });
    }

    if (!data.entities || data.entities.length === 0) {
      listEls.forEach((listEl) => {
        listEl.innerHTML = '<div style="color:var(--td);text-align:center;padding:.75rem .25rem;font-size:.65rem;">No entities yet</div>';
      });
      syncChatGuard();
      return;
    }

    // Always show all entities. The active one gets the 'active' chip highlight.
    let entitiesToShow = data.entities;

    // If the active entity isn't in the list (edge case), inject it from server state.
    if (activeEntityId && !entitiesToShow.some(e => normalizeEntityId(e.id) === activeEntityId)) {
      if (activeEntityState && normalizeEntityId(activeEntityState.id) === activeEntityId) {
        entitiesToShow = [activeEntityState, ...entitiesToShow];
      } else {
        activeEntityId = '';
        currentEntityId = null;
        currentEntityVoice = null;
      }
    }

    listEls.forEach((listEl) => {
      listEl.innerHTML = '';
    });

    entitiesToShow.forEach(entity => {
      listEls.forEach((listEl) => {
        listEl.appendChild(buildEntityChip(entity));
      });
    });
    syncChatGuard();
  } catch (e) {
    listEls.forEach((listEl) => {
      listEl.innerHTML = '<div style="color:var(--dn);text-align:center;padding:.5rem;font-size:.6rem;">' + e.message + '</div>';
    });
    syncChatGuard();
  }
}

// ── Preview Entity Before Checkout ────────────────────────

async function sidebarSelectEntity(entityId) {
  if (entityId === currentEntityId) return;
  const panel = document.getElementById('entityInfoPanel');
  if (!panel) return;
  panel.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary)">Loading preview...</div>';
  switchMainTab('entity');
  try {
    const resp = await fetch('/api/entities/preview?id=' + encodeURIComponent(entityId));
    if (!resp.ok) throw new Error('Failed to fetch preview');
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'No preview data');
    renderEntityInfoPanel(data.profile, 'preview', entityId);
  } catch (e) {
    panel.innerHTML = '<div style="color:var(--dn);padding:1rem;font-size:.8rem;">Failed to load preview: ' + e.message + '</div>';
  }
}

// ── Actually Check Out an Entity ───────────────────────────

async function checkoutEntity(entityId) {
  try {
    // Auto-release the currently checked out entity before checking out a new one
    if (currentEntityId && currentEntityId !== entityId) {
      try {
        await fetch('/api/entities/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityId: currentEntityId })
        });
      } catch (_) { /* best-effort release */ }
    }

    const resp = await fetch('/api/entities/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId })
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to load entity');
    }
    const data = await resp.json();

    updateEntityDisplay(data.entity);
    document.getElementById('entityName').textContent = ' \u2014 ' + data.entity.name;
    document.getElementById('entityTraits').textContent = (data.entity.personality_traits || []).join(', ');
    currentEntityId = entityId;
    currentEntityVoice = data.entity.voice || null;
    if (typeof setChatEntityMode === 'function') {
      setChatEntityMode(data.entity.entityMode || null);
    }
    setEntityDisplay(data.entity.name, data.entity.gender, data.entity.personality_traits);
    resetChatForEntitySwitch(data.entity.name, data.entity.introduction, data.entity.memory_count);
    if (typeof initUserSwitcher === 'function') initUserSwitcher();
    lg('ok', 'Checked out entity: ' + data.entity.name);

    const delBtn = document.getElementById('deleteEntityBtn');
    if (delBtn) delBtn.style.display = 'inline-block';
    ensureEntityWindowContent(true);
    switchMainTab('chat');
    refreshSidebarEntities();
  } catch (e) {
    lg('err', 'Failed to check out entity: ' + e.message);
  }
}

// ── Entity Info Panel ──────────────────────────────────────

async function toggleEntityInfoPanel() {
  const entityTab = document.getElementById('tab-entity');
  if (entityTab && entityTab.classList.contains('on')) {
    switchMainTab('chat');
    return;
  }
  const panel = document.getElementById('entityInfoPanel');
  if (!panel) return;
  panel.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary)">Loading...</div>';
  switchMainTab('entity');
  try {
    const resp = await fetch('/api/entity/profile');
    if (!resp.ok) throw new Error('Failed to fetch');
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'No profile');
    renderEntityInfoPanel(data.profile, 'active');
  } catch (e) {
    panel.innerHTML = '<div style="color:var(--dn);padding:1rem;font-size:.8rem;">Failed to load: ' + e.message + '</div>';
  }
}

let _eipRelMap = {};
/** Render the entity info/relationship side panel in current mode. */
function renderEntityInfoPanel(p, mode, previewEntityId) {
  const panel = document.getElementById('entityInfoPanel');
  if (!panel) return;
  _eipRelMap = {};
  const avatar = deriveEntityAvatar(p.gender, p.traits, p.name);

  let html = '<div class="eip-card">';

  // ── Header ──
  html += '<div class="eip-header">';
  html += '<span class="eip-avatar">' + avatar + '</span>';
  html += '<div class="eip-header-info">';
  html += '<div class="eip-name">' + (p.name || 'Unknown') + '</div>';
  html += '<div class="eip-meta">' + (p.gender || '') + (p.created ? ' \u00b7 Created ' + new Date(p.created).toLocaleDateString() : '') + '</div>';
  if (p.mood) {
    html += '<div class="eip-mood-inline"><span class="eip-badge eip-badge-mood">' + p.mood + '</span>';
    if (p.emotions) html += '<span class="eip-emotions">' + p.emotions + '</span>';
    html += '</div>';
  }
  html += '</div>';
  html += '<button class="eip-close" onclick="switchMainTab(\'chat\')" title="Back to chat">\u2715</button>';
  html += '</div>';

  // ── Introduction ──
  if (p.introduction) {
    html += '<div class="eip-section eip-intro"><div class="eip-label">Introduction</div><div class="eip-intro-text">' + p.introduction + '</div></div>';
  }

  // ── Two-column body ──
  html += '<div class="eip-body">';

  // Left column
  html += '<div class="eip-col">';

  if (p.traits && p.traits.length) {
    html += '<div class="eip-section"><div class="eip-label">Personality</div><div class="eip-value">';
    p.traits.forEach(t => { html += '<span class="eip-badge eip-badge-trait">' + t + '</span>'; });
    html += '</div></div>';
  }

  if (p.relationships && p.relationships.length) {
    html += '<div class="eip-section"><div class="eip-label">Relationships</div>';
    p.relationships.forEach(r => {
      const name = r.userName || r.userId || 'Unknown';
      const trust = typeof r.trust === 'number' ? Math.round(r.trust * 100) : null;
      const pct = trust !== null ? trust : 0;
      const color = pct > 70 ? 'var(--accent-green)' : pct > 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
      // safeUid()
      const safeUid = (r.userId || 'u').replace(/[^a-zA-Z0-9_-]/g, '_');
      _eipRelMap[safeUid] = r;
      html += '<div class="eip-rel-row">';
      html += '<div class="eip-rel" data-uid="' + safeUid + '">';
      html += '<span class="eip-rel-name">' + name + '</span>';
      if (trust !== null) {
        html += '<div class="eip-rel-bar-wrap"><div class="eip-rel-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
        html += '<span class="eip-rel-trust">' + pct + '%</span>';
      }
      html += '<span class="eip-rel-chevron">\u203a</span>';
      html += '</div>';
      html += '<div class="eip-rel-detail" id="eip-reld-' + safeUid + '"></div>';
      html += '</div>';
    });
    html += '</div>';
  }

  if (p.goals && p.goals.length) {
    html += '<div class="eip-section"><div class="eip-label">Goals</div>';
    p.goals.forEach(g => {
      html += '<div class="eip-goal">' + (g.description || 'Unnamed goal') + '</div>';
    });
    html += '</div>';
  }

  if (p.skills && p.skills.length) {
    html += '<div class="eip-section"><div class="eip-label">Active Skills</div><div class="eip-value">';
    p.skills.forEach(s => { html += '<span class="eip-badge eip-badge-skill">' + s.name + '</span>'; });
    html += '</div></div>';
  }

  if (p.sleepCount) {
    html += '<div class="eip-section"><div class="eip-label">Sleep Cycles</div><div class="eip-stat-big">' + p.sleepCount + '</div></div>';
  }

  html += '</div>'; // end left col

  // Right column — neurochemistry
  html += '<div class="eip-col">';
  if (p.neurochemistry && p.neurochemistry.levels) {
    html += '<div class="eip-section"><div class="eip-label">Neurochemistry</div>';
    const levels = p.neurochemistry.levels;
    const chemLabels = { dopamine: 'Dopamine', cortisol: 'Cortisol', serotonin: 'Serotonin', oxytocin: 'Oxytocin' };
    const chemIcons  = { dopamine: '\u26a1', cortisol: '\u26a0\ufe0f', serotonin: '\U0001F33F', oxytocin: '\U0001F49B' };
    for (const [key, val] of Object.entries(levels)) {
      const pct = Math.round((val || 0) * 100);
      const color = key === 'cortisol'
        ? (pct > 60 ? 'var(--accent-red)' : pct > 35 ? 'var(--accent-orange)' : 'var(--accent-green)')
        : (pct > 70 ? 'var(--accent-green)' : pct > 40 ? 'var(--accent-orange)' : 'var(--accent-red)');
      html += '<div class="eip-neuro-bar">';
      html += '<span class="eip-neuro-icon">' + (chemIcons[key] || '') + '</span>';
      html += '<span class="eip-neuro-label">' + (chemLabels[key] || key) + '</span>';
      html += '<div class="eip-neuro-track"><div class="eip-neuro-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
      html += '<span class="eip-neuro-val">' + pct + '%</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>'; // end right col

  html += '</div>'; // end eip-body

  // Checkout button
  if (mode === 'preview' && previewEntityId) {
    html += '<div class="eip-checkout-row">';
    html += '<button class="eip-checkout-btn" onclick="checkoutEntity(\'' + previewEntityId.replace(/'/g, "\\'") + '\')">Check Out Entity \u2192</button>';
    html += '</div>';
  }

  // Release button for active entity view
  if (mode === 'active') {
    html += '<div class="eip-checkout-row">';
    html += '<button class="eip-checkout-btn" onclick="releaseActiveEntity()">Release Entity</button>';
    html += '</div>';
  }

  html += '</div>'; // end eip-card
  panel.innerHTML = html;
  panel.querySelectorAll('.eip-rel[data-uid]').forEach(el => {
    el.addEventListener('click', () => _toggleRelDetail(el.dataset.uid));
  });
  switchMainTab('entity');
}
/** Expand/collapse one relationship detail row by uid key. */
function _toggleRelDetail(uid) {
  const r = _eipRelMap[uid];
  if (!r) return;
  const detailEl = document.getElementById('eip-reld-' + uid);
  if (!detailEl) return;
  const isOpen = detailEl.classList.toggle('open');
  const relEl = document.querySelector('.eip-rel[data-uid="' + uid + '"]');
  const chevron = relEl && relEl.querySelector('.eip-rel-chevron');
  if (chevron) chevron.textContent = isOpen ? '\u2228' : '\u203a';
  if (!isOpen) { detailEl.innerHTML = ''; return; }

  const tPct = Math.round((r.trust || 0) * 100);
  const rPct = Math.round((r.rapport || 0) * 100);
  const tColor = tPct > 70 ? 'var(--accent-green)' : tPct > 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
  const rColor = rPct > 60 ? 'var(--accent-green)' : rPct > 30 ? 'var(--accent-orange)' : 'var(--accent-red)';
  // feelEmoji()
  const feelEmoji = (_FEELING_EMOJI && _FEELING_EMOJI[r.feeling]) || '\U0001F636';

  let d = '';
  d += '<div class="eip-reld-feeling"><span>' + feelEmoji + '</span><strong>' + (r.feeling || 'neutral') + '</strong></div>';

  d += '<div class="eip-reld-bars">';
  d += '<div class="eip-reld-bar-row"><span class="eip-reld-bar-label">Trust</span><div class="eip-rel-bar-wrap"><div class="eip-rel-bar-fill" style="width:' + tPct + '%;background:' + tColor + '"></div></div><span class="eip-reld-bar-val">' + tPct + '%</span></div>';
  d += '<div class="eip-reld-bar-row"><span class="eip-reld-bar-label">Rapport</span><div class="eip-rel-bar-wrap"><div class="eip-rel-bar-fill" style="width:' + rPct + '%;background:' + rColor + '"></div></div><span class="eip-reld-bar-val">' + rPct + '%</span></div>';
  d += '</div>';

  if (r.userRole || r.entityRole) {
    d += '<div class="eip-reld-roles">';
    if (r.userRole) d += '<div class="eip-reld-role"><span class="eip-reld-role-label">Their role</span><span class="eip-badge">' + r.userRole + '</span></div>';
    if (r.entityRole) d += '<div class="eip-reld-role"><span class="eip-reld-role-label">My role</span><span class="eip-badge">' + r.entityRole + '</span></div>';
    d += '</div>';
  }

  if (r.beliefs && r.beliefs.length) {
    d += '<div class="eip-reld-section"><div class="eip-reld-section-label">Beliefs</div>';
    r.beliefs.forEach(b => {
      const conf = Math.round((b.confidence || 0) * 100);
      d += '<div class="eip-reld-belief"><span class="eip-reld-belief-text">\u201c' + (b.belief || '') + '\u201d</span><span class="eip-reld-belief-conf">' + conf + '%</span></div>';
    });
    d += '</div>';
  }

  if (r.summary) {
    d += '<div class="eip-reld-section"><div class="eip-reld-section-label">Summary</div><div class="eip-reld-summary">' + r.summary + '</div></div>';
  }

  const statParts = [];
  if (r.interactionCount) statParts.push(r.interactionCount + ' interactions');
  if (r.firstMet) statParts.push('Met ' + new Date(r.firstMet).toLocaleDateString());
  if (r.lastSeen) statParts.push('Last seen ' + new Date(r.lastSeen).toLocaleDateString());
  if (statParts.length) d += '<div class="eip-reld-stats">' + statParts.join(' \u00b7 ') + '</div>';

  detailEl.innerHTML = d;
}

// ── Release Active Entity ──────────────────────────────────

async function releaseActiveEntity() {
  let entityId = currentEntityId;
  if (!entityId) {
    try {
      const currentResp = await fetch('/api/entities/current');
      if (currentResp.ok) {
        const currentData = await currentResp.json();
        if (currentData?.loaded && currentData?.entity?.id) {
          entityId = currentData.entity.id;
          currentEntityId = entityId;
        }
      }
    } catch (_) {}
  }
  if (!entityId) {
    lg('warn', 'No active entity to release');
    return;
  }
  if (!confirm('Release this entity? Other users will be able to check it out.')) return;

  // Cancel any in-flight chat pipeline call before releasing
  if (typeof abortActiveChatCall === 'function') abortActiveChatCall();
  chatBusy = false;

  try {
    const resp = await fetch('/api/entities/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId })
    });
    if (!resp.ok) throw new Error('Failed to release');

    lg('ok', 'Entity released');
    currentEntityId = null;
    currentEntityName = null;
    currentEntityVoice = null;
    currentEntityAvatar = '\U0001F916';
    if (typeof setChatEntityMode === 'function') {
      setChatEntityMode(null);
    }
    document.getElementById('entityName').textContent = '';
    document.getElementById('entityTraits').textContent = 'No entity loaded';
    const display = document.getElementById('entityDisplay');
    if (display) {
      display.classList.remove('loaded');
      display.innerHTML = '<div style="color:var(--td);text-align:center;padding:2rem"><div>No entity loaded</div></div>';
    }
    const delBtn = document.getElementById('deleteEntityBtn');
    if (delBtn) delBtn.style.display = 'none';
    if (typeof resetUserSwitcher === 'function') resetUserSwitcher();
    if (typeof clearChat === 'function') clearChat();
    chatHistory = [];
    loadedArchives = [];
    await usersAppRefresh();
    ensureEntityWindowContent(true);
    switchMainTab('chat');
    refreshSidebarEntities();
  } catch (e) {
    lg('err', 'Failed to release entity: ' + e.message);
  }
}

// ── Delete Entity (Sidebar) ────────────────────────────────

async function sidebarDeleteEntity(entityId, entityName) {
  if (!confirm('Delete entity "' + (entityName || entityId) + '"? This cannot be undone.')) return;
  try {
    const resp = await fetch('/api/entities/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId })
    });
    if (!resp.ok) throw new Error('Failed to delete entity');

    lg('ok', 'Deleted entity: ' + (entityName || entityId));

    // If we deleted the active entity, reset the UI
    if (entityId === currentEntityId) {
      currentEntityId = null;
      currentEntityVoice = null;
      document.getElementById('entityName').textContent = '';
      document.getElementById('entityTraits').textContent = 'No entity loaded';
      const display = document.getElementById('entityDisplay');
      if (display) {
        display.classList.remove('loaded');
        display.innerHTML = '<div style="color:var(--td);text-align:center;padding:2rem"><div>No entity loaded</div></div>';
      }
      const delBtn = document.getElementById('deleteEntityBtn');
      if (delBtn) delBtn.style.display = 'none';
      if (typeof resetUserSwitcher === 'function') resetUserSwitcher();
      if (typeof clearChat === 'function') clearChat();
      chatHistory = [];
      loadedArchives = [];
    }

    ensureEntityWindowContent(true);
    refreshSidebarEntities();
  } catch (e) {
    lg('err', 'Failed to delete entity: ' + e.message);
  }
}

// ── Entity List (Settings Panel) ──────────────────────────

async function loadEntityList() {
  if (!guardEntityOperation('Load Entity')) return;
  const listEl = document.getElementById('entityList');
  const itemsEl = document.getElementById('entityListItems');

  listEl.style.display = listEl.style.display === 'none' ? 'block' : 'none';
  if (listEl.style.display === 'none') return;

  itemsEl.innerHTML = 'Loading...';

  try {
    const resp = await fetch('/api/entities');
    if (!resp.ok) throw new Error('Failed to fetch entities');
    const data = await resp.json();

    if (!data.entities || data.entities.length === 0) {
      itemsEl.innerHTML = '<div style="color:var(--td);padding:1rem;text-align:center">No entities found</div>';
      return;
    }

    itemsEl.innerHTML = '';
    data.entities.forEach(entity => {
      const div = document.createElement('div');
      div.className = 'entity-list-item';
      div.innerHTML = `
        <div class="entity-list-item-name">${entity.name || 'Unnamed'}</div>
        <div class="entity-list-item-traits">${entity.gender || 'unknown'} \u2022 ${entity.memoryCount || 0} memories</div>
      `;
      div.onclick = () => selectEntity(entity.id);
      itemsEl.appendChild(div);
    });
  } catch (e) {
    itemsEl.innerHTML = '<div style="color:var(--dn);padding:1rem">' + e.message + '</div>';
    lg('err', 'Failed to load entities: ' + e.message);
  }
}

async function selectEntity(entityId) {
  // Route through the checkout system
  await checkoutEntity(entityId);
  // Hide the settings entity list
  const listEl = document.getElementById('entityList');
  if (listEl) listEl.style.display = 'none';
}

// ── Entity Card Display Widget ─────────────────────────────

/** Update top-bar entity display fields for active entity. */
function updateEntityDisplay(entity) {
  const display = document.getElementById('entityDisplay');
  // traits()
  const traits = (entity.personality_traits || []).join(', ');
  const intro = entity.introduction || 'No introduction available';
  const avatar = deriveEntityAvatar(entity.gender, entity.personality_traits, entity.name);

  display.classList.add('loaded');
  display.innerHTML = `
    <div class="entity-card">
      <div class="entity-avatar">${avatar}</div>
      <div class="entity-info">
        <div class="entity-name">${entity.name}</div>
        <div class="entity-traits">${traits}</div>
        <div class="entity-meta">${entity.memory_count || 0} memories \u2022 Created ${new Date(entity.created).toLocaleDateString()}</div>
      </div>
    </div>
    <div style="margin-top:1rem;padding:.75rem;background:var(--sf3);border-radius:8px;font-size:.8rem;color:var(--tm);border-left:2px solid var(--em);line-height:1.6">
      ${intro}
    </div>
  `;
}
