const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readStepDefinitionsBundle } = require('./helpers/script-bundles.js');


test('Plus no-payment mode removes only payment chain nodes', () => {
  const globalScope = {};
  const api = new Function('self', `${readStepDefinitionsBundle()}; return self.MultiPageStepDefinitions;`)(globalScope);
  const paymentChainKeys = [
    'plus-checkout-create',
    'plus-checkout-billing',
    'paypal-approve',
    'plus-checkout-return',
    'paypal-hosted-email',
    'paypal-hosted-card',
    'paypal-hosted-create-account',
    'paypal-hosted-review',
    'gopay-subscription-confirm',
  ];

  const oauthSteps = api.getSteps({ plusModeEnabled: true, plusPaymentMethod: 'none' });
  const oauthNodes = api.getNodes({ plusModeEnabled: true, plusPaymentMethod: 'none' });
  const oauthStepKeys = oauthSteps.map((step) => step.key);

  assert.deepStrictEqual(oauthStepKeys, [
    'open-chatgpt',
    'submit-signup-email',
    'fill-password',
    'fetch-signup-code',
    'fill-profile',
    'wait-registration-success',
    'oauth-login',
    'fetch-login-code',
    'post-login-phone-verification',
    'confirm-oauth',
    'platform-verify',
  ]);
  paymentChainKeys.forEach((key) => {
    assert.equal(oauthStepKeys.includes(key), false, `no-payment OAuth should not keep ${key}`);
    assert.equal(oauthNodes.some((node) => node.nodeId === key), false, `no-payment OAuth nodes should not keep ${key}`);
  });
  assert.deepStrictEqual(api.getStepIds({ plusModeEnabled: true, plusPaymentMethod: 'none' }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(api.getPlusPaymentStepTitle({ plusModeEnabled: true, plusPaymentMethod: 'none' }), '');
  assert.deepStrictEqual(
    oauthNodes.find((node) => node.nodeId === 'fill-profile')?.next,
    ['wait-registration-success']
  );
  assert.deepStrictEqual(
    oauthNodes.find((node) => node.nodeId === 'wait-registration-success')?.next,
    ['oauth-login']
  );

  const sub2apiSteps = api.getSteps({
    plusModeEnabled: true,
    plusPaymentMethod: 'none',
    plusAccountAccessStrategy: 'sub2api_codex_session',
  });
  const sub2apiNodes = api.getNodes({
    plusModeEnabled: true,
    plusPaymentMethod: 'none',
    plusAccountAccessStrategy: 'sub2api_codex_session',
  });
  assert.deepStrictEqual(sub2apiSteps.map((step) => step.key), [
    'open-chatgpt',
    'submit-signup-email',
    'fill-password',
    'fetch-signup-code',
    'fill-profile',
    'wait-registration-success',
    'sub2api-session-import',
  ]);
  paymentChainKeys.forEach((key) => {
    assert.equal(sub2apiSteps.some((step) => step.key === key), false, `no-payment SUB2API should not keep ${key}`);
  });
  assert.deepStrictEqual(api.getStepIds({
    plusModeEnabled: true,
    plusPaymentMethod: 'none',
    plusAccountAccessStrategy: 'sub2api_codex_session',
  }), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sub2apiNodes.at(-1)?.nodeId, 'sub2api-session-import');
  assert.deepStrictEqual(sub2apiNodes.find((node) => node.nodeId === 'fill-profile')?.next, ['wait-registration-success']);
  assert.deepStrictEqual(sub2apiNodes.find((node) => node.nodeId === 'wait-registration-success')?.next, ['sub2api-session-import']);

  const cpaSteps = api.getSteps({
    plusModeEnabled: true,
    plusPaymentMethod: 'none',
    plusAccountAccessStrategy: 'cpa_codex_session',
  });
  const cpaNodes = api.getNodes({
    plusModeEnabled: true,
    plusPaymentMethod: 'none',
    plusAccountAccessStrategy: 'cpa_codex_session',
  });
  assert.deepStrictEqual(cpaSteps.map((step) => step.key), [
    'open-chatgpt',
    'submit-signup-email',
    'fill-password',
    'fetch-signup-code',
    'fill-profile',
    'wait-registration-success',
    'cpa-session-import',
  ]);
  paymentChainKeys.forEach((key) => {
    assert.equal(cpaSteps.some((step) => step.key === key), false, `no-payment CPA should not keep ${key}`);
  });
  assert.deepStrictEqual(api.getStepIds({
    plusModeEnabled: true,
    plusPaymentMethod: 'none',
    plusAccountAccessStrategy: 'cpa_codex_session',
  }), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(cpaNodes.at(-1)?.nodeId, 'cpa-session-import');
  assert.deepStrictEqual(cpaNodes.find((node) => node.nodeId === 'fill-profile')?.next, ['wait-registration-success']);
  assert.deepStrictEqual(cpaNodes.find((node) => node.nodeId === 'wait-registration-success')?.next, ['cpa-session-import']);
});

test('OpenAI OAuth workflow removes post-login phone verification when phone verification is disabled', () => {
  const globalScope = {};
  const api = new Function('self', `${readStepDefinitionsBundle()}; return self.MultiPageStepDefinitions;`)(globalScope);

  [
    { label: 'normal', options: { phoneVerificationEnabled: false } },
    { label: 'plus paypal', options: { plusModeEnabled: true, phoneVerificationEnabled: false } },
    { label: 'plus gopay', options: { plusModeEnabled: true, plusPaymentMethod: 'gopay', phoneVerificationEnabled: false } },
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

test('Plus session strategy swaps the OAuth tail for a single SUB2API import node', () => {
  const globalScope = {};
  const api = new Function('self', `${readStepDefinitionsBundle()}; return self.MultiPageStepDefinitions;`)(globalScope);
  const forbiddenTailKeys = [
    'oauth-login',
    'fetch-login-code',
    'post-login-phone-verification',
    'confirm-oauth',
    'platform-verify',
  ];

  [
    {
      label: 'paypal',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'paypal',
        plusAccountAccessStrategy: 'sub2api_codex_session',
      },
      previousNodeId: 'plus-checkout-return',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    {
      label: 'paypal-hosted',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'paypal-hosted',
        plusAccountAccessStrategy: 'sub2api_codex_session',
      },
      previousNodeId: 'paypal-hosted-review',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
    {
      label: 'gopay',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'gopay',
        plusAccountAccessStrategy: 'sub2api_codex_session',
      },
      previousNodeId: 'gopay-subscription-confirm',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    {
      label: 'gpc-helper',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'gpc-helper',
        plusAccountAccessStrategy: 'sub2api_codex_session',
      },
      previousNodeId: 'plus-checkout-billing',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
  ].forEach(({ label, options, previousNodeId, expectedStepIds }) => {
    const steps = api.getSteps(options);
    const nodes = api.getNodes(options);
    const stepKeys = steps.map((step) => step.key);
    const nodeIds = nodes.map((node) => node.nodeId);
    const previousNode = nodes.find((node) => node.nodeId === previousNodeId);
    const waitNode = nodes.find((node) => node.nodeId === 'wait-registration-success');
    const sessionImportNode = nodes.find((node) => node.nodeId === 'sub2api-session-import');

    assert.equal(stepKeys.at(-1), 'sub2api-session-import', `${label} should end with session import`);
    assert.equal(nodeIds.at(-1), 'sub2api-session-import', `${label} node order should end with session import`);
    forbiddenTailKeys.forEach((key) => {
      assert.equal(stepKeys.includes(key), false, `${label} should not keep ${key} in session mode`);
      assert.equal(nodeIds.includes(key), false, `${label} nodes should not keep ${key} in session mode`);
    });
    assert.deepStrictEqual(api.getStepIds(options), expectedStepIds, `${label} step ids should follow the new tail`);
    assert.equal(api.getLastStepId(options), expectedStepIds.at(-1), `${label} last step id should match session import`);
    assert.deepStrictEqual(waitNode?.next, ['plus-checkout-create'], `${label} wait node should link to checkout chain`);
    assert.deepStrictEqual(previousNode?.next, ['sub2api-session-import'], `${label} previous node should link to session import`);
    assert.deepStrictEqual(sessionImportNode?.next, [], `${label} session import should be terminal`);
  });
});

test('Plus phone signup never switches to SUB2API session tail even if the requested strategy is session import', () => {
  const globalScope = {};
  const api = new Function('self', `${readStepDefinitionsBundle()}; return self.MultiPageStepDefinitions;`)(globalScope);
  const steps = api.getSteps({
    plusModeEnabled: true,
    plusPaymentMethod: 'paypal',
    signupMethod: 'phone',
    plusAccountAccessStrategy: 'sub2api_codex_session',
  });
  const stepKeys = steps.map((step) => step.key);

  assert.equal(stepKeys.includes('sub2api-session-import'), false);
  assert.equal(stepKeys.includes('oauth-login'), true);
  assert.equal(stepKeys.includes('platform-verify'), true);
});

test('Plus session strategy swaps the OAuth tail for a single CPA import node', () => {
  const globalScope = {};
  const api = new Function('self', `${readStepDefinitionsBundle()}; return self.MultiPageStepDefinitions;`)(globalScope);
  const forbiddenTailKeys = [
    'oauth-login',
    'fetch-login-code',
    'post-login-phone-verification',
    'confirm-oauth',
    'platform-verify',
  ];

  [
    {
      label: 'paypal',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'paypal',
        plusAccountAccessStrategy: 'cpa_codex_session',
      },
      previousNodeId: 'plus-checkout-return',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    {
      label: 'paypal-hosted',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'paypal-hosted',
        plusAccountAccessStrategy: 'cpa_codex_session',
      },
      previousNodeId: 'paypal-hosted-review',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
    {
      label: 'gopay',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'gopay',
        plusAccountAccessStrategy: 'cpa_codex_session',
      },
      previousNodeId: 'gopay-subscription-confirm',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    {
      label: 'gpc-helper',
      options: {
        plusModeEnabled: true,
        plusPaymentMethod: 'gpc-helper',
        plusAccountAccessStrategy: 'cpa_codex_session',
      },
      previousNodeId: 'plus-checkout-billing',
      expectedStepIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
  ].forEach(({ label, options, previousNodeId, expectedStepIds }) => {
    const steps = api.getSteps(options);
    const nodes = api.getNodes(options);
    const stepKeys = steps.map((step) => step.key);
    const nodeIds = nodes.map((node) => node.nodeId);
    const previousNode = nodes.find((node) => node.nodeId === previousNodeId);
    const waitNode = nodes.find((node) => node.nodeId === 'wait-registration-success');
    const sessionImportNode = nodes.find((node) => node.nodeId === 'cpa-session-import');

    assert.equal(stepKeys.at(-1), 'cpa-session-import', `${label} should end with CPA session import`);
    assert.equal(nodeIds.at(-1), 'cpa-session-import', `${label} node order should end with CPA session import`);
    forbiddenTailKeys.forEach((key) => {
      assert.equal(stepKeys.includes(key), false, `${label} should not keep ${key} in CPA session mode`);
      assert.equal(nodeIds.includes(key), false, `${label} nodes should not keep ${key} in CPA session mode`);
    });
    assert.deepStrictEqual(api.getStepIds(options), expectedStepIds, `${label} step ids should follow the CPA tail`);
    assert.equal(api.getLastStepId(options), expectedStepIds.at(-1), `${label} last step id should match CPA session import`);
    assert.deepStrictEqual(waitNode?.next, ['plus-checkout-create'], `${label} wait node should link to checkout chain`);
    assert.deepStrictEqual(previousNode?.next, ['cpa-session-import'], `${label} previous node should link to CPA session import`);
    assert.deepStrictEqual(sessionImportNode?.next, [], `${label} CPA session import should be terminal`);
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

test('sidepanel html exposes Plus mode, PayPal, and GoPay settings', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  assert.match(html, /id="input-plus-mode-enabled"/);
  assert.match(html, /id="select-plus-payment-method"/);
  assert.match(html, /<option value="none">无需支付<\/option>/);
  assert.match(html, /id="select-paypal-account"/);
  assert.match(html, /id="btn-add-paypal-account"/);
  assert.match(html, /id="input-gopay-phone"/);
  assert.match(html, /id="input-gopay-otp"/);
  assert.match(html, /id="input-gopay-pin"/);
  assert.match(html, /<option value="gpc-helper">GPC<\/option>/);
  assert.match(html, /id="btn-gpc-card-key-purchase"/);
  assert.match(html, />购买卡密</);
  assert.match(html, /GPC API/);
  assert.match(html, /id="input-gpc-helper-api"/);
  assert.match(html, /id="btn-gpc-helper-convert-api-key"/);
  assert.match(html, />转换 API Key</);
  assert.match(html, /GPC API Key/);
  assert.match(html, /id="input-gpc-helper-card-key"/);
  assert.match(html, /GPC 模式/);
  assert.match(html, /id="select-gpc-helper-phone-mode"/);
  assert.match(html, /<option value="auto">自动模式<\/option>/);
  assert.match(html, /id="btn-gpc-helper-balance"/);
  assert.match(html, /id="input-gpc-helper-phone"/);
  assert.match(html, /id="select-gpc-helper-otp-channel"/);
  assert.match(html, /id="input-gpc-helper-local-sms-enabled"/);
  assert.match(html, /id="input-gpc-helper-local-sms-url"/);
  assert.match(html, /id="input-gpc-helper-pin"/);
  assert.match(html, /id="shared-form-modal"/);
});
