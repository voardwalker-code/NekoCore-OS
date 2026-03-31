// ── Services · Provider Capabilities ────────────────────────────────────────────────────
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
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/services/provider-capabilities.js
 *
 * Static capability declarations for each provider type.
 * Query functions let the pipeline check what a provider supports
 * without hardcoding provider names in business logic.
 *
 * User config overrides are resolved in config-runtime.js (Slice 2).
 * This module provides the defaults only.
 */

const PROVIDER_CAPABILITIES = Object.freeze({
  anthropic: Object.freeze({
    promptCaching: true,
    extendedCache: true,        // 1-hour cache via beta header
    compaction: 'api',          // API-level context_management.edits
    extendedThinking: true,     // native thinking parameter
    adaptiveThinking: true,     // adaptive mode (Opus 4.6)
    nativeToolUse: true,        // tools array in Messages API
    contextEditing: true,       // context_management.edits clear ops
    memoryTool: true            // memory tool type in API
  }),
  openrouter: Object.freeze({
    promptCaching: false,       // provider-dependent, conservative default
    extendedCache: false,
    compaction: 'prompt',       // LLM prompt-based summarization fallback
    extendedThinking: false,    // model-dependent, conservative default
    adaptiveThinking: false,
    nativeToolUse: true,        // OpenAI-compatible function calling
    contextEditing: false,
    memoryTool: false
  }),
  ollama: Object.freeze({
    promptCaching: false,
    extendedCache: false,
    compaction: 'prompt',       // LLM prompt-based summarization fallback
    extendedThinking: false,
    adaptiveThinking: false,
    nativeToolUse: false,       // model-dependent, conservative default
    contextEditing: false,
    memoryTool: false
  })
});

/**
 * Get the full capability map for a provider type.
 * Returns a frozen defaults object. Unknown types get all-false.
 * @param {string} providerType - 'anthropic' | 'openrouter' | 'ollama'
 * @returns {Readonly<object>}
 */
// getCapabilities()
// WHAT THIS DOES: getCapabilities reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getCapabilities(...), then use the returned value in your next step.
function getCapabilities(providerType) {
  const type = String(providerType || '').toLowerCase().trim();
  return PROVIDER_CAPABILITIES[type] || Object.freeze({
    promptCaching: false,
    extendedCache: false,
    compaction: false,
    extendedThinking: false,
    adaptiveThinking: false,
    nativeToolUse: false,
    contextEditing: false,
    memoryTool: false
  });
}

/**
 * Check if a runtime supports a specific capability.
 * Checks resolved capabilities first (from user config merge),
 * then falls back to provider defaults.
 * @param {object} runtime - Normalized runtime config (must have .type)
 * @param {string} capName - Capability name (e.g. 'extendedCache')
 * @returns {boolean}
 */
// hasCapability()
// WHAT THIS DOES: hasCapability answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call hasCapability(...) and branch logic based on true/false.
function hasCapability(runtime, capName) {
  if (!runtime || !capName) return false;
  // Check resolved capabilities from config merge (Slice 2 will add these)
  if (runtime.capabilities && runtime.capabilities[capName] !== undefined) {
    return !!runtime.capabilities[capName];
  }
  const defaults = getCapabilities(runtime.type);
  return !!defaults[capName];
}

/**
 * Get the mode/value of a capability (e.g. compaction: 'api' vs 'prompt').
 * Returns the raw value, not a boolean.
 * @param {object} runtime - Normalized runtime config
 * @param {string} capName - Capability name
 * @returns {*} The capability value, or false if not supported
 */
// getCapabilityMode()
// WHAT THIS DOES: getCapabilityMode reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getCapabilityMode(...), then use the returned value in your next step.
function getCapabilityMode(runtime, capName) {
  if (!runtime || !capName) return false;
  if (runtime.capabilities && runtime.capabilities[capName] !== undefined) {
    return runtime.capabilities[capName];
  }
  const defaults = getCapabilities(runtime.type);
  return defaults[capName] !== undefined ? defaults[capName] : false;
}

/**
 * Resolve capabilities by merging provider defaults with user overrides.
 * Returns a new frozen object.
 * @param {string} providerType - Provider type key
 * @param {object} [userOverrides] - Optional user capability overrides
 * @returns {Readonly<object>}
 */
// resolveCapabilities()
// WHAT THIS DOES: resolveCapabilities is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call resolveCapabilities(...) where this helper behavior is needed.
function resolveCapabilities(providerType, userOverrides) {
  const defaults = getCapabilities(providerType);
  if (!userOverrides || typeof userOverrides !== 'object') {
    return defaults;
  }
  const merged = { ...defaults };
  for (const key of Object.keys(userOverrides)) {
    if (key in defaults) {
      merged[key] = userOverrides[key];
    }
  }
  // Enforce provider hard constraints — capabilities a provider cannot
  // support must stay disabled regardless of profile-level overrides.
  const type = String(providerType || '').toLowerCase().trim();
  if (type === 'ollama') {
    merged.extendedThinking = false;
    merged.adaptiveThinking = false;
  }
  return Object.freeze(merged);
}

module.exports = {
  PROVIDER_CAPABILITIES,
  getCapabilities,
  hasCapability,
  getCapabilityMode,
  resolveCapabilities
};
