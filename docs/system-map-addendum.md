# System Map Addendum — Manual Trace Pass

**Generated:** 2026-03-20  
**Companion to:** docs/system-map.md  
**Purpose:** Documents runtime behaviours invisible to static analysis  
Do not modify `system-map.md` or `system-map.json` — this is a companion document only.

---

## Section 1 — Dynamic Function Calls

Patterns where the static analyser cannot know which function will be called at runtime because the call is constructed via bracket notation, string lookup, or code generation.

---

### 1a — `window[name]()` — Start Menu App Actions

**File:** `client/js/window-manager.js` — line 763

```js
const fn = window[app.action];
if (typeof fn === 'function') fn();
```

**Pattern:** `window[app.action]` where `app.action` is a string property read from a start menu app registry entry defined in `client/js/app.js`.

**Known resolved values** (all three defined in `app.js` lines 265, 275, 285):

| `app.action` string | Resolved to | Defined in |
|---|---|---|
| `'saveWindowLayout'` | `window.saveWindowLayout()` | `app.js` |
| `'restoreWindowLayout'` | `window.restoreWindowLayout()` | `app.js` |
| `'resetWindowLayout'` | `window.resetWindowLayout()` | `app.js` |

**Risk:** If additional start menu entries are added with an `action` key, any global function name becomes callable from the start menu. The current guard `if (typeof fn === 'function')` prevents undefined errors but does not restrict _which_ global functions are valid targets. If an attacker or misconfiguration places an unexpected string in the app registry, any global function (including `fetch`, `clearChat`, `startSleep`) could be invoked with no arguments.

---

### 1b — `new Function(code)()` — Shadow Content Loader Inline Scripts

**File:** `client/js/shadow-content-loader.js` — line 181

```js
new Function(code)();
```

**Pattern:** Called by `ShadowContentLoader.executeInlineScript()`. Receives the raw text content of every `<script>` tag found in a dynamically loaded tab HTML file and executes it in global window scope.

**What it can call:** Any code, any function, any variable. The `new Function()` wrapper does NOT create a sandbox — it executes with full access to `window`, `document`, `fetch`, all globals, and all currently loaded modules.

**Known callers:** All non-core apps loaded via the tab/slot system go through this path. Any `<script>` tag in `apps/core/` or `apps/non-core/` tab HTML files is executed here.

**Risk:** An app package with a malicious or corrupted inline script could modify global state, override window functions, exfiltrate data, or cause DOM corruption. No sanitisation or content policy is applied before execution.

---

### 1c — `eval()` Usage

No direct `eval()` calls found in the scanned JS files. The `new Function()` call above is the only code-string execution pattern present.

---

## Section 2 — Dynamic API Paths

Fetch calls where the URL is not a string literal — built from variables, user input, or function parameters. The static scan's endpoint map only captures literal `/api/...` strings.

---

### 2a — Ollama Endpoint Probe

**Files:** `client/js/auth.js:33`, `client/js/apps/core/setup-ui.js:271`, `client/js/apps/core/simple-provider.js:153`

```js
const resp = await fetch(url + '/api/tags');
```

**Pattern:** `url` is read from a DOM input element (e.g. `ollamaUrl-main`, `ollamaUrl-dreams`). Default `'http://localhost:11434'` if empty.

**Runtime resolution:** `http://<user-supplied-base>/api/tags` — this goes directly to the Ollama local server, not to the Node.js backend. It bypasses the `/api/proxy` system. This is the only case in the client where an external HTTP call is made without routing through the server proxy.

**Note:** There is no URL validation or allowlist on the `url` input before the fetch fires. Any locally reachable address the user types is reached directly from the browser.

---

### 2b — VFS Sub-Route Concatenation

**File:** `client/js/vfs.js:16`

```js
return fetch(BASE + '/' + endpoint, { method: 'POST', ... });
```

**Pattern:** `BASE = '/api/vfs'` (constant). `endpoint` is a fixed string passed by the callers of `apiPost()`. All known invocations:

| Resolved URL | Caller operation |
|---|---|
| `POST /api/vfs/mkdir` | `createEntry()` — folder creation |
| `POST /api/vfs/write` | `createEntry()` — file/note creation |
| `POST /api/vfs/read` | (via `fetch(BASE + '/read?...')`) |
| `POST /api/vfs/delete` | `deleteEntry()` |
| `POST /api/vfs/rename` | `rename()` |
| `POST /api/vfs/move` | `moveEntry()` |
| `GET /api/vfs/list?path=...` | `list()` |
| `GET /api/vfs/read?path=...` | `readFile()` |

**Status:** BASE is frozen and enumerable. The static scan misses these because the path is built via concatenation rather than a literal string.

---

### 2c — Entity-Scoped Visualizer Routes (appendEntityId)

