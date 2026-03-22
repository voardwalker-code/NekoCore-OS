# MA and Project Structure

Version: 1.0.0
Last updated: 2026-03-22

---

## Why MA Lives Inside the Project

**MA (Memory Architect)** is NekoCore OS's built-in AI development agent. It is not an external dependency — it is a first-class subsystem that lives at `project/MA/` and serves two roles:

1. **Builder** — MA's blueprints define the architecture for two sub-projects that can be built from scratch:
   - **REM System Core** (26 modules, 8 layers) — the cognitive memory engine at port 3860
   - **NekoCore Cognitive Mind** (97 modules, 5 parts) — the full cognitive personality runtime at port 3870

   Starter scaffolds (PROJECT-MANIFEST.json, BUILD-ORDER.md, package.json) are included in the repo. MA builds the full implementation from the blueprints.

2. **Runtime service** — MA runs as a persistent background server (port 3850) that NekoCore OS entities can call for tool execution, web search, model routing, and recurring task management (pulses/chores). The OS server proxies requests to MA through the `/ma` slash command bridge and the Resource Manager's pulse panel.

### Folder Relationship

```
project/
├── server/           ← NekoCore OS server (port 3847)
│   └── brain/        ← Cognitive pipeline, tasks, blueprints
├── client/           ← OS GUI (desktop shell, apps, tabs)
├── MA/               ← Memory Architect (port 3850)
│   ├── MA-Server.js  ← Self-contained Node.js server
│   ├── MA-server/    ← 15 core modules (zero npm deps)
│   ├── MA-workspace/ ← Sandboxed project workspace
│   │   ├── nekocore/    ← Starter scaffold (MA builds from blueprints)
│   │   └── rem-system/  ← Starter scaffold (MA builds from blueprints)
│   ├── MA-blueprints/   ← Build instructions (tracked)
│   ├── MA-knowledge/    ← Reference docs (tracked)
│   └── MA-skills/       ← Skill definitions (tracked)
├── entities/         ← [GITIGNORED] Runtime entity data
└── memories/         ← [GITIGNORED] Runtime system memory
```

MA itself (the engine, config templates, blueprints, skills, knowledge base) is **tracked in git**. The workspace projects include starter scaffolds (manifest, build order, package.json) that are tracked — everything MA builds from the blueprints (source code, tests, node_modules) is gitignored.

### How the Workspace Projects Work

The `nekocore/` and `rem-system/` workspace directories ship as **starter scaffolds** — just a PROJECT-MANIFEST.json (all statuses "not-started"), a BUILD-ORDER.md (construction guide), and a package.json. MA reads the blueprints (`MA-blueprints/nekocore/` and `MA-blueprints/rem-system/`) and builds the full implementation module-by-module, updating the manifest as it goes.

The generated source code, contracts, tests, client code, and node_modules are all gitignored. The blueprints remain tracked and serve as the authoritative build instructions.

---

## How MA Communicates With NekoCore OS

### Server-to-Server Bridge

NekoCore OS entities can call MA through the `/ma` slash command:

```
User: /ma search for Node.js best practices
```

The OS server (`server/services/ma-bridge.js`) handles this by:
1. Checking if MA is running (health check on port 3850)
2. Auto-booting MA via the process manager if offline
3. Sending the message to `POST /api/chat` on MA
4. Returning MA's response to the entity's conversation

### Pulse/Chore Proxy

The Resource Manager app proxies pulse and chore management through the OS server:

```
Client → OS Server (port 3847)     → MA Server (port 3850)
GET /api/resources/pulses           → GET /api/pulse/status + GET /api/chores/list
POST /api/resources/pulses/chores   → POST /api/chores/add
POST /api/resources/pulses/:id/toggle → POST /api/pulse/start or /api/pulse/stop
```

This keeps the client talking to a single origin (the OS server) while MA handles the recurring task engine internally.

### Process Management

The OS server can start, stop, and health-check both MA and the NekoCore Cognitive Mind server via the Process Manager routes:

| Route | Action |
|-------|--------|
| `GET /api/servers/status` | Health check all managed servers |
| `POST /api/servers/:id/start` | Start MA or NekoCore server |
| `POST /api/servers/:id/stop` | Stop a managed server |

Managed servers: `rem-system` (port 3860), `nekocore` (port 3870), and MA itself (port 3850).

---

## Sub-Project Build History

### REM System Core

- **Location:** `MA-workspace/rem-system/` (starter scaffold tracked; built source gitignored)
- **Blueprint:** `MA-blueprints/rem-system/` (tracked)
- **Scope:** 26 modules across 8 layers — memory storage, NLP, pipeline, entity identity, dream/brain loop, integration, transport, entity management
- **Port:** 3860
- **Purpose:** Standalone cognitive memory engine that can be embedded or run as a microservice

### NekoCore Cognitive Mind

- **Location:** `MA-workspace/nekocore/` (starter scaffold tracked; built source gitignored)
- **Blueprint:** `MA-blueprints/nekocore/` (tracked)
- **Scope:** 97 modules across 5 parts — Foundation, Memory+Knowledge, Cognition Engine, Identity+Generation, Services+Transport
- **Port:** 3870
- **Pre-requisite:** REM System must be running (port 3860)
- **Purpose:** Full cognitive personality runtime — the reference implementation of a NekoCore entity mind as a standalone server

Both projects are built by MA following the blueprint-driven development workflow: plan → decompose → build module-by-module → test → integrate. The repo ships starter scaffolds; ask MA to build them.

---

## Building New Projects With MA

MA's workspace (`MA-workspace/`) is sandboxed — all file operations are restricted to this directory. To create a new project:

1. Write a blueprint in `MA-blueprints/` describing the architecture
2. Start MA (`node MA-Server.js` or via Process Manager)
3. Give MA the build instruction: `"Build the project following the blueprint at MA-blueprints/my-project/"`
4. MA will create the project directory, scaffold modules, write tests, and iterate

The blueprint system supports both core blueprints (universal patterns like task decomposition, error recovery) and module-specific blueprints (research, code, writing, analysis, planning).

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [ARCHITECTURE-OVERVIEW.md](ARCHITECTURE-OVERVIEW.md) | Full system map, subsystem table, design principles |
| [PIPELINE-AND-ORCHESTRATION.md](PIPELINE-AND-ORCHESTRATION.md) | Cognitive pipeline, orchestrator, task fork |
| [APP-FOLDER-OWNERSHIP.md](APP-FOLDER-OWNERSHIP.md) | File ownership rules for apps |
| [HOW-TO-CREATE-AN-APP.md](HOW-TO-CREATE-AN-APP.md) | Step-by-step guide for new NekoCore OS apps |
| `project/MA/README.md` | MA quick start, feature list, configuration |
| `project/MA/USER-GUIDE.md` | Full MA user guide |
