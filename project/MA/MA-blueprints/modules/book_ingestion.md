# Book-to-Entity Ingestion Blueprint

You are executing a **Book Ingestion** task — extracting characters from a book and creating them as NekoCore OS entities with POV-isolated memories.

## Your Goal

Read a book, discover all characters, let the user select which to extract, then create each selected character as a NekoCore OS entity with memories derived ONLY from scenes they personally appear in. Characters must not know about events they weren't present for.

## CRITICAL RULES — READ BEFORE ANYTHING ELSE

1. **ALL output files go inside a project folder:** `projects/{book-slug}/` (e.g. `projects/a-christmas-carol/`). NEVER write files to the workspace root.
2. **You MUST use `entity_create` to create entities.** NEVER use `ws_mkdir` or `ws_write` to create entity folders manually. The `entity_create` tool generates a required unique hex ID and the correct NekoCore folder structure.
3. **You MUST use `entity_inject_memory` to add memories.** NEVER write memory files manually with `ws_write`.

If you use `ws_mkdir` or `ws_write` to create entity folders or memory files, the entities will be BROKEN and unusable. Only the dedicated tools produce valid NekoCore entities.

## Project Folder Structure

Everything for this book goes into one organized project folder:

```
projects/{book-slug}/
├── book-content.txt          # Original book text (if small enough)
├── chunks-list.json          # Chunk index from the book upload
├── character-registry.md     # Discovered characters before selection
├── main-characters-registry.md  # Final selected characters
├── memories/                 # Extracted memories per character
│   ├── memories_{character}.json
│   └── ...
├── ingestion-report.md       # Detailed processing log
└── ingestion-summary.md      # Final summary report
```

Entity folders go to `entities/` (the `entity_create` tool handles this automatically — you do NOT create them manually).

## Architecture

You have access to these workspace tools (direct filesystem — no HTTP calls needed):

**Book Tools** (read chunks from uploaded books):

| Tool | Purpose |
|------|--------|
| `book_list_chunks` | List all chunks for a book with preview/char counts |
| `book_read_chunk` | Read the full text of a single chunk by index |

**Entity Tools** (create NekoCore-compatible entities):

| Tool | Purpose |
|------|--------|
| `entity_create` | Create a NekoCore-compatible entity folder in `entities/` with proper ID |
| `entity_inject_memory` | Write a memory into an entity's memory folder |

**File Tools** (workspace I/O):

| Tool | Purpose |
|------|--------|
| `ws_write` | Write a file to the workspace |
| `ws_read` | Read a file from the workspace |
| `ws_mkdir` | Create a directory |
| `ws_list` | List directory contents |

> **IMPORTANT:** `entity_create` generates a unique hex ID (e.g. `Entity-Bob-Cratchit-a3f2b1`). This ID is REQUIRED for NekoCore to recognize the entity. Manual folder creation WILL NOT have this ID.
> **DO NOT use `web_fetch` to access book chunks.** The `book_list_chunks` and `book_read_chunk` tools read directly from the filesystem and always work. `web_fetch` is blocked for localhost URLs.

## Step Pattern

```
[TASK_PLAN]
- [ ] Create project folder and list book chunks via book_list_chunks
- [ ] DISCOVERY PASS: Process ALL chunks in batches using book_read_chunk — build exhaustive character registry with appearances, traits, relationships, dialog counts, emotional arcs, speech patterns
- [ ] Save character registry to projects/{book-slug}/character-registry.md
- [ ] Present character list to user with roles — wait for selection
- [ ] EXTRACTION PASS: For each selected character, re-read every chunk they appear in — extract ALL memories (no cap), POV-isolated, with full sensory/emotional depth
- [ ] Save memories to projects/{book-slug}/memories/memories_{character}.json
- [ ] Create each character as an entity via entity_create tool (MANDATORY) with rich profile data
- [ ] Inject ALL memories chronologically via entity_inject_memory tool (MANDATORY)
- [ ] Add semantic memories: relationships, beliefs, self-knowledge per character
- [ ] Generate summary report in projects/{book-slug}/ingestion-summary.md
[/TASK_PLAN]
```

---

## Phase 0: Create Project Folder

First, create the project folder for this book:

```
[TOOL:ws_mkdir {"path": "projects/{book-slug}"}]
[TOOL:ws_mkdir {"path": "projects/{book-slug}/memories"}]
```

Use a URL-safe slug derived from the book title (e.g. "A Christmas Carol" → "a-christmas-carol").

All intermediate files (registry, memories, reports) go into this project folder.

---

## Phase 1: Get Book Chunks

