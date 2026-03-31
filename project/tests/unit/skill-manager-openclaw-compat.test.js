// ── Tests · Skill Manager Openclaw Compat.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict, node:fs, node:os, node:path. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SkillManager = require('../../server/brain/skills/skill-manager');
// writeSkill()
// WHAT THIS DOES: writeSkill changes saved state or updates data.
// WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
// HOW TO USE IT: call writeSkill(...) with the new values you want to persist.
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

    // Secure-by-default: newly loaded skills start disabled regardless of disable-model-invocation.
    assert.equal(sm.list().find(s => s.name === 'weather').enabled, false);
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
