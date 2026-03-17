const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SkillManager = require('../../server/brain/skills/skill-manager');

function writeSkill(dir, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
}

test('loads OpenClaw-style metadata and disable-model-invocation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-skill-'));
  try {
    const skillsRoot = path.join(root, 'skills');
    const quarantineRoot = path.join(root, 'quarantine');

    writeSkill(path.join(skillsRoot, 'weather'), `---
name: weather
description: weather helper
metadata:
  {
    "openclaw": {
      "requires": { "bins": ["curl"], "env": ["API_KEY"] },
      "primaryEnv": "API_KEY"
    }
  }
disable-model-invocation: true
---

# Weather
Use curl.
`);

    const sm = new SkillManager();
    sm.skillsRoot = skillsRoot;
    sm.quarantineRoot = quarantineRoot;
    sm.loadAll();

    const skill = sm.get('weather');
    assert.ok(skill);
    assert.equal(skill.disableModelInvocation, true);
    assert.deepEqual(skill.requires.bins, ['curl']);
    assert.deepEqual(skill.requires.env, ['API_KEY']);
    assert.equal(skill.primaryEnv, 'API_KEY');

    // Disabled for model prompt injection but still active/enabled.
    assert.equal(sm.list().find(s => s.name === 'weather').enabled, true);
    assert.equal(sm.buildSkillsPrompt().includes('weather'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('setEnabled persists state in .skill-state.json without mutating SKILL frontmatter', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-skill-'));
  try {
    const skillsRoot = path.join(root, 'skills');
    const quarantineRoot = path.join(root, 'quarantine');
    const skillDir = path.join(skillsRoot, 'notes');

    writeSkill(skillDir, `---
name: notes
description: note helper
---

# Notes
`);

    const sm = new SkillManager();
    sm.skillsRoot = skillsRoot;
    sm.quarantineRoot = quarantineRoot;
    sm.loadAll();

    assert.equal(sm.setEnabled('notes', false), true);

    const statePath = path.join(skillsRoot, '.skill-state.json');
    assert.equal(fs.existsSync(statePath), true);
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(state.enabled.notes, false);

    const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    assert.equal(/\nenabled:/i.test(skillMd), false);

    // Reload should respect persisted override.
    sm.loadAll();
    assert.equal(sm.list().find(s => s.name === 'notes').enabled, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
