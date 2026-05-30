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
    if (ch === '(') parenDepth += 1;
    if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) signatureEnded = true;
    }
    if (ch === '{' && signatureEnded) {
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

test('importSettingsBundle normalizes unsupported capability flags before persisting imported settings', async () => {
  const api = new Function(`
const SETTINGS_EXPORT_SCHEMA_VERSION = 1;
const DEFAULT_REGISTRATION_EMAIL_STATE = { emailHistory: [] };
const DEFAULT_ACTIVE_FLOW_ID = 'openai';
const self = {
  MultiPageLegacySettingsImporter: {
    createSettingsImporter() {
      return {
        importSettings(settings = {}) {
          return { ...settings };
        },
      };
    },
  },
};
let persistedUpdates = null;
let stateUpdates = null;
let broadcastPayload = null;
let currentState = {
  activeFlowId: 'site-a',
  targetId: 'sub2api',
  signupMethod: 'phone',
  phoneVerificationEnabled: false,
  stepStatuses: {},
};
async function ensureManualInteractionAllowed() {
  return currentState;
}
function buildPersistentSettingsPayload(settings = {}) {
  return { ...settings };
}
function validateModeSwitchState() {
  return {
    ok: false,
    errors: [{ code: 'panel_mode_unsupported', message: '当前 flow 不支持 SUB2API 面板模式。' }],
    normalizedUpdates: {
      targetId: 'cpa',
      phoneVerificationEnabled: false,
      signupMethod: 'email',
    },
  };
}
function resolveSignupMethod(state = {}) {
  return String(state?.signupMethod || '').trim().toLowerCase() === 'phone' ? 'phone' : 'email';
}
function getSettingsSchemaApi() {
  return null;
}
async function setPersistentSettings(updates) {
  persistedUpdates = { ...updates };
}
async function setState(updates) {
  stateUpdates = { ...updates };
  currentState = { ...currentState, ...updates };
}
function broadcastDataUpdate(payload) {
  broadcastPayload = { ...payload };
}
async function getState() {
  return { ...currentState };
}
${extractFunction('importSettingsBundle')}
return {
  importSettingsBundle,
  getPersistedUpdates: () => persistedUpdates,
  getStateUpdates: () => stateUpdates,
  getBroadcastPayload: () => broadcastPayload,
};
`)();

  const result = await api.importSettingsBundle({
    schemaVersion: 1,
    settings: {
      targetId: 'sub2api',
      phoneVerificationEnabled: true,
      signupMethod: 'phone',
    },
  });

  assert.deepEqual(api.getPersistedUpdates(), {
    targetId: 'cpa',
    phoneVerificationEnabled: false,
    signupMethod: 'email',
  });
  assert.equal(api.getStateUpdates().targetId, 'cpa');
  assert.equal(api.getStateUpdates().phoneVerificationEnabled, false);
  assert.equal(api.getStateUpdates().signupMethod, 'email');
  assert.equal(api.getBroadcastPayload().targetId, 'cpa');
  assert.equal(api.getBroadcastPayload().signupMethod, 'email');
  assert.equal(result.signupMethod, 'email');
});

test('importSettingsBundle routes legacy settings through the legacy importer before persisting', async () => {
  const api = new Function(`
const SETTINGS_EXPORT_SCHEMA_VERSION = 1;
const DEFAULT_REGISTRATION_EMAIL_STATE = { emailHistory: [] };
const DEFAULT_ACTIVE_FLOW_ID = 'openai';
let importerInput = null;
let persistedUpdates = null;
let currentState = {
  activeFlowId: 'openai',
  nodeStatuses: {},
};
const self = {
  MultiPageFlowRegistry: {
    DEFAULT_FLOW_ID: 'openai',
  },
  MultiPageLegacySettingsImporter: {
    createSettingsImporter() {
      return {
        importSettings(settings = {}) {
          importerInput = JSON.parse(JSON.stringify(settings));
          return {
            settingsSchemaVersion: 5,
            settingsState: {
              schemaVersion: 5,
              activeFlowId: 'openai',
              services: {
                account: { customPassword: '' },
                email: { provider: '163' },
              },
              flows: {
                openai: {
                  selectedTargetId: 'sub2api',
                  targets: {
                    cpa: { vpsUrl: '', vpsPassword: '', localCpaStep9Mode: 'submit' },
                    sub2api: {
                      sub2apiUrl: 'https://sub2api.example.com',
                      sub2apiEmail: 'admin@example.com',
                      sub2apiPassword: 'secret',
                      sub2apiGroupName: 'codex',
                      sub2apiGroupNames: ['codex'],
                      sub2apiAccountPriority: 1,
                      sub2apiDefaultProxyName: '',
                    },
                    codex2api: { codex2apiUrl: '', codex2apiAdminKey: '' },
                  },
                  signup: {
                    signupMethod: 'email',
                    phoneVerificationEnabled: false,
                    phoneSignupReloginAfterBindEmailEnabled: false,
                  },
                  autoRun: {
                    stepExecutionRange: { enabled: false, fromStep: 1, toStep: 11 },
                  },
                },
              },
            },
          };
        },
      };
    },
  },
};
async function ensureManualInteractionAllowed() {
  return currentState;
}
function buildPersistentSettingsPayload(settings = {}) {
  return {
    activeFlowId: settings.settingsState.activeFlowId,
    targetId: settings.settingsState.flows.openai.selectedTargetId,
    signupMethod: 'email',
    sub2apiUrl: settings.settingsState.flows.openai.targets.sub2api.sub2apiUrl,
    sub2apiEmail: settings.settingsState.flows.openai.targets.sub2api.sub2apiEmail,
    sub2apiPassword: settings.settingsState.flows.openai.targets.sub2api.sub2apiPassword,
    settingsSchemaVersion: settings.settingsSchemaVersion,
    settingsState: settings.settingsState,
  };
}
function validateModeSwitchState() {
  return { normalizedUpdates: {} };
}
function resolveSignupMethod() {
  return 'email';
}
function getSettingsSchemaApi() {
  return null;
}
async function setPersistentSettings(updates) {
  persistedUpdates = { ...updates };
  return updates;
}
async function setState(updates) {
  currentState = { ...currentState, ...updates };
}
function broadcastDataUpdate() {}
async function getState() {
  return currentState;
}
${extractFunction('importSettingsBundle')}
return {
  importSettingsBundle,
  getImporterInput: () => importerInput,
  getPersistedUpdates: () => persistedUpdates,
};
`)();

  await api.importSettingsBundle({
    schemaVersion: 1,
    settings: {
      targetId: 'sub2api',
      sub2apiUrl: 'https://legacy.example.com',
    },
  });

  assert.deepEqual(api.getImporterInput(), {
    targetId: 'sub2api',
    sub2apiUrl: 'https://legacy.example.com',
  });
  assert.equal(api.getPersistedUpdates().activeFlowId, 'openai');
  assert.equal(api.getPersistedUpdates().targetId, 'sub2api');
  assert.equal(api.getPersistedUpdates().settingsSchemaVersion, 5);
  assert.equal(api.getPersistedUpdates().settingsState.flows.openai.targets.sub2api.sub2apiUrl, 'https://sub2api.example.com');
});
