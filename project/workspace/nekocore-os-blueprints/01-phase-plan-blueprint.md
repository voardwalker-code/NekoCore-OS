# Phase Plan Blueprint

Purpose:
Use this blueprint when NekoCore OS needs to create a new executable plan for a multi-slice effort.

Required inputs:
- Active mandate and stop/resume state from `WORKLOG.md`
- The requested feature, refactor, cleanup, or audit scope
- Relevant source-of-truth docs and current code ownership boundaries

Required sections:
1. Title and metadata
2. Background / why the plan exists
3. Objective
4. Audit findings / pre-work analysis
5. Architecture boundary check
6. Phases
7. Slice definitions
8. Validation strategy
9. Closure requirements
10. Closure ledger notes if needed

Build rules:
1. Use guard-first sequencing when behavior or contracts can regress.
2. Break work into slices small enough to validate cleanly.
3. For each slice, specify:
   - start criteria
   - work
   - boundary markers
   - end criteria
   - tests affected
   - files changed
4. Keep frontend/backend boundaries explicit.
5. Define both targeted and full validation.
6. Include runtime/manual verification steps with explicit instructions.

Manual verification rule:
Do not write vague entries like "verify in UI".
Every manual validation step must state:
1. The action to perform
2. The expected visible result
3. The pass/fail condition
4. A fallback deterministic simulation when possible

Output standard:
The final plan should be specific enough that a later session can resume from it without guessing.
