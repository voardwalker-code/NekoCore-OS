# MA v1.0 — Memory Architect

**MA** is the standalone AI development agent for [NekoCore OS](../README.md). It builds, researches, writes code, manages projects, runs recurring tasks, and maintains its own memory — all from a browser GUI or terminal CLI.

MA runs as a self-contained Node.js server with zero npm dependencies.

---

## Quick Start

```bash
# 1. Start the server
node MA-Server.js

# 2. Open the GUI
# → http://localhost:3850

# 3. Configure your LLM (click ⚙ in the GUI, or use the CLI)
node MA-cli.js
```

On first launch, MA copies `ma-config.example.json` → `MA-Config/ma-config.json`. Edit it or configure via the GUI.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-LLM Support** | OpenRouter, Ollama, OpenAI-compatible endpoints |
| **Task Engine** | 8 task types with planning → execution → summary pipeline |
| **Workspace Tools** | File read/write/list/delete/move/mkdir — sandboxed to `MA-workspace/` |
| **Command Execution** | Sandboxed shell with configurable whitelist (30+ defaults) |
| **Web Search & Fetch** | Search the web, fetch & extract page text |
| **Memory System** | Episodic + semantic memory with keyword search |
| **Knowledge Base** | 9 reference docs loaded on-demand by topic |
| **Project Archives** | Persistent project state with open/close/status lifecycle |
| **Agent Catalog** | 6 specialist agents (code-reviewer, senior-coder, etc.) |
| **Blueprint System** | Task-type-specific execution guides for plan/execute/summarize phases |
| **Slash Commands** | 25 commands for health, memory, knowledge, projects, config, pulses, chores, models |
| **File Context** | Auto-detects file paths in chat and reads them for context |
| **Drag & Drop** | Drop files into the GUI chat — content sent to MA as context |
| **Ollama Integration** | Browse local models, pull new ones, auto-fill maxTokens from model info |
| **Intelligent Model Routing** | Evaluates tasks, selects the best model from user roster, local-first, learns from results |
| **Model Performance Tracking** | Records model grades per task type/language, avoids poor performers, promotes good ones |
| **Token Budget** | Tracks context usage, reserves response budget, shows usage bar (up to 1M tokens) |
| **Auto Self-Review** | Reads back written files to verify completeness |
| **History Compression** | Compresses older chat turns to fit long conversations in context |
| **Continuation** | Graceful stop/continue when hitting token limits |
| **Pulse Engine** | Timer-driven recurring tasks: health scans, chore execution |
| **Chores System** | Repeating tasks delegated to agents, graded by MA |
| **Health Scanner** | 20-file integrity check with critical/warning reporting |
| **User Guide** | Built-in HTML user guide accessible from the GUI (? button) |

---

## Architecture

```
MA/
├── MA-Server.js           HTTP server (port 3850)
├── MA-cli.js              Terminal CLI
├── MA-server/             Core modules (15 files)
│   ├── MA-core.js         Bootstrap, state, chat orchestration
│   ├── MA-llm.js          LLM calling (OpenRouter / Ollama / model management)
│   ├── MA-tasks.js        Intent classifier + task runner
│   ├── MA-pulse.js        Pulse engine (timers, health scans, chores)
│   ├── MA-model-router.js Intelligent model selection + performance tracking
│   ├── MA-workspace-tools.js  Tool execution engine
│   ├── MA-cmd-executor.js Sandboxed shell + whitelist
│   ├── MA-web-fetch.js    Web search / fetch
│   ├── MA-memory.js       Memory store (episodic/semantic)
│   ├── MA-project-archive.js  Project lifecycle
│   ├── MA-agents.js       Agent catalog
│   ├── MA-health.js       System health scanner
│   ├── MA-rake.js         RAKE keyword extraction
│   ├── MA-bm25.js         BM25 search scoring
│   └── MA-yake.js         YAKE keyword extraction
├── MA-client/             Browser GUI
│   └── MA-index.html      Single-file SPA
├── MA-Config/             Runtime config (gitignored)
├── MA-entity/             Entity definitions + agent roster
├── MA-knowledge/          Reference documentation (9 docs)
├── MA-blueprints/         Task execution guides
│   ├── core/core/         5 core blueprints
│   ├── modules/modules/   8 task-type blueprints
│   ├── nekocore/          NekoCore build blueprint (5 parts)
│   └── rem-system/        REM System build blueprint (6 layers)
├── MA-workspace/          Sandboxed project workspace
│   ├── rem-system/        REM System Core (23 modules, 205 tests)
│   └── nekocore/          NekoCore Cognitive Mind (97 modules, 176 tests)
├── MA-logs/               Pulse logs (health scans, chore results)
└── MA-scripts/            Utility scripts
```

