// ── Client Shared · Api ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This client module drives browser-side behavior and state updates for UI
// features.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// Exposed API includes: window-attached API object.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// REM System — Shared API Client
// Thin named wrappers around fetch for all /api/* endpoints.
// Usage:  RemAPI.getEntities().then(d => ...)
//         RemAPI.loadEntity(id).then(...)
//         RemAPI.post('/api/custom', { foo: 'bar' })
// ============================================================
window.RemAPI = (function () {

  // Generic GET helper that returns parsed JSON.
  async function get(path) {
    const r = await fetch(path);
    return r.json();
  }

  // Generic POST helper with JSON body + JSON response.
  async function post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  // ── Entity endpoints ──
  // Identity lifecycle + persona operations.
  // getEntities()
  // WHAT THIS DOES: getEntities reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getEntities(...), then use the returned value in your next step.
  const getEntities        = ()        => get('/api/entities');
  const getCurrentEntity   = ()        => get('/api/entity');
  const getCurrentEntId    = ()        => get('/api/entities/current');
  // loadEntity()
  // Purpose: helper wrapper used by this module's main flow.
  // loadEntity()
  // WHAT THIS DOES: loadEntity reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call loadEntity(...), then use the returned value in your next step.
  const loadEntity         = (id)      => post('/api/entities/load', { entityId: id });
  const deleteEntity       = (id)      => post('/api/entities/delete', { entityId: id });
  const healEntity         = ()        => post('/api/entities/heal', {});
  // getPersona()
  // Purpose: helper wrapper used by this module's main flow.
  // getPersona()
  // WHAT THIS DOES: getPersona reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getPersona(...), then use the returned value in your next step.
  const getPersona         = ()        => get('/api/persona');
  const savePersona        = (data)    => post('/api/persona', data);

  // ── Memory endpoints ──
  // Retrieval, stats, and graph payloads.
  // getMemories()
  // WHAT THIS DOES: getMemories reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getMemories(...), then use the returned value in your next step.
  const getMemories        = (limit)   => get('/api/memories' + (limit ? '?limit=' + limit : ''));
  const getMemorySummary   = (id)      => get('/api/memory/summary?id=' + encodeURIComponent(id));
  const getMemoryStats     = ()        => get('/api/memory-stats');
  // getMemoryGraph()
  // Purpose: helper wrapper used by this module's main flow.
  // getMemoryGraph()
  // WHAT THIS DOES: getMemoryGraph reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getMemoryGraph(...), then use the returned value in your next step.
  const getMemoryGraph     = ()        => get('/api/memory-graph/nodes');
  const getMemoryGraphFull = ()        => get('/api/memory-graph/full-mind');
  const getLastMemory      = ()        => get('/api/entity-last-memory');

  // ── Brain / system endpoints ──
  // Diagnostics and system-state controls.
  // getBrainStatus()
  // WHAT THIS DOES: getBrainStatus reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getBrainStatus(...), then use the returned value in your next step.
  const getBrainStatus     = ()        => get('/api/brain/status');
  const getNeurochemistry  = ()        => get('/api/neurochemistry');
  const getTraces          = ()        => get('/api/traces');
  // rebuildTraces()
  // Purpose: helper wrapper used by this module's main flow.
  // rebuildTraces()
  // WHAT THIS DOES: rebuildTraces is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call rebuildTraces(...) where this helper behavior is needed.
  const rebuildTraces      = ()        => post('/api/trace-rebuild', {});
  const getBeliefGraph     = ()        => get('/api/belief-graph/nodes');
  const getSomatic         = ()        => get('/api/somatic');
  // toggleSomatic()
  // Purpose: helper wrapper used by this module's main flow.
  // toggleSomatic()
  // WHAT THIS DOES: toggleSomatic is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call toggleSomatic(...) where this helper behavior is needed.
  const toggleSomatic      = (metric, enabled) => post('/api/somatic/toggle', { metric, enabled });
  const getSystemPrompt    = ()        => get('/api/system-prompt');
  const getSessionMeta     = ()        => get('/api/session-meta');

  // ── Config endpoints ──
  // Runtime/model configuration endpoints.
  // getConfig()
  // WHAT THIS DOES: getConfig reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getConfig(...), then use the returned value in your next step.
  const getConfig          = ()         => get('/api/config');
  const saveConfig         = (data)     => post('/api/config', data);
  const getEntityConfig    = (entityId) => get('/api/entity-config?entityId=' + encodeURIComponent(entityId));

  // ── Archive endpoints ──
  // Archive search + ingestion helpers.
  // archiveSearch()
  // WHAT THIS DOES: archiveSearch is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call archiveSearch(...) where this helper behavior is needed.
  const archiveSearch      = (body)    => post('/api/archive/search', body);
  const archiveIngestCorpus = (body)   => post('/api/archive/ingest-corpus', body);

  // ── Shutdown ──
  // Controlled server stop request.
  // shutdown()
  // WHAT THIS DOES: shutdown is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call shutdown(...) where this helper behavior is needed.
  const shutdown           = ()        => post('/api/shutdown', {});

  return {
    // primitives
    get, post,
    // entities
    getEntities, getCurrentEntity, getCurrentEntId,
    loadEntity, deleteEntity, healEntity, getPersona, savePersona,
    // memory
    getMemories, getMemorySummary, getMemoryStats,
    getMemoryGraph, getMemoryGraphFull, getLastMemory,
    // brain / system
    getBrainStatus, getNeurochemistry, getTraces, rebuildTraces,
    getBeliefGraph, getSomatic, toggleSomatic, getSystemPrompt, getSessionMeta,
    // config
    getConfig, saveConfig, getEntityConfig,
    // archive
    archiveSearch, archiveIngestCorpus,
    // shutdown
    shutdown
  };
})();
