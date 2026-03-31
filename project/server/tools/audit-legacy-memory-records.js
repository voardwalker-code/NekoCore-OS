// ── Tools · Audit Legacy Memory Records ──────────────────────────────────────
//
// HOW MEMORY AUDIT WORKS:
// This utility scans entity memory log files for missing schema-version fields
// and can optionally backfill normalized schema fields with --apply.
//
// WHAT USES THIS:
//   maintenance/migration workflows for legacy memory data
//
// EXPORTS:
//   executable script entry via main()
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Phase 13 Utility: Legacy Memory Audit and Optional Backfill
//
// Default mode is dry-run audit (no writes).
// Use --apply to write schema-version backfills.
// ============================================================

const fs = require('fs');
const path = require('path');
const entityPaths = require('../entityPaths');
const { MEMORY_SCHEMA_VERSION, normalizeMemoryRecord } = require('../contracts/memory-schema');
// parseArgs()
// WHAT THIS DOES: Parses CLI flags for entity targeting and apply mode.
// WHY IT EXISTS: Utility can run either full audit or targeted apply mode from command line.
// HOW TO USE IT: Call parseArgs(process.argv) at script startup.
function parseArgs(argv) {
  const args = { entity: null, apply: false };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--entity' && argv[i + 1]) {
      args.entity = argv[i + 1];
      i++;
    } else if (token === '--apply') {
      args.apply = true;
    }
  }
  return args;
}
// listEntityIds()
// WHAT THIS DOES: Lists entity ids from entities directory naming convention.
// WHY IT EXISTS: Batch audits need discovery of all local entity folders.
// HOW TO USE IT: Call listEntityIds(baseEntitiesDir) when --entity is not provided.
function listEntityIds(baseEntitiesDir) {
  if (!fs.existsSync(baseEntitiesDir)) return [];
  return fs.readdirSync(baseEntitiesDir)
    .filter(name => name.startsWith('entity_'))
    .filter(name => {
      try {
        return fs.statSync(path.join(baseEntitiesDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .map(name => name.replace(/^entity_/, ''));
}
// safeReadJson()
// WHAT THIS DOES: Reads JSON safely and returns null on parse/read failure.
// WHY IT EXISTS: Audit should continue even when individual files are malformed.
// HOW TO USE IT: Call safeReadJson(filePath) before accessing memory record fields.
function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
// auditMemoryLogFile()
// WHAT THIS DOES: Audits one memory log.json and optionally patches missing schema fields.
// WHY IT EXISTS: Legacy logs may lack schema version and normalized attributes.
// HOW TO USE IT: Call auditMemoryLogFile(filePath, apply) for each discovered log.json.
function auditMemoryLogFile(filePath, apply) {
  const json = safeReadJson(filePath);
  if (!json) {
    return { scanned: 1, invalidJson: 1, missingSchema: 0, patched: 0 };
  }

  const hasSchema = Number.isFinite(Number(json.memorySchemaVersion));
  if (hasSchema) {
    return { scanned: 1, invalidJson: 0, missingSchema: 0, patched: 0 };
  }

  if (apply) {
    const normalized = normalizeMemoryRecord(json, {
      defaultId: json.memory_id || '',
      defaultType: json.type || 'episodic'
    });
    const merged = Object.assign({}, json, normalized);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    return { scanned: 1, invalidJson: 0, missingSchema: 1, patched: 1 };
  }

  return { scanned: 1, invalidJson: 0, missingSchema: 1, patched: 0 };
}
// auditConsciousLtmFile()
// WHAT THIS DOES: Audits one conscious/ltm JSON and optionally adds schema version.
// WHY IT EXISTS: Conscious LTM files need consistent schema-version tagging for tooling compatibility.
// HOW TO USE IT: Call auditConsciousLtmFile(filePath, apply) during conscious/ltm scan.
function auditConsciousLtmFile(filePath, apply) {
  const json = safeReadJson(filePath);
  if (!json) {
    return { scanned: 1, invalidJson: 1, missingSchema: 0, patched: 0 };
  }
  const hasSchema = Number.isFinite(Number(json.memorySchemaVersion));
  if (hasSchema) {
    return { scanned: 1, invalidJson: 0, missingSchema: 0, patched: 0 };
  }

  if (apply) {
    const merged = Object.assign({}, json, { memorySchemaVersion: MEMORY_SCHEMA_VERSION });
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    return { scanned: 1, invalidJson: 0, missingSchema: 1, patched: 1 };
  }

  return { scanned: 1, invalidJson: 0, missingSchema: 1, patched: 0 };
}
// runEntityAudit()
// WHAT THIS DOES: Scans eligible memory artifacts for one entity and aggregates counts.
// WHY IT EXISTS: Reporting needs per-entity totals for scanned, missing schema, and patched records.
// HOW TO USE IT: Call runEntityAudit(entityId, apply) when building final report.
function runEntityAudit(entityId, apply) {
  const memoryRoot = entityPaths.getMemoryRoot(entityId);
  const out = {
    entityId,
    memoryRoot,
    scanned: 0,
    invalidJson: 0,
    missingSchema: 0,
    patched: 0
  };

  const tierDirs = ['episodic', 'semantic', 'ltm'];
  for (const tier of tierDirs) {
    const tierPath = path.join(memoryRoot, tier);
    if (!fs.existsSync(tierPath)) continue;

    const memIds = fs.readdirSync(tierPath)
      .filter(name => {
        try { return fs.statSync(path.join(tierPath, name)).isDirectory(); }
        catch { return false; }
      });

    for (const memId of memIds) {
      const logPath = path.join(tierPath, memId, 'log.json');
      if (!fs.existsSync(logPath)) continue;
      const result = auditMemoryLogFile(logPath, apply);
      out.scanned += result.scanned;
      out.invalidJson += result.invalidJson;
      out.missingSchema += result.missingSchema;
      out.patched += result.patched;
    }
  }

  const consciousLtmDir = path.join(memoryRoot, 'conscious', 'ltm');
  if (fs.existsSync(consciousLtmDir)) {
    const files = fs.readdirSync(consciousLtmDir).filter(name => name.endsWith('.json'));
    for (const file of files) {
      const result = auditConsciousLtmFile(path.join(consciousLtmDir, file), apply);
      out.scanned += result.scanned;
      out.invalidJson += result.invalidJson;
      out.missingSchema += result.missingSchema;
      out.patched += result.patched;
    }
  }

  return out;
}
// main()
// WHAT THIS DOES: Runs audit/apply flow and prints JSON report.
// WHY IT EXISTS: Script should provide machine-readable output for maintenance automation.
// HOW TO USE IT: Execute this file directly via Node; main() handles argument parsing and reporting.
function main() {
  const args = parseArgs(process.argv);
  const baseEntitiesDir = path.join(__dirname, '../../entities');
  const entityIds = args.entity
    ? [entityPaths.normalizeEntityId(args.entity)]
    : listEntityIds(baseEntitiesDir);

  if (entityIds.length === 0) {
    console.log(JSON.stringify({ ok: true, message: 'No entities found', mode: args.apply ? 'apply' : 'audit' }, null, 2));
    return;
  }

  const report = {
    ok: true,
    mode: args.apply ? 'apply' : 'audit',
    targetSchemaVersion: MEMORY_SCHEMA_VERSION,
    entities: [],
    totals: { scanned: 0, invalidJson: 0, missingSchema: 0, patched: 0 }
  };

  for (const entityId of entityIds) {
    const entityReport = runEntityAudit(entityId, args.apply);
    report.entities.push(entityReport);
    report.totals.scanned += entityReport.scanned;
    report.totals.invalidJson += entityReport.invalidJson;
    report.totals.missingSchema += entityReport.missingSchema;
    report.totals.patched += entityReport.patched;
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
