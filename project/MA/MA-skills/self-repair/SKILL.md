---
name: self-repair
description: System diagnostics and self-healing — run health scans, interpret results, trigger the fixer generator, guide users through disaster recovery, and rebuild broken files using the BIOS.
---

# Self-Repair Skill

You are MA, the Memory Architect. You have the ability to diagnose your own health, find broken or missing files, and repair them. This skill teaches you how.

## Your Diagnostic Tools

### 1. Health Scanner — `scripts/health-scan.js`

The health scanner checks every core file in your system against the CORE_REGISTRY (299+ files). It runs multi-pass validation:

- **Pass 1:** File existence and zero-byte detection
- **Pass 2:** Deep validation per file type (JS syntax, JSON parse, HTML tag matching, CSS brace matching, broken require() references)
- **Pass 3:** Detects unregistered files in core directories

**How to run it:**

```
[TOOL:cmd_run cmd="node scripts/health-scan.js"]
```

Read the output. It will list every issue found with severity levels: `critical`, `warning`, `info`.

**Other modes:**

```
[TOOL:cmd_run cmd="node scripts/health-scan.js --json"]
```
Returns machine-readable JSON output. Use this when you need to parse the results programmatically.

```
[TOOL:cmd_run cmd="node scripts/health-scan.js --fix-list"]
```
Returns a plain list of broken file paths, one per line. Use this to get a quick list of what needs fixing.

**The output also goes to `scripts/health-report.log`** — you can read it later:
```
[TOOL:ws_read path="scripts/health-report.log"]
```

### 2. Fixer Generator — `scripts/generate-fixer.js`

This generates `neko_fixer.py` — a standalone Python script that embeds the Base64-encoded contents and SHA-256 hashes of every core file. It can rebuild the entire filesystem from its DNA.

**How to generate a fresh fixer:**

```
[TOOL:cmd_run cmd="node scripts/generate-fixer.js"]
```

This writes `neko_fixer.py` to the project root. The user can then run it with Python 3.

**The generated fixer supports:**

| Command | What it does |
|---------|-------------|
| `python neko_fixer.py` | Dry-run integrity check — safe, read-only, reports issues |
| `python neko_fixer.py --repair` | Restore only missing or zero-byte files |
| `python neko_fixer.py --force` | Overwrite ALL files from embedded DNA (full restore) |
| `python neko_fixer.py --verify` | SHA-256 hash check on all existing files |
| `python neko_fixer.py --list` | List all embedded files and their sizes |

The fixer has zero dependencies — only Python 3 standard library. Works on Windows, macOS, Linux.

### 3. Failsafe Console — `client/failsafe.html`

If the main WebGUI is broken, the user can still reach you at:

```
http://localhost:3847/failsafe.html
```

This is a single HTML file with zero external dependencies (all CSS and JS inline). It provides:
- Sign in / create account
- Configure an LLM model (Ollama or OpenRouter)
- Chat with you

Tell the user about this if they report the main UI is broken.

### 4. CORE_REGISTRY — The Source of Truth

The CORE_REGISTRY in `scripts/health-scan.js` lists every essential file in the system with a description. It is the canonical list of "what files should exist." Currently 299+ entries covering:

- Server bootstrap, routes, services, contracts
- Brain modules (core, cognition, memory, identity, affect, generation, knowledge, skills, tasks, blueprints)
- Client shell, CSS, core JS, app loaders, apps, themes, overlays
- Skills (coding, rust, python, memory-tools, search-archive, web-search, vscode, ws_mkdir, ws_move, tutorial-notes, self-repair)
- Integrations (web-fetch, cmd-executor, telegram)
- Root scripts and config

## Step-by-Step: Diagnosing a Problem

When the user reports something is broken, follow this sequence:

### Step 1: Run the health scanner

```
[TOOL:cmd_run cmd="node scripts/health-scan.js"]
```

Read the full output. Look for `critical` and `warning` severity issues.

### Step 2: Identify the category of damage

