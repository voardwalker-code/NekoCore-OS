'use strict';

// ============================================================
// Turn Classifier Engine (Slice T2-1)
//
// Pure regex + keyword classifier. No LLM. Runs in <1ms.
// Classifies incoming user messages and decides whether the
// full 4-node orchestrator pipeline can be bypassed.
// ============================================================

const { BYPASS_THRESHOLD } = require('../../contracts/turn-classifier-contract');

// ── Pattern libraries per category ──────────────────────────

const GREETING_PATTERNS = [
  /^(hi|hey|hello|howdy|yo|hiya|sup|heya|hii+|oi)[\s!.?]*$/i,
  /^good\s+(morning|afternoon|evening|day|night)[\s!.?]*$/i,
  /^(what'?s?\s+up|wh?ats?\s*good|wsg)[\s!.?]*$/i,
  /^(greetings|salutations)[\s!.?]*$/i
];

const STATUS_PATTERNS = [
  /^how\s+(are|r)\s+(you|u|ya)[\s!?.]*$/i,
  /^(you|u)\s+(ok|okay|good|alright|fine)[\s!?.]*$/i,
  /^how('?s| is)\s+(it\s+going|everything|life|things|ur day|your day)[\s!?.]*$/i,
  /^(what'?s?\s+up|wya|wyd)[\s!?.]*$/i,
  /^how\s+do\s+you\s+feel[\s!?.]*$/i,
  /^how\s+are\s+things[\s!?.]*$/i,
  /^are\s+you\s+(ok|okay|alright|good|fine|there)[\s!?.]*$/i
];

const CONFIRMATION_PATTERNS = [
  /^(yes|yeah|yep|yup|yea|ya|ye|uh-?huh|mhm|mhmm|affirmative)[\s!.?]*$/i,
  /^(no|nah|nope|nay|nuh-?uh|negative)[\s!.?]*$/i,
  /^(ok|okay|k|kk|okie|alright|sure|fine|sounds?\s+good|bet|word|cool|nice)[\s!.?]*$/i,
  /^(got\s+it|understood|roger|copy|aye|right)[\s!.?]*$/i,
  /^(thanks|thank\s+you|thx|ty|tysm|ta|cheers)[\s!.?]*$/i,
  /^(np|no\s+problem|no\s+worries|you'?re?\s+welcome|yw|all\s+good)[\s!.?]*$/i,
  /^(lol|lmao|haha|hehe|xd|rofl)[\s!.?]*$/i,
  /^<3+[\s!.?]*$/i,
  /^:[\)\(DPp3][\s]*$/
];

const FAREWELL_PATTERNS = [
  /^(bye|goodbye|good\s*bye|see\s+(ya|you)|later|cya|ttyl|peace|gotta\s+go)[\s!.?]*$/i,
  /^(good\s*night|gn|nighty?\s*night|night|nite|sleep\s+well)[\s!.?]*$/i,
  /^(take\s+care|have\s+a\s+good\s+(one|day|night)|brb)[\s!.?]*$/i,
  /^(i('?m| am)\s+(going|heading|leaving|off)\s*(now|to\s+(bed|sleep))?)[\s!.?]*$/i
];

const COMMAND_PATTERNS = [
  /^\//  // slash commands — already routed upstream, but classify for metrics
];

const SIMPLE_QUESTION_PATTERNS = [
  /^what('?s| is)\s+your\s+name[\s!?.]*$/i,
  /^who\s+are\s+you[\s!?.]*$/i,
  /^what\s+are\s+you[\s!?.]*$/i,
  /^what\s+time\s+is\s+it[\s!?.]*$/i,
  /^what('?s| is)\s+the\s+(date|day|time)[\s!?.]*$/i,
  /^how\s+old\s+are\s+you[\s!?.]*$/i,
  /^what('?s| is)\s+your\s+favorite\s+\w+[\s!?.]*$/i,
  /^do\s+you\s+(like|love|hate|enjoy|prefer)\s+\w+[\s!?.]*$/i,
  /^can\s+you\s+(hear|see|feel|think|dream|sleep|eat|remember)\b.*[\s!?.]*$/i
];

// ── Classifier ──────────────────────────────────────────────

/**
 * Classify a user message turn.
 * @param {string} messageText
 * @returns {{ category: string, confidence: number, bypass: boolean }}
 */
function classifyTurn(messageText) {
  if (!messageText || typeof messageText !== 'string') {
    return { category: 'deep', confidence: 0, bypass: false };
  }

  const trimmed = messageText.trim();
  if (!trimmed) {
    return { category: 'deep', confidence: 0, bypass: false };
  }

  // Guard: messages with ? + >15 words → never bypass (complex question)
  const wordCount = trimmed.split(/\s+/).length;
  const hasQuestion = trimmed.includes('?');
  if (hasQuestion && wordCount > 15) {
    return { category: 'deep', confidence: 0.95, bypass: false };
  }

  // Guard: long messages (>30 words) are always deep
  if (wordCount > 30) {
    return { category: 'deep', confidence: 0.9, bypass: false };
  }

  // Test each category in priority order
  const categories = [
    { name: 'command',         patterns: COMMAND_PATTERNS },
    { name: 'greeting',        patterns: GREETING_PATTERNS },
    { name: 'farewell',        patterns: FAREWELL_PATTERNS },
    { name: 'confirmation',    patterns: CONFIRMATION_PATTERNS },
    { name: 'status',          patterns: STATUS_PATTERNS },
    { name: 'simple-question', patterns: SIMPLE_QUESTION_PATTERNS }
  ];

  for (const { name, patterns } of categories) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        const confidence = 0.95;
        // Commands bypass is false — they're handled by the command system
        const bypass = name !== 'command' && confidence >= BYPASS_THRESHOLD;
        return { category: name, confidence, bypass };
      }
    }
  }

  // No match → deep
  return { category: 'deep', confidence: 0, bypass: false };
}

module.exports = { classifyTurn };
