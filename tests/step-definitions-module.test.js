const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readStepDefinitionsBundle } = require('./helpers/script-bundles.js');

function createStepDefinitionsApi() {
  const globalScope = {};
  return new Function('self', `${readStepDefinitionsBundle()}; return self.MultiPageStepDefinitions;`)(globalScope);
}

test('OpenAI OAuth workflow removes post-login phone verification when phone verification is disabled', () => {
  const api = createStepDefinitionsApi();

  [
    { label: 'normal', options: { phoneVerificationEnabled: false } },
    { label: 'phone relogin', options: { signupMethod: 'phone', phoneSignupReloginAfterBindEmailEnabled: true, phoneVerificationEnabled: false } },
  ].forEach(({ label, options }) => {
    const steps = api.getSteps(options);
    const nodes = api.getNodes(options);
    const keys = steps.map((step) => step.key);
    const nodeIds = nodes.map((node) => node.nodeId);
    const expectedNextAfterLoginCode = keys.includes('bind-email') ? 'bind-email' : 'confirm-oauth';

    assert.equal(keys.includes('post-login-phone-verification'), false, `${label} should hide post-login phone step`);
    assert.equal(keys.includes('post-bound-email-phone-verification'), false, `${label} should hide bound-email phone step`);
    assert.equal(nodeIds.includes('post-login-phone-verification'), false, `${label} nodes should hide post-login phone step`);
    assert.equal(nodeIds.includes('post-bound-email-phone-verification'), false, `${label} nodes should hide bound-email phone step`);
    assert.deepStrictEqual(
      nodes.find((node) => node.nodeId === 'fetch-login-code')?.next,
      [expectedNextAfterLoginCode],
      `${label} fetch-login-code should link to the next non-phone node`
    );
  });
});

test('sidepanel html loads shared step definitions before sidepanel bootstrap', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  const definitionsIndex = html.indexOf('<script src="../data/step-definitions.js"></script>');
  const sidepanelIndex = html.indexOf('<script src="sidepanel.js"></script>');

  assert.notEqual(definitionsIndex, -1);
  assert.notEqual(sidepanelIndex, -1);
  assert.ok(definitionsIndex < sidepanelIndex);
});
