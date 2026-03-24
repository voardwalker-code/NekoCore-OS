# Current Bugs

## 2026-03-23 - Anthropic context compaction breaks chat pipeline

Status: Mitigated (hard-disabled pending proper reimplementation)

Symptoms:
- Dream, Subconscious, Conscious, and Orchestrator calls fail with:
  - context_management: Extra inputs are not permitted
- Fallback path triggers and response quality degrades.

Where mitigation was added:
- UI lockout (compaction cannot be enabled):
  - [project/client/apps/core/tab-settings.html](project/client/apps/core/tab-settings.html#L88)
  - [project/client/apps/core/tab-settings.html](project/client/apps/core/tab-settings.html#L91)
- Client save/hydration hard-false + disabled checkbox:
  - [project/client/js/apps/core/simple-provider.js](project/client/js/apps/core/simple-provider.js#L399)
  - [project/client/js/apps/core/simple-provider.js](project/client/js/apps/core/simple-provider.js#L403)
  - [project/client/js/apps/core/simple-provider.js](project/client/js/apps/core/simple-provider.js#L423)
- Server-side config coercion (force compaction false):
  - [project/server/routes/config-routes.js](project/server/routes/config-routes.js#L147)
- Runtime hard-stop (never send context_management compaction):
  - [project/server/services/llm-interface.js](project/server/services/llm-interface.js#L261)
  - [project/server/services/llm-interface.js](project/server/services/llm-interface.js#L271)

Additional hardening in same patch set:
- Corrupted apiKey payload rejection to prevent log/error text being saved as keys:
  - [project/server/routes/config-routes.js](project/server/routes/config-routes.js#L134)
  - [project/server/routes/config-routes.js](project/server/routes/config-routes.js#L164)
  - [project/server/routes/config-routes.js](project/server/routes/config-routes.js#L173)

MA-side alignment (2026-03-24):
- MA compaction now defaults OFF for Anthropic until API-level compaction is reintroduced safely:
  - [project/MA/MA-server/MA-capabilities.js](project/MA/MA-server/MA-capabilities.js#L11)
- MA settings compaction checkbox now defaults unchecked and only hydrates enabled when explicitly true/mode:
  - [project/MA/MA-client/MA-index.html](project/MA/MA-client/MA-index.html#L281)
  - [project/MA/MA-client/MA-index.html](project/MA/MA-client/MA-index.html#L858)

Follow-up required:
- Reimplement Anthropic compaction exactly per current API contract and account tier support.
- Add integration tests for compact beta header + fallback behavior.
