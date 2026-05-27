(function attachSignupFlowHelpers(root, factory) {
  root.MultiPageSignupFlowHelpers = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createSignupFlowHelpersModule() {
  function createSignupFlowHelpers(deps = {}) {
    const {
      addLog,
      buildGeneratedAliasEmail,
      chrome,
      ensureContentScriptReadyOnTab,
      ensureHotmailAccountForFlow,
      ensureMail2925AccountForFlow,
      ensureLuckmailPurchaseForFlow,
      ensureGptmailAddressForFlow,
      fetchGeneratedEmail,
      isGeneratedAliasProvider,
      isReusableGeneratedAliasEmail,
      isHotmailProvider,
      isRetryableContentScriptTransportError = () => false,
      isLuckmailProvider,
      isGptmailProvider = () => false,
      isSignupEmailVerificationPageUrl,
      isSignupPasswordPageUrl,
      isSignupPhoneVerificationPageUrl = null,
      isSignupProfilePageUrl = null,
      persistRegistrationEmailState = null,
      reuseOrCreateTab,
      sendToContentScriptResilient,
      setEmailState,
      setState,
      SIGNUP_ENTRY_URL,
      SIGNUP_PAGE_INJECT_FILES,
      waitForTabStableComplete = null,
      waitForTabUrlMatch,
    } = deps;

    async function waitForSignupEntryTabToSettle(tabId, step = 1) {
      if (step !== 2 || !Number.isInteger(tabId) || typeof waitForTabStableComplete !== 'function') {
        return null;
      }

      // Do not request window focus here. The automation tab is already
      // locked to the selected Chrome window; raising that window would
      // interrupt the user's active workspace.

      if (typeof addLog === 'function') {
        await addLog(
          `步骤 ${step}：注册页已打开，正在等待页面加载完成并额外稳定 3 秒...`,
          'info',
          { step, stepKey: 'signup-entry' }
        );
      }

      return waitForTabStableComplete(tabId, {
        timeoutMs: 45000,
        retryDelayMs: 300,
        stableMs: 3000,
        initialDelayMs: 300,
      });
    }

    async function openSignupEntryTab(step = 1) {
      const tabId = await reuseOrCreateTab('signup-page', SIGNUP_ENTRY_URL, {
        inject: SIGNUP_PAGE_INJECT_FILES,
        injectSource: 'signup-page',
      });

      await waitForSignupEntryTabToSettle(tabId, step);

      await ensureContentScriptReadyOnTab('signup-page', tabId, {
        inject: SIGNUP_PAGE_INJECT_FILES,
        injectSource: 'signup-page',
        timeoutMs: 45000,
        retryDelayMs: 900,
        logMessage: `步骤 ${step}：ChatGPT 官网仍在加载，正在重试连接内容脚本...`,
      });

      return tabId;
    }

    async function ensureSignupEntryPageReady(step = 1) {
      const tabId = await openSignupEntryTab(step);
      const result = await sendToContentScriptResilient('signup-page', {
        type: 'ENSURE_SIGNUP_ENTRY_READY',
        step,
        source: 'background',
        payload: {},
      }, {
        timeoutMs: 20000,
        retryDelayMs: 700,
        logMessage: `步骤 ${step}：官网注册入口正在切换，等待页面恢复...`,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return { tabId, result: result || {} };
    }

    function parseUrlSafely(rawUrl) {
      if (!rawUrl) return null;
      try {
        return new URL(rawUrl);
      } catch {
        return null;
      }
    }

    function fallbackSignupPhoneVerificationPageUrl(rawUrl) {
      const parsed = parseUrlSafely(rawUrl);
      if (!parsed) return false;
      return /\/phone-verification(?:[/?#]|$)/i.test(parsed.pathname || '');
    }

    function fallbackSignupProfilePageUrl(rawUrl) {
      const parsed = parseUrlSafely(rawUrl);
      if (!parsed) return false;
      return /\/(?:create-account\/profile|u\/signup\/profile|signup\/profile|about-you)(?:[/?#]|$)/i.test(parsed.pathname || '');
    }

    function resolveSignupPostIdentityState(rawUrl) {
      if (isSignupPasswordPageUrl(rawUrl)) {
        return 'password_page';
      }
      if (isSignupEmailVerificationPageUrl(rawUrl)) {
        return 'verification_page';
      }
      const isPhoneVerificationUrl = typeof isSignupPhoneVerificationPageUrl === 'function'
        ? isSignupPhoneVerificationPageUrl(rawUrl)
        : fallbackSignupPhoneVerificationPageUrl(rawUrl);
      if (isPhoneVerificationUrl) {
        return 'phone_verification_page';
      }
      const isProfileUrl = typeof isSignupProfilePageUrl === 'function'
        ? isSignupProfilePageUrl(rawUrl)
        : fallbackSignupProfilePageUrl(rawUrl);
      if (isProfileUrl) {
        return 'profile_page';
      }
      return '';
    }

    function resolveSignupPostIdentityStateFromAuthState(authState = '') {
      const normalized = String(authState || '').trim().toLowerCase();
      switch (normalized) {
        case 'password_page':
          return 'password_page';
        case 'verification_page':
          return 'verification_page';
        case 'phone_verification_page':
          return 'phone_verification_page';
        default:
          return '';
      }
    }

    function sleep(ms = 0) {
      const delay = Math.max(0, Math.floor(Number(ms) || 0));
      return new Promise((resolve) => setTimeout(resolve, delay));
    }

    async function probeSignupPostIdentityStateInTab(tabId, step = 2, options = {}) {
      const timeoutMs = Math.max(0, Math.floor(Number(options.timeoutMs) || 0));
      if (!Number.isInteger(tabId) || timeoutMs <= 0) {
        return { state: '', url: '', authState: '' };
      }

      const start = Date.now();
      let lastObservedUrl = '';
      let lastObservedAuthState = '';
      while (Date.now() - start < timeoutMs) {
        let authState = null;
        try {
          authState = await sendToContentScriptResilient('signup-page', {
            type: 'GET_LOGIN_AUTH_STATE',
            step,
            source: 'background',
            payload: {},
          }, {
            timeoutMs: 8000,
            retryDelayMs: 600,
            logMessage: `步骤 ${step}：注册后续页面仍在切换，正在通过页面状态探针确认跳转结果...`,
          });
        } catch {
          authState = null;
        }

        if (authState && !authState.error) {
          const authUrl = String(authState.url || '').trim();
          const authPageState = resolveSignupPostIdentityStateFromAuthState(authState.state)
            || resolveSignupPostIdentityState(authUrl);
          if (authPageState) {
            return {
              state: authPageState,
              url: authUrl,
              authState: String(authState.state || '').trim(),
            };
          }
          lastObservedUrl = authUrl || lastObservedUrl;
          lastObservedAuthState = String(authState.state || '').trim() || lastObservedAuthState;
        }

        try {
          const currentTab = await chrome.tabs.get(tabId);
          const currentUrl = String(currentTab?.url || '').trim();
          const tabUrlState = resolveSignupPostIdentityState(currentUrl);
          if (tabUrlState) {
            return {
              state: tabUrlState,
              url: currentUrl,
              authState: lastObservedAuthState,
            };
          }
          lastObservedUrl = currentUrl || lastObservedUrl;
        } catch {
          // Ignore tab snapshot failures and continue probing until timeout.
        }

        const remainingMs = timeoutMs - (Date.now() - start);
        if (remainingMs <= 0) {
          break;
        }
        await sleep(Math.min(250, remainingMs));
      }

      return {
        state: '',
        url: lastObservedUrl,
        authState: lastObservedAuthState,
      };
    }

    async function ensureSignupPostIdentityPageReadyInTab(tabId, step = 2, options = {}) {
      const {
        skipUrlWait = false,
        postIdentityProbeTimeoutMs = 10000,
      } = options;
      let landingUrl = '';
      let landingState = '';

      if (!skipUrlWait) {
        const matchedTab = await waitForTabUrlMatch(tabId, (url) => Boolean(resolveSignupPostIdentityState(url)), {
          timeoutMs: 45000,
          retryDelayMs: 300,
        });
        if (!matchedTab) {
          if (typeof addLog === 'function') {
            await addLog(
              `步骤 ${step}：注册身份提交后 URL 未命中预期路径，正在通过页面状态探针继续确认...`,
              'warn',
              { step, stepKey: 'signup-entry' }
            );
          }

          const probedState = await probeSignupPostIdentityStateInTab(tabId, step, {
            timeoutMs: postIdentityProbeTimeoutMs,
          });
          if (!probedState?.state) {
            if (typeof addLog === 'function') {
              await addLog(
                `步骤 ${step}：状态探针未识别到目标页面（最近状态：${probedState?.authState || 'unknown'}，URL: ${probedState?.url || 'unknown'}）。`,
                'warn',
                { step, stepKey: 'signup-entry' }
              );
            }
            throw new Error('等待注册身份提交后的页面跳转超时，请检查页面是否仍停留在输入页。');
          }

          landingUrl = String(probedState.url || '').trim();
          landingState = probedState.state;
        } else {
          landingUrl = matchedTab.url || '';
          landingState = resolveSignupPostIdentityState(landingUrl);
        }
      }

      if (!landingState) {
        try {
          const currentTab = await chrome.tabs.get(tabId);
          landingUrl = landingUrl || currentTab?.url || '';
          landingState = resolveSignupPostIdentityState(landingUrl);
        } catch {
          landingUrl = landingUrl || '';
        }
      }

      if (!landingState) {
        throw new Error(`注册身份提交后未能识别当前页面，既不是密码页、验证码页，也不是资料页。URL: ${landingUrl || 'unknown'}`);
      }

      if (landingState !== 'password_page' && typeof waitForTabStableComplete === 'function') {
        const stableTab = await waitForTabStableComplete(tabId, {
          timeoutMs: 45000,
          retryDelayMs: 300,
          stableMs: 800,
          initialDelayMs: 300,
        });
        if (stableTab?.url) {
          const stableState = resolveSignupPostIdentityState(stableTab.url);
          if (stableState) {
            landingUrl = stableTab.url;
            landingState = stableState;
          }
        }
      }

      await ensureContentScriptReadyOnTab('signup-page', tabId, {
        inject: SIGNUP_PAGE_INJECT_FILES,
        injectSource: 'signup-page',
        timeoutMs: 45000,
        retryDelayMs: 900,
        logMessage: landingState === 'password_page'
          ? `步骤 ${step}：密码页仍在加载，正在重试连接内容脚本...`
          : `步骤 ${step}：注册后续页面仍在加载，正在等待页面恢复...`,
      });

      if (landingState !== 'password_page') {
        return {
          ready: true,
          state: landingState,
          url: landingUrl,
        };
      }

      const result = await sendToContentScriptResilient('signup-page', {
        type: 'ENSURE_SIGNUP_PASSWORD_PAGE_READY',
        step,
        source: 'background',
        payload: {},
      }, {
        timeoutMs: 20000,
        retryDelayMs: 700,
        logMessage: `步骤 ${step}：认证页正在切换，等待密码页重新就绪...`,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return {
        ...(result || {}),
        ready: true,
        state: landingState,
        url: landingUrl,
      };
    }

    async function ensureSignupPostEmailPageReadyInTab(tabId, step = 2, options = {}) {
      return ensureSignupPostIdentityPageReadyInTab(tabId, step, options);
    }

    async function ensureSignupPasswordPageReadyInTab(tabId, step = 2, options = {}) {
      const result = await ensureSignupPostEmailPageReadyInTab(tabId, step, options);
      if (result.state !== 'password_page') {
        throw new Error(`当前页面不是密码页，实际落地为 ${result.state || 'unknown'}。URL: ${result.url || 'unknown'}`);
      }
      return result;
    }

    async function finalizeSignupPasswordSubmitInTab(tabId, password = '', step = 3) {
      if (!Number.isInteger(tabId)) {
        throw new Error(`认证页面标签页已关闭，无法完成步骤 ${step} 的提交后确认。`);
      }

      await ensureContentScriptReadyOnTab('signup-page', tabId, {
        inject: SIGNUP_PAGE_INJECT_FILES,
        injectSource: 'signup-page',
        timeoutMs: 45000,
        retryDelayMs: 900,
        logMessage: `步骤 ${step}：认证页仍在切换，正在等待页面恢复后继续确认提交流程...`,
      });

      let result;
      try {
        result = await sendToContentScriptResilient('signup-page', {
          type: 'PREPARE_SIGNUP_VERIFICATION',
          step,
          source: 'background',
          payload: {
            password: password || '',
            prepareSource: 'step3_finalize',
            prepareLogLabel: '步骤 3 收尾',
          },
        }, {
          timeoutMs: 30000,
          retryDelayMs: 700,
          logMessage: `步骤 ${step}：密码已提交，正在确认是否进入下一页面，必要时自动恢复重试页...`,
        });
      } catch (error) {
        if (isRetryableContentScriptTransportError(error)) {
          const message = `步骤 ${step}：认证页在提交后切换过程中页面通信超时，未能重新就绪，暂时无法确认是否进入下一页面。请重试当前轮。`;
          if (typeof addLog === 'function') {
            await addLog(message, 'warn');
          }
          throw new Error(message);
        }
        throw error;
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return result || {};
    }

    function getPreservedPhoneIdentityForEmailResolution() {
      return null;
    }

    async function persistResolvedSignupEmail(resolvedEmail, state = {}, options = {}) {
      if (resolvedEmail === state.email && !options?.preserveAccountIdentity) {
        return;
      }
      const generatedEmailAlreadyPersisted = Boolean(options?.generatedEmailAlreadyPersisted);
      if (typeof persistRegistrationEmailState === 'function') {
        if (!generatedEmailAlreadyPersisted) {
          await persistRegistrationEmailState(state, resolvedEmail, {
            source: 'flow',
            preserveAccountIdentity: Boolean(options?.preserveAccountIdentity),
          });
        }
        return;
      }
      if (resolvedEmail !== state.email) {
        await setEmailState(resolvedEmail);
      }
    }

    async function resolveSignupEmailForFlow(state, options = {}) {
      let resolvedEmail = state.email;
      let generatedEmailAlreadyPersisted = false;
      if (isHotmailProvider(state)) {
        const account = await ensureHotmailAccountForFlow({
          allowAllocate: true,
          markUsed: true,
          preferredAccountId: state.currentHotmailAccountId || null,
        });
        resolvedEmail = account.email;
      } else if (isLuckmailProvider(state)) {
        const purchase = await ensureLuckmailPurchaseForFlow({ allowReuse: true });
        resolvedEmail = purchase.email_address;
      } else if (isGptmailProvider(state)) {
        if (typeof ensureGptmailAddressForFlow !== 'function') {
          throw new Error('GPTMail 邮箱生成能力尚未初始化。');
        }
        resolvedEmail = await ensureGptmailAddressForFlow();
      } else if (isGeneratedAliasProvider(state)) {
        if (Boolean(state?.mail2925UseAccountPool)
          && String(state?.mailProvider || '').trim().toLowerCase() === '2925'
          && typeof ensureMail2925AccountForFlow === 'function') {
          await ensureMail2925AccountForFlow({
            allowAllocate: true,
            preferredAccountId: state.currentMail2925AccountId || null,
            markUsed: true,
          });
        }
        if (!isReusableGeneratedAliasEmail?.(state, resolvedEmail)) {
          resolvedEmail = buildGeneratedAliasEmail(state);
        }
      } else if (!resolvedEmail && typeof fetchGeneratedEmail === 'function') {
        resolvedEmail = await fetchGeneratedEmail(state, options);
        generatedEmailAlreadyPersisted = true;
      }

      if (!resolvedEmail) {
        throw new Error('缺少邮箱地址，请先在侧边栏粘贴邮箱。');
      }

      if (!generatedEmailAlreadyPersisted || options?.preserveAccountIdentity) {
        await persistResolvedSignupEmail(resolvedEmail, state, {
          ...options,
          generatedEmailAlreadyPersisted,
        });
      }

      return resolvedEmail;
    }

    return {
      ensureSignupEntryPageReady,
      ensureSignupPostIdentityPageReadyInTab,
      ensureSignupPostEmailPageReadyInTab,
      finalizeSignupPasswordSubmitInTab,
      ensureSignupPasswordPageReadyInTab,
      openSignupEntryTab,
      resolveSignupEmailForFlow,
    };
  }

  return {
    createSignupFlowHelpers,
  };
});
