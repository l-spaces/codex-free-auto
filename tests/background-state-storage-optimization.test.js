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
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      parenDepth += 1;
    } else if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnded = true;
      }
    } else if (char === '{' && signatureEnded) {
      braceStart = index;
      break;
    }
  }
  if (braceStart < 0) {
    throw new Error(`missing body for function ${name}`);
  }

  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return source.slice(start, end);
}

test('setState skips storage writes when updates do not change state', async () => {
  const api = new Function(`
${extractFunction('isStateValueEqual')}
${extractFunction('pickChangedStatePatch')}
${extractFunction('setState')}

let sessionSetCalls = [];
let localSetCalls = [];
let mergeCalls = 0;
let invalidateAliasCalls = 0;

const LOG_PREFIX = '[test]';
const DEFAULT_STATE = {};
const console = { log() {}, warn() {}, error() {} };

async function getSessionStateSnapshot() {
  return {
    email: 'same@example.com',
    manualAliasUsage: { 'same@example.com': true },
  };
}
function omitLocalOnlySettings(value) { return value; }
function buildStatePatchWithRuntimeState(_state, updates) { return updates; }
function normalizeBooleanMap(value) { return value; }
function normalizeIcloudAliasCacheList(value) { return value; }
function mergeSessionStateCache() { mergeCalls += 1; }
function invalidatePersistedAliasStateCache() { invalidateAliasCalls += 1; }

const chrome = {
  storage: {
    session: {
      async set(payload) {
        sessionSetCalls.push(payload);
      },
    },
    local: {
      async set(payload) {
        localSetCalls.push(payload);
      },
    },
  },
};

return {
  run(updates) {
    return setState(updates);
  },
  snapshot() {
    return {
      sessionSetCalls,
      localSetCalls,
      mergeCalls,
      invalidateAliasCalls,
    };
  },
};
`)();

  await api.run({
    email: 'same@example.com',
    manualAliasUsage: { 'same@example.com': true },
  });
  const snapshot = api.snapshot();

  assert.equal(snapshot.sessionSetCalls.length, 0);
  assert.equal(snapshot.localSetCalls.length, 0);
  assert.equal(snapshot.mergeCalls, 0);
  assert.equal(snapshot.invalidateAliasCalls, 0);
});

test('setState only writes changed keys and syncs alias persistence when needed', async () => {
  const api = new Function(`
${extractFunction('isStateValueEqual')}
${extractFunction('pickChangedStatePatch')}
${extractFunction('setState')}

let sessionSetCalls = [];
let localSetCalls = [];
let mergeCalls = [];
let invalidateAliasCalls = 0;

const LOG_PREFIX = '[test]';
const DEFAULT_STATE = {};
const console = { log() {}, warn() {}, error() {} };

async function getSessionStateSnapshot() {
  return {
    email: 'old@example.com',
    manualAliasUsage: { 'old@example.com': false },
    preservedAliases: { 'old@example.com': false },
  };
}
function omitLocalOnlySettings(value) { return value; }
function buildStatePatchWithRuntimeState(_state, updates) { return updates; }
function normalizeBooleanMap(value) { return value; }
function normalizeIcloudAliasCacheList(value) { return value; }
function mergeSessionStateCache(updates) { mergeCalls.push(updates); }
function invalidatePersistedAliasStateCache() { invalidateAliasCalls += 1; }

const chrome = {
  storage: {
    session: {
      async set(payload) {
        sessionSetCalls.push(payload);
      },
    },
    local: {
      async set(payload) {
        localSetCalls.push(payload);
      },
    },
  },
};

return {
  run(updates) {
    return setState(updates);
  },
  snapshot() {
    return {
      sessionSetCalls,
      localSetCalls,
      mergeCalls,
      invalidateAliasCalls,
    };
  },
};
`)();

  await api.run({
    email: 'old@example.com',
    nodeStatuses: { 'open-chatgpt': 'running' },
    manualAliasUsage: { 'old@example.com': true },
    preservedAliases: { 'old@example.com': false },
  });
  const snapshot = api.snapshot();

  assert.equal(snapshot.sessionSetCalls.length, 1);
  assert.deepStrictEqual(snapshot.sessionSetCalls[0], {
    nodeStatuses: { 'open-chatgpt': 'running' },
    manualAliasUsage: { 'old@example.com': true },
  });
  assert.equal(snapshot.localSetCalls.length, 1);
  assert.deepStrictEqual(snapshot.localSetCalls[0], {
    manualAliasUsage: { 'old@example.com': true },
  });
  assert.equal(snapshot.mergeCalls.length, 1);
  assert.deepStrictEqual(snapshot.mergeCalls[0], {
    nodeStatuses: { 'open-chatgpt': 'running' },
    manualAliasUsage: { 'old@example.com': true },
  });
  assert.equal(snapshot.invalidateAliasCalls, 1);
});
