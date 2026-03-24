'use strict';
/**
 * server/services/memory-operations.js
 * Phase A Re-evaluation — A-Re3
 *
 * Core memory creation helpers: createCoreMemory, createSemanticKnowledge.
 * Both write to the entity's episodic/semantic directories.
 *
 * Usage:
 *   const { createCoreMemory, createSemanticKnowledge } = createMemoryOperations({
 *     getCurrentEntityId: () => currentEntityId,
 *     getMemoryStorage:   () => memoryStorage,
 *     getMemoryGraph:     () => memoryGraph,
 *     logTimeline
 *   });
 */

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { extractTopSentences: trExtract } = require('../brain/utils/textrank');

// IME I2-2: Apply TextRank when stored content exceeds 600 chars.
// Below that threshold the overhead isn't worth it; above it, TextRank
// selects the 3 most representative sentences instead of raw truncation.
function semanticAbstract(text) {
  if (!text || text.length <= 600) return text;
  return trExtract(text, 3) || text.slice(0, 600);
}

// Slice 5: patch a connected memory's log.json with a reverse edge
function _patchReverseEdge(targetMemId, reverseEdge, entityId) {
  try {
    const entityPathsMod = require('../entityPaths');
    const baseDir = targetMemId.startsWith('sem_')
      ? entityPathsMod.getSemanticMemoryPath(entityId)
      : entityPathsMod.getEpisodicMemoryPath(entityId);
    const logPath = path.join(baseDir, targetMemId, 'log.json');
    if (!fs.existsSync(logPath)) return;
    const existing = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const edges = Array.isArray(existing.edges) ? existing.edges : [];
    if (edges.some(e => e.targetId === reverseEdge.targetId)) return;
    if (edges.length >= 8) return;
    edges.push(reverseEdge);
    existing.edges = edges;
    fs.writeFileSync(logPath, JSON.stringify(existing, null, 2), 'utf8');
  } catch { /* edge patching is non-critical */ }
}

/**
 * @param {{
 *   getCurrentEntityId: Function,
 *   getMemoryStorage:   Function,
 *   getMemoryGraph:     Function,
 *   logTimeline:        Function
 * }} deps
 */
