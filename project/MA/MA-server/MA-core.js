// ── MA Core ─────────────────────────────────────────────────────────────────
// Shared bootstrap, state, and chat orchestration for MA.
// Both MA-Server.js (HTTP) and MA-cli.js (terminal) import this.
// No HTTP, no readline — pure logic + state.
'use strict';

const fs   = require('fs');
const path = require('path');

const { callLLM }           = require('./MA-llm');
const { createMemoryStore } = require('./MA-memory');
const tasks                 = require('./MA-tasks');
const wsTools               = require('./MA-workspace-tools');
const health                = require('./MA-health');
const agentCatalog          = require('./MA-agents');
const projectArchive        = require('./MA-project-archive');
const modelRouter           = require('./MA-model-router');
const worklog               = require('./MA-worklog');
const { DEFAULT_AGENTS, DEFAULT_ENTITY } = require('../MA-scripts/agent-definitions');

// ── Paths ───────────────────────────────────────────────────────────────────
const MA_ROOT       = path.join(__dirname, '..');
const CONFIG_PATH   = path.join(MA_ROOT, 'MA-Config', 'ma-config.json');
const ENTITY_DIR    = path.join(MA_ROOT, 'MA-entity', 'entity_ma');
let   WORKSPACE_DIR = path.join(MA_ROOT, 'MA-workspace');
const KNOWLEDGE_DIR = path.join(MA_ROOT, 'MA-knowledge');

// ── State ───────────────────────────────────────────────────────────────────
let config = null;    // { type, endpoint, apiKey, model, vision? }
let memory = null;    // memory store instance
let entity = null;    // entity.json contents
let skills = [];      // loaded skill contents [{ name, content }]

// ── Bootstrap ───────────────────────────────────────────────────────────────

function ensureDirs() {
  for (const d of [
    WORKSPACE_DIR,
    path.join(ENTITY_DIR, 'memories', 'episodic'),
    path.join(ENTITY_DIR, 'memories', 'semantic'),
    path.join(ENTITY_DIR, 'index')
  ]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function loadConfig() {
  const configDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  if (!fs.existsSync(CONFIG_PATH)) {
    const example = path.join(MA_ROOT, 'ma-config.example.json');
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, CONFIG_PATH);
      console.log('  Created MA-Config/ma-config.json from template — edit it or use the GUI');
    }
  }

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (raw.apiKey && raw.apiKey !== 'YOUR_API_KEY_HERE') {
        config = raw;
        console.log(`  Config loaded: ${config.type}/${config.model}`);
      } else if (raw.type === 'ollama') {
        config = raw;
        console.log(`  Config loaded: ${config.type}/${config.model}`);
      } else {
        console.log('  Config file exists but needs API key — configure via GUI or CLI');
      }
      // Apply workspace path override from config
      if (config && config.workspacePath) {
        const resolved = path.resolve(config.workspacePath);
        if (fs.existsSync(resolved)) {
          WORKSPACE_DIR = resolved;
          console.log(`  Workspace path: ${WORKSPACE_DIR}`);
        } else {
          console.warn(`  Workspace path not found: ${resolved} — using default`);
        }
      }
    }
  } catch (e) { console.warn('  Config load failed:', e.message); }
}

function loadEntity() {
  const p = path.join(ENTITY_DIR, 'entity.json');
  try {
    if (fs.existsSync(p)) {
      entity = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log(`  Entity loaded: ${entity.name || 'MA'}`);
    }
  } catch (e) { console.warn('  Entity load failed:', e.message); }
}

function loadSkills() {
  const skillsDir = path.join(ENTITY_DIR, 'skills');
  skills = [];
  try {
    if (fs.existsSync(skillsDir)) {
      const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const content = fs.readFileSync(path.join(skillsDir, f), 'utf8');
        skills.push({ name: f.replace(/\.md$/, ''), content });
      }
      if (skills.length) console.log(`  Skills loaded: ${skills.length} (${skills.map(s => s.name).join(', ')})`);
    }
  } catch (e) { console.warn('  Skills load failed:', e.message); }
}

