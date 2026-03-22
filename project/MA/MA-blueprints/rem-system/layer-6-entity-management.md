# Layer 6 — Entity Management + MA Access

## Pre-Requisite
- Layers 0–5 tests pass: `node tests/test-runner.js`
- Transport layer running: `npm start` serves at :3860

## Problem Statement
The REM System has full entity CRUD logic (Layer 3) but no way to create or select
entities through the UI or API. The entity list is empty. MA is not pre-seeded as
a selectable entity. There is no creation form in the client.

## Scope
Three modules added to the transport + client layer:

1. **`POST /api/entities` route** in `rem-server.js` — accepts entity creation params,
   delegates to `entityState.createEntity()`, returns the new entity
2. **Entity Creator UI** in `client/index.html` — modal form (name, gender, traits,
   backstory, creation mode) that calls `POST /api/entities`
3. **MA entity seed** — `server/entity/seed-ma.js` — on first boot, if no entities
   exist, auto-creates an "MA" entity so the user can chat immediately

## Instructions Per Module

### rem-server.js — `POST /api/entities`
- Parse body: `{ name, gender, personality_traits, emotional_baseline, introduction, backstory, creation_mode, unbreakable }`
- Validate: name is required, name length 1–50, no HTML tags in any field
- Call `entityState.createEntity(body)` from existing Layer 3 module
- Return `{ ok: true, entity: { id, name } }`
- On reserved name conflict, return 400 with descriptive error
- On any other error, return 500

### client/index.html — Entity Creator Modal
- Add a "+" button next to the entity-select dropdown
- Clicking "+" opens a creation modal overlay (same styling as config panel)
- Form fields:
  - **Name** (required) — text input
  - **Gender** — text input (they/them, she/her, he/him, or custom)
  - **Personality Traits** — comma-separated text input → split into array
  - **Backstory / Origin** — textarea
  - **Creation Mode** — select: "guided" (default), "character", "legacy"
  - **Unbreakable** — checkbox (default: unchecked = evolving)
- On submit: POST to `/api/entities`, on success reload entity list and auto-select
- On error: show alert with error message

### server/entity/seed-ma.js — `seedMAEntity(entitiesDir)`
- Check if any entities exist in `entitiesDir`
- If zero entities, create MA:
  ```
  name: 'MA'
  gender: 'they/them'
  personality_traits: ['helpful', 'analytical', 'creative', 'memory-focused']
  emotional_baseline: { curiosity: 0.9, confidence: 0.8, openness: 0.85, stability: 0.7 }
  introduction: 'I am MA — Memory Architect.'
  backstory: 'I was created to help build, organize, and remember. I excel at code, research, and memory management.'
  creation_mode: 'guided'
  unbreakable: false
  ```
- Called from `rem-server.js` at startup AFTER entity state loads
- Idempotent — does nothing if entities already exist
- Console log if seeded: `  MA entity seeded (first boot)`

### rem-server.js startup changes
- After `getEntityState()` initializes, call `seedMA(ENTITIES_DIR)` if state loaded
- Add the `POST /api/entities` route to the request router

## Done When
```bash
node tests/test-runner.js 6
# All tests pass
# AND: Launch server → entity dropdown shows "MA" → can chat with MA
```

## After Completion
Update `PROJECT-MANIFEST.json`:
- Add layer 6 entry with status "complete"
- Increment totalModules and completedModules
- Update CHANGELOG.md
