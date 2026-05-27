(function attachOperationDelay(root) {
  const OPERATION_DELAY_MS = 2000;
  const OPERATION_DELAY_MIN_MS = 120;
  const OPERATION_DELAY_BY_KIND_MS = Object.freeze({
    fill: 1200,
    select: 1000,
    click: 1000,
    submit: 1300,
    'hidden-sync': 300,
    'grouped-code': 1400,
  });
  const SETTING_RESTORE_FALLBACK_MS = 50;
  const EXCLUDED_STEP_KEYS = new Set(['confirm-oauth', 'platform-verify']);
  let operationDelayEnabled = true;
  let operationDelaySettingReady = null;
  let operationDelaySettingRevision = 0;

  function normalizeOperationDelayEnabled(value) {
    return typeof value === 'boolean' ? value : true;
  }

  function getOperationDelayEnabled() {
    return operationDelayEnabled;
  }

  async function refreshOperationDelaySetting() {
    const restoreRevision = ++operationDelaySettingRevision;
    const ready = (async () => {
      let nextEnabled = true;
      try {
        const data = await root.chrome?.storage?.local?.get?.(['operationDelayEnabled']);
        nextEnabled = normalizeOperationDelayEnabled(data?.operationDelayEnabled);
      } catch {
        nextEnabled = true;
      }
      if (operationDelaySettingRevision === restoreRevision) {
        operationDelayEnabled = nextEnabled;
      }
      return operationDelayEnabled;
    })();
    operationDelaySettingReady = ready;
    try {
      return await ready;
    } finally {
      if (operationDelaySettingReady === ready) {
        operationDelaySettingReady = null;
      }
    }
  }

  function shouldDelayOperation(metadata = {}) {
    if (metadata.skipOperationDelay === true) return false;
    if (EXCLUDED_STEP_KEYS.has(String(metadata.stepKey || '').trim())) return false;
    const enabled = Object.prototype.hasOwnProperty.call(metadata, 'enabled')
      ? normalizeOperationDelayEnabled(metadata.enabled)
      : getOperationDelayEnabled();
    if (enabled === false) return false;
    return true;
  }

  function waitForOperationDelaySettingFallback() {
    return new Promise((resolve) => {
      const schedule = root.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
      if (typeof schedule === 'function') {
        schedule(() => resolve(getOperationDelayEnabled()), SETTING_RESTORE_FALLBACK_MS);
        return;
      }
      resolve(getOperationDelayEnabled());
    });
  }

  async function resolveOperationDelayEnabled(metadata = {}, options = {}) {
    if (typeof options.getEnabled === 'function') {
      return normalizeOperationDelayEnabled(options.getEnabled());
    }
    if (Object.prototype.hasOwnProperty.call(metadata, 'enabled')) {
      return normalizeOperationDelayEnabled(metadata.enabled);
    }
    if (operationDelaySettingReady) {
      return normalizeOperationDelayEnabled(await Promise.race([
        operationDelaySettingReady,
        waitForOperationDelaySettingFallback(),
      ]));
    }
    return getOperationDelayEnabled();
  }

  function resolveOperationDelayMs(metadata = {}) {
    if (!metadata || typeof metadata !== 'object') {
      return OPERATION_DELAY_MS;
    }

    const kindKey = String(metadata.kind || '').trim().toLowerCase();
    const kindDelay = OPERATION_DELAY_BY_KIND_MS[kindKey];
    if (Number.isFinite(kindDelay) && kindDelay >= 0) {
      return Math.max(OPERATION_DELAY_MIN_MS, Math.floor(kindDelay));
    }

    return OPERATION_DELAY_MS;
  }

  async function performOperationWithDelay(metadata = {}, operation, options = {}) {
    const result = await operation();
    const enabled = await resolveOperationDelayEnabled(metadata, options);
    if (shouldDelayOperation({ ...metadata, enabled })) {
      const wait = options.sleep || root.sleep;
      await wait(resolveOperationDelayMs(metadata));
    }
    return result;
  }

  root.chrome?.storage?.onChanged?.addListener?.((changes, areaName) => {
    if (areaName === 'local' && Object.prototype.hasOwnProperty.call(changes, 'operationDelayEnabled')) {
      operationDelaySettingRevision += 1;
      operationDelayEnabled = normalizeOperationDelayEnabled(changes.operationDelayEnabled?.newValue);
    }
  });

  refreshOperationDelaySetting().catch(() => { operationDelayEnabled = true; });
  root.CodexOperationDelay = {
    OPERATION_DELAY_MS,
    normalizeOperationDelayEnabled,
    refreshOperationDelaySetting,
    getOperationDelayEnabled,
    shouldDelayOperation,
    resolveOperationDelayMs,
    performOperationWithDelay,
  };
})(typeof self !== 'undefined' ? self : globalThis);
