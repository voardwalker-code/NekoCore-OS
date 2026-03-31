// ── Brain · Audit ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// Exposed API includes: appendAuditRecord, readAuditRecords, AUDIT_FILE.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs   = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '..', '..', '..', 'server', 'data', 'nekocore-audit.ndjson');

/**
 * Append a governance action record to the audit log.
 * Non-fatal — write errors are swallowed (audit is best-effort, never crashes the server).
 *
 * Recommended fields:
 *   event           — 'recommendation' | 'approval' | 'rejection'
 *   requestor       — who triggered the action (e.g. 'system', userId string)
 *   targetEntityId  — entity the model change targets
 *   targetAspect    — pipeline aspect ('subconscious' | 'conscious' | 'dream' | 'orchestrator')
 *   beforeModel     — current model before any change
 *   afterModel      — new model (approval only)
 *   recommendationId — short unique ID linking recommend → apply
 *   decision        — 'pending' | 'approved' | 'rejected'
 *   notes           — free-text rationale or risk note
 *   diffusionFlag   — true if selected model is a diffusion LLM with sensitivity warnings
 */
// appendAuditRecord()
// WHAT THIS DOES: appendAuditRecord is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call appendAuditRecord(...) where this helper behavior is needed.
function appendAuditRecord(record) {
  try {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...record
    }) + '\n';
    fs.appendFileSync(AUDIT_FILE, line, 'utf8');
  } catch (_) {
    // Non-critical — never crash the server over audit failures
  }
}

/**
 * Read all audit records. Returns an array (newest last).
 * Returns empty array if the file does not exist or is unreadable.
 */
// readAuditRecords()
// WHAT THIS DOES: readAuditRecords reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call readAuditRecords(...), then use the returned value in your next step.
function readAuditRecords() {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    return fs.readFileSync(AUDIT_FILE, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  } catch (_) {
    return [];
  }
}

module.exports = { appendAuditRecord, readAuditRecords, AUDIT_FILE };
