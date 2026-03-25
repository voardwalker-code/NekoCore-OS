# Blueprint Builder Blueprint

You are executing a **Blueprint Builder** task — creating a new MA blueprint, skill, and classifier rule for a task type that doesn't have one yet. This is a meta-blueprint: you are building the instructions that a future version of yourself will follow.

## Your Goal

When a user asks you to do something and no existing blueprint covers it, or when they explicitly ask you to create a blueprint for a new capability, you will design and build a complete, production-quality blueprint + skill + runtime skill + classifier entry — everything needed so that MA can handle this task type autonomously in the future.

The result must be **immediately usable** — not a sketch or outline, but a fully specified workflow that another LLM could follow step-for-step without guessing.

## When This Blueprint Triggers

- User says "create a blueprint for X" or "build a blueprint for X"
- User says "there's no blueprint for X, make one"
- User asks MA to do something complex and you recognize no existing blueprint covers it
- User wants to teach MA a new capability or workflow

## Architecture

You write files directly to MA's blueprint and skill directories using workspace tools:

| Location | What goes there |
|----------|----------------|
| `MA-blueprints/modules/{task_type}.md` | The full blueprint — loaded during plan + execute phases |
| `MA-skills/{skill-name}/SKILL.md` | Skill registration file with YAML frontmatter |
| `MA-entity/entity_ma/skills/{skill-name}.md` | Compact runtime skill loaded at entity boot |

