#!/usr/bin/env node
// reset-all.js — Factory reset: clear persisted runtime state for a true first run
const fs = require('fs');
const path = require('path');
const { resetNekoCoreRuntime } = require('./server/brain/nekocore/reset-runtime');

const root = path.join(__dirname);

const filesToDelete = [
  path.join('memories', 'identity.json'),
  path.join('memories', 'persona.json'),
  path.join('Config', 'ma-config.json')
];

const foldersToDelete = [
  'entities',
  path.join('memories', 'Memory2'),
  path.join('memories', 'archives'),
  path.join('memories', 'dreams'),
  path.join('memories', 'goals'),
  path.join('memories', 'traces')
];

const filesToRewrite = [
  { rel: path.join('server', 'data', 'accounts.json'), value: '[]\n' },
  { rel: path.join('server', 'data', 'sessions.json'), value: '{}\n' }
];

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  if (fs.lstatSync(target).isDirectory()) {
    fs.readdirSync(target).forEach((f) => rmrf(path.join(target, f)));
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

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

console.log('Factory reset complete. Ready for first run setup.');
