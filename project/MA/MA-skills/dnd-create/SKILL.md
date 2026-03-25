---
name: dnd-create
description: Design D&D encounters, generate NPC rosters with living entities, or create full player characters with backstories and entity integration.
---

# DnD Create Skill

Create D&D/tabletop RPG content in three modes: encounters, NPC factories, or full character builds — all with NekoCore OS entity integration.

## When This Skill Applies
- User asks to design a combat encounter, battle, or fight scenario
- User asks to populate a location with NPCs (tavern, guild, court, etc.)
- User asks to roll, create, or build a D&D character or character sheet
- User mentions DnD, D&D, 5e, Pathfinder, TTRPG, stat block, or monster
- User asks for NPC generation or an NPC factory

## Mode Detection

| User Says | Mode |
|-----------|------|
| "encounter" / "combat" / "battle" / "fight" / "CR" | Encounter Mode |
| "NPC" / "tavern" / "populate" / "shopkeeper" | NPC Factory Mode |
| "character" / "roll" / "character sheet" / "PC" | Character Mode |

## Workflow Overview

1. **Detect mode** from user message
2. **Gather parameters** — party level, setting, concept (from message or ask)
3. **Generate content** — stat blocks (encounter), NPC profiles (factory), or character build (character)
4. **Entity creation** (NPC + Character modes) — create NekoCore OS entities via API, inject memories, run cognitive ticks
5. **Output** — write document to MA workspace

## API Endpoints (NPC + Character Modes)

All on `http://localhost:3847`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/entities/create` | POST | Create entity |
| `/api/entities/{id}/memories/inject` | POST | Inject memory |
| `/api/entities/{id}/cognitive/tick` | POST | Cognitive processing cycle |
| `/api/entities/{id}/cognitive/state` | GET | Read evolved state |

## Entity Creation Pattern

- **NPCs**: Lightweight — 2-3 core memories each (backstory, motivation, secret), 1 cognitive tick
- **Characters**: Full depth — 3-5 chapter backstory, cognitive tick between chapters, iterative evolution

## Memory Quality Rules
- First person, present tense for immediacy
- Include sensory details
- Vary emotions — not everything is dramatic
- Use `importance` 0.7-0.9 for formative, 0.3-0.5 for everyday
- Never create entity files manually — always use the API
