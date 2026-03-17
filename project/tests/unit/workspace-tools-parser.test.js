const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const workspaceTools = require('../../server/brain/skills/workspace-tools');

test('extractToolCalls parses flexible TOOL tag syntax', () => {
  const text = [
    'Do this now [TOOL: ws_write path="notes.md" content="hello"] and continue.',
    "Then [tool:ws_append path='notes.md' content=' more'] done.",
    'Also [TOOL:ws-move src="a.txt" dst="b.txt"]'
  ].join('\n');

  const calls = workspaceTools.extractToolCalls(text);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].command.toLowerCase(), 'ws_write');
  assert.equal(calls[1].command.toLowerCase(), 'ws_append');
  assert.equal(calls[2].command.toLowerCase(), 'ws-move');
  assert.equal(calls[0].params.path, 'notes.md');
  assert.equal(calls[1].params.content, ' more');
  assert.equal(calls[2].params.src, 'a.txt');
});

test('stripToolCalls removes mixed-case and spaced tags', () => {
  const text = 'Start [TOOL: ws_write path="a.txt" content="x"] mid [tool:ws_read path="a.txt"] end';
  const stripped = workspaceTools.stripToolCalls(text);
  assert.equal(stripped, 'Start  mid  end');
});

test('executeToolCalls normalizes hyphen command names', async () => {
  const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-tools-'));
  try {
    fs.writeFileSync(path.join(wsRoot, 'a.txt'), 'x', 'utf8');
    const output = await workspaceTools.executeToolCalls(
      '[TOOL:ws-move src="a.txt" dst="moved/a.txt"]',
      { workspacePath: wsRoot }
    );

    assert.equal(output.hadTools, true);
    assert.equal(output.toolResults.length, 1);
    assert.equal(output.toolResults[0].command, 'ws_move');
    assert.equal(output.toolResults[0].result.ok, true);
    assert.equal(fs.existsSync(path.join(wsRoot, 'moved', 'a.txt')), true);
  } finally {
    fs.rmSync(wsRoot, { recursive: true, force: true });
  }
});
