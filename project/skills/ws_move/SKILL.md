---
name: ws_move
description: Move or rename a file/folder in the workspace
---

# ws_move

Move or rename a file or folder inside the configured workspace.

## Tool

### ws_move
Moves (or renames) a file or directory.

Parameters:
- src (string): Source path relative to workspace root.
- dst (string): Destination path relative to workspace root.

Guidelines:
- Use workspace-relative paths only.
- Prefer explicit destination folders (for example, ./archive/file.txt).
- Use this operation for both moves and simple renames.

Example:
[TOOL:ws_move src="./old.txt" dst="./archive/old.txt"]