**File:** `client/js/visualizer.js:25` — `appendEntityId(urlOrPath, entityId)` appends `?entityId=X` to any base path using `URLSearchParams`.

**All resolved forms** (when `selectedEntityId` is set):

| Base path | Resolved form |
|---|---|
| `/api/entity` | `/api/entity?entityId={id}` |
| `/api/visualizer/chat-history` | `/api/visualizer/chat-history?entityId={id}` |
| `/api/brain/status` | `/api/brain/status?entityId={id}` |
| `/api/neurochemistry` | `/api/neurochemistry?entityId={id}` |
| `/api/memory-graph/stats` | `/api/memory-graph/stats?entityId={id}` |
| `/api/memory-graph/full-mind` | `/api/memory-graph/full-mind?entityId={id}` |

**Also in** `client/js/neural-viz/renderer.js:282-284`: same pattern applied to `/api/memory-graph/nodes`, `/api/traces`, `/api/belief-graph/nodes` before `Promise.all()` fetches.

**Static scan note:** The static scan captures the base path literals but not the `?entityId=X` variant, so the cross-entity query capability is invisible to the endpoint map.

---

### 2d — LLM Proxy and Direct External Endpoint

**File:** `client/js/pipeline.js:45`

```js
function smartFetch(endpoint, options) {
  const isLocal = endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
  return isLocal ? fetch(endpoint, options) : proxyFetch(endpoint, options);
}
```

**Pattern:** `endpoint` is the LLM API URL from the active provider config (OpenRouter URL or custom Ollama URL). Resolved at runtime from `activeConfig.endpoint` or `runtime.endpoint`.

**Two paths:**
1. **Local** (`localhost`/`127.0.0.1`): direct browser fetch to the Ollama API — bypasses the proxy
2. **Remote**: routed through `POST /api/proxy` with `{ url, method, headers, body }` payload

The proxy route (`/api/proxy`) is therefore a general-purpose HTTP relay. The static scan captures `/api/proxy` as an endpoint but cannot enumerate what external targets it will be asked to reach.

---

### 2e — SharedAPI / SlashCommands Path Parameter

**Files:** `client/shared/api.js:11,16` — `get(path)`, `post(path)`.  
**File:** `client/js/apps/core/slash-commands.js:388,393` — `_get(path)`, `_post(path)`.

Both accept `path` as a parameter. In practice all callers in the codebase pass literal path strings, so the static scan does capture them. Noted here for completeness in case future callers pass dynamic paths.

---

## Section 3 — Runtime CSS Variable Mutations

All `style.setProperty('--variable', value)` calls that mutate live CSS custom properties. These are invisible to static CSS analysis and override any value defined in theme files.

---

### 3a — Taskbar Layout Variables (desktop.js)

**File:** `client/js/desktop.js:125-131` — called from `applyTaskbarLayout()`

| CSS Variable | Value Source | Description |
|---|---|---|
| `--taskbar-scale` | `String(uiScale)` — loaded from saved config | Overall taskbar UI scale multiplier |
| `--taskbar-icon-scale` | `taskbarLayout.iconScale \|\| 1` | Icon scale within taskbar |
| `--taskbar-width` | `taskbarLayout.width + 'px'` | Taskbar total width |
| `--taskbar-height` | `taskbarLayout.height + 'px'` | Taskbar total height |
| `--taskbar-shell-space` | `(taskbarLayout.height + 40) + 'px'` | Desktop content clearance from taskbar edge |

These are set on the `#os-taskbar` element and `document.body` respectively. Any CSS rule using these variables is dependent on `applyTaskbarLayout()` having run first — before that call, these variables hold their initial CSS-file values (or are unset).

---

### 3b — Theme Customizer Variables (theme-manager.js)

**File:** `client/js/apps/optional/theme-manager.js:454-545` — called from `_applyThemeCustomToDom()` and `applyStoredThemeCustomizer()`

All variables are set on `document.documentElement` (`:root`):

| CSS Variable | Value Source |
|---|---|
| `--desktop-overlay` | Hard-coded linear-gradient string (line 454) |
| `--desktop-wallpaper` | `desktopWallpaper` — URL string from config |
| `--surface-0` | Computed rgba from `custom.backgroundEnd` + opacity |
| `--surface-1` | Computed rgba from `custom.windowColor` − 0.10 opacity |
| `--surface-2` | Computed rgba from `custom.windowColor` − 0.04 opacity |
| `--surface-3` | Computed rgba from `custom.windowColor` + 0.04 opacity |
| `--window-bg` | Computed rgba from `custom.windowColor` + `custom.windowOpacity` |
| `--text-primary` | `custom.textPrimary` — user-set colour string |
| `--text-secondary` | `custom.textSecondary` |
| `--accent` | `custom.accent` |
| `--accent-strong` | `custom.accent` (same value as `--accent`) |
| `--app-surface` | `'var(--surface-1)'` — CSS variable reference |
| `--app-surface-alt` | `'var(--surface-2)'` |
| `--app-surface-elevated` | `'var(--surface-3)'` |
| `--app-text` | `custom.textPrimary` |
| `--app-text-muted` | `custom.textSecondary` |
| `--app-input-bg` | `custom.inputBg` (set three times — normal, hover, focus) |
| `--app-input-text` | `custom.inputText` |
| `--app-input-placeholder` | `custom.textSecondary` |
| `--app-input-border` | Computed rgba from `custom.windowColor` + 0.06 opacity |
| `--app-input-border-focus` | `custom.accent` |
| `--app-input-focus-ring` | Computed rgba from `custom.accent` at 0.18 |

