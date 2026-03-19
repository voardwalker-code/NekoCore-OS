// ============================================================
// REM System — Standalone Entity Creator
// Handles all entity creation modes independently of the main app.
// After creation, redirects back to index.html.
// ============================================================

'use strict';

// ── State ────────────────────────────────────────────────────
let entityCreationMode = null;
let creatorOnboardingPayload = null;
let lastCreatedEntityId = null;
const PAGE_PARAMS = new URLSearchParams(window.location.search);
const IS_EMBED = PAGE_PARAMS.get('embed') === '1';
const RESERVED_ENTITY_NAME_KEYS = new Set(['nekocore', 'neko', 'echo', 'agentecho']);
const TRAIT_SUGGESTIONS = [
  'adaptable', 'adventurous', 'affectionate', 'analytical', 'assertive', 'attentive',
  'bold', 'brave', 'calm', 'candid', 'careful', 'caring',
  'charming', 'cheerful', 'clever', 'compassionate', 'confident', 'considerate',
  'creative', 'curious', 'decisive', 'diligent', 'direct', 'disciplined',
  'empathetic', 'energetic', 'expressive', 'focused', 'friendly', 'gentle',
  'honest', 'humorous', 'imaginative', 'independent', 'insightful', 'intuitive',
  'kind', 'logical', 'loyal', 'methodical', 'observant', 'open-minded',
  'optimistic', 'organized', 'patient', 'perceptive', 'playful', 'pragmatic',
  'protective', 'reflective', 'reliable', 'resilient', 'resourceful', 'sincere',
  'social', 'steady', 'supportive', 'thoughtful', 'warm', 'witty'
];

function normalizeEntityNameKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isReservedEntityName(name) {
  return RESERVED_ENTITY_NAME_KEYS.has(normalizeEntityNameKey(name));
}

function buildTraitAutocompleteValue(rawValue, suggestion) {
  const current = String(rawValue || '');
  const commaIndex = current.lastIndexOf(',');
  const prefix = commaIndex >= 0 ? current.slice(0, commaIndex + 1) : '';
  const spacer = prefix && !/\s$/.test(prefix) ? ' ' : '';
  return prefix + spacer + suggestion;
}

function refreshTraitSuggestionList(rawValue) {
  const listEl = document.getElementById('entityTraitSuggestions');
  if (!listEl) return;

  const current = String(rawValue || '');
  const token = current.split(',').pop().trim().toLowerCase();
  const selected = new Set(
    current
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );

  let matches = TRAIT_SUGGESTIONS.filter((trait) => !selected.has(trait));
  if (token) {
    matches = matches.filter((trait) => trait.includes(token));
  }

  listEl.innerHTML = '';
  for (const trait of matches.slice(0, 24)) {
    const opt = document.createElement('option');
    opt.value = buildTraitAutocompleteValue(current, trait);
    listEl.appendChild(opt);
  }
}

function wireTraitAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.setAttribute('list', 'entityTraitSuggestions');
  input.addEventListener('input', () => refreshTraitSuggestionList(input.value));
  input.addEventListener('focus', () => refreshTraitSuggestionList(input.value));
}

function randomTraitFill(inputId, targetCount) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const count = Math.max(3, Math.min(7, Number(targetCount) || 5));
  const pool = TRAIT_SUGGESTIONS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  input.value = pool.slice(0, count).join(', ');
  refreshTraitSuggestionList(input.value);
}

function initTraitAssist() {
  wireTraitAutocomplete('emptyEntityTraits');
  wireTraitAutocomplete('guidedEntityTraits');

  const emptyAutoBtn = document.getElementById('emptyTraitsAutoBtn');
  if (emptyAutoBtn) {
    emptyAutoBtn.onclick = () => {
      randomTraitFill('emptyEntityTraits', 5);
      lg('info', 'Auto-filled personality traits for Empty mode.');
    };
  }

  const guidedAutoBtn = document.getElementById('guidedTraitsAutoBtn');
  if (guidedAutoBtn) {
    guidedAutoBtn.onclick = () => {
      randomTraitFill('guidedEntityTraits', 5);
      lg('info', 'Auto-filled personality traits for Guided mode.');
    };
  }

  refreshTraitSuggestionList('');
}

