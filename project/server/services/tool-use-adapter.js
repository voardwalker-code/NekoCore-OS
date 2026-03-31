// ── Services · Tool Use Adapter ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include:
// ../brain/skills/workspace-tools. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
/**
 * server/services/tool-use-adapter.js
 *
 * Converts NekoCore's workspace tool definitions to provider-specific
 * function calling schemas, parses native tool calls from responses,
 * and formats tool results for re-injection.
 *
 * Text-based [TOOL:...] parsing remains in workspace-tools.js for Ollama fallback.
 */

// ── Tool Definitions ────────────────────────────────────────────────────────
// Central registry of workspace tools with JSON Schema parameters.
// Excludes memory tools (handled by memory-tool-bridge.js).
const TOOL_DEFS = Object.freeze([
  {
    name: 'ws_list',
    description: 'List directory contents. Returns a newline-separated list of files and subdirectories.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative path within the workspace. Default: "."' } },
      required: []
    }
  },
  {
    name: 'ws_read',
    description: 'Read a file from the workspace. Returns the file content as text.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative path to the file to read.' } },
      required: ['path']
    }
  },
  {
    name: 'ws_write',
    description: 'Write content to a file in the workspace. Creates parent directories if needed.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file to write.' },
        content: { type: 'string', description: 'The full content to write to the file.' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'ws_append',
    description: 'Append content to an existing file in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file to append to.' },
        content: { type: 'string', description: 'The content to append.' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'ws_delete',
    description: 'Delete a file or directory (recursively) from the workspace.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative path to delete.' } },
      required: ['path']
    }
  },
  {
    name: 'ws_mkdir',
    description: 'Create a directory (with parent directories) in the workspace.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative path of the directory to create.' } },
      required: ['path']
    }
  },
  {
    name: 'ws_move',
    description: 'Move or rename a file or directory within the workspace.',
    parameters: {
      type: 'object',
      properties: {
        src: { type: 'string', description: 'Source path (relative).' },
        dst: { type: 'string', description: 'Destination path (relative).' }
      },
      required: ['src', 'dst']
    }
  },
  {
    name: 'web_search',
    description: 'Search the web for information. Returns extracted text from search results.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query.' } },
      required: ['query']
    }
  },
  {
    name: 'web_fetch',
    description: 'Fetch and extract content from a URL. Returns the page text.',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string', description: 'URL to fetch.' } },
      required: ['url']
    }
  },
  {
    name: 'search_archive',
    description: 'Search the Internet Archive / Wayback Machine for archived web content.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for archived content.' },
        yearRange: { type: 'string', description: 'Year range filter, e.g. "2020-2023". Optional.' },
        limit: { type: 'number', description: 'Max results to return (default 5).' }
      },
      required: ['query']
    }
  },
  {
    name: 'skill_create',
    description: 'Create a new skill with a name, description, and instructions.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name (alphanumeric + hyphens).' },
        description: { type: 'string', description: 'Brief skill description.' },
        instructions: { type: 'string', description: 'Full skill instructions.' }
      },
      required: ['name']
    }
  },
  {
    name: 'skill_list',
    description: 'List all available skills.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'skill_edit',
    description: 'Edit an existing skill\'s instructions.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name to edit.' },
        instructions: { type: 'string', description: 'New instructions content.' }
      },
      required: ['name']
    }
  },
  {
    name: 'profile_update',
    description: 'Update the entity\'s profile attributes.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'cmd_run',
    description: 'Execute a shell command in the workspace directory. Returns stdout, stderr, and exit code.',
    parameters: {
      type: 'object',
      properties: {
        cmd: { type: 'string', description: 'Shell command to execute.' },
        timeout: { type: 'number', description: 'Timeout in ms (default 10000).' }
      },
      required: ['cmd']
    }
  }
]);

// ── Schema Builders ─────────────────────────────────────────────────────────

/** Build Anthropic-format tool schemas ({ name, description, input_schema }). */
// buildAnthropicTools()
// WHAT THIS DOES: buildAnthropicTools creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildAnthropicTools(...) before code that depends on this setup.
function buildAnthropicTools() {
  return TOOL_DEFS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters
  }));
}

/** Build OpenAI/OpenRouter-format tool schemas ({ type: 'function', function: { ... } }). */
// buildOpenRouterTools()
// WHAT THIS DOES: buildOpenRouterTools creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildOpenRouterTools(...) before code that depends on this setup.
function buildOpenRouterTools() {
  return TOOL_DEFS.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}

/**
 * Build tool schemas for the given provider type.
 * Returns null for providers that don't support native tool use (Ollama).
 * @param {string} providerType - 'anthropic' | 'openrouter' | 'ollama'
 * @returns {Array|null}
 */
// buildToolSchemas()
// WHAT THIS DOES: buildToolSchemas creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call buildToolSchemas(...) before code that depends on this setup.
function buildToolSchemas(providerType) {
  if (providerType === 'anthropic') return buildAnthropicTools();
  if (providerType === 'openrouter') return buildOpenRouterTools();
  return null;
}

// ── Response Parsers ────────────────────────────────────────────────────────

/**
 * Extract tool calls from an Anthropic Messages API response.
 * @param {object} data - Raw Anthropic API response
 * @returns {{ content: string, toolCalls: Array<{ id: string, name: string, input: object }> }}
 */
