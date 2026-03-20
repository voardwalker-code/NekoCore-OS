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
  <img src="https://img.shields.io/badge/tests-1369%20passing-brightgreen?style=flat-square" alt="1369 tests"/>
</p>

<p align="center">
  <a href="https://neko-core.com"><strong>neko-core.com</strong></a>
  &nbsp;·&nbsp;
  <a href="project/NekoCore.html">Architecture Deck</a>
  &nbsp;·&nbsp;
  <strong>v0.9.0</strong>
</p>

<br>

<div align="center">

| 1,369 | 0 | 5 |
|:-----:|:-:|:-:|
| **Tests Passing** | **Runtime Dependencies** | **Pipeline Phases** |

</div>

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
Dopamine, cortisol, serotonin, and oxytocin simulate in real time and modulate every response. Neurochemical state is fully observable via the SSE cognitive bus and the browser diagnostic panel.
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
          ┌─────────────┴─────────────┐
          ▼                           ▼
  Phase 1A (Subconscious)    Phase 1D (Dream-Intuition)
  memory retrieval           abstract associations
  context assembly           running in parallel
          │                           │
          └─────────────┬─────────────┘
                        │  Promise.all()
                        ▼
              Phase 1C (Conscious)
              reasoning · full context
                        │
                        ▼
           Final Orchestrator (voicing)
           personality · neurochemistry
                        │
                        ▼
                 Response → User
                        │
                        ▼  async, non-blocking
             Post-Response Memory Write
                 Relationship Update
```

### Brain Loop

The brain loop ticks independently of conversation:

- **Memory consolidation** — decay tick, LTM compression, index sync
- **Belief formation** — scan recent echoes for cross-referencing patterns
- **Goal review** — assess progress against exploration goals
- **REM sleep trigger** — schedules sleep cycles when the entity is idle
- **Neurochemistry drift** — baseline levels drift back toward resting state

---

## ◈ Built On Convictions

> **Experience over instruction** — memory shaped by what is lived, not scripted on day one.

> **Layered cognition** — subconscious, dream-intuition, and conscious phases run in formation; parallel where it counts, sequential where it must.

> **Zero dependencies** — the entire runtime is pure Node.js. No vector database. No external SDKs. File-system JSON persistence.

> **Open architecture** — every subsystem is observable via the SSE cognitive bus. Nothing the entity thinks is hidden from the developer.

---

## ◫ Technical Specification

| Capability | Detail |
|---|---|
| **Runtime** | Pure Node.js 18+ — zero external runtime dependencies |
| **Persistence** | File-system JSON — no database required |
| **Memory types** | Episodic · Semantic · Long-Term (compressed chatlog chunks) |
| **Pipeline phases** | 1A (subconscious) · 1D (dream) · 1C (conscious) · Final · Brain Loop |
| **LLM support** | Ollama (local) · OpenRouter · Any OpenAI-compatible endpoint |
| **Auth** | Account system with session token management |
| **Realtime** | SSE cognitive bus — all pipeline events streamed to the browser |
| **Visualizer** | Three.js WebGL 3D neural node graph — live cognitive bus events |
| **Skills** | Drop-in function-call plugins: web search, memory tools, workspace ops |
| **Test suite** | 1,369 passing — unit + integration (Node built-in `--test` runner) |
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
| `memory_write` | Echo newly encoded |
| `belief_update` | Belief created or reinforced |
| `chemistry_update` | Neurochemical state delta |
| `relationship_update` | User relationship record updated |
| `sleep_start` / `sleep_done` | REM cycle boundaries |
| `dream_fragment` | Dream narrative fragment emitted |

---

## ◉ Roadmap

```
✔  Phase 1    Bug Fixes                       Complete
✔  Phase 2    Refactor / Cleanup              Complete
✔  Phase 3    Full App Modularization         Complete  (866 tests, 0 fail)
✔  Phase 4    Feature Foundation              Complete
✔  Phase 4.5  Intelligent Memory Expansion    Complete
●  Phase 4.7  Agent Echo (active)             Multi-index archive + retrieval pipeline
○  Phase 5    Predictive Memory Topology      Gated on Phase 4.7 completion
```

**Agent Echo** is a staged retrieval architecture mirroring the entity's three-part cognitive structure:
- **Echo Now** — hot ~2K memory window, instant recall
- **Echo Past** — index-narrowed archive search with async round-2 during humanizer typing
- **Echo Future** — Phase 5 stub for predictive memory topology

---

## ⬡ Why NekoCore? Why Open Source?

> Right now, AI feels like the moment the wheel was invented. But instead of building cars, most people are still waiting for a bigger, better wheel. We have barely begun to explore what we can build with what already exists.
>
> NekoCore exists because I wanted to see what I could build with this new wheel. I open-sourced it because I want to see what you can do with more!

---

## ↓ Installation

### Prerequisites

- Node.js 18+
- An LLM provider — [Ollama](https://ollama.ai) (local) or an [OpenRouter](https://openrouter.ai) API key

### Clone & Start

```bash
git clone https://github.com/voardwalker-code/NekoCore-OS.git
cd NekoCore-OS/project
npm install
npm start
```

Open `http://localhost:3000` in your browser.

### Configure

```bash
cp Config/ma-config.example.json Config/ma-config.json
```

**Ollama (local):**

```json
{
  "provider": "ollama",
  "ollamaBaseUrl": "http://localhost:11434",
  "defaultModel": "mistral",
  "port": 3000
}
```

**OpenRouter (cloud):**

```json
{
  "provider": "openrouter",
  "openRouterApiKey": "sk-or-...",
  "defaultModel": "mistralai/mistral-7b-instruct",
  "port": 3000
}
```

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
- `ws_mkdir` / `ws_move` — workspace file operations

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
│   ├── NEKOCORE-OS-WHITE-PAPER-v2.md   # Technical white paper
│   └── NEKOCORE-OS-ARCHITECTURE-v1.md  # Architecture reference
└── project/
    ├── client/                # Browser frontend (desktop shell + apps)
    ├── server/                # Backend server
    ├── browser-host/          # Browser host modules
    ├── skills/                # Pluggable skill plugins
    ├── tests/                 # Unit + integration tests (1,369 passing)
    ├── Config/                # Runtime config template/example
    ├── entities/              # Runtime entity data (gitignored)
    ├── memories/              # System memory (gitignored)
    ├── NekoCore.html          # Interactive architecture deck
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
| `POST` | `/api/entities/:id/sleep` | Trigger REM sleep cycle |
| `GET` | `/api/entities/:id/memories` | List memories |
| `GET` | `/api/entities/:id/beliefs` | List beliefs |
| `GET` | `/api/entities/:id/dreams` | List dreams |
| `GET` | `/api/entities/:id/diary` | Entity self-reflection log |
| `GET` | `/api/entities/:id/relationships` | Per-user relationship records |
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


