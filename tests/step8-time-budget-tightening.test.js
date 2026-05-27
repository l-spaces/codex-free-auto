const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/steps/fetch-login-code.js', 'utf8');
const globalScope = {};
const api = new Function('self', `${source}; return self.MultiPageBackgroundStep8;`)(globalScope);

function createBudgetCaptureExecutor(options = {}) {
  const {
    remainingBudgetMs = 120000,
    maxRecoveryAttempts = 3,
  } = options;
  const calls = {
    budgets: [],
    resolveCalls: 0,
    rerunStep7: 0,
  };

  const executor = api.createStep8Executor({
    addLog: async () => {},
    chrome: {
      tabs: {
        update: async () => {},
      },
    },
    CLOUDFLARE_TEMP_EMAIL_PROVIDER: 'cloudflare-temp-email',
    confirmCustomVerificationStepBypass: async () => {},
    ensureStep8VerificationPageReady: async () => ({ state: 'verification_page' }),
    rerunStep7ForStep8Recovery: async () => {
      calls.rerunStep7 += 1;
    },
    getOAuthFlowRemainingMs: async () => remainingBudgetMs,
    getOAuthFlowStepTimeoutMs: async (defaultTimeoutMs) => defaultTimeoutMs,
    getMailConfig: () => ({
      provider: 'qq',
      label: 'QQ mail',
      source: 'mail-qq',
      url: 'https://mail.qq.com',
      navigateOnReuse: false,
    }),
    getState: async () => ({
      email: 'user@example.com',
      password: 'secret',
      oauthUrl: 'https://oauth.example/latest',
      loginVerificationRequestedAt: 0,
    }),
    getTabId: async () => 1,
    HOTMAIL_PROVIDER: 'hotmail-api',
    isTabAlive: async () => true,
    isVerificationMailPollingError: (error) => /邮箱轮询结束/.test(String(error?.message || error || '')),
    LUCKMAIL_PROVIDER: 'luckmail-api',
    resolveVerificationStep: async (_step, _state, _mail, resolveOptions) => {
      calls.resolveCalls += 1;
      const budget = await resolveOptions.getRemainingTimeMs({ actionLabel: '登录验证码流程' });
      calls.budgets.push(Number(budget) || 0);
      if (calls.resolveCalls < 3) {
        throw new Error('步骤 8：邮箱轮询结束，但未获取到验证码。');
      }
    },
    reuseOrCreateTab: async () => {},
    setState: async () => {},
    shouldUseCustomRegistrationEmail: () => false,
    sleepWithStop: async () => {},
    STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS: 25000,
    STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS: maxRecoveryAttempts,
    throwIfStopped: () => {},
  });

  return { executor, calls };
}

test('step 8 tightens oauth remaining budget on each local retry attempt', async () => {
  const { executor, calls } = createBudgetCaptureExecutor({
    remainingBudgetMs: 120000,
    maxRecoveryAttempts: 3,
  });

  await executor.executeStep8({
    email: 'user@example.com',
    password: 'secret',
    oauthUrl: 'https://oauth.example/latest',
  });

  assert.deepStrictEqual(calls.budgets, [120000, 93000, 66000]);
  assert.equal(calls.rerunStep7, 0);
});

test('step 8 keeps dynamic remaining budget above floor during local retries', async () => {
  const { executor, calls } = createBudgetCaptureExecutor({
    remainingBudgetMs: 30000,
    maxRecoveryAttempts: 3,
  });

  await executor.executeStep8({
    email: 'user@example.com',
    password: 'secret',
    oauthUrl: 'https://oauth.example/latest',
  });

  assert.deepStrictEqual(calls.budgets, [30000, 23250, 20000]);
  assert.equal(calls.rerunStep7, 0);
});
