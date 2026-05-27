const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports message router module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /background\/message-router\.js/);
});

test('background persists duck api authorization setting by default', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  const defaultsStart = source.indexOf('const PERSISTED_SETTING_DEFAULTS = {');
  const defaultsEnd = source.indexOf('const PERSISTED_SETTING_KEYS = Object.keys(PERSISTED_SETTING_DEFAULTS);');
  const defaultsBlock = source.slice(defaultsStart, defaultsEnd);

  assert.match(defaultsBlock, /duckApiAuthorization:\s*''/);
});

test('message router module exposes a factory', () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = {};

  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);

  assert.equal(typeof api?.createMessageRouter, 'function');
});

test('RESET clears account run history and leaves logs empty', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const calls = [];

  const router = api.createMessageRouter({
    addLog: async (message, level = 'info') => {
      calls.push(['addLog', message, level]);
    },
    clearAccountRunHistory: async (...args) => {
      calls.push(['clearAccountRunHistory', ...args]);
      return { clearedCount: 2 };
    },
    clearAutoRunTimerAlarm: async () => {
      calls.push(['clearAutoRunTimerAlarm']);
    },
    clearStopRequest: () => {
      calls.push(['clearStopRequest']);
    },
    resetState: async () => {
      calls.push(['resetState']);
    },
  });

  const response = await router.handleMessage({
    type: 'RESET',
    source: 'sidepanel',
  });

  assert.deepEqual(response, {
    ok: true,
    clearedAccountRunHistoryCount: 2,
  });
  assert.deepEqual(calls, [
    ['clearStopRequest'],
    ['clearAutoRunTimerAlarm'],
    ['resetState'],
    ['clearAccountRunHistory', null, { suppressLog: true }],
  ]);
});

test('SAVE_SETTING keeps duck authorization in local persistence only', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const broadcasts = [];
  const persistedUpdates = [];
  const sessionUpdates = [];
  let state = {
    duckApiAuthorization: '',
    plusModeEnabled: false,
    plusPaymentMethod: 'paypal',
  };

  const router = api.createMessageRouter({
    addLog: async () => {},
    buildLuckmailSessionSettingsPayload: () => ({}),
    buildPersistentSettingsPayload: (input = {}) => {
      if (!Object.prototype.hasOwnProperty.call(input, 'duckApiAuthorization')) {
        return {};
      }
      return {
        duckApiAuthorization: String(input.duckApiAuthorization || '').trim(),
      };
    },
    broadcastDataUpdate: (payload) => broadcasts.push(payload),
    getState: async () => ({ ...state }),
    setPersistentSettings: async (updates) => {
      persistedUpdates.push({ ...updates });
      state = { ...state, ...updates };
    },
    setState: async (updates) => {
      sessionUpdates.push({ ...updates });
      state = { ...state, ...updates };
    },
  });

  const response = await router.handleMessage({
    type: 'SAVE_SETTING',
    payload: {
      duckApiAuthorization: 'duck-token-123',
    },
  });

  assert.equal(response.ok, true);
  assert.equal(persistedUpdates.length, 1);
  assert.equal(persistedUpdates[0].duckApiAuthorization, 'duck-token-123');
  assert.equal(sessionUpdates.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(sessionUpdates[0], 'duckApiAuthorization'), false);
  assert.equal(
    broadcasts.some((payload) => Object.prototype.hasOwnProperty.call(payload, 'duckApiAuthorization')),
    false
  );
  assert.equal(response.state.duckApiAuthorization, 'duck-token-123');
});

test('SAVE_SETTING broadcasts operation delay setting without background success log', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const broadcasts = [];
  const logs = [];
  let state = { operationDelayEnabled: true, plusModeEnabled: false, plusPaymentMethod: 'paypal' };

  const router = api.createMessageRouter({
    addLog: async (message, level = 'info') => logs.push({ message, level }),
    buildLuckmailSessionSettingsPayload: () => ({}),
    buildPersistentSettingsPayload: (input = {}) => Object.prototype.hasOwnProperty.call(input, 'operationDelayEnabled')
      ? { operationDelayEnabled: input.operationDelayEnabled === false ? false : true }
      : {},
    broadcastDataUpdate: (payload) => broadcasts.push(payload),
    getState: async () => ({ ...state }),
    setPersistentSettings: async () => {},
    setState: async (updates) => { state = { ...state, ...updates }; },
  });

  const response = await router.handleMessage({
    type: 'SAVE_SETTING',
    source: 'sidepanel',
    payload: { operationDelayEnabled: false },
  });

  assert.equal(response.ok, true);
  assert.equal(state.operationDelayEnabled, false);
  assert.deepStrictEqual(broadcasts.at(-1), { operationDelayEnabled: false });
  assert.equal(logs.length, 0);
});

