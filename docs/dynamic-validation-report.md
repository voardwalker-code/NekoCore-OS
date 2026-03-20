# Dynamic Validation Report

**Generated:** 2026-03-20 13:24:12 UTC
**Script:** `scripts/validate-dynamic-patterns.js`
**Source:** `docs/system-map-addendum.md`

**Summary:** 1 pass · 6 warning · 1 resolved

---

- ✅  Check 1 — window[app.action] guard present. Known values: saveWindowLayout, restoreWindowLayout, resetWindowLayout
- ⚠   Check 2 — new Function(code)() still executes tab scripts with no sanitisation or CSP
- 🔵  Check 3 — Sleep Phase 3 RESOLVED in sleep.js — fetch('/api/system-prompt') result is now consumed
- ⚠   Check 4 — clearChat() called in sleep cycle with no rollback in sleep.js — chat loss on error remains
- ⚠   Check 5 — url + '/api/tags' fetch still unvalidated in: auth.js, setup-ui.js, simple-provider.js
- ⚠   Check 6 — VFS path strip still applies to filename component only — full path not sanitised
- Check 6 — Current strip pattern: /[<>:"/\\|?*]/g
- ⚠   Check 7 — nk-s- rename PENDING — 141 nk-s- references in 9 files
- Check 7 — Files with nk-s-: client/apps/core/overlays/boot-login.html, client/apps/core/tab-activity.html, client/apps/core/tab-advanced.html, client/apps/core/tab-archive.html, client/apps/core/tab-debugcore.html, client/apps/core/tab-settings.html, client/apps/core/tab-users.html, client/index.html …+1 more
- ⚠   Check 8 — Task SSE still uses typeof guard only with no queue — events fired before task-ui.js loads are silently dropped

---

*Run `npm run validate` to regenerate this report.*