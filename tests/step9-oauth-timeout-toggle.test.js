const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const step9ModuleSource = fs.readFileSync('background/steps/confirm-oauth.js', 'utf8');

test('step9 observes disabled oauth timeout while waiting for localhost callback', async () => {
  const api = new Function('step9ModuleSource', `
const self = {};
let webNavListener = null;
let webNavCommittedListener = null;
let step8TabUpdatedListener = null;
let step8PendingReject = null;
let cleanupCalls = 0;
let remainingCalls = 0;
let recoveryCalls = 0;
let completePayload = null;
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

async function addLog() {}
function cleanupStep8NavigationListeners() {
  cleanupCalls += 1;
  webNavListener = null;
  webNavCommittedListener = null;
  step8TabUpdatedListener = null;
}
function throwIfStep8SettledOrStopped(resolved) {
  if (resolved) throw new Error('already resolved');
}
async function getTabId() { return 123; }
async function isTabAlive() { return true; }
async function ensureStep8SignupPageReady() {}
async function getOAuthFlowStepTimeoutMs(defaultTimeoutMs, options = {}) {
  if (options.actionLabel === 'OAuth localhost 回调') {
    return 1;
  }
  return defaultTimeoutMs;
}
async function getOAuthFlowRemainingMs() {
  remainingCalls += 1;
  return null;
}
async function recoverOAuthLocalhostTimeout() {
  recoveryCalls += 1;
  throw new Error('should not recover when timeout has been disabled');
}
async function waitForStep8Ready() {
  return {
    consentReady: true,
    url: 'https://auth.openai.com/sign-in-with-chatgpt/codex/consent',
  };
}
async function triggerStep8ContentStrategy() {}
async function waitForStep8ClickEffect() {
  return { progressed: true, reason: 'url_changed', url: 'https://chatgpt.com/' };
}
function getStep8CallbackUrlFromNavigation(details, signupTabId) {
  return Number(details?.tabId) === Number(signupTabId) ? details.url : '';
}
function getStep8CallbackUrlFromTabUpdate() { return ''; }
function getStep8EffectLabel() { return 'URL 已变化'; }
async function prepareStep8DebuggerClick() { return { rect: { centerX: 10, centerY: 10 } }; }
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

const STEP8_CLICK_RETRY_DELAY_MS = 1;
const STEP8_READY_WAIT_TIMEOUT_MS = 5;
const STEP8_MAX_ROUNDS = 1;
const STEP8_STRATEGIES = [
  { mode: 'content', strategy: 'requestSubmit', label: 'form.requestSubmit' },
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
      remainingCalls,
      recoveryCalls,
      completePayload,
      hasPendingReject: Boolean(step8PendingReject),
    };
  },
};
`)(step9ModuleSource);

  await api.executeStep9({
    oauthUrl: 'https://auth.openai.com/original-oauth',
    visibleStep: 9,
  });

  const snapshot = api.snapshot();
  assert.equal(snapshot.recoveryCalls, 0);
  assert.equal(snapshot.remainingCalls >= 1, true);
  assert.equal(snapshot.cleanupCalls >= 1, true);
  assert.equal(snapshot.hasPendingReject, false);
  assert.deepEqual(snapshot.completePayload, {
    nodeId: 'confirm-oauth',
    payload: {
      localhostUrl: 'http://localhost:1455/auth/callback?code=abc&state=xyz',
    },
  });
});

test('step9 defers callback timeout while auth security verification is still redirecting', async () => {
  const api = new Function('step9ModuleSource', `
const self = {};
let webNavListener = null;
let webNavCommittedListener = null;
let step8TabUpdatedListener = null;
let cleanupCalls = 0;
let deferCalls = 0;
let completePayload = null;
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

async function addLog() {}
function cleanupStep8NavigationListeners() {
  cleanupCalls += 1;
  webNavListener = null;
  webNavCommittedListener = null;
  step8TabUpdatedListener = null;
}
function throwIfStep8SettledOrStopped(resolved) {
  if (resolved) throw new Error('already resolved');
}
async function getTabId() { return 123; }
async function isTabAlive() { return true; }
async function ensureStep8SignupPageReady() {}
async function getOAuthFlowStepTimeoutMs(defaultTimeoutMs, options = {}) {
  if (options.actionLabel === 'OAuth localhost 回调') {
    return 1;
  }
  return defaultTimeoutMs;
}
async function shouldDeferStep9CallbackTimeout(details = {}) {
  deferCalls += 1;
  return Number(details.tabId) === 123;
}
async function waitForStep8Ready() {
  return {
    consentReady: true,
    url: 'https://auth.openai.com/sign-in-with-chatgpt/codex/consent',
  };
}
async function triggerStep8ContentStrategy() {}
async function waitForStep8ClickEffect() {
  return {
    progressed: true,
    reason: 'url_changed',
    url: 'https://auth.openai.com/api/oauth/oauth2/auth?client_id=app_test',
  };
}
function getStep8CallbackUrlFromNavigation(details, signupTabId) {
  return Number(details?.tabId) === Number(signupTabId) ? details.url : '';
}
function getStep8CallbackUrlFromTabUpdate() { return ''; }
function getStep8EffectLabel() { return 'URL 已变化'; }
async function prepareStep8DebuggerClick() { return { rect: { centerX: 10, centerY: 10 } }; }
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
function setStep8PendingReject() {}
async function completeNodeFromBackground(nodeId, payload) {
  completePayload = { nodeId, payload };
}

const STEP8_CLICK_RETRY_DELAY_MS = 1;
const STEP8_READY_WAIT_TIMEOUT_MS = 5;
const STEP8_MAX_ROUNDS = 1;
const STEP8_STRATEGIES = [
  { mode: 'content', strategy: 'requestSubmit', label: 'form.requestSubmit' },
];

${step9ModuleSource}

const executor = self.MultiPageBackgroundStep9.createStep9Executor({
  addLog,
  chrome,
  cleanupStep8NavigationListeners,
  clickWithDebugger,
  completeNodeFromBackground,
  ensureStep8SignupPageReady,
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
  reloadStep8ConsentPage,
  reuseOrCreateTab,
  setStep8PendingReject,
  setStep8TabUpdatedListener,
  setWebNavCommittedListener,
  setWebNavListener,
  shouldDeferStep9CallbackTimeout,
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
      deferCalls,
      completePayload,
    };
  },
};
`)(step9ModuleSource);

  await api.executeStep9({
    oauthUrl: 'https://auth.openai.com/original-oauth',
    visibleStep: 12,
  });

  const snapshot = api.snapshot();
  assert.equal(snapshot.deferCalls >= 1, true);
  assert.equal(snapshot.cleanupCalls >= 1, true);
  assert.deepEqual(snapshot.completePayload, {
    nodeId: 'confirm-oauth',
    payload: {
      localhostUrl: 'http://localhost:1455/auth/callback?code=abc&state=xyz',
    },
  });
});