// ── Status helper ────────────────────────────────────────────
function lg(type, msg) {
  const bar = document.getElementById('creatorStatusBar');
  if (!bar) return;
  bar.className = type;
  bar.textContent = msg;
  console[type === 'err' ? 'error' : 'log']('[creator]', msg);
}

// ── Navigation ───────────────────────────────────────────────
function creatorContinueToModeSelection() {
  const creatorName = document.getElementById('creatorUserName').value.trim();
  if (creatorName && !document.getElementById('creatorOnboardName').value.trim()) {
    document.getElementById('creatorOnboardName').value = creatorName;
  }
  document.getElementById('creatorWelcomeStep').style.display = 'none';
  document.getElementById('entityCreationModeStep').style.display = 'block';
  lg('info', 'Pick a creation mode below.');
}

function selectEntityMode(mode) {
  entityCreationMode = mode;
  document.getElementById('entityCreationModeStep').style.display = 'none';
  document.getElementById('creatorOnboardingBlock').style.display = 'block';

  const steps = ['entityEmptyFormStep', 'entityRandomFormStep', 'entityGuidedFormStep', 'entityCharacterFormStep'];
  steps.forEach(id => { document.getElementById(id).style.display = 'none'; });

  const modeMap = {
    empty: { step: 'entityEmptyFormStep', label: 'Create Empty Entity' },
    random: { step: 'entityRandomFormStep', label: 'Generate Random Entity' },
    guided: { step: 'entityGuidedFormStep', label: 'Generate Guided Entity' },
    character: { step: 'entityCharacterFormStep', label: 'Ingest Character' }
  };

  const selected = modeMap[mode];
  if (selected) {
    document.getElementById(selected.step).style.display = 'block';
    const btn = document.getElementById('createEntityBtn');
    btn.style.display = 'inline-flex';
    btn.textContent = selected.label;
    lg('info', selected.label + ' — fill in the form and hit the button when ready.');
  }
}

