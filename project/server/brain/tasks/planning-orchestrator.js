// ============================================================
// Planning Orchestrator
// Runs multi-entity deliberation sessions: entities discuss across
// rounds, NekoCore moderates, and a final synthesized plan is produced.
// ============================================================

'use strict';

const entityChatManager = require('./entity-chat-manager');
const { invokeEntityWorker } = require('./entity-worker-invoker');
const taskEventBus = require('./task-event-bus');
const { PLANNING_LIMITS } = require('../../contracts/planning-session-contract');
const blueprintLoader = require('./blueprint-loader');

/**
 * Run a multi-entity planning session.
 *
 * @param {Object} config
 * @param {string}   config.prompt — the user's planning request
 * @param {Array}    config.participants — array of { entityId, name, capabilities }
 * @param {Function} config.callLLM — async (runtime, messages, opts) => string
 * @param {Object}   [config.runtime] — LLM runtime config
 * @param {string}   [config.taskSessionId] — task session ID for event bus
 * @param {number}   [config.maxRounds] — override default max rounds
 * @returns {Promise<Object>} { plan, rationale, issues, rounds, participantIds, sessionId }
 */
async function runPlanningSession(config = {}) {
  const {
    prompt,
    participants = [],
    callLLM,
    runtime = {},
    taskSessionId,
    maxRounds = PLANNING_LIMITS.MAX_ROUNDS
  } = config;

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Planning prompt must be a non-empty string');
  }
  if (typeof callLLM !== 'function') {
    throw new Error('callLLM must be a function');
  }

  // Enforce entity cap
  const capped = participants.slice(0, PLANNING_LIMITS.MAX_ENTITIES_PER_SESSION);
  const entityIds = capped.map(p => p.entityId);

  // Create chat session
  const session = entityChatManager.createSession({
    sessionType: 'planning',
    prompt,
    entityIds
  });

  // Seed the session with the user's prompt
  entityChatManager.routeMessage(session.id, {
    content: prompt,
    from: 'user'
  });

  const rounds = [];
  let consensus = false;
  const effectiveMaxRounds = Math.min(maxRounds, PLANNING_LIMITS.MAX_ROUNDS);

  for (let roundIndex = 0; roundIndex < effectiveMaxRounds; roundIndex++) {
    const roundResponses = [];

    // Each entity responds sequentially within a round
    for (const participant of capped) {
      const msg = await entityChatManager.invokeEntity(
        session.id,
        participant.entityId,
        {
          callLLM,
          runtime,
          entityFallback: {
            name: participant.name,
            capabilities: participant.capabilities || []
          }
        }
      );

      if (msg) {
        roundResponses.push({
          entityId: participant.entityId,
          content: msg.content
        });
      }
    }

    // Record round
    const round = { roundIndex, responses: roundResponses };
    rounds.push(round);

    // Emit round complete event
    if (taskSessionId) {
      taskEventBus.emit(taskSessionId, {
        type: 'planning_round_complete',
        round: roundIndex,
        responseCount: roundResponses.length
      });
    }

    // NekoCore moderator pass — assess consensus
    const moderationResult = await _moderateRound(
      session.id, roundIndex, roundResponses, prompt, callLLM, runtime
    );

    // Store moderation message in session
    entityChatManager.routeMessage(session.id, {
      content: moderationResult.summary,
      from: 'nekocore_moderator'
    });

    if (moderationResult.consensus) {
      consensus = true;
      break;
    }
  }

  // Final synthesis
  const synthesis = await _synthesizePlan(session.id, prompt, callLLM, runtime);

  // Close session with artifacts
  entityChatManager.closeSession(session.id, {
    type: 'planning_result',
    plan: synthesis.finalPlan,
    rationale: synthesis.decisionRationale,
    issues: synthesis.issuesFlagged
  });

  // Emit planning complete event
  if (taskSessionId) {
    taskEventBus.emit(taskSessionId, {
      type: 'planning_complete',
      sessionId: session.id,
      roundsCompleted: rounds.length,
      consensus
    });
  }

  return {
    plan: synthesis.finalPlan,
    rationale: synthesis.decisionRationale,
    issues: synthesis.issuesFlagged,
    rounds,
    participantIds: entityIds,
    sessionId: session.id,
    consensus
  };
}

/**
 * NekoCore moderator: evaluate entity responses for consensus.
 * @returns {Promise<{ consensus: boolean, summary: string, unresolvedIssues: string[] }>}
 */