function initMemory() {
  memory = createMemoryStore('ma');
  console.log('  Memory store ready');
}

/** Ensure the MA entity.json exists — recreate from defaults if missing. */
function ensureEntity() {
  const p = path.join(ENTITY_DIR, 'entity.json');
  if (fs.existsSync(p)) return;
  console.log('  Entity missing — provisioning default MA entity...');
  fs.mkdirSync(ENTITY_DIR, { recursive: true });
  const entityDef = { ...DEFAULT_ENTITY, createdAt: new Date().toISOString() };
  fs.writeFileSync(p, JSON.stringify(entityDef, null, 2));
  // Ensure skills directory exists
  const skillsDir = path.join(ENTITY_DIR, 'skills');
  if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
  console.log('  Entity provisioned: MA');
}

/** Ensure default agents exist — seed any that are missing. */
function ensureAgents() {
  const existing = agentCatalog.listAgents();
  const existingIds = new Set(existing.map(a => a.id));
  let created = 0;
  for (const def of DEFAULT_AGENTS) {
    if (existingIds.has(def.id)) continue;
    const result = agentCatalog.createAgent(def);
    if (result.ok) {
      console.log(`  Agent provisioned: ${def.name} (${def.id})`);
      created++;
    }
  }
  if (created) {
    console.log(`  ${created} agent(s) auto-provisioned`);
  } else {
    console.log(`  Agents OK: ${existing.length} in catalog`);
  }
}

/** Full bootstrap sequence. Call once at startup. */
function boot() {
  console.log('\n  MA — Memory Architect');
  console.log('  ' + '─'.repeat(36));
  ensureDirs();
  loadConfig();
  ensureEntity();
  loadEntity();
  loadSkills();
  ensureAgents();
  initMemory();
}

// ── State getters (for server/CLI to read) ──────────────────────────────────

function getConfig()    { return config; }
function getMemory()    { return memory; }
function getEntity()    { return entity; }
function isConfigured() { return !!config; }

function setConfig(newConfig) {
  config = newConfig;
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  // Apply workspace path if changed
  if (newConfig.workspacePath) {
    const resolved = path.resolve(newConfig.workspacePath);
    if (fs.existsSync(resolved)) WORKSPACE_DIR = resolved;
  } else {
    WORKSPACE_DIR = path.join(MA_ROOT, 'MA-workspace');
  }
}

// ── Knowledge loader ────────────────────────────────────────────────────────

/**
 * Load a knowledge doc by name (filename without extension in knowledge/).
 * Returns the doc content or null.
 */
function loadKnowledge(name) {
  const p = path.join(KNOWLEDGE_DIR, name.endsWith('.md') ? name : name + '.md');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

/** List available knowledge docs. */
function listKnowledge() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
  return fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
}

// ── Token estimation ────────────────────────────────────────────────────────
// Rough heuristic: 1 token ≈ 4 characters for English text
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function estimateMessagesTokens(messages) {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content) + 4; // +4 per message overhead
  }
  return total;
}

