const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadSensitiveSettingsApi() {
  const source = fs.readFileSync('background/sensitive-settings.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${source}; return self.MultiPageSensitiveSettings;`)(globalScope);
}

test('state merge prefers persisted duck authorization over stale session value', () => {
  const api = loadSensitiveSettingsApi();

  const state = api.buildStateStorageView({
    defaultState: {
      duckApiAuthorization: '',
      emailGenerator: 'duck',
    },
    persistedSettings: {
      duckApiAuthorization: 'new-duck-token',
      emailGenerator: 'duck',
    },
    persistedAliasState: {},
    sessionState: {
      duckApiAuthorization: 'old-duck-token',
      email: 'current@example.com',
    },
    accountRunHistory: [{ email: 'current@example.com' }],
  });

  assert.equal(state.duckApiAuthorization, 'new-duck-token');
  assert.equal(state.email, 'current@example.com');
  assert.deepEqual(state.accountRunHistory, [{ email: 'current@example.com' }]);
});

test('local-only sensitive settings are removed before writing session state', () => {
  const api = loadSensitiveSettingsApi();

  const sessionState = api.omitLocalOnlySettings({
    duckApiAuthorization: 'secret-token',
    emailGenerator: 'duck',
    email: 'current@example.com',
  });

  assert.equal(Object.prototype.hasOwnProperty.call(sessionState, 'duckApiAuthorization'), false);
  assert.equal(sessionState.emailGenerator, 'duck');
  assert.equal(sessionState.email, 'current@example.com');
});
