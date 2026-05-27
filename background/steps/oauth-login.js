(function attachBackgroundStep7(root, factory) {
  root.MultiPageBackgroundStep7 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundStep7Module() {
  const STEP7_COOKIE_CLEAR_DOMAINS = [
    'chatgpt.com',
    'chat.openai.com',
    'openai.com',
    'auth.openai.com',
    'auth0.openai.com',
    'accounts.openai.com',
  ];
  const STEP7_COOKIE_CLEAR_ORIGINS = [
    'https://chatgpt.com',
    'https://chat.openai.com',
    'https://auth.openai.com',
    'https://auth0.openai.com',
    'https://accounts.openai.com',
    'https://openai.com',
  ];
  const STEP7_COOKIE_SCAN_DOMAINS = [
    'chatgpt.com',
    'openai.com',
  ];
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

  function createStep7Executor(deps = {}) {
    const {
      addLog,
      chrome: chromeApi = globalThis.chrome,
      completeNodeFromBackground,
      getErrorMessage,
      getLoginAuthStateLabel,
      getOAuthFlowStepTimeoutMs,
      getState,
      isAddPhoneAuthFailure = (error) => {
        const message = String(typeof error === 'string' ? error : error?.message || '');
        return /https:\/\/auth\.openai\.com\/add-phone(?:[/?#]|$)|\badd-phone\b|\u6dfb\u52a0\u624b\u673a\u53f7|\u624b\u673a\u53f7\u7801|\u8fdb\u5165\u624b\u673a\u53f7\u9875\u9762|\u624b\u673a\u53f7\u9875|\u624b\u673a\u53f7\u9875\u9762|phone\s+number|telephone/i.test(message);
      },
      isStep6RecoverableResult,
      isStep6SuccessResult,
      refreshOAuthUrlBeforeStep6,
      reuseOrCreateTab,
      sendToContentScriptResilient,
      startOAuthFlowTimeoutWindow,
      STEP6_MAX_ATTEMPTS,
      throwIfStopped,
    } = deps;

    function isManagementSecretConfigError(error) {
      const message = String(typeof error === 'string' ? error : error?.message || '').trim();
      if (!message) {
        return false;
      }

      const mentionsSecret = /管理密钥|Admin Secret|X-Admin-Key|CPA Key/i.test(message);
      if (!mentionsSecret) {
        return false;
      }

      return /缺少|未配置|请输入|无效|错误|失败|401|认证失败|未授权|unauthorized|invalid/i.test(message);
    }

    function extractAddPhoneUrl(error) {
      const message = String(typeof error === 'string' ? error : error?.message || '');
      const match = message.match(/https:\/\/auth\.openai\.com\/add-phone(?:[^\s]*)?/i);
      return match ? match[0] : 'https://auth.openai.com/add-phone';
    }

    function getStep7ResultState(result = {}) {
      return String(result?.state || '').trim();
    }

    function isStep7OauthConsentResult(result = {}) {
      return Boolean(result?.directOAuthConsentPage)
        || getStep7ResultState(result) === 'oauth_consent_page';
    }

    function isStep7AddEmailResult(result = {}) {
      return Boolean(result?.addEmailPage) || getStep7ResultState(result) === 'add_email_page';
    }

    function isStep7AddPhoneResult(result = {}) {
      return Boolean(result?.addPhonePage) || getStep7ResultState(result) === 'add_phone_page';
    }

    function isStep7PhoneVerificationResult(result = {}) {
      return Boolean(result?.phoneVerificationPage) || getStep7ResultState(result) === 'phone_verification_page';
    }

    function isStep7PlainVerificationResult(result = {}) {
      return getStep7ResultState(result) === 'verification_page' && !isStep7PhoneVerificationResult(result);
    }

    function completionStepForState(state = {}) {
      const visibleStep = Math.floor(Number(state?.visibleStep) || 0);
      return visibleStep > 0 ? visibleStep : 7;
    }

    function buildStep7CompletionPayload(result = {}, currentState = {}) {
      const payload = {
        accountIdentifierType: 'email',
        accountIdentifier: String(currentState?.email || '').trim(),
        loginVerificationRequestedAt: result.loginVerificationRequestedAt || null,
      };

      if (isStep7OauthConsentResult(result)) {
        payload.skipLoginVerificationStep = true;
        payload.directOAuthConsentPage = true;
        return payload;
      }

      if (isStep7AddEmailResult(result)) {
        throw new Error(`步骤 ${completionStepForState(currentState)}：邮箱登录模式不应进入添加邮箱页。URL: ${result?.url || ''}`.trim());
      }
      if (isStep7AddPhoneResult(result) || isStep7PhoneVerificationResult(result)) {
        const url = result?.url ? ` URL: ${result.url}` : '';
        throw new Error(`步骤 ${completionStepForState(currentState)}：当前认证页进入手机号页面，已停止自动流程。${url}`.trim());
      }
      if (isStep7PlainVerificationResult(result)) {
        return payload;
      }

      throw new Error(`步骤 ${completionStepForState(currentState)}：邮箱登录模式进入了不允许的页面：${getLoginAuthStateLabel(result.state)}。URL: ${result?.url || ''}`.trim());
    }

    async function executeStep7(state) {
      const visibleStep = Math.floor(Number(state?.visibleStep) || 0);
      const completionStep = visibleStep > 0 ? visibleStep : 7;
      const email = String(
        state?.email
        || (String(state?.accountIdentifierType || '').trim().toLowerCase() === 'email' ? state?.accountIdentifier : '')
        || ''
      ).trim();
      if (!email) {
        throw new Error('缺少登录账号：请先完成步骤 2，或在侧栏“注册邮箱”中手动填写账号后再执行当前步骤。');
      }
      let preAuthCookieCleanupDone = false;
      const maybeRunPreAuthCookieCleanup = async () => {
        if (preAuthCookieCleanupDone) {
          return;
        }
        preAuthCookieCleanupDone = true;
        if (!state?.step6CookieCleanupEnabled) {
          return;
        }
        if (!chromeApi?.cookies?.getAll || !chromeApi.cookies?.remove) {
          await addLog('步骤 7：当前浏览器不支持 cookies API，跳过授权前 Cookies 清理。', 'warn', {
            step: completionStep,
            stepKey: 'oauth-login',
          });
          return;
        }
        try {
          const cleanupResult = await cleanupCookies(chromeApi, {
            clearDomains: STEP7_COOKIE_CLEAR_DOMAINS,
            scanDomains: STEP7_COOKIE_SCAN_DOMAINS,
            clearOrigins: STEP7_COOKIE_CLEAR_ORIGINS,
            skipBrowsingDataWhenNoMatch: false,
            removeConcurrency: 6,
            getErrorMessage,
            warnLabel: 'step7',
          });
          if (cleanupResult.browsingDataError) {
            await addLog(`步骤 7：browsingData 补扫 cookies 失败：${getErrorMessage(cleanupResult.browsingDataError)}`, 'warn', {
              step: completionStep,
              stepKey: 'oauth-login',
            });
          }
          await addLog(`步骤 7：授权前已清理 ${cleanupResult.removedCount} 个 ChatGPT / OpenAI cookies。`, 'ok', {
            step: completionStep,
            stepKey: 'oauth-login',
          });
        } catch (error) {
          await addLog(`步骤 7：授权前 Cookies 清理失败，继续执行登录流程：${getErrorMessage(error)}`, 'warn', {
            step: completionStep,
            stepKey: 'oauth-login',
          });
        }
      };
      await maybeRunPreAuthCookieCleanup();

      let attempt = 0;
      let lastError = null;

      while (attempt < STEP6_MAX_ATTEMPTS) {
        throwIfStopped();
        attempt += 1;
        try {
          const rawCurrentState = attempt === 1 ? state : await getState();
          const currentState = {
            ...rawCurrentState,
            forceLoginIdentifierType: 'email',
            forceEmailLogin: true,
            signupMethod: 'email',
            resolvedSignupMethod: 'email',
            accountIdentifierType: 'email',
            accountIdentifier: email,
            email,
          };
          const password = currentState.password || currentState.customPassword || '';
          const oauthUrl = await refreshOAuthUrlBeforeStep6(currentState);
          if (typeof startOAuthFlowTimeoutWindow === 'function') {
            await startOAuthFlowTimeoutWindow({ step: completionStep, oauthUrl });
          }
          const loginTimeoutMs = typeof getOAuthFlowStepTimeoutMs === 'function'
            ? await getOAuthFlowStepTimeoutMs(180000, {
              step: completionStep,
              actionLabel: 'OAuth 登录并进入验证码页',
              oauthUrl,
            })
            : 180000;

          if (attempt === 1) {
            await addLog('正在打开最新 OAuth 链接并登录...', 'info', {
              step: completionStep,
              stepKey: 'oauth-login',
            });
          } else {
            await addLog(`上一轮失败后，正在进行第 ${attempt} 次尝试（最多 ${STEP6_MAX_ATTEMPTS} 次）...`, 'warn', {
              step: completionStep,
              stepKey: 'oauth-login',
            });
          }

          await reuseOrCreateTab('signup-page', oauthUrl, { forceNew: true });

          const result = await sendToContentScriptResilient(
            'signup-page',
            {
              type: 'EXECUTE_NODE',
              nodeId: 'oauth-login',
              step: 7,
              source: 'background',
              payload: {
                email,
                accountIdentifier: email,
                loginIdentifierType: 'email',
                password,
                visibleStep: completionStep,
              },
            },
            {
              timeoutMs: loginTimeoutMs,
              responseTimeoutMs: loginTimeoutMs,
              retryDelayMs: 700,
              logMessage: '认证页正在切换，等待页面重新就绪后继续登录...',
              logStep: completionStep,
              logStepKey: 'oauth-login',
            }
          );

          if (result?.error) {
            throw new Error(result.error);
          }

          if (isStep6SuccessResult(result)) {
            const completionPayload = buildStep7CompletionPayload(
              result,
              { ...(currentState || {}), visibleStep: completionStep }
            );
            await completeNodeFromBackground(state?.nodeId || 'oauth-login', completionPayload);
            return;
          }

          if (isStep6RecoverableResult(result)) {
            const reasonMessage = result.message
              || `当前停留在${getLoginAuthStateLabel(result.state)}，准备重新执行步骤 ${completionStep}。`;
            throw new Error(reasonMessage);
          }

          throw new Error(`步骤 ${completionStep}：认证页未返回可识别的登录结果。`);
        } catch (err) {
          throwIfStopped(err);
          if (isAddPhoneAuthFailure(err)) {
            throw new Error(
              `步骤 ${completionStep}：当前认证页进入手机号页面，已停止自动流程。URL: ${extractAddPhoneUrl(err)}`
            );
          }
          if (isManagementSecretConfigError(err)) {
            await addLog(
              `检测到来源后台管理密钥缺失或错误，不再重试，当前流程停止。原因：${getErrorMessage(err)}`,
              'error',
              { step: completionStep, stepKey: 'oauth-login' }
            );
            throw err;
          }
          lastError = err;
          if (attempt >= STEP6_MAX_ATTEMPTS) {
            break;
          }

          await addLog(`第 ${attempt} 次尝试失败，原因：${getErrorMessage(err)}；准备重试...`, 'warn', {
            step: completionStep,
            stepKey: 'oauth-login',
          });
        }
      }

      throw new Error(`步骤 ${completionStep}：判断失败后已重试 ${STEP6_MAX_ATTEMPTS - 1} 次，仍未成功。最后原因：${getErrorMessage(lastError)}`);
    }

    return { executeStep7 };
  }

  return { createStep7Executor };
});
