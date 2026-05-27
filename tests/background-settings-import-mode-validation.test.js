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
let persistedUpdates = null;
let stateUpdates = null;
let broadcastPayload = null;
let currentState = {
  activeFlowId: 'site-a',
  panelMode: 'sub2api',
  signupMethod: 'phone',
  plusModeEnabled: false,
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
      panelMode: 'cpa',
      plusModeEnabled: false,
      phoneVerificationEnabled: false,
      signupMethod: 'email',
    },
  };
}
function resolveSignupMethod(state = {}) {
  return String(state?.signupMethod || '').trim().toLowerCase() === 'phone' ? 'phone' : 'email';
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
      panelMode: 'sub2api',
      plusModeEnabled: true,
      phoneVerificationEnabled: true,
      signupMethod: 'phone',
    },
  });

  assert.deepEqual(api.getPersistedUpdates(), {
    panelMode: 'cpa',
    plusModeEnabled: false,
    phoneVerificationEnabled: false,
    signupMethod: 'email',
  });
  assert.equal(api.getStateUpdates().panelMode, 'cpa');
  assert.equal(api.getStateUpdates().plusModeEnabled, false);
  assert.equal(api.getStateUpdates().phoneVerificationEnabled, false);
  assert.equal(api.getStateUpdates().signupMethod, 'email');
  assert.equal(api.getBroadcastPayload().panelMode, 'cpa');
  assert.equal(api.getBroadcastPayload().signupMethod, 'email');
  assert.equal(result.signupMethod, 'email');
});
