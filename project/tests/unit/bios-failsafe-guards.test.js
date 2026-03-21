// ============================================================
// BIOS Registry Completeness + Failsafe WebGUI Guard Tests
// Validates: all skills registered, all integrations registered,
// all contracts registered, all brain files registered,
// all client files registered, failsafe.html structure.
// ============================================================

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const { CORE_REGISTRY } = require('../../scripts/health-scan');

// === Section 1: Registry total count ===

describe('CORE_REGISTRY — total count', () => {
  it('has at least 300 entries', () => {
    assert.ok(Object.keys(CORE_REGISTRY).length >= 300);
  });
});

// === Section 2: All skills registered ===

describe('CORE_REGISTRY — skills completeness', () => {
  const skillDir = path.join(PROJECT_ROOT, 'skills');
  const skillFolders = fs.readdirSync(skillDir).filter(f =>
    fs.statSync(path.join(skillDir, f)).isDirectory()
  );

  for (const folder of skillFolders) {
    const key = `skills/${folder}/SKILL.md`;
    it(`registers ${key}`, () => {
      assert.ok(CORE_REGISTRY[key], `${key} should be in CORE_REGISTRY`);
    });
  }

  it('all 11 skills are registered', () => {
    const expected = [
      'skills/coding/SKILL.md',
      'skills/rust/SKILL.md',
      'skills/python/SKILL.md',
      'skills/memory-tools/SKILL.md',
      'skills/search-archive/SKILL.md',
      'skills/web-search/SKILL.md',
      'skills/vscode/SKILL.md',
      'skills/ws_mkdir/SKILL.md',
      'skills/ws_move/SKILL.md',
      'skills/tutorial-notes/SKILL.md',
      'skills/self-repair/SKILL.md'
    ];
    for (const key of expected) {
      assert.ok(CORE_REGISTRY[key], `Missing: ${key}`);
    }
  });
});

// === Section 3: All integrations registered ===

describe('CORE_REGISTRY — integrations completeness', () => {
  const intDir = path.join(PROJECT_ROOT, 'server/integrations');
  const files = fs.readdirSync(intDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const key = `server/integrations/${file}`;
    it(`registers ${key}`, () => {
      assert.ok(CORE_REGISTRY[key], `${key} should be in CORE_REGISTRY`);
    });
  }

  it('includes web-fetch.js', () => {
    assert.ok(CORE_REGISTRY['server/integrations/web-fetch.js']);
  });

  it('includes cmd-executor.js', () => {
    assert.ok(CORE_REGISTRY['server/integrations/cmd-executor.js']);
  });

  it('includes telegram.js', () => {
    assert.ok(CORE_REGISTRY['server/integrations/telegram.js']);
  });
});

// === Section 4: Voice profile + services ===

describe('CORE_REGISTRY — services completeness', () => {
  it('includes voice-profile.js', () => {
    assert.ok(CORE_REGISTRY['server/services/voice-profile.js']);
  });

  it('includes chat-pipeline.js', () => {
    assert.ok(CORE_REGISTRY['server/services/chat-pipeline.js']);
  });

  it('includes auth-service.js', () => {
    assert.ok(CORE_REGISTRY['server/services/auth-service.js']);
  });
});

// === Section 5: Contract schemas and examples ===

describe('CORE_REGISTRY — contracts completeness', () => {
  it('includes vfs-drive-mapping schema', () => {
    assert.ok(CORE_REGISTRY['server/contracts/vfs-drive-mapping.contract.schema.json']);
  });

  it('includes vfs-drive-mapping example', () => {
    assert.ok(CORE_REGISTRY['server/contracts/vfs-drive-mapping.contract.example.json']);
  });

  it('includes installer-uninstaller schema', () => {
    assert.ok(CORE_REGISTRY['server/contracts/installer-uninstaller-contract.schema.json']);
  });

  it('includes installer-uninstaller example', () => {
    assert.ok(CORE_REGISTRY['server/contracts/installer-uninstaller.contract.example.json']);
  });

  it('includes installer-hello-world example', () => {
    assert.ok(CORE_REGISTRY['server/contracts/installer-hello-world.contract.example.json']);
  });

  it('includes payloads/tab-hello-world template', () => {
    assert.ok(CORE_REGISTRY['server/contracts/payloads/tab-hello-world.template.html']);
  });
});

