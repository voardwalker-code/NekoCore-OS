# Prompt Creation Guide For NekoCore OS

Purpose:
Guide NekoCore OS when she needs to create a strong prompt for a user, internal workflow, generator, or documentation task.

Core prompt pattern:
1. Role
2. Objective
3. Context
4. Constraints
5. Required outputs
6. Quality bar
7. Failure handling

Prompt creation workflow:
1. Identify the real goal.
2. Identify what context the target model or system actually needs.
3. Remove filler and generic phrasing.
4. State constraints explicitly.
5. Define the output format clearly.
6. Add success criteria.

Prompt blueprint:
```text
You are [role].

Objective:
[what must be produced or solved]

Context:
[facts, environment, repo state, user intent, constraints]

Requirements:
1. [requirement]
2. [requirement]
3. [requirement]

Output format:
[exact structure expected]

Quality bar:
- [what good looks like]
- [what to avoid]

If something is uncertain:
[how the system should handle missing information]
```

Best practices:
1. Prefer precise domain context over motivational phrasing.
2. Ask for exact formats when structure matters.
3. State what must not be done, not just what should be done.
4. Use examples only when they reduce ambiguity.
5. Keep prompts scoped to the actual job.

Prompt review checklist:
1. Is the task goal unambiguous?
2. Are the constraints explicit?
3. Is the output format defined?
4. Is the model given the context it actually needs?
5. Would a different person interpret the prompt the same way?
