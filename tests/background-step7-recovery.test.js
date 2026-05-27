const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/steps/fetch-login-code.js', 'utf8');
const globalScope = {};
const api = new Function('self', `${source}; return self.MultiPageBackgroundStep8;`)(globalScope);

test('step 8 submits login verification directly without replaying step 7', async () => {
  const calls = {
    ensureReady: 0,
    rerunStep7: 0,
    resolveOptions: null,
  };
  const realDateNow = Date.now;
  Date.now = () => 123456;

  const executor = api.createStep8Executor({
    addLog: async () => {},
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    CLOUDFLARE_TEMP_EMAIL_PROVIDER: 'cloudflare-temp-email',
    confirmCustomVerificationStepBypass: async () => {},
    ensureStep8VerificationPageReady: async () => {
      calls.ensureReady += 1;
      return { state: 'verification_page', displayedEmail: 'display.user@example.com' };
    },
    rerunStep7ForStep8Recovery: async () => {
      calls.rerunStep7 += 1;
    },
    getOAuthFlowRemainingMs: async () => 5000,
    getOAuthFlowStepTimeoutMs: async (defaultTimeoutMs) => Math.min(defaultTimeoutMs, 5000),
    getMailConfig: () => ({
      provider: 'qq',
      label: 'QQ 邮箱',
      source: 'mail-qq',
      url: 'https://mail.qq.com',
      navigateOnReuse: false,
    }),
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    getTabId: async (sourceName) => (sourceName === 'signup-page' ? 1 : 2),
    HOTMAIL_PROVIDER: 'hotmail-api',
    isTabAlive: async () => true,
    isVerificationMailPollingError: () => false,
    LUCKMAIL_PROVIDER: 'luckmail-api',
    resolveVerificationStep: async (_step, _state, _mail, options) => {
      calls.resolveOptions = options;
    },
    reuseOrCreateTab: async () => {},
    setState: async () => {},
    shouldUseCustomRegistrationEmail: () => false,
    STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS: 25000,
    STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS: 8,
    throwIfStopped: () => {},
  });

  try {
    await executor.executeStep8({
      email: 'user@example.com',
      password: 'secret',
      oauthUrl: 'https://oauth.example/latest',
    });
  } finally {
    Date.now = realDateNow;
  }

  assert.equal(calls.ensureReady, 1);
  assert.equal(calls.rerunStep7, 0);
  assert.equal(calls.resolveOptions.filterAfterTimestamp, 123456);
  assert.equal(Boolean(calls.resolveOptions.allowPhoneVerificationPage), false);
  assert.equal(Boolean(calls.resolveOptions.allowAddEmailPage), false);
});

test('step 8 completes directly when auth page is already on OAuth consent page', async () => {
  const calls = {
    completed: [],
    resolveCalls: 0,
  };

  const executor = api.createStep8Executor({
    addLog: async () => {},
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    CLOUDFLARE_TEMP_EMAIL_PROVIDER: 'cloudflare-temp-email',
    completeNodeFromBackground: async (step, payload) => {
      calls.completed.push({ step, payload });
    },
    confirmCustomVerificationStepBypass: async () => {},
    ensureStep8VerificationPageReady: async () => ({
      state: 'oauth_consent_page',
      consentReady: true,
      url: 'https://auth.openai.com/authorize/resume',
    }),
    rerunStep7ForStep8Recovery: async () => {},
    getOAuthFlowRemainingMs: async () => 5000,
    getOAuthFlowStepTimeoutMs: async (defaultTimeoutMs) => Math.min(defaultTimeoutMs, 5000),
    getMailConfig: () => ({
      provider: 'qq',
      label: 'QQ 邮箱',
      source: 'mail-qq',
      url: 'https://mail.qq.com',
      navigateOnReuse: false,
    }),
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    getTabId: async (sourceName) => (sourceName === 'signup-page' ? 1 : 2),
    HOTMAIL_PROVIDER: 'hotmail-api',
    isTabAlive: async () => true,
    isVerificationMailPollingError: () => false,
    LUCKMAIL_PROVIDER: 'luckmail-api',
    resolveVerificationStep: async () => {
      calls.resolveCalls += 1;
    },
    reuseOrCreateTab: async () => {},
    setState: async () => {},
    shouldUseCustomRegistrationEmail: () => false,
    STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS: 25000,
    STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS: 8,
    throwIfStopped: () => {},
  });

  await executor.executeStep8({
    email: 'user@example.com',
    password: 'secret',
    oauthUrl: 'https://oauth.example/latest',
    visibleStep: 8,
  });

  assert.equal(calls.resolveCalls, 0);
  assert.deepStrictEqual(calls.completed, [
    {
      step: 'fetch-login-code',
      payload: {
        loginVerificationRequestedAt: null,
        skipLoginVerificationStep: true,
        directOAuthConsentPage: true,
      },
    },
  ]);
});

