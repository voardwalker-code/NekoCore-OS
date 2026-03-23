// ── Seed REM System Agents ───────────────────────────────────────────────────
// Run once to create the agent roster MA needs for the REM System project.
// These agents are reusable across future projects.
// Usage: node MA-scripts/seed-agents.js
'use strict';

const agents = require('../MA-server/MA-agents');
const { DEFAULT_AGENTS: AGENTS } = require('./agent-definitions');

// ── Run Seed ────────────────────────────────────────────────────────────────

let created = 0, skipped = 0, errors = 0;

for (const def of AGENTS) {
  const result = agents.createAgent(def);
  if (result.ok) {
    console.log(`  ✓ Created: ${def.name} (${def.id})`);
    created++;
  } else if (result.errors.some(e => e.includes('already exists'))) {
    console.log(`  - Skipped: ${def.name} (already exists)`);
    skipped++;
  } else {
    console.error(`  ✗ Failed: ${def.name} — ${result.errors.join(', ')}`);
    errors++;
  }
}

console.log(`\n  Seed complete: ${created} created, ${skipped} skipped, ${errors} errors`);
console.log(`  Total agents in catalog: ${agents.listAgents().length}`);

// Print catalog summary
const summary = agents.getCatalogSummary();
console.log('\n  Catalog by role:');
for (const [role, list] of Object.entries(summary.byRole)) {
  console.log(`    ${role}: ${list.map(a => `${a.name} (${a.seniority})`).join(', ')}`);
}
