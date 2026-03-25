---
name: book-ingestion
description: Extract characters from a book and create them as NekoCore OS entities with POV-isolated memories. Supports main-only, all, or specific character selection.
---

# Book-to-Entity Ingestion Skill

Extract characters from a book (novel, story, transcript) and create each as a NekoCore OS entity with isolated first-person memories.

## When This Skill Applies
- User wants to ingest a book and extract characters as entities
- User mentions book characters, novel characters, character extraction
- User wants to turn a story's cast into NekoCore OS entities
- User mentions "book to entity", "extract characters from book", "ingest novel"

## Workflow Overview

Book ingestion is a **multi-phase pipeline**:
1. Upload book text → server chunks it into ~2500-char segments
2. Process all chunks in batches → discover characters, aliases, roles, traits, scene appearances
3. Classify characters (main/supporting/minor/background)
4. Present list to user — **wait for selection** (Main Only / All / Specific names)
5. For each selected character, extract POV-isolated memories from ONLY their scenes
6. Create each character as an entity via NekoCore OS API
7. Inject memories chronologically with cognitive ticks between chapters
8. Summary report

## API Endpoints

### MA Server (`http://localhost:3850`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/book/upload` | POST | Upload + chunk book text. Body: `{text, title?, author?}` or `{filePath, title?, author?}` |
| `/api/book/{bookId}/chunks` | GET | List chunk metadata (index, preview, charCount) |
| `/api/book/{bookId}/chunk/{index}` | GET | Read one chunk's full text |

### NekoCore OS (`http://localhost:3847`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/entities/create` | POST | Create entity. Body: `{entityId, name, gender, traits, introduction}` |
| `/api/entities/{id}/memories/inject` | POST | Inject one memory. Body: `{content, type, emotion, topics, importance, narrative, phase}` |
| `/api/entities/{id}/cognitive/tick` | POST | Process memories through cognitive pipeline |
| `/api/entities/{id}/cognitive/state` | GET | Read neurochemistry, beliefs, mood, persona |

## Character Selection Modes

When presenting the character list, offer three modes:

1. **Main Characters Only** — protagonist, antagonist, love interest. Appears in >25% of chunks.
2. **All Characters** — all non-background characters (main + supporting + minor).
3. **Specific Characters** — user names exactly which characters to extract.

**CRITICAL: Always wait for user selection before proceeding to memory extraction.**

## POV Isolation Rules — MANDATORY

These rules define the entire purpose of this system:

1. **Scene presence required** — a character only gets memories from chunks where they appear
2. **First-person only** — every memory is written from that character's perspective
3. **No cross-contamination** — Character A NEVER knows about scenes they weren't in
4. **Internal thoughts** — belong ONLY to the POV narrator character
5. **Shared scenes** — generate SEPARATE memories for each present character, with different emotional framing and importance
6. **Importance varies** — the same event can be high-importance for one character and trivial for another

## Memory Schema

Each injected memory follows this format:

```json
{
  "content": "First-person memory text — ONLY what this character experienced/witnessed",
  "type": "episodic",
  "emotion": "joy|wonder|love|hope|pride|gratitude|sadness|fear|anger|grief|longing|nostalgia|curiosity|neutral|resignation|melancholic|determined|content",
  "topics": ["tag1", "tag2"],
  "importance": 0.3,
  "narrative": "Brief third-person summary",
  "phase": "chapter_1"
}
```

## IMPORTANT

- Always upload the book FIRST via `/api/book/upload` before any processing
- Process ALL chunks during discovery — do not skip chunks
- Never create entity files manually with `ws_write` — always use the NekoCore OS API
- Use `mem_*` prefix memories (the API handles this) — NOT `doc_*` which are excluded from retrieval
- Run cognitive ticks between chapter groups (every ~5-10 memories per character)
- After all memories, inject one semantic relationship memory per significant character relationship
