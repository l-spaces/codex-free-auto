(function attachBackgroundStep6(root, factory) {
  root.MultiPageBackgroundStep6 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundStep6Module() {
  // 单位毫秒：步骤 6 固定等待 2 秒。
  const DEFAULT_REGISTRATION_SUCCESS_WAIT_MS = 2000;

  function createStep6Executor(deps = {}) {
    const {
      addLog = async () => {},
      chrome: chromeApi = globalThis.chrome,
      completeNodeFromBackground,
      getErrorMessage = (error) => error?.message || String(error || ''),
      getState = async () => ({}),
      registrationSuccessWaitMs = DEFAULT_REGISTRATION_SUCCESS_WAIT_MS,
      sleepWithStop = async (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0))),
    } = deps;

    function normalizeAccountWriteFlowType(value = '') {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'gpt' || normalized === 'codex' || normalized === 'full') {
        return normalized;
      }
      return '';
    }

    function resolveRegistrationEmail(state = {}) {
      const directEmail = String(state?.email || '').trim();
      if (directEmail) {
        return directEmail;
      }
      return String(state?.registrationEmailState?.currentEmail || '').trim();
    }

    // 步骤 6 完成后通知 sidepanel 追加写入本轮邮箱；失败仅记录日志，不中断主流程。
    async function requestAccountWriteOnStep6(state = {}) {
      if (!Boolean(state?.isAccountWriteEnabled)) {
        return { ok: true, skipped: true, reason: 'not_enabled' };
      }
      const email = resolveRegistrationEmail(state);
      if (!email) {
        return { ok: true, skipped: true, reason: 'empty_email' };
      }
      if (!chromeApi?.runtime?.sendMessage) {
        return { ok: true, skipped: true, reason: 'runtime_unavailable' };
      }

      const response = await chromeApi.runtime.sendMessage({
        type: 'ACCOUNT_WRITE_ON_STEP6',
        source: 'background',
        payload: {
          // 当前步骤 6 注册成功邮箱。
          email,
          // 当前写入账号文件对应流程类型（full/gpt/codex）。
          flowType: normalizeAccountWriteFlowType(state?.accountWriteFlowType),
          // 当前写入账号文件名。
          fileName: String(state?.accountWriteFileName || '').trim(),
        },
      });
      if (response?.error) {
        throw new Error(response.error);
      }
      return response || { ok: true };
    }

    async function executeStep6(state = null) {
      const currentState = state && typeof state === 'object' ? state : (await getState());
      const waitMs = Math.max(0, Math.floor(Number(registrationSuccessWaitMs) || 0));
      if (waitMs > 0) {
        await addLog(`步骤 6：等待 ${Math.round(waitMs / 1000)} 秒，确认注册成功并让页面稳定...`, 'info');
        await sleepWithStop(waitMs);
      }
      await addLog('步骤 6：注册成功等待完成。', 'ok');
      try {
        await requestAccountWriteOnStep6(currentState || {});
      } catch (error) {
        await addLog(`步骤 6：写入账号失败，已跳过：${getErrorMessage(error)}`, 'warn');
      }
      await completeNodeFromBackground('wait-registration-success');
    }

    return { executeStep6 };
  }

  return { createStep6Executor };
});