function createMemoryOperations({ getCurrentEntityId, getMemoryStorage, getMemoryGraph, logTimeline }) {

  function createCoreMemory({ semantic, narrative, emotion, topics, importance, creationContext, shape }) {
    const currentEntityId = getCurrentEntityId();
    const memoryStorage = getMemoryStorage();
    const memoryGraph = getMemoryGraph();

    if (!currentEntityId || !memoryStorage) {
      logTimeline('memory.core.create_failed', { reason: 'no_active_entity' });
      return { ok: false, error: 'No active entity' };
    }

    const entityPathsMod = require('../entityPaths');
    const episodicPath = entityPathsMod.getEpisodicMemoryPath(currentEntityId);
    // IME I2-2: abstract long semantic texts before storing.
    const semToStore = semanticAbstract(semantic || '');
    const normalizedSemantic = (semToStore).toLowerCase().replace(/\s+/g, ' ').trim();

    if (!normalizedSemantic) {
      logTimeline('memory.core.create_failed', { reason: 'empty_semantic' });
      return { ok: false, error: 'Empty semantic text' };
    }

    // Deduplicate: scan existing memory semantics
    try {
      if (fs.existsSync(episodicPath)) {
        const existingDirs = fs.readdirSync(episodicPath).filter(d => {
          try { return fs.statSync(path.join(episodicPath, d)).isDirectory(); } catch { return false; }
        });
        for (const memDir of existingDirs) {
          const semPath = path.join(episodicPath, memDir, 'semantic.txt');
          if (fs.existsSync(semPath)) {
            const existing = fs.readFileSync(semPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim();
            if (existing === normalizedSemantic) {
              console.log(`  ⚠ Duplicate core memory skipped: "${semantic.substring(0, 60)}..."`);
              logTimeline('memory.core.duplicate', {
                semantic: (semantic || '').slice(0, 240),
                existingId: memDir,
                topics: topics || []
              });
              return { ok: false, duplicate: true, existingId: memDir };
            }
          }
        }
      }
    } catch (err) {
      console.warn('  ⚠ Dedup scan failed, proceeding anyway:', err.message);
    }

    // Create the memory
    const memId = 'mem_' + crypto.randomBytes(4).toString('hex');
    const memDir = path.join(episodicPath, memId);

    try {
      fs.mkdirSync(memDir, { recursive: true });

      // semantic.txt — TextRank abstract (full content preserved in memory.zip)
      fs.writeFileSync(path.join(memDir, 'semantic.txt'), semToStore, 'utf8');

      // memory.zip (compressed content)
      const memContent = JSON.stringify({
        semantic: semantic,
        narrative: narrative || semantic,
        emotion: emotion || 'neutral',
        topics: topics || [],
        phase: 'core_memory',
        createdDuring: 'conversation'
      });
      fs.writeFileSync(path.join(memDir, 'memory.zip'), zlib.gzipSync(memContent));

      // log.json
      const log = {
        memory_id: memId,
        created: new Date().toISOString(),
        importance: Math.min(1.0, Math.max(0, importance || 0.8)),
        emotion: emotion || 'neutral',
        decay: 0.005, // Very slow decay for core memories
        topics: topics || [],
        access_count: 0,
        type: 'core_memory',
        userId: (creationContext && creationContext.userId) || null,
        userName: (creationContext && creationContext.userName) || null,
        creationContext: creationContext || null,
        shape: shape || 'unclassified',
        edges: []
      };

      // Slice 5: seed edges to nearby memories
      if (memoryStorage.indexCache) {
        try {
          const { seedEdges } = require('../brain/memory/edge-builder');
          const result = seedEdges(memId, log, memoryStorage.indexCache);
          log.edges = result.edges;
        } catch (e) {
          console.warn('  ⚠ Edge seeding failed:', e.message);
        }
      }

      // Slice 9: seed belief_linked edges from active beliefs
      const activeBeliefIds = creationContext && creationContext.activeBeliefIds;
      if (activeBeliefIds && activeBeliefIds.length > 0 && currentEntityId) {
        try {
          const { seedBeliefEdges, MAX_EDGES } = require('../brain/memory/edge-builder');
          const BeliefGraph = require('../beliefs/beliefGraph');
          const bg = new BeliefGraph({ entityId: currentEntityId });
          const beliefs = activeBeliefIds.map(id => bg.getBelief(id)).filter(Boolean);
          if (beliefs.length > 0) {
            const existingTargets = new Set(log.edges.map(e => e.targetId));
            const beliefEdges = seedBeliefEdges(memId, beliefs, existingTargets);
            const remaining = MAX_EDGES - log.edges.length;
            for (const be of beliefEdges.slice(0, Math.max(0, remaining))) {
              log.edges.push(be);
            }
          }
        } catch (e) {
          console.warn('  ⚠ Belief edge seeding failed:', e.message);
        }
      }

      fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');

      // Slice 5: patch connected memories with reverse edges
      for (const edge of log.edges) {
        _patchReverseEdge(edge.targetId, { targetId: memId, relation: edge.relation, strength: edge.strength }, currentEntityId);
      }

      // Update index cache
      if (memoryStorage.indexCache) {
        memoryStorage.indexCache.addMemory(memId, log);
        memoryStorage.indexCache.save();
      }

      // Add to in-memory graph so activateMemory() can find it immediately
      if (memoryGraph) {
        memoryGraph.addMemoryNode({
          id: memId,
          topics: topics || [],
          emotion: 0,
          importance: log.importance,
          created: log.created,
          access_count: 0
        });
      }

      console.log(`  ✓ Created new core memory: ${memId} — "${semantic.substring(0, 60)}"`);
      logTimeline('memory.core.created', {
        memId,
        semantic: (semantic || '').slice(0, 320),
        emotion: emotion || 'neutral',
        topics: topics || [],
        importance: log.importance
      });
      return { ok: true, memId };
    } catch (err) {
      console.error(`  ⚠ Failed to create core memory: ${err.message}`);
      logTimeline('memory.core.create_failed', {
        reason: err.message,
        semantic: (semantic || '').slice(0, 240)
      });
      return { ok: false, error: err.message };
    }
  }

  function createSemanticKnowledge({ knowledge, topics, importance, sourceMemId, creationContext, shape }) {
    const currentEntityId = getCurrentEntityId();
    const memoryStorage = getMemoryStorage();
    const memoryGraph = getMemoryGraph();

    if (!currentEntityId || !memoryStorage) {
      logTimeline('memory.semantic.create_failed', { reason: 'no_active_entity' });
      return { ok: false, error: 'No active entity' };
    }

    const entityPathsMod = require('../entityPaths');
    const semanticPath = entityPathsMod.getSemanticMemoryPath(currentEntityId);
    // IME I2-2: abstract long knowledge before storing.
    const knowledgeToStore = semanticAbstract(knowledge || '');
    const normalizedKnowledge = (knowledgeToStore).toLowerCase().replace(/\s+/g, ' ').trim();

    if (!normalizedKnowledge || normalizedKnowledge.length < 10) {
      logTimeline('memory.semantic.create_failed', { reason: 'knowledge_too_short' });
      return { ok: false, error: 'Knowledge too short or empty' };
    }

    // Deduplicate: scan existing semantic memories
    try {
      if (fs.existsSync(semanticPath)) {
        const existingDirs = fs.readdirSync(semanticPath).filter(d => {
          try { return fs.statSync(path.join(semanticPath, d)).isDirectory(); } catch { return false; }
        });
        for (const memDir of existingDirs) {
          const semPath = path.join(semanticPath, memDir, 'semantic.txt');
          if (fs.existsSync(semPath)) {
            const existing = fs.readFileSync(semPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim();
            if (existing === normalizedKnowledge) {
              logTimeline('memory.semantic.duplicate', {
                knowledge: (knowledge || '').slice(0, 240),
                existingId: memDir,
                topics: topics || []
              });
              return { ok: false, duplicate: true, existingId: memDir };
            }
          }
        }
      }
    } catch (err) {
      console.warn('  ⚠ Semantic dedup scan failed, proceeding anyway:', err.message);
    }

    const memId = 'sem_' + crypto.randomBytes(4).toString('hex');
    const memDir = path.join(semanticPath, memId);

    try {
      fs.mkdirSync(memDir, { recursive: true });

      // semantic.txt — TextRank abstract (full content preserved in memory.zip)
      fs.writeFileSync(path.join(memDir, 'semantic.txt'), knowledgeToStore, 'utf8');

      // memory.zip (compressed content)
      const memContent = JSON.stringify({
        knowledge,
        topics: topics || [],
        sourceMemId: sourceMemId || null,
        phase: 'semantic_knowledge',
        createdDuring: 'conversation'
      });
      fs.writeFileSync(path.join(memDir, 'memory.zip'), zlib.gzipSync(memContent));

      // log.json
      const log = {
        memory_id: memId,
        created: new Date().toISOString(),
        importance: Math.min(1.0, Math.max(0, importance || 0.6)),
        emotion: 'neutral',
        decay: 0.002, // Semantic knowledge decays very slowly
        topics: topics || [],
        access_count: 0,
        type: 'semantic_knowledge',
        sourceMemId: sourceMemId || null,
        userId: (creationContext && creationContext.userId) || null,
        userName: (creationContext && creationContext.userName) || null,
        creationContext: creationContext || null,
        shape: shape || 'unclassified',
        edges: []
      };

      // Slice 5: seed edges to nearby memories
      if (memoryStorage.indexCache) {
        try {
          const { seedEdges } = require('../brain/memory/edge-builder');
          const result = seedEdges(memId, log, memoryStorage.indexCache);
          log.edges = result.edges;
        } catch (e) {
          console.warn('  ⚠ Edge seeding failed:', e.message);
        }
      }

      // Slice 9: seed belief_linked edges from active beliefs
      const skActiveBeliefIds = creationContext && creationContext.activeBeliefIds;
      if (skActiveBeliefIds && skActiveBeliefIds.length > 0 && currentEntityId) {
        try {
          const { seedBeliefEdges, MAX_EDGES } = require('../brain/memory/edge-builder');
          const BeliefGraph = require('../beliefs/beliefGraph');
          const bg = new BeliefGraph({ entityId: currentEntityId });
          const beliefs = skActiveBeliefIds.map(id => bg.getBelief(id)).filter(Boolean);
          if (beliefs.length > 0) {
            const existingTargets = new Set(log.edges.map(e => e.targetId));
            const beliefEdges = seedBeliefEdges(memId, beliefs, existingTargets);
            const remaining = MAX_EDGES - log.edges.length;
            for (const be of beliefEdges.slice(0, Math.max(0, remaining))) {
              log.edges.push(be);
            }
          }
        } catch (e) {
          console.warn('  ⚠ Belief edge seeding failed:', e.message);
        }
      }

      fs.writeFileSync(path.join(memDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');

      // Slice 5: patch connected memories with reverse edges
      for (const edge of log.edges) {
        _patchReverseEdge(edge.targetId, { targetId: memId, relation: edge.relation, strength: edge.strength }, currentEntityId);
      }

      // Update index cache
      if (memoryStorage.indexCache) {
        memoryStorage.indexCache.addMemory(memId, log);
        memoryStorage.indexCache.save();
      }

      // Add to in-memory graph so activateMemory() can find it immediately
      if (memoryGraph) {
        memoryGraph.addMemoryNode({
          id: memId,
          topics: topics || [],
          emotion: 0,
          importance: log.importance,
          created: log.created,
          access_count: 0
        });
      }

      console.log(`  💡 Created semantic knowledge: ${memId} — "${knowledge.substring(0, 60)}"`);
      logTimeline('memory.semantic.created', {
        memId,
        knowledge: (knowledge || '').slice(0, 320),
        topics: topics || [],
        importance: log.importance,
        sourceMemId: sourceMemId || null
      });
      return { ok: true, memId };
    } catch (err) {
      console.error(`  ⚠ Failed to create semantic knowledge: ${err.message}`);
      logTimeline('memory.semantic.create_failed', {
        reason: err.message,
        knowledge: (knowledge || '').slice(0, 240)
      });
      return { ok: false, error: err.message };
    }
  }

  return { createCoreMemory, createSemanticKnowledge };
}

module.exports = { createMemoryOperations };
