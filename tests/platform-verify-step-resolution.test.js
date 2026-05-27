const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
const api = new Function('self', `${source}; return self.MultiPageBackgroundStep10;`)({});

function createExecutor(overrides = {}) {
  const events = {
    logs: [],
    completed: [],
    fetchCalls: [],
  };

  const executor = api.createStep10Executor({
    addLog: async (message, level, options) => {
      events.logs.push({ message, level, options });
    },
    chrome: {},
    closeConflictingTabsForSource: async () => {},
    completeNodeFromBackground: async (nodeId, payload) => {
      events.completed.push({ nodeId, payload });
    },
    ensureContentScriptReadyOnTab: async () => {},
    getPanelMode: () => 'cpa',
    getStepIdByKeyForState: (stepKey) => ({
      'oauth-login': 7,
      'relogin-bound-email': 11,
      'confirm-oauth': 14,
      'platform-verify': 15,
    })[stepKey] || null,
    getTabId: async () => 1,
    isLocalhostOAuthCallbackUrl: (url) => {
      try {
        const parsed = new URL(url);
        return ['localhost', '127.0.0.1'].includes(parsed.hostname)
          && Boolean(parsed.searchParams.get('code'))
          && Boolean(parsed.searchParams.get('state'));
      } catch {
        return false;
      }
    },
    isTabAlive: async () => true,
    normalizeCodex2ApiUrl: (url) => url,
    normalizeSub2ApiUrl: (url) => url,
    rememberSourceLastUrl: () => {},
    reuseOrCreateTab: async () => 1,
    sendToContentScript: async () => ({}),
    sendToContentScriptResilient: async () => ({}),
    shouldBypassStep9ForLocalCpa: () => false,
    SUB2API_STEP9_RESPONSE_TIMEOUT_MS: 30000,
    ...overrides,
  });

  return { executor, events };
}

test('CPA platform verify resolves relogin tail steps from active definitions', async () => {
  const originalFetch = global.fetch;
  const { executor, events } = createExecutor();
  global.fetch = async (url, options = {}) => {
    events.fetchCalls.push({ url, body: JSON.parse(options.body || '{}') });
    return {
      ok: true,
      status: 200,
      json: async () => ({ message: 'CPA callback accepted' }),
    };
  };

  try {
    await executor.executeStep10({
      visibleStep: 15,
      nodeId: 'platform-verify',
      localhostUrl: 'http://127.0.0.1:8317/codex/callback?code=abc&state=expected',
      cpaOAuthState: 'expected',
      cpaManagementOrigin: 'http://127.0.0.1:8317',
      vpsUrl: 'http://127.0.0.1:8317/management.html#/oauth',
      vpsPassword: 'secret',
    });
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(events.fetchCalls.length, 1);
  assert.equal(events.fetchCalls[0].body.redirect_url, 'http://127.0.0.1:8317/codex/callback?code=abc&state=expected');
  assert.deepStrictEqual(events.completed, [
    {
      nodeId: 'platform-verify',
      payload: {
        localhostUrl: 'http://127.0.0.1:8317/codex/callback?code=abc&state=expected',
        verifiedStatus: 'CPA callback accepted',
      },
    },
  ]);
});

test('CPA state mismatch points relogin-enabled flow back to relogin-bound-email step', async () => {
  const { executor } = createExecutor();

  await assert.rejects(
    () => executor.executeStep10({
      visibleStep: 15,
      nodeId: 'platform-verify',
      localhostUrl: 'http://127.0.0.1:8317/codex/callback?code=abc&state=actual',
      cpaOAuthState: 'expected',
      cpaManagementOrigin: 'http://127.0.0.1:8317',
      vpsUrl: 'http://127.0.0.1:8317/management.html#/oauth',
      vpsPassword: 'secret',
    }),
    (error) => {
      assert.match(error.message, /11/);
      assert.doesNotMatch(error.message, /步骤\s*10|姝ラ.*10/);
      return true;
    }
  );
});

test('CPA invalid localhost callback points to the dynamic confirm-oauth step', async () => {
  const { executor } = createExecutor({
    isLocalhostOAuthCallbackUrl: () => false,
  });

  await assert.rejects(
    () => executor.executeStep10({
      visibleStep: 15,
      nodeId: 'platform-verify',
      localhostUrl: 'notaurl',
      cpaManagementOrigin: 'http://127.0.0.1:8317',
      vpsUrl: 'http://127.0.0.1:8317/management.html#/oauth',
      vpsPassword: 'secret',
    }),
    (error) => {
      assert.match(error.message, /14/);
      assert.doesNotMatch(error.message, /12/);
      return true;
    }
  );
});
