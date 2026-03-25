---
name: tutor-entity
description: Create living tutor or teaching assistant entities for NekoCore OS with deep subject knowledge, pedagogical strategies, and course-specific awareness.
---

# Tutor Entity Skill

Create tutor or teaching assistant entities that don't just know facts — they know how to teach.

## When This Skill Applies
- User asks to create a tutor, teacher, or teaching assistant
- User says "teach me [subject]" or "I need a teacher for [subject]"
- User wants a TA for a specific course
- User mentions "private tutor", "study helper", "homework help"
- User wants to build a subject-matter tutor entity

## Mode Detection

| User Says | Mode |
|-----------|------|
| "TA" / "teaching assistant" / "course helper" / specific course reference | TA Mode |
| Default ("tutor" / "teacher" / "teach me" / subject name) | Tutor Mode |

## Workflow Overview

1. **Identify subject/course** from user message (ASK if vague)
2. **Design persona** — name, teaching style, personality, expertise background
3. **Create entity** via NekoCore OS API (`POST /api/entities/create`)
4. **Inject subject knowledge** — core concepts, common mistakes, teaching strategies (semantic memories)
5. **Inject pedagogical experience** — teaching moments, philosophy, breakthroughs (episodic memories)
6. **Cognitive evolution** — ticks between memory batches, read evolved state
7. **Report** — entity ID, name, subject, teaching style, ready to chat

## API Endpoints

All on `http://localhost:3847`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/entities/create` | POST | Create tutor/TA entity |
| `/api/entities/{id}/memories/inject` | POST | Inject knowledge and experience |
| `/api/entities/{id}/cognitive/tick` | POST | Process memories |
| `/api/entities/{id}/cognitive/state` | GET | Read evolved personality |

## Memory Types

- **Subject Knowledge** (semantic): Core concepts + how to explain them + common pitfalls
- **Teaching Strategies** (semantic): Approaches for specific topics + alternative explanations
- **Pedagogical Experience** (episodic): Teaching moments, breakthroughs, lessons learned
- **Course Content** (semantic, TA mode): Weekly topics, assignment details, exam prep

## Memory Quality Rules
- First person from the tutor's perspective
- Include HOW they explain concepts, not just WHAT the concepts are
- Vary emotions — teaching involves joy, curiosity, pride, patience
- Importance: 0.7-0.9 for core expertise, 0.5-0.7 for strategies, 0.3-0.5 for anecdotes