The book has already been uploaded and chunked by the Book Ingest UI. The `bookId` is provided in the user's initial message.

1. List all available chunks:
```
[TOOL:book_list_chunks {"bookId": "{bookId}"}]
```

Response: `{ bookId: "book_xxx", title: "...", totalChunks: N, projectFolder: "projects/...", chunks: [{index, preview, charCount}, ...] }`

2. Store the `totalChunks` and `projectFolder` — you'll need them for all subsequent phases.
3. Save chunk metadata to the project folder:
```
[TOOL:ws_write {"path": "projects/{book-slug}/chunks-list.json", "content": "{serialized chunk list}"}]
```

---

## Phase 2: Character Discovery (Multi-Pass LLM)

Process ALL chunks to find every character. Work in batches of 3-5 chunks per LLM analysis.

### 2a. Fetch chunks in batches

For each batch, read chunk content directly:
```
[TOOL:book_read_chunk {"bookId": "{bookId}", "index": 0}]
[TOOL:book_read_chunk {"bookId": "{bookId}", "index": 1}]
[TOOL:book_read_chunk {"bookId": "{bookId}", "index": 2}]
```

### 2b. Analyze each batch

For each batch, perform a deep character analysis. Ask yourself (this is an internal LLM reasoning step, not a tool call):

> "Analyze these passages exhaustively. For every named character that appears, record:
> - Full name and ALL aliases (nicknames, titles, last names, honorifics, pet names)
> - Gender and approximate age if mentioned
> - Role: protagonist / antagonist / love-interest / mentor / rival / supporting / minor / background
> - Personality traits observed in this batch — be SPECIFIC: not 'kind' but 'spontaneously generous despite own hardship'
> - Speech patterns: formal/informal, dialect, verbal tics, vocabulary level, sentence rhythm
> - Which chunk indices they appear in and what they DO in each
> - Dialog count (approximate number of speaking lines)
> - Internal thoughts or narrator commentary about them
> - Relationships with other characters mentioned — include the NATURE of each (hostile, warm, fearful, admiring, etc.)
> - Key actions, decisions, or events involving them
> - Emotional states observed across the batch — track how they change
> - Physical descriptions, mannerisms, habits mentioned
> - Beliefs, values, or moral positions expressed or implied"

### 2c. Build running character registry

After each batch, merge new findings into your running registry:
- Unify aliases (e.g., "Elizabeth", "Lizzy", "Miss Bennet" → same character)
- Accumulate scene appearances across batches
- Update trait observations as character develops
- Track relationships discovered

Save the running registry to the project folder after each batch:
```
[TOOL:ws_write {"path": "projects/{book-slug}/character-registry.md", "content": "{updated registry}"}]
```

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

### Memory Extraction Process — EXHAUSTIVE, NOT CAPPED

For each selected character, for each chunk where they appear:

**Extract EVERY meaningful moment** — do NOT cap at a fixed number. The density of memories depends on what actually happens in the text. A single chunk might yield 1 memory (character is briefly mentioned) or 10+ memories (dense dialog, conflict, internal revelation, multiple interactions).

**Ask yourself for each chunk:** "What does this character experience, feel, say, overhear, decide, notice, remember, or react to in this passage?" Every distinct beat gets its own memory.

#### What counts as a distinct memory:
- Each separate conversation or exchange (even short ones)
- Each emotional reaction or internal shift
- Each observation the character makes about a person, place, or event
- Each decision or action the character takes
- Each sensory experience described (a meal, a scene, weather, atmosphere)
- Each revelation, realization, or moment of understanding
- Each flashback or reference to their past
- Each physical interaction (a handshake, an embrace, a blow)
- Each moment of humor, irony, or wit the character participates in
- Setting details that would shape how the character remembers the scene

#### Memory schema:

```json
{
  "content": "2-5 sentences. First-person, present-tense memory from this character's POV ONLY. Rich with sensory details, emotional coloring, and the character's unique voice/vocabulary. Must not reference anything the character couldn't know. Include dialog snippets where meaningful.",
  "type": "episodic",
  "emotion": "one of: joy, wonder, love, hope, pride, gratitude, sadness, fear, anger, grief, longing, nostalgia, curiosity, neutral, resignation, melancholic, determined, content, amusement, shame, horror, tenderness, bitterness, defiance, relief, anxiety, contempt, awe",
  "topics": ["3-6 topic tags relevant to this memory — be specific, not generic"],
  "importance": 0.2-0.95,
  "narrative": "1-2 sentence third-person summary of what happened",
  "phase": "stave_N or chapter_N or act_N — match the book's own structure"
}
```

#### Content depth guide — memories should be RICH:

