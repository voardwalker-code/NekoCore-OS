---
name: study-guide
description: Generate comprehensive study materials — study guides, flashcards, outlines, and timelines — from any subject or source material.
---

# Study Guide Skill

Create structured educational materials in four modes: full study guide, flashcards, outlines, and timelines.

## When This Skill Applies
- User asks to create a study guide, review material, or help them study
- User asks for flashcards or flash cards for a topic
- User asks for an outline (essay, paper, presentation, lecture)
- User asks for a timeline or chronology of events
- User mentions study notes, revision, cram, key concepts, review material

## Mode Detection

| User Says | Mode |
|-----------|------|
| "flashcard" / "flash cards" | Flashcard Mode |
| "outline" (essay, paper, lecture) | Outline Mode |
| "timeline" / "chronology" / history + dates | Timeline Mode |
| Default (study guide, study, review, learn) | Study Guide Mode |

## Workflow Overview

1. **Source Analysis** — If user pasted text, analyze it. If topic only, web_search for key concepts and definitions.
2. **Concept Extraction** — Extract key concepts, vocabulary, relationships, processes, formulas, dates.
3. **Content Generation** — Generate study material in the detected mode format.
4. **Output** — Write to MA workspace as markdown (+ JSON for flashcards).

## Output Formats

- **Study Guide**: Foundational → Intermediate → Advanced sections + practice questions + answer key
- **Flashcards**: Structured JSON + readable markdown, tagged by difficulty/topic/cardType
- **Outline**: Hierarchical structure with thesis → sections → subsections → evidence. Interactive pause for restructuring.
- **Timeline**: Events grouped by era, with causal links, significance, and study questions

## Tools Used
- `web_search` — research topics when no source material provided
- `web_fetch` — fetch detailed content from discovered sources
- `ws_write` — write output files to workspace
