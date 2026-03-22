# REM System — Build Order

## Pre-requisites
- Node.js v20+
- No npm install needed (zero dependencies until Layer 5 adds none)

## Build Sequence

| Step | Layer | What | Gate |
|------|-------|------|------|
| 1 | Contracts | Validate: \`node -e "require('./contracts/memory-schema')"\` | Must not throw |
| 2 | Layer 0 | Memory Storage + Index + NLP (5 modules) | \`npm run test:0\` passes |
| 3 | Layer 1 | Memory Operations (1 module) | \`npm run test:1\` passes |
| 4 | Layer 2 | Cognitive Pipeline (5 modules) | \`npm run test:2\` passes |
| 5 | Layer 3 | Entity Identity (2 modules) | \`npm run test:3\` passes |
| 6 | Layer 4 | Dream/Brain Loop/Beliefs (5 modules) | \`npm run test:4\` passes |
| 7 | Layer 5 | LLM + Policy + MA Integration (3 modules) | \`npm run test:5\` passes |
| 8 | Layer 6 | Entity Management + MA Seed (1 module + UI) | \`npm run test:6\` + manual verify |

## Rules
- NEVER skip a layer. Layer N tests must pass before Layer N+1.
- NEVER modify contracts unless a bug is found.
- Every stub has algorithm comments — follow them.
- Reference MA's NLP implementations where noted.
- Update PROJECT-MANIFEST.json after completing each module.

## Transport
\`rem-server.js\` and \`client/index.html\` work at every stage.
Run \`npm start\` at any time → http://localhost:3860
