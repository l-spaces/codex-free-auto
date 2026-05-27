const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports panel bridge module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /importScripts\([\s\S]*'background\/panel-bridge\.js'/);
});

test('panel bridge module exposes a factory', () => {
  const source = fs.readFileSync('background/panel-bridge.js', 'utf8');
  const globalScope = {};

  const api = new Function('self', `${source}; return self.MultiPageBackgroundPanelBridge;`)(globalScope);

  assert.equal(typeof api?.createPanelBridge, 'function');
});

function loadPanelBridgeWithSub2Api() {
  const sub2apiSource = fs.readFileSync('background/sub2api-api.js', 'utf8');
  const source = fs.readFileSync('background/panel-bridge.js', 'utf8');
  return new Function('self', `${sub2apiSource}\n${source}; return self.MultiPageBackgroundPanelBridge;`)({});
}

function createSub2ApiResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  };
}

test('panel bridge requests SUB2API oauth url via direct API', () => {
  const source = fs.readFileSync('background/panel-bridge.js', 'utf8');
  assert.match(source, /generateOpenAiAuthUrl/);
  assert.doesNotMatch(source, /REQUEST_OAUTH_URL/);
});

test('panel bridge can request codex2api oauth url via protocol', async () => {
  const source = fs.readFileSync('background/panel-bridge.js', 'utf8');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
      assert.equal(url, 'http://localhost:8080/api/admin/oauth/generate-auth-url');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['X-Admin-Key'], 'admin-secret');
      return {
        ok: true,
        json: async () => ({
          auth_url: 'https://auth.openai.com/authorize?state=oauth-state',
          session_id: 'session-123',
        }),
      };
  };

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundPanelBridge;`)({});
    const bridge = api.createPanelBridge({
      addLog: async () => {},
      chrome: {},
      closeConflictingTabsForSource: async () => {},
      ensureContentScriptReadyOnTab: async () => {},
      getPanelMode: () => 'codex2api',
      normalizeCodex2ApiUrl: (value) => value ? `http://${value.replace(/^https?:\/\//, '')}`.replace(/\/admin$/, '/admin/accounts') : 'http://localhost:8080/admin/accounts',
      normalizeSub2ApiUrl: (value) => value,
      rememberSourceLastUrl: async () => {},
      sendToContentScript: async () => ({}),
      sendToContentScriptResilient: async () => ({}),
      waitForTabUrlFamily: async () => null,
      DEFAULT_SUB2API_GROUP_NAME: 'codex',
      SUB2API_STEP1_RESPONSE_TIMEOUT_MS: 90000,
    });

    const result = await bridge.requestOAuthUrlFromPanel({
      panelMode: 'codex2api',
      codex2apiUrl: 'localhost:8080/admin',
      codex2apiAdminKey: 'admin-secret',
    }, { logLabel: '步骤 7' });

    assert.deepStrictEqual(result, {
      oauthUrl: 'https://auth.openai.com/authorize?state=oauth-state',
      codex2apiSessionId: 'session-123',
      codex2apiOAuthState: 'oauth-state',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('panel bridge can request cpa oauth url via management api', async () => {
  const source = fs.readFileSync('background/panel-bridge.js', 'utf8');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    assert.equal(url, 'http://localhost:8317/v0/management/codex-auth-url');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer cpa-key');
    assert.equal(options.headers['X-Management-Key'], 'cpa-key');
    return {
      ok: true,
      json: async () => ({
        status: 'ok',
        url: 'https://auth.openai.com/authorize?state=cpa-oauth-state',
        state: 'cpa-oauth-state',
      }),
    };
  };

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundPanelBridge;`)({});
    const bridge = api.createPanelBridge({
      addLog: async () => {},
      getPanelMode: () => 'cpa',
      normalizeCodex2ApiUrl: (value) => value,
      normalizeSub2ApiUrl: (value) => value,
      DEFAULT_SUB2API_GROUP_NAME: 'codex',
      SUB2API_STEP1_RESPONSE_TIMEOUT_MS: 90000,
    });

    const result = await bridge.requestOAuthUrlFromPanel({
      panelMode: 'cpa',
      vpsUrl: 'http://localhost:8317/admin/oauth',
      vpsPassword: 'cpa-key',
    }, { logLabel: '步骤 7' });

    assert.deepStrictEqual(result, {
      oauthUrl: 'https://auth.openai.com/authorize?state=cpa-oauth-state',
      cpaOAuthState: 'cpa-oauth-state',
      cpaManagementOrigin: 'http://localhost:8317',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('panel bridge can request SUB2API oauth url without opening the admin page', async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const body = options.body ? JSON.parse(options.body) : null;
    fetchCalls.push({ path: parsed.pathname, search: parsed.search, method: options.method || 'GET', body });

    if (parsed.pathname === '/api/v1/auth/login') {
      return createSub2ApiResponse({
        code: 0,
        data: { access_token: 'admin-token' },
      });
    }
    if (parsed.pathname === '/api/v1/admin/groups/all') {
      return createSub2ApiResponse({
        code: 0,
        data: [{ id: 5, name: 'codex', platform: 'openai' }],
      });
    }
    if (parsed.pathname === '/api/v1/admin/proxies/all') {
      return createSub2ApiResponse({
        code: 0,
        data: [{
          id: 7,
          name: 'shadowrocket',
          protocol: 'socks5',
          host: '127.0.0.1',
          port: 1080,
          status: 'active',
        }],
      });
    }
    if (parsed.pathname === '/api/v1/admin/openai/generate-auth-url') {
      return createSub2ApiResponse({
        code: 0,
        data: {
          auth_url: 'https://auth.openai.com/authorize?state=oauth-state',
          session_id: 'session-123',
          state: 'oauth-state',
        },
      });
    }
    return createSub2ApiResponse({ code: 1, message: `unexpected path ${parsed.pathname}` }, 404);
  };

  const tabCreates = [];
  const sentMessages = [];
  const api = loadPanelBridgeWithSub2Api();
  const bridge = api.createPanelBridge({
    addLog: async () => {},
    chrome: {
      tabs: {
        create: async (payload) => {
          tabCreates.push(payload);
          return { id: 72 };
        },
      },
    },
    closeConflictingTabsForSource: async () => {},
    ensureContentScriptReadyOnTab: async () => {},
    getPanelMode: () => 'sub2api',
    normalizeCodex2ApiUrl: (value) => value,
    normalizeSub2ApiUrl: (value) => value,
    rememberSourceLastUrl: async () => {},
    sendToContentScript: async (sourceName, message, options) => {
      sentMessages.push({ sourceName, message, options });
      return {};
    },
    sendToContentScriptResilient: async () => ({}),
    waitForTabUrlFamily: async () => ({ id: 72 }),
    DEFAULT_SUB2API_GROUP_NAME: 'codex',
    SUB2API_STEP1_RESPONSE_TIMEOUT_MS: 90000,
  });

  try {
    const result = await bridge.requestOAuthUrlFromPanel({
      panelMode: 'sub2api',
      sub2apiUrl: 'https://sub.example/admin/accounts',
      sub2apiEmail: 'admin@example.com',
      sub2apiPassword: 'secret',
      sub2apiGroupName: 'codex',
      sub2apiDefaultProxyName: 'shadowrocket',
    }, { logLabel: '步骤 7' });

    const generateCall = fetchCalls.find((call) => call.path === '/api/v1/admin/openai/generate-auth-url');
    assert.equal(tabCreates.length, 0);
    assert.equal(sentMessages.length, 0);
    assert.equal(generateCall.body.proxy_id, 7);
    assert.deepStrictEqual(result, {
      oauthUrl: 'https://auth.openai.com/authorize?state=oauth-state',
      sub2apiSessionId: 'session-123',
      sub2apiOAuthState: 'oauth-state',
      sub2apiGroupId: 5,
      sub2apiGroupIds: [5],
      sub2apiDraftName: result.sub2apiDraftName,
      sub2apiProxyId: 7,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
