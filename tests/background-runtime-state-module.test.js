const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadRuntimeStateApi() {
  const source = fs.readFileSync('background/runtime-state.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${source}; return self.MultiPageBackgroundRuntimeState;`)(globalScope);
}

test('background imports runtime-state module and wires state view helpers', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /background\/runtime-state\.js/);
  assert.match(source, /createRuntimeStateHelpers/);
  assert.match(source, /buildStateViewWithRuntimeState/);
  assert.match(source, /buildStatePatchWithRuntimeState/);
  assert.match(source, /runtimeState:/);
});

test('runtime-state module exposes a factory', () => {
  const api = loadRuntimeStateApi();
  assert.equal(typeof api?.createRuntimeStateHelpers, 'function');
});

test('runtime-state view preserves canonical flow metadata from node state', () => {
  const api = loadRuntimeStateApi();
  const helpers = api.createRuntimeStateHelpers({
    DEFAULT_ACTIVE_FLOW_ID: 'openai',
    defaultNodeStatuses: {
      'open-chatgpt': 'pending',
      'submit-signup-email': 'pending',
      'oauth-login': 'pending',
    },
  });

  const view = helpers.buildStateView({
    currentNodeId: 'submit-signup-email',
    nodeStatuses: {
      'open-chatgpt': 'completed',
      'submit-signup-email': 'running',
    },
    oauthUrl: 'https://auth.example.com/start',
    tabRegistry: {
      'signup-page': { tabId: 12 },
    },
    sourceLastUrls: {
      'signup-page': 'https://auth.example.com/start',
    },
    flowStartTime: 12345,
  });

  assert.equal(view.activeFlowId, 'openai');
  assert.equal(view.currentNodeId, 'submit-signup-email');
  assert.equal(Object.prototype.hasOwnProperty.call(view, 'legacyStepCompat'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(view, 'currentStep'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(view, 'stepStatuses'), false);
  assert.deepStrictEqual(view.nodeStatuses, {
    'open-chatgpt': 'completed',
    'submit-signup-email': 'running',
    'oauth-login': 'pending',
  });
  assert.equal(view.runtimeState.flowState.openai.auth.oauthUrl, 'https://auth.example.com/start');
  assert.equal(Object.prototype.hasOwnProperty.call(view.runtimeState.flowState.openai, 'phoneVerification'), false);
  assert.deepStrictEqual(view.sharedState, {
    tabRegistry: {
      'signup-page': { tabId: 12 },
    },
    sourceLastUrls: {
      'signup-page': 'https://auth.example.com/start',
    },
    flowStartTime: 12345,
  });
});

test('runtime-state patch accepts nested flow and node updates without legacy step state', () => {
  const api = loadRuntimeStateApi();
  const helpers = api.createRuntimeStateHelpers({
    DEFAULT_ACTIVE_FLOW_ID: 'openai',
    defaultNodeStatuses: {
      'open-chatgpt': 'pending',
      'submit-signup-email': 'pending',
      'oauth-login': 'pending',
    },
  });

  const patch = helpers.buildSessionStatePatch({
    currentNodeId: 'open-chatgpt',
    nodeStatuses: {
      'open-chatgpt': 'running',
      'submit-signup-email': 'pending',
      'oauth-login': 'pending',
    },
    oauthUrl: 'https://old.example.com/start',
  }, {
    runtimeState: {
      activeRunId: 'run-001',
      currentNodeId: 'oauth-login',
      nodeStatuses: {
        'open-chatgpt': 'completed',
        'oauth-login': 'running',
      },
      flowState: {
        openai: {
          auth: {
            oauthUrl: 'https://new.example.com/start',
          },
        },
      },
    },
  });

  assert.equal(patch.activeFlowId, 'openai');
  assert.equal(patch.activeRunId, 'run-001');
  assert.equal(patch.currentNodeId, 'oauth-login');
  assert.equal(patch.oauthUrl, 'https://new.example.com/start');
  assert.equal(Object.prototype.hasOwnProperty.call(patch, 'currentStep'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(patch, 'stepStatuses'), false);
  assert.deepStrictEqual(patch.nodeStatuses, {
    'open-chatgpt': 'completed',
    'submit-signup-email': 'pending',
    'oauth-login': 'running',
  });
  assert.equal(patch.runtimeState.flowState.openai.auth.oauthUrl, 'https://new.example.com/start');
});

test('runtime-state groups GPTMail runtime fields under openai flow state', () => {
  const api = loadRuntimeStateApi();
  const helpers = api.createRuntimeStateHelpers({
    DEFAULT_ACTIVE_FLOW_ID: 'openai',
    defaultNodeStatuses: {},
  });

  const view = helpers.buildStateView({
    currentGptmailAddress: 'demo@example.com',
    currentGptmailMailCursor: { seenIds: ['m-1'] },
  });

  assert.equal(view.runtimeState.flowState.openai.gptmail.currentGptmailAddress, 'demo@example.com');
  assert.deepStrictEqual(view.runtimeState.flowState.openai.gptmail.currentGptmailMailCursor, { seenIds: ['m-1'] });

  const patch = helpers.buildSessionStatePatch({}, {
    runtimeState: {
      flowState: {
        openai: {
          gptmail: {
            currentGptmailAddress: 'next@example.com',
            currentGptmailMailCursor: { seenIds: ['m-2'] },
          },
        },
      },
    },
  });

  assert.equal(patch.currentGptmailAddress, 'next@example.com');
  assert.deepStrictEqual(patch.currentGptmailMailCursor, { seenIds: ['m-2'] });
});
