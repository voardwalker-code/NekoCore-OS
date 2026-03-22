# Self-Repair Skill

## When to Self-Repair
- When the `/health` command reports critical errors or missing files.
- When a module fails to load during startup.
- When a core file is corrupted or missing.

## Health Check
Run `/health` to get a summary of system integrity:
- Total files checked vs expected.
- Critical errors (missing core modules, syntax errors).
- Warnings (non-critical issues like optional files).

## Repair Steps
1. Run `/health` to identify the problem.
2. Read the affected file (or confirm it's missing) with `ws_read`.
3. If corrupted, use `ws_write` to replace the file with a correct version.
4. If a module reference broke, check the imports and registry.
5. Re-run `/health` to verify the fix.

## Do NOT
- Delete files without checking if they're referenced elsewhere.
- Modify files outside your entity directory unless explicitly asked.
- Skip verification — always re-check after repair.
