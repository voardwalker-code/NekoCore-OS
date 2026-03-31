// ── Services · Browser Download Manager ─────────────────────────────────────
//
// HOW DOWNLOAD TRACKING WORKS:
// This module keeps a live in-memory table of downloads. Each download moves
// through states (started -> completed/failed), and each transition emits an
// event so UI can reflect progress.
//
// WHAT USES THIS:
//   browser host routes/controllers — create downloads and read status
//
// EXPORTS:
//   startDownload(opts), completeDownload(downloadId, opts), failDownload(downloadId, error)
//   getDownload(downloadId), getAllDownloads(), reset()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * NekoCore Browser Host — Download Manager (NB-2-4)
 *
 * Owns: download tracking with start/progress/complete/failure events.
 * Emits: browser.download.state events via the browser event bus.
 */

const crypto = require('crypto');
const eventBus = require('./event-bus');

// ── State ───────────────────────────────────────────────────────────────────

/** @type {Map<string, object>} downloadId → state */
const downloads = new Map();

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Create a compact random download ID. */
function _makeDownloadId() {
  return 'dl_' + crypto.randomBytes(6).toString('hex');
}

// ── Core Logic ──────────────────────────────────────────────────────────────

/** Register a new download and emit started state. */
function startDownload({ url, filename, tabId }) {
  const downloadId = _makeDownloadId();
  const dl = {
    downloadId,
    url,
    filename: filename || url.split('/').pop() || 'download',
    tabId: tabId || null,
    state: 'started',
    bytesReceived: 0,
    totalBytes: -1,
    startedAt: Date.now(),
    completedAt: null,
    error: null,
  };
  downloads.set(downloadId, dl);
  eventBus.emit('browser.download.state', { downloadId, state: 'started', url: dl.url, filename: dl.filename, tabId: dl.tabId });
  return dl;
}

/** Mark a download as completed and emit terminal state. */
function completeDownload(downloadId, { totalBytes } = {}) {
  const dl = downloads.get(downloadId);
  if (!dl) return null;
  dl.state = 'completed';
  dl.completedAt = Date.now();
  if (totalBytes != null) dl.totalBytes = totalBytes;
  dl.bytesReceived = dl.totalBytes;
  eventBus.emit('browser.download.state', { downloadId, state: 'completed', filename: dl.filename, totalBytes: dl.totalBytes });
  return dl;
}

/** Mark a download as failed and emit terminal state. */
function failDownload(downloadId, error) {
  const dl = downloads.get(downloadId);
  if (!dl) return null;
  dl.state = 'failed';
  dl.completedAt = Date.now();
  dl.error = error || 'Unknown error';
  eventBus.emit('browser.download.state', { downloadId, state: 'failed', filename: dl.filename, error: dl.error });
  return dl;
}

/** Return one download record by ID, or null. */
function getDownload(downloadId) {
  return downloads.get(downloadId) || null;
}

/** Return all tracked download records. */
function getAllDownloads() {
  return Array.from(downloads.values());
}

/** Reset all tracked downloads (for tests). */
function reset() {
  downloads.clear();
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { startDownload, completeDownload, failDownload, getDownload, getAllDownloads, reset };
