const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readSourceRegistryBundle } = require('./helpers/script-bundles.js');

const registrySource = readSourceRegistryBundle();

test('background imports tab runtime module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /core\/flow-kernel\/tab-runtime\.js/);
});

test('tab runtime module exposes a factory', () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};

  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  assert.equal(typeof api?.createTabRuntime, 'function');
});

test('tab runtime accepts canonical openai-auth readiness for queued openai-auth commands', async () => {
  const runtimeSource = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const runtimeApi = new Function('self', `${runtimeSource}; return self.MultiPageBackgroundTabRuntime;`)({});
  const registryApi = new Function('self', `${registrySource}; return self.MultiPageSourceRegistry;`)({});
  const sourceRegistry = registryApi.createSourceRegistry();

  const sentMessages = [];
  let currentState = {
    tabRegistry: {
      'openai-auth': { tabId: 91, ready: true },
    },
    sourceLastUrls: {
      'openai-auth': 'https://auth.openai.com/authorize',
    },
  };

  const runtime = runtimeApi.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async (tabId) => ({
          id: tabId,
          windowId: 1,
          url: 'https://auth.openai.com/authorize',
          status: 'complete',
        }),
        query: async () => [],
        sendMessage: async (tabId, message) => {
          if (message.type === 'PING') {
            return { ok: true, source: 'openai-auth' };
          }
          sentMessages.push({ tabId, message });
          return { ok: true };
        },
      },
    },
    getSourceLabel: (source) => source || 'unknown',
    getState: async () => currentState,
    matchesSourceUrlFamily: (source, candidateUrl, referenceUrl) => (
      sourceRegistry.matchesSourceUrlFamily(source, candidateUrl, referenceUrl)
    ),
    setState: async (updates) => {
      currentState = { ...currentState, ...updates };
    },
    sourceRegistry,
    throwIfStopped: () => {},
  });

  assert.equal(await runtime.getTabId('openai-auth'), 91);

  currentState = {
    tabRegistry: {},
    sourceLastUrls: {},
  };

  const queued = runtime.queueCommand('openai-auth', { type: 'STEP2_TEST' }, 1000);
  runtime.flushCommand('openai-auth', 55);
  await assert.doesNotReject(queued);
  assert.deepEqual(sentMessages, [{ tabId: 55, message: { type: 'STEP2_TEST' } }]);

  await runtime.ensureContentScriptReadyOnTab('openai-auth', 77, {
    timeoutMs: 100,
  });

  assert.deepEqual(currentState.tabRegistry['openai-auth'], { tabId: 77, ready: true, windowId: 1 });
  assert.deepEqual(Object.keys(currentState.tabRegistry), ['openai-auth']);
});

test('tab runtime caps per-attempt response timeout to the remaining resilient timeout budget', () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => ({ id: 1, url: 'https://example.com', status: 'complete' }),
        query: async () => [],
      },
    },
    getSourceLabel: (source) => source || 'unknown',
    getState: async () => ({ tabRegistry: {}, sourceLastUrls: {} }),
    matchesSourceUrlFamily: () => false,
    normalizeLocalCpaStep9Mode: () => 'submit',
    parseUrlSafely: () => null,
    registerTab: async () => {},
    setState: async () => {},
    shouldBypassStep9ForLocalCpa: () => false,
    throwIfStopped: () => {},
  });

  assert.equal(
    runtime.resolveResponseTimeoutMs({ type: 'PREPARE_SIGNUP_VERIFICATION' }, undefined, 30000),
    30000
  );
  assert.equal(
    runtime.resolveResponseTimeoutMs({ type: 'PREPARE_SIGNUP_VERIFICATION' }, 12000, 5000),
    5000
  );
});

test('tab runtime gives step 5 profile submit enough response time for slow page transitions', () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => ({ id: 1, url: 'https://example.com', status: 'complete' }),
        query: async () => [],
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({ tabRegistry: {}, sourceLastUrls: {} }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {},
  });

  assert.equal(
    runtime.getContentScriptResponseTimeoutMs({ type: 'EXECUTE_NODE', nodeId: 'fill-profile' }),
    150000
  );
  assert.equal(
    runtime.getContentScriptResponseTimeoutMs({ type: 'EXECUTE_NODE', payload: { nodeId: 'fill-profile' } }),
    150000
  );
});

