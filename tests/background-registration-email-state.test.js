const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadRegistrationEmailStateApi() {
  const source = fs.readFileSync('background/registration-email-state.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${source}; return self.MultiPageRegistrationEmailState;`)(globalScope);
}

test('registration email state preserves the previous baseline when current email is cleared for recovery', () => {
  const api = loadRegistrationEmailStateApi();
  const helpers = api.createRegistrationEmailStateHelpers();

  const updates = helpers.buildRegistrationEmailStateUpdates({
    email: 'old.user@example.com',
    registrationEmailState: {
      current: 'old.user@example.com',
      previous: 'old.user@example.com',
      source: 'generated:duck',
      updatedAt: 1,
    },
  }, {
    currentEmail: null,
    preservePrevious: true,
    source: 'step8_recovery',
  });

  assert.deepStrictEqual(updates, {
    email: null,
    registrationEmailState: {
      current: '',
      previous: 'old.user@example.com',
      source: 'generated:duck',
      updatedAt: updates.registrationEmailState.updatedAt,
    },
  });
  assert.ok(updates.registrationEmailState.updatedAt > 0);
});

test('registration email baseline prefers the current UI email over preserved runtime state', () => {
  const api = loadRegistrationEmailStateApi();
  const helpers = api.createRegistrationEmailStateHelpers();

  const baseline = helpers.getRegistrationEmailBaseline({
    email: '',
    registrationEmailState: {
      current: '',
      previous: 'preserved@duck.com',
      source: 'generated:duck',
      updatedAt: 1,
    },
  }, {
    preferredEmail: 'visible@duck.com',
  });

  assert.equal(baseline, 'visible@duck.com');
});

test('flow registration email state updates runtime email without preserving removed phone identity fields', () => {
  const api = loadRegistrationEmailStateApi();
  const helpers = api.createRegistrationEmailStateHelpers();

  const updates = helpers.buildFlowRegistrationEmailStateUpdates({
    email: '',
    accountIdentifierType: 'phone',
    accountIdentifier: '+447780579093',
    signupPhoneNumber: '+447780579093',
    signupPhoneActivation: {
      activationId: 'active-1',
      phoneNumber: '+447780579093',
    },
    signupPhoneCompletedActivation: {
      activationId: 'done-1',
      phoneNumber: '+447780579093',
    },
    signupPhoneVerificationRequestedAt: 12345,
    signupPhoneVerificationPurpose: 'login',
  }, {
    currentEmail: 'fresh@example.com',
    preserveAccountIdentity: true,
    source: 'flow',
  });

  assert.deepStrictEqual(updates, {
    email: 'fresh@example.com',
    registrationEmailState: {
      current: 'fresh@example.com',
      previous: 'fresh@example.com',
      source: 'flow',
      updatedAt: updates.registrationEmailState.updatedAt,
    },
  });
  assert.ok(updates.registrationEmailState.updatedAt > 0);
});

test('flow registration email state falls back to email identity updates when no phone identity exists', () => {
  const api = loadRegistrationEmailStateApi();
  const helpers = api.createRegistrationEmailStateHelpers();

  const updates = helpers.buildFlowRegistrationEmailStateUpdates({
    email: '',
    accountIdentifierType: 'email',
    accountIdentifier: 'old@example.com',
  }, {
    currentEmail: 'fresh@example.com',
    preserveAccountIdentity: true,
    source: 'flow',
  });

  assert.deepStrictEqual(updates, {
    email: 'fresh@example.com',
    registrationEmailState: {
      current: 'fresh@example.com',
      previous: 'fresh@example.com',
      source: 'flow',
      updatedAt: updates.registrationEmailState.updatedAt,
    },
  });
  assert.ok(updates.registrationEmailState.updatedAt > 0);
});