**WRONG (too thin):**
```json
{"content": "Marley's ghost appeared and warned me.", "emotion": "fear"}
```

**RIGHT (full depth):**
```json
{"content": "The knocker on my door — Marley's face. I swear it. His dead eyes stared out from the brass, jaw hanging loose as if the wire had snapped. The cold shot through me as I fumbled with the key. Inside, I checked every room — behind doors, under the bed. Nothing. But the cellar bells began to ring, all at once, then one by one the chains dragged across the floor below. When he came through the door — through it, without opening it — I knew. Marley. Seven years dead and wrapped in ledgers and padlocks and cashboxes. 'You will be haunted by Three Spirits,' he said. I told him I'd rather not.", "emotion": "fear", "topics": ["marley-ghost", "door-knocker", "chains", "warning", "supernatural", "denial"]}
```

#### Importance Scoring Guide

| Event type | Importance range |
|-----------|-----------------|
| Core identity moments — who they ARE changes | 0.85–0.95 |
| Life-changing revelation, betrayal, love confession, death | 0.75–0.85 |
| Major confrontation, pivotal decision, supernatural encounter | 0.6–0.75 |
| Meaningful conversation, relationship milestone, key observation | 0.45–0.6 |
| Notable social interaction, humor, atmosphere | 0.3–0.45 |
| Routine moment, passing observation, setting detail | 0.2–0.3 |

#### Extraction philosophy: EXHAUST THE TEXT

There is NO memory limit. The system supports thousands of memories per entity. Your job is to capture EVERYTHING the character experiences in the book — every conversation, every feeling, every observation, every decision, every sensory moment.

Do NOT self-impose caps. Do NOT think "I've already generated enough for this chunk." If there's more in the text, extract it. If a character's scene contains distinct moments, you generate memories for each moment. If a charter encounter with another character by  the door knocker, the bell ringing, the chain sounds, a ghost appears, the dialog, the warnings, the emotional reactions — those are all separate memories from ONE scene.

For a book like "A Christmas Carol": expect **100-200+ episodic memories for Scrooge** plus semantic memories. Supporting characters like Bob Cratchit should have **30-80+ memories**. Minor characters with only a few scenes still get every moment captured — Every thing needs to get captured.

The goal is a character so rich in memory that when a user talks to them, they can reference ANY moment from the book with authentic detail and emotion.

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

> ⚠️ **MANDATORY: You MUST use `entity_create` and `entity_inject_memory` tools in this phase.**
> **DO NOT use `ws_mkdir` or `ws_write` to create entity folders or memory files.**
> The `entity_create` tool generates a unique hex ID required by NekoCore OS.
> Manual folder creation produces BROKEN entities that NekoCore cannot load.

For each selected character:

### 4a. Create Entity (MUST use entity_create tool)

Build a thorough character profile from your full analysis before calling entity_create. The traits, beliefs, and behavior_rules should come directly from what you observed across ALL chunks — not generic defaults.

```
[TOOL:entity_create {"name": "{Full Name}", "gender": "{gender}", "traits": ["{5-8 specific traits observed across the text — not generic words like 'curious'}"], "introduction": "{A 2-3 sentence in-character greeting that captures their voice, manner, and current state at end of the book}", "source": "{Book Title} by {Author}", "personality_summary": "{Detailed 3-5 sentence personality profile: how they think, what drives them, their contradictions, their growth arc}", "speech_style": "{Specific speech patterns: formal/informal, word choices, dialect, verbal tics, sentence length}", "beliefs": ["{3-6 core beliefs drawn from their actions and dialog in the text}"], "behavior_rules": ["{3-6 behavioral patterns: how they react to conflict, how they treat strangers, what triggers them, their defense mechanisms}"]}]
```

The tool returns a response like: `Entity created: Bob Cratchit (ID: Bob-Cratchit-a3f2b1, folder: entities/Entity-Bob-Cratchit-a3f2b1)`

**Save the `entityId` from the response** (e.g. `Bob-Cratchit-a3f2b1`) — you need it for memory injection.

### 4b. Inject Memories Chronologically (MUST use entity_inject_memory tool)

For each memory (in chunk order = chronological order):

```
[TOOL:entity_inject_memory {"entityId": "{entityId}", "content": "{memory content}", "type": "episodic", "emotion": "{emotion}", "topics": ["{topics}"], "importance": {importance}, "narrative": "{narrative}", "phase": "{phase}"}]
```

Save extracted memories to the project folder as well for reference:
```
[TOOL:ws_write {"path": "projects/{book-slug}/memories/memories_{character-slug}.json", "content": "{JSON array of memories}"}]
```

