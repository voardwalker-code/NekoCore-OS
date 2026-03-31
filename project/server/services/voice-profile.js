// ── Services · Voice Profile ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// Exposed API includes: generateVoiceFromTraits, getDefaultVoice, DEFAULTS.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Voice Profile Service
// Generates per-entity typing voice profiles from personality traits.
// Controls: typing speed, error rates, filler phrases, brb phrases, rhythm.
// Used by the client humanizer to make each entity type uniquely.
// ============================================================

const DEFAULTS = {
  typingSpeed: { min: 17, max: 24 },
  rhythm: {
    punctuationPause: [35, 90],
    sentenceEndPause: [90, 180],
    newlinePause: [110, 210],
    burstChance: 0.05
  },
  errors: {
    typo: 0.012,
    transpose: 0.025,
    missedSpace: 0.028,
    doubleLetter: 0.03,
    wordCorrection: 0.03,
    doubleCorrection: 0.32
  },
  fillers: {
    chance: 0.05,
    phrases: [' um.. ']
  },
  brb: {
    chance: 0.035,
    phrases: ['Hold on brrb. ', 'just a sec... '],
    returnPhrase: 'Sorry, '
  }
};

// ── Trait keyword → voice modifier map ──────────────────────
// Each entry: { speed, errors, fillers, brb, rhythm }
// speed: [minDelta, maxDelta]
// errors: multiplier applied to all error rates
// fillers: { chanceDelta, phrases (override if provided) }
// brb: { chanceDelta, phrases, returnPhrase (override if provided) }
const TRAIT_MODIFIERS = {
  // Precise / analytical types — fast, clean, rare mistakes
  precise:    { speed: [2, 4], errors: 0.3, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.03 } },
  analytical: { speed: [2, 3], errors: 0.35, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.025 } },
  methodical: { speed: [1, 3], errors: 0.3, fillers: { chanceDelta: -0.03, phrases: [] }, brb: { chanceDelta: -0.02 } },
  focused:    { speed: [2, 3], errors: 0.4, fillers: { chanceDelta: -0.03 }, brb: { chanceDelta: -0.02 } },
  organized:  { speed: [1, 2], errors: 0.4, fillers: { chanceDelta: -0.03 }, brb: { chanceDelta: -0.02 } },
  logical:    { speed: [2, 3], errors: 0.35, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.025 } },
  meticulous: { speed: [1, 2], errors: 0.25, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.03 } },

  // Confident / bold types — fast, few errors, no hesitation
  confident:  { speed: [3, 4], errors: 0.4, fillers: { chanceDelta: -0.04 }, brb: { chanceDelta: -0.02, phrases: ['sec. '], returnPhrase: 'Ok, ' } },
  bold:       { speed: [3, 5], errors: 0.45, fillers: { chanceDelta: -0.04 }, brb: { chanceDelta: -0.02, phrases: ['sec '], returnPhrase: 'Anyway, ' } },
  assertive:  { speed: [3, 4], errors: 0.4, fillers: { chanceDelta: -0.04 }, brb: { chanceDelta: -0.025, phrases: ['one sec. '], returnPhrase: 'Right, ' } },
  direct:     { speed: [3, 5], errors: 0.35, fillers: { chanceDelta: -0.045, phrases: [] }, brb: { chanceDelta: -0.03, phrases: ['sec. '], returnPhrase: '' } },
  determined: { speed: [2, 4], errors: 0.45, fillers: { chanceDelta: -0.03 }, brb: { chanceDelta: -0.02 } },

  // Casual / relaxed types — chill pace, some fillers, informal brbs
  casual:     { speed: [-2, -2], errors: 1.1, fillers: { chanceDelta: 0.03, phrases: [' umm ', ' hmm '] }, brb: { chanceDelta: 0.02, phrases: ['brb real quick ', 'one sec lol '], returnPhrase: 'ok so ' } },
  relaxed:    { speed: [-3, -3], errors: 1.0, fillers: { chanceDelta: 0.02, phrases: [' hmm.. ', ' eh '] }, brb: { chanceDelta: 0.02, phrases: ['gimme a sec ', 'hold on '], returnPhrase: 'alright ' } },
  easygoing:  { speed: [-2, -2], errors: 1.1, fillers: { chanceDelta: 0.03, phrases: [' uhhh ', ' hmm '] }, brb: { chanceDelta: 0.02, phrases: ['one sec ', 'hold up '], returnPhrase: 'ok where was I.. ' } },
  chill:      { speed: [-3, -4], errors: 1.0, fillers: { chanceDelta: 0.02, phrases: [' mm ', ' hmm '] }, brb: { chanceDelta: 0.015, phrases: ['sec ', 'hold on.. '], returnPhrase: 'right so ' } },
  laidback:   { speed: [-3, -3], errors: 1.05, fillers: { chanceDelta: 0.025, phrases: [' hm ', ' ehh '] }, brb: { chanceDelta: 0.02 } },

  // Shy / nervous types — slower, more mistakes, many hesitant fillers
  shy:        { speed: [-5, -6], errors: 1.6, fillers: { chanceDelta: 0.06, phrases: [' um.. ', ' uhh.. ', ' erm.. '] }, brb: { chanceDelta: 0.03, phrases: ['s-sorry, one sec.. ', 'hold on.. '], returnPhrase: 'sorry.. ' } },
  nervous:    { speed: [-4, -5], errors: 1.7, fillers: { chanceDelta: 0.07, phrases: [' uh ', ' um ', ' ahh.. '] }, brb: { chanceDelta: 0.035, phrases: ['w-wait one sec ', 'sorry hold on.. '], returnPhrase: 'ok um ' } },
  anxious:    { speed: [-3, -5], errors: 1.8, fillers: { chanceDelta: 0.08, phrases: [' um.. ', ' uh.. ', ' ah '] }, brb: { chanceDelta: 0.04, phrases: ['sorry just a moment.. ', 'one sec sorry '], returnPhrase: 'sorry about that.. ' } },
  timid:      { speed: [-5, -7], errors: 1.5, fillers: { chanceDelta: 0.06, phrases: [' um.. ', ' mm.. '] }, brb: { chanceDelta: 0.03, phrases: ['give me a sec.. ', 'hold on.. '], returnPhrase: 's-sorry, ' } },
  reserved:   { speed: [-3, -4], errors: 1.2, fillers: { chanceDelta: 0.03, phrases: [' .. ', ' hm '] }, brb: { chanceDelta: 0.01, phrases: ['one moment. '], returnPhrase: '' } },
  introverted:{ speed: [-4, -5], errors: 1.3, fillers: { chanceDelta: 0.04, phrases: [' mm.. ', ' .. '] }, brb: { chanceDelta: 0.02, phrases: ['one sec.. '], returnPhrase: 'ok.. ' } },

  // Chaotic / energetic types — very fast, lots of errors, excitable
  chaotic:    { speed: [5, 8], errors: 2.2, fillers: { chanceDelta: 0.03, phrases: [' WAIT ', ' oh '] }, brb: { chanceDelta: 0.04, phrases: ['BRB ', 'HOLD ON '], returnPhrase: 'OK SO ' } },
  wild:       { speed: [5, 7], errors: 2.0, fillers: { chanceDelta: 0.04, phrases: [' ooh ', ' AH '] }, brb: { chanceDelta: 0.04, phrases: ['brb!! ', 'WAIT '], returnPhrase: 'OKAY ' } },
  energetic:  { speed: [4, 6], errors: 1.8, fillers: { chanceDelta: 0.02, phrases: [' oh! ', ' wait '] }, brb: { chanceDelta: 0.03, phrases: ['brb! ', 'one sec! '], returnPhrase: 'okay! ' } },
  impulsive:  { speed: [4, 6], errors: 2.0, fillers: { chanceDelta: 0.03, phrases: [' wait ', ' oh '] }, brb: { chanceDelta: 0.04, phrases: ['hold on!! ', 'brb '], returnPhrase: 'ok ok ' } },
  hyperactive:{ speed: [5, 8], errors: 2.1, fillers: { chanceDelta: 0.02, phrases: [' !! ', ' OH '] }, brb: { chanceDelta: 0.04, phrases: ['BRB!! ', 'WAIT WAIT '], returnPhrase: 'OK OK OK ' } },
  excitable:  { speed: [3, 5], errors: 1.6, fillers: { chanceDelta: 0.03, phrases: [' ooh! ', ' oh! '] }, brb: { chanceDelta: 0.03, phrases: ['ooh brb! ', 'one sec! '], returnPhrase: 'ok so! ' } },

  // Playful / creative types — moderate-fast, moderate errors, fun fillers
  playful:    { speed: [1, 3], errors: 1.3, fillers: { chanceDelta: 0.03, phrases: [' hmm~ ', ' ooh '] }, brb: { chanceDelta: 0.02, phrases: ['brb~ ', 'one sec hehe '], returnPhrase: 'okie so ' } },
  mischievous:{ speed: [2, 3], errors: 1.4, fillers: { chanceDelta: 0.03, phrases: [' hehe ', ' ooh~ '] }, brb: { chanceDelta: 0.02, phrases: ['brb heh ', 'wait wait '], returnPhrase: 'sooo ' } },
  creative:   { speed: [0, 2], errors: 1.2, fillers: { chanceDelta: 0.02, phrases: [' hmm ', ' oh '] }, brb: { chanceDelta: 0.01, phrases: ['hold that thought.. ', 'one sec '], returnPhrase: 'right so ' } },
  witty:      { speed: [2, 3], errors: 1.1, fillers: { chanceDelta: 0.01, phrases: [' well ', ' so '] }, brb: { chanceDelta: 0.01, phrases: ['moment. ', 'one tick. '], returnPhrase: 'anyway, ' } },
  curious:    { speed: [1, 2], errors: 1.1, fillers: { chanceDelta: 0.02, phrases: [' ooh ', ' hmm '] }, brb: { chanceDelta: 0.01, phrases: ['hang on.. ', 'one sec '], returnPhrase: 'so ' } },
  quirky:     { speed: [1, 3], errors: 1.3, fillers: { chanceDelta: 0.03, phrases: [' hm~ ', ' ooh~ '] }, brb: { chanceDelta: 0.02, phrases: ['brb~ ', 'sec~ '], returnPhrase: 'sooo~ ' } },

  // Warm / gentle types — moderate-slow, few errors, soft fillers
  warm:       { speed: [-1, -1], errors: 0.8, fillers: { chanceDelta: 0.01, phrases: [' hmm.. '] }, brb: { chanceDelta: 0.01, phrases: ['one moment~ ', 'just a moment '], returnPhrase: 'sorry about that ' } },
  kind:       { speed: [-1, -2], errors: 0.7, fillers: { chanceDelta: 0.01, phrases: [' hmm '] }, brb: { chanceDelta: 0.01, phrases: ['one moment please '], returnPhrase: 'sorry, ' } },
  gentle:     { speed: [-2, -3], errors: 0.7, fillers: { chanceDelta: 0.01, phrases: [' mm.. '] }, brb: { chanceDelta: 0.01, phrases: ['just a moment.. '], returnPhrase: 'sorry.. ' } },
  caring:     { speed: [-1, -2], errors: 0.75, fillers: { chanceDelta: 0.01, phrases: [' hmm.. '] }, brb: { chanceDelta: 0.01, phrases: ['one sec, sorry '], returnPhrase: 'ok so ' } },
  empathetic: { speed: [-2, -2], errors: 0.8, fillers: { chanceDelta: 0.02, phrases: [' .. ', ' hmm '] }, brb: { chanceDelta: 0.01, phrases: ['give me a moment '], returnPhrase: 'alright, ' } },
  patient:    { speed: [-3, -4], errors: 0.6, fillers: { chanceDelta: 0.01, phrases: [' hm '] }, brb: { chanceDelta: 0.005, phrases: ['one moment. '], returnPhrase: '' } },

  // Formal / professional types — clean, fast, no fillers
  formal:     { speed: [2, 3], errors: 0.3, fillers: { chanceDelta: -0.045, phrases: [] }, brb: { chanceDelta: -0.03, phrases: ['One moment. '], returnPhrase: 'Apologies, ' } },
  professional:{ speed: [2, 3], errors: 0.35, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.025, phrases: ['One moment please. '], returnPhrase: 'Apologies, ' } },
  eloquent:   { speed: [1, 2], errors: 0.3, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.03, phrases: ['A moment, if you will. '], returnPhrase: 'Now then, ' } },
  sophisticated:{ speed: [1, 2], errors: 0.3, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.03, phrases: ['One moment. '], returnPhrase: 'Now, ' } },

  // Sarcastic / edgy types — fast, moderate errors, dry fillers
  sarcastic:  { speed: [2, 3], errors: 1.1, fillers: { chanceDelta: 0.01, phrases: [' wow ', ' lol '] }, brb: { chanceDelta: 0.01, phrases: ['hold on ig ', 'sec '], returnPhrase: 'anyway ' } },
  edgy:       { speed: [3, 4], errors: 1.2, fillers: { chanceDelta: 0.01, phrases: [' whatever ', ' idk '] }, brb: { chanceDelta: 0.01, phrases: ['brb. ', 'sec. '], returnPhrase: 'whatever, ' } },
  blunt:      { speed: [3, 4], errors: 0.5, fillers: { chanceDelta: -0.04, phrases: [] }, brb: { chanceDelta: -0.02, phrases: ['sec. '], returnPhrase: '' } },
  stoic:      { speed: [1, 2], errors: 0.4, fillers: { chanceDelta: -0.045, phrases: [] }, brb: { chanceDelta: -0.03, phrases: ['...'], returnPhrase: '' } }
};
// clamp()
// WHAT THIS DOES: clamp is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call clamp(...) where this helper behavior is needed.
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function generateVoiceFromTraits(traits, gender) {
  // traitList()
  // Purpose: helper wrapper used by this module's main flow.
  // traitList()
  // WHAT THIS DOES: traitList is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call traitList(...) where this helper behavior is needed.
  const traitList = (Array.isArray(traits) ? traits : [])
    .map(t => String(t || '').toLowerCase().trim())
    .filter(Boolean);

  // Start from defaults
  let speedMinD = 0, speedMaxD = 0;
  let errorMul = 1.0;
  let fillerChanceD = 0;
  let brbChanceD = 0;
  let matchCount = 0;

  // Collect phrase overrides from the strongest matching traits
  let fillerPhrases = null;
  let brbPhrases = null;
  let brbReturn = null;

  for (const trait of traitList) {
    // Check each word in multi-word traits (e.g. "analytically precise" → "precise")
    const words = trait.split(/\s+/);
    for (const word of words) {
      const mod = TRAIT_MODIFIERS[word];
      if (!mod) continue;
      matchCount++;
      speedMinD += mod.speed[0];
      speedMaxD += mod.speed[1];
      errorMul *= mod.errors;

      if (mod.fillers) {
        fillerChanceD += mod.fillers.chanceDelta || 0;
        if (mod.fillers.phrases !== undefined && fillerPhrases === null) {
          fillerPhrases = mod.fillers.phrases;
        }
      }
      if (mod.brb) {
        brbChanceD += mod.brb.chanceDelta || 0;
        if (mod.brb.phrases && brbPhrases === null) brbPhrases = mod.brb.phrases;
        if (mod.brb.returnPhrase !== undefined && brbReturn === null) brbReturn = mod.brb.returnPhrase;
      }
    }
  }

  // Average speed deltas if multiple traits matched to avoid extreme stacking
  if (matchCount > 1) {
    speedMinD = Math.round(speedMinD / matchCount);
    speedMaxD = Math.round(speedMaxD / matchCount);
    fillerChanceD /= matchCount;
    brbChanceD /= matchCount;
    // Geometric mean of error multipliers → already accumulated via *=, take nth root
    errorMul = Math.pow(errorMul, 1 / matchCount);
  }

  const voice = {
    typingSpeed: {
      min: clamp(DEFAULTS.typingSpeed.min + speedMinD, 8, 35),
      max: clamp(DEFAULTS.typingSpeed.max + speedMaxD, 12, 40)
    },
    rhythm: { ...DEFAULTS.rhythm },
    errors: {
      typo:             round4(clamp(DEFAULTS.errors.typo * errorMul, 0, 0.08)),
      transpose:        round4(clamp(DEFAULTS.errors.transpose * errorMul, 0, 0.1)),
      missedSpace:      round4(clamp(DEFAULTS.errors.missedSpace * errorMul, 0, 0.1)),
      doubleLetter:     round4(clamp(DEFAULTS.errors.doubleLetter * errorMul, 0, 0.1)),
      wordCorrection:   round4(clamp(DEFAULTS.errors.wordCorrection * errorMul, 0, 0.12)),
      doubleCorrection: round4(clamp(DEFAULTS.errors.doubleCorrection * errorMul, 0.05, 0.6))
    },
    fillers: {
      chance: round4(clamp(DEFAULTS.fillers.chance + fillerChanceD, 0, 0.15)),
      phrases: fillerPhrases !== null ? fillerPhrases : [...DEFAULTS.fillers.phrases]
    },
    brb: {
      chance: round4(clamp(DEFAULTS.brb.chance + brbChanceD, 0, 0.1)),
      phrases: brbPhrases || [...DEFAULTS.brb.phrases],
      returnPhrase: brbReturn !== null ? brbReturn : DEFAULTS.brb.returnPhrase
    }
  };

  // Ensure min < max
  if (voice.typingSpeed.min >= voice.typingSpeed.max) {
    voice.typingSpeed.max = voice.typingSpeed.min + 4;
  }

  return voice;
}
// round4()
// WHAT THIS DOES: round4 is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call round4(...) where this helper behavior is needed.
function round4(n) { return Math.round(n * 10000) / 10000; }

function getDefaultVoice() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

module.exports = { generateVoiceFromTraits, getDefaultVoice, DEFAULTS };