---

## Configuration

### LLM Setup

Edit `MA-Config/ma-config.json` or use the GUI settings panel (⚙):

```json
{
  "type": "openrouter",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "apiKey": "sk-or-...",
  "model": "anthropic/claude-sonnet-4",
  "maxTokens": 12288
}
```

| Field | Values | Default |
|-------|--------|---------|
| `type` | `openrouter`, `ollama` | — |
| `endpoint` | API URL | — |
| `apiKey` | Your key (blank for Ollama) | — |
| `model` | Model identifier | — |
| `maxTokens` | 1024–1000000 | 12288 |

### Ollama (Local)

```json
{
  "type": "ollama",
  "endpoint": "http://localhost:11434",
  "apiKey": "",
  "model": "llama3.1:8b",
  "maxTokens": 8192
}
```

When Ollama is selected in the GUI, the model field becomes a dropdown populated from your local Ollama instance. Selecting a model auto-fills `maxTokens` from the model's context length. You can also pull new models directly from the settings panel.

### Model Roster (Intelligent Routing)

MA can route tasks to different models based on job requirements. Configure a roster of available models in `MA-Config/model-roster.json` or via `/models add`:

```json
{
  "models": [
    {
      "id": "ollama/llama3.1:8b",
      "provider": "ollama",
      "model": "llama3.1:8b",
      "endpoint": "http://localhost:11434",
      "contextWindow": 131072,
      "tier": "local",
      "strengths": ["python", "javascript"],
      "weaknesses": ["rust"]
    }
  ]
}
```

MA evaluates each task's complexity, language, and context needs, then selects the best model:
- **Local models first** — always prefers free local models when they can handle the job
- **Performance learning** — tracks model grades (A–F) per task type and language
- **Strength/weakness matching** — avoids models with known weaknesses for the task
- **Tier escalation** — only uses premium models for complex/architect-level work
- **Cost efficiency** — prefers cheaper models when quality is comparable

Use `/models research <name>` to have MA research a model's capabilities via the LLM.

### Command Whitelist

MA can only execute commands on the whitelist. Managed via:
- GUI: Settings → Command Whitelist tab
- Slash: `/whitelist`, `/whitelist add`, `/whitelist remove`, `/whitelist reset`
- File: `MA-Config/cmd-whitelist.json`

Default whitelist includes: `cargo`, `rustc`, `python`, `node`, `npm`, `gcc`, `go`, `git`, `cat`, `grep`, and more. Dangerous binaries (`rm`, `curl`, `bash`, `powershell`, etc.) are always blocked.

---

## Ports

| Port | Purpose |
|------|---------|
| 3850 | Default |
| 3851–3860 | Fallback range if default is busy |

MA uses smart port management: if port 3850 is occupied, the server identifies what's running, prompts you, and starts on the next available port. Background launches (e.g. from the process manager) auto-resolve without prompting.

---

