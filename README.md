<p align="center">
  <img src="project/assets/neko-cat.svg" width="180" alt="NekoCore mascot"/>
</p>

<h1 align="center">NekoCore OS</h1>

<p align="center">
  <samp>A COGNITIVE OPERATING SYSTEM</samp>
</p>

<p align="center">
  A cognitive WebOS for <strong>persistent AI identity</strong> — episodic memory, belief formation,<br>
  dream processing, and layered reasoning, built on the <strong>R.E.M. System</strong>.
</p>

<p align="center">
  <a href="https://github.com/voardwalker-code/NekoCore-OS/actions/workflows/ci.yml"><img src="https://github.com/voardwalker-code/NekoCore-OS/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
  &nbsp;
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js" alt="Node 18+"/>
  &nbsp;
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT"/>
  &nbsp;
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square" alt="zero deps"/>
  &nbsp;
  <img src="https://img.shields.io/badge/tests-2%2C248%20passing-brightgreen?style=flat-square" alt="2,248 tests passing"/>
</p>

<p align="center">
  <a href="https://neko-core.com"><strong>neko-core.com</strong></a>
  &nbsp;·&nbsp;
  <a href="project/Neko-Core.html">Architecture Deck</a>
  &nbsp;·&nbsp;
  <a href="docs/USER-GUIDE.md">User Guide</a>
  &nbsp;·&nbsp;
  <strong>v0.9.0-alpha.4.24</strong>
</p>

<br>

<div align="center">

| 2,248 | 0 | 5 | 20+ |
|:-----:|:-:|:-:|:----:|
| **Tests Passing** | **Runtime Dependencies** | **Pipeline Phases** | **Desktop Apps** |

</div>

<br>

> [!CAUTION]
> **PRE-ALPHA SOFTWARE — USE AT YOUR OWN RISK**
>
> NekoCore OS is in **pre-alpha**. All subsystems — including entity orchestration, blueprint-driven
> project execution, sandboxed code execution, the Memory Architect (MA) AI coding assistant,
> self-repair/diagnostics, the failsafe console, resource manager, bug tracker, smart port management,
> and server-to-server MA integration — are **functional but not yet battle-tested**.
>
> There are **2,248 passing unit tests** covering these features, but they have **not been
> stress-tested in production environments**. APIs, data formats, and behaviour may change
> without notice between releases.
>
> **Before experimenting:** back up your `entities/` and `memories/` folders.
> Report issues via GitHub Issues — contributions and feedback are welcome.
>
> **Python is NOT required to run NekoCore.** The only runtime dependency is Node.js 18+.
> Python 3 is used *only* by the optional self-repair fixer script (`neko_fixer.py`) — a standalone
> emergency rebuild tool generated on demand. It uses only the Python 3 standard library.

<br>

> **Core conviction:** an entity should be shaped by what it has experienced, not only by what it was told on day one.

---

## ✦ Core Capabilities

