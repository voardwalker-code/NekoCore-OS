# Part 3 — Cognition Engine

**Pre-requisite**: Part 2 tests pass (22/22).

## Scope — Engines (9)

| Module | File | What to Build |
|--------|------|---------------|
| Attention System | `server/cognition/attention-system.js` | Attention focus tracking, salience scoring, decay |
| Cognitive Feedback | `server/cognition/cognitive-feedback.js` | Detect surprises, contradictions, learning signals |
| Cognitive Pulse | `server/cognition/cognitive-pulse.js` | Periodic tick driving dream/brain phases |
| Cognitive Snapshot | `server/cognition/cognitive-snapshot.js` | Full cognitive state capture per contract |
| Curiosity Engine | `server/cognition/curiosity-engine.js` | Curiosity signal from novelty + information gap |
| Boredom Engine | `server/cognition/boredom-engine.js` | Boredom signal from repetition + low novelty |
| Dream Seed Pool | `server/cognition/dream-seed-pool.js` | Collect dream seeds from daily experience |
| Dream Maintenance Selector | `server/cognition/dream-maintenance-selector.js` | Select which memories to consolidate during dreams |
| Dream Intuition Adapter | `server/cognition/dream-intuition-adapter.js` | Convert dream insights into conscious beliefs |

## Scope — Phases (16)

All in `server/cognition/phases/`. Each phase has a single `run(ctx)` async function.

| Phase | What It Does |
|-------|-------------|
| phase-decay | Chemical decay toward baselines |
| phase-consolidation | STM→LTM memory promotion |
| phase-conscious-stm | Refresh STM contents |
| phase-dreams | Generate dream narratives from seed pool |
| phase-deep-sleep | Aggressive memory pruning + archival |
| phase-beliefs | Update belief system from trace graph |
| phase-goals | Update goal priorities |
| phase-identity | Identity coherence check |
| phase-neurochemistry | Complex chemical interaction processing |
| phase-somatic | Somatic state refresh |
| phase-hebbian | Strengthen frequently-activated memory links |
| phase-pruning | Remove weak/forgotten memories |
| phase-traces | Build new trace edges |
| phase-archive | Archive old conversations |
| phase-archive-index | Rebuild archive search index |
| phase-boredom | Process boredom signals |

## Build Steps

1. Fill the 9 engines (attention → dream-intuition-adapter)
2. Fill the 16 phases in dependency order (decay first, then building up)
3. Each stub has detailed algorithm comments — follow them

## Done When

```
node tests/test-runner.js 3
→ 50 passed, 0 failed
```
