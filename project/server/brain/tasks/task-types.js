// ── Brain · Task Types ────────────────────────────────────────────────────
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
 * Task Types & Module Constants
 * Defines all available task types and their default configurations.
 * New task types can be added here without code changes to the executor.
 */

const TASK_TYPES = {
  RESEARCH: 'research',
  CODE: 'code',
  WRITING: 'writing',
  ANALYSIS: 'analysis',
  PLANNING: 'planning',
  PROJECT: 'project',
  MEMORY_QUERY: 'memory_query'
};

/**
 * Default module configurations for built-in task types.
 * Each module defines its system prompt key, allowed tools, and source of truth strategy.
 */
const DEFAULT_MODULE_CONFIGS = {
  [TASK_TYPES.RESEARCH]: {
    id: 'research-module',
    name: 'Research Agent',
    taskType: TASK_TYPES.RESEARCH,
    systemPromptKey: 'task_research',
    tools: ['web_search', 'web_fetch', 'mem_search', 'ws_write'],
    sourceOfTruth: 'web_and_archive',
    maxSteps: 6,
    maxLLMCalls: 20,
    description: 'Searches the web and internal archives for information synthesis'
  },
  [TASK_TYPES.CODE]: {
    id: 'code-module',
    name: 'Code Agent',
    taskType: TASK_TYPES.CODE,
    systemPromptKey: 'task_code',
    tools: ['ws_read', 'ws_write', 'ws_list', 'ws_append', 'ws_delete', 'ws_move', 'ws_mkdir', 'cmd_run'],
    sourceOfTruth: 'workspace_files',
    maxSteps: 8,
    maxLLMCalls: 25,
    description: 'Writes, edits, debugs, and scaffolds real code projects in the workspace'
  },
  [TASK_TYPES.WRITING]: {
    id: 'writing-module',
    name: 'Writing Agent',
    taskType: TASK_TYPES.WRITING,
    systemPromptKey: 'task_writing',
    tools: ['ws_write', 'ws_read', 'ws_append'],
    sourceOfTruth: 'style_guides_and_workspace',
    maxSteps: 6,
    maxLLMCalls: 20,
    description: 'Creates written content in the entity\'s voice and style'
  },
  [TASK_TYPES.ANALYSIS]: {
    id: 'analysis-module',
    name: 'Analysis Agent',
    taskType: TASK_TYPES.ANALYSIS,
    systemPromptKey: 'task_analysis',
    tools: ['ws_read', 'ws_write', 'mem_search', 'archive_search'],
    sourceOfTruth: 'archive_and_workspace_data',
    maxSteps: 6,
    maxLLMCalls: 20,
    description: 'Analyzes data and information patterns'
  },
  [TASK_TYPES.PLANNING]: {
    id: 'planning-module',
    name: 'Planning Orchestrator',
    taskType: TASK_TYPES.PLANNING,
    systemPromptKey: 'task_planning',
    tools: ['entity_message', 'session_bridging'],
    sourceOfTruth: 'multi_entity_chat_session',
    maxSteps: 12,
    maxLLMCalls: 40,
    description: 'Orchestrates multi-entity collaborative planning sessions'
  },
  [TASK_TYPES.PROJECT]: {
    id: 'project-module',
    name: 'Project Executor',
    taskType: TASK_TYPES.PROJECT,
    systemPromptKey: 'task_project',
    tools: ['ws_read', 'ws_write', 'ws_list', 'ws_append', 'ws_delete', 'ws_move', 'ws_mkdir', 'web_search', 'web_fetch', 'cmd_run'],
    sourceOfTruth: 'workspace_files',
    maxSteps: 10,
    maxLLMCalls: 40,
    description: 'Executes multi-phase projects with sequential phase chaining'
  },
  [TASK_TYPES.MEMORY_QUERY]: {
    id: 'memory-module',
    name: 'Memory Query Agent',
    taskType: TASK_TYPES.MEMORY_QUERY,
    systemPromptKey: 'task_memory_query',
    tools: ['mem_search', 'archive_search'],
    sourceOfTruth: 'entity_memory_archive',
    maxSteps: 3,
    maxLLMCalls: 10,
    description: 'Queries entity memory and archives'
  }
};

// Intent classification confidence threshold
const TASK_MIN_CONFIDENCE = 0.7;

module.exports = {
  TASK_TYPES,
  DEFAULT_MODULE_CONFIGS,
  TASK_MIN_CONFIDENCE
};
