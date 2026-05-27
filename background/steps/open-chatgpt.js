(function attachBackgroundStep1(root, factory) {
  root.MultiPageBackgroundStep1 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundStep1Module() {
  const STEP1_COOKIE_CLEAR_DOMAINS = [
    'chatgpt.com',
    'chat.openai.com',
    'openai.com',
    'auth.openai.com',
    'auth0.openai.com',
    'accounts.openai.com',
  ];
  const STEP1_COOKIE_SCAN_DOMAINS = [...STEP1_COOKIE_CLEAR_DOMAINS];

  function getStep1ErrorMessage(error) {
    return error?.message || String(error || '未知错误');
  }
  const cookieCleanupApi = self.MultiPageCookieCleanup || {};
  const cleanupCookies = typeof cookieCleanupApi.cleanupCookies === 'function'
    ? cookieCleanupApi.cleanupCookies
    : async () => ({
      matchedCount: 0,
      removedCount: 0,
      queryCount: 0,
      storeCount: 0,
      browsingDataInvoked: false,
      browsingDataError: null,
    });

  function createStep1Executor(deps = {}) {
    const {
      addLog,
      chrome: chromeApi = globalThis.chrome,
      completeNodeFromBackground,
      openSignupEntryTab,
    } = deps;

    async function clearOpenAiCookiesBeforeStep1() {
      if (!chromeApi?.cookies?.getAll || !chromeApi.cookies?.remove) {
        await addLog('步骤 1：当前浏览器不支持 cookies API，跳过打开官网前 cookie 清理。', 'warn');
        return;
      }

      const startedAt = Date.now();
      await addLog('步骤 1：打开 ChatGPT 官网前清理 ChatGPT / OpenAI cookies...', 'info');
      const cleanupResult = await cleanupCookies(chromeApi, {
        clearDomains: STEP1_COOKIE_CLEAR_DOMAINS,
        scanDomains: STEP1_COOKIE_SCAN_DOMAINS,
        skipBrowsingDataWhenNoMatch: true,
        removeConcurrency: 6,
        getErrorMessage: getStep1ErrorMessage,
        warnLabel: 'step1',
      });
      if (cleanupResult.matchedCount === 0) {
        await addLog('步骤 1：未检测到待清理的 ChatGPT / OpenAI cookies，跳过清理。', 'info');
        return;
      }

      const elapsedMs = Date.now() - startedAt;
      await addLog(`步骤 1：已清理 ${cleanupResult.removedCount} 个 ChatGPT / OpenAI cookies（耗时 ${elapsedMs}ms）。`, 'ok');
    }

    async function executeStep1() {
      await clearOpenAiCookiesBeforeStep1();
      await addLog('步骤 1：正在打开 ChatGPT 官网...');
      await openSignupEntryTab(1);
      await completeNodeFromBackground('open-chatgpt', {});
    }

    return { executeStep1 };
  }

  return { createStep1Executor };
});