// ── History compression ─────────────────────────────────────────────────────
// When history is too large for the context window, compress older turns into
// a single summary message, keeping recent turns verbatim.
async function compressHistory(hist, maxHistoryTokens, llmConfig) {
  if (!hist.length) return hist;
  const totalTokens = estimateMessagesTokens(hist);
  if (totalTokens <= maxHistoryTokens) return hist;

  // Keep the most recent 4 turns verbatim, compress the rest
  const keepRecent = Math.min(4, hist.length);
  const recent = hist.slice(-keepRecent);
  const older  = hist.slice(0, -keepRecent);

  if (!older.length) return recent;

  // Build a summary of older turns without LLM if possible (fast path)
  const olderText = older.map(m => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n');
  if (estimateTokens(olderText) <= 600) {
    // Small enough — use a simple text summary
    return [
      { role: 'system', content: `[Compressed Earlier Conversation]\n${olderText}` },
      ...recent
    ];
  }

  // LLM-powered compression for large histories
  try {
    const compressPrompt = older.map(m => `${m.role}: ${(m.content || '').slice(0, 300)}`).join('\n');
    const summary = await callLLM(llmConfig, [
      { role: 'system', content: 'Summarize this conversation history in 3-5 bullet points. Be extremely concise. Focus on key decisions, files modified, and current task state.' },
      { role: 'user', content: compressPrompt }
    ], { temperature: 0.3, maxTokens: 512 });
    return [
      { role: 'system', content: `[Compressed Earlier Conversation]\n${summary}` },
      ...recent
    ];
  } catch {
    // Fallback: just truncate older messages
    const trimmed = older.map(m => ({
      role: m.role,
      content: (m.content || '').slice(0, 100) + '...'
    }));
    return [...trimmed.slice(-2), ...recent];
  }
}

// ── Chat handler (shared between server + CLI) ──────────────────────────────

async function handleChat({ message, history = [], attachments = [], onStep, onActivity }) {
  if (!config) throw new Error('No LLM configured. Run /config or POST /api/config first.');
  if (!message) throw new Error('No message');

  const entityName = entity?.name || 'MA';
  const intent = tasks.classify(message);
  const chainId = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // ── Inline file-path detection ──────────────────────────────────────
  // Scan user message for workspace-relative paths, read them, inject as context
  let fileCtx = '';
  try {
    // Match common path patterns pointing inside the workspace
    const pathPatterns = /(?:^|\s|["'`(])(\/?(?:[\w.-]+\/)+[\w.-]+\.\w{1,10})(?=[\s"'`),;:?!]|$)/gm;
    const detected = new Set();
    let pm;
    while ((pm = pathPatterns.exec(message))) {
      const raw = pm[1].replace(/^\//, '');
      if (raw.length > 2 && raw.includes('/')) detected.add(raw);
    }
    // Also check for bare filenames like "package.json" if they exist at workspace root
    const bareFile = /(?:^|\s)([\w.-]+\.\w{1,10})(?=[\s,;:]|$)/g;
    while ((pm = bareFile.exec(message))) {
      const name = pm[1];
      if (name.includes('.') && fs.existsSync(path.join(WORKSPACE_DIR, name))) {
        detected.add(name);
      }
    }
    const fileContents = [];
    for (const rel of detected) {
      try {
        const abs = path.resolve(WORKSPACE_DIR, rel);
        if (!abs.startsWith(path.resolve(WORKSPACE_DIR))) continue; // safety
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
        const size = fs.statSync(abs).size;
        if (size > 32768) {
          fileContents.push(`[File: ${rel}] (${(size/1024).toFixed(1)}KB — too large, showing first 32KB)\n${fs.readFileSync(abs, 'utf8').slice(0, 32768)}`);
        } else {
          fileContents.push(`[File: ${rel}]\n${fs.readFileSync(abs, 'utf8')}`);
        }
      } catch { /* skip unreadable */ }
    }
    if (fileContents.length) {
      fileCtx = '\n[Referenced Files]\n' + fileContents.join('\n\n');
    }
  } catch { /* ignore detection errors */ }

  // ── Dragged / attached file contents ────────────────────────────────
  let attachCtx = '';
  const imageAttachments = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    const textParts = [];
    for (const a of attachments.slice(0, 5)) {
      const name = typeof a.name === 'string' ? a.name : 'file';
      if (a.type === 'image' && typeof a.content === 'string') {
        imageAttachments.push({ name, dataUrl: a.content, mime: a.mime || 'image/png' });
      } else {
        const content = typeof a.content === 'string' ? a.content.slice(0, 131072) : '';
        textParts.push(`[Attached: ${name}]\n${content}`);
      }
    }
    if (textParts.length) attachCtx = '\n[User Attachments]\n' + textParts.join('\n\n');
    if (imageAttachments.length) {
      attachCtx += `\n[Images Attached: ${imageAttachments.map(i => i.name).join(', ')}]`;
    }
  }

  // Retrieve relevant memories
  const memResults = memory ? memory.search(message, 3) : [];
  const memCtx = memResults.length
    ? '\n[Relevant Memories]\n' + memResults.map(m => `- ${(m.summary || m.content || '').slice(0, 200)}`).join('\n')
    : '';
  if (memResults.length && onActivity) await onActivity('memory_search', `Found ${memResults.length} relevant memories`);

  // Check if any knowledge docs are relevant (load architecture/best-practice context)
  let knowledgeCtx = '';
  const knowledgeDocs = listKnowledge();
  if (knowledgeDocs.length > 0) {
    // Simple keyword matching — load docs whose name appears in the message
    const msgLow = message.toLowerCase();
    const relevant = knowledgeDocs.filter(d => {
      const stem = d.replace('.md', '').replace(/-/g, ' ').toLowerCase();
      return stem.split(' ').some(w => w.length >= 4 && msgLow.includes(w));
    });
    if (relevant.length > 0) {
      const loaded = relevant.slice(0, 2).map(d => {
        const content = loadKnowledge(d);
        return content ? `[Knowledge: ${d}]\n${content.slice(0, 3000)}` : '';
      }).filter(Boolean);
      if (loaded.length) {
        knowledgeCtx = '\n' + loaded.join('\n\n');
        if (onActivity) await onActivity('knowledge_load', `Loaded ${loaded.length} knowledge doc(s)`);
      }
    }
  }

  // Auto-scan workspace for project visibility (with manifest details)
  let workspaceCtx = '';
  try {
    if (fs.existsSync(WORKSPACE_DIR)) {
      const entries = fs.readdirSync(WORKSPACE_DIR).filter(f => {
        const full = path.join(WORKSPACE_DIR, f);
        return fs.statSync(full).isDirectory();
      });
      if (entries.length > 0) {
        const projectLines = [];
        for (const dir of entries) {
          const manifestPath = path.join(WORKSPACE_DIR, dir, 'PROJECT-MANIFEST.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              const layers = manifest.layers || manifest.parts || {};
              const layerCount = Object.keys(layers).length;
              const statuses = Object.values(layers).map(l => l.status);
              const done = statuses.filter(s => s === 'complete' || s === 'done').length;
              projectLines.push(`- ${dir}/ — ${manifest.description || manifest.project || dir} (${done}/${layerCount} layers complete)`);
            } catch { projectLines.push(`- ${dir}/`); }
          } else {
            projectLines.push(`- ${dir}/`);
          }
        }
        workspaceCtx = '\n[Workspace Projects — YOUR active projects]\n' + projectLines.join('\n');
        workspaceCtx += '\nYou built these projects. When the user asks to continue or start one, read its PROJECT-MANIFEST.json and BUILD-ORDER.md for full context.';
        if (onActivity) await onActivity('workspace_scan', `Found ${entries.length} workspace project(s)`);
      }
    }
  } catch { /* ignore scan errors */ }

  // List active/closed project archives
  let archiveCtx = '';
  try {
    const projects = projectArchive.listProjects();
    if (projects.length > 0) {
      archiveCtx = '\n[Project Archives]\n' + projects.map(p =>
        `- ${p.id} (${p.status}) — ${p.name}${p.nodeCount ? `, ${p.nodeCount} nodes` : ''}`
      ).join('\n');
    }
  } catch { /* ignore */ }

  // Load relevant entity skills
  let skillsCtx = '';
  if (skills.length > 0) {
    const msgLow = message.toLowerCase();
    const relevant = skills.filter(s => {
      const words = s.name.replace(/-/g, ' ').split(' ');
      return words.some(w => w.length >= 3 && msgLow.includes(w));
    });
    const toLoad = relevant.length > 0 ? relevant.slice(0, 2) : [];
    if (toLoad.length) {
      skillsCtx = '\n[Active Skills]\n' + toLoad.map(s => s.content.slice(0, 1500)).join('\n\n');
    }
  }

  const maxTokens = config.maxTokens || 12288;

  // ── Token budget estimation ─────────────────────────────────────────
  // Reserve 20% of maxTokens for the response, rest is context budget
  const responseReserve = Math.floor(maxTokens * 0.20);
  const contextBudget   = maxTokens - responseReserve;

  let sysPrompt = `You are ${entityName}, a minimal Memory Architect. You help with memory storage, research, coding, and self-repair.

[Available Tools]
ws_list, ws_read, ws_write, ws_append, ws_delete, ws_mkdir, ws_move, web_search, web_fetch, cmd_run, memory_search

[Tool Syntax — STRICT]
Tools use JSON parameters. Two formats:

INLINE (for simple tools):
[TOOL:tool_name {"param":"value"}]

BLOCK (for ws_write and ws_append — file content goes between tags):
[TOOL:ws_write {"path":"file.js"}]
file content here
[/TOOL]

Examples:
[TOOL:ws_list {"path":"myproject"}]
[TOOL:ws_read {"path":"myproject/package.json"}]
[TOOL:ws_write {"path":"myproject/hello.txt"}]
Hello world content here
[/TOOL]
[TOOL:ws_delete {"path":"old-file.js"}]
[TOOL:ws_move {"src":"old.js","dst":"new.js"}]
[TOOL:cmd_run {"cmd":"npm test"}]
[TOOL:web_search {"query":"node.js streams"}]
[TOOL:memory_search {"query":"previous conversation about APIs"}]

RULES:
- Parameters MUST be valid JSON: {"key":"value"}
- File content goes AFTER the opening tag, closed with [/TOOL]
- Do NOT put file content inside the JSON — use the block format
- Do NOT wrap tool calls in code fences, quotes, or backticks
- One tool per block. Do NOT nest tool calls.

[Code Output — MANDATORY]
ALWAYS write code to workspace files using [TOOL:ws_write]. NEVER paste raw code blocks into the chat.
If the user asks you to write, create, build, or implement code — use ws_write to put it in a file.
The user sees your chat response — keep it conversational (what you're doing, what you built). The actual code goes in files.

[Writing Large Files]
Your response has a token limit. When writing files that might be large (>80 lines):
1. Use [TOOL:ws_write {"path":"file"}] with [/TOOL] for the FIRST chunk
2. Use [TOOL:ws_append {"path":"file"}] with [/TOOL] for EACH additional chunk
3. Tell the user "I'll write this in parts" so they know to wait
4. After writing all parts, verify with [TOOL:ws_read {"path":"file"}]
Never try to output an entire large file in one response — split it across multiple tool calls.

[Script Review — MANDATORY]
After you finish writing or editing ANY script/code file:
1. ALWAYS read it back with [TOOL:ws_read {"path":"file"}] to verify it's complete
2. Check for: missing closing brackets, incomplete functions, truncated content, syntax errors
3. If the file is incomplete or has errors, continue writing the missing parts using [TOOL:ws_append {"path":"file"}] with [/TOOL] then verify again
4. Only tell the user you're done AFTER you've verified the file is complete

[Token Budget Awareness]
Your max response is ~${responseReserve} tokens (~${responseReserve * 4} chars). Context budget: ~${contextBudget} tokens.
If you are writing a long response or large file and feel you are getting close to your limit:
1. STOP at a logical breakpoint (end of a function, end of a section)
2. Output this marker on its own line: [CONTINUE_FROM: <brief description of where you stopped>]
3. Tell the user what was completed and what remains
The user can then say "continue" and you will resume from that point.
Do NOT try to rush or compress your output to fit — it's better to stop cleanly and continue.${skillsCtx}${memCtx}${knowledgeCtx}${workspaceCtx}${archiveCtx}${fileCtx}${attachCtx}`;

  // Worklog context for session continuity
  const wlSummary = worklog.getSummaryForPrompt();
  if (wlSummary) {
    const wlBlock = '\n[Session Worklog — your work history]\n' + wlSummary;
    sysPrompt += wlBlock;
    if (onActivity) await onActivity('worklog', 'Loaded session worklog');
  }

  // ── Task path ───────────────────────────────────────────────────────
  if (intent.intent === 'task' && intent.confidence >= 0.2) {
    // Route to best available model for this task type
    const routed = modelRouter.routeModel(message, intent.taskType, null, config);
    const taskLLMConfig = routed.config;

    worklog.setActiveTask(message.slice(0, 100), null, null);
    if (onActivity) await onActivity('llm_call', `Starting ${intent.taskType} task...`);

    const result = await tasks.runTask({
      taskType: intent.taskType,
      message,
      entityName,
      callLLM: (msgs, opts) => callLLM(taskLLMConfig, msgs, opts),
      execTools: wsTools.executeToolCalls,
      formatResults: wsTools.formatToolResults,
      stripTools: wsTools.stripToolCalls,
      workspacePath: WORKSPACE_DIR,
      memorySearch: memory ? (q, l) => memory.search(q, l) : null,
      onStep,
      onActivity,
      agentCatalog
    });

    // Record model performance if routed
    if (routed.routed && routed.modelId) {
      const grade = result.finalResponse ? 'B' : 'F';
      const lang = modelRouter.evaluateJob(message, intent.taskType).language;
      modelRouter.recordPerformance(routed.modelId, intent.taskType, lang, grade);
    }

    if (memory) memory.store('episodic', `Task (${intent.taskType}): ${message}\nResult: ${(result.finalResponse || '').slice(0, 500)}`, { topics: [intent.taskType], chainId });
    worklog.recordTask(intent.taskType, message.slice(0, 100), result.steps?.length || 0, 'complete');
    console.log('[DEBUG-CORE] Task path filesChanged:', JSON.stringify(result.filesChanged));
    return {
      reply: result.finalResponse,
      taskType: intent.taskType,
      steps: result.steps?.length || 0,
      filesChanged: result.filesChanged || [],
      ...(routed.routed ? { routedModel: routed.modelId, routeReason: routed.reason } : {})
    };
  }

  // ── Conversational path ─────────────────────────────────────────────
  // Inject blueprint guidance if classify detected a task type (even at low confidence)
  let convoBP = '';
  if (intent.taskType) {
    const bp = tasks.getBlueprint(intent.taskType, 'execute');
    if (bp) convoBP = `\n\n[${intent.taskType} Guidelines — follow these when handling this kind of request]\n${bp}`;
  }
  if (convoBP) sysPrompt += convoBP;

  // Compress history if it's too large for context budget
  const sysTokens = estimateTokens(sysPrompt);
  const msgTokens = estimateTokens(message);
  const historyBudget = Math.max(0, contextBudget - sysTokens - msgTokens - 100);
  const compressedHistory = await compressHistory(history.slice(-10), historyBudget, config);

  const messages = [
    { role: 'system', content: sysPrompt },
    ...compressedHistory,
    { role: 'user', content: message }
  ];

  // ── Vision: inject image content blocks if model supports it ────────
  const hasVision = config.vision === true;
  if (imageAttachments.length && hasVision) {
    const userMsg = messages[messages.length - 1];
    const contentBlocks = [{ type: 'text', text: userMsg.content }];
    for (const img of imageAttachments) {
      contentBlocks.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }
    userMsg.content = contentBlocks;
  } else if (imageAttachments.length && !hasVision) {
    const userMsg = messages[messages.length - 1];
    userMsg.content += '\n\n(Note: ' + imageAttachments.length + ' image(s) were attached but your current model does not support vision. Set vision:true in your model config to enable image analysis.)';
  }

  // Log context usage for awareness
  const totalContextTokens = estimateMessagesTokens(messages);

  let reply = await callLLM(config, messages, { temperature: 0.7, maxTokens: responseReserve });

  const toolResults = await wsTools.executeToolCalls(reply, {
    workspacePath: WORKSPACE_DIR, webFetchEnabled: true, cmdRunEnabled: true,
    memorySearch: memory ? (q, l) => memory.search(q, l) : null
  });

  if (toolResults.length > 0) {
    if (onActivity) {
      for (const r of toolResults) await onActivity(r.ok ? 'tool_result' : 'error', `${r.tool}: ${r.result || (r.ok ? '' : 'FAILED')}`);
    }
    const clean = wsTools.stripToolCalls(reply);
    const toolBlock = wsTools.formatToolResults(toolResults);

    // Auto-verify: if any ws_write/ws_append happened, auto-read the written files
    const writtenFiles = toolResults
      .filter(r => r.ok && (r.tool === 'ws_write' || r.tool === 'ws_append'))
      .map(r => {
        const m = r.result && r.result.match(/^Wrote\s+\d+\s+bytes?\s+to\s+(.+)$/i);
        if (m) return m[1].trim();
        const a = r.result && r.result.match(/^Appended\s+\d+\s+bytes?\s+to\s+(.+)$/i);
        if (a) return a[1].trim();
        return null;
      })
      .filter(Boolean);

    let verifyBlock = '';
    if (writtenFiles.length > 0) {
      const uniqueFiles = [...new Set(writtenFiles)];
      const verifyResults = [];
      for (const filePath of uniqueFiles.slice(0, 3)) {
        try {
          const relPath = path.relative(WORKSPACE_DIR, filePath);
          const verifyText = `[TOOL: ws_read; ${relPath}]`;
          const vr = await wsTools.executeToolCalls(verifyText, {
            workspacePath: WORKSPACE_DIR, webFetchEnabled: false, cmdRunEnabled: false
          });
          if (vr.length > 0) verifyResults.push(...vr);
        } catch { /* skip verify errors */ }
      }
      if (verifyResults.length > 0) {
        verifyBlock = '\n\n[Auto-Verify: Files read back after write]\n' + wsTools.formatToolResults(verifyResults);
      }
    }

    reply = await callLLM(config, [
      { role: 'system', content: `You are ${entityName}. Incorporate tool results into your response. Be concise. Do NOT output [TOOL: ...] blocks — tools have already been executed.${writtenFiles.length ? '\n\nFiles were written and auto-verified. Check the verification results — if the file looks incomplete or has errors, tell the user what needs to be fixed and offer to continue.' : ''}` },
      { role: 'user', content: `${clean}\n\n${toolBlock}${verifyBlock}\n\nRespond naturally:` }
    ], { temperature: 0.6, maxTokens: responseReserve });
  }

  // Detect continuation marker in the reply
  const continueMatch = reply && reply.match(/\[CONTINUE_FROM:\s*([^\]]+)\]/);
  const continuationPoint = continueMatch ? continueMatch[1].trim() : null;

  if (memory) memory.store('episodic', `Chat: ${message}\nReply: ${(reply || '').slice(0, 300)}`, { topics: ['conversation'], chainId });

  // Collect files changed during conversational tool use
  const filesChanged = toolResults
    .filter(r => r.ok && (r.tool === 'ws_write' || r.tool === 'ws_append'))
    .map(r => {
      const m = r.result && r.result.match(/^(?:Wrote|Appended)\s+\d+\s+bytes?\s+to\s+(.+)$/i);
      return m ? m[1].trim() : null;
    })
    .filter(Boolean);

  console.log('[DEBUG-CORE] Convo path toolResults count:', toolResults.length, 'filesChanged:', JSON.stringify(filesChanged));
  return {
    reply,
    filesChanged: [...new Set(filesChanged)],
    ...(continuationPoint ? { continuationPoint } : {}),
    contextUsage: { contextTokens: totalContextTokens, contextBudget, responseReserve }
  };
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Bootstrap
  boot, ensureDirs, loadConfig, loadEntity, initMemory,
  // State
  getConfig, getMemory, getEntity, isConfigured, setConfig,
  // Chat
  handleChat,
  // Knowledge
  loadKnowledge, listKnowledge,
  // Re-exports for convenience
  health, tasks, wsTools, agentCatalog, projectArchive, modelRouter, worklog,
  // Paths
  MA_ROOT, CONFIG_PATH, ENTITY_DIR, WORKSPACE_DIR, KNOWLEDGE_DIR
};