test('tab runtime replays retryable transport recovery hook and surfaces a localized timeout error', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  let recoveryCalls = 0;
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => ({
          id: 9,
          windowId: 1,
          url: 'https://auth.openai.com/authorize',
          status: 'complete',
        }),
        query: async () => [],
        sendMessage: async () => {
          throw new Error('Could not establish connection. Receiving end does not exist.');
        },
      },
    },
    getSourceLabel: () => 'OpenAI 授权页',
    getState: async () => ({
      tabRegistry: {
        'openai-auth': { tabId: 9, ready: true },
      },
      sourceLastUrls: {},
    }),
    isRetryableContentScriptTransportError: (error) => /Receiving end does not exist/i.test(String(error?.message || error || '')),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    sleepWithStop: async () => {},
    throwIfStopped: () => {},
  });

  await assert.rejects(
    runtime.sendToContentScriptResilient('openai-auth', {
      type: 'ENSURE_AUTH_PAGE_STATE',
      payload: {},
    }, {
      timeoutMs: 5,
      retryDelayMs: 0,
      onRetryableError: async () => {
        recoveryCalls += 1;
      },
    }),
    /页面刚完成跳转或刷新，内容脚本还没有重新接回/
  );

  assert.equal(recoveryCalls > 0, true);
});

test('tab runtime waitForTabComplete waits until tab status becomes complete', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  let getCalls = 0;
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    buildLocalhostCleanupPrefix: () => '',
    chrome: {
      tabs: {
        get: async () => {
          getCalls += 1;
          return {
            id: 9,
            url: 'https://example.com',
            status: getCalls >= 3 ? 'complete' : 'loading',
          };
        },
        query: async () => [],
      },
    },
    getSourceLabel: (source) => source || 'unknown',
    getState: async () => ({ tabRegistry: {}, sourceLastUrls: {} }),
    matchesSourceUrlFamily: () => false,
    normalizeLocalCpaStep9Mode: () => 'submit',
    parseUrlSafely: () => null,
    registerTab: async () => {},
    setState: async () => {},
    shouldBypassStep9ForLocalCpa: () => false,
    throwIfStopped: () => {},
  });

  const result = await runtime.waitForTabComplete(9, {
    timeoutMs: 2000,
    retryDelayMs: 1,
  });

  assert.equal(result?.status, 'complete');
  assert.equal(getCalls, 3);
});

test('tab runtime waitForTabComplete aborts promptly when stop is requested', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  let throwCalls = 0;
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => ({
          id: 9,
          url: 'https://example.com',
          status: 'loading',
        }),
        query: async () => [],
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({ tabRegistry: {}, sourceLastUrls: {} }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {
      throwCalls += 1;
      if (throwCalls >= 2) {
        throw new Error('Flow stopped.');
      }
    },
  });

  await assert.rejects(
    runtime.waitForTabComplete(9, {
      timeoutMs: 2000,
      retryDelayMs: 1,
    }),
    /Flow stopped\./
  );
});

test('tab runtime waitForTabStableComplete waits through a late navigation after an initial complete state', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);

  let getCalls = 0;
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => {
          getCalls += 1;
          if (getCalls === 1) {
            return {
              id: 9,
              url: 'https://auth.openai.com/u/signup/profile',
              status: 'complete',
            };
          }
          if (getCalls === 2) {
            return {
              id: 9,
              url: 'https://chatgpt.com/',
              status: 'loading',
            };
          }
          return {
            id: 9,
            url: 'https://chatgpt.com/',
            status: 'complete',
          };
        },
        query: async () => [],
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({ tabRegistry: {}, sourceLastUrls: {} }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {},
  });

  const result = await runtime.waitForTabStableComplete(9, {
    timeoutMs: 2000,
    retryDelayMs: 5,
    stableMs: 5,
    initialDelayMs: 1,
  });

  assert.equal(result?.url, 'https://chatgpt.com/');
  assert.equal(result?.status, 'complete');
  assert.ok(getCalls >= 4);
});

test('tab runtime opens new automation tabs in the locked window', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);
  const created = [];
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        create: async (payload) => {
          created.push(payload);
          return { id: 17, windowId: payload.windowId, url: payload.url };
        },
        get: async () => ({ id: 17, windowId: 100, url: 'https://example.com' }),
        query: async () => [],
        onUpdated: {
          addListener: () => {},
          removeListener: () => {},
        },
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({
      automationWindowId: 100,
      tabRegistry: {},
      sourceLastUrls: {},
    }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {},
  });

  await runtime.reuseOrCreateTab('openai-auth', 'https://example.com');

  assert.equal(created.length, 1);
  assert.equal(created[0].windowId, 100);
});