<table>
<tr>
<td width="33%" valign="top">
<strong>🧠 Episodic Memory</strong><br><br>
<em>Echoes</em> — structured memory fragments across three tiers (episodic, semantic, long-term) with salience decay curves, reinforcement on recall, and automatic divergence repair between index and disk.
</td>
<td width="33%" valign="top">
<strong>🌙 Dream Processing</strong><br><br>
Phase 1D dream-intuition runs concurrently with every conversation turn. Offline REM sleep consolidates memory, updates beliefs, and generates dream narratives — all viewable in the Dream Gallery.
</td>
<td width="33%" valign="top">
<strong>🔮 Belief Graph</strong><br><br>
Beliefs emerge from memory cross-reference — not hand-authored. Each belief carries a confidence weight and source echoes. New evidence shifts belief strength dynamically across the entity's lifetime.
</td>
</tr>
<tr>
<td width="33%" valign="top">
<strong>⚗️ Neurochemistry</strong><br><br>
Dopamine, cortisol, serotonin, and oxytocin simulate in real time and modulate every response. Graduated mood shift means conversations influence chemistry proportionally to interaction magnitude.
</td>
<td width="33%" valign="top">
<strong>🪪 Entity Hatching</strong><br><br>
Structured multi-phase birth — name → traits → life history → core memories → goals. <em>Unbreakable Mode</em> locks the origin post-hatch for NPCs and fixed characters that must never drift.
</td>
<td width="33%" valign="top">
<strong>🔌 Skills & Routing</strong><br><br>
Drop-in function-call plugins with per-phase model routing. Assign different LLMs to 1A, 1D, 1C, and Final. Ollama (local) and OpenRouter (cloud) supported out of the box.
</td>
</tr>
<tr>
<td width="33%" valign="top">
<strong>⚡ Token Optimization</strong><br><br>
Hybrid router classifies simple turns and serves template responses without touching the LLM pipeline. NLP memory encoding, prompt compression, and semantic caching cut ~68% of per-turn token usage.
</td>
<td width="33%" valign="top">
<strong>🧬 Cognitive State</strong><br><br>
Pre-turn snapshot assembles beliefs, goals, mood, diary, and curiosity into the Subconscious prompt. Post-turn feedback reinforces beliefs, tracks goals, resolves curiosity, and nudges neurochemistry.
</td>
<td width="33%" valign="top">
<strong>📋 Task Orchestration</strong><br><br>
Slash commands (<code>/task</code>, <code>/skill</code>, <code>/project</code>, <code>/websearch</code>, <code>/ma</code>) dispatch structured work. The Frontman bridge translates worker progress into entity-voice milestone messages.
</td>
</tr>
<tr>
<td width="33%" valign="top">
<strong>🏗️ Memory Architect (MA)</strong><br><br>
Built-in AI coding assistant with blueprint-driven project execution, agent delegation, deep research, and workspace management. Ships with full blueprints for two companion projects: REM System Core and NekoCore Cognitive Mind.
</td>
<td width="33%" valign="top">
<strong>🐛 Developer Tools</strong><br><br>
Bug Tracker with screenshot capture, severity tracking, and Markdown report export. Resource Manager for entity active resource and task/project tracking. Both ship as desktop apps inside the OS.
</td>
<td width="33%" valign="top">
<strong>🔌 Smart Port Management</strong><br><br>
Auto-detects port conflicts, identifies running instances (NekoCore OS vs MA), and prompts before spawning duplicates. Power users can run multiple servers simultaneously on fallback ports.
</td>
</tr>
</table>

---

## ⟁ Cognitive Architecture

```
┌──────┬──────────────────────┬─────────────────────────────────────┐
│  L5  │  Final Orchestrator  │  personality · neurochemistry        │
│  L4  │  Conscious  (1C)     │  reasoning with full memory context  │
│  L3  │  Dream-Intuition(1D) │  abstract associations (parallel)    │
│  L2  │  Subconscious  (1A)  │  memory retrieval, context assembly  │
│  L1  │  Brain Loop          │  decay · goals · REM trigger         │
└──────┴──────────────────────┴─────────────────────────────────────┘
```

| Layer | Component | Role |
|-------|-----------|------|
| L5 | Final Orchestrator | Personality, neurochemistry, response refinement |
| L4 | Conscious (1C) | Reasoning with full memory + dream context |
| L3 | Dream-Intuition (1D) | Abstract associations, runs in parallel with 1A |
| L2 | Subconscious (1A) | Memory retrieval, context block assembly |
| L1 | Brain Loop | Background ticker — decay, consolidation, REM trigger |

See [docs/NEKOCORE-OS-WHITE-PAPER-v2.md](docs/NEKOCORE-OS-WHITE-PAPER-v2.md) for the full identity model and cognitive pipeline deep-dive, or [docs/NEKOCORE-OS-ARCHITECTURE-v1.md](docs/NEKOCORE-OS-ARCHITECTURE-v1.md) for subsystem contracts and file map.

