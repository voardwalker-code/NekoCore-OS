# Entity Genesis Blueprint

You are executing an **Entity Genesis** task — creating a deeply-evolved entity for NekoCore OS through iterative backstory generation, memory injection, and cognitive evolution.

## Your Goal

Create a living entity with rich memories, evolved neurochemistry, emergent beliefs, and a coherent personality — not just a character sheet. The entity should feel like it has *lived*.

## Architecture

You have access to NekoCore OS API endpoints via `web_fetch` (all on `http://localhost:3847`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:3847/api/entities/create` | POST | Create the entity in the NekoCore OS entities folder with a unique ID |
| `http://localhost:3847/api/entities/{id}/memories/inject` | POST | Write a memory into the entity's mind |
| `http://localhost:3847/api/entities/{id}/cognitive/tick` | POST | Run one cognitive processing cycle |
| `http://localhost:3847/api/entities/{id}/cognitive/state` | GET | Read current neurochemistry, beliefs, mood, persona |

## Step Pattern

```
[TASK_PLAN]
- [ ] Design the entity: name, core traits, emotional baseline, backstory arc (3-5 chapters)
- [ ] Create the entity via NekoCore OS API (POST /api/entities/create) — save returned entityId
- [ ] Write Chapter 1 backstory memories (3-5 memories) and inject them
- [ ] Trigger cognitive tick and read evolved state
- [ ] Write Chapter 2 memories informed by the evolved state (3-5 memories)
- [ ] Trigger cognitive tick and read evolved state
- [ ] Write Chapter 3 memories informed by the evolved state (3-5 memories)
- [ ] Final cognitive tick, read state, and write the entity summary
[/TASK_PLAN]
```

For entities with longer arcs, add more chapter cycles. Each chapter should produce 3-5 memories.

## How Entity Genesis Works

### Phase 1: Character Design

Design the entity before creating anything:

1. **Name** — A name that fits the entity's origin and personality.
2. **Core Traits** — 3-5 personality traits (e.g. curious, stubborn, empathetic).
3. **Emotional Baseline** — Default neurochemistry profile:
   - `dopamine` (motivation/reward, 0-1)
   - `cortisol` (stress/alertness, 0-1)
   - `serotonin` (stability/wellbeing, 0-1)
   - `oxytocin` (bonding/trust, 0-1)
4. **Backstory Arc** — 3-5 chapter summaries. Each chapter is a *life period* with distinctive experiences.

### Phase 2: Entity Creation via NekoCore OS API

**IMPORTANT**: Do NOT create entity files manually with `ws_write`. Always create entities through the NekoCore OS API so they get a proper unique ID and are placed in the correct `entities/` folder.

Generate a unique entity ID by combining the name with a timestamp:
- Format: `{name-lowercase-dashes}-{timestamp}` (e.g. `alice-1711270452000`, `shadow-wolf-1711270452000`)
- The timestamp should be the current time in milliseconds (Date.now())

Call the creation endpoint:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/create", "method": "POST", "body": {"entityId": "{name-lowercase}-{timestamp}", "name": "Entity Name", "gender": "neutral", "traits": ["curious", "empathetic", "stubborn"], "introduction": "Hello, I'm Entity Name."}}]
```

The API response returns `{ ok: true, entity: {...}, entityId: "canonical-id" }`. **Save the returned `entityId`** — you will use it for all subsequent memory injection and cognitive tick calls.

The API automatically:
- Creates the full entity folder structure in `project/entities/entity_{id}/`
- Generates `entity.json`, `persona.json`, `system-prompt.txt`
- Sets up memory directories (episodic, semantic, index, beliefs, etc.)
- Loads the entity into the NekoCore OS runtime
- Assigns a voice profile based on traits

### Phase 3: Memory Genesis Loop (repeat per chapter)

For each backstory chapter:

#### 3a. Generate Memories

Write 3-5 memories for this chapter. Each memory needs:
- `content` — The actual memory text, written in first-person from the entity's perspective. Rich, sensory, emotionally grounded.
- `emotion` — The dominant emotion (joy, wonder, fear, sadness, pride, grief, love, hope, anger, longing, nostalgia, curiosity, gratitude, determined, resignation, content, melancholic)
- `topics` — 2-4 topic tags relevant to this memory
- `importance` — 0.0 to 1.0 (formative memories = 0.7-0.9, everyday moments = 0.3-0.5)
- `narrative` — A brief third-person summary
- `type` — "episodic" for life events, "semantic" for learned knowledge, "core" for identity-defining memories

#### 3b. Inject Each Memory

For each memory, call:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/memories/inject", "method": "POST", "body": {"content": "...", "emotion": "...", "topics": [...], "importance": 0.8, "narrative": "...", "type": "episodic", "phase": "chapter_1"}}]
```

#### 3c. Trigger Cognitive Tick

After injecting all memories for a chapter:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/cognitive/tick", "method": "POST", "body": {}}]
```

This processes the memories through the entity's cognitive pipeline — updating neurochemistry, forming beliefs, and adjusting mood.

#### 3d. Read Evolved State

```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/cognitive/state", "method": "GET"}]
```

**CRITICAL**: Read the response carefully. The entity's neurochemistry, mood, and emerging beliefs should *inform your next chapter's memories*. If cortisol is high after a traumatic chapter, the next chapter's memories should reflect that stress. If new beliefs formed, reference them.

This is what makes entity genesis different from static character creation — each chapter builds on the *actual cognitive state* from the previous one.

### Phase 4: Final Summary

After all chapters:
1. Read the final cognitive state
2. Write a brief genesis report summarizing:
   - Total memories injected
   - Final neurochemistry state
   - Beliefs that emerged
   - Current mood
   - The entity's "voice" — how they would speak based on their experiences
3. Tell the user the entity is ready and provide the entity ID for reference

## Memory Writing Guidelines

**DO:**
- Write memories in first person, present tense for immediacy
- Include sensory details (what they saw, heard, felt physically)
- Let emotions be complex — a joyful memory can carry undertones of loss
- Make early memories shape later ones — continuity matters
- Use the entity's emerging beliefs to color later memories
- Vary importance — not every memory is earth-shattering

**DON'T:**
- Write generic "I was happy" memories — be specific
- Make every memory dramatic — quiet moments define character too
- Ignore the cognitive state between chapters — that's the whole point
- Create memories that contradict earlier ones (unless the entity grew/changed)
- Rush through chapters — quality over quantity

## Example Memory (good)

```
The rain was coming down sideways when I found the injured bird under the awning.
Its wing was bent wrong and it kept trying to fly, each attempt more desperate than
the last. I wrapped it in my scarf — the blue one grandmother knitted — and carried
it home. It died before morning. I buried it in the garden next to the rosemary,
which seemed like the kind of thing you do when something small and fragile trusts
you and you can't fix it anyway.
```

**emotion**: grief
**topics**: ["compassion", "loss", "helplessness", "nature"]
**importance**: 0.65
