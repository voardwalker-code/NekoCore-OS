# Agent Delegation — Interview & Dispatch Protocol

Reference doc for MA when delegating work to specialist agents.

---

## When This Applies

When a task is too large or specialized for MA to do alone, delegate to an agent from the catalog.

## Phase 1: Check the Roster

Before creating a new agent, scan who's already available:

```
[TOOL:cmd_run command="node -e \"const a=require('./MA-server/MA-agents'); const s=a.getCatalogSummary(); console.log(JSON.stringify(s,null,2));\""]
```

Or list all agents with full details:
```
[TOOL:cmd_run command="node -e \"const a=require('./MA-server/MA-agents'); a.listAgents().forEach(x => console.log(x.id, '-', x.name, '('+x.seniority+')', '-', x.role));\""]
```

## Phase 2: Match Task to Agent

| Task Type | Best Agent Role | Seniority Guide |
|-----------|----------------|-----------------|
| Implement a module from blueprint | coder | senior for complex, junior for simple |
| Design data shapes / contracts | architect | lead |
| Write or update tests | tester | senior |
| Research an algorithm or technique | researcher | senior |
| Review code before merge | reviewer | lead |
| Write documentation or guides | writer | mid or senior |

**Seniority matters for prompt complexity:**
- **Junior**: Give exact step-by-step instructions, one task at a time
- **Mid**: Give the goal + constraints, let them plan the steps
- **Senior**: Give the context + acceptance criteria, trust their judgment
- **Lead**: Give the problem space, they own the solution

## Phase 3: Dispatch Work

When delegating to an agent, construct the prompt with:

1. **Context**: What project, what layer, what's already done
2. **Task**: Specific deliverable — "implement memory-storage.js Layer 0"
3. **Inputs**: Which files to read (blueprint, contract, stub)
4. **Constraints**: From the agent's own constraint list + any project-specific rules
5. **Acceptance Criteria**: What "done" looks like (tests pass, output format)

### Prompt Template
```
PROJECT: {project name}
LAYER: {layer number and name}
TASK: {specific deliverable}

READ FIRST:
- Blueprint: MA-blueprints/{project}/layer-{N}-{name}.md
- Contract: workspace/{project}/{prefix}-contracts/{domain}.js
- Stub: workspace/{project}/{path-to-stub}.js

DELIVER:
- Implemented module at the stub path
- All algorithm steps from stub comments must be filled in
- Run `npm run test:{N}` — must pass with 0 failures

CONSTRAINTS:
- {agent constraints}
- {project-specific constraints}
```

## Phase 4: Record the Prompt

After dispatching, record what was sent and what came back:

```javascript
const agents = require('./MA-server/MA-agents');
agents.recordPrompt('senior-coder', {
  task: 'Implement memory-storage.js',
  prompt: '...full prompt text...',
  result: 'Implemented 6 functions, layer 0 tests: 48/48 pass',
  success: true,
  project: 'rem-system',
  tags: ['layer-0', 'memory', 'implementation']
});
```

This builds a reusable prompt library. Before writing a new prompt, search history:

```javascript
agents.searchPromptHistory('memory-storage');
agents.getPromptHistory('senior-coder', { project: 'rem-system' });
```

## Phase 5: Creating New Agents

When no existing agent fits the task:

1. Determine: role, seniority, name, capabilities
2. Write a detailed systemPrompt (see existing agents for format)
3. Define tool permissions and constraints
4. Create via the catalog:

```javascript
const agents = require('./MA-server/MA-agents');
agents.createAgent({
  id: 'blog-writer',
  role: 'writer',
  name: 'Blog Writer',
  seniority: 'mid',
  systemPrompt: '...detailed prompt...',
  capabilities: ['writing', 'markdown', 'documentation'],
  tools: ['ws_read', 'ws_write', 'web_search'],
  constraints: ['Must follow project style guide', 'No code generation']
});
```

The agent is immediately available in the catalog for future tasks.

## Hiring Rules

1. **Check the roster first** — don't create duplicates
2. **One agent per role/seniority combo** unless specialization differs (e.g., "NLP Researcher" vs "API Researcher" are different)
3. **System prompts are the source of truth** — they define what the agent can and cannot do
4. **Prompts are reusable** — check history before writing from scratch
5. **Record every dispatch** — the prompt catalog is MA's institutional memory for delegation

## Agent Storage Layout

```
MA-entity/
  entity_ma/          ← MA herself
  agent_senior-coder/ ← Delegated agent
    agent.json        ← Agent definition (role, prompt, capabilities)
    prompt-history/   ← Every prompt sent to this agent
      prompt_1234.json
  agent_test-engineer/
    agent.json
    prompt-history/
```

## Quality Gate

After any agent completes work:
1. Run the relevant layer tests
2. If the agent is not a reviewer, have the Code Reviewer agent review the output
3. Only mark the task complete if both tests and review pass
