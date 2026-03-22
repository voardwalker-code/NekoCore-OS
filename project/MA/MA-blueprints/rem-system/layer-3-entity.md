# Layer 3 — Entity Identity

## Pre-Requisite
- Layer 2 tests pass: `node tests/test-runner.js 2`

## Scope
Fill in all NOT_IMPLEMENTED stubs in:
1. `server/entity/entity-state.js` — Entity CRUD + lifecycle
2. `server/entity/context-builder.js` — LLM context assembly

## Instructions Per Module

### entity-state.js — `createEntityState(entitiesDir)`
- **createEntity(opts)**:
  1. Validate name not in RESERVED_NAMES (case-insensitive)
  2. Generate ID via `entitySchema.generateEntityId(opts.name)`
  3. Create directory: `entitiesDir/entity_<name>/`
  4. Write three files:
     - `entity.json`: { id, name, creationMode, created, ... }
     - `persona.json`: { voice, traits, boundaries, origin_story, ... }
     - `system-prompt.txt`: Generated from persona
  5. Validate entity with `entitySchema.validateEntity(entity)`
  6. Return entity object

- **loadEntity(entityId)**:
  1. Read `entity.json` from entity directory
  2. Read `persona.json`
  3. Read `system-prompt.txt`
  4. Return combined { entity, persona, systemPrompt }

- **updatePersona(entityId, patch)**:
  1. Load current persona
  2. Deep merge patch (don't overwrite arrays, merge them)
  3. Atomic write back
  4. Regenerate system-prompt.txt if voice or traits changed
  5. Return updated persona

- **listEntities()**:
  1. readdir entitiesDir
  2. Filter directories starting with `entity_`
  3. For each: read entity.json, return summary { id, name, creationMode }

- **getEntityDir(entityId)**:
  1. Return `path.join(entitiesDir, entityId)`
  2. Verify directory exists (throw if not)

### context-builder.js — `buildContext(entityId, subconsciousOutput, dreamIntuitionOutput)`
- **Evolution Over Origin Philosophy**:
  - For `evolving` entities: origin story goes LAST in context, current state goes FIRST
  - For `unbreakable` entities: persona is identity-locked, verbatim system prompt

- **buildContext(entityId, subconsciousOutput, dreamIntuitionOutput, deps)**:
  1. `deps.entityState.loadEntity(entityId)` → { entity, persona, systemPrompt }
  2. If creationMode === 'unbreakable':
     - Return systemPrompt verbatim (identity-locked)
  3. If creationMode === 'evolving':
     a. Start with current personality traits and voice
     b. Add `[ACTIVATED MEMORIES]` block from subconsciousOutput.activatedMemories
     c. Add `[CONVERSATION RECALL]` from subconsciousOutput.conversationRecall
     d. Add `[RELATIONSHIP CONTEXT]` from subconsciousOutput.relationshipContext
     e. Add `[INTUITIONS]` from dreamIntuitionOutput.associations
     f. Add `[ROOTS]` — origin story reframed as roots (LAST, not first)
     g. Return assembled context string

- **extractOriginStory(persona)**:
  1. Look for persona.origin_story field
  2. If present, return it
  3. If absent, return null

- **frameOriginAsRoots(originStory)**:
  1. Wrap origin in `[ROOTS — where you began, not who you are]` framing
  2. This is the Evolution Over Origin pattern — origin informs but doesn't define

## Done When
```bash
node tests/test-runner.js 3
# All tests pass
```

## After Completion
Update `PROJECT-MANIFEST.json`: layer 3 → "complete", both modules → "implemented"
