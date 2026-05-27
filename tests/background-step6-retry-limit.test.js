const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadStep6Api() {
  const sharedCleanupSource = fs.readFileSync('background/steps/cookie-cleanup.js', 'utf8');
  const source = fs.readFileSync('background/steps/wait-registration-success.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${sharedCleanupSource}\n${source}; return self.MultiPageBackgroundStep6;`)(globalScope);
}

function loadStep7Api() {
  const sharedCleanupSource = fs.readFileSync('background/steps/cookie-cleanup.js', 'utf8');
  const source = fs.readFileSync('background/steps/oauth-login.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${sharedCleanupSource}\n${source}; return self.MultiPageBackgroundStep7;`)(globalScope);
}

test('step 6 waits for registration success and completes from background', async () => {
  const api = loadStep6Api();

  const events = {
    logs: [],
    waits: [],
    completedSteps: [],
  };

  const executor = api.createStep6Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    completeNodeFromBackground: async (step) => {
      events.completedSteps.push(step);
    },
    sleepWithStop: async (ms) => {
      events.waits.push(ms);
    },
  });

  await executor.executeStep6();

  assert.deepStrictEqual(events.waits, [2000]);
  assert.deepStrictEqual(events.completedSteps, ['wait-registration-success']);
  assert.ok(events.logs.some(({ message }) => /等待 2 秒/.test(message)));
});

test('step 6 keeps fixed wait and does not probe step5 submit state', async () => {
  const api = loadStep6Api();

  const events = {
    waits: [],
    probes: 0,
    completedSteps: [],
  };

  const executor = api.createStep6Executor({
    addLog: async () => {},
    completeNodeFromBackground: async (step) => {
      events.completedSteps.push(step);
    },
    registrationSuccessWaitMs: 3000,
    sendToContentScriptResilient: async () => {
      events.probes += 1;
      return {};
    },
    sleepWithStop: async (ms) => {
      events.waits.push(ms);
    },
  });

  await executor.executeStep6();

  assert.equal(events.probes, 0);
  assert.deepStrictEqual(events.waits, [3000]);
  assert.deepStrictEqual(events.completedSteps, ['wait-registration-success']);
});

test('step 6 keeps completion logging concise when cleanup switch is enabled', async () => {
  const api = loadStep6Api();

  const events = {
    logs: [],
    completedSteps: [],
    waits: [],
  };

  const executor = api.createStep6Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    completeNodeFromBackground: async (step) => {
      events.completedSteps.push(step);
    },
    sleepWithStop: async (ms) => {
      events.waits.push(ms);
    },
  });

  await executor.executeStep6({ step6CookieCleanupEnabled: true });

  assert.deepStrictEqual(events.waits, [2000]);
  assert.deepStrictEqual(events.completedSteps, ['wait-registration-success']);
  assert.ok(events.logs.some(({ message }) => /注册成功等待完成。/.test(message)));
  assert.ok(!events.logs.some(({ message }) => /将在步骤 7 开始前执行清理/.test(message)));
});

test('step 6 does not touch cookies APIs even when cleanup switch is enabled', async () => {
  const api = loadStep6Api();

  const events = {
    cookieQueries: 0,
    removedCookies: 0,
    browsingDataCalls: 0,
  };

  const executor = api.createStep6Executor({
    addLog: async () => {},
    chrome: {
      cookies: {
        getAll: async () => {
          events.cookieQueries += 1;
          return [];
        },
        remove: async () => {
          events.removedCookies += 1;
          return null;
        },
      },
      browsingData: {
        removeCookies: async () => {
          events.browsingDataCalls += 1;
        },
      },
    },
    completeNodeFromBackground: async () => {},
    sleepWithStop: async () => {},
  });

  await executor.executeStep6({
    step6CookieCleanupEnabled: true,
  });

  assert.equal(events.cookieQueries, 0);
  assert.equal(events.removedCookies, 0);
  assert.equal(events.browsingDataCalls, 0);
});

test('step 6 sends ACCOUNT_WRITE_ON_STEP6 after registration success when write-account is enabled', async () => {
  const api = loadStep6Api();
  const events = {
    completedSteps: [],
    messages: [],
    waits: [],
  };

  const executor = api.createStep6Executor({
    addLog: async () => {},
    chrome: {
      runtime: {
        sendMessage: async (message) => {
          events.messages.push(message);
          return { ok: true, written: true };
        },
      },
    },
    completeNodeFromBackground: async (step) => {
      events.completedSteps.push(step);
    },
    registrationSuccessWaitMs: 0,
    sleepWithStop: async (ms) => {
      events.waits.push(ms);
    },
  });

  await executor.executeStep6({
    isAccountWriteEnabled: true,
    email: 'new-user@example.com',
    accountWriteFlowType: 'full',
    accountWriteFileName: 'full-2026-05-24.json',
  });

  assert.deepStrictEqual(events.waits, []);
  assert.deepStrictEqual(events.completedSteps, ['wait-registration-success']);
  assert.equal(events.messages.length, 1);
  assert.deepStrictEqual(events.messages[0], {
    type: 'ACCOUNT_WRITE_ON_STEP6',
    source: 'background',
    payload: {
      email: 'new-user@example.com',
      flowType: 'full',
      fileName: 'full-2026-05-24.json',
    },
  });
});

