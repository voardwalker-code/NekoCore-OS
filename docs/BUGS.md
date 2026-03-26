# NekoCore OS — Known Bugs & Issues

Logged after testing session: 2026-03-15. Priority and complexity estimates are approximate.

---

## BUG-01 — Branding: Account setup shows "REM System" instead of "NekoCore OS"
**Area:** Account Setup / Onboarding UI  
**Severity:** Low (cosmetic)  
**Status:** Fixed  
**Description:** Throughout the account creation and setup flow, the product is referred to as "REM System". All instances need to be updated to "NekoCore OS".  
**Expected:** All visible product name references in the setup flow read "NekoCore OS".

---

## BUG-02 — Account setup: Input text is near-invisible against background
**Area:** Account Setup UI  
**Severity:** Medium (usability)  
**Status:** Fixed  
**Description:** The text color inside input fields is almost the same as the background color, making typed text very hard to see during account creation.  
**Expected:** Input field text has sufficient contrast against its background.

---

## BUG-03 — OpenRouter setup: No sign-up link and no BYOK guidance
**Area:** Settings / LLM Provider Setup  
**Severity:** Low (UX)  
**Status:** Fixed  
**Description:** The OpenRouter configuration panel does not include a link to sign up at openrouter.ai. New users have no guidance on where to get an API key. Additionally, the UI does not communicate that BYOK (Bring Your Own Key) from *any* OpenAI-compatible provider is supported — users can point the `endpoint` field at Mistral, Together AI, Groq, Anyscale, a local proxy, or any compatible service by filling in that provider's chat completions URL, API key, and model name. This capability is completely hidden.  
**Expected:**  
- A "Sign up here →" link opens openrouter.ai in the browser.  
- A visible note/tooltip in the provider setup panel explains that any OpenAI-compatible endpoint works — not just OpenRouter — with a brief example (e.g. "Using Groq? Enter `https://api.groq.com/openai/v1/chat/completions` as the endpoint").  
**Technical note:** The backend already supports this — `normalizeAspectRuntimeConfig` in `server/services/config-runtime.js` accepts any `endpoint` + `apiKey` + `model` combination and auto-infers the type. No backend changes needed, UI disclosure only.

---

## BUG-04 — OpenRouter setup: Default model is wrong and Mercury 2 is missing
**Area:** Settings / LLM Provider Setup  
**Severity:** Medium  
**Status:** Fixed  
**Description:** The default selected model in the OpenRouter model dropdown is incorrect — it should be blank/empty so the dropdown functions as a selector. Additionally, Mercury 2 is not in the model list.  
**Expected:**  
- Default model field is blank (no pre-selected value).  
- Mercury 2 is listed as a selectable model option.

---

## BUG-05 — Entity setup: Personality traits require manual text entry with no assistance
**Area:** Entity Creator  
**Severity:** Medium (UX)  
**Status:** Fixed  
**Description:** The personality traits field requires the user to freehand type traits with no guidance. There is no autocomplete, no dropdown list, and no suggestion system.  
**Expected:**  
- Traits field offers a dropdown list of predefined trait options.  
- Autocomplete suggestions appear as the user types.  
- An "auto" or "random" option is available to fill traits automatically.

---

## BUG-06 — Chat app opens after entity creation with no entity loaded
**Area:** Entity Creator → Chat handoff  
**Severity:** High  
**Status: FIXED**  
**Description:** After completing entity creation, the Chat app opens but the entity is not present in the chat window. The entity appears to be checked out but not loaded into the chat session.  
**Expected:** Newly created entity is immediately active and loaded in the chat window.
**Resolution update:** UX changed to prevent this mismatch state. After creation, embed handoff now opens the Entity details/preview card (Entity tab) for the new entity with explicit manual checkout, instead of auto-opening Chat.

---

