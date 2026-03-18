#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { applyMarkerEntries, removeMarkerEntries } = require('./installer-marker-engine');

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  const command = args[0] || null;
  const flags = {
    command,
    contractPath: null,
    rootDir: process.cwd(),
    dryRun: false,
    logPath: null
  };

  for (let i = 1; i < args.length; i++) {
    const cur = args[i];
    if (cur === '--dry') {
      flags.dryRun = true;
      continue;
    }
    if (cur === '--contract') {
      flags.contractPath = args[i + 1] || null;
      i++;
      continue;
    }
    if (cur === '--root') {
      flags.rootDir = args[i + 1] ? path.resolve(args[i + 1]) : flags.rootDir;
      i++;
      continue;
    }
    if (cur === '--log') {
      flags.logPath = args[i + 1] ? path.resolve(args[i + 1]) : null;
      i++;
      continue;
    }
  }

  return flags;
}

function _readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function _groupInsertActions(contract) {
  const actions = Array.isArray(contract.installActions) ? contract.installActions : [];
  const grouped = new Map();
  const createFiles = [];

  for (const action of actions) {
    if (!action) {
      return { error: 'installActions cannot contain null entries' };
    }

    if (action.type === 'insert') {
      if (!action.filePath || !action.entryId || typeof action.payload !== 'string') {
        return { error: 'each insert action requires filePath, entryId, and payload' };
      }
      if (!grouped.has(action.filePath)) grouped.set(action.filePath, []);
      grouped.get(action.filePath).push({ entryId: action.entryId, writtenBlock: action.payload });
      continue;
    }

    if (action.type === 'create-file') {
      if (!action.filePath || !action.entryId) {
        return { error: 'each create-file action requires filePath and entryId' };
      }
      const hasPayload = typeof action.payload === 'string';
      const hasTemplatePath = typeof action.templatePath === 'string' && action.templatePath.trim().length > 0;
      if (!hasPayload && !hasTemplatePath) {
        return { error: 'create-file action requires payload or templatePath' };
      }
      createFiles.push(action);
      continue;
    }

    return { error: 'installActions supports only insert and create-file types' };
  }

  return { grouped, createFiles };
}

function _readCreatePayload(rootDir, action) {
  if (typeof action.payload === 'string') return action.payload;
  const templateRel = String(action.templatePath || '').trim();
  const templateAbs = path.resolve(rootDir, templateRel);
  if (!templateAbs.startsWith(rootDir)) {
    return { error: `template path escapes root: ${templateRel}` };
  }
  if (!fs.existsSync(templateAbs)) {
    return { error: `template file not found: ${templateRel}` };
  }
  return fs.readFileSync(templateAbs, 'utf8');
}

function _stageCreateFiles(rootDir, createActions) {
  const writes = [];
  const logs = [];
  for (const action of createActions) {
    const relPath = String(action.filePath || '').trim();
    const absPath = path.resolve(rootDir, relPath);
    if (!absPath.startsWith(rootDir)) {
      return { error: `path escapes root: ${relPath}` };
    }
    if (fs.existsSync(absPath) && action.overwrite !== true) {
      return { error: `target file already exists: ${relPath}` };
    }
    const content = _readCreatePayload(rootDir, action);
    if (content && content.error) {
      return { error: content.error };
    }
    writes.push({ absPath, updatedContent: String(content), mkdir: true });
    logs.push({ filePath: relPath, mode: 'install', entryId: action.entryId, created: true });
  }
  return { writes, logs };
}

function _stageDeleteFiles(rootDir, deleteActions) {
  const deletes = [];
  const logs = [];
  for (const action of deleteActions) {
    const relPath = String(action.filePath || '').trim();
    const absPath = path.resolve(rootDir, relPath);
    if (!absPath.startsWith(rootDir)) {
      return { error: `path escapes root: ${relPath}` };
    }
    if (!fs.existsSync(absPath)) {
      return { error: `target file not found: ${relPath}` };
    }
    deletes.push({ absPath });
    logs.push({ filePath: relPath, mode: 'uninstall', entryId: action.entryId, deleted: true });
  }
  return { deletes, logs };
}

