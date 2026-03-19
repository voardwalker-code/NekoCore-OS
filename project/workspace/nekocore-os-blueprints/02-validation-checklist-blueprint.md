# Validation Checklist Blueprint

Purpose:
Use this blueprint when NekoCore OS needs to create a validation checklist for a feature, phase, reset flow, or user-facing QA pass.

Checklist structure:
1. Metadata
   - date
   - tester
   - branch/commit
   - environment
   - setup/reset command if relevant
2. Purpose
3. Ordered checklist items
4. Sign-off
5. Summary notes
6. Follow-up issues

Each checklist item must include:
1. A checkbox and short label
2. Expected outcome
3. Notes field

If the item is manual/runtime validation, also include:
1. The exact trigger action or prompt to run
2. The UI/API/system result to observe
3. The pass/fail condition
4. A deterministic simulation method if the live path is hard to hit

Checklist writing rules:
1. Put items in execution order.
2. Separate automated verification from manual verification clearly in the notes.
3. If something is only partially validated by tests, say that explicitly.
4. If an item is user-side only, do not mark it complete from backend tests alone.
5. Include the exact regression command when a full suite or targeted suite is required.

Good item example:
- [ ] Task SSE lifecycle in UI
Expected:
- Badge appears during live task execution.
- `needs_input`, `complete`, and `error` states render correctly.
Notes:
- Run one real task prompt.
- Then simulate rare states from DevTools if needed.
- Pass if both the live and simulated states render correctly.
