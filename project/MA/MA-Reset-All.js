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
  // Chat sessions (saved task/project conversations)
  { path: 'MA-Config/chat-sessions', type: 'dir', label: 'Chat sessions' },
  // Model performance tracking
  { path: 'MA-Config/model-performance.json', type: 'file', label: 'Model performance data' },
  // Chores / scheduled tasks
  { path: 'MA-Config/chores.json', type: 'file', label: 'Chores schedule' },
  // Full MA entity (memories, index, archives, entity.json — recreated on boot)
  { path: 'MA-entity/entity_ma', type: 'dir', label: 'MA entity (full wipe — recreated on boot)' },
  // All agent directories (recreated on boot from defaults)
  { path: 'MA-entity', type: 'agents', label: 'Agent roster (full wipe — recreated on boot)' },
  // Workspace (full wipe — projects now in separate repo)
  { path: 'MA-workspace', type: 'dir', label: 'Workspace (full wipe)' },
  // Pulse health log
  { path: 'MA-logs/pulse-health.log', type: 'file', label: 'Pulse health log' },
];

// Files that should NOT be deleted (preserve config and examples)
const PRESERVE = [
  'MA-Config/ma-config.json',
  'MA-Config/cmd-whitelist.json',
  'MA-Config/pulse-config.json',
  'MA-Config/model-roster.json',
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

// Delete all agent_* directories inside MA-entity/
function deleteAgents(entityDir) {
  if (!fs.existsSync(entityDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(entityDir)) {
    if (!entry.startsWith('agent_')) continue;
    const full = path.join(entityDir, entry);
    if (!fs.statSync(full).isDirectory()) continue;
    count += deleteDir(full);
    fs.rmdirSync(full);
    count++; // count the dir itself
  }
  return count;
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
    let exists;
    if (t.type === 'agents') {
      // Only count as existing if there are agent_* dirs
      exists = fs.existsSync(full) &&
        fs.readdirSync(full).some(e => e.startsWith('agent_'));
    } else {
      exists = fs.existsSync(full);
    }
    const mark = exists ? '\x1b[33m✦\x1b[0m' : '\x1b[90m·\x1b[0m';
    console.log(`  ${mark} ${t.label.padEnd(44)} ${exists ? t.path : '(not found)'}`);
    if (exists) actions.push(t);
  }

  console.log('\n  Preserved (not touched):');
  for (const p of PRESERVE) {
    const exists = fs.existsSync(path.join(ROOT, p));
    console.log(`    \x1b[32m✓\x1b[0m ${p}${exists ? '' : ' (not found)'}`);
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
    } else if (t.type === 'agents') {
      const count = deleteAgents(full);
      console.log(`  \x1b[31m✗\x1b[0m ${t.label}: removed ${count} item(s)`);
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

  console.log(`\n  Done — removed ${totalFiles} file(s). MA is ready for a fresh start.`);
  console.log('  Entity and agents will be auto-provisioned on next boot.\n');
}

main().catch(e => { console.error('Reset error:', e.message); process.exit(1); });