**Cleanup path:** `_clearThemeCustomFromDom()` at line 550 removes all 23 properties via `removeProperty`. Called when resetting to default theme.

**Source of values:** All `custom.*` properties come from `_readStoredThemeCustom()` which reads from `localStorage`. The values are passed directly to `setProperty` with no sanitisation. CSS variable values are generally low-risk injection surfaces, but arbitrary string injection into CSS custom properties is noted.

---

## Section 4 — Skill-Driven / Tab-Loaded Function Calls

Inline event handlers in dynamically loaded tab HTML files that call functions not present in the global function registry (because their defining JS files are loaded outside the static analysis window or are optional).

---

### 4a — Overview of the Loading Path

Core and non-core tab HTML files are fetched at runtime by `core-html-loader.js` and `non-core-html-loader.js`. Each file's `<script>` tags are executed via `ShadowContentLoader.executeInlineScript()` (`new Function(code)()`). Their companion JS files (e.g. `browser-app.js`) are loaded as `<script src>` tags in `client/index.html` — meaning the functions they define ARE global, but only when the optional JS has been included.

**Key risk:** The inline HTML handlers in non-core tab files assume `window.X` exists. If the companion JS is absent or fails to load, all button clicks silently error (`fn is not a function`).

---

### 4b — tab-browser.html Inline Callers

**File:** `client/apps/non-core/core/tab-browser.html`  
**Companion JS:** `client/js/apps/optional/browser-app.js`

The following function names are called from inline `onclick`/`oninput`/`onkeydown` handlers. They are not in the static function registry (defined inside the `browser-app.js` IIFE or only registered on window dynamically):

| Function Called | Handler Type | Note |
|---|---|---|
| `browserNewTab()` | onclick | |
| `browserGoBack()` | onclick | |
| `browserGoForward()` | onclick | |
| `browserReload()` | onclick | |
| `browserNavigateFromInput()` | onkeydown (Enter) | |
| `browserToggleBookmark()` | onclick | |
| `browserOpenBookmarkManager()` | onclick | |
| `browserOpenHistoryManager()` | onclick | |
| `browserToggleDownloads()` | onclick | |
| `browserOpenExternal()` | onclick | |
| `browserToggleLLMMode()` | onclick | |
| `_browserShowPageView()` | onclick | Private-convention name (underscore prefix) |
| `_browserShowHomeView()` | onclick | Private-convention name |
| `browserExportBookmarks()` | onclick | |
| `browserImportBookmarks()` | onclick | |
| `browserCloseBookmarkManager()` | onclick | |
| `_bmFilterChanged()` | oninput | Private-convention name |
| `_bmFolderChanged()` | onchange | Private-convention name |
| `bmAddBookmarkFromManager()` | onclick | |
| `browserExportHistory()` | onclick | |
| `histDeleteToday()` | onclick | |
| `histClearAll()` | onclick | |
| `browserCloseHistoryManager()` | onclick | |
| `_histFilterChanged()` | oninput | Private-convention name |
| `browserToggleEphemeral()` | onclick | |
| `browserNewResearchSession()` | onclick | |
| `browserExtractPage()` | onclick | |
| `browserSummarizePage()` | onclick | |
| `browserExtractStructured('outline'\|'entities'\|'tables'\|'links')` | onclick | String arg passed inline |
| `browserAskPage()` | onclick | |
| `browserSaveToMemory()` | onclick | |
| `_llmClearOutput()` | onclick | Private-convention name |
| `browserConfirmSave()` | onclick | |
| `browserCancelSave()` | onclick | |

**Functions with underscore prefix** (`_browserShowPageView`, `_browserShowHomeView`, `_bmFilterChanged`, `_bmFolderChanged`, `_histFilterChanged`, `_llmClearOutput`) use a private naming convention but are called from HTML event handlers, meaning they must be on `window`. Static analysis reads them as "private" and does not include them in cross-reference tables.

---

### 4c — Other Non-Core App Inline Callers

