# Book-to-Entity Ingestion Blueprint

You are executing a **Book Ingestion** task — extracting characters from a book and creating them as NekoCore OS entities with POV-isolated memories.

## Your Goal

Read a book, discover all characters, let the user select which to extract, then create each selected character as a NekoCore OS entity with memories derived ONLY from scenes they personally appear in. Characters must not know about events they weren't present for.

## Architecture

You have access to these endpoints:

**MA Server** (on `http://localhost:3850`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/book/upload` | POST | Upload and chunk a book |
| `/api/book/{bookId}/chunks` | GET | List all chunks with preview/char counts |
| `/api/book/{bookId}/chunk/{index}` | GET | Read a single chunk |

**NekoCore OS** (on `http://localhost:3847`, via `web_fetch`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/entities/create` | POST | Create entity with unique ID |
| `/api/entities/{id}/memories/inject` | POST | Write a memory into entity's mind |
| `/api/entities/{id}/cognitive/tick` | POST | Run one cognitive processing cycle |
| `/api/entities/{id}/cognitive/state` | GET | Read neurochemistry, beliefs, mood |

## Step Pattern

```
[TASK_PLAN]
- [ ] Upload the book text and get bookId + chunk count
- [ ] Discover characters: process all chunks in batches, build character registry
- [ ] Present character list to user with roles (main/supporting/minor) — wait for selection
- [ ] For each selected character: extract POV-isolated memories from their scenes
- [ ] Create each character as an entity via NekoCore OS API
- [ ] Inject memories chronologically, running cognitive ticks between chapters
- [ ] Generate summary report of all created entities
[/TASK_PLAN]
```

---

## Phase 1: Book Upload

When the user provides book text (pasted in chat or via file path):

1. Upload via MA server:
```
[TOOL:web_fetch {"url": "http://localhost:3850/api/book/upload", "method": "POST", "body": {"text": "<THE FULL BOOK TEXT>", "title": "Book Title", "author": "Author Name"}}]
```
If the user provides a file path instead:
```
[TOOL:web_fetch {"url": "http://localhost:3850/api/book/upload", "method": "POST", "body": {"filePath": "/path/to/book.txt", "title": "Book Title", "author": "Author Name"}}]
```

Response: `{ ok: true, bookId: "book_xxx", totalChunks: N, totalChars: N }`

2. Store the `bookId` and `totalChunks` — you'll need them for all subsequent phases.

---

## Phase 2: Character Discovery (Multi-Pass LLM)

Process ALL chunks to find every character. Work in batches of 3-5 chunks per LLM analysis.

### 2a. Fetch chunks in batches

For each batch, fetch chunk content:
```
[TOOL:web_fetch {"url": "http://localhost:3850/api/book/{bookId}/chunk/{index}", "method": "GET"}]
```

### 2b. Analyze each batch

For each batch, analyze for characters. Ask yourself (this is an internal LLM reasoning step, not a tool call):

> "Analyze these passages. For every named character that appears, record:
> - Name and any aliases (nicknames, titles, last names)
> - Gender
> - Role: protagonist / antagonist / love-interest / supporting / minor / background
> - Personality traits observed in this batch
> - Which chunk indices they appear in
> - Dialog count (approximate number of speaking lines)
> - Relationships with other characters mentioned
> - Key actions or events involving them"

### 2c. Build running character registry

After each batch, merge new findings into your running registry:
- Unify aliases (e.g., "Elizabeth", "Lizzy", "Miss Bennet" → same character)
- Accumulate scene appearances across batches
- Update trait observations as character develops
- Track relationships discovered

### 2d. Classify characters after all batches

After processing ALL chunks, classify each character:

| Classification | Criteria |
|---------------|----------|
| **main** | Protagonist, antagonist, or love interest. Appears in >25% of chunks. Has character arc. |
| **supporting** | Significant recurring role. 10-25% chunk appearances. Dialog with main characters. |
| **minor** | Named character, <10% of chunks. Few dialog lines. |
| **background** | Mentioned by name but no meaningful dialog or scene participation. |

### 2e. Present to user

Present the character list to the user in this format:

```
📚 Character Discovery Complete — "{Book Title}"

MAIN CHARACTERS:
  ★ {Name} — {Role} | {trait1}, {trait2}, {trait3} | Appears in {N} of {total} chunks
    Relationships: {relationship summary}

SUPPORTING CHARACTERS:
  ● {Name} — {Role} | {trait1}, {trait2} | Appears in {N} chunks
    Relationships: {relationship summary}

MINOR CHARACTERS:
  ○ {Name} — Appears in {N} chunks

Selection options:
  (1) Main Characters Only — extracts {N} characters
  (2) All Characters (excluding background) — extracts {N} characters
  (3) Specific Characters — tell me which names you want

Which would you like?
```

**CRITICAL: STOP AND WAIT for the user's response before proceeding.** Do not continue until they select.

---

## Phase 3: Memory Extraction (Per-Character, POV-Isolated)

For each selected character, process ONLY the chunks where that character appears.

### POV Isolation Rules — MANDATORY

These rules are **non-negotiable**. They define the entire purpose of this system.

1. **Scene presence required**: A character can ONLY have memories from chunks where they appear (listed in their `sceneAppearances`).
2. **First-person POV only**: Every memory must be written from that character's first-person perspective.
3. **No cross-contamination**: Character A must NEVER reference events, conversations, or information from scenes they were NOT in. Even if you know what happened, the character does not.
4. **Internal thoughts belong to POV character only**: If the book has a POV narrator, only that character gets the narrator's internal thoughts. Other characters present in the same scene only get what was said and done externally.
5. **Overheard = only what was heard**: If a character overhears part of a conversation, their memory includes only what they actually heard, not the full exchange.
6. **Different emotional framing for shared scenes**: Two characters in the same scene will remember it differently based on their personality, role, and emotional state.
7. **Importance varies by character perspective**: The same event may be high-importance for one character and low-importance for another.

### Memory Extraction Process

For each selected character, for each chunk where they appear:

Generate 1-3 first-person memories. Each memory follows this schema:

```json
{
  "content": "First-person memory from this character's POV ONLY. Rich with sensory details and emotional coloring. Must not reference anything the character couldn't know.",
  "type": "episodic",
  "emotion": "one of: joy, wonder, love, hope, pride, gratitude, sadness, fear, anger, grief, longing, nostalgia, curiosity, neutral, resignation, melancholic, determined, content",
  "topics": ["2-4 topic tags relevant to this memory"],
  "importance": 0.3-0.9,
  "narrative": "Brief third-person summary",
  "phase": "chapter_N"
}
```

### Importance Scoring Guide

| Event type | Importance range |
|-----------|-----------------|
| Life-changing revelation, betrayal, love confession | 0.8–0.9 |
| Major confrontation, pivotal decision, significant meeting | 0.6–0.8 |
| Notable social interaction, meaningful conversation | 0.4–0.6 |
| Everyday observation, routine event | 0.2–0.4 |

### Shared Scene Example

Book passage: Elizabeth overhears Darcy saying "She is tolerable, but not handsome enough to tempt me."

**Elizabeth's memory** (she overheard it — formative insult):
```json
{
  "content": "At the Meryton ball, I overheard Mr. Darcy refuse to dance with me. He told Mr. Bingley I was merely 'tolerable' and 'not handsome enough to tempt' him. The arrogance! I laughed it off with my friends, but the sting of his dismissal lingered.",
  "emotion": "anger",
  "topics": ["meryton-ball", "mr-darcy", "insult", "first-impression"],
  "importance": 0.8,
  "phase": "chapter_3"
}
```

**Darcy's memory** (unremarkable social obligation for him):
```json
{
  "content": "Bingley tried to persuade me to dance at the Meryton assembly. I was in no humor for it. The local society fell short of my expectations. I declined his suggestion regarding one of the Bennet girls.",
  "emotion": "neutral",
  "topics": ["meryton-ball", "bingley", "social-obligation"],
  "importance": 0.4,
  "phase": "chapter_3"
}
```

Note: Different importance, different emotional framing, different level of detail.

---

## Phase 4: Entity Creation + Memory Injection

For each selected character:

### 4a. Create Entity

Generate unique ID: `{name-lowercase-dashes}-{timestamp}` (e.g., `elizabeth-bennet-1711270452000`)

```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/create", "method": "POST", "body": {"entityId": "{id}", "name": "{Full Name}", "gender": "{gender}", "traits": ["{trait1}", "{trait2}", "{trait3}"], "introduction": "{A brief in-character greeting based on the book}"}}]
```

Save the returned `entityId`.

### 4b. Inject Memories Chronologically

For each memory (in chunk order = chronological order):

```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{entityId}/memories/inject", "method": "POST", "body": {"content": "{memory content}", "type": "episodic", "emotion": "{emotion}", "topics": ["{topics}"], "importance": {importance}, "narrative": "{narrative}", "phase": "{phase}"}}]
```

### 4c. Cognitive Ticks Between Chapters

After injecting a chapter's worth of memories (every ~5-10 memories), trigger cognitive processing:

```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{entityId}/cognitive/tick", "method": "POST", "body": {}}]
```

Then read evolved state:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{entityId}/cognitive/state", "method": "GET"}]
```

Use the evolved state to inform the emotional tone and perspective of the next batch of memories. If cortisol is high after traumatic events, subsequent memories should reflect that stress. If oxytocin is high after bonding moments, subsequent memories should carry warmth.

### 4d. Relationship Memories

After all individual memories are injected for a character, add one semantic memory per significant relationship:

```json
{
  "content": "First-person reflection on their relationship with {other character}. What they think of them, how they feel, key moments that defined the relationship.",
  "type": "semantic",
  "emotion": "{dominant emotion for this relationship}",
  "topics": ["{other-character-name}", "relationship", "{relationship-type}"],
  "importance": 0.7,
  "phase": "relationships"
}
```

---

## Phase 5: Summary Report

After all characters are created and populated, generate a summary:

```
📚 Book-to-Entity Ingestion Complete — "{Book Title}" by {Author}

ENTITIES CREATED:
  ★ {Name} (ID: {entityId}) — {N} memories injected
    Traits: {traits}
    Final mood: {mood from cognitive state}
    Key relationships: {list}

  ★ {Name} (ID: {entityId}) — {N} memories injected
    ...

STATISTICS:
  Total characters extracted: {N}
  Total memories injected: {N}
  Shared scenes processed: {N}
  Cognitive ticks run: {N}

KNOWLEDGE ISOLATION VERIFIED:
  Each character has memories only from scenes they appeared in.
  Shared scenes generated separate POV-isolated memories per character.

These entities are now available in NekoCore OS. You can chat with them individually or create entity-to-entity chat sessions.
```

---

## Memory Writing Guidelines

### DO:
- Write in first person, present tense for immediacy
- Include sensory details (sight, sound, smell, physical sensation)
- Show complex emotions (joyful memory with undertones of loss)
- Reflect the character's personality in how they perceive events
- Vary importance — not everything is dramatic
- Make early memories shape the tone of later ones
- Reference the character's relationships as they understand them
- Use the character's vocabulary level and speech patterns

### DON'T:
- Give a character information from scenes they weren't in
- Write generic "I was happy" memories — be specific
- Make every memory dramatic — quiet moments define character too
- Ignore cognitive state between chapters
- Contradict earlier memories (unless character growth explains the shift)
- Rush through chunks — quality of POV isolation matters more than speed
- Use the same emotional tone for two characters remembering the same event
- Include narrator commentary unless the character is the narrator