---

## ⟶ Cognitive Pipeline

```
                    User Input
                        │
                   Turn Classifier
                   (hybrid router)
                        │
              ┌─────────┴─────────┐
              │                   │
         simple turn         complex turn
              │                   │
      template response    ┌──────┴──────┐
              │            ▼             ▼
              │    Phase 1A        Phase 1D
              │    (Subconscious)  (Dream-Intuition)
              │    memory retrieval   abstract associations
              │            │             │
              │            └──────┬──────┘
              │                   │  Promise.all()
              │                   ▼
              │         Phase 1C (Conscious)
              │         reasoning · full context
              │                   │
              │                   ▼
              │        Final Orchestrator (voicing)
              │        personality · neurochemistry
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
                 Response → User
                        │
                        ▼  async, non-blocking
             NLP Memory Encoding
             Cognitive Feedback Loop
             Relationship Update
```

### Brain Loop

The brain loop ticks independently of conversation:

- **Memory consolidation** — decay tick, LTM compression, index sync
- **Belief formation** — scan recent echoes for cross-referencing patterns
- **Goal review** — assess progress against exploration goals
- **Curiosity engine** — track open questions, mark resolved when addressed
- **REM sleep trigger** — schedules sleep cycles when the entity is idle
- **Neurochemistry drift** — baseline levels drift back toward resting state
- **Somatic awareness** — energy, discomfort, arousal, valence state updates

---

## ◈ Built On Convictions

> **Experience over instruction** — memory shaped by what is lived, not scripted on day one.

> **Layered cognition** — subconscious, dream-intuition, and conscious phases run in formation; parallel where it counts, sequential where it must.

> **Zero dependencies** — the entire runtime is pure Node.js (no Express, no frameworks). No vector database. No external SDKs. File-system JSON persistence.

> **Open architecture** — every subsystem is observable via the SSE cognitive bus. Nothing the entity thinks is hidden from the developer.

---

## ◫ Technical Specification

| Capability | Detail |
|---|---|
| **Runtime** | Pure Node.js 18+ — zero external runtime dependencies (no Express) |
| **Persistence** | File-system JSON — no database required |
| **Memory types** | Episodic · Semantic · Long-Term (compressed chatlog chunks) |
| **Pipeline phases** | 1A (subconscious) · 1D (dream) · 1C (conscious) · Final · Brain Loop |
| **LLM support** | Ollama (local) · OpenRouter · Any OpenAI-compatible endpoint |
| **Auth** | Account system with session token management |
| **Realtime** | SSE cognitive bus — all pipeline events streamed to the browser |
| **Visualizer** | Three.js WebGL 3D neural node graph — live cognitive bus events |
| **Skills** | Drop-in function-call plugins: web search, memory tools, workspace ops |
| **Test suite** | 2,247 passing — unit + integration (Node built-in `--test` runner) |
| **Installer** | Contract-driven app install/uninstall with rollback and file lifecycle |

### Memory System

| Layer | Type | Decay | Contents |
|-------|------|-------|----------|
| Episodic | JSON echo files | Yes (salience curve) | Specific events and interactions |
| Semantic | JSON echo files | Slower | Concepts, facts, generalizations |
| Long-Term | Compressed chatlog chunks | No | Full conversation history (chunked) |
| Context | Assembled `.md` file | Rebuilt each turn | Ranked retrieval block sent to LLM |

### Neurochemistry

| Chemical | High State | Low State | Influence |
|----------|-----------|-----------|-----------|
| Dopamine | Energetic, curious | Flat, disengaged | Drive, curiosity tone |
| Cortisol | Guarded, stressed | Relaxed, open | Caution, defensive phrasing |
| Serotonin | Stable, warm | Unstable, irritable | Emotional baseline |
| Oxytocin | Warm, connected | Detached | Social tone, relational warmth |