test('SAVE_SETTING re-resolves signup method when panel mode changes', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  let state = {
    signupMethod: 'email',
    plusModeEnabled: false,
    panelMode: 'sub2api',
  };

  const router = api.createMessageRouter({
    addLog: async () => {},
    buildLuckmailSessionSettingsPayload: () => ({}),
    buildPersistentSettingsPayload: (input = {}) => Object.prototype.hasOwnProperty.call(input, 'panelMode')
      ? { panelMode: input.panelMode }
      : {},
    broadcastDataUpdate: () => {},
    getState: async () => ({ ...state }),
    resolveSignupMethod: (nextState = {}) => nextState.panelMode === 'cpa' ? 'email' : 'email',
    setPersistentSettings: async () => {},
    setState: async (updates) => {
      state = { ...state, ...updates };
    },
  });

  const response = await router.handleMessage({
    type: 'SAVE_SETTING',
    payload: { panelMode: 'cpa' },
  });

  assert.equal(response.ok, true);
  assert.equal(state.panelMode, 'cpa');
  assert.equal(state.signupMethod, 'email');
});

test('SAVE_SETTING applies shared mode-switch normalization before persisting incompatible capability flags', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const persistedPayloads = [];
  let state = {
    activeFlowId: 'site-a',
    signupMethod: 'email',
    plusModeEnabled: false,
    panelMode: 'cpa',
  };

  const router = api.createMessageRouter({
    addLog: async () => {},
    buildLuckmailSessionSettingsPayload: () => ({}),
    buildPersistentSettingsPayload: (input = {}) => ({
      plusModeEnabled: Boolean(input.plusModeEnabled),
      signupMethod: String(input.signupMethod || 'email'),
    }),
    broadcastDataUpdate: () => {},
    getState: async () => ({ ...state }),
    resolveSignupMethod: () => 'email',
    setPersistentSettings: async (updates) => {
      persistedPayloads.push({ ...updates });
    },
    setState: async (updates) => {
      state = { ...state, ...updates };
    },
    validateModeSwitch: () => ({
      ok: false,
      errors: [{ code: 'plus_mode_unsupported', message: '当前 flow 不支持 Plus 模式。' }],
      normalizedUpdates: {
        plusModeEnabled: false,
        signupMethod: 'email',
      },
    }),
  });

  const response = await router.handleMessage({
    type: 'SAVE_SETTING',
    payload: {
      plusModeEnabled: true,
      signupMethod: 'phone',
    },
  });

  assert.equal(response.ok, true);
  assert.equal(state.plusModeEnabled, false);
  assert.equal(state.signupMethod, 'email');
  assert.deepEqual(persistedPayloads[0], {
    plusModeEnabled: false,
    signupMethod: 'email',
  });
  assert.equal(response.modeValidation?.errors?.[0]?.code, 'plus_mode_unsupported');
});

test('NODE_ERROR shows compact warn log for post-login phone verification add-phone failures', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const logs = [];
  const notifyErrors = [];

  const router = api.createMessageRouter({
    addLog: async (message, level = 'info', extra = {}) => {
      logs.push({ message, level, extra });
    },
    getState: async () => ({
      nodeStatuses: {},
    }),
    getStepIdByNodeIdForState: (nodeId) => (nodeId === 'post-login-phone-verification' ? 9 : 0),
    isStopError: () => false,
    notifyNodeError: (nodeId, error) => {
      notifyErrors.push({ nodeId, error });
    },
    setNodeStatus: async () => {},
  });

  const errorMessage = 'ADD_PHONE_REQUIRED::步骤 9：验证码提交后页面进入手机号页面，当前流程无法继续自动授权。 URL: https://auth.openai.com/add-phone';

  const response = await router.handleMessage({
    type: 'NODE_ERROR',
    nodeId: 'post-login-phone-verification',
    error: errorMessage,
  });

  assert.equal(response.ok, true);
  assert.equal(logs.length > 0, true);
  assert.equal(logs[0].level, 'warn');
  assert.equal(logs[0].message, '警告');
  assert.equal(logs[0].message.includes('步骤 9：验证码提交后页面进入手机号页面'), false);
  assert.deepEqual(notifyErrors, [
    {
      nodeId: 'post-login-phone-verification',
      error: errorMessage,
    },
  ]);
});

test('NODE_ERROR suppresses add-phone node warn log during auto-run to avoid duplicate summary logs', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const logs = [];
  const notifyErrors = [];

  const router = api.createMessageRouter({
    addLog: async (message, level = 'info', extra = {}) => {
      logs.push({ message, level, extra });
    },
    getState: async () => ({
      autoRunning: true,
      autoRunPhase: 'running',
      nodeStatuses: {},
    }),
    getStepIdByNodeIdForState: (nodeId) => (nodeId === 'post-login-phone-verification' ? 9 : 0),
    isAutoRunLockedState: (state = {}) => Boolean(state.autoRunning) && state.autoRunPhase === 'running',
    isStopError: () => false,
    notifyNodeError: (nodeId, error) => {
      notifyErrors.push({ nodeId, error });
    },
    setNodeStatus: async () => {},
  });

  const errorMessage = 'ADD_PHONE_REQUIRED::步骤 9：验证码提交后页面进入手机号页面，当前流程无法继续自动授权。 URL: https://auth.openai.com/add-phone';

  const response = await router.handleMessage({
    type: 'NODE_ERROR',
    nodeId: 'post-login-phone-verification',
    error: errorMessage,
  });

  assert.equal(response.ok, true);
  assert.equal(logs.length, 0);
  assert.deepEqual(notifyErrors, [
    {
      nodeId: 'post-login-phone-verification',
      error: errorMessage,
    },
  ]);
});

