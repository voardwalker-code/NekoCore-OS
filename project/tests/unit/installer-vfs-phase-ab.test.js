'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');
const entityPaths = require('../../server/entityPaths');
const bootstrap = require('../../server/brain/nekocore/bootstrap');
const audit = require('../../server/brain/nekocore/audit');

function makeReq(method, body) {
  return { method, _body: body ? JSON.stringify(body) : '' };
}

function makeRes() {
  return {
    status: null,
    headers: null,
    body: '',
    writeHead(code, headers) {
      this.status = code;
      this.headers = headers;
    },
    end(payload) {
      this.body = payload || '';
    }
  };
}

async function readBody(req) {
  return req._body || '';
}

async function withIsolatedNekoRoutes(run) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nk-vfs-ab-'));
  const entitiesDir = path.join(tmpRoot, 'entities');
  const entityDir = path.join(entitiesDir, 'entity_nekocore');
  const entityFile = path.join(entityDir, 'entity.json');
  fs.mkdirSync(entityDir, { recursive: true });

  const oldEntitiesDir = entityPaths.ENTITIES_DIR;
  const oldEnsureSystemEntity = bootstrap.ensureSystemEntity;
  const oldAppendAuditRecord = audit.appendAuditRecord;
  const oldCwd = process.cwd();

  entityPaths.ENTITIES_DIR = entitiesDir;
  bootstrap.ensureSystemEntity = () => false;
  audit.appendAuditRecord = () => {};

  const savedConfig = { workspacePath: '' };

  try {
    fs.writeFileSync(entityFile, JSON.stringify({
      id: 'nekocore',
      name: 'NekoCore',
      workspacePath: '',
      workspaceScope: 'workspace-root',
      skillApprovalRequired: true
    }, null, 2), 'utf8');

    process.chdir(projectRoot);
    delete require.cache[require.resolve('../../server/routes/nekocore-routes')];
    const createNekoCoreRoutes = require('../../server/routes/nekocore-routes');
    const routes = createNekoCoreRoutes({
      fs,
      path,
      loadConfig: () => ({ ...savedConfig }),
      saveConfig: (cfg) => Object.assign(savedConfig, cfg)
    });

    await run({ routes, entityFile, savedConfig });
  } finally {
    process.chdir(oldCwd);
    entityPaths.ENTITIES_DIR = oldEntitiesDir;
    bootstrap.ensureSystemEntity = oldEnsureSystemEntity;
    audit.appendAuditRecord = oldAppendAuditRecord;
    delete require.cache[require.resolve('../../server/routes/nekocore-routes')];
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

test('A-0 guard: workspace app manifest entry remains present', () => {
  const manifestPath = path.join(projectRoot, 'client', 'js', 'apps', 'app-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const workspaceEntry = manifest.apps.find((app) => app.tabId === 'workspace');

  assert.ok(workspaceEntry, 'workspace tab entry must exist in app manifest');
  assert.equal(workspaceEntry.class, 'optional');
});

test('A-0 guard: workspace tab HTML keeps C: root crumb entrypoint', () => {
  const htmlPath = path.join(projectRoot, 'client', 'apps', 'non-core', 'core', 'tab-workspace.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /onclick="feNavigate\('\/'\)">C:/, 'workspace tab root crumb should render as C:');
});

test('B-1 default workspace auto-config targets project root', async () => {
  await withIsolatedNekoRoutes(async ({ routes, entityFile, savedConfig }) => {
    const req = makeReq('POST', { autoDefault: true });
    const res = makeRes();
    const url = new URL('http://localhost/api/nekocore/tooling/workspace');
    const apiHeaders = { 'Content-Type': 'application/json' };

    const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
    assert.equal(handled, true);
    assert.equal(res.status, 200);

    const payload = JSON.parse(res.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.workspacePath, projectRoot);
    assert.equal(payload.workspaceScope, 'workspace-root');

    const entity = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
    assert.equal(entity.workspacePath, projectRoot);
    assert.equal(savedConfig.workspacePath, projectRoot);
  });
});

test('B-1 auto-default preserves an already configured workspace path', async () => {
  await withIsolatedNekoRoutes(async ({ routes, entityFile }) => {
    const existingPath = path.join(projectRoot, 'workspace');
    const seed = JSON.parse(fs.readFileSync(entityFile, 'utf8'));
    seed.workspacePath = existingPath;
    fs.writeFileSync(entityFile, JSON.stringify(seed, null, 2), 'utf8');

    const req = makeReq('POST', { autoDefault: true });
    const res = makeRes();
    const url = new URL('http://localhost/api/nekocore/tooling/workspace');
    const apiHeaders = { 'Content-Type': 'application/json' };

    const handled = await routes.dispatch(req, res, url, apiHeaders, readBody);
    assert.equal(handled, true);
    assert.equal(res.status, 200);

    const payload = JSON.parse(res.body);
    assert.equal(payload.workspacePath, existingPath);
  });
});

test('A-1 and A-2 contract schema artifacts exist', () => {
  const installerSchemaPath = path.join(projectRoot, 'server', 'contracts', 'installer-uninstaller-contract.schema.json');
  const vfsSchemaPath = path.join(projectRoot, 'server', 'contracts', 'vfs-drive-mapping.contract.schema.json');
  const installerExamplePath = path.join(projectRoot, 'server', 'contracts', 'installer-uninstaller.contract.example.json');
  const vfsExamplePath = path.join(projectRoot, 'server', 'contracts', 'vfs-drive-mapping.contract.example.json');

  assert.ok(fs.existsSync(installerSchemaPath), 'installer/uninstaller contract schema must exist');
  assert.ok(fs.existsSync(vfsSchemaPath), 'vfs mapping contract schema must exist');
  assert.ok(fs.existsSync(installerExamplePath), 'installer/uninstaller contract example must exist');
  assert.ok(fs.existsSync(vfsExamplePath), 'vfs mapping contract example must exist');

  const installerSchema = JSON.parse(fs.readFileSync(installerSchemaPath, 'utf8'));
  const vfsSchema = JSON.parse(fs.readFileSync(vfsSchemaPath, 'utf8'));
  const installerExample = JSON.parse(fs.readFileSync(installerExamplePath, 'utf8'));
  const vfsExample = JSON.parse(fs.readFileSync(vfsExamplePath, 'utf8'));

  assert.equal(installerSchema.title, 'Installer/Uninstaller Contract');
  assert.equal(vfsSchema.title, 'VFS Drive Mapping Contract');
  assert.equal(vfsSchema.properties.defaultDrive.const, 'C:');
  assert.equal(installerExample.appId, 'workspace');
  assert.equal(vfsExample.defaultDrive, 'C:');

  assert.equal(installerSchema.properties.markerBoundary.properties.openMarker.const, '//Open Next json entry id');
  assert.equal(installerSchema.properties.markerBoundary.properties.closeMarker.const, '//Close "');
  assert.equal(installerSchema.properties.markerBoundary.properties.requireBlankLineBetween.const, true);
  assert.ok(installerSchema.$defs.action.properties.type.enum.includes('create-file'));
  assert.ok(installerSchema.$defs.action.properties.type.enum.includes('delete-file'));
  assert.equal(installerSchema.properties.transactionPolicy.properties.onMissingMarkerBoundary.enum[0], 'auto-rollback-error');
  assert.equal(installerSchema.properties.loggingPolicy.properties.logEntryId.const, true);
  assert.equal(installerSchema.properties.loggingPolicy.properties.logWrittenBlock.const, true);
  assert.equal(installerSchema.properties.loggingPolicy.properties.logCloseMarker.const, true);
  assert.equal(installerSchema.properties.loggingPolicy.properties.logJsonEntryId.const, true);

  assert.equal(installerExample.markerBoundary.openMarker, '//Open Next json entry id');
  assert.equal(installerExample.markerBoundary.closeMarker, '//Close "');
  assert.equal(installerExample.markerBoundary.requireBlankLineBetween, true);
  assert.equal(installerExample.transactionPolicy.onMissingMarkerBoundary, 'auto-rollback-error');
  assert.equal(installerExample.loggingPolicy.logEntryId, true);
  assert.equal(installerExample.loggingPolicy.logWrittenBlock, true);
  assert.equal(installerExample.loggingPolicy.logCloseMarker, true);
  assert.equal(installerExample.loggingPolicy.logJsonEntryId, true);
});

test('cleanup guard: installer marker boundaries remain present in shell registration files', () => {
  const appJsPath = path.join(projectRoot, 'client', 'js', 'app.js');
  const loaderPath = path.join(projectRoot, 'client', 'js', 'apps', 'non-core-html-loader.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const loaderJs = fs.readFileSync(loaderPath, 'utf8');

  const openMarker = '//Open Next json entry id';
  const closeMarker = '//Close "';

  assert.match(appJs, /\/\/Open Next json entry id/, 'app.js must preserve installer open marker');
  assert.match(appJs, /\/\/Close "/, 'app.js must preserve installer close marker');
  assert.match(loaderJs, /\/\/Open Next json entry id/, 'non-core-html-loader.js must preserve installer open marker');
  assert.match(loaderJs, /\/\/Close "/, 'non-core-html-loader.js must preserve installer close marker');

  const emptyBoundaryPattern = /\/\/Open Next json entry id\r?\n\r?\n\/\/Close "/;
  assert.match(appJs, emptyBoundaryPattern, 'app.js must preserve at least one empty installer safe slot');
  assert.match(loaderJs, emptyBoundaryPattern, 'non-core-html-loader.js must preserve at least one empty installer safe slot');
});

test('cleanup guard: non-core loader preserves dynamic payload script execution path', () => {
  const loaderPath = path.join(projectRoot, 'client', 'js', 'apps', 'non-core-html-loader.js');
  const loaderJs = fs.readFileSync(loaderPath, 'utf8');

  assert.match(loaderJs, /function runMountedScripts\(root, htmlSource\)/, 'non-core-html-loader.js must keep mounted script execution helper');
  assert.match(loaderJs, /probe\.innerHTML = htmlSource;/, 'non-core-html-loader.js must parse fetched HTML source for sibling script tags');
  assert.match(loaderJs, /probe\.querySelectorAll\('script'\)/, 'non-core-html-loader.js must scan raw HTML for script tags');
  assert.match(loaderJs, /\(0, eval\)\(code\);/, 'non-core-html-loader.js must preserve global-scope inline script execution for mounted payloads');

  const mountCalls = loaderJs.match(/runMountedScripts\(getMountedTabRoot\(tabId\), html\);/g) || [];
  assert.ok(mountCalls.length >= 4, 'non-core-html-loader.js must execute mounted payload scripts in every mount path');
});
