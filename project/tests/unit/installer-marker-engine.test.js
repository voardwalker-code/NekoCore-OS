// ── Tests · Installer Marker Engine.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, ../../server/tools/installer-marker-engine. Keep
// import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  OPEN_MARKER,
  CLOSE_MARKER,
  applyMarkerEntries,
  removeMarkerEntries
} = require('../../server/tools/installer-marker-engine');

test('inserts one block between exact open and close markers', () => {
  const content = [
    'alpha',
    OPEN_MARKER,
    '',
    CLOSE_MARKER,
    'omega'
  ].join('\n');

  const result = applyMarkerEntries(content, [
    { entryId: 'entry-1', writtenBlock: 'console.log("hello")' }
  ]);

  assert.equal(result.ok, true);
  assert.match(result.updatedContent, /Open Next json entry id\n\/\/JsonEntryId: "entry-1"\nconsole\.log\("hello"\)\n\/\/Close "\n\/\/Open Next json entry id\n\n\/\/Close "/);
});

test('inserts multiple blocks using a single starting boundary by preserving the next slot', () => {
  const content = [
    OPEN_MARKER,
    '',
    CLOSE_MARKER
  ].join('\n');

  const result = applyMarkerEntries(content, [
    { entryId: 'entry-1', writtenBlock: 'first();' },
    { entryId: 'entry-2', writtenBlock: 'second();' }
  ]);

  assert.equal(result.ok, true);
  assert.match(result.updatedContent, /first\(\);/);
  assert.match(result.updatedContent, /second\(\);/);
  assert.match(result.updatedContent, /\/\/JsonEntryId: "entry-1"/);
  assert.match(result.updatedContent, /\/\/JsonEntryId: "entry-2"/);
  assert.equal(result.logs.length, 2);
});

test('inserts multiple blocks across multiple exact marker boundaries', () => {
  const content = [
    OPEN_MARKER,
    '',
    CLOSE_MARKER,
    '---',
    OPEN_MARKER,
    '',
    CLOSE_MARKER
  ].join('\n');

  const result = applyMarkerEntries(content, [
    { entryId: 'entry-1', writtenBlock: 'first();' },
    { entryId: 'entry-2', writtenBlock: 'second();' }
  ]);

  assert.equal(result.ok, true);
  assert.match(result.updatedContent, /first\(\);/);
  assert.match(result.updatedContent, /---\n\/\/Open Next json entry id\n\/\/JsonEntryId: "entry-2"\nsecond\(\);/);
  assert.match(result.updatedContent, /\/\/JsonEntryId: "entry-1"/);
  assert.match(result.updatedContent, /\/\/JsonEntryId: "entry-2"/);
  assert.equal(result.logs.length, 2);
});

test('returns auto rollback error and original content when exact boundary is missing', () => {
  const original = [
    OPEN_MARKER,
    'not-blank',
    CLOSE_MARKER
  ].join('\n');

  const result = applyMarkerEntries(original, [
    { entryId: 'entry-1', writtenBlock: 'first();' },
    { entryId: 'entry-2', writtenBlock: 'second();' }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.rollback, true);
  assert.match(result.error, /auto rollback/i);
  assert.equal(result.updatedContent, original);
  assert.equal(result.logs.length, 0);
});

test('logs entryId, written block, and close marker for each insertion', () => {
  const content = [
    OPEN_MARKER,
    '',
    CLOSE_MARKER
  ].join('\n');

  const result = applyMarkerEntries(content, [
    { entryId: 'entry-xyz', writtenBlock: 'patchedLine();' }
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].entryId, 'entry-xyz');
  assert.equal(result.logs[0].writtenBlock, 'patchedLine();');
  assert.equal(result.logs[0].closeMarker, CLOSE_MARKER);
});

test('does not match non-exact boundary where the blank line is not blank', () => {
  const content = [
    OPEN_MARKER,
    '   ',
    CLOSE_MARKER
  ].join('\n');

  const result = applyMarkerEntries(content, [
    { entryId: 'entry-1', writtenBlock: 'x();' }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.rollback, true);
  assert.match(result.error, /missing exact marker boundary/i);
  assert.equal(result.updatedContent, content);
});

test('removes an inserted block by JsonEntryId and restores empty marker boundary', () => {
  const content = [
    OPEN_MARKER,
    '//JsonEntryId: "entry-1"',
    'first();',
    CLOSE_MARKER,
    OPEN_MARKER,
    '',
    CLOSE_MARKER
  ].join('\n');

  const result = removeMarkerEntries(content, [
    { entryId: 'entry-1' }
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].entryId, 'entry-1');
  assert.equal(result.logs[0].removed, true);
  assert.match(result.updatedContent, /Open Next json entry id\n\n\/\/Close "/);
});

test('remove returns rollback error and original content when JsonEntryId block is missing', () => {
  const content = [
    OPEN_MARKER,
    '',
    CLOSE_MARKER
  ].join('\n');

  const result = removeMarkerEntries(content, [
    { entryId: 'entry-missing' }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.rollback, true);
  assert.match(result.error, /missing exact JsonEntryId block/i);
  assert.equal(result.updatedContent, content);
});

test('remove collapses adjacent empty boundaries to one safe slot', () => {
  const content = [
    OPEN_MARKER,
    '//JsonEntryId: "entry-1"',
    'first();',
    CLOSE_MARKER,
    OPEN_MARKER,
    '',
    CLOSE_MARKER,
    OPEN_MARKER,
    '',
    CLOSE_MARKER
  ].join('\n');

  const result = removeMarkerEntries(content, [{ entryId: 'entry-1' }]);
  assert.equal(result.ok, true);
  // openCount()
  // Purpose: helper wrapper used by this module's main flow.
  // openCount()
  // WHAT THIS DOES: openCount creates or initializes something needed by the flow.
  // WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
  // HOW TO USE IT: call openCount(...) before code that depends on this setup.
  const openCount = (result.updatedContent.match(/\/\/Open Next json entry id/g) || []).length;
  assert.equal(openCount, 1);
});
