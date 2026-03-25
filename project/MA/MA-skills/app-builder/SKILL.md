---
name: app-builder
description: Build, install, and manage complete NekoCore OS apps — HTML payload, installer contract, window registration, start menu category. Produces installer-managed, reversible app packages.
---

# App Builder Skill

You can create complete NekoCore OS applications that run as windowed apps inside the desktop environment.

## What You Can Do

1. **Design app UI** — plan layout, sections, controls for any app type
2. **Write HTML payloads** — self-contained tab-content files with script logic
3. **Build installer contracts** — JSON contracts for repeat-safe install/uninstall
4. **Install apps** — run the installer CLI to wire up all registrations
5. **Uninstall apps** — cleanly reverse any installed app

## Triggers

- "build an app", "create an app", "make an app"
- "NekoCore app", "new app", "app builder"
- "install an app", "add an app"

## Workflow

1. Gather requirements: name, purpose, features, category, icon
2. Design the layout and interaction model
3. Write the HTML payload to `client/apps/non-core/core/tab-<appId>.html`
4. PAUSE — show the user what was built, get approval
5. Write the installer contract to `server/contracts/installer-<appId>.contract.example.json`
6. Run installer dry-run, then actual install
7. Verify all 4 registration points (payload, loader, window registry, category map)

## Key Rules

- **appId** must match across ALL surfaces: contract, loader tabId, WINDOW_APPS tab, category map key
- **Container ID** must be `tab-<appId>`
- **Script logic** wrapped in IIFE with idempotent guard
- **No `<link>` or `<style>` tags** — inline styles or system classes only
- **Use CSS variables** for theme compatibility: `var(--ac)`, `var(--tm)`, `var(--sf2)`, etc.
- **Dispose function** required for apps with intervals/listeners
- **Relative API URLs** only — never hardcode ports

## Tools Used

```
[TOOL:ws_write path="client/apps/non-core/core/tab-{appId}.html"]    — write app HTML
[TOOL:ws_write path="server/contracts/installer-{appId}.contract.example.json"] — write contract
[TOOL:ws_read path="client/apps/non-core/core/tab-{appId}.html"]     — verify payload
[TOOL:cmd_run cmd="node server/tools/installer-cli.js install --contract ... --root . --dry"] — dry-run
[TOOL:cmd_run cmd="node server/tools/installer-cli.js install --contract ... --root . --log ..."] — install
[TOOL:cmd_run cmd="node server/tools/installer-cli.js uninstall --contract ... --root ."] — uninstall
```

## App Categories

`tools` (default), `browse`, `mind`, `journal`, `appearance`, `system`

## Quality Checklist

- [ ] appId consistent across all 4 registration points
- [ ] HTML container is `tab-<appId>`
- [ ] Script in IIFE with init guard
- [ ] No global variable leaks
- [ ] Dispose function handles cleanup
- [ ] System CSS classes used where available
- [ ] Installer dry-run passes
- [ ] All registration entries verified post-install