function backToModeSelection() {
  entityCreationMode = null;
  ['entityEmptyFormStep', 'entityRandomFormStep', 'entityGuidedFormStep', 'entityCharacterFormStep'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('creatorOnboardingBlock').style.display = 'none';
  document.getElementById('entityCreationModeStep').style.display = 'block';
  document.getElementById('createEntityBtn').style.display = 'none';
  lg('info', 'Pick a creation mode below.');
}

function updateEmptyEntityModeForm() {
  const modeEl = document.getElementById('emptyEntityMode');
  const traitsGroup = document.getElementById('emptyEntityTraitsGroup');
  if (!modeEl || !traitsGroup) return;
  const isSingleLlm = modeEl.value === 'single-llm';
  traitsGroup.style.display = isSingleLlm ? 'none' : 'block';
}

window.updateEmptyEntityModeForm = updateEmptyEntityModeForm;

function resetCreatorFlow(options = {}) {
  const skipWelcome = !!options.skipWelcome;
  entityCreationMode = null;
  creatorOnboardingPayload = null;
  lastCreatedEntityId = null;

  ['entityEmptyFormStep', 'entityRandomFormStep', 'entityGuidedFormStep', 'entityCharacterFormStep', 'creatorOnboardingBlock', 'creatorSuccessScreen']
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

  const footer = document.getElementById('creatorCardFooter');
  const button = document.getElementById('createEntityBtn');
  const welcome = document.getElementById('creatorWelcomeStep');
  const modeStep = document.getElementById('entityCreationModeStep');
  if (footer) footer.style.display = 'flex';
  if (button) {
    button.disabled = false;
    button.style.display = 'none';
    button.textContent = 'Create Entity';
  }
  if (welcome) welcome.style.display = skipWelcome ? 'none' : 'block';
  if (modeStep) modeStep.style.display = skipWelcome ? 'block' : 'none';

  const progress = document.getElementById('creatorProgressOverlay');
  if (progress) progress.classList.remove('active');

  ['emptyEntityName', 'emptyEntityAge', 'emptyEntityTraits', 'emptyEntityIntro', 'charEntityName', 'charEntitySource', 'charEntityNotes', 'guidedEntityName', 'guidedEntityAge', 'guidedEntityTraits', 'guidedEntityBackstory', 'guidedEntityStyle', 'guidedEntityKnowledgeSeed', 'guidedEntityIntro', 'creatorOnboardInterests', 'creatorOnboardOccupation', 'creatorOnboardIntent']
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  ['emptyEntityGender', 'emptyEntityMode', 'randomEntityGender', 'guidedEntityGender', 'guidedEntityIntent', 'guidedEntityInteractionStyle']
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.options.length) el.selectedIndex = 0;
    });

  updateEmptyEntityModeForm();

  const unbreakable = document.getElementById('guidedEntityUnbreakable');
  if (unbreakable) unbreakable.checked = false;

  const creatorName = document.getElementById('creatorUserName');
  const onboardName = document.getElementById('creatorOnboardName');
  if (onboardName) onboardName.value = creatorName ? creatorName.value.trim() : '';

  const randomDepth = document.getElementById('randomBackstoryDepth');
  if (randomDepth) randomDepth.value = '3';
  updateRandomBackstoryDepth(randomDepth?.value || '3');

  const guidedDepth = document.getElementById('guidedBackstoryDepth');
  if (guidedDepth) guidedDepth.value = '3';
  updateGuidedBackstoryDepth(guidedDepth?.value || '3');

  const seedStep = document.getElementById('hatchStepSeed');
  if (seedStep) seedStep.style.display = 'none';
  const progressSteps = document.querySelectorAll('#hatchProgressSteps .hatch-step');
  progressSteps.forEach((step, index) => {
    step.classList.remove('active', 'complete');
    step.style.opacity = index === 0 ? '.6' : '.4';
    const icon = step.querySelector('.hatch-step-icon');
    if (icon) icon.textContent = '⏳';
  });

  lg('info', skipWelcome ? 'Pick a creation mode below.' : 'Choose a creation mode to get started.');
}

function goToMain() {
  if (IS_EMBED) {
    syncParentAfterCreate();
    return;
  }
  window.location.href = '/index.html';
}

function syncParentAfterCreate() {
  try {
    if (!window.parent || window.parent === window) return;
    const p = window.parent;
    if (typeof p.refreshSidebarEntities === 'function') p.refreshSidebarEntities();

    if (lastCreatedEntityId && typeof p.sidebarSelectEntity === 'function') {
      // Open the entity preview/details card and let the user explicitly choose checkout.
      p.sidebarSelectEntity(lastCreatedEntityId);
    } else {
      if (typeof p.ensureEntityWindowContent === 'function') p.ensureEntityWindowContent(true);
      if (typeof p.switchMainTab === 'function') p.switchMainTab('entity');
    }
    if (typeof p.closeWindow === 'function') p.closeWindow('creator');
  } catch (_) {
    // Ignore cross-frame sync errors; creation still succeeded.
  }
}

// ── Progress overlay ─────────────────────────────────────────
function showHatchProgress() {
  document.getElementById('creatorProgressOverlay').classList.add('active');
  document.getElementById('creatorCardFooter').style.display = 'none';
}

function closeHatchProgress() {
  document.getElementById('creatorProgressOverlay').classList.remove('active');
}