test('step 6 keeps workflow completion when account write request fails', async () => {
  const api = loadStep6Api();
  const events = {
    completedSteps: [],
    logs: [],
  };

  const executor = api.createStep6Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    chrome: {
      runtime: {
        sendMessage: async () => ({ error: '目录权限已失效' }),
      },
    },
    completeNodeFromBackground: async (step) => {
      events.completedSteps.push(step);
    },
    registrationSuccessWaitMs: 0,
    sleepWithStop: async () => {},
  });

  await executor.executeStep6({
    isAccountWriteEnabled: true,
    email: 'new-user@example.com',
  });

  assert.deepStrictEqual(events.completedSteps, ['wait-registration-success']);
  assert.ok(events.logs.some(({ message, level }) => level === 'warn' && /写入账号失败/.test(message)));
});

test('step 7 runs pre-auth cookie cleanup only once across retries', async () => {
  const api = loadStep7Api();
  const events = {
    browsingDataCalls: [],
    completed: [],
    cookieQueries: [],
    logs: [],
    refreshCalls: 0,
    removedCookies: [],
    sendCalls: 0,
  };

  const executor = api.createStep7Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    chrome: {
      cookies: {
        getAllCookieStores: async () => [{ id: 'store-a' }],
        getAll: async (query) => {
          events.cookieQueries.push(query);
          if (query?.domain === 'chatgpt.com') {
            return [{ domain: '.chatgpt.com', path: '/auth', name: 'chatgpt-session', storeId: 'store-a' }];
          }
          if (query?.domain === 'openai.com') {
            return [{ domain: '.auth.openai.com', path: '/u', name: 'openai-session', storeId: 'store-a' }];
          }
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
    completeNodeFromBackground: async (step, payload) => {
      events.completed.push({ step, payload });
    },
    getErrorMessage: (error) => error?.message || String(error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => {
      events.refreshCalls += 1;
      return `https://oauth.example/${events.refreshCalls}`;
    },
    reuseOrCreateTab: async () => {},
    sendToContentScriptResilient: async () => {
      events.sendCalls += 1;
      if (events.sendCalls === 1) {
        return {
          step6Outcome: 'recoverable',
          state: 'email_page',
          message: '当前仍停留在邮箱页。',
        };
      }
      return {
        step6Outcome: 'success',
        state: 'verification_page',
      };
    },
    STEP6_MAX_ATTEMPTS: 3,
    throwIfStopped: () => {},
  });

  await executor.executeStep7({
    email: 'user@example.com',
    password: 'secret',
    step6CookieCleanupEnabled: true,
  });

  assert.deepStrictEqual(events.cookieQueries, [
    { storeId: 'store-a', domain: 'chatgpt.com' },
    { storeId: 'store-a', domain: 'openai.com' },
  ]);
  assert.deepStrictEqual(events.removedCookies, [
    {
      url: 'https://chatgpt.com/auth',
      name: 'chatgpt-session',
      storeId: 'store-a',
    },
    {
      url: 'https://auth.openai.com/u',
      name: 'openai-session',
      storeId: 'store-a',
    },
  ]);
  assert.equal(events.browsingDataCalls.length, 1);
  assert.equal(events.refreshCalls, 2);
  assert.equal(events.sendCalls, 2);
  assert.equal(
    events.logs.filter(({ message }) => /授权前已清理/.test(message)).length,
    1
  );
  assert.equal(
    events.logs.some(({ message }) => /已开启授权前 Cookies 清理/.test(message)),
    false
  );
  assert.equal(events.completed.length, 1);
});

test('step 7 retries up to configured limit and then fails', async () => {
  const api = loadStep7Api();

  const events = {
    refreshCalls: 0,
    sendCalls: 0,
    completed: 0,
  };

  const executor = api.createStep7Executor({
    addLog: async () => {},
    completeNodeFromBackground: async () => {
      events.completed += 1;
    },
    getErrorMessage: (error) => error?.message || String(error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => {
      events.refreshCalls += 1;
      return `https://oauth.example/${events.refreshCalls}`;
    },
    reuseOrCreateTab: async () => {},
    sendToContentScriptResilient: async () => {
      events.sendCalls += 1;
      return {
        step6Outcome: 'recoverable',
        state: 'email_page',
        message: '当前仍停留在邮箱页。',
      };
    },
    STEP6_MAX_ATTEMPTS: 3,
    throwIfStopped: () => {},
  });

  await assert.rejects(
    () => executor.executeStep7({ email: 'user@example.com', password: 'secret' }),
    /已重试 2 次，仍未成功/
  );

  assert.equal(events.refreshCalls, 3);
  assert.equal(events.sendCalls, 3);
  assert.equal(events.completed, 0);
});

test('step 7 starts a new oauth timeout window for each refreshed oauth url', async () => {
  const api = loadStep7Api();

  const events = {
    startedWindows: [],
    timeoutRequests: [],
  };

  const executor = api.createStep7Executor({
    addLog: async () => {},
    completeNodeFromBackground: async () => {},
    getErrorMessage: (error) => error?.message || String(error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getOAuthFlowStepTimeoutMs: async (defaultTimeoutMs, options) => {
      events.timeoutRequests.push({ defaultTimeoutMs, options });
      return 5000;
    },
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => 'https://oauth.example/latest',
    reuseOrCreateTab: async () => {},
    sendToContentScriptResilient: async (_source, _message, options) => ({
      step6Outcome: 'success',
      state: 'verification_page',
      usedTimeoutMs: options.timeoutMs,
    }),
    startOAuthFlowTimeoutWindow: async (payload) => {
      events.startedWindows.push(payload);
    },
    STEP6_MAX_ATTEMPTS: 3,
    throwIfStopped: () => {},
  });

  await executor.executeStep7({ email: 'user@example.com', password: 'secret' });

  assert.deepStrictEqual(events.startedWindows, [
    { step: 7, oauthUrl: 'https://oauth.example/latest' },
  ]);
  assert.deepStrictEqual(events.timeoutRequests, [
    {
      defaultTimeoutMs: 180000,
      options: {
        step: 7,
        actionLabel: 'OAuth 登录并进入验证码页',
        oauthUrl: 'https://oauth.example/latest',
      },
    },
  ]);
});

test('step 7 forwards direct OAuth consent skip metadata when completing', async () => {
  const api = loadStep7Api();

  const events = {
    completions: [],
  };

  const executor = api.createStep7Executor({
    addLog: async () => {},
    completeNodeFromBackground: async (step, payload) => {
      events.completions.push({ step, payload });
    },
    getErrorMessage: (error) => error?.message || String(error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => 'https://oauth.example/latest',
    reuseOrCreateTab: async () => {},
    sendToContentScriptResilient: async () => ({
      step6Outcome: 'success',
      state: 'oauth_consent_page',
      skipLoginVerificationStep: true,
      directOAuthConsentPage: true,
    }),
    STEP6_MAX_ATTEMPTS: 3,
    throwIfStopped: () => {},
  });

  await executor.executeStep7({
    email: 'user@example.com',
    password: 'secret',
    visibleStep: 10,
  });

  assert.deepStrictEqual(events.completions, [
    {
      step: 'oauth-login',
      payload: {
        accountIdentifierType: 'email',
        accountIdentifier: 'user@example.com',
        loginVerificationRequestedAt: null,
        skipLoginVerificationStep: true,
        directOAuthConsentPage: true,
      },
    },
  ]);
});

test('step 7 stops immediately when management secret is missing', async () => {
  const api = loadStep7Api();

  const events = {
    refreshCalls: 0,
    sendCalls: 0,
    logs: [],
  };

  const executor = api.createStep7Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    completeNodeFromBackground: async () => {},
    getErrorMessage: (error) => error?.message || String(error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => {
      events.refreshCalls += 1;
      throw new Error('尚未配置 Codex2API 管理密钥，请先在侧边栏填写。');
    },
    reuseOrCreateTab: async () => {},
    sendToContentScriptResilient: async () => {
      events.sendCalls += 1;
      return { step6Outcome: 'success' };
    },
    STEP6_MAX_ATTEMPTS: 3,
    throwIfStopped: () => {},
  });

  await assert.rejects(
    () => executor.executeStep7({ email: 'user@example.com', password: 'secret' }),
    /管理密钥/
  );

  assert.equal(events.refreshCalls, 1);
  assert.equal(events.sendCalls, 0);
  assert.ok(events.logs.some(({ message }) => /管理密钥缺失或错误，不再重试，当前流程停止/.test(message)));
  assert.ok(!events.logs.some(({ message }) => /准备重试/.test(message)));
});

test('step 7 stops immediately when management secret is invalid', async () => {
  const api = loadStep7Api();

  const events = {
    refreshCalls: 0,
    logs: [],
  };

  const executor = api.createStep7Executor({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    completeNodeFromBackground: async () => {},
    getErrorMessage: (error) => error?.message || String(error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => {
      events.refreshCalls += 1;
      throw new Error('Codex2API 请求失败（HTTP 401）。X-Admin-Key 无效或未授权。');
    },
    reuseOrCreateTab: async () => {},
    sendToContentScriptResilient: async () => ({ step6Outcome: 'success' }),
    STEP6_MAX_ATTEMPTS: 3,
    throwIfStopped: () => {},
  });

  await assert.rejects(
    () => executor.executeStep7({ email: 'user@example.com', password: 'secret' }),
    /401|未授权|无效/
  );

  assert.equal(events.refreshCalls, 1);
  assert.ok(events.logs.some(({ message }) => /管理密钥缺失或错误，不再重试，当前流程停止/.test(message)));
  assert.ok(!events.logs.some(({ message }) => /准备重试/.test(message)));
});
