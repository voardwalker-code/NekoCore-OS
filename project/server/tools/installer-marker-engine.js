'use strict';

const OPEN_MARKER = '//Open Next json entry id';
const CLOSE_MARKER = '//Close "';

function _escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _toText(value) {
  return String(value == null ? '' : value);
}

function _escapeCommentString(value) {
  return _toText(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function _pickEol(matchText) {
  return matchText.includes('\r\n') ? '\r\n' : '\n';
}

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
