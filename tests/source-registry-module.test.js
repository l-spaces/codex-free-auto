const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readSourceRegistryBundle } = require('./helpers/script-bundles.js');

function loadSourceRegistry() {
  const globalScope = {};
  new Function('self', `${readSourceRegistryBundle()}; return self;`)(globalScope);
  return globalScope.MultiPageSourceRegistry.createSourceRegistry();
}

test('background imports shared source registry module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /core\/flow-kernel\/flow-registry\.js/);
  assert.match(source, /core\/flow-kernel\/settings-schema\.js/);
  assert.match(source, /core\/flow-kernel\/source-registry\.js/);
});

test('manifest loads shared source registry before content utils in static bundles', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  for (const entry of manifest.content_scripts || []) {
    const scripts = Array.isArray(entry.js) ? entry.js : [];
    if (!scripts.includes('content/utils.js')) continue;
    assert.ok(scripts.includes('core/flow-kernel/source-registry.js'));
    assert.ok(
      scripts.indexOf('core/flow-kernel/source-registry.js') < scripts.indexOf('content/utils.js'),
      'core/flow-kernel/source-registry.js must load before content/utils.js'
    );
  }
});

test('manifest loads only OpenAI flow definition in static bundles', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  for (const entry of manifest.content_scripts || []) {
    const scripts = Array.isArray(entry.js) ? entry.js : [];
    if (!scripts.includes('flows/index.js')) continue;
    assert.ok(scripts.includes('flows/openai/index.js'));
    assert.ok(
      scripts.indexOf('flows/openai/index.js') < scripts.indexOf('flows/index.js'),
      'OpenAI definition must load before flows/index.js'
    );
  }
});

test('shared source registry exposes canonical OpenAI sources and drivers only', () => {
  const registry = loadSourceRegistry();

  assert.equal(registry.resolveCanonicalSource('openai-auth'), 'openai-auth');
  assert.deepEqual(registry.getSourceKeys('openai-auth'), ['openai-auth']);
  assert.equal(registry.resolveCanonicalSource('signup-page'), 'signup-page');
  assert.equal(registry.getSourceLabel('openai-auth'), '认证页');

  assert.equal(
    registry.detectSourceFromLocation({
      url: 'https://auth.openai.com/create-account',
      hostname: 'auth.openai.com',
    }),
    'openai-auth'
  );
  assert.equal(
    registry.detectSourceFromLocation({
      url: 'https://example.com/',
      hostname: 'example.com',
    }),
    'unknown-source'
  );

  assert.equal(registry.shouldReportReadyForFrame('mail-163', true), false);
  assert.equal(registry.getCleanupOwnerSource('oauth-localhost-callback'), 'openai-auth');

  assert.equal(registry.driverAcceptsCommand('openai-auth', 'submit-signup-email'), true);
  assert.equal(registry.driverAcceptsCommand('content/platform-panel', 'platform-verify'), true);
  assert.equal(registry.driverAcceptsCommand('openai-auth', 'platform-verify'), false);
});