test('tab runtime force-new opens replacement before removing the active stale source tab', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);
  const events = [];
  let tabs = [
    { id: 1, active: true, windowId: 100, url: 'https://chatgpt.com/' },
  ];
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        create: async (payload) => {
          events.push({ type: 'create', payload });
          const tab = { id: 2, active: true, windowId: payload.windowId, url: payload.url };
          tabs = tabs.map((item) => ({ ...item, active: false })).concat(tab);
          return tab;
        },
        get: async (tabId) => tabs.find((tab) => tab.id === tabId),
        query: async () => tabs,
        remove: async (ids) => {
          events.push({ type: 'remove', ids });
          tabs = tabs.filter((tab) => !ids.includes(tab.id));
        },
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({
      automationWindowId: 100,
      sourceLastUrls: { 'openai-auth': 'https://chatgpt.com/' },
      tabRegistry: {},
    }),
    matchesSourceUrlFamily: (sourceName, candidateUrl) => (
      sourceName === 'openai-auth'
      && /chatgpt\.com|auth\.openai\.com/.test(String(candidateUrl || ''))
    ),
    setState: async () => {},
    throwIfStopped: () => {},
  });

  const tabId = await runtime.reuseOrCreateTab('openai-auth', 'https://auth.openai.com/authorize', {
    forceNew: true,
  });

  assert.equal(tabId, 2);
  assert.deepEqual(events, [
    { type: 'create', payload: { url: 'https://auth.openai.com/authorize', active: true, windowId: 100 } },
    { type: 'remove', ids: [1] },
  ]);
  assert.deepEqual(tabs, [
    { id: 2, active: true, windowId: 100, url: 'https://auth.openai.com/authorize' },
  ]);
});

test('tab runtime scopes tab queries to the locked automation window', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);
  const queries = [];
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => ({ id: 1, windowId: 22, url: 'https://example.com' }),
        query: async (queryInfo) => {
          queries.push(queryInfo);
          return [];
        },
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({
      automationWindowId: 22,
      tabRegistry: {},
      sourceLastUrls: {},
    }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {},
  });

  await runtime.queryTabsInAutomationWindow({ active: true, currentWindow: true });

  assert.deepEqual(queries[0], { active: true, windowId: 22 });
});

test('tab runtime does not create tabs outside an unavailable locked window', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);
  const created = [];
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        create: async (payload) => {
          created.push(payload);
          if (payload.windowId === 44) {
            throw new Error('No window with id: 44');
          }
          return { id: 99, windowId: payload.windowId, url: payload.url };
        },
        get: async () => ({ id: 1, windowId: 44, url: 'https://example.com' }),
        query: async () => [],
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({
      automationWindowId: 44,
      tabRegistry: {},
      sourceLastUrls: {},
    }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {},
  });

  await assert.rejects(
    () => runtime.createAutomationTab({ url: 'https://example.com', active: true }),
    /自动任务窗口已不可用/
  );

  assert.deepEqual(created, [{ url: 'https://example.com', active: true, windowId: 44 }]);
});

test('tab runtime does not query all windows when the locked window is unavailable', async () => {
  const source = fs.readFileSync('core/flow-kernel/tab-runtime.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundTabRuntime;`)(globalScope);
  const queries = [];
  const runtime = api.createTabRuntime({
    LOG_PREFIX: '[test]',
    addLog: async () => {},
    chrome: {
      tabs: {
        get: async () => ({ id: 1, windowId: 55, url: 'https://example.com' }),
        query: async (queryInfo) => {
          queries.push(queryInfo);
          if (queryInfo.windowId === 55) {
            throw new Error('No window with id: 55');
          }
          return [{ id: 7, windowId: 1, url: 'https://other.example/' }];
        },
      },
    },
    getSourceLabel: (sourceName) => sourceName || 'unknown',
    getState: async () => ({
      automationWindowId: 55,
      tabRegistry: {},
      sourceLastUrls: {},
    }),
    matchesSourceUrlFamily: () => false,
    setState: async () => {},
    throwIfStopped: () => {},
  });

  await assert.rejects(
    () => runtime.queryTabsInAutomationWindow({ active: true }),
    /自动任务窗口已不可用/
  );

  assert.deepEqual(queries, [{ active: true, windowId: 55 }]);
});
