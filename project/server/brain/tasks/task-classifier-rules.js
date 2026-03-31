// ── Brain · Task Classifier Rules ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Task Classifier Rules
 * Maps each task type to keywords, patterns, and scoring rules.
 * Easy to extend without touching the core classifier logic.
 */

const TASK_CLASSIFIER_RULES = {
  research: {
    keywords: [
      'research', 'find', 'search', 'look up', 'investigate', 'explore',
      'discover', 'study', 'lookup',
      'what is', 'how many', 'why is', 'source',
      'web', 'internet', 'online', 'sources', 'references', 'evidence'
    ],
    patterns: [
      /(?:find|search|research|investigate|explore).{0,50}(?:about|for|on)/i,
      /\b(?:what|who|where|when|why|how)\b.{0,80}\b(?:is|are|was|were)\b/i,
      /(?:look|look up).{0,30}(?:information|data|sources|evidence)/i,
      /(?:investigate|research).{0,80}(?:pattern|patterns|data|dataset|datasets)/i
    ],
    weight: 1.0
  },

  code: {
    keywords: [
      'code', 'write', 'develop', 'implement', 'create', 'build',
      'function', 'script', 'program', 'application', 'debug', 'fix',
      'refactor', 'optimize', 'test', 'error', 'bug', 'variable',
      'class', 'method', 'api', 'endpoint', 'module', 'package',
      'file', 'command', 'run', 'execute', 'compile', 'deploy',
      'git', 'html', 'css', 'javascript', 'python', 'react'
    ],
    patterns: [
      /(?:write|create|build|develop|implement).{0,50}(?:code|function|script|app)/i,
      /(?:create|build|write).{0,80}(?:api|endpoint|rest api|service|module)/i,
      /(?:fix|debug|refactor|optimize).{0,50}(?:code|function|bug|error)/i,
      /(?:create|write).{0,80}\/\/.{0,30}(?:in|with|for).{0,20}(?:javascript|python|typescript|react)/i,
      /```(?:javascript|python|typescript|react|html|css)/i
    ],
    weight: 1.0
  },

  writing: {
    keywords: [
      'write', 'compose', 'draft', 'edit', 'revise', 'rewrite',
      'content', 'article', 'blog', 'post', 'document', 'essay',
      'guide', 'tutorial', 'story', 'narrative', 'description',
      'summarize', 'summary', 'brief', 'outline', 'copy', 'text',
      'email', 'message', 'announcement', 'publicity', 'marketing',
      'brand', 'voice', 'tone', 'style', 'polish', 'proofread'
    ],
    patterns: [
      /(?:write|compose|draft|create).{0,80}(?:content|article|blog|post|guide|copy|email|summary|story)/i,
      /(?:edit|revise|rewrite|polish).{0,80}(?:content|text|article|document|essay|copy|email)/i,
      /(?:summarize|summary|brief).{0,80}(?:article|document|text|content|in|as)/i,
      /(?:marketing|publicity|announcement|email).{0,80}(?:write|create|compose|draft)/i
    ],
    weight: 1.0
  },

  analysis: {
    keywords: [
      'analyze', 'analysis', 'breakdown', 'break down', 'compare',
      'evaluate', 'assess', 'examine', 'review', 'critique',
      'pattern', 'patterns', 'trend', 'insight', 'finding', 'conclusion',
      'data', 'metric', 'statistic', 'visualization', 'chart',
      'pros', 'cons', 'advantage', 'disadvantage', 'tradeoff',
      'interpret', 'explain', 'understand', 'reason', 'why',
      'implication', 'impact', 'consequence', 'result'
    ],
    patterns: [
      /(?:analyze|analyze|break down|examine).{0,50}(?:data|information|results|findings)/i,
      /(?:compare|evaluate|assess).{0,50}(?:options|approaches|solutions)/i,
      /(?:what|explain).{0,80}(?:the|this).{0,30}(?:pattern|trend|insight|finding)/i,
      /(?:what).{0,40}(?:patterns?).{0,40}(?:information|data|results|see)/i,
      /(?:pros|cons|advantages|disadvantages|tradeoffs)/i
    ],
    weight: 1.0
  },

  planning: {
    keywords: [
      'plan', 'planning', 'strategy', 'roadmap', 'timeline', 'schedule',
      'organize', 'organize', 'structure', 'design', 'blueprint',
      'approach', 'method', 'process', 'workflow', 'sequence',
      'steps', 'phases', 'milestones', 'goals', 'objectives',
      'brainstorm', 'think through', 'figure out', 'decide',
      'collaborate', 'discuss', 'debate', 'consensus', 'decision',
      'research', 'methodology', 'experiment', 'framework'
    ],
    patterns: [
      /(?:plan|planning|strategy|roadmap).{0,50}(?:for|to|approach)/i,
      /(?:how should|what's the best|what's).{0,50}(?:approach|way|method).{0,50}to/i,
      /(?:think through|figure out|decide).{0,50}(?:how|approach|strategy)/i,
      /(?:brainstorm|collaborate|discuss).{0,50}(?:approach|strategy|methodology)/i
    ],
    weight: 1.0
  },

  memory_query: {
    keywords: [
      'remember', 'recall', 'memory', 'what did', 'when did', 'where did',
      'past', 'previous', 'previously', 'before', 'earlier', 'last time',
      'talked about', 'discussed', 'mentioned', 'told you', 'said',
      'history', 'background', 'context', 'relationship', 'know about me',
      'archive', 'search', 'find', 'look up', 'information about'
    ],
    patterns: [
      /(?:remember|recall|do you remember).{0,50}(?:when|what|where)/i,
      /(?:what).{0,30}(?:did you|we).{0,30}(?:talk|discuss|mention).{0,30}about/i,
      /(?:tell me|remind me).{0,50}(?:about|of).{0,50}(?:past|previous|previously|earlier)/i,
      /(?:my |my\s).{0,80}(?:history|background|memories|past)/i
    ],
    weight: 1.0
  }
};

/**
 * Conversation (non-task) keywords and patterns
 * If these match strongly, the input is likely conversational
 */
const CONVERSATION_RULES = {
  keywords: [
    'hello', 'hi', 'hey', 'how are you', 'what\'s up', 'what\'s new',
    'how\'s it going', 'thanks', 'thank you', 'appreciate', 'grateful',
    'tell me', 'can you', 'could you', 'would you',
    'what do you think', 'your opinion', 'your thoughts', 'your take',
    'personal', 'feelings', 'emotions', 'relationships', 'life',
    'chat', 'talk', 'conversation', 'casual'
  ],
  patterns: [
    /^(?:hello|hi|hey|what's up|how are you).{0,30}$/i,
    /(?:what do you think|your opinion|your thoughts|your take).{0,50}$/i,
    /(?:tell me about|explain|help me with).{0,50}(?:yourself|your perspective|your thoughts)/i,
    /(?:how|what).{0,80}(?:feel|think|believe).{0,50}(?:about|of|on)/i
  ],
  weight: 0.8
};

/**
 * Calculate confidence score for a task type based on keyword and pattern matching
 * @param {string} message - The user message
 * @param {Object} rules - Rules object with keywords and patterns
 * @returns {number} Confidence score 0-1
 */
// calculateTaskConfidence()
// WHAT THIS DOES: calculateTaskConfidence is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call calculateTaskConfidence(...) where this helper behavior is needed.
function calculateTaskConfidence(message, rules) {
  const lowerMessage = String(message || '').toLowerCase().replace(/\s+/g, ' ');
  let score = 0;

  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasKeyword = keyword => {
    const rawKeyword = String(keyword || '').toLowerCase().trim();
    if (!rawKeyword) return false;
    const keywordPattern = escapeRegex(rawKeyword).replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`(^|\\W)${keywordPattern}($|\\W)`, 'i');
    return pattern.test(lowerMessage);
  };

  // Keyword matching: +0.2 per keyword, max 0.6
  const keywordMatches = rules.keywords.filter(kw =>
    hasKeyword(kw)
  ).length;
  const keywordScore = Math.min(keywordMatches * 0.2, 0.6);
  score += keywordScore;

  // Pattern matching: +0.35 per pattern match, max 0.6
  let patternMatches = 0;
  rules.patterns.forEach(pattern => {
    if (pattern.test(message)) {
      patternMatches += 1;
    }
  });
  const patternScore = Math.min(patternMatches * 0.35, 0.6);
  score += patternScore;

  // Apply task type weight
  score = Math.min(score * (rules.weight || 1.0), 1.0);

  return score;
}

/**
 * Classify text across all task types and return the best match
 * @param {string} message - The user message
 * @returns {Object} { taskType, confidence } - Best matching task type and its confidence
 */
// classifyTaskType()
// WHAT THIS DOES: classifyTaskType is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call classifyTaskType(...) where this helper behavior is needed.
function classifyTaskType(message) {
  if (!message || typeof message !== 'string') {
    return { taskType: null, confidence: 0 };
  }

  const scores = {};

  // Score against all task types
  Object.entries(TASK_CLASSIFIER_RULES).forEach(([taskType, rules]) => {
    scores[taskType] = calculateTaskConfidence(message, rules);
  });

  // Find the best match
  let bestTaskType = null;
  let bestScore = 0;

  Object.entries(scores).forEach(([taskType, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestTaskType = taskType;
    }
  });

  return {
    taskType: bestTaskType,
    confidence: bestScore
  };
}

/**
 * Classify input as conversation vs task
 * @param {string} message - The user message
 * @returns {Object} { intent, confidence, taskType }
 */
// classifyIntentBasic()
// WHAT THIS DOES: classifyIntentBasic is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call classifyIntentBasic(...) where this helper behavior is needed.
function classifyIntentBasic(message) {
  if (!message || typeof message !== 'string') {
    return {
      intent: 'conversation',
      confidence: 0,
      taskType: null
    };
  }

  // Check conversation rules
  const conversationConfidence = calculateTaskConfidence(message, CONVERSATION_RULES);

  // Check task types
  const { taskType, confidence: taskConfidence } = classifyTaskType(message);

  // Decision logic:
  // - If task confidence is significantly higher than conversation confidence, it's a task
  // - Otherwise, default to conversation
  const taskThreshold = 0.2;
  const taskBonus = 0.05; // Task should beat conversation by at least a small margin

  if (taskConfidence >= taskThreshold && taskConfidence >= conversationConfidence + taskBonus) {
    return {
      intent: 'task',
      confidence: taskConfidence,
      taskType: taskType
    };
  } else {
    return {
      intent: 'conversation',
      confidence: conversationConfidence,
      taskType: null
    };
  }
}

module.exports = {
  TASK_CLASSIFIER_RULES,
  CONVERSATION_RULES,
  calculateTaskConfidence,
  classifyTaskType,
  classifyIntentBasic
};
