#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const projectDir = path.join(__dirname, 'project');
const serverEntry = path.join(projectDir, 'server', 'server.js');

console.log('NekoCore OS booter: starting server from project/server/server.js');

const child = spawn(process.execPath, [serverEntry], {
  cwd: projectDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Server process exited via signal: ${signal}`);
    process.exit(1);
  }
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start server via booter.js');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
