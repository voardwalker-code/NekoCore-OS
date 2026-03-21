#!/usr/bin/env node
// ============================================================
// NekoCore OS — System Health Scanner
//
// Scans the entire project tree, checks every core file for:
//   - Missing files (expected but absent)
//   - Zero-byte files (0-byte or effectively empty)
//   - Syntax errors in JS files (require parse)
//   - Broken require() references
//   - Orphaned exports (files that reference missing modules)
//   - HTML structure issues (unclosed tags, missing IDs)
//   - JSON parse errors
//   - CSS syntax issues (unclosed braces)
//
// Produces a diagnostic log: scripts/health-report.log
// Also prints summary to stdout.
//
// Usage:
//   node scripts/health-scan.js              # full scan
//   node scripts/health-scan.js --json       # JSON output
//   node scripts/health-scan.js --fix-list   # output list for neko_fixer
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(__dirname, 'health-report.log');

// ========================= CORE FILE REGISTRY =========================
// These are the files the system MUST have to function.
// Organized by subsystem for clear diagnostics.

const CORE_REGISTRY = {
  // ---- Server Bootstrap ----
  'server/server.js': 'Server bootstrap & composition',

  // ---- Server Routes ----
  'server/routes/archive-routes.js': 'Archive API routes',
  'server/routes/auth-routes.js': 'Authentication routes',
  'server/routes/brain-routes.js': 'Brain status routes',
  'server/routes/browser-routes.js': 'Browser integration routes',
  'server/routes/chat-routes.js': 'Chat API routes',
  'server/routes/cognitive-routes.js': 'Cognitive/memory graph routes',
  'server/routes/config-routes.js': 'Config/profile routes',
  'server/routes/document-routes.js': 'Document routes',
  'server/routes/entity-chat-routes.js': 'Entity chat routes',
  'server/routes/entity-routes.js': 'Entity management routes',
  'server/routes/memory-routes.js': 'Memory API routes',
  'server/routes/nekocore-routes.js': 'NekoCore system routes',
  'server/routes/skills-routes.js': 'Skills API routes',
  'server/routes/slash-interceptor.js': 'Server-side slash command interceptor',
  'server/routes/sse-routes.js': 'Server-sent events routes',
  'server/routes/task-routes.js': 'Task API routes',
  'server/routes/vfs-routes.js': 'Virtual filesystem routes',

  // ---- Server Services ----
  'server/services/auth-service.js': 'Authentication service',
  'server/services/boot.js': 'Server boot service',
  'server/services/chat-pipeline.js': 'Main chat pipeline orchestrator',
  'server/services/config-runtime.js': 'Runtime config',
  'server/services/config-service.js': 'Config management',
  'server/services/entity-checkout.js': 'Entity checkout/lock',
  'server/services/entity-memory-compat.js': 'Entity memory compatibility',
  'server/services/entity-runtime.js': 'Entity runtime management',
  'server/services/llm-interface.js': 'LLM provider interface',
  'server/services/llm-runtime-utils.js': 'LLM runtime utilities',
  'server/services/llm-service.js': 'LLM service wrapper',
  'server/services/memory-operations.js': 'Memory CRUD operations',
  'server/services/memory-retrieval.js': 'Memory retrieval & ranking',
  'server/services/memory-service.js': 'Memory service wrapper',
  'server/services/nekocore-memory.js': 'NekoCore system memory',
  'server/services/nekocore-pipeline.js': 'NekoCore chat pipeline',
  'server/services/post-response-cognitive-feedback.js': 'Post-response cognitive feedback',
  'server/services/post-response-memory.js': 'Post-response memory encoding',
  'server/services/relationship-service.js': 'Relationship tracking',
  'server/services/response-postprocess.js': 'Response post-processing',
  'server/services/runtime-lifecycle.js': 'Runtime lifecycle',
  'server/services/startup-preflight.js': 'Startup preflight checks',
  'server/services/timeline-logger.js': 'Timeline event logger',
  'server/services/user-profiles.js': 'User profile service',
  'server/services/voice-profile.js': 'Voice profile service',

  // ---- Server Contracts ----
  'server/contracts/cognitive-feedback-contract.js': 'Cognitive feedback schema',
  'server/contracts/cognitive-snapshot-contract.js': 'Cognitive snapshot schema',
  'server/contracts/contributor-contracts.js': 'Contributor output schema',
  'server/contracts/memory-schema.js': 'Memory record schema',
  'server/contracts/planning-session-contract.js': 'Planning session schema',
  'server/contracts/response-contracts.js': 'Response format schema',
  'server/contracts/turn-classifier-contract.js': 'Turn classifier schema',
  'server/contracts/worker-output-contract.js': 'Worker output schema',
  'server/contracts/vfs-drive-mapping.contract.schema.json': 'VFS drive mapping contract schema',
  'server/contracts/vfs-drive-mapping.contract.example.json': 'VFS drive mapping contract example',
  'server/contracts/installer-uninstaller-contract.schema.json': 'Installer/uninstaller contract schema',
  'server/contracts/installer-uninstaller.contract.example.json': 'Installer/uninstaller contract example',
  'server/contracts/installer-hello-world.contract.example.json': 'Installer hello-world contract example',
  'server/contracts/payloads/tab-hello-world.template.html': 'Hello-world tab template HTML',

  // ---- Brain: Agent Echo ----
  'server/brain/agent-echo.js': 'Agent Echo — non-LLM retrieval coordinator',

  // ---- Brain: Core Orchestration ----
  'server/brain/core/index.js': 'Brain core index',
  'server/brain/core/conscious-engine.js': 'Conscious reasoning engine',
  'server/brain/core/orchestration-policy.js': 'Orchestration policy',
  'server/brain/core/orchestrator.js': 'Main orchestrator (4-node pipeline)',
  'server/brain/core/subconscious-agent.js': 'Subconscious processing',
  'server/brain/core/worker-dispatcher.js': 'Worker dispatch',
  'server/brain/core/worker-registry.js': 'Worker registry',

  // ---- Brain: Cognition (Brain Loop) ----
  'server/brain/cognition/index.js': 'Cognition index',
  'server/brain/cognition/brain-loop.js': 'Main brain loop',
  'server/brain/cognition/attention-system.js': 'Attention system',
  'server/brain/cognition/boredom-engine.js': 'Boredom engine',
  'server/brain/cognition/cognitive-feedback.js': 'Cognitive feedback engine',
  'server/brain/cognition/cognitive-pulse.js': 'Cognitive pulse',
  'server/brain/cognition/cognitive-snapshot.js': 'Cognitive snapshot assembly',
  'server/brain/cognition/curiosity-engine.js': 'Curiosity engine',
  'server/brain/cognition/dream-engine.js': 'Dream engine',
  'server/brain/cognition/dream-intuition-adapter.js': 'Dream intuition adapter',
  'server/brain/cognition/dream-maintenance-selector.js': 'Dream maintenance selector',
  'server/brain/cognition/dream-seed-pool.js': 'Dream seed pool',
  'server/brain/cognition/dream-visualizer.js': 'Dream visualizer',
  'server/brain/cognition/interaction-magnitude.js': 'Interaction magnitude classifier',

  // ---- Brain: Cognition Phases ----
  'server/brain/cognition/phases/index.js': 'Phase index',
  'server/brain/cognition/phases/phase-archive.js': 'Archive phase',
  'server/brain/cognition/phases/phase-archive-index.js': 'Archive index phase',
  'server/brain/cognition/phases/phase-beliefs.js': 'Beliefs phase',
  'server/brain/cognition/phases/phase-boredom.js': 'Boredom phase',
  'server/brain/cognition/phases/phase-conscious-stm.js': 'Conscious STM phase',
  'server/brain/cognition/phases/phase-consolidation.js': 'Consolidation phase',
  'server/brain/cognition/phases/phase-decay.js': 'Decay phase',
  'server/brain/cognition/phases/phase-deep-sleep.js': 'Deep sleep phase',
  'server/brain/cognition/phases/phase-dreams.js': 'Dreams phase',
  'server/brain/cognition/phases/phase-goals.js': 'Goals phase',
  'server/brain/cognition/phases/phase-hebbian.js': 'Hebbian learning phase',
  'server/brain/cognition/phases/phase-identity.js': 'Identity phase',
  'server/brain/cognition/phases/phase-neurochemistry.js': 'Neurochemistry phase',
  'server/brain/cognition/phases/phase-pruning.js': 'Pruning phase',
  'server/brain/cognition/phases/phase-somatic.js': 'Somatic awareness phase',
  'server/brain/cognition/phases/phase-traces.js': 'Traces phase',

  // ---- Brain: Bus ----
  'server/brain/bus/index.js': 'Bus index',
  'server/brain/bus/cognitive-bus.js': 'Cognitive event bus',
  'server/brain/bus/thought-stream.js': 'Thought stream',
  'server/brain/bus/thought-types.js': 'Thought type constants',

  // ---- Brain: Utils ----
  'server/brain/utils/index.js': 'Utils index',
  'server/brain/utils/archive-directory.js': 'Archive directory utils',
  'server/brain/utils/archive-index.js': 'Archive index utils',
  'server/brain/utils/archive-indexes.js': 'Archive indexes utils',
  'server/brain/utils/archive-router.js': 'Archive router',
  'server/brain/utils/bm25.js': 'BM25 ranking',
  'server/brain/utils/entity-manager.js': 'Entity manager',
  'server/brain/utils/memory-encoder-nlp.js': 'NLP memory encoder',
  'server/brain/utils/model-router.js': 'Model router',
  'server/brain/utils/rake.js': 'RAKE keyword extraction',
  'server/brain/utils/semantic-cache.js': 'Semantic cache',
  'server/brain/utils/template-responses.js': 'Template responses',
  'server/brain/utils/textrank.js': 'TextRank algorithm',
  'server/brain/utils/topic-utils.js': 'Topic utilities',
  'server/brain/utils/turn-classifier.js': 'Turn classifier',
  'server/brain/utils/turn-signals.js': 'Turn signal extraction',
  'server/brain/utils/yake.js': 'YAKE keyword extraction',
  'server/brain/utils/bulk-ingest.js': 'Bulk memory ingest utility',

  // ---- Brain: Memory ----
  'server/brain/memory/index.js': 'Memory index',
  'server/brain/memory/archive-manager.js': 'Archive manager',
  'server/brain/memory/conscious-memory.js': 'Conscious memory',
  'server/brain/memory/dream-memory.js': 'Dream memory',
  'server/brain/memory/memory-graph-builder.js': 'Memory graph builder',
  'server/brain/memory/memory-graph.js': 'Memory graph',
  'server/brain/memory/memory-index-cache.js': 'Memory index cache',
  'server/brain/memory/memory-index.js': 'Memory index',
  'server/brain/memory/memory-storage.js': 'Memory storage',
  'server/brain/memory/memory-images.js': 'Memory image storage',

  // ---- Brain: Identity ----
  'server/brain/identity/index.js': 'Identity index',
  'server/brain/identity/core-memory-manager.js': 'Core memory manager',
  'server/brain/identity/dream-diary.js': 'Dream diary',
  'server/brain/identity/goal-generator.js': 'Goal generator',
  'server/brain/identity/goals-manager.js': 'Goals manager',
  'server/brain/identity/hatch-entity.js': 'Entity hatching',
  'server/brain/identity/identity-manager.js': 'Identity manager',
  'server/brain/identity/life-diary.js': 'Life diary',
  'server/brain/identity/onboarding.js': 'Onboarding',

  // ---- Brain: Affect ----
  'server/brain/affect/index.js': 'Affect index',
  'server/brain/affect/neurochemistry.js': 'Neurochemistry engine',
  'server/brain/affect/somatic-awareness.js': 'Somatic awareness',

  // ---- Brain: Generation ----
  'server/brain/generation/index.js': 'Generation index',
  'server/brain/generation/aspect-prompts.js': 'Aspect prompts',
  'server/brain/generation/chapter-generator.js': 'Chapter generator',
  'server/brain/generation/context-consolidator.js': 'Context consolidator',
  'server/brain/generation/core-life-generator.js': 'Core life generator',
  'server/brain/generation/diary-prompts.js': 'Diary prompts',
  'server/brain/generation/humanize-filter.js': 'Humanize filter',
  'server/brain/generation/image-generator.js': 'Image generator',
  'server/brain/generation/message-chunker.js': 'Message chunker',
  'server/brain/generation/pixel-art-engine.js': 'Pixel art engine',
  'server/brain/generation/synthetic-memory-generator.js': 'Synthetic memory generator',

  // ---- Brain: Knowledge ----
  'server/brain/knowledge/index.js': 'Knowledge index',
  'server/brain/knowledge/beliefGraph.js': 'Belief graph',
  'server/brain/knowledge/dream-link-writer.js': 'Dream link writer',
  'server/brain/knowledge/trace-graph-builder.js': 'Trace graph builder',
  'server/brain/knowledge/trace-graph.js': 'Trace graph',

  // ---- Brain: Skills ----
  'server/brain/skills/index.js': 'Skills index',
  'server/brain/skills/skill-manager.js': 'Skill manager',
  'server/brain/skills/task-runner.js': 'Skill task runner',
  'server/brain/skills/workspace-tools.js': 'Workspace tools (ws_read/ws_write/etc.)',

  // ---- Brain: NekoCore ----
  'server/brain/nekocore/bootstrap.js': 'NekoCore bootstrap',
  'server/brain/nekocore/audit.js': 'NekoCore audit',
  'server/brain/nekocore/doc-ingestion.js': 'NekoCore doc ingestion',
  'server/brain/nekocore/knowledge-retrieval.js': 'NekoCore knowledge retrieval',
  'server/brain/nekocore/model-intelligence.js': 'NekoCore model intelligence',
  'server/brain/nekocore/persona-profile.js': 'NekoCore persona profile',
  'server/brain/nekocore/reset-runtime.js': 'NekoCore runtime reset',

  // ---- Brain: Tasks ----
  'server/brain/tasks/blueprint-loader.js': 'Blueprint loader',
  'server/brain/tasks/entity-chat-manager.js': 'Entity chat manager',
  'server/brain/tasks/entity-network-registry.js': 'Entity network registry',
  'server/brain/tasks/entity-worker-invoker.js': 'Entity worker invoker',
  'server/brain/tasks/intent-classifier.js': 'Intent classifier',
  'server/brain/tasks/planning-orchestrator.js': 'Planning orchestrator',
  'server/brain/tasks/project-executor.js': 'Project executor',
  'server/brain/tasks/task-archive-reader.js': 'Task archive reader',
  'server/brain/tasks/task-archive-writer.js': 'Task archive writer',
  'server/brain/tasks/task-classifier-rules.js': 'Task classifier rules',
  'server/brain/tasks/task-context-gatherer.js': 'Task context gatherer',
  'server/brain/tasks/task-context-strategies.js': 'Task context strategies',
  'server/brain/tasks/task-event-bus.js': 'Task event bus',
  'server/brain/tasks/task-executor.js': 'Task executor',
  'server/brain/tasks/task-frontman.js': 'Task frontman',
  'server/brain/tasks/task-module-registry.js': 'Task module registry',
  'server/brain/tasks/task-pipeline-bridge.js': 'Task pipeline bridge',
  'server/brain/tasks/task-project-store.js': 'Task project store',
  'server/brain/tasks/task-session.js': 'Task session store',
  'server/brain/tasks/task-types.js': 'Task type constants',

  // ---- Brain: Task Blueprints ----
  'server/brain/tasks/blueprints/core/task-decomposition.md': 'Blueprint: task decomposition',
  'server/brain/tasks/blueprints/core/tool-guide.md': 'Blueprint: tool guide',
  'server/brain/tasks/blueprints/core/quality-gate.md': 'Blueprint: quality gate',
  'server/brain/tasks/blueprints/core/error-recovery.md': 'Blueprint: error recovery',
  'server/brain/tasks/blueprints/core/output-format.md': 'Blueprint: output format',
  'server/brain/tasks/blueprints/modules/research.md': 'Blueprint: research module',
  'server/brain/tasks/blueprints/modules/code.md': 'Blueprint: code module',
  'server/brain/tasks/blueprints/modules/writing.md': 'Blueprint: writing module',
  'server/brain/tasks/blueprints/modules/analysis.md': 'Blueprint: analysis module',
  'server/brain/tasks/blueprints/modules/planning.md': 'Blueprint: planning module',
  'server/brain/tasks/blueprints/modules/project.md': 'Blueprint: project module',

  // ---- Server: Integrations ----
  'server/integrations/web-fetch.js': 'Web fetch integration',
  'server/integrations/cmd-executor.js': 'Sandboxed command executor for entity tasks',
  'server/integrations/telegram.js': 'Telegram bot integration',

  // ---- Server: Config ----
  'server/config/entity-network.json': 'Entity network registry seed',

  // ---- Server: Data Templates ----
  'server/entityPaths.js': 'Entity path resolver',

  // ---- Client: Shell ----
  'client/index.html': 'Main shell HTML (chrome only)',
  'client/nekocore.html': 'NekoCore standalone page',
  'client/create.html': 'Entity creator page',
  'client/visualizer.html': 'Memory visualizer page',
  'client/failsafe.html': 'Failsafe emergency console (zero-dependency)',
  'client/manifest.webmanifest': 'PWA manifest',

  // ---- Client: CSS ----
  'client/css/system-shared.css': 'Shared utility classes (SINGLE SOURCE OF TRUTH)',
  'client/css/ui-v2.css': 'Core UI component styles',
  'client/css/theme.css': 'Theme variables',
  'client/css/visualizer.css': 'Visualizer styles',

  // ---- Client: Core JS ----
  'client/js/boot.js': 'Client boot sequence',
  'client/js/desktop.js': 'Desktop manager',
  'client/js/login.js': 'Login handler',
  'client/js/auth.js': 'Auth client',
  'client/js/pipeline.js': 'Client chat pipeline',
  'client/js/window-manager.js': 'Window manager',
  'client/js/context-menu.js': 'Context menu',
  'client/js/sleep.js': 'Sleep/wake handler',
  'client/js/vfs.js': 'Virtual filesystem client',
  'client/js/shadow-content-loader.js': 'Shadow DOM content loader',
  'client/js/app.js': 'App framework',
  'client/js/app-window.js': 'App window framework',
  'client/js/memory-ui.js': 'Memory UI',
  'client/js/nekocore-app.js': 'NekoCore app client',
  'client/js/create.js': 'Entity creator client',
  'client/js/starfield.js': 'Starfield background',
  'client/js/visualizer.js': 'Visualizer client',

  // ---- Client: App Loaders ----
  'client/js/apps/core-html-loader.js': 'Core HTML tab loader',
  'client/js/apps/non-core-html-loader.js': 'Non-core HTML tab loader',
  'client/js/apps/system-apps-adapter.js': 'System apps adapter',
  'client/js/apps/app-manifest.json': 'App manifest',
  'client/js/apps/system-apps.json': 'System apps registry',
  'client/js/apps/system-apps.schema.json': 'System apps JSON schema',

  // ---- Client: Core Apps ----
  'client/js/apps/core/chat.js': 'Chat app controller',
  'client/js/apps/core/archive-ui.js': 'Archive UI',
  'client/js/apps/core/config-profiles.js': 'Config profiles UI',
  'client/js/apps/core/debug-core-app.js': 'Debug core app',
  'client/js/apps/core/entity-ui.js': 'Entity management UI',
  'client/js/apps/core/setup-ui.js': 'Setup wizard UI',
  'client/js/apps/core/simple-provider.js': 'Simple provider UI',
  'client/js/apps/core/slash-commands.js': 'Slash command system',
  'client/js/apps/core/system-health.js': 'System health UI',
  'client/js/apps/core/telemetry-ui.js': 'Telemetry/task manager UI',
  'client/js/apps/core/users-ui.js': 'Users UI',

  // ---- Client: Optional Apps ----
  'client/js/apps/optional/browser-app.js': 'Browser app',
  'client/js/apps/optional/diary.js': 'Diary app',
  'client/js/apps/optional/document-digest.js': 'Document digest',
  'client/js/apps/optional/dream-gallery.js': 'Dream gallery',
  'client/js/apps/optional/physical-ui.js': 'Physical UI',
  'client/js/apps/optional/popout-manager.js': 'Popout manager',
  'client/js/apps/optional/skills-ui.js': 'Skills UI',
  'client/js/apps/optional/task-ui.js': 'Task UI',
  'client/js/apps/optional/theme-manager.js': 'Theme manager',
  'client/js/apps/optional/visualizer-ui.js': 'Visualizer UI',

  // ---- Client: Shared ----
  'client/shared/api.js': 'Shared API client',
  'client/shared/entity-select.js': 'Entity select component',
  'client/shared/notify.js': 'Notification component',
  'client/shared/sse.js': 'SSE client',

  // ---- Client: Core Tab HTML ----
  'client/apps/core/tab-chat.html': 'Chat tab HTML',
  'client/apps/core/tab-activity.html': 'Activity tab HTML',
  'client/apps/core/tab-archive.html': 'Archive tab HTML',
  'client/apps/core/tab-debugcore.html': 'Debug core tab HTML',
  'client/apps/core/tab-settings.html': 'Settings tab HTML',
  'client/apps/core/tab-advanced.html': 'Advanced tab HTML',
  'client/apps/core/tab-creator.html': 'Creator tab HTML',
  'client/apps/core/tab-users.html': 'Users tab HTML',
  'client/apps/core/tab-entity.html': 'Entity tab HTML',
  'client/apps/core/tab-nekocore.html': 'NekoCore tab HTML',

  // ---- Client: Overlays ----
  'client/apps/core/overlays/boot-login.html': 'Boot/login overlay',
  'client/apps/core/overlays/setup-wizard.html': 'Setup wizard overlay',
  'client/apps/core/overlays/sleep.html': 'Sleep overlay',

  // ---- Client: Entity Creator (packaged app) ----
  'client/apps/entity-creator/index.html': 'Entity creator app HTML',
  'client/apps/entity-creator/entity-creator.js': 'Entity creator app JS',
  'client/apps/entity-creator/entity-creator.css': 'Entity creator app CSS',

  // ---- Client: Non-core app manifest ----
  'client/apps/non-core/non-core-apps.manifest.json': 'Non-core apps manifest',

  // ---- Client: Theme system ----
  'client/themes/themes.manifest.json': 'Theme manifest',
  'client/themes/core/neko-default.css': 'Default theme',
  'client/themes/core/frosted-orbit.css': 'Frosted orbit theme',
  'client/themes/core/glass-clear.css': 'Glass clear theme',
  'client/themes/core/light-default.css': 'Light default theme',
  'client/themes/core/sunset-terminal.css': 'Sunset terminal theme',

  // ---- Client: Neural Viz ----
  'client/js/neural-viz.js': 'Neural viz wrapper',
  'client/js/neural-viz/index.js': 'Neural viz index',
  'client/js/neural-viz/data-layer.js': 'Neural viz data layer',
  'client/js/neural-viz/renderer.js': 'Neural viz renderer',

  // ---- Skills ----
  'skills/coding/SKILL.md': 'Coding skill definition',
  'skills/rust/SKILL.md': 'Rust skill definition',
  'skills/python/SKILL.md': 'Python skill definition',
  'skills/memory-tools/SKILL.md': 'Memory tools skill definition',
  'skills/search-archive/SKILL.md': 'Search+archive skill definition',
  'skills/web-search/SKILL.md': 'Web search skill definition',
  'skills/vscode/SKILL.md': 'VS Code skill definition',
  'skills/ws_mkdir/SKILL.md': 'ws_mkdir skill definition',
  'skills/ws_move/SKILL.md': 'ws_move skill definition',
  'skills/tutorial-notes/SKILL.md': 'Tutorial notes skill definition',
  'skills/self-repair/SKILL.md': 'Self-repair and diagnostics skill definition',

  // ---- Root Scripts ----
  'reset-all.js': 'Factory reset script',
  'package.json': 'Project package manifest'
};

