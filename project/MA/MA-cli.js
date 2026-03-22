#!/usr/bin/env node
// ── MA-cli.js ───────────────────────────────────────────────────────────────
// MA — Terminal interface. Chat, run tasks, manage memory, check health.
// Same core as MA-Server.js but no HTTP, no browser.
// Start: node MA-cli.js
'use strict';

const readline = require('readline');
const core     = require('./MA-server/MA-core');
const cmdExec  = require('./MA-server/MA-cmd-executor');

const history = [];

// ── Banner ──────────────────────────────────────────────────────────────────
function banner() {
  console.log('');
  console.log('  Commands:');
  console.log('    /health            — run health scan');
  console.log('    /memory stats      — memory statistics');
  console.log('    /memory search <q> — search memories');
  console.log('    /knowledge         — list knowledge docs');
  console.log('    /knowledge <name>  — show a knowledge doc');
  console.log('    /ingest <file>     — ingest a file into memory');
  console.log('    /config            — show current LLM config');
  console.log('    /projects          — list all project archives');
  console.log('    /project open <id> — resume a closed project');
  console.log('    /project close <id>— close a project');
  console.log('    /project status <id>— show project stats');
  console.log('    /whitelist         — show allowed commands');
  console.log('    /whitelist add <b> — allow a command (+ optional subs)');
  console.log('    /whitelist remove <b>— remove a command');
  console.log('    /whitelist reset   — reset to defaults');
  console.log('    /help              — show this help');
  console.log('    /exit              — quit');
  console.log('');
  console.log('  Anything else is sent to MA as a chat message.');
  console.log('');
}

