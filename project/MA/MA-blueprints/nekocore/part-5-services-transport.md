# Part 5 — Services & Transport

**Pre-requisite**: Part 4 tests pass (34/34).

## Scope — Services (16)

| Module | File | What to Build |
|--------|------|---------------|
| Auth Service | `server/services/auth-service.js` | Session-based auth (JSON sessions) |
| Boot Service | `server/services/boot.js` | Full boot sequence orchestration (10 steps) |
| Chat Pipeline | `server/services/chat-pipeline.js` | Master turn cycle (classify→snapshot→context→generate→humanize→respond) |
| Config Runtime | `server/services/config-runtime.js` | Live-editable runtime config overlay |
| Config Service | `server/services/config-service.js` | Static config loader + validation |
| Entity Checkout | `server/services/entity-checkout.js` | Check out entity from disk, trigger hatch if new |
| Entity Memory Compat | `server/services/entity-memory-compat.js` | Bridge entity files ↔ memory subsystem |
| Entity Runtime | `server/services/entity-runtime.js` | Live entity state holder |
| Memory Service | `server/services/memory-service.js` | High-level memory API (recall/store/stats) |
| Post-Response Cognitive Feedback | `server/services/post-response-cognitive-feedback.js` | Fire-and-forget cognitive update after turn |
| Post-Response Memory | `server/services/post-response-memory.js` | Fire-and-forget memory encoding after turn |
| Relationship Service | `server/services/relationship-service.js` | Track trust, familiarity, emotional bonds |
| Response Post-Process | `server/services/response-postprocess.js` | Final response validation + metadata |
| Startup Preflight | `server/services/startup-preflight.js` | Pre-boot validation checks |
| Timeline Logger | `server/services/timeline-logger.js` | Append-only event timeline |
| User Profiles | `server/services/user-profiles.js` | User preferences + history |

## Scope — Utils (1)

| Module | File | What to Build |
|--------|------|---------------|
| Model Router | `server/utils/model-router.js` | Route LLM calls by task type + fallback chain |

## Scope — Routes (12)

All in `server/routes/`. Each exports a factory that returns an Express Router.

auth-routes, brain-routes, chat-routes, memory-routes, entity-routes, config-routes,
archive-routes, cognitive-routes, sse-routes, entity-chat-routes, document-routes, nekocore-routes

## Scope — Transport (3)

| File | What |
|------|------|
| `nekocore-server.js` | Express server on port 3870 — wire all services + mount routes |
| `nekocore-cli.js` | Interactive CLI REPL with diagnostic commands |
| `client/index.html` | Chat GUI with SSE event stream |

## Build Steps

1. Fill services bottom-up: config → auth → preflight → entity-checkout → entity-runtime → memory-service → etc.
2. Fill model-router
3. Fill routes (they just wire HTTP to service methods)
4. Wire `nekocore-server.js` — instantiate all deps, mount routes
5. Wire `nekocore-cli.js` — HTTP client calls
6. Wire `client/index.html` — SSE + POST /chat/turn

## Done When

```
node tests/test-runner.js 5
→ 49 passed, 0 failed
```

Full suite:
```
node tests/test-runner.js
→ 176 passed, 0 failed (Parts 1-5)
```