### Somatic State

| Signal | Effect |
|--------|--------|
| Energy level | Affects verbosity and enthusiasm |
| Discomfort | Increases cortisol, triggers hedging |
| Arousal | Heightens focus and response detail |
| Valence | Overall positive/negative emotional tone |

### Cognitive Bus (SSE)

| Event | Description |
|-------|-------------|
| `1a_start` / `1a_done` | Subconscious phase markers |
| `1d_start` / `1d_done` | Dream-intuition phase markers |
| `1c_start` / `1c_done` | Conscious phase markers |
| `final_start` / `final_done` | Final orchestrator pass markers |
| `orchestration_complete` | Full pipeline finished — includes token counts |
| `turn_classified` | Hybrid router classification result |
| `cache_hit` | Semantic cache hit — cached response reused |
| `cognitive_snapshot_assembled` | Pre-turn cognitive state snapshot built |
| `belief_feedback_applied` | Belief reinforced or contradicted post-turn |
| `goal_status_changed` | Goal progress detected post-turn |
| `curiosity_resolved` | Curiosity question addressed post-turn |
| `mood_nudge_applied` | Neurochemistry nudged by interaction magnitude |
| `memory_write` | Echo newly encoded |
| `belief_update` | Belief created or reinforced |
| `chemistry_update` | Neurochemical state delta |
| `relationship_update` | User relationship record updated |
| `sleep_start` / `sleep_done` | REM cycle boundaries |
| `dream_fragment` | Dream narrative fragment emitted |
| `task_milestone` | Task orchestration step completed |
| `task_complete` / `task_error` | Task lifecycle events |

---

## ◉ Roadmap

```
✔  Phase 1     Bug Fixes                       Complete
✔  Phase 2     Refactor / Cleanup              Complete
✔  Phase 3     Full App Modularization         Complete  (866 tests, 0 fail)
✔  Phase 4     Feature Foundation              Complete
✔  Phase 4.5   Intelligent Memory Expansion    Complete
✔  Phase 4.6   Slash Command System            Complete  (A0–A2; A3/A4 future)
✔  Phase 4.7   HTML Shadow Cleanup             Complete  (guard-first refactor)
✔  Phase 4.8   Cognitive State Integration     Complete  (4 phases, 14 slices)
✔  Phase 4.8   Token Optimization              Complete  (Phases 1–4, ~68% reduction)
✔  Phase 4.9   Task Orchestration (MTOA)       Complete  (T-1 → T-7)
✔  Phase 4.10  Entity Orchestration            Complete  (E-0 → E-7)
✔  Phase 4.11  Blueprint System                Complete
✔  Phase 4.12  Coding Skill + Project Executor Complete
✔  Phase 4.13  Health Scanner + Fixer Generator Complete  (self-repair chain)
✔  Phase 4.14  Sandboxed Code Execution        Complete  (cmd_run tool)
✔  Phase 4.15  BIOS Completeness + Failsafe    Complete  (300 registry entries)
✔  Phase 4.16  Self-Repair Skill               Complete  (2,012 tests, 0 fail)
✔  Phase 4.17  OS Tool Upgrade                 Complete  (workspace-tools expansion)
✔  Phase 4.18  Entity Genesis Skill            Complete  (multi-round entity creation)
✔  Phase 4.19  MA Bridge                       Complete  (/ma slash command, auto-boot)
✔  Phase 4.20  Bug Tracker App                 Complete  (screenshots, severity, export)
✔  Phase 4.21  Resource Manager App            Complete  (task/project tracking)
✔  Phase 4.22  Smart Port Management           Complete  (port-guard for all servers)
✔  Phase 4.23  User Documentation              Complete  (24-section user guide)
✔  Phase 4.24  MA Public Release               Complete  (2,247 tests, factory reset)
○  Phase 5     Predictive Memory Topology      Next
```