## BUG-07 — Entity created as checked-out instead of checked-in (persistent bug)
**Area:** Entity Creator / Entity State  
**Severity:** High  
**Status: FIXED**  
**Description:** After entity creation, the entity is placed in a "checked out" state instead of "checked in". This is a previously reported and previously fixed bug that has regressed. The entity should always be created as checked in.  
**Expected:** Newly created entity state is checked-in immediately after creation.  
**Fix:** Removed `entityCheckout.checkout()` calls from all four server-side creation endpoints (`postEntitiesCreate`, `postEntitiesCreateHatch`, `postEntitiesCreateGuided`, `postEntitiesCreateCharacter`). Entities are now created as checked-in. Updated `syncParentAfterCreate()` in `create.js` to route to the new entity's preview/details card (`sidebarSelectEntity`) instead of auto-loading chat.  
**Patch note:** Fixed together with BUG-08.

---

## BUG-08 — Releasing a bugged (checked-out) entity breaks it: "Entity Not Found" error
**Area:** Entity Management / Checkout System  
**Severity:** High  
**Status: FIXED**  
**Description:** If an entity is stuck in the broken checked-out state (see BUG-07) and the user tries to release/check it in via the release button, the entity becomes permanently broken. Subsequent attempts to check it out return "Entity Not Found".  
**Expected:** Release/check-in should recover from a bad checkout state gracefully without corrupting the entity.  
**Fix:** Root cause eliminated by BUG-07 fix. The trigger condition (entity stuck in checked-out state with client unaware) can no longer occur.  
**Patch note:** Fixed together with BUG-07.

---

## BUG-09 — Using Mercury 2 for both Conscious and Orchestrator causes character drift
**Area:** Brain Pipeline / LLM Routing  
**Severity:** Medium  
**Status:** Fixed  
**Description:** When Mercury 2 is used for both the Conscious (1C) and the Orchestrator (final) stages, the entity noticeably breaks character. The Orchestrator does not reliably follow the entity's persona instructions.  
**Recommendation / Best Practice to document:**  
- Best results observed: Mercury 2 for Conscious (1C) + Claude Sonnet 4 for Orchestrator.  
- Recommend against using the same model for all pipeline stages.  
- UI should surface a recommended configuration hint.

---

## BUG-10 — Onboarding is not presented as onboarding — user thinks they are chatting
**Area:** Entity Onboarding / Chat UI  
**Severity:** High (UX/clarity)  
**Status: FIXED**  
**Description:** During the onboarding process after entity creation, there is no clear visual indication that onboarding is taking place. The user believes they are in a normal chat session with the entity. This causes confusion about what is happening and what the entity knows at this stage.  
**Expected:**  
- Clear onboarding header or banner visible during onboarding phase.  
- Progress indicator showing onboarding steps.  
- Once onboarding completes, transition is clearly communicated before normal chat begins.
**Fix:** Removed chat-side onboarding interception from the orchestrator path so chat messages are no longer interpreted as onboarding answers. Onboarding data is now expected from Creator/setup flows (`/api/entities/onboarding-seed`) rather than runtime chat prompts.

---

## BUG-11 — Sleep button not working: animation flashes then returns to chat
**Area:** Chat App / Sleep System  
**Severity:** High  
**Status: FIXED**  
**Description:** Pressing the Sleep button causes a brief flash on the sleep graphic animation but immediately returns to the chat view without running the sleep/REM cycle process.  
**Expected:** Sleep button triggers the full REM sleep cycle; UI shows sleep progress and only returns to chat on completion or user cancellation.
**Fix:** `startSleep()` now requires an active entity before entering the overlay path and uses the freshly generated pre-sleep compressed session as a fallback input when `/api/memories` returns no archive files, preventing immediate abort.

---

## BUG-12 — "Compress and Save" appears as "Save" and neither function works
**Area:** Chat App / Memory Compression  
**Severity:** High  
**Status: FIXED**  
**Description:** The Compress and Save button initially renders as just "Save". Clicking it re-labels to "Compress and Save" but clicking either state does not perform the action. Compression may be broken.  
**Expected:** Compress and Save executes chat compression into long-term memory and confirms success.
**Fix:** Chat button text now renders as "Compress and Save" from first paint. `compressChat()` fallback save path now uses a defined filename and null-safe session meta handling, preventing runtime failure when LTM endpoint fallback is used.

---

