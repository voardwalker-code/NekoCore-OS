// ── Routes · Config Routes ───────────────────────────────────────────────────
//
// HOW CONFIG ROUTING WORKS:
// This module serves runtime/global/entity config APIs, workspace file APIs,
// proxy forwarding, sleep settings, and backup/restore operations.
//
// WHAT USES THIS:
//   setup/settings UI, workspace panel, and system backup/restore tools
//
// EXPORTS:
//   createConfigRoutes(ctx)
// ─────────────────────────────────────────────────────────────────────────────

// ── Config Routes ────────────────────────────────────────────
// /api/config, /api/entity-config, /api/proxy
// /api/sleep/config, /api/workspace/*

const { fetch } = require('../services/http-fetch');
// createConfigRoutes()
// WHAT THIS DOES: Builds config route dispatcher and related helper utilities.
// WHY IT EXISTS: Config/workspace/backup/restore APIs share common state and helper behaviors.
// HOW TO USE IT: Call createConfigRoutes(ctx) during server route registration.
function createConfigRoutes(ctx) {
  const { fs, path } = ctx;
  const PROJECT_ROOT = path.join(__dirname, '..', '..');
  const SERVER_DATA_DIR = path.join(PROJECT_ROOT, 'server', 'data');
  const CONFIG_DIR = path.join(PROJECT_ROOT, 'Config');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'ma-config.json');
  const ENTITIES_DIR = path.join(PROJECT_ROOT, 'entities');
  const MEMORIES_DIR = path.join(PROJECT_ROOT, 'memories');
  const BACKUP_MANIFEST = 'backup-manifest.json';
  // isValidObject()
  // WHAT THIS DOES: Returns true for plain non-array object values.
  // WHY IT EXISTS: Manifest/config validation needs a small shared object guard.
  // HOW TO USE IT: Call isValidObject(value) before treating JSON as object payload.
  function isValidObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }
  function timestampTag() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }
  function copyPathIfExists(src, dest) {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true, force: true });
    } else {
      const parent = path.dirname(dest);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
  // removePathIfExists()
  // WHAT THIS DOES: Removes file/directory tree when target exists.
  // WHY IT EXISTS: Restore flows need predictable cleanup before copying replacement data.
  // HOW TO USE IT: Call removePathIfExists(path) in restore reset steps.
  function removePathIfExists(target) {
    if (!fs.existsSync(target)) return;
    fs.rmSync(target, { recursive: true, force: true });
  }
  // buildRestoreCandidates()
  // WHAT THIS DOES: Builds canonical file/dir candidates expected in backup folder.
  // WHY IT EXISTS: Restore process should have one centralized map of expected paths.
  // HOW TO USE IT: Call buildRestoreCandidates(backupDir) before restore checks/copies.
  function buildRestoreCandidates(backupDir) {
    return {
      configFile: path.join(backupDir, 'Config', 'ma-config.json'),
      serverDataDir: path.join(backupDir, 'server', 'data'),
      entitiesDir: path.join(backupDir, 'entities'),
      memoriesDir: path.join(backupDir, 'memories')
    };
  }
  // createSafetySnapshot()
  // WHAT THIS DOES: Creates pre-restore safety snapshot of current runtime files/directories.
  // WHY IT EXISTS: Restore operations need rollback safety if source backup is incomplete or wrong.
  // HOW TO USE IT: Call createSafetySnapshot() right before mutating live config/data dirs.
  function createSafetySnapshot() {
    const snapshotsRoot = path.join(PROJECT_ROOT, 'restore-snapshots');
    if (!fs.existsSync(snapshotsRoot)) fs.mkdirSync(snapshotsRoot, { recursive: true });
    const snapshotDir = path.join(snapshotsRoot, `pre-restore-${timestampTag()}`);
    fs.mkdirSync(snapshotDir, { recursive: true });

    copyPathIfExists(CONFIG_FILE, path.join(snapshotDir, 'Config', 'ma-config.json'));
    copyPathIfExists(SERVER_DATA_DIR, path.join(snapshotDir, 'server', 'data'));
    copyPathIfExists(ENTITIES_DIR, path.join(snapshotDir, 'entities'));
    copyPathIfExists(MEMORIES_DIR, path.join(snapshotDir, 'memories'));

    fs.writeFileSync(path.join(snapshotDir, BACKUP_MANIFEST), JSON.stringify({
      type: 'pre-restore-snapshot',
      createdAt: new Date().toISOString(),
      source: 'local-runtime'
    }, null, 2), 'utf8');
    return snapshotDir;
  }

  async function dispatch(req, res, url, apiHeaders, readBody) {
    const p = url.pathname;
    const m = req.method;

    if (p === '/api/config' && m === 'GET') { await getConfig(req, res, apiHeaders); return true; }
    if (p === '/api/config' && m === 'POST') { await postConfig(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/config/max-tokens' && m === 'GET') { getMaxTokens(req, res, apiHeaders); return true; }
    if (p === '/api/config/max-tokens' && m === 'POST') { await postMaxTokens(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/config/token-limits' && m === 'GET') { getTokenLimits(req, res, apiHeaders); return true; }
    if (p === '/api/config/token-limits' && m === 'POST') { await postTokenLimits(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/config/token-limits/reset' && m === 'POST') { await resetTokenLimits(req, res, apiHeaders); return true; }
    if (p === '/api/entity-config' && m === 'GET') { getEntityConfig(req, res, apiHeaders, url); return true; }
    if (p === '/api/entity-config' && m === 'POST') { await postEntityConfig(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/proxy' && m === 'POST') { await postProxy(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/sleep/config' && m === 'GET') { getSleepConfig(req, res, apiHeaders); return true; }
    if (p === '/api/sleep/config' && m === 'POST') { await postSleepConfig(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/workspace/config' && m === 'GET') { getWorkspaceConfig(req, res, apiHeaders); return true; }
    if (p === '/api/workspace/config' && m === 'POST') { await postWorkspaceConfig(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/workspace/list' && m === 'GET') { getWorkspaceList(req, res, apiHeaders, url); return true; }
    if (p === '/api/workspace/read' && m === 'GET') { getWorkspaceRead(req, res, apiHeaders, url); return true; }
    if (p === '/api/workspace/write' && m === 'POST') { await postWorkspaceWrite(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/workspace/delete' && m === 'POST') { await postWorkspaceDelete(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/system/backup' && m === 'POST') { await postSystemBackup(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/system/restore' && m === 'POST') { await postSystemRestore(req, res, apiHeaders, readBody); return true; }
    if (p === '/api/system/webui-presence' && m === 'POST') { await postWebuiPresence(req, res, apiHeaders, readBody); return true; }
    return false;
  }
  // normalizeAspectProvider()
  // WHAT THIS DOES: Normalizes provider aliases into canonical aspect keys.
  // WHY IT EXISTS: API callers may send variants (like "dreams") that should map consistently.
  // HOW TO USE IT: Call normalizeAspectProvider(provider) before profile config access.
  function normalizeAspectProvider(provider) {
    const p = String(provider || '').toLowerCase().trim();
    if (p === 'dreams') return 'dream';
    return p;
  }
  // readEntityProfileRef()
  // WHAT THIS DOES: Reads entity-level config profile reference from entity.json.
  // WHY IT EXISTS: Entity-specific profile preference should override global active profile.
  // HOW TO USE IT: Call readEntityProfileRef(entityId) during entity config reads.
  function readEntityProfileRef(entityId) {
    if (!entityId) return null;
    try {
      const entityPaths = require('../entityPaths');
      const canonicalId = entityPaths.normalizeEntityId(entityId);
      const entityFile = path.join(entityPaths.getEntityRoot(canonicalId), 'entity.json');
      if (!fs.existsSync(entityFile)) return null;
      const entity = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
      const ref = String(entity?.configProfileRef || '').trim();
      return ref || null;
    } catch (_) {
      return null;
    }
  }
  // writeEntityProfileRef()
  // WHAT THIS DOES: Persists entity-level config profile reference into entity.json.
  // WHY IT EXISTS: Entity profile binding needs a durable write path.
  // HOW TO USE IT: Call writeEntityProfileRef(entityId, profileName) from profile-ref updates.
  function writeEntityProfileRef(entityId, profileName) {
    const entityPaths = require('../entityPaths');
    const canonicalId = entityPaths.normalizeEntityId(entityId);
    const entityFile = path.join(entityPaths.getEntityRoot(canonicalId), 'entity.json');
    if (!fs.existsSync(entityFile)) throw new Error('Entity not found: ' + canonicalId);

    const entity = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
    entity.configProfileRef = String(profileName || '').trim();
    fs.writeFileSync(entityFile, JSON.stringify(entity, null, 2), 'utf8');
    return entity.configProfileRef;
  }
  // normalizeIncomingRuntimeConfig()
  // WHAT THIS DOES: Validates and normalizes incoming provider runtime config payload.
  // WHY IT EXISTS: Clients send mixed provider shapes; runtime expects canonical structure.
  // HOW TO USE IT: Call normalizeIncomingRuntimeConfig(config) before persisting profile aspects.
  function normalizeIncomingRuntimeConfig(config) {
    if (!config || typeof config !== 'object') return null;

    const isProbablyCorruptedApiKey = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return true;
      // API keys should be single-token values without whitespace/newlines/log text.
      if (/\s/.test(s)) return true;
      if (/call failed|invalid_request_error|request_id|context_management|⚠/i.test(s)) return true;
      return false;
    };

    const type = String(config.type || '').toLowerCase().trim();

    // Preserve capabilities object if present (user-configured overrides)
    const capabilities = (config.capabilities && typeof config.capabilities === 'object')
      ? { ...config.capabilities, compaction: false }
      : undefined;

    if (type === 'ollama' || (config.ollamaUrl && config.ollamaModel)) {
      const endpoint = String(config.endpoint || config.ollamaUrl || 'http://localhost:11434').trim();
      const model = String(config.model || config.ollamaModel || '').trim();
      if (!endpoint || !model) return null;
      const result = { type: 'ollama', endpoint, model };
      if (capabilities) result.capabilities = capabilities;
      return result;
    }

    if (type === 'anthropic') {
      const endpoint = String(config.endpoint || '').trim()
        || 'https://api.anthropic.com/v1/messages';
      const apiKey = String(config.apiKey || config.key || '').trim();
      const model = String(config.model || '').trim();
      if (!apiKey || !model || isProbablyCorruptedApiKey(apiKey)) return null;
      const result = { type: 'anthropic', endpoint, apiKey, model };
      if (capabilities) result.capabilities = capabilities;
      return result;
    }

    const endpoint = String(config.endpoint || config.ep || '').trim() || 'https://openrouter.ai/api/v1/chat/completions';
    const apiKey = String(config.apiKey || config.key || '').trim();
    const model = String(config.model || '').trim();
    if (!endpoint || !apiKey || !model || isProbablyCorruptedApiKey(apiKey)) return null;
    const result = { type: 'openrouter', endpoint, apiKey, model };
    if (capabilities) result.capabilities = capabilities;
    return result;
  }

  const REDACTED = '••••••••';
  // redactKeys()
  // WHAT THIS DOES: Recursively redacts API key fields for response payloads.
  // WHY IT EXISTS: Config responses must avoid leaking secrets to UI/clients.
  // HOW TO USE IT: Call redactKeys(obj) before returning config-like objects externally.
  function redactKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(redactKeys);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if ((k === 'apiKey' || k === 'key') && typeof v === 'string' && v.length > 0) {
        out[k] = REDACTED;
      } else if (typeof v === 'object') {
        out[k] = redactKeys(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  // mergeKeysBack()
  // WHAT THIS DOES: Merges redacted placeholders back to stored secret values.
  // WHY IT EXISTS: Client updates may keep masked values that should preserve original secrets.
  // HOW TO USE IT: Call mergeKeysBack(incoming, stored) before saving updated config.
  function mergeKeysBack(incoming, stored) {
    // When client POSTs config, restore any redacted values from the stored config on disk
    if (!incoming || typeof incoming !== 'object') return incoming;
    if (!stored || typeof stored !== 'object') return incoming;
    if (Array.isArray(incoming)) return incoming;
    const out = {};
    for (const [k, v] of Object.entries(incoming)) {
      if ((k === 'apiKey' || k === 'key') && v === REDACTED) {
        out[k] = stored[k] || v;
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        out[k] = mergeKeysBack(v, stored[k] || {});
      } else {
        out[k] = v;
      }
    }
    // Preserve stored keys that incoming didn't touch
    for (const [k, v] of Object.entries(stored)) {
      if (!(k in out)) out[k] = v;
    }
    return out;
  }

  async function getConfig(req, res, apiHeaders) {
    const config = ctx.loadConfig();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify(config));
  }

  async function postConfig(req, res, apiHeaders, readBody) {
    try {
      const body = await readBody(req);
      const incoming = JSON.parse(body);
      // Merge back any redacted keys from the currently stored config
      const stored = ctx.loadConfig();
      const data = mergeKeysBack(incoming, stored);
      ctx.saveConfig(data);
      ctx.refreshMaxTokensCache();
      ctx.refreshTokenLimitsCache();
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }
  // getMaxTokens()
  // WHAT THIS DOES: getMaxTokens reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getMaxTokens(...), then use the returned value in your next step.
  function getMaxTokens(req, res, apiHeaders) {
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ maxTokens: ctx._defaultMaxTokens }));
  }

  async function postMaxTokens(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const val = parseInt(body.maxTokens, 10);
      if (!Number.isFinite(val) || val < 256 || val > 128000) {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ error: 'maxTokens must be between 256 and 128000' }));
        return;
      }
      const config = ctx.loadConfig();
      config.maxTokens = val;
      ctx.saveConfig(config);
      ctx.refreshMaxTokensCache();
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, maxTokens: val }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }
  // getTokenLimits()
  // WHAT THIS DOES: getTokenLimits reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getTokenLimits(...), then use the returned value in your next step.
  function getTokenLimits(req, res, apiHeaders) {
    const result = {};
    for (const [key, def] of Object.entries(ctx.TOKEN_LIMIT_DEFAULTS)) {
      result[key] = {
        value: ctx._tokenLimits[key] || def.value,
        defaultValue: def.value,
        label: def.label,
        desc: def.desc
      };
    }
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify(result));
  }

  async function postTokenLimits(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const overrides = body.tokenLimits;
      if (!overrides || typeof overrides !== 'object') {
        res.writeHead(400, apiHeaders);
        res.end(JSON.stringify({ error: 'Expected { tokenLimits: { key: value, ... } }' }));
        return;
      }
      const validated = {};
      for (const [k, v] of Object.entries(overrides)) {
        if (!ctx.TOKEN_LIMIT_DEFAULTS[k]) continue;
        const val = parseInt(v, 10);
        if (!Number.isFinite(val) || val < 64 || val > 128000) continue;
        validated[k] = val;
      }
      const config = ctx.loadConfig();
      config.tokenLimits = validated;
      ctx.saveConfig(config);
      ctx.refreshTokenLimitsCache();
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, tokenLimits: ctx._tokenLimits }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }

  async function resetTokenLimits(req, res, apiHeaders) {
    try {
      const config = ctx.loadConfig();
      delete config.tokenLimits;
      ctx.saveConfig(config);
      ctx.refreshTokenLimitsCache();
      const result = {};
      for (const [key, def] of Object.entries(ctx.TOKEN_LIMIT_DEFAULTS)) {
        result[key] = { value: def.value, defaultValue: def.value, label: def.label, desc: def.desc };
      }
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, tokenLimits: result }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }
  // getEntityConfig()
  // WHAT THIS DOES: getEntityConfig reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getEntityConfig(...), then use the returned value in your next step.
  function getEntityConfig(req, res, apiHeaders, url) {
    const entityId = url.searchParams.get('entityId') || '';
    const provider = url.searchParams.get('provider');
    if (!provider) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: 'Missing provider' }));
      return;
    }

    const normalizedProvider = normalizeAspectProvider(provider);
    const globalCfg = ctx.loadConfig();
    const entityProfileRef = readEntityProfileRef(entityId);
    const profileRef = entityProfileRef || globalCfg?.lastActive || null;
    const profile = globalCfg?.profiles?.[profileRef] || null;

    if (normalizedProvider === 'profile-ref') {
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ profileRef, entityProfileRef, globalOnly: true }));
      return;
    }

    const resolved = ctx.resolveProfileAspectConfigs(profile);
    const config = resolved?.[normalizedProvider] || {};
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ...config, profileRef, entityProfileRef, globalOnly: true }));
  }

  async function postEntityConfig(req, res, apiHeaders, readBody) {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body);
      const { entityId, provider, config, profileRef } = data;
      if (!provider) throw new Error('Missing provider');
      const normalizedProvider = normalizeAspectProvider(provider);

      if (normalizedProvider === 'profile-ref') {
        if (!entityId) throw new Error('Missing entityId for profile-ref update');
        const chosenProfile = String(profileRef || '').trim();
        if (!chosenProfile) throw new Error('Missing profileRef value');
        const globalCfg = ctx.loadConfig();
        if (!globalCfg?.profiles?.[chosenProfile]) throw new Error('Unknown profile: ' + chosenProfile);
        const savedRef = writeEntityProfileRef(entityId, chosenProfile);
        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({ ok: true, profileRef: savedRef, globalOnly: true }));
        return;
      }

      if (!config) throw new Error('Missing config');
      const globalCfg = ctx.loadConfig();
      if (!globalCfg.profiles || typeof globalCfg.profiles !== 'object') globalCfg.profiles = {};
      if (!globalCfg.lastActive) globalCfg.lastActive = 'default-multi-llm';
      if (!globalCfg.profiles[globalCfg.lastActive]) globalCfg.profiles[globalCfg.lastActive] = {};

      const targetProfile = globalCfg.profiles[globalCfg.lastActive];
      const storedAspectConfig = targetProfile[normalizedProvider] || {};
      // mergeBase()
      // Purpose: helper wrapper used by this module's main flow.
      // mergeBase()
      // WHAT THIS DOES: mergeBase is a helper used by this module's main flow.
      // WHY IT EXISTS: it keeps repeated logic in one reusable place.
      // HOW TO USE IT: call mergeBase(...) where this helper behavior is needed.
      const mergeBase = (normalizedProvider === 'main' && targetProfile.apikey)
        ? {
            ...storedAspectConfig,
            apiKey: storedAspectConfig.apiKey || targetProfile.apikey.key || targetProfile.apikey.apiKey || ''
          }
        : storedAspectConfig;

      const mergedConfig = mergeKeysBack(config, mergeBase);
      const normalizedConfig = normalizeIncomingRuntimeConfig(mergedConfig);
      if (!normalizedConfig) throw new Error('Invalid provider config payload');

      // Elevate capabilities to profile level (canonical location for resolveCapabilities)
      if (normalizedConfig.capabilities) {
        targetProfile.capabilities = normalizedConfig.capabilities;
        delete normalizedConfig.capabilities;
      }

      targetProfile[normalizedProvider] = normalizedConfig;
      if (!targetProfile._activeTypes || typeof targetProfile._activeTypes !== 'object') targetProfile._activeTypes = {};
      targetProfile._activeTypes[normalizedProvider] = normalizedConfig.type;

      // Keep legacy main fields in sync for older clients.
      if (normalizedProvider === 'main') {
        targetProfile._activeType = normalizedConfig.type;
        if (normalizedConfig.type === 'openrouter') {
          targetProfile.apikey = {
            endpoint: normalizedConfig.endpoint,
            key: normalizedConfig.apiKey,
            model: normalizedConfig.model
          };
        } else if (normalizedConfig.type === 'ollama') {
          targetProfile.ollama = {
            url: normalizedConfig.endpoint,
            model: normalizedConfig.model
          };
        }
      }

      ctx.saveConfig(globalCfg);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, globalOnly: true, profileRef: globalCfg.lastActive }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ error: e.message }));
    }
  }
  // toAsciiHeaderValue()
  // WHAT THIS DOES: toAsciiHeaderValue is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call toAsciiHeaderValue(...) where this helper behavior is needed.
  function toAsciiHeaderValue(value) {
    if (typeof value !== 'string') return String(value);
    return value.replace(/[^\x20-\x7E]/g, '');
  }
  // sanitizeProxyResponseHeaders()
  // WHAT THIS DOES: sanitizeProxyResponseHeaders is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call sanitizeProxyResponseHeaders(...) where this helper behavior is needed.
  function sanitizeProxyResponseHeaders(upstream, apiHeaders) {
    const ct = upstream.headers.get('content-type') || 'application/json';
    return { ...apiHeaders, 'Content-Type': toAsciiHeaderValue(ct) };
  }

  async function postProxy(req, res, apiHeaders, readBody) {
    const ALLOWED_HOSTS = ['openrouter.ai', 'api.anthropic.com'];
    try {
      const raw = JSON.parse(await readBody(req));
      if (!raw.url) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ error: 'Missing url' })); return; }
      const parsed = new URL(raw.url);
      if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
        res.writeHead(403, apiHeaders); res.end(JSON.stringify({ error: 'Host not allowed: ' + parsed.hostname })); return;
      }
      const upstream = await fetch(raw.url, {
        method: raw.method || 'GET',
        headers: raw.headers || {},
        body: raw.body ? (typeof raw.body === 'string' ? raw.body : JSON.stringify(raw.body)) : undefined
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, sanitizeProxyResponseHeaders(upstream, apiHeaders));
      res.end(text);
    } catch (e) { res.writeHead(500, apiHeaders); res.end(JSON.stringify({ error: e.message })); }
  }
  // getSleepConfig()
  // WHAT THIS DOES: getSleepConfig reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getSleepConfig(...), then use the returned value in your next step.
  function getSleepConfig(req, res, apiHeaders) {
    try {
      const config = ctx.loadConfig();
      const sleepConfig = config.sleep || {};
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        config: {
          autoSleepEnabled: sleepConfig.autoSleepEnabled !== false,
          autoSleepThreshold: sleepConfig.autoSleepThreshold || 35000,
          sleepInterval: sleepConfig.sleepInterval || '0',
          activeHours: sleepConfig.activeHours || { start: '00:00', end: '24:00' },
          dreamDepth: sleepConfig.dreamDepth || 'normal',
          maxDreamCycles: sleepConfig.maxDreamCycles || 3,
          heartbeatEnabled: sleepConfig.heartbeatEnabled || false,
          heartbeatInterval: sleepConfig.heartbeatInterval || '30m',
          heartbeatPrompt: sleepConfig.heartbeatPrompt || '',
          heartbeatTarget: sleepConfig.heartbeatTarget || 'none',
          imageGenMode: sleepConfig.imageGenMode || 'off',
          imageApiEndpoint: sleepConfig.imageApiEndpoint || '',
          imageApiKey: sleepConfig.imageApiKey ? '••••••' : '',
          imageApiModel: sleepConfig.imageApiModel || ''
        }
      }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postSleepConfig(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const config = ctx.loadConfig();
      config.sleep = Object.assign(config.sleep || {}, body);
      ctx.saveConfig(config);
      if (ctx.dreamVisualizer && (body.imageGenMode !== undefined || body.imageApiEndpoint !== undefined || body.imageApiKey !== undefined || body.imageApiModel !== undefined)) {
        ctx.dreamVisualizer.setImageGenConfig({
          imageGenMode: config.sleep.imageGenMode || 'off',
          imageApiEndpoint: config.sleep.imageApiEndpoint || '',
          imageApiKey: config.sleep.imageApiKey || '',
          imageApiModel: config.sleep.imageApiModel || ''
        });
      }
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }
  // getWorkspaceConfig()
  // WHAT THIS DOES: getWorkspaceConfig reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getWorkspaceConfig(...), then use the returned value in your next step.
  function getWorkspaceConfig(req, res, apiHeaders) {
    const config = ctx.loadConfig();
    res.writeHead(200, apiHeaders);
    res.end(JSON.stringify({ ok: true, workspacePath: config.workspacePath || '' }));
  }

  async function postWorkspaceConfig(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const wsPath = (body.workspacePath || '').trim();
      if (wsPath && !fs.existsSync(wsPath)) {
        fs.mkdirSync(wsPath, { recursive: true });
      }
      const config = ctx.loadConfig();
      config.workspacePath = wsPath;
      ctx.saveConfig(config);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, workspacePath: wsPath }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }
  // resolveWsPath()
  // WHAT THIS DOES: Resolves workspace-relative path and blocks path traversal.
  // WHY IT EXISTS: Workspace APIs must not allow reads/writes outside configured root.
  // HOW TO USE IT: Call resolveWsPath(relPath) before list/read/write/delete operations.
  function resolveWsPath(relPath) {
    const config = ctx.loadConfig();
    const wsRoot = config.workspacePath;
    if (!wsRoot) return null;
    const resolved = path.resolve(wsRoot, relPath || '.');
    if (!resolved.startsWith(path.resolve(wsRoot))) return null;
    return resolved;
  }
  // getWorkspaceList()
  // WHAT THIS DOES: Lists files/directories for one workspace-relative directory path.
  // WHY IT EXISTS: Workspace browser needs a safe listing endpoint with file metadata.
  // HOW TO USE IT: Route GET /api/workspace/list to getWorkspaceList(req, res, apiHeaders, url).
  function getWorkspaceList(req, res, apiHeaders, url) {
    const relPath = url.searchParams.get('path') || '.';
    const dir = resolveWsPath(relPath);
    if (!dir) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: 'No workspace configured' }));
      return;
    }
    if (!fs.existsSync(dir)) {
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, files: [] }));
      return;
    }
    try {
      const entries = fs.readdirSync(dir).map(name => {
        try {
          const full = path.join(dir, name);
          const stat = fs.statSync(full);
          return { name, type: stat.isDirectory() ? 'directory' : 'file', size: stat.size };
        } catch { return { name, type: 'file', size: 0 }; }
      });
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, files: entries }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }
  // getWorkspaceRead()
  // WHAT THIS DOES: Reads one workspace file and returns its text content.
  // WHY IT EXISTS: Workspace editor needs direct file read endpoint with safety checks.
  // HOW TO USE IT: Route GET /api/workspace/read to getWorkspaceRead(req, res, apiHeaders, url).
  function getWorkspaceRead(req, res, apiHeaders, url) {
    const relPath = url.searchParams.get('path');
    if (!relPath) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'path required' })); return; }
    const filep = resolveWsPath(relPath);
    if (!filep) { res.writeHead(400, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'No workspace configured or path outside workspace' })); return; }
    if (!fs.existsSync(filep)) { res.writeHead(404, apiHeaders); res.end(JSON.stringify({ ok: false, error: 'File not found' })); return; }
    try {
      const content = fs.readFileSync(filep, 'utf-8');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, content, path: relPath }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postWorkspaceWrite(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const filep = resolveWsPath(body.path);
      if (!filep) throw new Error('No workspace configured or path outside workspace');
      const dir = path.dirname(filep);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filep, body.content || '', 'utf-8');
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postWorkspaceDelete(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const filep = resolveWsPath(body.path);
      if (!filep) throw new Error('No workspace configured or path outside workspace');
      if (fs.existsSync(filep)) fs.unlinkSync(filep);
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postSystemBackup(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const targetRoot = String(body.targetFolder || '').trim();
      if (!targetRoot) throw new Error('targetFolder is required');

      const resolvedTargetRoot = path.resolve(targetRoot);
      if (!fs.existsSync(resolvedTargetRoot)) fs.mkdirSync(resolvedTargetRoot, { recursive: true });

      const backupName = body.backupName
        ? String(body.backupName).trim().replace(/[<>:"/\\|?*]/g, '_')
        : `NekoCore-backup-${timestampTag()}`;
      const backupDir = path.join(resolvedTargetRoot, backupName || `NekoCore-backup-${timestampTag()}`);
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      copyPathIfExists(CONFIG_FILE, path.join(backupDir, 'Config', 'ma-config.json'));
      copyPathIfExists(SERVER_DATA_DIR, path.join(backupDir, 'server', 'data'));
      copyPathIfExists(ENTITIES_DIR, path.join(backupDir, 'entities'));
      copyPathIfExists(MEMORIES_DIR, path.join(backupDir, 'memories'));

      const manifest = {
        type: 'NekoCore-backup',
        createdAt: new Date().toISOString(),
        backupName: path.basename(backupDir),
        sourceRoot: PROJECT_ROOT,
        contents: [
          'Config/ma-config.json',
          'server/data/',
          'entities/',
          'memories/'
        ]
      };
      fs.writeFileSync(path.join(backupDir, BACKUP_MANIFEST), JSON.stringify(manifest, null, 2), 'utf8');

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, backupDir, manifest }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postSystemRestore(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const sourceFolder = String(body.sourceFolder || '').trim();
      if (!sourceFolder) throw new Error('sourceFolder is required');

      const backupDir = path.resolve(sourceFolder);
      if (!fs.existsSync(backupDir) || !fs.statSync(backupDir).isDirectory()) {
        throw new Error('Backup folder not found: ' + backupDir);
      }

      const manifestPath = path.join(backupDir, BACKUP_MANIFEST);
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (!isValidObject(manifest)) throw new Error('invalid manifest object');
        } catch {
          throw new Error('Backup manifest is invalid');
        }
      }

      const candidates = buildRestoreCandidates(backupDir);
      const hasAny = Object.values(candidates).some(pth => fs.existsSync(pth));
      if (!hasAny) {
        throw new Error('No restorable data found in backup folder');
      }

      const safetySnapshot = createSafetySnapshot();

      // Restore config
      if (fs.existsSync(candidates.configFile)) {
        if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
        fs.copyFileSync(candidates.configFile, CONFIG_FILE);
      }

      // Restore server data
      if (fs.existsSync(candidates.serverDataDir)) {
        removePathIfExists(SERVER_DATA_DIR);
        copyPathIfExists(candidates.serverDataDir, SERVER_DATA_DIR);
      }

      // Restore entities + memories
      if (fs.existsSync(candidates.entitiesDir)) {
        removePathIfExists(ENTITIES_DIR);
        copyPathIfExists(candidates.entitiesDir, ENTITIES_DIR);
      }
      if (fs.existsSync(candidates.memoriesDir)) {
        removePathIfExists(MEMORIES_DIR);
        copyPathIfExists(candidates.memoriesDir, MEMORIES_DIR);
      }

      // Refresh config caches if available
      try { ctx.refreshMaxTokensCache && ctx.refreshMaxTokensCache(); } catch (_) {}
      try { ctx.refreshTokenLimitsCache && ctx.refreshTokenLimitsCache(); } catch (_) {}

      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({
        ok: true,
        restoredFrom: backupDir,
        safetySnapshot,
        note: 'Restore complete. Reload UI and restart server if you need all in-memory state reset.'
      }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  async function postWebuiPresence(req, res, apiHeaders, readBody) {
    try {
      const body = JSON.parse(await readBody(req));
      const isOpen = body && body.isOpen !== false;
      const url = String((body && body.url) || '').trim() || undefined;
      if (typeof ctx.updateBrowserOpenState === 'function') {
        ctx.updateBrowserOpenState({ isOpen, url, source: 'webui-presence' });
      }
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify({ ok: true, isOpen }));
    } catch (e) {
      res.writeHead(400, apiHeaders);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  return { dispatch };
}

module.exports = createConfigRoutes;
