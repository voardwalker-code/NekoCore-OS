'use strict';

// ============================================================
// Cognitive State Integration — Post-Response Cognitive Feedback
// (Slices C7 + C8 + C9)
//
// Runs async after memory encoding. Analyzes the exchange via
// the cognitive feedback engine, then applies state changes to
// beliefs, goals, curiosity, and diary subsystems.
// ============================================================

const { analyzeTurnFeedback } = require('../brain/cognition/cognitive-feedback');
const { classifyInteraction }  = require('../brain/cognition/interaction-magnitude');

/**
 * Run the post-turn cognitive feedback loop.
 * Call AFTER runPostResponseMemoryEncoding so episodic memory importance is available.
 *
 * @param {Object} params
 * @param {string} params.userMessage
 * @param {string} params.entityResponse
 * @param {Object} [params.preSnapshot]       — cognitive snapshot from pre-turn assembly
 * @param {number} [params.importance]         — episodic memory importance (0-1)
 * @param {number} [params.trustDelta]         — relationship trust change
 * @param {Object} [params.beliefGraph]        — belief graph subsystem
 * @param {Object} [params.goalsManager]       — goals manager subsystem
 * @param {Object} [params.curiosityEngine]    — curiosity engine subsystem
 * @param {Object} [params.cognitiveBus]       — cognitive bus for event emission
 * @param {Function} [params.logTimeline]      — timeline logger
 * @param {Function} [params.broadcastSSE]     — SSE broadcaster
 * @param {string} [params.entityId]           — entity identifier
 */
async function runCognitiveFeedbackLoop(params = {}) {
  const {
    userMessage = '',
    entityResponse = '',
    preSnapshot,
    importance = 0,
    trustDelta = 0,
    beliefGraph,
    goalsManager,
    curiosityEngine,
    cognitiveBus,
    logTimeline,
    broadcastSSE,
    entityId
  } = params;

  if (!userMessage && !entityResponse) return;

  const emitSSE = (event, data) => {
    if (typeof broadcastSSE === 'function') broadcastSSE(event, data);
  };
  const log = (type, data) => {
    if (typeof logTimeline === 'function') logTimeline(type, data);
  };

  try {
    // ── Analyze the exchange ────────────────────────────────
    const feedback = analyzeTurnFeedback({
      userMessage,
      entityResponse,
      preSnapshot,
      episodicMemory: { importance },
      trustDelta
    });

    if (!feedback) return;

    // ── C7: Belief feedback ─────────────────────────────────
    if (beliefGraph && feedback.beliefUpdates?.length) {
      for (const bu of feedback.beliefUpdates) {
        try {
          if (bu.action === 'reinforce') {
            beliefGraph.reinforceBelief(bu.beliefId);
            if (cognitiveBus) {
              cognitiveBus.emitThought({
                type: 'belief_reinforced',
                beliefId: bu.beliefId,
                reason: bu.reason,
                source: 'conversation_feedback'
              });
            }
            log('belief.feedback.reinforced', { beliefId: bu.beliefId, reason: bu.reason });
          } else if (bu.action === 'weaken' || bu.action === 'contradict') {
            beliefGraph.contradictBelief(bu.beliefId, bu.reason);
            if (cognitiveBus) {
              cognitiveBus.emitThought({
                type: 'belief_contradicted',
                beliefId: bu.beliefId,
                reason: bu.reason,
                source: 'conversation_feedback'
              });
            }
            log('belief.feedback.contradicted', { beliefId: bu.beliefId, reason: bu.reason });
          }
        } catch (e) {
          // Individual belief update failure should not block others
        }
      }
      console.log(`  🧠 Belief feedback: ${feedback.beliefUpdates.length} update(s) applied`);
      emitSSE('belief_feedback_applied', {
        updates: feedback.beliefUpdates.length,
        timestamp: Date.now()
      });
    }

    // ── C8: Goal fulfillment feedback ───────────────────────
    if (goalsManager && feedback.goalUpdates?.length) {
      for (const gu of feedback.goalUpdates) {
        try {
          if (gu.action === 'fulfilled') {
            goalsManager.completeGoal(gu.goalId);
            if (cognitiveBus) {
              cognitiveBus.emitThought({
                type: 'goal_fulfilled',
                goalId: gu.goalId,
                evidence: gu.evidence,
                source: 'conversation_feedback'
              });
            }
            log('goal.feedback.fulfilled', { goalId: gu.goalId, evidence: gu.evidence });
          } else if (gu.action === 'progress') {
            goalsManager.markExplored(gu.goalId);
            if (cognitiveBus) {
              cognitiveBus.emitThought({
                type: 'goal_progress',
                goalId: gu.goalId,
                evidence: gu.evidence,
                source: 'conversation_feedback'
              });
            }
            log('goal.feedback.progress', { goalId: gu.goalId, evidence: gu.evidence });
          }
        } catch (e) {
          // Individual goal update failure should not block others
        }
      }
      console.log(`  🎯 Goal feedback: ${feedback.goalUpdates.length} update(s) applied`);
      emitSSE('goal_status_changed', {
        updates: feedback.goalUpdates.length,
        timestamp: Date.now()
      });
    }

    // ── C9: Curiosity closure ───────────────────────────────
    if (curiosityEngine && feedback.curiosityResolved?.length) {
      for (const question of feedback.curiosityResolved) {
        try {
          curiosityEngine.markQuestionResolved(question);
          if (cognitiveBus) {
            cognitiveBus.emitThought({
              type: 'curiosity_resolved',
              question,
              source: 'conversation_feedback'
            });
          }
          log('curiosity.feedback.resolved', { question });
        } catch (e) {
          // Non-critical — continue
        }
      }
      console.log(`  🔍 Curiosity closure: ${feedback.curiosityResolved.length} question(s) resolved`);
      emitSSE('curiosity_resolved', {
        resolved: feedback.curiosityResolved.length,
        timestamp: Date.now()
      });
    }

    // ── C9: Diary trigger ───────────────────────────────────
    if (feedback.diaryTrigger?.triggered && entityId) {
      try {
        const LifeDiary = require('../brain/identity/life-diary');
        const reason = feedback.diaryTrigger.reason || 'significant conversation exchange';
        const title = `Conversation reflection: ${reason}`;
        const narrative = `Something meaningful happened in a conversation today. ${reason}. ` +
          `The exchange felt important — my understanding may have shifted.`;
        await LifeDiary.appendEntry(entityId, title, narrative);
        log('diary.feedback.triggered', { reason, importance: feedback.diaryTrigger.importance });
        console.log(`  📔 Diary entry triggered: ${reason}`);
      } catch (e) {
        // Diary write failure is non-critical
      }
    }

    // ── C11: Neurochemistry nudge via INTERACTION_* event ────
    if (cognitiveBus && feedback.moodSignal) {
      const interaction = classifyInteraction(feedback.moodSignal);
      if (interaction) {
        cognitiveBus.emitThought({
          type: interaction.thoughtType,
          intensity: interaction.intensity,
          reason: interaction.reason,
          source: 'conversation_feedback'
        });
        log('mood.nudge.applied', {
          type: interaction.thoughtType,
          intensity: interaction.intensity,
          reason: interaction.reason
        });
        emitSSE('mood_nudge_applied', {
          type: interaction.thoughtType,
          intensity: interaction.intensity,
          timestamp: Date.now()
        });
      }
    }

    return feedback;
  } catch (err) {
    console.warn('  ⚠ Cognitive feedback loop failed:', err.message);
    return null;
  }
}

module.exports = { runCognitiveFeedbackLoop };
