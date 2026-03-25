# Project Architect — Generation Blueprint

You are generating a complete project scaffold from gathered requirements. This runs as a multi-step task. Read the requirements file first, then produce all artifacts in dependency order.

## Pre-Generation Checklist

Before generating ANYTHING:
1. Read `workspace/{project}/REQUIREMENTS.md` — if it doesn't exist, STOP and tell the user you need to interview them first
2. Verify all 5 must-have areas are covered (Vision, Features, Tech, Data, Interfaces)
3. If any area says "TBD" or "unknown", flag it and propose a concrete default before continuing

## How to Create Your Task Plan

Read REQUIREMENTS.md, then create:

```
[TASK_PLAN]
- [ ] Read and validate REQUIREMENTS.md — identify layers, modules, and data domains
- [ ] Write BUILD-ORDER.md — vision, pillars, layer map, and build rules
- [ ] Write PROJECT-MANIFEST.json — all modules, dependencies, status fields, test commands
- [ ] Write {prefix}-contracts/ — data shape definitions with validators for each domain
- [ ] Create MA-blueprints/{project}/ subfolder — INDEX.md + per-layer build guides with algorithm pseudocode
- [ ] Write module stubs — function signatures, algorithm comments, NOT_IMPLEMENTED throws
- [ ] Write test harness and per-layer contract tests
- [ ] Write project-status.js, package.json with build scripts, and run syntax check
- [ ] (Optional) Write transport layer — HTTP server + client GUI if project has a browser/API interface
[/TASK_PLAN]
```

Adapt the number of contract files, blueprint files, and stubs to the project's actual size.

---

## Step-by-Step Artifact Generation

### Step 1: Analyze Requirements → Layer Decomposition

Read REQUIREMENTS.md. Identify:
- **Data domains** → each becomes a contract file
- **Core capabilities** → group into ordered layers (foundation → operations → pipeline → domain → advanced → integration)
- **Dependencies** → which layer needs which other layer

Write your analysis to `workspace/{project}/LAYER-ANALYSIS.md` so future steps can reference it.

**IMPORTANT**: Determine the project's namespace prefix (usually the project name or abbreviation). ALL folders must use `{prefix}-{purpose}` naming. Generic folder names like `server/`, `client/`, `contracts/` are FORBIDDEN.

### Step 2: BUILD-ORDER.md

The master project document. Write to `workspace/{project}/BUILD-ORDER.md`:

```markdown
# {Project Name} — Build Order

## Vision
{1-2 paragraphs from requirements — what, who, why}

## Core Pillars
{3-6 major capability areas derived from features. Each pillar = one sentence.}

## Layer Map

| Layer | Name | Modules | Depends On |
|-------|------|---------|------------|
| 0 | {Foundation} | N | — |
| 1 | {Operations} | N | 0 |
| 2 | {Pipeline/Core} | N | 1 |
| ... | ... | ... | ... |

### Layer 0: {Foundation}
{What this layer provides. Which modules. What gets tested.}

### Layer 1: {Operations}
{Same structure for each layer.}

## Build Rules
- Layer N tests MUST pass before starting Layer N+1
- Every module has a contract (data shape definition in contracts/)
- Every module has a stub with algorithm comments
- Contract validation runs before implementation
- No module exceeds 300 lines where practical
```

### Step 3: PROJECT-MANIFEST.json

Structured build tracker. Write to `workspace/{project}/PROJECT-MANIFEST.json`:

```json
{
  "project": "{name}",
  "version": "0.1.0",
  "description": "{from vision}",
  "layers": {
    "0": { "name": "{layer name}", "modules": N, "dependsOn": [] },
    "1": { "name": "{layer name}", "modules": N, "dependsOn": ["0"] }
  },
  "modules": [
    {
      "id": "{module-id}",
      "layer": 0,
      "file": "{relative/path.js}",
      "status": "stub",
      "contract": "{contract-file.js}",
      "note": "{implementation hint or reference}"
    }
  ],
  "totalModules": 0,
  "completedModules": 0,
  "testCommand": "node tests/test-runner.js"
}
```

Every module must have: id, layer, file path, status (stub/implemented/complete), contract reference.

### Step 4: Contract Files

One contract per data domain. Write to `workspace/{project}/{prefix}-contracts/{domain}.js`:

