// ── MA Command Executor ──────────────────────────────────────────────────────
// Sandboxed shell execution. Configurable whitelist, workspace jail, no shell mode.
'use strict';

const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

const OUTPUT_CAP = 16 * 1024; // 16 KB max per stream
const DEFAULT_TIMEOUT = 60000;
const HARD_MAX_TIMEOUT = 300000;

const MA_ROOT = path.resolve(__dirname, '..');
const WHITELIST_PATH = path.join(MA_ROOT, 'MA-Config', 'cmd-whitelist.json');

// ── Default whitelist: binary → allowed subcommands (null = all) ────────────
const DEFAULT_WHITELIST = {
  cargo:   ['build','run','test','check','clippy','fmt','init','new','add','remove','update','doc'],
  rustc:   null, rustfmt: null,
  python:  null, python3: null,
  pip:     ['install','list','show','freeze','uninstall'],
  pip3:    ['install','list','show','freeze','uninstall'],
  node:    null, npm: ['init','install','test','run','start','build','ls','outdated','update','ci'],
  npx:     null,
  gcc:     null, 'g++': null, make: null, cmake: null,
  go:      ['build','run','test','fmt','vet','mod','get'],
  git:     ['init','status','add','commit','log','diff','branch','checkout','tag'],
  cat:     null, head: null, tail: null, wc: null,
  ls:      null, dir:  null, find: null, grep: null, type: null
};

// ── Runtime whitelist (loaded from file or defaults) ────────────────────────
let WHITELIST = { ...DEFAULT_WHITELIST };

function _loadWhitelist() {
  try {
    if (fs.existsSync(WHITELIST_PATH)) {
      const data = JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
      WHITELIST = data;
    }
  } catch { /* use defaults */ }
}

function _saveWhitelist() {
  const dir = path.dirname(WHITELIST_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WHITELIST_PATH, JSON.stringify(WHITELIST, null, 2));
}

// Load on module init
_loadWhitelist();

// ── Whitelist management API ────────────────────────────────────────────────

/** Get the full whitelist. */
function getWhitelist() {
  return { ...WHITELIST };
}

/**
 * Add or update a command in the whitelist.
 * @param {string} binary — command name (lowercase)
 * @param {string[]|null} subcommands — allowed subcommands, or null for all
 */
function whitelistAdd(binary, subcommands) {
  if (!binary || typeof binary !== 'string') throw new Error('binary required');
  const key = binary.toLowerCase().trim();
  if (!key) throw new Error('binary cannot be empty');
  // Prevent whitelisting dangerous binaries
  const forbidden = ['rm','del','format','shutdown','kill','taskkill','curl','wget','powershell','cmd.exe','bash','sh','cmd'];
  if (forbidden.includes(key)) throw new Error(`Cannot whitelist dangerous command: ${key}`);
  WHITELIST[key] = subcommands;
  _saveWhitelist();
  return { binary: key, subcommands };
}

/**
 * Remove a command from the whitelist.
 * @param {string} binary — command name to remove
 */
function whitelistRemove(binary) {
  if (!binary || typeof binary !== 'string') throw new Error('binary required');
  const key = binary.toLowerCase().trim();
  if (!(key in WHITELIST)) throw new Error(`Not in whitelist: ${key}`);
  delete WHITELIST[key];
  _saveWhitelist();
  return { removed: key };
}

/** Reset whitelist to defaults. */
function whitelistReset() {
  WHITELIST = { ...DEFAULT_WHITELIST };
  _saveWhitelist();
  return { reset: true, count: Object.keys(WHITELIST).length };
}

// Timeout overrides per binary (ms)
const TIMEOUT_MAP = { cargo: 120000, gcc: 120000, 'g++': 120000, make: 120000, cmake: 120000, go: 120000 };

// ── Blocked patterns — security fence ───────────────────────────────────────
const BLOCKED = [
  /[;&|`$]/,       // shell metacharacters
  /\.\.\//,        // directory traversal
  /[<>]/,          // redirects
  /\brm\b/i, /\bdel\b/i, /\bformat\b/i, /\bshutdown\b/i, /\bkill\b/i, /\btaskkill\b/i,
  /\bcurl\b/i, /\bwget\b/i, /\bpowershell\b/i, /\bcmd\.exe\b/i, /\bbash\b/i, /\bsh\b/i
];

/**
 * Parse and validate a command string.
 * @returns {{ ok, binary, args, error, config }}
 */
function parseCommand(cmdStr) {
  if (!cmdStr || typeof cmdStr !== 'string') return { ok: false, error: 'Empty command' };
  const trimmed = cmdStr.trim();

  // Check blocked patterns
  for (const pat of BLOCKED) {
    if (pat.test(trimmed)) return { ok: false, error: `Blocked pattern: ${pat}` };
  }

  // Tokenize (respects double-quoted strings)
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(trimmed))) tokens.push(m[1] ?? m[2]);
  if (!tokens.length) return { ok: false, error: 'No tokens' };

  const binary = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  // Whitelist check
  if (!(binary in WHITELIST)) return { ok: false, error: `Command not whitelisted: ${binary}` };

  // Subcommand check
  const allowed = WHITELIST[binary];
  if (allowed && args.length && !allowed.includes(args[0])) {
    return { ok: false, error: `Subcommand not allowed: ${binary} ${args[0]}` };
  }

  return { ok: true, binary, args, config: { timeout: TIMEOUT_MAP[binary] || DEFAULT_TIMEOUT } };
}

/**
 * Execute a command in the workspace jail.
 * @param {string} cmdStr - Command to run
 * @param {string} workspacePath - Absolute path to workspace
 * @param {object} opts - { timeout }
 * @returns {Promise<{ ok, exitCode, stdout, stderr, error, timedOut }>}
 */
function execCommand(cmdStr, workspacePath, opts = {}) {
  return new Promise((resolve) => {
    const parsed = parseCommand(cmdStr);
    if (!parsed.ok) return resolve({ ok: false, error: parsed.error });

    if (!workspacePath) return resolve({ ok: false, error: 'No workspace path' });

    const timeout = Math.min(opts.timeout || parsed.config.timeout, HARD_MAX_TIMEOUT);
    let stdout = '', stderr = '', timedOut = false, done = false;

    const child = spawn(parsed.binary, parsed.args, {
      cwd: workspacePath,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true', NO_COLOR: '1' }
    });

    child.stdout.on('data', d => { if (stdout.length < OUTPUT_CAP) stdout += d; });
    child.stderr.on('data', d => { if (stderr.length < OUTPUT_CAP) stderr += d; });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout);

    child.on('error', (err) => {
      if (done) return; done = true;
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });

    child.on('close', (code) => {
      if (done) return; done = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, exitCode: code, stdout: stdout.slice(0, OUTPUT_CAP), stderr: stderr.slice(0, OUTPUT_CAP), timedOut });
    });
  });
}

/** List available commands (for LLM prompts). */
function getAvailableCommands() {
  return Object.entries(WHITELIST).map(([bin, subs]) =>
    subs ? `${bin} [${subs.join('|')}]` : bin
  ).join('\n');
}

module.exports = { parseCommand, execCommand, getAvailableCommands, getWhitelist, whitelistAdd, whitelistRemove, whitelistReset };
