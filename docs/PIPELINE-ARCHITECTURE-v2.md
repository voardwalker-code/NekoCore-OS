# NekoCore OS — Cognitive Pipeline Architecture v2

Version: 2.0.0
Last updated: 2026-03-18

---

## 1. Purpose

This document is the single visual and written reference for the NekoCore OS live-chat cognitive pipeline. It covers the full message lifecycle — from the moment a user turn arrives to the async side-effects that fire after the response is delivered.

Use this document to:
- Understand every stage of the pipeline and why it exists.
- Generate a high-fidelity architecture diagram (image prompt included at the end).
- Onboard contributors or reviewers who need the big picture fast.

---

## 2. Pipeline at a Glance

**4 synchronous LLM calls per message** (baseline): Subconscious 1A, Dream-Intuition 1D, Conscious 1C, Final Orchestrator.
Plus: optional chatlog reconstruction inside 1A, and up to 2 async post-turn calls (memory encoding + relationship update).

The pipeline replaced the original serial chain (Subconscious → Compress → Conscious) in v0.5.2-prealpha, and gained the task-first MTOA fork in Phase 4.9.

---

## 3. Architecture Chart

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║                        NekoCore OS — New Cognitive Pipeline Architecture                       ║
║                  Task-First Fork + Parallel Companion Cognition + Policy Guards                 ║
║                    Baseline: 4 synchronous cognitive calls (1A, 1D, 1C, Final)                 ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝

  ┌──────────┐     ┌──────────────┐     ◆═══════════════════◆
  │          │     │  Chat        │    ╱ Task Intent          ╲
  │  User    │────▶│  Pipeline    │──▶◆  Confidence ≥          ◆
  │  Turn    │     │  Entry       │    ╲ Threshold?           ╱
  └──────────┘     └──────────────┘     ◆═══════╤═══════════◆
         [tan]            [tan]                  │
                                        Yes ─────┤───── No
                                                 │          │
  ┌──────────────────────────────────────────────┤          │
  │           TASK LANE (blue)                   │          │
  │                                              │          │
  │  ┌─────────────┐  ┌──────────────┐  ┌───────┴───────┐  │
  │  │ Task Session│  │ Gather Task  │  │ Execute Task  │  │
  │  │ Create or   │─▶│ Context by  │─▶│ Module Steps  │  │
  │  │ Resume      │  │ Task Type    │  │               │  │
  │  └─────────────┘  └──────────────┘  └───────┬───────┘  │
  │                                              │          │
  │  ┌───────────────────────────────────────────┴───────┐  │
  │  │ Frontman Event Surface (SSE)                      │  │
  │  │  task_milestone · task_needs_input · task_complete │  │
  │  │  task_error · task_steering_injected              │  │
  │  │  + natural-language chat_follow_up                │  │
  │  └───────────────────────────┬───────────────────────┘  │
  │                              │                          │
  │                   ┌──────────┴──────────┐               │
  │                   │  Task Response Path │───────┐       │
  │                   └─────────────────────┘       │       │
  └─────────────────────────────────────────────────│───────┘
                                                    │
  ┌─────────────────────────────────────────────────│───────────────────────┐
  │           COMPANION COGNITION LANE (green)      │                       │
  │                                                 │                       │
  │  ┌─────────────────────┐  ┌──────────────────────────┐                 │
  │  │ Subconscious (1A)   │  │ Dream-Intuition (1D)     │                 │
  │  │ · Memory retrieval  │  │ · Deterministic turn     │                 │
  │  │ · Relationship ctx  │  │   signal extraction      │                 │
  │  │ · Topic + emotion   │  │ · Lateral/abstract links │                 │
  │  │   signals           │  │ · Creative metaphors     │                 │
  │  │ · doc_* filtering   │  │ · No memory write access │                 │
  │  └─────────┬───────────┘  └────────────┬─────────────┘                 │
  │            │      ┌─── PARALLEL ───┐   │                               │
  │            │      │  Promise.all   │   │                               │
  │            └──────┤  (barrier)     ├───┘                               │
  │                   └───────┬────────┘                                   │
  │                           │ both complete                              │
  │                           ▼                                            │
  │             ┌──────────────────────────┐                               │
  │             │ Conscious (1C)           │                               │
  │             │ · Full 1A memory context │                               │
  │             │ · Full 1D associations   │                               │
  │             │ · Relationship signal    │                               │
  │             │ · Produces response draft│                               │
  │             │ · May emit [TOOL:] tags  │                               │
  │             └────────────┬─────────────┘                               │
  │                          │                                             │
  │                ◆═════════╧══════════◆                                  │
  │               ╱  Contains [TOOL:]?   ╲                                 │
  │              ◆                        ◆                                │
  │               ╲                      ╱                                 │
  │                ◆════╤══════════╤════◆                                  │
  │                     │          │                                       │
  │                Yes  │          │  No                                   │
  │                     ▼          │                                       │
  │    ┌────────────────────────┐  │                                       │
  │    │ Server Tool Execution  │  │                                       │
  │    │ [TOOL:] takes priority │  │                                       │
  │    │ over [TASK_PLAN]       │  │                                       │
  │    └───────────┬────────────┘  │                                       │
  │                │               │                                       │
  │                └───────┬───────┘                                       │
  │                        ▼                                               │
  │          ┌──────────────────────────┐     ┌─────────────────────────┐  │
  │          │ Final Orchestrator Pass  │◀╌╌╌╌│ POLICY PANEL (pink/red) │  │
  │          │ · Reviewer + Voicer      │     │                         │  │
  │          │ · Full copy of 1C ctx    │     │ Escalation Policy       │  │
  │          │ · Entity-authentic voice │     │  · high-tension         │  │
  │          │ · Supports [CONTINUE]    │     │  · planning-impl-combo  │  │
  │          │   multi-bubble output    │     │  · user-requested-depth │  │
  │          └────────────┬─────────────┘     │                         │  │
  │                       │                   │ Budget Guard            │  │
  └───────────────────────│───────────────────│  · may block escalation │  │
                          │                   │                         │  │
                          │                   │ Latency Guard           │  │
                          │                   │  · 35s timeout          │  │
                          │                   │  · fallback runtime     │  │
                          │                   │  · final fallback: 1C   │  │
                          │                   │    string               │  │
                          │                   └─────────────────────────┘  │
                          │                                                │
                          ├◀──────────────────────────────────────(merge)──┘
                          ▼
              ┌────────────────────────┐
              │  Response Sent to      │
              │  Client                │
              └───────────┬────────────┘
                          │
  ┌───────────────────────┼───────────────────────────────────────────────┐
  │       ASYNC LANE (violet) — fire-and-forget after response sent      │
  │                       │                                               │
  │            ┌──────────┴──────────┐                                    │
  │            │                     │                                    │
  │            ▼                     ▼                                    │
  │  ┌─────────────────────┐  ┌──────────────────────────┐               │
  │  │ Memory Encoding     │  │ Relationship Update      │               │
  │  │ · createCoreMemory  │  │ · updateRelationship     │               │
  │  │ · createSemantic    │  │   FromExchange()         │               │
  │  │   Knowledge         │  │ · Trust delta capped     │               │
  │  │ · userId stamped    │  │   at ±0.08 per turn      │               │
  │  │ · Boilerplate guard │  │ · LLM returns JSON delta │               │
  │  └─────────────────────┘  └──────────────────────────┘               │
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘

