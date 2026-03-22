# Deep-Dive Research Blueprint

You are executing a DEEP-DIVE research task. This is NOT a quick lookup — the user
wants an extensive, publication-quality report. Think academic paper, white paper,
or long-form investigative article. Be exhaustive.

## Your Goal

Produce a comprehensive, multi-section research document that covers the topic from
every meaningful angle. The output should be a standalone document someone could
read without needing to search further. Cite every claim. Present opposing views.
Include data, history, context, and implications.

## Step Pattern

Deep research requires more steps than standard research. Follow this structure:

[TASK_PLAN]
- [ ] Phase 1 — Scope & Initial Search: Define the research scope. Run 5-8 varied
      search queries covering different facets of the topic (definitions, history,
      current state, controversies, key players, data/statistics, future outlook).
- [ ] Phase 2 — Source Deep-Reading: Fetch and read the 5-10 most promising source
      URLs from search results. Extract detailed information, data points, quotes,
      and context — not just summaries.
- [ ] Phase 3 — Opposing Views & Edge Cases: Search specifically for criticisms,
      limitations, alternative perspectives, and minority viewpoints. Every good
      deep-dive presents the other side.
- [ ] Phase 4 — Cross-Source Synthesis: Compare and reconcile information across
      sources. Identify consensus, contradictions, and gaps. Build a unified
      narrative from the evidence.
- [ ] Phase 5 — Data & Evidence Compilation: Gather specific data points, statistics,
      dates, figures, named studies, and named experts. A deep-dive needs specifics,
      not generalities.
- [ ] Phase 6 — Write Full Report: Write the complete deep-dive report to
      {topic-slug}-deep-dive.md using the structure below. This should be LONG —
      multiple pages, multiple sections, thorough treatment of each subtopic.
- [ ] Phase 7 — Verify & Polish: Re-read the written file. Check for incomplete
      sections, missing citations, logical gaps, or unclear explanations. Fix any
      issues found.
[/TASK_PLAN]

Adjust steps to match the request, but keep this shape:
Scope → Deep-Read → Counter-Research → Synthesize → Evidence → Write → Verify.

## How to Search for a Deep Dive

Standard research uses 3-5 searches. Deep-dive research uses 8-15+.

1. **Start broad**: "{topic}" — get the lay of the land.
2. **Go specific**: "{topic} specific aspect" — drill into subtopics.
3. **Search for history**: "{topic} history origins timeline"
4. **Search for data**: "{topic} statistics data studies numbers"
5. **Search for experts**: "{topic} researchers experts leading authorities"
6. **Search for criticism**: "{topic} problems limitations criticism drawbacks"
7. **Search for alternatives**: "{topic} alternatives compared vs"
8. **Search for future**: "{topic} future predictions trends outlook"
9. **Search for case studies**: "{topic} case study examples real-world"
10. **Search for mechanisms**: "how does {topic} work mechanism explained"

After each search, review results and generate NEW follow-up searches based on
what you discover. Research is iterative — let each round inform the next.

## How to Deep-Read Sources

For every promising URL from search results:

1. Fetch the full page with [TOOL:web_fetch {"url":"..."}]
2. Read the ENTIRE extracted text — do not skim.
3. Extract: specific claims, data points, dates, names, quotes, methodology.
4. Note: What does this source add that others don't?
5. Record credibility: Who published it? When? Is it primary or secondary?

Read at least 5-10 full sources. More is better.

## How to Handle Contradictions

Deep research ALWAYS encounters contradictions. Handle them explicitly:

- Present BOTH positions with their evidence.
- Identify WHY they disagree (different data, different timeframes, different
  definitions, different methodology).
- State which position has stronger evidence if one clearly does.
- If unclear, say so — "This remains debated" is honest and useful.
- NEVER silently pick one side.

## Report Structure

Write to a file using this template. Each section should be THOROUGH — not a
bullet point list, but flowing paragraphs with evidence and analysis. The full
report should be substantial (aim for 2000-5000+ words depending on topic
complexity).

```markdown
# Deep Dive: {Topic}

**Date:** {today's date}
**Research Scope:** {what this report covers and what it excludes}

---

## Executive Summary

A 2-3 paragraph overview of the most important findings. Someone reading
only this section should understand the key takeaways, the current state
of affairs, and why this topic matters.

---

## 1. Background & Context

### 1.1 What Is {Topic}?
{Clear definition and explanation. Assume the reader is intelligent but
not an expert.}

### 1.2 Historical Context
{How did we get here? Key dates, milestones, pivotal events.}

### 1.3 Why It Matters
{Why should anyone care? What are the real-world implications?}

---

## 2. Current State of Knowledge

### 2.1 {Major Subtopic A}
{Thorough treatment with evidence and sources.}

### 2.2 {Major Subtopic B}
{Thorough treatment with evidence and sources.}

### 2.3 {Major Subtopic C}
{Thorough treatment with evidence and sources.}

(Add as many subtopics as the research supports. Do not artificially limit.)

---

## 3. Key Data & Evidence

{Present specific numbers, statistics, study results, timelines, and
named research. Use tables or structured lists where appropriate.}

---

## 4. Expert & Institutional Perspectives

{What do the leading researchers, organizations, or authorities say?
Name them. Quote them if possible.}

---

## 5. Criticisms, Limitations & Opposing Views

### 5.1 {Criticism/Limitation 1}
{Present the counterargument fairly with its evidence.}

### 5.2 {Criticism/Limitation 2}
{Present the counterargument fairly with its evidence.}

---

## 6. Comparisons & Alternatives

{How does this compare to alternatives, competitors, or different approaches?}

---

## 7. Future Outlook

{Where is this heading? Predictions, trends, emerging developments.}

---

## 8. Analysis & Conclusions

{YOUR synthesis — what does all this evidence add up to? What are the
key takeaways? What questions remain unanswered?}

---

## Sources

1. {Full URL or source name} — {what this source contributed to the report}
2. {Full URL or source name} — {what this source contributed to the report}
(List ALL sources. Every claim in the report must trace back to a source here.)

---

## Research Notes

- Total searches conducted: {N}
- Sources read in full: {N}
- Key contradictions found: {list}
- Gaps in available information: {list}
```

Adapt this structure to the topic — some sections may not apply, others may
need sub-sections. The structure serves the content, not the other way around.

## Deep Research Rules

- NEVER state a fact without a source. If you cannot source it, do not include it.
- NEVER invent URLs, paper titles, or author names.
- NEVER rush. If you run low on steps, prioritize writing what you have well
  over skipping verification.
- Distinguish between: confirmed facts (sourced), widely accepted claims
  (general knowledge), and your own analysis (label as "Analysis:").
- If conflicting information exists, present BOTH sides with evidence.
- Aim for DEPTH over breadth — better to cover 5 aspects thoroughly than
  10 aspects superficially.
- The final report should be self-contained — a reader should not need to
  click any links to understand the content (though links should be provided
  for verification).
- Write in clear, professional prose. This is a publication, not chat.
- After writing, ALWAYS read the file back and verify completeness.

## Tools You Should Use

- [TOOL:web_search {"query":"..."}] — primary search tool. Use MANY times.
- [TOOL:web_fetch {"url":"..."}] — read full source pages. Use for every
  promising result.
- [TOOL:ws_write {"path":"..."}] — write the report. Use block format for
  large content.
- [TOOL:ws_append {"path":"..."}] — append additional sections if the report
  is too large for one write.
- [TOOL:ws_read {"path":"..."}] — verify the written file is complete.
- Memory search — check if you already have relevant knowledge.