- **Missing files** → The file was deleted or never created
- **Zero-byte files** → The file exists but is empty (corrupted write)
- **Syntax errors** → JS file has invalid syntax
- **Broken requires** → A JS file references a module that does not exist
- **JSON parse failures** → Malformed JSON (often BOM issues)
- **HTML tag mismatches** → Unclosed or mismatched HTML tags
- **CSS brace mismatches** → Unclosed `{` or extra `}` in CSS

### Step 3: Choose the repair strategy

**For missing or zero-byte files (1-3 files):**

Read the file from CORE_REGISTRY to understand what it should be, then rewrite it:
```
[TOOL:ws_read path="scripts/health-scan.js"]
```
Look up the file's description in the registry, then write the correct content.

**For missing or zero-byte files (many files):**

Tell the user to run the fixer:
```
The quickest way to restore these files is the BIOS fixer.
Run: python neko_fixer.py --repair
This will restore all missing and empty files from the embedded DNA.
```

If the fixer does not exist yet, generate it first:
```
[TOOL:cmd_run cmd="node scripts/generate-fixer.js"]
```

**For syntax/logic errors in a file:**

Read the broken file, understand the error from the health scan output, then fix it:
```
[TOOL:ws_read path="server/services/chat-pipeline.js"]
```
Then write the corrected version:
```
[TOOL:ws_write path="server/services/chat-pipeline.js" content="...corrected content..."]
```

**For total system failure (many critical issues):**

Tell the user to do a full DNA restore:
```
If many core files are damaged, the safest approach is a full restore:
  python neko_fixer.py --force
This overwrites ALL core files from the BIOS DNA. Your memories and entity
data are not affected — they live in separate directories.
```

### Step 4: Verify the repair

After any repair, run the scanner again to confirm:
```
[TOOL:cmd_run cmd="node scripts/health-scan.js"]
```

The output should show 0 critical issues.

## Step-by-Step: When the Main UI Is Broken

If the user says the main interface is not loading or showing errors:

1. Ask them to try: `http://localhost:3847/failsafe.html`
2. This failsafe page has zero dependencies — it works even if every JS/CSS file is broken
3. From the failsafe console, they can chat with you and ask you to fix the broken files
4. Run the health scanner to find the specific broken client files
5. Fix them or guide the user through `neko_fixer.py --repair`

## Step-by-Step: Headless Server Recovery

If the user is on a headless server (no display):

1. They can SSH in and run: `python neko_fixer.py --repair` to restore core files
2. Start the server: `node server/server.js`
3. Send you a message via Telegram or the failsafe console
4. Ask you to run `node scripts/health-scan.js` and fix remaining issues

## What NOT to Do

- Do NOT delete files to "clean up" unless the health scanner specifically flags them as problems
- Do NOT modify `scripts/health-scan.js` CORE_REGISTRY entries without understanding the full impact
- Do NOT run `neko_fixer.py --force` without warning the user it will overwrite ALL core files
- Do NOT assume a file is unneeded just because you do not recognize it — check the registry first
- Do NOT skip the verification scan after a repair
- Do NOT edit `neko_fixer.py` directly — it is a generated artifact. Regenerate it instead

## Key File Locations

| File | Purpose |
|------|---------|
| `scripts/health-scan.js` | Health scanner + CORE_REGISTRY (299+ files) |
| `scripts/generate-fixer.js` | Generates neko_fixer.py from current core state |
| `neko_fixer.py` | Generated standalone repair script (Python 3) |
| `scripts/health-report.log` | Last health scan output |
| `client/failsafe.html` | Zero-dependency emergency WebGUI |
| `reset-all.js` | Factory reset (nuclear option — clears everything) |

## When You Are Asked to "Fix Yourself"

This is the complete sequence:

1. Run `node scripts/health-scan.js` to find what is broken
2. Read the output and categorize the issues
3. For small fixes (1-5 files): read each broken file, understand the problem, rewrite it
4. For large damage (6+ files): tell the user to run `python neko_fixer.py --repair`
5. Run the scanner again to verify 0 critical issues
6. If the main UI was affected, tell the user to hard-refresh their browser
