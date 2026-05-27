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

function loadApi() {
  const snippets = [
    extractFunction('normalizeAccountRecordIdentityType'),
    extractFunction('normalizeAccountRecordIdentityValue'),
    extractFunction('resolveAccountRecordIdentityFromState'),
    extractFunction('hasRunningAccountRecordForIdentity'),
    extractFunction('shouldMarkAccountRunRecordRunning'),
    extractFunction('finalizePreviousRunningAccountRecordOnSwitch'),
  ].join('\n\n');
  const factory = new Function(`
const calls = [];
async function appendManualAccountRunRecordIfNeeded(status, state, reason) {
  calls.push({ status, state, reason });
}
${snippets}
return {
  calls,
  finalizePreviousRunningAccountRecordOnSwitch,
};
`);
  return factory();
}

test('finalizePreviousRunningAccountRecordOnSwitch closes previous running email when auto-run switches to a new email', async () => {
  const api = loadApi();
  const stateBeforeSwitch = {
    autoRunning: true,
    autoRunPhase: 'retrying',
    accountIdentifierType: 'email',
    accountIdentifier: 'old@example.com',
    accountRunHistory: [{
      accountIdentifierType: 'email',
      accountIdentifier: 'old@example.com',
      finalStatus: 'running',
    }],
  };

  await api.finalizePreviousRunningAccountRecordOnSwitch(stateBeforeSwitch, {
    accountIdentifierType: 'email',
    accountIdentifier: 'new@example.com',
  });

  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].status, 'node:submit-signup-email:stopped');
  assert.match(api.calls[0].reason, /切换(?:邮箱|账号)/);
});

test('finalizePreviousRunningAccountRecordOnSwitch skips closing when identifier is unchanged or auto-run is not in running phase', async () => {
  const api = loadApi();
  const sameIdentifierState = {
    autoRunning: true,
    autoRunPhase: 'running',
    accountIdentifierType: 'email',
    accountIdentifier: 'same@example.com',
    accountRunHistory: [{
      accountIdentifierType: 'email',
      accountIdentifier: 'same@example.com',
      finalStatus: 'running',
    }],
  };

  await api.finalizePreviousRunningAccountRecordOnSwitch(sameIdentifierState, {
    accountIdentifierType: 'email',
    accountIdentifier: 'same@example.com',
  });

  const nonRunningPhaseState = {
    autoRunning: true,
    autoRunPhase: 'waiting_interval',
    accountIdentifierType: 'phone',
    accountIdentifier: '+12345678900',
    accountRunHistory: [{
      accountIdentifierType: 'phone',
      accountIdentifier: '+12345678900',
      finalStatus: 'running',
    }],
  };
  await api.finalizePreviousRunningAccountRecordOnSwitch(nonRunningPhaseState, {
    accountIdentifierType: 'phone',
    accountIdentifier: '+12345678901',
  });

  assert.equal(api.calls.length, 0);
});
