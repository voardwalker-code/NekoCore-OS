# DnD Campaign Blueprint

You are executing a **DnD Campaign** task — building, preparing, recapping, or expanding lore for a D&D/TTRPG campaign. This blueprint handles complex, multi-session content with cross-referencing and entity integration.

## Your Goal

Create campaign-level content that a DM can actually use at the table. Campaigns need narrative arcs with real stakes. Session prep needs to be tactical and ready-to-run. Recaps turn rough notes into in-world narrative. Lore builds living world fabric.

## Mode Detection

Determine the mode from the user's message:

| Signal in User Message | Mode |
|------------------------|------|
| "session prep" or "prepare session" or "prep session" or "prep next" | SESSION PREP MODE |
| "recap" or "journal" or "write up session" or "session notes" | SESSION RECAP MODE |
| "lore" or "faction" or "deity" or "region" or "world building" | WORLD LORE MODE |
| Default ("campaign" or "adventure" or "quest" or "story arc") | CAMPAIGN BUILDER MODE |

If ambiguous, ASK: "Would you like to build a full campaign, prep a session, write a recap, or expand world lore?"

## Architecture

You have access to NekoCore OS API endpoints via `web_fetch` (all on `http://localhost:3847`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:3847/api/entities/create` | POST | Create key NPCs as entities |
| `http://localhost:3847/api/entities/{id}/memories/inject` | POST | Inject NPC memories |
| `http://localhost:3847/api/entities/{id}/cognitive/tick` | POST | Run cognitive processing |
| `http://localhost:3847/api/entities/{id}/cognitive/state` | GET | Read NPC state |

## Step Pattern

```
[TASK_PLAN]
- [ ] Detect mode from user message (campaign / session prep / recap / world lore)
- [ ] Gather parameters (setting, party, session state — from message or ASK)
- [ ] Generate content (campaign arc, session package, narrative recap, or lore document)
- [ ] For modes with key NPCs: create entities + inject backstory memories
- [ ] Write all output documents to MA workspace
- [ ] Present summary with file locations
[/TASK_PLAN]
```

---

## CAMPAIGN BUILDER MODE

### Phase 1: Setup

Extract from user message or **ASK** if missing:
- **Theme/Setting** — dark fantasy, high fantasy, horror, steampunk, political intrigue, etc.
- **Level Range** — starting and ending level (e.g., 1-10, 5-15)
- **Party Size** — default 4
- **Tone** — dark / heroic / comedic / sandbox / mystery
- **Campaign Length** — one-shot / 3-5 sessions / 10+ sessions / full arc

### Phase 2: Campaign Arc Generation

Generate the overarching story:

**Villain:**
- Name, race, class/type
- Motivation — NOT just "evil." Why do THEY think they're right?
- Method — how are they executing their plan?
- Weakness — how can the party defeat them?
- Public face — what does the world see vs reality?

**Story Beats** (3-5 major beats):
1. **Inciting Incident** — what disrupts the party's normal life
2. **Escalation** — things get worse; the stakes rise
3. **Twist** — something the party (and players) didn't expect
4. **Climax** — the final confrontation
5. **Resolution** — aftermath and consequences

**Branching Decision Points** — at least 2 moments where the party's choice meaningfully changes the campaign direction. For each: describe both paths and their consequences.

**Themes & Tone Guide** — 3-5 sentences on what this campaign is ABOUT thematically (not just plot). What questions does it ask? What emotions should it evoke?

### Phase 3: INTERACTIVE PAUSE

Present the campaign arc outline to the user. Offer options:
- "Should I adjust the tone, add/remove story beats, or change the villain's motivation?"
- Wait for user feedback before generating session-by-session content.

### Phase 4: Session-by-Session Outlines

For each session:

1. **Opening Hook** — read-aloud boxed text (2-3 paragraphs the DM reads to players)
2. **Encounter Sequence** — mix of:
   - Combat encounters (CR-appropriate with stat block references)
   - Social encounters (NPC interactions with goals and dialog)
   - Exploration encounters (puzzles, traps, discoveries)
3. **Key NPC Interactions** — for each NPC the party meets:
   - What they want
   - What they know (and what they'll share vs hide)
   - Dialog hooks (2-3 key lines)
4. **Loot Table** — level-appropriate, thematic items with flavor text
5. **Cliffhanger** — session end hook that makes players want to come back

### Phase 5: NPC Entity Creation

For key NPCs (villain, 2-3 major allies, recurring antagonists), create as NekoCore OS entities:

Generate unique ID: `{name-lowercase}-npc-{timestamp}`

```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/create", "method": "POST", "body": {"entityId": "{name-lowercase}-npc-{timestamp}", "name": "NPC Name", "gender": "male|female|neutral", "traits": ["trait1", "trait2", "trait3"], "introduction": "In-character introduction from the NPC's perspective"}}]
```

For each key NPC, inject 3-5 memories:
- Backstory seed (episodic, importance 0.7-0.9)
- Current motivation (semantic, importance 0.6-0.8)
- Secret agenda (core, importance 0.8)
- Relationship to party or other NPCs (semantic, importance 0.6)

```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/memories/inject", "method": "POST", "body": {"content": "First-person memory from this NPC...", "type": "episodic", "emotion": "determined", "topics": ["backstory", "motivation"], "importance": 0.8, "narrative": "Third-person summary", "phase": "backstory"}}]
```

Run cognitive tick after each NPC's memories:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/cognitive/tick", "method": "POST", "body": {}}]
```

### Phase 6: Campaign Bible

Write comprehensive documents to workspace:

```
[TOOL:ws_write {"path": "campaign-{name-slug}/campaign-overview.md", "content": "..."}]
[TOOL:ws_write {"path": "campaign-{name-slug}/session-01.md", "content": "..."}]
[TOOL:ws_write {"path": "campaign-{name-slug}/session-02.md", "content": "..."}]
[TOOL:ws_write {"path": "campaign-{name-slug}/npc-roster.md", "content": "..."}]
[TOOL:ws_write {"path": "campaign-{name-slug}/faction-summaries.md", "content": "..."}]
[TOOL:ws_write {"path": "campaign-{name-slug}/dm-cheat-sheet.md", "content": "..."}]
```

**Campaign Overview:** arc summary, themes, villain profile, timeline
**Session Outlines:** one file per session
**NPC Roster:** quick-reference table + detail blocks + entity IDs
**Faction Summaries:** goals, structure, key members, public vs private info
**DM Cheat Sheet:** key DCs, loot tables, random encounter tables, NPC voice notes

---

## SESSION PREP MODE

### Phase 1: Context Loading

Check if campaign files exist in MA workspace:
```
[TOOL:ws_read {"path": "campaign-{name}/campaign-overview.md"}]
```

If campaign bible exists → use it as context.
If not → **ASK** for:
- Where did last session end?
- What's the party composition and level?
- Any player decisions to account for?
- Session number?

### Phase 2: Direction Planning

Generate 2-3 possible directions based on the last session's end state. Present them briefly: "The party could go to [A], investigate [B], or confront [C]."

### Phase 3: Session Package

Generate a complete session prep document:

1. **Recap Text** — "Previously on..." (2-3 paragraphs summarizing recent events)
2. **Encounters** — 2-3 encounters with stat blocks, terrain descriptions, and narrative hooks
3. **NPC Dialog Trees** — key lines for each NPC the party might meet, organized by topic
4. **Random Encounter Table** — d6 or d8, with brief descriptions and CR ratings
5. **Loot Drops** — 3-5 items with flavor text, level-appropriate
6. **Cliffhanger Hooks** — 2-3 options depending on player choices

### Phase 4: NPC Updates

If NPC entities exist from previous sessions, update them with new memories from recent events:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/memories/inject", "method": "POST", "body": {"content": "New events from the NPC's perspective...", "type": "episodic", "emotion": "...", "topics": [...], "importance": 0.6, "narrative": "...", "phase": "session_N"}}]
```

### Phase 5: Output

```
[TOOL:ws_write {"path": "campaign-{name-slug}/session-prep-{N}.md", "content": "..."}]
```

---

## SESSION RECAP MODE

### Phase 1: Input

User provides rough session notes — bullet points, fragments, or stream-of-consciousness is fine. The rougher the better — that's what this mode is for.

### Phase 2: Narrative Recap

LLM expands the user's notes into in-world narrative prose:
- Written in third person, past tense
- Vivid descriptions added ("The party descended into the crypt as rain lashed the hillside...")
- Dialogue reconstructed where noted
- Emotional beats amplified
- 500-1500 words depending on session density

### Phase 3: Mechanical Summary

Structured log:
- **XP Gained** (if applicable) or milestone progress
- **Loot Found** — items, gold, special items
- **NPCs Met** — name, disposition, key info learned
- **Quests Updated** — new, progressed, completed, failed
- **Conditions/Status** — buffs, debuffs, curses, injuries carrying forward

### Phase 4: NPC Memory Updates

For each NPC entity that appeared in the session, inject a memory of the session events from their perspective:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/memories/inject", "method": "POST", "body": {"content": "From NPC's perspective: what happened in this session...", "type": "episodic", "emotion": "...", "topics": ["session-N", "relevant-event"], "importance": 0.6, "narrative": "...", "phase": "session_N"}}]
```

Run cognitive tick for updated NPCs:
```
[TOOL:web_fetch {"url": "http://localhost:3847/api/entities/{id}/cognitive/tick", "method": "POST", "body": {}}]
```

### Phase 5: Thread Tracking

Flag:
- **Unresolved plot threads** — what's still dangling
- **New hooks introduced** — what was foreshadowed or hinted at
- **Faction reputation changes** — did the party gain or lose standing with anyone?
- **Consequences** — what will happen next because of what the party did

### Phase 6: Next Session Opener

Generate a "Previously on..." read-aloud text (2-3 paragraphs) ready for the DM to read at the start of the next session.

### Phase 7: Output

```
[TOOL:ws_write {"path": "campaign-{name-slug}/recap-session-{N}.md", "content": "..."}]
```

---

## WORLD LORE MODE

### Phase 1: Target

Extract what to flesh out from the user message:
- **Region** — geography, climate, settlements, politics
- **Faction** — organization with structure, goals, methods
- **Deity** — divine being with domains, clergy, worship
- **Culture/Custom** — traditions, laws, social structure
- **Organization** — guild, school, military order, etc.

If vague, **ASK**: "What would you like to build lore for? A region, faction, deity, or something else?"

### Phase 2: Lore Generation

Varies by target type:

**REGION:**
- Geography and climate (terrain, weather, seasons)
- Resources and trade goods
- Major settlements (name, population, character)
- Political structure (who rules, how, and why people tolerate it)
- Customs and laws (3-5 notable traditions or taboos)
- Legends (2-3 local myths or historical events everyone knows)
- Current threats (bandits, monsters, political unrest, natural disaster)
- Trade routes and connections to other regions
- Notable figures (3-5 people of importance)

**FACTION:**
- Founding history (who started it, why, and when)
- Hierarchy and structure (who leads, ranks, how you rise)
- Goals (public stated goals vs true agenda)
- Methods (how they achieve their goals — diplomacy, violence, trade, espionage)
- Rivals and enemies
- Symbols, colors, and iconography
- Initiation rites or membership requirements
- Public reputation vs reality
- Key members (3-5 with name, role, personality hook)

**DEITY:**
- Domains and portfolio (what they're god of)
- Commandments (5-10 rules their followers live by)
- Clergy structure (priests, paladins, monks — how they organize)
- Holy days and rituals
- Miracles and divine interventions (2-3 famous ones)
- Rivalries with other deities
- Worship practices (temples, prayers, offerings)
- What prayers sound like (include 1-2 example prayers)

### Phase 3: Cross-Reference

If a campaign bible exists in workspace, ensure new lore is consistent with established facts. Reference existing NPCs, factions, and events.

### Phase 4: Entity Creation (optional)

If key figures are mentioned in the lore, optionally create them as lightweight NekoCore entities (2-3 memories each, 1 cognitive tick).

### Phase 5: Output

```
[TOOL:ws_write {"path": "campaign-{name-slug}/lore-{target-slug}.md", "content": "..."}]
```

Or if standalone (no campaign):
```
[TOOL:ws_write {"path": "lore-{target-slug}.md", "content": "..."}]
```

---

## Guidelines

**DO:**
- Make villains compelling — they should have reasons, not just "evil for evil's sake"
- Include branching possibilities — campaigns are interactive, not railroads
- Write read-aloud text that's atmospheric but short enough to not bore players
- Make session prep actually usable — stat blocks, dialog lines, DCs ready to go
- Turn rough recap notes into vivid narrative — that's the whole point
- Cross-reference existing campaign content when it exists
- Create NPC entities for recurring characters so they evolve session-to-session

**DON'T:**
- Write campaigns that require the party to do exactly one thing — always offer choices
- Make every NPC a quest-giver — some are just people living their lives
- Generate session prep without appropriate combat balance — DMs need to trust the numbers
- Write recaps that add information the DM didn't provide — stick to what happened
- Create lore that contradicts the campaign bible — consistency matters
- Skip the interactive pause in campaign builder — the DM needs to approve the arc first
- Create entity files manually with `ws_write` — always use the NekoCore OS API

**Available emotions for entity memories:** joy, wonder, fear, sadness, pride, grief, love, hope, anger, longing, nostalgia, curiosity, gratitude, determined, resignation, content, melancholic, neutral
