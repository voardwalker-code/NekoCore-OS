---
name: entity-genesis
description: Create deeply-evolved entities for NekoCore OS through iterative backstory generation, memory injection, and cognitive evolution tracking.
---

# Entity Genesis Skill

Create living entities for NekoCore OS with rich backstories, layered memories, and emergent cognitive states.

## When This Skill Applies
- User asks to create, forge, birth, or spawn an entity/character/persona
- User wants to build a new being for the OS with backstory and memories
- User mentions entity genesis, character creation, or personality forging

## Workflow Overview

Entity genesis is an **iterative** process:
1. Design the character (name, traits, emotional baseline, backstory arc)
2. Create the entity via the NekoCore OS API (generates unique ID, creates folder structure)
3. For each backstory chapter:
   a. Generate 3-5 first-person memories
   b. Inject them via the OS enrichment API
   c. Trigger a cognitive tick to process them
   d. Read the evolved state to inform the next chapter
4. Finalize with a genesis report

## API Endpoints

All endpoints target the NekoCore OS server at `http://localhost:3847`:

### Create Entity (REQUIRED FIRST STEP)
**IMPORTANT**: Always use this API to create entities. Never create entity files manually with `ws_write`.
Generate a unique ID: `{name-lowercase-dashes}-{timestamp}` (e.g. `alice-1711270452000`)
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/create", "method": "POST", "body": {"entityId": "{name-lowercase}-{timestamp}", "name": "Entity Name", "gender": "neutral", "traits": ["trait1", "trait2", "trait3"], "introduction": "Hello, I'm Entity Name."}}]
```
The response returns `{ ok: true, entity: {...}, entityId: "canonical-id" }`. Use the returned `entityId` for all subsequent calls.

### Inject Memory
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/memories/inject", "method": "POST", "body": {"content": "First-person memory text...", "emotion": "joy", "topics": ["topic1", "topic2"], "importance": 0.7, "narrative": "Third-person summary", "type": "episodic", "phase": "chapter_1"}}]
```

### Cognitive Tick
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/cognitive/tick", "method": "POST", "body": {}}]
```

### Read State
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/cognitive/state", "method": "GET"}]
```

## Memory Quality Rules
- Write in first person, present tense for immediacy
- Include sensory details — what the entity saw, heard, felt
- Vary emotions across memories — not everything is dramatic
- Let earlier memories inform later ones through cognitive state
- Use `importance` 0.7-0.9 for formative events, 0.3-0.5 for everyday moments

## Emotions Available
joy, wonder, love, hope, pride, gratitude, sadness, fear, anger, grief, longing, nostalgia, curiosity, neutral, resignation, melancholic, determined, content
