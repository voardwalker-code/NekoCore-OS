---
name: search-archive
description: Search long-term memories that have moved to the archive tier (> 90 days old, low-activity). Returns ranked results by semantic relevance.
trigger: search-archive
---

# Search Archive

This skill enables searching the entity's long-term memory archive — memories older than 90 days that are no longer in the hot working-memory index.

## When to Use

Use this skill when:
- The user asks about something from the distant past
- A relevant topic may be in older memories no longer appearing in recent context
- You want to cross-reference archived knowledge or past experiences
- You recall a memory exists but it's not surfacing in the current context

Do **not** use this for recent memories — those are retrieved automatically.

## Tool Usage

```
[TOOL:search_archive query="your search terms here"]
```

With optional year range filter:
```
[TOOL:search_archive query="pipeline orchestration" yearRange='{"start":"2024-01-01T00:00:00.000Z","end":"2025-01-01T00:00:00.000Z"}' limit="10"]
```

### Parameters

- `query` (required): Natural language search terms describing what you're looking for
- `yearRange` (optional): JSON object with `"start"` and/or `"end"` as ISO date strings to filter by archive date
- `limit` (optional): Number of results to return (default 5, max 20)

## Result Format

Results include:
- `id`: Memory identifier
- `summary`: Extracted text content from the archived memory
- `archivedAt`: When the memory was moved to the archive
- `topics`: Topic keywords associated with the memory
- `type`: Memory type (`episodic`, `doc`, or `semantic_knowledge`)
- `score`: Relevance score (higher = more relevant)

## Behavior Guidelines

- Use concise, topic-focused queries — RAKE extraction handles phrase identification
- If results are returned, synthesize them naturally into your response
- Cite approximate time periods when referencing archived memories
- If no results are found, say so honestly — don't fabricate memories