LEGEND
  [tan]     Entry nodes          (User Turn, Chat Pipeline Entry)
  [amber]   Decision diamonds    (Task Intent, [TOOL:] check)
  [blue]    Task lane            (MTOA session → execute → frontman → response)
  [green]   Cognition lane       (1A ∥ 1D → 1C → Tool gate → Final Orchestrator)
  [pink]    Policy panel         (Escalation, Budget Guard, Latency Guard)
  [violet]  Async lane           (Memory Encoding, Relationship Update)
```

---

## 4. Stage-by-Stage Explanation

### 4.1 Entry — Chat Pipeline

**File:** `server/services/chat-pipeline.js`

Every user message enters through the chat pipeline. Before any cognitive work begins, the pipeline runs **task intent classification** via `detectAndDispatchTask(...)`. This is the "task-first fork" — it decides whether the turn should be handled as a structured task or as free-form companion conversation.

### 4.2 Task Lane (MTOA)

**Files:** `server/brain/tasks/task-pipeline-bridge.js`, `task-frontman.js`, `task-event-bus.js`
**API:** `server/routes/task-routes.js`

If the task classifier returns confidence above the dispatch threshold:

1. **Task Session** — A new task session is created (or the existing one resumed) with a unique session ID.
2. **Context Gathering** — Task-type-specific context is assembled: relevant memories, prior session state, skill availability.
3. **Module Execution** — The specialized task module executes step-by-step. Each step may invoke tools, LLMs, or skills.
4. **Frontman Event Surface** — Progress is broadcast over SSE (`/api/brain/events`) as structured events: `task_milestone`, `task_needs_input`, `task_complete`, `task_error`, `task_steering_injected`. Each event is also translated into a natural-language `chat_follow_up` so the chat UI shows human-readable progress.
5. **Task Response Path** — The final task output is delivered to the client without entering the companion cognition lane.

**Client-side:** `chat.js` owns the SSE connection and delegates task events to `window.handleTaskSSEEvent(...)`. `task-ui.js` renders the badge, history panel, and cancel controls. `telemetry-ui.js` surfaces active-task status in the Task Manager.

### 4.3 Companion Cognition Lane

If the turn is not a task (or falls below the confidence threshold), it enters the four-stage companion cognition pipeline.

#### 4.3.1 Subconscious (1A)

**File:** `server/brain/core/orchestrator.js` (calls `server/services/memory-retrieval.js`)

Runs memory retrieval and relationship lookup:
- **Activated Memories** — Scored by `relevanceScore = baseWeight × (0.35 + importance × decay)`. Only experiential memories are included; `doc_*` entries (document ingestion chunks) and system boilerplate are filtered out.
- **Conversation Recall** — Reconstructed chatlog of the last N turns, deduplicated.
- **Relationship Context** — Current feeling, trust level, rapport, role labels, and belief snapshot for the active user.
- **Signals** — Emits emotion signals, topic signals, and memory activation observations.

Output: `memoryContext` block passed forward to Conscious.

#### 4.3.2 Dream-Intuition (1D)

**File:** `server/brain/cognition/dream-intuition-adapter.js`

Runs in parallel with 1A via `Promise.all`:
- **Turn Signal Extraction** — Subject, event, emotion, and tension are extracted deterministically on-device (no LLM call) by `server/brain/utils/turn-signals.js`.
- **Lateral Associations** — The LLM generates abstract connections, lateral links, and creative metaphors from the turn signals.
- **No Memory Write Access** — 1D is intuition-only. It does not persist anything. (Contrast with the offline Dream Maintenance system, which consolidates memories during sleep cycles.)
- Tagged `_source: 'native'` (or `'worker'` if a Worker Entity is bound to this aspect).

Output: `dreamText` passed forward to Conscious.

#### 4.3.3 Barrier — Wait for 1A + 1D

Both must complete before Conscious starts. This is a hard `Promise.all` barrier. The pipeline will not proceed with partial context.

#### 4.3.4 Conscious (1C)

Conscious has **full cognitive context**:
- Everything from 1A: activated memories, conversation recall, relationship state, emotion/topic signals.
- Everything from 1D: abstract associations, creative metaphors, lateral links.
- Turn signals and relationship signal.

With all of this, Conscious produces the **primary response draft**. It is the stage that actually *reasons* about what to say.

Conscious may also emit `[TOOL: ...]` tags to request server-side tool invocations, or a `[TASK_PLAN]` block to propose multi-step work. If both appear, `[TOOL:]` takes priority and the task plan is stripped (mutual exclusivity rule).

#### 4.3.5 Tool Execution Gate

If the Conscious draft contains `[TOOL: ...]` tags:
1. Server parses and executes the tool call.
2. `result._toolsHandled = true` is set.
3. Task plan detection is skipped entirely.
4. A safety-net strip removes any orphan `[TASK_PLAN]` or `[TOOL:]` markup from the final response.

If no tools are requested, the draft passes through directly to the Final Orchestrator.

#### 4.3.6 Final Orchestrator Pass — Reviewer and Voicer

**File:** `server/brain/core/orchestrator.js`

The Final Orchestrator receives:
- The user's original message.
- A **full copy** of everything Conscious had (1A context, 1D output, turn signals).
- The Conscious draft itself.

Its role is **review and voice**, not re-synthesis. Conscious already did the reasoning. The Orchestrator shapes *how* the response is said — ensuring coherence, narrative fit, and the entity's authentic voice.

Additional capabilities:
- Supports `[CONTINUE]` for multi-bubble output.
- Passes through `[TOOL:]` tags and `[TASK_PLAN]` blocks unchanged.
- Subject to optional model escalation (see Policy Panel).
- **Voice profile** is applied client-side using per-entity traits: typing speed, rhythm, filler phrases, brb pauses, and error rates are all derived from personality traits at creation time (`server/services/voice-profile.js`).

### 4.4 Policy Panel

**File:** `server/brain/core/orchestration-policy.js`

Three guards modulate the Final Orchestrator pass:

| Guard | What It Does | Trigger |
|-------|-------------|---------|
| **Escalation Policy** | Decides whether to route to a more capable model (O2) | `high-tension`, `error-constraint-combo`, `planning-implementation-combo`, `user-requested-depth` |
| **Budget Guard** | Blocks escalation if cumulative token usage (1A + 1D + 1C) exceeds the cap | Token total above budget threshold |
| **Latency Guard** | 35-second timeout race on the Final/O2 call | Timeout → fallback to default runtime → fallback to raw 1C string |

Every orchestration call returns escalation telemetry: `{ reason, modelUsed, timedOut, budgetBlocked, latencyMs, tokenCost }` in `innerDialog.artifacts.escalation`.

### 4.5 Async Lane — Post-Turn Side Effects

Both fire after the response is sent — they do **not** block the user.

**Memory Encoding** (`server/services/post-response-memory.js`)
- Dual-path IME: calls both `createCoreMemory` (episodic) and `createSemanticKnowledge` (semantic).
- Records are stamped with `userId` / `userName`.
- Boilerplate guard prevents system context markers from being encoded as memories.

**Relationship Update** (`server/services/relationship-service.js`)
- `updateRelationshipFromExchange()` sends the user message, entity response, and current relationship state to the LLM.
- Returns a JSON delta: `feeling`, `trust`, `rapport`, `userRole`, `entityRole`, `beliefs[]`, `summary`, `changeReason`.
- Trust change is capped at **±0.08 per turn** to prevent wild swings.
- Persisted to `entities/<id>/memories/relationships/<userId>.json`.

### 4.6 Worker Entity Subsystem

**Files:** `server/brain/core/worker-registry.js`, `server/brain/core/worker-dispatcher.js`, `server/contracts/worker-output-contract.js`

Any contributor aspect (1A, 1C, 1D) can be overridden by a separate Worker Entity operating in subsystem mode. The worker is invoked via `invokeWorker(aspectKey, payload)`, which:
- Wraps the call in a latency guard.
- Validates the output against the worker contract (required fields: `summary`, `signals`, `confidence`).
- Emits cognitive bus events (`worker_invoked`, `worker_success`, `worker_fallback`).
- Returns `null` on failure, causing the native contributor to run transparently as fallback.

Results are tagged `_source: 'worker'`. Diagnostics are included in `innerDialog.artifacts.workerDiagnostics`.

---

## 5. LLM Call Budget Summary

| Call | Stage | Sync/Async | Required |
|------|-------|-----------|----------|
| 1 | Subconscious (1A) | Synchronous | Always |
| 2 | Dream-Intuition (1D) | Synchronous (parallel with 1A) | Always |
| 3 | Conscious (1C) | Synchronous (after barrier) | Always |
| 4 | Final Orchestrator | Synchronous | Always |
| 5 | Chatlog Reconstruction (inside 1A) | Synchronous | Optional — only when recall needs rebuild |
| 6 | Memory Encoding | Async post-turn | Always (fire-and-forget) |
| 7 | Relationship Update | Async post-turn | Always (fire-and-forget) |

---

## 6. Key Source Files

| File | Role |
|------|------|
| `server/brain/core/orchestrator.js` | Pipeline runner — all synchronous stages |
| `server/services/chat-pipeline.js` | Chat entry point; pre-orchestrator MTOA task fork |
| `server/brain/tasks/task-pipeline-bridge.js` | Task intent dispatch (`detectAndDispatchTask`) |
| `server/brain/tasks/task-frontman.js` | Frontman milestone synthesis + SSE events |
| `server/brain/tasks/task-event-bus.js` | Task lifecycle event bus |
| `server/routes/task-routes.js` | Task API (run/session/cancel/modules/history) |
| `server/brain/core/orchestration-policy.js` | Escalation, budget, latency guards |
| `server/brain/core/worker-registry.js` | Worker binding registry |
| `server/brain/core/worker-dispatcher.js` | Worker invocation with failsafe |
| `server/brain/generation/aspect-prompts.js` | System prompts per contributor phase |
| `server/brain/utils/turn-signals.js` | Deterministic turn signal extraction |
| `server/brain/cognition/dream-intuition-adapter.js` | Live-loop 1D contributor |
| `server/services/memory-retrieval.js` | Subconscious context block assembly |
| `server/services/post-response-memory.js` | Async memory encoding + relationship trigger |
| `server/services/relationship-service.js` | Per-user relationship delta persistence |
| `server/services/voice-profile.js` | Per-entity voice trait generation |
| `server/services/llm-interface.js` | `callLLMWithRuntime`, `callSubconsciousReranker` |
| `server/services/config-runtime.js` | Multi-LLM profile/aspect config resolution |
| `server/services/response-postprocess.js` | Final output cleanup (strip tags, format) |
| `server/contracts/worker-output-contract.js` | Worker contract validation |
| `server/contracts/contributor-contracts.js` | Contributor output shape validators |
| `client/js/apps/core/chat.js` | SSE connection + task event delegation |
| `client/js/apps/optional/task-ui.js` | Task badge, history, cancel UI |
| `client/js/apps/core/telemetry-ui.js` | Task Manager active-task telemetry |

---

## 7. Image Generation Prompt

Feed this entire document as context, then paste the prompt below into your image generator. The prompt corrects the six deltas found in the first render attempt.

---

```
Create a high-resolution, professional system architecture infographic for NekoCore OS Cognitive WebOS, titled:
"New Cognitive Pipeline Architecture (Task-First + Companion Cognition)"

