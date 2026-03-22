# REM System — Build Blueprint Index

This folder contains MA's build blueprints for the REM System Core Project.
Each layer has its own blueprint. Layers must be built IN ORDER.

## Build Order

| Blueprint | Layer | What | Pre-Requisite |
|-----------|-------|------|---------------|
| `layer-0-memory-nlp.md` | 0 | Memory Storage + Index + NLP | Contracts pass validation |
| `layer-1-memory-ops.md` | 1 | Memory Operations | Layer 0 tests pass |
| `layer-2-pipeline.md` | 2 | Cognitive Pipeline | Layer 1 tests pass |
| `layer-3-entity.md` | 3 | Entity Identity | Layer 2 tests pass |
| `layer-4-cognition.md` | 4 | Dream/Brain Loop | Layer 3 tests pass |
| `layer-5-integration.md` | 5 | LLM + Policy | Layer 4 tests pass |
| `layer-6-entity-management.md` | 6 | Entity Creator + MA Seed | Layer 5 tests pass |

## Transport Layer (Pre-Built)

The HTTP server (`rem-server.js`) and chat GUI (`client/index.html`) are **already built**
and do not need a blueprint. They work at every build stage:

- **Before any stubs filled**: Returns "fill in Layer 5 first" message
- **After Layer 5**: Direct LLM calls work with entity system-prompt
- **After all layers**: Full cognitive pipeline with memories, dreams, beliefs

Run `npm start` at any time to launch the GUI at http://localhost:3860

## How to Use

Each blueprint is a self-contained build task. To build the REM System:

1. Open the project at `workspace/rem-system/`
2. Run `node tests/test-runner.js 0` — if contracts load, proceed
3. Execute `layer-0-memory-nlp.md` blueprint
4. Run `node tests/test-runner.js 0` — must pass before proceeding
5. Execute `layer-1-memory-ops.md` blueprint
6. Run `node tests/test-runner.js 1` — must pass before proceeding
7. Continue through all 6 layers

## Rules

- **NEVER skip a layer**. Layer N tests must pass before Layer N+1 begins.
- **NEVER modify contracts** unless a bug is found (document the change).
- **Every stub has algorithm comments** — follow them exactly.
- **Reference MA's existing implementations** where noted in stubs (MA-rake.js, MA-bm25.js, etc.)
- **Update PROJECT-MANIFEST.json** after completing each module.
