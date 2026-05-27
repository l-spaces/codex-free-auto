(function attachBackgroundMessageRouter(root, factory) {
  root.MultiPageBackgroundMessageRouter = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundMessageRouterModule() {
  function createMessageRouter(deps = {}) {
    const {
      addLog,
      appendAccountRunRecord,
      batchUpdateLuckmailPurchases,
      buildLocalhostCleanupPrefix,
      buildLuckmailSessionSettingsPayload,
      buildGptmailSessionSettingsPayload = () => ({}),
      buildPersistentSettingsPayload,
      broadcastDataUpdate,
      cancelScheduledAutoRun,
      checkIcloudSession,
      clearAccountRunHistory,
      deleteAccountRunHistoryRecords,
      clearAutoRunTimerAlarm,
      clearLuckmailRuntimeState,
      clearYydsMailRuntimeState,
      clearStopRequest,
      closeLocalhostCallbackTabs,
      closeTabsByUrlPrefix,
      completeNodeFromBackground,
      deleteHotmailAccount,
      deleteHotmailAccounts,
      deleteIcloudAlias,
      deleteUsedIcloudAliases,
      disableUsedLuckmailPurchases,
      doesNodeUseCompletionSignal,
      ensureMail2925MailboxSession,
      ensureManualInteractionAllowed,
      executeNode,
      executeNodeViaCompletionSignal,
      exportSettingsBundle,
      fetchGeneratedEmail,
      finalizeStep3Completion,
      finalizeIcloudAliasAfterSuccessfulFlow,
      findHotmailAccount,
      flushCommand,
      getCurrentLuckmailPurchase,
      getCurrentMail2925Account,
      getPendingAutoRunTimerPlan,
      getSourceLabel,
      getState,
      getNodeDefinitionForState,
      getNodeIdsForState,
      getStepIdByNodeIdForState,
      getStepDefinitionForState,
      getStepIdsForState,
      getLastStepIdForState,
      normalizeSignupMethod = () => 'email',
      resolveSignupMethod = () => 'email',
      validateAutoRunStart = (state = {}, options = {}) => {
        const validationState = options?.state || state;
        const rootScope = typeof self !== 'undefined' ? self : globalThis;
        const capabilityRegistry = rootScope.MultiPageFlowCapabilities?.createFlowCapabilityRegistry?.({
          defaultFlowId: 'openai',
        }) || null;
        if (!capabilityRegistry?.validateAutoRunStart) {
          return { ok: true, errors: [] };
        }
        return capabilityRegistry.validateAutoRunStart({
          activeFlowId: options?.activeFlowId ?? validationState?.activeFlowId,
          panelMode: options?.panelMode ?? validationState?.panelMode,
          signupMethod: options?.signupMethod ?? validationState?.signupMethod,
          state: validationState,
        });
      },
      validateModeSwitch = (state = {}, options = {}) => {
        const validationState = options?.state || state;
        const rootScope = typeof self !== 'undefined' ? self : globalThis;
        const capabilityRegistry = rootScope.MultiPageFlowCapabilities?.createFlowCapabilityRegistry?.({
          defaultFlowId: 'openai',
        }) || null;
        if (!capabilityRegistry?.validateModeSwitch) {
          return {
            ok: true,
            changedKeys: Array.isArray(options?.changedKeys) ? options.changedKeys : [],
            errors: [],
            normalizedUpdates: {},
          };
        }
        return capabilityRegistry.validateModeSwitch({
          activeFlowId: options?.activeFlowId ?? validationState?.activeFlowId,
          changedKeys: options?.changedKeys,
          panelMode: options?.panelMode ?? validationState?.panelMode,
          signupMethod: options?.signupMethod ?? validationState?.signupMethod,
          state: validationState,
        });
      },
      getTabId,
      getStopRequested,
      handleAutoRunLoopUnhandledError,
      importSettingsBundle,
      invalidateDownstreamAfterStepRestart,
      isCloudflareSecurityBlockedError,
      isAutoRunLockedState,
      isHotmailProvider,
      isLocalhostOAuthCallbackUrl,
      isLuckmailProvider,
      isYydsMailProvider = () => false,
      isStopError,
      isTabAlive,
      launchAutoRunTimerPlan,
      listIcloudAliases,
      listLuckmailPurchasesForManagement,
      markCurrentCustomEmailPoolEntryUsed,
      markCurrentRegistrationAccountUsed,
      normalizeHotmailAccounts,
      normalizeMail2925Accounts,
      normalizeRunCount,
      AUTO_RUN_TIMER_KIND_SCHEDULED_START,
      notifyNodeComplete,
      notifyNodeError,
      patchMail2925Account,
      patchHotmailAccount,
      registerTab,
      requestStop,
      handleCloudflareSecurityBlocked,
      resetState,
      resumeAutoRun,
      scheduleAutoRun,
      selectLuckmailPurchase,
      setCurrentMail2925Account,
      setCurrentHotmailAccount,
      setEmailState,
      setEmailStateSilently,
      persistRegistrationEmailState,
      setIcloudAliasPreservedState,
      setIcloudAliasUsedState,
      setLuckmailPurchaseDisabledState,
      setLuckmailPurchasePreservedState,
      setLuckmailPurchaseUsedState,
      setPersistentSettings,
      setState,
      setNodeStatus,
      skipAutoRunCountdown,
      skipNode,
      startAutoRunLoop,
      deleteMail2925Account,
      deleteMail2925Accounts,
      syncHotmailAccounts,
      testHotmailAccountMailAccess,
      upsertMail2925Account,
      upsertHotmailAccount,
      verifyHotmailAccount,
    } = deps;

    function preserveKeyFromState(updates, currentState, key) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) {
        return;
      }
      if (currentState?.[key] !== undefined) {
        updates[key] = currentState[key];
      } else {
        delete updates[key];
      }
    }

    async function appendManualAccountRunRecordIfNeeded(status, stateOverride = null, reason = '') {
      if (typeof appendAccountRunRecord !== 'function') {
        return null;
      }

      const state = stateOverride || await getState();
      if (isAutoRunLockedState(state)) {
        return null;
      }

      return appendAccountRunRecord(status, state, reason);
    }

    async function ensureManualStepPrerequisites(step) {
      if (step !== 4) {
        return;
      }

      const signupTabId = typeof getTabId === 'function'
        ? await getTabId('signup-page')
        : null;
      const signupTabAlive = signupTabId && typeof isTabAlive === 'function'
        ? await isTabAlive('signup-page')
        : Boolean(signupTabId);

      if (!signupTabId || !signupTabAlive) {
        throw new Error('手动执行步骤 4 前，请先执行步骤 1 或步骤 2，确保认证页仍然打开并停留在验证码页。');
      }
    }

    const DEFAULT_OPENAI_NODE_BY_STEP = Object.freeze({
      1: 'open-chatgpt',
      2: 'submit-signup-email',
      3: 'fill-password',
      4: 'fetch-signup-code',
      5: 'fill-profile',
      6: 'wait-registration-success',
      7: 'oauth-login',
      8: 'fetch-login-code',
      9: 'confirm-oauth',
      10: 'platform-verify',
    });

    function getStepKeyForState(step, state = {}) {
      if (typeof getStepDefinitionForState === 'function') {
        return String(getStepDefinitionForState(step, state)?.key || '').trim();
      }
      return DEFAULT_OPENAI_NODE_BY_STEP[Number(step)] || '';
    }

    function findStepByNodeId(nodeId, state = {}) {
      const normalizedNodeId = String(nodeId || '').trim();
      if (normalizedNodeId && typeof getStepIdByNodeIdForState === 'function') {
        const step = getStepIdByNodeIdForState(normalizedNodeId, state);
        if (Number.isInteger(step) && step > 0) {
          return step;
        }
      }
      if (!normalizedNodeId || typeof getStepIdsForState !== 'function') {
        return 0;
      }
      for (const stepId of getStepIdsForState(state)) {
        if (getStepKeyForState(stepId, state) === normalizedNodeId) {
          return Number(stepId) || 0;
        }
      }
      return 0;
    }

    async function normalizeNodeProtocolMessage(message = {}) {
      const type = String(message?.type || '').trim();
      const nodeProtocolTypes = new Set([
        'EXECUTE_NODE',
        'NODE_COMPLETE',
        'NODE_ERROR',
        'SKIP_NODE',
      ]);
      if (!nodeProtocolTypes.has(type)) {
        return message;
      }

      const nodeId = String(message?.payload?.nodeId || message?.nodeId || '').trim();
      if (!nodeId) {
        throw new Error(`${type} 缺少 nodeId。`);
      }
      const state = await getState();
      const step = findStepByNodeId(nodeId, state);
      if (!step) {
        throw new Error(`当前 flow 中未找到节点：${nodeId}`);
      }

      const payload = {
        ...(message.payload || {}),
        nodeId,
        step,
      };
      return { ...message, nodeId, step, payload };
    }

    function isStaleAutoRunNodeMessage(nodeId, state = {}) {
      const normalizedNodeId = String(nodeId || '').trim();
      if (!normalizedNodeId) {
        return false;
      }
      if (typeof isAutoRunLockedState !== 'function' || !isAutoRunLockedState(state)) {
        return false;
      }
      const currentStatus = String(state?.nodeStatuses?.[normalizedNodeId] || '').trim();
      if (currentStatus === 'running') {
        return false;
      }
      const currentNodeId = String(state?.currentNodeId || '').trim();
      if (currentNodeId && normalizedNodeId !== currentNodeId) {
        return true;
      }
      return ['completed', 'manual_completed', 'skipped', 'failed', 'stopped'].includes(currentStatus);
    }

    function formatNodeFailureMessageForLog(error, nodeId = '') {
      const message = String(typeof error === 'string' ? error : error?.message || '');
      const normalizedNodeId = String(nodeId || '').trim();
      if (normalizedNodeId !== 'post-login-phone-verification') {
        return message;
      }
      if (isPostLoginPhoneVerificationAddPhoneWarning(error, normalizedNodeId)) {
        return '警告';
      }
      return message.startsWith('ADD_PHONE_REQUIRED::')
        ? message.slice('ADD_PHONE_REQUIRED::'.length).trim()
        : message;
    }

    function isPostLoginPhoneVerificationAddPhoneWarning(error, nodeId = '') {
      const normalizedNodeId = String(nodeId || '').trim();
      if (normalizedNodeId !== 'post-login-phone-verification') {
        return false;
      }
      const message = String(typeof error === 'string' ? error : error?.message || '');
      if (/\u624b\u673a\u53f7\u8f93\u5165\u6a21\u5f0f|phone\s+entry/i.test(message)) {
        return false;
      }
      return /ADD_PHONE_REQUIRED::|https:\/\/auth\.openai\.com\/(?:add-phone|phone-verification)(?:[/?#]|$)|\badd-phone\b|phone-verification|\u6dfb\u52a0\u624b\u673a\u53f7|\u624b\u673a\u53f7\u7801|\u624b\u673a\u9a8c\u8bc1\u7801\u9875|\u624b\u673a\u9a8c\u8bc1\u9875|\u8fdb\u5165\u624b\u673a\u53f7\u9875\u9762|\u624b\u673a\u53f7\u9875|\u624b\u673a\u53f7\u9875\u9762|phone\s+number|telephone/i.test(message);
    }

    function shouldOmitFailurePrefixForNodeLog(nodeId = '', message = '') {
      const normalizedNodeId = String(nodeId || '').trim();
      const normalizedMessage = String(message || '').trim();
      return normalizedNodeId === 'post-login-phone-verification'
        && (/^步骤\s*9[:：]/.test(normalizedMessage) || normalizedMessage === '警告');
    }

    function formatNodeFailureLogLine(error, nodeId = '') {
      const displayMessage = formatNodeFailureMessageForLog(error, nodeId);
      return shouldOmitFailurePrefixForNodeLog(nodeId, displayMessage)
        ? displayMessage
        : `失败：${displayMessage}`;
    }

    function resolveNodeFailureLogLevel(error, nodeId = '') {
      return 'warn';
    }

    function shouldSuppressNodeFailureLogInAutoRun(error, nodeId = '', state = {}) {
      if (!isPostLoginPhoneVerificationAddPhoneWarning(error, nodeId)) {
        return false;
      }
      return typeof isAutoRunLockedState === 'function' && isAutoRunLockedState(state);
    }

    function resolveEmailIdentityPayload(payload = {}) {
      const directEmail = String(payload?.email || '').trim();
      if (directEmail) {
        return directEmail;
      }
      return String(payload?.accountIdentifierType || '').trim().toLowerCase() === 'email'
        ? String(payload?.accountIdentifier || '').trim()
        : '';
    }

    async function persistEmailIdentityFromStepPayload(email, payload = {}, source = 'step_payload') {
      if (!email) {
        return;
      }
      const state = await getState();
      if (typeof persistRegistrationEmailState === 'function') {
        await persistRegistrationEmailState(state, email, {
          source,
          preserveAccountIdentity: false,
        });
        return;
      }
      await setEmailState(email, { source, preserveAccountIdentity: false });
    }

    function normalizeAutomationWindowId(value) {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const numeric = Number(value);
      return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
    }

    function resolveAutomationWindowIdFromMessage(message = {}, sender = {}) {
      return normalizeAutomationWindowId(
        message?.payload?.automationWindowId
        ?? message?.payload?.windowId
        ?? message?.automationWindowId
        ?? message?.windowId
        ?? sender?.tab?.windowId
        ?? null
      );
    }

    async function lockAutomationWindowFromMessage(message = {}, sender = {}) {
      const windowId = resolveAutomationWindowIdFromMessage(message, sender);
      if (windowId === null) {
        return null;
      }
      await setState({ automationWindowId: windowId });
      return windowId;
    }

    async function syncStepAccountIdentityFromPayload(payload = {}) {
      const identifierType = String(payload?.accountIdentifierType || '').trim().toLowerCase();
      const email = resolveEmailIdentityPayload(payload);
      if (identifierType === 'email' || email) {
        if (email) {
          await persistEmailIdentityFromStepPayload(email, payload, 'step_identity');
        }
      }
    }

    function isStepProtectedFromAutoSkip(status) {
      return status === 'running'
        || status === 'completed'
        || status === 'manual_completed'
        || status === 'skipped';
    }

    function findStepByKeyAfter(currentOrder, targetKey, state = {}) {
      const activeStepIds = typeof getStepIdsForState === 'function'
        ? getStepIdsForState(state)
        : [];
      const candidates = activeStepIds.length ? activeStepIds : [Number(currentOrder) + 1, 8];
      return candidates.find((stepId) => {
        const numericStep = Number(stepId);
        if (!Number.isFinite(numericStep) || numericStep <= Number(currentOrder)) {
          return false;
        }
        const stepKey = getStepKeyForState(numericStep, state);
        if (stepKey) {
          return stepKey === targetKey;
        }
        return targetKey === 'fetch-login-code' && Number(currentOrder) === 7 && numericStep === 8;
      }) || null;
    }

    function getNodeStatusByStep(step, state = {}) {
      const nodeId = getStepKeyForState(step, state);
      return nodeId ? (state.nodeStatuses?.[nodeId] || 'pending') : 'pending';
    }

    async function setNodeStatusByStep(step, status, state = {}) {
      const nodeId = getStepKeyForState(step, state);
      if (!nodeId) {
        throw new Error(`未找到步骤 ${step} 对应节点。`);
      }
      await setNodeStatus(nodeId, status);
      return nodeId;
    }

    async function handlePlatformVerifyStepData(payload) {
      if (payload.localhostUrl) {
        await closeLocalhostCallbackTabs(payload.localhostUrl);
      }
      const latestState = await getState();
      if (typeof markCurrentRegistrationAccountUsed === 'function') {
        await markCurrentRegistrationAccountUsed(latestState, {
          logPrefix: '流程完成',
          level: 'ok',
        });
      } else if (latestState.currentHotmailAccountId && isHotmailProvider(latestState)) {
        await patchHotmailAccount(latestState.currentHotmailAccountId, {
          used: true,
          lastUsedAt: Date.now(),
        });
        await addLog('当前 Hotmail 账号已自动标记为已用。', 'ok');
      }
      if (typeof markCurrentRegistrationAccountUsed !== 'function' && String(latestState.mailProvider || '').trim().toLowerCase() === '2925' && latestState.currentMail2925AccountId) {
        await patchMail2925Account(latestState.currentMail2925AccountId, {
          lastUsedAt: Date.now(),
          lastError: '',
        });
        await addLog('当前 2925 账号已记录最近使用时间。', 'ok');
      }
      if (typeof markCurrentRegistrationAccountUsed !== 'function' && isLuckmailProvider(latestState)) {
        const currentPurchase = getCurrentLuckmailPurchase(latestState);
        if (currentPurchase?.id) {
          await setLuckmailPurchaseUsedState(currentPurchase.id, true);
          await addLog(`当前 LuckMail 邮箱 ${currentPurchase.email_address} 已在本地标记为已用。`, 'ok');
        }
        await clearLuckmailRuntimeState({ clearEmail: true });
        await addLog('当前 LuckMail 邮箱运行态已清空，下轮将优先复用未用邮箱或重新购买邮箱。', 'ok');
      }
      if (
        typeof markCurrentRegistrationAccountUsed !== 'function'
        && isYydsMailProvider(latestState)
        && typeof clearYydsMailRuntimeState === 'function'
      ) {
        await clearYydsMailRuntimeState({ clearEmail: true });
        await addLog('当前 YYDS Mail 邮箱运行态已清空，下轮将重新创建邮箱。', 'ok');
      }
      const localhostPrefix = buildLocalhostCleanupPrefix(payload.localhostUrl);
      if (localhostPrefix) {
        await closeTabsByUrlPrefix(localhostPrefix, {
          excludeUrls: [payload.localhostUrl],
          excludeLocalhostCallbacks: true,
        });
      }
      if (typeof markCurrentRegistrationAccountUsed !== 'function') {
        await finalizeIcloudAliasAfterSuccessfulFlow(latestState);
      }
    }

    async function handleStepData(step, payload) {
      if (step === 1) {
        const updates = {};
        if (payload.oauthUrl) {
          updates.oauthUrl = payload.oauthUrl;
          broadcastDataUpdate({ oauthUrl: payload.oauthUrl });
        }
        if (payload.sub2apiSessionId !== undefined) updates.sub2apiSessionId = payload.sub2apiSessionId || null;
        if (payload.sub2apiOAuthState !== undefined) updates.sub2apiOAuthState = payload.sub2apiOAuthState || null;
        if (payload.sub2apiGroupId !== undefined) updates.sub2apiGroupId = payload.sub2apiGroupId || null;
        if (payload.sub2apiGroupIds !== undefined) updates.sub2apiGroupIds = Array.isArray(payload.sub2apiGroupIds)
          ? payload.sub2apiGroupIds
          : [];
        if (payload.sub2apiDraftName !== undefined) updates.sub2apiDraftName = payload.sub2apiDraftName || null;
        if (payload.sub2apiProxyId !== undefined) updates.sub2apiProxyId = payload.sub2apiProxyId || null;
        if (payload.cpaOAuthState !== undefined) updates.cpaOAuthState = payload.cpaOAuthState || null;
        if (payload.cpaManagementOrigin !== undefined) updates.cpaManagementOrigin = payload.cpaManagementOrigin || null;
        if (payload.codex2apiSessionId !== undefined) updates.codex2apiSessionId = payload.codex2apiSessionId || null;
        if (payload.codex2apiOAuthState !== undefined) updates.codex2apiOAuthState = payload.codex2apiOAuthState || null;
        if (Object.keys(updates).length) {
          await setState(updates);
        }
        return;
      }

      const stateForStep = await getState();
      const stepKey = getStepKeyForState(step, stateForStep);

      if (stepKey === 'oauth-login' || stepKey === 'relogin-bound-email') {
        if (stepKey === 'oauth-login') {
          await syncStepAccountIdentityFromPayload(payload);
        }
        if (payload.skipLoginVerificationStep) {
          await setState({ loginVerificationRequestedAt: null });
          const latestState = await getState();
          const loginCodeStep = findStepByKeyAfter(step, 'fetch-login-code', latestState);
          if (loginCodeStep) {
            const currentStatus = getNodeStatusByStep(loginCodeStep, latestState);
            if (!isStepProtectedFromAutoSkip(currentStatus)) {
              await setNodeStatusByStep(loginCodeStep, 'skipped', latestState);
              await addLog(`认证页已直接进入 OAuth 授权页，已自动跳过步骤 ${loginCodeStep} 的登录验证码。`, 'warn', {
                step,
                stepKey: 'oauth-login',
              });
            }
          }
        } else if (payload.loginVerificationRequestedAt) {
          await setState({ loginVerificationRequestedAt: payload.loginVerificationRequestedAt });
        }
        return;
      }

      if (stepKey === 'fetch-login-code') {
        await setState({
          lastEmailTimestamp: payload.emailTimestamp || null,
          loginVerificationRequestedAt: null,
        });
        if (payload.skipLoginVerificationStep) {
          const latestState = await getState();
          const currentStatus = getNodeStatusByStep(step, latestState);
          // Step8 自身判定“可跳过”时，同步改为 skipped，保持与步骤 3 一致的蓝色“跳过”展示。
          if (currentStatus === 'completed' || currentStatus === 'pending') {
            await setNodeStatusByStep(step, 'skipped', latestState);
          }
        }
        return;
      }

      if (stepKey === 'post-login-phone-verification') {
        if (payload.phoneVerification === false) {
          const latestState = await getState();
          const currentStatus = getNodeStatusByStep(step, latestState);
          // Step9 未进入手机号验证页时属于“按条件跳过”，应与步骤 3/8 保持一致显示为 skipped。
          if (currentStatus === 'completed' || currentStatus === 'pending') {
            await setNodeStatusByStep(step, 'skipped', latestState);
          }
        }
        return;
      }

      if (stepKey === 'bind-email') {
        const updates = {};
        if (payload.bindEmailSubmitted !== undefined) {
          updates.bindEmailSubmitted = Boolean(payload.bindEmailSubmitted);
        }
        if (payload.email !== undefined) {
          updates.email = payload.email || null;
        }
        if (payload.step8VerificationTargetEmail !== undefined) {
          updates.step8VerificationTargetEmail = payload.step8VerificationTargetEmail || '';
        }
        if (Object.keys(updates).length) {
          await setState(updates);
        }
        return;
      }

      if (stepKey === 'fetch-bind-email-code') {
        await setState({
          lastEmailTimestamp: payload.emailTimestamp || null,
          loginVerificationRequestedAt: null,
          step8VerificationTargetEmail: '',
          bindEmailSubmitted: false,
        });
        return;
      }

      if (stepKey === 'confirm-oauth') {
        if (payload.localhostUrl) {
          if (!isLocalhostOAuthCallbackUrl(payload.localhostUrl)) {
            throw new Error(`步骤 ${step} 返回了无效的 localhost OAuth 回调地址。`);
          }
          await setState({ localhostUrl: payload.localhostUrl });
          broadcastDataUpdate({ localhostUrl: payload.localhostUrl });
        }
        return;
      }

      if (stepKey === 'platform-verify') {
        await handlePlatformVerifyStepData(payload);
        return;
      }

      switch (step) {
        case 1: {
          const updates = {};
          if (payload.oauthUrl) {
            updates.oauthUrl = payload.oauthUrl;
            broadcastDataUpdate({ oauthUrl: payload.oauthUrl });
          }
          if (payload.sub2apiSessionId !== undefined) updates.sub2apiSessionId = payload.sub2apiSessionId || null;
          if (payload.sub2apiOAuthState !== undefined) updates.sub2apiOAuthState = payload.sub2apiOAuthState || null;
          if (payload.sub2apiGroupId !== undefined) updates.sub2apiGroupId = payload.sub2apiGroupId || null;
          if (payload.sub2apiGroupIds !== undefined) updates.sub2apiGroupIds = Array.isArray(payload.sub2apiGroupIds)
            ? payload.sub2apiGroupIds
            : [];
          if (payload.sub2apiDraftName !== undefined) updates.sub2apiDraftName = payload.sub2apiDraftName || null;
          if (payload.sub2apiProxyId !== undefined) updates.sub2apiProxyId = payload.sub2apiProxyId || null;
          if (payload.codex2apiSessionId !== undefined) updates.codex2apiSessionId = payload.codex2apiSessionId || null;
          if (payload.codex2apiOAuthState !== undefined) updates.codex2apiOAuthState = payload.codex2apiOAuthState || null;
          if (Object.keys(updates).length) {
            await setState(updates);
          }
          break;
        }
        case 2:
          await syncStepAccountIdentityFromPayload(payload);
          if (payload.skipRegistrationFlow) {
            const latestState = await getState();
            for (const skippedStep of [3, 4, 5]) {
              const status = getNodeStatusByStep(skippedStep, latestState);
              if (status === 'running' || status === 'completed' || status === 'manual_completed') {
                continue;
              }
              await setNodeStatusByStep(skippedStep, 'skipped', latestState);
            }
            await addLog('步骤 2：检测到当前已登录会话，已自动跳过步骤 3/4/5，流程将直接进入步骤 6。', 'warn');
            break;
          }
          if (payload.skippedPasswordStep) {
            const latestState = await getState();
            const step3Status = getNodeStatusByStep(3, latestState);
            if (step3Status !== 'running' && step3Status !== 'completed' && step3Status !== 'manual_completed') {
              await setNodeStatusByStep(3, 'skipped', latestState);
              await addLog('步骤 2：提交邮箱后页面直接进入验证码页，已自动跳过步骤 3。', 'warn');
            }
          }
          break;
        case 3:
          await syncStepAccountIdentityFromPayload(payload);
          if (payload.signupVerificationRequestedAt) {
            await setState({ signupVerificationRequestedAt: payload.signupVerificationRequestedAt });
          }
          if (payload.skipProfileStep) {
            const latestState = await getState();
            const step5Status = getNodeStatusByStep(5, latestState);
            if (step5Status !== 'running' && step5Status !== 'completed' && step5Status !== 'manual_completed') {
              await setNodeStatusByStep(5, 'skipped', latestState);
              await addLog('步骤 3：页面已直接进入已登录态，已自动跳过步骤 5。', 'warn');
            }
          }
          if (payload.loginVerificationRequestedAt) {
            await setState({ loginVerificationRequestedAt: payload.loginVerificationRequestedAt });
          }
          break;
        case 4:
          await setState({
            lastEmailTimestamp: payload.emailTimestamp || null,
            signupVerificationRequestedAt: null,
          });
          if (payload.skipProfileStep) {
            const latestState = await getState();
            const step5Status = getNodeStatusByStep(5, latestState);
            if (step5Status !== 'running' && step5Status !== 'completed' && step5Status !== 'manual_completed') {
              await setNodeStatusByStep(5, 'skipped', latestState);
              if (payload.skipProfileStepReason === 'combined_verification_profile') {
                await addLog('步骤 4：当前验证码页已内嵌完成注册资料提交，已自动跳过步骤 5。', 'warn');
              } else {
                await addLog('步骤 4：检测到账号已直接进入已登录态，已自动跳过步骤 5。', 'warn');
              }
            }
          }
          break;
        case 7:
          await syncStepAccountIdentityFromPayload(payload);
          if (payload.loginVerificationRequestedAt) {
            await setState({ loginVerificationRequestedAt: payload.loginVerificationRequestedAt });
          }
          break;
        case 8:
          await setState({
            lastEmailTimestamp: payload.emailTimestamp || null,
            loginVerificationRequestedAt: null,
          });
          break;
        case 9:
          if (payload.localhostUrl) {
            if (!isLocalhostOAuthCallbackUrl(payload.localhostUrl)) {
              throw new Error('步骤 9 返回了无效的 localhost OAuth 回调地址。');
            }
            await setState({ localhostUrl: payload.localhostUrl });
            broadcastDataUpdate({ localhostUrl: payload.localhostUrl });
          }
          break;
        default:
          break;
      }
    }

    async function handleMessage(rawMessage, sender) {
      const message = await normalizeNodeProtocolMessage(rawMessage);
      switch (message.type) {
        case 'CONTENT_SCRIPT_READY': {
          const tabId = sender.tab?.id;
          if (tabId && message.source) {
            await registerTab(message.source, tabId);
            flushCommand(message.source, tabId);
            await addLog(`内容脚本已就绪：${getSourceLabel(message.source)}（标签页 ${tabId}）`);
          }
          return { ok: true };
        }

        case 'LOG': {
          const {
            message: msg,
            level,
            step: payloadStep,
            stepKey,
            timestamp,
          } = message.payload;
          const logStep = Math.floor(Number(message.step || payloadStep) || 0);
          await addLog(
            `[${getSourceLabel(message.source)}] ${msg}`,
            level,
            {
              step: logStep > 0 ? logStep : null,
              stepKey,
              timestamp,
            }
          );
          return { ok: true };
        }

        case 'NODE_COMPLETE': {
          const currentStateForNode = await getState();
          const nodeId = String(message.nodeId || message.payload?.nodeId || '').trim();
          const resolvedStep = findStepByNodeId(nodeId, currentStateForNode);
          if (!nodeId || !resolvedStep) {
            throw new Error('NODE_COMPLETE 缺少 nodeId。');
          }
          const currentState = await getState();
          if (isStaleAutoRunNodeMessage(nodeId, currentState)) {
            await addLog(
              `自动运行：忽略过期的节点 ${nodeId} 完成消息，当前流程已在节点 ${currentState.currentNodeId || '未知'}。`,
              'warn',
              { nodeId }
            );
            return { ok: true, ignored: true };
          }
          if (getStopRequested()) {
            await setNodeStatus(nodeId, 'stopped');
            await appendManualAccountRunRecordIfNeeded(`node:${nodeId}:stopped`, null, '流程已被用户停止。');
            notifyNodeError(nodeId, '流程已被用户停止。');
            return { ok: true };
          }
          try {
            if (nodeId === 'fill-password' && typeof finalizeStep3Completion === 'function') {
              await finalizeStep3Completion(message.payload || {});
            }
          } catch (error) {
            if (typeof isCloudflareSecurityBlockedError === 'function' && isCloudflareSecurityBlockedError(error)) {
              const userMessage = typeof handleCloudflareSecurityBlocked === 'function'
                ? await handleCloudflareSecurityBlocked(error)
                : (error?.message || String(error || ''));
              notifyNodeError(nodeId, '流程已被用户停止。');
              return { ok: true, error: userMessage };
            }
            const errorMessage = error?.message || String(error || '步骤 3 提交后确认失败');
            await setNodeStatus(nodeId, 'failed');
            const latestState = await getState();
            if (!shouldSuppressNodeFailureLogInAutoRun(errorMessage, nodeId, latestState)) {
              await addLog(formatNodeFailureLogLine(errorMessage, nodeId), resolveNodeFailureLogLevel(errorMessage, nodeId), {
                nodeId,
              });
            }
            await appendManualAccountRunRecordIfNeeded(`node:${nodeId}:failed`, null, errorMessage);
            notifyNodeError(nodeId, errorMessage);
            return { ok: true, error: errorMessage };
          }

          const completionStateCandidate = await getState();
          const nodeIds = typeof getNodeIdsForState === 'function' ? getNodeIdsForState(completionStateCandidate) : [];
          const lastNodeId = nodeIds[nodeIds.length - 1] || '';
          const isFinalNode = nodeId === lastNodeId;
          const completionState = isFinalNode ? completionStateCandidate : null;
          await setNodeStatus(nodeId, 'completed');
          const completionStepPrefix = Number.isInteger(resolvedStep) && resolvedStep > 0
            ? `【步骤${resolvedStep}】`
            : '';
          await addLog(`${completionStepPrefix}已完成`, 'ok', { nodeId });
          await handleStepData(resolvedStep, message.payload);
          if (isFinalNode && typeof appendAccountRunRecord === 'function') {
            await appendAccountRunRecord('success', completionState);
          }
          notifyNodeComplete(nodeId, message.payload);
          return { ok: true };
        }

        case 'NODE_ERROR': {
          const stateForNode = await getState();
          const nodeId = String(message.nodeId || message.payload?.nodeId || '').trim();
          const resolvedStep = findStepByNodeId(nodeId, stateForNode);
          if (!nodeId || !resolvedStep) {
            throw new Error('NODE_ERROR 缺少 nodeId。');
          }
          const staleCheckState = await getState();
          if (isStaleAutoRunNodeMessage(nodeId, staleCheckState)) {
            await addLog(
              `自动运行：忽略过期的节点 ${nodeId} 失败消息，当前流程已在节点 ${staleCheckState.currentNodeId || '未知'}。原始错误：${message.error || '未知错误'}`,
              'warn',
              { nodeId }
            );
            return { ok: true, ignored: true };
          }
          if (typeof isCloudflareSecurityBlockedError === 'function' && isCloudflareSecurityBlockedError(message.error)) {
            const userMessage = typeof handleCloudflareSecurityBlocked === 'function'
              ? await handleCloudflareSecurityBlocked(message.error)
              : (typeof message.error === 'string' ? message.error : String(message.error || ''));
            notifyNodeError(nodeId, '流程已被用户停止。');
            return { ok: true, error: userMessage };
          }
          const currentState = await getState();
          const currentNodeStatus = currentState?.nodeStatuses?.[nodeId] || '';
          const isSignupPhonePasswordMismatch = /SIGNUP_PHONE_PASSWORD_MISMATCH::/i.test(String(message.error || ''));
          if (isStopError(message.error)) {
            await setNodeStatus(nodeId, 'stopped');
            await addLog('已被用户停止', 'warn', { nodeId });
            await appendManualAccountRunRecordIfNeeded(`node:${nodeId}:stopped`, null, message.error);
            notifyNodeError(nodeId, message.error);
          } else {
            if (!(isSignupPhonePasswordMismatch && currentNodeStatus === 'failed')) {
              await setNodeStatus(nodeId, 'failed');
              if (!shouldSuppressNodeFailureLogInAutoRun(message.error, nodeId, currentState)) {
                await addLog(formatNodeFailureLogLine(message.error, nodeId), resolveNodeFailureLogLevel(message.error, nodeId), {
                  nodeId,
                });
              }
              await appendManualAccountRunRecordIfNeeded(`node:${nodeId}:failed`, null, message.error);
            }
            notifyNodeError(nodeId, message.error);
          }
          return { ok: true };
        }

        case 'GET_STATE': {
          return await getState();
        }

        case 'RESET': {
          clearStopRequest();
          await clearAutoRunTimerAlarm();
          await resetState();
          const clearResult = typeof clearAccountRunHistory === 'function'
            ? await clearAccountRunHistory(null, { suppressLog: true })
            : { clearedCount: 0 };
          return {
            ok: true,
            clearedAccountRunHistoryCount: Math.max(0, Number(clearResult?.clearedCount) || 0),
          };
        }

        case 'CLEAR_ACCOUNT_RUN_HISTORY': {
          const state = await getState();
          if (isAutoRunLockedState(state)) {
            throw new Error('自动流程运行中，当前不能清理邮箱记录。');
          }
          if (typeof clearAccountRunHistory !== 'function') {
            return { ok: true, clearedCount: 0 };
          }
          const result = await clearAccountRunHistory(state);
          return { ok: true, ...result };
        }

        case 'DELETE_ACCOUNT_RUN_HISTORY_RECORDS': {
          const state = await getState();
          if (isAutoRunLockedState(state)) {
            throw new Error('自动流程运行中，当前不能删除邮箱记录。');
          }
          if (typeof deleteAccountRunHistoryRecords !== 'function') {
            return { ok: true, deletedCount: 0, remainingCount: 0 };
          }
          const recordIds = Array.isArray(message.payload?.recordIds) ? message.payload.recordIds : [];
          const result = await deleteAccountRunHistoryRecords(recordIds, state);
          return { ok: true, ...result };
        }

        case 'EXECUTE_NODE': {
          clearStopRequest();
          const requestState = await getState();
          const nodeId = String(message.nodeId || message.payload?.nodeId || '').trim();
          const resolvedStep = findStepByNodeId(nodeId, requestState);
          if (!nodeId || !resolvedStep) {
            throw new Error('EXECUTE_NODE 缺少 nodeId。');
          }
          if (message.source === 'sidepanel') {
            await lockAutomationWindowFromMessage(message, sender);
            await ensureManualInteractionAllowed('手动执行节点');
          }
          if (message.source === 'sidepanel') {
            await ensureManualStepPrerequisites(resolvedStep);
          }
          if (message.source === 'sidepanel') {
            await invalidateDownstreamAfterStepRestart(resolvedStep, { logLabel: `节点 ${nodeId} 重新执行` });
          }
          if (message.payload.email) {
            await setEmailState(message.payload.email);
          }
          if (message.payload.emailPrefix !== undefined) {
            await setPersistentSettings({ emailPrefix: message.payload.emailPrefix });
            await setState({ emailPrefix: message.payload.emailPrefix });
          }
          const executionState = await getState();
          if (doesNodeUseCompletionSignal(nodeId, executionState)) {
            await executeNodeViaCompletionSignal(nodeId);
          } else {
            await executeNode(nodeId);
          }
          return { ok: true };
        }

        case 'AUTO_RUN': {
          clearStopRequest();
          if (message.source === 'sidepanel') {
            await lockAutomationWindowFromMessage(message, sender);
          }
          const state = await getState();
          const autoRunStartValidation = validateAutoRunStart(state, { state });
          if (autoRunStartValidation?.ok === false) {
            throw new Error(autoRunStartValidation.errors?.[0]?.message || '当前设置不支持启动自动流程。');
          }
          if (getPendingAutoRunTimerPlan(state)) {
            throw new Error('已有自动运行倒计时计划，请先取消或立即开始。');
          }
          const totalRuns = normalizeRunCount(message.payload?.totalRuns || 1);
          const autoRunSkipFailures = Boolean(message.payload?.autoRunSkipFailures);
          const mode = message.payload?.mode === 'continue' ? 'continue' : 'restart';
          const executionModeRaw = String(message.payload?.executionMode || state.executionMode || 'full').trim().toLowerCase();
          const executionMode = executionModeRaw === 'register_gpt'
            ? 'register_gpt'
            : (executionModeRaw === 'authorize_codex' ? 'authorize_codex' : 'full');
          const importedAccounts = Array.isArray(message.payload?.importedAccounts)
            ? message.payload.importedAccounts.map((item) => String(item || '').trim()).filter(Boolean)
            : (Array.isArray(state?.importedAccounts) ? state.importedAccounts : []);
          const startStep = Math.max(1, Math.floor(Number(message.payload?.startStep) || Number(state?.startStep) || 1));
          const endStep = Math.max(startStep, Math.floor(Number(message.payload?.endStep) || Number(state?.endStep) || startStep));
          if (executionMode === 'authorize_codex') {
            if (!importedAccounts.length) {
              throw new Error('授权Codex流程缺少导入账号，请先在侧边栏导入账号 JSON。');
            }
            if (totalRuns > importedAccounts.length) {
              throw new Error(`运行次数（${totalRuns}）不能超过导入账号数量（${importedAccounts.length}）。`);
            }
          }
          await setState({
            autoRunSkipFailures,
            executionMode,
            importedAccounts,
            startStep,
            endStep,
            authorizationEmail: executionMode === 'authorize_codex'
              ? String(importedAccounts[0] || '').trim()
              : '',
          });
          startAutoRunLoop(totalRuns, {
            autoRunSkipFailures,
            mode,
            executionMode,
            importedAccounts,
            startStep,
            endStep,
            authorizationEmail: executionMode === 'authorize_codex'
              ? String(importedAccounts[0] || '').trim()
              : '',
          });
          return { ok: true };
        }

        case 'SCHEDULE_AUTO_RUN': {
          clearStopRequest();
          if (message.source === 'sidepanel') {
            await lockAutomationWindowFromMessage(message, sender);
          }
          const state = await getState();
          const autoRunStartValidation = validateAutoRunStart(state, { state });
          if (autoRunStartValidation?.ok === false) {
            throw new Error(autoRunStartValidation.errors?.[0]?.message || '当前设置不支持启动自动流程。');
          }
          const totalRuns = normalizeRunCount(message.payload?.totalRuns || 1);
          const executionModeRaw = String(message.payload?.executionMode || state.executionMode || 'full').trim().toLowerCase();
          const executionMode = executionModeRaw === 'register_gpt'
            ? 'register_gpt'
            : (executionModeRaw === 'authorize_codex' ? 'authorize_codex' : 'full');
          const importedAccounts = Array.isArray(message.payload?.importedAccounts)
            ? message.payload.importedAccounts.map((item) => String(item || '').trim()).filter(Boolean)
            : (Array.isArray(state?.importedAccounts) ? state.importedAccounts : []);
          const startStep = Math.max(1, Math.floor(Number(message.payload?.startStep) || Number(state?.startStep) || 1));
          const endStep = Math.max(startStep, Math.floor(Number(message.payload?.endStep) || Number(state?.endStep) || startStep));
          if (executionMode === 'authorize_codex') {
            if (!importedAccounts.length) {
              throw new Error('授权Codex流程缺少导入账号，请先在侧边栏导入账号 JSON。');
            }
            if (totalRuns > importedAccounts.length) {
              throw new Error(`运行次数（${totalRuns}）不能超过导入账号数量（${importedAccounts.length}）。`);
            }
          }
          return await scheduleAutoRun(totalRuns, {
            delayMinutes: message.payload?.delayMinutes,
            autoRunSkipFailures: Boolean(message.payload?.autoRunSkipFailures),
            mode: message.payload?.mode,
            executionMode,
            importedAccounts,
            startStep,
            endStep,
            authorizationEmail: executionMode === 'authorize_codex'
              ? String(importedAccounts[0] || '').trim()
              : '',
          });
        }

        case 'START_SCHEDULED_AUTO_RUN_NOW': {
          clearStopRequest();
          if (message.source === 'sidepanel') {
            await lockAutomationWindowFromMessage(message, sender);
          }
          const started = await launchAutoRunTimerPlan('manual', {
            expectedKinds: [AUTO_RUN_TIMER_KIND_SCHEDULED_START],
          });
          if (!started) {
            throw new Error('当前没有可立即开始的倒计时计划。');
          }
          return { ok: true };
        }

        case 'CANCEL_SCHEDULED_AUTO_RUN': {
          const cancelled = await cancelScheduledAutoRun();
          if (!cancelled) {
            throw new Error('当前没有可取消的倒计时计划。');
          }
          return { ok: true };
        }

        case 'SKIP_AUTO_RUN_COUNTDOWN': {
          clearStopRequest();
          if (message.source === 'sidepanel') {
            await lockAutomationWindowFromMessage(message, sender);
          }
          const skipped = await skipAutoRunCountdown();
          if (!skipped) {
            throw new Error('当前没有可立即开始的倒计时。');
          }
          return { ok: true };
        }

        case 'RESUME_AUTO_RUN': {
          clearStopRequest();
          if (message.source === 'sidepanel') {
            await lockAutomationWindowFromMessage(message, sender);
          }
          if (message.payload.email) {
            await setEmailState(message.payload.email);
          }
          resumeAutoRun().catch((error) => {
            handleAutoRunLoopUnhandledError(error).catch(() => {});
          });
          return { ok: true };
        }

        case 'TAKEOVER_AUTO_RUN': {
          await requestStop({ logMessage: '已确认手动接管，正在停止自动流程并切换为手动控制...' });
          await addLog('自动流程已切换为手动控制。', 'warn');
          return { ok: true };
        }

        case 'SKIP_NODE': {
          const nodeId = String(message.nodeId || message.payload?.nodeId || '').trim();
          if (!nodeId) {
            throw new Error('SKIP_NODE 缺少 nodeId。');
          }
          return await skipNode(nodeId);
        }

        case 'SAVE_SETTING': {
          const currentState = await getState();
          const updates = buildPersistentSettingsPayload(message.payload || {});
          const sessionUpdates = {
            ...buildLuckmailSessionSettingsPayload(message.payload || {}),
            ...buildGptmailSessionSettingsPayload(message.payload || {}),
          };
          const modeValidation = validateModeSwitch({
            ...currentState,
            ...updates,
            resolvedSignupMethod: null,
          }, {
            changedKeys: Object.keys(updates),
          });
          if (modeValidation?.normalizedUpdates && Object.keys(modeValidation.normalizedUpdates).length > 0) {
            Object.assign(updates, modeValidation.normalizedUpdates);
          }
          const nextSignupState = {
            ...currentState,
            ...updates,
            resolvedSignupMethod: null,
          };
          if (
            Object.prototype.hasOwnProperty.call(updates, 'signupMethod')
            || Object.prototype.hasOwnProperty.call(updates, 'panelMode')
            || Object.prototype.hasOwnProperty.call(updates, 'activeFlowId')
          ) {
            updates.signupMethod = resolveSignupMethod(nextSignupState);
          }
          const stepModeChanged = false;
          const oauthFlowTimeoutDisabled = Object.prototype.hasOwnProperty.call(updates, 'oauthFlowTimeoutEnabled')
            && updates.oauthFlowTimeoutEnabled === false;
          await setPersistentSettings(updates);
          const stateUpdates = {
            ...updates,
            ...sessionUpdates,
            ...(oauthFlowTimeoutDisabled ? {
              oauthFlowDeadlineAt: null,
              oauthFlowDeadlineSourceUrl: null,
            } : {}),
          };
          // 仅保存在 chrome.storage.local 的敏感字段，不进入 session 或实时广播。
          ['duckApiAuthorization'].forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(stateUpdates, key)) {
              delete stateUpdates[key];
            }
          });
          if (Object.prototype.hasOwnProperty.call(updates, 'icloudHostPreference')) {
            const nextHostPreference = String(updates.icloudHostPreference || '').trim().toLowerCase();
            stateUpdates.preferredIcloudHost = nextHostPreference === 'icloud.com' || nextHostPreference === 'icloud.com.cn'
              ? nextHostPreference
              : '';
          }
          if (stepModeChanged && typeof getStepIdsForState === 'function') {
            const nextStateForSteps = { ...currentState, ...stateUpdates };
            const nextNodeIds = typeof getNodeIdsForState === 'function'
              ? getNodeIdsForState(nextStateForSteps)
              : getStepIdsForState(nextStateForSteps).map((stepId) => getStepKeyForState(stepId, nextStateForSteps)).filter(Boolean);
            stateUpdates.nodeStatuses = Object.fromEntries(nextNodeIds.map((nodeId) => [nodeId, 'pending']));
            stateUpdates.currentNodeId = '';
          }
          await setState(stateUpdates);
          if (Object.keys(stateUpdates).length > 0 && typeof broadcastDataUpdate === 'function') {
            broadcastDataUpdate(stateUpdates);
          }
          return {
            ok: true,
            modeValidation,
            state: await getState(),
          };
        }

        case 'REFRESH_GPC_CARD_BALANCE': {
          if (typeof refreshGpcCardBalance !== 'function') {
            throw new Error('GPC API Key 余额查询能力尚未接入。');
          }
          const state = await getState();
          const result = await refreshGpcCardBalance({
            ...(state || {}),
            ...(message.payload || {}),
          }, {
            reason: message.payload?.reason,
          });
          return { ok: true, ...result };
        }

        case 'EXPORT_SETTINGS': {
          return { ok: true, ...(await exportSettingsBundle()) };
        }

        case 'IMPORT_SETTINGS': {
          const state = await importSettingsBundle(message.payload?.config || null);
          return { ok: true, state };
        }

        case 'UPSERT_HOTMAIL_ACCOUNT': {
          const account = await upsertHotmailAccount(message.payload || {});
          return { ok: true, account };
        }

        case 'DELETE_HOTMAIL_ACCOUNT': {
          await deleteHotmailAccount(String(message.payload?.accountId || ''));
          return { ok: true };
        }

        case 'DELETE_HOTMAIL_ACCOUNTS': {
          const result = await deleteHotmailAccounts(String(message.payload?.mode || 'all'));
          return { ok: true, ...result };
        }

        case 'SELECT_HOTMAIL_ACCOUNT': {
          const account = await setCurrentHotmailAccount(String(message.payload?.accountId || ''), {
            markUsed: false,
            syncEmail: true,
          });
          return { ok: true, account };
        }

        case 'PATCH_HOTMAIL_ACCOUNT': {
          const account = await patchHotmailAccount(
            String(message.payload?.accountId || ''),
            message.payload?.updates || {}
          );
          return { ok: true, account };
        }

        case 'VERIFY_HOTMAIL_ACCOUNT':
        case 'AUTHORIZE_HOTMAIL_ACCOUNT': {
          const accountId = String(message.payload?.accountId || '');
          try {
            const result = await verifyHotmailAccount(accountId);
            await setCurrentHotmailAccount(result.account.id, { markUsed: false, syncEmail: true });
            await addLog(`Hotmail 账号 ${result.account.email} 校验通过，可直接用于收信。`, 'ok');
            return { ok: true, account: result.account, messageCount: result.messageCount };
          } catch (err) {
            const state = await getState();
            const accounts = normalizeHotmailAccounts(state.hotmailAccounts);
            const target = findHotmailAccount(accounts, accountId);
            if (target) {
              target.status = 'error';
              target.lastError = err.message;
              await syncHotmailAccounts(accounts.map((item) => (item.id === target.id ? target : item)));
            }
            throw err;
          }
        }

        case 'TEST_HOTMAIL_ACCOUNT': {
          const result = await testHotmailAccountMailAccess(String(message.payload?.accountId || ''));
          return { ok: true, ...result };
        }

        case 'UPSERT_MAIL2925_ACCOUNT': {
          const account = await upsertMail2925Account(message.payload || {});
          return { ok: true, account };
        }

        case 'DELETE_MAIL2925_ACCOUNT': {
          await deleteMail2925Account(String(message.payload?.accountId || ''));
          return { ok: true };
        }

        case 'DELETE_MAIL2925_ACCOUNTS': {
          const result = await deleteMail2925Accounts(String(message.payload?.mode || 'all'));
          return { ok: true, ...result };
        }

        case 'SELECT_MAIL2925_ACCOUNT': {
          const account = await setCurrentMail2925Account(String(message.payload?.accountId || ''), {
            updateLastUsedAt: false,
          });
          return { ok: true, account };
        }

        case 'PATCH_MAIL2925_ACCOUNT': {
          const account = await patchMail2925Account(
            String(message.payload?.accountId || ''),
            message.payload?.updates || {}
          );
          return { ok: true, account };
        }

        case 'LOGIN_MAIL2925_ACCOUNT': {
          const accountId = String(message.payload?.accountId || '');
          const account = await setCurrentMail2925Account(accountId, {
            updateLastUsedAt: false,
          });
          if (typeof deps.ensureMail2925MailboxSession !== 'function') {
            throw new Error('2925 登录能力尚未接入。');
          }
          await deps.ensureMail2925MailboxSession({
            accountId: account.id,
            forceRelogin: Boolean(message.payload?.forceRelogin),
            actionLabel: '侧边栏手动登录 2925 账号',
          });
          return { ok: true, account };
        }

        case 'LIST_LUCKMAIL_PURCHASES': {
          const purchases = await listLuckmailPurchasesForManagement();
          return { ok: true, purchases };
        }

        case 'SELECT_LUCKMAIL_PURCHASE': {
          const purchase = await selectLuckmailPurchase(message.payload?.purchaseId);
          return { ok: true, purchase };
        }

        case 'SET_LUCKMAIL_PURCHASE_USED_STATE': {
          const result = await setLuckmailPurchaseUsedState(message.payload?.purchaseId, Boolean(message.payload?.used));
          return { ok: true, ...result };
        }

        case 'SET_LUCKMAIL_PURCHASE_PRESERVED_STATE': {
          const purchase = await setLuckmailPurchasePreservedState(message.payload?.purchaseId, Boolean(message.payload?.preserved));
          return { ok: true, purchase };
        }

        case 'SET_LUCKMAIL_PURCHASE_DISABLED_STATE': {
          const purchase = await setLuckmailPurchaseDisabledState(message.payload?.purchaseId, Boolean(message.payload?.disabled));
          return { ok: true, purchase };
        }

        case 'BATCH_UPDATE_LUCKMAIL_PURCHASES': {
          const result = await batchUpdateLuckmailPurchases(message.payload || {});
          return { ok: true, ...result };
        }

        case 'DISABLE_USED_LUCKMAIL_PURCHASES': {
          const result = await disableUsedLuckmailPurchases();
          return { ok: true, ...result };
        }

        case 'SET_EMAIL_STATE': {
          const state = await getState();
          if (isAutoRunLockedState(state)) {
            throw new Error('自动流程运行中，当前不能手动修改邮箱。');
          }
          const email = String(message.payload?.email || '').trim() || null;
          await setEmailStateSilently(email, { source: 'manual' });
          return { ok: true, email };
        }

        case 'SAVE_EMAIL': {
          const state = await getState();
          if (isAutoRunLockedState(state)) {
            throw new Error('自动流程运行中，当前不能手动修改邮箱。');
          }
          await setEmailState(message.payload.email, { source: 'manual' });
          await resumeAutoRun();
          return { ok: true, email: message.payload.email };
        }

        case 'FETCH_GENERATED_EMAIL': {
          clearStopRequest();
          const state = await getState();
          if (isAutoRunLockedState(state)) {
            throw new Error('自动流程运行中，当前不能手动获取邮箱。');
          }
          const email = await fetchGeneratedEmail(state, message.payload || {});
          await resumeAutoRun();
          return { ok: true, email };
        }

        case 'FETCH_DUCK_EMAIL': {
          clearStopRequest();
          const state = await getState();
          if (isAutoRunLockedState(state)) {
            throw new Error('自动流程运行中，当前不能手动获取邮箱。');
          }
          const email = await fetchGeneratedEmail(state, { ...(message.payload || {}), generator: 'duck' });
          await resumeAutoRun();
          return { ok: true, email };
        }

        case 'CHECK_ICLOUD_SESSION': {
          clearStopRequest();
          return await checkIcloudSession();
        }

        case 'LIST_ICLOUD_ALIASES': {
          clearStopRequest();
          const aliases = await listIcloudAliases();
          return { ok: true, aliases };
        }

        case 'SET_ICLOUD_ALIAS_USED_STATE': {
          clearStopRequest();
          const result = await setIcloudAliasUsedState(message.payload || {});
          return { ok: true, ...result };
        }

        case 'SET_ICLOUD_ALIAS_PRESERVED_STATE': {
          clearStopRequest();
          const result = await setIcloudAliasPreservedState(message.payload || {});
          return { ok: true, ...result };
        }

        case 'DELETE_ICLOUD_ALIAS': {
          clearStopRequest();
          const result = await deleteIcloudAlias(message.payload || {});
          return { ok: true, ...result };
        }

        case 'DELETE_USED_ICLOUD_ALIASES': {
          clearStopRequest();
          const result = await deleteUsedIcloudAliases();
          return { ok: true, ...result };
        }

        case 'STOP_FLOW': {
          await requestStop();
          return { ok: true };
        }

        default:
          console.warn('Unknown message type:', message.type);
          return { error: `Unknown message type: ${message.type}` };
      }
    }

    return {
      handleMessage,
      handleStepData,
    };
  }

  return {
    createMessageRouter,
  };
});
