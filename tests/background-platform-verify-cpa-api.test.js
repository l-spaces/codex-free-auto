const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

function createDeps(overrides = {}) {
  const logs = [];
  const completed = [];
  const uiCalls = [];

  const deps = {
    addLog: async (message, level = 'info', options = {}) => {
      logs.push({ message, level, step: options.step, stepKey: options.stepKey });
    },
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    closeConflictingTabsForSource: async () => {},
    completeNodeFromBackground: async (step, payload) => {
      completed.push({ step, payload });
    },
    ensureContentScriptReadyOnTab: async () => {},
    getPanelMode: () => 'cpa',
    getTabId: async () => 0,
    isLocalhostOAuthCallbackUrl: (value) => String(value || '').includes('/auth/callback?code='),
    isTabAlive: async () => false,
    normalizeCodex2ApiUrl: (value) => value,
    normalizeSub2ApiUrl: (value) => value,
    rememberSourceLastUrl: async () => {},
    reuseOrCreateTab: async () => 91,
    sendToContentScript: async () => ({}),
    sendToContentScriptResilient: async (source, message, options) => {
      uiCalls.push({ source, message, options });
      return {};
    },
    shouldBypassStep9ForLocalCpa: () => false,
    SUB2API_STEP9_RESPONSE_TIMEOUT_MS: 120000,
    ...overrides,
  };

  return { deps, logs, completed, uiCalls };
}

function loadStep10WithSub2Api() {
  const sub2apiSource = fs.readFileSync('background/sub2api-api.js', 'utf8');
  const step10Source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
  return new Function('self', `${sub2apiSource}\n${step10Source}; return self.MultiPageBackgroundStep10;`)({});
}

function createSub2ApiResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  };
}

