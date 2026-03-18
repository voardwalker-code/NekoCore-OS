// ── Archive Routes ────────────────────────────────────────────
// POST /api/archive/search
//
// On-demand retrieval from the three-tier archive.
// Accepts a free-text query (RAKE-extracted topics), optional
// year range, and limit. Returns ranked results from archiveIndex.
//
// IME Phase I4-0 — [BOUNDARY_OK] [CONTRACT_ENFORCED]
// ─────────────────────────────────────────────────────────────

'use strict';

const path         = require('path');
const fs           = require('fs');
const { extractPhrases }   = require('../brain/utils/rake');
const { queryArchive }     = require('../brain/utils/archive-index');
const { intersectIndexes } = require('../brain/utils/archive-indexes');
const { ingestCorpus }     = require('../brain/utils/bulk-ingest');
const {
  normalizeEntityId,
  getArchiveEpisodicPath,
  getArchiveDocsPath,
} = require('../entityPaths');

// ── Route factory ─────────────────────────────────────────────

function createArchiveRoutes(ctx) {

  function resolveEntityId(rawEntityId) {
    try {
      if (rawEntityId) return normalizeEntityId(rawEntityId);
      return ctx.currentEntityId ? normalizeEntityId(ctx.currentEntityId) : 'nekocore';
    } catch {
      return rawEntityId || ctx.currentEntityId || 'nekocore';
    }
  }

  function readSemanticTxt(entityId, memId) {
    try {
      const episodicPath = path.join(getArchiveEpisodicPath(entityId), memId, 'semantic.txt');
      if (fs.existsSync(episodicPath)) return fs.readFileSync(episodicPath, 'utf8').slice(0, 1500);
      const docsPath = path.join(getArchiveDocsPath(entityId), memId, 'semantic.txt');
      if (fs.existsSync(docsPath)) return fs.readFileSync(docsPath, 'utf8').slice(0, 1500);
    } catch (_) {}
    return '';
  }

  // ── POST /api/archive/search ────────────────────────────────
  async function postArchiveSearch(req, res, apiHeaders, readBody) {
    // Auth gate
    if (!req.accountId) {
      res.writeHead(401, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Not authenticated' }));
      return;
    }

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
      return;
    }

    // Input validation
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'query is required and must be a non-empty string' }));
      return;
    }

    const rawLimit = body.limit;
    const limit = rawLimit !== undefined
      ? Math.min(Math.max(parseInt(rawLimit, 10) || 5, 1), 20)
      : 5;

    // yearRange: accepts { start?: ISO, end?: ISO }
    let yearRange = {};
    if (body.yearRange && typeof body.yearRange === 'object' && !Array.isArray(body.yearRange)) {
      if (typeof body.yearRange.start === 'string') yearRange.start = body.yearRange.start;
      if (typeof body.yearRange.end   === 'string') yearRange.end   = body.yearRange.end;
    }

    const entityId = resolveEntityId(body.entityId || null);
    if (!entityId) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'No entity loaded — load an entity before searching the archive' }));
      return;
    }

    try {
      const topics = extractPhrases(query);
      const rawTypes = body.types;
      const types = Array.isArray(rawTypes)
        ? rawTypes.filter(t => typeof t === 'string').slice(0, 5)
        : null;

      // ── Index narrowing (E-6-1) ─────────────────────────────────────────
      // Accepts body.month (string | string[]) of YYYY-MM values and
      // body.subject (string). Each non-empty value maps to an index lookup;
      // intersectIndexes returns the Set<memId> present in ALL lookups.
      // narrowSet is null when no filters are provided — zero-cost path.
      let narrowSet = null;
      const narrowFilters = [];

      const rawMonths = body.month;
      if (rawMonths) {
        const months = Array.isArray(rawMonths)
          ? rawMonths.filter(m => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m)).slice(0, 12)
          : (typeof rawMonths === 'string' && /^\d{4}-\d{2}$/.test(rawMonths.trim()) ? [rawMonths.trim()] : []);
        for (const m of months) {
          narrowFilters.push({ axis: 'temporal', key: m });
        }
      }

      const rawSubject = body.subject;
      if (typeof rawSubject === 'string' && rawSubject.trim()) {
        narrowFilters.push({ axis: 'subject', key: rawSubject.trim().slice(0, 80) });
      }

      if (narrowFilters.length > 0) {
        narrowSet = intersectIndexes(entityId, narrowFilters);
        // If intersection is empty and filters were provided, no results possible.
        if (narrowSet.size === 0) {
          res.writeHead(200, apiHeaders);
          res.end(JSON.stringify({ ok: true, results: [], total: 0 }));
          return;
        }
      }

      const hits = queryArchive(entityId, topics, limit, yearRange, types, narrowSet);

      const results = hits.map(h => ({
        id:         h.memId,
        score:      h.score,
        summary:    readSemanticTxt(entityId, h.memId),
        archivedAt: h.meta.archivedAt || null,
        topics:     h.meta.topics      || [],
        type:       h.meta.type        || 'episodic',
      }));

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, results, total: results.length }));
    } catch (err) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Archive search failed: ' + err.message }));
    }
  }

  // ── POST /api/archive/ingest-corpus ────────────────────────
  async function postIngestCorpus(req, res, apiHeaders, readBody) {
    if (!req.accountId) {
      res.writeHead(401, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Not authenticated' }));
      return;
    }

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
      return;
    }

    const entityId = resolveEntityId(body.entityId || null);
    if (!entityId) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'No entity loaded — provide entityId or load an entity first' }));
      return;
    }

    const filePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
    if (!filePath) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'filePath is required and must be a non-empty string' }));
      return;
    }

    if (!path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'filePath must be an absolute path to an existing file' }));
      return;
    }

    const docId     = typeof body.docId === 'string' ? body.docId.trim() : null;
    const type      = typeof body.type  === 'string' ? body.type.trim()  : 'doc';
    const maxChunks = typeof body.maxChunks === 'number' && body.maxChunks > 0
      ? Math.min(body.maxChunks, 50000)
      : null;

    try {
      const result = await ingestCorpus(entityId, filePath, { docId: docId || undefined, type, maxChunks });
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, ...result }));
    } catch (err) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'Ingest failed: ' + err.message }));
    }
  }

  // ── Dispatcher ────────────────────────────────────────────────
  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;

    if (p === '/api/archive/search' && m === 'POST') {
      await postArchiveSearch(req, res, apiHeaders, readBody);
      return true;
    }
    if (p === '/api/archive/ingest-corpus' && m === 'POST') {
      await postIngestCorpus(req, res, apiHeaders, readBody);
      return true;
    }
    return false;
  }

  return { dispatch };
}

module.exports = createArchiveRoutes;