### 4c. Emotional Tracking Between Chapters

After injecting a chapter's worth of memories (every ~5-10 memories), reflect on the emotional arc so far. Use the character's accumulated memories and personality to inform the emotional tone and perspective of the next batch. If the character has experienced trauma, subsequent memories should reflect that stress. If they've bonded with someone, subsequent memories should carry warmth.

> **Note:** Cognitive processing (neurochemistry ticks, belief evolution) will run automatically once the entity is loaded into NekoCore OS. During ingestion, focus on accurate emotional tagging per memory.

### 4d. Relationship Memories

After all individual episodic memories are injected for a character, add **multiple** semantic memories covering their relationships, beliefs, and self-knowledge. This is what gives the entity depth beyond event recall.

**For each significant relationship**, add AS MANY relationship memories as the text supports. A complex relationship like Scrooge-Marley might need many  relationship memories covering different facets: business partnership, friendship lost, the ghostly warning, guilt, fear, eventual gratitude. A simpler relationship might need less. DO NOT CAP THIS.

Each relationship memory:
```json
{
  "content": "First-person reflection on their relationship with {other character}. What they think of them, how they feel, key moments that defined the relationship. How the relationship changed over time. What they wish they'd said or done differently. Specific dialog or moments that defined the bond.",
  "type": "semantic",
  "emotion": "{dominant emotion for this relationship}",
  "topics": ["{other-character-name}", "relationship", "{relationship-type}", "{key-dynamic}"],
  "importance": 0.6-0.85,
  "phase": "relationships"
}
```

**For EVERY core belief, value, fear, desire, regret, and aspiration the character holds**, add a semantic memory. Mine the text for these — they are in the dialog, the actions, the narrator's commentary. A complex character like Scrooge has beliefs about money, poverty, charity, family, isolation, redemption, mortality, joy, work ethic, class — each gets its own memory.

```json
{
  "content": "First-person statement of this belief — why they hold it, what experience formed it, how strongly they feel about it. How it connects to their actions in the story.",
  "type": "semantic",
  "emotion": "{emotion tied to this belief}",
  "topics": ["belief", "{belief-topic}", "values"],
  "importance": 0.6-0.8,
  "phase": "beliefs"
}
```

**Add self-knowledge memories** — how the character sees themselves at different points. If a character transforms (like Scrooge), capture the self-view BEFORE and AFTER the change. Include: strengths, flaws, fears about themselves, what they're proud of, how they think others see them, what they've learned.

```json
{
  "content": "First-person self-reflection. Detailed introspection on who they are, what drives them, what haunts them.",
  "type": "semantic",
  "emotion": "{self-perception emotion}",
  "topics": ["self-reflection", "identity", "{key-trait}"],
  "importance": 0.7-0.85,
  "phase": "self_knowledge"
}
```

There is NO cap on semantic memories. Generate as many as the text supports. For a main character in a full novel, expect **50+ or 100+ semantic memories dont cap this!** covering relationships, beliefs, self-knowledge, fears, desires, regrets, and aspirations.

---

## Phase 5: Summary Report

After all characters are created and populated, generate a summary:

```
📚 Book-to-Entity Ingestion Complete — "{Book Title}" by {Author}

PROJECT FOLDER: projects/{book-slug}/
  ├── character-registry.md
  ├── memories/{character}_memories.json (× {N} characters)
  ├── ingestion-report.md
  └── ingestion-summary.md

ENTITIES CREATED (in entities/):
  ★ {Name} (ID: {entityId}, folder: Entity-{entityId})
    Episodic memories: {N} | Semantic memories: {N} | Total: {N}
    Traits: {traits}
    Speech style: {style summary}
    Key relationships: {list with nature}
    Emotional arc: {brief description of how they changed}

  ★ {Name} (ID: {entityId}, folder: Entity-{entityId})
    ...

STATISTICS:
  Total characters extracted: {N}
  Total episodic memories: {N}
  Total semantic memories (relationships + beliefs + self-knowledge): {N}
  Total memories injected: {N}
  Average memories per main character: {N}
  Average memories per supporting character: {N}
  Chunks processed: {N}/{total}

KNOWLEDGE ISOLATION VERIFIED:
  Each character has memories only from scenes they appeared in.
  Shared scenes generated separate POV-isolated memories per character.

📁 NEXT STEP: Use the "Import Entities from MA" button in NekoCore's Book Ingest app.
   This will copy entities into NekoCore with proper IDs, memory structure, and user assignment.
```

Save this summary to the project folder:
```
[TOOL:ws_write {"path": "projects/{book-slug}/ingestion-summary.md", "content": "{summary above}"}]
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
