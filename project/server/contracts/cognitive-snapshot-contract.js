// ── Contracts · Cognitive Snapshot Contract ───────────────────────────────────
//
// HOW THIS CONTRACT WORKS:
// This file validates the structure of pre-turn cognitive snapshot objects and
// formats valid snapshots into a compact prompt-ready text block.
//
// WHAT USES THIS:
//   cognition snapshot assembly and prompt injection flows
//
// EXPORTS:
//   validateSnapshot(), buildSnapshotBlock()
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
// Cognitive Snapshot Contract
// Validates the shape of the pre-turn cognitive state snapshot
// and formats it for prompt injection.
// ============================================================

/** Return true for non-array object values. */
function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a cognitive snapshot object.
 * @param {Object} snapshot
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateSnapshot(snapshot) {
  const errors = [];
  if (!isObject(snapshot)) return { ok: false, errors: ['snapshot must be an object'] };

  // beliefs
  if ('beliefs' in snapshot) {
    if (!isObject(snapshot.beliefs)) {
      errors.push('beliefs must be an object');
    } else {
      if ('standing' in snapshot.beliefs && !Array.isArray(snapshot.beliefs.standing)) {
        errors.push('beliefs.standing must be an array');
      }
      if ('conflicts' in snapshot.beliefs && !Array.isArray(snapshot.beliefs.conflicts)) {
        errors.push('beliefs.conflicts must be an array');
      }
    }
  }

  // goals
  if ('goals' in snapshot) {
    if (!isObject(snapshot.goals)) {
      errors.push('goals must be an object');
    } else {
      if ('active' in snapshot.goals && !Array.isArray(snapshot.goals.active)) {
        errors.push('goals.active must be an array');
      }
      if ('recentlyFulfilled' in snapshot.goals && !Array.isArray(snapshot.goals.recentlyFulfilled)) {
        errors.push('goals.recentlyFulfilled must be an array');
      }
    }
  }

  // mood
  if ('mood' in snapshot) {
    if (!isObject(snapshot.mood)) {
      errors.push('mood must be an object');
    } else {
      if ('current' in snapshot.mood && typeof snapshot.mood.current !== 'string') {
        errors.push('mood.current must be a string');
      }
      if ('chemicals' in snapshot.mood && !isObject(snapshot.mood.chemicals)) {
        errors.push('mood.chemicals must be an object');
      }
      if ('trend' in snapshot.mood && typeof snapshot.mood.trend !== 'string') {
        errors.push('mood.trend must be a string');
      }
    }
  }

  // diary
  if ('diary' in snapshot) {
    if (!isObject(snapshot.diary)) {
      errors.push('diary must be an object');
    } else {
      if ('recentInsights' in snapshot.diary && !Array.isArray(snapshot.diary.recentInsights)) {
        errors.push('diary.recentInsights must be an array');
      }
    }
  }

  // curiosity
  if ('curiosity' in snapshot) {
    if (!isObject(snapshot.curiosity)) {
      errors.push('curiosity must be an object');
    } else {
      if ('activeQuestions' in snapshot.curiosity && !Array.isArray(snapshot.curiosity.activeQuestions)) {
        errors.push('curiosity.activeQuestions must be an array');
      }
      if ('relevantToTurn' in snapshot.curiosity && !Array.isArray(snapshot.curiosity.relevantToTurn)) {
        errors.push('curiosity.relevantToTurn must be an array');
      }
    }
  }

  // introspection (optional — graceful degradation)
  if ('introspection' in snapshot) {
    if (!isObject(snapshot.introspection)) {
      errors.push('introspection must be an object');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Format a validated snapshot into a text block for prompt injection.
 * Target: ~300 tokens max.
 * @param {Object} snapshot
 * @returns {string}
 */
function buildSnapshotBlock(snapshot) {
  if (!isObject(snapshot)) return '';

  const lines = ['[COGNITIVE STATE — Your current inner landscape]'];

  // Beliefs
  if (snapshot.beliefs) {
    const standing = snapshot.beliefs.standing || [];
    if (standing.length > 0) {
      lines.push('');
      lines.push('STANDING BELIEFS:');
      for (const b of standing.slice(0, 6)) {
        const stmt = String(b.statement || '').slice(0, 120);
        const conf = Number(b.confidence || 0).toFixed(2);
        lines.push(`- [${b.topic || '?'}] ${stmt} (confidence: ${conf})`);
      }
    }
    const conflicts = snapshot.beliefs.conflicts || [];
    if (conflicts.length > 0) {
      lines.push('');
      lines.push('BELIEF TENSIONS:');
      for (const c of conflicts.slice(0, 3)) {
        lines.push(`- ${String(c.belief1 || '').slice(0, 60)} vs ${String(c.belief2 || '').slice(0, 60)}`);
      }
    }
  }

  // Goals
  if (snapshot.goals) {
    const active = snapshot.goals.active || [];
    if (active.length > 0) {
      lines.push('');
      lines.push('ACTIVE GOALS:');
      for (const g of active.slice(0, 3)) {
        const desc = String(g.description || '').slice(0, 100);
        lines.push(`- ${desc} (priority: ${Number(g.priority || 0).toFixed(2)})`);
      }
    }
    const fulfilled = snapshot.goals.recentlyFulfilled || [];
    if (fulfilled.length > 0) {
      lines.push('RECENTLY FULFILLED:');
      for (const g of fulfilled.slice(0, 2)) {
        lines.push(`- ${String(g.description || '').slice(0, 80)}`);
      }
    }
  }

  // Mood
  if (snapshot.mood) {
    lines.push('');
    lines.push(`MOOD: ${snapshot.mood.current || 'neutral'} (trend: ${snapshot.mood.trend || 'stable'})`);
    if (snapshot.mood.stressTier && snapshot.mood.stressTier !== 'low') {
      lines.push(`STRESS: ${snapshot.mood.stressTier}`);
    }
  }

  // Diary insights
  if (snapshot.diary) {
    const insights = snapshot.diary.recentInsights || [];
    if (insights.length > 0) {
      lines.push('');
      lines.push('RECENT REFLECTIONS:');
      for (const d of insights.slice(0, 3)) {
        lines.push(`- ${String(d).slice(0, 50)}`);
      }
    }
  }

  // Curiosity
  if (snapshot.curiosity) {
    const relevant = snapshot.curiosity.relevantToTurn || [];
    const active = snapshot.curiosity.activeQuestions || [];
    const questions = relevant.length > 0 ? relevant : active;
    if (questions.length > 0) {
      lines.push('');
      lines.push('THINGS I\'M CURIOUS ABOUT:');
      for (const q of questions.slice(0, 3)) {
        lines.push(`- ${String(q).slice(0, 80)}`);
      }
    }
  }

  // Introspection (graceful — may be empty)
  if (snapshot.introspection) {
    const concept = snapshot.introspection.selfConcept;
    if (concept) {
      lines.push('');
      lines.push(`SELF-CONCEPT: ${String(concept).slice(0, 100)}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  validateSnapshot,
  buildSnapshotBlock
};
