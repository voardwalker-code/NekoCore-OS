// ── MA-slash-commands.js ─────────────────────────────────────────────────────
// Slash-command handler extracted from MA-Server.js.
// Each /command maps to the same module calls the HTTP routes use.
'use strict';

const core        = require('./MA-core');
const cmdExec     = require('./MA-cmd-executor');
const pulse       = require('./MA-pulse');
const modelRouter = require('./MA-model-router');

async function handleSlashCommand(line) {
  const parts = line.slice(1).split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  switch (cmd) {
    case 'health': {
      const result = core.health.scan();
      return { type: 'system', text: core.health.formatReport(result) };
    }
    case 'memory': {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'stats') {
        const mem = core.getMemory();
        return { type: 'system', text: mem ? JSON.stringify(mem.stats(), null, 2) : 'No memory store' };
      }
      if (sub === 'search') {
        const q = parts.slice(2).join(' ');
        if (!q) return { type: 'system', text: 'Usage: /memory search <query>' };
        const mem = core.getMemory();
        const cfg = core.getConfig();
        const limit = (cfg && cfg.memoryLimit > 0) ? cfg.memoryLimit : 5;
        const results = mem ? mem.search(q, limit) : [];
        if (!results.length) return { type: 'system', text: 'No results.' };
        const text = results.map(r => `[${r.score.toFixed(2)}] ${(r.summary || '').slice(0, 120)}`).join('\n');
        return { type: 'system', text };
      }
      return { type: 'system', text: 'Usage: /memory stats | /memory search <query>' };
    }
    case 'knowledge': {
      if (!arg) {
        const docs = core.listKnowledge();
        return { type: 'system', text: docs.length ? 'Knowledge docs:\n' + docs.join('\n') : 'No knowledge docs.' };
      }
      const content = core.loadKnowledge(arg);
      return { type: 'system', text: content || `Not found: ${arg}` };
    }
    case 'ingest': {
      if (!arg) return { type: 'system', text: 'Usage: /ingest <filepath>' };
      try {
        const mem = core.getMemory();
        const result = mem.ingest(arg, {});
        return { type: 'system', text: `Ingested: ${result.chunksStored} chunks` };
      } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
    }
    case 'config': {
      const cfg = core.getConfig();
      if (cfg) return { type: 'system', text: `Type: ${cfg.type}\nModel: ${cfg.model}\nEndpoint: ${cfg.endpoint}\nMax Tokens: ${cfg.maxTokens || 12288}` };
      return { type: 'system', text: 'Not configured. Click ⚙ to set up.' };
    }
    case 'projects': {
      const projects = core.projectArchive.listProjects();
      if (!projects.length) return { type: 'system', text: 'No project archives.' };
      const text = projects.map(p => `${p.id} (${p.status}) — ${p.name}, ${p.nodeCount || 0} nodes`).join('\n');
      return { type: 'system', text: 'Project Archives:\n' + text };
    }
    case 'project': {
      const sub = (parts[1] || '').toLowerCase();
      const id = parts.slice(2).join(' ').trim();
      if (sub === 'open' && id) {
        try {
          const p = core.projectArchive.resumeProject(id);
          return { type: 'system', text: `Project ${p.id} reopened (${p.status}). ${p.nodeCount || 0} nodes, ${p.edgeCount || 0} edges.` };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'close' && id) {
        try {
          const p = core.projectArchive.closeProject(id);
          return { type: 'system', text: `Project ${p.id} closed.` };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'status' && id) {
        const s = core.projectArchive.getArchiveStats(id);
        if (!s) return { type: 'system', text: `Project not found: ${id}` };
        return { type: 'system', text: JSON.stringify(s, null, 2) };
      }
      return { type: 'system', text: 'Usage: /project open|close|status <id>' };
    }
    case 'whitelist': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub) {
        const wl = cmdExec.getWhitelist();
        const lines = Object.entries(wl).map(([bin, subs]) =>
          subs ? `  ${bin}: [${subs.join(', ')}]` : `  ${bin}: (all subcommands)`
        );
        return { type: 'system', text: 'Command Whitelist:\n' + lines.join('\n') };
      }
      if (sub === 'add') {
        const bin = parts[2];
        if (!bin) return { type: 'system', text: 'Usage: /whitelist add <binary> [sub1,sub2,...]' };
        const subs = parts[3] ? parts[3].split(',').map(s => s.trim()).filter(Boolean) : null;
        try {
          cmdExec.whitelistAdd(bin, subs);
          return { type: 'system', text: `Added: ${bin}` + (subs ? ` [${subs.join(', ')}]` : ' (all subcommands)') };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'remove') {
        const bin = parts[2];
        if (!bin) return { type: 'system', text: 'Usage: /whitelist remove <binary>' };
        try {
          cmdExec.whitelistRemove(bin);
          return { type: 'system', text: `Removed: ${bin}` };
        } catch (e) { return { type: 'system', text: `Error: ${e.message}` }; }
      }
      if (sub === 'reset') {
        cmdExec.whitelistReset();
        return { type: 'system', text: 'Whitelist reset to defaults.' };
      }
      return { type: 'system', text: 'Usage: /whitelist | /whitelist add|remove|reset' };
    }
    case 'pulse': {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'status' || !sub) {
        const status = pulse.getPulseStatus();
        const cfg = pulse.getPulseConfig();
        const lines = ['Pulse Status:'];
        for (const [id, s] of Object.entries(status)) {
          lines.push(`  ${id}: running (every ${(s.intervalMs / 60000).toFixed(0)}min, since ${s.startedAt})`);
        }
        lines.push('\nConfig:');
        for (const [id, c] of Object.entries(cfg)) {
          lines.push(`  ${id}: ${c.enabled ? 'enabled' : 'disabled'}, interval: ${(c.intervalMs / 60000).toFixed(0)}min`);
        }
        return { type: 'system', text: lines.join('\n') };
      }
      if (sub === 'start') {
        pulse.startAll();
        return { type: 'system', text: 'Pulses started.' };
      }
      if (sub === 'stop') {
        pulse.stopAll();
        return { type: 'system', text: 'Pulses stopped.' };
      }
      if (sub === 'log') {
        const logType = parts[2] || 'health';
        const lines = pulse.readLog(`pulse-${logType}.log`, 20);
        return { type: 'system', text: lines.length ? lines.join('\n') : 'No log entries.' };
      }
      return { type: 'system', text: 'Usage: /pulse [status|start|stop|log health|log chores]' };
    }
    case 'chores': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub || sub === 'list') {
        const data = pulse.getChores();
        if (!data.chores.length) return { type: 'system', text: 'No chores defined. Use /chores add <name> | <description>' };
        const lines = data.chores.map(c => {
          const status = c.enabled ? '✓' : '✗';
          const grade = c.lastGrade ? ` [${c.lastGrade}]` : '';
          const runs = c.runCount || 0;
          return `  ${status} ${c.name} (${c.id}) — runs: ${runs}${grade}${c.assignTo ? ', agent: ' + c.assignTo : ''}`;
        });
        return { type: 'system', text: 'Chores:\n' + lines.join('\n') };
      }
      if (sub === 'add') {
        const rest = parts.slice(2).join(' ');
        const [name, description] = rest.split('|').map(s => s.trim());
        if (!name) return { type: 'system', text: 'Usage: /chores add <name> | <description>' };
        try {
          const c = pulse.addChore({ name, description: description || '' });
          return { type: 'system', text: `Added chore: ${c.name} (${c.id})` };
        } catch (e) { return { type: 'system', text: 'Error: ' + e.message }; }
      }
      if (sub === 'remove') {
        const id = parts.slice(2).join(' ').trim();
        if (!id) return { type: 'system', text: 'Usage: /chores remove <id>' };
        try {
          pulse.removeChore(id);
          return { type: 'system', text: 'Removed: ' + id };
        } catch (e) { return { type: 'system', text: 'Error: ' + e.message }; }
      }
      if (sub === 'run') {
        const id = parts.slice(2).join(' ').trim();
        if (!id) return { type: 'system', text: 'Usage: /chores run <id>' };
        const data = pulse.getChores();
        const chore = data.chores.find(c => c.id === id);
        if (!chore) return { type: 'system', text: 'Chore not found: ' + id };
        return { type: 'system', text: `Running chore "${chore.name}"... check /pulse log chores for results.` };
      }
      return { type: 'system', text: 'Usage: /chores [list|add|remove|run]' };
    }
    case 'models': {
      const sub = (parts[1] || '').toLowerCase();
      if (!sub || sub === 'list') {
        const roster = modelRouter.getRoster();
        if (!roster.models.length) return { type: 'system', text: 'Model roster is empty. Use /models add <provider> <model> [endpoint] to add models.' };
        const lines = roster.models.map(m => {
          const status = m.enabled ? '✓' : '✗';
          const ctx = m.contextWindow ? `${(m.contextWindow / 1024).toFixed(0)}k ctx` : '';
          const cost = (m.costPer1kIn || 0) > 0 ? `$${m.costPer1kIn}/1k in` : 'free';
          return `  ${status} ${m.id} (${m.tier}) — ${ctx}, ${cost}${m.strengths?.length ? ', strengths: ' + m.strengths.join(', ') : ''}`;
        });
        return { type: 'system', text: 'Model Roster:\n' + lines.join('\n') };
      }
      if (sub === 'add') {
        const provider = parts[2];
        const modelName = parts[3];
        if (!provider || !modelName) return { type: 'system', text: 'Usage: /models add <provider> <model> [endpoint]\nProvider: ollama or openrouter\nExample: /models add ollama llama3.1:8b http://localhost:11434' };
        const endpoint = parts[4] || (provider === 'ollama' ? 'http://localhost:11434' : '');
        const result = modelRouter.addModel({ provider, model: modelName, endpoint });
        if (!result.ok) return { type: 'system', text: 'Error: ' + result.error };
        return { type: 'system', text: `Added: ${result.model.id} (${result.model.tier})` };
      }
      if (sub === 'remove') {
        const id = parts.slice(2).join(' ').trim();
        if (!id) return { type: 'system', text: 'Usage: /models remove <id>' };
        const result = modelRouter.removeModel(id);
        if (!result.ok) return { type: 'system', text: 'Error: ' + result.error };
        return { type: 'system', text: 'Removed: ' + id };
      }
      if (sub === 'perf' || sub === 'performance') {
        const summary = modelRouter.getPerformanceSummary();
        return { type: 'system', text: 'Model Performance:\n' + summary };
      }
      if (sub === 'route') {
        const testMsg = parts.slice(2).join(' ') || 'write a python script';
        const taskType = core.tasks.classify(testMsg);
        const routed = modelRouter.routeModel(testMsg, taskType.taskType, null, core.getConfig());
        if (!routed.routed) return { type: 'system', text: 'Would use primary config (no roster match).\nReason: ' + routed.reason };
        return { type: 'system', text: `Would route to: ${routed.modelId} (score: ${routed.score})\nReason: ${routed.reason}${routed.alternatives?.length ? '\nAlternatives:\n' + routed.alternatives.map(a => `  ${a.id} (score: ${a.score})`).join('\n') : ''}` };
      }
      if (sub === 'research') {
        const modelName = parts.slice(2).join(' ').trim();
        if (!modelName) return { type: 'system', text: 'Usage: /models research <model-name-or-roster-id>' };
        try {
          const result = await modelRouter.researchAndUpdate(modelName);
          if (!result.ok) return { type: 'system', text: 'Research failed: ' + (result.error || 'unknown') };
          const info = result.info;
          const lines = [`Model: ${info.modelName}`, info.summary || '', `Context: ${info.contextWindow || 'unknown'}`, `Tier: ${info.tier || 'unknown'}`, `Cost: $${info.costPer1kIn || 0}/$${info.costPer1kOut || 0} per 1k tokens`, `Strengths: ${(info.strengths || []).join(', ') || 'unknown'}`, `Weaknesses: ${(info.weaknesses || []).join(', ') || 'unknown'}`];
          if (result.updated?.length) lines.push(`Updated roster fields: ${result.updated.join(', ')}`);
          return { type: 'system', text: lines.filter(Boolean).join('\n') };
        } catch (e) { return { type: 'system', text: 'Error: ' + e.message }; }
      }
      return { type: 'system', text: 'Usage: /models [list|add|remove|perf|route|research]' };
    }
    case 'worklog': {
      const state = core.worklog.getState();
      if (!state.activeProject && !state.resumePoint && (!state.recentWork || !state.recentWork.length)) {
        return { type: 'system', text: 'No worklog entries yet.' };
      }
      const lines = ['MA Worklog:'];
      if (state.activeProject) lines.push(`Active project: ${state.activeProject}`);
      if (state.currentTask) lines.push(`Current task: ${state.currentTask}`);
      if (state.resumePoint) lines.push(`Resume: ${state.resumePoint}`);
      if (state.recentWork && state.recentWork.length) {
        lines.push('\nRecent work:');
        for (const w of state.recentWork.slice(-5)) lines.push(`  ${w.date} \u2014 ${w.task} (${w.status})`);
      }
      return { type: 'system', text: lines.join('\n') };
    }
    default:
      return { type: 'system', text: `Unknown command: /${cmd}. Type / to see available commands.` };
  }
}

module.exports = { handleSlashCommand };
