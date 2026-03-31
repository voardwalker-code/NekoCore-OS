// ── Services · Port Guard ────────────────────────────────────────────────────
//
// HOW PORT GUARD WORKS:
// This module probes port availability, identifies existing listeners, and
// chooses a safe startup port with optional interactive duplicate handling.
//
// WHAT USES THIS:
//   server bootstrap flow before creating the HTTP listener
//
// EXPORTS:
//   resolvePort(), isPortFree(), identifyInstance(), probe()
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
// ── port-guard.js ──────────────────────────────────────────────────────────
// Smart port management: detects conflicts, identifies running instances,
// prompts the user before spawning duplicate servers.
//
// Usage:
//   const { resolvePort } = require('./services/port-guard');
//   const port = await resolvePort({
//     defaultPort:  3847,
//     serverName:   'NekoCore OS',
//     healthPath:   '/api/nekocore/status',
//     portRange:    [3847, 3849],
//     allowMultiple: true    // ask user; false = hard-fail on duplicate
//   });

const net  = require('net');
const http = require('http');
const readline = require('readline');

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when nothing is listening on `port`.
 */
/** Return true when no process is listening on the given port. */
function isPortFree(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => { srv.close(); resolve(true); });
    srv.listen(port, '127.0.0.1');
  });
}

/**
 * HTTP GET with a short timeout. Resolves { ok, status, body } or { ok:false }.
 */
/** Probe one local HTTP endpoint with timeout-safe JSON parsing. */
function probe(port, path, timeoutMs = 2000) {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d); } catch (_) { /* text body */ }
        resolve({ ok: true, status: res.statusCode, body: parsed || d });
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false }); });
  });
}

/**
 * Try to identify what is running on `port` by probing known health endpoints.
 * Returns { identified: true, name, detail } or { identified: false }.
 */
async function identifyInstance(port) {
  // NekoCore OS
  const nekoprobe = await probe(port, '/api/nekocore/status');
  if (nekoprobe.ok && nekoprobe.body && nekoprobe.body.ok === true) {
    return {
      identified: true,
      name: 'NekoCore OS',
      detail: `entity-ready=${nekoprobe.body.isSystemEntityReady}, model=${nekoprobe.body.activeModel || 'none'}`
    };
  }

  // MA
  const maProbe = await probe(port, '/api/health');
  if (maProbe.ok && maProbe.body && typeof maProbe.body === 'object' && maProbe.body.status !== undefined) {
    return {
      identified: true,
      name: 'MA (Memory Architect)',
      detail: `files=${maProbe.body.files || '?'}, critical=${maProbe.body.critical || 0}`
    };
  }
  // MA might also return just { ok: true }
  if (maProbe.ok && maProbe.body && maProbe.body.ok === true) {
    return { identified: true, name: 'MA (Memory Architect)', detail: 'responding' };
  }

  // Unknown service on the port
  if (nekoprobe.ok || maProbe.ok) {
    return { identified: true, name: 'Unknown HTTP service', detail: `HTTP ${nekoprobe.status || maProbe.status}` };
  }

  return { identified: false };
}

/**
 * Prompt the user on stdin. Returns the trimmed answer.
 * If stdin is not a TTY (piped / background), returns `defaultAnswer`.
 */
/** Prompt user in TTY mode; return default answer in non-interactive mode. */
function askUser(question, defaultAnswer = 'n') {
  if (!process.stdin.isTTY) return Promise.resolve(defaultAnswer);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve((answer || '').trim().toLowerCase());
    });
  });
}

// ── Main entry point ────────────────────────────────────────────────────────

/**
 * Resolve which port this server should listen on.
 *
 * @param {object}  opts
 * @param {number}  opts.defaultPort   - Preferred port
 * @param {string}  opts.serverName    - Human-readable name (e.g. "NekoCore OS")
 * @param {string}  opts.healthPath    - GET path this server type uses for health
 * @param {number[]} [opts.portRange]  - [min, max] inclusive fallback range
 * @param {boolean} [opts.allowMultiple=true] - Whether to offer multi-instance option
 *
 * @returns {Promise<number>} The port to listen on (0 = no port available)
 */
async function resolvePort(opts) {
  const { defaultPort, serverName, healthPath, allowMultiple = true } = opts;
  const rangeMin = opts.portRange ? opts.portRange[0] : defaultPort;
  const rangeMax = opts.portRange ? opts.portRange[1] : defaultPort + 10;

  // ── Happy path: default port is free ──────────────────────────────────────
  if (await isPortFree(defaultPort)) return defaultPort;

  // ── Port is busy — identify what's there ──────────────────────────────────
  console.log(`\n  ⚠ Port ${defaultPort} is already in use.`);

  const instance = await identifyInstance(defaultPort);

  if (instance.identified) {
    console.log(`  ℹ Running on port ${defaultPort}: ${instance.name} (${instance.detail})`);

    // Same server type already running?
    const isSameType = instance.name.toLowerCase().includes(serverName.toLowerCase())
                    || serverName.toLowerCase().includes(instance.name.toLowerCase().split(' ')[0]);

    if (isSameType) {
      console.log(`  ℹ An existing ${serverName} instance is already active on port ${defaultPort}.`);

      if (!allowMultiple) {
        console.log(`  ✖ Multiple instances not permitted. Exiting.`);
        return 0;
      }

      const answer = await askUser(
        `\n  ? A ${serverName} instance is already running on port ${defaultPort}.\n` +
        `    Do you want to start another instance on a different port? (y/N): `, 'n'
      );

      if (answer !== 'y' && answer !== 'yes') {
        console.log(`  ℹ Exiting — use the existing instance at http://127.0.0.1:${defaultPort}`);
        return 0;
      }
    } else {
      // Different service on the port — offer to use a different port
      console.log(`  ℹ A different service (${instance.name}) is using port ${defaultPort}.`);
      const answer = await askUser(
        `\n  ? Start ${serverName} on a different port? (Y/n): `, 'y'
      );
      if (answer === 'n' || answer === 'no') {
        console.log(`  ℹ Exiting.`);
        return 0;
      }
    }
  } else {
    // Port busy but can't identify what's there
    console.log(`  ℹ Could not identify what is running on port ${defaultPort}.`);
    const answer = await askUser(
      `\n  ? Start ${serverName} on a different port? (Y/n): `, 'y'
    );
    if (answer === 'n' || answer === 'no') {
      console.log(`  ℹ Exiting.`);
      return 0;
    }
  }

  // ── Find a free port in the range ─────────────────────────────────────────
  for (let p = rangeMin; p <= rangeMax; p++) {
    if (p === defaultPort) continue;
    if (await isPortFree(p)) {
      console.log(`  ✓ Found open port: ${p}`);
      return p;
    }
  }

  // Fallback — try a wider range
  for (let p = rangeMax + 1; p <= rangeMax + 20; p++) {
    if (await isPortFree(p)) {
      console.log(`  ✓ Found open port: ${p}`);
      return p;
    }
  }

  console.log(`  ✖ No available ports found in range ${rangeMin}–${rangeMax + 20}.`);
  return 0;
}

module.exports = { resolvePort, isPortFree, identifyInstance, probe };
