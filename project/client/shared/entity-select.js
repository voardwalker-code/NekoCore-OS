// ── Client Shared · Entity Select ────────────────────────────────────────────────────
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

/**
 * EntitySelect — shared entity loading/switching module.
 *
 * window.EntitySelect.load(dropdownEl?)  → Promise<entity[]>  populates optional <select>
 * window.EntitySelect.select(id)         → Promise<entity>    loads entity via API, fires listeners
 * window.EntitySelect.onChanged(fn)      → registers callback fired with (entity) on switch
 * window.EntitySelect.getCurrentId()     → string|null        returns currently loaded entity id
 * window.EntitySelect.getCurrentEntity() → object|null        returns full entity object (if loaded via this module)
 */
window.EntitySelect = (function () {
  // Internal current-entity cache for modules using this shared singleton.
  let _entityId = null;
  let _entity = null;
  const _listeners = [];

  // Fire all registered listeners after a successful entity switch.
  // _notify()
  // WHAT THIS DOES: _notify is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call _notify(...) where this helper behavior is needed.
  function _notify(entity) {
    _listeners.forEach(function (fn) { try { fn(entity); } catch (_) {} });
  }

  /**
   * Fetch entity list. If dropdownEl provided, populate it as a <select>.
   * Returns the entity array.
   */
  async function load(dropdownEl) {
    const resp = await fetch('/api/entities');
    if (!resp.ok) throw new Error('Failed to fetch entities (' + resp.status + ')');
    const data = await resp.json();
    const entities = data.entities || [];

    if (dropdownEl) {
      dropdownEl.innerHTML = '';
      entities.forEach(function (e) {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name || e.id;
        if (e.id === _entityId) opt.selected = true;
        dropdownEl.appendChild(opt);
      });
    }

    return entities;
  }

  /**
   * Load a specific entity by ID. Updates internal state and fires onChange listeners.
   * Returns the entity object.
   */
  async function select(id) {
    const resp = await fetch('/api/entities/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId: id })
    });
    if (!resp.ok) throw new Error('Failed to load entity (' + resp.status + ')');
    const data = await resp.json();
    _entityId = id;
    _entity = data.entity || null;
    _notify(_entity);
    return _entity;
  }

  /** Register a callback to be called whenever the active entity changes. */
  // onChanged()
  // WHAT THIS DOES: onChanged handles an event and routes follow-up actions.
  // WHY IT EXISTS: event flow is easier to debug when listener logic is centralized.
  // HOW TO USE IT: wire onChanged to the relevant event source or dispatcher.
  function onChanged(fn) {
    _listeners.push(fn);
  }

  /** Returns the id of the currently loaded entity, or null. */
  // getCurrentId()
  // WHAT THIS DOES: getCurrentId reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getCurrentId(...), then use the returned value in your next step.
  function getCurrentId() {
    // Respect app.js global if EntitySelect.select() hasn't been called yet.
    return _entityId || (typeof window.currentEntityId !== 'undefined' ? window.currentEntityId : null);
  }

  /** Returns the full entity object if loaded via this module, or null. */
  // getCurrentEntity()
  // WHAT THIS DOES: getCurrentEntity reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getCurrentEntity(...), then use the returned value in your next step.
  function getCurrentEntity() {
    return _entity;
  }

  return { load, select, onChanged, getCurrentId, getCurrentEntity };
})();