test('platform verify module submits CPA callback via management API first', async () => {
  const source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
  const originalFetch = globalThis.fetch;
  let uiCalled = false;
  globalThis.fetch = async (url, options = {}) => {
    assert.equal(url, 'http://localhost:8317/v0/management/oauth-callback');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer cpa-key');
    assert.equal(options.headers['X-Management-Key'], 'cpa-key');
    assert.deepStrictEqual(JSON.parse(options.body), {
      provider: 'codex',
      redirect_url: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
    });
    return {
      ok: true,
      json: async () => ({
        message: 'CPA API 回调提交成功',
      }),
    };
  };

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundStep10;`)({});
    const { deps, logs, completed } = createDeps({
      sendToContentScriptResilient: async () => {
        uiCalled = true;
        return {};
      },
    });
    const executor = api.createStep10Executor(deps);

    await executor.executeStep10({
      panelMode: 'cpa',
      localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
      vpsUrl: 'http://localhost:8317/admin/oauth',
      vpsPassword: 'cpa-key',
    });

    assert.equal(uiCalled, false);
    assert.deepStrictEqual(completed, [
      {
        step: 'platform-verify',
        payload: {
          localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
          verifiedStatus: 'CPA API 回调提交成功',
        },
      },
    ]);
    assert.deepStrictEqual(logs, [
      { message: '正在通过 CPA 管理接口提交回调地址...', level: 'info', step: 10, stepKey: 'platform-verify' },
      { message: 'CPA API 回调提交成功', level: 'ok', step: 10, stepKey: 'platform-verify' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('platform verify module prefers cpaManagementOrigin when provided', async () => {
  const source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    assert.equal(url, 'http://localhost:9999/v0/management/oauth-callback');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer cpa-key');
    assert.equal(options.headers['X-Management-Key'], 'cpa-key');
    return {
      ok: true,
      json: async () => ({
        message: 'CPA API 回调提交成功',
      }),
    };
  };

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundStep10;`)({});
    const { deps, completed } = createDeps();
    const executor = api.createStep10Executor(deps);

    await executor.executeStep10({
      panelMode: 'cpa',
      localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
      cpaManagementOrigin: 'http://localhost:9999',
      vpsUrl: 'http://localhost:8317/admin/oauth',
      vpsPassword: 'cpa-key',
    });

    assert.equal(completed.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('platform verify module fails fast when CPA API submit fails', async () => {
  const source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ message: 'failed to persist oauth callback' }),
  });

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundStep10;`)({});
    const { deps, logs, completed, uiCalls } = createDeps();
    const executor = api.createStep10Executor(deps);

    await assert.rejects(
      () => executor.executeStep10({
        panelMode: 'cpa',
        localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
        vpsUrl: 'http://localhost:8317/admin/oauth',
        vpsPassword: 'cpa-key',
      }),
      /failed to persist oauth callback/
    );

    assert.equal(uiCalls.length, 0);
    assert.equal(completed.length, 0);
    assert.equal(logs[0].message, '正在通过 CPA 管理接口提交回调地址...');
    assert.equal(logs[0].step, 10);
    assert.match(logs[1].message, /CPA 接口提交失败：failed to persist oauth callback/);
    assert.equal(logs[1].step, 10);
    assert.equal(logs[1].level, 'error');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('platform verify module requires management key for CPA API-only flow', async () => {
  const source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return {
      ok: true,
      json: async () => ({}),
    };
  };

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundStep10;`)({});
    const { deps, logs, completed, uiCalls } = createDeps();
    const executor = api.createStep10Executor(deps);

    await assert.rejects(
      () => executor.executeStep10({
        panelMode: 'cpa',
        localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
        vpsUrl: 'http://localhost:8317/admin/oauth',
        vpsPassword: '   ',
      }),
      /尚未配置 CPA 管理密钥/
    );

    assert.equal(fetchCalled, false);
    assert.equal(uiCalls.length, 0);
    assert.equal(completed.length, 0);
    assert.equal(logs.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('platform verify module rejects callback when cpa oauth state mismatches', async () => {
  const source = fs.readFileSync('background/steps/platform-verify.js', 'utf8');
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return {
      ok: true,
      json: async () => ({ message: 'should not happen' }),
    };
  };

  try {
    const api = new Function('self', `${source}; return self.MultiPageBackgroundStep10;`)({});
    const { deps } = createDeps();
    const executor = api.createStep10Executor(deps);

    await assert.rejects(
      () => executor.executeStep10({
        panelMode: 'cpa',
        localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=callback-state',
        cpaOAuthState: 'expected-state',
        vpsUrl: 'http://localhost:8317/admin/oauth',
        vpsPassword: 'cpa-key',
      }),
      /CPA 回调 state 与当前授权会话不匹配/
    );

    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('platform verify module submits Plus visible step 13 to SUB2API via direct API', async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  const sentMessages = [];
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const body = options.body ? JSON.parse(options.body) : null;
    fetchCalls.push({ path: parsed.pathname, method: options.method || 'GET', body });

    if (parsed.pathname === '/api/v1/auth/login') {
      return createSub2ApiResponse({ code: 0, data: { access_token: 'admin-token' } });
    }
    if (parsed.pathname === '/api/v1/admin/groups/all') {
      return createSub2ApiResponse({ code: 0, data: [{ id: 5, name: 'codex', platform: 'openai' }] });
    }
    if (parsed.pathname === '/api/v1/admin/openai/exchange-code') {
      return createSub2ApiResponse({
        code: 0,
        data: {
          access_token: 'openai-access',
          refresh_token: 'openai-refresh',
          email: 'flow@example.com',
        },
      });
    }
    if (parsed.pathname === '/api/v1/admin/accounts') {
      return createSub2ApiResponse({ code: 0, data: { id: 11 } });
    }
    return createSub2ApiResponse({ code: 1, message: `unexpected path ${parsed.pathname}` }, 404);
  };

  const api = loadStep10WithSub2Api();
  const { deps, completed } = createDeps({
    getPanelMode: () => 'sub2api',
    getTabId: async () => 91,
    isTabAlive: async () => true,
    sendToContentScript: async (sourceName, message, options) => {
      sentMessages.push({ sourceName, message, options });
      return { ok: true };
    },
  });
  const executor = api.createStep10Executor(deps);

  try {
    await executor.executeStep10({
      panelMode: 'sub2api',
      visibleStep: 13,
      localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
      sub2apiUrl: 'https://sub.example/admin/accounts',
      sub2apiEmail: 'admin@example.com',
      sub2apiPassword: 'secret',
      sub2apiGroupName: 'codex',
      sub2apiSessionId: 'session-1',
      sub2apiOAuthState: 'oauth-state',
    });

    const exchangeCall = fetchCalls.find((call) => call.path === '/api/v1/admin/openai/exchange-code');
    const createCall = fetchCalls.find((call) => call.path === '/api/v1/admin/accounts');
    assert.equal(sentMessages.length, 0);
    assert.equal(exchangeCall.body.code, 'callback-code');
    assert.equal(exchangeCall.body.state, 'oauth-state');
    assert.deepStrictEqual(createCall.body.group_ids, [5]);
    assert.deepStrictEqual(completed, [{
      step: 'platform-verify',
      payload: {
        localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
        verifiedStatus: 'SUB2API 已创建账号 #11',
      },
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('platform verify module forwards SUB2API account priority to direct create API', async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  const sentMessages = [];
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const body = options.body ? JSON.parse(options.body) : null;
    fetchCalls.push({ path: parsed.pathname, method: options.method || 'GET', body });

    if (parsed.pathname === '/api/v1/auth/login') {
      return createSub2ApiResponse({ code: 0, data: { access_token: 'admin-token' } });
    }
    if (parsed.pathname === '/api/v1/admin/openai/exchange-code') {
      return createSub2ApiResponse({
        code: 0,
        data: {
          access_token: 'openai-access',
          refresh_token: 'openai-refresh',
          email: 'flow@example.com',
        },
      });
    }
    if (parsed.pathname === '/api/v1/admin/accounts') {
      return createSub2ApiResponse({ code: 0, data: { id: 11 } });
    }
    return createSub2ApiResponse({ code: 1, message: `unexpected path ${parsed.pathname}` }, 404);
  };

  const api = loadStep10WithSub2Api();
  const { deps } = createDeps({
    getPanelMode: () => 'sub2api',
    getTabId: async () => 91,
    isTabAlive: async () => true,
    sendToContentScript: async (sourceName, message, options) => {
      sentMessages.push({ sourceName, message, options });
      return { ok: true };
    },
  });
  const executor = api.createStep10Executor(deps);

  try {
    await executor.executeStep10({
      panelMode: 'sub2api',
      localhostUrl: 'http://localhost:1455/auth/callback?code=callback-code&state=oauth-state',
      sub2apiUrl: 'https://sub.example/admin/accounts',
      sub2apiEmail: 'admin@example.com',
      sub2apiPassword: 'secret',
      sub2apiSessionId: 'session-1',
      sub2apiOAuthState: 'oauth-state',
      sub2apiGroupId: 5,
      sub2apiAccountPriority: 2,
    });

    const createCall = fetchCalls.find((call) => call.path === '/api/v1/admin/accounts');
    assert.equal(sentMessages.length, 0);
    assert.equal(createCall.body.priority, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