function updateGuidedBackstoryDepth(value) {
  const level = Math.max(1, Math.min(5, parseInt(value, 10) || 3));
  const labels = {
    1: { name: 'Light', memories: '8-12', tokens: '~1,600' },
    2: { name: 'Moderate', memories: '12-18', tokens: '~1,900' },
    3: { name: 'Balanced', memories: '18-26', tokens: '~2,200' },
    4: { name: 'Deep', memories: '24-34', tokens: '~2,700' },
    5: { name: 'Epic', memories: '30-44', tokens: '~3,200' }
  };

  const meta = labels[level] || labels[3];
  const labelEl = document.getElementById('guidedBackstoryDepthLabel');
  const tokenEl = document.getElementById('guidedBackstoryTokenEstimate');
  if (labelEl) labelEl.textContent = meta.name + ' (level ' + level + ') • target: ' + meta.memories + ' core memories';
  if (tokenEl) tokenEl.textContent = meta.tokens;
}

function updateRandomBackstoryDepth(value) {
  const level = Math.max(1, Math.min(5, parseInt(value, 10) || 3));
  const labelEl = document.getElementById('randomBackstoryDepthLabel');
  const tokenEl = document.getElementById('randomBackstoryTokenEstimate');
  const guidedLabel = document.getElementById('guidedBackstoryDepthLabel');
  const guidedToken = document.getElementById('guidedBackstoryTokenEstimate');
  if (guidedLabel && guidedToken) {
    updateGuidedBackstoryDepth(level);
    if (labelEl) labelEl.textContent = guidedLabel.textContent;
    if (tokenEl) tokenEl.textContent = guidedToken.textContent;
    return;
  }
}

function updateHatchStep(stepIndex, status) {
  const container = document.getElementById('hatchProgressSteps');
  const steps = container.querySelectorAll('.hatch-step');
  if (!steps[stepIndex]) return;
  steps[stepIndex].classList.remove('pending', 'active', 'complete');
  steps[stepIndex].classList.add(status);
  const icon = steps[stepIndex].querySelector('.hatch-step-icon');
  if (icon) icon.textContent = status === 'complete' ? '✓' : '⏳';
}

// ── Onboarding payload ───────────────────────────────────────
function getCreatorOnboardingPayload() {
  const preferredName = document.getElementById('creatorOnboardName').value.trim();
  const interests     = document.getElementById('creatorOnboardInterests').value.trim();
  const occupation    = document.getElementById('creatorOnboardOccupation').value.trim();
  const intent        = document.getElementById('creatorOnboardIntent').value.trim();
  return {
    preferredName,
    interests,
    occupation,
    intent,
    hasSeedInput: Boolean(preferredName || interests || occupation || intent)
  };
}

async function applyCreatorOnboarding(entityId) {
  if (!creatorOnboardingPayload || !creatorOnboardingPayload.hasSeedInput) return;
  try {
    await fetch('/api/entities/onboarding-seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId,
        preferredName: creatorOnboardingPayload.preferredName || '',
        interests:     creatorOnboardingPayload.interests     || '',
        occupation:    creatorOnboardingPayload.occupation    || '',
        intent:        creatorOnboardingPayload.intent        || ''
      })
    });
  } catch (err) {
    console.warn('[creator] onboarding seed failed:', err.message);
  }
}