## BUG-13 — Chat scroll glitches and flickers during message stream
**Area:** Chat App / UI  
**Severity:** Medium (UX)  
**Status:** Fixed  
**Description:** When new chat messages are incoming and causing the scroll position to update, the chat scroll area visibly glitches and flickers, causing a jarring experience.  
**Expected:** Smooth scroll behavior with no flicker during message receipt.

---

## BUG-14 — Entity backstory generation is too shallow / insufficient memories created
**Status: Fixed**  
**Area:** Entity Creator / Hatch System  
**Severity:** High (quality)  
**Description:** Entity backstory generation does not produce enough memories or life history detail. Example: an entity prompted to have 12 children had no memory entries about this in its life history. The generated past is too sparse to feel real or persistent.  
**Expected:**  
- Significantly more memories generated during hatching.  
- Life history details (family, key events, relationships) are faithfully reflected in generated memories.  
- A user-configurable slider controls backstory depth and pre-created memory count.  
- A live estimated token cost is shown as the slider is adjusted.

---

## BUG-15 — Entity cannot invoke skills naturally; invocation UX needs redesign
**Area:** Skills System / Entity Cognition  
**Severity:** High  
**Status:** Fixed  
**Description:** The entity does not successfully invoke skills when asked. Web search was attempted multiple ways and failed silently. Root cause is likely a combination of the entity not being prompted clearly enough about available skills and overly rigid invocation requirements.  

**Design decision — ease invocation restrictions:**  
- The entity should NOT require the user to type `/skill "skill name"` or any special syntax to trigger a skill.  
- The user should be able to make a natural request (e.g. "search for the latest news on X" or "look that up") and the entity should recognize the intent and invoke the appropriate skill automatically.  
- The entity's system context/prompt must clearly list available skills and describe when and how to call them so it can make the decision itself.  

**User approval gate:**  
- When the entity correctly identifies and is about to invoke a skill, a confirmation block should be shown to the user before execution (e.g. "Entity wants to use: Web Search — query: 'latest news on X'" with Approve / Cancel buttons).  
- This keeps the user in control and responsible for any skill-triggered actions without requiring them to drive invocation manually.  

**Expected:**  
- Entity invokes skills from natural language requests with no special syntax required.  
- Skill invocation triggers a visible approval prompt for the user (when approval mode is enabled).  
- On approval, skill executes and results are incorporated into the entity's response.  
- On cancel, entity is informed the skill was not run and responds accordingly.  
- Each entity has a per-entity setting to **enable or disable the approval gate** — power users or trusted entities can run skills without a confirmation prompt; the default is enabled (approval required).  
- The toggle is accessible from the entity's settings/profile panel.

---

## BUG-16 — Entity has no dedicated workspace folder on the VFS desktop
**Area:** Entity Creator / VFS / Workspace  
**Severity:** Medium  
**Status:** Fixed  
**Description:** When an entity is created, no workspace folder is set up for it on the virtual filesystem. Each entity should automatically receive a folder at `workspace/desktop/<Entity Name>` so they have a working directory from day one, which users can then rename or move.  
**Expected:**  
- Entity creation automatically creates `workspace/desktop/<Entity Name>/` as a VFS folder.  
- Folder is visible on the desktop after creation.  
- Users can rename or move the folder as desired.

---

## BUG-17 — Entities created with all skills enabled by default
**Area:** Entity Creator / Skills System  
**Severity:** High  
**Status:** Fixed  
**Description:** When a new entity is created, all available skills are active by default. This means entities can invoke any skill immediately without the user explicitly enabling them per entity. Users have no control over which skills an entity is allowed to use at creation time, and there is no indication that skills are pre-enabled.  
**Expected:**  
- All skills are **disabled by default** on every newly created entity.  
- Users explicitly enable only the skills they want that entity to have access to, either during creation or from the entity's settings panel afterwards.  
- The entity's settings/profile panel has a clear Skills section with a per-skill enable/disable toggle.  
- This also aligns with BUG-15's per-entity approval gate — skill must be both enabled and (if approval mode is on) approved at runtime before execution.

---

