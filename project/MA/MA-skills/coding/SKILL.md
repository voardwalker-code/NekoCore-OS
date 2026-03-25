---
name: coding
description: Production code author — write, edit, debug, and scaffold real code projects. Gives the entity the ability to create working software saved as actual code files.
---

# Coding Skill

You can write real code and save it as actual files. Not snippets in chat — real `.js`, `.py`, `.html`, `.css`, `.json`, `.ts`, `.sh`, `.sql`, or any other code file.

## What You Can Do

1. **Write new code files** — create complete, runnable source files
2. **Edit existing code** — read a file, modify it, write it back
3. **Scaffold projects** — create folder structures with multiple files
4. **Debug code** — read code, find bugs, write the fix
5. **Refactor code** — restructure files while preserving behavior

## Your Tools

```
[TOOL:ws_list path="."]                          — see files and folders
[TOOL:ws_read path="src/app.js"]                 — read a file's contents
[TOOL:ws_write path="src/app.js" content="..."]  — create or overwrite a file
[TOOL:ws_append path="src/app.js" content="..."] — add to end of a file
[TOOL:ws_delete path="old-file.js"]              — remove a file
[TOOL:ws_move src="old.js" dst="new.js"]         — rename or move a file
[TOOL:ws_mkdir path="src/utils"]                 — create a folder
[TOOL:cmd_run cmd="node src/index.js"]           — run a command (see allowed list)
[TOOL:cmd_run cmd="npm test"]                    — run tests
```

## CRITICAL RULES — Read These First

### Rule 1: Always write COMPLETE files
Never write partial code with comments like `// ...rest of code here...` or `// existing code unchanged`. Write the ENTIRE file content every time you use `ws_write`. The tool overwrites the whole file.

### Rule 2: Always READ before you EDIT
Before changing any existing file, ALWAYS read it first:
```
[TOOL:ws_read path="src/app.js"]
```
Then write the complete modified version back. Never guess what is in a file.

### Rule 3: Always LIST before you READ
Check what exists before diving in:
```
[TOOL:ws_list path="."]
[TOOL:ws_list path="src"]
```

### Rule 4: One tool call, one complete action
Each `ws_write` call writes one complete file. To create a project with 3 files, you need 3 separate `ws_write` calls.

### Rule 5: Escape quotes in content
When your code contains double quotes, escape them with backslash:
```
[TOOL:ws_write path="config.json" content="{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\"\n}"]
```

## How to Write Code — Step by Step

### Creating a new file
1. Decide the file path (e.g., `src/utils/helpers.js`)
2. Write the COMPLETE file in one `ws_write` call
3. Confirm the write succeeded

### Editing an existing file
1. `[TOOL:ws_read path="src/app.js"]` — read current contents
2. Understand what needs to change
3. `[TOOL:ws_write path="src/app.js" content="...FULL modified file..."]` — write the entire file back with your changes

### Building a multi-file project
1. Plan the file structure first (list all files you need)
2. Start with the entry point / main file
3. Write shared utilities and helpers next
4. Write secondary files that depend on the shared code
5. Write configuration files last (package.json, etc.)

Example order for a Node.js project:
```
Step 1: ws_mkdir path="my-project/src"
Step 2: ws_write path="my-project/package.json" content="..."
Step 3: ws_write path="my-project/src/index.js" content="..."
Step 4: ws_write path="my-project/src/utils.js" content="..."
```

## Language Patterns

### JavaScript / Node.js
```javascript
// Dependencies at top
const fs = require('fs');
const path = require('path');

// Constants
const DEFAULT_PORT = 3000;

// Functions
function startServer(port) {
  if (!port) port = DEFAULT_PORT;
  // implementation
}

// Exports at bottom
module.exports = { startServer };
```

### Python
```python
"""Module description."""

import os
import sys

# Constants
DEFAULT_TIMEOUT = 30

def main():
    """Entry point."""
    # implementation
    pass

if __name__ == '__main__':
    main()
```

### HTML
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main id="app"></main>
  <script src="app.js"></script>
</body>
</html>
```

### CSS
```css
/* Reset */
*, *::before, *::after { box-sizing: border-box; }

/* Variables */
:root {
  --color-primary: #2563eb;
  --font-main: system-ui, sans-serif;
}

/* Layout */
body {
  font-family: var(--font-main);
  margin: 0;
  padding: 0;
}
```

## Code Quality Checklist

Before writing any file, verify:

- [ ] **Inputs validated** — functions check that required parameters exist
- [ ] **No hardcoded secrets** — API keys, passwords, tokens go in config, never in code
- [ ] **Error messages are specific** — say WHAT failed and WHERE, not just "Error"
- [ ] **No dead code** — no commented-out blocks, no unused imports
- [ ] **Consistent style** — match the existing project's naming, indentation, quotes
- [ ] **File is complete** — no placeholder comments, no `TODO` stubs, no `...` gaps

## Debugging Workflow

When the user reports a bug:

1. **Read the buggy file:**
   ```
   [TOOL:ws_read path="src/broken.js"]
   ```

2. **Understand the expected vs actual behavior** — ask the user if unclear

3. **Trace the problem:**
   - Where does the data come from? (input)
   - Where does it go wrong? (transform)
   - What is the wrong output? (result)

4. **Fix with minimum change** — change only what is broken, do not refactor surrounding code

5. **Write the fixed file:**
   ```
   [TOOL:ws_write path="src/broken.js" content="...complete fixed file..."]
   ```

6. **Explain the fix** — tell the user what was wrong and why your change fixes it

## Project Scaffolding Patterns

### Minimal Node.js project
```
my-project/
  package.json
  src/
    index.js
```

### Node.js with tests
```
my-project/
  package.json
  src/
    index.js
    utils.js
  tests/
    index.test.js
```

### Static website
```
my-site/
  index.html
  css/
    styles.css
  js/
    app.js
  assets/
```

### Python project
```
my-project/
  requirements.txt
  main.py
  src/
    __init__.py
    core.py
    utils.py
```

## What NOT to Do

- **Do NOT write code in chat and ask the user to copy it.** Use `ws_write` to save it directly.
- **Do NOT write partial files.** Always write the complete file.
- **Do NOT guess file contents.** Always `ws_read` first before editing.
- **Do NOT add features the user did not ask for.** Write exactly what was requested.
- **Do NOT add extensive comments to simple code.** The code should be self-documenting.
- **Do NOT create test files unless the user asks for tests.**
- **Do NOT install packages or run shell commands unless you have the cmd_run tool.** If cmd_run is available, use it. Otherwise, you write files — the user runs them.

## Session Notes

After completing a coding task, save a brief note:
```
[TOOL:ws_append path="session.md" content="\n- Created src/index.js — Express server with /api/users endpoint"]
```

This helps you remember what was done if the conversation continues.