```javascript
'use strict';
// ── {Domain} Contract ────────────────────────────────────────────

const {DOMAIN}_VERSION = 1;

// ── Shapes ──────────────────────────────────────────────────────
const {TYPE}_SHAPE = {
  required: ['field1', 'field2'],
  shape: {
    field1: { type: 'string', description: '...' },
    field2: { type: 'number', min: 0, max: 100, description: '...' }
  }
};

// ── Constants (QUANTIFIED — actual numbers, not placeholders) ───
const DEFAULTS = { field1: '', field2: 50 };
const LIMITS   = { MAX_X: 100, TIMEOUT_MS: 30000 };

// ── Factory ─────────────────────────────────────────────────────
function create{Type}(fields) {
  const record = { ...DEFAULTS, ...fields };
  if (!record.id) record.id = '{prefix}_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  if (!record.created) record.created = new Date().toISOString();
  return record;
}

// ── Validator ───────────────────────────────────────────────────
function validate{Type}(record) {
  const errors = [];
  for (const f of {TYPE}_SHAPE.required) {
    if (record[f] === undefined || record[f] === null) errors.push('Missing required: ' + f);
  }
  // Type checks, range checks per shape definition...
  return { valid: errors.length === 0, errors };
}

module.exports = {
  {DOMAIN}_VERSION, {TYPE}_SHAPE, DEFAULTS, LIMITS,
  create{Type}, validate{Type}
};
```

Key rules:
- Constants are ACTUAL NUMBERS — never "configure later" or "tune"
- Shapes list required vs optional fields explicitly
- Validators check required fields, types, and ranges
- Factory functions merge defaults and generate IDs

### Step 5: Layer Blueprints (MA-blueprints Subfolder)

Blueprints live in MA's own blueprint directory, NOT inside the project workspace.
This lets MA reference them during future build tasks across sessions.

**Create the project subfolder:** `MA-blueprints/{project-name}/`

**INDEX.md** — Write to `MA-blueprints/{project-name}/INDEX.md`:

```markdown
# {Project Name} — Build Blueprint Index

This folder contains MA's build blueprints for {Project Name}.
Each layer has its own blueprint. Layers must be built IN ORDER.

## Build Order

| Blueprint | Layer | What | Pre-Requisite |
|-----------|-------|------|---------------|
| `layer-0-{name}.md` | 0 | {description} | Contracts pass validation |
| `layer-1-{name}.md` | 1 | {description} | Layer 0 tests pass |
{...one row per layer...}

## How to Use

1. Open the project at `workspace/{project}/`
2. Run `node tests/test-runner.js 0` — if contracts load, proceed
3. Execute `layer-0-{name}.md` blueprint
4. Run `node tests/test-runner.js 0` — must pass before proceeding
5. Continue through all layers

## Rules

- **NEVER skip a layer**. Layer N tests must pass before Layer N+1 begins.
- **NEVER modify contracts** unless a bug is found (document the change).
- **Every stub has algorithm comments** — follow them exactly.
- **Update PROJECT-MANIFEST.json** after completing each module.
```

**Per-layer blueprints** — Write to `MA-blueprints/{project-name}/layer-{N}-{name}.md`:

```markdown
# Layer {N}: {Name} — Build Blueprint

## Prerequisites
- Layer {N-1} tests must pass: `npm run test:{N-1}`

## Scope
Files to implement:
- `{path/file1.js}` — {purpose}
- `{path/file2.js}` — {purpose}

Use prefixed folder names for all paths (e.g., `{prefix}-server/module.js`, NOT `server/module.js`).

## {Module 1}: {file1.js}

### Exports
- `functionA(param1, param2)` → returns `{type}`
- `functionB(param1)` → returns `{type}`

### Algorithm: functionA
1. Validate input against {CONTRACT}_SHAPE
2. {Specific operation with data types}
3. {Formula or logic — e.g. score = weight × 0.6 + recency × 0.4}
4. Return { field1, field2 }

### Algorithm: functionB
1. Read {resource} from {path}
2. {Transform step with specifics}
3. Write result to {destination}
4. Return boolean success

## {Module 2}: {file2.js}
{Same structure}

## Done When
`npm run test:{N}` passes with 0 failures.

## Manifest Update
After passing tests, update each module's status in PROJECT-MANIFEST.json from "stub" to "implemented".
```

Key rules for blueprints:
- Algorithms are PSEUDOCODE with specific data types and operations
- Formulas are MATH with actual coefficients (e.g., `score = importance × 0.6 + freshness × 0.4`)
- Error handling is SPECIFIED (what to catch, what to return on failure)
- Reference implementations are POINTED AT when they exist (e.g., "Adapt logic from ../../server/MA-rake.js")

### Step 6: Module Stubs

One file per module. Write to the path specified in the manifest:

```javascript
'use strict';
const { validate{Type}, DEFAULTS } = require('../{prefix}-contracts/{contract}');

// ── {Module Name} ───────────────────────────────────────────
// Blueprint: blueprints/layer-{N}-{name}.md

/**
 * {Brief description}
 * @param {type} param1 — {description}
 * @returns {type}
 */
function {functionName}({params}) {
  // 1. Validate input against {CONTRACT}
  // 2. {Algorithm step from blueprint}
  // 3. {Algorithm step from blueprint}
  // 4. Return { ... }
  throw new Error('NOT_IMPLEMENTED: {functionName}');
}

module.exports = { {functionName} };
```

Every exported function:
- Has algorithm steps as comments (copied from blueprint)
- Throws NOT_IMPLEMENTED
- Imports its contract

### Step 7: Test Harness + Layer Tests