// ========================= SCANNER ENGINE =========================

const issues = [];
const fileStats = [];

function addIssue(severity, filePath, message, detail) {
  issues.push({ severity, file: filePath, message, detail: detail || '' });
}

function checkFileExists(relPath, description) {
  const abs = path.join(PROJECT_ROOT, relPath);
  const stat = { file: relPath, description, exists: false, size: 0, issues: [] };

  if (!fs.existsSync(abs)) {
    stat.issues.push('MISSING');
    addIssue('CRITICAL', relPath, 'File is MISSING', description);
    fileStats.push(stat);
    return stat;
  }

  let fstat;
  try {
    fstat = fs.statSync(abs);
  } catch (e) {
    stat.issues.push('UNREADABLE');
    addIssue('CRITICAL', relPath, 'File exists but cannot be read', e.message);
    fileStats.push(stat);
    return stat;
  }

  stat.exists = true;
  stat.size = fstat.size;

  if (fstat.size === 0) {
    stat.issues.push('ZERO_BYTE');
    addIssue('CRITICAL', relPath, 'File is 0 bytes (empty)', description);
  }

  fileStats.push(stat);
  return stat;
}

function checkJsSyntax(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(abs)) return;

  let content;
  try {
    content = fs.readFileSync(abs, 'utf-8');
  } catch { return; }

  if (content.length === 0) return;

  try {
    new vm.Script(content, { filename: relPath });
  } catch (e) {
    const line = e.stack ? e.stack.match(/:(\d+)/) : null;
    const lineNum = line ? line[1] : '?';
    addIssue('ERROR', relPath, `JS syntax error at line ${lineNum}`, e.message);
  }
}

