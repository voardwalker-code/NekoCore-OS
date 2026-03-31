// ── Brain · Orchestration Policy ────────────────────────────────────────────────────
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

// buildTurnPolicy()
// WHAT THIS DOES: buildTurnPolicy creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildTurnPolicy(...) before code that depends on this setup.
function buildTurnPolicy(turnSignals = {}, tokenUsageSoFar = {}, config = {}) {
  const maxPromptTokens = Number.isFinite(config.maxPromptTokens) ? config.maxPromptTokens : 14000;
  const maxTotalTokens = Number.isFinite(config.maxTotalTokens) ? config.maxTotalTokens : 18000;
  const maxLatencyMs = Number.isFinite(config.maxLatencyMs) ? config.maxLatencyMs : 55000;

  return {
    maxPromptTokens,
    maxTotalTokens,
    maxLatencyMs,
    allowStrongFinalEval: config.allowStrongFinalEval !== false,
    highTensionThreshold: Number.isFinite(config.highTensionThreshold) ? config.highTensionThreshold : 0.7,
    strongEscalationHints: Array.isArray(config.strongEscalationHints)
      ? config.strongEscalationHints
      : ['high_stakes', 'safety', 'critical']
  };
}
// shouldEscalateO2()
// WHAT THIS DOES: shouldEscalateO2 answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call shouldEscalateO2(...) and branch logic based on true/false.
function shouldEscalateO2(inputs = {}) {
  const turnSignals = inputs.turnSignals || {};
  const policy = inputs.policy || {};
  if (!policy.allowStrongFinalEval) return { escalate: false, reason: 'none' };

  const tension = Number(turnSignals.tension || 0);
  if (tension >= Number(policy.highTensionThreshold || 0.7)) {
    return { escalate: true, reason: 'high-tension' };
  }

  const events = Array.isArray(turnSignals.events) ? turnSignals.events : [];
  if (events.includes('error_report') && events.includes('constraint')) {
    return { escalate: true, reason: 'error-constraint-combo' };
  }

  const hints = Array.isArray(turnSignals.intentHints) ? turnSignals.intentHints : [];
  if (hints.includes('planning') && hints.includes('implementation')) {
    return { escalate: true, reason: 'planning-implementation-combo' };
  }

  if (inputs.userRequestedDepth === true) {
    return { escalate: true, reason: 'user-requested-depth' };
  }

  return { escalate: false, reason: 'none' };
}
// chooseO2Runtime()
// WHAT THIS DOES: chooseO2Runtime is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call chooseO2Runtime(...) where this helper behavior is needed.
function chooseO2Runtime(defaultRuntime, strongRuntime, decision) {
  if (decision && decision.escalate && strongRuntime) return strongRuntime;
  return defaultRuntime;
}
// enforceBudgetGuard()
// WHAT THIS DOES: enforceBudgetGuard is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call enforceBudgetGuard(...) where this helper behavior is needed.
function enforceBudgetGuard(currentUsage = {}, budgetPolicy = {}) {
  const prompt = Number(currentUsage.prompt_tokens || 0);
  const total = Number(currentUsage.total_tokens || 0);

  if (prompt > Number(budgetPolicy.maxPromptTokens || 14000)) {
    return { ok: false, reason: 'prompt-token-budget-exceeded' };
  }
  if (total > Number(budgetPolicy.maxTotalTokens || 18000)) {
    return { ok: false, reason: 'total-token-budget-exceeded' };
  }
  return { ok: true, reason: null };
}

/**
 * Wrap an async call function with a timeout ceiling.
 * On timeout, rejects with { timedOut: true }.
 *
 * @param {Function} callFn  - Async function to invoke (no args)
 * @param {number}   maxMs   - Maximum allowed milliseconds
 * @returns {Promise<any>}
 */
async function enforceLatencyGuard(callFn, maxMs) {
  const ms = Number.isFinite(maxMs) && maxMs > 0 ? maxMs : 35000;
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject({ timedOut: true, maxMs: ms });
      }
    }, ms);

    Promise.resolve()
      .then(() => callFn())
      .then((result) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(result);
        }
      })
      .catch((err) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

module.exports = {
  buildTurnPolicy,
  shouldEscalateO2,
  chooseO2Runtime,
  enforceBudgetGuard,
  enforceLatencyGuard
};
