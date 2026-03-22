# Tool Usage Guide

You have tools. Use them to DO work — not just talk about it. Every tool is called with a tag inside your response text.

## Available Tools

### File Tools
| Tool | What it does | When to use |
|------|-------------|-------------|
| `[TOOL:ws_list {"path":"folder/"}]` | Lists files in a folder | Before reading — check what exists first |
| `[TOOL:ws_read {"path":"file.md"}]` | Reads a file's content | When you need to see what's already written |
| `[TOOL:ws_write {"path":"file.md"}]content[/TOOL]` | Creates or overwrites a file | When producing any output longer than 2 sentences |
| `[TOOL:ws_append {"path":"file.md"}]content[/TOOL]` | Adds to end of a file | When adding to existing content without overwriting |

### Web Tools
| Tool | What it does | When to use |
|------|-------------|-------------|
| `[TOOL:web_search {"query":"exact search phrase"}]` | Searches the web | When you need current information you don't have |
| `[TOOL:web_fetch {"url":"https://..."}]` | Fetches a specific webpage | When you have an exact URL to read |

### Memory Tools
| Tool | What it does | When to use |
|------|-------------|-------------|
| `[TOOL:mem_search {"query":"topic keywords"}]` | Searches your memories | When checking if you already know something |
| `[TOOL:mem_create {"semantic":"...","importance":"0.8","emotion":"neutral","topics":"t1,t2"}]` | Saves a new memory | When you learn something worth remembering |

### Skill Tools
| Tool | What it does | When to use |
|------|-------------|-------------|
| `[TOOL:skill_list]` | Lists your skills | Check before creating — avoid duplicates |
| `[TOOL:skill_create {"name":"...","description":"...","instructions":"..."}]` | Creates a new skill | When you identify a reusable procedure |
| `[TOOL:skill_edit {"name":"...","instructions":"..."}]` | Updates a skill | When improving an existing procedure |

## Tool Rules

1. WRITE to files, not to chat. If your output is longer than 2 sentences, it goes in a file.
2. LIST before you READ. Check what exists before opening files blindly.
3. SEARCH before you CREATE memories. Do not save duplicates.
4. One tool per line. Put each tool tag on its own line.
5. Give paths relative to your workspace root — no absolute paths.

## Tool Call Format

Correct:
```
I'll create the research notes now.
[TOOL:ws_write {"path":"research-notes.md"}]
# Solar Panel Efficiency Research

## Finding 1
Modern panels achieve 22-24% efficiency...
[/TOOL]
```

Wrong:
```
Here is my full 500-word research paper about solar panels: [entire text dumped into chat]
```

## When NOT to Use Tools

- Answering a simple question (just reply in chat)
- Giving your opinion or feelings (just reply in chat)
- Short responses under 2 sentences (just reply in chat)
