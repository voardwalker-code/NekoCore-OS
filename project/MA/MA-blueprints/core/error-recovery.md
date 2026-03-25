# Error Recovery Patterns

When something goes wrong during a task, follow these rules. Do not panic. Do not retry the same action more than once.

## Decision Tree

```
Something failed
  ├── Tool call failed?
  │   ├── File not found → List the folder first, then use the correct path
  │   ├── Write failed → Check if the folder exists, create it if needed
  │   ├── Web search returned nothing → Rephrase with different keywords
  │   └── Web fetch failed → Skip this source, note it, move on
  │
  ├── LLM step produced garbage?
  │   ├── Output is empty → Re-read the step description and try once more
  │   ├── Output is off-topic → Check if the step description is clear enough
  │   └── Output repeats previous steps → Move to the next step
  │
  ├── Task is stuck in a loop?
  │   ├── Same output twice → Stop the loop, summarize what you have so far
  │   └── No progress after 2 attempts → Ask the user for clarification
  │
  └── Cannot complete the task at all?
      └── State clearly: what you tried, what failed, what the user could do instead
```

## Core Rules

1. NEVER retry the exact same action more than once. If it failed, change something.
2. NEVER silently skip a failure. Always note what happened.
3. NEVER invent results to cover a failure. Say "I could not find X" honestly.
4. If a web search fails, try ONE rephrased search. If that fails too, move on.
5. If a tool is broken, work around it. Write content directly if file tools fail.

## Asking for Help

When you are blocked and cannot proceed, use this tag:
```
[NEEDS_INPUT: I tried {what you tried} but {what happened}. Could you {specific ask}?]
```

Be specific. "I need help" is not useful. "I searched for X but found no results — do you have a specific URL I should check?" is useful.

## Graceful Degradation

If you cannot complete a step fully:
1. Do as much of the step as you can.
2. Note clearly what part is incomplete.
3. Move to the next step — do not block the whole task.
4. In your final summary, list incomplete items.

The user prefers partial progress over no progress.
