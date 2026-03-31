// ── Scripts · Kill Server ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This script automates maintenance, generation, validation, or local
// development workflows.
//
// WHAT USES THIS:
// Primary dependencies in this module include: child_process. Keep import
// and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

// kill-server.js
// Kills any process using the specified port (default 3847)
// Usage: node scripts/dev/kill-server.js [port]

const { exec } = require('child_process');
const port = process.argv[2] || 3847;
// killProcessOnPort()
// WHAT THIS DOES: killProcessOnPort is a helper used by this module's main flow.
// WHY IT EXISTS: it keeps repeated logic in one reusable place.
// HOW TO USE IT: call killProcessOnPort(...) where this helper behavior is needed.
function killProcessOnPort(port) {
  // Windows: use netstat to find PID, then taskkill
  const findCmd = `netstat -ano | findstr :${port}`;
  exec(findCmd, (err, stdout) => {
    if (err || !stdout) {
      console.log(`No process found on port ${port}.`);
      return;
    }
    // Parse PID from netstat output
    const lines = stdout.trim().split('\n');
    let killed = false;
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        const killCmd = `taskkill /PID ${pid} /F`;
        exec(killCmd, (killErr, killStdout, killStderr) => {
          if (killErr) {
            console.error(`Failed to kill PID ${pid}:`, killStderr || killErr.message);
          } else {
            console.log(`Killed process on port ${port} (PID ${pid})`);
            killed = true;
          }
        });
      }
    });
    if (!killed) {
      console.log(`No process killed. Check permissions or port.`);
    }
  });
}

killProcessOnPort(port);