// ── Success screen ───────────────────────────────────────────
function showSuccessScreen(entity, note, entityId) {
  // Hide all form steps
  ['creatorWelcomeStep', 'entityCreationModeStep', 'entityEmptyFormStep',
   'entityRandomFormStep', 'entityGuidedFormStep', 'entityCharacterFormStep',
   'creatorOnboardingBlock'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.getElementById('creatorSuccessName').textContent = entity.name + ' — Created!';
  document.getElementById('creatorSuccessTraits').textContent =
    (entity.personality_traits || []).join(', ');
  document.getElementById('creatorSuccessNote').textContent = note || 'Your entity is ready.';
  document.getElementById('creatorSuccessScreen').style.display = 'block';
  document.getElementById('creatorCardFooter').style.display = 'none';

  const primaryBtn = document.getElementById('creatorPrimarySuccessBtn');
  if (IS_EMBED && primaryBtn) {
    primaryBtn.textContent = 'Back to Entity →';
  }

  if (IS_EMBED) {
    lastCreatedEntityId = entityId || entity.id || null;
    lg('ok', entity.name + ' created successfully! Opening entity details…');
    setTimeout(() => { syncParentAfterCreate(); }, 900);
  } else {
    lg('ok', entity.name + ' created successfully! Redirecting…');
    // Auto-redirect after 3 seconds
    setTimeout(() => { goToMain(); }, 3000);
  }
}

// ── Document chunker (inline, shared with document-digest) ───
function chunkDocument(text, filename) {
  const MAX_CHUNK_CHARS = 6000;
  const MIN_CHUNK_CHARS = 200;

  text = text.replace(/\r\n/g, '\n');
  let sections = text.split(/\n\n+/);
  if (sections.length === 1 && text.length > MAX_CHUNK_CHARS) {
    sections = text.split(/\n/);
  }

  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const section of sections) {
    const s = section.trim();
    if (!s) continue;
    if (currentChunk && (currentChunk.length + s.length + 2) > MAX_CHUNK_CHARS) {
      if (currentChunk.length >= MIN_CHUNK_CHARS) {
        chunks.push({ index: chunkIndex++, content: currentChunk.trim(), filename, totalChunks: -1 });
        currentChunk = '';
      }
    }
    currentChunk = currentChunk ? currentChunk + '\n\n' + s : s;
    if (currentChunk.length > MAX_CHUNK_CHARS * 1.5) {
      const sentences = currentChunk.match(/[^.!?]+[.!?]+/g) || [currentChunk];
      currentChunk = '';
      let buffer = '';
      for (const sentence of sentences) {
        if (buffer && (buffer.length + sentence.length) > MAX_CHUNK_CHARS) {
          chunks.push({ index: chunkIndex++, content: buffer.trim(), filename, totalChunks: -1 });
          buffer = sentence;
        } else {
          buffer += sentence;
        }
      }
      currentChunk = buffer;
    }
  }
  if (currentChunk.trim().length >= MIN_CHUNK_CHARS) {
    chunks.push({ index: chunkIndex++, content: currentChunk.trim(), filename, totalChunks: -1 });
  }
  chunks.forEach(c => { c.totalChunks = chunks.length; });
  return chunks;
}

// ── Main dispatcher ──────────────────────────────────────────
async function executeEntityCreation() {
  if (!entityCreationMode) {
    lg('err', 'No creation mode selected.');
    return;
  }
  creatorOnboardingPayload = getCreatorOnboardingPayload();

  document.getElementById('createEntityBtn').disabled = true;

  try {
    switch (entityCreationMode) {
      case 'empty':     await createEmptyEntity();     break;
      case 'random':    await createRandomEntity();    break;
      case 'guided':    await createGuidedEntity();    break;
      case 'character': await createCharacterEntity(); break;
    }
  } catch (err) {
    lg('err', 'Creation failed: ' + err.message);
    closeHatchProgress();
    document.getElementById('createEntityBtn').disabled = false;
    document.getElementById('creatorCardFooter').style.display = 'flex';
  }
}

// ── Empty entity ─────────────────────────────────────────────
async function createEmptyEntity() {
  const name      = document.getElementById('emptyEntityName').value.trim();
  const gender    = document.getElementById('emptyEntityGender').value;
  const age       = document.getElementById('emptyEntityAge').value.trim();
  const entityMode = document.getElementById('emptyEntityMode')?.value || 'full';
  const traitsStr = document.getElementById('emptyEntityTraits').value.trim();
  const intro     = document.getElementById('emptyEntityIntro').value.trim();
  const isSingleLlm = entityMode === 'single-llm';

  if (!name)       { lg('err', 'Entity name is required.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (isReservedEntityName(name)) { lg('err', 'That name is reserved by NekoCore. Please choose another entity name.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (!isSingleLlm && !traitsStr)  { lg('err', 'At least 3 personality traits are required.'); document.getElementById('createEntityBtn').disabled = false; return; }

  const traits = traitsStr.split(',').map(t => t.trim()).filter(Boolean);
  if (!isSingleLlm && traits.length < 3) { lg('err', 'Please provide at least 3 personality traits.'); document.getElementById('createEntityBtn').disabled = false; return; }

  lg('info', 'Creating ' + name + '…');

  const entityId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const resp = await fetch('/api/entities/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityId, name, gender, traits, introduction: intro || 'Hello, I\'m ' + name + '.', age, entityMode })
  });

  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || 'Server returned ' + resp.status);
  }

  const data = await resp.json();
  await applyCreatorOnboarding(data.entityId);
  showSuccessScreen(data.entity, 'Empty entity ready — memories form through conversation.', data.entityId);
}

