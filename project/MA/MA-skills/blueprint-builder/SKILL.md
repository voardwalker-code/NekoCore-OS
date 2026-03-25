---
name: blueprint-builder
description: Create and register new MA task blueprints, task types, and classification rules
---

# Blueprint Builder Skill

## Triggers

- "create a blueprint", "build a blueprint", "make a blueprint"
- "design a blueprint", "write a blueprint", "new blueprint"
- "blueprint for X", "need a blueprint for X"
- "there's no blueprint for X", "missing blueprint"
- "create a task type", "new task type", "add a task type"
- "create a workflow", "build a workflow"
- "teach MA how to do X"

## Workflow

1. **Capability Analysis** — Understand what the user wants MA to be able to do. Extract: task description, inputs needed, outputs produced, whether entity creation / web research / multi-mode is needed. Check existing blueprints for overlap.

2. **Blueprint Design** — Design the structure: modes (if multi-modal), phases per mode, interactive pauses, output format, tool calls needed. Follow mandatory conventions:
   - Header → Goal → Mode Detection → Architecture → Step Pattern → Phases → Guidelines
   - 150-400 lines target
   - Explicit tool call syntax in every phase
   - DO/DON'T guidelines specific to this task type

3. **Write Blueprint** — Write `MA-blueprints/modules/{task_type}.md` with full production-quality blueprint.

4. **Write Skill Files** — Write `MA-skills/{skill-name}/SKILL.md` (YAML frontmatter + triggers + workflow + tools) and `MA-entity/entity_ma/skills/{skill-name}.md` (compact runtime reference, under 80 lines).

5. **Generate Classifier** — Generate the exact TASK_TYPES, COMPLEX_TASK_TYPES, and RULES entries for MA-tasks.js. Write to a registration summary file with verification instructions.

6. **Summary** — Present: files created, registration snippet, test commands, capability description.

## Quality Standards

- Blueprint must be self-contained — executable by an LLM with no external context
- Every phase needs concrete tool call examples
- Keywords designed to avoid collision with existing 17 task types
- Mode detection tables include ASK fallback for ambiguity
- Output always goes to workspace files, not chat

## Tools Used

- `ws_list` — Check existing blueprints for overlap
- `ws_read` — Read existing blueprints for pattern reference
- `ws_write` — Write blueprint, skill, and summary files