function checkJsRequires(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(abs)) return;

  let content;
  try {
    content = fs.readFileSync(abs, 'utf-8');
  } catch { return; }

  // Find require('./relative-path') calls
  const requirePattern = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let match;
  while ((match = requirePattern.exec(content)) !== null) {
    const reqPath = match[1];
    const dir = path.dirname(abs);
    let resolved = path.resolve(dir, reqPath);

    // Try with .js extension, /index.js, .json
    const candidates = [
      resolved,
      resolved + '.js',
      resolved + '.json',
      path.join(resolved, 'index.js')
    ];

    const found = candidates.some(c => fs.existsSync(c));
    if (!found) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      addIssue('ERROR', relPath, `Broken require at line ${lineNum}: ${reqPath}`, `Resolved to: ${resolved}`);
    }
  }
}

function checkJsonSyntax(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(abs)) return;

  let content;
  try {
    content = fs.readFileSync(abs, 'utf-8');
  } catch { return; }

  if (content.length === 0) return;

  // Check for BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    addIssue('WARNING', relPath, 'File has UTF-8 BOM (byte order mark) — may cause parse issues in some tools');
    content = content.slice(1);
  }

  try {
    JSON.parse(content);
  } catch (e) {
    addIssue('ERROR', relPath, 'JSON parse error', e.message);
  }
}

