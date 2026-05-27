(function attachMultiPageFlowCapabilities(root, factory) {
  root.MultiPageFlowCapabilities = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createFlowCapabilitiesModule() {
  const DEFAULT_FLOW_ID = 'openai';
  const DEFAULT_PANEL_MODE = 'cpa';
  const SIGNUP_METHOD_EMAIL = 'email';
  const VALID_PANEL_MODES = Object.freeze(['cpa', 'sub2api', 'codex2api']);

  const DEFAULT_FLOW_CAPABILITIES = Object.freeze({
    supportsEmailSignup: true,
    supportsPlatformBinding: [],
    supportsLuckmail: false,
    supportsOauthTimeoutBudget: false,
    canSwitchFlow: false,
    stepDefinitionMode: 'default',
  });

  const FLOW_CAPABILITIES = Object.freeze({
    openai: Object.freeze({
      ...DEFAULT_FLOW_CAPABILITIES,
      supportsPlatformBinding: ['cpa', 'sub2api', 'codex2api'],
      supportsLuckmail: true,
      supportsOauthTimeoutBudget: true,
      stepDefinitionMode: 'openai-dynamic',
    }),
  });

  function normalizeFlowId(value = '', fallback = DEFAULT_FLOW_ID) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized) {
      return normalized;
    }
    const fallbackValue = String(fallback || '').trim().toLowerCase();
    return fallbackValue || DEFAULT_FLOW_ID;
  }

  function normalizePanelMode(value = '', fallback = DEFAULT_PANEL_MODE) {
    const normalized = String(value || '').trim().toLowerCase();
    if (VALID_PANEL_MODES.includes(normalized)) {
      return normalized;
    }
    const fallbackValue = String(fallback || '').trim().toLowerCase();
    return VALID_PANEL_MODES.includes(fallbackValue) ? fallbackValue : DEFAULT_PANEL_MODE;
  }

  function normalizePanelModeList(values = []) {
    if (!Array.isArray(values)) {
      return [];
    }
    const seen = new Set();
    const normalized = [];
    values.forEach((value) => {
      const mode = normalizePanelMode(value, '');
      if (!mode || seen.has(mode)) {
        return;
      }
      seen.add(mode);
      normalized.push(mode);
    });
    return normalized;
  }

  function getPanelModeLabel(panelMode = '') {
    const normalized = normalizePanelMode(panelMode);
    if (normalized === 'sub2api') {
      return 'SUB2API';
    }
    if (normalized === 'codex2api') {
      return 'Codex2API';
    }
    return 'CPA';
  }

  function createFlowCapabilityRegistry(deps = {}) {
    const {
      defaultFlowCapabilities = DEFAULT_FLOW_CAPABILITIES,
      defaultFlowId = DEFAULT_FLOW_ID,
      flowCapabilities = FLOW_CAPABILITIES,
    } = deps;

    function getFlowCapabilities(flowId) {
      const normalizedFlowId = normalizeFlowId(flowId, defaultFlowId);
      const entry = flowCapabilities[normalizedFlowId] || null;
      return {
        ...defaultFlowCapabilities,
        ...(entry || {}),
        supportsPlatformBinding: normalizePanelModeList(entry?.supportsPlatformBinding || defaultFlowCapabilities.supportsPlatformBinding),
      };
    }

    function resolveSidepanelCapabilities(options = {}) {
      const state = options?.state || {};
      const activeFlowId = normalizeFlowId(
        options?.activeFlowId ?? state?.activeFlowId,
        defaultFlowId
      );
      const flowState = getFlowCapabilities(activeFlowId);
      const requestedPanelMode = normalizePanelMode(
        options?.panelMode ?? state?.panelMode,
        DEFAULT_PANEL_MODE
      );
      const supportedPanelModes = normalizePanelModeList(flowState.supportsPlatformBinding);
      const panelModeSupported = supportedPanelModes.length === 0
        ? true
        : supportedPanelModes.includes(requestedPanelMode);
      const effectivePanelMode = panelModeSupported
        ? requestedPanelMode
        : supportedPanelModes[0];

      return {
        activeFlowId,
        canShowLuckmail: Boolean(flowState.supportsLuckmail),
        canShowPhoneSettings: false,
        canSwitchFlow: Boolean(flowState.canSwitchFlow),
        canUsePhoneSignup: false,
        canUseSelectedPanelMode: panelModeSupported,
        effectivePanelMode,
        effectiveSignupMethod: SIGNUP_METHOD_EMAIL,
        effectiveSignupMethods: [SIGNUP_METHOD_EMAIL],
        flowCapabilities: flowState,
        panelCapabilities: {},
        panelMode: effectivePanelMode,
        requestedPanelMode,
        requestedSignupMethod: SIGNUP_METHOD_EMAIL,
        runtimeLocks: {
          autoRunLocked: Boolean(options?.autoRunLocked ?? state?.autoRunLocked),
          settingsMenuLocked: Boolean(options?.settingsMenuLocked ?? state?.settingsMenuLocked),
        },
        shouldWarnCpaPhoneSignup: false,
        stepDefinitionOptions: {
          activeFlowId,
          panelMode: effectivePanelMode,
          signupMethod: SIGNUP_METHOD_EMAIL,
        },
        supportedPanelModes,
      };
    }

    function validateAutoRunStart(options = {}) {
      const state = options?.state || {};
      const capabilityState = resolveSidepanelCapabilities(options);
      const errors = [];

      if (
        Array.isArray(capabilityState.supportedPanelModes)
        && capabilityState.supportedPanelModes.length > 0
        && capabilityState.canUseSelectedPanelMode === false
      ) {
        errors.push({
          code: 'panel_mode_unsupported',
          message: `当前 flow 不支持 ${getPanelModeLabel(capabilityState.requestedPanelMode)} 面板模式。`,
        });
      }

      return {
        ok: errors.length === 0,
        errors,
        capabilityState,
      };
    }

    function validateModeSwitch(options = {}) {
      const state = options?.state || {};
      const capabilityState = resolveSidepanelCapabilities(options);
      const errors = [];
      const normalizedUpdates = {};

      if (
        Array.isArray(capabilityState.supportedPanelModes)
        && capabilityState.supportedPanelModes.length > 0
        && capabilityState.canUseSelectedPanelMode === false
      ) {
        normalizedUpdates.panelMode = capabilityState.effectivePanelMode;
        errors.push({
          code: 'panel_mode_unsupported',
          message: `当前 flow 不支持 ${getPanelModeLabel(capabilityState.requestedPanelMode)} 面板模式。`,
        });
      }

      if (String(state?.signupMethod || '').trim().toLowerCase() !== SIGNUP_METHOD_EMAIL) {
        normalizedUpdates.signupMethod = SIGNUP_METHOD_EMAIL;
      }

      return {
        ok: errors.length === 0,
        changedKeys: Array.isArray(options?.changedKeys) ? options.changedKeys : Object.keys(state || {}),
        capabilityState,
        errors,
        normalizedUpdates,
      };
    }

    function canUsePhoneSignup() {
      return false;
    }

    function resolveSignupMethod() {
      return SIGNUP_METHOD_EMAIL;
    }

    return {
      canUsePhoneSignup,
      getFlowCapabilities,
      normalizeFlowId,
      normalizePanelMode,
      normalizeSignupMethod: () => SIGNUP_METHOD_EMAIL,
      resolveSidepanelCapabilities,
      resolveSignupMethod,
      validateAutoRunStart,
      validateModeSwitch,
    };
  }

  return {
    createFlowCapabilityRegistry,
    DEFAULT_FLOW_CAPABILITIES,
    DEFAULT_FLOW_ID,
    DEFAULT_PANEL_MODE,
    FLOW_CAPABILITIES,
    SIGNUP_METHOD_EMAIL,
    normalizeFlowId,
    normalizePanelMode,
    normalizeSignupMethod: () => SIGNUP_METHOD_EMAIL,
  };
});
