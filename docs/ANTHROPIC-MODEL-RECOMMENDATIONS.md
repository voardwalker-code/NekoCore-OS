# NekoCore OS — Anthropic Direct Model Recommendations

Last updated: 2026-03-23

Recommendations for running the full NekoCore OS cognitive pipeline on Anthropic's direct API with prompt caching enabled. Covers all pipeline aspects, cost breakdowns, and savings vs. OpenRouter.

**Prerequisite:** Anthropic Direct provider configured in Settings (added 2026-03-23).

---

## Why Anthropic Direct Instead of OpenRouter?

OpenRouter is a convenience aggregator — it lets you mix models from many providers. But when you're running Claude models specifically, routing through OpenRouter has two cost penalties:

| Feature | OpenRouter | Anthropic Direct |
|---------|-----------|-----------------|
| Base token pricing | Same or slightly higher | Anthropic list price |
| Prompt caching | Not guaranteed to pass through | **90% input discount** on cache hits |
| Batch API (planned) | Not available | **50% discount** on all tokens |
| Combined (cache + batch) | N/A | **~95% input discount** on cached batch |

For a pipeline that sends the same large system prompts on every turn (entity personality, tools, rules), prompt caching alone can cut your bill in half or more.

---

## Anthropic Model Lineup (March 2026)

| Model ID | Display Name | Context | Max Output | $/M Input | $/M Output | 5-min Cache Write | Cache Read | Speed |
|----------|-------------|---------|-----------|-----------|------------|-------------------|------------|-------|
| `claude-opus-4-6` | Claude Opus 4.6 | 1M | 128K | $5.00 | $25.00 | $6.25 | $0.50 | Moderate |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | 1M | 64K | $3.00 | $15.00 | $3.75 | $0.30 | Fast |
| `claude-haiku-4-5` | Claude Haiku 4.5 | 200K | 64K | $1.00 | $5.00 | $1.25 | $0.10 | Fastest |

All three models support **extended thinking** and **tool use**. Opus 4.6 and Sonnet 4.6 also support **adaptive thinking**.

### Cache Pricing

Two cache durations are available:

| Duration | Write Cost | Read Cost | Best For |
|----------|-----------|-----------|----------|
| 5-minute | 1.25× base input | 0.1× base input | Active conversation turns |
| 1-hour | 2× base input | 0.1× base input | Long sessions, idle entity |

**Cache Write** = first time a prompt prefix is seen (surcharge on input price).
**Cache Read** = subsequent calls within the TTL that share the same prefix (90% discount).

NekoCore currently uses the 5-minute cache. The 1-hour cache is useful for entities that may go idle between user messages — the higher write cost pays for itself after just two cache reads.

> **Note on model IDs:** When using Anthropic Direct, you use bare model IDs (e.g. `claude-sonnet-4-6`), NOT the OpenRouter-prefixed IDs (`anthropic/claude-sonnet-4.6`). The setup wizard and settings UI accept these directly.

---

## Pipeline → Model Mapping

### How the Pipeline Uses Tokens

Each user message triggers 4 synchronous LLM calls plus async background work:

| Phase | Aspect Key | Token Budget | Purpose | Latency Sensitive? |
|-------|-----------|-------------|---------|-------------------|
| Subconscious (1A) | `subconscious` | ~1,200 out | Memory retrieval, emotional signals | Yes — parallel with 1D |
| Dream-Intuition (1D) | `dream` | ~800 out | Abstract associations, creativity | Yes — parallel with 1A |
| Conscious (1C) | `main` | ~600 out | Structured reasoning notes | Yes — waits for 1A+1D |
| Orchestrator Final | `orchestrator` | ~1,600 out | Entity's spoken response | Yes — user sees this |
| Memory Encoding | background | ~1,200 out | Post-turn memory creation | No — fire-and-forget |
| Relationship Update | background | ~1,200 out | Trust/rapport delta | No — fire-and-forget |
| Belief Extraction | background | ~600 out | Brain-loop (every ~5 min) | No — background |
| Dream (REM sleep) | `dream` | ~2,200 out | Sleep cycle dreams | No — background |

**System prompt sizes** (these are what get cached):
- Subconscious system prompt: ~1,500–2,500 tokens
- Conscious system prompt: ~2,000–4,000 tokens (includes subconscious briefing + dream briefing)
- Dream-Intuition prompt: ~800–1,200 tokens
- Orchestrator prompt: ~3,000–5,000 tokens (includes full context copy)

After the first turn, the system prompts are cached for 5 minutes. Every subsequent turn within that window pays 90% less on the input tokens for those prompt blocks.

---

## Recommended Stacks

### Quality First — Best Entity Experience