function _applyWritesAndDeletes(stagedWrites, stagedDeletes) {
  for (const item of stagedWrites) {
    if (item.mkdir) fs.mkdirSync(path.dirname(item.absPath), { recursive: true });
    fs.writeFileSync(item.absPath, item.updatedContent, 'utf8');
  }
  for (const item of stagedDeletes) {
    fs.rmSync(item.absPath, { force: true });
  }
}

function _groupRemoveActions(contract) {
  const actions = Array.isArray(contract.uninstallActions) ? contract.uninstallActions : [];
  const grouped = new Map();
  const deleteFiles = [];

  for (const action of actions) {
    if (!action) {
      return { error: 'uninstallActions cannot contain null entries' };
    }

    if (action.type === 'remove') {
      if (!action.filePath || !action.entryId) {
        return { error: 'each remove action requires filePath and entryId' };
      }
      if (!grouped.has(action.filePath)) grouped.set(action.filePath, []);
      grouped.get(action.filePath).push({ entryId: action.entryId });
      continue;
    }

    if (action.type === 'delete-file') {
      if (!action.filePath || !action.entryId) {
        return { error: 'each delete-file action requires filePath and entryId' };
      }
      deleteFiles.push(action);
      continue;
    }

    return { error: 'uninstallActions supports only remove and delete-file types' };
  }

  return { grouped, deleteFiles };
}

function _runPlanByGroupedActions(input, grouped, applyFn, mode) {
  const rootDir = path.resolve(input.rootDir || process.cwd());
  const dryRun = !!input.dryRun;
  const stagedWrites = [];
  const logs = [];

  for (const [filePath, entries] of grouped.entries()) {
    const absPath = path.resolve(rootDir, filePath);
    if (!absPath.startsWith(rootDir)) {
      return { ok: false, error: `path escapes root: ${filePath}`, rollback: true, logs: [] };
    }
    if (!fs.existsSync(absPath)) {
      return { ok: false, error: `target file not found: ${filePath}`, rollback: true, logs: [] };
    }

    const original = fs.readFileSync(absPath, 'utf8');
    const applied = applyFn(original, entries);
    if (!applied.ok) {
      return {
        ok: false,
        error: `${filePath}: ${applied.error}`,
        rollback: true,
        logs: []
      };
    }

    stagedWrites.push({ absPath, updatedContent: applied.updatedContent });
    for (const line of applied.logs) {
      logs.push({ filePath, mode, ...line });
    }
  }

  if (!dryRun) {
    for (const item of stagedWrites) {
      fs.writeFileSync(item.absPath, item.updatedContent, 'utf8');
    }
  }

  return {
    ok: true,
    rollback: false,
    dryRun,
    appliedFiles: stagedWrites.length,
    logs
  };
}

function runInstallPlan(input) {
  const contractPath = path.resolve(input.contractPath || '');

  if (!contractPath) {
    return { ok: false, error: 'missing contract path', rollback: true, logs: [] };
  }
  if (!fs.existsSync(contractPath)) {
    return { ok: false, error: 'contract file not found', rollback: true, logs: [] };
  }

  let contract;
  try {
    contract = _readJson(contractPath);
  } catch (err) {
    return { ok: false, error: `invalid contract json: ${err.message}`, rollback: true, logs: [] };
  }

  const groupedRes = _groupInsertActions(contract);
  if (groupedRes.error) {
    return { ok: false, error: groupedRes.error, rollback: true, logs: [] };
  }

  const rootDir = path.resolve(input.rootDir || process.cwd());
  const dryRun = !!input.dryRun;

  const createStage = _stageCreateFiles(rootDir, groupedRes.createFiles || []);
  if (createStage.error) {
    return { ok: false, error: createStage.error, rollback: true, logs: [] };
  }

  const markerStage = _runPlanByGroupedActions({ ...input, dryRun: true }, groupedRes.grouped, applyMarkerEntries, 'install');
  if (!markerStage.ok) return markerStage;

  const stagedWrites = [...createStage.writes];

  // rebuild marker staged writes by re-running grouped actions in dry mode-compatible way
  for (const [filePath, entries] of groupedRes.grouped.entries()) {
    const absPath = path.resolve(rootDir, filePath);
    const original = fs.readFileSync(absPath, 'utf8');
    const applied = applyMarkerEntries(original, entries);
    stagedWrites.push({ absPath, updatedContent: applied.updatedContent, mkdir: false });
  }

  const logs = [...createStage.logs, ...markerStage.logs];
  if (!dryRun) {
    _applyWritesAndDeletes(stagedWrites, []);
  }

  return {
    ok: true,
    rollback: false,
    dryRun,
    appliedFiles: new Set(stagedWrites.map((w) => w.absPath)).size,
    logs
  };
}

