'use strict';
/**
 * tests/unit/archive-promotion.test.js
 * IME Phase I3-1 guard tests — memory lifecycle promotion pass
 *
 * Verifies:
 *   1. isPromotionCandidate correctly identifies eligible memories
 *   2. daysDiff calculates age correctly
 *   3. runPromotionPass skips memories with decay >= 0.05
 *   4. runPromotionPass promotes qualifying memories to archive
 *   5. Promoted memory is removed from hot indexCache
 *   6. archiveIndex.json entry is written for promoted memory
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const zlib   = require('zlib');

const {
  isPromotionCandidate,
  daysDiff,
  runPromotionPass,
} = require('../../server/brain/cognition/phases/phase-archive');

let tmpRoot;
let tmpEntityId;

before(() => {
  tmpRoot     = fs.mkdtempSync(path.join(os.tmpdir(), 'neko-promo-test-'));
  tmpEntityId = 'promo_test';

  // Override ENTITIES_DIR to tmp so runPromotionPass uses our test entity
  const ep = require('../../server/entityPaths');
  ep._origEntitiesDir = ep.ENTITIES_DIR;
  Object.defineProperty(ep, 'ENTITIES_DIR', {
    value: path.join(tmpRoot, 'entities'),
    writable: true,
    configurable: true,
  });
});

after(() => {
  // Restore ENTITIES_DIR
  const ep = require('../../server/entityPaths');
  if (ep._origEntitiesDir) ep.ENTITIES_DIR = ep._origEntitiesDir;
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
});

// ── 1. isPromotionCandidate ───────────────────────────────────────────────────
test('promotion: isPromotionCandidate returns true for old, zero-access, low-decay memory', () => {
  const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
  const meta = { decay: 0.03, access_count: 0, created: ninetyOneDaysAgo };
  assert.equal(isPromotionCandidate(meta), true);
});

test('promotion: isPromotionCandidate returns false when decay is high', () => {
  const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
  const meta = { decay: 0.5, access_count: 0, created: ninetyOneDaysAgo };
  assert.equal(isPromotionCandidate(meta), false);
});

test('promotion: isPromotionCandidate returns false when access_count > 0', () => {
  const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
  const meta = { decay: 0.01, access_count: 3, created: ninetyOneDaysAgo };
  assert.equal(isPromotionCandidate(meta), false);
});

test('promotion: isPromotionCandidate returns false when memory is recent (< 90 days)', () => {
  const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const meta = { decay: 0.01, access_count: 0, created: recent };
  assert.equal(isPromotionCandidate(meta), false);
});

// ── 2. daysDiff ───────────────────────────────────────────────────────────────
test('promotion: daysDiff returns correct age in days', () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const diff = daysDiff(thirtyDaysAgo);
  assert.ok(diff >= 29.9 && diff <= 30.1, `Expected ~30 days, got ${diff}`);
});

test('promotion: daysDiff returns 0 for invalid date string', () => {
  assert.equal(daysDiff('not-a-date'), 0);
});

// ── 3 & 4. runPromotionPass — integration ─────────────────────────────────────

function makeTestEpisodic(entityId, memId, decayValue, ageDays = 91, accessCount = 0) {
  const ep       = require('../../server/entityPaths');
  const memdir   = path.join(ep.ENTITIES_DIR, `entity_${entityId}`, 'memories', 'episodic', memId);
  fs.mkdirSync(memdir, { recursive: true });

  const created = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString();
  fs.writeFileSync(path.join(memdir, 'semantic.txt'),
    'This is a test memory about pipeline orchestration and memory consolidation.', 'utf8');

  const log = {
    memory_id:    memId,
    created,
    importance:   0.4,
    emotion:      'calm',
    decay:        decayValue,
    topics:       ['pipeline', 'memory'],
    access_count: accessCount,
    type:         'episodic',
  };
  fs.writeFileSync(path.join(memdir, 'log.json'), JSON.stringify(log), 'utf8');

  return { created, log };
}

function makeStubIndexCache(entityId) {
  // Minimal stub of MemoryIndexCache
  const ep = require('../../server/entityPaths');
  const indexPath = path.join(ep.ENTITIES_DIR, `entity_${entityId}`, 'index');
  fs.mkdirSync(indexPath, { recursive: true });

  const cache = {
    memoryIndex: {},
    _dirty: false,
    load() {},
    save() { this._dirty = true; },
    removeMemory(mid) { delete this.memoryIndex[mid]; },
    getMemoryMeta(mid) { return this.memoryIndex[mid] || null; },
  };
  return cache;
}

test('promotion: runPromotionPass promotes qualifying memory to archive', () => {
  const entityId  = 'promo_qualify';
  const memId     = 'mem_promo001';
  const ep        = require('../../server/entityPaths');

  // Create entity dir
  const episodicDir = path.join(ep.ENTITIES_DIR, `entity_${entityId}`, 'memories', 'episodic');
  fs.mkdirSync(episodicDir, { recursive: true });

  const { created } = makeTestEpisodic(entityId, memId, 0.02, 95, 0);

  const cache = makeStubIndexCache(entityId);
  cache.memoryIndex[memId] = {
    decay:        0.02,
    access_count: 0,
    created,
    topics:       ['pipeline', 'memory'],
    emotion:      'calm',
    importance:   0.4,
    type:         'episodic',
  };

  const promoted = runPromotionPass(entityId, cache);
  assert.ok(promoted >= 1, `Expected at least 1 promotion, got ${promoted}`);

  // Should be removed from hot index
  assert.equal(cache.memoryIndex[memId], undefined, 'mem should be removed from hot index');

  // Should exist in archive/episodic
  const archiveDest = path.join(
    ep.ENTITIES_DIR, `entity_${entityId}`, 'memories', 'archive', 'episodic', memId
  );
  assert.ok(fs.existsSync(archiveDest), 'Memory should exist in archive/episodic/');

  // archiveIndex.json should have the entry
  const { readArchiveIndex } = require('../../server/brain/utils/archive-index');
  const index = readArchiveIndex(entityId);
  assert.ok(index[memId], 'archiveIndex.json should have the promoted memory entry');
});

test('promotion: runPromotionPass skips high-decay memory (decay=0.5)', () => {
  const entityId  = 'promo_skip';
  const memId     = 'mem_skip001';
  const ep        = require('../../server/entityPaths');

  const episodicDir = path.join(ep.ENTITIES_DIR, `entity_${entityId}`, 'memories', 'episodic');
  fs.mkdirSync(episodicDir, { recursive: true });

  const { created } = makeTestEpisodic(entityId, memId, 0.50, 95, 0);

  const cache = makeStubIndexCache(entityId);
  cache.memoryIndex[memId] = {
    decay:        0.50,
    access_count: 0,
    created,
    topics:       ['pipeline'],
    emotion:      'calm',
    importance:   0.5,
    type:         'episodic',
  };

  const promoted = runPromotionPass(entityId, cache);
  assert.equal(promoted, 0, 'High-decay memory should NOT be promoted');

  // Should still exist in episodic
  const srcDir = path.join(episodicDir, memId);
  assert.ok(fs.existsSync(srcDir), 'Memory should still exist in episodic/');
});