## BUG-18 — NekoCore has no persistent memory — conversations are lost on reload
**Status: Fixed**  
**Area:** NekoCore System Entity / Memory  
**Severity:** High  
**Description:** NekoCore currently processes chat messages through the full Orchestrator pipeline (subconscious → dream → conscious → orchestrator) but `storeConsciousObservation`, `memoryStorage`, and `identityManager` are all passed as `null` in `processNekoCoreChatMessage`. This means no episodic memory is ever written to disk. Chat history lives only in the client-side JS array and is lost on page reload or tab close. NekoCore cannot learn from conversations, remember past exchanges, or build context over time.

**Expected:**
- Each NekoCore chat turn is stored as an episodic memory in `entities/entity_nekocore/memories/`.
- `storeConsciousObservation` is wired to write memories after each Orchestrator response, using the same mechanism regular entities use.
- Memory is retrieved on subsequent turns so NekoCore can reference prior conversations.

**Critical constraint — NO MEMORY DECAY:**
- NekoCore's memories must have `decay: 0` (no TTL eviction). Unlike regular entity memories which fade over time, NekoCore's operational memory is permanent — she is a system entity and her memory IS the system's operational history.
- The `operationalMemory: true` flag is already set on her `entity.json` — this needs to be respected by both the memory writer and any future eviction/cleanup jobs.
- When old chat memories need to be managed, a dedicated **Long-Term Storage (LTS) offload** mechanism is planned (not decay/deletion — archival). Design TBD by WrongWay.

**Technical implementation notes:**
- Wire `storeConsciousObservation` in `processNekoCoreChatMessage` (server/server.js ~line 1514) to call the same `MemoryStorage.storeObservation()` path regular entities use.
- Pass `memoryStorage` instance pointing at NekoCore's memory root.
- Ensure `decay: 0` is set on all memories written (override default decay in the writer for system entities, or check `entity.operationalMemory === true`).
- Knowledge-retrieval (`server/brain/nekocore/knowledge-retrieval.js`) already scans `nkdoc_*` dirs — extend it to also scan episodic memories so conversational context surfaces correctly.

---

## BUG-19 — Context chat accepts/sends text when no entity is checked out
**Area:** Context Chat / Entity Guard Rails  
**Severity:** High  
**Status:** Fixed  
**Description:** The main context chat can still accept/send messages even when no entity is currently checked out, which causes confusing behavior where responses can appear detached from explicit entity checkout state.

**Expected:**
- Context chat text input is guarded when no entity is checked out.
- Send action is blocked with clear guidance to check out an entity first.
- Once an entity is checked out, input and send controls re-enable automatically.

---

## BUG-20 — Visualizer does not render NekoCore OS memories while other entities do
**Area:** Visualizer / Memory Rendering  
**Severity:** High  
**Status:** Fixed  
**Description:** In the Visualizer, memory content renders correctly for regular entities such as Reveca, but NekoCore OS memories do not render. The system entity can be selected, yet its memory data is missing or not displayed in the visualizer panels.
**Fix:** NekoCore direct chat now instantiates entity-scoped `MemoryStorage` with `entityId: 'nekocore'` so new memories land in the standard entity folders instead of legacy `Memory2`. Visualizer search/detail/full-mind routes now also scan legacy entity `Memory2` folders for backward compatibility, so previously stored NekoCore memories render again without migration.

**Expected:**
- Selecting NekoCore OS in the Visualizer renders its available memories the same way regular entities do.
- Memory graph, search/detail panels, and related visualizer views treat NekoCore OS as a first-class entity source.
- If NekoCore uses a distinct storage path or schema edge case, the Visualizer handles it without dropping the render.

---

