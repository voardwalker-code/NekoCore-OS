# Project Archive System

MA stores a complete record of everything it does on every project — every step, every piece of code, every response, every agent dispatch, every thought and decision. All stored as weighted memory nodes with a connection graph, ready for the predictive memory system.

## Core Concepts

**Archive = per-project memory graph.** Each project gets its own folder under `MA-entity/entity_ma/archives/proj_{id}/` with nodes (memory records) and edges (connections between them).

**Nodes follow NekoCore OS memory schema** — same `memorySchemaVersion`, `memory_id`, `importance`, `decay`, `topics`, `emotionalTag`, `access_count`, `access_events`. The predictive system will consume these directly.

**Edges capture relationships** — temporal ordering (precedes), knowledge derivation (derives), code production (produces), agent delegation (delegates), reinforcement (supports), contradiction (contradicts).

## When to Archive

Archive on EVERY action during a project:

1. **Before starting work** — `createProject('project-id', { name, description, tags })`
2. **Every step/action** — `recordStep(projectId, { sourceType, content, previousNodeId })`
3. **Code generation** — `recordNode(projectId, { sourceType: 'code', content: codeText })`
4. **LLM responses** — `recordNode(projectId, { sourceType: 'response', content: reply })`
5. **Agent dispatches** — `recordStep(projectId, { sourceType: 'agent-dispatch', agentId, content })`
6. **Decisions/thoughts** — `recordNode(projectId, { sourceType: 'decision', content, importance: 0.8 })`
7. **Errors encountered** — `recordNode(projectId, { sourceType: 'error', content: errorMsg })`
8. **Derived knowledge** — `recordStepWithKnowledge(projectId, { content, semanticContent })`
9. **When project done** — `closeProject(projectId)`

## Node Types

| Type | Default Importance | Use For |
|---|---|---|
| step | 0.5 | General work steps, actions taken |
| code | 0.7 | Code written or generated |
| response | 0.4 | LLM responses received |
| agent-dispatch | 0.6 | Tasks sent to delegated agents |
| thought | 0.5 | Planning, reasoning, considerations |
| decision | 0.8 | Choices made, paths taken/rejected |
| error | 0.6 | Errors encountered and how resolved |
| semantic | 0.7 | Derived knowledge, extracted insights |

## Edge Types

| Type | Strength Default | Meaning |
|---|---|---|
| precedes | 0.8 | Temporal: A happened before B |
| derives | 0.7 | B is knowledge extracted from A |
| produces | 0.7 | A (step) produced B (code) |
| delegates | 0.6 | A dispatched work to agent B |
| supports | 0.5 | B reinforces/confirms A |
| contradicts | 0.5 | B conflicts with A |
| references | 0.5 | Generic cross-reference |

## Typical Recording Flow

```
1. createProject('my-project', { name: 'My Project', tags: ['coding'] })
2. step1 = recordStep(projectId, { sourceType: 'thought', content: 'Planning approach...' })
3. step2 = recordStep(projectId, { sourceType: 'step', content: 'Creating file...', previousNodeId: step1.node.memory_id })
4. step3 = recordStep(projectId, { sourceType: 'code', content: 'function foo() {...}', previousNodeId: step2.node.memory_id })
5. addEdge(projectId, { sourceId: step2.node.memory_id, targetId: step3.node.memory_id, type: 'produces', strength: 0.8 })
6. closeProject(projectId)
```

## Dual-Path Encoding

Use `recordStepWithKnowledge()` to create both an episodic node (what happened) AND a semantic node (what was learned), automatically connected with a `derives` edge. This mirrors the NekoCore OS IME dual-path pattern.

## For Predictive Memory

Call `exportForPredictive(projectId)` to get the full graph:
- All nodes with weights (importance, decay, topics)
- All edges with strength and type
- Stats (node/edge counts by type, averages)

The predictive system traverses this graph to predict what knowledge, patterns, and approaches are most relevant for new tasks based on past project experience.

## Key Rules

- **Always archive.** If MA did it, it goes in the archive. No exceptions.
- **Always link.** Every node should have at least one edge connecting it to the project's graph.
- **Use `previousNodeId`** to maintain the temporal chain — this is the backbone of the graph.
- **Override importance** when a step is unusually important or trivial.
- **Add semantic nodes** for any insight or lesson learned during the project.
- **Close projects** when complete — this freezes them for predictive consumption.