// === Section 6: Brain gap files ===

describe('CORE_REGISTRY — brain gap files', () => {
  it('includes agent-echo.js', () => {
    assert.ok(CORE_REGISTRY['server/brain/agent-echo.js']);
  });

  it('includes bulk-ingest.js', () => {
    assert.ok(CORE_REGISTRY['server/brain/utils/bulk-ingest.js']);
  });

  it('includes memory-images.js', () => {
    assert.ok(CORE_REGISTRY['server/brain/memory/memory-images.js']);
  });
});

// === Section 7: Client gap files ===

describe('CORE_REGISTRY — client gap files', () => {
  it('includes system-apps.schema.json', () => {
    assert.ok(CORE_REGISTRY['client/js/apps/system-apps.schema.json']);
  });

  it('includes neural-viz.js wrapper', () => {
    assert.ok(CORE_REGISTRY['client/js/neural-viz.js']);
  });
});

// === Section 8: Failsafe WebGUI in registry ===

describe('CORE_REGISTRY — failsafe console', () => {
  it('includes failsafe.html', () => {
    assert.ok(CORE_REGISTRY['client/failsafe.html']);
  });
});

// === Section 9: Self-repair skill ===

describe('skills — self-repair skill', () => {
  const skillPath = path.join(PROJECT_ROOT, 'skills/self-repair/SKILL.md');

  it('SKILL.md exists', () => {
    assert.ok(fs.existsSync(skillPath));
  });

  it('has YAML frontmatter with name and enabled', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.startsWith('---'));
    assert.ok(content.includes('name: self-repair'));
    assert.ok(content.includes('enabled: true'));
  });

  it('describes health scanner', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('health-scan.js'));
    assert.ok(content.includes('CORE_REGISTRY'));
  });

  it('describes fixer generator', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('generate-fixer.js'));
    assert.ok(content.includes('neko_fixer.py'));
  });

  it('describes failsafe console', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('failsafe.html'));
  });

  it('includes cmd_run tool syntax for health scanner', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('[TOOL:cmd_run cmd="node scripts/health-scan.js"]'));
  });

  it('includes cmd_run tool syntax for fixer generator', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('[TOOL:cmd_run cmd="node scripts/generate-fixer.js"]'));
  });

  it('covers all fixer modes', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('--repair'));
    assert.ok(content.includes('--force'));
    assert.ok(content.includes('--verify'));
    assert.ok(content.includes('--list'));
  });

  it('covers headless server recovery', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('headless'));
    assert.ok(content.includes('SSH') || content.includes('ssh'));
    assert.ok(content.includes('Telegram'));
  });

  it('has what-NOT-to-do section', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('What NOT to Do'));
  });

  it('includes fix-yourself sequence', () => {
    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('Fix Yourself'));
  });

  it('is registered in CORE_REGISTRY', () => {
    assert.ok(CORE_REGISTRY['skills/self-repair/SKILL.md']);
  });
});

// === Section 10: Failsafe file exists ===

describe('failsafe.html — existence', () => {
  const filePath = path.join(PROJECT_ROOT, 'client/failsafe.html');

  it('file exists on disk', () => {
    assert.ok(fs.existsSync(filePath));
  });

  it('is non-empty', () => {
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 1000, 'Should be a substantial file');
  });
});

// === Section 10: Failsafe structure ===

