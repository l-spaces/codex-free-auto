const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const helperSource = fs.readFileSync('background.js', 'utf8');

function extractFunction(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers
    .map((marker) => source.indexOf(marker))
    .find((index) => index >= 0);
  if (start < 0) {
    throw new Error(`missing function ${name}`);
  }

  let parenDepth = 0;
  let signatureEnded = false;
  let braceStart = -1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnded = true;
      }
    } else if (ch === '{' && signatureEnded) {
      braceStart = i;
      break;
    }
  }
  if (braceStart < 0) {
    throw new Error(`missing body for function ${name}`);
  }

  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    const ch = source[end];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return source.slice(start, end);
}

const helperBundle = [
  extractFunction(helperSource, 'normalizeRunCount'),
  extractFunction(helperSource, 'normalizeAutoRunTimerKind'),
  extractFunction(helperSource, 'normalizeAutoRunSessionId'),
  extractFunction(helperSource, 'isCurrentAutoRunSessionId'),
  extractFunction(helperSource, 'normalizeAutoRunTimerPlan'),
  extractFunction(helperSource, 'getAutoRunTimerResumeOptions'),
  extractFunction(helperSource, 'launchAutoRunTimerPlan'),
].join('\n');

test('launchAutoRunTimerPlan ignores stale timer plans after stop invalidates the session', async () => {
  const api = new Function(`
const AUTO_RUN_TIMER_KIND_SCHEDULED_START = 'scheduled_start';
const AUTO_RUN_TIMER_KIND_BETWEEN_ROUNDS = 'between_rounds';
const AUTO_RUN_TIMER_KIND_BEFORE_RETRY = 'before_retry';
const AUTO_RUN_MAX_RETRIES_PER_ROUND = 3;

let autoRunTimerLaunching = false;
let autoRunActive = false;
let autoRunCurrentRun = 0;
let autoRunTotalRuns = 1;
let autoRunAttemptRun = 0;
let autoRunSessionId = 0;

const state = {
  autoRunDelayEnabled: false,
  autoRunTimerPlan: {
    kind: AUTO_RUN_TIMER_KIND_SCHEDULED_START,
    fireAt: Date.now() + 60_000,
    totalRuns: 2,
    autoRunSkipFailures: false,
    autoRunSessionId: 42,
    countdownTitle: '已计划自动运行',
    countdownNote: '等待启动',
  },
};

let startCalls = 0;
let clearStopCalls = 0;
let clearAlarmCalls = 0;

async function getState() {
  return { ...state };
}

function getPendingAutoRunTimerPlan() {
  return state.autoRunTimerPlan;
}

async function clearAutoRunTimerAlarm() {
  clearAlarmCalls += 1;
}

async function broadcastAutoRunStatus() {}
async function addLog() {}
async function setAutoRunDelayEnabledState() {}
function serializeAutoRunRoundSummaries(totalRuns, summaries = []) {
  return Array.isArray(summaries) ? summaries : [];
}
function clearStopRequest() {
  clearStopCalls += 1;
}
function startAutoRunLoop() {
  startCalls += 1;
}

${helperBundle}

return {
  launchAutoRunTimerPlan,
  snapshot() {
    return {
      startCalls,
      clearStopCalls,
      clearAlarmCalls,
      autoRunCurrentRun,
      autoRunTotalRuns,
      autoRunAttemptRun,
    };
  },
};
`)();

  const started = await api.launchAutoRunTimerPlan('alarm');
  const snapshot = api.snapshot();

  assert.equal(started, false);
  assert.equal(snapshot.startCalls, 0, 'stale timer plan should not restart auto-run');
  assert.equal(snapshot.clearStopCalls, 0, 'stale timer plan should not clear the stop flag for a cancelled run');
  assert.equal(snapshot.clearAlarmCalls, 0, 'stale timer plan should not clear a potentially newer alarm');
  assert.equal(snapshot.autoRunCurrentRun, 0);
  assert.equal(snapshot.autoRunTotalRuns, 1);
  assert.equal(snapshot.autoRunAttemptRun, 0);
});

test('launchAutoRunTimerPlan cancels an invalid scheduled start before restarting auto-run', async () => {
  const api = new Function(`
const AUTO_RUN_TIMER_KIND_SCHEDULED_START = 'scheduled_start';
const AUTO_RUN_TIMER_KIND_BETWEEN_ROUNDS = 'between_rounds';
const AUTO_RUN_TIMER_KIND_BEFORE_RETRY = 'before_retry';
const AUTO_RUN_MAX_RETRIES_PER_ROUND = 3;

let autoRunTimerLaunching = false;
let autoRunActive = false;
let autoRunCurrentRun = 0;
let autoRunTotalRuns = 1;
let autoRunAttemptRun = 0;
let autoRunSessionId = 0;

const state = {
  activeFlowId: 'site-a',
  panelMode: 'cpa',
  signupMethod: 'phone',
  autoRunDelayEnabled: false,
  autoRunTimerPlan: {
    kind: AUTO_RUN_TIMER_KIND_SCHEDULED_START,
    fireAt: Date.now() + 60_000,
    totalRuns: 2,
    autoRunSkipFailures: false,
    autoRunSessionId: 0,
    countdownTitle: '已计划自动运行',
    countdownNote: '等待启动',
  },
};

let startCalls = 0;
let clearStopCalls = 0;
let clearAlarmCalls = 0;
const broadcasts = [];
const logs = [];

async function getState() {
  return { ...state };
}

function getPendingAutoRunTimerPlan() {
  return state.autoRunTimerPlan;
}

async function clearAutoRunTimerAlarm() {
  clearAlarmCalls += 1;
}

async function broadcastAutoRunStatus(phase, statusPayload, statePayload) {
  broadcasts.push({ phase, statusPayload, statePayload });
}
async function addLog(message, level) {
  logs.push({ message, level });
}
async function setAutoRunDelayEnabledState() {}
function serializeAutoRunRoundSummaries(totalRuns, summaries = []) {
  return Array.isArray(summaries) ? summaries : [];
}
function clearStopRequest() {
  clearStopCalls += 1;
}
function startAutoRunLoop() {
  startCalls += 1;
}
function validateAutoRunStartState() {
  return {
    ok: false,
    errors: [{ message: '当前 flow 不支持手机号注册。' }],
  };
}

${helperBundle}

return {
  launchAutoRunTimerPlan,
  snapshot() {
    return {
      startCalls,
      clearStopCalls,
      clearAlarmCalls,
      broadcasts,
      logs,
      autoRunCurrentRun,
      autoRunTotalRuns,
      autoRunAttemptRun,
    };
  },
};
`)();

  const started = await api.launchAutoRunTimerPlan('alarm');
  const snapshot = api.snapshot();

  assert.equal(started, false);
  assert.equal(snapshot.startCalls, 0);
  assert.equal(snapshot.clearStopCalls, 0);
  assert.equal(snapshot.clearAlarmCalls, 1);
  assert.equal(snapshot.broadcasts.length, 1);
  assert.equal(snapshot.broadcasts[0].phase, 'idle');
  assert.match(snapshot.logs[0].message, /自动运行计划已取消：当前 flow 不支持手机号注册。/);
  assert.equal(snapshot.logs[0].level, 'error');
  assert.equal(snapshot.autoRunCurrentRun, 0);
  assert.equal(snapshot.autoRunTotalRuns, 1);
  assert.equal(snapshot.autoRunAttemptRun, 0);
});
