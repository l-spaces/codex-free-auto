const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports node registry and wires OpenAI executors only', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  const removedFlowPathPattern = new RegExp(`flows\\/(${['k', 'iro'].join('')}|${['g', 'rok'].join('')})\\/`);
  const removedNodePattern = new RegExp(`'(${['k', 'iro'].join('')}|${['g', 'rok'].join('')})-`);

  assert.match(source, /core\/flow-kernel\/step-registry\.js/);
  assert.match(source, /data\/step-definitions\.js/);
  assert.match(source, /core\/flow-kernel\/workflow-engine\.js/);
  assert.match(source, /MultiPageStepDefinitions\?\.getNodes/);
  assert.match(source, /buildNodeRegistry\(definitions/);
  assert.match(source, /const stepRegistryCache = new Map\(\);/);
  assert.match(source, /const definitions = getNodeDefinitionsForState\(state\);/);
  assert.match(source, /stepRegistryCache\.set\(cacheKey, buildStepRegistry\(definitions\)\)/);

  assert.doesNotMatch(source, removedFlowPathPattern);
  assert.doesNotMatch(source, removedNodePattern);
  assert.match(source, /'open-chatgpt': \(\) => step1Executor\.executeStep1\(\)/);
  assert.match(source, /'submit-signup-email': \(state\) => step2Executor\.executeStep2\(state\)/);
  assert.match(source, /'fetch-signup-code': \(state\) => step4Executor\.executeStep4\(state\)/);
  assert.match(source, /'platform-verify': \(state\) => executeStep10\(state\)/);
});
