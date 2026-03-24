function runtimeLabel(runtime) {
  if (!runtime) return 'unset';
  const t = runtime.type || 'unknown';
  const m = runtime.model || 'unknown-model';
  return `${t}:${m}`;
}

function toChatEndpoint(baseEndpoint) {
  const ep = String(baseEndpoint || '').trim();
  if (!ep) return '';
  if (ep.endsWith('/v1/chat/completions') || ep.endsWith('/chat/completions')) return ep;
  return ep.replace(/\/$/, '') + '/v1/chat/completions';
}

function parseJsonBlock(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (_) {
    try {
      const fixed = candidate
        .replace(/\n/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(fixed);
    } catch (_) {
      return null;
    }
  }
}

function estimateUsageFromText(messages, content) {
  const promptChars = Array.isArray(messages)
    ? messages.reduce((sum, m) => sum + String(m?.content || '').length, 0)
    : 0;
  const completionChars = String(content || '').length;
  const promptTokens = Math.max(1, Math.ceil(promptChars / 4));
  const completionTokens = Math.max(1, Math.ceil(completionChars / 4));
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    estimated: true
  };
}

function stripInternalResumeTag(text) {
  return String(text || '').replace(/^\[INTERNAL-RESUME\]\s*/i, '').trim();
}

const THINKING_PROMPT_SUFFIX = '\n\nBefore responding, reason through your answer step by step inside <thinking>...</thinking> tags. Only the text OUTSIDE the thinking tags will be shown to the user.';

function stripThinkingTags(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
}

/**
 * Extract thinking content from prompt-based <thinking> tags.
 * Returns the concatenated thinking text, or null if none found.
 */
function extractThinkingContent(text) {
  if (!text || typeof text !== 'string') return null;
  const matches = [];
  const re = /<thinking>([\s\S]*?)<\/thinking>/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const content = m[1].trim();
    if (content) matches.push(content);
  }
  return matches.length > 0 ? matches.join('\n\n') : null;
}

module.exports = {
  runtimeLabel,
  toChatEndpoint,
  parseJsonBlock,
  estimateUsageFromText,
  stripInternalResumeTag,
  stripThinkingTags,
  extractThinkingContent,
  THINKING_PROMPT_SUFFIX
};