function runUninstallPlan(input) {
  const contractPath = path.resolve(input.contractPath || '');

  if (!contractPath) {
    return { ok: false, error: 'missing contract path', rollback: true, logs: [] };
  }
  if (!fs.existsSync(contractPath)) {
    return { ok: false, error: 'contract file not found', rollback: true, logs: [] };
  }

  let contract;
  try {
    contract = _readJson(contractPath);
  } catch (err) {
    return { ok: false, error: `invalid contract json: ${err.message}`, rollback: true, logs: [] };
  }

  const groupedRes = _groupRemoveActions(contract);
  if (groupedRes.error) {
    return { ok: false, error: groupedRes.error, rollback: true, logs: [] };
  }

  const rootDir = path.resolve(input.rootDir || process.cwd());
  const dryRun = !!input.dryRun;

  const deleteStage = _stageDeleteFiles(rootDir, groupedRes.deleteFiles || []);
  if (deleteStage.error) {
    return { ok: false, error: deleteStage.error, rollback: true, logs: [] };
  }

  const markerStage = _runPlanByGroupedActions({ ...input, dryRun: true }, groupedRes.grouped, removeMarkerEntries, 'uninstall');
  if (!markerStage.ok) return markerStage;

  const stagedWrites = [];
  for (const [filePath, entries] of groupedRes.grouped.entries()) {
    const absPath = path.resolve(rootDir, filePath);
    const original = fs.readFileSync(absPath, 'utf8');
    const applied = removeMarkerEntries(original, entries);
    stagedWrites.push({ absPath, updatedContent: applied.updatedContent, mkdir: false });
  }

  const logs = [...markerStage.logs, ...deleteStage.logs];
  if (!dryRun) {
    _applyWritesAndDeletes(stagedWrites, deleteStage.deletes);
  }

  return {
    ok: true,
    rollback: false,
    dryRun,
    appliedFiles: new Set([...stagedWrites.map((w) => w.absPath), ...deleteStage.deletes.map((d) => d.absPath)]).size,
    logs
  };
}

function runCli(argv) {
  const args = parseArgs(argv);
  if (args.command !== 'install' && args.command !== 'uninstall') {
    const payload = { ok: false, error: 'usage: node server/tools/installer-cli.js <install|uninstall> --contract <path> [--root <dir>] [--dry] [--log <path>]' };
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return 1;
  }

  const planInput = {
    contractPath: args.contractPath,
    rootDir: args.rootDir,
    dryRun: args.dryRun
  };
  const result = args.command === 'install'
    ? runInstallPlan(planInput)
    : runUninstallPlan(planInput);

  if (result.ok && args.logPath) {
    fs.mkdirSync(path.dirname(args.logPath), { recursive: true });
    fs.writeFileSync(args.logPath, JSON.stringify(result.logs, null, 2), 'utf8');
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result.ok ? 0 : 1;
}

if (require.main === module) {
  const code = runCli(process.argv.slice(2));
  process.exit(code);
}

module.exports = {
  parseArgs,
  runInstallPlan,
  runUninstallPlan,
  runCli
};
