(function attachBackgroundStep8(root, factory) {
  root.MultiPageBackgroundStep8 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundStep8Module() {
  const MAIL_2925_FILTER_LOOKBACK_MS = 10 * 60 * 1000;
  // Step8 在同链路本地重试时，给单轮轮询预算设置最小保底，避免过度收紧导致误超时。
  const STEP8_DYNAMIC_BUDGET_MIN_FLOOR_MS = 20000;
  // Step8 超时预算的最大收紧比例（最终轮次最多收紧 45%）。
  const STEP8_DYNAMIC_BUDGET_MAX_SHRINK_RATIO = 0.45;

  function createStep8Executor(deps = {}) {
    const {
      addLog: rawAddLog = async () => {},
      chrome,
      CLOUDFLARE_TEMP_EMAIL_PROVIDER,
      CLOUD_MAIL_PROVIDER = 'cloudmail',
      completeNodeFromBackground,
      confirmCustomVerificationStepBypass,
      ensureMail2925MailboxSession,
      ensureIcloudMailSession,
      ensureStep8VerificationPageReady,
      getOAuthFlowRemainingMs,
      getOAuthFlowStepTimeoutMs,
      getMailConfig,
      getState,
      getTabId,
      HOTMAIL_PROVIDER,
      isTabAlive,
      isVerificationMailPollingError,
      LUCKMAIL_PROVIDER,
      GPTMAIL_PROVIDER = 'gptmail',
      YYDS_MAIL_PROVIDER = 'yyds-mail',
      resolveSignupEmailForFlow,
      resolveVerificationStep,
      rerunStep7ForStep8Recovery,
      reuseOrCreateTab,
      sendToContentScriptResilient,
      persistRegistrationEmailState = null,
      setState,
      shouldUseCustomRegistrationEmail,
      sleepWithStop,
      STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS,
      STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS,
      throwIfStopped,
    } = deps;
    let activeFetchLoginCodeStep = null;
    let activeFetchLoginCodeStepKey = 'fetch-login-code';
    const sampledLogTimestamps = new Map();

    function normalizeLogStep(value) {
      const step = Math.floor(Number(value) || 0);
      return step > 0 ? step : null;
    }

    function normalizeStepLogMessage(message) {
      return String(message || '')
        .replace(/^步骤\s*\d+\s*[:：]\s*/, '')
        .replace(/^Step\s+\d+\s*[:：]\s*/i, '')
        .trim();
    }

    function addLog(message, level = 'info', options = {}) {
      const normalizedOptions = options && typeof options === 'object' ? { ...options } : {};
      const step = normalizeLogStep(normalizedOptions.step || normalizedOptions.visibleStep)
        || normalizeLogStep(activeFetchLoginCodeStep);
      if (step) {
        normalizedOptions.step = step;
        if (!normalizedOptions.stepKey) {
          normalizedOptions.stepKey = activeFetchLoginCodeStepKey || 'fetch-login-code';
        }
      }
      delete normalizedOptions.visibleStep;
      return rawAddLog(normalizeStepLogMessage(message), level, normalizedOptions);
    }

    function shouldEmitSampledLog(sampleKey, minIntervalMs) {
      const interval = Math.max(0, Math.floor(Number(minIntervalMs) || 0));
      if (interval <= 0) return true;
      const key = String(sampleKey || '');
      if (!key) return true;
      const now = Date.now();
      const lastAt = Number(sampledLogTimestamps.get(key) || 0);
      if (lastAt > 0 && now - lastAt >= 0 && now - lastAt < interval) {
        return false;
      }
      sampledLogTimestamps.set(key, now);
      if (sampledLogTimestamps.size > 200) {
        const oldestKey = sampledLogTimestamps.keys().next().value;
        if (oldestKey !== undefined) {
          sampledLogTimestamps.delete(oldestKey);
        }
      }
      return true;
    }

    async function addSampledLog(message, level = 'info', options = {}, sampleKey = '', minIntervalMs = 0) {
      if (String(level || '').toLowerCase() === 'error') {
        await addLog(message, level, options);
        return true;
      }
      const key = String(sampleKey || `${level}|${normalizeStepLogMessage(message)}`);
      if (!shouldEmitSampledLog(key, minIntervalMs)) {
        return false;
      }
      await addLog(message, level, options);
      return true;
    }

    function getVisibleStep(state, fallback = 8) {
      const visibleStep = Math.floor(Number(state?.visibleStep) || 0);
      return visibleStep > 0 ? visibleStep : fallback;
    }

    function getAuthLoginStepForVisibleStep(visibleStep) {
      return visibleStep >= 11 ? 10 : 7;
    }

    async function getStep8ReadyTimeoutMs(actionLabel, expectedOauthUrl = '', visibleStep = 8) {
      if (typeof getOAuthFlowStepTimeoutMs !== 'function') {
        return 15000;
      }

      return getOAuthFlowStepTimeoutMs(15000, {
        step: visibleStep,
        actionLabel,
        oauthUrl: expectedOauthUrl,
      });
    }

    function getStep8RemainingTimeResolver(expectedOauthUrl = '', visibleStep = 8, budgetOptions = {}) {
      if (typeof getOAuthFlowRemainingMs !== 'function') {
        return undefined;
      }

      // attemptNo/maxAttempts 用于描述当前 Step8 重试进度，越靠后预算越紧。
      const attemptNo = Math.max(1, Math.floor(Number(budgetOptions?.attemptNo) || 1));
      const maxAttempts = Math.max(attemptNo, Math.floor(Number(budgetOptions?.maxAttempts) || attemptNo));
      const minFloorMs = Math.max(
        5000,
        Math.floor(Number(budgetOptions?.minFloorMs) || STEP8_DYNAMIC_BUDGET_MIN_FLOOR_MS)
      );
      const maxShrinkRatio = Math.min(
        0.8,
        Math.max(0, Number(budgetOptions?.maxShrinkRatio) || STEP8_DYNAMIC_BUDGET_MAX_SHRINK_RATIO)
      );

      return async (details = {}) => {
        const remainingMs = await getOAuthFlowRemainingMs({
          step: visibleStep,
          actionLabel: details.actionLabel || '登录验证码流程',
          oauthUrl: expectedOauthUrl,
        });
        const numericRemainingMs = Number(remainingMs);
        if (!Number.isFinite(numericRemainingMs)) {
          return remainingMs;
        }

        const normalizedRemainingMs = Math.max(0, Math.floor(numericRemainingMs));
        if (normalizedRemainingMs <= 0 || attemptNo <= 1 || maxAttempts <= 1) {
          return normalizedRemainingMs;
        }

        const retryProgress = Math.min(1, (attemptNo - 1) / Math.max(1, maxAttempts - 1));
        const shrinkRatio = maxShrinkRatio * retryProgress;
        const tightenedRemainingMs = Math.max(0, Math.floor(normalizedRemainingMs * (1 - shrinkRatio)));
        const floorBudgetMs = Math.min(normalizedRemainingMs, minFloorMs);
        return Math.max(floorBudgetMs, tightenedRemainingMs);
      };
    }

    function normalizeStep8VerificationTargetEmail(value) {
      return String(value || '').trim().toLowerCase();
    }

    function resolveBoundEmailLoginTarget(state = {}, visibleStep = 0) {
      const email = String(
        state?.step8VerificationTargetEmail
        || state?.email
        || state?.registrationEmailState?.current
        || ''
      ).trim();
      if (!email) {
        throw new Error(`步骤 ${visibleStep || 0}：缺少绑定邮箱，无法使用邮箱模式重新发起 OAuth 登录。`);
      }
      return email;
    }

    function buildBoundEmailLoginState(state = {}, visibleStep = 0) {
      const email = resolveBoundEmailLoginTarget(state, visibleStep);
      return {
        ...state,
        forceLoginIdentifierType: 'email',
        forceEmailLogin: true,
        signupMethod: 'email',
        resolvedSignupMethod: 'email',
        accountIdentifierType: 'email',
        accountIdentifier: email,
        email,
        step8VerificationTargetEmail: normalizeStep8VerificationTargetEmail(email),
      };
    }

    async function getLoginAuthStateFromContent(visibleStep, options = {}) {
      if (typeof sendToContentScriptResilient !== 'function') {
        return {};
      }
      const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 15000);
      const result = await sendToContentScriptResilient(
        'signup-page',
        {
          type: 'GET_LOGIN_AUTH_STATE',
          source: 'background',
          payload: {},
        },
        {
          timeoutMs,
          responseTimeoutMs: timeoutMs,
          retryDelayMs: 600,
          logMessage: options.logMessage || `步骤 ${visibleStep}：认证页正在切换，等待页面重新就绪...`,
          logStep: visibleStep,
          logStepKey: options.logStepKey || activeFetchLoginCodeStepKey || 'fetch-login-code',
        }
      );
      if (result?.error) {
        throw new Error(result.error);
      }
      return result || {};
    }

    async function submitAddEmailIfNeeded(state, visibleStep, initialPageState = null) {
      if (typeof resolveSignupEmailForFlow !== 'function' || typeof sendToContentScriptResilient !== 'function') {
        return { state, pageState: initialPageState };
      }

      const pageState = initialPageState?.state
        ? initialPageState
        : await getLoginAuthStateFromContent(visibleStep, {
          timeoutMs: 15000,
          logMessage: `步骤 ${visibleStep}：正在确认是否已进入添加邮箱页...`,
        });
      if (pageState?.state !== 'add_email_page') {
        return { state, pageState };
      }

      const latestState = typeof getState === 'function' ? await getState() : state;
      const resolvedEmail = await resolveSignupEmailForFlow(latestState, {
        preserveAccountIdentity: true,
      });
      await addLog(`步骤 ${visibleStep}：检测到添加邮箱页，正在添加邮箱 ${resolvedEmail} 并进入邮箱验证码页...`);

      const timeoutMs = typeof getOAuthFlowStepTimeoutMs === 'function'
        ? await getOAuthFlowStepTimeoutMs(60000, {
          step: visibleStep,
          actionLabel: '添加邮箱并进入验证码页',
          oauthUrl: latestState?.oauthUrl || state?.oauthUrl || '',
        })
        : 60000;
      const result = await sendToContentScriptResilient(
        'signup-page',
        {
          type: 'SUBMIT_ADD_EMAIL',
          source: 'background',
          payload: {
            email: resolvedEmail,
            nodeId: state?.nodeId || activeFetchLoginCodeStepKey || 'fetch-login-code',
          },
        },
        {
          timeoutMs,
          responseTimeoutMs: timeoutMs,
          retryDelayMs: 700,
          logMessage: `步骤 ${visibleStep}：添加邮箱页面正在切换，等待邮箱验证码页就绪...`,
          logStep: visibleStep,
          logStepKey: activeFetchLoginCodeStepKey || 'fetch-login-code',
        }
      );

      if (result?.error) {
        throw new Error(result.error);
      }

      const displayedEmail = normalizeStep8VerificationTargetEmail(result?.displayedEmail || resolvedEmail);
      let persistedState = latestState;
      if (typeof persistRegistrationEmailState === 'function') {
        await persistRegistrationEmailState(latestState, resolvedEmail, {
          source: activeFetchLoginCodeStepKey === 'bind-email' ? 'bind_email' : 'step8_add_email',
          preserveAccountIdentity: true,
        });
        persistedState = typeof getState === 'function' ? await getState() : latestState;
      } else {
        await setState({
          email: resolvedEmail,
          step8VerificationTargetEmail: displayedEmail,
        });
        persistedState = {
          ...latestState,
          email: resolvedEmail,
          step8VerificationTargetEmail: displayedEmail,
        };
      }

      return {
        state: {
          ...persistedState,
          email: resolvedEmail,
          step8VerificationTargetEmail: displayedEmail,
        },
        pageState: {
          state: result?.directOAuthConsentPage ? 'oauth_consent_page' : 'verification_page',
          displayedEmail,
          url: result?.url || pageState?.url || '',
        },
      };
    }

    async function completeStep8WhenAuthAlreadyOnOauthConsent(visibleStep, options = {}) {
      await setState({
        step8VerificationTargetEmail: '',
        loginVerificationRequestedAt: null,
      });
      const fromRecovery = Boolean(options.fromRecovery);
      const stepKey = options.stepKey || activeFetchLoginCodeStepKey || 'fetch-login-code';
      await addLog(
        `步骤 ${visibleStep}：当前认证页已进入 OAuth 授权页${fromRecovery ? '（轮询失败后复核）' : ''}，跳过登录验证码拉取并继续后续流程。`,
        'warn',
        { step: visibleStep, stepKey }
      );
      if (typeof completeNodeFromBackground === 'function') {
        await completeNodeFromBackground(options.nodeId || 'fetch-login-code', {
          loginVerificationRequestedAt: null,
          skipLoginVerificationStep: true,
          directOAuthConsentPage: true,
        });
      }
    }

    async function recoverStep8PollingFailure(currentState, visibleStep) {
      const authLoginStep = getAuthLoginStepForVisibleStep(visibleStep);
      try {
        const pageState = await ensureStep8VerificationPageReady({
          visibleStep,
          authLoginStep,
          allowPhoneVerificationPage: false,
          allowAddEmailPage: false,
          timeoutMs: await getStep8ReadyTimeoutMs(
            '登录验证码轮询异常后复核认证页状态',
            currentState?.oauthUrl || '',
            visibleStep
          ),
        });
        if (pageState?.state === 'oauth_consent_page') {
          await completeStep8WhenAuthAlreadyOnOauthConsent(visibleStep, { fromRecovery: true, nodeId: currentState?.nodeId });
          return { outcome: 'completed' };
        }
        if (pageState?.state === 'verification_page') {
          await addLog(
            `步骤 ${visibleStep}：检测到邮箱轮询/页面通信异常，但认证页仍在当前登录后续页面，先在当前链路重试，不回到步骤 ${authLoginStep}。`,
            'warn'
          );
          return { outcome: 'retry_without_step7' };
        }
      } catch (inspectError) {
        if (isStep8RestartStep7Error(inspectError)) {
          return { outcome: 'restart_step7', error: inspectError };
        }
        await addLog(
          `步骤 ${visibleStep}：轮询失败后复核认证页状态异常：${inspectError?.message || inspectError}，将回到步骤 ${authLoginStep} 重试。`,
          'warn'
        );
      }
      return { outcome: 'restart_step7' };
    }

    function getExpectedMail2925MailboxEmail(state = {}) {
      if (Boolean(state?.mail2925UseAccountPool)) {
        const currentAccountId = String(state?.currentMail2925AccountId || '').trim();
        const accounts = Array.isArray(state?.mail2925Accounts) ? state.mail2925Accounts : [];
        const currentAccount = accounts.find((account) => String(account?.id || '') === currentAccountId) || null;
        const accountEmail = String(currentAccount?.email || '').trim().toLowerCase();
        if (accountEmail) {
          return accountEmail;
        }
      }

      return String(state?.mail2925BaseEmail || '').trim().toLowerCase();
    }

    async function focusOrOpenMailTab(mail, visibleStep = 8) {
      // 仅“页面邮箱”模式依赖 source/url；缺失时跳过开页，避免打开空白标签页。
      const source = String(mail?.source || '').trim();
      const url = String(mail?.url || '').trim();
      if (!source || !url) {
        await addLog(`步骤 ${visibleStep}：${mail?.label || '当前邮箱'}缺少页面配置（source/url），跳过打开邮箱页并继续轮询。`, 'warn');
        return;
      }

      const alive = await isTabAlive(source);
      if (alive) {
        if (mail.navigateOnReuse) {
          await reuseOrCreateTab(source, url, {
            inject: mail.inject,
            injectSource: mail.injectSource,
          });
          return;
        }

        const tabId = await getTabId(source);
        await chrome.tabs.update(tabId, { active: true });
        return;
      }

      await reuseOrCreateTab(source, url, {
        inject: mail.inject,
        injectSource: mail.injectSource,
      });
    }

    function getStep8ResendIntervalMs(state = {}) {
      const mail = getMailConfig(state);
      if (mail?.provider === LUCKMAIL_PROVIDER) {
        return 15000;
      }
      if (mail?.provider === HOTMAIL_PROVIDER || mail?.provider === GPTMAIL_PROVIDER || mail?.provider === '2925') {
        return 0;
      }
      return Math.max(0, Number(STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS) || 0);
    }

    async function ensureAuthTabForPostLoginStep(state, visibleStep) {
      const authTabId = await getTabId('signup-page');
      if (authTabId) {
        await chrome.tabs.update(authTabId, { active: true });
        return authTabId;
      }
      if (!state?.oauthUrl) {
        throw new Error(`步骤 ${visibleStep}：缺少登录用 OAuth 链接，请先完成刷新 OAuth 并登录。`);
      }
      return reuseOrCreateTab('signup-page', state.oauthUrl);
    }

    async function completePostLoginPhoneVerificationSkippedOnOauth(visibleStep, options = {}) {
      const stepKey = options.stepKey || 'post-login-phone-verification';
      await addLog(`步骤 ${visibleStep}：当前认证页已进入 OAuth 授权页，跳过手机号验证步骤。`, 'warn', {
        step: visibleStep,
        stepKey,
      });
      if (typeof completeNodeFromBackground === 'function') {
        await completeNodeFromBackground(options.nodeId || 'post-login-phone-verification', {
          directOAuthConsentPage: true,
          phoneVerification: false,
        });
      }
    }

    async function executePostLoginPhoneVerification(state, runtime = {}) {
      const visibleStep = getVisibleStep(state, 9);
      activeFetchLoginCodeStep = visibleStep;
      activeFetchLoginCodeStepKey = runtime.stepKey || 'post-login-phone-verification';
      await ensureAuthTabForPostLoginStep(state, visibleStep);
      const pageState = await getLoginAuthStateFromContent(visibleStep, {
        timeoutMs: await getStep8ReadyTimeoutMs('确认手机号验证页或 OAuth 授权页已就绪', state?.oauthUrl || '', visibleStep),
        logMessage: `步骤 ${visibleStep}：正在确认是否进入手机号验证页...`,
        logStepKey: activeFetchLoginCodeStepKey,
      });

      if (pageState?.state === 'oauth_consent_page') {
        await completePostLoginPhoneVerificationSkippedOnOauth(visibleStep, {
          nodeId: state?.nodeId || runtime.fallbackNodeId,
          stepKey: activeFetchLoginCodeStepKey,
        });
        return;
      }

      const isPhoneVerificationPage = pageState?.state === 'add_phone_page' || pageState?.state === 'phone_verification_page';
      if (!isPhoneVerificationPage) {
        await completePostLoginPhoneVerificationSkippedOnOauth(visibleStep, {
          nodeId: state?.nodeId || runtime.fallbackNodeId,
          stepKey: activeFetchLoginCodeStepKey,
        });
        return;
      }

      // 固定使用 ADD_PHONE_REQUIRED 作为错误码，供自动轮询识别并直接进入下一轮。
      const addPhoneUrl = String(pageState?.url || 'https://auth.openai.com/add-phone').trim();
      throw new Error(`步骤 ${visibleStep}：验证码提交后页面进入手机号页面，当前流程无法继续自动授权。 URL: ${addPhoneUrl}`.trim());
    }

    async function executeBindEmail(state) {
      const visibleStep = getVisibleStep(state, 9);
      activeFetchLoginCodeStep = visibleStep;
      activeFetchLoginCodeStepKey = 'bind-email';
      await ensureAuthTabForPostLoginStep(state, visibleStep);
      const pageState = await getLoginAuthStateFromContent(visibleStep, {
        timeoutMs: await getStep8ReadyTimeoutMs('确认添加邮箱页或 OAuth 授权页已就绪', state?.oauthUrl || '', visibleStep),
        logMessage: `步骤 ${visibleStep}：正在确认是否需要绑定邮箱...`,
      });

      if (pageState?.state === 'oauth_consent_page') {
        await addLog(`步骤 ${visibleStep}：当前认证页已进入 OAuth 授权页，跳过绑定邮箱步骤。`, 'warn', {
          step: visibleStep,
          stepKey: 'bind-email',
        });
        if (typeof completeNodeFromBackground === 'function') {
          await completeNodeFromBackground(state?.nodeId || 'bind-email', {
            directOAuthConsentPage: true,
            bindEmailSubmitted: false,
          });
        }
        return;
      }

      if (pageState?.state !== 'add_email_page') {
        throw new Error(`步骤 ${visibleStep}：绑定邮箱步骤只处理添加邮箱页，当前状态：${pageState?.state || 'unknown'}。URL: ${pageState?.url || ''}`.trim());
      }

      const addEmailPreparation = await submitAddEmailIfNeeded(state, visibleStep, pageState);
      const preparedState = addEmailPreparation?.state || state;
      const nextPageState = addEmailPreparation?.pageState || pageState;
      if (nextPageState?.state !== 'verification_page') {
        throw new Error(`步骤 ${visibleStep}：绑定邮箱提交后必须进入邮箱验证码页，当前状态：${nextPageState?.state || 'unknown'}。URL: ${nextPageState?.url || ''}`.trim());
      }

      if (typeof completeNodeFromBackground === 'function') {
        await completeNodeFromBackground(state?.nodeId || 'bind-email', {
          bindEmailSubmitted: true,
          email: preparedState?.email || '',
          step8VerificationTargetEmail: preparedState?.step8VerificationTargetEmail || nextPageState?.displayedEmail || '',
        });
      }
    }

    async function pollEmailVerificationCode(preparedState, pageState, visibleStep, runtime = {}) {
      let latestResendAt = Math.max(
        0,
        Number(runtime?.stickyLastResendAt) || 0,
        Number(preparedState?.loginVerificationRequestedAt) || 0
      );
      const notifyResendRequestedAt = typeof runtime?.onResendRequestedAt === 'function'
        ? runtime.onResendRequestedAt
        : null;
      const mail = getMailConfig(preparedState);
      if (mail.error) throw new Error(mail.error);
      const stepStartedAt = Date.now();
      const verificationFilterAfterTimestamp = mail.provider === '2925'
        ? Math.max(0, stepStartedAt - MAIL_2925_FILTER_LOOKBACK_MS)
        : stepStartedAt;
      const verificationSessionKey = `${visibleStep}:${stepStartedAt}`;
      const shouldCompareVerificationEmail = mail.provider !== '2925';
      const displayedVerificationEmail = shouldCompareVerificationEmail
        ? normalizeStep8VerificationTargetEmail(pageState?.displayedEmail)
        : '';
      const fixedTargetEmail = shouldCompareVerificationEmail
        ? (displayedVerificationEmail || normalizeStep8VerificationTargetEmail(preparedState?.step8VerificationTargetEmail || preparedState?.email))
        : '';
      // Step8 本地重试轮次驱动超时预算动态收紧；首轮保持原预算，后续轮次逐步收紧。
      const budgetAttemptNo = Math.max(1, Math.floor(Number(runtime?.mailPollingAttempt) || 1));
      const budgetMaxAttempts = Math.max(
        budgetAttemptNo,
        Math.floor(Number(runtime?.mailPollingRecoveryMaxAttempts) || 0),
        Math.floor(Number(STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS) || 0),
        1
      );

      await setState({
        step8VerificationTargetEmail: displayedVerificationEmail || '',
      });

      await addLog(`步骤 ${visibleStep}：邮箱验证码页面已就绪，开始获取验证码。`, 'info');
      if (shouldCompareVerificationEmail && displayedVerificationEmail) {
        await addLog(`步骤 ${visibleStep}：已固定当前验证码页显示邮箱 ${displayedVerificationEmail} 作为后续匹配目标。`, 'info');
      }

      if (shouldUseCustomRegistrationEmail(preparedState)) {
        await confirmCustomVerificationStepBypass(8, {
          completionStep: visibleStep,
          promptStep: visibleStep,
        });
        return { lastResendAt: latestResendAt };
      }

      if (mail.source === 'icloud-mail' && typeof ensureIcloudMailSession === 'function') {
        await addLog(`步骤 ${visibleStep}：正在确认 iCloud 邮箱登录态...`, 'info');
        await ensureIcloudMailSession({
          state: preparedState,
          step: 8,
          actionLabel: `步骤 ${visibleStep}：确认 iCloud 邮箱登录态`,
        });
      }

      throwIfStopped();
      if (
        mail.provider === HOTMAIL_PROVIDER
        || mail.provider === LUCKMAIL_PROVIDER
        || mail.provider === GPTMAIL_PROVIDER
        || mail.provider === YYDS_MAIL_PROVIDER
        || mail.provider === CLOUDFLARE_TEMP_EMAIL_PROVIDER
        || mail.provider === CLOUD_MAIL_PROVIDER
      ) {
        await addLog(`步骤 ${visibleStep}：正在通过 ${mail.label} 轮询验证码...`);
      } else {
        await addLog(`步骤 ${visibleStep}：正在打开${mail.label}...`);
        if (mail.provider === '2925' && typeof ensureMail2925MailboxSession === 'function') {
          await ensureMail2925MailboxSession({
            accountId: preparedState.currentMail2925AccountId || null,
            forceRelogin: false,
            allowLoginWhenOnLoginPage: Boolean(preparedState?.mail2925UseAccountPool),
            expectedMailboxEmail: getExpectedMail2925MailboxEmail(preparedState),
            actionLabel: `Step ${visibleStep}: ensure 2925 mailbox session`,
          });
        } else {
          await focusOrOpenMailTab(mail, visibleStep);
        }
        if (mail.provider === '2925') {
          await addLog(`步骤 ${visibleStep}：将直接使用当前已登录的 ${mail.label} 轮询验证码。`, 'info');
        }
      }

      const verificationResult = await resolveVerificationStep(8, {
        ...preparedState,
        step8VerificationTargetEmail: displayedVerificationEmail || '',
      }, mail, {
        completionStep: visibleStep,
        filterAfterTimestamp: verificationFilterAfterTimestamp,
        sessionKey: verificationSessionKey,
        disableTimeBudgetCap: mail.provider === '2925',
        getRemainingTimeMs: getStep8RemainingTimeResolver(preparedState?.oauthUrl || '', visibleStep, {
          attemptNo: budgetAttemptNo,
          maxAttempts: budgetMaxAttempts,
          minFloorMs: STEP8_DYNAMIC_BUDGET_MIN_FLOOR_MS,
          maxShrinkRatio: STEP8_DYNAMIC_BUDGET_MAX_SHRINK_RATIO,
        }),
        requestFreshCodeFirst: false,
        lastResendAt: latestResendAt,
        onResendRequestedAt: async (requestedAt) => {
          const numericRequestedAt = Number(requestedAt) || 0;
          if (numericRequestedAt > 0) {
            latestResendAt = Math.max(latestResendAt, numericRequestedAt);
          }
          if (notifyResendRequestedAt) {
            await notifyResendRequestedAt(latestResendAt);
          }
        },
        targetEmail: fixedTargetEmail,
        maxResendRequests: mail.provider === '2925' ? 2 : undefined,
        initialPollMaxAttempts: mail.provider === '2925' ? 5 : undefined,
        pollAttemptPlan: mail.provider === '2925' ? [2, 3, 15] : undefined,
        resendIntervalMs: mail.provider === LUCKMAIL_PROVIDER
          ? 15000
          : ((mail.provider === HOTMAIL_PROVIDER || mail.provider === GPTMAIL_PROVIDER || mail.provider === '2925')
            ? 0
            : STANDARD_MAIL_VERIFICATION_RESEND_INTERVAL_MS),
      });
      const phoneVerificationRequired = Boolean(
        verificationResult?.phoneVerificationRequired
        || verificationResult?.addPhonePage
        || verificationResult?.phoneVerificationPage
      );
      return {
        lastResendAt: latestResendAt,
        phoneVerificationRequired,
        pageState: phoneVerificationRequired
          ? {
            state: verificationResult?.phoneVerificationPage ? 'phone_verification_page' : 'add_phone_page',
            addPhonePage: Boolean(verificationResult?.addPhonePage),
            phoneVerificationPage: Boolean(verificationResult?.phoneVerificationPage),
            url: verificationResult?.url || '',
          }
          : null,
      };
    }

    async function completeFetchBindEmailCodeSkippedOnOauth(visibleStep, options = {}) {
      await addLog(`步骤 ${visibleStep}：当前认证页已进入 OAuth 授权页，跳过绑定邮箱验证码步骤。`, 'warn', {
        step: visibleStep,
        stepKey: 'fetch-bind-email-code',
      });
      if (typeof completeNodeFromBackground === 'function') {
        await completeNodeFromBackground(options.nodeId || 'fetch-bind-email-code', {
          directOAuthConsentPage: true,
          bindEmailCodeSkipped: true,
        });
      }
    }

    async function executeFetchBindEmailCode(state) {
      const visibleStep = getVisibleStep(state, 10);
      activeFetchLoginCodeStep = visibleStep;
      activeFetchLoginCodeStepKey = 'fetch-bind-email-code';
      await ensureAuthTabForPostLoginStep(state, visibleStep);
      const pageState = await getLoginAuthStateFromContent(visibleStep, {
        timeoutMs: await getStep8ReadyTimeoutMs('确认绑定邮箱验证码页已就绪', state?.oauthUrl || '', visibleStep),
        logMessage: `步骤 ${visibleStep}：正在确认绑定邮箱验证码页...`,
      });

      if (pageState?.state === 'oauth_consent_page') {
        if (state?.bindEmailSubmitted) {
          throw new Error(`步骤 ${visibleStep}：绑定邮箱提交后不应直接进入 OAuth 授权页，必须先完成邮箱验证码。URL: ${pageState?.url || ''}`.trim());
        }
        await completeFetchBindEmailCodeSkippedOnOauth(visibleStep, { nodeId: state?.nodeId });
        return;
      }
      if (pageState?.state !== 'verification_page') {
        throw new Error(`步骤 ${visibleStep}：获取绑定邮箱验证码步骤只处理邮箱验证码页，当前状态：${pageState?.state || 'unknown'}。URL: ${pageState?.url || ''}`.trim());
      }
      if (!state?.bindEmailSubmitted) {
        throw new Error(`步骤 ${visibleStep}：尚未完成绑定邮箱提交，不能直接获取绑定邮箱验证码。`);
      }

      return pollEmailVerificationCode(state, pageState, visibleStep, {
        stickyLastResendAt: Number(state?.loginVerificationRequestedAt) || 0,
      });
    }

    async function executeBoundEmailLoginCode(state) {
      const visibleStep = getVisibleStep(state, 11);
      activeFetchLoginCodeStep = visibleStep;
      activeFetchLoginCodeStepKey = 'fetch-bound-email-login-code';
      const preparedState = buildBoundEmailLoginState(state, visibleStep);
      const authTabId = await getTabId('signup-page');

      if (authTabId) {
        await chrome.tabs.update(authTabId, { active: true });
      } else {
        if (!preparedState.oauthUrl) {
          throw new Error(`步骤 ${visibleStep}：缺少登录用 OAuth 链接，请先完成绑定邮箱后刷新 OAuth 并登录。`);
        }
        await reuseOrCreateTab('signup-page', preparedState.oauthUrl);
      }

      throwIfStopped();
      const pageState = await ensureStep8VerificationPageReady({
        visibleStep,
        authLoginStep: Math.max(1, visibleStep - 1),
        allowPhoneVerificationPage: false,
        allowAddEmailPage: false,
        timeoutMs: await getStep8ReadyTimeoutMs('确认绑定邮箱登录验证码页已就绪', preparedState?.oauthUrl || '', visibleStep),
      });

      if (pageState?.state === 'oauth_consent_page') {
        await completeStep8WhenAuthAlreadyOnOauthConsent(visibleStep, {
          nodeId: state?.nodeId || 'fetch-bound-email-login-code',
          stepKey: 'fetch-bound-email-login-code',
        });
        return;
      }
      if (pageState?.state === 'add_phone_page' || pageState?.state === 'phone_verification_page') {
        throw new Error(`步骤 ${visibleStep}：绑定邮箱后邮箱模式登录不应进入手机号页面。URL: ${pageState?.url || ''}`.trim());
      }
      if (pageState?.state === 'add_email_page') {
        throw new Error(`步骤 ${visibleStep}：绑定邮箱后邮箱模式登录不应再进入添加邮箱页。URL: ${pageState?.url || ''}`.trim());
      }
      if (pageState?.state !== 'verification_page') {
        throw new Error(`步骤 ${visibleStep}：绑定邮箱后获取登录验证码只处理邮箱登录验证码页，当前状态：${pageState?.state || 'unknown'}。URL: ${pageState?.url || ''}`.trim());
      }

      return pollEmailVerificationCode(preparedState, pageState, visibleStep, {
        stickyLastResendAt: Number(preparedState?.loginVerificationRequestedAt) || 0,
      });
    }

    async function runStep8Attempt(state, runtime = {}) {
      const visibleStep = getVisibleStep(state, 8);
      activeFetchLoginCodeStep = visibleStep;
      activeFetchLoginCodeStepKey = 'fetch-login-code';
      const authTabId = await getTabId('signup-page');

      if (authTabId) {
        await chrome.tabs.update(authTabId, { active: true });
      } else {
        if (!state.oauthUrl) {
          throw new Error(`缺少登录用 OAuth 链接，请先完成步骤 ${getAuthLoginStepForVisibleStep(visibleStep)}。`);
        }
        await reuseOrCreateTab('signup-page', state.oauthUrl);
      }

      throwIfStopped();
      const pageState = await ensureStep8VerificationPageReady({
        visibleStep,
        authLoginStep: getAuthLoginStepForVisibleStep(visibleStep),
        // Step8 仅处理登录邮箱验证码，不识别手机号页；手机号页由 Step9 处理。
        allowPhoneVerificationPage: false,
        allowAddEmailPage: false,
        timeoutMs: await getStep8ReadyTimeoutMs('确认登录验证码页已就绪', state?.oauthUrl || '', visibleStep),
      });
      if (pageState?.state === 'oauth_consent_page') {
        await completeStep8WhenAuthAlreadyOnOauthConsent(visibleStep, { nodeId: state?.nodeId });
        return;
      }
      if (pageState?.state === 'add_email_page') {
        throw new Error(`步骤 ${visibleStep}：邮箱注册模式不应进入添加邮箱页。URL: ${pageState?.url || ''}`.trim());
      }

      return pollEmailVerificationCode(state, pageState, visibleStep, runtime);
    }

    function isStep8RestartStep7Error(error) {
      const message = String(error?.message || error || '');
      return /STEP8_RESTART_STEP7::/i.test(message);
    }

    function getStep8RecoveryRerunLogMessage(reason, authLoginStep) {
      if (reason === 'auth_retry_page') {
        return `认证页进入重试/超时报错状态，正在回到步骤 ${authLoginStep} 重新发起登录流程...`;
      }
      if (reason === 'mail_polling_streak_exceeded') {
        return `邮箱通信异常持续未恢复，正在回到步骤 ${authLoginStep} 重新发起登录流程...`;
      }
      return `正在回到步骤 ${authLoginStep}，重新发起登录验证码流程...`;
    }

    function buildStep8RecoveryRerunSignature(reason, visibleStep, authLoginStep, oauthUrl = '') {
      return [
        String(reason || 'mail_polling_failure'),
        Number(visibleStep) || 0,
        Number(authLoginStep) || 0,
        String(oauthUrl || ''),
      ].join('|');
    }

    async function syncStep8RetryStateFromLatest(currentStickyLastResendAt = 0) {
      const latestState = await getState();
      const latestStateResendAt = Number(latestState?.loginVerificationRequestedAt) || 0;
      const stickyLastResendAt = latestStateResendAt > 0
        ? Math.max(currentStickyLastResendAt, latestStateResendAt)
        : currentStickyLastResendAt;
      const nextState = stickyLastResendAt > 0 && (!latestStateResendAt || latestStateResendAt < stickyLastResendAt)
        ? {
          ...latestState,
          loginVerificationRequestedAt: stickyLastResendAt,
        }
        : latestState;
      return {
        state: nextState,
        stickyLastResendAt,
      };
    }

    async function executeStep8(state) {
      let currentState = state;
      let mailPollingAttempt = 1;
      let lastMailPollingError = null;
      let stickyLastResendAt = Number(state?.loginVerificationRequestedAt) || 0;
      let retryWithoutStep7Streak = 0;
      const maxRetryWithoutStep7Streak = 3;
      const recoveryRerunDedupeWindowMs = 2000;
      let lastRecoveryRerunSignature = '';
      let lastRecoveryRerunAt = 0;

      async function rerunStep7AndRefreshState({
        reason = 'mail_polling_failure',
        visibleStep = 8,
        authLoginStep = getAuthLoginStepForVisibleStep(visibleStep),
      } = {}) {
        const signature = buildStep8RecoveryRerunSignature(
          reason,
          visibleStep,
          authLoginStep,
          currentState?.oauthUrl || ''
        );
        const now = Date.now();
        if (
          signature === lastRecoveryRerunSignature
          && now - lastRecoveryRerunAt >= 0
          && now - lastRecoveryRerunAt < recoveryRerunDedupeWindowMs
        ) {
          await addLog(
            `步骤 ${visibleStep}：短时间内已触发相同恢复动作，跳过重复回到步骤 ${authLoginStep}。`,
            'info'
          );
          return getState();
        }

        lastRecoveryRerunSignature = signature;
        lastRecoveryRerunAt = now;
        await rerunStep7ForStep8Recovery({
          logMessage: getStep8RecoveryRerunLogMessage(reason, authLoginStep),
          logStep: visibleStep,
          logStepKey: 'fetch-login-code',
        });
        return getState();
      }

      while (true) {
        try {
          const result = await runStep8Attempt(currentState, {
            stickyLastResendAt,
            // 透传当前恢复轮次，驱动 Step8 预算动态收紧。
            mailPollingAttempt,
            mailPollingRecoveryMaxAttempts: STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS,
            onResendRequestedAt: async (requestedAt) => {
              const numericRequestedAt = Number(requestedAt) || 0;
              if (numericRequestedAt > 0) {
                stickyLastResendAt = Math.max(stickyLastResendAt, numericRequestedAt);
              }
            },
          });
          if (Number(result?.lastResendAt) > 0) {
            stickyLastResendAt = Math.max(stickyLastResendAt, Number(result.lastResendAt) || 0);
          }
          retryWithoutStep7Streak = 0;
          return;
        } catch (err) {
          const visibleStep = getVisibleStep(currentState, 8);
          const authLoginStep = getAuthLoginStepForVisibleStep(visibleStep);
          let currentError = err;
          let retryWithoutStep7 = false;

          const isMailPollingError = isVerificationMailPollingError(err);
          if (isMailPollingError && !isStep8RestartStep7Error(err)) {
            const recovery = await recoverStep8PollingFailure(currentState, visibleStep);
            if (recovery?.outcome === 'completed') {
              return;
            }
            if (recovery?.outcome === 'retry_without_step7') {
              retryWithoutStep7 = true;
            }
            if (recovery?.error) {
              currentError = recovery.error;
            }
          }
          if (!isVerificationMailPollingError(currentError) && !isStep8RestartStep7Error(currentError)) {
            throw currentError;
          }

          lastMailPollingError = currentError;
          if (mailPollingAttempt >= STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS) {
            break;
          }

          mailPollingAttempt += 1;
          if (retryWithoutStep7) {
            retryWithoutStep7Streak += 1;
            if (retryWithoutStep7Streak > maxRetryWithoutStep7Streak) {
              await addLog(
                `步骤 ${visibleStep}：邮箱通信异常在当前链路已连续重试 ${retryWithoutStep7Streak} 次，改为回到步骤 ${authLoginStep} 重新发起授权链路，避免空轮询循环。`,
                'warn'
              );
              currentState = await rerunStep7AndRefreshState({
                reason: 'mail_polling_streak_exceeded',
                visibleStep,
                authLoginStep,
              });
              retryWithoutStep7Streak = 0;
              continue;
            }
            await addSampledLog(
              `步骤 ${visibleStep}：认证页仍保持在验证码页，将在当前链路直接重试（${mailPollingAttempt}/${STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS}），不回到步骤 ${authLoginStep}（连续同链路重试 ${retryWithoutStep7Streak}/${maxRetryWithoutStep7Streak}）。`,
              'warn',
              {},
              `step8-retry-without-step7:${visibleStep}:${authLoginStep}`,
              3000
            );
            const syncedState = await syncStep8RetryStateFromLatest(stickyLastResendAt);
            stickyLastResendAt = syncedState.stickyLastResendAt;
            currentState = syncedState.state;
            const resendIntervalMs = getStep8ResendIntervalMs(currentState);
            const remainingBeforeRetryMs = stickyLastResendAt > 0 && resendIntervalMs > 0
              ? Math.max(0, resendIntervalMs - (Date.now() - stickyLastResendAt))
              : 0;
            if (remainingBeforeRetryMs > 0 && typeof sleepWithStop === 'function') {
              await addSampledLog(
                `步骤 ${visibleStep}：上轮已触发重发验证码，为避免重复重发，先等待 ${Math.ceil(remainingBeforeRetryMs / 1000)} 秒后继续当前链路重试。`,
                'info',
                {},
                `step8-resend-cooldown:${visibleStep}:${authLoginStep}`,
                5000
              );
              await sleepWithStop(Math.min(remainingBeforeRetryMs, 3000));
            }
            continue;
          }
          retryWithoutStep7Streak = 0;
          await addLog(
            isStep8RestartStep7Error(currentError)
              ? `步骤 ${visibleStep}：检测到认证页进入重试/超时报错状态，准备从步骤 ${authLoginStep} 重新开始（${mailPollingAttempt}/${STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS}）...`
              : `步骤 ${visibleStep}：检测到邮箱轮询类失败，准备从步骤 ${authLoginStep} 重新开始（${mailPollingAttempt}/${STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS}）...`,
            'warn'
          );
          currentState = await rerunStep7AndRefreshState({
            reason: isStep8RestartStep7Error(currentError) ? 'auth_retry_page' : 'mail_polling_failure',
            visibleStep,
            authLoginStep,
          });
        }
      }

      const visibleStep = getVisibleStep(currentState, 8);
      if (lastMailPollingError) {
        throw new Error(
          `步骤 ${visibleStep}：登录验证码流程在 ${STEP7_MAIL_POLLING_RECOVERY_MAX_ATTEMPTS} 轮邮箱轮询恢复后仍未成功。最后一次原因：${lastMailPollingError.message}`
        );
      }

      throw new Error(`步骤 ${visibleStep}：登录验证码流程未成功完成。`);
    }

    return {
      executeStep8,
      executePostLoginPhoneVerification,
      executeBindEmail,
      executeFetchBindEmailCode,
      executeBoundEmailLoginCode,
    };
  }

  return { createStep8Executor };
});