function checkHtmlStructure(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(abs)) return;

  let content;
  try {
    content = fs.readFileSync(abs, 'utf-8');
  } catch { return; }

  if (content.length === 0) return;

  // Check for unclosed script/style tags
  const scriptOpens = (content.match(/<script\b/gi) || []).length;
  const scriptCloses = (content.match(/<\/script>/gi) || []).length;
  if (scriptOpens !== scriptCloses) {
    addIssue('WARNING', relPath, `Mismatched <script> tags: ${scriptOpens} opens, ${scriptCloses} closes`);
  }

  const styleOpens = (content.match(/<style\b/gi) || []).length;
  const styleCloses = (content.match(/<\/style>/gi) || []).length;
  if (styleOpens !== styleCloses) {
    addIssue('WARNING', relPath, `Mismatched <style> tags: ${styleOpens} opens, ${styleCloses} closes`);
  }
}

function checkCssBraces(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(abs)) return;

  let content;
  try {
    content = fs.readFileSync(abs, 'utf-8');
  } catch { return; }

  if (content.length === 0) return;

  // Strip comments and strings
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const opens = (stripped.match(/{/g) || []).length;
  const closes = (stripped.match(/}/g) || []).length;
  if (opens !== closes) {
    addIssue('WARNING', relPath, `Mismatched CSS braces: ${opens} opens, ${closes} closes`);
  }
}

