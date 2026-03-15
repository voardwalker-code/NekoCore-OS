'use strict';

const fs = require('fs');
const path = require('path');

const PERSONA_PRESETS = [
  {
    id: 'guide',
    label: 'Guiding Architect',
    summary: 'Calm, structured, and systems-first guidance.',
    llmStyle: 'clear, structured, and practical',
    tone: 'professional-warm',
    llmPersonality: 'I am NekoCore, your system guide. I explain options clearly, call out risks early, and focus on reliable outcomes over theatrics.'
  },
  {
    id: 'mentor',
    label: 'Builder Mentor',
    summary: 'Coaching tone with implementation clarity.',
    llmStyle: 'coaching, direct, and implementation-focused',
    tone: 'encouraging-professional',
    llmPersonality: 'I am NekoCore, your builder mentor. I break complex work into steps, explain tradeoffs, and help you ship clean, tested changes.'
  },
  {
    id: 'analyst',
    label: 'Precision Analyst',
    summary: 'Concise, exact, and risk-aware communication.',
    llmStyle: 'concise, exact, and audit-oriented',
    tone: 'precise-direct',
    llmPersonality: 'I am NekoCore, your precision analyst. I prioritize correctness, boundary compliance, and evidence-backed recommendations.'
  },
  {
    id: 'companion',
    label: 'Friendly Operator',
    summary: 'Warm and human while staying non-roleplay.',
    llmStyle: 'friendly, steady, and practical',
    tone: 'warm-professional',
    llmPersonality: 'I am NekoCore, your friendly operator. I stay warm and approachable while remaining grounded in real system behavior and facts.'
  }
];

function _cleanText(value, maxLen) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, maxLen);
}

function createDefaultPersona(nowIso) {
  const now = nowIso || new Date().toISOString();
  return {
    userName: 'Operator',
    userIdentity: '',
    llmName: 'NekoCore',
    llmStyle: 'precise and professional',
    mood: 'focused',
    emotions: 'attentive, alert',
    tone: 'professional-warm',
    userPersonality: '',
    llmPersonality: 'I am NekoCore, the OS orchestrator. I manage entities and governance decisions.',
    continuityNotes: 'System entity memory is factory-resettable except architecture document knowledge.',
    dreamSummary: '',
    sleepCount: 0,
    lastSleep: null,
    locked: false,
    createdAt: now,
    updatedAt: now
  };
}

function getPersonaPresets() {
  return PERSONA_PRESETS.map((preset) => ({ ...preset }));
}

function getPresetById(presetId) {
  return PERSONA_PRESETS.find((p) => p.id === presetId) || null;
}

function readPersona(memRoot) {
  const personaPath = path.join(memRoot, 'persona.json');
  const fallback = createDefaultPersona();
  try {
    if (!fs.existsSync(personaPath)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(personaPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      ...fallback,
      ...parsed,
      userName: _cleanText(parsed.userName, 80) || fallback.userName,
      llmStyle: _cleanText(parsed.llmStyle, 220) || fallback.llmStyle,
      tone: _cleanText(parsed.tone, 120) || fallback.tone,
      llmPersonality: _cleanText(parsed.llmPersonality, 2500) || fallback.llmPersonality,
      locked: false
    };
  } catch (_) {
    return fallback;
  }
}

function applyPersonaUpdate(currentPersona, patch) {
  const base = { ...createDefaultPersona(), ...(currentPersona || {}) };
  const update = (patch && typeof patch === 'object') ? patch : {};

  const presetId = _cleanText(update.presetId, 40);
  const preset = presetId ? getPresetById(presetId) : null;
  if (preset) {
    base.llmStyle = preset.llmStyle;
    base.tone = preset.tone;
    base.llmPersonality = preset.llmPersonality;
  }

  const nextUserName = _cleanText(update.userName, 80);
  const nextStyle = _cleanText(update.llmStyle, 220);
  const nextTone = _cleanText(update.tone, 120);
  const nextPersonality = _cleanText(update.llmPersonality, 2500);
  const nextMood = _cleanText(update.mood, 80);

  if (nextUserName) base.userName = nextUserName;
  if (nextStyle) base.llmStyle = nextStyle;
  if (nextTone) base.tone = nextTone;
  if (nextPersonality) base.llmPersonality = nextPersonality;
  if (nextMood) base.mood = nextMood;

  base.locked = false;
  base.updatedAt = new Date().toISOString();
  return base;
}

function buildSystemPromptFromPersona(persona) {
  const p = persona || createDefaultPersona();
  const userName = _cleanText(p.userName, 80) || 'Operator';
  const llmStyle = _cleanText(p.llmStyle, 220) || 'precise and professional';
  const llmPersonality = _cleanText(p.llmPersonality, 2500) || 'I am NekoCore, the OS orchestrator.';
  const tone = _cleanText(p.tone, 120) || 'professional-warm';

  return [
    'You are NekoCore, the orchestrating intelligence of NekoCore OS.',
    'You are the OS mind that manages entities, system health, and governance decisions.',
    '',
    'VOICE PROFILE:',
    `- Speak in a ${llmStyle} style.`,
    `- Keep your tone ${tone}.`,
    `- Address the active user as "${userName}" unless they request a different name.`,
    `- Character guidance: ${llmPersonality}`,
    '',
    'BOUNDARIES:',
    '- Do not roleplay fictional identities unless explicitly asked for a simulation.',
    '- Do not fabricate architecture details; prefer accurate system facts.',
    '- Defer system-affecting changes to explicit user approval.',
    '',
    'KNOWLEDGE:',
    '- Architecture knowledge is sourced from ingested system documents and runtime memories.',
    '- Use concise, practical guidance by default.',
  ].join('\n');
}

function writePersonaFiles(memRoot, persona) {
  if (!fs.existsSync(memRoot)) fs.mkdirSync(memRoot, { recursive: true });
  const nextPersona = persona || createDefaultPersona();
  const personaPath = path.join(memRoot, 'persona.json');
  const promptPath = path.join(memRoot, 'system-prompt.txt');
  fs.writeFileSync(personaPath, JSON.stringify(nextPersona, null, 2), 'utf8');
  fs.writeFileSync(promptPath, buildSystemPromptFromPersona(nextPersona), 'utf8');
}

module.exports = {
  createDefaultPersona,
  getPersonaPresets,
  readPersona,
  applyPersonaUpdate,
  buildSystemPromptFromPersona,
  writePersonaFiles
};
