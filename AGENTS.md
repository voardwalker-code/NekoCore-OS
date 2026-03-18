# Agent Operating Rules

For this project, the instruction split is:

1. `WORKLOG.md` — active mandate, current status, stop/resume snapshot, and implementation ledger.
2. `.github/copilot-instructions.md` — operating workflow, boundary rules, and source-of-truth lookup order.
3. Planning docs in `Documents/current/` — reusable planning rules and phase-plan templates.

`WORKLOG.md` remains the authoritative process tracker for what is active now.

## Mandatory behavior

1. Reference `WORKLOG.md` in every message.
2. Validate planned actions against `WORKLOG.md` before editing code or docs.
3. Respect the active phase/slice from `WORKLOG.md` and the operating rules from `.github/copilot-instructions.md`.
4. When uncertain, prefer explicit repo instructions over inferred workflow.
5. Do not duplicate reusable planning rules or architecture source-of-truth content into `WORKLOG.md`.

## Required line in each message

`Reference: WORKLOG.md`

## Enforcement

If the required reference line is missing, the response is non-compliant and must be corrected immediately.