// parseAnthropicResponse()
// WHAT THIS DOES: parseAnthropicResponse reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into parseAnthropicResponse(...) and use the transformed output.
function parseAnthropicResponse(data) {
  const textParts = [];
  const toolCalls = [];
  for (const block of (data?.content || [])) {
    if (block.type === 'text') textParts.push(block.text);
    else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, input: block.input || {} });
    }
  }
  return { content: textParts.join('').trim(), toolCalls };
}

/**
 * Extract tool calls from an OpenRouter/OpenAI response.
 * @param {object} data - Raw OpenRouter API response
 * @returns {{ content: string, toolCalls: Array<{ id: string, name: string, input: object }> }}
 */
// parseOpenRouterResponse()
// WHAT THIS DOES: parseOpenRouterResponse reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into parseOpenRouterResponse(...) and use the transformed output.
function parseOpenRouterResponse(data) {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return { content: '', toolCalls: [] };
  // toolCalls()
  // Purpose: helper wrapper used by this module's main flow.
  // toolCalls()
  // WHAT THIS DOES: toolCalls is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call toolCalls(...) where this helper behavior is needed.
  const toolCalls = (msg.tool_calls || []).map(tc => {
    let input = {};
    try { input = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}
    return { id: tc.id, name: tc.function?.name || '', input };
  });
  return { content: (msg.content || '').trim(), toolCalls };
}

// ── Result Formatters ───────────────────────────────────────────────────────

/**
 * Format tool execution results for Anthropic tool_result injection.
 * @param {Array<{ id: string, tool: string, result: string, ok: boolean }>} results
 * @returns {Array<object>}
 */
// formatAnthropicToolResults()
// WHAT THIS DOES: formatAnthropicToolResults reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into formatAnthropicToolResults(...) and use the transformed output.
function formatAnthropicToolResults(results) {
  return results.map(r => ({
    type: 'tool_result',
    tool_use_id: r.id,
    content: r.ok ? r.result : `ERROR: ${r.result}`,
    ...(r.ok ? {} : { is_error: true })
  }));
}

/**
 * Format tool execution results for OpenRouter/OpenAI tool message injection.
 * @param {Array<{ id: string, tool: string, result: string, ok: boolean }>} results
 * @returns {Array<object>}
 */
// formatOpenRouterToolResults()
// WHAT THIS DOES: formatOpenRouterToolResults reshapes data from one form into another.
// WHY IT EXISTS: conversion rules live here so the same transformation is reused.
// HOW TO USE IT: pass input data into formatOpenRouterToolResults(...) and use the transformed output.
function formatOpenRouterToolResults(results) {
  return results.map(r => ({
    role: 'tool',
    tool_call_id: r.id,
    content: r.ok ? r.result : `ERROR: ${r.result}`
  }));
}

// ── Tool Execution Bridge ───────────────────────────────────────────────────

/**
 * Check if a tool name is a workspace tool handled by this adapter.
 * @param {string} name
 * @returns {boolean}
 */
// isWorkspaceTool()
// WHAT THIS DOES: isWorkspaceTool answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call isWorkspaceTool(...) and branch logic based on true/false.
function isWorkspaceTool(name) {
  return TOOL_DEFS.some(t => t.name === name);
}

/**
 * Create an async tool executor that bridges native tool calls to the existing
 * workspace-tools execution logic. Uses synthetic text formatting to route
 * through the same validated execution path as text-based tool calls.
 *
 * @param {Object} deps - Same dependencies as workspaceTools.executeToolCalls
 * @param {string} deps.workspacePath
 * @param {Object} deps.webFetch
 * @param {Function} deps.memorySearch
 * @param {Function} deps.memoryCreate
 * @param {Function} deps.archiveSearch
 * @param {Function} deps.skillCreate
 * @param {Function} deps.skillList
 * @param {Function} deps.skillEdit
 * @param {Function} deps.profileUpdate
 * @returns {Function} async (name, input) => { content: string, is_error?: boolean }
 */
// createToolExecutor()
// WHAT THIS DOES: createToolExecutor creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call createToolExecutor(...) before code that depends on this setup.
function createToolExecutor(deps) {
  const workspaceTools = require('../brain/skills/workspace-tools');

  return async function executeToolCall(name, input) {
    const params = input || {};
    const jsonStr = JSON.stringify(params);
    const syntheticText = `[TOOL:${name} ${jsonStr}]`;

    try {
      const result = await workspaceTools.executeToolCalls(syntheticText, deps);
      if (result.toolResults && result.toolResults.length > 0) {
        const r = result.toolResults[0];
        const content = r.ok
          ? (typeof r.result === 'string' ? r.result : JSON.stringify(r.result))
          : (r.result?.error || r.error || 'Tool execution failed');
        return { content, is_error: !r.ok };
      }
      return { content: `Tool ${name} produced no result`, is_error: true };
    } catch (e) {
      return { content: `Tool execution error: ${e.message}`, is_error: true };
    }
  };
}

module.exports = {
  TOOL_DEFS,
  buildToolSchemas,
  buildAnthropicTools,
  buildOpenRouterTools,
  parseAnthropicResponse,
  parseOpenRouterResponse,
  formatAnthropicToolResults,
  formatOpenRouterToolResults,
  isWorkspaceTool,
  createToolExecutor
};
