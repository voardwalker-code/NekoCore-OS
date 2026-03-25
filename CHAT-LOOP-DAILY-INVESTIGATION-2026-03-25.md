# Chat Loop Daily Investigation - 2026-03-25

## Scope
This report was built from same-day entries in WORKLOG.md and Unreleased notes in CHANGELOG.md, focused on:
1. Everything touched on 2026-03-25.
2. What could make the message loop take too long.

## Source Snapshot (2026-03-25)
- WORKLOG Stop/Resume: Chat Loop Timestamp Instrumentation completed.
- WORKLOG ledgers reviewed through all 2026-03-25 sections.
- CHANGELOG Unreleased reviewed for matching same-day items.

## Extensive List of Work Touched Today

### A) Chat and Message Loop Work
1. Chat pipeline loud debug instrumentation.
- Added high-visibility trace logging for route and pipeline.
- Added stage-level logging in processChatMessage.
- Added runtime LLM call start/success/error timing logs.
- Added trace propagation into single-LLM and orchestrated flows.

2. Chat auto-disconnect cancellation bugfix.
- Replaced abort-on-request-close behavior in chat routes.
- Moved to disconnect-safe hooks only.
- Prevented false client-disconnect cancellation during normal lifecycle.

3. End-to-end timestamp instrumentation.
- Added ISO and elapsed time to route and pipeline logs.
- Added client send timestamps.
- Added client-to-server latency reporting.
- Added step markers from request read to pipeline completion.

4. Prior chat resilience changes still relevant today.
- Entity release cancellation propagation.
- Timeout increase to 300s.
- Continue button on timeout in both chat UIs.

### B) Performance and Runtime Stability Work
5. Neural visualizer batch rendering overhaul.
- Glow sprites batched into one Points draw path.
- Labels batched into atlas InstancedMesh.
- Physics sync maintained with batched visuals.

6. Mouse and picking performance improvements.
- onMouseMove throttled via requestAnimationFrame.
- Raycast target caching to avoid per-event array rebuild.

7. Hidden-state compute reduction.
- Visualizer animate loop now gated by visibility state.

8. Window manager and resize stability.
- Ghost drag architecture to avoid heavy per-frame layout updates.
- Synthetic resize feedback loop removed.
- Re-entrancy protection added to resize path.

9. Hidden game loop waste removed.
- Pong update/draw skipped when window hidden.

10. Profiler app and profiler hook work.
- Profiler app v1 + v2 with early monkey-patching and tree view.
- Event listener hook fix (removeEventListener pairing).

11. Audio runtime fix.
- AudioContext deferred to first user interaction.

### C) UI/System Work Completed Today
12. Start menu app search.
13. App category regrouping and app category subtitle labels.
14. Welcome app and welcome flow fixes.
15. Theme overhauls and light/dark + system default behavior.
16. Server boot controls in power menu.
17. Entity list/checkout behavior fixes.
18. Entity backstory generation overhaul.

## Chat Loop Latency Investigation

## Observed Symptom
The message eventually returns, but total end-to-end time is unexpectedly long.

## Most Likely Contributors (Ranked)

1. Long upstream model latency in one aspect call.
Why likely:
- Pipeline is multi-stage and can call multiple runtimes.
- Any single slow LLM segment dominates total time.
What to look for in logs:
- Large gap between llm.call.start and llm.call.ok for one runtime.
- Large +ms jump while stage name stays in LLM phase.

2. Excess pre-orchestrator work before first LLM call.
Why likely:
- Task dispatch fork, hybrid classification, semantic cache lookup, context assembly all run before main orchestration.
- If any pre-stage blocks, user sees dots while no LLM call has started.
What to look for:
- Delay between route read_body.done and first llm.call.start.
- Slow stage marker transitions in task fork or snapshot assembly.

3. Tool execution loop or plan execution branching.
Why likely:
- If response contains tool actions or task plans, extra execution and follow-up LLM calls are added.
What to look for:
- tools.exec.start and tools.exec.done with large gap.
- task_plan.detected then large delay before task_plan.done.

4. Post-process humanization/chunking overhead.
Why likely:
- postProcessResponse can add additional LLM work depending on mode and output length.
What to look for:
- Long gap around postprocess.done relative to earlier stages.

5. Context size inflation causing model slowdown.
Why likely:
- chatHistory + subconscious context + cognitive snapshot + system prompt can increase token load.
- Larger prompt means longer queue and generation latency.
What to look for:
- LLM calls with high message count and consistently long durations.
- Slowdown growth with session length.

6. Provider-side queueing / local model contention.
Why likely:
- Even when Ollama works directly, pipeline may issue different models or concurrent calls.
- Local runtime can queue when multiple components compete.
What to look for:
- Client-to-server latency is low, route stages are fast, but llm.call.start to llm.call.ok is slow repeatedly.

7. Client-side pre-send delay.
Why possible:
- UI path includes bootstrap/subconscious prep before callChatLLM in some modes.
What to look for:
- Significant gap between client ui_send and server route opened.

## What Is Less Likely Now
1. False disconnect cancellation.
- Patched with safer abort semantics.

2. Complete silent route non-entry.
- Route-level open/read_body logs now provide immediate entry signal.

## Fast Diagnostic Procedure (Use New Logs)
1. Capture one full traceId from client send to route close.
2. Record these checkpoints:
- client ui_send timestamp
- /api/chat opened
- read_body.done with clientToServerMs
- pipeline.start
- first llm.call.start
- every llm.call.ok duration
- postprocess.done
- /api/chat success
3. Compute three buckets:
- Transport delay: client send -> route opened
- Pre-LLM pipeline delay: route opened -> first llm.call.start
- Model/processing delay: first llm.call.start -> success
4. Identify the dominant bucket and optimize only that bucket first.

## Immediate Optimization Candidates If Delay Persists
1. Add per-stage hard budgets and warnings.
- Emit WARN when a stage exceeds threshold.

2. Add optional quick mode for chat.
- Skip non-critical enrichments for low-latency responses.

3. Cap contextual payload in hot path.
- Reduce historical turns and optional context blocks in interactive mode.

4. Add progressive response strategy.
- Return an early short answer, continue enrichment in background.

5. Add explicit provider runtime telemetry.
- Capture model id, queued start, first token time, completion time.

## Conclusion
Current instrumentation is sufficient to isolate where time is being spent. The next correct step is to collect one or two full traces and classify delay into transport, pre-LLM pipeline, or LLM/runtime time. Once the dominant bucket is confirmed, optimization should target that bucket only.