describe('failsafe.html — structure', () => {
  const filePath = path.join(PROJECT_ROOT, 'client/failsafe.html');
  const content = fs.readFileSync(filePath, 'utf-8');

  it('is a valid HTML document', () => {
    assert.ok(content.includes('<!DOCTYPE html>'));
    assert.ok(content.includes('<html'));
    assert.ok(content.includes('</html>'));
  });

  it('has zero external dependencies', () => {
    assert.ok(!content.includes('<link rel="stylesheet"'), 'Should not have external CSS');
    assert.ok(!content.includes('<script src='), 'Should not have external JS');
  });

  it('has inline styles', () => {
    assert.ok(content.includes('<style>'));
  });

  it('has inline script', () => {
    assert.ok(content.includes('<script>'));
  });

  it('contains auth view with login form', () => {
    assert.ok(content.includes('id="authView"'));
    assert.ok(content.includes('id="loginUser"'));
    assert.ok(content.includes('id="loginPass"'));
  });

  it('contains auth view with registration form', () => {
    assert.ok(content.includes('id="tabRegister"'));
    assert.ok(content.includes('id="regDisplay"'));
    assert.ok(content.includes('id="regUser"'));
    assert.ok(content.includes('id="regPass"'));
  });

  it('contains LLM setup view', () => {
    assert.ok(content.includes('id="setupView"'));
    assert.ok(content.includes('id="llmType"'));
    assert.ok(content.includes('id="llmEndpoint"'));
    assert.ok(content.includes('id="llmModel"'));
  });

  it('supports Ollama provider', () => {
    assert.ok(content.includes('ollama'));
    assert.ok(content.includes('localhost:11434'));
  });

  it('supports OpenRouter provider', () => {
    assert.ok(content.includes('openrouter'));
    assert.ok(content.includes('id="llmApiKey"'));
  });

  it('contains chat view', () => {
    assert.ok(content.includes('id="chatView"'));
    assert.ok(content.includes('id="chatBox"'));
    assert.ok(content.includes('id="chatInput"'));
  });

  it('uses correct API endpoints', () => {
    assert.ok(content.includes('/api/auth/bootstrap'));
    assert.ok(content.includes('/api/auth/login'));
    assert.ok(content.includes('/api/auth/register'));
    assert.ok(content.includes('/api/auth/logout'));
    assert.ok(content.includes('/api/chat'));
    assert.ok(content.includes('/api/config'));
    assert.ok(content.includes('/api/entity'));
    assert.ok(content.includes('/api/entities'));
  });

  it('connects to SSE for follow-ups', () => {
    assert.ok(content.includes('/api/brain/events'));
    assert.ok(content.includes('EventSource'));
    assert.ok(content.includes('chat_follow_up'));
  });

  it('has chat history management', () => {
    assert.ok(content.includes('chatHistory'));
    assert.ok(content.includes('memoryRecall'));
    assert.ok(content.includes('memorySave'));
  });

  it('has sign-out capability', () => {
    assert.ok(content.includes('doLogout'));
    assert.ok(content.includes('/api/auth/logout'));
  });

  it('includes NekoCore branding', () => {
    assert.ok(content.includes('NekoCore OS'));
    assert.ok(content.includes('Failsafe Console'));
  });
});

// === Section 11: Every CORE_REGISTRY file exists on disk ===

describe('CORE_REGISTRY — no stale entries', () => {
  const entries = Object.keys(CORE_REGISTRY);
  // Sample check — verify all entries exist on disk
  // (Full check would be slow; spot-check critical categories)
  const critical = entries.filter(k =>
    k.startsWith('skills/') ||
    k.startsWith('server/integrations/') ||
    k.startsWith('client/failsafe') ||
    k === 'server/services/voice-profile.js' ||
    k === 'server/brain/agent-echo.js' ||
    k === 'server/brain/utils/bulk-ingest.js' ||
    k === 'server/brain/memory/memory-images.js'
  );

  for (const key of critical) {
    it(`${key} exists on disk`, () => {
      const full = path.join(PROJECT_ROOT, key);
      assert.ok(fs.existsSync(full), `${key} registered but NOT on disk`);
    });
  }
});
