const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('step definitions module exposes ordered email step metadata', () => {
  const source = fs.readFileSync('data/step-definitions.js', 'utf8');
  const globalScope = {};

  const api = new Function('self', `${source}; return self.MultiPageStepDefinitions;`)(globalScope);
  const steps = api.getSteps();
  const phoneSteps = api.getSteps({ signupMethod: 'phone' });

  assert.equal(Array.isArray(steps), true);
  assert.equal(steps.length, 11);
  assert.equal(steps.every((step) => step.flowId === 'openai'), true);
  assert.deepStrictEqual(
    steps.map((step) => step.order),
    steps.map((step) => step.order).slice().sort((left, right) => left - right)
  );
  assert.deepStrictEqual(
    steps.map((step) => step.key),
    [
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
    ]
  );
  assert.equal(steps[0].title, '打开 ChatGPT 官网');
  assert.equal(steps[5].title, '等待注册成功');
  assert.deepStrictEqual(phoneSteps, steps);

  assert.deepStrictEqual(api.getStepIds(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(api.getLastStepId(), 11);
  assert.deepStrictEqual(api.getStepIds({ signupMethod: 'phone' }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(api.getLastStepId({ signupMethod: 'phone' }), 11);

  assert.equal(api.hasFlow('openai'), true);
  assert.equal(api.hasFlow('site-a'), false);
  assert.deepStrictEqual(api.getRegisteredFlowIds(), ['openai']);
  assert.deepStrictEqual(api.getSteps({ activeFlowId: 'site-a' }), []);
  assert.equal(api.getStepById(2, { activeFlowId: 'site-a' }), null);
});

test('sidepanel html loads shared step definitions before sidepanel bootstrap', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  const definitionsIndex = html.indexOf('<script src="../data/step-definitions.js"></script>');
  const sidepanelIndex = html.indexOf('<script src="sidepanel.js"></script>');

  assert.notEqual(definitionsIndex, -1);
  assert.notEqual(sidepanelIndex, -1);
  assert.ok(definitionsIndex < sidepanelIndex);
});

test('sidepanel html no longer exposes plus checkout settings', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');

  assert.doesNotMatch(html, /id="input-plus-mode-enabled"/);
  assert.doesNotMatch(html, /id="select-plus-payment-method"/);
  assert.doesNotMatch(html, /id="select-paypal-account"/);
  assert.doesNotMatch(html, /id="btn-add-paypal-account"/);
  assert.doesNotMatch(html, /id="input-gopay-phone"/);
  assert.doesNotMatch(html, /id="input-gopay-otp"/);
  assert.doesNotMatch(html, /id="input-gopay-pin"/);
  assert.doesNotMatch(html, /id="btn-gpc-card-key-purchase"/);
  assert.doesNotMatch(html, /id="input-gpc-helper-api"/);
  assert.doesNotMatch(html, /id="input-gpc-helper-card-key"/);
  assert.doesNotMatch(html, /id="select-gpc-helper-phone-mode"/);
  assert.doesNotMatch(html, /id="btn-gpc-helper-balance"/);
  assert.doesNotMatch(html, /id="input-gpc-helper-phone"/);
  assert.doesNotMatch(html, /id="select-gpc-helper-otp-channel"/);
  assert.doesNotMatch(html, /id="input-gpc-helper-local-sms-enabled"/);
  assert.doesNotMatch(html, /id="input-gpc-helper-local-sms-url"/);
  assert.doesNotMatch(html, /id="input-gpc-helper-pin"/);
  assert.match(html, /id="shared-form-modal"/);
});
