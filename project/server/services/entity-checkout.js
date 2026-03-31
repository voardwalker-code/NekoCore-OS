// ── Services · Entity Checkout ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This service module holds reusable business logic shared across runtime
// paths.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// REM System — Entity Checkout Service
// Tracks which account has checked out which entity.
// Checked-out entities are hidden from other users' entity lists.
// Idle checkouts are released automatically after IDLE_TIMEOUT_MS.
// All checkouts are cleared on server startup.
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR       = path.join(__dirname, '../data');
const CHECKOUT_FILE  = path.join(DATA_DIR, 'checkouts.json');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle → auto-release
const SWEEP_INTERVAL_MS = 60 * 1000;    // check every 60 seconds

// In-memory: Map<entityId, { accountId, checkedOutAt, lastActivity }>
const checkouts = new Map();
let sweepTimer = null;
// ensureDataDir()
// WHAT THIS DOES: ensureDataDir is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call ensureDataDir(...) where this helper behavior is needed.
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function persist() {
  ensureDataDir();
  const obj = {};
  for (const [entityId, data] of checkouts) {
    obj[entityId] = data;
  }
  fs.writeFileSync(CHECKOUT_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

/**
 * Clear ALL checkouts (called on server startup).
 */
// releaseAll()
// WHAT THIS DOES: releaseAll is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call releaseAll(...) where this helper behavior is needed.
function releaseAll() {
  checkouts.clear();
  persist();
}

// On module load: clear all checkouts (fresh server start = clean slate)
ensureDataDir();
releaseAll();

/**
 * Start the idle sweep timer.
 */
// startIdleSweep()
// WHAT THIS DOES: startIdleSweep creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call startIdleSweep(...) before code that depends on this setup.
function startIdleSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [entityId, data] of checkouts) {
      if (now - data.lastActivity > IDLE_TIMEOUT_MS) {
        console.log(`  ℹ Entity checkout idle timeout: ${entityId} (idle ${Math.round((now - data.lastActivity) / 60000)}m)`);
        checkouts.delete(entityId);
        changed = true;
      }
    }
    if (changed) persist();
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref(); // don't prevent process exit
}

// Start sweep immediately
startIdleSweep();

/**
 * Record activity for a checked-out entity (keeps it alive).
 */
// touchActivity()
// WHAT THIS DOES: touchActivity is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call touchActivity(...) where this helper behavior is needed.
function touchActivity(entityId) {
  const record = checkouts.get(entityId);
  if (record) {
    record.lastActivity = Date.now();
  }
}

/**
 * Touch activity for ALL entities checked out by a given account.
 * Called from session middleware on every authenticated request.
 */
// touchActivityForAccount()
// WHAT THIS DOES: touchActivityForAccount is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call touchActivityForAccount(...) where this helper behavior is needed.
function touchActivityForAccount(accountId) {
  if (!accountId) return;
  const now = Date.now();
  for (const [, data] of checkouts) {
    if (data.accountId === accountId) data.lastActivity = now;
  }
}

/**
 * Check out an entity for an account.
 */
// checkout()
// WHAT THIS DOES: checkout is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call checkout(...) where this helper behavior is needed.
function checkout(entityId, accountId) {
  if (!entityId || !accountId) return false;
  const existing = checkouts.get(entityId);
  if (existing && existing.accountId !== accountId) return false;
  const now = Date.now();
  checkouts.set(entityId, { accountId, checkedOutAt: now, lastActivity: now });
  persist();
  return true;
}

/**
 * Release a checked-out entity.
 */
// release()
// WHAT THIS DOES: release is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call release(...) where this helper behavior is needed.
function release(entityId, accountId) {
  if (!entityId) return false;
  const existing = checkouts.get(entityId);
  if (!existing) return true;
  if (accountId && existing.accountId !== accountId) return false;
  checkouts.delete(entityId);
  persist();
  return true;
}

/**
 * Release ALL entities checked out by a given account (e.g. on logout).
 */
// releaseAllForAccount()
// WHAT THIS DOES: releaseAllForAccount is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call releaseAllForAccount(...) where this helper behavior is needed.
function releaseAllForAccount(accountId) {
  if (!accountId) return;
  for (const [entityId, data] of checkouts) {
    if (data.accountId === accountId) checkouts.delete(entityId);
  }
  persist();
}

/**
 * Check if an entity is checked out.
 */
// getCheckout()
// WHAT THIS DOES: getCheckout reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getCheckout(...), then use the returned value in your next step.
function getCheckout(entityId) {
  return checkouts.get(entityId) || null;
}

/**
 * Check if entity is checked out by a specific account.
 */
// isCheckedOutBy()
// WHAT THIS DOES: isCheckedOutBy answers a yes/no rule check.
// WHY IT EXISTS: guard checks are kept readable and reusable in one place.
// HOW TO USE IT: call isCheckedOutBy(...) and branch logic based on true/false.
function isCheckedOutBy(entityId, accountId) {
  const record = checkouts.get(entityId);
  return record ? record.accountId === accountId : false;
}

/**
 * Filter entity list: remove entities checked out by OTHER accounts.
 */
// filterForAccount()
// WHAT THIS DOES: filterForAccount is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call filterForAccount(...) where this helper behavior is needed.
function filterForAccount(entities, accountId) {
  return entities.filter(e => {
    const record = checkouts.get(e.id);
    if (!record) return true;
    return record.accountId === accountId;
  });
}

module.exports = {
  checkout,
  release,
  releaseAll,
  releaseAllForAccount,
  getCheckout,
  isCheckedOutBy,
  filterForAccount,
  touchActivity,
  touchActivityForAccount,
  startIdleSweep
};
