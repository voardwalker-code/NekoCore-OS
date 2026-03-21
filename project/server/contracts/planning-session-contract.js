// ============================================================
// Planning Session Contract
// Validates the shape of multi-entity planning sessions,
// round structures, participant records, and final artifacts.
// ============================================================

'use strict';

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a planning session object.
 * @param {Object} session
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validatePlanningSession(session) {
  const errors = [];
  if (!isObject(session)) return { ok: false, errors: ['session must be an object'] };

  if (!session.id || typeof session.id !== 'string') {
    errors.push('session.id must be a non-empty string');
  }
  if (!session.sessionType || typeof session.sessionType !== 'string') {
    errors.push('session.sessionType must be a non-empty string');
  }
  if (typeof session.prompt !== 'string') {
    errors.push('session.prompt must be a string');
  }
  if (!Array.isArray(session.entityIds)) {
    errors.push('session.entityIds must be an array');
  }
  if (!Array.isArray(session.messages)) {
    errors.push('session.messages must be an array');
  }
  if (typeof session.status !== 'string') {
    errors.push('session.status must be a string');
  }
  const validStatuses = ['active', 'closed', 'error'];
  if (session.status && !validStatuses.includes(session.status)) {
    errors.push(`session.status must be one of: ${validStatuses.join(', ')}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate a planning round structure.
 * A round contains entity responses keyed by entity ID.
 * @param {Object} round
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validatePlanningRound(round) {
  const errors = [];
  if (!isObject(round)) return { ok: false, errors: ['round must be an object'] };

  if (typeof round.roundIndex !== 'number' || round.roundIndex < 0) {
    errors.push('round.roundIndex must be a non-negative number');
  }
  if (!Array.isArray(round.responses)) {
    errors.push('round.responses must be an array');
  } else {
    round.responses.forEach((resp, idx) => {
      if (!isObject(resp)) {
        errors.push(`round.responses[${idx}] must be an object`);
        return;
      }
      if (!resp.entityId || typeof resp.entityId !== 'string') {
        errors.push(`round.responses[${idx}].entityId must be a non-empty string`);
      }
      if (typeof resp.content !== 'string') {
        errors.push(`round.responses[${idx}].content must be a string`);
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate a participant record for the planning archive.
 * @param {Object} participant
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateParticipant(participant) {
  const errors = [];
  if (!isObject(participant)) return { ok: false, errors: ['participant must be an object'] };

  if (!participant.entityId || typeof participant.entityId !== 'string') {
    errors.push('participant.entityId must be a non-empty string');
  }
  if (!participant.name || typeof participant.name !== 'string') {
    errors.push('participant.name must be a non-empty string');
  }
  if (!Array.isArray(participant.capabilities)) {
    errors.push('participant.capabilities must be an array');
  }
  if (!participant.role || typeof participant.role !== 'string') {
    errors.push('participant.role must be a non-empty string');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate planning artifacts (final plan, rationale, issues).
 * @param {Object} artifacts
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validatePlanningArtifacts(artifacts) {
  const errors = [];
  if (!isObject(artifacts)) return { ok: false, errors: ['artifacts must be an object'] };

  if (typeof artifacts.finalPlan !== 'string' || !artifacts.finalPlan.trim()) {
    errors.push('artifacts.finalPlan must be a non-empty string');
  }
  if (typeof artifacts.decisionRationale !== 'string') {
    errors.push('artifacts.decisionRationale must be a string');
  }
  if (!Array.isArray(artifacts.issuesFlagged)) {
    errors.push('artifacts.issuesFlagged must be an array');
  }

  return { ok: errors.length === 0, errors };
}

// Limits for planning sessions
const PLANNING_LIMITS = {
  MAX_ROUNDS: 3,
  MAX_ENTITIES_PER_SESSION: 4,
  MAX_RESPONSE_TOKENS: 800,
  ENTITY_TIMEOUT_MS: 120000
};

module.exports = {
  validatePlanningSession,
  validatePlanningRound,
  validateParticipant,
  validatePlanningArtifacts,
  PLANNING_LIMITS
};
