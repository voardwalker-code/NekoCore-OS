# Memory Tools Skill

## Available Operations
- `memory.store(type, content, meta)` — Store episodic or semantic memory.
- `memory.search(query, opts)` — Search stored memories by relevance.
- `memory.stats()` — Return memory counts and index health.
- `memory.ingest(filePath, meta)` — Ingest a document into memory store.

## When to Store
- After completing a task, store an episodic summary.
- When the user shares preferences or project context, store as semantic memory.
- When you learn something new about the user's workflow, store it.

## When to Search
- Before starting a task, search for relevant prior work.
- When the user references something they told you before, search episodic memory.
- When you need project context, search semantic memory.

## Memory Types
- **episodic**: Timestamped events — conversations, tasks completed, errors encountered.
- **semantic**: Facts and knowledge — user preferences, project details, codebase patterns.