// ── Random entity ─────────────────────────────────────────────
async function createRandomEntity() {
  const gender = document.getElementById('randomEntityGender').value;
  const backstoryDepth = Math.max(1, Math.min(5, parseInt(document.getElementById('randomBackstoryDepth')?.value || '3', 10) || 3));

  lg('info', 'Generating random entity…');
  showHatchProgress();
  updateHatchStep(0, 'active');
  await sleep(200);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  const resp = await fetch('/api/entities/create-hatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gender: gender === 'random' ? undefined : gender, backstoryDepth }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || 'Server returned ' + resp.status);
  }

  [0, 1, 2, 3].forEach(i => updateHatchStep(i, 'complete'));
  updateHatchStep(4, 'active');

  const data = await resp.json();
  updateHatchStep(4, 'complete');

  closeHatchProgress();
  await applyCreatorOnboarding(data.entityId);
  showSuccessScreen(data.entity, 'Random entity hatched with life story and core memories!', data.entityId);
}

// ── Character ingestion ───────────────────────────────────────
async function createCharacterEntity() {
  const name   = document.getElementById('charEntityName').value.trim();
  const source = document.getElementById('charEntitySource').value.trim();
  const notes  = document.getElementById('charEntityNotes').value.trim();

  if (!name)   { lg('err', 'Character name is required.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (isReservedEntityName(name)) { lg('err', 'That name is reserved by NekoCore. Please choose another entity name.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (!source) { lg('err', 'Source / origin is required.'); document.getElementById('createEntityBtn').disabled = false; return; }

  lg('info', 'Running character ingestion for ' + name + '…');
  showHatchProgress();
  updateHatchStep(0, 'active');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  const resp = await fetch('/api/entities/create-character', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, source, notes }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || 'Server returned ' + resp.status);
  }

  [0, 1, 2, 3].forEach(i => updateHatchStep(i, 'complete'));
  updateHatchStep(4, 'active');

  const data = await resp.json();
  updateHatchStep(4, 'complete');

  closeHatchProgress();
  await applyCreatorOnboarding(data.entityId);
  showSuccessScreen(data.entity, 'Character ingested with ' + (data.entity.memory_count || 0) + ' seeded memories!', data.entityId);
}

