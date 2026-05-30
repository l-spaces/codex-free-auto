(function attachMultiPageFlowCapabilities(root, factory) {
  root.MultiPageFlowCapabilities = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createFlowCapabilitiesModule() {
  const rootScope = typeof self !== 'undefined' ? self : globalThis;
  const flowRegistryApi = rootScope.MultiPageFlowRegistry || {};
  const contributionRegistryApi = rootScope.MultiPageContributionRegistry || {};
  const settingsSchemaApi = rootScope.MultiPageSettingsSchema || {};
  const DEFAULT_FLOW_ID = flowRegistryApi.DEFAULT_FLOW_ID || 'openai';
  const DEFAULT_OPENAI_TARGET_ID = flowRegistryApi.DEFAULT_OPENAI_TARGET_ID || 'cpa';
  const SIGNUP_METHOD_EMAIL = 'email';
  const SIGNUP_METHOD_PHONE = 'phone';
  const VALID_OPENAI_TARGET_IDS = typeof flowRegistryApi.getTargetDefinitions === 'function'
    ? Object.keys(flowRegistryApi.getTargetDefinitions('openai') || {})
    : (Array.isArray(flowRegistryApi.OPENAI_TARGET_IDS)
      ? flowRegistryApi.OPENAI_TARGET_IDS.slice()
      : ['cpa', 'sub2api', 'codex2api']);
  const REGISTERED_FLOW_IDS = Array.isArray(flowRegistryApi.getRegisteredFlowIds?.())
    ? flowRegistryApi.getRegisteredFlowIds().map((flowId) => String(flowId || '').trim().toLowerCase()).filter(Boolean)
    : [DEFAULT_FLOW_ID];
  const REGISTERED_FLOW_ID_SET = new Set(REGISTERED_FLOW_IDS);

  const DEFAULT_FLOW_CAPABILITIES = Object.freeze({
    supportsEmailSignup: true,
    supportsPhoneSignup: false,
    supportsPhoneVerificationSettings: false,
    supportsContributionMode: false,
    supportsAccountContribution: false,
    supportsOpenAiOAuthContribution: false,
    contributionAdapterIds: [],
    supportedTargetIds: [],
    supportsLuckmail: false,
    canSwitchFlow: true,
    stepDefinitionMode: 'default',
    targetSelectorLabel: '来源',
  });

  const FLOW_CAPABILITIES = Object.freeze(
    Object.fromEntries(
      (typeof flowRegistryApi.getRegisteredFlowIds === 'function'
        ? flowRegistryApi.getRegisteredFlowIds()
        : [DEFAULT_FLOW_ID]
      ).map((flowId) => [
        flowId,
        Object.freeze({
          ...DEFAULT_FLOW_CAPABILITIES,
          ...(typeof flowRegistryApi.getFlowCapabilities === 'function'
            ? flowRegistryApi.getFlowCapabilities(flowId)
            : {}),
        }),
      ])
    )
  );

  const DEFAULT_TARGET_CAPABILITIES = Object.freeze({
    supportsPhoneSignup: true,
    requiresPhoneSignupWarning: false,
    usesOauthTimeoutBudget: false,
  });

  const MODE_SWITCH_RELEVANT_KEYS = Object.freeze([
    'activeFlowId',
    'accountContributionEnabled',
    'phoneVerificationEnabled',
    'signupMethod',
    'targetId',
  ]);

  const OPENAI_TARGET_CAPABILITIES = Object.freeze(
    typeof flowRegistryApi.getTargetCapabilityDefinitions === 'function'
      ? (flowRegistryApi.getTargetCapabilityDefinitions('openai') || {})
      : {}
  );

  function normalizeFlowId(value = '', fallback = DEFAULT_FLOW_ID) {
    if (typeof flowRegistryApi.normalizeFlowId === 'function') {
      return flowRegistryApi.normalizeFlowId(value, fallback);
    }
    const normalized = String(value || '').trim().toLowerCase();
    if (REGISTERED_FLOW_ID_SET.has(normalized)) {
      return normalized;
    }
    const fallbackValue = String(fallback || '').trim().toLowerCase();
    if (REGISTERED_FLOW_ID_SET.has(fallbackValue)) {
      return fallbackValue;
    }
    return DEFAULT_FLOW_ID;
  }

  function normalizeCapabilityFlowId(value = '', fallback = DEFAULT_FLOW_ID) {
    return normalizeFlowId(value, fallback);
  }

  function isRegisteredFlowId(flowId = '') {
    const normalized = String(flowId || '').trim().toLowerCase();
    return Boolean(normalized) && REGISTERED_FLOW_ID_SET.has(normalized);
  }

  function normalizeOpenAiTargetId(value = '', fallback = DEFAULT_OPENAI_TARGET_ID) {
    const normalized = String(value || '').trim().toLowerCase();
    if (VALID_OPENAI_TARGET_IDS.includes(normalized)) {
      return normalized;
    }
    const fallbackValue = String(fallback || '').trim().toLowerCase();
    return VALID_OPENAI_TARGET_IDS.includes(fallbackValue)
      ? fallbackValue
      : DEFAULT_OPENAI_TARGET_ID;
  }

  function normalizeSignupMethod(value = '') {
    return String(value || '').trim().toLowerCase() === SIGNUP_METHOD_PHONE
      ? SIGNUP_METHOD_PHONE
      : SIGNUP_METHOD_EMAIL;
  }

  function normalizeOpenAiTargetList(values = []) {
    if (!Array.isArray(values)) {
      return [];
    }
    const seen = new Set();
    const normalized = [];
    values.forEach((value) => {
      const targetId = normalizeOpenAiTargetId(value, '');
      if (!targetId || seen.has(targetId)) {
        return;
      }
      seen.add(targetId);
      normalized.push(targetId);
    });
    return normalized;
  }

  function getTargetLabel(flowId = DEFAULT_FLOW_ID, targetId = '') {
    if (
      isRegisteredFlowId(flowId)
      && typeof flowRegistryApi.getTargetLabel === 'function'
    ) {
      return flowRegistryApi.getTargetLabel(flowId, targetId);
    }
    const normalized = String(targetId || '').trim().toLowerCase();
    if (normalized === 'sub2api') {
      return 'SUB2API';
    }
    if (normalized === 'codex2api') {
      return 'Codex2API';
    }
    if (normalized === 'cpa') {
      return 'CPA';
    }
    return normalized || String(targetId || '').trim();
  }

  function createFlowCapabilityRegistry(deps = {}) {
    const {
      defaultFlowCapabilities = DEFAULT_FLOW_CAPABILITIES,
      defaultFlowId = DEFAULT_FLOW_ID,
      defaultTargetCapabilities = DEFAULT_TARGET_CAPABILITIES,
      flowCapabilities = FLOW_CAPABILITIES,
      targetCapabilities = OPENAI_TARGET_CAPABILITIES,
    } = deps;
    const settingsSchema = settingsSchemaApi.createSettingsSchema
      ? settingsSchemaApi.createSettingsSchema({
        defaultFlowId,
      })
      : null;

    function getFlowCapabilities(flowId) {
      const normalizedFlowId = normalizeCapabilityFlowId(flowId, defaultFlowId);
      const entry = flowCapabilities[normalizedFlowId] || null;
      const registryAdapterIds = typeof contributionRegistryApi.getContributionAdapterIds === 'function'
        ? contributionRegistryApi.getContributionAdapterIds(normalizedFlowId)
        : [];
      const contributionAdapterIds = registryAdapterIds.length
        ? registryAdapterIds
        : (Array.isArray(entry?.contributionAdapterIds)
          ? entry.contributionAdapterIds.map((value) => String(value || '').trim()).filter(Boolean)
          : []);
      const supportedTargetIds = normalizedFlowId === 'openai'
        ? normalizeOpenAiTargetList(
          entry?.supportedTargetIds || defaultFlowCapabilities.supportedTargetIds
        )
        : (Array.isArray(entry?.supportedTargetIds)
          ? entry.supportedTargetIds.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
          : []);
      return {
        ...defaultFlowCapabilities,
        ...(entry || {}),
        supportedTargetIds,
        contributionAdapterIds,
        supportsAccountContribution: Boolean(entry?.supportsAccountContribution || contributionAdapterIds.length > 0),
      };
    }

    function getOpenAiTargetCapabilities(targetId) {
      const normalizedTargetId = normalizeOpenAiTargetId(targetId);
      return {
        ...defaultTargetCapabilities,
        ...(targetCapabilities[normalizedTargetId] || {}),
      };
    }

    function normalizeRequestedTargetId(activeFlowId, state = {}, options = {}) {
      const schemaTargetId = settingsSchema?.getSelectedTargetId
        ? settingsSchema.getSelectedTargetId({
          ...state,
          activeFlowId,
        }, activeFlowId)
        : '';
      const rawTargetId = options?.targetId
        ?? options?.selectedTargetId
        ?? state?.targetId
        ?? schemaTargetId
        ?? flowRegistryApi.getDefaultTargetId?.(activeFlowId)
        ?? '';

      if (
        isRegisteredFlowId(activeFlowId)
        && typeof flowRegistryApi.normalizeTargetId === 'function'
      ) {
        return flowRegistryApi.normalizeTargetId(
          activeFlowId,
          rawTargetId,
          flowRegistryApi.getDefaultTargetId?.(activeFlowId)
        );
      }

      return String(rawTargetId || '').trim().toLowerCase();
    }

    function normalizeChangedKeys(values = []) {
      const list = Array.isArray(values) ? values : [];
      const seen = new Set();
      const normalized = [];
      list.forEach((value) => {
        const key = String(value || '').trim();
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        normalized.push(key);
      });
      return normalized;
    }

    function resolveEffectiveTargetId(activeFlowId, state = {}, requestedTargetId = DEFAULT_OPENAI_TARGET_ID) {
      return normalizeRequestedTargetId(activeFlowId, state, {
        targetId: requestedTargetId,
      });
    }

    function resolveSidepanelCapabilities(options = {}) {
      const state = options?.state || {};
      const activeFlowId = normalizeCapabilityFlowId(
        options?.activeFlowId ?? state?.activeFlowId,
        defaultFlowId
      );
      const flowState = getFlowCapabilities(activeFlowId);
      const requestedTargetId = normalizeRequestedTargetId(
        activeFlowId,
        state,
        options
      );
      const supportedTargetIds = activeFlowId === 'openai'
        ? normalizeOpenAiTargetList(flowState.supportedTargetIds)
        : (Array.isArray(flowState.supportedTargetIds)
          ? flowState.supportedTargetIds.slice()
          : []);
      const targetSupported = supportedTargetIds.length === 0
        ? true
        : supportedTargetIds.includes(requestedTargetId);
      const effectiveTargetId = targetSupported
        ? requestedTargetId
        : (supportedTargetIds[0] || requestedTargetId);
      const targetState = activeFlowId === 'openai'
        ? getOpenAiTargetCapabilities(effectiveTargetId)
        : defaultTargetCapabilities;
      const runtimeLocks = {
        autoRunLocked: Boolean(options?.autoRunLocked ?? state?.autoRunLocked),
        accountContribution: Boolean(flowState.supportsAccountContribution) && Boolean(state?.accountContributionEnabled),
        phoneVerificationEnabled: activeFlowId === 'openai' && flowState.supportsPhoneVerificationSettings && Boolean(state?.phoneVerificationEnabled),
        settingsMenuLocked: Boolean(options?.settingsMenuLocked ?? state?.settingsMenuLocked),
      };
      const effectiveSignupMethods = [];
      if (flowState.supportsEmailSignup !== false) {
        effectiveSignupMethods.push(SIGNUP_METHOD_EMAIL);
      }
      const canSelectPhoneSignup = activeFlowId === 'openai'
        && Boolean(flowState.supportsPhoneSignup)
        && Boolean(targetState.supportsPhoneSignup)
        && runtimeLocks.phoneVerificationEnabled
        && !runtimeLocks.accountContribution;
      if (canSelectPhoneSignup) {
        effectiveSignupMethods.push(SIGNUP_METHOD_PHONE);
      }
      if (!effectiveSignupMethods.length) {
        effectiveSignupMethods.push(SIGNUP_METHOD_EMAIL);
      }
      const requestedSignupMethod = normalizeSignupMethod(
        options?.signupMethod ?? state?.signupMethod
      );
      const effectiveSignupMethod = requestedSignupMethod === SIGNUP_METHOD_PHONE && canSelectPhoneSignup
        ? SIGNUP_METHOD_PHONE
        : (effectiveSignupMethods.includes(SIGNUP_METHOD_EMAIL)
          ? SIGNUP_METHOD_EMAIL
          : effectiveSignupMethods[0]);
      const visibleGroupIds = typeof flowRegistryApi.getVisibleGroupIds === 'function'
        && isRegisteredFlowId(activeFlowId)
        ? flowRegistryApi.getVisibleGroupIds(activeFlowId, effectiveTargetId)
        : [];

      return {
        activeFlowId,
        canShowContributionMode: Boolean(flowState.supportsAccountContribution),
        canShowLuckmail: activeFlowId === 'openai' && Boolean(flowState.supportsLuckmail),
        canShowPhoneSettings: activeFlowId === 'openai' && Boolean(flowState.supportsPhoneVerificationSettings),
        canSwitchFlow: Boolean(flowState.canSwitchFlow),
        canUsePhoneSignup: canSelectPhoneSignup,
        canUseSelectedTarget: targetSupported,
        effectiveSignupMethod,
        effectiveSignupMethods,
        effectiveTargetId,
        flowCapabilities: flowState,
        panelCapabilities: targetState,
        requestedSignupMethod,
        requestedTargetId,
        runtimeLocks,
        shouldWarnCpaPhoneSignup: effectiveSignupMethod === SIGNUP_METHOD_PHONE
          && Boolean(targetState.requiresPhoneSignupWarning),
        stepDefinitionOptions: {
          activeFlowId,
          targetId: effectiveTargetId,
          phoneVerificationEnabled: runtimeLocks.phoneVerificationEnabled,
          signupMethod: effectiveSignupMethod,
        },
        supportedPanelModes: supportedTargetIds,
        supportedTargetIds,
        targetCapabilities: targetState,
        targetId: effectiveTargetId,
        visibleGroupIds,
      };
    }

    function buildPhoneSignupValidationError(capabilityState = {}) {
      const flowState = capabilityState.flowCapabilities || {};
      const targetState = capabilityState.targetCapabilities || {};
      const runtimeLocks = capabilityState.runtimeLocks || {};

      if (!flowState.supportsPhoneSignup) {
        return {
          code: 'phone_signup_flow_unsupported',
          message: '当前 flow 不支持手机号注册。',
        };
      }
      if (!targetState.supportsPhoneSignup) {
        return {
          code: 'phone_signup_panel_unsupported',
          message: `当前来源 ${getTargetLabel(capabilityState.activeFlowId, capabilityState.requestedTargetId)} 不支持手机号注册。`,
        };
      }
      if (!runtimeLocks.phoneVerificationEnabled) {
        return {
          code: 'phone_signup_phone_verification_disabled',
          message: '请先开启接码设置后再使用手机号注册。',
        };
      }
      if (runtimeLocks.accountContribution) {
        return {
          code: 'phone_signup_contribution_mode_locked',
          message: '贡献模式开启时不能使用手机号注册。',
        };
      }
      return {
        code: 'phone_signup_unavailable',
        message: '当前设置暂不支持手机号注册。',
      };
    }

    function validateAutoRunStart(options = {}) {
      const state = options?.state || {};
      const capabilityState = resolveSidepanelCapabilities(options);
      const errors = [];

      if (
        Array.isArray(capabilityState.supportedTargetIds)
        && capabilityState.supportedTargetIds.length > 0
        && capabilityState.canUseSelectedTarget === false
      ) {
        errors.push({
          code: 'panel_mode_unsupported',
          message: `当前 flow 不支持 ${getTargetLabel(capabilityState.activeFlowId, capabilityState.requestedTargetId)} 来源。`,
        });
      }

      if (Boolean(state?.accountContributionEnabled) && !capabilityState.flowCapabilities?.supportsAccountContribution) {
        errors.push({
          code: 'contribution_mode_unsupported',
          message: '当前 flow 不支持贡献模式。',
        });
      }

      if (
        capabilityState.requestedSignupMethod === SIGNUP_METHOD_PHONE
        && capabilityState.effectiveSignupMethod !== SIGNUP_METHOD_PHONE
      ) {
        errors.push(buildPhoneSignupValidationError(capabilityState));
      }

      return {
        ok: errors.length === 0,
        errors,
        capabilityState,
      };
    }

    function validateModeSwitch(options = {}) {
      const state = options?.state || {};
      const changedKeys = normalizeChangedKeys(
        options?.changedKeys !== undefined
          ? options.changedKeys
          : Object.keys(state || {})
      );
      const changedKeySet = new Set(changedKeys);
      const capabilityState = resolveSidepanelCapabilities(options);
      const errors = [];
      const normalizedUpdates = {};
      const flowState = capabilityState.flowCapabilities || {};
      const requestedPhoneSignup = capabilityState.requestedSignupMethod === SIGNUP_METHOD_PHONE;
      const shouldReconcileSignupMethod = MODE_SWITCH_RELEVANT_KEYS.some((key) => changedKeySet.has(key));

      if (
        changedKeySet.has('targetId')
        && Array.isArray(capabilityState.supportedTargetIds)
        && capabilityState.supportedTargetIds.length > 0
        && capabilityState.canUseSelectedTarget === false
      ) {
        normalizedUpdates.targetId = capabilityState.effectiveTargetId;
        errors.push({
          code: 'panel_mode_unsupported',
          message: `当前 flow 不支持 ${getTargetLabel(capabilityState.activeFlowId, capabilityState.requestedTargetId)} 来源。`,
        });
      }

      if (
        changedKeySet.has('accountContributionEnabled')
        && Boolean(state?.accountContributionEnabled)
        && !flowState.supportsAccountContribution
      ) {
        normalizedUpdates.accountContributionEnabled = false;
        errors.push({
          code: 'contribution_mode_unsupported',
          message: '当前 flow 不支持贡献模式。',
        });
      }

      if (
        changedKeySet.has('phoneVerificationEnabled')
        && Boolean(state?.phoneVerificationEnabled)
        && !flowState.supportsPhoneVerificationSettings
      ) {
        normalizedUpdates.phoneVerificationEnabled = false;
        errors.push({
          code: 'phone_verification_unsupported',
          message: '当前 flow 不支持接码设置。',
        });
      }

      if (
        shouldReconcileSignupMethod
        && requestedPhoneSignup
        && capabilityState.effectiveSignupMethod !== SIGNUP_METHOD_PHONE
      ) {
        normalizedUpdates.signupMethod = capabilityState.effectiveSignupMethod;
        errors.push(buildPhoneSignupValidationError(capabilityState));
      }

      return {
        ok: errors.length === 0,
        changedKeys,
        capabilityState,
        errors,
        normalizedUpdates,
      };
    }

    function canUsePhoneSignup(state = {}) {
      return resolveSidepanelCapabilities({ state }).canUsePhoneSignup;
    }

    function resolveSignupMethod(state = {}, signupMethod = undefined) {
      return resolveSidepanelCapabilities({
        signupMethod,
        state,
      }).effectiveSignupMethod;
    }

    return {
      canUsePhoneSignup,
      getFlowCapabilities,
      getOpenAiTargetCapabilities,
      normalizeFlowId,
      normalizeOpenAiTargetId,
      normalizeSignupMethod,
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
    DEFAULT_TARGET_CAPABILITIES,
    DEFAULT_OPENAI_TARGET_ID,
    FLOW_CAPABILITIES,
    OPENAI_TARGET_CAPABILITIES,
    SIGNUP_METHOD_EMAIL,
    SIGNUP_METHOD_PHONE,
    VALID_OPENAI_TARGET_IDS,
    normalizeFlowId,
    normalizeOpenAiTargetId,
    normalizeSignupMethod,
  };
});