Style:
Modern technical infographic. Clean white background. Sharp vector rectangles and diamonds. Subtle gradients on swimlane backgrounds only. High-contrast black text on light fills. Enterprise architecture aesthetic. No cartoon style 3D or skeuomorphic elements. 16:9 landscape at 3840x2160 or higher. Presentation-ready. All labels must be fully readable at arm's length from a laptop screen.

Layout — four horizontal swimlanes, left-to-right flow:

ENTRY (left edge, tan/beige fill):
- Rounded rectangle "User Turn"
- Arrow right to rounded rectangle "Chat Pipeline Entry"
- Arrow right to amber diamond "Task Intent Confidence >= Threshold?"
- Diamond has two labeled exit arrows: "Yes" upward into Task lane, "No" downward into Cognition lane.

TASK LANE (top swimlane, light blue fill, labeled "Task Lane"):
- "Yes" arrow enters from the decision diamond on the left.
- Four boxes in a row, connected by arrows:
  1. "Task Session — Create or Resume"
  2. "Gather Task Context by Task Type"
  3. "Execute Task Module Steps"
  4. "Frontman Event Surface (SSE)" with smaller text listing: task_milestone, task_needs_input, task_complete, task_error, task_steering_injected, chat_follow_up
- Arrow from Frontman to a rounded rectangle "Task Response Path" that merges rightward to the shared "Response Sent to Client" node.