## BUG-21 — Visualizer memory panel not fully functional / NekoCore knowledge docs not ingested
**Area:** Visualizer / NekoCore OS Knowledge  
**Severity:** High  
**Status:** Fixed  
**Description:** Two related issues found after factory reset:  
1. The visualizer memory browser still has gaps — structural subdirs (`dreams/core/`, `traces/`, etc.) were counting as fake memory records (no `log.json` guard), and `dreams/` was scanned at the flat root instead of its proper `episodic/`, `semantic/`, `core/` subdirs.  
2. NekoCore's architecture doc ingestion never ran because the `Documents/current` path in both `server.js` and `reset-runtime.js` was one directory level too shallow (`project/Documents/current` instead of `NekoCore-OS-main/Documents/current`). NekoCore had no knowledge of the system she orchestrates.  
**Root cause:** Path calc off by one `..` level in two files. No guard test caught it because the ingestion silently skips missing dirs.  
**Fix applied (2026-03-16):**  
- `server.js` NK_DOCS_DIR: `path.join(__dirname, '..', 'Documents', 'current')` → `path.join(__dirname, '..', '..', 'Documents', 'current')`  
- `reset-runtime.js` docsDir default: 3 levels up → 4 levels up  
- `getMemoriesSearch` in `memory-routes.js`: added `log.json` existence guard to skip structural dirs  
- `getEntityMemoryScanDirs` in `entity-memory-compat.js`: `dreams/` flat scan replaced with proper `dreams/episodic`, `dreams/semantic`, `dreams/core` subdirs  
- `POST /api/nekocore/docs-ingest` added to `nekocore-routes.js` — triggers ingestion on demand with optional path override  
- NekoCore OS panel now has a "Knowledge Docs" section with an Ingest Docs button so users can trigger ingestion without restarting the server  
**Expected:**  
- On server start, `✓ NekoCore knowledge: ingested X doc(s)` appears (not "not found, skipping")  
- Visualizer shows only real memory records — never empty structural subdirs  
- NekoCore OS panel "Ingest Docs" button re-runs ingestion and reports success/path

---

## BUG-22 — Visualizer auto-switches to memory search and tabs disappear
**Area:** Visualizer / Tab Navigation State
**Severity:** High
**Status:** Fixed
**Description:** While using the Visualizer, the UI unexpectedly auto-switches into the memory-search view and the expected tab set disappears. This breaks navigation flow and makes it look like core visualizer tabs are missing.

**Expected:**
- Visualizer remains on the user-selected tab until explicitly changed by the user.
- Memory search opens only when explicitly triggered.
- Tab strip remains visible and stable after entity changes, searches, and refreshes.

**Initial repro notes:**
- Open Visualizer.
- Navigate between tabs.
- After interactions (entity switch/search/refresh), view jumps to memory-search and tab controls are no longer shown.

**Investigation targets:**
- Client Visualizer tab state manager and any auto-focus logic.
- Event handlers that run after search or entity selection.
- Any render path that conditionally hides/rebuilds tab controls.

---

## Summary Table

| ID | Area | Severity | Status |
|----|------|----------|--------|
| BUG-01 | Branding / Account Setup | Low | Fixed |
| BUG-02 | Account Setup UI | Medium | Fixed |
| BUG-03 | OpenRouter / BYOK UX | Low | Fixed |
| BUG-04 | OpenRouter / Model List | Medium | Fixed |
| BUG-05 | Entity Creator / Traits | Medium | Fixed |
| BUG-06 | Entity → Chat Handoff | High | Fixed |
| BUG-07 | Entity State / Checkout | High | Fixed |
| BUG-08 | Entity Release / Corruption | High | Fixed |
| BUG-09 | Brain Pipeline / LLM Routing | Medium | Fixed |
| BUG-10 | Onboarding UX | High | Fixed |
| BUG-11 | Sleep System | High | Fixed |
| BUG-12 | Compress and Save | High | Fixed |
| BUG-13 | Chat Scroll | Medium | Fixed |
| BUG-14 | Entity Backstory / Hatching | High | Fixed |
| BUG-15 | Skills / Web Search | High | Fixed |
| BUG-16 | Entity Workspace Setup | Medium | Fixed |
| BUG-17 | Skills Default State | High | Fixed |
| BUG-18 | NekoCore Persistent Memory | High | Fixed |
| BUG-19 | Context Chat / No-Entity Guard | High | Fixed |
| BUG-20 | Visualizer / NekoCore Memory Rendering | High | Fixed |
| BUG-21 | Visualizer / NekoCore Knowledge Docs Ingestion | High | Fixed |
| BUG-22 | Visualizer / Auto-Switch + Tabs Disappear | High | Fixed |
