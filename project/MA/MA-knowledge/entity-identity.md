# REM System — Entity and Identity Design

Reference doc for MA when building or extending the entity/identity layer.

---

## Entity Creation Modes

### Guided Creation (UI form)
Route: `POST /api/entities/create-guided`. User provides name, traits, backstory, optional Unbreakable Mode.

### Character Ingestion
Route: `POST /api/entities/create-character`. For importing fully-defined characters (large backstory dumps, books).

### Legacy Migration
Entities from Memory Architect v1. Creation mode: `legacy`. Memories and sleep data preserved.

---

## Unbreakable vs Evolving

**Unbreakable Mode** (`unbreakable: true`):
- Backstory stays at top of context
- Traits line permanently authoritative
- Identity lock appended: "You are [Name]. This is who you are without exception."
- For NPCs and fixed characters that must never drift

**Evolving Mode** (default):
- `YOUR STARTING TRAITS` framing — acknowledges growth
- Origin story extracted and repositioned LAST in context
- Traits line stripped from active system instruction
- Origin becomes roots, not a cage

---

## Evolution Philosophy

**Core principle:** entity shaped by experience, not starting description.

LLM context order (evolving mode):
1. Identity foundation (name, behavioral rules)
2. Current emotional state (live persona.json)
3. User profile (active conversation partner)
4. Accumulated memories
5. Origin story (last — deliberately lower anchoring weight)

---

## entity.json — Creation Metadata

Key fields: id, name, gender, personality_traits, emotional_baseline (curiosity/confidence/openness/stability), introduction, memory_count, creation_mode (guided|character|legacy), unbreakable, configProfileRef, voice profile.

**Voice profile:** typingSpeed, rhythm (punctuationPause, sentenceEndPause, burstChance), errors (typo, transpose, missedSpace), fillers, brb. Generated from personality traits at creation time.

---

## persona.json — Live Emotional State

Updated after sleep cycles. Can drift from creation snapshot: mood, emotions, tone, llmPersonality, continuityNotes, dreamSummary, sleepCount. `llmPersonality` blank until evolved beyond auto-generated default.

---

## system-prompt.txt — Identity Foundation

Core behavioral instructions, personality guidelines, origin story. Processed by context-consolidator.js differently based on `unbreakable` flag.

---

## Entity File Structure

```
entities/entity_<id>/
  entity.json       — creation metadata
  persona.json      — live emotional state
  system-prompt.txt — identity foundation
  memories/
    episodic/       — event memories
    semantic/       — knowledge memories
    ltm/            — long-term compressed
  index/            — memory indexes
  beliefs/          — belief graph data
```

---

## Entity Runtime

`entity-runtime.js` manages entity state lifecycle: load, activate, deactivate, state persistence. Entity checkout system prevents concurrent multi-user access to same entity.

---

## Reserved Names

System-identity namespace protection: NekoCore, Neko, Echo, AgentEcho are blocked for entity creation. Security hardening to prevent impersonation.

---

## Best Practices

1. Evolving mode default — only use Unbreakable for intentionally fixed characters
2. Origin story goes LAST in context — lived experience takes precedence
3. Entity state on disk must be atomic (temp + rename) — prevent corruption
4. persona.json updates only from sleep cycle — not from individual turns
5. Voice profile derived from personality traits — don't hardcode
6. Entity checkout prevents concurrent modification — respect the lock
7. Reserved names are security-enforced — never bypass