COMPANION COGNITION LANE (middle swimlane, light green fill, labeled "Companion Cognition Lane"):
- "No" arrow enters from the decision diamond on the left.
- Two boxes side-by-side (indicating parallel execution), connected by a shared "Join Barrier (Promise.all)" merge node:
  Left box: "Subconscious (1A)" with bullets: memory retrieval, relationship context, topic/emotion signals
  Right box: "Dream-Intuition (1D)" with bullets: deterministic turn signals, lateral links, creative associations
- Arrow from join barrier to "Conscious (1C)" box with bullets: reason with full 1A context + 1D associations, produce response draft
- Arrow from 1C to amber diamond "Contains [TOOL:]?"
  "Yes" arrow goes to "Server Tool Execution — TOOL takes priority over TASK_PLAN", then arrow into Final Orchestrator.
  "No" arrow goes directly into Final Orchestrator.
- "Final Orchestrator Pass" box with bullets: reviewer + voicer, entity-authentic response, supports [CONTINUE] multi-bubble
- Arrow from Final Orchestrator rightward to the shared "Response Sent to Client" node.

POLICY PANEL (right side callout, light pink/salmon fill, labeled "Policy Guards"):
- This is a side panel connected to the Final Orchestrator with three dashed arrows, NOT a swimlane that contains Task Response Path.
- Three stacked boxes:
  1. "Escalation Policy" — high-tension, planning-implementation-combo, user-requested-depth
  2. "Budget Guard" — may block escalation if token cap exceeded
  3. "Latency Guard" — 35s timeout, fallback runtime, final fallback to raw 1C string
