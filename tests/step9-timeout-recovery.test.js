const assert = require('assert');
const fs = require('fs');

const step9ModuleSource = fs.readFileSync('background/steps/confirm-oauth.js', 'utf8');

const api = new Function('step9ModuleSource', `
const self = {};
let webNavListener = null;
let webNavCommittedListener = null;
let step8TabUpdatedListener = null;
let step8PendingReject = null;
let cleanupCalls = 0;
let timeoutCalls = 0;
let remainingCalls = 0;
let recoveryCalls = 0;
let completePayload = null;
const logs = [];
const callbackUrl = 'http://localhost:1455/auth/callback?code=abc&state=xyz';

const chrome = {
  webNavigation: {
    onBeforeNavigate: {
      addListener(listener) {
        webNavListener = listener;
        setTimeout(() => {
          if (typeof webNavListener === 'function') {
            webNavListener({ tabId: 123, url: callbackUrl });
          }
        }, 25);
      },
      removeListener() {},
    },
    onCommitted: {
      addListener(listener) {
        webNavCommittedListener = listener;
      },
      removeListener() {},
    },
  },
  tabs: {
    onUpdated: {
      addListener(listener) {
        step8TabUpdatedListener = listener;
      },
      removeListener() {},
    },
    async update() {},
  },
};

function cleanupStep8NavigationListeners() {
  cleanupCalls += 1;
  webNavListener = null;
  webNavCommittedListener = null;
  step8TabUpdatedListener = null;
}

async function addLog(message) {
  logs.push(message);
}

function throwIfStep8SettledOrStopped() {}

async function getTabId() {
  return 123;
}

async function isTabAlive() {
  return true;
}

async function ensureStep8SignupPageReady() {}

async function waitForStep8Ready() {
  return {
    consentReady: true,
    url: 'https://auth.openai.com/sign-in-with-chatgpt/codex/consent',
  };
}

async function triggerStep8ContentStrategy() {
  return { success: true };
}

async function waitForStep8ClickEffect() {
  return {
    progressed: true,
    reason: 'url_changed',
    url: 'https://auth.openai.com/sign-in-with-chatgpt/codex/consent',
  };
}

async function getOAuthFlowStepTimeoutMs(defaultTimeoutMs, options = {}) {
  if (options.actionLabel === 'OAuth localhost 回调') {
    timeoutCalls += 1;
    if (timeoutCalls === 1) {
      throw new Error('步骤 9：从拿到 OAuth 登录地址开始，5 分钟内未完成OAuth localhost 回调，结束当前链路，准备从步骤 7 重新开始。');
    }
  }
  return defaultTimeoutMs;
}

async function recoverOAuthLocalhostTimeout(details = {}) {
  recoveryCalls += 1;
  return {
    ...(details.state || {}),
    oauthUrl: 'https://auth.openai.com/recovered-oauth',
  };
}

async function getOAuthFlowRemainingMs() {
  remainingCalls += 1;
  return null;
}

function getStep8CallbackUrlFromNavigation(details, signupTabId) {
  if (
    Number(signupTabId) === Number(details?.tabId)
    && String(details?.url || '').includes('http://localhost:1455/auth/callback')
  ) {
    return details.url;
  }
  return '';
}

function getStep8CallbackUrlFromTabUpdate() {
  return '';
}

function getStep8EffectLabel() {
  return 'URL 已变化';
}

async function prepareStep8DebuggerClick() {
  return { rect: { centerX: 10, centerY: 10 } };
}

async function clickWithDebugger() {}
async function reloadStep8ConsentPage() {}
async function reuseOrCreateTab() { return 123; }
async function sleepWithStop() {}

function setWebNavListener(listener) { webNavListener = listener; }
function getWebNavListener() { return webNavListener; }
function setWebNavCommittedListener(listener) { webNavCommittedListener = listener; }
function getWebNavCommittedListener() { return webNavCommittedListener; }
function setStep8TabUpdatedListener(listener) { step8TabUpdatedListener = listener; }
function getStep8TabUpdatedListener() { return step8TabUpdatedListener; }
function setStep8PendingReject(handler) { step8PendingReject = handler; }

async function completeNodeFromBackground(nodeId, payload) {
  completePayload = { nodeId, payload };
}

const STEP8_CLICK_RETRY_DELAY_MS = 200;
const STEP8_READY_WAIT_TIMEOUT_MS = 30000;
const STEP8_MAX_ROUNDS = 2;
const STEP8_STRATEGIES = [
  { mode: 'content', strategy: 'requestSubmit', label: 'form.requestSubmit' },
  { mode: 'debugger', label: 'debugger click' },
];

${step9ModuleSource}

const executor = self.MultiPageBackgroundStep9.createStep9Executor({
  addLog,
  chrome,
  cleanupStep8NavigationListeners,
  clickWithDebugger,
  completeNodeFromBackground,
  ensureStep8SignupPageReady,
  getOAuthFlowRemainingMs,
  getOAuthFlowStepTimeoutMs,
  getStep8CallbackUrlFromNavigation,
  getStep8CallbackUrlFromTabUpdate,
  getStep8EffectLabel,
  getTabId,
  getWebNavCommittedListener,
  getWebNavListener,
  getStep8TabUpdatedListener,
  isTabAlive,
  prepareStep8DebuggerClick,
  recoverOAuthLocalhostTimeout,
  reloadStep8ConsentPage,
  reuseOrCreateTab,
  setStep8PendingReject,
  setStep8TabUpdatedListener,
  setWebNavCommittedListener,
  setWebNavListener,
  sleepWithStop,
  STEP8_CLICK_RETRY_DELAY_MS,
  STEP8_MAX_ROUNDS,
  STEP8_READY_WAIT_TIMEOUT_MS,
  STEP8_STRATEGIES,
  throwIfStep8SettledOrStopped,
  triggerStep8ContentStrategy,
  waitForStep8ClickEffect,
  waitForStep8Ready,
});

return {
  executeStep9: executor.executeStep9,
  snapshot() {
    return {
      cleanupCalls,
      timeoutCalls,
      remainingCalls,
      recoveryCalls,
      completePayload,
      hasPendingReject: Boolean(step8PendingReject),
      logs,
    };
  },
};
`)(step9ModuleSource);

(async () => {
  await api.executeStep9({
    oauthUrl: 'https://auth.openai.com/original-oauth',
    visibleStep: 9,
  });

  const snapshot = api.snapshot();
  assert.strictEqual(snapshot.timeoutCalls, 2, 'step9 should retry timeout budget check after recovery');
  assert.strictEqual(snapshot.recoveryCalls, 1, 'step9 should call timeout recovery hook exactly once');
  assert.strictEqual(snapshot.cleanupCalls >= 1, true, 'step9 should cleanup navigation listeners');
  assert.strictEqual(snapshot.hasPendingReject, false, 'step9 should clear pending reject after completion');
  assert.deepStrictEqual(snapshot.completePayload, {
    nodeId: 'confirm-oauth',
    payload: {
      localhostUrl: 'http://localhost:1455/auth/callback?code=abc&state=xyz',
    },
  });

  console.log('step9 timeout recovery tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
