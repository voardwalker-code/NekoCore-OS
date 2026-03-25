---
name: dnd-campaign
description: Build, run, and manage D&D campaigns with session prep, world lore, and narrative arcs
---

# DnD Campaign Skill

## Triggers

- "build a campaign", "run campaign", "start campaign"
- "session prep", "prepare session", "prep next session"
- "session recap", "write up session", "journal session"
- "world lore", "faction lore", "deity lore", "region lore"
- "campaign arc", "adventure", "quest line", "story arc"

## Mode Detection

| Signal | Mode |
|--------|------|
| "session prep" / "prepare session" / "prep next" | SESSION PREP |
| "recap" / "journal" / "write up session" | SESSION RECAP |
| "lore" / "faction" / "deity" / "region" / "world building" | WORLD LORE |
| Default (campaign / adventure / quest / story arc) | CAMPAIGN BUILDER |

## Workflow

### Campaign Builder
1. Setup — gather theme/setting, level range, party size, tone, length
2. Campaign arc — villain, 3-5 story beats, branching decision points, themes
3. INTERACTIVE PAUSE — present arc, get DM feedback
4. Session-by-session outlines — hooks, encounters, NPC interactions, loot, cliffhangers
5. NPC entity creation — villain + 2-3 key NPCs as NekoCore entities (3-5 memories each)
6. Campaign bible — write all documents to workspace

### Session Prep
1. Load existing campaign files
2. Plan 2-3 possible session directions
3. Generate session package (recap text, encounters, dialog, random table, loot, hooks)
4. Update existing NPC entities with new memories if needed
5. Write session prep document

### Session Recap
1. Accept rough session notes from user
2. Expand into narrative prose (third person, past tense, 500-1500 words)
3. Create mechanical summary (XP, loot, NPCs, quests, conditions)
4. Update NPC entity memories for appearing characters
5. Track unresolved threads, new hooks, faction reputation, consequences
6. Generate next-session opener ("Previously on...")

### World Lore
1. Identify target (region, faction, deity, culture, organization)
2. Generate lore per target type
3. Cross-reference existing campaign bible if available
4. Optionally create key figures as lightweight entities
5. Write lore document

## API Endpoints

- `POST /api/entities/create` — Create NPC entities
- `POST /api/entities/{id}/memories/inject` — Inject NPC memories
- `POST /api/entities/{id}/cognitive/tick` — Process cognitive state
- `GET /api/entities/{id}/cognitive/state` — Read cognitive state

## Tools Used

- `web_fetch` — API calls to NekoCore OS (entity creation, memories, cognitive)
- `web_search` — Reference material lookup (D&D SRD, setting info)
- `ws_write` — Output campaign documents to workspace
- `ws_read` — Load existing campaign context

## Memory Quality Rules

- Backstory/motivation: importance 0.7-0.9, type episodic or core
- Secret agenda: importance 0.8, type core
- Session events: importance 0.5-0.7, type episodic
- Relationship notes: importance 0.5-0.7, type semantic
- Use only the 18 canonical emotions
