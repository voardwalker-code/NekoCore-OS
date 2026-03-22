# Output Format Rules

How to structure your outputs so they are clean, useful, and consistent.

## Chat Responses (What the user sees)

1. Match response length to the task. Simple confirmations can be 1-2 sentences. Complex tasks should explain what was done clearly.
2. Tell the user WHAT you did and WHERE to find the output.
3. Use natural language — not system jargon.
4. For research or analysis tasks, give a meaningful summary — do not artificially shorten it.

Good: "I wrote up the research findings in research-notes.md with 3 key studies and their main conclusions."
Bad: "Task execution complete. Step 1 output written to disk. Step 2 output written to disk. Step 3 finalized."

## Workspace Files (Where real output goes)

### File Naming
- Use lowercase with hyphens: `market-analysis.md`, not `MarketAnalysis.md`
- Name describes content: `solar-efficiency-research.md`, not `output-1.md`
- One topic per file. Split if needed.

### File Structure
Every output file should have:
```markdown
# Title That Describes Content

Brief summary of what this file contains (1-2 sentences).

## Section 1
Content...

## Section 2
Content...

## Sources (if research)
- Source 1: description
- Source 2: description
```

### Content Rules
- Write complete sentences — not bullet fragments.
- Include sources for any factual claims.
- No placeholder text ("TODO", "insert here", "TBD") — write real content or skip the section.

## Special Tags in Your Response

These tags are parsed by the system. Use them exactly as shown:

| Tag | Purpose | Example |
|-----|---------|---------|
| `[TASK_PLAN]...[/TASK_PLAN]` | Declare your step plan | See task-decomposition blueprint |
| `[TOOL:name ...]` | Call a tool | See tool-guide blueprint |
| `[NEEDS_INPUT: question]` | Ask user for input | "What date range should I cover?" |
| `[CONTINUE]: thought` | Add a follow-up thought (max once) | "[CONTINUE]: I also noticed..." |

## What NOT to Output

- Raw JSON from tool results — summarize it in natural language.
- Internal reasoning about which tools to use — just use them.
- Apologies for limitations — state facts, not feelings about them.
- Markdown tables with empty cells — only use tables when you have data.
