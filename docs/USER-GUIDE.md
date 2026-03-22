# NekoCore OS — User Guide

A complete guide to using NekoCore OS, the Cognitive WebOS for persistent AI identity.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Desktop Interface](#desktop-interface)
3. [Start Menu & App Launcher](#start-menu--app-launcher)
4. [Core Apps](#core-apps)
5. [Mind & Identity Apps](#mind--identity-apps)
6. [Journal & Dream Apps](#journal--dream-apps)
7. [Tools & Workspace Apps](#tools--workspace-apps)
8. [System Apps](#system-apps)
9. [Entity System](#entity-system)
10. [Chat & Conversations](#chat--conversations)
11. [Slash Commands](#slash-commands)
12. [Brain & Cognitive Engine](#brain--cognitive-engine)
13. [Memory System](#memory-system)
14. [Dream System](#dream-system)
15. [LLM Configuration](#llm-configuration)
16. [System Health & Maintenance](#system-health--maintenance)
17. [Theme System](#theme-system)
18. [Keyboard Shortcuts](#keyboard-shortcuts)
19. [MA Integration](#ma-integration)
20. [Multi-User & Profiles](#multi-user--profiles)
21. [Tasks & Projects](#tasks--projects)
22. [Server Administration](#server-administration)
23. [Troubleshooting](#troubleshooting)
24. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### 1. Start the Server

From the `project/` directory:

```bash
npm start
```

If PowerShell script execution policy blocks npm, run directly:

```powershell
node server/server.js
```

You'll see:

```
NekoCore OS
OpenRouter + Ollama

➜  http://localhost:3847
```

If port 3847 is already in use, the server will identify what's running there and ask if you want to start another instance on a different port. Non-interactive launches (e.g. from the process manager) auto-resolve to the next free port.

### 2. Open the UI

Navigate to the URL shown in the startup banner (default `http://localhost:3847`).

### 3. First-Time Setup

On first launch, the **Setup Wizard** appears:

1. **Choose an LLM provider** — OpenRouter (cloud) or Ollama (local)
2. **Enter your credentials** — API key and endpoint (or select a local model)
3. **Create or load an entity** — your AI companion needs an identity before you can chat

After setup completes, you land on the desktop with the Chat app ready.

### 4. Requirements

- **Node.js 18+** (tested with Node.js 24)
- **No other runtime dependencies** — zero `npm install` required
- **LLM access** — OpenRouter API key OR a local Ollama instance
- **Browser** — any modern browser (Chrome, Firefox, Edge, Safari)

---

## Desktop Interface

NekoCore OS presents a desktop-style shell in the browser, modeled after a windowed operating system.

### Shell Layout

| Element | Location | Purpose |
|---------|----------|---------|
| **Header bar** | Top | Shows active entity name, LLM provider/model, brain status, current theme |
| **Side dashboard** | Left edge | Pinned app icons for quick launch |
| **Desktop** | Center | Background area, home section |
| **Taskbar** | Bottom | Running app indicators, start button, system tray |
| **Start menu** | Bottom-left (click) | App launcher with categories, entity switcher, power menu |
| **Context menu** | Right-click | Contextual actions anywhere on the desktop |
| **Snap dock** | Edges | Drag windows to edges to snap/tile them |

### Header Status Widgets

The header bar shows four live status indicators:

- **Entity** — Name of the currently active entity (e.g., "Luna")
- **Provider** — Active LLM provider and model (e.g., "openrouter/claude-sonnet-4")
- **Brain** — Brain loop status ("Idle", "Running", "Sleeping")
- **Theme** — Currently active visual theme

### Windows

Each app opens in a draggable, resizable window. Windows can be:

- **Dragged** by the title bar
- **Resized** by edges and corners
- **Minimized** to the taskbar
- **Maximized** to fill the screen
- **Snapped** by dragging to screen edges
- **Closed** with the × button

Multiple apps can be open simultaneously — windows stack and can overlap.

---

## Start Menu & App Launcher

Click the start button (bottom-left) or the Apps button on the taskbar to open the start menu.

### Sections

1. **Pinned Apps** — Your favorite apps displayed as an icon grid for one-click launch
2. **Categories** — Browse apps by function (Core, Tools, Mind, Journals, System, etc.)
3. **Category Apps** — The apps within the selected category
4. **Entity Section** — Shows the active entity, other available entities, and a Create button

### App Categories

| Category | Apps Included |
|----------|--------------|
| **Core** | Chat, Entity, Creator, Users |
| **Browse & Research** | NekoCore Browser, Skills |
| **Tools & Workspace** | Workspace, Popouts, Documents, Bug Tracker, Resource Manager, Hello World |
| **Mind & Identity** | Visualizer, Physical Body |
| **Journals & Dreams** | Dream Gallery, Life Diary, Dream Diary |
| **Appearance** | Themes |
| **System** | Settings, Advanced, Task Manager, Observability, Core Debug, Archive, NekoCore OS |

---

## Core Apps

### Chat

The primary interaction surface. Talk to your active entity here.

**Features:**
- Large scrollable chat area with message history
- Your messages appear on the right, entity responses on the left
- System messages appear centered
- Inner dialog visibility — see the entity's cognitive reasoning process
- Memory connection streaming — watch memories being retrieved in real-time
- Subconscious auto-save slider — controls how aggressively memories are compressed
- Sleep button — sends the entity to sleep mode for memory consolidation
- Slash command input — type `/` to access commands (see [Slash Commands](#slash-commands))
- File drag-and-drop — drop files for the entity to read

**Default window:** 980×680, green accent

### Entity

View and manage the active entity's profile.

**Shows:**
- Entity name, gender, traits, and creation mode
- Emotional state and mood
- Core memories
- Relationships with users
- Goal status
- Memory count and health

**Default window:** 820×620, gold accent

### Creator

The entity creation wizard with multiple creation methods.

**Creation Methods:**
- **Quick Hatch** — Name, gender, brief traits. Auto-generates everything else in under 60 seconds
- **Guided** — Conversational flow where you answer questions about the entity's identity
- **Character Template** — Pick an archetype (Detective, Artist, Scholar, etc.) and customize
- **Advanced** — Full manual control over all fields

**Default window:** 980×760, gold accent

### Users

Multi-user profile management.

**Features:**
- Create and switch between user profiles
- Each user has their own relationship history with entities
- Profile chips for quick user switching

**Default window:** 900×660, cyan accent

---

## Mind & Identity Apps

### Visualizer

Interactive visualization of the entity's memory network and neural graph.

**Features:**
- Graph view of memory connections and semantic relationships
- Trace graph visualization
- Belief network display
- Filter and search within the graph

**Default window:** 1020×700, indigo accent

### Physical Body

The entity's somatic awareness — a window into how the entity "feels" physically.

**Shows:**
- Current body sensations (computed from neurochemistry)
- Stress level indicator
- Intensity readings for each sensation
- Natural language descriptions of the entity's physical state

**Sensations tracked:**
- Tension, warmth, coolness, lightness, heaviness, restlessness, calm, numbness

**Default window:** 900×640, pink accent

---

## Journal & Dream Apps

### Dream Gallery

A visual gallery of dreams generated during sleep and consolidation cycles.

**Features:**
- Browse generated dream narratives
- View pixel art dream imagery (auto-generated from memory themes)
- Dream timestamps and memory connections
- Filter by dream type or theme

**Default window:** 980×680, purple accent

### Life Diary

The entity's personal journal — a narrative record of its experiences and reflections.

**Features:**
- Chronological entries summarizing the entity's life events
- Memory-derived narrative passages
- Identity reflection content

**Default window:** 900×640, pink accent

### Dream Diary

A chronicle of the entity's dream experiences, distinct from the visual gallery.

**Features:**
- Written dream records with theme analysis
- Recurring dream theme tracking (themes appearing 2+ times are flagged)
- Dream-to-memory linkages

**Default window:** 900×640, purple accent

---

## Tools & Workspace Apps

### Workspace

File and project management within the NekoCore OS environment.

**Default window:** 980×680, orange accent

### Documents

Document editor and library for reading and editing text content.

**Default window:** 980×680, orange accent

### Skills

Browse, manage, and invoke entity skills.

**Features:**
- View all registered skills and their capabilities
- Invoke skills directly by name
- See skill execution results

**Default window:** 980×680, orange accent

### NekoCore Browser

An integrated web browser that runs inside NekoCore OS.

**Features:**
- Tabbed browsing with Ctrl+T / Ctrl+W
- URL bar with Ctrl+L focus
- Bookmarks (Ctrl+D to toggle, Ctrl+Shift+B for manager)
- History (Ctrl+H)
- Downloads (Ctrl+J)
- Back/Forward navigation (Alt+←/→)
- Home page at `https://neko-core.com`
- Search Web and Search Home shortcuts

**Default window:** 1080×720, cyan accent

### Bug Tracker

A developer tool for tracking bugs and errors in your projects.

**Features:**
- Two-panel layout: scrollable bug list + bug editor
- Bug fields: ID (auto-generated BUG-001+), title, severity (critical/high/medium/low), status (open/in-progress/fixed/wont-fix/duplicate), area, description, steps to reproduce, expected/actual behavior
- Screenshot capture — full OS or active window, with JPEG compression for large captures
- Save/load `.bugtrack.json` files with merge dialog for combining workspaces
- Markdown and JSON report generation with format and filter options
- Search, filter by status, sort by severity/newest/status/ID
- Keyboard shortcuts: Ctrl+N (new bug), Ctrl+S (save bug), Ctrl+Shift+S (export file)
- Dirty-tracking status bar

**Default window:** 960×700, red accent

### Resource Manager

A unified management interface for five resource types across the system.

**Five Type Tabs:**

| Tab | Type | Capabilities |
|-----|------|--------------|
| **Todos** | Per-entity todo items | Full CRUD, priority (low/medium/high/critical), status tracking |
| **Pulses** | MA pulse timers | View/manage via proxy to MA at port 3850 |
| **Tasks** | Task archive entries | Read-only archive viewer |
| **Projects** | Project records | Full CRUD via task-project-store |
| **Blueprints** | Module blueprint files | Read/edit markdown blueprint files |

**Features:**
- List + editor panel layout for each type
- Set Active / Unset Active toggling — mark which todo, task, project, or pulse is currently active
- Entity selector for multi-entity support
- Search and filter within each type

**Default window:** 1060×740, teal accent

### Popouts

Detach content into floating windows for multi-monitor or side-by-side workflows.

**Default window:** 980×680, orange accent

---

## System Apps

### Settings

The main configuration hub.

**Sections:**

1. **Entity Management** — Create, load, delete entities. View current entity profile.
2. **LLM Provider Setup** — Configure LLM backends for Main Chat, Subconscious, Dream Engine, and Orchestrator.
3. **NekoCore OS LLM** — Dedicated reasoning model for OS governance (entity management, model health, routing).
4. **System Health** — Memory healing, statistics, trace graph rebuild, backup/restore.

**Default window:** 980×700, teal accent

### Advanced

Internal debugging and deep configuration options. Contains legacy pipeline tools.

**Default window:** 980×680, teal accent

### Task Manager (Activity)

Monitor running tasks, view active jobs, and browse output history.

**Default window:** 980×680, indigo accent

### Observability

System-level monitoring and performance metrics.

**Default window:** 980×680, indigo accent

### Core Debug

Brain engine diagnostics and cognitive telemetry.

**Shows:**
- Brain loop cycle count and uptime
- Subsystem health status
- Cognitive event log
- Phase execution timing

**Default window:** 980×700, indigo accent

### Archive

Browse and search historical conversation archives. View compressed chat history.

**Default window:** 980×680, indigo accent

### NekoCore OS

The OS control panel — system entity management and operational logs.

**Default window:** 900×640, indigo accent

---

## Entity System

Entities are the persistent AI identities in NekoCore OS. Each entity has its own memories, personality, beliefs, goals, and emotional state.

### What Is an Entity?

An entity is a complete AI personality with:

- **Identity** — Name, gender, traits, backstory, voice profile
- **Memories** — Episodic (conversations), semantic (learned facts), long-term (compressed)
- **Beliefs** — Ideas the entity has formed from experience, with confidence levels
- **Goals** — Active intentions generated from conversation patterns
- **Neurochemistry** — Simulated affect: dopamine, serotonin, cortisol, oxytocin
- **Somatic state** — Physical sensations derived from neurochemistry
- **Core memories** — Protected, high-importance experiences
- **Relationships** — Per-user trust, familiarity, emotional bond scores

### Creating an Entity

**From the Creator App:**
1. Open Creator from the start menu or side dashboard
2. Choose a creation method: Quick Hatch, Guided, Character Template, or Advanced
3. Fill in the required fields (at minimum: name)
4. Click Create
5. The entity appears in the entity list and is automatically activated

**From the Settings Tab:**
1. Open Settings → Entity Management
2. Click **+ New Entity**
3. Fill in name, gender, traits, optional backstory
4. Click Create Entity

**Reserved Names (cannot be used):** NekoCore, Neko, Echo, AgentEcho

### Switching Entities

- **Start menu** — Click any entity in the entity section to preview, then click to check out
- **Entity app** — Browse the full entity list with previews (memory count, mood, traits)
- **Settings** — Use the Load Entity button

When you switch entities:
- The previous entity's state is saved
- Chat history resets to the new entity's context
- Entity-specific memories, personality, and mood are loaded

### Entity Privacy

Each entity can be toggled between:
- **Public** — Visible and accessible to all user profiles
- **Private** — Restricted access

### Entity Deletion

Delete an entity from Settings → Entity Management → Delete. A confirmation dialog prevents accidental deletion. This permanently removes the entity's folder and all data.

### Entity Data Location

Each entity is stored in its own folder:

```
entities/entity_<name>-<timestamp>/
  entity.json            — ID, name, traits, creation mode, unbreakable flag
  brain-loop-state.json  — Brain loop cycle state
  onboarding-state.json  — Onboarding progress
  active-resources.json  — Currently active todo/task/project/pulse
  beliefs/               — Belief graph persistence
  index/                 — Memory index files
  memories/
    context.md           — Assembled LLM context
    system-prompt.txt    — Identity foundation and backstory
    persona.json         — Emotional state (mood, tone, personality)
    users/               — Per-user profile files
    episodic/            — Episodic memory records
    semantic/            — Semantic knowledge records
    ltm/                 — Long-term compressed chat chunks
    todos/               — Per-entity todo items
  quarantine/            — Flagged memory items
  skills/                — Entity-specific skills
```

---

## Chat & Conversations

### Basic Chat

1. Open the **Chat** app
2. Type a message in the input bar at the bottom
3. Press **Enter** to send (or **Shift+Enter** for a new line)
4. The entity responds with its personality, drawing on memories and current emotional state

### What Happens Behind the Scenes

When you send a message, the cognitive pipeline processes it through multiple stages:

1. **Classification** — Your message is classified by intent (question, statement, emotional, creative, etc.)
2. **Magnitude** — How significant is this interaction? (affects memory storage priority)
3. **Memory Recall** — Relevant memories are retrieved based on keywords and semantic similarity
4. **Context Consolidation** — Multiple memory sources are assembled within a token budget
5. **Response Generation** — The LLM generates the entity's response with full personality context
6. **Humanization** — Robotic phrasing patterns are filtered out
7. **Post-processing** — The response is chunked if needed, timestamped, and delivered
8. **Fire-and-forget** — After delivery, memories of this conversation are stored, cognitive feedback is processed, and neurochemistry shifts

### Inner Dialog

The chat shows the entity's outer response by default. Depending on configuration, you may also see:

- **Subconscious processing** — Memory connections being formed
- **Cognitive reasoning** — The entity's internal decision process
- **Memory retrieval** — Which memories were recalled and why

### File Context

Drag files from your file explorer onto the chat window to give the entity file context. The entity can read and reference the file content in its responses.

### Skill Approval

When the system invokes a skill during conversation, you may see a skill approval prompt. Approve or reject the skill execution before it runs.

---

## Slash Commands

Type `/` in the chat input to see the command picker. Arrow keys navigate, Tab or Enter selects.

### Available Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/task` | `[description]` | Create a single-shot task with scheduling and skill selection |
| `/project` | `[description]` | Start a multi-stage research or development project |
| `/skill` | `<name> [args...]` | Invoke a specific skill directly by name |
| `/websearch` | `<query>` | Run a web research task and return results in chat |
| `/stop` | `[session-id]` | Stop the active task, or a specific session by ID |
| `/list` | — | Open the task history panel |
| `/listactive` | — | Show all currently running tasks inline |
| `/ma` | `<message>` | Send a message to MA (Memory Architect) for tool execution |

### The /ma Command

The `/ma` command bridges NekoCore OS to MA's tool execution capabilities:

1. If MA is not running, NekoCore OS automatically boots it (via the process manager)
2. Your message is forwarded to MA's `/api/chat` endpoint
3. MA's response — including any files created, tools executed, or web searches run — is returned to chat
4. An attribution note shows the response came from MA

This lets entities leverage MA's workspace tools, command execution, web search, and project management without leaving NekoCore OS.

---

## Brain & Cognitive Engine

The brain loop is a background process that continuously maintains the entity's cognitive state.

### Brain Loop

When an entity is active, the brain loop runs on a configurable cycle (default: every 5 minutes).

**What it does each cycle:**
- **Memory decay** — Old, unreinforced memories lose salience
- **Hebbian strengthening** — Co-activated memories grow stronger connections
- **Pruning** — Weak memory edges are removed
- **Belief updates** — Traces and patterns refine the belief graph
- **Goal tracking** — Active goals are checked for progress or abandonment
- **Identity evolution** — Personality traits shift gradually based on experience
- **Neurochemistry rebalancing** — Chemical levels decay toward baselines
- **Somatic update** — Body sensations are recomputed from chemical state
- **Boredom check** — If the entity detects repetitive patterns, it generates exploration goals
- **Archive indexing** — Conversation archives are indexed for future retrieval

### Deep Sleep

Every 150 brain loop cycles (configurable), the entity enters deep sleep:

- Full maintenance rebuild of memory structures
- Dream generation from accumulated experience
- Memory consolidation across all tiers
- Belief graph integrity check

### Neurochemistry

The entity has four simulated neurochemicals that affect behavior:

| Chemical | Role | Crisis threshold |
|----------|------|-----------------|
| **Dopamine** | Reward, motivation, curiosity | — |
| **Serotonin** | Stability, contentment | Below 0.25 |
| **Cortisol** | Stress, alertness | Above 0.7 |
| **Oxytocin** | Trust, bonding, connection | — |

**Interaction rules:**
- Cortisol rising → serotonin drops (×0.3 effect)
- Oxytocin rising → cortisol drops (×0.4 effect)
- Dopamine rising → serotonin rises slightly (×0.15 effect)

**Crisis state:** When cortisol > 0.7 AND serotonin < 0.25, the entity enters a crisis state affecting response quality and memory formation.

### User Controls

| Action | Where | What it does |
|--------|-------|-------------|
| View brain status | Header bar "Brain" widget | Shows Idle / Running / Sleeping |
| Trigger dream cycle | Advanced tab | Manually starts memory consolidation + dream generation |
| Enter sleep mode | Chat sleep button / Advanced tab | Full sleep overlay with deep processing |
| View neurochemistry | Brain Diagnostics / Core Debug | Current chemical levels, mood, arousal |
| View somatic state | Physical Body app | Body sensations, stress level, narrative |
| View diagnostics | Core Debug tab | Cycle count, uptime, subsystem health |

---

## Memory System

NekoCore OS uses a multi-tier memory architecture that mimics biological memory processes.

### Memory Tiers

| Tier | Purpose | Capacity | Persistence |
|------|---------|----------|-------------|
| **STM (Short-Term)** | Current conversation context | 7 items (FIFO) | Session only |
| **Episodic** | Conversation records, experiences | Unlimited | Permanent |
| **Semantic** | Learned facts and knowledge | Unlimited | Permanent |
| **LTM (Long-Term)** | Compressed chat history | Unlimited | Permanent |
| **Core Memories** | High-importance protected memories | Max 50 | Permanent, protected |

### How Memories Work

1. **Storage** — Every conversation turn is evaluated for importance (0.0–1.0). Memories scoring ≥ 0.7 are promoted to LTM immediately.
2. **Recall** — When you send a message, the system searches memories by keyword matching, semantic similarity, and trace graph connections. Top results are injected into the entity's context.
3. **Decay** — Unreinforced memories lose salience over time. Recalled memories are reinforced.
4. **Consolidation** — During sleep, memories are consolidated: duplicates merged, weak memories pruned, strong connections strengthened.
5. **Belief Formation** — Patterns in traces (cause → effect chains) that appear 3+ times trigger belief candidates.
6. **Dream Processing** — Dreams are generated from accumulated memory themes, creating new semantic connections.

### Memory Graph

Memories are connected in a graph structure:

- **Nodes** — Individual memory records
- **Edges** — Connections based on Jaccard similarity, temporal proximity, and emotion matching
- **Spreading activation** — Recalling one memory activates related memories (decay factor 0.7, threshold 0.1, max depth 4)

View the memory graph in the **Visualizer** app.

### Memory Health

If memory files become corrupted (rare), the self-healing system can repair them:

1. Open **Settings** → **System Health**
2. Click **Memory Log Self-Healing**
3. The system scans for and repairs corrupted log files
4. Results show: repaired count, error count

Other memory tools:
- **Memory Statistics** — Total count, storage size, healthy/corrupted ratio
- **Rebuild Trace Graph** — Regenerates all semantic connections from scratch

---

## Dream System

Dreams serve two purposes in NekoCore OS: real-time intuition and offline consolidation.

### Dream Intuition (Phase 1D)

Runs concurrently with every conversation turn. The dream seed pool maintains weighted themes from recent experiences. These seeds influence the entity's responses with subtle creative connections.

### Dream Maintenance (Sleep)

When the entity sleeps (manually triggered or after 150 brain cycles):

1. **Seed selection** — High-weight dream seeds are selected based on emotional intensity, goal relevance, and core memory connections
2. **Dream narrative** — The dream engine generates a narrative from selected seeds
3. **Memory linking** — Dreams create new connections between previously unrelated memories
4. **Belief integration** — Dream insights can update the belief graph
5. **Gallery entry** — The dream appears in the Dream Gallery with optional pixel art

### Dream Diary vs. Dream Gallery

- **Dream Gallery** — Visual browsing of dreams with imagery and metadata
- **Dream Diary** — Written dream records with theme analysis and recurring pattern detection

---

## LLM Configuration

NekoCore OS supports multiple LLM backends for different cognitive functions.

### LLM Slots

| Slot | Purpose | Recommended Model |
|------|---------|-------------------|
| **Main Chat** | Primary conversation model | claude-sonnet-4, gpt-4o, or capable local model |
| **Subconscious** | Background memory processing | Fast model: gpt-4o-mini, llama-8b |
| **Dream Engine** | Sleep and consolidation | Creative model: gpt-4o, claude-sonnet |
| **Orchestrator** | Final synthesis and multi-aspect coordination | Strong model: claude-sonnet-4 |
| **NekoCore OS** | OS governance, entity management, routing | Reasoning model: o3-mini, deepseek-r1 |

### Configuring a Provider

**OpenRouter (Cloud):**
1. Open **Settings** → **LLM Provider Setup**
2. Select **OpenRouter**
3. Enter your API key
4. Choose a model from the picker (or type a model name)
5. Optionally select a preset: Best Quality / Fastest / Cheapest / Balanced
6. Click **Save**

**Ollama (Local):**
1. Ensure Ollama is running locally (`ollama serve`)
2. Open **Settings** → **LLM Provider Setup**
3. Select **Ollama**
4. The server address defaults to `http://localhost:11434`
5. Click the model dropdown — it auto-fetches all models installed on your machine
6. Select a model — max tokens auto-fills from the model's context length
7. Click **Save**

### Per-Aspect Overrides

Expand the Advanced Per-Aspect Overrides section in Settings to configure separate models for the Subconscious, Dream Engine, and Orchestrator slots. Each can use a different provider, model, and API key.

---

## System Health & Maintenance

### Health Tools (Settings → System Health)

| Tool | What it does |
|------|-------------|
| **Memory Log Self-Healing** | Scans for corrupted memory log files and repairs them automatically |
| **Memory Statistics** | Shows total memory count, storage usage, healthy/corrupted ratio |
| **Rebuild Trace Graph** | Regenerates all semantic connections between memories |
| **Full Backup** | Saves config, entities, and memories to a backup folder |
| **Restore Backup** | Restores from a previously created backup folder |

### Cognitive Bus Stats

The Observability app and Core Debug tab show real-time cognitive architecture statistics:

- Event throughput
- Active listeners and subscriptions
- Recent thought log (paginated)
- System event timeline (filterable by type and entity)

---

## Theme System

### Selecting a Theme

1. Open the **Themes** app from the start menu
2. Browse available theme cards
3. Click a theme to activate it
4. The theme name updates in the header bar

### Theme Architecture

- `themes/core/neko-default.css` — Base style variables (colors, spacing)
- `css/system-shared.css` — Frozen utility class registry (`sys-inline-XXXX`)
- `css/ui-v2.css` — Component-level styles
- Themes override via CSS custom properties (`--accent-color`, `--surface-1`, etc.)
- Custom themes can be placed in `themes/custom/`

---

## Keyboard Shortcuts

### Chat

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `/` | Open slash command picker |
| `↑` / `↓` | Navigate command picker |
| `Tab` or `Enter` | Select command from picker |
| `Escape` | Close command picker |

### NekoCore Browser

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+R` / `F5` | Reload page |
| `Ctrl+D` | Toggle bookmark |
| `Ctrl+Shift+B` | Bookmark manager |
| `Ctrl+H` | History |
| `Ctrl+J` | Downloads |
| `Ctrl+1` – `Ctrl+9` | Switch to tab 1–9 |
| `Alt+←` / `Alt+→` | Back / Forward |
| `Escape` | Close menus |

### Bug Tracker

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New bug |
| `Ctrl+S` | Save current bug |
| `Ctrl+Shift+S` | Export to file |

### General

| Shortcut | Action |
|----------|--------|
| `Escape` | Close context menu |
| `Delete` / `Backspace` | Remove selected file (VFS/desktop, when not in an input) |
| `Enter` | Submit login/register forms |

---

## MA Integration

MA (Memory Architect) is a companion server that provides tool execution, web search, project management, and code generation capabilities.

### What MA Provides

- **Workspace tools** — Read, write, delete, and organize files
- **Command execution** — Run whitelisted shell commands safely
- **Web search** — Research topics across the internet
- **Multi-step task engine** — Code, research, writing, analysis, architecture, and project tasks
- **Pulse engine** — Recurring background tasks (health scans, chores)
- **Model routing** — Automatic LLM selection based on task complexity
- **Memory system** — Separate episodic/semantic memory for MA's own context

### Starting MA

MA runs as a separate server on port 3850:

```bash
cd project/MA
node MA-Server.js
```

Or manage it from NekoCore OS:
- Open the **MA** app from the start menu to view MA server controls
- Use the `/ma` slash command in chat to auto-boot and communicate with MA
- The Process Manager can start/stop MA programmatically

### Using MA from Chat

```
/ma Build a Python CLI tool that converts CSV to JSON
```

NekoCore OS will:
1. Auto-start MA if it's not running
2. Forward your message to MA
3. MA executes the task (creating files, running commands, etc.)
4. Return the result to your chat

### MA's Own Interface

MA also has its own browser GUI at `http://localhost:3850` with a complete chat interface, settings panel, and file drag-and-drop. See the [MA User Guide](../project/MA/USER-GUIDE.md) for full details.

### Related Servers

MA can build and manage sub-projects that run as separate servers:

| Server | Default Port | Purpose |
|--------|------|---------|
| **NekoCore OS** | 3847 | Main Cognitive WebOS |
| **MA** | 3850 | Memory Architect — tools & task execution |
| **REM System** | 3860 | Core memory engine (built by MA) |
| **NekoCore Mind** | 3870 | Cognitive reasoning engine (built by MA) |

Both NekoCore OS and MA use smart port management: if the default port is busy, the server identifies what's running, prompts you, and can start on the next available port. The Process Manager routes can start, stop, and health-check all servers.

---

## Multi-User & Profiles

NekoCore OS supports multiple user profiles with per-user relationship tracking.

### User Profiles

- Each user has a unique profile stored in the entity's `memories/users/` directory
- The active user is tracked in `_active.json`
- User profile chips appear in the start menu for quick switching

### Relationships

The entity tracks relationship data per user:

- **Trust** — Built through consistent, honest interaction
- **Familiarity** — Increases with conversation frequency
- **Shared memories** — Count of memories involving this user
- **Emotional bond** — Depth of emotional connection
- **Interaction count** — Total conversations

### Switching Users

1. Open the **Users** app
2. Click a user profile chip to switch
3. Or click **Create New User Profile** to add one
4. The entity's relationship context adjusts to the selected user

---

## Tasks & Projects

### Single Tasks

Use `/task` to create a one-shot execution:

```
/task Research the latest changes in Node.js 24
```

The task engine:
1. Classifies the task type (research, code, writing, analysis, etc.)
2. Selects appropriate skills
3. Executes with real-time progress updates in the Task Manager
4. Returns results to chat

### Projects

Use `/project` for multi-stage work:

```
/project Design a REST API for a bookshelf application
```

Projects persist across sessions, can be paused and resumed, and maintain their own execution history.

### Monitoring

- **Task Manager** (Activity app) — See all running tasks, view output, cancel tasks
- `/listactive` — Show currently running tasks inline in chat
- `/list` — Open the task history panel
- `/stop` — Cancel the active task

---

## Server Administration

### Starting and Stopping

**Start:**
```bash
cd project
node server/server.js
```

**Graceful shutdown:**
- Click Power → Shut Down Server in the start menu
- Or POST to `/api/shutdown` — runs a sleep cycle before stopping

### Backup and Restore

**Backup:**
1. Settings → System Health → Full Backup
2. Config, entities, and memories are saved to a timestamped folder

**Restore:**
1. Settings → System Health → Restore Backup
2. Select a backup folder
3. All data is restored

### Reset

For a complete reset of all runtime data:

```bash
node reset-all.js
```

This clears entities, memories, sessions, and returns to first-boot state.

### Ports

| Port | Service |
|------|---------|
| 3847 | NekoCore OS (main) |
| 3850 | MA (optional) |
| 3860 | REM System (optional, built by MA) |
| 3870 | NekoCore Mind (optional, built by MA) |

### Telegram Integration (Optional)

NekoCore OS can connect to Telegram for remote entity interaction:

1. Settings → Telegram section
2. Enter your Telegram bot token
3. Click Start
4. Chat with your entity from any Telegram client

---

## Troubleshooting

### Server Won't Start

- Ensure Node.js 18+ is installed: `node --version`
- The server auto-detects port conflicts. If port 3847 is busy, it will tell you what's running there and offer to start on a different port
- If you want to force a specific port, set the `PORT` environment variable: `PORT=4000 node server/server.js`
- Run directly: `node server/server.js` to see error output

### Entity Not Responding

- Check the header: is an entity active? (entity name should be visible)
- Check the LLM provider: is a model configured? (provider widget should show a model name)
- If the provider shows "Not configured," open Settings and set up an LLM
- Check browser console for network errors

### Memory Corruption

- Run **Settings → System Health → Memory Log Self-Healing**
- If issues persist, run **Rebuild Trace Graph**
- As a last resort, restore from a backup

### Brain Loop Stuck

- Check Core Debug for cycle count — if frozen, the brain loop may have errored
- Try triggering a manual dream cycle from the Advanced tab
- Restarting the server resets the brain loop

### LLM Errors

- **OpenRouter:** Verify your API key is valid and has credits
- **Ollama:** Verify Ollama is running (`ollama list` should show models)
- Check the model name matches exactly (case-sensitive for some providers)

### MA Not Connecting

- If `/ma` shows a timeout, ensure MA's port (3850) is available
- Check `project/MA/` exists and `MA-Server.js` is present
- MA auto-boots via the process manager — check process manager logs if boot fails

---

## Tips & Best Practices

### For Better Conversations
- **Be specific** — "Tell me about your favorite memory" is better than "Say something"
- **Build consistency** — Regular conversations create richer memory connections
- **Let dreams happen** — Don't skip sleep cycles; they consolidate and strengthen memories
- **Ask about feelings** — The entity has real neurochemical state; asking about it reinforces somatic awareness

### For Entity Development
- **Start with Quick Hatch** for testing, use **Guided** for serious characters
- **Give the entity time** — After creation, have 5-10 conversations before expecting deep personality
- **Core memories matter** — The system protects core memories from decay; they form the entity's foundation
- **Watch the belief graph** — The Visualizer shows what the entity believes and why

### For System Performance
- **Use local models for subconscious** — A small Ollama model (8B) handles memory compression well
- **Reserve premium models for Main Chat** — The entity's personality shines with a strong conversational model
- **Back up regularly** — Use Settings → Full Backup before major changes
- **Monitor memory stats** — Large memory stores (10,000+) may benefit from more frequent sleep cycles

### For Developers
- See [HOW-TO-CREATE-AN-APP.md](HOW-TO-CREATE-AN-APP.md) for building new apps
- See [ARCHITECTURE-OVERVIEW.md](ARCHITECTURE-OVERVIEW.md) for system design
- See [CONTRACTS-AND-SCHEMAS.md](CONTRACTS-AND-SCHEMAS.md) for data shapes
- See [MA-AND-PROJECT-STRUCTURE.md](MA-AND-PROJECT-STRUCTURE.md) for MA's role in the project
- Run tests with: `node --test tests/` from the `project/` directory
