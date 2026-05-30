const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sidepanelSource = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');
const sidepanelHtml = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');

function extractFunction(source, name) {
  const asyncStart = source.indexOf(`async function ${name}`);
  const normalStart = source.indexOf(`function ${name}`);
  const start = asyncStart !== -1
    ? asyncStart
    : normalStart;
  if (start === -1) {
    throw new Error(`Function ${name} not found`);
  }
  const signatureEnd = source.indexOf(')', start);
  const bodyStart = source.indexOf('{', signatureEnd);
  let depth = 0;
  let end = bodyStart;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  return source.slice(start, end);
}

test('sidepanel html exposes only the OpenAI registration option and shared controls', () => {
  [
    'id="select-flow"',
    '<option value="openai" selected>Codex / OpenAI</option>',
    'id="label-source-selector"',
    'id="row-step6-cookie-settings"',
    'id="row-shared-auto-run"',
    'id="row-auto-run-thread-interval"',
    'id="row-oauth-callback"',
    'id="row-settings-actions"',
  ].forEach((snippet) => {
    assert.match(sidepanelHtml, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  const removedFlowPattern = new RegExp([
    ['k', 'i', 'r', 'o'].join(''),
    ['g', 'r', 'o', 'k'].join(''),
    ['w', 'e', 'b', 'c', 'h', 'a', 't', '2', 'a', 'p', 'i'].join(''),
  ].join('|'), 'i');
  assert.doesNotMatch(sidepanelHtml, removedFlowPattern);
  assert.doesNotMatch(sidepanelSource, removedFlowPattern);
});

test('sidepanel step definitions rerender when active flow changes even if signup settings stay the same', () => {
  const bundle = [
    extractFunction(sidepanelSource, 'normalizeSignupMethod'),
    extractFunction(sidepanelSource, 'getStepDefinitionsForMode'),
    extractFunction(sidepanelSource, 'rebuildStepDefinitionState'),
    extractFunction(sidepanelSource, 'syncStepDefinitionsForMode'),
  ].join('\n');

  const api = new Function(`
const calls = [];
const window = {
  MultiPageStepDefinitions: {
    getSteps(options) {
      calls.push({ type: 'getSteps', options });
      return [{ id: options.activeFlowId === 'sample' ? 88 : 6, order: 1, key: options.activeFlowId }];
    },
  },
};
let latestState = { activeFlowId: 'openai' };
let currentSignupMethod = 'email';
let currentPhoneVerificationEnabled = false;
let currentPhoneSignupReloginAfterBindEmailEnabled = false;
let currentStepDefinitionFlowId = 'openai';
const DEFAULT_ACTIVE_FLOW_ID = 'openai';
const DEFAULT_SIGNUP_METHOD = 'email';
let stepDefinitions = [{ id: 6, key: 'openai' }];
let STEP_IDS = [6];
let STEP_DEFAULT_STATUSES = { 6: 'pending' };
let SKIPPABLE_STEPS = new Set([6]);
function renderStepsList() {
  calls.push({ type: 'render', stepIds: [...STEP_IDS] });
}
${bundle}
return {
  calls,
  syncStepDefinitionsForMode,
  getStepIds: () => [...STEP_IDS],
  getCurrentFlowId: () => currentStepDefinitionFlowId,
};
`)();

  api.syncStepDefinitionsForMode({
    activeFlowId: 'sample',
    signupMethod: 'email',
    phoneSignupReloginAfterBindEmailEnabled: false,
  });

  assert.equal(api.getCurrentFlowId(), 'sample');
  assert.deepEqual(api.getStepIds(), [88]);
  assert.deepEqual(api.calls[0], {
    type: 'getSteps',
    options: {
      activeFlowId: 'sample',
      signupMethod: 'email',
      phoneVerificationEnabled: false,
      phoneSignupReloginAfterBindEmailEnabled: false,
      accountContributionEnabled: false,
    },
  });
  assert.deepEqual(api.calls[1], { type: 'render', stepIds: [88] });
});

test('syncLatestState keeps activeFlowId and flowId in sync when only one side changes', () => {
  const bundle = [
    extractFunction(sidepanelSource, 'syncLatestState'),
  ].join('\n');

  const api = new Function(`
let latestState = {
  activeFlowId: 'openai',
  flowId: 'openai',
  nodeStatuses: { 'open-chatgpt': 'completed' },
};
const DEFAULT_ACTIVE_FLOW_ID = 'openai';
const NODE_DEFAULT_STATUSES = { 'open-chatgpt': 'pending' };
const calls = [];
function normalizeFlowId(value = '', fallback = DEFAULT_ACTIVE_FLOW_ID) {
  const normalized = String(value || fallback || DEFAULT_ACTIVE_FLOW_ID).trim().toLowerCase() || DEFAULT_ACTIVE_FLOW_ID;
  return normalized === 'openai' ? 'openai' : DEFAULT_ACTIVE_FLOW_ID;
}
function getStoredNodeStatuses(state = {}) {
  return { ...NODE_DEFAULT_STATUSES, ...(state?.nodeStatuses || {}) };
}
function renderAccountRecords(state) {
  calls.push({ ...state });
}
${bundle}
return {
  syncLatestState,
  getLatestState() {
    return latestState;
  },
  getCalls() {
    return calls;
  },
};
`)();

  api.syncLatestState({ flowId: 'unknown' });

  assert.deepStrictEqual(api.getLatestState(), {
    activeFlowId: 'openai',
    flowId: 'openai',
    nodeStatuses: { 'open-chatgpt': 'completed' },
    targetId: 'cpa',
  });
  assert.equal(api.getCalls()[0].activeFlowId, 'openai');
  assert.equal(api.getCalls()[0].flowId, 'openai');
  assert.equal(api.getCalls()[0].targetId, 'cpa');
});

test('updatePanelModeUI reapplies dynamic phone visibility after flow group visibility', () => {
  const bundle = [
    extractFunction(sidepanelSource, 'updatePanelModeUI'),
  ].join('\n');

  const api = new Function(`
const calls = [];
let latestState = {
  activeFlowId: 'openai',
  flowId: 'openai',
  targetId: 'cpa',
};
const DEFAULT_ACTIVE_FLOW_ID = 'openai';
const selectFlow = { value: '' };
const selectPanelMode = { value: '' };
function normalizeFlowId(value = '', fallback = DEFAULT_ACTIVE_FLOW_ID) {
  return String(value || fallback || DEFAULT_ACTIVE_FLOW_ID).trim().toLowerCase() || DEFAULT_ACTIVE_FLOW_ID;
}
function normalizePanelMode(value = '', fallback = 'cpa') {
  return String(value || fallback || 'cpa').trim().toLowerCase() || 'cpa';
}
function getSelectedFlowId() {
  return latestState.activeFlowId;
}
function getSelectedTargetId() {
  return 'cpa';
}
function renderFlowSelectorOptions(flowId) {
  calls.push({ type: 'render-flow', flowId });
}
function renderTargetSelectorOptions(flowId, targetId) {
  calls.push({ type: 'render-target', flowId, targetId });
}
function applyFlowSettingsGroupVisibility(visibleGroupIds) {
  calls.push({ type: 'groups', visibleGroupIds: [...visibleGroupIds] });
}
function updatePhoneVerificationSettingsUI() {
  calls.push({ type: 'phone' });
}
function resolveCurrentSidepanelCapabilities() {
  return {
    visibleGroupIds: ['service-account', 'openai-phone'],
    effectiveTargetId: 'cpa',
  };
}
const document = {
  querySelector() {
    return null;
  },
};
${bundle}
return {
  calls,
  updatePanelModeUI,
  selectFlow,
  selectPanelMode,
};
`)();

  api.updatePanelModeUI();

  assert.deepEqual(
    api.calls.map((entry) => entry.type),
    ['render-flow', 'render-target', 'groups', 'phone']
  );
  assert.equal(api.selectFlow.value, 'openai');
  assert.equal(api.selectPanelMode.value, 'cpa');
});