Use when: You want the richest personality, deepest reasoning, and most creative entity behavior. Cost is secondary.

| Aspect | Model | $/M In | $/M Out | Cache Read |
|--------|-------|--------|---------|------------|
| Main (Conscious) | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |
| Subconscious | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |
| Dream | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |
| Orchestrator | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |

**Why this works:**
- Sonnet 4.6 is the sweet spot for NekoCore — strong persona fidelity, reliable structured output, excellent creative range
- Haiku 4.5 on Subconscious saves 67% on the fastest aspect call without losing retrieval quality
- Same model on Conscious + Orchestrator preserves voice consistency
- Dream gets Sonnet because creative synthesis benefits from the larger model

**Per-message cost estimate (after cache warms):**

| Phase | Input Tokens | Input Cost | Output Tokens | Output Cost |
|-------|-------------|-----------|---------------|-------------|
| 1A (Subconscious) | ~2,500 (cached) | $0.00025 | ~1,200 | $0.0060 |
| 1D (Dream) | ~1,200 (cached) | $0.00036 | ~800 | $0.0120 |
| 1C (Conscious) | ~4,000 (cached) | $0.0012 | ~600 | $0.0090 |
| Final (Orchestrator) | ~5,000 (cached) | $0.0015 | ~1,600 | $0.0240 |
| **Total per turn** | | **$0.0033** | | **$0.0510** |
| **Grand total** | | | | **~$0.054/message** |

Compare to OpenRouter (no caching): ~$0.09–0.12/message with the same models.

---

### Balanced — Good Quality, Lower Cost

Use when: You want a capable entity without paying Sonnet prices on every aspect.

| Aspect | Model | $/M In | $/M Out | Cache Read |
|--------|-------|--------|---------|------------|
| Main (Conscious) | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |
| Subconscious | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |
| Dream | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |
| Orchestrator | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |

**Why this works:**
- Conscious and Orchestrator stay on Sonnet — these are persona-critical
- Haiku on Dream still produces decent associations at 67% lower cost
- Haiku on Subconscious is a natural fit — retrieval/tagging doesn't need heavy reasoning

**Per-message estimate (cached):** ~$0.046/message

---

### Cost Floor — Maximum Savings

Use when: You want the cheapest possible Anthropic-only setup. Entity personality will be simpler but functional.

| Aspect | Model | $/M In | $/M Out | Cache Read |
|--------|-------|--------|---------|------------|
| Main (Conscious) | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |
| Subconscious | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |
| Dream | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |
| Orchestrator | `claude-haiku-4-5` | $1.00 | $5.00 | $0.10 |

**Per-message estimate (cached):** ~$0.022/message

**Trade-offs:**
- Haiku follows instructions well but produces flatter persona expression
- Creative dream output is weaker — less metaphor, less lateral association
- Orchestrator voice shaping is more mechanical
- Still dramatically better than free-tier OpenRouter models

---

### Maximum Quality — When Cost Is No Object

Use when: Research, demos, or personality-critical entity work where you need the absolute best output.

| Aspect | Model | $/M In | $/M Out | Cache Read |
|--------|-------|--------|---------|------------|
| Main (Conscious) | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |
| Subconscious | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |
| Dream | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 |
| Orchestrator | `claude-opus-4-6` | $5.00 | $25.00 | $0.50 |

**Per-message estimate (cached):** ~$0.084/message

**Why Opus on Orchestrator only:**
- Opus 4.6 excels at the synthesis+voicing task — it captures subtle personality nuance better than any other model
- With Opus now at $5/$25 (down from $15/$75 in the Opus 4 era), this stack is surprisingly affordable
- Using Opus on earlier phases still wastes money — Subconscious/Dream outputs are internal, not user-facing
- Opus is moderately slower than Sonnet; using it only on the final pass minimizes latency impact

---

## Prompt Caching Savings Breakdown

The key insight: NekoCore's system prompts are **large and stable**. The entity's personality, tools, rules, and context blocks are rebuilt identically on every turn. With Anthropic's prompt caching, you only pay full price once every 5 minutes.

### What Gets Cached

| Content Block | Typical Size | Cached? | Notes |
|--------------|-------------|---------|-------|
| Entity personality + traits | 500–1,000 tokens | Yes | Stable across all turns |
| Cognitive role instructions | 800–2,000 tokens | Yes | Static per aspect |
| Tool/skill definitions | 300–1,500 tokens | Yes | Changes only when skills are added |
| Memory context block | 500–2,000 tokens | **No** | Changes every turn |
| Chat history | 200–1,500 tokens | **No** | Changes every turn |
| User message | 10–500 tokens | **No** | Changes every turn |

**Typical cache ratio:** 60–75% of input tokens are cacheable on a warm conversation.

