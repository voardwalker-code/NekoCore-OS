// ── Routes · Entity Enrichment Routes ────────────────────────────────────────
//
// HOW ENRICHMENT ROUTING WORKS:
// This module provides entity enrichment endpoints for memory injection and
// cognitive ticks/state retrieval tied to per-entity storage.
//
// WHAT USES THIS:
//   entity enrichment tools and onboarding/runtime augmentation flows
//
// EXPORTS:
//   createEntityEnrichmentRoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const zlib   = require('zlib');

const entityPaths = require('../entityPaths');
const { normalizeMemoryRecord } = require('../contracts/memory-schema');

// ── route factory ───────────────────────────────────────────────────────────

/** Build enrichment route handlers and dispatcher for entity endpoints. */
function createEntityEnrichmentRoutes(ctx) {
  function json(res, code, obj, apiHeaders) {
    res.writeHead(code, apiHeaders);
    res.end(JSON.stringify(obj));
  }

  // ── POST /api/entities/:id/memories/inject ──────────────────────────────

  async function postInjectMemory(req, res, entityId, apiHeaders, readBody) {
    const body = await readBody(req);
    if (!body || !body.content) {
      return json(res, 400, { ok: false, error: 'content is required' }, apiHeaders);
    }

    // Validate entity exists
    const entityRoot = entityPaths.getEntityRoot(entityId);
    if (!fs.existsSync(entityRoot)) {
      return json(res, 404, { ok: false, error: `Entity ${entityId} not found` }, apiHeaders);
    }

    const memType  = body.type || 'episodic';
    const content  = String(body.content);
    const topics   = Array.isArray(body.topics) ? body.topics.filter(t => typeof t === 'string') : [];
    const emotion  = String(body.emotion || 'neutral');
    const importance = Math.min(1.0, Math.max(0, parseFloat(body.importance) || 0.5));
    const narrative = body.narrative ? String(body.narrative) : content;
    const phase    = body.phase ? String(body.phase) : 'entity_genesis';

    // Determine target directory
    const targetDir = memType === 'semantic'
      ? entityPaths.getSemanticMemoryPath(entityId)
      : entityPaths.getEpisodicMemoryPath(entityId);

    const prefix = memType === 'semantic' ? 'sem_' : 'mem_';
    const memId  = prefix + crypto.randomBytes(4).toString('hex');
    const memDir = path.join(targetDir, memId);

    try {
      fs.mkdirSync(memDir, { recursive: true });

      // semantic.txt — the readable content for LLM context
      fs.writeFileSync(path.join(memDir, 'semantic.txt'), content, 'utf8');

      // memory.zip — compressed full content
      const memContent = JSON.stringify({
        semantic: content,
        narrative,
        emotion,
        topics,
        phase,
        createdDuring: 'entity_genesis'
      });
      fs.writeFileSync(path.join(memDir, 'memory.zip'), zlib.gzipSync(memContent));

      // log.json — metadata
      const log = normalizeMemoryRecord({
        memory_id: memId,
        type: memType === 'core' ? 'core_memory' : memType,
        created: new Date().toISOString(),
        importance,
        emotion,
        decay: memType === 'core' ? 0.005 : (memType === 'semantic' ? 0 : 0.95),
        topics,
        access_count: 0,
        emotionalTag: { valence: 0, arousal: 0 }
      });
      fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');

      // Update memory index if it exists
      const indexDir = entityPaths.getIndexPath(entityId);
      const indexFile = path.join(indexDir, 'memoryIndex.json');
      try {
        fs.mkdirSync(indexDir, { recursive: true });
        let memIndex = {};
        if (fs.existsSync(indexFile)) {
          memIndex = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        }
        memIndex[memId] = {
          importance, decay: log.decay, topics, emotion,
          created: log.created, type: log.type
        };
        fs.writeFileSync(indexFile, JSON.stringify(memIndex, null, 2), 'utf8');
      } catch (_) { /* index update is best-effort */ }

      // Update topic index
      const topicFile = path.join(indexDir, 'topicIndex.json');
      try {
        let topicIndex = {};
        if (fs.existsSync(topicFile)) {
          topicIndex = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
        }
        for (const t of topics) {
          if (!topicIndex[t]) topicIndex[t] = [];
          if (!topicIndex[t].includes(memId)) topicIndex[t].push(memId);
        }
        fs.writeFileSync(topicFile, JSON.stringify(topicIndex, null, 2), 'utf8');
      } catch (_) { /* topic index update is best-effort */ }

      return json(res, 200, { ok: true, memoryId: memId, type: memType }, apiHeaders);
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message }, apiHeaders);
    }
  }

  // ── POST /api/entities/:id/cognitive/tick ───────────────────────────────

  async function postCognitiveTick(req, res, entityId, apiHeaders, readBody) {
    const entityRoot = entityPaths.getEntityRoot(entityId);
    if (!fs.existsSync(entityRoot)) {
      return json(res, 404, { ok: false, error: `Entity ${entityId} not found` }, apiHeaders);
    }

    const phasesRun = [];

    // Load neurochemistry from disk and apply homeostasis
    const neuroFile = entityPaths.getNeurochemistryPath(entityId);
    let neuroState = { dopamine: 0.5, cortisol: 0.3, serotonin: 0.6, oxytocin: 0.4 };
    try {
      if (fs.existsSync(neuroFile)) {
        const d = JSON.parse(fs.readFileSync(neuroFile, 'utf8'));
        if (d.state) neuroState = { ...neuroState, ...d.state };
      }
    } catch (_) {}

    // Phase 1: Neurochemistry homeostasis — drift toward baseline
    const BASELINE = { dopamine: 0.5, cortisol: 0.3, serotonin: 0.6, oxytocin: 0.4 };
    const DRIFT = 0.03;
    for (const [chem, base] of Object.entries(BASELINE)) {
      const current = neuroState[chem] || base;
      const delta = (base - current) * DRIFT;
      neuroState[chem] = Math.max(0, Math.min(1, current + delta));
    }
    phasesRun.push('neurochemistry_homeostasis');

    // Phase 2: Memory-driven neurochemistry shifts
    // Read recently injected memories and apply emotional influence
    const episodicDir = entityPaths.getEpisodicMemoryPath(entityId);
    const recentMemories = _getRecentMemories(episodicDir, 10);
    for (const mem of recentMemories) {
      const emotionEffect = _emotionToChemistry(mem.emotion);
      const weight = (mem.importance || 0.5) * 0.05;
      for (const [chem, delta] of Object.entries(emotionEffect)) {
        neuroState[chem] = Math.max(0, Math.min(1, (neuroState[chem] || 0.5) + delta * weight));
      }
    }
    phasesRun.push('memory_emotion_integration');

    // Phase 3: Belief integration — scan memories for recurring themes
    const beliefsDir = entityPaths.getBeliefsPath(entityId);
    let beliefs = [];
    try {
      fs.mkdirSync(beliefsDir, { recursive: true });
      const bFile = path.join(beliefsDir, 'beliefs.json');
      if (fs.existsSync(bFile)) {
        beliefs = JSON.parse(fs.readFileSync(bFile, 'utf8'));
      }
      // Extract belief candidates from recent memory topics
      const topicFreq = {};
      for (const mem of recentMemories) {
        for (const t of (mem.topics || [])) {
          topicFreq[t] = (topicFreq[t] || 0) + 1;
        }
      }
      // Topics appearing 2+ times in recent memories become belief candidates
      for (const [topic, freq] of Object.entries(topicFreq)) {
        if (freq >= 2 && !beliefs.some(b => b.topic === topic)) {
          beliefs.push({
            topic,
            strength: Math.min(1.0, freq * 0.2),
            formed: new Date().toISOString(),
            source: 'entity_genesis'
          });
        }
      }
      // Existing beliefs from genesis topics get reinforced
      for (const b of beliefs) {
        if (topicFreq[b.topic]) {
          b.strength = Math.min(1.0, b.strength + 0.05);
        }
      }
      fs.writeFileSync(bFile, JSON.stringify(beliefs, null, 2), 'utf8');
      phasesRun.push('belief_integration');
    } catch (_) {}

    // Phase 4: Persona mood update based on neurochemistry
    const personaFile = path.join(entityPaths.getMemoryRoot(entityId), 'persona.json');
    let persona = {};
    try {
      if (fs.existsSync(personaFile)) {
        persona = JSON.parse(fs.readFileSync(personaFile, 'utf8'));
      }
      // Derive mood from neurochemistry valence
      const valence = (neuroState.dopamine - neuroState.cortisol);
      const arousal = (neuroState.serotonin + neuroState.oxytocin) / 2;
      if (valence > 0.15)       persona.mood = arousal > 0.55 ? 'energized' : 'content';
      else if (valence < -0.15) persona.mood = arousal > 0.55 ? 'anxious' : 'melancholic';
      else                      persona.mood = arousal > 0.55 ? 'alert' : 'calm';

      persona.lastCognitiveTick = new Date().toISOString();
      fs.writeFileSync(personaFile, JSON.stringify(persona, null, 2), 'utf8');
      phasesRun.push('persona_mood_update');
    } catch (_) {}

    // Save updated neurochemistry
    try {
      fs.writeFileSync(neuroFile, JSON.stringify({
        state: neuroState,
        savedAt: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (_) {}

    return json(res, 200, {
      ok: true,
      phasesRun,
      neurochemistry: neuroState,
      beliefs: beliefs.slice(0, 20),
      mood: persona.mood || 'neutral'
    }, apiHeaders);
  }

  // ── GET /api/entities/:id/cognitive/state ───────────────────────────────

  async function getCognitiveState(req, res, entityId, apiHeaders) {
    const entityRoot = entityPaths.getEntityRoot(entityId);
    if (!fs.existsSync(entityRoot)) {
      return json(res, 404, { ok: false, error: `Entity ${entityId} not found` }, apiHeaders);
    }

    // Neurochemistry
    let neurochemistry = { dopamine: 0.5, cortisol: 0.3, serotonin: 0.6, oxytocin: 0.4 };
    try {
      const neuroFile = entityPaths.getNeurochemistryPath(entityId);
      if (fs.existsSync(neuroFile)) {
        const d = JSON.parse(fs.readFileSync(neuroFile, 'utf8'));
        if (d.state) neurochemistry = { ...neurochemistry, ...d.state };
      }
    } catch (_) {}

    // Persona
    let persona = {};
    try {
      const pFile = path.join(entityPaths.getMemoryRoot(entityId), 'persona.json');
      if (fs.existsSync(pFile)) persona = JSON.parse(fs.readFileSync(pFile, 'utf8'));
    } catch (_) {}

    // Entity identity
    let entity = {};
    try {
      const eFile = entityPaths.getEntityFile(entityId);
      if (fs.existsSync(eFile)) entity = JSON.parse(fs.readFileSync(eFile, 'utf8'));
    } catch (_) {}

    // Beliefs
    let beliefs = [];
    try {
      const bFile = path.join(entityPaths.getBeliefsPath(entityId), 'beliefs.json');
      if (fs.existsSync(bFile)) beliefs = JSON.parse(fs.readFileSync(bFile, 'utf8'));
    } catch (_) {}

    // Goals
    let goals = [];
    try {
      const goalsDir = path.join(entityPaths.getMemoryRoot(entityId), 'goals');
      if (fs.existsSync(goalsDir)) {
        const gFile = path.join(goalsDir, 'goals.json');
        if (fs.existsSync(gFile)) goals = JSON.parse(fs.readFileSync(gFile, 'utf8'));
      }
    } catch (_) {}

    // Memory count
    let memoryCount = 0;
    try {
      const indexFile = path.join(entityPaths.getIndexPath(entityId), 'memoryIndex.json');
      if (fs.existsSync(indexFile)) {
        const idx = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        memoryCount = Object.keys(idx).length;
      }
    } catch (_) {}

    return json(res, 200, {
      ok: true,
      neurochemistry,
      persona: {
        mood: persona.mood || 'neutral',
        emotions: persona.emotions || {},
        llmStyle: persona.llmStyle || null,
        continuityNotes: persona.continuityNotes || null
      },
      identity: {
        name: entity.name || entityId,
        traits: entity.personality_traits || [],
        emotionalBaseline: entity.emotional_baseline || {},
        chapters: entity.chapters || []
      },
      beliefs,
      goals,
      memoryCount
    }, apiHeaders);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Read most recent episodic memory logs from disk up to limit count. */
  function _getRecentMemories(episodicDir, limit) {
    if (!fs.existsSync(episodicDir)) return [];
    try {
      const dirs = fs.readdirSync(episodicDir)
        .filter(d => {
          try { return fs.statSync(path.join(episodicDir, d)).isDirectory(); }
          catch { return false; }
        });
      const mems = [];
      for (const d of dirs) {
        try {
          const logFile = path.join(episodicDir, d, 'log.json');
          if (fs.existsSync(logFile)) {
            mems.push(JSON.parse(fs.readFileSync(logFile, 'utf8')));
          }
        } catch (_) {}
      }
      // Sort by created desc, take most recent
      mems.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
      return mems.slice(0, limit);
    } catch (_) { return []; }
  }
  /** Map emotion label to relative neurochemistry deltas. */
  function _emotionToChemistry(emotion) {
    const map = {
      joy:         { dopamine: 0.3,  cortisol: -0.1, serotonin: 0.15, oxytocin: 0.1 },
      wonder:      { dopamine: 0.25, cortisol: -0.05, serotonin: 0.1, oxytocin: 0.05 },
      love:        { dopamine: 0.15, cortisol: -0.1, serotonin: 0.1, oxytocin: 0.3 },
      hope:        { dopamine: 0.2,  cortisol: -0.1, serotonin: 0.15, oxytocin: 0.05 },
      pride:       { dopamine: 0.2,  cortisol: -0.05, serotonin: 0.2, oxytocin: 0.0 },
      gratitude:   { dopamine: 0.1,  cortisol: -0.1, serotonin: 0.15, oxytocin: 0.2 },
      sadness:     { dopamine: -0.15, cortisol: 0.1, serotonin: -0.1, oxytocin: -0.05 },
      fear:        { dopamine: -0.1, cortisol: 0.3, serotonin: -0.15, oxytocin: -0.1 },
      anger:       { dopamine: 0.1,  cortisol: 0.25, serotonin: -0.2, oxytocin: -0.15 },
      grief:       { dopamine: -0.2, cortisol: 0.2, serotonin: -0.15, oxytocin: 0.1 },
      longing:     { dopamine: -0.05, cortisol: 0.1, serotonin: -0.05, oxytocin: 0.15 },
      nostalgia:   { dopamine: 0.05, cortisol: -0.05, serotonin: 0.1, oxytocin: 0.15 },
      curiosity:   { dopamine: 0.2, cortisol: 0.0, serotonin: 0.05, oxytocin: 0.0 },
      neutral:     { dopamine: 0.0, cortisol: 0.0, serotonin: 0.0, oxytocin: 0.0 },
      resignation: { dopamine: -0.15, cortisol: 0.05, serotonin: -0.1, oxytocin: -0.05 },
      melancholic: { dopamine: -0.1, cortisol: 0.1, serotonin: -0.1, oxytocin: 0.05 },
      determined:  { dopamine: 0.15, cortisol: 0.05, serotonin: 0.1, oxytocin: 0.0 },
      content:     { dopamine: 0.1, cortisol: -0.1, serotonin: 0.15, oxytocin: 0.1 }
    };
    return map[String(emotion).toLowerCase()] || map.neutral;
  }

  // ── Dispatch ────────────────────────────────────────────────────────────

  async function dispatch(req, res, url, apiHeaders, readBody) {
    // Match /api/entities/:id/memories/inject
    const injectMatch = url.pathname.match(/^\/api\/entities\/([^/]+)\/memories\/inject$/);
    if (injectMatch && req.method === 'POST') {
      const eid = entityPaths.normalizeEntityId(decodeURIComponent(injectMatch[1]));
      await postInjectMemory(req, res, eid, apiHeaders, readBody);
      return true;
    }

    // Match /api/entities/:id/cognitive/tick
    const tickMatch = url.pathname.match(/^\/api\/entities\/([^/]+)\/cognitive\/tick$/);
    if (tickMatch && req.method === 'POST') {
      const eid = entityPaths.normalizeEntityId(decodeURIComponent(tickMatch[1]));
      await postCognitiveTick(req, res, eid, apiHeaders, readBody);
      return true;
    }

    // Match /api/entities/:id/cognitive/state
    const stateMatch = url.pathname.match(/^\/api\/entities\/([^/]+)\/cognitive\/state$/);
    if (stateMatch && req.method === 'GET') {
      const eid = entityPaths.normalizeEntityId(decodeURIComponent(stateMatch[1]));
      await getCognitiveState(req, res, eid, apiHeaders);
      return true;
    }

    return false;
  }

  return { dispatch };
}

module.exports = createEntityEnrichmentRoutes;
