const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function loadCpaApiModule() {
  const source = fs.readFileSync('background/cpa-api.js', 'utf8');
  return new Function('self', `${source}; return self.MultiPageBackgroundCpaApi;`)({});
}

function encodeBase64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createJwtToken(payload = {}) {
  return [
    encodeBase64UrlJson({ alg: 'HS256', typ: 'JWT' }),
    encodeBase64UrlJson(payload),
    'signature',
  ].join('.');
}

test('cpa api imports current ChatGPT session through management auth-files endpoint', async () => {
  const apiModule = loadCpaApiModule();
  const logs = [];
  const fetchCalls = [];
  const expiresAt = '2026-05-20T12:34:56.000Z';
  const accessToken = createJwtToken({
    exp: Math.floor(Date.parse(expiresAt) / 1000),
    email: 'jwt@example.com',
    'https://api.openai.com/auth': {
      chatgpt_account_id: 'acct_123',
      chatgpt_plan_type: 'free',
      chatgpt_user_id: 'user_123',
    },
    'https://api.openai.com/profile': {
      email: 'profile@example.com',
    },
  });

  const api = apiModule.createCpaApi({
    addLog: async (message, level = 'info', options = {}) => {
      logs.push({ message, level, step: options.step, stepKey: options.stepKey });
    },
    fetchImpl: async (url, options = {}) => {
      const parsed = new URL(url);
      const body = options.body ? JSON.parse(options.body) : null;
      fetchCalls.push({
        path: parsed.pathname,
        search: parsed.search,
        method: options.method || 'POST',
        headers: options.headers || {},
        body,
      });

      if (parsed.pathname === '/v0/management/auth-files') {
        return createJsonResponse({});
      }

      return createJsonResponse({ message: `unexpected path ${parsed.pathname}` }, 404);
    },
  });

  const result = await api.importCurrentChatGptSession({
    vpsUrl: 'https://cpa.example.com/management.html#/oauth',
    vpsPassword: 'management-key',
    session: {
      accessToken,
      expires: expiresAt,
      user: {
        email: 'flow@example.com',
      },
      account: {
        id: 'acct_123',
        planType: 'free',
      },
    },
    accessToken,
    email: 'registration@example.com',
    accountIdentifierType: 'email',
    accountIdentifier: 'identifier@example.com',
  }, {
    logLabel: '步骤 10',
    logOptions: { step: 10, stepKey: 'platform-verify' },
  });

  const importCall = fetchCalls.find((call) => call.path === '/v0/management/auth-files');
  assert.ok(importCall, 'expected CPA auth-files import call');
  assert.equal(importCall.method, 'POST');
  assert.equal(importCall.headers.Authorization, 'Bearer management-key');
  assert.equal(importCall.headers['X-Management-Key'], 'management-key');
  assert.equal(
    decodeURIComponent(new URLSearchParams(importCall.search).get('name')),
    'codex-flow@example.com-free.json'
  );
  assert.equal(importCall.body.type, 'codex');
  assert.equal(importCall.body.account_id, 'acct_123');
  assert.equal(importCall.body.chatgpt_account_id, 'acct_123');
  assert.equal(importCall.body.email, 'flow@example.com');
  assert.equal(importCall.body.plan_type, 'free');
  assert.equal(importCall.body.chatgpt_plan_type, 'free');
  assert.equal(importCall.body.access_token, accessToken);
  assert.equal(importCall.body.id_token_synthetic, true);
  assert.match(String(importCall.body.id_token || ''), /\.synthetic$/);
  assert.equal(importCall.body.expired, expiresAt);
  assert.equal(Object.prototype.hasOwnProperty.call(importCall.body, 'refresh_token'), false);
  assert.equal(result.verifiedStatus, 'CPA 会话导入完成：flow@example.com');
  assert.equal(
    logs.some((entry) => entry.level === 'warn' && /refresh_token/.test(entry.message)),
    true
  );
});

test('cpa api falls back to registration email when session has no readable email', () => {
  const apiModule = loadCpaApiModule();
  const accessToken = createJwtToken({
    exp: Math.floor(Date.parse('2026-05-20T12:34:56.000Z') / 1000),
    'https://api.openai.com/auth': {
      chatgpt_account_id: 'acct_456',
      chatgpt_plan_type: 'free',
      chatgpt_user_id: 'user_456',
    },
  });

  const api = apiModule.createCpaApi();
  const result = api.buildCpaSessionAuthJson({
    session: {
      accessToken,
      user: {
        name: 'Flow User',
      },
    },
    accessToken,
    email: 'registration@example.com',
    accountIdentifierType: 'email',
    accountIdentifier: 'identifier@example.com',
  });

  assert.equal(result.email, 'registration@example.com');
  assert.equal(result.authJson.email, 'registration@example.com');
  assert.equal(result.fileName, 'codex-registration@example.com-free.json');
});

test('cpa api preserves provided id_token and refresh_token when available', () => {
  const apiModule = loadCpaApiModule();
  const accessToken = createJwtToken({
    exp: Math.floor(Date.parse('2026-05-20T12:34:56.000Z') / 1000),
    'https://api.openai.com/auth': {
      chatgpt_account_id: 'acct_789',
      chatgpt_plan_type: 'free',
      chatgpt_user_id: 'user_789',
    },
  });

  const api = apiModule.createCpaApi();
  const result = api.buildCpaSessionAuthJson({
    session: {
      accessToken,
      user: {
        email: 'session@example.com',
      },
    },
    accessToken,
    id_token: 'provided-id-token',
    refresh_token: 'refresh-token-1',
    session_token: 'session-token-1',
  });

  assert.equal(result.authJson.id_token, 'provided-id-token');
  assert.equal(Object.prototype.hasOwnProperty.call(result.authJson, 'id_token_synthetic'), false);
  assert.equal(result.authJson.refresh_token, 'refresh-token-1');
  assert.equal(result.authJson.session_token, 'session-token-1');
  assert.equal(result.hasRefreshToken, true);
});
