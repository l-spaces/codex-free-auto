const test = require('node:test');
const assert = require('node:assert/strict');
const { readFlowRegistryBundle, readBundle } = require('./helpers/script-bundles.js');

const flowRegistrySource = readFlowRegistryBundle();
const settingsSchemaSource = readBundle(['core/flow-kernel/settings-schema.js']);

function loadApis() {
  const scope = {};
  return new Function('self', `${flowRegistrySource}; ${settingsSchemaSource}; return {
    flowRegistry: self.MultiPageFlowRegistry,
    settingsSchema: self.MultiPageSettingsSchema,
  };`)(scope);
}

test('flow registry exposes only OpenAI flow and target metadata', () => {
  const { flowRegistry } = loadApis();
  const removedFlowIds = [['k', 'iro'].join(''), ['g', 'rok'].join('')];

  assert.deepEqual(flowRegistry.getRegisteredFlowIds(), ['openai']);
  removedFlowIds.forEach((flowId) => {
    assert.equal(flowRegistry.normalizeFlowId(flowId), 'openai');
  });
  assert.equal(flowRegistry.normalizeFlowId('unknown'), 'openai');
  assert.equal(flowRegistry.getFlowLabel('openai'), 'Codex / OpenAI');
  assert.deepEqual(
    flowRegistry.getFlowDefinition('openai')?.settingsDefaults?.autoRun?.stepExecutionRange,
    { enabled: false, fromStep: 1, toStep: 11 }
  );
  assert.deepEqual(
    flowRegistry.getFlowDefinition('openai')?.targets?.cpa?.defaultState,
    { vpsUrl: '', vpsPassword: '', localCpaStep9Mode: 'submit' }
  );
  assert.equal(
    flowRegistry.getTargetCapabilities('openai', 'cpa')?.usesOauthTimeoutBudget,
    true
  );
  assert.equal(
    flowRegistry.getTargetCapabilities('openai', 'sub2api')?.usesOauthTimeoutBudget,
    undefined
  );
  assert.equal(flowRegistry.normalizeTargetId('openai', 'sub2api'), 'sub2api');
  assert.deepEqual(
    flowRegistry.getVisibleGroupIds('openai', 'cpa'),
    ['openai-phone', 'shared-auto-run', 'openai-oauth', 'openai-step6', 'shared-settings-actions', 'openai-target-cpa', 'service-account', 'service-email']
  );
  assert.deepEqual(
    flowRegistry.getTargetOptions('openai').map((entry) => entry.id),
    ['cpa', 'sub2api', 'codex2api']
  );
  assert.deepEqual(
    flowRegistry.getSettingsGroupDefinition('shared-auto-run')?.rowIds,
    ['row-shared-auto-run', 'row-auto-run-thread-interval', 'row-step-execution-range']
  );
  assert.deepEqual(
    flowRegistry.getSettingsGroupDefinition('shared-settings-actions')?.rowIds,
    ['row-settings-actions']
  );
  assert.equal(flowRegistry.getFlowCapabilities('openai').supportsAccountContribution, true);
  assert.deepEqual(
    flowRegistry.getFlowCapabilities('openai').contributionAdapterIds,
    ['openai-oauth', 'openai-codex-file', 'openai-sub2api-file']
  );
});

test('settings schema normalizes view input into OpenAI canonical namespaces', () => {
  const { settingsSchema } = loadApis();
  const schema = settingsSchema.createSettingsSchema();

  const normalized = schema.normalizeSettingsState({
    activeFlowId: ['k', 'iro'].join(''),
    targetId: 'sub2api',
    mailProvider: 'hotmail',
    customPassword: 'SharedSecret123!',
    stepExecutionRangeByFlow: {
      openai: { enabled: true, fromStep: 2, toStep: 9 },
    },
  });

  assert.equal(normalized.activeFlowId, 'openai');
  assert.equal(normalized.services.email.provider, 'hotmail');
  assert.equal(normalized.services.account.customPassword, 'SharedSecret123!');
  assert.equal(normalized.flows.openai.selectedTargetId, 'sub2api');
  assert.deepEqual(Object.keys(normalized.flows), ['openai']);
  assert.deepEqual(normalized.flows.openai.autoRun.stepExecutionRange, {
    enabled: true,
    fromStep: 2,
    toStep: 9,
  });
});

