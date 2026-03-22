# Layer 2 — Cognitive Pipeline

## Pre-Requisite
- Layer 1 tests pass: `node tests/test-runner.js 1`

## Scope
Fill in all NOT_IMPLEMENTED stubs in:
1. `server/pipeline/turn-signals.js` — Deterministic signal extraction
2. `server/pipeline/subconscious.js` — Phase 1A: memory retrieval + context
3. `server/pipeline/dream-intuition.js` — Phase 1D: abstract associations
4. `server/pipeline/conscious.js` — Phase 1C: full reasoning
5. `server/pipeline/orchestrator.js` — Final: voice/review + pipeline runner

## Instructions Per Module

### turn-signals.js — `extractTurnSignals(message)`
- **Subject**: First noun phrase (simple: first capitalized word or first word after "about"/"regarding")
- **Event**: Detect question/request/statement/command from sentence structure
- **Emotion**: Scan against EMOTION_LEXICON (already in stub). Return highest-confidence match
- **Tension**: Scan against HIGH_TENSION keywords. Return 0.0-1.0 normalized score
- Pure function. No async. No LLM calls. No side effects.

### subconscious.js — `runSubconscious(input, deps)`
- `input`: { turnSignals, entityId, conversationHistory }
- `deps`: { memoryOps, entityState }
- Algorithm:
  1. `memoryOps.retrieveMemories(input.turnSignals.subject, { limit: 8 })` → activated memories
  2. Take last 5 conversation turns → conversation recall
  3. `entityState.loadEntity(input.entityId)` → get relationship context from entity state
  4. Build output matching `SUBCONSCIOUS_OUTPUT` contract shape
  5. Validate with `contributorContracts.validateSubconsciousOutput(output)`
  6. Return output
- **NO LLM call**. This is pure retrieval.

### dream-intuition.js — `runDreamIntuition(input, deps)`
- `input`: { turnSignals, entityId }
- `deps`: { memoryOps, llm, entityState }
- Algorithm:
  1. `buildDreamIntuitionInput(turnSignals)` → create prompt for abstract association
  2. Retrieve 3 random-ish memories (low-decay, diverse topics)
  3. Call LLM with temperature 0.9 for creative association
  4. Parse associations and intuitions from LLM response
  5. Build output matching `DREAM_INTUITION_OUTPUT` contract shape
  6. Validate output
  7. Return output
- **NO memory writes**. Read-only.

### conscious.js — `runConscious(input, deps)`
- `input`: { turnSignals, subconsciousOutput, dreamIntuitionOutput, message, conversationHistory }
- `deps`: { llm, entityState, contextBuilder }
- Algorithm:
  1. `contextBuilder.buildContext(entityId, subconsciousOutput, dreamIntuitionOutput)` → system context
  2. Build messages array: system prompt + context + conversation + current message
  3. Call LLM with temperature 0.7
  4. `parseToolCalls(response)` → extract any tool call blocks (TOOL_CALL_REGEX in stub)
  5. Build output matching `CONSCIOUS_OUTPUT` contract shape
  6. Validate output
  7. Return output

### orchestrator.js — `runPipeline(input)` + `runOrchestrator(input, deps)`
- **runPipeline** orchestrates the full sequence:
  1. `extractTurnSignals(message)` → turnSignals
  2. `Promise.all([runSubconscious(...), runDreamIntuition(...)])` → parallel 1A+1D
  3. `runConscious({ turnSignals, subconsciousOutput, dreamIntuitionOutput, ... })` → 1C
  4. `runOrchestrator({ consciousOutput, turnSignals, entityId })` → final
  5. Build output matching `PIPELINE_OUTPUT_SHAPE` contract
  6. Return output
- **runOrchestrator** does voice/review:
  1. Check budget via `orchestrationPolicy.checkBudget()`
  2. Check latency via `orchestrationPolicy.withLatencyGuard()`
  3. Apply entity voice/persona from persona.json
  4. Return final response

## Done When
```bash
node tests/test-runner.js 2
# All tests pass
```

## After Completion
Update `PROJECT-MANIFEST.json`: layer 2 → "complete", all 5 modules → "implemented"