| Tab | Function | Defined In |
|---|---|---|
| `tab-dreamdiary.html` | `loadDreamDiary()` | `js/apps/optional/dream-diary.js` (registered on window) |
| `tab-lifediary.html` | `loadLifeDiary()` | `js/apps/optional/life-diary.js` (registered on window) |
| `tab-dreamgallery.html` | `loadDreamGallery()` | `js/apps/optional/dream-gallery.js` |
| `tab-dreamgallery.html` | `generateMemoryArt()` | `js/apps/optional/dream-gallery.js` |
| `tab-dreamgallery.html` | `toggleImageGenSettings()` | `js/apps/optional/dream-gallery.js` |
| `tab-dreamgallery.html` | `onImageGenModeChange()` | `js/apps/optional/dream-gallery.js` |
| `tab-dreamgallery.html` | `saveImageGenSettings()` | `js/apps/optional/dream-gallery.js` |
| `tab-dreamgallery.html` | `submitGenerateArt()` | `js/apps/optional/dream-gallery.js` |

---

## Section 5 — Server Route Expectations

Complete list of every `/api/` route the frontend expects to exist, combining the static scan (117 endpoints in `system-map.md`) with dynamic routes found in Sections 1–4 above.

Routes captured by static scan are marked ✅. Routes revealed only by manual trace are marked ⚠ (not in static scan) or 🔸 (in scan but only as base path — actual runtime form has query params).

---

### 5a — Dynamic / Missing from Static Scan

| Route | Method | Source | Notes |
|---|---|---|---|
| `POST /api/vfs/mkdir` | POST | `vfs.js` concat | ⚠ Concat from BASE constant |
| `POST /api/vfs/write` | POST | `vfs.js` concat | ⚠ |
| `POST /api/vfs/delete` | POST | `vfs.js` concat | ⚠ |
| `POST /api/vfs/rename` | POST | `vfs.js` concat | ⚠ |
| `POST /api/vfs/move` | POST | `vfs.js` concat | ⚠ |
| `GET /api/vfs/list?path=...` | GET | `vfs.js` URLSearchParams | ⚠ |
| `GET /api/vfs/read?path=...` | GET | `vfs.js` URLSearchParams | ⚠ |
| `/api/entity?entityId={id}` | GET | `visualizer.js` appendEntityId | 🔸 Base `/api/entity` in scan |
| `/api/visualizer/chat-history?entityId={id}` | GET | `visualizer.js` | 🔸 |
| `/api/brain/status?entityId={id}` | GET | `visualizer.js` | 🔸 Base `/api/brain/status` in scan |
| `/api/neurochemistry?entityId={id}` | GET | `visualizer.js` | 🔸 Base in scan |
| `/api/memory-graph/stats?entityId={id}` | GET | `visualizer.js` | 🔸 |
| `/api/memory-graph/full-mind?entityId={id}` | GET | `visualizer.js` | 🔸 |
| `/api/memory-graph/nodes?entityId={id}` | GET | `renderer.js` | 🔸 Base in scan |
| `/api/traces?entityId={id}` | GET | `renderer.js` | 🔸 |
| `/api/belief-graph/nodes?entityId={id}` | GET | `renderer.js` | 🔸 |
| `{userUrl}/api/tags` | GET | `auth.js`, `setup-ui.js`, `simple-provider.js` | External Ollama — NOT a server route |
| `{llmEndpoint}/v1/chat/completions` | POST | `pipeline.js` smartFetch (local path) | External LLM — direct browser fetch when localhost |

### 5b — Routes Found in Manual Trace Confirmed Present in Static Scan

