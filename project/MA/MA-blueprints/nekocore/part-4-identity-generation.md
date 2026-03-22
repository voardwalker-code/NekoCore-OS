# Part 4 — Identity & Generation

**Pre-requisite**: Part 3 tests pass (50/50).

## Scope — Identity (8)

| Module | File | What to Build |
|--------|------|---------------|
| Hatch Entity | `server/identity/hatch-entity.js` | Entity birth ceremony — create identity + defaults |
| Identity Manager | `server/identity/identity-manager.js` | Identity lifecycle — load, evolve, persist |
| Core Memory Manager | `server/identity/core-memory-manager.js` | Protected core memories (never pruned) |
| Goal Generator | `server/identity/goal-generator.js` | Pattern-based goal generation from experience |
| Goals Manager | `server/identity/goals-manager.js` | Active goals tracking + priority + progress |
| Dream Diary | `server/identity/dream-diary.js` | Dream diary recording |
| Life Diary | `server/identity/life-diary.js` | Life diary recording |
| Onboarding | `server/identity/onboarding.js` | New entity onboarding (7-step wizard) |

## Scope — Generation (9)

| Module | File | What to Build |
|--------|------|---------------|
| Aspect Prompts | `server/generation/aspect-prompts.js` | Aspect-specific prompt templates |
| Context Consolidator | `server/generation/context-consolidator.js` | Consolidate all context into prompt-ready package with token budget |
| Humanize Filter | `server/generation/humanize-filter.js` | Remove robotic LLM artifacts, apply voice |
| Core Life Generator | `server/generation/core-life-generator.js` | Entity autobiography from accumulated experience |
| Chapter Generator | `server/generation/chapter-generator.js` | Life chapters with emotional arcs |
| Synthetic Memory Generator | `server/generation/synthetic-memory-generator.js` | Generate initialization memories (tagged synthetic) |
| Diary Prompts | `server/generation/diary-prompts.js` | Templates for diary generation |
| Message Chunker | `server/generation/message-chunker.js` | Intelligent long-message splitting |
| Voice Profile | `server/generation/voice-profile.js` | Voice characteristics (formality, humor, vocabulary) |

## Build Steps

1. Fill identity modules (hatch-entity first — it creates the initial state)
2. Fill generation modules (context-consolidator is the hub — wire it last)
3. Each stub has algorithm comments — follow them

## Done When

```
node tests/test-runner.js 4
→ 34 passed, 0 failed
```