test('NODE_ERROR logs non add-phone failures as warn without suppressing auto-run logs', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const logs = [];
  const notifyErrors = [];

  const router = api.createMessageRouter({
    addLog: async (message, level = 'info', extra = {}) => {
      logs.push({ message, level, extra });
    },
    getState: async () => ({
      autoRunning: true,
      autoRunPhase: 'running',
      nodeStatuses: {},
    }),
    getStepIdByNodeIdForState: (nodeId) => (nodeId === 'fetch-login-code' ? 8 : 0),
    isAutoRunLockedState: (state = {}) => Boolean(state.autoRunning) && state.autoRunPhase === 'running',
    isStopError: () => false,
    notifyNodeError: (nodeId, error) => {
      notifyErrors.push({ nodeId, error });
    },
    setNodeStatus: async () => {},
  });

  const errorMessage = '步骤 8：暂未在 Cloudflare Temp Email 中找到匹配验证码（1/1）。';

  const response = await router.handleMessage({
    type: 'NODE_ERROR',
    nodeId: 'fetch-login-code',
    error: errorMessage,
  });

  assert.equal(response.ok, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'warn');
  assert.equal(logs[0].message, `失败：${errorMessage}`);
  assert.deepEqual(notifyErrors, [
    {
      nodeId: 'fetch-login-code',
      error: errorMessage,
    },
  ]);
});

test('handleStepData marks step 8 as skipped when fetch-login-code self-reports skipLoginVerificationStep', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const setNodeStatusCalls = [];
  let state = {
    nodeStatuses: {
      'fetch-login-code': 'completed',
    },
  };

  const router = api.createMessageRouter({
    getState: async () => ({
      ...state,
      nodeStatuses: { ...(state.nodeStatuses || {}) },
    }),
    getStepDefinitionForState: (step) => {
      if (Number(step) === 8) {
        return { key: 'fetch-login-code' };
      }
      return null;
    },
    setNodeStatus: async (nodeId, status) => {
      setNodeStatusCalls.push({ nodeId, status });
      state = {
        ...state,
        nodeStatuses: {
          ...(state.nodeStatuses || {}),
          [nodeId]: status,
        },
      };
    },
    setState: async (updates = {}) => {
      state = {
        ...state,
        ...updates,
        nodeStatuses: updates.nodeStatuses
          ? { ...updates.nodeStatuses }
          : { ...(state.nodeStatuses || {}) },
      };
    },
  });

  await router.handleStepData(8, {
    skipLoginVerificationStep: true,
    emailTimestamp: 1234567890,
  });

  assert.deepEqual(setNodeStatusCalls, [
    { nodeId: 'fetch-login-code', status: 'skipped' },
  ]);
  assert.equal(state.nodeStatuses['fetch-login-code'], 'skipped');
  assert.equal(state.loginVerificationRequestedAt, null);
});

test('handleStepData marks step 9 as skipped when post-login phone verification is bypassed', async () => {
  const source = fs.readFileSync('background/message-router.js', 'utf8');
  const globalScope = { console };
  const api = new Function('self', `${source}; return self.MultiPageBackgroundMessageRouter;`)(globalScope);
  const setNodeStatusCalls = [];
  let state = {
    nodeStatuses: {
      'post-login-phone-verification': 'completed',
    },
  };

  const router = api.createMessageRouter({
    getState: async () => ({
      ...state,
      nodeStatuses: { ...(state.nodeStatuses || {}) },
    }),
    getStepDefinitionForState: (step) => {
      if (Number(step) === 9) {
        return { key: 'post-login-phone-verification' };
      }
      return null;
    },
    setNodeStatus: async (nodeId, status) => {
      setNodeStatusCalls.push({ nodeId, status });
      state = {
        ...state,
        nodeStatuses: {
          ...(state.nodeStatuses || {}),
          [nodeId]: status,
        },
      };
    },
    setState: async (updates = {}) => {
      state = {
        ...state,
        ...updates,
        nodeStatuses: updates.nodeStatuses
          ? { ...updates.nodeStatuses }
          : { ...(state.nodeStatuses || {}) },
      };
    },
  });

  await router.handleStepData(9, {
    directOAuthConsentPage: true,
    phoneVerification: false,
  });

  assert.deepEqual(setNodeStatusCalls, [
    { nodeId: 'post-login-phone-verification', status: 'skipped' },
  ]);
  assert.equal(state.nodeStatuses['post-login-phone-verification'], 'skipped');
});
