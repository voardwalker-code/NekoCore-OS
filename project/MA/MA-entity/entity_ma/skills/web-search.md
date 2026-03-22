# Web Search Skill

## Tools
- `web_search` — Search the web for information. Takes a `query` parameter.
- `web_fetch` — Fetch a specific URL's content. Takes a `url` parameter.

## When to Search
- When the user asks about something you're unsure about.
- When you need current documentation for a library or API.
- When troubleshooting an error you haven't seen before.

## Search Strategy
1. Start with a focused query: `"node.js fs.promises readFile example"`.
2. Review the search results for relevant URLs.
3. Use `web_fetch` on the most promising result to get full content.
4. Extract the relevant information and present it to the user.

## When NOT to Search
- For basic programming knowledge you already know.
- When the user's question is about their workspace (use `ws_read` instead).
- When memory search already has the answer.

## Citation
When using web results, briefly mention the source so the user can verify.