// ========================= MAIN SCAN =========================

function runScan() {
  const startTime = Date.now();
  console.log('NekoCore OS — System Health Scanner');
  console.log('=' .repeat(50));
  console.log(`Scanning ${Object.keys(CORE_REGISTRY).length} core files...\n`);

  // Pass 1: Check all core files exist and are non-empty
  for (const [relPath, description] of Object.entries(CORE_REGISTRY)) {
    checkFileExists(relPath, description);
  }

  // Pass 2: Deep checks per file type
  for (const [relPath] of Object.entries(CORE_REGISTRY)) {
    const abs = path.join(PROJECT_ROOT, relPath);
    if (!fs.existsSync(abs)) continue;

    const ext = path.extname(relPath).toLowerCase();

    if (ext === '.js') {
      checkJsSyntax(relPath);
      checkJsRequires(relPath);
    } else if (ext === '.json') {
      checkJsonSyntax(relPath);
    } else if (ext === '.html') {
      checkHtmlStructure(relPath);
    } else if (ext === '.css') {
      checkCssBraces(relPath);
    }
  }

  // Pass 3: Check for unexpected extra files in core dirs that might indicate drift
  const coreDirs = new Set();
  for (const relPath of Object.keys(CORE_REGISTRY)) {
    coreDirs.add(path.dirname(relPath));
  }

  for (const dir of coreDirs) {
    const absDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) continue;

    try {
      const entries = fs.readdirSync(absDir);
      for (const entry of entries) {
        const relEntry = path.join(dir, entry).replace(/\\/g, '/');
        // Skip directories, dotfiles, and known non-core files
        const absEntry = path.join(absDir, entry);
        if (fs.statSync(absEntry).isDirectory()) continue;
        if (entry.startsWith('.')) continue;
        if (entry.endsWith('.tmp') || entry.includes('.tmp-')) continue;

        if (!CORE_REGISTRY[relEntry]) {
          addIssue('INFO', relEntry, 'Unregistered file in core directory (may be drift or new addition)');
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  const elapsed = Date.now() - startTime;

  // ---- Generate report ----
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const errors = issues.filter(i => i.severity === 'ERROR');
  const warnings = issues.filter(i => i.severity === 'WARNING');
  const info = issues.filter(i => i.severity === 'INFO');
  const healthy = fileStats.filter(s => s.exists && s.issues.length === 0);
  const missing = fileStats.filter(s => !s.exists);
  const zeroByte = fileStats.filter(s => s.exists && s.issues.includes('ZERO_BYTE'));

  const report = [];
  report.push('='.repeat(60));
  report.push('  NekoCore OS — System Health Report');
  report.push(`  Generated: ${new Date().toISOString()}`);
  report.push(`  Scan time: ${elapsed}ms`);
  report.push('='.repeat(60));
  report.push('');
  report.push('SUMMARY');
  report.push('-'.repeat(40));
  report.push(`  Total core files:    ${Object.keys(CORE_REGISTRY).length}`);
  report.push(`  Healthy:             ${healthy.length}`);
  report.push(`  Missing:             ${missing.length}`);
  report.push(`  Zero-byte:           ${zeroByte.length}`);
  report.push(`  Critical issues:     ${critical.length}`);
  report.push(`  Errors:              ${errors.length}`);
  report.push(`  Warnings:            ${warnings.length}`);
  report.push(`  Info:                ${info.length}`);
  report.push('');

  if (critical.length > 0) {
    report.push('CRITICAL ISSUES');
    report.push('-'.repeat(40));
    for (const issue of critical) {
      report.push(`  [CRITICAL] ${issue.file}`);
      report.push(`    ${issue.message}`);
      if (issue.detail) report.push(`    Detail: ${issue.detail}`);
    }
    report.push('');
  }

  if (errors.length > 0) {
    report.push('ERRORS');
    report.push('-'.repeat(40));
    for (const issue of errors) {
      report.push(`  [ERROR] ${issue.file}`);
      report.push(`    ${issue.message}`);
      if (issue.detail) report.push(`    Detail: ${issue.detail}`);
    }
    report.push('');
  }

  if (warnings.length > 0) {
    report.push('WARNINGS');
    report.push('-'.repeat(40));
    for (const issue of warnings) {
      report.push(`  [WARNING] ${issue.file}`);
      report.push(`    ${issue.message}`);
    }
    report.push('');
  }

  if (info.length > 0) {
    report.push('INFO');
    report.push('-'.repeat(40));
    for (const issue of info) {
      report.push(`  [INFO] ${issue.file}`);
      report.push(`    ${issue.message}`);
    }
    report.push('');
  }

  // File inventory with sizes
  report.push('FILE INVENTORY');
  report.push('-'.repeat(40));
  const totalSize = fileStats.reduce((sum, s) => sum + s.size, 0);
  report.push(`  Total size: ${(totalSize / 1024).toFixed(1)} KB`);
  report.push('');

  for (const stat of fileStats) {
    const status = !stat.exists ? 'MISSING' :
      stat.issues.length > 0 ? stat.issues.join(', ') : 'OK';
    const sizeStr = stat.exists ? `${(stat.size / 1024).toFixed(1)}KB` : '---';
    report.push(`  [${status.padEnd(10)}] ${sizeStr.padStart(8)}  ${stat.file}`);
  }

  const reportText = report.join('\n');

  // ---- Output ----
  const args = process.argv.slice(2);

  if (args.includes('--json')) {
    const jsonOut = {
      generated: new Date().toISOString(),
      scanTimeMs: elapsed,
      summary: {
        totalFiles: Object.keys(CORE_REGISTRY).length,
        healthy: healthy.length,
        missing: missing.length,
        zeroByte: zeroByte.length,
        criticalIssues: critical.length,
        errors: errors.length,
        warnings: warnings.length
      },
      issues,
      files: fileStats
    };
    console.log(JSON.stringify(jsonOut, null, 2));
    return jsonOut;
  }

  if (args.includes('--fix-list')) {
    // Output just the list of files that need fixing (for neko_fixer)
    const fixable = fileStats.filter(s => !s.exists || s.issues.includes('ZERO_BYTE'));
    console.log('Files needing repair:');
    for (const f of fixable) {
      console.log(`  ${f.file} — ${f.issues.join(', ')}`);
    }
    if (fixable.length === 0) console.log('  (none — all core files healthy)');
    return fixable;
  }

  // Default: print to console and write log file
  console.log(reportText);

  try {
    fs.writeFileSync(REPORT_PATH, reportText, 'utf-8');
    console.log(`\nFull report written to: scripts/health-report.log`);
  } catch (e) {
    console.error(`\nCould not write report file: ${e.message}`);
  }

  // Exit code reflects severity
  if (critical.length > 0) process.exitCode = 2;
  else if (errors.length > 0) process.exitCode = 1;

  return { issues, fileStats, critical, errors, warnings, info, healthy };
}

// Export for programmatic use (by neko_fixer generator & tests)
module.exports = { CORE_REGISTRY, runScan };

// Run if called directly
if (require.main === module) {
  runScan();
}