// ── Guided entity ─────────────────────────────────────────────
async function createGuidedEntity() {
  const name             = document.getElementById('guidedEntityName').value.trim();
  const gender           = document.getElementById('guidedEntityGender').value;
  const age              = document.getElementById('guidedEntityAge').value.trim();
  const traitsStr        = document.getElementById('guidedEntityTraits').value.trim();
  const backstory        = document.getElementById('guidedEntityBackstory').value.trim();
  const intent           = document.getElementById('guidedEntityIntent').value;
  const interactionStyle = document.getElementById('guidedEntityInteractionStyle').value;
  const style            = document.getElementById('guidedEntityStyle').value.trim();
  const knowledgeSeed    = document.getElementById('guidedEntityKnowledgeSeed').value.trim();
  const intro            = document.getElementById('guidedEntityIntro').value.trim();
  const unbreakable      = document.getElementById('guidedEntityUnbreakable').checked;
  const backstoryDepth   = Math.max(1, Math.min(5, parseInt(document.getElementById('guidedBackstoryDepth')?.value || '3', 10) || 3));

  if (!name)       { lg('err', 'Entity name is required.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (isReservedEntityName(name)) { lg('err', 'That name is reserved by NekoCore. Please choose another entity name.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (!traitsStr)  { lg('err', 'At least 3 personality traits are required.'); document.getElementById('createEntityBtn').disabled = false; return; }
  if (!backstory && !knowledgeSeed) {
    lg('err', 'Provide either a backstory or knowledge seed notes for guided creation.');
    document.getElementById('createEntityBtn').disabled = false;
    return;
  }

  const traits = traitsStr.split(',').map(t => t.trim()).filter(Boolean);
  if (traits.length < 3) { lg('err', 'Please provide at least 3 personality traits.'); document.getElementById('createEntityBtn').disabled = false; return; }

  lg('info', 'Generating guided entity: ' + name + '…');
  showHatchProgress();
  updateHatchStep(0, 'active');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  const resp = await fetch('/api/entities/create-guided', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, gender, age, traits, backstory, backstoryDepth, intent, interactionStyle, style, knowledgeSeed, introduction: intro, unbreakable }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || 'Server returned ' + resp.status);
  }

  [0, 1, 2, 3].forEach(i => updateHatchStep(i, 'complete'));
  updateHatchStep(4, 'active');

  const data = await resp.json();
  updateHatchStep(4, 'complete');

  // ── Knowledge seed ingestion ────────────────────────────────
  let seedChunkCount = 0;
  if (knowledgeSeed && data.hasSeed) {
    try {
      const seedChunks = chunkDocument(knowledgeSeed, name + ' - Knowledge Seed');
      if (seedChunks.length > 0) {
        const seedStep = document.getElementById('hatchStepSeed');
        if (seedStep) seedStep.style.display = '';
        updateHatchStep(5, 'active');
        let prevChunkId = null;
        for (let i = 0; i < seedChunks.length; i++) {
          try {
            const seedResp = await fetch('/api/document/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: seedChunks[i].content,
                filename: seedChunks[i].filename,
                chunkIndex: seedChunks[i].index,
                totalChunks: seedChunks[i].totalChunks,
                previousChunkId: prevChunkId
              })
            });
            if (seedResp.ok) {
              const sd = await seedResp.json();
              prevChunkId = sd.chunkId || null;
              seedChunkCount++;
            }
          } catch (_) { /* individual chunk failure is non-fatal */ }
          await sleep(80);
        }
        updateHatchStep(5, 'complete');
      }
    } catch (seedErr) {
      console.warn('[creator] knowledge seed ingestion partial/failed:', seedErr.message);
    }
  }

  closeHatchProgress();
  await applyCreatorOnboarding(data.entityId);
  const note = 'Guided entity created with ' + (data.entity.memory_count || 0) + ' core memories'
    + (seedChunkCount > 0 ? ' + ' + seedChunkCount + ' knowledge chunks.' : '.');
  showSuccessScreen(data.entity, note, data.entityId);
}

// ── Tiny sleep helper ─────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Check for ?mode= param on load ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.resetCreatorFlow = resetCreatorFlow;
  initTraitAssist();
  updateEmptyEntityModeForm();
  updateGuidedBackstoryDepth(document.getElementById('guidedBackstoryDepth')?.value || '3');
  updateRandomBackstoryDepth(document.getElementById('randomBackstoryDepth')?.value || '3');
  const mode = PAGE_PARAMS.get('mode');

  if (IS_EMBED) {
    if (document.body) document.body.classList.add('embed-mode');
    const topbar = document.getElementById('creatorTopbar');
    if (topbar) topbar.style.display = 'none';
    const shell = document.querySelector('.creator-shell');
    if (shell) shell.style.minHeight = '100%';
    const main = document.querySelector('.creator-main');
    if (main) main.style.padding = 'var(--space-3)';
  }

  if (mode) {
    // skip the welcome step and jump straight into the requested mode
    document.getElementById('creatorWelcomeStep').style.display = 'none';
    document.getElementById('entityCreationModeStep').style.display = 'none';
    selectEntityMode(mode);
  }
});