You also need to tell the user what to add to `MA-tasks.js` — the classifier rules. You cannot edit that file directly (it's code), so you will generate the exact code snippet for the user to paste or for a code task to apply.

## Step Pattern

```
[TASK_PLAN]
- [ ] Analyze the target capability: what does the user want MA to be able to do?
- [ ] Research: check existing blueprints for overlap, review available tools, check if APIs are needed
- [ ] Design the blueprint structure: modes, phases, interactive pauses, output format
- [ ] Write the full blueprint to MA-blueprints/modules/{task_type}.md
- [ ] Write the SKILL.md to MA-skills/{skill-name}/SKILL.md
- [ ] Write the runtime skill to MA-entity/entity_ma/skills/{skill-name}.md
- [ ] Generate the MA-tasks.js registration snippet (TASK_TYPES + COMPLEX + RULES)
- [ ] Write a summary document with the registration snippet and verification instructions
[/TASK_PLAN]
```

---

## Phase 1: Capability Analysis

Before writing anything, understand what you're building:

**Extract from the user's request:**
- **What is the task?** — Describe it in one sentence.
- **Who is it for?** — What kind of user would trigger this?
- **What inputs does it need?** — What must the user provide? What can be defaulted?
- **What outputs should it produce?** — Files? Entities? Chat responses?
- **Does it need entity creation?** — If so, it needs NekoCore OS API integration.
- **Does it need web research?** — If so, it needs `web_search` / `web_fetch` steps.
- **Is it multi-modal?** — Does this capability have distinct modes (like study_guide has Study Guide / Flashcard / Outline / Timeline)?
- **Does it need interactive pauses?** — Should the user review/approve before proceeding?
- **How complex is it?** — Simple (3-4 steps, 6 maxSteps) or complex (8-12 steps, 10-15 maxSteps)?

**Check for overlap:**
```
[TOOL:ws_list {"path": "MA-blueprints/modules/"}]
```

Read any blueprint that might already cover part of this capability. If an existing blueprint covers 80%+ of what's needed, recommend extending that blueprint with a new mode instead of creating a new one.

---

## Phase 2: Blueprint Design

Design the structure before writing. Follow these mandatory conventions:

### Blueprint File Structure

Every blueprint MUST follow this exact layout:

```markdown
# {Task Name} Blueprint

You are executing a **{Task Name}** task — {one-sentence description of what this does}.

## Your Goal

{2-4 sentences. What are you trying to produce? What makes a good result vs a bad one?
Be specific about quality — not just "create X" but "create X that is [quality criteria]".}

## Mode Detection (if multi-mode)

{Table mapping user signals to modes. Include a default mode and an ASK fallback.}

## Architecture (if API-dependent)

{Table of API endpoints. Only include if the task uses external APIs.}

## Step Pattern

{The [TASK_PLAN] template with checkbox steps.}

---

## {MODE NAME} MODE (one section per mode)

### Phase N: {Phase Name}

{Detailed instructions for each phase within each mode.}

---

## Guidelines

**DO:**
- {Positive instructions — what to include, quality standards}

**DON'T:**
- {Negative instructions — common mistakes, anti-patterns}
```

### Quality Standards for Blueprints

Your blueprint MUST meet these criteria:

1. **Actionable, not vague.** Every phase must tell the LLM exactly what to do. "Research the topic" is bad. "Search web for 3-5 sources on {topic}, extract key findings, write to research-notes.md" is good.

2. **Tool calls are explicit.** Show the exact `[TOOL:...]` syntax with parameter examples. The LLM executing your blueprint has never seen it before — spell it out.

3. **Modes have clear triggers.** If your blueprint has modes, the mode detection table must be unambiguous. Include a default mode and an "if ambiguous, ASK" instruction.

4. **Phases are sequential and checkable.** Each phase must produce something verifiable — a file, an API call result, a user confirmation. No phase should be "think about it."

5. **Interactive pauses where decisions matter.** If the task has a point where the user should review/approve (like an outline, a plan, a structure), add an INTERACTIVE PAUSE. Don't add one for every phase — only where user judgment genuinely matters.

6. **Output goes to files, not chat.** Any output longer than 2 sentences must be written to workspace files via `[TOOL:ws_write]`. The blueprint must specify the file naming convention and folder structure.

7. **Guidelines section is specific.** DOs and DON'Ts must be specific to this task type. "Write good content" is useless. "Include 3-5 examples per concept" is useful.

8. **Blueprint length: 150-400 lines.** Under 150 is too thin (the LLM won't have enough guidance). Over 400 is too long (context window waste). Target 200-300 for most blueprints.

### Mode Detection Table Format

```markdown
| Signal in User Message | Mode |
|------------------------|------|
| "keyword1" or "keyword2" + "qualifier" | MODE A |
| "keyword3" or "keyword4" | MODE B |
| Default ("generic keyword") | DEFAULT MODE |
```

Always end with: `If ambiguous, ASK: "Would you like [A], [B], or [C]?"`

### Entity Integration Pattern (if needed)

If the blueprint involves creating NekoCore OS entities, include these exact endpoints:

```markdown
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:3847/api/entities/create` | POST | Create entity |
| `http://localhost:3847/api/entities/{id}/memories/inject` | POST | Inject memories |
| `http://localhost:3847/api/entities/{id}/cognitive/tick` | POST | Run cognitive processing |
| `http://localhost:3847/api/entities/{id}/cognitive/state` | GET | Read cognitive state |
```

And include the 18 canonical emotions list: joy, wonder, fear, sadness, pride, grief, love, hope, anger, longing, nostalgia, curiosity, gratitude, determined, resignation, content, melancholic, neutral.

Memory schema: `{content, type (episodic|semantic|core), emotion, topics[], importance (0-1), narrative, phase}`

### Tool Reference (include only tools the blueprint actually uses)

| Tool | Syntax |
|------|--------|
| List files | `[TOOL:ws_list {"path":"folder/"}]` |
| Read file | `[TOOL:ws_read {"path":"file.md"}]` |
| Write file | `[TOOL:ws_write {"path":"file.md"}]content[/TOOL]` |
| Web search | `[TOOL:web_search {"query":"search terms"}]` |
| Fetch URL | `[TOOL:web_fetch {"url":"http://...", "method":"GET"}]` |
| API call | `[TOOL:web_fetch {"url":"http://localhost:3847/api/...", "method":"POST", "body":{...}}]` |
| Search memory | `[TOOL:mem_search {"query":"topic keywords"}]` |
| Create memory | `[TOOL:mem_create {"semantic":"...","importance":"0.8","emotion":"neutral","topics":"t1,t2"}]` |
| Run command | `[TOOL:cmd_run {"command":"..."}]` |

---

## Phase 3: Write the Blueprint

Write the full blueprint file:

```
[TOOL:ws_write {"path": "MA-blueprints/modules/{task_type}.md"}]
{Full blueprint content following the structure above}
[/TOOL]
```

**Quality check before writing:**
- Does every phase have explicit tool calls with example syntax?
- Does mode detection cover all cases including ambiguity?
- Are guidelines specific and actionable (not generic)?
- Is the blueprint between 150-400 lines?
- Does the step pattern match the actual phases in the blueprint?

---

## Phase 4: Write the Skill Registration

Write the SKILL.md file with YAML frontmatter:

```
[TOOL:ws_write {"path": "MA-skills/{skill-name}/SKILL.md"}]
---
name: {skill-name}
enabled: true
---

# {Skill Name} Skill

## Triggers

- {List of trigger phrases/keywords}

## Mode Detection (if multi-mode)

| Signal | Mode |
|--------|------|
| ... | ... |

## Workflow

{Condensed workflow description — one paragraph per mode or major phase}

## API Endpoints (if any)

- `POST /api/...` — Description
- `GET /api/...` — Description

## Tools Used

- `tool_name` — When/why it's used
[/TOOL]
```

---

## Phase 5: Write the Runtime Skill

Write the compact runtime skill (loaded into MA's entity at boot — keep it concise):

```
[TOOL:ws_write {"path": "MA-entity/entity_ma/skills/{skill-name}.md"}]
# {Skill Name}

{One-sentence description.}

## When to activate

- {Trigger conditions — keywords, user intent patterns}

## Core workflow

{Condensed workflow — key phases only, 1-2 sentences each. This is a quick reference, not the full blueprint.}

## Output

{Where output files go — naming convention and folder structure.}
[/TOOL]
```

Runtime skills are limited to ~1500 chars when injected into context, so keep this file SHORT — under 80 lines.

---

## Phase 6: Generate the Classifier Registration

Generate the exact code that needs to be added to `MA-tasks.js`. Write it to a summary file:

```
[TOOL:ws_write {"path": "blueprint-registration-{task_type}.md"}]
# Blueprint Registration: {task_type}

## Files Created

- `MA-blueprints/modules/{task_type}.md` — Full blueprint
- `MA-skills/{skill-name}/SKILL.md` — Skill registration
- `MA-entity/entity_ma/skills/{skill-name}.md` — Runtime skill

## MA-tasks.js Changes Required

Add to `TASK_TYPES` object:
```js
  {task_type}: { maxSteps: {N}, maxLLM: {N}, timeout: {N} },
```

Add to `COMPLEX_TASK_TYPES` Set (if complex reasoning needed):
```js
const COMPLEX_TASK_TYPES = new Set([...existing..., '{task_type}']);
```

Add to `RULES` object:
```js
  {task_type}: {
    kw: [{keyword list}],
    re: [{regex list}]
  },
```

### Keyword Design Rules
- Use 10-20 keywords that a user would naturally say
- Include both short forms ("NPC") and long forms ("non-player character")
- Overlap with existing task types is OK — the scoring system handles priority
- Include action verbs + nouns: "create a {thing}", "build a {thing}", "design a {thing}"

### Regex Design Rules
- 2-4 regex patterns covering the main use cases
- Use `.{0,30}` for flexible gaps (not `.*` — too greedy)
- Use `/i` flag for case-insensitive
- Test that your patterns match common phrasings

## Verification

After registration, test classification:
```js
node -e "const t = require('./MA/MA-server/MA-tasks.js'); console.log(t.classify('{test phrase}'));"
```

Test at least 3 phrases:
1. "{phrase that should route to this type}"
2. "{phrase that should route to this type}"
3. "{phrase that should NOT route to this type}"
[/TOOL]
```

---

## Phase 7: Summary

Present the user with:
1. What was created (3 files)
2. The registration snippet they need to add to MA-tasks.js
3. How to test it
4. A brief description of what the new blueprint enables MA to do

---

## Guidelines

**DO:**
- Study 2-3 existing blueprints before designing a new one — match the quality bar
- Make the blueprint self-contained — an LLM reading it for the first time must be able to execute it without external context
- Include concrete examples in every phase (example tool calls, example outputs, example queries)
- Design keywords/regex that are specific enough to avoid collisions with existing 17 task types
- Use interactive pauses where user judgment matters (outlines, plans, structures)
- Write output to organized folders with clear naming conventions
- Include both positive DO guidelines and negative DON'T anti-patterns
- Test classification mentally: would "create a blueprint for recipe management" route to `blueprint_builder`? Would "write a recipe" route somewhere else? Good.

**DON'T:**
- Create thin blueprints under 150 lines — they don't provide enough guidance for the executing LLM
- Create bloated blueprints over 400 lines — they waste context window
- Use vague instructions ("research the topic", "make it good") — every step must be specific
- Forget the mode detection ASK fallback — ambiguity happens
- Create keywords that collide with common task types (e.g., "write" collides with writing, "code" collides with code)
- Skip the tool syntax examples — the executing LLM needs to see exact `[TOOL:...]` format
- Create a new task type when extending an existing blueprint with a new mode would suffice
- Put long content in chat instead of files — anything over 2 sentences goes in a `ws_write`
- Hardcode values that should be user-configurable — use ASK when in doubt
- Forget the entity integration pattern if the task involves creating NekoCore entities

**Existing task types to avoid collisions with:**
architect, delegate, code, research, deep_research, writing, analysis, project, memory_query, entity_genesis, book_ingestion, study_guide, dnd_create, tutor_entity, dnd_campaign, course_creator, blueprint_builder
