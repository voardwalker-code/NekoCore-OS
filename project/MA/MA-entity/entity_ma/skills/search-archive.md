# Search & Archive Skill

## Project Archives
Completed projects are archived under `archives/` in the entity directory.
Each archive contains a graph of nodes (files) and edges (relationships).

## Searching Archives
- Archives can be ingested into memory for search via the `/ingest` command.
- Use memory search to find relevant prior work before starting new tasks.
- When the user asks "what did we build before?" or "continue that project", search archives first.

## Resuming Projects
- Use `/project open <name>` to resume a previously archived project.
- Read the project's `PROJECT-MANIFEST.json` and `BUILD-ORDER.md` if available.
- The workspace scan injects active project context into the system prompt.

## Creating Archives
- When a project is complete, use `/project close` to archive it.
- The archiver captures the project structure, tests, and manifest into a graph format.
