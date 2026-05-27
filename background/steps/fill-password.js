(function attachBackgroundStep3(root, factory) {
  root.MultiPageBackgroundStep3 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundStep3Module() {
  function createStep3Executor(deps = {}) {
    const {
      addLog,
      chrome,
      ensureContentScriptReadyOnTab,
      generatePassword,
      getTabId,
      isTabAlive,
      sendToContentScript,
      setPasswordState,
      setState,
      SIGNUP_PAGE_INJECT_FILES,
    } = deps;

    function resolveStep3AccountIdentity(state = {}) {
      const resolvedEmail = String(state?.email || '').trim();
      const accountIdentifierType = 'email';
      const accountIdentifier = resolvedEmail;

      return {
        accountIdentifierType,
        accountIdentifier,
        email: resolvedEmail,
      };
    }

    async function executeStep3(state) {
      const identity = resolveStep3AccountIdentity(state);
      if (!identity.accountIdentifier) {
        throw new Error('缺少注册账号，请先完成步骤 2。');
      }

      const signupTabId = await getTabId('signup-page');
      if (!signupTabId || !(await isTabAlive('signup-page'))) {
        throw new Error('认证页面标签页已关闭，请先重新完成步骤 2。');
      }

      const password = state.customPassword || state.password || generatePassword();
      await setPasswordState(password);

      const accounts = state.accounts || [];
      accounts.push({
        email: identity.email,
        accountIdentifierType: identity.accountIdentifierType,
        accountIdentifier: identity.accountIdentifier,
        createdAt: new Date().toISOString(),
      });
      await setState({ accounts });

      await chrome.tabs.update(signupTabId, { active: true });
      await ensureContentScriptReadyOnTab('signup-page', signupTabId, {
        inject: SIGNUP_PAGE_INJECT_FILES,
        injectSource: 'signup-page',
        timeoutMs: 45000,
        retryDelayMs: 900,
        logMessage: '步骤 3：密码页内容脚本未就绪，正在等待页面恢复...',
      });

      const identityLabel = identity.accountIdentifierType === 'phone'
        ? `注册账号为 ${identity.accountIdentifier}`
        : `邮箱为 ${identity.accountIdentifier}`;
      await addLog(
        `步骤 3：正在填写密码，${identityLabel}，密码为${state.customPassword ? '自定义' : '自动生成'}（${password.length} 位）`
      );
      await sendToContentScript('signup-page', {
        type: 'EXECUTE_NODE',
        nodeId: 'fill-password',
        step: 3,
        source: 'background',
        payload: {
          email: identity.email,
          accountIdentifierType: identity.accountIdentifierType,
          accountIdentifier: identity.accountIdentifier,
          password,
        },
      });
    }

    return { executeStep3 };
  }

  return { createStep3Executor };
});