**test-runner.js** — Write to `workspace/{project}/{prefix}-tests/test-runner.js`:
- Minimal assert/assertEqual/assertThrows/assertAsyncThrows functions
- Run layer tests in dependency order (0→N)
- Stop on first layer failure
- Report: passed, failed, skipped per layer
- CLI: `node tests/test-runner.js [N]` (optional layer argument)
- Export harness functions so layer test files can use them

**layer-{N}.test.js** — For each layer, write to `workspace/{project}/{prefix}-tests/layer-{N}.test.js`:
- Import contract and modules for that layer
- Test contract shapes: field existence, types, required flags
- Test validators: valid input passes, invalid input fails with error messages
- Test factory functions: defaults applied, IDs generated, timestamps set
- Test module exports: function exists and type is 'function'
- Test stub behavior: calling function throws NOT_IMPLEMENTED
- Group tests in labeled sections: `console.log('\n  [{section name}]');`

### Step 8: Project Status Script + package.json + Verification

**project-status.js** — Write to `workspace/{project}/{prefix}-scripts/project-status.js`:

```javascript
'use strict';
const fs   = require('fs');
const path = require('path');

const MANIFEST = path.join(__dirname, '..', 'PROJECT-MANIFEST.json');

function run() {
  if (!fs.existsSync(MANIFEST)) { console.log('No PROJECT-MANIFEST.json found.'); return; }
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const mods = m.modules || [];
  const total = mods.length;
  const done  = mods.filter(x => x.status === 'complete' || x.status === 'implemented').length;
  const stubs = mods.filter(x => x.status === 'stub').length;

  console.log(`\n  ${m.project || 'Project'} Status`);
  console.log(`  ${'─'.repeat(40)}`);
  console.log(`  Modules: ${total}  |  Implemented: ${done}  |  Stubs: ${stubs}`);
  console.log(`  Progress: ${total ? Math.round(done / total * 100) : 0}%\n`);

  // Per-layer breakdown
  const layers = m.layers || {};
  for (const [num, info] of Object.entries(layers).sort((a, b) => a[0] - b[0])) {
    const layerMods = mods.filter(x => String(x.layer) === String(num));
    const layerDone = layerMods.filter(x => x.status === 'complete' || x.status === 'implemented').length;
    const mark = layerDone === layerMods.length ? '✓' : ' ';
    console.log(`  [${mark}] Layer ${num}: ${info.name} — ${layerDone}/${layerMods.length}`);
  }
  console.log();
}

run();
```

Adapt the field names and status values to match the project's actual manifest schema.

**package.json** — Write `workspace/{project}/package.json`:

```json
{
  "name": "{project-name}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node {prefix}-tests/test-runner.js",
    "test:0": "node {prefix}-tests/test-runner.js 0",
    "test:1": "node {prefix}-tests/test-runner.js 1",
    "status": "node {prefix}-scripts/project-status.js"
  }
}
```

Add a `test:N` script for each layer.

Then verify:
```
[TOOL:cmd_run command="node -c {each .js file}" timeout="5000"]
[TOOL:cmd_run command="node tests/test-runner.js" timeout="30000"]
```

Report to user:
- Total files created
- Total modules (stubs)
- Total contract tests
- Test pass/fail count
- Blueprint location: `MA-blueprints/{project-name}/`
- Next steps: "Start implementing Layer 0. Read MA-blueprints/{project-name}/layer-0-{name}.md for exact algorithms."

### Step 9 (Optional): Transport Layer

If the project has a browser GUI, REST API, or WebSocket interface (check REQUIREMENTS.md Interfaces section), create a transport layer:

**HTTP Server** — Write to `workspace/{project}/{prefix}-server.js`:
- Express or raw `http.createServer` (match the tech stack)
- POST endpoint for the primary interface (e.g., `/api/chat`, `/api/query`)
- Serves static files from `client/` if a GUI exists
- Imports the top-layer module as the entry point
- Before implementation: returns a stub response ("Layer N not yet implemented")
- After implementation: calls the real pipeline

**Client GUI** (if browser interface) — Write to `workspace/{project}/client/index.html`:
- Minimal functional UI for testing the transport layer
- Sends requests to the server endpoint
- Displays responses
- Works at every build stage (shows stub messages before implementation)

Add these to INDEX.md as "Transport Layer (Pre-Built)" with a note that they work at every build stage.
Update package.json with a `start` script.

---

## Common Mistakes to Avoid

- Writing blueprints inside the project workspace instead of `MA-blueprints/{project-name}/`
- Forgetting to create INDEX.md in the blueprint subfolder
- Writing vague algorithms ("process the data") instead of specific pseudocode
- Using placeholder constants ("THRESHOLD = ???") instead of quantified values
- Creating contracts that don't have validators
- Writing tests that only check exports exist (they should also validate contracts)
- Skipping the REQUIREMENTS.md check — always read it first
- Generating more than 6 layers — if the project needs more, group related modules
- Making stubs that don't import their contracts
- Forgetting the dependency chain — each layer-N test MUST reference only layers 0..N
