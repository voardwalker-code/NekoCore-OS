# Layer 5 — Integration (LLM + Policy)

## Pre-Requisite
- Layer 4 tests pass: `node tests/test-runner.js 4`

## Scope
Fill in all NOT_IMPLEMENTED stubs in:
1. `server/services/llm-interface.js` — Provider-agnostic LLM calling
2. `server/services/orchestration-policy.js` — Budget/latency guards + safety
3. `server/services/ma-integration.js` — Bridge to MA for /MA commands + programmatic access

## Instructions Per Module

### llm-interface.js — `callLLM(config, messages, opts)`
- **REFERENCE**: MA already has a working implementation at `../../server/MA-llm.js`
- Copy and adapt the logic. The pattern is identical.

- **config**: `{ type: 'openrouter'|'ollama', endpoint, apiKey, model }`
- **messages**: `[{ role: 'system'|'user'|'assistant', content: '...' }]`
- **opts**: `{ temperature: 0.7, max_tokens: 2048 }`

- For `openrouter`:
  1. POST to `${endpoint}/chat/completions`
  2. Headers: `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`
  3. Body: `{ model, messages, temperature, max_tokens }`
  4. Parse: `response.choices[0].message.content`

- For `ollama`:
  1. POST to `${endpoint}/api/chat`
  2. Body: `{ model, messages, stream: false, options: { temperature } }`
  3. Parse: `response.message.content`

- **Error handling**:
  - 30 second timeout (AbortController)
  - Retry once on 5xx errors
  - Return empty string on failure (never throw to caller during pipeline)
  - Log errors to console.error

### orchestration-policy.js

- **checkBudget(pipelineResult)**:
  1. Sum token counts from all contributors
  2. Compare against `POLICY.TOKEN_BUDGET_CAP` (8000)
  3. Return `{ allowed, remaining|overBy, cap }`

- **withLatencyGuard(workPromise)**:
  1. `const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('LATENCY_CAP')), POLICY.LATENCY_CAP_MS))`
  2. `try { result = await Promise.race([workPromise, timeout]) } ...`
  3. Return `{ timedOut: boolean, result? }`
  4. Always clear timeout to prevent leaks

- **shouldEscalate(turnSignals, pipelineState)**:
  1. If `turnSignals.tension >= 0.85` → escalate (HIGH_TENSION)
  2. If `pipelineState.toolFailures >= 2` → escalate (MULTI_TOOL_FAILURE)
  3. If `pipelineState.error && pipelineState.constraintViolation` → escalate (ERROR_CONSTRAINT_COMBO)
  4. Return `{ escalate: boolean, reason: string|null }`

- **applySafetyRails(output, entityPersona)**:
  1. If output is empty → return fallback response
  2. Strip raw error stack traces (regex: `/at .+ \(.+:\d+:\d+\)/g`)
  3. Verify length within persona's max_response_length if set
  4. Return `{ safe: boolean, output, warnings: [] }`

### ma-integration.js — Bridge to MA

MA runs on a separate port (default `localhost:3850`). This module talks to MA via HTTP — it never imports MA code directly.

- **MA_DEFAULTS**: `{ host: 'localhost', port: 3850, basePath: '/api' }`
- **parseMACommand(message)** — Already implemented. Extracts `/MA` prefix + command + args.

- **callMA(path, method, body)**:
  1. Build URL: `http://${MA_DEFAULTS.host}:${MA_DEFAULTS.port}${MA_DEFAULTS.basePath}${path}`
  2. Use built-in `http.request` (no external deps)
  3. Set headers: `Content-Type: application/json`
  4. 10 second timeout (setTimeout on req, call `req.destroy()`)
  5. Collect response chunks, JSON.parse on end
  6. On error: return `{ ok: false, error: err.message }`
  7. On success: return `{ ok: true, data: parsed }`

- **chatWithMA(message)**:
  1. Call `callMA('/chat', 'POST', { message })`
  2. If `result.ok` → return `result.data.reply` (or `.response`)
  3. If not → return fallback: `"MA is not available right now."`

- **checkMAStatus()**:
  1. Call `callMA('/health', 'GET', null)`
  2. If `result.ok` → return `{ available: true, health: result.data }`
  3. If not → return `{ available: false, error: result.error }`

- **routeMACommand(parsed)**:
  Takes the object from `parseMACommand`. Switch on `parsed.command`:
  - `status` → `checkMAStatus()`
  - `plan` → `chatWithMA('Create a plan for: ' + parsed.args)`
  - `delegate` → `chatWithMA('Delegate task: ' + parsed.args)`
  - `agents` → `chatWithMA('/agents ' + parsed.args)`
  - `help` → Return static help text listing available /MA subcommands
  - default → `chatWithMA(parsed.command + ' ' + parsed.args)`

## Done When
```bash
node tests/test-runner.js 5
# All tests pass
node tests/test-runner.js
# ALL layers pass end-to-end
```

## After Completion
Update `PROJECT-MANIFEST.json`:
- Layer 5 → "complete"
- All three modules → "implemented"
- Project overall status → "scaffold-complete"
