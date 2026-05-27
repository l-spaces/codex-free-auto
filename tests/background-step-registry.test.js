const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports node registry and shared workflow definitions', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /background\/steps\/registry\.js/);
  assert.match(source, /data\/step-definitions\.js/);
  assert.match(source, /background\/workflow-engine\.js/);
  assert.match(source, /MultiPageStepDefinitions\?\.getNodes/);
  assert.match(source, /getStepRegistryForState\(state\)/);
  assert.match(source, /buildNodeRegistry\(definitions/);
  assert.match(source, /normalStepRegistry/);
  assert.match(source, /activeStepRegistry\.executeNode\(normalizedNodeId,\s*\{/);
  assert.doesNotMatch(source, /normalPhoneStepRegistry/);
  assert.doesNotMatch(source, /bind-email/);
});
