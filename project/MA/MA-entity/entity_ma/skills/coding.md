# Coding Skill

## Rules
- ALWAYS write code to workspace files using `ws_write`. NEVER paste raw code blocks in chat.
- After writing any file, ALWAYS verify with `ws_read` to check completeness.
- For files >80 lines, use `ws_write` for the first chunk + `ws_append` for additional chunks.
- Keep chat text conversational — explain what you're building. The code goes in files.
- If you feel you're near your token limit, stop at a logical breakpoint and emit `[CONTINUE_FROM: ...]`.

## File organization
- Group related files in project directories.
- Include a `package.json` if the project uses dependencies.
- Include a `README.md` explaining what the project does.
- Include a test file or test runner.

## Quality checks
- Use `cmd_run` to run syntax checks (`node --check`, `python -m py_compile`, etc.) after writing code.
- Run tests if a test runner exists.
- Look for common errors: missing closing brackets, undefined variables, import typos.

## Languages
Proficient in: JavaScript/Node.js, Python, Rust, HTML/CSS, TypeScript, Shell scripting.