async function _moderateRound(sessionId, roundIndex, responses, prompt, callLLM, runtime) {
  const responsesSummary = responses
    .map(r => `[${r.entityId}]: ${r.content}`)
    .join('\n\n');

  const planningBlueprint = blueprintLoader.getModuleBlueprint('planning');
  const blueprintRef = planningBlueprint
    ? `\n\n[Planning Reference]\n${planningBlueprint}`
    : '';

  const moderatorMessages = [
    {
      role: 'system',
      content: 'You are NekoCore, moderating a multi-entity planning session. '
        + 'Evaluate the entity responses and determine if there is consensus. '
        + 'Respond with a JSON object: {"consensus": true/false, "summary": "...", "unresolvedIssues": ["..."]}'
        + blueprintRef
    },
    {
      role: 'user',
      content: `Planning prompt: ${prompt}\n\nRound ${roundIndex + 1} responses:\n${responsesSummary}\n\n`
        + 'Is there consensus among the entities? What issues remain unresolved?'
    }
  ];

  try {
    const raw = await callLLM(runtime, moderatorMessages, {
      max_tokens: PLANNING_LIMITS.MAX_RESPONSE_TOKENS
    });
    return _parseModerationResponse(raw);
  } catch {
    return { consensus: false, summary: 'Moderation failed — continuing.', unresolvedIssues: ['moderation_error'] };
  }
}

/**
 * Parse the moderation LLM response — extract JSON or fall back gracefully.
 */
function _parseModerationResponse(raw) {
  const text = String(raw || '');
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*"consensus"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        consensus: !!parsed.consensus,
        summary: String(parsed.summary || text),
        unresolvedIssues: Array.isArray(parsed.unresolvedIssues) ? parsed.unresolvedIssues : []
      };
    } catch {
      // fall through to default
    }
  }
  // Heuristic: check for consensus keywords
  const lower = text.toLowerCase();
  const hasConsensus = lower.includes('consensus: true') || lower.includes('consensus reached') || lower.includes('"consensus":true') || lower.includes('"consensus": true');
  return {
    consensus: hasConsensus,
    summary: text,
    unresolvedIssues: []
  };
}

/**
 * Final synthesis: NekoCore produces the consolidated plan from the debate.
 * @returns {Promise<{ finalPlan: string, decisionRationale: string, issuesFlagged: string[] }>}
 */
async function _synthesizePlan(sessionId, prompt, callLLM, runtime) {
  const session = entityChatManager.getSession(sessionId);
  const history = (session ? session.messages : [])
    .map(m => `[${m.from}]: ${m.content}`)
    .join('\n\n');

  const planningBlueprint = blueprintLoader.getModuleBlueprint('planning');
  const bpRef = planningBlueprint ? `\n\n[Synthesis Reference]\n${planningBlueprint}` : '';

  const synthesisMessages = [
    {
      role: 'system',
      content: 'You are NekoCore. Based on the multi-entity deliberation below, '
        + 'produce a final plan. Respond with a JSON object: '
        + '{"finalPlan": "...", "decisionRationale": "...", "issuesFlagged": ["..."]}'
        + bpRef
    },
    {
      role: 'user',
      content: `Original request: ${prompt}\n\nDeliberation:\n${history}\n\n`
        + 'Produce the final synthesized plan.'
    }
  ];

  try {
    const raw = await callLLM(runtime, synthesisMessages, {
      max_tokens: PLANNING_LIMITS.MAX_RESPONSE_TOKENS
    });
    return _parseSynthesisResponse(raw);
  } catch {
    return {
      finalPlan: 'Synthesis failed — see deliberation log.',
      decisionRationale: 'LLM synthesis error.',
      issuesFlagged: ['synthesis_error']
    };
  }
}

/**
 * Parse the synthesis LLM response — extract JSON or fall back gracefully.
 */
function _parseSynthesisResponse(raw) {
  const text = String(raw || '');
  const jsonMatch = text.match(/\{[\s\S]*"finalPlan"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        finalPlan: String(parsed.finalPlan || text),
        decisionRationale: String(parsed.decisionRationale || ''),
        issuesFlagged: Array.isArray(parsed.issuesFlagged) ? parsed.issuesFlagged : []
      };
    } catch {
      // fall through
    }
  }
  return {
    finalPlan: text,
    decisionRationale: '',
    issuesFlagged: []
  };
}

module.exports = {
  runPlanningSession,
  _parseModerationResponse,
  _parseSynthesisResponse
};
