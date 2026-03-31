// ── Tools · Installer Marker Engine ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This module belongs to the NekoCore OS codebase and provides focused
// subsystem behavior.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const OPEN_MARKER = '//Open Next json entry id';
const CLOSE_MARKER = '//Close "';
// _escapeRegex()
// WHAT THIS DOES: _escapeRegex is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _escapeRegex(...) where this helper behavior is needed.
function _escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function _toText(value) {
  return String(value == null ? '' : value);
}
// _escapeCommentString()
// WHAT THIS DOES: _escapeCommentString is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _escapeCommentString(...) where this helper behavior is needed.
function _escapeCommentString(value) {
  return _toText(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
function _pickEol(matchText) {
  return matchText.includes('\r\n') ? '\r\n' : '\n';
}
// _nextBoundary()
// WHAT THIS DOES: _nextBoundary is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _nextBoundary(...) where this helper behavior is needed.
function _nextBoundary(content) {
  const pattern = new RegExp(`${_escapeRegex(OPEN_MARKER)}\\r?\\n\\r?\\n${_escapeRegex(CLOSE_MARKER)}`);
  const match = pattern.exec(content);
  if (!match) return null;
  return {
    index: match.index,
    length: match[0].length,
    text: match[0]
  };
}
// _allBoundaries()
// WHAT THIS DOES: _allBoundaries is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _allBoundaries(...) where this helper behavior is needed.
function _allBoundaries(content) {
  const pattern = new RegExp(`${_escapeRegex(OPEN_MARKER)}\\r?\\n\\r?\\n${_escapeRegex(CLOSE_MARKER)}`, 'g');
  const out = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    out.push({
      index: match.index,
      length: match[0].length,
      text: match[0]
    });
  }
  return out;
}
// _emptyBoundary()
// WHAT THIS DOES: _emptyBoundary is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call _emptyBoundary(...) where this helper behavior is needed.
function _emptyBoundary(eol) {
  return [OPEN_MARKER, '', CLOSE_MARKER].join(eol);
}
function _normalizeAdjacentEmptyBoundaries(content, eolHint) {
  const eol = eolHint || '\n';
  const one = _emptyBoundary(eol);
  const two = `${one}${eol}${one}`;
  let next = content;
  while (next.includes(two)) {
    next = next.split(two).join(one);
  }
  return next;
}
// _validateEntries()
// WHAT THIS DOES: _validateEntries answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call _validateEntries(...) and branch logic based on true/false.
function _validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'entries must be a non-empty array';
  }
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i] || {};
    if (!_toText(item.entryId).trim()) {
      return `entries[${i}].entryId is required`;
    }
    if (!_toText(item.writtenBlock).trim()) {
      return `entries[${i}].writtenBlock is required`;
    }
  }
  return null;
}
// _validateRemoveEntries()
// WHAT THIS DOES: _validateRemoveEntries answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call _validateRemoveEntries(...) and branch logic based on true/false.
function _validateRemoveEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'entries must be a non-empty array';
  }
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i] || {};
    if (!_toText(item.entryId).trim()) {
      return `entries[${i}].entryId is required`;
    }
  }
  return null;
}
// _removeOneEntryById()
// WHAT THIS DOES: _removeOneEntryById removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call _removeOneEntryById(...) when you need a safe teardown/reset path.
function _removeOneEntryById(content, entryId) {
  const entryLine = `//JsonEntryId: "${_escapeCommentString(entryId)}"`;
  const pattern = new RegExp(
    `${_escapeRegex(OPEN_MARKER)}(\\r?\\n)` +
      `${_escapeRegex(entryLine)}(?:\\r?\\n)` +
      `[\\s\\S]*?` +
      `${_escapeRegex(CLOSE_MARKER)}`,
    'm'
  );

  const match = pattern.exec(content);
  if (!match) {
    return {
      ok: false,
      error: 'auto rollback: missing exact JsonEntryId block',
      updatedContent: content
    };
  }

  const eol = _pickEol(match[0]);
  const emptyBoundary = _emptyBoundary(eol);
  const suffix = content.slice(match.index + match[0].length);
  let consumed = match[0].length;
  if (suffix.startsWith(eol + emptyBoundary)) {
    consumed += eol.length + emptyBoundary.length;
  }
  const updatedRaw = `${content.slice(0, match.index)}${emptyBoundary}${content.slice(match.index + consumed)}`;
  const updated = _normalizeAdjacentEmptyBoundaries(updatedRaw, eol);

  return {
    ok: true,
    error: null,
    updatedContent: updated
  };
}
// applyMarkerEntries()
// WHAT THIS DOES: applyMarkerEntries is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call applyMarkerEntries(...) where this helper behavior is needed.
function applyMarkerEntries(fileContent, entries) {
  const original = _toText(fileContent);
  const validationError = _validateEntries(entries);
  if (validationError) {
    return {
      ok: false,
      error: validationError,
      rollback: true,
      updatedContent: original,
      logs: []
    };
  }

  let working = original;
  const originalBoundaries = _allBoundaries(original);
  let offset = 0;
  const logs = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    let boundary = null;

    if (i < originalBoundaries.length) {
      const fromOriginal = originalBoundaries[i];
      boundary = {
        index: fromOriginal.index + offset,
        length: fromOriginal.length,
        text: fromOriginal.text
      };
    } else {
      boundary = _nextBoundary(working);
    }

    if (!boundary) {
      return {
        ok: false,
        error: 'auto rollback: missing exact marker boundary',
        rollback: true,
        updatedContent: original,
        logs: []
      };
    }

    const eol = _pickEol(boundary.text);
    const block = _toText(entry.writtenBlock).replace(/\r\n|\r|\n/g, eol);
    const entryIdLine = `//JsonEntryId: "${_escapeCommentString(entry.entryId)}"`;
    // Preserve a fresh exact boundary after each write so later installs can append safely.
    const replacement = [
      OPEN_MARKER,
      entryIdLine,
      block,
      CLOSE_MARKER,
      OPEN_MARKER,
      '',
      CLOSE_MARKER
    ].join(eol);

    working = `${working.slice(0, boundary.index)}${replacement}${working.slice(boundary.index + boundary.length)}`;
    offset += (replacement.length - boundary.length);
    logs.push({
      entryId: _toText(entry.entryId),
      writtenBlock: block,
      closeMarker: CLOSE_MARKER
    });
  }

  return {
    ok: true,
    error: null,
    rollback: false,
    updatedContent: working,
    logs
  };
}
// removeMarkerEntries()
// WHAT THIS DOES: removeMarkerEntries removes, resets, or shuts down existing state.
// WHY IT EXISTS: cleanup is explicit so stale state does not leak into new runs.
// HOW TO USE IT: call removeMarkerEntries(...) when you need a safe teardown/reset path.
function removeMarkerEntries(fileContent, entries) {
  const original = _toText(fileContent);
  const validationError = _validateRemoveEntries(entries);
  if (validationError) {
    return {
      ok: false,
      error: validationError,
      rollback: true,
      updatedContent: original,
      logs: []
    };
  }

  let working = original;
  const logs = [];

  for (const entry of entries) {
    const removed = _removeOneEntryById(working, entry.entryId);
    if (!removed.ok) {
      return {
        ok: false,
        error: removed.error,
        rollback: true,
        updatedContent: original,
        logs: []
      };
    }
    working = removed.updatedContent;
    logs.push({
      entryId: _toText(entry.entryId),
      writtenBlock: null,
      closeMarker: CLOSE_MARKER,
      removed: true
    });
  }

  return {
    ok: true,
    error: null,
    rollback: false,
    updatedContent: working,
    logs
  };
}

module.exports = {
  OPEN_MARKER,
  CLOSE_MARKER,
  applyMarkerEntries,
  removeMarkerEntries
};
