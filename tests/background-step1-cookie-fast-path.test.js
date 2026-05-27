const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadStep1Api() {
  const sharedCleanupSource = fs.readFileSync('background/steps/cookie-cleanup.js', 'utf8');
  const source = fs.readFileSync('background/steps/open-chatgpt.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${sharedCleanupSource}\n${source}; return self.MultiPageBackgroundStep1;`)(globalScope);
}

test('step 1 skips cookie cleanup fallback when no target cookies are found', async () => {
  const api = loadStep1Api();
  const events = {
    cookieQueries: [],
    removedCookies: [],
    browsingDataCalls: [],
    completedSteps: [],
    openedSteps: [],
    logs: [],
  };

  const executor = api.createStep1Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    chrome: {
      cookies: {
        getAllCookieStores: async () => [{ id: 'store-a' }],
        getAll: async (query) => {
          events.cookieQueries.push(query);
          return [];
        },
        remove: async (details) => {
          events.removedCookies.push(details);
          return details;
        },
      },
      browsingData: {
        removeCookies: async (details) => {
          events.browsingDataCalls.push(details);
        },
      },
    },
    completeNodeFromBackground: async (step) => {
      events.completedSteps.push(step);
    },
    openSignupEntryTab: async (step) => {
      events.openedSteps.push(step);
    },
  });

  await executor.executeStep1();

  assert.equal(events.cookieQueries.length, 6);
  assert.deepStrictEqual(events.cookieQueries, [
    { storeId: 'store-a', domain: 'chatgpt.com' },
    { storeId: 'store-a', domain: 'chat.openai.com' },
    { storeId: 'store-a', domain: 'openai.com' },
    { storeId: 'store-a', domain: 'auth.openai.com' },
    { storeId: 'store-a', domain: 'auth0.openai.com' },
    { storeId: 'store-a', domain: 'accounts.openai.com' },
  ]);
  assert.deepStrictEqual(events.removedCookies, []);
  assert.deepStrictEqual(events.browsingDataCalls, []);
  assert.deepStrictEqual(events.openedSteps, [1]);
  assert.deepStrictEqual(events.completedSteps, ['open-chatgpt']);
  assert.equal(
    events.logs.some(({ message }) => /未检测到待清理的 ChatGPT \/ OpenAI cookies/.test(message)),
    true
  );
});

test('step 1 clears matched cookies without browsingData fallback', async () => {
  const api = loadStep1Api();
  const events = {
    removedCookies: [],
    browsingDataCalls: [],
  };

  const executor = api.createStep1Executor({
    addLog: async () => {},
    chrome: {
      cookies: {
        getAllCookieStores: async () => [{ id: 'store-a' }],
        getAll: async (query) => (
          query?.domain === 'openai.com'
            ? [{ domain: '.auth.openai.com', path: '/u', name: 'sess', storeId: 'store-a' }]
            : []
        ),
        remove: async (details) => {
          events.removedCookies.push(details);
          return details;
        },
      },
      browsingData: {
        removeCookies: async (details) => {
          events.browsingDataCalls.push(details);
        },
      },
    },
    completeNodeFromBackground: async () => {},
    openSignupEntryTab: async () => {},
  });

  await executor.executeStep1();

  assert.deepStrictEqual(events.removedCookies, [
    {
      url: 'https://auth.openai.com/u',
      name: 'sess',
      storeId: 'store-a',
    },
  ]);
  assert.equal(events.browsingDataCalls.length, 0);
});
