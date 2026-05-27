const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadStep2Module() {
  const source = fs.readFileSync('background/steps/submit-signup-email.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${source}; return self.MultiPageBackgroundStep2;`)(globalScope);
}

function createStep2Harness(readyState = '') {
  const api = loadStep2Module();
  const events = {
    stableOptions: [],
    logs: [],
  };

  const executor = api.createStep2Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    chrome: {
      tabs: {
        update: async () => {},
        get: async () => ({ url: 'https://auth.openai.com/create-account' }),
      },
    },
    completeNodeFromBackground: async () => {},
    ensureContentScriptReadyOnTab: async () => {},
    ensureSignupAuthEntryPageReady: async () => ({ tabId: 11 }),
    ensureSignupEntryPageReady: async () => ({ tabId: 11 }),
    ensureSignupPostEmailPageReadyInTab: async () => ({ state: 'password_page', url: 'https://auth.openai.com/create-account/password' }),
    getTabId: async () => 11,
    isTabAlive: async () => true,
    resolveSignupEmailForFlow: async () => 'user@example.com',
    sendToContentScriptResilient: async (_source, message) => {
      if (message?.type === 'ENSURE_SIGNUP_ENTRY_READY') {
        return { state: readyState };
      }
      if (message?.type === 'EXECUTE_NODE') {
        return { ok: true, url: 'https://auth.openai.com/create-account/password' };
      }
      return { ok: true };
    },
    SIGNUP_PAGE_INJECT_FILES: [],
    waitForTabStableComplete: async (_tabId, options) => {
      events.stableOptions.push(options);
      return true;
    },
  });

  return { executor, events };
}

test('step 2 uses shorter stable wait when signup entry state is already ready', async () => {
  const { executor, events } = createStep2Harness('email_entry');
  await executor.executeStep2({});

  assert.equal(events.stableOptions.length, 1);
  assert.equal(events.stableOptions[0].stableMs, 1200);
});

test('step 2 falls back to default stable wait when signup entry state is unknown', async () => {
  const { executor, events } = createStep2Harness('');
  await executor.executeStep2({});

  assert.equal(events.stableOptions.length, 1);
  assert.equal(events.stableOptions[0].stableMs, 3000);
});
