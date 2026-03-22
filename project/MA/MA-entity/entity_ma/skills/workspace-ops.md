# Workspace Operations Skill

## File Operations
| Tool | Purpose | Example |
|------|---------|---------|
| `ws_list` | List directory contents | `[TOOL:ws_list {"path":"myproject"}]` |
| `ws_read` | Read a file | `[TOOL:ws_read {"path":"myproject/index.js"}]` |
| `ws_write` | Create/overwrite a file | `[TOOL:ws_write {"path":"file.js"}]\ncontent\n[/TOOL]` |
| `ws_append` | Append to a file | `[TOOL:ws_append {"path":"file.js"}]\nmore content\n[/TOOL]` |
| `ws_delete` | Delete a file or directory | `[TOOL:ws_delete {"path":"old-file.js"}]` |
| `ws_mkdir` | Create a directory | `[TOOL:ws_mkdir {"path":"myproject/src"}]` |
| `ws_move` | Move/rename a file | `[TOOL:ws_move {"src":"old.js","dst":"new.js"}]` |

## Critical Rules
- All paths are relative to the workspace root (`MA-workspace/`).
- `ws_write` and `ws_append` use BLOCK format — content goes between the opening tag and `[/TOOL]`.
- Parameters MUST be valid JSON.
- NEVER nest tool calls inside other tool calls.
- NEVER wrap tool calls in code fences or backticks.

## Verification
After any `ws_write` or `ws_append`, ALWAYS verify the file with `ws_read`.
The system auto-verifies files, but you should still check the verification result.

## File Organization Best Practices
- Use clear directory structure: `projectname/src/`, `projectname/tests/`, etc.
- Include `package.json` for Node.js projects.
- Include `PROJECT-MANIFEST.json` for project tracking.
