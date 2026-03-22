// ── MA Task Engine ───────────────────────────────────────────────────────────
// Merged intent classifier + blueprint loader + task runner.
// One file, no external task infrastructure dependencies.
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Task types (no planning/orchestration — MA is single-entity) ────────────
const TASK_TYPES = {
  architect:    { maxSteps: 10, maxLLM: 50 },
  delegate:     { maxSteps: 8,  maxLLM: 30 },
  code:         { maxSteps: 8,  maxLLM: 25 },
  research:      { maxSteps: 6,  maxLLM: 20 },
  deep_research: { maxSteps: 10, maxLLM: 40 },
  writing:       { maxSteps: 6,  maxLLM: 20 },
  analysis:     { maxSteps: 6,  maxLLM: 20 },
  project:      { maxSteps: 10, maxLLM: 40 },
  memory_query: { maxSteps: 3,  maxLLM: 10 },
  entity_genesis: { maxSteps: 10, maxLLM: 50 }
};

// ── Blueprint cache ─────────────────────────────────────────────────────────
const _bpCache = new Map();
const BP_DIR = path.join(__dirname, '..', 'MA-blueprints');

function _loadBP(filePath) {
  if (_bpCache.has(filePath)) return _bpCache.get(filePath);
  try {
    if (fs.existsSync(filePath)) {
      const c = fs.readFileSync(filePath, 'utf8').trim();
      _bpCache.set(filePath, c);
      return c;
    }
  } catch (_) {}
  _bpCache.set(filePath, '');
  return '';
}

function getBlueprint(taskType, phase) {
  const parts = [];
  const coreDir = path.join(BP_DIR, 'core', 'core');
  const modDir  = path.join(BP_DIR, 'modules', 'modules');

  if (phase === 'plan') {
    parts.push(_loadBP(path.join(coreDir, 'task-decomposition.md')));
    parts.push(_loadBP(path.join(modDir, `${taskType}.md`)));
  } else if (phase === 'execute') {
    parts.push(_loadBP(path.join(coreDir, 'tool-guide.md')));
    parts.push(_loadBP(path.join(coreDir, 'error-recovery.md')));
    parts.push(_loadBP(path.join(modDir, `${taskType}.md`)));
  } else if (phase === 'summarize') {
    parts.push(_loadBP(path.join(coreDir, 'quality-gate.md')));
    parts.push(_loadBP(path.join(coreDir, 'output-format.md')));
  }
  return parts.filter(Boolean).join('\n\n---\n\n');
}

// ── Intent classifier (rule-based, no LLM fallback) ────────────────────────
const RULES = {
  delegate: {
    kw: ['delegate','dispatch','assign','hire','agent','roster','catalog','team','who can','available agents','send to','hand off'],
    re: [/(?:delegate|dispatch|assign|send).{0,50}(?:to|agent|coder|engineer|researcher|reviewer|tester)/i, /(?:hire|create).{0,30}(?:agent|coder|engineer)/i, /(?:who|which|list|show).{0,30}(?:agent|roster|team|available)/i, /(?:check|scan).{0,30}(?:roster|catalog|agents)/i]
  },
  architect: {
    kw: ['architect','project plan','detailed plan','plan out','blueprint','specification','requirements gathering','design document','scaffold plan'],
    re: [/(?:plan|design|architect|spec).{0,50}(?:project|system|app|application)/i, /(?:create|generate|build|write).{0,50}(?:plan|blueprint|specification|architecture)/i, /generate the project plan/i]
  },
  code: {
    kw: ['code','write','develop','implement','create','build','function','script','program','debug','fix','refactor','test','error','bug','api','file','command','run','execute','compile','python','javascript','html','css','rust'],
    re: [/(?:write|create|build|implement).{0,50}(?:code|function|script|app)/i, /(?:fix|debug|refactor).{0,50}(?:code|bug|error)/i]
  },
  deep_research: {
    kw: ['deep dive','deep research','deep-dive','extensive research','comprehensive report','detailed report','research paper','white paper','full report','in-depth research','thorough research'],
    re: [/deep\s*dive\s*(?:research|into|on|about)/i, /(?:deep|extensive|exhaustive|thorough|comprehensive|in-depth).{0,30}(?:research|investigation|report|paper|study|analysis)/i, /(?:write|create|produce).{0,30}(?:detailed|comprehensive|extensive|full).{0,30}(?:report|paper|article|study)/i]
  },
  research: {
    kw: ['research','find','search','look up','investigate','explore','what is','how many','why is','web','source'],
    re: [/(?:find|search|research|investigate).{0,50}(?:about|for|on)/i, /\b(?:what|who|where|when|why|how)\b.{0,80}\b(?:is|are|was|were)\b/i]
  },
  writing: {
    kw: ['compose','draft','article','blog','document','essay','guide','tutorial','story','summarize','summary','email','outline'],
    re: [/(?:write|compose|draft).{0,80}(?:content|article|blog|guide|email|story)/i, /(?:summarize|summary).{0,80}(?:article|document|text)/i]
  },
  analysis: {
    kw: ['analyze','analysis','breakdown','compare','evaluate','assess','examine','pattern','trend','insight','data','pros','cons'],
    re: [/(?:analyze|break down|examine).{0,50}(?:data|information|results)/i, /(?:compare|evaluate|assess).{0,50}(?:options|approaches)/i]
  },
  project: {
    kw: ['project','scaffold','setup','generate','starter','template','boilerplate','full app'],
    re: [/(?:create|build|scaffold).{0,50}(?:project|app|application)/i]
  },
  memory_query: {
    kw: ['remember','recall','memory','what did','when did','past','previous','earlier','talked about','mentioned','history'],
    re: [/(?:remember|recall|do you remember).{0,50}(?:when|what|where)/i, /(?:what).{0,30}(?:did).{0,30}(?:talk|discuss)/i]
  },
  entity_genesis: {
    kw: ['entity','genesis','create entity','forge entity','new entity','character','backstory','persona','birth','evolve entity','spawn entity','generate entity','entity creation','build entity','bring to life'],
    re: [/(?:create|forge|birth|spawn|generate|build|make).{0,50}(?:entity|character|persona|being)/i, /entity.{0,30}(?:genesis|creation|evolution|backstory)/i, /(?:evolve|enrich|develop).{0,50}(?:entity|character|persona)/i]
  }
};