- Each box has a dashed arrow pointing left into the Final Orchestrator box.

RESPONSE + ASYNC LANE (bottom right, violet fill, labeled "Async Lane"):
- "Response Sent to Client" rounded rectangle sits between the cognition lane and the async lane.
- Two arrows descend from "Response Sent to Client" into the violet async lane:
  Left box: "Memory Encoding" with small text: createCoreMemory + createSemanticKnowledge, userId stamped
  Right box: "Relationship Update" with small text: trust delta capped ±0.08 per turn

LEGEND (bottom-left corner, single instance only):
- Small color swatches with labels: Entry (tan), Decisions (amber), Task (blue), Cognition (green), Policy (pink), Async (violet)

Compact subtitle below the title:
"4 synchronous cognitive calls baseline: 1A, 1D, 1C, Final"

Typography:
- Title: bold, 48pt equivalent, black
- Subtitle: regular, 24pt equivalent, dark gray
- Box labels: bold, 18pt equivalent
- Bullet text: regular, 14pt equivalent
- All text must be crisp and fully legible — no text smaller than 12pt equivalent

Specific fixes from v1:
- Task Response Path must be INSIDE the Task lane, NOT inside the Policy panel.
- The [TOOL:] decision diamond must have exactly two clean exit paths (Yes to tool execution then to Final Orchestrator; No directly to Final Orchestrator). No duplicate or ambiguous Yes arrows.
- Only ONE legend, placed bottom-left.
- Policy panel is a SIDE callout with dashed connection lines to Final Orchestrator — it does not contain any task-lane nodes.
- Async boxes sit below the "Response Sent to Client" node on the right side, not as a full-width bottom bar.
- All text must be large enough to read on a laptop at arm's length.

Negative prompt:
no blurry text, no tiny unreadable labels, no dark cyberpunk theme, no purple-heavy monochrome, no 3D gimmicks, no random decorative icons, no watermark, no spelling mistakes, no duplicate legends, no misplaced nodes
```

---

*End of document.*
