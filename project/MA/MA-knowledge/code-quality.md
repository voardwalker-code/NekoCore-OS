# Code Quality Standards

Reference doc for MA when writing or reviewing code for the REM System.

---

## Module Size

- Target: <= 300 lines for new modules
- Hard limit: 800 lines before extraction plan required
- Extraction threshold: 1200 lines — must extract before modifying

---

## File Organization

- `server.js` is bootstrap/composition ONLY — no business logic
- Routes in `server/routes/` — never in server.js
- Schemas/validators in `server/contracts/`
- Business logic in `server/services/` or `server/brain/`
- One concern per file — don't mix transport with logic

---

## Async Patterns

- Use `Promise.all` for parallel independent work (e.g., pipeline contributors)
- Never revert async to sync (especially in HTML loaders)
- Post-response work must be async — never block response delivery
- Race patterns for timeout guards (e.g., 35s latency guard)

---

## Error Handling

- Fail fast at boundaries — validate inputs at module entry
- Atomic writes: temp file + rename — prevents partial data
- Transaction semantics for multi-file operations — all-or-nothing
- Graceful degradation: fallback paths when optional systems fail

---

## Memory Safety

- Always read `semantic.txt` for memory content — never `log.json`
- Normalize to schema v1 before persisting
- Index updates synchronous with writes — no eventual consistency
- Filter corrupted entries (boilerplate markers, doc_* in retrieval)

---

## Naming Conventions

- Files: kebab-case (e.g., `memory-storage.js`, `dream-intuition-adapter.js`)
- CSS classes: single namespace `sys-inline-XXXX` — no alternatives
- App IDs: lowercase kebab or alnum (e.g., `helloworld`, `note-pad`)
- Entity IDs: `entity_<name>` pattern
- Memory IDs: `mem_<timestamp>_<random>` pattern

---

## Testing Discipline

- Guard tests before extraction or changes (slice -0)
- Health scan after every modification session
- Dedup-styles and orphan-audit scripts are idempotent — run freely

---

## Boundary Rules (Non-Negotiable)

- `client/**` — no backend logic, no filesystem, no server policy
- `server/**` — no DOM, no UI rendering
- Contracts enforce shapes at boundaries — internal refactors are free
- Worker entities must return same shape as the phase they override

---

## Commit Hygiene

- Never commit: Documents/, Config/ma-config.json, accounts.json, sessions.json, entities/, memories/, server/entity/, skills/*/workspace/
- These are runtime/local data — gitignored for a reason

---

## Anti-Patterns to Avoid

1. Putting business logic in server.js or route handlers
2. Serializing parallel-safe contributors (1A and 1D)
3. Blocking response delivery on post-turn work
4. Hardcoding system prompts instead of using context-consolidator
5. Storing system context accidentally as memory content
6. Using `display:none` in CSS classes (JS controls this)
7. Adding tab content directly to index.html
8. Creating alternative CSS namespaces
9. Eventual consistency for memory index updates
10. Skip guard tests before refactoring
