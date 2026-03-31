// ── Tests · Echo Future Stub Guards.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, fs, path, os. Keep import and call-site contracts
// aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Guard Tests — Phase 4.7 E-7: Echo Future Stub + Exit Audit
// Guards that define and lock the expected behavior of:
//   1. archive-indexes.js exports rebuildShapeIndexes (E-7-0)
//   2. rebuildShapeIndexes is a no-op stub (returns 0, no writes)
//   3. phase-archive-index.js wires rebuildShapeIndexes (E-7-0)
//   4. echoFuture export shape on agent-echo.js — unchanged stub
//   5. Exit audit: MEMORY-SYSTEM.md updated (Agent Echo live section)
//   6. Exit audit: CONTRACTS-AND-SCHEMAS.md updated (archive index schema)
// ============================================================

'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');

const archiveIndexesPath  = path.join(__dirname, '../../server/brain/utils/archive-indexes.js');
const phaseArchiveIdxPath = path.join(__dirname, '../../server/brain/cognition/phases/phase-archive-index.js');
const agentEchoPath       = path.join(__dirname, '../../server/brain/agent-echo.js');
const memSystemDocPath    = path.join(__dirname, '../../../docs/MEMORY-SYSTEM.md');
const contractsDocPath    = path.join(__dirname, '../../../docs/CONTRACTS-AND-SCHEMAS.md');

// ── E-7-0: rebuildShapeIndexes exported ──────────────────────────────────────

test('archive-indexes exports rebuildShapeIndexes as a function (E-7-0)', () => {
  const ai = require(archiveIndexesPath);
  assert.equal(typeof ai.rebuildShapeIndexes, 'function',
    'archive-indexes.js must export rebuildShapeIndexes');
});

test('rebuildShapeIndexes is a no-op stub — accepts entityId, returns 0 (E-7-0)', () => {
  const { rebuildShapeIndexes } = require(archiveIndexesPath);
  const result = rebuildShapeIndexes('test_entity_stub');
  assert.equal(result, 0,
    'rebuildShapeIndexes stub must return 0 (no entries processed — Phase 5 implements the body)');
});

test('rebuildShapeIndexes does not write any files when called (E-7-0)', () => {
  const tmpBase = path.join(os.tmpdir(), `neko_shape_stub_${Date.now()}`);
  fs.mkdirSync(tmpBase, { recursive: true });

  try {
    const aiPath = require.resolve('../../server/brain/utils/archive-indexes');
    const epPath = require.resolve('../../server/entityPaths');
    delete require.cache[aiPath];
    delete require.cache[epPath];

    const ep = require('../../server/entityPaths');
    const origDir = ep.ENTITIES_DIR;
    Object.defineProperty(ep, 'ENTITIES_DIR', { value: tmpBase, writable: true, configurable: true });

    const { rebuildShapeIndexes } = require(archiveIndexesPath);
    rebuildShapeIndexes('shape_test_entity');

    // should not have created any files under tmpBase
    const files = [];
    // walk()
    // WHAT THIS DOES: walk is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call walk(...) where this helper behavior is needed.
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else files.push(full);
      }
    }
    walk(tmpBase);
    assert.equal(files.length, 0,
      `rebuildShapeIndexes stub must not write files; found: ${files.join(', ')}`);

    ep.ENTITIES_DIR = origDir;
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
});

// ── E-7-0: phase-archive-index.js wires rebuildShapeIndexes ──────────────────

test('phase-archive-index.js source calls rebuildShapeIndexes (E-7-0)', () => {
  const src = fs.readFileSync(phaseArchiveIdxPath, 'utf8');
  assert.ok(
    src.includes('rebuildShapeIndexes'),
    'phase-archive-index.js must call rebuildShapeIndexes (stub registered for Phase 5 to replace)'
  );
});

// ── echoFuture still a function (no regression) ──────────────────────────────

test('agent-echo.js still exports echoFuture as a function (no regression)', () => {
  const ae = require(agentEchoPath);
  assert.equal(typeof ae.echoFuture, 'function',
    'echoFuture must remain exported from agent-echo.js');
});

test('echoFuture returns [] when no indexCache provided (Phase 5 implemented)', () => {
  const { echoFuture } = require(agentEchoPath);
  const result = echoFuture('any_entity');
  assert.deepEqual(result, [],
    'echoFuture must return [] when no indexCache is provided');
});

// ── E-7-2: doc exit audit ─────────────────────────────────────────────────────

test('docs/MEMORY-SYSTEM.md documents Agent Echo as live (E-7-2)', () => {
  const doc = fs.readFileSync(memSystemDocPath, 'utf8');
  assert.ok(
    doc.includes('agent-echo.js') || doc.includes('echoNow') || doc.includes('echoPast'),
    'MEMORY-SYSTEM.md must reference the live Agent Echo implementation (agent-echo.js / echoNow / echoPast)'
  );
});

test('docs/MEMORY-SYSTEM.md documents archive-indexes.js (E-7-2)', () => {
  const doc = fs.readFileSync(memSystemDocPath, 'utf8');
  assert.ok(
    doc.includes('archive-indexes.js'),
    'MEMORY-SYSTEM.md must list archive-indexes.js in the relevant files table'
  );
});

test('docs/CONTRACTS-AND-SCHEMAS.md documents archive index schema (E-7-2)', () => {
  const doc = fs.readFileSync(contractsDocPath, 'utf8');
  assert.ok(
    doc.includes('idx.json') || doc.includes('Archive Index'),
    'CONTRACTS-AND-SCHEMAS.md must document the archive index schema (*.idx.json format)'
  );
});

test('docs/CONTRACTS-AND-SCHEMAS.md documents POST /api/archive/search narrowing params (E-7-2)', () => {
  const doc = fs.readFileSync(contractsDocPath, 'utf8');
  assert.ok(
    doc.includes('/api/archive/search') && (doc.includes('month') || doc.includes('narrowSet')),
    'CONTRACTS-AND-SCHEMAS.md must document the archive search API with month/subject narrowing'
  );
});
