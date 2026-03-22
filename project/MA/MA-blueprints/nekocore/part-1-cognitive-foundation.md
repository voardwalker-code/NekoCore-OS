# Part 1 — Cognitive Foundation

**Pre-requisite**: Contracts load and pass validation.

## Scope

| Module | File | What to Build |
|--------|------|---------------|
| Cognitive Bus | `server/bus/cognitive-bus.js` | EventEmitter-based bus with wildcard, priority, snoop, history |
| Thought Types | `server/bus/thought-types.js` | 70+ frozen event constants across 8 domains |
| Neurochemistry | `server/affect/neurochemistry.js` | 4-chemical engine (dopamine, serotonin, cortisol, oxytocin) with decay + interactions |
| Somatic Awareness | `server/affect/somatic-awareness.js` | Chemical→sensation mapper |
| Turn Classifier | `server/utils/turn-classifier.js` | Classify user turns into 10 intent types with 14 feature flags |
| Interaction Magnitude | `server/utils/interaction-magnitude.js` | Score turn importance (5 factors: length, emotion, novelty, question depth, disclosure) |

## Contracts (Already Complete)

- `cognitive-snapshot-contract.js` — 4 chemicals, somatic types, snapshot shape
- `cognitive-feedback-contract.js` — 10 feedback types
- `turn-classifier-contract.js` — 10 intents, 14 feature flags
- `response-contract.js` — Response shape with pipeline/memory/cognitive sections
- `worker-output-contract.js` — 7 worker output types

## Build Steps

1. Fill `cognitive-bus.js` — emit, on, once, snoop, getHistory, destroy
2. Fill `thought-types.js` — verify getAllEventNames() returns all constants
3. Fill `neurochemistry.js` — stimulate, decay, getLevels, resetToBaseline, checkCrisis, serialize
4. Fill `somatic-awareness.js` — computeSomatic, describe, getSnapshot
5. Fill `turn-classifier.js` — classifyTurn with keyword dictionaries
6. Fill `interaction-magnitude.js` — scoreMagnitude with 5 weighted factors

## Done When

```
node tests/test-runner.js 1
→ 21 passed, 0 failed
```

Update `PROJECT-MANIFEST.json` — set Part 1 modules to `"status": "implemented"`.
