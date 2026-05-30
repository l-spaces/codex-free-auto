(function attachLegacySettingsImporter(root, factory) {
  root.MultiPageLegacySettingsImporter = factory(root);
})(typeof self !== 'undefined' ? self : globalThis, function createLegacySettingsImporterModule(root) {
  const LEGACY_TOP_LEVEL_KEYS = Object.freeze([
    'panelMode',
    'openaiIntegrationTargetId',
    'stepExecutionRangeByFlow',
  ]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneValue(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => cloneValue(entry));
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [key, cloneValue(entryValue)])
      );
    }
    return value;
  }

  function collectLegacyFieldHits(input = {}) {
    if (!isPlainObject(input)) {
      return [];
    }

    const hits = [];
    LEGACY_TOP_LEVEL_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        hits.push(key);
      }
    });

    const settingsState = isPlainObject(input.settingsState) ? input.settingsState : {};
    const openaiSettings = isPlainObject(settingsState?.flows?.openai) ? settingsState.flows.openai : {};
    if (Object.prototype.hasOwnProperty.call(openaiSettings, 'integrationTargetId')) {
      hits.push('settingsState.flows.openai.integrationTargetId');
    }
    if (Object.prototype.hasOwnProperty.call(openaiSettings, 'integrationTargets')) {
      hits.push('settingsState.flows.openai.integrationTargets');
    }

    return Array.from(new Set(hits));
  }

  function resolveSettingsSchemaApi(deps = {}) {
    if (deps.settingsSchemaApi?.normalizeSettingsState && deps.settingsSchemaApi?.buildSettingsView) {
      return deps.settingsSchemaApi;
    }
    const settingsSchemaModule = deps.settingsSchemaModule || root.MultiPageSettingsSchema || null;
    if (typeof settingsSchemaModule?.createSettingsSchema !== 'function') {
      return null;
    }
    return settingsSchemaModule.createSettingsSchema({
      flowRegistry: deps.flowRegistry || root.MultiPageFlowRegistry || null,
      defaultFlowId: deps.defaultFlowId,
    });
  }

  function buildImportInput(input = {}) {
    const next = isPlainObject(input) ? cloneValue(input) : {};
    const settingsState = isPlainObject(next.settingsState) ? next.settingsState : {};
    const flows = isPlainObject(settingsState.flows) ? settingsState.flows : {};
    const openaiState = isPlainObject(flows.openai) ? flows.openai : {};
    const legacyOpenAiTargetId = String(
      input?.openaiIntegrationTargetId
      ?? input?.panelMode
      ?? ''
    ).trim();
    const openaiHasCanonicalTarget = Object.prototype.hasOwnProperty.call(openaiState, 'selectedTargetId')
      || Object.prototype.hasOwnProperty.call(openaiState, 'integrationTargetId');

    if (!openaiHasCanonicalTarget && legacyOpenAiTargetId) {
      next.settingsState = settingsState;
      next.settingsState.flows = flows;
      next.settingsState.flows.openai = {
        ...openaiState,
        selectedTargetId: legacyOpenAiTargetId,
      };
    }

    return next;
  }

  function createSettingsImporter(deps = {}) {
    const settingsSchemaApi = resolveSettingsSchemaApi(deps);

    function importSettings(input = {}) {
      if (!isPlainObject(input)) {
        throw new Error('配置文件中的 settings 内容无效。');
      }
      if (!settingsSchemaApi?.normalizeSettingsState) {
        throw new Error('设置导入器未完成初始化。');
      }

      const importInput = buildImportInput(input);
      const normalizedState = settingsSchemaApi.normalizeSettingsState(importInput, {
        activeFlowId: importInput.activeFlowId || importInput.flowId || deps.defaultFlowId,
      });

      return {
        settingsSchemaVersion: Number(normalizedState.schemaVersion) || 0,
        settingsState: cloneValue(normalizedState),
        legacyFieldHits: collectLegacyFieldHits(input),
      };
    }

    return {
      collectLegacyFieldHits,
      importSettings,
    };
  }

  return {
    LEGACY_TOP_LEVEL_KEYS,
    collectLegacyFieldHits,
    createSettingsImporter,
  };
});