### Savings Math (Per 100 Messages)

Assuming Quality First stack, warm cache after first message:

| | Without Caching | With Caching | Savings |
|-|----------------|-------------|---------|
| Input tokens (100 msgs) | ~1.27M | 318K full + 952K cached | — |
| Input cost | $3.31 | $0.83 + $0.33 = **$1.16** | **65%** |
| Output cost | $5.10 | $5.10 (no change) | 0% |
| **Total** | **$8.41** | **$6.26** | **26%** |

The savings percentage increases as conversations get longer (more turns reusing the same cached prefix).

---

## Future: Batch API Savings (Planned)

Plan: `Documents/current/PLAN-ANTHROPIC-BATCH-API-v1.md`

Background calls (dream generation, belief extraction, memory encoding, shutdown sequences) will use the Anthropic Batch API for an additional **50% discount** on all tokens. Combined with prompt caching:

| Scenario | Input Discount | Output Discount |
|----------|---------------|----------------|
| Normal call | 0% | 0% |
| Cached call | 90% on cached portion | 0% |
| Batch call | 50% | 50% |
| Cached + batch call | **95%** on cached portion | **50%** |

This means background dream generation with a cached system prompt would cost ~$0.15/M input + $7.50/M output on Sonnet 4.6 — compared to $3.00/$15.00 list price.

---

## Model Selection Criteria for Anthropic

### Persona Commitment

All Claude models are strong at maintaining persistent entity identity when instructed. Unlike some other model families, Claude does not aggressively break character — this makes the entire Claude lineup suitable for persona-facing phases.

| Phase | Persona Needed? | Minimum Model |
|-------|----------------|---------------|
| Conscious (1C) | **Critical** | Sonnet 4.6 recommended, Haiku 4.5 acceptable |
| Orchestrator Final | **Critical** | Sonnet 4.6 recommended, Opus 4.6 for maximum nuance |
| Dream-Intuition (1D) | High | Haiku 4.5 acceptable — associations don't need polish |
| Subconscious (1A) | Low | Haiku 4.5 — internal only, no persona expression |
| Background tasks | None | Haiku 4.5 — utility work |

### Speed Characteristics

| Model | Typical TTFT | Tokens/sec | Best For |
|-------|-------------|-----------|----------|
| Haiku 4.5 | ~200ms | ~150 t/s | Subconscious, Dream, background |
| Sonnet 4.6 | ~400ms | ~80 t/s | Conscious, Orchestrator |
| Opus 4.6 | ~600ms | ~50 t/s | Orchestrator escalation only |

NekoCore runs 1A and 1D in parallel. If both use Haiku, the parallel phase completes in ~1.5s. If both use Sonnet, ~3s. The user notices this.

### Context Window

Opus 4.6 and Sonnet 4.6 support **1M token** context windows. Haiku 4.5 supports 200K. NekoCore's orchestrator prompt (the largest) typically uses 5,000–8,000 tokens — well under all limits. Context window is not a differentiator for model selection in NekoCore, though the 1M window on Opus/Sonnet provides headroom for future features.

---

## Config Format

When using Anthropic Direct, the config profile in `Config/ma-config.json` looks like:

```json
{
  "profiles": {
    "anthropic-quality": {
      "main": {
        "type": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "apiKey": "sk-ant-...",
        "model": "claude-sonnet-4-6"
      },
      "subconscious": {
        "type": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "apiKey": "sk-ant-...",
        "model": "claude-haiku-4-5"
      },
      "dream": {
        "type": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "apiKey": "sk-ant-...",
        "model": "claude-sonnet-4-6"
      },
      "orchestrator": {
        "type": "anthropic",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "apiKey": "sk-ant-...",
        "model": "claude-sonnet-4-6"
      }
    }
  }
}
```

> The Settings UI sets this automatically when you choose Anthropic Direct and save. You only need to edit the JSON directly if you want per-aspect model overrides that differ from the main model.

---

## Quick Reference Card

| Stack | $/msg (cached) | Best For |
|-------|---------------|---------|
| **Quality First** (Sonnet 4.6 + Haiku 4.5 sub) | ~$0.054 | Daily use, rich personality |
| **Balanced** (Sonnet main/orch + Haiku rest) | ~$0.046 | Good personality, lower cost |
| **Cost Floor** (All Haiku 4.5) | ~$0.022 | Budget, simpler personality |
| **Maximum** (Sonnet 4.6 + Opus 4.6 orch) | ~$0.084 | Research, demos, max nuance |

All stacks benefit from prompt caching automatically — no configuration needed. The `llm-interface.js` Anthropic branch annotates system prompts with `cache_control` on every call.