// ── Slash command handler ───────────────────────────────────────────────────
async function handleSlash(line) {
  const parts = line.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  switch (cmd) {
    case 'health': {
      const result = core.health.scan();
      console.log(core.health.formatReport(result));
      return;
    }

    case 'memory': {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'stats') {
        const mem = core.getMemory();
        console.log(mem ? mem.stats() : 'No memory store');
      } else if (sub === 'search') {
        const q = parts.slice(2).join(' ');
        if (!q) { console.log('  Usage: /memory search <query>'); return; }
        const mem = core.getMemory();
        const results = mem ? mem.search(q, 5) : [];
        if (!results.length) { console.log('  No results.'); return; }
        for (const r of results) {
          console.log(`  [${r.score.toFixed(2)}] ${(r.summary || '').slice(0, 120)}`);
          if (r.topics?.length) console.log(`         topics: ${r.topics.slice(0, 6).join(', ')}`);
        }
      } else {
        console.log('  /memory stats | /memory search <query>');
      }
      return;
    }

    case 'knowledge': {
      if (!arg) {
        const docs = core.listKnowledge();
        if (!docs.length) { console.log('  No knowledge docs in MA-knowledge/'); return; }
        console.log('  Knowledge docs:');
        for (const d of docs) console.log(`    ${d}`);
      } else {
        const content = core.loadKnowledge(arg);
        if (content) console.log(content);
        else console.log(`  Not found: ${arg}`);
      }
      return;
    }

    case 'ingest': {
      if (!arg) { console.log('  Usage: /ingest <filepath>'); return; }
      try {
        const mem = core.getMemory();
        const result = mem.ingest(arg, {});
        console.log(`  Ingested: ${result.chunksStored} chunks`);
      } catch (e) { console.log(`  Error: ${e.message}`); }
      return;
    }

    case 'config': {
      const config = core.getConfig();
      if (config) {
        console.log(`  Type: ${config.type}`);
        console.log(`  Model: ${config.model}`);
        console.log(`  Endpoint: ${config.endpoint}`);
        console.log(`  API Key: ${config.apiKey ? '***configured***' : '(none)'}`);
      } else {
        console.log('  Not configured. Edit MA-Config/ma-config.json');
      }
      return;
    }

    case 'help':
      banner();
      return;

    case 'projects': {
      const projects = core.projectArchive.listProjects();
      if (!projects.length) { console.log('  No project archives.'); return; }
      console.log('  Project Archives:');
      for (const p of projects) console.log(`    ${p.id} (${p.status}) — ${p.name}, ${p.nodeCount || 0} nodes`);
      return;
    }

    case 'project': {
      const sub = (parts[1] || '').toLowerCase();
      const id = parts.slice(2).join(' ').trim();
      if (sub === 'open' && id) {
        try {
          const p = core.projectArchive.resumeProject(id);
          console.log(`  Project ${p.id} reopened (${p.status}). ${p.nodeCount || 0} nodes.`);
        } catch (e) { console.log(`  Error: ${e.message}`); }
        return;
      }
      if (sub === 'close' && id) {
        try {
          const p = core.projectArchive.closeProject(id);
          console.log(`  Project ${p.id} closed.`);
        } catch (e) { console.log(`  Error: ${e.message}`); }
        return;
      }
      if (sub === 'status' && id) {
        const s = core.projectArchive.getArchiveStats(id);
        if (!s) { console.log(`  Project not found: ${id}`); return; }
        console.log(JSON.stringify(s, null, 2));
        return;
      }
      console.log('  Usage: /project open|close|status <id>');
      return;
    }

    case 'whitelist': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub) {
        const wl = cmdExec.getWhitelist();
        console.log('  Command Whitelist:');
        for (const [bin, subs] of Object.entries(wl)) {
          console.log(subs ? `    ${bin}: [${subs.join(', ')}]` : `    ${bin}: (all subcommands)`);
        }
        return;
      }
      if (sub === 'add') {
        const bin = parts[2];
        if (!bin) { console.log('  Usage: /whitelist add <binary> [sub1,sub2,...]'); return; }
        const subs = parts[3] ? parts[3].split(',').map(s => s.trim()).filter(Boolean) : null;
        try {
          cmdExec.whitelistAdd(bin, subs);
          console.log(`  Added: ${bin}` + (subs ? ` [${subs.join(', ')}]` : ' (all subcommands)'));
        } catch (e) { console.log(`  Error: ${e.message}`); }
        return;
      }
      if (sub === 'remove') {
        const bin = parts[2];
        if (!bin) { console.log('  Usage: /whitelist remove <binary>'); return; }
        try {
          cmdExec.whitelistRemove(bin);
          console.log(`  Removed: ${bin}`);
        } catch (e) { console.log(`  Error: ${e.message}`); }
        return;
      }
      if (sub === 'reset') {
        cmdExec.whitelistReset();
        console.log('  Whitelist reset to defaults.');
        return;
      }
      console.log('  Usage: /whitelist | /whitelist add|remove|reset');
      return;
    }

    case 'exit':
    case 'quit':
      console.log('  Bye.');
      process.exit(0);

    default:
      console.log(`  Unknown command: /${cmd}. Type /help for commands.`);
  }
}

// ── Main REPL ───────────────────────────────────────────────────────────────
async function main() {
  core.boot();

  if (!core.isConfigured()) {
    console.log('\n  ⚠ No LLM configured. Edit MA-Config/ma-config.json or use the GUI (node MA-Server.js)');
  }

  console.log(`\n  ✓ Workspace: ${core.WORKSPACE_DIR}`);
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'MA> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) { rl.prompt(); return; }

    if (trimmed.startsWith('/')) {
      await handleSlash(trimmed);
      rl.prompt();
      return;
    }

    // Chat message
    if (!core.isConfigured()) {
      console.log('  ⚠ No LLM configured. Edit MA-Config/ma-config.json first.');
      rl.prompt();
      return;
    }

    try {
      process.stdout.write('  ...\r');
      const result = await core.handleChat({ message: trimmed, history });
      // Clear the spinner
      process.stdout.write('       \r');
      console.log(`\n  MA: ${result.reply}`);
      if (result.taskType) console.log(`  [task: ${result.taskType}, steps: ${result.steps}]`);
      console.log('');

      // Maintain conversation history for context
      history.push({ role: 'user', content: trimmed });
      history.push({ role: 'assistant', content: result.reply });
      // Keep last 20 turns
      while (history.length > 40) history.shift();
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n  Bye.');
    process.exit(0);
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
