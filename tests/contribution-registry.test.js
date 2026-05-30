const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readFlowRegistryBundle } = require('./helpers/script-bundles.js');

const flowRegistrySource = readFlowRegistryBundle();
const contributionRegistrySource = fs.readFileSync('shared/contribution-registry.js', 'utf8');

function loadApi() {
  const scope = {};
  return new Function(
    'self',
    `${flowRegistrySource}; ${contributionRegistrySource}; return self.MultiPageContributionRegistry;`
  )(scope);
}

test('contribution registry exposes only OpenAI adapters', () => {
  const api = loadApi();

  assert.deepEqual(api.getContributionAdapterIds('openai'), [
    'openai-oauth',
    'openai-codex-file',
    'openai-sub2api-file',
  ]);
  assert.equal(api.getDefaultContributionAdapterId('openai'), 'openai-oauth');
});

test('contribution registry normalizes removed flow ids back to OpenAI', () => {
  const api = loadApi();

  for (const flowId of ['legacy-flow', 'codex']) {
    assert.equal(api.normalizeFlowId(flowId), 'openai');
    assert.deepEqual(api.getContributionAdapterIds(flowId), [
      'openai-oauth',
      'openai-codex-file',
      'openai-sub2api-file',
    ]);
  }
  assert.deepEqual(api.getPublishedContributionFlowIds(['openai', 'legacy-flow']), ['openai']);
  assert.equal(api.assertPublishedFlowsHaveContributionAdapters(['openai', 'legacy-flow']), true);
});
