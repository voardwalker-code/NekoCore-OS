# NekoCore — Build Order

## Pre-requisites
- Node.js v20+
- REM System project must be complete (all layer tests passing)
- \`npm install\` (express dependency)

## Build Sequence

| Step | Part | What | Gate |
|------|------|------|------|
| 1 | Contracts | Validate all 5 contract files load | Must not throw |
| 2 | Part 1 | Cognitive Foundation — Bus + Affect + Utils (6 modules) | \`npm run test:1\` → 21 pass |
| 3 | Part 2 | Advanced Memory & Knowledge (11 modules) | \`npm run test:2\` → 22 pass |
| 4 | Part 3 | Cognition Engine — 9 engines + 16 phases (25 modules) | \`npm run test:3\` → 50 pass |
| 5 | Part 4 | Identity & Generation — 8 identity + 9 generation (17 modules) | \`npm run test:4\` → 34 pass |
| 6 | Part 5 | Services & Transport — 16 services + 1 util + 12 routes + 3 transport | \`npm run test:5\` → 49 pass |

## Rules
- NEVER skip a part. Part N tests must pass before Part N+1.
- NEVER modify contracts unless a bug is found.
- Every stub has algorithm comments — follow them.
- Reference MA's NLP and REM System modules where noted.
- Update PROJECT-MANIFEST.json after completing each module.

## Transport
\`nekocore-server.js\` and \`client/index.html\` work at every stage.
Run \`npm start\` at any time → http://localhost:3870 (requires REM System on 3860)
