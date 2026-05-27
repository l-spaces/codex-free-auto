const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/steps/fill-password.js', 'utf8');
const globalScope = {};
const api = new Function('self', `${source}; return self.MultiPageBackgroundStep3;`)(globalScope);

test('step 3 reuses existing generated password when rerunning the same email flow', async () => {
  const events = {
    passwordStates: [],
    messages: [],
  };

  const executor = api.createStep3Executor({
    addLog: async () => {},
    chrome: { tabs: { update: async () => {} } },
    ensureContentScriptReadyOnTab: async () => {},
    generatePassword: () => 'Generated-Should-Not-Be-Used',
    getTabId: async () => 88,
    isTabAlive: async () => true,
    sendToContentScript: async (_source, message) => {
      events.messages.push(message);
    },
    setPasswordState: async (password) => {
      events.passwordStates.push(password);
    },
    setState: async () => {},
    SIGNUP_PAGE_INJECT_FILES: [],
  });

  await executor.executeStep3({
    email: 'keep@example.com',
    password: 'Secret123!',
    customPassword: '',
    accounts: [],
  });

  assert.deepStrictEqual(events.passwordStates, ['Secret123!']);
  assert.deepStrictEqual(events.messages, [
    {
      type: 'EXECUTE_NODE',
      nodeId: 'fill-password',
      step: 3,
      source: 'background',
      payload: {
        email: 'keep@example.com',
        accountIdentifierType: 'email',
        accountIdentifier: 'keep@example.com',
        password: 'Secret123!',
      },
    },
  ]);
});

test('step 3 respects resolved email fallback when phone signup is unavailable', async () => {
  const events = {
    messages: [],
  };

  const executor = api.createStep3Executor({
    addLog: async () => {},
    chrome: { tabs: { update: async () => {} } },
    ensureContentScriptReadyOnTab: async () => {},
    generatePassword: () => 'Generated123!',
    getTabId: async () => 88,
    isTabAlive: async () => true,
    resolveSignupMethod: () => 'email',
    sendToContentScript: async (_source, message) => {
      events.messages.push(message);
    },
    setPasswordState: async () => {},
    setState: async () => {},
    SIGNUP_PAGE_INJECT_FILES: [],
  });

  await executor.executeStep3({
    email: 'fallback@example.com',
    signupMethod: 'phone',
    resolvedSignupMethod: 'email',
    customPassword: 'EmailSecret123!',
    accounts: [],
  });

  assert.equal(events.messages[0].payload.accountIdentifierType, 'email');
  assert.equal(events.messages[0].payload.accountIdentifier, 'fallback@example.com');
});
