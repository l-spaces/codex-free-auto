const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function extractFunction(name) {
  const source = fs.readFileSync('background.js', 'utf8');
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers
    .map((marker) => source.indexOf(marker))
    .find((index) => index >= 0);
  if (start < 0) {
    throw new Error(`Unable to find function ${name}`);
  }

  let parenDepth = 0;
  let signatureEnded = false;
  let braceStart = -1;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === '(') {
      parenDepth += 1;
    } else if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnded = true;
      }
    } else if (char === '{' && signatureEnded) {
      braceStart = i;
      break;
    }
  }
  if (braceStart < 0) {
    throw new Error(`Unable to extract function ${name}`);
  }

  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, end + 1);
      }
    }
  }
  throw new Error(`Unable to extract function ${name}`);
}

test('fetchIcloudHideMyEmail uses shared persistence helper for preserve-account-identity reuse flow', async () => {
  const bundle = extractFunction('fetchIcloudHideMyEmail');

  const api = new Function(`
const persistCalls = [];
const broadcasts = [];
const ICLOUD_REQUEST_TIMEOUT_MS = 15000;
const ICLOUD_WRITE_MAX_ATTEMPTS = 2;

function withIcloudLoginHelp(_label, action) {
  return action();
}
function throwIfStopped() {}
async function addLog() {}
async function resolveIcloudPremiumMailService() {
  return {
    serviceUrl: 'https://p67-maildomainws.icloud.com',
    setupUrl: 'https://setup.icloud.com/setup/ws/1',
  };
}
function getErrorMessage(error) {
  return String(typeof error === 'string' ? error : error?.message || '');
}
async function listIcloudAliases() {
  return [
    { email: 'reuse@icloud.com', active: true, used: false, preserved: false },
  ];
}
function pickReusableIcloudAlias(aliases) {
  return aliases[0] || null;
}
async function icloudRequest() {
  throw new Error('should not create a new alias');
}
function getIcloudAliasLabel() {
  return 'MultiPage 2026-04-26';
}
async function persistRegistrationEmailState(state, email, options) {
  persistCalls.push({ state, email, options });
}
async function setEmailState() {
  throw new Error('preserve flow should use shared persistence helper');
}
function broadcastIcloudAliasesChanged(payload) {
  broadcasts.push(payload);
}
function findIcloudAliasByEmail() {
  return null;
}
function shouldStopIcloudAutoFetchRetries() {
  return true;
}
${bundle}
return {
  fetchIcloudHideMyEmail,
  readPersistCalls: () => persistCalls,
  readBroadcasts: () => broadcasts,
};
`)();

  const state = {
    accountIdentifierType: 'phone',
    accountIdentifier: '+447780579093',
    signupPhoneNumber: '+447780579093',
  };
  const email = await api.fetchIcloudHideMyEmail({
    generateNew: false,
    preserveAccountIdentity: true,
    source: 'generated:icloud',
    state,
  });

  assert.equal(email, 'reuse@icloud.com');
  assert.deepStrictEqual(api.readPersistCalls(), [
    {
      state,
      email: 'reuse@icloud.com',
      options: {
        source: 'generated:icloud',
        preserveAccountIdentity: true,
      },
    },
  ]);
  assert.deepStrictEqual(api.readBroadcasts(), [{ reason: 'selected', email: 'reuse@icloud.com' }]);
});
