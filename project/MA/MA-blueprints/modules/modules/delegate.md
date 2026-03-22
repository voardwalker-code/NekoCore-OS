# Delegate — Task Blueprint

You are delegating work to a specialist agent from your roster. This runs as a multi-step task.

## How to Create Your Task Plan

Analyze the delegation request and create:

```
[TASK_PLAN]
- [ ] Scan agent catalog — list available agents by role and seniority
- [ ] Match task to best agent — role, seniority, capabilities
- [ ] Check prompt history — find reusable prompts for similar tasks
- [ ] Construct agent prompt — context, task, inputs, constraints, acceptance criteria
- [ ] Dispatch and record — send prompt, log to prompt-history catalog
[/TASK_PLAN]
```

Adapt based on whether the user wants to:
- **Delegate a specific task** → match agent + construct prompt
- **Check the roster** → scan catalog and report
- **Create a new agent** → interview for role/prompt/capabilities, then create
- **Search prompt history** → find reusable prompts

---

## Step-by-Step

### Step 1: Scan the Roster

Use the agent catalog to see who's available:

```
[TOOL:cmd_run command="node -e \"const a=require('./MA-server/MA-agents'); a.listAgents().forEach(x => console.log(x.id, '-', x.name, '('+x.seniority+')', '-', x.role, '- used:', x.usageCount||0, 'times'));\""]
```

Report the roster to the conversation. Group by role.

### Step 2: Match Task to Agent

Based on the user's request, select the best agent:

| Need | Role | Seniority |
|------|------|-----------|
| Implement module from blueprint | coder | senior (complex) / junior (simple) |
| Design data contracts | architect | lead |
| Write/update tests | tester | senior |
| Research algorithm/technique | researcher | senior |
| Review implementation | reviewer | lead |
| Write docs/articles | writer | mid/senior |

If no agent matches, proceed to create one (see Step 5 below).

### Step 3: Check Prompt History

Before writing a new prompt, check if a similar one exists:

```
[TOOL:cmd_run command="node -e \"const a=require('./MA-server/MA-agents'); const h=a.searchPromptHistory('{keyword}'); h.slice(0,3).forEach(e => console.log(e.id, '-', e.task, '- agent:', e.agentId, '- success:', e.success));\""]
```

If a matching prompt exists and succeeded, adapt it instead of writing from scratch.

### Step 4: Construct the Delegation Prompt

Build the prompt following this structure:

```
PROJECT: {project name}
LAYER: {layer number and name} (if applicable)
TASK: {specific deliverable}

READ FIRST:
- {list of files the agent should read}

DELIVER:
- {specific output expected}
- {test/validation criteria}

CONSTRAINTS:
- {from agent's constraint list}
- {project-specific rules}
```

Present the constructed prompt to the user for approval before dispatch.

### Step 5: Create New Agent (if needed)

If no existing agent fits:

```
[TOOL:ws_write path="..." content="..."]
```

Use the MA-agents module:
```javascript
require('./MA-server/MA-agents').createAgent({
  id: '{slug}',
  role: '{role}',
  name: '{Display Name}',
  seniority: '{junior|mid|senior|lead}',
  systemPrompt: '{detailed system prompt}',
  capabilities: ['{cap1}', '{cap2}'],
  tools: ['{tool1}', '{tool2}'],
  constraints: ['{constraint1}']
});
```

### Step 6: Record the Dispatch

After dispatching work, always record it:

```javascript
require('./MA-server/MA-agents').recordPrompt('{agent-id}', {
  task: '{short task label}',
  prompt: '{full prompt sent}',
  result: '{summary of what agent produced}',
  success: true,
  project: '{project-name}',
  tags: ['{tag1}', '{tag2}']
});
```

---

## Common Mistakes to Avoid

- Delegating without checking the roster first (may create duplicates)
- Writing prompts from scratch when history has a working template
- Not recording dispatches (breaks the reusable prompt library)
- Sending junior agents complex multi-module tasks
- Forgetting to include constraint lists in the delegation prompt
