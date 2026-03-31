// ── Contracts · Response Contracts ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This module belongs to the NekoCore OS codebase and provides focused
// subsystem behavior.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// API Response Contracts
// Runtime validation for key route response payloads.
// ============================================================

// isObject()
// WHAT THIS DOES: isObject answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call isObject(...) and branch logic based on true/false.
function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validateChatResponse(payload) {
  const errors = [];
  if (!isObject(payload)) return ['payload must be an object'];
  if (payload.ok !== true) errors.push('ok must be true');
  if (typeof payload.response !== 'string') errors.push('response must be a string');
  if ('innerDialog' in payload && !isObject(payload.innerDialog)) {
    errors.push('innerDialog must be an object when present');
  }
  return errors;
}
// validateMemoriesReconstructResponse()
// WHAT THIS DOES: validateMemoriesReconstructResponse answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateMemoriesReconstructResponse(...) and branch logic based on true/false.
function validateMemoriesReconstructResponse(payload) {
  const errors = [];
  if (!isObject(payload)) return ['payload must be an object'];
  if (payload.ok !== true) errors.push('ok must be true');
  if (typeof payload.reconstructed !== 'string') errors.push('reconstructed must be a string');
  return errors;
}
// validateDocumentIngestResponse()
// WHAT THIS DOES: validateDocumentIngestResponse answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call validateDocumentIngestResponse(...) and branch logic based on true/false.
function validateDocumentIngestResponse(payload) {
  const errors = [];
  if (!isObject(payload)) return ['payload must be an object'];
  if (payload.ok !== true) errors.push('ok must be true');
  if (typeof payload.chunkId !== 'string' || !payload.chunkId) errors.push('chunkId must be a non-empty string');
  if (!Array.isArray(payload.topics)) errors.push('topics must be an array');
  if (typeof payload.importance !== 'number' || !Number.isFinite(payload.importance)) {
    errors.push('importance must be a finite number');
  }
  if (typeof payload.overwritten !== 'boolean') errors.push('overwritten must be a boolean');
  return errors;
}

const CONTRACT_VALIDATORS = {
  '/api/chat': validateChatResponse,
  '/api/memories/reconstruct': validateMemoriesReconstructResponse,
  '/api/document/ingest': validateDocumentIngestResponse
};
// enforceResponseContract()
// WHAT THIS DOES: enforceResponseContract is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call enforceResponseContract(...) where this helper behavior is needed.
function enforceResponseContract(route, payload) {
  const validator = CONTRACT_VALIDATORS[route];
  if (typeof validator !== 'function') return payload;

  const errors = validator(payload);
  if (errors.length > 0) {
    const err = new Error(`Response contract violation for ${route}: ${errors.join('; ')}`);
    err.contractErrors = errors;
    throw err;
  }

  return payload;
}

module.exports = {
  enforceResponseContract,
  validateChatResponse,
  validateMemoriesReconstructResponse,
  validateDocumentIngestResponse
};
