const test = require('node:test');
const assert = require('node:assert/strict');
const { readFlowCapabilitiesBundle } = require('./helpers/script-bundles.js');

const source = readFlowCapabilitiesBundle();

function loadApi() {
  const scope = {};
  return new Function('self', `${source}; return self.MultiPageFlowCapabilities;`)(scope);
}

test('flow capability registry keeps OpenAI phone signup available only when runtime locks allow it', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const enabledState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'cpa',
      phoneVerificationEnabled: true,
      accountContributionEnabled: false,
      signupMethod: 'phone',
    },
  });

  assert.equal(enabledState.canUsePhoneSignup, true);
  assert.equal(enabledState.effectiveSignupMethod, 'phone');
  assert.equal(enabledState.shouldWarnCpaPhoneSignup, true);
  assert.equal(enabledState.targetCapabilities.usesOauthTimeoutBudget, true);
  assert.equal(enabledState.stepDefinitionOptions.phoneVerificationEnabled, true);
  assert.deepEqual(enabledState.effectiveSignupMethods, ['email', 'phone']);

  const contributionLockedState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'sub2api',
      phoneVerificationEnabled: true,
      accountContributionEnabled: true,
      signupMethod: 'phone',
    },
  });

  assert.equal(contributionLockedState.canUsePhoneSignup, false);
  assert.equal(contributionLockedState.effectiveSignupMethod, 'email');
  assert.equal(contributionLockedState.stepDefinitionOptions.phoneVerificationEnabled, true);
  assert.equal(contributionLockedState.shouldWarnCpaPhoneSignup, false);
  assert.equal(contributionLockedState.targetCapabilities.usesOauthTimeoutBudget, false);
  assert.deepEqual(contributionLockedState.effectiveSignupMethods, ['email']);
});

test('flow capability registry normalizes unknown flows to OpenAI capabilities', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'legacy-flow',
      targetId: 'codex2api',
      phoneVerificationEnabled: true,
      accountContributionEnabled: true,
      signupMethod: 'phone',
    },
  });

  assert.equal(capabilityState.activeFlowId, 'openai');
  assert.equal(capabilityState.canShowPhoneSettings, true);
  assert.equal(capabilityState.canShowLuckmail, true);
  assert.equal(capabilityState.canUsePhoneSignup, false);
  assert.equal(capabilityState.effectiveSignupMethod, 'email');
  assert.equal(capabilityState.effectiveTargetId, 'codex2api');
  assert.deepEqual(capabilityState.supportedTargetIds, ['cpa', 'sub2api', 'codex2api']);
});


test('flow capability registry exposes shared auto-run validation for phone locks and target support', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry({
    flowCapabilities: {
      openai: {
        ...api.FLOW_CAPABILITIES.openai,
        supportedTargetIds: ['cpa'],
      },
    },
  });

  const unsupportedPanelResult = registry.validateAutoRunStart({
    state: {
      activeFlowId: 'openai',
      targetId: 'sub2api',
      signupMethod: 'email',
    },
  });

  assert.equal(unsupportedPanelResult.ok, false);
  assert.equal(unsupportedPanelResult.errors[0].code, 'panel_mode_unsupported');
});

test('flow capability registry normalizes unsupported mode switches back to the effective capability set', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry({
    flowCapabilities: {
      openai: {
        ...api.DEFAULT_FLOW_CAPABILITIES,
        supportedTargetIds: ['cpa'],
      },
    },
  });

  const validation = registry.validateModeSwitch({
    state: {
      activeFlowId: 'legacy-flow',
      targetId: 'sub2api',
      signupMethod: 'phone',
      phoneVerificationEnabled: true,
    },
    changedKeys: [
      'targetId',
      'signupMethod',
      'phoneVerificationEnabled',
    ],
  });

  assert.equal(validation.ok, false);
  assert.deepEqual(validation.normalizedUpdates, {
    targetId: 'cpa',
    signupMethod: 'email',
    phoneVerificationEnabled: false,
  });
  assert.deepEqual(
    validation.errors.map((entry) => entry.code),
    [
      'panel_mode_unsupported',
      'phone_verification_unsupported',
      'phone_signup_flow_unsupported',
    ]
  );
});
