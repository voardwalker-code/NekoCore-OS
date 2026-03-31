// ── Services · Cognitive Snapshot Assembler ─────────────────────────────────
//
// HOW COGNITIVE SNAPSHOTS WORK:
// Before each turn, this module reads available subsystems (beliefs, goals,
// mood chemistry, diary, curiosity, introspection) and composes one structured
// snapshot plus a formatted text block for prompt injection.
//
// WHAT USES THIS:
//   brain orchestration pipeline — pre-turn context assembly
//
// EXPORTS:
//   assembleCognitiveSnapshot(deps) → { snapshot, block }
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Cognitive Snapshot Assembler
// Assembles a unified pre-turn cognitive state snapshot from
// all entity subsystems. No LLM calls — reads only.
// ============================================================

const { validateSnapshot, buildSnapshotBlock } = require('../../contracts/cognitive-snapshot-contract');
const { bm25Score } = require('../utils/bm25');
const LifeDiary = require('../identity/life-diary');

/**
 * Assemble a full cognitive snapshot from all available subsystems.
 * Any subsystem that is unavailable is gracefully omitted.
 *
 * @param {Object} deps
 * @param {Object} [deps.beliefGraph]       - BeliefGraph instance
 * @param {Object} [deps.goalsManager]      - GoalsManager instance
 * @param {Object} [deps.neurochemistry]    - Neurochemistry instance
 * @param {Object} [deps.curiosityEngine]   - CuriosityEngine instance
 * @param {Object} [deps.identityManager]   - IdentityManager instance
 * @param {Object} [deps.selfModel]         - Self-model state (future, from Introspection Loop)
 * @param {string} [deps.entityId]          - Entity ID for diary lookup
 * @param {string[]} [deps.userMessageTopics] - Topics extracted from the user message (for relevance matching)
 * @returns {{ snapshot: Object, block: string }}
 */
/** Assemble full cross-subsystem snapshot with graceful degradation. */
function assembleCognitiveSnapshot(deps = {}) {
  const snapshot = {};
  const topics = deps.userMessageTopics || [];

  // ── Beliefs ──────────────────────────────────────────────────────────
  try {
    if (deps.beliefGraph) {
      const standing = deps.beliefGraph.getRelevantBeliefs(topics, 0.2, 6) || [];
      const formatted = standing.map(b => ({
        topic: b.topics?.[0] || b.topic || '?',
        statement: String(b.statement || ''),
        confidence: Number(b.confidence || 0)
      }));

      // Merge identity manager beliefs if available
      if (deps.identityManager && typeof deps.identityManager.getRelevantBeliefs === 'function') {
        const idBeliefs = deps.identityManager.getRelevantBeliefs(topics, 0.3) || [];
        const seenStatements = new Set(formatted.map(b => b.statement.toLowerCase()));
        for (const b of idBeliefs) {
          const stmt = String(b.statement || '');
          if (!seenStatements.has(stmt.toLowerCase())) {
            formatted.push({
              topic: b.topic || '?',
              statement: stmt,
              confidence: Number(b.confidence || 0)
            });
            if (formatted.length >= 6) break;
          }
        }
      }

      snapshot.beliefs = {
        standing: formatted.slice(0, 6),
        conflicts: [] // Conflict detection is future work
      };
    }
  } catch (_) { /* non-critical */ }

  // ── Goals ────────────────────────────────────────────────────────────
  try {
    if (deps.goalsManager) {
      const active = (deps.goalsManager.getActiveGoals(3) || []).map(g => ({
        id: g.goal_id || g.id,
        description: String(g.description || ''),
        priority: Number(g.priority || 0),
        alignment: g.status || 'active'
      }));

      // Recently fulfilled: get all goals, filter completed, take last 2
      let recentlyFulfilled = [];
      if (typeof deps.goalsManager.getAllGoals === 'function') {
        recentlyFulfilled = (deps.goalsManager.getAllGoals() || [])
          .filter(g => g.status === 'completed')
          .slice(-2)
          .map(g => ({
            id: g.id || g.goal_id,
            description: String(g.description || ''),
            when: g.last_updated || ''
          }));
      }

      snapshot.goals = { active, recentlyFulfilled };
    }
  } catch (_) { /* non-critical */ }

  // ── Mood / Neurochemistry ────────────────────────────────────────────
  try {
    if (deps.neurochemistry) {
      const moodData = deps.neurochemistry.deriveMood() || {};
      const chemicals = deps.neurochemistry.getChemicalState() || {};

      // Derive trend from chemical positions relative to baseline (0.5)
      const vals = Object.values(chemicals).filter(v => typeof v === 'number');
      let trend = 'stable';
      if (vals.length > 0) {
        const avgDeviation = vals.reduce((sum, v) => sum + (v - 0.5), 0) / vals.length;
        if (avgDeviation > 0.08) trend = 'improving';
        else if (avgDeviation < -0.08) trend = 'declining';
      }

      // Stress tier from cortisol
      let stressTier = 'low';
      if (chemicals.cortisol > 0.75) stressTier = 'high';
      else if (chemicals.cortisol > 0.55) stressTier = 'moderate';

      snapshot.mood = {
        current: moodData.mood || 'neutral',
        chemicals,
        trend,
        stressTier
      };
    }
  } catch (_) { /* non-critical */ }

  // ── Diary ────────────────────────────────────────────────────────────
  try {
    if (deps.entityId) {
      const entries = LifeDiary.readRecent(deps.entityId, 3) || [];
      if (entries.length > 0) {
        snapshot.diary = {
          recentInsights: entries.map(e =>
            String(e.title || e.content || '').slice(0, 50)
          )
        };
      }
    }
  } catch (_) { /* non-critical */ }

  // ── Curiosity ────────────────────────────────────────────────────────
  try {
    if (deps.curiosityEngine && typeof deps.curiosityEngine.getRecentQuestions === 'function') {
      const questions = deps.curiosityEngine.getRecentQuestions(10) || [];
      const activeQuestions = questions.map(q => String(q.question || '')).filter(Boolean);

      // BM25-match curiosity questions against user message topics
      let relevantToTurn = [];
      if (topics.length > 0 && activeQuestions.length > 0) {
        relevantToTurn = activeQuestions
          .map(q => {
            const qTopics = q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
            return { question: q, score: bm25Score(topics, qTopics) };
          })
          .filter(r => r.score > 0.3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(r => r.question);
      }

      snapshot.curiosity = {
        activeQuestions: activeQuestions.slice(0, 3),
        relevantToTurn
      };
    }
  } catch (_) { /* non-critical */ }

  // ── Introspection / Self-Model (graceful degradation) ────────────────
  try {
    if (deps.selfModel) {
      snapshot.introspection = {
        lastReflection: String(deps.selfModel.lastReflection || ''),
        selfConcept: String(deps.selfModel.whoIAm || '')
      };
    }
  } catch (_) { /* non-critical */ }

  // ── Validate and build block ─────────────────────────────────────────
  const validation = validateSnapshot(snapshot);
  if (!validation.ok) {
    console.warn('  ⚠ Cognitive snapshot validation warnings:', validation.errors.join('; '));
  }

  const block = buildSnapshotBlock(snapshot);
  return { snapshot, block };
}

module.exports = { assembleCognitiveSnapshot };