## API Reference

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/chat` | POST | `{ message, history?, attachments? }` | Chat / run tasks |
| `/api/config` | GET | — | Get config status |
| `/api/config` | POST | `{ type, endpoint, apiKey, model, maxTokens }` | Set config |
| `/api/entity` | GET | — | Get entity info |
| `/api/health` | GET | — | System health scan |
| `/api/commands` | GET | — | List available slash commands |
| `/api/slash` | POST | `{ command }` | Execute slash command |
| `/api/whitelist` | GET | — | Get command whitelist |
| `/api/whitelist/add` | POST | `{ binary, subcommands? }` | Add to whitelist |
| `/api/whitelist/remove` | POST | `{ binary }` | Remove from whitelist |
| `/api/whitelist/reset` | POST | `{}` | Reset to defaults |
| `/api/ollama/models` | GET | `?endpoint=...` | List local Ollama models |
| `/api/ollama/show` | POST | `{ endpoint?, model }` | Get model info (context length, etc.) |
| `/api/ollama/pull` | POST | `{ endpoint?, model }` | Pull a model from Ollama |
| `/api/pulse/status` | GET | — | Pulse timer status + config |
| `/api/pulse/config` | POST | `{ healthScan?, choreCheck? }` | Update pulse config |
| `/api/pulse/start` | POST | — | Start all pulses |
| `/api/pulse/stop` | POST | — | Stop all pulses |
| `/api/pulse/logs` | GET | `?type=health&lines=50` | Read pulse logs |
| `/api/chores` | GET | — | List all chores |
| `/api/chores/add` | POST | `{ name, description?, assignTo?, intervalMs? }` | Add a chore |
| `/api/chores/update` | POST | `{ id, ...fields }` | Update a chore |
| `/api/chores/remove` | POST | `{ id }` | Remove a chore |
| `/api/models/roster` | GET | — | List model roster |
| `/api/models/add` | POST | `{ provider, model, endpoint, ... }` | Add model to roster |
| `/api/models/update` | POST | `{ id, ...fields }` | Update a roster model |
| `/api/models/remove` | POST | `{ id }` | Remove model from roster |
| `/api/models/route` | POST | `{ message, taskType?, agentRole? }` | Test model routing for a job |
| `/api/models/performance` | GET | — | All model performance records |
| `/api/models/research` | POST | `{ model }` | Research model capabilities via LLM |
| `/api/memory/search` | GET | `?query=...&limit=5` | Search memories |
| `/api/memory/store` | POST | `{ type, content, meta }` | Store a memory |
| `/api/memory/stats` | GET | — | Memory statistics |
| `/api/memory/ingest` | POST | `{ filePath }` | Ingest file to memory |

---

## Tools Available to MA

MA uses these tools via `[TOOL:name {json}]` blocks in LLM output. Params are validated with Zod schemas.

| Tool | Usage | Description |
|------|-------|-------------|
| `ws_list` | `[TOOL:ws_list {"path":"dir/"}]` | List directory |
| `ws_read` | `[TOOL:ws_read {"path":"file"}]` | Read file (≤32KB) |
| `ws_write` | `[TOOL:ws_write {"path":"file"}]`content`[/TOOL]` | Write file |
| `ws_append` | `[TOOL:ws_append {"path":"file"}]`content`[/TOOL]` | Append to file |
| `ws_delete` | `[TOOL:ws_delete {"path":"file"}]` | Delete file/folder |
| `ws_mkdir` | `[TOOL:ws_mkdir {"path":"dir/"}]` | Create directory |
| `ws_move` | `[TOOL:ws_move {"src":"old","dst":"new"}]` | Move/rename file |
| `web_search` | `[TOOL:web_search {"query":"search"}]` | Web search |
| `web_fetch` | `[TOOL:web_fetch {"url":"https://..."}]` | Fetch page text |
| `cmd_run` | `[TOOL:cmd_run {"cmd":"command"}]` | Run shell command |

All file tools are sandboxed to `MA-workspace/`. Command execution is sandboxed via the whitelist.

---

## Health Check

```bash
node -e "const h=require('./MA-server/MA-health');console.log(h.formatReport(h.scan()))"
```

Reports: file count, critical errors, warnings. Checks JS syntax, JSON validity, HTML tag balance.

---

## Version

MA v1.0 — Part of NekoCore OS.

## License

Part of NekoCore OS. See [../LICENSE](../LICENSE).
