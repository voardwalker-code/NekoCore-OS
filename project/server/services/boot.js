// ============================================================
// NekoCore OS — Server Boot Service
// Extracted from server.js P2-S6-d.
// Owns: startup IIFE logic — start cognitive architecture,
//       emit system-started thought, start Telegram bot.
// ============================================================
'use strict';

const ThoughtTypes = require('../brain/thought-types');

/**
 * Start the NekoCore OS cognitive architecture.
 *
 * @param {Object}   opts
 * @param {Object}   opts.thoughtStream
 * @param {Object}   opts.attentionSystem
 * @param {Object}   opts.cognitiveBus
 * @param {Function} opts.startTelegramBot
 */
async function boot({ thoughtStream, attentionSystem, cognitiveBus, startTelegramBot }) {
  try {
    thoughtStream.start();
    attentionSystem.subscribe();
    cognitiveBus.emitThought({
      type:       ThoughtTypes.SYSTEM_LOG,
      source:     'system',
      message:    'NekoCore OS server started. Select or create an entity to begin.',
      importance: 0.8
    });
    await startTelegramBot();
  } catch (error) {
    console.error('  \u26A0 Startup error:', error.message);
  }
}

module.exports = { boot };
