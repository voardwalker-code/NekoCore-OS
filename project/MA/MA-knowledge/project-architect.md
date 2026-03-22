# Project Architect — Interview & Scaffold Protocol

Reference doc for MA when planning and scaffolding new projects.

---

## When This Applies

When a user asks to plan, architect, design, or scaffold a new project — DO NOT start building immediately. Interview the user first to gather full requirements.

## Phase 1: Discovery Interview

Ask about these areas. One or two questions per message — don't overwhelm the user.

### Must-Have (gather ALL 5 before generating)

1. **Vision**: What does the end product do? Who is it for? What problem does it solve?
2. **Core Features**: 3–5 features the system MUST have at launch
3. **Tech Stack**: Language, frameworks, runtime — or let you choose
4. **Data Shapes**: What data does the system store, process, or transform? What are the main entities/objects?
5. **Interfaces**: CLI? Browser GUI? REST API? WebSocket? All of them?

### Should-Have (ask when relevant)

6. **Scale**: Local single-user tool? Multi-user server? Cloud-deployed?
7. **Existing Code**: Greenfield or extending something?
8. **Constraints**: Performance targets, security requirements, hardware limits
9. **Design Philosophy**: Any principles the user wants baked in?

### When the User Doesn't Know — RESEARCH AND PROPOSE

This is critical. DO NOT skip the question or leave it blank.

1. Research the topic — use `[TOOL:web_search query="..."]` or your own knowledge
2. Propose a SPECIFIC default with clear reasoning:
   > "Based on what you've described, I'd suggest Node.js for the runtime — it handles your async I/O needs well and you already use it in your stack. Want to go with that, use something else, or skip this for now?"
3. Accept their answer — approve, edit, or deny. Don't push.
4. Record whatever they decide in REQUIREMENTS.md

## Phase 2: Accumulate Requirements

As you gather answers, write them to the workspace:

```
[TOOL:ws_write path="workspace/{project-name}/REQUIREMENTS.md" content="..."]
```

Update this file every turn. Structure it as:
```
# {Project Name} — Requirements
## Vision: ...
## Core Features: ...
## Tech Stack: ...
## Data Shapes: ...
## Interfaces: ...
## Scale: ...
## Constraints: ...
## Design Philosophy: ...
## Open Questions: ...
```

## Phase 3: Trigger Generation

When all 5 Must-Have areas are covered, tell the user:

> I have enough to build your project plan. When you're ready, say **"generate the project plan"** and I'll create the full scaffold — build order, contracts, layer blueprints, test harness, and module stubs.

Do NOT generate until the user confirms.

## What Gets Generated

### In the project workspace (`MA-workspace/{project}/`)
- **BUILD-ORDER.md** — Vision, pillars, layer dependency map, build rules
- **PROJECT-MANIFEST.json** — Structured tracker: all modules, layers, dependencies, status
- **{prefix}-contracts/** — Data shape definitions with validators and factory functions
- **{prefix}-tests/** — Layer-based contract test harness + per-layer test files
- **{prefix}-scripts/project-status.js** — Reads manifest, reports per-layer completion
- **Module stubs** — Every export defined, algorithm in comments, NOT_IMPLEMENTED throws
- **package.json** — Scripts: test:0–N, status, start

### In MA's blueprint folder (`MA-blueprints/{project-name}/`)
- **INDEX.md** — Blueprint master index: layer table, how-to-use, rules
- **layer-{N}-{name}.md** — One per layer: scope, algorithm pseudocode, done-when criteria

Blueprints are stored in MA's own blueprint folder — NOT inside the project workspace.
This allows MA to reference them during future build tasks across sessions.

### Optional (if project has browser/API interface)
- **{prefix}-server.js** — HTTP server with transport endpoint
- **client/index.html** — Minimal GUI for testing at every build stage

## Namespace Prefix Rule (NON-NEGOTIABLE)

Every folder in a generated project MUST use a project-level prefix to prevent namespace collisions when multiple projects coexist.

**Pattern**: `{PREFIX}-{folder-purpose}`

Example for a project called "Echo":
```
Echo-server/
Echo-client/
Echo-contracts/
Echo-blueprints/
Echo-tests/
Echo-entity/
Echo-config/
Echo-scripts/
```

**Why this matters**: Generic folder names like `server/`, `client/`, `scripts/` collide when multiple projects live side by side. A user who has both MA and Echo would get `server/` conflicts. Prefixed folders are self-documenting and collision-proof.

**Rules**:
1. Ask the user for a short prefix during the Discovery Interview (usually the project name or abbreviation)
2. Apply the prefix to ALL folders — no exceptions for "obvious" ones
3. Files inside folders can use the prefix too (e.g., `Echo-server/Echo-core.js`) for the same reason
4. The prefix in require() paths, health registries, and config references must match the actual folder names exactly

## Quality Markers (Non-Negotiable)

- Constants are NUMBERS, not "tune later"
- Algorithms are PSEUDOCODE, not paragraphs
- Contracts define shapes BEFORE stubs exist
- Tests validate contracts BEFORE implementation
- Layer dependencies are EXPLICIT — Layer N must pass before Layer N+1
- Reference implementations are POINTED AT when available