test('post-login phone verification still fails when auth page enters add-phone', async () => {
  const executor = api.createStep8Executor({
    addLog: async () => {},
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    getTabId: async () => 1,
    sendToContentScriptResilient: async () => ({
      state: 'add_phone_page',
      url: 'https://auth.openai.com/add-phone',
    }),
  });

  await assert.rejects(
    () => executor.executePostLoginPhoneVerification({
      oauthUrl: 'https://oauth.example/latest',
      visibleStep: 9,
    }),
    /当前流程无法继续自动授权/
  );
});

test('step 8 does not open a mail tab for YYDS Mail provider', async () => {
  const calls = {
    tabReuses: [],
    resolveCalls: 0,
  };

  const executor = api.createStep8Executor({
    addLog: async () => {},
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    CLOUDFLARE_TEMP_EMAIL_PROVIDER: 'cloudflare-temp-email',
    CLOUD_MAIL_PROVIDER: 'cloudmail',
    confirmCustomVerificationStepBypass: async () => {},
    ensureStep8VerificationPageReady: async () => ({ state: 'verification_page', displayedEmail: 'display.user@example.com' }),
    rerunStep7ForStep8Recovery: async () => {},
    getOAuthFlowRemainingMs: async () => 5000,
    getOAuthFlowStepTimeoutMs: async (defaultTimeoutMs) => Math.min(defaultTimeoutMs, 5000),
    getMailConfig: () => ({
      provider: 'yyds-mail',
      label: 'YYDS Mail',
    }),
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    getTabId: async (sourceName) => (sourceName === 'signup-page' ? 1 : 2),
    HOTMAIL_PROVIDER: 'hotmail-api',
    LUCKMAIL_PROVIDER: 'luckmail-api',
    GPTMAIL_PROVIDER: 'gptmail',
    YYDS_MAIL_PROVIDER: 'yyds-mail',
    isTabAlive: async () => false,
    isVerificationMailPollingError: () => false,
    resolveVerificationStep: async () => {
      calls.resolveCalls += 1;
    },
    reuseOrCreateTab: async (source, url) => {
      calls.tabReuses.push({ source, url });
    },
    setState: async () => {},
    shouldUseCustomRegistrationEmail: () => false,
    STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS: 25000,
    STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS: 8,
    throwIfStopped: () => {},
  });

  await executor.executeStep8({
    email: 'user@example.com',
    password: 'secret',
    oauthUrl: 'https://oauth.example/latest',
    visibleStep: 8,
  });

  assert.equal(calls.resolveCalls, 1);
  assert.deepStrictEqual(calls.tabReuses, []);
});

test('step 8 skips opening mail tab when source or url is missing', async () => {
  const calls = {
    logs: [],
    tabReuses: [],
  };

  const executor = api.createStep8Executor({
    addLog: async (message, level) => {
      calls.logs.push({ message, level: level || 'info' });
    },
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    CLOUDFLARE_TEMP_EMAIL_PROVIDER: 'cloudflare-temp-email',
    CLOUD_MAIL_PROVIDER: 'cloudmail',
    confirmCustomVerificationStepBypass: async () => {},
    ensureStep8VerificationPageReady: async () => ({ state: 'verification_page', displayedEmail: 'display.user@example.com' }),
    rerunStep7ForStep8Recovery: async () => {},
    getOAuthFlowRemainingMs: async () => 5000,
    getOAuthFlowStepTimeoutMs: async (defaultTimeoutMs) => Math.min(defaultTimeoutMs, 5000),
    getMailConfig: () => ({
      provider: 'qq',
      label: 'QQ 邮箱',
      source: 'qq-mail',
      url: '',
    }),
    getState: async () => ({ email: 'user@example.com', password: 'secret' }),
    getTabId: async (sourceName) => (sourceName === 'signup-page' ? 1 : 2),
    HOTMAIL_PROVIDER: 'hotmail-api',
    LUCKMAIL_PROVIDER: 'luckmail-api',
    GPTMAIL_PROVIDER: 'gptmail',
    isTabAlive: async () => false,
    isVerificationMailPollingError: () => false,
    resolveVerificationStep: async () => {},
    reuseOrCreateTab: async (source, url) => {
      calls.tabReuses.push({ source, url });
    },
    setState: async () => {},
    shouldUseCustomRegistrationEmail: () => false,
    STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS: 25000,
    STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS: 8,
    throwIfStopped: () => {},
  });

  await executor.executeStep8({
    email: 'user@example.com',
    password: 'secret',
    oauthUrl: 'https://oauth.example/latest',
    visibleStep: 8,
  });

  assert.deepStrictEqual(calls.tabReuses, []);
  assert.equal(
    calls.logs.some((entry) => /缺少.*source.*url/.test(String(entry.message || ''))),
    true
  );
});
