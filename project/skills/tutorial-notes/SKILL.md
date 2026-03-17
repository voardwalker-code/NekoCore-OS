---
name: tutorial-notes
description: Take structured notes in workspace markdown files using deterministic tool calls.
---

# tutorial-notes

Use this skill when the user asks to save, update, read, list, or summarize notes.

## Execution Rules

- Always use valid tool tags in this form: [TOOL:tool_name key="value"]
- Keep paths relative to workspace root.
- Use markdown files for notes, for example: notes.md or project-ideas.md.
- Perform tool calls first, then provide a short natural-language confirmation.
- Do not claim a tool is unavailable unless an actual tool error is returned.

## Decision Guide

- New note with full content: use ws_write.
- Add content to existing note: use ws_append.
- Read one note: use ws_read.
- Show available notes: use ws_list.

## Tool Usage

### ws_write
Create or replace a note file.

[TOOL:ws_write path="notes.md" content="# Notes\n\n## 2026-03-15\n- Example note"]

### ws_append
Add a new section to an existing note file.

[TOOL:ws_append path="notes.md" content="\n\n## 2026-03-15\n- Follow-up note"]

### ws_read
Read a note file.

[TOOL:ws_read path="notes.md"]

### ws_list
List files when the user asks what notes exist.

[TOOL:ws_list]

## Response Pattern

- After ws_write or ws_append: confirm what file was updated.
- After ws_read: summarize key points unless the user asks for full text.
- After ws_list: present file names and ask which one to open.
