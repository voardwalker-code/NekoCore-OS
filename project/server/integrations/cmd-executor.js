// ============================================================
// REM System — Command Executor (Sandboxed)
//
// Provides sandboxed shell command execution for entity tasks.
// Only whitelisted commands can run. All execution is jailed
// to the entity's workspace directory with enforced timeouts.
//
// Security layers:
//   1. Command whitelist — only approved binaries/commands
//   2. Workspace jail — cwd locked to entity workspace
//   3. Timeout — hard kill after limit
//   4. Output cap — stdout/stderr truncated
//   5. Argument validation — no shell metacharacters
// ============================================================

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Configuration ──

const DEFAULT_TIMEOUT_MS = 60_000;   // 60s default
const MAX_TIMEOUT_MS = 300_000;      // 5 min hard cap
const MAX_OUTPUT_BYTES = 16_384;     // 16KB output cap per stream

// ── Command Whitelist ──
// Only these base commands are allowed. Each entry defines:
//   binary: the executable name (resolved via PATH)
//   allowedSubcommands: if set, first arg must be one of these (null = any args)
//   maxTimeout: per-command timeout override (null = use default)

const COMMAND_WHITELIST = {
  // Rust
  'cargo':   { allowedSubcommands: ['build', 'run', 'test', 'check', 'clippy', 'fmt', 'init', 'new', 'add', 'remove', 'update', 'doc'], maxTimeout: 300_000 },
  'rustc':   { allowedSubcommands: null, maxTimeout: 120_000 },
  'rustfmt': { allowedSubcommands: null, maxTimeout: 30_000 },

  // Python
  'python':  { allowedSubcommands: null, maxTimeout: 120_000 },
  'python3': { allowedSubcommands: null, maxTimeout: 120_000 },
  'pip':     { allowedSubcommands: ['install', 'list', 'show', 'freeze', 'uninstall'], maxTimeout: 120_000 },
  'pip3':    { allowedSubcommands: ['install', 'list', 'show', 'freeze', 'uninstall'], maxTimeout: 120_000 },

  // Node.js / JavaScript
  'node':    { allowedSubcommands: null, maxTimeout: 120_000 },
  'npm':     { allowedSubcommands: ['init', 'install', 'test', 'run', 'start', 'build', 'ls', 'outdated', 'update', 'ci'], maxTimeout: 120_000 },
  'npx':     { allowedSubcommands: null, maxTimeout: 120_000 },

  // General build/utility
  'gcc':     { allowedSubcommands: null, maxTimeout: 120_000 },
  'g++':     { allowedSubcommands: null, maxTimeout: 120_000 },
  'make':    { allowedSubcommands: null, maxTimeout: 120_000 },
  'cmake':   { allowedSubcommands: null, maxTimeout: 120_000 },
  'go':      { allowedSubcommands: ['build', 'run', 'test', 'fmt', 'vet', 'mod', 'get'], maxTimeout: 120_000 },
  'git':     { allowedSubcommands: ['init', 'status', 'add', 'commit', 'log', 'diff', 'branch', 'checkout', 'tag'], maxTimeout: 30_000 },

  // File inspection (safe, read-only)
  'cat':     { allowedSubcommands: null, maxTimeout: 10_000 },
  'head':    { allowedSubcommands: null, maxTimeout: 10_000 },
  'tail':    { allowedSubcommands: null, maxTimeout: 10_000 },
  'wc':      { allowedSubcommands: null, maxTimeout: 10_000 },
  'ls':      { allowedSubcommands: null, maxTimeout: 10_000 },
  'dir':     { allowedSubcommands: null, maxTimeout: 10_000 },
  'find':    { allowedSubcommands: null, maxTimeout: 30_000 },
  'grep':    { allowedSubcommands: null, maxTimeout: 30_000 },
  'type':    { allowedSubcommands: null, maxTimeout: 10_000 },
};

