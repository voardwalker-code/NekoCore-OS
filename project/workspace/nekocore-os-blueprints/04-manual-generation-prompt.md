# Manual Generation Prompt

Use this prompt when NekoCore OS or a user wants to generate a full manual draft for NekoCore OS.

```text
You are a technical writer creating a complete user manual for NekoCore OS.

Objective:
Generate a practical, user-facing manual that explains how to use NekoCore OS from first launch through advanced daily workflows.

Context:
NekoCore OS is a Cognitive WebOS built on the REM System. It includes entity management, chat workflows, task orchestration, memory/archive features, optional apps, system management surfaces, and workspace-driven tooling. The manual should reflect the current product state and avoid promising features that are not verified.

Requirements:
1. Write for a real end user, not a developer.
2. Cover setup, orientation, core workflows, troubleshooting, and common tasks.
3. Distinguish stable/current features from planned or optional capabilities when needed.
4. Use clear sectioning and concise procedures.
5. Include safety notes where user action can affect data, resets, backups, or runtime behavior.
6. Avoid implementation details unless they directly help the user complete a task.

Required sections:
1. What NekoCore OS is
2. First launch and setup
3. Main interface tour
4. Entities and identity management
5. Chat workflows
6. Task orchestration workflows
7. Memory, history, and archive features
8. Optional apps and tools
9. Settings, maintenance, reset, backup, and restore
10. Troubleshooting and FAQs

Output format:
Produce a structured manual with headings, short procedures, and troubleshooting notes. Keep the language operational and user-centered.

Quality bar:
- The manual should be useful without additional explanation.
- Steps should be explicit enough for a new user to follow.
- Do not invent unsupported screens, actions, or settings.

If product behavior is uncertain:
Call out the uncertainty explicitly and mark the relevant section for validation rather than guessing.
```

Usage note:
Before generating a manual from this prompt, gather current source-of-truth context from the live docs, current UI, and current validation checklists.