test('settings schema lets explicit flat step range override stale canonical range', () => {
  const { settingsSchema } = loadApis();
  const schema = settingsSchema.createSettingsSchema();
  const oldState = schema.normalizeSettingsState({
    activeFlowId: 'openai',
    stepExecutionRangeByFlow: {
      openai: { enabled: true, fromStep: 3, toStep: 6 },
    },
  });

  const normalized = schema.normalizeSettingsState({
    settingsState: oldState,
    stepExecutionRangeByFlow: {
      openai: { enabled: false, fromStep: 3, toStep: 6 },
    },
  });

  assert.deepEqual(normalized.flows.openai.autoRun.stepExecutionRange, {
    enabled: false,
    fromStep: 3,
    toStep: 6,
  });
});

test('settings schema preserves registered custom flow settings without OpenAI hardcoding', () => {
  const { settingsSchema } = loadApis();
  const customFlowRegistry = {
    DEFAULT_FLOW_ID: 'openai',
    getRegisteredFlowIds: () => ['openai', 'sample'],
    getDefaultTargetId(flowId) {
      return flowId === 'sample' ? 'sample-target' : 'cpa';
    },
    getFlowDefinition(flowId) {
      if (flowId !== 'sample') {
        return null;
      }
      return {
        id: 'sample',
        defaultTargetId: 'sample-target',
        settingsDefaults: {
          targets: {
            'sample-target': {
              endpoint: 'https://sample.example.com',
            },
          },
          autoRun: {
            stepExecutionRange: { enabled: false, fromStep: 1, toStep: 3 },
          },
        },
      };
    },
    getTargetDefinitions(flowId) {
      if (flowId === 'sample') {
        return {
          'sample-target': { id: 'sample-target', label: 'Sample Target' },
        };
      }
      return {
        cpa: { id: 'cpa', label: 'CPA' },
        sub2api: { id: 'sub2api', label: 'SUB2API' },
        codex2api: { id: 'codex2api', label: 'Codex2API' },
      };
    },
    normalizeFlowId(value = '', fallback = 'openai') {
      const normalized = String(value || '').trim().toLowerCase();
      return ['openai', 'sample'].includes(normalized)
        ? normalized
        : (['openai', 'sample'].includes(fallback) ? fallback : 'openai');
    },
    normalizeTargetId(flowId, targetId = '', fallback = '') {
      const targets = Object.keys(customFlowRegistry.getTargetDefinitions(flowId));
      const normalized = String(targetId || '').trim().toLowerCase();
      if (targets.includes(normalized)) {
        return normalized;
      }
      if (targets.includes(fallback)) {
        return fallback;
      }
      return customFlowRegistry.getDefaultTargetId(flowId);
    },
  };
  const schema = settingsSchema.createSettingsSchema({ flowRegistry: customFlowRegistry });

  const normalized = schema.normalizeSettingsState({
    activeFlowId: 'sample',
    targetId: 'sample-target',
    settingsState: {
      flows: {
        sample: {
          selectedTargetId: 'sample-target',
          targets: {
            'sample-target': {
              endpoint: 'https://custom.example.com',
            },
          },
          autoRun: {
            stepExecutionRange: { enabled: true, fromStep: 2, toStep: 3 },
          },
        },
      },
    },
  });
  const view = schema.buildSettingsView(normalized);

  assert.equal(normalized.activeFlowId, 'sample');
  assert.equal(normalized.flows.sample.selectedTargetId, 'sample-target');
  assert.equal(normalized.flows.sample.targets['sample-target'].endpoint, 'https://custom.example.com');
  assert.deepEqual(view.stepExecutionRangeByFlow.sample, {
    enabled: true,
    fromStep: 2,
    toStep: 3,
  });
  assert.equal(schema.getSelectedTargetId(normalized, 'sample'), 'sample-target');
});
