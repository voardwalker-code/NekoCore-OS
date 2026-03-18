'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runInstallPlan, runUninstallPlan } = require('../../server/tools/installer-cli');
const { OPEN_MARKER, CLOSE_MARKER } = require('../../server/tools/installer-marker-engine');

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nk-installer-cli-'));
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

function writeContract(root, contractObj, name = 'contract.json') {
  const p = path.join(root, name);
  fs.writeFileSync(p, JSON.stringify(contractObj, null, 2), 'utf8');
  return p;
}

function writeFile(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

function markerRegion() {
  return [OPEN_MARKER, '', CLOSE_MARKER].join('\n');
}

test('runInstallPlan applies insert actions and returns per-entry logs', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/apps/non-core/core/sample.html';
    writeFile(t.dir, targetRel, `before\n${markerRegion()}\nafter\n`);

    const contractPath = writeContract(t.dir, {
      installActions: [
        {
          type: 'insert',
          filePath: targetRel,
          entryId: 'entry-1',
          payload: '<div>Installed</div>'
        }
      ]
    });

    const result = runInstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, true);
    assert.equal(result.appliedFiles, 1);
    assert.equal(result.logs.length, 1);
    assert.equal(result.logs[0].entryId, 'entry-1');
    assert.equal(result.logs[0].writtenBlock, '<div>Installed</div>');
    assert.equal(result.logs[0].closeMarker, CLOSE_MARKER);

    const updated = fs.readFileSync(path.join(t.dir, targetRel), 'utf8');
    assert.match(updated, /Open Next json entry id\n\/\/JsonEntryId: "entry-1"\n<div>Installed<\/div>\n\/\/Close "/);
  } finally {
    t.cleanup();
  }
});

test('runInstallPlan in dry mode does not write files', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/sample.txt';
    const original = `x\n${markerRegion()}\ny\n`;
    writeFile(t.dir, targetRel, original);

    const contractPath = writeContract(t.dir, {
      installActions: [
        {
          type: 'insert',
          filePath: targetRel,
          entryId: 'entry-1',
          payload: 'dryRunLine();'
        }
      ]
    });

    const result = runInstallPlan({ contractPath, rootDir: t.dir, dryRun: true });
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);

    const after = fs.readFileSync(path.join(t.dir, targetRel), 'utf8');
    assert.equal(after, original);
  } finally {
    t.cleanup();
  }
});

test('runInstallPlan returns rollback error and keeps all files unchanged when one boundary is missing', () => {
  const t = tmpDir();
  try {
    const fileA = 'a.txt';
    const fileB = 'b.txt';
    const contentA = `A\n${markerRegion()}\n`;
    const contentB = 'B\nno marker region here\n';
    writeFile(t.dir, fileA, contentA);
    writeFile(t.dir, fileB, contentB);

    const contractPath = writeContract(t.dir, {
      installActions: [
        { type: 'insert', filePath: fileA, entryId: 'entry-a', payload: 'A_PATCH' },
        { type: 'insert', filePath: fileB, entryId: 'entry-b', payload: 'B_PATCH' }
      ]
    });

    const result = runInstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, false);
    assert.equal(result.rollback, true);
    assert.match(result.error, /auto rollback/i);

    assert.equal(fs.readFileSync(path.join(t.dir, fileA), 'utf8'), contentA);
    assert.equal(fs.readFileSync(path.join(t.dir, fileB), 'utf8'), contentB);
  } finally {
    t.cleanup();
  }
});

