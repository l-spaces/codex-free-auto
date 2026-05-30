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
      plusModeEnabled: false,
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

  const plusLockedState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'sub2api',
      phoneVerificationEnabled: true,
      plusModeEnabled: true,
      accountContributionEnabled: false,
      signupMethod: 'phone',
    },
  });

  assert.equal(plusLockedState.canUsePhoneSignup, false);
  assert.equal(plusLockedState.effectiveSignupMethod, 'email');
  assert.equal(plusLockedState.stepDefinitionOptions.phoneVerificationEnabled, true);
  assert.equal(plusLockedState.shouldWarnCpaPhoneSignup, false);
  assert.equal(plusLockedState.targetCapabilities.usesOauthTimeoutBudget, false);
  assert.deepEqual(plusLockedState.effectiveSignupMethods, ['email']);
});

test('flow capability registry normalizes unknown flows to OpenAI capabilities', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'legacy-flow',
      targetId: 'codex2api',
      phoneVerificationEnabled: true,
      plusModeEnabled: true,
      accountContributionEnabled: true,
      signupMethod: 'phone',
    },
  });

  assert.equal(capabilityState.activeFlowId, 'openai');
  assert.equal(capabilityState.canShowPhoneSettings, true);
  assert.equal(capabilityState.canShowPlusSettings, true);
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

  const plusLockedResult = registry.validateAutoRunStart({
    state: {
      activeFlowId: 'openai',
      targetId: 'cpa',
      signupMethod: 'phone',
      phoneVerificationEnabled: true,
      plusModeEnabled: true,
      accountContributionEnabled: false,
    },
  });

  assert.equal(plusLockedResult.ok, false);
  assert.equal(plusLockedResult.errors[0].code, 'phone_signup_plus_mode_locked');

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
      plusModeEnabled: true,
    },
    changedKeys: [
      'targetId',
      'signupMethod',
      'phoneVerificationEnabled',
      'plusModeEnabled',
    ],
  });

  assert.equal(validation.ok, false);
  assert.deepEqual(validation.normalizedUpdates, {
    targetId: 'cpa',
    signupMethod: 'email',
    phoneVerificationEnabled: false,
    plusModeEnabled: false,
  });
  assert.deepEqual(
    validation.errors.map((entry) => entry.code),
    [
      'panel_mode_unsupported',
      'plus_mode_unsupported',
      'phone_verification_unsupported',
      'phone_signup_flow_unsupported',
    ]
  );
});

test('flow capability registry exposes editable Plus account access strategies for SUB2API', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'sub2api',
      signupMethod: 'email',
      plusModeEnabled: true,
      plusAccountAccessStrategy: 'sub2api_codex_session',
    },
  });

  assert.deepEqual(
    capabilityState.availablePlusAccountAccessStrategies,
    ['oauth', 'sub2api_codex_session']
  );
  assert.equal(capabilityState.requestedPlusAccountAccessStrategy, 'sub2api_codex_session');
  assert.equal(capabilityState.effectivePlusAccountAccessStrategy, 'sub2api_codex_session');
  assert.equal(capabilityState.canEditPlusAccountAccessStrategy, true);
  assert.equal(capabilityState.stepDefinitionOptions.plusAccountAccessStrategy, 'sub2api_codex_session');
});

test('flow capability registry maps session import to the current source target', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'sub2api',
      signupMethod: 'email',
      plusModeEnabled: true,
      plusAccountAccessStrategy: 'cpa_codex_session',
    },
  });

  assert.deepEqual(
    capabilityState.availablePlusAccountAccessStrategies,
    ['oauth', 'sub2api_codex_session']
  );
  assert.equal(capabilityState.requestedPlusAccountAccessStrategy, 'sub2api_codex_session');
  assert.equal(capabilityState.effectivePlusAccountAccessStrategy, 'sub2api_codex_session');
  assert.equal(capabilityState.stepDefinitionOptions.plusAccountAccessStrategy, 'sub2api_codex_session');
});

test('flow capability registry exposes editable Plus account access strategies for CPA', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'cpa',
      signupMethod: 'email',
      plusModeEnabled: true,
      plusAccountAccessStrategy: 'cpa_codex_session',
    },
  });

  assert.deepEqual(
    capabilityState.availablePlusAccountAccessStrategies,
    ['oauth', 'cpa_codex_session']
  );
  assert.equal(capabilityState.requestedPlusAccountAccessStrategy, 'cpa_codex_session');
  assert.equal(capabilityState.effectivePlusAccountAccessStrategy, 'cpa_codex_session');
  assert.equal(capabilityState.canEditPlusAccountAccessStrategy, true);
  assert.equal(capabilityState.stepDefinitionOptions.plusAccountAccessStrategy, 'cpa_codex_session');
});

test('flow capability registry falls back to OAuth when the current source cannot import sessions', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'codex2api',
      signupMethod: 'email',
      plusModeEnabled: true,
      plusAccountAccessStrategy: 'cpa_codex_session',
    },
  });

  assert.deepEqual(
    capabilityState.availablePlusAccountAccessStrategies,
    ['oauth']
  );
  assert.equal(capabilityState.requestedPlusAccountAccessStrategy, 'oauth');
  assert.equal(capabilityState.effectivePlusAccountAccessStrategy, 'oauth');
  assert.equal(capabilityState.canEditPlusAccountAccessStrategy, false);
  assert.equal(capabilityState.stepDefinitionOptions.plusAccountAccessStrategy, 'oauth');
});

test('flow capability registry forces SUB2API session import only for contribution mode Plus runs', () => {
  const api = loadApi();
  const registry = api.createFlowCapabilityRegistry();

  const capabilityState = registry.resolveSidepanelCapabilities({
    state: {
      activeFlowId: 'openai',
      targetId: 'cpa',
      signupMethod: 'email',
      plusModeEnabled: true,
      accountContributionEnabled: true,
      plusAccountAccessStrategy: 'cpa_codex_session',
    },
  });

  assert.deepEqual(capabilityState.availablePlusAccountAccessStrategies, ['sub2api_codex_session']);
  assert.equal(capabilityState.requestedPlusAccountAccessStrategy, 'cpa_codex_session');
  assert.equal(capabilityState.effectivePlusAccountAccessStrategy, 'sub2api_codex_session');
  assert.equal(capabilityState.canEditPlusAccountAccessStrategy, false);
  assert.equal(capabilityState.stepDefinitionOptions.plusAccountAccessStrategy, 'sub2api_codex_session');
});
