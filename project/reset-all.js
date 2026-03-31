#!/usr/bin/env node
// ── Module · Reset All ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// Factory reset script — clears persisted runtime state (entities, memories,
// auth, sessions) so the system boots as if it were the first run.
//
// WHAT USES THIS:
//   Called manually via `node reset-all.js` when a full wipe is needed.
//
// EXPORTS:
//   None — runs as a standalone script with side effects.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resetNekoCoreRuntime } = require('./server/brain/nekocore/reset-runtime');

const root = path.join(__dirname);

const filesToDelete = [
  // Memory state
  path.join('memories', 'identity.json'),
  path.join('memories', 'persona.json'),

  // Runtime config
  path.join('Config', 'ma-config.json'),

  // Task session data + audit trail
  path.join('server', 'data', 'task-sessions.json'),
  path.join('server', 'data', 'checkouts.json'),
  path.join('server', 'data', 'nekocore-audit.ndjson'),

  // Browser history / sessions
  path.join('server', 'data', 'browser-history.json'),
  path.join('server', 'data', 'browser-session.json'),
  path.join('server', 'data', 'browser-research-sessions.json'),

  // Workspace VFS metadata
  path.join('workspace', '.nekoMeta.json'),

  // Health scan output
  path.join('scripts', 'health-report.log')
];

const foldersToDelete = [
  'entities',
  path.join('memories', 'Memory2'),
  path.join('memories', 'archives'),
  path.join('memories', 'dreams'),
  path.join('memories', 'goals'),
  path.join('memories', 'logs'),
  path.join('memories', 'traces'),
  path.join('memories', 'beliefs'),
  path.join('workspace', 'desktop'),
  path.join('workspace', 'trash')
];

const filesToRewrite = [
  { rel: path.join('server', 'data', 'accounts.json'), value: '[]\n' },
  { rel: path.join('server', 'data', 'sessions.json'), value: '{}\n' }
];
// rmrf()
// WHAT THIS DOES: rmrf is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call rmrf(...) where this helper behavior is needed.
function rmrf(target) {
  if (!fs.existsSync(target)) return;
  if (fs.lstatSync(target).isDirectory()) {
    fs.readdirSync(target).forEach((f) => rmrf(path.join(target, f)));
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}
// ensureParentDir()
// WHAT THIS DOES: ensureParentDir is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureParentDir(...) where this helper behavior is needed.
function ensureParentDir(filePath) {
  const parent = path.dirname(filePath);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
}

// Delete explicit files
for (const rel of filesToDelete) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  fs.unlinkSync(abs);
  console.log('Deleted', abs);
}

// Clean up stale temp files (task-sessions.json.tmp-*, etc.)
const dataDir = path.join(root, 'server', 'data');
if (fs.existsSync(dataDir)) {
  for (const f of fs.readdirSync(dataDir)) {
    if (f.includes('.tmp-') || f.endsWith('.tmp')) {
      const abs = path.join(dataDir, f);
      fs.unlinkSync(abs);
      console.log('Deleted temp', abs);
    }
  }
}

// Delete explicit folders
for (const rel of foldersToDelete) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  rmrf(abs);
  console.log('Deleted', abs);
}

// Rewrite auth/session stores to empty defaults
for (const item of filesToRewrite) {
  const abs = path.join(root, item.rel);
  ensureParentDir(abs);
  fs.writeFileSync(abs, item.value, 'utf8');
  console.log('Reset', abs);
}

// Recreate NekoCore system entity and retain system-doc knowledge baseline
try {
  resetNekoCoreRuntime({ docsDir: path.join(root, 'Documents', 'current') });
  console.log('Reset', path.join(root, 'entities', 'entity_nekocore'));
} catch (e) {
  console.warn('Warning: NekoCore reprovision failed:', e.message);
}

// MA (Memory Architect) is a separate project — skip if not installed.
// Get MA at: https://github.com/voardwalker-code/MA-Memory-Architect
try {
  const maResetScript = path.join(root, 'MA', 'MA-Reset-All.js');
  if (fs.existsSync(maResetScript)) {
    execFileSync(process.execPath, [maResetScript, '--yes'], { stdio: 'inherit' });
    const maFilesToDelete = [
      path.join(root, 'MA', 'MA-Config', 'ma-config.json'),
      path.join(root, 'MA', 'ma.pid')
    ];
    for (const f of maFilesToDelete) {
      if (!fs.existsSync(f)) continue;
      fs.unlinkSync(f);
      console.log('Deleted', f);
    }
  } else {
    console.log('MA not installed — skipping MA reset.');
  }
} catch (e) {
  console.warn('Warning: MA reset failed:', e.message);
}

console.log('Factory reset complete. Ready for first run setup.');
