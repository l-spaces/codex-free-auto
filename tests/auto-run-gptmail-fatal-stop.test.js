const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/auto-run-controller.js', 'utf8');
const globalScope = {};
const api = new Function('self', `${source}; return self.MultiPageBackgroundAutoRunController;`)(globalScope);

const RUNNING_PHASES = new Set(['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval']);

function createRuntime() {
  return {
    state: {
      autoRunActive: false,
      autoRunCurrentRun: 0,
      autoRunTotalRuns: 1,
      autoRunAttemptRun: 0,
      autoRunSessionId: 0,
    },
    get() {
      return { ...this.state };
    },
    set(updates = {}) {
      this.state = { ...this.state, ...updates };
    },
  };
}

test('GPTMail usage-limit stop clears stale running nodes and leaves auto-run stopped', async () => {
  const events = {
    accountRecords: [],
    broadcasts: [],
    cancels: [],
    logs: [],
    nodeStatusChanges: [],
    runCalls: 0,
    stopBroadcasts: 0,
  };

  let currentState = {
    autoRunDelayEnabled: false,
    autoRunDelayMinutes: 30,
    autoRunFallbackThreadIntervalMinutes: 0,
    autoRunRoundSummaries: [],
    autoRunSkipFailures: true,
    autoRunTimerPlan: { kind: 'before_retry' },
    cloudflareDomain: '',
    cloudflareDomains: [],
    customPassword: '',
    emailGenerator: 'duck',
    emailPrefix: 'demo',
    gmailBaseEmail: '',
    importedAccounts: [],
    inbucketHost: '',
    inbucketMailbox: '',
    mail2925BaseEmail: '',
    mailProvider: 'gptmail',
    nodeStatuses: {},
    scheduledAutoRunPlan: { kind: 'scheduled_start' },
    sourceLastUrls: {},
    tabRegistry: {},
    vpsPassword: 'secret',
    vpsUrl: 'https://example.com/vps',
  };

  const runtime = createRuntime();
  let sessionSeed = 0;

  const controller = api.createAutoRunController({
    addLog: async (message, level = 'info') => {
      events.logs.push({ message, level });
    },
    appendAccountRunRecord: async (status, _state, reason) => {
      events.accountRecords.push({ status, reason });
      return { status, reason };
    },
    AUTO_RUN_MAX_RETRIES_PER_ROUND: 3,
    AUTO_RUN_RETRY_DELAY_MS: 3000,
    AUTO_RUN_TIMER_KIND_BEFORE_RETRY: 'before_retry',
    AUTO_RUN_TIMER_KIND_BETWEEN_ROUNDS: 'between_rounds',
    broadcastAutoRunStatus: async (phase, payload = {}, extraState = {}) => {
      events.broadcasts.push({ phase, payload, extraState });
      currentState = {
        ...currentState,
        ...extraState,
        autoRunning: RUNNING_PHASES.has(phase),
        autoRunPhase: phase,
        autoRunCurrentRun: payload.currentRun ?? runtime.state.autoRunCurrentRun,
        autoRunTotalRuns: payload.totalRuns ?? runtime.state.autoRunTotalRuns,
        autoRunAttemptRun: payload.attemptRun ?? runtime.state.autoRunAttemptRun,
        autoRunSessionId: payload.sessionId ?? runtime.state.autoRunSessionId,
      };
    },
    broadcastStopToContentScripts: async () => {
      events.stopBroadcasts += 1;
    },
    cancelPendingCommands: (reason) => {
      events.cancels.push(reason);
    },
    clearStopRequest: () => {},
    createAutoRunSessionId: () => {
      sessionSeed += 1;
      return sessionSeed;
    },
    getAutoRunStatusPayload: (phase, payload = {}) => ({
      autoRunning: RUNNING_PHASES.has(phase),
      autoRunPhase: phase,
      autoRunCurrentRun: payload.currentRun ?? 0,
      autoRunTotalRuns: payload.totalRuns ?? 1,
      autoRunAttemptRun: payload.attemptRun ?? 0,
      autoRunSessionId: payload.sessionId ?? 0,
    }),
    getErrorMessage: (error) => error?.message || String(error || ''),
    getFirstUnfinishedNodeId: () => 'open-chatgpt',
    getPendingAutoRunTimerPlan: () => currentState.autoRunTimerPlan || null,
    getRunningNodeIds: (statuses = {}) => (
      Object.entries(statuses)
        .filter(([, status]) => status === 'running')
        .map(([nodeId]) => nodeId)
    ),
    getState: async () => ({
      ...currentState,
      nodeStatuses: { ...(currentState.nodeStatuses || {}) },
      sourceLastUrls: { ...(currentState.sourceLastUrls || {}) },
      tabRegistry: { ...(currentState.tabRegistry || {}) },
    }),
    getStopRequested: () => false,
    hasSavedNodeProgress: () => false,
    isAddPhoneAuthFailure: () => false,
    isGptmailApiKeyUsageLimitError: (error) => /API key usage limit reached/i.test(error?.message || String(error || '')),
    isRestartCurrentAttemptError: () => false,
    isStep4Route405RecoveryLimitFailure: () => false,
    isSignupUserAlreadyExistsFailure: () => false,
    isStopError: (error) => (error?.message || String(error || '')) === '流程已被用户停止。',
    launchAutoRunTimerPlan: async () => false,
    normalizeAutoRunFallbackThreadIntervalMinutes: (value) => Math.max(0, Math.floor(Number(value) || 0)),
    persistAutoRunTimerPlan: async () => ({}),
    resetState: async () => {
      currentState = {
        ...currentState,
        nodeStatuses: {},
        sourceLastUrls: {},
        tabRegistry: {},
      };
    },
    runAutoSequenceFromNode: async () => {
      events.runCalls += 1;
      currentState = {
        ...currentState,
        nodeStatuses: {
          ...currentState.nodeStatuses,
          'fetch-signup-code': 'failed',
          'platform-verify': 'running',
        },
      };
      throw new Error('GPTMail 请求失败：API key usage limit reached');
    },
    runtime,
    setNodeStatus: async (nodeId, status) => {
      events.nodeStatusChanges.push({ nodeId, status });
      currentState = {
        ...currentState,
        nodeStatuses: {
          ...currentState.nodeStatuses,
          [nodeId]: status,
        },
      };
    },
    setState: async (updates = {}) => {
      currentState = {
        ...currentState,
        ...updates,
        nodeStatuses: updates.nodeStatuses ? { ...updates.nodeStatuses } : currentState.nodeStatuses,
        sourceLastUrls: updates.sourceLastUrls ? { ...updates.sourceLastUrls } : currentState.sourceLastUrls,
        tabRegistry: updates.tabRegistry ? { ...updates.tabRegistry } : currentState.tabRegistry,
      };
    },
    sleepWithStop: async () => {},
    throwIfAutoRunSessionStopped: (sessionId) => {
      if (sessionId && sessionId !== runtime.state.autoRunSessionId) {
        throw new Error('流程已被用户停止。');
      }
    },
    waitForRunningNodesToFinish: async () => currentState,
    chrome: {
      runtime: {
        sendMessage() {
          return Promise.resolve();
        },
      },
    },
  });

  await controller.autoRunLoop(2, {
    autoRunSkipFailures: true,
    mode: 'restart',
  });

  assert.equal(events.runCalls, 1);
  assert.equal(events.broadcasts.some(({ phase }) => phase === 'retrying'), false);
  assert.equal(events.broadcasts.some(({ phase }) => phase === 'stopped'), true);
  assert.equal(events.stopBroadcasts, 1);
  assert.equal(events.accountRecords[0]?.status, 'node:platform-verify:failed');
  assert.match(events.cancels[0] || '', /GPTMail API Key/);
  assert.equal(currentState.autoRunning, false);
  assert.equal(currentState.autoRunPhase, 'stopped');
  assert.equal(currentState.autoRunSessionId, 0);
  assert.equal(currentState.autoRunTimerPlan, null);
  assert.equal(currentState.scheduledAutoRunPlan, null);
  assert.deepStrictEqual(events.nodeStatusChanges, [
    { nodeId: 'platform-verify', status: 'stopped' },
  ]);
  assert.equal(currentState.nodeStatuses['fetch-signup-code'], 'failed');
  assert.equal(currentState.nodeStatuses['platform-verify'], 'stopped');
  assert.equal(runtime.state.autoRunActive, false);
  assert.equal(runtime.state.autoRunSessionId, 0);
  assert.ok(events.logs.some(({ message }) => /GPTMail API Key 使用额度已耗尽/.test(message)));
});
