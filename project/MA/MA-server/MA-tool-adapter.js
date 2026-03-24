// ── MA Tool Adapter ──────────────────────────────────────────────────────────
// Converts MA's tool definitions to provider-specific function calling schemas,
// parses native tool calls from responses, and formats tool results for re-injection.
// Text-based [TOOL:...] parsing remains in MA-workspace-tools.js for Ollama fallback.
'use strict';

// ── Tool Definitions ────────────────────────────────────────────────────────
// Central registry of MA tools with schemas for native function calling.
const TOOL_DEFS = [
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
    description: 'Read a file from the workspace. Returns the file content as text (capped at 32KB).',
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
    name: 'cmd_run',
    description: 'Execute a shell command in the workspace directory. Returns stdout, stderr, and exit code.',
    parameters: {
      type: 'object',
      properties: { cmd: { type: 'string', description: 'Shell command to execute.' } },
      required: ['cmd']
    }
  },
  {
    name: 'memory_search',
    description: 'Search episodic and semantic memory for relevant past context.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for memory.' },
        limit: { type: 'number', description: 'Max results (1-20, default 5).' }
      },
      required: ['query']
    }
  }
];

// ── Schema Builders ─────────────────────────────────────────────────────────

/** Build Anthropic-format tool schemas. */
function buildAnthropicTools() {
  return TOOL_DEFS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters
  }));
}

/** Build OpenAI/OpenRouter-format tool schemas. */
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

/** Build tool schemas for the given provider type. */
function buildToolSchemas(providerType) {
  if (providerType === 'anthropic') return buildAnthropicTools();
  return buildOpenRouterTools();
}

// ── Response Parsers ────────────────────────────────────────────────────────

/**
 * Extract tool calls from an Anthropic response.
 * @param {object} data - Raw Anthropic API response
 * @returns {{ content: string, toolCalls: Array<{ id: string, name: string, input: object }> }}
 */
function parseAnthropicResponse(data) {
  const textParts = [];
  const toolCalls = [];

  for (const block of (data.content || [])) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input || {}
      });
    }
    // Skip thinking blocks
  }

  return {
    content: textParts.join('').trim(),
    toolCalls
  };
}

/**
 * Extract tool calls from an OpenRouter/OpenAI response.
 * @param {object} data - Raw OpenRouter API response
 * @returns {{ content: string, toolCalls: Array<{ id: string, name: string, input: object }> }}
 */
function parseOpenRouterResponse(data) {
  const msg = data.choices?.[0]?.message;
  if (!msg) return { content: '', toolCalls: [] };

  const toolCalls = (msg.tool_calls || []).map(tc => ({
    id: tc.id,
    name: tc.function?.name || '',
    input: JSON.parse(tc.function?.arguments || '{}')
  }));

  return {
    content: (msg.content || '').trim(),
    toolCalls
  };
}

// ── Result Formatters ───────────────────────────────────────────────────────

/**
 * Format tool execution results for Anthropic tool_result injection.
 * @param {Array<{ id: string, tool: string, result: string, ok: boolean }>} results
 * @returns {Array<object>} Anthropic-format tool_result content blocks
 */
function formatAnthropicToolResults(results) {
  return results.map(r => ({
    type: 'tool_result',
    tool_use_id: r.id,
    content: r.ok ? r.result : `ERROR: ${r.result}`,
    ...(r.ok ? {} : { is_error: true })
  }));
}

/**
 * Format tool execution results for OpenRouter tool message injection.
 * @param {Array<{ id: string, tool: string, result: string, ok: boolean }>} results
 * @returns {Array<object>} OpenRouter-format tool messages
 */
function formatOpenRouterToolResults(results) {
  return results.map(r => ({
    role: 'tool',
    tool_call_id: r.id,
    content: r.ok ? r.result : `ERROR: ${r.result}`
  }));
}

module.exports = {
  TOOL_DEFS,
  buildToolSchemas,
  buildAnthropicTools,
  buildOpenRouterTools,
  parseAnthropicResponse,
  parseOpenRouterResponse,
  formatAnthropicToolResults,
  formatOpenRouterToolResults
};