**Token Optimization** eliminated ~68% of per-turn token usage across 4 phases:
- **Phase 1** — NLP memory encoding + reranker bypass (~2,700 tokens/turn saved)
- **Phase 2** — Hybrid router diverts simple turns away from the full pipeline (~15K tokens/turn for ~60% of casual turns)
- **Phase 3** — Prompt compression across all 4 pipeline nodes (~4,700–9,300 tokens/turn)
- **Phase 4** — Semantic cache for similar inputs (~16K tokens on cache hits)

**Cognitive State Integration** gives entities live inner life that evolves through conversation:
- Pre-turn cognitive snapshot (beliefs, goals, mood, diary, curiosity) injected into the Subconscious prompt
- Post-turn feedback loop (belief reinforcement, goal tracking, curiosity resolution, mood signals)
- Graduated mood shift — conversations nudge neurochemistry proportionally to interaction magnitude
- Full SSE observability for all cognitive state changes

---

## ⬡ Why NekoCore? Why Open Source?

> Right now, AI feels like the moment the wheel was invented. But instead of building cars, most people are still waiting for a bigger, better wheel. We have barely begun to explore what we can build with what already exists.
>
> NekoCore exists because I wanted to see what I could build with this new wheel. I open-sourced it because I want to see what you can do with more!

---

## ↓ Installation

### Prerequisites