// ── Dangerous patterns blocked in arguments ──
const BLOCKED_PATTERNS = [
  /[;&|`$]/,          // Shell metacharacters / chaining
  /\.\.\//,           // Directory traversal
  /^\s*>/,            // Redirect at start
  /\b(rm|del|rmdir|format|shutdown|reboot|kill|taskkill|mkfs)\b/i,
  /\b(curl|wget|powershell|cmd\.exe|bash|sh|zsh)\b/i,
];

/**
 * Validate and parse a command string.
 * @param {string} cmdStr - Raw command string from entity
 * @returns {{ ok: boolean, binary: string, args: string[], error?: string, config?: Object }}
 */
function parseCommand(cmdStr) {
  if (!cmdStr || typeof cmdStr !== 'string') {
    return { ok: false, binary: '', args: [], error: 'No command provided' };
  }

  const trimmed = cmdStr.trim();
  if (!trimmed) {
    return { ok: false, binary: '', args: [], error: 'Empty command' };
  }

  // Simple tokenizer: split on whitespace but respect quoted strings
  const tokens = [];
  let current = '';
  let inQuote = null;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuote) {
      if (ch === inQuote) { inQuote = null; continue; }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  if (tokens.length === 0) {
    return { ok: false, binary: '', args: [], error: 'No command tokens parsed' };
  }

  const binary = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  // Check whitelist
  const config = COMMAND_WHITELIST[binary];
  if (!config) {
    return { ok: false, binary, args, error: `Command not allowed: "${binary}". Allowed: ${Object.keys(COMMAND_WHITELIST).join(', ')}` };
  }

  // Check subcommand restriction
  if (config.allowedSubcommands && args.length > 0) {
    const sub = args[0].toLowerCase();
    if (!config.allowedSubcommands.includes(sub)) {
      return { ok: false, binary, args, error: `Subcommand "${sub}" not allowed for "${binary}". Allowed: ${config.allowedSubcommands.join(', ')}` };
    }
  }

  // Check for dangerous patterns in all arguments
  const fullArgStr = args.join(' ');
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullArgStr)) {
      return { ok: false, binary, args, error: `Blocked pattern in arguments: ${pattern}` };
    }
  }

  return { ok: true, binary, args, config };
}

/**
 * Execute a validated command in the entity's workspace.
 * @param {string} cmdStr - The raw command string
 * @param {string} workspacePath - The entity's workspace root (jail)
 * @param {Object} [opts]
 * @param {number} [opts.timeout] - Timeout in ms (capped at MAX_TIMEOUT_MS)
 * @returns {Promise<{ ok: boolean, exitCode?: number, stdout?: string, stderr?: string, error?: string, timedOut?: boolean }>}
 */
async function execCommand(cmdStr, workspacePath, opts = {}) {
  // Validate workspace path
  if (!workspacePath || typeof workspacePath !== 'string') {
    return { ok: false, error: 'No workspace path configured' };
  }
  const resolvedWs = path.resolve(workspacePath);
  if (!fs.existsSync(resolvedWs)) {
    return { ok: false, error: 'Workspace directory does not exist' };
  }

  // Parse and validate command
  const parsed = parseCommand(cmdStr);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  // Resolve timeout
  const cmdMaxTimeout = parsed.config.maxTimeout || DEFAULT_TIMEOUT_MS;
  const requestedTimeout = opts.timeout ? Math.min(opts.timeout, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  const timeout = Math.min(requestedTimeout, cmdMaxTimeout);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    // Spawn with workspace as cwd, no shell to prevent injection
    const proc = spawn(parsed.binary, parsed.args, {
      cwd: resolvedWs,
      shell: false,
      timeout: 0,  // we handle timeout ourselves
      env: {
        ...process.env,
        // Prevent interactive prompts
        CI: 'true',
        CARGO_TERM_COLOR: 'never',
        PYTHONDONTWRITEBYTECODE: '1',
        NO_COLOR: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, timeout);

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += chunk.toString('utf-8');
      }
    });

    proc.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += chunk.toString('utf-8');
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: `Failed to start "${parsed.binary}": ${err.message}. Is it installed and on PATH?`
      });
    });

    proc.on('close', (code) => {
      clearTimeout(timer);

      // Truncate output
      if (stdout.length > MAX_OUTPUT_BYTES) {
        stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + '\n... (output truncated)';
      }
      if (stderr.length > MAX_OUTPUT_BYTES) {
        stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + '\n... (output truncated)';
      }

      if (killed) {
        resolve({
          ok: false,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut: true,
          error: `Command timed out after ${timeout}ms`
        });
        return;
      }

      resolve({
        ok: code === 0,
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut: false,
        ...(code !== 0 ? { error: `Exit code ${code}` } : {})
      });
    });
  });
}

/**
 * Get list of allowed commands for prompt injection.
 * @returns {string} Human-readable list of available commands.
 */
function getAvailableCommands() {
  const lines = [];
  for (const [cmd, config] of Object.entries(COMMAND_WHITELIST)) {
    const subs = config.allowedSubcommands
      ? ` (${config.allowedSubcommands.join(', ')})`
      : '';
    lines.push(`  ${cmd}${subs}`);
  }
  return lines.join('\n');
}

module.exports = {
  execCommand,
  parseCommand,
  getAvailableCommands,
  COMMAND_WHITELIST,
  BLOCKED_PATTERNS,
  MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS
};
