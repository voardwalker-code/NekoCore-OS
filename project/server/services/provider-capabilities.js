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
