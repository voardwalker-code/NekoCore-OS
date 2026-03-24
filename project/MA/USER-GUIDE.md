# MA v1.0 — User Guide

This guide covers everything you need to use MA from the browser GUI and the terminal CLI.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Browser GUI](#browser-gui)
3. [Terminal CLI](#terminal-cli)
4. [Slash Commands Reference](#slash-commands-reference)
5. [Chatting with MA](#chatting-with-ma)
6. [Working on Projects](#working-on-projects)
7. [File Context & Drag-and-Drop](#file-context--drag-and-drop)
8. [Memory System](#memory-system)
9. [Knowledge Base](#knowledge-base)
10. [Command Execution](#command-execution)
11. [Managing the Whitelist](#managing-the-whitelist)
12. [Token Budget & Continuation](#token-budget--continuation)
13. [Agent Roster](#agent-roster)
14. [Pulse Engine](#pulse-engine)
15. [Chores System](#chores-system)
16. [Model Routing](#model-routing)
17. [Health Diagnostics](#health-diagnostics)
18. [Activity Monitor](#activity-monitor)
19. [Worklog System](#worklog-system)
20. [Deep Research](#deep-research)
21. [Entity Genesis Skill](#entity-genesis-skill)
22. [NekoCore OS Integration](#nekocore-os-integration)
23. [Chat Sessions](#chat-sessions)
24. [Memory Ingest](#memory-ingest)
25. [Theme Switching](#theme-switching)
26. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### 1. Start the Server

```bash
cd MA
node MA-Server.js
```

You'll see:

```
  MA — Memory Architect
  ────────────────────────────────────
  Config loaded: openrouter/anthropic/claude-sonnet-4
  Entity loaded: MA
  Memory store ready
  MA listening on http://localhost:3850
```

### 2. Configure an LLM

**First time?** MA needs an LLM backend. You have two options:

**Option A — Browser GUI:**
1. Open `http://localhost:3850`
2. The settings panel opens automatically if unconfigured
3. Pick a provider (OpenRouter or Ollama)
4. Enter your endpoint URL, API key, and model name
5. Click **Save**

**Option B — Terminal CLI:**
1. Edit `MA-Config/ma-config.json` directly:
```json
{
  "type": "openrouter",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "apiKey": "sk-or-your-key-here",
  "model": "anthropic/claude-sonnet-4",
  "maxTokens": 12288
}
```
2. Restart MA

**Using Ollama (local, no API key):**
```json
{
  "type": "ollama",
  "endpoint": "http://localhost:11434",
  "apiKey": "",
  "model": "llama3.1:8b",
  "maxTokens": 8192
}
```

**Ollama Model Discovery:**
When you select Ollama as the provider in the GUI, the Model field switches from a text input to a dropdown listing all models on your local machine. Selecting a model auto-fills `maxTokens` from that model's actual context length.

### 3. Start Chatting

Open `http://localhost:3850` in your browser, or run:

```bash
node MA-cli.js
```

---

## Browser GUI

The web GUI at `http://localhost:3850` provides a full IDE-style workspace.

### Menu Bar

The top menu bar provides dropdown menus:

| Menu | Items |
|------|-------|
| **File** | New File, New Folder, Open File, Open Folder, Save, Save All, Settings |
| **Edit** | Save, Save All |
| **View** | Workspace, Blueprints, Projects, Activity, Terminal, Reset Layout |
| **Terminal** | Toggles the terminal panel (direct click) |
| **Help** | User Guide, GitHub |

**File menu** actions are context-aware — they operate on whichever section you're currently viewing (workspace, project, etc.).

### Toolbar
- **Status dot** — Green = LLM configured, Red = not configured
- **Status text** — Shows your provider/model (e.g., `openrouter/anthropic/claude-sonnet-4`)
- **Mode pill** — Work / Chat mode toggle
- **Activity button** — Opens the activity feed

### Left Sidebar
- **Chat** — Returns focus to the main conversation view
- **Session** — Shows the current session summary and recent work
- **Activity** — Opens the live activity feed and task telemetry
- **Blueprints** — Opens the blueprint browser and editor
- **Projects** — Shows project archives and lets you resume or close them
- **Tasks** — Shows the current task workspace and editable plan
- **Todos** — Provides a quick persistent scratch todo list in the browser
- **Chores** — Shows and manages recurring chore entries
- **Mode pill** — Mirrors the current Work/Chat mode

**Rail Utilities** (bottom of left sidebar):
- **💻 Terminal** — Toggles the terminal panel
- **📥 Ingest** — Opens the memory ingest panel
- **⚙ Settings** — Opens the LLM settings tab

### Built-in IDE Editor

Files from the workspace tree open in tabbed editor panes:

- **Markdown files** — Rendered preview with a Preview/Raw toggle
- **HTML files** — Iframe preview with a Preview/Source toggle
- **Code files** (.js, .ts, .py, .rs, .cs, .css, .json, etc.) — Syntax-highlighted read-only view with line numbers and an Edit toggle to switch to a writeable textarea
- **Tabs** track unsaved changes (dot indicator) and Save writes back via the workspace API
- Chat file-link chips open in the editor instead of a new browser tab

### Terminal Panel

A terminal panel sits at the bottom of the editor area. Toggle it from:
- The **Terminal** menu item in the menu bar
- The **💻** button in the left rail utilities
- The **View → Terminal** dropdown

Type shell commands and press Enter or click Run. Output appears in the scrollable terminal output area with color-coded command echo, stdout, and stderr. Commands execute in the MA workspace directory through the sandboxed command executor (same whitelist rules apply).

### Workspace File Tree

The Workspace section in the left sidebar loads the real directory tree from `MA-workspace/`:
- Collapsible folders with expand/collapse icons
- File-type icons for common extensions
- Click a file to open it in the built-in editor
- Use **File → New File** or **File → New Folder** to create new items

### Center Chat Stage
- The chat is isolated in a centered conversation stage instead of stretching edge-to-edge across large screens
- The inspector stays visible beside the conversation

### Chat Area
- Your messages appear on the right (blue)
- MA's responses appear on the left (dark)
- System messages appear centered (gray)

### Input Bar
- Type messages and press **Enter** to send
- Press **Shift+Enter** for a new line
- Type `/` to see the slash command autocomplete popup
- Use **↑/↓** arrow keys to navigate the command popup, **Tab** or **Enter** to select

### Token Usage Bar
After each response, a thin bar below the chat shows context usage:
- **Blue** — Under 65% used, plenty of room
- **Yellow** — 65–85% used, getting close
- **Red** — Over 85% used, MA may need to use continuation

Text below shows: `Context: ~X / Y tokens (Z%) · Response reserve: W`

### Activity Monitor (Right Sidebar)

A persistent inspector pane on the right side of the screen showing real-time LLM activity:

- **Tool calls** — Workspace reads, writes, web searches, command executions
- **LLM calls** — Each model invocation with provider and token usage
- **Memory operations** — Searches, stores, knowledge loads
- **Step progress** — Multi-step task progress with checkmarks
- **Task plan** — When a task is running, the plan is displayed with checkboxes
- **Session worklog** — Summary of work done this session

### Settings Panel

Accessed from **File → Settings**, the **⚙** rail utility button, or the left sidebar.

**LLM Tab:**
- Provider (OpenRouter / Ollama)
- Endpoint URL
- API Key
- Model name (text input for OpenRouter, dropdown for Ollama)
- Max Tokens slider (1,024–1,000,000 — auto-set from Ollama model info)
- **Memory Recall** — Slider (6–50) controlling how many memories MA retrieves per message, plus a toggle to disable recall entirely
- **Workspace Path** — Configurable working directory (defaults to `MA-workspace/`)
- **Theme** — Dark / Light / System selector
- **Ollama extras:** refresh model list button, pull new models, model info display (family, size, quantization, context length)

**Command Whitelist Tab:**
- View all currently allowed commands
- Add new commands (binary name + optional subcommands)
- Remove commands
- Reset to defaults

### File Drag & Drop
Drag files from your file explorer onto the chat window:
1. A blue overlay appears: "Drop files here"
2. Drop the file(s) — they appear as chips below the input
3. Click **✕** on a chip to remove it
4. Type a message (optional) and press Enter
5. MA receives the file contents as context

**Limits:** Max 5 files, 32KB each. Text files only.

---

## Terminal CLI

```bash
node MA-cli.js
```

The CLI provides the same capabilities as the GUI:

- Type any message and press Enter → chat with MA
- Type `/command` → run a slash command
- Type `/help` → see all commands
- Type `/exit` or `/quit` → quit

### Example Session

```
MA> /health
MA Health Scan
========================================
Files: 18 | Critical: 0 | Warnings: 0

MA> /memory stats
  episodic: 47 entries
  semantic: 12 entries

MA> Build a Python CLI tool that converts CSV to JSON
  [Task: code (4 steps)]
  ...

MA> /projects
  proj_001 (active) — CSV to JSON Converter, 6 nodes

MA> /exit
```

---

## Slash Commands Reference

All commands work in both the GUI and CLI. Type `/` in the GUI to see autocomplete suggestions.

### System

| Command | Description |
|---------|-------------|
| `/health` | Run a health scan on all MA modules. Reports critical errors and warnings. |
| `/config` | Show current LLM configuration (provider, model, endpoint, max tokens). |

### Memory

| Command | Description |
|---------|-------------|
| `/memory stats` | Show memory store statistics — count of episodic and semantic entries. |
| `/memory search <query>` | Search memories by keyword. Returns top 5 results with relevance scores. |
| `/ingest <filepath>` | Ingest a workspace file into memory for future recall. Path is relative to `MA-workspace/`. |

### Knowledge

| Command | Description |
|---------|-------------|
| `/knowledge` | List all available knowledge docs in `MA-knowledge/`. |
| `/knowledge <name>` | Display a specific knowledge doc. Use the filename without `.md`. Example: `/knowledge code-quality` |

### Projects

| Command | Description |
|---------|-------------|
| `/projects` | List all project archives with ID, status, and node count. |
| `/project open <id>` | Resume a closed project. MA reloads the project context. |
| `/project close <id>` | Close an active project. Archives are preserved. |
| `/project status <id>` | Show detailed project stats: nodes, edges, history. |

### Command Whitelist

| Command | Description |
|---------|-------------|
| `/whitelist` | Show all currently allowed shell commands and their permitted subcommands. |
| `/whitelist add <binary> [sub1,sub2,...]` | Allow a new command. Subcommands are comma-separated. Blank = allow all subcommands. Example: `/whitelist add deno run,test,fmt` |
| `/whitelist remove <binary>` | Remove a command from the whitelist. Example: `/whitelist remove deno` |
| `/whitelist reset` | Reset the whitelist back to factory defaults. |

### Pulse & Chores

| Command | Description |
|---------|-------------|
| `/pulse` | Show pulse engine status (active timers, intervals, last-run times). |
| `/pulse start` | Start all enabled pulses. |
| `/pulse stop` | Stop all running pulses. |
| `/pulse log health` | Show recent health scan pulse log entries. |
| `/pulse log chores` | Show recent chore execution log entries. |
| `/chores list` | List all chores with status, grade, and run count. |
| `/chores add <name> \| <description>` | Add a new chore. Use pipe to separate name and description. |
| `/chores remove <id>` | Remove a chore by ID. |
| `/chores run <id>` | Manually trigger a chore immediately. |

### Model Roster

| Command | Description |
|---------|-------------|
| `/models` | List all models in the roster with tier, context, cost, and strengths. |
| `/models add <provider> <model> [endpoint]` | Add a model. Provider: ollama or openrouter. |
| `/models remove <id>` | Remove a model from the roster. |
| `/models perf` | Show performance tracking data for all roster models. |
| `/models route <test message>` | Test which model would be selected for a given task. |
| `/models research <model>` | Research a model's capabilities, pricing, and strengths via LLM. |

### CLI-Only

| Command | Description |
|---------|-------------|
| `/help` | Show the command help banner. |
| `/exit` or `/quit` | Quit the CLI. |

---

## Chatting with MA

Just type naturally. MA classifies your message and routes it:

### Conversation Mode
Simple questions, greetings, opinions → MA responds conversationally.

```
You: Hey, how does the memory system work?
MA:  The memory system uses two stores...
```

### Task Mode
Coding, research, writing, analysis requests → MA activates the task engine with planning and multi-step execution.

```
You: Build a REST API in Python with Flask that has CRUD endpoints for a todo list
MA:  I'll write this in parts...
     [Creates project structure, writes files, runs tests]
     Task: code (5 steps)
```

**Task types and what triggers them:**

| Type | Trigger Keywords |
|------|-----------------|
| **code** | write, build, create, implement, fix, debug, refactor, script, function |
| **research** | research, find, search, investigate, what is, how does |
| **writing** | compose, draft, article, blog, document, summarize |
| **analysis** | analyze, compare, evaluate, assess, breakdown, pros/cons |
| **project** | project, scaffold, setup, boilerplate, full app |
| **architect** | architect, project plan, blueprint, specification, design |
| **delegate** | delegate, assign, agent, who can, available agents |
| **memory_query** | remember, recall, what did we, past, previous |

---

## Working on Projects

MA can scaffold and manage multi-file projects in its workspace (`MA-workspace/`).

### Start a Project
```
You: Create a Node.js REST API for a bookshelf app with SQLite
```
MA will:
1. Plan the project structure
2. Create directories and files step by step
3. Write code, tests, and config
4. Verify each file after writing
5. Summarize what was built

### Resume a Project
```
/projects                    ← see all projects
/project open proj_001       ← resume one
You: Add pagination to the /books endpoint
```

### Project Context
MA automatically scans `MA-workspace/` and shows project directories in its context so it knows what exists.

---

## File Context & Drag-and-Drop

### Referencing Files in Chat
When you mention file paths in your message, MA auto-detects them and reads the files:

```
You: Can you review myproject/src/index.js and fix the error handling?
```
MA detects `myproject/src/index.js`, reads it from the workspace, and includes the full content in its context.

**Path types detected:**
- Workspace-relative paths: `myproject/src/index.js`, `rem-system/server/pipeline.js`
- Bare filenames at workspace root: `package.json`, `README.md`

**Limits:** Files must be in `MA-workspace/`, max 32KB each.

### Dragging Files
1. Drag a file from your file explorer onto the MA chat window
2. A blue overlay appears — drop the file
3. File chips appear below the input showing filenames
4. Type your question and press Enter (or just send the files)
5. MA receives the full file contents

**Example:**
```
[Drag config.json into chat]
You: What's wrong with this config? It's not loading.
MA:  Looking at your config.json, I can see the issue...
```

---

## Memory System

MA has two memory stores that persist across sessions:

### Episodic Memory
Automatically records chat interactions and task results. MA builds context from past conversations.

### Semantic Memory
Structured knowledge you explicitly ingest. Good for reference material.

### Commands

```
/memory stats              ← show counts
/memory search auth        ← search for "auth" in memories
/ingest myproject/docs/api.md  ← ingest a file
```

### How MA Uses Memory
- Before each response, MA searches its memory for relevant context
- Top 3 matching memories are included in the system prompt
- Task results are auto-saved as episodic memories
- Chat summaries are auto-saved for continuity

### Chat History Persistence
MA saves the last 8 messages (4 exchanges) to `MA-Config/chat-history.json`. When you refresh the browser or restart the server, your recent conversation is restored automatically.

### Memory Chain IDs
Each conversation turn generates a unique chain ID linking the user's message and MA's reply. When MA searches memory and finds a match, it automatically expands the results to include chain siblings — so if it recalls your question, it also recalls its own answer (and vice versa).

### ISO Timestamps
Every memory record includes both a machine-readable epoch timestamp (`createdAt`) and a human-readable ISO datetime (`createdAtISO`).

### Blueprint Injection
When MA classifies your message as matching a task type (even at low confidence), the relevant execution blueprint is injected into the system prompt — even in conversational mode. This means MA draws on its blueprints more often, producing higher-quality responses for technical topics.

---

## Knowledge Base

MA ships with 9 reference documents in `MA-knowledge/`:

| Document | Topic |
|----------|-------|
| `agent-delegation` | Patterns for delegating to agents |
| `architecture-patterns` | System design principles |
| `code-quality` | Code review standards |
| `cognitive-pipeline` | Cognitive architecture flow |
| `contracts-schemas` | Data contracts & JSON schemas |
| `entity-identity` | Entity lifecycle & identity |
| `memory-system` | Memory architecture details |
| `project-architect` | Project scaffolding patterns |
| `project-archive` | Archive management |

Knowledge docs are **auto-loaded** when your message contains relevant keywords. You can also browse manually:

```
/knowledge                    ← list all docs
/knowledge code-quality       ← view a specific doc
```

---

## Command Execution

MA can execute shell commands via the `cmd_run` tool — but only commands on the whitelist.

### Default Whitelist

| Binary | Allowed Subcommands |
|--------|-------------------|
| `cargo` | build, run, test, check, clippy, fmt, init, new, add, remove, update, doc |
| `rustc`, `rustfmt` | all |
| `python`, `python3` | all |
| `pip`, `pip3` | install, list, show, freeze, uninstall |
| `node` | all |
| `npm` | init, install, test, run, start, build, ls, outdated, update, ci |
| `npx` | all |
| `gcc`, `g++`, `make`, `cmake` | all |
| `go` | build, run, test, fmt, vet, mod, get |
| `git` | init, status, add, commit, log, diff, branch, checkout, tag |
| `cat`, `head`, `tail`, `wc` | all |
| `ls`, `dir`, `find`, `grep`, `type` | all |

### Always Blocked
These are **never** allowed, even if you try to add them:
`rm`, `del`, `format`, `shutdown`, `kill`, `curl`, `wget`, `powershell`, `cmd.exe`, `bash`, `sh`

### Security
- Commands run with `shell: false` (no shell metacharacters)
- Working directory locked to `MA-workspace/`
- 60-second timeout (max 300s)
- Output capped at 16KB per stream
- Shell operators (`; & | > <`) are rejected

---

## Managing the Whitelist

### Via GUI
1. Click ⚙ → Command Whitelist tab
2. View, add, or remove commands
3. Click "Reset Defaults" to restore factory settings

### Via Slash Commands
```
/whitelist                          ← view current whitelist
/whitelist add deno run,test,fmt    ← add deno with specific subcommands
/whitelist add ruby                 ← add ruby with all subcommands
/whitelist remove deno              ← remove deno
/whitelist reset                    ← reset to defaults
```

### Via Config File
Direct edit `MA-Config/cmd-whitelist.json`:
```json
{
  "cargo": ["build","run","test"],
  "python": null,
  "node": null
}
```
(`null` = all subcommands allowed, array = only those subcommands)

---

## Token Budget & Continuation

MA is aware of its context window limits and manages them actively.

### How It Works
- **20% of maxTokens** is reserved for MA's response
- The rest is the **context budget** (system prompt + history + your message)
- The GUI shows a **color-coded bar** after each response:
  - 🔵 Blue = under 65% — plenty of room
  - 🟡 Yellow = 65–85% — getting close
  - 🔴 Red = over 85% — near the limit

### History Compression
When your conversation gets long, MA automatically compresses older turns:
- The 4 most recent messages are kept verbatim
- Older turns are compressed into a bullet-point summary
- This happens transparently — you don't need to do anything

### Continuation
When MA is writing a large file or long response and approaches the limit:
1. It stops at a **logical breakpoint** (end of a function, end of a section)
2. It tells you what was completed and what remains
3. A **"Continue"** button appears in the chat
4. Click it → MA resumes from where it left off

You can also manually continue:
```
You: continue
```

### Adjusting the Budget
Use the Max Tokens slider in Settings (⚙ → LLM tab):
- **4096** — small, fast responses (good for quick chat with local models)
- **12288** — default, balanced
- **32768** — large context for complex projects
- **131072** — extended context for frontier models
- **1000000** — maximum (1M tokens, for models that support ultra-long context)

---

## Agent Roster

MA has 6 specialist agents for delegation:

| Agent | Role |
|-------|------|
| `senior-coder` | Experienced developer for complex code |
| `junior-coder` | Simple coding tasks |
| `code-reviewer` | Code review and quality checks |
| `test-engineer` | Test writing and verification |
| `nlp-researcher` | NLP and language processing research |
| `contract-architect` | API contracts and schema design |

Ask MA to delegate:
```
You: Delegate a code review of myproject/src/auth.js to the code reviewer
```

---

## Pulse Engine

The pulse engine runs recurring background tasks on configurable timers. Two built-in pulses ship with MA:

### Health Scan Pulse
Runs an automatic health scan at a set interval (default: every 60 minutes) and logs the results.

- Logs are written to `MA-logs/pulse-health.log`
- Each entry records: timestamp, file count, critical errors, warnings
- If critical issues are found, they're listed in the log

### Chore Check Pulse
Checks the chore list at a set interval (default: every 30 minutes) and executes any chores that are due.

- Reads from `MA-Config/chores.json`
- Each chore has its own repeat interval
- Results are logged to `MA-logs/pulse-chores.log`

### Configuration
Pulse timers are configured in `MA-Config/pulse-config.json`:

```json
{
  "healthScan": { "enabled": true, "intervalMs": 3600000 },
  "choreCheck": { "enabled": true, "intervalMs": 1800000 }
}
```

You can also adjust config through the API (`/api/pulse/config`) or use `/pulse start` and `/pulse stop` to control them live.

### Pulse Logs
View logs with:
```
/pulse log health     ← last 20 health-scan entries
/pulse log chores     ← last 20 chore-execution entries
```

Or via the API: `GET /api/pulse/logs?type=health&lines=50`

---

## Chores System

Chores are repeating tasks that MA delegates to agents. Unlike one-off tasks, chores automatically repeat on their interval and MA grades the result each time.

### Adding a Chore

Via slash command:
```
/chores add Clean up temp files | Scan MA-workspace for .tmp and .bak files and delete them
```

Via API:
```json
POST /api/chores/add
{
  "name": "Clean up temp files",
  "description": "Scan MA-workspace for .tmp and .bak files and delete them",
  "assignTo": "senior-coder",
  "intervalMs": 3600000
}
```

### How Chores Execute
1. The chore check pulse fires on its interval
2. MA checks each chore's `lastRun` time against its `intervalMs`
3. If a chore is due, MA dispatches it through the chat engine with full tool access
4. The assigned agent (or MA itself if `assignTo` is blank) executes the task
5. MA evaluates the result with an LLM call and assigns a letter grade (A–F)
6. The grade, result summary, and execution details are logged

### Viewing Chores
```
/chores list
```
Shows all chores with their ID, name, assigned agent, last grade, run count, and enabled status.

### Managing Chores
```
/chores remove chore_abc123    ← delete a chore
/chores run chore_abc123       ← manually trigger a chore right now
```

### Grading
MA grades chore results on an A–F scale:
- **A** — Excellent, task completed thoroughly
- **B** — Good, completed with minor issues
- **C** — Acceptable, completed but needs improvement
- **D** — Poor, partially completed or significant issues
- **F** — Failed, task not completed

Grades are stored on the chore record and logged in `MA-logs/pulse-chores.log`.

---

## Model Routing

MA can automatically select the best LLM for each task from a user-configured roster of models. This means you don't need Opus doing simple text generation — a local model handles the easy work, while premium models are reserved for complex tasks.

### Setting Up the Roster

Add models to MA's roster via slash commands:
```
/models add ollama llama3.1:8b http://localhost:11434
/models add ollama codellama:13b http://localhost:11434
/models add openrouter anthropic/claude-sonnet-4 https://openrouter.ai/api/v1/chat/completions
```

Or via the API:
```json
POST /api/models/add
{
  "provider": "ollama",
  "model": "llama3.1:8b",
  "endpoint": "http://localhost:11434",
  "contextWindow": 131072,
  "tier": "local",
  "strengths": ["python", "javascript"],
  "weaknesses": ["rust"]
}
```

Each model entry has:
- **provider** — ollama or openrouter
- **tier** — local, cheap, mid, or premium (auto-detected for ollama)
- **contextWindow** — max tokens the model supports
- **strengths** / **weaknesses** — what the model is good/bad at
- **costPer1kIn** / **costPer1kOut** — pricing (0 for local models)

### How Routing Works

When MA receives a task:
1. **Evaluate** — MA classifies the task complexity (simple/medium/complex), detects the programming language, and estimates context window needs
2. **Score** — Each roster model is scored on: local preference (+30 for local), performance history (up to +32 for A average), strength/weakness match (±15–20), context headroom, cost efficiency
3. **Select** — The highest-scoring model is used for that task
4. **Fallback** — If no roster models exist or none fit, MA uses its primary config

**Local models are always preferred.** MA only escalates to cloud/premium models when the task is too complex or the local model has a poor track record.

### Performance Learning

After each task, MA records the model's performance:
- Tasks get a baseline grade (B for success, F for failure)
- Chores get graded A–F by MA's evaluator
- Performance is tracked per model, per task type, per language

Over time, MA learns which models are good at what:
- A model that keeps getting F on Rust code won't be selected for Rust tasks
- A model that gets A on creative writing will be preferred for writing tasks
- A model that outputs `// ...rest of code` will get penalized and avoided

View performance data:
```
/models perf
```

### Testing the Router

See which model MA would pick for a given task:
```
/models route write a python script to parse CSV files
/models route architect a full REST API with database
```

### Researching Models

MA can research a model's capabilities, pricing, and strengths using its own LLM:
```
/models research llama3.1:8b
/models research claude-sonnet-4
```

If the model is in the roster, MA auto-updates its entry with the research results (context window, strengths, weaknesses, tier, pricing).

### Roster File

The roster is stored in `MA-Config/model-roster.json`. Performance data is in `MA-Config/model-performance.json`. Both are auto-created on first run.

---

## Health Diagnostics

Run a health scan to check all MA modules:

```
/health
```

Output:
```
MA Health Scan
========================================
Files: 18 | Critical: 0 | Warnings: 1

  [WARNING] MA-client/MA-index.html — html_imbalance: open=65 close=60
```

**Severity levels:**
- **Critical** — Module won't load. Needs immediate fix.
- **Warning** — Minor issue. Usually cosmetic (e.g., HTML void element counting).

You can also run health from the terminal without starting the server:
```bash
node -e "const h=require('./MA-server/MA-health');console.log(h.formatReport(h.scan()))"
```

---

## Activity Monitor

The activity monitor is a real-time sidebar panel in the browser GUI that shows everything MA is doing.

### What It Shows

- **LLM Calls** — Every model invocation with the provider, model name, and purpose
- **Tool Calls** — Workspace reads/writes, web searches, command executions as they happen
- **Memory Searches** — When MA searches its memory for relevant context
- **Knowledge Loads** — When reference documents are loaded
- **Agent Dispatches** — When tasks are delegated to specialist agents
- **Step Progress** — For multi-step tasks, each step shows a progress indicator

### Task Plan Display

When MA is executing a multi-step task, the activity monitor shows the current task plan with checkboxes that update as steps complete. This gives you visibility into what MA is planning to do and how far along it is.

### Session Worklog

At the bottom of the activity monitor, a worklog summary shows what was accomplished during the current session.

---

## Worklog System

MA maintains a persistent worklog at `MA-workspace/MA-WORKLOG.md` that tracks ongoing work across sessions.

### What the Worklog Contains

- **Active Project** — The project MA is currently working on
- **Current Task** — What MA is doing right now
- **Task Plan** — Step-by-step plan with checkboxes
- **Recent Work** — Table of recently completed tasks with timestamps
- **Resume Point** — Where to pick up if the session is interrupted

### How It Works

- Auto-updated when a task starts and completes
- Loaded into MA's system prompt for session continuity
- Accessible via the `/worklog` slash command or `GET /api/worklog`

### Commands

```
/worklog          ← view the current worklog
```

---

## Deep Research

For thorough investigation of complex topics, use the deep research task type.

### Triggering Deep Research

Include phrases like "deep dive research", "thorough research", or "comprehensive research" in your message:

```
You: Do a deep dive research on WebAssembly component model
```

### How It Differs from Regular Research

| Aspect | Regular Research | Deep Research |
|--------|-----------------|---------------|
| Max steps | 6 | 10 |
| Max LLM calls | 20 | 40 |
| Search queries | 2-3 | 8-15+ |
| Source depth | Surface-level | Full-read 5-10 sources |
| Output length | Brief summary | 2,000-5,000+ words |

### Output Structure

Deep research produces a publication-quality report:
1. Executive summary
2. Background and history
3. Detailed evidence and findings
4. Expert perspectives
5. Criticisms and counterarguments
6. Comparative analysis
7. Future outlook
8. Full source list with URLs

---

## Entity Genesis Skill

MA can create rich, psychologically deep entities for NekoCore OS through an iterative genesis process.

### How It Works

Ask MA to create an entity:

```
You: Create a new entity — a retired detective who became a philosophy professor
```

MA will:
1. **Design the character** — personality, backstory, voice, core traits
2. **Create the entity shell** on NekoCore OS via API
3. **Generate memories chapter by chapter** — each life chapter builds on the previous one
4. **Read cognitive state between rounds** — MA checks the entity's evolving neurochemistry, beliefs, and persona after each memory batch
5. **Adapt subsequent memories** — Later memories reflect the entity's accumulated psychological evolution
6. **Summarize** — Final report of the entity's identity, key memories, and personality profile

### Requirements

- NekoCore OS must be running on port 3847
- Uses the `entity_genesis` task type (auto-detected from keywords like "create entity", "hatch entity", "build a character")

### What Makes It Special

Unlike simple entity creation, genesis produces entities with deeply layered memories that reference each other — the entity's personality emerges from accumulated experience rather than being declared upfront.

---

## NekoCore OS Integration

MA can be called directly from NekoCore OS using the `/ma` slash command in the OS chat.

### How the Bridge Works

1. A user types `/ma <message>` in NekoCore OS chat
2. NekoCore OS checks if MA is running; if not, it auto-boots MA via the process manager
3. The message is forwarded to MA's `/api/chat` endpoint
4. MA processes the message with full tool access (workspace, commands, web search)
5. The response is returned to NekoCore OS chat with MA attribution

### Use Cases

- **Tool execution** — "Write a Python script" → MA creates the file in its workspace
- **Web research** — "Research Node.js 24 features" → MA searches the web and returns findings
- **Project work** — "Continue working on the API project" → MA resumes from its worklog
- **Code review** — "Review the auth module" → MA reads and analyzes the code

### Ports

| Server | Default Port | Auto-boot |
|--------|------|-----------|
| NekoCore OS | 3847 | — (main server) |
| MA | 3850 | Yes, via `/ma` command |

Both servers use smart port management — if the default port is busy, the server identifies what's running there and can start on the next available port.

---

## Chat Sessions

MA supports multiple named chat sessions with persistent history.

### Session Picker
The chat panel shows the last 4 sessions as clickable chips above the chat area. A **History ▾** dropdown lists all older sessions grouped by date. Selecting a session loads its messages; typing without selecting starts a new session automatically.

### How Sessions Work
- Sessions are stored as individual JSON files under `MA-Config/chat-sessions/`
- Each session stores its own message history independently
- Chat no longer auto-loads the last session on page load — you choose which session to resume or start fresh
- Session endpoints: `GET /api/chat/sessions`, `GET /api/chat/session/:id`, `POST /api/chat/session`

---

## Memory Ingest

MA can ingest entire project codebases into its memory for enhanced context during conversations.

### Opening the Ingest Panel
Click the **📥 Ingest** button in the left rail utilities.

### External Folder Ingest
Feed any project folder into MA's memory with a custom archive name:
1. Enter the folder path and an archive name
2. Click **Ingest**
3. Watch live file-by-file progress with a progress bar and scrolling log
4. Use the **Stop** button to abort if needed (uses AbortController — both client and server respect the abort)
5. When complete (or stopped/errored), click **Close** to return

### Archives
Each ingested folder gets its own tracked archive. Archives are listed in the ingest panel with file and chunk counts. Chat search uses `searchWithArchives` — episodic (short-term) searched first, then semantic memories with archive relevance boosting.

### Error Handling
If ingest encounters errors, a styled error panel appears with details. The ingest can be retried after reviewing errors.

---

## Theme Switching

MA supports three appearance modes:

| Mode | Behavior |
|------|----------|
| **Dark** | Dark background with light text (default) |
| **Light** | Light background with dark text |
| **System** | Follows your OS/browser preferred color scheme |

### Configuring
Go to **File → Settings** (or **⚙** in the rail), then find the **Theme** selector. Your choice persists in localStorage and applies immediately.

When set to **System**, a live media-query listener keeps the theme in sync if your OS appearance changes while MA is open.

---

## Tips & Best Practices

### For Coding Tasks
- **Be specific:** "Build a Flask REST API with /users CRUD endpoints and SQLite" works better than "build something"
- **Reference files:** "Fix the error in myproject/src/api.js" — MA will read the file automatically
- **Large files:** MA writes in chunks and verifies each one. If it says "I'll write this in parts," let it finish
- **Review:** MA auto-reads files after writing to check completeness. If something was truncated, it will continue

### For Research
- **Use web search:** "Research the latest Node.js 22 features" — MA uses `web_search` and `web_fetch`
- **Ingest results:** After research, ingest important findings with `/ingest filepath`

### For Long Conversations
- The token bar shows how much room is left
- If the bar turns yellow, consider starting a new topic or let MA compress
- If the bar turns red, MA auto-compresses older history and uses continuation markers
- Use larger maxTokens (32768+) for complex multi-file projects

### For Project Work
- Start with a clear project description: "Create a [type] app with [features]"
- Use `/projects` to see what's in the workspace
- Open existing projects with `/project open <id>` before asking follow-up questions
- MA sees all workspace directories automatically — just mention paths

### General
- Type `/` to see all available commands
- Use **File → Settings** or the **⚙** rail button to adjust settings anytime
- MA remembers previous conversations through its memory store
- Drop documentation files into the chat for MA to reference
- Open the **Help → User Guide** menu to access this guide in a new tab
- Use `/pulse` and `/chores` to manage automated recurring tasks
- Use the terminal panel for quick shell commands without leaving the GUI
- Switch themes from Settings to match your preference
