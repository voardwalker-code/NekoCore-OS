'use strict';
/**
 * server/services/thinking-log.js
 *
 * Stores LLM thinking content (from native extended thinking or prompt-based
 * <thinking> tags) per entity. When a memory is formed, it can optionally
 * reference a thinking log entry so the entity can later understand *why*
 * that memory was created.
 *
 * Storage: entities/<id>/memories/thinking-logs/tlog_<ts>_<rand>.json
 */

const fs = require('fs');
const path = require('path');

/**
 * @param {Object} deps
 * @param {Function} deps.getThinkingLogDir - (entityId) => absolute path to thinking-logs dir
 */
function createThinkingLog({ getThinkingLogDir }) {

  function _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Store a thinking entry and return its unique ID.
   *
   * @param {string} entityId
   * @param {string} aspect - 'conscious' | 'orchestrator'
   * @param {string} thinkingContent - raw thinking text
   * @param {string} [contextSummary] - brief description of what the entity was responding to
   * @returns {string} The thinking log ID (tlog_...)
   */
  function storeThinkingEntry(entityId, aspect, thinkingContent, contextSummary) {
    if (!entityId || !thinkingContent || typeof thinkingContent !== 'string' || !thinkingContent.trim()) {
      return null;
    }

    const dir = getThinkingLogDir(entityId);
    _ensureDir(dir);

    const id = `tlog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry = {
      id,
      entityId,
      aspect: aspect || 'unknown',
      timestamp: new Date().toISOString(),
      thinkingContent: thinkingContent.trim(),
      contextSummary: contextSummary ? String(contextSummary).slice(0, 300) : null
    };

    const filePath = path.join(dir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf8');

    return id;
  }

  /**
   * Retrieve a thinking log entry by ID.
   *
   * @param {string} entityId
   * @param {string} logId - tlog_... identifier
   * @returns {Object|null} The entry, or null if not found
   */
  function getThinkingEntry(entityId, logId) {
    if (!entityId || !logId) return null;

    const dir = getThinkingLogDir(entityId);
    const filePath = path.join(dir, `${logId}.json`);

    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  return { storeThinkingEntry, getThinkingEntry };
}

module.exports = { createThinkingLog };
