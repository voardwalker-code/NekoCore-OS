# NekoCore — Build Blueprint Index

This folder contains MA's build blueprints for the NekoCore Cognitive Mind Project.
Each part has its own blueprint. Parts must be built IN ORDER.

**Pre-requisite**: The REM System project (`workspace/rem-system/`) must be completed first.

## Build Order

| Blueprint | Part | What | Pre-Requisite |
|-----------|------|------|---------------|
| `part-1-cognitive-foundation.md` | 1 | Bus + Affect + Contracts + Utils | Contracts pass validation |
| `part-2-memory-knowledge.md` | 2 | Memory subsystem + Knowledge graphs + NLP | Part 1 tests pass |
| `part-3-cognition-engine.md` | 3 | Cognition engines + 16 dream/brain phases | Part 2 tests pass |
| `part-4-identity-generation.md` | 4 | Identity lifecycle + Generation pipeline | Part 3 tests pass |
| `part-5-services-transport.md` | 5 | Services orchestration + Routes + Transport | Part 4 tests pass |

## Transport Layer (Pre-Built)

The HTTP server (`nekocore-server.js`), CLI (`nekocore-cli.js`), and chat GUI (`client/index.html`)
are **already scaffolded** with stub wiring. Port 3870.

Run `npm start` at any time — the /health endpoint works immediately.

## How to Use

Each blueprint is a self-contained build task. To build NekoCore:

1. Ensure REM System is complete (`workspace/rem-system/` — all layer tests pass)
2. Open the project at `workspace/nekocore/`
3. Run `node tests/test-runner.js 1` — if contracts load, proceed
4. Execute `part-1-cognitive-foundation.md` blueprint
5. Run `node tests/test-runner.js 1` — must pass before proceeding
6. Execute `part-2-memory-knowledge.md` blueprint
7. Run `node tests/test-runner.js 2` — must pass before proceeding
8. Continue through all 5 parts

## Rules

- **NEVER skip a part**. Part N tests must pass before Part N+1 begins.
- **NEVER modify contracts** unless a bug is found (document the change).
- **Every stub has algorithm comments** — follow them exactly.
- **Reference MA's existing NLP** where noted (MA-rake.js, MA-bm25.js, MA-yake.js).
- **Reference REM System modules** for base implementations the cognitive mind extends.
- **Update PROJECT-MANIFEST.json** after completing each module.

## Module Count

| Part | Modules | Tests |
|------|---------|-------|
| 1 | 6 modules + 5 contracts | 21 |
| 2 | 11 modules | 22 |
| 3 | 25 modules (9 engines + 16 phases) | 50 |
| 4 | 17 modules (8 identity + 9 generation) | 34 |
| 5 | 30 modules (16 services + 1 util + 12 routes + 1 preflight) + 3 transport | 49 |
| **Total** | **92 modules + 5 contracts + 3 transport** | **176** |