test('runUninstallPlan removes installed blocks by entryId', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/apps/non-core/core/sample.html';
    writeFile(t.dir, targetRel, [
      'before',
      OPEN_MARKER,
      '//JsonEntryId: "entry-1"',
      '<div>Installed</div>',
      CLOSE_MARKER,
      OPEN_MARKER,
      '',
      CLOSE_MARKER,
      'after'
    ].join('\n'));

    const contractPath = writeContract(t.dir, {
      uninstallActions: [
        {
          type: 'remove',
          filePath: targetRel,
          entryId: 'entry-1'
        }
      ]
    });

    const result = runUninstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, true);
    assert.equal(result.appliedFiles, 1);
    assert.equal(result.logs.length, 1);
    assert.equal(result.logs[0].entryId, 'entry-1');
    assert.equal(result.logs[0].removed, true);

    const updated = fs.readFileSync(path.join(t.dir, targetRel), 'utf8');
    assert.ok(!updated.includes('//JsonEntryId: "entry-1"'));
  } finally {
    t.cleanup();
  }
});

test('runUninstallPlan returns rollback error and keeps all files unchanged when one entryId is missing', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/sample.txt';
    const original = [
      'before',
      OPEN_MARKER,
      '//JsonEntryId: "entry-1"',
      'line();',
      CLOSE_MARKER,
      OPEN_MARKER,
      '',
      CLOSE_MARKER,
      'after'
    ].join('\n');
    writeFile(t.dir, targetRel, original);

    const contractPath = writeContract(t.dir, {
      uninstallActions: [
        { type: 'remove', filePath: targetRel, entryId: 'entry-1' },
        { type: 'remove', filePath: targetRel, entryId: 'entry-missing' }
      ]
    });

    const result = runUninstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, false);
    assert.equal(result.rollback, true);
    assert.match(result.error, /auto rollback/i);

    const after = fs.readFileSync(path.join(t.dir, targetRel), 'utf8');
    assert.equal(after, original);
  } finally {
    t.cleanup();
  }
});

test('runInstallPlan maps same-file multiple actions to original boundary order', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/sample-order.txt';
    writeFile(t.dir, targetRel, [
      'A',
      markerRegion(),
      '---',
      markerRegion(),
      'Z'
    ].join('\n'));

    const contractPath = writeContract(t.dir, {
      installActions: [
        { type: 'insert', filePath: targetRel, entryId: 'entry-a', payload: 'A_PAYLOAD' },
        { type: 'insert', filePath: targetRel, entryId: 'entry-b', payload: 'B_PAYLOAD' }
      ]
    });

    const result = runInstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, true);
    const updated = fs.readFileSync(path.join(t.dir, targetRel), 'utf8');
    assert.match(updated, /A_PAYLOAD/);
    assert.match(updated, /---\n\/\/Open Next json entry id\n\/\/JsonEntryId: "entry-b"\nB_PAYLOAD/);
  } finally {
    t.cleanup();
  }
});

test('runInstallPlan create-file action writes payload file', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/apps/non-core/core/tab-test-create.html';
    const contractPath = writeContract(t.dir, {
      installActions: [
        {
          type: 'create-file',
          filePath: targetRel,
          entryId: 'create-file-001',
          payload: '<div id="tab-test-create">Created</div>'
        }
      ]
    });

    const result = runInstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, true);
    assert.equal(result.logs.some((line) => line.entryId === 'create-file-001' && line.created === true), true);
    const content = fs.readFileSync(path.join(t.dir, targetRel), 'utf8');
    assert.match(content, /Created/);
  } finally {
    t.cleanup();
  }
});

test('runUninstallPlan delete-file action removes payload file', () => {
  const t = tmpDir();
  try {
    const targetRel = 'client/apps/non-core/core/tab-test-delete.html';
    writeFile(t.dir, targetRel, '<div>Delete me</div>');

    const contractPath = writeContract(t.dir, {
      uninstallActions: [
        {
          type: 'delete-file',
          filePath: targetRel,
          entryId: 'delete-file-001'
        }
      ]
    });

    const result = runUninstallPlan({ contractPath, rootDir: t.dir, dryRun: false });
    assert.equal(result.ok, true);
    assert.equal(result.logs.some((line) => line.entryId === 'delete-file-001' && line.deleted === true), true);
    assert.equal(fs.existsSync(path.join(t.dir, targetRel)), false);
  } finally {
    t.cleanup();
  }
});
