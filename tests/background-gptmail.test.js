const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background.js', 'utf8');

function extractFunction(name) {
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

test('ensureAutoEmailReady prepares GPTMail mailbox before submit-signup-email', async () => {
  const bundle = extractFunction('ensureAutoEmailReady');
  const factory = new Function(`
let currentState = { mailProvider: 'gptmail', email: null };
const logs = [];
let ensureCalls = 0;
const EMAIL_FETCH_MAX_ATTEMPTS = 1;

async function getState() { return currentState; }
function isHotmailProvider() { return false; }
function isLuckmailProvider() { return false; }
function isGptmailProvider(state) { return state?.mailProvider === 'gptmail'; }
function isGeneratedAliasProvider() { return false; }
function isCustomMailProvider() { return false; }
function getCustomMailProviderPool() { return []; }
function isCustomEmailPoolGenerator() { return false; }
function shouldUseCustomRegistrationEmail() { return false; }
function normalizeEmailGenerator() { return 'duck'; }
function getEmailGeneratorLabel() { return 'Duck'; }
function shouldStopIcloudAutoFetchRetries() { return false; }
function shouldStopEmailAutoFetchRetries() { return true; }
async function fetchGeneratedEmail() { throw new Error('wrong generator'); }
async function broadcastAutoRunStatus() {}
async function waitForResume() { throw new Error('unexpected waiting_email'); }
async function addLog(message, level) { logs.push({ message, level }); }
async function ensureHotmailAccountForFlow() { throw new Error('wrong hotmail path'); }
async function ensureLuckmailPurchaseForFlow() { throw new Error('wrong luckmail path'); }
async function ensureGptmailAddressForFlow() {
  ensureCalls += 1;
  currentState = {
    ...currentState,
    email: 'abcdef1234@baileybridge.org',
    currentGptmailAddress: 'abcdef1234@baileybridge.org',
  };
  return 'abcdef1234@baileybridge.org';
}

${bundle}

return {
  ensureAutoEmailReady,
  snapshot() { return { ensureCalls, currentState, logs }; },
};
`);

  const api = factory();
  const email = await api.ensureAutoEmailReady(2, 5, 1);
  const snapshot = api.snapshot();

  assert.equal(email, 'abcdef1234@baileybridge.org');
  assert.equal(snapshot.ensureCalls, 1);
  assert.equal(snapshot.currentState.email, 'abcdef1234@baileybridge.org');
  assert.match(snapshot.logs.at(-1).message, /GPTMail 邮箱已就绪：abcdef1234@baileybridge\.org/);
});

test('pollGptmailVerificationCode propagates API key usage limit from message detail reads', async () => {
  const bundle = [
    extractFunction('isGptmailApiKeyUsageLimitMessage'),
    extractFunction('pollGptmailVerificationCode'),
  ].join('\n');
  const factory = new Function(`
const logs = [];
const sleeps = [];
const cursorUpdates = [];
const DEFAULT_GPTMAIL_POLL_INTERVAL_MS = 3000;

function normalizeGptmailEmailAddress(value) { return String(value || '').trim(); }
function normalizeGptmailMailCursor(value = {}) {
  return { seenIds: Array.isArray(value?.seenIds) ? value.seenIds : [] };
}
async function getState() { return { currentGptmailMailCursor: { seenIds: [] } }; }
async function setGptmailMailCursorState(cursor) { cursorUpdates.push(cursor); }
function createGptmailClient() {
  return {
    async listEmails() {
      return [{ id: 'm-1', subject: 'OpenAI verification code' }];
    },
    async getEmailDetail() {
      throw new Error('GPTMail 请求失败：API key usage limit reached');
    },
  };
}
function extractGptmailVerificationCode(text) {
  const match = String(text || '').match(/\\b\\d{6}\\b/);
  return match ? match[0] : '';
}
function isStopError() { return false; }
function throwIfStopped() {}
async function addLog(message, level) { logs.push({ message, level }); }
async function sleepWithStop(ms) { sleeps.push(ms); }

${bundle}

return {
  pollGptmailVerificationCode,
  isGptmailApiKeyUsageLimitMessage,
  snapshot() { return { logs, sleeps, cursorUpdates }; },
};
`);

  const api = factory();

  assert.equal(api.isGptmailApiKeyUsageLimitMessage('API key usage limit reached'), true);
  await assert.rejects(
    () => api.pollGptmailVerificationCode(4, {
      currentGptmailAddress: 'abcdef1234@baileybridge.org',
    }, { maxAttempts: 1 }),
    /API key usage limit reached/
  );
  assert.deepStrictEqual(api.snapshot().sleeps, []);
});

test('pollGptmailVerificationCode uses targetEmail when verification page fixes a different mailbox', async () => {
  const bundle = [
    extractFunction('extractGptmailVerificationCode'),
    extractFunction('stripGptmailHtmlForCode'),
    extractFunction('extractGptmailVerificationCodeFromHtml'),
    extractFunction('pollGptmailVerificationCode'),
  ].join('\n');
  const factory = new Function(`
const calls = [];
const logs = [];
const DEFAULT_GPTMAIL_POLL_INTERVAL_MS = 3000;

function normalizeGptmailEmailAddress(value) { return String(value || '').trim(); }
function normalizeGptmailMailCursor(value = {}) {
  return { seenIds: Array.isArray(value?.seenIds) ? value.seenIds : [] };
}
async function getState() { return { currentGptmailMailCursor: { seenIds: [] } }; }
async function setGptmailMailCursorState() {}
function createGptmailClient() {
  return {
    async listEmails(email) {
      calls.push({ method: 'listEmails', email });
      return email === 'target@baileybridge.org'
        ? [{ id: 'm-target', subject: 'OpenAI verification code' }]
        : [];
    },
    async getEmailDetail(messageId) {
      calls.push({ method: 'getEmailDetail', messageId });
      return {
        content: '',
        html_content: '<html><body><p>Your verification code is 123456.</p></body></html>',
      };
    },
  };
}
function isStopError() { return false; }
function throwIfStopped() {}
async function addLog(message, level) { logs.push({ message, level }); }
async function sleepWithStop() {}

${bundle}

return {
  pollGptmailVerificationCode,
  snapshot() { return { calls, logs }; },
};
`);

  const api = factory();
  const result = await api.pollGptmailVerificationCode(8, {
    currentGptmailAddress: 'stale@baileybridge.org',
    email: 'stale@baileybridge.org',
  }, {
    targetEmail: 'target@baileybridge.org',
    maxAttempts: 1,
  });

  assert.equal(result.code, '123456');
  assert.deepStrictEqual(api.snapshot().calls, [
    { method: 'listEmails', email: 'target@baileybridge.org' },
    { method: 'getEmailDetail', messageId: 'm-target' },
  ]);
});

test('pollGptmailVerificationCode extracts the verification code from detail html_content body', async () => {
  const bundle = [
    extractFunction('extractGptmailVerificationCode'),
    extractFunction('stripGptmailHtmlForCode'),
    extractFunction('extractGptmailVerificationCodeFromHtml'),
    extractFunction('pollGptmailVerificationCode'),
  ].join('\n');
  const factory = new Function(`
const calls = [];
const logs = [];
const DEFAULT_GPTMAIL_POLL_INTERVAL_MS = 3000;

function normalizeGptmailEmailAddress(value) { return String(value || '').trim().toLowerCase(); }
function normalizeGptmailMailCursor(value = {}) {
  return { seenIds: Array.isArray(value?.seenIds) ? value.seenIds : [] };
}
async function getState() { return { currentGptmailMailCursor: { seenIds: [] } }; }
async function setGptmailMailCursorState() {}
function createGptmailClient() {
  return {
    async listEmails(email) {
      calls.push({ method: 'listEmails', email });
      return [
        {
          id: 'm-summary-only',
          subject: 'ChatGPT code 202123',
          content: 'Summary content includes stale code 202123.',
          html_content: '<p>202123</p>',
        },
        {
          id: 'm-detail-html',
          subject: 'ChatGPT code 111111',
          content: 'Summary content includes stale code 111111.',
          html_content: '<p>111111</p>',
        },
      ];
    },
    async getEmailDetail(messageId) {
      calls.push({ method: 'getEmailDetail', messageId });
      if (messageId === 'm-summary-only') {
        return {
          content: '',
          html_content: '<html><head><style>.brand{color:#202123}</style></head><body><p>还没有验证码</p></body></html>',
        };
      }
      return {
        subject: 'Detail subject should be ignored 222222',
        content: '',
        html_content: '<html><head><style>.brand{color:#202123}</style></head><body><p>输入此临时验证码以继续：</p><p>286817</p><a href="https://example.test/ticket/654321">帮助</a></body></html>',
      };
    },
  };
}
function isStopError() { return false; }
function throwIfStopped() {}
async function addLog(message, level) { logs.push({ message, level }); }
async function sleepWithStop() {}

${bundle}

return {
  pollGptmailVerificationCode,
  snapshot() { return { calls, logs }; },
};
`);

  const api = factory();
  const result = await api.pollGptmailVerificationCode(4, {
    currentGptmailAddress: 'blawson499@lujialu.edu.kg',
  }, { maxAttempts: 1 });

  assert.equal(result.code, '286817');
  assert.equal(result.mailId, 'm-detail-html');
  assert.deepStrictEqual(api.snapshot().calls, [
    { method: 'listEmails', email: 'blawson499@lujialu.edu.kg' },
    { method: 'getEmailDetail', messageId: 'm-summary-only' },
    { method: 'getEmailDetail', messageId: 'm-detail-html' },
  ]);
});

test('requestGptmail stores API usage metadata from GPTMail responses', async () => {
  const bundle = [
    extractFunction('normalizeGptmailBaseUrl'),
    extractFunction('requestGptmail'),
  ].join('\n');
  const factory = new Function(`
const usageUpdates = [];
const DEFAULT_GPTMAIL_BASE_URL = 'https://mail.chatgpt.org.uk';

async function fetch() {
  return {
    ok: true,
    async json() {
      return {
        success: true,
        data: { emails: [] },
        usage: {
          total_limit: 100,
          total_usage: 91,
          remaining_total: 9,
          daily_limit: 0,
          used_today: 91,
          remaining_today: -1,
        },
      };
    },
  };
}
async function setGptmailUsageState(usage) {
  usageUpdates.push(usage);
}

${bundle}

return {
  requestGptmail,
  snapshot() { return { usageUpdates }; },
};
`);

  const api = factory();
  await api.requestGptmail('/api/emails', {
    baseUrl: 'https://mail.chatgpt.org.uk',
    apiKey: 'sk-test',
    params: { email: 'blawson499@lujialu.edu.kg' },
  });

  assert.deepStrictEqual(api.snapshot().usageUpdates, [{
    total_limit: 100,
    total_usage: 91,
    remaining_total: 9,
    daily_limit: 0,
    used_today: 91,
    remaining_today: -1,
  }]);
});

test('createGptmailClient posts domain when generating a domain GPTMail mailbox', async () => {
  const bundle = [
    extractFunction('normalizeGptmailEmailAddress'),
    extractFunction('normalizeGptmailBaseUrl'),
    extractFunction('normalizeGptmailDomain'),
    extractFunction('getGptmailSessionConfig'),
    extractFunction('requestGptmail'),
    extractFunction('createGptmailClient'),
  ].join('\n');
  const factory = new Function(`
const calls = [];
const DEFAULT_GPTMAIL_BASE_URL = 'https://mail.chatgpt.org.uk';

async function fetch(url, options = {}) {
  calls.push({
    url,
    method: options.method,
    headers: options.headers,
    body: options.body,
  });
  return {
    ok: true,
    async json() {
      return { success: true, data: { email: 'server123@baileybridge.org' } };
    },
  };
}

${bundle}

return {
  createGptmailClient,
  snapshot() { return { calls }; },
};
`);

  const api = factory();
  const client = api.createGptmailClient({
    gptmailApiKey: 'sk-test',
    gptmailBaseUrl: 'https://mail.chatgpt.org.uk',
    gptmailDomain: 'baileybridge.org',
  });
  const email = await client.generateEmail({ domain: 'baileybridge.org' });
  const snapshot = api.snapshot();

  assert.equal(email, 'server123@baileybridge.org');
  assert.equal(snapshot.calls.length, 1);
  assert.equal(snapshot.calls[0].url, 'https://mail.chatgpt.org.uk/api/generate-email');
  assert.equal(snapshot.calls[0].method, 'POST');
  assert.equal(snapshot.calls[0].headers['X-API-Key'], 'sk-test');
  assert.deepStrictEqual(JSON.parse(snapshot.calls[0].body), { domain: 'baileybridge.org' });
});

test('createGptmailClient keeps GET generation when no GPTMail domain is supplied', async () => {
  const bundle = [
    extractFunction('normalizeGptmailEmailAddress'),
    extractFunction('normalizeGptmailBaseUrl'),
    extractFunction('normalizeGptmailDomain'),
    extractFunction('getGptmailSessionConfig'),
    extractFunction('requestGptmail'),
    extractFunction('createGptmailClient'),
  ].join('\n');
  const factory = new Function(`
const calls = [];
const DEFAULT_GPTMAIL_BASE_URL = 'https://mail.chatgpt.org.uk';

async function fetch(url, options = {}) {
  calls.push({
    url,
    method: options.method,
    body: options.body,
  });
  return {
    ok: true,
    async json() {
      return { success: true, data: { email: 'random@example.test' } };
    },
  };
}

${bundle}

return {
  createGptmailClient,
  snapshot() { return { calls }; },
};
`);

  const api = factory();
  const client = api.createGptmailClient({
    gptmailApiKey: 'sk-test',
    gptmailBaseUrl: 'https://mail.chatgpt.org.uk',
  });
  const email = await client.generateEmail();
  const snapshot = api.snapshot();

  assert.equal(email, 'random@example.test');
  assert.equal(snapshot.calls.length, 1);
  assert.equal(snapshot.calls[0].url, 'https://mail.chatgpt.org.uk/api/generate-email');
  assert.equal(snapshot.calls[0].method, 'GET');
  assert.equal(snapshot.calls[0].body, undefined);
});

test('ensureGptmailAddressForFlow requests a server-generated address when GPTMail domain is configured', async () => {
  const bundle = [
    extractFunction('normalizeGptmailEmailAddress'),
    extractFunction('normalizeGptmailBaseUrl'),
    extractFunction('normalizeGptmailDomain'),
    extractFunction('getGptmailSessionConfig'),
    extractFunction('ensureGptmailAddressForFlow'),
  ].join('\n');
  const factory = new Function(`
let currentState = {
  gptmailApiKey: 'sk-test',
  gptmailBaseUrl: 'https://mail.chatgpt.org.uk',
  gptmailDomain: '@baileybridge.org',
  currentGptmailAddress: null,
  email: null,
};
const updates = [];
const logs = [];
const generateCalls = [];
const DEFAULT_GPTMAIL_BASE_URL = 'https://mail.chatgpt.org.uk';

async function getState() { return currentState; }
async function setGptmailAddressState(email) {
  currentState.currentGptmailAddress = email;
  updates.push({ currentGptmailAddress: email });
  return email;
}
async function setGptmailMailCursorState(cursor) {
  currentState.currentGptmailMailCursor = cursor;
  updates.push({ currentGptmailMailCursor: cursor });
}
async function setEmailState(email) {
  currentState.email = email;
  updates.push({ email });
}
async function clearGptmailRuntimeState() {
  throw new Error('clear should not run for a fresh GPTMail address');
}
function createGptmailClient() {
  return {
    async generateEmail(options) {
      generateCalls.push(options);
      return 'server123@baileybridge.org';
    },
  };
}
async function addLog(message, level) { logs.push({ message, level }); }

${bundle}

return {
  ensureGptmailAddressForFlow,
  snapshot() { return { currentState, updates, logs, generateCalls }; },
};
`);

  const api = factory();
  const email = await api.ensureGptmailAddressForFlow();
  const snapshot = api.snapshot();

  assert.equal(email, 'server123@baileybridge.org');
  assert.deepStrictEqual(snapshot.generateCalls, [{ domain: 'baileybridge.org' }]);
  assert.equal(snapshot.currentState.email, email);
  assert.equal(snapshot.currentState.currentGptmailAddress, email);
  assert.deepStrictEqual(snapshot.currentState.currentGptmailMailCursor, { seenIds: [] });
  assert.match(snapshot.logs.at(-1).message, new RegExp(`GPTMail：已生成邮箱 ${email}`));
});

test('ensureGptmailAddressForFlow synchronizes state when reusing current GPTMail address', async () => {
  const bundle = [
    extractFunction('normalizeGptmailEmailAddress'),
    extractFunction('normalizeGptmailBaseUrl'),
    extractFunction('normalizeGptmailDomain'),
    extractFunction('normalizeGptmailMailCursor'),
    extractFunction('getGptmailSessionConfig'),
    extractFunction('ensureGptmailAddressForFlow'),
  ].join('\n');
  const factory = new Function(`
let currentState = {
  gptmailApiKey: 'sk-test',
  gptmailBaseUrl: 'https://mail.chatgpt.org.uk',
  gptmailDomain: 'baileybridge.org',
  currentGptmailAddress: 'fresh@baileybridge.org',
  currentGptmailMailCursor: null,
  email: 'stale@baileybridge.org',
};
const updates = [];
const DEFAULT_GPTMAIL_BASE_URL = 'https://mail.chatgpt.org.uk';

async function getState() { return currentState; }
async function setGptmailAddressState(email) {
  currentState.currentGptmailAddress = email;
  updates.push({ currentGptmailAddress: email });
  return email;
}
async function setGptmailMailCursorState(cursor) {
  currentState.currentGptmailMailCursor = cursor;
  updates.push({ currentGptmailMailCursor: cursor });
}
async function setEmailState(email) {
  currentState.email = email;
  updates.push({ email });
}
async function clearGptmailRuntimeState() {
  throw new Error('clear should not run when the current GPTMail domain still matches');
}
function createGptmailClient() {
  throw new Error('remote generate-email should not run when reusing a current GPTMail address');
}
async function addLog() {}

${bundle}

return {
  ensureGptmailAddressForFlow,
  snapshot() { return { currentState, updates }; },
};
`);

  const api = factory();
  const email = await api.ensureGptmailAddressForFlow();
  const snapshot = api.snapshot();

  assert.equal(email, 'fresh@baileybridge.org');
  assert.equal(snapshot.currentState.email, 'fresh@baileybridge.org');
  assert.equal(snapshot.currentState.currentGptmailAddress, 'fresh@baileybridge.org');
  assert.deepStrictEqual(snapshot.currentState.currentGptmailMailCursor, { seenIds: [] });
});