- Node.js 18+ *(the only runtime requirement)*
- An LLM provider — [Ollama](https://ollama.ai) (local) or an [OpenRouter](https://openrouter.ai) API key
- Python 3 — **not required**. Only used by the optional `neko_fixer.py` self-repair script

### Clone & Start

```bash
git clone https://github.com/voardwalker-code/NekoCore-OS.git
cd NekoCore-OS/project
npm install
npm start
```

Open `http://localhost:3847` in your browser.

### Configure

```bash
cp Config/ma-config.example.json Config/ma-config.json
```

**Ollama (local):**

```json
{
  "provider": "ollama",
  "ollamaBaseUrl": "http://localhost:11434",
  "defaultModel": "mistral"
}
```

**OpenRouter (cloud):**

```json
{
  "provider": "openrouter",
  "openRouterApiKey": "sk-or-...",
  "defaultModel": "mistralai/mistral-7b-instruct"
}
```

The server port (default 3847) is not set in the config file — it uses `PORT` environment variable or the built-in default. If the port is busy, the server identifies what's running and offers to start on the next available port.

### Recommended Multi-Phase Setup

Route each pipeline phase to a specialized model for best results:

| Phase | Model | Why |
|-------|-------|-----|
| main / conscious (1C) | `inception/mercury-2` | Fast, strong reasoning |
| subconscious (1A) | `inception/mercury-2` | Context assembly, memory retrieval |
| dream (1D) | `google/gemini-2.5-flash` | Abstract association — cheap is fine |
| background | `google/gemini-2.5-flash` | Brain loop — high frequency |
| orchestrator (final) | `anthropic/claude-sonnet-4.6` | Final voicing — quality matters |

Any OpenAI-compatible model works. For fully local: set all phases to an Ollama model like `mistral` or `llama3`.

<details>
<summary>Full multi-phase profile JSON</summary>

```json
{
  "profiles": {
    "BEST": {
      "main":         { "type": "openrouter", "model": "inception/mercury-2" },
      "subconscious": { "type": "openrouter", "model": "inception/mercury-2" },
      "dream":        { "type": "openrouter", "model": "google/gemini-2.5-flash" },
      "background":   { "type": "openrouter", "model": "google/gemini-2.5-flash" },
      "orchestrator": { "type": "openrouter", "model": "anthropic/claude-sonnet-4.6" }
    }
  }
}
```

</details>

---

## ◌ Usage

### Browser UI

| Surface | Description |
|---------|-------------|
| `/` — Chat | Main entity chat interface |
| `/` — Memory tab | Browse episodic, semantic, and LTM echoes |
| `/` — Belief tab | Inspect emergent beliefs |
| `/` — Dream Gallery | View and replay recorded dreams |
| `/` — Diary | Entity self-reflection log |
| `/` — Sleep tab | Trigger REM cycle, view sleep history |
| `/` — Bug Tracker | Screenshot capture, severity tracking, report export |
| `/` — Resource Manager | Task/project tracking for active entities |
| `/` — MA Server | Memory Architect control panel |
| `/visualizer.html` | 3D WebGL neural cognitive state graph |

### Desktop Shell

1. Click the **Start** button for the categorized app launcher.
2. Pinned apps on the taskbar for one-click launch.
3. **Users** tab for account actions and logout.
4. Power control for Sleep, Restart UI, Sign out, or Shut Down Server.
5. In the Browser app: *Search Web* runs in-app search · *Search Home* returns to history · *Show Results* restores minimized results · *Show Page* focuses the current page.

### Creating an Entity

1. Open the browser UI.
2. Click **New Entity**.
3. Follow the hatching wizard: name → traits → life history → goals.
4. The entity is ready to chat once hatching completes.

### Skills

Skills live in `project/skills/<name>/`. The entity's LLM invokes them via function call syntax. Available by default:

- `web-search` — searches the web and summarizes results
- `memory-tools` — query, tag, or reinforce specific memories
- `search-archive` — search archived conversation history
- `ws_mkdir` / `ws_move` — workspace file operations
- `vscode` — VS Code workspace integration
- `coding` — write, run, test, and debug code projects
- `python` / `rust` — language-specific programming skills
- `entity-genesis` — guided multi-round entity creation wizard
- `self-repair` — diagnose and fix NekoCore's own system (health scanner, fixer generator, failsafe console)

### Self-Repair & Failsafe

NekoCore includes a full self-healing chain for disaster recovery:

| Tool | What it does | Requires |
|------|-------------|----------|
| **Health Scanner** (`node scripts/health-scan.js`) | Scans 300 core files for missing/corrupt entries | Node.js |
| **Fixer Generator** (`node scripts/generate-fixer.js`) | Produces `neko_fixer.py` — a standalone rebuild script | Node.js |
| **neko_fixer.py** | Restores missing/corrupt files from embedded DNA hashes | Python 3 (stdlib only) |
| **Failsafe Console** (`/failsafe.html`) | Zero-dependency emergency WebGUI — auth, LLM setup, chat | Browser |

> **Python is not required to run NekoCore.** The fixer script is an optional emergency tool generated on demand. It uses only the Python 3 standard library — no pip, no packages.

### Memory Architect (MA)

MA is a built-in AI coding assistant that lives at `project/MA/`. It can build entire Node.js projects from blueprints, delegate to specialized agents, run deep research, and manage a workspace of in-progress builds.

**Start MA from NekoCore OS:**
- Use the `/ma` slash command in any entity chat, or
- Launch the MA Server app from the Start menu

**Start MA standalone:**
```bash
cd project/MA
npm install
npm start
```

MA ships with blueprints for two companion projects:
- **REM System Core** — a 26-module memory/cognition server (port 3860)
- **NekoCore Cognitive Mind** — a 97-module cognitive engine (port 3870)

Both are starter scaffolds with `PROJECT-MANIFEST.json`, `BUILD-ORDER.md`, and `package.json`. MA builds the actual source code from the blueprints.

See [project/MA/README.md](project/MA/README.md) for the full MA guide.

### Telegram Integration

Set `telegramBotToken` and `telegramAllowedUsers` in `Config/ma-config.json`. The bot attaches to your configured entity automatically on server start.

---

## ◧ Project Structure

```
NekoCore-OS/
├── README.md                  # Visitor-first overview
├── WORKLOG.md                 # Active process and phase ledger
├── BUGS.md                    # Bug queue and status tracking
├── CHANGELOG.md               # Release notes
├── docs/                      # Public documentation
│   ├── USER-GUIDE.md                   # 24-section user guide
│   ├── MA-AND-PROJECT-STRUCTURE.md     # MA architecture and layout
│   ├── NEKOCORE-OS-WHITE-PAPER-v2.md   # Technical white paper
│   └── NEKOCORE-OS-ARCHITECTURE-v1.md  # Architecture reference
└── project/
    ├── client/                # Browser frontend (desktop shell + 20+ apps)
    ├── server/                # Backend server
    ├── browser-host/          # Browser host modules
    ├── skills/                # Pluggable skill plugins (11 skills)
    ├── scripts/               # Health scanner, fixer generator, safety scripts
    ├── tests/                 # Unit + integration tests (2,247 passing)
    ├── MA/                    # Memory Architect — AI coding assistant
    │   ├── MA-Server.js       #   MA HTTP server (port 3850)
    │   ├── MA-server/         #   Core modules (LLM, memory, tasks, agents)
    │   ├── MA-blueprints/     #   Build blueprints (NekoCore + REM System)
    │   ├── MA-knowledge/      #   Injected knowledge base
    │   ├── MA-skills/         #   MA skill plugins
    │   ├── MA-entity/         #   Agent profiles + MA entity definition
    │   └── MA-workspace/      #   Project scaffolds (build targets)
    ├── Config/                # Runtime config template/example
    ├── entities/              # Runtime entity data (gitignored)
    ├── memories/              # System memory (gitignored)
    ├── Neko-Core.html          # Interactive architecture deck
    └── package.json
```

---

## ◎ API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message, get a response |
| `GET` | `/api/entities` | List all entities |
| `POST` | `/api/entities` | Create a new entity |
| `GET` | `/api/entities/:id` | Get entity state |
| `POST` | `/api/entities/release` | Release the active entity (cleanup lifecycle) |
| `POST` | `/api/entities/:id/sleep` | Trigger REM sleep cycle |
| `GET` | `/api/entities/:id/memories` | List memories |
| `GET` | `/api/entities/:id/beliefs` | List beliefs |
| `GET` | `/api/entities/:id/dreams` | List dreams |
| `GET` | `/api/entities/:id/diary` | Entity self-reflection log |
| `GET` | `/api/entities/:id/relationships` | Per-user relationship records |
| `POST` | `/api/task/run` | Dispatch a task (research, skill, project) |
| `GET` | `/api/task/session/:id` | Get task session details |
| `POST` | `/api/task/cancel/:id` | Cancel an active task |
| `GET` | `/api/task/history/:entityId` | Task history for an entity |
| `POST` | `/api/entity/chat/create` | Create a multi-entity chat session |
| `POST` | `/api/entity/chat/message` | Send message to entity chat |
| `POST` | `/api/auth/login` | Authenticate |
| `POST` | `/api/auth/logout` | Invalidate session |
| `GET` | `/events` | SSE cognitive bus stream |

---

## ◍ Reset / Uninstall

**Reset all entity data** (keeps server code, wipes all entity memories and session state):

```bash
node reset-all.js
```

**Full uninstall:**

```bash
cd ..
rm -rf NekoCore-OS
```

---

## ⚖ Copyright and Community Safety

NekoCore is MIT licensed and intended for safe open-source collaboration.

1. Avoid features designed to bypass DRM, paywalls, CSP, frame restrictions, or other site security controls.
2. Keep AI content extraction user-directed and transparent.
3. Do not silently persist page content into long-term memory without explicit user intent.
4. Track third-party components and include required notices in distributions.
5. Browser-related commits should include `Signed-off-by` lines (DCO).

Browser note: the in-shell browser app uses an embedded page model — some sites block embedding by policy. Browser data and REM memory are separate by default; visiting a page does not automatically write to REM memory.

---

## ✦ License

MIT — see [LICENSE](LICENSE).

NekoCore is open source. Use it, fork it, extend it, build on it.


