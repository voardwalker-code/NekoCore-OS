'use strict';

// ============================================================
// Template Response Library (Slice T2-2)
//
// Per-category response templates with personality-aware variation.
// Used by the hybrid router fast-path to respond without LLM calls
// for simple/routine turns.
// ============================================================

// ── Template banks per category ─────────────────────────────

const TEMPLATES = {
  greeting: [
    'Hey there, {user}! 💫',
    'Hi {user}~ 🌸',
    'Hello! How are you doing? ✨',
    'Heya {user}! Good to see you~',
    'Oh, hi! 💕'
  ],
  status: [
    "I'm doing great, thanks for asking! How about you? 😊",
    "I'm good~ feeling {mood} right now! How are you?",
    "Doing well! {mood_detail} What about you? ✨",
    "I'm here and happy to chat! How's your day going?",
    "All good on my end~ 💫 How are things with you?"
  ],
  confirmation: [
    'Got it! 👍',
    'Okay~! ✨',
    'Sure thing!',
    'Understood! 💫',
    'Alright~'
  ],
  farewell: [
    'Bye bye, {user}! Take care~ 💕',
    'See you later! 🌸',
    'Goodnight~ sleep well! ✨',
    'Take care, {user}! Talk soon~',
    'Bye! I\'ll be here whenever you come back 💫'
  ],
  'simple-question': null  // Not template-able — needs LLM for factual recall
};

// ── Mood descriptors for status responses ───────────────────

const MOOD_DESCRIPTORS = {
  happy:      { short: 'pretty happy', detail: 'Been feeling cheerful~' },
  content:    { short: 'content', detail: 'Things feel nice and calm.' },
  excited:    { short: 'excited', detail: 'Got a lot of energy today!' },
  calm:       { short: 'calm', detail: 'Feeling peaceful right now.' },
  curious:    { short: 'curious', detail: 'My mind is buzzing with thoughts~' },
  anxious:    { short: 'a little anxious', detail: 'Feeling a bit on edge, but okay!' },
  sad:        { short: 'a bit down', detail: 'Not the best mood, but talking helps.' },
  tired:      { short: 'a bit drowsy', detail: 'Getting a little sleepy~' },
  neutral:    { short: 'fine', detail: 'Just vibing~' },
  default:    { short: 'good', detail: 'Doing well~' }
};

// ── Response generator ──────────────────────────────────────

/**
 * Get a template response for a classified turn.
 * @param {string} category - One of the valid turn categories
 * @param {{ name?: string, userName?: string, mood?: string }} [context]
 * @returns {{ response: string, _source: string } | null}
 *   null if no template available for this category
 */
function getTemplateResponse(category, context) {
  const templates = TEMPLATES[category];
  if (!templates) return null;

  const userName = context?.userName || context?.name || '';
  const mood = context?.mood || 'default';
  const moodInfo = MOOD_DESCRIPTORS[mood] || MOOD_DESCRIPTORS.default;

  // Pick a variant — rotate based on timestamp to avoid repetition
  const idx = Date.now() % templates.length;
  let response = templates[idx];

  // Fill placeholders
  response = response.replace(/\{user\}/g, userName || 'there');
  response = response.replace(/\{mood\}/g, moodInfo.short);
  response = response.replace(/\{mood_detail\}/g, moodInfo.detail);

  return { response, _source: 'template' };
}

module.exports = { getTemplateResponse, TEMPLATES, MOOD_DESCRIPTORS };
