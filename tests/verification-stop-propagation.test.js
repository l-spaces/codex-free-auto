const assert = require('assert');
const fs = require('fs');

const helperSource = fs.readFileSync('background.js', 'utf8');
const verificationFlowSource = fs.readFileSync('background/verification-flow.js', 'utf8');

function extractFunction(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers
    .map(marker => source.indexOf(marker))
    .find(index => index >= 0);
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

async function testPollFreshVerificationCodeRethrowsStop() {
  const helperBundle = [
    extractFunction(helperSource, 'isStopError'),
    extractFunction(helperSource, 'throwIfStopped'),
  ].join('\n');

const api = new Function('verificationFlowSource', `
const self = {};
let stopRequested = false;
const STOP_ERROR_MESSAGE = '流程已被用户停止。';
const HOTMAIL_PROVIDER = 'hotmail-api';
const LUCKMAIL_PROVIDER = 'luckmail-api';
const CLOUDFLARE_TEMP_EMAIL_PROVIDER = 'cloudflare-temp-email';
const VERIFICATION_POLL_MAX_ROUNDS = 5;
const logs = [];
let resendCalls = 0;

function getHotmailVerificationPollConfig() {
  return {};
}
async function pollHotmailVerificationCode() {
  throw new Error('hotmail path should not run in this test');
}
async function pollLuckmailVerificationCode() {
  throw new Error('luckmail path should not run in this test');
}
async function pollCloudflareTempEmailVerificationCode() {
  throw new Error('cloudflare path should not run in this test');
}
async function sendToMailContentScriptResilient() {
  throw new Error(STOP_ERROR_MESSAGE);
}
async function requestVerificationCodeResend() {
  resendCalls += 1;
}
async function addLog(message, level) {
  logs.push({ message, level });
}

${helperBundle}
${verificationFlowSource}

const helpers = self.MultiPageBackgroundVerificationFlow.createVerificationFlowHelpers({
  addLog,
  chrome: {},
  CLOUDFLARE_TEMP_EMAIL_PROVIDER,
  completeNodeFromBackground: async () => {},
  confirmCustomVerificationStepBypassRequest: async () => ({ confirmed: true }),
  getHotmailVerificationPollConfig,
  getHotmailVerificationRequestTimestamp: () => 123,
  getState: async () => ({}),
  getTabId: async () => null,
  HOTMAIL_PROVIDER,
  isStopError,
  LUCKMAIL_PROVIDER,
  pollCloudflareTempEmailVerificationCode,
  pollHotmailVerificationCode,
  pollLuckmailVerificationCode,
  sendToContentScript: async () => ({}),
  sendToMailContentScriptResilient,
  setState: async () => {},
  setStepStatus: async () => {},
  sleepWithStop: async () => {},
  throwIfStopped,
  VERIFICATION_POLL_MAX_ROUNDS,
});

return {
  pollFreshVerificationCode: helpers.pollFreshVerificationCode,
  snapshot() {
    return { logs, resendCalls };
  },
};
`)(verificationFlowSource);

  let error = null;
  try {
    await api.pollFreshVerificationCode(7, {}, { provider: 'qq' }, {});
  } catch (err) {
    error = err;
  }

  const state = api.snapshot();
  assert.strictEqual(error?.message, '流程已被用户停止。', 'Stop 错误应原样向上抛出');
  assert.strictEqual(state.resendCalls, 0, 'Stop 后不应继续请求新的验证码');
  assert.deepStrictEqual(state.logs, [], 'Stop 后不应再记录普通失败或重试日志');
}

async function testResolveVerificationStepRethrowsStopFromFreshRequest() {
  const helperBundle = [
    extractFunction(helperSource, 'isStopError'),
  ].join('\n');

const api = new Function('verificationFlowSource', `
const self = {};
const STOP_ERROR_MESSAGE = '流程已被用户停止。';
const HOTMAIL_PROVIDER = 'hotmail-api';
const LUCKMAIL_PROVIDER = 'luckmail-api';
const CLOUDFLARE_TEMP_EMAIL_PROVIDER = 'cloudflare-temp-email';
const logs = [];
let pollCalls = 0;
async function addLog(message, level) {
  logs.push({ message, level });
}
const chrome = { tabs: { async update() {} } };

${helperBundle}
${verificationFlowSource}

const helpers = self.MultiPageBackgroundVerificationFlow.createVerificationFlowHelpers({
  addLog,
  chrome,
  CLOUDFLARE_TEMP_EMAIL_PROVIDER,
  completeNodeFromBackground: async () => {},
  confirmCustomVerificationStepBypassRequest: async () => ({ confirmed: true }),
  getHotmailVerificationPollConfig: () => ({}),
  getHotmailVerificationRequestTimestamp: () => 123,
  getState: async () => ({}),
  getTabId: async () => 1,
  HOTMAIL_PROVIDER,
  isStopError,
  LUCKMAIL_PROVIDER,
  pollCloudflareTempEmailVerificationCode: async () => ({}),
  pollHotmailVerificationCode: async () => ({}),
  pollLuckmailVerificationCode: async () => ({}),
  sendToContentScript: async () => {
    throw new Error(STOP_ERROR_MESSAGE);
  },
  sendToMailContentScriptResilient: async () => {
    pollCalls += 1;
    return {};
  },
  setState: async () => {},
  setStepStatus: async () => {},
  sleepWithStop: async () => {},
  throwIfStopped: () => {},
  VERIFICATION_POLL_MAX_ROUNDS: 5,
});

return {
  resolveVerificationStep: helpers.resolveVerificationStep,
  snapshot() {
    return { logs, pollCalls };
  },
};
`)(verificationFlowSource);

  let error = null;
  try {
    await api.resolveVerificationStep(7, {}, { provider: 'qq' }, { requestFreshCodeFirst: true });
  } catch (err) {
    error = err;
  }

  const state = api.snapshot();
  assert.strictEqual(error?.message, '流程已被用户停止。', '首次请求新验证码收到 Stop 后应立即终止');
  assert.strictEqual(state.pollCalls, 0, 'Stop 后不应继续进入邮箱轮询');
  assert.deepStrictEqual(state.logs, [], 'Stop 后不应追加降级日志');
}

(async () => {
  await testPollFreshVerificationCodeRethrowsStop();
  await testResolveVerificationStepRethrowsStopFromFreshRequest();
  console.log('verification stop propagation tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
