const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function createLoggingStatusHarness(overrides = {}) {
  const source = fs.readFileSync('background/logging-status.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundLoggingStatus;`)(globalScope);
  const persisted = {
    logs: [],
    stepStatuses: {},
  };
  const sentMessages = [];
  let setStateCalls = 0;
  let setLogsStateCalls = 0;
  const loggingStatusConfig = {
    chrome: {
      runtime: {
        sendMessage(message) {
          sentMessages.push(message);
          return Promise.resolve();
        },
      },
    },
    DEFAULT_STATE: { stepStatuses: {}, nodeStatuses: {} },
    getState: async () => ({ ...persisted }),
    isRecoverableStep9AuthFailure: () => false,
    LOG_PREFIX: '[test]',
    setState: async (updates) => {
      setStateCalls += 1;
      Object.assign(persisted, updates || {});
    },
    STOP_ERROR_MESSAGE: 'stopped',
    ...overrides,
  };
  if (typeof loggingStatusConfig.setLogsState === 'function') {
    const rawSetLogsState = loggingStatusConfig.setLogsState;
    loggingStatusConfig.setLogsState = async (...args) => {
      setLogsStateCalls += 1;
      return rawSetLogsState(...args);
    };
  }
  const loggingStatus = api.createLoggingStatus(loggingStatusConfig);
  return {
    loggingStatus,
    persisted,
    sentMessages,
    getSetStateCalls: () => setStateCalls,
    getSetLogsStateCalls: () => setLogsStateCalls,
  };
}

test('background imports logging/status module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /background\/logging-status\.js/);
});

test('logging/status module exposes a factory', () => {
  const source = fs.readFileSync('background/logging-status.js', 'utf8');
  const globalScope = {};

  const api = new Function('self', `${source}; return self.MultiPageBackgroundLoggingStatus;`)(globalScope);

  assert.equal(typeof api?.createLoggingStatus, 'function');
});

test('logging/status add-phone detection ignores step 2 phone-entry switch failures', () => {
  const source = fs.readFileSync('background/logging-status.js', 'utf8');
  const globalScope = {};
  const api = new Function('self', `${source}; return self.MultiPageBackgroundLoggingStatus;`)(globalScope);

  const loggingStatus = api.createLoggingStatus({
    chrome: { runtime: { sendMessage() { return Promise.resolve(); } } },
    DEFAULT_STATE: { stepStatuses: {} },
    getState: async () => ({ stepStatuses: {} }),
    isRecoverableStep9AuthFailure: () => false,
    LOG_PREFIX: '[test]',
    setState: async () => {},
    STOP_ERROR_MESSAGE: 'stopped',
  });

  assert.equal(
    loggingStatus.isAddPhoneAuthFailure('Step 2: the signup dialog is still in phone entry mode and has not switched back to email entry. URL: https://chatgpt.com/'),
    false
  );
  assert.equal(
    loggingStatus.isAddPhoneAuthFailure('Step 8: verification submitted but the auth flow entered the phone number page. URL: https://auth.openai.com/add-phone'),
    true
  );
  assert.equal(
    loggingStatus.isAddPhoneAuthFailure('Step 9: auth page entered phone verification page. URL: https://auth.openai.com/phone-verification'),
    true
  );
  assert.equal(
    loggingStatus.isAddPhoneAuthFailure('ADD_PHONE_REQUIRED::步骤 8：验证码提交后页面进入手机号页面，当前流程无法继续自动授权。'),
    true
  );
  assert.equal(loggingStatus.getLoginAuthStateLabel('phone_verification_page'), '手机验证码页');
  assert.equal(loggingStatus.getLoginAuthStateLabel('add_email_page'), '添加邮箱页');
  assert.equal(loggingStatus.getLoginAuthStateLabel('oauth_consent_page'), 'OAuth 授权页');
});

test('logging/status batches info logs before flushing', async () => {
  const harness = createLoggingStatusHarness({
    logFlushIntervalMs: 1000,
    logFlushBatchSize: 10,
    logMergeWindowMs: 0,
  });
  await harness.loggingStatus.addLog('A');
  await harness.loggingStatus.addLog('B');
  assert.equal(harness.getSetStateCalls(), 0);
  await harness.loggingStatus.flushLogs();
  assert.equal(harness.getSetStateCalls(), 1);
  assert.equal(Array.isArray(harness.persisted.logs), true);
  assert.equal(harness.persisted.logs.length, 2);
});

test('logging/status merges repeated high-frequency logs', async () => {
  const harness = createLoggingStatusHarness({
    logFlushIntervalMs: 1000,
    logFlushBatchSize: 10,
    logMergeWindowMs: 5000,
    logMergeLevels: ['info', 'warn'],
  });
  await harness.loggingStatus.addLog('same message', 'info', { step: 2, stepKey: 'submit-signup-email' });
  await harness.loggingStatus.addLog('same message', 'info', { step: 2, stepKey: 'submit-signup-email' });
  await harness.loggingStatus.flushLogs();
  assert.equal(harness.persisted.logs.length, 1);
  assert.equal(harness.persisted.logs[0].repeatCount, 2);
  assert.equal(harness.sentMessages[0]?.type, 'LOG_ENTRY');
  assert.equal(harness.sentMessages[1]?.type, 'LOG_ENTRY_REPEAT');
});

test('logging/status flushes error logs immediately', async () => {
  const harness = createLoggingStatusHarness({
    logFlushIntervalMs: 5000,
    logFlushBatchSize: 99,
    logMergeWindowMs: 0,
  });
  await harness.loggingStatus.addLog('fatal', 'error');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(harness.getSetStateCalls() > 0, true);
  assert.equal(harness.persisted.logs.length, 1);
  assert.equal(harness.persisted.logs[0].level, 'error');
});

test('logging/status uses lightweight setLogsState path when available', async () => {
  let lightweightLogs = [];
  const harness = createLoggingStatusHarness({
    setLogsState: async (logs) => {
      lightweightLogs = Array.isArray(logs) ? logs.slice() : [];
    },
    logFlushIntervalMs: 1000,
    logFlushBatchSize: 10,
    logMergeWindowMs: 0,
  });
  await harness.loggingStatus.addLog('A');
  await harness.loggingStatus.flushLogs();
  assert.equal(harness.getSetLogsStateCalls(), 1);
  assert.equal(harness.getSetStateCalls(), 0);
  assert.equal(lightweightLogs.length, 1);
});
