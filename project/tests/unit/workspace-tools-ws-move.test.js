'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { executeToolCalls } = require('../../server/brain/skills/workspace-tools');

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nekocore-ws-move-'));
}

test('ws_move moves a file and creates destination directories', async () => {
  const wsRoot = makeTempWorkspace();
  try {
    const srcRel = 'notes/today.txt';
    const dstRel = 'archive/2026/today.txt';
    const srcAbs = path.join(wsRoot, srcRel);
    fs.mkdirSync(path.dirname(srcAbs), { recursive: true });
    fs.writeFileSync(srcAbs, 'hello move', 'utf8');

    const payload = `[TOOL:ws_move src="${srcRel}" dst="${dstRel}"]`;
    const out = await executeToolCalls(payload, { workspacePath: wsRoot });

    assert.equal(out.hadTools, true);
    assert.equal(out.toolResults.length, 1);
    assert.equal(out.toolResults[0].command, 'ws_move');
    assert.equal(out.toolResults[0].result.ok, true);

    assert.equal(fs.existsSync(path.join(wsRoot, srcRel)), false);
    assert.equal(fs.existsSync(path.join(wsRoot, dstRel)), true);
    assert.equal(fs.readFileSync(path.join(wsRoot, dstRel), 'utf8'), 'hello move');
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});

test('ws_move rejects paths outside workspace root', async () => {
  const wsRoot = makeTempWorkspace();
  try {
    const payload = '[TOOL:ws_move src="../outside.txt" dst="inside.txt"]';
    const out = await executeToolCalls(payload, { workspacePath: wsRoot });

    assert.equal(out.hadTools, true);
    assert.equal(out.toolResults.length, 1);
    assert.equal(out.toolResults[0].command, 'ws_move');
    assert.equal(out.toolResults[0].result.ok, false);
    assert.match(out.toolResults[0].result.error, /outside workspace/i);
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});