const CONVO_KW = ['hello','hi','hey','how are you','thanks','thank you','what do you think','your opinion','chat','talk'];

function _score(msg, kw, re) {
  const low = msg.toLowerCase();
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let kwHits = kw.filter(k => new RegExp(`(^|\\W)${esc(k).replace(/\s+/g, '\\s+')}($|\\W)`, 'i').test(low)).length;
  let reHits = re.filter(r => r.test(msg)).length;
  return Math.min(kwHits * 0.2, 0.6) + Math.min(reHits * 0.35, 0.6);
}

/** Classify message → { intent: 'task'|'conversation', taskType, confidence } */
function classify(message) {
  if (!message || typeof message !== 'string') return { intent: 'conversation', taskType: null, confidence: 0 };

  let best = null, bestScore = 0;
  for (const [type, r] of Object.entries(RULES)) {
    const s = _score(message, r.kw, r.re);
    if (s > bestScore) { bestScore = s; best = type; }
  }

  const convoScore = _score(message, CONVO_KW, [/^(?:hello|hi|hey|what's up|how are you).{0,30}$/i]);
  if (bestScore >= 0.2 && bestScore >= convoScore + 0.05) {
    return { intent: 'task', taskType: best, confidence: bestScore };
  }
  return { intent: 'conversation', taskType: null, confidence: convoScore };
}

// ── Task runner ─────────────────────────────────────────────────────────────
const PLAN_RE = /\[TASK_PLAN\]([\s\S]*?)\[\/TASK_PLAN\]/;

function parsePlan(text, maxSteps = 6) {
  if (!text) return null;
  const m = PLAN_RE.exec(text);
  if (!m) return null;
  const steps = [];
  for (const line of m[1].split('\n').map(l => l.trim()).filter(Boolean)) {
    const sm = line.match(/^(?:[-*]|\d+[.)]\s*)(?:\[[ x]\]\s*)?(.+)$/);
    if (sm && sm[1].trim()) steps.push({ description: sm[1].trim(), done: false });
  }
  return steps.length ? { steps: steps.slice(0, maxSteps) } : null;
}

/**
 * Run a task: LLM generates plan → execute each step with tool calls.
 * @param {object} opts
 *   - taskType {string}
 *   - message {string}
 *   - entityName {string}
 *   - callLLM {Function} async (messages, opts) => string
 *   - execTools {Function} async (text, toolOpts) => [{tool, result, ok}]
 *   - formatResults {Function} (results) => string
 *   - stripTools {Function} (text) => string
 *   - workspacePath {string}
 *   - onStep {Function?} async (stepInfo) => void
 * @returns {Promise<{finalResponse, steps, llmCalls}>}
 */
async function runTask(opts) {
  const { taskType = 'code', message, entityName = 'MA', callLLM, execTools,
          formatResults, stripTools, workspacePath = '', memorySearch, onStep, onActivity, agentCatalog } = opts;

  if (!callLLM) throw new Error('runTask: callLLM required');
  if (!message) throw new Error('runTask: message required');

  const limits = TASK_TYPES[taskType] || { maxSteps: 6, maxLLM: 20 };
  let llmCalls = 0;
  const allWrittenFiles = [];

  // Phase 1: Generate plan
  const planBP = getBlueprint(taskType, 'plan');
  const planSys = `You are ${entityName}. Create a step-by-step task plan using [TASK_PLAN]...[/TASK_PLAN] blocks.` +
    (planBP ? `\n\n[Planning Instructions]\n${planBP}` : '');
  if (onActivity) await onActivity('llm_call', 'Generating task plan...');
  const planResp = await callLLM([
    { role: 'system', content: planSys },
    { role: 'user', content: `${message}\n\nCreate a concise task plan.` }
  ], { temperature: 0.7 });
  llmCalls++;

  const plan = parsePlan(planResp, limits.maxSteps);
  if (!plan) {
    // Single-step direct response
    if (onStep) await onStep({ stepIndex: 0, stepTotal: 1, description: 'Execute task', output: planResp });
    if (onActivity) await onActivity('step_done', 'Single-step task completed');
    return { finalResponse: planResp, steps: [{ step: 1, description: 'Execute task', output: planResp }], llmCalls };
  }

  // Fire plan activity with step list for the activity monitor
  if (onActivity) await onActivity('plan', `Task plan: ${plan.steps.length} steps`, { steps: plan.steps.map(s => s.description) });

  // Phase 2: Execute steps
  const execBP = getBlueprint(taskType, 'execute');
  const stepOutputs = [];

  // Agent dispatch: find matching agent for this task type
  let dispatchedAgent = null;
  let agentCtx = '';
  if (agentCatalog) {
    const roleMap = { code: 'coder', research: 'researcher', writing: 'writer', architect: 'architect', analysis: 'researcher', project: 'architect', entity_genesis: 'architect' };
    const role = roleMap[taskType];
    if (role) {
      const agents = agentCatalog.findAgentsByRole(role);
      if (agents.length) {
        const seniorityOrder = { lead: 4, senior: 3, mid: 2, junior: 1 };
        dispatchedAgent = agents.sort((a, b) => (seniorityOrder[b.seniority] || 0) - (seniorityOrder[a.seniority] || 0))[0];
        agentCtx = `\n[Agent: ${dispatchedAgent.name} (${dispatchedAgent.role}, ${dispatchedAgent.seniority})]\n${dispatchedAgent.systemPrompt || ''}`;
        if (onActivity) await onActivity('agent_dispatch', `Assigned ${dispatchedAgent.name} (${dispatchedAgent.role}, ${dispatchedAgent.seniority})`, { agentId: dispatchedAgent.id, role: dispatchedAgent.role });
      }
    }
  }

  for (let i = 0; i < plan.steps.length && llmCalls < limits.maxLLM; i++) {
    const step = plan.steps[i];
    if (onActivity) await onActivity('step_start', `Step ${i + 1}: ${step.description}`);

    // Build step prompt
    let prompt = `ORIGINAL REQUEST: "${message}"\n\n`;
    prompt += `► Step ${i + 1} of ${plan.steps.length}: ${step.description}\n\n`;
    if (stepOutputs.length) {
      prompt += 'COMPLETED:\n' + stepOutputs.map(s => `  ✓ ${s.step}. ${s.description} — ${(s.output || '').slice(0, 150)}`).join('\n') + '\n\n';
    }
    prompt += `Execute step ${i + 1} now. Write files with [TOOL:ws_write {"path":"file"}]\ncontent\n[/TOOL]`;

    const sysMsg = `You are ${entityName}. Executing step ${i + 1}/${plan.steps.length}.` +
      (agentCtx || '') +
      `\nALWAYS write code to workspace files using [TOOL:ws_write {"path":"file"}]\ncontent\n[/TOOL]. NEVER paste raw code into the chat.` +
      `\nKeep your chat text to brief status updates — what you are doing and what was written. The code goes in files.` +
      `\nAFTER writing any file, ALWAYS verify it with [TOOL:ws_read {"path":"file"}] to check completeness.` +
      (execBP ? `\n\n[Execution Instructions]\n${execBP}` : '');

    let resp = await callLLM([
      { role: 'system', content: sysMsg },
      { role: 'user', content: prompt }
    ], { temperature: 0.7 });
    llmCalls++;
    if (onActivity) await onActivity('llm_call', `LLM response for step ${i + 1}`);

    // Execute tool calls
    if (execTools) {
      const results = await execTools(resp, { workspacePath, webFetchEnabled: true, cmdRunEnabled: true, memorySearch });
      if (onActivity && results.length) {
        for (const r of results) await onActivity(r.ok ? 'tool_result' : 'error', `${r.tool}: ${r.result || (r.ok ? '' : 'FAILED')}`);
      }

      // Auto-verify written files
      const writtenFiles = results
        .filter(r => r.ok && (r.tool === 'ws_write' || r.tool === 'ws_append'))
        .map(r => {
          const m = r.result && r.result.match(/^(?:Wrote|Appended)\s+\d+\s+bytes?\s+to\s+(.+)$/i);
          if (m) return m[1].trim();
          const m2 = r.result && r.result.match(/^(?:Written|Appended):\s+(.+)$/i);
          return m2 ? m2[1].trim() : null;
        })
        .filter(Boolean);
      for (const f of writtenFiles) { if (!allWrittenFiles.includes(f)) allWrittenFiles.push(f); }

      if (writtenFiles.length > 0 && llmCalls < limits.maxLLM) {
        const uniqueFiles = [...new Set(writtenFiles)];
        for (const fp of uniqueFiles.slice(0, 3)) {
          try {
            const rel = path.relative(workspacePath, fp);
            const vr = await execTools(`[TOOL:ws_read ${JSON.stringify({path: rel})}]`, { workspacePath, webFetchEnabled: false, cmdRunEnabled: false });
            if (vr.length > 0) results.push(...vr);
          } catch { /* skip */ }
        }
      }

      if (results.length > 0 && formatResults && stripTools) {
        const cleanResp = stripTools(resp);
        const toolBlock = formatResults(results);

        if (llmCalls < limits.maxLLM) {
          resp = await callLLM([
            { role: 'system', content: `You are ${entityName}. Summarize what step ${i + 1} accomplished. Be brief. No [TOOL:] tags.${writtenFiles.length ? ' Files were auto-verified — if any look incomplete, note what needs continuation.' : ''}` },
            { role: 'user', content: `Step: ${step.description}\n\nAction:\n${cleanResp}\n\n${toolBlock}\n\nBrief summary:` }
          ], { temperature: 0.5 });
          llmCalls++;
        } else {
          resp = cleanResp;
        }
      }
    }

    stepOutputs.push({ step: i + 1, description: step.description, output: resp });
    step.done = true;
    if (onStep) await onStep({ stepIndex: i, stepTotal: plan.steps.length, description: step.description, output: resp });
    if (onActivity) await onActivity('step_done', `Step ${i + 1} complete: ${step.description}`);
    if (dispatchedAgent && agentCatalog) {
      try { agentCatalog.recordPrompt(dispatchedAgent.id, { task: step.description, prompt: prompt.slice(0, 500), result: (resp || '').slice(0, 500), success: true, tags: [taskType] }); } catch {}
    }
  }

  // Phase 3: Final summary
  let finalResponse;
  const sumBP = getBlueprint(taskType, 'summarize');
  if (llmCalls < limits.maxLLM) {
    const stepsBlock = stepOutputs.map(s => `Step ${s.step} — ${s.description}:\n${s.output}`).join('\n\n');
    finalResponse = await callLLM([
      { role: 'system', content: `You are ${entityName}. Summarize what you accomplished. Be brief and natural. List what files were created or modified — do NOT include code in the summary. The code is already in the workspace files.` + (sumBP ? `\n\n${sumBP}` : '') },
      { role: 'user', content: `Request: "${message}"\n\nCompleted ${stepOutputs.length} steps:\n${stepsBlock}\n\nBrief summary:` }
    ], { temperature: 0.6 });
    llmCalls++;
  } else {
    finalResponse = stepOutputs.map(s => `**${s.description}**\n${s.output}`).join('\n\n');
  }

  return { finalResponse, steps: stepOutputs, llmCalls, filesChanged: allWrittenFiles };
}

module.exports = { classify, runTask, TASK_TYPES, parsePlan, getBlueprint };
