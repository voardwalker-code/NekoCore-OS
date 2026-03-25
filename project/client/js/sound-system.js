// ============================================================
// NekoCore OS — Sound System
// Synthesized OS sounds using Web Audio API.
// No external audio files required.
// ============================================================

(function () {
  'use strict';

  var ctx = null;
  var enabled = true;
  var volume = 0.35;
  var unlocked = false;

  function getCtx() {
    if (!unlocked) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    }
    return ctx;
  }

  function ensureResumed() {
    var c = getCtx();
    if (c && c.state === 'suspended') c.resume();
    return c;
  }

  // Defer AudioContext creation until first user gesture (browser autoplay policy)
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    ensureResumed();
  }
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });

  // ── Synthesis helpers ──────────────────────────────────────

  function playTone(freq, duration, type, gainVal, delay) {
    var c = ensureResumed();
    if (!c || !enabled) return;
    var now = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime((gainVal || volume) * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, gainVal, delay) {
    var c = ensureResumed();
    if (!c || !enabled) return;
    var now = c.currentTime + (delay || 0);
    var bufferSize = Math.floor(c.sampleRate * duration);
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource();
    src.buffer = buffer;
    var gain = c.createGain();
    var g = (gainVal || 0.08) * volume;
    gain.gain.setValueAtTime(g, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(gain);
    gain.connect(c.destination);
    src.start(now);
    src.stop(now + duration);
  }

  // ── Sound definitions ──────────────────────────────────────

  var sounds = {};

  // Boot — ascending warm chime (3 tones rising)
  sounds.boot = function () {
    playTone(392, 0.3, 'sine', 0.4, 0);       // G4
    playTone(523.25, 0.3, 'sine', 0.35, 0.15); // C5
    playTone(659.25, 0.5, 'sine', 0.3, 0.3);   // E5
    playTone(783.99, 0.6, 'triangle', 0.15, 0.45); // G5 soft harmonics
  };

  // Shutdown — descending warm tones
  sounds.shutdown = function () {
    playTone(659.25, 0.3, 'sine', 0.35, 0);     // E5
    playTone(523.25, 0.3, 'sine', 0.3, 0.2);    // C5
    playTone(392, 0.5, 'sine', 0.25, 0.4);      // G4
    playTone(293.66, 0.7, 'triangle', 0.15, 0.6); // D4 fading
  };

  // Error — two short low dissonant tones
  sounds.error = function () {
    playTone(220, 0.15, 'square', 0.2, 0);     // A3
    playTone(207.65, 0.25, 'square', 0.18, 0.12); // Ab3 — dissonant
    playNoise(0.08, 0.06, 0);
  };

  // Warning — single mid-pitch blip
  sounds.warning = function () {
    playTone(440, 0.12, 'triangle', 0.25, 0);  // A4
    playTone(415.3, 0.18, 'triangle', 0.15, 0.08); // Ab4
  };

  // Notification — soft double ping
  sounds.notification = function () {
    playTone(880, 0.12, 'sine', 0.2, 0);    // A5
    playTone(1108.73, 0.18, 'sine', 0.18, 0.1); // Db6
  };

  // Click — very short tap
  sounds.click = function () {
    playTone(800, 0.04, 'sine', 0.15, 0);
    playNoise(0.02, 0.04, 0);
  };

  // Window open — quick ascending sweep
  sounds.windowOpen = function () {
    playTone(523.25, 0.08, 'sine', 0.15, 0);  // C5
    playTone(659.25, 0.1, 'sine', 0.12, 0.06); // E5
    playTone(783.99, 0.12, 'triangle', 0.08, 0.12); // G5
  };

  // Window close — quick descending sweep
  sounds.windowClose = function () {
    playTone(659.25, 0.08, 'sine', 0.12, 0);  // E5
    playTone(523.25, 0.1, 'sine', 0.1, 0.06); // C5
    playTone(392, 0.12, 'triangle', 0.06, 0.12); // G4
  };

  // Login success — bright chord
  sounds.login = function () {
    playTone(523.25, 0.25, 'sine', 0.2, 0);   // C5
    playTone(659.25, 0.25, 'sine', 0.18, 0);  // E5
    playTone(783.99, 0.35, 'sine', 0.15, 0.1); // G5
  };

  // Tab switch — subtle tick
  sounds.tabSwitch = function () {
    playTone(700, 0.04, 'sine', 0.08, 0);
  };

  // ── Public API ─────────────────────────────────────────────

  window.nkSound = {
    play: function (name) {
      if (!enabled) return;
      var fn = sounds[name];
      if (typeof fn === 'function') fn();
    },
    setEnabled: function (val) { enabled = !!val; },
    isEnabled: function () { return enabled; },
    setVolume: function (v) { volume = Math.max(0, Math.min(1, v)); },
    getVolume: function () { return volume; },
    list: function () { return Object.keys(sounds); }
  };
}());
