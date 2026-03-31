// ── Services · Client Archive UI ─────────────────────────────────────────────
//
// HOW ARCHIVE UI WORKS:
// This module powers the Archive tab. It has two user flows:
//   1. Search archive entries with filters (query, date range, type, month)
//   2. Ingest local corpus files in resumable batches
//
// WHAT USES THIS:
//   Archive tab buttons and inputs — bound through `initArchiveApp()`
//
// EXPORTS:
//   initArchiveApp() on `window`
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// NekoCore OS — Archive UI
// Core app — Phase 4.6  [BOUNDARY_OK]
//
// Provides two panels:
//   1. Archive Search  — query the sharded archive via BM25
//   2. Corpus Ingest   — stream a local text file into the archive
//
// Depends on globals:  RemAPI (shared/api.js), lg (app.js)
// ============================================================
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let _ingestState = null;  // { filePath, docId, type, maxChunks, total, resumeAt }

  // ── Helpers ────────────────────────────────────────────────
  /** Return an element by ID. */
  function byId(id) { return document.getElementById(id); }

  function setStatus(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
  }
  /** Escape text for HTML interpolation. */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Archive Search ─────────────────────────────────────────

  async function runArchiveSearch() {
    const queryEl    = byId('archiveSearchQuery');
    const limitEl    = byId('archiveSearchLimit');
    const startEl    = byId('archiveYearStart');
    const endEl      = byId('archiveYearEnd');
    const typesEl    = byId('archiveSearchTypes');
    const monthEl    = byId('archiveSearchMonth');
    const subjectEl  = byId('archiveSearchSubject');
    const resultsEl  = byId('archiveSearchResults');
    const statusEl   = byId('archiveSearchStatus');

    const query = queryEl ? queryEl.value.trim() : '';
    if (!query) { setStatus('archiveSearchStatus', 'Enter a search query.'); return; }

    setStatus('archiveSearchStatus', 'Searching…');
    if (resultsEl) resultsEl.innerHTML = '<div class="placeholder-content">Searching…</div>';

    const body = { query, limit: Number(limitEl ? limitEl.value : 10) };
    if (startEl && startEl.value) body.yearRange = { ...(body.yearRange || {}), start: startEl.value + 'T00:00:00.000Z' };
    if (endEl   && endEl.value)   body.yearRange = { ...(body.yearRange || {}), end:   endEl.value   + 'T23:59:59.999Z' };
    const typesVal = typesEl ? typesEl.value : 'all';
    if (typesVal && typesVal !== 'all') body.types = [typesVal];
    if (monthEl && monthEl.value) body.month = monthEl.value;
    if (subjectEl && subjectEl.value.trim()) body.subject = subjectEl.value.trim();

    try {
      const data = await RemAPI.post('/api/archive/search', body);
      if (!data.ok) throw new Error(data.error || 'Search failed');

      setStatus('archiveSearchStatus', data.total + ' result' + (data.total === 1 ? '' : 's'));

      if (!data.results || data.results.length === 0) {
        if (resultsEl) resultsEl.innerHTML = '<div class="placeholder-content">No matching entries found.</div>';
        return;
      }

      const html = data.results.map(function (r) {
        const topics = (r.topics || []).map(function (t) {
          return '<span style="display:inline-block;background:var(--surface-3);border-radius:var(--radius-sm);padding:1px 6px;font-size:var(--text-xs);margin-right:3px">' + escHtml(t) + '</span>';
        }).join('');
        const score    = typeof r.score  === 'number' ? r.score.toFixed(3)  : '—';
        const type     = escHtml(r.type     || '—');
        const archived = r.archivedAt ? new Date(r.archivedAt).toLocaleDateString() : '—';
        const summary  = r.summary ? '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-secondary);white-space:pre-wrap;max-height:120px;overflow:auto">' + escHtml(r.summary.slice(0, 800)) + '</div>' : '';

        return '<div class="settings-section" style="margin:0 0 var(--space-3) 0;padding:var(--space-3)">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-2)">'
          + '<span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-secondary)">' + escHtml(r.id) + '</span>'
          + '<span style="display:flex;gap:var(--space-3);font-size:var(--text-xs);color:var(--text-secondary)">'
          + '<span>Score: <strong>' + score + '</strong></span>'
          + '<span>Type: <strong>' + type + '</strong></span>'
          + '<span>Archived: <strong>' + archived + '</strong></span>'
          + '</span>'
          + '</div>'
          + '<div style="margin-bottom:var(--space-1)">' + topics + '</div>'
          + summary
          + '</div>';
      }).join('');

      if (resultsEl) resultsEl.innerHTML = html;
      lg('info', '[Archive] Search "' + query + '" → ' + data.total + ' results');
    } catch (err) {
      setStatus('archiveSearchStatus', 'Error: ' + err.message);
      if (resultsEl) resultsEl.innerHTML = '<div class="placeholder-content">Search failed: ' + escHtml(err.message) + '</div>';
      lg('err', '[Archive] Search failed: ' + err.message);
    }
  }

  // ── Corpus Ingest ──────────────────────────────────────────

  /** Render ingest progress state and continue button visibility. */
  function _renderIngestProgress(result) {
    const progressEl = byId('archiveIngestProgress');
    const statusEl   = byId('archiveIngestStatus');
    const contBtn    = byId('archiveIngestContinueBtn');
    if (!progressEl || !statusEl) return;

    const pct = result.total > 0 ? Math.round((result.resumeAt / result.total) * 100) : 0;
    progressEl.style.display = 'block';
    progressEl.value = pct;
    progressEl.max   = 100;

    if (result.done) {
      statusEl.textContent = '✓ Ingest complete — ' + result.ingested + ' ingested, ' + result.skipped + ' skipped, ' + result.total + ' total chunks.';
      if (contBtn) contBtn.style.display = 'none';
      _ingestState = null;
    } else {
      statusEl.textContent = pct + '% — ' + result.resumeAt + ' / ' + result.total + ' chunks processed (' + result.ingested + ' new, ' + result.skipped + ' skipped).';
      if (contBtn) contBtn.style.display = '';
    }
  }

  async function _runIngestBatch() {
    if (!_ingestState) return;
    const btn    = byId('archiveIngestRunBtn');
    const contBtn = byId('archiveIngestContinueBtn');
    if (btn)    btn.disabled = true;
    if (contBtn) contBtn.disabled = true;
    setStatus('archiveIngestStatus', 'Running batch…');

    try {
      const data = await RemAPI.post('/api/archive/ingest-corpus', _ingestState);
      if (!data.ok) throw new Error(data.error || 'Ingest failed');
      _ingestState.resumeFrom = data.resumeAt;
      _renderIngestProgress(data);
      lg('info', '[Archive] Ingest batch — ' + data.ingested + ' ingested, done=' + data.done);
    } catch (err) {
      setStatus('archiveIngestStatus', 'Error: ' + err.message);
      lg('err', '[Archive] Ingest error: ' + err.message);
    } finally {
      if (btn)    btn.disabled = false;
      if (contBtn) contBtn.disabled = false;
    }
  }
  /** Initialize ingest state from form inputs and run first batch. */
  function startIngest() {
    const fileEl      = byId('archiveIngestFile');
    const docIdEl     = byId('archiveIngestDocId');
    const typeEl      = byId('archiveIngestType');
    const maxChunksEl = byId('archiveIngestMaxChunks');
    const statusEl    = byId('archiveIngestStatus');
    const progressEl  = byId('archiveIngestProgress');
    const contBtn     = byId('archiveIngestContinueBtn');

    const filePath = fileEl ? fileEl.value.trim() : '';
    if (!filePath) { setStatus('archiveIngestStatus', 'Enter an absolute file path.'); return; }

    const docId     = docIdEl && docIdEl.value.trim() ? docIdEl.value.trim() : null;
    const type      = typeEl  ? typeEl.value  : 'doc';
    const maxChunks = maxChunksEl && maxChunksEl.value ? Number(maxChunksEl.value) : 1000;

    _ingestState = { filePath, docId: docId || undefined, type, maxChunks };
    delete _ingestState.resumeFrom;

    if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }
    if (contBtn)    contBtn.style.display = 'none';
    if (statusEl)   statusEl.textContent  = 'Starting…';

    _runIngestBatch();
  }
  /** Continue ingest from saved batch state. */
  function continueIngest() {
    if (!_ingestState) return;
    _runIngestBatch();
  }

  // ── Bind ───────────────────────────────────────────────────

  /** Bind archive tab actions once. */
  function bindActions() {
    const searchBtn  = byId('archiveSearchBtn');
    const searchInput = byId('archiveSearchQuery');
    const ingestBtn  = byId('archiveIngestRunBtn');
    const contBtn    = byId('archiveIngestContinueBtn');

    if (searchBtn && !searchBtn.dataset.bound) {
      searchBtn.dataset.bound = '1';
      searchBtn.addEventListener('click', runArchiveSearch);
    }
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') runArchiveSearch();
      });
    }
    if (ingestBtn && !ingestBtn.dataset.bound) {
      ingestBtn.dataset.bound = '1';
      ingestBtn.addEventListener('click', startIngest);
    }
    if (contBtn && !contBtn.dataset.bound) {
      contBtn.dataset.bound = '1';
      contBtn.addEventListener('click', continueIngest);
    }
  }

  // ── Public init ────────────────────────────────────────────

  window.initArchiveApp = function initArchiveApp() {
    bindActions();
  };

  document.addEventListener('DOMContentLoaded', function () {
    const panel = byId('tab-archive');
    if (!panel) return;
    bindActions();
  });
})();
