(function attachSensitiveSettings(root, factory) {
  root.MultiPageSensitiveSettings = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createSensitiveSettingsModule() {
  const LOCAL_ONLY_SETTING_KEYS = Object.freeze([
    'duckApiAuthorization',
  ]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function omitLocalOnlySettings(state = {}) {
    const next = isPlainObject(state) ? { ...state } : {};
    LOCAL_ONLY_SETTING_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
      }
    });
    return next;
  }

  function buildStateStorageView(options = {}) {
    const {
      defaultState = {},
      persistedSettings = {},
      persistedAliasState = {},
      sessionState = {},
      accountRunHistory = [],
    } = options || {};

    // local-only 敏感字段以 chrome.storage.local 为准，避免旧 session 覆盖新配置。
    return {
      ...(isPlainObject(defaultState) ? defaultState : {}),
      ...(isPlainObject(persistedSettings) ? persistedSettings : {}),
      ...(isPlainObject(persistedAliasState) ? persistedAliasState : {}),
      ...omitLocalOnlySettings(sessionState),
      accountRunHistory: Array.isArray(accountRunHistory) ? accountRunHistory : [],
    };
  }

  return {
    LOCAL_ONLY_SETTING_KEYS,
    buildStateStorageView,
    omitLocalOnlySettings,
  };
});
