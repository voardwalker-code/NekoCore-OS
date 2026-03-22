#!/usr/bin/env node
// ── MA Reset All ─────────────────────────────────────────────────────────────
// Wipes MA runtime data for a clean start: config, chat history, memories,
// workspace files, logs, and model performance data.
// Usage:  node MA-Reset-All.js          (interactive — asks for confirmation)
//         node MA-Reset-All.js --yes    (skip confirmation)
'use strict';

const fs   = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = __dirname;

// ── Targets to clear ────────────────────────────────────────────────────────
const TARGETS = [
  // Chat history
  { path: 'MA-Config/chat-history.json', type: 'file', label: 'Chat history' },
  // Model performance tracking
  { path: 'MA-Config/model-performance.json', type: 'file', label: 'Model performance data' },
  // Chores / scheduled tasks
  { path: 'MA-Config/chores.json', type: 'file', label: 'Chores schedule' },
  // Entity memories
  { path: 'MA-entity/entity_ma/memories', type: 'dir', label: 'MA memories' },
  // Entity memory index
  { path: 'MA-entity/entity_ma/index', type: 'dir', label: 'MA memory index' },
  // Entity archives
  { path: 'MA-entity/entity_ma/archives', type: 'dir', label: 'MA memory archives' },
  // Workspace temp files (preserves built projects with PROJECT-MANIFEST.json)
  { path: 'MA-workspace', type: 'dir-shallow', label: 'Workspace temp files' },
  // Pulse health log
  { path: 'MA-logs/pulse-health.log', type: 'file', label: 'Pulse health log' },
];

// Files that should NOT be deleted (preserve config and examples)
const PRESERVE = [
  'MA-Config/ma-config.json',
  'MA-Config/cmd-whitelist.json',
  'MA-Config/pulse-config.json',
  'MA-Config/model-roster.json',
  'MA-entity/entity_ma/entity.json',
  'MA-entity/entity_ma/skills',
];

function deleteDir(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      count += deleteDir(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
      count++;
    }
  }
  return count;
}

// Delete only loose files and non-project subdirs (preserves dirs with PROJECT-MANIFEST.json)
function deleteDirShallow(dirPath) {
  if (!fs.existsSync(dirPath)) return { deleted: 0, preserved: [] };
  let deleted = 0;
  const preserved = [];
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const manifest = path.join(full, 'PROJECT-MANIFEST.json');
      if (fs.existsSync(manifest)) {
        preserved.push(entry);
        continue;
      }
      deleted += deleteDir(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
      deleted++;
    }
  }
  return { deleted, preserved };
}

function deleteFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

async function confirm(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

  console.log('\n  MA Reset All');
  console.log('  ============\n');
  console.log('  This will delete the following:\n');

  const actions = [];
  for (const t of TARGETS) {
    const full = path.join(ROOT, t.path);
    const exists = fs.existsSync(full);
    const mark = exists ? '\x1b[33m✦\x1b[0m' : '\x1b[90m·\x1b[0m';
    console.log(`  ${mark} ${t.label.padEnd(28)} ${exists ? t.path : '(not found)'}`);
    if (exists) actions.push(t);
  }

  console.log('\n  Preserved (not touched):');
  for (const p of PRESERVE) {
    const exists = fs.existsSync(path.join(ROOT, p));
    console.log(`    \x1b[32m✓\x1b[0m ${p}${exists ? '' : ' (not found)'}`);
  }
  // Show workspace projects that will be preserved
  const wsDir = path.join(ROOT, 'MA-workspace');
  if (fs.existsSync(wsDir)) {
    for (const entry of fs.readdirSync(wsDir)) {
      const manifest = path.join(wsDir, entry, 'PROJECT-MANIFEST.json');
      if (fs.existsSync(manifest)) {
        console.log(`    \x1b[32m✓\x1b[0m MA-workspace/${entry}/ (has PROJECT-MANIFEST.json)`);
      }
    }
  }

  if (!actions.length) {
    console.log('\n  Nothing to reset — already clean.\n');
    return;
  }

  if (!skipConfirm) {
    const answer = await confirm('\n  Proceed with reset? (yes/no): ');
    if (answer !== 'yes' && answer !== 'y') {
      console.log('  Cancelled.\n');
      return;
    }
  }

  console.log('');
  let totalFiles = 0;

  for (const t of actions) {
    const full = path.join(ROOT, t.path);
    if (t.type === 'dir') {
      const count = deleteDir(full);
      // Recreate the empty directory
      fs.mkdirSync(full, { recursive: true });
      console.log(`  \x1b[31m✗\x1b[0m ${t.label}: removed ${count} file(s)`);
      totalFiles += count;
    } else if (t.type === 'dir-shallow') {
      const { deleted, preserved } = deleteDirShallow(full);
      console.log(`  \x1b[31m✗\x1b[0m ${t.label}: removed ${deleted} file(s)`);
      if (preserved.length) {
        console.log(`    \x1b[32m✓\x1b[0m Preserved ${preserved.length} project(s): ${preserved.join(', ')}`);
      }
      totalFiles += deleted;
    } else {
      if (deleteFile(full)) {
        console.log(`  \x1b[31m✗\x1b[0m ${t.label}: deleted`);
        totalFiles++;
      }
    }
  }

  console.log(`\n  Done — removed ${totalFiles} file(s). MA is ready for a fresh start.\n`);
}

main().catch(e => { console.error('Reset error:', e.message); process.exit(1); });