The following routes were found in dynamic trace but were also captured correctly by the static scan (confirming the static scan's coverage is broad):

`/api/brain/dream-cycle`, `/api/brain/ltm`, `/api/brain/sleep`, `/api/persona (GET+POST)`, `/api/memories`, `/api/entity-config`, `/api/proxy`, `/api/vfs` (base), `/api/sleep/config`

---

## Section 6 — Brain Loop & Sleep Cycle Functions

---

### 6a — Server-Side Brain Loop Phases

The `BrainLoop` class (`server/brain/cognition/brain-loop.js`) runs a `setInterval` every 30 seconds (configurable). Each tick calls all phases in sequence via `PHASES` (an ordered array from `server/brain/cognition/phases/index.js`).

**Phase execution order (every 30-second tick):**

| Order | Phase Name | File | Frequency |
|---|---|---|---|
| 1 | `archive` | `phase-archive.js` | Every tick |
| 2 | `archive_index` | `phase-archive-index.js` | Every tick |
| 3 | `decay` | `phase-decay.js` | Daily cadence only (guarded by `lastDecayTime`) |
| 4 | `goals` | `phase-goals.js` | Every tick |
| 5 | `dreams` | `phase-dreams.js` | Every N ticks (`dreamInterval`, default 5 = 2.5 min) |
| 6 | `traces` | `phase-traces.js` | Every tick |
| 7 | `identity` | `phase-identity.js` | Every tick |
| 8 | `beliefs` | `phase-beliefs.js` | Every tick |
| 9 | `deep_sleep` | `phase-deep-sleep.js` | Every N ticks (`deepSleepInterval`, default 150 = 75 min) |
| 10 | `neurochemistry` | `phase-neurochemistry.js` | Every tick |
| 11 | `somatic` | `phase-somatic.js` | Every tick |
| 12 | `hebbian` | `phase-hebbian.js` | Every tick |
| 13 | `pruning` | `phase-pruning.js` | Every tick |
| 14 | `consolidation` | `phase-consolidation.js` | Every tick |
| 15 | `boredom` | `phase-boredom.js` | Every tick |
| 16 | `conscious_stm` | `phase-conscious-stm.js` | Every tick |

Each phase runs inside a per-phase `try/catch`. Phase errors increment `_health.perPhase[name].consecutiveErrors`. After `maxPhaseErrorsPerTick` (default 5) errors in a single tick, a circuit breaker fires. The circuit breaker has a 2-minute cooldown (`_circuitBreakerCooldownMs`). During cooldown, ticks are skipped and a `cycle_skipped` SSE event fires.

**State persisted to disk by the loop:**
- `memories/brain-loop-state.json` — `cycleCount` + `savedAt`. Written on every tick by `_saveState()`.

---

### 6b — SSE Events Emitted and Their UI Handlers

All events are emitted on the `/api/brain/events` EventSource stream. The client registers all listeners in `initBrainSSE()` (`client/js/apps/core/chat.js:107`).

**Orchestration pipeline events** (fire per chat message, driven by the chat orchestrator):

| Event | UI Handler | UI Effect |
|---|---|---|
| `connected` | `lg('ok', ...)` | Log panel only |
| `orchestration_start` | `setThinkingLive()`, `resetThoughtProcess()` | Opens thinking dropdown, resets phase tracker |
| `phase_start` | `appendThinkingLine()`, `setThoughtPhase()`, `reportPipelinePhase()` | Labels phase in thinking panel and sidebar |
| `phase_detail` | `appendThinkingLine()`, `addSystemToLog()`, `reportPipelinePhase()` | Logs detail to thinking panel and log panel |
| `phase_complete` | `appendThinkingLine()`, `setThoughtPhase()`, `reportPipelinePhase()` | Marks phase done with duration |
| `orchestration_complete` | `fillThinkingFinal()`, `fillThoughtProcessFinal()`, `lg()`, model label update | Fills structured thought panel, updates model badge, logs token usage |

**Brain loop background events** (fire every 30-second tick):

| Event | UI Handler | UI Effect |
|---|---|---|
| `brain_cycle_start` | `updateBrainIndicator('active', ...)`, `updateDeepSleepBadge()` | Updates brain status dot and DeepSleep countdown badge |
| `brain_phase` | `updateBrainIndicator('active', phaseLabel)` | Shows current phase name in brain status dot |
| `brain_cycle_complete` | `updateBrainIndicator('active', ...)` | Shows tick-done label in brain status dot |
| `brain_boredom_action` | Adds chat bubble (reach_out) OR `addSystemToLog()` | Entity posts autonomously to chat or to log only |
| `chat_follow_up` | `queueTyping(async () => ...)` → `renderAssistantTyping()` | Renders entity follow-up message with typing animation |

**Task pipeline events** (forwarded to `window.handleTaskSSEEvent`):

| Event | Forwarded To |
|---|---|
| `task_milestone` | `window.handleTaskSSEEvent('task_milestone', d)` |
| `task_needs_input` | `window.handleTaskSSEEvent(...)` |
| `task_complete` | `window.handleTaskSSEEvent(...)` |
| `task_error` | `window.handleTaskSSEEvent(...)` |
| `task_steering_injected` | `window.handleTaskSSEEvent(...)` |

`window.handleTaskSSEEvent` is expected to be defined by `task-ui.js` or `task-frontman.js`. If those files are absent or haven't loaded, these events are silently dropped (the `typeof window.handleTaskSSEEvent === 'function'` guard prevents errors).

---

### 6c — Client-Side Sleep Cycle (startSleep)

**Trigger:** Called by `subconsciousCheck()` when chat character count exceeds the archive threshold, or manually via the sleep button.

**Guard state read:** `sleeping` flag (module-level in `app.js`, checked before entry).

**Phase sequence:**

| Phase | Action | API Called | State Mutated |
|---|---|---|---|
| Setup | `sleeping = true`, show `#sleepOverlay` | — | `sleeping`, DOM |
| Phase 0 | Compress current chat via `callLLM()`, save as LTM | `POST /api/brain/ltm` (fallback: `saveMemoryToServer`) | `preSleepArchive` local var |
| Notify server | Fire-and-forget brain loop sleep trigger | `POST /api/brain/sleep` | Server brain state |
| Phase 1 | Load current persona | `GET /api/persona` | `persona` local var |
| Phase 2 | Fetch memory archives | `GET /api/memories` | `archives` local var |
| Phase 3 | (Attempted: read system prompt — currently silent catch) | `GET /api/system-prompt` | None (fails silently) |
| Phase 4 | Build dream prompt, call dream LLM | `POST /api/brain/dream-cycle` | `dreamResult` local var |
| Phase 5 | Parse dream result, write new persona | `POST /api/persona` | Persona JSON on server |
| Phase 6 | Call `clearChat()` then inject `[WAKE-FROM-SLEEP]` user message, call LLM | `POST /api/chat` (via `callChatLLM()`) | **`chatHistory` array — fully reset** |
| Finally | `sleeping = false`, hide overlay, `updateSubIndicator()` | — | `sleeping`, DOM |

**State other systems must observe after sleep ends:**

- `chatHistory` is reset to `[{ role: 'system', content: CHAT_SYSTEM_PROMPT }]` then a `[WAKE-FROM-SLEEP]` user message appended. Any in-progress message queued before sleep is lost.
- `sleeping = false` — `subconsciousCheck()` will re-arm; the subconscious threshold resets because chat was cleared.
- The server-side persona JSON is updated and will be loaded by the next chat pipeline run.
- `chatBusy = false` is explicitly restored at the end of Phase 6, unblocking future `sendChatMessage()` calls.

**Error path:** On any phase error, the `catch` block fires. `chatHistory` is NOT restored if it was already cleared in Phase 6 before the error. The sleep overlay is closed and `sleeping = false` is set in the `finally` block regardless.

**Phase 3 silent failure:** The `fetch('/api/system-prompt')` call in Phase 3 is inside a bare `try/catch` block with no error handling — it silently fails and continues. This means `currentMeta` (local variable) is always empty, and the phase has no effect. This is a dormant code path.

---

## Section 7 — CSS Namespace Conflict

---

### 7a — Current State

The codebase uses **only one CSS class namespace**: `nk-s-XXXX` (30 classes, `0001`–`0030`).

The namespace `sys-inline-XXXX` referenced in `.github/copilot-instructions.md` **does not exist anywhere in the codebase**. Zero occurrences found in any HTML, JS, or CSS file in `project/client/`. The instructions describe the **planned target state** for a future rename — the rename has not been performed.

There is therefore **no namespace conflict** at runtime. There are no duplicate rules and no collision risk. The "two namespaces" situation described in the instructions is an aspirational/documentation state gap, not a live codebase problem.

---

### 7b — Files Using `nk-s-` Classes

| File | Classes Used |
|---|---|
| `client/css/system-shared.css` | Definitions for all 30 (`nk-s-0001` – `nk-s-0030`) |
| `client/index.html` | `nk-s-0022` |
| `client/apps/core/overlays/boot-login.html` | `nk-s-0002`, `nk-s-0003`, `nk-s-0010`, `nk-s-0029`, `nk-s-0030` |
| `client/apps/core/tab-settings.html` | `nk-s-0011`, `nk-s-0012`, `nk-s-0025`, `nk-s-0027` |
| `client/apps/core/tab-users.html` | `nk-s-0015` |
| `client/apps/core/tab-advanced.html` | `nk-s-0006`, `nk-s-0013`, `nk-s-0018`, `nk-s-0019`, `nk-s-0020`, `nk-s-0021`, `nk-s-0026` |
| `client/apps/core/tab-activity.html` | `nk-s-0007`, `nk-s-0008`, `nk-s-0014` |
| `client/apps/core/tab-archive.html` | `nk-s-0001`, `nk-s-0004`, `nk-s-0005`, `nk-s-0007`, `nk-s-0009`, `nk-s-0014`, `nk-s-0016`, `nk-s-0017`, `nk-s-0024`, `nk-s-0028` |
| `client/apps/core/tab-debugcore.html` | `nk-s-0004`, `nk-s-0005`, `nk-s-0007`, `nk-s-0009`, `nk-s-0023`, `nk-s-0028` |

---

### 7c — All 30 Classes — Duplicate Analysis

`sys-inline-XXXX` does not exist, so there are no inter-namespace duplicates. The table below checks for functional overlap with existing utility classes in `ui-v2.css` and common HTML/CSS patterns:

| Class | Rule | Duplicate of `sys-inline-*`? | Has equivalent in `ui-v2.css`? |
|---|---|---|---|
| `nk-s-0001` | `font-size: var(--text-xs); color: var(--text-secondary)` | No (sys-inline not present) | Partial — `.text-xs-c` + `.text-secondary-c` combo achieves same |
| `nk-s-0002` | `display:block; font-size:.72rem; color:#444; margin-bottom:.3rem` | No | No — hardcoded `#444` makes it unique |
| `nk-s-0003` | `width:100%; background:#fff; color:#111; border-color:#bbb` | No | No — light-mode input override, no equivalent |
| `nk-s-0004` | `padding-bottom: var(--space-2)` | No | No direct single-property equivalent |
| `nk-s-0005` | `font-size: var(--text-md); margin: 0` | No | No |
| `nk-s-0006` | `margin-bottom:space-4; border-bottom:1px solid border-default; padding-bottom:space-3` | No | Partial — `.settings-section-header` in ui-v2 has similar but not identical |
| `nk-s-0007` | `font-size: var(--text-lg); margin: 0` | No | No |
| `nk-s-0008` | `margin-top: var(--space-4)` | No | No |
| `nk-s-0009` | `margin: 0` | No | No |
| `nk-s-0010` | `margin-bottom: .75rem` | No | No |
| `nk-s-0011` | `align-self: center` | No | No |
| `nk-s-0012` | `padding: .35rem .7rem` | No | No |
| `nk-s-0013` | `font-size: var(--text-base)` | No | No |
| `nk-s-0014` | `display:flex; align-items:center; gap:space-3; margin-bottom:space-4` | No | Partial — `.flex` + `.items-center` not composable with gap |
| `nk-s-0015` | `margin-bottom: var(--space-4)` | No | No |
| `nk-s-0016` | Inline select control styling | No | No |
| `nk-s-0017` | Inline date/month input styling | No | No |
| `nk-s-0018` | `margin:0; border:none; background:transparent; padding:space-4; border-top:1px solid border-default` | No | Partial — `.settings-section` in ui-v2 exists but different properties |
| `nk-s-0019` | `color: var(--info)` | No | Close — `.text-info-c` may exist in ui-v2 |
| `nk-s-0020` | `color: var(--warning)` | No | Close — `.text-warn-c` may exist in ui-v2 |
| `nk-s-0021` | `gap: var(--space-4)` | No | No |
| `nk-s-0022` | `min-width: 150px` | No | No |
| `nk-s-0023` | `max-height:44vh; overflow:auto; font-family:mono; font-size:text-xs` | No | No |
| `nk-s-0024` | `display:flex; gap:space-2; margin-bottom:space-3` | No | No |
| `nk-s-0025` | Full-width styled text input | No | Partial — `.inp` base class exists but this adds margin |
| `nk-s-0026` | `color: var(--accent-green)` | No | No direct equivalent |
| `nk-s-0027` | `flex:1; padding:.75rem; font-size:1rem` | No | No |
| `nk-s-0028` | `padding:space-4; max-width:1080px; margin:0 auto` | No | No |
| `nk-s-0029` | `margin-bottom: 1.25rem` | No | No |
| `nk-s-0030` | `width: 100%` | No | `.w-full` in ui-v2 achieves same |

**Summary:** No duplicates between namespaces (the second namespace doesn't exist). There are some functional overlaps with `ui-v2.css` utility combos, but these are not conflicts — they are pre-existing class consolidations from inline styles. The pending action described in the instructions (rename `nk-s-` → `sys-inline-`) would be a pure rename, not a deduplication exercise.

---

## Section 8 — What The Script Cannot Verify

Patterns, dependencies, and runtime behaviours invisible to static analysis and not covered by Sections 1–7.

---

| # | Finding | Risk Level | Details |
|---|---|---|----|
| 1 | **Shadow DOM script execution scope** | **High** | `new Function(code)()` in `ShadowContentLoader` executes app scripts in global scope. Any `<script>` in a tab HTML file can read/write window globals, override registered functions, or conflict with other tabs. No isolation, no content policy applied. |
| 2 | **`window[app.action]` open surface** | **Medium** | The start menu action dispatch (`window-manager.js:763`) would call any global function whose name appears in a start menu entry's `action` field. Currently only 3 values are used, but there is no allowlist. |
| 3 | **Entity ID query parameter injection** | **High** (server boundary) | The frontend appends `?entityId=X` from `selectedEntityId` state to many API calls. `selectedEntityId` originates from user interaction in the visualizer. The server must validate that the requesting session owns the requested entity. The client performs no validation. |
| 4 | **Sleep cycle `chatHistory` loss on error** | **Medium** | `clearChat()` is called in Phase 6 before the wake LLM call. If the LLM call errors, the `catch` in `startSleep` does not restore `chatHistory`. The session is lost with no recovery path. |
| 5 | **Phase 3 sleep cycle is dead code** | **Low** | `fetch('/api/system-prompt')` in sleep Phase 3 is wrapped in a `try/catch` with no read or use of the response. `currentMeta` stays `''`. The phase has no effect. May indicate an unfinished feature. |
| 6 | **Boredom engine unbounded chat injection** | **Medium** | `brain_boredom_action` with `activity === 'reach_out'` injects a chat bubble via `addChatBubble` without rate limiting on the client side. If the boredom engine fires repeatedly in rapid succession (e.g. loop bug or fast cycle interval), the chat panel fills with autonomous messages. |
| 7 | **SSE reconnection event gap** | **Low** | When `brainEventSource` closes and reconnects after 5 seconds, any `brain_cycle_start`, `brain_phase`, `orchestration_complete`, or `chat_follow_up` events emitted during the gap are permanently lost. The DeepSleep countdown badge and brain indicator become stale until the next tick. |
| 8 | **Ollama URL cross-origin direct fetch** | **Medium** | `auth.js`, `setup-ui.js`, and `simple-provider.js` fetch `url + '/api/tags'` directly from the browser without routing through `/api/proxy`. The `url` value is taken directly from a user-controlled DOM input. A user could point this at any accessible address. No URL validation exists client-side. |
| 9 | **VFS path values not sanitised client-side** | **High** (server boundary) | The VFS client sends user-visible file/folder path strings directly to the server via `POST /api/vfs/write` etc. Path traversal (`../../etc`), null bytes, or excessively long paths must be sanitised entirely server-side. The client performs only a character strip (`/[<>:"/\\|?*]/g`) on the filename component, not the full path. |
| 10 | **localStorage theme data CSS injection** | **Low** | `_readStoredThemeCustom()` reads colour strings from localStorage and passes them to `setProperty`. If localStorage is corrupt or externally written (XSS on another page with shared origin), CSS variable values could be poisoned. CSS variable injection is not executable, so risk is limited to visual corruption. |
| 11 | **Non-core app function namespace collision** | **Medium** | Multiple non-core apps define functions globally via `new Function(code)()`. If two apps define the same function name (e.g. a `loadData()` helper), the second load silently overwrites the first. No namespace isolation or collision detection exists. |
| 12 | **`chatBusy` flag shared across sleep/chat** | **Low** | The `chatBusy` flag is set during sleep Phase 6 (the wake LLM call). If the user navigates away and back, or if `chatBusy` is stuck `true` from a prior crashed request, `sendChatMessage()` is silently blocked with no UI feedback other than the submit button state. |
| 13 | **Brain loop `cycleCount` state on server restart** | **Low** | `cycleCount` is persisted to `brain-loop-state.json` on every tick. On restart, it is restored correctly. The DeepSleep phase fires at `cycleCount % deepSleepInterval === 0`. Restarting with a `cycleCount` value that is a multiple of `deepSleepInterval` will trigger DeepSleep on the first tick after restart. |
| 14 | **`window.handleTaskSSEEvent` duck-typed dependency** | **Medium** | Task SSE events (`task_milestone`, `task_complete`, etc.) are forwarded to `window.handleTaskSSEEvent(...)` with a `typeof` guard. If `task-ui.js` or `task-frontman.js` hasn't loaded yet when the first task event fires (startup race), the event is silently dropped. No queue or replay mechanism exists. |
| 15 | **Theme CSS variable removal on theme switch** | **Low** | `_clearThemeCustomFromDom()` removes CSS props via `removeProperty`. If a theme switch fires while an animation or `requestAnimationFrame` loop is reading a CSS variable value, the value briefly becomes unset (resolves to initial value). Could cause a single-frame flicker on theme change. |
| 16 | **External LLM streaming response cancellation** | **Low** | `pipeline.js` uses `fetch` with `ReadableStream` consumption for streaming LLM responses. There is no visible `AbortController` integration in the pipeline layer itself (though individual call sites may add one). If a streaming response stalls mid-stream, the client waits indefinitely. |
| 17 | **`boot-login.html` inline style overrides `nk-s-` rules** | **Low** | `boot-login.html` contains a `<style>` block that re-declares `#loginOverlay .nk-s-0010`, `.nk-s-0029`, `.nk-s-0002`, `.nk-s-0030` with modified values scoped to `#loginOverlay`. This means the same class numbers have different visual meanings inside the login overlay — an in-document locality coupling invisible to any global CSS audit. |

---

## Section 9 — When To Regenerate The System Map

Run `npm run map` after any of the following:

### Always regenerate after:
- Adding or removing any `.js`, `.html`, or `.css` file
- Adding a new tab (core or non-core)
- Adding a new API endpoint call from the frontend
- Adding a new `localStorage` key
- Completing any Phase from `docs/project-status-audit.md`
- Any session where more than 3 files were modified

### Never needed for:
- Text content changes inside existing HTML
- Bug fixes that don't add/remove functions
- CSS value tweaks inside existing classes
- Comment cleanup

## When To Run Scripts

```
npm run map       — after any structural file change
npm run validate  — after any session touching sleep, brain loop,
                    vfs, auth, shadow-content-loader, or window-manager
```

---

*End of System Map Addendum — Manual Trace Pass*
